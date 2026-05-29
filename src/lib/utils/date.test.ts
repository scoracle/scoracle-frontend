import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./date";

describe("formatDate", () => {
  it("formats ISO date strings as 'Mon D'", () => {
    // Use a fully-specified UTC datetime so the output doesn't drift
    // across CI timezones (Date.parse interprets bare YYYY-MM-DD as UTC,
    // then toLocaleDateString shifts to local — which can change the day).
    expect(formatDate("2026-12-25T12:00:00Z")).toBe("Dec 25");
    expect(formatDate("2026-01-01T12:00:00Z")).toBe("Jan 1");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("returns 'Invalid Date' string from toLocaleDateString for nonsense input", () => {
    // Documenting current behavior — Date('not-a-date') is an Invalid Date,
    // and toLocaleDateString returns "Invalid Date". This is acceptable
    // because callers gate on truthy-string upstream and the API ships
    // ISO strings.
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});

describe("formatDateTime", () => {
  it("formats ISO timestamps as 'Mon D, H:MM AM/PM'", () => {
    // Output is rendered in the test runner's local timezone, so assert on
    // shape rather than an exact clock value (which would drift across TZs).
    expect(formatDateTime("2026-05-28T15:45:00Z")).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}\s?[AP]M$/,
    );
  });

  it("returns empty string for undefined, empty, or invalid input", () => {
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("")).toBe("");
    expect(formatDateTime("not-a-date")).toBe("");
  });
});
