# Library — Repository Search Engine V1

- **Working Product:** Library
- **Document Type:** Repository Discovery Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define an intent-driven, explainable repository-discovery engine that finds and ranks relevant repositories before any deep analysis is performed.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Search vs Analysis Boundary
3. Search Request
4. Intent Parser
5. Query Planner
6. Repository Provider Interface
7. GitHub Provider V1
8. Candidate Discovery
9. Hard Filters
10. Light Repository Inspector
11. Repository Profile
12. Signal Extraction
13. Explainable Ranking
14. Search Session and Search Memory
15. Repository Identity and Revision
16. Rate Limits and Credentials
17. Inter-Engine Contracts
18. Terminal and Agent Interface
19. Events
20. Storage Model
21. GitHub Repositories and Lessons
22. V1 Recommendation
23. Non-Goals
24. V1 Conceptual Architecture
25. Future Evolution
26. Design Principles

---

# 1. Engine Vision

Repository Search is an intent-driven discovery engine for technical repositories.

The user should be able to describe a problem or architecture instead of manually constructing advanced GitHub search syntax.

Example:

```text
Find open-source repositories that implement plugin isolation
for local developer tooling and do not require Kubernetes.
```

The engine converts this into multiple discovery strategies, inspects candidates within a bounded budget, ranks them by technical relevance, and explains why each result matches.

---

# 2. Search vs Analysis Boundary

Search finds and prioritizes repositories.

Analysis studies a selected repository deeply.

```text
Search
  ↓
Candidate Repositories
  ↓
User Selection
  ↓
Analysis
```

Search must not automatically spend expensive agent time deeply analyzing every candidate.

---

# 3. Search Request

Conceptual schema:

```text
SearchRequest
├── request_id
├── project_id?
├── query_text
├── preferred_languages[]
├── required_signals[]
├── excluded_signals[]
├── source_provider
├── max_candidates
├── inspection_budget
└── selected_search_agent?
```

The selected search agent is optional. Deterministic discovery should work without an AI worker.

---

# 4. Intent Parser

The Intent Parser extracts structured meaning such as:

- Technical problem.
- Required patterns.
- Preferred language.
- Framework preferences.
- Exclusions.
- Recency requirements.
- License requirements when explicitly requested.
- Architecture hints.

Output:

```text
SearchIntent
```

A coding/research agent may help interpret complex natural-language intent when the user selects one, but the Search Engine owns the canonical SearchIntent schema.

---

# 5. Query Planner

One intent should generate multiple discovery queries.

Example:

```text
Intent:
local-first synchronization engine

Queries:
- "local-first" sync
- CRDT offline-first
- repository synchronization local state
- event log projection sync
```

The Query Planner prevents one fragile query from defining the entire search result set.

---

# 6. Repository Provider Interface

Search must not hard-code GitHub into the domain core.

Conceptual provider contract:

```text
RepositoryProvider
├── searchRepositories()
├── getRepository()
├── getReadme()
├── getTree()
├── getFile()
├── getDefaultBranch()
├── getRevision()
└── getMetadata()
```

Future providers may include GitLab, Codeberg, self-hosted Git services, or local repository catalogs.

---

# 7. GitHub Provider V1

GitHub is the first provider.

The provider is responsible for:

- REST/GraphQL calls.
- Authentication.
- Pagination.
- Rate-limit handling.
- Repository metadata.
- Branch/revision resolution.
- README and tree retrieval.

This provider should remain separate from ranking logic.

---

# 8. Candidate Discovery

Candidate discovery intentionally favors recall.

It gathers more repositories than will be shown to the user.

Sources may include:

- GitHub repository search.
- Topic/language constraints.
- Related keyword combinations.
- Prior confirmed repositories when useful.

Search should record which query discovered each candidate.

---

# 9. Hard Filters

Before expensive inspection, remove candidates that violate explicit constraints.

Possible filters:

- Archived repository.
- Wrong language where language is mandatory.
- Missing required license when explicitly constrained.
- Clearly unrelated repository category.
- Excluded framework/dependency.
- Empty or inaccessible repository.

