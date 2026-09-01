/**
 * ContextPack schema and immutable build record (Task 5).
 *
 * A pack records selected items, ordering, source revisions, budget,
 * ranking version, provider versions, exclusions, hash and creation reason
 * so the same pack can be explained or reproduced. Once built, a pack's
 * content fields are never mutated — only lifecycle columns change:
 * `status`/`invalidatedAt`/`invalidatedReason`/`invalidatedBy` via
 * `context.invalidate`, `status`/(sweep) via the Task 23 expiry sweep, and
 * `promotedAt`/`promotedBy` via `context.promote` (all in
 * src/engine/packs.ts). This IS the immutability guarantee: content
 * columns are never touched by an UPDATE after INSERT (src/engine/store.ts).
 *
 * "Source revisions" are represented per-item via `contentHash` +
 * `retrievedAt` (content-addressed) rather than a separate parallel
 * structure — see docs/PACKS.md.
 */
import type { AgentIdentity, PrivacyClass, ProviderId, TokenBudget } from "./types.ts";
import type { RelevanceScore } from "./candidates.ts";

/**
 * A single caller-requested item for `context.build`/`context.preview`
 * (Task 5) — and, since Task 24, the recipe unit stored on a
 * `ContextDefinition` (src/contracts/definitions.ts). Lives here rather
 * than in `src/engine/packs.ts` (re-exported there for compatibility) so a
 * contracts-layer type can reference it without a contracts→engine import
 * (this repo's contracts layer never imports from engine — see
 * `RelevanceScore`'s identical placement reasoning above).
 */
export interface BuildPackItemInput {
  providerId: ProviderId;
  ref: string;
  /** Optional display title, e.g. carried over from a prior discover() call. */
  title?: string;
  /** Task 22: caller-supplied score breakdown (typically `context.select`'s per-item `score`), carried through onto the resulting `ContextPackItem`/`ContextPackExclusion` for explainability. Optional — hand-supplied item lists remain fully supported without it. */
  score?: RelevanceScore;
}

export interface ContextPackItem {
  candidateId: string;
  providerId: ProviderId;
  ref: string;
  /** Position in the final (privacy-filtered, deduplicated, pin/diversity-ordered) build order, 0-based. */
  order: number;
  /** What actually counted against `budget.maxTokens` — the full estimate, or (when `truncated`) the truncated amount. */
  estimatedTokens: number;
  /** Content-addressed source revision marker (SHA-256 of the normalized excerpt). */
  contentHash: string;
  retrievedAt: string;
  privacyClass: PrivacyClass;
  /** Verified (not estimated) UTF-8 byte length of what was actually accounted (Task 19) — the full excerpt, or the truncated slice when `truncated`. */
  actualBytes: number;
  /** True when this item's accounted size was deterministically truncated to fit the remaining budget (Task 19) rather than fully included. */
  truncated: boolean;
  /** Present only when `truncated`: the item's full, untruncated `estimatedTokens` before truncation. */
  fullEstimatedTokens?: number;
  /** Task 33: how many source-field-policy redactions were applied to this item's material before normalization. Absent when zero — content identity already reflects the filtered material (`contentHash` hashes the redacted excerpt); this is explainability metadata, excluded from `packHash`. */
  redactionCount?: number;
  /**
   * Task 34 (contract 1.14.0, additive): prompt-injection isolation label.
   * EVERY item derived from provider material is untrusted external data
   * (OWASP GenAI LLM01 mitigation #6: "segregate and clearly denote
   * untrusted content") — the stamp is the machine-readable contract a host
   * agent uses to frame pack material as data, never as instructions to
   * itself. Absent on pre-1.14.0 rows; never anything but "untrusted" —
   * no provider can earn a trusted label.
   */
  trustClass?: "untrusted";
  /** Task 22: caller-supplied score breakdown (typically from `context.select`), carried through verbatim for explainability. Present only when the caller supplied one — hand-built item lists remain fully supported without it. Excluded from `packHash` (docs/PACKS.md): a candidate's score can drift between two otherwise-identical `select` calls, so including it would break reproducibility. */
  score?: RelevanceScore;
}

