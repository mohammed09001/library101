/**
 * Thin `git` subprocess wrapper for the Git History Context Provider
 * (Task 13). Reuses `processRunner.ts`'s spawn-with-timeout core (Anti-
 * Accumulation Rule — the same mechanism `cliContractClient.ts` uses for
 * sibling-engine CLIs), never a shell string: arguments are always passed as
 * an array, so a caller-influenced value can never be reinterpreted as a
 * second command or an option.
 *
 * Unlike `runCliJson`, a non-zero `git` exit is NOT itself thrown as an
 * error here — `git log` on a repository with zero commits legitimately
 * exits 128 with a "does not have any commits yet" message, and `git show`
 * on an unknown revision exits 128 too. Both are real, expected outcomes the
 * provider must interpret (empty history vs. "that commit doesn't exist"),
 * not "git is unavailable." Only a genuine spawn failure (git not installed)
 * or a timeout (hung process) is raised here, uniformly, as
 * `GitUnavailableError`.
 */
import { ProcessSpawnError, ProcessTimeoutError, runProcess, type ProcessResult } from "./processRunner.ts";

export class GitUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "GitUnavailableError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export interface RunGitOptions {
  timeoutMs?: number;
}

/** Run `git <args...>` with `cwd` set to `root`. Never invoked through a shell. */
export async function runGit(root: string, args: string[], options: RunGitOptions = {}): Promise<ProcessResult> {
  try {
    return await runProcess("git", args, { cwd: root, timeoutMs: options.timeoutMs });
  } catch (err) {
    if (err instanceof ProcessTimeoutError) {
      throw new GitUnavailableError(`git timed out: git ${args.join(" ")}`, { cause: err });
    }
    if (err instanceof ProcessSpawnError) {
      throw new GitUnavailableError(`git executable not available: ${err.message}`, { cause: err });
    }
    throw err;
  }
}
