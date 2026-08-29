---
name: "speckit-clarify"
description: "Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec. Persists to Spec-Forge instead of editing spec.md."
argument-hint: "Optional areas to clarify in the spec"
compatibility: "Requires the spec-forge MCP server to be registered and reachable"
metadata:
  author: "spec-forge (adapted from github-spec-kit)"
  source: "templates/commands/clarify.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Spec-Forge Setup (replaces file-based Pre-Execution Checks)

1. Read `.specify/feature.json` (written by `/speckit-specify`) to get `spec_forge_feature_id`.
   - If the file is missing or has no `spec_forge_feature_id`, instruct the user to run
     `/speckit-specify` first (do not create a new feature here) and stop.
2. Call `get_feature_snapshot` with `{ featureId }` to load the current specification content,
   the active constitution, and any existing clarifications. This is the in-memory equivalent of
   loading `FEATURE_SPEC` and `.specify/memory/constitution.md` in the original command — there is
   no `check-prerequisites.ps1` step needed.

## Outline

Goal: Detect and reduce ambiguity or missing decision points in the active feature specification and record the clarifications directly via Spec-Forge's `clarify_ask` / `clarify_answer` tools (Spec-Forge models clarifications as first-class Q&A rows tied to the feature — there is no `## Clarifications` markdown section to append to).

Note: This clarification workflow is expected to run (and be completed) BEFORE invoking `/speckit-plan`. If the user explicitly states they are skipping clarification (e.g., exploratory spike), you may proceed, but must warn that downstream rework risk increases.

Execution steps:

1. Use the specification content loaded in Spec-Forge Setup step 2 as the artifact under review.

2. Perform a structured ambiguity & coverage scan using this taxonomy. For each category, mark status: Clear / Partial / Missing. Produce an internal coverage map used for prioritization (do not output raw map unless no questions will be asked).

   Functional Scope & Behavior:
   - Core user goals & success criteria
   - Explicit out-of-scope declarations
   - User roles / personas differentiation

   Domain & Data Model:
   - Entities, attributes, relationships
   - Identity & uniqueness rules
   - Lifecycle/state transitions
   - Data volume / scale assumptions

   Interaction & UX Flow:
   - Critical user journeys / sequences
   - Error/empty/loading states
   - Accessibility or localization notes

   Non-Functional Quality Attributes:
   - Performance (latency, throughput targets)
   - Scalability (horizontal/vertical, limits)
   - Reliability & availability (uptime, recovery expectations)
   - Observability (logging, metrics, tracing signals)
   - Security & privacy (authN/Z, data protection, threat assumptions)
   - Compliance / regulatory constraints (if any)

   Integration & External Dependencies:
   - External services/APIs and failure modes
   - Data import/export formats
   - Protocol/versioning assumptions

   Edge Cases & Failure Handling:
   - Negative scenarios
   - Rate limiting / throttling
   - Conflict resolution (e.g., concurrent edits)

   Constraints & Tradeoffs:
   - Technical constraints (language, storage, hosting)
   - Explicit tradeoffs or rejected alternatives

   Terminology & Consistency:
   - Canonical glossary terms
   - Avoided synonyms / deprecated terms

   Completion Signals:
   - Acceptance criteria testability
   - Measurable Definition of Done style indicators

   Misc / Placeholders:
   - TODO markers / unresolved decisions
   - Ambiguous adjectives ("robust", "intuitive") lacking quantification

   For each category with Partial or Missing status, add a candidate question opportunity unless:
   - Clarification would not materially change implementation or validation strategy
   - Information is better deferred to planning phase (note internally)

