import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "./url";

describe("sanitizeUrl", () => {
  it("passes through https URLs", () => {
    expect(sanitizeUrl("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
  });

  it("passes through http URLs", () => {
    expect(sanitizeUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects javascript: URIs (XSS)", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("JAVASCRIPT:void(0)")).toBe("");
  });

  it("rejects data: URIs", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("rejects null/undefined/empty input", () => {
    expect(sanitizeUrl(null)).toBe("");
    expect(sanitizeUrl(undefined)).toBe("");
    expect(sanitizeUrl("")).toBe("");
  });

  it("resolves relative-looking input against the current origin", () => {
    // Documenting current behavior — `new URL("not a url", origin)`
    // succeeds because the second arg is a valid base. The protocol is
    // http, so sanitizeUrl returns the absolute form. Callers that need
    // strict absolute-only validation should pre-filter upstream.
    const result = sanitizeUrl("not a url at all");
    expect(result.startsWith("http://") || result.startsWith("https://")).toBe(
      true,
    );
  });
});
