INSERT INTO "integration_settings" ("key", "enabled", "metadata", "version", "created_at", "updated_at")
VALUES
	('google_calendar', true, '{}', 0, now(), now()),
	('vercel', true, '{}', 0, now(), now())
ON CONFLICT ("key") DO NOTHING;
