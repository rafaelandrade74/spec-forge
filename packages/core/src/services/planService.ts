import { db, plans } from "@spec-forge/db";
import { desc, eq } from "drizzle-orm";
import { ValidationError } from "../errors.js";
import { recordRevision } from "../revisions.js";
import { updateFeatureStatus } from "./featureService.js";
import { getCurrentSpecification } from "./specificationService.js";

export async function plan(input: {
  featureId: string;
  content: unknown;
  status?: "draft" | "in_review" | "refined" | "ready";
  actorType?: "ai" | "human";
  note?: string;
}) {
  const spec = await getCurrentSpecification(input.featureId);
  if (!spec || spec.status === "draft") {
    throw new ValidationError(
      "Cannot create a plan before the feature has a specification that is at least in_review.",
    );
  }

  const last = await db.query.plans.findFirst({
    where: eq(plans.featureId, input.featureId),
    orderBy: desc(plans.version),
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const [row] = await db
    .insert(plans)
    .values({
      featureId: input.featureId,
      version: nextVersion,
      content: input.content as never,
      specVersionUsed: spec.version,
      status: input.status ?? "draft",
      createdBy: input.actorType ?? "ai",
    })
    .returning();

  await recordRevision(db, {
    entityType: "plan",
    entityId: row.id,
    featureId: input.featureId,
    actorType: input.actorType ?? "ai",
    diff: { version: nextVersion, content: input.content },
    note: input.note,
  });

  await updateFeatureStatus(input.featureId, "planning");

  return row;
}

export async function getCurrentPlan(featureId: string) {
  return db.query.plans.findFirst({
    where: eq(plans.featureId, featureId),
    orderBy: desc(plans.version),
  });
}
