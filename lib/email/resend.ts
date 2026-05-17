import { Resend } from "resend";

export type EmailPayload = {
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendOwnerEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !from || !to) {
    return {
      ok: false,
      error: "Email provider is not configured.",
    };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: payload.subject,
    text: payload.text,
    replyTo: payload.replyTo,
  });

  if (result.error) {
    return {
      ok: false,
      error: result.error.message,
    };
  }

  return { ok: true, id: result.data?.id };
}

export async function sendVisitorEmail(
  to: string,
  payload: EmailPayload,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, error: "Email provider is not configured." };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: payload.subject,
    text: payload.text,
    replyTo: replyTo ?? payload.replyTo,
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  return { ok: true };
}
