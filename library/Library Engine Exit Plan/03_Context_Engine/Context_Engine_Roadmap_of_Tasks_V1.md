# Library Context Engine — Roadmap of Tasks V1

- **Working Product:** Library
- **Engine:** Library Context Engine
- **Document Type:** Engineering Task Roadmap
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Living implementation roadmap
- **Operating Strategy:** Backend-first → Terminal-usable → Agent-tool-usable → Game integration later.
- **Ordered implementation tasks:** 42
- **Architecture Rule:** Build independently, integrate through versioned contracts/events, never through another engine's private store.
- **Execution Rule:** Execution prompts compiled from this roadmap are self-contained; coding agents must not need this roadmap file at runtime.

# Roadmap Doctrine

This roadmap translates the V1 Engine design into implementable repository work. Task numbering expresses dependency order, not calendar estimates. Existing repository code that already satisfies a task must be verified and preserved rather than rebuilt. Every external project listed here is a research input; the implementation agent must inspect current upstream source/docs when the task materially depends on that behavior.

# External Research Baseline

- **Aider-AI/aider** — RepoMap selects important symbols and signatures across a codebase, ranks dependency-connected files, and stays inside an explicit token budget. Context should select and compose rather than dump the repository.
- **continuedev/continue** — Separate context providers for files, search, Git commits, databases, web, issues, current file, and file tree. Preserve provider capability isolation and fail-soft behavior while avoiding legacy/deprecated provider patterns.
- **modelcontextprotocol/typescript-sdk** — Expose tools/resources/prompts through a standard agent-facing protocol. The 2026-07-28 MCP line uses a stateless protocol core and updated routing/auth semantics; verify the current SDK/spec during execution rather than coding against stale examples.
- **mem0ai/mem0** — ADD-oriented memory accumulation, entity linking, multi-signal retrieval (semantic + BM25 + entities), temporal reasoning, memory APIs, and self-hosting. Do not inherit its assumption that an LLM/embedding provider is required for every core memory operation.

# Ordered Tasks

# PHASE I — CONTEXT PRODUCT AND CONTRACT FOUNDATION

## Task 1: Freeze the Context Engine boundary

Define Context as a selector/composer of bounded task context. It owns ContextRequest, candidate normalization, selection, budgeting, ContextPack and reproducibility metadata; it does not own Memory, Study, Performance or repository truth.

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

## Task 2: Define ContextRequest and task intent schema

Model project, task text, host/worker agent, desired mode, token/byte budget, allowed providers, freshness window, privacy policy, required/forbidden sources and caller capabilities.

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

## Task 3: Define the Context Provider contract

Create a provider-neutral interface for discovery/retrieval from Memory, Studies, Performance, repository maps, project files, Git history and future providers. Providers declare capabilities, costs, freshness and privacy needs.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `continuedev/continue`: inspect core/context/providers, provider interface/types, SearchContextProvider, GitCommitContextProvider. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 4: Define normalized ContextCandidate schema

Normalize candidates into identity, source provider, excerpt/structured payload, provenance, timestamps, relevance signals, estimated tokens, authority, privacy class and dedup keys.

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

## Task 5: Define ContextPack schema and immutable build record

A pack records selected items, ordering, source revisions, budget, ranking version, provider versions, exclusions, hash and creation reason so the same pack can be explained or reproduced.

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

## Task 6: Publish versioned Context contracts and events

Define context.build, preview, attach, get, explain, invalidate and health plus events; no provider private store access.

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

# PHASE II — PROVIDER LAYER AND CANDIDATE GATHERING

## Task 7: Build provider registry and capability probing

Register providers independently, probe health/capabilities and fail soft when unavailable or outdated.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `continuedev/continue`: inspect core/context/providers, provider interface/types, SearchContextProvider, GitCommitContextProvider. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 8: Build Memory Context Provider

Retrieve relevant current/historical Memory records with bounded text and provenance.

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

## Task 9: Build Study Context Provider

Retrieve Study findings/sections by Study/version/source revision without copying full studies by default.

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

## Task 10: Build Performance Context Provider

Retrieve relevant historical runs/lessons through Performance contracts only, with explicit unavailable state if Performance is absent.

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

## Task 11: Build Repository Map Context Provider

Generate/consume a concise symbol/signature map and high-value repository regions inspired by Aider RepoMap rather than dumping source.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `Aider-AI/aider`: inspect aider/repomap.py, repository-map docs, tree-sitter/ctags usage, graph ranking/PageRank-style relevance. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 12: Build Project File Context Provider

Read explicitly allowed project files, manifests and local docs with ignore/privacy rules and stable file identity.

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

## Task 13: Build Git History Context Provider

Expose relevant commits/diffs/paths through bounded queries rather than whole history.

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

## Task 14: Build Current Session/Agent Context Provider

Accept host-provided current file, selection, task or session metadata when available; absence must not break Context.

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

# PHASE III — RANKING, BUDGETING, AND PACK ASSEMBLY

## Task 15: Build deterministic relevance baseline

