export interface NormalizedPhone {
  phone: string;
  phoneOriginal: string;
}

/** Digits only, India assumed for 10-digit numbers. */
export function normalizePhone(input: string): NormalizedPhone | null {
  const original = input.trim();
  let digits = original.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  if (!/^\d+$/.test(digits)) return null;
  return { phone: digits, phoneOriginal: original };
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function whatsappMessageForProduct(
  productName: string,
  packagingLabel?: string | null,
): string {
  if (packagingLabel) {
    return `Hello GH Chikkis! I'm interested in ${productName} — ${packagingLabel}. Could you please share availability and pricing?`;
  }
  return `Hello GH Chikkis! I'm interested in ${productName}. Could you share the available sizes and pricing?`;
}

export const WHATSAPP_GENERAL_MESSAGE =
  "Hello GH Chikkis! I'd like to enquire about your chikki.";

export const WHATSAPP_BULK_MESSAGE =
  "Hello GH Chikkis! I'd like to enquire about a bulk or corporate gifting order.";
