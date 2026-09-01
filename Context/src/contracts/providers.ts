/**
 * Context Provider contract (Task 3).
 *
 * A provider-neutral interface for discovery/retrieval from Memory, Studies,
 * Performance, repository maps, project files, Git history, and future
 * providers. Providers declare capabilities, cost, freshness and privacy
 * needs up front so the (future) selector can budget/filter without calling
 * every provider blind.
 *
 * Adapted from continuedev/continue's `IContextProvider` (core/index.d.ts,
 * main branch): the discover/retrieve split mirrors its
 * `loadSubmenuItems` (lightweight) / `getContextItems` (full) methods, and
 * `deprecated` mirrors its `deprecationMessage`. REJECTED: continue's
 * `ContextProviderName` is a closed, hand-maintained string-literal union of
 * ~25 built-ins — Library needs an open id space for "future providers"
 * without a breaking change (see `ProviderId` in contracts/types.ts).
 * `cost`/`freshness`/`privacy` declarations and `healthCheck` do not exist
 * upstream at all; they are Library-specific additions required by the
 * Engine Isolation Invariants (explicit failure/degraded behavior).
 *
 * Task 7 re-inspected continue's registration path
 * (`core/context/providers/index.ts`, main branch): a static compiled-in
 * `Providers` array looked up by `.find()`, with deprecation meaning the
 * class is simply omitted from the array — no health-check, try/catch, or
 * availability-probing anywhere. REJECTED (Library needs dynamic,
 * host-registered providers, including subprocess-backed ones, not a
 * compiled-in list) and REJECTED deprecate-by-omission (kept `deprecated`
 * runtime-visible instead). `ProviderProbeResult`/`probe`/`probeAll` below
 * have no upstream precedent — Library-original.
 */
import type { ContextRequest, PrivacyClass, ProviderId, ProviderProbeResult } from "./types.ts";

export type { ProviderProbeResult };

/**
 * What kind of material a provider can supply. Open-ended: a provider may
 * declare a capability not in this indicative list.
 */
export type ProviderCapability =
  | "file_content"
  | "search_results"
  | "git_history"
  | "memory_records"
  | "study_findings"
  | "performance_metrics"
  | "repository_map"
  | "session_state"
  | (string & {});

export interface ProviderCostHint {
  relativeCost: "low" | "medium" | "high";
  /** True when retrieval may cross a network/process boundary. */
  network?: boolean;
}

export interface ProviderFreshnessHint {
  /** "static": content rarely changes. "live": always current at call time.
   *  "periodic": refreshed on some cadence — see typicalAgeSeconds. */
  kind: "static" | "live" | "periodic";
  typicalAgeSeconds?: number;
}

export interface ProviderPrivacyHint {
  maxPrivacyClass: PrivacyClass;
  requiresAuthorization?: boolean;
}

export interface ProviderDeclaration {
  id: ProviderId;
  displayName: string;
  description: string;
  capabilities: ProviderCapability[];
  cost: ProviderCostHint;
  freshness: ProviderFreshnessHint;
  privacy: ProviderPrivacyHint;
  deprecated?: { message: string };
  /**
   * Optional provider implementation version, recorded verbatim into any
   * ContextPack built from this provider's material (Task 5's
   * "provider versions" reproducibility field). Added in contract 1.1.0 —
   * additive/optional, so 1.0.0-shaped declarations remain valid.
   */
  version?: string;
  /**
   * Task 35 (contract 1.14.0, additive): the ONLY project keys this
   * provider may serve. When present, the registry consults the provider
   * solely for requests whose `project.projectKey` is listed here (or
   * explicitly granted by the request's `providerScopeOverrides` policy —
   * cross-project retrieval requires that explicit caller policy, never
   * provider initiative). Absent = unrestricted (backward compatible;
   * request-scoped adapters like Memory, which derive the scope from the
   * request itself, need no fixed grant). Filesystem providers pair this
   * with their registered root + `fsPathGuard` containment.
   */
  grantedProjectKeys?: readonly string[];
}

/** Lightweight discovery result — no content yet (~continue's ContextSubmenuItem). */
export interface ContextCandidateRef {
  providerId: ProviderId;
  /** Stable reference meaningful to the owning provider (path, id, uri, ...). */
  ref: string;
  title: string;
  estimatedTokens: number;
}

/**
 * A provider-computed relevance-adjacent signal that is NOT the same thing
 * as task relevance (Task 16: "do not assume centrality equals relevance").
 * Kept structurally separate from `relevanceSignals.textMatchScore`
 * (candidates.ts) rather than merged into one number, so a consumer can
 * never accidentally treat "central in this provider's own structure" as
 * "relevant to this task" without an explicit, weighted combination step —
 * see `src/engine/relevance.ts`. `algorithm`/`algorithmVersion` record
 * exactly which computation produced `score` (the Task Source Requirement's
 * literal "record algorithm/version"), so a later change to the algorithm
 * is auditable rather than a silent behavior drift.
 */
export interface ProviderRelevanceHint {
  /** Provider-defined scale, documented per algorithm; RepositoryMapContextProvider's is [0,1]. */
  score: number;
  /** Stable identifier for the computation, e.g. "repo_map_pagerank". */
  algorithm: string;
  algorithmVersion: string;
  /** What this score does and does NOT mean — must state the "not relevance" caveat when applicable. */
  basis: string;
}

/** Full retrieval result — content populated (~continue's ContextItem). */
export interface ContextCandidate extends ContextCandidateRef {
  content: string;
  retrievedAt: string;
  /**
   * Provider-specific structured extras (e.g. Memory's provenance/
   * epistemicClass/confidence). Optional, additive (contract 1.2.0).
   * Consumed by `normalizeCandidate()` into `NormalizedContextCandidate.
   * structuredPayload` — see docs/CANDIDATES.md.
   */
  sourceMetadata?: unknown;
  /** Optional provider-computed relevance-adjacent signal (Task 16, contract 1.4.0, additive). */
  relevanceHint?: ProviderRelevanceHint;
}

export interface ProviderHealth {
  available: boolean;
  degraded: boolean;
  message?: string;
}

/**
 * A `ContextRequest` value narrowed to what a provider actually needs is
 * intentionally NOT modeled separately here — providers receive the same
 * `ContextRequest` the engine validated, so they can honor budget/freshness/
 * privacy/source filters themselves. Providers must never return material
 * that violates `request.privacyPolicy` or is excluded by
 * `forbiddenSources`; the registry does not currently re-filter provider
 * output (documented limitation, docs/CONTRACTS.md).
 */
export interface ContextProvider {
  readonly declaration: ProviderDeclaration;
  /** Cheap enumeration of candidate references; must not fetch full content. */
  discover(request: ContextRequest): Promise<ContextCandidateRef[]>;
  /** Fetch full content for a caller-selected subset of discovered refs. */
  retrieve(request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]>;
  /** Must never throw — reports its own availability. */
  healthCheck(): Promise<ProviderHealth>;
}
