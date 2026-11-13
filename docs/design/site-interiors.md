# Companion-page presentation

The Database, Passive Tree and Systems pages share the landing page's Cinzel
headings, restrained gold accents, Eigengrau/charcoal palette selection, and
original gothic divider and corner artwork. Their introductions use the same
voice while search, filtering, item details and build planning retain their
existing behavior and canonical game data.

`site/assets/interior.css` loads after each page's functional layout styles.
It is intentionally separate from `home.css`: the tree keeps a usable canvas
and statistics panel, and the database keeps its facets and dense result grid.
The three pages use the existing early `home-theme.js` selection and shared
navigation, background and artwork assets. No new paintings, dependencies or
animation loops are loaded.

The page header owns its lower ornament; subsequent Systems sections own one
shared boundary each. Its first section omits a second divider. Decorative
pseudo-elements ignore pointer events, and the Systems chapter rail keeps its
hit areas confined to the visible diamond controls. Cards, drawers, inputs,
footers and mobile navigation use the same materials. Categories without
facets give their space to the result grid. The mobile class selector gets a
full-width row to keep class names readable.

Every page has a skip link and retains accessible names for its controls.
Reduced-motion styles suppress decorative movement. The existing node colors
and item artwork continue to convey their gameplay identities.

After exporting website data, run:

```
npm run check
npx electron scripts/check-site-interiors.cjs
npx electron scripts/check-site-icons.cjs
```

The companion-page harness checks 320–1440px layouts, navigation, card contrast,
database filtering/search/details, real pointer allocation on the tree,
hover tooltips, build-link round trips and reset, Systems chapter navigation,
single divider boundaries, reduced motion and asset URLs under the Pages path.
