/**
 * CHILD LOOP 1 verification — Task 1: Freeze the Context Engine boundary.
 * Proves: clean construction, versioned contract surface, explicit
 * failure/degraded behavior via doctor(), terminal-first CLI usable without
 * a game, and structural isolation from sibling engines (no cross-package
 * imports possible or present).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import { NotFoundError } from "../src/contracts/errors.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(HERE, "..", "src", "cli", "cli.ts");
const SRC_DIR = join(HERE, "..", "src");

/** doctor() opens a real store (Task 6) — every doctor-touching test gets its own temp path. */
function tempStore(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t1-${name}-`));
  return join(dir, "context.db");
}

test("T1: engine constructs cleanly with an empty provider registry", () => {
  const engine = new ContextEngine();
  assert.deepEqual(engine.listProviders(), []);
});

test("T1: doctor never throws and reports contractVersion + zero providers", async () => {
  const engine = new ContextEngine({ storePath: tempStore("doctor-empty") });
  const report = await engine.doctor();
  assert.equal(report.healthy, true);
  assert.equal(report.contractVersion, CONTEXT_ENGINE_CONTRACT_VERSION);
  assert.equal(report.registeredProviders, 0);
  assert.deepEqual(report.degradedProviders, []);
});

test("T1: doctor reports a provider that fails healthCheck as degraded, without throwing", async () => {
  const engine = new ContextEngine({ storePath: tempStore("doctor-degraded") });
  engine.registerProvider({
    declaration: {
      id: "flaky",
      displayName: "Flaky",
      description: "always unhealthy",
      capabilities: [],
      cost: { relativeCost: "low" },
      freshness: { kind: "static" },
      privacy: { maxPrivacyClass: "public" },
    },
    discover: async () => [],
    retrieve: async () => [],
    healthCheck: async () => ({ available: false, degraded: true, message: "down" }),
  });
  const report = await engine.doctor();
  assert.equal(report.healthy, true, "engine-level doctor never fails on a degraded provider");
  assert.equal(report.registeredProviders, 1);
  assert.deepEqual(report.degradedProviders, ["flaky"]);
});

test("T1: negative — unknown provider id lookup fails with typed CONTEXT_NOT_FOUND", () => {
  const engine = new ContextEngine();
  assert.throws(
    () => engine.registry.get("does-not-exist"),
    (err: unknown) => err instanceof NotFoundError && (err as NotFoundError).code === "CONTEXT_NOT_FOUND",
  );
});

test("T1: CLI doctor works end-to-end from a terminal surface (no game)", () => {
  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", CLI_PATH, "doctor", "--store", tempStore("cli-doctor")],
    { encoding: "utf8", env: { ...process.env } },
  );
  const report = JSON.parse(stdout) as { healthy: boolean; contractVersion: string; registeredProviders: number };
  assert.equal(report.healthy, true);
  assert.equal(report.contractVersion, CONTEXT_ENGINE_CONTRACT_VERSION);
  assert.equal(report.registeredProviders, 0);
});

test("T1: CLI usage error exits 2 for an unknown command", () => {
  assert.throws(() => {
    execFileSync(process.execPath, ["--experimental-strip-types", CLI_PATH, "bogus"], {
      encoding: "utf8",
      env: { ...process.env },
    });
  }, (err: unknown) => (err as { status: number }).status === 2);
});

/**
 * Structural isolation proof: nothing under src/ has a TypeScript
 * import/require SPECIFIER naming a sibling engine's package. Checked at
 * the specifier level (not "any substring in the file") because since
 * Execution 03 it's legitimate and sanctioned (docs/ADAPTERS.md) for a
 * provider to mention/construct a sibling engine's filesystem path at
 * runtime in order to spawn that engine's own published CLI as a
 * subprocess (`src/providers/cliContractClient.ts`'s `resolveSiblingCli`)
 * — that is the isolation-respecting adapter pattern, not a violation of
 * it. What remains forbidden, and what this still catches, is an actual
 * `import ... from` / `require(...)` of another engine's TypeScript
 * package, which would be a real workspace-bypassing coupling.
 */
test("T1: no source file has an import/require specifier naming a sibling engine package", () => {
  const offenders: string[] = [];
  const SIBLING_NAMES = ["memory-engine", "@library/memory-engine", "study-document", "study-engine"];
  const IMPORT_SPECIFIER = /(?:from\s+|require\()\s*["']([^"']+)["']/g;
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = readFileSync(full, "utf8");
        for (const match of content.matchAll(IMPORT_SPECIFIER)) {
          const specifier = match[1]!;
          for (const needle of SIBLING_NAMES) {
            if (specifier.includes(needle)) offenders.push(`${full}: imports '${specifier}'`);
          }
        }
      }
    }
  }
  walk(SRC_DIR);
  assert.deepEqual(offenders, []);
});
