/**
 * The Context selector (Tasks 15/16/17): the piece every prior Execution's
 * `docs/BOUNDARY.md` explicitly deferred — "no algorithm decides *what's
 * relevant* or *what order*." This module is that algorithm's orchestration
 * layer: discover across registered providers (Task 3/7's existing
 * fail-soft `discoverAll`), bound + retrieve + normalize (Task 4) candidate
 * content, deduplicate across providers (Task 17, `dedup.ts`), and rank
 * deterministically (Task 15/16, `relevance.ts`). Its output shape is
 * exactly `BuildPackItemInput[]` (plus score breakdowns for
 * transparency) — a caller pipes `context.select`'s `items` straight into
 * `context.build`/`context.preview` without any translation, and
 * `context.build` itself is completely untouched by this module (backward
 * compatible: a caller may still hand-supply an item list exactly as
 * before).
 *
 * Explicit user pins (`ContextRequest.requiredSources`, Task 2) and
 * forbidden sources (`.forbiddenSources`) are enforced HERE for the first
 * time — Task 2's docs/SCHEMA.md recorded them as "validated as well-formed
 * ... but there is no selector yet to actually enforce it." This is that
 * selector: a pinned ref is always retrieved (even past the per-provider
 * cap) and always ranks first; a forbidden ref is never even retrieved.
 *
 * Since Execution 06 (Task 20), a privacy-ceiling filter (`privacy.ts`, the
 * same predicate `packs.ts` enforces) runs BEFORE dedup/ranking here too —
 * `context.select` should never surface a candidate `context.build` would
 * just reject anyway, and filtering first (rather than after ranking) means
 * a privacy-excluded candidate can never win a dedup tie against a
 * compliant duplicate either.
 */
import type { ContextRequest, ProviderId } from "../contracts/types.ts";
import type { ContextCandidateRef } from "../contracts/providers.ts";
import type { NormalizedContextCandidate } from "../contracts/candidates.ts";
import { policiesForProvider, applySourceFieldPolicy } from "./contentPolicy.ts";
import { normalizeCandidate } from "./normalizeCandidate.ts";
import { deduplicateCandidates } from "./dedup.ts";
import { isWithinPrivacyCeiling } from "./privacy.ts";
import { DETERMINISTIC_BASELINE_ALGORITHM, rankCandidates, type RelevanceScore } from "./relevance.ts";
import type { ProviderRegistry } from "./registry.ts";

const DEFAULT_MAX_CANDIDATES_PER_PROVIDER = 20;

export interface SelectInput {
  request: ContextRequest;
  /** Cap on how many discovered refs per provider get retrieved+scored — bounds cost. Pinned refs (requiredSources) are exempt. */
  maxCandidatesPerProvider?: number;
  /** Optional cap on the final ranked/deduped item count. Omit for "everything that survived dedup." */
  maxItems?: number;
}

export interface SelectedItem {
  providerId: ProviderId;
  ref: string;
  title: string;
  candidateId: string;
  score: RelevanceScore;
  /** Task 34: provider-derived material is untrusted external data — labeled at the export surface so a host frames it as data, never instructions. */
  trustClass: "untrusted";
}

export type SelectExclusionReason = "duplicate_content" | "provider_retrieve_failed" | "privacy_violation";

export interface SelectExclusion {
  providerId: ProviderId;
  ref: string;
  candidateId?: string;
  reason: SelectExclusionReason;
  message?: string;
}

export interface SelectResult {
  /** Ranked, deduped, ready to pass verbatim as `context.build`/`context.preview`'s `items`. */
  items: SelectedItem[];
  excluded: SelectExclusion[];
  degradedProviders: Array<{ providerId: ProviderId; message: string }>;
  /** Task 35: providers NOT consulted because their grant does not cover this request's project — reduced coverage, disclosed. */
  deniedProviders: Array<{ providerId: ProviderId; projectKey: string; message: string }>;
  /** Identifies the scoring formula (Task 16's "record algorithm/version" discipline) — also a valid `rankingVersion` for `context.build`. */
  algorithm: string;
}

function refKeys(providerId: ProviderId, ref: string): [string, string] {
  return [ref, `${providerId}:${ref}`];
}

