/**
 * CHILD LOOP verification (Execution 09) — Task 23: Build Temporary Attach
 * mode. Proves: an attach-mode pack gets a real `expiresAt`; a sweep before
 * TTL leaves it untouched; a sweep after TTL flips it to `expired` (status-
 * columns-only, content preserved); a sync-mode pack is never swept
 * regardless of `at`; `context.promote` exempts an attach-mode pack from a
 * subsequent sweep past its TTL — the honest, testable half of "unless
 * Projection is explicitly invoked"; and promotion is refused for a
 * sync-mode pack or a non-active/already-promoted one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { ConflictError, ValidationError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t23-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.7.0",
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 1000 },
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
      cost: { relativeCost: "low" },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    },
    discover: async () => [],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: "hello",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T23: mode 'sync' (default) is unaffected — no expiresAt, permanent, matches every pre-Execution-09 pack", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("default") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 default mode",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.mode, "sync");
  assert.equal(pack.expiresAt, null);
  assert.equal(pack.promotedAt, null);
});

test("T23: mode 'attach' gets a real expiresAt from ttlSeconds; ttlSeconds is rejected for mode 'sync'", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("attach-ttl") });
  engine.registerProvider(stubProvider("p"));
  const before = Date.now();
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 attach ttl",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 60,
  });
  assert.equal(pack.mode, "attach");
  assert.ok(pack.expiresAt !== null);
  const expiresMs = Date.parse(pack.expiresAt!);
  assert.ok(expiresMs >= before + 60_000 && expiresMs <= Date.now() + 60_000 + 5000);

  await assert.rejects(
    engine.buildPack({
      request: baseRequest(),
      items: [{ providerId: "p", ref: "a" }],
      rankingVersion: "manual-v1",
      creationReason: "t23 reject ttl on sync",
      createdBy: { kind: "human", name: "kim" },
      mode: "sync",
      ttlSeconds: 60,
    }),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T23: sweep before TTL leaves an attach-mode pack active; sweep after TTL expires it (content preserved)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("sweep") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 sweep",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 60,
  });

  const beforeExpiry = new Date(Date.parse(pack.createdAt) + 30_000).toISOString();
  const earlySweep = engine.sweepExpiredPacks(beforeExpiry);
  assert.equal(earlySweep.count, 0);
  assert.equal(engine.getPack(pack.packId).status, "active");

  const afterExpiry = new Date(Date.parse(pack.expiresAt!) + 1000).toISOString();
  const lateSweep = engine.sweepExpiredPacks(afterExpiry);
  assert.equal(lateSweep.count, 1);
  assert.deepEqual(lateSweep.packIds, [pack.packId]);
  const swept = engine.getPack(pack.packId);
  assert.equal(swept.status, "expired");
  // Content columns are untouched — same immutability guarantee as invalidate.
  assert.deepEqual(swept.items, pack.items);
  assert.equal(swept.packHash, pack.packHash);
});

test("T23: a sync-mode pack is never swept, regardless of `at`", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("sync-never-swept") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 sync never swept",
    createdBy: { kind: "human", name: "kim" },
  });
  const farFuture = "2999-01-01T00:00:00.000Z";
  const sweep = engine.sweepExpiredPacks(farFuture);
  assert.equal(sweep.count, 0);
  assert.equal(engine.getPack(pack.packId).status, "active");
});

test("T23: context.promote exempts an attach-mode pack from a subsequent sweep past its TTL", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("promote") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 promote",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 60,
  });

  const promoted = engine.promotePack(pack.packId, { kind: "human", name: "kim" });
  assert.ok(promoted.promotedAt !== null);
  assert.deepEqual(promoted.promotedBy, { kind: "human", name: "kim" });
  // Promotion never changes mode/status.
  assert.equal(promoted.mode, "attach");
  assert.equal(promoted.status, "active");

  const afterExpiry = new Date(Date.parse(pack.expiresAt!) + 1000).toISOString();
  const sweep = engine.sweepExpiredPacks(afterExpiry);
  assert.equal(sweep.count, 0, "a promoted pack is exempt from expiry");
  assert.equal(engine.getPack(pack.packId).status, "active");
});

test("T23: negative — promoting a sync-mode pack, or a non-active/already-promoted attach pack, is refused", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("promote-negative") });
  engine.registerProvider(stubProvider("p"));
  const syncPack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 sync pack",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.throws(
    () => engine.promotePack(syncPack.packId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof ValidationError,
  );

  const attachPack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 attach pack",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 60,
  });
  engine.promotePack(attachPack.packId, { kind: "human", name: "kim" });
  assert.throws(
    () => engine.promotePack(attachPack.packId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof ConflictError,
    "already-promoted pack is refused",
  );

  const invalidatedAttach = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t23 invalidated attach",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    ttlSeconds: 60,
  });
  engine.invalidatePack(invalidatedAttach.packId, { kind: "human", name: "kim" }, "no longer needed");
  assert.throws(
    () => engine.promotePack(invalidatedAttach.packId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof ConflictError,
    "non-active pack is refused",
  );
});
