# 2026-07-03 - iOS NavRail Handoff

Use this prompt to start the follow-up `scoracle-ios` session:

```text
Continue in /Users/scotty/scoracle/scoracle-ios.

Read first:
1. The iOS repo README / active session guide.
2. /Users/scotty/scoracle/scoracle-tokens/AESTHETIC_VISION.md
3. /Users/scotty/scoracle/scoracle-tokens/docs/primitive-parity.md
4. /Users/scotty/scoracle/scoracle-frontend/progress_docs/2026-07-03_navrail-selection-primitive.md
5. /Users/scotty/scoracle/scoracle-tokens/progress_docs/2026-07-03_navrail-doctrine.md

Goal:
Implement the new shared NavRail vocabulary in scoracle-ios. Match the frontend
and tokens doctrine: NavRail is the shared selection rail posture; NavRailStack
is the page-level composition of an item rail plus an optional scoped-control
rail.

Frontend reference:
- /Users/scotty/scoracle/scoracle-frontend/src/components/solid/NavRail.tsx
- /Users/scotty/scoracle/scoracle-frontend/src/components/solid/NavRail.css
- /Users/scotty/scoracle/scoracle-frontend/src/components/solid/NavRailStack.tsx
- /Users/scotty/scoracle/scoracle-frontend/src/components/solid/ContentShell.tsx
- /Users/scotty/scoracle/scoracle-frontend/src/routes/leaderboard.tsx

Implementation notes:
- Add or rename the iOS design-system primitive to NavRail.
- Add a NavRailStack equivalent for screens that need product items plus scoped
  controls.
- Product switches, sport selectors, and board selectors are item rails.
- Scopes, seasons, modes, compare/search, and similar controls sit inside a
  control rail but remain native picker/menu/select controls. Do not promote
  scopes into tabs, chips, pills, or boxed scope buttons.
- Use ScoracleTokens / semantic app wrappers for text, secondary text, border,
  UI font role, and neutral hairline treatment.
- Keep native iOS mechanics where they improve feel, but avoid pill drift,
  colorful active chrome, and decorative fills.

Verification target:
- iOS profile screen uses NavRailStack for card/product navigation plus scoped
  controls.
- iOS leaderboard screen uses NavRailStack for board selection plus type/metric/
  season/search controls.
- Existing card taxonomy and product-vs-scope semantics remain unchanged.
- Run the repo's normal build/test command, likely xcodebuild through the
  project scheme, and record the exact command/results in a progress doc.
```
