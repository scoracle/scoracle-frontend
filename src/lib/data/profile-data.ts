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
export function useProfileReads(): ProfileReads {
    const reads = useContext(ProfileReadsContext);
    if (!reads)
        throw new Error('Profile reads require their route provider');
    return reads;
}
/** A boundary owns its async computation; query() owns shared data and dedup.
 * Do not hoist these memos above the boundary that must recover them. */
export function useProfileRead<K extends keyof ProfileReads>(key: K) {
    return createMemo<unknown>(useProfileReads()[key]) as SourceAccessor<Awaited<ReturnType<ProfileReads[K]>>>;
}
export function preloadProfile(ctx: Source) {
    for (const read of Object.values(profileReads(ctx)))
        void Promise.resolve(read()).catch(() => { });
}
