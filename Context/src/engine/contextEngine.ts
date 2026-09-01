/**
 * Library Context Engine — top-level entry point (Task 1, extended by
 * Tasks 4–6).
 *
 * Owns ContextRequest validation, the provider registry/capability
 * contract, candidate normalization, and immutable ContextPack build
 * records. Does NOT own Memory, Study, Performance or repository truth
 * (docs/BOUNDARY.md): it never reads a sibling engine's private store, only
 * calls providers that declare themselves through the ContextProvider
 * contract (docs/CONTRACTS.md).
 *
 * Store access is LAZY: the registry-only surface (registerProvider,
 * listProviders, validateRequest) never touches persistence, so it keeps
 * working exactly as in Execution 01 without requiring an explicit open().
 * The store opens on first pack-related call. `doctor()` never throws —
 * degraded state (a failed provider healthCheck, or a store that can't
 * open) is observable, not fatal.
 */
import type { AgentIdentity, ContextRequest, DoctorReport } from "../contracts/types.ts";
import type { ContextProvider, ProviderDeclaration } from "../contracts/providers.ts";
import type { ContextPack, PackAttachment } from "../contracts/packs.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import { validateContextRequest } from "./normalize.ts";
import { ProviderRegistry, type DiscoverAllResult } from "./registry.ts";
import { ContextStore } from "./store.ts";
import {
  attachPack as attachPackImpl,
  buildPack as buildPackImpl,
  detachPack as detachPackImpl,
  explainPack as explainPackImpl,
  getPack as getPackImpl,
  getPackByHash as getPackByHashImpl,
  invalidatePack as invalidatePackImpl,
  listPacks as listPacksImpl,
  previewPack as previewPackImpl,
  promotePack as promotePackImpl,
  sweepExpiredPacks as sweepExpiredPacksImpl,
  type BuildPackInput,
  type DetachResult,
  type ExplainResult,
  type ListPacksFilter,
  type ListPacksResult,
  type SweepResult,
} from "./packs.ts";
import {
  invalidateAffectedPacks as invalidateAffectedPacksImpl,
  type InvalidateAffectedPacksInput,
  type InvalidateAffectedPacksResult,
} from "./invalidation.ts";
import { replayPack as replayPackImpl, type ReplayResult } from "./replay.ts";
import {
  handoffPackToProjection as handoffPackToProjectionImpl,
  listProjectionHandoffs as listProjectionHandoffsImpl,
  type HandoffToProjectionInput,
  type ProjectionHandoffsFilter,
  type ProjectionHandoffsResult,
} from "./projection.ts";
import type { ProjectionHandoff } from "../contracts/projection.ts";
import {
  createDefinition as createDefinitionImpl,
  getDefinitionImpl,
  syncDefinition as syncDefinitionImpl,
  type CreateDefinitionInput,
  type SyncResult,
} from "./definitions.ts";
import type { ContextDefinition } from "../contracts/definitions.ts";
import { selectCandidates as selectCandidatesImpl, type SelectInput, type SelectResult } from "./selector.ts";
import {
  getAutoContextPolicy as getAutoContextPolicyImpl,
  runAutoContext as runAutoContextImpl,
  setAutoContextPolicy as setAutoContextPolicyImpl,
  type AutoContextResult,
  type RunAutoContextInput,
  type SetAutoContextPolicyInput,
} from "./autoContext.ts";
import type { AutoContextPolicy } from "../contracts/autoContext.ts";

export const DEFAULT_STORE_RELATIVE_PATH = "data/context-engine.db";

export function defaultStorePath(): string {
  return process.env["LIBRARY_CONTEXT_STORE"] ?? DEFAULT_STORE_RELATIVE_PATH;
}

export interface ContextEngineOptions {
  storePath?: string;
}

export class ContextEngine {
  readonly registry = new ProviderRegistry();
  readonly contractVersion = CONTEXT_ENGINE_CONTRACT_VERSION;
  private readonly store: ContextStore;

  constructor(options: ContextEngineOptions = {}) {
    this.store = new ContextStore(options.storePath ?? defaultStorePath());
  }

  close(): void {
    this.store.close();
  }

  validateRequest(input: unknown): ContextRequest {
    return validateContextRequest(input);
  }

  registerProvider(provider: ContextProvider): void {
    this.registry.register(provider);
  }

  listProviders(): ProviderDeclaration[] {
    return this.registry.list();
  }

  async discoverAll(request: ContextRequest): Promise<DiscoverAllResult> {
    return this.registry.discoverAll(request);
  }

  // ---- Task 15/16/17: the selector -------------------------------------

  async selectCandidates(input: SelectInput): Promise<SelectResult> {
    return selectCandidatesImpl(this.registry, input);
  }

