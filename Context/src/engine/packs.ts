/**
 * ContextPack build/preview/attach/invalidate/explain orchestration
 * (Task 5 + Task 6). Selection/ranking of WHICH items to request is out of
 * scope here (that's `src/engine/selector.ts`, Task 15/16 — the caller,
 * ideally `context.select`'s output, supplies the ordered item list). This
 * module's job is retrieval + normalization + privacy enforcement (Task 20)
 * + cross-provider deduplication (Task 17) + pin priority / diversity
 * ordering (Task 20/18) + deterministic, verified-byte budget-ceiling
 * enforcement with truncation (Task 19) + immutable recording.
 *
 * `computePack()` runs five passes over the caller-supplied item list, in
 * this order (each documented in more depth at its own pass below):
 *
 *   1. Retrieve + normalize (fail-soft, unchanged since Execution 02).
 *   2. Privacy ceiling enforcement (Task 20) — BEFORE dedup, so a privacy-
 *      excluded candidate can never win canonical selection over a
 *      compliant duplicate.
 *   3. Cross-provider content deduplication (Task 17).
 *   4. Pin priority + diversity ordering (Task 20 + Task 18) — pinned
 *      candidates first, then the rest interleaved across providers.
 *   5. Budget-ceiling enforcement: verified byte accounting, a caller-
 *      declared framing reservation, and deterministic truncation
 *      (Task 19) — still a strict prefix over this pass's final order.
 *
 * Task 17 note (a real, documented architecture tension, not silently
 * resolved): content-based deduplication must see every caller-supplied
 * item's retrieved content before budget can be finalized (a later
 * duplicate cannot be known to be free of budget cost until it's been
 * fetched and hashed) — so `computePack()` retrieves every item BEFORE
 * enforcing the budget ceiling, superseding Task 5's earlier "no further
 * provider calls once budget is exhausted" optimization. The
 * BUDGET-ORDERING GUARANTEE itself (a strict prefix over the final ordered
 * set) is unchanged and still fully tested (`test/t5_packs.test.ts`).
 */
import type { AgentIdentity, ContextRequest, ProviderId } from "../contracts/types.ts";
import type { ContextCandidateRef } from "../contracts/providers.ts";
import type {
  BuildPackItemInput,
  ContextPack,
  ContextPackExclusion,
  ContextPackItem,
  PackAttachment,
  PackSummary,
} from "../contracts/packs.ts";
import type { NormalizedContextCandidate, RelevanceScore } from "../contracts/candidates.ts";

/** Re-exported for existing consumers (dispatcher, tests) — the type itself now lives in `contracts/packs.ts` (Task 24: it's part of a `ContextDefinition`'s recipe shape too). */
export type { BuildPackItemInput };
import { ConflictError, NotFoundError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import { canonicalHashOf, newId } from "./ids.ts";
import { normalizeCandidate } from "./normalizeCandidate.ts";
import { applySourceFieldPolicy, isPolicyApplied, policiesForProvider } from "./contentPolicy.ts";
import { deduplicateCandidates } from "./dedup.ts";
import { isWithinPrivacyCeiling } from "./privacy.ts";
import { isPinned } from "./pinning.ts";
import { isProviderGranted } from "./registry.ts";
import { applyDiversityPolicy } from "./diversity.ts";
import type { ProviderRegistry } from "./registry.ts";
import type { ContextStore } from "./store.ts";

/** Small, fixed, documented per-item accounting overhead (Task 19: "reserve budget for ... framing") — e.g. a markdown header/separator wrapping each item in the caller's assembled context. Not tunable per-request: a per-item cost is inherent to composing multiple items, unlike the caller-declared `reservedFramingTokens` for the surrounding prompt as a whole. */
const PER_ITEM_FRAMING_TOKENS = 8;
/** Below this, a truncated remainder is not useful — exclude entirely instead (Task 19: "deterministic truncation policies"). */
const MIN_TRUNCATED_TOKENS = 20;
/** Task 23: default TTL for an `"attach"`-mode pack when the caller doesn't supply `ttlSeconds` — 24h, a conservative session/task-scoped default. */
export const DEFAULT_ATTACH_TTL_SECONDS = 86400;

export interface BuildPackInput {
  request: ContextRequest;
  items: BuildPackItemInput[];
  rankingVersion: string;
  creationReason: string;
  createdBy: AgentIdentity;
  requestId?: string;
  idempotencyKey?: string;
  /** Task 23: `"attach"` (session/task-scoped, expires) or `"sync"` (default — permanent, today's pre-Execution-09 behavior, unchanged). */
  mode?: "attach" | "sync";
  /** Task 23: only valid when `mode === "attach"`; defaults to `DEFAULT_ATTACH_TTL_SECONDS`. Rejected (`ValidationError`) when `mode` is `"sync"` or omitted. */
  ttlSeconds?: number;
  /** Task 26: when true, `buildPack` reuses an existing active pack with the same `packHash` AND `mode` instead of inserting a duplicate row. Default `false` — every pre-Execution-11 caller's behavior is unchanged. Does not skip retrieval (the hash is only knowable after it); this dedupes STORAGE, not retrieval cost. */
  dedupeByHash?: boolean;
}

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
}

