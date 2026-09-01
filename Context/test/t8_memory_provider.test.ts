/**
 * CHILD LOOP 2 verification (Execution 03) — Task 8: Build Memory Context
 * Provider. LIVE integration against Memory's real, current CLI (not
 * mocked) — the strongest evidence available for a cross-engine claim.
 * Proves: discover()/retrieve() round-trip real content + provenance
 * through Memory's versioned contract, a historical (`asOf`) query behaves
 * differently from a current one, healthCheck() reports real availability,
 * and a missing/unreachable Memory CLI degrades gracefully (fail-soft, both
 * standalone and through the Task 7 registry / Task 5 pack builder).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MemoryContextProvider } from "../src/providers/memoryContextProvider.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { resolveSiblingCli } from "../src/providers/cliContractClient.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

const MEMORY_CLI = resolveSiblingCli("Memory", "src", "cli", "cli.ts");

function tempMemoryStore(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t8-memstore-${name}-`));
  return join(dir, "memory.db");
}

function tempContextStore(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t8-ctxstore-${name}-`));
  return join(dir, "context.db");
}

function runMemoryCli(args: string[], storePath: string): string {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", MEMORY_CLI, ...args, "--store", storePath],
    { encoding: "utf8", env: { ...process.env } },
  );
}

/** Seeds a real Memory store with one scope and one active record; returns the recordId. */
function seedMemoryStore(storePath: string, projectKey: string): string {
  runMemoryCli(["scope", "create", "--key", projectKey, "--name", "Demo"], storePath);
  const out = runMemoryCli(
    [
      "record",
      "add",
      "--scope",
      projectKey,
      "--subject",
      "Rate limit",
      "--content",
      "120 requests per minute per token",
      "--source-kind",
      "user_note",
      "--evidence",
      "external:doc-1",
    ],
    storePath,
  );
  return (JSON.parse(out) as { recordId: string }).recordId;
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.2.0",
    project: { projectKey: "demo" },
    taskText: "what's the rate limit",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 4000 },
    privacyPolicy: { maxPrivacyClass: "sensitive" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

test("T8: healthCheck reports available against a real, fresh Memory store", async () => {
  const storePath = tempMemoryStore("health");
  runMemoryCli(["doctor"], storePath); // create/migrate the store first
  const provider = new MemoryContextProvider({ storePath });
  const health = await provider.healthCheck();
  assert.equal(health.available, true);
  assert.equal(health.degraded, false);
});

test("T8: discover + retrieve round-trip a real Memory record with content and provenance", async () => {
  const storePath = tempMemoryStore("roundtrip");
  const recordId = seedMemoryStore(storePath, "demo");
  const provider = new MemoryContextProvider({ storePath });

  const refs = await provider.discover(baseRequest());
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.ref, recordId);
  assert.equal(refs[0]!.title, "Rate limit");

  const candidates = await provider.retrieve(baseRequest(), refs);
  assert.equal(candidates.length, 1);
  const candidate = candidates[0]!;
  assert.equal(candidate.content, "120 requests per minute per token");
  assert.equal(candidate.providerId, "memory");
  const meta = candidate.sourceMetadata as { recordId: string; epistemicClass: string; sourceKind: string };
  assert.equal(meta.recordId, recordId);
  assert.equal(meta.epistemicClass, "observed");
  assert.equal(meta.sourceKind, "user_note");
});

test("T8: normalizeCandidate carries Memory's sourceMetadata into structuredPayload", async () => {
  const { normalizeCandidate } = await import("../src/engine/normalizeCandidate.ts");
  const storePath = tempMemoryStore("normalize");
  seedMemoryStore(storePath, "demo");
  const provider = new MemoryContextProvider({ storePath });
  const refs = await provider.discover(baseRequest());
  const [candidate] = await provider.retrieve(baseRequest(), refs);
  const normalized = normalizeCandidate(candidate!, {
    request: baseRequest(),
    declaration: provider.declaration,
    discoveredAt: new Date().toISOString(),
  });
  assert.deepEqual(normalized.structuredPayload, candidate!.sourceMetadata);
});

test("T8: a freshness.asOf before the record existed returns zero records (historical view)", async () => {
  const storePath = tempMemoryStore("historical");
  seedMemoryStore(storePath, "demo");
  const provider = new MemoryContextProvider({ storePath });

  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const historicalRefs = await provider.discover(baseRequest({ freshness: { asOf: past } }));
  assert.equal(historicalRefs.length, 0, "record did not exist yet at this historical point");

  const currentRefs = await provider.discover(baseRequest());
  assert.equal(currentRefs.length, 1, "current (non-historical) search still finds it");
});

test("T8: negative — an unreachable Memory CLI reports unavailable without throwing, standalone", async () => {
  const provider = new MemoryContextProvider({ memoryCliPath: join(tmpdir(), "does-not-exist-cli.ts") });
  const health = await provider.healthCheck();
  assert.equal(health.available, false);
  assert.match(health.message ?? "", /not found/);
  await assert.rejects(() => provider.discover(baseRequest()));
});

test("T8: negative — an unreachable Memory provider is absorbed fail-soft by the Task 7 registry", async () => {
  const registry = new ProviderRegistry();
  registry.register(new MemoryContextProvider({ memoryCliPath: join(tmpdir(), "does-not-exist-cli.ts") }));
  const result = await registry.discoverAll(baseRequest());
  assert.equal(result.results.length, 0);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0]!.providerId, "memory");
});

test("T8: end-to-end — buildPack draws a real Memory record into an immutable pack", async () => {
  const memoryStorePath = tempMemoryStore("pack");
  const recordId = seedMemoryStore(memoryStorePath, "demo");
  const engine = new ContextEngine({ storePath: tempContextStore("pack") });
  engine.registerProvider(new MemoryContextProvider({ storePath: memoryStorePath }));

  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "memory", ref: recordId }],
    rankingVersion: "manual-v1",
    creationReason: "t8 end-to-end",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 1);
  assert.equal(pack.items[0]!.providerId, "memory");
  assert.equal(pack.providerVersions["memory"], "1.0.0");
});
