/**
 * Stats Categorizer Utility
 *
 * Transforms flat stats from the Go API into categorized format for display.
 * Keys match the Go backend `stat_definitions` exactly.
 *
 * Pizza chart categories follow a 3-theme structure per sport:
 *   1. Scoring / Output
 *   2. Possession / Playmaking
 *   3. Defensive
 */

export interface StatItem {
  key: string;
  label: string;
  value: number | string | null;
  percentile?: number | null;
  rank?: number | null;
  sample_size?: number | null;
}

/**
 * Normalize the backend's `percentiles` field into a flat `key → percentile`
 * map. The Go API ships either an object map (one record per stat) or an
 * array of `{stat_key, percentile}` rows depending on the endpoint shape.
 */
export function normalizePercentiles(
  percentiles:
    | Record<string, number>
    | Array<{ stat_key: string; percentile: number }>
    | null
    | undefined,
): Record<string, number> {
  if (!percentiles) return {};
  if (Array.isArray(percentiles)) {
    const result: Record<string, number> = {};
    for (const p of percentiles) {
      if (p.stat_key && typeof p.percentile === 'number') {
        result[p.stat_key] = p.percentile;
      }
    }
    return result;
  }
  return percentiles;
}

/**
 * Percentile-set picker keyed off the user-selected scope.
 *
 * `all` → sport-wide percentiles (the existing position-partitioned set).
 * `scoped` → conference (NBA/NFL) or league (Football) partitioned set.
 *
 * Falls back to `all` whenever scoped data is missing/empty so the UI
 * degrades gracefully rather than rendering uncolored rings.
 */
export function pickPercentiles(
  data: {
    percentiles?:
      | Record<string, number>
      | Array<{ stat_key: string; percentile: number }>
      | null;
    scoped_percentiles?:
      | Record<string, number>
      | Array<{ stat_key: string; percentile: number }>
      | null;
  } | null | undefined,
  scope: 'all' | 'scoped',
): Record<string, number> {
  if (!data) return {};
  if (scope === 'scoped') {
    const scoped = normalizePercentiles(data.scoped_percentiles);
    if (Object.keys(scoped).length > 0) return scoped;
  }
  return normalizePercentiles(data.percentiles);
}

/**
 * True when the response carries enough scoped data to power the
 * "Scope" toggle. Used by Stats / Compare / Traits to hide the toggle
 * for entities that don't have scoped buckets yet.
 */
export function hasScopedPercentiles(
  data: {
    scoped_percentiles?:
      | Record<string, number>
      | Array<{ stat_key: string; percentile: number }>
      | null;
  } | null | undefined,
): boolean {
  if (!data?.scoped_percentiles) return false;
  return Object.keys(normalizePercentiles(data.scoped_percentiles)).length > 0;
}

export interface Category {
  id: string;
  label: string;
  volume: number;
  stats: StatItem[];
}

export interface BoxScoreGroup {
  id: string;
  label: string;
  stats: BoxScoreStat[];
}

export interface BoxScoreStat {
  key: string;
  abbrev: string;
  value: number | string | null;
}

const CATEGORY_CONFIG: Record<string, { id: string; label: string; keys: string[] }[]> = {
  // ── NBA Player ──
  NBA: [
    { id: 'scoring', label: 'Scoring', keys: ['pts', 'fgm', 'fga', 'fg_pct', 'fg3m', 'fg3a', 'fg3_pct', 'ftm', 'fta', 'ft_pct', 'true_shooting_pct'] },
    { id: 'playmaking', label: 'Playmaking', keys: ['ast', 'reb', 'oreb', 'dreb', 'turnover'] },
    { id: 'defensive', label: 'Defensive', keys: ['stl', 'blk', 'pf'] },
    { id: 'advanced', label: 'Advanced', keys: ['plus_minus', 'efficiency'] },
    { id: 'general', label: 'General', keys: ['games_played', 'minutes'] },
  ],
  // ── NFL Player ──
  NFL: [
    { id: 'scoring', label: 'Scoring', keys: ['passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns', 'total_points', 'field_goals_made', 'field_goal_attempts', 'field_goal_pct', 'extra_points_made'] },
    { id: 'possession', label: 'Possession', keys: ['passing_yards', 'passing_completions', 'passing_attempts', 'passing_completion_pct', 'passing_yards_per_game', 'passing_interceptions', 'qbr', 'td_int_ratio', 'rushing_yards', 'rushing_attempts', 'rushing_yards_per_game', 'yards_per_rush_attempt', 'rushing_first_downs', 'receptions', 'receiving_yards', 'receiving_targets', 'receiving_yards_per_game', 'yards_per_reception', 'receiving_first_downs', 'catch_pct'] },
    { id: 'defensive', label: 'Defensive', keys: ['total_tackles', 'solo_tackles', 'assist_tackles', 'defensive_sacks', 'defensive_sack_yards', 'defensive_interceptions', 'interception_touchdowns', 'fumbles_forced', 'fumbles_recovered', 'tackles_for_loss', 'passes_defended', 'qb_hits', 'fumbles_touchdowns'] },
    { id: 'special', label: 'Special Teams', keys: ['punts', 'punt_yards', 'punts_inside_20', 'kick_returns', 'kick_return_yards', 'kick_return_touchdowns', 'punt_returner_returns', 'punt_returner_return_yards', 'punt_return_touchdowns', 'touchbacks'] },
    { id: 'general', label: 'General', keys: ['games_played', 'fumbles', 'fumbles_lost'] },
  ],
  // ── Football (Soccer) Player ──
  FOOTBALL: [
    { id: 'scoring', label: 'Goals & Assists', keys: ['goals', 'assists', 'shots', 'shots_on', 'penalty_scored', 'penalty_missed'] },
    { id: 'possession', label: 'Passing', keys: ['passes', 'passes_accuracy', 'key_passes', 'crosses', 'crosses_accuracy'] },
    { id: 'defensive', label: 'Defense', keys: ['tackles', 'blocks', 'interceptions', 'duels_won', 'duels_total'] },
    { id: 'discipline', label: 'Discipline', keys: ['yellow_cards', 'red_cards', 'fouls_committed', 'fouls_drawn'] },
    { id: 'general', label: 'General', keys: ['games', 'minutes', 'rating'] },
  ],

  // ── NBA Team ──
  NBA_TEAM: [
    { id: 'scoring', label: 'Scoring', keys: ['pts', 'fg_pct', 'fg3_pct', 'ft_pct'] },
    { id: 'playmaking', label: 'Playmaking', keys: ['ast', 'reb', 'turnover'] },
    { id: 'standings', label: 'Record', keys: ['wins', 'losses', 'win_pct', 'games_played'] },
  ],
  // ── NFL Team ──
  NFL_TEAM: [
    { id: 'scoring', label: 'Scoring', keys: ['points_for', 'points_against', 'point_differential'] },
    { id: 'offense', label: 'Offense', keys: ['passing_yards', 'passing_touchdowns', 'passing_completions', 'passing_attempts', 'passing_interceptions', 'rushing_yards', 'rushing_touchdowns', 'rushing_attempts', 'total_yards'] },
    { id: 'defensive', label: 'Defensive', keys: ['defensive_sacks', 'defensive_interceptions', 'total_tackles', 'passes_defended'] },
    { id: 'turnovers', label: 'Turnovers', keys: ['fumbles_lost', 'turnovers'] },
    { id: 'kicking', label: 'Kicking', keys: ['field_goals_made', 'field_goal_attempts', 'field_goal_pct'] },
    { id: 'standings', label: 'Record', keys: ['wins', 'losses', 'ties', 'win_pct'] },
  ],
  // ── Football (Soccer) Team ──
  FOOTBALL_TEAM: [
    { id: 'record', label: 'Record', keys: ['matches_played', 'wins', 'draws', 'losses', 'points', 'league_position'] },
    { id: 'goals', label: 'Goals', keys: ['goals_for', 'goals_against', 'goal_difference', 'goals_per_game', 'goals_conceded_per_game', 'clean_sheets', 'failed_to_score'] },
    { id: 'attack', label: 'Attack', keys: ['shots_total', 'shots_on_target', 'shot_accuracy', 'expected_goals'] },
    { id: 'defense', label: 'Defense', keys: ['tackles_per_game', 'interceptions_per_game', 'clearances_per_game', 'expected_goals_against'] },
    { id: 'discipline', label: 'Discipline', keys: ['yellow_cards', 'red_cards', 'fouls_per_game'] },
  ],
};

