# Remove footer top divider line

**Goal**
Every page rendered a faint full-width horizontal divider line directly above the
site footer (the ABOUT / CONTACT / TERMS / PRIVACY row). Scott flagged it as noise
that served no purpose and made the home page's leaderboard-dropdown area read as
cluttered. Remove it.

**What Was Done**
Deleted the `border-top: 1px solid var(--border)` rule from `.site-footer`. The
footer's `background-color` is already `var(--bg)` — the same as the page — so with
the border gone the footer blends seamlessly into the page with no visible seam.
That border was the only thing drawing the line; nothing else references it. Pure
one-line CSS deletion — no markup, JS, or token change.

**Files Changed**
- `src/components/solid/Footer.css` — removed `border-top` from `.site-footer`.
- `docs/progress/2026-06-08_remove-footer-divider.md` — this doc.

**Verification**
- Pure CSS one-liner: CSS isn't typechecked and no test asserts the footer border,
  so `npm run typecheck` / `npm test` surfaces are unaffected.
- Confirmed against the reported screenshot — the `border-top` was the sole
  separator the arrow pointed to, and it is the only line removed.

**Result**
The footer no longer renders a top divider line; it blends into the page background.
