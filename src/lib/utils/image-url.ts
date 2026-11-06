/** Request delivery sizes from the existing image providers; unknown URLs pass through. */
export function imageUrl(source: string | null | undefined, width: number, sport?: string): string {
    if (!source) return "";
    try {
        const url = new URL(source);
        if (sport === "nba" && url.hostname === "static.www.nfl.com") return "";
        if (sport === "nfl" && url.hostname === "cdn.nba.com" && url.pathname.includes("/headshots/")) return "";
        if (url.hostname === "cdn.nba.com" && url.pathname.includes("/headshots/")) {
            url.pathname = url.pathname.replace(/\/\d+x\d+\//, width <= 260 ? "/260x190/" : "/520x380/");
        } else if (url.hostname === "static.www.nfl.com" && url.pathname.startsWith("/image/upload/")) {
            url.pathname = url.pathname.replace(/\/image\/upload\/[^/]+\//,
                `/image/upload/f_auto,q_auto,w_${width},h_${width},c_fit/`);
        } else if (url.hostname === "commons.wikimedia.org" && url.pathname.includes("Special:FilePath/")) {
            url.searchParams.set("width", String(width));
        }
        return url.href;
    } catch {
        return source;
    }
}
