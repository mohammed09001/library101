# Auto-Context — Opt-In Gated Mode (Task 25)

Implemented in `src/contracts/autoContext.ts` (the persisted policy shape)
and `src/engine/autoContext.ts` (`getAutoContextPolicy`/
`setAutoContextPolicy`/`runAutoContext`).

## Task Source Requirement

"Implement only suggestion/preview in V1 unless explicit user policy
allows automatic attachment; never silently modify prompts."

## Why a persisted policy, not a per-call flag

A boolean the caller sets on its own `context.autoContext.run` request
would not be a real gate — any agent could just set it to `true` on every
call, which contradicts "opt-in **gated**." `AutoContextPolicy` is instead
a durable, project-scoped row (`auto_context_policies`, migration 3,
`src/engine/store.ts`) checked server-side on every run, regardless of
what the caller claims about itself — the same shape of guarantee Memory
Engine's `ScopeInfo.intakePolicy` already provides for candidate intake
(durable, per-scope, checked server-side). Unlike `intakePolicy`, though,
`AutoContextPolicy` additionally refuses an actor of kind `"agent"` from
ever setting `allowAutomaticAttachment: true` — grounded directly in the
Task Source Requirement's own wording ("**user** policy," not "caller
policy" or "agent policy"), matching the `kind === "agent"`-specific
refusal pattern used by every one of Memory's own forbidden-action call
sites (`records.ts`, `scopes.ts`, `retention.ts`, `policies.ts`,
`contradictions.ts`). Setting it back to `false` (a safety-decreasing-risk
direction) is never gated — any actor, including an agent, can disable
automatic attachment.

`getAutoContextPolicy` returns `null`, never a fabricated default object,
when no row has ever been written for a project — the safest possible
default (suggestion/preview only) and an honest one: nobody actually set
anything, so there is no real `updatedAt`/`updatedBy` to report.

## `runAutoContext` — always suggest, only sometimes attach

Zero duplicated logic: `runAutoContext` (`src/engine/autoContext.ts`)
orchestrates three already-built, already-tested primitives.

1. **Always** calls `selectCandidates` (`src/engine/selector.ts`, Task
   15/16/17) first — the suggestion. Zero `context_packs`/`pack_attachments`
   writes, exactly `context.select`'s own existing behavior.
2. Looks up the request's project's `AutoContextPolicy`.
3. If `null` or `allowAutomaticAttachment !== true`: returns
   `{decision: "suggested", items, excluded, degradedProviders, algorithm}`
   — the selection result, nothing more. No pack, no attachment.
4. Only when explicitly allowed: `buildPack(..., mode: "attach")` (Task
   23's ephemeral pack lifecycle — see docs/PACKS.md) followed by
   `attachPack(...)`, returning `{decision: "attached", ...same fields...,
   pack, attachment}`.

**The automatic-attach path is hardcoded to `mode: "attach"`** — never
caller-choosable, never `"sync"` (permanent). An automated decision must
not unilaterally create permanent state; Task 23's whole point ("session/
task-scoped packs that expire... unless Projection is explicitly
invoked") is close to a perfect semantic fit for exactly this case. A
caller wanting a permanent pack from the same selection already has the
explicit two-step path that requires a deliberate second action:
`context.select` then `context.build` with `mode: "sync"`.

## `AutoContextResult` is a discriminated union — compile-time "never silently"

```ts
type AutoContextResult =
  | { decision: "suggested"; projectKey; items; excluded; degradedProviders; algorithm }
  | { decision: "attached"; projectKey; items; excluded; degradedProviders; algorithm; pack; attachment };
```

A caller cannot access `.pack`/`.attachment` without first narrowing on
`.decision` — the compiler enforces "never silently," not just a
documented convention. Nothing about Context's own return shape can be
misread as delivered content unless the gate genuinely fired that way.

## Observability

`context.autoContext.decided` (`{projectKey, decision, itemCount}` or
`{projectKey, decision, packId, attachmentId}`) fires on **both**
branches — not an exception to this repo's "an event fires when a real
state mutation happened" rule, but the correct application of that rule
to a different subject: the audit record of the gate's own decision
(`engine_events` is written either way, even on the suggest-only branch
where no pack/attachment table is touched). "Never silently modify
prompts" is a claim about disclosure, not only about pack persistence — a
reviewer needs to see "the gate fired and said no" just as much as "the
gate fired and said yes." `context.autoContext.policyUpdated`
(`{projectKey, allowAutomaticAttachment, updatedBy}`) fires unconditionally
on every `setAutoContextPolicy` call — a real mutation always happens.

## Known limitations

- `AutoContextPolicy` is a single mutable row per project, not an
  append-only/versioned history (same posture as Memory's `intakePolicy`)
  — only the most recent `updatedAt`/`updatedBy` is recorded. A full audit
  trail of every policy change is available via `engine_events`
  (`context.autoContext.policyUpdated`), just not as a queryable policy
  history table.
- Context still does not own "prompts" — it has no visibility into what a
  host agent ultimately does with a `"suggested"` result. The guarantee
  this Task provides is scoped to what Context itself controls: it never
  automatically builds or attaches a pack absent an explicit, persisted,
  human-set policy, and its response shape makes that outcome
  structurally distinguishable at compile time.
