/**
 * OG image route — server-rendered PNG for social-feed previews.
 *
 * `<meta property="og:image" content="https://scoracle.com/og/<cardType>/
 * <sport>/<type>/<id>" />` on the corresponding profile page points
 * X / Facebook / iMessage / Discord / Slack at this route. The crawler
 * fetches; resvg-wasm rasterizes the composed SVG; we return the PNG
 * with edge-cache headers.
 *
 * Step 3 (this commit) returns a placeholder PNG proving the pipeline
 * end-to-end. Step 4 wires the per-Card SVG renderer (VibeCard first)
 * into the central area + adds the real frame asset + entity meta band.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildArtifactSvg } from "@lib/og/build-artifact";
import { rasterizeSvg } from "@lib/og/rasterize";

export async function GET(event: APIEvent) {
  const params = event.params as Record<string, string | undefined>;
  const cardType = params.cardType;
  const sport = params.sport;
  const type = params.type;
  const id = params.id;

  if (!cardType || !sport || !type || !id) {
    return new Response("Missing path params", { status: 400 });
  }

  try {
    const svg = buildArtifactSvg({ cardType, sport, type, id });
    const png = await rasterizeSvg(svg, new URL(event.request.url));
    // Cast: TS sees Uint8Array<ArrayBufferLike>, BodyInit accepts ArrayBufferView
    // at runtime — pure typing quirk in TS 5.7+ generic Uint8Array.
    return new Response(png as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`OG render failed: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
