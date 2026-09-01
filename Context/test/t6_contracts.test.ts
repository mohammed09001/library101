/**
 * CHILD LOOP 3 verification (Execution 02) — Task 6: Publish versioned
 * Context contracts and events. Proves: dispatcher round-trips for the 7
 * new operations (happy + one typed-error path each), CLI end-to-end pack
 * build -> get -> explain -> invalidate against a temp store, NOT_FOUND on
 * an unknown packId across get/explain/invalidate/attach, and
 * context.health reflecting a corrupt store as unhealthy without throwing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequestEnvelope } from "../src/contracts/operations.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(HERE, "..", "src", "cli", "cli.ts");

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t6-${name}-`));
  return join(dir, "context.db");
}

function stubProvider(id: string): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    },
    discover: async () => [{ providerId: id, ref: "a.md", title: "a.md", estimatedTokens: 10 }],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: "hello",
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

const baseRequestJson = {
  contractVersion: "1.1.0",
  project: { projectKey: "library101" },
  taskText: "t",
  hostAgent: { kind: "human", name: "kim" },
  mode: "chat",
  budget: { maxTokens: 1000 },
  privacyPolicy: { maxPrivacyClass: "internal" },
  callerCapabilities: { actorKind: "human" },
  createdAt: "2026-08-30T00:00:00Z",
};

function envelope(operation: ContextRequestEnvelope["operation"], request: unknown): ContextRequestEnvelope {
  return { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation, request };
}

test("T6: dispatcher round-trips context.build, get, explain, invalidate, attach, providers.list, health", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(stubProvider("p"));

  const buildResp = await dispatch(
    engine,
    envelope("context.build", {
      request: baseRequestJson,
      items: [{ providerId: "p", ref: "a.md" }],
      rankingVersion: "manual-v1",
      creationReason: "test",
      createdBy: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(buildResp.ok, true);
  const packId = (buildResp as { ok: true; result: { pack: { packId: string } } }).result.pack.packId;

  const getResp = await dispatch(engine, envelope("context.get", { packId }));
  assert.equal(getResp.ok, true);

  const explainResp = await dispatch(engine, envelope("context.explain", { packId }));
  assert.equal(explainResp.ok, true);

  const attachResp = await dispatch(
    engine,
    envelope("context.attach", { packId, target: { kind: "agent", name: "worker-a", agentType: "claude" } }),
  );
  assert.equal(attachResp.ok, true);

  const invalidateResp = await dispatch(
    engine,
    envelope("context.invalidate", { packId, actor: { kind: "human", name: "kim" }, reason: "done" }),
  );
  assert.equal(invalidateResp.ok, true);

  const listResp = await dispatch(engine, envelope("context.providers.list", {}));
  assert.equal(listResp.ok, true);

  const healthResp = await dispatch(engine, envelope("context.health", {}));
  assert.equal(healthResp.ok, true);
  assert.equal((healthResp as { ok: true; result: { healthy: boolean } }).result.healthy, true);
});

test("T6: negative — get/explain/invalidate/attach on an unknown packId return CONTEXT_NOT_FOUND envelopes", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("notfound") });
  for (const op of ["context.get", "context.explain"] as const) {
    const resp = await dispatch(engine, envelope(op, { packId: "pak_missing" }));
    assert.equal(resp.ok, false);
    assert.equal((resp as { ok: false; error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");
  }
  const invalidateResp = await dispatch(
    engine,
    envelope("context.invalidate", { packId: "pak_missing", actor: { kind: "human", name: "kim" }, reason: "r" }),
  );
  assert.equal(invalidateResp.ok, false);
  assert.equal((invalidateResp as { ok: false; error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");

  const attachResp = await dispatch(
    engine,
    envelope("context.attach", { packId: "pak_missing", target: { kind: "human", name: "kim" } }),
  );
  assert.equal(attachResp.ok, false);
  assert.equal((attachResp as { ok: false; error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");
});

test("T6: negative — context.build with missing creationReason returns CONTEXT_VALIDATION_FAILED", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("badbuild") });
  engine.registerProvider(stubProvider("p"));
  const resp = await dispatch(
    engine,
    envelope("context.build", {
      request: baseRequestJson,
      items: [{ providerId: "p", ref: "a.md" }],
      rankingVersion: "manual-v1",
      createdBy: { kind: "human", name: "kim" },
    }),
  );
  assert.equal(resp.ok, false);
  assert.equal((resp as { ok: false; error: { code: string } }).error.code, "CONTEXT_VALIDATION_FAILED");
});

test("T6: context.health reflects a corrupt store as unhealthy without throwing", async () => {
  const storePath = tempStorePath("corrupt");
  writeFileSync(storePath, Buffer.from("not a sqlite database", "utf8"));
  const engine = new ContextEngine({ storePath });
  const resp = await dispatch(engine, envelope("context.health", {}));
  assert.equal(resp.ok, true, "health check itself never throws/fails the envelope");
  const result = (resp as { ok: true; result: { healthy: boolean; errorCode?: string } }).result;
  assert.equal(result.healthy, false);
  assert.equal(result.errorCode, "CONTEXT_STORE_UNAVAILABLE");
});

test("T6: CLI end-to-end — pack build -> get -> explain -> invalidate -> invalidate again conflicts", () => {
  const storePath = tempStorePath("cli");
  const projectDir = mkdtempSync(join(tmpdir(), "ctx-t6-cli-project-"));
  writeFileSync(join(projectDir, "notes.md"), "hello from the project");

  const buildRequest = {
    request: baseRequestJson,
    items: [{ providerId: "project_files", ref: "notes.md" }],
    rankingVersion: "manual-v1",
    creationReason: "cli e2e test",
    createdBy: { kind: "human", name: "kim" },
  };
  const buildOut = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      CLI_PATH,
      "pack",
      "build",
      "--store",
      storePath,
      "--project-root",
      projectDir,
      "--request",
      JSON.stringify(buildRequest),
    ],
    { encoding: "utf8", env: { ...process.env } },
  );
  const built = JSON.parse(buildOut) as { ok: boolean; result: { pack: { packId: string; items: unknown[] } } };
  assert.equal(built.ok, true);
  assert.equal(built.result.pack.items.length, 1);
  const packId = built.result.pack.packId;

  const getOut = execFileSync(
    process.execPath,
    ["--experimental-strip-types", CLI_PATH, "pack", "get", "--store", storePath, "--pack-id", packId],
    { encoding: "utf8", env: { ...process.env } },
  );
  assert.equal((JSON.parse(getOut) as { ok: boolean }).ok, true);

  const explainOut = execFileSync(
    process.execPath,
    ["--experimental-strip-types", CLI_PATH, "pack", "explain", "--store", storePath, "--pack-id", packId],
    { encoding: "utf8", env: { ...process.env } },
  );
  const explained = JSON.parse(explainOut) as { ok: boolean; result: { pack: unknown; attachments: unknown[] } };
  assert.equal(explained.ok, true);
  assert.deepEqual(explained.result.attachments, []);

  const invalidateOut = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      CLI_PATH,
      "pack",
      "invalidate",
      "--store",
      storePath,
      "--pack-id",
      packId,
      "--reason",
      "cli e2e done",
      "--actor",
      JSON.stringify({ kind: "human", name: "kim" }),
    ],
    { encoding: "utf8", env: { ...process.env } },
  );
  assert.equal((JSON.parse(invalidateOut) as { ok: boolean }).ok, true);

  let secondStatus = 0;
  let secondStdout = "";
  try {
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        CLI_PATH,
        "pack",
        "invalidate",
        "--store",
        storePath,
        "--pack-id",
        packId,
        "--reason",
        "again",
        "--actor",
        JSON.stringify({ kind: "human", name: "kim" }),
      ],
      { encoding: "utf8", env: { ...process.env } },
    );
  } catch (err) {
    const e = err as { status: number; stdout: string };
    secondStatus = e.status;
    secondStdout = e.stdout;
  }
  assert.equal(secondStatus, 1);
  const secondParsed = JSON.parse(secondStdout) as { ok: boolean; error: { code: string } };
  assert.equal(secondParsed.ok, false);
  assert.equal(secondParsed.error.code, "CONTEXT_CONFLICT");
});
