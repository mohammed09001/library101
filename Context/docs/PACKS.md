# ContextPack — Schema and Immutable Build Record (Task 5)

Implemented in `src/contracts/packs.ts` (shape), `src/engine/packs.ts`
(`buildPack`/`previewPack`/`getPack`/`explainPack`/`invalidatePack`/
`attachPack`/`detachPack`/`listPacks`/`sweepExpiredPacks`/`promotePack`),
`src/engine/definitions.ts`
(`createDefinition`/`getDefinitionImpl`/`syncDefinition`, Task 24), and
`src/engine/store.ts` (`ContextStore`, the only place a pack or definition
row is ever written).

## What "immutable build record" means here

A `ContextPack` row, once inserted, never has its content columns
(`items_json`, `budget_json`, `pack_hash`, `creation_reason`, …) touched
again. `invalidatePack` is the **only** mutation path, and it writes
exclusively to `status` / `invalidated_at` / `invalidated_reason` /
`invalidated_by_json` (`ContextStore.invalidatePackRow`,
`src/engine/store.ts`) — the SQL statement itself does not name a single
content column, which is the actual immutability guarantee (not just a
convention observed by callers).

## Selection is a separate, optional upstream step (Execution 06)

`context.build`/`context.preview` still take a caller-supplied **ordered**
list of `{providerId, ref}` pairs directly — nothing about their own
signature or behavior requires a selector, and a human/the CLI may still
hand-supply that list exactly as in Executions 01–05. As of Execution 06,
`context.select` (`src/engine/selector.ts`, docs/RELEVANCE.md) can produce
that ordered list algorithmically (Tasks 15/16) and its output is exactly
`BuildPackInput.items` shape — but `computePack()` itself has no dependency
on the selector and does not call it. This module's own job remains
retrieval + normalization (Task 4) + cross-provider deduplication (Task 17,
below) + a real, deterministic **budget ceiling** + immutable recording.

## The five-pass pipeline (Execution 06 Task 17 + Execution 07 Tasks 18/19/20)

`computePack()` runs five passes now, not one:

1. **Retrieve + normalize** every caller-supplied item, in caller order
   (fail-soft: a missing provider or a `retrieve()` failure excludes only
   that item, reason `provider_unavailable`, exactly as before).
2. **Privacy ceiling enforcement** (Task 20, `src/engine/privacy.ts`) — a
   candidate whose `privacyClass` exceeds `request.privacyPolicy.maxPrivacyClass`
   is excluded, reason `privacy_violation`, **before** dedup runs — so a
   privacy-excluded candidate can never win a dedup tie against a compliant
   duplicate. Closes a gap documented since Task 3/Execution 01
   (docs/BOUNDARY.md §1).
