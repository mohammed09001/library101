/**
 * Projection handoff orchestration (Task 32 — Integrate Context with
 * Project Projection). Task Source Requirement: "Attach persistent or
 * temporary packs through Projection contracts; Context never writes
 * `.library` files directly."
 *
 * Delivery is fail-soft and RECORDED, the same discipline as provider
 * healthCheck (never throws for "sibling unreachable"): every attempt
 * yields an explicit `ProjectionHandoff` row — `delivered` /
 * `unavailable` / `failed` — plus a `context.projection.handoff` audit
 * event. Context's own canonical state (pack rows, attachments) is never
 * gated on Projection's availability: the engine stays fully usable from
 * a terminal with Projection absent (its verified state today — zero
 * files). A retry after a non-delivery is a NEW handoff row (attempts are
 * insert-only history, never rewritten).
 */
import type { ProjectionHandoff, ProjectionHandoffInput, ProjectionHandoffStatus } from "../contracts/projection.ts";
import { NotFoundError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import {
  PROJECTION_INGEST_OPERATION,
  defaultProjectionCliPath,
  type ProjectionIngestRequest,
} from "../projection/projectionContractClient.ts";
import { CliUnavailableError, callContract } from "../providers/cliContractClient.ts";
import { getPack } from "./packs.ts";
import { getDefinitionImpl } from "./definitions.ts";
import { newId } from "./ids.ts";
import type { ContextStore } from "./store.ts";

export interface HandoffToProjectionInput extends ProjectionHandoffInput {
  /** Optional explicit CLI path (tests/fixtures); defaults to the sibling layout or `LIBRARY_PROJECTION_CLI`. */
  projectionCliPath?: string;
  /** Optional Projection store path forwarded as `--store`. */
  projectionStorePath?: string;
  timeoutMs?: number;
}

export interface ProjectionHandoffsFilter {
  packId?: string;
  limit?: number;
}

export interface ProjectionHandoffsResult {
  handoffs: ProjectionHandoff[];
  count: number;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value;
}

/**
 * Resolves the handoff target. Exactly one form:
 *  - `{packId, projectionRef}` — an explicit pack and Projection target;
 *  - `{definitionId}` — a projection-bound `ContextDefinition`; its
 *    `currentPackId` + `boundProjectionRef` are resolved automatically
 *    (the persistent path after `context.definition.sync`).
 * `mode` is derived from the pack itself, never caller-declared.
 */
function resolveTarget(store: ContextStore, input: HandoffToProjectionInput): { packId: string; projectionRef: string; mode: "attach" | "sync" } {
  const hasPackForm = input.packId !== undefined || input.projectionRef !== undefined;
  const hasDefinitionForm = input.definitionId !== undefined;
  if (hasPackForm && hasDefinitionForm) {
    throw new ValidationError("pass either packId+projectionRef or definitionId, not both");
  }
  if (hasDefinitionForm) {
    const definitionId = requireNonEmpty(input.definitionId, "definitionId");
    const definition = getDefinitionImpl(store, definitionId);
    if (definition.currentPackId === null) {
      throw new ValidationError(
        `definition '${definitionId}' has no current pack yet — call context.definition.sync first`,
      );
    }
    if (definition.boundProjectionRef === undefined) {
      throw new ValidationError(
        `definition '${definitionId}' has no boundProjectionRef — the persistent projection path requires a projection-bound definition`,
      );
    }
    const pack = getPack(store, definition.currentPackId);
    return { packId: pack.packId, projectionRef: definition.boundProjectionRef, mode: pack.mode };
  }
  const packId = requireNonEmpty(input.packId, "packId");
  const projectionRef = requireNonEmpty(input.projectionRef, "projectionRef");
  const pack = getPack(store, packId);
  return { packId: pack.packId, projectionRef, mode: pack.mode };
}

/**
 * Attempts delivery of one pack to Projection and records the outcome.
 * Throws ONLY for input problems (unknown pack/definition, missing ref) —
 * never for delivery outcomes, which are always a recorded status.
 */
export async function handoffPackToProjection(
  store: ContextStore,
  input: HandoffToProjectionInput,
): Promise<ProjectionHandoff> {
  const { packId, projectionRef, mode } = resolveTarget(store, input);
  const pack = getPack(store, packId);

  const request: ProjectionIngestRequest = {
    source: "context-engine",
    sourceContractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    packId: pack.packId,
    packHash: pack.packHash,
    projectKey: pack.projectKey,
    mode: pack.mode,
    itemCount: pack.items.length,
  };

  let status: ProjectionHandoffStatus;
  let detail: string | undefined;
  try {
    const envelope = await callContract(
      input.projectionCliPath ?? defaultProjectionCliPath(),
      PROJECTION_INGEST_OPERATION,
      request,
      { storePath: input.projectionStorePath, ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}) },
    );
    if (!envelope.ok) {
      status = "failed";
      detail = `Projection rejected the ingest: ${envelope.error?.code ?? "UNKNOWN"}: ${envelope.error?.message ?? "no message"}`;
    } else {
      status = "delivered";
    }
  } catch (err) {
    if (err instanceof CliUnavailableError) {
      status = "unavailable";
      detail = err.message;
    } else {
      status = "failed";
      detail = err instanceof Error ? err.message : String(err);
    }
  }

  const handoff: ProjectionHandoff = {
    handoffId: newId("prj"),
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    packId,
    projectionRef,
    mode,
    status,
    createdAt: new Date().toISOString(),
  };
  if (detail !== undefined) handoff.detail = detail;

  store.insertProjectionHandoff(handoff);
  store.appendEvent("context.projection.handoff", {
    handoffId: handoff.handoffId,
    packId,
    projectionRef,
    mode,
    status,
  });
  return handoff;
}

/** Task 32: bounded, newest-first handoff listing (observability/recovery — what was attempted, what must be retried). */
export function listProjectionHandoffs(
  store: ContextStore,
  filter: ProjectionHandoffsFilter = {},
): ProjectionHandoffsResult {
  const limit = filter.limit ?? 50;
  const handoffs = store.listProjectionHandoffs(filter.packId, limit);
  return { handoffs, count: handoffs.length };
}
