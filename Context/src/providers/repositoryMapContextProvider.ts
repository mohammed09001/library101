/**
 * Repository Map Context Provider (Task 11): a concise, rank-ordered
 * symbol/signature map of the project — never a dump of raw source. Inspired
 * by Aider's RepoMap (`aider/repomap.py`); see `repoMapRank.ts` for the
 * research note recording exactly what was integrated/adapted/rejected and
 * why.
 *
 * Contract-shape honesty note: `ContextProvider.discover()` is documented as
 * "cheap enumeration ... must not fetch full content" (contracts/providers.ts).
 * Ranking genuinely requires reading file bytes to extract cross-file
 * references — heavier than `ProjectFilesProvider.discover()`'s plain
 * `stat()`. The invariant this provider actually preserves is the
 * *structural* one: a `ContextCandidateRef` has no `content` field, so
 * discover() still never RETURNS full file bodies — retrieve() returns only
 * a bounded per-file signature excerpt, never the raw source. The heavier
 * read cost is declared honestly via `cost.relativeCost: "medium"` (vs.
 * project_files' "low") and bounded by an in-memory mtime/size cache so
 * repeated calls against unchanged files don't re-read/re-parse.
 *
 * "High-value repository regions" (Task Source Requirement) surfaces as
 * `discover()` ordering its returned refs by descending PageRank score —
 * deliberately NOT a new field on `ContextCandidateRef` (no provider
 * contract change needed) and deliberately NOT a per-provider token-budget
 * fitting pass (Task 5 already owns budget-ceiling enforcement — see the
 * research note for why binary-search budget fitting was rejected here).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
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
import { extractFile, type FileExtraction } from "./repoMapExtract.ts";
import {
  personalizedPageRank,
  REPO_MAP_RANK_ALGORITHM,
  REPO_MAP_RANK_ALGORITHM_VERSION,
  type RankEdge,
} from "./repoMapRank.ts";

export interface RepositoryMapContextProviderOptions {
  root: string;
  maxDepth?: number;
  maxFileBytes?: number;
  maxFiles?: number;
  /** File extensions to include, e.g. [".ts", ".py"]. Undefined = all files. */
  extensions?: string[];
  /** Cap on how many signature lines a single file's map entry may show. */
  maxSymbolsPerFile?: number;
  respectGitignore?: boolean;
}

const DEFAULTS = {
  maxDepth: 8,
  maxFileBytes: 262144,
  maxFiles: 500,
  maxSymbolsPerFile: 20,
};

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "data"]);
const TASK_TOKEN_RE = /[a-z0-9_]{3,}/g;

interface CacheEntry {
  mtimeMs: number;
  size: number;
  extraction: FileExtraction;
}

function taskTokens(taskText: string): Set<string> {
  return new Set((taskText.toLowerCase().match(TASK_TOKEN_RE) ?? []) as string[]);
}

function renderSignatureBlock(relPath: string, extraction: FileExtraction, maxSymbols: number): string {
  const defs = [...extraction.defs].sort((a, b) => a.line - b.line).slice(0, maxSymbols);
  if (defs.length === 0) {
    return `# ${relPath} (no recognized symbols)`;
  }
  const lines = defs.map((d) => `${d.line}: ${d.signature}`);
  const omitted = extraction.defs.length - defs.length;
  const suffix = omitted > 0 ? `\n... (${omitted} more symbol(s) omitted)` : "";
  return `# ${relPath} (${extraction.defs.length} symbol(s))\n${lines.join("\n")}${suffix}`;
}

