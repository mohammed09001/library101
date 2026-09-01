# Library — Engine Version V1

- **Working Title:** Library
- **Document Type:** Product Vision + Game/Engine Design Foundation
- **Engine Version:** V1
- **Date:** 30 August 2026
- **Time:** 09:28 AM
- **Timezone:** Asia/Muscat
- **Status:** Working Vision
- **Language:** English
- **Purpose:** Define the current agreed vision for Library before implementation-specific roadmaps are written.
- **Naming Note:** “Library” is a temporary working name and is expected to change later.

---

# Table of Contents

1. Product Vision
2. Core Purpose
3. Product Identity
4. One User, One Library
5. Project Organization
6. Agent Organization
7. Automatic Library Expansion
8. First-Person Experience
9. Day and Night System
10. Desktop-First Distribution
11. Terminal Installation and Project Initialization
12. Project Anchor / Sensor
13. Local Runtime and Engine Host
14. Passive Agent Observation
15. Performance Engine Role
16. Performance Documents
17. Parent Performance
18. Child Performance
19. Project Performance
20. Terminal Performance Interface
21. Project Memory
22. Knowledge Reuse Between Agents
23. Context Packs and Synchronization
24. External Resources
25. Agent-Guided Research
26. Repository Search Engine
27. Repository Analysis
28. In-Game Research Terminal
29. Bring Your Own Agent
30. Learning and Inspection
31. Productivity and Entertainment
32. Goals and Progress
33. Local-First and Self-Hosted Model
34. Public Library Boundary
35. Data and Storage Model
36. Game and Software Interaction Model
37. Performance Roadmap Migration Strategy
38. Design Principles
39. Non-Goals
40. V1 Conceptual Architecture
41. Core User Journey
42. Long-Term Direction

---

# 1. Product Vision

Library is a desktop-first, first-person knowledge and productivity simulation for people who work with coding agents such as Claude Code, Codex, OpenCode, and future development agents.

The user owns one persistent personal library. This library becomes the visual and interactive representation of the user’s projects, completed agent work, prompts, outputs, performance analysis, project memory, research, external resources, notes, and other useful development knowledge.

Library is not intended to be only a game, only a dashboard, or only a document manager. It combines a playable environment with real software-development history and knowledge.

- The user can explore the library for enjoyment.
- The user can study previous work and learn from it.
- The user can understand what coding agents actually did.
- The user can measure and improve prompt and execution performance.
- The user can reuse old knowledge in new agent sessions.
- The user can communicate with the same knowledge system from the terminal without opening the game.
- Work done outside the game continuously enriches the game.
- Time spent inside the game should improve future work.

A central design principle is:

> **Work creates the game. Playing improves the work.**

---

# 2. Core Purpose

Library is designed around several connected benefits rather than one isolated feature.

- **Entertainment:** the user can walk, explore, organize, inspect, and interact with a personal knowledge space.
- **Learning:** the user can understand how agents reasoned, what they changed, what succeeded, and what required correction.
- **Productivity:** project history, prior decisions, performance records, research, and useful resources remain easy to retrieve.
- **Awareness:** the user gains a clearer view of what Claude Code, Codex, IDE tools, and other coding agents actually do.
- **Performance improvement:** the system studies prompts, executions, repository changes, verification, and historical outcomes.
- **Memory:** important project knowledge survives beyond individual agent conversations.
- **Research:** open-source repositories and other technical sources can be studied and converted into reusable knowledge.
- **Agent improvement:** agents receive better project context from the user’s own accumulated knowledge.

---

# 3. Product Identity

Library should be understood as a combination of several systems sharing one local knowledge core.

- A first-person simulation.
- A personal knowledge library.
- A development-history archive.
- A project memory system.
- A performance-analysis system.
- A terminal-accessible assistant.
- A research environment.
- A knowledge-reuse layer for coding agents.
- A future gateway to a public knowledge platform.

The first-person world is an interface over real stored knowledge. It is not a decorative skin over an unrelated database.

The terminal is another interface over the same knowledge.

The coding agents are producers and consumers of that knowledge.

---

# 4. One User, One Library

Each user owns one main persistent library.

A separate library is **not** created for every project or every coding agent.

All projects exist inside the same personal library.

Example:

