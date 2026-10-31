import { getSessionContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { dateRangeForPreset, rangeLabel } from "@/lib/dates";
import { getReportData } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { buildReportCsv, buildReportExcel } from "@/lib/report-exports";
import { buildReportPdf } from "@/lib/report-pdf";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { safeFilename } from "@/lib/text";
import type { DatePreset } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESETS: DatePreset[] = ["today", "7d", "month", "year", "custom"];
const FORMATS = ["csv", "excel", "pdf"] as const;
type ExportFormat = (typeof FORMATS)[number];

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
const EXTENSION: Record<ExportFormat, string> = { csv: "csv", excel: "xlsx", pdf: "pdf" };

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context) {
    return Response.json({ error: "Sign in again." }, { status: 401 });
  }
  if (!hasPermission(context.user, "exports.run")) {
    return Response.json(
      { error: "You do not have permission to export data." },
      { status: 403 },
    );
  }
  const limit = await rateLimit({
    scope: "report-export",
    identifier: context.user.id,
    limit: 20,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: `Too many exports. Try again in ${limit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send an export request in JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send an export request in JSON." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const format = FORMATS.includes(input.format as ExportFormat)
    ? (input.format as ExportFormat)
    : null;
  if (!format) {
    return Response.json({ error: "Choose CSV, Excel or PDF." }, { status: 400 });
  }
  const preset = PRESETS.includes(input.preset as DatePreset)
    ? (input.preset as DatePreset)
    : "month";
  const range = dateRangeForPreset(preset, new Date(), {
    from: typeof input.from === "string" ? input.from : "",
    to: typeof input.to === "string" ? input.to : "",
  });

  const [data, settings] = await Promise.all([getReportData(range), getSettings()]);
  const businessName = settings.business.name || "GH Chikkis";

  let bytes: Uint8Array;
  if (format === "csv") {
    bytes = new TextEncoder().encode(buildReportCsv(data, businessName));
  } else if (format === "excel") {
    bytes = new Uint8Array(await buildReportExcel(data, businessName));
  } else {
    bytes = await buildReportPdf(data, businessName);
  }

  await recordAudit({
    actor: context.user,
    action: "report.export",
    entityType: "report",
    entityId: `${format}:${range.from}:${range.to}`,
    summary: `Exported ${format.toUpperCase()} management report for ${rangeLabel(range)}`,
  });

  const filename = safeFilename(
    `${businessName}-report-${range.from}-to-${range.to}.${EXTENSION[format]}`,
  );
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
