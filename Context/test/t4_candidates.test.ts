/**
 * CHILD LOOP 1 verification (Execution 02) — Task 4: Define normalized
 * ContextCandidate schema. Proves: excerpt normalization/truncation, stable
 * dedup keys for identical content, relevance signals computed within
 * [0,1] bounds (and absent when there's nothing to compute against),
 * authority tier derivation per provider freshness kind, and privacy class
 * inheritance from the owning provider's declared ceiling.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCandidate, EXCERPT_MAX_CHARS } from "../src/engine/normalizeCandidate.ts";
import type { ContextCandidate, ProviderDeclaration } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.1.0",
    project: { projectKey: "library101" },
    taskText: "summarize the authentication module",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 1000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function declaration(overrides: Partial<ProviderDeclaration> = {}): ProviderDeclaration {
  return {
    id: "project_files",
    displayName: "Project Files",
    description: "d",
    capabilities: ["file_content"],
    cost: { relativeCost: "low" },
    freshness: { kind: "live" },
    privacy: { maxPrivacyClass: "sensitive" },
    ...overrides,
  };
}

function candidate(overrides: Partial<ContextCandidate> = {}): ContextCandidate {
  return {
    providerId: "project_files",
    ref: "auth/module.ts",
    title: "module.ts",
    estimatedTokens: 42,
    content: "The authentication module handles login and session tokens.",
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("T4: excerpt is whitespace-normalized and content-hashed", () => {
  const c = candidate({ content: "  hello    world  \n\n  again  " });
  const n = normalizeCandidate(c, { request: baseRequest(), declaration: declaration(), discoveredAt: c.retrievedAt });
  assert.equal(n.excerpt, "hello world again");
  assert.equal(n.contentHash.length, 64);
});

test("T4: excerpt is truncated at EXCERPT_MAX_CHARS", () => {
  const huge = "x".repeat(EXCERPT_MAX_CHARS + 500);
  const c = candidate({ content: huge });
  const n = normalizeCandidate(c, { request: baseRequest(), declaration: declaration(), discoveredAt: c.retrievedAt });
  assert.equal(n.excerpt.length, EXCERPT_MAX_CHARS);
});

test("T4: dedup keys are stable for identical content and ref", () => {
  const c1 = candidate({ content: "same content here" });
  const c2 = candidate({ content: "same content here" });
  const n1 = normalizeCandidate(c1, { request: baseRequest(), declaration: declaration(), discoveredAt: c1.retrievedAt });
  const n2 = normalizeCandidate(c2, { request: baseRequest(), declaration: declaration(), discoveredAt: c2.retrievedAt });
  assert.deepEqual(n1.dedupKeys, n2.dedupKeys);
  assert.notEqual(n1.candidateId, n2.candidateId, "candidateId is always a fresh identity, unlike dedupKeys");
});

test("T4: textMatchScore is within [0,1] and reflects keyword overlap", () => {
  const c = candidate({ content: "This module handles authentication and login." });
  const n = normalizeCandidate(c, {
    request: baseRequest({ taskText: "explain the authentication module" }),
    declaration: declaration(),
    discoveredAt: c.retrievedAt,
  });
  assert.ok(n.relevanceSignals.textMatchScore !== undefined);
  assert.ok(n.relevanceSignals.textMatchScore! > 0 && n.relevanceSignals.textMatchScore! <= 1);
});

test("T4: textMatchScore is undefined when taskText has no meaningful tokens", () => {
  const c = candidate();
  const n = normalizeCandidate(c, { request: baseRequest({ taskText: "  " }), declaration: declaration(), discoveredAt: c.retrievedAt });
  assert.equal(n.relevanceSignals.textMatchScore, undefined);
});

test("T4: recencyScore is undefined without a freshness window, computed and bounded when one is set", () => {
  const c = candidate({ retrievedAt: new Date().toISOString() });
  const withoutWindow = normalizeCandidate(c, { request: baseRequest(), declaration: declaration(), discoveredAt: c.retrievedAt });
  assert.equal(withoutWindow.relevanceSignals.recencyScore, undefined);

  const withWindow = normalizeCandidate(c, {
    request: baseRequest({ freshness: { maxAgeSeconds: 3600 } }),
    declaration: declaration(),
    discoveredAt: c.retrievedAt,
  });
  assert.ok(withWindow.relevanceSignals.recencyScore !== undefined);
  assert.ok(withWindow.relevanceSignals.recencyScore! >= 0 && withWindow.relevanceSignals.recencyScore! <= 1);
});

test("T4: authority tier derives from provider freshness kind", () => {
  const c = candidate();
  const live = normalizeCandidate(c, { request: baseRequest(), declaration: declaration({ freshness: { kind: "live" } }), discoveredAt: c.retrievedAt });
  assert.equal(live.authority.tier, "provider_verified");

  const periodic = normalizeCandidate(c, { request: baseRequest(), declaration: declaration({ freshness: { kind: "periodic" } }), discoveredAt: c.retrievedAt });
  assert.equal(periodic.authority.tier, "provider_reported");

  const staticKind = normalizeCandidate(c, { request: baseRequest(), declaration: declaration({ freshness: { kind: "static" } }), discoveredAt: c.retrievedAt });
  assert.equal(staticKind.authority.tier, "provider_reported");

  const missing = normalizeCandidate(c, { request: baseRequest(), declaration: undefined, discoveredAt: c.retrievedAt });
  assert.equal(missing.authority.tier, "unattributed");
});

test("T4: privacyClass is inherited from the provider's declared ceiling", () => {
  const c = candidate();
  const n = normalizeCandidate(c, {
    request: baseRequest(),
    declaration: declaration({ privacy: { maxPrivacyClass: "sensitive" } }),
    discoveredAt: c.retrievedAt,
  });
  assert.equal(n.privacyClass, "sensitive");
});