```text
HOME LIBRARY
│
├── Project A
├── Project B
├── Project C
├── External Resources
├── Project Memory Areas
├── Research
└── Personal Notes
```

The library represents the user’s total accumulated technical knowledge and development history.

- Projects are sections inside the library.
- Agents are shelves or subsections inside project sections.
- Research and external knowledge can exist in dedicated areas.
- The library can remain useful even when no agent is currently running.

---

# 5. Project Organization

A project is represented as a section, shelf group, or larger physical area inside the main library.

The project is initially connected from the terminal by selecting its local path and initializing Library support.

A small project may use part of one shelf.

A larger project may occupy several shelves.

A very large long-running project may grow into a larger section.

The project remains part of the same Home Library regardless of size.

Example:

```text
HOME LIBRARY

Project: SaaS Platform
├── Claude Code
├── Codex
├── Performance
├── External Resources
├── Project Memory
└── Notes

Project: Security Tool
├── Claude Code
├── Codex
├── Performance
├── External Resources
└── Project Memory
```

---

# 6. Agent Organization

Coding agents do not receive separate libraries.

Instead, each project may contain a shelf or section for every agent that has actually been used on that project.

Example:

```text
PROJECT A
│
├── Codex Shelf
├── Claude Code Shelf
├── OpenCode Shelf
└── Performance Shelf
```

If Codex is used for the first time in a project, a Codex shelf can be created automatically.

If Claude Code is later used in the same project, a Claude Code shelf can be added.

Records can use:

- Agent identity.
- Sequential numbering.
- Date.
- Time.
- Project identity.
- Run identity.

Example:

```text
Codex
├── Run 001 — 30 Aug 2026
├── Run 002 — 30 Aug 2026
└── Run 003 — 31 Aug 2026
```

---

# 7. Automatic Library Expansion

The library exists from the beginning. Documents do not transform into shelves or rooms.

Instead, the **physical library expands when storage capacity is reached**.

Example:

```text
Shelf capacity reached
        ↓
Adjacent shelf added
        ↓
Project section expands
        ↓
New aisle added
        ↓
Library footprint expands
```

The expansion is based on real accumulated knowledge and activity.

- A shelf may have a defined capacity.
- New shelves are created when needed.
- A growing project expands near its existing location when possible.
- The system should preserve spatial memory and avoid randomly moving important project sections.
- Users may later be able to lock positions, reserve space, or manually reorganize sections.

The goal is for the size of the world to reflect the actual growth of the user’s work and knowledge.

---

# 8. First-Person Experience

Library uses a first-person point-of-view interaction model.

The user can:

- Walk through the library.
- Look around.
- Approach shelves.
- Open documents.
- Read prompt records.
- Inspect performance reports.
- Add notes.
- Move or organize documents.
- Search for information.
- Use research stations.
- Review project history.
- Interact with live agent activity.
- Explore completed knowledge.

The first-person system should provide:

- Spatial memory.
- Presence.
- Exploration.
- A sense of ownership.
- A more engaging way to review development history.

However, first-person interaction must not make common tasks slower than necessary.

Power tools such as search, quick open, filtering, and terminal commands remain available.

---

# 9. Day and Night System

The library world has a real-time day and night cycle linked to the user’s local system time.

The environment should gradually move through states such as:

- Dawn.
- Morning.
- Day.
- Sunset.
- Night.

The change is environmental, not only a dark/light theme.

Possible changes include:

- Sun direction.
- Exterior sky.
- Window lighting.
- Interior lamp activation.
- Shadows.
- Ambient sound.
- Screen visibility.
- Atmosphere.

The default mode should be **Real Time**.

Future optional modes may include:

- Fixed Day.
- Fixed Night.
- Accelerated Custom Cycle.

A nighttime library should feel calm and usable, not merely dark.

---

# 10. Desktop-First Distribution

Library is intended to be a desktop application rather than a browser-only game.

The main distribution model is:

```text
Official Library Website
        ↓
Download
        ↓
Desktop Application
```

The official website can later provide:

- Downloads.
- Documentation.
- Accounts.
- Public-library access.
- Platform information.
- Updates.

Steam is not required as the primary distribution channel.

The preferred current direction is a desktop application using a technology such as Tauri, with a 3D layer implemented using web-capable graphics technologies where appropriate.

This allows:

