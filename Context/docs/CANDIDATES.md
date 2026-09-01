# NormalizedContextCandidate — Candidate Schema (Task 4)

Implemented in `src/contracts/candidates.ts` (shape) and
`src/engine/normalizeCandidate.ts` (`normalizeCandidate`, the only supported
way to turn a raw provider `ContextCandidate` — `src/contracts/providers.ts`
— into a `NormalizedContextCandidate`).

## Fields

| Field | Type | Notes |
|---|---|---|
| `candidateId` | `string` | Fresh `cnd_` ULID, always new — never derived from content. Not a dedup key; use `dedupKeys` for that. |
| `providerId` / `ref` | `string` | Carried over verbatim from the raw candidate. |
| `title` | `string` | Carried over verbatim. |
| `excerpt` | `string` | Whitespace-normalized, truncated to `EXCERPT_MAX_CHARS` (4000). |
| `structuredPayload` | `unknown` | Reserved for a future non-text provider; unused by `ProjectFilesProvider`. |
| `provenance.discoveredAt` / `.retrievedAt` / `.method` | | `discoveredAt` is when the ref was enumerated (approximated as retrieval time when a caller skips a separate `discover()` step — known limitation, see below). |
| `estimatedTokens` | `number` | Carried over verbatim from the raw candidate. |
| `relevanceSignals.textMatchScore` | `number \| undefined` | Bounded [0,1]: fraction of the request's distinct lowercase word tokens (len ≥ 3) found in the candidate content. Undefined when `taskText` has no such tokens or content is empty. Real and computed — not a placeholder — but a cheap keyword-overlap heuristic, not a claim of semantic relevance. |
| `relevanceSignals.recencyScore` | `number \| undefined` | Bounded [0,1]: `1 - age/maxAgeSeconds`, clamped. Undefined when the request declared no `freshness.maxAgeSeconds`. |
| `authority.tier` | `provider_verified \| provider_reported \| unattributed` | Derived from the owning provider's `declaration.freshness.kind`: `live`→verified, `static`/`periodic`→reported, no declaration available→unattributed. A small Library-owned decision — see docs/CONTRACTS.md's research note for what continue's interface does *not* offer here. |
| `privacyClass` | `"public"\|"internal"\|"sensitive"` | Inherited from the owning provider's declared `privacy.maxPrivacyClass` ceiling. **Not a per-item classification** — no provider tags individual candidates with their own privacy class yet; this is a documented limitation, not an oversight. |
| `contentHash` | `string` | SHA-256 of the normalized `excerpt`, hex. This is the content-addressed identity used for dedup and (via `ContextPackItem`) as the pack's "source revision" marker. |
| `dedupKeys` | `string[]` | `[content:<contentHash>, ref:<providerId>:<ref>]` — stable across repeated normalization of identical content, unlike `candidateId`. Consumed by `src/engine/dedup.ts` (Task 17, Execution 06) for cross-provider deduplication. |
| `relevanceHint` | `ProviderRelevanceHint \| undefined` | Optional, additive (contract 1.4.0, Task 16). Carried through verbatim from the raw candidate — never computed or reinterpreted here. A provider-computed relevance-*adjacent* signal (e.g. `RepositoryMapContextProvider`'s PageRank centrality) recording `score`/`algorithm`/`algorithmVersion`/`basis`. Deliberately NOT merged into `relevanceSignals` — see docs/RELEVANCE.md for why centrality must never be treated as relevance itself. |

## Known limitations

- `discoveredAt` cannot be trusted as "true enumeration time" when a caller
  builds/previews a pack from a raw `{providerId, ref}` list without having
  called `discover()` first (the common CLI/manual-selection path in this
  Execution) — it is set to the moment normalization ran, which in practice
  coincides with `retrievedAt`.
- `relevanceSignals` are cheap heuristics, not a ranking model. No selection
  algorithm consumes them yet (docs/BOUNDARY.md).
## Task 33 (Execution 15) - policies run BEFORE normalization

The raw candidate handed to normalizeCandidate() is, since Task 33, the
POST-POLICY candidate: src/engine/contentPolicy.ts applies the request's
source-specific contentFieldPolicies (field + pattern redaction) before
normalization in both consumers (selectCandidates, computePack), so
excerpt, contentHash, dedupKeys, and the computed relevance signals all
describe the FILTERED material. contentPolicy.isPolicyApplied()
re-verifies this at pack finalization (docs/PACKS.md).
