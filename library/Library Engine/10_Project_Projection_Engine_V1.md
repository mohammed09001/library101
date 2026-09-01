# Library — Project Projection Engine V1

- **Working Product:** Library
- **Document Type:** Project-Facing Knowledge Projection Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define how canonical Library knowledge is exposed as bounded project-local files and views without turning project files into a second canonical database.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Projection vs Canonical Storage
3. Engine Ownership
4. Project Anchor Relationship
5. Proposed `.library/` Layout
6. Projection Types
7. Read-Only Generated Projections
8. Two-Way User Files
9. Context Projections
10. Study Projections
11. Memory Projections
12. Projection Manifest
13. Filesystem Watcher
14. Loop Prevention
15. Validation and Security
16. Inter-Engine Contracts
17. Terminal Interface
18. Events
19. Failure and Recovery
20. GitHub Repositories and Lessons
21. V1 Recommendation
22. Non-Goals
23. V1 Conceptual Architecture
24. Future Evolution
25. Design Principles

---

# 1. Engine Vision

Project Projection makes Library knowledge visible and usable inside a real project directory without duplicating canonical ownership.

Agents, editors, scripts, and users often work naturally with files.

Library should therefore be able to project selected knowledge into project-local files while preserving one canonical state in the Local Runtime.

---

# 2. Projection vs Canonical Storage

A projection is a view.

It is not the canonical database.

```text
Canonical Study
      ↓
Study Projection
      ↓
.library/studies/example.md
```

If the generated file is deleted, Library can regenerate it.

If the canonical Study is deleted according to policy, the projection must not silently resurrect it as canonical truth.

---

# 3. Engine Ownership

Project Projection owns:

- Projection definitions.
- Managed paths.
- Rendering to project-facing files.
- Reverse parsing for explicitly editable projections.
- Projection manifests.
- File-change intake.
- Projection health.

It does not own:

- Memory semantics.
- Study semantics.
- Context ranking.
- Performance analysis.
- General synchronization revisions.

---

# 4. Project Anchor Relationship

Project Projection resolves the stable project identity through the Project Anchor / registration layer.

The filesystem path is a current location, not the permanent project identity.

```text
Working Directory
      ↓
Project Anchor
      ↓
Stable Project ID
      ↓
Projection Configuration
```

---

# 5. Proposed `.library/` Layout

Initial conceptual layout:

```text
MyProject/
├── src/
├── tests/
└── .library/
    ├── project.json
    ├── context/
    ├── memory/
    ├── studies/
    ├── notes/
    └── generated/
```

The exact directories can change during implementation.

The important distinction is ownership, not folder naming.

---

# 6. Projection Types

Projection definitions may include:

```text
ProjectMetadataProjection
ContextPackProjection
StudySummaryProjection
MemorySummaryProjection
PerformanceSummaryProjection
UserNotesProjection
GeneratedIndexProjection
```

Each projection declares whether it is:

- Read-only generated.
- User-editable two-way.
- Ephemeral.
- Session-attached.

---

# 7. Read-Only Generated Projections

Examples:

```text
.library/generated/project-summary.md
.library/studies/repository-x-v2.md
.library/context/current-pack.md
```

These files should carry a generated marker and ideally an origin/revision digest.

Manual edits should either be rejected, overwritten on regeneration, or moved into a user-note workflow rather than silently becoming canonical changes.

---

# 8. Two-Way User Files

Some paths may intentionally support editing.

Example:

```text
.library/notes/architecture.md
```

Flow:

```text
User edit
   ↓
Filesystem watcher
   ↓
Projection parser
   ↓
Validation
   ↓
Canonical user-note update
   ↓
Library Sync event
```

Two-way support is opt-in by projection type.

---

# 9. Context Projections

A Context Pack can be attached to a project/session as a bounded file projection.

Example:

```text
.library/context/CP-0042.md
```

The file should contain:

- Pack ID.
- Task.
- Generated revision.
- Source references where useful.
- Bounded context content.

Context canonical composition remains Context-owned.

---

# 10. Study Projections

Study projections may expose:

- Current Study version.
- Historical version on request.
- Evidence links.
- Sync status metadata.

Projection filenames are presentation details. Stable Study IDs remain canonical.

---

# 11. Memory Projections

Memory projections should be conservative.

Do not dump all private project memory into project files by default.

Possible safe projections:

- Selected architecture decisions.
- Explicitly attached constraints.
- User-approved current-state summary.

The Memory Engine remains the source of truth.

---

# 12. Projection Manifest

Conceptual manifest:

