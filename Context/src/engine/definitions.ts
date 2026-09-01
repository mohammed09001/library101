/**
 * ContextDefinition create/get/sync orchestration (Task 24 — Persistent
 * Sync mode). A definition is a persisted, reusable pack-building recipe
 * (src/contracts/definitions.ts); syncing it re-runs the exact same
 * retrieval/normalization/privacy/dedup/budget pipeline `computePack()`
 * already owns (src/engine/packs.ts) — zero duplicated assembly logic —
 * and only persists a new pack when the result's content-addressed
 * `packHash` actually differs from the currently-bound pack's, i.e. when
 * an underlying source's revision genuinely changed.
 */
import type { AgentIdentity, ContextRequest } from "../contracts/types.ts";
import type { BuildPackItemInput, ContextPack } from "../contracts/packs.ts";
import type { ContextDefinition } from "../contracts/definitions.ts";
import { NotFoundError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import { newId } from "./ids.ts";
import { buildPack, previewPack, getPack } from "./packs.ts";
import type { ProviderRegistry } from "./registry.ts";
import type { ContextStore } from "./store.ts";

export interface CreateDefinitionInput {
  name?: string;
  request: ContextRequest;
  items: BuildPackItemInput[];
  rankingVersion: string;
  creationReason: string;
  boundProjectionRef?: string;
  createdBy: AgentIdentity;
}

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
}

/** Persists a recipe only — does not build a pack yet. The first `syncDefinition` call does the first build. */
export function createDefinition(store: ContextStore, input: CreateDefinitionInput): ContextDefinition {
  requireNonEmpty(input.rankingVersion, "rankingVersion");
  requireNonEmpty(input.creationReason, "creationReason");
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ValidationError("items must be a non-empty array");
  }
  const definition: ContextDefinition = {
    definitionId: newId("def"),
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    // Derived, never separately caller-supplied — avoids drift (Anti-Accumulation Rule).
    projectKey: input.request.project.projectKey,
    request: input.request,
    items: input.items,
    rankingVersion: input.rankingVersion,
    creationReason: input.creationReason,
    currentPackId: null,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    lastSyncedAt: null,
    lastSyncOutcome: null,
  };
  if (input.name !== undefined) definition.name = input.name;
  if (input.boundProjectionRef !== undefined) definition.boundProjectionRef = input.boundProjectionRef;
  store.insertDefinition(definition);
  store.appendEvent("context.definition.created", {
    definitionId: definition.definitionId,
    projectKey: definition.projectKey,
  });
  return definition;
}

export function getDefinitionImpl(store: ContextStore, definitionId: string): ContextDefinition {
  const definition = store.getDefinition(definitionId);
  if (definition === undefined) {
    throw new NotFoundError(`no definition found with id '${definitionId}'`);
  }
  return definition;
}

export interface SyncResult {
  definition: ContextDefinition;
  pack: ContextPack;
  changed: boolean;
}

/**
 * Regenerates a definition's bound pack when the underlying (authorized —
 * i.e. subject to the definition's own bound `privacyPolicy`/dedup/pin
 * filtering, nothing new) source content has changed. Previews first
 * (pure, no store write); only calls the real `buildPack()` when the
 * fresh `packHash` differs from the currently-bound pack's — or when
 * there is no prior pack at all.
 */
export async function syncDefinition(
  store: ContextStore,
  registry: ProviderRegistry,
  definitionId: string,
): Promise<SyncResult> {
  const definition = getDefinitionImpl(store, definitionId);
  const buildInput = {
    request: definition.request,
    items: definition.items,
    rankingVersion: definition.rankingVersion,
    creationReason: definition.creationReason,
    createdBy: definition.createdBy,
    mode: "sync" as const,
  };

  const priorPack = definition.currentPackId !== null ? getPack(store, definition.currentPackId) : null;
  const preview = await previewPack(registry, buildInput);
  const changed = priorPack === null || preview.packHash !== priorPack.packHash;

  const pack = changed ? await buildPack(store, registry, buildInput) : priorPack!;
  const lastSyncedAt = new Date().toISOString();
  const outcome: "created" | "unchanged" = changed ? "created" : "unchanged";
  store.updateDefinitionAfterSync(definitionId, pack.packId, lastSyncedAt, outcome);
  store.appendEvent("context.definition.synced", {
    definitionId,
    packId: pack.packId,
    changed,
  });

  return {
    definition: { ...definition, currentPackId: pack.packId, lastSyncedAt, lastSyncOutcome: outcome },
    pack,
    changed,
  };
}
