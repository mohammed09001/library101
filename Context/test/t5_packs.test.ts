/**
 * CHILD LOOP 2 verification (Execution 02) — Task 5: Define ContextPack
 * schema and immutable build record. Proves: a build persists an immutable
 * row (inspected directly via SQLite, not just the API), replay-safe
 * idempotency, deterministic budget-ceiling exclusion, fail-soft provider
 * degradation, deterministic packHash, invalidate-without-content-mutation,
 * conflict on double-invalidate, and preview never touching the store.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { ConflictError, NotFoundError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import type { BuildPackInput } from "../src/engine/packs.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t5-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.1.0",
    project: { projectKey: "library101" },
    taskText: "list files",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 100 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function stubProvider(
  id: string,
  opts: { estimatedTokens?: number; throws?: boolean } = {},
): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "9.9.9",
    },
    discover: async () => [],
    retrieve: async (_request, refs) => {
      if (opts.throws) throw new Error(`${id} retrieve failed`);
      return refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: opts.estimatedTokens ?? 10,
        content: `content for ${r.ref}`,
        retrievedAt: new Date().toISOString(),
      }));
    },
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

function baseBuildInput(overrides: Partial<BuildPackInput> = {}): BuildPackInput {
  return {
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "manual-v1",
    creationReason: "test build",
    createdBy: { kind: "human", name: "kim" },
    ...overrides,
  };
}

test("T5: build persists an immutable row, inspected directly via SQLite", async () => {
  const storePath = tempStorePath("persist");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack(baseBuildInput());
  assert.equal(pack.items.length, 1);
  assert.equal(pack.providerVersions["p"], "9.9.9");

  const db = new DatabaseSync(storePath);
  const row = db.prepare("SELECT * FROM context_packs WHERE pack_id = ?").get(pack.packId) as Record<string, unknown>;
  assert.equal(row["pack_hash"], pack.packHash);
  assert.equal(row["status"], "active");
  const events = db.prepare("SELECT type FROM engine_events").all() as Array<{ type: string }>;
  assert.ok(events.some((e) => e.type === "context.pack.built"));
  db.close();
});

test("T5: rebuilding with the same idempotencyKey replays the identical pack, no duplicate row", async () => {
  const storePath = tempStorePath("idempotent");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const input = baseBuildInput({ idempotencyKey: "replay-1" });
  const first = await engine.buildPack(input);
  const second = await engine.buildPack(input);
  assert.equal(first.packId, second.packId);

  const db = new DatabaseSync(storePath);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM context_packs").get() as { n: number }).n;
  assert.equal(count, 1);
  db.close();
});

test("T5: budget ceiling excludes overflow items as a strict prefix, deterministically", async () => {
  const storePath = tempStorePath("budget");
  const engine = new ContextEngine({ storePath });
  // 90 (not a round number chosen for style — deliberately leaves only 2
  // tokens of remaining budget after the first item, once Task 19's fixed
  // per-item framing overhead is added: 100 - (90+8) = 2, well under the
  // 20-token floor for deterministic truncation to kick in, so this test
  // still exercises pure exclusion rather than a truncated partial include.
  engine.registerProvider(stubProvider("p", { estimatedTokens: 90 }));
  const pack = await engine.buildPack(
    baseBuildInput({
      request: baseRequest({ budget: { maxTokens: 100 } }),
      items: [
        { providerId: "p", ref: "a.md" },
        { providerId: "p", ref: "b.md" },
        { providerId: "p", ref: "c.md" },
      ],
    }),
  );
  assert.equal(pack.items.length, 1, "only the first item fits under a 100-token budget at 90(+8 framing) tokens each");
  assert.equal(pack.totalEstimatedTokens, 98, "90 + the fixed 8-token per-item framing overhead (Task 19)");
  assert.equal(pack.exclusions.length, 2);
  assert.ok(pack.exclusions.every((e) => e.reason === "budget_exceeded"));
  assert.deepEqual(pack.exclusions.map((e) => e.ref), ["b.md", "c.md"]);
});

test("T5: a provider that throws mid-retrieve degrades only that item", async () => {
  const storePath = tempStorePath("degrade");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("good"));
  engine.registerProvider(stubProvider("bad", { throws: true }));
  const pack = await engine.buildPack(
    baseBuildInput({
      items: [
        { providerId: "bad", ref: "x.md" },
        { providerId: "good", ref: "a.md" },
      ],
    }),
  );
  assert.equal(pack.items.length, 1);
  assert.equal(pack.items[0]!.providerId, "good");
  assert.equal(pack.exclusions.length, 1);
  assert.equal(pack.exclusions[0]!.reason, "provider_unavailable");
  assert.match(pack.exclusions[0]!.message ?? "", /retrieve failed/);
});

test("T5: packHash is stable for identical inputs and changes when an item differs", async () => {
  const storePath1 = tempStorePath("hash1");
  const engine1 = new ContextEngine({ storePath: storePath1 });
  engine1.registerProvider(stubProvider("p"));
  const packA = await engine1.buildPack(baseBuildInput());

  const storePath2 = tempStorePath("hash2");
  const engine2 = new ContextEngine({ storePath: storePath2 });
  engine2.registerProvider(stubProvider("p"));
  const packB = await engine2.buildPack(baseBuildInput());
  assert.equal(packA.packHash, packB.packHash, "identical inputs across separate stores reproduce the same hash");

  const packC = await engine2.buildPack(baseBuildInput({ items: [{ providerId: "p", ref: "different.md" }] }));
  assert.notEqual(packA.packHash, packC.packHash);
});

test("T5: invalidate sets status without mutating content columns; double-invalidate conflicts", async () => {
  const storePath = tempStorePath("invalidate");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack(baseBuildInput());

  const invalidated = engine.invalidatePack(pack.packId, { kind: "human", name: "kim" }, "no longer needed");
  assert.equal(invalidated.status, "invalidated");
  assert.equal(invalidated.invalidatedReason, "no longer needed");
  assert.deepEqual(invalidated.items, pack.items, "content columns are untouched by invalidation");
  assert.equal(invalidated.packHash, pack.packHash);

  assert.throws(
    () => engine.invalidatePack(pack.packId, { kind: "human", name: "kim" }, "again"),
    (err: unknown) => err instanceof ConflictError && err.code === "CONTEXT_CONFLICT",
  );
});

test("T5: negative — invalidating/getting/explaining an unknown packId throws CONTEXT_NOT_FOUND", () => {
  const engine = new ContextEngine({ storePath: tempStorePath("notfound") });
  assert.throws(() => engine.getPack("pak_missing"), (err: unknown) => err instanceof NotFoundError);
  assert.throws(() => engine.explainPack("pak_missing"), (err: unknown) => err instanceof NotFoundError);
  assert.throws(
    () => engine.invalidatePack("pak_missing", { kind: "human", name: "kim" }, "r"),
    (err: unknown) => err instanceof NotFoundError,
  );
});

test("T5: preview never touches the store and reproduces the same packHash a matching build would", async () => {
  const storePath = tempStorePath("preview");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));

  const preview = await engine.previewPack(baseBuildInput());
  const db = new DatabaseSync(storePath);
  const tableCount = (
    db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='context_packs'")
      .get() as { n: number }
  ).n;
  assert.equal(tableCount, 0, "preview must never open/migrate the store at all — no schema created");
  db.close();

  const built = await engine.buildPack(baseBuildInput());
  assert.equal(preview.packHash, built.packHash);
});
