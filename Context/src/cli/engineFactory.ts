/**
 * Shared ContextEngine assembly from CLI-style `--flag value` options
 * (Task 30). One owner for "which providers does this process register,
 * and where is the store" so the terminal CLI and the MCP stdio server
 * accept exactly the same registration surface and never drift into two
 * parallel wiring paths.
 */
import { ContextEngine } from "../engine/contextEngine.ts";
import { ProjectFilesProvider } from "../providers/projectFilesProvider.ts";
import { MemoryContextProvider } from "../providers/memoryContextProvider.ts";
import { StudyContextProvider } from "../providers/studyContextProvider.ts";
import { PerformanceContextProvider } from "../providers/performanceContextProvider.ts";
import { RepositoryMapContextProvider } from "../providers/repositoryMapContextProvider.ts";
import { GitHistoryContextProvider } from "../providers/gitHistoryContextProvider.ts";
import { CurrentSessionContextProvider } from "../providers/currentSessionContextProvider.ts";

/** A flag's value, unless the flag was valueless (the "true" sentinel). */
export function optFlag(flags: Map<string, string>, name: string): string | undefined {
  const v = flags.get(name);
  return v !== undefined && v !== "true" ? v : undefined;
}

/**
 * Parse `--key value` / `--key` pairs out of an argv array. Positional
 * arguments are ignored (the MCP server has no subcommands); a flag
 * followed by another `--` flag (or nothing) is valueless.
 */
export function parseCliFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(key, next);
      i++;
    } else {
      flags.set(key, "true");
    }
  }
  return flags;
}

/** Build the engine a CLI-style process (terminal CLI or MCP server) serves from. */
export function buildCliEngine(flags: Map<string, string>): ContextEngine {
  const store = optFlag(flags, "store");
  const engine = new ContextEngine(store !== undefined ? { storePath: store } : {});

  const root = optFlag(flags, "project-root");
  if (root !== undefined) {
    engine.registerProvider(new ProjectFilesProvider({ root }));
  }

  const memoryCliPath = optFlag(flags, "memory-cli");
  const memoryStorePath = optFlag(flags, "memory-store");
  if (memoryCliPath !== undefined || memoryStorePath !== undefined) {
    engine.registerProvider(
      new MemoryContextProvider({
        ...(memoryCliPath !== undefined ? { memoryCliPath } : {}),
        ...(memoryStorePath !== undefined ? { storePath: memoryStorePath } : {}),
      }),
    );
  }

  const studyCliPath = optFlag(flags, "study-cli");
  const studyStorePath = optFlag(flags, "study-store");
  if (studyCliPath !== undefined || studyStorePath !== undefined) {
    engine.registerProvider(
      new StudyContextProvider({
        ...(studyCliPath !== undefined ? { studyCliPath } : {}),
        ...(studyStorePath !== undefined ? { storePath: studyStorePath } : {}),
      }),
    );
  }

  const performanceCliPath = optFlag(flags, "performance-cli");
  const performanceStorePath = optFlag(flags, "performance-store");
  if (performanceCliPath !== undefined || performanceStorePath !== undefined) {
    engine.registerProvider(
      new PerformanceContextProvider({
        ...(performanceCliPath !== undefined ? { performanceCliPath } : {}),
        ...(performanceStorePath !== undefined ? { storePath: performanceStorePath } : {}),
      }),
    );
  }

  const repoMapRoot = optFlag(flags, "repo-map-root");
  if (repoMapRoot !== undefined) {
    engine.registerProvider(new RepositoryMapContextProvider({ root: repoMapRoot }));
  }

  const gitHistoryRoot = optFlag(flags, "git-history-root");
  if (gitHistoryRoot !== undefined) {
    engine.registerProvider(new GitHistoryContextProvider({ root: gitHistoryRoot }));
  }

  if (flags.get("current-session") === "true") {
    engine.registerProvider(new CurrentSessionContextProvider());
  }

  return engine;
}
