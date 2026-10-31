import type { BusinessDate, DatePreset, DateRange } from "./types";

export const TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function businessToday(now: Date = new Date()): BusinessDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function toBusinessDate(value: Date | string): BusinessDate {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return businessToday();
  return businessToday(date);
}

export function isValidBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return isValidDateParts(year, month, day);
}

/** Accepts DD/MM/YYYY or YYYY-MM-DD. */
export function parseBusinessDate(value: string): BusinessDate | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidBusinessDate(trimmed) ? trimmed : null;
  }
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateDDMMYYYY(value: Date | string | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("day")}/${get("month")}/${get("year")}, ${get("hour")}:${get("minute")}`;
}

export function formatTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function dateRangeForPreset(
  preset: DatePreset,
  now: Date = new Date(),
  custom?: { from: string; to: string },
): DateRange {
  const today = businessToday(now);
  if (preset === "custom") {
    const from = parseBusinessDate(custom?.from ?? "") ?? today;
    const to = parseBusinessDate(custom?.to ?? "") ?? today;
    return { preset, from: from <= to ? from : to, to: from <= to ? to : from };
  }
  if (preset === "today") return { preset, from: today, to: today };
  if (preset === "7d") return { preset, from: addDays(today, -6), to: today };
  if (preset === "month") return { preset, from: `${today.slice(0, 7)}-01`, to: today };
  return { preset, from: `${today.slice(0, 4)}-01-01`, to: today };
}

const DATE_PRESETS: DatePreset[] = ["today", "7d", "month", "year", "custom"];

export function dateRangeFromParams(
  params: Record<string, string | string[] | undefined>,
): DateRange {
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const preset = DATE_PRESETS.includes(value("preset") as DatePreset)
    ? (value("preset") as DatePreset)
    : "month";
  return dateRangeForPreset(preset, new Date(), { from: value("from"), to: value("to") });
}

export function eachDay(from: BusinessDate, to: BusinessDate): BusinessDate[] {
  const days: BusinessDate[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 800) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export function businessDateStartUtc(date: BusinessDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MINUTES * 60_000);
}

export function businessDateEndUtc(date: BusinessDate): Date {
  const start = businessDateStartUtc(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function isInBusinessRange(
  value: Date | string,
  from: BusinessDate,
  to: BusinessDate,
): boolean {
  const date = toBusinessDate(value);
  return date >= from && date <= to;
}

export function monthLabel(date: BusinessDate): string {
  const [year, month] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function dayLabel(date: BusinessDate): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function rangeLabel(range: DateRange): string {
  const presetLabels: Record<Exclude<DatePreset, "custom">, string> = {
    today: "Today",
    "7d": "Last 7 days",
    month: "This month",
    year: "This year",
  };
  if (range.preset !== "custom") return presetLabels[range.preset];
  return `${formatDateDDMMYYYY(range.from)} – ${formatDateDDMMYYYY(range.to)}`;
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

export function minutesFromNow(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export function relativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateDDMMYYYY(date);
}
