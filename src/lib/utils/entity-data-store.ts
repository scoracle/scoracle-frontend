/**
 * Entity Data Store
 *
 * Centralized store for sport entity data, split into two tiers:
 *
 * 1. **Autocomplete DB** (`{sport}.json`) — lightweight entity names/IDs.
 *    Loaded by sport-scoped search controls.
 *
 * 2. **Universal DB** (`/api/v1/entities`) — lightweight cross-sport
 *    names/IDs for the home page only.
 *
 * 3. **Meta DB** (`{sport}-meta.json`) — full player/team metadata.
 *    Lazy-loaded via `loadMeta(sport)` only on the profile page.
 *
 * Usage:
 *   // Initialize early (e.g., in layout)
 *   import { entityDataStore } from './entity-data-store';
 *   entityDataStore.preloadAll();
 *
 *   // Get autocomplete data for a sport (waits for load if needed)
 *   const entities = await entityDataStore.getEntities('nba');
 *
 *   // On profile page: load meta, then hydrate widget
 *   await entityDataStore.loadMeta('nba');
 *   const playerMeta = entityDataStore.getPlayerMeta('nba', '123');
 */

import { isServer } from 'solid-js/web';
import { SPORTS, type AutocompleteEntity, type PlayerMeta, type TeamMeta } from '../types';
import { getPositionGroup } from './position-groups';
import { normalizeForSearch } from './search-normalize';
import { readServerAssetText } from './cloudflare-env';
import { getBaseUrl } from './data-sources';

interface EntityDataStoreState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

type SportKey = 'nba' | 'nfl' | 'football';

class EntityDataStore {
  private data: Map<SportKey, AutocompleteEntity[]> = new Map();
  private universalData: AutocompleteEntity[] | null = null;
  private playerMeta: Map<SportKey, Map<string, PlayerMeta>> = new Map();
  private teamMeta: Map<SportKey, Map<string, TeamMeta>> = new Map();
  private loadPromises: Map<SportKey, Promise<AutocompleteEntity[]>> = new Map();
  private universalLoadPromise: Promise<AutocompleteEntity[]> | null = null;
  private metaLoadPromises: Map<SportKey, Promise<void>> = new Map();
  private allLoadedPromise: Promise<void> | null = null;
  private state: EntityDataStoreState = {
    loaded: false,
    loading: false,
    error: null,
  };

  /**
   * Preload lightweight autocomplete data for all sports in parallel.
   * Call this early in app lifecycle for best performance.
   */
  public preloadAll(): Promise<void> {
    if (this.allLoadedPromise) {
      return this.allLoadedPromise;
    }

    this.state.loading = true;
    this.state.error = null;

    const loadPromises = SPORTS.map(sport =>
      this.loadSport(sport.idLower as SportKey)
    );

    this.allLoadedPromise = Promise.all(loadPromises)
      .then(() => {
        this.state.loaded = true;
        this.state.loading = false;
        if (import.meta.env.DEV) {
          console.log('[EntityDataStore] All sports preloaded:',
            Array.from(this.data.entries()).map(([k, v]) => `${k}: ${v.length} entities`).join(', ')
          );
        }
      })
      .catch(err => {
        this.state.loading = false;
        this.state.error = err.message;
        console.error('[EntityDataStore] Failed to preload:', err);
      });

    return this.allLoadedPromise;
  }

  /**
   * Load autocomplete data for a single sport.
   * Returns cached data if already loaded.
   */
  private async loadSport(sport: SportKey): Promise<AutocompleteEntity[]> {
    if (this.data.has(sport)) {
      return this.data.get(sport)!;
    }

    if (this.loadPromises.has(sport)) {
      return this.loadPromises.get(sport)!;
    }

    const sportConfig = SPORTS.find(s => s.idLower === sport);
    if (!sportConfig) {
      throw new Error(`Unknown sport: ${sport}`);
    }

    const promise = this.fetchEntities(sportConfig.dataFile, sport);
    this.loadPromises.set(sport, promise);

    try {
      const entities = await promise;
      this.data.set(sport, entities);
      return entities;
    } finally {
      this.loadPromises.delete(sport);
    }
  }