/**
 * Rate-adjusted category configs for pizza charts.
 * NBA uses per-36-minute stats, Football uses per-90-minute stats.
 *
 * `mirrors` maps each rate category to per-game category IDs so the
 * rate view can mirror the per-game ordering on flip. The rate category
 * takes the position of its earliest matching per-game category.
 */
interface RateCategoryDef {
  id: string;
  label: string;
  keys: string[];
  mirrors: string[];
}

const RATE_CATEGORY_CONFIG: Record<string, RateCategoryDef[]> = {
  NBA: [
    { id: 'scoring_rate', label: 'Scoring Rate', keys: ['pts_per_36', 'fgm_per_36', 'fga_per_36', 'fg_pct', 'fg3m_per_36', 'fg3a_per_36', 'fg3_pct', 'ftm_per_36', 'fta_per_36', 'ft_pct', 'true_shooting_pct'], mirrors: ['scoring'] },
    { id: 'impact_rate', label: 'Impact Rate', keys: ['ast_per_36', 'reb_per_36', 'oreb_per_36', 'dreb_per_36', 'stl_per_36', 'blk_per_36', 'efficiency'], mirrors: ['playmaking', 'defensive'] },
    { id: 'discipline_rate', label: 'Discipline Rate', keys: ['tov_per_36', 'pf_per_36'], mirrors: ['advanced'] },
  ],
  FOOTBALL: [
    { id: 'attacking_rate', label: 'Attacking Rate', keys: ['goals_per_90', 'assists_per_90', 'shots_per_90', 'shots_on_target_per_90', 'key_passes_per_90', 'big_chances_created_per_90', 'chances_created_per_90', 'expected_goals_per_90'], mirrors: ['scoring'] },
    { id: 'possession_rate', label: 'Possession Rate', keys: ['passes_total_per_90', 'passes_accurate_per_90', 'crosses_total_per_90', 'crosses_accurate_per_90', 'dribbles_attempts_per_90', 'dribbles_success_per_90', 'through_balls_per_90', 'long_balls_per_90', 'passes_in_final_third_per_90'], mirrors: ['possession'] },
    { id: 'defensive_rate', label: 'Defensive Rate', keys: ['tackles_per_90', 'tackles_won_per_90', 'interceptions_per_90', 'clearances_per_90', 'blocks_per_90', 'duels_won_per_90', 'ball_recovery_per_90', 'aeriels_won_per_90', 'saves_per_90', 'goals_conceded_per_90'], mirrors: ['defensive'] },
    { id: 'discipline_rate', label: 'Discipline Rate', keys: ['fouls_committed_per_90', 'fouls_drawn_per_90', 'possession_lost_per_90', 'dispossessed_per_90', 'dribbled_past_per_90', 'turnovers_per_90'], mirrors: ['discipline'] },
  ],
};

// ─── Pizza chart 4-slot config ────────────────────────────────────────────
// Four fixed chart slots per entity: attack, possession, defense, discipline.
// Each sport/entity-type maps stat keys into slots. Mappings are intentionally
// sparse — refined sport-by-sport with domain input.

export const CHART_SLOTS = ['attack', 'possession', 'defense', 'discipline'] as const;
export type ChartSlotId = (typeof CHART_SLOTS)[number];

const CHART_SLOT_LABELS: Record<ChartSlotId, string> = {
  attack: 'Attack',
  possession: 'Possession',
  defense: 'Defense',
  discipline: 'Discipline',
};

type ChartSlotMap = Record<ChartSlotId, string[]>;

