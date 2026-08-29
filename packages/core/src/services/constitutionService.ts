import { db, constitutions } from "@spec-forge/db";
import { and, desc, eq } from "drizzle-orm";
import { recordRevision } from "../revisions.js";

export async function setConstitution(input: {
  projectId: string;
  content: string;
  status?: "draft" | "in_review" | "refined" | "ready";
  actorType?: "ai" | "human";
}) {
  const last = await db.query.constitutions.findFirst({
    where: eq(constitutions.projectId, input.projectId),
    orderBy: desc(constitutions.version),
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const [row] = await db
    .insert(constitutions)
    .values({
      projectId: input.projectId,
      version: nextVersion,
      content: input.content,
      status: input.status ?? "draft",
      createdBy: input.actorType ?? "ai",
    })
    .returning();

  await recordRevision(db, {
    entityType: "constitution",
    entityId: row.id,
    actorType: input.actorType ?? "ai",
    diff: { version: nextVersion, content: input.content },
  });

  return row;
}

export async function getActiveConstitution(projectId: string) {
  return db.query.constitutions.findFirst({
    where: and(eq(constitutions.projectId, projectId), eq(constitutions.status, "ready")),
    orderBy: desc(constitutions.version),
  });
}

export async function getConstitution(projectId: string, version?: number) {
  if (version) {
    return db.query.constitutions.findFirst({
      where: and(eq(constitutions.projectId, projectId), eq(constitutions.version, version)),
    });
  }
  const active = await getActiveConstitution(projectId);
  if (active) return active;
  return db.query.constitutions.findFirst({
    where: eq(constitutions.projectId, projectId),
    orderBy: desc(constitutions.version),
  });
}
