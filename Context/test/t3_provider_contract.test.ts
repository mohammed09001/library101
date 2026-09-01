/**
 * CHILD LOOP 3 verification — Task 3: Define the Context Provider contract.
 * Proves: registry register/list/get/duplicate-id/not-found behavior,
 * fail-soft discoverAll when one provider throws, and a real working
 * reference provider (ProjectFilesProvider) including a path-traversal
 * negative case.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ProviderRegistry } from "../src/engine/registry.ts";
import { ContextEngine } from "../src/engine/contextEngine.ts";
import { ProjectFilesProvider } from "../src/providers/projectFilesProvider.ts";
import { ValidationError, NotFoundError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.0.0",
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

function stubProvider(id: string, opts: { throwsOnDiscover?: boolean } = {}): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: [],
      cost: { relativeCost: "low" },
      freshness: { kind: "static" },
      privacy: { maxPrivacyClass: "public" },
    },
    discover: async () => {
      if (opts.throwsOnDiscover) throw new Error(`${id} is down`);
      return [{ providerId: id, ref: "x", title: "x", estimatedTokens: 1 }];
    },
    retrieve: async () => [],
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

test("T3: register/list/get round-trip", () => {
  const registry = new ProviderRegistry();
  registry.register(stubProvider("a"));
  registry.register(stubProvider("b"));
  assert.equal(registry.size(), 2);
  const ids = registry.list().map((d) => d.id).sort();
  assert.deepEqual(ids, ["a", "b"]);
  assert.equal(registry.get("a").declaration.id, "a");
});

test("T3: negative — duplicate provider id is rejected", () => {
  const registry = new ProviderRegistry();
  registry.register(stubProvider("a"));
  assert.throws(
    () => registry.register(stubProvider("a")),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T3: negative — unregistered provider id lookup throws CONTEXT_NOT_FOUND", () => {
  const registry = new ProviderRegistry();
  assert.throws(
    () => registry.get("missing"),
    (err: unknown) => err instanceof NotFoundError,
  );
});

test("T3: negative — malformed declaration is rejected at registration", () => {
  const registry = new ProviderRegistry();
  const bad = stubProvider("a") as unknown as { declaration: { capabilities: unknown } };
  bad.declaration.capabilities = "not-an-array";
  assert.throws(
    () => registry.register(bad as unknown as ContextProvider),
    (err: unknown) => err instanceof ValidationError,
  );
});

test("T3: discoverAll is fail-soft — one throwing provider degrades, others still return", async () => {
  const registry = new ProviderRegistry();
  registry.register(stubProvider("good"));
  registry.register(stubProvider("bad", { throwsOnDiscover: true }));
  const result = await registry.discoverAll(baseRequest());
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0]!.providerId, "good");
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0]!.providerId, "bad");
  assert.match(result.degraded[0]!.message, /is down/);
});

test("T3: discoverAll honors allowedProviders / forbiddenProviders filters", async () => {
  const registry = new ProviderRegistry();
  registry.register(stubProvider("a"));
  registry.register(stubProvider("b"));
  registry.register(stubProvider("c"));
  const result = await registry.discoverAll(
    baseRequest({ allowedProviders: ["a", "b"], forbiddenProviders: ["b"] }),
  );
  assert.deepEqual(result.results.map((r) => r.providerId), ["a"]);
});

test("T3: ContextEngine.doctor reports a mix of healthy and degraded providers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t3-doctor-"));
  const engine = new ContextEngine({ storePath: join(dir, "context.db") });
  engine.registerProvider(stubProvider("good"));
  engine.registerProvider({
    ...stubProvider("bad"),
    healthCheck: async () => ({ available: false, degraded: true, message: "unreachable" }),
  });
  const report = await engine.doctor();
  assert.equal(report.registeredProviders, 2);
  assert.deepEqual(report.degradedProviders, ["bad"]);
});

test("T3: ProjectFilesProvider discovers and retrieves real files under a bounded root", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t3-files-"));
  try {
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "a.md"), "hello world");
    writeFileSync(join(dir, "sub", "b.md"), "nested");
    writeFileSync(join(dir, "ignore.bin"), "binary-ish");
    const provider = new ProjectFilesProvider({ root: dir, extensions: [".md"] });
    const refs = await provider.discover(baseRequest());
    const relPaths = refs.map((r) => r.ref).sort();
    assert.deepEqual(relPaths, ["a.md", "sub/b.md"]);

    const candidates = await provider.retrieve(baseRequest(), refs);
    const byRef = new Map(candidates.map((c) => [c.ref, c.content]));
    assert.equal(byRef.get("a.md"), "hello world");
    assert.equal(byRef.get("sub/b.md"), "nested");

    const health = await provider.healthCheck();
    assert.equal(health.available, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T3: negative — ProjectFilesProvider.retrieve rejects a path-traversal ref", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t3-traversal-"));
  try {
    writeFileSync(join(dir, "inside.md"), "safe");
    const outsideDir = mkdtempSync(join(tmpdir(), "ctx-t3-outside-"));
    writeFileSync(join(outsideDir, "secret.md"), "should not be readable");
    const provider = new ProjectFilesProvider({ root: dir });
    await assert.rejects(
      () =>
        provider.retrieve(baseRequest(), [
          { providerId: "project_files", ref: "../" + outsideDir.split(/[\\/]/).pop() + "/secret.md", title: "x", estimatedTokens: 1 },
        ]),
      (err: unknown) => err instanceof ValidationError,
    );
    rmSync(outsideDir, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T12: ProjectFilesProvider honors the root's .gitignore in addition to the always-ignored directory set", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t12-gitignore-"));
  try {
    writeFileSync(join(dir, ".gitignore"), "# comment\nignored.md\nbuild/\n");
    writeFileSync(join(dir, "ignored.md"), "should not appear");
    writeFileSync(join(dir, "kept.md"), "should appear");
    mkdirSync(join(dir, "build"));
    writeFileSync(join(dir, "build", "artifact.md"), "should not appear either");
    const provider = new ProjectFilesProvider({ root: dir, extensions: [".md"] });
    const refs = await provider.discover(baseRequest());
    assert.deepEqual(refs.map((r) => r.ref).sort(), ["kept.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T12: negative — respectGitignore: false opts out of .gitignore filtering", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t12-gitignore-opt-out-"));
  try {
    writeFileSync(join(dir, ".gitignore"), "ignored.md\n");
    writeFileSync(join(dir, "ignored.md"), "would normally be filtered");
    const provider = new ProjectFilesProvider({ root: dir, extensions: [".md"], respectGitignore: false });
    const refs = await provider.discover(baseRequest());
    assert.deepEqual(refs.map((r) => r.ref), ["ignored.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T3: negative — ProjectFilesProvider healthCheck reports unavailable for a missing root", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t3-missing-"));
  rmSync(dir, { recursive: true, force: true });
  const provider = new ProjectFilesProvider({ root: dir });
  const health = await provider.healthCheck();
  assert.equal(health.available, false);
  assert.equal(health.degraded, true);
});
