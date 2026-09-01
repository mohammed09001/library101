# Library Engine Exit Plan — Execution Portfolio V1

- **Working Product:** Library
- **Document Type:** Backend Engine Engineering Roadmaps + Execution Prompt Portfolio
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Ready for staged repository execution
- **Strategy:** Build each Engine independently → expose through terminal/tool contracts → integrate Engines through versioned APIs/events → connect the future game only after backend contracts stabilize.

# Portfolio Rules

- Every Engine folder contains its V1 design document, a `Roadmap of Tasks`, and an `Execution/` folder.
- Execution files group one, two, or three tasks according to dependency and complexity; complex tasks are isolated when appropriate.
- Every Execution is self-contained and follows the supplied Midnight Performance Execution loop style, extended with mandatory Research Mode, Plan Challenge, licensing/version re-validation, Goal Review, Engineering Review, Repair Loop, and final evidence gates.
- Execution agents must inspect upstream GitHub repositories and official web documentation themselves when those references materially affect implementation.
- External repositories are references/components, not automatic dependencies. Library ownership and contracts remain authoritative.
- Performance is not regenerated here because the source engine already has an active 152-task roadmap; its supplied roadmap and Execution 01 are preserved as the existing program.

# Engine Portfolio

| # | Engine | Roadmap Tasks | Execution Prompts | Status |
|---:|---|---:|---:|---|
| 01 | Performance Engine | 152 (existing supplied roadmap) | Existing program; Execution 01 supplied | Active external engineering program |
| 02 | Library Memory Engine | 46 | 27 | Generated V1 execution plan |
| 03 | Library Context Engine | 42 | 21 | Generated V1 execution plan |
| 04 | Library Repository Search Engine | 46 | 22 | Generated V1 execution plan |
| 05 | Library Repository Analysis Engine | 52 | 30 | Generated V1 execution plan |
| 06 | Library Repository Sync Engine | 36 | 19 | Generated V1 execution plan |
| 07 | Library Study / Document Engine | 35 | 18 | Generated V1 execution plan |
| 08 | Library Study Lineage / Versioning Engine | 29 | 15 | Generated V1 execution plan |
| 09 | Library Synchronization Engine | 43 | 25 | Generated V1 execution plan |
| 10 | Library Project Projection Engine | 38 | 20 | Generated V1 execution plan |

# Folder Architecture

```text
Library Engine Exit Plan/
├── 00_Library_Engine_Execution_Index_V1.md
├── 00_Research_Reference_Index_V1.md
├── 00_Shared_Execution_Doctrine_V1.md
├── 01_Performance_Engine/
│   ├── 01_Performance_Engine_V1.md
│   ├── Performance_Existing_Roadmap_O2.md
│   └── Execution/
│       └── Performance_Existing_Execution_01.md
├── 02_Memory_Engine/ ...
├── 03_Context_Engine/ ...
├── 04_Repository_Search_Engine/ ...
├── 05_Repository_Analysis_Engine/ ...
├── 06_Repository_Sync_Engine/ ...
├── 07_Study_Document_Engine/ ...
├── 08_Study_Lineage_Versioning_Engine/ ...
├── 09_Library_Synchronization_Engine/ ...
└── 10_Project_Projection_Engine/ ...
```

# Recommended Execution Order

The order below minimizes circular dependency risk while still allowing each Engine to remain independently testable:

1. Shared Local Runtime contracts / Engine registry foundation already implied by the repository baseline.
2. Memory Engine foundation and deterministic retrieval.
3. Repository Search Engine provider/discovery foundation.
4. Repository Analysis deterministic evidence layers and agent-broker contract.
5. Study / Document Engine structured artifact pipeline.
6. Study Lineage / Versioning Engine.
7. Repository Sync Engine and incremental Analysis/Study triggers.
8. Context Engine provider composition after Memory/Study/Analysis surfaces exist.
9. Project Projection Engine.
10. Library Synchronization Engine integration/qualification across the available clients and projections.

This is not a command to build entire Engines serially. Foundational executions may run in dependency-aware slices, but no Engine may bypass another Engine's contract to accelerate integration.

# Research Foundation

See `00_Research_Reference_Index_V1.md`. Key current references include Zoekt for indexed code search; Octokit/GitHub APIs for discovery and sync; Tree-sitter + ast-grep + SCIP for deterministic repository evidence; Aider and Continue for context-selection patterns; unified/Pandoc for Study document pipelines; gix for Git plumbing; Automerge/Yjs/Electric for synchronization architecture; Mem0/Graphiti/Dolt for memory/temporal lineage patterns; and the current MCP SDK/spec for agent-facing tool surfaces.

# Final Portfolio Definition of Done

The backend engine phase is complete only when the Engines can be initialized and used from the real terminal, produce durable canonical state through their own contracts, interoperate without private-store coupling, survive required failure/recovery tests, and expose stable interfaces that a future game client can consume without moving domain logic into the game.
