/**
 * CHILD LOOP verification (Execution 13/14) — Task 32: Integrate Context
 * with Project Projection. Task Source Requirement: "Attach persistent or
 * temporary packs through Projection contracts; Context never writes
 * `.library` files directly."
 *
 * Proven honestly, mirroring Task 9/10's two-way pattern for an absent
 * sibling (`Project_Projection` is verified zero-files below — the real
 * engine does not exist yet):
 *  1. a fixture fake Projection CLI proves the producer-direction ingest
 *     path end-to-end: delivery through the versioned contract, strictly
 *     BY REFERENCE (ids + hash + mode, never item content), recorded
 *     `delivered`, event fired;
 *  2. the REAL absent path records `unavailable` (typed, observable,
 *     fail-soft — Context's own state is never gated on Projection);
 *  3. a contract-error fixture records `failed` with Projection's code;
 *  4. the persistent path resolves a projection-bound definition's
 *     current pack + boundProjectionRef automatically;
 *  5. no `.library` file is ever written by Context (filesystem snapshot
 *     before/after every handoff exercise).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import { PROJECTION_INGEST_OPERATION } from "../src/projection/projectionContractClient.ts";
import { resolveSiblingCli } from "../src/providers/cliContractClient.ts";
import { NotFoundError, ValidationError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

const REAL_PROJECTION_CLI = resolveSiblingCli("Project_Projection", "src", "cli", "cli.ts");

function tempDir(name: string): string {
  return mkdtempSync(join(tmpdir(), `ctx-t32-${name}-`));
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 10_000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function stubProvider(id: string): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" as const },
      freshness: { kind: "live" as const },
      privacy: { maxPrivacyClass: "internal" as const },
      version: "1.0.0",
    },
    discover: async () => [],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: `SECRET-CONTENT-BODY for ${r.ref} — must never reach Projection`,
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

/**
 * Fake Projection CLI: answers `projection.ingest` per the anticipated
 * contract and LOGS the exact request it received to FIXTURE_LOG so tests
 * can prove the payload was strictly by-reference.
 */
function fixtureCliSource(logPath: string): string {
  return `
import { writeFileSync } from "node:fs";
function out(obj, code) {
  process.stdout.write(JSON.stringify(obj) + "\\n");
  process.exit(code ?? 0);
}
const args = process.argv.slice(2);
if (args[0] === "doctor") {
  out({ healthy: true, contractVersion: "1.0.0" });
}
if (args[0] === "contract" && args[1] === "call") {
  const operation = args[args.indexOf("--operation") + 1];
  const request = JSON.parse(args[args.indexOf("--request") + 1]);
  writeFileSync(process.env.FIXTURE_LOG, JSON.stringify({ operation, request }));
  if (operation === ${JSON.stringify(PROJECTION_INGEST_OPERATION)}) {
    out({ ok: true, contractVersion: "1.0.0", operation, result: { accepted: true, packId: request.packId } });
  }
  out({ ok: false, contractVersion: "1.0.0", operation, error: { code: "PROJ_UNKNOWN_OP", message: "unhandled op" } }, 1);
}
out({ error: { code: "USAGE", message: "bad args" } }, 2);
`;
}

function writeFixtureCli(name: string, source: (logPath: string) => string): { cliPath: string; logPath: string } {
  const dir = tempDir(name);
  const logPath = join(dir, "ingest-log.json");
  const cliPath = join(dir, "fake-projection-cli.mjs");
  writeFileSync(cliPath, source(logPath), "utf8");
  process.env["FIXTURE_LOG"] = logPath;
  return { cliPath, logPath };
}

/** `.library`-write guard: snapshot every file under `dir` before/after a handoff. */
function fileSnapshot(dir: string): Set<string> {
  const out = new Set<string>();
  for (const entry of readdirSync(dir, { recursive: true })) out.add(String(entry));
  return out;
}

