import { HydrationScript, isServer, type JSX } from "@solidjs/web";
import { onSettled } from "solid-js";
/** AdSense loader, injected after hydration settles. A static <head> tag can
 *  execute mid-hydration and shift head children, which breaks the compiled
 *  template's positional traversal (getNextMarker → null.nextSibling) and
 *  kills every delegated handler on the page. Post-settlement injection is
 *  order-safe: hydration owns the DOM first, the loader appends after. */
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9821466912189944";
export default function Document(props: {
    children: JSX.Element;
}) {
    onSettled(() => {
        if (isServer)
            return;
        const loader = document.createElement("script");
        loader.async = true;
        loader.src = ADSENSE_SRC;
        loader.crossOrigin = "anonymous";
        document.head.appendChild(loader);
    });
    return <html lang="en"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="format-detection" content="telephone=no"/>
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="Scoracle"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <script innerHTML={`(function(){try{var t=localStorage.getItem('scoracle-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`}/>
    <link rel="icon" href="/favicon-5.svg" type="image/svg+xml"/>
    <link rel="preload" href="/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin=""/>
    <HydrationScript />
    <script type="module" src="/src/entry-client.tsx"/>
  </head><body><div id="app">{props.children}</div></body></html>;
}
