/**
 * ShareTrigger — the small button Cards drop inside their Shell to
 * expose share. Positioned absolute top-right of the nearest
 * positioned ancestor (the wrapping Shell — `.card` is
 * `position: relative` per global.css).
 *
 * Flow:
 *   click → navigator.share({ title, text, url })
 *     ↓ on browsers without the Web Share API (Firefox desktop)
 *   fallback → mount <ShareFallbackModal> (open X / FB composer + copy link)
 *
 * No image is shared client-side: the share target's crawler renders the
 * OG card from the URL's `og:image` meta. One image, sourced once.
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
  /** Card kind — drives the share-text category. */
  cardType: CardType;
  /** Primary entity. Drives the canonical URL. */
  entity: ShareEntity;
  /** Display name of the primary entity (used in the post copy). */
  entityName: string;
  /** Tab the recipient lands on. Same enum as `ShareTab`. */
  tab: ShareTab;
}

export interface ShareTriggerProps {
  metadata: ShareTriggerMetadata;
  ariaLabel?: string;
}

interface FallbackState {
  text: string;
  url: string;
}

export default function ShareTrigger(props: ShareTriggerProps) {
  const [fallback, setFallback] = createSignal<FallbackState | null>(null);

  async function handleClick(e: MouseEvent) {
    e.preventDefault();

    const m = props.metadata;
    const { text, url } = buildShareText({
      entityName: m.entityName,
      cardType: m.cardType,
      entity: m.entity,
      tab: m.tab,
    });

    const result = await shareCard({ text, url, title: m.entityName });

    if (result.kind === "fallback") {
      setFallback({ text, url });
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
          onClick={handleClick}
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
        </button>
      </div>
      <Show when={fallback()}>
        {(state) => (
          <ShareFallbackModal
            text={state().text}
            url={state().url}
            onClose={() => setFallback(null)}
          />
        )}
      </Show>
    </>
  );
}
