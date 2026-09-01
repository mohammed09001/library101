# Library — Memory Engine V1

- **Working Product:** Library
- **Document Type:** Knowledge Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define the shared durable project-memory engine used by Context, Study, Analysis, Performance, and future Library engines while preserving provenance, time, and ownership boundaries.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Core Purpose
3. Memory Is Shared Infrastructure
4. Engine Ownership
5. Memory Record Types
6. Provenance and Evidence
7. Temporal Model
8. Memory Candidate Pipeline
9. Retrieval Model
10. Relationship Model
11. Inter-Engine Contracts
12. Terminal Interface
13. Events
14. Storage and Index Strategy
15. Privacy and Permissions
16. Graceful Degradation
17. GitHub Repositories and Lessons
18. V1 Recommendation
19. Non-Goals
20. V1 Conceptual Architecture
21. Future Evolution
22. Design Principles

---

# 1. Engine Vision

Memory is the durable knowledge layer of Library.

It is not simply a chat-memory feature and is not tied to one coding agent.

A project's Memory should survive:

- Different agent sessions.
- Different coding agents.
- Terminal restarts.
- Game restarts.
- Repository movement on disk.
- Study version changes.
- Performance runs.

The engine exists so useful project knowledge remains queryable after the original interaction is gone.

---

# 2. Core Purpose

Memory answers questions such as:

- Why was this architecture chosen?
- What constraints should future agents respect?
- What did we learn from a failed run?
- Which repository study informed this decision?
- What was true last month compared with today?
- Which important note has not yet been superseded?

Memory stores knowledge, not entire uncontrolled conversation histories by default.

---

# 3. Memory Is Shared Infrastructure

Memory is consumed by multiple engines.

```text
Performance ─────┐
Analysis ────────┤
Study ───────────┤
Context ─────────┼──→ Memory Engine
Search ──────────┤
Future Engines ──┘
```

In the opposite direction, those engines may propose information for promotion into Memory.

```text
Engine Evidence
      ↓
Memory Candidate
      ↓
Policy / Validation
      ↓
Canonical Memory
```

This bidirectional relationship must use APIs and stable references.

---

# 4. Engine Ownership

Memory owns:

- Durable memory records.
- Memory types.
- Memory provenance.
- Temporal validity state.
- Memory relationships.
- Promotion and supersession policies.
- Memory retrieval indexes.

Memory does not own:

- Raw Performance run records.
- Raw Repository Study documents.
- Repository snapshots.
- Context Packs.
- Search result ranking.
- Agent sessions.

Memory stores references to those sources when appropriate.

---

# 5. Memory Record Types

V1 should begin with explicit, understandable categories.

Possible categories:

```text
ProjectDecision
ProjectConstraint
VerifiedLesson
ArchitectureFact
UserNote
Goal
KnownIssue
ExternalStudyInsight
PerformanceLesson
OperationalStateReference
```

Every record should contain a stable identity and enough metadata to explain why it exists.

Conceptual schema:

```text
MemoryRecord
├── memory_id
├── project_id
├── type
├── statement
├── status
├── created_at
├── valid_from
├── valid_to?
├── confidence
├── source_refs[]
├── tags[]
└── supersedes[]
```

---

# 6. Provenance and Evidence

Memory should favor evidence-linked knowledge.

Example:

```text
Decision:
Use adapter-based agent integration.

Source:
Library architecture decision

Related evidence:
- Study reference
- Project note
- Performance run reference
```

Derived memory should retain source references so the user or another engine can inspect the original evidence.

Memory must not turn an uncertain agent guess into a permanent fact merely because it was stated confidently.

---

# 7. Temporal Model

Project knowledge changes over time.

Memory therefore needs temporal semantics from the beginning.

Example:

```text
Fact A valid from Revision 21
Fact B supersedes Fact A at Revision 47
```

Old knowledge is normally preserved rather than deleted.

This allows queries such as:

```text
What is true now?
What did we believe in June?
When did this decision change?
What superseded this constraint?
```

V1 does not require a temporal graph database to support this model. Explicit fields and immutable history are sufficient initially.

---

# 8. Memory Candidate Pipeline

Other engines should not write canonical memory directly.

Preferred path:

```text
Performance / Study / Analysis / User
              ↓
        MemoryCandidate
              ↓
       Policy Evaluation
              ↓
     accept / reject / hold
              ↓
        MemoryRecord
```

Candidate policy may evaluate:

- Source reliability.
- Explicit user approval where required.
- Verification state.
- Duplication.
- Contradiction.
- Privacy.
- Temporal scope.

---

# 9. Retrieval Model

V1 retrieval should remain explainable and layered.

Recommended order:

```text
Exact IDs / filters
        ↓
Lexical / BM25-style retrieval
        ↓
Metadata and relationship boosts
        ↓
Optional semantic retrieval later
```

A vector database should not be mandatory for Memory V1.

A retrieval result should include:

- Memory statement.
- Type.
- Relevance reason.
- Temporal status.
- Source references.
- Confidence.

---

# 10. Relationship Model

Memory records should support explicit relationships without forcing an all-graph architecture.

Examples:

```text
Decision ──supersedes──> Decision
Lesson ──derived_from──> PerformanceRun
Insight ──derived_from──> StudyVersion
Constraint ──applies_to──> ProjectSubsystem
```

