import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const phaseStatusEnum = pgEnum("phase_status", [
  "draft",
  "in_review",
  "refined",
  "ready",
]);

export const featureStatusEnum = pgEnum("feature_status", [
  "backlog",
  "specifying",
  "clarifying",
  "planning",
  "tasking",
  "analyzing",
  "refining",
  "ready_for_implement",
  "in_progress",
  "done",
  "blocked",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "ready",
  "in_progress",
  "done",
  "blocked",
  "skipped",
]);

export const actorTypeEnum = pgEnum("actor_type", ["ai", "human"]);

export const clarificationStatusEnum = pgEnum("clarification_status", [
  "pending",
  "answered",
  "resolved_in_spec",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "claimed",
  "completed",
  "abandoned",
]);

export const revisionEntityTypeEnum = pgEnum("revision_entity_type", [
  "constitution",
  "specification",
  "clarification",
  "plan",
  "task",
  "analysis",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  repoPath: text("repo_path"),
  repoUrl: text("repo_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex("projects_slug_idx").on(t.slug),
}));

export const constitutions = pgTable("constitutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: phaseStatusEnum("status").notNull().default("draft"),
  createdBy: actorTypeEnum("created_by").notNull().default("ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectVersionIdx: uniqueIndex("constitutions_project_version_idx").on(t.projectId, t.version),
}));

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  status: featureStatusEnum("status").notNull().default("backlog"),
  priority: integer("priority").notNull().default(100),
  constitutionVersionUsed: integer("constitution_version_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  projectSlugIdx: uniqueIndex("features_project_slug_idx").on(t.projectId, t.slug),
  statusPriorityIdx: index("features_status_priority_idx").on(t.projectId, t.status, t.priority),
}));

export const specifications = pgTable("specifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: jsonb("content").notNull(),
  status: phaseStatusEnum("status").notNull().default("draft"),
  createdBy: actorTypeEnum("created_by").notNull().default("ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  featureVersionIdx: uniqueIndex("specifications_feature_version_idx").on(t.featureId, t.version),
}));

export const clarifications = pgTable("clarifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  specificationVersion: integer("specification_version"),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredBy: actorTypeEnum("answered_by"),
  orderIndex: integer("order_index").notNull().default(0),
  status: clarificationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
}, (t) => ({
  featureStatusIdx: index("clarifications_feature_status_idx").on(t.featureId, t.status),
}));

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: jsonb("content").notNull(),
  specVersionUsed: integer("spec_version_used"),
  status: phaseStatusEnum("status").notNull().default("draft"),
  createdBy: actorTypeEnum("created_by").notNull().default("ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  featureVersionIdx: uniqueIndex("plans_feature_version_idx").on(t.featureId, t.version),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  planVersion: integer("plan_version"),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  filePaths: text("file_paths").array(),
  phase: text("phase"),
  story: text("story"),
  parallel: boolean("parallel").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  status: taskStatusEnum("status").notNull().default("pending"),
  estimatedComplexity: text("estimated_complexity"),
  createdBy: actorTypeEnum("created_by").notNull().default("ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  featureStatusOrderIdx: index("tasks_feature_status_order_idx").on(t.featureId, t.status, t.orderIndex),
  featureCodeIdx: uniqueIndex("tasks_feature_code_idx").on(t.featureId, t.code),
}));

export const taskDependencies = pgTable("task_dependencies", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: uuid("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }),
}));

export const featureDependencies = pgTable("feature_dependencies", {
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  dependsOnFeatureId: uuid("depends_on_feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.featureId, t.dependsOnFeatureId] }),
}));

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  specVersion: integer("spec_version"),
  planVersion: integer("plan_version"),
  tasksSnapshotRef: jsonb("tasks_snapshot_ref"),
  findings: jsonb("findings").notNull().default(sql`'[]'::jsonb`),
  severitySummary: jsonb("severity_summary").notNull().default(sql`'{}'::jsonb`),
  status: phaseStatusEnum("status").notNull().default("draft"),
  createdBy: actorTypeEnum("created_by").notNull().default("ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  featureVersionIdx: uniqueIndex("analyses_feature_version_idx").on(t.featureId, t.version),
}));

export const revisions = pgTable("revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: revisionEntityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  featureId: uuid("feature_id").references(() => features.id, { onDelete: "cascade" }),
  diff: jsonb("diff"),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  featureIdx: index("revisions_feature_idx").on(t.featureId),
}));

export const implementationSessions = pgTable("implementation_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  agentIdentifier: text("agent_identifier").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: sessionStatusEnum("status").notNull().default("claimed"),
  resultSummary: text("result_summary"),
}, (t) => ({
  featureStatusIdx: index("implementation_sessions_feature_status_idx").on(t.featureId, t.status),
}));

export const documentation = pgTable("documentation", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  contentMarkdown: text("content_markdown").notNull(),
  filePath: text("file_path"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  featureIdx: uniqueIndex("documentation_feature_idx").on(t.featureId),
}));

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => ({
  tokenHashIdx: uniqueIndex("tokens_token_hash_idx").on(t.tokenHash),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  constitutions: many(constitutions),
  features: many(features),
}));

export const featuresRelations = relations(features, ({ one, many }) => ({
  project: one(projects, { fields: [features.projectId], references: [projects.id] }),
  specifications: many(specifications),
  clarifications: many(clarifications),
  plans: many(plans),
  tasks: many(tasks),
  analyses: many(analyses),
  revisions: many(revisions),
  implementationSessions: many(implementationSessions),
  documentation: many(documentation),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  feature: one(features, { fields: [tasks.featureId], references: [features.id] }),
}));
