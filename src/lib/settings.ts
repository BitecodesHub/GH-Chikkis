import type { AppSettings } from "./types";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { invalidateReads, primeRead, readThrough, READ_TTL } from "./read-cache";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Ingredients/raw materials",
  "Packaging",
  "Labour",
  "Transport/delivery",
  "Marketing",
  "Utilities",
  "Gifting",
  "Miscellaneous",
];

export function defaultSettings(): AppSettings {
  return {
    business: {
      name: "GH Chikkis",
      tagline: "Ghar ki Gud-crafted Chikki's",
      city: "Ahmedabad",
      state: "Gujarat",
      whatsappNumber: "",
      email: "ghchikkis@gmail.com",
      phoneDisplay: "",
      instagramUrl: "https://www.instagram.com/ghchikkis",
      googleReviewUrl: "https://g.page/r/CeJDbg29S3ZHEBM/review",
      addressLine:
        "3, Gopal Nivas, Besides Prakruti Tower, Sanjivbaug Society, Near Jainnagar, Paldi, Ahmedabad - 380007",
      mapsUrl: "https://maps.app.goo.gl/nrx4QFSfjfjV2j7aA",
      gstin: "",
    },
    security: { idleMinutes: 60 },
    whatsapp: {
      liveEnabled: false,
      paused: false,
      pauseReason: "",
      pausedAt: null,
      pausedBy: "",
      estimatedCostPerMessagePaise: 0,
      monthlySpendThresholdPaise: 0,
      alertPercent: 80,
    },
    invoice: {
      thankYou: "Thank you for choosing GH Chikkis! We truly appreciate your support.",
      footerNote: "Please retain this invoice for your records.",
    },
    reviews: { enabled: false, googlePlaceId: "" },
    expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    backup: { retentionDays: 30 },
    updatedAt: nowIso(),
    updatedBy: "system",
  };
}

async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const collection = db.collection<AppSettings & { _id: string }>("system_settings");
  const existing = await collection.findOne({ _id: "global" });
  if (existing) {
    const { _id, ...settings } = existing;
    void _id;
    const merged: AppSettings = { ...defaultSettings(), ...settings, business: { ...defaultSettings().business, ...settings.business }, security: { ...defaultSettings().security, ...settings.security }, whatsapp: { ...defaultSettings().whatsapp, ...settings.whatsapp }, invoice: { ...defaultSettings().invoice, ...settings.invoice }, reviews: { ...defaultSettings().reviews, ...settings.reviews }, backup: { ...defaultSettings().backup, ...settings.backup } };

    // Early documents were created with the contact details blank, and a blank
    // reads as "hidden" to the footer. Fill what the Owner has since given us,
    // once, so the stored record becomes editable instead of overridden.
    const fills: Array<keyof AppSettings["business"]> = [
      "instagramUrl",
      "addressLine",
      "mapsUrl",
    ];
    for (const field of fills) {
      const wanted = defaultSettings().business[field];
      if (merged.business[field].trim()) continue;
      await collection.updateOne({ _id: "global" }, { $set: { [`business.${field}`]: wanted } });
      merged.business[field] = wanted;
    }

    return merged;
  }
  const defaults = defaultSettings();
  await collection.updateOne(
    { _id: "global" },
    { $setOnInsert: { _id: "global", ...defaults } },
    { upsert: true },
  );
  return defaults;
}

/**
 * Header, footer, WhatsApp links and the reviews band all want the same
 * document, so an uncached read costs three round trips on one page render.
 */
export function getSettings(): Promise<AppSettings> {
  return readThrough("settings", READ_TTL.content, loadSettings);
}

export interface SettingsPatch {
  business?: Partial<AppSettings["business"]>;
  security?: Partial<AppSettings["security"]>;
  whatsapp?: Partial<AppSettings["whatsapp"]>;
  invoice?: Partial<AppSettings["invoice"]>;
  reviews?: Partial<AppSettings["reviews"]>;
  expenseCategories?: string[];
  backup?: Partial<AppSettings["backup"]>;
}

export async function updateSettings(
  patch: SettingsPatch,
  actor: string,
): Promise<AppSettings> {
  const db = await getDb();
  const collection = db.collection<AppSettings & { _id: string }>("system_settings");
  const set: Record<string, unknown> = {
    updatedAt: nowIso(),
    updatedBy: actor,
  };
  for (const [section, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (section === "expenseCategories") {
      set.expenseCategories = value;
      continue;
    }
    if (section === "backup") {
      for (const [key, field] of Object.entries(value)) {
        set[`backup.${key}`] = field;
      }
      continue;
    }
    for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
      set[`${section}.${key}`] = field;
    }
  }
  await collection.updateOne(
    { _id: "global" },
    {
      $set: set,
      $setOnInsert: { _id: "global" },
    },
    { upsert: true },
  );
  invalidateReads("settings");
  return primeRead("settings", READ_TTL.content, await loadSettings());
}

export async function pauseWhatsApp(
  reason: string,
  actorEmail: string,
): Promise<void> {
  await updateSettings(
    {
      whatsapp: {
        paused: true,
        pauseReason: reason.slice(0, 500),
        pausedAt: nowIso(),
        pausedBy: actorEmail,
      },
    },
    actorEmail,
  );
}

export async function resumeWhatsApp(actorEmail: string): Promise<void> {
  await updateSettings(
    {
      whatsapp: {
        paused: false,
        pauseReason: "",
        pausedAt: null,
        pausedBy: actorEmail,
      },
    },
    actorEmail,
  );
}

export function publicBusiness(
  settings: AppSettings,
): AppSettings["business"] {
  return settings.business;
}
