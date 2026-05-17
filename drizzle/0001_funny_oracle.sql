CREATE TABLE "appearance_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"accent" text DEFAULT '#d4ff3d' NOT NULL,
	"border_style" text DEFAULT 'dashed' NOT NULL,
	"grid_density" integer DEFAULT 32 NOT NULL,
	"slash_density" integer DEFAULT 7 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_profiles" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "portfolio_stats" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "portfolio_stats" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "experience_bullets" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "experience_bullets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_stack_items" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_stack_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_metrics" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_metrics" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "stack_groups" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "stack_groups" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "stack_items" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "stack_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "devlog_posts" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "devlog_posts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "integration_settings" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "integration_settings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;