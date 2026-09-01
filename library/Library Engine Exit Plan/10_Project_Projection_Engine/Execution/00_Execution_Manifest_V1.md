# Library Project Projection Engine — Execution Manifest V1

- **Tasks:** 38
- **Executions:** 20

| Execution | Tasks | Phase | Scope | File |
|---:|---|---|---|---|
| 01 | 1, 2, 3 | PHASE I — PROJECTION OWNERSHIP AND MANIFEST FOUNDATION | Freeze Projection vs canonical storage boundary; Define ProjectProjection identity and type contract; Define managed `.library/` layout policy | `Project_Projection_Engine_Execution_01.md` |
| 02 | 4, 5, 6 | PHASE I — PROJECTION OWNERSHIP AND MANIFEST FOUNDATION | Define ProjectionManifest; Define generated vs two-way vs ephemeral modes; Publish Projection contracts/events | `Project_Projection_Engine_Execution_02.md` |
| 03 | 7, 8 | PHASE II — SAFE RENDERING AND FILESYSTEM WRITES | Build projection renderer registry; Build atomic write strategy | `Project_Projection_Engine_Execution_03.md` |
| 04 | 9, 10, 11 | PHASE II — SAFE RENDERING AND FILESYSTEM WRITES | Build generated-file markers and metadata headers; Build path canonicalization and containment; Build deterministic rendering and content hashing | `Project_Projection_Engine_Execution_04.md` |
| 05 | 12 | PHASE II — SAFE RENDERING AND FILESYSTEM WRITES | Build read-only generated-file policy | `Project_Projection_Engine_Execution_05.md` |
| 06 | 13 | PHASE III — TWO-WAY EDIT INTAKE AND FILE WATCHING | Integrate cross-platform filesystem watcher | `Project_Projection_Engine_Execution_06.md` |
| 07 | 14, 15, 16 | PHASE III — TWO-WAY EDIT INTAKE AND FILE WATCHING | Build debouncing and event coalescing; Build self-write suppression; Build two-way parser registry | `Project_Projection_Engine_Execution_07.md` |
| 08 | 17, 18, 19 | PHASE III — TWO-WAY EDIT INTAKE AND FILE WATCHING | Build edit validation and schema checking; Build stale-edit/conflict detection; Build rename/delete semantics for editable files | `Project_Projection_Engine_Execution_08.md` |
| 09 | 20, 21, 22 | PHASE IV — ENGINE-SPECIFIC PROJECTIONS | Build Project metadata/anchor projection; Build ContextPack projections; Build Study projections | `Project_Projection_Engine_Execution_09.md` |
| 10 | 23, 24, 25 | PHASE IV — ENGINE-SPECIFIC PROJECTIONS | Build Memory projections; Build Performance summary projections; Build user-note projections | `Project_Projection_Engine_Execution_10.md` |
| 11 | 26 | PHASE IV — ENGINE-SPECIFIC PROJECTIONS | Build generated indexes | `Project_Projection_Engine_Execution_11.md` |
| 12 | 27 | PHASE V — SYNC, TERMINAL, SECURITY, AND RECOVERY | Integrate Projection ↔ Library Sync | `Project_Projection_Engine_Execution_12.md` |
| 13 | 28, 29, 30 | PHASE V — SYNC, TERMINAL, SECURITY, AND RECOVERY | Build projection regeneration/catch-up; Build orphan/cleanup policy; Build the Projection CLI | `Project_Projection_Engine_Execution_13.md` |
| 14 | 31 | PHASE V — SYNC, TERMINAL, SECURITY, AND RECOVERY | Build agent discoverability contract | `Project_Projection_Engine_Execution_14.md` |
| 15 | 32 | PHASE V — SYNC, TERMINAL, SECURITY, AND RECOVERY | Build content security and secret filtering | `Project_Projection_Engine_Execution_15.md` |
| 16 | 33 | PHASE V — SYNC, TERMINAL, SECURITY, AND RECOVERY | Instrument projection health | `Project_Projection_Engine_Execution_16.md` |
| 17 | 34, 35 | PHASE VI — QUALIFICATION AND V1 GATE | Build cross-platform watcher fixtures; Build path/symlink security qualification | `Project_Projection_Engine_Execution_17.md` |
| 18 | 36 | PHASE VI — QUALIFICATION AND V1 GATE | Build self-loop and conflict qualification | `Project_Projection_Engine_Execution_18.md` |
| 19 | 37 | PHASE VI — QUALIFICATION AND V1 GATE | Build source-deletion/folder-move recovery qualification | `Project_Projection_Engine_Execution_19.md` |
| 20 | 38 | PHASE VI — QUALIFICATION AND V1 GATE | Final Project Projection Engine gate | `Project_Projection_Engine_Execution_20.md` |