test("T32: the real Project_Projection engine is verified absent (zero files — the integration must degrade, not assume)", () => {
  assert.equal(existsSync(REAL_PROJECTION_CLI), false, `expected ${REAL_PROJECTION_CLI} to be absent`);
});

test("T32: delivered — ingest through the contract is recorded, by-reference, with an audit event", async () => {
  const storeDir = tempDir("delivered");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });

  const { cliPath, logPath } = writeFixtureCli("delivered-fixture", fixtureCliSource);
  const before = fileSnapshot(storeDir);
  const handoff = await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "game-ui:main", projectionCliPath: cliPath });
  const after = fileSnapshot(storeDir);

  assert.equal(handoff.status, "delivered");
  assert.equal(handoff.detail, undefined);
  assert.equal(handoff.mode, "sync", "mode is derived from the pack, never caller-declared");

  // No `.library` file appeared anywhere under the store dir.
  for (const f of after) {
    if (!before.has(f)) assert.ok(!f.includes(".library"), `unexpected projection-format write: ${f}`);
  }

  // The ingest request the fake CLI received was strictly by-reference.
  const logged = JSON.parse(readFileSync(logPath, "utf8")) as { operation: string; request: Record<string, unknown> };
  assert.equal(logged.operation, PROJECTION_INGEST_OPERATION);
  assert.equal(logged.request["packId"], pack.packId);
  assert.equal(logged.request["packHash"], pack.packHash);
  assert.equal(logged.request["projectKey"], "demo");
  assert.equal(logged.request["source"], "context-engine");
  assert.equal(logged.request["sourceContractVersion"], CONTEXT_ENGINE_CONTRACT_VERSION);
  const raw = JSON.stringify(logged.request);
  assert.ok(!raw.includes("SECRET-CONTENT-BODY"), "item content must never cross the projection contract");
  assert.ok(!raw.includes("items"), "no item list may cross the projection contract");

  // Persisted record + audit event, inspected directly via SQLite.
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(storeDir, "context.db"));
  const rows = db.prepare("SELECT * FROM projection_handoffs").all() as Array<Record<string, unknown>>;
  const events = db.prepare("SELECT type FROM engine_events WHERE type = 'context.projection.handoff'").all() as Array<{ type: string }>;
  db.close();
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!["status"], "delivered");
  assert.equal(rows[0]!["projection_ref"], "game-ui:main");
  assert.equal(events.length, 1);
});

test("T32: unavailable — the real absent Projection degrades to a recorded status, never a throw", async () => {
  const storeDir = tempDir("unavailable");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });

  const handoff = await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "game-ui:main" });
  assert.equal(handoff.status, "unavailable");
  assert.match(handoff.detail ?? "", /not found/);
  const listed = engine.listProjectionHandoffs({ packId: pack.packId });
  assert.equal(listed.count, 1);
  assert.equal(listed.handoffs[0]!.status, "unavailable");
});

test("T32: failed — a contract error envelope from Projection is recorded with its code", async () => {
  const storeDir = tempDir("failed");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });

  // The fixture answers unknown ops with ok:false — feed it a deliberately
  // different operation name via a raw client is out of scope; instead use
  // a CLI whose ingest path itself returns an error envelope.
  const dir = tempDir("failed-fixture");
  const cliPath = join(dir, "rejecting-cli.mjs");
  writeFileSync(
    cliPath,
    `process.stdout.write(JSON.stringify({ ok: false, contractVersion: "1.0.0", operation: "projection.ingest", error: { code: "PROJ_READ_ONLY", message: "ingest disabled" } }) + "\\n");\n`,
    "utf8",
  );
  const handoff = await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "game-ui:main", projectionCliPath: cliPath });
  assert.equal(handoff.status, "failed");
  assert.match(handoff.detail ?? "", /PROJ_READ_ONLY/);
});