/**
 * Shared computation for build and preview:
 *
 * 1. Retrieve + normalize every caller-ordered item (fail-soft: a missing
 *    provider or a `retrieve()` failure excludes only that one item).
 * 2. Cross-provider content deduplication (Task 17): a later item whose
 *    content is byte-identical to an earlier one is excluded before it can
 *    consume any budget, preferring canonical provenance (`dedup.ts`).
 * 3. Deterministic budget-ceiling enforcement as a strict prefix over the
 *    deduplicated set (Task 5, unchanged ordering semantics).
 *
 * Then computes the deterministic packHash. Does not touch the store.
 */
async function computePack(registry: ProviderRegistry, input: BuildPackInput): Promise<ContextPack> {
  requireNonEmpty(input.rankingVersion, "rankingVersion");
  requireNonEmpty(input.creationReason, "creationReason");
  if (!Array.isArray(input.items)) {
    throw new ValidationError("items must be an array");
  }

  // Task 23: resolve pack lifecycle mode. Default "sync" preserves every
  // pre-Execution-09 caller's behavior exactly (permanent, no expiry).
  const mode = input.mode ?? "sync";
  if (mode !== "attach" && mode !== "sync") {
    throw new ValidationError("mode must be 'attach' or 'sync'");
  }
  if (input.ttlSeconds !== undefined) {
    if (mode !== "attach") {
      throw new ValidationError("ttlSeconds is only valid when mode is 'attach'");
    }
    if (typeof input.ttlSeconds !== "number" || !Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
      throw new ValidationError("ttlSeconds must be a positive finite number");
    }
  }

  const exclusions: ContextPackExclusion[] = [];
  const providerVersionByCandidateId = new Map<string, string>();
  // Task 33: per-ref redaction count, keyed providerId:ref, carried onto
  // the resulting pack item for explainability (absent when zero).
  const redactionCountByKey = new Map<string, number>();
  // Task 22: caller-supplied score, keyed by providerId:ref so it can be
  // reattached to whichever pack item/exclusion this input item becomes.
  const scoreByKey = new Map<string, RelevanceScore>();
  for (const item of input.items) {
    if (item.score !== undefined) scoreByKey.set(`${item.providerId}:${item.ref}`, item.score);
  }
  const scoreFor = (providerId: ProviderId, ref: string): RelevanceScore | undefined =>
    scoreByKey.get(`${providerId}:${ref}`);
  // Spread this in, never assign `score: possiblyUndefined` directly — an
  // explicit `score: undefined` own-key differs from a genuinely absent key
  // under strict deepEqual/JSON round-trip (a pack fetched back from the
  // store never has the key at all, since JSON.stringify drops it).
  const scoreField = (score: RelevanceScore | undefined): { score: RelevanceScore } | Record<string, never> =>
    score !== undefined ? { score } : {};

  // Pass 1: resolve + retrieve + normalize, in caller order.
  const normalizedList: NormalizedContextCandidate[] = [];
  for (const item of input.items) {
    let provider;
    try {
      provider = registry.get(item.providerId);
    } catch {
      exclusions.push({
        providerId: item.providerId,
        ref: item.ref,
        reason: "provider_unavailable",
        message: `provider '${item.providerId}' is not registered`,
        ...scoreField(item.score),
      });
      continue;
    }

    // Task 35: the permission boundary — a provider whose declared grant
    // does not cover this request's project is never consulted, and the
    // caller sees exactly why (fail-soft exclusion, disclosed).
    if (!isProviderGranted(provider.declaration, input.request)) {
      exclusions.push({
        providerId: item.providerId,
        ref: item.ref,
        reason: "permission_denied",
        message: `provider '${item.providerId}' is not granted for project '${input.request.project.projectKey}'; cross-project retrieval requires an explicit providerScopeOverrides policy`,
        ...scoreField(item.score),
      });
      continue;
    }

    const candidateRef: ContextCandidateRef = {
      providerId: item.providerId,
      ref: item.ref,
      title: item.title ?? item.ref,
      estimatedTokens: 0,
    };
    let candidates;
    try {
      candidates = await provider.retrieve(input.request, [candidateRef]);
    } catch (err) {
      exclusions.push({
        providerId: item.providerId,
        ref: item.ref,
        reason: "provider_unavailable",
        message: err instanceof Error ? err.message : String(err),
        ...scoreField(item.score),
      });
      continue;
    }
    const candidate = candidates[0];
    if (candidate === undefined) {
      exclusions.push({
        providerId: item.providerId,
        ref: item.ref,
        reason: "provider_unavailable",
        message: "provider returned no candidate for this ref",
        ...scoreField(item.score),
      });
      continue;
    }

    // Task 33 seam 1: source-specific field policies applied BEFORE
    // normalization — hashes, dedup keys, signals, and budget all see the
    // filtered material.
    const policies = policiesForProvider(input.request, item.providerId);
    const { candidate: filtered, redactionCount } = applySourceFieldPolicy(candidate, policies);
    if (redactionCount > 0) redactionCountByKey.set(`${item.providerId}:${item.ref}`, redactionCount);

    const normalized = normalizeCandidate(filtered, {
      request: input.request,
      declaration: provider.declaration,
      discoveredAt: new Date().toISOString(),
    });
    normalizedList.push(normalized);
    providerVersionByCandidateId.set(normalized.candidateId, provider.declaration.version ?? "unversioned");
  }

  // Pass 2: privacy ceiling enforcement (Task 20) — before dedup, so a
  // privacy-excluded candidate never competes for canonical selection.
  const maxPrivacyClass = input.request.privacyPolicy.maxPrivacyClass;
  const privacyApproved: NormalizedContextCandidate[] = [];
  for (const normalized of normalizedList) {
    if (isWithinPrivacyCeiling(normalized, maxPrivacyClass)) {
      privacyApproved.push(normalized);
      continue;
    }
    exclusions.push({
      providerId: normalized.providerId,
      ref: normalized.ref,
      candidateId: normalized.candidateId,
      reason: "privacy_violation",
      message: `candidate privacyClass '${normalized.privacyClass}' exceeds request ceiling '${maxPrivacyClass}'`,
      ...scoreField(scoreFor(normalized.providerId, normalized.ref)),
    });
  }

  // Pass 3: cross-provider content deduplication (Task 17).
  const { kept, excluded: dupExclusions } = deduplicateCandidates(privacyApproved);
  for (const dup of dupExclusions) {
    exclusions.push({
      providerId: dup.candidate.providerId,
      ref: dup.candidate.ref,
      candidateId: dup.candidate.candidateId,
      reason: "duplicate_content",
      message: `duplicate content already included via ${dup.keptProviderId}:${dup.keptRef} (candidateId ${dup.keptCandidateId})`,
      ...scoreField(scoreFor(dup.candidate.providerId, dup.candidate.ref)),
    });
  }

  // Pass 4: pin priority (Task 20) + diversity ordering (Task 18). A pinned
  // candidate keeps its relative order among pins; the rest are round-robin
  // interleaved across providers so one provider can't monopolize the
  // budget-ordered sequence.
  const requiredSources = input.request.requiredSources;
  const pinnedCandidates = kept.filter((c) => isPinned(c, requiredSources));
  const nonPinnedCandidates = kept.filter((c) => !isPinned(c, requiredSources));
  const ordered = [...pinnedCandidates, ...applyDiversityPolicy(nonPinnedCandidates)];

  // Pass 5: deterministic, verified-byte budget-ceiling enforcement with
  // truncation (Task 19), strict prefix over `ordered`.
  const packItems: ContextPackItem[] = [];
  const providerVersions: Record<ProviderId, string> = {};
  const reservedFramingTokens = input.request.budget.reservedFramingTokens ?? 0;
  const effectiveMaxTokens = Math.max(0, input.request.budget.maxTokens - reservedFramingTokens);
  const maxBytes = input.request.budget.maxBytes;
  let runningTokens = 0;
  let runningBytes = 0;
  let budgetExhausted = false;

  for (const normalized of ordered) {
    // Task 33 seam 2: re-verify at the finalization/serialization seam.
    // Application is idempotent, so honestly-filtered material passes
    // cheaply; `false` means unfiltered content reached the seam (the
    // early application was bypassed somewhere) and must never be
    // serialized — exclude it audibly instead.
    const finalPolicies = policiesForProvider(input.request, normalized.providerId);
    if (!isPolicyApplied(normalized.excerpt, normalized.title, normalized.structuredPayload, finalPolicies)) {
      exclusions.push({
        providerId: normalized.providerId,
        ref: normalized.ref,
        candidateId: normalized.candidateId,
        reason: "privacy_violation",
        message: "source field policy not applied before serialization (engine invariant violation)",
      });
      budgetExhausted = true;
      continue;
    }
    if (budgetExhausted) {
      exclusions.push({
        providerId: normalized.providerId,
        ref: normalized.ref,
        candidateId: normalized.candidateId,
        reason: "budget_exceeded",
        ...scoreField(scoreFor(normalized.providerId, normalized.ref)),
      });
      continue;
    }

    const accountedTokens = normalized.estimatedTokens + PER_ITEM_FRAMING_TOKENS;
    const fullBytes = Buffer.byteLength(normalized.excerpt, "utf8");
    const tokenRemaining = effectiveMaxTokens - runningTokens;
    const byteRemaining = maxBytes !== undefined ? maxBytes - runningBytes : undefined;
    const fitsTokens = accountedTokens <= tokenRemaining;
    const fitsBytes = byteRemaining === undefined || fullBytes <= byteRemaining;

    if (fitsTokens && fitsBytes) {
      runningTokens += accountedTokens;
      if (byteRemaining !== undefined) runningBytes += fullBytes;
      const itemRedactions = redactionCountByKey.get(`${normalized.providerId}:${normalized.ref}`);
      packItems.push({
        candidateId: normalized.candidateId,
        providerId: normalized.providerId,
        ref: normalized.ref,
        order: packItems.length,
        estimatedTokens: accountedTokens,
        contentHash: normalized.contentHash,
        retrievedAt: normalized.provenance.retrievedAt,
        privacyClass: normalized.privacyClass,
        actualBytes: fullBytes,
        truncated: false,
        // Task 34: every provider-derived item is untrusted external data.
        trustClass: "untrusted",
        ...(itemRedactions !== undefined ? { redactionCount: itemRedactions } : {}),
        ...scoreField(scoreFor(normalized.providerId, normalized.ref)),
      });
      providerVersions[normalized.providerId] = providerVersionByCandidateId.get(normalized.candidateId) ?? "unversioned";
      continue;
    }

    // Doesn't fully fit. Deterministic truncation: only along the token
    // dimension — a byte-only overflow with token room to spare is excluded
    // outright (proportional cross-dimensional truncation is out of scope
    // for this deterministic baseline; docs/PACKS.md records this).
    const truncatedTokens = tokenRemaining - PER_ITEM_FRAMING_TOKENS;
    const canTruncate = fitsBytes && truncatedTokens >= MIN_TRUNCATED_TOKENS && truncatedTokens < normalized.estimatedTokens;
    if (canTruncate) {
      const sliceLen =
        normalized.estimatedTokens > 0
          ? Math.max(1, Math.floor((normalized.excerpt.length * truncatedTokens) / normalized.estimatedTokens))
          : 0;
      const truncatedBytes = Buffer.byteLength(normalized.excerpt.slice(0, sliceLen), "utf8");
      runningTokens += truncatedTokens + PER_ITEM_FRAMING_TOKENS;
      if (byteRemaining !== undefined) runningBytes += truncatedBytes;
      const itemRedactions = redactionCountByKey.get(`${normalized.providerId}:${normalized.ref}`);
      packItems.push({
        candidateId: normalized.candidateId,
        providerId: normalized.providerId,
        ref: normalized.ref,
        order: packItems.length,
        estimatedTokens: truncatedTokens + PER_ITEM_FRAMING_TOKENS,
        contentHash: normalized.contentHash,
        retrievedAt: normalized.provenance.retrievedAt,
        privacyClass: normalized.privacyClass,
        actualBytes: truncatedBytes,
        truncated: true,
        fullEstimatedTokens: normalized.estimatedTokens,
        // Task 34: every provider-derived item is untrusted external data.
        trustClass: "untrusted",
        ...(itemRedactions !== undefined ? { redactionCount: itemRedactions } : {}),
        ...scoreField(scoreFor(normalized.providerId, normalized.ref)),
      });
      providerVersions[normalized.providerId] = providerVersionByCandidateId.get(normalized.candidateId) ?? "unversioned";
      budgetExhausted = true;
      continue;
    }

    exclusions.push({
      providerId: normalized.providerId,
      ref: normalized.ref,
      candidateId: normalized.candidateId,
      reason: "budget_exceeded",
      ...scoreField(scoreFor(normalized.providerId, normalized.ref)),
    });
    budgetExhausted = true;
  }

  const packHash = canonicalHashOf({
    // candidateId is intentionally excluded: it is a fresh identity on every
    // normalization call, never a reproducible value (docs/PACKS.md). Only
    // providerId/ref/order/contentHash are deterministic for identical input.
    items: packItems.map((i) => ({ providerId: i.providerId, ref: i.ref, order: i.order, contentHash: i.contentHash })),
    budget: input.request.budget,
    rankingVersion: input.rankingVersion,
    providerVersions,
    exclusions: exclusions.map((e) => ({ providerId: e.providerId, ref: e.ref, reason: e.reason })),
    projectKey: input.request.project.projectKey,
    // Task 26: "cache by ... privacy policy" — normalized (forbiddenTags
    // sorted) so two logically-identical policies differing only in array
    // order don't spuriously miss the cache (canonicalJson sorts object
    // keys but not array elements, docs/PACKS.md).
    privacyPolicy: {
      maxPrivacyClass: input.request.privacyPolicy.maxPrivacyClass,
      forbiddenTags: [...(input.request.privacyPolicy.forbiddenTags ?? [])].sort(),
    },
    // Task 31 note: `hostAgent`/`workerAgent`/`createdBy` are deliberately
    // NOT hash inputs — content identity must stay agent-independent so the
    // same task context requested by different agents yields the same
    // packHash and can be shared via getByHash/dedupeByHash. They are
    // recorded on the pack as provenance metadata instead.
  });

  const createdAt = new Date().toISOString();
  const expiresAt =
    mode === "attach"
      ? new Date(Date.parse(createdAt) + (input.ttlSeconds ?? DEFAULT_ATTACH_TTL_SECONDS) * 1000).toISOString()
      : null;

  const pack: ContextPack = {
    packId: newId("pak"),
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    projectKey: input.request.project.projectKey,
    items: packItems,
    budget: input.request.budget,
    totalEstimatedTokens: runningTokens,
    rankingVersion: input.rankingVersion,
    providerVersions,
    exclusions,
    creationReason: input.creationReason,
    packHash,
    createdAt,
    createdBy: input.createdBy,
    // Task 31: agent provenance of the build request, recorded on the pack
    // (never part of packHash). Null-safe for a caller that hand-assembled
    // a request object without a hostAgent (validation rejects that shape
    // on every dispatcher/CLI/MCP path, so null is only reachable directly).
    hostAgent: input.request.hostAgent ?? null,
    workerAgent: input.request.workerAgent ?? null,
    status: "active",
    invalidatedAt: null,
    invalidatedReason: null,
    invalidatedBy: null,
    mode,
    expiresAt,
    promotedAt: null,
    promotedBy: null,
  };
  if (input.requestId !== undefined) pack.requestId = input.requestId;
  if (input.idempotencyKey !== undefined) pack.idempotencyKey = input.idempotencyKey;
  return pack;
}

