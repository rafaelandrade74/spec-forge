---
name: "speckit-specify"
description: "Create or update the feature specification from a natural language feature description. Persists to Spec-Forge instead of specs/NNN-name/spec.md."
argument-hint: "Describe the feature you want to specify"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/specify.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Spec-Forge Setup (replaces file-based Pre-Execution Checks)

This variant persists the specification in the Spec-Forge database (via its MCP server) instead of
creating `specs/NNN-name/spec.md`. There are no git-branch or extension-hook prerequisites to check
here — just resolve the project:

1. Determine the current repository root (absolute path).
2. Call `get_or_create_project_by_repo` with `{ repoPath: <repo root> }` → note `projectId`.

## Outline

The text the user typed after `/speckit-specify` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. **Generate a concise short name** (2-4 words) for the feature:
   - Analyze the feature description and extract the most meaningful keywords
   - Create a 2-4 word short name that captures the essence of the feature
   - Use action-noun format when possible (e.g., "add-user-auth", "fix-payment-bug")
   - Preserve technical terms and acronyms (OAuth2, API, JWT, etc.)
   - Keep it concise but descriptive enough to understand the feature at a glance
   - Examples:
     - "I want to add user authentication" → "user-auth"
     - "Implement OAuth2 integration for the API" → "oauth2-api-integration"
     - "Create a dashboard for analytics" → "analytics-dashboard"
     - "Fix payment processing timeout bug" → "fix-payment-timeout"

2. **Create the feature in Spec-Forge** (replaces "Create the spec feature directory"):
   - Call `create_feature` with `{ projectId, title: <human-readable title derived from the short name / description> }`.
   - This returns a `featureId` and an auto-numbered `slug` (e.g. `001-user-auth`) — Spec-Forge
     assigns the sequence number, mirroring the old `NNN-<short-name>` directory convention.
   - **Persist the pointer** to `.specify/feature.json` (this file is already gitignored by the
     Spec Kit installer — it is machine-local, per-checkout state, exactly like the original
     `feature_directory` pointer it replaces):
     ```json
     {
       "spec_forge_project_id": "<projectId>",
       "spec_forge_feature_id": "<featureId>",
       "feature_slug": "<slug>",
       "feature_title": "<title>"
     }
     ```
     This allows downstream commands (`/speckit-plan`, `/speckit-tasks`, etc.) to locate the
     feature without relying on git branch name conventions or scanning `specs/`.

   **IMPORTANT**:
   - You must only create one feature per `/speckit-specify` invocation.
   - Branch creation (if you use a git branch per feature) is an orthogonal git-workflow concern —
     create/switch a branch named after the slug if that is this project's convention, but it has
     no bearing on where the specification is stored.

3. Load `constitution-template`/spec-template structure only if you need it as a reference for section
   headings while drafting the JSON content in step 7 below — Spec-Forge does not require a
   specific markdown template; it stores a structured JSON document (see step 7).

4. Call `get_constitution` with `{ projectId }`. If a constitution exists, use it for project
   principles and governance constraints while drafting the spec.

5. Follow this execution flow:
    1. Parse user description from arguments
       If empty: ERROR "No feature description provided"
    2. Extract key concepts from description
       Identify: actors, actions, data, constraints
    3. For unclear aspects:
       - Make informed guesses based on context and industry standards
       - Only mark with [NEEDS CLARIFICATION: specific question] if:
         - The choice significantly impacts feature scope or user experience
         - Multiple reasonable interpretations exist with different implications
         - No reasonable default exists
       - **LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers total**
       - Prioritize clarifications by impact: scope > security/privacy > user experience > technical details
    4. Fill User Scenarios & Testing section
       If no clear user flow: ERROR "Cannot determine user scenarios"
    5. Generate Functional Requirements
       Each requirement must be testable
       Use reasonable defaults for unspecified details (document assumptions in Assumptions section)
    6. Define Success Criteria
       Create measurable, technology-agnostic outcomes
       Include both quantitative metrics (time, performance, volume) and qualitative measures (user satisfaction, task completion)
       Each criterion must be verifiable without implementation details
    7. Identify Key Entities (if data involved)
    8. Return: SUCCESS (spec ready for planning)

