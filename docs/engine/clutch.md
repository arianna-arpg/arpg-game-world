# THE CLUTCH FABRIC — bodies as payloads of blows

`src/engine/clutch.ts` · executor `World.birthAt` (src/engine/world.ts) ·
probe `balance/probe_clutch.ts` · dials `CLUTCH_CFG`

## The thesis

The world already births in fragments: the summon delivery stands a court at
the caster's side, `litePour` bursts pool rows where a flight ends (the vermin
piper's rat-pod), proc `summon` conscripts beside a struck victim (Forgebound,
Phantasm), the construct pod incubates where planted (Broodpod), and the Demon
Storm's meteor craters spit demons through a bespoke `onImpact` closure. The
gap this fabric closes: **nothing let SKILL DATA say "a full Actor stands
where this landed."** The thrown birth — the Vile-Mother mortar, the flame
that leaves a living spark in the wound — is now one open effect row any
skill, any monster kit, any support gem, and any future door can carry.

## The effect

```ts
{ type: 'birth',
  monsterId?: 'vile_spawn',          // fixed kind — or:
  pool?: [{ id, weight, presence? }],// weighted rows, presence-enveloped
  count?: [1, 2],                    // bodies per resolution
  cap?: 8,                           // THE CLUTCH CAP (see lanes below)
  duration?: 10,                     // player lane: lifespan × effectDuration
  onHit?: true,                      // only where a blow actually LANDED
  bounty?: 'full',                   // enemy lane: opt INTO paying
  scatter?: 26, tag?: '...',         // seat jitter; event-role tag
  emerge?: { motion: 'condense' },   // arrival override (emergence grammar)
  orphan?: 'die'|'wither'|'frenzy'|'rout', // the mother's death, per spec
  incubate?: { sec, vessel? } }      // lay an EGG instead (enemy lane)
```

## One effect, every delivery, at its own honest landing

| Delivery      | Where the birth stands | Site |
|---------------|------------------------|------|
| `ground`      | the TARGET point (the kindle/vent law) | executeSkill's ground case |
| `storm`       | EVERY strike's landing (the mortar law — stamped on the strike zone, executed at its detonation; a dead mother's shells land barren) | the storm mint + the zone detonation |
| `projectile`  | the flight's END, however it ended (the litePour law) — unless `onHit` | the projectile sweep's payout block |
| `onHit: true` | the STRUCK BODY (landed top-level blows only — `dealt > 0`, depth 0, the siphonOrb convention; pierce births per victim, caps bound it) | resolveHit's effect chain |
| anything else | where the skill resolved (origin) | executeSkill's generic chain |

`instanceBirth(inst)` is THE one read: the skill's own `birth` effect first,
else the first socketed graft (`SupportDef.birth`) — **the kindred rule**: the
native lane wins the slot, so a native + a graft can never double-mint. Each
delivery executes the resolved row ONCE at its own site.

## The two lanes (the executor forks once, on the caster's team)

**Player-team casters** mint through `spawnMinion` with a synthetic
`SummonDelivery` (the Vessel-of-Shadow graft idiom). Everything is standing
law: roster caps (`minionMaxCount` over the spec's `cap`, evict-oldest),
owner-stat bake, socket forwarding, `duration` × effectDuration lifespans,
`noBounty`, lifelines — and **THE UNLEARN SWEEP** applies: births are
minions, so unlearning the anchor skill dismisses its children.

**Enemy/wild casters** mint permanent kin at the MOTHER'S level through
`createMonster` — ownerless, so co-op party scaling arrives free — placed by
`findFreeSpot` (an impact point can sit inside a rock blob), stamped
`Actor.bornOf` (a numeric id, never an Actor ref: a dead mother must not be
kept alive by her brood), faction-inherited from the caster.

## The laws (probe-pinned)

- **THE CLUTCH CAP** — an enemy mother's live children are counted by the
  `bornOf` census; at cap the birth simply doesn't happen (the blast still
  lands, the sac lands wet). **No eviction**: a vanguard holds a wall, it
  never rotates one. The fallen free their seats.
- **THE CONJURED-STREAM LAW** — the standing bounty ruling: skill-conjured
  bodies pay no XP/drops/orbs. The mother is the prize; her spawn is weather.
  `bounty: 'full'` opts a spec out deliberately.
- **CHILDREN COUNT** — births are real threats: they gate clears and feed
  cull tallies like any counted body (the tally a pour adds, the pour helps
  finish — the rift_born precedent). An ambient `tag` opts out through the
  standing `AMBIENT_TAGS` exemption; no new lever exists.
