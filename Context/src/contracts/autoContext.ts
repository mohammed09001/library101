/**
 * AutoContextPolicy schema (Task 25 — Define Auto-Context as opt-in gated
 * mode).
 *
 * The Task Source Requirement: "Implement only suggestion/preview in V1
 * unless explicit user policy allows automatic attachment; never silently
 * modify prompts." A caller-supplied flag on its own per-call request
 * would not be a real gate — any caller could just set it. `AutoContextPolicy`
 * is instead a PERSISTED, project-scoped, server-checked policy (mirrors
 * Memory Engine's `ScopeInfo.intakePolicy` — durable, per-scope, checked
 * regardless of what an individual caller claims about itself), set only
 * via `context.autoContext.setPolicy` (`src/engine/autoContext.ts`), which
 * refuses an actor of kind `"agent"` from ever setting
 * `allowAutomaticAttachment: true` (the "user" in "user policy") — setting
 * it back to `false` is never gated.
 *
 * A single mutable row per project, not an append-only/versioned history
 * (same posture as `intakePolicy`) — `updatedAt`/`updatedBy` record only
 * the most recent change.
 */
import type { AgentIdentity } from "./types.ts";

export interface AutoContextPolicy {
  projectKey: string;
  contractVersion: string;
  /** Default posture (no row ever written) is `false` — suggestion/preview only, per the Task Source Requirement's V1 default. */
  allowAutomaticAttachment: boolean;
  updatedAt: string;
  updatedBy: AgentIdentity;
}
