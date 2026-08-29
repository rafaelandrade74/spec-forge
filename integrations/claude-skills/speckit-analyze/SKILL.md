---
name: "speckit-analyze"
description: "Perform a non-destructive cross-artifact consistency and quality analysis across the specification, plan, and tasks after task generation. Persists findings to Spec-Forge instead of only printing a report."
argument-hint: "Optional focus areas for analysis"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/analyze.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Identify inconsistencies, duplications, ambiguities, and underspecified items across the three core artifacts (specification, plan, tasks — now Spec-Forge records, not `spec.md`/`plan.md`/`tasks.md`) before implementation. This command MUST run only after `/speckit-tasks` has successfully generated tasks.

## Operating Constraints

**Non-destructive to spec/plan/tasks content**: this command does not edit the specification, plan,
or task content. It DOES persist its own output (the findings list) via the `analyze` MCP tool —
that is Spec-Forge's equivalent of "producing a report", except the report is now a durable,
queryable record instead of ephemeral chat output, and it feeds `mark_feature_ready`'s validation
(a `critical` finding blocks the feature from being marked ready until resolved).

**Constitution Authority**: The project constitution is **non-negotiable** within this analysis scope. Constitution conflicts are automatically CRITICAL and require adjustment of the spec, plan, or tasks—not dilution, reinterpretation, or silent ignoring of the principle. If a principle itself needs to change, that must occur in a separate, explicit `/speckit-constitution` update outside this command.

## Spec-Forge Setup (replaces `check-prerequisites.ps1 -RequireTasks -IncludeTasks`)

1. Read `.specify/feature.json` for `spec_forge_feature_id`. If missing, instruct the user to run
   `/speckit-specify` first and stop.
2. Call `get_feature_snapshot` with `{ featureId }`. This returns `specification`, `plan`, `tasks`
   (array), and `constitution` in one call.
3. Abort with an error message if `specification`, `plan`, or `tasks` (empty array) is missing —
   instruct the user to run the missing prerequisite command (`/speckit-specify`, `/speckit-plan`,
   or `/speckit-tasks` respectively).

## Execution Steps

### 1. Load Artifacts (Progressive Disclosure)

Load only the minimal necessary context from each artifact already fetched in Spec-Forge Setup:

**From `specification.content`:**

- `overview`
- `functionalRequirements`
- `successCriteria` (measurable outcomes — e.g., performance, security, availability, user success, business impact)
- `userScenarios` / `acceptanceScenarios`
- `edgeCases` (if present)

**From `plan.content`:**

- `technicalContext` (architecture/stack choices)
- `dataModel`
- `research` / `contracts` / `quickstart` (phases)
- Technical constraints

**From `tasks` (array):**

- `code`
- `title` / `description`
- `phase` / `story` grouping
- `parallel` markers
- `filePaths`

**From `constitution.content`:**

- Load for principle validation (if a constitution exists for this project)

### 2. Build Semantic Models

Create internal representations (do not include raw artifacts in output):

- **Requirements inventory**: For each Functional Requirement (`FR-###`) and Success Criterion (`SC-###`), record a stable key using the explicit id from the JSON. Include only Success Criteria items that require buildable work (e.g., load-testing infrastructure, security audit tooling), and exclude post-launch outcome metrics and business KPIs (e.g., "Reduce support tickets by 50%").
- **User story/action inventory**: Discrete user actions with acceptance criteria
- **Task coverage mapping**: Map each task to one or more requirements or stories (inference by keyword / explicit reference patterns like IDs or key phrases, or by matching `story` to the user story it implements)
- **Constitution rule set**: Extract principle names and MUST/SHOULD normative statements

### 3. Detection Passes (Token-Efficient Analysis)

Focus on high-signal findings. Limit to 50 findings total; aggregate remainder in overflow summary.

#### A. Duplication Detection

- Identify near-duplicate requirements
- Mark lower-quality phrasing for consolidation

#### B. Ambiguity Detection

- Flag vague adjectives (fast, scalable, secure, intuitive, robust) lacking measurable criteria
- Flag unresolved placeholders (TODO, TKTK, ???, `<placeholder>`, `NEEDS_CLARIFICATION`, etc.)

#### C. Underspecification

- Requirements with verbs but missing object or measurable outcome
- User stories missing acceptance criteria alignment
- Tasks referencing files or components not defined in spec/plan

#### D. Constitution Alignment

- Any requirement or plan element conflicting with a MUST principle
- Missing mandated sections or quality gates from constitution