- Native-feeling installation.
- Local filesystem access.
- Local database access.
- Terminal integration.
- Smaller application footprint than a heavy game-engine workflow.
- 3D rendering without requiring the project to become a traditional AAA game-engine project.

---

# 11. Terminal Installation and Project Initialization

After downloading Library, the user links projects from the terminal.

Conceptually:

```bash
cd ~/Projects/MyProject
library init
```

Initialization should register the project with the local Library runtime.

The user can initialize multiple project paths.

Example:

```bash
cd ~/Projects/ProjectA
library init

cd ~/Projects/ProjectB
library init
```

Both projects become sections inside the same Home Library.

The user should not need to run a capture command before every agent prompt.

Initialization should make observation available automatically afterward.

---

# 12. Project Anchor / Sensor

Initialization should place or register a small project identity mechanism.

Working concepts:

- Project Anchor.
- Project Sensor.
- Project Marker.

Its purpose is to allow the project to remain identifiable even if its local folder moves.

Example:

```text
~/Projects/MyProject
        ↓ moved
~/Work/MyProject
```

Library should still understand that this is the same project.

The anchor may contain or reference:

- Stable project ID.
- Library registration.
- Enabled engines.
- Privacy rules.
- Ignore rules.
- Agent integration state.

The local path is therefore a connection point, not the final identity of the project.

---

# 13. Local Runtime and Engine Host

Library should install a local runtime that exists independently of the visual game window.

Conceptually:

```text
Desktop Game
     │
     ├── CLI
     ├── Local Runtime
     └── Engine Host
           ├── Performance
           ├── Search
           ├── Memory
           └── Future Engines
```

The visual world, terminal interface, and agent adapters should all connect to the same local runtime.

This avoids creating separate versions of the truth.

- The game does not own the canonical data.
- The CLI does not own the canonical data.
- The local runtime and stores are the shared foundation.

---

# 14. Passive Agent Observation

After initialization, users should continue working normally.

They may open:

- Claude Code CLI.
- Codex CLI.
- Claude Code Desktop.
- Codex Desktop.
- OpenCode.
- VS Code.
- Other supported IDEs or coding harnesses.

Library should observe supported agent activity through official or safe integration surfaces.

The goal is:

> **Attach and observe, not force the user to work through Library.**

Adapters should use supported hooks, plugins, events, structured APIs, or other approved integration surfaces.

The system should not rely on spying on raw keyboard input or screen contents.

---

# 15. Performance Engine Role

The current plan is to complete the existing Midnight Performance engine first and later copy it into the Library project.

After copying, the Library version will be adapted specifically for the game.

The Performance engine studies the full development experience:

```text
User Prompt
    ↓
Coding-Agent Execution
    ↓
Actual Repository Changes
    ↓
Verification
    ↓
Result
    ↓
Historical Learning
```

Within Library, Performance becomes both:

- A background analytical engine.
- A visible source of playable knowledge.

It should analyze:

- Prompt quality.
- Requirement clarity.
- Agent execution.
- Actual file changes.
- Verification.
- Scope.
- Evidence completeness.
- Historical patterns.
- Trends.
- Project memory.
- Later outcomes where available.

---

# 16. Performance Documents

Performance should not exist only as hidden analytics.

Completed work can generate readable Performance documents inside the library.

A Performance document may include:

- Original prompt.
- Agent used.
- Execution summary.
- Files changed.
- What was created.
- What was modified.
- What was deleted.
- Requirements.
- Verification.
- Final result.
- Performance analysis.
- Notes.
- Related runs.
- Evidence confidence.

The visual language should remain understandable.

Complex internal calculations should not overwhelm the player.

The user should see a clear explanation first and deeper technical details only when requested.

---

# 17. Parent Performance

Every completed prompt run can have a **Parent Performance** record.

Parent Performance explains the run as a whole.

Example:

```text
PERFORMANCE 0041
30 AUG 2026
CLAUDE CODE

Prompt:
Refactor authentication and add rate limiting.

Files changed:
10

Requirements verified:
8 / 9

Verification:
Tests passed
Lint passed

Scope:
Moderate

Result:
Mostly achieved
```

Parent Performance should answer:

- What did the user request?
- What did the agent attempt?
- What changed overall?
- How many files were affected?
- Which requirements were satisfied?
- Which requirements remain uncertain?
- What verification occurred?
- Did the final agent report match the evidence?
- Was the change focused or overly broad?
- What should the user learn from this run?

