import { hydrate } from "@solidjs/web";
import { onSettled } from "solid-js";
import App from "./app";
import Document from "./Document";
/** Arm the server-rendered AdSense tag AFTER hydration owns the DOM.
 *
 *  The tag ships in the HTML inert (`type="text/plain"`, see Document.tsx) so
 *  Google's site-ownership crawler sees it — crawlers do not run JS, and while
 *  the tag was client-only the loader was absent from every crawler's view.
 *
 *  Flipping `type` to "text/javascript" makes the browser fetch and run it.
 *  Doing that during hydration would let a third-party script mutate <head>
 *  while the compiled template is still walking it positionally
 *  (getNextMarker → null.nextSibling), which kills every delegated handler —
 *  the reason the loader was moved off the server in the first place.
 *  onSettled runs after that traversal is finished, so both hold at once.
 */
function armLoader() {
    const tag = document.querySelector<HTMLScriptElement>("script[data-adsense-loader]");
    if (!tag)
        return;
    tag.type = "text/javascript";
    tag.src = tag.dataset.adsenseLoader!;
}
onSettled(armLoader);
hydrate(() => <Document><App /></Document>, document);
