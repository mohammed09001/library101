/**
 * Human-readable CLI renderings (Task 29) — pure, deterministic text
 * transformations of the same result payloads the JSON mode already
 * returns. JSON remains the default output contract; `--format human` is
 * the terminal-friendly view. Error envelopes always stay JSON (the typed
 * `{error:{code,message}}` contract is machine-consumed even on failure).
 */
import type { ContextPack, ContextPackExclusion, ContextPackItem, PackAttachment } from "../contracts/packs.ts";
import type { DetachResult } from "../engine/packs.ts";
import type { DoctorReport } from "../contracts/types.ts";

function targetLabel(target: unknown): string {
  if (target === null || typeof target !== "object") return String(target);
  const t = target as { kind?: string; name?: string; agentType?: string };
  const base = `${t.kind ?? "?"}:${t.name ?? "?"}`;
  return t.agentType !== undefined ? `${base} (${t.agentType})` : base;
}

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

function packHeader(pack: ContextPack): string {
  return `Pack ${pack.packId} (${pack.status}, ${pack.mode})`;
}

function packLines(pack: ContextPack): string[] {
  const lines = [
    `  project:  ${pack.projectKey}`,
    `  reason:   ${pack.creationReason}`,
    `  created:  ${pack.createdAt} by ${targetLabel(pack.createdBy)}`,
    `  budget:   ${pack.totalEstimatedTokens}/${pack.budget.maxTokens} tok, ${pack.items.length} item(s), ${pack.exclusions.length} excluded`,
    `  hash:     ${pack.packHash}`,
  ];
  // Task 31: agent provenance — rendered only when recorded (null on
  // pre-1.11.0 rows), so old packs' output is byte-identical to before.
  if (pack.hostAgent !== null) lines.push(`  host:     ${targetLabel(pack.hostAgent)}`);
  if (pack.workerAgent !== null) lines.push(`  worker:   ${targetLabel(pack.workerAgent)}`);
  if (pack.expiresAt !== null) lines.push(`  expires:  ${pack.expiresAt}${pack.promotedAt !== null ? " (promoted)" : ""}`);
  if (pack.status !== "active" && pack.invalidatedReason !== null) {
    lines.push(`  invalid:  ${pack.invalidatedAt} — ${pack.invalidatedReason}`);
  }
  return lines;
}

function itemLine(item: ContextPackItem, position: number): string {
  const size = item.truncated ? `${item.estimatedTokens} tok (truncated)` : `${item.estimatedTokens} tok`;
  return `    ${position}. ${item.providerId}  ${item.ref}  [${size}, ${item.actualBytes} B, ${shortHash(item.contentHash)}]`;
}

function exclusionLine(exclusion: ContextPackExclusion): string {
  return `    - ${exclusion.providerId}  ${exclusion.ref}  (${exclusion.reason}${exclusion.message !== undefined ? `: ${exclusion.message}` : ""})`;
}

export function formatPackOp(result: unknown): string {
  const pack = (result as { pack: ContextPack }).pack;
  const lines = [packHeader(pack), ...packLines(pack)];
  if (pack.items.length > 0) {
    lines.push("  items:");
    pack.items.forEach((item, i) => lines.push(itemLine(item, i + 1)));
  }
  if (pack.exclusions.length > 0) {
    lines.push("  exclusions:");
    pack.exclusions.forEach((e) => lines.push(exclusionLine(e)));
  }
  return lines.join("\n");
}

export function formatPreviewOp(result: unknown): string {
  const persisted = (result as { persisted?: boolean }).persisted === false ? " (preview — not persisted)" : "";
  return `${formatPackOp(result)}${persisted}`;
}

