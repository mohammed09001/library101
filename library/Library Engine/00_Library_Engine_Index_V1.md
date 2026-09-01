# Library Engine — Engine Set V1

- **Working Product:** Library
- **Document Type:** Engine Portfolio + Architecture Boundary Index
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define the current Library backend engine set, their boundaries, integration rules, build order, and extension model before engine-specific roadmaps and execution plans are written.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Scope
2. Backend-First Strategy
3. Current Engine Set
4. Shared Runtime Model
5. Independent Engines, Shared Intelligence
6. Inter-Engine Contract Rules
7. Canonical State and Events
8. Agent-Neutral Execution
9. Terminal-First Requirement
10. Game Integration Boundary
11. Engine Extension Model
12. GitHub Research Classification
13. Current Document Set
14. Recommended Build Sequence
15. Non-Goals
16. V1 Conceptual Architecture
17. Design Principles

---

# 1. Scope

This folder defines the current Library engine set discussed before game implementation begins.

The engines are backend capabilities first. They must be useful from the real terminal, Library CLI, and supported coding-agent environments before the first-person game is required.

The visual game will later become another client of the same runtime and contracts.

The current set contains ten principal engines:

```text
Library Engines
│
├── 01. Performance Engine
├── 02. Memory Engine
├── 03. Context Engine
│
├── 04. Repository Search Engine
├── 05. Repository Analysis Engine
├── 06. Repository Sync Engine
│
├── 07. Study / Document Engine
├── 08. Study Lineage / Versioning Engine
│
├── 09. Library Synchronization Engine
└── 10. Project Projection Engine
```

Performance already exists as an active engineering effort outside this document set. Its V1 file in this folder therefore defines only the Library boundary and integration contract. It intentionally does not replace or redesign the existing Performance roadmap.

---

# 2. Backend-First Strategy

The development sequence is deliberately backend-first.

```text
Build engines
    ↓
Expose terminal APIs
    ↓
Use from Library CLI
    ↓
Use from Claude / Codex / Gemini / OpenCode / other agents
    ↓
Stabilize contracts and storage
    ↓
Build game client
    ↓
Connect game to the same engines
```

An engine is not considered ready merely because a game screen can call it.

Before game integration, an engine should be:

- Invokable from the terminal.
- Testable without the game.
- Observable through structured events.
- Versioned through explicit contracts.
- Able to fail without corrupting unrelated engines.
- Usable by any supported agent through the common tool surface where relevant.

---

# 3. Current Engine Set

## 3.1 Performance Engine

Studies development runs and their evidence. It remains an existing engine that Library will integrate rather than redesign here.

## 3.2 Memory Engine

Owns durable project knowledge and retrieval. Other engines may query or propose knowledge to Memory, but they do not own Memory's canonical records.

## 3.3 Context Engine

Selects and composes bounded context for a task from Memory, Studies, repository state, Performance history, and other providers. It does not own the source knowledge.

## 3.4 Repository Search Engine

Discovers repositories from an intent, performs bounded inspection, extracts signals, ranks candidates, and explains why each candidate matches.

## 3.5 Repository Analysis Engine

Performs evidence-driven repository study. It owns the analysis workflow while the user-selected coding/research agent provides reasoning when needed.

## 3.6 Repository Sync Engine

Tracks source repository revisions, detects deltas, classifies impact, and determines when incremental re-analysis is required.

## 3.7 Study / Document Engine

Transforms analysis outputs and evidence into structured, renderable studies rather than storing raw agent answers as the primary artifact.

## 3.8 Study Lineage / Versioning Engine

Preserves immutable Study V1 → V2 → V3 history and links every version to its source revision, parent version, and supersession state.

## 3.9 Library Synchronization Engine

Synchronizes canonical Library state across CLI, coding-agent surfaces, project projections, and later the game client.

## 3.10 Project Projection Engine

Creates bounded project-facing views such as `.library/context/`, `.library/studies/`, generated summaries, and controlled two-way files.

---

# 4. Shared Runtime Model

All engines live behind one Library Local Runtime.

