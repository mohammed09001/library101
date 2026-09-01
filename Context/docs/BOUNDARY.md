# Library Context Engine — Frozen Product Boundary (v1.13.0)

Contract version: **1.13.0** (`CONTEXT_ENGINE_CONTRACT_VERSION`, `src/contracts/version.ts`).
This document freezes the Context Engine product boundary as delivered by
Execution 01 (Tasks 1–3), Execution 02 (Tasks 4–6), Execution 03
(Tasks 7–9), Execution 04 (Tasks 10–12), Execution 05 (Tasks 13–14),
Execution 06 (Tasks 15–17), Execution 07 (Tasks 18–20), Execution 08
(Tasks 21–22), Execution 09 (Tasks 23–24), Execution 10 (Task 25),
Execution 11 (Tasks 26–28), and Execution 12 (Tasks 29–30). The code
enforces it; this document is the
canonical statement of it.
Versioning: additive changes bump minor, breaking changes bump major.
Execution 04 registered three new providers and closed one gap
in an existing one, changing nothing about the API surface/schema (contract
stayed 1.2.0). Execution 05 added a fourth new provider (Task 13, no schema
change) and a fifth (Task 14) that required a genuine additive
`ContextRequest` schema field (`sessionContext`) — the contract moved
1.2.0 → 1.3.0. Execution 06 built the selector every prior Execution
deferred — a new `context.select` operation, a new
`ContextCandidate.relevanceHint` field, and a new `duplicate_content` pack
exclusion reason, all additive — moving the contract 1.3.0 → 1.4.0.
**Execution 07 closed the privacy-enforcement gap documented since
Execution 01** and extended budget accounting/pack assembly: a new
`TokenBudget.reservedFramingTokens` field, new
`ContextPackItem.actualBytes`/`.truncated`/`.fullEstimatedTokens` fields,
and a new `privacy_violation` exclusion reason, all additive — moving the
contract 1.4.0 → 1.5.0. **Execution 08 (Task 21) verified the assembler's
existing item shape already satisfies "ordered, typed sections with
provenance markers and source handles" — no schema change required — and
(Task 22) closed pack explainability's remaining gaps**: a new
`ContextPackItem`/`ContextPackExclusion.score?: RelevanceScore` field
(the type moved from `engine/relevance.ts` to `contracts/candidates.ts`,
re-exported for compatibility — docs/PACKS.md) and a new derived,
explain-time-only `context.explain` result field `budgetConsumption`
(nothing new persisted) — both additive, moving the contract
1.5.0 → 1.6.0. **Execution 09 (Task 23) built Temporary Attach mode**:
a new `ContextPack.mode`/`expiresAt`/`promotedAt`/`promotedBy` (a pack
built with `mode: "attach"` expires via the new `context.sweep`
operation unless explicitly exempted via the new `context.promote`
operation — the honest, testable half of "unless Projection is explicitly
invoked," since `Project_Projection` remains a completely empty sibling
directory) — and **(Task 24) built Persistent Sync mode**: a new
`ContextDefinition` type and three new `context.definition.*` operations
(a persisted, create-only pack-building recipe, regenerated via
`context.definition.sync` only when its bound source content's
content-addressed hash actually changed). All additive, moving the
contract 1.6.0 → 1.7.0. **Execution 10 (Task 25) defined Auto-Context as
an opt-in gated mode**: a new persisted, project-scoped
`AutoContextPolicy` (not a caller-supplied per-request flag — a real,
server-checked gate) and a new `context.autoContext.run` operation that
always suggests (`context.select`'s underlying computation, zero pack/
attachment writes) and only builds (`mode: "attach"`) + attaches when the
policy explicitly allows it; an actor of kind `"agent"` can never enable
automatic attachment, only disable it (new `CONTEXT_AUTO_CONTEXT_FORBIDDEN`
error code). All additive, moving the contract 1.7.0 → 1.8.0. **Execution
11 (Tasks 26/27/28) closed the caching/invalidation/reproducibility triad**:
`packHash` now also covers `privacyPolicy` (sorted `forbiddenTags`, so
Task 26's "cache by request normalization, source revisions, provider
versions, ranking version, privacy policy and budget" is genuinely
complete); a new optional `BuildPackInput.dedupeByHash` field and
`context.getByHash` operation let a caller reuse an existing active pack
of the same content-hash-and-mode instead of inserting a duplicate row
(new `context.pack.cacheHit` event); a new `pack_items` derived reverse
index (Engine Isolation Invariant — rebuildable, never canonical) and
`context.invalidateAffected` operation invalidate only the packs actually
referencing a changed `(providerId, ref)` or a provider-wide version bump,
not the entire cache (new `context.pack.invalidatedBatch` event); and a
new `context.replay` operation reconstructs (or honestly explains why it
cannot reconstruct) a `ContextDefinition`'s current pack from its
preserved recipe, with a per-item diff (including a dedicated `reordered`
kind, distinct from `contentChanged`) and pack-level changed-flags. All
additive, moving the contract 1.8.0 → **1.9.0**. **Execution 12 (Task 29)
completed the Task-6 pack-command set**: a new `context.detach` operation
(removes exactly one attachment relation — the mutable link, never the
immutable pack row; an attachment held by a different pack is the same
`CONTEXT_NOT_FOUND` as an unknown one, new `context.pack.detached` event),
a new `context.list` operation (bounded, newest-first `PackSummary`
projection, never items/exclusions), and a `--format human` CLI output
mode alongside the unchanged JSON default (JSON error contract preserved).
**Task 30** exposed the existing `context.build`/`context.preview`/
`context.get` operations as MCP tools through a new zero-dependency,
dual-era (2026-07-28 + legacy `initialize`) stdio server
(`src/mcp/server.ts`, docs/MCP.md) — a new caller surface, not a new
operation vocabulary. All additive, moving the contract 1.9.0 →
**1.10.0**. **Execution 13 (Task 31) made host/worker-agent provenance a
recorded property of every pack**: `ContextPack` gains
`hostAgent`/`workerAgent` (nullable `AgentIdentity`, migration 5),
captured from the build request — deliberately excluded from `packHash`,
whose content identity was already and remains agent-independent, so the
same task context from different agents still shares one hash (and one
pack row via `getByHash`/`dedupeByHash`). Null on pre-1.11.0 rows. All
additive, moving the contract 1.10.0 → **1.11.0**. **Execution 14
(Task 32) built the first PRODUCER-direction cross-engine integration**:
`context.projection.handoff` delivers a built pack to Project_Projection
through its (anticipated) versioned CLI contract — strictly by reference
(packId/packHash/projectKey/mode; never item content, never a `.library`
file write) — with every attempt recorded (`projection_handoffs`,
migration 6; `context.projection.handoff` events) as `delivered`/
`unavailable`/`failed`, plus `context.projection.listHandoffs`
observability and a `definitionId` form that resolves a projection-bound
definition's current pack automatically. `Project_Projection` itself
remains verified-absent (zero files), so delivery degrades to a recorded
`unavailable` without ever blocking Context's own state. All additive,
moving the contract 1.11.0 → **1.12.0**. **Execution 15 (Task 33) built
content privacy filtering**: a request may carry source-specific FIELD
policies (`contentFieldPolicies`) that redact provider material BEFORE
normalization — so hashes, dedup keys, ranking signals, and budget
accounting all see the filtered content — and are re-verified at pack
finalization, where still-redactable material is excluded
(`privacy_violation`) rather than serialized. Included items carry a
`redactionCount`; policies are validated and regex-compiled at the
request boundary. `packHash` continues to hash the (now-filtered)
excerpt, so content-addressed identity reflects exactly what may be
surfaced. All additive, moving the contract 1.12.0 → **1.13.0**.

