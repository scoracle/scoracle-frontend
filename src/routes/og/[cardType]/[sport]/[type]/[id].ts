/**
 * OG image route — server-rendered PNG for social-feed previews.
 *
 * `<meta property="og:image" content="https://scoracle.com/og/<cardType>/
 * <sport>/<type>/<id>" />` on the corresponding profile page points
 * X / Facebook / iMessage / Discord / Slack at this route. The crawler
 * fetches; resvg-wasm rasterizes the composed SVG; we return the PNG
 * with edge-cache headers.
 *
 * Per-Card-type dispatch: each shareable Card exports its own SVG renderer
 * (e.g., `vibeArtifactSvg` from VibeCard.tsx). The route fetches the
 * required data, calls the right renderer, and hands the resulting `<g>`
 * to `buildArtifactSvg` which composes it inside the platform frame.
 *
 * Step 4a (this commit) wires VibeCard end-to-end (score + archetype +
 * vibe-art + credit). Step 4b adds the real frame asset + entity-image
 * header band + canonical-URL footer band. Step 4c wires og:image meta
 * tags on profile pages so social crawlers find this route.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildArtifactSvg } from "@lib/og/build-artifact";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import { getVibe } from "@lib/data/vibe.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { vibeArtifactSvg } from "@components/solid/VibeCard";

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
    const baseUrl = new URL(event.request.url);
    const innerSvg = await resolveInner(cardType, sport, type, id, baseUrl);
    const svg = buildArtifactSvg({ cardType, sport, type, id, innerSvg });
    const png = await rasterizeSvg(svg, baseUrl);
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

/**
 * Dispatch on cardType to the right Card's SVG renderer. Returns the
 * inner `<g>` content; falls back to `undefined` (placeholder) when data
 * resolves to null or the cardType isn't yet wired.
 */
async function resolveInner(
  cardType: string,
  sport: string,
  type: string,
  id: string,
  baseUrl: URL,
): Promise<string | undefined> {
  if (cardType === "vibe") {
    const vibe = await getVibe(sport, type, id);
    if (!vibe || vibe.sentiment == null) return undefined;
    const archetype = scoreToArchetype(vibe.sentiment);
    if (!archetype) return undefined;
    const artSvg = await loadVibeArt(archetype.slug, baseUrl);
    return vibeArtifactSvg({
      score: vibe.sentiment,
      archetype,
      vibeArtDataUri: svgToDataUri(artSvg),
      modelVersion: vibe.model_version,
      generatedAt: vibe.generated_at,
    });
  }
  return undefined;
}
