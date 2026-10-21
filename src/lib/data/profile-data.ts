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
type Source = Pick<ProfileContextValue, 'sport' | 'type' | 'id' | 'season' | 'vs'>;
/** One request definition for intent preloading and every mounted consumer. */
export function profileReads(ctx: Source) {
    return {
        meta: () => getEntityMeta(ctx.sport(), ctx.type(), ctx.id()),
        palette: () => getEntityColors(ctx.sport(), ctx.type(), ctx.id()),
        stats: () => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
        report: () => getRating(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
        news: () => getNews(ctx.sport(), ctx.type(), ctx.id()),
        transfers: () => getTransfers(ctx.sport(), ctx.type(), ctx.id()),
        vibe: () => getVibe(ctx.sport(), ctx.type(), ctx.id()),
        momentum: () => getMomentum(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
        summary: () => getMomentumSummary(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
        sigil: () => getSigil(ctx.sport(), ctx.type(), ctx.id()),
        comparisonStats: () => ctx.vs() ? getStats(ctx.sport(), ctx.type(), ctx.vs()!, ctx.season()) : null,
        comparisonMeta: () => ctx.vs() ? getEntityMeta(ctx.sport(), ctx.type(), ctx.vs()!) : null,
    };
}
export type ProfileReads = ReturnType<typeof profileReads>;
export const ProfileReadsContext = createContext<ProfileReads>();
/* Default-less context, so useContext throws ContextNotFoundError and is typed
   `T` — the old guard was unreachable (see core.d.ts:85-117). */
export function useProfileReads(): ProfileReads {
    return useContext(ProfileReadsContext);
}
/** Each boundary owns its memo: revalidate() clears query data, and reset()
 * recomputes that boundary's sources. Hoisted memos cannot recover through a
 * child boundary. query() still deduplicates requests across these consumers. */
export function useProfileRead<K extends keyof ProfileReads>(key: K) {
    return createMemo<unknown>(useProfileReads()[key]) as SourceAccessor<Awaited<ReturnType<ProfileReads[K]>>>;
}
export function preloadProfile(ctx: Source) {
    for (const read of Object.values(profileReads(ctx)))
        void Promise.resolve(read()).catch(() => { });
}