#### E. Coverage Gaps

- Requirements with zero associated tasks
- Tasks with no mapped requirement/story
- Success Criteria requiring buildable work (performance, security, availability) not reflected in tasks

#### F. Inconsistency

- Terminology drift (same concept named differently across artifacts)
- Data entities referenced in plan but absent in spec (or vice versa)
- Task ordering contradictions (e.g., integration tasks before foundational setup tasks without a `dependsOn` edge)
- Conflicting requirements (e.g., one requires Next.js while other specifies Vue)

### 4. Severity Assignment

Use this heuristic to prioritize findings:

- **critical**: Violates constitution MUST, missing core artifact, or requirement with zero coverage that blocks baseline functionality
- **high**: Duplicate or conflicting requirement, ambiguous security/performance attribute, untestable acceptance criterion
- **medium**: Terminology drift, missing non-functional task coverage, underspecified edge case
- **low**: Style/wording improvements, minor redundancy not affecting execution order

(Note: severities are lowercase to match Spec-Forge's `analyze` tool schema — `low|medium|high|critical`.)

### 5. Persist Findings to Spec-Forge

Call `analyze` with:
```json
{
  "featureId": "...",
  "status": "refined",
  "findings": [
    { "area": "Coverage Gaps", "severity": "high", "description": "...", "relatedTaskCodes": ["T012"] }
  ]
}
```
Use `status: "in_review"` instead of `"refined"` if you are recommending the user address issues
before this analysis should be considered a clean baseline (this mirrors the original "CRITICAL
issues exist → recommend resolving before implement" guidance, now expressed via the persisted
`status` rather than only prose). A `critical` finding does not need `status` downgraded on its own
— `mark_feature_ready` independently blocks on any unresolved `critical` finding regardless of the
analysis `status`.

### 6. Produce Compact Analysis Report (to the user, in chat)

Output a Markdown report with the following structure:

## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A1 | Duplication | high | FR-003, FR-007 | Two similar requirements ... | Merge phrasing; keep clearer version |

(Add one row per finding — same content just persisted via `analyze`; generate stable IDs prefixed by category initial.)

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task Codes | Notes |
|-----------------|-----------|------------|-------|

**Constitution Alignment Issues:** (if any)

**Unmapped Tasks:** (if any)

**Metrics:**

- Total Requirements
- Total Tasks
- Coverage % (requirements with >=1 task)
- Ambiguity Count
- Duplication Count
- Critical Issues Count

### 7. Provide Next Actions

At end of report, output a concise Next Actions block:

- If CRITICAL issues exist: Recommend resolving before implementation begins (note: they also block `mark_feature_ready` automatically)
- If only LOW/MEDIUM: User may proceed, but provide improvement suggestions
- Provide explicit command suggestions: e.g., "Run /speckit-specify with refinement", "Run /speckit-plan to adjust architecture", "Manually edit tasks via the Spec-Forge Web UI to add coverage for 'performance-metrics'"

### 8. Offer Remediation

Ask the user: "Would you like me to suggest concrete remediation edits for the top N issues?" (Do NOT apply them automatically — that would mean calling `specify`/`plan`/`generate_tasks` again, which is a separate, explicit action the user must request.)

## Operating Principles

### Context Efficiency

- **Minimal high-signal tokens**: Focus on actionable findings, not exhaustive documentation
- **Progressive disclosure**: The single `get_feature_snapshot` call already loads everything needed; don't make redundant follow-up calls
- **Token-efficient output**: Limit findings table to 50 rows; summarize overflow
- **Deterministic results**: Rerunning without changes should produce consistent findings and counts (each run still persists a new `analyze` version in Spec-Forge, so the history of analysis runs is preserved)

### Analysis Guidelines

- **NEVER modify spec/plan/task content** in this command (this is analysis, not editing)
- **NEVER hallucinate missing sections** (if absent, report them accurately)
- **Prioritize constitution violations** (these are always CRITICAL)
- **Use examples over exhaustive rules** (cite specific instances, not generic patterns)
- **Report zero issues gracefully** (persist an `analyze` call with an empty `findings` array and `status: "refined"`, and emit a success report with coverage statistics)

## Context

$ARGUMENTS

## Done When

- [ ] Cross-artifact analysis completed and findings persisted via `analyze`
- [ ] Report presented to user with findings table, coverage summary, and next actions
- [ ] Remediation offer made (not auto-applied)
