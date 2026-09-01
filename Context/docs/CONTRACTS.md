# Context Contracts — Providers (Task 3) and context.* Operations (Task 6)

Implemented in `src/contracts/providers.ts` (provider types),
`src/engine/registry.ts` (`ProviderRegistry`),
`src/providers/projectFilesProvider.ts` (reference implementation),
`src/contracts/operations.ts` (the 24-operation envelope vocabulary), and
`src/engine/dispatcher.ts` (`dispatch()`, the single owner of the envelope).

## Research note (mandatory external reference: continuedev/continue)

Inspected `core/index.d.ts` on the `main` branch directly (`IContextProvider`,
`ContextProviderDescription`, `ContextProviderExtras`, `ContextItem`,
`ContextSubmenuItem`, `ContextProviderName`).

| Upstream element | Decision | Why |
|---|---|---|
| `getContextItems(query, extras)` + `loadSubmenuItems(args)` split | **ADAPT** → `discover(request)` / `retrieve(request, refs)` | The lightweight-enumeration vs. full-content-fetch split is sound and maps directly onto Library's "discovery/retrieval" wording in the Task Source Requirement. |
| `get deprecationMessage(): string \| null` | **ADAPT** → `ProviderDeclaration.deprecated?: {message}` | Same intent (mark a provider as superseded without removing it), reshaped as a declaration field instead of a getter to fit Library's plain-data declaration style. |
| `ContextProviderName` (closed ~25-entry string-literal union, `\| string` escape hatch) | **REJECT** | Task Source Requirement explicitly requires room for "future providers." A maintained closed union would force a breaking/awkward change for every new provider. Library uses an open `ProviderId = string` instead, with `KNOWN_PROVIDER_IDS` as a documented (non-exhaustive) recommendation list. |
| Cost / freshness / privacy declarations | **Library addition — not sourced upstream** | continue's `ContextProviderDescription` has no cost, freshness, or privacy fields at all. The Task Source Requirement explicitly requires "declare capabilities, costs, freshness and privacy needs," so this is designed from scratch for Library, not adapted from continue. |
| `healthCheck()` | **Library addition — not sourced upstream** | Required by the Engine Isolation Invariants' "explicit failure/degraded behavior" — continue's interface has no equivalent; a provider that can't reach its backing store must be able to say so without throwing out of `discover`/`retrieve`. |

No dependency on `continuedev/continue` code was introduced — only the
interface *shape* was studied; nothing was imported or vendored.

## The rule

A `ContextProvider` is a plain object satisfying `src/contracts/providers.ts`.
Registration happens in-process via `ContextEngine.registerProvider()` /
`ProviderRegistry.register()` — there is no persistence of registered
providers across restarts in this Execution; a host process registers its
providers at startup.

## Declaration

```ts
interface ProviderDeclaration {
  id: ProviderId;                     // open id, e.g. "project_files"
  displayName: string;
  description: string;
  capabilities: ProviderCapability[]; // e.g. "file_content", "memory_records"
  cost: { relativeCost: "low"|"medium"|"high"; network?: boolean };
  freshness: { kind: "static"|"live"|"periodic"; typicalAgeSeconds?: number };
  privacy: { maxPrivacyClass: "public"|"internal"|"sensitive"; requiresAuthorization?: boolean };
  deprecated?: { message: string };
  version?: string;                   // contract 1.1.0, additive — recorded into any pack built from this provider
}
```

`ProviderRegistry.register()` rejects a declaration missing any required
field, a non-array `capabilities`, or a duplicate `id`
(`CONTEXT_VALIDATION_FAILED`).

## Lifecycle

1. `discover(request: ContextRequest): Promise<ContextCandidateRef[]>` —
   cheap enumeration of candidate references (path/id/uri + estimated token
   size). Must not fetch full content.
2. `retrieve(request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]>` —
   fetch full content for a caller-selected subset of discovered refs.
3. `healthCheck(): Promise<ProviderHealth>` — must never throw; reports
   `{available, degraded, message?}`.

