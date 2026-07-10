import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";
import { isCrawlerReviewRequest } from "./lib/utils/review-request";

export default createHandler(
  () => (
  <StartServer
    document={({ assets, children, scripts }) => {
      const renderMode = isCrawlerReviewRequest(getRequestEvent()?.request)
        ? "review-ssr"
        : "interactive";
      const isReviewSsr = renderMode === "review-ssr";

      return (
        <html lang="en" data-scoracle-render={renderMode}>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="scoracle-render-mode" content={renderMode} />
            <link
              rel="icon"
              href={`/favicon.svg?v=${typeof __DATA_VERSION__ !== "undefined" ? __DATA_VERSION__ : "1"}`}
              type="image/svg+xml"
            />
            {/* Brand webfonts — preload the roman cuts (used above the fold on
                every route); the italic cut lazy-loads via @font-face when an
                editorial accent first needs it. */}
            <link
              rel="preload"
              href="/fonts/fraunces-var.woff2"
              as="font"
              type="font/woff2"
              crossorigin=""
            />
            <link
              rel="preload"
              href="/fonts/dm-sans-var.woff2"
              as="font"
              type="font/woff2"
              crossorigin=""
            />
            {/* Title + descriptions are owned entirely by @solidjs/meta: site
                defaults live in app.tsx (<MetaProvider>) and routes override
                them — profile.tsx emits per-entity title/description/og, and async
                SSR (the `mode: "async"` below) resolves them before the head flush,
                so they land in the initial head and dedupe to a single tag. Do NOT
                hardcode <title>/description here: a hardcoded
                tag isn't managed by @solidjs/meta, can't be deduped, and a
                crawler would pick it over the per-entity one. Only truly static,
                never-overridden tags stay below. */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Scoracle" />
            <meta name="twitter:card" content="summary_large_image" />
            {/* Theme: apply saved preference before paint to avoid FOUC. Default = light. */}
            {!isReviewSsr && (
              <script
                innerHTML={`(function(){try{if(localStorage.getItem('scoracle-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
              />
            )}
            {/* Google AdSense loader. Doubles as site-ownership verification for normal browsers.
                Review iframes get no client scripts so useful SSR cannot be replaced by a fallback. */}
            {!isReviewSsr && (
              <script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9821466912189944"
                crossorigin="anonymous"
              />
            )}
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {!isReviewSsr && scripts}
          </body>
        </html>
      );
    }}
  />
  ),
  // Render SSR to a complete document (await all Suspense) instead of streaming.
  // Streaming emits <template> suspense placeholders that the client must adopt
  // during hydration; that adoption intermittently races and leaves the lazy
  // route un-hydrated → blank page on direct/shared-link loads. Async SSR ships
  // complete HTML so hydration is deterministic. See profile-route progress doc.
  { mode: "async" },
);