---

# 18. Child Performance

Each file changed by a prompt run can receive a **Child Performance** record.

If one prompt changes ten files, the Parent Performance explains the run as a whole, while ten child records explain the role of each changed file.

Example:

```text
Performance 0041
│
├── Child 01 — auth.ts
├── Child 02 — middleware.ts
├── Child 03 — rate-limit.ts
├── Child 04 — auth.test.ts
├── Child 05 — config.ts
└── ...
```

A Child Performance record can answer:

- Which file changed?
- Was it created, modified, deleted, renamed, or moved?
- Why did this file change?
- What semantic behavior changed?
- Which prompt requirement does the change relate to?
- Was the change requested or incidental?
- How was this file-level change verified?
- How confident is the explanation?

Example:

```text
CHILD PERFORMANCE 0041-03

File:
src/rate-limit.ts

Action:
Created

Purpose:
Implements the requested authentication rate limiting.

Related requirement:
R3

Verification:
Covered by rate-limit tests.

Confidence:
High
```

Child Performance should not merely repeat a raw Git diff.

It should turn file changes into understandable development knowledge.

---

# 19. Project Performance

Performance should also exist at a higher project level.

Project Performance summarizes historical trends across many completed runs.

Examples:

- Number of completed runs.
- Requirement coverage trend.
- Verification quality trend.
- Corrective-prompt trend.
- Scope-drift trend.
- Evidence completeness.
- Rework.
- Repeated patterns.
- Recent changes.

A project-level Performance Desk or analysis area can exist inside each project section.

The user should not be forced into one opaque “Performance Score.”

Multi-dimensional, explainable performance is preferred.

---

# 20. Terminal Performance Interface

Performance must remain useful when the user does not want to open the game.

Inside supported coding-agent terminals, the user should be able to invoke Performance through a slash-style command or equivalent integration.

Conceptual examples:

```text
/performance brief
/performance history 3d
/performance changes
/performance trend
/performance mistakes
/performance why
/performance what should I focus on next?
```

Possible questions:

- What happened in the last three days?
- Where did we leave off?
- What changed recently?
- How has my prompt performance changed?
- Which requirements are commonly missed?
- Why did a specific run fail?
- What should I focus on next?
- What happened to a specific file over time?

The terminal and game must query the same underlying Performance data.

---

# 21. Project Memory

Each initialized project has a persistent Project Memory.

Project Memory is not tied to one agent conversation.

Possible contents include:

- Important project decisions.
- Current architecture.
- Completed runs.
- Performance history.
- Documents.
- Notes.
- External resources.
- Goals.
- Recent changes.
- Important constraints.
- Current project state.

Example queries:

```text
/memory where did we leave off?
/memory why did we choose this architecture?
/memory show important decisions from last month
```

Project Memory should survive across:

- Different coding agents.
- Different sessions.
- Long periods of inactivity.
- Project-folder moves.

---

# 22. Knowledge Reuse Between Agents

Knowledge created with one agent should be usable by another.

Example:

```text
Claude Code
    ↓
Research / Project Memory
    ↓
Library
    ↓
Codex
```

The goal is to prevent valuable knowledge from being trapped inside one conversation history.

Possible reusable knowledge:

- Architecture decisions.
- External-resource studies.
- Performance lessons.
- Project constraints.
- Research summaries.
- Verification guidance.
- Historical context.

The agent benefits not because Library retrains the model, but because Library provides better project-specific context at the right time.

---

# 23. Context Packs and Synchronization

The library is the canonical source of stored knowledge.

Knowledge should not normally be copied manually into projects as disconnected files.

Instead, Library can generate **Context Packs**.

Three modes were agreed conceptually:

## Persistent Sync

A selected knowledge item remains available inside a project and can be updated when the source changes.

## Temporary Attach

A selected item is attached only for the current task or agent session.

## Auto-Context

A future optional mode where the system suggests or attaches relevant knowledge when it detects strong relevance.

Conceptual flow:

```text
Library Store
    ↓
Context Projection
    ↓
Markdown / JSON / other readable format
    ↓
Claude / Codex / Other Agent
```

The agent should not directly query the internal database.

Generated context files should be easy to read and safe to expose.

Context files should preferably be read-only by default.

New knowledge produced by an agent can be reviewed before being promoted back into the library.

