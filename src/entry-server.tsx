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
