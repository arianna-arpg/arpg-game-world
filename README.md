# ARPG Test Game

A top-down action RPG prototype built around one idea: **every system is open,
modular data**. Classes are starting points, not cages; skills, monsters,
attributes, statuses, and stats are all plain data entries that compose through
a single shared engine — and monsters, minions, and the player all act through
the exact same skill pipeline (`World.useSkill`).

> **For contributors (human or AI):** the counts below reflect what is actually
> in `src/data/` right now, not a roadmap. If you add or remove content, update
> them so this file stays a reliable source of truth.

## Quick start

**Desktop app (the normal way to play):** double-click **Launch Game.bat**
(Windows; installs dependencies on first run), or run `npm run game`. A
launcher window shows the installed version, checks GitHub for updates —
one click pulls, rebuilds, and plays — then opens the game in its own
window, no browser involved. Machine-local preferences (fullscreen, ports,
update policy) go in `launcher.config.local.json`, deep-merged over the
committed `launcher.config.json` defaults.

**Browser dev mode (live reload):**

```
npm install
npm run dev          # then open http://localhost:5173
```

On Windows you can instead double-click **Play Game.bat**. Type-check with
`npx tsc --noEmit` (or `npm run check` to include the launcher); make a
production build with `npm run build` (output in `dist/`); `npm run smoke`
boots the built game headlessly in Electron and asserts it works. Saves land
in `saves/` from both modes — the desktop app and the dev server share them.

**Controls:** WASD move · LMB / RMB / 1–6 use the eight skill slots ·
C character sheet · B skill book · P passive tree · M world map · Esc menu.
Keybinds are rebindable from the Esc menu.

## What's in it

A data-driven build sandbox at real scale. Approximate current content, all
defined under `src/data/` and `src/engine/`:

- **~377 skills** and **~209 support gems.** Skills are *loot*; supports socket
  into them. Each skill picks a delivery — projectile, melee, nova, cone, ground,
  self, summon, dash, aura, construct, storm, beam, leap, blink… — and composes
  typed effects.
- **156 monsters** over **13 AI archetypes** plus fully-scripted bosses, with
  squad tactics (muster, engage tokens, formations), morale, five rarity tiers
  (normal → magic → rare → champion → crowned) and rolled affixes.
- **13 classes**, a **233-node passive tree** (9 keystones, 42 notables) around an
  attribute travel ring, and **5 attributes**. Progression twist: **skill points
  come from sacrificing gems at fonts, not from levelling** (levels grant passive
  points).
- **5 damage types** with conversion, **37 status effects / ailments**, **12
  charge (combo) resources**, and **9 procs**.
- A world that grows: **14 hand-authored zones** plus an **effectively infinite
  procedural world** — 25 tileset recipes, biomes, continents with sea travel,
  and alternate dimensions — over a living map with day/night, drifting weather,
  and faction warfare.
- **17 optional per-run world-event packages** (Warbands, Breach, Demon Invasion,
  Contagion, Conclave, Descent, Migration…), chosen on the Expedition screen and
  unlocked through the account Vault.
- **Permadeath with corpse-run recovery**, an account/Vault meta-layer, saves to
  both disk and localStorage, and **host-authoritative co-op** (local or
  copy-paste WebRTC).

Rendering is HTML5 **Canvas 2D** with deliberate placeholder geometry art — every
visual reads its shape and color from the data. There is no audio yet, and loot
is currently gems only (equipment is a planned extension).

## Architecture — where everything lives

| Layer | Where | What it does |
|---|---|---|
| Stat engine | `src/engine/stats.ts` | Layered modifiers (`flat`→`increased`→`more`→`override`) with tag filters; 5 attributes; stat registry |
| Damage | `src/engine/damage.ts` | One pipeline: roll → added → tag-scaled multipliers → crit → evasion / armor / resists / ward |
| Skills | `src/engine/skills.ts` | The skill *schema*: deliveries + effects, per-level growth, support sockets |
| Statuses | `src/engine/status.ts` | 37 ailments (burn, poison, bleed, chill, freeze, shock, stun, weaken…) |
| Charges | `src/engine/charges.ts` | 12 combo/resource meters (fury, static, rage, souls…) |
| Actors | `src/engine/actor.ts` | ONE entity model for player, monsters, and minions |
| World | `src/engine/world.ts` | `useSkill()` — the single path anyone acts through; projectiles, zones, waves, XP |
| AI | `src/engine/ai.ts`, `src/engine/brain.ts` | Generic brain + 13 archetypes across move / target / perception / skill / morale / squad axes; scripted boss phases |
| Rng | `src/core/rng.ts` | Seeded randomness — one seed reproduces a whole layout |
| Level gen | `src/engine/levelgen.ts` | Doodad terrain + set-piece stamps (cliffs, ravines, rivers, camps…) |
| World gen | `src/engine/worldgen.ts`, `src/world/` | Mints zones behind frontier portals; biomes, continents, dimensions, weather |
| Packages | `src/packages/` | 17 optional per-run world-event overlays |
| Meta | `src/meta/` | Account/Vault unlocks, saves, permadeath + corpse recovery |
| Net | `src/net/` | Host-authoritative co-op (`LocalTransport`, `WebRtcTransport`) |
| Render / UI | `src/render/`, `src/ui/` | Canvas 2D renderer; DOM overlay panels (sheet, skill book, tree, map) |
| Validation | `src/data/validate.ts` | Boot-time content cross-checks (warns on silent authoring mistakes) |
| **Content** | `src/data/*.ts` | `skills` (~377), `supports` (~209), `monsters` (156), `passives` (233 nodes), `classes` (13), `zones` (14), `tilesets` (25), `procs`, `invocations` |

Entry point: `index.html` → `src/main.ts`.

## The core mechanism: tagged modifiers

Every number flows through `StatSheet.get(stat, contextTags)`:

```
value = (base + Σ flat) × (1 + Σ increased) × Π (1 + more)
```

Modifiers can carry tag filters, so `mod('damage', 'increased', 0.4, ['fire'])`
is "40% increased fire damage" — it applies to any skill whose tags include
`fire`, and to nothing else. Attributes, class innates, buffs, statuses, and
passive nodes are all just named bundles of these modifiers added to or
removed from an actor's sheet. This one mechanism is what makes arbitrary
build depth possible without special-case code.

Stat queries also accept **skill-local extra modifiers** — that is how skill
levels and socketed support gems affect only their own skill: a `SkillInstance`
(definition + level + sockets) expands into a modifier list that joins every
stat query made during that skill's use, and nobody else's.

## Progression: skills are LOOT

- **Skill gems drop from monsters** (alongside support gems; bosses drop
  three, gem caches guarantee one). A dropped skill carries a **rarity
  that decides its sockets**: Common 1, Magic 2, Rare 3, Legendary 4 —
  same skill, very different ceiling. Deep zones can drop them pre-leveled.
- **Learning is free but capped at 8** (skill book, `B`): the limit IS the
  build. Unlearning returns the gem to your inventory with its level and
  socketed supports intact — experimentation costs a swap, never progress.
- **Skill points do NOT come from leveling.** They come from **Sacrificial
  Fonts** (one always burns at the Crossroads): feed 3 unwanted skill gems
  → 1 skill point, and a leveled gem refunds every point invested in it.
  Farm skills, burn the chaff, respec without regret. Points level skills
  and support gems.
- **Levels go OVER the cap.** The point cap (10) only gates *spending* —
  a skill's EFFECTIVE level is points + every socketed **+1 to \<tag\>
  Skills** gem, uncapped: perLevel growth keeps compounding, and over-cap
  **THRESHOLDS** unlock (`SkillDef.thresholds`, pure data — Fireball 11
  twins its bloom, Spark 12 learns to arc). Thresholds above the cap are
  reachable only through +level investment; the skill book shows the
  effective level, reached thresholds, and the next one waiting.
- **XP levels** grant 1 **passive point** each (tree, `P`): a PoE-style
  graph — six class-archetype wedges with notables and tradeoff keystones,
  joined by an attribute travel ring. **Raw attributes live on the tree**,
  and attributes gate skills, so pathing across the wheel is how a Sorcerer
  becomes a Summoner.
- **Waypoints**: some zones hold a waystone (the Crossroads always; roughly
  every third generated zone). Touch it once to attune; click it on the
  world map (M) to travel — unless something hostile is within arm's reach.
- The inventory (skill gems + support gems as typed items) is the start of
  a real item system; a town hub with vendor and storage hangs off the
  waypoint network next.

## How to add content (no engine changes needed)

**A skill** — add an entry to `src/data/skills.ts`: pick a *delivery*
(`projectile`, `melee`, `nova`, `cone`, `ground`, `self`, `summon`, `dash`),
attach *effects* (`damage`, `status`, `buff`, `knockback`), set tags (tags
decide which modifiers scale it), optional attribute requirements, an
`ai` hint so monsters can use it too, and optional `leveling.perLevel`
modifiers controlling what each skill level grants. It appears in the skill
book automatically.

**A support gem** — add an entry to `src/data/supports.ts`: tag gate
(`requiresTags`), level-1 modifiers, `perLevel` growth, and a drop weight.
Anything the stat registry knows is fair game (projectile counts, minion
caps, areas, costs, crits, ailment chance...), plus `levelBonus` for
"+X to \<tag\> skills" gems. The catalog carries per-element increased-damage
gems (Searing Heat, Biting Cold, Static Charge, Corrosion) beside MORE
multipliers (Ruthless vs Brutality is the deliberate lesson pair), minion
investment (Vicious/Hardy Brood), and **Meat Shield** — minions take 30%
less and deal 25% less, and fight DEFENSIVELY on a short leash at your
flank (the `minionGuard` stat changes their AI, not just their numbers).

