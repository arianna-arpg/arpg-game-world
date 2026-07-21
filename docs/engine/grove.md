# THE GROVE COUNTRY — the first country, and the night that kindles

Kit `src/data/grove.ts` · painters `src/render/vis/paintersGrove.ts` · faces in
`src/data/tilesets.ts` · kin in `src/data/monsters.ts` (faction `glimmerkin`) ·
den door in `src/data/sidezones.ts` · probe `balance/probe_grove.ts`.

The starter wood upgraded to full country stature on ONE thesis: the
**DAY/NIGHT INVERSION**. By day the grove is what it always was — the gentle
sunlit opening ground. At dusk it KINDLES: firefly tides pour up out of the
bracken, lantern-flora opens along the ways, the glimmerkin come out dancing,
and down under the vale one light lies. Gloamwood's night is dread; the
grove's night is luminous and alive — beautiful, with teeth.

## Where the country grows

Four staged surface faces (`depthAffinity`, the garden/desert model) plus one
den, all `biome: 'grove'` (BIOME_FIELD weight 1.55, meld `grove_meld`):

- **meadow** — the doorstep breather, rim `{to:.34}`. A soft share of the
  night: low fireflies fx, the occasional small tide.
- **deepwood** — the broad middle `{to:.75}`. The starter table unchanged in
  the day; after dusk the glimmerkin rows wake beside the undead rows — the
  dark wood is a three-way brawl by construction (glimmerkin hostile to
  nightkin AND undead: the little lights against the dark that eats lights).
- **glimmervale** — the firefly dells `{from:.22, to:.85}`: mist pools,
  lantern blooms, the densest fireflies fx + the biggest conditioned tide,
  the `lantern_glade` commons and the `glowworm_hollow` way DOWN. Offers the
  `glimmer_refrain` puzzle.
