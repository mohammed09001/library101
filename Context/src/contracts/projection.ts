/**
 * Projection handoff types (Task 32 — Integrate Context with Project
 * Projection). Task Source Requirement: "Attach persistent or temporary
 * packs through Projection contracts; Context never writes `.library`
 * files directly."
 *
 * A handoff is Context's PRODUCER-direction cross-engine call: it hands a
 * built pack to the Projection engine through Projection's own versioned
 * CLI contract (subprocess spawn via `src/providers/cliContractClient.ts`,
 * the one cross-engine call mechanism) — strictly BY REFERENCE
 * (packId/packHash/projectKey/mode), never item content, and never a
 * `.library` file write (that format is Projection-owned rendering output;
 * Context has no code path that writes it).
 *
 * The anticipated contract operation is `projection.ingest` with a
 * `{ok, contractVersion, operation, result|error}` response envelope — the
 * same shape every Library engine already speaks (Context's own
 * `ContextResponseEnvelope`, Memory's contract 1.4.0). Like the Study/
 * Performance adapters (docs/ADAPTERS.md), this targets an anticipated
 * contract NOT yet verified against a real sibling: `Project_Projection`
 * is verified empty (zero files) as of this Execution, so delivery is
 * fail-soft and RECORDED — a handoff attempt always yields an explicit
 * `status`, never a silent success and never an unhandled throw.
 */

/** Outcome of one delivery attempt. `unavailable` = Projection's CLI could not be reached (spawn/timeout/non-JSON — `CliUnavailableError`); `failed` = Projection answered with a contract error envelope. */
export type ProjectionHandoffStatus = "delivered" | "unavailable" | "failed";

export interface ProjectionHandoff {
  handoffId: string;
  contractVersion: string;
  packId: string;
  /** Opaque Projection-side target reference (same discipline as `ContextDefinition.boundProjectionRef` — stored, never interpreted by Context). */
  projectionRef: string;
  /** Mirrors the handed-off pack's own mode: `"attach"` (temporary) or `"sync"` (persistent). Derived from the pack, never caller-declared — no drift. */
  mode: "attach" | "sync";
  status: ProjectionHandoffStatus;
  /** Present when `status` is not `"delivered"`: the unavailable/failed reason (and the contract error code, when Projection answered). */
  detail?: string;
  createdAt: string;
}

export interface ProjectionHandoffInput {
  /** Exactly one form: an explicit pack + projection target… */
  packId?: string;
  projectionRef?: string;
  /** …or a projection-bound `ContextDefinition`, whose `currentPackId` + `boundProjectionRef` are resolved automatically (the persistent path). */
  definitionId?: string;
}