  /**
   * Load a data JSON, working on both sides: the browser fetches the
   * version-busted URL; SSR reads the bundled asset via the ASSETS binding
   * (prod) or local disk (dev) — never a self-origin fetch, which would 522
   * inside a Worker.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadJson(path: string, url: string): Promise<any> {
    if (isServer) {
      const text = await readServerAssetText(path);
      if (text == null) {
        throw new Error(`Asset ${path} unavailable server-side`);
      }
      return JSON.parse(text);
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetch and parse a lightweight autocomplete JSON file.
   * Only contains entity id/name/type/position — no full metadata.
   */
  private parseEntities(
    entities: readonly any[],
    fallbackSport?: SportKey,
  ): AutocompleteEntity[] {
    const items: AutocompleteEntity[] = [];

    for (const entity of entities) {
      const rawSport = String(entity.sport ?? fallbackSport ?? '').toLowerCase();
      const itemSport = rawSport as SportKey;
      const rawPosition = entity.position || entity.meta?.position;
      const positionGroup =
        entity.type === 'player' && itemSport
          ? getPositionGroup(itemSport, rawPosition)
          : undefined;

      const item: AutocompleteEntity = {
        id: String(entity.entity_id ?? entity.id),
        name: entity.name,
        type: entity.type as 'player' | 'team',
        team: entity.team ?? entity.meta?.team ?? entity.meta?.abbreviation,
        position: rawPosition,
        positionGroup,
        sport: itemSport || fallbackSport,
      };

      if (entity.aliases && Array.isArray(entity.aliases) && entity.aliases.length > 0) {
        item.aliases = entity.aliases;
      }

      if (entity.search_tokens && Array.isArray(entity.search_tokens) && entity.search_tokens.length > 0) {
        item.search_tokens = entity.search_tokens;
      }

      // Precompute a normalized search haystack so keystroke filtering is cheap
      // and diacritic-insensitive (e.g. "estevao" matches "Estêvão").
      const parts = [item.name, ...(item.aliases ?? []), ...(item.search_tokens ?? [])];
      item._searchIndex = parts.map(normalizeForSearch).filter(Boolean).join('|');

      items.push(item);
    }

    return items;
  }

  private async fetchEntities(dataFile: string, sport: SportKey): Promise<AutocompleteEntity[]> {
    const version = typeof __DATA_VERSION__ !== 'undefined' ? __DATA_VERSION__ : '';
    const url = version ? `${dataFile}?v=${version}` : dataFile;
    const json = await this.loadJson(dataFile, url);
    return Array.isArray(json.entities) ? this.parseEntities(json.entities, sport) : [];
  }

  private async fetchUniversalEntitiesAsset(): Promise<AutocompleteEntity[]> {
    const dataFile = '/data/entities.json';
    const version = typeof __DATA_VERSION__ !== 'undefined' ? __DATA_VERSION__ : '';
    const url = version ? `${dataFile}?v=${version}` : dataFile;
    const json = await this.loadJson(dataFile, url);
    return Array.isArray(json.entities) ? this.parseEntities(json.entities) : [];
  }

