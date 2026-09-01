# Cross-Engine CLI Adapters (Tasks 8 + 9 + 10)

Implemented in `src/providers/cliContractClient.ts` (the one shared
mechanism — Anti-Accumulation Rule: not duplicated per adapter),
`src/providers/memoryContextProvider.ts` (Task 8),
`src/providers/studyContextProvider.ts` (Task 9), and
`src/providers/performanceContextProvider.ts` (Task 10).

## Why a CLI subprocess is the correct mechanism

There is no shared workspace between `Context` and any sibling engine
(verified in Execution 01/02 — each is an independent git repo, own
`package.json`). A direct TypeScript import across that boundary is
therefore both impossible and, per the Engine Isolation Invariants,
forbidden regardless ("never by reading another Engine's private physical
store"). The only mechanism that is actually isolation-respecting — never
touches a sibling engine's store, only its own published contract — is
exactly what Memory's own `docs/BOUNDARY.md` prescribes: call it "through a
registered provider using [the sibling engine's] own versioned contract."
Concretely: spawn that engine's own CLI as a subprocess
(`<engine>-cli contract call --operation <op> --request '<json>'`) and parse
its stdout envelope.

## `cliContractClient.ts`

- `resolveSiblingCli(...segments)` — resolves a path relative to the
  `library101/` sibling root, anchored on **this module's own file
  location** (`src/providers/cliContractClient.ts`, a fixed depth), never
  the caller's. Anchoring on the caller's location was tried first and was
  a real bug caught during this Execution's own test run: calling it from a
  test file (a different directory depth than `src/providers/`) resolved
  the wrong path (`C:\projects\Memory\...` instead of
  `C:\projects\library101\Memory\...`). Fixed before this report by
  anchoring on the fixed module location instead.
- `runCliJson(cliPath, args, {storePath?, timeoutMs=10000})` — spawns
  `node --experimental-strip-types <cliPath> ...args [--store storePath]`,
  bounded by a real timeout that kills a hung child, parses stdout as JSON.
  Throws `CliUnavailableError` uniformly for a missing CLI file, a spawn
  failure, a timeout, or non-JSON output — every adapter handles "the
  sibling engine isn't there" the same way. A non-zero exit code with
  otherwise-valid JSON is NOT an error here (both Memory's `doctor` and
  `contract call` legitimately exit 1 on an unhealthy/failed result while
  still printing a valid JSON body — verified against Memory's actual CLI).
- `callContract(cliPath, operation, request, opts)` /
  `callDoctor(cliPath, opts)` — the two shapes both adapters need.

## `MemoryContextProvider` (Task 8)

Verified against Memory's **real, current** CLI (re-checked fresh for this
Execution — Memory's contract had evolved to **1.4.0** / 14 operations since
Execution 01/02, ahead of its own stale docs, which the Authority order says
to trust over documentation). `discover()` maps directly onto
`memory.search` (current, `status: "active"`) or, when
`request.freshness.asOf` is set, Memory's own bi-temporal `asOf` parameter
(historical belief view) — the literal "current/historical" split from the
Task Source Requirement, not a fabricated relevance ranking (no selector
exists yet). `retrieve()` maps `memory.get` results onto `ContextCandidate`,
attaching Memory's provenance/epistemicClass/confidence/sourceKind as
`sourceMetadata` (contract 1.2.0, additive) — which `normalizeCandidate()`
(Task 4) passes straight into the already-existing but previously-unused
`NormalizedContextCandidate.structuredPayload` field.

`healthCheck()` runs Memory's `doctor` CLI and additionally compares
Memory's reported `contractVersion` major against `EXPECTED_MEMORY_MAJOR`
("1", what this adapter was built/verified against) — a major mismatch is
reported `degraded: true` with an explicit message, the "outdated" signal
Task 7 asks the registry to fail soft on.

## `StudyContextProvider` (Task 9) — honest scope

**`Study_Document` and `Study_Lineage_Versioning` are verified empty** in
this repository — no code, no CLI, nothing to call. This is a genuine
repository-reality conflict with Task 9's implicit assumption of a working
Study engine. Per the Execution Contract ("expose conflicts, and make the
smallest architecture-preserving change"), the adapter is built and fully
tested against an **anticipated** contract shape
(`study.search`/`study.get`, request/response types documented inline in
`studyContextProvider.ts`) rather than left unbuilt or faked as verified:

- `discover()` → `study.search` returns lightweight section refs only
  (`{studyId, version, sectionRef, title, estimatedTokens}`), encoded into a
  single `ref` string as `studyId::version::sectionRef` — never the whole
  study.
- `retrieve()` → `study.get` fetches exactly the caller-selected section(s),
  attaching `sourceRevision` (the Task Source Requirement's literal "source
  revision" field) as `sourceMetadata`.

Proven two honest ways, both in `test/t9_study_provider.test.ts`:
1. A fixture fake CLI (a temp `.mjs` file the test writes) responding in the
   anticipated shape — proves the adapter's request-building/response-
   parsing/mapping logic works end-to-end.
2. A test against the **real, currently-absent** `Study_Document` path —
   proves genuine graceful unavailability (`healthCheck()` reports
   unavailable without throwing) and that the Task 7 registry / Task 5
   `buildPack` absorb it fail-soft, exactly the scenario Task 7's "fail soft
   when unavailable" describes.

**This means Task 9's contract shape is unverified against a real target
and may need revision once a Study Engine Execution actually defines
`study.*` operations** — stated here plainly, not glossed over. What is
verified: the adapter pattern, the fail-soft behavior, and the response
mapping logic (against the fixture).

## `PerformanceContextProvider` (Task 10) — honest scope

**`Performance` does not exist under `library101/` at all** (verified
2026-08-30) — more absent than `Study_Document`'s empty placeholder
directory was for Task 9; there is no directory, no CLI, nothing to call.
This is exactly the case the Task Source Requirement itself names: "Retrieve
relevant historical runs/lessons through Performance contracts only, **with
explicit unavailable state if Performance is absent**." Built and tested
against an anticipated contract shape (`performance.search`/
`performance.get`) using the same `cliContractClient.ts` mechanism and the
same two-ways-honest proof as Task 9
(`test/t10_performance_provider.test.ts`):

1. A fixture fake CLI proves the request-building/response-parsing logic
   against the anticipated shape.
2. A test against the real, currently-absent `Performance` path proves
   `healthCheck()` reports unavailable without throwing, and that the
   Task 7 registry / Task 5 `buildPack` absorb it fail-soft — the literal
   "explicit unavailable state" clause, demonstrated, not asserted.

`discover()` maps onto `performance.search` (lightweight run refs: runId,
title, outcome); `retrieve()` maps `performance.get` onto a
`ContextCandidate` whose `content` is the run's recorded **lesson/summary
text** (the Task Source Requirement's literal "lessons") and whose
`sourceMetadata` carries `runId`/`outcome`/`metrics`/`recordedAt`.

**This means Task 10's contract shape is unverified against a real target**,
same honest caveat as Task 9 — it may need revision once a Performance
Engine Execution actually defines `performance.*` operations.

## Overriding the default sibling paths

- `LIBRARY_MEMORY_ENGINE_CLI` / `MemoryContextProviderOptions.memoryCliPath`
- `LIBRARY_STUDY_ENGINE_CLI` / `StudyContextProviderOptions.studyCliPath`
- `LIBRARY_PERFORMANCE_ENGINE_CLI` / `PerformanceContextProviderOptions.performanceCliPath`

All three also accept `storePath`, passed through as `--store <path>` on
every invocation (never inherited from CWD/env implicitly) so callers —
including tests — can point an adapter at a specific sibling-engine
database.

## Task 32 (Execution 14) — the producer direction

Every adapter above is CONSUMER direction (Context pulls material in).
Task 32 adds the inverse: `src/engine/projection.ts` +
`src/projection/projectionContractClient.ts` PUSH a built pack out to
Project_Projection through its (anticipated) `projection.ingest` CLI
contract, reusing `callContract` unchanged (one spawn mechanism, still).
The payload is strictly by-reference identifiers — never item content,
never a `.library` file write — and every attempt is recorded
`delivered`/`unavailable`/`failed` in migration 6's `projection_handoffs`
table plus a `context.projection.handoff` event. `Project_Projection` is
verified absent (zero files), so real deliveries record `unavailable`:
the same honest anticipated-contract posture as Study/Performance, now in
the producer direction (docs/PROJECTION.md).
