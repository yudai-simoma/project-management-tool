ALTER TABLE "categories" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "categories_org_id_idx" ON "categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "projects_org_id_idx" ON "projects" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tasks_org_id_idx" ON "tasks" USING btree ("org_id");