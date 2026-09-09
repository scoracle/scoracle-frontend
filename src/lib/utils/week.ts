/**
 * week — the profile time axis (the NavRail convention, 2026-08-24; re-anchored
 * 2026-09-04, backend mig 237): weeks are the SPORT'S OWN reporting calendar,
 * served by `/{sport}/weeks` — week 1 opens on the season's opening day (ET)
 * and the cycle runs round-the-year until the next season re-anchors. No local
 * arithmetic: the backend's season_weeks table is the one clock, and this
 * module only parses keys and renders labels from what the API says.
 *
 * A selected week travels in the URL as `?week=SEASON-N` ("2025-13"); absent
 * means the live cards — labeled by the current week when the sport's grid
 * names one, "Today" otherwise (the dropdown's default option, 2026-09-07).
 *
 * A week READS as its season and its number and nothing else — "2026 · Week 3"
 * (Scott, 2026-09-08). The API's `starts_at`/`ends_at` still ride the
 * SportWeek rows because they are the window the backend cut, but no frontend
 * surface renders a date: the date was answering a question ("which days is
 * this?") nobody was asking, and it crowded the one that mattered.
 */

export interface WeekRef {
  /** The sport-season the week belongs to (the API's `year`/`season`). */
  year: number;
  week: number;
}

/** One row of the sport's reporting calendar (GET /{sport}/weeks). */
export interface SportWeek {
  season: number;
  week_no: number;
  starts_at: string;
  ends_at: string;
  is_current: boolean;
  sealed: boolean;
}

export interface WeeksResponse {
  page: "weeks";
  sport: string;
  current: { season: number; week: number } | null;
  weeks: SportWeek[];
}

/** Parse a `?week=` value ("2025-13"). Null for absent/garbage — i.e. Today. */
export function parseWeekKey(raw: string | null | undefined): WeekRef | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 60) return null;
  return { year, week };
}

export function weekKey(ref: WeekRef): string {
  return `${ref.year}-${ref.week}`;
}

/** The calendar row a ref names, if the sport's grid has it. */
export function findWeek(weeks: SportWeek[] | undefined, ref: WeekRef | null): SportWeek | undefined {
  if (!weeks || !ref) return undefined;
  return weeks.find((w) => w.season === ref.year && w.week_no === ref.week);
}

/**
 * "2026 · Week 3" — the ONE week name, everywhere (Scott, 2026-09-08: "I don't
 * need the dates in the frontend at all. We just want year and week. Week 1 is
 * week 1 of the season").
 *
 * The date window the backend cuts is still the truth underneath — it is what
 * decides which week a headline files into — but it is bookkeeping, not a
 * label: a reader picking a week wants the week's NUMBER, and the season it
 * belongs to so two "Week 1"s can never be confused. The dropdown's open list
 * and its closed trigger now read identically for the same reason; there is
 * nothing left to abbreviate.
 */
export function weekLabelFor(w: { season: number; week_no: number }): string {
  return `${w.season} · Week ${w.week_no}`;
}

/**
 * The rail dropdown's options. The default (value "") is the LIVE deck, but
 * it wears the current week's name rather than "Today" when the sport's grid
 * names one (Scott, 2026-09-07 — "Rather than saying 'today' the default
 * should show the week we're in"): the label-only reading, so the resting
 * selection still renders the live cards. No current week (offseason) or an
 * unloaded grid falls back to "Today". The elapsed weeks follow exactly as
 * the API orders them (newest first, across seasons).
 *
 * Every option now carries its season (2026-09-08), so the season-prefix
 * special case that only marked the OFF-newest rows is gone: "2026 · Week 3"
 * and "2025 · Week 51" are the same shape, and the closed trigger wears the
 * same string the open list does.
 */
export function weekOptionsFrom(
  resp: WeeksResponse | undefined | null,
): Array<{ value: string; label: string; shortLabel?: string }> {
  const weeks = resp?.weeks;
  const currentRow =
    resp?.current == null
      ? undefined
      : weeks?.find((w) => w.season === resp.current!.season && w.week_no === resp.current!.week);
  const defaultOpt = currentRow
    ? { value: "", label: weekLabelFor(currentRow), shortLabel: weekLabelFor(currentRow) }
    : { value: "", label: "Today" };
  const opts: Array<{ value: string; label: string; shortLabel?: string }> = [defaultOpt];
  if (!weeks?.length) return opts;
  for (const w of weeks) {
    opts.push({
      value: weekKey({ year: w.season, week: w.week_no }),
      label: weekLabelFor(w),
      shortLabel: weekLabelFor(w),
    });
  }
  return opts;
}