const CHART_CATEGORY_CONFIG: Record<string, ChartSlotMap> = {
  NBA: {
    attack: ['pts', 'fgm', 'fg_pct', 'fg3m', 'fg3_pct', 'ftm', 'ft_pct', 'true_shooting_pct'],
    possession: ['ast', 'ast_to_tov', 'reb', 'oreb', 'minutes', 'plus_minus', 'efficiency', 'fga'],
    defense: ['stl', 'blk', 'dreb'],
    discipline: ['turnover', 'pf'],
  },
  NFL: {
    attack: ['passing_touchdowns', 'passing_yards', 'rushing_touchdowns', 'rushing_yards', 'receiving_touchdowns', 'receiving_yards', 'field_goals_made', 'qbr'],
    possession: ['passing_completions', 'passing_completion_pct', 'yards_per_pass_attempt', 'yards_per_rush_attempt', 'yards_per_reception', 'catch_pct', 'receptions', 'receiving_targets'],
    defense: ['total_tackles', 'solo_tackles', 'defensive_sacks', 'defensive_interceptions', 'tackles_for_loss', 'passes_defended', 'qb_hits', 'fumbles_recovered'],
    discipline: ['passing_interceptions', 'fumbles', 'fumbles_lost', 'sacks_taken'],
  },
  FOOTBALL: {
    attack: ['goals', 'assists', 'shots_on_target', 'shot_accuracy', 'big_chances_created', 'key_passes', 'chances_created', 'penalty_goals'],
    possession: ['pass_accuracy', 'passes_total', 'touches', 'passes_in_final_third', 'dribble_success_rate', 'cross_accuracy', 'through_balls', 'possession_lost'],
    defense: ['tackles_won', 'tackles_won_percentage', 'interceptions', 'blocks', 'clearances', 'ball_recovery', 'duel_success_rate', 'aerials_won_percentage'],
    discipline: ['yellow_cards', 'red_cards', 'fouls_committed', 'fouls_drawn', 'offsides'],
  },
  NBA_TEAM: {
    attack: ['pts', 'fgm', 'fg_pct', 'fg3m', 'fg3_pct', 'ft_pct', 'true_shooting_pct', 'point_differential'],
    possession: ['ast', 'ast_to_tov', 'reb', 'oreb', 'fga', 'fta', 'efficiency', 'efg_pct'],
    defense: ['pts_allowed', 'stl', 'blk', 'dreb'],
    discipline: ['turnover', 'pf'],
  },
  NFL_TEAM: {
    attack: ['points_for', 'points_per_game', 'passing_touchdowns', 'rushing_touchdowns', 'passing_yards', 'rushing_yards', 'field_goals_made', 'qbr'],
    possession: ['total_yards', 'yards_per_game', 'passing_completions', 'passing_attempts', 'passing_completion_pct', 'rushing_attempts', 'yards_per_pass_attempt', 'yards_per_rush_attempt'],
    defense: ['points_against', 'points_allowed_per_game', 'defensive_sacks', 'defensive_interceptions', 'passes_defended', 'tackles_for_loss', 'takeaways', 'turnover_differential'],
    discipline: ['turnovers', 'fumbles_lost', 'passing_interceptions', 'fumbles'],
  },
  FOOTBALL_TEAM: {
    attack: ['goals_for', 'shots_on_target', 'shot_accuracy', 'big_chances_created', 'dangerous_attacks', 'shots_insidebox', 'assists', 'corners'],
    possession: ['possession_pct', 'pass_accuracy', 'passes', 'passes_final_third', 'successful_dribbles', 'dribble_success_rate', 'cross_accuracy', 'touches'],
    defense: ['goals_against', 'tackles_won', 'tackles_won_percentage', 'interceptions', 'clearances', 'saves', 'duels_won_percentage', 'aerials_won_percentage'],
    discipline: ['yellow_cards_total', 'red_cards_total', 'fouls_committed', 'fouls_drawn', 'offsides', 'offsides_provoked'],
  },
};

const CHART_RATE_CATEGORY_CONFIG: Record<string, ChartSlotMap> = {
  NBA: {
    attack: ['pts_per_36', 'fgm_per_36', 'fga_per_36', 'fg_pct', 'fg3m_per_36', 'fg3_pct', 'ftm_per_36', 'ft_pct', 'true_shooting_pct'],
    possession: ['ast_per_36', 'reb_per_36', 'oreb_per_36', 'efficiency'],
    defense: ['stl_per_36', 'blk_per_36', 'dreb_per_36'],
    discipline: ['tov_per_36', 'pf_per_36'],
  },
  FOOTBALL: {
    attack: ['goals_per_90', 'assists_per_90', 'shots_on_target_per_90', 'shots_per_90', 'key_passes_per_90', 'big_chances_created_per_90', 'chances_created_per_90', 'expected_goals_per_90'],
    possession: ['passes_total_per_90', 'passes_accurate_per_90', 'dribbles_success_per_90', 'crosses_accurate_per_90', 'through_balls_per_90', 'passes_in_final_third_per_90', 'long_balls_per_90'],
    defense: ['tackles_won_per_90', 'interceptions_per_90', 'clearances_per_90', 'blocks_per_90', 'ball_recovery_per_90', 'duels_won_per_90', 'aeriels_won_per_90', 'saves_per_90', 'goals_conceded_per_90'],
    discipline: ['fouls_committed_per_90', 'fouls_drawn_per_90', 'possession_lost_per_90', 'dispossessed_per_90', 'turnovers_per_90'],
  },
};

