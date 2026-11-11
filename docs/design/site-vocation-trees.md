# Vocation trees on the landing page

The selected calling in **A deeper calling** includes a read-only view of its
in-game passive tree. Its painting and description remain class-specific; its
tree is shared by every class offered that Vocation. An Expand control opens a
larger view of the same graph. Nodes support hover, focus, arrow navigation and
tap inspection, with Escape dismissing the tooltip or expanded view.

## Source and parity

`scripts/export-web-data.ts` passes evaluated `VOCATIONS`, `PASSIVE_NODES` and
`PASSIVE_ADJACENCY` through `scripts/site-vocation-data.mjs`. This includes
Vocation mutations, generated crests and registered doctrine choices. Each
calling is written to `site/data/vocations/<id>.json` during the normal Pages
export. Edit game data and rebuild to update positions, connections and details;
the site has no separate node layout to maintain.

Projection only translates each graph to its crest origin. Coordinates,
orientation, internal connections, node sizes and neutral colors follow the
game's passive renderer. The external class-gate tether is outside the graph.
Tooltips retain authored descriptions and attribute lines, plus every option
from the game's choice popup. They do not invent allocations or duplicate
engine modifiers already explained in those descriptions.

The renderer lives in `site/assets/vocation-tree.js`, loaded with the existing
lazy Vocation gallery. Only the selected tree is requested; undiscovered trees
stay unrequested until revealed. Successful graphs are cached for the visit.
Selection changes abort stale requests, failures offer retry, and closing the
gallery dismisses inspection. The full passive database is never needed here.

At the initial integration, the published roster exports 31 trees / 280 nodes /
322 internal edges, totaling 103,521 bytes before compression. These figures
describe the current game, not limits imposed by the website.

## Verification

- `node --test scripts/test-site-vocation-trees.mjs` generates its own isolated
  export, checks every graph against the full game export, and covers irregular
  topology and doctrine metadata. Temporary output is always removed.
- `npx electron scripts/check-site-vocation-trees.cjs` checks real-page loading,
  coordinates, tooltips, keyboard/tap behavior, expansion, retries, stale
  responses, secret reveal, and layouts from 320 to 1440 pixels. Run the normal
  web-data export first to populate the preview's ignored `site/data` folder.
- Existing Vocation, disclosure, gothic and performance browser checks cover
  the surrounding gallery, compact shuffle controls and loading budgets.

The homepage class draw control occupies the existing gap above the class tabs.
It shares the smaller, translucent shuffle treatment with the field guide and
collection. Invisible section-rail labels do not block underlying controls.
