// Browser-only state: the getter makes either island's hydration order safe.
let selected: string | undefined;
const listeners = new Set<(sport: string) => void>();
export function publishBoardSport(sport: string) {
  if (typeof window === 'undefined') return;
  selected = sport;
  try { localStorage.setItem('activeSport', sport); } catch { /* Storage unavailable. */ }
  for (const listener of listeners) listener(sport);
}
export function subscribeBoardSport(listener: (sport: string) => void) {
  if (typeof window === 'undefined') return () => {};
  listeners.add(listener);
  if (selected) listener(selected);
  return () => { listeners.delete(listener); };
}
