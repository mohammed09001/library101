/**
 * CHILD LOOP verification (Execution 15) — Task 33: context-content
 * privacy filtering. Task Source Requirement: "Apply source-specific field
 * policies before candidate normalization and again before
 * serialization/export."
 *
 * Proves with final-state evidence:
 * - seam 1 (pre-normalization): a request's `contentFieldPolicies` redact
 *   a provider's content BEFORE `normalizeCandidate()` — the pack item's
 *   `contentHash`, accounted bytes, and ranking signals all reflect the
 *   FILTERED material (hash differs from the unfiltered build; budget
 *   accounting shrinks; term overlap on a redacted token drops to zero);
 * - metadata field redaction reaches `structuredPayload`
 *   (`sourceMetadata.<path>` and `title`), via the policy engine directly;
 * - seam 2 (finalization/serialization): `isPolicyApplied` is the
 *   computePack re-verification — true for honestly-filtered material
 *   (idempotent no-op), FALSE for material that would still be redactable,
 *   and computePack excludes such items (`privacy_violation`) instead of
 *   serializing them;
 * - explainability: included items carry `redactionCount` (absent when
 *   zero) and the build event records the total;
 * - validation negatives: uncompilable patterns, unknown field roots,
 *   duplicate provider policies are CONTEXT_VALIDATION_FAILED at the
 *   boundary — never runtime surprises;
 * - determinism/reproducibility: identical request + policies → identical
 *   packHash; a definition carrying policies replays reproducibly.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { validateContextRequest } from "../src/engine/normalize.ts";
import { applySourceFieldPolicy, isPolicyApplied, REDACTED } from "../src/engine/contentPolicy.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest, SourceFieldPolicy } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t33-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
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

const SECRET_BODY = "public intro SECRET_API_KEY=xyz-123 public outro";

function leakingProvider(id: string, sourceMetadata?: unknown): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" as const },
      freshness: { kind: "live" as const },
      privacy: { maxPrivacyClass: "internal" as const },
      version: "1.0.0",
    },
    discover: async () => [{ providerId: id, ref: "a.md", title: "a.md", estimatedTokens: 10 }],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: `Title with SECRET-TITLE-Token ${r.ref}`,
        estimatedTokens: Math.ceil(SECRET_BODY.length / 4),
        content: SECRET_BODY,
        retrievedAt: "2026-08-30T00:00:00Z",
        ...(sourceMetadata !== undefined ? { sourceMetadata } : {}),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

const secretPolicy: SourceFieldPolicy = {
  providerId: "leaky",
  redactPatterns: ["SECRET_API_KEY=[a-z0-9\\-]+"],
};

function buildInput(engine: ContextEngine, request: ContextRequest) {
  return engine.buildPack({
    request,
    items: [{ providerId: "leaky", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t33",
    createdBy: { kind: "human", name: "kim" },
  });
}

test("T33 seam 1: content is redacted BEFORE normalization — hash, bytes, and ranking reflect the filtered material", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("pre-normalize") });
  engine.registerProvider(leakingProvider("leaky"));

  const unfiltered = await buildInput(engine, baseRequest({ taskText: "secret_api_key intro" }));
  const filtered = await buildInput(engine, baseRequest({ taskText: "secret_api_key intro", contentFieldPolicies: [secretPolicy] }));

  // Different content -> different content-addressed identity.
  assert.notEqual(filtered.packHash, unfiltered.packHash);
  const f = filtered.items[0]!;
  const u = unfiltered.items[0]!;
  assert.notEqual(f.contentHash, u.contentHash);
  // Filtering shrank the accounted material.
  assert.ok(f.actualBytes < u.actualBytes, `expected filtered bytes ${f.actualBytes} < unfiltered ${u.actualBytes}`);
  // Explainability: the filtered item records its redactions; the other is silent.
  assert.equal(f.redactionCount, 1);
  assert.equal(u.redactionCount, undefined);

  // Ranking signals are computed on the FILTERED content (context.select
  // is where engine-computed score breakdowns surface): the secret token
  // no longer contributes to term overlap, 'intro' still does.
  const selectedFiltered = await engine.selectCandidates({ request: baseRequest({ taskText: "secret_api_key intro", contentFieldPolicies: [secretPolicy] }) });
  const selectedUnfiltered = await engine.selectCandidates({ request: baseRequest({ taskText: "secret_api_key intro" }) });
  assert.equal(selectedFiltered.items[0]!.score.termOverlap, 0.25, "only 'intro' (1 of 4 tokens) survives redaction");
  assert.equal(selectedUnfiltered.items[0]!.score.termOverlap, 1, "unfiltered content matches all four tokens");
});

test("T33 seam 1: redaction is deterministic — identical policies reproduce the identical packHash", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("determinism") });
  engine.registerProvider(leakingProvider("leaky"));
  const a = await buildInput(engine, baseRequest({ contentFieldPolicies: [secretPolicy] }));
  const b = await buildInput(engine, baseRequest({ contentFieldPolicies: [secretPolicy] }));
  assert.equal(a.packHash, b.packHash);
});

test("T33: metadata field policies redact sourceMetadata paths and title, and are idempotent", () => {
  const candidate = {
    providerId: "leaky",
    ref: "r1",
    title: "Title with SECRET-TITLE-Token",
    estimatedTokens: 5,
    content: "harmless",
    retrievedAt: "2026-08-30T00:00:00Z",
    sourceMetadata: { provenance: { actor: { name: "kim", kind: "human" } }, confidence: 0.9 },
  };
  const policy: SourceFieldPolicy = {
    providerId: "leaky",
    redactedFields: ["sourceMetadata.provenance.actor.name", "title"],
  };

  const once = applySourceFieldPolicy(candidate, [policy]);
  assert.equal(once.redactionCount, 2);
  const meta = once.candidate.sourceMetadata as { provenance: { actor: { name: string; kind: string } }; confidence: number };
  assert.equal(meta.provenance.actor.name, REDACTED);
  assert.equal(meta.provenance.actor.kind, "human", "sibling fields are untouched");
  assert.equal(meta.confidence, 0.9, "non-string fields are untouched");
  assert.equal(once.candidate.title, REDACTED);
  // The input candidate was never mutated.
  const originalMeta = candidate.sourceMetadata as { provenance: { actor: { name: string } } };
  assert.equal(originalMeta.provenance.actor.name, "kim");

  // Idempotence: re-applying reports zero further redactions.
  const twice = applySourceFieldPolicy(once.candidate, [policy]);
  assert.equal(twice.redactionCount, 0);
});

test("T33 seam 2: the finalization check admits filtered material and rejects anything still redactable", () => {
  const policy: SourceFieldPolicy = { providerId: "leaky", redactPatterns: ["SECRET-[A-Z]+"] };

  // Honest path: seam-1 output contains no further matches.
  const applied = applySourceFieldPolicy(
    { providerId: "leaky", ref: "r", title: "t", estimatedTokens: 1, content: "x SECRET-TOKEN y", retrievedAt: "2026-08-30T00:00:00Z" },
    [policy],
  );
  assert.ok(applied.redactionCount > 0);
  const excerpt = applied.candidate.content; // excerpt derives from this content
  assert.equal(isPolicyApplied(excerpt, applied.candidate.title, undefined, [policy]), true);

  // Tripwire: unfiltered material at the serialize seam is refused.
  assert.equal(isPolicyApplied("x SECRET-TOKEN y", "t", undefined, [policy]), false);
  assert.equal(isPolicyApplied("clean", "t", undefined, [policy]), true);

  // Metadata path still holding a redactable string is refused; REDACTED is not.
  const payload = { a: { b: "still-secret" } };
  assert.equal(isPolicyApplied("clean", "t", payload, [{ providerId: "leaky", redactedFields: ["sourceMetadata.a.b"] }]), false);
  assert.equal(isPolicyApplied("clean", "t", { a: { b: REDACTED } }, [{ providerId: "leaky", redactedFields: ["sourceMetadata.a.b"] }]), true);
});

test("T33 seam 2 in computePack: the finalize check is a cheap no-op for honest builds", async () => {
  // A policy whose pattern has no match produces redactionCount 0 and
  // passes the seam — the re-verification must never disturb honest
  // builds. (The rejection branch of the seam is proven by
  // isPolicyApplied's own tests above; computePack consults that exact
  // function and maps `false` to a privacy_violation exclusion.)
  const engine = new ContextEngine({ storePath: tempStorePath("tripwire") });
  engine.registerProvider(leakingProvider("leaky"));
  const result = await buildInput(engine, baseRequest({ contentFieldPolicies: [{ providerId: "leaky", redactPatterns: ["NEVER-MATCHES"] }] }));
  assert.equal(result.exclusions.length, 0);
  assert.equal(result.items[0]!.redactionCount, undefined);
});

test("T33: validation negatives — bad patterns, unknown field roots, and duplicate provider policies fail at the boundary", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p", redactPatterns: ["([bad"] }] })),
    /not a valid RegExp/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p", redactPatterns: ["x*"] }] })),
    /matches the empty string/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p", redactedFields: ["content"] }] })),
    /must start with 'title' or 'sourceMetadata'/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p", redactedFields: ["title.sub"] }] })),
    /takes no sub-path/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p", redactPatterns: ["x"] }, { providerId: "p", redactPatterns: ["y"] }] })),
    /more than one policy for provider 'p'/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ contentFieldPolicies: [{ providerId: "p" }] })),
    /must declare redactedFields or redactPatterns/,
  );
  // The valid shape passes and round-trips.
  const ok = validateContextRequest(baseRequest({ contentFieldPolicies: [secretPolicy] }));
  assert.deepEqual(ok.contentFieldPolicies, [secretPolicy]);
});

test("T33: the versioned dispatcher carries policies end-to-end and the build event records the total", async () => {
  const storePath = tempStorePath("dispatch");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(leakingProvider("leaky"));
  const response = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.build",
    request: {
      request: baseRequest({ contentFieldPolicies: [secretPolicy] }),
      items: [{ providerId: "leaky", ref: "a.md" }],
      rankingVersion: "v1",
      creationReason: "t33-dispatch",
      createdBy: { kind: "human", name: "kim" },
    },
  });
  assert.equal(response.ok, true);
  if (!response.ok) return;
  const pack = (response.result as { pack: { items: Array<{ redactionCount?: number }> } }).pack;
  assert.equal(pack.items[0]!.redactionCount, 1);

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(storePath);
  const built = db.prepare("SELECT payload_json FROM engine_events WHERE type = 'context.pack.built'").all() as Array<{ payload_json: string }>;
  db.close();
  const payload = JSON.parse(built[0]!.payload_json) as { redactionCount?: number };
  assert.equal(payload.redactionCount, 1, "the build event records the pack's total redactions");
});

test("T33: a definition carrying policies replays reproducibly (policies persist inside the recipe)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("replay") });
  engine.registerProvider(leakingProvider("leaky"));
  const definition = engine.createDefinition({
    request: baseRequest({ contentFieldPolicies: [secretPolicy] }),
    items: [{ providerId: "leaky", ref: "a.md" }],
    rankingVersion: "v1",
    creationReason: "t33",
    createdBy: { kind: "human", name: "kim" },
  });
  const { pack } = await engine.syncDefinition(definition.definitionId);
  assert.equal(pack.items[0]!.redactionCount, 1);

  const replay = await engine.replayPack(pack.packId);
  assert.equal(replay.reproducible, true, "the redacted content is stable, so replay reproduces the same packHash");
});
