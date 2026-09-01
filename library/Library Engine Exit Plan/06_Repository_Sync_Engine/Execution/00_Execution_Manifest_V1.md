# Library Repository Sync Engine — Execution Manifest V1

- **Tasks:** 36
- **Executions:** 19

| Execution | Tasks | Phase | Scope | File |
|---:|---|---|---|---|
| 01 | 1, 2, 3 | PHASE I — TRACKING, IDENTITY, AND STATE FOUNDATION | Freeze Repository Sync ownership; Define TrackedRepository identity; Define RepositoryRevision and RepositoryDelta schemas | `Repository_Sync_Engine_Execution_01.md` |
| 02 | 4, 5, 6 | PHASE I — TRACKING, IDENTITY, AND STATE FOUNDATION | Define sync policy schema; Define SyncState state machine; Publish Repository Sync contracts/events | `Repository_Sync_Engine_Execution_02.md` |
| 03 | 7, 8, 9 | PHASE II — REMOTE GITHUB CHANGE DETECTION | Build GitHub remote metadata checks; Build GitHub compare-commits delta path; Build polling scheduler with jitter/backoff | `Repository_Sync_Engine_Execution_03.md` |
| 04 | 10 | PHASE II — REMOTE GITHUB CHANGE DETECTION | Build webhook ingestion for authorized repositories | `Repository_Sync_Engine_Execution_04.md` |
| 05 | 11 | PHASE II — REMOTE GITHUB CHANGE DETECTION | Build webhook-to-poll reconciliation | `Repository_Sync_Engine_Execution_05.md` |
| 06 | 12 | PHASE II — REMOTE GITHUB CHANGE DETECTION | Build GitHub rate-limit and auth degradation | `Repository_Sync_Engine_Execution_06.md` |
| 07 | 13 | PHASE III — LOCAL GIT PLUMBING AND DELTA RESOLUTION | Integrate gix repository discovery and fetch | `Repository_Sync_Engine_Execution_07.md` |
| 08 | 14, 15, 16 | PHASE III — LOCAL GIT PLUMBING AND DELTA RESOLUTION | Build local revision resolution; Build tree/blob diff calculation; Build rename/move classification | `Repository_Sync_Engine_Execution_08.md` |
| 09 | 17 | PHASE III — LOCAL GIT PLUMBING AND DELTA RESOLUTION | Build force-push/history-rewrite detection | `Repository_Sync_Engine_Execution_09.md` |
| 10 | 18 | PHASE III — LOCAL GIT PLUMBING AND DELTA RESOLUTION | Build branch/tag/release transition handling | `Repository_Sync_Engine_Execution_10.md` |
| 11 | 19, 20, 21 | PHASE IV — MATERIALITY AND INCREMENTAL TRIGGERS | Build deterministic change classification; Build material-change policy engine; Build affected-Study lookup contract | `Repository_Sync_Engine_Execution_11.md` |
| 12 | 22, 23, 24 | PHASE IV — MATERIALITY AND INCREMENTAL TRIGGERS | Build Analysis re-run trigger; Build no-material-change Study state update; Build Memory/Library Sync notifications | `Repository_Sync_Engine_Execution_12.md` |
| 13 | 25, 26, 27 | PHASE V — RECOVERY, CACHE, AND TERMINAL | Build durable sync checkpoints; Build restart and missed-check recovery; Build local mirror/cache lifecycle | `Repository_Sync_Engine_Execution_13.md` |
| 14 | 28, 29, 30 | PHASE V — RECOVERY, CACHE, AND TERMINAL | Build the Repository Sync CLI; Build cancellation and backpressure; Instrument sync health | `Repository_Sync_Engine_Execution_14.md` |
| 15 | 31 | PHASE VI — SECURITY AND QUALIFICATION | Build credential and webhook-secret isolation | `Repository_Sync_Engine_Execution_15.md` |
| 16 | 32, 33 | PHASE VI — SECURITY AND QUALIFICATION | Build repository URL/ref validation; Build adversarial remote-change fixtures | `Repository_Sync_Engine_Execution_16.md` |
| 17 | 34 | PHASE VI — SECURITY AND QUALIFICATION | Build polling/webhook equivalence qualification | `Repository_Sync_Engine_Execution_17.md` |
| 18 | 35 | PHASE VI — SECURITY AND QUALIFICATION | Build restart/rate-limit qualification | `Repository_Sync_Engine_Execution_18.md` |
| 19 | 36 | PHASE VI — SECURITY AND QUALIFICATION | Final Repository Sync Engine gate | `Repository_Sync_Engine_Execution_19.md` |