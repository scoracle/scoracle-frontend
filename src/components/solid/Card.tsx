/**
 * Card — the platform's first-class content unit.
 *
 * A drop-in replacement for `<Shell>` that ALSO wires share-by-default. It
 * renders the Shell chrome (border, tarot corners, silhouette) and, when the
 * card is `shareable` in `CARD_META`, drops a `<ShareTrigger>` — positioned
 * top-right against the Shell's relative `.card` root.
 *
 * Every `*Card` body renders `<Card id="…">` instead of raw `<Shell>`. Toggling
 * `shareable` in `card-meta.ts` flips sharing on/off with ZERO per-card edits —
 * the registry is the one switch. `<Shell>` stays pillar-pure (chrome only); all
 * share composition lives here, in the flagship-side Card. This is the seam the
 * "Card convention" in CLAUDE.md and the Card Pillar spec describe.
 *
 *   <Card id="composite" as="article" aria-label="Composite">
 *     {cardBody()}
 *   </Card>
 */
import { Show, type JSX } from "solid-js";
import Shell from "./Shell";
import ShareTrigger from "../../lib/share/ShareTrigger";
import { useProfile } from "../../contexts/profile";
import { readEntityName } from "../../lib/utils/entity-name";
import { CARD_META, type CardId } from "../../lib/cards/card-meta";

interface CardProps {
  /** Card id — looks up share metadata in CARD_META; also the share landing tab. */
  id: CardId;
  /** Host element. Forwarded to Shell. Defaults to <div>. */
  as?: "div" | "section" | "nav" | "main" | "aside" | "article";
  "aria-label"?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** Corner numeral (data-derived). Forwarded to Shell. */
  cornerLabel?: string;
  children: JSX.Element;
}

export default function Card(props: CardProps) {
  const ctx = useProfile();
  const shareable = () => CARD_META[props.id]?.shareable ?? false;

  return (
    <Shell
      as={props.as}
      aria-label={props["aria-label"]}
      class={props.class}
      classList={props.classList}
      cornerLabel={props.cornerLabel}
    >
      <Show when={shareable()}>
        <ShareTrigger
          metadata={{
            cardId: props.id,
            entity: { sport: ctx.sport, type: ctx.type, id: String(ctx.id) },
            entityName: readEntityName(ctx.sport, ctx.type, String(ctx.id)),
          }}
        />
      </Show>
      {props.children}
    </Shell>
  );
}
