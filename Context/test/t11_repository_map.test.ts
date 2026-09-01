/**
 * CHILD LOOP 2 verification (Execution 04) — Task 11: Build Repository Map
 * Context Provider. Proves: (1) the pure PageRank core ranks a chain's sink
 * highest, independent of any filesystem/extraction complexity; (2) the
 * provider ranks a file whose symbol is referenced from elsewhere above an
 * isolated file; (3) `taskText` mentions (the analogue of Aider's chat-file
 * personalization) shift that ranking; (4) retrieve() returns a signature
 * excerpt, never the raw file body ("concise ... rather than dumping
 * source" — the literal Task Source Requirement clause); (5) `.gitignore`
 * and path-traversal are honored; (6) an empty/no-symbol repo degrades
 * gracefully rather than throwing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RepositoryMapContextProvider } from "../src/providers/repositoryMapContextProvider.ts";
import { personalizedPageRank } from "../src/providers/repoMapRank.ts";
import { extractFile } from "../src/providers/repoMapExtract.ts";
import { ValidationError } from "../src/contracts/errors.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.2.0",
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

test("T11: pure PageRank core — a chain's sink outranks its predecessors (A->B->C)", () => {
  const rank = personalizedPageRank(
    ["A", "B", "C"],
    [
      { from: "A", to: "B", weight: 1 },
      { from: "B", to: "C", weight: 1 },
    ],
    new Map(),
  );
  assert.ok((rank.get("C") ?? 0) > (rank.get("B") ?? 0), "C (pointed to by B) should outrank B");
  assert.ok((rank.get("B") ?? 0) > (rank.get("A") ?? 0), "B (pointed to by A) should outrank A (pointed to by no one)");
});

test("T11: pure extractFile — recognizes exported TS declarations and reference identifiers", () => {
  const { defs, refs } = extractFile(
    "export function sharedHelper(x: number): number {\n  return x + 1;\n}\n",
    ".ts",
  );
  assert.equal(defs.length, 1);
  assert.equal(defs[0]!.name, "sharedHelper");
  assert.ok(refs.has("sharedHelper"));
});

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-repo-"));
  writeFileSync(
    join(dir, "a.ts"),
    "export function sharedHelper(x: number): number {\n  return x + 1;\n}\n",
  );
  writeFileSync(
    join(dir, "b.ts"),
    "import { sharedHelper } from './a';\nexport function callsShared(): number {\n  return sharedHelper(1);\n}\n",
  );
  writeFileSync(
    join(dir, "c.ts"),
    "export function unusedSymbol(): string {\n  const SECRET_BODY_MARKER = 'do-not-leak';\n  return SECRET_BODY_MARKER;\n}\n",
  );
  return dir;
}

test("T11: discover() ranks a referenced-from-elsewhere file above an isolated one, order stable by graph structure", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const refs = await provider.discover(baseRequest());
    const order = refs.map((r) => r.ref);
    assert.deepEqual(order, ["a.ts", "b.ts", "c.ts"], "a.ts (defines the symbol b.ts references) ranks first");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: taskText mentions shift ranking toward the file defining the mentioned symbol", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const refs = await provider.discover(baseRequest({ taskText: "please explain unusedSymbol behavior" }));
    assert.equal(refs[0]!.ref, "c.ts", "personalization from taskText mentioning unusedSymbol promotes c.ts to the top");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: retrieve() returns a concise signature excerpt, never the file's raw body", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const [candidate] = await provider.retrieve(baseRequest(), [
      { providerId: "repository_map", ref: "c.ts", title: "c.ts", estimatedTokens: 1 },
    ]);
    assert.ok(candidate);
    assert.match(candidate!.content, /unusedSymbol/, "the definition signature is present");
    assert.doesNotMatch(candidate!.content, /SECRET_BODY_MARKER|do-not-leak/, "function body text is not dumped");
    assert.ok(
      candidate!.content.length < 200,
      "a signature excerpt is far smaller than the raw file it summarizes",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: negative — retrieve() rejects a path-traversal ref", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-traversal-"));
  try {
    writeFileSync(join(dir, "inside.ts"), "export function ok() {}\n");
    const outsideDir = mkdtempSync(join(tmpdir(), "ctx-t11-outside-"));
    writeFileSync(join(outsideDir, "secret.ts"), "export function secret() {}\n");
    const provider = new RepositoryMapContextProvider({ root: dir });
    await assert.rejects(
      () =>
        provider.retrieve(baseRequest(), [
          { providerId: "repository_map", ref: "../" + outsideDir.split(/[\\/]/).pop() + "/secret.ts", title: "x", estimatedTokens: 1 },
        ]),
      (err: unknown) => err instanceof ValidationError,
    );
    rmSync(outsideDir, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: .gitignore is honored in addition to the always-ignored directory set", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-gitignore-"));
  try {
    writeFileSync(join(dir, ".gitignore"), "ignored.ts\n");
    writeFileSync(join(dir, "ignored.ts"), "export function shouldNotAppear() {}\n");
    writeFileSync(join(dir, "kept.ts"), "export function shouldAppear() {}\n");
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const refs = await provider.discover(baseRequest());
    assert.deepEqual(
      refs.map((r) => r.ref),
      ["kept.ts"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: negative — a repo with no recognized symbols still enumerates files instead of throwing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-empty-"));
  try {
    writeFileSync(join(dir, "data.json"), '{"k": "v"}\n');
    const provider = new RepositoryMapContextProvider({ root: dir });
    const refs = await provider.discover(baseRequest());
    assert.equal(refs.length, 1);
    assert.equal(refs[0]!.ref, "data.json");
    const [candidate] = await provider.retrieve(baseRequest(), refs);
    assert.match(candidate!.content, /no recognized symbols/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: negative — healthCheck reports unavailable for a missing root", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-missing-"));
  rmSync(dir, { recursive: true, force: true });
  const provider = new RepositoryMapContextProvider({ root: dir });
  const health = await provider.healthCheck();
  assert.equal(health.available, false);
  assert.equal(health.degraded, true);
});

test("T11: registered provider declares repository_map capability, discoverable via listByCapability", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t11-cap-"));
  try {
    const { ProviderRegistry } = await import("../src/engine/registry.ts");
    const registry = new ProviderRegistry();
    registry.register(new RepositoryMapContextProvider({ root: dir }));
    const declared = registry.listByCapability("repository_map");
    assert.equal(declared.length, 1);
    assert.equal(declared[0]!.id, "repository_map");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
