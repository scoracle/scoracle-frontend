/**
 * Date Utilities
 *
 * Shared helper functions for date formatting.
 */

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
