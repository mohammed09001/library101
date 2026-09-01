/**
 * CHILD LOOP 2 verification (Execution 05) — Task 14: Build Current
 * Session/Agent Context Provider. Proves: host-provided currentFile/
 * selection/taskDescription each surface as a candidate; "absence must not
 * break Context" (no sessionContext -> empty discover(), never a throw, and
 * healthCheck is unconditionally healthy); a stale/mismatched ref is
 * rejected rather than fabricated; and `validateContextRequest` (Task 2's
 * canonical owner) accepts/rejects sessionContext per contract 1.3.0.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { CurrentSessionContextProvider } from "../src/providers/currentSessionContextProvider.ts";
import { validateContextRequest } from "../src/engine/normalize.ts";
import { ValidationError } from "../src/contracts/errors.ts";
import { ProviderRegistry } from "../src/engine/registry.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.3.0",
    project: { projectKey: "demo" },
    taskText: "",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 8000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

test("T14: absence must not break Context — no sessionContext yields an empty discover(), not a throw", async () => {
  const provider = new CurrentSessionContextProvider();
  const refs = await provider.discover(baseRequest());
  assert.deepEqual(refs, []);
});

test("T14: healthCheck is unconditionally healthy — no external dependency exists to fail", async () => {
  const provider = new CurrentSessionContextProvider();
  const health = await provider.healthCheck();
  assert.deepEqual(health, { available: true, degraded: false });
});

test("T14: discover()/retrieve() surface a host-provided current file", async () => {
  const provider = new CurrentSessionContextProvider();
  const request = baseRequest({ sessionContext: { currentFile: { path: "src/foo.ts", language: "typescript" } } });
  const refs = await provider.discover(request);
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.title, "src/foo.ts");
  const [candidate] = await provider.retrieve(request, refs);
  assert.match(candidate!.content, /src\/foo\.ts/);
  assert.match(candidate!.content, /typescript/);
});

test("T14: discover()/retrieve() surface a host-provided selection, including shared text", async () => {
  const provider = new CurrentSessionContextProvider();
  const request = baseRequest({
    sessionContext: { selection: { path: "src/foo.ts", startLine: 10, endLine: 12, text: "const x = 1;" } },
  });
  const refs = await provider.discover(request);
  assert.equal(refs[0]!.title, "src/foo.ts:10-12");
  const [candidate] = await provider.retrieve(request, refs);
  assert.equal(candidate!.content, "const x = 1;");
});

test("T14: a selection without shared text produces a metadata-only description, not fabricated content", async () => {
  const provider = new CurrentSessionContextProvider();
  const request = baseRequest({ sessionContext: { selection: { path: "src/foo.ts", startLine: 5, endLine: 5 } } });
  const [ref] = await provider.discover(request);
  const [candidate] = await provider.retrieve(request, [ref!]);
  assert.match(candidate!.content, /text not shared by host/);
});

test("T14: discover()/retrieve() surface a host-provided task description verbatim", async () => {
  const provider = new CurrentSessionContextProvider();
  const request = baseRequest({ sessionContext: { taskDescription: "Refactor the auth middleware." } });
  const refs = await provider.discover(request);
  const [candidate] = await provider.retrieve(request, refs);
  assert.equal(candidate!.content, "Refactor the auth middleware.");
});

test("T14: sessionId alone (no file/selection/task) yields no candidates but is attached as sourceMetadata when something is present", async () => {
  const provider = new CurrentSessionContextProvider();
  const onlyIdRequest = baseRequest({ sessionContext: { sessionId: "sess_1" } });
  assert.deepEqual(await provider.discover(onlyIdRequest), []);

  const withFileRequest = baseRequest({
    sessionContext: { sessionId: "sess_1", currentFile: { path: "a.ts" } },
  });
  const refs = await provider.discover(withFileRequest);
  const [candidate] = await provider.retrieve(withFileRequest, refs);
  assert.deepEqual(candidate!.sourceMetadata, { sessionId: "sess_1" });
});

test("T14: negative — retrieve() rejects a ref that doesn't resolve against the given request's sessionContext", async () => {
  const provider = new CurrentSessionContextProvider();
  const requestWithFile = baseRequest({ sessionContext: { currentFile: { path: "a.ts" } } });
  const [ref] = await provider.discover(requestWithFile);
  const requestWithoutFile = baseRequest({ sessionContext: { taskDescription: "unrelated" } });
  await assert.rejects(
    () => provider.retrieve(requestWithoutFile, [ref!]),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T14: negative — retrieve() rejects an unrecognized ref", async () => {
  const provider = new CurrentSessionContextProvider();
  await assert.rejects(
    () =>
      provider.retrieve(baseRequest({ sessionContext: { taskDescription: "x" } }), [
        { providerId: "current_session", ref: "not_a_real_ref", title: "x", estimatedTokens: 1 },
      ]),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T14: registered in the Task 7 registry, discoverAll absorbs an empty sessionContext gracefully alongside other providers", async () => {
  const registry = new ProviderRegistry();
  registry.register(new CurrentSessionContextProvider());
  const result = await registry.discoverAll(baseRequest());
  assert.equal(result.degraded.length, 0);
  assert.deepEqual(result.results[0]!.refs, []);
});

test("T14 (Task 2 owner): validateContextRequest accepts a well-formed sessionContext", () => {
  const request = validateContextRequest({
    contractVersion: "1.3.0",
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 1000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    sessionContext: {
      currentFile: { path: "a.ts", language: "ts" },
      selection: { path: "a.ts", startLine: 1, endLine: 2 },
      taskDescription: "doing a thing",
      sessionId: "sess_1",
    },
  });
  assert.equal(request.sessionContext?.currentFile?.path, "a.ts");
});

test("T14 (Task 2 owner): negative — validateContextRequest rejects an unknown sessionContext field", () => {
  assert.throws(
    () =>
      validateContextRequest({
        contractVersion: "1.3.0",
        project: { projectKey: "demo" },
        taskText: "t",
        hostAgent: { kind: "human", name: "kim" },
        mode: "chat",
        budget: { maxTokens: 1000 },
        privacyPolicy: { maxPrivacyClass: "internal" },
        callerCapabilities: { actorKind: "human" },
        createdAt: "2026-08-30T00:00:00Z",
        sessionContext: { bogusField: true },
      }),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T14 (Task 2 owner): negative — validateContextRequest rejects selection.endLine < startLine", () => {
  assert.throws(
    () =>
      validateContextRequest({
        contractVersion: "1.3.0",
        project: { projectKey: "demo" },
        taskText: "t",
        hostAgent: { kind: "human", name: "kim" },
        mode: "chat",
        budget: { maxTokens: 1000 },
        privacyPolicy: { maxPrivacyClass: "internal" },
        callerCapabilities: { actorKind: "human" },
        createdAt: "2026-08-30T00:00:00Z",
        sessionContext: { selection: { path: "a.ts", startLine: 10, endLine: 5 } },
      }),
    (err: unknown) => err instanceof ValidationError,
  );
});
