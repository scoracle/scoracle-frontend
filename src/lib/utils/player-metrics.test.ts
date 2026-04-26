import { describe, it, expect } from "vitest";
import {
  formatHeightForDisplay,
  formatWeightForDisplay,
  formatAgeFromDob,
} from "./player-metrics";

describe("formatHeightForDisplay", () => {
  it("passes through feet'inches strings", () => {
    expect(formatHeightForDisplay("6'8\"")).toBe("6'8\"");
    expect(formatHeightForDisplay("6-8")).toBe("6'8\"");
    expect(formatHeightForDisplay("6 ft 8 in")).toBe("6'8\"");
  });

  it("converts centimeter values (120-260 range) to feet/inches", () => {
    // 188 cm ≈ 6'2"
    expect(formatHeightForDisplay("188")).toBe("6'2\"");
    // 200 cm ≈ 6'7"
    expect(formatHeightForDisplay("200")).toBe("6'7\"");
  });

  it("converts meter values (1.4-2.5 range) to feet/inches", () => {
    // 2.0 m ≈ 6'7"
    expect(formatHeightForDisplay("2.0")).toBe("6'7\"");
    expect(formatHeightForDisplay("1.85")).toBe("6'1\"");
  });

  it("converts inch values (48-100 range) to feet/inches", () => {
    expect(formatHeightForDisplay("72")).toBe("6'0\"");
    expect(formatHeightForDisplay("80")).toBe("6'8\"");
  });

  it("returns null for unparseable / out-of-range input", () => {
    expect(formatHeightForDisplay(null)).toBe(null);
    expect(formatHeightForDisplay(undefined)).toBe(null);
    expect(formatHeightForDisplay("")).toBe(null);
    expect(formatHeightForDisplay("xyz")).toBe(null);
    // 30 is below all ranges — no sport produces this.
    expect(formatHeightForDisplay("30")).toBe(null);
    // 500 is above all ranges.
    expect(formatHeightForDisplay("500")).toBe(null);
  });
});

describe("formatWeightForDisplay", () => {
  it("converts kg suffix → lbs", () => {
    expect(formatWeightForDisplay("100 kg")).toBe("221 lbs");
    expect(formatWeightForDisplay("90kg")).toBe("198 lbs");
  });

  it("passes through lb values", () => {
    expect(formatWeightForDisplay("220 lbs")).toBe("220 lbs");
    expect(formatWeightForDisplay("200lb")).toBe("200 lbs");
  });

  it("infers kg from typical athlete kg range (35-200)", () => {
    expect(formatWeightForDisplay("100")).toBe("221 lbs");
    expect(formatWeightForDisplay("75")).toBe("165 lbs");
  });

  it("infers lbs from typical athlete pounds range (>200, ≤450)", () => {
    expect(formatWeightForDisplay("250")).toBe("250 lbs");
    expect(formatWeightForDisplay("400")).toBe("400 lbs");
  });

  it("returns null for nonsense input", () => {
    expect(formatWeightForDisplay(null)).toBe(null);
    expect(formatWeightForDisplay("")).toBe(null);
    expect(formatWeightForDisplay("xyz")).toBe(null);
    // Below floor (70 lbs is the cutoff).
    expect(formatWeightForDisplay("20 kg")).toBe(null);
  });
});

describe("formatAgeFromDob", () => {
  it("returns the integer age for a reasonable DOB", () => {
    // Use a DOB ~30 years before now to avoid timezone-flake on edge dates.
    const yearsAgo = 30;
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - yearsAgo);
    dob.setDate(dob.getDate() - 1); // one day past the birthday
    const isoDate = dob.toISOString().split("T")[0];
    expect(formatAgeFromDob(isoDate)).toBe(String(yearsAgo));
  });

  it("returns null for unparseable input", () => {
    expect(formatAgeFromDob(null)).toBe(null);
    expect(formatAgeFromDob("")).toBe(null);
    expect(formatAgeFromDob("not-a-date")).toBe(null);
  });

  it("returns null for ages outside the 10-60 range", () => {
    // A baby
    const today = new Date();
    const isoToday = today.toISOString().split("T")[0];
    expect(formatAgeFromDob(isoToday)).toBe(null);
    // Far past — 90 years ago
    const oldDob = new Date();
    oldDob.setFullYear(oldDob.getFullYear() - 90);
    expect(formatAgeFromDob(oldDob.toISOString().split("T")[0])).toBe(null);
  });
});
