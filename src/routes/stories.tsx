import RouteRedirect from "../components/RouteRedirect";
/**
 * /stories — retired as a page (Scott, 2026-09-07): the storylines register
 * is the leaderboard's ?board=stories now, sharing that page's NavWell and
 * URL state. This route survives only to carry old links across: it
 * forwards ?sport and ?status unchanged.
 */
import { createMemo } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { paramValue } from "../lib/utils/search-params";
export default function Stories() {
    const [searchParams] = useSearchParams();
    // Memoized, not computed inline in the body. Reading searchParams in a
    // component body is a TOP-LEVEL reactive read: it ran once at setup and
    // never again, so a ?sport/?status change while already on /stories left
    // the redirect pointing at the destination it was built from. RouteRedirect
    // already follows a reactive href (its createEffect reads props.href), it
    // was just being handed a frozen value.
    const target = createMemo(() => {
        const params = new URLSearchParams({ board: "stories" });
        const sport = paramValue(searchParams.sport);
        const status = paramValue(searchParams.status);
        if (sport)
            params.set("sport", sport.toUpperCase());
        if (status)
            params.set("status", status);
        return `/leaderboard?${params.toString()}`;
    });
    return <RouteRedirect href={target()}/>;
}
