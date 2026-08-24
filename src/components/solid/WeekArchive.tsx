/**
 * WeekArchive — the merged week timeline (the NavRail time-axis convention,
 * 2026-08-24): when the rail's week dropdown leaves "Today", the deck is
 * replaced by this view — every seat's (score, headline, body) entries for the
 * selected Jan-1-anchored week, newest first, grouped by day.
 *
 * Two levels: the TIMELINE (headline + score + seat per row; the reader scans
 * the week) and the ARCHIVE CARD (clicking a headline deals that generation as
 * a full card face — score top-middle, hook, body — "go to that card where the
 * full body lives"). Back returns to the timeline. Card selection is local
 * state: the URL owns the week (shareable); the open entry is a reading
 * position, not an address.
 *
 * One fetch powers both levels (getHeadlines); the card contract is what makes
 * the archive uniform — six seats, one triple shape.
 */

import { For, Show, createMemo, createSignal, createEffect, on } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile, type ProfileTab } from "../../contexts/profile";
import { getHeadlines, type HeadlineEntry } from "../../lib/data/headlines.server";
import { parseWeekKey, weekLabel } from "../../lib/utils/week";
import { pillarLabel } from "../../lib/cards/card-meta";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./WeekArchive.css";

const SEAT_LABELS: Record<string, string> = {
  scouting: "Scouting",
  narratives: "Narratives",
  transfers: "Transfers",
  vibe: "Vibe",
  momentum: "Momentum",
  sigil: "Sigil",
};

function seatLabel(card: string, entityType: string): string {
  return pillarLabel(card as ProfileTab, entityType as "player" | "team") ?? SEAT_LABELS[card] ?? card;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${d.getHours() < 12 ? "am" : "pm"}`;
}

export default function WeekArchive() {
  const ctx = useProfile();

  const ref = () => parseWeekKey(ctx.week());
  const archive = createAsync(async () => {
    const r = ref();
    if (!r) return null;
    return getHeadlines(ctx.sport(), ctx.type(), ctx.id(), r.year, r.week);
  });

  // The open entry, keyed (card, generated_at) — stable across refetches.
  const [openKey, setOpenKey] = createSignal<string | null>(null);
  const entryKey = (e: HeadlineEntry) => `${e.card}|${e.generated_at}`;
  // A week change closes any open card — the reading position belongs to the week.
  createEffect(on(() => ctx.week(), () => setOpenKey(null), { defer: true }));

  const entries = () => archive()?.entries ?? [];
  const open = createMemo(() => entries().find((e) => entryKey(e) === openKey()) ?? null);

  // Timeline rows grouped by day, newest day first (entries arrive newest-first).
  const days = createMemo(() => {
    const groups: Array<{ day: string; rows: HeadlineEntry[] }> = [];
    for (const e of entries()) {
      const day = dayLabel(e.generated_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.rows.push(e);
      else groups.push({ day, rows: [e] });
    }
    return groups;
  });

  const openEntry = (e: HeadlineEntry) => {
    setOpenKey(entryKey(e));
    // Keep the rail's highlight honest: the open archive card IS that seat.
    ctx.setActiveTab(e.card as ProfileTab);
  };

  return (
    <div class="week-archive">
      <Show when={open()} fallback={
        <Show
          when={entries().length > 0}
          fallback={
            <Show when={archive()}>
              <EmptyCard message="No headlines filed this week." />
            </Show>
          }
        >
          <section class="week-timeline" aria-label="Week headlines">
            <p class="card-identifier">
              {ref() ? weekLabel(ref()!) : ""} — every card's headlines, newest first
            </p>
            <For each={days()}>
              {(group) => (
                <div class="week-day">
                  <h3 class="week-day-label">{group.day}</h3>
                  <ol class="week-rows">
                    <For each={group.rows}>
                      {(e) => (
                        <li class="week-row">
                          <button type="button" class="week-row-button" onClick={() => openEntry(e)}>
                            <span class="week-row-meta">
                              <span class="week-row-seat">{seatLabel(e.card, ctx.type())}</span>
                              <Show when={e.score != null}>
                                <span class="week-row-score">{e.score}</span>
                              </Show>
                              <span class="week-row-time">{timeLabel(e.generated_at)}</span>
                            </span>
                            <span class="week-row-headline">{e.headline}</span>
                          </button>
                        </li>
                      )}
                    </For>
                  </ol>
                </div>
              )}
            </For>
          </section>
        </Show>
      }>
        {(e) => (
          <div class="week-open">
            <button type="button" class="week-back" onClick={() => setOpenKey(null)}>
              ← Back to {ref() ? weekLabel(ref()!) : "the week"}
            </button>
            <Card
              id={e().card as ProfileTab}
              as="article"
              aria-label={seatLabel(e().card, ctx.type())}
              class="week-archive-card"
              score={() => e().score}
            >
              <p class="card-identifier">
                {seatLabel(e().card, ctx.type())} — {dayLabel(e().generated_at)}, {timeLabel(e().generated_at)}
              </p>
              <h2 class="card-hook">{e().headline}</h2>
              <Show when={e().body}>
                <GemmaSummary text={e().body!} class="week-archive-body" />
              </Show>
              <Show when={e().items?.length}>
                <div class="news-narratives">
                  <For each={e().items!}>
                    {(n) => (
                      <article class="narrative">
                        <h3 class="narrative-title">{n.title}</h3>
                        <GemmaSummary text={n.body} class="narrative-body" />
                      </article>
                    )}
                  </For>
                </div>
              </Show>
            </Card>
          </div>
        )}
      </Show>
    </div>
  );
}
