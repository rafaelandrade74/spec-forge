import { promises as fs } from "node:fs";
import {
  ProjectService,
  ConstitutionService,
  FeatureService,
  SpecificationService,
  ClarificationService,
  PlanService,
  TaskService,
  AnalysisService,
  ReadinessService,
  QueueService,
  ProgressService,
  DocumentationService,
} from "@spec-forge/core";

const repoPath = process.env.E2E_REPO_PATH ?? "C:/Users/rafae/AppData/Local/Temp/spec-forge-e2e-repo";

async function main() {
  await fs.mkdir(repoPath, { recursive: true });

  const project = await ProjectService.createProject({
    slug: `e2e-${Date.now()}`,
    name: "E2E Test Project",
    repoPath,
  });
  console.log("[1] project created", project.id);

  await ConstitutionService.setConstitution({
    projectId: project.id,
    content: "Sempre escrever testes. Sempre documentar decisões.",
    status: "ready",
  });
  console.log("[2] constitution set");

  const feature = await FeatureService.createFeature({
    projectId: project.id,
    title: "Autenticação de usuários",
  });
  console.log("[3] feature created", feature.slug);

  await SpecificationService.specify({
    featureId: feature.id,
    content: { userStories: ["Como usuário quero logar com email e senha"] },
    status: "refined",
  });
  console.log("[4] specification created");

  const questions = await ClarificationService.askClarifications({
    featureId: feature.id,
    questions: ["Precisa de login social (Google/GitHub)?"],
  });
  console.log("[5] clarification asked", questions.length);

  await ClarificationService.answerClarification({
    clarificationId: questions[0].id,
    answer: "Não, apenas email/senha por enquanto.",
    answeredBy: "human",
  });
  console.log("[6] clarification answered");

  const pending = await ClarificationService.listPendingClarifications(feature.id);
  console.log("[7] pending clarifications:", pending.length);

  await PlanService.plan({
    featureId: feature.id,
    content: { architecture: "JWT + bcrypt, tabela users no Postgres" },
    status: "refined",
  });
  console.log("[8] plan created");

  await TaskService.generateTasks({
    featureId: feature.id,
    tasks: [
      { code: "T001", title: "Criar tabela users", estimatedComplexity: "S" },
      { code: "T002", title: "Endpoint de login", dependsOn: ["T001"], estimatedComplexity: "M" },
    ],
  });
  console.log("[9] tasks generated");

  await AnalysisService.analyze({
    featureId: feature.id,
    findings: [{ area: "security", severity: "low", description: "Rate limiting não especificado." }],
    status: "refined",
  });
  console.log("[10] analysis recorded");

  const ready = await ReadinessService.markFeatureReady(feature.id);
  console.log("[11] feature marked ready:", ready.status);

  const claim = await QueueService.getNextTask({ agentIdentifier: "e2e-test-agent" });
  console.log("[12] get_next_task ->", claim?.currentTask.code, "| feature status:", claim?.feature.status);

  if (!claim) throw new Error("Expected get_next_task to return a task");

  await ProgressService.reportTaskProgress({ taskId: claim.currentTask.id, status: "done" });
  console.log("[13] first task reported done");

  const claim2 = await QueueService.getNextTask({ agentIdentifier: "e2e-test-agent" });
  console.log("[14] get_next_task ->", claim2?.currentTask.code);
  if (!claim2) throw new Error("Expected second get_next_task call to return the dependent task");

  const result = await ProgressService.reportTaskProgress({ taskId: claim2.currentTask.id, status: "done" });
  console.log("[15] second task reported done, feature status:", result.feature?.status);
  console.log("[16] documentation generated at:", result.documentation?.filePath);

  const doc = await DocumentationService.getDocumentation(feature.id);
  const fileContent = doc?.filePath ? await fs.readFile(`${repoPath}/${doc.filePath}`, "utf-8") : null;
  console.log("[17] doc file exists on disk:", fileContent !== null, "| length:", fileContent?.length);

  console.log("\nE2E OK");
}

main().catch((err) => {
  console.error("E2E FAILED:", err);
  process.exit(1);
});