```text
Real Terminal       Coding Agents        Future Game
     │                   │                   │
     └──────────────┬────┴──────────────┬────┘
                    ▼                   ▼
              Library Tool Surface / API
                        │
                        ▼
                Library Local Runtime
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   Knowledge         Repository       Infrastructure
    Engines            Engines           Engines
```

The game does not own the canonical database.

The CLI does not own the canonical database.

Agents do not own the canonical database.

The Local Runtime is the stable host for engine contracts and canonical stores.

---

# 5. Independent Engines, Shared Intelligence

The engines are deliberately independent in ownership but related in capability.

Example:

```text
Repository Analysis
        │
        ├── queries Memory
        ├── requests Context
        ├── emits Analysis Result
        ▼
Study / Document
        │
        ▼
Study Lineage
```

Another example:

```text
Repository Sync
      ↓
Repository Delta
      ↓
Repository Analysis
      ↓
Study V2
      ↓
Memory Candidate
```

The correct relationship is capability consumption, not shared internal tables.

---

# 6. Inter-Engine Contract Rules

Every engine must publish an explicit contract.

Each contract should define:

- Engine identity.
- Engine version.
- Commands or methods.
- Input schemas.
- Output schemas.
- Events emitted.
- Events consumed.
- Required dependencies.
- Optional enrichment dependencies.
- Failure behavior.
- Privacy boundary.
- Storage ownership.

Forbidden pattern:

```text
Context Engine → opens memory.db directly
Study Engine   → opens performance.db directly
```

Required pattern:

```text
Context Engine
      ↓
memory.search(...)
      ↓
Memory Engine
```

This rule is central to future extensibility.

---

# 7. Canonical State and Events

Library uses one canonical state model with engine-owned domains.

Important changes should produce versioned events such as:

```text
memory.promoted
context.generated
repository.discovered
repository.changed
analysis.completed
study.created
study.version.created
projection.updated
sync.revision.committed
```

An event bus is infrastructure, not an engine that owns domain meaning.

Every event should include enough identity and revision information to support replay, catch-up, and loop prevention.

---

# 8. Agent-Neutral Execution

Library engines are not Claude engines, Codex engines, Gemini engines, or OpenCode engines.

Agents are replaceable reasoning and execution workers.

```text
Engine Workflow
      ↓
Agent Execution Broker
      ↓
User-selected Agent Adapter
      ↓
Claude / Codex / Gemini / OpenCode / Future Agent
```

The user remains the authority over which available agent performs a search, analysis, review, or other agent-backed task.

Agent infrastructure is shared support infrastructure:

- Agent Registry.
- Agent Adapter Layer.
- Agent Execution Broker.
- MCP / tool surface.
- Capability discovery.
- Authentication status.
- Workspace and permission policy.

---

# 9. Terminal-First Requirement

Every relevant engine must expose a useful terminal surface before game integration.

Conceptual examples:

```text
library search "local-first repository sync"
library analyze github.com/example/repo --agent codex
library study show example/repo
library study diff example/repo v1 v2
library memory search "authentication decision"
library context build --task "refactor authentication"
library repo sync example/repo
library project project-view
```

Typed tool APIs are preferred underneath the CLI so the same capability can be exposed to coding agents and later to the game.

---

# 10. Game Integration Boundary

The future game consumes the same public contracts.

Example:

```text
Study Engine
    ↓
Structured Study Record
    ↓
Game Adapter
    ↓
Book / Shelf / Viewer
```

The Study Engine never needs to know what a 3D book looks like.

Likewise:

```text
Memory Engine
    ↓
Memory Query API
    ↓
Game Adapter
    ↓
Memory Room / Shelf / Search UI
```

This keeps game design replaceable without rewriting engine logic.

---

# 11. Engine Extension Model

Future engines must be addable without redesigning the current ten.

A future engine should register:

```text
EngineManifest
├── engine_id
├── version
├── capabilities
├── commands
├── emitted_events
├── consumed_events
├── required_engines
├── optional_engines
└── storage_namespace
```

Rules:

