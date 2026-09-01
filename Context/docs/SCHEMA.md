# ContextRequest — Task Intent Schema (Task 2)

Implemented in `src/contracts/types.ts` (shape) and `src/engine/normalize.ts`
(`validateContextRequest`, the only supported way to turn caller input into a
trusted `ContextRequest`). Every field below is enforced at validation time;
unknown top-level and nested fields are rejected outright.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `requestId` | `string` | no | Caller-supplied tracing/idempotency id. The engine never invents one. |
| `contractVersion` | `string` | yes | Caller's contract major must match `CONTEXT_ENGINE_CONTRACT_VERSION`'s major when used through `dispatch()`; `validateContextRequest` itself only checks it's a non-empty string ≤32 chars. |
| `project.projectKey` | `string` | yes | Stable slug matching `[\w][\w.-]*` — never a filesystem path (same discipline as Memory's `projectKey`). |
| `taskText` | `string` | yes | Free text describing the task, ≤65536 chars. |
| `hostAgent` | `AgentIdentity` | yes | The surface the caller is running in. `{kind: human\|agent\|engine\|tool, name, agentType?}`. |
| `workerAgent` | `AgentIdentity` | no | The bounded worker Context is assembling material for, when different from `hostAgent`. |
| `mode` | `TaskMode` | yes | One of `chat`, `edit`, `agent`, `review`, `plan`, `search`. A new mode is an additive (minor) contract change. |
| `budget.maxTokens` | `number` | yes | Must be a positive finite number. |
| `budget.maxBytes` | `number` | no | Must be a positive finite number when present. Enforced as an INDEPENDENT hard ceiling alongside `maxTokens` since Execution 07 (Task 19) — see docs/PACKS.md. |
| `budget.reservedFramingTokens` | `number` | no | Non-negative. Reserved off the top of `maxTokens` for the caller's own surrounding prompt/system framing (Task 19, contract 1.5.0, additive) — item budgeting operates against `maxTokens - reservedFramingTokens`. |
| `allowedProviders` | `ProviderId[]` | no | Gates **whole providers**: only these may be consulted. Omit to allow all registered providers. |
| `forbiddenProviders` | `ProviderId[]` | no | Gates whole providers: these are never consulted. An id in both `allowedProviders` and `forbiddenProviders` fails validation. |
| `requiredSources` | `ProviderId[]` | no | Gates specific references **within** an allowed provider (e.g. a specific file path or Memory scope key) — finer-grained than `allowedProviders`. Enforced since Execution 06 (Task 15) as a ranking-priority pin by `context.select`, and since Execution 07 (Task 20) as a genuine budget-priority guarantee by `computePack()` — subordinate to privacy and hard size limits, never overriding either (docs/PACKS.md). |
| `forbiddenSources` | `ProviderId[]` | no | Same granularity as `requiredSources`, in the negative direction. An id in both `requiredSources` and `forbiddenSources` fails validation. |
| `freshness.maxAgeSeconds` | `number` | no | Non-negative. |
| `freshness.asOf` | `string` (ISO 8601) | no | Historical query point, mirroring sibling engines' bi-temporal `asOf`. |
| `privacyPolicy.maxPrivacyClass` | `"public"\|"internal"\|"sensitive"` | yes | Ceiling on returned material. There is no `"secret"` tier — same discipline as Memory: secret-class material never flows through Context. |
| `privacyPolicy.forbiddenTags` | `string[]` | no | ≤32 entries, ≤64 chars each. |
| `callerCapabilities.actorKind` | `human\|agent\|engine\|tool` | yes | |
| `callerCapabilities.agentType` | `string` | no | |
| `callerCapabilities.canWrite` | `boolean` | no | True when the caller may request context that could drive writes. |
| `createdAt` | `string` (ISO 8601) | yes | |
| `sessionContext` | `SessionContext` | no | Host-provided current file/selection/task/session metadata (Task 14, contract 1.3.0, additive). See below. |
| `contentFieldPolicies` | `SourceFieldPolicy[]` | no | Task 33 (contract 1.13.0, additive): source-specific field policies — deterministic redaction applied per provider BEFORE candidate normalization and re-verified at pack finalization (docs/SCHEMA.md below, `src/engine/contentPolicy.ts`). |

## `contentFieldPolicies` (Task 33)

One policy per provider (duplicate `providerId`s are rejected). Applied at
two seams by `src/engine/contentPolicy.ts`: BEFORE normalization (so
`contentHash`, dedup keys, ranking signals, and budget accounting all see
the filtered material) and re-verified at pack finalization — material
that would still be redactable at that seam is excluded
(`privacy_violation`), never serialized. Included pack items carry a
`redactionCount` when redactions occurred (docs/PACKS.md).

| Field | Type | Notes |
|---|---|---|
| `contentFieldPolicies[].providerId` | `string` (≤128) | The source this policy scopes to. |
| `.redactedFields` | `string[]` (≤16, each ≤128 chars) | Dotted paths: `title` or `sourceMetadata.<path...>` — replaced with `[redacted]`. `content` itself is pattern-redacted, never dropped. |
| `.redactPatterns` | `string[]` (≤16, each ≤256 chars) | Case-sensitive regexes; every match in `content` becomes `[redacted]`. Compiled at validation — an uncompilable pattern (or one matching the empty string) is a `CONTEXT_VALIDATION_FAILED` at the boundary, never a runtime surprise. |

Redaction is deterministic and idempotent; because the excerpt is hashed
AFTER filtering, content-addressed identity (`packHash`/`contentHash`)
reflects exactly the material that may be surfaced.

## `sessionContext` (Task 14)

The one channel host-side ambient state (what file/selection the host is
currently looking at) can enter Context through — Context is backend/
terminal-first, not IDE-resident, so it has no other way to observe this.
Every field is optional and the whole object is optional; **absence must
not break Context** — `CurrentSessionContextProvider` returns an empty
`discover()` result, never an error, when it's missing.

| Field | Type | Notes |
|---|---|---|
| `sessionContext.currentFile.path` | `string` (≤4096 chars) | |
| `sessionContext.currentFile.language` | `string` (≤64 chars) | no |
| `sessionContext.selection.path` | `string` (≤4096 chars) | |
| `sessionContext.selection.startLine` / `.endLine` | non-negative integers, `endLine >= startLine` | |
| `sessionContext.selection.text` | `string` (≤8192 chars) | no — only when the host is willing to share the selected text verbatim |
| `sessionContext.taskDescription` | `string` (≤4096 chars) | Host-local free text, distinct from `taskText` (the caller's ask *to* Context) |
| `sessionContext.sessionId` | `string` (≤128 chars) | no |

## Why two provider-scoping pairs

`allowedProviders`/`forbiddenProviders` and `requiredSources`/
`forbiddenSources` look similar but operate at different granularity:

- **Provider-level** (`allowedProviders`/`forbiddenProviders`): "consult
  `git_history` at all, yes/no." Enforced today by
  `ProviderRegistry.discoverAll()`.
- **Reference-level** (`requiredSources`/`forbiddenSources`): "within
  whichever providers run, this specific reference must/must not appear" —
  e.g. "must include memory scope `library101`" or "never include file
  `secrets.env`." Enforced by `context.select` (Execution 06) and
  `computePack()` (Execution 07): `forbiddenSources` refs are never even
  retrieved; `requiredSources` refs get ranking priority and a genuine
  budget-priority guarantee — see docs/PACKS.md and docs/RELEVANCE.md.

## Known ProviderId values

`ProviderId` is an open string type, not a closed enum — a new provider must
never require a breaking contract change. `KNOWN_PROVIDER_IDS`
(`src/contracts/types.ts`) documents the recommended set:
`memory`, `study_document`, `study_lineage_versioning`, `performance`,
`repository_search`, `repository_sync`, `project_files`, `git_history`.
Only `project_files` has a real implementation in this Execution
(`ProjectFilesProvider`).

## Failure behavior

Every violation above throws `ValidationError` (`CONTEXT_VALIDATION_FAILED`)
from `validateContextRequest`. The function never mutates its input and
never returns a partially-valid request.
