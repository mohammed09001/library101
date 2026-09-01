/**
 * CHILD LOOP 2 verification (Execution 07) — Task 19: Build explicit
 * token/byte budget accounting. Proves: real (not estimated) serialized
 * byte length is verified and recorded on every pack item; `maxBytes` is
 * enforced as an independent hard ceiling; `reservedFramingTokens` reserves
 * budget off the top before any item is considered; and deterministic
 * truncation includes a boundary item partially (with a real, re-verified
 * byte count for the truncated slice) rather than excluding it outright,
 * while an item too small to usefully truncate is still excluded.
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
  const dir = mkdtempSync(join(tmpdir(), `ctx-t19-${name}-`));
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

test("T19: a fully-included item records its real, verified byte length, not just the token estimate", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("verify-bytes") });
  const content = "The quick brown fox jumps over the lazy dog. ".repeat(3);
  engine.registerProvider(stubProviderWithContent("p", { a: content }, 20));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t19 verify bytes",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1);
  const item = pack.items[0]!;
  assert.equal(item.truncated, false);
  // The normalized excerpt is whitespace-collapsed (Task 4) before hashing;
  // the recorded actualBytes must be the REAL byte length of that excerpt,
  // not a token-based guess — verify it independently here.
  const expectedBytes = Buffer.byteLength(content.replace(/\s+/g, " ").trim(), "utf8");
  assert.equal(item.actualBytes, expectedBytes);
});

test("T19: maxBytes is enforced as an independent hard ceiling", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("maxbytes") });
  const bigContent = "x".repeat(500);
  engine.registerProvider(stubProviderWithContent("p", { a: bigContent, b: "small" }, 5));
  const pack = await engine.buildPack({
    // Plenty of token budget, but a tight byte ceiling that only the small
    // item fits. "b" (small) is listed FIRST: byte overflow is a strict
    // prefix too (consistent with the existing token behavior) — once an
    // item overflows, everything after it is excluded regardless of that
    // later item's own size, so the small item must precede the big one to
    // demonstrate "maxBytes excludes the oversized item" rather than
    // "maxBytes excludes everything after the first overflow."
    request: baseRequest({ budget: { maxTokens: 10000, maxBytes: 20 } }),
    items: [
      { providerId: "p", ref: "b" },
      { providerId: "p", ref: "a" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t19 maxBytes",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.deepEqual(pack.items.map((i) => i.ref), ["b"], "the 500-byte item is excluded by maxBytes even though tokens have plenty of room");
});

test("T19: reservedFramingTokens reserves budget off the top before any item is considered", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("framing") });
  engine.registerProvider(stubProviderWithContent("p", { a: "short text" }, 50));
  const withoutReserve = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 100 } }),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t19 no reserve",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(withoutReserve.items.length, 1, "fits comfortably with no reservation");

  const engine2 = new ContextEngine({ storePath: tempStorePath("framing2") });
  engine2.registerProvider(stubProviderWithContent("p", { a: "short text" }, 50));
  const withReserve = await engine2.buildPack({
    // 100 - 80 reserved = 20 effective; the 50(+8)=58-token item doesn't fit,
    // and only 20-8=12 tokens would remain for truncation — below the
    // 20-token minimum-useful floor, so this is a clean exclusion (a
    // separate test covers the truncation case specifically).
    request: baseRequest({ budget: { maxTokens: 100, reservedFramingTokens: 80 } }),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t19 with reserve",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(withReserve.items.length, 0, "the framing reservation leaves too little effective budget for the same item");
  assert.equal(withReserve.exclusions[0]!.reason, "budget_exceeded");
});

test("T19: deterministic truncation — a boundary item is partially included with a re-verified truncated byte count", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("truncate") });
  // estimatedTokens=100 (well above the ~20-token minimum-useful floor once
  // truncated), long enough content that a proportional character slice is meaningful.
  const content = "word ".repeat(400); // 2000 chars
  engine.registerProvider(stubProviderWithContent("p", { a: content }, 100));
  // Budget: 8 (framing) + 100 doesn't fit in 50; remaining after framing
  // accounting leaves room for a truncated ~42-token slice (>= the 20 floor).
  const pack = await engine.buildPack({
    request: baseRequest({ budget: { maxTokens: 50 } }),
    items: [{ providerId: "p", ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t19 truncation",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1, "truncated and included, not excluded outright");
  const item = pack.items[0]!;
  assert.equal(item.truncated, true);
  assert.equal(item.fullEstimatedTokens, 100);
  assert.ok(item.estimatedTokens < 100, "the accounted size is less than the full estimate");
  assert.ok(item.actualBytes > 0 && item.actualBytes < Buffer.byteLength(content, "utf8"), "actualBytes reflects the truncated slice, re-verified, not the full content");
});

test("T19: negative — too little remaining budget to usefully truncate excludes the item outright", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("no-truncate") });
  engine.registerProvider(stubProviderWithContent("p", { a: "first item", b: "second item, much larger content here" }, 50));
  const pack = await engine.buildPack({
    // 66: first item (50+8=58) fits with only 8 tokens left — below the
    // 20-token minimum-useful-truncation floor, so the second is excluded
    // outright rather than truncated to a useless sliver.
    request: baseRequest({ budget: { maxTokens: 66 } }),
    items: [
      { providerId: "p", ref: "a" },
      { providerId: "p", ref: "b" },
    ],
    rankingVersion: "manual-v1",
    creationReason: "t19 no truncation",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1);
  assert.equal(pack.items[0]!.truncated, false);
  assert.equal(pack.exclusions.length, 1);
  assert.equal(pack.exclusions[0]!.reason, "budget_exceeded");
});
