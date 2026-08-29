import { db, features, tasks, implementationSessions } from "@spec-forge/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getFeatureDependencyIds } from "./featureService.js";
import { getTaskDependencyIds } from "./taskService.js";
import { getFeatureSnapshot } from "./snapshotService.js";

async function isFeatureUnblocked(featureId: string): Promise<boolean> {
  const dependencyIds = await getFeatureDependencyIds(featureId);
  if (dependencyIds.length === 0) return true;
  const deps = await db.query.features.findMany({ where: inArray(features.id, dependencyIds) });
  return deps.every((d) => d.status === "done");
}

async function isTaskUnblocked(taskId: string): Promise<boolean> {
  const dependencyIds = await getTaskDependencyIds(taskId);
  if (dependencyIds.length === 0) return true;
  const deps = await db.query.tasks.findMany({ where: inArray(tasks.id, dependencyIds) });
  return deps.every((d) => d.status === "done" || d.status === "skipped");
}

export async function getNextTask(input: { projectId?: string; agentIdentifier: string }) {
  const candidateFeatures = await db.query.features.findMany({
    where: input.projectId
      ? and(eq(features.projectId, input.projectId))
      : undefined,
    orderBy: (f, { asc: ascOrder }) => [ascOrder(f.priority), ascOrder(f.createdAt)],
  });

  const eligibleFeatures = candidateFeatures.filter(
    (f) => f.status === "ready_for_implement" || f.status === "in_progress",
  );

  for (const feature of eligibleFeatures) {
    if (!(await isFeatureUnblocked(feature.id))) continue;

    const featureTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.featureId, feature.id), inArray(tasks.status, ["pending", "ready"])),
      orderBy: asc(tasks.orderIndex),
    });

    for (const task of featureTasks) {
      if (!(await isTaskUnblocked(task.id))) continue;

      await db.insert(implementationSessions).values({
        featureId: feature.id,
        agentIdentifier: input.agentIdentifier,
      });

      if (feature.status === "ready_for_implement") {
        await db
          .update(features)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(features.id, feature.id));
      }

      const snapshot = await getFeatureSnapshot(feature.id);
      return { ...snapshot, currentTask: task };
    }
  }

  return null;
}

export async function getQueueOverview(projectId: string) {
  const queueFeatures = await db.query.features.findMany({
    where: and(eq(features.projectId, projectId), inArray(features.status, ["ready_for_implement", "in_progress"])),
    orderBy: (f, { asc: ascOrder }) => [ascOrder(f.priority), ascOrder(f.createdAt)],
  });

  const sessions = queueFeatures.length
    ? await db.query.implementationSessions.findMany({
        where: inArray(
          implementationSessions.featureId,
          queueFeatures.map((f) => f.id),
        ),
        orderBy: (s, { desc: descOrder }) => [descOrder(s.claimedAt)],
      })
    : [];

  return queueFeatures.map((feature) => ({
    feature,
    sessions: sessions.filter((s) => s.featureId === feature.id),
  }));
}
