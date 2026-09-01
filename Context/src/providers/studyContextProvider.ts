/**
 * Study Context Provider (Task 9): retrieves Study findings/sections by
 * Study/version/source revision, without copying full studies by default.
 *
 * Reuses `cliContractClient.ts` — the same CLI-subprocess pattern as
 * `memoryContextProvider.ts`. UNLIKE Memory, `Study_Document` and
 * `Study_Lineage_Versioning` are verified EMPTY in this repository (no
 * code, no CLI, nothing to call) as of this Execution. This adapter targets
 * an ANTICIPATED contract (`study.search` / `study.get`) shaped to satisfy
 * the Task Source Requirement, documented explicitly as unverified against
 * a real target — see docs/ADAPTERS.md. It has been proven two honest ways:
 * against a fixture fake CLI (proves the request/response mapping), and
 * against the real, currently-absent Study_Document path (proves genuine
 * graceful unavailability — Task 7's "fail soft when unavailable").
 *
 * "Without copying full studies by default": discover() returns lightweight
 * section/finding refs only; retrieve() fetches exactly the caller-selected
 * sections, never a whole study body.
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

const REF_SEP = "::";
const DEFAULT_SEARCH_LIMIT = 20;

interface StudySectionRef {
  studyId: string;
  version: number;
  sectionRef: string;
  title: string;
  estimatedTokens: number;
}

interface StudySection extends StudySectionRef {
  content: string;
  /** The source revision this section content was captured from (Task 9's "source revision" field). */
  sourceRevision: string;
}

function encodeRef(studyId: string, version: number, sectionRef: string): string {
  return [studyId, String(version), sectionRef].join(REF_SEP);
}

function decodeRef(ref: string): { studyId: string; version: number; sectionRef: string } {
  const parts = ref.split(REF_SEP);
  if (parts.length !== 3) {
    throw new Error(`malformed study ref '${ref}' (expected studyId${REF_SEP}version${REF_SEP}sectionRef)`);
  }
  const [studyId, versionStr, sectionRef] = parts as [string, string, string];
  return { studyId, version: Number(versionStr), sectionRef };
}

export interface StudyContextProviderOptions {
  /** Path to Study_Document's CLI entry point. Defaults to the sibling repo layout. */
  studyCliPath?: string;
  /** Passed through as `--store <path>` on every invocation. */
  storePath?: string;
}

function defaultStudyCliPath(): string {
  return (
    process.env["LIBRARY_STUDY_ENGINE_CLI"] ?? resolveSiblingCli("Study_Document", "src", "cli", "cli.ts")
  );
}

export class StudyContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;
  private readonly cliPath: string;
  private readonly storePath: string | undefined;

  constructor(options: StudyContextProviderOptions = {}) {
    this.cliPath = options.studyCliPath ?? defaultStudyCliPath();
    this.storePath = options.storePath;
    this.declaration = {
      id: "study_document",
      displayName: "Study Document",
      description: "Study findings/sections by Study/version/source revision, via Study's versioned contract.",
      capabilities: ["study_findings"],
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
      throw new Error(`Study ${operation} failed: ${error?.code ?? "UNKNOWN"}: ${error?.message ?? "no message"}`);
    }
    return envelope.result;
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const result = (await this.call("study.search", {
      scope: request.project.projectKey,
      limit: DEFAULT_SEARCH_LIMIT,
    })) as { sections: StudySectionRef[] };
    return result.sections.map((s) => ({
      providerId: this.declaration.id,
      ref: encodeRef(s.studyId, s.version, s.sectionRef),
      title: s.title,
      estimatedTokens: s.estimatedTokens,
    }));
  }

  async retrieve(_request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const out: ContextCandidate[] = [];
    for (const ref of refs) {
      const { studyId, version, sectionRef } = decodeRef(ref.ref);
      const result = (await this.call("study.get", { studyId, version, sectionRef })) as StudySection;
      out.push({
        providerId: this.declaration.id,
        ref: ref.ref,
        title: result.title,
        estimatedTokens: Math.ceil(result.content.length / 4),
        content: result.content,
        retrievedAt: new Date().toISOString(),
        sourceMetadata: {
          studyId: result.studyId,
          version: result.version,
          sectionRef: result.sectionRef,
          sourceRevision: result.sourceRevision,
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
          message: `Study reports unhealthy: ${report.errorCode ?? ""} ${report.errorMessage ?? ""}`.trim(),
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
