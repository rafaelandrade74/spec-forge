# Spec-Forge speckit skills

Drop-in replacements for the 6 core [GitHub spec-kit](https://github.com/github/spec-kit) skills
(`speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`,
`speckit-analyze`) that a normal `specify init` installs into a project's `.claude/skills/`. Same
commands, same quality-gate logic (question-asking rules, ambiguity taxonomy, checklist
validation, severity heuristics, etc.) — the only thing that changes is **where the artifacts are
persisted**: instead of writing `specs/NNN-name/spec.md`, `plan.md`, `tasks.md`, and
`.specify/memory/constitution.md`, every command calls the Spec-Forge MCP server, which stores
everything in Postgres (see the root [README](../../README.md) for what Spec-Forge is).

`/speckit-checklist`, `/speckit-implement`, `/speckit-converge`, and `/speckit-taskstoissues` are
**not** included here — they're left untouched (implementation itself is explicitly out of scope
for Spec-Forge; a Claude Code session picks up refined work via the `get_next_task` MCP tool
instead, see the root README's end-to-end flow).

## Prerequisites

1. The Spec-Forge MCP server must be registered in Claude Code (locally via stdio, or remotely via
   HTTP + bearer token if you deployed it to a homelab — see the root README's "Integrar ao Claude
   Code" section) and reachable when you run any `/speckit-*` command.
2. The target project should already have spec-kit installed (`specify init`, or an existing
   `.claude/skills/speckit-*` directory) — you're replacing files inside an existing installation,
   not bootstrapping spec-kit from scratch. `.specify/templates/`, `.specify/scripts/`, and
   `.specify/memory/` can stay; they're only used as read-only structural references by a couple of
   these skills (see below) — nothing here deletes them.

## Install

**Recommended**: use the `spec-forge init` CLI (see the root README's "Usando seus comandos
/speckit-* já existentes" section for one-time setup) from inside your target project:

```bash
cd /path/to/your/project
spec-forge init
```

It asks whether to install into this repo (`.claude/skills/`, overwriting any local `speckit-*`)
or globally (`~/.claude/skills/`), and copies all 6 folders for you.

**Manual alternative**: copy the folders yourself, overwriting the original `SKILL.md` in each:

```bash
# from this directory (integrations/claude-skills)
cp -r speckit-constitution speckit-specify speckit-clarify speckit-plan speckit-tasks speckit-analyze \
  /path/to/your/project/.claude/skills/
```

On Windows PowerShell:

```powershell
Copy-Item -Recurse -Force speckit-constitution,speckit-specify,speckit-clarify,speckit-plan,speckit-tasks,speckit-analyze `
  "C:\path\to\your\project\.claude\skills\"
```

That's it — `/speckit-specify`, `/speckit-plan`, etc. keep working exactly as before from the
user's perspective, just backed by Spec-Forge instead of local markdown files.

## How feature tracking works without `specs/NNN-name/`

The original flow tracks "which feature am I working on" via `.specify/feature.json`
(`{ "feature_directory": "specs/003-user-auth" }`), written by `/speckit-specify` and read by every
downstream command. This file is already gitignored by the Spec Kit installer (`.specify/.gitignore`
— "machine-local state, not meant to be shared").

These adapted skills reuse the exact same file and gitignore rule, just with a Spec-Forge-flavored
schema instead:

```json
{
  "spec_forge_project_id": "...",
  "spec_forge_feature_id": "...",
  "feature_slug": "001-user-auth",
  "feature_title": "User authentication"
}
```

`/speckit-specify` writes it; `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, and
`/speckit-analyze` read `spec_forge_feature_id` from it and call `get_feature_snapshot` to load
whatever context they need — no scanning `specs/` or parsing branch names.

`/speckit-constitution` doesn't need this file — it resolves the project directly from the repo
path via `get_or_create_project_by_repo` (constitutions are per-project, not per-feature).

## What's intentionally still local

- `.specify/templates/constitution-template.md` — read-only structural reference for
  `/speckit-constitution` (a static template shipped by Spec Kit, not project data).
- Extension hooks (`.specify/extensions.yml`, e.g. a `before_specify` git-branch-creation hook) are
  a separate, orthogonal concern from where spec/plan/tasks content lives — nothing here changes
  how hooks work. `speckit-specify`'s adapted version still creates/switches git branches per
  feature if that's your project's convention; it just doesn't dictate the spec's storage location
  anymore.

## After this, refinement happens in the Web UI

Once `/speckit-tasks` and `/speckit-analyze` have run for a feature, open the Spec-Forge Web UI
(`pnpm web:dev` from the spec-forge repo, or your homelab's deployed URL) to review, edit, and
"Mark as Ready" — see the root README's end-to-end flow.
