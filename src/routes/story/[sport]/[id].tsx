/**
 * /story/{sport}/{id}-{slug} — one storyline, whole.
 *
 * The Stories page's detail view (Scott, 2026-08-12): the storyline read as
 * one printed sheet — the Board primitive again, but carrying a story rather
 * than a rank register. Four movements down the sheet:
 *
 *   the story so far — the packet headline history, newest first: the
 *                      append-only supersedes chain IS the evolving story
 *   the latest packet — today's compiled snapshot: the register phrase, the
 *                      result line, grounded claims and quotes
 *   the cast         — every member with role and lifespan; departed members
 *                      keep their row (the part has its own lifespan)
 *   from the wire    — the 20 newest attached articles with provenance
 *
 * Mega-storylines are real (65 cast, 150 claims, ~90KB — storyline 8125):
 * claims, quotes and cast all truncate client-side behind "show all"
 * toggles. Backend caps are a recorded follow-up; don't wait on them.
 *
 * Phase 2 (recorded, not built): story-scoped voice takes arrive under a
 * `takes` key — they slot between the latest packet and the cast.
 *
 * Path shape mirrors profiles: id keys the route, the slug is display sugar
 * (story-url.ts). 404 on unknown/wrong-sport id.
 */

import { createMemo, createSignal, Show, For, onMount, ErrorBoundary, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { createAsync, useParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";

import { setSport } from "../../../stores/sport";
import { getSportByIdLower } from "../../../lib/types";
import {
  getStory,
  type StoryCastMember,
  type StoryClaim,
  type StoryQuote,
} from "../../../lib/data/stories.server";
import { parseEntityIdParam, profilePath } from "../../../lib/utils/profile-url";
import { storiesPath } from "../../../lib/utils/story-url";
import { formatDate } from "../../../lib/utils/date";
import Board, { BoardError, BoardLoading } from "../../../components/solid/Board";
import GutterAds from "../../../components/solid/GutterAds";
import "../../story.css";

/** How much of a long list the sheet shows before the "show all" toggle. */
const CLAIMS_SHOWN = 8;
const QUOTES_SHOWN = 3;
const CAST_SHOWN = 12;

/** "passing_mention" → "passing mention". */
function roleLabel(role: string | null): string | null {
  return role ? role.replace(/_/g, " ") : null;
}

/** Eager warm (Scott, 2026-08-21): a hovered or in-flight link to one
 *  storyline starts its read before the click lands. Skipped at intent
 *  "initial" — hydration already holds the SSR payload. */
export function preload({ params, intent }: RoutePreloadFuncArgs) {
  if (isServer || intent === "initial") return;
  const sport = (params.sport ?? "").toLowerCase();
  const id = parseEntityIdParam(params.id);
  if (!sport || !id) return;
  getStory(sport, id).catch(() => {});
}

/** A member's lifespan in the story: "Aug 2 – Aug 8", one date when equal. */
function memberSpan(member: StoryCastMember): string | null {
  const joined = formatDate(member.joined_at ?? undefined);
  const last = formatDate(member.last_seen_at ?? undefined);
  if (!joined && !last) return null;
  return joined && last && joined !== last ? `${joined} – ${last}` : joined || last;
}

/** A list section with a client-side cap and a "show all" toggle — the
 *  defensive-rendering contract for mega-storylines. `inList` seats the
 *  toggle in an `<li>` so `<ul>` consumers stay valid markup. */
function Truncated<T>(props: {
  items: readonly T[];
  shown: number;
  label: string;
  inList?: boolean;
  children: (item: T) => JSX.Element;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const visible = () => (expanded() ? props.items : props.items.slice(0, props.shown));
  const toggle = () => (
    <button type="button" class="story-show-all" onClick={() => setExpanded((v) => !v)}>
      {expanded() ? "Show fewer" : `Show all ${props.items.length} ${props.label}`}
    </button>
  );
  return (
    <>
      <For each={visible()}>{(item) => props.children(item)}</For>
      <Show when={props.items.length > props.shown}>
        <Show when={props.inList} fallback={toggle()}>
          <li class="story-toggle-row">{toggle()}</li>
        </Show>
      </Show>
    </>
  );
}

export default function StoryPage() {
  const routeParams = useParams();
  const sport = () => (routeParams.sport ?? "").toLowerCase();
  const storyId = () => parseEntityIdParam(routeParams.id);
  const validSport = () => Boolean(getSportByIdLower(sport()));
  const sportName = () => getSportByIdLower(sport())?.display ?? sport().toUpperCase();

  onMount(() => {
    if (validSport()) setSport(sport());
  });

  const [retryTick, setRetryTick] = createSignal(0);

  const data = createAsync(async () => {
    retryTick();
    if (!validSport() || !storyId()) return { kind: "missing" as const };
    try {
      const story = await getStory(sport(), storyId()!);
      return story ? { kind: "ok" as const, story } : { kind: "missing" as const };
    } catch (err) {
      return { kind: "error" as const, error: err };
    }
  });
  const story = () => {
    const d = data();
    return d?.kind === "ok" ? d.story : null;
  };
  const dataError = () => {
    const d = data();
    return d?.kind === "error" ? d.error : null;
  };
  const missing = () => data()?.kind === "missing";
  const retryStory = () => setRetryTick((tick) => tick + 1);

  // Departed members close the cast (their part ended); within each half the
  // served order stands.
  const cast = createMemo<StoryCastMember[]>(() => {
    const members = story()?.cast ?? [];
    return [...members.filter((m) => !m.left_at), ...members.filter((m) => m.left_at)];
  });

  const packet = () => story()?.latest_packet ?? null;
  const claims = (): StoryClaim[] => packet()?.claims ?? [];
  const quotes = (): StoryQuote[] => packet()?.quotes ?? [];
  const articles = () => story()?.articles ?? [];

  /** The masthead's second line: "Football · open · Aug 2 – Aug 8". */
  const scopeLine = () => {
    const s = story();
    if (!s) return sportName();
    const first = formatDate(s.first_seen_at ?? undefined);
    const last = formatDate(s.last_seen_at ?? undefined);
    const span = first && last && first !== last ? `${first} – ${last}` : last || first;
    const status = s.status === "resolved" && s.resolved_at
      ? `resolved ${formatDate(s.resolved_at)}`
      : s.status;
    return [sportName(), status, span].filter(Boolean).join(" · ");
  };

  /** Only players and teams have profiles to walk to — persons and other
   *  entity types print as plain type. */
  const memberHref = (member: StoryCastMember): string | null =>
    member.entity_type === "player" || member.entity_type === "team"
      ? profilePath(sport(), member.entity_type, member.entity_id, { name: member.name })
      : null;

  const pageTitle = () => story()?.title ?? "Story";

  return (
    <>
      <MetaProvider>
        <Title>{`${pageTitle()} · Scoracle`}</Title>
        <Meta property="og:title" content={`${pageTitle()} · Scoracle`} />
        <Show when={story()?.latest_packet?.headline}>
          {(h) => <Meta property="og:description" content={h()} />}
        </Show>
      </MetaProvider>

      <main class="story-main">
        <ErrorBoundary
          fallback={(err, reset) => (
            <Board title="Story" titleAsHeading deck="narratives" scope={sportName()} ariaLabel="Story">
              <BoardError detail={err instanceof Error ? err.message : String(err)} onRetry={reset} />
            </Board>
          )}
        >
          <Show when={data()} fallback={<BoardLoading label="Story loading" />}>
            <Show
              when={!missing()}
              fallback={
                <Board title="Story not found" titleAsHeading deck="narratives" scope={sportName()} ariaLabel="Story not found">
                  <HttpStatusCode code={404} />
                  <div class="story-section">
                    <p class="story-quiet">There's no storyline at this address.</p>
                    <p><a class="story-back" href={storiesPath(validSport() ? sport() : "nba")}>Back to stories</a></p>
                  </div>
                </Board>
              }
            >
              <Show
                when={dataError()}
                keyed
                fallback={
                  <Show when={story()} keyed>
                    {(s) => (
                      <Board
                        title={s.title}
                        titleAsHeading
                        deck="narratives"
                        scope={scopeLine()}
                        count={`${s.cast.length} in the cast`}
                        ariaLabel={`${sportName()} storyline`}
                      >
                        <Show when={s.resolution}>
                          {(r) => <p class="story-resolution">{r()}</p>}
                        </Show>

                        {/* ─── The story so far — the packet headline history.
                            The supersedes chain, newest first: each row is the
                            day the story changed shape. */}
                        <Show when={s.packets.length > 0}>
                          <section class="story-section" aria-label="Headline history">
                            <h2 class="story-section-head">The story so far</h2>
                            <ol class="story-history">
                              <For each={s.packets}>
                                {(p) => (
                                  <li class="story-history-row">
                                    <span class="story-history-day">{formatDate(p.day)}</span>
                                    <span class="story-history-headline">{p.headline ?? s.title}</span>
                                  </li>
                                )}
                              </For>
                            </ol>
                          </section>
                        </Show>

                        {/* ─── The latest packet — today's compiled snapshot. */}
                        <Show when={packet()} keyed>
                          {(p) => (
                            <section class="story-section" aria-label="Latest packet">
                              <h2 class="story-section-head">
                                The latest
                                <Show when={p.register}>
                                  {(r) => <span class="story-register"> · {r()}</span>}
                                </Show>
                              </h2>
                              <Show when={p.headline}>
                                {(h) => <p class="story-latest-headline">{h()}</p>}
                              </Show>
                              <Show when={p.facts?.result_line}>
                                {(line) => <p class="story-result-line">{line()}</p>}
                              </Show>
                              <Show when={p.register_phrase}>
                                {(phrase) => <blockquote class="story-phrase">{phrase()}</blockquote>}
                              </Show>
                              <Show when={claims().length > 0}>
                                <ul class="story-claims">
                                  <Truncated items={claims()} shown={CLAIMS_SHOWN} label="claims" inList>
                                    {(claim) => (
                                      <li class="story-claim">
                                        {claim.fact}
                                        <Show when={claim.source}>
                                          {(src) => <span class="story-source"> — {src()}</span>}
                                        </Show>
                                      </li>
                                    )}
                                  </Truncated>
                                </ul>
                              </Show>
                              <Show when={quotes().length > 0}>
                                <div class="story-quotes">
                                  <Truncated items={quotes()} shown={QUOTES_SHOWN} label="quotes">
                                    {(quote) => (
                                      <blockquote class="story-quote">
                                        {quote.quote}
                                        <Show when={quote.source}>
                                          {(src) => <cite class="story-source">{src()}</cite>}
                                        </Show>
                                      </blockquote>
                                    )}
                                  </Truncated>
                                </div>
                              </Show>
                            </section>
                          )}
                        </Show>

                        {/* Phase 2 slot: story-scoped voice takes land here as
                            a `takes` section — between the packet and the cast. */}

                        {/* ─── The cast — roles and lifespans; departed members
                            keep their row, closed by exit. */}
                        <Show when={cast().length > 0}>
                          <section class="story-section" aria-label="Cast">
                            <h2 class="story-section-head">The cast</h2>
                            <ul class="story-cast">
                              <Truncated items={cast()} shown={CAST_SHOWN} label="cast members" inList>
                                {(member) => (
                                  <li class="story-member" classList={{ "story-member-departed": Boolean(member.left_at) }}>
                                    <Show
                                      when={memberHref(member)}
                                      fallback={<span class="story-member-name">{member.name}</span>}
                                    >
                                      {(href) => <a class="story-member-name" href={href()}>{member.name}</a>}
                                    </Show>
                                    <span class="story-member-part">
                                      {[
                                        roleLabel(member.role),
                                        memberSpan(member),
                                        member.left_at
                                          ? `left ${formatDate(member.left_at)}${member.exit_reason ? ` (${member.exit_reason.replace(/_/g, " ")})` : ""}`
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  </li>
                                )}
                              </Truncated>
                            </ul>
                          </section>
                        </Show>

                        {/* ─── From the wire — the attached articles. */}
                        <Show when={articles().length > 0}>
                          <section class="story-section" aria-label="Source articles">
                            <h2 class="story-section-head">From the wire</h2>
                            <ul class="story-articles">
                              <For each={articles()}>
                                {(article) => (
                                  <li class="story-article">
                                    <a
                                      class="story-article-title"
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {article.title}
                                    </a>
                                    <span class="story-article-meta">
                                      {[article.source, formatDate(article.published_at ?? undefined)]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  </li>
                                )}
                              </For>
                            </ul>
                          </section>
                        </Show>
                      </Board>
                    )}
                  </Show>
                }
              >
                {(err) => (
                  <BoardError
                    detail={err instanceof Error ? err.message : String(err)}
                    onRetry={retryStory}
                  />
                )}
              </Show>
            </Show>
          </Show>
        </ErrorBoundary>

        <GutterAds />
      </main>
    </>
  );
}
