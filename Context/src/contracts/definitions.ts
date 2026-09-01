/**
 * ContextDefinition schema (Task 24 — Persistent Sync mode).
 *
 * A definition is a persisted, reusable pack-building RECIPE — distinct
 * from a `ContextPack`, which is an immutable snapshot of one build.
 * `ContextPack.packHash` already proves reproducibility for a single build;
 * a definition is the stable identity that survives ACROSS repeated builds
 * of "the same" recipe over time, bound to whichever pack most recently
 * regenerated from it (`currentPackId`). Create-only: the recipe fields
 * (`request`/`items`/`rankingVersion`/`creationReason`) are never edited
 * after creation (docs/BOUNDARY.md, "Explicitly NOT yet implemented") —
 * create a new definition instead. `syncDefinition` (src/engine/definitions.ts)
 * is the only mechanism that advances `currentPackId`/`lastSyncedAt`/
 * `lastSyncOutcome`.
 *
 * `boundProjectionRef` is an opaque, caller-supplied reference to a project
 * projection — Context stores it but never interprets or calls it.
 * `Project_Projection` does not exist yet (verified empty sibling
 * directory, docs/BOUNDARY.md); this is a structurally-present but
 * unverified integration point, the same honest posture already taken for
 * the anticipated Study/Performance adapter contracts (docs/ADAPTERS.md).
 */
import type { AgentIdentity, ContextRequest } from "./types.ts";
import type { BuildPackItemInput } from "./packs.ts";

export interface ContextDefinition {
  definitionId: string;
  contractVersion: string;
  /** Derived from `request.project.projectKey` at creation — never separately caller-supplied (avoids drift). */
  projectKey: string;
  name?: string;
  request: ContextRequest;
  items: BuildPackItemInput[];
  rankingVersion: string;
  creationReason: string;
  boundProjectionRef?: string;
  /** The pack most recently produced by `syncDefinition`; null until the first sync. */
  currentPackId: string | null;
  createdAt: string;
  createdBy: AgentIdentity;
  lastSyncedAt: string | null;
  /** `"created"` when the last sync produced a new pack (source content changed), `"unchanged"` when it reused the existing one; null before any sync. */
  lastSyncOutcome: "created" | "unchanged" | null;
}
