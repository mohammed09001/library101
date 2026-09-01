/**
 * Explicit user/engine pin matching (Task 20), shared by `relevance.ts`
 * (Task 15's ranking priority — a pin sorts first) and `packs.ts` (Task 20's
 * budget priority — a pin is processed before any non-pinned candidate, so
 * it gets first claim on the budget). One predicate, two consumers — not
 * two copies of the same "is this ref pinned" logic (Anti-Accumulation
 * Rule).
 *
 * Reuses `ContextRequest.requiredSources` (Task 2) — a field validated
 * since Execution 01 and explicitly reserved in docs/SCHEMA.md for "a
 * future selection Task to honor." A pin is matched against either the
 * bare `ref` or the `providerId:ref` combined form, so a caller can pin
 * either "this exact file, from any provider" or "this exact provider+ref
 * pair" depending on how specific they need to be.
 */
import type { NormalizedContextCandidate } from "../contracts/candidates.ts";

export function isPinned(
  candidate: Pick<NormalizedContextCandidate, "providerId" | "ref">,
  requiredSources: readonly string[] | undefined,
): boolean {
  if (!requiredSources || requiredSources.length === 0) return false;
  const combined = `${candidate.providerId}:${candidate.ref}`;
  return requiredSources.includes(candidate.ref) || requiredSources.includes(combined);
}
