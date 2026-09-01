/**
 * Pure graph-ranking core for the Repository Map Context Provider (Task 11).
 *
 * Research note (Aider-AI/aider, `aider/repomap.py`, `main` branch,
 * inspected 2026-08-30 — `RepoMap.get_ranked_tags()`):
 *
 * | Upstream element | Decision | Why |
 * |---|---|---|
 * | tree-sitter/ctags tag extraction | REJECT (as a dependency) | This repo declares zero runtime dependencies (README.md); tree-sitter is a native-binding dependency. ADAPTED as a regex-based heuristic in `repoMapExtract.ts` instead — a documented, bounded-language-coverage tradeoff, not full parsing. |
 * | `networkx.MultiDiGraph` + `nx.pagerank()` | REJECT (as a dependency) | Same zero-runtime-deps constraint. ADAPTED: a hand-rolled weighted directed graph + power-iteration PageRank below — the same algorithm, no library. |
 * | Edge weight: identifier length/case multipliers, underscore penalty, high-def-count penalty | DEFER | Real but secondary heuristics; the core ranking signal (cross-file reference graph + personalization) is preserved, these refinements are not — documented as a scoped simplification, not silently dropped. |
 * | Edge weight: `sqrt(num_refs)` damping so a very common identifier doesn't dominate | INTEGRATE | Directly prevents one heavily-referenced symbol from swamping the ranking; cheap to compute without a library. |
 * | Chat-file / mentioned-identifier boost (x50 / x10) feeding `personalization` | ADAPT | Context has no "active chat files" concept — the closest analogue is `ContextRequest.taskText`. A file/symbol whose name is textually mentioned in taskText receives boosted personalization mass instead. |
 * | Binary-search token-budget fitting (`get_ranked_tags_map_uncached`) | REJECT | Would duplicate Task 5's already-owned, already-implemented deterministic pack budget ceiling (docs/PACKS.md) — the Plan Challenge question "can one owner/abstraction be removed while preserving the goal" answers yes here. The provider instead orders `discover()` results by descending rank so budget trimming (existing or future) naturally keeps the highest-value entries first. |
 *
 * No dependency on `Aider-AI/aider` code was introduced — only the
 * algorithm's *shape* was studied; nothing was imported or vendored.
 */

/**
 * Stable identity for this ranking computation (Task 16: "record
 * algorithm/version"). Bump `REPO_MAP_RANK_ALGORITHM_VERSION` whenever the
 * scoring formula changes materially — consumers (e.g. `relevanceHint` on a
 * retrieved candidate, `src/engine/relevance.ts`) record this alongside the
 * numeric score so a later change to the algorithm is auditable rather than
 * a silent behavior drift.
 */
export const REPO_MAP_RANK_ALGORITHM = "repo_map_pagerank" as const;
export const REPO_MAP_RANK_ALGORITHM_VERSION = "1.0.0" as const;

export interface RankEdge {
  from: string;
  to: string;
  weight: number;
}

const DAMPING = 0.85;
const ITERATIONS = 40;

/**
 * Personalized PageRank over a weighted directed graph, computed by fixed-
 * iteration power method (no external library). `personalization` need not
 * sum to 1 — it is normalized internally; an all-zero personalization falls
 * back to uniform (every node equally likely to be the random-walk restart
 * target), matching `networkx.pagerank`'s default when no personalization is
 * given.
 *
 * Dangling nodes (no outgoing edges) redistribute their rank mass on every
 * iteration proportional to the personalization vector, the same handling
 * `networkx.pagerank` uses by default (`dangling=None` -> personalization).
 */
export function personalizedPageRank(
  nodes: readonly string[],
  edges: readonly RankEdge[],
  personalization: ReadonlyMap<string, number>,
): Map<string, number> {
  if (nodes.length === 0) return new Map();

  const outEdges = new Map<string, Map<string, number>>();
  const outWeightSum = new Map<string, number>();
  for (const n of nodes) {
    outEdges.set(n, new Map());
    outWeightSum.set(n, 0);
  }
  for (const e of edges) {
    if (!outEdges.has(e.from) || !outEdges.has(e.to) || e.weight <= 0) continue;
    if (e.from === e.to) continue; // self-loops add no cross-file ranking signal
    const m = outEdges.get(e.from)!;
    m.set(e.to, (m.get(e.to) ?? 0) + e.weight);
    outWeightSum.set(e.from, (outWeightSum.get(e.from) ?? 0) + e.weight);
  }

  // Reverse index: for each target, which sources point at it and with what weight.
  const inEdges = new Map<string, Array<{ from: string; weight: number }>>();
  for (const n of nodes) inEdges.set(n, []);
  for (const [from, targets] of outEdges) {
    for (const [to, weight] of targets) {
      inEdges.get(to)!.push({ from, weight });
    }
  }

  let personalTotal = 0;
  for (const n of nodes) personalTotal += Math.max(0, personalization.get(n) ?? 0);
  const uniform = 1 / nodes.length;
  const personal = new Map<string, number>();
  for (const n of nodes) {
    personal.set(n, personalTotal > 0 ? Math.max(0, personalization.get(n) ?? 0) / personalTotal : uniform);
  }

  let rank = new Map<string, number>(personal);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    let danglingMass = 0;
    for (const n of nodes) {
      if ((outWeightSum.get(n) ?? 0) === 0) danglingMass += rank.get(n) ?? 0;
    }
    const next = new Map<string, number>();
    for (const n of nodes) {
      let incoming = 0;
      for (const { from, weight } of inEdges.get(n) ?? []) {
        const denom = outWeightSum.get(from) ?? 0;
        if (denom > 0) incoming += ((rank.get(from) ?? 0) * weight) / denom;
      }
      const base = (personal.get(n) ?? uniform) * ((1 - DAMPING) + DAMPING * danglingMass);
      next.set(n, base + DAMPING * incoming);
    }
    // Renormalize each iteration for numerical stability (sum drift from
    // floating point accumulation over many iterations/nodes).
    let total = 0;
    for (const v of next.values()) total += v;
    if (total > 0) {
      for (const [k, v] of next) next.set(k, v / total);
    }
    rank = next;
  }

  return rank;
}
