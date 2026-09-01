/**
 * Deterministic relevance baseline (Task 15) + repository-map graph
 * relevance integration (Task 16).
 *
 * Task 15's Task Source Requirement lists exactly five signals, in this
 * order, "before semantic methods": task term overlap, source authority,
 * path/component overlap, recency, and explicit user pins. This module
 * computes a deterministic composite score from those five — no embeddings,
 * no ML model, no external ranking service. Two of the five (term overlap,
 * recency) are already computed by Task 4's `normalizeCandidate()` as
 * `relevanceSignals.textMatchScore`/`.recencyScore` and reused here
 * verbatim, not recomputed (Anti-Accumulation Rule — one owner for each
 * signal). `authority` reuses Task 4's `authority.tier`. Path/component
 * overlap is genuinely new (no prior owner). Pins reuse
 * `ContextRequest.requiredSources`, a field Task 2 already validated and
 * explicitly reserved for "a future selection Task to honor"
 * (docs/SCHEMA.md) — this is that Task.
 *
 * Task 16 folds in a provider-supplied `relevanceHint` (e.g. repository_map's
 * PageRank centrality) as ONE MORE weighted signal, deliberately never
 * merged into `termOverlap` — "do not assume centrality equals relevance"
 * is enforced structurally: a candidate with high centrality but zero term
 * overlap gets a middling composite score, not a high one, because each
 * signal only contributes through its own fixed weight.
 *
 * Missing signals (e.g. no freshness window was requested, so recency is
 * undefined) are excluded from the weighted average rather than defaulted
 * to a fabricated neutral value — the composite is a weighted average of
 * whatever signals are actually available for a given candidate, not a sum
 * with invented placeholders for the rest.
 */
import type { ContextRequest } from "../contracts/types.ts";
import type { CandidateAuthorityTier, NormalizedContextCandidate, RelevanceScore } from "../contracts/candidates.ts";
import { isPinned } from "./pinning.ts";

/** Re-exported for existing consumers (`selector.ts`, tests) — the type itself now lives in `contracts/candidates.ts` (Task 22: it's part of a pack item's wire shape). */
export type { RelevanceScore };

/** Identifies this scoring formula (Task 16's "record algorithm/version" discipline extended to the baseline itself). Bump on any material weight/formula change. */
export const DETERMINISTIC_BASELINE_ALGORITHM = "deterministic_baseline_v1" as const;

export interface RelevanceWeights {
  termOverlap: number;
  authority: number;
  pathOverlap: number;
  recency: number;
  graphCentrality: number;
}

/** Documented, fixed weights — not learned, not tunable per-request (a deterministic baseline, per the Task Source Requirement). */
export const DEFAULT_WEIGHTS: RelevanceWeights = {
  termOverlap: 0.4,
  authority: 0.2,
  pathOverlap: 0.15,
  recency: 0.15,
  graphCentrality: 0.1,
};

const AUTHORITY_SCORE: Record<CandidateAuthorityTier, number> = {
  provider_verified: 1,
  provider_reported: 0.6,
  unattributed: 0.2,
};

function splitPathIntoTokens(ref: string): Set<string> {
  const withSpaces = ref.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const tokens = withSpaces.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return new Set(tokens);
}

function taskTextTokens(taskText: string): Set<string> {
  return new Set((taskText.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []) as string[]);
}

/** Bounded [0,1]: fraction of the request's task tokens found among the ref's path/identifier-boundary tokens. Undefined when either side has no tokens. */
export function scorePathOverlap(taskText: string, ref: string): number | undefined {
  const taskTokens = taskTextTokens(taskText);
  if (taskTokens.size === 0) return undefined;
  const pathTokens = splitPathIntoTokens(ref);
  if (pathTokens.size === 0) return undefined;
  let hits = 0;
  for (const t of taskTokens) if (pathTokens.has(t)) hits++;
  return Math.min(1, hits / taskTokens.size);
}

export function scoreCandidate(candidate: NormalizedContextCandidate, request: ContextRequest): RelevanceScore {
  const authority = AUTHORITY_SCORE[candidate.authority.tier];
  const termOverlap = candidate.relevanceSignals.textMatchScore;
  const recency = candidate.relevanceSignals.recencyScore;
  const pathOverlap = scorePathOverlap(request.taskText, candidate.ref);
  const graphCentrality = candidate.relevanceHint?.score;
  const pinned = isPinned(candidate, request.requiredSources);

  const components: Array<[number, number | undefined]> = [
    [DEFAULT_WEIGHTS.termOverlap, termOverlap],
    [DEFAULT_WEIGHTS.authority, authority],
    [DEFAULT_WEIGHTS.pathOverlap, pathOverlap],
    [DEFAULT_WEIGHTS.recency, recency],
    [DEFAULT_WEIGHTS.graphCentrality, graphCentrality],
  ];
  let weightSum = 0;
  let scoreSum = 0;
  for (const [weight, value] of components) {
    if (value === undefined) continue;
    weightSum += weight;
    scoreSum += weight * value;
  }
  const compositeScore = weightSum > 0 ? scoreSum / weightSum : 0;

  const score: RelevanceScore = { authority, pinned, compositeScore };
  if (termOverlap !== undefined) score.termOverlap = termOverlap;
  if (pathOverlap !== undefined) score.pathOverlap = pathOverlap;
  if (recency !== undefined) score.recency = recency;
  if (graphCentrality !== undefined) score.graphCentrality = graphCentrality;
  return score;
}

export interface RankedCandidate {
  candidate: NormalizedContextCandidate;
  score: RelevanceScore;
}

/**
 * Deterministic sort: pinned candidates first (score-ordered among
 * themselves), then everyone else by descending composite score, with a
 * stable final tiebreak on `ref` so output order never depends on input
 * array iteration order for equal-scoring candidates.
 */
export function rankCandidates(candidates: readonly NormalizedContextCandidate[], request: ContextRequest): RankedCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, request) }))
    .sort((a, b) => {
      if (a.score.pinned !== b.score.pinned) return a.score.pinned ? -1 : 1;
      if (b.score.compositeScore !== a.score.compositeScore) return b.score.compositeScore - a.score.compositeScore;
      return a.candidate.ref.localeCompare(b.candidate.ref);
    });
}