3. **Deduplicate** (`src/engine/dedup.ts`'s `deduplicateCandidates()`, the
   same function `context.select` uses — one owner, not two copies): a later
   item whose normalized content is byte-identical to an earlier one
   (`dedupKeys[0]`, Task 4's existing content-hash key) is excluded with
   reason `duplicate_content`, **preferring canonical provenance** — the
   surviving candidate is whichever has the higher `authority.tier`
   (`provider_verified` > `provider_reported` > `unattributed`), not simply
   whichever came first.
4. **Pin priority + diversity ordering** (Task 20 + Task 18,
   `src/engine/pinning.ts` + `src/engine/diversity.ts`) — candidates whose
   `ref` (or `providerId:ref`) appears in `request.requiredSources` are
   moved to the front, in their own relative order; everyone else is
   round-robin interleaved across `providerId` groups (each group's own
   internal order preserved) so one provider can't monopolize the
   budget-ordered sequence when multiple are present. A pin is a genuine
   **budget priority guarantee** now, not just a ranking-order preference
   (`relevance.ts`, Task 15, still sorts pins first too, for callers who go
   through `context.select`) — proven in `test/t20_pinning_and_privacy.test.ts`.
5. **Budget-ceiling enforcement** (below) runs over this final ordered set.

**A real, documented architecture tradeoff**: content-based dedup can only
know a later item is a free duplicate AFTER retrieving and hashing it — so
step 1 retrieves every caller-supplied item regardless of where the
eventual budget cutoff lands, **superseding** the earlier "no further
provider calls once budget is exhausted" optimization this document used to
describe. The budget-ordering GUARANTEE itself (below) is unaffected and
remains fully tested.

## Budget enforcement (Task 5, extended by Task 19's verified accounting + truncation)

The final ordered item set is walked in order, accumulating `estimatedTokens`
against an **effective ceiling** (`request.budget.maxTokens -
request.budget.reservedFramingTokens`, the caller's declared reservation for
its own surrounding prompt framing — Task 19's "reserve budget for
task/system framing"; Context has no visibility into what that framing
costs, so the caller states it). Each item's accounted cost also includes a
small fixed per-item framing overhead (`PER_ITEM_FRAMING_TOKENS = 8`,
`src/engine/packs.ts`).

For each item, `ContextPackItem.actualBytes` is the **verified** (not
estimated) UTF-8 byte length of what was actually accounted — `Buffer.byteLength`
on the real normalized excerpt, re-verified again on the truncated slice
when truncation applies (below). This is Task 19's "estimate and then
verify serialized size" literally: `estimatedTokens` remains the *estimate*
(Task 4's `Math.ceil(content.length/4)`-style heuristic, carried through);
`actualBytes` is the *verification*. When `request.budget.maxBytes` is set,
it is enforced as an **independent** hard ceiling alongside `maxTokens` —
both must have room for an item to fully fit.

**Deterministic truncation** (Task 19): the first item that would NOT fully
fit (by tokens, or independently by bytes) is not always excluded outright.
If truncating it to the remaining token budget would still leave at least
`MIN_TRUNCATED_TOKENS = 20` tokens' worth — and bytes aren't independently
the blocking constraint (a byte-only overflow always excludes outright;
proportional cross-dimensional truncation is out of scope for this
deterministic baseline) — the item is included with `truncated: true`,
`fullEstimatedTokens` recording its original size, and `actualBytes`
re-verified against the actual truncated character slice (a proportional
cut of the normalized excerpt, not merely an estimate). Either way — full
inclusion, truncated inclusion, or exclusion — the pass remains a **strict
prefix**: once one item doesn't fully fit, every item after it is excluded
too (`budget_exceeded`), same discipline as before, just with a third
possible outcome for the boundary item itself.

## Reproducibility: packHash vs. packId vs. idempotencyKey

- `packId` is always a **fresh** `pak_` ULID (Memory's convention: instance
  identities are always fresh; only a caller-chosen key like `projectKey`
  gets a deterministic id — a pack has no such natural key).
- `packHash` is a SHA-256 over the canonical JSON of
  `{items: [{providerId, ref, order, contentHash}], budget, rankingVersion,
  providerVersions, exclusions: [{providerId, ref, reason}], projectKey,
  privacyPolicy: {maxPrivacyClass, forbiddenTags}}`. **`candidateId` is
  deliberately excluded** from this hash — it is a fresh identity on every
  normalization call and would make the hash non-reproducible even for
  byte-identical inputs (this was caught by `test/t5_packs.test.ts`'s
  cross-store reproducibility test during Execution 02 and fixed before
  this report). Two separate `buildPack`/`previewPack` calls with identical
  items/budget/ranking/provider-versions/exclusions/privacy-policy always
  produce the same `packHash`, even across different engine instances and
  store files — this is what "the same pack can be explained or reproduced"
  means concretely.
- **Task 26**: `privacyPolicy.forbiddenTags` is sorted before hashing
  (`canonicalHashOf`/`canonicalJson`, `src/engine/ids.ts`, sorts object
  keys but **not** array elements) — two logically-identical policies
  differing only in tag order must not spuriously miss the cache.
  `mode`/`expiresAt`/`promotedAt`/`promotedBy` remain excluded (lifecycle
  metadata, Task 23). So are `createdBy` and — since Task 31 — the pack's
  `hostAgent`/`workerAgent` provenance (agent identity is not content;
  see below).
- `idempotencyKey` (optional, caller-supplied) is the **replay** mechanism —
  Memory's established pattern (`memory-engine`'s `idx_records_idempotency`)
  reused here (`idx_packs_idempotency`, nullable unique index). Rebuilding
  with the same key returns the existing row unchanged instead of inserting
  a duplicate.

## "Source revisions"

Represented per-item via `ContextPackItem.contentHash` + `.retrievedAt`
(content-addressed) rather than a separate top-level structure — avoids a
second parallel copy of the same information (Anti-Accumulation Rule).

## Fields

See `src/contracts/packs.ts` for the authoritative shape:
`ContextPack`, `ContextPackItem`, `ContextPackExclusion`, `PackAttachment`.

## Task 21 — the assembler already produces typed, ordered, provenance-marked sections

Task 21's Task Source Requirement ("ordered, typed sections with provenance
markers and source handles rather than one undifferentiated text blob") was
already satisfied by the five-pass pipeline above, built across Executions
01-07: `ContextPack.items` is an **ordered** array (`order`, 0-based,
surviving privacy/dedup/pin/diversity/budget passes); each item is
**typed** via `providerId` (the section-type discriminator across the
seven distinct provider kinds — project_files/repository_map/git_history/
current_session/memory/study_document/performance); each item carries
**provenance markers** (`contentHash`, `retrievedAt`) and **source
handles** (`candidateId`, `ref`) — never a single undifferentiated text
blob. No new code was required for Execution 08; `test/t21_pack_explainability.test.ts`
adds fresh evidence asserting this shape directly against a real built
pack (rather than by inspection of the code alone).

## Task 22 — pack explainability: score components + budget consumption

`explainPack()` (`context.explain`) already covered included/excluded
candidates, provider failures (`provider_unavailable` exclusions), and
truncation (`truncated`/`fullEstimatedTokens`/`actualBytes`). Execution 08
closes the remaining two facets of the Task Source Requirement:

- **Score components**: `ContextPackItem`/`ContextPackExclusion` gain an
  optional `score?: RelevanceScore` (`src/contracts/candidates.ts` — moved
  there from `src/engine/relevance.ts`, re-exported from its original
  import path for compatibility, since it is now part of a pack item's wire
  shape, the same reasoning that already places `CandidateAuthority`
  there). `BuildPackItemInput` gains a matching optional `score` field —
  when a caller (typically piping `context.select`'s output straight into
  `context.build`/`context.preview`, per the existing supported flow) sets
  it, `computePack()` carries it through onto whichever `ContextPackItem`
  or `ContextPackExclusion` that input item becomes. Hand-supplied item
  lists without a `score` remain fully supported (the field is simply
  absent). **Deliberately excluded from `packHash`**: a candidate's score
  can drift between two otherwise byte-identical `select` calls (e.g. a
  recency signal), and `packHash` is documented as reproducible for
  identical items/budget/ranking/provider-versions/exclusions — including
  `score` would break that guarantee, exactly why `candidateId` is already
  excluded.
- **Budget consumption**: `explainPack()`'s result gains a `budgetConsumption`
  field — `{maxTokens, reservedFramingTokens, effectiveMaxTokens,
  totalEstimatedTokens, tokensRemaining, totalActualBytes, maxBytes?,
  bytesRemaining?}`. This is a **derived, explain-time-only** view (Engine
  Isolation Invariant: derived summaries are rebuildable, never canonical)
  computed purely from the pack's already-persisted `budget`/`items` —
  nothing new is stored, and it is recomputed identically on every
  `explainPack()` call. `maxBytes`/`bytesRemaining` are present only when
  the pack's budget actually set `maxBytes` (omitted, not zeroed,
  otherwise).

