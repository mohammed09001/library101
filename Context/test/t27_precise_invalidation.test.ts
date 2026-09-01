/**
 * CHILD LOOP verification (Execution 11) — Task 27: Invalidate only packs
 * affected by changed source/version/provider, not the entire cache.
 * Proves: a single-source content change (`ref` + `currentContentHash`)
 * invalidates only the pack(s) referencing that exact `(providerId, ref)`,
 * leaving an unrelated ref or an unrelated provider untouched; a
 * provider-wide version bump (`currentProviderVersion`, no `ref`)
 * invalidates every active pack referencing that provider regardless of
 * ref, leaving an unrelated provider untouched; an already-invalidated
 * pack is silently skipped (matched only via `status = 'active'`, not a
 * double-invalidation error); and the two required-field validations
 * (at least one of currentContentHash/currentProviderVersion; currentContentHash
 * requires ref) are enforced.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { ValidationError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t27-${name}-`));
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

/** A provider whose per-ref content and declared version are both mutable closures, letting a test simulate a source revision change or a provider version bump between builds. */
function mutableProvider(id: string, contentByRef: Map<string, string>, version: { value: string }): ContextProvider {
  const declaration = {
    id,
    displayName: id,
    description: "stub",
    capabilities: ["file_content"],
    cost: { relativeCost: "low" as const },
    freshness: { kind: "live" as const },
    privacy: { maxPrivacyClass: "internal" as const },
  };
  return {
    get declaration() {
      return { ...declaration, version: version.value };
    },
    discover: async () => [],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: contentByRef.get(r.ref) ?? `default-${r.ref}`,
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T27: single-source content change invalidates only the pack(s) referencing that exact (providerId, ref)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("single-source") });
  const content = new Map([["x", "content-x-v1"], ["y", "content-y-v1"]]);
  const version = { value: "1.0.0" };
  engine.registerProvider(mutableProvider("p1", content, version));
  engine.registerProvider(mutableProvider("p2", new Map([["x", "p2-content"]]), { value: "1.0.0" }));

  const createdBy = { kind: "human" as const, name: "kim" };
  const packX = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "x" }], rankingVersion: "v1", creationReason: "t27", createdBy });
  const packY = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "y" }], rankingVersion: "v1", creationReason: "t27", createdBy });
  const packOtherProvider = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p2", ref: "x" }], rankingVersion: "v1", creationReason: "t27", createdBy });

  content.set("x", "content-x-v2");
  const probe = await engine.previewPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "x" }], rankingVersion: "v1", creationReason: "t27-probe", createdBy });
  const newContentHash = probe.items[0]!.contentHash;
  assert.notEqual(newContentHash, packX.items[0]!.contentHash, "sanity: the probe content really did change");

  const result = engine.invalidateAffectedPacks({ providerId: "p1", ref: "x", currentContentHash: newContentHash, actor: createdBy });
  assert.equal(result.count, 1);
  assert.deepEqual(result.packIds, [packX.packId]);

  assert.equal(engine.getPack(packX.packId).status, "invalidated");
  assert.equal(engine.getPack(packY.packId).status, "active", "a different ref on the same provider must be untouched");
  assert.equal(engine.getPack(packOtherProvider.packId).status, "active", "a different provider must be untouched");
});

test("T27: provider-wide version bump invalidates every active pack referencing that provider, regardless of ref", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("provider-wide") });
  const content = new Map([["x", "content-x"], ["y", "content-y"]]);
  const version = { value: "1.0.0" };
  engine.registerProvider(mutableProvider("p1", content, version));
  engine.registerProvider(mutableProvider("p2", new Map([["x", "p2-content"]]), { value: "1.0.0" }));

  const createdBy = { kind: "human" as const, name: "kim" };
  const packX = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "x" }], rankingVersion: "v1", creationReason: "t27", createdBy });
  const packY = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "y" }], rankingVersion: "v1", creationReason: "t27", createdBy });
  const packOtherProvider = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p2", ref: "x" }], rankingVersion: "v1", creationReason: "t27", createdBy });

  version.value = "2.0.0";
  const result = engine.invalidateAffectedPacks({ providerId: "p1", currentProviderVersion: "2.0.0", actor: createdBy });
  assert.equal(result.count, 2);
  assert.deepEqual(new Set(result.packIds), new Set([packX.packId, packY.packId]));

  assert.equal(engine.getPack(packX.packId).status, "invalidated");
  assert.equal(engine.getPack(packY.packId).status, "invalidated");
  assert.equal(engine.getPack(packOtherProvider.packId).status, "active", "an unrelated provider must be untouched");
});

test("T27: an already-invalidated pack is silently skipped, not a double-invalidation error", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("already-invalidated") });
  const content = new Map([["x", "content-x-v1"]]);
  const version = { value: "1.0.0" };
  engine.registerProvider(mutableProvider("p1", content, version));

  const createdBy = { kind: "human" as const, name: "kim" };
  const packX = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "x" }], rankingVersion: "v1", creationReason: "t27", createdBy });
  engine.invalidatePack(packX.packId, createdBy, "manually invalidated before the batch trigger");

  content.set("x", "content-x-v2");
  const probe = await engine.previewPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "x" }], rankingVersion: "v1", creationReason: "t27-probe", createdBy });
  const newContentHash = probe.items[0]!.contentHash;

  const result = engine.invalidateAffectedPacks({ providerId: "p1", ref: "x", currentContentHash: newContentHash, actor: createdBy });
  assert.equal(result.count, 0, "an already-invalidated pack must not be re-matched or error");
  assert.deepEqual(result.packIds, []);
});

test("T27: negative — validation errors", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("validation") });
  const createdBy = { kind: "human" as const, name: "kim" };

  assert.throws(
    () => engine.invalidateAffectedPacks({ providerId: "p1", actor: createdBy }),
    (err: unknown) => err instanceof ValidationError,
    "must require at least one of currentContentHash/currentProviderVersion",
  );

  assert.throws(
    () => engine.invalidateAffectedPacks({ providerId: "p1", currentContentHash: "abc", actor: createdBy }),
    (err: unknown) => err instanceof ValidationError,
    "currentContentHash without ref must be rejected",
  );
});
