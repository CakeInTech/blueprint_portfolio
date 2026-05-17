ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "gcal_event_id" text,
  ADD COLUMN IF NOT EXISTS "gcal_meet_link" text,
  ADD COLUMN IF NOT EXISTS "booking_request_id" uuid;

ALTER TABLE "booking_requests"
  ADD COLUMN IF NOT EXISTS "confirmed_meeting_id" uuid,
  ADD COLUMN IF NOT EXISTS "gcal_meet_link" text;
