/**
 * Weeks fetcher (/{sport}/weeks) — the sport's reporting calendar (backend
 * mig 237): every elapsed + current week, newest first, week 1 anchored at the
 * season's opening day (ET). This is the NavRail week axis's data source; the
 * old Jan-1 block arithmetic that lived in week.ts is retired — the backend's
 * season_weeks table is the one clock.
 *
 * 200 always; an empty grid (sport with no fixtures yet) serves weeks: [].
 * Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import type { WeeksResponse } from "../utils/week";
import { weeksUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

async function fetchWeeksImpl(sport: string): Promise<WeeksResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<WeeksResponse>(weeksUrl(sport), "weeks");
}

export const getWeeks = query(fetchWeeksImpl, "weeks");
