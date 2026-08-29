CREATE TYPE "public"."actor_type" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."clarification_status" AS ENUM('pending', 'answered', 'resolved_in_spec');--> statement-breakpoint
CREATE TYPE "public"."feature_status" AS ENUM('backlog', 'specifying', 'clarifying', 'planning', 'tasking', 'analyzing', 'refining', 'ready_for_implement', 'in_progress', 'done', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('draft', 'in_review', 'refined', 'ready');--> statement-breakpoint
CREATE TYPE "public"."revision_entity_type" AS ENUM('constitution', 'specification', 'clarification', 'plan', 'task', 'analysis');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('claimed', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'ready', 'in_progress', 'done', 'blocked', 'skipped');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"spec_version" integer,
	"plan_version" integer,
	"tasks_snapshot_ref" jsonb,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "phase_status" DEFAULT 'draft' NOT NULL,
	"created_by" "actor_type" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clarifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"specification_version" integer,
	"question" text NOT NULL,
	"answer" text,
	"answered_by" "actor_type",
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "clarification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "constitutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"status" "phase_status" DEFAULT 'draft' NOT NULL,
	"created_by" "actor_type" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"content_markdown" text NOT NULL,
	"file_path" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_dependencies" (
	"feature_id" uuid NOT NULL,
	"depends_on_feature_id" uuid NOT NULL,
	CONSTRAINT "feature_dependencies_feature_id_depends_on_feature_id_pk" PRIMARY KEY("feature_id","depends_on_feature_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "feature_status" DEFAULT 'backlog' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"constitution_version_used" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"agent_identifier" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "session_status" DEFAULT 'claimed' NOT NULL,
	"result_summary" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"spec_version_used" integer,
	"status" "phase_status" DEFAULT 'draft' NOT NULL,
	"created_by" "actor_type" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"repo_path" text,
	"repo_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "revision_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"feature_id" uuid,
	"diff" jsonb,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"status" "phase_status" DEFAULT 'draft' NOT NULL,
	"created_by" "actor_type" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_dependencies" (
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	CONSTRAINT "task_dependencies_task_id_depends_on_task_id_pk" PRIMARY KEY("task_id","depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"plan_version" integer,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_paths" text[],
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"estimated_complexity" text,
	"created_by" "actor_type" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyses" ADD CONSTRAINT "analyses_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "constitutions" ADD CONSTRAINT "constitutions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentation" ADD CONSTRAINT "documentation_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_depends_on_feature_id_features_id_fk" FOREIGN KEY ("depends_on_feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "features" ADD CONSTRAINT "features_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "implementation_sessions" ADD CONSTRAINT "implementation_sessions_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plans" ADD CONSTRAINT "plans_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revisions" ADD CONSTRAINT "revisions_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specifications" ADD CONSTRAINT "specifications_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analyses_feature_version_idx" ON "analyses" USING btree ("feature_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarifications_feature_status_idx" ON "clarifications" USING btree ("feature_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "constitutions_project_version_idx" ON "constitutions" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documentation_feature_idx" ON "documentation" USING btree ("feature_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "features_project_slug_idx" ON "features" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "features_status_priority_idx" ON "features" USING btree ("project_id","status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implementation_sessions_feature_status_idx" ON "implementation_sessions" USING btree ("feature_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plans_feature_version_idx" ON "plans" USING btree ("feature_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revisions_feature_idx" ON "revisions" USING btree ("feature_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "specifications_feature_version_idx" ON "specifications" USING btree ("feature_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_feature_status_order_idx" ON "tasks" USING btree ("feature_id","status","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_feature_code_idx" ON "tasks" USING btree ("feature_id","code");