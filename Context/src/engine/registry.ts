/**
 * Provider registry (Task 3) — the single owner of which ContextProviders
 * are known to this engine instance. Registration is in-process only (no
 * persistence yet): callers register provider objects at startup.
 *
 * Fail-soft by design: a provider that throws during discover() is caught
 * and reported as degraded in the aggregate result rather than failing the
 * whole call, so one broken/absent provider (or sibling engine, or network)
 * never takes down context assembly for every other provider.
 */
import type {
  ContextCandidateRef,
  ContextProvider,
  ProviderCapability,
  ProviderDeclaration,
  ProviderProbeResult,
} from "../contracts/providers.ts";
import type { ContextRequest, ProviderId } from "../contracts/types.ts";
import { NotFoundError, ValidationError } from "../contracts/errors.ts";

const DECLARATION_FIELDS = [
  "id",
  "displayName",
  "description",
  "capabilities",
  "cost",
  "freshness",
  "privacy",
  "deprecated",
] as const;

function validateDeclaration(declaration: unknown): void {
  if (declaration === null || typeof declaration !== "object") {
    throw new ValidationError("provider.declaration must be an object");
  }
  const obj = declaration as Record<string, unknown>;
  const missing = DECLARATION_FIELDS.filter((f) => f !== "deprecated" && obj[f] === undefined);
  if (missing.length > 0) {
    throw new ValidationError(`provider.declaration missing field(s): ${missing.join(", ")}`);
  }
  if (typeof obj["id"] !== "string" || obj["id"].length === 0) {
    throw new ValidationError("provider.declaration.id must be a non-empty string");
  }
  if (!Array.isArray(obj["capabilities"])) {
    throw new ValidationError("provider.declaration.capabilities must be an array");
  }
}

export interface ProviderDiscoveryResult {
  providerId: ProviderId;
  refs: ContextCandidateRef[];
}

export interface ProviderScopeDenial {
  providerId: ProviderId;
  projectKey: string;
  message: string;
}

export interface DiscoverAllResult {
  results: ProviderDiscoveryResult[];
  /** Provider ids that were consulted but failed, or were skipped as unavailable. */
  degraded: Array<{ providerId: ProviderId; message: string }>;
  /** Deprecated-but-available providers that WERE consulted (Task 7) — not an error. */
  warnings: Array<{ providerId: ProviderId; message: string }>;
  /** Task 35: providers NOT consulted because their declared grant does not cover this request's project (reduced coverage, disclosed). */
  denied: ProviderScopeDenial[];
}

/**
 * Task 35: the ONE grant decision (Task 35's permission boundary). A
 * provider without declared grants is unrestricted; a granted provider
 * serves exactly its declared project keys PLUS whatever the request's
 * explicit `providerScopeOverrides` policy adds — cross-project retrieval
 * requires that caller policy, never provider initiative.
 */
export function isProviderGranted(declaration: ProviderDeclaration, request: ContextRequest): boolean {
  const grants = declaration.grantedProjectKeys;
  if (grants === undefined) return true;
  const projectKey = request.project.projectKey;
  if (grants.includes(projectKey)) return true;
  const override = request.providerScopeOverrides?.find((o) => o.providerId === declaration.id);
  return override !== undefined && override.projectKeys.includes(projectKey);
}

