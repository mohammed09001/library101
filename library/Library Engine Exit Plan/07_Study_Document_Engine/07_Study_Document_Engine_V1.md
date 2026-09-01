# Library — Study / Document Engine V1

- **Working Product:** Library
- **Document Type:** Structured Knowledge Artifact Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 10:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Design Foundation
- **Language:** English
- **Purpose:** Define how Library converts analysis and evidence into durable structured studies that can render to Markdown, terminal views, exports, and later game documents without binding the engine to any one presentation.
- **Architecture Rule:** The engine is independently owned and independently testable, but may consume other Library engines only through versioned contracts, never by reading another engine's private store.

---

# Table of Contents

1. Engine Vision
2. Study vs Analysis Boundary
3. Study as Structured Artifact
4. Engine Ownership
5. Repository Study Schema
6. Evidence References
7. Study Builder Pipeline
8. Document AST / Intermediate Representation
9. Rendering
10. Export
11. User Notes and Annotations
12. Inter-Engine Contracts
13. Terminal Interface
14. Events
15. Validation
16. Storage Boundary
17. GitHub Repositories and Lessons
18. V1 Recommendation
19. Non-Goals
20. V1 Conceptual Architecture
21. Future Evolution
22. Design Principles

---

# 1. Engine Vision

The Study / Document Engine turns raw analytical output into a durable, inspectable knowledge artifact.

A Repository Study should not simply be the final paragraph returned by Claude, Codex, Gemini, OpenCode, or another worker.

Library owns the Study schema.

The selected agent contributes reasoning; the Study Engine owns document structure and validation.

---

# 2. Study vs Analysis Boundary

```text
Analysis Engine
      ↓
AnalysisResult + Evidence
      ↓
Study / Document Engine
      ↓
Structured Study
```

Analysis answers the technical question.

Study organizes the answer as a durable artifact.

---

# 3. Study as Structured Artifact

A Study should have both machine-readable structure and human-readable renderings.

```text
Canonical Study
      │
      ├── Markdown rendering
      ├── Terminal rendering
      ├── HTML rendering
      ├── Context projection
      └── Future game book
```

The canonical representation should not be the 3D book object.

---

# 4. Engine Ownership

Study owns:

- Study identity.
- Study schema.
- Section semantics.
- Study metadata.
- Evidence attachment structure.
- Annotation model.
- Rendering pipeline.
- Export pipeline.

Study Lineage owns version relationships between immutable Study versions.

---

# 5. Repository Study Schema

Initial structure:

```text
RepositoryStudy
├── Study Identity
├── Repository Identity
├── Source Revision
├── Study Purpose
├── Analysis Mode
├── Analyzer / Worker
├── Executive Summary
├── Architecture
├── Important Components
├── Execution Flow
├── Data Flow
├── Relevant Files
├── Design Patterns
├── Strengths
├── Limitations
├── Evidence
├── Unresolved Questions
└── User Notes
```

Specific study types may omit irrelevant sections while preserving the shared base schema.

---

# 6. Evidence References

Evidence should remain structured.

Example:

```text
EvidenceRef
├── source_repository_id
├── source_revision
├── path
├── symbol?
├── line_range?
├── evidence_type
└── digest?
```

Rendered documents may show friendly citations, but the underlying stable reference is preserved.

---

# 7. Study Builder Pipeline

```text
AnalysisResult
      ↓
Schema Validation
      ↓
Section Normalization
      ↓
Evidence Binding
      ↓
Study AST / IR
      ↓
Canonical Study Record
      ↓
Renderers
```

A missing section should be explicit rather than silently fabricated.

---

# 8. Document AST / Intermediate Representation

Using a structured intermediate representation allows Library to inspect and transform content without parsing arbitrary Markdown every time.

Conceptual:

```text
StudyNode
├── Heading
├── Paragraph
├── BulletList
├── CodeBlock
├── EvidenceCitation
├── Table
├── Callout
└── AnnotationAnchor
```

This IR can map naturally to Markdown syntax trees.

---

# 9. Rendering

V1 should prioritize:

- Markdown.
- Terminal text.
- HTML if useful for desktop UI.

Renderers should consume the same canonical Study.

No renderer owns the Study meaning.

---

