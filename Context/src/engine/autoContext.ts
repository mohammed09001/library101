/**
 * Auto-Context orchestration (Task 25 — Define Auto-Context as opt-in
 * gated mode). Task Source Requirement: "Implement only suggestion/preview
 * in V1 unless explicit user policy allows automatic attachment; never
 * silently modify prompts."
 *
 * Reuses three already-built, already-tested primitives with zero
 * duplicated logic: `selectCandidates` (the suggestion — zero store
 * access, zero side effects), `buildPack`/`attachPack` (the delivery —
 * only reached when a persisted, project-scoped `AutoContextPolicy`
 * explicitly allows it). The automatic-attach path is hardcoded to
 * `mode: "attach"` (Task 23's ephemeral pack lifecycle, never
 * caller-choosable here) — an automated decision must not unilaterally
 * create permanent state; a caller wanting a permanent pack from the same
 * selection already has the explicit two-step path (`context.select` then
 * `context.build` with `mode: "sync"`).
 */
import type { AgentIdentity, ContextRequest, ProviderId } from "../contracts/types.ts";
import type { ContextPack, PackAttachment } from "../contracts/packs.ts";
import type { AutoContextPolicy } from "../contracts/autoContext.ts";
import { AutoContextForbiddenError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import { buildPack, attachPack } from "./packs.ts";
import { selectCandidates, type SelectedItem, type SelectExclusion } from "./selector.ts";
import type { ProviderRegistry } from "./registry.ts";
import type { ContextStore } from "./store.ts";

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
}

/** `null` when never set — never fabricate a synthetic `updatedBy` for a policy nobody actually set. Absence means the safest default: suggestion/preview only. */
export function getAutoContextPolicy(store: ContextStore, projectKey: string): AutoContextPolicy | null {
  const row = store.getAutoContextPolicyRow(projectKey);
  return row ?? null;
}

export interface SetAutoContextPolicyInput {
  projectKey: string;
  allowAutomaticAttachment: boolean;
  actor: AgentIdentity;
}

/**
 * Only a non-agent actor may enable automatic attachment (the "user" in
 * "user policy" — Task Source Requirement's own wording; not itself
 * mirrored by Memory's `intakePolicy`, which gates by scope alone).
 * Disabling it (`false`) is never gated — a safety-decreasing action needs
 * no escalation check, matching every Memory forbidden-action call site's
 * actual `kind === "agent"`-specific pattern.
 */
export function setAutoContextPolicy(store: ContextStore, input: SetAutoContextPolicyInput): AutoContextPolicy {
  requireNonEmpty(input.projectKey, "projectKey");
  if (input.allowAutomaticAttachment === true && input.actor.kind === "agent") {
    throw new AutoContextForbiddenError(
      "actors of kind 'agent' cannot enable automatic attachment: this requires an explicit non-agent (human/tool/engine) user policy decision",
    );
  }
  const policy: AutoContextPolicy = {
    projectKey: input.projectKey,
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    allowAutomaticAttachment: input.allowAutomaticAttachment,
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor,
  };
  store.upsertAutoContextPolicyRow(policy);
  store.appendEvent("context.autoContext.policyUpdated", {
    projectKey: policy.projectKey,
    allowAutomaticAttachment: policy.allowAutomaticAttachment,
    updatedBy: policy.updatedBy,
  });
  return policy;
}

export interface RunAutoContextInput {
  request: ContextRequest;
  maxCandidatesPerProvider?: number;
  maxItems?: number;
  /** Defaults to the selector's own algorithm id when omitted. */
  rankingVersion?: string;
  /** Required always (used only on the attach path) — fail validation up front rather than mid-function. */
  creationReason: string;
  createdBy: AgentIdentity;
  /** Who the pack is attached to when automatic attachment is allowed. Defaults to `request.hostAgent`. */
  targetAgent?: AgentIdentity;
}

interface AutoContextResultBase {
  projectKey: string;
  items: SelectedItem[];
  excluded: SelectExclusion[];
  degradedProviders: Array<{ providerId: ProviderId; message: string }>;
  /** Task 35: providers not consulted for this project — their grant does not cover it and no explicit override extended it. */
  deniedProviders: Array<{ providerId: ProviderId; projectKey: string; message: string }>;
  algorithm: string;
}

/**
 * A discriminated union so a caller cannot access `.pack`/`.attachment`
 * without first narrowing on `.decision` — a compile-time enforcement of
 * "never silently," not just a documented convention.
 */
export type AutoContextResult =
  | ({ decision: "suggested" } & AutoContextResultBase)
  | ({ decision: "attached"; pack: ContextPack; attachment: PackAttachment } & AutoContextResultBase);

/**
 * Always suggests first (`selectCandidates` — zero `context_packs`/
 * `pack_attachments` writes). Only proceeds to build (`mode: "attach"`) +
 * attach when the request's project has a persisted policy explicitly
 * allowing it. `context.autoContext.decided` fires on BOTH branches — not
 * an exception to "preview has no side effects," but the correct
 * application of the event rule to a different subject: the audit record
 * of the gate's own decision, which "never silently" requires regardless
 * of which way the gate fell.
 */
export async function runAutoContext(
  store: ContextStore,
  registry: ProviderRegistry,
  input: RunAutoContextInput,
): Promise<AutoContextResult> {
  requireNonEmpty(input.creationReason, "creationReason");
  const projectKey = input.request.project.projectKey;

  const select = await selectCandidates(registry, {
    request: input.request,
    maxCandidatesPerProvider: input.maxCandidatesPerProvider,
    maxItems: input.maxItems,
  });
  const base: AutoContextResultBase = {
    projectKey,
    items: select.items,
    excluded: select.excluded,
    degradedProviders: select.degradedProviders,
    deniedProviders: select.deniedProviders,
    algorithm: select.algorithm,
  };

  const policy = getAutoContextPolicy(store, projectKey);
  if (policy === null || policy.allowAutomaticAttachment !== true) {
    store.appendEvent("context.autoContext.decided", {
      projectKey,
      decision: "suggested",
      itemCount: select.items.length,
    });
    return { decision: "suggested", ...base };
  }

  const pack = await buildPack(store, registry, {
    request: input.request,
    items: select.items.map((item) => ({
      providerId: item.providerId,
      ref: item.ref,
      title: item.title,
      score: item.score,
    })),
    rankingVersion: input.rankingVersion ?? select.algorithm,
    creationReason: input.creationReason,
    createdBy: input.createdBy,
    mode: "attach",
  });
  const attachment = attachPack(store, pack.packId, input.targetAgent ?? input.request.hostAgent, "auto-context");
  store.appendEvent("context.autoContext.decided", {
    projectKey,
    decision: "attached",
    packId: pack.packId,
    attachmentId: attachment.attachmentId,
  });
  return { decision: "attached", ...base, pack, attachment };
}