/** Pure computation, no store access, no event emitted. */
export async function previewPack(registry: ProviderRegistry, input: BuildPackInput): Promise<ContextPack> {
  return computePack(registry, input);
}

/**
 * Builds and persists an immutable pack row. Replay-safe: if
 * `input.idempotencyKey` matches an existing row, that row is returned
 * unchanged instead of inserting a duplicate.
 */
export async function buildPack(
  store: ContextStore,
  registry: ProviderRegistry,
  input: BuildPackInput,
): Promise<ContextPack> {
  if (input.idempotencyKey !== undefined) {
    const existing = store.getPackByIdempotencyKey(input.idempotencyKey);
    if (existing !== undefined) return existing;
  }
  const pack = await computePack(registry, input);
  // Task 26: opt-in cache-by-hash — reuse an existing active pack of the
  // SAME mode instead of inserting a byte-identical duplicate row. `mode`
  // must be part of the lookup: it's deliberately excluded from `packHash`
  // (lifecycle metadata, docs/PACKS.md), so a hash match alone could
  // otherwise hand a caller who asked for a permanent ("sync") pack back
  // an ephemeral ("attach") one purely by hash collision.
  if (input.dedupeByHash === true) {
    const existing = store.getActivePackByHash(pack.packHash, pack.mode);
    if (existing !== undefined) {
      store.appendEvent("context.pack.cacheHit", { packId: existing.packId, packHash: pack.packHash });
      return existing;
    }
  }
  store.insertPack(pack);
  const totalRedactions = pack.items.reduce((sum, i) => sum + (i.redactionCount ?? 0), 0);
  store.appendEvent("context.pack.built", {
    packId: pack.packId,
    projectKey: pack.projectKey,
    itemCount: pack.items.length,
    exclusionCount: pack.exclusions.length,
    totalEstimatedTokens: pack.totalEstimatedTokens,
    packHash: pack.packHash,
    ...(totalRedactions > 0 ? { redactionCount: totalRedactions } : {}),
  });
  return pack;
}

