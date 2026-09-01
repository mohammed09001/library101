/**
 * CHILD LOOP verification (Execution 16) — Task 35: provider permission
 * boundaries. Task Source Requirement: "A Context provider can access only
 * the project/scope granted to it; cross-project retrieval requires
 * explicit policy."
 *
 * Evidence:
 * - a provider declaring `grantedProjectKeys` is consulted ONLY for those
   projects: discovery skips it (disclosed in `denied`) and an explicit
   build item for another project is excluded `permission_denied`;
 * - cross-project retrieval happens ONLY through the request's explicit
 *   `providerScopeOverrides` policy — the caller's policy document, never
 *   provider initiative;
 * - unrestricted providers (the backward-compatible default — request-
 *   scoped adapters like Memory derive scope from the request itself) are
 *   unaffected;
 * - the boundary runs on every retrieval path: discover/select, build,
 *   preview, and auto-context all disclose the reduced coverage.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { validateContextRequest } from "../src/engine/normalize.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t35-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    project: { projectKey: "alpha" },
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

/** A provider that records every projectKey it is asked about — so tests can prove what was (not) consulted. */
function scopedProvider(id: string, grantedProjectKeys: readonly string[] | undefined, consulted: Set<string>): ContextProvider {
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
      ...(grantedProjectKeys !== undefined ? { grantedProjectKeys } : {}),
    },
    discover: async (request) => {
      consulted.add(request.project.projectKey);
      return [{ providerId: id, ref: `${request.project.projectKey}.md`, title: "r", estimatedTokens: 10 }];
    },
    retrieve: async (request, refs) => {
      consulted.add(`retrieve:${request.project.projectKey}`);
      return refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: `content of ${r.ref} for ${request.project.projectKey}`,
        retrievedAt: new Date().toISOString(),
      }));
    },
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T35: a granted provider is consulted only for its granted project; another project is denied and disclosed", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("grant") });
  engine.registerProvider(scopedProvider("scoped", ["alpha"], consulted));

  const alpha = await engine.selectCandidates({ request: baseRequest({ project: { projectKey: "alpha" } }) });
  assert.equal(alpha.items.length, 1, "granted project is served");
  assert.equal(alpha.deniedProviders.length, 0);

  const beta = await engine.selectCandidates({ request: baseRequest({ project: { projectKey: "beta" } }) });
  assert.equal(beta.items.length, 0, "ungranted project is never served");
  assert.equal(beta.deniedProviders.length, 1);
  assert.equal(beta.deniedProviders[0]!.providerId, "scoped");
  assert.equal(beta.deniedProviders[0]!.projectKey, "beta");
  assert.match(beta.deniedProviders[0]!.message, /not granted for project 'beta'/);
  assert.ok(!consulted.has("beta"), "discover must never even run for an ungranted project");
});

test("T35: cross-project retrieval happens ONLY via the request's explicit providerScopeOverrides policy", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("override") });
  engine.registerProvider(scopedProvider("scoped", ["alpha"], consulted));

  const overridden = await engine.selectCandidates({
    request: baseRequest({
      project: { projectKey: "beta" },
      providerScopeOverrides: [{ providerId: "scoped", projectKeys: ["beta"] }],
    }),
  });
  assert.equal(overridden.items.length, 1, "the explicit caller policy grants the cross-project access");
  assert.equal(overridden.deniedProviders.length, 0);
  assert.ok(consulted.has("beta"));
});

test("T35: the build path enforces the boundary — an explicit item for an ungranted project is excluded permission_denied", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("build-deny") });
  engine.registerProvider(scopedProvider("scoped", ["alpha"], consulted));

  const pack = await engine.buildPack({
    request: baseRequest({ project: { projectKey: "beta" } }),
    items: [
      { providerId: "scoped", ref: "secret.md" },
      { providerId: "unrestricted", ref: "x.md" },
    ],
    rankingVersion: "v1",
    creationReason: "t35",
    createdBy: { kind: "human", name: "kim" },
  });

  // 'unrestricted' is not registered — its exclusion is the pre-existing
  // provider_unavailable. The SCOPED provider's item is permission_denied.
  const denied = pack.exclusions.find((e) => e.providerId === "scoped");
  assert.equal(denied?.reason, "permission_denied");
  assert.match(denied?.message ?? "", /providerScopeOverrides/);
  assert.ok(!consulted.has("retrieve:beta"), "retrieve must never run for an ungranted project");
  assert.equal(pack.items.length, 0, "nothing from the ungranted provider may enter the pack");

  // The same item builds fine under the granted project.
  const granted = await engine.buildPack({
    request: baseRequest({ project: { projectKey: "alpha" } }),
    items: [{ providerId: "scoped", ref: "secret.md" }],
    rankingVersion: "v1",
    creationReason: "t35",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(granted.items.length, 1);
  assert.equal(granted.items[0]!.trustClass, "untrusted");
});

test("T35: an explicit override also unlocks the build path, and preview enforces the same rule", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("build-override") });
  engine.registerProvider(scopedProvider("scoped", ["alpha"], consulted));

  const withoutOverride = await engine.previewPack({
    request: baseRequest({ project: { projectKey: "beta" } }),
    items: [{ providerId: "scoped", ref: "x.md" }],
    rankingVersion: "v1",
    creationReason: "t35",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(withoutOverride.items.length, 0);

  const withOverride = await engine.previewPack({
    request: baseRequest({
      project: { projectKey: "beta" },
      providerScopeOverrides: [{ providerId: "scoped", projectKeys: ["beta"] }],
    }),
    items: [{ providerId: "scoped", ref: "x.md" }],
    rankingVersion: "v1",
    creationReason: "t35",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(withOverride.items.length, 1);
});

test("T35: unrestricted providers are unaffected (backward-compatible default)", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("unrestricted") });
  engine.registerProvider(scopedProvider("free", undefined, consulted));

  for (const projectKey of ["alpha", "beta", "gamma-1.x"]) {
    const result = await engine.selectCandidates({ request: baseRequest({ project: { projectKey } }) });
    assert.equal(result.items.length, 1, `unrestricted provider serves ${projectKey}`);
    assert.equal(result.deniedProviders.length, 0);
  }
});

test("T35: negative — override validation is bounded and typed", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ providerScopeOverrides: [{ providerId: "p", projectKeys: [] }] })),
    /non-empty array/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ providerScopeOverrides: [{ providerId: "p", projectKeys: ["../escape"] }] })),
    /must match/,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ providerScopeOverrides: [{ providerId: "p", projectKeys: ["a"] }, { providerId: "p", projectKeys: ["b"] }] })),
    /more than one entry for provider 'p'/,
  );
});

test("T35: the versioned dispatcher surfaces denial disclosure end-to-end", async () => {
  const consulted = new Set<string>();
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(scopedProvider("scoped", ["alpha"], consulted));
  const response = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.select",
    request: { request: baseRequest({ project: { projectKey: "beta" } }) },
  });
  assert.equal(response.ok, true);
  if (!response.ok) return;
  const result = response.result as { deniedProviders: Array<{ providerId: string; projectKey: string }>; items: unknown[] };
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.deniedProviders.map((d) => [d.providerId, d.projectKey]), [["scoped", "beta"]]);
});
