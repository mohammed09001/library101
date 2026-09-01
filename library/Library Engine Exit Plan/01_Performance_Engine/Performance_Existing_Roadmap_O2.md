# Midnight Performance Roadmap

- **Project:** Midnight
- **Product:** Midnight Performance
- **Document Type:** Replacement Engineering Task Roadmap
- **Version:** O2 / New-Midnight Architecture
- **Created:** 28 August 2026
- **Status:** Living implementation roadmap
- **Replaces:** `Midnight Performance.md` after migration review
- **Ordered implementation tasks:** 152
- **Primary source:** `Midnight Performance.md`
- **Foundation implementation record:** `Task 1-9 Done.md`

# Architecture Review Verdict

The old Performance roadmap contains a strong analytical core, but it is materially coupled to the retired Midnight Code architecture. The coupling is structural: the document describes Code as the owner of code truth, makes full operation depend on Code + Watch, gives an entire phase to a Midnight Code evidence contract, uses Code-aware similarity and prompt preflight, and qualifies the ecosystem as Code + Watch + Performance.

> **Performance no longer asks Midnight Code what changed. Performance observes and preserves the development change itself.**

This does not turn Performance into a universal code-intelligence product. Repository/VCS/filesystem evidence remains the underlying source of actual repository state. Performance owns the development-history evidence connecting that state to prompts, agent runs, verification, feedback, and later outcomes.

# New Midnight Performance Doctrine

**Midnight Performance answers: How was this software changed, how well did the instruction/execution work, what happened afterward, and what should we learn from that history?**

`User Prompt → Coding-Agent Execution → Actual Repository Changes → Verification → User Feedback → Runtime/Data/Security Outcomes → Historical Learning`

Performance owns Prompt/Agent Execution/Change/Verification/Feedback/Episode/Analysis/Dataset/Experiment/Model/Memory/Recommendation history. Watch Runtime owns application-runtime truth. Watch Data owns data architecture and data-runtime truth. Security owns security truth. No current Midnight Code dependency exists.

Performance does not host coding agents, own provider authentication for normal developer use, require GraphRAG, or own cross-product workflow coordination.

# Invisible-by-Default Operating Model

The developer should work as though Midnight were not present: run Claude Code, Codex, OpenCode, an IDE, or another coding harness normally; submit ordinary prompts; allow Performance to observe only approved capabilities/content categories; reconcile repository changes independently; analyze silently by default; and invoke Performance explicitly for history, comparison, preflight, Advisor, Suggestion, or Memory.

> **Midnight attaches to the project and coding harness; it does not force the developer to work through Midnight.**

# Evidence Authority

- **Repository/VCS/filesystem before-after evidence** — strongest evidence for what ultimately changed.
- **Structured command/tool/test evidence** — strongest evidence for what actually ran and was verified.
- **Native coding-harness lifecycle events** — strong evidence for execution sequence, prompts, tools, session/turn boundaries, usage, and provider behavior.
- **Sibling domain evidence** — authoritative within Watch Runtime, Watch Data, or Security.
- **User feedback** — first-class subjective evidence.
- **Agent final prose** — evidence of what the agent believed/reported, not authoritative change truth.
- **Derived metrics/statistics** — versioned analytical claims.
- **Learned predictions / LLM judges** — probabilistic/evaluative evidence, never verified fact by themselves.

Correlation is not causation. Similarity is not equivalence. A model score is not proof. A change is not a verified change.

# Research Re-Validation — 28 August 2026

- **Arize `coding-harness-tracing`** is a 2026 repository that traces Claude Code, Codex, OpenCode, Cursor, Gemini, Copilot, Kiro, Antigravity, and other coding harnesses into OpenInference/OpenTelemetry-compatible spans. Its Claude integration uses hooks while the user runs `claude` normally; Codex requires explicit hook trust; OpenCode uses an in-process plugin and authoritative snapshots. This strongly supports Midnight's `attach + observe + reconcile` direction.
- **Claude Code Hooks** expose prompt/session/tool/failure/stop/subagent/permission/compaction lifecycle points. Passive Performance capture should use these without returning control outputs that alter Claude behavior.
- **Codex structured lifecycle surfaces** expose thread/turn/item evidence, command execution, file changes, diffs, completion/failure, and usage in supported integration modes. Performance should use this evidence when available without forcing a Midnight-hosted Codex workflow.
- **OpenCode plugins/events** expose session, message, file, command, permission, and tool lifecycle information but evolve quickly; adapter capability/version probing and fail-soft parsing are mandatory.
- **OpenTelemetry GenAI semantic conventions** standardize provider/model identity, token usage, messages, system instructions, tools, and agent/tool semantics, with content fields treated as sensitive. Midnight should reuse compatible semantics while preserving a Performance-native Prompt Run / Change Set / Verification / Episode model.
- **OpenInference + Arize Phoenix** provide strong references for AI tracing, annotations/evaluations, datasets, experiments, code evals, and LLM judges. Midnight's evaluation target remains the development Episode, not only the LLM call.
- **Langfuse** remains a useful reference for trace → evaluation → dataset → experiment loops and self-hosting, but Midnight additionally grounds outcomes in actual repository changes and sibling-domain evidence.
- **Promptfoo**, **DeepEval**, **Evidently**, and **OpenLIT** remain useful references for repeatable evals, LLM-as-a-judge, drift/statistical monitoring, and OTel-native AI observability respectively. They are inspiration, not mandatory dependencies.

# Implementation Preservation Note

`Task 1-9 Done.md` documents the initial Performance foundation as completed, and project history reports later change-capture work beyond Task 9. Implementation work under this replacement roadmap must inspect and preserve repository code that already satisfies the new contracts instead of rebuilding it. Repository evidence is authoritative for current implementation state.

# Engineering Rules

- Preserve accepted evidence before interpretation when policy permits.
- Repository-change evidence is captured independently of agent prose.
- Native agent events are useful but do not replace final repository reconciliation.
- Adapters observe coding agents; they do not own or host agent execution.
- Passive capture must not inject context, block tools, alter permissions, or rewrite prompts.
- Every adapter declares capabilities and version; unsupported signals remain explicit.
- Provider schema drift must fail soft and visibly.
- Prompts, source, diffs, transcripts, tool content, and sibling evidence are sensitive by default.
- Derived analysis never rewrites historical evidence.
- User feedback is subjective evidence, not absolute truth.
- Sibling products remain authoritative for runtime, data, and security truth.
- No sibling product database may be read directly.
- Performance operates standalone with no Watch, Data, Security, GraphRAG, orchestrator, or external AI.
- Vector indexes and relationship graphs are rebuildable retrieval projections.
- Data Analytics and Data Science precede ML.
- Learned methods must beat transparent baselines.
- LLM-as-a-judge is optional and never sole truth.
- Advisor/Suggestion remain user-invoked and user-controlled.
- Self-hosted/local/BYOC/private-AI modes remain first-class.
- Storage specialization is benchmark-driven.

# PHASE I — PRODUCT, DEVELOPMENT-HISTORY, AND EVIDENCE FOUNDATION

Reconcile the implemented foundation with the post-Midnight-Code architecture while preserving evidence, privacy, authority, identity, and reprocessing guarantees.

## Task 1: Freeze Midnight Performance as Development-History Intelligence

Midnight Performance is an independent development-history intelligence product. Its primary study unit is:

`User Prompt → Coding-Agent Execution → Actual Repository Changes → Verification → User Feedback → Watch/Security/Data Outcomes → Historical Learning`

The retired Midnight Code product is no longer an authority or dependency. Performance owns the evidence it directly observes about development history: prompts, agent-run observations, commands/tools, actual repository/file changes, verification, user feedback, development Episodes, analyses, and Performance Memory.

Performance does not become a universal code-intelligence system. The repository/VCS/filesystem remains the underlying source of actual repository state; Performance preserves and interprets that evidence. It does not need GraphRAG or a universal code graph.

Watch Runtime, Watch Data, and Security are optional sibling evidence providers for their own domains. Performance may correlate their outcomes with development Episodes through versioned contracts but never rewrites sibling truth.

Performance does not host Claude Code, Codex, OpenCode, or future coding agents. The user runs those tools normally; Performance attaches through native hooks/events/plugins and repository observation, stays invisible by default, and becomes interactive only when explicitly invoked.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 2: Reconcile the Performance Domain Architecture With the New Midnight Model

Preserve the existing Performance domains where still valid—Prompt, Agent Execution, Change Evidence, Verification, User Feedback, Outcome, Analytics, Dataset, Experiment, Model, Memory, and Recommendation—but revise ownership semantics that previously depended on Midnight Code.

Change Evidence now owns Performance's durable observations about actual repository changes attributable to development Episodes. It may contain files, diffs, fingerprints, rename/move evidence, dependency/configuration changes, tests, and symbol/region resolution where Performance can derive it. It does not claim to be a universal source-code knowledge system.

Outcome remains a correlation/evaluation domain that references Watch Runtime, Watch Data, Security, CI, user, and other external evidence without copying sibling authority.

Define an Episode projection connecting multiple Prompt Runs, manual corrections, regressions, remediation attempts, and verifications into one coherent development story.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 3: Define the New Performance Identity and Correlation Contract

Create stable identities for project, workspace, repository, repository baseline/snapshot, prompt, prompt version, Prompt Run, Agent Run, agent session/turn, tool/command observation, Change Set, file change, optional resolved code region/symbol, Verification Run, Feedback Record, Outcome Observation, Episode, Analysis Version, Dataset Item, Experiment Run, Model Version, Memory Record, and Recommendation.

Replace retired Midnight Code references with Performance-owned repository/change identities. Add optional external references to Watch Runtime, Watch Data, Security, CI/build systems, releases/deployments, and future Midnight capabilities.

Cross-product identity is a reference contract, not permission to query another product's physical database.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 4: Define the Canonical Performance Observation Model

Maintain a provider-neutral, versioned observation envelope for prompts, agent lifecycle events, model/usage metadata, tools, commands, file edits, session/turn boundaries, verification, repository changes, feedback, and external outcome references.

The canonical Performance model is not identical to OpenTelemetry or OpenInference. Build import/export mappings where useful. Current OpenTelemetry GenAI conventions and OpenInference provide useful interoperable semantics for model calls, tools, agents, token usage, messages, annotations, and evaluations; Midnight must preserve its own development entities such as Prompt Run, Change Set, Verification, Episode, and sibling outcome references.

Raw provider events, normalized observations, repository evidence, and derived analysis remain distinct.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 5: Build the Append-Oriented Performance Evidence Ledger

Persist accepted raw Performance observations before interpretation.
Require idempotency, replay, schema versioning, restart safety,
provenance, deterministic identities, and rebuildable derived
projections. Analysis/model changes must never rewrite historical raw
evidence.

**Inspiration note:** Langfuse tracing/observation persistence and
experiment reproducibility patterns.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 6: Implement Privacy, Source-Code Protection, and Sensitive-Data Controls