- **POOLS BREATHE** — pool rows ride `World.weightedPick` at the CASTER'S
  level, so presence envelopes shape which kin answer as the mother scales
  (the gravemaker's zombies thin as worthier dead rise).
- **ARRIVALS READ** — every birth plays the emergence grammar: the ground
  under the landing derives the motion (grave-earth RISES, water SURFACES),
  `onHit` births burst OUT of the struck body, and the spec's `emerge` row
  overrides both (a fire sprite condenses). Never a caption.
- **THE LIVING-CASTER GATE** — a dead mother's airborne shells land barren
  (the litePour law's own gate, carried over).
- **THE ORPHAN FATES** (her ruling: *"it depends on the mother"* — faction,
  theme and role decide, so the law is PER-SPEC data, never one global
  rule) — `orphan` stamps each child at birth; `World.clutchOnDeath`
  applies it when the mother falls: `die` (an extension of her — it simply
  stops, quietly), `wither` (a short clock), `frenzy` (the mourn-rage
  window — killing her mid-brood has a price), `rout` (the panic
  machinery's flight — `StatusDef.panic`, the same rout every courage spec
  obeys). Absent = persist, the D2 answer, free at the death seam. The
  last clutch is the standing AI verb (`onDeath: [{do:'summon',…}]` — the
  broodmother's final spasm wears it).
- **THE EGG** (her ruling: thematic, per-monster — the spider that lays on
  what it kills) — `incubate` lays a killable VESSEL (`clutch_egg` by
  default; `vessel` reskins) that holds a clutch-cap seat until term.
  Break it and nothing is born; at term `updateClutch` bursts it and the
  brood hatch as **the egg's own** (`bornOf` the egg) — which is the
  free-recursion default at work.
- **FREE RECURSION** (her Card-5 ruling) — a `bornOf`-carrying body births
  unrefused; there is no generation law. Caps bound each generation, and
  that is the whole discipline. Authored data may still choose depth by
  simply not giving children birth kit.
- **THE PROC DOOR** (her Card-4 ruling) — ProcEffect `{type:'birth',
  birth, at?}`: the full birth row played from any trigger (combo payoffs
  ride ComboRuleDef's proc payoffs, blocks ride trigger 'block', kills
  'kill'). Player-side it mints for the RESOLVED keeper through the
  Forgebound census key (`'__proc:<id>'` — the court-credit law); a null
  host instance is the door's normal shape.
- **THE CLUTCH TELL** — tell source `clutch` reads `Actor.clutchLive`,
  stamped by birthAt and the death seam off the SAME `bornOf` census the
  cap refuses at (drawn == capped). Debut: the whelpsling's crate is the
  gauge — full while the litter is boxed, flat once it runs loose; the
  crate left the LOOK entirely (the accumulator law).

## The landing mechanism (the gem's structural gate)

`SUPPORT_MECHANISMS.landing`: the host's delivery resolves at a POINT a birth
can stand on — projectile, storm, or ground. Auras, self-rites, guards and
summons refuse honestly, and the refusal is delivery-shape structural (never
a skill list), self-lifting the day a host changes shape.

## The debuts

- **`vile_broodmother`** (demon — the flagship): the bloat-mother drive
  grammar aimed downrange. The clutch-sac is a `fillSac` TELL riding the same
  `brood` drive the lobbing rule reads (drawn == tested: a full sac IS a shot
  coming), the body swells near term, the spent slump is the punish window.
  Lobs `vile_clutch` → `vile_spawn` (cap 8). Seated in the demon war roster +
  grindfields/hell_steppes packs.
- **`barrow_gravemaker`** (undead): `gravecast` hurls grave-earth whose pool
  REUSES standing kin — zombies fade by 14+, skeleton archers only from 8 up
  (the breathing-pool showcase; zero new child defs). Undead roster +
  crypt/catacombs.
- **`goblin_whelpsling`** (goblin): `whelp_toss` heaves a nailed crate that
  splinters into `gnasher_whelp`s (the gnasher herd's litter — the mount
  fabric's kin at pup scale). Goblin war roster.
- **`cinderwisp`** (player skill, droppable — 'Skill Pool: the Clutch'): a
  slow ember; a LANDED blow births a `cinder_sprite` minion out of the wound
  (`onHit` — a dirt flight breeds nothing). Tags spell/fire/projectile/minion:
  the projectile+minion hybrid opens both support families by construction.
- **`broodbearer`** (support gem, droppable — 'Support Pool: the Clutch'):
  grafts `birth` onto a birthless host's LANDINGS — no victim needed, the
  ground itself is the womb (distinct from Phantasm's hit-proc by premise).
  Reuses the standing `broodling` kind.

## Extension doors (open by construction, unbuilt)

- Any `MonsterDef` kit skill can carry a `birth` row — new mothers are data.
- Any support gem can carry `SupportDef.birth` — new grafts are data.
- Attuned births (the child takes the color of the blow) fold into the
  rolled-support charter's TYPE axis (docs/design side — her call).
- New orphan fates are one switch arm each; new vessels are one MonsterDef.

## Dials (`CLUTCH_CFG` — first-pass numbers stand, per her word)

`count [1,1]` · `cap 8` (enemy) · `minionCap 2` (player default) ·
`scatter 26` · `flash {34, 0.3s}` · `orphan.witherSec 6` ·
`orphan.rout {bolted, ×2}` · `orphan.frenzy {8s, +30% dmg, +20% AS/MS}` ·
`incubate.vessel 'clutch_egg'` — plus every per-skill number in
data/skills.ts (counts, caps, cadences, telegraphs, damage).
