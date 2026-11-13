import { fantasySupported, transferNoun } from "../cards/card-meta.ts";
export type BoardId = "rating" | "fantasy" | "vibes" | "momentum" | "sigil" | "news" | "transfers";
// Transfers lights Narratives; fantasy lights Scouting. Both remain URL-reachable.
export const BOARD_ITEMS: ReadonlyArray<{
    id: BoardId;
    label: string;
}> = [
    { id: "rating", label: "Scouting" },
    { id: "news", label: "Narratives" },
    { id: "vibes", label: "Vibe" },
    { id: "momentum", label: "Momentum" },
    { id: "sigil", label: "Sigil" },
];
export const BOARD_BLURB: Record<BoardId, string> = {
    rating: "Ranked research database",
    fantasy: "Most fantasy points (PPR / DraftKings)",
    vibes: "Highest sentiment, last 48h",
    momentum: "Biggest risers — vibe or rating",
    sigil: "Holistic synthesis scores",
    news: "Leading narratives by impact",
    transfers: "Rumors by heat index",
};
export function boardSource(params: (key: string) => string | undefined, fallbackSport: () => string = () => "nba") {
    const sport = () => {
        const value = (params("sport") ?? fallbackSport()).toLowerCase();
        return ["nba", "nfl", "football"].includes(value) ? value : "nba";
    };
    const board = (): BoardId => {
        const b = params("board");
        if (b === "fantasy")
            return fantasySupported(sport()) ? "fantasy" : "rating";
        if (b === "composite" || b === "rating" || b === "scouting")
            return "rating";
        if (b === "trending" || b === "momentum")
            return "momentum";
        if (b === "narratives")
            return "news";
        return b === "vibes" || b === "news" || b === "transfers" || b === "sigil"
            ? b
            : "rating";
    };
    const entityType = (): "player" | "team" => (params("type") === "team" ? "team" : "player");
    const metric = (): "vibe" | "rating" => (params("metric") === "rating" ? "rating" : "vibe");
    const intParam = (value: string | undefined): number | null => {
        const n = Number(value);
        return Number.isSafeInteger(n) && n > 0 ? n : null;
    };
    const seasonParam = () => intParam(params("season"));
    const leagueId = () => intParam(params("leagueId"));
    const teamId = () => intParam(params("teamId"));
    const conference = () => params("conference")?.trim() || null;
    const division = () => params("division")?.trim() || null;
    const positionGroup = () => (entityType() === "player" ? params("positionGroup")?.trim() || null : null);
    const cohortArgs = () => ({
        leagueId: leagueId(),
        teamId: teamId(),
        positionGroup: positionGroup(),
        conference: conference(),
        division: division(),
    });
    const RATE_VALUES = new Set(["per_36", "per_90", "per_game", "per_season"]);
    const rate = () => {
        const r = params("rate") ?? "";
        return board() === "rating" && entityType() === "player" && RATE_VALUES.has(r) ? r : null;
    };
    return { sport, board, entityType, metric, seasonParam, leagueId, teamId, conference, division, positionGroup, cohortArgs, rate };
}

export function boardLabel(source: ReturnType<typeof boardSource>) {
  return source.board() === 'transfers' ? transferNoun(source.sport()) : source.board() === 'fantasy' ? 'Fantasy' : BOARD_ITEMS.find(item => item.id === source.board())!.label;
}
export function boardCanonical(source: ReturnType<typeof boardSource>) {
  const query = new URLSearchParams({ sport: source.sport().toUpperCase() });
  if (source.board() !== 'rating') query.set('board', source.board());
  if (source.entityType() === 'team') query.set('type', 'team');
  return `https://scoracle.com/leaderboard?${query}`;
}
/** Only effective endpoint arguments enter a request key. */
export function boardQuery(source: ReturnType<typeof boardSource>) {
  const board = source.board();
  const query = new URLSearchParams({ sport: source.sport(), board });
  if (board !== 'transfers') query.set('type', board === 'fantasy' ? 'player' : source.entityType());
  if (board === 'momentum') query.set('metric', source.metric());
  if (['rating', 'fantasy', 'sigil'].includes(board) && source.seasonParam()) query.set('season', String(source.seasonParam()));
  if (source.rate()) query.set('rate', source.rate()!);
  for (const [key, value] of Object.entries(source.cohortArgs())) {
    if (value != null && (board !== 'transfers' || key === 'teamId')) query.set(key, String(value));
  }
  return query.toString();
}
