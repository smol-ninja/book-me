import twilio from "twilio";
import { formatRange } from "@/lib/slots";

function whatsappAddress(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}

function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret =
    process.env.TWILIO_API_SECRET ?? process.env.TWILIO_AUTH_TOKEN;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid?.startsWith("AC") && authToken) {
    return twilio(accountSid, authToken);
  }
  if (accountSid?.startsWith("AC") && apiKey?.startsWith("SK") && apiSecret) {
    return twilio(apiKey, apiSecret, { accountSid });
  }
  return null;
}

async function sendWhatsApp(
  to: string,
  input: {
    body: string;
    contentSid?: string;
    contentVariables?: Record<string, string>;
  },
): Promise<{ sent: boolean; error?: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const client = createTwilioClient();
  if (!from || !client) {
    return { sent: false, error: "not_configured" };
  }

  try {
    const contentSid = input.contentSid?.trim();
    await client.messages.create(
      contentSid
        ? {
            from,
            to: whatsappAddress(to),
            contentSid,
            contentVariables: JSON.stringify(input.contentVariables ?? {}),
          }
        : {
            from,
            to: whatsappAddress(to),
            body: input.body,
          },
    );
    return { sent: true };
  } catch (error) {
    console.error("Twilio WhatsApp send failed", error);
    return { sent: false, error: "send_failed" };
  }
}

export function calendarCreatedWhatsAppBody(input: {
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
  creatorPhone: string;
  username: string;
  publicUrl: string;
  editUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  return sendWhatsApp(input.creatorPhone, {
    body: calendarCreatedWhatsAppBody(input),
    contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_CALENDAR,
    contentVariables: {
      "1": input.username,
      "2": input.publicUrl,
      "3": input.editUrl,
    },
  });
}

export async function notifyBooking(input: {
  creatorPhone: string;
  creatorName: string;
  guestName: string;
  guestPhone: string;
  itemName: string;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  username: string;
}): Promise<{ sent: boolean; error?: string }> {
  const when = formatRange(input.startsAt, input.endsAt, input.timezone);
  const item = `${input.itemName} (${input.durationMinutes} min)`;
  const guestBody = [
    "You're booked.",
    `Item: ${item}`,
    `When: ${when}`,
    `Host: ${input.creatorName}`,
  ].join("\n");
  const creatorBody = [
    `New booking on /${input.username}`,
    `Guest: ${input.guestName}`,
    `Phone: ${input.guestPhone}`,
    `Item: ${item}`,
    `When: ${when}`,
  ].join("\n");

  const [creator, guest] = await Promise.all([
    sendWhatsApp(input.creatorPhone, {
      body: creatorBody,
      contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_BOOKING_HOST,
      contentVariables: {
        "1": input.username,
        "2": input.guestName,
        "3": input.guestPhone,
        "4": item,
        "5": when,
      },
    }),
    sendWhatsApp(input.guestPhone, {
      body: guestBody,
      contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_BOOKING_GUEST,
      contentVariables: {
        "1": item,
        "2": input.creatorName,
        "3": when,
      },
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
