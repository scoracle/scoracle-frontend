/**
 * /stories — the sport's open storylines, ranked by cast heat.
 *
 * The Stories page is the 4th AppTray page (home, search, stories,
 * leaderboard — Scott, 2026-08-12): the first read surface over the one-rail
 * story archive (storylines + packets). Same page anatomy as /leaderboard:
 * the recessed NavWell band (sport tabs + the status scope as the conditions
 * line), then the Board — the printed artifact. The Board ranks entities
 * through a character's lens; here the lens is the Editor's compiled
 * narratives, so the sheet wears the narratives deck.
 *
 * Two scopes, one register:
 *   Active  — open storylines by cast heat (banked character scores; the
 *             server tie-breaks the common 99-heat ties — render as served)
 *   Archive — ?status=resolved|dormant, by recency; rows carry lifespan
 *             fields (first/last seen, resolved) instead of heat
 *
 * All state lives on the URL (?sport, ?status) so a view is shareable and
 * survives reload. Rows link to /story/{sport}/{id}-{slug}.
 */

import { createMemo, createSignal, Show, For, onMount, ErrorBoundary } from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";

import { SPORTS } from "../lib/types";
import { currentSport, setSport } from "../stores/sport";
import { getStories, type StoryListItem } from "../lib/data/stories.server";
import { tierColor } from "../lib/utils/tier-color";
import { paramValue } from "../lib/utils/search-params";
import { storyPath } from "../lib/utils/story-url";
import { formatDate } from "../lib/utils/date";
import NavWell from "../components/solid/NavWell";
import Select from "../components/solid/Select";
import Board, { BoardEmpty, BoardError, BoardLoading } from "../components/solid/Board";
import GutterAds from "../components/solid/GutterAds";
import "./stories.css";

type StoriesScope = "active" | "resolved" | "dormant";

const SPORT_ITEMS: ReadonlyArray<{ id: string; label: string }> = SPORTS.map((s) => ({
  id: s.idLower,
  label: s.display,
}));

const STATUS_OPTIONS = [
  { value: "active" as const, label: "Open" },
  { value: "resolved" as const, label: "Resolved" },
  { value: "dormant" as const, label: "Dormant" },
];

const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.idLower, s.display]),
);

const LIMIT = 50;

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

export default function Stories() {
  const [searchParams, setParams] = useSearchParams();
  const params = (key: string) => paramValue(searchParams[key]);
  const sport = () => (params("sport") ?? currentSport() ?? "nba").toLowerCase();
  const scope = (): StoriesScope => {
    const s = params("status");
    return s === "resolved" || s === "dormant" ? s : "active";
  };
  const isArchive = () => scope() !== "active";

  // Keep the rest of the site's sport in sync when arriving with an explicit
  // ?sport= (e.g. from the AppTray), so a later nav to a profile matches.
  onMount(() => {
    if (params("sport")) setSport(sport());
  });

  const [retryTick, setRetryTick] = createSignal(0);

  const data = createAsync(async () => {
    retryTick();
    try {
      const r = await getStories(sport(), isArchive() ? scope() : null, LIMIT);
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

  const sportName = () => SPORT_DISPLAY[sport()] ?? sport().toUpperCase();
  const scopeLine = () => {
    if (scope() === "resolved") return `${sportName()} · resolved storylines · by recency`;
    if (scope() === "dormant") return `${sportName()} · dormant storylines · by recency`;
    return `${sportName()} · open storylines · by cast heat`;
  };

  const canonicalUrl = () => {
    const p = new URLSearchParams({ sport: sport().toUpperCase() });
    if (isArchive()) p.set("status", scope());
    return `https://scoracle.com/stories?${p.toString()}`;
  };
  const pageTitle = () => `${sportName()} Stories`;

  return (
    <>
      <MetaProvider>
        <Title>{`${pageTitle()} · Scoracle`}</Title>
        <Meta property="og:title" content={`${pageTitle()} · Scoracle`} />
        <Meta property="og:description" content="The storylines of the moment — every cast, every turn, ranked by heat." />
        <Meta property="og:url" content={canonicalUrl()} />
      </MetaProvider>

      <main class="stories-main">
        <ErrorBoundary
          fallback={(err, reset) => (
            <Board
              title="Stories"
              titleAsHeading
              deck="narratives"
              scope={sportName()}
              ariaLabel={`${sportName()} stories`}
            >
              <BoardError detail={err instanceof Error ? err.message : String(err)} onRetry={reset} />
            </Board>
          )}
        >
          <NavWell
            items={SPORT_ITEMS}
            active={sport()}
            onSelect={(id) => setParams({ sport: id.toUpperCase() })}
            ariaLabel="Select sport"
            conditionsAriaLabel="Stories view controls"
            conditions={
              <Select
                options={STATUS_OPTIONS}
                value={scope()}
                onChange={(id) => setParams({ status: id === "active" ? null : id })}
                ariaLabel="Story status"
              />
            }
          />

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
                            <a class="story-cell" href={storyPath(sport(), story.storyline_id, story.title)}>
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
        </ErrorBoundary>

        <GutterAds />
      </main>
    </>
  );
}
