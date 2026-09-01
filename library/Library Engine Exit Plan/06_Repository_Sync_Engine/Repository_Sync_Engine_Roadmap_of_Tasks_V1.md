# Library Repository Sync Engine — Roadmap of Tasks V1

- **Working Product:** Library
- **Engine:** Library Repository Sync Engine
- **Document Type:** Engineering Task Roadmap
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Living implementation roadmap
- **Operating Strategy:** Backend-first → Terminal-usable → Agent-tool-usable → Game integration later.
- **Ordered implementation tasks:** 36
- **Architecture Rule:** Build independently, integrate through versioned contracts/events, never through another engine's private store.
- **Execution Rule:** Execution prompts compiled from this roadmap are self-contained; coding agents must not need this roadmap file at runtime.

# Roadmap Doctrine

This roadmap translates the V1 Engine design into implementable repository work. Task numbering expresses dependency order, not calendar estimates. Existing repository code that already satisfies a task must be verified and preserved rather than rebuilt. Every external project listed here is a research input; the implementation agent must inspect current upstream source/docs when the task materially depends on that behavior.

# External Research Baseline

- **GitoxideLabs/gitoxide** — Rust Git implementation exposing fetch, status, blob/tree diff, commit-graph traversal, objects, refs, index, pathspecs and worktree operations. Verify feature stability per crate; CLI binaries are not promised stable scripting interfaces.
- **octokit/octokit.js** — Typed REST/GraphQL access, authentication strategies, GitHub Apps, pagination, retries, throttling, webhooks. Library should hide these behind a RepositoryProvider contract.
- **octokit/webhooks.js** — Typed webhook event handling and verification. Use with GitHub delivery IDs/signatures and explicit deduplication; webhook availability depends on repository/App permissions.
- **sourcegraph/zoekt** — Trigram-indexed source search, substring/regexp/boolean query language, symbol-aware ranking, multi-repository search, local sync/indexing, JSON and gRPC search surfaces. Use as indexed code-search substrate, not as Library intent/ranking logic itself.

# Ordered Tasks

# PHASE I — TRACKING, IDENTITY, AND STATE FOUNDATION

## Task 1: Freeze Repository Sync ownership

Repository Sync tracks external repository revisions/deltas and materiality. It does not synchronize Library clients or own Study/Analysis semantics.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 2: Define TrackedRepository identity

Persist provider/repo ID, canonical URL, tracked branch/ref, last observed revision, analyzed revision, sync policy, auth scope and local mirror/workspace handles.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 3: Define RepositoryRevision and RepositoryDelta schemas

Model base/head SHAs, commits, files, additions/deletions, rename/copy hints, manifest/config changes, affected paths and evidence source.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 4: Define sync policy schema

Support manual, polling interval, release-based, every-N-commits and material-change reanalysis policies with explicit defaults.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 5: Define SyncState state machine

Track idle/checking/changed/no_change/degraded/rate_limited/auth_required/error/rewrite_detected and last successful checkpoints.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 6: Publish Repository Sync contracts/events

Define track/untrack/check/delta/status/policy plus repository.changed/material_change events.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE II — REMOTE GITHUB CHANGE DETECTION

## Task 7: Build GitHub remote metadata checks

Use Octokit behind provider interface to resolve branch/ref HEAD and repository metadata with cancellation, pagination/backoff where needed.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `octokit/octokit.js`: inspect REST/GraphQL client composition, auth strategy injection, pagination, retry/throttling plugins. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 8: Build GitHub compare-commits delta path

Use BASE..HEAD compare for bounded commit/file deltas when history relationship is valid; record truncation/limits and fall back to Git when required.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 9: Build polling scheduler with jitter/backoff

Avoid synchronized polling storms, respect rate limits and persist next-check state.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 10: Build webhook ingestion for authorized repositories

Support GitHub App/repository webhook events only when permissions exist; validate delivery ID and HMAC signature and deduplicate.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `octokit/webhooks.js`: inspect signature verification, event typing, delivery processing, error handling. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 11: Build webhook-to-poll reconciliation

Treat webhook as trigger/evidence, then verify authoritative current revision; recover from missed/out-of-order deliveries with polling.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 12: Build GitHub rate-limit and auth degradation

Handle 401/403/404/429, revoked access, private-to-public changes and secondary limits without losing last known state.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE III — LOCAL GIT PLUMBING AND DELTA RESOLUTION

