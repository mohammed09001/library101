# Library — Repository Analysis Engine V1

- **Working Product:** Library
- **Document Type:** Repository Understanding Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define an evidence-first repository-analysis workflow that combines deterministic code intelligence with a user-selected reasoning agent and produces structured results for Study creation.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Analysis vs Search Boundary
3. Engine Ownership
4. Analysis Job
5. Analysis Modes
6. Research Workspace
7. Evidence Collection Layers
8. Structural Parsing
9. Structural Search
10. Code Intelligence
11. Agent Reasoning Layer
12. User-Controlled Agent Selection
13. Evidence Grounding
14. Analysis Result
15. Comparison Mode
16. Incremental Re-Analysis
17. Inter-Engine Contracts
18. Terminal and Agent Interface
19. Events
20. Security and Resource Boundaries
21. GitHub Repositories and Lessons
22. V1 Recommendation
23. Non-Goals
24. V1 Conceptual Architecture
25. Future Evolution
26. Design Principles

---

# 1. Engine Vision

Repository Analysis studies a selected repository deeply enough to produce evidence-backed technical understanding.

The engine owns the workflow.

The selected coding/research agent supplies reasoning when needed.

The engine must remain useful even when some deterministic inspection can answer a question without invoking an agent.

---

# 2. Analysis vs Search Boundary

Search decides **which repositories deserve attention**.

Analysis decides **what the selected repository means and how it works**.

```text
Search Result
     ↓
Pinned Repository Revision
     ↓
Repository Analysis
     ↓
Structured Analysis Result
     ↓
Study / Document Engine
```

---

# 3. Engine Ownership

Analysis owns:

- Analysis job lifecycle.
- Study question decomposition.
- Evidence-gathering plan.
- Bounded repository workspace.
- Tool selection for deterministic inspection.
- Agent task specification.
- Evidence/result validation.
- Structured analysis output.

Analysis does not own:

- Search ranking.
- Final Study document formatting.
- Study version lineage.
- Canonical Memory.
- Repository synchronization policy.

---

# 4. Analysis Job

Conceptual schema:

```text
AnalysisJob
├── analysis_id
├── repository_id
├── source_revision
├── project_id?
├── mode
├── question
├── selected_agent
├── evidence_budget
├── time/resource budget
└── permissions
```

The source revision is mandatory for reproducibility.

---

# 5. Analysis Modes

Initial modes may include:

- **Quick Scan:** high-level architecture and important files.
- **Architecture Study:** boundaries, components, dependencies, data/execution flow.
- **Deep Study:** broader evidence-driven investigation.
- **Focused Study:** one technical question or subsystem.
- **Comparison:** compare repository patterns against another repository, Study, or current project.

Each mode has a bounded evidence plan.

---

# 6. Research Workspace

External repositories should be analyzed outside the user's active project working tree.

Preferred model:

```text
Library Research Workspace
└── repository-X/
```

The workspace should be:

- Revision-pinned.
- Read-only where possible for pure analysis.
- Sandboxed when executing untrusted code would otherwise be possible.
- Separated from the user's primary project.
- Disposable and cacheable.

The selected agent receives the research workspace, not unrestricted access to unrelated user files.

---

# 7. Evidence Collection Layers

Repository understanding should be layered.

```text
Layer 1  Metadata / README / tree
Layer 2  Lexical search
Layer 3  Syntax parsing
Layer 4  Structural search
Layer 5  Cross-reference / code intelligence
Layer 6  Selected Agent reasoning
```

The agent should not spend tokens rediscovering deterministic facts that tools can extract reliably.

---

# 8. Structural Parsing

The engine should support language-aware syntax structure.

Useful outputs:

- Functions.
- Classes.
- Modules.
- Imports.
- Declarations.
- Syntax regions.
- Parse-tree locations.

Parsing is evidence collection, not interpretation.

---

# 9. Structural Search

Structural search allows questions such as:

