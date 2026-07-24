/**
 * Card — the platform's first-class content unit.
 *
 * A drop-in replacement for `<Shell>` that ALSO carries the card token's
 * app-level composition: every profile Card renders a `<CopyCardButton>`
 * (top-right against the Shell root, always visible). The card is the
 * value — one click composes this card's body under the entity's
 * trading-card meta (<ShadowCard>) and puts the PNG on the clipboard,
 * pasteable anywhere. Identity for the artifact's filename resolves through
 * the same warm `getEntityMeta` query EntityMeta uses — no extra fetch.
 *
 * The deck draw lives here: a body passes its character-assigned raw score
 * via `score`, Card clamps it to the 0-99 display scale, draws the
 * character's tarot card (lib/cards/tarot-deck), and stamps the draw
 * everywhere at once — the corner numerals (via Shell), the uniform
 * CardScoreSlot at the top of the band, and the share artifact (via
 * CopyCardButton). No score accessor, or a null read → corner dots and no
 * slot; an accessor that resolves null with product on screen → the slot's
 * Veil state.
 *
 * Ownership contract: <Card> is the leaf — it owns its product content.
 * <ShadowCard> owns only the share artifact's frame and borrows this card's
 * body by cloning it at capture time.
 *
 *   <Card id="stats" as="article" aria-label="Stats" score={() => rating()?.score}>
 *     {cardBody()}
 *   </Card>
 */
import { Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";
import Shell from "./Shell";
import CopyCardButton from "./CopyCardButton";
import CardScoreSlot from "./CardScoreSlot";
import { useProfile } from "../../contexts/profile";
import { getEntityMeta } from "./EntityMeta";
import type { CardId } from "../../lib/cards/card-meta";
import { drawCard, displayScore } from "../../lib/cards/tarot-deck";
import { cardScoreColor } from "../../lib/utils/tier-color";
import "./content-cards.css";

interface CardProps {
  /** Card id — names the artifact (download filename) and identifies the card. */
  id: CardId;
  /** Host element. Forwarded to Shell. Defaults to <div>. */
  as?: "div" | "section" | "nav" | "main" | "aside" | "article";
  "aria-label"?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** The character-assigned RAW score for this card (Card clamps to the 0-99
   *  display scale). Omit while the card has no score source; a null/undefined
   *  read renders the slot's Veil state and the corner-dots fallback. */
  score?: () => number | null | undefined;
  children: JSX.Element;
}

export default function Card(props: CardProps) {
  const ctx = useProfile();
  const meta = createAsync(() => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()));

  const score = () => {
    const raw = props.score?.();
    return raw == null || !Number.isFinite(raw) ? null : displayScore(raw);
  };
  const drawn = () => drawCard(props.id, score());
  const cornerLabel = () => drawn()?.numeral;
  const scoreColor = () => {
    const s = score();
    return s == null ? undefined : cardScoreColor(props.id, s, ctx.type());
  };

  let shellEl: HTMLElement | undefined;

  const filename = () => {
    const slug = (meta()?.name ?? "card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `scoracle-${slug}-${props.id}`;
  };

  return (
    <Shell
      as={props.as}
      aria-label={props["aria-label"]}
      class={props.class}
      classList={props.classList}
      cornerLabel={cornerLabel()}
      ref={(el) => (shellEl = el)}
    >
      <CopyCardButton
        target={() => shellEl}
        filename={filename}
        cornerLabel={cornerLabel}
      />
      <div class="card-band-body">
        <Show when={props.score}>
          <CardScoreSlot score={score()} drawn={drawn()} color={scoreColor()} />
        </Show>
        {props.children}
      </div>
    </Shell>
  );
}
