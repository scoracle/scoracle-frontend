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
 * specialist / trends / vibes …). Anything without a bespoke body falls to
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

  // Per-X mode / cohort scope / compare-target ride the query string so a shared
  // card reflects exactly what the user was viewing.
  const q = new URL(event.request.url).searchParams;
  const rate = q.get("rate") ?? undefined;
  const scope = q.get("scope") ?? undefined;
  const vs = q.get("vs") ?? undefined;

  try {
    // Read bundled assets via the ASSETS binding (prod) — never a self-origin
    // fetch, which loops back through the edge inside a Worker and 522s.
    const fetchAsset = assetFetchForEvent(event);

    const [frameInnerSvg, entityFacts, comparedFacts] = await Promise.all([
      loadFrameInner(fetchAsset),
      getOgEntityFacts(sport, type, id, fetchAsset),
      vs ? getOgEntityFacts(sport, type, vs, fetchAsset) : Promise.resolve(null),
    ]);

    const [entityImageDataUri, crestDataUri, comparedImageDataUri, comparedCrestDataUri] = await Promise.all([
      entityFacts?.imageUrl ? loadImageAsDataUri(entityFacts.imageUrl) : Promise.resolve(null),
      entityFacts?.crestUrl ? loadImageAsDataUri(entityFacts.crestUrl) : Promise.resolve(null),
      comparedFacts?.imageUrl ? loadImageAsDataUri(comparedFacts.imageUrl) : Promise.resolve(null),
      comparedFacts?.crestUrl ? loadImageAsDataUri(comparedFacts.crestUrl) : Promise.resolve(null),
    ]);
    // Registry dispatch: the card's body, or the Meta default for anything
    // without a bespoke artifact.
    const renderBody = OG_BODIES[cardType] ?? OG_DEFAULT_BODY;
    const resolved: Partial<OgBody> = (await renderBody({ sport, type, id, fetchAsset, rate, scope, vs })) ?? {};

    // Centered header: the entity (player/team), or a body-supplied title block
    // for non-entity cards like the leaderboard (no entity → no image).
    const primary = entityFacts
      ? {
          name: entityFacts.name,
          subtitle: entityFacts.subtitle,
          imageDataUri: entityImageDataUri,
          crestDataUri,
          round: entityFacts.round,
        }
      : resolved.header
        ? { name: resolved.header.name, subtitle: resolved.header.subtitle ?? "", imageDataUri: null }
        : null;

    // Compared entity (compare cards) → dual header (primary left, compared right).
    const compared = comparedFacts
      ? {
          name: comparedFacts.name,
          subtitle: comparedFacts.subtitle,
          imageDataUri: comparedImageDataUri,
          crestDataUri: comparedCrestDataUri,
          round: comparedFacts.round,
        }
      : null;

    const svg = buildCardSvg({
      innerSvg: resolved.innerSvg,
      frameInnerSvg,
      primary,
      compared,
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
