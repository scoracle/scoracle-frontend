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
 * Step 4b (this commit) wires the real weathered tarot border, entity-
 * image header band, and canonical-URL footer band — visual parity with
 * the legacy in-app share modal. Step 4c wires the og:image meta tags on
 * profile pages so social crawlers find this route.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildArtifactSvg } from "@lib/og/build-artifact";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadFrameInner } from "@lib/og/load-frame";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import { loadImageAsDataUri } from "@lib/og/load-image";
import { getOgEntityFacts } from "@lib/og/entity-facts.server";
import { getVibe, type VibeRow } from "@lib/data/vibe.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { formatDate } from "@lib/utils/date";
import { vibeArtifactSvg } from "@components/solid/VibeCard";

const TAB_FOR_CARD: Record<string, string> = {
  vibe: "vibes",
  stats: "stats",
  traits: "traits",
  compare: "compare",
};

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

    // Fetch the three independent inputs in parallel: tarot-border asset,
    // entity facts (Go API), vibe row (Go API; only for vibe cards).
    const [frameInnerSvg, entityFacts, vibe] = await Promise.all([
      loadFrameInner(baseUrl),
      getOgEntityFacts(sport, type, id),
      cardType === "vibe" ? getVibe(sport, type, id) : Promise.resolve<VibeRow | null>(null),
    ]);

    // Entity image is fetched after entityFacts resolves (depends on imageUrl).
    const entityImageDataUri = entityFacts?.imageUrl
      ? await loadImageAsDataUri(entityFacts.imageUrl)
      : null;
    const entity = entityFacts
      ? {
          name: entityFacts.name,
          context: entityFacts.context,
          imageDataUri: entityImageDataUri,
        }
      : null;

    // Per-card-type inner content + footer date.
    const { innerSvg, date } = await resolveCardContent(cardType, vibe, baseUrl);

    const tab = TAB_FOR_CARD[cardType] ?? cardType;
    const canonicalUrl = `scoracle.com/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}&tab=${tab}`;

    const svg = buildArtifactSvg({
      cardType,
      sport,
      type,
      id,
      innerSvg,
      frameInnerSvg,
      entity,
      canonicalUrl,
      date,
    });
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

interface ResolvedCardContent {
  innerSvg?: string;
  date?: string;
}

/** Dispatch on cardType to the right Card's SVG renderer. Returns inner
 *  SVG + a footer date. Both fields optional — when null the composer
 *  renders the route-keyed placeholder for inner and "" for date. */
async function resolveCardContent(
  cardType: string,
  vibe: VibeRow | null,
  baseUrl: URL,
): Promise<ResolvedCardContent> {
  if (cardType === "vibe") {
    if (!vibe || vibe.sentiment == null) return {};
    const archetype = scoreToArchetype(vibe.sentiment);
    if (!archetype) return {};
    const artSvg = await loadVibeArt(archetype.slug, baseUrl);
    return {
      innerSvg: vibeArtifactSvg({
        score: vibe.sentiment,
        archetype,
        vibeArtDataUri: svgToDataUri(artSvg),
        modelVersion: vibe.model_version,
        generatedAt: vibe.generated_at,
      }),
      date: formatDate(vibe.generated_at),
    };
  }
  return {};
}