export function getPack(store: ContextStore, packId: string): ContextPack {
  const pack = store.getPack(packId);
  if (pack === undefined) throw new NotFoundError(`no pack found with id '${packId}'`);
  return pack;
}

/**
 * Task 26: the standalone cache-key lookup — usable independently of
 * `buildPack`'s opt-in `dedupeByHash` (e.g. after a `previewPack` call, to
 * check whether the result already exists before deciding to build for
 * real). `mode` filters when given; omitted, ties break deterministically
 * on the earliest `createdAt` across modes (a hash can legitimately
 * collide across `"attach"`/`"sync"` builds of identical content).
 */
export function getPackByHash(store: ContextStore, packHash: string, mode?: "attach" | "sync"): ContextPack | undefined {
  return store.getActivePackByHash(packHash, mode);
}

/** Task 22: derived budget-consumption summary — computed at explain time from the pack's already-persisted `budget`/`items`, never itself stored (Engine Isolation Invariant: derived views are rebuildable, never canonical). */
export interface BudgetConsumption {
  maxTokens: number;
  reservedFramingTokens: number;
  /** `maxTokens - reservedFramingTokens`, floored at 0 — the ceiling actually enforced against items. */
  effectiveMaxTokens: number;
  totalEstimatedTokens: number;
  /** `effectiveMaxTokens - totalEstimatedTokens`, floored at 0. */
  tokensRemaining: number;
  totalActualBytes: number;
  /** Present only when the pack's budget set `maxBytes`. */
  maxBytes?: number;
  /** Present only when the pack's budget set `maxBytes`. */
  bytesRemaining?: number;
}

