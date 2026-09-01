# Library — Performance Engine V1

- **Working Product:** Library
- **Document Type:** Existing Engine Integration Boundary
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define how the existing Performance engine enters Library without redesigning the active Performance implementation or duplicating its current roadmap.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Role
2. Existing-Engine Boundary
3. Engine Ownership
4. Library Inputs
5. Library Outputs
6. Inter-Engine Contracts
7. Terminal Surface
8. Events
9. Storage Boundary
10. Game Integration Boundary
11. GitHub Research Position
12. Non-Goals
13. V1 Conceptual Architecture
14. Design Principles

---

# 1. Engine Role

Performance is the development-observation and analysis engine that studies the relationship between user intent, coding-agent execution, actual repository changes, verification, and resulting outcome.

The current engineering effort for Performance already exists independently of this Library engine-document set.

Library therefore treats Performance as an existing engine to integrate rather than a blank engine to redesign.

Conceptually:

```text
User Prompt
    ↓
Coding-Agent Execution
    ↓
Repository Changes
    ↓
Verification
    ↓
Outcome
    ↓
Performance Analysis
```

---

# 2. Existing-Engine Boundary

This V1 document intentionally does not redefine:

- The existing Performance roadmap.
- Existing task numbering.
- Existing implementation details.
- Existing domain architecture already established by the Performance project.

The Library-specific work is to provide a stable adapter around the completed Performance capabilities.

```text
Existing Performance Core
          │
          ▼
Library Performance Adapter
          │
          ├── CLI
          ├── Memory
          ├── Context
          ├── Sync
          └── Future Game
```

---

# 3. Engine Ownership

Performance owns development-run interpretation and performance-domain records.

It may own records such as:

- Prompt run identity.
- Agent identity for the observed run.
- Execution window.
- Actual change set references.
- Verification references.
- Outcome analysis.
- Parent run analysis.
- File-level child analysis.
- Historical performance comparisons.

Performance does **not** own:

- Project Memory canonical facts.
- Repository Study documents.
- Study version lineage.
- Context Pack composition.
- Repository discovery.
- General Library synchronization.
- Game presentation.

---

# 4. Library Inputs

Performance may receive or reference:

- Prompt evidence.
- Agent execution evidence.
- Repository change evidence.
- Verification evidence.
- Stable project identity.
- Agent identity.
- Timestamps and run correlation.

Optional Library enrichment may later include relevant Memory or project context, but these remain external inputs rather than Performance-owned storage.

---

# 5. Library Outputs

The Library adapter should expose structured outputs such as:

```text
PerformanceRun
PerformanceFileChange
PerformanceVerificationSummary
PerformanceFinding
PerformanceTrend
PerformanceEvidenceReference
```

These outputs can later be consumed by:

- Memory Engine.
- Context Engine.
- Project Projection Engine.
- Library Synchronization Engine.
- Future game views.

---

# 6. Inter-Engine Contracts

## Performance → Memory

Performance may propose verified lessons or recurring patterns as Memory Candidates.

It must not insert directly into Memory's private store.

## Performance → Context

Context may query relevant prior Performance runs for a current task.

## Performance → Projection

Project Projection may render bounded summaries for project-local use.

## Performance → Synchronization

Performance emits completion and update events into the shared event envelope.

## Study / Analysis → Performance

Studies and repository analysis may be referenced by Performance when they materially explain a run, but Performance does not own those artifacts.

---

# 7. Terminal Surface

Conceptual Library commands may include:

```text
library performance recent
library performance run <run-id>
library performance history --days 3
library performance compare <run-a> <run-b>
library performance explain <run-id>
```

The final command names should adapt to the existing Performance implementation rather than forcing unnecessary rewrites.

---

# 8. Events

Potential Library-facing events:

```text
performance.run.started
performance.run.completed
performance.analysis.completed
performance.finding.created
performance.trend.updated
```

Events must use shared project IDs and run IDs so other engines can link to them without accessing Performance storage directly.

---

# 9. Storage Boundary

Performance retains ownership of its domain records.

Other engines store only stable references when they need to relate their records to a Performance run.

Example:

```text
MemoryRecord
└── source_ref: performance://run/PR-00041
```

rather than duplicating the full Performance record.

---

# 10. Game Integration Boundary

The game later renders Performance records as documents, shelves, dashboards, or other visual objects.

Performance itself must remain unaware of those presentation choices.

```text
Performance API
      ↓
Game Adapter
      ↓
Performance Document / Shelf / Viewer
```

---

# 11. GitHub Research Position

No new GitHub repository research was assigned to Performance in this research cycle by design.

The current Performance implementation is the authoritative starting point for this engine.

GitHub projects researched for Search, Analysis, Sync, Memory, Context, Study, and agent infrastructure must not silently redefine Performance.

---

# 12. Non-Goals

Performance V1 in this folder does not:

- Replace the active Performance roadmap.
- Convert Performance into a Search engine.
- Convert Performance into a Memory engine.
- Automatically mutate source code.
- Choose the user's coding agent.
- Own game UI state.

---

# 13. V1 Conceptual Architecture

```text
Existing Performance Core
          │
          ▼
Library Performance Adapter
          │
    ┌─────┼──────────────┐
    ▼     ▼              ▼
   CLI  Context         Memory
          │              │
          └──────┬───────┘
                 ▼
          Shared Event Layer
                 │
                 ▼
            Future Game
```

---

# 14. Design Principles

- Integrate the existing engine; do not fork its meaning unnecessarily.
- Preserve Performance domain ownership.
- Expose structured records, not UI-specific objects.
- Use stable cross-engine references.
- Let Memory and Context consume Performance through contracts.
- Keep game presentation outside the engine.