```text
ProjectionManifest
├── projection_id
├── project_id
├── projection_type
├── source_engine
├── source_ref
├── source_revision
├── path
├── mode
├── content_hash
├── generated_at
└── parser_version?
```

This manifest helps detect drift and loops.

---

# 13. Filesystem Watcher

The watcher observes only managed paths relevant to enabled projections.

It should support:

- Cross-platform file events.
- Debouncing.
- Rename/move handling where possible.
- Content-hash verification.
- Recovery scans after missed events.

A file watcher event is not automatically a valid canonical change. Validation follows.

---

# 14. Loop Prevention

Projection writes can trigger their own watcher.

Use:

- Projection ID.
- Origin marker.
- Content hash.
- Source revision.
- Recent-write ledger.

Example:

```text
Library writes hash H at revision 51
watcher reports change hash H
Projection Engine recognizes own write
no reverse canonical mutation
```

---

# 15. Validation and Security

Project-facing files can be modified by users, tools, or untrusted repository content.

The engine must validate:

- Managed path boundaries.
- Symlink traversal.
- Allowed editable projection types.
- Maximum file size.
- Expected schema/format.
- Project identity.
- Secret-handling rules.

Do not allow a `.library` path to escape the project root through unsafe resolution.

---

# 16. Inter-Engine Contracts

## Context → Projection

Requests context file generation.

## Study → Projection

Requests Study rendering into project-local files.

## Memory → Projection

Provides explicitly allowed memory views.

## Performance → Projection

May expose bounded run summaries.

## Projection → Library Sync

Emits projection updates and validated reverse changes.

---

# 17. Terminal Interface

Conceptual commands:

```text
library project projections
library project project-view
library project projection refresh
library project projection attach-context <pack-id>
library project projection attach-study <study-id>
library project projection repair
```

---

# 18. Events

Potential events:

```text
projection.created
projection.updated
projection.file_changed
projection.reverse_update.accepted
projection.reverse_update.rejected
projection.drift_detected
projection.repaired
```

---

# 19. Failure and Recovery

Projection failures should never corrupt canonical engine data.

Recovery may include:

- Re-render one projection.
- Rebuild manifest.
- Rescan managed paths.
- Restore generated files from canonical state.
- Quarantine invalid two-way input.

---

# 20. GitHub Repositories and Lessons

## notify-rs/notify

Repository: https://github.com/notify-rs/notify

**Classification:** Strong Supporting / Integrate Candidate.

Useful capabilities:

- Cross-platform filesystem notifications.
- Linux, macOS, Windows, BSD, and polling backends.
- Debouncer companion packages.

This is a strong fit if the Local Runtime is Rust-based.

## unifiedjs/unified

Repository: https://github.com/unifiedjs/unified

**Classification:** Supporting Content-Projection Reference.

Useful role:

- Parse and render Markdown/structured content for controlled two-way document projections.

## automerge/automerge-repo

Repository: https://github.com/automerge/automerge-repo

**Classification:** Architecture Reference / Future Optional.

Useful lesson:

- Separate storage adapters and network adapters from canonical document semantics.

Library does not need CRDT semantics for ordinary generated projections in V1.

---

# 21. V1 Recommendation

Build Project Projection V1 with:

- Stable projection manifest.
- Explicit generated vs editable modes.
- Safe managed path resolver.
- Read-only generated defaults.
- notify-rs watcher if Rust runtime is confirmed.
- Content hashing and loop prevention.
- Context and Study Markdown projections first.

Memory projection should remain opt-in and conservative.

---

# 22. Non-Goals

Project Projection V1 is not:

- The canonical Library database.
- A general filesystem synchronization product.
- A CRDT editor.
- An unrestricted way for any project file to mutate Library state.
- A replacement for Context Packs or Studies.

---

# 23. V1 Conceptual Architecture

```text
Canonical Engine Record
        │
        ▼
Projection Definition
        │
        ▼
Renderer / Serializer
        │
        ▼
Managed Project File
        │
        ├── read-only generated → stop
        │
        └── editable path
              │
              ▼
        Filesystem Watcher
              │
              ▼
        Parser + Validation
              │
              ▼
        Canonical Update API
```

---

# 24. Future Evolution

Possible future additions:

- IDE virtual filesystem projections.
- Named agent-specific projections.
- Encrypted local projections.
- Remote workspace projections.
- CRDT-backed collaborative notes.
- Public-library export projections.

---

# 25. Design Principles

- Files are views unless explicitly declared authoritative input.
- Generated files are read-only by default.
- Two-way synchronization is opt-in.
- Stable IDs matter more than filenames.
- Canonical data survives projection deletion.
- Validate every reverse file update.
- Project boundaries are security boundaries.
