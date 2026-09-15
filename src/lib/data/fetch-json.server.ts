import type { FetchTarget } from "../utils/data-sources";
import { getCloudflareEnv } from "../utils/cloudflare-env";
import { getRequestEvent } from "@solidjs/web";

/** Read-only API transport with request-local Workers authentication and caching. Deadline includes reading the response body. */
export async function fetchJsonOrNull<T>(target: FetchTarget, label: string): Promise<T | null> {
    const env = getCloudflareEnv();
    const configured = Number(env?.SCORACLE_API_TIMEOUT_MS ?? process.env.SCORACLE_API_TIMEOUT_MS ?? 12000);
    const timeout = Number.isFinite(configured) && configured > 0 ? configured : 12000;
    const event = getRequestEvent();
    const deadline = AbortSignal.timeout(timeout);
    const signal = event?.request.signal
        ? AbortSignal.any([deadline, event.request.signal]) : deadline;
    const started = performance.now();
    let status = 0;
    let cacheStatus: string | null = null;
    const headers = { ...target.headers };
    if (env?.SCORACLE_INTERNAL_KEY) headers["X-Scoracle-Internal-Key"] = env.SCORACLE_INTERNAL_KEY;
    try {
        const base = env?.PUBLIC_GO_API_URL ? new URL(env.PUBLIC_GO_API_URL).origin : process.env.SCORACLE_API_ORIGIN;
        const url = base ? new URL(new URL(target.url).pathname + new URL(target.url).search, base).href : target.url;
        let response = await fetch(url, {
            headers, signal,
            ...(env ? { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 300, "300-599": -1 } } } : { cache: "no-store" as const }),
        });
        // Retire poisoned entries created by an old deployment; live errors
        // never retry here. This is HTTP cache recovery, not reactive state.
        if (!response.ok && response.status !== 404 && ["HIT", "STALE", "UPDATING"].includes(response.headers.get("CF-Cache-Status") ?? "")) {
            await response.body?.cancel();
            response = await fetch(url, { headers, signal, cache: "no-store" });
        }
        cacheStatus = response.headers.get("CF-Cache-Status");
        status = response.status;
        if (status === 404) { await response.body?.cancel(); return null; }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`${label} ${status}`); }
        return await response.json() as T;
    } catch (error) {
        if (event) {
            event.response.status = status === 429 || status >= 500 || !status ? 503 : 502;
            event.response.headers.set("Cache-Control", "no-store");
        }
        console.error("[scoracle:api-error]", { product: label, status, cacheStatus, internalKeyConfigured: !!env?.SCORACLE_INTERNAL_KEY });
        if (deadline.aborted) throw new Error(`${label} timed out after ${timeout}ms`);
        throw error;
    } finally {
        if (process.env.SCORACLE_TRACE_API === "1") {
            console.info("[scoracle:api]", JSON.stringify({ product: label, path: new URL(target.url).pathname,
                search: new URL(target.url).search, status, ms: Math.round(performance.now() - started) }));
        }
    }
}
