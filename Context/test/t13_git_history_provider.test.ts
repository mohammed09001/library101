/**
 * CHILD LOOP 1 verification (Execution 05) — Task 13: Build Git History
 * Context Provider. Uses a real, throwaway git repository created in a temp
 * directory (via the actual `git` executable — the same tool the provider
 * itself spawns) so this is genuine repository evidence, not a mock.
 * Proves: bounded recent-history discovery, taskText-driven `--grep`
 * relevance widening, retrieve() returning a real diff bounded by
 * maxPatchBytes, sha-format rejection (untrusted-ref defense), and graceful
 * degradation for an empty-history repo and a non-repo directory.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

import { GitHistoryContextProvider } from "../src/providers/gitHistoryContextProvider.ts";
import { ValidationError } from "../src/contracts/errors.ts";
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

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t13-repo-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "Test");
  writeFileSync(join(dir, "a.txt"), "one\n");
  git(dir, "add", "a.txt");
  git(dir, "commit", "-q", "-m", "add a.txt");
  writeFileSync(join(dir, "b.txt"), "two\n");
  git(dir, "add", "b.txt");
  git(dir, "commit", "-q", "-m", "fix widget rendering bug");
  writeFileSync(join(dir, "a.txt"), "one\nmore\n");
  git(dir, "add", "a.txt");
  git(dir, "commit", "-q", "-m", "update a.txt");
  return dir;
}

test("T13: discover() returns bounded recent commits, newest first", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir, maxCommits: 2 });
    const refs = await provider.discover(baseRequest());
    assert.equal(refs.length, 2, "bounded to maxCommits, not the whole 3-commit history");
    assert.equal(refs[0]!.title, "update a.txt", "most recent commit first");
    assert.match(refs[0]!.ref, /^[0-9a-f]{40}$/, "ref is a full commit sha");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: discover() widens with taskText-driven --grep relevance", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir, maxCommits: 1 });
    const refs = await provider.discover(baseRequest({ taskText: "why did the widget rendering break" }));
    assert.ok(
      refs.some((r) => r.title === "fix widget rendering bug"),
      "grep-matched commit is surfaced even though it isn't in the last maxCommits=1 by recency alone",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: retrieve() returns a real diff, bounded by maxPatchBytes", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir, maxPatchBytes: 40 });
    const refs = await provider.discover(baseRequest());
    const target = refs.find((r) => r.title === "update a.txt")!;
    const [candidate] = await provider.retrieve(baseRequest(), [target]);
    assert.ok(candidate);
    assert.ok(candidate!.content.length <= 40 + 60, "content is bounded near maxPatchBytes plus the truncation marker");
    assert.match(candidate!.content, /truncated/);
    const meta = candidate!.sourceMetadata as { sha: string; truncated: boolean };
    assert.equal(meta.truncated, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: retrieve() on an untruncated commit contains the actual patch content", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir });
    const refs = await provider.discover(baseRequest());
    const target = refs.find((r) => r.title === "add a.txt")!;
    const [candidate] = await provider.retrieve(baseRequest(), [target]);
    assert.match(candidate!.content, /a\.txt/);
    assert.match(candidate!.content, /\+one/, "the actual added line appears in the diff");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: negative — retrieve() rejects a non-sha ref (untrusted-ref defense)", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir });
    await assert.rejects(
      () =>
        provider.retrieve(baseRequest(), [
          { providerId: "git_history", ref: "--upload-pack=evil", title: "x", estimatedTokens: 1 },
        ]),
      (err: unknown) => err instanceof ValidationError,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: negative — retrieve() rejects an unknown-but-well-formed sha", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir });
    await assert.rejects(() =>
      provider.retrieve(baseRequest(), [
        { providerId: "git_history", ref: "0".repeat(40), title: "x", estimatedTokens: 1 },
      ]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: negative — an empty (zero-commit) repository degrades to an empty discover(), not a throw", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t13-empty-"));
  try {
    git(dir, "init", "-q", "-b", "main");
    const provider = new GitHistoryContextProvider({ root: dir });
    const health = await provider.healthCheck();
    assert.equal(health.available, true, "an empty repo is still a valid git working tree");
    const refs = await provider.discover(baseRequest());
    assert.deepEqual(refs, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: negative — healthCheck reports unavailable for a directory that is not a git working tree", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t13-notrepo-"));
  // git's own upward .git-discovery would otherwise find an ANCESTOR repo
  // (e.g. a dotfiles repo at $HOME) and report this bare temp dir as "inside
  // a work tree" too — a real environment dependency, not something this
  // provider should special-case. GIT_CEILING_DIRECTORIES makes the check
  // deterministic regardless of what the host's directory tree looks like.
  const prevCeiling = process.env["GIT_CEILING_DIRECTORIES"];
  process.env["GIT_CEILING_DIRECTORIES"] = dirname(dir);
  try {
    const provider = new GitHistoryContextProvider({ root: dir });
    const health = await provider.healthCheck();
    assert.equal(health.available, false);
    assert.equal(health.degraded, true);
  } finally {
    if (prevCeiling === undefined) delete process.env["GIT_CEILING_DIRECTORIES"];
    else process.env["GIT_CEILING_DIRECTORIES"] = prevCeiling;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T13: pathFilter bounds queries to specific paths", async () => {
  const dir = makeRepo();
  try {
    const provider = new GitHistoryContextProvider({ root: dir, pathFilter: ["b.txt"] });
    const refs = await provider.discover(baseRequest());
    assert.deepEqual(
      refs.map((r) => r.title),
      ["fix widget rendering bug"],
      "only the commit touching b.txt is returned",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
