/**
 * Canonical durable store for the Library Context Engine.
 *
 * SQLite (node:sqlite built into Node.js) in WAL mode. Ownership rules:
 * - This store is the ONLY canonical persistent state of the Context Engine
 *   (built `ContextPack` rows, their attachments, and the engine event log).
 * - Provider registration and discovery stay in-process/ephemeral
 *   (src/engine/registry.ts) — providers are not rows in this store.
 * - Raw candidate/source content is never persisted here — only content
 *   HASHES and provider references (Engine Isolation: derived/reproducible
 *   material never silently becomes canonical truth, and Context never
 *   becomes a second copy of another engine's or provider's payload).
 *
 * Failure behavior: open/migration failures surface as typed errors. There
 * is no silent in-memory fallback.
 */
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ContextEngineError,
  MigrationError,
  StoreUnavailableError,
} from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import type { ContextErrorCode, EngineEvent } from "../contracts/types.ts";
import type { ContextPack, PackAttachment, PackSummary } from "../contracts/packs.ts";
import type { ContextDefinition } from "../contracts/definitions.ts";
import type { AutoContextPolicy } from "../contracts/autoContext.ts";
import type { ProjectionHandoff } from "../contracts/projection.ts";
import { newId } from "./ids.ts";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Migration 1: foundation — schema bookkeeping, the engine event log
 * (cross-engine observability surface), context packs (Task 5's immutable
 * build record), and pack attachments (Task 6).
 */
const MIGRATION_001_FOUNDATION: Migration = {
  version: 1,
  name: "foundation_events_packs",
  sql: `
    CREATE TABLE engine_events (
      event_id        TEXT PRIMARY KEY,
      contract_version TEXT NOT NULL,
      type            TEXT NOT NULL,
      payload_json    TEXT NOT NULL,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX idx_engine_events_created ON engine_events(created_at);
    CREATE INDEX idx_engine_events_type ON engine_events(type);

    CREATE TABLE context_packs (
      pack_id                 TEXT PRIMARY KEY,
      contract_version        TEXT NOT NULL,
      request_id              TEXT,
      idempotency_key         TEXT,
      project_key             TEXT NOT NULL,
      items_json              TEXT NOT NULL,
      budget_json              TEXT NOT NULL,
      total_estimated_tokens  INTEGER NOT NULL,
      ranking_version         TEXT NOT NULL,
      provider_versions_json  TEXT NOT NULL,
      exclusions_json         TEXT NOT NULL,
      creation_reason         TEXT NOT NULL,
      pack_hash               TEXT NOT NULL,
      created_at              TEXT NOT NULL,
      created_by_json         TEXT NOT NULL,
      status                  TEXT NOT NULL,
      invalidated_at          TEXT,
      invalidated_reason      TEXT,
      invalidated_by_json     TEXT
    );
    CREATE UNIQUE INDEX idx_packs_idempotency ON context_packs(idempotency_key);
    CREATE INDEX idx_packs_project ON context_packs(project_key);
    CREATE INDEX idx_packs_status ON context_packs(status);

    CREATE TABLE pack_attachments (
      attachment_id TEXT PRIMARY KEY,
      pack_id       TEXT NOT NULL REFERENCES context_packs(pack_id),
      target_json   TEXT NOT NULL,
      note          TEXT,
      attached_at   TEXT NOT NULL
    );
    CREATE INDEX idx_attachments_pack ON pack_attachments(pack_id);
  `,
};

/**
 * Migration 2 (Execution 09, Tasks 23/24): pack lifecycle mode/expiry/
 * promotion columns, and the `context_definitions` table (Task 24's
 * persisted pack-building recipe, bound to whichever pack most recently
 * regenerated from it).
 */
const MIGRATION_002_ATTACH_SYNC: Migration = {
  version: 2,
  name: "attach_sync_definitions",
  sql: `
    ALTER TABLE context_packs ADD COLUMN mode TEXT NOT NULL DEFAULT 'sync';
    ALTER TABLE context_packs ADD COLUMN expires_at TEXT;
    ALTER TABLE context_packs ADD COLUMN promoted_at TEXT;
    ALTER TABLE context_packs ADD COLUMN promoted_by_json TEXT;
    CREATE INDEX idx_packs_sweep ON context_packs(status, mode, expires_at);

    CREATE TABLE context_definitions (
      definition_id        TEXT PRIMARY KEY,
      contract_version      TEXT NOT NULL,
      project_key           TEXT NOT NULL,
      name                  TEXT,
      request_json          TEXT NOT NULL,
      items_json            TEXT NOT NULL,
      ranking_version       TEXT NOT NULL,
      creation_reason       TEXT NOT NULL,
      bound_projection_ref  TEXT,
      current_pack_id       TEXT REFERENCES context_packs(pack_id),
      created_at            TEXT NOT NULL,
      created_by_json       TEXT NOT NULL,
      last_synced_at        TEXT,
      last_sync_outcome     TEXT
    );
    CREATE INDEX idx_definitions_project ON context_definitions(project_key);
  `,
};

