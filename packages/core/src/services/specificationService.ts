import { db, specifications, features } from "@spec-forge/db";
import { desc, eq } from "drizzle-orm";
import { recordRevision } from "../revisions.js";
import { updateFeatureStatus } from "./featureService.js";

export async function specify(input: {
  featureId: string;
  content: unknown;
  status?: "draft" | "in_review" | "refined" | "ready";
  actorType?: "ai" | "human";
  note?: string;
}) {
  const last = await db.query.specifications.findFirst({
    where: eq(specifications.featureId, input.featureId),
    orderBy: desc(specifications.version),
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const [row] = await db
    .insert(specifications)
    .values({
      featureId: input.featureId,
      version: nextVersion,
      content: input.content as never,
      status: input.status ?? "draft",
      createdBy: input.actorType ?? "ai",
    })
    .returning();

  await recordRevision(db, {
    entityType: "specification",
    entityId: row.id,
    featureId: input.featureId,
    actorType: input.actorType ?? "ai",
    diff: { version: nextVersion, content: input.content },
    note: input.note,
  });

  const feature = await db.query.features.findFirst({ where: eq(features.id, input.featureId) });
  if (feature && feature.status === "backlog") {
    await updateFeatureStatus(input.featureId, "specifying");
  }

  return row;
}

export async function getCurrentSpecification(featureId: string) {
  return db.query.specifications.findFirst({
    where: eq(specifications.featureId, featureId),
    orderBy: desc(specifications.version),
  });
}
