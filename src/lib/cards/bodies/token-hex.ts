import { light } from "@scoracle/tokens";

export const TOKEN_HEX = {
  bg: light.bg,
  bgCard: light.bgCard,
  text: light.text,
  textSecondary: light.textSecondary,
  textTertiary: light.textTertiary,
  comparePrimaryBg: light.comparePrimaryBg,
  compareSecondaryBg: light.compareSecondaryBg,
  percentileElite: light.percentileElite,
  percentileAbove: light.percentileAbove,
  percentileAverage: light.percentileAverage,
  percentileBelow: light.percentileBelow,
  percentilePoor: light.percentilePoor,
} as const;

export const TIER_HEX = {
  elite: TOKEN_HEX.percentileElite,
  above: TOKEN_HEX.percentileAbove,
  average: TOKEN_HEX.percentileAverage,
  below: TOKEN_HEX.percentileBelow,
  poor: TOKEN_HEX.percentilePoor,
} as const;
