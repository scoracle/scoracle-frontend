import type { AutocompleteEntity } from "../types";
import { getPositionGroup } from "../utils/position-groups";
import { normalizeForSearch } from "../utils/search-normalize";
export function parseEntities(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
entities: readonly any[], fallbackSport?: string): AutocompleteEntity[] {
    const items: AutocompleteEntity[] = [];
    for (const entity of entities) {
        const itemSport = String(entity.sport ?? fallbackSport ?? "").toLowerCase();
        const type = entity.type;
        const id = String(entity.entity_id ?? entity.id ?? "");
        if (!['player', 'team'].includes(type) || !/^[1-9]\d*$/.test(id) || !entity.name?.trim()) continue;
        const rawPosition = entity.position || entity.meta?.position;
        const positionGroup = type === "player" && itemSport
            ? getPositionGroup(itemSport, rawPosition)
            : undefined;
        const item: AutocompleteEntity = {
            id,
            name: entity.name,
            type,
            team: entity.team ?? entity.meta?.team ?? entity.meta?.abbreviation,
            position: rawPosition,
            positionGroup,
            sport: itemSport || fallbackSport,
        };
        if (entity.conference) item.conference = entity.conference;
        if (entity.league) item.league = entity.league;
        if (Array.isArray(entity.aliases) && entity.aliases.length > 0) {
            item.aliases = entity.aliases;
        }
        if (Array.isArray(entity.search_tokens) && entity.search_tokens.length > 0) {
            item.search_tokens = entity.search_tokens;
        }
        // Precompute a normalized search haystack so keystroke filtering is cheap
        // and diacritic-insensitive (e.g. "estevao" matches "Estêvão").
        const parts = [item.name, ...(item.aliases ?? []), ...(item.search_tokens ?? [])];
        item._searchIndex = parts.map(normalizeForSearch).filter(Boolean).join("|");
        items.push(item);
    }
    return items;
}
