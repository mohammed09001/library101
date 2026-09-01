# MCP Tool Surface (Task 30, Execution 12)

`src/mcp/server.ts` — a zero-dependency, dual-era MCP **stdio server**
exposing the three Context operations Task 30 names as tools:

| Tool | Forwards to | Returns |
|---|---|---|
| `context.build` | `context.build` | `{pack}` — persists an immutable pack; `pack.packId` is the explicit handle |
| `context.preview` | `context.preview` | `{pack, persisted: false}` — pure computation; its `packId` is NOT a live handle |
| `context.get` | `context.get` | `{pack}` — fetch by the explicit `packId` handle |

Tool names reuse the operation vocabulary verbatim (dots are valid MCP
tool-name characters per the 2026-07-28 spec). The MCP layer owns ONLY
protocol framing: every call becomes a versioned `dispatch()` envelope, so
validation, privacy, budget, dedup, events and error codes have exactly one
owner (the engine).

## Run it

```powershell
npm run mcp -- --store data/context-engine.db --project-root .
```

It accepts the same provider-registration flags as the CLI
(`--project-root`, `--repo-map-root`, `--git-history-root`, `--current-session`,
`--memory-store`, `--study-store`, `--performance-store`, `--store`)
through the shared `src/cli/engineFactory.ts` — one owner for process
wiring, never two parallel paths.

## Research note (mandatory external reference: modelcontextprotocol)

Inspected the official specification at modelcontextprotocol.io — revision
**2026-07-28** (`/specification/2026-07-28/basic/lifecycle`,
`.../basic/transports/stdio`, `.../server/tools`, `.../server/discover`) —
plus the 2025-06-18 tools/stdio pages for the legacy line, on 2026-08-31.

| Upstream element | Decision | Why |
|---|---|---|
| Modern 2026-07-28 era: per-request `_meta["io.modelcontextprotocol/protocolVersion"]`, `server/discover`, `UnsupportedProtocolVersionError` (-32022 with `data.supported`) | **INTEGRATE** | This is the current protocol line; the server answers all three and refuses unknown versions with the exact error shape. |
| Legacy `initialize` handshake (≤2025-11-25 revisions) with legacy result shapes | **INTEGRATE** (dual-era server) | The 2026-07-28 lifecycle page defines exactly this compatibility model: modern `_meta` ⇒ modern semantics; `initialize` ⇒ legacy semantics for the process scope. Most deployed MCP clients still speak the handshake. |
| `@modelcontextprotocol/typescript-sdk` dependency | **REJECTED** | The repo's invariant is **zero runtime dependencies**; the required surface is a bounded JSON-RPC-over-stdio loop (~250 lines) plus three tool schemas. The SDK (MIT) would add a dependency tree for framing this server already owns. Protocol implemented from the spec text itself. |
| Tool names with dots (`context.build`) | **INTEGRATE** | Spec: letters/digits/underscore/hyphen/dot are the allowed characters; `admin.tools.list` is the spec's own example. Keeping operation vocabulary = tool name removes a translation layer. |
| "Stateful tools" guidance: return an explicit handle from a creation tool; accept it as an argument on later calls; no protocol-level session | **INTEGRATE** — it IS the Task Source Requirement's "explicit state handles rather than transport-hidden assumptions" | `context.build` returns `pack.packId`; `context.get` requires it as an argument. `test/t30_mcp_server.test.ts` proves the handle works across two completely separate server processes. |
| `tools/call` error taxonomy: unknown tool = protocol error (-32602); business/input failures = execution errors (`isError: true`) | **INTEGRATE** | `CONTEXT_NOT_FOUND`/`CONTEXT_VALIDATION_FAILED`/etc. surface as execution errors carrying the typed code in the text — the model can react without string-matching JSON-RPC codes. |
| `resultType: "complete"` wrappers (2026-07-28) vs bare legacy results | **INTEGRATE** (both shapes, era-selected) | Modern `tools/list`/`tools/call` results carry `resultType`; legacy ones do not. |
| Streamable HTTP transport, auth helpers, tasks/extensions, `InputRequiredResult` | **DEFER** | Task 30 names the stdio/host-native tool surface; HTTP+auth is a separate host concern and nothing in this Execution's requirement needs server-to-client requests. |

stdio discipline (both eras): newline-delimited JSON-RPC 2.0, nothing that
is not a valid MCP message on stdout, logging on stderr only, exit when
stdin closes — and never before every accepted request has been answered
(`main()` drains in-flight handlers first). Requests are answered strictly
in arrival order (responses correlate by id either way; a bounded local
tool server gains nothing from interleaving).

## State, handles, and failure

- **No session state.** The server keeps no per-connection state beyond
  "a legacy `initialize` was seen"; every tool call is stateless through
  the dispatcher. A pack is fetched by its explicit `packId` — proven from
  a second, independent server process against the same store.
- **Degraded providers fail soft.** If a registered provider is down, the
  build/preview still returns (the affected item is excluded, reason
  `provider_unavailable`) — the same engine behavior the CLI exposes,
  unchanged by the MCP adapter.
- **Negative paths:** unknown tool → -32602; unknown method → -32601;
  malformed JSON → -32700 (id null); unsupported modern version → -32022
  with the supported list; unknown `packId` → execution error
  `isError: true`, `CONTEXT_NOT_FOUND: …`.
