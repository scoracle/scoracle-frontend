/**
 * Normalize a string for diacritic-insensitive substring search.
 *
 * NFD decomposes accented characters (e.g. "ê" → "e" + combining circumflex),
 * then the regex strips the combining marks in the Unicode block U+0300–U+036F,
 * leaving plain ASCII letters. Finally lowercased and trimmed.
 *
 * Examples:
 *   "Estêvão"       → "estevao"
 *   "Aarón Martín"  → "aaron martin"
 *   "ß"             → "ß"  (sharp-s has no decomposition; stays as-is)
 */
export function normalizeForSearch(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
