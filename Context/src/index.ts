/**
 * Public module surface of the Library Context Engine.
 *
 * This is the ONLY supported import path for other packages/engines.
 * Internals (`src/engine/normalize.ts`, `src/engine/registry.ts`) are not
 * re-exported here as a stable surface; callers use ContextEngine, the
 * versioned contract dispatcher, or the CLI.
 */
export { ContextEngine, defaultStorePath } from "./engine/contextEngine.ts";
export type { ContextEngineOptions } from "./engine/contextEngine.ts";
export { dispatch } from "./engine/dispatcher.ts";
export { ProviderRegistry } from "./engine/registry.ts";
export { validateContextRequest } from "./engine/normalize.ts";
export { normalizeCandidate } from "./engine/normalizeCandidate.ts";
export type { BudgetConsumption, BuildPackInput, BuildPackItemInput, DetachResult, ExplainResult, ListPacksFilter, ListPacksResult, SweepResult } from "./engine/packs.ts";
export type { CreateDefinitionInput, SyncResult } from "./engine/definitions.ts";
export type { AutoContextResult, RunAutoContextInput, SetAutoContextPolicyInput } from "./engine/autoContext.ts";
export type { InvalidateAffectedPacksInput, InvalidateAffectedPacksResult } from "./engine/invalidation.ts";
export type { ItemDiff, ItemDiffKind, ReplayResult } from "./engine/replay.ts";
export { selectCandidates } from "./engine/selector.ts";
export type { SelectInput, SelectedItem, SelectExclusion, SelectExclusionReason, SelectResult } from "./engine/selector.ts";
export { scoreCandidate, rankCandidates, scorePathOverlap, DETERMINISTIC_BASELINE_ALGORITHM, DEFAULT_WEIGHTS } from "./engine/relevance.ts";
export type { RelevanceScore, RelevanceWeights, RankedCandidate } from "./engine/relevance.ts";
export { pickCanonical, deduplicateCandidates } from "./engine/dedup.ts";
export type { DedupExclusion, DeduplicationResult } from "./engine/dedup.ts";
export { isPinned } from "./engine/pinning.ts";
export { isWithinPrivacyCeiling } from "./engine/privacy.ts";
export { applyDiversityPolicy } from "./engine/diversity.ts";
export {
  CONTEXT_OPERATIONS,
  isContextOperation,
  type ContextOperation,
  type ContextRequestEnvelope,
  type ContextResponseEnvelope,
} from "./contracts/operations.ts";
export { CONTEXT_ENGINE_CONTRACT_VERSION, CONTEXT_ENGINE_ID } from "./contracts/version.ts";
export {
  AutoContextForbiddenError,
  ConflictError,
  ContextEngineError,
  ContractMismatchError,
  MigrationError,
  NotFoundError,
  PrivacyViolationError,
  ProviderContractViolationError,
  ProviderUnavailableError,
  StoreUnavailableError,
  ValidationError,
} from "./contracts/errors.ts";
export type { ContextErrorCode, ProviderProbeResult } from "./contracts/types.ts";
export type {
  ActorKind,
  AgentIdentity,
  CallerCapabilities,
  ContextRequest,
  DoctorReport,
  EngineEvent,
  FreshnessWindow,
  PrivacyClass,
  PrivacyPolicy,
  ProviderId,
  SessionContext,
  SessionCurrentFile,
  SessionSelection,
  TaskMode,
  TokenBudget,
} from "./contracts/types.ts";
export { KNOWN_PROVIDER_IDS, TASK_MODES } from "./contracts/types.ts";
export type {
  ContextCandidate,
  ContextCandidateRef,
  ContextProvider,
  ProviderCapability,
  ProviderCostHint,
  ProviderDeclaration,
  ProviderFreshnessHint,
  ProviderHealth,
  ProviderPrivacyHint,
  ProviderRelevanceHint,
} from "./contracts/providers.ts";
export type {
  CandidateAuthority,
  CandidateAuthorityTier,
  CandidateProvenance,
  NormalizedContextCandidate,
  RelevanceSignals,
} from "./contracts/candidates.ts";
export type {
  ContextPack,
  ContextPackExclusion,
  ContextPackExclusionReason,
  ContextPackItem,
  ContextPackStatus,
  PackAttachment,
  PackSummary,
} from "./contracts/packs.ts";
export type { ContextDefinition } from "./contracts/definitions.ts";
export type { AutoContextPolicy } from "./contracts/autoContext.ts";
export { ProjectFilesProvider } from "./providers/projectFilesProvider.ts";
export type { ProjectFilesProviderOptions } from "./providers/projectFilesProvider.ts";
export { MemoryContextProvider } from "./providers/memoryContextProvider.ts";
export type { MemoryContextProviderOptions } from "./providers/memoryContextProvider.ts";
export { StudyContextProvider } from "./providers/studyContextProvider.ts";
export type { StudyContextProviderOptions } from "./providers/studyContextProvider.ts";
export { PerformanceContextProvider } from "./providers/performanceContextProvider.ts";
export type { PerformanceContextProviderOptions } from "./providers/performanceContextProvider.ts";
export { RepositoryMapContextProvider } from "./providers/repositoryMapContextProvider.ts";
export type { RepositoryMapContextProviderOptions } from "./providers/repositoryMapContextProvider.ts";
export { GitHistoryContextProvider } from "./providers/gitHistoryContextProvider.ts";
export type { GitHistoryContextProviderOptions } from "./providers/gitHistoryContextProvider.ts";
export { CurrentSessionContextProvider } from "./providers/currentSessionContextProvider.ts";
export { CliUnavailableError, callContract, callDoctor, resolveSiblingCli, runCliJson } from "./providers/cliContractClient.ts";
export type { RunCliOptions } from "./providers/cliContractClient.ts";
