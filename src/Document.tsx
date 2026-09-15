import { HydrationScript, type JSX } from "@solidjs/web";
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
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9821466912189944" crossorigin="anonymous"/>
    <link rel="icon" href="/favicon-4.svg"/>
    <link rel="preload" href="/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin=""/>
    <HydrationScript />
    <script type="module" src="/src/entry-client.tsx"/>
  </head><body><div id="app">{props.children}</div></body></html>;
}
