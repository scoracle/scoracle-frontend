import { Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { EntityMetaSkeleton } from "./solid/EntityMeta";
import LoadingCard from "./solid/LoadingCard";
import { BoardLoading } from "./solid/Board";
import PageAtmosphere from "./solid/PageAtmosphere";
/** The incoming route's placeholder, rendered by Solid's scoped Loading. */
export default function PageSkeleton() {
    const location = useLocation();
    return <Show when={location.pathname.startsWith("/profile/")} fallback={<main class="lb-main" aria-busy="true">
            <PageAtmosphere />
            <BoardLoading label="Page loading"/>
        </main>}>
        <main class="profile-main" aria-busy="true" aria-label="Profile loading">
            <PageAtmosphere />
            <div class="profile-deck">
                <EntityMetaSkeleton />
                <div class="reading-table-deck"><LoadingCard label="Reading"/></div>
            </div>
        </main>
    </Show>;
}