Protect prompts, model outputs, source code, diffs, commands, tool arguments/results, transcripts, repository metadata, secrets, credentials, PII, sibling references, and optional external-AI inputs before unsafe durable storage or export.

Support independent content-category controls. A user may allow metadata while disabling prompt text, tool details, raw tool content, raw diffs, or model content.

Add local redaction, field-level policy, retention classes, project isolation, self-host/BYOC rules, export policy, and explicit treatment of transcript/debug dumps as highly sensitive artifacts.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 7: Define the New Evidence Authority Hierarchy

Formalize evidence authority by claim type.

For what ultimately changed, prefer final repository/VCS/filesystem before/after evidence and persisted Change Sets over coding-agent prose. Native agent file-change/edit events remain strong execution evidence but should be reconciled with repository state.

For commands/tests, prefer structured command/tool/test evidence and exit/results. Watch Runtime remains authoritative for application runtime; Watch Data for data runtime; Security for security findings and verification.

User feedback is first-class subjective evidence. Agent final prose, AI evaluations, heuristics, statistical associations, and model predictions are weaker evidence classes and must carry method, version, confidence, and uncertainty.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 8: Build Versioned Analysis and Reprocessing Contracts

Every parser, feature extractor, metric, correlation method, statistical
method, model, and evaluator must be versioned. Derived results must be
reproducible from preserved evidence and safely recomputable after
analytical improvements.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE II — INVISIBLE CODING-HARNESS CAPTURE

Attach to coding harnesses through native lifecycle surfaces and repository observation while leaving the developer's normal Claude Code, Codex, OpenCode, IDE, and terminal workflow unchanged.

## Task 9: Formalize Bring Your Own Coding Harness Observation

Replace the old idea of a provider adapter that runs coding agents with a stable observation-adapter contract.

Adapters for Codex, Claude Code, OpenCode, Cursor, Gemini, and future coding harnesses declare what they can observe: prompt submission, session/turn lifecycle, model/provider metadata, tool calls, commands/results, file-change events, subagent relationships, permissions, tests/checks, completion/failure/interruption, token/cache/cost metadata, native diffs, and transcript availability.

The preferred integration is native lifecycle hooks/events/plugins while the user runs the agent normally. Performance must not require `midnight run <agent>`, provider authentication ownership, worktree orchestration, or terminal wrapping. Unsupported capabilities become unavailable, not negative evidence.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 10: Implement the Codex Performance Observation Adapter

Capture Codex lifecycle evidence through supported native surfaces without taking over the user's Codex workflow.

Prefer native hooks for attached operation where available and approved. In integration modes that use Codex app-server or SDK surfaces, consume structured thread/turn/item events as an additional high-fidelity source rather than a requirement for ordinary use.

Capture session/turn identity, command execution, file-change items, turn diff updates, tool progress, usage, failures, interruptions, and completion state where supported. Reconcile Codex-reported file changes with repository state.

If hooks are unapproved or a lifecycle field is unavailable, degrade explicitly rather than inventing execution boundaries.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 11: Implement the Claude Code Performance Observation Adapter

Use Claude Code's supported hook lifecycle to observe normal user sessions without a wrapper.

Capture, subject to policy and hook availability, SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, Stop, StopFailure, subagent events, permission events, compaction/session-end events, and tool/file metadata.

The Performance hook is observational by default. It must not inject prompt context, block tools, alter permissions, or force the agent to continue merely because Performance is installed.

Transcript parsing, if used for higher-fidelity model/tool parenting, is fail-soft and privacy-gated.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 12: Implement the OpenCode Performance Observation Adapter

Use OpenCode's plugin/event system and authoritative session snapshots where available.

Capture session lifecycle/status, message metadata according to privacy policy, file edits, command/tool execution, session diffs, errors, idle/completion boundaries, model/provider/token/cost metadata, and child-session relationships where stable IDs exist.

OpenCode lifecycle surfaces can change quickly. Probe versions/capabilities, deduplicate repeated snapshots/events, and never invent subagent edges when authoritative IDs are absent.

The user continues to run OpenCode normally; Performance attaches as an observer plugin.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 13: Build Deterministic Agent Execution and Turn Windows

Define exactly which observations belong to one Agent Run, one agent session, one turn, and one Prompt Run. Handle retries, resumes, steering/follow-ups, compaction, subagents, interruptions, manual edits, concurrent agents, and ambiguous boundaries.

Use native lifecycle identifiers when trustworthy. When provider lifecycle data is incomplete, correlate against repository baselines, VCS timestamps, filesystem observations, command/test evidence, and explicit prompt boundaries. Store ambiguity rather than forcing attribution.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 14: Build Native Repository Change Capture

Make repository change evidence a first-class Performance-owned capability.

Capture a baseline at the accepted beginning of a development execution window and a terminal repository state at completion/interruption/stop. Reconcile native agent edit/diff events with VCS status/diff/rename evidence, filesystem observations, and before/after fingerprints.

Capture created, modified, deleted, renamed/moved files; affected regions; dependency/configuration/test changes; and provenance. Support restart recovery from persisted baselines where practical.

The agent saying it changed a file is not sufficient proof that the final repository state contains that change.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 15: Capture Commands, Tools, Tests, and Verification Evidence

Persist structured command/tool/test/check evidence attributable to the execution window. Record command/tool identity, status, duration, exit codes, bounded output, build/lint/typecheck/test results, changed-file relationships, and uncertainty.

Distinguish command executed, command reported by agent, test observed passing, test inferred from text, and verification performed outside the agent session.

`Change != Verified Change`.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 16: Build Coding-Harness Capability Drift and Fail-Soft Capture

Coding-agent lifecycle surfaces change quickly. Build version probing, capability manifests, schema fixtures, forward-compatible parsing, unknown-event preservation, and explicit degraded states.

A new provider version must not silently misattribute runs or drop evidence. Adapter health distinguishes healthy, degraded, unsupported_version, hooks_missing, permission_required, and unavailable.

Use real-provider fixtures and tests so canonical Performance is not coupled to one provider version.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 17: Define Prompt Run as the Core Development Experience Unit

Represent one coherent development experience around a user instruction:

prompt/version → agent/session/turn execution → actual repository changes → commands/tools → verification → final agent response → user feedback → optional Watch Runtime/Data/Security outcomes → derived analysis → historical relationships.

Prompt Run is the primary analytical unit, while a broader Episode may connect multiple Prompt Runs, manual corrections, regressions, remediation attempts, and verifications.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Observation must not require Midnight to launch or host the coding agent.
- Missing provider capabilities are explicit evidence gaps, not negative findings.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE III — PERFORMANCE-OWNED REPOSITORY CHANGE INTELLIGENCE

Move actual development-change evidence into Performance itself without rebuilding the retired Midnight Code / GraphRAG product.

## Task 18: Define Performance Repository-Change Evidence Authority

Replace the retired Midnight Code evidence contract with a Performance-owned repository evidence contract.

The repository/VCS/filesystem is the underlying truth source. Performance is authoritative for the development-history record it captured: baselines, diffs, file operations, final repository fingerprints, Change Sets, and attribution to Prompt/Agent Runs.

Performance may build bounded code-region/symbol/dependency projections needed for analysis, but it must not recreate a universal Code Graph or GraphRAG product.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 19: Build Repository Change Resolution

Resolve raw file/diff evidence into useful development entities without Midnight Code.

Start with deterministic VCS/file paths and changed regions. Add language-aware symbol/module/component resolution through bounded parsers/indexers where justified. Preserve raw diffs/fingerprints alongside resolved references and record parser/version/confidence.

Unknown languages or unresolved symbols must not invalidate file-level Change Set evidence.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 20: Build Semantic Change Classification

Classify observed code changes into behavior-oriented categories such as
feature addition, bug fix, refactor, configuration, dependency, test,
deletion, interface change, data-model change, security-related change,
and unknown. Keep deterministic evidence separate from inferred labels.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 21: Build Change Scope and Surface Metrics

Measure files/symbols/components touched, dependency radius,
added/removed/rewritten code, public-interface changes, test changes,
configuration changes, and structural impact. Normalize metrics by
task/repository context rather than assuming larger or smaller changes
are universally better.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 22: Build Change Locality and Dispersion Analysis

Quantify whether a run changed a concentrated relevant area or spread across unrelated surfaces.

Use Performance's own file/module/symbol/dependency projections where available, plus repository paths and change regions. Avoid requiring a whole-codebase GraphRAG or universal code graph. Retain explainable raw measures.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 23: Build Structural Impact Analysis

Estimate which interfaces, dependencies, modules, callers/callees, configuration surfaces, tests, or repository regions may be affected by an observed Change Set.

Use deterministic language/package metadata and bounded structural parsers first. More expensive graph/index projections are optional and rebuildable derived state. Distinguish observed changed surface from potentially impacted surface.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 24: Build Prompt-Intent ↔ Repository-Change Evidence Mapping

Map extracted prompt requirements and constraints to actual changed files, regions, symbols/modules where resolvable, tests, configuration, and verification evidence.

Preserve many-to-many relationships, unimplemented requirements, changed-but-unrequested surfaces, and insufficient-evidence states. Do not force every requirement to one source location.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Repository/VCS/filesystem evidence replaces the retired Midnight Code dependency.
- Do not introduce GraphRAG or a universal code graph.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE IV — CROSS-PRODUCT OUTCOME EVIDENCE

Connect development episodes to application-runtime, data-runtime, and security outcomes through optional sibling contracts while preserving authority.

## Task 25: Define the Midnight Watch Runtime Outcome Contract

Define versioned APIs/events through which Performance receives Watch Runtime-owned evidence such as Issues, Error Occurrences, log/event/trace references, releases, deployments, runtime regressions, application-latency changes, Investigations, and verified Watch Runtime Memory references.

Watch Runtime remains authoritative for application-runtime truth. Performance stores stable references and bounded outcome observations needed for development-history evaluation, never a copied Watch telemetry corpus.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 26: Define the Midnight Watch Data Outcome Contract

Define versioned references through which Performance consumes Watch Data-owned evidence such as schema/data-access changes, query families, query/data-runtime regressions, cost changes, optimization recommendations, before/after verification, and Watch Data Memory references.

Watch Data remains authoritative for data truth. Performance uses these outcomes to study development consequences, not to become a database optimizer.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 27: Define the Midnight Security Outcome Contract

Define versioned references through which Performance consumes Security-owned evidence such as findings, vulnerability identity, affected asset/change references, remediation attempts, rescans, verified fix/regression state, risk exceptions, and Security Memory references.

Security remains authoritative for security truth. Performance records security outcome as part of a development Episode and may provide Security with bounded development history in return.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 28: Build Cross-Product Outcome Windows

Define evidence windows after a Prompt Run, Change Set, release, deployment, remediation, or verification in which sibling outcomes may be relevant.

Handle deployment delay, environment, release identity, subsequent Prompt Runs/manual changes, rollback, traffic differences, data workload changes, security rescans, incomplete telemetry, and different domain clocks. An outcome window is a correlation boundary, not automatic causation.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 29: Build Prompt Run ↔ Watch Runtime Issue Association

