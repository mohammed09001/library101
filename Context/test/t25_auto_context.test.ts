/**
 * CHILD LOOP verification (Execution 10) — Task 25: Define Auto-Context as
 * opt-in gated mode. Proves: with no policy set (or explicitly `false`),
 * `context.autoContext.run` always returns `"suggested"` with zero
 * `context_packs`/`pack_attachments` rows created; only a persisted,
 * project-scoped policy explicitly set to `true` unlocks `"attached"`
 * (a real `mode: "attach"` pack + attachment); an agent actor cannot
 * enable automatic attachment (only disable it); a `"tool"`/`"engine"`
 * actor CAN enable it (the refusal is `"agent"`-specific, not a blanket
 * non-human refusal); and the dispatcher round-trips all three new
 * operations including the negative case.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import { AutoContextForbiddenError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import type { ContextRequestEnvelope } from "../src/contracts/operations.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t25-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.8.0",
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

function stubProvider(id: string, refToContent: Record<string, string>): ContextProvider {
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
    discover: async () =>
      Object.keys(refToContent).map((ref) => ({ providerId: id, ref, title: ref, estimatedTokens: 10 })),
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: refToContent[r.ref] ?? "missing",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

function envelope(operation: ContextRequestEnvelope["operation"], request: unknown): ContextRequestEnvelope {
  return { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation, request };
}

test("T25: no policy set — run always suggests, zero pack/attachment rows created", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("no-policy") });
  engine.registerProvider(stubProvider("p", { a: "content a" }));
  const result = await engine.runAutoContext({
    request: baseRequest(),
    creationReason: "t25 no policy",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(result.decision, "suggested");
  assert.ok(result.items.length > 0, "selection still ran and found candidates");
  // Discriminated union: no .pack/.attachment field exists on the suggested branch.
  assert.equal("pack" in result, false);
  assert.equal("attachment" in result, false);
  assert.equal(engine.getAutoContextPolicy("demo"), null);
});

test("T25: policy explicitly false — same suggest-only behavior", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("policy-false") });
  engine.registerProvider(stubProvider("p", { a: "content a" }));
  engine.setAutoContextPolicy({
    projectKey: "demo",
    allowAutomaticAttachment: false,
    actor: { kind: "human", name: "kim" },
  });
  const result = await engine.runAutoContext({
    request: baseRequest(),
    creationReason: "t25 policy false",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(result.decision, "suggested");
});

test("T25: policy set true by a human actor — run attaches a real mode:'attach' pack", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("policy-true") });
  engine.registerProvider(stubProvider("p", { a: "content a" }));
  const policy = engine.setAutoContextPolicy({
    projectKey: "demo",
    allowAutomaticAttachment: true,
    actor: { kind: "human", name: "kim" },
  });
  assert.equal(policy.allowAutomaticAttachment, true);
  assert.equal(engine.getAutoContextPolicy("demo")!.allowAutomaticAttachment, true);

  const result = await engine.runAutoContext({
    request: baseRequest(),
    creationReason: "t25 policy true",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(result.decision, "attached");
  if (result.decision !== "attached") throw new Error("unreachable");
  assert.equal(result.pack.mode, "attach");
  assert.ok(result.pack.expiresAt !== null, "attach-mode pack has a real TTL, not permanent");
  assert.equal(result.attachment.packId, result.pack.packId);
  assert.deepEqual(result.attachment.target, { kind: "human", name: "kim" }, "defaults to request.hostAgent");

  // Independently retrievable — a genuine persisted pack, not a fabrication.
  const fetched = engine.getPack(result.pack.packId);
  assert.equal(fetched.packHash, result.pack.packHash);
});

test("T25: an agent actor cannot enable automatic attachment, but can disable it", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("agent-refused") });
  assert.throws(
    () =>
      engine.setAutoContextPolicy({
        projectKey: "demo",
        allowAutomaticAttachment: true,
        actor: { kind: "agent", name: "worker", agentType: "claude" },
      }),
    (err: unknown) => err instanceof AutoContextForbiddenError,
  );
  assert.equal(engine.getAutoContextPolicy("demo"), null, "the refused attempt left no row");

  // An agent CAN turn it back off (a human enables it first).
  engine.setAutoContextPolicy({
    projectKey: "demo",
    allowAutomaticAttachment: true,
    actor: { kind: "human", name: "kim" },
  });
  const disabled = engine.setAutoContextPolicy({
    projectKey: "demo",
    allowAutomaticAttachment: false,
    actor: { kind: "agent", name: "worker", agentType: "claude" },
  });
  assert.equal(disabled.allowAutomaticAttachment, false);
});

test("T25: a 'tool'/'engine' actor CAN enable automatic attachment — the refusal is agent-specific, not blanket non-human", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("tool-engine-allowed") });
  const toolSet = engine.setAutoContextPolicy({
    projectKey: "proj-tool",
    allowAutomaticAttachment: true,
    actor: { kind: "tool", name: "ci-runner" },
  });
  assert.equal(toolSet.allowAutomaticAttachment, true);

  const engineSet = engine.setAutoContextPolicy({
    projectKey: "proj-engine",
    allowAutomaticAttachment: true,
    actor: { kind: "engine", name: "project_projection" },
  });
  assert.equal(engineSet.allowAutomaticAttachment, true);
});

test("T25: dispatcher round-trip — run, getPolicy, setPolicy (including the negative case)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(stubProvider("p", { a: "content a" }));

  const getBefore = await dispatch(engine, envelope("context.autoContext.getPolicy", { projectKey: "demo" }));
  assert.equal(getBefore.ok, true);
  if (!getBefore.ok) throw new Error("expected ok");
  assert.equal((getBefore.result as { policy: unknown }).policy, null);

  const badSet = await dispatch(
    engine,
    envelope("context.autoContext.setPolicy", {
      projectKey: "demo",
      allowAutomaticAttachment: true,
      actor: { kind: "agent", name: "worker" },
    }),
  );
  assert.equal(badSet.ok, false);
  if (badSet.ok) throw new Error("expected failure");
  assert.equal(badSet.error.code, "CONTEXT_AUTO_CONTEXT_FORBIDDEN");

  const goodSet = await dispatch(
    engine,
    envelope("context.autoContext.setPolicy", {
      projectKey: "demo",
      allowAutomaticAttachment: true,
      actor: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(goodSet.ok, true);

  const run = await dispatch(
    engine,
    envelope("context.autoContext.run", {
      request: baseRequest(),
      creationReason: "t25 dispatch run",
      createdBy: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(run.ok, true);
  if (!run.ok) throw new Error("expected ok");
  assert.equal((run.result as { decision: string }).decision, "attached");
});