3. Generate (internally) a prioritized queue of candidate clarification questions (maximum 5). Do NOT output them all at once. Apply these constraints:
    - Maximum of 5 total questions across the whole session.
    - Each question must be answerable with EITHER:
       - A short multiple‑choice selection (2–5 distinct, mutually exclusive options), OR
       - A one-word / short‑phrase answer (explicitly constrain: "Answer in <=5 words").
    - Only include questions whose answers materially impact architecture, data modeling, task decomposition, test design, UX behavior, operational readiness, or compliance validation.
    - Ensure category coverage balance: attempt to cover the highest impact unresolved categories first; avoid asking two low-impact questions when a single high-impact area (e.g., security posture) is unresolved.
    - Exclude questions already answered (check clarifications already loaded in Spec-Forge Setup step 2), trivial stylistic preferences, or plan-level execution details (unless blocking correctness).
    - Favor clarifications that reduce downstream rework risk or prevent misaligned acceptance tests.
    - If more than 5 categories remain unresolved, select the top 5 by (Impact * Uncertainty) heuristic.

4. **Record the queued questions**: call `clarify_ask` once with `{ featureId, questions: [...] }`
   for the full prioritized queue (this creates `pending` clarification rows in Spec-Forge — it
   does not ask the user yet). Keep the returned clarification ids in memory, matched by question
   text, to answer them one at a time in the next step.