Associate development Episodes with later Watch Runtime Issues/Errors using release/deployment identity, changed-source overlap, component/service overlap, trace/source evidence, temporal ordering, and intervening changes.

Store method, version, evidence, and confidence. Never emit a causal claim merely because an Issue occurred after a change.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 30: Build Prompt Run ↔ Watch Runtime Trace/Event/Regression Association

Connect development Episodes with relevant Watch Runtime traces, deployment/release events, runtime transitions, latency regressions, and bounded operational evidence.

Prefer explicit release/deployment/source/trace relationships before temporal heuristics. Preserve Watch references rather than copying complete runtime records.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 31: Build Prompt Run ↔ Watch Data / Security Outcome Association

Associate development Episodes with Watch Data regressions/verification and Security findings/remediation using stable release/change/component/file identities, explicit sibling references, temporal ordering, and intervening-change evidence.

Keep separate association types for application runtime, data runtime, and security. They remain different outcomes even when they relate to the same Change Set.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 32: Build Intervening-Change Attribution

Before associating a later outcome with an earlier Prompt Run, model subsequent Prompt Runs, manual edits, commits, merges, releases, rollbacks, data migrations, security remediations, and other changes that may have altered the affected surface.

Reduce confidence as competing explanations accumulate. Preserve attribution alternatives rather than forcing one root cause.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 33: Build Outcome Evidence Quality

Measure completeness and reliability of outcome evidence.

For Watch Runtime consider telemetry coverage, sampling/drop state, release linkage, source resolution, and observation duration. For Watch Data consider collection capability, query/runtime coverage, permission limits, and before/after workload comparability. For Security consider scan completeness, scanner/rule versions, rescan equivalence, and verification confidence.

No observed problem must never automatically mean successful change when evidence is incomplete.

**New-Midnight alignment:**
- Preserve existing implementation that already satisfies the new contract; reconcile and requalify instead of rewriting by default.
- Sibling outcomes remain owned by Watch Runtime, Watch Data, or Security.
- Correlation is not causation and direct sibling-database reads are forbidden.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE V — USER FEEDBACK AND ACTIVE LEARNING

Treat user feedback as first-class subjective evidence and ask only questions whose expected information gain justifies interruption.

## Task 34: Define the Post-Run User Feedback Loop

After the coding agent completes, request a minimal high-value user
judgment such as achieved / partially achieved / not achieved /
uncertain. Keep wording configurable and avoid interrupting every run
when the expected information gain is low.

**Inspiration note:** Langfuse supports user feedback/manual labeling as
evaluation signals.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 35: Build Structured Feedback Reasons

When useful, allow lightweight follow-up labels for what succeeded or
failed: behavior, correctness, performance, UI, scope, verification,
maintainability, regression, incomplete work, misunderstood intent, or
other. Preserve free text separately from normalized labels.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 36: Build Feedback Provenance and Revision

Store actor, timestamp, prompt/run, confidence/uncertainty, and later
revisions. A user must be able to change an earlier judgment without
destroying the historical label.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 37: Build Active-Learning Question Selection

Use uncertainty, novelty, disagreement between signals, and expected
information gain to decide when an additional user question is valuable.
Begin with deterministic heuristics; later compare learned query
strategies.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 38: Build Multi-Signal Outcome Labels

Create versioned outcome labels from User Signal + Execution Evidence +
Code Evidence + Watch Evidence while preserving the components
independently. Never collapse disagreement into false certainty.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE VI — PROMPT, REQUIREMENT, AND EXECUTION ANALYSIS

Analyze prompts against actual execution, changes, requirements, constraints, verification, and final reports rather than prompt text alone.

## Task 39: Build Prompt Structural Feature Extraction

Extract explicit scope, requested actions, prohibited actions,
constraints, acceptance criteria, verification requirements, referenced
files/components, expected outputs, dependencies, temporal requirements,
ambiguity markers, and task category. Preserve raw prompt text
separately.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 40: Build Prompt Clarity and Specificity Metrics

Define transparent, versioned metrics for clarity, specificity, scope
definition, constraint quality, verification quality, and ambiguity.
Avoid "good prompt/bad prompt" labels without evidence.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 41: Build Requirement and Constraint Extraction

Represent prompt requirements as structured entities with source spans,
type, importance when explicitly stated, expected evidence, and
ambiguity. Preserve uncertainty and allow one prompt fragment to produce
multiple requirements.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 42: Build Prompt-to-Code Alignment

Compare extracted requirements with actual Code-resolved changes.
Classify each requirement as satisfied, partially satisfied, not
satisfied, contradicted, or insufficient evidence and link every
judgment to prompt fragments and concrete code evidence.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 43: Build Scope Discipline Analysis

Detect unnecessary scope expansion, missing requested work, unrelated
file/component changes, unexpected deletion, forbidden changes,
excessive structural blast radius, and implementation drift.
Contextualize by task type rather than assuming minimal change is always
optimal.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 44: Build Verification Quality Analysis

Measure whether requested and appropriate
tests/build/lint/typecheck/runtime verification occurred, whether
changed behavior was exercised, and whether verification evidence
actually covers the requested requirements.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 45: Build Agent Final-Response Consistency Analysis

Compare the agent's prose report with observed execution/code/test
evidence. Detect unsupported completion claims, omitted failures,
claimed tests that were not observed, or discrepancies in files/features
described. Treat this as agent-report quality, not code truth.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE VII — ANALYTICAL METRICS AND MATHEMATICAL MODEL

Define decomposable metrics with confidence and evidence completeness instead of one opaque performance score.

## Task 46: Define the Multi-Dimensional Performance Vector

Represent each Prompt Run with decomposable dimensions such as prompt
clarity, specificity, requirement coverage, constraint compliance, scope
discipline, change discipline, verification quality, evidence
completeness, user satisfaction, runtime outcome quality, and
attribution confidence. Do not make a single score authoritative.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 47: Define Requirement Alignment Mathematics

Implement weighted requirement coverage with explicit treatment for
satisfied, partial, failed, contradicted, and unknown states. Store
numerator/denominator/components so every result is explainable and
recalculable.

Example baseline:

`Alignment = Σ(w_i × state_i) / Σ(w_i over evaluable requirements)`

Unknown/insufficient-evidence requirements must not be silently counted
as success.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 48: Define Constraint Compliance Mathematics

Create transparent compliance measures based on verified constraints and
violation severity. Distinguish hard prohibited actions from soft
preferences and expose each violation rather than hiding it inside an
aggregate.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 49: Define Verification Coverage Mathematics

Measure verified requirements against verifiable requirements,
test/build/tool evidence quality, and change coverage. Keep "test
executed" separate from "test proves requested behavior."

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 50: Define Change Discipline Mathematics

Build normalized measures for scope expansion, locality, dispersion,
unexpected deletion, unrelated component touches, and structural impact.
Normalize against comparable task categories and repository regions
rather than global arbitrary thresholds.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 51: Define Outcome and Regression Measures

Compute transparent historical rates such as user-accepted outcome rate,
partial/failure rate, later associated Issue rate, regression
association rate, rollback/rework rate, and verification-gap rate for
comparable cohorts.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 52: Define Confidence and Evidence Completeness

Every analytical result must carry confidence based on evidence
availability, attribution quality, user-label certainty, Code
resolution, Watch coverage, and intervening changes. Missing evidence
lowers confidence rather than automatically lowering performance.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 53: Build Composite Scores Only as Optional Views

If product UX needs a summary score, calculate it from versioned
component metrics with configurable weights and full decomposition.
Never train downstream models solely on the composite when richer
component features exist.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE VIII — DATA ANALYTICS AND DATA SCIENCE

Build descriptive/statistical intelligence before learned models, with reproducible snapshots and confounder-aware comparisons.

## Task 54: Build the Prompt Experience Dataset

Create the canonical historical analytical dataset from Prompt Runs,
prompt features, agent/model metadata, Code change profiles,
verification, user feedback, Watch outcomes, lineage, and confidence.
Keep raw evidence references so rows/features can be regenerated.

**Inspiration note:** Langfuse datasets; Phoenix versioned datasets;
Evidently evaluation datasets.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 55: Build Dataset Versioning and Reproducible Snapshots

Version dataset definitions, inclusion criteria, feature schemas,
labels, and time boundaries. Support exact historical snapshots so an
experiment/model can be reproduced after new experiences arrive.

**Inspiration note:** Langfuse dataset versions and reproducible
experiments; Phoenix versioned datasets.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 56: Build Data Quality Validation

Measure missingness, duplicates, invalid identities, stale references,
label sparsity, class imbalance, impossible timestamps, incomplete
Code/Watch linkage, leakage risk, and feature anomalies before analytics
or ML.

**Inspiration note:** Evidently's data-quality reports and tests.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 57: Build Descriptive Analytics

Provide distributions, rates, percentiles, cohort summaries,
task/agent/project breakdowns, trend lines, and uncertainty intervals
for prompt features, change profiles, feedback, verification, and
outcomes. Analytics must remain useful before any ML model exists.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 58: Build Cohort and Segmentation Analysis

Compare performance by task category, repository region, component,
agent/model, prompt pattern, verification strategy, user-feedback class,
release period, and project context. Enforce minimum cohort sizes to
avoid misleading conclusions.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 59: Build Statistical Comparison Tests

Use appropriate statistical tests/effect sizes to compare prompt
strategies or cohorts while controlling for sample size and distribution
assumptions. Report effect size and uncertainty, not only p-values.

**Inspiration note:** SciPy statistical primitives; Evidently
reference-vs-current comparisons.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 60: Build Bootstrap Confidence Intervals

Use bootstrap/resampling for unstable or non-normal performance metrics,
cohort differences, and historical rates. Persist method/version/random
seed so analytical results are reproducible.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 61: Build Correlation Analysis

Measure relationships among prompt features, agent behavior, change
profiles, verification, user feedback, and runtime outcomes using
appropriate Pearson/Spearman/categorical association methods. Label
these as correlations, not causal findings.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 62: Build Confounder-Aware Comparative Analysis

Control for obvious confounders such as task difficulty, component,
agent/model, repository size, change size, release context, and
user/project. Prevent simplistic conclusions such as "long prompts are
better" when task complexity explains the difference.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 63: Build Time-Series and Trend Analysis

Track how prompt practices, agent behavior, user satisfaction,
regression associations, and verification quality change over time.
Support rolling windows, seasonality-aware comparisons where relevant,
and change-point candidates.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 64: Build Data/Concept Drift Detection

Detect when prompt distributions, task categories, code-change profiles,
agents/models, user labels, or outcome relationships materially shift,
invalidating historical assumptions or models.

**Inspiration note:** Evidently's data-drift and monitoring
architecture.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 65: Build Anomaly Detection Baselines

Detect unusual Prompt Runs using transparent statistical rules over
change size, dispersion, verification, duration, failure patterns, and
outcome signals. Do not equate anomaly with bad performance.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 66: Build Experiment Analysis

