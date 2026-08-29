import { db, implementationSessions } from "@spec-forge/db";
import { eq } from "drizzle-orm";
import { updateTaskStatus, listTasks } from "./taskService.js";
import { updateFeatureStatus } from "./featureService.js";
import { generateDocumentationForFeature } from "./documentationService.js";
import { recordRevision } from "../revisions.js";

export async function reportTaskProgress(input: {
  taskId: string;
  status: "pending" | "ready" | "in_progress" | "done" | "blocked" | "skipped";
  note?: string;
  actorType?: "ai" | "human";
}) {
  const task = await updateTaskStatus(input);

  if (input.status !== "done") {
    return { task, feature: null, documentation: null };
  }

  const featureTasks = await listTasks(task.featureId);
  const allDone = featureTasks.every((t) => t.status === "done" || t.status === "skipped");

  if (!allDone) {
    return { task, feature: null, documentation: null };
  }

  const feature = await updateFeatureStatus(task.featureId, "done", { completedAt: new Date() });

  await db
    .update(implementationSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(implementationSessions.featureId, task.featureId));

  const doc = await generateDocumentationForFeature(task.featureId);

  return { task, feature, documentation: doc };
}

export async function reportFeatureBlocked(input: {
  featureId: string;
  note: string;
  actorType?: "ai" | "human";
}) {
  const feature = await updateFeatureStatus(input.featureId, "blocked");

  await recordRevision(db, {
    entityType: "task",
    entityId: input.featureId,
    featureId: input.featureId,
    actorType: input.actorType ?? "ai",
    note: input.note,
  });

  return feature;
}
