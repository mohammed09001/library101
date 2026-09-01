/**
 * Versioned Context inter-engine contracts.
 *
 * Sibling engines, agents, and tool surfaces call Context ONLY through these
 * named operations via the envelope dispatcher (`src/engine/dispatcher.ts`)
 * or the CLI. Versioning policy: the envelope carries contractVersion.
 * Callers are accepted while the MAJOR matches; additive changes bump minor,
 * breaking changes bump major and reject old callers with
 * CONTEXT_CONTRACT_MISMATCH.
 */

export const CONTEXT_OPERATIONS = [
  "context.request.validate",
  "context.providers.list",
  "context.providers.discover",
  "context.select",
  "context.build",
  "context.preview",
  "context.attach",
  // Task 29 (Execution 12): attachment detach + pack listing.
  "context.detach",
  "context.list",
  "context.get",
  "context.explain",
  "context.invalidate",
  "context.health",
  // Task 23 (Execution 09): Temporary Attach mode.
  "context.sweep",
  "context.promote",
  // Task 24 (Execution 09): Persistent Sync mode.
  "context.definition.create",
  "context.definition.get",
  "context.definition.sync",
  // Task 25 (Execution 10): Auto-Context as opt-in gated mode.
  "context.autoContext.run",
  "context.autoContext.getPolicy",
  "context.autoContext.setPolicy",
  // Tasks 26/27/28 (Execution 11): hashing/cache keys, precise invalidation, reproducibility/replay.
  "context.getByHash",
  "context.invalidateAffected",
  "context.replay",
  // Task 32 (Execution 13/14): producer-direction Projection handoff (by reference; never .library writes).
  "context.projection.handoff",
  "context.projection.listHandoffs",
] as const;

export type ContextOperation = (typeof CONTEXT_OPERATIONS)[number];

/** Versioned request envelope — the ONLY way in. */
export interface ContextRequestEnvelope {
  contractVersion: string;
  operation: ContextOperation;
  request: unknown;
}

export type ContextResponseEnvelope =
  | {
      ok: true;
      contractVersion: string;
      operation: ContextOperation;
      result: unknown;
    }
  | {
      ok: false;
      contractVersion: string;
      operation: ContextOperation | null;
      error: { code: string; message: string };
    };

export function isContextOperation(value: unknown): value is ContextOperation {
  return (
    typeof value === "string" &&
    (CONTEXT_OPERATIONS as readonly string[]).includes(value)
  );
}