6. Any `[NEEDS CLARIFICATION: ...]` marker that survives step 5 should still be resolved the same
   way the original command did: make an informed guess and record it under Assumptions, UNLESS it
   meets the strict criteria above, in which case leave the marker in the `functionalRequirements`
   or `userScenarios` entry text — `/speckit-clarify` will pick it up from there (it now reads the
   specification content via `get_feature_snapshot` instead of parsing a markdown file).

7. **Persist the specification to Spec-Forge** (replaces "Write the specification to SPEC_FILE"):
   Structure the content as JSON and call `specify` with
   `{ featureId, status: "draft", content: {...} }`:
   ```json
   {
     "overview": "1-2 sentence summary of the feature",
     "userScenarios": ["..."],
     "acceptanceScenarios": [{ "given": "...", "when": "...", "then": "..." }],
     "functionalRequirements": [{ "id": "FR-001", "text": "..." }],
     "successCriteria": [{ "id": "SC-001", "text": "...", "measurable": true }],
     "keyEntities": [{ "name": "...", "fields": ["..."], "relationships": ["..."] }],
     "edgeCases": ["..."],
     "assumptions": ["..."]
   }
   ```
   Omit `keyEntities` entirely if the feature involves no data modeling. Keep `functionalRequirements`
   and `successCriteria` IDs stable (`FR-001`, `SC-001`, ...) — `/speckit-analyze` and `/speckit-tasks`
   reference them.

