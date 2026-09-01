# Library — Study Lineage / Versioning Engine V1

- **Working Product:** Library
- **Document Type:** Knowledge Version Lineage Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define immutable study history, source-revision linkage, supersession, diffing, and temporal traceability for Living Repository Studies.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Why Lineage Is Separate
3. Engine Ownership
4. Stable Study Identity
5. Immutable Study Version
6. Source Revision Link
7. Parent / Successor Relationships
8. Supersession Model
9. Version Diff
10. Living Repository Study
11. Temporal Queries
12. Annotation Lineage
13. Inter-Engine Contracts
14. Terminal Interface
15. Events
16. Storage Model
17. Integrity Rules
18. GitHub Repositories and Lessons
19. V1 Recommendation
20. Non-Goals
21. V1 Conceptual Architecture
22. Future Evolution
23. Design Principles

---

# 1. Engine Vision

Study Lineage preserves how technical understanding changes over time.

A repository is not static, so its Study cannot be treated as one mutable Markdown file.

```text
Study X
│
├── V1 — source SHA A
├── V2 — source SHA B
├── V3 — source SHA C
└── V4 — source SHA D
```

Each version remains inspectable after newer versions exist.

---

# 2. Why Lineage Is Separate

Study / Document owns document structure and rendering.

Study Lineage owns version history.

This separation allows versioning to evolve without making the document renderer responsible for Git-like semantics.

---

# 3. Engine Ownership

Lineage owns:

- Stable study family identity.
- Immutable version identities.
- Parent relationships.
- Current-version pointer.
- Superseded relationships.
- Source revision mapping.
- Version diff metadata.
- Version integrity.

It does not own:

- Repository delta calculation.
- Analysis reasoning.
- Study section rendering.
- Memory facts.

---

# 4. Stable Study Identity

A Living Study has one stable identity.

```text
StudyFamily
├── study_id
├── repository_id
├── study_type
├── purpose_key
├── created_at
└── current_version_id
```

The stable ID survives source revisions.

---

# 5. Immutable Study Version

Conceptual schema:

```text
StudyVersion
├── version_id
├── study_id
├── version_number
├── parent_version_id?
├── source_revision
├── analysis_id
├── created_at
├── created_by_agent?
├── content_digest
├── status
└── change_summary
```

Once committed, V1 should not be edited into V2.

V2 is a new version.

---

# 6. Source Revision Link

Every repository-derived version must point to the exact source revision used for its evidence.

```text
Study V2
→ repository SHA 93abc...
```

This allows the system to distinguish:

- Study is current.
- Source changed after Study.
- Study was generated from another branch.
- Study content is historical.

---

# 7. Parent / Successor Relationships

Typical path:

```text
V1
 ↓
V2
 ↓
V3
```

But the schema should not assume a future can never branch.

Possible later pattern:

```text
V2
├── V3-main
└── V3-release
```

V1 can begin linear while retaining IDs that do not block branch-aware evolution.

---

# 8. Supersession Model

A new version should explain whether conclusions are:

- Unchanged.
- Updated.
- Superseded.
- Removed from current relevance.
- Newly introduced.

This is stronger than a raw text diff.

Conceptual:

```text
Finding F-12 in V1
   ↓ superseded by
Finding F-31 in V2
```

---

# 9. Version Diff

`study.diff` should combine two perspectives.

## Structural document diff

Which sections, findings, and evidence references changed?

## Semantic change summary

What changed in understanding and why?

The semantic summary may come from Analysis, but Lineage stores its version relationship.

---

# 10. Living Repository Study

A Living Repository Study is a Study Family linked to a tracked repository.

```text
LivingStudy
├── Source Repository
├── Tracked Branch
├── Current Source Revision
├── Current Study Version
├── Previous Versions
├── Evidence History
└── Sync State
```

Repository Sync keeps source freshness; Lineage preserves Study history.

---

# 11. Temporal Queries

The engine should support questions such as:

- What did Study V1 say?
- What changed between V1 and V4?
- When did this architecture conclusion change?
- Which source revision caused the change?
- Which Study version was current on a given date?

---

# 12. Annotation Lineage

