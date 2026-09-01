/**
 * CHILD LOOP 2 verification (Execution 06) — Task 16: Build repository-map
 * graph relevance. Proves: a retrieved repository_map candidate carries a
 * `relevanceHint` recording the algorithm name/version (the literal "record
 * algorithm/version" clause); `normalizeCandidate()` carries it through
 * unchanged; and — the literal "do not assume centrality equals relevance"
 * clause — a candidate with strong term overlap but low graph centrality
 * can still outrank one with high centrality but no term overlap, because
 * `relevance.ts` weights them as separate signals rather than substituting
 * one for the other.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RepositoryMapContextProvider } from "../src/providers/repositoryMapContextProvider.ts";
import { REPO_MAP_RANK_ALGORITHM, REPO_MAP_RANK_ALGORITHM_VERSION } from "../src/providers/repoMapRank.ts";
import { normalizeCandidate } from "../src/engine/normalizeCandidate.ts";
import { rankCandidates } from "../src/engine/relevance.ts";
import type { ContextRequest } from "../src/contracts/types.ts";

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: "1.4.0",
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

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "ctx-t16-repo-"));
  // a.ts: heavily referenced (high centrality), but its symbol name shares
  // no vocabulary with the taskText used below.
  writeFileSync(join(dir, "a.ts"), "export function zzzUtility(x: number): number {\n  return x + 1;\n}\n");
  writeFileSync(
    join(dir, "b.ts"),
    "import { zzzUtility } from './a';\nexport function callsA(): number { return zzzUtility(1); }\n",
  );
  writeFileSync(
    join(dir, "c.ts"),
    "import { zzzUtility } from './a';\nexport function alsoCallsA(): number { return zzzUtility(2); }\n",
  );
  // isolated.ts: zero centrality (nothing references it), but its symbol
  // name directly matches the task text used below.
  writeFileSync(join(dir, "isolated.ts"), "export function budgetCeilingEnforcement(): void {}\n");
  return dir;
}

test("T16: retrieve() attaches a relevanceHint recording algorithm name and version", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const refs = await provider.discover(baseRequest());
    const aRef = refs.find((r) => r.ref === "a.ts")!;
    const [candidate] = await provider.retrieve(baseRequest(), [aRef]);
    assert.ok(candidate!.relevanceHint, "a.ts is referenced by b.ts/c.ts so it has a nonzero rank and gets a hint");
    assert.equal(candidate!.relevanceHint!.algorithm, REPO_MAP_RANK_ALGORITHM);
    assert.equal(candidate!.relevanceHint!.algorithmVersion, REPO_MAP_RANK_ALGORITHM_VERSION);
    assert.match(candidate!.relevanceHint!.basis, /not a claim of task relevance/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T16: normalizeCandidate() carries relevanceHint through unchanged", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    const refs = await provider.discover(baseRequest());
    const aRef = refs.find((r) => r.ref === "a.ts")!;
    const [candidate] = await provider.retrieve(baseRequest(), [aRef]);
    const normalized = normalizeCandidate(candidate!, {
      request: baseRequest(),
      declaration: provider.declaration,
      discoveredAt: new Date().toISOString(),
    });
    assert.deepEqual(normalized.relevanceHint, candidate!.relevanceHint);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T16: do not assume centrality equals relevance — strong term overlap outranks high centrality alone", async () => {
  const dir = makeRepo();
  try {
    const provider = new RepositoryMapContextProvider({ root: dir, extensions: [".ts"] });
    // Natural-language phrasing deliberately, not the literal symbol name:
    // repoMap's OWN internal tokenizer (repositoryMapContextProvider.ts)
    // would otherwise treat an exact whole-token symbol-name match as
    // personalization input and inflate isolated.ts's OWN centrality score
    // too, confounding this test's point (that centrality and relevance are
    // independent signals). Multi-word phrasing only feeds
    // normalizeCandidate's separate substring-based textMatchScore.
    const request = baseRequest({ taskText: "please explain the budget ceiling enforcement logic" });
    const refs = await provider.discover(request);

    const aRef = refs.find((r) => r.ref === "a.ts")!; // high centrality, no term match
    const isolatedRef = refs.find((r) => r.ref === "isolated.ts")!; // zero centrality, strong term match

    const [aCandidate] = await provider.retrieve(request, [aRef]);
    const [isolatedCandidate] = await provider.retrieve(request, [isolatedRef]);

    const aNormalized = normalizeCandidate(aCandidate!, { request, declaration: provider.declaration, discoveredAt: new Date().toISOString() });
    const isolatedNormalized = normalizeCandidate(isolatedCandidate!, { request, declaration: provider.declaration, discoveredAt: new Date().toISOString() });

    // Sanity: a.ts really is more central than isolated.ts by this algorithm.
    assert.ok((aNormalized.relevanceHint?.score ?? 0) > (isolatedNormalized.relevanceHint?.score ?? 0));
    // Sanity: isolated.ts really does match the task text and a.ts does not.
    assert.ok((isolatedNormalized.relevanceSignals.textMatchScore ?? 0) > (aNormalized.relevanceSignals.textMatchScore ?? 0));

    const ranked = rankCandidates([aNormalized, isolatedNormalized], request);
    assert.equal(
      ranked[0]!.candidate.ref,
      "isolated.ts",
      "term overlap (weight 0.40) outweighs graph centrality alone (weight 0.10) — centrality never substitutes for relevance",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
