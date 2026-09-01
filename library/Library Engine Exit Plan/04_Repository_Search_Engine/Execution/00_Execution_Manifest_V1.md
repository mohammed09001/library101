# Library Repository Search Engine — Execution Manifest V1

- **Tasks:** 46
- **Executions:** 22

| Execution | Tasks | Phase | Scope | File |
|---:|---|---|---|---|
| 01 | 1, 2, 3 | PHASE I — SEARCH PRODUCT AND DOMAIN FOUNDATION | Freeze Search vs Analysis ownership; Define SearchRequest and SearchIntent; Define RepositoryProvider contract | `Repository_Search_Engine_Execution_01.md` |
| 02 | 4, 5, 6 | PHASE I — SEARCH PRODUCT AND DOMAIN FOUNDATION | Define stable repository identity and revision; Define SearchSession, Candidate and Ranking schemas; Publish Search API/events | `Repository_Search_Engine_Execution_02.md` |
| 03 | 7, 8, 9 | PHASE II — GITHUB PROVIDER AND QUERY PLANNING | Build GitHub provider with Octokit; Build credential and permission broker integration; Build GitHub rate-limit accounting | `Repository_Search_Engine_Execution_03.md` |
| 04 | 10, 11, 12 | PHASE II — GITHUB PROVIDER AND QUERY PLANNING | Build intent parser baseline; Build multi-query planner; Build query-plan budget and stop conditions | `Repository_Search_Engine_Execution_04.md` |
| 05 | 13, 14, 15 | PHASE III — CANDIDATE DISCOVERY AND HARD FILTERS | Build candidate discovery and pagination; Build fork/duplicate/canonical handling; Build hard filter pipeline | `Repository_Search_Engine_Execution_05.md` |
| 06 | 16, 17 | PHASE III — CANDIDATE DISCOVERY AND HARD FILTERS | Build license detection and uncertainty states; Build activity and health signals | `Repository_Search_Engine_Execution_06.md` |
| 07 | 18, 19, 20 | PHASE IV — LIGHT REPOSITORY INSPECTION | Build bounded README inspection; Build top-level tree inspection; Build manifest and dependency inspection | `Repository_Search_Engine_Execution_07.md` |
| 08 | 21, 22, 23 | PHASE IV — LIGHT REPOSITORY INSPECTION | Build bounded documentation inspection; Build lexical code sampling with ripgrep for local snapshots; Build symbol sampling with Universal Ctags | `Repository_Search_Engine_Execution_08.md` |
| 09 | 24 | PHASE IV — LIGHT REPOSITORY INSPECTION | Build optional Zoekt local-index adapter | `Repository_Search_Engine_Execution_09.md` |
| 10 | 25, 26, 27 | PHASE V — PROFILE, SIGNALS, AND EXPLAINABLE RANKING | Define normalized RepositoryProfile; Build technical/architecture signal extractors; Build intent-match scoring baseline | `Repository_Search_Engine_Execution_10.md` |
| 11 | 28, 29, 30 | PHASE V — PROFILE, SIGNALS, AND EXPLAINABLE RANKING | Build evidence-quality scoring; Build explainable result reasons; Build ranking calibration fixtures | `Repository_Search_Engine_Execution_11.md` |
| 12 | 31, 32 | PHASE VI — SEARCH MEMORY, CACHE, AND HANDOFFS | Build SearchSession persistence and replay; Build repository metadata/read cache | `Repository_Search_Engine_Execution_12.md` |
| 13 | 33 | PHASE VI — SEARCH MEMORY, CACHE, AND HANDOFFS | Integrate Search → Analysis handoff | `Repository_Search_Engine_Execution_13.md` |
| 14 | 34 | PHASE VI — SEARCH MEMORY, CACHE, AND HANDOFFS | Integrate Search → Memory | `Repository_Search_Engine_Execution_14.md` |
| 15 | 35 | PHASE VI — SEARCH MEMORY, CACHE, AND HANDOFFS | Integrate Search → Context | `Repository_Search_Engine_Execution_15.md` |
| 16 | 36, 37 | PHASE VII — TERMINAL/AGENT INTERFACE AND RESEARCH SAFETY | Build the Search CLI; Expose MCP/host-native repository.search tools | `Repository_Search_Engine_Execution_16.md` |
| 17 | 38 | PHASE VII — TERMINAL/AGENT INTERFACE AND RESEARCH SAFETY | Build optional agent-assisted query expansion | `Repository_Search_Engine_Execution_17.md` |
| 18 | 39, 40 | PHASE VII — TERMINAL/AGENT INTERFACE AND RESEARCH SAFETY | Build untrusted repository-content boundary; Enforce Sourcebot study-only licensing boundary | `Repository_Search_Engine_Execution_18.md` |
| 19 | 41, 42, 43 | PHASE VIII — SCALE, FAILURE, AND QUALIFICATION | Build backpressure, cancellation, and partial-result semantics; Instrument search cost and quality; Build frozen Search benchmark intents | `Repository_Search_Engine_Execution_19.md` |
| 20 | 44 | PHASE VIII — SCALE, FAILURE, AND QUALIFICATION | Build provider/rate-limit failure qualification | `Repository_Search_Engine_Execution_20.md` |
| 21 | 45 | PHASE VIII — SCALE, FAILURE, AND QUALIFICATION | Build ranking/evidence qualification | `Repository_Search_Engine_Execution_21.md` |
| 22 | 46 | PHASE VIII — SCALE, FAILURE, AND QUALIFICATION | Final Repository Search Engine gate | `Repository_Search_Engine_Execution_22.md` |