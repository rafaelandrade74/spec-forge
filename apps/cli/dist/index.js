#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/index.ts (dev, via tsx) and dist/index.js (built) both sit one level under the package
// root, so ../templates resolves the same way either way. Templates are bundled inside this
// package (see scripts/sync-templates.mjs) so `spec-forge init` works after `npm install -g`
// from a local path, a git URL, or the npm registry — none of which preserve the monorepo's
// directory layout, so this must not reach outside the package for its own files.
const SKILLS_SOURCE = path.join(__dirname, "..", "templates");
const SKILL_NAMES = [
    "speckit-constitution",
    "speckit-specify",
    "speckit-clarify",
    "speckit-plan",
    "speckit-tasks",
    "speckit-analyze",
];
function parseArgs(argv) {
    const args = {};
    args.command = argv[0];
    for (let i = 1; i < argv.length; i++) {
        if (argv[i] === "--scope")
            args.scope = argv[++i];
        else if (argv[i] === "--target")
            args.target = argv[++i];
    }
    return args;
}
async function pathExists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function promptScope() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("Onde instalar os skills /speckit-*?\n");
    console.log(`  [1] Neste repositório  (${process.cwd()}/.claude/skills)`);
    console.log(`  [2] Globalmente        (${path.join(os.homedir(), ".claude", "skills")} — vale para todo projeto que não tenha skills locais)\n`);
    const answer = (await rl.question("Escolha 1 ou 2 [1]: ")).trim() || "1";
    rl.close();
    if (answer === "2")
        return "global";
    if (answer === "1")
        return "repo";
    console.error(`Opção inválida: "${answer}"`);
    process.exit(1);
}
async function runInit(args) {
    if (!(await pathExists(SKILLS_SOURCE))) {
        console.error(`Não encontrei os templates dos skills em ${SKILLS_SOURCE}.`);
        console.error("Rode `pnpm build` em apps/cli (que sincroniza os templates) antes de instalar/rodar este comando.");
        process.exit(1);
    }
    let scope = args.scope;
    if (scope !== "repo" && scope !== "global") {
        if (args.scope) {
            console.error(`--scope deve ser "repo" ou "global", recebido: "${args.scope}"`);
            process.exit(1);
        }
        scope = await promptScope();
    }
    const baseTarget = args.target
        ? path.resolve(args.target)
        : scope === "global"
            ? path.join(os.homedir(), ".claude", "skills")
            : path.join(process.cwd(), ".claude", "skills");
    await fs.mkdir(baseTarget, { recursive: true });
    console.log(`\nInstalando em ${baseTarget}\n`);
    for (const name of SKILL_NAMES) {
        const src = path.join(SKILLS_SOURCE, name);
        const dest = path.join(baseTarget, name);
        await fs.rm(dest, { recursive: true, force: true });
        await fs.cp(src, dest, { recursive: true });
        console.log(`  ✓ ${name}`);
    }
    console.log(`\nPronto. /speckit-specify, /speckit-clarify, /speckit-plan, /speckit-tasks, /speckit-analyze e /speckit-constitution` +
        ` agora persistem no Spec-Forge em vez de arquivos locais.`);
    if (scope === "global") {
        console.log("\nNota: projetos que já têm .claude/skills/speckit-* locais continuam usando a versão local" +
            " (skills de projeto têm prioridade sobre os globais). Rode `spec-forge init` dentro desses" +
            " projetos e escolha a opção 1 para sobrescrever os locais também.");
    }
    console.log("\nLembrete: o servidor MCP do spec-forge precisa estar registrado no Claude Code (veja o README)" +
        " para esses comandos funcionarem.");
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.command !== "init") {
        console.log("Uso: spec-forge init [--scope repo|global] [--target <caminho>]");
        process.exit(args.command ? 1 : 0);
    }
    await runInit(args);
}
main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
