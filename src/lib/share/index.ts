/**
 * Public surface of the share module.
 *
 * Cards that want share capability render `<ShareTrigger metadata={…} />`
 * as a sibling inside their wrapping Shell. The trigger fetches the
 * server-rendered tarot PNG, calls `navigator.share({ files, text, url })`
 * for the OS share sheet (with the image already attached), and falls
 * back to `<ShareFallbackModal>` on browsers without Web Share API file
 * support (Firefox).
 *
 * Shell stays pure — composition, not inheritance. ShareTrigger and
 * Shell are both extract-ready for `@scoracle/ui` when sandbox lands.
 */

export { default as ShareTrigger } from "./ShareTrigger";
export type { ShareTriggerMetadata, ShareTriggerProps } from "./ShareTrigger";
export { shareCard } from "./dispatch";
export type { ShareCardInput, ShareCardResult } from "./dispatch";
export { buildShareText } from "./text";
export type { ShareTextInput, ShareTextOutput } from "./text";
export { categoryFor } from "./categories";
export type { CardType } from "./categories";
