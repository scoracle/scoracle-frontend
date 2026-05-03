# DNS cutover, VibesTab polish, and finalized Terms of Service

**Date:** 2026-05-03
**Scope:** Flagship goes live. `scoracle.com` cuts over from the legacy Astro worker to the new SolidStart `scoracle-frontend` worker. Two follow-up polish landings the same day: the inner card-within-card on the Vibes tab is removed, and the placeholder `/terms` page is replaced with the finalized 16-section Terms of Service plus a Terms/Privacy nav row in the footer.

## Goal

Ship the greenfield flagship to production and close out the day's polish backlog before declaring the migration complete.

## What Was Done

### DNS cutover — `scoracle.com` now serves the SolidStart worker

User-driven Cloudflare dashboard action. The legacy Astro worker (`scoracle`) had `scoracle.com` attached as a custom domain; the new worker (`scoracle-frontend`) needed it instead. Cloudflare doesn't auto-swap — the domain has to be detached from the source worker before it can be added to the destination.

Sequence executed:
1. Workers & Pages → `scoracle` (legacy) → Settings → Domains & Routes → remove `scoracle.com`
2. Workers & Pages → `scoracle-frontend` → Settings → Domains & Routes → Add Custom Domain → `scoracle.com`

Both actions are zone-internal; DNS records updated within seconds, no propagation wait. Brief sub-30s window between the two clicks where `scoracle.com` had no worker attached. Verified post-cutover: `https://scoracle.com/` and a profile URL serve the new build, mode toggle works, no flicker.

The legacy Astro worker keeps running on its own subdomain — kept around as a 72h hot standby in case rollback is needed. Rollback would be the same flow in reverse.

Neither `wrangler.jsonc` config has a `routes` entry (custom domains were managed through the dashboard), so no commit was required for the cutover itself.

### VibesTab — drop the nested card

The Vibes tab content was rendering inside a second nested card (border + bg-card + 6px radius + extra padding) inside the already-cardded tab content area. The double-card visual was carried over from when VibesTab was its own standalone container before tab compositions existed.

`VibesTab.css` — removed `background`, `border`, `border-radius`, and `padding` from `.vibe-card`; kept the flex-column centering, gap, and tier accent variables. Also dropped the responsive `padding` override at the 480px breakpoint.

Net 8 lines deleted. Commit `7b94c50`.

### Terms of Service — finalized + wired

`/terms` was a 10-section draft with a "Draft" banner and the contact email pointing at `hello@scoracle.com`. Replaced with the finalized 16-section ToS:

- Scoracle LLC, Michigan limited liability company, Royal Oak
- Governing law: State of Michigan, Oakland County jurisdiction
- 18+ eligibility, accounts, acceptable use
- Sections 5.1–5.4 (IP: Our Rights, Limited License, Raw Statistical Facts, User Content)
- Sections 6.1–6.3 (Third-party content: Sports league names, data providers, links)
- Disclaimers, limitation of liability ($100 floor), indemnification, termination, changes
- Contact: `legal@scoracle.com`

`legal.css` gained an `h3` rule for the lettered sub-sections (5.1, 5.2, 6.1, 6.2, 6.3), styled smaller than `h2` and color-stepped to `--text-secondary` for visual hierarchy.

`Footer.tsx` — added a Terms / Privacy nav row above the existing trademark disclaimer. Two paths to legal docs now: footer link on every page, hamburger menu on every page (the latter was already wired pre-cutover).

`Footer.css` — restructured around the new `.site-footer` outer + `.site-footer-links` row + the existing `.site-disclaimer` text. Border-top + padding live on the outer; disclaimer styling preserved.

Commit `eec638d`.

## Files Changed

**Modified — VibesTab polish (commit `7b94c50`)**
- `src/components/solid/VibesTab.css` — removed border / bg / radius / padding from `.vibe-card`; dropped responsive padding override

**Modified — ToS + footer legal nav (commit `eec638d`)**
- `src/routes/terms.tsx` — replaced placeholder draft with finalized 16-section ToS
- `src/routes/legal.css` — added `.legal-main h3` rule for section sub-headings
- `src/components/solid/Footer.tsx` — added Terms / Privacy nav row above the trademark disclaimer
- `src/components/solid/Footer.css` — restructured around `.site-footer` outer + new `.site-footer-links` row

**Cloudflare — dashboard action (no repo changes)**
- Detached `scoracle.com` from legacy `scoracle` worker
- Attached `scoracle.com` to `scoracle-frontend` worker

## Verification

- `npm run typecheck` — clean (both commits)
- `npm run build` — clean. Terms server chunk grew from 3.5 KB → 11.3 KB (new content)
- `npm test` — 67/67 passing (both commits)
- Production smoke (`https://scoracle.com`):
  - Home page serves the new SolidStart build (CrystalBall, Header, Footer with new legal nav)
  - Profile page (`?sport=NBA&type=player&id=177`) — mode toggle works, no flicker, no flash
  - `/terms` — HTTP 200, 17,339 bytes — content includes "Last Updated", "Scoracle LLC", "Royal Oak", "Michigan", `legal@scoracle.com`
  - Footer Terms/Privacy links navigate correctly
  - Hamburger menu's existing Terms/Privacy entries continue to work
- Production worker version: `8d0e7355-a8d3-4be8-a2f0-6c146ea439c6`

## Result

**Flagship is live.** `scoracle.com` is now served by the greenfield SolidStart worker built across the last ~10 days. The legacy Astro worker is parked on its own subdomain as a hot standby; can be retired after a soak period.

The Vibes tab visual is now flush with the rest of the tab content area — no more double-card. The Terms page carries a real legal document (Scoracle LLC, Michigan), with two discoverable paths from anywhere on the site.

Next adjacent work: backend repo relocation (`albapepper/scoracle-data` → `scoracle/scoracle-backend`) was queued for *after* the flagship cutover; that's now unblocked. After a soak period, retire the legacy `scoracle` worker. Then `@scoracle/ui` extraction when sandbox kicks off.