export function formatExplainOp(result: unknown): string {
  const { pack, attachments, budgetConsumption } = result as {
    pack: ContextPack;
    attachments: PackAttachment[];
    budgetConsumption: {
      maxTokens: number;
      reservedFramingTokens: number;
      effectiveMaxTokens: number;
      totalEstimatedTokens: number;
      tokensRemaining: number;
      totalActualBytes: number;
      maxBytes?: number;
      bytesRemaining?: number;
    };
  };
  const lines = [packHeader(pack), ...packLines(pack)];
  lines.push(
    `  consumed: ${budgetConsumption.totalEstimatedTokens}/${budgetConsumption.effectiveMaxTokens} effective tok ` +
      `(max ${budgetConsumption.maxTokens}, reserved ${budgetConsumption.reservedFramingTokens}, ` +
      `remaining ${budgetConsumption.tokensRemaining}), ${budgetConsumption.totalActualBytes} B` +
      (budgetConsumption.maxBytes !== undefined ? `/${budgetConsumption.maxBytes} B` : ""),
  );
  if (pack.items.length > 0) {
    lines.push("  items:");
    pack.items.forEach((item, i) => lines.push(itemLine(item, i + 1)));
  }
  if (attachments.length === 0) {
    lines.push("  attachments: none");
  } else {
    lines.push("  attachments:");
    for (const a of attachments) {
      lines.push(`    - ${a.attachmentId}  -> ${targetLabel(a.target)}  at ${a.attachedAt}${a.note !== undefined ? `  note: ${a.note}` : ""}`);
    }
  }
  return lines.join("\n");
}

export function formatAttachOp(result: unknown): string {
  const attachment = (result as { attachment: PackAttachment }).attachment;
  return `Attached ${attachment.packId} -> ${attachment.attachmentId} (target ${targetLabel(attachment.target)} at ${attachment.attachedAt})`;
}

export function formatDetachOp(result: DetachResult): string {
  return `Detached ${result.attachmentId} from ${result.packId} at ${result.detachedAt}`;
}

/** Task 32: deterministic plain-text rendering of one projection handoff record. */
function handoffLine(h: { handoffId: string; packId: string; projectionRef: string; mode: string; status: string; detail?: string; createdAt: string }): string {
  return `  ${h.handoffId}  ${h.createdAt}  ${h.status}  ${h.mode}  ${h.packId}  -> ${h.projectionRef}${h.detail !== undefined ? `  (${h.detail})` : ""}`;
}

export function formatHandoffOp(result: unknown): string {
  const h = (result as { handoff: { handoffId: string; packId: string; projectionRef: string; mode: string; status: string; detail?: string; createdAt: string } }).handoff;
  return `Handoff ${h.handoffId}: ${h.status}${h.detail !== undefined ? ` — ${h.detail}` : ""}`;
}

export function formatHandoffsOp(result: unknown): string {
  const { handoffs, count } = result as { handoffs: Array<{ handoffId: string; packId: string; projectionRef: string; mode: string; status: string; detail?: string; createdAt: string }>; count: number };
  if (count === 0) return "No projection handoffs found.";
  const lines = [`${count} handoff(s), newest first:`];
  for (const h of handoffs) lines.push(handoffLine(h));
  return lines.join("\n");
}

export function formatListOp(result: unknown): string {
  const { packs, count } = result as { packs: Array<{ packId: string; createdAt: string; status: string; mode: string; itemCount: number; totalEstimatedTokens: number; projectKey: string; creationReason: string }>; count: number };
  if (count === 0) return "No packs found.";
  const lines = [`${count} pack(s), newest first:`];
  for (const p of packs) {
    lines.push(
      `  ${p.packId}  ${p.createdAt}  ${p.status}  ${p.mode}  ${p.itemCount} item(s)  ${p.totalEstimatedTokens} tok  ${p.projectKey}  ${p.creationReason}`,
    );
  }
  return lines.join("\n");
}

export function formatHealth(report: DoctorReport): string {
  const lines = [
    `Context Engine ${report.contractVersion} — ${report.healthy ? "healthy" : `UNHEALTHY${report.errorCode !== undefined ? ` (${report.errorCode})` : ""}`}`,
    `  store:      ${report.storePath}${report.existed ? "" : " (newly created)"}`,
  ];
  if (report.integrity !== null) lines.push(`  integrity:  ${report.integrity}  journal: ${report.journalMode}`);
  lines.push(
    `  providers:  ${report.registeredProviders} registered${report.degradedProviders.length > 0 ? `, DEGRADED: ${report.degradedProviders.join(", ")}` : ", none degraded"}`,
  );
  if (report.healthy) {
    lines.push(`  migrations: ${report.appliedMigrations.join(", ") || "none"}  events: ${report.eventCount}`);
  } else if (report.errorMessage !== undefined) {
    lines.push(`  error:      ${report.errorMessage}`);
  }
  return lines.join("\n");
}
