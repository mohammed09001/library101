/**
 * Projection contract client (Task 32) — the producer-direction counterpart
 * of the consumer adapters (Memory/Study/Performance, docs/ADAPTERS.md).
 *
 * Engine Isolation invariants: no shared workspace, no direct import of
 * Projection's internals, no reading its private store — the ONLY call path
 * is spawning Projection's own CLI as a subprocess and parsing its stdout
 * envelope, reusing `src/providers/cliContractClient.ts` (the ONE
 * cross-engine call mechanism; Anti-Accumulation Rule — no second spawn
 * implementation).
 *
 * Context never writes `.library` files: the ingest payload is strictly
 * by-reference identifiers (packId/packHash/projectKey/mode); rendering
 * files are Projection's own output, produced on Projection's side of the
 * contract.
 */
import { resolveSiblingCli } from "../providers/cliContractClient.ts";

/**
 * The anticipated `projection.ingest` operation — `Project_Projection` is
 * verified empty (zero files, not even a placeholder) as of this Execution,
 * so like the Study/Performance adapters this shape is REAL, TESTED code
 * against an UNVERIFIED contract (docs/PROJECTION.md). It will be revised
 * against Projection's actual published contract once one exists.
 */
export const PROJECTION_INGEST_OPERATION = "projection.ingest" as const;

export function defaultProjectionCliPath(): string {
  return (
    process.env["LIBRARY_PROJECTION_CLI"] ??
    resolveSiblingCli("Project_Projection", "src", "cli", "cli.ts")
  );
}

/** Strictly by-reference — carries identity and provenance, never item content. */
export interface ProjectionIngestRequest {
  source: "context-engine";
  sourceContractVersion: string;
  packId: string;
  packHash: string;
  projectKey: string;
  mode: "attach" | "sync";
  itemCount: number;
}

export interface ProjectionCallOptions {
  projectionCliPath?: string;
  /** Projection store path, forwarded as `--store` exactly like the consumer adapters forward Memory's. */
  storePath?: string;
  timeoutMs?: number;
}
