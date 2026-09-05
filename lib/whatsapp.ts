import twilio from "twilio";
import { formatRange } from "@/lib/slots";

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

function e164(to: string): string {
  return to.replace(/^whatsapp:/, "");
}

async function sendSms(
  to: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> {
  const from = process.env.TWILIO_SMS_FROM;
  const client = createTwilioClient();
  if (!from || !client) {
    return { sent: false, error: "not_configured" };
  }

  try {
    await client.messages.create({
      from,
      to: e164(to),
      body,
    });
    return { sent: true };
  } catch (error) {
    console.error("Twilio SMS send failed", error);
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
  return sendSms(input.creatorPhone, calendarCreatedWhatsAppBody(input));
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
    sendSms(input.creatorPhone, creatorBody),
    sendSms(input.guestPhone, guestBody),
  ]);
  if (creator.sent && guest.sent) {
    return { sent: true };
  }
  return {
    sent: false,
    error: creator.error ?? guest.error ?? "send_failed",
  };
}
