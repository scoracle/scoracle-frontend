import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import solid from '@astrojs/solid-js';

export default defineConfig({
  site: 'https://scoracle.com',
  output: 'server',
  session: false,
  publicDir: '../public',
  integrations: [solid()],
  adapter: cloudflare({ imageService: 'passthrough' }),
});
