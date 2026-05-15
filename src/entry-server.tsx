import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <title>Scoracle</title>
          <meta
            name="description"
            content="Sports intelligence for NBA, NFL, and Football. Stats, news, social sentiment, and AI-powered insights on every player and team."
          />
          {/* Open Graph + Twitter Card — static (never overridden):
              og:type, og:site_name, og:description, twitter:card,
              twitter:description. The overridable defaults (og:title,
              og:url, og:image, twitter:title, twitter:image) live in
              app.tsx via <MetaProvider> so per-route <Meta> components
              dedupe against them instead of double-rendering. */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Scoracle" />
          <meta
            property="og:description"
            content="Stats, news, social sentiment, and AI-powered insights for every NBA, NFL, and Football player and team."
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:description"
            content="Stats, news, social sentiment, and AI-powered insights for every NBA, NFL, and Football player and team."
          />
          {/* Theme: apply saved preference before paint to avoid FOUC. Default = light. */}
          <script
            innerHTML={`(function(){try{if(localStorage.getItem('scoracle-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
          />
          {/* Google AdSense loader. Doubles as site-ownership verification — removing it breaks both monetization and AdSense console verification. */}
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
));
