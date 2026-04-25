# scoracle-frontend

Flagship frontend for `scoracle.com`. Greenfield **SolidStart 2.0-alpha + Solid 1.9.11** on Cloudflare Workers.

Replaces `albapepper/Scoracle` (Astro 6) at DNS cutover. The Astro repo stays live as port-source during the build.

See `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md` for full context.

## Setup

Requires Node 22.12+ and a GitHub PAT with `read:packages` scope.

```bash
export NODE_AUTH_TOKEN=<your-pat>
npm install
```

## Scripts

```bash
npm run dev          # Vite dev server (default port 3000)
npm run build        # Build for Cloudflare Workers — outputs to .output/
npm run typecheck    # tsc --noEmit
npm run cf:deploy    # wrangler deploy
```

## Multi-directory sessions

Frontend work happens with three roots in context:

```bash
cd ~/scoracle-frontend
claude --add-dir ~/scoracleWiki --add-dir ~/Scoracle
```

The vault carries the *why*; the Astro repo carries the *what to port*; this repo is *where the work lands*.

## Migration parity checks

(TODO: pin three test entities here per Frontend Architecture phase 3 verification — NBA player, NFL team, football player.)
