# Library — Synchronization Engine V1

- **Working Product:** Library
- **Document Type:** Cross-Interface State Synchronization Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define one-state-many-interfaces synchronization across Library Local Runtime, real terminal, coding-agent surfaces, project projections, and the future game client.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. One State, Many Interfaces
3. Library Sync vs Repository Sync
4. Engine Ownership
5. Canonical Revision Model
6. Event Envelope
7. Live Synchronization
8. Catch-Up Synchronization
9. Offline / Closed-Game Behavior
10. Loop Prevention
11. Conflict Model
12. Projection Synchronization
13. Agent Session Synchronization
14. Inter-Engine Contracts
15. Terminal Interface
16. Events
17. Storage and Replay
18. Security and Privacy
19. Graceful Degradation
20. GitHub Repositories and Lessons
21. V1 Recommendation
22. Non-Goals
23. V1 Conceptual Architecture
24. Future Evolution
25. Design Principles

---

# 1. Engine Vision

Library Synchronization makes work performed in one interface visible in every authorized interface that represents the same canonical state.

The foundational rule is:

> **One state, many interfaces.**

If a Repository Study is created from a real terminal, the future game should display it without creating another copy of the truth.

If a user adds an allowed note in the game, the real terminal should be able to retrieve the same note.

---

# 2. One State, Many Interfaces

```text
                   LIBRARY LOCAL RUNTIME
                           │
                    Canonical State
                           │
                   Event / Sync Layer
                           │
        ┌──────────────────┼─────────────────┐
        ▼                  ▼                 ▼
   Real Terminal     Coding Agents      Future Game
        │                  │                 │
        └──────────────────┼─────────────────┘
                           ▼
                    Project Projections
```

No separate Game database, Terminal database, and Claude database should represent independent truths.

---

# 3. Library Sync vs Repository Sync

Repository Sync tracks external source repositories.

Library Sync tracks Library's own state across its interfaces.

They may exchange events, but their responsibilities remain separate.

---

# 4. Engine Ownership

Library Sync owns:

- Cross-interface revision cursors.
- Shared event envelope.
- Catch-up protocol.
- Delivery state.
- Loop-prevention metadata.
- Projection synchronization coordination.
- Live client subscriptions.

It does not own:

- Study meaning.
- Memory meaning.
- Performance analysis.
- Repository source deltas.
- Game presentation state unrelated to shared knowledge.

---

# 5. Canonical Revision Model

V1 should use a monotonically increasing project or Library-state revision.

Example:

```text
Project Revision 1201
Project Revision 1202
Project Revision 1203
```

Clients can ask:

```text
Give me changes since revision 1201.
```

The revision does not replace engine-specific versions such as Study V3. It is a synchronization cursor.

---

# 6. Event Envelope

Common envelope:

```text
SyncEvent
├── event_id
├── event_type
├── event_version
├── project_id?
├── engine_id
├── aggregate_id
├── aggregate_revision?
├── sync_revision
├── origin
├── created_at
├── content_hash
└── payload_ref / bounded payload
```

The common envelope allows transport and replay without forcing all engines to share one domain schema.

---

# 7. Live Synchronization

When a client is open:

```text
Engine commits state
      ↓
Sync Event
      ↓
Subscribed client
      ↓
Client updates projection/view
```

Possible transports inside one desktop environment may include IPC, local sockets, WebSocket, or other runtime-appropriate mechanisms.

The transport remains replaceable.

---

# 8. Catch-Up Synchronization

A client that was closed should not require events to have been delivered live.

```text
Client last revision: 820
Current revision: 935
      ↓
request changes since 820
      ↓
replay bounded event/change stream
      ↓
client catches up to 935
```

If the event gap is too large or compacted, the client may request a fresh projection snapshot.

---

# 9. Offline / Closed-Game Behavior

The game is not the host of the engines.

Example:

```text
Game closed
    │
User works in Claude / Codex
    │
Studies, Memory, Performance, repository state change
    │
Local Runtime commits changes
    │
Game opens later
    │
Catch-up from last revision
```

This enables the principle:

> **Work outside the game builds the world while you are away.**

---

# 10. Loop Prevention

Two-way projections can create feedback loops.

Each update should carry:

- Event ID.
- Origin.
- Revision.
- Content hash.
- Projection ID when relevant.

Example:

```text
Canonical update
→ generated file write
→ filesystem watcher sees write
→ origin/hash identifies it as own projection
→ no duplicate canonical update
```

---

# 11. Conflict Model

V1 should avoid unnecessary concurrent-write complexity by defining ownership.

Examples:

```text
.library/generated/*
= Library-owned / read-only projection

.library/notes/*
= user-editable / two-way synchronization allowed
```

For canonical records with one authoritative writer, conflicts are prevented by ownership rather than solved by CRDT.

True simultaneous collaborative editing can be added later where justified.

---

# 12. Projection Synchronization

The Synchronization Engine coordinates with Project Projection rather than generating files itself.

```text
Canonical event
      ↓
Library Sync
      ↓
Projection Engine
      ↓
Managed file update
```

