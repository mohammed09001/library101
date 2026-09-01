/**
 * Library Context Engine — MCP stdio server (Task 30).
 *
 * Exposes context.build / context.preview / context.get as MCP tools over
 * the standard stdio transport: newline-delimited JSON-RPC 2.0 on
 * stdin/stdout, logging on stderr, exit when stdin closes (the portable
 * shutdown signal). Nothing that is not a valid MCP message is ever
 * written to stdout.
 *
 * DUAL-ERA, per the 2026-07-28 specification's own compatibility model:
 * - Modern requests carry `_meta["io.modelcontextprotocol/protocolVersion"]`
 *   on every call; an unsupported version is refused with
 *   UnsupportedProtocolVersionError (-32022) listing the versions we do
 *   support. `server/discover` reports identity/capabilities/versions.
 * - Legacy clients that open with the `initialize` handshake are served
 *   under legacy result shapes (no `resultType` field) at the negotiated
 *   legacy revision.
 * There is NO per-connection session state: era is selected per request
 * (modern `_meta` present) or by the process-scope legacy `initialize`;
 * every tool call is stateless through the versioned dispatcher, and pack
 * identity travels explicitly as the `packId` handle in tool arguments.
 *
 * Zero runtime dependencies: this is a bounded Library-owned JSON-RPC
 * loop, not an SDK import (docs/MCP.md research note).
 */
import { createInterface } from "node:readline";
import { buildCliEngine, parseCliFlags } from "../cli/engineFactory.ts";
import type { ContextEngine } from "../engine/contextEngine.ts";
import {
  callTool,
  MCP_LEGACY_PROTOCOL_VERSIONS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  MCP_TOOLS,
  UnknownToolError,
} from "./tools.ts";

const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_INVALID_REQUEST = -32600;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;

interface IncomingMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

function send(message: Record<string, unknown>): void {
  // One line per message; JSON.stringify output never contains a raw newline.
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function errorResponse(id: unknown, code: number, message: string, data?: unknown): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    error: data !== undefined ? { code, message, data } : { code, message },
  };
}

function resultResponse(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}

const SERVER_INFO = { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION } as const;

const SERVER_INSTRUCTIONS =
  "Library Context Engine: build, preview, and fetch bounded, privacy-filtered task context packs. " +
  "context.build persists an immutable pack and returns pack.packId — carry that id explicitly to context.get. " +
  "context.preview computes the same pack without persisting (its packId is not a live handle). " +
  "Tool arguments are the versioned context.* operation requests (docs/SCHEMA.md, docs/PACKS.md).";

class McpStdioServer {
  private readonly engine: ContextEngine;
  /** Set once a legacy `initialize` handshake opens on this process. */
  private legacyInitialized = false;

  constructor(engine: ContextEngine) {
    this.engine = engine;
  }