  private async fetchUniversalEntities(): Promise<AutocompleteEntity[]> {
    const url = `${getBaseUrl()}/entities`;

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Failed to fetch universal entities: ${response.status}`);
      }
      const json = await response.json();
      return Array.isArray(json.entities) ? this.parseEntities(json.entities) : [];
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[EntityDataStore] Universal API unavailable; trying bundled fallback:', err);
      }
      return this.fetchUniversalEntitiesAsset();
    }
  }

  /**
   * Lazy-load full player/team metadata for a single sport.
   * Call this on the profile page before hydrating meta widgets.
   * Fetches `{sport}-meta.json` — deduplicates concurrent calls.
   */
  public async loadMeta(sport: string): Promise<void> {
    const normalized = sport.toLowerCase() as SportKey;

    // Already loaded
    if (this.playerMeta.has(normalized) || this.teamMeta.has(normalized)) {
      return;
    }

    // Already in-flight — reuse the promise
    if (this.metaLoadPromises.has(normalized)) {
      return this.metaLoadPromises.get(normalized)!;
    }

    const sportConfig = SPORTS.find(s => s.idLower === normalized);
    if (!sportConfig) {
      throw new Error(`Unknown sport: ${normalized}`);
    }

    // Derive meta file path from the autocomplete file path:
    //   /data/nba.json → /data/nba-meta.json
    const metaFile = sportConfig.dataFile.replace('.json', '-meta.json');
    const version = typeof __DATA_VERSION__ !== 'undefined' ? __DATA_VERSION__ : '';
    const url = version ? `${metaFile}?v=${version}` : metaFile;

    const promise = (async () => {
      const json = await this.loadJson(metaFile, url);

      if (json.players && Array.isArray(json.players)) {
        const playerMap = new Map<string, PlayerMeta>();
        for (const p of json.players) {
          playerMap.set(String(p.id), p as PlayerMeta);
        }
        this.playerMeta.set(normalized, playerMap);
      }

      if (json.teams && Array.isArray(json.teams)) {
        const teamMap = new Map<string, TeamMeta>();
        for (const t of json.teams) {
          teamMap.set(String(t.id), t as TeamMeta);
        }
        this.teamMeta.set(normalized, teamMap);
      }

      if (import.meta.env.DEV) {
        console.log(`[EntityDataStore] Meta loaded for ${normalized}:`,
          `${this.playerMeta.get(normalized)?.size ?? 0} players,`,
          `${this.teamMeta.get(normalized)?.size ?? 0} teams`
        );
      }
    })();

    this.metaLoadPromises.set(normalized, promise);

    try {
      await promise;
    } finally {
      this.metaLoadPromises.delete(normalized);
    }
  }

  /**
   * Get entities for a sport.
   * If preloadAll() wasn't called, this will load just that sport.
   */
  public async getEntities(sport: string): Promise<AutocompleteEntity[]> {
    const normalized = sport.toLowerCase() as SportKey;

    if (this.data.has(normalized)) {
      return this.data.get(normalized)!;
    }

    if (this.allLoadedPromise) {
      await this.allLoadedPromise;
      return this.data.get(normalized) || [];
    }

    return this.loadSport(normalized);
  }

  /**
   * Get the universal lightweight entity directory for home search.
   */
  public async getUniversalEntities(): Promise<AutocompleteEntity[]> {
    if (this.universalData) return this.universalData;

    if (!this.universalLoadPromise) {
      this.universalLoadPromise = this.fetchUniversalEntities();
    }

    try {
      this.universalData = await this.universalLoadPromise;
      return this.universalData;
    } finally {
      this.universalLoadPromise = null;
    }
  }

  /**
   * Get entities synchronously (returns empty array if not loaded).
   * Use this when you've already awaited preloadAll() or getEntities().
   */
  public getEntitiesSync(sport: string): AutocompleteEntity[] {
    const normalized = sport.toLowerCase() as SportKey;
    return this.data.get(normalized) || [];
  }

  /**
   * Get player metadata for widget hydration.
   * Returns undefined if meta not loaded or player not found.
   * Call loadMeta(sport) first on the profile page.
   */
  public getPlayerMeta(sport: string, id: string): PlayerMeta | undefined {
    const normalized = sport.toLowerCase() as SportKey;
    return this.playerMeta.get(normalized)?.get(id);
  }

  /**
   * Get team metadata for widget hydration.
   * Returns undefined if meta not loaded or team not found.
   * Call loadMeta(sport) first on the profile page.
   */
  public getTeamMeta(sport: string, id: string): TeamMeta | undefined {
    const normalized = sport.toLowerCase() as SportKey;
    return this.teamMeta.get(normalized)?.get(id);
  }

  /**
   * Get player metadata synchronously (alias for getPlayerMeta).
   */
  public getPlayerMetaSync(sport: string, id: string): PlayerMeta | undefined {
    return this.getPlayerMeta(sport, id);
  }

  /**
   * Get team metadata synchronously (alias for getTeamMeta).
   */
  public getTeamMetaSync(sport: string, id: string): TeamMeta | undefined {
    return this.getTeamMeta(sport, id);
  }

  /**
   * Check if all autocomplete data is loaded.
   */
  public isLoaded(): boolean {
    return this.state.loaded;
  }

  /**
   * Check if currently loading.
   */
  public isLoading(): boolean {
    return this.state.loading;
  }

  /**
   * Wait for all autocomplete data to be loaded.
   */
  public async waitForLoad(): Promise<void> {
    if (this.state.loaded) return;
    if (this.allLoadedPromise) {
      await this.allLoadedPromise;
    }
  }

  /**
   * Get current state.
   */
  public getState(): EntityDataStoreState {
    return { ...this.state };
  }
}

// Singleton instance
export const entityDataStore = new EntityDataStore();
