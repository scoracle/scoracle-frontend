# Deck engraving assets

Approved 2026-09-12: Edge Fragment for every deck except Sigil (Full Engraving).
Scouting and Profile share the same mountain drawing. `deck-illustration.ts`
is the single composition map for Card and Board. Frame and type are unchanged.
The Board keeps its device inside the masthead, never beneath ranked rows.

Production assets are `public/deck-art/engraving-{scouting,narratives,transfers,vibe,momentum,sigil}-v1.webp`.
These are 1024×1536 transparent ink masks extracted mechanically from the approved
white-ground PNGs: grayscale, alpha = 255 − luminance, rounded to the nearest four
alpha levels (clamped to 255), then losslessly WebP-encoded. The stock's own ink
paints through at 8.5% opacity, close to the dark study's 7.5% white screen blend.
No subjects were redrawn during production preparation. Original design PNGs stay
in the local `public/design/` study and are not included in the release.

Printed stock B keeps the original frame and adds faint paper tooth (0.11 soft-light),
a 9% deck wash and a short contact shadow. Share captures remain plain, light-pinned
identity vessels; they do not acquire a second deck drawing.

## Generation provenance and full prompts

Built-in image generation. Momentum was the style reference for the other five
plates. The following records retain the original design-stage source paths.

# Momentum illustration study

Generated with the built-in image tool. Source subject retained: radiating celestial light. Preview asset: `public/design/momentum-radiant-light-v1.png`.

Use case: illustration-story. Asset type: monochrome background illustration for a tarot-shaped sports analytics card, to be composited at very low opacity behind real text and charts. Primary request: refine the existing subject of radiating celestial light into a sophisticated antique copperplate illustration. Subject: one luminous solar orb, a small bright unmarked center encircled by naturally irregular flowing tongues of light and very fine tapered straight rays; several long subtly curved shafts of light descend diagonally toward the bottom corners. No face. The subject is radiant light, not a landscape. Style: authentic restrained 17th-century engraved book illustration, confident hand-cut tapered strokes, selective contour hatching that describes volume, organic decisions in the drawing, sparse breathable composition. It must look like an actual accomplished illustrator's print. Avoid evenly repeated vector lines, concentric circle diagrams, four-point sparkle icons, charts, geometric mandalas, logos and digital line art. Composition: portrait 2:3 white canvas; orb centered horizontally around 56 percent of canvas height, radius about 9 percent of canvas width. The rays and two long light shafts expand through the lower two thirds of the canvas, top fifth completely empty white. Restrained line density, generous white negative space between groups of marks. Palette: neutral black and gray fine ink lines on absolutely plain pure white; no aged paper, no shadows, no background texture, no gradients, no colors. This is ONLY the illustration asset, no card frame, no border, no lettering, no text, no stars, no moon, no clouds, no mountains, no added objects. It will serve as quiet card furniture and must read gracefully when faded to near invisibility.
# Deck illustration study

Built-in image generation; the approved Momentum illustration was used as a style reference. All subjects are preserved. Scouting and Profile share a single mountain asset. These are design previews, not production asset replacements.

Approved Momentum: `public/design/momentum-radiant-light-v1.png`, edge crop F.

## scouting

Saved asset: `public/design/scouting-engraving-v1.png`

Use case: illustration-story. Asset type: monochrome illustration for a tarot card background. The attached solar illustration is a STYLE REFERENCE ONLY: match its delicate 17th-century copperplate engraving technique, confident tapered hand-cut strokes, selective contour hatching, generous breathing room, and pure white ground. Create a NEW SUBJECT specified below, not another sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely plain pure white, no texture, aged paper, gradients, shadows, text, labels, border, frame, badge, or watermark. Genuine naturalistic drawn forms rather than vector symbols or repeated geometric motifs. This will be faint background furniture behind dense text at about 7 percent opacity: the content must dominate. Leave much of the upper third white and avoid dense black patches. Subject: THREE overlapping ridgelines of rugged mountains, as a sparse antique geological engraving. Peaks with particular uneven crags, very fine selective contour hatching describing rock strata. Lower two thirds of portrait occupied, highest peak on the right at about 38 percent down; ridges descend gently to the lower left. Large white openings, no sky decoration, no sun, moon, clouds, trees, buildings, people or objects. The existing subject is mountain ridges alone. Mountain bases trail off with sparse interrupted strokes toward white instead of a hard rectangular landscape block.

## narratives

Saved asset: `public/design/narratives-engraving-v1.png`