Hard filters should be explainable.

---

# 10. Light Repository Inspector

Light inspection gathers evidence cheaply.

Typical budgeted inputs:

- README.
- Repository metadata.
- Top-level tree.
- Manifest files.
- Selected documentation.
- `src/`, `packages/`, `docs/`, or similar directories.
- Bounded lexical code search.
- Symbol hints.

Light inspection is not Deep Study.

---

# 11. Repository Profile

Each candidate receives a normalized profile.

```text
RepositoryProfile
├── repository_id
├── provider
├── owner
├── name
├── default_branch
├── revision
├── languages[]
├── manifests[]
├── architecture_signals[]
├── framework_signals[]
├── activity_signals
├── license
├── evidence_refs[]
└── inspection_revision
```

---

# 12. Signal Extraction

Signals may include:

- Language.
- Architecture.
- Framework.
- Infrastructure.
- Design patterns.
- Testing.
- Activity.
- License.
- Project health.
- Similarity to requested problem.
- Important symbols.

Signals must retain evidence references whenever possible.

---

# 13. Explainable Ranking

Popularity should be a secondary signal, not the main ranking strategy.

Conceptual scoring dimensions:

```text
Intent Match
Architecture Match
Evidence Strength
Technical Relevance
Repository Health
Freshness
Popularity (low weight)
```

Every displayed result should include a `WhyMatched` explanation.

Example:

```text
Why this matched:
- Uses a local-first replication model.
- Contains an explicit sync engine package.
- Repository structure indicates separate storage and transport adapters.
- Actively maintained.
```

---

# 14. Search Session and Search Memory

A search is a durable research action.

Store:

- Search request.
- Intent.
- Generated queries.
- Candidates.
- Inspection results.
- Ranking.
- User selections.

This allows the user to resume, compare, or reuse prior research.

Search history remains Search-owned. Reusable lessons may later be promoted into Memory.

---

# 15. Repository Identity and Revision

Repository identity should be stable.

```text
RepositoryIdentity
├── provider
├── provider_repo_id
├── owner
├── name
├── canonical_url
├── default_branch
└── observed_revision
```

Search results should retain the revision inspected so later Analysis can reproduce the evidence baseline.

---

# 16. Rate Limits and Credentials

Search requires explicit rate-limit and credential management.

The engine should support:

- Authenticated GitHub access.
- Anonymous access where supported.
- Rate-limit state.
- Retry/backoff.
- Request budgeting.
- Credential storage outside engine records.

Credentials should use the platform's secure credential mechanism rather than being written into study files.

---

# 17. Inter-Engine Contracts

## Search → Analysis

Search passes a selected `RepositoryIdentity` and pinned revision or branch target.

## Search → Study

Search may create lightweight research records, but Deep Study creation belongs to Study / Document after Analysis.

## Search → Memory

Confirmed research preferences or durable findings may become Memory Candidates. Candidate ranking itself remains Search-owned.

## Search → Context

Context may reuse prior selected repositories or Search evidence when building a research-oriented Context Pack.

---

# 18. Terminal and Agent Interface

Conceptual CLI:

```text
library search "plugin isolation for local tooling"
library search --language rust "code intelligence protocol"
library search show <search-id>
library search explain <repository-id>
```

Agent tools:

```text
repository.search
repository.inspect
repository.search.explain
```

The user may choose an agent to assist with intent interpretation or bounded search reasoning, but Search remains provider-neutral and agent-neutral.

---

# 19. Events

Potential events:

```text
repository.search.started
repository.discovered
repository.inspected
repository.ranked
repository.selected
repository.search.completed
```

---

# 20. Storage Model

Possible V1 entities:

```text
search_sessions
search_intents
search_queries
repositories
repository_snapshots
repository_profiles
repository_signals
search_candidates
search_rankings
search_evidence
```

A vector database is not required for V1.

---

# 21. GitHub Repositories and Lessons

## sourcegraph/zoekt

Repository: https://github.com/sourcegraph/zoekt