Support controlled comparison of prompt variants, agent/model choices,
verification instructions, and workflow changes using frozen
datasets/cohorts. Separate observational analysis from true experiments.

**Inspiration note:** Langfuse experiments/datasets; Phoenix
experiments; Promptfoo comparative evaluations.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE IX — LINEAGE, SIMILARITY, RELATIONSHIP GRAPH, AND EXPERIENCE RETRIEVAL

Retrieve comparable historical development experiences using lineage, lexical search, vectors, repository changes, sibling outcomes, and graph traversal.

## Task 67: Build Prompt Lineage

Track parent/child prompt revisions, semantic edits, added/removed
constraints, changed acceptance criteria, verification additions, and
outcome differences. Preserve lineage independently from text
similarity.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 68: Build Task/Problem Taxonomy

Create a versioned taxonomy for coding tasks and problem areas such as
authentication, database, UI, performance, testing, refactoring,
dependency, security, configuration, and repository-specific components.
Support multi-label classification and unknown categories.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 69: Build Lexical and Structured Similarity

Retrieve prior experiences using lexical overlap, code terms, task
category, prompt features, referenced components, and structured
requirements. Return an explanation of why each historical run matched.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 70: Build Semantic Similarity

Add embeddings as one signal for semantically related prompts, agent responses, or development Episodes using different wording.

Keep the embedding provider replaceable and versioned. Treat vector distance as retrieval evidence, not truth. Combine semantic similarity with repository-change, verification, feedback, and sibling-outcome signals. Sensitive content obeys privacy/export policy before embedding.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 71: Build Repository-Change-Aware Similarity

Find historical experiences that touched the same or related files, modules, symbols where resolvable, dependency/configuration surfaces, tests, or semantic change categories even when prompt wording differs.

This replaces the Midnight Code-aware similarity dependency. The feature works at file/Change-Set level when deeper structural resolution is unavailable.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 72: Build Cross-Domain Outcome Similarity

Relate development experiences that produced similar outcome patterns across optional sibling domains: Watch Runtime Issue/regression/trace patterns, Watch Data query/data-runtime/cost patterns, and Security finding/remediation/verification patterns.

Keep each sibling's identity/provenance and expose which outcome dimensions caused the match.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 73: Build Multi-View Experience Retrieval

Combine prompt structure, task taxonomy, agent execution, actual repository changes, verification, user feedback, vector similarity, relationship-graph traversal, and optional Watch Runtime/Data/Security outcome similarity.

Return per-signal explanations and evidence. Do not collapse retrieval into one opaque nearest-neighbor score.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 74: Build Experience Neighborhoods

Construct local neighborhoods around a current Prompt Run or draft
prompt, showing comparable successful, partial, failed, regressed, and
uncertain experiences. Use neighborhoods as evidence for analytics and
later recommendations.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 75: Build the Performance Relationship Graph Projection

Create a rebuildable relationship graph over Performance-owned entities and external references.

Connect Prompt → Agent Run → tools/commands → Change Set → repository entities → Verification → Feedback → Episode → sibling outcomes → Memory. Include similarity, contradiction, supersession, remediation, and evidence-lineage edges.

The graph supports traversal, lineage, impact exploration, and Memory retrieval. It is not the canonical evidence store and is not GraphRAG.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 76: Build Hybrid Relational + Vector + Graph Retrieval

Use relational/time filters for exact identity and dates, vector search for semantic similarity, relationship-graph traversal for lineage and multi-hop history, and lexical/structured search for exact technical terms and deterministic fallback.

Return which retrieval paths contributed to each result. GraphRAG remains a future optional benchmarked technique, not the required retrieval architecture.

**New-Midnight alignment:**
- Vector and graph structures are retrieval/index projections, not canonical truth.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE X — MACHINE LEARNING

Introduce ML only after dataset readiness and transparent baselines, with calibration, explainability, drift, and rollback.

## Task 77: Establish the ML Readiness Gate

Do not train production models merely because data exists. Define
minimum dataset size, label quality, coverage, drift stability, leakage
controls, class balance, and deterministic baseline performance required
before each ML use case is allowed.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 78: Build Reproducible ML Feature Pipelines

Create versioned feature extraction for prompt structure, Code changes,
execution behavior, verification, user feedback, Watch outcomes,
historical context, and similarity signals. Prevent target leakage from
future outcomes into features intended for pre-run prediction.

**Inspiration note:** scikit-learn pipeline/model-selection principles.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 79: Build Train/Validation/Test Splitting by Time and Project

Use temporal and grouped splits to prevent near-duplicate Prompt Runs,
prompt lineage, or same-project artifacts from leaking across evaluation
partitions. Maintain frozen holdout sets for honest model qualification.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 80: Build Classical ML Baselines

Evaluate interpretable models first---regularized linear/logistic
models, decision trees, random forests/gradient boosting where
justified, nearest-neighbor methods, and calibrated probabilistic
models---against deterministic/statistical baselines.

**Inspiration note:** scikit-learn supervised learning, preprocessing,
model selection, and evaluation.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 81: Build Unsupervised Prompt/Experience Clustering

Evaluate clustering for discovering recurring prompt/task/outcome
patterns that the explicit taxonomy misses. Require cluster stability
and human interpretability before surfacing clusters as product
concepts.

**Inspiration note:** scikit-learn clustering; use specialized
clustering libraries only if benchmarks justify them.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 82: Build Learned Outcome Association Ranking

Train models, only after readiness gates pass, to rank which historical
experiences or prompt features are associated with
successful/partial/failed outcomes. Predictions must expose uncertainty
and must not be presented as causal claims.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 83: Build Learned Regression-Risk Estimation

Evaluate whether historical prompt/execution/Code features can estimate
the risk of later Watch regressions. Use only information available at
the prediction point, calibrate probabilities, and compare against
simple change-size/verification baselines.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 84: Build Model Calibration and Uncertainty

Measure calibration, confidence intervals, class-specific
precision/recall, Brier/log loss where appropriate, and abstention
behavior. The system must be able to say "insufficient confidence."

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 85: Build Explainability for Learned Models

Provide feature contribution or local explanation methods appropriate to
the chosen models. Never expose a model score without enough context to
understand the strongest evidence/signals behind it.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 86: Build Model Registry and Version Lineage

Track model version, training dataset snapshot, feature schema, code
version, hyperparameters, metrics, calibration, approval state,
deployment state, and rollback target.

**Inspiration note:** general MLOps model-lineage practices;
scikit-learn reproducibility principles.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 87: Build Model Drift and Performance Monitoring

Monitor feature drift, label drift, calibration degradation, cohort
performance, and stale-model conditions. Automatically mark models
degraded or unsuitable for recommendation when assumptions no longer
hold.

**Inspiration note:** Evidently's ML monitoring/drift architecture.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 88: Build Champion/Challenger Evaluation

Run new models against the current deterministic or learned champion on
frozen and recent datasets before promotion. Require measurable
improvement and no unacceptable cohort regression.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XI — EVALUATION SYSTEM

Evaluate Performance's own conclusions through deterministic evaluators, optional LLM judges, and human review without allowing one judge to become truth.

## Task 89: Build the Performance Evaluation Framework

Create a provider-neutral evaluator interface supporting deterministic
code evaluators, statistical evaluators, user labels, optional
model-based judges, and custom project evaluators. Store evaluator
version, evidence, score, explanation, and confidence separately.

**Inspiration note:** Langfuse evaluations/scores; DeepEval metrics;
Phoenix evaluations.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 90: Build Deterministic Evaluators First

Implement evaluators for requirement coverage, constraint violations,
verification evidence, unexpected deletions, scope expansion, test/build
outcomes, and agent-report consistency before adding LLM judges.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 91: Add Optional LLM-as-a-Judge Evaluators

Allow external or local models to evaluate semantic criteria that
deterministic analysis cannot resolve, but require explicit provider
configuration, prompt/version provenance, cost/privacy controls,
repeatability testing, and separation from authoritative evidence.

**Inspiration note:** Langfuse LLM-as-a-judge; DeepEval G-Eval/custom
evaluators; Evidently LLM judges.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 92: Build Human Labeling and Review

Allow users or reviewers to inspect Prompt Runs, evidence, evaluator
results, and disagreement cases and provide labels. Use review data for
evaluation/model improvement without rewriting raw observations.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 93: Build Evaluation Agreement Analysis

Measure agreement/disagreement among deterministic evaluators, users,
Watch outcomes, repository/change evidence, and LLM judges. Use disagreement as a
signal for uncertainty and active-learning questions.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XII — DATASETS, BENCHMARKS, AND EXPERIMENTS

Turn real and curated development experiences into reproducible datasets and experiments for regression and prompt-strategy evaluation.

## Task 94: Build Curated Performance Datasets

Allow users to promote representative real Prompt Runs into curated
datasets with input, expected intent/constraints, code context
references, expected verification, outcome labels, and provenance.

**Inspiration note:** Langfuse datasets sourced from production traces;
Phoenix datasets.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 95: Build Dataset Item Versioning

Version dataset items and expected outcomes so historical experiments
remain reproducible after corrections or new labels.

**Inspiration note:** Langfuse versioned datasets.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 96: Build Offline Prompt Experiments

Run prompt variants against controlled tasks/fixtures and compare agent
execution, code changes, verification, and evaluators. Experiments must
be isolated from production repositories unless explicitly authorized.

**Inspiration note:** Langfuse experiments; Phoenix experiments;
Promptfoo prompt/model comparisons.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 97: Build Regression Evaluation

Re-run important prompt/task datasets when prompt templates, adapters,
evaluators, agents/models, or analytical logic changes. Surface
regressions by metric and cohort rather than only pass/fail.

**Inspiration note:** Promptfoo regression testing and CI; Langfuse
dataset experiments.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 98: Build Experiment Reproducibility

Persist dataset version, prompt version, agent/model/version,
parameters, repository fixture/version, evaluator versions, Code/Watch
fixture versions, environment, and random seeds where applicable.

------------------------------------------------------------------------

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XIII — PERFORMANCE MEMORY

Build organized Prompt, Execution, Change, Verification, Outcome, Episode, and Knowledge memory with evidence-gated promotion.

## Task 99: Define the Performance Memory Architecture and Memory Evidence Ledger

Define logical Performance Memory domains without assuming one database per memory:

- Prompt Memory;
- Agent Response / Execution Memory;
- Code Output / Change Memory;
- Verification Memory;
- Outcome Memory;
- Episode Memory;
- Performance Knowledge Memory.

Every Prompt Run and relevant output/change may be retained according to policy, but not every record is promoted to durable knowledge. Create a dedicated Memory-evidence stream for promotion candidates and verified lessons.

Canonical evidence remains in Performance history stores. Vector indexes and relationship graphs are retrieval projections. Memory is not a replacement for the raw evidence ledger.

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 100: Define Performance Knowledge Records

Represent durable evidence-backed knowledge such as verified prompt patterns, recurring project constraints, agent/project-specific behaviors, repeated failure/rework patterns, verified change/verification strategies, security/data/runtime consequences, and operational limits.