**A passive node** — add to `src/data/passives.ts`: position (polar helpers
provided), links, and an effect payload of attribute grants and/or modifiers.
Keystones are just nodes with bigger, tradeoff-shaped modifier bundles.

**A proc** — register a triggered effect in `src/data/procs.ts` (extra hit,
echoing explosion), then grant its chance from ANY modifier source via the
`proc_<id>` stat: `mod('proc_brutal_strike', 'flat', 0.25, ['melee'])` is
"25% chance for melee hits to trigger Brutal Strike". Procs can come from
supports (Brutal Strikes gem) or passives (Thunderstruck notable) alike,
and are depth-capped so they never trigger each other.

## Mechanic-warping modifiers (how behavior, not just numbers, is data)

A handful of engine-recognized stats let plain modifiers rewrite how a skill
works. Anything can grant them (gem, passive, buff, class innate):

| Stat | What it does | Used by |
|---|---|---|
| `chainCount` | projectiles bounce to un-hit enemies | Chaining gem |
| `aoeShape` | area becomes a square (1) or triangle (2) | Square/Triangle Sigil gems |
| `aoeScatter` | explosions spawn secondary explosions at 50% | Aftershocks gem |
| `proc_*` | chance-based triggered effects on hit | Brutal Strikes gem, Thunderstruck notable |
| `summonCount` | extra minions per cast | Legion Call gem |
| `summonSequence` | extra summons emerge scattered in sequence | Cascading Call gem |
| `minionMaxCount` | flat AND %-more/fewer minion caps | Lord of Legions, Titanic Command, Endless Swarm |
| `minionSize` / `minionMoveSpeed` | minion body & speed scaling | Titanic Command, Endless Swarm |
| `minionExplodeDeath` | minions explode when slain | Martyrdom notable (intrinsic — full lifespan) |
| `minionExplodeLowLife` | minions detonate at low life | Unstable Flesh gem (trades longevity for violence) |
| `stormCount` / `stormImmediate` | extra storm strikes / artillery → instant volley | Cloudburst gem |
| `minionRespawnTime` | persistent minions respawn faster/slower | Soul Tether gem |
| `costToLife` / `costToMana` | converts costs between resources | Blood Price gem |
| `proc_corpsefire` (kill trigger) | corpses erupt on kill | Corpsefire gem |

The Martyrdom / Unstable Flesh pair is the intended design pattern: the
passive variant is intrinsically beneficial, while the support variant gives
a stronger payload but costs the build something (the minion's bottom third
of life). Same for Titanic Command (support, quality) vs Endless Swarm
(passive, quantity).

**A monster** — add an entry to `src/data/monsters.ts`: base stats, innate
modifiers, and a list of skill ids *from the same catalog the player uses*.
Add it to `WAVE_TABLE` to make it spawn. Any monster is also summonable as
a player minion by referencing it from a `summon` delivery.

**A class** — add an entry to `src/data/classes.ts`: attribute spread,
starting skill bar, and a passive-tree `startNode`. Classes are deliberately
thin — any character can later allocate any attribute and bind any skill they
qualify for (Elder Scrolls-style open progression). Innate class modifiers
were removed pending the class balance pass (the optional `innate` fields on
ClassDef are the seam they return through).

**An attribute** — extend `ATTRIBUTES` in `src/engine/stats.ts` with its
per-point modifiers. The character sheet and allocation UI generate from
this registry.

**A status ailment** — add to `STATUS_DEFS` in `src/engine/status.ts`
(DoT type and/or modifiers applied to the victim) and reference it from any
skill's `status` effect.

**A stat** — add to `STAT_DEFS` in `src/engine/stats.ts`; it is instantly
addressable by any modifier in any data file.

## Constructs: totems, sentries, traps, mines, pylons

The `construct` delivery deploys an immobile actor that **casts real catalog
skills with the deployer's build modifiers inherited** (attributes, class,
passives flow into its sheet). All construct kinds ride the minion
infrastructure: per-skill caps, duration (scaled by effectDuration), owner
minion scaling.