## 1. What the Context Engine IS (delivered now)

- A **selector/composer of bounded task context**. As of this Execution it
  owns:
  - The **ContextRequest schema and validation** (Task 2,
    `src/contracts/types.ts` + `src/engine/normalize.ts`,
    docs/SCHEMA.md) — the task-intent contract every caller must satisfy
    before Context does any work.
  - The **Context Provider contract** (Task 3, `src/contracts/providers.ts`
    + `src/engine/registry.ts`, docs/CONTRACTS.md) — a provider-neutral
    interface for discovery/retrieval, and a registry that holds registered
    providers, lists their declarations, and runs fail-soft discovery across
    them.
  - **Candidate normalization** (Task 4, `src/contracts/candidates.ts` +
    `src/engine/normalizeCandidate.ts`, docs/CANDIDATES.md) — turning a raw
    provider `ContextCandidate` into a `NormalizedContextCandidate` with a
    Context-owned identity, computed relevance signals, a derived authority
    tier, an inherited privacy ceiling, and stable dedup keys.
  - **ContextPack assembly and its immutable build record** (Task 5,
    `src/contracts/packs.ts` + `src/engine/packs.ts` + `src/engine/store.ts`,
    docs/PACKS.md) — real SQLite persistence (`data/context-engine.db`,
    gitignored, `LIBRARY_CONTEXT_STORE` override), deterministic budget-
    ceiling enforcement (**not** a ranking/selection algorithm — see below),
    and a content-addressed `packHash` for reproducibility.
  - A **versioned contract surface**: the `ContextEngine` API
    (`src/engine/contextEngine.ts`), 24 named inter-engine operations
    dispatched through the versioned envelope (docs/CONTRACTS.md), the CLI
    (`src/cli/cli.ts`), and — since Execution 12 — the MCP stdio tool
    surface (`src/mcp/server.ts`, docs/MCP.md) over the three pack
    operations Task 30 names.
  - **Pack lifecycle events** (`context.pack.built/attached/detached/
    invalidated/...`, metadata-only, docs/CONTRACTS.md) — three at
    Execution 02, eleven by Execution 12.
  - **Provider registry capability probing** (Task 7,
    `src/engine/registry.ts`, docs/CONTRACTS.md) — `probe`/`probeAll`/
    `listByCapability`, and `discoverAll` now probes a provider's health
    *before* calling `discover()` on it, skipping an unavailable one
    entirely rather than calling it and hoping for a consistent throw.
  - **A live Memory adapter** (Task 8, `src/providers/memoryContextProvider.ts`,
    docs/ADAPTERS.md) — the first real cross-engine provider, verified
    against Memory's actual current CLI (contract 1.4.0) via a subprocess-
    spawned, versioned-contract-only call (`memory.search`/`memory.get`);
    never reads Memory's SQLite store.
  - **A Study adapter shaped for an anticipated contract** (Task 9,
    `src/providers/studyContextProvider.ts`, docs/ADAPTERS.md) — see the
    explicit caveat immediately below; it is real, tested code, but not
    verified against a real Study engine because one does not exist yet.
  - One **filesystem reference provider** (`ProjectFilesProvider`,
    `src/providers/projectFilesProvider.ts`) — proof the provider contract
    has real working behavior, not just paper types. **Execution 04, Task 12**
    closed a real gap against its Task Source Requirement ("... with
    ignore/privacy rules ..."): it now honors the project root's
    `.gitignore` (`src/providers/gitignoreMatcher.ts`, a bounded documented
    subset of the gitignore spec) in addition to its prior hardcoded
    `node_modules`/`.git`/`dist`/`data` skip list, opt-out via
    `respectGitignore: false`. Declaration version bumped to 1.1.0.
  - **A Performance adapter shaped for an anticipated contract** (Task 10,
    `src/providers/performanceContextProvider.ts`, docs/ADAPTERS.md) — same
    honest pattern as Task 9's Study adapter. `Performance` does not exist
    at all under `library101/` (verified 2026-08-30, more absent than
    `Study_Document`'s empty placeholder directory) — the Task Source
    Requirement itself anticipates this ("... with explicit unavailable
    state if Performance is absent"), proven both against a fixture fake CLI
    and against the real, absent path.
  - **A Repository Map provider** (Task 11,
    `src/providers/repositoryMapContextProvider.ts`, docs/REPOSITORY_MAP.md)
    — a local, filesystem-native provider (no sibling engine involved;
    `Repository_Search`/`Repository_Sync` are both verified empty) that
    builds a rank-ordered symbol/signature map inspired by Aider's RepoMap,
    with a hand-rolled zero-dependency PageRank core
    (`src/providers/repoMapRank.ts`) and regex-based symbol extraction
    (`src/providers/repoMapExtract.ts`) in place of tree-sitter/ctags — see
    docs/REPOSITORY_MAP.md for the full research note on what was
    integrated/adapted/rejected from upstream and why.
  - **A Git History provider** (Task 13, `src/providers/gitHistoryContextProvider.ts`,
    docs/GIT_HISTORY.md) — bounded `git log`/`git show` queries (never whole
    history) via the local `git` executable, spawned through
    `src/providers/gitProcess.ts` (built on `src/providers/processRunner.ts`,
    the spawn-with-timeout core extracted out of `cliContractClient.ts` so
    it isn't duplicated). A ref is a full commit sha, validated
    hex-pattern-only before it ever reaches a `git` argv (untrusted-ref
    defense). Proven against a real, freshly-created git repository — commit
    creation, bounded discovery, `--grep` relevance widening, patch
    truncation — and against this very `Context` repository itself (which
    has zero commits as of this Execution: `git_history` correctly reports
    healthy with an empty history rather than erroring).
  - **A Current Session/Agent provider** (Task 14,
    `src/providers/currentSessionContextProvider.ts`, docs/SCHEMA.md
    `sessionContext`) — accepts host-provided current file/selection/task/
    session metadata through a new, additive `ContextRequest.sessionContext`
    field (contract 1.2.0 → **1.3.0**, the one channel Context has to learn
    live host-side state since it is backend/terminal-first, not
    IDE-resident). Has no external dependency at all — `healthCheck()` is
    unconditionally healthy — and `discover()` returns `[]` (never an error)
    when the host supplies nothing, directly satisfying the Task Source
    Requirement's "absence must not break Context."
  - **The selector** (Tasks 15/16/17, `src/engine/relevance.ts` +
    `src/engine/dedup.ts` + `src/engine/selector.ts`, docs/RELEVANCE.md) —
    the piece every Execution through 05 explicitly deferred. A new
    `context.select` operation (contract 1.4.0) discovers across registered
    providers (reusing Task 3/7's fail-soft `discoverAll`), bounds +
    retrieves + normalizes candidates, deduplicates them across providers
    (Task 17), and ranks the survivors with a **deterministic, non-semantic**
    composite of five signals named by Task 15's Task Source Requirement:
    task term overlap, source authority, path/component overlap, recency,
    and explicit user pins (`requiredSources`/`forbiddenSources`, Task 2
    fields validated since Execution 01 but never enforced until now).
    Task 16 folds repository_map's PageRank centrality in as a SIXTH,
    separately-weighted signal via a new `ContextCandidate.relevanceHint`
    field (contract 1.4.0, additive) — structurally prevented from being
    mistaken for relevance itself (`test/t16_repo_map_graph_relevance.test.ts`
    proves a term-matching-but-uncentral file can outrank a central-but-
    unmatched one). `context.select`'s output is exactly
    `BuildPackInput.items` shape — pipes straight into `context.build`/
    `context.preview` with no translation, and those two operations remain
    fully usable with a hand-supplied item list exactly as before
    (backward compatible).
  - **Diversity, verified budget accounting, and real pinning/privacy
    enforcement** (Tasks 18/19/20, `src/engine/diversity.ts` +
    `src/engine/pinning.ts` + `src/engine/privacy.ts`, extending
    `src/engine/packs.ts`, docs/PACKS.md) — `computePack()` now runs five
    passes: retrieve+normalize, **privacy ceiling enforcement** (closing a
    gap documented since Task 3/Execution 01 — see docs/CONTRACTS.md's old
    "known limitation"), cross-provider dedup (Task 17, unchanged), **pin
    priority + diversity ordering** (a pin now guarantees first budget
    claim, not just ranking order; non-pinned candidates round-robin across
    providers so one provider can't monopolize a budget-limited pack), and
    **verified-byte budget enforcement with deterministic truncation** — a
    boundary item too large to fully include but large enough to matter
    (≥20 tokens' worth) is truncated and re-verified for its actual byte
    size, rather than wholesale excluded. A pin overrides neither privacy
    nor the hard token/byte ceiling — proven directly in
    `test/t20_pinning_and_privacy.test.ts`. `context.select` gained the
    same privacy filter, so it never suggests a candidate `context.build`
    would reject anyway.
  - **Pack explainability** (Task 22, extending `src/engine/packs.ts`,
    docs/PACKS.md) — `ContextPackItem`/`ContextPackExclusion` carry an
    optional caller-supplied `score: RelevanceScore` breakdown through to
    a built pack, and `context.explain` gains a derived, explain-time-only
    `budgetConsumption` summary. Task 21 needed no code change — the
    assembler's existing item shape already satisfied "ordered, typed
    sections with provenance markers and source handles."
  - **Temporary Attach mode and Persistent Sync mode** (Tasks 23/24,
    `src/engine/packs.ts` + new `src/engine/definitions.ts` +
    `src/contracts/definitions.ts`, docs/PACKS.md) — a pack built with
    `mode: "attach"` carries an `expiresAt` and is swept to `status:
    "expired"` past its TTL (`context.sweep`) unless explicitly exempted
    (`context.promote`) — the real, testable half of "unless Projection is
    explicitly invoked." A new `ContextDefinition` is a persisted,
    create-only pack-building recipe bound to whichever pack most recently
    regenerated from it (`context.definition.sync`, which only builds a
    new pack when the definition's source content's `packHash` actually
    changed — reusing `computePack()`/`buildPack()`/`previewPack()`
    entirely, zero duplicated assembly logic).
  - **Auto-Context as opt-in gated mode** (Task 25, new
    `src/engine/autoContext.ts` + `src/contracts/autoContext.ts`,
    docs/AUTO_CONTEXT.md) — `context.autoContext.run` always suggests
    (`context.select`'s computation, zero pack/attachment writes) and only
    builds (`mode: "attach"`) + attaches when a persisted, project-scoped
    `AutoContextPolicy` explicitly allows it; its result is a discriminated
    union on `decision` so a caller cannot reach `.pack`/`.attachment`
    without narrowing first. Only a non-agent actor may set
    `allowAutomaticAttachment: true` (disabling it is never gated).
  - **Cache keys, precise invalidation, and replay** (Tasks 26/27/28,
    `src/engine/packs.ts` + `src/engine/store.ts` + new
    `src/engine/invalidation.ts` + new `src/engine/replay.ts`,
    docs/PACKS.md) — `packHash` now covers `privacyPolicy` alongside its
    existing dimensions; `dedupeByHash`/`context.getByHash` let a caller
    reuse an existing active pack by content hash **and** mode instead of
    building a duplicate; a new `pack_items` derived reverse index lets
    `context.invalidateAffected` invalidate exactly the packs referencing
    a changed source or a provider-wide version bump, in one bulk
    statement, rather than a blanket sweep; `context.replay` reconstructs
    or honestly explains the non-reproducibility of a `ContextDefinition`'s
    current pack, with a per-item diff and pack-level changed-flags.

### Explicitly NOT yet implemented (future Execution)

**Selection/ranking is no longer fully deferred — but it is DETERMINISTIC,
not semantic.** Task 15's Task Source Requirement is explicit: rank on the
five named signals "before semantic methods." No embeddings, no vector
search, no ML ranking model exists in this Execution or any prior one —
`context.select`'s `deterministic_baseline_v1` algorithm is exactly what its
name says. A semantic/embedding-based relevance method remains a genuinely
future Execution's scope, layered alongside (not replacing) this baseline.

**Study_Document / Study_Lineage_Versioning do not exist yet** — verified
empty in this repository as of Execution 03. `StudyContextProvider` targets
an *anticipated* `study.search`/`study.get` contract (docs/ADAPTERS.md) that
has never been checked against a real Study engine's actual shape; it may
need revision once one exists. This is a genuine external blocker, not a
gap in Context's own implementation.

**Auto-Context's "never silently modify prompts" guarantee is scoped to
what Context itself controls** (Task 25) — Context does not own or ever
see a host agent's actual prompt text. What it guarantees: it never
automatically builds or attaches a pack absent an explicit, persisted,
human-set `AutoContextPolicy`, and a `"suggested"` result is structurally
distinguishable (a discriminated union, not an optional field) from an
`"attached"` one at compile time. What happens to a `"suggested"` result
after Context returns it — whether a host agent shows it to a user, folds
it into a prompt itself, or discards it — is entirely outside Context's
boundary, the same way a built pack's eventual use always has been.
`AutoContextPolicy` is also a single mutable row per project, not an
append-only/versioned history (Task 24's create-only immutability posture
was a deliberate choice for `ContextDefinition`'s recipe; a policy's
current value, not its full history, is what every check needs) — a full
change audit trail exists only as `engine_events`
(`context.autoContext.policyUpdated`), not as a queryable table.

**`ContextDefinition` recipe editing is out of scope** (Task 24, Execution
09) — `request`/`items`/`rankingVersion`/`creationReason` are set once at
`context.definition.create` and never mutated; create a new definition
instead. YAGNI: nothing in the Task Source Requirement asks for recipe
mutation, and this matches `ContextPack`'s own "define once" immutability.

**`Project_Projection` does not exist at all** (verified empty sibling
directory, same as Execution 03's finding for Study_Document/Study_Lineage_Versioning
but with zero files, not even a placeholder — re-verified 2026-09-01).
Since Execution 14 (Task 32), the CONTEXT side of the integration exists
and is real: `context.projection.handoff` delivers packs through the
anticipated `projection.ingest` contract (docs/PROJECTION.md), degrading
to a recorded `unavailable` while Projection stays absent. The
integration direction is producer-facing (Context → Projection), built on
the shared subprocess contract client; `boundProjectionRef` on
`ContextDefinition` is its persistent-path linkage. What does NOT exist
is the Projection side: the anticipated operation name, payload, and
envelope expectations are UNVERIFIED against any real sibling and must be
revised when Projection publishes its contract.

**Policy-triggered precise invalidation is out of scope** (Task 27,
Execution 11) — `context.invalidateAffected` targets a changed source
content hash or provider version, not a changed `privacyPolicy` ceiling
(e.g. "this policy tightened, invalidate every pack that now exceeds it").
`pack_items.privacy_class` is captured on every row specifically so a
future Execution can build this without a second migration; it is a
materially different query shape, not secretly cheap to add alongside the
above.

**Replay only covers a `ContextDefinition`'s CURRENT pack** (Task 28,
Execution 11) — `context.replay` requires a live reverse pointer
(`current_pack_id`) from a definition to the pack being replayed. A
definition's earlier, superseded packs (from before its most recent sync)
have no such pointer and report the same "not tracked for replay" outcome
as a pack built via a bare `context.build` call, even though they were
once genuinely produced from a preserved recipe. No pack history beyond
"current" is retained anywhere in this Execution.

As of Execution 05, every provider named in `KNOWN_PROVIDER_IDS` has a real
implementation except `study_lineage_versioning`, `repository_search`, and
`repository_sync` (all three verified-empty sibling engines with no adapter
built yet — there is nothing to adapt to).

**`request.privacyPolicy.maxPrivacyClass` is now enforced** (Task 20,
Execution 07, `src/engine/privacy.ts`) — closing the gap this document used
to describe as "providers are currently trusted to self-honor
`request.privacyPolicy`... the registry does not currently re-filter
provider output against those fields." That trust-only model is gone for
`maxPrivacyClass`: both `computePack()` and `context.select` now compare
every candidate's `privacyClass` (still provider-declared-ceiling
granularity, Task 4's original, unchanged limitation — not a per-item
classification) against the request's ceiling and exclude/never-surface a
violation. `privacyPolicy.forbiddenTags` remains genuinely unenforced — no
`ContextCandidate` anywhere in this codebase carries a `tags` field to check
it against, an honest limitation, not a skipped check (docs/RELEVANCE.md).

## 2. What the Context Engine is NOT (explicit non-ownership)

- **Not Memory** — durable knowledge (facts, decisions, preferences) is
  owned by the Memory Engine. Context never reads Memory's SQLite store; it
  calls Memory only through `MemoryContextProvider`
  (`src/providers/memoryContextProvider.ts`), which itself only ever calls
  Memory's own published CLI/versioned contract (`memory.*` operations) as a
  subprocess — never Memory's internals (docs/ADAPTERS.md).
- **Not Study, Performance, or repository truth** — owned by their source
  engines (Study_Document, Study_Lineage_Versioning, Repository_Sync,
  Repository_Search, Project_Projection). Context may only reach them
  through a declared `ContextProvider`, never by reading their private
  stores directly. `StudyContextProvider` (Task 9) and
  `PerformanceContextProvider` (Task 10) both exist but target anticipated
  contract shapes unverified against a real sibling engine, neither of which
  exists in this repository yet (docs/ADAPTERS.md). `RepositoryMapContextProvider`
  (Task 11) is different in kind: it reads the local filesystem directly
  (like `ProjectFilesProvider`), not a sibling engine — `Repository_Search`/
  `Repository_Sync` are both verified empty directories, so there is no
  sibling contract to call yet, and repo-map generation does not obviously
  belong to either of those engines' eventual scope regardless.
- **Not a cache** — the provider registry itself still holds only in-process
  references and persists nothing across restarts. The SQLite store added in
  Execution 02 persists exactly one thing: **built `ContextPack` rows**
  (immutable build records) and their attachments/events — never raw
  candidate content, never a copy of a provider's or sibling engine's
  payload. A pack row is a record of a past selection, not a cache of live
  material.
- **Not the future game** — every capability here is reachable from the CLI
  with no game client involved.

## 3. Interaction rules (Engine Isolation Invariants)

- Sibling engines are separate repositories with **no shared workspace** —
  Context cannot import another engine's TypeScript types even by mistake.
  Any future cross-engine call must go through that engine's own versioned
  contract (e.g. spawning its CLI, or a future RPC/IPC layer), never a
  direct import of its internals.
- A `ContextProvider` declares its own capabilities/cost/freshness/privacy
  (docs/CONTRACTS.md) — Context does not special-case any specific provider
  implementation in engine code.
- Stable identities (provider ids, request ids) are contracts, not
  permission to bypass the registry/dispatcher.

## 4. Failure and degraded behavior

- **No silent fallback.** Every validation failure is a typed
  `ContextEngineError` subclass with a machine-readable code
  (`CONTEXT_VALIDATION_FAILED`, `CONTEXT_CONTRACT_MISMATCH`,
  `CONTEXT_PROVIDER_UNAVAILABLE`, `CONTEXT_PROVIDER_CONTRACT_VIOLATION`,
  `CONTEXT_PRIVACY_VIOLATION`, `CONTEXT_NOT_FOUND`, `CONTEXT_CONFLICT`,
  `CONTEXT_STORE_UNAVAILABLE`, `CONTEXT_MIGRATION_FAILED`); the CLI exits
  non-zero with `{error:{code,message}}`.
- `doctor()`/`context.health` never throws: a provider that fails
  `healthCheck()` is reported under `degradedProviders`, and a store that
  fails to open/pass its integrity check is reported `healthy: false` with a
  typed `errorCode` — neither ever raises across the boundary.
- `ProviderRegistry.discoverAll()` is fail-soft: an unavailable provider is
  probed and skipped BEFORE `discover()` is ever called on it (Task 7); one
  that throws during `discover()` anyway (or during retrieve/build) is
  captured per-provider (`degraded: [{providerId, message}]`) and does not
  fail discovery/build for the other registered providers.
- Cross-engine adapters (Memory, Study — `src/providers/cliContractClient.ts`)
  report `CliUnavailableError` (missing CLI, spawn failure, timeout,
  non-JSON output) as `available: false` from `healthCheck()`, never as an
  unhandled throw — verified against a genuinely absent sibling engine
  (Study_Document) as well as a genuinely present one (Memory).
- `buildPack`/`previewPack` are fail-soft the same way: one item's provider
  failing to retrieve excludes only that item (`reason: provider_unavailable`),
  not the whole build (docs/PACKS.md). Since Execution 06 (Task 17), they
  also deduplicate cross-provider identical content BEFORE budget accounting
  (`reason: duplicate_content`) — a documented, superseding change to Task
  5's earlier "no further provider calls once budget is exhausted"
  optimization, since content-based dedup must see every item's retrieved
  content before budget can be finalized (docs/PACKS.md). Since Execution 07
  (Task 20), a candidate whose privacy class exceeds the request's ceiling
  is excluded (`reason: privacy_violation`) before dedup even runs, and a
  boundary item that doesn't fully fit the remaining budget is truncated
  in place (`truncated: true`) rather than always excluded outright, when
  the truncated remainder would still be usefully large (Task 19).
- A `ContextPack` is truly immutable after insertion: `invalidatePack`'s SQL
  statement (`src/engine/store.ts`) names only status columns — there is no
  code path that can rewrite a pack's content after `context.build`.

## 5. Agent neutrality and game independence

- `hostAgent`/`workerAgent`/`callerCapabilities` use a generic
  `{kind: human|agent|engine|tool, name, agentType?}` shape. No agent
  product is hard-coded anywhere in the engine. `agentType` is a free-form
  label, never a closed enum — an agent that does not exist yet works
  end-to-end today (proven by `test/t31_host_worker_neutrality.test.ts`
  with invented agentType strings).
- Since Execution 13 (Task 31), every built pack records which
  host/worker it was assembled for (`ContextPack.hostAgent`/
  `.workerAgent`), while `packHash` stays agent-independent — the same
  task context from different agents is content-identical and shareable
  via `getByHash`/`dedupeByHash`. Identity modeling matches the MCP
  spec's free-form `clientInfo` pattern (name/label, no product enum).
- The engine is fully usable from a terminal (`npm run cli -- …`). No game
  client is required for any behavior delivered in this Execution.

## 6. Boundary change policy

Any change to the API surface, operation vocabulary, `ContextRequest`
schema, or the provider contract requires a contract version bump and an
update to this document plus docs/SCHEMA.md / docs/CONTRACTS.md.