Each Knowledge Record carries provenance, evidence references, scope, confidence, temporal validity, contradiction/supersession state, and applicability conditions. AI summaries cannot become knowledge merely because they sound plausible.

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 101: Build Deterministic Memory Promotion

Promote candidate knowledge only when configured evidence thresholds are satisfied across development Episodes, actual repository changes, verification, user feedback, sibling outcomes, or controlled experiments.

Promotion rules may permit a single high-severity verified lesson or require repetition depending on knowledge class. AI-generated summaries and model predictions cannot self-promote.

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 102: Build Memory Contradiction and Supersession

Preserve contradictory lessons, changed behavior after agent/model
upgrades, project-specific exceptions, and superseded knowledge rather
than overwriting history.

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 103: Build Performance Memory Retrieval

Retrieve Prompt, Execution, Change, Verification, Outcome, Episode, and durable Knowledge memory by prompt/task, repository surface, agent/model, verification pattern, sibling outcome, time, lineage, and experience neighborhood.

Combine relational filters, vector similarity, and relationship-graph traversal where useful. Return provenance, confidence, validity, contradiction state, and retrieval method. GraphRAG is not required.

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 104: Build Performance Memory Recovery and Retention

Treat promoted knowledge as non-regenerable project intelligence. Add
backup/restore, integrity checks, additive migrations, archival, and
explicit behavior when underlying raw evidence has expired.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Logical Memory domains may share physical infrastructure; Memory domain does not imply one database per memory.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XIV — VISUAL INTELLIGENCE

Expose development history through bounded visual projections rather than a universal code graph.

## Task 105: Build the Midnight Performance Visual Map

Create a dedicated Performance Map showing Prompt Runs, agent sessions/turns, actual Change Sets, repository entities where resolved, verification, feedback, Episodes, sibling outcome references, datasets, experiments, Memory, and analytical relationships.

The map is a projection over canonical evidence. It is not a universal code graph, not the canonical store, and not GraphRAG.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 106: Build Prompt Lineage Visualization

Show how prompt revisions changed constraints, requirements,
verification instructions, code outcomes, user feedback, and runtime
outcomes over time.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 107: Build Experience Neighborhood Visualization

Visualize multi-view historical neighborhoods around a selected Prompt Run, Episode, Change Set, or draft prompt. Separate successful, partial, failed, regressed, security-affected, data-regressed, and uncertain experiences.

Show why neighbors matched: prompt semantics, repository surface, verification strategy, outcome patterns, graph relationships, or combinations.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 108: Build Metric and Cohort Dashboards

Provide distributions, trends, cohorts, confidence intervals, drift,
experiment comparisons, model performance, and user-feedback summaries.
Avoid dashboard metrics that cannot be traced to definitions and data
versions.

**Inspiration note:** Evidently monitoring/report patterns; Langfuse
metrics/evaluation views.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 109: Build Cross-Product Navigation

Allow Performance entities to navigate to referenced Watch Runtime, Watch Data, and Security evidence without copying sibling data into the Performance map.

Navigation uses stable external references and permission checks. Absence of a sibling capability produces an explicit unavailable state rather than a broken Performance history.

**New-Midnight alignment:**

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XV — ASK ME, PREFLIGHT, ADVISOR, AND SUGGESTION

Make Performance useful on demand through evidence-backed querying and recommendations while preserving user control.

## Task 110: Build Read-Only Ask Me

Provide evidence-backed natural-language querying over Prompt Runs, Agent Runs, Change Sets, verification, feedback, Episodes, datasets, experiments, Memory, repository/change references, and optional Watch Runtime/Data/Security outcomes.

Answers distinguish observed, derived, inferred, statistical, predicted, recommended, and unknown claims.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 111: Build Draft-Prompt Preflight Analysis

Before a user sends a draft prompt, analyze it—only when explicitly invoked—against current repository evidence, relevant historical Episodes, Prompt/Change/Verification Memory, known project constraints, and optional Watch Runtime/Data/Security outcomes.

Do not require the user to send prompts through Performance. Do not rewrite or submit the prompt automatically. Preflight is Active Intelligence, not a passive interruption.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 112: Build Advisor

Generate user-invoked advice explaining missing requirements/constraints, verification gaps, relevant historical failures/successes, likely repository surfaces, prior rework patterns, and optional runtime/data/security outcomes.

Every recommendation links to evidence or identifies itself as a general heuristic. Performance may use sibling evidence but cannot claim sibling authority.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 113: Build Suggestion

Generate optional revised prompt suggestions from evidence-backed
lessons while preserving the user's intent and showing what changed and
why. The user remains responsible for accepting, editing, or rejecting
the suggestion.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 114: Build Recommendation Evaluation

Measure whether accepted Advisor/Suggestion recommendations actually
improve later user feedback, alignment, verification, rework, and Watch
outcomes. Prevent the recommender from declaring itself successful based
only on its own scores.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 115: Build Recommendation Guardrails

Prevent automatic code changes, automatic prompt submission, hidden prompt rewriting, provider-session control, unsupported causal claims, overconfident recommendations, cross-project leakage, and recommendations based on incomplete sibling evidence without disclosure.

Advisor/Suggestion are Active Intelligence. Passive Performance observation must never silently transform the developer's prompt.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XVI — API, EXTERNAL AI, ORCHESTRATION CONTRACTS, AND INTERACTION

Expose stable APIs and optional AI/orchestration integrations while formalizing invisible-by-default interaction.

## Task 116: Define the Performance Query API

Expose bounded, versioned APIs for Prompt Runs, Agent Runs, repository Change Sets, analyses, metrics, verification, feedback, outcomes, Episodes, datasets, experiments, models, Memory, similarity, graph relationships, and recommendations.

No client or sibling product should require direct access to Performance storage.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 117: Build MCP-Compatible and Host-Native Read Tools

Expose authorized read/query capabilities so supported assistants, coding-agent hosts, dashboards, desktop clients, or MCP-capable tools can inspect Performance evidence, compare runs, retrieve Episodes, query Memory, traverse relationships, and request analyses.

These tools are an interaction surface—not the mechanism by which Performance captures every agent session. Passive capture should use native hooks/events/plugins whenever possible.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 118: Build the Optional AI Analysis Provider Interface

Define a provider-neutral interface for semantic analysis/evaluation
using OpenAI, Anthropic, local models, or future providers. Midnight
Performance core analytics must not be hard-wired to one vendor.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 119: Build Local/Private AI Analysis Mode

Support local/self-hosted models for customers who cannot send
prompts/source/evidence to external model providers. Expose capability
differences explicitly rather than silently falling back to cloud AI.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 120: Build AI Cost, Latency, and Quality Accounting

Measure provider/model cost, latency, evaluator agreement, failure rate,
and usefulness so optional AI analysis can be compared against
deterministic/statistical alternatives.

**Inspiration note:** Langfuse cost/latency/trace analytics; OpenLIT AI
observability.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 121: Expose Performance Capabilities to the Midnight Intelligence Orchestration Plane

Expose typed, versioned capabilities such as history.query, prompt.retrieve, execution.retrieve, change.retrieve, episode.retrieve, similarity.search, memory.query, prompt.generate, verification.history, and outcome.record.

A future Midnight Intelligence Orchestration layer may coordinate these capabilities in Security, Watch, or Data workflows. Performance owns development-history intelligence; the orchestrator owns workflow coordination. Performance must not regain the retired role of launching or hosting coding agents.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 122: Build Invisible-by-Default Passive and Active Interaction Policy

Formalize two Performance modes.

Passive Intelligence observes, records, normalizes, correlates, analyzes, indexes, and learns according to approved policy while the developer works normally in Claude Code, Codex, OpenCode, an IDE, or another coding harness.

Active Intelligence is explicitly invoked through `/midnight`, `/performance`, Dashboard, API, MCP/host tools, or another supported surface for queries, comparisons, preflight, Advisor, Suggestion, or investigation.

Default policy is silent. Performance must not emit noisy per-prompt notifications, inject context into prompts, or modify agent behavior simply because it is installed.

**New-Midnight alignment:**
- Active intelligence is user-invoked; passive observation must not modify prompts or agent behavior.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XVII — STORAGE, SCALE, AND DEPLOYMENT

Scale storage and deployment by measured workload, preserving local/self-hosted/BYOC operation.

## Task 123: Define Storage Boundaries by Workload

Separate relational product state, high-volume observations, analytical
datasets, embeddings, experiment artifacts, model artifacts, and durable
Memory behind interfaces. Do not select distributed infrastructure
before measured load requires it.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 124: Build Analytical Query Storage Strategy

Benchmark the Experience Dataset and cohort/experiment workloads and
introduce columnar/analytical storage only when relational projections
are insufficient. Preserve reproducible dataset snapshots independent of
storage engine.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 125: Build Backpressure and Failure Isolation

Use bounded queues, worker isolation, retry budgets, degraded modes, and
explicit failure accounting. Failures in ML, AI evaluation, similarity,
dashboards, or recommendations must not corrupt raw Performance
evidence.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 126: Build Multi-Tenancy and Project Isolation

Enforce tenant/project/workspace/repository boundaries across
observations, Code/Watch references, datasets, experiments, models,
Memory, embeddings, APIs, and recommendations.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 127: Build Self-Hosted Midnight Performance

Provide a supported self-hosted deployment including migrations, health
checks, backup/restore, model/analytics workers, optional local AI
providers, secrets, and resource sizing.

**Inspiration note:** Langfuse self-hosting; Phoenix local/container
deployment; OpenLIT self-hosting.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 128: Build Bring Your Own Cloud

Support customer-controlled deployment/data-plane patterns so prompts,
source evidence, analytical datasets, models, and Memory can remain in
customer infrastructure.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 129: Define Optional Midnight-Managed Cloud

Offer managed deployment without making it architecturally privileged.
Self-hosted, BYOC, and managed modes must preserve compatible contracts,
export paths, privacy guarantees, and analytical semantics.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 130: Build Bring Your Own Data/ML Resources

Abstract object storage, analytical storage, queues, embedding
providers, model execution, and optional ML compute behind provider
contracts. Credentials belong in a dedicated secure credential layer.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XVIII — SECURITY AND TRUST

Protect prompts, source code, transcripts, datasets, Memory, agent hooks/plugins, and cross-product evidence from abuse.

## Task 131: Build the Midnight Performance Threat Model

Threat-model malicious repository content, prompt injection embedded in source/tool output, poisoned agent events, forged hook/plugin payloads, transcript tampering, compromised adapter configuration, cross-project leakage, secret exposure, malicious diffs, oversized outputs, evaluator poisoning, dataset/model poisoning, unsafe MCP/AI consumption, and denial-of-service through high-frequency event streams.

Treat agent hooks/plugins as a trust boundary. Performance observation must not grant the coding agent more filesystem/network authority than it already had.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 132: Build Evidence Authenticity and Provenance

