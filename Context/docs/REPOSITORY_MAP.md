# Repository Map Context Provider (Task 11)

> **Execution 06 (Task 16)** exposes this provider's PageRank score to the
> selector as `ContextCandidate.relevanceHint` and weighs it as one signal
> among six — see docs/RELEVANCE.md for that integration and its "do not
> assume centrality equals relevance" proof. Everything below describes the
> provider itself, unchanged in its own ranking/rendering logic.

Implemented in `src/providers/repositoryMapContextProvider.ts` (provider
glue), `src/providers/repoMapExtract.ts` (symbol extraction),
`src/providers/repoMapRank.ts` (pure PageRank core), and
`src/providers/gitignoreMatcher.ts` / `src/providers/fsPathGuard.ts`
(shared with `ProjectFilesProvider`, Anti-Accumulation Rule).

## Task Source Requirement

"Generate/consume a concise symbol/signature map and high-value repository
regions inspired by Aider RepoMap rather than dumping source."

## Research note (mandatory external reference: Aider-AI/aider)

Inspected `aider/repomap.py` on the `main` branch (via GitHub raw content,
2026-08-30) — specifically `RepoMap.get_tags_raw()`, `get_ranked_tags()`,
`get_ranked_tags_map_uncached()`.

| Upstream element | Decision | Why |
|---|---|---|
| tree-sitter/ctags-based tag extraction (`.scm` query files) | **REJECT** (as a dependency) | This repository declares zero runtime dependencies (README.md) — tree-sitter is a native-binding dependency, and pulling it in for one provider would be a material architecture change, not a bounded one. **ADAPT**: `repoMapExtract.ts` uses per-language-family regex rules instead — a documented, bounded-coverage heuristic (TS/JS, Python, and a generic Go/Rust/Java/C#-ish fallback), not a parser. |
| `networkx.MultiDiGraph` + `nx.pagerank(personalization=..., dangling=...)` | **REJECT** (as a dependency), **INTEGRATE** (the algorithm) | Same zero-runtime-deps constraint. `repoMapRank.ts` hand-rolls a weighted directed graph and a fixed-iteration personalized PageRank power-iteration — the same algorithm shape (including dangling-node handling via personalization redistribution), no library. |
| Edge weight: `sqrt(num_refs)` damping so a very common identifier doesn't dominate the graph | **INTEGRATE** | Cheap, directly prevents one heavily-referenced symbol from swamping ranking; ported as-is. |
| Edge weight: chat-file x50 / mentioned-identifier x10 boosts feeding `personalization` | **ADAPT** | Context has no "active chat files" concept (no per-turn file-selection state in `ContextRequest`). The closest real analogue is `taskText`: an identifier whose lowercase form appears in `taskText` gets a x10 edge-weight boost, and a file whose defined symbol name appears in `taskText` gets personalization mass — proven in `test/t11_repository_map.test.ts` ("taskText mentions shift ranking"). |
| Edge weight: snake_case/camelCase-length multiplier, underscore penalty, high-def-count penalty | **DEFER** | Real secondary refinements in aider, but not required to prove the core "cross-file reference graph + personalization ranks meaningfully" claim. Documented here as a scoped simplification, not silently dropped — a future Execution could add them without a contract change (they only affect internal edge weighting). |
| Binary-search token-budget fitting (`get_ranked_tags_map_uncached`) | **REJECT** | Would duplicate Task 5's already-implemented, already-owned deterministic pack budget ceiling (`docs/PACKS.md`) — this Execution's own Plan Challenge question ("can one owner/abstraction be removed while preserving the goal?") answers yes. Instead, `discover()` orders its returned refs by descending rank so any budget trimming (today's ceiling, or a future selector) naturally keeps the highest-value entries first. |
| Rendering a file's map entry as line-numbered signatures around ranked "lines of interest" (`render_tree`/`grep_ast.TreeContext`) | **ADAPT** | `renderSignatureBlock()` renders the file's own top-N (by line order, capped at `maxSymbolsPerFile`) recognized definitions as `<line>: <signature>` — the same "signatures, not bodies" spirit, without a tree-sitter-backed context renderer. |

No dependency on `Aider-AI/aider` code was introduced — only the
architecture's *shape* was studied; nothing was imported or vendored.

## Design

- **Granularity is per-file**, matching `ProjectFilesProvider`'s `ref`
  convention and Aider's own map (which groups ranked symbols by file).
  "High-value repository regions" from the Task Source Requirement is
  realized as file-level rank ordering, not a new field on
  `ContextCandidateRef` — no provider-contract change was needed.
- **`discover()` reads file bytes**, unlike `ProjectFilesProvider.discover()`
  (which only `stat()`s). This is a genuine, deliberate departure from the
  provider contract's "cheap enumeration ... must not fetch full content"
  language — full justification is in the provider file's module docstring.
  In short: the *structural* invariant that actually matters (a
  `ContextCandidateRef` never carries a `content` field) still holds; what
  changed is the I/O cost of producing the enumeration, which is declared
  honestly via `cost.relativeCost: "medium"` (vs. `project_files`' `"low"`)
  and bounded by an in-memory mtime/size-keyed extraction cache so repeated
  calls against an unchanged file are free.
- **`retrieve()` never returns raw source** — only a bounded, per-file
  signature excerpt (`renderSignatureBlock`). Proven directly in
  `test/t11_repository_map.test.ts` ("retrieve() returns a concise signature
  excerpt, never the file's raw body") by asserting a function-body-only
  string is absent from the retrieved content.
- **`.gitignore` and path-traversal defense are shared** with
  `ProjectFilesProvider` (`gitignoreMatcher.ts`, `fsPathGuard.ts`) — one
  owner, not two copies (Anti-Accumulation Rule).

## Known limitations

- Extraction is regex-based, not a real parser: it will miss definitions in
  unusual formatting (e.g. multi-line signatures) and may occasionally
  misfire on a line that merely resembles a definition. Documented, bounded
  language coverage: TS/JS/TSX/JSX/MJS/CJS/MTS/CTS, Python, and a generic
  Go/Rust/Java/C#-shaped fallback for everything else.
- No cross-file scope resolution: a reference is matched against a global
  (repo-wide) definition-name index, not real import/scope analysis, so two
  same-named symbols in unrelated files can create a spurious graph edge.
  This mirrors Aider's own tag-based (not type-checked) approach.
- The edge-weight refinements marked DEFER above are not implemented.
- Ranking is per-provider-instance and in-memory only — nothing persists
  across process restarts, consistent with the registry's own "no
  persistence across restarts" discipline (docs/CONTRACTS.md).