export interface ExplainResult {
  pack: ContextPack;
  attachments: PackAttachment[];
  budgetConsumption: BudgetConsumption;
}

function computeBudgetConsumption(pack: ContextPack): BudgetConsumption {
  const reservedFramingTokens = pack.budget.reservedFramingTokens ?? 0;
  const effectiveMaxTokens = Math.max(0, pack.budget.maxTokens - reservedFramingTokens);
  const totalActualBytes = pack.items.reduce((sum, item) => sum + item.actualBytes, 0);
  const consumption: BudgetConsumption = {
    maxTokens: pack.budget.maxTokens,
    reservedFramingTokens,
    effectiveMaxTokens,
    totalEstimatedTokens: pack.totalEstimatedTokens,
    tokensRemaining: Math.max(0, effectiveMaxTokens - pack.totalEstimatedTokens),
    totalActualBytes,
  };
  if (pack.budget.maxBytes !== undefined) {
    consumption.maxBytes = pack.budget.maxBytes;
    consumption.bytesRemaining = Math.max(0, pack.budget.maxBytes - totalActualBytes);
  }
  return consumption;
}

export function explainPack(store: ContextStore, packId: string): ExplainResult {
  const pack = getPack(store, packId);
  return {
    pack,
    attachments: store.listAttachments(packId),
    budgetConsumption: computeBudgetConsumption(pack),
  };
}

