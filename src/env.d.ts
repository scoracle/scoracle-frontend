/// <reference types="vite/client" />

/** Build-time constant injected by Vite (see vite.config.ts > define) */
declare const __DATA_VERSION__: string;

/**
 * Environment variable type declarations.
 *
 * `PUBLIC_` is intentionally retained for deployed environment names.
 * Vite respects any prefix declared in `envPrefix` (defaults to `VITE_`);
 * we declare `PUBLIC_` here for type safety and treat
 * `vite.config.ts > envPrefix` as the source of truth at runtime.
 */
interface ImportMetaEnv {
  /** Go API URL including /api/v1 prefix — single source of truth for all API calls */
  readonly PUBLIC_GO_API_URL: string;
  /** Optional AdSense publisher id override. */
  readonly PUBLIC_ADSENSE_PUBLISHER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