- **heartwood** — the sealed old-growth heart `{from:.55}`, `forceLayout:
  'forest'` (a true roof scaling with biomeDepth), the treant line thick,
  root wraiths everywhere — and **the Grove Singer finally seated in the
  wood that names him** (the sylvan warlord's native pack row). Two variants
  (sunshaft cathedral / rootbound dark).
- **gleamhollow** — the den (`frontier:false`, `perfProbe:true`, sheltered):
  a glowworm-lit root-warren minted ONLY by the `hollow_bole` door, one rung
  deep by design (fireflies dig no galleries — the den IS the vault), boss
  objective `false_sovereign`, ledger `gleam_entered` (the nest_entered
  gateway-seam pattern; the Glimmercraft gem pool names it).

## THE FIREFLY FABRIC (five generic levers — nothing grove-bespoke)

1. **The fireflies ambient** (`render/vis/ambientFx.ts`, kind `'fireflies'`
   on `ZoneTheme.ambientFx` — note zones.ts carries a DUPLICATE of the kind
   union; extend both): drifting sparks that FLASH on per-fly periods with
   true dark between pulses, self-gated on the night exactly like the aurora
   (daylight hides them completely). Deterministic from (i, t), zero state,
   no gradients. Any biome may declare it.
2. **The conditioned pour** (`LiteSwarmRow.when?: LiteCond` —
   `engine/lite.ts`, a structural RadianceCond twin, the creep FrontCond
   pattern): a pour row that stands only while its hour holds. Pockets still
   SEAT at boot (the salted stream's draws are sacred, held or not); out of
   hour a pocket breeds nothing and gently RECEDES at its own regrowth rate;
   the hour's return raises the tide from the same seats. THE WEATHER-NOT-
   VIOLENCE LAW: a pocket the hour fully reclaims un-marks `poured`, so the
   next held sweep reads clean seats — only a wipe DURING the hour meets the
   extermination law. A conditioned row without `regen` adopts defaults (a
   tide that could never rise would be a dead dial). Announces wait with the
   tide (`liteWhenAnnounces`, fired once at the first held sweep).
3. **The breathing light** (`LightSpec.radiance?: { at0?, at1? }` —
   `render/vis/painters.ts`, applied in every collect path of
   `render/vis/lights.ts`): reach + punch lerped on the sky's radiance.
   Nocturnal lamps `{at1: 0}` open at dusk and die at noon; under shelter
   the flat cave twilight keeps them half-lit — bioluminescence underground
   for free. Composes with flicker; occlusion stays cached at the widest
   reach; a fully-breathed-out lamp skips the cap entirely.
4. **The carried lamp** (`MonsterDef.light?: LightSpec`): actors join the
   dynamic light layer as movers — live-marched like the hero's lantern,
   pushed before terrain emissives so the cap can't starve them, skipped
   while dead or concealed. The kin's glow IS their tell.
5. **The planted lure** (`SkillEffect { type: 'lure', radius, sec, pace?,
   standoff? }` — `engine/skills.ts` + both dispatch sites in world.ts):
   plants a `World.setLure` bait at the resolution point; projectile
   deliveries plant at the flight's end (bait you can throw). Draws only
   the UNAWARE — never overrides combat, orders, or fear.

## THE GLIMMERKIN (faction `glimmerkin`)

Crownless BY BIOLOGY — fireflies have no queen, and the biggest light in the
wood is a LIE. Ally of the sylvan; hostile to nightkin + undead. PHASE_BIAS
keeps their hours (day 0.25 / dusk 1.6 / night 2.0 / dawn 0.7 — the
strictest curve in the table) and `nocturne` wears their night-strength.

- `glimmerling` — the tide: 1-ply lite mote, NO contact spec (harmless
  ambience you wade through), poured by the conditioned rows.
- `glimmer_courtier` — flock flier (skep-bee spec family), the courtship
  blinker; nocturne night buffs.
- `duskveil_dancer` — ES-glass charmer: `beguiling_glow` applies
  `transfixed` (slow + THE ADDLED HAND scrambleChance — engine/status.ts).
- `glowworm_grub` — armor/poise larva; `silk_snare` roots the floor.
- `lampwright` — THE SYNCHRONIST: mods-granted `combo_glimmer_chorus`
  (data/combos.ts, repeat×3 → the lantern-chorus surge; beatPips tell) —
  the cadenced-kin law in firefly dress; players can earn the same grammar.
- `false_sovereign` — the boss (faction `wild`, NOT kin): a Photuris-style
  aggressive mimic wearing a stolen signal. Ambush-hidden; `mimic_flash`
  lures the unaware to her lamp and transfixes whoever sees her truly;
  phases summon glimmerling swarms; her light wears no radiance lerp —
  it never sleeps, because it is bait.

Player-side: `lure_lantern` (throwable bait — the lure effect's player
debut) in the Glimmercraft pool behind `gleam_entered`.

## Verification

`balance/probe_grove.ts` (48 checks): staging tallies, flora contracts, den
chain, faction/clock wiring, nocturne on the real clock, THE CONDITIONED
POUR live (day-boot seats empty → dusk raises → dawn recedes without
extermination → next dusk raises again — the probe caught the original
poured-flag extermination bug), the planted lure drawing an idle wolf, and
the chorus registration. Also: genqa (faces + forced compositions), the
lite + anatomy probes, eventqa, and the smoke baseline (re-written this
pass — the drift was inherited from the passive-tree install, proven on a
HEAD island; grove content itself moves no gated metric). Live-verified
under the dev server: night/noon frame pair, tide breathing 10→0→16 across
a full day, zero console errors.

## Deliberate deferrals

A chorus granter for players (vestige/passive), a firefly WeatherDef row
(the ambient + tides carry the sky for now), wisp kind rows for gloamwood,
lite-tier glow on the wire for co-op badge truth, and the full-matrix perf
re-run (gleamhollow auto-joins via perfProbe; the standing healthy-machine
runbook owns it).
