/**
 * /stories — retired as a page (Scott, 2026-09-07): the storylines register
 * is the leaderboard's ?board=stories now, sharing that page's NavWell and
 * URL state. This route survives only to carry old links across: it
 * forwards ?sport and ?status unchanged.
 */

import { Navigate, useSearchParams } from "@solidjs/router";
import { paramValue } from "../lib/utils/search-params";

export default function Stories() {
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams({ board: "stories" });
  const sport = paramValue(searchParams.sport);
  const status = paramValue(searchParams.status);
  if (sport) params.set("sport", sport.toUpperCase());
  if (status) params.set("status", status);
  return <Navigate href={`/leaderboard?${params.toString()}`} />;
}