Providers are still trusted to self-honor `request.privacyPolicy`/
`forbiddenSources` at the `discover()`/`retrieve()` level itself — the
registry's `discoverAll()` does not re-filter provider output. But since
Execution 06 (`forbiddenSources`) and Execution 07
(`privacyPolicy.maxPrivacyClass`, Task 20), both `context.select` and
`computePack()` DO re-filter every candidate against these fields before it
can reach a built pack — see docs/PACKS.md and docs/RELEVANCE.md. The
remaining gap is narrower than before: a provider could still, in
principle, leak disallowed material through its own `discover()` output
into logs/telemetry before Context's own filtering runs; the filtering
that determines what actually ends up in a `ContextPack` is real.

## Registry behavior (fail-soft) and capability probing (Task 7)

Providers register **independently** — `ProviderRegistry.register()` takes
one provider object at a time; there is no batch/coupled registration path,
and one provider's registration failure (malformed declaration, duplicate
id) never affects another's.

`ProviderRegistry.probe(id)` / `.probeAll()` wrap `healthCheck()` and never
throw — a `healthCheck()` that itself throws is reported as
`{available: false, degraded: true}`, same as one that resolves that way.
`.listByCapability(capability)` filters registered declarations by a
declared `ProviderCapability`.

`ProviderRegistry.discoverAll(request)`:
- Filters to providers eligible under `request.allowedProviders` /
  `request.forbiddenProviders`.
- **Probes each eligible provider first.** An unavailable provider
  (`available: false`) is **skipped — `discover()` is never called on it** —
  and recorded in `degraded` straight from the probe message. This is
  cheaper and more honest than calling `discover()` on a provider already
  known to be down and hoping it throws consistently (Engine Isolation
  Invariants: "how does this Task fail when a sibling Engine, provider,
  index, worker agent, network... is absent" → answer: that one provider is
  skipped before any wasted call, everything else still returns).
- A **deprecated-but-available** provider is still consulted — deprecation
  is a warning, not a failure — and surfaces in a new `warnings` field
  (`{providerId, message}`), separate from `degraded`.
- A provider that throws **during** `discover()` (available at probe time,
  fails anyway) is still captured under `degraded`, same as before Task 7.

Research note (Task 7, `continuedev/continue` re-inspected fresh —
`core/context/providers/index.ts`, main branch): provider registration
there is a **static compiled-in array** (`Providers: (typeof
BaseContextProvider)[]`) looked up by `.find()`; deprecation means the class
is **omitted from the array entirely** (two providers are commented out);
there is **no health-check, try/catch, or availability-probing anywhere**
in that path. **REJECTED** the static-array pattern (Library needs dynamic,
host-registered providers — including subprocess-backed ones, see
docs/ADAPTERS.md — not a compiled-in list). **REJECTED** deprecate-by-
omission (Task 3 already made `deprecated` a runtime-visible declaration
field; Task 7 keeps it visible in `warnings` rather than silently dropping
the provider). `probe`/`probeAll`/capability-based health signals have
**no upstream precedent** — Library-original, required by the Engine
Isolation Invariants' "explicit failure/degraded behavior."

## Reference provider: `ProjectFilesProvider`

`src/providers/projectFilesProvider.ts` reads a bounded local filesystem
tree (`root`, `maxDepth`, `maxFileBytes`, `maxFiles`, optional `extensions`
filter). `node_modules/`, `.git/`, `dist/`, `data/` are always skipped.
`retrieve()` rejects any `ref` that would resolve outside `root` (path
traversal) with `CONTEXT_VALIDATION_FAILED`. No network, no dependency on
any sibling engine — safe to build and test now, unlike adapters for
Memory/Study/Performance which would require live inter-engine calls out of
scope for this Execution (see docs/BOUNDARY.md §1 for what's deferred).

## The 24 operations (Task 6 + Task 15's `context.select` + Tasks 23/24/25/26/27/28 + Task 29)

`CONTEXT_OPERATIONS` (`src/contracts/operations.ts`). The first three are
Execution 01's registry/schema surface; seven are Task 6's pack lifecycle
(contract **1.1.0**); `context.select` is Execution 06's selector entry
point (contract **1.4.0**); five (`context.sweep`, `context.promote`,
`context.definition.*`) are Execution 09's Tasks 23/24 (contract
**1.7.0**); three (`context.autoContext.*`) are Execution 10's
Task 25 (contract **1.8.0**); the next three (`context.getByHash`,
`context.invalidateAffected`, `context.replay`) are Execution 11's Tasks
26/27/28 (contract **1.9.0**); and the final two (`context.detach`,
`context.list`) are Execution 12's Task 29 (contract **1.10.0**).