- Where is this middleware pattern implemented?
- Which functions register providers?
- Which call shapes match a certain architecture pattern?
- Where is a particular constructor form used?

This is stronger than text matching for many code patterns.

---

# 10. Code Intelligence

Cross-reference indexes can answer:

- Where is this symbol defined?
- Where is it referenced?
- What implements this interface?
- Which modules depend on this symbol?

These capabilities make architecture studies more evidence-rich and reduce hallucinated dependency claims.

---

# 11. Agent Reasoning Layer

The agent receives a structured job, selected evidence, and tool access.

Conceptual task:

```text
Analyze this pinned repository revision.
Answer the requested study question.
Use provided evidence tools.
Cite files/symbols/lines where possible.
Distinguish evidence from inference.
Return the AnalysisResult schema.
```

Library must not rely on scraping an opaque terminal transcript as the only result format when a structured integration mode is available.

---

# 12. User-Controlled Agent Selection

The user is the authority over the worker.

Examples:

```text
Current interface: Claude Code
Selected analysis worker: Codex
```

or:

```text
Current interface: Library CLI
Selected analysis worker: Gemini
```

or:

```text
Selected analysis worker: OpenCode
```

The Analysis Engine never hard-codes Claude or Codex as its identity.

```text
Analysis Engine
      ↓
Agent Execution Broker
      ↓
Selected Agent Adapter
```

---

# 13. Evidence Grounding

Every significant conclusion should be traceable to evidence where practical.

Evidence references may identify:

- Repository revision.
- File path.
- Symbol.
- Line/range.
- Manifest.
- Commit.
- Search result.

The engine should allow conclusions to carry confidence and an `inference` marker when direct evidence is incomplete.

---

# 14. Analysis Result

Conceptual output:

```text
AnalysisResult
├── analysis_id
├── repository_id
├── source_revision
├── mode
├── selected_agent
├── summary
├── architecture
├── components[]
├── execution_flows[]
├── data_flows[]
├── relevant_files[]
├── patterns[]
├── strengths[]
├── limitations[]
├── findings[]
├── evidence_refs[]
└── unresolved_questions[]
```

This is input to the Study / Document Engine.

---

# 15. Comparison Mode

Analysis may compare:

- Repository A vs Repository B.
- Repository vs current project.
- Study Version vs current source revision.
- Two implementations of the same pattern.

Comparison uses stable evidence from both sides and must not overwrite the underlying individual analyses.

---

# 16. Incremental Re-Analysis

When Repository Sync reports a delta, Analysis should avoid re-reading the entire repository by default.

```text
Old analyzed revision
        ↓
Repository Delta
        ↓
Impact Scope
        ↓
Targeted Evidence Refresh
        ↓
Incremental Analysis
```

The result can then feed Study V2.

---

# 17. Inter-Engine Contracts

## Search → Analysis

Supplies repository identity and selected revision.

## Sync → Analysis

Supplies source delta and impacted regions.

## Memory → Analysis

Optional historical project knowledge can enrich comparison or current-project analysis.

## Context → Analysis

May build a focused context package for the selected worker.

## Analysis → Study

Outputs structured `AnalysisResult` with evidence references.

---

# 18. Terminal and Agent Interface

Conceptual CLI:

```text
library analyze github.com/example/repo --agent codex --mode architecture
library analyze github.com/example/repo --agent gemini --focus "plugin isolation"
library analyze status <analysis-id>
library analyze evidence <analysis-id>
```

Agent tools may include:

```text
repository.analyze
analysis.get
analysis.evidence
analysis.cancel
```

---

# 19. Events

Potential events:

```text
analysis.started
analysis.evidence.collected
analysis.worker.started
analysis.completed
analysis.failed
analysis.cancelled
```

---

# 20. Security and Resource Boundaries

Repository Analysis touches untrusted external code.

Required concerns:

- Read-only by default.
- Explicit network policy.
- Execution disabled unless analysis mode requires it.
- Timeouts.
- File and process limits.
- Maximum repository size policy.
- Agent workspace isolation.
- Credential isolation.

