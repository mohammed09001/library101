/**
 * Memory Context Provider (Task 8): retrieves relevant current/historical
 * Memory records with bounded text and provenance, through Memory's own
 * versioned contract — never by reading Memory's SQLite store directly.
 *
 * "Current/historical" maps literally onto Memory's own `memory.search`
 * (current, `status: "active"`) vs. its bi-temporal `asOf` parameter
 * (historical belief view) — there is no fabricated relevance ranking here;
 * no selector exists yet (docs/BOUNDARY.md).
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

/** The Memory contract major this adapter was built and verified against. */
const EXPECTED_MEMORY_MAJOR = "1";
const DEFAULT_SEARCH_LIMIT = 20;

interface MemoryProvenance {
  actor: { kind: string; name: string; agentType?: string };
  method: string;
  capturedAt: string;
  sourceKind: string;
  derivedFrom?: unknown;
}

interface MemoryRecord {
  recordId: string;
  subject: string;
  content: string;
  scopeId: string;
  status: string;
  epistemicClass: string;
  confidence: number;
  provenance: MemoryProvenance;
}

export interface MemoryContextProviderOptions {
  /** Path to Memory's CLI entry point. Defaults to the sibling repo layout. */
  memoryCliPath?: string;
  /** Passed through as `--store <path>` on every invocation. */
  storePath?: string;
}

function defaultMemoryCliPath(): string {
  return (
    process.env["LIBRARY_MEMORY_ENGINE_CLI"] ?? resolveSiblingCli("Memory", "src", "cli", "cli.ts")
  );
}

export class MemoryContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly cliPath: string;
  private readonly storePath: string | undefined;

  constructor(options: MemoryContextProviderOptions = {}) {
    this.cliPath = options.memoryCliPath ?? defaultMemoryCliPath();
    this.storePath = options.storePath;
    this.declaration = {
      id: "memory",
      displayName: "Memory",
      description: "Durable Library knowledge (facts, decisions, preferences) via Memory's versioned contract.",
      capabilities: ["memory_records"],
      // A subprocess spawn genuinely crosses a process boundary (see the
      // `network` field's own doc comment in contracts/providers.ts).
      cost: { relativeCost: "medium", network: true },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "sensitive" },
      version: "1.0.0",
    };
  }

  private async call(operation: string, request: unknown): Promise<unknown> {
    const envelope = await callContract(this.cliPath, operation, request, { storePath: this.storePath });
    if (!envelope.ok) {
      const error = envelope.error;
      throw new Error(`Memory ${operation} failed: ${error?.code ?? "UNKNOWN"}: ${error?.message ?? "no message"}`);
    }
    return envelope.result;
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const asOf = request.freshness?.asOf;
    const searchRequest =
      asOf !== undefined
        ? { scope: request.project.projectKey, asOf, limit: DEFAULT_SEARCH_LIMIT }
        : { scope: request.project.projectKey, status: "active", limit: DEFAULT_SEARCH_LIMIT };
    const result = (await this.call("memory.search", searchRequest)) as { records: MemoryRecord[] };
    return result.records.map((r) => ({
      providerId: this.declaration.id,
      ref: r.recordId,
      title: r.subject,
      estimatedTokens: Math.ceil(r.content.length / 4),
    }));
  }

  async retrieve(_request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    for (const ref of refs) {
      const result = (await this.call("memory.get", { recordId: ref.ref })) as { record: MemoryRecord };
      const record = result.record;
      out.push({
        providerId: this.declaration.id,
        ref: record.recordId,
        title: record.subject,
        estimatedTokens: Math.ceil(record.content.length / 4),
        content: record.content,
        retrievedAt: new Date().toISOString(),
        sourceMetadata: {
          recordId: record.recordId,
          scopeId: record.scopeId,
          status: record.status,
          epistemicClass: record.epistemicClass,
          confidence: record.confidence,
          sourceKind: record.provenance.sourceKind,
          provenance: record.provenance,
        },
      });
    }
    return out;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const report = (await callDoctor(this.cliPath, { storePath: this.storePath })) as {
        healthy: boolean;
        contractVersion: string;
        errorCode?: string;
        errorMessage?: string;
      };
      if (!report.healthy) {
        return {
          available: false,
          degraded: true,
          message: `Memory reports unhealthy: ${report.errorCode ?? ""} ${report.errorMessage ?? ""}`.trim(),
        };
      }
      const major = report.contractVersion.split(".")[0];
      if (major !== EXPECTED_MEMORY_MAJOR) {
        return {
          available: true,
          degraded: true,
          message: `Memory contractVersion '${report.contractVersion}' major differs from the major (${EXPECTED_MEMORY_MAJOR}) this adapter was built against — results may be unreliable`,
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