const STAT_LABELS: Record<string, string> = {
  // ── NBA Player ──
  pts: 'Points',
  fgm: 'FG Made',
  fga: 'FG Attempted',
  fg_pct: 'FG %',
  ftm: 'FT Made',
  fta: 'FT Attempted',
  ft_pct: 'FT %',
  fg3m: '3PT Made',
  fg3a: '3PT Attempted',
  fg3_pct: '3PT %',
  reb: 'Rebounds',
  oreb: 'Off Rebounds',
  dreb: 'Def Rebounds',
  ast: 'Assists',
  turnover: 'Turnovers',
  stl: 'Steals',
  blk: 'Blocks',
  pf: 'Fouls',
  games_played: 'Games Played',
  minutes: 'Minutes',
  plus_minus: '+/-',
  efficiency: 'Efficiency',
  true_shooting_pct: 'True Shooting %',
  efg_pct: 'Effective FG %',
  ast_to_tov: 'AST/TO Ratio',
  pts_allowed: 'Points Allowed',
  pts_per_36: 'Pts/36',
  reb_per_36: 'Reb/36',
  oreb_per_36: 'OReb/36',
  dreb_per_36: 'DReb/36',
  ast_per_36: 'Ast/36',
  stl_per_36: 'Stl/36',
  blk_per_36: 'Blk/36',
  fgm_per_36: 'FGM/36',
  fga_per_36: 'FGA/36',
  fg3m_per_36: '3PM/36',
  fg3a_per_36: '3PA/36',
  ftm_per_36: 'FTM/36',
  fta_per_36: 'FTA/36',
  tov_per_36: 'TO/36',
  pf_per_36: 'PF/36',

  // ── NFL Player ──
  passing_yards: 'Pass Yards',
  passing_touchdowns: 'Pass TDs',
  passing_interceptions: 'INTs Thrown',
  passing_completions: 'Completions',
  passing_attempts: 'Pass Attempts',
  passing_yards_per_game: 'Pass Yds/Game',
  passing_completion_pct: 'Completion %',
  qbr: 'Passer Rating',
  td_int_ratio: 'TD/INT Ratio',
  rushing_yards: 'Rush Yards',
  rushing_touchdowns: 'Rush TDs',
  rushing_attempts: 'Rush Attempts',
  rushing_yards_per_game: 'Rush Yds/Game',
  yards_per_rush_attempt: 'Yards/Carry',
  yards_per_pass_attempt: 'Yards/Attempt',
  sacks_taken: 'Sacks Taken',
  rushing_first_downs: 'Rush 1st Downs',
  receptions: 'Receptions',
  receiving_yards: 'Rec Yards',
  receiving_touchdowns: 'Rec TDs',
  receiving_targets: 'Targets',
  receiving_yards_per_game: 'Rec Yds/Game',
  yards_per_reception: 'Yards/Rec',
  receiving_first_downs: 'Rec 1st Downs',
  catch_pct: 'Catch %',
  total_tackles: 'Total Tackles',
  solo_tackles: 'Solo Tackles',
  assist_tackles: 'Assisted Tackles',
  defensive_sacks: 'Sacks',
  defensive_sack_yards: 'Sack Yards',
  defensive_interceptions: 'INTs (Def)',
  interception_touchdowns: 'INT Return TDs',
  fumbles_forced: 'Forced Fumbles',
  fumbles_recovered: 'Fumbles Recovered',
  fumbles_touchdowns: 'Fumble Return TDs',
  tackles_for_loss: 'Tackles for Loss',
  passes_defended: 'Passes Defended',
  qb_hits: 'QB Hits',
  fumbles: 'Fumbles',
  fumbles_lost: 'Fumbles Lost',
  total_points: 'Total Points',
  field_goals_made: 'FG Made',
  field_goal_attempts: 'FG Attempts',
  field_goal_pct: 'FG %',
  extra_points_made: 'Extra Points',
  punts: 'Punts',
  punt_yards: 'Punt Yards',
  punts_inside_20: 'Punts Inside 20',
  kick_returns: 'Kick Returns',
  kick_return_yards: 'KR Yards',
  kick_return_touchdowns: 'KR TDs',
  punt_returner_returns: 'Punt Returns',
  punt_returner_return_yards: 'PR Yards',
  punt_return_touchdowns: 'PR TDs',
  touchbacks: 'Touchbacks',

  // ── Football (Soccer) Player ──
  goals: 'Goals',
  assists: 'Assists',
  shots: 'Shots',
  shots_on: 'Shots on Target',
  big_chances_created: 'Big Chances Created',
  chances_created: 'Chances Created',
  penalty_scored: 'Penalties Scored',
  penalty_missed: 'Penalties Missed',
  penalty_goals: 'Penalty Goals',
  passes: 'Passes',
  passes_total: 'Passes',
  passes_accuracy: 'Pass Accuracy',
  pass_accuracy: 'Pass Accuracy',
  passes_in_final_third: 'Final Third Passes',
  passes_final_third: 'Final Third Passes',
  key_passes: 'Key Passes',
  crosses: 'Crosses',
  crosses_accuracy: 'Cross Accuracy',
  cross_accuracy: 'Cross Accuracy',
  through_balls: 'Through Balls',
  touches: 'Touches',
  possession_lost: 'Possession Lost',
  possession_pct: 'Possession',
  dribble_success_rate: 'Dribble Success',
  successful_dribbles: 'Successful Dribbles',
  tackles: 'Tackles',
  tackles_won: 'Tackles Won',
  tackles_won_percentage: 'Tackle Success',
  blocks: 'Blocks',
  interceptions: 'Interceptions',
  clearances: 'Clearances',
  ball_recovery: 'Ball Recoveries',
  duels_won: 'Duels Won',
  duels_total: 'Total Duels',
  duel_success_rate: 'Duel Success',
  duels_won_percentage: 'Duel Success',
  aerials_won_percentage: 'Aerial Success',
  saves: 'Saves',
  dangerous_attacks: 'Dangerous Attacks',
  shots_insidebox: 'Shots Inside Box',
  corners: 'Corners',
  yellow_cards: 'Yellow Cards',
  yellow_cards_total: 'Yellow Cards',
  red_cards: 'Red Cards',
  red_cards_total: 'Red Cards',
  fouls_committed: 'Fouls Committed',
  fouls_drawn: 'Fouls Drawn',
  offsides: 'Offsides',
  offsides_provoked: 'Offsides Won',
  rating: 'Rating',
  games: 'Games',
  goals_per_90: 'Goals/90',
  assists_per_90: 'Assists/90',
  shots_per_90: 'Shots/90',
  shots_total_per_90: 'Shots/90',
  shots_on_target_per_90: 'SoT/90',
  expected_goals_per_90: 'xG/90',
  key_passes_per_90: 'Key Passes/90',
  passes_total_per_90: 'Passes/90',
  passes_accurate_per_90: 'Acc Passes/90',
  passes_in_final_third_per_90: 'F3 Passes/90',
  crosses_total_per_90: 'Crosses/90',
  crosses_accurate_per_90: 'Acc Crosses/90',
  long_balls_per_90: 'Long Balls/90',
  long_balls_won_per_90: 'Long Balls Won/90',
  through_balls_per_90: 'Through Balls/90',
  through_balls_won_per_90: 'Through Balls Won/90',
  dribbles_attempts_per_90: 'Dribbles/90',
  dribbles_success_per_90: 'Dribbles Won/90',
  chances_created_per_90: 'Chances/90',
  big_chances_created_per_90: 'Big Chances/90',
  tackles_per_90: 'Tackles/90',
  tackles_won_per_90: 'Tackles Won/90',
  interceptions_per_90: 'Interceptions/90',
  clearances_per_90: 'Clearances/90',
  blocks_per_90: 'Blocks/90',
  duels_total_per_90: 'Duels/90',
  duels_won_per_90: 'Duels Won/90',
  ball_recovery_per_90: 'Ball Recovery/90',
  aerials_per_90: 'Aerials/90',
  aeriels_won_per_90: 'Aerials Won/90',
  saves_per_90: 'Saves/90',
  saves_insidebox_per_90: 'Saves IB/90',
  goals_conceded_per_90: 'Goals Conc./90',
  fouls_committed_per_90: 'Fouls/90',
  fouls_drawn_per_90: 'Fouls Drawn/90',
  dispossessed_per_90: 'Dispossessed/90',
  possession_lost_per_90: 'Poss Lost/90',
  dribbled_past_per_90: 'Dribbled Past/90',
  turnovers_per_90: 'Turnovers/90',

  // ── NFL/NBA Team ──
  wins: 'Wins',
  losses: 'Losses',
  ties: 'Ties',
  win_pct: 'Win %',
  points_for: 'Points For',
  points_against: 'Points Against',
  point_differential: 'Point Diff',
  total_yards: 'Total Yards',
  turnovers: 'Turnovers',
  points_per_game: 'Points/Game',
  points_allowed_per_game: 'Points Allowed/G',
  yards_per_game: 'Yards/Game',
  turnover_differential: 'Turnover Diff',
  takeaways: 'Takeaways',

  // ── Football (Soccer) Team ──
  matches_played: 'Matches Played',
  draws: 'Draws',
  points: 'Points',
  league_position: 'League Position',
  goals_for: 'Goals For',
  goals_against: 'Goals Against',
  goal_difference: 'Goal Diff',
  goals_per_game: 'Goals/Game',
  goals_conceded_per_game: 'Conceded/Game',
  clean_sheets: 'Clean Sheets',
  failed_to_score: 'Failed to Score',
  form: 'Form',
  shots_total: 'Total Shots',
  shots_on_target: 'Shots on Target',
  shot_accuracy: 'Shot Accuracy',
  expected_goals: 'xG',
  expected_goals_against: 'xGA',
  tackles_per_game: 'Tackles/Game',
  interceptions_per_game: 'Interceptions/Game',
  clearances_per_game: 'Clearances/Game',
  fouls_per_game: 'Fouls/Game',
  home_played: 'Home Matches',
  home_wins: 'Home Wins',
  home_draws: 'Home Draws',
  home_losses: 'Home Losses',
  home_goals_for: 'Home Goals For',
  home_goals_against: 'Home Goals Against',
  away_played: 'Away Matches',
  away_wins: 'Away Wins',
  away_draws: 'Away Draws',
  away_losses: 'Away Losses',
  away_goals_for: 'Away Goals For',
  away_goals_against: 'Away Goals Against',
};

