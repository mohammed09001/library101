# Library Study / Document Engine — Roadmap of Tasks V1

- **Working Product:** Library
- **Engine:** Library Study / Document Engine
- **Document Type:** Engineering Task Roadmap
- **Version:** V1
- **Date:** 30 August 2026
- **Time:** 11:13 AM
- **Timezone:** Asia/Muscat
- **Status:** Living implementation roadmap
- **Operating Strategy:** Backend-first → Terminal-usable → Agent-tool-usable → Game integration later.
- **Ordered implementation tasks:** 35
- **Architecture Rule:** Build independently, integrate through versioned contracts/events, never through another engine's private store.
- **Execution Rule:** Execution prompts compiled from this roadmap are self-contained; coding agents must not need this roadmap file at runtime.

# Roadmap Doctrine

This roadmap translates the V1 Engine design into implementable repository work. Task numbering expresses dependency order, not calendar estimates. Existing repository code that already satisfies a task must be verified and preserved rather than rebuilt. Every external project listed here is a research input; the implementation agent must inspect current upstream source/docs when the task materially depends on that behavior.

# External Research Baseline

- **unifiedjs/unified** — Plugin-based parse → syntax tree → transform → compile pipeline across mdast/hast/nlcst ecosystems, with file metadata via vfile. Use a structured Study IR/AST and deterministic renderers.
- **jgm/pandoc** — Reader → AST → filter → writer model and broad document export. Keep Pandoc outside canonical Study ownership; export from a validated Library Study representation.
- **modelcontextprotocol/typescript-sdk** — Expose tools/resources/prompts through a standard agent-facing protocol. The 2026-07-28 MCP line uses a stateless protocol core and updated routing/auth semantics; verify the current SDK/spec during execution rather than coding against stale examples.

# Ordered Tasks

# PHASE I — STUDY ARTIFACT AND SCHEMA FOUNDATION

## Task 1: Freeze Study vs Analysis/Lineage ownership

Study owns structured artifact construction/rendering; Analysis owns investigation; Lineage owns immutable version relationships.

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

## Task 2: Define stable Study and section identifiers

Model Study identity separately from StudyVersion; define stable section/finding/evidence-anchor IDs so lineage/diffs can track meaning across renders.

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

## Task 3: Define RepositoryStudy schema

Specify source repository/revision, purpose, executive summary, architecture, components, flows, relevant files, patterns, strengths, limitations, evidence, notes and analysis metadata.

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

## Task 4: Define evidence-reference schema

Use typed references to repository path/range/symbol/revision and Analysis evidence IDs; rendered citations cannot point to mutable HEAD without revision.

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

## Task 5: Define Study intermediate representation

Use a structured AST/IR rather than raw Markdown as canonical content, enabling multiple renderers and stable section identities.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `unifiedjs/unified`: inspect processor parse/run/stringify, plugin contracts, mdast/remark ecosystem, vfile metadata. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 6: Publish Study contracts/events

Define study.build/get/render/validate/export/annotate plus study.created/updated events.

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

# PHASE II — BUILDER AND VALIDATION PIPELINE

## Task 7: Build AnalysisResult → Study builder

Map validated analysis fields/findings into Study IR deterministically; missing required evidence stays explicit.

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

## Task 8: Build schema and semantic validation

Validate required sections, unique IDs, evidence existence, source-revision consistency, bounded field sizes and claim/evidence classes.

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

## Task 9: Build citation/evidence renderer

Render human-readable evidence links/footnotes with path, revision and location while retaining machine IDs.

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

## Task 10: Build finding normalization

Represent claim, evidence, confidence, status, scope and limitations as structured nodes rather than prose-only paragraphs.

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

## Task 11: Build deterministic ordering and formatting rules

Ensure equivalent Study IR renders diff-friendly stable Markdown/JSON independent of incidental map iteration/order.

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

## Task 12: Build partial/failure artifact semantics

Do not manufacture complete Studies when Analysis is partial; allow explicit incomplete Study drafts or fail validation according to mode.

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

# PHASE III — DOCUMENT PIPELINE AND RENDERERS

## Task 13: Integrate unified/remark-style pipeline

Use parse/run/stringify/plugin concepts for document transforms where it reduces custom complexity, while keeping Library Study IR authoritative.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `unifiedjs/unified`: inspect processor parse/run/stringify, plugin contracts, mdast/remark ecosystem, vfile metadata. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 14: Build Markdown renderer

Render stable readable Markdown with metadata, TOC, evidence, limitations and generated markers.

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

