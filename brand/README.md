# OpenLab — brand pack

The mark is a boundary drawn as four crop marks with a flask standing inside it: the lab is a
directory you own, and the work happens within it.

The name is written **OpenLab** wherever a person reads it: the wordmark, prose, the site. It is
written `openlab` wherever a machine reads it: the npm package, the CLI, and the file names in this
pack. npm has no other option, and mixed case in paths breaks across filesystems. Keep the split.

Everything here is generated from one geometry, so no file can drift from another. The mark is
drawn on a 64-unit grid; every proportion below is stated as a share of the mark's height, so it
holds at any size.

## Pick a file

| You need | Use |
| --- | --- |
| A mark on a page that has light and dark themes | `svg/openlab-mark.svg` — switches itself |
| A mark on a known light background | `svg/openlab-mark-dark.svg` |
| A mark on a known dark background | `svg/openlab-mark-light.svg` |
| A mark that should carry the brand colour | `svg/openlab-mark-accent.svg` |
| A mark at 20px or smaller | `svg/openlab-mark-dense.svg` — same form, heavier stroke |
| The mark with the name, in a wide space | `svg/openlab-lockup.svg` |
| The mark with the name, in a square space | `svg/openlab-lockup-stacked.svg` |
| A browser tab | `favicon/favicon.svg`, with the PNGs beside it as fallback |
| A GitHub or npm avatar (SVG is not accepted) | `png/openlab-mark-512.png` |
| A GitHub social preview | `png/social-preview-1280x640.png` |
| An iOS home screen icon | `png/apple-touch-icon-180.png` |
| The dashboard | `react/openlab-mark.tsx` |

Open `preview.html` to see all of it at once.

## Colour

| Role | Light | Dark |
| --- | --- | --- |
| Mark | `#09090B` | `#FAFAFA` |
| Accent | `#1447E6` | `#2B7FFF` |

The mark carries no colour of its own: it is one colour throughout, whichever one you give it. That
is deliberate — it means the mark passes every single-colour test by construction, from a terminal
to an embossed sticker. The accent values are the dashboard's own `--primary` and
`--sidebar-primary`, converted from oklch; the mark introduces no new colour to the product.

## Clear space and minimum size

Keep clear space of at least **a quarter of the mark's height** on every side. Nothing else goes
inside that margin.

The regular mark holds down to **20px**. Below that use the dense one, which is the same drawing
with a heavier stroke: at 16px the regular stroke lands at 0.75px and goes grey, while the dense one
lands at 1.1px and stays black. Both are the same shape, so nothing about the mark changes — only
how much ink it is made of.

## Lockup

The word is Inter Variable at weight 640. Proportions, as a share of the mark's height:

- **type size** — `0.69`
- **ink-to-ink gap** — `0.28` horizontally, `0.19` stacked

Those are ink measurements, which is what the eye reads. If you are laying it out in CSS, the mark's
box carries 11.7% of trailing padding inside it and the word carries its own left side bearing, so
the CSS `gap` that reproduces the rule is **`0.116` of the mark's height** — about 6px when the mark is
48px. `react/openlab-lockup.tsx` already has those numbers in it.

There is no separate wordmark file, and that is on purpose: the word is live text in the product's
own typeface, so it stays crisp at any size and never falls out of step when the typeface updates.
The SVG lockups embed the font so they stand alone; if a tool refuses to load an embedded font, use
the PNG.

## A note on file sizes

The mark SVGs are under 1KB each. The lockup SVGs are about 64KB, because each one carries Inter
Variable inside it so the file renders correctly with no font installed. That is the price of a
lockup that stands alone; if you are placing the lockup somewhere the product's own font is already
loaded, compose it from the mark plus live text instead and the cost disappears.

## Please don't

- Recolour the frame and the flask separately. The mark is one colour.
- Rebuild the lockup by eye. Use the files, or the proportions above.
- Stretch the mark, rotate it, or put it on a busy photograph.
- Replace the inlined flask with `<FlaskConicalIcon />` from `lucide-react`. The icon and the
  frame are one mark, and the icon's stroke is scaled to sit with the frame; the imported component
  is not.

## Licence

The flask is Lucide's `flask-conical`, used under ISC. See `ATTRIBUTION.md`. The frame, the
lockups and the proportions are yours.