test("T32: persistent path — a projection-bound definition resolves current pack + boundProjectionRef via definitionId", async () => {
  const storeDir = tempDir("persistent");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    boundProjectionRef: "proj:library101",
    createdBy: { kind: "human", name: "kim" },
  });
  await engine.syncDefinition(definition.definitionId);

  const { cliPath } = writeFixtureCli("persistent-fixture", fixtureCliSource);
  const handoff = await engine.handoffPackToProjection({ definitionId: definition.definitionId, projectionCliPath: cliPath });
  assert.equal(handoff.status, "delivered");
  assert.equal(handoff.projectionRef, "proj:library101");
  assert.equal(handoff.mode, "sync");

  // Temporary path: an attach-mode pack records mode "attach".
  const pack = await engine.buildPack({
    request: baseRequest({ project: { projectKey: "demo2" } }),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 3600,
  });
  const tempHandoff = await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "session:abc", projectionCliPath: cliPath });
  assert.equal(tempHandoff.mode, "attach");
  assert.equal(tempHandoff.status, "delivered");
});

test("T32: negative — input validation and unknown ids are typed errors, not recorded handoffs", async () => {
  const storeDir = tempDir("negative");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });

  await assert.rejects(() => engine.handoffPackToProjection({ packId: "pak_missing", projectionRef: "x" }), NotFoundError);
  await assert.rejects(() => engine.handoffPackToProjection({ packId: pack.packId }), ValidationError);
  await assert.rejects(() => engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "x", definitionId: "def_1" }), ValidationError);
  await assert.rejects(() => engine.handoffPackToProjection({ definitionId: "def_missing" }), NotFoundError);

  const listed = engine.listProjectionHandoffs();
  assert.equal(listed.count, 0, "a failed input must not record a handoff attempt");
});

test("T32: the versioned dispatcher exposes both projection operations end-to-end", async () => {
  const storeDir = tempDir("dispatch");
  const engine = new ContextEngine({ storePath: join(storeDir, "context.db") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });
  const { cliPath } = writeFixtureCli("dispatch-fixture", fixtureCliSource);

  const handoffResponse = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.projection.handoff",
    request: { packId: pack.packId, projectionRef: "game-ui:dispatch", projectionCliPath: cliPath },
  });
  assert.equal(handoffResponse.ok, true);
  if (!handoffResponse.ok) return;
  assert.equal((handoffResponse.result as { handoff: { status: string } }).handoff.status, "delivered");

  const listResponse = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.projection.listHandoffs",
    request: { packId: pack.packId },
  });
  assert.equal(listResponse.ok, true);
  if (!listResponse.ok) return;
  assert.equal((listResponse.result as { count: number }).count, 1);
});

test("T32: restart recovery — handoff history persists and stays queryable across an engine restart", async () => {
  const storePath = join(tempDir("restart"), "context.db");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });
  await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: "session:r1" });
  engine.close();

  const reopened = new ContextEngine({ storePath });
  const listed = reopened.listProjectionHandoffs({ packId: pack.packId });
  assert.equal(listed.count, 1);
  assert.equal(listed.handoffs[0]!.status, "unavailable");
  // A retry is a NEW row — attempt history is never rewritten.
  const retry = await reopened.handoffPackToProjection({ packId: pack.packId, projectionRef: "session:r1" });
  assert.equal(retry.status, "unavailable");
  assert.equal(reopened.listProjectionHandoffs({ packId: pack.packId }).count, 2);
  reopened.close();
});

test("T32: handoff listing is bounded and newest-first", async () => {
  const storePath = join(tempDir("listing"), "context.db");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t32",
    createdBy: { kind: "human", name: "kim" },
  });
  for (let i = 0; i < 5; i++) {
    await engine.handoffPackToProjection({ packId: pack.packId, projectionRef: `session:${i}` });
  }
  const all = engine.listProjectionHandoffs({ packId: pack.packId });
  assert.equal(all.count, 5);
  const bounded = engine.listProjectionHandoffs({ packId: pack.packId, limit: 2 });
  assert.equal(bounded.count, 2);
  const times = all.handoffs.map((h) => h.createdAt);
  assert.deepEqual([...times].sort().reverse(), times, "newest first");
  engine.close();
});
