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
import { categoryFor, type CardType } from "./categories";

export interface ShareTextInput {
  /** Display name of the entity being shared (e.g., "LeBron James"). */
  entityName: string;
  /** Card kind — drives the category term in the post copy. */
  cardType: CardType;
  /** Entity identifier — drives the canonical URL. */
  entity: ShareEntity;
  /** Tab the recipient should land on (`?tab=…`). */
  tab: ShareTab;
}

export interface ShareTextOutput {
  text: string;
  url: string;
}

export function buildShareText(input: ShareTextInput): ShareTextOutput {
  const url = buildShareUrl(input.entity, input.tab);
  const category = categoryFor(input.cardType, input.entity.sport);
  const text = `Check out ${input.entityName}'s ${category} report`;
  return { text, url };
}
