/**
 * CHILD LOOP verification (Execution 11) — Task 28: Given preserved source
 * revisions and versions, reconstruct or explain why a historical
 * ContextPack cannot be reproduced. Proves: a bare `context.build` pack
 * (no `ContextDefinition` currently points at it) reports the actionable
 * non-replayable reason rather than fabricating a request; a
 * definition-bound pack with unchanged source replays `reproducible: true`;
 * changed source content reports an `itemDiffs` entry with
 * `"contentChanged"`, and an item whose position shifted purely because an
 * unrelated item was newly excluded is reported `"reordered"` — distinct
 * from `"contentChanged"`; and a provider-wide version bump with
 * byte-identical content reports `providerVersionsChanged: true` even
 * though every item diff is `"unchanged"`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t28-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.9.0",
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

/** A provider whose per-ref content and declared version are both mutable closures. */
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

const createdBy = { kind: "human" as const, name: "kim" };

test("T28: a bare context.build pack with no definition reports the actionable non-replayable reason", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("no-definition") });
  engine.registerProvider(mutableProvider("p1", new Map([["a", "content-a"]]), { value: "1.0.0" }));

  const pack = await engine.buildPack({ request: baseRequest(), items: [{ providerId: "p1", ref: "a" }], rankingVersion: "v1", creationReason: "t28", createdBy });

  const result = await engine.replayPack(pack.packId);
  assert.equal(result.reproducible, false);
  assert.match(result.reason ?? "", /no ContextDefinition currently points at this pack/);
  assert.equal(result.pack.packId, pack.packId);
  assert.equal(result.replayedPack, undefined);
  assert.equal(result.itemDiffs, undefined);
});

test("T28: a definition-bound pack with unchanged source replays reproducible: true", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("unchanged") });
  engine.registerProvider(mutableProvider("p1", new Map([["a", "content-a"]]), { value: "1.0.0" }));

  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p1", ref: "a" }],
    rankingVersion: "v1",
    creationReason: "t28",
    createdBy,
  });
  const { pack } = await engine.syncDefinition(definition.definitionId);

  const result = await engine.replayPack(pack.packId);
  assert.equal(result.reproducible, true);
  assert.equal(result.reason, undefined);
  assert.equal(result.replayedPack?.packHash, pack.packHash);
});

test("T28: changed source content reports contentChanged, and a pure position shift reports reordered (distinct from contentChanged)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("content-and-reorder") });
  const content = new Map([
    ["a", "alpha"],
    ["b", "beta"],
    ["c", "gamma"],
  ]);
  engine.registerProvider(mutableProvider("p1", content, { value: "1.0.0" }));

  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [
      { providerId: "p1", ref: "a" },
      { providerId: "p1", ref: "b" },
      { providerId: "p1", ref: "c" },
    ],
    rankingVersion: "v1",
    creationReason: "t28",
    createdBy,
  });
  const { pack } = await engine.syncDefinition(definition.definitionId);
  assert.equal(pack.items.length, 3, "sanity: all three items included, no dedup yet");
  assert.deepEqual(
    pack.items.map((i) => [i.ref, i.order]),
    [["a", 0], ["b", 1], ["c", 2]],
  );

  // 'a's content now becomes byte-identical to 'b's original content: 'a'
  // (earlier in the item list) survives dedup as a genuine content change;
  // 'b' becomes a newly-excluded duplicate; 'c' shifts from order 2 to
  // order 1 with its OWN content untouched — a pure reorder.
  content.set("a", "beta");

  const result = await engine.replayPack(pack.packId);
  assert.equal(result.reproducible, false);
  const byRef = new Map((result.itemDiffs ?? []).map((d) => [d.ref, d.kind]));
  assert.equal(byRef.get("a"), "contentChanged");
  assert.equal(byRef.get("b"), "nowExcluded");
  assert.equal(byRef.get("c"), "reordered", "c's content is unchanged; only its order shifted");
});

test("T28: a provider-wide version bump with byte-identical content reports providerVersionsChanged with all-unchanged item diffs", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("version-bump") });
  const version = { value: "1.0.0" };
  engine.registerProvider(mutableProvider("p1", new Map([["a", "content-a"]]), version));

  const definition = engine.createDefinition({
    request: baseRequest(),
    items: [{ providerId: "p1", ref: "a" }],
    rankingVersion: "v1",
    creationReason: "t28",
    createdBy,
  });
  const { pack } = await engine.syncDefinition(definition.definitionId);

  version.value = "2.0.0";

  const result = await engine.replayPack(pack.packId);
  assert.equal(result.reproducible, false);
  assert.equal(result.providerVersionsChanged, true);
  assert.equal(result.rankingVersionChanged, false);
  assert.equal(result.budgetChanged, false);
  for (const diff of result.itemDiffs ?? []) {
    assert.equal(diff.kind, "unchanged");
  }
});
