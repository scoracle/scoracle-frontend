/**
 * Card — one of the platform's two artifacts, and its first-class content
 * unit. The Card surfaces the voice of a character; <Board> reveals
 * hierarchy. **The Card is drawn; the Board is printed** — the Card is the
 * made object, hand-drawn down to the wobble in its frame.
 *
 * Card owns everything: the Swords-set redesign (2026-08-04) absorbed the
 * separate container primitive that used to sit above it. Three pieces of
 * furniture and nothing else — the weathered frame, the number centred at
 * the top, and the card name in a thin box at the foot. Square corners; the
 * two-part paper shadow (tokens: --shadow-card) separates it from the desk.
 *
 * Two exports:
 *
 *   - <CardVessel> — the bare vessel: cardstock, frame, shadow, the deck's
 *     hue wash + line-drawing motif (or the flat 4% ink wash when it
 *     belongs to no deck), and the name box. Non-deck surfaces (EntityMeta,
 *     ShadowCard, LoadingCard, EmptyCard) compose this directly.
 *   - <Card> (default) — the character card: CardVessel + the deck draw.
 *     A body passes its character-assigned raw score via `score`; Card
 *     clamps it to the 0-99 display scale, draws the character's tarot
 *     card (lib/cards/tarot-deck), paints the score head in the tier hue,
 *     and sets the drawn card's name in the foot box. It also renders the
 *     <CopyCardButton> and names the share artifact.
 *
 * Corner numerals are RETIRED (2026-08-04): no draw numerals, no target
 * IDs, no accent dots. The head carries the number; the name box carries
 * the identity.
 *
 * Ownership contract: <Card> is the leaf — it owns its product content.
 * <ShadowCard> owns only the share artifact's frame and borrows this card's
 * body by cloning it at capture time.
 *
 *   <Card id="scouting" as="article" aria-label="Scouting" score={() => rating()?.score}>
 *     {cardBody()}
 *   </Card>
 */
import { Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { createAsync } from "@solidjs/router";
import CopyCardButton from "./CopyCardButton";
import CardScoreSlot from "./CardScoreSlot";
import { useProfile } from "../../contexts/profile";
import { getEntityMeta } from "./EntityMeta";
import type { CardId } from "../../lib/cards/card-meta";
import { drawCard, displayScore, VEIL_CARD } from "../../lib/cards/tarot-deck";
import { cardScoreColor } from "../../lib/utils/tier-color";
import "./content-cards.css";

type HostTag = "div" | "section" | "nav" | "main" | "aside" | "article";

/** The six character decks — the only ids that carry a deck hue + motif —
 *  mapped to their @scoracle/tokens deck-hue custom properties. (CardId
 *  also admits "leaderboard", which renders the plain vessel.) */
const DECK_HUES: Record<string, string> = {
  scouting: "var(--deck-scouting)",
  narratives: "var(--deck-narratives)",
  transfers: "var(--deck-transfers)",
  vibe: "var(--deck-vibe)",
  momentum: "var(--deck-momentum)",
  sigil: "var(--deck-sigil)",
};

/**
 * CardFrame — ONE hand-drawn weathered rule + the name-box divider, in one
 * inline SVG (source of truth: @scoracle/tokens assets/chrome/
 * weathered-frame.svg). Inlined so live UI and html-to-image capture render
 * identically with no asset fetch. `preserveAspectRatio="none"` stretches
 * the wobble to any card box; `vector-effect: non-scaling-stroke` holds the
 * rule at 1.3px on screen whatever the card size. Stroke color comes from
 * CSS (.card-frame — the faded-print grey, --text-tertiary pinned light).
 */
function CardFrame() {
  return (
    <svg
      class="card-frame"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        vector-effect="non-scaling-stroke"
        d="M 2.00 2.00 Q 17.21 1.95 33.62 1.99 Q 50.00 2.01 65.29 1.96 Q 80.59 1.95 93.69 1.99 Q 96.42 2.00 98.00 2.00 Q 98.05 17.21 98.02 33.62 Q 97.99 50.00 98.04 65.29 Q 98.05 80.59 98.02 93.69 Q 98.00 96.42 98.00 98.00 Q 82.76 98.05 66.38 98.02 Q 50.00 97.99 34.71 98.04 Q 19.38 98.05 6.31 98.02 Q 3.58 98.00 2.00 98.00 Q 1.95 82.76 1.99 66.38 Q 2.01 50.00 1.96 34.71 Q 1.95 19.38 1.99 6.31 Q 2.00 3.58 2.00 2.00 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        d="M 2.00 90.22 Q 34.71 90.05 66.38 90.24 Q 82.76 90.30 98.00 90.20"
      />
    </svg>
  );
}

export interface CardVesselProps {
  /** Host element. Defaults to <div>. */
  as?: HostTag;
  "aria-label"?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** Character deck this card belongs to — sets the hue wash + line-drawing
   *  motif. Omit (or pass a non-deck id) for the plain vessel: the flat 4%
   *  ink wash, the least tinted field in the system. */
  deck?: CardId;
  /** Name-box text (the thin strip at the foot). The drawn card's name on
   *  character cards; the entity's name on the meta/share cards. Omit for a
   *  blank strip. */
  title?: string;
  /** Ref forwarded to the vessel's root DOM element. */
  ref?: (el: HTMLElement) => void;
  children: JSX.Element;
}

export function CardVessel(props: CardVesselProps) {
  const deck = () => (props.deck && props.deck in DECK_HUES ? props.deck : undefined);

  return (
    <Dynamic
      component={props.as ?? "div"}
      ref={props.ref}
      class={`card${props.class ? ` ${props.class}` : ""}`}
      classList={props.classList}
      aria-label={props["aria-label"]}
      style={deck() ? { "--deck-hue": DECK_HUES[deck()!] } : undefined}
    >
      <div class="card-wash" classList={{ "card-wash-deck": !!deck() }} aria-hidden="true">
        {/* The deck's line drawing is a MASK, not an image. The assets bake a
            dark stroke at low alpha for ivory cardstock; since the deck
            themes (Night Deck, 2026-08-10) an <img> of one disappears on
            night stock. Painted through, it takes its colour from CSS and
            reads in both. Same mechanic as the Board's printer's device. */}
        <Show when={deck()}>
          {(d) => (
            <span
              class="card-motif"
              style={{ "--card-motif-src": `url(/deck-art/motif-${d()}.svg)` }}
            />
          )}
        </Show>
      </div>
      <CardFrame />
      {props.children}
      <div class="card-foot" aria-hidden={props.title ? undefined : "true"}>
        <Show when={props.title}>
          <span class="card-foot-name">{props.title}</span>
        </Show>
      </div>
    </Dynamic>
  );
}

interface CardProps {
  /** Card id — names the artifact (download filename), selects the deck. */
  id: CardId;
  as?: HostTag;
  "aria-label"?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** The character-assigned RAW score for this card (Card clamps to the 0-99
   *  display scale). Omit while the card has no score source; a null/undefined
   *  read renders the head's unread dash and the Veil's name in the foot. */
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
  const scoreColor = () => {
    const s = score();
    return s == null ? undefined : cardScoreColor(props.id, s, ctx.type());
  };
  /** The foot box names the draw; no score source = a blank strip. */
  const title = () => (props.score ? (drawn()?.name ?? VEIL_CARD.name) : undefined);

  let vesselEl: HTMLElement | undefined;

  const filename = () => {
    const slug = (meta()?.name ?? "card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `scoracle-${slug}-${props.id}`;
  };

  return (
    <CardVessel
      as={props.as}
      aria-label={props["aria-label"]}
      class={props.class}
      classList={props.classList}
      deck={props.id}
      title={title()}
      ref={(el) => (vesselEl = el)}
    >
      <CopyCardButton target={() => vesselEl} filename={filename} />
      <div class="card-band-body">
        <Show when={props.score}>
          <CardScoreSlot score={score()} drawn={drawn()} color={scoreColor()} />
        </Show>
        {props.children}
      </div>
    </CardVessel>
  );
}
