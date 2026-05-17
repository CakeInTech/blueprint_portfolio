CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"who" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'CLIENT' NOT NULL,
	"status" text DEFAULT 'Confirmed' NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