function isInSet(set: ReadonlySet<string>, providerId: ProviderId, ref: string): boolean {
  const [bare, combined] = refKeys(providerId, ref);
  return set.has(bare) || set.has(combined);
}

/** Bound a provider's discovered refs to `maxCandidates`, always keeping pinned refs even past the cap. */
function boundRefs(
  refs: readonly ContextCandidateRef[],
  providerId: ProviderId,
  required: ReadonlySet<string>,
  maxCandidates: number,
): ContextCandidateRef[] {
  const pinned = refs.filter((r) => isInSet(required, providerId, r.ref));
  const pinnedRefSet = new Set(pinned.map((r) => r.ref));
  const rest = refs.filter((r) => !pinnedRefSet.has(r.ref));
  const restBudget = Math.max(0, maxCandidates - pinned.length);
  return [...pinned, ...rest.slice(0, restBudget)];
}

export async function selectCandidates(registry: ProviderRegistry, input: SelectInput): Promise<SelectResult> {
  const maxPerProvider = input.maxCandidatesPerProvider ?? DEFAULT_MAX_CANDIDATES_PER_PROVIDER;
  const required = new Set(input.request.requiredSources ?? []);
  const forbidden = new Set(input.request.forbiddenSources ?? []);

  const discovery = await registry.discoverAll(input.request);

  const normalizedList: NormalizedContextCandidate[] = [];
  const retrieveFailures: SelectExclusion[] = [];

  for (const { providerId, refs } of discovery.results) {
    const provider = registry.get(providerId);
    const eligible = refs.filter((r) => !isInSet(forbidden, providerId, r.ref));
    const bounded = boundRefs(eligible, providerId, required, maxPerProvider);

    for (const ref of bounded) {
      let candidates;
      try {
        candidates = await provider.retrieve(input.request, [ref]);
      } catch (err) {
        retrieveFailures.push({
          providerId,
          ref: ref.ref,
          reason: "provider_retrieve_failed",
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
      const candidate = candidates[0];
      if (candidate === undefined) continue;
      // Task 33 seam 1: source-specific field policies run BEFORE
      // normalization, so ranking signals and hashes see filtered material.
      const { candidate: filtered } = applySourceFieldPolicy(
        candidate,
        policiesForProvider(input.request, providerId),
      );
      normalizedList.push(
        normalizeCandidate(filtered, {
          request: input.request,
          declaration: provider.declaration,
          discoveredAt: new Date().toISOString(),
        }),
      );
    }
  }

  const maxPrivacyClass = input.request.privacyPolicy.maxPrivacyClass;
  const privacyApproved: NormalizedContextCandidate[] = [];
  const privacyExclusions: SelectExclusion[] = [];
  for (const normalized of normalizedList) {
    if (isWithinPrivacyCeiling(normalized, maxPrivacyClass)) {
      privacyApproved.push(normalized);
      continue;
    }
    privacyExclusions.push({
      providerId: normalized.providerId,
      ref: normalized.ref,
      candidateId: normalized.candidateId,
      reason: "privacy_violation",
      message: `candidate privacyClass '${normalized.privacyClass}' exceeds request ceiling '${maxPrivacyClass}'`,
    });
  }

  const { kept, excluded: dupExclusions } = deduplicateCandidates(privacyApproved);
  const ranked = rankCandidates(kept, input.request);
  const limited = input.maxItems !== undefined ? ranked.slice(0, Math.max(0, input.maxItems)) : ranked;

  const excluded: SelectExclusion[] = [
    ...retrieveFailures,
    ...privacyExclusions,
    ...dupExclusions.map((d) => ({
      providerId: d.candidate.providerId,
      ref: d.candidate.ref,
      candidateId: d.candidate.candidateId,
      reason: "duplicate_content" as const,
      message: `duplicate content already included via ${d.keptProviderId}:${d.keptRef} (candidateId ${d.keptCandidateId})`,
    })),
  ];

  return {
    items: limited.map((r) => ({
      providerId: r.candidate.providerId,
      ref: r.candidate.ref,
      title: r.candidate.title,
      candidateId: r.candidate.candidateId,
      score: r.score,
      trustClass: "untrusted" as const,
    })),
    excluded,
    degradedProviders: discovery.degraded,
    deniedProviders: discovery.denied,
    algorithm: DETERMINISTIC_BASELINE_ALGORITHM,
  };
}
