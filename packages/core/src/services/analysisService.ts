import { db, analyses } from "@spec-forge/db";
import { desc, eq } from "drizzle-orm";
import { recordRevision } from "../revisions.js";
import { updateFeatureStatus } from "./featureService.js";
import { getCurrentSpecification } from "./specificationService.js";
import { getCurrentPlan } from "./planService.js";
import { listTasks } from "./taskService.js";

export interface AnalysisFinding {
  area: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  relatedTaskCodes?: string[];
}

export async function analyze(input: {
  featureId: string;
  findings: AnalysisFinding[];
  status?: "draft" | "in_review" | "refined" | "ready";
  actorType?: "ai" | "human";
}) {
  const [spec, currentPlan, tasks] = await Promise.all([
    getCurrentSpecification(input.featureId),
    getCurrentPlan(input.featureId),
    listTasks(input.featureId),
  ]);

  const last = await db.query.analyses.findFirst({
    where: eq(analyses.featureId, input.featureId),
    orderBy: desc(analyses.version),
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const severitySummary = input.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const [row] = await db
    .insert(analyses)
    .values({
      featureId: input.featureId,
      version: nextVersion,
      specVersion: spec?.version,
      planVersion: currentPlan?.version,
      tasksSnapshotRef: tasks.map((t) => t.code) as never,
      findings: input.findings as never,
      severitySummary: severitySummary as never,
      status: input.status ?? "draft",
      createdBy: input.actorType ?? "ai",
    })
    .returning();

  await recordRevision(db, {
    entityType: "analysis",
    entityId: row.id,
    featureId: input.featureId,
    actorType: input.actorType ?? "ai",
    diff: { version: nextVersion, severitySummary },
  });

  await updateFeatureStatus(input.featureId, "analyzing");

  return row;
}

export async function getCurrentAnalysis(featureId: string) {
  return db.query.analyses.findFirst({
    where: eq(analyses.featureId, featureId),
    orderBy: desc(analyses.version),
  });
}
