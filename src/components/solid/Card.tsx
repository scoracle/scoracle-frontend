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
 * It renders the Shell chrome (border, tarot corners, silhouette) and, when
 * the card is `shareable` in `CARD_META`, drops a `<ShareTrigger>` —
 * positioned top-right against the Shell's relative `.card` root.
 *
 *   <Card id="stats" as="article" aria-label="Stats">
 *     {cardBody()}
 *   </Card>
 */
import { Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";
import Shell from "./Shell";
import ShareTrigger from "../../lib/share/ShareTrigger";
import { useProfile } from "../../contexts/profile";
import { getEntityMeta } from "./EntityMeta";
import { CARD_META, type CardId } from "../../lib/cards/card-meta";
import type { PlayerMeta, TeamMeta } from "../../lib/types";
import "./content-cards.css";

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
  // Entity identity for the band (and share copy) — the same warm query
  // EntityMeta resolves, so this reads from cache and lands in SSR HTML.
  const meta = createAsync(() => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()));

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

  // Carry the current view state onto the share URL so a shared per-X / scoped /
  // compared card reflects exactly what's on screen. Only non-default values.
  const shareExtra = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (ctx.rateMode() !== "default") e.rate = ctx.rateMode();
    if (ctx.scope() !== "all") e.scope = ctx.scope();
    const v = ctx.vs();
    if (v) e.vs = v;
    return e;
  };

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
            entity: { sport: ctx.sport(), type: ctx.type(), id: String(ctx.id()) },
            entityName: meta()?.name ?? "",
            extra: shareExtra(),
          }}
        />
      </Show>
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