const STAT_ABBREVS: Record<string, string> = {
  // ── NBA ──
  pts: 'PTS',
  reb: 'REB',
  oreb: 'OREB',
  dreb: 'DREB',
  ast: 'AST',
  stl: 'STL',
  blk: 'BLK',
  turnover: 'TO',
  pf: 'PF',
  fg_pct: 'FG%',
  fg3_pct: '3P%',
  ft_pct: 'FT%',
  fgm: 'FGM',
  fga: 'FGA',
  ftm: 'FTM',
  fta: 'FTA',
  fg3m: '3PM',
  fg3a: '3PA',
  games_played: 'GP',
  minutes: 'MIN',
  plus_minus: '+/-',
  efficiency: 'EFF',
  true_shooting_pct: 'TS%',
  efg_pct: 'eFG%',
  ast_to_tov: 'AST/TO',
  pts_allowed: 'PTSA',
  pts_per_36: 'P36',
  reb_per_36: 'R36',
  oreb_per_36: 'OR36',
  dreb_per_36: 'DR36',
  ast_per_36: 'A36',
  stl_per_36: 'S36',
  blk_per_36: 'B36',
  fgm_per_36: 'FGM36',
  fga_per_36: 'FGA36',
  fg3m_per_36: '3PM36',
  fg3a_per_36: '3PA36',
  ftm_per_36: 'FTM36',
  fta_per_36: 'FTA36',
  tov_per_36: 'TO36',
  pf_per_36: 'PF36',

  // ── NFL ──
  passing_yards: 'YDS',
  passing_touchdowns: 'TD',
  passing_interceptions: 'INT',
  passing_completions: 'CMP',
  passing_attempts: 'ATT',
  passing_yards_per_game: 'Y/G',
  passing_completion_pct: 'CMP%',
  qbr: 'RTG',
  td_int_ratio: 'TD/I',
  rushing_yards: 'YDS',
  rushing_touchdowns: 'TD',
  rushing_attempts: 'ATT',
  rushing_yards_per_game: 'Y/G',
  yards_per_rush_attempt: 'Y/A',
  yards_per_pass_attempt: 'YPA',
  sacks_taken: 'SCKT',
  rushing_first_downs: '1D',
  receptions: 'REC',
  receiving_yards: 'YDS',
  receiving_touchdowns: 'TD',
  receiving_targets: 'TGT',
  receiving_yards_per_game: 'Y/G',
  yards_per_reception: 'Y/R',
  receiving_first_downs: '1D',
  catch_pct: 'CTH%',
  total_tackles: 'TKL',
  solo_tackles: 'SOLO',
  assist_tackles: 'AST',
  defensive_sacks: 'SCK',
  defensive_sack_yards: 'SKYD',
  defensive_interceptions: 'INT',
  interception_touchdowns: 'ITD',
  fumbles_forced: 'FF',
  fumbles_recovered: 'FR',
  fumbles_touchdowns: 'FTD',
  tackles_for_loss: 'TFL',
  passes_defended: 'PD',
  qb_hits: 'QBH',
  fumbles: 'FUM',
  fumbles_lost: 'FLST',
  total_points: 'PTS',
  field_goals_made: 'FGM',
  field_goal_attempts: 'FGA',
  field_goal_pct: 'FG%',
  extra_points_made: 'XP',
  punts: 'PNT',
  punt_yards: 'PYD',
  punts_inside_20: 'P20',
  kick_returns: 'KR',
  kick_return_yards: 'KRY',
  kick_return_touchdowns: 'KTD',
  punt_returner_returns: 'PR',
  punt_returner_return_yards: 'PRY',
  punt_return_touchdowns: 'PTD',
  touchbacks: 'TB',

  // ── Football (Soccer) ──
  goals: 'G',
  assists: 'A',
  shots: 'SH',
  shots_on: 'SOT',
  big_chances_created: 'BCC',
  chances_created: 'CC',
  penalty_scored: 'PEN',
  penalty_missed: 'PM',
  penalty_goals: 'PG',
  passes: 'PAS',
  passes_total: 'PAS',
  passes_accuracy: 'ACC%',
  pass_accuracy: 'PAS%',
  passes_in_final_third: 'F3P',
  passes_final_third: 'F3P',
  key_passes: 'KP',
  crosses: 'CRS',
  crosses_accuracy: 'CRS%',
  cross_accuracy: 'CRS%',
  through_balls: 'TB',
  touches: 'TCH',
  possession_lost: 'POSL',
  possession_pct: 'POS%',
  dribble_success_rate: 'DRB%',
  successful_dribbles: 'DRB',
  tackles: 'TKL',
  tackles_won: 'TW',
  tackles_won_percentage: 'TW%',
  blocks: 'BLK',
  interceptions: 'INT',
  clearances: 'CLR',
  ball_recovery: 'BR',
  duels_won: 'DW',
  duels_total: 'DT',
  duel_success_rate: 'DUL%',
  duels_won_percentage: 'DUL%',
  aerials_won_percentage: 'AER%',
  saves: 'SV',
  dangerous_attacks: 'DA',
  shots_insidebox: 'SIB',
  corners: 'COR',
  yellow_cards: 'YC',
  yellow_cards_total: 'YC',
  red_cards: 'RC',
  red_cards_total: 'RC',
  fouls_committed: 'FC',
  fouls_drawn: 'FD',
  offsides: 'OFF',
  offsides_provoked: 'OFFW',
  rating: 'RTG',
  games: 'GP',
  goals_per_90: 'G90',
  assists_per_90: 'A90',
  shots_per_90: 'SH90',
  shots_total_per_90: 'SH90',
  shots_on_target_per_90: 'SOT90',
  expected_goals_per_90: 'xG90',
  key_passes_per_90: 'KP90',
  passes_total_per_90: 'PAS90',
  passes_accurate_per_90: 'ACC90',
  passes_in_final_third_per_90: 'F3P90',
  crosses_total_per_90: 'CRS90',
  crosses_accurate_per_90: 'CRA90',
  long_balls_per_90: 'LB90',
  long_balls_won_per_90: 'LBW90',
  through_balls_per_90: 'TB90',
  through_balls_won_per_90: 'TBW90',
  dribbles_attempts_per_90: 'DRB90',
  dribbles_success_per_90: 'DBS90',
  chances_created_per_90: 'CC90',
  big_chances_created_per_90: 'BCC90',
  tackles_per_90: 'TK90',
  tackles_won_per_90: 'TW90',
  interceptions_per_90: 'I90',
  clearances_per_90: 'CLR90',
  blocks_per_90: 'BLK90',
  duels_total_per_90: 'DUL90',
  duels_won_per_90: 'DW90',
  ball_recovery_per_90: 'BR90',
  aerials_per_90: 'AER90',
  aeriels_won_per_90: 'AW90',
  saves_per_90: 'SV90',
  saves_insidebox_per_90: 'SIB90',
  goals_conceded_per_90: 'GC90',
  fouls_committed_per_90: 'FC90',
  fouls_drawn_per_90: 'FD90',
  dispossessed_per_90: 'DSP90',
  possession_lost_per_90: 'PL90',
  dribbled_past_per_90: 'DRP90',
  turnovers_per_90: 'TO90',

  // ── Team shared ──
  wins: 'W',
  losses: 'L',
  ties: 'T',
  win_pct: 'PCT',
  points_for: 'PF',
  points_against: 'PA',
  point_differential: 'DIFF',
  total_yards: 'YDS',
  turnovers: 'TO',
  points_per_game: 'PPG',
  points_allowed_per_game: 'PAPG',
  yards_per_game: 'YPG',
  turnover_differential: 'TODF',
  takeaways: 'TA',

  // ── Football (Soccer) Team ──
  matches_played: 'MP',
  draws: 'D',
  points: 'PTS',
  league_position: 'POS',
  goals_for: 'GF',
  goals_against: 'GA',
  goal_difference: 'GD',
  goals_per_game: 'G/G',
  goals_conceded_per_game: 'GA/G',
  clean_sheets: 'CS',
  failed_to_score: 'FTS',
  shots_total: 'SH',
  shots_on_target: 'SOT',
  shot_accuracy: 'SH%',
  expected_goals: 'xG',
  expected_goals_against: 'xGA',
  tackles_per_game: 'TKL',
  interceptions_per_game: 'INT',
  clearances_per_game: 'CLR',
  fouls_per_game: 'FPG',
  home_played: 'HP',
  home_wins: 'HW',
  home_draws: 'HD',
  home_losses: 'HL',
  home_goals_for: 'HGF',
  home_goals_against: 'HGA',
  away_played: 'AP',
  away_wins: 'AW',
  away_draws: 'AD',
  away_losses: 'AL',
  away_goals_for: 'AGF',
  away_goals_against: 'AGA',
};