- Engine IDs are stable and globally unique inside Library.
- Storage namespaces are engine-owned.
- APIs are versioned.
- Events are versioned.
- Optional dependencies must degrade gracefully.
- New engines must not require changes to unrelated private stores.
- Cross-engine relationships use stable IDs, never fragile file paths.

---

# 12. GitHub Research Classification

The GitHub research performed for this engine set is divided into four categories.

## Integrate Candidate

A project may be suitable as a direct implementation dependency after license, maintenance, platform, and security review.

## Supporting Component

A focused library or tool may provide one subsystem without defining the engine architecture.

## Architecture Reference

The repository is useful to study, but Library should implement its own domain boundary and workflow.

## Future / Optional

The project solves a real problem that Library may not need in V1.

A repository being listed in an engine document does **not** automatically authorize copying its code. License review remains mandatory before direct reuse.

Sourcebot is specifically treated as an architecture reference because its current repository uses FSL-1.1-ALv2 with a competing-use restriction before the future Apache license date.

---

# 13. Current Document Set

```text
Library Engine/
│
├── 00_Library_Engine_Index_V1.md
├── 01_Performance_Engine_V1.md
├── 02_Memory_Engine_V1.md
├── 03_Context_Engine_V1.md
├── 04_Repository_Search_Engine_V1.md
├── 05_Repository_Analysis_Engine_V1.md
├── 06_Repository_Sync_Engine_V1.md
├── 07_Study_Document_Engine_V1.md
├── 08_Study_Lineage_Versioning_Engine_V1.md
├── 09_Library_Synchronization_Engine_V1.md
└── 10_Project_Projection_Engine_V1.md
```

---

# 14. Recommended Build Sequence

The engine roadmaps may later refine this order, but a practical dependency-aware sequence is:

```text
Foundation contracts / Local Runtime
        ↓
Repository Search
        ↓
Repository Analysis
        ↓
Study / Document
        ↓
Study Lineage
        ↓
Repository Sync
        ↓
Memory
        ↓
Context
        ↓
Project Projection
        ↓
Library Synchronization hardening
        ↓
Game integration
```

Performance continues on its existing path and is integrated through its Library boundary once its current implementation reaches the intended baseline.

Some infrastructure work — Agent Registry, MCP/tool surface, canonical IDs, event envelope, and permissions — should begin early because several engines depend on it.

---

# 15. Non-Goals

This document set does not yet define:

- Final database technology for every engine.
- Final game UI.
- 3D assets or world design.
- Final commercial packaging.
- Final cloud synchronization service.
- Automatic agent selection as a mandatory behavior.
- A single graph database as the foundation for all knowledge.
- A vector database requirement for V1.
- A requirement that every engine be a separate OS process or network microservice.

Independent engine ownership is a software architecture rule. It does not force distributed deployment.

---

# 16. V1 Conceptual Architecture

```text
                           USER
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
       Library CLI      Coding Agent      Future Game
            │               │                │
            └───────────────┼────────────────┘
                            ▼
                    Tool / API Surface
                            │
                            ▼
                    LIBRARY LOCAL RUNTIME
                            │
   ┌────────────────────────┼────────────────────────┐
   │                        │                        │
   ▼                        ▼                        ▼
Knowledge Engines     Repository Engines      Infrastructure
   │                        │                        │
   ├ Memory                 ├ Search                ├ Synchronization
   ├ Context                ├ Analysis              ├ Projection
   ├ Study                  └ Repository Sync       ├ Event Bus
   ├ Study Lineage                                   ├ Canonical IDs
   └ Performance                                     └ Agent Broker

                            │
                            ▼
                      Canonical Stores
```

---

# 17. Design Principles

- **Backend first. Terminal usable. Game ready.**
- **Independent engines, shared intelligence.**
- **One canonical state, many interfaces.**
- **Engines own workflows; agents provide reasoning.**
- **The user owns agent selection.**
- **No direct cross-engine database access.**
- **Evidence before agent interpretation.**
- **Structured artifacts before presentation skins.**
- **Immutable lineage where history matters.**
- **Optional enrichment must degrade gracefully.**
- **Local-first by default.**
- **Future engines are added through contracts, not special cases.**
