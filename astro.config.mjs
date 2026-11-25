import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import solid from '@astrojs/solid-js';

export default defineConfig({
  site: 'https://scoracle.com',
  output: 'server',
  trailingSlash: 'never',
  session: false,
  integrations: [solid()],
  adapter: cloudflare({ imageService: 'passthrough' }),
});
