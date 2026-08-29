"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  TokenService,
} from "@spec-forge/core";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseJson(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Campo "${key}" não é um JSON válido.`);
  }
}

async function withErrorRedirect(returnPath: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(`${returnPath}?error=${encodeURIComponent(message)}`);
  }
}

export async function createProjectAction(formData: FormData) {
  await withErrorRedirect("/", async () => {
    await ProjectService.createProject({
      slug: str(formData, "slug"),
      name: str(formData, "name"),
      repoPath: str(formData, "repoPath") || undefined,
      description: str(formData, "description") || undefined,
    });
    revalidatePath("/");
  });
  redirect("/");
}

export async function setConstitutionAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  await withErrorRedirect(`/projects/${projectId}/constitution`, async () => {
    await ConstitutionService.setConstitution({
      projectId,
      content: str(formData, "content"),
      status: (str(formData, "status") || "draft") as never,
    });
    revalidatePath(`/projects/${projectId}/constitution`);
  });
  redirect(`/projects/${projectId}/constitution`);
}

export async function createFeatureAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  await withErrorRedirect(`/projects/${projectId}`, async () => {
    const priorityRaw = str(formData, "priority");
    await FeatureService.createFeature({
      projectId,
      title: str(formData, "title"),
      priority: priorityRaw ? Number(priorityRaw) : undefined,
    });
    revalidatePath(`/projects/${projectId}`);
  });
  redirect(`/projects/${projectId}`);
}

export async function updateFeaturePriorityAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  await withErrorRedirect(`/projects/${projectId}`, async () => {
    await FeatureService.updateFeaturePriority(featureId, Number(str(formData, "priority")));
    revalidatePath(`/projects/${projectId}`);
  });
  redirect(`/projects/${projectId}`);
}

function featurePath(projectId: string, featureId: string) {
  return `/projects/${projectId}/features/${featureId}`;
}

export async function specifyAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    await SpecificationService.specify({
      featureId,
      content: parseJson(formData, "content"),
      status: (str(formData, "status") || "draft") as never,
      actorType: "human",
    });
    revalidatePath(path);
  });
  redirect(path);
}

export async function planAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    await PlanService.plan({
      featureId,
      content: parseJson(formData, "content"),
      status: (str(formData, "status") || "draft") as never,
      actorType: "human",
    });
    revalidatePath(path);
  });
  redirect(path);
}

export async function generateTasksAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    const tasks = parseJson(formData, "tasks");
    if (!Array.isArray(tasks)) throw new Error('O campo "tasks" deve ser um array JSON.');
    await TaskService.generateTasks({ featureId, tasks, actorType: "human" });
    revalidatePath(path);
  });
  redirect(path);
}

export async function updateTaskStatusAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    await TaskService.updateTaskStatus({
      taskId: str(formData, "taskId"),
      status: str(formData, "status") as never,
      actorType: "human",
    });
    revalidatePath(path);
  });
  redirect(path);
}

export async function analyzeAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    const findings = parseJson(formData, "findings");
    if (!Array.isArray(findings)) throw new Error('O campo "findings" deve ser um array JSON.');
    await AnalysisService.analyze({
      featureId,
      findings,
      status: (str(formData, "status") || "draft") as never,
      actorType: "human",
    });
    revalidatePath(path);
  });
  redirect(path);
}

export async function askClarificationAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    const question = str(formData, "question");
    if (!question) throw new Error("Pergunta não pode ser vazia.");
    await ClarificationService.askClarifications({ featureId, questions: [question] });
    revalidatePath(path);
  });
  redirect(path);
}

export async function answerClarificationAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    await ClarificationService.answerClarification({
      clarificationId: str(formData, "clarificationId"),
      answer: str(formData, "answer"),
      answeredBy: "human",
    });
    revalidatePath(path);
  });
  redirect(path);
}

export async function markFeatureReadyAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const featureId = str(formData, "featureId");
  const path = featurePath(projectId, featureId);
  await withErrorRedirect(path, async () => {
    await ReadinessService.markFeatureReady(featureId);
    revalidatePath(path);
    revalidatePath(`/projects/${projectId}`);
  });
  redirect(path);
}

export async function createTokenAction(formData: FormData) {
  const label = str(formData, "label") || "default";
  let token: string;
  try {
    const result = await TokenService.generateToken(label);
    token = result.token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(`/tokens?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/tokens");
  redirect(`/tokens?newToken=${encodeURIComponent(token)}&newLabel=${encodeURIComponent(label)}`);
}

export async function revokeTokenAction(formData: FormData) {
  await withErrorRedirect("/tokens", async () => {
    await TokenService.revokeToken(str(formData, "id"));
    revalidatePath("/tokens");
  });
  redirect("/tokens");
}
