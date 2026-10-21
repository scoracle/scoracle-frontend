import RouteRedirect from "../../components/RouteRedirect";
import { useSearchParams } from "@solidjs/router";
import { profilePath } from "../../lib/utils/profile-url";
import { paramValue } from "../../lib/utils/search-params";

export default function ProfileRedirect() {
    const [searchParams] = useSearchParams();
    const legacyTarget = () => {
        const sport = paramValue(searchParams.sport);
        const id = paramValue(searchParams.id);
        if (!sport || !id)
            return null;
        const type = paramValue(searchParams.type) === "team" ? "team" : "player";
        const rest = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            if (key === "sport" || key === "type" || key === "id")
                continue;
            const v = paramValue(value);
            if (v != null)
                rest.set(key, v);
        }
        const path = profilePath(sport, type, id);
        const qs = rest.toString();
        return qs ? `${path}?${qs}` : path;
    };
    return <RouteRedirect href={legacyTarget() ?? "/leaderboard"} />;
}
