CREATE TABLE IF NOT EXISTS "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "phase" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "story" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parallel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tokens_token_hash_idx" ON "tokens" USING btree ("token_hash");