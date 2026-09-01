# Library — Repository Sync Engine V1

- **Working Product:** Library
- **Document Type:** Repository Revision Synchronization Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define how Library tracks source repositories over time, detects revision deltas, classifies material change, and triggers bounded incremental analysis and study updates.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Repository Sync vs Library Sync
3. Engine Ownership
4. Tracked Repository
5. Revision Model
6. Sync Sources
7. Polling Strategy
8. Webhook Strategy
9. Delta Calculation
10. Change Classification
11. Material Change Policy
12. Incremental Re-Analysis Trigger
13. Study Update Trigger
14. Sync State
15. Inter-Engine Contracts
16. Terminal Interface
17. Events
18. Failure and Recovery
19. Rate Limits and Credentials
20. GitHub Repositories and Lessons
21. V1 Recommendation
22. Non-Goals
23. V1 Conceptual Architecture
24. Future Evolution
25. Design Principles

---

# 1. Engine Vision

Repository Sync turns a one-time Repository Study into a living relationship with the source repository.

A Study should know whether the source repository has changed since it was analyzed.

```text
Study V1
Source SHA A
     │
Repository changes
     │
     ▼
Source SHA B
     │
Repository Sync
     │
     ▼
Delta / Impact
     │
     ▼
Study V2 if needed
```

---

# 2. Repository Sync vs Library Sync

These engines solve different problems.

Repository Sync:

```text
GitHub / Git repository
        ↕
Tracked source revision and Study
```

Library Synchronization:

```text
CLI ↔ Local Runtime ↔ project projections ↔ future game
```

Repository Sync must not become the general cross-interface synchronization engine.

---

# 3. Engine Ownership

Repository Sync owns:

- Tracked repository state.
- Tracked branch/reference.
- Last observed remote revision.
- Last analyzed revision.
- Source delta records.
- Sync policy.
- Material-change classification.
- Re-analysis trigger decision.

It does not own:

- Study document content.
- Analysis conclusions.
- Search rankings.
- GitHub credentials.
- General Library client synchronization.

---

# 4. Tracked Repository

Conceptual schema:

```text
TrackedRepository
├── repository_id
├── provider
├── remote_identity
├── tracked_ref
├── last_seen_revision
├── last_analyzed_revision
├── last_study_version
├── sync_policy
├── sync_state
└── last_checked_at
```

A tracked branch is preferable to assuming `main` forever.

---

# 5. Revision Model

The engine treats immutable commit SHAs as source evidence.

Branch names are moving pointers.

```text
tracked_ref = main
last_seen_revision = SHA-B
last_analyzed_revision = SHA-A
```

This distinction is required to know whether the Study is current.

---

# 6. Sync Sources

V1 should support two broad paths.

## Remote metadata path

Use provider APIs to inspect the current branch/ref and compare revisions.

## Local Git path

Use a local cached or research-workspace clone for richer commit, tree, and diff operations.

These paths can cooperate.

---

# 7. Polling Strategy

For arbitrary public repositories where Library cannot install webhooks:

```text
Scheduled / manual check
      ↓
Get tracked ref HEAD
      ↓
Compare with last_seen_revision
      ↓
No change → stop cheaply
Change    → calculate delta
```

Polling frequency should be configurable and conservative.

---

# 8. Webhook Strategy

For repositories where the user owns or authorizes an integration:

```text
GitHub webhook
      ↓
push / release / relevant event
      ↓
Verify webhook
      ↓
Resolve tracked ref
      ↓
Sync check
```

Webhooks reduce unnecessary polling but are not a requirement for external public repositories.

---

# 9. Delta Calculation

A source delta may include:

```text
RepositoryDelta
├── base_revision
├── head_revision
├── commits[]
├── changed_files[]
├── added_files[]
├── deleted_files[]
├── renamed_files[]
├── manifest_changes[]
├── documentation_changes[]
└── affected_paths[]
```

The delta itself is evidence.

---

# 10. Change Classification

Not every source change deserves agent re-analysis.

Possible classes:

- Documentation-only.
- Test-only.
- Build/configuration.
- Dependency change.
- Public API change.
- Internal implementation.
- Architecture-affecting.
- Security-sensitive.
- Unknown.

Classification should be evidence-driven and may begin deterministically.

---

# 11. Material Change Policy

Policies may include:

- Manual only.
- Every release.
- Every N commits.
- Daily if changed.
- Material changes only.
- Specific path watch.

The default should avoid expensive re-analysis for trivial changes.

---

# 12. Incremental Re-Analysis Trigger

When a material delta exists:

```text
Repository Delta
       ↓
Impact Scope
       ↓
Analysis Engine
       ↓
Targeted evidence refresh
       ↓
Incremental AnalysisResult
```

The Sync Engine requests analysis. It does not perform the reasoning itself.

---

# 13. Study Update Trigger

After incremental analysis:

```text
Analysis Result
      ↓
Study / Document Engine
      ↓
Candidate Study V2
      ↓
Study Lineage Engine
```

Study V1 remains immutable.

