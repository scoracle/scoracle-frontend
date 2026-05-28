/**
 * Collapse whitespace and truncate a string to a short excerpt at a word
 * boundary, appending an ellipsis. Used to render tweet bodies as compliant
 * snippets in the unified NewsCard (excerpt + attribution + link-out, never
 * the full reproduced post).
 */
export function truncate(input: string | null | undefined, max = 140): string {
  const s = (input ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return body.trimEnd() + "…";
}