Preserve where every Performance observation came from: provider hook/event/plugin, transcript, command result, VCS operation, filesystem baseline/fingerprint, CI result, user feedback, Watch Runtime, Watch Data, Security, or external AI/evaluator.

Support signatures/checksums/source sequence where practical and detect contradictions between agent-native edit claims and final repository state. Provenance is required for later learning.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 133: Build Dataset and Model Poisoning Defenses

Detect anomalous labels, duplicated/adversarial experiences,
cross-project contamination, suspicious feedback patterns, and poisoned
training inputs. Require approval/review for high-impact dataset/model
changes.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 134: Build AI and Telemetry Prompt-Injection Boundaries

Treat prompts, source code, repository instructions, tool output, logs, runtime evidence, security findings, database text, and external content as untrusted data when fed to optional AI analysis.

Do not allow captured content to redefine system instructions, permission policy, export policy, Memory-promotion rules, or cross-product access. Preserve deterministic analyzers where AI is unnecessary.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 135: Build Privacy-Preserving Analytics Controls

Support minimization, hashing/pseudonymization where useful,
configurable raw-prompt/source retention, feature-only analytical modes
where appropriate, deletion propagation, and auditable privacy policies.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XIX — PERFORMANCE'S OWN OBSERVABILITY

Instrument Performance itself so missing capture and analytical failure cannot masquerade as normal product behavior.

## Task 136: Instrument Midnight Performance

Measure ingestion latency, adapter health, Code/Watch integration
health, analysis latency, feature extraction, dataset freshness,
evaluator latency/cost, model inference, drift jobs, Memory
promotion/retrieval, recommendation latency, queue depth, failures, and
dropped evidence.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 137: Build Analytical Data Health Monitoring

Continuously monitor missing Code/Watch links, stale datasets, delayed
feedback, feature-generation failures, label imbalance, drift, and
incomplete outcome windows so degraded analytics cannot masquerade as
trustworthy conclusions.

**Inspiration note:** Evidently monitoring/data-quality patterns.

------------------------------------------------------------------------

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# PHASE XX — QUALIFICATION AND NEW-MIDNIGHT RELEASE GATES

Prove capture, analysis, Memory, recommendations, sibling contracts, recovery, and product independence against deterministic gates.

## Task 138: Build Deterministic Prompt/Repository Evaluation Corpora

Create frozen Prompt Runs with known prompts, provider lifecycle events, commands/tools, repository baselines, diffs/Change Sets, requirements, constraints, tests/verification, feedback, sibling references, and expected analytical results.

Measure requirement alignment, constraint detection, change attribution, scope analysis, execution-window correctness, and reproducibility without relying on a retired Midnight Code service.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 139: Build Coding-Harness and Repository-Change Qualification

Qualify attached observation for Codex, Claude Code, and OpenCode against real or controlled provider surfaces.

Prove that developers run each agent normally; Performance captures only declared capabilities; missing/unapproved hooks degrade explicitly; duplicate/replayed events are idempotent; execution windows survive resumes/interruption; native file/tool events reconcile against actual repository state; agent prose cannot override final Change Set evidence; and provider drift is detected rather than silently misparsed.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 140: Build Watch Runtime Integration Qualification

Prove Performance consumes Watch Runtime outcomes through explicit contracts, handles sampling/missing telemetry/intervening changes, and never mutates Watch Runtime truth or reads Watch storage directly.

Validate development Episode → release/deployment → Issue/regression associations using both positive and adversarial counterexamples.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 141: Build Watch Data Integration Qualification

Prove Performance consumes Watch Data schema/access/query/runtime/cost/regression/verification evidence through explicit contracts.

Test missing permissions, incomplete database telemetry, workload mismatch, intervening migrations, and stale references. Performance must never read Watch Data storage directly or claim database truth independently.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 142: Build Midnight Security Integration Qualification

Prove Performance links Security findings and verified remediation outcomes to the correct development Episodes and provides bounded development-history context back to Security.

Test finding reintroduction, multiple candidate Change Sets, failed remediation attempts, absent Security, and Security downtime. Performance must not duplicate Security findings as its own authority.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 143: Build User-Feedback Qualification

Test feedback capture, revision, uncertainty, active-learning question
selection, disagreement handling, and prevention of user labels becoming
unquestioned ground truth.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 144: Build Data Analytics Qualification

Validate descriptive analytics, cohorts, statistical tests, confidence
intervals, correlation analysis, confounder controls, trend analysis,
and drift detection against frozen datasets and known synthetic
distributions.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 145: Build ML Qualification

For every learned model, require frozen train/validation/test
definitions, leakage tests, baseline comparison, calibration, cohort
metrics, explainability, drift criteria, rollback, and explicit proof
that the learned method improves the intended decision.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 146: Build Evaluation-System Qualification

Compare deterministic evaluators, human labels, Watch outcomes, and
optional LLM judges. Measure agreement, variance, reproducibility, false
positives/negatives, and cost. No LLM judge may become sole product
truth.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 147: Build Memory Qualification

Test promotion, provenance, contradiction, supersession, retrieval,
retention, backup/restore, and historical validity. Verify that noisy
Prompt Runs and AI-generated interpretations cannot automatically become
durable Performance knowledge.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 148: Build Advisor/Suggestion Qualification

Measure recommendation usefulness on held-out historical and controlled
tasks, then on opt-in real use. Verify that recommendations improve
user-relevant outcomes rather than merely optimizing Performance's
internal metrics.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 149: Build Security and Isolation Qualification

Run tenant/project isolation, privacy, poisoning, prompt-injection, forged-evidence, hook/plugin tampering, credential, deletion, malicious-payload, transcript, dataset/model, MCP, AI-provider, and cross-product contract tests.

Include Watch Runtime, Watch Data, and Security integrations where enabled, but prove Performance remains secure and useful when all siblings are absent.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 150: Build Scale, Cost, and Recovery Qualification

Benchmark agent-event ingestion, repository-change capture, dataset growth, relational/vector/graph retrieval, analytical queries, experiments, optional model training/inference, Memory, dashboards, and sibling-outcome correlation.

Test process crashes, missing hooks, unavailable Watch Runtime/Data/Security, queue/storage failures, partial migrations, corrupted graph/vector projections, model failure, and recovery. Scale decisions must be evidence-driven.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 151: Build Full New-Midnight Ecosystem Qualification

Run Performance + Security + Watch Runtime + Watch Data together with stable references, independent storage/failure domains, explicit degraded behavior, and no direct sibling database reads.

Exercise at least one end-to-end loop: development Prompt Run → actual Change Set → verification → release/deployment → Watch Runtime and/or Watch Data outcome → Security finding/verification when applicable → Performance Episode/Memory outcome update.

If an internal Midnight Intelligence Orchestration layer exists, prove it coordinates capability calls only and does not own Performance evidence or coding-agent execution.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

## Task 152: Final Architecture and Product-Truth Gate

Audit the complete Performance system and prove that Performance studies development work through actual evidence, not agent prose alone; repository/VCS/filesystem evidence grounds observed changes; Midnight Code and GraphRAG are not required; Performance does not host coding agents; passive capture is invisible by default and cannot silently rewrite prompts; Watch Runtime, Watch Data, and Security remain authoritative for their domains; Data Science works before ML; vector search and graphs are projections; Memory preserves provenance-backed learning; Advisor remains user-controlled; orchestration is coordination only; and Performance remains independently useful with no sibling product, external AI, or GraphRAG.

**New-Midnight alignment:**
- Self-hosted/local/BYOC modes remain first-class and external AI remains optional.
- Qualification must prove degraded states and failure accounting instead of fabricated success.

**After completion:**
- The task produces versioned, evidence-backed Performance state suitable for later analysis.
- Observed, derived, inferred, predicted, recommended, and unknown claims remain distinguishable.

# Deferred / Benchmark-Gated Expansion

- **GraphRAG over Performance history** — not required for O2; evaluate only if graph traversal + vector + relational/lexical retrieval fails important multi-hop benchmarks.
- **Fine-tuning / reinforcement-learning export** — Performance datasets and verified Episode outcomes may later feed model adaptation, but training is a separate explicit capability with consent, governance, leakage controls, and task-specific benchmarks.
- **Autonomous prompt optimization** — not part of passive mode; any future closed loop requires explicit policy, shadow evaluation, rollback, and proof of external outcome improvement.
- **Universal coding-harness support** — add Cursor, Gemini, Copilot, Antigravity, Kiro, Devin, and future harnesses through the same capability contract after core adapters stabilize.
- **Universal code graph** — not a product goal; add only bounded structural indexes needed for specific Performance analyses.

# Old → New Roadmap Migration Audit

The old roadmap contained **142 tasks**. The replacement contains **152 tasks**. Every old task is preserved, rewritten, or superseded; additional tasks cover the new architecture.

## Material migrations

- Old Task 1 / Product Doctrine: changed from Code + Watch dependency to standalone development-history intelligence.
- Old Tasks 17–23: repurposed from Midnight Code integration to Performance-owned repository change intelligence.
- Old Watch integration phase: expanded into Watch Runtime + Watch Data + Security outcome contracts.
- Old code-aware similarity: replaced with repository-change-aware and cross-domain similarity.
- Old Performance Memory: expanded into logical Prompt, Execution, Change, Verification, Outcome, Episode, and Knowledge memories.
- Old cross-product navigation: now targets Watch Runtime, Watch Data, and Security rather than Midnight Code.
- Old ecosystem qualification: replaced with coding-harness/repository evidence and the new Midnight ecosystem.

## New tasks introduced

- Coding-harness capability drift and fail-soft capture.
- Watch Data outcome contract.
- Security outcome contract.
- Watch Data/Security association with development Episodes.
- Performance Relationship Graph projection.
- Hybrid relational + vector + graph retrieval.
- Performance capability contract for optional Midnight Intelligence Orchestration.
- Invisible-by-default Passive/Active interaction policy.
- Watch Data integration qualification.
- Security integration qualification.

## Full old-task mapping