8. **Specification Quality Validation**: After persisting the initial spec, validate it against quality criteria (this replaces writing `checklists/requirements.md` — the checklist result is reported to the user directly instead of stored as a file, since Spec-Forge already tracks the specification's `status` field as the durable signal of readiness):

   a. Evaluate the just-persisted content against:

      **Content Quality**
      - No implementation details (languages, frameworks, APIs)
      - Focused on user value and business needs
      - Written for non-technical stakeholders
      - All mandatory sections completed

      **Requirement Completeness**
      - No [NEEDS CLARIFICATION] markers remain
      - Requirements are testable and unambiguous
      - Success criteria are measurable
      - Success criteria are technology-agnostic (no implementation details)
      - All acceptance scenarios are defined
      - Edge cases are identified
      - Scope is clearly bounded
      - Dependencies and assumptions identified

      **Feature Readiness**
      - All functional requirements have clear acceptance criteria
      - User scenarios cover primary flows
      - Feature meets measurable outcomes defined in Success Criteria
      - No implementation details leak into specification

   b. For each item, determine pass/fail. Document specific issues found (quote the relevant JSON field).

   c. **Handle Validation Results**:

      - **If all items pass**: call `specify` again with the same `featureId` and an updated
        `status: "refined"` (a new version is recorded; Spec-Forge keeps the full history) if you
        made no content edits in this pass — if step (b) requires content fixes, apply them first,
        persist a new `specify` call with `status: "draft"`, then re-validate (max 3 iterations)
        before finally persisting with `status: "refined"`.

      - **If items fail (excluding [NEEDS CLARIFICATION])**:
        1. List the failing items and specific issues
        2. Update the JSON content to address each issue
        3. Re-persist via `specify` (new version) and re-run validation until all items pass (max 3 iterations)
        4. If still failing after 3 iterations, persist with `status: "in_review"` and warn the user which items remain unresolved

      - **If [NEEDS CLARIFICATION] markers remain**:
        1. Extract all [NEEDS CLARIFICATION: ...] markers from the content
        2. **LIMIT CHECK**: If more than 3 markers exist, keep only the 3 most critical (by scope/security/UX impact) and make informed guesses for the rest
        3. For each clarification needed (max 3), present options to user in this format:

           ```markdown
           ## Question [N]: [Topic]

           **Context**: [Quote relevant spec field]

           **What we need to know**: [Specific question from NEEDS CLARIFICATION marker]

           **Suggested Answers**:

           | Option | Answer | Implications |
           |--------|--------|--------------|
           | A      | [First suggested answer] | [What this means for the feature] |
           | B      | [Second suggested answer] | [What this means for the feature] |
           | C      | [Third suggested answer] | [What this means for the feature] |
           | Custom | Provide your own answer | [Explain how to provide custom input] |

           **Your choice**: _[Wait for user response]_
           ```

        4. Number questions sequentially (Q1, Q2, Q3 - max 3 total)
        5. Present all questions together before waiting for responses
        6. Wait for user to respond with their choices for all questions (e.g., "Q1: A, Q2: Custom - [details], Q3: B")
        7. Update the JSON content by replacing each [NEEDS CLARIFICATION] marker with the user's selected or provided answer
        8. Persist the updated content via `specify` (new version, `status: "refined"` if this was the last blocker)
        9. Re-run validation after all clarifications are resolved

   d. Report the before/after pass counts in the Completion Report (e.g., "Spec Quality: 12/16 → 15/16 items passing") instead of writing a checklist file.

## Quick Guidelines

- Focus on **WHAT** users need and **WHY**.
- Avoid HOW to implement (no tech stack, APIs, code structure).
- Written for business stakeholders, not developers.
- DO NOT create any checklists that are embedded in the spec content. That is reported separately (see step 8).

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, omit the JSON field entirely (don't leave it as an empty placeholder)

### For AI Generation

When creating this spec from a user prompt:

1. **Make informed guesses**: Use context, industry standards, and common patterns to fill gaps
2. **Document assumptions**: Record reasonable defaults in the `assumptions` array
3. **Limit clarifications**: Maximum 3 [NEEDS CLARIFICATION] markers - use only for critical decisions that:
   - Significantly impact feature scope or user experience
   - Have multiple reasonable interpretations with different implications
   - Lack any reasonable default
4. **Prioritize clarifications**: scope > security/privacy > user experience > technical details
5. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
6. **Common areas needing clarification** (only if no reasonable default exists):
   - Feature scope and boundaries (include/exclude specific use cases)
   - User types and permissions (if multiple conflicting interpretations possible)
   - Security/compliance requirements (when legally/financially significant)

**Examples of reasonable defaults** (don't ask about these):

- Data retention: Industry-standard practices for the domain
- Performance targets: Standard web/mobile app expectations unless specified
- Error handling: User-friendly messages with appropriate fallbacks
- Authentication method: Standard session-based or OAuth2 for web apps
- Integration patterns: Use project-appropriate patterns (REST/GraphQL for web services, function calls for libraries, CLI args for tools, etc.)

### Success Criteria Guidelines

Success criteria must be:

1. **Measurable**: Include specific metrics (time, percentage, count, rate)
2. **Technology-agnostic**: No mention of frameworks, languages, databases, or tools
3. **User-focused**: Describe outcomes from user/business perspective, not system internals
4. **Verifiable**: Can be tested/validated without knowing implementation details

**Good examples**:

- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"
- "Task completion rate improves by 40%"

**Bad examples** (implementation-focused):

- "API response time is under 200ms" (too technical, use "Users see results instantly")
- "Database can handle 1000 TPS" (implementation detail, use user-facing metric)
- "React components render efficiently" (framework-specific)
- "Redis cache hit rate above 80%" (technology-specific)

## Completion Report

Report completion to the user with:
- `projectId` / `featureId` — the Spec-Forge identifiers (also saved in `.specify/feature.json`)
- `feature slug` — e.g. `001-user-auth`
- Spec Quality Validation results summary (before/after pass counts)
- Readiness for the next phase (`/speckit-clarify` or `/speckit-plan`)
- Reminder: refine further any time via the Spec-Forge Web UI, or by re-running `/speckit-specify`

## Done When

- [ ] Feature created in Spec-Forge and pointer saved to `.specify/feature.json`
- [ ] Specification persisted via `specify` and validated against quality criteria
- [ ] Completion reported to user with feature id/slug, checklist results, and next-phase readiness
