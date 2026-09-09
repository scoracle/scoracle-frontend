export type TeamPalette = readonly [string, string];

export interface TeamColorMeta {
  primary_color?: string | null;
  secondary_color?: string | null;
}

/** Only a complete backend-owned color pair may become CSS values. */
export function teamPalette(meta: TeamColorMeta | null | undefined): TeamPalette | undefined {
  const primary = meta?.primary_color;
  const secondary = meta?.secondary_color;
  const hex = /^#[0-9a-f]{6}$/i;
  return typeof primary === "string" && typeof secondary === "string"
    && hex.test(primary) && hex.test(secondary)
    ? [primary, secondary]
    : undefined;
}
