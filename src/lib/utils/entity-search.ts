import type { AutocompleteEntity } from "../types";
import { normalizeForSearch } from "./search-normalize";
export type EntitySearchMode = "name" | "full";
export interface EntitySearchOptions {
    limit: number;
    minQueryLength?: number;
    mode?: EntitySearchMode;
}
function fuzzyNameMatch(name: string, queryTokens: string[]): boolean {
    const textTokens = normalizeForSearch(name).split(/\s+/);
    return queryTokens.every((qt) => textTokens.some((tt) => tt.startsWith(qt)));
}
function haystackFor(entity: AutocompleteEntity, mode: EntitySearchMode): string {
    if (mode === "full")
        return entity._searchIndex ?? normalizeForSearch(entity.name);
    return normalizeForSearch(entity.name);
}
export function searchEntities(entities: readonly AutocompleteEntity[], query: string, options: EntitySearchOptions): AutocompleteEntity[] {
    const q = normalizeForSearch(query);
    if (q.length < (options.minQueryLength ?? 2))
        return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const modeFor = options.mode ?? "full";
    return entities
        .filter((entity) => {
        // Teams match against name + aliases + search_tokens (covers city names);
        // players stay name-only (their aliases carry team/league metadata that
        // would spam results).
        const mode = entity.type === 'team' ? 'full' : 'name';
        const haystack = haystackFor(entity, mode);
        return haystack.includes(q) || (tokens.length > 1 && fuzzyNameMatch(entity.name, tokens));
    })
        .slice(0, options.limit);
}
