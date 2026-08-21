# NovaBank self-hosted fonts

Offline copies of the UI typefaces previously loaded from Google Fonts:

| Family | Weights | Files |
| --- | --- | --- |
| Manrope | 500–800 | `manrope-*.ttf` |
| Sora | 500–800 | `sora-*.ttf` |
| IBM Plex Mono | 500 | `ibm-plex-mono-500.ttf` |

`fonts.css` is linked from `index.html` as a **static** asset (`assets/fonts/fonts.css`).
`@font-face` uses relative `url('./….ttf')` paths so browsers resolve fonts next to
that CSS file — correct for GitHub Pages `/banking-system/` and local `/`.

Do **not** `@import` fonts into `styles.scss`: Angular critical-CSS inlining rewrites
those urls to root-absolute `/assets/fonts/…`, which 404 on project Pages sites.
