import { promises as fs } from "node:fs";
import path from "node:path";
import { db, documentation } from "@spec-forge/db";
import { eq } from "drizzle-orm";
import { getFeatureSnapshot } from "./snapshotService.js";

function renderMarkdown(snapshot: Awaited<ReturnType<typeof getFeatureSnapshot>>): string {
  const { project, feature, specification, plan, tasks, analysis } = snapshot;
  const lines: string[] = [];

  lines.push(`# ${feature.title}`);
  lines.push("");
  lines.push(`- **feature_id**: \`${feature.id}\``);
  lines.push(`- **project**: ${project.name} (\`${project.slug}\`)`);
  lines.push(`- **slug**: \`${feature.slug}\``);
  lines.push(`- **status**: ${feature.status}`);
  lines.push(`- **completed_at**: ${feature.completedAt?.toISOString() ?? "-"}`);
  lines.push("");

  lines.push("## Specification");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(specification?.content ?? {}, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## Plan");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(plan?.content ?? {}, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## Tasks");
  lines.push("");
  for (const task of tasks) {
    const tags = [task.phase, task.story, task.parallel ? "P" : null].filter(Boolean).join(", ");
    lines.push(
      `- [${task.status === "done" ? "x" : " "}] **${task.code}**${tags ? ` [${tags}]` : ""} ${task.title}`,
    );
    if (task.description) lines.push(`  ${task.description}`);
  }
  lines.push("");

  lines.push("## Analysis");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(analysis?.findings ?? [], null, 2));
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

export async function generateDocumentationForFeature(featureId: string) {
  const snapshot = await getFeatureSnapshot(featureId);
  const content = renderMarkdown(snapshot);

  let filePath: string | undefined;
  if (snapshot.project.repoPath) {
    const relativePath = path.join("docs", "features", `${snapshot.feature.slug}.md`);
    const absolutePath = path.join(snapshot.project.repoPath, relativePath);
    try {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, "utf-8");
      filePath = relativePath.replace(/\\/g, "/");
    } catch (err) {
      // repoPath is not reachable from this process (e.g. MCP server running remotely
      // while repoPath points at a path on the developer's machine) — the database
      // record below is still the source of truth, so degrade gracefully instead of
      // failing the whole task-completion flow.
      console.warn(
        `[spec-forge] could not write documentation file to ${absolutePath}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  const [row] = await db
    .insert(documentation)
    .values({ featureId, contentMarkdown: content, filePath })
    .onConflictDoUpdate({
      target: documentation.featureId,
      set: { contentMarkdown: content, filePath, generatedAt: new Date() },
    })
    .returning();

  return row;
}

export async function getDocumentation(featureId: string) {
  return db.query.documentation.findFirst({ where: eq(documentation.featureId, featureId) });
}
