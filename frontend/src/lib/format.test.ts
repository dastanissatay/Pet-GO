import { describe, expect, it } from "vitest";
import { formatDate, formatUsd, formatUsdRange, localDateIso, parseUsDate, toNumber } from "@/lib/format";

describe("formatUsd", () => {
  it("shows whole dollars without cents", () => {
    expect(formatUsd(1240)).toBe("$1,240");
    expect(formatUsd("990.00")).toBe("$990");
  });

  it("keeps cents when the amount has them", () => {
    expect(formatUsd("86.5")).toBe("$86.50");
  });

  it("treats junk as zero instead of NaN", () => {
    expect(toNumber("abc")).toBe(0);
  });
});

describe("formatUsdRange", () => {
  it("joins with an en dash", () => {
    expect(formatUsdRange(990, 1560)).toBe("$990–$1,560");
  });
});

describe("dates", () => {
  it("formats ISO dates as MM/DD/YYYY", () => {
    expect(formatDate("2026-10-28")).toBe("10/28/2026");
    expect(formatDate("2026-10-28T12:00:00Z")).toBe("10/28/2026");
  });

  it("parses US dates and rejects impossible ones", () => {
    expect(parseUsDate("10/28/2026")).toBe("2026-10-28");
    expect(parseUsDate("2/29/2025")).toBeNull();
    expect(parseUsDate("28/10/2026")).toBeNull();
  });

  it("uses the local calendar date", () => {
    expect(localDateIso(new Date(2026, 10, 14, 23, 30))).toBe("2026-11-14");
  });
});
