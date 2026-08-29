// Copies integrations/claude-skills/speckit-* into apps/cli/templates/, so the CLI package is
// self-contained (works after `npm install -g` from a local path, a git URL, or the npm registry —
// none of which preserve the monorepo's directory layout, unlike a plain pnpm workspace checkout).
// Run this after editing any file under integrations/claude-skills/.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(CLI_ROOT, "..", "..");
const SOURCE = path.join(REPO_ROOT, "integrations", "claude-skills");
const DEST = path.join(CLI_ROOT, "templates");

const SKILL_NAMES = [
  "speckit-constitution",
  "speckit-specify",
  "speckit-clarify",
  "speckit-plan",
  "speckit-tasks",
  "speckit-analyze",
];

async function main() {
  await fs.rm(DEST, { recursive: true, force: true });
  await fs.mkdir(DEST, { recursive: true });
  for (const name of SKILL_NAMES) {
    await fs.cp(path.join(SOURCE, name), path.join(DEST, name), { recursive: true });
    console.log(`  synced ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
