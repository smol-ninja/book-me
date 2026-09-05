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

  if (accountSid?.startsWith("AC") && apiKey?.startsWith("SK") && apiSecret) {
    return twilio(apiKey, apiSecret, { accountSid });
  }
  if (accountSid?.startsWith("AC") && authToken) {
    return twilio(accountSid, authToken);
  }
  return null;
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
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const client = createTwilioClient();
  if (!from || !client) {
    return { sent: false, error: "not_configured" };
  }

  const when = formatRange(input.startsAt, input.endsAt, input.timezone);
  const guestBody = [
    "You're booked.",
    `Item: ${input.itemName} (${input.durationMinutes} min)`,
    `When: ${when}`,
    `Host: ${input.creatorName}`,
  ].join("\n");
  const creatorBody = [
    `New booking on /${input.username}`,
    `Guest: ${input.guestName}`,
    `Phone: ${input.guestPhone}`,
    `Item: ${input.itemName} (${input.durationMinutes} min)`,
    `When: ${when}`,
  ].join("\n");

  try {
    await Promise.all([
      client.messages.create({
        from,
        to: whatsappAddress(input.creatorPhone),
        body: creatorBody,
      }),
      client.messages.create({
        from,
        to: whatsappAddress(input.guestPhone),
        body: guestBody,
      }),
    ]);
    return { sent: true };
  } catch (error) {
    console.error("Twilio WhatsApp send failed", error);
    return { sent: false, error: "send_failed" };
  }
}
