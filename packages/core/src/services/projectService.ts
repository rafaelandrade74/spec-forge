import { db, projects } from "@spec-forge/db";
import { eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "../errors.js";

export async function createProject(input: {
  slug: string;
  name: string;
  repoPath?: string;
  repoUrl?: string;
  description?: string;
}) {
  const existing = await db.query.projects.findFirst({ where: eq(projects.slug, input.slug) });
  if (existing) {
    throw new ValidationError(`Project slug already exists: ${input.slug}`);
  }
  const [project] = await db
    .insert(projects)
    .values({
      slug: input.slug,
      name: input.name,
      repoPath: input.repoPath,
      repoUrl: input.repoUrl,
      description: input.description,
    })
    .returning();
  return project;
}

export async function listProjects() {
  return db.query.projects.findMany({ orderBy: (p, { asc }) => [asc(p.name)] });
}

export async function getProject(projectId: string) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export async function getProjectBySlug(slug: string) {
  const project = await db.query.projects.findFirst({ where: eq(projects.slug, slug) });
  if (!project) throw new NotFoundError("Project", slug);
  return project;
}

function normalizePath(p: string) {
  return p.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function slugifyFolderName(p: string) {
  const folder = normalizePath(p).split("/").filter(Boolean).pop() ?? "project";
  return (
    folder
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

async function uniqueSlug(base: string) {
  let slug = base;
  let suffix = 1;
  while (await db.query.projects.findFirst({ where: eq(projects.slug, slug) })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function getOrCreateProjectByRepoPath(input: { repoPath: string; name?: string }) {
  const target = normalizePath(input.repoPath);
  const all = await db.query.projects.findMany();
  const existing = all.find((p) => p.repoPath && normalizePath(p.repoPath) === target);
  if (existing) return existing;

  const baseSlug = slugifyFolderName(input.repoPath);
  const slug = await uniqueSlug(baseSlug);
  const name = input.name ?? baseSlug;

  const [project] = await db
    .insert(projects)
    .values({ slug, name, repoPath: input.repoPath })
    .returning();
  return project;
}
