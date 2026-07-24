/**
 * Corner label for the IDENTITY surface only: EntityMeta's meta widget keeps
 * the target entity's canonical numeric ID in its corners — the one place the
 * ID stays discoverable. The six character cards no longer use this; their
 * corners carry the drawn tarot card's Roman numeral (see lib/cards/
 * tarot-deck.ts and the deck draw in Card.tsx).
 */
export function targetEntityCornerLabel(id: string | number | null | undefined): string | undefined {
  const label = String(id ?? "").trim();
  return /^\d+$/.test(label) ? label : undefined;
}