# 10. Export

Exports are presentation products.

Possible later outputs:

```text
Markdown
HTML
PDF
DOCX
```

Export failure must not corrupt the canonical Study.

---

# 11. User Notes and Annotations

User notes may be attached to a Study without rewriting the agent-generated historical artifact.

Recommended distinction:

```text
Study Core
= immutable study content for a version

User Annotation
= separately versioned user-controlled layer
```

This prevents a later note from changing what Study V1 originally concluded.

---

# 12. Inter-Engine Contracts

## Analysis → Study

Provides validated `AnalysisResult` and evidence references.

## Study → Lineage

Creates a new immutable Study version candidate.

## Study → Memory

May propose durable insights with a Study Version source reference.

## Study → Context

Provides bounded sections and summaries for Context Packs.

## Study → Projection

May render project-local study summaries or managed Markdown files.

## Study → Sync

Study creation/update events are propagated to clients through Library Synchronization.

---

# 13. Terminal Interface

Conceptual commands:

```text
library study list
library study show <study-id>
library study evidence <study-id>
library study export <study-id> --format markdown
library study note <study-id> "..."
```

Version-specific commands belong partly to Study Lineage.

---

# 14. Events

Potential events:

```text
study.created
study.rendered
study.exported
study.annotation.created
study.validation.failed
```

Version creation should additionally emit the Lineage-owned `study.version.created` event.

---

# 15. Validation

The engine should validate:

- Required identity fields.
- Source revision.
- Analysis origin.
- Evidence reference shape.
- Section schema.
- Unsupported content nodes.
- Rendering safety.

A renderer should never be required to infer missing identity or revision metadata.

---

# 16. Storage Boundary

Canonical Study data is separate from generated files.

```text
Canonical Study Store
      │
      ├── renderer → Markdown file
      ├── renderer → HTML
      └── exporter → PDF/DOCX
```

Generated files can always be rebuilt from the canonical version where possible.

---

# 17. GitHub Repositories and Lessons

## unifiedjs/unified

Repository: https://github.com/unifiedjs/unified

**Classification:** Strong Integrate Candidate / Architecture Reference.

Useful capabilities:

- Parse → syntax tree → transform → compile pipeline.
- Plugin-based content processing.
- Markdown ecosystem through remark.
- HTML ecosystem through rehype.
- Natural-language ecosystem through retext.
- File metadata through VFile patterns.

This maps well to Study IR, validation, transformations, and multiple renderers.

## jgm/pandoc

Repository: https://github.com/jgm/pandoc

**Classification:** Supporting Export Tool.

Useful role:

- Convert stable Study renderings such as Markdown into multiple publication formats.

Pandoc should be an export boundary, not the canonical Study representation.

---

# 18. V1 Recommendation

Build Study V1 around:

- Library-owned structured Study schema.
- Immutable source revision metadata.
- Evidence references.
- A syntax-tree / IR representation.
- Markdown renderer.
- Terminal renderer.
- Optional Pandoc-based export later.

Keep user annotations separate from immutable Study core content.

---

# 19. Non-Goals

Study V1 is not:

- The Repository Analysis Engine.
- A raw LLM transcript archive.
- A PDF-first storage system.
- A game-book renderer.
- A replacement for Memory.
- The owner of Study version lineage.

---

# 20. V1 Conceptual Architecture

```text
AnalysisResult + Evidence
          │
          ▼
    Study Validator
          │
          ▼
      Study Builder
          │
          ▼
     Study AST / IR
          │
          ▼
  Canonical Study Record
          │
   ┌──────┼───────────┐
   ▼      ▼           ▼
Markdown Terminal    HTML
   │
   ▼
Optional Export Layer
   │
   └── PDF / DOCX / etc.
```

---

# 21. Future Evolution

Possible future additions:

- Additional Study types.
- Rich visual diagrams.
- Evidence hover cards.
- Collaborative annotations.
- Signed Study exports.
- Study templates.
- Public-library publishing projection.

---

# 22. Design Principles

- Structure before presentation.
- Analysis reasons; Study organizes.
- Evidence is first-class.
- Canonical content is renderable to many clients.
- Export formats never become the source of truth.
- User notes do not rewrite immutable historical conclusions.