**Classification:** Strong Integrate Candidate / Core Search Reference.

Useful capabilities:

- Fast source-code search.
- Substring and regular-expression matching.
- Boolean query language.
- Multi-repository search.
- Code-aware ranking signals such as symbol matches.
- Trigram indexing.
- JSON and gRPC search surfaces.
- Repository index synchronization support.

Library can use Zoekt as an indexed-code-search subsystem without making Zoekt the whole Repository Search Engine.

## octokit/octokit.js

Repository: https://github.com/octokit/octokit.js

**Classification:** Strong Integrate Candidate for GitHub Provider.

Useful capabilities:

- REST and GraphQL.
- Authentication strategies.
- GitHub App support.
- Webhooks and OAuth.
- Pagination.
- Retry and throttling support.

## BurntSushi/ripgrep

Repository: https://github.com/BurntSushi/ripgrep

**Classification:** Supporting Component.

Useful role:

- Very fast local lexical search for bounded inspection where building or refreshing an index would be unnecessary.

## universal-ctags/ctags

Repository: https://github.com/universal-ctags/ctags

**Classification:** Supporting Component.

Useful role:

- Cross-language symbol extraction.
- Symbol-aware relevance signals.
- Useful companion to indexed search.

## quickwit-oss/tantivy

Repository: https://github.com/quickwit-oss/tantivy

**Classification:** Optional / Low-Level Search Reference.

Useful role:

- Rust full-text index internals if Library later needs a custom general-purpose index beyond Zoekt.

Do not introduce it merely because it is powerful; Zoekt already covers the code-search problem well.

## sourcebot-dev/sourcebot

Repository: https://github.com/sourcebot-dev/sourcebot

**Classification:** Architecture Reference Only.

Useful ideas:

- Self-hosted multi-repository search.
- Combining code search/navigation with reasoning models.
- Grounded answers with inline citations.
- Clear Search → reasoning workflow.

Important license note:

- The current repository uses FSL-1.1-ALv2 for core content with restrictions on competing use before the future-license date.
- Treat it as a study/reference repository, not a codebase to copy into Library without legal review.

---

# 22. V1 Recommendation

Build Library-owned Search orchestration around:

```text
Intent Parser
+ Query Planner
+ GitHub Provider (Octokit)
+ bounded Light Inspector
+ Zoekt for indexed code search where justified
+ ripgrep for local bounded lexical search
+ optional ctags signals
+ Library-owned explainable ranker
```

Do not automatically deep-analyze every search result.

---

# 23. Non-Goals

Search V1 is not:

- A GitHub UI clone.
- A general web search engine.
- A Deep Study engine.
- A popularity leaderboard.
- An LLM-only search system.
- A vector-database requirement.

---

# 24. V1 Conceptual Architecture

```text
User Search Intent
        │
        ▼
   Intent Parser
        │
        ▼
   Query Planner
        │
        ▼
 Repository Provider
        │
        ▼
Candidate Discovery
        │
        ▼
  Hard Filters
        │
        ▼
 Light Inspection
        │
   ┌────┼─────────────┐
   ▼    ▼             ▼
GitHub Zoekt       ripgrep/ctags
   │    │             │
   └────┴──────┬──────┘
               ▼
        Signal Extractor
               │
               ▼
      Explainable Ranker
               │
               ▼
      Candidate Results
               │
               ▼
       User Selection
               │
               ▼
   Repository Analysis Engine
```

---

# 25. Future Evolution

Possible future additions:

- GitLab / Codeberg providers.
- Project-aware search.
- User-trained ranking preferences.
- Semantic ranking projection.
- Release-aware discovery.
- Organization-scale local indexes.
- Saved search policies.

---

# 26. Design Principles

- Intent before query syntax.
- Discovery before deep analysis.
- Evidence before ranking claims.
- Explain every high-ranked result.
- Popularity is secondary.
- Provider adapters isolate GitHub-specific behavior.
- Deterministic search should work without an agent.
- The user chooses any agent-backed search reasoning when desired.