export class RepositoryMapContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly root: string;
  private readonly maxDepth: number;
  private readonly maxFileBytes: number;
  private readonly maxFiles: number;
  private readonly maxSymbolsPerFile: number;
  private readonly extensions?: string[];
  private readonly gitignore: GitignoreMatcher;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: RepositoryMapContextProviderOptions) {
    this.root = resolve(options.root);
    this.maxDepth = options.maxDepth ?? DEFAULTS.maxDepth;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULTS.maxFileBytes;
    this.maxFiles = options.maxFiles ?? DEFAULTS.maxFiles;
    this.maxSymbolsPerFile = options.maxSymbolsPerFile ?? DEFAULTS.maxSymbolsPerFile;
    this.extensions = options.extensions;
    this.gitignore =
      options.respectGitignore === false ? { isIgnored: () => false } : loadGitignoreMatcher(this.root);
    this.declaration = {
      id: "repository_map",
      displayName: "Repository Map",
      description: "Rank-ordered symbol/signature map of the project (Aider RepoMap-inspired) — never raw source.",
      capabilities: ["repository_map"],
      cost: { relativeCost: "medium", network: false },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      // 1.1.0 (Task 16, additive): retrieve() now attaches a relevanceHint
      // (PageRank centrality) to each returned candidate.
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
      return;
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

  /** Read + extract with mtime/size-keyed reuse; returns undefined for an unreadable/oversized file (skip, don't fail the whole map). */
  private async getExtraction(abs: string): Promise<FileExtraction | undefined> {
    let info;
    try {
      info = await stat(abs);
    } catch {
      return undefined;
    }
    if (!info.isFile() || info.size > this.maxFileBytes) return undefined;
    const cached = this.cache.get(abs);
    if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) {
      return cached.extraction;
    }
    let content: string;
    try {
      content = await readFile(abs, "utf8");
    } catch {
      return undefined;
    }
    const extraction = extractFile(content, extname(abs));
    this.cache.set(abs, { mtimeMs: info.mtimeMs, size: info.size, extraction });
    return extraction;
  }

  /**
   * Walk the tree, extract every file's defs/refs, and run PageRank over the
   * resulting reference graph. Shared by `discover()` (needs the ordering)
   * and `retrieve()` (needs a specific file's score for `relevanceHint`,
   * Task 16) — recomputed per call (no cross-call rank cache) since ranking
   * depends on `request.taskText`'s personalization, which can differ call
   * to call for the same repository state.
   */
  private async computeRanks(
    request: ContextRequest,
  ): Promise<{ rank: Map<string, number>; perFile: Map<string, { rel: string; extraction: FileExtraction }> }> {
    const absolutePaths: string[] = [];
    await this.walk(this.root, 0, absolutePaths);

    const perFile = new Map<string, { rel: string; extraction: FileExtraction }>();
    for (const abs of absolutePaths) {
      const extraction = await this.getExtraction(abs);
      if (extraction === undefined) continue;
      perFile.set(abs, { rel: relative(this.root, abs).split(sep).join("/"), extraction });
    }

    // Definition index: symbol name -> defining files.
    const definers = new Map<string, Set<string>>();
    for (const [abs, { extraction }] of perFile) {
      for (const d of extraction.defs) {
        if (!definers.has(d.name)) definers.set(d.name, new Set());
        definers.get(d.name)!.add(abs);
      }
    }
    // Repo-wide reference count per identifier, to dampen very common names.
    const refCount = new Map<string, number>();
    for (const [, { extraction }] of perFile) {
      for (const name of extraction.refs) {
        refCount.set(name, (refCount.get(name) ?? 0) + 1);
      }
    }

    const tokens = taskTokens(request.taskText);

    const edges: RankEdge[] = [];
    for (const [fromAbs, { extraction }] of perFile) {
      for (const name of extraction.refs) {
        const defFiles = definers.get(name);
        if (!defFiles) continue;
        const mentionBoost = tokens.has(name.toLowerCase()) ? 10 : 1;
        const commonality = Math.sqrt(Math.max(1, refCount.get(name) ?? 1));
        const weight = mentionBoost / commonality;
        for (const toAbs of defFiles) {
          if (toAbs === fromAbs) continue;
          edges.push({ from: fromAbs, to: toAbs, weight });
        }
      }
    }

    const personalization = new Map<string, number>();
    for (const [abs, { extraction }] of perFile) {
      let score = 0;
      for (const d of extraction.defs) {
        if (tokens.has(d.name.toLowerCase())) score += 1;
      }
      if (score > 0) personalization.set(abs, score);
    }

    const nodes = [...perFile.keys()];
    const rank = personalizedPageRank(nodes, edges, personalization);
    return { rank, perFile };
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const { rank, perFile } = await this.computeRanks(request);

    const refs: ContextCandidateRef[] = [];
    const relToAbs = new Map<string, string>();
    for (const [abs, { rel, extraction }] of perFile) {
      const block = renderSignatureBlock(rel, extraction, this.maxSymbolsPerFile);
      refs.push({
        providerId: this.declaration.id,
        ref: rel,
        title: rel,
        estimatedTokens: Math.ceil(block.length / 4),
      });
      relToAbs.set(rel, abs);
    }
    // "High-value repository regions" surfaces as descending-rank ordering —
    // see the module docstring for why this isn't a new ref field.
    refs.sort((a, b) => {
      const rb = rank.get(relToAbs.get(b.ref) ?? "") ?? 0;
      const ra = rank.get(relToAbs.get(a.ref) ?? "") ?? 0;
      if (rb !== ra) return rb - ra;
      return a.ref.localeCompare(b.ref);
    });
    return refs;
  }

  async retrieve(request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    // Computed lazily, once, only if at least one ref is requested — a
    // standalone retrieve() (e.g. via buildPack with a directly-supplied
    // ref, no prior discover() call) still gets a relevanceHint, at the cost
    // of recomputing the whole-repo graph on a cold call — declared cost is
    // already "medium" for exactly this reason.
    let ranks: Awaited<ReturnType<typeof this.computeRanks>> | undefined;

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
      const extraction = await this.getExtraction(abs);
      const block =
        extraction !== undefined
          ? renderSignatureBlock(ref.ref, extraction, this.maxSymbolsPerFile)
          : `# ${ref.ref} (unreadable)`;

      if (ranks === undefined) ranks = await this.computeRanks(request);
      const score = ranks.rank.get(abs);

      out.push({
        providerId: this.declaration.id,
        ref: ref.ref,
        title: ref.title,
        estimatedTokens: Math.ceil(block.length / 4),
        content: block,
        retrievedAt: new Date().toISOString(),
        sourceMetadata: { symbolCount: extraction?.defs.length ?? 0 },
        ...(score !== undefined
          ? {
              relevanceHint: {
                score,
                algorithm: REPO_MAP_RANK_ALGORITHM,
                algorithmVersion: REPO_MAP_RANK_ALGORITHM_VERSION,
                basis:
                  "Personalized PageRank centrality within this repository's reference graph — a structural signal, not a claim of task relevance. Combine with textMatchScore/other signals; do not select on this alone.",
              },
            }
          : {}),
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
