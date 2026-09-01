/**
 * Library Context Engine — public contract identity.
 *
 * The contract version governs the engine's public API surface, its event
 * vocabulary, and the canonical ContextRequest / provider declaration shapes
 * exposed to callers (sibling engines, CLI users, agents). Breaking changes
 * bump the major.
 */
export const CONTEXT_ENGINE_ID = "library.context-engine" as const;

export const CONTEXT_ENGINE_CONTRACT_VERSION = "1.14.0" as const;

export type ContractVersion = typeof CONTEXT_ENGINE_CONTRACT_VERSION;
