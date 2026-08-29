import { db, features, featureDependencies } from "@spec-forge/db";
import { eq, sql } from "drizzle-orm";
import { NotFoundError } from "../errors.js";
import { getActiveConstitution } from "./constitutionService.js";

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function nextFeatureNumber(projectId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(features)
    .where(eq(features.projectId, projectId));
  return count + 1;
}

export async function createFeature(input: {
  projectId: string;
  title: string;
  priority?: number;
  dependsOnFeatureIds?: string[];
}) {
  const number = await nextFeatureNumber(input.projectId);
  const slug = `${String(number).padStart(3, "0")}-${slugify(input.title)}`;
  const activeConstitution = await getActiveConstitution(input.projectId);

  const [feature] = await db
    .insert(features)
    .values({
      projectId: input.projectId,
      slug,
      title: input.title,
      priority: input.priority ?? 100,
      constitutionVersionUsed: activeConstitution?.version,
    })
    .returning();

  if (input.dependsOnFeatureIds?.length) {
    await db.insert(featureDependencies).values(
      input.dependsOnFeatureIds.map((dependsOnFeatureId) => ({
        featureId: feature.id,
        dependsOnFeatureId,
      })),
    );
  }

  return feature;
}

export async function getFeature(featureId: string) {
  const feature = await db.query.features.findFirst({ where: eq(features.id, featureId) });
  if (!feature) throw new NotFoundError("Feature", featureId);
  return feature;
}

export async function listFeatures(projectId: string) {
  return db.query.features.findMany({
    where: eq(features.projectId, projectId),
    orderBy: (f, { asc }) => [asc(f.priority), asc(f.createdAt)],
  });
}

export async function updateFeatureStatus(
  featureId: string,
  status: (typeof features.status.enumValues)[number],
  extra?: Partial<{ readyAt: Date; completedAt: Date }>,
) {
  const [row] = await db
    .update(features)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(features.id, featureId))
    .returning();
  if (!row) throw new NotFoundError("Feature", featureId);
  return row;
}

export async function updateFeaturePriority(featureId: string, priority: number) {
  const [row] = await db
    .update(features)
    .set({ priority, updatedAt: new Date() })
    .where(eq(features.id, featureId))
    .returning();
  if (!row) throw new NotFoundError("Feature", featureId);
  return row;
}

export async function getFeatureDependencyIds(featureId: string) {
  const rows = await db.query.featureDependencies.findMany({
    where: eq(featureDependencies.featureId, featureId),
  });
  return rows.map((r) => r.dependsOnFeatureId);
}
