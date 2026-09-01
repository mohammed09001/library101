# Projection Integration (Task 32 — producer direction)

Implemented in `src/engine/projection.ts` (orchestration),
`src/projection/projectionContractClient.ts` (contract shape),
`src/engine/store.ts` migration 6 (`projection_handoffs`), exposed as
`context.projection.handoff` / `context.projection.listHandoffs` and the
CLI's `projection handoff` / `projection handoffs` commands.

## Task Source Requirement

> "Attach persistent or temporary packs through Projection contracts;
> Context never writes `.library` files directly."

## Research note

**Research target:** the Project_Projection engine itself.

**Locate current canonical state (verified 2026-09-01):**
`C:\Projects\Library101\Project_Projection` contains **zero files** — not
an empty placeholder, genuinely absent. There is no repository, no CLI, no
published contract, and no upstream documentation to inspect. This matches
docs/BOUNDARY.md's standing finding ("does not exist at all").

**Pattern extracted:** not from Projection (impossible — nothing exists),
but from Library's own established cross-engine discipline:

- Consumer adapters (Memory — verified real; Study/Performance —
  anticipated contracts, docs/ADAPTERS.md) call a sibling engine by
  spawning its CLI as a subprocess and parsing the versioned
  `{ok, contractVersion, operation, result|error}` stdout envelope
  (`src/providers/cliContractClient.ts` — the ONE cross-engine call
  mechanism; never a direct import, never a private store read).
- The MCP spec's identity/capability modeling (free-form `clientInfo`, no
  product enum) was re-verified during Execution 13 for the agent-facing
  surface.

**Decision: ADAPT (Library-owned, by extension of the existing pattern).**
Task 32 is the first PRODUCER-direction integration — Context hands packs
*to* a sibling. It reuses the same subprocess client unchanged and targets
an **anticipated** `projection.ingest` operation
(`PROJECTION_INGEST_OPERATION`) with the by-reference payload
`{source, sourceContractVersion, packId, packHash, projectKey, mode,
itemCount}`. Like Study/Performance, this shape is real, tested code
against an **unverified** contract: it must be revised once
Project_Projection publishes its actual contract. Nothing external was
integrated (no dependency, no license exposure).

## The two clauses, concretely

1. **"Attach persistent or temporary packs through Projection contracts."**
   Delivery of a built pack to Projection goes ONLY through the contract
   call (`projection.ingest`), for both modes — a pack's `mode` ("attach"
   temporary / "sync" persistent) is derived from the pack itself and
   carried in the ingest payload. The persistent path is ergonomic: a
   projection-bound `ContextDefinition` (`boundProjectionRef`, stored
   since Task 24) can be handed off by `definitionId` alone — its
   `currentPackId` + `boundProjectionRef` are resolved automatically
   (typically right after `context.definition.sync`).

2. **"Context never writes `.library` files directly."** There is no file
   write in the integration at all — the ingest payload is strictly
   by-reference identifiers (never item content; asserted by test against
   the exact bytes the contract call carried), and projection file
   rendering is Projection's own output on its side of the contract.
   `test/t32_projection_integration.test.ts` snapshots the filesystem
   around handoffs to prove no `.library` writes occur.

## Failure and degraded behavior (explicit, never silent)

Every attempt yields a persisted `ProjectionHandoff` row with an explicit
status and fires a `context.projection.handoff` audit event:

| Status | Meaning |
|---|---|
| `delivered` | Projection answered with an ok envelope. |
| `unavailable` | Projection's CLI could not be reached (missing/spawn/timeout/non-JSON — `CliUnavailableError`). **This is today's verified reality** and is a recorded, observable outcome — not an error thrown across the boundary. |
| `failed` | Projection answered with a contract error envelope (its code/message preserved in `detail`). |

- Handoff is **fail-soft by design**: Context's canonical state (pack
  rows, attachments, definitions) is never gated on Projection's
  availability — the engine stays fully usable from a terminal with
  Projection absent. Input problems (unknown pack/definition, missing
  ref, ambiguous forms) ARE typed errors (`CONTEXT_NOT_FOUND` /
  `CONTEXT_VALIDATION_FAILED`) and record nothing.
- Attempts are **insert-only history**: a retry after a non-delivery is a
  NEW row (nothing rewritten), so recovery = list handoffs, find
  non-`delivered` ones, re-run. `context.projection.listHandoffs`
  (bounded, newest-first, `packId`-filterable) is the observability
  surface.
- **Honest caveat (same posture as Study/Performance):** the anticipated
  `projection.ingest` contract has never been checked against a real
  Projection engine because none exists. When one appears, the operation
  name, payload, and envelope expectations here must be verified against
  its published contract and revised if needed.
