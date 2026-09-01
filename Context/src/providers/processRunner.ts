/**
 * Generic spawn-with-timeout process runner. Extracted from
 * `cliContractClient.ts` (Tasks 8/9) so `gitProcess.ts` (Task 13) does not
 * duplicate the same spawn/timeout/buffering logic (Anti-Accumulation Rule)
 * — one owner for "run an external process, bounded by a real timeout, and
 * capture its stdout/stderr/exit code," used by both the sibling-engine CLI
 * adapters (which additionally JSON-parse stdout) and the local `git`
 * subprocess wrapper (which does not — git's output is plain text).
 */
import { spawn } from "node:child_process";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/** The process could not be spawned at all (missing executable, permission denied, ...). */
export class ProcessSpawnError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ProcessSpawnError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/** The process was killed because it exceeded its bound. */
export class ProcessTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessTimeoutError";
  }
}

export interface RunProcessOptions {
  cwd?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Spawn `command args...` (never through a shell — arguments are passed as
 * an array, never concatenated into a shell string, so a caller-supplied
 * argument can never be reinterpreted as an option or a second command),
 * bounded by a real timeout that kills a hung child. Resolves with
 * stdout/stderr/exitCode regardless of exit code — a non-zero exit is not
 * itself an error at this layer (callers, e.g. Memory's CLI or `git log` on
 * an empty repo, may legitimately exit non-zero for a non-failure state);
 * only a genuine spawn failure or timeout rejects.
 */
export async function runProcess(
  command: string,
  args: string[],
  options: RunProcessOptions = {},
): Promise<ProcessResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise<ProcessResult>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
    });
    let stdoutBuf = "";
    let stderrBuf = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(
        new ProcessTimeoutError(`process timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`),
      );
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      rejectPromise(new ProcessSpawnError(`failed to spawn '${command}': ${err.message}`, { cause: err }));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ stdout: stdoutBuf, stderr: stderrBuf, exitCode: code });
    });
  });
}
