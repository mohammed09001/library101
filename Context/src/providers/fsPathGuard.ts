/**
 * Shared filesystem root-escape guard. Extracted from
 * `projectFilesProvider.ts` (Task 3) so `repositoryMapContextProvider.ts`
 * (Task 11) does not duplicate path-traversal defense (Anti-Accumulation
 * Rule) — one owner for "resolve a caller-supplied ref against a bounded
 * root and reject anything that would escape it."
 */
import { relative, resolve, sep } from "node:path";
import { ValidationError } from "../contracts/errors.ts";

/** Resolve `ref` against `root` and reject any path that would escape it. */
export function resolveWithinRoot(root: string, ref: string): string {
  const resolvedRoot = resolve(root);
  const candidate = resolve(resolvedRoot, ref);
  const rel = relative(resolvedRoot, candidate);
  const escapes = rel === ".." || rel.startsWith(`..${sep}`) || rel.split(sep).includes("..");
  if (escapes) {
    throw new ValidationError(`ref '${ref}' escapes provider root`);
  }
  return candidate;
}
