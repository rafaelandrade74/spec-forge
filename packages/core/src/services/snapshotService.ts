import { getFeature } from "./featureService.js";
import { getProject } from "./projectService.js";
import { getActiveConstitution } from "./constitutionService.js";
import { getCurrentSpecification } from "./specificationService.js";
import { getCurrentPlan } from "./planService.js";
import { getCurrentAnalysis } from "./analysisService.js";
import { listTasks } from "./taskService.js";
import { listClarifications } from "./clarificationService.js";

export async function getFeatureSnapshot(featureId: string) {
  const feature = await getFeature(featureId);
  const [project, constitution, specification, plan, analysis, tasks, clarifications] =
    await Promise.all([
      getProject(feature.projectId),
      getActiveConstitution(feature.projectId),
      getCurrentSpecification(featureId),
      getCurrentPlan(featureId),
      getCurrentAnalysis(featureId),
      listTasks(featureId),
      listClarifications(featureId),
    ]);

  return { project, feature, constitution, specification, plan, analysis, tasks, clarifications };
}
