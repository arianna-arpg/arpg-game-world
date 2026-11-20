# Passive node symbols and treatments

Open **Menu → Wardrobe → Passive nodes**. Compare Engraved Seals, Jeweled
Crests (default) and Luminous Sigils, then mix surface, silhouette, symbol
rendering and palette independently. All choices are free. The sample can show
every Vocation, its real node layout and painting, and enlarged allocation states.
Only **Save node style** changes the game. Back discards unsaved previews.

Every Vocation has its own authored frame silhouette and existing color palette.
All 249 internal nodes have explicit semantic symbols; the 31 starting crests
use Vocation emblems. Hearts, weapons, creatures, commands and defenses reuse
the original Hollow Wake `render/skillIconArt.ts` vocabulary. They are vectors,
with no font dependency, generated bitmap, network image or duplicated asset.
Unlearned nodes retain their palette. Available nodes have a bright crest;
learned nodes have a check; choices preserve a dashed rim. Search and hover
highlight the entire visible treatment. Refund state uses the existing violet
cue. Tooltips remain the source of names, powers and allocation requirements.

## Authoring

- `data/vocationNodeArt.ts` maps stable local node IDs to symbols. Each profile
  declares its emblem, silhouette and attribution. Display names and array
  order never select art. Add assignments when changing a Vocation's nodes.
- `ui/passiveNodeConfig.ts` owns shape paths, composable presets, normalization,
  palettes and the general registry. `PASSIVE_NODE_ART` merges **default → kind
  → group → local node → exact node ID**. Vocation groups use `vocation:<id>`;
  the renderer has no per-Vocation cases. Ordinary nodes can opt in through
  `kinds` or `nodes`; future consumers can supply arbitrary groups/local IDs.
  Unconfigured ordinary nodes retain their established presentation.
- A visual specifies `icon`, `silhouette`, `palette` (`accent`, `ink`, `dark`)
  and `author`. Optional `style` overrides can mix surface, symbol treatment,
  silhouette and palette mode at any scope. Style components merge separately,
  so a node's surface override preserves its group's symbol treatment. These
  optional authored components take precedence over the player's shared style.
  The shipped Vocation assignments leave them free for player choices.
- Add symbols to the shared icon vocabulary, or reuse an existing `IconSubject`.
  Add silhouette paths in a 24-unit tile centered at (12,12), entirely within
  radius 12. Registered shapes automatically appear in the Wardrobe selector.
  Attribution travels into the rendered `data-passive-author` field.
- `data/passiveTreePresentation.ts` owns node sizes. Vocation symbols have
  slightly larger hit circles: small 12, notable 16, choice 17, crest 18 and
  keystone 19 tree units. The renderer, preview, connector endpoints and layout
  checks all use `passiveTreeNodeRadius`. Update the shared size profile when
  changing sizes; don't scale decorations beyond their clearance envelope.
- `ui/passiveNodeArt.ts` renders the same decorative SVG in the tree and preview.
  Each live decoration is pointer-transparent, with the original `.tree-node`
  circle retaining allocation, choice, refund, proximity and tooltip handling.
  The editor keeps plain circles so its original drag handles remain intact.
- `Settings.passiveNodeStyle` is device-local presentation, independent of
  character saves, progression and co-op appearance. Missing/unknown selections
  fall back per component without a schema reset. No Vocation unlock is needed
  to preview a style. `passiveNodeArt.css` is imported only by the browser entry.

## Verification

Run `npm run check`, `npm run probe -- passivenodeart`, `npm run probe --
vocationlayouts`, `npm run probe -- passivetreeart`, `npm run probe -- storey`,
`npm run probe -- passiverefund` and sim smoke for shared data changes.
After an isolated relative-base build, run the hidden `passive-node-art-ui.cjs`,
`passive-tree-art-ui.cjs`, `tree-gestures-ui.cjs`, `gravebinder-ui.cjs` and
`vocation-mutations-ui.cjs` with that build path. The first two are enrolled in
the UI roster. The icon course checks all identities, contour bounds, real hit
targets, draft/save/reload, narrow layout, preview census and search. Its
optional `--review` produces a six-Vocation comparison sheet from the production
renderer. Its profile and saves self-clean, including failures.
