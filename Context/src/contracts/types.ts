/**
 * Public value types shared across the Context Engine contract.
 *
 * The Context Engine is a selector/composer: it owns the ContextRequest
 * schema and the provider registry/capability contract. It does NOT own
 * Memory, Study, Performance or repository truth — those stay owned by
 * their source engines (docs/BOUNDARY.md). No type here may embed another
 * engine's private payload; cross-engine references stay by-reference only.
 */

/** Machine-readable failure codes surfaced by the engine and its CLI. */
export type ContextErrorCode =
  | "CONTEXT_VALIDATION_FAILED"
  | "CONTEXT_CONTRACT_MISMATCH"
  | "CONTEXT_PROVIDER_UNAVAILABLE"
  | "CONTEXT_PROVIDER_CONTRACT_VIOLATION"
  | "CONTEXT_PRIVACY_VIOLATION"
  | "CONTEXT_NOT_FOUND"
  | "CONTEXT_CONFLICT"
  | "CONTEXT_STORE_UNAVAILABLE"
  | "CONTEXT_MIGRATION_FAILED"
  | "CONTEXT_AUTO_CONTEXT_FORBIDDEN";

/** Agent-neutral actor. No agent product is hard-coded anywhere. */
export type ActorKind = "human" | "agent" | "engine" | "tool";

/**
 * Identity of the host agent (the surface the caller is running in) or the
 * worker agent (the bounded worker Context is assembling material for).
 * Same shape as sibling engines' actor types; defined independently here
 * because engines are separate packages with no shared workspace — light
 * duplication is intentional, not an oversight (see docs/BOUNDARY.md).
 */
export interface AgentIdentity {
  kind: ActorKind;
  /** Stable display name. Callers reuse the same name to preserve identity. */
  name: string;
  /** Free-form agent/tool family label when kind is "agent"/"tool". */
  agentType?: string;
}

/**
 * Desired mode of the task the caller is assembling context for. Bounded
 * for now; documented as extensible — a new mode is an additive contract
 * change (minor version bump), not a breaking one.
 */
export type TaskMode = "chat" | "edit" | "agent" | "review" | "plan" | "search";

export const TASK_MODES: readonly TaskMode[] = [
  "chat",
  "edit",
  "agent",
  "review",
  "plan",
  "search",
];

/** Token/byte ceiling the assembled context must respect. */
export interface TokenBudget {
  maxTokens: number;
  maxBytes?: number;
  /**
   * Tokens reserved off the top of `maxTokens` for the caller's own
   * surrounding prompt/system framing (Task 19, contract 1.5.0, additive) —
   * Context has no visibility into what that framing costs, so the caller
   * declares it; item budgeting operates against `maxTokens - reservedFramingTokens`.
   */
  reservedFramingTokens?: number;
}

/** How fresh returned material must be. */
export interface FreshnessWindow {
  /** Reject material older than this many seconds, when known. */
  maxAgeSeconds?: number;
  /** Historical query point — mirrors sibling engines' bi-temporal `asOf`. */
  asOf?: string;
}

/**
 * Privacy ceiling for material Context is allowed to surface. There is no
 * "secret" tier here (same discipline as Memory): secret-class material
 * belongs to the secure credential layer and must never reach a context
 * pack.
 */
export type PrivacyClass = "public" | "internal" | "sensitive";

export interface PrivacyPolicy {
  maxPrivacyClass: PrivacyClass;
  forbiddenTags?: string[];
}

/**
 * Task 33: a SOURCE-SPECIFIC FIELD policy — deterministic redaction applied
 * to one provider's candidates BEFORE normalization (so contentHash, dedup
 * keys, ranking signals, and budget accounting all see the filtered
 * material) and re-verified at the pack-finalization/serialization seam
 * (src/engine/contentPolicy.ts). Field redaction replaces a string value
 * with "[redacted]"; pattern redaction replaces every regex match within
 * `content`. Patterns are compiled at request validation — a policy that
 * cannot compile is a CONTEXT_VALIDATION_FAILED, never a runtime surprise.
 */
export interface SourceFieldPolicy {
  providerId: ProviderId;
  /** Dotted paths into the candidate: `title` or `sourceMetadata.<path...>`. (`content` is pattern-redacted, never wholesale dropped.) */
  redactedFields?: string[];
  /** Case-sensitive regular expressions; every match in `content` is replaced with "[redacted]". */
  redactPatterns?: string[];
}

/**
 * Task 35: an explicit, caller-declared grant EXTENDING a provider's
 * declared `grantedProjectKeys` for THIS request — the "explicit policy"
 * that cross-project retrieval requires. Never self-granted by a provider.
 */
export interface ProviderScopeOverride {
  providerId: ProviderId;
  /** Additional project keys the named provider may serve for this request. */
  projectKeys: string[];
}

