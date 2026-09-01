/**
 * Content privacy filtering (Task 33). Task Source Requirement: "Apply
 * source-specific field policies before candidate normalization and again
 * before serialization/export."
 *
 * ONE owner for the whole mechanism (Anti-Accumulation Rule), applied at
 * exactly the two required seams:
 *
 *   1. BEFORE normalization — `applySourceFieldPolicy()` runs on the raw
 *      provider candidate in BOTH retrieval consumers (`selector.ts`,
 *      `packs.ts::computePack` Pass 1) before `normalizeCandidate()` sees
 *      it, so the excerpt, contentHash, dedup keys, relevance signals, and
 *      budget accounting are all computed from the FILTERED material.
 *   2. AGAIN before finalization/serialization — `isPolicyApplied()` is
 *      re-run on each finalized candidate in `computePack`'s budget pass
 *      (the last seam before anything is accounted/persisted/serialized).
 *      Application is idempotent, so for honestly-filtered content the
 *      re-check is a cheap no-op; if it ever reports unfiltered content,
 *      the early application was bypassed and the item is excluded with
 *      `privacy_violation` — an audible tripwire, not a silent pass.
 *
 * Reuses the Task 20 privacy discipline: filtering never overrides privacy
 * handling — it runs BEFORE it (a redacted candidate still faces the
 * Task 20 class ceiling in the same passes as before).
 */
import type { ContextCandidate } from "../contracts/providers.ts";
import type { ContextRequest, SourceFieldPolicy } from "../contracts/types.ts";

export const REDACTED = "[redacted]" as const;

/** The request's policies for one provider (source-specific). */
export function policiesForProvider(
  request: ContextRequest,
  providerId: string,
): readonly SourceFieldPolicy[] {
  return request.contentFieldPolicies?.filter((p) => p.providerId === providerId) ?? [];
}

function compiledPatterns(policy: SourceFieldPolicy): RegExp[] {
  return (policy.redactPatterns ?? []).map((p) => new RegExp(p, "g"));
}

/** True when `value` is a string with nonzero length that is not already the redaction sentinel. */
function isRedactableString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value !== REDACTED;
}

/**
 * Replace the value at a dotted `path` inside a plain object tree with
 * `[redacted]` (only when it currently holds a non-empty string). Returns
 * the ORIGINAL reference when nothing changed — no clone churn on the
 * common no-op path.
 */
function redactPath(obj: unknown, path: string): { value: unknown; changed: boolean } {
  const segments = path.split(".");
  function walk(node: unknown, i: number): { value: unknown; changed: boolean } {
    if (node === null || typeof node !== "object") return { value: node, changed: false };
    const source = node as Record<string, unknown>;
    const key = segments[i]!;
    if (!(key in source)) return { value: node, changed: false };
    if (i === segments.length - 1) {
      if (isRedactableString(source[key])) {
        const clone: Record<string, unknown> = { ...source };
        clone[key] = REDACTED;
        return { value: clone, changed: true };
      }
      return { value: node, changed: false };
    }
    const inner = walk(source[key], i + 1);
    if (!inner.changed) return { value: node, changed: false };
    return { value: { ...source, [key]: inner.value }, changed: true };
  }
  return walk(obj, 0);
}

export interface PolicyApplication {
  /** The candidate as it must enter normalization — same reference when nothing was redacted. */
  candidate: ContextCandidate;
  /** How many distinct redactions were applied (pattern replacements + field redactions). */
  redactionCount: number;
}

/**
 * Seam 1 (Task 33): apply one provider's field policies to a raw candidate.
 * Pure: never mutates the input candidate. Idempotent: applying an already
 * applied policy again reports zero further redactions.
 */
export function applySourceFieldPolicy(
  candidate: ContextCandidate,
  policies: readonly SourceFieldPolicy[],
): PolicyApplication {
  if (policies.length === 0) return { candidate, redactionCount: 0 };

  let content = candidate.content;
  let count = 0;
  let title = candidate.title;

  for (const policy of policies) {
    for (const pattern of compiledPatterns(policy)) {
      pattern.lastIndex = 0;
      content = content.replace(pattern, () => {
        count++;
        return REDACTED;
      });
    }
    for (const path of policy.redactedFields ?? []) {
      if (path === "title") {
        if (isRedactableString(title)) {
          title = REDACTED;
          count++;
        }
        continue;
      }
      const metaPath = path.slice("sourceMetadata.".length);
      const sourceMetadata = candidate.sourceMetadata;
      if (sourceMetadata === undefined) continue;
      const result = redactPath(sourceMetadata, metaPath);
      if (result.changed) {
        candidate = { ...candidate, sourceMetadata: result.value };
        count++;
      }
    }
  }

  if (count === 0) return { candidate, redactionCount: 0 };
  return { candidate: { ...candidate, content, title }, redactionCount: count };
}

/**
 * Seam 2 (Task 33): the finalization/serialization check over everything
 * the export surface carries — excerpt, title, structured payload. True
 * when no policy would still redact anything, i.e. seam 1 already applied
 * (or nothing matches). A `false` at the finalize seam means unfiltered
 * material reached serialization: the caller MUST exclude it
 * (`privacy_violation`), never serialize it.
 */
export function isPolicyApplied(
  excerpt: string,
  title: string,
  structuredPayload: unknown,
  policies: readonly SourceFieldPolicy[],
): boolean {
  for (const policy of policies) {
    for (const raw of policy.redactPatterns ?? []) {
      const probe = new RegExp(raw);
      probe.lastIndex = 0;
      if (probe.test(excerpt)) return false;
    }
    for (const path of policy.redactedFields ?? []) {
      if (path === "title") {
        if (isRedactableString(title)) return false;
        continue;
      }
      if (structuredPayload === undefined || structuredPayload === null) continue;
      if (holdsRedactableStringAt(structuredPayload, path.slice("sourceMetadata.".length))) return false;
    }
  }
  return true;
}

function holdsRedactableStringAt(node: unknown, path: string): boolean {
  const segments = path.split(".");
  let current: unknown = node;
  for (const key of segments) {
    if (current === null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[key];
  }
  return isRedactableString(current);
}
