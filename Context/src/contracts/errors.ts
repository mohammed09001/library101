/**
 * Typed error surface for the Library Context Engine.
 *
 * Failure behavior is explicit: the engine never silently degrades or
 * swallows a validation/provider failure. Every material failure is a typed
 * error carrying a stable machine-readable code so terminal/tool callers
 * and sibling engines can react without string matching.
 */
import type { ContextErrorCode } from "./types.ts";

export type { ContextErrorCode };

export class ContextEngineError extends Error {
  readonly code: ContextErrorCode;

  constructor(code: ContextErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ContextEngineError";
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class ValidationError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_VALIDATION_FAILED", message, options);
    this.name = "ValidationError";
  }
}

export class ContractMismatchError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_CONTRACT_MISMATCH", message, options);
    this.name = "ContractMismatchError";
  }
}

/** Raised when a registered provider fails discover/retrieve/healthCheck. */
export class ProviderUnavailableError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_PROVIDER_UNAVAILABLE", message, options);
    this.name = "ProviderUnavailableError";
  }
}

/** Raised when a provider's declaration or return shape violates the contract. */
export class ProviderContractViolationError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_PROVIDER_CONTRACT_VIOLATION", message, options);
    this.name = "ProviderContractViolationError";
  }
}

/**
 * Raised when a request or a provider declaration asks for material above
 * the privacy ceiling Context is allowed to surface.
 */
export class PrivacyViolationError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_PRIVACY_VIOLATION", message, options);
    this.name = "PrivacyViolationError";
  }
}

export class NotFoundError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_NOT_FOUND", message, options);
    this.name = "NotFoundError";
  }
}

/** Raised on a stale-state conflict, e.g. invalidating an already-invalidated pack. */
export class ConflictError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_CONFLICT", message, options);
    this.name = "ConflictError";
  }
}

export class StoreUnavailableError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_STORE_UNAVAILABLE", message, options);
    this.name = "StoreUnavailableError";
  }
}

export class MigrationError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_MIGRATION_FAILED", message, options);
    this.name = "MigrationError";
  }
}

/** Raised when an actor of kind "agent" attempts to enable automatic attachment (Task 25) — only a non-agent actor may set `allowAutomaticAttachment: true`. */
export class AutoContextForbiddenError extends ContextEngineError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("CONTEXT_AUTO_CONTEXT_FORBIDDEN", message, options);
    this.name = "AutoContextForbiddenError";
  }
}
