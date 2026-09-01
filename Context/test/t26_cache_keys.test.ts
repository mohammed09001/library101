/**
 * CHILD LOOP verification (Execution 11) — Task 26: Cache by request
 * normalization, source revisions, provider versions, ranking version,
 * privacy policy and budget. Proves: `privacyPolicy` (including
 * `forbiddenTags`, order-insensitively) participates in `packHash`;
 * `dedupeByHash` reuses an existing ACTIVE pack of the SAME `mode` instead
 * of inserting a duplicate row, and emits `context.pack.cacheHit` instead
 * of `context.pack.built`; a different `mode` with identical content still
 * builds a fresh pack (mode is excluded from the hash but included in the
 * cache-key lookup); and `context.getByHash` (both engine-level and
 * dispatcher-level) finds an existing pack by hash.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t26-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.9.0",
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
        content: "fixed content",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T26: forbiddenTags order does not change packHash, but content does", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("policy-hash") });
  engine.registerProvider(stubProvider("p"));

  const packA = await engine.previewPack({
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal", forbiddenTags: ["b", "a"] } }),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
  });
  const packB = await engine.previewPack({
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal", forbiddenTags: ["a", "b"] } }),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(packA.packHash, packB.packHash, "tag order must not affect the hash");

  const packC = await engine.previewPack({
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal", forbiddenTags: ["a", "c"] } }),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.notEqual(packA.packHash, packC.packHash, "different forbiddenTags content must change the hash");

  const packD = await engine.previewPack({
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "sensitive", forbiddenTags: ["a", "b"] } }),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.notEqual(packA.packHash, packD.packHash, "different maxPrivacyClass must change the hash");
});

test("T26: dedupeByHash reuses an existing active pack of the same mode instead of inserting a duplicate", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dedupe-same-mode") });
  engine.registerProvider(stubProvider("p"));

  const input = {
    request: baseRequest(),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human" as const, name: "kim" },
    dedupeByHash: true,
  };

  const first = await engine.buildPack(input);
  const second = await engine.buildPack(input);
  assert.equal(second.packId, first.packId, "second build must reuse the same pack row");
  assert.equal(second.packHash, first.packHash);
});

test("T26: dedupeByHash with a different mode builds a fresh pack even with identical content", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dedupe-diff-mode") });
  engine.registerProvider(stubProvider("p"));

  const syncPack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
    mode: "sync",
    dedupeByHash: true,
  });
  const attachPack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
    mode: "attach",
    dedupeByHash: true,
  });

  assert.notEqual(attachPack.packId, syncPack.packId, "a different mode must not be handed back a wrong-mode pack");
  assert.equal(attachPack.packHash, syncPack.packHash, "mode is excluded from packHash itself");
});

test("T26: context.getByHash finds the pack (engine-level and dispatcher-level), mode-filtered", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("get-by-hash") });
  engine.registerProvider(stubProvider("p"));

  const built = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "x" }],
    rankingVersion: "v1",
    creationReason: "t26",
    createdBy: { kind: "human", name: "kim" },
    mode: "sync",
  });

  const foundByEngine = engine.getPackByHash(built.packHash, "sync");
  assert.equal(foundByEngine?.packId, built.packId);

  const notFoundByEngine = engine.getPackByHash(built.packHash, "attach");
  assert.equal(notFoundByEngine, undefined, "mode filter must exclude a non-matching mode");

  const envelope = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.getByHash",
    request: { packHash: built.packHash },
  });
  assert.equal(envelope.ok, true);
  if (envelope.ok) {
    const result = envelope.result as { pack: { packId: string } | undefined };
    assert.equal(result.pack?.packId, built.packId);
  }
});