export function invalidatePack(
  store: ContextStore,
  packId: string,
  actor: AgentIdentity,
  reason: string,
): ContextPack {
  requireNonEmpty(reason, "reason");
  const pack = getPack(store, packId);
  if (pack.status === "invalidated") {
    throw new ConflictError(`pack '${packId}' is already invalidated`);
  }
  const invalidatedAt = new Date().toISOString();
  store.invalidatePackRow(packId, invalidatedAt, reason, actor);
  store.appendEvent("context.pack.invalidated", { packId, reason });
  return { ...pack, status: "invalidated", invalidatedAt, invalidatedReason: reason, invalidatedBy: actor };
}

export function attachPack(
  store: ContextStore,
  packId: string,
  target: AgentIdentity,
  note: string | undefined,
): PackAttachment {
  getPack(store, packId); // NotFoundError if missing
  const attachment: PackAttachment = {
    attachmentId: newId("atc"),
    packId,
    target,
    attachedAt: new Date().toISOString(),
  };
  if (note !== undefined) attachment.note = note;
  store.insertAttachment(attachment);
  store.appendEvent("context.pack.attached", { packId, attachmentId: attachment.attachmentId });
  return attachment;
}

/**
 * Task 29: the inverse of `attachPack` — removes ONE attachment relation.
 * The pack itself is untouched (its immutable build record never changes;
 * attachments are the mutable relation table). An unknown pack, an unknown
 * attachment, or an attachment belonging to a different pack are all the
 * same typed CONTEXT_NOT_FOUND — a detach failure never leaks whether some
 * other pack holds that attachmentId. The audit event fires only on a real
 * deletion (zero rows = zero mutation).
 */
