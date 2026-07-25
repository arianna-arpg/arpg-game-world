# The Tell Fabric — visible internal state as data

The roster has silhouette variety: you can tell WHAT a thing is at a glance.
Tells add the missing STATE variety: what it is doing and feeling *right
now*. A body nearly ready to burst, a wolf hunting rather than ambling, a
stalker that has noticed you, the loner of a clutch that otherwise all wear
one skin — each is one `MonsterDef.tells` row binding a **state source** to
a **visual channel** through curve/band/quantize dials. The whole fabric
lives in `engine/tells.ts` (a pure leaf: `TELL_CFG`, the source registry,
the resolver, the dress materializer); the sweep is `World.updateTells`;
the channels apply in `drawActor` and the bestiary book.

```ts
tells: [{
  source: 'drive:glut',                    // the state read (open registry)
  band: [0.45, 0.95],                      // input window → 0..1 (hi < lo inverts)
  curve: 'smooth',                         // 'linear' | 'smooth' | 'early' | 'late'
  steps: 8,                                // quantize ticks (1 = binary threshold)
  portrait: 0.5,                           // the book's sane default value
  channel: { kind: 'part', part: { kind: 'fillSac', x: -0.55 }, scale: [0.7, 1.15] },
}]
```

## The laws

- **Drawn == tested.** A tell resolves off the LIVE mechanic — the same
  drive map the AI rules read, the same charge bank the skills spend, the
  same morale window that routs the body. A sac that reads full IS full. A
  tell may never be decorative and never lie; the mire leech's burst rule
  and its sac read the *same* `drive:glut` number.
- **Read-only.** Sources are pure reads; a tell reports state and never
  bends it (probe-pinned).
- **Cheap.** The sweep is cadenced (`TELL_CFG.sweepSec`), the value
  QUANTIZED (`steps` — default `TELL_CFG.steps`, landing on the 3-decimal
  wire grid), and the render dress rebuilds only when a quantized value
  actually moved (`Actor.tellRev`) — quiet frames allocate nothing and
  invalidate nothing. Tint channels meet the sprite-bake cache with at most
  `steps + 1` colors per look (the color-drift discipline).
- **Co-op safe.** The host sweeps; the wire ships the DERIVED scalars
  (`ActorW.tl`, omitted when all-zero) plus the rolled brain-variant index
  (`ActorW.bv`). The client rebuilds the same binding list from its own
  registry and materializes the same dress from the same numbers — drives,
  morale, and aggro state never cross the wire.
- **Portrait-aware.** The book renders every tell at its sane default
  (`TellSpec.portrait` ?? `TELL_CFG.portraitValue`): the gauge shows
  itself. Portrait folding happens at the ONE game-side seam
  (`panels.portraitDefOf`) so `render/vis/portrait.ts` stays vis-pure for
  the website bundle.

## State sources (open registry — `registerTellSource`)

| id | reads | raw range |
| --- | --- | --- |
| `always` | constant 1 — the identity-marker lane | 0..1 |
| `life` | own life fraction | 0..1 |
| `plies` | plies SPENT fraction (the ply fabric) | 0..1 |
| `drive:<id>` | THE WANTS meter (`BrainDef.drives`) | 0..1 |
| `charge:<id>` | banked charge count | **raw — band required** |
| `status:<id>` | stacks / the registry cap (presence for non-stackers) | 0..1 |
| `alert` | has this body noticed anyone (`aggroed`) | 0 / 1 |
| `morale` | routing right now (the break window) | 0 / 1 |
| `fuse` | armed self-detonation, seconds REMAINING | **raw — band required** |
| `stored` | the banked reservoir (Tree-of-Life lane) | **raw — band required** |
| `radiance` | the sky's light (`World.radiance`) | 0..1 |
| `ground:<kind>` | standing on the named ground kind | 0 / 1 |

Parameterized ids split on `:` — an exact registered id wins over the
prefix lane, so a package may override `drive:dread` wholesale. Unknown
sources resolve 0 (a tell can ship ahead of its source);
`validateTells` names them, requires bands on the unbounded three, and
checks part painters — `balance/probe_tells.ts` runs it over the shipped
registry.

## Visual channels (every one rides an existing mechanism)

