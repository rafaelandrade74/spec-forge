# @spec-forge/cli

`spec-forge init` — installs the `/speckit-*` skills (from `../../integrations/claude-skills`)
into a target project (`.claude/skills/`) or globally (`~/.claude/skills/`).

## Why `dist/` and `templates/` are committed

Unlike every other package in this monorepo, this one intentionally **checks in its build output**
(`dist/`) and its bundled skill templates (`templates/`, synced from
`../../integrations/claude-skills`). This package is meant to be installed directly via
`npm install -g` / `pnpm add -g` from a **local path or a git URL** (see the root README) — neither
of those preserves the rest of the monorepo layout, and pnpm's supply-chain security gate
(`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`) blocks running a build/`prepare` script for a git-hosted
dependency by default. Committing pre-built output sidesteps both problems: no script needs to run
at install time at all.

## After editing a skill or `src/index.ts`

Rebuild and re-sync before committing:

```bash
pnpm --filter @spec-forge/cli build
git add apps/cli/dist apps/cli/templates
```

`build` runs `sync-templates` (copies the 6 skill folders from `integrations/claude-skills`) and
`tsc` (compiles `src/index.ts` → `dist/index.js`).
