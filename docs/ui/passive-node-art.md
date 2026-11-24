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

Standard notables have two studs inside the rim. Keystones add a third at the
top. Both ranks show the engraving inside the symbol even before allocation.
Choice seals also show their engraving and keep the dashed rim. The nine
Crossroads masteries each use their branch emblem. Small passives use the
simpler face. `STANDARD_RANK_ART` pairs these treatments
with node kinds, and a group or node can override the inlay and symbol style.

## Authoring

- Standard keystones each have an entry in `data/passiveKeystoneArt.ts`.
  Choose a subject for the defining effect. Add a shared action mark when it
  helps explain the power, or draw a new subject in `render/skillIconArt.ts`
  when two powers would otherwise look alike. The Homing Arc uses a returning
  arrow and The Falconer's Loop uses a wing-shaped return path. A local
  Vocation assignment accepts either a subject name or an `{icon, motif}` pair.
  All keystones show their interior engraving on both surfaces, including
  within a Vocation silhouette.
- `data/passiveNodeSymbols.ts`: shared stat/tag/attribute symbols, stat prefix
  fallbacks and exact-node overrides. Specific body/element tags outrank generic
  delivery tags. For generic damage grants that scale from a linked stat or
  a recognized gauge, the symbol shows what powers the bonus. For example,
  armor-scaling damage uses plate and harmony-scaling damage uses a tuning fork.
  Conditional damage can show its enabling condition, and small conversion nodes
  show the destination element. New powers should receive a semantic assignment.
- `data/passiveMajorEmblems.ts` pairs an action mark with a subject on standard
  notables and keystones. For example, a conversion wedge points to the resulting
  element, a conduit marks the receiving pool, and a flash marks a triggered
  payoff. Multiple outgoing elements on a single transfer use a prism. Minion
  formations share a stand beneath their respective creature symbols. A signature
  power and the passives that strengthen it can share one standalone subject.
  Add new stat assignments to this registry. Use an exact-node override for a
  compound power whose grants alone do not describe its identity. Branch color,
  rank engraving and allocation surface are independent of this choice.
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
  an optional `motif` and optional component `style` overrides. Overrides merge
  per component. Set `motif` to `null` to display the subject by itself.
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

The node-art probe checks every live node and every standard stat grant. It
compares keystone glyphs in both allocation states in a common neutral palette
and circular frame. A missing keystone assignment or duplicate design fails
the check. The hidden game also checks the mounted art against the assignments.

Run all types, passivenodeart, passivetreelayout, vocationlayouts, passivetreeart,
storey, passiverefund and sim smoke. After a relative-base build, run the hidden
node-art, tree-art, tree-gestures, passive-routes, Gravebinder and Vocation mutation UI courses.
The route course also proves investment/search behavior and lossless native
editor serialization with the routed connectors, using self-cleaning saves.
The node-art course checks all Vocation grants, shared states, circular ordinary
nodes, real mouse allocation, exact-neighbor hover highlighting, search, ignored
legacy settings and removal of Wardrobe controls. `--review` saves a compact
comparison sheet rendered by the production icon code. Test profiles self-clean.
