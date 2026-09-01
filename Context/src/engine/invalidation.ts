/**
 * Precise pack invalidation (Task 27 — Build precise invalidation). Task
 * Source Requirement: "Invalidate only packs affected by changed
 * source/version/policy/provider, not the entire cache."
 *
 * Two distinct trigger shapes, both matched via the `pack_items` reverse
 * index (`src/engine/store.ts`, migration 4) so this is genuinely
 * PRECISE — never a blanket sweep:
 *
 * - A changed SOURCE revision is inherently single-`(providerId, ref)`-
 *   scoped: one file/record/commit's content changed.
 * - A changed PROVIDER version is inherently provider-wide: every ref
 *   from that provider is potentially affected, not just one.
 *
 * Deliberately NOT built here (documented limitation, not a silent gap,
 * docs/BOUNDARY.md): POLICY-triggered invalidation (re-evaluating every
 * active pack's per-item privacy compliance against a newly changed
 * `privacyPolicy`) is a materially different query shape — comparing each
 * item's recorded `privacyClass` against a hypothetical new ceiling,
 * which no `providerId`/`ref` match can express — deferred to a future
 * Execution. `pack_items.privacy_class` is already indexed so that future
 * work needs no second migration.
 */
import type { AgentIdentity, ProviderId } from "../contracts/types.ts";
import { ValidationError } from "../contracts/errors.ts";
import type { ContextStore } from "./store.ts";

export interface InvalidateAffectedPacksInput {
  providerId: ProviderId;
  /** Omit for a provider-wide match (every ref from this provider); present for a single-source match. */
  ref?: string;
  /** Only meaningful together with `ref` — a provider-wide content-hash comparison has no single "current" value to compare against. */
  currentContentHash?: string;
  currentProviderVersion?: string;
  actor: AgentIdentity;
  reason?: string;
}

export interface InvalidateAffectedPacksResult {
  count: number;
  packIds: string[];
}

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
}

/**
 * Bulk-invalidates (reusing the same status-columns-only discipline
 * `invalidatePackRow`/`sweepExpiredPacks` already established — see
 * `ContextStore.invalidateAffectedPacksRows`) every ACTIVE pack whose
 * `pack_items` row for the given provider (and, when `ref` is given,
 * exactly that source) no longer matches the caller-supplied current
 * content hash and/or provider version. Emits `context.pack.invalidatedBatch`
 * only when at least one pack was actually invalidated.
 */
export function invalidateAffectedPacks(
  store: ContextStore,
  input: InvalidateAffectedPacksInput,
): InvalidateAffectedPacksResult {
  requireNonEmpty(input.providerId, "providerId");
  if (input.currentContentHash === undefined && input.currentProviderVersion === undefined) {
    throw new ValidationError("at least one of currentContentHash/currentProviderVersion is required");
  }
  if (input.currentContentHash !== undefined && input.ref === undefined) {
    throw new ValidationError("currentContentHash requires ref (a content-hash comparison is only meaningful for a single source)");
  }

  const invalidatedAt = new Date().toISOString();
  const reason = input.reason ?? `source revision changed: ${input.providerId}${input.ref !== undefined ? `:${input.ref}` : " (provider-wide)"}`;
  const packIds = store.invalidateAffectedPacksRows({
    providerId: input.providerId,
    ref: input.ref,
    currentContentHash: input.currentContentHash,
    currentProviderVersion: input.currentProviderVersion,
    invalidatedAt,
    reason,
    by: input.actor,
  });

  if (packIds.length > 0) {
    store.appendEvent("context.pack.invalidatedBatch", {
      count: packIds.length,
      packIds,
      providerId: input.providerId,
      ...(input.ref !== undefined ? { ref: input.ref } : {}),
      reason,
    });
  }

  return { count: packIds.length, packIds };
}
