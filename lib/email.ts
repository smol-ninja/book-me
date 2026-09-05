import { buildBookingIcs } from "@/lib/ics";
import { formatRange } from "@/lib/slots";

function twilioBasicAuth(): string | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET ?? authToken;

  if (accountSid?.startsWith("AC") && authToken) {
    return Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  }
  if (accountSid?.startsWith("AC") && apiKey?.startsWith("SK") && apiSecret) {
    return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^https?:\/\//.test(trimmed)) {
        const href = escapeHtml(trimmed);
        return `<p><a href="${href}">${href}</a></p>`;
      }
      if (!trimmed) return "<p></p>";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

export function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length < 3 || value.length > 120) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

type EmailAttachment = {
  filename: string;
  contentType: string;
  content: string;
};

async function sendEmail(input: {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}): Promise<{ sent: boolean; error?: string }> {
  const from = process.env.TWILIO_EMAIL_FROM?.trim();
  const fromName = process.env.TWILIO_EMAIL_FROM_NAME?.trim() || "Book-me";
  const auth = twilioBasicAuth();
  if (!from || !auth) {
    return { sent: false, error: "not_configured" };
  }

  const attachments = input.attachments?.length
    ? input.attachments.map((file) => ({
        filename: file.filename,
        contentType: file.contentType,
        content: Buffer.from(file.content, "utf8").toString("base64"),
      }))
    : undefined;

  try {
    const response = await fetch("https://comms.twilio.com/v1/Emails", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: from, name: fromName },
        to: [{ address: input.to, name: input.toName || undefined }],
        content: {
          subject: input.subject,
          text: input.text,
          html: textToHtml(input.text),
          attachments,
        },
      }),
    });
    if (response.status !== 202) {
      const detail = await response.text();
      console.error("Twilio Email send failed", response.status, detail);
      return { sent: false, error: "send_failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Twilio Email send failed", error);
    return { sent: false, error: "send_failed" };
  }
}

export function calendarCreatedEmailBody(input: {
  username: string;
  publicUrl: string;
  editUrl: string;
}): string {
  return [
    `Your Book-me calendar /${input.username} is live.`,
    "",
    "Public (share with guests):",
    input.publicUrl,
    "",
    "Edit (keep this private):",
    input.editUrl,
  ].join("\n");
}

export async function notifyCalendarCreated(input: {
  creatorEmail: string;
  username: string;
  publicUrl: string;
  editUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!input.creatorEmail) {
    return { sent: false, error: "not_configured" };
  }
  return sendEmail({
    to: input.creatorEmail,
    subject: `/${input.username} is live on Book-me`,
    text: calendarCreatedEmailBody(input),
  });
}

export async function notifyBooking(input: {
  bookingId: string;
  creatorEmail: string;
  creatorName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  itemName: string;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  username: string;
  publicUrl?: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!input.creatorEmail || !input.guestEmail) {
    return { sent: false, error: "not_configured" };
  }
  const when = formatRange(input.startsAt, input.endsAt, input.timezone);
  const item = `${input.itemName} (${input.durationMinutes} min)`;
  const inviteNote =
    "Open the attached invite.ics to add this to your calendar.";
  const guestBody = [
    "You're booked.",
    `Item: ${item}`,
    `When: ${when}`,
    `Host: ${input.creatorName}`,
    "",
    inviteNote,
  ].join("\n");
  const creatorBody = [
    `New booking on /${input.username}`,
    `Guest: ${input.guestName}`,
    `Email: ${input.guestEmail}`,
    `Phone: ${input.guestPhone}`,
    `Item: ${item}`,
    `When: ${when}`,
    "",
    inviteNote,
  ].join("\n");
  const attachments: EmailAttachment[] = [
    {
      filename: "invite.ics",
      contentType: "text/calendar",
      content: buildBookingIcs(input),
    },
  ];

  const [creator, guest] = await Promise.all([
    sendEmail({
      to: input.creatorEmail,
      toName: input.creatorName,
      subject: `New booking on /${input.username}`,
      text: creatorBody,
      attachments,
    }),
    sendEmail({
      to: input.guestEmail,
      toName: input.guestName,
      subject: `You're booked with ${input.creatorName}`,
      text: guestBody,
      attachments,
    }),
  ]);
  if (creator.sent && guest.sent) {
    return { sent: true };
  }
  return {
    sent: false,
    error: creator.error ?? guest.error ?? "send_failed",
  };
}