---

# 24. External Resources

Library includes a dedicated External Resources area.

This area stores **knowledge about external sources**, not complete copies of third-party repositories.

Examples:

- GitHub repositories.
- Technical documentation.
- Research papers.
- RFCs.
- Technical articles.
- Other future sources.

For a GitHub repository, Library may store:

- Repository identity.
- Source link.
- Analyzed commit.
- Analysis date.
- What the project does.
- Architecture.
- Important modules.
- Execution flow.
- Data model.
- Interesting design decisions.
- Useful patterns.
- Limitations.
- Relevance to the user’s project.
- Evidence references.
- User notes.

The principle is:

> **Reference and understand; do not mirror unnecessarily.**

---

# 25. Agent-Guided Research

External Resources can be created in more than one way.

One important method is **Agent-Guided Research**.

Example workflow:

1. The user asks Claude Code to study a repository.
2. Claude explains the repository.
3. The user asks follow-up questions.
4. The user asks for deeper analysis of one subsystem.
5. The user compares the repository with their own project.
6. When the research is mature, the user asks the agent to save it to External Resources.

This stores:

> **What the user actually learned**, not merely an automatic repository summary.

The completed research can later be retrieved from any supported agent.

---

# 26. Repository Search Engine

Library should include a Repository Search Engine focused initially on open-source GitHub repositories.

The search engine should not merely reproduce ordinary GitHub search.

It should support intent such as:

- Find repositories with a specific architecture.
- Find real implementations of a technical pattern.
- Find projects similar to the current project.
- Find repositories using specific languages and infrastructure patterns.
- Find projects demonstrating a specific subsystem.

Conceptual flow:

```text
Search Intent
    ↓
GitHub Discovery
    ↓
Candidate Repositories
    ↓
Light Inspection
    ↓
Ranking
    ↓
Detailed Analysis
```

Results should explain why each repository matched the request.

---

# 27. Repository Analysis

Repository analysis should be deeper than README summarization.

Possible analysis modes:

- Quick Scan.
- Architecture Study.
- Deep Study.
- Focused Study.

A Focused Study might ask:

- How does this repository implement plugin isolation?
- How does its memory system work?
- How does authentication work?
- How does it structure ingestion?
- How does it organize a local-first sync engine?

The resulting Repository Study should be evidence-linked and pinned to a repository revision where practical.

The study can later become:

- Human-readable knowledge in the game.
- Searchable knowledge in the terminal.
- Compressed context for coding agents.

---

# 28. In-Game Research Terminal

The terminal inside Library should not be a fake game terminal.

It should be a playable interface over a real coding-agent or research-agent session.

Conceptually:

```text
IN-GAME TERMINAL
      ↓
Game Interaction Layer
      ↓
Agent Bridge
      ↓
Claude Code / Codex / OpenCode
      ↓
Real Agent Session
```

The game may present a friendly visual state:

```text
SEARCHING...
INSPECTING...
ANALYZING...
BUILDING STUDY...
```

Behind the visual layer, the real agent is working.

Advanced users may later be allowed to expose the raw terminal view.

The principle is:

> **The game does not simulate developer agents. It gives real developer agents a playable interface.**

---

# 29. Bring Your Own Agent

Library should use the coding-agent tools and subscriptions already available to the user when possible.

The system may detect supported local agent installations such as:

- Claude Code.
- Codex.
- OpenCode.
- Other future agents.

The user may choose which supported agent is used for:

- Search.
- Repository analysis.
- Research.
- Explanation.
- Context-assisted development.

Library should use an adapter model so the Search Engine and other systems do not become permanently tied to one provider.

---

# 30. Learning and Inspection

The game should help users understand agent behavior.

A completed run can support an **Inspect Execution** experience.

Example:

```text
Prompt submitted
    ↓
Repository inspected
    ↓
Files read
    ↓
Files changed
    ↓
Tests run
    ↓
Failure detected
    ↓
Correction made
    ↓
Verification completed
    ↓
Final response
```

Performance may add explanatory markers:

- Requirement addressed here.
- Unrequested file changed here.
- Verification gap detected here.
- Agent report did not match evidence here.
- This correction improved the final outcome.

The purpose is educational transparency, not only scoring.

---

# 31. Productivity and Entertainment

Library should allow the user to enter for entertainment and still gain useful value.

