CREATE TYPE "public"."task_level" AS ENUM('large', 'medium', 'small');--> statement-breakpoint
ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_category_id_categories_id_fk";
--> statement-breakpoint
DROP TABLE "categories" CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "level" "task_level" DEFAULT 'small' NOT NULL;--> statement-breakpoint
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "category_id";