- **totem** — targets and casts within its range (Flame Totem). The **Spirit
  Totem support** converts any hit skill into totem form: the totem casts the
  exact instance, gems and all (recursion-guarded so totems can't plant totems).
- **sentry** — invulnerable + untargetable, but fires ONLY along its spawn
  facing; no rotation axis (Ballista Sentry).
- **trap** — arms, then triggers its payload when an enemy comes near (Frost
  Trap → Frost Nova at the trap).
- **mine** — waits for the separate, supportable **Detonate Mines** skill;
  detonations stagger in sequence (Fire Mine → Immolation Blast).
- **pylon** — carries an aura (same spec as aura skills) and periodically
  triggers a skill at enemies in range (Storm Pylon: ally damage aura + Spark).

## Auras / presences

The `aura` delivery attaches an area to a moving bearer — player, monster, or
pylon — affecting allies and/or enemies inside. Two payment modes: `toggle`
(continuous upkeep: mana/sec, %-life/sec drain, or a mana **reservation**) and
`duration` (one-time cost). The spec composes: ally mods, enemy mods, enemy
DPS (optionally fueled by draining the bearer's life), siphon healing, pulses
with a configurable heal base (maxLife / maxMana / lifeRegen), and death-spawns.

| Aura | Mode | Demonstrates |
|---|---|---|
| Righteous Fire | toggle | life drain fuels equal fire DPS in radius |
| Vampiric Presence | duration | enemy DPS fully siphoned back as life |
| Unholy Aura | toggle (mana/s) | enemy slow/weaken; deaths inside rise as your zombies |
| Devotion | toggle (reserves 40 mana) | ally armor + less damage taken |
| Preservation | duration | ally regen + pulse healing 4% max life every 3s |

## Conversion, repeats & impact shapes

**Damage conversion**: generated `convert_<from>_<to>` stats (every pair,
0-100% capped per source) applied in the damage roll — works from supports,
passives, or skill leveling. **Flameforged**: 50% phys→fire, total at max.

**Edge-band AoE**: `edgeOnly` on novas and cones hits only the outer band —
**Shock Nova** (safe eye of the storm) and **Surgical Strike** (only the
tip of the arc cuts), with ring-band flash rendering.

**The repeat queue** powers five supports from one mechanism (`repeatCount`,
`repeatScale`, `repeatRetarget`, `repeatLock`, `unleashMax`):
**Multistrike** (melee ×3, re-aims, locks you), **Spell Echo** (×2, locked),
**Cascade** (one extra play), **Crescendo** (two repeats, each 30% larger —
verified an enemy only the grown repeats could reach), and **Unleash**
(Seals bank every 1.4s while the skill rests — computed from time-since-
last-use — then the cast fires a salvo per Seal).

**Melee impact**: **Reverberation** rings melee hits outward to extra
nearby enemies (chain for blades); **Splintering Impact** splashes every
hit to a small area at half damage (verified exactly 22 → 11).

## Tethers: lines as geometry

A **tether** is a live LINE between two anchors, and the band between them is
a transient field (`TetherSpec` — carried innately by a skill or granted by a
support). Three link modes: **caster** (a spawned object trails the band back
to you — Tripwire's razor line from a trap, Transient Inferno's fire corridor
from a totem or Solar Orb), **network** (objects string to every sibling of
the same skill in reach — Tripwire Web turns five traps into a killing
field), and **target** (a bond to the skill's resolved target — Lifeline
heals every ally standing in the cord; Witchfire Leash withers enemies caught
between). Hostiles crossing a damaging band take typed damage over time with
NO status applied — a bleed that exists only while they touch the wire — in
chunked ticks through the shared typed mitigation. Beam damage is scaled by
your damage stat and runs the **conversion schema** (one exported path now —
hits, beams, and aura DPS all convert), and the band's colour follows its
dominant post-conversion type, so the tell stays honest. Summons tether
exactly like constructs — one vocabulary, both spawn kinds.

Tether bands are **investable** (`tetherDamage` / `tetherWidth` stats — Taut
Wire; width also rides aoeRadius), and **enemies use them too**:
`MonsterDef.tether` arcs an intermittent damaging band between pack members
(Storm Acolytes fight as a circuit — don't stand between them while the
current holds). **Charged Span** strings movement-skill objects together —
a Gate Shift pair becomes a killing line you step through and enemies can't.

## Channels: commitment, not machine guns

Channels **spool up**: the first pulse arrives after the windup (default one
full interval, `channel.windup` to tune), so tapping a channel yields
NOTHING. Ramps take **curves** (`RampSpec`): quadratic starts feeble and
compounds (Infernal Ray — a 1s dabble is ~6% of a 5s commitment's payoff);
exponential doubles per held second. The stance itself is investable:
**Walking Meditation** (`channelMobility`, flat add to the move factor —
immobile starts at 0, so enough investment strolls through your own
maelstrom) and **Weathervane** (`channelTurnRate` — the near-locked beam
learns to track).

## Stealth: charges, cones & the ambush

**Stealth is a charge economy.** The Stealth skill banks 3 charges (cap 5):
while any remain, enemies' detection of you is slashed (×0.35) on top of the
new PERCEPTION model — **sight is a frontal cone** (default 150° at full
range, `MonsterDef.vision` tunes it per monster) with only a short all-around
HEARING radius behind (×0.35), so flanking and backstabs are real tactics.
Each completed OFFENSIVE use spends one charge (movement and utility keep you
hidden; `breaksStealth` overrides either way) — and an UNSEEN strike lands as
an **AMBUSH**: the `ambushBonus` stat (30% MORE baseline, investable —
**Cutthroat** gem, Stealth's own leveling) multiplies in, stacking with
`backstabMult` for the positional art. The struck are ALERTED regardless:
eyes everywhere at boosted range for a while, STALKING toward where the blow
came from — with charges left you're still shrouded, but the second strike
on an alerted victim earns no ambush. A tactical tool, not a cloak of
invincibility.

**Invisibility is exhaustive now**: a 2.5-second true vanish (unseeable,
untargetable — still hittable by stray blasts) that any offensive act
CONSUMES outright. The strike from nowhere is the last act of being nowhere.

## Damage pools: banked violence

`DamagePoolSpec` (PoE2 Plague-Bearer style): the caster BANKS a fraction of
the damage they deal — per hit type (`fromDamage`) and/or per DoT payload
applied (`fromDot`, banked as dps × duration at application, so ignite feeds
1:1 while raw fire trickles at a data-set ratio) — and a pool skill releases
the bank: **Venomous Aura** VENTS it (a toggled leaking ring draining
capped damage per second, scaled by your damage stat), **Detonation**
BURSTS the whole charge at once. Pools key by `id`: skills naming the same
pool share one bank (one eats the other's fuel); distinct ids keep private
banks — sharing is a data decision. Caps ride the `poolCap` stat, and pool
skills GATE: greyed on the bar and unusable until the bank clears `min`.

**Consume combos got smooth.** `requiresStatus` takes any-of lists (**Flash
Freeze** consumes chill OR freeze → a shattering burst and a FIXED 2s
re-freeze via `durationOverride` — unscalable by design), targeted skills
now AUTO-TARGET (nothing near the cursor → the nearest qualified target in
cast range, so Eviscerate/Expunge/Flash Freeze flow without pixel-hunting),
the hotbar GREYS gated skills (no fuel, no afflicted target in reach), and
failure blurbs are rate-limited to one per ~1.4s instead of wallpapering
the screen. Charge costs can be **optional**: Reckoning swings bare-handed
at zero Fury and scales 25% MORE per charge it did consume.

## Gravity, pulls & escalating prices

Zones' suction can now reach past their bite (`pullRadius`) and channels can
declare a **cost ramp** (`costRamp` — the same linear/quadratic/exponential
curve vocabulary as damage ramps, applied to the per-pulse price).
**Event Horizon** is both at once: a channel that grows a small annihilating
disc inside a far wider dragging horizon, whose mana cost compounds
EXPONENTIALLY — greed ends channels. **Repulsor Beacon** is the inverse
pole: a planted pylon whose pulsing waves batter everything away through the
impulse physics. **Chain Pull** is the yank (`pull` skill effect): the catch
is stunned on the hook, dragged to your feet as a REAL impulse — walls
interrupt the trip, and collisions en route roll your collision procs — and
held dazed through the landing. **Pestilent Nova** closes the set: a channel
spraying venom bolts at RANDOM bearings all around you (the D2 homage,
built from AimSpec.random × the projectile channel).

## Beams: the laser vocabulary

Six ways to draw a line of light, each a different composition of existing
primitives — no bespoke beam engine:

- **Sunpiercer** (charge-release): hold to converge the light, release to
  loose the lance. The charge grows the beam's LENGTH, not its width — a
  sliver cone whose range rides the charge's area scale (420 → ~670 at full
  gather) while damage climbs 0.25× → 3.2×. A tap sputters by design.
- **Focusing Ray** (the converging channel): `ChannelSpec.rampArc` is the
  new axis — a NEGATIVE arc ramp squeezes the 56° fan toward a line (engine
  floor ×0.1) while `rampAoe` stretches its reach 280 → 532 and damage
  nearly triples. Aperture down, intensity up; flankers escape the narrowing
  wedge mid-hold. All three ramps share the linear/quadratic/exponential
  curve vocabulary, and negative ramps are floored everywhere (a channel can
  converge, never invert).
- **Static Strike** (the banked storm): melee blows bank `static` charges;
  `DischargeSpec` spends one per beat as a bolt that LEAPS to the nearest
  hostile in reach (faction-stance targeting — it never zaps the neutral),
  HOLDING the charge when nothing's near. The zap renders as a momentary
  zero-damage tether — the beam IS the visual.
- **Serpent Ray** (the bending beam): a 0.09s-interval channel streaming
  pierce-everything bolts on a strong cursor guide — the stream of segments
  bends after your mouse like a lash.
- **Umbral Lance** (the duelist's beam): 0.25s cast, 3° line, 560 reach,
  cheap and quick — fires while you keep walking (`castMove`).
- **Imperious Barrage** (saturation fire): an immobile channel flinging
  beam-bolts with a ±5° contemptuous variance around your aim
  (AimSpec.random re-rolled per pulse).

## Covenants: the recall, the debt & the rhythm

**Convocation** calls the host home: every mobile minion blinks to a ring at
your side and mends ~3% of its life over 2 seconds — built from one new
effect (`recallMinions`) and one new ROUTING on the existing buff effect
(`affects: 'minions'`, the generic minion-war-cry seam). The always-on
investment layer is the `minionRegen`/`minionRegenPct` stat family, queried
with the summon skill's tags like every minion stat — so "skeletons heal,
Revive minions don't" is a socket choice (**Vital Bond**) or a tag filter,
never code. **Transfusion Bond** trades 25% of an army's teeth for fierce
mending.

**Overdrive** is the debt economy — an inverted energy shield. **Overclock**
(toggle): when mana hits zero you KEEP CASTING; each unaffordable cast
OVERDRAFTS its cost into reservation. Repayment melts the debt only after a
breather (2.5s without an overdraft — every overdraft resets the wait), and
the toggle is LOCKED ON until the pool is whole: "I need this boost NOW"
with a bill that always comes due. **Blood Mortgage** is the life lane —
unpayable blood prices borrow the TOP of your pool (your ceiling drops, it
can never kill you) and metabolize back through life regeneration, faster
the quicker you swing. **Controlled Burn** flips the rhythm: the debt
trickles even while you cast, at 35% rate, and even your breathers repay
slower. Debt caps, idle delays, repayment rates and flow are all stats with
the spec as their base — passives and thresholds crank every knob.

**The proc registry grew a trigger**: `statusApply` (filtered by status id)
plus two new payloads, `gainCharge` and `buff` — so **Bloodletter's Rhythm**
(applying a bleed banks a Fury charge) is one registry entry and one gem,
and any status→any charge/buff is pure data. **Metronome** builds TEMPO on
every landed hit (+4% attack/cast speed × 8 stacks) and ONE hit taken wipes
the spin (`clearOnHit` — absorbed hits count, DoTs don't). **Remnant
Conduit** sheds an elemental remnant a step away on real casts — collect it
to empower the next cast of that school: cast, step, cast. **Colossus
Stance** rides two new CONDITIONS (`stationary`/`moving`): plant your feet
0.6s and hit 28% harder over a wider area; swing on the move and hit 10%
less. En route, a pre-existing hole was closed: collision procs no longer
roll on ordinary hits.

## The sweep, the contract, the horde & the tithe

**Sweeps** answered the batch-defining question — "can we compose practically
anything?" — with *almost*: travel (drift), lifetime (linger × duration),
swelling, cascades and figures all existed; the vocabulary was silent only on
a DIRECTIONAL zone shape and on surface-vs-field semantics. Both landed as
registry extensions: `AOE_SHAPE` gained **crescent** (the third entry that
proves it's a registry), and zones gained **hitOnce** (a moving HIT SURFACE —
damage per crossing, exactly once — where zones were always fields of damage
per second). **Reap** is the native scythe-wave; **Sweeping Blow** converts
ANY melee cone into a traveling crescent built from its own geometry (the
firing-styles precedent applied to melee); **Whirling Reap** is pure
pre-existing composition (an aim-sequence figure) — and socketing Sweeping
Blow into it yields a six-way radial wave burst nobody wrote.

**Summon contracts got toggled** (PoE2 Spirit style): `persistent.toggle`
prices reserve × effective SLOTS at toggle-ON and HOLDS it across every
death — dead golems' mana stays locked while their (per-skill) respawn
timers run, reconciled declaratively so a contract can never be lost to a
bad moment. Recast dismisses and refunds; golem pools are radio-buttons;
minion-count investment scales both the bill and the crew. A universal
**leash recall** teleports stuck or hopelessly-distant minions home
(`noRecall` opts out — bombardment ordnance is spent where it lands).

**The horde skills**: Summon Raging Spirit (5s screaming skulls, cap 20 —
a race only cast-speed investment wins) and its channel twin **Spirit Pyre**
(pulse-minted spirits whose damage RAMPS quadratically with the hold —
channel ramps now flow into newborn minions); **Summon Wraith** (no clock,
a CURVE: exponential unmitigable decay that minion-life investment stretches
logarithmically, never to permanence); **Infernal Bombardment** (four
cursor-tracking waves of paired demon bombers that rush and detonate — built
almost entirely from the existing trickle queue, bomber brain, and blast
flags).

**The tithe**: costs became a damage axis. What a press ACTUALLY PAYS now
travels with the cast (`paidCost` — echoes, totems and constructs pay
nothing and earn nothing), and the `costDamage` stats convert it to flat
damage of the skill's own types, through conversion, on every delivery.
**Mana Feeder** makes any skill cost more and hit harder per point paid —
cost multipliers become damage multipliers, if you can sustain the appetite;
**Archon Lance** tithes 6% of your maximum mana per cast and returns every
point as lightning (pool-stacking is the build); **Sanguine Burst** opens
your own veins. En route the batch fixed two latent engine bugs: the lost
golem-contract on a failed respawn (now retried, never dropped) and trail
zones ignoring their projectile's damage multiplier.

## Echoes: mirages, ancestors & the shadow clone

One primitive — the **ECHO RIDER**, a ghost wearing your silhouette that
casts a skill — carries a whole family (`EchoRiderSpec`, construct kind
`echo`; skills declare riders, supports GRAFT them onto whatever they're
socketed into, which then re-casts the HOST instance, sockets and all):

- **Mirage Archer** (skill): a hovering copy of you trailing at your
  shoulder for 12s, firing spectral arrows at nearby prey on its own FIXED
  clock — echo cadence never scales with your attack speed, so the mirage
  SHRINKS as your own throughput grows (the anti-mandatory inversion of the
  PoE original). Thresholds: a keener clock at 8, a second archer at 11.
- **Phantasmal Echo** (support): each completed real use binds a 5s sentry
  mirage re-casting the supported skill at 45% power (× the investable
  `mirageDamage` stat) — stop casting and it fades. Repeats and channel
  pulses never mint riders; riders never mint riders (the Spirit-Totem
  recursion guard); refresh tops up the SAME ghost, so its cooldown map is
  never laundered. Socketed INTO Mirage Archer, the gem's +1 `mirageCount`
  simply raises the archer cap: TWO archers, zero special-casing.
- **Ancestral Call** (support, melee): each swing launches a half-second
  ancestor-ghost gliding at nearby prey to swing ONCE and fade. Reach is
  literally glide speed × lifespan — beyond ~150u it dies mid-glide (the
  WHIFF is the balance valve), and effect-duration investment converts
  whiffs into midrange, hard-capped so melee never becomes artillery.
- **Shadow Clone** (skill): the ninja substitution — you smoke-step back,
  the shadow holds your ground, targetable and killable, and for 8s it
  MIRRORS your strikes from where it stands at 35% power on a throttled
  beat (heavy deliberate blows echo every time; machine-gun spam and
  channel beams get SAMPLED — your cadence is its ceiling, so it does
  NOTHING unless you act). **Vessel of Shadow** converts it outright into
  a real minion-scaled doppelganger with its own knife kit (echoing
  nothing — the two scaling systems never stack), and **Synchronicity**
  quickens any echo's clock.

Echoes scale with the PLAYER's build (inherited sources + `mirageDamage`),
never the minion family — echoes are you; minions are them. Their power
factor cuts damage AND status potency (or the baseline-ignite floor would
hand a nerfed ghost full-strength ailments), they hold fire while you're
stealthed (a shroud with a turret in it would gut the stealth economy),
and a mirage has no flesh for Martyrdom to detonate. En route, two latent
engine gaps got fixed: construct-fired guided projectiles now genuinely
chase their OWNER's cursor (Hell Rift's documented behavior, previously
shadowed by an unconditional aim stamp), and projectiles now CARRY their
launch damage multiplier — charge releases, channel ramps, Multistrike
trains and clone echoes all actually scale projectile skills at last.

## Totems pay for their planting

**Spirit Totem got its detriment**: planting now runs a REAL, visible,
interruptible cast bar — the spell's own cast time × the `totemPlaceTime`
stat (base DOUBLE; investable down; instants still pay a 0.3s minimum).
The totem then casts on its OWN clock: `constructCastRate` scales every
construct's casting interval (Spirit Totem's leveling now feeds it), so
"totem cast speed" is a build axis distinct from your own hands.

Two long-missing gems joined the pool: **Pinpoint** (one FEWER projectile —
floored at one, the volley never empties — for 35% MORE damage and faster
flight) and **Alacrity** (the cooldown-recovery support; attack/cast speed
had gems, the clock didn't until now).

The +level gems are now **Added Levels to \<tag\> Skills** — `levelBonusPer`
scales the grant with the gem's own level (+1 at gem level 1, +2 at 5), so
the name stays honest as it grows.

## Ground cascades: the slam family

A ground placement can CASCADE (`GroundCascadeSpec` — innate, support-
grafted, or purely stat-granted via `aoeCascade`, with `cascadeStep` scaling
the reach): displaced repeats rippling out from the impact. Directions:
**axis** (one beyond your mark, one short — **Spell Cascade**, 25% less
area: the storm walks), **forward** (**Seismic March** teaches any ground
skill the Sunder walk), backward, or **random** (**Scattered Cascade** —
chaos theory, weaponized). Each step scales radius (`scaleStep`) and decays
damage (`dmgStep` — the built-in balance valve: the epicenter is the real
hit), and `interval` staggers the ripples onto a beat riding the zones'
ordinary telegraph delays. Spatial cascades COMPOSE with temporal repeats —
a Crescendo'd, Cascaded Storm Call cascades per echo — and **Resounding
Echo** is the counterpoint gem: ONE repeat, 35% larger, for builds that
want a great answer instead of a chorus.

The skills: **Sunder** (the skipped stone — three shocks marching forward,
each a beat later, a step farther, a shade smaller) and **Upheaval** (zones
can now `grow` as well as drift — a slow churn of broken earth that rolls
forward and swells from a pothole into a landslide).

## Aim transforms: random sectors & played figures

`AimSpec` decides how a use picks its strike bearing — carried by a skill
(identity) or grafted by a support (the same payload pattern as tethers and
+level gems). **`random`**: each use lashes out inside a SECTOR locked to the
cast aim — `offsetDeg` centers it (ahead, aside, behind), `spreadDeg` is its
width, and the `randomArc` stat scales it (**Wild Abandon** rounds a flurry
toward a full circle; **Measured Blade** disciplines it into a tight fan for
20% MORE). **`sequence`**: the skill PLAYS ITSELF — per-step bearings on a
beat (÷ attack speed), baked at cast time so the figure holds while you
whirl. Multistrike repeats re-enter fresh and replay the WHOLE figure.

The Swashbuckler wears both: **Wild Strike** (channel: rapier slivers at
random bearings across a 240° arc while you keep moving) and **Buckler
Strike** (the double cut — one flank, a beat, the answering flank — and a
MOBILE attack: its cast bar slows you to 35% instead of rooting).
**Alternating Strikes** grafts the figure onto any melee skill.

**Casts can move now too**: `SkillDef.castMove` sets a movement factor for
the cast bar (0 = rooted default), and the `castMobility` stat adds to it —
**Fleetfoot Casting** teaches any rooted cast to walk, and passives can
push further.

## Knockback is physics now

Pushes are **impulses on a decaying velocity**: overlapping blasts ADD, so
repeated pulses batter a target around, opposing blasts cancel, and
everything eases out like it has mass (a lone push still travels ~its
strength, so existing data keeps its reach). `mode: 'buffet'` on any
knockback effect shoves in a RANDOM direction — **Gale** raises a wide storm
that batters everything inside it going nowhere good, where Tempest's small
repeated shoves stagger enemies off you without ejecting them from the ring.
**Turbulence** converts any skill's knockbacks to buffeting (the knockBuffet
stat). Anchored things (dummies, spawners, townsfolk) still refuse to move —
rooted is rooted.

## Status identity: stacking policies

Each ailment declares HOW re-application behaves (`StatusDef`):
**stacking** ailments (poison 8, bleed 5, chill 5) add stacks up to an
INVESTABLE cap — the applier's `ailmentStacks` stat raises it (Suppuration
support; tag-filterable per family like potency; chill's freeze-buildup
threshold moves with it). **strongest-wins** ailments (ignite) only take a
new application if it's STRONGER — it then seizes dps *and* timer, while
weaker hits fizzle against what already burns. Default is refresh. Armed
(rupture-bearing) statuses override everything with the fixed fuse.

## Ailment procs: chance-to-X as stats

Every status has a generated **`apply_<status>` chance stat** — so "chance to
bleed / ignite / poison / chill / shock / stun / freeze on hit" is grantable
from ANY modifier source (the Chance-to-X support gems, passives, future
affixes), and `statusChance` (Ailment Chance) adds to every roll.
**Element-agnostic by design**: the DoT feeds on the HIT's damage through the
status's canonical `hitMagnitude` — Chance to Ignite on a physical Cleave
burns off the physical hit; no fire damage required. Each DoT also declares a
level-scaled **baseline** (`baselineStatusDps`): the FLOOR under feeble hits,
and the strength caster-less sources (ground effects, zone modifiers) apply
directly. **Potency** (`statusMagnitude`) is the crank: it multiplies every
ailment you apply — hit-fed and baseline, skill-native and chance-granted
alike — so investment double-dips exactly where you'd hope. Chance to Freeze
skips the chill buildup outright (rare, priced accordingly); Chance to Chill
feeds the same buildup as any chill.

Potency queries carry the ailment's DAMAGE-TYPE tag, so tag-filtered
investment works: **Conflagrant** is 35% *MORE* fire-ailment magnitude —
one family, multiplied past every increase — and the same shape works from
passives and affixes ("more" and "increased" both, like everywhere else).

**Armed statuses run a FIXED FUSE**: once a rupture payload is banked
(Powderkeg, Malpractice), re-application never postpones the blast — the
timer set when the keg was armed runs down no matter how often the victim
is re-struck, and every fresh payload ADDS fuel instead. Hitting hard and
hitting often both pump the keg; the detonation always arrives on schedule.

## DoTs, curses & blessings

**Statuses grew three axes**: `propagateOnDeath` (Contagion's rot leaps to the
victim's nearby allies on death, chaining forever — the **Virulence** support
grafts this onto any DoT), **ruptures** (baked at application: **Malpractice**
detonates a DoT's total damage when it expires, **Malfeasance** does the same
for curses using the curse's latent damage roll), and `interruptChance`
(**Befuddlement**: cursed enemies fumble ~35% of their casts, stunning
themselves — a curse that interrupts).

**Curses** are area-cast debuff statuses (Despair: -25% all res; Agony: -60%
armor; Indecision: -30% cast speed; Befuddlement) with a support ecosystem:
**Hex Blast** (the cursed ground detonates after 0.9s), **No Man's Land**
(areas leave lingering damage fields), **Hedonism** (cursed targets gain
haste, but the curse may afflict YOUR allies too).

**Blessings** are the inverse — ally-only nova statuses (**Belligerence**:
+45% detection range, now a real stat; **Furor**: +20% move/attack/cast
speed) that also exist as minion support gems, plus **Undying Loyalty**:
slain minions fire their death effects (Martyrdom included) and then fight
on for 3 more seconds.

**Projectile impact behaviors**: `forks` (split in two on impact, children
inherit the trajectory — spirals fork into spirals), `returns: 'origin' |
'caster'` (spent projectiles fly home, re-hitting everything; **Returning**
and **Boomerang** supports). **Snipe** shows perfect-cast + pierce-all
composition; **Essence Drain** is the dedicated chaos-DoT projectile.

## Casting system

Skills now resolve when their **cast bar** completes (drawn above the
caster's head — enemy casts telegraph too). Cast time = `useTime` divided by
attack/cast speed; **0 = instant** (all movement skills). Cooldowns are
separate and start at resolution. `channel` and `instant` are tags, so
modifiers and supports can filter on cast type.

`castMode` on a skill selects the behavior:

| Mode | Behavior | Demo |
|---|---|---|
| `cast` | resolve at bar end | everything classic |
| `channel` | held: pulses on an interval, paying per pulse; `move: normal/slowed/immobile`, optional `turnRate` cap, `ramp`/`rampAoe` growth, `cooldownOnEnd` | Whirlwind (move at 70%), Frost Storm (immobile, +150% ramp), Infernal Ray (slow turn, grows), Meteoric Bombardment (held meteors, cd on end) |
| `charge` | hold to power up (cap × effectDuration), release to unleash scaled damage/area | Lightning Blast (0.5×→2.4×) |
| `perfect` | press again inside the golden end-window: +70% | Perfect Strike |
| `timed` | press exactly on a randomly placed indicator: +120% | Timed Strike |
| `multitude` | every press during the bar adds a full hit (cap 15) | Infinite Slashes |

## Movement & stealth

New deliveries: **blink** (instant, `delay`-telegraphed Warp, or
`behindTarget` Shadow Step via the targeting engine), **dash** extensions
(`decoyDuration` leaves a taunting mirage; slow+long+wide = a forced Charge
you cannot steer out of), **mark** (stateful: first use marks, the skill
becomes Recall, recalling re-arms it — per-instance `state`), and two new
construct kinds: **pad** (propels the owner along its facing when stepped
on) and **gate** (cast twice to anchor a linked portal pair; step in one,
emerge from the other, brief anti-ping-pong lockout).

**Stealth model**: enemies now have a finite detection range (700). The
`detectability` stat scales the range at which YOU are noticed (Cloak:
65% reduction), and `invisible > 0` removes you from deliberate target
selection entirely while staying geometrically hittable (Invisibility).
Decoys carry the `taunt` flag — enemies prefer taunting actors over any
other target. Corpse Shift consumes a corpse to teleport to it; the
**Soulwalk** support lets corpse skills target a living minion harmlessly
as a fallback.

Skills: Dash, Charge, Warp, Teleport, Shadow Step, Cloak, Invisibility,
Decoy, Corpse Shift, Temporal Pad, Gate Shift, Mark/Recall.

## Corpses, targeting & combos

**Corpses**: slain enemies leave an ephemeral remnant (~6s) carrying their
monster type, level, and max life. **The targeting engine** (`targeting` on a
skill) restricts a skill to a resolved target — `enemy | corpse | minion |
ally` — optionally gated by a status (`requiresStatus`), consuming the corpse
or the status, with `fallback: 'self'`, life drains, and corpse-life damage
bonuses. Targeting resolves BEFORE costs: no valid target, no cast, no cost.

| Skill | Targeting demonstrated |
|---|---|
| Corpse Explosion | corpse-gated nova at the corpse, +15% of its max life as damage, consumes it |
| Dark Pact | targets a minion (drains 8% of its life), falls back to centering on you |
| Bloodlet → Eviscerate | nova hitting EVERYTHING incl. you (bleed only) → bleed-gated strike that consumes the bleed and deals its remaining damage instantly |
| Venom Bolt → Expunge | poison-gated strike + lingering cloud that poisons others, seeding chain Expunges |
| Raise Spectre | corpse-gated summon: a PERMANENT allied copy of the slain monster (cap 2) |
| Revive | corpse-gated summon: short-lived copy (15s, cap 6) |
| Sacrificial Rites (support) | corpse skills may kill your own minion for a corpse — a real death, so Martyrdom combos |

**Charges** (combo resources): the `gainCharge` effect banks named counters;
`chargeCost` on a skill requires and consumes them (`amount: N | 'all'`),
with `damagePerCharge` as a more-multiplier per charge consumed. Demo:
Frenzy banks Fury (max 5) → Reckoning consumes all of it at +25% more
damage each.

**Shared summon pools**: `poolGroup` on a summon makes its cap span every
skill in the group — Fire/Ice/Blood Golems share one 'golem' slot, so
summoning a different golem replaces the current one (cap raisable via
minionMaxCount modifiers).

## Projectile form & flight

Projectiles have four independent, data-or-modifier-driven axes:

- **Size** — delivery `radius` × the `projectileSize` stat (Colossal: huge,
  slow, harder; Volley: +2 tiny ones).
- **Shape** — `shape: circle | square | line | triangle | octagon` (visual
  form; collision stays radius-based). Hammer of Judgment tumbles a square;
  Spectral Helix throws a line blade; Frozen Orb is an octagon.
- **Speed** — delivery `speed` × the `projectileSpeed` stat (Swiftness gem).
- **Trajectory** — six COMPOSABLE ATTRIBUTE AXES, each an ordinary stat.
  A skill's innate trajectory is the stat query's *base*, so flat modifiers
  create an axis from nothing, increased/more sharpen an innate one, and
  negative more DAMPENS it. Anything can grant them — support, passive,
  future affix — and every axis stacks with every other:

| Axis (stat) | Behavior | Innate demo | Support |
|---|---|---|---|
| `erraticPower` | random steering jitter (rad/s) | Spark, Cinder Swarm | Unstable Flight |
| `homingPower` | steers toward enemies; turn rate, so low levels drift loosely and high levels are surefire | — | Seeker (perLevel sharpens) |
| `spiralPower` | revolve around the cast point, radius growing with flight speed | — | Vortex |
| `orbitPower` | revolve TETHERED to the caster at held radius | Hammer of Judgment | Tethered Orbit |
| `spinPower` | spin around the flight axis (a tight epicycle) | — | Gyre |
| `weavePower` | figure-eight weave along the travel line | Spectral Helix | Sidewinder |

**Composition IS the feature** (one integrator, `advanceProjectile`):
Spark + **Trueflight** (negative-more on the deviation axes) straightens the
erratic bolts toward true; Vortex + Unstable Flight is a spiral that wobbles;
Tethered Orbit + Vortex is an orbit that slowly widens (Hammer of Judgment is
authored as exactly `orbit + spiral`); Tethered Orbit + Sidewinder loops
figure-eights around your ring; Seeker + Gyre drifts a spinning blade onto
its prey. Skill leveling and supports scale the axes like any other stat.

Impact composes too: **Shrapnel** (`projShrapnel`) makes any projectile
SHATTER on first impact into a shard fan — stacking with a skill's innate
shatter, so Ice Spear just throws more knives — and **Fulminate**
(`projHitDetonate` + pierce) makes explosive payloads detonate on EVERY hit
they survive: a piercing Fireball is a chain of explosions marching downrange.

**The cursor is a combat surface.** `origin: 'cursor'` on a projectile
delivery (or the `castAtCursor` stat — **Displaced Conjuring**) materializes
the volley AT the aim point, clamped to `originRange` and slid out of walls
(**Cold Spot**: the air itself turns hostile at your mark). The **guide
axis** (`guidePower`, seventh trajectory attribute — **Puppet Strings**)
steers missiles toward the caster's LIVE aim point every frame: **Arcane
Missiles** channels a swarm you drag across the field, and construct-fired
projectiles follow their OWNER's cursor — **Hell Rift** tears a portal at
your mark that spews riftfire chasers you point at what should burn. It
composes like every axis: guide + erratic wanders after the cursor, guide +
spin drills toward it.

**Firing styles** are a projectile primitive (`fire` on the delivery,
stat-convertible): **fan** (the classic cone — its angle now rides the
`spreadAngle` stat: Choked Spread halves it for 10% MORE), **salvo**
(**Barrage**: the cast bar is the windup — a canceled bar fires nothing, a
resolved one commits the burst — then shots pour out one per beat, each
re-aimed at your LIVE cursor; attack speed quickens the cycle, and added
projectiles add shots), and **volley** (**Firing Line**: the firing squad —
side-by-side ranks on the perpendicular, all flying parallel, never
converging on one skull; rank gaps ride the `volleySpacing` stat — Close
Order tightens the wall). **Rattling Salvo** converts any projectile skill
to the gatling at 35% less damage per shot — not a bigger hit, MORE hits,
each rolling its own ailments and procs: a hose, not a hammer. The styles
compose with cursor origins (a salvo from your mark is a turret; a volley
at the mark is a remote firing squad).

**Paths detonate** (`ProjTrailSpec`, skill-innate or support-grafted):
every stretch of flight drops an immediate BLAST (**Detonating Passage**)
and/or lingering burning ground (**Scorched Wake**) — steer a guided
missile in a curve and it writes an arc of ruin, the Bone-Spear-unique
fantasy as two socketables.

**Children have inheritance rules** — three tiers. Chain legs and returns are
the SAME missile (everything persists); forks are true copies (a Seeker'd
spiral forks into two seeking spirals); spawned children (shatter shards,
emitted projectiles) are their own skills that read only your GLOBAL modifiers
— unless **Lineage** (`projInherit`, or `shatter.inherit`/`emit.inherit` in
skill data) passes down a fraction of the parent's resolved flight: a seeking
spear rakes seeking shards. **Cascade of Knives** (`projReShatter`) re-arms a
spent shatter on every chain leg and lets forks split with theirs unspent.
A generation cap (depth 2) keeps globally-granted shrapnel from recursing
shards-of-shards into infinity.

Two more projectile primitives: `rehit` (the projectile never dies on impact
and may strike the same target again after a delay — orbiting hammers), and
`emit` (the projectile periodically casts another projectile skill from its
position — Frozen Orb shedding rotating Frostbolts). Orb of Storms shows the
alternative composition: an "orb" built as a pylon construct that zaps
erratic Sparks at enemies in its radius.

## Lifecycle, randomness & resource infrastructure

- **Counts can be ranges**: any delivery count may be `[min, max]`, rolled per
  use; count stats (projectileCount, stormCount) shift *both* bounds. Spark
  fires 2-4; with Splitting, 3-5.
- **Weighted summon pools**: `pool: [{id, weight}]` re-rolls per spawn — Raise
  Dead answers with a skeleton or a zombie, 50/50.
- **Storm delivery**: strikes scattered around the cast point, landing in
  sequence (`interval`) or all at once (`interval: 0` or the Cloudburst gem).
- **Minion lifecycles**: permanent until killed, duration-based (`duration`,
  scaled by effectDuration — Lingering Potency extends, Ephemeral shortens),
  persistent (`persistent: {reserve, respawnTime}` — reserves max mana while
  the contract lives, respawns on a timer scaled by `minionRespawnTime`), or
  combinations. Minions can be `invulnerable` and/or `untargetable` (Spirit
  Wisp is both: enemies can't even target it; it simply expires).
- **Trigger axes**: procs declare `trigger: 'hit' | 'kill'` (Brutal Strikes
  on hit, Corpsefire on kill).
- **Generic costs**: skills may cost mana and/or life natively; `costToLife` /
  `costToMana` stats convert between them (Blood Price pays everything in
  blood). The reservation amount itself runs through `manaCost`, so Efficiency
  cheapens golem contracts.

## The world: zones, terrain & travel

The single arena grew into a **connected world** (`src/data/zones.ts`).
A zone is data: size, terrain palette, a layout of set-piece stamps, a
monster pack table, an objective, and exits — and the zone graph IS the
difficulty curve, because monsters take their level from the zone.

- **Packs** seed on entry (one type per pack, placed beyond detection
  range so you find them rather than receive them). Static zones
  regenerate per visit, PoE-style — farmable, never permanently empty.
- **Portals** sit at zone edges; stepping onto one carries you and your
  mobile minions through (constructs stay planted, Mark runes clear).
- **Bosses** live deep in their zones: the **Gravecaller** (a necromancer
  who raises skeletons through the same summon pipeline you use) guards
  the Forsaken Graveyard, the **Pit Lord** his lair. Bosses drop two gems.
- **The world map (M)** renders the zone graph: discovered zones by name
  and accent color, `???` nodes at the end of dashed roads, and `?` stubs
  marking uncharted frontiers.

Hand-authored core (8 zones): Wayfarer's Crossroads (1) → Withered Fields
(2) → Shaded Thicket (3) → Ember Wastes (5) → Pit Lord's Lair (7, boss),
with Forsaken Graveyard (4, boss) → Frozen Approach (6) branching north
and The Pit (endless waves) hanging south of the Crossroads.

## Lastlight: the town

The run begins in **Lastlight**, a SANCTUARY zone: nothing spawns,
nothing seals, the waypoint starts attuned (you know the way home), and
the sacrificial font always burns. The road east leads to the
Crossroads and the war.

The town is built from **STRUCTURE BLUEPRINTS** (`data/structures.ts`):
buildings as data — wall strips with door gaps, props (forge fires,
anvil stones), destructible clutter (barrels and crates that pop
resource orbs), and friendly NPCs (Brandt the Smith, Mireille the
Innkeep — invulnerable scenery today, vendors and questgivers
tomorrow). The same vocabulary that makes a cottage makes the smithy
and the inn; fortresses, castles, faction halls, and ruins are future
data entries on the same system. The town places its structures as
FIXTURES (exact coordinates, fixed seed — home keeps its shape);
generated zones can roll structures randomly (deepwood wayside camps).

The flora grew too: **trees** (block movement and shots, canopy-and-
trunk rendering), **brush** (walkable cover that CONCEALS you — half
detectability while you stand in it), **grass** (tufts and splotches),
and **campfires** (flickering warm light). The Shaded Thicket and the
deepwood are actual forests now. All of it is biome-keyed through zone
themes and tileset layouts — the intended growth path is biomes →
sub-biomes → events, weather fronts, and faction structures, all
hanging off the same stamp/blueprint/theme vocabulary.

## Commerce, chests & faction wars

- **Brandt vends**: stand at the forge and the Skill Gems tab grows his
  counter — four rolled skill gems per town visit, one skill point each.
  (Skill points are the placeholder currency; coinage, crafting bases,
  and affix rerolls are the planned growth of that counter.)
- **Chests**: gated zones (boss / spawners / finite waves) usually hide
  an OBJECTIVE CHEST that unseals with the zone; the wilds hide TIMED
  chests you unlock by holding the ground beside them — back off and
  the lock re-sets. A quarter of timed chests were never chests at all:
  the **MIMIC** springs, fights like it's making up for the wait, and
  only its death pays out.
- **FACTION DIPLOMACY**: six factions — the Goblin Warband (goblins,
  orcs, trolls), the Risen Host, the Gnoll Packs, the Unbound Elements,
  the Sylvan Court, and the Wilds — wired through a relations matrix
  (`FACTION_RELATIONS` in `src/data/monsters.ts`): hostile pairs tear
  into each other WHEREVER they share ground (no war-zone flag needed),
  allies never harm each other, neutrals only mind the player. Gnolls
  run with the warband and burn the groves; everything living hates the
  dead; elementals keep the old kinships with the sylvan and the wild.
  War zones now draw their brawling pair from ANY hostile pairing, and
  KILL CREDIT is real: xp and loot only flow when your side lands the
  kill, so you wade in for full pay or let them thin each other and rob
  the victors. Corpses drop either way; necromancy isn't picky.
- Props behave: barrels and crates no longer stalk you across the map
  (the moveSpeed stat floor had them creeping at 30); they hold still,
  stay shovable, and pop resource orbs when smashed. Spawners and
  townsfolk are properly rooted.

## Procedural generation: the primitives

**Seeded Rng** (`src/core/rng.ts`): every layout draws from one mulberry32
stream, so a single seed number IS a level. Static zones roll a fresh seed
per visit; generated zones store theirs — the place you discovered keeps
its shape when you come back.

**Doodads** (`src/engine/levelgen.ts`): terrain is typed circles, and the
kind decides the physics —

| Kind | Movement | Projectiles | Effect underfoot |
|---|---|---|---|
| `rock` / `cliff` | blocks | blocks | — |
| `wall` | blocks | blocks | camp palisades (storming a camp is real) |
| `chasm` | blocks | **passes** | you can shoot across what you can't walk |
| `bridge` | — | — | negates chasm AND water beneath: the dry span |
| `mud` | free | free | **Mired** (-40% move) |
| `swamp` | free | free | **Sodden** (-55% move, -15% action speed — the trudge) |
| `bog` | free | free | **Bogged** (-45% move) + poison injected on ENTRY |
| `water` | free | free | **Wading** (-30%) shallow / **Swimming** (-60%, -evasion) deep |
| `ice` | free | free | **Slippery**: traction stolen — you slide |

**Terrain effects ARE statuses** — the ground refreshes them while you
stand in it, and the short durations are the linger when you step off
(ice keeps you sliding for a beat; swamps stay sticky). They show as pips,
scale through the stat engine, and anything else can apply them: a
"slippery" curse skill is one data entry away. Slipperiness itself rides a
real **`traction` stat** — below 1, input only steers your momentum
(`Actor.vel`), and releasing the keys lets the ice carry you. Monsters
slide and trudge by the exact same rules.

Collision is one mechanism: `clampPos` radially slides every displacement
(walking, dashes, knockback, spawns) out of blocking terrain, iterating so
blob edges resolve cleanly. Blinks whose destination clears the far edge
cross a chasm; walks and dashes slide along it. Bridges punch walkable,
dry holes through both chasms and rivers.

**Set-piece stamps**: layouts are lists of stamps — `rocks` scatter,
`cliff` runs (a wandering walk depositing overlapping circles), `mud` /
`swamp` / `bog` / `ice` patches, `water` lakes and ponds, `river` (a
winding channel cut across the map with 1-2 marked **fords** — shallow
stretches that stay wading-depth), `chasm` lakes, `ravine` (chasm strip
spanned by plank bridges), `ruin` rings, and `camp` — a walled palisade
with gate gaps whose yard is a POI and whose center gets a posted guard
pack. POI centers are where spawner objects, gem caches, shrines and
altars nest.

**Shrines & altars** (`src/data/shrines.ts`): a SHRINE is activatable —
first touch drinks a timed buff (Swiftness, Wrath, Stoneskin, the Barrage,
Renewal) and the shrine goes dark. An ALTAR is a standing field whose
modifiers hit EVERYONE inside the radius — you, your minions, and the
things hunting you (Wrath: everyone hits harder AND takes more; Haste;
Bulwark; Blood: leech for all, regen for none) — so fights bend around
where the altar stands. Both are pure modifier bundles.

## Objectives: how a zone plays

Every zone declares an `objective`; sealed portals (every exit but the one
you entered through) hold until it's met, and meeting it pays an XP bounty.

| Kind | The deal | Locks exits? |
|---|---|---|
| `clear` | kill every seeded pack | no — fleeing is legal |
| `waves` | survive N waves (0 = endless: The Pit) | finite: yes |
| `escape` | enemies trickle in forever; REACHING an exit is the win | never |
| `spawners` | destructible spawner objects; destroy them all | yes |
| `boss` | slay the named boss | yes |

**Spawner objects are monsters**: a Bone Altar is a stationary bestiary
entry whose only skill is a weighted-pool summon — it spawns guards
through the exact pipeline players summon with, dies a real death (xp,
drops, corpse — yes, Raise Spectre can give you a pet altar), and the
HUD's objective line counts the survivors. **Gem caches** are passive
loot-pinatas placed at leftover POIs: guaranteed gem, never counted by
objectives.

## Directional defense: guard, barriers, domes

**Shield Up** introduces the `guard` cast mode: hold the button and a
frontal arc with ITS OWN health absorbs every hit and projectile arriving
from the facing direction — damage, statuses, knockback, all of it. You
move at 40% and turn heavily (the shield is rate-limited); release ends
the stance into its cooldown, and a drained shield BREAKS it. Shield
health scales with the **guardStrength** stat, the arc with area modifiers
(yes, Widening fits). Distinct from all that is the passive **blockChance**
stat — a flat chance any hit simply stops — fed by warrior tree nodes.

Around it, a defensive toolkit:

- **Stone Rampart**: three barrier wall segments across your facing.
  Walls are real actors — enemies must shoot them, hack through, or walk
  around; enemy projectiles break on them.
- **Sanctuary**: a dome that dissolves enemy projectiles crossing it
  (the engine also supports `deflect` domes that turn them around wearing
  YOUR colors — data away).
- **Crypt Warden**: the guardian enemy. It sporadically raises the very
  same Shield Up you can learn — its front is a wall; get behind it.

**Channel supports** treat guarding as channeling (both share the
`channel` tag), so defense composes into offense:

| Support | While channeling/guarding |
|---|---|
| Nettles | attackers take flat damage — blocked hits prick too |
| Eruption Cycle | a fiery nova every 2s (faster with attack/cast speed) |
| Channeled Tempest | lightning hammers random ground around you |
| Patient Fury | channel pulses ramp +12%/s held (channels only) |
| Spooling Barrage | channeled projectile skills wind up extra shots |
| Guardian's Aegis | your guard arc shields your MINIONS too — their hits drain your shield |

A guarded warrior with Nettles + Eruption Cycle is a hedgehog: things
that chew on the shield bleed out on it.

The stance grew teeth: **PARRY** (a hit blocked within the opening 0.25s
costs no shield and ripostes the blocked damage back ×1.5) and **SHIELD
BASH** (releasing with ≥25% shield converts the stance into a frontal
blow — the remaining shield health lands as physical damage with
knockback and stun; a full-shield release hits hardest, a broken shield
never bashes). **Mirror Coating** flips any dome to DEFLECT: enemy
projectiles turn around wearing your colors and hit their own shooters.
Sigils shape auras now too — a Triangle Sigil in Unholy Aura makes the
dead rise in a triangle.

## Layered defenses: the soak chain

Incoming damage now chews through, in order: **ABSORPTION shield** (a
temporary pool — the proactive heal cast before the hit) → **ENERGY
shield** → **MANA shield** (a fraction paid from mana) → life. All four
layers are stats, so passives, skills, buffs, and gear-to-be can grant
any of them:

- **Energy shield** (`energyShield` stat) recharges FAST (33%/s) — but
  only after `esRechargeDelay` seconds untouched; any damage taken, even
  fully absorbed, resets the clock. **Power Surge** grants a 60-point
  burst, filled instantly and recharging immediately.
- **Mana Shield** is both a passive stat (Arcane Bulwark: 8%) and a
  toggle skill (40% of damage paid from mana while it drinks 2 mana/s).
- **Aegis Ward** grants you and nearby allies a 45-point absorption
  shield plus *Warded* armor that shatters with the pool.
- **Interplay passives** (the sorcerer wedge grew a defense branch):
  *Soul Battery* feeds 100% of life regen into ES instead — trickling
  through the recharge delay and compounding once recharge starts;
  *Thought Siphon* pays mana costs from ES when mana runs dry — stack it
  on Mana Shield and damage and spending drain the same battery from
  both ends.
- **Harvest supports** (Crimson / Azure / Lambent) give hits a chance to
  knock loose life / mana / energy-shield orbs — run them over to drink
  them; the lambent orb also kicks your recharge off.

## Conditional modifiers ("while on low life...")

Any modifier can now carry `when: <condition>` — the actor re-evaluates
its condition set every frame (lowLife, fullLife, lowMana, fullMana,
hasEs, lowEs, fullEs, guarding) and conditional modifiers apply only
while theirs holds. Supports built on it: **Desperation** (40% MORE
damage on low life), **Serene Power** (30% MORE while ES is full),
**Untouched Might** (25% MORE on full life). Any passive, buff, or
future item affix can use the same axis.

## Defense, round two

- **Parry is a support now**: Shield Up lost its innate window; **Perfect
  Timing** grafts a 0.25s parry (no shield cost, 150% riposte) onto ANY
  guard skill. The **Riposte** skill is the dedicated answer-blade: a
  0.6s stance whose ENTIRE window parries at 220%, spends itself on the
  answer, and snaps your face toward the parried blow.
- **Discipline** (toggle aura, reserves 35 mana): +40 ES for everyone
  covered — and supports tune it for the whole party: **Capacitor**
  (+60% recharge rate) and **Insulation** (-35% recharge delay) inject
  their bonuses into the aura itself.
- **Elemental Remnants** (support): elemental hits shed pickups; grabbing
  one empowers your NEXT cast of that element (40% more damage, +1
  projectile, 30% larger area), consumed on the cast.
- **Knockback is a shove, not a teleport**: targets slide their knockback
  distance over ~0.18s through real collision — rocks, walls and chasm
  edges stop them. Leap echoes fixed: Spell Echo on Crushing Leap now
  repeats the SLAM in place instead of re-launching (which used to leave
  you permanently airborne and untargetable).
- **New projectile fronts**: `bar` (Shockfront — a beam-wide force wall),
  `arc` (Frost Pulse — a washing crescent), `wave` (Fire Siege — a
  grinding flame wave). Wide shapes pair with wide hitboxes.
- **Bone Prison / Bone Cage**: rings of barrier segments at a point or
  snapped around a single enemy. Bars are constructs, so Martyrdom /
  Unstable Flesh make them explosive — and explosive constructs now go
  off even on natural expiry. The Lich Marshal cages YOU now.
- The Warrior starts with Shield Up on the bar.

## Enemy archetypes: brains + shapes as a language

A monster's optional `brain` selects an AI archetype on top of the generic
skill-hint core; its `shape` (now also pentagon / hexagon / octagon / star
/ cross / trapezoid / rhombus / oval / kite / rectangle) telegraphs the
archetype at a glance, an `adorn` layers a silhouette accent on top
(triangle EARS for goblinoids and gnolls, swept HORNS for orcs, a ring of
SPIKES for trolls and briar things), and a `worm` body grows a chain of
trailing segments that slither after the head.

| Brain | Behavior | Shape language | Examples |
|---|---|---|---|
| `swarm` | relentless: sees further, never forgets, never disengages | tiny circles/pentagons | Blood Mite, Husk Swarmer |
| `skirmish` | hit-and-run: strike once, withdraw, circle back | hexagons/triangles | Dune Stalker, Javelin Skirmisher |
| `caster` | line-of-sight: won't cast into a rock — strafes (and flips direction) until the firing lane reopens | hexagons/octagons | Hex Weaver, Pyroclast Magus |
| `bomber` | lunatic: zigzags in, arms a blinking fuse point-blank, detonates | diamonds | Volatile Zealot |
| `juggernaut` | lumbering: huge life/armor, slow heavy blows, never retreats, ENRAGES at low life | huge octagons/hexagons | Bone Colossus, Tundra Behemoth, Troll Mauler, Briar Beast |
| `assassin` | stealth: stalks shrouded (invisible to your minions, faint to you) toward your BACK, strikes, melts away | stars | Gloom Stalker |
| `commander` | directs: hangs behind the warband, blessing and reinforcing from way back | crosses/trapezoids | Warband Chieftain, Lich Marshal, Gnoll Howler |
| `flanker` | strafing melee: orbits at blade's length, cutting as it circles, flipping direction unpredictably | trapezoids | Orc Ravager, Gnoll Butcher, Gale Elemental |
| `strafer` | strafing caster: a fire-and-SLIDE cycle — casting roots the body, so it holds spells back to keep its feet moving on the ring | rhombuses/kites | Ember Elemental, Thorn Sprite |
| `pack` | pack hunter: circles WIDE and waits — commits like a swarm only once ≥2 packmates ring the prey (or its own blood is up) | kites | Gnoll Prowler, Fen Hound, Alpha Stalker |
| `artillery` | extreme range: HOLDS FIRE and flees when you close, bombards from way out when you don't | kites/rhombuses | Gnoll Longshot, Frost Elemental |
| `protector` | bodyguard: picks a ward (commanders and casters first) and posts itself ON the line between threat and ward | rectangles | Stone Sentinel, Sylvan Warden |

The `lineOfSight` primitive (segment vs blocking terrain) is what caster
brains reposition to regain — terrain isn't just collision anymore, it's
cover. Worms (Bone Serpent, Magma Worm) weave serpentine approach paths.

**The world doesn't stand at attention**: monsters with no target now
WANDER — drifting strolls with random heading changes (and pauses) at a
third of combat speed, so a zone seen from a ridge moves like a place,
not a diorama. Combat instantly snaps the focus back. (Guards also fixed:
`standoff()` now uses the kit's SHORTEST-range skill, so a Crypt Warden
whose Shield Up rests walks all the way in to Cleave instead of idling at
guard range. And scenery is not prey — AI never dedicates its life to a
barrel or a townsperson.)

**New skill primitives the archetypes introduced — all player-unlockable:**

- **`leap` delivery** (Crushing Leap): airborne toward the aim point —
  untargetable in flight, clears chasms — landing with a shockwave.
  Juggernauts open with it; so can you.
- **`backstabMult`** (Backstab): positional damage — 150% MORE from behind
  the target's facing. Assassin tech; pairs viciously with Shadow Step.
- **Rallying Howl**: the commander's ally-blessing nova (rally status:
  +25% damage, +15% move) — minion builds want it badly.
- **Acid Spray**: the serpent's caustic cone (poison + armor-shredding
  Agony).

## The Lightning archetype (and supports-on-supports)

Thirteen-skill theme: **Ball Lightning** (a drifting orb that ZAPS its
surroundings — the `zap` projectile primitive), **Lightning** (perfect-
window instant bolt), **Chain Lightning** (innate chains that re-chain),
**Static Shock** (strips 12% of CURRENT life — resistible, can never
kill), **Surge** (become the current: a damaging lightning dash),
**Tempest** (a self-centered zone whose pulses hurl everyone outward),
**Hurricane** (a channeled ring that GROWS while the eye stays calm),
**Eye of the Storm** (duration aura: lightning gnaw + mana regen), plus
house designs **Thunderclap**, **Overload** (consumes shock for 80% MORE
— stack shocks with **Static Buildup**, then flip the breaker),
**Static Field**, **Galvanize** (40% of attack physical becomes
lightning), and **Maelstrom Orb** (orbit + zap, primitives composed).

**Supports compose with supports now.** A support can GRANT tags
(`grantsTags`): **Dive Bomb** makes any movement skill explode at its
start and end points AND marks it 'aoe' — which is exactly what lets
No Man's Land socket in beside it, dropping lingering fields at every
blast. **Fire Walker** grafts Trailblaze onto any dash or charge.
Spirit Totem now intercepts at press time, so totems can raise GUARD
stances (an Ice Shield totem is a deployable shield post), and leap
landings count as the skill's area (Phoenix Dive + No Man's Land
scorches its crater). **Arcing** chains any projectile.

## The Fire archetype (and the primitives it brought)

Seventeen-skill elemental theme. Firebolt is the humble bolt (the old
Fireball, renamed); the new **Fireball** rides the `explode` primitive
(projectiles burst on impact AND at range's end). The rest:

- **Combustion** consumes a target's ignite into an instant payload and
  re-ignites everything in the splash; **Ignite** is the instant targeted
  fuel for it (and for **Powderkeg**, the support that turns ignites into
  expiry EXPLOSIONS — no DoT, all boom). **Living Bomb** marks a victim
  whose timer detonates them in fire (elemental curse-ruptures).
- **Volcano** is the charge showcase: hold to gather the mountain —
  charge scales BOTH the eruptor construct's duration and how fast it
  spits exploding magma globs at random ground (`eruptor` construct kind).
- **Pillar of Flame**: a ring that sears its rim and CLOSES INWARD
  (fill-in zones — the hollow center is briefly safe, then it isn't).
- **Flame Wall**: lingering zone SEGMENTS in a line — a sigil bends the
  wall into a square or triangle outline. **Elemental Conduction**
  (support) lets your projectiles INHERIT an element from fields and
  hazardous ground they cross (a frostbolt through your flame wall
  arrives burning; anything through a bog arrives poisoned).
- **Flame Spear** (perfect-timing pierce), **Flame Arrow** (fast cheap
  pierce), **Infernal Cannonade** (multitude: a shell per press),
  **Flame Core** (untouchable orbiting mote that spits firebolts),
  **Solar Orb** (a hung sun that cooks its radius), **Flame Wreath**
  (attacks gain added fire).
- House designs: **Phoenix Dive** (burning leap), **Cinder Swarm**
  (erratic ember flurry), **Backdraft** (a cone that INHALES — negative
  knockback drags victims into the fire), **Trailblaze** (a dash sowing
  burning ground the whole way).
- More supports: **Forked Focus** (targeted skills strike +2 victims),
  **Nova Release** (+4 projectiles, volley rings the caster — projectile
  skills become area presence), **Slow Burn** (fire effects 80% longer).

## The Cold archetype (and the primitives it brought)

Thirteen-skill elemental theme, every piece supportable like anything else:

| Skill | Mechanic it rides |
|---|---|
| Ice Spear | **shatter**: first impact flings 5 shard projectiles raking the cone BEHIND the victim |
| Icy Comet | delayed impact that leaves a **temporary REAL ice sheet** (slippery, full terrain rules) |
| Ice Shards | channel spraying 2-3 tiny shards per pulse |
| Cold Vortex | lingering zone with **pull** — drags enemies into its center |
| Creeping Ice | lingering zone with **drift** — the field crawls forward |
| Cold Snap | **detonateProjectile**: pop your own cold projectile where it flies (Frozen Orb!), else burst around you |
| Absolute Zero | **shatterStatus**: consumes chill/frozen for 100% MORE damage |
| Ice Shield | 360° guard, immobile, **bursts cold on break OR release** (bashOnBreak; payload takes the skill's element) |
| Ice Blade | timed-strike dagger with **innateMods** (+18% base crit) |
| Avalanche | ramping immobile channel cone with knockback |
| Shatterstep | blink whose DEPARTURE point erupts in frost and freezes into real ice |
| Winter's Mantle | toggle aura: ally ES + enemy slow + cold gnaw |

**Chill builds up now**: each application stacks intensity (max 5), and at
peak the chill is consumed into a **FREEZE** — a 1.5s hard stun that takes
10% more damage and shatters beautifully. Chill-stackers feed Absolute
Zero; everything cold loops into everything else.

## The frontier: a world that grows

Rim zones carry exits with `to: '?'` — **uncharted portals**. Stepping
onto one mints a brand-new zone from its **tileset** (`data/tilesets.ts`:
name parts, palette, layout stamps, pack table, spawner type, objective
weights), one level deeper than where you stand, grafts it onto the
runtime zone graph, and walks you in. Each generated zone brings 1-2
frontiers of its own, so the deepwood grows past the Shaded Thicket, the
tundra past the Frozen Approach, and the cinderlands past the Ember
Wastes — indefinitely, leveling as it goes. The M map's viewBox grows
with the graph.

**Adding a tileset** is one data entry; **adding a stamp kind** is one
generator function. No other engine changes.

## Current state — what's playable now

- **13 classes** (Warrior, Magician, Rogue, Berserker, Sorcerer, Ranger,
  Guardian, Summoner, Swashbuckler, Juggernaut, Pyromancer, Assassin, Cleric) —
  thin templates (a starting attribute spread, a pre-bound skill bar, a tree
  start node); nothing is class-locked.
- **~377 skills** and **~209 support gems** dropping from monsters, socketable
  into skills and levelled with skill points earned by sacrificing gems.
- A **233-node passive tree** (9 keystones, 42 notables) with raw attributes on
  the tree, plus **5 attributes** that gate skills.
- **156 monsters** across **13 AI archetypes + the basic brain**, with
  shape/adorn telegraphing, squad tactics, morale, five rarity tiers and rolled
  affixes — all drawing from the same skill catalog the player uses. Minions are
  bestiary monsters fighting on your side with your minion stats.
- **37 status effects**, **5 damage types** with conversion, **12 charge
  resources**, and **9 procs**.
- **14 hand-authored zones** anchored by the town **Lastlight** (vendor +
  storage) and the Crossroads, opening onto an effectively infinite procedural
  world (25 tileset recipes; biomes, continents with sea travel, alternate
  dimensions; clear / boss / waves / spawner objectives; terrain set pieces).
- **17 per-run world-event packages** configured on the Expedition screen and
  unlocked through the account Vault.
- **Permadeath with corpse-run recovery** and an account/Vault meta-layer that
  persists across runs; saves to disk and localStorage.
- **Co-op**: host-authoritative, local or over WebRTC.
- Faction warfare: hostile packs brawl where they meet, allies march together,
  idle monsters wander their ground.

## Natural next steps

- **Equipment & currency** — loot is gems only today; the `DropItem` / `SavedLoot`
  unions and `DeathLootPolicy` are shaped to grow into affix-rolled gear, flasks,
  and currency.
- **Audio** — there is currently no sound system.
- **Class identity** — `ClassDef.innate` fields exist but are unpopulated,
  awaiting a balance pass.
- **Mercenaries** — the party / EventBus layer is pre-wired for hired allies.
- **Networking hardening** — WebRTC co-op is MVP (STUN-only, no TURN, copy-paste
  signalling).
- **Art** — all visuals are placeholder geometry driven by data colors.
