# Library Synchronization Engine — Roadmap of Tasks V1

- **Working Product:** Library
- **Engine:** Library Synchronization Engine
- **Document Type:** Engineering Task Roadmap
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Living implementation roadmap
- **Operating Strategy:** Backend-first → Terminal-usable → Agent-tool-usable → Game integration later.
- **Ordered implementation tasks:** 43
- **Architecture Rule:** Build independently, integrate through versioned contracts/events, never through another engine's private store.
- **Execution Rule:** Execution prompts compiled from this roadmap are self-contained; coding agents must not need this roadmap file at runtime.

# Roadmap Doctrine

This roadmap translates the V1 Engine design into implementable repository work. Task numbering expresses dependency order, not calendar estimates. Existing repository code that already satisfies a task must be verified and preserved rather than rebuilt. Every external project listed here is a research input; the implementation agent must inspect current upstream source/docs when the task materially depends on that behavior.

# External Research Baseline

- **automerge/automerge-repo** — Separates document core from pluggable storage/network adapters and supports local/offline synchronization. V1 Library has a single canonical Local Runtime, so CRDT adoption is benchmark/requirements-gated rather than default.
- **yjs/yjs** — Network-agnostic CRDT shared types, offline editing, snapshots, providers and conflict-free merging. Use only if true concurrent multi-writer document editing becomes a requirement.
- **electric-sql/electric** — Read-path synchronization and partial replication through Shapes. Adapt the idea of synchronizing only bounded projections relevant to each Library client rather than replicating all state everywhere.
- **notify-rs/notify** — Cross-platform filesystem notifications over OS-specific backends plus polling fallback. Use debounce/file identity/content hashes because filesystem event streams are not a canonical change log.
- **modelcontextprotocol/typescript-sdk** — Expose tools/resources/prompts through a standard agent-facing protocol. The 2026-07-28 MCP line uses a stateless protocol core and updated routing/auth semantics; verify the current SDK/spec during execution rather than coding against stale examples.

# Ordered Tasks

# PHASE I — ONE-STATE-MANY-INTERFACES FOUNDATION

## Task 1: Freeze Library Sync ownership

Library Sync coordinates cross-interface revisions/events/catch-up. Engines retain domain ownership and private stores; Repository Sync remains separate.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 2: Define global/project sync revision model

Create monotonic sync revisions or equivalent ordered cursor per scope, independent from engine-specific aggregate versions.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 3: Define common SyncEvent envelope

Include event_id/type/version, engine/aggregate IDs, aggregate revision, project scope, sync revision, origin, created_at, content hash and bounded payload/reference.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 4: Define client identity and cursor state

Track CLI/agent/project-projection/future-game clients with last acknowledged/replayed revision without making UI state canonical domain state.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 5: Define snapshot/projection contract

Clients can request bounded current snapshots when event gaps are compacted or first connecting; snapshots identify source revision/cursor.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 6: Publish Sync API/events

Define subscribe/poll/changes-since/snapshot/ack/health and internal event ingestion contracts.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE II — DURABLE EVENT INGESTION AND ORDERING

## Task 7: Build engine-event ingestion adapter

Accept committed domain events from engines only after their canonical transaction succeeds; map to common envelope without rewriting domain payload meaning.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 8: Build idempotent event persistence

Deduplicate event IDs/origin hashes and survive process restart; repeated provider delivery must not increment domain state twice.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 9: Build per-scope ordering and concurrency semantics

Define ordering guarantees across one project/aggregate and explicit weaker guarantees across unrelated engines.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 10: Build origin/content-hash loop prevention

Prevent a Projection-originated edit from being re-emitted back into an infinite write/watch loop.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 11: Build bounded payload/reference strategy

Keep large Study/Context/Memory content in owning stores; Sync transports IDs, revisions and small deltas where possible.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 12: Build event compaction policy

Compact old transport events only when snapshots/current domain state allow clients to catch up safely.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE III — LIVE AND CATCH-UP TRANSPORTS

## Task 13: Define local transport abstraction

Allow IPC/local socket/WebSocket/in-process adapters without binding Sync semantics to a single framework.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 14: Build in-process/local-runtime subscriber path

Support fast same-runtime clients and tests with deterministic delivery.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 15: Build local socket/WebSocket transport for external clients

Expose authenticated local transport suitable for CLI/desktop/future game with reconnect/cancellation.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 16: Build changes-since catch-up

Replay changes from client cursor in bounded pages and detect compacted/invalid cursors.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 17: Build snapshot fallback

When replay is impossible/too large, provide a consistent bounded projection snapshot plus new cursor.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 18: Build reconnect and duplicate delivery semantics

