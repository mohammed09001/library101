/**
 * Stable identity generation for the Context Engine.
 *
 * Same convention as sibling engines (adapted independently here — no
 * shared workspace makes cross-package import possible): prefixed ULIDs are
 * time-sortable, globally unique, and independent of any filesystem path or
 * client restart. Every identity minted here is a FRESH ulid — Context has
 * no caller-chosen stable key analogous to Memory's `projectKey` at the
 * candidate/pack level, so there is no deterministic-id case to support;
 * reproducibility for packs is handled by `packHash` + an optional
 * caller-supplied `idempotencyKey` instead (docs/PACKS.md).
 *
 * ULID shape follows the ULID specification (github.com/ulid/spec):
 * 26 characters, Crockford base32 alphabet excluding I/L/O/U,
 * 48-bit millisecond timestamp + 80 bits of randomness, with in-process
 * monotonic increment when generated within the same millisecond.
 */
import { createHash, randomBytes } from "node:crypto";

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" as const;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

export type IdPrefix = "cnd" | "pak" | "atc" | "evt" | "def" | "prj";

function encodeTime(timeMs: number): string {
  if (timeMs < 0 || !Number.isSafeInteger(timeMs)) {
    throw new Error(`ULID timestamp out of range: ${timeMs}`);
  }
  let out = "";
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    out = ENCODING[timeMs % 32]! + out;
    timeMs = Math.floor(timeMs / 32);
  }
  return out;
}

function encodeRandom(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  let out = "";
  for (let i = 0; i < RANDOM_LEN; i++) {
    out = ENCODING[Number(value & 31n)]! + out;
    value >>= 5n;
  }
  return out;
}

let lastTime = -1;
let lastRandom = 0n;

/** Monotonic ULID (26 chars). Unique and increasing within this process. */
export function ulid(now: number = Date.now()): string {
  let random: bigint;
  if (now === lastTime) {
    random = lastRandom + 1n;
    if (random >= 1n << 80n) {
      now = now + 1;
      random = BigInt("0x" + randomBytes(10).toString("hex"));
    }
  } else {
    random = BigInt("0x" + randomBytes(10).toString("hex"));
  }
  lastTime = now;
  lastRandom = random;
  const bytes = Buffer.alloc(10);
  for (let shift = 72n, i = 0; i < 10; i++, shift -= 8n) {
    bytes[i] = Number((random >> shift) & 0xffn);
  }
  return encodeTime(now) + encodeRandom(bytes);
}

/** Prefixed, time-sortable engine identity, e.g. `pak_01J...`. */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${ulid()}`;
}

export function contentHashOf(normalizedContent: string): string {
  return createHash("sha256").update(normalizedContent, "utf8").digest("hex");
}

/** SHA-256 over the canonical (stable-key-order) JSON form of `value`. */
export function canonicalHashOf(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}