And for allowed reverse flow:

```text
User-editable file
      ↓
Filesystem watcher
      ↓
Projection Engine validation
      ↓
Canonical update
      ↓
Library Sync event
```

---

# 13. Agent Session Synchronization

Where supported by safe official integration surfaces, session state may be synchronized.

Possible shared state:

```text
agent.session.started
agent.session.active
agent.session.ended
```

The future game may display `CLAUDE CODE — ACTIVE`, but this does not mean the game owns or controls the Claude process.

---

# 14. Inter-Engine Contracts

Every engine emits domain events through the shared event envelope.

Library Sync delivers or replays them.

Examples:

```text
Memory → memory.promoted
Study → study.created
Lineage → study.version.created
Repository Sync → repository.changed
Performance → performance.run.completed
Projection → projection.updated
```

Library Sync does not reinterpret those domain events.

---

# 15. Terminal Interface

Conceptual commands:

```text
library sync status
library sync revision
library sync changes --since 1201
library sync clients
library sync repair <project-id>
```

Most users should not need to manually run synchronization for normal local operation.

---

# 16. Events

Library Sync may emit infrastructure events:

```text
sync.revision.committed
sync.client.connected
sync.client.caught_up
sync.delivery.failed
sync.conflict.detected
sync.projection.requested
```

---

# 17. Storage and Replay

V1 should retain enough change history for reliable catch-up.

Possible model:

```text
Canonical domain stores
       +
Append-oriented sync/event journal
       +
Periodic projection snapshots
```

The journal should not become the only source of domain truth unless a deliberate event-sourced architecture is chosen later.

---

# 18. Security and Privacy

Synchronization must enforce authorization at the receiving surface.

Do not assume every connected client may receive every engine payload.

The event envelope may carry references instead of sensitive full payloads so clients retrieve authorized details through engine APIs.

---

# 19. Graceful Degradation

If a live transport fails:

```text
Canonical engine commit still succeeds
      ↓
Client misses live event
      ↓
Catch-up succeeds later
```

A disconnected game must not block terminal work.

---

# 20. GitHub Repositories and Lessons

## automerge/automerge-repo

Repository: https://github.com/automerge/automerge-repo

**Classification:** Strong Architecture Reference; optional future component.

Useful ideas:

- Core document repository separated from storage adapters.
- Network adapters.
- Event dispatch.
- Filesystem and browser-storage adapters.
- WebSocket and MessageChannel transports.

Most useful lesson: synchronization architecture should separate canonical data semantics from transport/storage adapters.

Automerge CRDT itself is not required for Library V1.

## yjs/yjs

Repository: https://github.com/yjs/yjs

**Classification:** Future / Optional CRDT Reference.

Useful ideas:

- Network-agnostic synchronization.
- Offline edits.
- Version snapshots.
- Conflict-free concurrent shared types.

Use only if Library introduces truly concurrent multi-writer documents.

## electric-sql/electric

Repository: https://github.com/electric-sql/electric

**Classification:** Architecture Reference.

Useful ideas:

- Partial replication.
- Incremental delivery.
- Explicit subset selection through Shapes.
- Sync as a dedicated read/delivery path.

Library can borrow the projection principle: send only the state a client needs.

## notify-rs/notify

Repository: https://github.com/notify-rs/notify

**Classification:** Strong Supporting / Integrate Candidate.

Useful role:

- Cross-platform filesystem change notifications for Project Projection two-way files.

---

# 21. V1 Recommendation

Build Library Sync V1 with:

- One Local Runtime authority.
- Shared event envelope.
- Monotonic sync revision.
- Live subscription channel.
- Catch-up by revision.
- Projection snapshots.
- Loop-prevention metadata.
- Explicit writer ownership.

Do not add CRDTs until a concrete concurrent-editing requirement appears.

---

# 22. Non-Goals

Library Sync V1 is not:

- Repository revision tracking.
- A cloud collaboration platform.
- A CRDT requirement.
- A game-state engine for purely visual local animation.
- A shared database that destroys engine ownership boundaries.

---

# 23. V1 Conceptual Architecture

```text
Engine Commit
    │
    ▼
Domain Store
    │
    ▼
Sync Revision + Event Journal
    │
 ┌──┼───────────────┬────────────────┐
 ▼  ▼               ▼                ▼
CLI Agent Tool   Project Projection Future Game
 │   │               │                │
 └───┴─────── request changes since revision ──┘
```

---

# 24. Future Evolution

Possible future additions:

- Remote personal-library synchronization.
- Multi-device sync.
- CRDT-enabled user notes.
- Cloud relay.
- Encrypted replication.
- Public-library publishing projections.
- Multi-user shared libraries.

---

# 25. Design Principles

- One canonical state, many interfaces.
- Live delivery is optional; catch-up correctness is mandatory.
- Ownership prevents many conflicts more cheaply than CRDTs.
- Transport is replaceable.
- Domain engines own meaning; Sync owns delivery and revision cursors.
- A closed game never blocks productive terminal work.
