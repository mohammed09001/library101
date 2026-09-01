# The Selector: Relevance, Dedup, Diversity, Budgeting, Pinning (Tasks 15–20)

Implemented in `src/engine/relevance.ts` (Task 15 scoring + Task 16
integration), `src/engine/dedup.ts` (Task 17), `src/engine/selector.ts`
(orchestration, the `context.select` operation, docs/CONTRACTS.md),
`src/engine/diversity.ts` (Task 18), `src/engine/pinning.ts` and
`src/engine/privacy.ts` (Task 20, shared with `src/engine/packs.ts` — see
docs/PACKS.md for the budget/dedup/diversity/pinning pipeline Execution 07
extended). This is the selector every Execution through 05 explicitly
deferred (docs/BOUNDARY.md's old "Selection/ranking remains deferred" line),
now with Execution 07's coverage, verified-budget, and priority/privacy
semantics layered on top.

## Task 15 — Deterministic relevance baseline

### Task Source Requirement

"Rank candidates using task term overlap, source authority, path/component
overlap, recency and explicit user pins before semantic methods."

Five named signals, explicitly **not** semantic (no embeddings, no vector
search, no ML model — `deterministic_baseline_v1` is exactly what its name
says). Two of the five already had an owner:

| Signal | Owner | Reused, not recomputed |
|---|---|---|
| Task term overlap | `NormalizedContextCandidate.relevanceSignals.textMatchScore` (Task 4) | Yes |
| Recency | `NormalizedContextCandidate.relevanceSignals.recencyScore` (Task 4) | Yes |
| Source authority | `NormalizedContextCandidate.authority.tier` (Task 4) | Yes, mapped to a numeric score |
| Path/component overlap | — | New: `scorePathOverlap()`, camelCase/path-segment tokenization |
| Explicit user pins | `ContextRequest.requiredSources` (Task 2) | Reused — Task 2's docs/SCHEMA.md explicitly reserved this field for "a future selection Task to honor"; this is that Task |

### Missing signals are excluded, never fabricated

A candidate with no `freshness.maxAgeSeconds` requested has `recencyScore ===
undefined` (Task 4's own, deliberate behavior). `scoreCandidate()` excludes
that signal from the weighted average entirely rather than substituting a
neutral placeholder — `compositeScore` is a weighted average of whichever
signals are actually available for a given candidate, not a sum diluted by
invented zeros. `authority` is the one signal that is always available
(every candidate has a tier), so `compositeScore` is never undefined itself.

### Weights (fixed, documented, sum to 1 — not tunable per-request)

```
termOverlap: 0.40   authority: 0.20   pathOverlap: 0.15
recency: 0.15        graphCentrality: 0.10
```

### Explicit user pins

A candidate whose `ref` (or `providerId:ref`) appears in
`request.requiredSources` sorts before every non-pinned candidate,
regardless of score — pins are a hard ordering guarantee, not one more
weighted signal.

## Task 16 — Repository-map graph relevance

### Task Source Requirement

"Experiment with dependency/symbol reference centrality and task-connected
ranking inspired by Aider; record algorithm/version and do not assume
centrality equals relevance."

The centrality computation itself (personalized PageRank over the
repository's reference graph) was already built in Execution 04
(`src/providers/repoMapRank.ts`, Task 11) — the research note there records
what was integrated/adapted/rejected from `aider/repomap.py`. Task 16's job
is **exposing and using** that score at the selector level without letting
it masquerade as relevance:

- `RepositoryMapContextProvider.retrieve()` now attaches a
  `relevanceHint: {score, algorithm: "repo_map_pagerank", algorithmVersion,
  basis}` to each candidate (`ContextCandidate.relevanceHint`, contract
  1.4.0, additive) — `algorithm`/`algorithmVersion` are the literal "record
  algorithm/version" clause; `basis` states the "not a claim of task
  relevance" caveat directly in the data, not just in a doc comment.
- `normalizeCandidate()` carries `relevanceHint` through to
  `NormalizedContextCandidate.relevanceHint` verbatim — never
  reinterpreted at normalization time (docs/CANDIDATES.md).
- `relevance.ts`'s `scoreCandidate()` reads `relevanceHint.score` as
  `graphCentrality`, a **separate, independently-weighted** component
  (weight 0.10, the smallest of the six) — never merged into `termOverlap`
  or any other signal.

### "Do not assume centrality equals relevance" — proven, not just stated

`test/t16_repo_map_graph_relevance.test.ts` constructs a repository where
one file (`a.ts`) is heavily referenced (high centrality) but shares no
vocabulary with the task text, and another (`isolated.ts`) is referenced by
nothing (zero centrality) but its own symbol name matches the task text
closely. The ranked result puts `isolated.ts` first — term overlap (weight
0.40) outweighs centrality alone (weight 0.10). If centrality were treated
as relevance, the opposite would happen.

### A real methodological pitfall caught while building this test

Using the literal task-relevant symbol name as `taskText` (e.g.
`"budgetCeilingEnforcement"`) would have been circular: `repoMapRank.ts`'s
OWN internal personalization mechanism (Execution 04) also reads `taskText`
and boosts a file's PageRank when its symbol name is mentioned — so the
"zero centrality" file would stop being zero-centrality once its name
appeared in the query, contaminating the very comparison the test exists to
make. The test uses natural-language phrasing instead
("please explain the budget ceiling enforcement logic") — multi-word text
that `normalizeCandidate`'s substring-based `textMatchScore` still matches
well, but that never exact-token-matches a single-word symbol name closely
enough to trigger `repoMapRank.ts`'s own personalization. This is recorded
here because it is exactly the kind of assumption-that-would-quietly-pass-a-
narrow-test the Execution Contract's Phase C asks to falsify before coding,
not after.

## Task 17 — Cross-provider deduplication

See docs/PACKS.md's "Cross-provider deduplication" section for
`computePack()`'s integration, and `src/engine/dedup.ts`'s module docstring
for `pickCanonical()`/`deduplicateCandidates()`. Summary: content-hash-exact
matching (Task 4's existing `dedupKeys[0]`, not a new identity scheme);
canonical preference by `authority.tier`, not just "first wins"; ONE
function used by both the selector (batch form) and `buildPack` (so a
caller who never touches `context.select` still gets dedup — Anti-
Accumulation Rule: not two separate dedup implementations).

## The `context.select` operation

`src/engine/selector.ts`. Discovers via the existing fail-soft
`ProviderRegistry.discoverAll()` (Task 3/7 — an unavailable provider is
skipped, never called), bounds each provider's discovered refs to
`maxCandidatesPerProvider` (default 20) **except** pinned refs
(`requiredSources`), which are always retrieved regardless of the cap.
`forbiddenSources` refs are filtered out before retrieval is ever attempted
— the first real enforcement of these two Task 2 fields (docs/SCHEMA.md
previously documented them as "validated ... but there is no selector yet
to actually enforce it"). Retrieves per-ref (not batched) for the same
fail-soft granularity `computePack()` already uses. Privacy-filters (Task
20, below) before dedup/ranking. Output `items` is exactly
`BuildPackInput.items` shape — a caller pipes it straight into
`context.build`/`context.preview`.

## Task 18 — Diversity and coverage policy

### Task Source Requirement

"Prevent one provider or file from consuming the entire budget when
multiple evidence categories are required."

`src/engine/diversity.ts`'s `applyDiversityPolicy()`: a pure, deterministic
round-robin merge across `providerId` groups — each group's own internal
relative order preserved, groups visited in first-seen order, one item per
group per round. `providerId` is the "evidence category" boundary: the
coarsest, most honest granularity actually available (no candidate anywhere
carries a finer category label — inventing one would be a fabricated
signal). Applied in `computePack()` (docs/PACKS.md) to the NON-PINNED
portion of the deduplicated candidate set, immediately before budget
enforcement — the exact point where "consuming the entire budget" is
decided. `test/t18_diversity.test.ts` proves the mechanism directly (pure
function) and end-to-end: a 5-item-vs-1-item provider pair, budget-limited
to roughly 2 items, still includes the lone second provider's item instead
of budget running out entirely inside the first provider's five.

## Task 19 — Explicit token/byte budget accounting

### Task Source Requirement

"Estimate and then verify serialized size; reserve budget for task/system
framing and use deterministic truncation policies."

Three clauses, three concrete mechanisms in `computePack()` (docs/PACKS.md
has the full pass-by-pass detail):

1. **Estimate and then verify**: `estimatedTokens` remains Task 4's
   heuristic estimate; `ContextPackItem.actualBytes` (new, contract 1.5.0)
   is the real, `Buffer.byteLength`-verified UTF-8 size of what was
   actually accounted — the full excerpt, or a truncated slice.
2. **Reserve budget for framing**: `TokenBudget.reservedFramingTokens`
   (new, contract 1.5.0) — a caller-declared reservation subtracted from
   `maxTokens` up front, plus a small fixed `PER_ITEM_FRAMING_TOKENS = 8`
   added to every item's accounted cost. Context cannot know what a
   caller's own prompt template costs, so the caller states it rather than
   Context guessing a hardcoded constant.
3. **Deterministic truncation**: a boundary item that doesn't fully fit is
   truncated to the remaining budget (proportional character slice of the
   normalized excerpt, re-verified for real byte length) when the
   truncated remainder would still be `>= MIN_TRUNCATED_TOKENS (20)` tokens
   — recorded via `truncated: true` + `fullEstimatedTokens`. Below that
   floor, or when bytes are independently the blocking constraint,
   the item is excluded outright rather than truncated to a useless sliver.

`test/t19_budget_accounting.test.ts` proves each clause with a real,
inspected `ContextPack` — including a live CLI dogfood run against this
repository's own `docs/PACKS.md`/`docs/RELEVANCE.md`, where
`docs/RELEVANCE.md` itself was truncated from 1868 to 1266 accounted
tokens with `actualBytes` re-verified on the truncated slice, landing
`totalEstimatedTokens` exactly at the effective budget ceiling.

## Task 20 — Priority and pinning semantics

### Task Source Requirement

"Allow user/engine-required context items to be pinned while still
enforcing privacy and hard size limits."

Three parts:

1. **Real pinning, not just ranking order.** `src/engine/pinning.ts`'s
   `isPinned()` (shared by `relevance.ts` for ranking priority AND
   `packs.ts` for budget priority — one predicate, not two copies) — a
   pinned candidate is processed FIRST in `computePack()`'s final ordering
   (pass 4, docs/PACKS.md), giving it first claim on the budget. Before
   this Execution, `requiredSources` only affected sort order (Task 15);
   an item could still be silently dropped by budget exhaustion despite
   being "pinned." Proven in `test/t20_pinning_and_privacy.test.ts`: a
   pinned item listed SECOND in a 3-item, budget-for-2 pack still claims
   the first slot.
2. **Privacy enforcement, finally closing a gap open since Task
   3/Execution 01.** `src/engine/privacy.ts`'s `isWithinPrivacyCeiling()`
   compares `NormalizedContextCandidate.privacyClass` (Task 4's existing,
   provider-declared-ceiling granularity — unchanged) against
   `request.privacyPolicy.maxPrivacyClass`. Used by both `computePack()`
   (pass 2, BEFORE dedup — see docs/PACKS.md for why the ordering matters)
   and `selectCandidates()` (before dedup/ranking there too). `forbiddenTags`
   remains genuinely unenforced: no candidate anywhere carries a `tags`
   field to check it against — stated here plainly, not glossed over.
3. **A pin never overrides privacy or a hard size limit.** Privacy
   filtering (pass 2) runs BEFORE pin-priority ordering (pass 4) even
   considers a candidate — a privacy-violating pinned ref is excluded with
   `reason: privacy_violation` and never reaches the pinning logic at all.
   A pinned item too large to fit even after truncation is still excluded
   with `reason: budget_exceeded` — pins affect ORDER/priority, never the
   ceiling itself. Both directions proven directly in
   `test/t20_pinning_and_privacy.test.ts`.

## Research note (Aider-AI/aider, re-inspected for this Execution)

No new upstream inspection was required beyond Execution 04's — Task 15's
five signals are Library-original (not derived from Aider, which has no
"deterministic relevance baseline" concept of this shape); Task 16 reuses
Execution 04's already-recorded research note on `aider/repomap.py`'s
PageRank/personalization design verbatim, extending only how the resulting
score is *exposed and weighted*, not how it's computed. Tasks 18/19/20
(Execution 07) have no material external reference at all — diversity/
coverage, verified budget accounting, and pin/privacy enforcement are
Library-original policy decisions with no upstream equivalent inspected or
adapted.
