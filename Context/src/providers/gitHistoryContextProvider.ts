/**
 * Git History Context Provider (Task 13): exposes relevant commits/diffs/
 * paths through bounded queries — never the whole history.
 *
 * Uses the local `git` executable directly (spawned via `gitProcess.ts`,
 * never through a shell), not an npm dependency: re-implementing git's
 * object/packfile format ourselves would duplicate git itself and be far
 * more failure-prone (Repository-First Rule: prefer the existing canonical
 * tool over a reimplementation). This keeps the repository's zero-npm-
 * runtime-dependency discipline intact — `git` is an environment tool, the
 * same category as the `node:sqlite` built-in Task 5 already relies on, not
 * a package dependency.
 *
 * "Bounded queries rather than whole history": `discover()` runs
 * `git log -n <maxCommits>` (never unbounded `git log`), optionally widened
 * by a handful of `--grep` passes over `taskText` tokens for relevance,
 * still capped at `maxCommits` total. `retrieve()` runs `git show` for
 * exactly the caller-selected commit and truncates the patch at
 * `maxPatchBytes` — a single huge commit can never return an unbounded
 * payload.
 *
 * Security: a commit ref is untrusted input at this provider's boundary
 * (Preservation and Safety: "treat repository content ... as untrusted
 * data"). `retrieve()` rejects any ref that doesn't match `^[0-9a-f]{7,40}$`
 * before it ever reaches a `git` argv — a validated hex-only string cannot
 * begin with `-`, so it structurally cannot be reinterpreted as a git
 * option, independent of argv-array spawning already ruling out shell
 * injection.
 */
import { resolve } from "node:path";
import type {
  ContextCandidate,
  ContextCandidateRef,
  ContextProvider,
  ProviderDeclaration,
  ProviderHealth,
} from "../contracts/providers.ts";
import type { ContextRequest } from "../contracts/types.ts";
import { ValidationError } from "../contracts/errors.ts";
import { GitUnavailableError, runGit } from "./gitProcess.ts";

export interface GitHistoryContextProviderOptions {
  root: string;
  /** Cap on commits returned by discover(). */
  maxCommits?: number;
  /** Cap on a single retrieve()'d commit's rendered patch, in characters. */
  maxPatchBytes?: number;
  /** Restrict every query to these paths (`git log -- <path>...`). */
  pathFilter?: string[];
  timeoutMs?: number;
}

const DEFAULTS = {
  maxCommits: 20,
  maxPatchBytes: 20_000,
};

const SHA_RE = /^[0-9a-f]{7,40}$/;
const FIELD_SEP = "\x1f";
const PRETTY = `%H${FIELD_SEP}%s${FIELD_SEP}%aI${FIELD_SEP}%an`;

interface LogEntry {
  sha: string;
  subject: string;
  date: string;
  author: string;
}

function parseLogLines(stdout: string): LogEntry[] {
  const out: LogEntry[] = [];
  for (const line of stdout.split("\n")) {
    if (line.length === 0) continue;
    const parts = line.split(FIELD_SEP);
    const [sha, subject, date, author] = parts;
    if (sha === undefined || subject === undefined || date === undefined || author === undefined) continue;
    out.push({ sha, subject, date, author });
  }
  return out;
}

/** Recognized "there is genuinely no matching history" states — not a failure. */
function isEmptyHistory(stderr: string): boolean {
  return (
    /does not have any commits yet/i.test(stderr) ||
    /bad default revision 'HEAD'/i.test(stderr) ||
    /unknown revision or path not in the working tree/i.test(stderr)
  );
}

/** Up to 3 distinct, longest-first lowercase tokens (len >= 3) from taskText — same discipline as normalizeCandidate.ts's textMatchScore tokenizer. */
function taskTokens(taskText: string): string[] {
  const set = new Set((taskText.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []) as string[]);
  return [...set].sort((a, b) => b.length - a.length).slice(0, 3);
}

