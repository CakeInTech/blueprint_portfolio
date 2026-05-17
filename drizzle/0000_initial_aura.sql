CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "role" text DEFAULT 'owner' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY("provider", "provider_account_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "authenticators" (
  "credential_id" text NOT NULL UNIQUE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider_account_id" text NOT NULL,
  "credential_public_key" text NOT NULL,
  "counter" integer NOT NULL,
  "credential_device_type" text NOT NULL,
  "credential_backed_up" boolean NOT NULL,
  "transports" text,
  PRIMARY KEY("user_id", "credential_id")
);

CREATE TABLE IF NOT EXISTS "portfolio_profiles" (
  "id" text DEFAULT 'main' PRIMARY KEY NOT NULL,
  "handle" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "tagline" text NOT NULL,
  "location" text NOT NULL,
  "timezone" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "linkedin" text,
  "github" text,
  "available" boolean DEFAULT true NOT NULL,
  "years_exp" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "portfolio_stats" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "experiences" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "company" text NOT NULL,
  "location" text NOT NULL,
  "role" text NOT NULL,
  "start" text NOT NULL,
  "end" text NOT NULL,
  "current" boolean DEFAULT false NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "experience_bullets" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "size" text NOT NULL,
  "year" text NOT NULL,
  "tag" text,
  "color" text,
  "blurb" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_stack_items" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_metrics" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "value" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "stack_groups" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "stack_items" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "stack_groups"("id") ON DELETE cascade,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "devlog_posts" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "date" text NOT NULL,
  "title" text NOT NULL,
  "kind" text NOT NULL,
  "read" text NOT NULL,
  "excerpt" text NOT NULL,
  "published" boolean DEFAULT true NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "contact_inquiries" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "message" text NOT NULL,
  "source" text DEFAULT 'contact' NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "email_status" text DEFAULT 'pending' NOT NULL,
  "fingerprint" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "contact_inquiries_fingerprint_idx"
  ON "contact_inquiries" ("fingerprint");

CREATE TABLE IF NOT EXISTS "booking_requests" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "requested_day" text NOT NULL,
  "requested_time" text NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'hold_requested' NOT NULL,
  "email_status" text DEFAULT 'pending' NOT NULL,
  "fingerprint" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "booking_requests_fingerprint_idx"
  ON "booking_requests" ("fingerprint");

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "status" text DEFAULT 'subscribed' NOT NULL,
  "email_status" text DEFAULT 'pending' NOT NULL,
  "fingerprint" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_idx"
  ON "newsletter_subscribers" ("email");

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "actor_email" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "integration_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
