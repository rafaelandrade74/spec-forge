import { db, tasks, taskDependencies } from "@spec-forge/db";
import { eq } from "drizzle-orm";
import { ValidationError, NotFoundError } from "../errors.js";
import { recordRevision } from "../revisions.js";
import { updateFeatureStatus } from "./featureService.js";
import { getCurrentPlan } from "./planService.js";

export interface TaskInput {
  code: string;
  title: string;
  description?: string;
  filePaths?: string[];
  phase?: string;
  story?: string;
  parallel?: boolean;
  estimatedComplexity?: "S" | "M" | "L";
  dependsOn?: string[];
}

export async function generateTasks(input: {
  featureId: string;
  tasks: TaskInput[];
  actorType?: "ai" | "human";
}) {
  const currentPlan = await getCurrentPlan(input.featureId);
  if (!currentPlan || currentPlan.status === "draft") {
    throw new ValidationError(
      "Cannot generate tasks before the feature has a plan that is at least in_review.",
    );
  }

  const created = await db
    .insert(tasks)
    .values(
      input.tasks.map((t, index) => ({
        featureId: input.featureId,
        planVersion: currentPlan.version,
        code: t.code,
        title: t.title,
        description: t.description,
        filePaths: t.filePaths,
        phase: t.phase,
        story: t.story,
        parallel: t.parallel ?? false,
        orderIndex: index,
        estimatedComplexity: t.estimatedComplexity,
        createdBy: input.actorType ?? "ai",
      })),
    )
    .returning();

  const codeToId = new Map(created.map((t) => [t.code, t.id]));
  const dependencyRows: { taskId: string; dependsOnTaskId: string }[] = [];
  input.tasks.forEach((t) => {
    const taskId = codeToId.get(t.code);
    if (!taskId || !t.dependsOn?.length) return;
    for (const depCode of t.dependsOn) {
      const depId = codeToId.get(depCode);
      if (depId) dependencyRows.push({ taskId, dependsOnTaskId: depId });
    }
  });
  if (dependencyRows.length) {
    await db.insert(taskDependencies).values(dependencyRows);
  }

  await recordRevision(db, {
    entityType: "task",
    entityId: input.featureId,
    featureId: input.featureId,
    actorType: input.actorType ?? "ai",
    diff: { taskCount: created.length },
  });

  await updateFeatureStatus(input.featureId, "tasking");

  return created;
}

export async function listTasks(featureId: string) {
  return db.query.tasks.findMany({
    where: eq(tasks.featureId, featureId),
    orderBy: (t, { asc }) => [asc(t.orderIndex)],
  });
}

export async function getTaskDependencyIds(taskId: string) {
  const rows = await db.query.taskDependencies.findMany({
    where: eq(taskDependencies.taskId, taskId),
  });
  return rows.map((r) => r.dependsOnTaskId);
}

export async function updateTaskStatus(input: {
  taskId: string;
  status: "pending" | "ready" | "in_progress" | "done" | "blocked" | "skipped";
  note?: string;
  actorType?: "ai" | "human";
}) {
  const now = new Date();
  const extra: Record<string, unknown> = {};
  if (input.status === "in_progress") extra.startedAt = now;
  if (input.status === "done") extra.completedAt = now;

  const [row] = await db
    .update(tasks)
    .set({ status: input.status, ...extra })
    .where(eq(tasks.id, input.taskId))
    .returning();

  if (!row) throw new NotFoundError("Task", input.taskId);

  await recordRevision(db, {
    entityType: "task",
    entityId: row.id,
    featureId: row.featureId,
    actorType: input.actorType ?? "ai",
    diff: { status: input.status },
    note: input.note,
  });

  return row;
}
