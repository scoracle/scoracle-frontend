/** Canonical search identity; retain the first published row and merge its aliases. */
export function normalizeDirectory(rows) {
    const unique = new Map();
    for (const row of rows) {
        const type = row.type;
        if (!['player', 'team'].includes(type) || !row.name?.trim()) continue;
        const item = { ...row, type };
        const key = `${row.sport ?? ''}|${type}|${row.id ?? row.entity_id}`;
        const prior = unique.get(key);
        if (!prior) unique.set(key, item);
        else for (const field of ['aliases', 'search_tokens']) {
            const values = [...new Set([...(prior[field] ?? []), ...(item[field] ?? [])])];
            if (values.length) prior[field] = values;
        }
    }
    return [...unique.values()];
}
