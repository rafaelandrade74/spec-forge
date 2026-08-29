---
name: "speckit-constitution"
description: "Create or update the project constitution from interactive or provided principle inputs. Persists to Spec-Forge instead of .specify/memory/constitution.md."
argument-hint: "Principles or values for the project constitution"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/constitution.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Scope Guard

This command's own work is limited to updating the project constitution itself. Dependent templates
and commands read the constitution at runtime and are not modified here.

- Classify every part of the user input as either constitution content or a separate,
  non-governance intent.
- If the input includes feature implementation, code generation, refactoring, building, or
  deployment requests, you **MUST NOT** execute them. Extract them as deferred intents instead.
- You **MUST NOT** create, modify, or delete application source files, feature routes,
  components, tests, deployment files, or other artifacts unrelated to the constitution
  workflow.
- If it is unclear whether an instruction is constitution content, ask for clarification before
  making changes.
- After completing the constitution update, include a `Next Actions` section for each deferred
  intent. List the original intent and suggest the appropriate follow-up Spec Kit command, such
  as `/speckit-specify`, without invoking it.
- If there are no non-governance intents, omit the `Next Actions` section.

## Spec-Forge Setup (replaces file-based Pre-Execution Checks)

This variant persists the constitution in the Spec-Forge database (via its MCP server) instead of
writing `.specify/memory/constitution.md`. Before anything else:

1. Determine the current repository root (absolute path).
2. Call the `get_or_create_project_by_repo` MCP tool with `{ repoPath: <repo root> }`. This
   resolves (or transparently creates) the Spec-Forge project for this repository. Note the
   returned `projectId` — every subsequent tool call in this command uses it.
3. Call `get_constitution` with `{ projectId }` to load the currently active constitution (if
   any). This is the "existing document" referenced throughout the Outline below — there is no
   local file to read.

## Outline

You are drafting a new version of the project's constitution, to be persisted via Spec-Forge's
`set_constitution` tool (not written to a file). The active constitution scaffold is resolved from
the local `constitution-template` in `.specify/templates/constitution-template.md` if present in
this repo (this is a static structural template shipped with Spec Kit, not project data, so it is
still read from disk); otherwise draft directly from first principles using the structure below:
Principles, Governance, versioning metadata.

Follow this execution flow:

1. If `.specify/templates/constitution-template.md` exists, load it as `TEMPLATE_CONTENT` and use
   it as the required structure. If it does not exist, use a reasonable default structure (a
   numbered list of Principles, each with a name/rule/rationale, followed by a Governance
   section).
   - If a constitution was loaded in Spec-Forge Setup step 3, treat it as the source of current
     project-specific values and amendments. Preserve information that is still applicable when
     applying the template structure.
   - If none exists yet, the resolved template (or default structure) is the initial document.
   - Identify every placeholder token of the form `[ALL_CAPS_IDENTIFIER]`.
   **IMPORTANT**: The user might require less or more principles than the ones used in the template. If a number is specified, respect that - follow the general template. You will update the doc accordingly.

2. Collect/derive values for placeholders:
   - If user input (conversation) supplies a value, use it.
   - Otherwise infer from existing repo context (README, docs, prior constitution content loaded
     from Spec-Forge).
   - For governance dates: `RATIFICATION_DATE` is the original adoption date (if unknown ask or mark TODO), `LAST_AMENDED_DATE` is today if changes are made, otherwise keep previous.
   - `CONSTITUTION_VERSION` must increment according to semantic versioning rules relative to the
     Spec-Forge constitution `version` loaded in setup (note: Spec-Forge's own internal `version`
     integer is separate bookkeeping — track the semantic X.Y.Z version inside the document body
     as the template requires):
     - MAJOR: Backward incompatible governance/principle removals or redefinitions.
     - MINOR: New principle/section added or materially expanded guidance.
     - PATCH: Clarifications, wording, typo fixes, non-semantic refinements.
   - If version bump type ambiguous, propose reasoning before finalizing.

3. Draft the updated constitution content using the resolved template as the required structure:
   - Replace every placeholder with concrete text (no bracketed tokens left except intentionally retained template slots that the project has chosen not to define yet—explicitly justify any left).
   - Preserve heading hierarchy and comments can be removed once replaced unless they still add clarifying guidance.
   - Ensure each Principle section: succinct name line, paragraph (or bullet list) capturing non‑negotiable rules, explicit rationale if not obvious.
   - Ensure Governance section lists amendment procedure, versioning policy, and compliance review expectations.

4. Produce a Sync Impact Report (prepend as an HTML comment at top of the constitution content):
   - Version change: old → new
   - List of modified principles (old title → new title if renamed)
   - Added sections
   - Removed sections
   - Follow-up TODOs if any placeholders intentionally deferred.

5. Validation before final output:
   - No remaining unexplained bracket tokens.
   - Version line matches report.
   - Dates ISO format YYYY-MM-DD.
   - Principles are declarative, testable, and free of vague language ("should" → replace with MUST/SHOULD rationale where appropriate).

6. **Persist the completed constitution via Spec-Forge** (replaces "write back to
   `.specify/memory/constitution.md`"): call the `set_constitution` MCP tool with
   `{ projectId, content: <full constitution markdown including the Sync Impact Report comment>, status: "ready" }`.
   Spec-Forge stores this as a new version and keeps the full history of prior versions — nothing
   is overwritten or lost.

7. Output a final summary to the user with:
   - New semantic version (from the document body) and bump rationale.
   - The Spec-Forge project id and constitution version number returned by `set_constitution`.
   - Any TODO placeholders or deferred items requiring manual follow-up.
   - A `Next Actions` section for any deferred non-governance intents.

Formatting & Style Requirements:

- Use Markdown headings exactly as in the template (do not demote/promote levels).
- Wrap long rationale lines to keep readability (<100 chars ideally) but do not hard enforce with awkward breaks.
- Keep a single blank line between sections.
- Avoid trailing whitespace.

If the user supplies partial updates (e.g., only one principle revision), still perform validation and version decision steps.

If critical info missing (e.g., ratification date truly unknown), insert `TODO(<FIELD_NAME>): explanation` and include in the Sync Impact Report under deferred items.

This command only calls `get_or_create_project_by_repo`, `get_constitution`, and `set_constitution`;
it does not create or modify any application source files or local template files.

## Done When

- [ ] Constitution content drafted, validated, and persisted via `set_constitution`
- [ ] Completion reported to user with new version, Spec-Forge project/constitution ids, and any deferred items
