/**
 * Privacy ceiling enforcement (Task 20: "... while still enforcing
 * privacy ..."). Closes a gap documented since Task 3/Execution 01
 * (docs/CONTRACTS.md: "providers are trusted to honor request.privacyPolicy
 * ... the registry does not currently re-filter provider output against
 * those fields") — this is the first place that comparison is actually
 * made and enforced, not just recorded as a known limitation.
 *
 * Compares `NormalizedContextCandidate.privacyClass` (Task 4 — inherited
 * from the owning provider's DECLARED ceiling, not a per-item
 * classification; a documented, unchanged granularity limitation) against
 * `ContextRequest.privacyPolicy.maxPrivacyClass`. A candidate whose class
 * exceeds the request's ceiling is rejected outright — a pin (Task 20)
 * never overrides this; privacy is checked before pin priority is even
 * considered, in both consumers below.
 *
 * `privacyPolicy.forbiddenTags` is NOT enforced here: no `ContextCandidate`
 * carries a `tags` field anywhere in this codebase, so there is nothing to
 * compare it against — an honest, explicit limitation (see docs/RELEVANCE.md),
 * not a silently-skipped check.
 */
import type { PrivacyClass } from "../contracts/types.ts";
import type { NormalizedContextCandidate } from "../contracts/candidates.ts";

const PRIVACY_RANK: Record<PrivacyClass, number> = {
  public: 0,
  internal: 1,
  sensitive: 2,
};

/** True when `candidate.privacyClass` is at or below `maxPrivacyClass`. */
export function isWithinPrivacyCeiling(
  candidate: Pick<NormalizedContextCandidate, "privacyClass">,
  maxPrivacyClass: PrivacyClass,
): boolean {
  return PRIVACY_RANK[candidate.privacyClass] <= PRIVACY_RANK[maxPrivacyClass];
}
