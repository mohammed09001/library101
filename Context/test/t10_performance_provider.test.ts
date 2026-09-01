/**
 * CHILD LOOP 1 verification (Execution 04) — Task 10: Build Performance
 * Context Provider. There is no `Performance` directory under `library101/`
 * at all (verified below) — genuinely absent, not merely an empty
 * placeholder. Proven honestly, two ways, mirroring Task 9's pattern: (1) a
 * fixture fake CLI proves the adapter's request-building/response-parsing
 * logic against the anticipated `performance.search`/`performance.get`
 * contract; (2) a test against the REAL, currently-absent Performance path
 * proves genuine graceful unavailability (Task 7's "fail soft when
 * unavailable"), and that buildPack absorbs it fail-soft.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PerformanceContextProvider } from "../src/providers/performanceContextProvider.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { resolveSiblingCli } from "../src/providers/cliContractClient.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

const REAL_PERFORMANCE_CLI = resolveSiblingCli("Performance", "src", "cli", "cli.ts");

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.2.0",
    project: { projectKey: "demo" },
    taskText: "what did previous runs teach us",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 4000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

const FIXTURE_CLI_SOURCE = `
function out(obj, code) {
  process.stdout.write(JSON.stringify(obj) + "\\n");
  process.exit(code ?? 0);
}
const args = process.argv.slice(2);
if (args[0] === "doctor") {
  out({ healthy: true, contractVersion: "1.0.0" });
}
if (args[0] === "contract" && args[1] === "call") {
  const operation = args[args.indexOf("--operation") + 1];
  const request = JSON.parse(args[args.indexOf("--request") + 1]);
  if (operation === "performance.search") {
    out({
      ok: true, contractVersion: "1.0.0", operation,
      result: { runs: [{ runId: "run_1", title: "2026-08-01 deploy", outcome: "failed", estimatedTokens: 30 }] },
    });
  }
  if (operation === "performance.get") {
    out({
      ok: true, contractVersion: "1.0.0", operation,
      result: {
        runId: request.runId, title: "2026-08-01 deploy", outcome: "failed",
        lessons: "The migration timed out because the batch size was too large.",
        metrics: { durationMs: 120000, errorCount: 3 },
        recordedAt: "2026-08-01T00:00:00Z",
      },
    });
  }
  out({ ok: false, contractVersion: "1.0.0", operation, error: { code: "PERF_UNKNOWN_OP", message: "unhandled op" } }, 1);
}
out({ error: { code: "USAGE", message: "bad args" } }, 2);
`;

function writeFixtureCli(): string {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t10-fixture-"));
  const path = join(dir, "fake-performance-cli.mjs");
  writeFileSync(path, FIXTURE_CLI_SOURCE, "utf8");
  return path;
}

test("T10: against a fixture fake CLI — healthCheck, discover, and retrieve map the anticipated performance.search/performance.get contract", async () => {
  const provider = new PerformanceContextProvider({ performanceCliPath: writeFixtureCli() });

  const health = await provider.healthCheck();
  assert.equal(health.available, true);

  const refs = await provider.discover(baseRequest());
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.ref, "run_1");
  assert.equal(refs[0]!.title, "2026-08-01 deploy");

  const candidates = await provider.retrieve(baseRequest(), refs);
  assert.equal(candidates.length, 1);
  const candidate = candidates[0]!;
  assert.match(candidate.content, /batch size was too large/, "the recorded lesson text is surfaced as content");
  const meta = candidate.sourceMetadata as { outcome: string; metrics: { errorCount: number } };
  assert.equal(meta.outcome, "failed");
  assert.equal(meta.metrics.errorCount, 3);
});

test("T10: negative — the real Performance engine is verified absent in this repository (not merely empty, genuinely missing)", () => {
  assert.equal(existsSync(REAL_PERFORMANCE_CLI), false, `expected ${REAL_PERFORMANCE_CLI} to be absent`);
});

test("T10: against the real (absent) Performance — healthCheck reports unavailable without throwing", async () => {
  const provider = new PerformanceContextProvider({ performanceCliPath: REAL_PERFORMANCE_CLI });
  const health = await provider.healthCheck();
  assert.equal(health.available, false);
  assert.match(health.message ?? "", /not found/);
  await assert.rejects(() => provider.discover(baseRequest()));
});

test("T10: negative — an unavailable Performance provider is absorbed fail-soft by the Task 7 registry", async () => {
  const registry = new ProviderRegistry();
  registry.register(new PerformanceContextProvider({ performanceCliPath: REAL_PERFORMANCE_CLI }));
  const result = await registry.discoverAll(baseRequest());
  assert.equal(result.results.length, 0);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0]!.providerId, "performance");
});

test("T10: negative — buildPack excludes an unavailable Performance item instead of failing the whole build", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t10-ctxstore-"));
  const engine = new ContextEngine({ storePath: join(dir, "context.db") });
  engine.registerProvider(new PerformanceContextProvider({ performanceCliPath: REAL_PERFORMANCE_CLI }));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "performance", ref: "run_1" }],
    rankingVersion: "manual-v1",
    creationReason: "t10 fail-soft check",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 0);
  assert.equal(pack.exclusions.length, 1);
  assert.equal(pack.exclusions[0]!.reason, "provider_unavailable");
});