5. Sequential questioning loop (interactive):
    - Present EXACTLY ONE question at a time.
    - **Question writing quality (applies to every question, MC or short-answer):**
       - Lead with `**Question:**` followed by a full interrogative that ends with `?`. The question text before the `?` must make sense on its own.
       - NEVER use a topic label, section heading, or requirement id as the question itself. For example, `Acceptance device/runtime matrix (FR-023)` is INVALID — it is a label, not a question.
       - After the `?`, the only permitted suffix is an optional parenthesized requirement/question id. Exact format: `**Question:** <interrogative>?` or `**Question:** <interrogative>? (FR-023)`. Never put the id before the `?`, and never use the id (alone or with a topic label) as the whole prompt.
       - Immediately after the question line, add one plain-language "Why it matters" sentence (the stake for acceptance or shipping) before the recommendation/options.
       - Use everyday wording; introduce jargon only if defined in the same sentence. Self-check: a reader who does not know Spec Kit must be able to answer from the Question line alone. Terse is fine; cryptic labels are not.
    - For multiple‑choice questions:
       - **Analyze all options** and determine the **most suitable option** based on:
          - Best practices for the project type
          - Common patterns in similar implementations
          - Risk reduction (security, performance, maintainability)
          - Alignment with any explicit project goals or constraints visible in the spec
       - Present your **recommended option prominently** at the top with clear reasoning (1-2 sentences explaining why this is the best choice).
       - Format as: `**Recommended:** Option [X] - <reasoning>`
       - Then render all options as a Markdown table:

       | Option | Description |
       |--------|-------------|
       | A | <Option A description> |
       | B | <Option B description> |
       | C | <Option C description> (add D/E as needed up to 5) |
       | Short | Provide a different short answer (<=5 words) (Include only if free-form alternative is appropriate) |

       - After the table, add: `You can reply with the option letter (e.g., "A"), accept the recommendation by saying "yes" or "recommended", or provide your own short answer.`
    - For short‑answer style (no meaningful discrete options):
       - Provide your **suggested answer** based on best practices and context.
       - Format as: `**Suggested:** <your proposed answer> - <brief reasoning>`
       - Then output: `Format: Short answer (<=5 words). You can accept the suggestion by saying "yes" or "suggested", or provide your own answer.`
    - After the user answers:
       - If the user replies with "yes", "recommended", or "suggested", use your previously stated recommendation/suggestion as the answer.
       - Otherwise, validate the answer maps to one option or fits the <=5 word constraint.
       - If ambiguous, ask for a quick disambiguation (count still belongs to same question; do not advance).
       - Once satisfactory, call `clarify_answer` with `{ clarificationId, answer, answeredBy: "human" }` immediately (this replaces "record it in working memory... do not yet write to disk" — Spec-Forge persists each answer as it's given, so nothing is lost if the session ends early), then move to the next queued question.
    - Stop asking further questions when:
       - All critical ambiguities resolved early (remaining queued items become unnecessary), OR
       - User signals completion ("done", "good", "no more"), OR
       - You reach 5 asked questions.
    - Never reveal future queued questions in advance.
    - If no valid questions exist at start, immediately report no critical ambiguities (skip step 4 entirely).

6. Integration after EACH accepted answer (incremental update approach):
    - `clarify_answer` already persisted the raw Q&A pair (this alone is a durable, queryable
      record — an improvement over the original file-based flow, which only kept Q&A inside a
      markdown section). In addition, apply the clarification to the specification content
      in-memory:
       - Functional ambiguity → Update or add an entry in `functionalRequirements`.
       - User interaction / actor distinction → Update `userScenarios` / `acceptanceScenarios` with clarified role, constraint, or scenario.
       - Data shape / entities → Update `keyEntities` (add fields, types, relationships) preserving ordering; note added constraints succinctly.
       - Non-functional constraint → Add/modify measurable criteria in `successCriteria` (convert vague adjective to metric or explicit target).
       - Edge case / negative flow → Add a new entry to `edgeCases`.
       - Terminology conflict → Normalize term across the content; retain original only if necessary by adding `(formerly referred to as "X")` once.
    - If the clarification invalidates an earlier ambiguous statement, replace that statement instead of duplicating; leave no obsolete contradictory text.
    - After each integration, call `specify` with the updated JSON content and the same `featureId`
      (a new specification version is recorded — this is the equivalent of "save the spec file
      after each integration to minimize risk of context loss", just versioned instead of
      overwritten).
    - Preserve the JSON structure: do not rename fields; keep array ordering stable where unrelated.
    - Keep each inserted clarification minimal and testable (avoid narrative drift).

7. Validation (performed after EACH write plus final pass):
   - Exactly one `clarify_answer` call per accepted answer (no duplicates).
   - Total asked (accepted) questions ≤ 5.
   - Updated fields contain no lingering vague placeholders the new answer was meant to resolve.
   - No contradictory earlier statement remains (scan for now-invalid alternative choices removed).
   - Terminology consistency: same canonical term used across all updated fields.

8. After the questioning loop ends, if all clarifications for this session are answered and no
   `[NEEDS CLARIFICATION]` markers remain in the content, persist a final `specify` call with
   `status: "refined"` (replaces "Re-validate Spec Quality Checklist" — Spec-Forge's `status` field
   is the durable readiness signal; report the reasoning in the Completion Report instead of
   toggling checkboxes in a separate checklist file).

Behavior rules:

- If no meaningful ambiguities found (or all potential questions would be low-impact), respond: "No critical ambiguities detected worth formal clarification." and suggest proceeding.
- If `.specify/feature.json` is missing, instruct user to run `/speckit-specify` first (do not create a new feature here).
- Never exceed 5 total asked questions (clarification retries for a single question do not count as new questions).
- Avoid speculative tech stack questions unless the absence blocks functional clarity.
- Respect user early termination signals ("stop", "done", "proceed").
- If no questions asked due to full coverage, output a compact coverage summary (all categories Clear) then suggest advancing.
- If quota reached with unresolved high-impact categories remaining, explicitly flag them under Deferred with rationale.

Context for prioritization: $ARGUMENTS

## Completion Report

Report completion (after questioning loop ends or early termination):
- Number of questions asked & answered.
- Spec-Forge `featureId` and the specification version that resulted from the final integration.
- Fields touched (list names, e.g. `functionalRequirements`, `edgeCases`).
- Coverage summary table listing each taxonomy category with Status: Resolved (was Partial/Missing and addressed), Deferred (exceeds question quota or better suited for planning), Clear (already sufficient), Outstanding (still Partial/Missing but low impact).
- If any Outstanding or Deferred remain, recommend whether to proceed to `/speckit-plan` or run `/speckit-clarify` again later post-plan.
- Suggested next command.

## Done When

- [ ] Spec ambiguities identified and clarifications recorded via `clarify_ask`/`clarify_answer`, with the specification content updated via `specify` after each accepted answer
- [ ] Specification `status` set to `refined` if this session resolved the last blocker (or left as-is with rationale reported otherwise)
- [ ] Completion reported to user with questions answered, fields touched, and coverage summary
