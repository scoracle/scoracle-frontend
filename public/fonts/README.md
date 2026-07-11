# Self-hosted brand webfonts

| File | Family | Axes | Role |
| --- | --- | --- | --- |
| `fraunces-var.woff2` | Fraunces (roman) | opsz 9–144, wght 100–900 | all roman roles (`--font-display` / `--font-heading` / `--font-body` / `--font-ui` / `--font-numeric`) |
| `fraunces-italic-var.woff2` | Fraunces (italic) | opsz 9–144, wght 100–900 | italic editorial accents |

Latin subsets fetched from Google Fonts (gstatic). The family is licensed
under the SIL Open Font License 1.1 — self-hosting and commercial use are
permitted:

- Fraunces: https://github.com/undercasetype/Fraunces (OFL-1.1)

`@font-face` declarations live in `src/global.css`; the roman cut is
preloaded in `src/entry-server.tsx`. The `--font-*` stacks are owned by
`@scoracle/tokens` (v0.6.1+); `src/global.css` overrides the UI/numeric
roles to Fraunces until the tokens package ships the change.
