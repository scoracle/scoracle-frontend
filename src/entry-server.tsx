import { createHandler, StartServer } from "@solidjs/start/server";

/* Bump when favicon.svg's artwork changes — it's served immutable for a year
   (public/_headers), so only a new URL can evict the old icon from browser
   caches. Decoupled from __DATA_VERSION__: data refreshes don't re-fetch the
   icon, and icon changes don't wait for a data change. v2: 2026-07-15 redraw
   (hero crystal ball minus hands). */
const FAVICON_VERSION = "2";

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link
              rel="icon"
              href={`/favicon.svg?v=${FAVICON_VERSION}`}
              type="image/svg+xml"
            />
            {/* Brand webfont — preload the roman cut (Fraunces backs every
                type role above the fold on every route); the italic cut
                lazy-loads via @font-face when an editorial accent first
                needs it. */}
            <link
              rel="preload"
              href="/fonts/fraunces-var.woff2"
              as="font"
              type="font/woff2"
              crossorigin=""
            />
            {/* Title + descriptions are owned entirely by @solidjs/meta: site
                defaults live in app.tsx (<MetaProvider>) and routes override
                them. Async SSR (the `mode: "async"` below) resolves them before
                the head flush, so they land in the initial head and dedupe to a
                single tag. Do NOT hardcode <title>/description here. Only truly
                static, never-overridden tags stay below. */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Scoracle" />
            <meta name="twitter:card" content="summary_large_image" />
            {/* Theme: apply saved preference before paint to avoid FOUC. Default = light. */}
            <script
              innerHTML={`(function(){try{if(localStorage.getItem('scoracle-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
            />
            {/* Google AdSense loader. Doubles as site-ownership verification. */}
            <script
              async
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9821466912189944"
              crossorigin="anonymous"
            />
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  // Render SSR to a complete document (await all Suspense) instead of streaming,
  // so every request — user or crawler — gets the full page in the initial HTML
  // and hydration is deterministic.
  { mode: "async" },
);
