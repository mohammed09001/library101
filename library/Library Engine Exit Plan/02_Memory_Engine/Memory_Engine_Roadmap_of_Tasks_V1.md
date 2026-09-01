# Library Memory Engine — Roadmap of Tasks V1

- **Working Product:** Library
- **Engine:** Library Memory Engine
- **Document Type:** Engineering Task Roadmap
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Living implementation roadmap
- **Operating Strategy:** Backend-first → Terminal-usable → Agent-tool-usable → Game integration later.
- **Ordered implementation tasks:** 46
- **Architecture Rule:** Build independently, integrate through versioned contracts/events, never through another engine's private store.
- **Execution Rule:** Execution prompts compiled from this roadmap are self-contained; coding agents must not need this roadmap file at runtime.

# Roadmap Doctrine

This roadmap translates the V1 Engine design into implementable repository work. Task numbering expresses dependency order, not calendar estimates. Existing repository code that already satisfies a task must be verified and preserved rather than rebuilt. Every external project listed here is a research input; the implementation agent must inspect current upstream source/docs when the task materially depends on that behavior.

# External Research Baseline

- **mem0ai/mem0** — ADD-oriented memory accumulation, entity linking, multi-signal retrieval (semantic + BM25 + entities), temporal reasoning, memory APIs, and self-hosting. Do not inherit its assumption that an LLM/embedding provider is required for every core memory operation.
- **getzep/graphiti** — Temporal facts with validity windows, episodes as provenance, incremental graph construction, contradiction/supersession history, hybrid retrieval. Treat a graph as a rebuildable projection, not canonical Library truth.
- **dolthub/dolt** — Git-like commits, diffs, history, branching, blame, and time travel over structured data. Use the model as inspiration for immutable Study lineage rather than adopting Dolt as a mandatory V1 database.
- **modelcontextprotocol/typescript-sdk** — Expose tools/resources/prompts through a standard agent-facing protocol. The 2026-07-28 MCP line uses a stateless protocol core and updated routing/auth semantics; verify the current SDK/spec during execution rather than coding against stale examples.

# Ordered Tasks

# PHASE I — PRODUCT, IDENTITY, AND AUTHORITY FOUNDATION

## Task 1: Freeze the Memory Engine product boundary

Define Memory as the canonical owner of durable Library knowledge while raw evidence, Studies, Performance records, and repository truth remain owned by their source engines. Explicitly separate memory records from cache, context packs, embeddings, graph projections, and source evidence.

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

## Task 2: Define stable Memory identities and scopes

Create stable identities for MemoryRecord, MemoryCandidate, project/workspace scope, source reference, evidence reference, actor, validity interval, revision, contradiction group, and supersession chain. Identities must survive client restarts and project-path moves.

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

## Task 3: Define the canonical Memory record schema

Specify record kind, subject, normalized content, provenance, source engine, evidence links, scope, confidence, temporal validity, privacy class, tags, relation hints, created/revised timestamps, and status. Keep source payloads by reference when another engine owns them.

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

## Task 4: Define provenance and evidence authority

Model how a memory claim traces to user note, verified Study finding, Performance evidence, Analysis evidence, Search session, or other source. A summary generated by an agent cannot become authoritative solely because it is fluent.

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

## Task 5: Define temporal validity and historical truth

Support valid-from/valid-to, observed-at, superseded-at, and current/historical queries so changed project decisions do not overwrite the past.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 6: Publish versioned Memory inter-engine contracts

Define memory.search, memory.get, memory.propose, memory.promote, memory.revise, memory.related, memory.history, and memory.explain contracts plus events. No caller may read the Memory store directly.

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

# PHASE II — CANONICAL STORAGE AND LIFECYCLE

## Task 7: Build append-oriented Memory persistence

Persist Memory records and revisions with idempotent writes, deterministic identities where applicable, transactions, and restart-safe migrations. Derived indexes remain rebuildable.

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

## Task 8: Build the Memory Candidate intake pipeline

Accept proposals from authorized engines/users into a candidate stream without promoting them directly to durable knowledge. Record producer, reason, evidence, and requested scope.

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

## Task 9: Build deterministic promotion policies

Implement policy-driven promotion by memory kind: explicit user decision, verified Study fact, repeated evidence-backed lesson, or other configured rule. Start deterministic; AI may assist classification but cannot self-promote.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 10: Build contradiction detection and grouping

Detect explicit incompatible claims within overlapping scope/time and preserve both as a contradiction set pending policy or user resolution.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 11: Build supersession without destructive overwrite

Allow a newer decision/fact to supersede an older one while retaining lineage, provenance, historical queryability, and explicit reason.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.
- `dolthub/dolt`: inspect commit identity, diff/log/history semantics, branch/merge concepts, blame/time travel. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 12: Build revision and correction semantics

Allow user or authorized engine corrections as new revisions with actor/reason; never silently mutate historical provenance.

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

## Task 13: Build retention, archival, and deletion semantics

Define active/archive/tombstone states, project deletion propagation, privacy-driven deletion, and what happens when source evidence expires.

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

# PHASE III — DETERMINISTIC RETRIEVAL BASELINE

## Task 14: Build exact identity and structured-filter retrieval

Retrieve by project, kind, subject, source engine, tags, validity, confidence, actor, and time before adding semantic search.

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

## Task 15: Build lexical/BM25-style memory search

Add deterministic text search over normalized memory text and selected metadata; preserve exact-term explanations and query diagnostics.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 16: Build temporal retrieval

Resolve questions like current decision, what was true at date X, and how a decision changed across time using explicit validity semantics.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 17: Build provenance-aware ranking

Prefer high-authority, direct, current evidence while still exposing lower-confidence or contradicted records instead of silently hiding them.

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

