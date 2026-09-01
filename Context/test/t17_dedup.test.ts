/**
 * CHILD LOOP 3 verification (Execution 06) — Task 17: Build cross-provider
 * deduplication. Proves `pickCanonical`/`deduplicateCandidates` (the pure
 * batch form used by the selector) and, separately, that `buildPack` itself
 * now detects duplicate content across two DIFFERENT providers and excludes
 * the loser BEFORE it consumes any budget (the literal "avoid wasting
 * budget on repeated text" clause) — inspected via the actual persisted
 * pack, not just the in-memory return value.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { pickCanonical, deduplicateCandidates } from "../src/engine/dedup.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import type { NormalizedContextCandidate } from "../src/contracts/candidates.ts";
import type { BuildPackInput } from "../src/engine/packs.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t17-${name}-`));
  return join(dir, "context.db");
}

function candidate(overrides: Partial<NormalizedContextCandidate> = {}): NormalizedContextCandidate {
  return {
    candidateId: "cnd_x",
    providerId: "project_files",
    ref: "a.md",
    title: "a.md",
    excerpt: "same text",
    provenance: { discoveredAt: "2026-08-30T00:00:00Z", retrievedAt: "2026-08-30T00:00:00Z", method: "provider_retrieve" },
    estimatedTokens: 10,
    relevanceSignals: {},
    authority: { tier: "unattributed", basis: "test" },
    privacyClass: "internal",
    contentHash: "same-hash",
    dedupKeys: ["content:same-hash", "ref:project_files:a.md"],
    ...overrides,
  };
}

test("T17: pickCanonical prefers higher authority tier, first-seen on tie", () => {
  const verified = candidate({ candidateId: "v", authority: { tier: "provider_verified", basis: "t" } });
  const reported = candidate({ candidateId: "r", authority: { tier: "provider_reported", basis: "t" } });
  const unattributed = candidate({ candidateId: "u", authority: { tier: "unattributed", basis: "t" } });
  assert.equal(pickCanonical(reported, verified).candidateId, "v");
  assert.equal(pickCanonical(verified, reported).candidateId, "v");
  assert.equal(pickCanonical(unattributed, reported).candidateId, "r");
  const tieA = candidate({ candidateId: "a", authority: { tier: "provider_verified", basis: "t" } });
  const tieB = candidate({ candidateId: "b", authority: { tier: "provider_verified", basis: "t" } });
  assert.equal(pickCanonical(tieA, tieB).candidateId, "a", "first argument wins a same-tier tie");
});

test("T17: deduplicateCandidates collapses same-content candidates across different providers", () => {
  const memoryCandidate = candidate({
    candidateId: "cnd_memory",
    providerId: "memory",
    ref: "mem_1",
    dedupKeys: ["content:shared-hash", "ref:memory:mem_1"],
    authority: { tier: "provider_verified", basis: "t" },
  });
  const fileCandidate = candidate({
    candidateId: "cnd_file",
    providerId: "project_files",
    ref: "notes.md",
    dedupKeys: ["content:shared-hash", "ref:project_files:notes.md"],
    authority: { tier: "provider_reported", basis: "t" },
  });
  const distinctCandidate = candidate({
    candidateId: "cnd_other",
    providerId: "project_files",
    ref: "other.md",
    dedupKeys: ["content:different-hash", "ref:project_files:other.md"],
  });

  const { kept, excluded } = deduplicateCandidates([fileCandidate, memoryCandidate, distinctCandidate]);
  assert.equal(kept.length, 2, "the two same-content candidates collapse to one");
  assert.deepEqual(kept.map((c) => c.candidateId).sort(), ["cnd_memory", "cnd_other"]);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0]!.candidate.candidateId, "cnd_file", "the lower-authority (provider_reported) duplicate is excluded");
  assert.equal(excluded[0]!.keptCandidateId, "cnd_memory", "in favor of the higher-authority (provider_verified) one");
});

test("T17: negative — no duplicates means no exclusions, order preserved", () => {
  const a = candidate({ candidateId: "a", dedupKeys: ["content:h1", "ref:p:a"] });
  const b = candidate({ candidateId: "b", dedupKeys: ["content:h2", "ref:p:b"] });
  const { kept, excluded } = deduplicateCandidates([a, b]);
  assert.deepEqual(kept.map((c) => c.candidateId), ["a", "b"]);
  assert.equal(excluded.length, 0);
});

function stubProviderWithContent(
  id: string,
  freshnessKind: "live" | "periodic",
  refToContent: Record<string, string>,
): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" },
      freshness: { kind: freshnessKind },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    },
    discover: async () => [],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 50,
        content: refToContent[r.ref] ?? "missing",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.4.0",
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 120 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

test("T17: buildPack excludes cross-provider duplicate content BEFORE it consumes budget, preferring canonical provenance", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dedup") });
  // "memory" declares live freshness -> provider_verified (higher authority).
  // "project_files_stub" declares periodic freshness -> provider_reported.
  engine.registerProvider(stubProviderWithContent("memory", "live", { mem_1: "The exact same duplicated text." }));
  engine.registerProvider(
    stubProviderWithContent("project_files_stub", "periodic", { "dup.md": "The exact same duplicated text." }),
  );
  engine.registerProvider(stubProviderWithContent("memory2", "live", { mem_2: "Completely different unique text." }));

  const input: BuildPackInput = {
    request: baseRequest({ budget: { maxTokens: 200 } }),
    // The lower-authority duplicate is listed FIRST to prove canonical
    // provenance really is compared, not just "first wins."
    items: [
      { providerId: "project_files_stub", ref: "dup.md" },
      { providerId: "memory", ref: "mem_1" },
      { providerId: "memory2", ref: "mem_2" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t17 dedup check",
    createdBy: { kind: "human", name: "kim" },
  };

  const pack = await engine.buildPack(input);
  assert.equal(pack.items.length, 2, "duplicate collapses to one, plus the distinct item");
  const keptProviders = pack.items.map((i) => i.providerId).sort();
  assert.deepEqual(keptProviders, ["memory", "memory2"], "the higher-authority (live/provider_verified) duplicate survives");

  const dupExclusion = pack.exclusions.find((e) => e.reason === "duplicate_content");
  assert.ok(dupExclusion, "a duplicate_content exclusion is recorded");
  assert.equal(dupExclusion!.providerId, "project_files_stub");
  assert.equal(dupExclusion!.ref, "dup.md");
  assert.match(dupExclusion!.message ?? "", /memory:mem_1/);

  // The literal "avoid wasting budget on repeated text": the duplicate's 50
  // tokens are never charged — only the two surviving items' tokens are
  // (plus Task 19's fixed 8-token per-item framing overhead: (50+8)*2).
  assert.equal(pack.totalEstimatedTokens, 116);
});

test("T17: negative — a real budget_exceeded exclusion still works correctly alongside dedup (no duplicates present)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("budget-with-dedup") });
  engine.registerProvider(stubProviderWithContent("memory", "live", { a: "text A", b: "text B", c: "text C" }));
  const pack = await engine.buildPack({
    // 66, not 90: leaves only 8 tokens remaining after the first (50+8)
    // item, under Task 19's 20-token minimum-useful-truncation floor, so
    // this still exercises pure exclusion rather than a truncated partial
    // include.
    request: baseRequest({ budget: { maxTokens: 66 } }),
    items: [
      { providerId: "memory", ref: "a" },
      { providerId: "memory", ref: "b" },
      { providerId: "memory", ref: "c" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t17 budget still works",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1, "only the first item fits under a 66-token budget at 50(+8 framing) tokens each");
  assert.equal(pack.exclusions.length, 2);
  assert.ok(pack.exclusions.every((e) => e.reason === "budget_exceeded"));
});