## Task 31 — host/worker-agent provenance on every pack

Task 31's Task Source Requirement ("Host capabilities and selected worker
are inputs; the same ContextPack schema works across agents") was already
two-thirds true before Execution 13: `ContextRequest.hostAgent`/
`workerAgent`/`callerCapabilities` have been validated inputs since Task 2
(`src/engine/normalize.ts`), no agent product is hard-coded anywhere in
`src/` (`ActorKind` is a closed kind set — human/agent/engine/tool — while
`agentType` is a free-form ≤64-char label; no closed product enum), and
`packHash` never included any agent identity, so content identity was
already agent-independent. What was missing: a built pack did not record
WHICH host/worker it was assembled for — a pack fetched back via
`context.get`/`context.explain`/`context.getByHash` was not
self-describing about its agent inputs.

- `ContextPack` gains `hostAgent: AgentIdentity | null` and
  `workerAgent: AgentIdentity | null` (contract 1.11.0, additive; migration
  5's nullable `host_agent_json`/`worker_agent_json` columns).
  `computePack()` captures them from the build request. `hostAgent` is
  non-null on every pack built since 1.11.0 (`ContextRequest.hostAgent` is
  required at validation); `workerAgent` is null when the request declared
  none. Null on pre-1.11.0 rows — unrecorded provenance reads back as
  null, never a fabricated identity.
- **Deliberately excluded from `packHash`** (like `createdBy`): agent
  identity is provenance, not content. The same task context requested by
  a Claude host, a Codex host, a Gemini host, or a plain human terminal
  produces the IDENTICAL `packHash` and item order — which is exactly what
  lets `context.getByHash`/`dedupeByHash` share one pack row across
  different agents (`test/t31_host_worker_neutrality.test.ts` proves the
  hash-equality, the cross-agent cache share, and the provenance
  round-trip against a real store).
- `--format human` pack rendering gains `host:`/`worker:` lines, shown
  only when recorded (pre-1.11.0 packs' output is unchanged).

## Task 33 — content privacy filtering (two seams)

Task 33's Task Source Requirement ("Apply source-specific field policies
before candidate normalization and again before serialization/export") is
implemented by `src/engine/contentPolicy.ts` — one owner, two seams:

- **Seam 1 (pre-normalization)**: `applySourceFieldPolicy()` runs on every
  raw candidate in BOTH retrieval consumers (`computePack()` Pass 1 and
  `selectCandidates`) BEFORE `normalizeCandidate()` — so the excerpt,
  `contentHash`, dedup keys, relevance signals, and budget accounting are
  all computed from the FILTERED material. Because hashing happens after
  filtering, content-addressed identity reflects exactly what may be
  surfaced: a pack built with a policy has a different `packHash` than the
  same build without it, and identical policies reproduce identical
  hashes.
- **Seam 2 (finalization/serialization)**: `isPolicyApplied()` re-verifies
  every candidate in the budget pass — the last seam before anything is
  accounted/persisted/serialized. Application is idempotent, so honest
  builds pass cheaply; material that would STILL be redactable at this
  seam (the early application was bypassed) is excluded with
  `reason: "privacy_violation"` and an explicit message — an audible
  tripwire, never a silent pass.

Policies come from the request's `contentFieldPolicies` (validated,
docs/SCHEMA.md). Explainability: an included item carries
`redactionCount` (absent when zero — explainability metadata, excluded
from `packHash` since `contentHash` already hashes the filtered excerpt),
and `context.pack.built` records the pack total when it is non-zero. No
store migration was required (items are JSON; old rows read back with the
field absent).

## Task 32 — delivering packs to Project_Projection (producer direction)

A built pack reaches Project_Projection ONLY through
`context.projection.handoff`: a versioned contract call to Projection's
(anticipated) `projection.ingest` CLI operation carrying strictly
by-reference identity — `{source, sourceContractVersion, packId, packHash,
projectKey, mode, itemCount}` — never item content, never a `.library`
file write (that format is Projection's own rendering output; there is no
file-writing code path in Context, proven by a filesystem-snapshot test).
Both lifecycle modes hand off: `mode` is derived from the pack itself
("attach" temporary / "sync" persistent), and the persistent path accepts
`{definitionId}` alone, resolving a projection-bound `ContextDefinition`'s
`currentPackId` + `boundProjectionRef` (typically right after
`context.definition.sync`). Every attempt is recorded
(`projection_handoffs`, migration 6; `context.projection.handoff` event)
with an explicit `delivered`/`unavailable`/`failed` status and is
retriable as a NEW row; a non-delivery never blocks or rewrites Context's
own canonical pack state. `Project_Projection` is verified absent (zero
files) as of this Execution, so real deliveries record `unavailable` —
the observable, honest degraded state (docs/PROJECTION.md).

## Task 23 — Temporary Attach mode

Every pack before Execution 09 was permanent (no expiry concept existed at
all). `BuildPackInput` gains an optional `mode?: "attach" | "sync"`
(default `"sync"` — preserves every pre-Execution-09 caller's behavior
exactly: permanent, `expiresAt: null`) and, only when `mode === "attach"`,
an optional `ttlSeconds?` (default `DEFAULT_ATTACH_TTL_SECONDS = 86400`,
24h — a conservative session/task-scoped default). `computePack()` stamps
`mode`/`expiresAt` onto the resulting `ContextPack`; both are **excluded
from `packHash`** (lifecycle metadata, not build content — same category
as `status`/`invalidatedAt`).

- **Expiry sweep**: `sweepExpiredPacks(store, at?)` (`context.sweep`) is a
  single status-columns-only `UPDATE ... RETURNING pack_id` — every
  `active`, unpromoted, past-TTL `"attach"`-mode pack transitions to a new
  status, `"expired"`, non-destructively (content columns untouched, same
  discipline as `invalidatePackRow`). `"sync"`-mode packs are never
  touched by a sweep regardless of `at`. An event (`context.pack.swept`)
  fires only when at least one pack was actually swept — zero rows is
  zero mutation, the same rule `context.preview` already follows for "no
  side effects".
- **Promotion — the honest half of "unless Projection is explicitly
  invoked"**: `Project_Projection` does not exist yet (verified empty
  sibling directory) and the integration direction here (Context would be
  *produced from*, not *consumed from*) doesn't match this repo's existing
  consumer-adapter pattern (`cliContractClient.ts`), so there is nothing to
  build a real or even honestly-anticipated adapter against. Instead,
  Context implements its own honest half of the handshake: `promotePack`
  (`context.promote`) sets `promotedAt`/`promotedBy` on an active
  `"attach"`-mode pack (status-columns-only, mirrors `invalidatePackRow`)
  — a promoted pack is permanently exempt from future expiry sweeps, never
  changing `mode` or `status`. This makes "unless explicitly invoked" a
  real, testable code path (`test/t23_temporary_attach.test.ts`) rather
  than prose that happens to be true only by the absence of any
  auto-promotion code. Promoting a `"sync"`-mode pack, a non-active pack,
  or an already-promoted pack is refused (typed errors).