A future graph projection may index these relationships, but the canonical Memory model should remain usable without it.

---

# 11. Inter-Engine Contracts

## Context → Memory

```text
memory.search(query, project_id, filters, limit)
memory.retrieve(memory_id)
memory.related(memory_id)
memory.history(memory_id)
```

## Performance → Memory

Performance proposes verified lessons through a candidate API.

## Study → Memory

Study may propose reusable architectural insights, always linked to the specific Study Version that produced them.

## Analysis → Memory

Analysis can query existing project decisions before comparing an external repository to the current project.

## Search → Memory

Search may optionally use previous research preferences or prior confirmed searches, but Search remains functional without Memory.

---

# 12. Terminal Interface

Conceptual commands:

```text
library memory search "authentication architecture"
library memory show <memory-id>
library memory history <memory-id>
library memory related <memory-id>
library memory add-note "..."
library memory candidates
```

Coding-agent tools should expose the same underlying methods.

---

# 13. Events

Potential events:

```text
memory.candidate.created
memory.promoted
memory.superseded
memory.updated
memory.relationship.created
```

These events notify Context, Projection, Sync, and future game clients without transferring ownership of Memory's private store.

---

# 14. Storage and Index Strategy

V1 should favor a canonical structured store plus rebuildable indexes.

Example:

```text
Canonical Memory Store
├── records
├── provenance
├── relationships
└── temporal state

Rebuildable Indexes
├── lexical index
├── tag index
├── relationship index
└── optional semantic index later
```

Indexes are projections. The canonical record is authoritative.

---

# 15. Privacy and Permissions

Memory is one of the highest-sensitivity engines because it persists knowledge beyond a session.

The engine should support:

- Project-scoped access.
- Explicit user notes.
- Private memory categories.
- Source-level privacy metadata.
- Redaction or exclusion policies.
- Memory deletion policy for user-controlled data.
- Clear distinction between observed evidence and promoted knowledge.

---

# 16. Graceful Degradation

Memory improves other engines but should not become a universal single point of failure.

Example:

```text
Memory unavailable
      ↓
Repository Search      still works
Repository Analysis    still works with current evidence
Study generation       still works
Context generation     works without historical memory
```

Engines should surface degraded quality rather than failing the entire Library runtime.

---

# 17. GitHub Repositories and Lessons

## mem0ai/mem0

Repository: https://github.com/mem0ai/mem0

**Classification:** Research Reference.

Useful ideas:

- Multi-level memory.
- Multi-signal retrieval.
- BM25 + semantic + entity matching.
- Temporal reasoning.
- Entity linking.
- Agent-generated facts as first-class memory candidates.
- Self-hosted and SDK patterns.

Library should not copy Mem0's product identity or make an LLM/embedding provider mandatory for basic project memory.

## getzep/graphiti

Repository: https://github.com/getzep/graphiti

**Classification:** Future / Architecture Reference.

Useful ideas:

- Temporal knowledge graphs.
- Provenance through episodes.
- Validity windows.
- Superseded facts rather than destructive overwrite.
- Incremental updates.
- Hybrid retrieval.

Graphiti is heavier than required for V1 because it introduces graph-database and inference infrastructure. Its temporal and provenance model is more valuable to us than its stack requirement.

## dolthub/dolt

Repository: https://github.com/dolthub/dolt

**Classification:** Architecture Reference.

Useful ideas:

- Immutable structured history.
- Diff and time travel.
- Git-style lineage over structured records.

Dolt is not proposed as the default Memory database in V1.

---

# 18. V1 Recommendation

Build Memory V1 as a Library-owned structured temporal store with:

- Stable IDs.
- Explicit memory types.
- Provenance references.
- Supersession.
- Lexical retrieval.
- Relationship edges.
- Candidate promotion.
- Optional semantic/graph projections later.

This gives Library a dependable base without making vectors or graph infrastructure mandatory.

---

# 19. Non-Goals

Memory V1 is not:

- A transcript dump.
- A universal chat-history archive.
- A mandatory vector database.
- A mandatory knowledge graph.
- A replacement for Study documents.
- A replacement for Performance history.
- An autonomous agent that rewrites project decisions.

---

# 20. V1 Conceptual Architecture

```text
Sources
│
├── User Notes
├── Performance
├── Studies
├── Analysis
└── Future Engines
       │
       ▼
 Memory Candidates
       │
       ▼
 Policy / Validation
       │
       ▼
 Canonical Memory Store
       │
  ┌────┼─────────┐
  ▼    ▼         ▼
Search Related  History
  │
  ▼
Context Engine / CLI / Agents / Future Game
```

---

# 21. Future Evolution

Possible future additions:

- Semantic index.
- Temporal graph projection.
- Cross-project memory with explicit permissions.
- Memory quality scoring.
- User-confirmed learning workflows.
- Memory compaction while preserving provenance.
- Remote/self-host synchronization.

---

# 22. Design Principles

- Persist knowledge, not noise.
- Preserve provenance.
- Preserve temporal history.
- Keep canonical records independent of optional indexes.
- Other engines propose; Memory decides canonical promotion.
- Support deterministic retrieval before mandatory AI retrieval.
- Project scope is the default trust boundary.
- Memory strengthens other engines without owning their domains.
