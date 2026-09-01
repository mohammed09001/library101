/**
 * CHILD LOOP verification (Execution 09) — Task 24: Build Persistent Sync
 * mode. Proves: `context.definition.create` persists a recipe without
 * building; the first sync builds a real pack (`changed: true`,
 * `lastSyncOutcome: "created"`); a second sync with identical source
 * content is `changed: false`/`"unchanged"` and inserts no new pack row;
 * changing the underlying provider's content (so `contentHash`/`packHash`
 * differ) causes the next sync to build a new pack and rebind
 * `currentPackId`; and both synced packs remain independently retrievable/
 * immutable via `context.get`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { NotFoundError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t24-${name}-`));
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

/** A provider whose content is a mutable closure — lets a test change "source revision" between syncs. */
function mutableStubProvider(id: string, contentHolder: { value: string }): ContextProvider {
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
        content: contentHolder.value,
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T24: context.definition.create persists a recipe without building a pack", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("create") });
  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t24 create",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(definition.currentPackId, null);
  assert.equal(definition.lastSyncedAt, null);
  assert.equal(definition.lastSyncOutcome, null);
  assert.equal(definition.projectKey, "demo", "derived from request.project.projectKey");

  const fetched = engine.getDefinition(definition.definitionId);
  assert.deepEqual(fetched, definition);
});

test("T24: first sync builds a real pack; second sync with unchanged content is a no-op", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("sync-unchanged") });
  const content = { value: "original content" };
  engine.registerProvider(mutableStubProvider("p", content));

  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t24 sync",
    createdBy: { kind: "human", name: "kim" },
  });

  const first = await engine.syncDefinition(definition.definitionId);
  assert.equal(first.changed, true);
  assert.equal(first.definition.lastSyncOutcome, "created");
  assert.equal(first.definition.currentPackId, first.pack.packId);

  const second = await engine.syncDefinition(definition.definitionId);
  assert.equal(second.changed, false);
  assert.equal(second.definition.lastSyncOutcome, "unchanged");
  assert.equal(second.pack.packId, first.pack.packId, "no new pack row was inserted");
});

test("T24: changing the underlying source content causes the next sync to build a new pack and rebind currentPackId", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("sync-drift") });
  const content = { value: "version one" };
  engine.registerProvider(mutableStubProvider("p", content));

  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t24 drift",
    createdBy: { kind: "human", name: "kim" },
  });

  const first = await engine.syncDefinition(definition.definitionId);
  assert.equal(first.changed, true);

  content.value = "version two — the source revision changed";
  const second = await engine.syncDefinition(definition.definitionId);
  assert.equal(second.changed, true);
  assert.equal(second.definition.lastSyncOutcome, "created");
  assert.notEqual(second.pack.packId, first.pack.packId, "a genuinely new pack was built");
  assert.notEqual(second.pack.packHash, first.pack.packHash);
  assert.equal(second.definition.currentPackId, second.pack.packId, "rebound to the new pack");

  // Both packs remain independently retrievable and immutable.
  const refetchedFirst = engine.getPack(first.pack.packId);
  assert.equal(refetchedFirst.items[0]!.contentHash, first.pack.items[0]!.contentHash);
  const refetchedSecond = engine.getPack(second.pack.packId);
  assert.equal(refetchedSecond.items[0]!.contentHash, second.pack.items[0]!.contentHash);
  assert.notEqual(refetchedFirst.items[0]!.contentHash, refetchedSecond.items[0]!.contentHash);
});

test("T24: negative — sync/get on an unknown definitionId is NotFoundError", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("negative") });
  assert.throws(() => engine.getDefinition("def_missing"), (err: unknown) => err instanceof NotFoundError);
  await assert.rejects(engine.syncDefinition("def_missing"), (err: unknown) => err instanceof NotFoundError);
});
