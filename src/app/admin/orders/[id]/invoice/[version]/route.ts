import { getSessionContext } from "@/lib/auth/session";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceVersion, getOrder } from "@/lib/orders";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const context = await getSessionContext();
  if (!context) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(context.user, "orders.view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id, version } = await params;
  const versionNumber = Number(version);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return new Response("Invoice not found", { status: 404 });
  }

  const order = await getOrder(id);
  if (!order || order.type !== "SALES" || !order.invoice) {
    return new Response("Invoice not found", { status: 404 });
  }
  if (versionNumber > order.invoice.version) {
    return new Response("Invoice not found", { status: 404 });
  }

  const stored = await getInvoiceVersion(id, versionNumber);
  const snapshot =
    stored?.snapshot ??
    (order.invoice.version === versionNumber ? order.invoice.snapshot : null);
  if (!snapshot) {
    return new Response("Invoice not found", { status: 404 });
  }

  const pdf = await renderInvoicePdf(snapshot);
  const body = pdf.buffer.slice(
    pdf.byteOffset,
    pdf.byteOffset + pdf.byteLength,
  ) as ArrayBuffer;
  const filename = `GH-Chikkis-${order.ref}-v${versionNumber}.pdf`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
