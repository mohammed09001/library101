/**
 * Diversity and coverage policy (Task 18): prevent one provider (or,
 * inseparably at this granularity, one file within that provider) from
 * consuming the entire budget when multiple evidence categories are
 * required.
 *
 * A `providerId` is the "evidence category" boundary here — the coarsest,
 * most honest granularity actually available: candidates don't carry a
 * finer category label anywhere in this codebase, so inventing one would
 * be a fabricated signal, not a real one. Deterministic round-robin
 * interleaving across provider groups, each group's OWN internal relative
 * order preserved (so a provider's most-relevant items still come first
 * within its own turns) — not a random or weighted shuffle.
 *
 * Applied to the NON-PINNED portion of a candidate list only
 * (`packs.ts`/`selector.ts` split pinned candidates out first, Task 20) —
 * an explicit pin is a stronger guarantee than diversity and must not be
 * reordered by it.
 */
import type { NormalizedContextCandidate } from "../contracts/candidates.ts";

export function applyDiversityPolicy(
  candidates: readonly NormalizedContextCandidate[],
): NormalizedContextCandidate[] {
  const groups = new Map<string, NormalizedContextCandidate[]>();
  const providerOrder: string[] = [];
  for (const candidate of candidates) {
    let group = groups.get(candidate.providerId);
    if (group === undefined) {
      group = [];
      groups.set(candidate.providerId, group);
      providerOrder.push(candidate.providerId);
    }
    group.push(candidate);
  }

  const out: NormalizedContextCandidate[] = [];
  for (let round = 0; out.length < candidates.length; round++) {
    for (const providerId of providerOrder) {
      const group = groups.get(providerId)!;
      if (round < group.length) out.push(group[round]!);
    }
  }
  return out;
}
