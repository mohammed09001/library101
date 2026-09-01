# Library Engine Exit Plan — Research Reference Index V1

- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Purpose:** Record the primary GitHub and official-documentation references used to compile the engineering roadmaps and execution prompts. Execution agents must re-validate current upstream reality when a task materially depends on it.

# Research Classification

- **Core candidate:** potentially integrate after license/API/benchmark validation.
- **Supporting component:** narrow reusable capability behind a Library-owned interface.
- **Architecture reference:** study patterns and terminology; do not assume direct dependency.
- **Future/optional:** benchmark/requirements-gated, not required for V1.

# GitHub Repositories

## mem0ai/mem0

- **URL:** https://github.com/mem0ai/mem0
- **Classification:** Architecture / selective implementation reference
- **Library lesson:** ADD-oriented memory accumulation, entity linking, multi-signal retrieval (semantic + BM25 + entities), temporal reasoning, memory APIs, and self-hosting. Do not inherit its assumption that an LLM/embedding provider is required for every core memory operation.
- **Execution research targets:**
  - memory add/search lifecycle
  - hybrid retrieval and entity linking
  - temporal reasoning
  - self-hosted boundaries
  - provider abstractions
  - benchmark/evaluation methodology

## getzep/graphiti

- **URL:** https://github.com/getzep/graphiti
- **Classification:** Future / temporal-graph architecture reference
- **Library lesson:** Temporal facts with validity windows, episodes as provenance, incremental graph construction, contradiction/supersession history, hybrid retrieval. Treat a graph as a rebuildable projection, not canonical Library truth.
- **Execution research targets:**
  - episodes and provenance
  - temporal validity windows
  - incremental updates
  - hybrid search recipes
  - graph-driver abstraction
  - MCP/REST exposure

## dolthub/dolt

- **URL:** https://github.com/dolthub/dolt
- **Classification:** Lineage / versioned-data architecture reference
- **Library lesson:** Git-like commits, diffs, history, branching, blame, and time travel over structured data. Use the model as inspiration for immutable Study lineage rather than adopting Dolt as a mandatory V1 database.
- **Execution research targets:**
  - commit identity
  - diff/log/history semantics
  - branch/merge concepts
  - blame/time travel
  - structured versioning invariants

## Aider-AI/aider

- **URL:** https://github.com/Aider-AI/aider
- **Classification:** Context / repository-map architecture reference
- **Library lesson:** RepoMap selects important symbols and signatures across a codebase, ranks dependency-connected files, and stays inside an explicit token budget. Context should select and compose rather than dump the repository.
- **Execution research targets:**
  - aider/repomap.py
  - repository-map docs
  - tree-sitter/ctags usage
  - graph ranking/PageRank-style relevance
  - map token budgeting
  - chat-state influence on map selection

## continuedev/continue

- **URL:** https://github.com/continuedev/continue
- **Classification:** Context-provider architecture reference
- **Library lesson:** Separate context providers for files, search, Git commits, databases, web, issues, current file, and file tree. Preserve provider capability isolation and fail-soft behavior while avoiding legacy/deprecated provider patterns.
- **Execution research targets:**
  - core/context/providers
  - provider interface/types
  - SearchContextProvider
  - GitCommitContextProvider
  - FileTreeContextProvider
  - CurrentFileContextProvider
  - provider registration and deprecation paths

## modelcontextprotocol/typescript-sdk

- **URL:** https://github.com/modelcontextprotocol/typescript-sdk
- **Classification:** Core tool-surface candidate
- **Library lesson:** Expose tools/resources/prompts through a standard agent-facing protocol. The 2026-07-28 MCP line uses a stateless protocol core and updated routing/auth semantics; verify the current SDK/spec during execution rather than coding against stale examples.
- **Execution research targets:**
  - server/client package split
  - tool schemas
  - stdio transport
  - Streamable HTTP
  - authorization helpers
  - 2026-07-28 migration notes
  - task/extension support when relevant

## sourcegraph/zoekt

- **URL:** https://github.com/sourcegraph/zoekt
- **Classification:** Core code-search candidate
- **Library lesson:** Trigram-indexed source search, substring/regexp/boolean query language, symbol-aware ranking, multi-repository search, local sync/indexing, JSON and gRPC search surfaces. Use as indexed code-search substrate, not as Library intent/ranking logic itself.
- **Execution research targets:**
  - doc/query_syntax.md
  - trigram indexing design
  - ctags symbol ranking
  - zoekt-git-index
  - zoekt-local-sync
  - indexserver
  - JSON API
  - gRPC SearchRequest/streaming

## octokit/octokit.js

- **URL:** https://github.com/octokit/octokit.js
- **Classification:** Core GitHub-provider candidate
- **Library lesson:** Typed REST/GraphQL access, authentication strategies, GitHub Apps, pagination, retries, throttling, webhooks. Library should hide these behind a RepositoryProvider contract.
- **Execution research targets:**
  - REST/GraphQL client composition
  - auth strategy injection
  - pagination
  - retry/throttling plugins
  - GitHub App support
  - request cancellation/timeouts

