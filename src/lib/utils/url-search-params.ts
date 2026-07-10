import { createSignal, onCleanup, onMount } from "solid-js";
import { getRequestEvent } from "solid-js/web";

type SearchParamValue = string | null | undefined;

export type UrlSearchParamSetter<T extends Record<string, unknown>> = (
  next: Partial<Record<keyof T, SearchParamValue>>,
  options?: { replace?: boolean },
) => void;

export const SCORACLE_LOCATION_CHANGE_EVENT = "scoracle-location-change";

function initialSearch(): string {
  if (typeof window !== "undefined") return window.location.search;
  const request = getRequestEvent()?.request;
  return request ? new URL(request.url).search : "";
}

function read(search: string, key: string): string | undefined {
  return new URLSearchParams(search).get(key) ?? undefined;
}

export function useUrlSearchParams<T extends Record<string, unknown>>(): [
  T,
  UrlSearchParamSetter<T>,
] {
  const [search, setSearch] = createSignal(initialSearch());
  const params = new Proxy({} as T, {
    get(_target, prop) {
      return typeof prop === "string" ? read(search(), prop) : undefined;
    },
  });

  onMount(() => {
    const sync = () => setSearch(window.location.search);
    window.addEventListener("popstate", sync);
    window.addEventListener(SCORACLE_LOCATION_CHANGE_EVENT, sync);
    onCleanup(() => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(SCORACLE_LOCATION_CHANGE_EVENT, sync);
    });
  });

  const setParams: UrlSearchParamSetter<T> = (next, options) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === "") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    }

    const href = `${url.pathname}${url.search}${url.hash}`;
    if (options?.replace) {
      window.history.replaceState(window.history.state, "", href);
    } else {
      window.history.pushState(window.history.state, "", href);
    }
    setSearch(url.search);
    window.dispatchEvent(new Event(SCORACLE_LOCATION_CHANGE_EVENT));
  };

  return [params, setParams];
}
