import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, formatRelativeTime } from "./date";

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

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime("2026-06-29T11:59:30Z")).toBe("just now");
  });

  it("formats minutes ago", () => {
    expect(formatRelativeTime("2026-06-29T11:55:00Z")).toBe("5m ago");
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime("2026-06-29T08:00:00Z")).toBe("4h ago");
  });

  it("formats days ago", () => {
    expect(formatRelativeTime("2026-06-26T12:00:00Z")).toBe("3d ago");
  });

  it("formats weeks ago", () => {
    expect(formatRelativeTime("2026-06-08T12:00:00Z")).toBe("3w ago");
  });

  it("formats months ago", () => {
    expect(formatRelativeTime("2026-04-01T12:00:00Z")).toBe("2mo ago");
  });

  it("formats years ago", () => {
    expect(formatRelativeTime("2025-01-01T12:00:00Z")).toBe("1y ago");
  });

  it("returns empty string for missing or invalid input", () => {
    expect(formatRelativeTime(undefined)).toBe("");
    expect(formatRelativeTime("")).toBe("");
    expect(formatRelativeTime("not-a-date")).toBe("");
  });
});
