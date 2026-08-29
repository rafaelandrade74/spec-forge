import { db, revisions, type Database } from "@spec-forge/db";
import { eq, desc } from "drizzle-orm";

type RevisionEntityType =
  | "constitution"
  | "specification"
  | "clarification"
  | "plan"
  | "task"
  | "analysis";

type ActorType = "ai" | "human";

export async function recordRevision(
  database: Database,
  params: {
    entityType: RevisionEntityType;
    entityId: string;
    featureId?: string;
    diff?: unknown;
    actorType: ActorType;
    actorId?: string;
    note?: string;
  },
) {
  await database.insert(revisions).values({
    entityType: params.entityType,
    entityId: params.entityId,
    featureId: params.featureId,
    diff: params.diff as never,
    actorType: params.actorType,
    actorId: params.actorId,
    note: params.note,
  });
}

export async function listRevisionsForFeature(featureId: string) {
  return db.query.revisions.findMany({
    where: eq(revisions.featureId, featureId),
    orderBy: desc(revisions.createdAt),
  });
}

export { db };
