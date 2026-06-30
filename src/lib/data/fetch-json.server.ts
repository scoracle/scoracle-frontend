import type { FetchTarget } from "../utils/data-sources";

export async function fetchJsonOrNull<T>(
  target: FetchTarget,
  label: string,
): Promise<T | null> {
  const res = await fetch(target.url, { headers: target.headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  return (await res.json()) as T;
}
