CREATE TABLE "about_currently_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"about_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_about" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"head_code" text NOT NULL,
	"head_label" text NOT NULL,
	"head_title" text NOT NULL,
	"paragraph_1" text NOT NULL,
	"paragraph_2_prefix" text NOT NULL,
	"paragraph_2_highlight" text NOT NULL,
	"paragraph_2_mid" text NOT NULL,
	"paragraph_2_emphasis" text NOT NULL,
	"paragraph_2_suffix" text NOT NULL,
	"paragraph_3" text NOT NULL,
	"frame_label" text NOT NULL,
	"frame_spec" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "about_currently_items" ADD CONSTRAINT "about_currently_items_about_id_portfolio_about_id_fk" FOREIGN KEY ("about_id") REFERENCES "public"."portfolio_about"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "portfolio_about" (
	"id",
	"head_code",
	"head_label",
	"head_title",
	"paragraph_1",
	"paragraph_2_prefix",
	"paragraph_2_highlight",
	"paragraph_2_mid",
	"paragraph_2_emphasis",
	"paragraph_2_suffix",
	"paragraph_3",
	"frame_label",
	"frame_spec",
	"version",
	"created_at",
	"updated_at"
) VALUES (
	'main',
	'00.A',
	'ABOUT — STORY',
	'Born offline. Built for it.',
	$abp1$I grew up where the internet flickered. Where the booking-system reboot mid-checkout loses a guest, where the bus that comes home doesn't always come home. The software I write is shaped by that.$abp1$,
	$abp2a$Three years in, I ship $abp2a$,
	$abp2b$offline-first SaaS$abp2b$,
	$abp2c$ across hotels, schools and clinics — desktop, mobile and web, syncing when the wind blows the right direction. Stacks: $abp2c$,
	$abp2d$Next.js, TypeScript, Flutter, Supabase, Postgres$abp2d$,
	$abp2e$. Methods: small teams, real users, real signal.$abp2e$,
	$abp3$I read schematics for fun. This site is one. Every section is a sheet, every component an annotated part.$abp3$,
	'CURRENTLY',
	'2026 / Q2',
	0,
	now(),
	now()
);
--> statement-breakpoint
INSERT INTO "about_currently_items" ("about_id", "title", "description", "sort_order", "version", "updated_at") VALUES
	('main', 'BREVISWORK', 'Dental clinic ↔ professional matching', 0, 0, now()),
	('main', 'DAAD', 'School bus QR tracking, parent push', 1, 0, now()),
	('main', 'ELUUL · LUUL HMS', 'Offline-first hotel mgmt, Flutter', 2, 0, now()),
	('main', 'READING', 'Designing Data-Intensive Apps', 3, 0, now()),
	('main', 'LISTENING', 'Khruangbin — A LA SALA', 4, 0, now());