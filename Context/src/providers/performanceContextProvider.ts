/**
 * Performance Context Provider (Task 10): retrieves relevant historical
 * runs/lessons through Performance's own versioned contract only — never by
 * reading Performance's private store.
 *
 * Repository reality (verified 2026-08-30): there is no `Performance`
 * directory under `library101/` at all — not merely an empty placeholder
 * like `Study_Document` was for Task 9, genuinely absent. The Task Source
 * Requirement anticipates exactly this ("... with explicit unavailable
 * state if Performance is absent"), so this adapter follows Task 9's proven
 * pattern: build against an ANTICIPATED contract (`performance.search` /
 * `performance.get`), reuse the one shared CLI-subprocess mechanism
 * (`cliContractClient.ts`, Anti-Accumulation Rule), and prove it two honest
 * ways in `test/t10_performance_provider.test.ts` — a fixture fake CLI
 * (proves the request/response mapping) and the real, currently-absent
 * Performance path (proves genuine graceful unavailability, not a
 * fabricated success claim).
 *
 * "Historical runs/lessons": discover() -> `performance.search` returns
 * lightweight run refs; retrieve() -> `performance.get` fetches exactly the
 * caller-selected run's recorded lesson/summary text plus its metrics,
 * attached as `sourceMetadata` (same additive-payload pattern Task 8 used
 * for Memory's provenance).
 */
import type {
  ContextCandidate,
  ContextCandidateRef,
  ContextProvider,
  ProviderDeclaration,
  ProviderHealth,
} from "../contracts/providers.ts";
import type { ContextRequest } from "../contracts/types.ts";
import {
  CliUnavailableError,
  callContract,
  callDoctor,
  resolveSiblingCli,
} from "./cliContractClient.ts";

const DEFAULT_SEARCH_LIMIT = 20;

interface PerformanceRunRef {
  runId: string;
  title: string;
  outcome: string;
  estimatedTokens: number;
}

interface PerformanceRun extends PerformanceRunRef {
  /** The recorded lesson/summary text for this run — the literal "lessons" field. */
  lessons: string;
  metrics: Record<string, number>;
  recordedAt: string;
}

export interface PerformanceContextProviderOptions {
  /** Path to Performance's CLI entry point. Defaults to the sibling repo layout. */
  performanceCliPath?: string;
  /** Passed through as `--store <path>` on every invocation. */
  storePath?: string;
}

function defaultPerformanceCliPath(): string {
  return (
    process.env["LIBRARY_PERFORMANCE_ENGINE_CLI"] ??
    resolveSiblingCli("Performance", "src", "cli", "cli.ts")
  );
}

export class PerformanceContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly cliPath: string;
  private readonly storePath: string | undefined;

  constructor(options: PerformanceContextProviderOptions = {}) {
    this.cliPath = options.performanceCliPath ?? defaultPerformanceCliPath();
    this.storePath = options.storePath;
    this.declaration = {
      id: "performance",
      displayName: "Performance",
      description: "Historical run outcomes and lessons via Performance's versioned contract.",
      capabilities: ["performance_metrics"],
      cost: { relativeCost: "medium", network: true },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    };
  }

  private async call(operation: string, request: unknown): Promise<unknown> {
    const envelope = await callContract(this.cliPath, operation, request, { storePath: this.storePath });
    if (!envelope.ok) {
      const error = envelope.error;
      throw new Error(`Performance ${operation} failed: ${error?.code ?? "UNKNOWN"}: ${error?.message ?? "no message"}`);
    }
    return envelope.result;
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const searchRequest =
      request.freshness?.asOf !== undefined
        ? { scope: request.project.projectKey, asOf: request.freshness.asOf, limit: DEFAULT_SEARCH_LIMIT }
        : { scope: request.project.projectKey, limit: DEFAULT_SEARCH_LIMIT };
    const result = (await this.call("performance.search", searchRequest)) as { runs: PerformanceRunRef[] };
    return result.runs.map((r) => ({
      providerId: this.declaration.id,
      ref: r.runId,
      title: r.title,
      estimatedTokens: r.estimatedTokens,
    }));
  }

  async retrieve(_request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    for (const ref of refs) {
      const result = (await this.call("performance.get", { runId: ref.ref })) as PerformanceRun;
      out.push({
        providerId: this.declaration.id,
        ref: result.runId,
        title: result.title,
        estimatedTokens: Math.ceil(result.lessons.length / 4),
        content: result.lessons,
        retrievedAt: new Date().toISOString(),
        sourceMetadata: {
          runId: result.runId,
          outcome: result.outcome,
          metrics: result.metrics,
          recordedAt: result.recordedAt,
        },
      });
    }
    return out;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const report = (await callDoctor(this.cliPath, { storePath: this.storePath })) as {
        healthy: boolean;
        errorCode?: string;
        errorMessage?: string;
      };
      if (!report.healthy) {
        return {
          available: false,
          degraded: true,
          message: `Performance reports unhealthy: ${report.errorCode ?? ""} ${report.errorMessage ?? ""}`.trim(),
        };
      }
      return { available: true, degraded: false };
    } catch (err) {
      const message =
        err instanceof CliUnavailableError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      return { available: false, degraded: true, message };
    }
  }
}
