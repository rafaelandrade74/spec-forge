---
name: "speckit-plan"
description: "Execute the implementation planning workflow using the plan template to generate design artifacts. Persists to Spec-Forge instead of plan.md/research.md/data-model.md/contracts/."
argument-hint: "Optional guidance for the planning phase"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/plan.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Spec-Forge Setup (replaces `setup-plan.ps1`)

1. Read `.specify/feature.json` for `spec_forge_feature_id`. If missing, instruct the user to run
   `/speckit-specify` first and stop.
2. Call `get_feature_snapshot` with `{ featureId }` to load the current specification (must exist
   and be at least `in_review`) and the active constitution. If the specification is still `draft`,
   warn the user and recommend `/speckit-clarify` or re-running `/speckit-specify` before planning.

## Outline

1. **Load context**: Use the specification and constitution loaded in Spec-Forge Setup.

2. **Execute plan workflow**: Draft the plan as a single structured JSON object (this replaces
   generating `research.md`, `data-model.md`, `contracts/`, `quickstart.md` as separate files —
   Spec-Forge stores them as sections of one versioned `plan` document instead):
   - Fill `technicalContext` (mark unknowns as `"NEEDS_CLARIFICATION: ..."` strings)
   - Fill `constitutionCheck` from the loaded constitution (list each relevant principle and
     whether the plan complies; ERROR on violations unjustified)
   - Phase 0: Populate `research` (resolve all NEEDS_CLARIFICATION)
   - Phase 1: Populate `dataModel`, `contracts`, `quickstart`
   - Re-evaluate `constitutionCheck` post-design (append a second pass entry if anything changed)

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from `technicalContext`**:
   - For each NEEDS_CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** into the plan's `research` array, one entry per decision:
   ```json
   { "decision": "...", "rationale": "...", "alternatives": ["..."] }
   ```

**Output**: `research` array with all NEEDS_CLARIFICATION resolved.

### Phase 1: Design & Contracts

**Prerequisites:** `research` complete (from Phase 0, in-memory — no file to check for existence).

1. **Extract entities from feature spec** → `dataModel` array:
   ```json
   { "entity": "...", "fields": ["..."], "relationships": ["..."], "validationRules": ["..."], "stateTransitions": ["..."] }
   ```

2. **Define interface contracts** (if project has external interfaces) → `contracts` array:
   - Identify what interfaces the project exposes to users or other systems
   - Document the contract format appropriate for the project type as a string per entry (e.g. an
     OpenAPI path summary, a CLI command signature, a function signature)
   - Examples: public APIs for libraries, command schemas for CLI tools, endpoints for web services, grammars for parsers, UI contracts for applications
   - Omit `contracts` entirely if project is purely internal (build scripts, one-off tools, etc.)

3. **Create quickstart validation guide** → `quickstart` array of steps:
   - Document runnable validation scenarios that prove the feature works end-to-end
   - Include prerequisites, setup commands, test/run commands, and expected outcomes
   - Reference `dataModel`/`contracts` entries by name instead of duplicating them
   - Do not include full implementation code, model/service/controller bodies, migrations, or complete test suites
   - Keep this as a validation/run guide; implementation details belong in `/speckit-tasks` and the implementation phase

**Output**: `dataModel`, `contracts`, `quickstart` populated in the plan JSON.

3. **Persist the plan to Spec-Forge** (replaces writing `plan.md` + `research.md` +
   `data-model.md` + `contracts/*` + `quickstart.md`): call `plan` with
   `{ featureId, status: "refined", content: { technicalContext, constitutionCheck, research, dataModel, contracts, quickstart } }`.
   Use `status: "in_review"` instead if a gate failed or a NEEDS_CLARIFICATION remains unresolved,
   and explain why in the Completion Report.

## Key rules

- ERROR on gate failures or unresolved clarifications — persist the plan anyway with
  `status: "in_review"` so the partial work isn't lost, but clearly flag it as not ready for
  `/speckit-tasks`.
- Use absolute paths only when referencing files that actually exist on disk (e.g. constitution
  template lookups); everything else lives in the Spec-Forge plan JSON, not on the filesystem.

## Completion Report

Report the Spec-Forge `featureId`, the resulting plan `version` and `status`, and a summary of what
was generated in `research`, `dataModel`, `contracts`, and `quickstart`. Suggest `/speckit-tasks` as
the next command if `status` is `refined`.

## Done When

- [ ] Plan workflow executed and persisted via `plan` as a single structured document
- [ ] Completion reported to user with featureId, plan version/status, and generated sections
