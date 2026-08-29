import { db, clarifications } from "@spec-forge/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "../errors.js";
import { recordRevision } from "../revisions.js";
import { updateFeatureStatus } from "./featureService.js";
import { getCurrentSpecification } from "./specificationService.js";

export async function askClarifications(input: { featureId: string; questions: string[] }) {
  if (input.questions.length === 0) return [];
  const spec = await getCurrentSpecification(input.featureId);

  const rows = await db
    .insert(clarifications)
    .values(
      input.questions.map((question, index) => ({
        featureId: input.featureId,
        specificationVersion: spec?.version,
        question,
        orderIndex: index,
      })),
    )
    .returning();

  await updateFeatureStatus(input.featureId, "clarifying");
  return rows;
}

export async function answerClarification(input: {
  clarificationId: string;
  answer: string;
  answeredBy: "ai" | "human";
}) {
  const [row] = await db
    .update(clarifications)
    .set({
      answer: input.answer,
      answeredBy: input.answeredBy,
      status: "answered",
      answeredAt: new Date(),
    })
    .where(eq(clarifications.id, input.clarificationId))
    .returning();

  if (!row) throw new NotFoundError("Clarification", input.clarificationId);

  await recordRevision(db, {
    entityType: "clarification",
    entityId: row.id,
    featureId: row.featureId,
    actorType: input.answeredBy,
    diff: { answer: input.answer },
  });

  return row;
}

export async function listPendingClarifications(featureId: string) {
  return db.query.clarifications.findMany({
    where: and(eq(clarifications.featureId, featureId), eq(clarifications.status, "pending")),
    orderBy: (c, { asc }) => [asc(c.orderIndex)],
  });
}

export async function listClarifications(featureId: string) {
  return db.query.clarifications.findMany({
    where: eq(clarifications.featureId, featureId),
    orderBy: (c, { asc }) => [asc(c.orderIndex)],
  });
}
