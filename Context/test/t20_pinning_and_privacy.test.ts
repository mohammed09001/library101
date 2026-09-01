/**
 * CHILD LOOP 3 verification (Execution 07) — Task 20: Build priority and
 * pinning semantics. Proves: a pinned item (`requiredSources`) genuinely
 * gets priority claim on budget, not just ranking order; a pin does NOT
 * bypass privacy enforcement (a real gap closed this Execution, documented
 * since Task 3/Execution 01 — see docs/CONTRACTS.md's old "known
 * limitation"); and a pin does NOT bypass the hard token/byte ceiling
 * either. Also proves `context.select` never surfaces a privacy-violating
 * candidate.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isWithinPrivacyCeiling } from "../src/engine/privacy.ts";
import { isPinned } from "../src/engine/pinning.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { selectCandidates } from "../src/engine/selector.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import type { NormalizedContextCandidate } from "../src/contracts/candidates.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t20-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.5.0",
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

test("T20: isWithinPrivacyCeiling — ordering is public < internal < sensitive", () => {
  const cand = (privacyClass: "public" | "internal" | "sensitive") =>
    ({ privacyClass }) as Pick<NormalizedContextCandidate, "privacyClass">;
  assert.equal(isWithinPrivacyCeiling(cand("public"), "public"), true);
  assert.equal(isWithinPrivacyCeiling(cand("internal"), "public"), false);
  assert.equal(isWithinPrivacyCeiling(cand("sensitive"), "internal"), false);
  assert.equal(isWithinPrivacyCeiling(cand("internal"), "sensitive"), true);
  assert.equal(isWithinPrivacyCeiling(cand("sensitive"), "sensitive"), true);
});

test("T20: isPinned matches bare ref or providerId:ref, and is false without requiredSources", () => {
  const cand = { providerId: "p", ref: "a.md" };
  assert.equal(isPinned(cand, undefined), false);
  assert.equal(isPinned(cand, []), false);
  assert.equal(isPinned(cand, ["a.md"]), true);
  assert.equal(isPinned(cand, ["p:a.md"]), true);
  assert.equal(isPinned(cand, ["other.md"]), false);
});

function stubProvider(id: string, maxPrivacyClass: "public" | "internal" | "sensitive", refToContent: Record<string, string>, estimatedTokens = 10): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass },
      version: "1.0.0",
    },
    discover: async (_request) =>
      Object.keys(refToContent).map((ref) => ({ providerId: id, ref, title: ref, estimatedTokens })),
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

test("T20: a pinned item genuinely gets priority budget claim, not just ranking order", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pin-priority") });
  engine.registerProvider(stubProvider("p", "internal", { first: "content one", pinned: "content two", third: "content three" }, 20));
  const pack = await engine.buildPack({
    // Budget fits exactly 2 of the 3 items (each 20+8=28 tokens -> 56 for two).
    request: baseRequest({ budget: { maxTokens: 60 }, requiredSources: ["pinned"] }),
    items: [
      { providerId: "p", ref: "first" },
      { providerId: "p", ref: "pinned" },
      { providerId: "p", ref: "third" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t20 pin priority",
    createdBy: { kind: "human", name: "kim" },
  });
  const includedRefs = pack.items.map((i) => i.ref);
  assert.ok(includedRefs.includes("pinned"), "the pinned item is included even though it was listed second, not first");
  assert.equal(pack.items[0]!.ref, "pinned", "the pinned item claims the first budget slot");
});

test("T20: negative — a pin does NOT bypass privacy enforcement", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pin-vs-privacy") });
  engine.registerProvider(stubProvider("sensitive_provider", "sensitive", { secret: "very sensitive material" }));
  const pack = await engine.buildPack({
    // Caller's privacy ceiling is "internal" — below the provider's declared "sensitive" ceiling.
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal" }, requiredSources: ["secret"] }),
    items: [{ providerId: "sensitive_provider", ref: "secret" }],
    rankingVersion: "manual-v1",
    creationReason: "t20 pin vs privacy",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 0, "the pin does not override the privacy ceiling");
  assert.equal(pack.exclusions.length, 1);
  assert.equal(pack.exclusions[0]!.reason, "privacy_violation");
  assert.match(pack.exclusions[0]!.message ?? "", /sensitive.*internal|exceeds request ceiling/);
});

test("T20: negative — a pin does NOT bypass the hard token ceiling", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pin-vs-hardlimit") });
  engine.registerProvider(stubProvider("p", "internal", { huge: "x".repeat(4000) }, 5000));
  const pack = await engine.buildPack({
    // maxTokens: 20 leaves only 20-8=12 tokens for a possible truncation —
    // below the 20-token minimum-useful floor, so even truncation can't
    // rescue this pinned item; it must be excluded outright.
    request: baseRequest({ budget: { maxTokens: 20 }, requiredSources: ["huge"] }),
    items: [{ providerId: "p", ref: "huge" }],
    rankingVersion: "manual-v1",
    creationReason: "t20 pin vs hard limit",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 0, "a pinned item that cannot fit even after truncation attempt is still excluded");
  assert.equal(pack.exclusions[0]!.reason, "budget_exceeded");
});

test("T20: negative — a pin does NOT bypass maxBytes", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pin-vs-maxbytes") });
  engine.registerProvider(stubProvider("p", "internal", { huge: "x".repeat(4000) }, 10));
  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 10000, maxBytes: 10 }, requiredSources: ["huge"] }),
    items: [{ providerId: "p", ref: "huge" }],
    rankingVersion: "manual-v1",
    creationReason: "t20 pin vs maxBytes",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 0);
  assert.equal(pack.exclusions[0]!.reason, "budget_exceeded");
});

test("T20: context.select never surfaces a privacy-violating candidate", async () => {
  const registry = new ProviderRegistry();
  registry.register(stubProvider("sensitive_provider", "sensitive", { secret: "sensitive material about the task" }));
  registry.register(stubProvider("public_provider", "public", { ok: "public material about the task" }));
  const result = await selectCandidates(registry, {
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal" }, taskText: "task material" }),
  });
  assert.ok(!result.items.some((i) => i.providerId === "sensitive_provider"));
  assert.ok(result.items.some((i) => i.providerId === "public_provider"));
  assert.ok(result.excluded.some((e) => e.reason === "privacy_violation" && e.providerId === "sensitive_provider"));
});

test("T20: negative — buildPack excludes a mid-list privacy violation while the rest still build normally", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("mixed-privacy") });
  engine.registerProvider(stubProvider("public_provider", "public", { a: "alpha content" }));
  engine.registerProvider(stubProvider("sensitive_provider", "sensitive", { b: "beta secret content" }));
  engine.registerProvider(stubProvider("internal_provider", "internal", { c: "gamma content" }));
  const pack = await engine.buildPack({
    request: baseRequest({ privacyPolicy: { maxPrivacyClass: "internal" } }),
    items: [
      { providerId: "public_provider", ref: "a" },
      { providerId: "sensitive_provider", ref: "b" },
      { providerId: "internal_provider", ref: "c" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t20 mixed privacy",
    createdBy: { kind: "human", name: "kim" },
  });
  const includedProviders = pack.items.map((i) => i.providerId).sort();
  assert.deepEqual(includedProviders, ["internal_provider", "public_provider"]);
  const violation = pack.exclusions.find((e) => e.reason === "privacy_violation");
  assert.ok(violation);
  assert.equal(violation!.providerId, "sensitive_provider");
});
