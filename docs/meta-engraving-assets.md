# Meta-card engraving assets

Approved 2026-09-12: **Star Atlas (A)** is the meta/summary card's production
illustration. **Celestial Compass (C)** is retained as the approved fallback,
not loaded by the active card. Armillary was not selected.

- Active: `public/deck-art/engraving-meta-star-atlas-v1.webp`
- Fallback: `public/deck-art/engraving-meta-celestial-compass-v1.webp`
- Switch: `--meta-illustration-src` in `src/components/solid/EntityMeta.css`.

Both are 1024×1536 transparent ink masks, mechanically extracted from the
approved white-ground PNGs using the same process as the character engravings
(see [deck-engraving-assets.md](deck-engraving-assets.md)). The full plate is
painted in `--card-ink` at 8.5% opacity inside the existing wash. Frame, stock,
type and name box are unchanged. No score-to-crest connectors or ring are drawn.
Only finite, non-null scores appear, equally spaced in deck order; zero is valid.
Artwork never determines data availability. The neutral atlas belongs to Meta,
not to any character's leaderboard masthead.

## Generation provenance and full prompts

Built-in image generation, 2026-09-12, using the approved Momentum engraving
as a style reference. Original PNGs remain in the local design study; the two
production-quality WebP masks above are version-controlled for reuse.

## Star Atlas — selected

Asset: `public/design/meta-star-atlas-v1.png`

Use case: illustration-story. Asset type: quiet background engraving for a tarot-shaped sports entity summary card. Input image is STYLE REFERENCE ONLY, not an edit target: match its accomplished antique copperplate linework, very fine tapered hand-cut strokes, selective contour hatching and breathing room; DO NOT draw its sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely pure white, no paper texture, no gradients, no shadow, no text, letters, numbers, title, labels, card, border, frame, watermark or logo. The actual UI will overlay six scores around a crest in the upper-middle of the portrait, and entity details in the lower third. Illustration must feel like background furniture, not a data chart. Keep a clean white opening centered at 50% across, 43% down for the crest. Top 15% and lower 25% especially sparse. No eye, moon, figurative zodiac creatures, face, hands, modern sparkle icons, or evenly repeated geometric decoration. Subject: a sparse antique celestial atlas fragment. Irregularly scattered tiny stars in several magnitudes, fine interrupted constellation guide lines, and just two broad faint curved celestial-coordinate arcs. Stars grouped in asymmetrical constellations around the upper-middle central white opening, gently trailing toward the right and lower edges. Some stars are tiny pinpricks and a few are delicately hand-engraved multi-ray star marks, not repeated four-point sparkles. Scholarly restrained astronomical cartography, not a dense circular wheel. Broad quiet openings between constellations. Idea: many distinct signals form one coherent identity.

## Celestial Compass — saved fallback

Asset: `public/design/meta-celestial-compass-v1.png`

Use case: illustration-story. Asset type: quiet background engraving for a tarot-shaped sports entity summary card. Input image is STYLE REFERENCE ONLY, not an edit target: match its accomplished antique copperplate linework, very fine tapered hand-cut strokes, selective contour hatching and breathing room; DO NOT draw its sun. Portrait 2:3, 1024x1536. Neutral black and gray ink on absolutely pure white, no paper texture, no gradients, no shadow, no text, letters, numbers, title, labels, card, border, frame, watermark or logo. The actual UI will overlay six scores around a crest in the upper-middle of the portrait, and entity details in the lower third. Illustration must feel like background furniture, not a data chart. Keep a clean white opening centered at 50% across, 43% down for the crest. Top 15% and lower 25% especially sparse. No eye, moon, figurative zodiac creatures, face, hands, modern sparkle icons, or evenly repeated geometric decoration. Subject: a restrained antique celestial navigation compass rose and a partial astrolabe limb. An asymmetrical edge fragment, compass center at 70% across and 52% down, with very fine long and short tapered compass points and selective engraved hatching. A single thin broken calibrated arc sweeps around its right edge and trails downward. The central-left white opening remains undisturbed. No bold star silhouette, no heavy black triangles, no compass letters, no numbers, no repeated circle rings, no dense ticks. Delicate thin lines, numerous large white spaces. Idea: a reference point for locating and understanding an entity among several readings.
