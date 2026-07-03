# Self-hosted brand webfonts

| File | Family | Axes | Role |
| --- | --- | --- | --- |
| `fraunces-var.woff2` | Fraunces (roman) | opsz 9–144, wght 100–900 | `--font-display` / `--font-heading` / `--font-body` |
| `fraunces-italic-var.woff2` | Fraunces (italic) | opsz 9–144, wght 100–900 | italic editorial accents |
| `dm-sans-var.woff2` | DM Sans (roman) | opsz 9–40, wght 100–1000 | `--font-numeric` |

Latin subsets fetched from Google Fonts (gstatic). Both families are licensed
under the SIL Open Font License 1.1 — self-hosting and commercial use are
permitted:

- Fraunces: https://github.com/undercasetype/Fraunces (OFL-1.1)
- DM Sans: https://github.com/googlefonts/dm-fonts (OFL-1.1)

`@font-face` declarations live in `src/global.css`; the roman cuts are
preloaded in `src/entry-server.tsx`. The `--font-*` stacks that reference
these families are owned by `@scoracle/tokens` (v0.6.1+).
