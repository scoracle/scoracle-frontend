/**
 * Fetch autofill entity data from Go API and write to public/data/.
 *
 * Usage: node scripts/fetch-autofill.mjs
 *
 * Fetches backend autofill data and writes:
 *   - entities.json      — lightweight universal home-search index from /entities
 *   - {sport}.json       — lightweight sport-scoped entities for autocomplete
 *   - {sport}-meta.json  — full player/team metadata for profile widget hydration (lazy-loaded)
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data');

const GO_API_URL = 'https://api.scoracle.com/api/v1';

const SPORTS = [
  { id: 'NBA', path: 'nba' },
  { id: 'NFL', path: 'nfl' },
  { id: 'FOOTBALL', path: 'football' },
];

function aliasesFor(item) {
  if (!item.search_tokens || !Array.isArray(item.search_tokens)) return [];
  return Array.from(new Set(item.search_tokens.filter(
    (t) => t != null && t.toLowerCase() !== item.name.toLowerCase()
  )));
}

async function fetchUniversal() {
  const url = `${GO_API_URL}/entities`;
  console.log(`  Fetching universal entities from ${url} ...`);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`entities: HTTP ${res.status} — ${await res.text()}`);
  }

  const payload = await res.json();
  const entities = Array.isArray(payload.entities) ? payload.entities : [];
  const output = {
    page: payload.page ?? 'entities',
    generated_at: payload.generated_at ?? new Date().toISOString(),
    total_entities: payload.total_entities ?? entities.length,
    entities,
  };

  const universalPath = join(OUT_DIR, 'entities.json');
  const universalJson = JSON.stringify(output);
  writeFileSync(universalPath, universalJson);
  const universalKB = (Buffer.byteLength(universalJson) / 1024).toFixed(1);

  console.log(`    universal    → ${universalPath} (${entities.length} entities, ${universalKB} KB)`);
}

async function fetchSport(sport) {
  const url = `${GO_API_URL}/${sport.path}/autofill`;
  console.log(`  Fetching ${sport.id} from ${url} ...`);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`${sport.id}: HTTP ${res.status} — ${await res.text()}`);
  }

  const payload = await res.json();
  const items = payload.items || [];

  // ── Autocomplete file (lightweight) ──────────────────────────────────────
  const entities = items.map((item) => {
    const entry = {
      id: String(item.id),
      name: item.name,
      type: item.type,
    };

    if (item.type === 'player') {
      if (item.position) entry.position = item.position;
      if (item.team_name) entry.meta = { team: item.team_name };
    }

    const aliases = aliasesFor(item);
    if (aliases.length > 0) entry.aliases = aliases;

    return entry;
  });

  const autocomplete = {
    sport: sport.id,
    generatedAt: new Date().toISOString(),
    entities,
  };

  const autoPath = join(OUT_DIR, `${sport.path}.json`);
  const autoJson = JSON.stringify(autocomplete);
  writeFileSync(autoPath, autoJson);
  const autoKB = (Buffer.byteLength(autoJson) / 1024).toFixed(1);

  // ── Meta file (full player/team metadata) ────────────────────────────────
  const players = [];
  const teams = [];

  for (const item of items) {
    if (item.type === 'player') {
      const m = item.meta || {};
      const player = {
        id: item.id,
        name: item.name,
        first_name: item.first_name,
        last_name: item.last_name,
        position: item.position,
        detailed_position: item.detailed_position,
        photo_url: item.photo_url,
        nationality: item.nationality,
        date_of_birth: item.date_of_birth,
        height: item.height,
        weight: item.weight,
        team: item.team_id ? {
          id: item.team_id,
          name: item.team_name,
          abbreviation: item.team_abbr,
        } : undefined,
        jersey_number: m.jersey_number,
        college: m.college,
        // NBA-specific draft pedigree
        draft_year: m.draft_year,
        draft_round: m.draft_round,
        draft_pick: m.draft_number,
        // NFL-specific bio (DOB unavailable upstream; backend serves a numeric age)
        age: typeof m.age === 'number' ? m.age : undefined,
        experience: m.experience,
      };
      players.push(player);
    } else if (item.type === 'team') {
      const t = {
        id: item.id,
        name: item.name,
        short_code: item.team_abbr || item.meta?.abbreviation,
      };
      if (item.photo_url) t.logo_url = item.photo_url;
      if (item.meta?.city) t.city = item.meta.city;
      if (item.meta?.country) t.country = item.meta.country;
      if (item.meta?.founded) t.founded = item.meta.founded;
      if (item.meta?.venue_name) t.venue_name = item.meta.venue_name;
      if (item.meta?.venue_capacity) t.venue_capacity = item.meta.venue_capacity;
      if (item.meta?.conference || item.position) t.conference = item.meta?.conference || item.position;
      if (item.meta?.division || item.detailed_position) t.division = item.meta?.division || item.detailed_position;
      if (item.league_name) {
        t.league = { id: item.league_id, name: item.league_name };
      }
      teams.push(t);
    }
  }

  const meta = {
    sport: sport.id,
    generatedAt: new Date().toISOString(),
    players,
    teams,
  };

  const metaPath = join(OUT_DIR, `${sport.path}-meta.json`);
  const metaJson = JSON.stringify(meta);
  writeFileSync(metaPath, metaJson);
  const metaKB = (Buffer.byteLength(metaJson) / 1024).toFixed(1);

  console.log(`  ✓ ${sport.id}: ${entities.length} entities (${players.length} players, ${teams.length} teams)`);
  console.log(`    autocomplete → ${autoPath} (${autoKB} KB)`);
  console.log(`    meta         → ${metaPath} (${metaKB} KB)`);

}

async function main() {
  console.log('Fetching autofill data from Go API...\n');

  await fetchUniversal();

  for (const sport of SPORTS) {
    await fetchSport(sport);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
