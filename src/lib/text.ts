export function cleanText(value: unknown, maxLength = 5000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function cleanSingleLine(value: unknown, maxLength = 500): string {
  return cleanText(value, maxLength).replace(/\s+/g, " ").trim();
}

export function splitParagraphs(value: unknown, maxParagraphs = 40): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => cleanText(paragraph, 4000))
    .filter(Boolean)
    .slice(0, maxParagraphs);
}

export function paragraphsToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n\n");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "GH";
}

export function truncate(value: string, max = 90): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function safeFilename(value: string): string {
  return value
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 120);
}

export function toLines(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => cleanText(line, 500))
    .filter(Boolean);
}

export function countWords(value: string): number {
  return value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
}
