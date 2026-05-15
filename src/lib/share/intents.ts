/**
 * Platform-share intent helpers — pure URL builders + clipboard / Web
 * Share wrappers. Called from <ShareButton> (no UI here).
 *
 * The OG-only share strategy: users share a Scoracle canonical URL,
 * and X / Facebook / iMessage / Discord auto-fetch the og:image meta
 * tag, which points at the server-rendered /og/<cardType>/... PNG
 * route. So the client-side share handler's job is just to *open*
 * the right share surface — the artifact preview is on the receiving
 * platform, not in our app.
 */

/** X (Twitter) "intent/tweet" composer with pre-filled text + URL. The
 *  receiving page reads our og:image meta on the URL and shows the
 *  preview inline. */
export function buildXIntentUrl(url: string, text: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Facebook "sharer.php" with the URL parameter. Facebook fetches the
 *  URL and uses og:image / og:title / og:description for the preview. */
export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** Copy `text` to the system clipboard. Returns true on success, false
 *  if the clipboard API isn't available or the write fails (e.g., the
 *  user's browser blocks programmatic clipboard writes). */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Try the Web Share API. Returns true if the share completed (or the
 *  user closed the share sheet), false if the API isn't available or the
 *  share threw a non-user-cancel error. Used as the primary mobile path. */
export async function tryWebShare(url: string, text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }
  try {
    await navigator.share({ url, text });
    return true;
  } catch (err) {
    // AbortError = user dismissed the sheet — still consider it "handled".
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}

/** Predicate for choosing the click handler in ShareButton — true on
 *  mobile-y browsers that implement the Web Share API. */
export function canWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
