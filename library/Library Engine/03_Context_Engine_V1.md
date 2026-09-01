# Library — Context Engine V1

- **Working Product:** Library
- **Document Type:** Context Composition Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define how Library assembles bounded, task-specific context from independent knowledge providers without duplicating or owning their canonical data.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Core Purpose
3. Context Does Not Own Knowledge
4. Context Request
5. Provider Architecture
6. Candidate Gathering
7. Relevance and Ranking
8. Token / Size Budget
9. Context Pack
10. Context Modes
11. Inter-Engine Contracts
12. Terminal and Agent Interface
13. Events
14. Caching and Reproducibility
15. Security and Privacy
16. Graceful Degradation
17. GitHub Repositories and Lessons
18. V1 Recommendation
19. Non-Goals
20. V1 Conceptual Architecture
21. Future Evolution
22. Design Principles

---

# 1. Engine Vision

The Context Engine turns Library's accumulated knowledge into a bounded package suitable for the current task.

It exists because giving an agent all project history, all Memory, all Studies, all files, and all Performance data is expensive and often harmful.

The engine answers:

> What does this agent need to know for this task, right now?

---

# 2. Core Purpose

A Context Pack may combine:

- Current project state.
- Relevant files or symbols.
- Relevant Memory.
- Relevant Study sections.
- Relevant Performance history.
- Recent Git history.
- Explicit user notes.
- Current task constraints.

The output should be concise enough for the selected agent and complete enough to avoid obvious omissions.

---

# 3. Context Does Not Own Knowledge

Context is a composition engine.

It does not become a second database for everything it reads.

```text
Memory ───────┐
Studies ──────┤
Performance ──┤
Repository ───┤──→ Context Engine → Context Pack
Git History ──┤
User Notes ───┘
```

The source engines remain authoritative.

Context stores only enough metadata for reproducibility, caching, and auditing.

---

# 4. Context Request

Conceptual schema:

```text
ContextRequest
├── request_id
├── project_id
├── task
├── target_agent
├── mode
├── max_tokens / max_bytes
├── requested_sources[]
├── exclusions[]
└── privacy_policy
```

The target agent matters because different agents may have different context-window, tool, and file-access capabilities.

---

# 5. Provider Architecture

Providers make Context extensible without hard-coding every engine.

```text
Context Providers
│
├── CurrentProjectProvider
├── RepositoryMapProvider
├── MemoryProvider
├── StudyProvider
├── PerformanceProvider
├── GitHistoryProvider
├── UserNotesProvider
└── FutureProvider
```

A provider exposes a bounded candidate interface rather than raw database access.

Conceptually:

```text
collect(request) → ContextCandidate[]
```

---

# 6. Candidate Gathering

The engine gathers candidates in parallel where safe.

Each candidate should carry:

- Source engine.
- Stable source reference.
- Text or structured payload.
- Estimated size.
- Freshness.
- Relevance hints.
- Confidence.
- Privacy labels.

Context should prefer source references that can be traced back later.

---

# 7. Relevance and Ranking

Ranking should begin with deterministic signals.

Possible signals:

- Explicit user inclusion.
- Exact file/symbol match.
- Current task keywords.
- Current subsystem.
- Recent project activity.
- Memory relationship.
- Study relevance.
- Performance recency.
- Source confidence.

AI reranking may be added later but should not be the only ranking mechanism.

---

# 8. Token / Size Budget

The engine must treat context as a scarce resource.

Pipeline:

```text
Candidates
    ↓
Priority Ranking
    ↓
Deduplication
    ↓
Compression / Projection
    ↓
Token or Byte Budget
    ↓
Context Pack
```

The pack should preserve high-value identity, constraints, and evidence before low-value narrative detail.

---

# 9. Context Pack

Conceptual output:

```text
ContextPack
├── pack_id
├── project_id
├── task
├── generated_at
├── target_agent
├── source_refs[]
├── sections[]
├── omitted_summary
├── size
└── freshness_revision
```

A pack is a projection, not a new canonical knowledge source.

---

# 10. Context Modes

Possible V1 modes:

- **Minimal:** only explicit task and directly relevant project state.
- **Standard:** project state + Memory + recent relevant history.
- **Research:** adds Repository Studies and external resources.
- **Debug:** favors recent changes, failures, and Performance evidence.
- **Architecture:** favors decisions, repository map, studies, and dependency relationships.

Mode names may change after practical testing.

---

# 11. Inter-Engine Contracts

## Context → Memory

Uses `memory.search`, `memory.retrieve`, and relationship queries.

## Context → Study

Requests bounded Study sections or evidence summaries by Study Version.