Use case: illustration-story. Asset type: monochrome illustration for a tarot card background. The attached solar illustration is a STYLE REFERENCE ONLY: match its delicate 17th-century copperplate engraving technique, confident tapered hand-cut strokes, selective contour hatching, generous breathing room, and pure white ground. Create a NEW SUBJECT specified below, not another sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely plain pure white, no texture, aged paper, gradients, shadows, text, labels, border, frame, badge, or watermark. Genuine naturalistic drawn forms rather than vector symbols or repeated geometric motifs. This will be faint background furniture behind dense text at about 7 percent opacity: the content must dominate. Leave much of the upper third white and avoid dense black patches. Subject: a sparse antique meteorological illustration of a few wind-shaped clouds, light diagonal rain below, and a few tiny distant stars between clouds. Soft complicated cloud edges described with fine arcing contour strokes and sparse crosshatching; elongated clouds drift from the right into the upper-middle part of the white portrait, with generous white sky between them. Rain occupies the lower half in sparse fine broken strokes. A few minute antique star marks, no oversized sparkle icons. Cloud edges should be natural and specific, not rows of semicircles. No ground, mountains, trees, sun, moon, faces, people or objects. Retain only clouds, a few stars, rain.

## transfers

Saved asset: `public/design/transfers-engraving-v1.png`

Use case: illustration-story. Asset type: monochrome illustration for a tarot card background. The attached solar illustration is a STYLE REFERENCE ONLY: match its delicate 17th-century copperplate engraving technique, confident tapered hand-cut strokes, selective contour hatching, generous breathing room, and pure white ground. Create a NEW SUBJECT specified below, not another sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely plain pure white, no texture, aged paper, gradients, shadows, text, labels, border, frame, badge, or watermark. Genuine naturalistic drawn forms rather than vector symbols or repeated geometric motifs. This will be faint background furniture behind dense text at about 7 percent opacity: the content must dominate. Leave much of the upper third white and avoid dense black patches. Subject: a grove of FIVE tall conifer trees of varying heights as an antique botanical engraving. Trees occupy lower two thirds, tallest tree to the right at 35 percent down, others lower. Individually articulated pine boughs with delicate needle clusters, visible trunks, organic irregular branch rhythms. Mostly white space inside the tree silhouettes, no dense black masses. Root line and tiny sparse horizontal earth strokes at foot fading into white. No mountains, sky motifs, stars, coins, people, houses, animals or additional objects. The existing subject is a grove of trees only.

## vibe

Saved asset: `public/design/vibe-engraving-v1.png`

Use case: illustration-story. Asset type: monochrome illustration for a tarot card background. The attached solar illustration is a STYLE REFERENCE ONLY: match its delicate 17th-century copperplate engraving technique, confident tapered hand-cut strokes, selective contour hatching, generous breathing room, and pure white ground. Create a NEW SUBJECT specified below, not another sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely plain pure white, no texture, aged paper, gradients, shadows, text, labels, border, frame, badge, or watermark. Genuine naturalistic drawn forms rather than vector symbols or repeated geometric motifs. This will be faint background furniture behind dense text at about 7 percent opacity: the content must dominate. Leave much of the upper third white and avoid dense black patches. Subject: curling ocean waves and horizontal water ripples as a spare antique maritime engraving. Naturalistic rolling wave crests build in the lower half of the portrait. One main curling crest on the right, a smaller secondary wave toward lower left, fine fluid contour lines describing water volume, delicate broken foam and a few dots of spray. Most of upper half is pure empty white. Elegant subtle engraving, not bold Japanese woodblock and not cartoon wave icons. No horizon scenery, ships, sea animals, rocks, sun, moon, clouds, people or objects. The existing subject is waves and water ripples alone.

## sigil

Saved asset: `public/design/sigil-engraving-v1.png`

Use case: illustration-story. Asset type: monochrome illustration for a tarot card background. The attached solar illustration is a STYLE REFERENCE ONLY: match its delicate 17th-century copperplate engraving technique, confident tapered hand-cut strokes, selective contour hatching, generous breathing room, and pure white ground. Create a NEW SUBJECT specified below, not another sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely plain pure white, no texture, aged paper, gradients, shadows, text, labels, border, frame, badge, or watermark. Genuine naturalistic drawn forms rather than vector symbols or repeated geometric motifs. This will be faint background furniture behind dense text at about 7 percent opacity: the content must dominate. Leave much of the upper third white and avoid dense black patches. Subject: a crescent moon, sparse connected constellation of FIVE stars, and one small watchful eye, an antique astronomical and allegorical engraving. Thin natural crescent moon in upper right around 30 percent down, delicate hatched lunar surface. Five tiny varied stars arc through middle right joined by very thin slightly interrupted guide lines. One small delicately drawn human eye, without surrounding face, low in the composition at about 82 percent down and slightly to the right; single eye with fine upper and lower lid contours and tiny selective lashes, understated, not photoreal. Broad empty white areas especially upper-left and center-left for content overlay. No sun, faces on moon, repeated sparkle icon grid, additional symbols, hands, pyramids, buildings, plants or objects. Keep restrained and scholarly, not a dense occult poster.
