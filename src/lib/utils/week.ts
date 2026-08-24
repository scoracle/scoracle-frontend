/**
 * week — the profile time axis's week arithmetic (the NavRail convention,
 * 2026-08-24): Jan-1 blocks, per Scott's spec — week 1 is Jan 1–7, week 2 is
 * Jan 8–14, and so on. 7-day blocks anchored at January 1, NOT ISO weeks: the
 * rule is stated in one sentence and needs no first-Thursday footnote.
 *
 * A selected week travels in the URL as `?week=YYYY-N` ("2026-34"); absent
 * means "Today" (the live cards). Pure date math, no timezone library — all
 * arithmetic is in the reader's local clock, which is also how "today" reads.
 */

export interface WeekRef {
  year: number;
  week: number;
}

/** Parse a `?week=` value ("2026-34"). Null for absent/garbage — i.e. Today. */
export function parseWeekKey(raw: string | null | undefined): WeekRef | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  return { year, week };
}

export function weekKey(ref: WeekRef): string {
  return `${ref.year}-${ref.week}`;
}

/** Today's Jan-1-block week in local time. */
export function currentWeek(now: Date = new Date()): WeekRef {
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86_400_000) + 1;
  return { year: now.getFullYear(), week: Math.floor((dayOfYear - 1) / 7) + 1 };
}

/** The week's first day (local midnight). */
export function weekStart(ref: WeekRef): Date {
  return new Date(ref.year, 0, 1 + (ref.week - 1) * 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Week 34 · Aug 19 – Aug 25" — the dropdown/identifier label. */
export function weekLabel(ref: WeekRef): string {
  const start = weekStart(ref);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return `Week ${ref.week} · ${shortDate(start)} – ${shortDate(end)}`;
}

/**
 * The rail dropdown's options: Today first (value ""), then this year's weeks
 * newest-first down to week 1. One year deep for now — the archive only goes
 * back as far as the headline contract anyway (mig 226/232).
 */
export function weekOptions(now: Date = new Date()): Array<{ value: string; label: string }> {
  const cur = currentWeek(now);
  const opts: Array<{ value: string; label: string }> = [{ value: "", label: "Today" }];
  for (let w = cur.week; w >= 1; w--) {
    const ref = { year: cur.year, week: w };
    opts.push({ value: weekKey(ref), label: weekLabel(ref) });
  }
  return opts;
}