/**
 * Box score groups — compact stat rows for the horizontal table display.
 */
const BOX_SCORE_CONFIG: Record<string, { id: string; label: string; keys: string[] }[]> = {
  // ── NBA Player ──
  NBA: [
    { id: 'counting', label: 'Per Game', keys: ['pts', 'reb', 'ast', 'stl', 'blk', 'turnover'] },
    { id: 'shooting', label: 'Shooting', keys: ['fg_pct', 'fg3_pct', 'ft_pct', 'true_shooting_pct'] },
    { id: 'activity', label: 'Activity', keys: ['games_played', 'minutes', 'plus_minus', 'efficiency'] },
  ],
  // ── NFL Player ──
  NFL: [
    { id: 'passing', label: 'Passing', keys: ['passing_yards', 'passing_touchdowns', 'passing_interceptions', 'qbr', 'passing_completion_pct'] },
    { id: 'rushing', label: 'Rushing', keys: ['rushing_yards', 'rushing_touchdowns', 'rushing_attempts', 'yards_per_rush_attempt'] },
    { id: 'receiving', label: 'Receiving', keys: ['receiving_yards', 'receiving_touchdowns', 'receptions', 'receiving_targets'] },
    { id: 'defense', label: 'Defense', keys: ['total_tackles', 'defensive_sacks', 'defensive_interceptions', 'fumbles_forced', 'passes_defended'] },
    { id: 'kicking', label: 'Kicking', keys: ['field_goals_made', 'field_goal_pct', 'extra_points_made'] },
  ],
  // ── Football (Soccer) Player ──
  FOOTBALL: [
    { id: 'attacking', label: 'Attacking', keys: ['goals', 'assists', 'shots_on', 'key_passes'] },
    { id: 'passing', label: 'Passing', keys: ['passes', 'passes_accuracy', 'crosses'] },
    { id: 'defense', label: 'Defense', keys: ['tackles', 'duels_won', 'fouls_committed'] },
    { id: 'general', label: 'General', keys: ['games', 'minutes', 'rating'] },
  ],

  // ── NBA Team ──
  NBA_TEAM: [
    { id: 'record', label: 'Record', keys: ['wins', 'losses', 'win_pct'] },
    { id: 'scoring', label: 'Scoring', keys: ['pts', 'ast', 'reb'] },
    { id: 'shooting', label: 'Shooting', keys: ['fg_pct', 'fg3_pct', 'ft_pct'] },
  ],
  // ── NFL Team ──
  NFL_TEAM: [
    { id: 'record', label: 'Record', keys: ['wins', 'losses', 'ties', 'win_pct'] },
    { id: 'scoring', label: 'Scoring', keys: ['points_for', 'points_against', 'point_differential'] },
    { id: 'offense', label: 'Offense', keys: ['total_yards', 'passing_yards', 'rushing_yards'] },
    { id: 'defense', label: 'Defense', keys: ['defensive_sacks', 'defensive_interceptions', 'passes_defended'] },
  ],
  // ── Football (Soccer) Team ──
  FOOTBALL_TEAM: [
    { id: 'record', label: 'Record', keys: ['matches_played', 'wins', 'draws', 'losses', 'points'] },
    { id: 'goals', label: 'Goals', keys: ['goals_for', 'goals_against', 'goal_difference', 'clean_sheets'] },
    { id: 'performance', label: 'Performance', keys: ['goals_per_game', 'goals_conceded_per_game'] },
  ],
};

