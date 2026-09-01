/**
 * Normalized ContextCandidate schema (Task 4).
 *
 * Raw `ContextCandidate` values returned by a provider's `retrieve()`
 * (contracts/providers.ts) are provider-shaped and minimal. Normalization
 * turns one into a `NormalizedContextCandidate`: a Context-owned identity,
 * computed relevance signals, a derived authority tier, an inherited
 * privacy ceiling, and stable dedup keys — the shared shape every future
 * pack-building step (Task 5) operates on regardless of which provider the
 * material came from.
 */
import type { PrivacyClass, ProviderId } from "./types.ts";
import type { ProviderRelevanceHint } from "./providers.ts";

export type { ProviderRelevanceHint };

export interface CandidateProvenance {
  /** When the reference was first enumerated by discover(). */
  discoveredAt: string;
  /** When retrieve() fetched the full content. */
  retrievedAt: string;
  /** How this candidate was obtained, e.g. "provider_retrieve". */
  method: string;
}

/**
 * Computed, not placeholder, signals: `textMatchScore` is a bounded
 * keyword-overlap between the request's taskText and the candidate content;
 * `recencyScore` is derived from the request's freshness window vs. the
 * candidate's retrieval time, when a window was requested.
 */
export interface RelevanceSignals {
  /** Bounded [0,1]. Undefined when taskText or content is empty. */
  textMatchScore?: number;
  /** Bounded [0,1]. Undefined when the request declared no freshness window. */
  recencyScore?: number;
}

export type CandidateAuthorityTier =
  | "provider_verified"
  | "provider_reported"
  | "unattributed";

export interface CandidateAuthority {
  tier: CandidateAuthorityTier;
  /** Human-readable basis for the tier, e.g. "provider declares live freshness". */
  basis: string;
}

/**
 * A candidate's relevance score breakdown (Task 15/16, computed in
 * `src/engine/relevance.ts::scoreCandidate`). Lives here, not in the engine
 * layer, because it is part of a pack item's wire shape once attached
 * (Task 22, `ContextPackItem.score`/`ContextPackExclusion.score`,
 * `src/contracts/packs.ts`) — the same reasoning that already puts the
 * computed `CandidateAuthority` here rather than in `engine/`.
 */
export interface RelevanceScore {
  termOverlap?: number;
  authority: number;
  pathOverlap?: number;
  recency?: number;
  /** Present only when the candidate carried a `relevanceHint` (Task 16). */
  graphCentrality?: number;
  /** True when the candidate's ref appears in `request.requiredSources` — sorts before every non-pinned candidate regardless of score. */
  pinned: boolean;
  /** Weighted average of the signals actually available for this candidate — see `engine/relevance.ts`. */
  compositeScore: number;
}

export interface NormalizedContextCandidate {
  candidateId: string;
  providerId: ProviderId;
  ref: string;
  title: string;
  /** Bounded, normalized text excerpt. */
  excerpt: string;
  /** Non-text structured material a provider may supply instead of/alongside excerpt. */
  structuredPayload?: unknown;
  provenance: CandidateProvenance;
  estimatedTokens: number;
  relevanceSignals: RelevanceSignals;
  authority: CandidateAuthority;
  /**
   * Inherited from the owning provider's declared privacy ceiling
   * (`ProviderDeclaration.privacy.maxPrivacyClass`) — NOT a per-item
   * classification. Documented limitation: no provider tags individual
   * candidates with their own privacy class yet.
   */
  privacyClass: PrivacyClass;
  /** SHA-256 of the normalized excerpt, hex-encoded. */
  contentHash: string;
  /** Stable keys for downstream de-duplication. */
  dedupKeys: string[];
  /** Carried through verbatim from the raw candidate, when the provider supplied one (Task 16). */
  relevanceHint?: ProviderRelevanceHint;
}
