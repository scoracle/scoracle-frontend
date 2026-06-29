/**
 * Date Utilities
 *
 * Shared helper functions for date formatting.
 */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * Format a date string for display (e.g., "Dec 25").
 * Returns empty string if date is invalid or not provided.
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Format a date string as a relative time (e.g., "2h ago", "3d ago").
 * Returns empty string for missing/invalid input.
 *
 * Client-only: this uses the viewer's local clock, so callers that render
 * during SSR must gate on a post-mount signal to avoid hydration mismatch.
 */
export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';

  const now = Date.now();
  const delta = now - then;
  if (delta < 0) return 'just now';

  const abs = Math.abs(delta);
  if (abs < MINUTE_MS) return 'just now';
  if (abs < HOUR_MS) {
    const m = Math.floor(abs / MINUTE_MS);
    return `${m}m ago`;
  }
  if (abs < DAY_MS) {
    const h = Math.floor(abs / HOUR_MS);
    return `${h}h ago`;
  }
  if (abs < WEEK_MS) {
    const d = Math.floor(abs / DAY_MS);
    return `${d}d ago`;
  }
  if (abs < MONTH_MS) {
    const w = Math.floor(abs / WEEK_MS);
    return `${w}w ago`;
  }
  if (abs < YEAR_MS) {
    const mo = Math.floor(abs / MONTH_MS);
    return `${mo}mo ago`;
  }
  const y = Math.floor(abs / YEAR_MS);
  return `${y}y ago`;
}

/**
 * Format a date string for display WITH the time of day (e.g.,
 * "May 28, 3:45 PM"), in the viewer's local timezone.
 *
 * Renders in local time, so it differs from the server's timezone
 * (Cloudflare = UTC) — callers that render during SSR must gate on a
 * post-mount signal (see NewsCard) so the SSR HTML and the first client
 * render still agree. Returns empty string for missing/invalid input.
 */
export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
