/**
 * Current Session/Agent Context Provider (Task 14): accepts host-provided
 * current file, selection, task, or session metadata when available;
 * absence must not break Context.
 *
 * Unlike every other provider in this Engine, this one has NO external
 * dependency at all — no filesystem tree, no sibling-engine CLI, no
 * subprocess. Context is backend/terminal-first, not IDE-resident, so it has
 * exactly one channel to learn "what is the host currently looking at":
 * the caller-supplied `ContextRequest` itself. `SessionContext`
 * (`src/contracts/types.ts`, contract 1.3.0, additive) is that channel —
 * this provider's `discover()`/`retrieve()` do nothing but read
 * `request.sessionContext` back out and reshape it into candidates; nothing
 * is fetched, nothing can be unavailable. `healthCheck()` is therefore
 * unconditionally healthy — a genuine, rare case, not a placeholder (proven
 * directly in `test/t14_current_session_provider.test.ts`).
 *
 * "Absence must not break Context": when `request.sessionContext` is
 * undefined (the host didn't supply any), `discover()` returns `[]` — an
 * empty, successful result, never a thrown error or a degraded provider.
 *
 * Deliberately does NOT re-read the current file's bytes from disk — that
 * would duplicate `ProjectFilesProvider`'s ownership (Anti-Accumulation
 * Rule). This provider's unique value is the *attention signal* ("this file
 * is the one the host is looking at right now"), which nothing else in the
 * system knows; fetching that file's actual content is a separate concern
 * already owned elsewhere.
 */
import type {
  ContextCandidate,
  ContextCandidateRef,
  ContextProvider,
  ProviderDeclaration,
  ProviderHealth,
} from "../contracts/providers.ts";
import type { ContextRequest } from "../contracts/types.ts";
import { ValidationError } from "../contracts/errors.ts";

const REF_CURRENT_FILE = "current_file";
const REF_SELECTION = "selection";
const REF_TASK_DESCRIPTION = "task_description";

export class CurrentSessionContextProvider implements ContextProvider {
  readonly declaration: ProviderDeclaration;

  constructor() {
    this.declaration = {
      id: "current_session",
      displayName: "Current Session",
      description: "Host-provided current file/selection/task/session metadata, when the host supplies it.",
      capabilities: ["session_state"],
      cost: { relativeCost: "low", network: false },
      freshness: { kind: "live" },
      privacy: { maxPrivacyClass: "internal" },
      version: "1.0.0",
    };
  }

  async discover(request: ContextRequest): Promise<ContextCandidateRef[]> {
    const session = request.sessionContext;
    if (session === undefined) return [];

    const refs: ContextCandidateRef[] = [];
    if (session.currentFile !== undefined) {
      const { path, language } = session.currentFile;
      const note = `Currently open file: ${path}${language !== undefined ? ` (language: ${language})` : ""}`;
      refs.push({
        providerId: this.declaration.id,
        ref: REF_CURRENT_FILE,
        title: path,
        estimatedTokens: Math.ceil(note.length / 4),
      });
    }
    if (session.selection !== undefined) {
      const { path, startLine, endLine, text } = session.selection;
      const body = text ?? `Selected lines ${startLine}-${endLine} in ${path} (text not shared by host)`;
      refs.push({
        providerId: this.declaration.id,
        ref: REF_SELECTION,
        title: `${path}:${startLine}-${endLine}`,
        estimatedTokens: Math.ceil(body.length / 4),
      });
    }
    if (session.taskDescription !== undefined) {
      refs.push({
        providerId: this.declaration.id,
        ref: REF_TASK_DESCRIPTION,
        title: "Current task description",
        estimatedTokens: Math.ceil(session.taskDescription.length / 4),
      });
    }
    return refs;
  }

  async retrieve(request: ContextRequest, refs: ContextCandidateRef[]): Promise<ContextCandidate[]> {
    const session = request.sessionContext;
    const out: ContextCandidate[] = [];
    const retrievedAt = new Date().toISOString();
    const sourceMetadata = session?.sessionId !== undefined ? { sessionId: session.sessionId } : undefined;

    for (const ref of refs) {
      let content: string;
      let title: string;
      if (ref.ref === REF_CURRENT_FILE) {
        if (session?.currentFile === undefined) {
          throw new ValidationError(`ref '${ref.ref}' does not resolve — request.sessionContext.currentFile is absent`);
        }
        const { path, language } = session.currentFile;
        content = `Currently open file: ${path}${language !== undefined ? ` (language: ${language})` : ""}`;
        title = path;
      } else if (ref.ref === REF_SELECTION) {
        if (session?.selection === undefined) {
          throw new ValidationError(`ref '${ref.ref}' does not resolve — request.sessionContext.selection is absent`);
        }
        const { path, startLine, endLine, text } = session.selection;
        content =
          text ??
          `Selected lines ${startLine}-${endLine} in ${path} (text not shared by host)`;
        title = `${path}:${startLine}-${endLine}`;
      } else if (ref.ref === REF_TASK_DESCRIPTION) {
        if (session?.taskDescription === undefined) {
          throw new ValidationError(`ref '${ref.ref}' does not resolve — request.sessionContext.taskDescription is absent`);
        }
        content = session.taskDescription;
        title = "Current task description";
      } else {
        throw new ValidationError(`ref '${ref.ref}' is not a recognized current-session reference`);
      }
      out.push({
        providerId: this.declaration.id,
        ref: ref.ref,
        title,
        estimatedTokens: Math.ceil(content.length / 4),
        content,
        retrievedAt,
        ...(sourceMetadata !== undefined ? { sourceMetadata } : {}),
      });
    }
    return out;
  }

  /**
   * Unconditionally healthy: this provider has no filesystem, network, or
   * subprocess dependency — there is nothing that can be unavailable.
   */
  async healthCheck(): Promise<ProviderHealth> {
    return { available: true, degraded: false };
  }
}