Deep analysis must not casually inherit full access to the user's primary project or home directory.

---

# 21. GitHub Repositories and Lessons

## tree-sitter/tree-sitter

Repository: https://github.com/tree-sitter/tree-sitter

**Classification:** Strong Integrate Candidate.

Useful capabilities:

- Incremental parsing.
- Concrete syntax trees.
- Broad language support through grammars.
- Robust behavior in partially invalid code.
- Embeddable runtime.

Use as a syntax-evidence layer, not as the complete Analysis Engine.

## ast-grep/ast-grep

Repository: https://github.com/ast-grep/ast-grep

**Classification:** Strong Supporting / Integrate Candidate.

Useful capabilities:

- AST-based structural search.
- Tree-sitter foundation.
- Code-pattern matching beyond text search.
- Lightweight static-analysis workflows.

Library should initially favor search/inspection capabilities and avoid enabling rewrite features in a read-only analysis job unless explicitly required by another product feature.

## scip-code/scip

Repository: https://github.com/scip-code/scip

**Classification:** Strong Code-Intelligence Reference / Integrate Candidate.

Useful capabilities:

- Language-agnostic index protocol.
- Go-to-definition.
- Find references.
- Find implementations.
- Multiple language indexers.

SCIP gives Library a provider-neutral representation of cross-reference intelligence where indexers are available.

## Aider-AI/aider

Repository: https://github.com/Aider-AI/aider

**Classification:** Architecture Reference.

Useful lesson:

- Build a compact repository map and prioritize important symbols before giving a model uncontrolled source-code context.

## sourcebot-dev/sourcebot

Repository: https://github.com/sourcebot-dev/sourcebot

**Classification:** Architecture Reference Only.

Useful lesson:

- Let reasoning models use code-search/navigation tools and ground answers in file-level citations.

Do not directly copy its code into Library without license review because of its current FSL competing-use terms.

---

# 22. V1 Recommendation

Build Analysis V1 as a Library-owned workflow that combines:

```text
Repository metadata/tree
+ lexical search
+ Tree-sitter
+ ast-grep
+ optional SCIP indexes where available
+ user-selected Agent Adapter
+ evidence-linked AnalysisResult
```

The selected agent should be replaceable without changing the Analysis schema.

---

# 23. Non-Goals

Analysis V1 is not:

- Repository discovery.
- Automatic code modification.
- Automatic execution of untrusted build scripts.
- A Claude-only or Codex-only engine.
- A replacement for Study formatting.
- A replacement for Repository Sync.
- A requirement to build SCIP indexes for every language on day one.

---

# 24. V1 Conceptual Architecture

```text
Selected Repository Revision
            │
            ▼
      Research Workspace
            │
  ┌─────────┼─────────────────────┐
  ▼         ▼         ▼           ▼
Metadata  Tree-sitter ast-grep   SCIP
  │         │         │           │
  └─────────┴────┬────┴───────────┘
                 ▼
          Evidence Collector
                 │
                 ▼
         Analysis Job Planner
                 │
                 ▼
       Agent Execution Broker
                 │
                 ▼
         User-selected Agent
                 │
                 ▼
         AnalysisResult + Evidence
                 │
                 ▼
        Study / Document Engine
```

---

# 25. Future Evolution

Possible future additions:

- Language-specific semantic analyzers.
- Build/test execution in strong sandboxes.
- Architecture graph extraction.
- Multi-agent review as an optional mode.
- Cost-aware evidence planning.
- Confidence calibration from historical correctness.
- Binary or generated-code analysis modules.

---

# 26. Design Principles

- Evidence first.
- Pinned revision always.
- Deterministic tools before expensive reasoning.
- Agent-neutral workflow.
- User-controlled worker selection.
- External repositories are untrusted.
- Analysis produces structured results; Study owns presentation.
- Incremental re-analysis should reuse prior evidence when safe.