During a session the user may:

- Read old documents.
- Review a past prompt.
- Inspect a previous run.
- Add notes.
- Organize shelves.
- Review Performance.
- Study an external resource.
- Search GitHub.
- Create a Repository Study.
- Compare old work.
- Review project memory.

The experience should remain enjoyable while the result remains useful.

The game should not require artificial grinding.

Growth should come from real work and real learning.

---

# 32. Goals and Progress

Goals can exist, but they should be connected to real work rather than superficial gamification.

Possible goals:

- Finish Architecture V1.
- Reduce corrective prompts.
- Improve verification quality.
- Study three repositories related to a technical topic.
- Complete a research objective.
- Improve consistency in project decisions.

A Goal Board could exist physically inside the library.

Progress should be based on evidence from real work.

The game should avoid meaningless XP systems unless they later prove useful.

---

# 33. Local-First and Self-Hosted Model

The personal library should be local-first.

Core personal knowledge should be usable offline.

The user’s private library should not require a cloud account for normal local use.

Internet access is needed only for features that actually require it, such as:

- Public sharing.
- GitHub search.
- Remote-agent services.
- Online collaboration.
- Public Library discovery.

The user should own the local data.

Self-hosted deployment should remain a first-class direction.

---

# 34. Public Library Boundary

A future Public Library is part of the larger vision, but its design is intentionally deferred.

The current Library V1 document does **not** define:

- Publishing rules.
- Public-version behavior.
- Community interactions.
- Categories.
- Public discovery.
- Forking.
- Social systems.
- Multiplayer.
- Public moderation.

The Public Library will require its own separate vision and product definition.

The current document focuses on:

- Personal library.
- Projects.
- Agents.
- Performance.
- Memory.
- Research.
- External Resources.
- Terminal integration.
- Knowledge reuse.

---

# 35. Data and Storage Model

The visual library is backed by real data structures.

Possible internal layers:

- Relational project state.
- Evidence ledger.
- Prompt records.
- Agent-run records.
- File-change records.
- Performance analyses.
- Project Memory.
- External Resources.
- Search indexes.
- Vector indexes where useful.
- Relationship graph projections where useful.

The 3D world should be a projection over these canonical records.

The game should never require the player to understand database internals.

---

# 36. Game and Software Interaction Model

Library should support multiple ways of interacting with the same system.

## Work Mode

The user works normally with Claude Code, Codex, or an IDE while Library observes supported activity.

## Terminal Mode

The user asks questions about history, performance, memory, changes, and resources.

## Library Mode

The user enters the first-person library to explore, study, organize, and inspect knowledge.

## Research Mode

The user searches and analyzes external technical sources.

All modes share the same underlying knowledge.

---

# 37. Performance Roadmap Migration Strategy

The current Midnight Performance Roadmap should be completed first as an independent engineering product.

After the first stable version is complete:

1. Copy the Performance implementation into the Library project.
2. Treat it as the engineering foundation for the Library Performance Engine.
3. Do not preserve every Midnight-specific requirement blindly.
4. Build a migration map before modification.
5. Classify every Performance area as:
   - Keep.
   - Modify.
   - Remove.
   - Extend for Game.
6. Add game-specific concepts such as:
   - Parent Performance.
   - Child Performance.
   - Project Performance.
   - Spatial performance documents.
   - Live in-game run state.
   - Performance Desk.
   - Game-facing history.
   - Search integration.
   - Library memory integration.
7. Remove or simplify Midnight-specific capabilities that do not serve Library.

The intended relationship is:

```text
Midnight Performance
        ↓ completed and copied
Library Performance Engine
        ↓ adapted
Game-Specific Performance System
```

The Library version may diverge significantly over time.

---

# 38. Design Principles

The following principles should guide future design:

- One user has one persistent personal library.
- Projects are sections, not separate libraries.
- Agents are shelves or subsections, not separate libraries.
- The game and terminal use the same underlying knowledge.
- Completed knowledge deserves durable storage.
- Incomplete experiments do not automatically become permanent library documents.
- Performance should be explainable.
- A single opaque score should not replace multi-dimensional evidence.
- The repository state matters more than agent claims about what changed.
- External Resources should preserve understanding, not merely links.
- Knowledge should be reusable by different agents.
- Context should be selected, not dumped wholesale.
- The user should remain in control of what becomes permanent knowledge.
- The game should be useful even when the player is not “playing.”
- The system should remain useful even if the user does not open the game for weeks.
- The world should grow because the user’s knowledge grows.
- Search and quick access must coexist with spatial exploration.
- Local ownership and privacy are first-class.
- The game should not fake agent work when a real agent can perform it.