## Task 13: Integrate gix repository discovery and fetch

Use stable gix library APIs rather than unstable CLI scripting; verify crate capabilities/stability before depending on them.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `GitoxideLabs/gitoxide`: inspect gix entrypoint, gix-diff, gix-revision/revwalk, gix-status. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 14: Build local revision resolution

Resolve refs/revspecs, commit ancestry and merge bases for tracked branches/revisions.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 15: Build tree/blob diff calculation

Compute changed files and content/tree deltas locally when GitHub compare is insufficient or local mirror is authoritative for analysis.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 16: Build rename/move classification

Use available Git/GitHub evidence plus bounded similarity heuristics; keep uncertain renames explicit.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 17: Build force-push/history-rewrite detection

Detect when base is no longer ancestor of head and enter rewrite_detected rather than fabricating a linear delta.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 18: Build branch/tag/release transition handling

Track branch changes, deleted refs and release-based policies with stable source revision provenance.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE IV — MATERIALITY AND INCREMENTAL TRIGGERS

## Task 19: Build deterministic change classification

Classify docs-only, tests, source, manifest/dependency, CI, configuration, schema and unknown path changes using path/manifest evidence.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 20: Build material-change policy engine

Evaluate configured watched paths/subsystems/change classes and thresholds; separate “changed” from “requires re-analysis”.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 21: Build affected-Study lookup contract

Query Lineage/Study metadata through APIs to identify which tracked Studies reference the prior source revision/path scope.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 22: Build Analysis re-run trigger

Emit a scoped AnalysisJob request containing base/head delta and affected prior findings; Sync does not perform analysis itself.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 23: Build no-material-change Study state update

Allow lineage/source sync metadata to record newer repository revision when policy says existing study remains materially valid, without inventing a new semantic Study version.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 24: Build Memory/Library Sync notifications

Emit bounded repository-change events for Memory/Library Sync consumers; do not write their stores.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE V — RECOVERY, CACHE, AND TERMINAL

## Task 25: Build durable sync checkpoints

Persist last checked, last successful remote/local revision, pending delta and trigger disposition transactionally.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 26: Build restart and missed-check recovery

Resume incomplete checks safely, deduplicate triggers and catch up from stored revision after runtime downtime.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 27: Build local mirror/cache lifecycle

Manage clone/fetch storage, disk quotas, GC/cleanup and revision retention needed by active Studies.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 28: Build the Repository Sync CLI

Support track, untrack, check, status, delta, policy, history and retry with human/JSON output.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 29: Build cancellation and backpressure

Bound concurrent fetch/diff jobs, cancellation and queue retries so a large repo cannot block the Local Runtime.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 30: Instrument sync health

Measure checks, no-change/change rates, webhook lag, poll lag, rate limits, fetch/diff time, trigger counts and failures.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# PHASE VI — SECURITY AND QUALIFICATION

## Task 31: Build credential and webhook-secret isolation

Keep GitHub tokens/secrets in credential layer, not Sync domain rows; validate webhook signatures before enqueueing domain work.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 32: Build repository URL/ref validation

Prevent path/URL injection, unsafe local destinations and untrusted ref names from escaping managed research storage.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 33: Build adversarial remote-change fixtures

Test force pushes, deleted branches, renamed repos, large diffs, binary files, submodules, auth loss and inconsistent provider data.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 34: Build polling/webhook equivalence qualification

Prove both paths converge on the same verified revision/delta despite duplicate or missed webhook events.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 35: Build restart/rate-limit qualification

Crash mid-fetch/diff, restart, hit 429 and verify no duplicate Analysis triggers or lost revision checkpoints.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 36: Final Repository Sync Engine gate

Prove revision truth, delta integrity, materiality separation, Analysis/Lineage handoffs, safe credentials and terminal usability.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- No mandatory external repository for this Task. Stay repository-first; consult the Engine research baseline or official documentation only if a material implementation question requires it.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

# Final Definition of Done

Library Repository Sync Engine V1 is complete when every ordered Task is either verified as already satisfied or implemented, every Execution Prompt reaches YES, the Engine is usable from the real terminal without the game, cross-engine integration uses only versioned contracts, failure/degraded states are explicit, and final qualification proves the Engine's domain ownership rather than only compilation.
