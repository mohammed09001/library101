# @library/context-engine

Selector/composer of bounded task context. Owns the `ContextRequest`
task-intent schema, the Context Provider contract/registry (with capability
probing), normalized candidates, and immutable `ContextPack` build records
(SQLite-backed). Providers: a filesystem reference implementation
(`project_files`, honors the root's `.gitignore`), a rank-ordered
symbol/signature repository map (`repository_map`, Aider RepoMap-inspired),
bounded git commit/diff queries (`git_history`), host-provided current
file/selection/task/session metadata (`current_session`, no external
dependency), a live Memory adapter (`memory`), and two adapters shaped for
anticipated contracts not yet verified against a real sibling engine —
Study (`study_document`) and Performance (`performance`). A deterministic
(non-semantic) selector — `context.select` — ranks candidates on task term
overlap, source authority, path overlap, recency, explicit pins, and
repository-map graph centrality; `context.build`/`context.preview` privacy-
filter, deduplicate identical content across providers, prevent one
provider from monopolizing the budget (diversity/coverage policy), and
verify real (not just estimated) serialized size — with deterministic
truncation for a boundary item, and a caller-declared reservation for its
own prompt framing. A pin (`requiredSources`) gets real budget priority but
never overrides privacy or a hard size limit. Callers may still hand-supply
an ordered item list directly to `context.build`/`context.preview` exactly
as before (see docs/BOUNDARY.md for exactly what is and isn't implemented).

- **Boundary:** docs/BOUNDARY.md (frozen, contract v1.13.0)
- **ContextRequest schema (incl. `sessionContext`):** docs/SCHEMA.md
- **Candidate schema:** docs/CANDIDATES.md
- **Provider contract + capability probing + context.* operations/events:** docs/CONTRACTS.md
- **ContextPack schema + immutability + dedup:** docs/PACKS.md
- **Cross-engine CLI adapters (Memory, Study, Performance):** docs/ADAPTERS.md
- **Repository Map provider design + Aider research note:** docs/REPOSITORY_MAP.md
- **Git History provider design:** docs/GIT_HISTORY.md
- **Selector design (deterministic relevance, graph relevance, dedup):** docs/RELEVANCE.md
- **MCP tool surface (context.build/preview/get over stdio):** docs/MCP.md

Backend/terminal-first, agent-neutral, game-independent. Zero runtime
dependencies (Node.js ≥ 22.13 built-in `node:sqlite`).

## Commands

```powershell
npm run typecheck
npm test
npm run cli -- health --store data/context-engine.db
npm run cli -- providers list --project-root . --memory-store ..\Memory\data\memory-engine.db
```

```powershell
$req = '{"contractVersion":"1.5.0","project":{"projectKey":"library101"},"taskText":"summarize recent changes","hostAgent":{"kind":"human","name":"kim"},"mode":"chat","budget":{"maxTokens":4000,"reservedFramingTokens":200},"privacyPolicy":{"maxPrivacyClass":"internal"},"callerCapabilities":{"actorKind":"human"},"createdAt":"2026-08-30T00:00:00Z"}'
npm run cli -- request validate --request $req
npm run cli -- providers discover --project-root . --memory-store ..\Memory\data\memory-engine.db --request $req
```

```powershell
# Let the deterministic selector pick and rank items (same $req as above — just a ContextRequest, not wrapped):
npm run cli -- select --project-root . --repo-map-root . --request $req --max-per-provider 10 --max-items 20
```

```powershell
# A pack drawing from both a filesystem item and a live Memory record:
$build = '{"request":' + $req + ',"items":[{"providerId":"project_files","ref":"README.md"},{"providerId":"memory","ref":"mem_..."}],"rankingVersion":"manual-v1","creationReason":"demo","createdBy":{"kind":"human","name":"kim"}}'
npm run cli -- pack build --store data/context-engine.db --project-root . --memory-store ..\Memory\data\memory-engine.db --request $build
npm run cli -- pack get --store data/context-engine.db --pack-id pak_...
npm run cli -- pack explain --store data/context-engine.db --pack-id pak_...
npm run cli -- pack list --store data/context-engine.db --project-key library101 --status active
npm run cli -- pack attach --store data/context-engine.db --pack-id pak_... --target '{"kind":"agent","name":"worker-a","agentType":"claude"}'
npm run cli -- pack detach --store data/context-engine.db --pack-id pak_... --attachment-id atc_... --actor '{"kind":"human","name":"kim"}'
npm run cli -- pack invalidate --store data/context-engine.db --pack-id pak_... --reason "superseded" --actor '{"kind":"human","name":"kim"}'

npm run cli -- contract call --operation context.providers.list --request '{}'
npm run cli -- projection handoff --store data/context-engine.db --pack-id pak_... --projection-ref 'game-ui:main'
npm run cli -- projection handoffs --store data/context-engine.db --pack-id pak_...
```

```powershell
# MCP stdio server (docs/MCP.md): tools context.build / context.preview / context.get,
# dual-era (2026-07-28 per-request _meta + legacy initialize), zero dependencies.
# Same provider-registration flags as the CLI.
npm run mcp -- --store data/context-engine.db --project-root .
```

`--project-root <dir>` registers `ProjectFilesProvider` against that
directory. `--repo-map-root <dir>` registers `RepositoryMapContextProvider`
against that directory (typically the same root). `--git-history-root <dir>`
registers `GitHistoryContextProvider` against that directory (must be a git
working tree — see docs/GIT_HISTORY.md). `--current-session` (a boolean
flag, no argument) registers `CurrentSessionContextProvider`, which reads
`sessionContext` off whatever `--request` is passed to a later command.
`--memory-store <path>` (and optional `--memory-cli <path>` to override the
CLI location) registers `MemoryContextProvider` — it defaults to the
sibling `../Memory/src/cli/cli.ts`, overridable via
`LIBRARY_MEMORY_ENGINE_CLI`. `--study-store`/`--study-cli` and
`--performance-store`/`--performance-cli` do the same for
`StudyContextProvider`/`PerformanceContextProvider`, though there is no real
Study or Performance engine to point either at yet (docs/ADAPTERS.md). Omit
any of these to run without that provider. `--store <path>` points every
pack/health command at a specific Context SQLite file; omit it to use
`data/context-engine.db` (gitignored) or the `LIBRARY_CONTEXT_STORE` env
var.

Every command prints machine-readable JSON by default (failures print
`{error:{code,message}}` and exit non-zero). `--format human` renders the
pack/health commands as deterministic plain text instead; error output
stays JSON in both modes.