## Task 15: Build structured JSON renderer

Expose complete machine-readable Study/version representation for CLI, agents and future game client.

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

## Task 16: Build HTML renderer or transform path

Provide sanitized HTML for future desktop/game reader without coupling Study to a specific UI framework.

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

## Task 17: Build rendering plugin interface

Allow future sections/transforms/renderers through versioned plugins that cannot mutate canonical evidence silently.

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

## Task 18: Build renderer snapshots and compatibility

Version renderer behavior and preserve fixtures so visual formatting changes do not masquerade as semantic Study changes.

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

# PHASE IV — NOTES, EXPORT, AND CROSS-ENGINE HANDOFFS

## Task 19: Build user annotation model

Keep user notes/annotations as separately identified mutable records linked to Study/section/version, not edits that rewrite generated evidence.

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

## Task 20: Build annotation merge into render views

Render selected annotations alongside canonical Study while preserving ownership/provenance.

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

## Task 21: Build Pandoc export adapter

Export validated Study render/AST to PDF/DOCX/etc via Pandoc as an optional adapter; Pandoc output is not canonical Study state.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `jgm/pandoc`: inspect Pandoc AST, JSON/Lua filters, reader/writer model, metadata/citations. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 22: Integrate Study → Lineage

On accepted Study version creation, hand immutable StudyVersion payload/hash/source revision to Lineage; Study does not manage parent/successor itself.

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

## Task 23: Integrate Study → Memory candidates

Propose selected evidence-backed findings or user notes to Memory with StudyVersion provenance.

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

## Task 24: Integrate Study → Context

Expose bounded section/finding retrieval for Context rather than dumping entire documents.

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

## Task 25: Integrate Study → Project Projection

Provide render handles/metadata; Projection writes project files, Study does not.

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

# PHASE V — TERMINAL, SECURITY, AND OPERATIONS

## Task 26: Build the Study CLI

Support get, list, render, validate, export, evidence and annotations with version selection and JSON output.

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

## Task 27: Expose Study read tools over MCP/host-native interfaces

Allow agents to retrieve sections/findings/evidence by version and ID; mutation/annotation requires policy.

**Required engineering outcomes:**
- Locate and preserve any existing canonical implementation before adding a new owner.
- Implement the capability through versioned Engine contracts and stable identities.
- Define negative/degraded behavior, persistence/recovery implications, privacy/security boundaries, and observability for this scope.
- Add focused tests plus at least one boundary/failure case able to falsify a false completion claim.

**Research / terminology targets:**
- `modelcontextprotocol/typescript-sdk`: inspect server/client package split, tool schemas, stdio transport, Streamable HTTP. Apply only patterns compatible with Library ownership and licensing.

**Completion evidence:**
- Focused tests plus repository-native verification demonstrating the behavior and its failure mode.
- Fresh final-state repository evidence must support the Goal; agent prose alone is not proof.

## Task 28: Build content sanitization

Escape/sanitize untrusted repository/agent text for Markdown/HTML rendering and prevent embedded content from gaining tool/policy authority.

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

## Task 29: Build large-Study streaming/bounded reads

Support section-level reads and rendering without loading/exporting unnecessary evidence blobs.

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

## Task 30: Instrument Study build/render health

Measure validation failures, render latency, export failures, evidence link integrity and version compatibility.

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

# PHASE VI — QUALIFICATION AND V1 GATE

## Task 31: Build frozen Study IR fixtures

Cover complete, partial, conflicting, malicious-text, missing-evidence and annotation cases.

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

## Task 32: Build renderer equivalence qualification

Prove Markdown/JSON/HTML views represent the same semantic Study nodes/evidence IDs.

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

## Task 33: Build export and sanitization qualification

Test Pandoc missing/failing, dangerous HTML/Markdown, huge text and broken evidence references.

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

## Task 34: Build Lineage/Projection integration qualification

Ensure Study creation hands off immutable version data once and generated project files can be regenerated without becoming canonical.

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

## Task 35: Final Study / Document Engine gate

Prove structured artifact ownership, evidence-grounded rendering, extensible pipeline, terminal usefulness and game-agnostic design.

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

Library Study / Document Engine V1 is complete when every ordered Task is either verified as already satisfied or implemented, every Execution Prompt reaches YES, the Engine is usable from the real terminal without the game, cross-engine integration uses only versioned contracts, failure/degraded states are explicit, and final qualification proves the Engine's domain ownership rather than only compilation.
