/**
 * StoriesBoard — the sport's open storylines, ranked by cast heat, printed
 * on the Board.
 *
 * The Stories register moved onto the leaderboard page (Scott, 2026-09-07:
 * "it fits naturally and doesn't need its own page") — it is the leaderboard's
 * ?board=stories, sharing that page's NavWell and URL state. This component
 * is the sheet alone: the page owns the tabs, the sport and status Selects,
 * and the meta tags; it hands down the resolved sport and scope. The Board
 * ranks entities through a character's lens; here the lens is the Editor's
 * compiled narratives, so the sheet wears the narratives deck.
 *
 * Two scopes, one register:
 *   Active  — open storylines by cast heat (banked character scores; the
 *             server tie-breaks the common 99-heat ties — render as served)
 *   Archive — resolved|dormant, by recency; rows carry lifespan fields
 *             (first/last seen, resolved) instead of heat
 *
 * Rows link to /story/{sport}/{id}-{slug}.
 */

import { createMemo, createSignal, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { SPORTS } from "../../lib/types";
import { getStories, type StoryListItem } from "../../lib/data/stories.server";
import { tierColor } from "../../lib/utils/tier-color";
import { storyPath } from "../../lib/utils/story-url";
import { formatDate } from "../../lib/utils/date";
import Board, { BoardEmpty, BoardError, BoardLoading } from "./Board";
import "./StoriesBoard.css";

export type StoriesScope = "active" | "resolved" | "dormant";

export const STORIES_STATUS_OPTIONS = [
  { value: "active" as const, label: "Open" },
  { value: "resolved" as const, label: "Resolved" },
  { value: "dormant" as const, label: "Dormant" },
];

export const STORIES_LIMIT = 50;

/** Resolve the ?status= value to a scope; anything else is the open list. */
export function storiesScope(status: string | undefined | null): StoriesScope {
  return status === "resolved" || status === "dormant" ? status : "active";
}

const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.idLower, s.display]),
);

/** Subject cast, named quietly: the first few names carry the row. */
function castLine(story: StoryListItem): string | null {
  const cast = story.cast ?? [];
  if (cast.length === 0) return null;
  const names = cast.slice(0, 3).map((m) => m.name);
  const more = cast.length - names.length;
  return more > 0 ? `${names.join(", ")} +${more}` : names.join(", ");
}

/** The archive row's lifespan: "Jul 26 – Jul 29 · resolved Aug 1". */
function lifespanLine(story: StoryListItem): string | null {
  const first = formatDate(story.first_seen_at ?? undefined);
  const last = formatDate(story.last_seen_at ?? undefined);
  const span = first && last && first !== last ? `${first} – ${last}` : last || first;
  const resolved = story.resolved_at ? `resolved ${formatDate(story.resolved_at)}` : null;
  return [span, resolved].filter(Boolean).join(" · ") || null;
}

interface StoriesBoardProps {
  /** Lowercase sport id (nba | nfl | football). */
  sport: string;
  scope: StoriesScope;
}

export default function StoriesBoard(props: StoriesBoardProps) {
  const isArchive = () => props.scope !== "active";
  const [retryTick, setRetryTick] = createSignal(0);

  const data = createAsync(async () => {
    retryTick();
    try {
      const r = await getStories(props.sport, isArchive() ? props.scope : null, STORIES_LIMIT);
      return { kind: "ok" as const, stories: r?.stories ?? [] };
    } catch (err) {
      return { kind: "error" as const, error: err };
    }
  });
  const dataError = () => {
    const d = data();
    return d?.kind === "error" ? d.error : null;
  };
  const stories = createMemo<StoryListItem[]>(() => {
    const d = data();
    return d && d.kind === "ok" ? d.stories : [];
  });
  const retryStories = () => setRetryTick((tick) => tick + 1);

  const sportName = () => SPORT_DISPLAY[props.sport] ?? props.sport.toUpperCase();
  const scopeLine = () => {
    if (props.scope === "resolved") return `${sportName()} · resolved storylines · by recency`;
    if (props.scope === "dormant") return `${sportName()} · dormant storylines · by recency`;
    return `${sportName()} · open storylines · by cast heat`;
  };

  return (
    <div class="stories-board">
    <Board
      title="Stories"
      titleAsHeading
      deck="narratives"
      scope={scopeLine()}
      metricLabel={stories().length > 0 ? (isArchive() ? "Reports" : "Heat") : null}
      count={stories().length > 0 ? `${stories().length} storylines` : null}
      ariaLabel={`${sportName()} stories`}
    >
      <Show when={data()} fallback={<BoardLoading label={`${sportName()} stories loading`} />}>
        <Show
          when={dataError()}
          keyed
          fallback={
            <Show
              when={stories().length > 0}
              fallback={
                <BoardEmpty
                  message={isArchive() ? "Nothing in this archive yet." : "No open storylines right now."}
                  ariaLabel="No storylines"
                />
              }
            >
              <ol class="board-register">
                <For each={stories()}>
                  {(story, i) => (
                    <li class="board-row">
                      <span class="board-rank">{String(i() + 1).padStart(2, "0")}</span>
                      <a class="story-cell" href={storyPath(props.sport, story.storyline_id, story.title)}>
                        {/* headline is null until a packet compiles —
                            the storyline's title carries the row. */}
                        <span class="story-headline">{story.headline ?? story.title}</span>
                        <Show when={isArchive() ? lifespanLine(story) : castLine(story)}>
                          {(line) => <span class="story-sub">{line()}</span>}
                        </Show>
                        <Show when={!isArchive() && (story.report_count > 1 || story.register)}>
                          <span class="story-trace">
                            {story.report_count > 1 ? `${story.report_count} reports` : ""}
                            <Show when={story.register}>
                              {(r) => (
                                <>
                                  {story.report_count > 1 ? " · " : ""}
                                  <span class="story-register">{r()}</span>
                                </>
                              )}
                            </Show>
                          </span>
                        </Show>
                      </a>
                      <span
                        class="story-metric"
                        style={!isArchive() && story.heat != null ? { color: tierColor(story.heat) } : undefined}
                      >
                        {isArchive() ? String(story.report_count) : String(story.heat ?? "—")}
                      </span>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
          }
        >
          {(err) => (
            <BoardError
              detail={err instanceof Error ? err.message : String(err)}
              onRetry={retryStories}
            />
          )}
        </Show>
      </Show>
    </Board>
    </div>
  );
}
