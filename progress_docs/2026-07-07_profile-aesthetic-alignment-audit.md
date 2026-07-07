# 2026-07-07 - Profile Aesthetic Alignment Audit

## Goal

Fine-toothed-comb scan of `/profile` (route, both Shells, every registry
card, shared primitives, token wiring) against
`../scoracle-tokens/AESTHETIC_VISION.md`, hunting alignment-hardening
opportunities. Audit only — no code changed.

## What Changed

- Added [docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md](../docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md)
  with 13 ranked findings plus an "aligned — do not touch" record.

## Files Changed

- `docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md` (new)
- `progress_docs/2026-07-07_profile-aesthetic-alignment-audit.md` (new)

## Verification

Docs-only change; no build/test run. Every finding's selector/line was
verified by grep against `src/` (dead-CSS claims confirmed as zero
`.tsx` references; asset parity confirmed by byte-diff against the
tokens repo clone).

## Result

Chrome, color discipline, and rail semantics are clean. The material
drift is typographic: the brand faces (Fraunces / DM Sans) are declared
by tokens but never loaded, `--font-numeric` is used zero times, and
the display face is boldened in three places. One visible surface bug
(NewsCard's sticky scope identifier painting page-bg on card surface),
one voice leak (EmptyCard's "(no mentions found)" default under rating
empty states), a fragmented hairline vocabulary, and a large dead-CSS
block in StatsCard.css round it out.

## Follow-Up

Execution order proposed at the end of the audit doc; font self-hosting
(finding 1) is its own session and should update AESTHETIC_VISION.md in
the same stroke per the tokens governance order.
