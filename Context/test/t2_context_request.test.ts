/**
 * CHILD LOOP 2 verification — Task 2: Define ContextRequest and task intent
 * schema. Proves: a valid request normalizes cleanly, every required field
 * is enforced, budget/mode/provider-conflict boundary cases are rejected
 * with typed errors, unknown fields are rejected, and the CLI round-trips
 * a request end-to-end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateContextRequest } from "../src/engine/normalize.ts";
import { ValidationError } from "../src/contracts/errors.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(HERE, "..", "src", "cli", "cli.ts");

function baseRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contractVersion: "1.0.0",
    project: { projectKey: "library101" },
    taskText: "summarize recent changes",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 4000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

test("T2: a fully-formed request normalizes and round-trips key fields", () => {
  const request = validateContextRequest(baseRequest({ requestId: "req-1", workerAgent: { kind: "agent", name: "worker-a", agentType: "claude" } }));
  assert.equal(request.requestId, "req-1");
  assert.equal(request.project.projectKey, "library101");
  assert.equal(request.mode, "chat");
  assert.equal(request.budget.maxTokens, 4000);
  assert.equal(request.workerAgent?.agentType, "claude");
});

for (const field of ["contractVersion", "project", "taskText", "hostAgent", "mode", "budget", "privacyPolicy", "callerCapabilities", "createdAt"]) {
  test(`T2: negative — missing required field '${field}' fails with CONTEXT_VALIDATION_FAILED`, () => {
    const input = baseRequest();
    delete input[field];
    assert.throws(
      () => validateContextRequest(input),
      (err: unknown) => err instanceof ValidationError && err.code === "CONTEXT_VALIDATION_FAILED",
    );
  });
}

test("T2: negative — non-positive budget.maxTokens fails", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ budget: { maxTokens: 0 } })),
    (err: unknown) => err instanceof ValidationError,
  );
  assert.throws(
    () => validateContextRequest(baseRequest({ budget: { maxTokens: -5 } })),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: negative — unknown mode fails", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ mode: "bogus" })),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: negative — unknown top-level field is rejected", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ notARealField: true })),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: negative — a provider id in both allowedProviders and forbiddenProviders fails", () => {
  assert.throws(
    () =>
      validateContextRequest(
        baseRequest({ allowedProviders: ["memory", "project_files"], forbiddenProviders: ["memory"] }),
      ),
    (err: unknown) => err instanceof ValidationError && /allowedProviders\/forbiddenProviders/.test((err as Error).message),
  );
});

test("T2: negative — a source id in both requiredSources and forbiddenSources fails", () => {
  assert.throws(
    () =>
      validateContextRequest(
        baseRequest({ requiredSources: ["scope:library101"], forbiddenSources: ["scope:library101"] }),
      ),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: negative — malformed createdAt timestamp fails", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ createdAt: "not-a-date" })),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: privacyPolicy.maxPrivacyClass has no 'secret' tier — rejected outright", () => {
  assert.throws(
    () => validateContextRequest(baseRequest({ privacyPolicy: { maxPrivacyClass: "secret" } })),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T2: CLI request validate round-trips a valid request", () => {
  const requestJson = JSON.stringify(baseRequest());
  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", CLI_PATH, "request", "validate", "--request", requestJson],
    { encoding: "utf8", env: { ...process.env } },
  );
  const parsed = JSON.parse(stdout) as { request: { mode: string } };
  assert.equal(parsed.request.mode, "chat");
});

test("T2: CLI request validate exits 1 with a typed error envelope on invalid input", () => {
  let stdout = "";
  let status = 0;
  try {
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", CLI_PATH, "request", "validate", "--request", "{}"],
      { encoding: "utf8", env: { ...process.env } },
    );
  } catch (err) {
    const e = err as { status: number; stdout: string };
    status = e.status;
    stdout = e.stdout;
  }
  assert.equal(status, 1);
  const parsed = JSON.parse(stdout) as { error: { code: string } };
  assert.equal(parsed.error.code, "CONTEXT_VALIDATION_FAILED");
});