/**
 * Migration 3 (Execution 10, Task 25): a single mutable per-project policy
 * row gating automatic pack attachment (`AutoContextPolicy`) — the real,
 * server-checked gate behind "unless explicit user policy allows automatic
 * attachment."
 */
const MIGRATION_003_AUTO_CONTEXT: Migration = {
  version: 3,
  name: "auto_context_policy",
  sql: `
    CREATE TABLE auto_context_policies (
      project_key                TEXT PRIMARY KEY,
      contract_version            TEXT NOT NULL,
      allow_automatic_attachment  INTEGER NOT NULL,
      updated_at                  TEXT NOT NULL,
      updated_by_json             TEXT NOT NULL
    );
  `,
};

/**
 * Migration 4 (Execution 11, Tasks 26/27/28): a hash+mode index for
 * cache-by-hash lookups (Task 26), a reverse-index table `pack_items` —
 * a derived, rebuildable per-item projection of `context_packs.items_json`
 * (Engine Isolation Invariant: never becomes canonical truth) — for
 * precise, targeted invalidation (Task 27), and an index on
 * `context_definitions.current_pack_id` for replay's pack→definition
 * reverse lookup (Task 28).
 */
const MIGRATION_004_CACHE_INVALIDATION_REPLAY: Migration = {
  version: 4,
  name: "cache_invalidation_replay",
  sql: `
    CREATE INDEX idx_packs_hash ON context_packs(pack_hash, mode, status);
    CREATE INDEX idx_definitions_current_pack ON context_definitions(current_pack_id);

    CREATE TABLE pack_items (
      pack_id          TEXT NOT NULL REFERENCES context_packs(pack_id),
      provider_id      TEXT NOT NULL,
      ref              TEXT NOT NULL,
      content_hash     TEXT NOT NULL,
      provider_version TEXT NOT NULL,
      privacy_class    TEXT NOT NULL
    );
    CREATE INDEX idx_pack_items_provider_ref ON pack_items(provider_id, ref);
    CREATE INDEX idx_pack_items_pack ON pack_items(pack_id);
  `,
};

/**
 * Migration 5 (Execution 13, Task 31): per-pack agent provenance — the
 * `hostAgent`/`workerAgent` identities a pack was built for (Task 31's
 * "host capabilities and selected worker are inputs; the same ContextPack
 * schema works across agents"). Nullable JSON columns: null on
 * pre-1.11.0 rows, whose provenance was never recorded (honest absence —
 * never backfilled or fabricated). Provenance only; not part of packHash.
 */
const MIGRATION_005_AGENT_PROVENANCE: Migration = {
  version: 5,
  name: "pack_agent_provenance",
  sql: `
    ALTER TABLE context_packs ADD COLUMN host_agent_json TEXT;
    ALTER TABLE context_packs ADD COLUMN worker_agent_json TEXT;
  `,
};

/**
 * Migration 6 (Execution 13/14, Task 32): projection handoff records —
 * one row per attempt to deliver a pack to the Project_Projection engine
 * through its versioned CLI contract (by reference, never content, never
 * a `.library` file write). A fresh table; no backfill (no handoffs could
 * exist before this Execution). These rows are Context's own observability
 * of its OUTBOUND calls — pack/attachment canonicality is untouched.
 */
const MIGRATION_006_PROJECTION_HANDOFFS: Migration = {
  version: 6,
  name: "projection_handoffs",
  sql: `
    CREATE TABLE projection_handoffs (
      handoff_id       TEXT PRIMARY KEY,
      contract_version TEXT NOT NULL,
      pack_id          TEXT NOT NULL REFERENCES context_packs(pack_id),
      projection_ref   TEXT NOT NULL,
      mode             TEXT NOT NULL,
      status           TEXT NOT NULL,
      detail           TEXT,
      created_at       TEXT NOT NULL
    );
    CREATE INDEX idx_handoffs_pack ON projection_handoffs(pack_id);
    CREATE INDEX idx_handoffs_created ON projection_handoffs(created_at);
  `,
};

