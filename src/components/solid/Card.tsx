/**
 * Card — the platform's first-class content unit.
 *
 * A drop-in replacement for `<Shell>` that ALSO carries the card token's
 * identity: every profile card renders a slim identity band at the top —
 * "LEBRON JAMES · LAL · NBA · 2026" on the left, a quiet Scoracle wordmark on
 * the right — so the card is a self-contained artifact wherever it lands
 * (what you see is what you copy). The band resolves through the same warm
 * `getEntityMeta` query EntityMeta uses, so it renders through SSR and costs
 * no extra fetch.
 *
 * Every Card also carries a `<CopyCardButton>` (top-right against the Shell
 * root, always visible): the card is the value — one click renders it to a
 * PNG on the clipboard, pasteable anywhere.
 *
 *   <Card id="stats" as="article" aria-label="Stats">
 *     {cardBody()}
 *   </Card>
 */
import { Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";
import Shell from "./Shell";
import CopyCardButton from "./CopyCardButton";
import { useProfile } from "../../contexts/profile";
import { getEntityMeta } from "./EntityMeta";
import type { CardId } from "../../lib/cards/card-meta";
import type { PlayerMeta, TeamMeta } from "../../lib/types";
import "./content-cards.css";

interface CardProps {
  /** Card id — names the artifact (download filename) and identifies the card. */
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
  // Entity identity for the band and the artifact filename — the same warm
  // query EntityMeta resolves, so this reads from cache and lands in SSR HTML.
  const meta = createAsync(() => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()));

  let shellEl: HTMLElement | undefined;

  // Identity band segments: NAME · TEAM CODE · SPORT · SEASON. The season
  // shows only when the view is explicitly season-scoped (?season= on the
  // URL); the default "latest" view stays unstamped.
  const bandText = (): string => {
    const m = meta();
    if (!m) return "";
    const segments: string[] = [m.name];
    const teamCode =
      ctx.type() === "player"
        ? (m.raw as PlayerMeta).team?.abbreviation
        : (m.raw as TeamMeta).short_code;
    if (teamCode) segments.push(teamCode);
    segments.push(ctx.sport());
    const season = ctx.season();
    if (season != null) segments.push(String(season));
    return segments.join(" · ").toUpperCase();
  };

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
      <CopyCardButton target={() => shellEl} filename={filename} />
      <Show when={bandText()}>
        <header class="card-identity-band">
          <span class="card-micro-eyebrow card-identity-entity">{bandText()}</span>
          <span class="card-micro-eyebrow card-identity-wordmark" aria-hidden="true">
            Scoracle
          </span>
        </header>
      </Show>
      <div class="card-band-body">{props.children}</div>
    </Shell>
  );
}
