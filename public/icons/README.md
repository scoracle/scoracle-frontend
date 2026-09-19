# Scoracle icon system

Approved 2026-09-19: **Logo echo / Base**, monochrome. The crystal ball keeps its
curved pedestal, three petals, two reflections and diamond highlight. The hero
illustration remains the original artist-created logo with hands.

- `brand.svg`: signature for AppTray, partner advertising, apparel and larger uses.
- `brand-small.svg`: optical reduction for 16–20px (stronger outline, one reflection).
- All other SVGs: **Phosphor Light**, pinned to `@phosphor-icons/core` 2.1.1.
  `manifest.json` maps semantic names to upstream names; `LICENSE.phosphor` must
  accompany redistribution. The Scoracle signature is Scoracle-owned artwork.

All artwork uses one ink through `currentColor`. Do not add a blue ball fill or
reconstruct the signature independently per platform. Render white/cream on dark
surfaces. The native catalog fixes source ink to black and uses template rendering.

Run `npm run build` to emit `dist/icons/` and the committed
`Sources/ScoracleTokens/Resources/ScoracleIcons.xcassets/`. `npm run check:icons`
checks generated output against source. Package imports:

```js
import { icons } from '@scoracle/tokens/icons';
// icons.search: { viewBox, body } — trusted inline SVG content
// Static asset: @scoracle/tokens/icons/brand.svg
```

SwiftPM asset names are `scoracle-brand`, `scoracle-brand-small`, `scoracle-search`,
etc., resolved in the ScoracleTokens resource bundle (`Bundle.module` inside the
package). The public helper is `ScoracleTokens.iconBundle`. In SwiftUI:

```swift
Image("scoracle-brand", bundle: ScoracleTokens.iconBundle)
    .renderingMode(.template)
    .resizable()
    .scaledToFit()
    .foregroundStyle(.primary)
```

The common set includes search, menu, collapse, leaderboard, settings, theme
choices, chat, close, navigation, share, add/remove, confirmation, bookmarking,
notifications, filtering, refresh, external links, account, copy, download,
history, information, editing, deletion, calendar, lock, visibility, upload and
warning. Add semantic entries here before implementing a new platform glyph.