## octokit/webhooks.js

- **URL:** https://github.com/octokit/webhooks.js
- **Classification:** Supporting webhook component
- **Library lesson:** Typed webhook event handling and verification. Use with GitHub delivery IDs/signatures and explicit deduplication; webhook availability depends on repository/App permissions.
- **Execution research targets:**
  - signature verification
  - event typing
  - delivery processing
  - error handling
  - webhook event narrowing

## BurntSushi/ripgrep

- **URL:** https://github.com/BurntSushi/ripgrep
- **Classification:** Supporting local inspection component
- **Library lesson:** Fast recursive lexical search respecting ignore rules. Useful for bounded light inspection and deterministic fallback when indexed search is unavailable.
- **Execution research targets:**
  - ignore semantics
  - file type filtering
  - regex/search execution
  - streaming output
  - performance boundaries

## universal-ctags/ctags

- **URL:** https://github.com/universal-ctags/ctags
- **Classification:** Supporting symbol extraction component
- **Library lesson:** Broad language symbol extraction useful for search ranking and lightweight repository profiles. Treat symbol output as derived index evidence.
- **Execution research targets:**
  - supported language parsers
  - JSON output
  - symbol kinds
  - field selection
  - incremental/index integration constraints

## quickwit-oss/tantivy

- **URL:** https://github.com/quickwit-oss/tantivy
- **Classification:** Optional search-index implementation reference
- **Library lesson:** Rust full-text indexing/search architecture. Benchmark before introducing it; do not duplicate Zoekt unless Library-owned document/search workloads justify a separate index.
- **Execution research targets:**
  - schema/index model
  - query parser
  - BM25
  - segment lifecycle
  - incremental indexing

## sourcebot-dev/sourcebot

- **URL:** https://github.com/sourcebot-dev/sourcebot
- **Classification:** Architecture study only — licensing caution
- **Library lesson:** Combines self-hosted multi-repo code search, code navigation, and agent reasoning grounded with inline citations. Current source is FSL-1.1-ALv2 with competing-use restrictions, so study architectural patterns without copying or depending on restricted code for a competing product.
- **Execution research targets:**
  - code-search ↔ reasoning boundary
  - citation/evidence UX
  - Zoekt protocol integration
  - repository configuration model
  - LICENSE.md before any reuse decision

## tree-sitter/tree-sitter

- **URL:** https://github.com/tree-sitter/tree-sitter
- **Classification:** Core structural parsing candidate
- **Library lesson:** Incremental concrete syntax trees, robust parsing with syntax errors, multi-language grammars, and queryable node positions. Use structural parsing as evidence extraction before agent reasoning.
- **Execution research targets:**
  - parser lifecycle
  - incremental tree update
  - queries
  - node byte/point ranges
  - grammar loading
  - error nodes
  - language bindings

## ast-grep/ast-grep

- **URL:** https://github.com/ast-grep/ast-grep
- **Classification:** Core/supporting structural-search candidate
- **Library lesson:** Tree-sitter-backed AST structural search using code-like patterns and meta-variables. Prefer read/search APIs for Library Analysis; rewriting is outside Analysis V1 unless explicitly authorized elsewhere.
- **Execution research targets:**
  - pattern matching engine
  - meta-variable semantics
  - language integration
  - AST traversal APIs
  - rule configuration
  - search-only execution

## scip-code/scip

- **URL:** https://github.com/scip-code/scip
- **Classification:** Code-intelligence protocol candidate
- **Library lesson:** Language-agnostic Protobuf index for definition/reference/implementation navigation with multiple language indexers. Use as optional deeper code-intelligence layer when an indexer is available.
- **Execution research targets:**
  - scip.proto
  - symbol identity
  - occurrence roles
  - definition/reference representation
  - index metadata
  - available language indexers

## GitoxideLabs/gitoxide

- **URL:** https://github.com/GitoxideLabs/gitoxide
- **Classification:** Core Git plumbing candidate
- **Library lesson:** Rust Git implementation exposing fetch, status, blob/tree diff, commit-graph traversal, objects, refs, index, pathspecs and worktree operations. Verify feature stability per crate; CLI binaries are not promised stable scripting interfaces.
- **Execution research targets:**
  - gix entrypoint
  - gix-diff
  - gix-revision/revwalk
  - gix-status
  - gix-transport/fetch
  - crate-status.md
  - stability tiers

## unifiedjs/unified

- **URL:** https://github.com/unifiedjs/unified
- **Classification:** Core document-pipeline candidate
- **Library lesson:** Plugin-based parse → syntax tree → transform → compile pipeline across mdast/hast/nlcst ecosystems, with file metadata via vfile. Use a structured Study IR/AST and deterministic renderers.
- **Execution research targets:**
  - processor parse/run/stringify
  - plugin contracts
  - mdast/remark ecosystem
  - vfile metadata
  - bridge vs mutate transformations
  - CLI/file integration