## Context → Performance

Queries prior runs relevant to the current task.

## Context → Repository Analysis / Map

May request a current project map or symbol summary.

## Context → Project Projection

Context Packs may be projected into `.library/context/` when explicitly attached to a project or session.

---

# 12. Terminal and Agent Interface

Conceptual commands:

```text
library context build --task "refactor authentication"
library context preview <pack-id>
library context sources <pack-id>
library context attach <pack-id> --agent codex
```

Agent tool surface:

```text
context.build
context.preview
context.sources
context.attach
```

---

# 13. Events

Potential events:

```text
context.generated
context.attached
context.invalidated
context.source.changed
```

A pack may become stale when an important source revision changes.

---

# 14. Caching and Reproducibility

Context generation should be reproducible enough to explain what an agent received.

Store:

- Pack request.
- Source references.
- Source revisions.
- Pack digest.
- Selection rationale where practical.

Do not silently claim an old Context Pack is current after its important sources changed.

---

# 15. Security and Privacy

The Context Engine is a disclosure boundary.

It must enforce:

- Project scope.
- Source permissions.
- Redaction.
- Agent-specific allowed sources.
- Secret exclusion.
- Maximum disclosure policy.

An agent receives only what the policy allows, even if more data exists in Memory or Studies.

---

# 16. Graceful Degradation

Context should compose from available providers.

```text
Memory unavailable
→ use current project + studies + Git history

Performance unavailable
→ omit performance history

Study unavailable
→ build project-only pack
```

The pack should disclose which providers were unavailable.

---

# 17. GitHub Repositories and Lessons

## Aider-AI/aider

Repository: https://github.com/Aider-AI/aider

**Classification:** Architecture Reference.

Most relevant concept: RepoMap.

Useful ideas:

- Concise map of a whole repository.
- Important symbols and signatures instead of full-file dumping.
- Graph-based relevance ranking.
- Dynamic token budget.
- Give the model enough map information to decide which files need deeper inspection.

Library should generalize this beyond one chat system and treat repository mapping as one Context Provider.

## continuedev/continue

Repository: https://github.com/continuedev/continue

**Classification:** Architecture Reference.

Useful ideas:

- Separate Context Provider implementations.
- Providers for current file, file tree, Git commits, search, database, web, GitHub issues, and other sources.
- Provider registration rather than one monolithic context loader.

Library can use the provider pattern while defining its own Memory, Study, Performance, and repository contracts.

## modelcontextprotocol/typescript-sdk

Repository: https://github.com/modelcontextprotocol/typescript-sdk

**Classification:** Supporting / Integration Candidate.

Useful ideas:

- Standard tools/resources/prompts surface.
- Separation of context provisioning from the LLM interaction itself.
- stdio and HTTP transports.

MCP is useful for delivering Library context capabilities to compatible agents. It does not define Context Engine ranking or storage.

---

# 18. V1 Recommendation

Build Context V1 around:

- Provider registry.
- Structured candidate schema.
- Deterministic ranking.
- Explicit task and target agent.
- Token/byte budgeting.
- Stable source references.
- Context Pack manifest.
- Reproducible pack digest.

Do not require vector search or agentic multi-step context discovery for the first usable version.

---

# 19. Non-Goals

Context V1 is not:

- A duplicate Memory database.
- A full repository clone sent to the model.
- A permanent knowledge store.
- An autonomous agent orchestrator.
- A graph database requirement.
- A guarantee that every possible relevant fact fits in one pack.

---

# 20. V1 Conceptual Architecture

```text
Context Request
      │
      ▼
Provider Registry
      │
 ┌────┼──────────────────────────┐
 ▼    ▼          ▼        ▼      ▼
Repo Memory    Studies Performance Git
 │    │          │        │      │
 └────┴──────────┴────────┴──────┘
                │
                ▼
        Candidate Ranking
                │
                ▼
        Budget + Deduplicate
                │
                ▼
           Context Pack
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
       CLI    Agent   Future Game
```

---

# 21. Future Evolution

Possible future additions:

- Semantic reranking.
- Agent-specific adaptive context policies.
- Automatic context refresh.
- Context quality feedback.
- Cross-project context with explicit trust boundaries.
- Hierarchical context packs.
- Context simulation before attaching to an agent.

---

# 22. Design Principles

- Context composes; source engines own knowledge.
- Smaller relevant context is better than uncontrolled dumping.
- Preserve source references.
- Budget explicitly.
- Prefer deterministic selection before optional AI reranking.
- Agent capabilities influence packaging, not source truth.
- Context generation must respect privacy boundaries.
