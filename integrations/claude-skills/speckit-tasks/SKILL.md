---
name: "speckit-tasks"
description: "Generate an actionable, dependency-ordered task list for the feature based on available design artifacts. Persists to Spec-Forge instead of tasks.md."
argument-hint: "Optional task generation constraints"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/tasks.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Spec-Forge Setup (replaces `setup-tasks.ps1`)

1. Read `.specify/feature.json` for `spec_forge_feature_id`. If missing, instruct the user to run
   `/speckit-specify` first and stop.
2. Call `get_feature_snapshot` with `{ featureId }`. This returns the current `specification` and
   `plan` in one call — the equivalent of "load `plan.md`" and "load `spec.md`" from
   `FEATURE_DIR`, plus the active `constitution`. There is no `AVAILABLE_DOCS` list to check: the
   plan's `research`/`dataModel`/`contracts`/`quickstart` fields are either present or empty
   arrays/omitted in the JSON — treat missing/empty the same way the original treated a missing
   optional file ("not all projects have all documents; generate tasks based on what's available").
   - **Required**: `plan` must exist and be at least `in_review`. If missing or still `draft`,
     instruct the user to run `/speckit-plan` first and stop.

## Outline

1. **Execute task generation workflow**:
   - From `plan.content`: extract tech stack, libraries, project structure (`technicalContext`),
     `dataModel`, `contracts`, `research` decisions (for setup tasks)
   - From `specification.content`: extract user stories/scenarios with their priorities (P1, P2,
     P3, etc. — infer priority order from the order they appear in `userScenarios` /
     `acceptanceScenarios` if not explicit)
   - If `dataModel` entries exist: map each entity to the user story(ies) that need it
   - If `contracts` entries exist: map each interface contract → the user story it serves
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate a dependency graph showing user story completion order (encoded via each task's
     `dependsOn` array of task codes — see Checklist Format below)
   - Validate task completeness (each user story has all needed tasks, independently testable)

2. **Build the task list** as an array of task objects, structured with:
   - Phase 1: Setup tasks (project initialization) — `phase: "Setup"`, no `story`
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories) — `phase: "Foundational"`, no `story`
   - Phase 3+: One phase per user story (in priority order from the specification) — `phase: "US<n>"` (e.g. `"Phase 3"` or the story name), `story: "US1"` etc.
   - Final Phase: Polish & cross-cutting concerns — `phase: "Polish"`, no `story`
   - Within each user-story phase: Tests (if requested) → Models → Services → Endpoints → Integration

3. **Persist via `generate_tasks`**: call it with `{ featureId, tasks: [...] }` where each task is:
   ```json
   {
     "code": "T001",
     "title": "Create User model in src/models/user.py",
     "description": "optional extra detail",
     "filePaths": ["src/models/user.py"],
     "phase": "Setup" ,
     "story": "US1",
     "parallel": true,
     "estimatedComplexity": "S",
     "dependsOn": ["T000"]
   }
   ```
   This one call replaces generating `tasks.md` — Spec-Forge stores each task as its own row with
   real `dependsOn` edges (a proper dependency graph, not just markdown `[P]`/ordering hints), which
   `get_next_task` later uses to determine what's unblocked. Set `parallel: true` only when the task
   is parallelizable (different files, no dependency on an incomplete task) — this is the direct
   equivalent of the old `[P]` marker.

Context for task generation: $ARGUMENTS

Each task must be specific enough that an LLM can complete it without additional context — this is
unchanged from the original: the `title`/`description`/`filePaths` together must be immediately
executable.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story (via the `story` field) to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Task Shape Requirements (replaces the old markdown Checklist Format)

Every task MUST have:

1. **`code`**: Sequential (`T001`, `T002`, `T003`...) in execution order.
2. **`parallel`**: `true` only if parallelizable (different files, no dependency on an incomplete task).
3. **`story`**: REQUIRED for user story phase tasks only (`US1`, `US2`, `US3`, ... — maps to user stories from the specification). Omit (leave unset) for Setup, Foundational, and Polish phase tasks.
4. **`title`**: Clear action with the exact file path (also duplicated into `filePaths` for structured querying).
5. **`dependsOn`**: Codes of tasks that must complete before this one — this is what `get_next_task` uses to compute what's unblocked, so it must be accurate, not just documentation.

**Examples**:

- ✅ CORRECT: `{ "code": "T001", "title": "Create project structure per implementation plan", "phase": "Setup" }`
- ✅ CORRECT: `{ "code": "T005", "title": "Implement authentication middleware in src/middleware/auth.py", "phase": "Foundational", "parallel": true, "filePaths": ["src/middleware/auth.py"] }`
- ✅ CORRECT: `{ "code": "T012", "title": "Create User model in src/models/user.py", "phase": "Phase 3", "story": "US1", "parallel": true, "filePaths": ["src/models/user.py"] }`
- ❌ WRONG: task with no `code` (Spec-Forge requires a unique code per feature to express `dependsOn`)
- ❌ WRONG: a user-story-phase task with no `story` set (loses the story grouping that `/speckit-analyze` and the roadmap board rely on)

### Task Organization

1. **From User Stories (specification)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Interfaces/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies via `dependsOn` (most stories should be independent)

2. **From Contracts** (`plan.content.contracts`):
   - Map each interface contract → to the user story it serves
   - If tests requested: Each interface contract → contract test task (`parallel: true`) before implementation in that story's phase

3. **From Data Model** (`plan.content.dataModel`):
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns

## Completion Report

Report:
- Spec-Forge `featureId` and total task count
- Task count per user story (`story` value)
- Parallel opportunities identified (count of `parallel: true` tasks)
- Independent test criteria for each story
- Suggested MVP scope (typically just User Story 1)
- Confirm every task has a `code` and, for story-phase tasks, a `story` value

## Done When

- [ ] Tasks generated with all phases, codes, dependencies, and file paths, persisted via `generate_tasks`
- [ ] Completion reported to user with task count, story breakdown, and MVP scope