export const MIGRATIONS: readonly Migration[] = [
  MIGRATION_001_FOUNDATION,
  MIGRATION_002_ATTACH_SYNC,
  MIGRATION_003_AUTO_CONTEXT,
  MIGRATION_004_CACHE_INVALIDATION_REPLAY,
  MIGRATION_005_AGENT_PROVENANCE,
  MIGRATION_006_PROJECTION_HANDOFFS,
];

function rowToPack(r: Record<string, unknown>): ContextPack {
  return {
    packId: String(r["pack_id"]),
    contractVersion: String(r["contract_version"]),
    ...(r["request_id"] !== null ? { requestId: String(r["request_id"]) } : {}),
    ...(r["idempotency_key"] !== null ? { idempotencyKey: String(r["idempotency_key"]) } : {}),
    projectKey: String(r["project_key"]),
    items: JSON.parse(String(r["items_json"])),
    budget: JSON.parse(String(r["budget_json"])),
    totalEstimatedTokens: Number(r["total_estimated_tokens"]),
    rankingVersion: String(r["ranking_version"]),
    providerVersions: JSON.parse(String(r["provider_versions_json"])),
    exclusions: JSON.parse(String(r["exclusions_json"])),
    creationReason: String(r["creation_reason"]),
    packHash: String(r["pack_hash"]),
    createdAt: String(r["created_at"]),
    createdBy: JSON.parse(String(r["created_by_json"])),
    // Task 31: null (not absent) on pre-1.11.0 rows and on packs whose
    // request declared no worker — mirrors invalidatedBy/promotedBy.
    hostAgent: r["host_agent_json"] === null || r["host_agent_json"] === undefined
      ? null
      : JSON.parse(String(r["host_agent_json"])),
    workerAgent: r["worker_agent_json"] === null || r["worker_agent_json"] === undefined
      ? null
      : JSON.parse(String(r["worker_agent_json"])),
    status: r["status"] as ContextPack["status"],
    invalidatedAt: r["invalidated_at"] === null ? null : String(r["invalidated_at"]),
    invalidatedReason: r["invalidated_reason"] === null ? null : String(r["invalidated_reason"]),
    invalidatedBy: r["invalidated_by_json"] === null ? null : JSON.parse(String(r["invalidated_by_json"])),
    mode: r["mode"] as ContextPack["mode"],
    expiresAt: r["expires_at"] === null ? null : String(r["expires_at"]),
    promotedAt: r["promoted_at"] === null ? null : String(r["promoted_at"]),
    promotedBy: r["promoted_by_json"] === null ? null : JSON.parse(String(r["promoted_by_json"])),
  };
}

function rowToDefinition(r: Record<string, unknown>): ContextDefinition {
  return {
    definitionId: String(r["definition_id"]),
    contractVersion: String(r["contract_version"]),
    projectKey: String(r["project_key"]),
    ...(r["name"] !== null ? { name: String(r["name"]) } : {}),
    request: JSON.parse(String(r["request_json"])),
    items: JSON.parse(String(r["items_json"])),
    rankingVersion: String(r["ranking_version"]),
    creationReason: String(r["creation_reason"]),
    ...(r["bound_projection_ref"] !== null ? { boundProjectionRef: String(r["bound_projection_ref"]) } : {}),
    currentPackId: r["current_pack_id"] === null ? null : String(r["current_pack_id"]),
    createdAt: String(r["created_at"]),
    createdBy: JSON.parse(String(r["created_by_json"])),
    lastSyncedAt: r["last_synced_at"] === null ? null : String(r["last_synced_at"]),
    lastSyncOutcome: r["last_sync_outcome"] === null ? null : (String(r["last_sync_outcome"]) as ContextDefinition["lastSyncOutcome"]),
  };
}

function rowToAutoContextPolicy(r: Record<string, unknown>): AutoContextPolicy {
  return {
    projectKey: String(r["project_key"]),
    contractVersion: String(r["contract_version"]),
    allowAutomaticAttachment: Number(r["allow_automatic_attachment"]) !== 0,
    updatedAt: String(r["updated_at"]),
    updatedBy: JSON.parse(String(r["updated_by_json"])),
  };
}

export class ContextStore {
  readonly storePath: string;
  /** True when this open created the store file for the first time. */
  readonly created: boolean;