export interface DetachResult {
  packId: string;
  attachmentId: string;
  detachedAt: string;
}

export function detachPack(
  store: ContextStore,
  packId: string,
  attachmentId: string,
  actor: AgentIdentity,
): DetachResult {
  getPack(store, packId); // NotFoundError if the pack is missing
  const detachedAt = new Date().toISOString();
  if (!store.deleteAttachment(packId, attachmentId)) {
    throw new NotFoundError(`no attachment '${attachmentId}' found on pack '${packId}'`);
  }
  store.appendEvent("context.pack.detached", { packId, attachmentId, detachedBy: actor });
  return { packId, attachmentId, detachedAt };
}

export interface ListPacksFilter {
  projectKey?: string;
  status?: "active" | "invalidated" | "expired";
  mode?: "attach" | "sync";
  limit?: number;
}

export interface ListPacksResult {
  packs: PackSummary[];
  count: number;
}

/** Task 29: newest-first bounded listing (see `ContextStore.listPacks`). */
export function listPacks(store: ContextStore, filter: ListPacksFilter = {}): ListPacksResult {
  const limit = filter.limit ?? 50;
  const packs = store.listPacks({
    projectKey: filter.projectKey,
    status: filter.status,
    mode: filter.mode,
    limit,
  });
  return { packs, count: packs.length };
}

