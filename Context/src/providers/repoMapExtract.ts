/**
 * Bounded, regex-based symbol extraction for the Repository Map Context
 * Provider (Task 11) — the Library-owned replacement for Aider's tree-sitter
 * tag extraction (see `repoMapRank.ts`'s research note for the REJECT
 * rationale: zero runtime dependencies).
 *
 * This is deliberately NOT a parser: it recognizes common top-level
 * definition shapes per language family via line-oriented regexes. It will
 * miss definitions inside unusual formatting and may occasionally misfire on
 * a line that merely resembles a definition. That is a documented, bounded
 * limitation — the same "cheap heuristic, not a ranking model" discipline
 * `docs/CANDIDATES.md` already applies to `relevanceSignals`.
 */

export interface DefEntry {
  name: string;
  line: number;
  signature: string;
}

export interface FileExtraction {
  defs: DefEntry[];
  /** Distinct identifier tokens referenced anywhere in the file. */
  refs: Set<string>;
}

const TS_JS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const PY_EXTS = new Set([".py"]);

const IDENTIFIER_RE = /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g;

interface DefRule {
  regex: RegExp;
  nameGroup: number;
}

const TS_JS_RULES: DefRule[] = [
  { regex: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, nameGroup: 1 },
  { regex: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, nameGroup: 1 },
  { regex: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/, nameGroup: 1 },
  { regex: /^\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/, nameGroup: 1 },
  { regex: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/, nameGroup: 1 },
  // exported const/let bindings only — unexported locals are noise at map granularity.
  { regex: /^\s*export\s+(?:const|let)\s+([A-Za-z_$][\w$]*)\s*[:=]/, nameGroup: 1 },
];

const TS_JS_METHOD_RE =
  /^\s{2,}(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+|override\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::|\{|=>)/;
const CONTROL_KEYWORDS = new Set([
  "if", "for", "while", "switch", "catch", "function", "return", "do", "else",
]);

const PY_RULES: DefRule[] = [
  { regex: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/, nameGroup: 1 },
  { regex: /^\s*class\s+([A-Za-z_]\w*)/, nameGroup: 1 },
];

const GENERIC_RULES: DefRule[] = [
  { regex: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/, nameGroup: 1 }, // Go
  { regex: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/, nameGroup: 1 }, // Rust
  { regex: /^\s*(?:pub\s+)?(?:struct|enum|trait|impl)\s+([A-Za-z_]\w*)/, nameGroup: 1 }, // Rust/Go-ish
  {
    regex: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|final\s+|abstract\s+)*(?:class|interface|record)\s+([A-Za-z_]\w*)/,
    nameGroup: 1,
  }, // Java/C#
];

function rulesFor(extension: string): DefRule[] {
  if (TS_JS_EXTS.has(extension)) return TS_JS_RULES;
  if (PY_EXTS.has(extension)) return PY_RULES;
  return GENERIC_RULES;
}

/** Extract definitions and reference tokens from one file's text content. */
export function extractFile(content: string, extension: string): FileExtraction {
  const rules = rulesFor(extension);
  const useMethodHeuristic = TS_JS_EXTS.has(extension);
  const lines = content.split(/\r?\n/);
  const defs: DefEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let matched = false;
    for (const rule of rules) {
      const m = rule.regex.exec(line);
      if (m) {
        const name = m[rule.nameGroup];
        if (name !== undefined) {
          const key = `${i}:${name}`;
          if (!seen.has(key)) {
            seen.add(key);
            defs.push({ name, line: i + 1, signature: line.trim() });
          }
        }
        matched = true;
        break;
      }
    }
    if (!matched && useMethodHeuristic) {
      const m = TS_JS_METHOD_RE.exec(line);
      if (m && m[1] !== undefined && !CONTROL_KEYWORDS.has(m[1])) {
        const key = `${i}:${m[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          defs.push({ name: m[1], line: i + 1, signature: line.trim() });
        }
      }
    }
  }

  const refs = new Set<string>();
  for (const m of content.matchAll(IDENTIFIER_RE)) {
    refs.add(m[0]);
  }

  return { defs, refs };
}
