# Page-type accuracy — match the corrected wire page values

**Date:** 2026-06-18
**Commit:** frontend — compile-time only (type literals; no bundle change, NOT deployed).

## Goal
Mirror the backend page-field fix so the response types match the wire.

## What Was Done
- `RatingResponse.page` "sigil" → "rating"; `SigilResponse.page` "vibes" → "sigil";
  `MomentumResponse.page` "trends" → "momentum".

## Verification
tsc clean (113 tests unaffected). These are cast-target type literals — `page` is never read for
logic — so this is purely descriptive accuracy; the compiled bundle is byte-identical, hence no deploy.

## Result
Frontend response types now match the corrected backend wire.