## Task 24 — Persistent Sync mode

A `ContextPack` is an immutable snapshot of ONE build — it cannot itself be
the thing "bound to a project projection" and "regenerated" over time,
since regenerating literally means producing a NEW immutable pack.
`ContextDefinition` (`src/contracts/definitions.ts`) is the new, separate,
stable identity that survives across repeated builds of "the same" recipe:
`{request, items, rankingVersion, creationReason}` (create-only — never
edited after creation, see "Known limitations" below) plus
`currentPackId` (the pack most recently produced from it) and
`boundProjectionRef?` (an opaque caller-supplied reference to a project
projection — Context stores it but never interprets or calls it, the same
honest posture as the anticipated Study/Performance adapter contracts,
docs/ADAPTERS.md).

- `context.definition.create` persists the recipe only — no pack is built
  yet. `projectKey` is **derived** from `request.project.projectKey`,
  never separately caller-supplied (avoids drift, Anti-Accumulation Rule) —
  the same discipline `ContextPack.projectKey` already follows.
- `context.definition.sync` (`syncDefinition`, `src/engine/definitions.ts`)
  is the literal "regenerate when authorized source revisions change"
  mechanic, and reuses `computePack()` end to end with zero duplicated
  assembly logic: it calls `previewPack()` (pure, no store write) with the
  definition's stored recipe, compares the fresh `packHash` against the
  currently-bound pack's (or treats it as changed unconditionally when
  there is no prior pack), and only calls the real `buildPack()` — a
  genuinely new immutable pack row — when the hash actually differs.
  "Authorized" source revisions means exactly what the definition's own
  bound `request.privacyPolicy`/dedup/pin filtering already permits on
  every run — no new ACL layer. `updateDefinitionAfterSync` (the
  definition's only mutator) always advances `currentPackId`/
  `lastSyncedAt`/`lastSyncOutcome` (`"created"` or `"unchanged"`), and
  `context.definition.synced` always fires — a store write happens on
  both outcomes, unlike the sweep's "only fire when something changed"
  rule (a sweep can genuinely touch zero rows; a sync always at least
  updates its own bookkeeping columns).

## Task 29 — attachment detach and bounded pack listing

- **`context.detach`** (`detachPack(store, packId, attachmentId, actor)`,
  `src/engine/packs.ts`) removes ONE `pack_attachments` relation — the
  mutable link between a pack and the agent it was handed to. The pack row
  itself is untouched (it is the immutable build record; attachments are
  the relation table). An unknown pack, an unknown attachmentId, and a
  well-formed attachmentId held by a DIFFERENT pack are all the same typed
  `CONTEXT_NOT_FOUND` — a failed detach never reveals that some other pack
  holds the id (the DELETE is keyed on BOTH `attachment_id` AND `pack_id`).
  The `context.pack.detached {packId, attachmentId, detachedBy}` event
  fires only on a real deletion; re-detaching an already-detached
  attachment does not.
- **`context.list`** (`listPacks(store, filter)`) is a bounded,
  newest-first SUMMARY projection (`PackSummary`: ids/status/mode/tokens/
  hash/counts — never `items`/`exclusions`, which stay fetchable per-pack
  via `context.get`/`context.explain`). Filters: `projectKey`/`status`/
  `mode` (validated: unknown values are `CONTEXT_VALIDATION_FAILED`) and
  `limit` (1–500, default 50). A read-only projection over the same
  canonical rows — not a second store, not a cache.

## Task 26 — cache keys: dedupeByHash and context.getByHash

`packHash` already covered source revisions (`contentHash`), provider
versions, ranking version, and budget; Execution 11 adds `privacyPolicy`
(above) so it genuinely covers every dimension the Task Source Requirement
names ("request normalization, source revisions, provider versions,
ranking version, privacy policy and budget").

- `BuildPackInput.dedupeByHash?: boolean` (default `false` — every
  pre-Execution-11 caller's behavior is unchanged). When `true`,
  `buildPack()` computes the pack as normal, then looks up an existing
  **active** pack with the same `packHash` **and the same `mode`**
  (`ContextStore.getActivePackByHash`) before inserting. `mode` is part of
  the lookup deliberately: `mode`/`expiresAt` are excluded from `packHash`
  itself (lifecycle metadata, Task 23), so hash-only matching could hand a
  caller who asked for `mode: "sync"` (permanent) an existing
  `mode: "attach"` (temporary, expiring) pack purely by content collision.
  On a hit, no new row is inserted; instead `context.pack.cacheHit
  {packId, packHash}` fires and the existing pack is returned. This is a
  deliberate, documented exception to the "event fires only on a real
  mutation" rule (`context.pack.built` still fires exactly once, on the
  original insert) — justified by audit-trail expectations on a call that
  normally does mutate. Retrieval still happens on every call (the hash is
  only knowable after retrieving+normalizing); `dedupeByHash` dedupes
  **storage**, not retrieval cost.
- `context.getByHash` (`getPackByHash(store, packHash, mode?)`,
  `src/engine/packs.ts`) is the standalone lookup — `mode` optional here
  (filters when given; otherwise the oldest matching active pack across
  modes, a deterministic tie-break, not a semantic claim that mode doesn't
  matter for a bare lookup the way it does for `dedupeByHash`'s insert
  decision).

## Task 27 — precise invalidation via the pack_items reverse index

A `ContextPack.items_json` blob has no index — the only prior invalidation
path was `invalidatePack(packId)`, one pack at a time by id. Task 27 needs
"only packs affected by changed source/version/policy/provider, not the
entire cache," which requires knowing which packs reference a given
`(providerId, ref)` without scanning every row's JSON.

- **`pack_items`** (migration 4, `src/engine/store.ts`): one row per
  `ContextPackItem` per pack (`pack_id, provider_id, ref, content_hash,
  provider_version, privacy_class`), written by `insertPackItems()` inside
  `insertPack()`. This is a **derived, rebuildable index** (Engine
  Isolation Invariant) — canonical truth remains `items_json`; nothing
  reads `pack_items` as authoritative, only as a targeting mechanism.
  Indexed on `(provider_id, ref)` and on `pack_id`.
- **`invalidateAffectedPacks`** (`src/engine/invalidation.ts`,
  `context.invalidateAffected`) recognizes two distinct trigger shapes,
  not one:
  - **Single-source content change**: `providerId` + `ref` +
    `currentContentHash` — invalidates only packs whose `pack_items` row
    for that exact `(providerId, ref)` has a stale `content_hash`.
  - **Provider-wide version bump**: `providerId` + `currentProviderVersion`
    (`ref` omitted) — invalidates every active pack referencing that
    provider at all, regardless of which ref, whose recorded
    `provider_version` is stale. `currentContentHash` without `ref` is
    rejected (a content-hash comparison is only meaningful for one named
    source).
  - At least one of `currentContentHash`/`currentProviderVersion` is
    required.
  - Implemented as a **single bulk** `UPDATE context_packs SET
    status='invalidated', ... WHERE status='active' AND pack_id IN (SELECT
    DISTINCT pack_id FROM pack_items WHERE ...) RETURNING pack_id`
    (`ContextStore.invalidateAffectedPacksRows`) — mirrors
    `sweepExpiredPacks`'s own idiom. A single statement avoids a TOCTOU
    race across overlapping triggers and avoids looping over
    `invalidatePack()` catching `ConflictError` for rows another trigger
    already invalidated in the same pass; already-invalidated/expired
    packs are simply not matched by `status='active'`, not an error.
  - `context.pack.invalidatedBatch {count, packIds, providerId, ref?,
    reason}` fires only when `count > 0` (ordinary "fires on real
    mutation" rule — unlike Task 26's `cacheHit` exception above).
  - `privacy_class` is captured on every `pack_items` row now (free, since
    a row is written per item regardless) so a future policy-triggered
    invalidation (e.g. "a privacy policy tightened, invalidate every pack
    that now exceeds it") can be built without a second migration —
    **deliberately not implemented this Execution**: it is a materially
    different query shape (comparing against a *changed ceiling*, not a
    changed source fact), not secretly cheap to add alongside the above.

## Task 28 — reproducibility and replay

`ContextPack` is an immutable snapshot with no preserved recipe of its
own; only a `ContextDefinition` (Task 24) preserves the original
`ContextRequest` + items + rankingVersion, and only for its **current**
pack (`currentPackId`) — there is no history of a definition's earlier
packs. `replayPack(store, registry, packId)` (`src/engine/replay.ts`,
`context.replay`) is therefore honestly scoped:

- `getDefinitionByCurrentPackId(packId)` (new reverse lookup, indexed via
  `idx_definitions_current_pack`) finds the definition currently pointing
  at this exact pack. **If none exists** — the pack was built via a bare
  `context.build` call, or it is an OLDER pack a definition has since
  moved past — `replayPack` returns `{reproducible: false, reason: "no
  ContextDefinition currently points at this pack — packs built via a bare
  context.build call are not tracked for replay; create a
  ContextDefinition and sync it to make future builds replayable", pack}`
  rather than fabricating a request that was never actually preserved.
- **If a definition is found**, `replayPack` calls `previewPack()` (pure,
  no store write — the same building block `syncDefinition` already
  reuses, Task 24) with the definition's stored recipe and compares
  `packHash`. Equal → `{reproducible: true, pack, replayedPack}`. Different
  → the result explains *why*, at two levels:
  - **Per-item diff** (`itemDiffs: ItemDiff[]`, keyed by `providerId:ref`
    across both packs' `items` + `exclusions`): `"unchanged"`,
    `"reordered"` (same `contentHash`, different `order` — kept distinct
    from `contentChanged` so a pure ordering shift from e.g. diversity
    interleaving is never mislabeled as a content change), `"contentChanged"`,
    `"nowExcluded"`, `"newlyIncluded"`.
  - **Pack-level changed-flags** (`providerVersionsChanged`,
    `rankingVersionChanged`, `budgetChanged`): needed because a purely
    pack-level divergence (e.g. `rankingVersion` bumped but every item is
    byte-identical) would otherwise produce an all-`"unchanged"` item diff
    while still reporting `reproducible: false` — the flags are what
    actually explains it in that case.
- **Known limitation, stated plainly**: replay only ever works for a
  definition's CURRENT pack. A definition's earlier, superseded packs
  (before its most recent sync) have no reverse pointer to them and are
  reported non-replayable, identically to a bare `context.build` pack,
  even though they were in fact once produced from a preserved recipe.

## Known limitations

- The caller-supplied item list's ORIGINAL order only survives as far as
  pass 4 (privacy/dedup don't reorder; pin-priority and diversity do,
  deliberately — Task 18/20). `computePack()` still has no opinion on
  RELEVANCE ordering; that remains `context.select`'s job (Task 15/16).
- `providerVersions` only records versions for providers that contributed at
  least one **included** item, not excluded ones.
- `ProviderDeclaration.version` is optional (contract 1.1.0, additive); a
  provider that omits it is recorded as `"unversioned"` in a pack.
- Dedup is exact content-hash matching only (Task 17); near-duplicate/fuzzy
  overlap is out of scope for this deterministic pass.
- Diversity's "evidence category" granularity is `providerId` (Task 18) —
  the coarsest, most honest boundary actually available; no finer per-file
  or per-topic category label exists anywhere in this codebase.
- Truncation only ever operates along the token dimension; a byte-only
  overflow (rare — `maxBytes` set tighter than `maxTokens` would imply)
  always excludes outright rather than attempting a precise cross-dimensional
  proportional cut (Task 19, a documented, deliberate scope boundary).
- Privacy enforcement remains provider-declared-ceiling granularity (Task 4's
  original limitation, unchanged) — not a true per-item classification.
  `privacyPolicy.forbiddenTags` is still unenforced: no candidate anywhere
  carries a `tags` field to check it against.
- A `ContextDefinition`'s recipe (`request`/`items`/`rankingVersion`/
  `creationReason`) cannot be edited after creation (Task 24) — create a
  new definition instead. Deliberately out of scope for this Execution
  (YAGNI; nothing in the Task Source Requirement asks for recipe mutation).
- `boundProjectionRef` and the whole notion of "Projection is explicitly
  invoked" (Task 23) are honest, structurally-present-but-unverified
  integration points: `Project_Projection` remains a completely empty
  sibling directory, more absent than Study/Performance were for Tasks
  9/10. There is no consumer- or producer-direction adapter here, and the
  field's actual interpretation is entirely a future Project_Projection
  Execution's concern.
- Policy-triggered precise invalidation (Task 27) — e.g. "this privacy
  policy tightened, invalidate every pack that now exceeds it" — is
  deliberately not implemented; `pack_items.privacy_class` is captured for
  a future Execution to build it without a second migration.
- `replayPack` (Task 28) only ever works for a `ContextDefinition`'s
  CURRENT pack, not its full history of earlier synced packs (see "Task
  28" above).
