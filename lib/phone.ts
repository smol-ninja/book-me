import { parsePhoneNumberFromString } from "libphonenumber-js";

export function toE164(input: string, defaultCountry: "GB" = "GB"): string | null {
  const phone = parsePhoneNumberFromString(input.trim(), defaultCountry);
  if (!phone || !phone.isValid()) return null;
  return phone.number;
}

export function formatPhoneDisplay(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  return phone ? phone.formatInternational() : e164;
}
