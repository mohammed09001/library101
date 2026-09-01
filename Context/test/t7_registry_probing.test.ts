/**
 * CHILD LOOP 1 verification (Execution 03) — Task 7: Build provider
 * registry and capability probing. Proves: probe/probeAll/listByCapability,
 * discoverAll skips discover() entirely for an unavailable provider (never
 * calls it) while still returning a healthy provider's results, a
 * deprecated-but-healthy provider is attempted and surfaces as a warning
 * (not an error), and doctor()/context.health reflects providerProbes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t7-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.2.0",
    project: { projectKey: "library101" },
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

function makeProvider(
  id: string,
  opts: {
    capabilities?: string[];
    health?: { available: boolean; degraded: boolean; message?: string };
    healthThrows?: boolean;
    deprecated?: string;
  } = {},
): ContextProvider & { discoverCalls: number } {
  const provider = {
    discoverCalls: 0,
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: opts.capabilities ?? ["file_content"],
      cost: { relativeCost: "low" as const },
      freshness: { kind: "static" as const },
      privacy: { maxPrivacyClass: "public" as const },
      ...(opts.deprecated !== undefined ? { deprecated: { message: opts.deprecated } } : {}),
    },
    discover: async () => {
      provider.discoverCalls++;
      return [{ providerId: id, ref: "x", title: "x", estimatedTokens: 1 }];
    },
    retrieve: async () => [],
    healthCheck: async () => {
      if (opts.healthThrows) throw new Error(`${id} healthCheck exploded`);
      return opts.health ?? { available: true, degraded: false };
    },
  };
  return provider;
}

test("T7: probe reports health, deprecation, and never throws even when healthCheck throws", async () => {
  const registry = new ProviderRegistry();
  registry.register(makeProvider("healthy"));
  registry.register(makeProvider("unhealthy", { health: { available: false, degraded: true, message: "down" } }));
  registry.register(makeProvider("exploder", { healthThrows: true }));
  registry.register(makeProvider("old", { deprecated: "use 'newer' instead" }));

  const healthy = await registry.probe("healthy");
  assert.equal(healthy.available, true);
  assert.equal(healthy.deprecated, false);

  const unhealthy = await registry.probe("unhealthy");
  assert.equal(unhealthy.available, false);
  assert.equal(unhealthy.message, "down");

  const exploded = await registry.probe("exploder");
  assert.equal(exploded.available, false);
  assert.equal(exploded.degraded, true);
  assert.match(exploded.message ?? "", /exploded/);

  const old = await registry.probe("old");
  assert.equal(old.deprecated, true);
  assert.equal(old.deprecationMessage, "use 'newer' instead");
});

test("T7: probeAll covers every registered provider", async () => {
  const registry = new ProviderRegistry();
  registry.register(makeProvider("a"));
  registry.register(makeProvider("b"));
  const results = await registry.probeAll();
  assert.deepEqual(results.map((r) => r.providerId).sort(), ["a", "b"]);
});

test("T7: listByCapability filters by declared capability", () => {
  const registry = new ProviderRegistry();
  registry.register(makeProvider("files", { capabilities: ["file_content"] }));
  registry.register(makeProvider("mem", { capabilities: ["memory_records"] }));
  const fileProviders = registry.listByCapability("file_content");
  assert.deepEqual(fileProviders.map((d) => d.id), ["files"]);
});

test("T7: discoverAll never calls discover() on an unavailable provider, but still returns a healthy one's results", async () => {
  const registry = new ProviderRegistry();
  const down = makeProvider("down", { health: { available: false, degraded: true, message: "offline" } });
  const up = makeProvider("up");
  registry.register(down);
  registry.register(up);

  const result = await registry.discoverAll(baseRequest());
  assert.equal(down.discoverCalls, 0, "discover() must never be called on an unavailable provider");
  assert.equal(up.discoverCalls, 1);
  assert.deepEqual(result.results.map((r) => r.providerId), ["up"]);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0]!.providerId, "down");
  assert.equal(result.degraded[0]!.message, "offline");
});

test("T7: discoverAll attempts a deprecated-but-healthy provider and surfaces a warning, not an error", async () => {
  const registry = new ProviderRegistry();
  const old = makeProvider("old", { deprecated: "superseded by 'new_provider'" });
  registry.register(old);

  const result = await registry.discoverAll(baseRequest());
  assert.equal(old.discoverCalls, 1, "deprecated-but-healthy providers are still consulted");
  assert.equal(result.results.length, 1);
  assert.equal(result.degraded.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]!.providerId, "old");
  assert.equal(result.warnings[0]!.message, "superseded by 'new_provider'");
});

test("T7: doctor()/context.health reflects providerProbes", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("doctor") });
  engine.registerProvider(makeProvider("good"));
  engine.registerProvider(makeProvider("bad", { health: { available: false, degraded: true, message: "nope" } }));
  const report = await engine.doctor();
  assert.equal(report.providerProbes.length, 2);
  const bad = report.providerProbes.find((p) => p.providerId === "bad");
  assert.equal(bad?.available, false);
  assert.equal(bad?.message, "nope");
  assert.deepEqual(report.degradedProviders, ["bad"], "degradedProviders stays derived from providerProbes");
});