export class GitHistoryContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly root: string;
  private readonly maxCommits: number;
  private readonly maxPatchBytes: number;
  private readonly pathFilter?: string[];
  private readonly timeoutMs?: number;

  constructor(options: GitHistoryContextProviderOptions) {
    this.root = resolve(options.root);
    this.maxCommits = options.maxCommits ?? DEFAULTS.maxCommits;
    this.maxPatchBytes = options.maxPatchBytes ?? DEFAULTS.maxPatchBytes;
    this.pathFilter = options.pathFilter;
    this.timeoutMs = options.timeoutMs;
    this.declaration = {
      id: "git_history",
      displayName: "Git History",
      description: "Bounded queries over commits, diffs, and paths — never the whole history.",
      capabilities: ["git_history"],
      cost: { relativeCost: "low", network: false },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    };
  }

  private pathArgs(): string[] {
    return this.pathFilter && this.pathFilter.length > 0 ? ["--", ...this.pathFilter] : [];
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const commits = new Map<string, LogEntry>();

    const recent = await runGit(
      this.root,
      ["log", "-n", String(this.maxCommits), `--pretty=format:${PRETTY}`, ...this.pathArgs()],
      { timeoutMs: this.timeoutMs },
    );
    if (recent.exitCode === 0) {
      for (const c of parseLogLines(recent.stdout)) commits.set(c.sha, c);
    } else if (!isEmptyHistory(recent.stderr)) {
      throw new Error(`git log failed (exit ${recent.exitCode}): ${recent.stderr.trim().slice(0, 300)}`);
    }

    // Relevance widening gets its own budget, independent of how much the
    // recency pass already used — otherwise a full recency page (the common
    // case) would starve every grep pass before it runs even once. Still
    // fully bounded: at most maxCommits (recency) + maxCommits (widening).
    let widened = 0;
    for (const token of taskTokens(request.taskText)) {
      if (widened >= this.maxCommits) break;
      const grepped = await runGit(
        this.root,
        ["log", "-i", `--grep=${token}`, "-n", String(this.maxCommits), `--pretty=format:${PRETTY}`, ...this.pathArgs()],
        { timeoutMs: this.timeoutMs },
      );
      if (grepped.exitCode !== 0) continue; // no match / empty history — not an error, just nothing to add
      for (const c of parseLogLines(grepped.stdout)) {
        if (widened >= this.maxCommits) break;
        if (commits.has(c.sha)) continue;
        commits.set(c.sha, c);
        widened++;
      }
    }

    return [...commits.values()].map((c) => ({
      providerId: this.declaration.id,
      ref: c.sha,
      title: c.subject.length > 0 ? c.subject.slice(0, 200) : c.sha,
      estimatedTokens: Math.ceil((c.subject.length + 80) / 4),
    }));
  }

  async retrieve(_request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    for (const ref of refs) {
      if (!SHA_RE.test(ref.ref)) {
        throw new ValidationError(`ref '${ref.ref}' is not a valid commit sha`);
      }
      const result = await runGit(this.root, ["show", "--stat", "-p", "--pretty=fuller", ref.ref], {
        timeoutMs: this.timeoutMs,
      });
      if (result.exitCode !== 0) {
        throw new Error(`git show failed for '${ref.ref}' (exit ${result.exitCode}): ${result.stderr.trim().slice(0, 300)}`);
      }
      let content = result.stdout;
      let truncated = false;
      if (content.length > this.maxPatchBytes) {
        content = `${content.slice(0, this.maxPatchBytes)}\n... (truncated at ${this.maxPatchBytes} characters)`;
        truncated = true;
      }
      out.push({
        providerId: this.declaration.id,
        ref: ref.ref,
        title: ref.title,
        estimatedTokens: Math.ceil(content.length / 4),
        content,
        retrievedAt: new Date().toISOString(),
        sourceMetadata: { sha: ref.ref, truncated },
      });
    }
    return out;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const version = await runGit(this.root, ["--version"], { timeoutMs: this.timeoutMs });
      if (version.exitCode !== 0) {
        return { available: false, degraded: true, message: "git executable reported a non-zero exit for --version" };
      }
      const inside = await runGit(this.root, ["rev-parse", "--is-inside-work-tree"], { timeoutMs: this.timeoutMs });
      if (inside.exitCode !== 0 || inside.stdout.trim() !== "true") {
        return { available: false, degraded: true, message: `'${this.root}' is not inside a git working tree` };
      }
      return { available: true, degraded: false };
    } catch (err) {
      const message =
        err instanceof GitUnavailableError ? err.message : err instanceof Error ? err.message : String(err);
      return { available: false, degraded: true, message };
    }
  }
}
