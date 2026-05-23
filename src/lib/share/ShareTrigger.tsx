/**
 * ShareTrigger — the small button Cards drop inside their Shell to
 * expose share. Positioned absolute top-right of the nearest
 * positioned ancestor (the wrapping Shell — `.card` is
 * `position: relative` per global.css).
 *
 * Flow:
 *   click → fetch PNG → navigator.share({ files, text, url })
 *     ↓ on browsers without Web Share API file support
 *   fallback → mount <ShareFallbackModal> with the fetched blob
 *
 * The Shell primitive is intentionally NOT modified — composition
 * over inheritance keeps Shell pure for the eventual extraction to
 * `@scoracle/ui`. Cards just write one line:
 *
 *   <Shell as="article" aria-label="…">
 *     <ShareTrigger metadata={...} />
 *     {cardBody()}
 *   </Shell>
 */
import { createSignal, Show } from "solid-js";
import { shareCard } from "./dispatch";
import { buildShareText } from "./text";
import type { CardType } from "./categories";
import type { ShareEntity, ShareTab } from "../utils/share-url";
import ShareFallbackModal from "../../components/solid/ShareFallbackModal";
import "./ShareTrigger.css";

export interface ShareTriggerMetadata {
  /** Card kind — drives the OG route URL + share-text category. */
  cardType: CardType;
  /** Primary entity. Drives the canonical URL + OG image route. */
  entity: ShareEntity;
  /** Display name of the primary entity (used in the post copy). */
  entityName: string;
  /** Tab the recipient lands on. Same enum as `ShareTab`. */
  tab: ShareTab;
  /** Optional compared entity for compare cards. When set, the OG
   *  URL uses the compare-route shape with both entities encoded. */
  comparedEntity?: ShareEntity;
}

export interface ShareTriggerProps {
  metadata: ShareTriggerMetadata;
  ariaLabel?: string;
}

interface FallbackState {
  blob: Blob;
  text: string;
  url: string;
}

export default function ShareTrigger(props: ShareTriggerProps) {
  const [loading, setLoading] = createSignal(false);
  const [fallback, setFallback] = createSignal<FallbackState | null>(null);

  const pngUrl = (): string => {
    const m = props.metadata;
    const cardSeg = encodeURIComponent(m.cardType);
    if (m.comparedEntity) {
      return `/og/compare/${cardSeg}/${m.entity.sport}/${m.entity.type}/${m.entity.id}/vs/${m.comparedEntity.type}/${m.comparedEntity.id}`;
    }
    return `/og/${cardSeg}/${m.entity.sport}/${m.entity.type}/${m.entity.id}`;
  };

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    if (loading()) return;

    const m = props.metadata;
    const { text, url } = buildShareText({
      entityName: m.entityName,
      cardType: m.cardType,
      entity: m.entity,
      tab: m.tab,
    });

    setLoading(true);
    const result = await shareCard({
      pngUrl: pngUrl(),
      text,
      url,
      title: m.entityName,
    });
    setLoading(false);

    if (result.kind === "fallback") {
      setFallback({ blob: result.blob, text, url });
    } else if (result.kind === "error") {
      // Surface to the console for now; production telemetry hook
      // can land alongside dispatch error-reporting later.
      console.error("Share failed:", result.message);
    }
  }

  return (
    <>
      <div class="share-trigger-root">
        <button
          type="button"
          class="share-trigger"
          aria-label={props.ariaLabel ?? "Share this card"}
          aria-busy={loading()}
          disabled={loading()}
          onClick={handleClick}
        >
          <Show
            when={!loading()}
            fallback={<span class="share-trigger-spinner" aria-hidden="true" />}
          >
            {/* Square-with-arrow share glyph. 18×18 viewBox; stroke
                inherits via currentColor. */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                 stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
              <path d="M13 6.5 V4 H4 v10 h9 v-2.5" />
              <path d="M9 7 L15 1" />
              <path d="M11 1 H15 V5" />
            </svg>
          </Show>
        </button>
      </div>
      <Show when={fallback()}>
        {(state) => (
          <ShareFallbackModal
            blob={state().blob}
            text={state().text}
            url={state().url}
            onClose={() => setFallback(null)}
          />
        )}
      </Show>
    </>
  );
}
