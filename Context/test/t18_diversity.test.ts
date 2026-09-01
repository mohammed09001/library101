/**
 * CHILD LOOP 1 verification (Execution 07) — Task 18: Build diversity and
 * coverage policy. Proves the pure `applyDiversityPolicy()` round-robin
 * (order preserved within a provider, groups interleaved across providers)
 * and, at the integration level, that `buildPack` no longer lets one
 * provider's items monopolize a budget-limited pack when another provider's
 * items are also present and would otherwise be starved entirely.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyDiversityPolicy } from "../src/engine/diversity.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import type { NormalizedContextCandidate } from "../src/contracts/candidates.ts";

function candidate(providerId: string, ref: string): NormalizedContextCandidate {
  return {
    candidateId: `cnd_${providerId}_${ref}`,
    providerId,
    ref,
    title: ref,
    excerpt: `content for ${providerId}:${ref}`,
    provenance: { discoveredAt: "2026-08-30T00:00:00Z", retrievedAt: "2026-08-30T00:00:00Z", method: "provider_retrieve" },
    estimatedTokens: 10,
    relevanceSignals: {},
    authority: { tier: "unattributed", basis: "test" },
    privacyClass: "internal",
    contentHash: `hash_${providerId}_${ref}`,
    dedupKeys: [`content:hash_${providerId}_${ref}`, `ref:${providerId}:${ref}`],
  };
}

test("T18: applyDiversityPolicy round-robins across providers, preserving each provider's internal order", () => {
  const input = [
    candidate("a", "a1"),
    candidate("a", "a2"),
    candidate("a", "a3"),
    candidate("b", "b1"),
    candidate("c", "c1"),
    candidate("c", "c2"),
  ];
  const out = applyDiversityPolicy(input);
  assert.deepEqual(
    out.map((c) => `${c.providerId}:${c.ref}`),
    ["a:a1", "b:b1", "c:c1", "a:a2", "c:c2", "a:a3"],
    "round 0 takes one from each provider group in first-seen order, then round 1, etc.",
  );
});

test("T18: negative — a single provider's candidates are unaffected (no other category to interleave with)", () => {
  const input = [candidate("a", "a1"), candidate("a", "a2"), candidate("a", "a3")];
  const out = applyDiversityPolicy(input);
  assert.deepEqual(out.map((c) => c.ref), ["a1", "a2", "a3"]);
});

test("T18: negative — an empty list is handled without error", () => {
  assert.deepEqual(applyDiversityPolicy([]), []);
});

function stubProviderWithNItems(id: string, n: number, estimatedTokens: number): ContextProvider {
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
        estimatedTokens,
        content: `${id}:${r.ref} unique content ${Math.random()}`,
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.5.0",
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 100 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t18-${name}-`));
  return join(dir, "context.db");
}

test("T18: buildPack no longer lets one provider consume the entire budget when a second provider's items are also present", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("coverage") });
  // "dominant" alone would need 5*18=90 tokens (< 100) if processed first in
  // full — plenty of room to starve "other" entirely under the OLD strict
  // caller-order budgeting. With diversity interleaving, "other" gets a
  // turn early instead of only after all 5 of "dominant"'s items.
  engine.registerProvider(stubProviderWithNItems("dominant", 5, 18));
  engine.registerProvider(stubProviderWithNItems("other", 1, 18));

  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 60 } }), // room for ~2 items at 18+8=26 each
    items: [
      { providerId: "dominant", ref: "d1" },
      { providerId: "dominant", ref: "d2" },
      { providerId: "dominant", ref: "d3" },
      { providerId: "dominant", ref: "d4" },
      { providerId: "dominant", ref: "d5" },
      { providerId: "other", ref: "o1" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t18 coverage check",
    createdBy: { kind: "human", name: "kim" },
  });

  const includedProviders = new Set(pack.items.map((i) => i.providerId));
  assert.ok(
    includedProviders.has("other"),
    "the second provider is represented in the pack, not starved by the first provider's item count alone",
  );
});

test("T18: negative — pinned items are excluded from diversity reordering (Task 20 priority wins)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pin-interaction") });
  engine.registerProvider(stubProviderWithNItems("a", 2, 10));
  engine.registerProvider(stubProviderWithNItems("b", 2, 10));

  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 1000 }, requiredSources: ["a2"] }),
    items: [
      { providerId: "a", ref: "a1" },
      { providerId: "b", ref: "b1" },
      { providerId: "a", ref: "a2" },
      { providerId: "b", ref: "b2" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t18 pin interaction",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items[0]!.ref, "a2", "the pinned item is first, ahead of any diversity-interleaved item");
});
