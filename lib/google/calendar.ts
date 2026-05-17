import { google } from "googleapis";

export function isCalendarEnabled(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_ENABLED === "true" &&
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 &&
    process.env.GOOGLE_CALENDAR_ID
  );
}

function getCalendarClient() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!;
  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function createCalendarEvent(opts: {
  title: string;
  who: string;
  start: Date;
  end: Date;
  notes: string;
}): Promise<{ eventId: string; meetLink: string | null }> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const cal = getCalendarClient();

  const res = await cal.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: opts.title,
      description: [opts.who && `With: ${opts.who}`, opts.notes]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: opts.start.toISOString() },
      end: { dateTime: opts.end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const event = res.data;
  const meetLink =
    event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")
      ?.uri ?? null;

  return { eventId: event.id!, meetLink };
}

export async function cancelCalendarEvent(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const cal = getCalendarClient();
  await cal.events.delete({ calendarId, eventId });
}