Rank candidates using task term overlap, source authority, path/component overlap, recency and explicit user pins before semantic methods.

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

## Task 16: Build repository-map graph relevance

Experiment with dependency/symbol reference centrality and task-connected ranking inspired by Aider; record algorithm/version and do not assume centrality equals relevance.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `Aider-AI/aider`: inspect aider/repomap.py, repository-map docs, tree-sitter/ctags usage, graph ranking/PageRank-style relevance. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 17: Build cross-provider deduplication

Detect overlapping content from Memory, Studies and files; prefer canonical provenance and avoid wasting budget on repeated text.

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

## Task 18: Build diversity and coverage policy

Prevent one provider or file from consuming the entire budget when multiple evidence categories are required.

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

## Task 19: Build explicit token/byte budget accounting

Estimate and then verify serialized size; reserve budget for task/system framing and use deterministic truncation policies.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `Aider-AI/aider`: inspect aider/repomap.py, repository-map docs, tree-sitter/ctags usage, graph ranking/PageRank-style relevance. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 20: Build priority and pinning semantics

Allow user/engine-required context items to be pinned while still enforcing privacy and hard size limits.

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

## Task 21: Build ContextPack assembler

Produce ordered, typed sections with provenance markers and source handles rather than one undifferentiated text blob.

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

## Task 22: Build pack explainability

Explain included/excluded candidates, score components, provider failures, truncation and budget consumption.

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

# PHASE IV — MODES, CACHING, AND REPRODUCIBILITY

## Task 23: Build Temporary Attach mode

Create session/task-scoped packs that expire without becoming persistent project files unless Projection is explicitly invoked.

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

## Task 24: Build Persistent Sync mode

Bind a Context definition to a project projection and regenerate when authorized source revisions change.

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

## Task 25: Define Auto-Context as opt-in gated mode

Implement only suggestion/preview in V1 unless explicit user policy allows automatic attachment; never silently modify prompts.

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

## Task 26: Build ContextPack hashing and cache keys

Cache by request normalization, source revisions, provider versions, ranking version, privacy policy and budget.

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

## Task 27: Build precise invalidation

Invalidate only packs affected by changed source/version/policy/provider, not the entire cache.

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

## Task 28: Build reproducibility and replay

Given preserved source revisions and versions, reconstruct or explain why a historical ContextPack cannot be reproduced.

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

# PHASE V — TERMINAL AND AGENT TOOLING

## Task 29: Build the Context CLI

Provide build, preview, explain, attach, detach, list and health commands with human and JSON output.

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

## Task 30: Expose MCP/host-native Context tools

Expose context.build/preview/get via current MCP tool schemas; keep explicit state handles rather than transport-hidden assumptions.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `modelcontextprotocol/typescript-sdk`: inspect server/client package split, tool schemas, stdio transport, Streamable HTTP. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 31: Build host/worker-agent neutrality

Context generation cannot assume Claude/Codex. Host capabilities and selected worker are inputs; the same ContextPack schema works across agents.

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

## Task 32: Integrate Context with Project Projection

Attach persistent or temporary packs through Projection contracts; Context never writes `.library` files directly.

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

# PHASE VI — SECURITY, PRIVACY, AND DEGRADATION

## Task 33: Build context-content privacy filtering

Apply source-specific field policies before candidate normalization and again before serialization/export.

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

## Task 34: Build prompt-injection isolation

Mark external repository/docs/memory content as untrusted data and ensure it cannot alter execution policy, permissions, or research loop instructions.

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

## Task 35: Build provider permission boundaries

A Context provider can access only the project/scope granted to it; cross-project retrieval requires explicit policy.

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

## Task 36: Build graceful provider degradation

A failed Memory/Study/Performance provider reduces coverage and is disclosed; Context still builds from available sources when valid.

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

## Task 37: Instrument Context quality and cost

Track provider latency, candidate counts, selection distribution, tokens/bytes, cache hits, truncation, failures and user acceptance.

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

# PHASE VII — EVALUATION AND V1 GATE

## Task 38: Build deterministic context fixtures

Create tasks with known relevant/irrelevant files, memories and studies to test selection and deduplication.

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

## Task 39: Build Context relevance evaluation

Measure selected-evidence precision/coverage and token efficiency; compare repository-map and simple lexical baselines.

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

## Task 40: Build budget and overflow qualification

Prove hard budget enforcement under large providers, malformed estimates and Unicode/serialization edge cases.

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

## Task 41: Build security and isolation qualification

Test malicious repository text, restricted memories, cross-project leaks, provider failures and MCP caller boundaries.

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

## Task 42: Final Context Engine architecture and terminal-readiness gate

Prove Context selects rather than owns knowledge, remains agent-neutral, reproducible, explainable and usable without the game.

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

Library Context Engine V1 is complete when every ordered Task is either verified as already satisfied or implemented, every Execution Prompt reaches YES, the Engine is usable from the real terminal without the game, cross-engine integration uses only versioned contracts, failure/degraded states are explicit, and final qualification proves the Engine's domain ownership rather than only compilation.
