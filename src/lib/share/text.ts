/**
 * Build the canonical share-text post copy:
 *
 *   "Check out {entity.name}'s {category} report"
 *
 * Returned alongside the canonical URL so the share dispatcher can
 * hand both to `navigator.share({ text, url })`. The URL is
 * kept as a separate field rather than concatenated into the text —
 * apps that honor the `url` argument (X, FB sharer) render their
 * own link card from it; apps that ignore it (iMessage, Mail)
 * still get the URL because Web Share API joins them at send-time.
 */
import { buildShareUrl, type ShareTab, type ShareEntity } from "../utils/share-url";
import { CARD_META, type CardId } from "../cards/card-meta";

export interface ShareTextInput {
  /** Display name of the entity being shared (e.g., "LeBron James"). */
  entityName: string;
  /** Card id — drives both the post-copy category and the `?tab=` landing. */
  cardId: CardId;
  /** Entity identifier — drives the canonical URL. */
  entity: ShareEntity;
  /** Extra view state (rate / scope / vs) carried onto the share URL. */
  extra?: Record<string, string>;
}

export interface ShareTextOutput {
  text: string;
  url: string;
}

export function buildShareText(input: ShareTextInput): ShareTextOutput {
  // The card id IS the landing tab (one taxonomy across the pillar).
  const url = buildShareUrl(input.entity, input.cardId as ShareTab, input.extra);
  const category = CARD_META[input.cardId].shareCategory(input.entity.sport);
  const text = `Check out ${input.entityName}'s ${category} report`;
  return { text, url };
}
