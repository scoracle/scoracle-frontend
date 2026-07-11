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
 * Ownership contract: <Card> is the leaf — it owns its product content.
 * <ShadowCard> owns only the share artifact's frame and borrows this card's
 * body by cloning it at capture time.
 *
 *   <Card id="stats" as="article" aria-label="Stats">
 *     {cardBody()}
 *   </Card>
 */
import { type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";
import Shell from "./Shell";
import CopyCardButton from "./CopyCardButton";
import { useProfile } from "../../contexts/profile";
import { getEntityMeta } from "./EntityMeta";
import type { CardId } from "../../lib/cards/card-meta";
import "./content-cards.css";

interface CardProps {
  /** Card id — names the artifact (download filename) and identifies the card. */
  id: CardId;
  /** Host element. Forwarded to Shell. Defaults to <div>. */
  as?: "div" | "section" | "nav" | "main" | "aside" | "article";
  "aria-label"?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** Corner numeral (data-derived). Forwarded to Shell and the ShadowCard. */
  cornerLabel?: string;
  children: JSX.Element;
}

export default function Card(props: CardProps) {
  const ctx = useProfile();
  const meta = createAsync(() => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()));

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
      cornerLabel={props.cornerLabel}
      ref={(el) => (shellEl = el)}
    >
      <CopyCardButton
        target={() => shellEl}
        filename={filename}
        cornerLabel={() => props.cornerLabel}
      />
      <div class="card-band-body">{props.children}</div>
    </Shell>
  );
}