function getConfigKey(sport: string, entityType?: 'player' | 'team'): string {
  const sportUpper = sport.toUpperCase();
  if (entityType === 'team') {
    return `${sportUpper}_TEAM`;
  }
  return sportUpper;
}

export function categorizeStats(
  stats: Record<string, unknown>,
  percentiles: Record<string, number> = {},
  sport: string,
  entityType: 'player' | 'team' = 'player'
): Category[] {
  const configKey = getConfigKey(sport, entityType);
  const config = CATEGORY_CONFIG[configKey] || CATEGORY_CONFIG[sport.toUpperCase()] || CATEGORY_CONFIG.NBA;
  const categories: Category[] = [];

  for (const cat of config) {
    const catStats: StatItem[] = [];

    for (const key of cat.keys) {
      const value = stats[key];
      if (value !== undefined && value !== null) {
        catStats.push({
          key,
          label: STAT_LABELS[key] || formatStatKey(key),
          value: value as number | string,
          percentile: percentiles[key] ?? null,
        });
      }
    }

    if (catStats.length > 0) {
      categories.push({
        id: cat.id,
        label: cat.label,
        volume: catStats.length,
        stats: catStats,
      });
    }
  }

  return categories.sort((a, b) => avgPercentile(b) - avgPercentile(a));
}

