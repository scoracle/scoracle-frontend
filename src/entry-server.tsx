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
          {/* Open Graph */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Scoracle" />
          <meta property="og:title" content="Scoracle — sports intelligence" />
          <meta
            property="og:description"
            content="Stats, news, social sentiment, and AI-powered insights for every NBA, NFL, and Football player and team."
          />
          <meta property="og:image" content="https://scoracle.com/images/scoracle_crystal_ball.png" />
          <meta property="og:url" content="https://scoracle.com" />
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Scoracle — sports intelligence" />
          <meta
            name="twitter:description"
            content="Stats, news, social sentiment, and AI-powered insights for every NBA, NFL, and Football player and team."
          />
          <meta name="twitter:image" content="https://scoracle.com/images/scoracle_crystal_ball.png" />
          {/* Theme: apply saved preference before paint to avoid FOUC. Default = light. */}
          <script
            innerHTML={`(function(){try{if(localStorage.getItem('scoracle-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
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
