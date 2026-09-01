/**
 * CHILD LOOP 3 verification (Execution 03) — Task 9: Build Study Context
 * Provider. `Study_Document`/`Study_Lineage_Versioning` are verified EMPTY
 * in this repository — there is no real Study engine to call. This is
 * proven honestly, two ways: (1) a fixture fake CLI proves the adapter's
 * request-building/response-parsing/mapping logic against the anticipated
 * `study.search`/`study.get` contract; (2) a test against the REAL,
 * currently-absent Study_Document path proves genuine graceful
 * unavailability (Task 7's "fail soft when unavailable") rather than a
 * fabricated success claim.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StudyContextProvider } from "../src/providers/studyContextProvider.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { resolveSiblingCli } from "../src/providers/cliContractClient.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

const REAL_STUDY_CLI = resolveSiblingCli("Study_Document", "src", "cli", "cli.ts");

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.2.0",
    project: { projectKey: "demo" },
    taskText: "what did the study find",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 4000 },
    privacyPolicy: { maxPrivacyClass: "sensitive" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

/**
 * Fixture fake CLI implementing the study.search/study.get shape
 * studyContextProvider.ts anticipates. Plain .mjs — no TypeScript needed —
 * `--experimental-strip-types` is harmless on a non-TS file.
 */
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
  if (operation === "study.search") {
    out({
      ok: true, contractVersion: "1.0.0", operation,
      result: { sections: [{ studyId: "std_1", version: 1, sectionRef: "intro", title: "Introduction", estimatedTokens: 42 }] },
    });
  }
  if (operation === "study.get") {
    out({
      ok: true, contractVersion: "1.0.0", operation,
      result: { studyId: request.studyId, version: request.version, sectionRef: request.sectionRef, title: "Introduction", content: "This study found X causes Y.", sourceRevision: "rev-abc123" },
    });
  }
  out({ ok: false, contractVersion: "1.0.0", operation, error: { code: "STUDY_UNKNOWN_OP", message: "unhandled op" } }, 1);
}
out({ error: { code: "USAGE", message: "bad args" } }, 2);
`;

function writeFixtureCli(): string {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t9-fixture-"));
  const path = join(dir, "fake-study-cli.mjs");
  writeFileSync(path, FIXTURE_CLI_SOURCE, "utf8");
  return path;
}

test("T9: against a fixture fake CLI — healthCheck, discover, and retrieve map the anticipated study.search/study.get contract", async () => {
  const provider = new StudyContextProvider({ studyCliPath: writeFixtureCli() });

  const health = await provider.healthCheck();
  assert.equal(health.available, true);

  const refs = await provider.discover(baseRequest());
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.title, "Introduction");
  assert.equal(refs[0]!.ref, "std_1::1::intro", "ref encodes studyId::version::sectionRef, not the whole study");

  const candidates = await provider.retrieve(baseRequest(), refs);
  assert.equal(candidates.length, 1);
  const candidate = candidates[0]!;
  assert.equal(candidate.content, "This study found X causes Y.");
  const meta = candidate.sourceMetadata as { studyId: string; sourceRevision: string };
  assert.equal(meta.studyId, "std_1");
  assert.equal(meta.sourceRevision, "rev-abc123", "source revision is surfaced, per the Task Source Requirement");
});

test("T9: negative — the real Study_Document path is verified absent in this repository", () => {
  // This assertion IS the evidence that Task 9's live-target claim is
  // honest rather than fabricated: the file genuinely does not exist here.
  assert.equal(existsSync(REAL_STUDY_CLI), false, `expected ${REAL_STUDY_CLI} to be absent`);
});

test("T9: against the real (absent) Study_Document — healthCheck reports unavailable without throwing", async () => {
  const provider = new StudyContextProvider({ studyCliPath: REAL_STUDY_CLI });
  const health = await provider.healthCheck();
  assert.equal(health.available, false);
  assert.match(health.message ?? "", /not found/);
  await assert.rejects(() => provider.discover(baseRequest()));
});

test("T9: negative — an unavailable Study provider is absorbed fail-soft by the Task 7 registry", async () => {
  const registry = new ProviderRegistry();
  registry.register(new StudyContextProvider({ studyCliPath: REAL_STUDY_CLI }));
  const result = await registry.discoverAll(baseRequest());
  assert.equal(result.results.length, 0);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0]!.providerId, "study_document");
});

test("T9: negative — buildPack excludes an unavailable Study item instead of failing the whole build", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t9-ctxstore-"));
  const engine = new ContextEngine({ storePath: join(dir, "context.db") });
  engine.registerProvider(new StudyContextProvider({ studyCliPath: REAL_STUDY_CLI }));
  const pack = await engine.buildPack({
    request: baseRequest(),
    items: [{ providerId: "study_document", ref: "std_1::1::intro" }],
    rankingVersion: "manual-v1",
    creationReason: "t9 fail-soft check",
    createdBy: { kind: "human", name: "kim" },
  });
  assert.equal(pack.items.length, 0);
  assert.equal(pack.exclusions.length, 1);
  assert.equal(pack.exclusions[0]!.reason, "provider_unavailable");
});
