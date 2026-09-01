/**
 * CHILD LOOP 1 verification (Execution 12) — Task 29: Build the Context CLI
 * (the detach/list/human-output slice). Proves: `context.detach` removes
 * exactly one attachment relation (event fires only on a real deletion;
 * unknown pack, unknown attachment, and cross-pack attachmentId are all
 * typed CONTEXT_NOT_FOUND); `context.list` returns a bounded, newest-first
 * summary projection filtered by projectKey/status/mode/limit (summaries
 * never carry items/exclusions); both round-trip through the dispatcher
 * envelope; the CLI exposes `pack detach`/`pack list` end-to-end; and
 * `--format human` renders every Task-29 command as plain text while the
 * JSON default and the JSON error contract are unchanged.
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
import { NotFoundError, ValidationError } from "../src/contracts/errors.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { ContextRequestEnvelope } from "../src/contracts/operations.ts";
import type { ContextRequest } from "../src/contracts/types.ts";
import { formatDetachOp, formatListOp, formatPackOp } from "../src/cli/format.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(HERE, "..", "src", "cli", "cli.ts");

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t29-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    project: { projectKey: "demo" },
    taskText: "t",
    hostAgent: { kind: "human", name: "kim" },
    mode: "chat",
    budget: { maxTokens: 1000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "human" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
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
    discover: async () => [],
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

function envelope(operation: ContextRequestEnvelope["operation"], request: unknown): ContextRequestEnvelope {
  return { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation, request };
}

async function buildOnePack(engine: ContextEngine, providerId: string, projectKey?: string): Promise<string> {
  const request = baseRequest(projectKey !== undefined ? { project: { projectKey } } : {});
  const pack = await engine.buildPack({
    request,
    items: [{ providerId, ref: "a" }],
    rankingVersion: "manual-v1",
    creationReason: "t29 fixture",
    createdBy: { kind: "human", name: "kim" },
  });
  return pack.packId;
}

test("T29: context.detach removes exactly one attachment and emits context.pack.detached only on a real deletion", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("detach") });
  engine.registerProvider(stubProvider("p"));
  const packId = await buildOnePack(engine, "p");
  const attachment = engine.attachPack(packId, { kind: "agent", name: "worker-a" });
  const eventsBefore = (await engine.doctor()).eventCount;
  assert.equal(engine.explainPack(packId).attachments.length, 1);

  const result = engine.detachPack(packId, attachment.attachmentId, { kind: "human", name: "kim" });
  assert.equal(result.packId, packId);
  assert.equal(result.attachmentId, attachment.attachmentId);
  assert.deepEqual(engine.explainPack(packId).attachments, []);

  // Exactly one new event (the detached audit record), none for the failure.
  assert.equal((await engine.doctor()).eventCount, eventsBefore + 1);
  assert.throws(
    () => engine.detachPack(packId, attachment.attachmentId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof NotFoundError && err.code === "CONTEXT_NOT_FOUND",
  );
  assert.equal((await engine.doctor()).eventCount, eventsBefore + 1);
});

test("T29: detach negative paths — unknown pack and cross-pack attachmentId are both CONTEXT_NOT_FOUND", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("detach-neg") });
  engine.registerProvider(stubProvider("p"));
  const packA = await buildOnePack(engine, "p", "alpha");
  const packB = await buildOnePack(engine, "p", "beta");
  const attA = engine.attachPack(packA, { kind: "agent", name: "worker-a" });

  assert.throws(
    () => engine.detachPack("pak_missing", attA.attachmentId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof NotFoundError,
  );
  // attA exists, but packB never held it — same typed NOT_FOUND, no leak.
  assert.throws(
    () => engine.detachPack(packB, attA.attachmentId, { kind: "human", name: "kim" }),
    (err: unknown) => err instanceof NotFoundError && err.message.includes("no attachment"),
  );
  // packA's attachment survived both failed detaches.
  assert.equal(engine.explainPack(packA).attachments.length, 1);
});

test("T29: context.list returns a bounded newest-first summary projection with working filters", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("list") });
  engine.registerProvider(stubProvider("p"));
  const ids: string[] = [];
  for (const key of ["alpha", "beta", "alpha"]) {
    ids.push(await buildOnePack(engine, "p", key));
  }
  // One invalidated pack for the status filter.
  engine.invalidatePack(ids[2]!, { kind: "human", name: "kim" }, "t29 test");

  const all = engine.listPacks({});
  assert.equal(all.count, 3);
  assert.equal(all.packs.length, 3);
  // Newest first (build order reversed).
  assert.deepEqual(all.packs.map((p) => p.packId), [ids[2], ids[1], ids[0]]);
  for (const summary of all.packs) {
    assert.equal(summary.itemCount, 1);
    assert.equal(summary.totalEstimatedTokens, 18); // 10 + 8 per-item framing
    assert.equal(summary.mode, "sync");
    assert.equal(summary.status, summary.packId === ids[2] ? "invalidated" : "active");
    assert.ok(!("items" in summary) && !("exclusions" in summary), "summaries never carry items/exclusions");
  }

  assert.deepEqual(
    engine.listPacks({ projectKey: "alpha" }).packs.map((p) => p.packId).sort(),
    [ids[0], ids[2]].sort(),
  );
  assert.deepEqual(engine.listPacks({ status: "invalidated" }).packs.map((p) => p.packId), [ids[2]]);
  assert.deepEqual(engine.listPacks({ status: "active" }).count, 2);
  assert.deepEqual(engine.listPacks({ mode: "attach" }).count, 0);

  const limited = engine.listPacks({ limit: 2 });
  assert.equal(limited.count, 2);
  assert.deepEqual(limited.packs.map((p) => p.packId), [ids[2], ids[1]]);

  assert.deepEqual(engine.listPacks({ projectKey: "nope" }).packs, []);
});

test("T29: dispatcher round-trips context.detach/context.list and validates their inputs", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(stubProvider("p"));
  const packId = await buildOnePack(engine, "p");
  const attachResp = await dispatch(
    engine,
    envelope("context.attach", { packId, target: { kind: "agent", name: "worker-a" } }),
  );
  assert.equal(attachResp.ok, true);
  const attachmentId = (attachResp as { ok: true; result: { attachment: { attachmentId: string } } }).result.attachment
    .attachmentId;

  const listResp = await dispatch(engine, envelope("context.list", { projectKey: "demo" }));
  assert.equal(listResp.ok, true);
  const listed = (listResp as { ok: true; result: { packs: Array<{ packId: string }> } }).result;
  assert.deepEqual(listed.packs.map((p) => p.packId), [packId]);

  const detachResp = await dispatch(
    engine,
    envelope("context.detach", { packId, attachmentId, actor: { kind: "human", name: "kim" } }),
  );
  assert.equal(detachResp.ok, true);
  assert.equal(
    (detachResp as { ok: true; result: { attachmentId: string } }).result.attachmentId,
    attachmentId,
  );

  const badStatus = await dispatch(engine, envelope("context.list", { status: "bogus" }));
  assert.equal(badStatus.ok, false);
  assert.equal((badStatus as { ok: false; error: { code: string } }).error.code, "CONTEXT_VALIDATION_FAILED");

  const badLimit = await dispatch(engine, envelope("context.list", { limit: 0 }));
  assert.equal(badLimit.ok, false);

  const badDetach = await dispatch(
    engine,
    envelope("context.detach", { packId: "pak_x", attachmentId: "atc_x", actor: { kind: "human", name: "kim" } }),
  );
  assert.equal(badDetach.ok, false);
  assert.equal((badDetach as { ok: false; error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");
});

test("T29: CLI end-to-end — pack build -> list -> attach -> detach -> list, human and JSON", () => {
  const storePath = tempStorePath("cli");
  const projectDir = mkdtempSync(join(tmpdir(), "ctx-t29-cli-"));
  writeFileSync(join(projectDir, "notes.md"), "hello from the project");

  const buildRequest = {
    request: baseRequest({ project: { projectKey: "cli-demo" } }),
    items: [{ providerId: "project_files", ref: "notes.md" }],
    rankingVersion: "manual-v1",
    creationReason: "cli e2e detach/list",
    createdBy: { kind: "human", name: "kim" },
  };
  const run = (args: string[]): { stdout: string; status: number } => {
    try {
      const stdout = execFileSync(
        process.execPath,
        ["--experimental-strip-types", CLI_PATH, ...args, "--store", storePath, "--project-root", projectDir],
        { encoding: "utf8", env: { ...process.env } },
      );
      return { stdout, status: 0 };
    } catch (err) {
      const e = err as { status: number; stdout: string };
      return { stdout: e.stdout ?? "", status: e.status };
    }
  };

  const built = JSON.parse(
    run(["pack", "build", "--request", JSON.stringify(buildRequest)]).stdout,
  ) as { ok: true; result: { pack: { packId: string } } };
  const packId = built.result.pack.packId;

  // JSON list (default format unchanged).
  const listed = JSON.parse(run(["pack", "list"]).stdout) as {
    ok: true;
    result: { packs: Array<{ packId: string; itemCount: number; status: string }>; count: number };
  };
  assert.equal(listed.ok, true);
  assert.equal(listed.result.count, 1);
  assert.equal(listed.result.packs[0]!.packId, packId);
  assert.equal(listed.result.packs[0]!.itemCount, 1);

  // Attach, then detach via CLI.
  const attached = JSON.parse(
    run(["pack", "attach", "--pack-id", packId, "--target", JSON.stringify({ kind: "agent", name: "worker-a" })])
      .stdout,
  ) as { ok: true; result: { attachment: { attachmentId: string } } };
  const attachmentId = attached.result.attachment.attachmentId;
  const detached = JSON.parse(
    run([
      "pack",
      "detach",
      "--pack-id",
      packId,
      "--attachment-id",
      attachmentId,
      "--actor",
      JSON.stringify({ kind: "human", name: "kim" }),
    ]).stdout,
  ) as { ok: true; result: { detachedAttachmentId?: string; attachmentId?: string; packId: string } };
  assert.equal(detached.ok, true);
  assert.equal(detached.result.packId, packId);

  // Explained pack no longer lists the attachment.
  const explained = JSON.parse(run(["pack", "explain", "--pack-id", packId]).stdout) as {
    ok: true;
    result: { attachments: unknown[] };
  };
  assert.deepEqual(explained.result.attachments, []);

  // Status filter that matches nothing still succeeds (empty is not an error).
  const none = JSON.parse(run(["pack", "list", "--status", "invalidated"]).stdout) as {
    ok: true;
    result: { count: number };
  };
  assert.equal(none.result.count, 0);

  // Negative: detaching an unknown attachment exits non-zero with the typed error.
  const badDetach = run([
    "pack",
    "detach",
    "--pack-id",
    packId,
    "--attachment-id",
    "atc_missing",
    "--actor",
    JSON.stringify({ kind: "human", name: "kim" }),
  ]);
  assert.equal(badDetach.status, 1);
  assert.equal((JSON.parse(badDetach.stdout) as { error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");
});

test("T29: --format human renders build/get/list/attach/detach/health as plain text; errors stay JSON", () => {
  const storePath = tempStorePath("human");
  const projectDir = mkdtempSync(join(tmpdir(), "ctx-t29-human-"));
  writeFileSync(join(projectDir, "notes.md"), "hello from the project");

  const run = (args: string[]): { stdout: string; status: number } => {
    try {
      const stdout = execFileSync(
        process.execPath,
        ["--experimental-strip-types", CLI_PATH, ...args, "--store", storePath, "--project-root", projectDir],
        { encoding: "utf8", env: { ...process.env } },
      );
      return { stdout, status: 0 };
    } catch (err) {
      const e = err as { status: number; stdout: string };
      return { stdout: e.stdout ?? "", status: e.status };
    }
  };
  const requestJson = JSON.stringify({
    request: baseRequest({ project: { projectKey: "human-demo" } }),
    items: [{ providerId: "project_files", ref: "notes.md" }],
    rankingVersion: "manual-v1",
    creationReason: "human format demo",
    createdBy: { kind: "human", name: "kim" },
  });

  const health = run(["health", "--format", "human"]).stdout;
  assert.match(health, new RegExp(`^Context Engine ${CONTEXT_ENGINE_CONTRACT_VERSION} — healthy\\n`));
  assert.ok(!health.trimStart().startsWith("{"), "human health is not a JSON dump");

  const build = run(["pack", "build", "--request", requestJson, "--format", "human"]).stdout;
  assert.match(build, /^Pack pak_[A-Z0-9]{26} \(active, sync\)\n/);
  assert.match(build, /project:  human-demo/);
  assert.match(build, /1\. project_files  notes\.md/);

  const packId = /Pack (pak_\S+) /.exec(build)![1]!;
  const get = run(["pack", "get", "--pack-id", packId, "--format", "human"]).stdout;
  assert.match(get, /^Pack /);

  const list = run(["pack", "list", "--format", "human"]).stdout;
  assert.match(list, /^1 pack\(s\), newest first:\n/);
  assert.ok(list.includes(packId));

  const attach = run([
    "pack",
    "attach",
    "--pack-id",
    packId,
    "--target",
    JSON.stringify({ kind: "agent", name: "worker-a" }),
    "--format",
    "human",
  ]).stdout;
  assert.match(attach, /^Attached pak_\S+ -> atc_\S+ \(target agent:worker-a at \d{4}-/);

  const attachmentId = /-> (atc_\S+) /.exec(attach)![1]!;
  const detach = run([
    "pack",
    "detach",
    "--pack-id",
    packId,
    "--attachment-id",
    attachmentId,
    "--actor",
    JSON.stringify({ kind: "human", name: "kim" }),
    "--format",
    "human",
  ]).stdout;
  assert.match(detach, /^Detached atc_\S+ from pak_\S+ at /);

  // A failing command in human mode still emits the JSON error contract.
  const failed = run(["pack", "get", "--pack-id", "pak_missing", "--format", "human"]);
  assert.equal(failed.status, 1);
  assert.equal((JSON.parse(failed.stdout) as { error: { code: string } }).error.code, "CONTEXT_NOT_FOUND");

  // Invalid --format value is a usage error (exit 2).
  assert.equal(run(["health", "--format", "yaml"]).status, 2);
});

test("T29: human formatters are deterministic plain text (unit-level, no store)", () => {
  const detachLine = formatDetachOp({
    packId: "pak_a",
    attachmentId: "atc_b",
    detachedAt: "2026-08-30T00:00:00.000Z",
  });
  assert.equal(detachLine, "Detached atc_b from pak_a at 2026-08-30T00:00:00.000Z");

  assert.equal(formatListOp({ packs: [], count: 0 }), "No packs found.");
  assert.throws(() => formatPackOp({}), (err: unknown) => err instanceof TypeError);
});