- **Old Task 1 → New Task 1 (rewritten):** Freeze the Midnight Performance Product Boundary → Freeze Midnight Performance as Development-History Intelligence
- **Old Task 2 → New Task 2 (rewritten):** Define the Performance Domain Architecture → Reconcile the Performance Domain Architecture With the New Midnight Model
- **Old Task 3 → New Task 3 (rewritten):** Define the Performance Identity and Correlation Contract → Define the New Performance Identity and Correlation Contract
- **Old Task 4 → New Task 4 (preserved/requalified):** Define the Canonical Performance Observation Model → Define the Canonical Performance Observation Model
- **Old Task 5 → New Task 5 (preserved/requalified):** Build the Append-Oriented Performance Evidence Ledger → Build the Append-Oriented Performance Evidence Ledger
- **Old Task 6 → New Task 6 (preserved/requalified):** Implement Privacy, Source-Code Protection, and Sensitive-Data Controls → Implement Privacy, Source-Code Protection, and Sensitive-Data Controls
- **Old Task 7 → New Task 7 (rewritten):** Define the Evidence Authority Hierarchy → Define the New Evidence Authority Hierarchy
- **Old Task 8 → New Task 8 (preserved/requalified):** Build Versioned Analysis and Reprocessing Contracts → Build Versioned Analysis and Reprocessing Contracts
- **Old Task 9 → New Task 9 (rewritten):** Formalize Bring Your Own Coding Agent → Formalize Bring Your Own Coding Harness Observation
- **Old Task 10 → New Task 10 (rewritten):** Implement the Codex Performance Adapter → Implement the Codex Performance Observation Adapter
- **Old Task 11 → New Task 11 (rewritten):** Implement the Claude Code Performance Adapter → Implement the Claude Code Performance Observation Adapter
- **Old Task 12 → New Task 12 (rewritten):** Implement the OpenCode Performance Adapter → Implement the OpenCode Performance Observation Adapter
- **Old Task 13 → New Task 13 (rewritten):** Build Deterministic Agent Execution Windows → Build Deterministic Agent Execution and Turn Windows
- **Old Task 14 → New Task 14 (rewritten):** Build Deterministic Change Capture → Build Native Repository Change Capture
- **Old Task 15 → New Task 15 (preserved/requalified):** Capture Commands, Tools, Tests, and Verification Evidence → Capture Commands, Tools, Tests, and Verification Evidence
- **Old Task 16 → New Task 17 (rewritten):** Define Prompt Run as the Core Experience Unit → Define Prompt Run as the Core Development Experience Unit
- **Old Task 17 → New Task 18 (rewritten):** Define the Midnight Code Evidence Contract → Define Performance Repository-Change Evidence Authority
- **Old Task 18 → New Task 19 (rewritten):** Build Code-Change Resolution → Build Repository Change Resolution
- **Old Task 19 → New Task 20 (preserved/requalified):** Build Semantic Change Classification → Build Semantic Change Classification
- **Old Task 20 → New Task 21 (preserved/requalified):** Build Change Scope and Surface Metrics → Build Change Scope and Surface Metrics
- **Old Task 21 → New Task 22 (preserved/requalified):** Build Change Locality and Dispersion Analysis → Build Change Locality and Dispersion Analysis
- **Old Task 22 → New Task 23 (preserved/requalified):** Build Structural Impact Analysis → Build Structural Impact Analysis
- **Old Task 23 → New Task 24 (rewritten):** Build Code-Intent Evidence Mapping → Build Prompt-Intent ↔ Repository-Change Evidence Mapping
- **Old Task 24 → New Task 25 (rewritten):** Define the Midnight Watch Outcome Contract → Define the Midnight Watch Runtime Outcome Contract
- **Old Task 25 → New Task 28 (rewritten):** Build Runtime Outcome Windows → Build Cross-Product Outcome Windows
- **Old Task 26 → New Task 29 (rewritten):** Build Prompt Run ↔ Error/Issue Association → Build Prompt Run ↔ Watch Runtime Issue Association
- **Old Task 27 → New Task 30 (rewritten):** Build Prompt Run ↔ Log/Event/Trace Association → Build Prompt Run ↔ Watch Runtime Trace/Event/Regression Association
- **Old Task 28 → New Task 32 (preserved/requalified):** Build Intervening-Change Attribution → Build Intervening-Change Attribution
- **Old Task 29 → New Task 33 (preserved/requalified):** Build Outcome Evidence Quality → Build Outcome Evidence Quality
- **Old Task 30 → New Task 34 (preserved/requalified):** Define the Post-Run User Feedback Loop → Define the Post-Run User Feedback Loop
- **Old Task 31 → New Task 35 (preserved/requalified):** Build Structured Feedback Reasons → Build Structured Feedback Reasons
- **Old Task 32 → New Task 36 (preserved/requalified):** Build Feedback Provenance and Revision → Build Feedback Provenance and Revision
- **Old Task 33 → New Task 37 (preserved/requalified):** Build Active-Learning Question Selection → Build Active-Learning Question Selection
- **Old Task 34 → New Task 38 (preserved/requalified):** Build Multi-Signal Outcome Labels → Build Multi-Signal Outcome Labels
- **Old Task 35 → New Task 39 (preserved/requalified):** Build Prompt Structural Feature Extraction → Build Prompt Structural Feature Extraction
- **Old Task 36 → New Task 40 (preserved/requalified):** Build Prompt Clarity and Specificity Metrics → Build Prompt Clarity and Specificity Metrics
- **Old Task 37 → New Task 41 (preserved/requalified):** Build Requirement and Constraint Extraction → Build Requirement and Constraint Extraction
- **Old Task 38 → New Task 42 (preserved/requalified):** Build Prompt-to-Code Alignment → Build Prompt-to-Code Alignment
- **Old Task 39 → New Task 43 (preserved/requalified):** Build Scope Discipline Analysis → Build Scope Discipline Analysis
- **Old Task 40 → New Task 44 (preserved/requalified):** Build Verification Quality Analysis → Build Verification Quality Analysis
- **Old Task 41 → New Task 45 (preserved/requalified):** Build Agent Final-Response Consistency Analysis → Build Agent Final-Response Consistency Analysis
- **Old Task 42 → New Task 46 (preserved/requalified):** Define the Multi-Dimensional Performance Vector → Define the Multi-Dimensional Performance Vector
- **Old Task 43 → New Task 47 (preserved/requalified):** Define Requirement Alignment Mathematics → Define Requirement Alignment Mathematics
- **Old Task 44 → New Task 48 (preserved/requalified):** Define Constraint Compliance Mathematics → Define Constraint Compliance Mathematics
- **Old Task 45 → New Task 49 (preserved/requalified):** Define Verification Coverage Mathematics → Define Verification Coverage Mathematics
- **Old Task 46 → New Task 50 (preserved/requalified):** Define Change Discipline Mathematics → Define Change Discipline Mathematics
- **Old Task 47 → New Task 51 (preserved/requalified):** Define Outcome and Regression Measures → Define Outcome and Regression Measures
- **Old Task 48 → New Task 52 (preserved/requalified):** Define Confidence and Evidence Completeness → Define Confidence and Evidence Completeness
- **Old Task 49 → New Task 53 (preserved/requalified):** Build Composite Scores Only as Optional Views → Build Composite Scores Only as Optional Views
- **Old Task 50 → New Task 54 (preserved/requalified):** Build the Prompt Experience Dataset → Build the Prompt Experience Dataset
- **Old Task 51 → New Task 55 (preserved/requalified):** Build Dataset Versioning and Reproducible Snapshots → Build Dataset Versioning and Reproducible Snapshots
- **Old Task 52 → New Task 56 (preserved/requalified):** Build Data Quality Validation → Build Data Quality Validation
- **Old Task 53 → New Task 57 (preserved/requalified):** Build Descriptive Analytics → Build Descriptive Analytics
- **Old Task 54 → New Task 58 (preserved/requalified):** Build Cohort and Segmentation Analysis → Build Cohort and Segmentation Analysis
- **Old Task 55 → New Task 59 (preserved/requalified):** Build Statistical Comparison Tests → Build Statistical Comparison Tests
- **Old Task 56 → New Task 60 (preserved/requalified):** Build Bootstrap Confidence Intervals → Build Bootstrap Confidence Intervals
- **Old Task 57 → New Task 61 (preserved/requalified):** Build Correlation Analysis → Build Correlation Analysis
- **Old Task 58 → New Task 62 (preserved/requalified):** Build Confounder-Aware Comparative Analysis → Build Confounder-Aware Comparative Analysis
- **Old Task 59 → New Task 63 (preserved/requalified):** Build Time-Series and Trend Analysis → Build Time-Series and Trend Analysis
- **Old Task 60 → New Task 64 (preserved/requalified):** Build Data/Concept Drift Detection → Build Data/Concept Drift Detection
- **Old Task 61 → New Task 65 (preserved/requalified):** Build Anomaly Detection Baselines → Build Anomaly Detection Baselines
- **Old Task 62 → New Task 66 (preserved/requalified):** Build Experiment Analysis → Build Experiment Analysis
- **Old Task 63 → New Task 67 (preserved/requalified):** Build Prompt Lineage → Build Prompt Lineage
- **Old Task 64 → New Task 68 (preserved/requalified):** Build Task/Problem Taxonomy → Build Task/Problem Taxonomy
- **Old Task 65 → New Task 69 (preserved/requalified):** Build Lexical and Structured Similarity → Build Lexical and Structured Similarity
- **Old Task 66 → New Task 70 (preserved/requalified):** Build Semantic Similarity → Build Semantic Similarity
- **Old Task 67 → New Task 71 (rewritten):** Build Code-Aware Similarity → Build Repository-Change-Aware Similarity
- **Old Task 68 → New Task 72 (rewritten):** Build Runtime-Outcome Similarity → Build Cross-Domain Outcome Similarity
- **Old Task 69 → New Task 73 (preserved/requalified):** Build Multi-View Experience Retrieval → Build Multi-View Experience Retrieval
- **Old Task 70 → New Task 74 (preserved/requalified):** Build Experience Neighborhoods → Build Experience Neighborhoods
- **Old Task 71 → New Task 77 (preserved/requalified):** Establish the ML Readiness Gate → Establish the ML Readiness Gate
- **Old Task 72 → New Task 78 (preserved/requalified):** Build Reproducible ML Feature Pipelines → Build Reproducible ML Feature Pipelines
- **Old Task 73 → New Task 79 (preserved/requalified):** Build Train/Validation/Test Splitting by Time and Project → Build Train/Validation/Test Splitting by Time and Project
- **Old Task 74 → New Task 80 (preserved/requalified):** Build Classical ML Baselines → Build Classical ML Baselines
- **Old Task 75 → New Task 81 (preserved/requalified):** Build Unsupervised Prompt/Experience Clustering → Build Unsupervised Prompt/Experience Clustering
- **Old Task 76 → New Task 82 (preserved/requalified):** Build Learned Outcome Association Ranking → Build Learned Outcome Association Ranking
- **Old Task 77 → New Task 83 (preserved/requalified):** Build Learned Regression-Risk Estimation → Build Learned Regression-Risk Estimation
- **Old Task 78 → New Task 84 (preserved/requalified):** Build Model Calibration and Uncertainty → Build Model Calibration and Uncertainty
- **Old Task 79 → New Task 85 (preserved/requalified):** Build Explainability for Learned Models → Build Explainability for Learned Models
- **Old Task 80 → New Task 86 (preserved/requalified):** Build Model Registry and Version Lineage → Build Model Registry and Version Lineage
- **Old Task 81 → New Task 87 (preserved/requalified):** Build Model Drift and Performance Monitoring → Build Model Drift and Performance Monitoring
- **Old Task 82 → New Task 88 (preserved/requalified):** Build Champion/Challenger Evaluation → Build Champion/Challenger Evaluation
- **Old Task 83 → New Task 89 (preserved/requalified):** Build the Performance Evaluation Framework → Build the Performance Evaluation Framework
- **Old Task 84 → New Task 90 (preserved/requalified):** Build Deterministic Evaluators First → Build Deterministic Evaluators First
- **Old Task 85 → New Task 91 (preserved/requalified):** Add Optional LLM-as-a-Judge Evaluators → Add Optional LLM-as-a-Judge Evaluators
- **Old Task 86 → New Task 92 (preserved/requalified):** Build Human Labeling and Review → Build Human Labeling and Review
- **Old Task 87 → New Task 93 (preserved/requalified):** Build Evaluation Agreement Analysis → Build Evaluation Agreement Analysis
- **Old Task 88 → New Task 94 (preserved/requalified):** Build Curated Performance Datasets → Build Curated Performance Datasets
- **Old Task 89 → New Task 95 (preserved/requalified):** Build Dataset Item Versioning → Build Dataset Item Versioning
- **Old Task 90 → New Task 96 (preserved/requalified):** Build Offline Prompt Experiments → Build Offline Prompt Experiments
- **Old Task 91 → New Task 97 (preserved/requalified):** Build Regression Evaluation → Build Regression Evaluation
- **Old Task 92 → New Task 98 (preserved/requalified):** Build Experiment Reproducibility → Build Experiment Reproducibility
- **Old Task 93 → New Task 99 (rewritten):** Build the Performance Memory Evidence Ledger → Define the Performance Memory Architecture and Memory Evidence Ledger
- **Old Task 94 → New Task 100 (preserved/requalified):** Define Performance Knowledge Records → Define Performance Knowledge Records
- **Old Task 95 → New Task 101 (preserved/requalified):** Build Deterministic Memory Promotion → Build Deterministic Memory Promotion
- **Old Task 96 → New Task 102 (preserved/requalified):** Build Memory Contradiction and Supersession → Build Memory Contradiction and Supersession
- **Old Task 97 → New Task 103 (preserved/requalified):** Build Performance Memory Retrieval → Build Performance Memory Retrieval
- **Old Task 98 → New Task 104 (preserved/requalified):** Build Performance Memory Recovery and Retention → Build Performance Memory Recovery and Retention
- **Old Task 99 → New Task 105 (preserved/requalified):** Build the Midnight Performance Visual Map → Build the Midnight Performance Visual Map
- **Old Task 100 → New Task 106 (preserved/requalified):** Build Prompt Lineage Visualization → Build Prompt Lineage Visualization
- **Old Task 101 → New Task 107 (preserved/requalified):** Build Experience Neighborhood Visualization → Build Experience Neighborhood Visualization
- **Old Task 102 → New Task 108 (preserved/requalified):** Build Metric and Cohort Dashboards → Build Metric and Cohort Dashboards
- **Old Task 103 → New Task 109 (preserved/requalified):** Build Cross-Product Navigation → Build Cross-Product Navigation
- **Old Task 104 → New Task 110 (preserved/requalified):** Build Read-Only Ask Me → Build Read-Only Ask Me
- **Old Task 105 → New Task 111 (preserved/requalified):** Build Draft-Prompt Preflight Analysis → Build Draft-Prompt Preflight Analysis
- **Old Task 106 → New Task 112 (preserved/requalified):** Build Advisor → Build Advisor
- **Old Task 107 → New Task 113 (preserved/requalified):** Build Suggestion → Build Suggestion
- **Old Task 108 → New Task 114 (preserved/requalified):** Build Recommendation Evaluation → Build Recommendation Evaluation
- **Old Task 109 → New Task 115 (preserved/requalified):** Build Recommendation Guardrails → Build Recommendation Guardrails
- **Old Task 110 → New Task 116 (preserved/requalified):** Define the Performance Query API → Define the Performance Query API
- **Old Task 111 → New Task 117 (rewritten):** Build MCP-Compatible Read Tools → Build MCP-Compatible and Host-Native Read Tools
- **Old Task 112 → New Task 118 (preserved/requalified):** Build the Optional AI Analysis Provider Interface → Build the Optional AI Analysis Provider Interface
- **Old Task 113 → New Task 119 (preserved/requalified):** Build Local/Private AI Analysis Mode → Build Local/Private AI Analysis Mode
- **Old Task 114 → New Task 120 (preserved/requalified):** Build AI Cost, Latency, and Quality Accounting → Build AI Cost, Latency, and Quality Accounting
- **Old Task 115 → New Task 123 (preserved/requalified):** Define Storage Boundaries by Workload → Define Storage Boundaries by Workload
- **Old Task 116 → New Task 124 (preserved/requalified):** Build Analytical Query Storage Strategy → Build Analytical Query Storage Strategy
- **Old Task 117 → New Task 125 (preserved/requalified):** Build Backpressure and Failure Isolation → Build Backpressure and Failure Isolation
- **Old Task 118 → New Task 126 (preserved/requalified):** Build Multi-Tenancy and Project Isolation → Build Multi-Tenancy and Project Isolation
- **Old Task 119 → New Task 127 (preserved/requalified):** Build Self-Hosted Midnight Performance → Build Self-Hosted Midnight Performance
- **Old Task 120 → New Task 128 (preserved/requalified):** Build Bring Your Own Cloud → Build Bring Your Own Cloud
- **Old Task 121 → New Task 129 (preserved/requalified):** Define Optional Midnight-Managed Cloud → Define Optional Midnight-Managed Cloud
- **Old Task 122 → New Task 130 (preserved/requalified):** Build Bring Your Own Data/ML Resources → Build Bring Your Own Data/ML Resources
- **Old Task 123 → New Task 131 (preserved/requalified):** Build the Midnight Performance Threat Model → Build the Midnight Performance Threat Model
- **Old Task 124 → New Task 132 (preserved/requalified):** Build Evidence Authenticity and Provenance → Build Evidence Authenticity and Provenance
- **Old Task 125 → New Task 133 (preserved/requalified):** Build Dataset and Model Poisoning Defenses → Build Dataset and Model Poisoning Defenses
- **Old Task 126 → New Task 134 (rewritten):** Build AI Prompt-Injection Boundaries → Build AI and Telemetry Prompt-Injection Boundaries
- **Old Task 127 → New Task 135 (preserved/requalified):** Build Privacy-Preserving Analytics Controls → Build Privacy-Preserving Analytics Controls
- **Old Task 128 → New Task 136 (preserved/requalified):** Instrument Midnight Performance → Instrument Midnight Performance
- **Old Task 129 → New Task 137 (preserved/requalified):** Build Analytical Data Health Monitoring → Build Analytical Data Health Monitoring
- **Old Task 130 → New Task 138 (rewritten):** Build Deterministic Prompt/Code Evaluation Corpora → Build Deterministic Prompt/Repository Evaluation Corpora
- **Old Task 131 → New Task 139 (rewritten):** Build Code Integration Qualification → Build Coding-Harness and Repository-Change Qualification
- **Old Task 132 → New Task 140 (rewritten):** Build Watch Integration Qualification → Build Watch Runtime Integration Qualification
- **Old Task 133 → New Task 143 (preserved/requalified):** Build User-Feedback Qualification → Build User-Feedback Qualification
- **Old Task 134 → New Task 144 (preserved/requalified):** Build Data Analytics Qualification → Build Data Analytics Qualification
- **Old Task 135 → New Task 145 (preserved/requalified):** Build ML Qualification → Build ML Qualification
- **Old Task 136 → New Task 146 (preserved/requalified):** Build Evaluation-System Qualification → Build Evaluation-System Qualification
- **Old Task 137 → New Task 147 (preserved/requalified):** Build Memory Qualification → Build Memory Qualification
- **Old Task 138 → New Task 148 (preserved/requalified):** Build Advisor/Suggestion Qualification → Build Advisor/Suggestion Qualification
- **Old Task 139 → New Task 149 (preserved/requalified):** Build Security and Isolation Qualification → Build Security and Isolation Qualification
- **Old Task 140 → New Task 150 (preserved/requalified):** Build Scale, Cost, and Recovery Qualification → Build Scale, Cost, and Recovery Qualification
- **Old Task 141 → New Task 151 (rewritten):** Build Full Midnight Intelligence Qualification → Build Full New-Midnight Ecosystem Qualification
- **Old Task 142 → New Task 152 (preserved/requalified):** Final Architecture and Product-Truth Gate → Final Architecture and Product-Truth Gate