| Operation | Request (essentials) | Result |
|---|---|---|
| `context.request.validate` | a raw `ContextRequest` object | `{request}` — validated/normalized (docs/SCHEMA.md) |
| `context.providers.list` | `{}` | `{providers: ProviderDeclaration[]}` |
| `context.providers.discover` | `{request}` | `DiscoverAllResult` — fail-soft per-provider (see above) |
| `context.select` | `{request, maxCandidatesPerProvider?, maxItems?}` | `SelectResult` — ranked/deduped `items` (exactly `context.build`'s `items` shape), `excluded`, `degradedProviders`, `algorithm` (docs/RELEVANCE.md) |
| `context.build` | `{request, items: [{providerId, ref, title?, score?}], rankingVersion, creationReason, createdBy, requestId?, idempotencyKey?, mode?, ttlSeconds?}` | `{pack}` — persisted, immutable (docs/PACKS.md); item `score` is 1.6.0 additive, `mode`/`ttlSeconds` are 1.7.0 additive (docs/PACKS.md) |
| `context.preview` | same shape as `context.build` | `{pack, persisted: false}` — pure computation, no store access, no event |
| `context.get` | `{packId}` | `{pack}` — `CONTEXT_NOT_FOUND` if missing |
| `context.explain` | `{packId}` | `{pack, attachments, budgetConsumption}` — full reproducibility view; `budgetConsumption` is 1.6.0 additive (docs/PACKS.md) |
| `context.attach` | `{packId, target: AgentIdentity, note?}` | `{attachment}` — `CONTEXT_NOT_FOUND` if the pack is missing |
| `context.detach` | `{packId, attachmentId, actor: AgentIdentity}` *(1.10.0 additive)* | `{packId, attachmentId, detachedAt}` — removes exactly that attachment relation; `CONTEXT_NOT_FOUND` for an unknown pack, unknown attachment, or an attachment held by a different pack (docs/PACKS.md) |
| `context.list` | `{projectKey?, status?, mode?, limit?}` *(1.10.0 additive)* | `{packs: PackSummary[], count}` — newest-first bounded summary projection, never items/exclusions; `limit` 1–500, default 50 (docs/PACKS.md) |
| `context.invalidate` | `{packId, actor: AgentIdentity, reason}` | `{pack}` (status: `invalidated`) — `CONTEXT_CONFLICT` if already invalidated |
| `context.health` | `{}` | `DoctorReport` — never throws; reflects store health (integrity/journal mode/applied migrations) alongside provider health |
| `context.sweep` | `{at?}` *(1.7.0 additive)* | `{count, packIds}` — transitions past-TTL `"attach"`-mode packs to `expired` (docs/PACKS.md) |
| `context.promote` | `{packId, actor: AgentIdentity}` *(1.7.0 additive)* | `{pack}` — exempts an `"attach"`-mode pack from future sweeps; `CONTEXT_VALIDATION_FAILED`/`CONTEXT_CONFLICT` on a `"sync"`-mode, non-active, or already-promoted pack |
| `context.definition.create` | `{request, items, rankingVersion, creationReason, createdBy, name?, boundProjectionRef?}` *(1.7.0 additive)* | `{definition}` — persists a recipe only, builds nothing yet (docs/PACKS.md) |
| `context.definition.get` | `{definitionId}` *(1.7.0 additive)* | `{definition}` — `CONTEXT_NOT_FOUND` if missing |
| `context.definition.sync` | `{definitionId}` *(1.7.0 additive)* | `{definition, pack, changed}` — regenerates only when the definition's source content actually changed (docs/PACKS.md) |
| `context.autoContext.run` | `{request, maxCandidatesPerProvider?, maxItems?, rankingVersion?, creationReason, createdBy, targetAgent?}` *(1.8.0 additive)* | `AutoContextResult` — discriminated union on `decision: "suggested" \| "attached"`; only attaches (`mode: "attach"`) when the project's persisted policy explicitly allows it (docs/AUTO_CONTEXT.md) |
| `context.autoContext.getPolicy` | `{projectKey}` *(1.8.0 additive)* | `{policy: AutoContextPolicy \| null}` — `null` when never set |
| `context.autoContext.setPolicy` | `{projectKey, allowAutomaticAttachment, actor}` *(1.8.0 additive)* | `{policy}` — `CONTEXT_AUTO_CONTEXT_FORBIDDEN` when an actor of kind `"agent"` attempts `allowAutomaticAttachment: true` |
| `context.getByHash` | `{packHash, mode?}` *(1.9.0 additive)* | `{pack: ContextPack \| undefined}` — the active pack matching `packHash` (and `mode`, when given); mode-filtered lookup (docs/PACKS.md) |
| `context.invalidateAffected` | `{providerId, ref?, currentContentHash?, currentProviderVersion?, actor, reason?}` *(1.9.0 additive)* | `{count, packIds}` — precise, `pack_items`-indexed invalidation of only the packs referencing the changed source or provider version (docs/PACKS.md) |
| `context.replay` | `{packId}` *(1.9.0 additive)* | `ReplayResult` — `{reproducible, reason?, pack, replayedPack?, itemDiffs?, providerVersionsChanged?, rankingVersionChanged?, budgetChanged?}` (docs/PACKS.md) |
| `context.projection.handoff` | `{packId, projectionRef}` or `{definitionId}` *(1.12.0 additive)* | `{handoff: ProjectionHandoff}` — delivers a pack to Project_Projection through its (anticipated) `projection.ingest` contract, strictly by reference; every attempt is recorded `delivered`/`unavailable`/`failed` + event; fail-soft (never throws for delivery outcomes — only `CONTEXT_NOT_FOUND`/`CONTEXT_VALIDATION_FAILED` for input problems) (docs/PROJECTION.md) |
| `context.projection.listHandoffs` | `{packId?, limit?}` *(1.12.0 additive)* | `{handoffs: ProjectionHandoff[], count}` — bounded, newest-first attempt history (recovery: retry non-`delivered` rows) (docs/PROJECTION.md) |

`context.build`/`context.preview` still never call the selector themselves
(no coupling — `computePack()` has no dependency on `src/engine/selector.ts`):
the caller supplies the ordered item list; the engine's job is retrieval,
normalization (Task 4), cross-provider dedup (Task 17), budget enforcement,
and — for `build` only — immutable recording (Task 5, docs/PACKS.md). As of
Execution 06, that caller-supplied list may itself come from
`context.select` (Tasks 15/16, docs/RELEVANCE.md) — a separate, optional
upstream operation, not a change to `build`/`preview`'s own contract.

**No provider private store access:** the dispatcher and every pack
operation reach a provider only through the `ContextProvider` interface
(`discover`/`retrieve`/`healthCheck`) via the registry — never a provider's
internal fields or storage. This is structural (no other path exists in the
code, not merely a convention), verified by `test/t1_boundary.test.ts`'s
sibling-isolation test and by inspection: nothing under `src/engine/` or
`src/contracts/` imports a `providers/*` module's internals, only its public
`ContextProvider`-shaped export.

## 1.13.0 additive (Execution 15, Task 33)

Task 33 (context-content privacy filtering) — Phase VI. Purely additive:

- `ContextRequest` gains optional `contentFieldPolicies:
  SourceFieldPolicy[]` (`src/contracts/types.ts`) — source-specific FIELD
  policies (per-provider `redactedFields` dotted paths + `redactPatterns`
  regexes), validated and regex-compiled at the boundary
  (`src/engine/normalize.ts`). Applied BEFORE candidate normalization and
  re-verified at pack finalization by `src/engine/contentPolicy.ts` — the
  one owner, both seams (docs/PACKS.md, docs/SCHEMA.md).
- `ContextPackItem` gains optional `redactionCount` (absent when zero,
  excluded from `packHash`); `context.pack.built`'s payload gains
  `redactionCount` when the pack total is non-zero. Material that fails
  the finalize re-verification is excluded with the existing
  `privacy_violation` reason — no new error code, no migration.

## 1.12.0 additive (Execution 13/14, Task 32)

Task 32 (Integrate Context with Project Projection) — Phase V. Purely
additive:

- `context.projection.handoff` / `context.projection.listHandoffs`
  (`src/engine/projection.ts`) — the producer-direction counterpart of
  the consumer adapters: a pack is delivered to Project_Projection ONLY
  through its (anticipated) versioned CLI contract
  (`projection.ingest`, subprocess via `src/providers/cliContractClient.ts`),
  strictly by reference (packId/packHash/projectKey/mode/itemCount —
  never item content, never a `.library` file write). Every attempt is
  persisted (migration 6's `projection_handoffs` table) with an explicit
  `status: "delivered" | "unavailable" | "failed"` — fail-soft, never
  gating Context's own state — and audited via the new
  `context.projection.handoff` event. A `{definitionId}` form resolves a
  projection-bound definition's `currentPackId` + `boundProjectionRef`
  automatically (the persistent path). `Project_Projection` is verified
  absent (zero files), so today every real delivery records
  `unavailable` — the honest, observable degraded state
  (docs/PROJECTION.md).

## 1.10.0 additive (Execution 12, Task 29)

Two new operations and one new event, purely additive:

- `context.detach` (`src/engine/packs.ts` `detachPack` + `ContextStore.deleteAttachment`)
  — the inverse of `context.attach`: removes one `pack_attachments` row,
  keyed on BOTH ids, never touching the immutable pack row. The audit
  event fires only on a real deletion. An attachmentId belonging to a
  different pack is the same `CONTEXT_NOT_FOUND` as a fully unknown one
  (no cross-pack existence leak).
- `context.list` (`ContextStore.listPacks`) — a read-only, bounded,
  newest-first summary projection (`PackSummary`, `src/contracts/packs.ts`)
  filtered by `projectKey`/`status`/`mode` with `limit` 1–500 (default 50).
  Summaries never carry `items`/`exclusions`; detail remains per-pack via
  `context.get`/`context.explain`.

Task 30 (same Execution) added the MCP tool surface over the EXISTING
`context.build`/`context.preview`/`context.get` operations — no operation,
schema, or event change (docs/MCP.md).

## 1.11.0 additive (Execution 13, Task 31)

Task 31 (Build host/worker-agent neutrality) — Phase V. Purely additive:

- `ContextPack` gains `hostAgent: AgentIdentity | null` and
  `workerAgent: AgentIdentity | null` — the host/worker identities the
  pack was built for, captured from the (already-required) request at
  `computePack()` time and persisted via migration 5's nullable
  `host_agent_json`/`worker_agent_json` columns
  (`src/engine/store.ts`). Null on pre-1.11.0 rows (provenance was never
  recorded there) and for `workerAgent` whenever the request declared
  none. Deliberately excluded from `packHash`: content identity must stay
  agent-independent so the same task context from different agents shares
  one hash (and one pack row via `getByHash`/`dedupeByHash`) — proven by
  `test/t31_host_worker_neutrality.test.ts`. No operation, request-schema,
  or event change.
- `--format human` pack output renders `host:`/`worker:` lines when the
  provenance is recorded (docs/PACKS.md).

## 1.9.0 additive (Execution 11, Tasks 26/27/28)

Tasks 26 (cache keys), 27 (precise invalidation), 28 (reproducibility/
replay) — Phase IV, "MODES, CACHING, AND REPRODUCIBILITY". Purely
additive:

- `packHash`'s canonical hash input gains `privacyPolicy:
  {maxPrivacyClass, forbiddenTags}` (`forbiddenTags` sorted before
  hashing — `canonicalJson` sorts object keys, not array elements,
  docs/PACKS.md). Existing already-stored `packHash` values are untouched
  (computed once at build time, never recomputed retroactively).
- `BuildPackInput` gains optional `dedupeByHash?: boolean` (default
  `false` — every pre-1.9.0 caller's behavior is unchanged). New
  `context.getByHash` operation is the standalone lookup.
- New `pack_items` table (migration 4, `src/engine/store.ts`) — a
  derived, rebuildable reverse index (Engine Isolation Invariant),
  one row per `ContextPackItem` per pack, indexed on `(provider_id, ref)`.
  New `context.invalidateAffected` operation invalidates, in one bulk
  `UPDATE ... RETURNING`, only the packs referencing a changed
  single-source content hash or a provider-wide version bump — not the
  entire cache.
- New `context.replay` operation (`src/engine/replay.ts`): for a pack
  that is a `ContextDefinition`'s current pack, replays the definition's
  preserved recipe and reports whether it reproduces the same `packHash`;
  when it doesn't, a per-item diff (`unchanged`/`reordered`/
  `contentChanged`/`nowExcluded`/`newlyIncluded`) plus pack-level
  changed-flags (`providerVersionsChanged`/`rankingVersionChanged`/
  `budgetChanged`) explain why. A pack with no definition currently
  pointing at it reports a clear, actionable non-replayable reason
  instead of fabricating a request that was never preserved.

## 1.8.0 additive (Execution 10, Task 25)

Task 25 (Define Auto-Context as opt-in gated mode) — Phase IV. Purely
additive:

- New `AutoContextPolicy` type (`src/contracts/autoContext.ts`), a
  persisted, project-scoped, server-checked gate (not a caller-supplied
  per-request flag) — the real answer to "unless explicit user policy
  allows automatic attachment" (docs/AUTO_CONTEXT.md).
- New `context.autoContext.run` operation: always runs `context.select`'s
  underlying suggestion first; only builds (`mode: "attach"`, Task 23) +
  attaches when the policy explicitly allows it. Its result is a
  discriminated union on `decision` — a caller cannot reach `.pack`/
  `.attachment` without narrowing first.
- New `context.autoContext.getPolicy`/`.setPolicy` operations manage the
  policy. New error code `CONTEXT_AUTO_CONTEXT_FORBIDDEN`
  (`AutoContextForbiddenError`): only an actor of kind `"agent"` is
  refused, and only when enabling (`true`) — disabling (`false`) is never
  gated.

## 1.7.0 additive (Execution 09, Tasks 23/24)

Task 23 (Temporary Attach mode) and Task 24 (Persistent Sync mode) —
Phase IV, "MODES, CACHING, AND REPRODUCIBILITY". Purely additive:

- `BuildPackInput`/`context.build`/`context.preview` gain optional
  `mode?: "attach" | "sync"` (default `"sync"` — every pre-1.7.0 caller's
  behavior is unchanged) and, only for `"attach"`, `ttlSeconds?`.
  `ContextPack` gains `mode`, `expiresAt`, `promotedAt`, `promotedBy` — all
  excluded from `packHash` (docs/PACKS.md).
- New `ContextPackStatus` value `"expired"` — set only by the new
  `context.sweep` operation, status-columns-only (immutability preserved).
- New `context.promote` operation exempts an `"attach"`-mode pack from
  future sweeps — the real, testable half of "unless Projection is
  explicitly invoked" (docs/PACKS.md; `Project_Projection` itself remains
  entirely absent).
- New `ContextDefinition` type (`src/contracts/definitions.ts`) and three
  new `context.definition.*` operations — a persisted, create-only
  pack-building recipe bound to whichever pack most recently regenerated
  from it. `context.definition.sync` reuses `computePack()`/`buildPack()`/
  `previewPack()` entirely; only persists a new pack when the content-
  addressed `packHash` actually changed (docs/PACKS.md).
- `BuildPackItemInput` (previously defined in `src/engine/packs.ts`) moved
  to `src/contracts/packs.ts`, re-exported from its original path for
  compatibility — it's now also `ContextDefinition.items`' element type,
  and contracts-layer types never import from the engine layer (same
  reasoning as `RelevanceScore`'s 1.6.0 move).

## 1.6.0 additive (Execution 08, Tasks 21/22)

Task 21 ("ordered, typed sections with provenance markers and source
handles") required no contract change — already satisfied by the existing
`ContextPack.items` shape (docs/PACKS.md). Task 22 ("pack explainability")
closes its remaining gaps, purely additively:

- `ContextPackItem`/`ContextPackExclusion` gain an optional
  `score?: RelevanceScore` (`src/contracts/candidates.ts`) — a caller-
  supplied relevance-score breakdown (typically `context.select`'s output,
  piped straight through) carried onto whichever item/exclusion the
  corresponding `context.build`/`context.preview` input item became.
  Excluded from `packHash` (docs/PACKS.md).
- `context.explain`'s result gains `budgetConsumption` — a derived,
  explain-time-only summary of the pack's token/byte budget usage
  (docs/PACKS.md). Nothing new is persisted.

## Events

`ContextStore.appendEvent()` (`src/engine/store.ts`), metadata-only —
packId/hash/counts/reasons, **never** item content or excerpt text (same
discipline as Memory's `memory.*` events):

- `context.pack.built` — `{packId, projectKey, itemCount, exclusionCount, totalEstimatedTokens, packHash}`
- `context.pack.attached` — `{packId, attachmentId}`
- `context.pack.detached` — `{packId, attachmentId, detachedBy}` *(1.10.0 additive)* — fires only on a real deletion; a failed/repeat detach emits nothing
- `context.projection.handoff` — `{handoffId, packId, projectionRef, mode, status}` *(1.12.0 additive)* — fires once per recorded handoff attempt (both branches, like `context.autoContext.decided`: the audit record of the attempt IS the operation's effect alongside the persisted row)
- `context.pack.invalidated` — `{packId, reason}`
- `context.pack.swept` — `{count, packIds}` *(1.7.0 additive)* — fires only when `count > 0`, the one place "skip when empty" is correct here (zero rows really is zero mutation)
- `context.pack.promoted` — `{packId, promotedBy}` *(1.7.0 additive)*
- `context.definition.created` — `{definitionId, projectKey}` *(1.7.0 additive)*
- `context.definition.synced` — `{definitionId, packId, changed}` *(1.7.0 additive)* — fires unconditionally: a store write (`updateDefinitionAfterSync`) happens on both the `changed`/`unchanged` outcome
- `context.autoContext.decided` — `{projectKey, decision, itemCount}` or `{projectKey, decision, packId, attachmentId}` *(1.8.0 additive)* — fires on BOTH `"suggested"` and `"attached"` outcomes: the audit record of the gate's own decision, not a pack mutation (docs/AUTO_CONTEXT.md)
- `context.autoContext.policyUpdated` — `{projectKey, allowAutomaticAttachment, updatedBy}` *(1.8.0 additive)* — fires unconditionally on every `setPolicy` call
- `context.pack.cacheHit` — `{packId, packHash}` *(1.9.0 additive)* — fires when `dedupeByHash` reuses an existing pack instead of inserting one; a deliberate exception to "fires on real mutation" (audit-trail expectations on a call that normally does mutate), distinct in shape from `swept`'s "suppress at zero" rule
- `context.pack.invalidatedBatch` — `{count, packIds, providerId, ref?, reason}` *(1.9.0 additive)* — fires only when `count > 0` (ordinary mutation rule)

`context.preview`/`context.select` emit no event (no side effects at all).

## Failure behavior

All failures are typed `ContextEngineError` subclasses
(`CONTEXT_VALIDATION_FAILED`, `CONTEXT_CONTRACT_MISMATCH`,
`CONTEXT_NOT_FOUND`, `CONTEXT_CONFLICT`, `CONTEXT_PROVIDER_UNAVAILABLE`,
`CONTEXT_PROVIDER_CONTRACT_VIOLATION`, `CONTEXT_PRIVACY_VIOLATION`,
`CONTEXT_STORE_UNAVAILABLE`, `CONTEXT_MIGRATION_FAILED`,
`CONTEXT_AUTO_CONTEXT_FORBIDDEN`). The dispatcher
(`dispatch()`) never throws across the boundary — every failure becomes
`{ok: false, error: {code, message}}`. `context.health` itself never fails
the envelope even when the underlying store is unhealthy — the unhealthy
state is reported *inside* a `{ok: true, result: {healthy: false, errorCode, ...}}`
response, exactly like Memory's `doctor`/`memory.health`-equivalent pattern.