User annotations should maintain their own history where editing matters.

Do not mutate Study V1 core content merely because the user later added a note.

Possible model:

```text
StudyVersion V1
└── AnnotationThread
    ├── Annotation Rev 1
    └── Annotation Rev 2
```

---

# 13. Inter-Engine Contracts

## Study → Lineage

Submits a validated Study version candidate.

## Repository Sync → Lineage

Provides the source revision relationship and freshness state.

## Analysis → Lineage

Supplies analysis identity and semantic change summary references.

## Memory → Lineage

Memory may reference a specific Study Version and react when it becomes superseded.

## Context → Lineage

Context should normally use the current version unless the request explicitly asks for historical knowledge.

---

# 14. Terminal Interface

Conceptual commands:

```text
library study versions <study-id>
library study show <study-id>@v2
library study diff <study-id>@v1 <study-id>@v3
library study history <study-id>
library study current <study-id>
```

---

# 15. Events

Potential events:

```text
study.family.created
study.version.created
study.version.superseded
study.current.changed
study.lineage.integrity_failed
```

---

# 16. Storage Model

Lineage metadata should be append-oriented.

Possible entities:

```text
study_families
study_versions
study_version_parents
study_supersessions
study_version_changes
study_source_revisions
annotation_versions
```

Content may remain in the Study store while Lineage references its immutable digest/version ID.

---

# 17. Integrity Rules

Important rules:

- Version numbers are monotonic inside a simple linear Study family.
- Content digest is immutable after commit.
- A Study Version references one authoritative source revision set.
- Current pointer changes atomically.
- Parent references cannot form cycles.
- A deleted source repository does not delete Study history.

---

# 18. GitHub Repositories and Lessons

## dolthub/dolt

Repository: https://github.com/dolthub/dolt

**Classification:** Architecture Reference.

Useful ideas:

- Git-like version control for structured data.
- Commit history.
- Diff.
- Branching.
- Time travel.
- Blame / provenance concepts.

Library should borrow the structured-lineage philosophy without requiring Dolt as its V1 database.

## GitoxideLabs/gitoxide

Repository: https://github.com/GitoxideLabs/gitoxide

**Classification:** Supporting Repository-Revision Component.

Useful role:

- Read Git revisions, commit graph, trees, and diffs used to relate Study versions to actual source history.

Gitoxide does not version Study records itself.

## getzep/graphiti

Repository: https://github.com/getzep/graphiti

**Classification:** Temporal / Provenance Architecture Reference.

Useful ideas:

- Validity windows.
- Historical facts.
- Supersession without destructive deletion.
- Provenance back to source episodes.

These concepts are valuable even if Library does not adopt a graph database in V1.

---

# 19. V1 Recommendation

Implement an append-oriented Library-owned Lineage model with:

- Stable Study Family IDs.
- Immutable Study Version IDs.
- Parent version references.
- Source commit SHA.
- Content digests.
- Current pointer.
- Supersession links.
- Version diff metadata.

Do not require Git branches or a version-control database for Study content in V1.

---

# 20. Non-Goals

Lineage V1 is not:

- Repository Sync.
- Git itself.
- A document renderer.
- A Memory engine.
- A collaborative CRDT editor.
- A mechanism for rewriting old Study versions.

---

# 21. V1 Conceptual Architecture

```text
Study Builder
    │
    ▼
Candidate Study Version
    │
    ▼
Lineage Validation
    │
    ▼
Immutable Version Commit
    │
    ├── Parent Version
    ├── Source Revision
    ├── Content Digest
    └── Change Summary
    │
    ▼
Update Current Pointer
    │
    ▼
History / Diff / Temporal Query
```

---

# 22. Future Evolution

Possible future additions:

- Branch-aware Study families.
- Merge/reconciliation of independent analyses.
- Signed Study versions.
- Cross-repository Study lineage.
- Rich finding-level blame.
- Public-library fork lineage.

---

# 23. Design Principles

- Never overwrite history that matters.
- Source revision is first-class.
- Version identity is independent of filenames.
- Separate structural diff from semantic change.
- Preserve provenance after the source disappears.
- Temporal knowledge must be queryable, not merely archived.
