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
| `engaged` | a live quarry stands (`aiTargetId` — the lock its reserves test) | 0 / 1 |
| `morale` | routing right now (the break window) | 0 / 1 |
| `fuse` | armed self-detonation, seconds REMAINING | **raw — band required** |
| `stored` | the banked reservoir (Tree-of-Life lane) | **raw — band required** |
| `radiance` | the sky's light (`World.radiance`) | 0..1 |
| `ground:<kind>` | standing on the named ground kind | 0 / 1 |
| `buff:<id>` | a live buff's stacks / its cap (presence for non-stackers) | 0..1 |
| `casting` / `casting:<skillId>` | own REAL bar progress (held channel = 1; **a bluffed bar reads 0 by law**) | 0..1 |
| `feinting` | a bluffed bar in flight (`BehaviorSpec.feint`) | 0 / 1 |
| `foecast` | seconds left on the TARGET's bar (`aiFoeCastSec`, stamped by the AI tick) | **raw — band required** |
| `combo:<ruleId>` | THE HONEST MEASURE — casts struck / casts to close a granted grammar, read off the SAME ring the matcher reads and consume-aware (registered by `data/combos.ts`; worn on a `beatPips` part the pips become a meter — the Scald Basin's metronome kin) | 0..1 |

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
- **`lean`** — SIGNED posture shift along the facing: positive hunkers
  forward with a screen squash (the stalk); negative cants BACKWARD with a
  rise (the reader's back foot, the coiled load). Deepest magnitude wins
  when rows stack; one transform serves both postures.
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

## The commitment sources & THE READABLE-BLUFF LICENSE (the Readers)

The `casting` / `feinting` / `foecast` / `engaged` lanes make INTENT itself
wearable — the mind-layer arc's Readers chip:

- **`casting`** is the wind-up drawn on the body: the mantid headsman's
  overhead edge rises with its own bar (`part` + alpha/scale dials), and
  `casting:<skillId>` filters to ONE skill's bar (the pillbug redoubt's
  plates close across `casting:bulwark_set` while its ordinary strikes
  never flicker the shell).
- **THE FEINT EXCLUSION is structural law**: a bluffed bar
  (`BehaviorSpec.feint` — begun for real, dropped payload-less at the
  beat) reads 0 through `casting` and 1 through `feinting`. The tell
  layer CANNOT bluff — a feint fools readers of the BAR, never readers of
  the BODY. That honesty is what LICENSES common bluffs at all: validate
  + the probe census hold that any `feint.chance > 0.35` anywhere in the
  bestiary must wear a `feinting`-source tell (the mantid duelist's
  guard-side flare), while a rare untold feint (≤ 0.35 — the lash
  maiden) stays a legal signature surprise. Past 0.6 even a told bluff is
  refused (a coin flip forever is a broken metronome, not a lesson).
- **`foecast`** is the read of YOU: `Actor.aiFoeCastSec` is stamped each
  AI tick where the lock is final, through the SAME `castRemaining`
  (engine/brain.ts) every `targetCasting` rule evaluates — the mantid
  augur's back-foot cant and its retreat rule can never disagree about
  what it saw. Unbounded (seconds): band it (`[0, 0.35]` reads full while
  a bar has ≥0.35s left and eases as it closes).
- **`engaged`** is the quiet lock: a fully-reserved body (the mantid
  penitent — its whole kit sits in `skillUse.reserve`) never aggroes
  because it never engages first, but it has absolutely marked you; the
  lock its reserves test IS its honest tension tell.

### The mantid school (the teaching-pairs debut)

Five stances seated in ONE country (the garden's stalkwood + petalfields;
the `molting_ground` landmark assembles the full set inside a ring of
brittle `molt_husk` shed skins), because a discrimination is only learnable
beside its contrast:

- **duelist ↔ headsman** — the readable bluff and the body that CANNOT
  bluff (no feint in its mind by construction; press-anchored plant
  outlasting the bar = the authored punish window).
- **augur ↔ penitent** — ONE trigger (your own cast bar), two OPPOSITE
  answers: the augur leaves the window (`targetCasting` rule → retreat;
  note a rule is EDGE-fired with a hold + re-arm cooldown — a near-zero
  `cooldown` is what makes the leaving continuous), the penitent arrives
  through it (reserves on `targetCasting`/`distUnder` + a dash rule).
- **pillbug redoubt** — the spatial lesson: `bulwark_set` (a real skill —
  the bar IS the closing telegraph) grants the buff that IS the armor,
  a `hasBuff` rule holds the `turtle` kernel, and the skill's own
  cooldown arithmetic is the open-window rhythm between sets.

Probe: `balance/probe_readers.ts` (the census, the divergence, all five
live lessons, the wire, the book).

## THE ACCUMULATOR FAMILY (the leech's law, spread)

Bodies whose meter you can SEE filling toward a payoff — the shared
grammar is **FILL → RELEASE → SLUMP**, and every stage is data
(`ACCUM_CFG` + shared consts in data/monsters.ts; the whole family is
probe-pinned end to end):

- **FILL** — a drive fed by a real mechanic, worn as the identity gauge.
  Every fill has a DENY: the player can starve the meter.
- **RELEASE** — the payoff skill sits in `skills` but is reserved OUT of
  the kit rotation (`skillUse` priority); the brim rule force-casts it,
  shoves the drive empty, and the gauge drains exactly when the bank
  spends. The worn meter is the only warning and the only one needed.
- **THE SPENT SLUMP** — the release's third action applies
  `SPENT_SLUMP_BUFF` (slower, softer, `ACCUM_CFG.slump`) and the shared
  `SPENT_SLUMP` tell row (`buff:spent_slump` → a binary sag) wears the
  window. This is the family's structural answer to the death-spiral: a
  body that grows stronger while winning must OVERCOMMIT at full, so the
  player always holds two live strategies — deny the fill, or BAIT the
  spend and farm the opening.

The five bodies, each in its own voice:

| body | fills by | reads as | counterplay |
| --- | --- | --- | --- |
| `mire_leech` (THE SWELL) | landing hits (`onDealt`) | blood sac | keep range / bait the nova |
| `charnel_glutton` (THE GORGER) | eating corpses (`carrion.drive`, feeds UNDER FIRE via `carrion.combat` — the meal owns its whole attention) | bile paunch + the gorged waddle (slower while fed) | spend/deny the corpses, fight it off its larder — or crack a midden deliberately and walk it away |
| `bloat_mother` (THE BROODER) | her own term clock (`rise`) | pale egg-sac | burst her before term; break the laid pod in its five incubating seconds |
| `cinderback` (THE KINDLER) | YOUR blows (`onHurt` — nothing else) | furnace glow through plate seams | overkill it between vents, kill it at range, or stoke-and-dodge |
| `crag_chorister` (THE CHORUS) | the pack standing together (`rise` + `onKill` shared whole; `onAllyDeath` SAGS every crest) | crest height + hue across the whole pack | kill order — fell one voice and the choir's commitment lapses |

**THE BURST-TELL LAW** (the kindler law over the whole bestiary): a
death-burst is a bomb whose countdown is the bearer's LIFE, so at
registry close every `deathBurst` def derives an under-glow in its
blast's own hue, brightening as life falls (`ACCUM_CFG.burstTell`; the
fold at the foot of data/monsters.ts). `burstTell: false` opts out; a
`TellSpec` there is worn instead. The probe censuses the law — a silent
invisible bomb is no longer authorable by omission.

**The carrion lane** (`MonsterDef.carrion`): `drive: { id, add }` banks
each finished meal into a named drive and keeps the feeder hungry at
full life while the bank is short; `combat: true` lets a wild body keep
feeding under fire (ai.ts calls the same `updateCarrion` from the
engaged path — the meal owns the tick, so the open window is the meal's
price; summoned copies stay obedient and eat on idle).

**The teaching ground**: the `carrion_midden` landmark (pit builder — a
dug hollow, one gap) heaps brittle `carrion_midden` mounds that SPILL
raisable corpses when struck (formations.ts, the shallow grave's law),
seated in gloamwood/mire/crypt beside the glutton — a careless cleave
caters it, a deliberate crack baits it away.

Probe: `balance/probe_tells.ts` rigs 12–17 (the family weave, the buff
source, and all four live loops: gorge → burst, term → laying → hatch,
crest → sag, stoke → vent).

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