export type ContextPackExclusionReason =
  | "budget_exceeded"
  | "provider_unavailable"
  | "caller_excluded"
  | "duplicate_content"
  | "privacy_violation"
  /** Task 35: the provider's declared grant does not cover this request's project and no explicit providerScopeOverrides policy extended it. */
  | "permission_denied"
  | (string & {});

export interface ContextPackExclusion {
  providerId: ProviderId;
  ref: string;
  candidateId?: string;
  reason: ContextPackExclusionReason;
  message?: string;
  /** Task 22: same caller-supplied score breakdown as `ContextPackItem.score`, when the caller provided one for this ref. */
  score?: RelevanceScore;
}

/** Task 23: `"expired"` is a status-column-only transition, same non-destructive discipline as `"invalidated"` — a swept pack's content columns are never touched. */
export type ContextPackStatus = "active" | "invalidated" | "expired";

export interface ContextPack {
  packId: string;
  contractVersion: string;
  requestId?: string;
  idempotencyKey?: string;
  projectKey: string;
  /** Selected items, in build order (Task 5 "ordering"). */
  items: ContextPackItem[];
  budget: TokenBudget;
  totalEstimatedTokens: number;
  /** Caller-supplied label for whatever produced the item ordering (no ranking algorithm exists yet). */
  rankingVersion: string;
  providerVersions: Record<ProviderId, string>;
  exclusions: ContextPackExclusion[];
  creationReason: string;
  /** SHA-256 over the canonical, content-addressed pack shape (docs/PACKS.md). Excludes `mode`/`expiresAt`/`promotedAt`/`promotedBy` — lifecycle metadata, not build content. */
  packHash: string;
  createdAt: string;
  createdBy: AgentIdentity;
  /**
   * Task 31 (contract 1.11.0, additive): the host/worker agent identities
   * this pack was built FOR, captured from the build request. Provenance
   * metadata — deliberately EXCLUDED from `packHash` (like `createdBy`):
   * content identity must stay agent-independent so the same task context
   * requested by different agents produces the same hash and can be shared
   * via `getByHash`/`dedupeByHash`. `hostAgent` is non-null on every pack
   * built since 1.11.0 (`ContextRequest.hostAgent` is required);
   * `workerAgent` is null when the request declared none. Null on
   * pre-1.11.0 rows: their host/worker provenance was never recorded.
   */
  hostAgent: AgentIdentity | null;
  workerAgent: AgentIdentity | null;
  status: ContextPackStatus;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
  invalidatedBy: AgentIdentity | null;
  /** Task 23: `"attach"` packs are session/task-scoped and expire (docs/PACKS.md); `"sync"` (default) behaves exactly as every pack did before Execution 09 — permanent until explicitly invalidated. */
  mode: "attach" | "sync";
  /** Task 23: set only when `mode === "attach"`; null for `"sync"` packs. */
  expiresAt: string | null;
  /** Task 23: set only via `context.promote` — exempts an attach-mode pack from expiry sweeps, the honest, testable half of "unless Projection is explicitly invoked" (Project_Projection does not exist yet — docs/BOUNDARY.md). */
  promotedAt: string | null;
  promotedBy: AgentIdentity | null;
}

export interface PackAttachment {
  attachmentId: string;
  packId: string;
  target: AgentIdentity;
  note?: string;
  attachedAt: string;
}

/**
 * Task 29: bounded listing shape for `context.list` — lifecycle/metadata
 * columns only, never `items`/`exclusions` (potentially unbounded; fetch
 * those via `context.get`/`context.explain` for a specific pack). Derived
 * from the same canonical rows; not a second store.
 */
export interface PackSummary {
  packId: string;
  contractVersion: string;
  projectKey: string;
  status: ContextPackStatus;
  mode: "attach" | "sync";
  itemCount: number;
  totalEstimatedTokens: number;
  rankingVersion: string;
  creationReason: string;
  packHash: string;
  createdAt: string;
}
