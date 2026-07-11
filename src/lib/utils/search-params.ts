/**
 * search-params — one shared read helper for `useSearchParams` values.
 *
 * `@solidjs/router` types every search param as `string | string[] | undefined`
 * (repeated keys become arrays). Scoracle URLs never intentionally repeat a
 * key, so consumers read the first value; empty strings normalize to
 * undefined, matching what `URLSearchParams.get(...) || undefined` gave the
 * retired custom hook's callers.
 */
export function paramValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first || undefined;
}
