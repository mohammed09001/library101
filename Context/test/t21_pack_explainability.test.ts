/**
 * CHILD LOOP verification (Execution 08) — Task 21: Build ContextPack
 * assembler (fresh evidence that the already-existing assembler produces
 * ordered, typed, provenance-marked sections, not a text blob) and Task 22:
 * Build pack explainability (score components threaded through from a
 * caller-supplied `score`, plus a derived `budgetConsumption` summary on
 * `context.explain`).
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
import type { RelevanceScore } from "../src/contracts/candidates.ts";
import type { ContextRequestEnvelope } from "../src/contracts/operations.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t21-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.6.0",
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

function stubProviderWithContent(id: string, refToContent: Record<string, string>, estimatedTokens: number): ContextProvider {
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
        content: refToContent[r.ref] ?? "missing",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

function stubScore(overrides: Partial<RelevanceScore> = {}): RelevanceScore {
  return { authority: 1, pinned: false, compositeScore: 0.75, ...overrides };
}

function envelope(operation: ContextRequestEnvelope["operation"], request: unknown): ContextRequestEnvelope {
  return { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation, request };
}

test("T21: a built pack's items are ordered, typed (providerId), provenance-marked, and source-handled — not a text blob", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("assembler") });
  engine.registerProvider(stubProviderWithContent("project_files", { "a.md": "alpha content" }, 10));
  engine.registerProvider(stubProviderWithContent("git_history", { commit1: "beta content" }, 10));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [
      { providerId: "project_files", ref: "a.md" },
      { providerId: "git_history", ref: "commit1" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t21 assembler shape",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 2);
  // Ordered.
  assert.deepEqual(pack.items.map((i) => i.order), [0, 1]);
  // Typed: distinct providerId per section, not merged into one blob.
  assert.deepEqual(pack.items.map((i) => i.providerId), ["project_files", "git_history"]);
  // Provenance markers + source handles present and distinct per item.
  for (const item of pack.items) {
    assert.ok(item.contentHash.length > 0, "provenance marker: contentHash");
    assert.ok(item.retrievedAt.length > 0, "provenance marker: retrievedAt");
    assert.ok(item.candidateId.length > 0, "source handle: candidateId");
    assert.ok(item.ref.length > 0, "source handle: ref");
  }
  assert.notEqual(pack.items[0]!.contentHash, pack.items[1]!.contentHash, "distinct content is distinctly hashed, not flattened into one blob");
});

test("T22: score threading — a caller-supplied score lands on both an included item and an excluded one", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("score") });
  engine.registerProvider(stubProviderWithContent("p", { a: "short", b: "x".repeat(2000) }, 10));
  const scoreA = stubScore({ compositeScore: 0.9, termOverlap: 0.8 });
  const scoreB = stubScore({ compositeScore: 0.1 });
  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 30 } }),
    items: [
      { providerId: "p", ref: "a", score: scoreA },
      { providerId: "p", ref: "b", score: scoreB },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t22 score threading",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1);
  assert.deepEqual(pack.items[0]!.score, scoreA);
  assert.equal(pack.exclusions.length, 1);
  assert.deepEqual(pack.exclusions[0]!.score, scoreB);
});

test("T22: hand-supplied items without a score remain fully supported — no score key at all, not undefined", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("noscore") });
  engine.registerProvider(stubProviderWithContent("p", { a: "content" }, 10));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t22 no score",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1);
  assert.equal("score" in pack.items[0]!, false, "score key is genuinely absent, not present-as-undefined");
});

test("T22: packHash reproducibility is unaffected by differing score values on otherwise-identical items", async () => {
  const engine1 = new ContextEngine({ storePath: tempStorePath("hash1") });
  engine1.registerProvider(stubProviderWithContent("p", { a: "content" }, 10));
  const pack1 = await engine1.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a", score: stubScore({ compositeScore: 0.9 }) }],
    rankingVersion: "manual-v1",
    creationReason: "t22 hash reproducibility",
    createdBy: { kind: "human", name: "kim" },
  });

  const engine2 = new ContextEngine({ storePath: tempStorePath("hash2") });
  engine2.registerProvider(stubProviderWithContent("p", { a: "content" }, 10));
  const pack2 = await engine2.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a", score: stubScore({ compositeScore: 0.1 }) }],
    rankingVersion: "manual-v1",
    creationReason: "t22 hash reproducibility",
    createdBy: { kind: "human", name: "kim" },
  });

  assert.equal(pack1.packHash, pack2.packHash, "score is excluded from packHash so reproducibility survives a drifting score");
});

test("T22: explainPack budgetConsumption — exact accounting, maxBytes omitted (not zeroed) when unset", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("budget") });
  engine.registerProvider(stubProviderWithContent("p", { a: "hello world" }, 20));
  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 100, reservedFramingTokens: 20 } }),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t22 budget consumption",
    createdBy: { kind: "human", name: "kim" },
  });
  const explained = engine.explainPack(pack.packId);
  assert.equal(explained.budgetConsumption.maxTokens, 100);
  assert.equal(explained.budgetConsumption.reservedFramingTokens, 20);
  assert.equal(explained.budgetConsumption.effectiveMaxTokens, 80);
  assert.equal(explained.budgetConsumption.totalEstimatedTokens, pack.totalEstimatedTokens);
  assert.equal(explained.budgetConsumption.tokensRemaining, 80 - pack.totalEstimatedTokens);
  assert.equal(explained.budgetConsumption.totalActualBytes, pack.items[0]!.actualBytes);
  assert.equal("maxBytes" in explained.budgetConsumption, false);
  assert.equal("bytesRemaining" in explained.budgetConsumption, false);
});

test("T22: explainPack budgetConsumption — maxBytes present when the budget set it", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("budget-bytes") });
  engine.registerProvider(stubProviderWithContent("p", { a: "hello" }, 10));
  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 1000, maxBytes: 500 } }),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t22 budget bytes",
    createdBy: { kind: "human", name: "kim" },
  });
  const explained = engine.explainPack(pack.packId);
  assert.equal(explained.budgetConsumption.maxBytes, 500);
  assert.equal(explained.budgetConsumption.bytesRemaining, 500 - pack.items[0]!.actualBytes);
});

test("T22: dispatcher — context.build accepts a well-formed score; malformed score is rejected; context.explain returns the enriched envelope", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(stubProviderWithContent("p", { a: "content" }, 10));

  const goodBuild = await dispatch(
    engine,
    envelope("context.build", {
      request: baseRequest(),
      items: [{ providerId: "p", ref: "a", score: stubScore() }],
      rankingVersion: "manual-v1",
      creationReason: "t22 dispatcher good score",
      createdBy: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(goodBuild.ok, true);
  if (!goodBuild.ok) throw new Error("expected ok");
  const packId = (goodBuild.result as { pack: { packId: string } }).pack.packId;

  const badBuild = await dispatch(
    engine,
    envelope("context.build", {
      request: baseRequest(),
      items: [{ providerId: "p", ref: "a", score: { pinned: "yes", compositeScore: 0.5, authority: 1 } }],
      rankingVersion: "manual-v1",
      creationReason: "t22 dispatcher bad score",
      createdBy: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(badBuild.ok, false);
  if (badBuild.ok) throw new Error("expected failure");
  assert.equal(badBuild.error.code, "CONTEXT_VALIDATION_FAILED");

  const explained = await dispatch(engine, envelope("context.explain", { packId }));
  assert.equal(explained.ok, true);
  if (!explained.ok) throw new Error("expected ok");
  const result = explained.result as {
    pack: { items: Array<{ score?: unknown }> };
    budgetConsumption: { maxTokens: number };
  };
  assert.deepEqual(result.pack.items[0]!.score, stubScore());
  assert.equal(typeof result.budgetConsumption.maxTokens, "number");
});