If the source changed but no material finding changed, Sync may update sync state without forcing a full new Study version, depending on policy.

---

# 14. Sync State

Possible state:

```text
UP_TO_DATE
SOURCE_CHANGED
ANALYSIS_REQUIRED
ANALYSIS_RUNNING
STUDY_UPDATE_PENDING
ERROR
PAUSED
```

The future game may display these states, but the Sync Engine owns only the underlying state, not its visual representation.

---

# 15. Inter-Engine Contracts

## Search → Sync

Search-selected repositories may be registered for tracking after explicit user action.

## Sync → Analysis

Passes revision delta and impact scope.

## Sync → Study Lineage

Links source revision changes to Study versions.

## Sync → Memory

Significant source changes may invalidate or supersede memory derived from an old Study. Memory decides the canonical change.

## Sync → Library Synchronization

Emits events so CLI and future game surfaces update their status.

---

# 16. Terminal Interface

Conceptual commands:

```text
library repo track github.com/example/repo
library repo sync github.com/example/repo
library repo status github.com/example/repo
library repo changes github.com/example/repo
library repo policy github.com/example/repo --material-only
library repo untrack github.com/example/repo
```

---

# 17. Events

Potential events:

```text
repository.track.created
repository.sync.checked
repository.changed
repository.delta.created
repository.material_change.detected
repository.reanalysis.requested
repository.sync.error
```

---

# 18. Failure and Recovery

Sync must be restart-safe.

Important properties:

- Never mark a revision analyzed before Analysis actually succeeds.
- Preserve last known good state.
- Retry provider failures with bounded backoff.
- Distinguish authentication failure from no repository change.
- Make interrupted sync checks idempotent.

---

# 19. Rate Limits and Credentials

Remote checks consume provider quotas.

The engine must cooperate with a shared credential/rate-limit service.

It should batch or avoid redundant checks where possible and never persist secrets in Study documents.

---

# 20. GitHub Repositories and Lessons

## GitoxideLabs/gitoxide

Repository: https://github.com/GitoxideLabs/gitoxide

**Classification:** Strong Integrate Candidate / Git Plumbing Reference.

Useful capabilities:

- Git implementation in Rust.
- Clone and fetch.
- Status.
- Blob/tree diff.
- Commit-graph traversal.
- Revisions and refs.
- Worktree and object access.
- Pathspec and ignore handling.

Important caution:

- Individual crates have different maturity levels. Select only the required stable-enough APIs after review.

## octokit/octokit.js

Repository: https://github.com/octokit/octokit.js

**Classification:** Strong GitHub Provider Candidate.

Useful capabilities:

- REST / GraphQL.
- GitHub App authentication.
- Retry / throttling.
- API access for commits, refs, comparison, releases, and repository metadata.

## octokit/webhooks.js

Repository: https://github.com/octokit/webhooks.js

**Classification:** Supporting Component.

Useful role:

- Webhook types, verification, and event handling for repositories where the user can install an integration.

## sourcegraph/zoekt

Repository: https://github.com/sourcegraph/zoekt

**Classification:** Architecture / Supporting Reference.

Useful lesson:

- Its index server periodically fetches and reindexes repositories from a code host.
- Demonstrates separation between repository synchronization and search serving.

Library's Study synchronization requires different domain state, so Zoekt sync should not replace Repository Sync.

---

# 21. V1 Recommendation

Build Repository Sync V1 around:

```text
Tracked repository record
+ immutable commit SHA model
+ Octokit provider checks
+ optional webhook input
+ Gitoxide/local Git delta operations
+ Library-owned change classification
+ material-change policy
+ explicit Analysis trigger
```

Do not add CRDT technology to repository revision tracking.

---

# 22. Non-Goals

Repository Sync V1 is not:

- General Library UI synchronization.
- A Git hosting platform.
- A background code editor.
- Automatic source code mutation.
- Automatic re-analysis on every commit regardless of cost.
- A CRDT engine.

---

# 23. V1 Conceptual Architecture

```text
Tracked Git Ref
      │
      ├── Polling / API
      └── Webhook
            │
            ▼
     Resolve Remote HEAD
            │
            ▼
      Revision Changed?
       │           │
      No          Yes
       │           ▼
      Stop    Delta Calculation
                   │
                   ▼
            Change Classifier
                   │
                   ▼
             Material Change?
              │          │
             No         Yes
              │          ▼
       Update sync    Analysis Engine
          state           │
                          ▼
                     Study Update
```

---

# 24. Future Evolution

Possible future additions:

- Release-aware policies.
- Dependency-specific materiality rules.
- Cross-fork tracking.
- Organization-scale webhook ingestion.
- Offline queued sync checks.
- Signed source snapshots.
- Multi-provider repository tracking.

---

# 25. Design Principles

- Branch names move; commit SHAs are evidence.
- Sync cheaply before reasoning expensively.
- Delta before re-analysis.
- Never overwrite old Study versions.
- Repository Sync owns source freshness, not analysis meaning.
- External repository code remains untrusted.
