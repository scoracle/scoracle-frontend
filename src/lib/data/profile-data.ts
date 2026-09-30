import { createContext, createMemo, useContext, type SourceAccessor } from 'solid-js';
import type { ProfileContextValue } from '../../contexts/profile';
import { getEntityMeta } from './entity-meta.server';
import { getEntityColors } from './entity-colors.server';
import { getStats } from './stats.server';
import { getRating } from './rating.server';
import { getNews } from './news.server';
import { getTransfers } from './transfers.server';
import { getVibe } from './vibe.server';
import { getMomentum } from './momentum.server';
import { getMomentumSummary } from './momentum-summary.server';
import { getSigil } from './sigil.server';
import { getHeadlines } from './headlines.server';
import { getWeeks } from './weeks.server';
import { parseWeekKey } from '../utils/week';
type Source = Pick<ProfileContextValue, 'sport' | 'type' | 'id' | 'season' | 'newsScope' | 'week' | 'vs'>;
/** One request definition for intent preloading and every mounted consumer. */
export function profileReads(ctx: Source) {
    const live = <T>(read: () => T) => () => ctx.week() ? null : read();
    return {
        meta: () => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()),
        palette: () => getEntityColors(ctx.sport(), ctx.type(), ctx.id()),
        stats: () => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
        report: live(() => getRating(ctx.sport(), ctx.type(), ctx.id(), ctx.season())),
        news: live(() => getNews(ctx.sport(), ctx.type(), ctx.id(), ctx.newsScope())),
        transfers: live(() => getTransfers(ctx.sport(), ctx.type(), ctx.id(), ctx.newsScope())),
        vibe: live(() => getVibe(ctx.sport(), ctx.type(), ctx.id())),
        momentum: live(() => getMomentum(ctx.sport(), ctx.type(), ctx.id(), ctx.season())),
        summary: live(() => getMomentumSummary(ctx.sport(), ctx.type(), ctx.id(), ctx.season())),
        sigil: live(() => getSigil(ctx.sport(), ctx.type(), ctx.id())),
        weeks: () => getWeeks(ctx.sport()),
        archive: () => {
            const week = parseWeekKey(ctx.week());
            return week ? getHeadlines(ctx.sport(), ctx.type(), ctx.id(), week.year, week.week) : null;
        },
        comparisonStats: live(() => ctx.vs() ? getStats(ctx.sport(), ctx.type(), ctx.vs()!, ctx.season()) : null),
        comparisonMeta: live(() => ctx.vs() ? getEntityMeta(ctx.sport(), ctx.type(), ctx.vs()!) : null),
    };
}
export type ProfileReads = ReturnType<typeof profileReads>;
export const ProfileReadsContext = createContext<ProfileReads>();
/* Default-less context, so useContext throws ContextNotFoundError and is typed
   `T` — the old guard was unreachable (see core.d.ts:85-117). */
export function useProfileReads(): ProfileReads {
    return useContext(ProfileReadsContext);
}
/** A boundary owns its async computation; query() owns shared data and dedup.
 * Do not hoist these memos above the boundary that must recover them.
 *
 * WHY, measured 2026-09-29 (T2.3, third attempt — the reason recorded in the
 * previous two audits was wrong; this one was tested):
 *
 * The old note claimed the per-consumer memo is ERROR ISOLATION — that one
 * memo per key means "a failed read fails every consumer of that key at once".
 * That is FALSE. Hoisting a rejected memo to the provider still leaves every
 * consumer rendering its own <Errored> fallback: a rejected memo is handed to
 * the boundary that READS it, so two sibling boundaries over one shared
 * rejecting memo each render their own error UI. Error isolation was never
 * what these memos bought.
 *
 * What they actually buy is RECOVERY. Every retry in this app is
 * `revalidate(); reset();` (card-error-retry in routes/profile/[id].tsx:87 and
 * ReadingTable.tsx:81, and the leaderboard/story/search equivalents).
 * revalidate() only clears query()'s CACHE. The refetch happens because
 * reset() recomputes the boundary's OWN sources — and a memo created INSIDE
 * the boundary is one of them, so it re-invokes, misses the now-empty cache,
 * and refetches.
 *
 * Hoist that same memo to the provider and it is no longer a source of the
 * boundary below it: reset() cannot reach it, it keeps the rejected value, and
 * nothing refetches. Measured against the real workerd server with a provider-
 * level memoProfileReads(reads): retrying a timed-out /rating made ZERO
 * requests through the proxy and the card stayed in .card-error indefinitely,
 * where per-consumer memos refetched once and recovered. That broke exactly
 * three browser tests — backend deadline yields a card error while sibling
 * cards survive / a failed shared score product stays isolated and retries
 * through its card boundary / a stats outage retains identity and sibling
 * cards, then restores controls on retry.
 *
 * So the duplication (~2x graph nodes per key, one in useProfileRead and one
 * in the deck score reader) is the PRICE of native boundary recovery. query()
 * already dedupes the request, so eager-loading pays the network once; only
 * the graph nodes are duplicated. Sharing them is a behaviour change to retry,
 * not a cleanup — it would need its own recovery design (a revalidate-keyed
 * signal the memos track, so a shared memo CAN be invalidated by a boundary),
 * plus a pass over the three tests above. Not attempted here.
 */
export function useProfileRead<K extends keyof ProfileReads>(key: K) {
    return createMemo<unknown>(useProfileReads()[key]) as SourceAccessor<Awaited<ReturnType<ProfileReads[K]>>>;
}
export function preloadProfile(ctx: Source) {
    for (const read of Object.values(profileReads(ctx)))
        void Promise.resolve(read()).catch(() => { });
}
