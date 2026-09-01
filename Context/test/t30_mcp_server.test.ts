/**
 * CHILD LOOP 2 verification (Execution 12) — Task 30: Expose MCP/host-native
 * Context tools. Proves, against the REAL server subprocess speaking real
 * newline-delimited JSON-RPC over stdin/stdout (no in-process shortcut):
 * the modern 2026-07-28 era answers `server/discover`, versioned `tools/list`
 * (resultType "complete"), and stateless `tools/call` with structured
 * content; the packId handle returned by a `context.build` call is the
 * explicit state a subsequent `context.get` call needs — even from a
 * COMPLETELY SEPARATE server process (no transport-hidden session);
 * the legacy `initialize` handshake negotiates a 2025-06-18 revision and
 * gets legacy result shapes; and the error taxonomy holds — unsupported
 * protocol version is -32022 with a supported list, unknown tool is -32602,
 * business failures (unknown packId) are tool execution errors
 * (isError: true, typed code in the text), unknown method is -32601, and
 * malformed JSON is a -32700 parse error with null id. Also proves the
 * stdout framing discipline: EVERY stdout line is one parseable JSON-RPC
 * message.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP_PATH = join(HERE, "..", "src", "mcp", "server.ts");
const PROTO = "io.modelcontextprotocol/protocolVersion";

interface RpcResponse {
  jsonrpc: "2.0";
  id: number | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t30-${name}-`));
  return join(dir, "context.db");
}

interface SpeakResult {
  replies: RpcResponse[];
  stdout: string;
}

/**
 * Spawn the real server against `storePath` with a fresh one-file project
 * root, feed it whole JSON-RPC lines (stdin closes after the last one —
 * the server's portable shutdown signal), and parse every stdout line as
 * one reply.
 */
function speak(storePath: string, lines: string[]): SpeakResult {
  const projectDir = mkdtempSync(join(tmpdir(), `ctx-t30-proj-`));
  writeFileSync(join(projectDir, "notes.md"), "hello from the mcp project");
  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", MCP_PATH, "--store", storePath, "--project-root", projectDir],
    { input: `${lines.join("\n")}\n`, encoding: "utf8", env: { ...process.env } },
  );
  const nonEmpty = stdout.split("\n").filter((l) => l.trim().length > 0);
  // Framing discipline: every stdout line is one valid JSON-RPC message,
  // and notifications (no id) get no response.
  const expected = lines.filter((l) => {
    try {
      return JSON.parse(l).id !== undefined;
    } catch {
      return true; // malformed lines DO get a parse-error reply (id null)
    }
  }).length;
  assert.equal(nonEmpty.length, expected);
  return { replies: nonEmpty.map((l) => JSON.parse(l) as RpcResponse), stdout };
}

function modern(method: string, params: Record<string, unknown>, id: number): string {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params: { ...params, _meta: { [PROTO]: "2026-07-28" } } });
}

function buildArguments(projectKey: string): Record<string, unknown> {
  return {
    request: {
      contractVersion: "1.10.0",
      project: { projectKey },
      taskText: "mcp smoke",
      hostAgent: { kind: "human", name: "kim" },
      mode: "chat",
      budget: { maxTokens: 1000 },
      privacyPolicy: { maxPrivacyClass: "internal" },
      callerCapabilities: { actorKind: "human" },
      createdAt: "2026-08-30T00:00:00Z",
    },
    items: [{ providerId: "project_files", ref: "notes.md" }],
    rankingVersion: "manual-v1",
    creationReason: "t30 mcp build",
    createdBy: { kind: "human", name: "kim" },
  };
}

test("T30: modern era — discover, tools/list, build with structured content, negative taxonomy", () => {
  const { replies } = speak(tempStorePath("modern"), [
    modern("server/discover", {}, 1),
    modern("tools/list", {}, 2),
    JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "context.build", arguments: buildArguments("t30-modern"), _meta: { [PROTO]: "2026-07-28" } } }),
    JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list", params: { _meta: { [PROTO]: "1900-01-01" } } }),
    JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope", arguments: {}, _meta: { [PROTO]: "2026-07-28" } } }),
    modern("resources/list", {}, 6),
    "{not json",
  ]);
  const [discover, list, build, badVersion, unknownTool, unknownMethod, parseError] = replies;

  assert.equal(discover!.error, undefined);
  assert.deepEqual(discover!.result!.supportedVersions, ["2026-07-28"]);
  assert.deepEqual((discover!.result!.capabilities as Record<string, unknown>).tools, {});
  const serverInfo = (discover!.result!._meta as Record<string, Record<string, unknown>>)[
    "io.modelcontextprotocol/serverInfo"
  ]!;
  assert.equal(serverInfo.name, "library.context-engine");

  assert.equal(list!.result!.resultType, "complete");
  const tools = list!.result!.tools as Array<{ name: string }>;
  assert.deepEqual(
    tools.map((t) => t.name),
    ["context.build", "context.preview", "context.get"],
  );
  for (const t of tools) {
    assert.equal(typeof (t as unknown as { inputSchema: unknown }).inputSchema, "object");
  }

  const buildResult = build!.result! as {
    resultType: string;
    isError: boolean;
    structuredContent: { pack: { packId: string; status: string; items: unknown[]; projectKey: string } };
    content: Array<{ type: string; text: string }>;
  };
  assert.equal(buildResult.resultType, "complete");
  assert.equal(buildResult.isError, false);
  assert.equal(buildResult.structuredContent.pack.status, "active");
  assert.equal(buildResult.structuredContent.pack.items.length, 1);
  assert.equal(buildResult.structuredContent.pack.projectKey, "t30-modern");
  assert.match(buildResult.content[0]!.text, /"packId":"pak_/);

  assert.equal(badVersion!.error!.code, -32022);
  assert.deepEqual((badVersion!.error!.data as { supported: string[] }).supported, ["2026-07-28"]);
  assert.equal((badVersion!.error!.data as { requested: string }).requested, "1900-01-01");

  assert.equal(unknownTool!.error!.code, -32602);
  assert.match(unknownTool!.error!.message, /Unknown tool: nope/);

  assert.equal(unknownMethod!.error!.code, -32601);

  assert.equal(parseError!.id, null);
  assert.equal(parseError!.error!.code, -32700);
});

