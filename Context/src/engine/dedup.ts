/**
 * Cross-provider content deduplication (Task 17): detect overlapping content
 * from Memory/Studies/files/any provider, prefer canonical provenance, avoid
 * wasting budget on repeated text.
 *
 * Reuses Task 4's existing `dedupKeys[0]` (`content:<sha256-of-normalized-
 * excerpt>`) — content-addressed identity already computed by
 * `normalizeCandidate()` — rather than inventing a second content-identity
 * scheme (Anti-Accumulation Rule). "Overlapping content" here means
 * byte-identical normalized excerpts; near-duplicate/fuzzy overlap is out of
 * scope for a deterministic baseline (documented limitation below).
 *
 * "Prefer canonical provenance": canonical == higher `authority.tier`
 * (Task 4's existing three-tier vocabulary — `provider_verified` >
 * `provider_reported` > `unattributed`), the same authority signal
 * `relevance.ts` already scores with, not a second, unrelated priority
 * scheme. A tie within the same tier keeps whichever candidate was seen
 * first (stable, deterministic, order-preserving).
 *
 * This ONE function (`pickCanonical`) is the single source of truth for
 * "which duplicate wins" — used both by `deduplicateCandidates()` below
 * (the batch form, used by the selector, `src/engine/selector.ts`) and by
 * `src/engine/packs.ts`'s `computePack()` (a caller-supplied, already-
 * ordered stream) — one owner, two callers, not two implementations.
 */
import type { CandidateAuthorityTier, NormalizedContextCandidate } from "../contracts/candidates.ts";

const AUTHORITY_RANK: Record<CandidateAuthorityTier, number> = {
  provider_verified: 2,
  provider_reported: 1,
  unattributed: 0,
};

/** Returns whichever of `a`/`b` has the higher authority tier; `a` on a tie (stable, first-seen-favoring). */
export function pickCanonical(a: NormalizedContextCandidate, b: NormalizedContextCandidate): NormalizedContextCandidate {
  return AUTHORITY_RANK[b.authority.tier] > AUTHORITY_RANK[a.authority.tier] ? b : a;
}

export interface DedupExclusion {
  /** The candidate that was excluded in favor of a canonical duplicate. */
  candidate: NormalizedContextCandidate;
  keptCandidateId: string;
  keptProviderId: string;
  keptRef: string;
}

export interface DeduplicationResult {
  /** Surviving candidates, in first-seen content-key order (see module docstring on order semantics). */
  kept: NormalizedContextCandidate[];
  excluded: DedupExclusion[];
}

/**
 * Collapse a candidate list down to one candidate per distinct content key,
 * preferring the canonical (`pickCanonical`) one whenever a later candidate
 * shares content with an earlier one. A kept candidate's position in the
 * output reflects the FIRST occurrence of its content key — even when a
 * later, more-canonical candidate is the one whose fields actually survive
 * — so "the item stays where it was first mentioned, but the best-
 * provenance version of it is used."
 */
export function deduplicateCandidates(candidates: readonly NormalizedContextCandidate[]): DeduplicationResult {
  const byContentKey = new Map<string, NormalizedContextCandidate>();
  const firstSeenOrder: string[] = [];
  const excluded: DedupExclusion[] = [];

  for (const candidate of candidates) {
    const key = candidate.dedupKeys[0] ?? `ref:${candidate.providerId}:${candidate.ref}`;
    const existing = byContentKey.get(key);
    if (existing === undefined) {
      byContentKey.set(key, candidate);
      firstSeenOrder.push(key);
      continue;
    }
    const winner = pickCanonical(existing, candidate);
    const loser = winner === existing ? candidate : existing;
    if (winner !== existing) byContentKey.set(key, winner);
    excluded.push({
      candidate: loser,
      keptCandidateId: winner.candidateId,
      keptProviderId: winner.providerId,
      keptRef: winner.ref,
    });
  }

  const kept = firstSeenOrder.map((key) => byContentKey.get(key)!);
  return { kept, excluded };
}
