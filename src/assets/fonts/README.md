# NovaBank self-hosted fonts

Offline copies of the UI typefaces previously loaded from Google Fonts:

| Family | Weights | Files |
| --- | --- | --- |
| Manrope | 500–800 | `manrope-*.ttf` |
| Sora | 500–800 | `sora-*.ttf` |
| IBM Plex Mono | 500 | `ibm-plex-mono-500.ttf` |

`fonts.scss` declares `@font-face` rules. Themes remain local CSS variables in `src/styles.scss` (no CDN).
