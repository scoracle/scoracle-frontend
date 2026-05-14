/**
 * VibeCard — Gemma-generated 1-100 sentiment rendered as a tarot card.
 *
 * Score → one of 11 major-arcana archetypes (see ~/scoracleWiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts). Card
 * chrome carries the archetype's Roman numeral in opposing corners
 * (top-left upright + bottom-right rotated 180°) — the v2 tarot-corner-
 * numeral convention.
 *
 * Reversal mechanic: when the score has dropped >= 4 points since the
 * user's last viewing (cached in localStorage per ./lib/vibe/reversal.ts),
 * the central illustration rotates 180° and the italic subtext gains a
 * "↓ from N" suffix. Asymmetric on purpose — quiet on the way up.
 *
 * Null state: handed off to the shared <EmptyCard> (deck-back face +
 * "watching for mentions") — same visual every News-mode tab uses when
 * it has nothing to show.
 *
 * Share: a small share button at top-right of the card. Click renders the
 * VibeCard inside a <ShareFrame> off-screen, snapshots it via html-to-image,
 * and either invokes Web Share API (when available — typically mobile) or
 * downloads the PNG + copies the canonical URL to clipboard. See
 * ~/scoracleWiki/wiki/Architecture/Share Frame.md for the contract.
 */

import { createEffect, createMemo, onCleanup, Show, createSignal, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { createAsync } from "@solidjs/router";
import { toBlob } from "html-to-image";

import { useProfile } from "../../contexts/profile";
import { useShell } from "./Shell";
import { getVibe } from "../../lib/data/vibe.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import ShareFrame from "./ShareFrame";
import "./content-cards.css";
import "./VibeCard.css";

/**
 * Map score 1-100 to one of the 5 percentile-tier colors used by PizzaChart.
 * Same palette across the site so a 73 in the vibe card reads the same
 * "above-average" green-blue as a 73 in a stats-percentile slice.
 */
function tierColor(score: number): string {
  if (score >= 81) return "var(--percentile-elite)";
  if (score >= 61) return "var(--percentile-above)";
  if (score >= 41) return "var(--percentile-average)";
  if (score >= 21) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}

interface ShareEntityFacts {
  name: string;
  imageUrl: string;
  context: string;
}

/**
 * Pull the share-frame header facts from entityDataStore. Same lookup logic
 * EntityMeta uses, so the share artifact's identification matches what's
 * shown in the live MetaShell.
 */
function readShareEntity(sport: string, type: string, id: string): ShareEntityFacts | null {
  if (type === "player") {
    const m = entityDataStore.getPlayerMetaSync(sport, id);
    if (!m) return null;
    const name = m.name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Unknown";
    let imageUrl = m.photo_url || "";
    if (!imageUrl && m.team?.id != null) {
      const team = entityDataStore.getTeamMetaSync(sport, String(m.team.id));
      imageUrl = team?.logo_url || "";
    }
    const context = [m.team?.name, sport.toUpperCase()].filter(Boolean).join(" · ");
    return { name, imageUrl, context };
  }
  const t = entityDataStore.getTeamMetaSync(sport, id);
  if (!t) return null;
  return {
    name: t.name || "Unknown",
    imageUrl: t.logo_url || "",
    context: [t.city, sport.toUpperCase()].filter(Boolean).join(" · "),
  };
}

function buildCanonicalUrl(sport: string, type: string, id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://scoracle.com";
  return `${origin}/profile?sport=${encodeURIComponent(sport.toUpperCase())}&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

export default function VibeCard() {
  const ctx = useProfile();
  const shell = useShell();
  const { sport, type, id } = ctx;

  const vibe = createAsync(() => getVibe(sport, type, id));

  // Compute reversal verdict + archetype lookup. evaluateReversal reads
  // from + writes to localStorage; the memo re-evaluates whenever the
  // fetched score changes.
  const reversal = createMemo(() => {
    const v = vibe();
    if (!v || v.sentiment == null) return { reversed: false, previousScore: null };
    return evaluateReversal({ sport, type, id }, v.sentiment);
  });

  const archetype = createMemo(() => {
    const v = vibe();
    return v && v.sentiment != null ? scoreToArchetype(v.sentiment) : null;
  });

  // Publish the archetype's Roman numeral directly into the parent
  // Shell's corner-numeral slot. Only publishes when VibeCard is the
  // active pane — sticky-mount keeps this component alive across tab
  // switches, so the effect itself drives the lifecycle. Other tabs
  // leave the slot empty → Shell falls back to the accent-circle dots.
  createEffect(() => {
    const isActive = ctx.mode() === "news" && ctx.newsSubTab() === "vibes";
    shell?.setCornerLabel(isActive ? archetype()?.numeral : undefined);
  });
  onCleanup(() => { shell?.setCornerLabel(undefined); });

  // ─── Share state + handler ───────────────────────────────────────────────
  const [shareOpen, setShareOpen] = createSignal(false);
  const [sharing, setSharing] = createSignal(false);
  let shareFrameRef: HTMLDivElement | undefined;

  const handleShare = async () => {
    if (sharing()) return;
    setSharing(true);
    setShareOpen(true);

    // Wait one tick so the Portal mounts the ShareFrame in the DOM before
    // html-to-image tries to read it.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // Second rAF to let img elements paint (img loads can race with the
    // first rAF on cold renders).
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      if (!shareFrameRef) throw new Error("ShareFrame ref missing");

      const blob = await toBlob(shareFrameRef, {
        pixelRatio: 2,
        backgroundColor: "#F4F1EB",
        cacheBust: true,
      });
      if (!blob) throw new Error("Snapshot returned null");

      const entity = readShareEntity(sport, type, id);
      const slug = entity?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entity";
      const filename = `scoracle-vibe-${slug}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const canonicalUrl = buildCanonicalUrl(sport, type, id);

      // Web Share API path (mobile + supported desktop browsers)
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        const arc = archetype();
        const score = vibe()?.sentiment;
        await navigator.share({
          files: [file],
          text: arc && score != null ? `${entity?.name ?? "Scoracle"} · vibe ${score} · ${arc.name}` : "Scoracle vibe",
          url: canonicalUrl,
        });
      } else {
        // Download fallback + copy URL to clipboard
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(canonicalUrl);
          }
        } catch {
          /* clipboard write failed — non-fatal */
        }
      }
    } catch (err) {
      // Swallow user-cancellation; log unexpected errors.
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("VibeCard share failed:", err);
      }
    } finally {
      setShareOpen(false);
      setSharing(false);
    }
  };

  // The card body — used both inline (in-app) and inside ShareFrame at share-time.
  // Returns fresh reactive JSX on each call.
  const cardBody = (): JSX.Element => {
    const arc = archetype();
    const row = vibe();
    if (!arc || !row || row.sentiment == null) return null;
    return (
      <article class="vibe-card">
        {/* Corner Roman numerals lifted to ContentShell (v2 chrome lift,
            2026-05-10) — the parent Shell publishes them via ctx.cornerLabel
            so they don't blink in/out as users flip tabs. Share path keeps
            its own numerals by passing `cornerLabel` to <ShareFrame> below. */}
        <div class="vibe-art" classList={{ reversed: reversal().reversed }}>
          <img src={`/vibe-art/${arc.slug}.svg`} alt="" crossorigin="anonymous" />
        </div>

        <div
          class="vibe-score"
          style={{ color: tierColor(row.sentiment as number) }}
          aria-label={`Vibe score ${row.sentiment} of 100`}
        >
          {row.sentiment}
        </div>

        <div class="vibe-archetype-name">{arc.name.toUpperCase()}</div>

        <div class="vibe-subtext">
          <span>{arc.vibe}</span>
          <Show when={reversal().reversed && reversal().previousScore != null}>
            <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
          </Show>
        </div>

        <footer class="vibe-credit" aria-hidden="true">
          <span>{row.model_version}</span>
          <span class="vibe-credit-dot">·</span>
          <span>{formatDate(row.generated_at)}</span>
        </footer>
      </article>
    );
  };

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <div class="vibe-card-wrapper">
              <button
                type="button"
                class="vibe-share-btn"
                classList={{ "is-busy": sharing() }}
                onClick={handleShare}
                aria-label="Share this vibe"
                title="Share"
              >
                <ShareIcon />
              </button>

              {cardBody()}

              <Show when={shareOpen()}>
                <Portal>
                  <div class="share-frame-offscreen" ref={(el) => { shareFrameRef = el; }}>
                    {(() => {
                      const entity = readShareEntity(sport, type, id);
                      return (
                        <ShareFrame
                          entityName={entity?.name ?? "Scoracle"}
                          entityImageUrl={entity?.imageUrl ?? ""}
                          entityContext={entity?.context ?? ""}
                          cardType="vibe"
                          canonicalUrl={buildCanonicalUrl(sport, type, id)}
                          computedAt={row().generated_at}
                          cornerLabel={archetype()?.numeral}
                        >
                          {cardBody()}
                        </ShareFrame>
                      );
                    })()}
                  </div>
                </Portal>
              </Show>
            </div>
          )}
        </Show>
      )}
    </Show>
  );
}

export function VibeCardSkeleton() {
  return (
    <div class="card-loading">
      <Skeleton shape="block" height={300} />
    </div>
  );
}

function ShareIcon() {
  // Simple share / upload glyph — arrow rising out of a tray, line-art only.
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 9 V 1.5" />
      <path d="M4 4.5 L 7 1.5 L 10 4.5" />
      <path d="M2.5 7 V 12 H 11.5 V 7" />
    </svg>
  );
}
