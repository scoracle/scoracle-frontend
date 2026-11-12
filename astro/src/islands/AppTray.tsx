import { createSignal, onMount } from 'solid-js';

// shortcut: minimal shell navigation; port the existing tray in Step 3.
export default function AppTray(props: { page: string }) {
  const [dark, setDark] = createSignal(false);
  onMount(() => setDark(document.documentElement.classList.contains('dark')));
  function toggleTheme() {
    const next = !dark();
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('scoracle-theme', next ? 'dark' : 'light'); } catch { /* Storage may be disabled. */ }
  }
  return <nav aria-label="Main navigation">
    <a href="/" aria-current={props.page === 'home' ? 'page' : undefined}>Scoracle</a>{' · '}
    <a href="/leaderboard" aria-current={props.page === 'leaderboard' ? 'page' : undefined}>Leaderboard</a>{' · '}
    <button type="button" onClick={toggleTheme} aria-pressed={dark()}>Dark appearance</button>
  </nav>;
}