  // ---- Task 5/6: pack lifecycle ---------------------------------------

  async previewPack(input: BuildPackInput): Promise<ContextPack> {
    return previewPackImpl(this.registry, input);
  }

  async buildPack(input: BuildPackInput): Promise<ContextPack> {
    return buildPackImpl(this.store, this.registry, input);
  }

  getPack(packId: string): ContextPack {
    return getPackImpl(this.store, packId);
  }

  explainPack(packId: string): ExplainResult {
    return explainPackImpl(this.store, packId);
  }

  invalidatePack(packId: string, actor: AgentIdentity, reason: string): ContextPack {
    return invalidatePackImpl(this.store, packId, actor, reason);
  }

  attachPack(packId: string, target: AgentIdentity, note?: string): PackAttachment {
    return attachPackImpl(this.store, packId, target, note);
  }

  // ---- Task 29 (Execution 12): detach + list ---------------------------

  detachPack(packId: string, attachmentId: string, actor: AgentIdentity): DetachResult {
    return detachPackImpl(this.store, packId, attachmentId, actor);
  }

  listPacks(filter: ListPacksFilter = {}): ListPacksResult {
    return listPacksImpl(this.store, filter);
  }

  // ---- Task 23: Temporary Attach mode ----------------------------------

  sweepExpiredPacks(at?: string): SweepResult {
    return at !== undefined ? sweepExpiredPacksImpl(this.store, at) : sweepExpiredPacksImpl(this.store);
  }

  promotePack(packId: string, actor: AgentIdentity): ContextPack {
    return promotePackImpl(this.store, packId, actor);
  }

  // ---- Task 24: Persistent Sync mode -----------------------------------

  createDefinition(input: CreateDefinitionInput): ContextDefinition {
    return createDefinitionImpl(this.store, input);
  }

  getDefinition(definitionId: string): ContextDefinition {
    return getDefinitionImpl(this.store, definitionId);
  }

  async syncDefinition(definitionId: string): Promise<SyncResult> {
    return syncDefinitionImpl(this.store, this.registry, definitionId);
  }

  // ---- Task 25: Auto-Context as opt-in gated mode ----------------------

  async runAutoContext(input: RunAutoContextInput): Promise<AutoContextResult> {
    return runAutoContextImpl(this.store, this.registry, input);
  }

  getAutoContextPolicy(projectKey: string): AutoContextPolicy | null {
    return getAutoContextPolicyImpl(this.store, projectKey);
  }

  setAutoContextPolicy(input: SetAutoContextPolicyInput): AutoContextPolicy {
    return setAutoContextPolicyImpl(this.store, input);
  }

  // ---- Tasks 26/27/28: hashing/cache keys, precise invalidation, replay ---

  getPackByHash(packHash: string, mode?: "attach" | "sync"): ContextPack | undefined {
    return getPackByHashImpl(this.store, packHash, mode);
  }

  invalidateAffectedPacks(input: InvalidateAffectedPacksInput): InvalidateAffectedPacksResult {
    return invalidateAffectedPacksImpl(this.store, input);
  }

  async replayPack(packId: string): Promise<ReplayResult> {
    return replayPackImpl(this.store, this.registry, packId);
  }

  // ---- Task 32 (Execution 13/14): producer-direction Projection handoff ---

  async handoffPackToProjection(input: HandoffToProjectionInput): Promise<ProjectionHandoff> {
    return handoffPackToProjectionImpl(this.store, input);
  }

  listProjectionHandoffs(filter: ProjectionHandoffsFilter = {}): ProjectionHandoffsResult {
    return listProjectionHandoffsImpl(this.store, filter);
  }

  /**
   * Health report. Never throws: a provider that fails healthCheck, or a
   * store that fails to open, is reported as unhealthy/degraded rather than
   * thrown.
   */
  async doctor(): Promise<DoctorReport> {
    const providerProbes = await this.registry.probeAll();
    const degraded = providerProbes
      .filter((p) => !p.available || p.degraded)
      .map((p) => p.providerId);

    const storeHealth = this.store.doctor();
    let eventCount = 0;
    if (storeHealth.healthy) {
      eventCount = this.store.countEvents();
    }
    return {
      healthy: storeHealth.healthy,
      contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
      registeredProviders: this.registry.size(),
      degradedProviders: degraded,
      providerProbes,
      storePath: this.store.storePath,
      existed: !this.store.created,
      journalMode: storeHealth.journalMode,
      integrity: storeHealth.integrity,
      appliedMigrations: storeHealth.healthy ? this.store.appliedMigrationVersions() : [],
      eventCount,
      ...(storeHealth.errorCode !== undefined
        ? { errorCode: storeHealth.errorCode, errorMessage: storeHealth.errorMessage }
        : {}),
    };
  }
}