/**
 * Open-ended provider identifier. NOT a closed enum: the task text and
 * docs/BOUNDARY.md both require room for "future providers" without a
 * breaking contract change. `KNOWN_PROVIDER_IDS` documents the recommended
 * set; unrecognized ids are accepted by validation (a provider being
 * *registered* is a separate, stricter check — see docs/CONTRACTS.md).
 */
export type ProviderId = string;

export const KNOWN_PROVIDER_IDS: readonly ProviderId[] = [
  "memory",
  "study_document",
  "study_lineage_versioning",
  "performance",
  "repository_search",
  "repository_sync",
  "repository_map",
  "project_files",
  "git_history",
  "current_session",
];

/** What the caller is structurally allowed/capable of. */
export interface CallerCapabilities {
  actorKind: ActorKind;
  agentType?: string;
  /** True when the caller may request context that could drive writes. */
  canWrite?: boolean;
}

/** A file the host reports as currently open/focused (Task 14). */
export interface SessionCurrentFile {
  path: string;
  language?: string;
}

/** A text selection the host reports, optionally including the selected text itself. */
export interface SessionSelection {
  path: string;
  startLine: number;
  endLine: number;
  /** Selected text, only when the host is willing to share it verbatim. */
  text?: string;
}

/**
 * Host-provided ambient session state (Task 14) — "what the host agent is
 * currently looking at," distinct from `taskText` (the caller's ask *to*
 * Context). Every field is optional and the whole object is optional:
 * Context has no other channel to observe live editor/session state (it is
 * backend/terminal-first, not IDE-resident), so this is the one place such
 * data can enter — see docs/SCHEMA.md and docs/CURRENT_SESSION.md.
 */
export interface SessionContext {
  currentFile?: SessionCurrentFile;
  selection?: SessionSelection;
  /** Host-local free text describing what it's currently doing, e.g. an IDE's own task/thread summary. */
  taskDescription?: string;
  sessionId?: string;
}

/**
 * The task-intent schema (Task 2): everything a caller must declare to ask
 * Context for a bounded, reproducible slice of task context.
 *
 * `allowedProviders` / `forbiddenProviders` gate whole providers (e.g. "do
 * not consult git_history at all"). `requiredSources` / `forbiddenSources`
 * gate specific references *within* an allowed provider (e.g. "must include
 * memory scope X" or "never include file path Y") — see docs/SCHEMA.md.
 */
export interface ContextRequest {
  /** Caller-supplied idempotency/tracing id; the engine never invents one. */
  requestId?: string;
  contractVersion: string;
  project: {
    /** Stable, path-independent project key (never a filesystem path). */
    projectKey: string;
  };
  taskText: string;
  hostAgent: AgentIdentity;
  workerAgent?: AgentIdentity;
  mode: TaskMode;
  budget: TokenBudget;
  allowedProviders?: ProviderId[];
  forbiddenProviders?: ProviderId[];
  freshness?: FreshnessWindow;
  privacyPolicy: PrivacyPolicy;
  requiredSources?: ProviderId[];
  forbiddenSources?: ProviderId[];
  callerCapabilities: CallerCapabilities;
  createdAt: string;
  /** Host-provided current file/selection/task/session metadata (Task 14). Absent when the host doesn't supply it. */
  sessionContext?: SessionContext;
  /** Task 33: source-specific field policies, applied before candidate normalization and re-verified before pack finalization. Absent when the caller declares none. */
  contentFieldPolicies?: SourceFieldPolicy[];
  /** Task 35: explicit cross-project grants for this request — the only way a provider serves a projectKey outside its declared `grantedProjectKeys`. Absent when no override is intended. */
  providerScopeOverrides?: ProviderScopeOverride[];
}

export interface EngineEvent {
  eventId: string;
  contractVersion: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

/**
 * Result of probing one registered provider (Task 7). `deprecated` mirrors
 * the provider's own declaration; `available`/`degraded`/`message` mirror
 * its `healthCheck()` result, or report `available: false` when
 * `healthCheck()` itself throws (probing never throws).
 */
export interface ProviderProbeResult {
  providerId: ProviderId;
  available: boolean;
  degraded: boolean;
  deprecated: boolean;
  deprecationMessage?: string;
  message?: string;
}

export interface DoctorReport {
  healthy: boolean;
  contractVersion: string;
  registeredProviders: number;
  /** Derived from providerProbes (kept for backward compatibility). */
  degradedProviders: string[];
  /** Full per-provider probe results (Task 7), additive since contract 1.2.0. */
  providerProbes: ProviderProbeResult[];
  /** Store-backed health (Task 6 `context.health`). */
  storePath: string;
  existed: boolean;
  journalMode: string | null;
  integrity: string | null;
  appliedMigrations: number[];
  eventCount: number;
  errorCode?: ContextErrorCode;
  errorMessage?: string;
}
