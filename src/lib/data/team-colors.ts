/**
 * Team brand colors — keyed by "{sport}:{teamId}" so sport namespaces don't collide.
 *
 * IDs match the backend's team IDs (same ones used in entityDataStore).
 * Colors sourced from each team's official brand pages.
 *
 * Near-invisible primaries (Spurs silver, Saints tan) are swapped with their
 * secondary so the chart fill reads on the cream background; the official
 * primary is preserved as the entity's secondary color.
 *
 * Seeded: NBA (30), NFL (32), Premier League (20). Other football leagues
 * fall back to the default palette until filled in.
 *
 * Long-term home: @scoracle/tokens. See docs/planning/2026-04-20_compare-colors.md
 * for the migration plan.
 */

export interface TeamColorToken {
  /** Hex color used as the entity's signature fill on pizza charts. */
  primary: string;
  /** Alternate color used when primaries collide in a comparison. */
  secondary: string;
}

/** Fallback when no team color is found. Matches the current global palette. */
export const DEFAULT_ENTITY_COLORS: TeamColorToken = {
  primary: '#6b8fc7',   // cool blue
  secondary: '#b38da8', // warm mauve
};

export const TEAM_COLORS: Record<string, TeamColorToken> = {
  // ── NBA ────────────────────────────────────────────────────────────────
  'nba:1':  { primary: '#E03A3E', secondary: '#C1D32F' }, // Hawks
  'nba:2':  { primary: '#007A33', secondary: '#BA9653' }, // Celtics
  'nba:3':  { primary: '#000000', secondary: '#777777' }, // Nets
  'nba:4':  { primary: '#1D1160', secondary: '#00788C' }, // Hornets
  'nba:5':  { primary: '#CE1141', secondary: '#000000' }, // Bulls
  'nba:6':  { primary: '#6F263D', secondary: '#FFB81C' }, // Cavaliers
  'nba:7':  { primary: '#00538C', secondary: '#B8C4CA' }, // Mavericks
  'nba:8':  { primary: '#0E2240', secondary: '#FEC524' }, // Nuggets
  'nba:9':  { primary: '#C8102E', secondary: '#1D42BA' }, // Pistons
  'nba:10': { primary: '#1D428A', secondary: '#FFC72C' }, // Warriors
  'nba:11': { primary: '#CE1141', secondary: '#000000' }, // Rockets
  'nba:12': { primary: '#002D62', secondary: '#FDBB30' }, // Pacers
  'nba:13': { primary: '#C8102E', secondary: '#1D428A' }, // Clippers
  'nba:14': { primary: '#552583', secondary: '#FDB927' }, // Lakers
  'nba:15': { primary: '#5D76A9', secondary: '#12173F' }, // Grizzlies
  'nba:16': { primary: '#98002E', secondary: '#F9A01B' }, // Heat
  'nba:17': { primary: '#00471B', secondary: '#EEE1C6' }, // Bucks
  'nba:18': { primary: '#0C2340', secondary: '#236192' }, // Timberwolves
  'nba:19': { primary: '#0C2340', secondary: '#C8102E' }, // Pelicans
  'nba:20': { primary: '#006BB6', secondary: '#F58426' }, // Knicks
  'nba:21': { primary: '#007AC1', secondary: '#EF3B24' }, // Thunder
  'nba:22': { primary: '#0077C0', secondary: '#C4CED4' }, // Magic
  'nba:23': { primary: '#006BB6', secondary: '#ED174C' }, // 76ers
  'nba:24': { primary: '#1D1160', secondary: '#E56020' }, // Suns
  'nba:25': { primary: '#E03A3E', secondary: '#000000' }, // Trail Blazers
  'nba:26': { primary: '#5A2D81', secondary: '#63727A' }, // Kings
  'nba:27': { primary: '#000000', secondary: '#C4CED4' }, // Spurs — swapped (official silver invisible on cream)
  'nba:28': { primary: '#CE1141', secondary: '#000000' }, // Raptors
  'nba:29': { primary: '#002B5C', secondary: '#00471B' }, // Jazz
  'nba:30': { primary: '#002B5C', secondary: '#E31837' }, // Wizards

  // ── NFL ────────────────────────────────────────────────────────────────
  'nfl:1':  { primary: '#002244', secondary: '#C60C30' }, // Patriots
  'nfl:3':  { primary: '#00338D', secondary: '#C60C30' }, // Bills
  'nfl:4':  { primary: '#125740', secondary: '#000000' }, // Jets
  'nfl:5':  { primary: '#008E97', secondary: '#FC4C02' }, // Dolphins
  'nfl:6':  { primary: '#241773', secondary: '#9E7C0C' }, // Ravens
  'nfl:7':  { primary: '#000000', secondary: '#FFB612' }, // Steelers
  'nfl:8':  { primary: '#311D00', secondary: '#FF3C00' }, // Browns
  'nfl:9':  { primary: '#FB4F14', secondary: '#000000' }, // Bengals
  'nfl:10': { primary: '#03202F', secondary: '#A71930' }, // Texans
  'nfl:11': { primary: '#0C2340', secondary: '#4B92DB' }, // Titans
  'nfl:12': { primary: '#002C5F', secondary: '#A2AAAD' }, // Colts
  'nfl:13': { primary: '#101820', secondary: '#D7A22A' }, // Jaguars
  'nfl:14': { primary: '#E31837', secondary: '#FFB81C' }, // Chiefs
  'nfl:15': { primary: '#FB4F14', secondary: '#002244' }, // Broncos
  'nfl:16': { primary: '#000000', secondary: '#A5ACAF' }, // Raiders
  'nfl:17': { primary: '#0080C6', secondary: '#FFC20E' }, // Chargers
  'nfl:18': { primary: '#004C54', secondary: '#A5ACAF' }, // Eagles
  'nfl:19': { primary: '#003594', secondary: '#869397' }, // Cowboys
  'nfl:20': { primary: '#0B2265', secondary: '#A71930' }, // Giants
  'nfl:21': { primary: '#5A1414', secondary: '#FFB612' }, // Commanders
  'nfl:22': { primary: '#203731', secondary: '#FFB612' }, // Packers
  'nfl:23': { primary: '#4F2683', secondary: '#FFC62F' }, // Vikings
  'nfl:24': { primary: '#0B162A', secondary: '#C83803' }, // Bears
  'nfl:25': { primary: '#0076B6', secondary: '#B0B7BC' }, // Lions
  'nfl:26': { primary: '#000000', secondary: '#D3BC8D' }, // Saints — swapped (tan invisible on cream)
  'nfl:27': { primary: '#A71930', secondary: '#000000' }, // Falcons
  'nfl:28': { primary: '#D50A0A', secondary: '#FF7900' }, // Buccaneers
  'nfl:29': { primary: '#0085CA', secondary: '#101820' }, // Panthers
  'nfl:30': { primary: '#AA0000', secondary: '#B3995D' }, // 49ers
  'nfl:31': { primary: '#002244', secondary: '#69BE28' }, // Seahawks
  'nfl:32': { primary: '#003594', secondary: '#FFA300' }, // Rams

  // ── Football: Premier League ───────────────────────────────────────────
  'football:1':   { primary: '#7A263A', secondary: '#1BB1E7' }, // West Ham
  'football:3':   { primary: '#EB172B', secondary: '#211E1F' }, // Sunderland
  'football:6':   { primary: '#132257', secondary: '#BBBBBB' }, // Tottenham
  'football:8':   { primary: '#C8102E', secondary: '#00B2A9' }, // Liverpool
  'football:9':   { primary: '#6CABDD', secondary: '#1C2C5B' }, // Manchester City
  'football:11':  { primary: '#000000', secondary: '#CC0000' }, // Fulham
  'football:13':  { primary: '#003399', secondary: '#B5B7BA' }, // Everton
  'football:14':  { primary: '#DA291C', secondary: '#FBE122' }, // Manchester United
  'football:15':  { primary: '#670E36', secondary: '#94BEE5' }, // Aston Villa
  'football:18':  { primary: '#034694', secondary: '#DBA111' }, // Chelsea
  'football:19':  { primary: '#EF0107', secondary: '#063672' }, // Arsenal
  'football:20':  { primary: '#241F20', secondary: '#CCCCCC' }, // Newcastle
  'football:27':  { primary: '#6C1D45', secondary: '#99D6EA' }, // Burnley
  'football:29':  { primary: '#231F20', secondary: '#FDB913' }, // Wolves — swapped (official gold invisible on cream)
  'football:51':  { primary: '#1B458F', secondary: '#C4122E' }, // Crystal Palace
  'football:52':  { primary: '#DA291C', secondary: '#000000' }, // Bournemouth
  'football:63':  { primary: '#DD0000', secondary: '#000000' }, // Nottingham Forest
  'football:71':  { primary: '#1D428A', secondary: '#FFCD00' }, // Leeds — swapped (official yellow hard to read on cream)
  'football:78':  { primary: '#0057B8', secondary: '#FFCD00' }, // Brighton
  'football:236': { primary: '#E30613', secondary: '#FBB800' }, // Brentford
};

/**
 * Look up colors for a team. Returns null if no token is seeded.
 * Sport is normalized to lowercase for the key.
 */
export function getTeamColors(sport: string, teamId: string | number): TeamColorToken | null {
  const key = `${sport.toLowerCase()}:${teamId}`;
  return TEAM_COLORS[key] ?? null;
}
