/**
 * Escape `<`, `>`, `&`, `'`, `"` for safe inclusion in SVG/XML text
 * nodes and attribute values. Used by every Card's SVG renderer to
 * guard against entity-name or context strings breaking the artifact.
 */
export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" :
    "&quot;",
  );
}
