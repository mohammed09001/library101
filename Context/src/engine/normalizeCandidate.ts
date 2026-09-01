/**
 * Candidate normalization (Task 4): turns a raw provider-shaped
 * `ContextCandidate` into a `NormalizedContextCandidate` with a Context-owned
 * identity, computed relevance signals, a derived authority tier, an
 * inherited privacy ceiling, and stable dedup keys.
 */
import type { ContextCandidate } from "../contracts/providers.ts";
import type { ProviderDeclaration } from "../contracts/providers.ts";
import type { ContextRequest } from "../contracts/types.ts";
import type {
  CandidateAuthority,
  NormalizedContextCandidate,
  RelevanceSignals,
} from "../contracts/candidates.ts";
import { contentHashOf, newId } from "./ids.ts";

export const EXCERPT_MAX_CHARS = 4000;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * Bounded [0,1] keyword-overlap score between the task text and candidate
 * content: fraction of the task's distinct lowercase word tokens (len >= 3,
 * to skip stopword-ish noise) that appear in the content. Real, deterministic,
 * cheap — not a placeholder and not a claim of semantic relevance.
 */
function computeTextMatchScore(taskText: string, content: string): number | undefined {
  const taskWords = [...new Set(taskText.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
  if (taskWords.length === 0 || content.length === 0) return undefined;
  const lowerContent = content.toLowerCase();
  const hits = taskWords.filter((w) => lowerContent.includes(w)).length;
  return Math.min(1, hits / taskWords.length);
}

/**
 * Bounded [0,1] recency score against the request's freshness window: 1.0 at
 * age 0, linearly decaying to 0 at maxAgeSeconds. Undefined when the request
 * declared no freshness window (there is nothing to score against).
 */
function computeRecencyScore(request: ContextRequest, retrievedAt: string): number | undefined {
  const maxAge = request.freshness?.maxAgeSeconds;
  if (maxAge === undefined || maxAge <= 0) return undefined;
  const ageSeconds = (Date.now() - Date.parse(retrievedAt)) / 1000;
  if (!Number.isFinite(ageSeconds)) return undefined;
  return Math.max(0, Math.min(1, 1 - ageSeconds / maxAge));
}

function deriveAuthority(declaration: ProviderDeclaration | undefined): CandidateAuthority {
  if (declaration === undefined) {
    return { tier: "unattributed", basis: "no provider declaration available at normalization time" };
  }
  switch (declaration.freshness.kind) {
    case "live":
      return { tier: "provider_verified", basis: "provider declares live freshness (retrieved directly at call time)" };
    case "periodic":
      return { tier: "provider_reported", basis: "provider declares periodic freshness (refreshed on a cadence)" };
    case "static":
      return { tier: "provider_reported", basis: "provider declares static freshness (rarely changes)" };
  }
}

export interface NormalizeCandidateOptions {
  request: ContextRequest;
  declaration: ProviderDeclaration | undefined;
  discoveredAt: string;
}

export function normalizeCandidate(
  candidate: ContextCandidate,
  options: NormalizeCandidateOptions,
): NormalizedContextCandidate {
  const excerpt = truncate(normalizeWhitespace(candidate.content), EXCERPT_MAX_CHARS);
  const contentHash = contentHashOf(excerpt);
  const relevanceSignals: RelevanceSignals = {};
  const textMatchScore = computeTextMatchScore(options.request.taskText, candidate.content);
  if (textMatchScore !== undefined) relevanceSignals.textMatchScore = textMatchScore;
  const recencyScore = computeRecencyScore(options.request, candidate.retrievedAt);
  if (recencyScore !== undefined) relevanceSignals.recencyScore = recencyScore;

  const normalized: NormalizedContextCandidate = {
    candidateId: newId("cnd"),
    providerId: candidate.providerId,
    ref: candidate.ref,
    title: candidate.title,
    excerpt,
    provenance: {
      discoveredAt: options.discoveredAt,
      retrievedAt: candidate.retrievedAt,
      method: "provider_retrieve",
    },
    estimatedTokens: candidate.estimatedTokens,
    relevanceSignals,
    authority: deriveAuthority(options.declaration),
    privacyClass: options.declaration?.privacy.maxPrivacyClass ?? "internal",
    contentHash,
    dedupKeys: [`content:${contentHash}`, `ref:${candidate.providerId}:${candidate.ref}`],
  };
  // Provider-specific structured extras (Task 8: Memory's provenance/
  // epistemicClass/confidence/...) pass through unchanged, not reinterpreted.
  if (candidate.sourceMetadata !== undefined) normalized.structuredPayload = candidate.sourceMetadata;
  // Task 16: carried through verbatim, never reinterpreted or merged into
  // relevanceSignals here — combining it with other signals is the ranker's
  // job (src/engine/relevance.ts), not normalization's.
  if (candidate.relevanceHint !== undefined) normalized.relevanceHint = candidate.relevanceHint;
  return normalized;
}
