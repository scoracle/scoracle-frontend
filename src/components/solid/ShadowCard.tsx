/**
 * ShadowCard — the share artifact. ONE canonical portrait card that composes
 * the entity's trading-card meta (headshot + team crest, name, one context
 * line) above a product card's content — so a copied card stands alone
 * wherever it lands, like handing someone an actual card. The header is
 * identity-only: the card's own score travels inside the cloned body
 * (CardScoreSlot) and the drawn card's numeral on the corners.
 *
 * The page never renders it, and the component is PURE — all data arrives
 * resolved via props. `captureShadowCard` gathers the meta imperatively
 * from the same query() the on-page meta card already settled (cache-hot,
 * so this is instant), mounts the card in an off-screen host, pours in a
 * CLONE of the live card's body (content stays single-sourced — no second
 * product render), scales the body down if it outgrows the silhouette,
 * snapshots to a PNG blob, and disposes. Keeping the detached tree free of
 * async/router primitives is load-bearing: createAsync and friends throw
 * outside a Route.
 *
 * Ownership contract: <ShadowCard> owns the FRAME, never the content —
 * <Card> remains the leaf that owns its product. CopyCardButton owns the
 * gesture/clipboard side; this module owns the artifact.
 */
import { Show } from "solid-js";
import { render } from "solid-js/web";
import { toBlob, getFontEmbedCSS } from "html-to-image";
import Shell from "./Shell";
import { getEntityMeta, type ResolvedMeta } from "./EntityMeta";
import type { ProfileContextValue } from "../../contexts/profile";
import type { EntityType, PlayerMeta, TeamMeta } from "../../lib/types";
import "./content-cards.css";
import "./ShadowCard.css";

// 1x1 transparent PNG. Third-party avatar hosts (provider CDNs) without CORS
// headers fail html-to-image's inline fetch; this placeholder keeps the rest
// of the capture whole instead of failing it.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Session cache for the @font-face embed CSS (see the capture call). A failed
// resolution caches `undefined`, which lets toBlob fall back to its own
// per-capture embedding rather than dropping fonts from every later capture.
let fontCSS: string | undefined;
let fontCSSResolved = false;

interface ShadowCardProps {
  meta: ResolvedMeta;
  type: EntityType;
  /** Drawn card's Roman numeral carried over from the live card's corners. */
  cornerLabel?: string;
}

/** The artifact's frame: portrait Shell + meta header + an empty body slot
 *  (`.card-band-body`) that captureShadowCard fills with the live clone. */
function ShadowCard(props: ShadowCardProps) {
  // One context line under the name: TEAM · POSITION for players;
  // CONFERENCE (or league) for teams. The target ID stays on the corner
  // numeral; the sport is carried by the crest.
  const contextLine = (): string => {
    if (props.type === "player") {
      const raw = props.meta.raw as PlayerMeta;
      const position = raw.detailed_position || props.meta.position;
      return [props.meta.subtitle, position].filter(Boolean).join(" · ");
    }
    const raw = props.meta.raw as TeamMeta;
    return raw.conference || raw.league?.name || "";
  };

  return (
    <Shell as="article" class="shadow-card" cornerLabel={props.cornerLabel}>
      <header class="shadow-card-header">
        <Show when={props.meta.photoUrl || props.meta.teamLogoUrl}>
          <div class="shadow-avatar">
            <Show
              when={props.meta.photoUrl}
              fallback={<img class="shadow-crest-lone" src={props.meta.teamLogoUrl} alt="" />}
            >
              <img class="shadow-headshot" src={props.meta.photoUrl} alt="" />
              <Show when={props.meta.teamLogoUrl}>
                <img class="shadow-crest" src={props.meta.teamLogoUrl} alt="" />
              </Show>
            </Show>
          </div>
        </Show>
        <span class="shadow-card-name">{props.meta.name}</span>
        <Show when={contextLine()}>
          <span class="card-micro-eyebrow shadow-card-context">{contextLine()}</span>
        </Show>
      </header>
      <div class="card-band-body" />
    </Shell>
  );
}

/**
 * Build the share artifact for a live profile card → PNG blob.
 *
 * @param ctx         The profile context value (entity identity + season).
 * @param sourceCard  The live card's Shell root (CopyCardButton's target).
 * @param cornerLabel The live card's drawn-numeral corner label, if any.
 */
export async function captureShadowCard(
  ctx: ProfileContextValue,
  sourceCard: HTMLElement,
  cornerLabel?: string,
): Promise<Blob> {
  // Cache-hot: the on-page meta card already resolved this query for this
  // entity.
  const meta = await getEntityMeta(ctx.sport(), ctx.type(), ctx.id());
  if (!meta) throw new Error("no entity meta for shadow card");

  // The canonical portrait silhouette, regardless of viewport or how tall
  // the on-page card has grown — every paste is one standard card.
  const rootStyle = getComputedStyle(document.documentElement);
  const width =
    parseFloat(rootStyle.getPropertyValue("--card-width-portrait")) || 480;
  const aspect =
    parseFloat(rootStyle.getPropertyValue("--card-aspect-portrait")) || 0.7021276596;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;";
  host.style.width = `${width}px`;
  host.style.setProperty("--card-width", `${width}px`);
  host.style.setProperty("--card-aspect-ratio", String(aspect));
  document.body.appendChild(host);

  const dispose = render(
    () => <ShadowCard meta={meta} type={ctx.type()} cornerLabel={cornerLabel} />,
    host,
  );

  try {
    // Pour the live product in: clone the body's children into the slot.
    // Single source of truth — the artifact shows exactly what the page
    // shows, without a second product render.
    const slot = host.querySelector<HTMLElement>(".card-band-body");
    const sourceBody = sourceCard.querySelector<HTMLElement>(".card-band-body");
    if (slot && sourceBody) {
      const clone = sourceBody.cloneNode(true) as HTMLElement;
      while (clone.firstChild) slot.appendChild(clone.firstChild);
    }

    // Content that outgrew the silhouette scales down uniformly, anchored
    // under the header; content that fits keeps its size.
    if (slot) {
      const available = slot.clientHeight;
      const natural = slot.scrollHeight;
      if (available > 0 && natural > available) {
        slot.style.flex = "0 0 auto";
        slot.style.height = `${natural}px`;
        slot.style.transform = `scale(${available / natural})`;
        slot.style.transformOrigin = "top center";
      }
    }

    const card = host.querySelector<HTMLElement>(".shadow-card");
    if (!card) throw new Error("shadow card failed to mount");
    // Font embedding dominates capture time: without a precomputed CSS,
    // html-to-image re-parses every @font-face and re-fetches each font file
    // into a data URL on EVERY capture. The token fonts are identical for
    // every card, so resolve the embed CSS once per session. Speed here is
    // functional, not cosmetic — iOS Safari refuses the pending clipboard
    // write when the capture outlives the tap's user-activation window.
    if (!fontCSSResolved) {
      fontCSS = await getFontEmbedCSS(card).catch(() => undefined);
      fontCSSResolved = true;
    }
    const blob = await toBlob(card, {
      pixelRatio: 2,
      imagePlaceholder: TRANSPARENT_PIXEL,
      // undefined → html-to-image falls back to its own per-capture embed.
      fontEmbedCSS: fontCSS,
    });
    if (!blob) throw new Error("card capture produced no image");
    return blob;
  } finally {
    dispose();
    host.remove();
  }
}
