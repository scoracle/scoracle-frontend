import { HydrationScript, type JSX } from "@solidjs/web";
/** AdSense loader. Server-rendered on purpose: Google's site-ownership check
 *  reads the HTML, and a crawler does not execute JavaScript. When this became
 *  client-only (2026-09-19, ceda9a8) the tag vanished from every crawler's
 *  view — verified: production HTML contained zero `adsbygoogle` occurrences.
 *
 *  It was moved off the server because an executable static <head> tag can
 *  shift head children mid-hydration, which breaks the compiled template's
 *  positional traversal (getNextMarker → null.nextSibling) and kills every
 *  delegated handler. Both requirements are satisfied by rendering the tag
 *  inert and arming it after hydration settles: the crawler sees the tag in
 *  the HTML, while the browser never executes it during hydration. */
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9821466912189944";
export default function Document(props: {
    children: JSX.Element;
}) {
    return <html lang="en"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="format-detection" content="telephone=no"/>
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="Scoracle"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <script innerHTML={`(function(){try{var t=localStorage.getItem('scoracle-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`}/>
    <link rel="icon" href="/favicon-6.svg" type="image/svg+xml"/>
    <link rel="preload" href="/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin=""/>
    {/* Present for the crawler, inert for the browser. `type` is NOT text/javascript,
        so it never executes and cannot shift head children mid-hydration. Arming it
        after hydration is the client's job — see the armLoader() call in
        entry-client.tsx, which flips the type to text/javascript. A crawler reading
        the HTML sees the tag; a browser that executed it before hydration would be
        the bug the old comment described. */}
    <script data-adsense-loader={ADSENSE_SRC} type="text/plain" async crossorigin="anonymous"/>
    <HydrationScript />
    <script type="module" src="/src/entry-client.tsx"/>
  </head><body><div id="app">{props.children}</div></body></html>;
}