test("T30: explicit state handles — build's packId is the ONLY state get needs, across two separate server processes", () => {
  const storePath = tempStorePath("handles");
  const first = speak(storePath, [
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "context.build", arguments: buildArguments("t30-handles"), _meta: { [PROTO]: "2026-07-28" } } }),
  ]).replies[0]!;
  const pack = (first.result!.structuredContent as { pack: { packId: string; packHash: string } }).pack;
  assert.equal(first.result!.isError, false);

  // A COMPLETELY SEPARATE server process (same store, no shared memory,
  // no session) fetches the pack by the explicit handle alone.
  const second = speak(storePath, [
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "context.get", arguments: { packId: pack.packId }, _meta: { [PROTO]: "2026-07-28" } } }),
  ]).replies[0]!;
  const fetched = second.result!.structuredContent as { pack: { packId: string; packHash: string } };
  assert.equal(fetched.pack.packId, pack.packId);
  assert.equal(fetched.pack.packHash, pack.packHash);
});

test("T30: preview computes without persisting — its packId is not a live handle", () => {
  const storePath = tempStorePath("preview");
  const preview = speak(storePath, [
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "context.preview", arguments: buildArguments("t30-preview"), _meta: { [PROTO]: "2026-07-28" } } }),
  ]).replies[0]!;
  const structured = preview.result!.structuredContent as {
    persisted: boolean;
    pack: { packId: string; status: string };
  };
  assert.equal(preview.result!.isError, false);
  assert.equal(structured.persisted, false);

  // The previewed packId was never stored — a later get is an honest miss.
  const get = speak(storePath, [
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "context.get", arguments: { packId: structured.pack.packId }, _meta: { [PROTO]: "2026-07-28" } } }),
  ]).replies[0]!;
  assert.equal(get.result!.isError, true);
  assert.match((get.result!.content as Array<{ text: string }>)[0]!.text, /^CONTEXT_NOT_FOUND: /);
});

test("T30: legacy era — initialize handshake, legacy result shapes, execution-error taxonomy", () => {
  const { replies } = speak(tempStorePath("legacy"), [
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "legacy-client", version: "1.0.0" } },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "context.build", arguments: buildArguments("t30-legacy") } }),
    JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "context.get", arguments: { packId: "pak_missing" } } }),
    JSON.stringify({ jsonrpc: "2.0", id: 5, method: "ping" }),
  ]);
  // The notification gets no response — 6 lines in, 5 replies out (also
  // asserted by speak's framing check).
  assert.equal(replies.length, 5);
  const [init, list, build, getMissing, ping] = replies;

  assert.equal(init!.result!.protocolVersion, "2025-06-18");
  const serverInfo = init!.result!.serverInfo as { name: string; version: string };
  assert.equal(serverInfo.name, "library.context-engine");

  // Legacy shape: no resultType wrapper.
  assert.equal(list!.result!.resultType, undefined);
  assert.equal((list!.result!.tools as unknown[]).length, 3);

  const buildResult = build!.result! as { resultType?: string; isError: boolean; content: Array<{ text: string }> };
  assert.equal(buildResult.resultType, undefined);
  assert.equal(buildResult.isError, false);
  assert.match(buildResult.content[0]!.text, /"packId":"pak_/);

  // Business failure = tool EXECUTION error, not a protocol error.
  assert.equal(getMissing!.error, undefined);
  assert.equal(getMissing!.result!.isError, true);
  assert.match((getMissing!.result!.content as Array<{ text: string }>)[0]!.text, /^CONTEXT_NOT_FOUND: /);

  assert.deepEqual(ping!.result!, {});
});
