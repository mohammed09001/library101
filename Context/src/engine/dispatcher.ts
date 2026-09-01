/**
 * Contract dispatcher — the single owner of the versioned inter-engine call
 * envelope. Every external caller (sibling engine, agent, CLI) enters
 * through `dispatch`; nobody touches engine internals directly. No provider
 * private store access happens here: the dispatcher only ever calls through
 * `ContextEngine` methods, which in turn only ever call the `ContextProvider`
 * interface (discover/retrieve/healthCheck) — never a provider's internals.
 */
import {
  isContextOperation,
  type ContextOperation,
  type ContextRequestEnvelope,
  type ContextResponseEnvelope,
} from "../contracts/operations.ts";
import type { ProviderId } from "../contracts/types.ts";
import type { RelevanceScore } from "../contracts/candidates.ts";
import { ContextEngineError, ContractMismatchError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import type { ContextEngine } from "./contextEngine.ts";
import { checkString, checkTimestamp, requireObject, validateAgentIdentity, validateContextRequest } from "./normalize.ts";
import type { BuildPackInput, BuildPackItemInput, ListPacksFilter } from "./packs.ts";
import type { CreateDefinitionInput } from "./definitions.ts";
import type { RunAutoContextInput, SetAutoContextPolicyInput } from "./autoContext.ts";
import type { InvalidateAffectedPacksInput } from "./invalidation.ts";

function majorOf(version: string): string {
  return version.split(".")[0] ?? version;
}

/**
 * Dispatch a versioned contract call. Never throws: failures are returned
 * as typed error envelopes so remote/engine callers can inspect codes.
 */
export async function dispatch(
  engine: ContextEngine,
  envelope: ContextRequestEnvelope,
): Promise<ContextResponseEnvelope> {
  try {
    if (!isContextOperation(envelope.operation)) {
      return {
        ok: false,
        contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
        operation: null,
        error: {
          code: "CONTEXT_VALIDATION_FAILED",
          message: `unknown operation '${String(envelope.operation)}'`,
        },
      };
    }
    if (majorOf(envelope.contractVersion) !== majorOf(CONTEXT_ENGINE_CONTRACT_VERSION)) {
      throw new ContractMismatchError(
        `caller contractVersion '${envelope.contractVersion}' is incompatible with engine contract '${CONTEXT_ENGINE_CONTRACT_VERSION}' (major must match)`,
      );
    }
    const result = await route(engine, envelope.operation, envelope.request);
    return {
      ok: true,
      contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
      operation: envelope.operation,
      result,
    };
  } catch (err) {
    const code = err instanceof ContextEngineError ? err.code : "CONTEXT_ENGINE_UNEXPECTED";
    return {
      ok: false,
      contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
      operation: isContextOperation(envelope.operation) ? envelope.operation : null,
      error: {
        code,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function parseSelectInput(request: unknown): { request: ReturnType<typeof validateContextRequest>; maxCandidatesPerProvider?: number; maxItems?: number } {
  const obj = requireObject(request, "request");
  const contextRequest = validateContextRequest(obj["request"]);
  const maxCandidatesPerProviderRaw = obj["maxCandidatesPerProvider"];
  const maxItemsRaw = obj["maxItems"];
  if (maxCandidatesPerProviderRaw !== undefined && typeof maxCandidatesPerProviderRaw !== "number") {
    throw new ValidationError("maxCandidatesPerProvider must be a number");
  }
  if (maxItemsRaw !== undefined && typeof maxItemsRaw !== "number") {
    throw new ValidationError("maxItems must be a number");
  }
  return {
    request: contextRequest,
    ...(typeof maxCandidatesPerProviderRaw === "number" ? { maxCandidatesPerProvider: maxCandidatesPerProviderRaw } : {}),
    ...(typeof maxItemsRaw === "number" ? { maxItems: maxItemsRaw } : {}),
  };
}

/** Task 22: light validation of a caller-supplied score breakdown — checks the three required `RelevanceScore` fields' types, trusts the rest (an opaque explainability annotation, not an enforced domain rule). */
function parseScore(raw: unknown, field: string): RelevanceScore | undefined {
  if (raw === undefined) return undefined;
  const obj = requireObject(raw, field);
  if (typeof obj["pinned"] !== "boolean") {
    throw new ValidationError(`${field}.pinned must be a boolean`);
  }
  if (typeof obj["compositeScore"] !== "number") {
    throw new ValidationError(`${field}.compositeScore must be a number`);
  }
  if (typeof obj["authority"] !== "number") {
    throw new ValidationError(`${field}.authority must be a number`);
  }
  return obj as unknown as RelevanceScore;
}

/** Shared item-list parsing — reused by `context.build`/`context.preview` and `context.definition.create`. */
function parseBuildPackItems(itemsRaw: unknown): BuildPackItemInput[] {
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    throw new ValidationError("items must be a non-empty array");
  }
  return itemsRaw.map((raw, i) => {
    const itemObj = requireObject(raw, `items[${i}]`);
    const providerId = checkString(itemObj["providerId"], `items[${i}].providerId`, 128) as ProviderId;
    const ref = checkString(itemObj["ref"], `items[${i}].ref`, 512) as string;
    const title = checkString(itemObj["title"], `items[${i}].title`, 512, { required: false });
    const score = parseScore(itemObj["score"], `items[${i}].score`);
    return {
      providerId,
      ref,
      ...(title !== undefined ? { title } : {}),
      ...(score !== undefined ? { score } : {}),
    };
  });
}

/** Task 23: light validation of the optional `mode`/`ttlSeconds` fields. */
function parseModeAndTtl(obj: Record<string, unknown>): { mode?: "attach" | "sync"; ttlSeconds?: number } {
  const modeRaw = obj["mode"];
  if (modeRaw !== undefined && modeRaw !== "attach" && modeRaw !== "sync") {
    throw new ValidationError("mode must be 'attach' or 'sync'");
  }
  const ttlSecondsRaw = obj["ttlSeconds"];
  if (ttlSecondsRaw !== undefined && typeof ttlSecondsRaw !== "number") {
    throw new ValidationError("ttlSeconds must be a number");
  }
  return {
    ...(modeRaw !== undefined ? { mode: modeRaw as "attach" | "sync" } : {}),
    ...(typeof ttlSecondsRaw === "number" ? { ttlSeconds: ttlSecondsRaw } : {}),
  };
}

function parseBuildPackInput(request: unknown): BuildPackInput {
  const obj = requireObject(request, "request");
  const contextRequest = validateContextRequest(obj["request"]);
  const items = parseBuildPackItems(obj["items"]);
  const rankingVersion = checkString(obj["rankingVersion"], "rankingVersion", 128) as string;
  const creationReason = checkString(obj["creationReason"], "creationReason", 1024) as string;
  const createdBy = validateAgentIdentity(obj["createdBy"], "createdBy") as NonNullable<
    ReturnType<typeof validateAgentIdentity>
  >;
  const requestId = checkString(obj["requestId"], "requestId", 128, { required: false });
  const idempotencyKey = checkString(obj["idempotencyKey"], "idempotencyKey", 128, { required: false });

  const dedupeByHashRaw = obj["dedupeByHash"];
  if (dedupeByHashRaw !== undefined && typeof dedupeByHashRaw !== "boolean") {
    throw new ValidationError("dedupeByHash must be a boolean");
  }

  const input: BuildPackInput = {
    request: contextRequest,
    items,
    rankingVersion,
    creationReason,
    createdBy,
    ...parseModeAndTtl(obj),
    ...(typeof dedupeByHashRaw === "boolean" ? { dedupeByHash: dedupeByHashRaw } : {}),
  };
  if (requestId !== undefined) input.requestId = requestId;
  if (idempotencyKey !== undefined) input.idempotencyKey = idempotencyKey;
  return input;
}

function parseCreateDefinitionInput(request: unknown): CreateDefinitionInput {
  const obj = requireObject(request, "request");
  const contextRequest = validateContextRequest(obj["request"]);
  const items = parseBuildPackItems(obj["items"]);
  const rankingVersion = checkString(obj["rankingVersion"], "rankingVersion", 128) as string;
  const creationReason = checkString(obj["creationReason"], "creationReason", 1024) as string;
  const createdBy = validateAgentIdentity(obj["createdBy"], "createdBy") as NonNullable<
    ReturnType<typeof validateAgentIdentity>
  >;
  const name = checkString(obj["name"], "name", 256, { required: false });
  const boundProjectionRef = checkString(obj["boundProjectionRef"], "boundProjectionRef", 512, { required: false });

  return {
    request: contextRequest,
    items,
    rankingVersion,
    creationReason,
    createdBy,
    ...(name !== undefined ? { name } : {}),
    ...(boundProjectionRef !== undefined ? { boundProjectionRef } : {}),
  };
}

function parseRunAutoContextInput(request: unknown): RunAutoContextInput {
  const obj = requireObject(request, "request");
  const contextRequest = validateContextRequest(obj["request"]);
  const maxCandidatesPerProviderRaw = obj["maxCandidatesPerProvider"];
  const maxItemsRaw = obj["maxItems"];
  if (maxCandidatesPerProviderRaw !== undefined && typeof maxCandidatesPerProviderRaw !== "number") {
    throw new ValidationError("maxCandidatesPerProvider must be a number");
  }
  if (maxItemsRaw !== undefined && typeof maxItemsRaw !== "number") {
    throw new ValidationError("maxItems must be a number");
  }
  const rankingVersion = checkString(obj["rankingVersion"], "rankingVersion", 128, { required: false });
  const creationReason = checkString(obj["creationReason"], "creationReason", 1024) as string;
  const createdBy = validateAgentIdentity(obj["createdBy"], "createdBy") as NonNullable<
    ReturnType<typeof validateAgentIdentity>
  >;
  const targetAgent = validateAgentIdentity(obj["targetAgent"], "targetAgent", { required: false });

  return {
    request: contextRequest,
    creationReason,
    createdBy,
    ...(typeof maxCandidatesPerProviderRaw === "number" ? { maxCandidatesPerProvider: maxCandidatesPerProviderRaw } : {}),
    ...(typeof maxItemsRaw === "number" ? { maxItems: maxItemsRaw } : {}),
    ...(rankingVersion !== undefined ? { rankingVersion } : {}),
    ...(targetAgent !== undefined ? { targetAgent } : {}),
  };
}

function parseSetAutoContextPolicyInput(request: unknown): SetAutoContextPolicyInput {
  const obj = requireObject(request, "request");
  const projectKey = checkString(obj["projectKey"], "projectKey", 128) as string;
  const allowAutomaticAttachmentRaw = obj["allowAutomaticAttachment"];
  if (typeof allowAutomaticAttachmentRaw !== "boolean") {
    throw new ValidationError("allowAutomaticAttachment must be a boolean");
  }
  const actor = validateAgentIdentity(obj["actor"], "actor") as NonNullable<
    ReturnType<typeof validateAgentIdentity>
  >;
  return { projectKey, allowAutomaticAttachment: allowAutomaticAttachmentRaw, actor };
}

/** Task 29: validated filters for the bounded `context.list` pack listing. */
function parseListPacksFilter(request: unknown): ListPacksFilter {
  const obj = requireObject(request, "request");
  const projectKey = checkString(obj["projectKey"], "projectKey", 128, { required: false });
  const statusRaw = obj["status"];
  if (statusRaw !== undefined && statusRaw !== "active" && statusRaw !== "invalidated" && statusRaw !== "expired") {
    throw new ValidationError("status must be 'active', 'invalidated' or 'expired'");
  }
  const modeRaw = obj["mode"];
  if (modeRaw !== undefined && modeRaw !== "attach" && modeRaw !== "sync") {
    throw new ValidationError("mode must be 'attach' or 'sync'");
  }
  const limitRaw = obj["limit"];
  if (limitRaw !== undefined && (typeof limitRaw !== "number" || !Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 500)) {
    throw new ValidationError("limit must be an integer between 1 and 500");
  }
  return {
    ...(projectKey !== undefined ? { projectKey } : {}),
    ...(statusRaw !== undefined ? { status: statusRaw as "active" | "invalidated" | "expired" } : {}),
    ...(modeRaw !== undefined ? { mode: modeRaw as "attach" | "sync" } : {}),
    ...(typeof limitRaw === "number" ? { limit: limitRaw } : {}),
  };
}

function parseInvalidateAffectedInput(request: unknown): InvalidateAffectedPacksInput {
  const obj = requireObject(request, "request");
  const providerId = checkString(obj["providerId"], "providerId", 128) as ProviderId;
  const ref = checkString(obj["ref"], "ref", 512, { required: false });
  const currentContentHash = checkString(obj["currentContentHash"], "currentContentHash", 128, { required: false });
  const currentProviderVersion = checkString(obj["currentProviderVersion"], "currentProviderVersion", 128, { required: false });
  const actor = validateAgentIdentity(obj["actor"], "actor") as NonNullable<
    ReturnType<typeof validateAgentIdentity>
  >;
  const reason = checkString(obj["reason"], "reason", 1024, { required: false });

  return {
    providerId,
    actor,
    ...(ref !== undefined ? { ref } : {}),
    ...(currentContentHash !== undefined ? { currentContentHash } : {}),
    ...(currentProviderVersion !== undefined ? { currentProviderVersion } : {}),
    ...(reason !== undefined ? { reason } : {}),
  };
}

/**
 * Task 36: the build/preview result envelope carries an explicit
 * degradation disclosure — every provider the build touched is probed and
 * any unavailable/degraded one is named with its own health message, so a
 * reduced-coverage build is never mistaken for a complete one. Item-level
 * failures remain in `pack.exclusions`; this discloses the provider-wide
 * health behind them.
 */
async function buildEnvelopeResult(engine: ContextEngine, input: BuildPackInput, preview: boolean): Promise<unknown> {
  const pack = preview ? await engine.previewPack(input) : await engine.buildPack(input);
  const touched = input.items.map((i) => i.providerId);
  const degradedProviders = await engine.registry.probeProviders(touched);
  return {
    ...(preview ? { persisted: false as const } : {}),
    pack,
    ...(degradedProviders.length > 0 ? { degradedProviders } : {}),
  };
}

async function route(engine: ContextEngine, operation: ContextOperation, request: unknown): Promise<unknown> {  switch (operation) {
    case "context.request.validate":
      return { request: engine.validateRequest(request) };
    case "context.providers.list":
      return { providers: engine.listProviders() };
    case "context.providers.discover": {
      const obj = requireObject(request, "request");
      const contextRequest = validateContextRequest(obj["request"]);
      return engine.discoverAll(contextRequest);
    }
    case "context.select":
      return engine.selectCandidates(parseSelectInput(request));
    case "context.build":
      return buildEnvelopeResult(engine, parseBuildPackInput(request), false);
    case "context.preview":
      return buildEnvelopeResult(engine, parseBuildPackInput(request), true);
    case "context.attach": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      const target = validateAgentIdentity(obj["target"], "target") as NonNullable<
        ReturnType<typeof validateAgentIdentity>
      >;
      const note = checkString(obj["note"], "note", 1024, { required: false });
      return { attachment: engine.attachPack(packId, target, note) };
    }
    case "context.detach": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      const attachmentId = checkString(obj["attachmentId"], "attachmentId", 128) as string;
      const actor = validateAgentIdentity(obj["actor"], "actor") as NonNullable<
        ReturnType<typeof validateAgentIdentity>
      >;
      return engine.detachPack(packId, attachmentId, actor);
    }
    case "context.list":
      return engine.listPacks(parseListPacksFilter(request));
    case "context.get": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      return { pack: engine.getPack(packId) };
    }
    case "context.explain": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      return engine.explainPack(packId);
    }
    case "context.invalidate": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      const actor = validateAgentIdentity(obj["actor"], "actor") as NonNullable<
        ReturnType<typeof validateAgentIdentity>
      >;
      const reason = checkString(obj["reason"], "reason", 1024) as string;
      return { pack: engine.invalidatePack(packId, actor, reason) };
    }
    case "context.health":
      return engine.doctor();
    case "context.sweep": {
      const obj = requireObject(request, "request");
      const at = checkTimestamp(obj["at"], "at");
      return engine.sweepExpiredPacks(at);
    }
    case "context.promote": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      const actor = validateAgentIdentity(obj["actor"], "actor") as NonNullable<
        ReturnType<typeof validateAgentIdentity>
      >;
      return { pack: engine.promotePack(packId, actor) };
    }
    case "context.definition.create":
      return { definition: engine.createDefinition(parseCreateDefinitionInput(request)) };
    case "context.definition.get": {
      const obj = requireObject(request, "request");
      const definitionId = checkString(obj["definitionId"], "definitionId", 128) as string;
      return { definition: engine.getDefinition(definitionId) };
    }
    case "context.definition.sync": {
      const obj = requireObject(request, "request");
      const definitionId = checkString(obj["definitionId"], "definitionId", 128) as string;
      return engine.syncDefinition(definitionId);
    }
    case "context.autoContext.run":
      return engine.runAutoContext(parseRunAutoContextInput(request));
    case "context.autoContext.getPolicy": {
      const obj = requireObject(request, "request");
      const projectKey = checkString(obj["projectKey"], "projectKey", 128) as string;
      return { policy: engine.getAutoContextPolicy(projectKey) };
    }
    case "context.autoContext.setPolicy":
      return { policy: engine.setAutoContextPolicy(parseSetAutoContextPolicyInput(request)) };
    case "context.getByHash": {
      const obj = requireObject(request, "request");
      const packHash = checkString(obj["packHash"], "packHash", 128) as string;
      const modeRaw = obj["mode"];
      if (modeRaw !== undefined && modeRaw !== "attach" && modeRaw !== "sync") {
        throw new ValidationError("mode must be 'attach' or 'sync'");
      }
      return { pack: engine.getPackByHash(packHash, modeRaw as "attach" | "sync" | undefined) };
    }
    case "context.invalidateAffected":
      return engine.invalidateAffectedPacks(parseInvalidateAffectedInput(request));
    case "context.replay": {
      const obj = requireObject(request, "request");
      const packId = checkString(obj["packId"], "packId", 128) as string;
      return engine.replayPack(packId);
    }
    case "context.projection.handoff": {
      const obj = requireObject(request, "request");
      const packIdRaw = obj["packId"];
      const projectionRefRaw = obj["projectionRef"];
      const definitionIdRaw = obj["definitionId"];
      if (packIdRaw === undefined && projectionRefRaw === undefined && definitionIdRaw === undefined) {
        throw new ValidationError("pass either packId+projectionRef or definitionId");
      }
      const input: {
        packId?: string;
        projectionRef?: string;
        definitionId?: string;
        projectionCliPath?: string;
        projectionStorePath?: string;
        timeoutMs?: number;
      } = {};
      if (packIdRaw !== undefined) input.packId = checkString(packIdRaw, "packId", 128);
      if (projectionRefRaw !== undefined) input.projectionRef = checkString(projectionRefRaw, "projectionRef", 512);
      if (definitionIdRaw !== undefined) input.definitionId = checkString(definitionIdRaw, "definitionId", 128);
      const projectionCliPath = obj["projectionCliPath"];
      const projectionStorePath = obj["projectionStorePath"];
      const timeoutMsRaw = obj["timeoutMs"];
      if (projectionCliPath !== undefined) input.projectionCliPath = checkString(projectionCliPath, "projectionCliPath", 1024);
      if (projectionStorePath !== undefined) input.projectionStorePath = checkString(projectionStorePath, "projectionStorePath", 1024);
      if (timeoutMsRaw !== undefined) {
        if (typeof timeoutMsRaw !== "number" || !Number.isFinite(timeoutMsRaw) || timeoutMsRaw <= 0) {
          throw new ValidationError("timeoutMs must be a positive finite number");
        }
        input.timeoutMs = timeoutMsRaw;
      }
      return { handoff: await engine.handoffPackToProjection(input) };
    }
    case "context.projection.listHandoffs": {
      const obj = requireObject(request, "request");
      const filter: { packId?: string; limit?: number } = {};
      const packIdRaw = obj["packId"];
      if (packIdRaw !== undefined) filter.packId = checkString(packIdRaw, "packId", 128);
      const limitRaw = obj["limit"];
      if (limitRaw !== undefined) {
        if (typeof limitRaw !== "number" || !Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 500) {
          throw new ValidationError("limit must be an integer between 1 and 500");
        }
        filter.limit = limitRaw;
      }
      return engine.listProjectionHandoffs(filter);
    }
  }
}