- **`part`** — a worn GAUGE: any registered painter drawn in facing space
  with the look's live parts. The value always rides `params.fill`
  (fill-aware painters like `fillSac` read it); optional `scale` / `alpha`
  / `count` / `color` dials lerp the part's own fields, so ANY of the
  ~100 existing painters becomes a meter without edits.
- **`tint`** — the body color lerps toward `color` by value × `max`,
  riding the same pre-bake color swap as the color drift (quantized,
  bounded bake set). Deepest tint wins; never stacks.
- **`glow`** — a state-fed under-halo (the attunement tone-pool's kin);
  alpha IS the reading.
- **`scale`** — body swell, clamped by `TELL_CFG.maxBodyScale`. Draw-only,
  riding the breathe transform: a posture, never a hitbox lie.
- **`lean`** — hunkered-forward shift + screen squash (the stalk).
- **`alpha`** — draw alpha lerps 1 → `min` as the value rises, folded into
  the ordinary fade lanes (a fading body fades whole).
- **`adorn`** — silhouette-accent swap while value ≥ `at` (a different
  cached sprite; bounded by construction).

## Temperament tells (`brainVariants[].tells`)

`brainVariants` rolls a per-spawn mind; a variant row may now carry its own
tell rows, appended to the def's for that roll (`tellSpecsOf`) — so the
rolled personality is VISIBLE. The roll lands on `Actor.brainVariant` and
rides the wire. The sand skitterer's loner runs dust-dark and hunkers once
it has marked you (`alert` is the stalker's honest step-tell); its tide
wears a blood crest; the pack-mind stays bare — the baseline roll costs
nothing by construction. The abyssal flayer's stalker/knife-runner split
reads the same way.

## Debut consumers

- **`mire_leech`** (the accumulator): every wound it gives feeds
  `drive:glut` (`onDealt` — the first authored use of that jump); the
  translucent `fillSac` on its back IS the meter, area-honest (radius ∝
  √fill) and straining taut near full. At the brim its rule detonates
  `sanguine_burst` and shoves the drive empty — the sac drains exactly
  when the bank spends. The burst is reserved OUT of its rotation
  (`skillUse` priority = claw), so the full sac is the only warning and
  the only one needed.
- **`HUNGER_LEAN`** (data/monsters.ts): the one shared predator row —
  `drive:hunger` banded across the hunt-rule thresholds → the lean. All
  twelve hunger-driven hunters wear it (wolves, warg, lynx, wolverine,
  fox, owl, viper, otter, terrapin, yeti, the stalkers); the probe census
  names any future predator that hungers without telling.

## Authoring recipes

- A fuse the player can read: `{ source: 'fuse', band: [3, 0], channel:
  { kind: 'glow', color: '#ff6a3a' } }` — the countdown inverts through
  the band; no new field needed.
- A binary "noticed you" flare: `{ source: 'alert', steps: 1, channel:
  { kind: 'adorn', adorn: 'spikes' } }`.
- A wound-state skin: `{ source: 'life', band: [0.7, 0.2], channel:
  { kind: 'tint', color: '#5a1622' } }` — darkens as the wounds deepen.
- Claimed-ground confidence: `{ source: 'ground:web', channel:
  { kind: 'scale', amp: 0.1 } }`.

## Plumbing map

`engine/tells.ts` — types, config, sources, `resolveTell` (band → curve →
quantize → wire grid), `tellSpecsOf`, `materializeTellDress` /
`tellDressOf` (identity-stable), `tellPortraitDress`, `validateTells` ·
`World.updateTells` — the cadenced sweep (after the movers) ·
`world.createMonster` — stamps `brainVariant` + `tellSpecs` ·
`renderer.drawActor` — applies the dress (tint pre-bake, glow with the
tone pool, scale/lean with the breathe, parts after the live parts, alpha
in the fade lanes, adorn at the BodyLook) · `vis/body.drawPartSpecs` — the
explicit-spec live-part pass · `net/snapshot.ts` — `tl`/`bv` wire + the
change-guarded client adopt · `ui/panels.portraitDefOf` — the book fold.
Probe: `balance/probe_tells.ts`. The lite tier has no Actor and wears no
tells (a pooled body IS its ply count); promotion mints a real actor and
the def's tells arrive with it.
