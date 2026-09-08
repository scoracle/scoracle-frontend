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
 * Dates render in the calendar's own timezone (ET — the weeks are anchored
 * there), so every reader sees the same week boundaries the backend cut.
 */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** "Week 3: Sep 18 – Sep 25" — the dropdown-list/identifier label (Scott's
 *  format, 2026-09-06; the end date is the boundary the backend cut). */
export function weekLabelFor(w: SportWeek): string {
  return `Week ${w.week_no}: ${shortDate(w.starts_at)} – ${shortDate(w.ends_at)}`;
}

/**
 * The rail dropdown's options. The default (value "") is the LIVE deck, but
 * it wears the current week's name rather than "Today" when the sport's grid
 * names one (Scott, 2026-09-07 — "Rather than saying 'today' the default
 * should show the week we're in"): the label-only reading, so the resting
 * selection still renders the live cards. No current week (offseason) or an
 * unloaded grid falls back to "Today". The elapsed weeks follow exactly as
 * the API orders them (newest first, across seasons); weeks from a season
 * other than the newest carry the season as a prefix so two "Week 1"s can
 * never be confused.
 */
export function weekOptionsFrom(
  resp: WeeksResponse | undefined | null,
): Array<{ value: string; label: string; shortLabel?: string }> {
  const weeks = resp?.weeks;
  const currentRow =
    resp?.current == null
      ? undefined
      : weeks?.find((w) => w.season === resp.current!.season && w.week_no === resp.current!.week);
  const newestSeason = weeks?.[0].season;
  const prefix = currentRow && newestSeason != null && currentRow.season !== newestSeason
    ? `${currentRow.season} · `
    : "";
  const defaultOpt = currentRow
    ? {
        value: "",
        label: prefix + weekLabelFor(currentRow),
        shortLabel: `${prefix}Week ${currentRow.week_no}`,
      }
    : { value: "", label: "Today" };
  const opts: Array<{ value: string; label: string; shortLabel?: string }> = [defaultOpt];
  if (!weeks?.length) return opts;
  for (const w of weeks) {
    const weekPrefix = w.season === newestSeason ? "" : `${w.season} · `;
    opts.push({
      value: weekKey({ year: w.season, week: w.week_no }),
      // The open list carries the dates; the closed trigger wears just the
      // week number so it never eats the conditions line (Scott, 2026-09-06).
      label: weekPrefix + weekLabelFor(w),
      shortLabel: `${weekPrefix}Week ${w.week_no}`,
    });
  }
  return opts;
}