  private db: DatabaseSync | null = null;
  private appliedVersions: number[] = [];

  constructor(storePath: string) {
    this.storePath = resolve(storePath);
    this.created = !existsSync(this.storePath);
  }

  /** Open (creating/migrating as needed). Idempotent across restarts. */
  open(): this {
    if (this.db !== null) return this;
    let opened: DatabaseSync | null = null;
    try {
      mkdirSync(dirname(this.storePath), { recursive: true });
      const db = new DatabaseSync(this.storePath);
      opened = db;
      db.exec("PRAGMA journal_mode = WAL;");
      db.exec("PRAGMA foreign_keys = ON;");
      db.exec("PRAGMA busy_timeout = 5000;");
      this.migrate(db);
      this.db = db;
      return this;
    } catch (err) {
      try {
        opened?.close();
      } catch {
        // Closing a failed open may itself fail; nothing more to do.
      }
      this.db = null;
      if (err instanceof ContextEngineError) throw err;
      throw new StoreUnavailableError(
        `Failed to open context store at ${this.storePath}: ${describe(err)}`,
        { cause: err },
      );
    }
  }

  private migrate(db: DatabaseSync): void {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version    INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);
      const applied = new Set(
        db
          .prepare("SELECT version FROM schema_migrations")
          .all()
          .map((r) => Number((r as Record<string, unknown>)["version"])),
      );
      for (const migration of MIGRATIONS) {
        if (applied.has(migration.version)) continue;
        db.exec("BEGIN IMMEDIATE;");
        try {
          db.exec(migration.sql);
          db.prepare(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
          ).run(migration.version, migration.name, new Date().toISOString());
          db.exec("COMMIT;");
        } catch (txErr) {
          db.exec("ROLLBACK;");
          throw txErr;
        }
      }
      this.appliedVersions = db
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all()
        .map((r) => Number((r as Record<string, unknown>)["version"]));
    } catch (err) {
      if (err instanceof ContextEngineError) throw err;
      throw new MigrationError(`Migration failed for ${this.storePath}: ${describe(err)}`, {
        cause: err,
      });
    }
  }

  appliedMigrationVersions(): number[] {
    this.ensureOpen();
    return [...this.appliedVersions];
  }

  ensureOpen(): DatabaseSync {
    if (this.db === null) {
      this.open();
    }
    return this.db!;
  }

  close(): void {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  /** Health check for observability/degraded-state reporting. Never throws. */
  doctor(): {
    healthy: boolean;
    integrity: string | null;
    journalMode: string | null;
    errorCode?: ContextErrorCode;
    errorMessage?: string;
  } {
    try {
      const db = this.ensureOpen();
      const integrity = String(
        (db.prepare("PRAGMA integrity_check").get() as Record<string, unknown>)["integrity_check"],
      );
      const journalMode = String(
        (db.prepare("PRAGMA journal_mode").get() as Record<string, unknown>)["journal_mode"],
      );
      const healthy = integrity === "ok";
      return {
        healthy,
        integrity,
        journalMode,
        ...(healthy
          ? {}
          : { errorCode: "CONTEXT_STORE_UNAVAILABLE" as const, errorMessage: `integrity_check=${integrity}` }),
      };
    } catch (err) {
      const code = err instanceof ContextEngineError ? err.code : "CONTEXT_STORE_UNAVAILABLE";
      return { healthy: false, integrity: null, journalMode: null, errorCode: code, errorMessage: describe(err) };
    }
  }

  appendEvent(type: string, payload: unknown): EngineEvent {
    const db = this.ensureOpen();
    const event: EngineEvent = {
      eventId: newId("evt"),
      contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO engine_events (event_id, contract_version, type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(event.eventId, event.contractVersion, event.type, JSON.stringify(event.payload), event.createdAt);
    return event;
  }

  listEvents(limit: number): EngineEvent[] {
    const db = this.ensureOpen();
    const rows = db
      .prepare(
        `SELECT event_id, contract_version, type, payload_json, created_at
         FROM engine_events ORDER BY created_at DESC, event_id DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      eventId: String(r["event_id"]),
      contractVersion: String(r["contract_version"]),
      type: String(r["type"]),
      payload: JSON.parse(String(r["payload_json"])),
      createdAt: String(r["created_at"]),
    }));
  }

  countEvents(): number {
    const db = this.ensureOpen();
    const row = db.prepare("SELECT COUNT(*) AS n FROM engine_events").get() as Record<string, unknown>;
    return Number(row["n"]);
  }

  /** Insert an immutable pack row. Never called twice for the same packId. */
  insertPack(pack: ContextPack): void {
    const db = this.ensureOpen();
    db.prepare(
      `INSERT INTO context_packs (
        pack_id, contract_version, request_id, idempotency_key, project_key,
        items_json, budget_json, total_estimated_tokens, ranking_version,
        provider_versions_json, exclusions_json, creation_reason, pack_hash,
        created_at, created_by_json, status, invalidated_at, invalidated_reason, invalidated_by_json,
        mode, expires_at, promoted_at, promoted_by_json,
        host_agent_json, worker_agent_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      pack.packId,
      pack.contractVersion,
      pack.requestId ?? null,
      pack.idempotencyKey ?? null,
      pack.projectKey,
      JSON.stringify(pack.items),
      JSON.stringify(pack.budget),
      pack.totalEstimatedTokens,
      pack.rankingVersion,
      JSON.stringify(pack.providerVersions),
      JSON.stringify(pack.exclusions),
      pack.creationReason,
      pack.packHash,
      pack.createdAt,
      JSON.stringify(pack.createdBy),
      pack.status,
      pack.invalidatedAt,
      pack.invalidatedReason,
      pack.invalidatedBy === null ? null : JSON.stringify(pack.invalidatedBy),
      pack.mode,
      pack.expiresAt,
      pack.promotedAt,
      pack.promotedBy === null ? null : JSON.stringify(pack.promotedBy),
      pack.hostAgent === null ? null : JSON.stringify(pack.hostAgent),
      pack.workerAgent === null ? null : JSON.stringify(pack.workerAgent),
    );
    this.insertPackItems(pack);
  }

  /**
   * Task 27: populate the `pack_items` reverse index — one row per
   * `ContextPackItem`, derived from (never a substitute for) `items_json`.
   * Called only from `insertPack`, so this is INSERT-only, matching pack
   * immutability: a pack's items never change after insert, so neither
   * does its index projection. `provider_version` comes from the pack's
   * own `providerVersions` map (per-provider, not per-item) — falls back
   * to `"unversioned"` only if somehow absent (matches `computePack()`'s
   * own fallback for a provider that omitted a declared version).
   */
  private insertPackItems(pack: ContextPack): void {
    if (pack.items.length === 0) return;
    const db = this.ensureOpen();
    const stmt = db.prepare(
      `INSERT INTO pack_items (pack_id, provider_id, ref, content_hash, provider_version, privacy_class)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const item of pack.items) {
      stmt.run(
        pack.packId,
        item.providerId,
        item.ref,
        item.contentHash,
        pack.providerVersions[item.providerId] ?? "unversioned",
        item.privacyClass,
      );
    }
  }

  getPack(packId: string): ContextPack | undefined {
    const db = this.ensureOpen();
    const row = db.prepare("SELECT * FROM context_packs WHERE pack_id = ?").get(packId) as
      | Record<string, unknown>
      | undefined;
    return row === undefined ? undefined : rowToPack(row);
  }

  getPackByIdempotencyKey(idempotencyKey: string): ContextPack | undefined {
    const db = this.ensureOpen();
    const row = db
      .prepare("SELECT * FROM context_packs WHERE idempotency_key = ?")
      .get(idempotencyKey) as Record<string, unknown> | undefined;
    return row === undefined ? undefined : rowToPack(row);
  }

  /**
   * Task 26: the cache-hit lookup. `mode` filters when given (a hash can
   * legitimately collide across `"attach"`/`"sync"` builds of identical
   * content — `mode` is deliberately excluded from `packHash`); omitted,
   * ties break deterministically on the earliest `createdAt`. Only
   * `"active"` packs are eligible — an invalidated/expired pack is not a
   * valid cache hit.
   */
  getActivePackByHash(packHash: string, mode?: "attach" | "sync"): ContextPack | undefined {
    const db = this.ensureOpen();
    const clauses = ["pack_hash = ?", "status = 'active'"];
    const params: string[] = [packHash];
    if (mode !== undefined) {
      clauses.push("mode = ?");
      params.push(mode);
    }
    const row = db
      .prepare(`SELECT * FROM context_packs WHERE ${clauses.join(" AND ")} ORDER BY created_at ASC LIMIT 1`)
      .get(...params) as Record<string, unknown> | undefined;
    return row === undefined ? undefined : rowToPack(row);
  }

  /**
   * Mutate ONLY the status columns of an existing pack. Content columns
   * (items/budget/hash/...) are never part of this statement — this is the
   * immutability guarantee for the build record.
   */
  invalidatePackRow(packId: string, invalidatedAt: string, reason: string, by: unknown): void {
    const db = this.ensureOpen();
    db.prepare(
      `UPDATE context_packs
       SET status = 'invalidated', invalidated_at = ?, invalidated_reason = ?, invalidated_by_json = ?
       WHERE pack_id = ?`,
    ).run(invalidatedAt, reason, JSON.stringify(by), packId);
  }

  /**
   * Task 23: mutate ONLY `promoted_at`/`promoted_by_json` — the same
   * status-columns-only discipline as `invalidatePackRow`. Promotion never
   * changes `mode` or `status`; it only exempts the pack from future
   * expiry sweeps.
   */
  promotePackRow(packId: string, promotedAt: string, by: unknown): void {
    const db = this.ensureOpen();
    db.prepare(
      `UPDATE context_packs SET promoted_at = ?, promoted_by_json = ? WHERE pack_id = ?`,
    ).run(promotedAt, JSON.stringify(by), packId);
  }

  /**
   * Task 23: transition every active, unpromoted, past-TTL attach-mode
   * pack to `expired` — a status-columns-only UPDATE (immutability
   * guarantee preserved). Returns the swept pack ids.
   */
  sweepExpiredPacks(at: string): string[] {
    const db = this.ensureOpen();
    const rows = db
      .prepare(
        `UPDATE context_packs SET status = 'expired'
         WHERE status = 'active' AND mode = 'attach' AND expires_at IS NOT NULL
           AND expires_at <= ? AND promoted_at IS NULL
         RETURNING pack_id`,
      )
      .all(at) as Array<Record<string, unknown>>;
    return rows.map((r) => String(r["pack_id"]));
  }

  /**
   * Task 27: precise invalidation — a single bulk `UPDATE ... RETURNING`
   * (mirrors `sweepExpiredPacks`'s own idiom), never a per-row loop
   * calling `invalidatePackRow` individually: a loop would race across
   * overlapping triggers (TOCTOU) and would need to swallow conflicts for
   * already-non-active rows mid-batch, where a single bulk statement
   * naturally excludes them (same "zero rows = zero mutation" discipline
   * `sweepExpiredPacks` already uses). Matches via the `pack_items`
   * reverse index: `ref` omitted means provider-wide (every ref from that
   * provider); given, means that single source only. At least one of
   * `currentContentHash`/`currentProviderVersion` must be supplied by the
   * caller (validated in `src/engine/invalidation.ts`, not here).
   */
  invalidateAffectedPacksRows(input: {
    providerId: string;
    ref?: string;
    currentContentHash?: string;
    currentProviderVersion?: string;
    invalidatedAt: string;
    reason: string;
    by: unknown;
  }): string[] {
    const db = this.ensureOpen();
    const matchClauses = ["provider_id = ?"];
    const matchParams: string[] = [input.providerId];
    if (input.ref !== undefined) {
      matchClauses.push("ref = ?");
      matchParams.push(input.ref);
    }
    const driftClauses: string[] = [];
    if (input.currentContentHash !== undefined) {
      driftClauses.push("content_hash != ?");
      matchParams.push(input.currentContentHash);
    }
    if (input.currentProviderVersion !== undefined) {
      driftClauses.push("provider_version != ?");
      matchParams.push(input.currentProviderVersion);
    }
    if (driftClauses.length === 0) {
      // Precondition enforced by the caller (src/engine/invalidation.ts) —
      // guard here too so a caller bug fails loudly, not as invalid SQL "()".
      throw new Error("invalidateAffectedPacksRows requires at least one of currentContentHash/currentProviderVersion");
    }
    matchClauses.push(`(${driftClauses.join(" OR ")})`);
    const rows = db
      .prepare(
        `UPDATE context_packs SET status = 'invalidated', invalidated_at = ?, invalidated_reason = ?, invalidated_by_json = ?
         WHERE status = 'active' AND pack_id IN (
           SELECT DISTINCT pack_id FROM pack_items WHERE ${matchClauses.join(" AND ")}
         )
         RETURNING pack_id`,
      )
      .all(input.invalidatedAt, input.reason, JSON.stringify(input.by), ...matchParams) as Array<Record<string, unknown>>;
    return rows.map((r) => String(r["pack_id"]));
  }

  /** Insert a definition row. Never called twice for the same definitionId. */
  insertDefinition(definition: ContextDefinition): void {
    const db = this.ensureOpen();
    db.prepare(
      `INSERT INTO context_definitions (
        definition_id, contract_version, project_key, name, request_json, items_json,
        ranking_version, creation_reason, bound_projection_ref, current_pack_id,
        created_at, created_by_json, last_synced_at, last_sync_outcome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      definition.definitionId,
      definition.contractVersion,
      definition.projectKey,
      definition.name ?? null,
      JSON.stringify(definition.request),
      JSON.stringify(definition.items),
      definition.rankingVersion,
      definition.creationReason,
      definition.boundProjectionRef ?? null,
      definition.currentPackId,
      definition.createdAt,
      JSON.stringify(definition.createdBy),
      definition.lastSyncedAt,
      definition.lastSyncOutcome,
    );
  }

  getDefinition(definitionId: string): ContextDefinition | undefined {
    const db = this.ensureOpen();
    const row = db
      .prepare("SELECT * FROM context_definitions WHERE definition_id = ?")
      .get(definitionId) as Record<string, unknown> | undefined;
    return row === undefined ? undefined : rowToDefinition(row);
  }

  /**
   * Task 28: the pack→definition reverse lookup replay needs. Only finds
   * a definition whose `currentPackId` is EXACTLY this pack — a definition
   * that has since synced past it (superseded by a newer pack) has moved
   * its one live pointer on, and there is no history of earlier packs it
   * produced (docs/PACKS.md, docs/BOUNDARY.md known limitation).
   */
  getDefinitionByCurrentPackId(packId: string): ContextDefinition | undefined {
    const db = this.ensureOpen();
    const row = db
      .prepare("SELECT * FROM context_definitions WHERE current_pack_id = ?")
      .get(packId) as Record<string, unknown> | undefined;
    return row === undefined ? undefined : rowToDefinition(row);
  }

  /**
   * Task 24: the only mutator for a definition — advances exactly the
   * three sync-outcome columns. The recipe fields (request/items/ranking
   * version/creation reason) are never touched after insert.
   */
  updateDefinitionAfterSync(
    definitionId: string,
    currentPackId: string,
    lastSyncedAt: string,
    outcome: "created" | "unchanged",
  ): void {
    const db = this.ensureOpen();
    db.prepare(
      `UPDATE context_definitions
       SET current_pack_id = ?, last_synced_at = ?, last_sync_outcome = ?
       WHERE definition_id = ?`,
    ).run(currentPackId, lastSyncedAt, outcome, definitionId);
  }

  getAutoContextPolicyRow(projectKey: string): AutoContextPolicy | undefined {
    const db = this.ensureOpen();
    const row = db
      .prepare("SELECT * FROM auto_context_policies WHERE project_key = ?")
      .get(projectKey) as Record<string, unknown> | undefined;
    return row === undefined ? undefined : rowToAutoContextPolicy(row);
  }

  /**
   * Task 25: single mutable row per project — not append-only/versioned
   * (same posture as Memory's `intakePolicy`). Always overwrites the
   * whole row; there is no partial-column mutator because every field
   * changes together on every policy update.
   */
  upsertAutoContextPolicyRow(policy: AutoContextPolicy): void {
    const db = this.ensureOpen();
    db.prepare(
      `INSERT OR REPLACE INTO auto_context_policies (
        project_key, contract_version, allow_automatic_attachment, updated_at, updated_by_json
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      policy.projectKey,
      policy.contractVersion,
      policy.allowAutomaticAttachment ? 1 : 0,
      policy.updatedAt,
      JSON.stringify(policy.updatedBy),
    );
  }

  insertAttachment(attachment: PackAttachment): void {
    const db = this.ensureOpen();
    db.prepare(
      `INSERT INTO pack_attachments (attachment_id, pack_id, target_json, note, attached_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      attachment.attachmentId,
      attachment.packId,
      JSON.stringify(attachment.target),
      attachment.note ?? null,
      attachment.attachedAt,
    );
  }

  listAttachments(packId: string): PackAttachment[] {
    const db = this.ensureOpen();
    const rows = db
      .prepare("SELECT * FROM pack_attachments WHERE pack_id = ? ORDER BY attached_at ASC")
      .all(packId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      attachmentId: String(r["attachment_id"]),
      packId: String(r["pack_id"]),
      target: JSON.parse(String(r["target_json"])),
      ...(r["note"] !== null ? { note: String(r["note"]) } : {}),
      attachedAt: String(r["attached_at"]),
    }));
  }

  /**
   * Task 29: remove ONE attachment row, keyed by BOTH ids — a well-formed
   * attachmentId pointing at a different pack is the same honest
   * CONTEXT_NOT_FOUND as a fully unknown one (no cross-pack information
   * leaks through the error). Returns whether a row was actually deleted;
   * the caller (src/engine/packs.ts `detachPack`) turns `false` into the
   * typed error and emits the audit event only on a real deletion.
   */
  deleteAttachment(packId: string, attachmentId: string): boolean {
    const db = this.ensureOpen();
    const result = db
      .prepare("DELETE FROM pack_attachments WHERE attachment_id = ? AND pack_id = ?")
      .run(attachmentId, packId);
    return Number(result.changes) > 0;
  }

  /**
   * Task 29: bounded, newest-first pack listing for `context.list` —
   * selects ONLY summary columns (items/exclusions JSON payloads are never
   * materialized here; `itemCount` comes from a cheap json() array-length
   * read, not a parse of every item). Filters are caller-validated
   * upstream (src/engine/dispatcher.ts); this is a read-only projection,
   * never a second canonical store.
   */
  listPacks(filter: { projectKey?: string; status?: string; mode?: string; limit: number }): PackSummary[] {
    const db = this.ensureOpen();
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.projectKey !== undefined) {
      clauses.push("project_key = ?");
      params.push(filter.projectKey);
    }
    if (filter.status !== undefined) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    if (filter.mode !== undefined) {
      clauses.push("mode = ?");
      params.push(filter.mode);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(String(filter.limit));
    const rows = db
      .prepare(
        `SELECT pack_id, contract_version, project_key, status, mode,
                json_array_length(items_json) AS item_count,
                total_estimated_tokens, ranking_version, creation_reason,
                pack_hash, created_at
         FROM context_packs ${where}
         ORDER BY created_at DESC, pack_id DESC
         LIMIT ?`,
      )
      .all(...params) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      packId: String(r["pack_id"]),
      contractVersion: String(r["contract_version"]),
      projectKey: String(r["project_key"]),
      status: r["status"] as ContextPack["status"],
      mode: r["mode"] as ContextPack["mode"],
      itemCount: Number(r["item_count"]),
      totalEstimatedTokens: Number(r["total_estimated_tokens"]),
      rankingVersion: String(r["ranking_version"]),
      creationReason: String(r["creation_reason"]),
      packHash: String(r["pack_hash"]),
      createdAt: String(r["created_at"]),
    }));
  }

  /** Task 32: persist one projection handoff attempt (insert-only — an attempt's outcome is never rewritten; a retry is a NEW row). */
  insertProjectionHandoff(handoff: ProjectionHandoff): void {
    const db = this.ensureOpen();
    db.prepare(
      `INSERT INTO projection_handoffs (
        handoff_id, contract_version, pack_id, projection_ref, mode, status, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      handoff.handoffId,
      handoff.contractVersion,
      handoff.packId,
      handoff.projectionRef,
      handoff.mode,
      handoff.status,
      handoff.detail ?? null,
      handoff.createdAt,
    );
  }

  /** Task 32: bounded, newest-first handoff listing, optionally scoped to one pack. */
  listProjectionHandoffs(packId: string | undefined, limit: number): ProjectionHandoff[] {
    const db = this.ensureOpen();
    const rows = (
      packId !== undefined
        ? db
            .prepare(
              `SELECT * FROM projection_handoffs WHERE pack_id = ?
               ORDER BY created_at DESC, handoff_id DESC LIMIT ?`,
            )
            .all(packId, String(limit))
        : db
            .prepare(
              `SELECT * FROM projection_handoffs
               ORDER BY created_at DESC, handoff_id DESC LIMIT ?`,
            )
            .all(String(limit))
    ) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      handoffId: String(r["handoff_id"]),
      contractVersion: String(r["contract_version"]),
      packId: String(r["pack_id"]),
      projectionRef: String(r["projection_ref"]),
      mode: r["mode"] as ProjectionHandoff["mode"],
      status: r["status"] as ProjectionHandoff["status"],
      ...(r["detail"] !== null ? { detail: String(r["detail"]) } : {}),
      createdAt: String(r["created_at"]),
    }));
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