---

# 39. Non-Goals

The following are not primary goals for Library V1:

- Building a traditional AAA game.
- Requiring Unity or another heavy game engine.
- Replacing Claude Code, Codex, or other coding agents.
- Hosting every coding agent itself.
- Turning every source-code file into a book.
- Showing every internal Performance metric directly to the player.
- Treating every failed or incomplete run as permanent library knowledge.
- Copying entire GitHub repositories into the library by default.
- Building the Public Library social system in this phase.
- Building one giant opaque performance score.
- Forcing every interaction through first-person movement.
- Giving agents direct unrestricted access to the internal database.

---

# 40. V1 Conceptual Architecture

```text
                         USER
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
       Terminal        Desktop Game      IDE / Agent
          │               │                │
          └───────────────┼────────────────┘
                          │
                    LOCAL RUNTIME
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
   Performance          Memory             Search
      Engine             Core              Engine
        │                 │                  │
        └─────────────────┼──────────────────┘
                          │
                   Canonical Stores
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
   Project History   External Resources   Context Packs
        │                 │                  │
        └─────────────────┼──────────────────┘
                          │
                   Agent Adapters
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
   Claude Code          Codex            Other Agents
```

Game-facing Performance hierarchy:

```text
PROJECT PERFORMANCE
        │
        ├── PARENT PERFORMANCE
        │       │
        │       ├── CHILD PERFORMANCE — File A
        │       ├── CHILD PERFORMANCE — File B
        │       └── CHILD PERFORMANCE — File C
        │
        └── Historical Trends / Memory / Analysis
```

---

# 41. Core User Journey

A simple end-to-end user journey:

1. The user downloads Library from the official website.
2. The user installs the desktop application.
3. The user opens a terminal.
4. The user navigates to a software project.
5. The user runs `library init`.
6. The project receives a stable Library identity.
7. The project appears as a section inside the Home Library.
8. The user opens Claude Code or Codex normally.
9. The user submits a prompt.
10. Performance observes the run through supported integration surfaces.
11. The coding agent changes multiple files.
12. Performance captures the overall Prompt Run.
13. Parent Performance explains the full change.
14. Child Performance records explain each changed file.
15. The completed work is archived in the project’s section.
16. Project Memory is updated where appropriate.
17. The user can later open the game and inspect the run.
18. The user can instead ask `/performance` from the terminal.
19. The user can search External Resources.
20. The user can use a Repository Study as context for a future agent task.
21. The library physically expands as accumulated knowledge grows.
22. The same project history remains available across future sessions and agents.

---

# 42. Long-Term Direction

Library has the potential to become a persistent personal development world where human work, coding-agent activity, project memory, external research, and learning become one connected knowledge environment.

The long-term direction is not to make development look like a game for decoration.

The goal is to make the real history of development:

- Visible.
- Searchable.
- Understandable.
- Reusable.
- Playable.
- Educational.
- Persistent.

The final product should allow a user to move naturally between:

```text
WORK
  ↓
OBSERVE
  ↓
UNDERSTAND
  ↓
REMEMBER
  ↓
RESEARCH
  ↓
REUSE
  ↓
IMPROVE
```

The first-person library is the spatial expression of that loop.

The terminal is the fast operational expression of that loop.

Performance is the analytical engine behind that loop.

Project Memory preserves that loop across time.

External Resources extend that loop beyond the user’s own projects.

And the future Public Library may eventually connect many personal libraries into a broader knowledge-sharing platform.

---

# Current Vision Summary

> **Library is a desktop-first, local-first, first-person knowledge and productivity simulation that connects to real software projects and real coding agents. It automatically preserves completed development work, uses a Performance engine to understand prompts, execution, repository changes, verification, and history, builds persistent project memory, supports reusable external research, and exposes the same intelligence through both a playable library and the terminal. The user owns one growing library containing many projects, while each project contains agent shelves, Performance knowledge, memory, research, and documents. The game grows because the user’s real work and knowledge grow.**