  /**
   * Modern-era metadata check. Returns `undefined` when the request carries
   * no `_meta` (legacy semantics apply), `"ok"` when a supported modern
   * version is declared, or an error response when the declaration is
   * malformed/unsupported.
   */
  private checkModernMeta(msg: IncomingMessage): "legacy" | "ok" | Record<string, unknown> {
    const params = msg.params;
    const meta =
      params !== null && typeof params === "object"
        ? (params as Record<string, unknown>)["_meta"]
        : undefined;
    if (meta === undefined) return "legacy";
    if (meta === null || typeof meta !== "object") {
      return errorResponse(msg.id, JSONRPC_INVALID_PARAMS, "_meta must be an object when present");
    }
    const version = (meta as Record<string, unknown>)[PROTOCOL_VERSION_META_KEY];
    if (typeof version !== "string" || version.length === 0) {
      return errorResponse(
        msg.id,
        JSONRPC_INVALID_PARAMS,
        `modern requests MUST declare _meta["${PROTOCOL_VERSION_META_KEY}"]`,
      );
    }
    if (!(MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
      return errorResponse(msg.id, UNSUPPORTED_PROTOCOL_VERSION, "Unsupported protocol version", {
        supported: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
        requested: version,
      });
    }
    return "ok";
  }

  private toolListResult(modern: boolean): Record<string, unknown> {
    const tools = MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return modern ? { resultType: "complete", tools } : { tools };
  }

  private async handleToolCall(msg: IncomingMessage): Promise<Record<string, unknown>> {
    const era = this.checkModernMeta(msg);
    if (era !== "legacy" && era !== "ok") return era;
    const params = msg.params;
    const obj = params !== null && typeof params === "object" ? (params as Record<string, unknown>) : {};
    const name = obj["name"];
    if (typeof name !== "string") {
      return errorResponse(msg.id, JSONRPC_INVALID_PARAMS, "tools/call requires params.name");
    }
    let outcome;
    try {
      outcome = await callTool(this.engine, name, obj["arguments"]);
    } catch (err) {
      if (err instanceof UnknownToolError) {
        return errorResponse(msg.id, JSONRPC_INVALID_PARAMS, err.message);
      }
      throw err;
    }
    const content = [{ type: "text", text: outcome.text }];
    const result: Record<string, unknown> =
      era === "ok"
        ? { resultType: "complete", content, structuredContent: outcome.payload, isError: outcome.isError }
        : { content, isError: outcome.isError };
    return resultResponse(msg.id, result);
  }

  /** Route one already-parsed request (has an id — a response is expected). */
  private async route(msg: IncomingMessage): Promise<Record<string, unknown>> {
    switch (msg.method) {
      case "initialize": {
        // Legacy handshake (≤2025-11-25 revisions). Echo the requested
        // revision when we serve it; otherwise answer with our latest
        // legacy revision — the client decides compatibility.
        const params = msg.params;
        const requested =
          params !== null && typeof params === "object"
            ? (params as Record<string, unknown>)["protocolVersion"]
            : undefined;
        const negotiated =
          typeof requested === "string" && (MCP_LEGACY_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
            ? requested
            : MCP_LEGACY_PROTOCOL_VERSIONS[0];
        this.legacyInitialized = true;
        return resultResponse(msg.id, {
          protocolVersion: negotiated,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { ...SERVER_INFO },
          instructions: SERVER_INSTRUCTIONS,
        });
      }
      case "server/discover": {
        const modern = this.checkModernMeta(msg);
        if (modern !== "legacy" && modern !== "ok") return modern;
        if (modern === "legacy") {
          return errorResponse(
            msg.id,
            JSONRPC_INVALID_PARAMS,
            `server/discover requires _meta["${PROTOCOL_VERSION_META_KEY}"]`,
          );
        }
        return resultResponse(msg.id, {
          resultType: "complete",
          supportedVersions: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
          capabilities: { tools: {} },
          _meta: { "io.modelcontextprotocol/serverInfo": { ...SERVER_INFO } },
          instructions: SERVER_INSTRUCTIONS,
        });
      }
      case "ping": {
        const modern = this.checkModernMeta(msg);
        if (modern !== "legacy" && modern !== "ok") return modern;
        return resultResponse(msg.id, {});
      }
      case "tools/list": {
        const modern = this.checkModernMeta(msg);
        if (modern !== "legacy" && modern !== "ok") return modern;
        return resultResponse(msg.id, this.toolListResult(modern === "ok"));
      }
      case "tools/call":
        return this.handleToolCall(msg);
      default:
        return errorResponse(msg.id, JSONRPC_METHOD_NOT_FOUND, `Method not found: ${String(msg.method)}`);
    }
  }

  /** Handle one raw stdin line. Never throws across the transport. */
  async handleLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(trimmed) as IncomingMessage;
    } catch {
      send(errorResponse(null, JSONRPC_PARSE_ERROR, "Parse error: input is not valid JSON"));
      return;
    }
    if (msg === null || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      send(errorResponse(msg.id ?? null, JSONRPC_INVALID_REQUEST, "Invalid Request: jsonrpc '2.0' and a string method are required"));
      return;
    }
    const isNotification = msg.id === undefined || msg.id === null;
    if (isNotification) {
      // notifications/initialized closes the legacy handshake (no response
      // to any notification); all other notifications are ignored — the
      // server never sends server-to-client requests.
      if (msg.method === "notifications/initialized") this.legacyInitialized = true;
      return;
    }
    try {
      send(await this.route(msg));
    } catch (err) {
      send(
        errorResponse(
          msg.id,
          JSONRPC_INVALID_REQUEST,
          `Internal error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  isLegacyInitialized(): boolean {
    return this.legacyInitialized;
  }
}

function main(): void {
  const engine = buildCliEngine(parseCliFlags(process.argv.slice(2)));
  const server = new McpStdioServer(engine);
  const rl = createInterface({ input: process.stdin, terminal: false });
  // Requests are handled strictly in arrival order (responses correlate by
  // JSON-RPC id either way, but a bounded local tool server gains nothing
  // from interleaving and callers gain deterministic output).
  let queue: Promise<void> = Promise.resolve();
  const inflight = new Set<Promise<void>>();
  rl.on("line", (line: string) => {
    const p = queue
      .then(() => server.handleLine(line))
      .finally(() => inflight.delete(p));
    queue = p;
    inflight.add(p);
  });
  // stdin EOF is the portable shutdown signal (spec: servers SHOULD exit
  // promptly when their input stream closes) — but never before every
  // accepted request has been answered.
  rl.on("close", () => {
    void Promise.allSettled([...inflight]).then(() => {
      engine.close();
      process.exit(0);
    });
  });
}

main();
