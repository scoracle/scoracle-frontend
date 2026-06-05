/**
 * Share-card OG image route — server-rendered vertical PNG attached
 * directly to social posts via the Web Share API client dispatcher
 * (`src/lib/share/dispatch.ts`).
 *
 * Thin pass-through: fetch entity meta + dispatch the cardType to its body in
 * `lib/cards/og-bodies.ts` (the Card Registry's OG layer) → compose into the
 * vertical 5:7 tarot frame via `buildCardSvg` → rasterize via resvg-wasm →
 * return PNG with stale-while-revalidate cache headers. ALL per-card logic
 * lives in the registry; this handler just frames whatever the body returns.
 *
 * URL: /og/{cardType}/{sport}/{type}/{id} — cardType is a CardId (composite /
 * specialist / starline / vibes …). Anything without a bespoke body falls to
 * the Meta score-row, so a shared profile never renders an empty card.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildCardSvg } from "@lib/og/build-card";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadFrameInner } from "@lib/og/load-frame";
import { loadImageAsDataUri } from "@lib/og/load-image";
import { getOgEntityFacts } from "@lib/og/entity-facts.server";
import { OG_BODIES, OG_DEFAULT_BODY, type OgBody } from "@lib/cards/og-bodies";
import { assetFetchForEvent } from "@lib/utils/cloudflare-env";

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
    // Read bundled assets via the ASSETS binding (prod) — never a self-origin
    // fetch, which loops back through the edge inside a Worker and 522s.
    const fetchAsset = assetFetchForEvent(event);

    const [frameInnerSvg, entityFacts] = await Promise.all([
      loadFrameInner(fetchAsset),
      getOgEntityFacts(sport, type, id, fetchAsset),
    ]);

    const [entityImageDataUri, crestDataUri] = await Promise.all([
      entityFacts?.imageUrl ? loadImageAsDataUri(entityFacts.imageUrl) : Promise.resolve(null),
      entityFacts?.crestUrl ? loadImageAsDataUri(entityFacts.crestUrl) : Promise.resolve(null),
    ]);
    const primary = entityFacts
      ? {
          name: entityFacts.name,
          subtitle: entityFacts.subtitle,
          imageDataUri: entityImageDataUri,
          crestDataUri,
          round: entityFacts.round,
        }
      : null;

    // Registry dispatch: the card's body, or the Meta default for anything
    // without a bespoke artifact.
    const renderBody = OG_BODIES[cardType] ?? OG_DEFAULT_BODY;
    const resolved: Partial<OgBody> = (await renderBody({ sport, type, id, fetchAsset })) ?? {};

    const svg = buildCardSvg({
      innerSvg: resolved.innerSvg,
      frameInnerSvg,
      primary,
      // Corner mark: the card's own numeral (e.g. vibe archetype) if it set one,
      // else the entity id — same as the in-app card's corner slot.
      cornerLabel: resolved.cornerLabel ?? id,
    });
    const png = await rasterizeSvg(svg, fetchAsset);
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
