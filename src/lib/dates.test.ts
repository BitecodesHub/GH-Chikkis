import { describe, expect, it } from "vitest";
import {
  businessToday,
  formatDateDDMMYYYY,
  formatDateTime,
  isInBusinessRange,
  isValidBusinessDate,
  parseBusinessDate,
  toBusinessDate,
} from "./dates";

describe("business dates", () => {
  it("uses the Indian clock, not the server's", () => {
    // 19:00 UTC is 00:30 the next day in IST.
    expect(businessToday(new Date("2026-10-31T19:30:00Z"))).toBe("2026-11-01");
    expect(businessToday(new Date("2026-10-31T18:00:00Z"))).toBe("2026-10-31");
  });

  it("reads an ISO timestamp as an Indian business day", () => {
    expect(toBusinessDate("2026-10-31T19:30:00Z")).toBe("2026-11-01");
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(isValidBusinessDate("2026-02-30")).toBe(false);
    expect(isValidBusinessDate("2026-13-01")).toBe(false);
    expect(isValidBusinessDate("31/12/2026")).toBe(false);
    expect(isValidBusinessDate("2026-12-01")).toBe(true);
  });
});

describe("parseBusinessDate", () => {
  it("accepts the format the owner writes and the format the database stores", () => {
    expect(parseBusinessDate("31/10/2026")).toBe("2026-10-31");
    expect(parseBusinessDate("1/4/2026")).toBe("2026-04-01");
    expect(parseBusinessDate("2026-10-31")).toBe("2026-10-31");
  });

  it("refuses a day that never happened", () => {
    expect(parseBusinessDate("31/02/2026")).toBeNull();
    expect(parseBusinessDate("2026-10-32")).toBeNull();
    expect(parseBusinessDate("next tuesday")).toBeNull();
  });
});

describe("formatting for the Indian customer", () => {
  it("prints DD/MM/YYYY", () => {
    expect(formatDateDDMMYYYY("2026-10-31")).toBe("31/10/2026");
    expect(formatDateDDMMYYYY(new Date("2026-10-31T19:30:00Z"))).toBe("01/11/2026");
    expect(formatDateDDMMYYYY(null)).toBe("—");
    expect(formatDateDDMMYYYY("not a date")).toBe("—");
  });

  it("prints a 24-hour Indian timestamp on invoices", () => {
    expect(formatDateTime("2026-10-31T06:05:00Z")).toBe("31/10/2026, 11:35");
  });
});

describe("isInBusinessRange", () => {
  const from = "2026-10-01";
  const to = "2026-10-31";

  it("includes both ends of the range", () => {
    expect(isInBusinessRange(from, from, to)).toBe(true);
    expect(isInBusinessRange(to, from, to)).toBe(true);
    expect(isInBusinessRange("2026-11-01", from, to)).toBe(false);
    expect(isInBusinessRange("2026-09-30", from, to)).toBe(false);
  });

  it("compares an Indian timestamp by its business day", () => {
    expect(isInBusinessRange("2026-10-31T19:30:00Z", from, to)).toBe(false);
    expect(isInBusinessRange("2026-10-31T18:00:00Z", from, to)).toBe(true);
  });
});
