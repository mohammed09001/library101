/**
 * Bounded `.gitignore`-style ignore matcher (Task 12: "ignore ... rules").
 *
 * Deliberately a documented SUBSET of the real gitignore spec, not a
 * from-scratch reimplementation of every edge case (character classes,
 * escaped wildcards, `!`-negation ordering across multiple files, nested
 * `.gitignore` files per directory) — matching the Repository-First rule's
 * "smallest coherent" bar and the Anti-Accumulation Rule's "prefer a bounded
 * Library-owned adapter" over pulling in a parser dependency (this repo
 * declares zero runtime dependencies, docs root README). Supported:
 *
 * - blank lines and `#` comments skipped
 * - a leading `/` anchors the pattern to the root (not any-depth)
 * - a trailing `/` matches directories only
 * - `*` matches within one path segment; `**` matches across segments
 * - a pattern with no `/` (other than a trailing one) matches at any depth
 * - `!`-prefixed re-include patterns, applied in file order after ignores
 *
 * NOT supported (falls through to "not ignored", never silently over-
 * matches): `[abc]` character classes, `\`-escaped metacharacters. A caller
 * that needs those should not rely on this matcher alone.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface CompiledPattern {
  regex: RegExp;
  dirOnly: boolean;
  negate: boolean;
}

export interface GitignoreMatcher {
  /** `relPath` uses forward slashes, relative to the ignore file's root. */
  isIgnored(relPath: string, isDirectory: boolean): boolean;
}

function globSegmentToRegexSource(pattern: string): string {
  // Translate one gitignore pattern into a regex source string. `**`
  // consumes across `/`; `*` and `?` stay within a segment.
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      out += ".*";
      i++;
      // swallow an immediately-following slash so "**/x" also matches "x"
      if (pattern[i + 1] === "/") i++;
    } else if (c === "*") {
      out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (".+^${}()|[]\\".includes(c ?? "")) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return out;
}

function compilePattern(rawLine: string): CompiledPattern | undefined {
  let line = rawLine.trim();
  if (line.length === 0 || line.startsWith("#")) return undefined;
  let negate = false;
  if (line.startsWith("!")) {
    negate = true;
    line = line.slice(1);
  }
  let dirOnly = false;
  if (line.endsWith("/")) {
    dirOnly = true;
    line = line.slice(0, -1);
  }
  const anchored = line.startsWith("/");
  if (anchored) line = line.slice(1);
  const body = globSegmentToRegexSource(line);
  const source = anchored ? `^${body}$` : `(^|.*/)${body}$`;
  return { regex: new RegExp(source), dirOnly, negate };
}

/**
 * Load and compile `<root>/.gitignore`. Returns a matcher that always
 * reports `false` when the file is absent or unreadable — an absent
 * `.gitignore` is a normal, expected state (Engine Isolation Invariants:
 * explicit degraded behavior, never a thrown surprise for a missing
 * optional file).
 */
export function loadGitignoreMatcher(root: string): GitignoreMatcher {
  let patterns: CompiledPattern[] = [];
  try {
    const raw = readFileSync(join(root, ".gitignore"), "utf8");
    patterns = raw
      .split(/\r?\n/)
      .map(compilePattern)
      .filter((p): p is CompiledPattern => p !== undefined);
  } catch {
    patterns = [];
  }
  return {
    isIgnored(relPath: string, isDirectory: boolean): boolean {
      let ignored = false;
      for (const p of patterns) {
        if (p.dirOnly && !isDirectory) continue;
        if (p.regex.test(relPath)) ignored = !p.negate;
      }
      return ignored;
    },
  };
}