## jgm/pandoc

- **URL:** https://github.com/jgm/pandoc
- **Classification:** Supporting export component
- **Library lesson:** Reader → AST → filter → writer model and broad document export. Keep Pandoc outside canonical Study ownership; export from a validated Library Study representation.
- **Execution research targets:**
  - Pandoc AST
  - JSON/Lua filters
  - reader/writer model
  - metadata/citations
  - deterministic export considerations

## automerge/automerge-repo

- **URL:** https://github.com/automerge/automerge-repo
- **Classification:** Synchronization architecture reference / optional future component
- **Library lesson:** Separates document core from pluggable storage/network adapters and supports local/offline synchronization. V1 Library has a single canonical Local Runtime, so CRDT adoption is benchmark/requirements-gated rather than default.
- **Execution research targets:**
  - Repo/DocHandle lifecycle
  - StorageAdapter
  - NetworkAdapter
  - event dispatch
  - NodeFS/IndexedDB adapters
  - WebSocket/MessageChannel adapters
  - offline resync

## yjs/yjs

- **URL:** https://github.com/yjs/yjs
- **Classification:** Future concurrent-editing reference
- **Library lesson:** Network-agnostic CRDT shared types, offline editing, snapshots, providers and conflict-free merging. Use only if true concurrent multi-writer document editing becomes a requirement.
- **Execution research targets:**
  - Y.Doc updates
  - state vectors
  - snapshots
  - provider separation
  - offline persistence
  - relative positions/conflict semantics

## electric-sql/electric

- **URL:** https://github.com/electric-sql/electric
- **Classification:** Projection/sync architecture reference
- **Library lesson:** Read-path synchronization and partial replication through Shapes. Adapt the idea of synchronizing only bounded projections relevant to each Library client rather than replicating all state everywhere.
- **Execution research targets:**
  - Shapes
  - offset/cursor semantics
  - partial replication
  - client subscription model
  - HTTP sync protocol
  - failure/resume behavior

## notify-rs/notify

- **URL:** https://github.com/notify-rs/notify
- **Classification:** Core filesystem-watcher candidate (Rust)
- **Library lesson:** Cross-platform filesystem notifications over OS-specific backends plus polling fallback. Use debounce/file identity/content hashes because filesystem event streams are not a canonical change log.
- **Execution research targets:**
  - platform backends
  - event types
  - debouncer crates
  - file-id support
  - polling fallback
  - rename behavior/caveats

# Official / Internet References

## GitHub REST API

- **URL:** https://docs.github.com/en/rest
- **Why it matters:** Versioned GitHub REST API and auth patterns.

## GitHub Compare Commits

- **URL:** https://docs.github.com/en/rest/commits/commits#compare-two-commits
- **Why it matters:** BASE..HEAD commit/file comparison; useful for repository delta.

## GitHub Rate Limits

- **URL:** https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- **Why it matters:** Primary/secondary/search-specific rate limits, headers, Retry-After and backoff.

## GitHub Webhooks

- **URL:** https://docs.github.com/en/webhooks
- **Why it matters:** Webhook types, delivery IDs, signatures, permission limitations and redelivery.

## MCP 2026-07-28

- **URL:** https://modelcontextprotocol.io/specification/2026-07-28
- **Why it matters:** Current MCP specification line; stateless core and updated authorization/routing.

## Tree-sitter Documentation

- **URL:** https://tree-sitter.github.io/tree-sitter/
- **Why it matters:** Incremental parsing and syntax-node model.

## Automerge Repo Documentation

- **URL:** https://automerge.org/docs/reference/repositories/
- **Why it matters:** Storage/network adapter separation and local/offline sync.

## Pandoc Filters

- **URL:** https://pandoc.org/filters.html
- **Why it matters:** Reader → AST → filter → writer transformation model.

## ElectricSQL Documentation

- **URL:** https://electric-sql.com/docs
- **Why it matters:** Shapes and partial read-path synchronization.

# Current Research Decisions

- Sourcebot is architecture-study-only in this pack because its current FSL-1.1-ALv2 terms restrict competing use; every execution that studies it must inspect the current license again before any reuse decision.
- MCP prompts use the current 2026-07-28 specification line as a research target, but the executing agent must re-check the installed/current SDK and migration notes.
- CRDT systems such as Automerge/Yjs are not mandatory for Library V1. Library currently has one canonical Local Runtime; adopt CRDT only when a real concurrent multi-writer requirement and benchmark justify it.
- Vector databases and relationship graphs are projections, not required canonical stores.
- GitHub Search/Compare/Webhooks are provider surfaces; Library owns Search intent/ranking and Repository Sync materiality/trigger semantics.