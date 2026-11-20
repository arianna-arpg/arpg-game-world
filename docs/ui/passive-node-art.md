# Passive node symbols and treatments

All players share the same allocation language: unlearned nodes use Luminous
Sigils, learned nodes use Jeweled Crests. Their silhouette and palette stay
consistent between states. Standard passive nodes retain circular frames;
Vocations retain their themed silhouettes. Wardrobe has no passive appearance
controls. Old saved `passiveNodeStyle` values are ignored and omitted on save.

Every node has a semantic symbol. Vocation assignments use stable local IDs;
ordinary symbols resolve from choices, attribute grants and primary modifiers.
Branch palettes are independent of the functional symbol, so a fire grant in a
defensive branch can retain that branch's identity. Tooltips remain the source
of exact powers. Available crests, learned checks, choice rims, search, hover
and refund cues retain their existing roles.

## Authoring

- `data/passiveNodeSymbols.ts`: shared stat/tag/attribute symbols, stat prefix
  fallbacks and exact-node overrides. Specific body/element tags outrank generic
  delivery tags. New powers should receive an explicit semantic assignment.
- `data/passiveNodeThemes.ts`: branch colors, silhouette and attribution. Stable
  source namespace prefixes select themes; translated names never select art.
  Standard profiles deliberately use `circle`. Authors can compose other shapes
  through the same registry without adding renderer cases.
- `data/vocationNodeArt.ts`: each Vocation's emblem, silhouette, attribution and
  node symbols. All icons reuse the original `render/skillIconArt.ts` vectors.
- `ui/passiveNodeConfig.ts`: `PASSIVE_NODE_STATE_STYLES` defines shared unlearned
  and learned surfaces. `PASSIVE_NODE_ART` resolves default → semantic meaning →
  kind → group → local node → exact ID. Groups are reusable beyond Vocations.
  A visual contains `icon`, `silhouette`, `palette` (accent/ink/dark), `author`,
  and optional component `style` overrides. Overrides merge per component.
  These are content authoring controls, never per-player preferences.
- Shapes use a 24-unit tile centered on (12,12), inside radius 12. Attribution,
  symbol source and branch identity travel into decorative SVG data fields.
- `data/passiveTreePresentation.ts` shares actual hit/clearance radii between
  rendering, layout validation and connectors. Standard small nodes are 11
  tree units; notable 15, keystone 18, attribute 12 and choice 16. Vocation
  sizes retain their existing profile. Decorations stay inside that envelope.
- `ui/passiveNodeArt.ts` is pointer transparent. Native circles retain
  allocation, choices, refunds, proximity and tooltips. The native editor
  keeps plain draggable circles.

## Verification

Run all types, passivenodeart, passivetreelayout, vocationlayouts, passivetreeart,
storey, passiverefund and sim smoke. After a relative-base build, run the hidden
node-art, tree-art, tree-gestures, Gravebinder and Vocation mutation UI courses.
The node-art course checks all Vocation grants, shared states, circular ordinary
nodes, real mouse allocation, exact-neighbor hover highlighting, search, ignored
legacy settings and removal of Wardrobe controls. `--review` saves a compact
comparison sheet rendered by the production icon code. Test profiles self-clean.
