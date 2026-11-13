import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import solid from '@astrojs/solid-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const dataVersion = createHash('sha256').update(readFileSync(new URL('../public/data/entities.json', import.meta.url))).digest('hex').slice(0, 12);

export default defineConfig({
  site: 'https://scoracle.com',
  vite: { define: { __DATA_VERSION__: JSON.stringify(dataVersion) } },
  output: 'server',
  trailingSlash: 'never',
  session: false,
  publicDir: '../public',
  integrations: [solid()],
  adapter: cloudflare({ imageService: 'passthrough' }),
});