/** Average percentile across a category's stats (stats without percentiles are ignored). */
function avgPercentile(cat: Category): number {
  let sum = 0;
  let count = 0;
  for (const s of cat.stats) {
    if (s.percentile != null) {
      sum += s.percentile;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Categorize rate-adjusted stats (per-36 for NBA, per-90 for Football).
 * Returns empty array for sports without rate stats (e.g., NFL).
 *
 * When `perGameOrder` is provided, rate categories are sorted to mirror
 * the per-game chart order (each rate category takes the position of its
 * earliest matching per-game category via the `mirrors` mapping).
 */
export function categorizeRateStats(
  stats: Record<string, unknown>,
  percentiles: Record<string, number> = {},
  sport: string,
  perGameOrder: string[] = []
): Category[] {
  const sportUpper = sport.toUpperCase();
  const config = RATE_CATEGORY_CONFIG[sportUpper];
  if (!config) return [];

  const categories: Category[] = [];

  for (const cat of config) {
    const catStats: StatItem[] = [];

    for (const key of cat.keys) {
      const value = stats[key];
      if (value !== undefined && value !== null) {
        catStats.push({
          key,
          label: STAT_LABELS[key] || formatStatKey(key),
          value: value as number | string,
          percentile: percentiles[key] ?? null,
        });
      }
    }

    if (catStats.length > 0) {
      categories.push({
        id: cat.id,
        label: cat.label,
        volume: catStats.length,
        stats: catStats,
      });
    }
  }

  // Mirror the per-game order if provided
  if (perGameOrder.length > 0) {
    const mirrorIndex = (catId: string): number => {
      const def = config.find(c => c.id === catId);
      if (!def) return Infinity;
      for (const mirrorId of def.mirrors) {
        const idx = perGameOrder.indexOf(mirrorId);
        if (idx !== -1) return idx;
      }
      return Infinity;
    };
    categories.sort((a, b) => mirrorIndex(a.id) - mirrorIndex(b.id));
  } else {
    categories.sort((a, b) => avgPercentile(b) - avgPercentile(a));
  }

  return categories;
}

/**
 * Build the 4 fixed chart slots (attack / possession / defense / discipline)
 * for a given sport/entity type. Always returns CHART_SLOTS.length entries
 * in slot order — slots with no mapped stats come back empty.
 */
export function categorizeForCharts(
  stats: Record<string, unknown>,
  percentiles: Record<string, number> = {},
  sport: string,
  entityType: 'player' | 'team' = 'player'
): Category[] {
  const configKey = getConfigKey(sport, entityType);
  const config = CHART_CATEGORY_CONFIG[configKey];
  return buildChartCategories(stats, percentiles, config);
}

/**
 * Rate-adjusted (per-36 / per-90) chart slots for sports that support them.
 * Returns empty array for sports without rate stats.
 */
export function categorizeRateForCharts(
  stats: Record<string, unknown>,
  percentiles: Record<string, number> = {},
  sport: string
): Category[] {
  const config = CHART_RATE_CATEGORY_CONFIG[sport.toUpperCase()];
  if (!config) return [];
  return buildChartCategories(stats, percentiles, config);
}

function buildChartCategories(
  stats: Record<string, unknown>,
  percentiles: Record<string, number>,
  config: ChartSlotMap | undefined
): Category[] {
  return CHART_SLOTS.map(slot => {
    const keys = config?.[slot] ?? [];
    const catStats: StatItem[] = [];
    for (const key of keys) {
      const value = stats[key];
      if (value !== undefined && value !== null) {
        catStats.push({
          key,
          label: STAT_LABELS[key] || formatStatKey(key),
          value: value as number | string,
          percentile: percentiles[key] ?? null,
        });
      }
    }
    return {
      id: slot,
      label: CHART_SLOT_LABELS[slot],
      volume: catStats.length,
      stats: catStats,
    };
  });
}

/**
 * Get the rate stats label for a sport (e.g., "Per 36" for NBA, "Per 90" for Football).
 * Returns null for sports without rate stats.
 */
export function getRateLabel(sport: string): string | null {
  const sportUpper = sport.toUpperCase();
  if (sportUpper === 'NBA') return 'Per 36';
  if (sportUpper === 'FOOTBALL') return 'Per 90';
  return null;
}

function formatStatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function getStatLabel(key: string): string {
  return STAT_LABELS[key] || formatStatKey(key);
}

export function flattenStats(
  stats: Record<string, unknown>,
  sport?: string,
  entityType: 'player' | 'team' = 'player'
): Array<{ label: string; value: string | number }> {
  const result: Array<{ label: string; value: string | number }> = [];
  const excludeKeys = new Set(['season', 'player_id', 'team_id', 'id', 'form']);

  let orderedKeys: string[] = [];
  if (sport) {
    const configKey = getConfigKey(sport, entityType);
    const config = CATEGORY_CONFIG[configKey] || CATEGORY_CONFIG[sport.toUpperCase()] || CATEGORY_CONFIG.NBA;
    orderedKeys = config.flatMap(cat => cat.keys);
  }

  const processedKeys = new Set<string>();

  for (const key of orderedKeys) {
    if (stats[key] !== null && stats[key] !== undefined && !excludeKeys.has(key)) {
      result.push({
        label: STAT_LABELS[key] || formatStatKey(key),
        value: stats[key] as string | number,
      });
      processedKeys.add(key);
    }
  }

  for (const [key, value] of Object.entries(stats)) {
    if (value !== null && value !== undefined && !excludeKeys.has(key) && !processedKeys.has(key)) {
      result.push({
        label: STAT_LABELS[key] || formatStatKey(key),
        value: value as string | number,
      });
    }
  }

  return result;
}

export function getBoxScoreGroups(
  stats: Record<string, unknown>,
  sport: string,
  entityType: 'player' | 'team' = 'player'
): BoxScoreGroup[] {
  const configKey = getConfigKey(sport, entityType);
  const config = BOX_SCORE_CONFIG[configKey] || BOX_SCORE_CONFIG[sport.toUpperCase()] || BOX_SCORE_CONFIG.NBA;
  const groups: BoxScoreGroup[] = [];

  for (const groupConfig of config) {
    const groupStats: BoxScoreStat[] = [];

    for (const key of groupConfig.keys) {
      const value = stats[key];
      if (value !== undefined && value !== null) {
        groupStats.push({
          key,
          abbrev: STAT_ABBREVS[key] || key.toUpperCase().slice(0, 3),
          value: formatStatValue(value, key),
        });
      }
    }

    if (groupStats.length > 0) {
      groups.push({
        id: groupConfig.id,
        label: groupConfig.label,
        stats: groupStats,
      });
    }
  }

  return groups;
}

const DECIMAL_TO_PERCENT_KEYS = new Set(['win_pct']);

function formatStatValue(value: unknown, key?: string): string | number {
  if (typeof value === 'number') {
    if (key && DECIMAL_TO_PERCENT_KEYS.has(key) && value > 0 && value < 1) {
      return (value * 100).toFixed(1);
    }
    if (!Number.isInteger(value)) {
      return value.toFixed(1);
    }
    return value;
  }
  return String(value);
}

export function getStatAbbrev(key: string): string {
  return STAT_ABBREVS[key] || key.toUpperCase().slice(0, 3);
}