# Final Definition of Done

Midnight Performance O2 is complete when it can answer, with evidence and uncertainty:

- What exactly did the user ask the coding agent to do?
- Which coding harness, session, turn, model, tools, and commands actually participated?
- What did the coding agent report it did?
- What did the repository actually change?
- Which changes can be attributed confidently to this Prompt Run, and which attribution is ambiguous?
- Which requirements and constraints were satisfied, violated, unverified, or not mapped to evidence?
- What verification actually occurred, and what was merely claimed?
- Did the final agent response agree with observed work?
- Did the user believe the intended outcome was achieved?
- What happened later in Watch Runtime?
- What happened later in Watch Data?
- Did Security discover or verify any consequence related to the change?
- What intervening changes make causal attribution uncertain?
- Which prior development Episodes are genuinely comparable by prompt, repository change, verification, outcome, or relationship?
- Which prompt patterns, constraints, verification strategies, agents/models, and change profiles are associated with better or worse outcomes?
- Has project, agent behavior, data distribution, or outcome distribution drifted enough that older conclusions should be distrusted?
- What durable lessons belong in Performance Memory?
- What knowledge is contradicted or superseded?
- What should Preflight, Advisor, or Suggestion recommend, and what evidence supports it?
- Did accepted recommendations actually improve later external outcomes?
- Can every conclusion distinguish observed fact, provider event, repository evidence, user signal, sibling-domain truth, derived metric, statistical association, learned prediction, AI judgment, recommendation, and unknown?
- Can the developer run Claude Code, Codex, or OpenCode normally with no Midnight-specific prompt and still obtain approved Performance history?
- Can Performance operate standalone with no Watch Runtime, Watch Data, Security, external AI, GraphRAG, or orchestration plane?
- Can optional orchestration query Performance capabilities without Performance becoming the workflow owner or coding-agent host?
- Can the system recover from hook loss, provider drift, process crashes, storage failure, corrupted indexes, missing siblings, and migrations without fabricating a complete development history?

> **Midnight Performance is an invisible-by-default development-history intelligence system that observes how humans instruct coding agents, records what those agents actually do, grounds the result in real repository changes and verification, connects later runtime/data/security outcomes, builds organized evidence-backed Memory and relationships, and uses that history to help users understand and improve future development—without hosting the coding agent, requiring Midnight Code, or depending on GraphRAG.**

# Selected External References

- https://github.com/Arize-ai/coding-harness-tracing
- https://github.com/Arize-ai/openinference
- https://github.com/Arize-ai/phoenix
- https://github.com/langfuse/langfuse
- https://github.com/promptfoo/promptfoo
- https://github.com/confident-ai/deepeval
- https://github.com/evidentlyai/evidently
- https://github.com/openlit/openlit
- https://github.com/openai/codex
- https://github.com/anthropics/claude-code
- https://opentelemetry.io/docs/specs/semconv/
- https://code.claude.com/docs/en/hooks