export interface SweepResult {
  count: number;
  packIds: string[];
}

/**
 * Task 23: transition every active, unpromoted, past-TTL attach-mode pack
 * to `expired` (status-columns-only, non-destructive — same discipline as
 * `invalidatePack`). Emits `context.pack.swept` only when something
 * actually changed (zero rows = zero mutation — mirrors how `preview`
 * emits nothing because it has no side effects).
 */
export function sweepExpiredPacks(store: ContextStore, at: string = new Date().toISOString()): SweepResult {
  const packIds = store.sweepExpiredPacks(at);
  if (packIds.length > 0) {
    store.appendEvent("context.pack.swept", { count: packIds.length, packIds });
  }
  return { count: packIds.length, packIds };
}

/**
 * Task 23: the honest, testable half of "unless Projection is explicitly
 * invoked" (docs/BOUNDARY.md — Project_Projection does not exist yet).
 * Exempts an attach-mode pack from future expiry sweeps; never changes
 * `mode` or `status`.
 */
export function promotePack(store: ContextStore, packId: string, actor: AgentIdentity): ContextPack {
  const pack = getPack(store, packId);
  if (pack.mode !== "attach") {
    throw new ValidationError(`pack '${packId}' has mode '${pack.mode}': only 'attach'-mode packs can be promoted`);
  }
  if (pack.status !== "active") {
    throw new ConflictError(`pack '${packId}' is '${pack.status}'; only active packs can be promoted`);
  }
  if (pack.promotedAt !== null) {
    throw new ConflictError(`pack '${packId}' is already promoted`);
  }
  const promotedAt = new Date().toISOString();
  store.promotePackRow(packId, promotedAt, actor);
  store.appendEvent("context.pack.promoted", { packId, promotedBy: actor });
  return { ...pack, promotedAt, promotedBy: actor };
}
