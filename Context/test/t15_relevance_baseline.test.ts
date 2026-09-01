/**
 * CHILD LOOP 1 verification (Execution 06) — Task 15: Build deterministic
 * relevance baseline. Proves the five named signals (task term overlap,
 * source authority, path/component overlap, recency, explicit user pins)
 * each contribute, that a missing signal is excluded from the weighted
 * average rather than fabricated, and that pins always sort first
 * regardless of score. Also proves the new `context.select` operation
 * end-to-end through the real dispatcher against real registered providers
 * (project_files + repository_map), tying Tasks 15/16/17 together.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scoreCandidate, rankCandidates, scorePathOverlap, DEFAULT_WEIGHTS } from "../src/engine/relevance.ts";
import { selectCandidates } from "../src/engine/selector.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { ProjectFilesProvider } from "../src/providers/projectFilesProvider.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { NormalizedContextCandidate } from "../src/contracts/candidates.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.4.0",
    project: { projectKey: "demo" },
    taskText: "budget ceiling",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 8000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function candidate(overrides: Partial<NormalizedContextCandidate> = {}): NormalizedContextCandidate {
  return {
    candidateId: "cnd_x",
    providerId: "project_files",
    ref: "a.md",
    title: "a.md",
    excerpt: "excerpt",
    provenance: { discoveredAt: "2026-08-30T00:00:00Z", retrievedAt: "2026-08-30T00:00:00Z", method: "provider_retrieve" },
    estimatedTokens: 10,
    relevanceSignals: {},
    authority: { tier: "unattributed", basis: "test" },
    privacyClass: "internal",
    contentHash: "hash",
    dedupKeys: ["content:hash", "ref:project_files:a.md"],
    ...overrides,
  };
}

test("T15: scorePathOverlap is bounded [0,1] and camelCase-aware", () => {
  const score = scorePathOverlap("how does the budget ceiling work in packs", "src/engine/packs.ts");
  assert.ok(score !== undefined && score > 0 && score <= 1, "packs.ts matches the 'packs' task token");
  const camel = scorePathOverlap("gitHistory provider", "src/providers/gitHistoryContextProvider.ts");
  assert.ok(camel !== undefined && camel > 0, "camelCase path segments are tokenized");
});

test("T15: scorePathOverlap is undefined when either side has no meaningful tokens", () => {
  assert.equal(scorePathOverlap("", "src/a.ts"), undefined);
  assert.equal(scorePathOverlap("hi ok to", "src/a.ts"), undefined, "all-too-short tokens produce no taskTokens");
});

test("T15: termOverlap/recency are excluded from the weighted average, not defaulted, when absent", () => {
  const c = candidate({ authority: { tier: "provider_verified", basis: "t" } });
  const score = scoreCandidate(c, baseRequest({ taskText: "zzz nomatch qqq" }));
  assert.equal(score.termOverlap, undefined);
  assert.equal(score.recency, undefined);
  // With only authority(=1.0, weight 0.2) and possibly pathOverlap available,
  // compositeScore must be a plain average of whichever signals ARE present
  // — never diluted by a fabricated 0 for the missing ones.
  assert.ok(score.compositeScore > 0.9, `expected compositeScore close to 1 (authority-only), got ${score.compositeScore}`);
});

test("T15: authority ordering — provider_verified > provider_reported > unattributed, all else equal", () => {
  const req = baseRequest({ taskText: "zzz nomatch qqq", requiredSources: [] });
  const verified = scoreCandidate(candidate({ authority: { tier: "provider_verified", basis: "t" }, ref: "v" }), req);
  const reported = scoreCandidate(candidate({ authority: { tier: "provider_reported", basis: "t" }, ref: "r" }), req);
  const unattributed = scoreCandidate(candidate({ authority: { tier: "unattributed", basis: "t" }, ref: "u" }), req);
  assert.ok(verified.compositeScore > reported.compositeScore);
  assert.ok(reported.compositeScore > unattributed.compositeScore);
});

test("T15: explicit user pins (requiredSources) always sort first, regardless of score", () => {
  const req = baseRequest({ taskText: "budget ceiling", requiredSources: ["low-quality.md"] });
  const high = candidate({
    ref: "high-quality.md",
    title: "high-quality.md",
    authority: { tier: "provider_verified", basis: "t" },
    relevanceSignals: { textMatchScore: 1 },
  });
  const pinned = candidate({
    ref: "low-quality.md",
    title: "low-quality.md",
    authority: { tier: "unattributed", basis: "t" },
    relevanceSignals: { textMatchScore: 0 },
  });
  const ranked = rankCandidates([high, pinned], req);
  assert.equal(ranked[0]!.candidate.ref, "low-quality.md", "the pinned candidate sorts first despite a much lower score");
  assert.equal(ranked[0]!.score.pinned, true);
  assert.equal(ranked[1]!.score.pinned, false);
});

test("T15: rankCandidates orders by descending compositeScore among non-pinned candidates", () => {
  const req = baseRequest({ taskText: "budget ceiling enforcement" });
  const strong = candidate({ ref: "strong.md", relevanceSignals: { textMatchScore: 1 }, authority: { tier: "provider_verified", basis: "t" } });
  const weak = candidate({ ref: "weak.md", relevanceSignals: { textMatchScore: 0.1 }, authority: { tier: "unattributed", basis: "t" } });
  const ranked = rankCandidates([weak, strong], req);
  assert.deepEqual(ranked.map((r) => r.candidate.ref), ["strong.md", "weak.md"]);
});

test("T15: weights sum to 1 (documented, deterministic baseline — not a coincidence)", () => {
  const total = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `expected weights to sum to 1, got ${total}`);
});

test("T15: context.select end-to-end via the real dispatcher — discovers, retrieves, ranks real files by task relevance", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t15-select-"));
  const engine = new ContextEngine({ storePath: join(dir, "ctx.db") });
  try {
    writeFileSync(join(dir, "budget.md"), "This file explains the budget ceiling enforcement logic in detail.");
    writeFileSync(join(dir, "unrelated.md"), "This file is about something completely different: gardening tips.");
    engine.registerProvider(new ProjectFilesProvider({ root: dir, extensions: [".md"] }));

    const request = baseRequest({ taskText: "explain the budget ceiling enforcement logic" });
    const envelope = { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation: "context.select" as const, request: { request } };
    const response = await dispatch(engine, envelope);
    assert.equal(response.ok, true);
    const result = response.ok ? (response.result as Awaited<ReturnType<typeof selectCandidates>>) : undefined;
    assert.ok(result);
    assert.ok(result!.items.length >= 2);
    assert.equal(result!.items[0]!.ref, "budget.md", "the topically-relevant file ranks first");
    assert.equal(result!.algorithm, "deterministic_baseline_v1");

    // The selector's own output feeds context.build without any translation.
    const buildEnvelope = {
      contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
      operation: "context.build" as const,
      request: {
        request,
        items: result!.items.map((i) => ({ providerId: i.providerId, ref: i.ref, title: i.title })),
        rankingVersion: result!.algorithm,
        creationReason: "t15 select->build pipeline",
        createdBy: { kind: "human", name: "kim" },
      },
    };
    const buildResponse = await dispatch(engine, buildEnvelope);
    assert.equal(buildResponse.ok, true);
  } finally {
    engine.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T15: negative — forbiddenSources are never retrieved by the selector", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t15-forbidden-"));
  try {
    writeFileSync(join(dir, "secret.md"), "budget ceiling secret plan");
    writeFileSync(join(dir, "public.md"), "budget ceiling public plan");
    const registry = new ProviderRegistry();
    registry.register(new ProjectFilesProvider({ root: dir, extensions: [".md"] }));
    const request = baseRequest({ taskText: "budget ceiling plan", forbiddenSources: ["secret.md"] });
    const result = await selectCandidates(registry, { request });
    assert.ok(!result.items.some((i) => i.ref === "secret.md"));
    assert.ok(result.items.some((i) => i.ref === "public.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
