/**
 * Reference ContextProvider implementation (Task 3 proof of the contract):
 * reads the local filesystem tree under a bounded root. Backend-only, no
 * network, no dependency on any sibling engine — safe to build and test now,
 * unlike Memory/Study/Performance adapters which would require live
 * inter-engine calls out of scope for this Execution.
 *
 * Adapted from continuedev/continue's FileTreeContextProvider /
 * CurrentFileContextProvider pattern (discover = enumerate the tree,
 * retrieve = read selected file bodies).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type {
  ContextCandidate,
  ContextCandidateRef,
  ContextProvider,
  ProviderDeclaration,
  ProviderHealth,
} from "../contracts/providers.ts";
import type { ContextRequest } from "../contracts/types.ts";
import { ValidationError } from "../contracts/errors.ts";
import { resolveWithinRoot } from "./fsPathGuard.ts";
import { loadGitignoreMatcher, type GitignoreMatcher } from "./gitignoreMatcher.ts";

export interface ProjectFilesProviderOptions {
  root: string;
  maxDepth?: number;
  maxFileBytes?: number;
  maxFiles?: number;
  /** File extensions to include, e.g. [".ts", ".md"]. Undefined = all files. */
  extensions?: string[];
  /**
   * Honor the root's `.gitignore` (Task 12: "ignore ... rules"). Defaults to
   * true; disable only for a caller that deliberately wants the raw tree.
   */
  respectGitignore?: boolean;
}

const DEFAULTS = {
  maxDepth: 8,
  maxFileBytes: 262144,
  maxFiles: 2000,
};

/**
 * Always-ignored regardless of `.gitignore` content or presence — a safety
 * net, not a substitute for it (a repo's own `.gitignore` may not list these
 * explicitly, e.g. a fresh clone before `npm install`).
 */
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "data"]);

export class ProjectFilesProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly root: string;
  private readonly maxDepth: number;
  private readonly maxFileBytes: number;
  private readonly maxFiles: number;
  private readonly extensions?: string[];
  private readonly gitignore: GitignoreMatcher;

  constructor(options: ProjectFilesProviderOptions) {
    this.root = resolve(options.root);
    this.maxDepth = options.maxDepth ?? DEFAULTS.maxDepth;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULTS.maxFileBytes;
    this.maxFiles = options.maxFiles ?? DEFAULTS.maxFiles;
    this.extensions = options.extensions;
    this.gitignore =
      options.respectGitignore === false
        ? { isIgnored: () => false }
        : loadGitignoreMatcher(this.root);
    this.declaration = {
      id: "project_files",
      displayName: "Project Files",
      description: "Local filesystem tree under a bounded project root.",
      capabilities: ["file_content"],
      cost: { relativeCost: "low", network: false },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      // 1.1.0 (Task 12, additive/behavioral): honors the root's .gitignore
      // in addition to the always-ignored directory set.
      version: "1.1.0",
    };
  }

  private matchesExtension(name: string): boolean {
    if (!this.extensions || this.extensions.length === 0) return true;
    return this.extensions.some((ext) => name.endsWith(ext));
  }

  private async walk(dir: string, depth: number, out: string[]): Promise<void> {
    if (depth > this.maxDepth || out.length >= this.maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: skip, do not fail the whole walk
    }
    for (const entry of entries) {
      if (out.length >= this.maxFiles) return;
      const abs = join(dir, entry.name);
      const rel = relative(this.root, abs).split(sep).join("/");
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (this.gitignore.isIgnored(rel, true)) continue;
        await this.walk(abs, depth + 1, out);
      } else if (entry.isFile() && this.matchesExtension(entry.name)) {
        if (this.gitignore.isIgnored(rel, false)) continue;
        out.push(abs);
      }
    }
  }

  async discover(_request: ContextRequest): Promise<ContextCandidateRef[]> {
    const absolutePaths: string[] = [];
    await this.walk(this.root, 0, absolutePaths);
    const refs: ContextCandidateRef[] = [];
    for (const abs of absolutePaths) {
      const rel = relative(this.root, abs).split(sep).join("/");
      let size = 0;
      try {
        size = (await stat(abs)).size;
      } catch {
        continue;
      }
      refs.push({
        providerId: this.declaration.id,
        ref: rel,
        title: rel,
        estimatedTokens: Math.ceil(size / 4),
      });
    }
    return refs;
  }

  async retrieve(_request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    for (const ref of refs) {
      const abs = resolveWithinRoot(this.root, ref.ref);
      const info = await stat(abs);
      if (!info.isFile()) {
        throw new ValidationError(`ref '${ref.ref}' does not resolve to a file`);
      }
      if (info.size > this.maxFileBytes) {
        throw new ValidationError(
          `ref '${ref.ref}' exceeds maxFileBytes (${info.size} > ${this.maxFileBytes})`,
        );
      }
      const content = await readFile(abs, "utf8");
      out.push({
        providerId: this.declaration.id,
        ref: ref.ref,
        title: ref.title,
        estimatedTokens: Math.ceil(content.length / 4),
        content,
        retrievedAt: new Date().toISOString(),
      });
    }
    return out;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      await stat(this.root);
      return { available: true, degraded: false };
    } catch (err) {
      return {
        available: false,
        degraded: true,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
