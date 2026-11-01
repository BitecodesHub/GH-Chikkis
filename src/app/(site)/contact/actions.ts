"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createEnquiry } from "@/lib/enquiries";
import { getProductBySlug } from "@/lib/products";
import { businessToday, formatDateDDMMYYYY, parseBusinessDate } from "@/lib/dates";
import { normalizePhone, waLink } from "@/lib/phone";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { verifyTurnstileToken } from "@/lib/turnstile";

export interface EnquiryFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  whatsappHref?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120, "That name is too long."),
  phone: z.string().trim().min(7, "Enter a phone number we can reach you on.").max(20, "That phone number is too long."),
  email: z
    .string()
    .trim()
    .max(200)
    .default("")
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address, or leave it blank.",
    ),
  quantityKg: z.coerce
    .number()
    .positive("Enter the quantity in kilograms.")
    .max(100000, "That quantity looks too large — please tell us directly."),
  expectedDate: z.string().trim().max(20).default(""),
  notSure: z.string().optional(),
  details: z
    .string()
    .trim()
    .max(1500, "Please keep your message under 1500 characters.")
    .default(""),
  product: z.string().trim().max(120).default(""),
  packaging: z.string().trim().max(80).default(""),
  startedAt: z.string(),
  website: z.string().max(500).optional().default(""),
  turnstileToken: z.string().max(4096).optional().default(""),
});

const FEEDBACK = {
  success:
    "Thank you — your enquiry has reached us. We will reply on the number you shared.",
  spam: "Thank you — your enquiry has reached us.",
  rate: "Too many enquiries from here in a short time. Please try again later, or message us on WhatsApp.",
  verify: "Please complete the quick verification and send your enquiry again.",
  generic: "We could not send your enquiry just now. Please try again, or message us on WhatsApp.",
};

export async function submitEnquiry(
  _previous: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const data = parsed.data;

  // Bots that fill the hidden field or submit instantly get a normal-looking
  // success without creating a record.
  if (data.website.trim() !== "") return { ok: true, message: FEEDBACK.spam };
  const started = new Date(data.startedAt).getTime();
  const elapsed = Date.now() - started;
  if (!Number.isFinite(elapsed) || elapsed < 2500 || elapsed > 2 * 60 * 60 * 1000) {
    return { ok: true, message: FEEDBACK.spam };
  }

  const normalized = normalizePhone(data.phone);
  if (!normalized) {
    return {
      ok: false,
      errors: { phone: "Enter a valid phone number, including the country code if outside India." },
    };
  }

  const notSure = data.notSure === "1";
  let expectedDate: string | null = null;
  if (!notSure) {
    if (!data.expectedDate) {
      return {
        ok: false,
        errors: { expectedDate: "Choose an expected date, or select “Not sure yet”." },
      };
    }
    const parsedDate = parseBusinessDate(data.expectedDate);
    if (!parsedDate) {
      return { ok: false, errors: { expectedDate: "Enter a valid date." } };
    }
    if (parsedDate < businessToday()) {
      return { ok: false, errors: { expectedDate: "Please choose today or a future date." } };
    }
    expectedDate = parsedDate;
  }

  const requestHeaders = await headers();
  const ip = requestIp(requestHeaders);
  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimit({ scope: "enquiry:ip", identifier: ip, limit: 8, windowSeconds: 600 }),
    rateLimit({
      scope: "enquiry:phone",
      identifier: normalized.phone,
      limit: 5,
      windowSeconds: 86400,
    }),
  ]);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    return { ok: false, message: FEEDBACK.rate };
  }

  if (!(await verifyTurnstileToken(data.turnstileToken, ip))) {
    return { ok: false, message: FEEDBACK.verify };
  }

  let notes: string | undefined;
  if (data.product) {
    const product = await getProductBySlug(data.product);
    if (product && product.active) {
      const packaging = product.packaging.find((option) => option.label === data.packaging);
      notes = `Website enquiry: ${product.name}${packaging ? ` — ${packaging.label}` : ""}`;
    }
  }
  if (data.details) {
    notes = [notes, data.details].filter(Boolean).join("\n");
  }

  try {
    await createEnquiry({
      name: data.name,
      phone: normalized.phone,
      phoneOriginal: normalized.phoneOriginal,
      email: data.email || undefined,
      quantityKg: data.quantityKg,
      expectedDate,
      notSure,
      notes,
    });
  } catch (error) {
    console.error("Enquiry submission failed", error);
    return { ok: false, message: FEEDBACK.generic };
  }

  const enquiryText = [
    `Hello GH Chikkis! Website enquiry from ${data.name.trim()}.`,
    `${data.quantityKg} kg${expectedDate ? `, needed by ${formatDateDDMMYYYY(expectedDate)}` : ", date still flexible"}`,
    data.details.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    message: `${FEEDBACK.success}${
      expectedDate ? ` Expected date: ${formatDateDDMMYYYY(expectedDate)}.` : ""
    }`,
    whatsappHref: await handoffHref(enquiryText),
  };
}

// A number is only ever read from settings, never from the visitor.
async function handoffHref(message: string): Promise<string | undefined> {
  const settings = await getSettings();
  const number = settings.business.whatsappNumber;
  return number.trim() ? waLink(number, message) : undefined;
}
