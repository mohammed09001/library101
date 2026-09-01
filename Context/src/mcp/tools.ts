/**
 * MCP tool surface (Task 30) — the three named Context operations exposed
 * as MCP tools with current (2026-07-28) tool schemas. This is a thin
 * ADAPTER over the versioned contract: every tool call becomes a
 * `dispatch()` envelope call, so input validation, failure codes, privacy
 * enforcement, and events have exactly one owner (the engine) and the MCP
 * layer owns only protocol framing. Tool names reuse the operation
 * vocabulary verbatim (dots are valid MCP tool-name characters).
 *
 * Explicit state handles: MCP has no protocol-level session, and this
 * server keeps none — `context.build` returns the pack's `packId` as an
 * explicit, caller-carried handle and `context.get` accepts it. Nothing is
 * hidden in transport state.
 */
import { dispatch } from "../engine/dispatcher.ts";
import type { ContextEngine } from "../engine/contextEngine.ts";
import type { ContextOperation } from "../contracts/operations.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION, CONTEXT_ENGINE_ID } from "../contracts/version.ts";

export const MCP_SERVER_NAME = CONTEXT_ENGINE_ID;
/** Server build identity for serverInfo — the engine contract version, not an MCP protocol version. */
export const MCP_SERVER_VERSION = CONTEXT_ENGINE_CONTRACT_VERSION;
/** Modern (per-request `_meta`) protocol revisions this server accepts. */
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = ["2026-07-28"] as const;
/** Legacy (initialize-handshake) protocol revisions this server accepts. */
export const MCP_LEGACY_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18"] as const;

const buildInputSchema = {
  type: "object",
  properties: {
    request: {
      type: "object",
      description: "A full ContextRequest (docs/SCHEMA.md): contractVersion, project.projectKey, taskText, hostAgent, mode, budget, privacyPolicy, callerCapabilities, createdAt.",
    },
    items: {
      type: "array",
      minItems: 1,
      description: "Ordered item list, exactly context.select's output shape: [{providerId, ref, title?, score?}].",
      items: {
        type: "object",
        properties: {
          providerId: { type: "string" },
          ref: { type: "string" },
          title: { type: "string" },
        },
        required: ["providerId", "ref"],
      },
    },
    rankingVersion: { type: "string", description: "Caller-supplied label for whatever produced the item ordering (e.g. 'manual-v1')." },
    creationReason: { type: "string", description: "Why this pack is being built (recorded immutably)." },
    createdBy: { type: "object", description: "AgentIdentity {kind, name, agentType?} of the caller." },
    requestId: { type: "string" },
    idempotencyKey: { type: "string", description: "Replay-safe key: a repeat build with the same key returns the existing pack unchanged." },
    mode: { type: "string", enum: ["attach", "sync"], description: "'attach' packs carry ttlSeconds and expire via context.sweep; 'sync' (default) is permanent until invalidated." },
    ttlSeconds: { type: "number", description: "Only valid with mode 'attach'." },
    dedupeByHash: { type: "boolean", description: "Reuse an existing active pack of the same content hash and mode instead of inserting a duplicate row." },
  },
  required: ["request", "items", "rankingVersion", "creationReason", "createdBy"],
} as const;

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** The versioned contract operation this tool forwards to. */
  operation: ContextOperation;
}

/**
 * Deterministic order (build, preview, get) — MCP servers SHOULD keep
 * tools/list ordering stable so clients can cache it.
 */
export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "context.build",
    description:
      "Build a Library ContextPack: retrieve+normalize the given items, enforce privacy and the token/byte budget, deduplicate identical content, and PERSIST an immutable build record. " +
      "Returns {pack} — carry pack.packId forward as the explicit handle for context.get. " +
      "Sync-mode packs are permanent until context.invalidate; attach-mode packs expire (mode/ttlSeconds).",
    inputSchema: buildInputSchema,
    operation: "context.build",
  },
  {
    name: "context.preview",
    description:
      "Exactly context.build's computation (same arguments, same budget/privacy/dedup behavior) WITHOUT persisting anything: returns {pack, persisted: false}. " +
      "The returned pack's packId is NOT a live handle — it was never stored and cannot be fetched with context.get; call context.build to persist.",
    inputSchema: buildInputSchema,
    operation: "context.preview",
  },
  {
    name: "context.get",
    description:
      "Fetch a previously built ContextPack by its explicit handle (the packId returned by context.build). " +
      "Returns {pack} with status active/invalidated/expired, or a CONTEXT_NOT_FOUND execution error for an unknown packId.",
    inputSchema: {
      type: "object",
      properties: { packId: { type: "string", description: "The pack handle returned by context.build (or found via the CLI's pack list)." } },
      required: ["packId"],
    },
    operation: "context.get",
  },
];

export interface ToolCallOutcome {
  isError: boolean;
  /** JSON-serializable dispatch envelope result (ok) or error (not ok). */
  payload: unknown;
  /** Compact model-facing text (the serialized payload; on error, CODE: message). */
  text: string;
}

/**
 * Execute one tool call through the versioned dispatcher. Never throws —
 * every failure mode becomes a tool EXECUTION error (isError: true), the
 * MCP taxonomy for business/input failures the model can react to; only
 * unknown tool names are protocol errors handled by the server itself.
 */
export async function callTool(engine: ContextEngine, name: string, args: unknown): Promise<ToolCallOutcome> {
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (tool === undefined) {
    throw new UnknownToolError(name);
  }
  const envelope = {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: tool.operation,
    request: args ?? {},
  } as const;
  const response = await dispatch(engine, envelope);
  if (response.ok) {
    return { isError: false, payload: response.result, text: JSON.stringify(response.result) };
  }
  return {
    isError: true,
    payload: { ok: false, error: response.error },
    text: `${response.error.code}: ${response.error.message}`,
  };
}

export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool: ${name}`);
    this.name = "UnknownToolError";
  }
}
