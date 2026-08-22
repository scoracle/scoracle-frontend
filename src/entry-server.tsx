import { createHandler, StartServer } from "@solidjs/start/server";

/* Bump the FILENAME when the favicon artwork changes (add public/favicon-N.svg
   + a public/_headers entry). The icon is served immutable for a year, and the
   Workers asset cache keys on pathname only — a `?v=` query does NOT bust the
   edge (verified live 2026-07-15), so the version must live in the path, same
   principle as the hashed JS bundles. Plain /favicon.svg stays as the fallback
   for clients that request it blindly. v2: 2026-07-15 redraw (hero crystal
   ball minus hands). v3: 2026-07-15 tokens v0.8.1 — card goes tarot stock, the
   favicon card follows (`bg-card` #F8F3E6). */
const FAVICON_PATH = "/favicon-3.svg";

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            {/* iOS data detectors auto-link long digit runs as phone numbers —
                the 10-digit target-ID corner numerals were rendering as blue
                tappable telephone links on Safari. Nothing on this site is a
                phone number. */}
            <meta name="format-detection" content="telephone=no" />
            <link rel="icon" href={FAVICON_PATH} type="image/svg+xml" />
            {/* Warm the product API's connection before the first query needs
                it (Scott, 2026-08-21): every deck read is an RPC from the
                browser to this origin, so DNS+TLS+ALPN land during SSR rather
                than on the first product fetch. (Dev proxies /api/v1
                same-origin; the hint just goes unused there.) */}
            <link rel="preconnect" href="https://api.scoracle.com" crossorigin="" />
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
            {/* Theme: apply saved preference before paint to avoid FOUC.
                Default (absent/"system") follows the OS. Must mirror the
                resolution rule in stores/theme.ts. */}
            <script
              innerHTML={`(function(){try{var t=localStorage.getItem('scoracle-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`}
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
