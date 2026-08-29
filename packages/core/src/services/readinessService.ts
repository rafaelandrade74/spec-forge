import { ValidationError } from "../errors.js";
import { getCurrentSpecification } from "./specificationService.js";
import { getCurrentPlan } from "./planService.js";
import { getCurrentAnalysis } from "./analysisService.js";
import { listPendingClarifications } from "./clarificationService.js";
import { listTasks } from "./taskService.js";
import { updateFeatureStatus } from "./featureService.js";

const REFINED_STATUSES = new Set(["refined", "ready"]);

export async function markFeatureReady(featureId: string) {
  const [spec, plan, analysis, pendingClarifications, tasks] = await Promise.all([
    getCurrentSpecification(featureId),
    getCurrentPlan(featureId),
    getCurrentAnalysis(featureId),
    listPendingClarifications(featureId),
    listTasks(featureId),
  ]);

  const problems: string[] = [];
  if (!spec || !REFINED_STATUSES.has(spec.status)) {
    problems.push("Specification is not refined.");
  }
  if (!plan || !REFINED_STATUSES.has(plan.status)) {
    problems.push("Plan is not refined.");
  }
  if (!analysis || !REFINED_STATUSES.has(analysis.status)) {
    problems.push("Analysis is not refined.");
  }
  if (tasks.length === 0) {
    problems.push("No tasks have been generated.");
  }
  if (pendingClarifications.length > 0) {
    problems.push(`${pendingClarifications.length} clarification(s) still pending.`);
  }
  const criticalFindings = ((analysis?.findings as { severity: string }[] | undefined) ?? []).filter(
    (f) => f.severity === "critical",
  );
  if (criticalFindings.length > 0) {
    problems.push(`${criticalFindings.length} critical finding(s) unresolved in analysis.`);
  }

  if (problems.length > 0) {
    throw new ValidationError(`Feature is not ready: ${problems.join(" ")}`);
  }

  return updateFeatureStatus(featureId, "ready_for_implement", { readyAt: new Date() });
}