## Task 18: Build deduplication and near-duplicate handling

Detect exact and normalized duplicate proposals, preserve idempotency, and distinguish duplicate content from independently corroborating evidence.

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

## Task 19: Build explainable multi-signal fusion

Combine lexical, structured, temporal, provenance and relation signals with visible per-signal contributions. Do not collapse into an opaque score.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 20: Build memory.explain and retrieval traces

Return why a memory matched, which filters applied, source/provenance, validity and contradiction status, and what evidence is missing.

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

# PHASE IV — RELATIONSHIPS AND OPTIONAL SEMANTIC PROJECTIONS

## Task 21: Build typed Memory relationships

Support related-to, derived-from, contradicts, supersedes, supports, applies-to, learned-from and other bounded relation types with provenance.

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

## Task 22: Build entity linking as a derived projection

Extract/link stable project entities such as components, repositories, technologies and decisions. Keep entity extraction rebuildable and versioned.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 23: Build optional semantic embedding projection

Add provider-neutral embeddings only behind an interface and privacy gate. Record model/version and allow complete rebuild; Memory must function without embeddings.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 24: Build optional relationship-graph projection

Project Memory relationships into a graph for traversal/history experiments without making a graph database canonical.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 25: Build hybrid lexical + semantic + relation retrieval

Fuse semantic distance with deterministic signals only after baseline evaluation; return retrieval-path explanations.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `mem0ai/mem0`: inspect memory add/search lifecycle, hybrid retrieval and entity linking, temporal reasoning, self-hosted boundaries. Apply only patterns compatible with Library ownership and licensing.
- `getzep/graphiti`: inspect episodes and provenance, temporal validity windows, incremental updates, hybrid search recipes. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 26: Build index rebuild and corruption recovery

Rebuild lexical/vector/graph projections from canonical records and prove corrupted projections do not corrupt Memory truth.

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

# PHASE V — PRODUCER AND CONSUMER INTEGRATIONS

## Task 27: Integrate Performance → Memory proposals

Accept bounded evidence-backed lessons from Performance through a versioned contract while keeping Performance records external.

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

## Task 28: Integrate Study → Memory proposals

Allow verified Study findings and user annotations to become Memory candidates with Study/version/source-revision provenance.

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

## Task 29: Integrate Analysis → Memory proposals

Allow Analysis to propose reusable architectural findings only through evidence-linked candidates, never direct insertion.

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

## Task 30: Integrate Search → Memory history

Store useful search intent/session history as retrieval context without promoting every candidate repository as durable knowledge.

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

## Task 31: Integrate Context → Memory retrieval

Support bounded context-oriented queries with explicit size/time/project filters and provenance-rich results.

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

## Task 32: Integrate Project user notes

Model explicit user-authored notes/decisions as first-class memory records with stronger subjective authority within their declared scope.

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

# PHASE VI — TERMINAL, TOOL SURFACE, AND PERMISSIONS

## Task 33: Build the Memory CLI

Provide terminal commands for search, get, history, related, propose, promote, revise, contradictions and health with stable machine-readable output modes.

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

## Task 34: Expose MCP/host-native Memory read tools

Expose authorized read/query tools for agents using current MCP/host-native capabilities; keep mutation tools separately permissioned.

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

## Task 35: Build mutation authorization and confirmation

Require explicit project/user policy for promote/revise/delete operations initiated by agents; log actor and origin.

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

## Task 36: Build Context-safe memory excerpts

Return bounded excerpts or structured facts suitable for Context Packs without leaking restricted source payloads.

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

# PHASE VII — PRIVACY, RELIABILITY, AND OPERATIONS

## Task 37: Build field-level privacy and project isolation

Apply content-class policy, project/workspace isolation, export restrictions, and local/self-hosted defaults to Memory and derived indexes.

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

## Task 38: Build prompt-injection and untrusted-content boundaries

Treat stored external text as data; retrieved memories cannot redefine system policy, tool permissions, or promotion rules.

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

## Task 39: Build backup, restore, and integrity checks

Back up canonical Memory plus metadata needed to rebuild projections; verify checksums/foreign references and recovery.

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

## Task 40: Instrument Memory health and retrieval quality

Measure intake/promotion/rejection, stale/contradicted records, retrieval latency, index freshness, missing evidence and rebuild health.

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

## Task 41: Build graceful degradation

Prove structured/lexical Memory works when embeddings, graph projection, MCP host, or sibling engines are unavailable.

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

# PHASE VIII — QUALIFICATION AND V1 GATE

## Task 42: Build frozen Memory qualification corpora

Create deterministic fixtures for current/historical facts, contradictions, supersession, duplicates, privacy restrictions and provenance.

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

## Task 43: Build retrieval evaluation

Measure precision/recall-style usefulness for exact, lexical, temporal and hybrid retrieval with transparent baselines; semantic additions must beat or complement baselines.

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

## Task 44: Build contradiction/supersession qualification

Prove historical facts remain queryable and current truth resolves correctly without destructive overwrite.

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

## Task 45: Build crash/rebuild/deletion qualification

Exercise process crashes, partial writes, projection corruption, restore, source deletion and privacy deletion propagation.

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

## Task 46: Final Memory Engine architecture and product-truth gate

Audit ownership, contracts, standalone operation, terminal usability, evidence provenance, privacy, retrieval explanations, and future extensibility. The Engine must be useful before game integration.

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

Library Memory Engine V1 is complete when every ordered Task is either verified as already satisfied or implemented, every Execution Prompt reaches YES, the Engine is usable from the real terminal without the game, cross-engine integration uses only versioned contracts, failure/degraded states are explicit, and final qualification proves the Engine's domain ownership rather than only compilation.
