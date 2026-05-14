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
 * Share: a single <ShareButton> placement wires the entire share flow —
 * modal preview, X / Facebook intent URLs, copy-link, download PNG. The
 * preview callback returns the same `cardBody()` JSX the in-app view
 * renders, framed via <ShareFrame>. See `~/scoracleWiki/wiki/Architecture/
 * Share Frame.md` for the contract.
 */

import { createEffect, createMemo, onCleanup, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { useShell } from "./Shell";
import { getVibe } from "../../lib/data/vibe.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { buildShareUrl } from "../../lib/utils/share-url";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import EmptyCard from "./EmptyCard";
import ShareButton from "./ShareButton";
import ShareFrame from "./ShareFrame";
import Skeleton from "./Skeleton";
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

  // The card body — used both inline (in-app) and inside ShareFrame via
  // the ShareButton preview() callback. Returns fresh reactive JSX on
  // each call so the modal preview tracks the same signals as in-app.
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

  const sharePreview = (): JSX.Element => {
    const entity = readShareEntity(sport, type, id);
    const row = vibe();
    return (
      <ShareFrame
        entityName={entity?.name ?? "Scoracle"}
        entityImageUrl={entity?.imageUrl ?? ""}
        entityContext={entity?.context ?? ""}
        cardType="vibe"
        canonicalUrl={buildShareUrl({ sport, type, id }, "vibes")}
        computedAt={row?.generated_at}
        cornerLabel={archetype()?.numeral}
      >
        {cardBody()}
      </ShareFrame>
    );
  };

  function shareText(): string {
    const arc = archetype();
    const score = vibe()?.sentiment;
    const entity = readShareEntity(sport, type, id);
    if (arc && score != null && entity?.name) {
      return `${entity.name} · vibe ${score} · ${arc.name}`;
    }
    return "Scoracle vibe";
  }

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <div class="vibe-card-wrapper">
              <ShareButton
                entity={{ sport, type, id }}
                tab="vibes"
                cardType="vibe"
                entityName={readShareEntity(sport, type, id)?.name ?? "Scoracle"}
                shareText={shareText()}
                preview={sharePreview}
                class="vibe-share-btn"
                ariaLabel="Share this vibe"
              />

              {cardBody()}
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
