# THE ATTUNEMENT FABRIC — crystals take the color of the blow

`src/engine/tuning.ts` · statuses in `src/engine/status.ts` (the `attuned_*`
family) · resolveHit branch + `World.attuneCrystal` in `src/engine/world.ts`
· probe `balance/probe_attunement.ts`

## The idea

A body wearing `MonsterDef.tune` is **TUNABLE**: every landed hit reads the
packet's **ROLLED amounts** — post-conversion, so what tunes is what truly
struck (an Avatar-of-Flame's "physical" mace tunes FIRE) — and the dominant
damage type becomes the body's **TONE** (`Actor.tone`). A tone **change**:

1. re-dresses the body — it sheds `attuned_<old>` and wears `attuned_<new>`
   held long (`TUNE_CFG.holdScale`): the status lane IS the dressing lane,
   so nameplate, co-op wire and fx can never disagree with the state;
2. **PULSES** the same status briefly onto every living body near — allies
   and enemies alike; the crystal doesn't take sides (`TUNE_CFG.pulseRadius`
   / `pulseDuration`, paced by `pulseIcd` so a flurry re-rings once);
3. notifies the puzzle fabric (`World.puzzleTuned` — the chord riddles).

**Physical is the ground state, not an absence**: every tunable body wakes
physical (unless its spec rolls otherwise), and battering an attuned crystal
back to physical — *"the attunement shatters!"* — is a deliberate act the
shatter-chord riddle is built on.

## The spec (`TuneSpec`, on any MonsterDef)

| field | meaning |
| --- | --- |
| `tones?` | accepted tones (default: every damage type) — unlisted tones wash past |
| `base?` | the ground state (default `'physical'`) |
| `roll?` | roll the STARTING tone from `tones` at spawn (riddle hearts) |
| `locked?` | strikes never change it — the chord's heart HOLDS its note |
| `pulse?` | `{ radius?, duration? }` overrides, or `false` to mute the wash |

Fixture bodies ship in `data/monsters.ts` on the object-actor contract
(passive + immortal + noObjective + moveSpeed 0 ⇒ anchored): the ambient
`resonant_crystal` (planted per zone by `ZoneDef.scenery` rows —
`World.bootScenery`, its own salted stream), the riddles' `chord_crystal` /
`heart_crystal`, and the puzzle-owned `chime_crystal` / `lattice_crystal`
(no `tune` — the SONG decides what glows, not the blow).

## The statuses

One `attuned_<type>` row per damage type (validated: a missing row would
strand a tone invisible). Each grants that element's edge to WHOEVER wears
it — increased damage of the type, a little of its resistance, and (for the
elements) a sliver of physical CARRIED AS the type, so blows near a
fire-tuned crystal literally take the crystal's color. Physical grants armor
instead of a conversion. The status colors ARE the tone tints everywhere
(`toneTint` reads them back): change a hue once and the crystal glow, pulse
ring, floating text and HUD all follow.

## Render

The renderer pools a soft breathing glow under any `Actor.tone` bearer in
the tone's tint (render-only read; the bake stays tone-free so ONE sprite
serves every element) — plus the ordinary worn-status ring. Nothing else to
wire: dressing rides statuses.

## Who else speaks it

- **Monster verbs**: `resonant_peal` (the chime_haunt's nova, `affects:
  'all'`) rings kin, foes and standing crystals with lightning;
  `discord_wail` re-tunes the court to chaos — its own kin included.
- **Player kit**: `prismatic_ray` (all three elements in one packet — the
  build's strongest color is what tunes), the `refraction` support (splits
  physical into the spectrum), The Tuning Fork amulet (part-lightning
  blows).
- **The creep fabric** reserved its ice-jackpot seam against this fabric's
  intake (docs/engine/creep.md) — deliberately unbuilt until it lands there.

## Non-collisions (naming ledger)

- `data/attunements.ts` is the TERRAIN COMMUNION fabric (actor stands near
  doodad kinds → status). Different layer; shares only the word.
- `DoodadRule.resonance` (karst) is the NOISE fabric — struck stone turns
  heads. `crystal_spire` wears it (a singing field is an alarm field); this
  fabric is the COLOR.
