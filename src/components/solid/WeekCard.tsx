/**
 * WeekCard — one seat's card face in week mode (the deck-of-cards correction,
 * Scott 2026-08-24: "We CANNOT lose the cards... the deck reflects the week
 * selected").
 *
 * When the rail's Week dropdown leaves "Today", the deck stays EXACTLY the
 * deck — same panes, pile, rail, arrows, swipe — and each seat's pane renders
 * this instead of its live card: the seat's headlines for the selected week,
 * on the card face, newest first. Tapping a headline turns the face into THAT
 * day's card — score top-middle, hook, full body (the Journalist's storylines
 * included) — with a back step to the week list. The reader toggles through
 * the cards; every card is that week's card.
 *
 * All six seats share ONE /headlines fetch (query() dedupes by key), so week
 * mode costs one read for the whole deck.
 */

import { For, Show, createMemo, createSignal, createEffect, on } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile, type ProfileTab } from "../../contexts/profile";
import { getHeadlines, type HeadlineEntry } from "../../lib/data/headlines.server";
import { parseWeekKey, weekLabelFor } from "../../lib/utils/week";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./WeekCard.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${d.getHours() < 12 ? "am" : "pm"}`;
}

export default function WeekCard(props: { id: ProfileTab; label: string }) {
  const ctx = useProfile();

  const ref = () => parseWeekKey(ctx.week());
  const archive = createAsync(async () => {
    const r = ref();
    if (!r) return null;
    return getHeadlines(ctx.sport(), ctx.type(), ctx.id(), r.year, r.week);
  });

  // The week's display label, from the archive's own resolved window (mig 237:
  // the backend names the week; the frontend never does calendar math).
  const label = () => {
    const a = archive();
    if (!a?.starts_at) return "";
    return weekLabelFor({
      season: a.year, week_no: a.week,
      starts_at: a.starts_at, ends_at: a.ends_at,
      is_current: false, sealed: false,
    });
  };

  // This seat's entries, newest first (the endpoint's order).
  const mine = createMemo(() =>
    (archive()?.entries ?? []).filter((e) => e.card === props.id),
  );

  // The open entry — a reading position on THIS card, keyed by generated_at so
  // it survives refetches. A week change closes it (the position belongs to
  // the week); so does navigating entities (archive re-keys and misses).
  const [openAt, setOpenAt] = createSignal<string | null>(null);
  createEffect(on(() => ctx.week(), () => setOpenAt(null), { defer: true }));
  const open = createMemo(() => mine().find((e) => e.generated_at === openAt()) ?? null);

  // The face's score: the open day's, else the week's newest — the ring stays
  // honest about what the face is showing.
  const faceScore = () => (open() ?? mine()[0])?.score ?? null;

  return (
    <Show
      when={mine().length > 0}
      fallback={
        <Show when={archive()}>
          <EmptyCard message={`No ${props.label} headlines this week.`} />
        </Show>
      }
    >
      <Card
        id={props.id}
        as="article"
        aria-label={props.label}
        class="week-card"
        score={faceScore}
      >
        <Show when={open()} fallback={
          <>
            <p class="card-identifier">
              {label()} — {props.label}, newest first
            </p>
            <ol class="week-rows">
              <For each={mine()}>
                {(e: HeadlineEntry) => (
                  <li class="week-row">
                    <button type="button" class="week-row-button" onClick={() => setOpenAt(e.generated_at)}>
                      <span class="week-row-meta">
                        <span class="week-row-when">{dayLabel(e.generated_at)}, {timeLabel(e.generated_at)}</span>
                        <Show when={e.score != null}>
                          <span class="week-row-score">{e.score}</span>
                        </Show>
                      </span>
                      <span class="week-row-headline">{e.headline}</span>
                    </button>
                  </li>
                )}
              </For>
            </ol>
          </>
        }>
          {(e) => (
            <>
              <button type="button" class="week-back" onClick={() => setOpenAt(null)}>
                ← {label() || "Back"}
              </button>
              <p class="card-identifier">
                {props.label} — {dayLabel(e().generated_at)}, {timeLabel(e().generated_at)}
              </p>
              <h2 class="card-hook">{e().headline}</h2>
              <Show when={e().body}>
                <GemmaSummary text={e().body!} class="week-card-body" />
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
            </>
          )}
        </Show>
      </Card>
    </Show>
  );
}
