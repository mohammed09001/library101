/**
 * Reproducibility and replay (Task 28 — Build reproducibility and
 * replay). Task Source Requirement: "Given preserved source revisions and
 * versions, reconstruct or explain why a historical ContextPack cannot be
 * reproduced."
 *
 * Replay is possible ONLY for a pack that is the CURRENT pack of some
 * `ContextDefinition` — a bare `context.build` call was never claimed to
 * be replay-tracked anywhere in this codebase (docs/PACKS.md already
 * frames `ContextDefinition` as the mechanism that "survives ACROSS
 * repeated builds" for reproducibility purposes). `ContextPack` itself
 * deliberately does not store the original `ContextRequest`
 * (`src/contracts/packs.ts`) — and `ContextProvider.retrieve()` requires a
 * full request, whose every field is licensed to affect retrieval output
 * (`src/contracts/providers.ts`) — so synthesizing a fake minimal request
 * for a non-definition-bound pack would be fragile and dishonest, not a
 * real replay. When no definition currently points at the pack, this
 * returns a clear, actionable, HONEST answer to "explain why... cannot be
 * reproduced" rather than attempting an unreliable partial reconstruction.
 *
 * When a definition IS found, this reuses `previewPack()` end to end
 * (Task 24's exact precedent, `syncDefinition`) — zero duplicated
 * assembly logic — and compares the fresh `packHash` against the
 * historical one.
 */
import type { ProviderId } from "../contracts/types.ts";
import type { ContextPack, ContextPackExclusion, ContextPackItem } from "../contracts/packs.ts";
import { getPack, previewPack } from "./packs.ts";
import type { ProviderRegistry } from "./registry.ts";
import type { ContextStore } from "./store.ts";

export type ItemDiffKind = "unchanged" | "reordered" | "contentChanged" | "nowExcluded" | "newlyIncluded";

export interface ItemDiff {
  providerId: ProviderId;
  ref: string;
  kind: ItemDiffKind;
  detail?: string;
}

export interface ReplayResult {
  reproducible: boolean;
  /** Present when `reproducible` is false. */
  reason?: string;
  pack: ContextPack;
  /** Present only when a bound definition was found and a fresh preview was run. */
  replayedPack?: ContextPack;
  itemDiffs?: ItemDiff[];
  /** True when the fresh preview's `providerVersions` differ from the historical pack's — can be true even with an empty/all-unchanged `itemDiffs`. */
  providerVersionsChanged?: boolean;
  rankingVersionChanged?: boolean;
  budgetChanged?: boolean;
}

function key(providerId: ProviderId, ref: string): string {
  return `${providerId}:${ref}`;
}

/** Every (providerId, ref) a pack "knows about" — included items plus excluded ones (excluding budget_exceeded, which is a positional artifact of ordering, not a source-identity fact worth diffing). */
function itemAndExclusionKeys(items: ContextPackItem[], exclusions: ContextPackExclusion[]): Map<string, { item?: ContextPackItem; exclusion?: ContextPackExclusion }> {
  const map = new Map<string, { item?: ContextPackItem; exclusion?: ContextPackExclusion }>();
  for (const item of items) {
    map.set(key(item.providerId, item.ref), { item });
  }
  for (const exclusion of exclusions) {
    const k = key(exclusion.providerId, exclusion.ref);
    const existing = map.get(k);
    map.set(k, existing !== undefined ? { ...existing, exclusion } : { exclusion });
  }
  return map;
}

function diffItems(pack: ContextPack, replayedPack: ContextPack): ItemDiff[] {
  const before = itemAndExclusionKeys(pack.items, pack.exclusions);
  const after = itemAndExclusionKeys(replayedPack.items, replayedPack.exclusions);
  const allKeys = new Set([...before.keys(), ...after.keys()]);
  const diffs: ItemDiff[] = [];

  for (const k of allKeys) {
    const [providerId, ref] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
    const b = before.get(k);
    const a = after.get(k);

    if (b?.item !== undefined && a?.item !== undefined) {
      if (b.item.contentHash !== a.item.contentHash) {
        diffs.push({ providerId, ref, kind: "contentChanged", detail: `contentHash ${b.item.contentHash} -> ${a.item.contentHash}` });
      } else if (b.item.order !== a.item.order) {
        diffs.push({ providerId, ref, kind: "reordered", detail: `order ${b.item.order} -> ${a.item.order}` });
      } else {
        diffs.push({ providerId, ref, kind: "unchanged" });
      }
      continue;
    }
    if (b?.item !== undefined && a?.item === undefined) {
      diffs.push({ providerId, ref, kind: "nowExcluded", detail: a?.exclusion !== undefined ? `reason: ${a.exclusion.reason}` : undefined });
      continue;
    }
    if (b?.item === undefined && a?.item !== undefined) {
      diffs.push({ providerId, ref, kind: "newlyIncluded" });
      continue;
    }
    // Excluded on both sides (or absent on both, impossible since the key came from one of the maps) — not a reproducibility-relevant change.
  }
  return diffs;
}

/**
 * `getDefinitionByCurrentPackId` reverse lookup, then — if found — a
 * fresh `previewPack()` compared by `packHash`. `mode: "sync"` is used
 * unconditionally for the replay preview: `mode` is excluded from
 * `packHash` (docs/PACKS.md) and never affects the comparison, so it
 * doesn't matter what mode the historical pack was actually built with.
 */
export async function replayPack(store: ContextStore, registry: ProviderRegistry, packId: string): Promise<ReplayResult> {
  const pack = getPack(store, packId);
  const definition = store.getDefinitionByCurrentPackId(packId);

  if (definition === undefined) {
    return {
      reproducible: false,
      reason:
        "no ContextDefinition currently points at this pack — packs built via a bare context.build call are not tracked for replay; create a ContextDefinition and sync it to make future builds replayable",
      pack,
    };
  }

  const replayedPack = await previewPack(registry, {
    request: definition.request,
    items: definition.items,
    rankingVersion: definition.rankingVersion,
    creationReason: definition.creationReason,
    createdBy: definition.createdBy,
    mode: "sync",
  });

  if (replayedPack.packHash === pack.packHash) {
    return { reproducible: true, pack, replayedPack };
  }

  const itemDiffs = diffItems(pack, replayedPack);
  const providerVersionsChanged = JSON.stringify(pack.providerVersions) !== JSON.stringify(replayedPack.providerVersions);
  const rankingVersionChanged = pack.rankingVersion !== replayedPack.rankingVersion;
  const budgetChanged = JSON.stringify(pack.budget) !== JSON.stringify(replayedPack.budget);

  return {
    reproducible: false,
    reason: "source content, availability, or build parameters have changed since the original build — see itemDiffs and the *Changed flags",
    pack,
    replayedPack,
    itemDiffs,
    providerVersionsChanged,
    rankingVersionChanged,
    budgetChanged,
  };
}
