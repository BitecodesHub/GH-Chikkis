import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { formatDateDDMMYYYY } from "./dates";
import { formatINR } from "./money";
import { loadFontBytes } from "./pdf-fonts";
import type { DeliveryMethod, InvoiceSnapshot, OrderItem } from "./types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 96;

const COLORS: Record<string, RGB> = {
  ink: hex("#221d16"),
  soft: hex("#57503f"),
  muted: hex("#6b6353"),
  olive: hex("#46512f"),
  oliveDeep: hex("#2b3320"),
  brass: hex("#8a6a2f"),
  terracottaSoft: hex("#b85c34"),
  line: hex("#d9cdb4"),
  paper: hex("#f6f1e6"),
  paperDeep: hex("#ece2cd"),
};

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  HOME_COLLECTION: "Home collection",
  PORTER: "Porter",
  COURIER: "Courier",
  OTHER: "Other",
};

function hex(value: string): RGB {
  const clean = value.replace("#", "");
  return rgb(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  );
}

function formatGrams(grams: number): string {
  if (grams >= 1000 && grams % 100 === 0) {
    return `${(grams / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
  }
  return `${grams.toLocaleString("en-IN")} g`;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}

interface RenderContext {
  doc: PDFDocument;
  regular: PDFFont;
  semibold: PDFFont;
  snapshot: InvoiceSnapshot;
  pages: PDFPage[];
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  options: {
    font: PDFFont;
    size: number;
    color?: RGB;
  },
): void {
  page.drawText(value.replace(/[\u0000-\u0008\u000b-\u001f]/g, ""), {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color ?? COLORS.ink,
  });
}

function textRight(
  page: PDFPage,
  value: string,
  right: number,
  y: number,
  options: { font: PDFFont; size: number; color?: RGB },
): void {
  const width = options.font.widthOfTextAtSize(value, options.size);
  text(page, value, right - width, y, options);
}

function drawWordmark(page: PDFPage, context: RenderContext, compact: boolean): number {
  const { snapshot, regular, semibold } = context;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 6,
    width: PAGE_WIDTH,
    height: 6,
    color: COLORS.oliveDeep,
  });

  let y = PAGE_HEIGHT - 58;
  text(page, snapshot.business.name.toUpperCase(), MARGIN, y, {
    font: semibold,
    size: compact ? 14 : 19,
    color: COLORS.oliveDeep,
  });
  if (compact) {
    textRight(page, `Invoice ${snapshot.ref} · continued`, PAGE_WIDTH - MARGIN, y + 1, {
      font: regular,
      size: 8.5,
      color: COLORS.muted,
    });
    return y - 24;
  }

  y -= 13;
  text(page, "HANDMADE CHIKKIS · SMALL BATCH", MARGIN, y, {
    font: regular,
    size: 7.2,
    color: COLORS.brass,
  });
  y -= 12;
  text(page, snapshot.business.addressLine, MARGIN, y, {
    font: regular,
    size: 8,
    color: COLORS.muted,
  });
  y -= 11;
  const contact = [snapshot.business.phone, snapshot.business.email]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) {
    text(page, contact, MARGIN, y, {
      font: regular,
      size: 8,
      color: COLORS.muted,
    });
  }

  textRight(page, "INVOICE", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 58, {
    font: semibold,
    size: 9,
    color: COLORS.brass,
  });
  textRight(page, snapshot.ref, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 78, {
    font: semibold,
    size: 16,
    color: COLORS.ink,
  });
  textRight(page, `Date  ${formatDateDDMMYYYY(snapshot.invoiceDate)}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 93, {
    font: regular,
    size: 8.5,
    color: COLORS.soft,
  });
  if (snapshot.version > 1) {
    textRight(page, `Invoice version ${snapshot.version}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 105, {
      font: regular,
      size: 7.5,
      color: COLORS.muted,
    });
  }

  const ruleY = PAGE_HEIGHT - 124;
  page.drawRectangle({
    x: MARGIN,
    y: ruleY,
    width: CONTENT_WIDTH,
    height: 1,
    color: COLORS.brass,
  });

  let blockY = ruleY - 24;
  text(page, "BILLED TO", MARGIN, blockY, {
    font: semibold,
    size: 7.2,
    color: COLORS.brass,
  });
  blockY -= 16;
  text(page, snapshot.customer.name, MARGIN, blockY, {
    font: semibold,
    size: 11,
    color: COLORS.ink,
  });
  blockY -= 13;
  text(page, snapshot.customer.phone, MARGIN, blockY, {
    font: regular,
    size: 8.5,
    color: COLORS.soft,
  });
  if (snapshot.customer.email) {
    blockY -= 11;
    text(page, snapshot.customer.email, MARGIN, blockY, {
      font: regular,
      size: 8.5,
      color: COLORS.soft,
    });
  }

  return Math.min(blockY, ruleY - 74) - 18;
}

function drawTableHeader(page: PDFPage, context: RenderContext, y: number): number {
  const { semibold } = context;
  const height = 20;
  page.drawRectangle({
    x: MARGIN,
    y: y - height,
    width: CONTENT_WIDTH,
    height,
    color: COLORS.paperDeep,
  });
  const baseline = y - 13.5;
  text(page, "ITEM", MARGIN + 8, baseline, {
    font: semibold,
    size: 7.2,
    color: COLORS.oliveDeep,
  });
  textRight(page, "QTY", 409, baseline, {
    font: semibold,
    size: 7.2,
    color: COLORS.oliveDeep,
  });
  textRight(page, "RATE / G", 470, baseline, {
    font: semibold,
    size: 7.2,
    color: COLORS.oliveDeep,
  });
  textRight(page, "AMOUNT", PAGE_WIDTH - MARGIN - 8, baseline, {
    font: semibold,
    size: 7.2,
    color: COLORS.oliveDeep,
  });
  return y - height;
}

function itemDetail(item: OrderItem): string {
  if (item.imported) return item.packagingLabel;
  // A label like "250 g" already carries the weight; printing the weighed grams
  // again reads "250 g · 250 g each" on the invoice the customer keeps.
  if (item.packagingLabel.includes(String(item.actualWeightGrams))) return item.packagingLabel;
  const basis = item.weightBasis === "PER_UNIT" ? "each" : "total";
  return `${item.packagingLabel} · ${formatGrams(item.actualWeightGrams)} ${basis}`;
}

function drawItemRow(
  page: PDFPage,
  context: RenderContext,
  item: OrderItem,
  y: number,
): number {
  const { regular, semibold } = context;
  const detail = itemDetail(item);
  const notes = item.notes ? wrapText(item.notes, regular, 7.8, 290) : [];
  const nameLines = wrapText(item.productName, semibold, 9.5, 290);
  const adjustment = item.adjustmentPaise !== 0;

  const height =
    10 + nameLines.length * 12 + 11 + notes.length * 9.5 + (adjustment ? 9.5 : 0) + 8;

  let baseline = y - 14;
  for (const line of nameLines) {
    text(page, line, MARGIN + 8, baseline, {
      font: semibold,
      size: 9.5,
      color: COLORS.ink,
    });
    baseline -= 12;
  }
  text(page, detail, MARGIN + 8, baseline, {
    font: regular,
    size: 8,
    color: COLORS.muted,
  });
  baseline -= 11;
  for (const line of notes) {
    text(page, line, MARGIN + 8, baseline, {
      font: regular,
      size: 7.8,
      color: COLORS.muted,
    });
    baseline -= 9.5;
  }
  if (adjustment) {
    const sign = item.adjustmentPaise > 0 ? "+" : "-";
    text(page, `Adjustment ${sign}${formatINR(Math.abs(item.adjustmentPaise))}`, MARGIN + 8, baseline, {
      font: regular,
      size: 7.8,
      color: COLORS.terracottaSoft,
    });
    baseline -= 9.5;
  }

  const rowTop = y - 14;
  textRight(page, item.quantityLabel ?? String(item.quantity), 409, rowTop, {
    font: regular,
    size: 9,
    color: COLORS.ink,
  });
  textRight(
    page,
    item.imported ? "—" : `${formatINR(item.ratePerGramPaise, { alwaysPaise: true })}/g`,
    470,
    rowTop,
    {
      font: regular,
      size: 9,
      color: COLORS.ink,
    },
  );
  textRight(page, formatINR(item.lineTotalPaise), PAGE_WIDTH - MARGIN - 8, rowTop, {
    font: semibold,
    size: 9,
    color: COLORS.ink,
  });

  page.drawRectangle({
    x: MARGIN,
    y: y - height,
    width: CONTENT_WIDTH,
    height: 0.6,
    color: COLORS.line,
  });

  return y - height;
}

function drawTotals(
  page: PDFPage,
  context: RenderContext,
  y: number,
): number {
  const { snapshot, regular, semibold } = context;
  const right = PAGE_WIDTH - MARGIN;
  const boxLeft = 340;
  const boxWidth = right - boxLeft;

  let cursor = y - 18;
  text(page, "Subtotal", boxLeft + 8, cursor, {
    font: regular,
    size: 8.5,
    color: COLORS.soft,
  });
  textRight(page, formatINR(snapshot.subtotalPaise), right - 8, cursor, {
    font: regular,
    size: 8.5,
    color: COLORS.soft,
  });
  cursor -= 16;
  if (snapshot.deliveryChargePaise > 0) {
    text(page, "Delivery", boxLeft + 8, cursor, {
      font: regular,
      size: 8.5,
      color: COLORS.soft,
    });
    textRight(page, formatINR(snapshot.deliveryChargePaise), right - 8, cursor, {
      font: regular,
      size: 8.5,
      color: COLORS.soft,
    });
    cursor -= 16;
  }

  const totalTop = cursor + 8;
  const bandHeight = 30;
  page.drawRectangle({
    x: boxLeft,
    y: totalTop - bandHeight,
    width: boxWidth,
    height: bandHeight,
    color: COLORS.oliveDeep,
  });
  text(page, "TOTAL", boxLeft + 10, totalTop - 19, {
    font: semibold,
    size: 8,
    color: COLORS.paper,
  });
  textRight(page, formatINR(snapshot.totalPaise), right - 10, totalTop - 20, {
    font: semibold,
    size: 12,
    color: COLORS.paper,
  });
  return totalTop - bandHeight;
}

function drawClosing(
  page: PDFPage,
  context: RenderContext,
  y: number,
): void {
  const { snapshot, regular } = context;
  let cursor = y - 28;
  if (snapshot.thankYou) {
    const lines = wrapText(snapshot.thankYou, regular, 9.5, 380);
    for (const line of lines) {
      const width = regular.widthOfTextAtSize(line, 9.5);
      text(page, line, (PAGE_WIDTH - width) / 2, cursor, {
        font: regular,
        size: 9.5,
        color: COLORS.oliveDeep,
      });
      cursor -= 14;
    }
    cursor -= 4;
  }
  if (snapshot.footerNote) {
    const lines = wrapText(snapshot.footerNote, regular, 8, 380);
    for (const line of lines) {
      const width = regular.widthOfTextAtSize(line, 8);
      text(page, line, (PAGE_WIDTH - width) / 2, cursor, {
        font: regular,
        size: 8,
        color: COLORS.muted,
      });
      cursor -= 11;
    }
  }
  cursor -= 16;
  page.drawRectangle({
    x: MARGIN,
    y: cursor,
    width: 36,
    height: 1.2,
    color: COLORS.brass,
  });
  cursor -= 14;
  const address = [
    snapshot.business.addressLine,
    snapshot.business.city,
    snapshot.business.state,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  if (address) {
    text(page, address, MARGIN, cursor, {
      font: regular,
      size: 8,
      color: COLORS.soft,
    });
  }
  cursor -= 11;
  const contact = [
    snapshot.business.phone,
    snapshot.business.email,
    snapshot.business.whatsappNumber ? `WhatsApp ${snapshot.business.whatsappNumber}` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  text(page, contact, MARGIN, cursor, {
    font: regular,
    size: 8,
    color: COLORS.soft,
  });
}

function drawFooters(pages: PDFPage[], context: RenderContext): void {
  const { snapshot, regular } = context;
  pages.forEach((page, index) => {
    page.drawRectangle({
      x: MARGIN,
      y: 46,
      width: CONTENT_WIDTH,
      height: 0.6,
      color: COLORS.line,
    });
    text(page, `${snapshot.business.name} · Invoice ${snapshot.ref}`, MARGIN, 33, {
      font: regular,
      size: 7.2,
      color: COLORS.muted,
    });
    textRight(page, `Page ${index + 1} of ${pages.length}`, PAGE_WIDTH - MARGIN, 33, {
      font: regular,
      size: 7.2,
      color: COLORS.muted,
    });
  });
}

export async function renderInvoicePdf(snapshot: InvoiceSnapshot): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes = await loadFontBytes();
  const [regular, semibold] = await Promise.all([
    doc.embedFont(bytes.regular, { subset: true }),
    doc.embedFont(bytes.semibold, { subset: true }),
  ]);

  doc.setTitle(`Invoice ${snapshot.ref}`);
  doc.setAuthor(snapshot.business.name);
  doc.setSubject(`Invoice ${snapshot.ref} for ${snapshot.customer.name}`);
  doc.setProducer(snapshot.business.name);
  doc.setCreator(snapshot.business.name);

  const context: RenderContext = {
    doc,
    regular,
    semibold,
    snapshot,
    pages: [],
  };

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.pages.push(page);
  let y = drawWordmark(page, context, false);
  y = drawTableHeader(page, context, y);

  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM_LIMIT) return;
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    context.pages.push(page);
    y = drawWordmark(page, context, true);
    y = drawTableHeader(page, context, y);
  };

  for (const item of snapshot.items) {
    const detailLines = item.notes ? wrapText(item.notes, regular, 7.8, 290).length : 0;
    const rowHeight = 31 + detailLines * 9.5 + (item.adjustmentPaise !== 0 ? 9.5 : 0);
    ensureSpace(rowHeight + 12);
    y = drawItemRow(page, context, item, y);
  }

  ensureSpace(34);
  {
    const rowTop = y - 14;
    text(page, `Delivery — ${DELIVERY_LABELS[snapshot.deliveryMethod]}`, MARGIN + 8, rowTop, {
      font: regular,
      size: 9,
      color: COLORS.soft,
    });
    if (snapshot.deliveryChargePaise > 0) {
      textRight(page, formatINR(snapshot.deliveryChargePaise), PAGE_WIDTH - MARGIN - 8, rowTop, {
        font: regular,
        size: 9,
        color: COLORS.ink,
      });
    }
    page.drawRectangle({
      x: MARGIN,
      y: y - 26,
      width: CONTENT_WIDTH,
      height: 0.6,
      color: COLORS.line,
    });
    y -= 26;
  }

  const closingHeight = 90 + (snapshot.thankYou ? 18 : 0) + (snapshot.footerNote ? 16 : 0);
  ensureSpace(70 + closingHeight);
  y = drawTotals(page, context, y);
  drawClosing(page, context, y);
  drawFooters(context.pages, context);

  return doc.save();
}
