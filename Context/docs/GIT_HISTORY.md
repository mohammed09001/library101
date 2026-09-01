# Git History Context Provider (Task 13)

Implemented in `src/providers/gitHistoryContextProvider.ts`, using
`src/providers/gitProcess.ts` (a thin `git`-specific wrapper) over
`src/providers/processRunner.ts` — the spawn-with-timeout core extracted
from `cliContractClient.ts` so this provider does not duplicate that logic
(Anti-Accumulation Rule).

## Task Source Requirement

"Expose relevant commits/diffs/paths through bounded queries rather than
whole history."

## Design decisions

- **The system `git` executable, not an npm dependency.** Re-implementing
  git's object/packfile format to read history ourselves would duplicate
  git itself and be far more failure-prone than using the tool that already
  exists for exactly this. This keeps the zero-npm-runtime-dependency
  discipline intact — `git` is an environment tool, the same category as the
  `node:sqlite` built-in Task 5 already relies on, not a package.
- **Never through a shell.** Every `git` invocation goes through
  `runProcess`'s `spawn(command, args)`, arguments always as an array — a
  caller-influenced value can never be reinterpreted as a second command.
- **Untrusted-ref defense.** A commit `ref` reaching `retrieve()` is
  untrusted input (Preservation and Safety: "treat repository content ... as
  untrusted data"). It is rejected unless it matches `^[0-9a-f]{7,40}$`
  *before* it ever reaches a `git` argv — validated hex-only text cannot
  begin with `-`, so it cannot be reinterpreted as a git option even in
  principle, independent of argv-array spawning already ruling out shell
  injection. Proven in `test/t13_git_history_provider.test.ts` with a
  `--upload-pack=evil`-shaped ref.
- **Bounded, not whole history.** `discover()` runs `git log -n <maxCommits>`
  (default 20) — never unbounded `git log`. "Relevant" widening runs a
  handful of `git log --grep=<token>` passes over `taskText` tokens (up to 3,
  longest-first, mirroring the tokenizer `normalizeCandidate.ts` already
  uses for `textMatchScore`), on an *independent* budget from the recency
  pass (also capped at `maxCommits`) — otherwise a full recency page would
  starve every grep pass before it ever ran (a real bug caught by this
  Execution's own test: `test/t13_git_history_provider.test.ts`'s
  `maxCommits: 1` widening case failed until this was fixed). Total output
  is therefore bounded at `2 * maxCommits`, never "whole history."
  `retrieve()` truncates a commit's rendered `git show --stat -p` output at
  `maxPatchBytes` (default 20,000 chars) — a single huge/generated-file
  commit can never return an unbounded payload.
- **A ref is a full commit sha** — stable identity, exactly the "paths"/
  "commits" granularity the Task Source Requirement names, and immune to
  branch/tag mutation (unlike a branch name or `HEAD`).
- **Optional `pathFilter`** bounds every query to specific paths
  (`git log/show -- <path>...`), the literal "...and paths" clause.

## Failure/degraded behavior

- A non-zero `git log`/`git show` exit that means "there is genuinely no
  matching history" (`does not have any commits yet`, `bad default revision
  'HEAD'`, `unknown revision or path not in the working tree`) is treated as
  a legitimate empty result, not an error — verified against a real,
  freshly-`git init`'d, zero-commit repository (and, as live evidence, this
  very `Context` repository itself: `providers discover --git-history-root .`
  returns `{"results":[{"providerId":"git_history","refs":[]}]}` today,
  since it has no commits yet).
- `healthCheck()` checks both "is `git` even installed" (`git --version`)
  and "is `root` inside a git working tree at all"
  (`git rev-parse --is-inside-work-tree`) — a non-repo directory reports
  `available: false` without throwing.
- Any other non-zero exit (a `git show` on a well-formed-but-unknown sha, a
  corrupted repo, etc.) is thrown from `discover()`/`retrieve()`, which the
  Task 7 registry / Task 5 `buildPack` already absorb fail-soft, same as
  every other provider.

## Known limitations

- Relevance widening is a plain `--grep` substring/regex match on the commit
  subject line, not a ranking model — same "cheap heuristic, not a ranking
  model" discipline `docs/CANDIDATES.md` already applies elsewhere.
- No merge-commit-specific handling (`git show` on a merge shows a combined
  diff by default) — not special-cased, documented rather than silently
  papered over.
