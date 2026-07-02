CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"primary_domain" text DEFAULT 'cakeintech.com' NOT NULL,
	"aliases" text DEFAULT '' NOT NULL,
	"availability" jsonb,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_profiles" ADD COLUMN IF NOT EXISTS "resume_url" text;--> statement-breakpoint
ALTER TABLE "portfolio_profiles" ADD COLUMN IF NOT EXISTS "resume_updated_at" timestamp;