Clients may see at-least-once transport delivery; handlers use event IDs/revisions for idempotency.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE IV — INTERFACE ADAPTERS AND PROJECTIONS

## Task 19: Integrate Project Projection events

Projection publishes user-edit/generated state changes through Sync contracts and consumes invalidation/regeneration events.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 20: Integrate Study/Lineage events

Propagate Study created/version/current changes as IDs/revisions so clients refresh views.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 21: Integrate Memory events

Propagate promoted/revised/superseded memory events without copying restricted content into transport logs.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 22: Integrate Performance events

Consume Library-facing Performance adapter events when available; absent Performance is an explicit degraded capability.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 23: Integrate Repository Sync events

Propagate source repository changed/materiality/state events to relevant clients without conflating with Library Sync revision truth.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 24: Build agent-session client semantics

Agents/tools can request current state or changes since a cursor, but do not receive unrestricted push data outside permissions.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 25: Define future game client adapter contract

Specify subscriptions/snapshots needed by the future game while keeping game-specific rendering/state out of Sync V1.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE V — LOCAL-FIRST, CONFLICTS, AND OPTIONAL CRDT GATE

## Task 26: Build closed-game/offline catch-up behavior

Prove work continues in Local Runtime while game/client is closed and catches up later.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 27: Define single-authority conflict model

Generated projections are one-way; user-editable projections submit commands to canonical owner. Concurrent canonical writes use engine-specific optimistic revision/conflict rules.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 28: Build editable-file conflict workflow

When two-way user notes race with canonical revisions, preserve both inputs/conflict metadata rather than last-write-wins silently.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 29: Evaluate Automerge Repo adapter model

Study StorageAdapter/NetworkAdapter separation and offline resync; adopt architectural boundaries where useful but keep CRDT optional.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `automerge/automerge-repo`: inspect Repo/DocHandle lifecycle, StorageAdapter, NetworkAdapter, event dispatch. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 30: Evaluate Yjs concurrent-editing requirement

Benchmark only if true shared-document multi-writer editing appears; document why CRDT is accepted/rejected for V1.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `yjs/yjs`: inspect Y.Doc updates, state vectors, snapshots, provider separation. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 31: Adopt partial-projection sync concept

Use Electric-like Shapes conceptually: synchronize only data needed by a client/project view, not the full Library store.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `electric-sql/electric`: inspect Shapes, offset/cursor semantics, partial replication, client subscription model. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE VI — RELIABILITY, SECURITY, AND OPERATIONS

## Task 32: Build backpressure and slow-client policy

Bound queues, disconnect/force snapshot for lagging clients, and ensure one slow game/agent cannot stall domain commits.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 33: Build crash/restart recovery

Reopen event log/cursors, detect incomplete transport bookkeeping and resume without fabricating acknowledgements.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 34: Build local authentication/authorization

Authenticate external local clients and authorize project/engine/event scopes; local machine is not equivalent to unrestricted trust.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 35: Build privacy-aware event filtering

Remove or reference sensitive payloads according to client permissions before delivery.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 36: Instrument sync health

Measure event lag, queue depth, catch-up size, snapshot fallbacks, duplicate deliveries, conflicts, client reconnects and dropped/compacted events.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 37: Build the Sync CLI

Support status, clients, changes-since, snapshot, replay/repair diagnostics and health.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE VII — QUALIFICATION AND V1 GATE

## Task 38: Build deterministic multi-client fixtures

Simulate CLI, agent and projection clients with open/closed/reconnect states and engine events.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 39: Build idempotency/loop qualification

Replay duplicate events and filesystem-origin cycles; prove no infinite loop or duplicate canonical mutation.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 40: Build catch-up/compaction qualification

Disconnect clients across compaction boundary and prove replay or snapshot produces equivalent visible state.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 41: Build concurrency/conflict qualification

Exercise concurrent notes/engine updates, stale revisions and slow clients with explicit conflict/degraded states.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 42: Build privacy/auth qualification

Attempt cross-project/subscriber access and sensitive payload leakage over local transport.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 43: Final Library Synchronization Engine gate

Prove one-state-many-interfaces, closed-game catch-up, replaceable transports, bounded projections and optional-not-required CRDT architecture.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# Final Definition of Done

Library Synchronization Engine V1 is complete when every ordered Task is either verified as already satisfied or implemented, every Execution Prompt reaches YES, the Engine is usable from the real terminal without the game, cross-engine integration uses only versioned contracts, failure/degraded states are explicit, and final qualification proves the Engine's domain ownership rather than only compilation.
