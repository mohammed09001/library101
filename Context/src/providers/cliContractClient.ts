/**
 * Shared CLI-subprocess client for cross-engine adapters (Tasks 8 + 9).
 *
 * There is no shared workspace between Context and any sibling engine
 * (verified in Execution 01/02) — a direct TypeScript import across engine
 * package boundaries is neither possible nor permitted (Engine Isolation
 * Invariants: "never by reading another Engine's private physical store").
 * The only isolation-respecting way to make a LIVE cross-engine call is the
 * one Memory's own docs prescribe: call it "through a registered provider
 * using [the sibling engine's] own versioned contract" — concretely,
 * spawning that engine's own published CLI as a subprocess and parsing its
 * stdout envelope. This module is the ONE mechanism both the Memory and
 * Study adapters use for that (Anti-Accumulation Rule: one owner, not two
 * copies).
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessSpawnError, ProcessTimeoutError, runProcess } from "./processRunner.ts";

/**
 * Raised uniformly for "the sibling engine's CLI could not be reached" —
 * missing file, spawn failure, timeout, or non-JSON output. Not part of the
 * public contract surface: callers (a provider's healthCheck/discover/
 * retrieve) catch this and report themselves unavailable/degraded, never
 * let it escape as an unhandled throw type outside this package.
 */
export class CliUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CliUnavailableError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/**
 * Resolve a path relative to the `library101/` sibling root (e.g.
 * `resolveSiblingCli("Memory", "src", "cli", "cli.ts")` ->
 * `.../library101/Memory/src/cli/cli.ts`). Anchored on THIS module's own
 * file location (`src/providers/cliContractClient.ts`, a fixed, known
 * depth), never the caller's — a caller-relative anchor would silently
 * break for any caller at a different depth (e.g. a test file), which is
 * exactly the bug this fixed during Execution 03's own verification. A
 * local-dev convenience default only — every adapter that uses this also
 * accepts an explicit override (constructor option or env var).
 */
export function resolveSiblingCli(...segments: string[]): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/providers/cliContractClient.ts -> up to this package's root, then up
  // once more to the library101/ sibling root.
  return resolve(here, "..", "..", "..", ...segments);
}

export interface RunCliOptions {
  storePath?: string;
  timeoutMs?: number;
  nodeExecPath?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Spawn `node --experimental-strip-types <cliPath> ...args [--store storePath]`,
 * bounded by a real timeout, and parse stdout as JSON. Throws
 * `CliUnavailableError` uniformly for a missing CLI file, a spawn failure,
 * a timeout, or output that isn't valid JSON — every caller handles "the
 * sibling engine isn't there" one way.
 */
export async function runCliJson(
  cliPath: string,
  args: string[],
  options: RunCliOptions = {},
): Promise<unknown> {
  if (!existsSync(cliPath)) {
    throw new CliUnavailableError(`sibling engine CLI not found at '${cliPath}'`);
  }
  const fullArgs = [
    "--experimental-strip-types",
    cliPath,
    ...args,
    ...(options.storePath !== undefined ? ["--store", options.storePath] : []),
  ];
  const nodeExecPath = options.nodeExecPath ?? process.execPath;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let stdout: string;
  let exitCode: number | null;
  try {
    const result = await runProcess(nodeExecPath, fullArgs, { timeoutMs });
    stdout = result.stdout;
    exitCode = result.exitCode;
  } catch (err) {
    if (err instanceof ProcessTimeoutError) {
      throw new CliUnavailableError(`sibling engine CLI timed out after ${timeoutMs}ms: ${cliPath}`, { cause: err });
    }
    if (err instanceof ProcessSpawnError) {
      throw new CliUnavailableError(`failed to spawn sibling engine CLI '${cliPath}': ${err.message}`, { cause: err });
    }
    throw err;
  }

  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new CliUnavailableError(
      `sibling engine CLI '${cliPath}' returned non-JSON output (exit ${exitCode}): ${stdout.slice(0, 200)}`,
      { cause: err },
    );
  }
}

/** `<cli> contract call --operation <op> --request '<json>'`. */
export async function callContract(
  cliPath: string,
  operation: string,
  request: unknown,
  options: RunCliOptions = {},
): Promise<{ ok: boolean; result?: unknown; error?: { code: string; message: string } }> {
  const raw = await runCliJson(
    cliPath,
    ["contract", "call", "--operation", operation, "--request", JSON.stringify(request)],
    options,
  );
  return raw as { ok: boolean; result?: unknown; error?: { code: string; message: string } };
}

/** `<cli> doctor` — the sibling engine's own health report shape (untyped here; each adapter narrows it). */
export async function callDoctor(cliPath: string, options: RunCliOptions = {}): Promise<unknown> {
  return runCliJson(cliPath, ["doctor"], options);
}