export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, ContextProvider>();

  register(provider: ContextProvider): void {
    validateDeclaration(provider.declaration);
    const id = provider.declaration.id;
    if (this.providers.has(id)) {
      throw new ValidationError(`provider id '${id}' is already registered`);
    }
    this.providers.set(id, provider);
  }

  list(): ProviderDeclaration[] {
    return [...this.providers.values()].map((p) => p.declaration);
  }

  get(id: ProviderId): ContextProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new NotFoundError(`no provider registered with id '${id}'`);
    }
    return provider;
  }

  size(): number {
    return this.providers.size;
  }

  listByCapability(capability: ProviderCapability): ProviderDeclaration[] {
    return this.list().filter((d) => d.capabilities.includes(capability));
  }

  /**
   * Probe one provider's health. Never throws: a `healthCheck()` that
   * itself throws is reported as unavailable, same as one that resolves
   * `{available: false}`.
   */
  async probe(id: ProviderId): Promise<ProviderProbeResult> {
    const provider = this.get(id);
    const deprecated = provider.declaration.deprecated;
    const base = {
      providerId: id,
      deprecated: deprecated !== undefined,
      ...(deprecated !== undefined ? { deprecationMessage: deprecated.message } : {}),
    };
    try {
      const health = await provider.healthCheck();
      return {
        ...base,
        available: health.available,
        degraded: health.degraded,
        ...(health.message !== undefined ? { message: health.message } : {}),
      };
    } catch (err) {
      return {
        ...base,
        available: false,
        degraded: true,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async probeAll(): Promise<ProviderProbeResult[]> {
    return Promise.all([...this.providers.keys()].map((id) => this.probe(id)));
  }

  /**
   * Task 36: probe exactly the named providers (registered ones only —
   * unknown ids are ignored) and return those that are unavailable or
   * degraded, with their own health message. Bounded by the caller's item
   * set, not the whole registry — the build envelope's degradation
   * disclosure names only providers the build actually touched.
   */
  async probeProviders(ids: readonly ProviderId[]): Promise<Array<{ providerId: ProviderId; message: string }>> {
    const unique = [...new Set(ids)];
    const probes = await Promise.all(
      unique.map(async (id) => {
        if (!this.providers.has(id)) return null;
        const probe = await this.probe(id);
        if (probe.available && !probe.degraded) return null;
        return {
          providerId: id,
          message: probe.message ?? (probe.deprecated ? "provider is deprecated" : "provider reported degraded health"),
        };
      }),
    );
    return probes.filter((p): p is { providerId: ProviderId; message: string } => p !== null);
  }

  private eligibleProviders(request: ContextRequest): ContextProvider[] {
    const allowed = request.allowedProviders;
    const forbidden = new Set(request.forbiddenProviders ?? []);
    return [...this.providers.values()].filter((p) => {
      const id = p.declaration.id;
      if (forbidden.has(id)) return false;
      if (allowed && !allowed.includes(id)) return false;
      return true;
    });
  }

  /**
   * Discover candidate references across every eligible, registered
   * provider. Never throws. Task 7: each eligible provider is PROBED first
   * — an unavailable one is skipped (discover() is never called on it) and
   * recorded in `degraded` straight from the probe message, cheaper and
   * more honest than calling discover() and hoping it throws consistently.
   * A deprecated-but-available provider is still consulted and surfaces in
   * `warnings` instead of `degraded` — deprecation is a warning, not a
   * failure.
   */
  async discoverAll(request: ContextRequest): Promise<DiscoverAllResult> {
    const results: ProviderDiscoveryResult[] = [];
    const degraded: Array<{ providerId: ProviderId; message: string }> = [];
    const warnings: Array<{ providerId: ProviderId; message: string }> = [];
    const denied: ProviderScopeDenial[] = [];
    const projectKey = request.project.projectKey;
    for (const provider of this.eligibleProviders(request)) {
      const id = provider.declaration.id;
      // Task 35: the permission boundary runs BEFORE probing — a provider
      // not granted this project is never consulted at all, and the reduced
      // coverage is disclosed rather than silent.
      if (!isProviderGranted(provider.declaration, request)) {
        denied.push({
          providerId: id,
          projectKey,
          message: `provider '${id}' is not granted for project '${projectKey}' (declared: ${(provider.declaration.grantedProjectKeys ?? []).join(", ") || "none"}); cross-project retrieval requires an explicit providerScopeOverrides policy`,
        });
        continue;
      }
      const probe = await this.probe(id);
      if (!probe.available) {
        degraded.push({
          providerId: id,
          message: probe.message ?? "provider reported itself unavailable",
        });
        continue;
      }
      if (probe.deprecated) {
        warnings.push({
          providerId: id,
          message: probe.deprecationMessage ?? "provider is deprecated",
        });
      }
      try {
        const refs = await provider.discover(request);
        results.push({ providerId: id, refs });
      } catch (err) {
        degraded.push({
          providerId: id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { results, degraded, warnings, denied };
  }
}
