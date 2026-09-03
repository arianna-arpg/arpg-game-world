# THE GAUGE FABRIC — skills that pay in the world's own events

`src/engine/gauge.ts` · `src/engine/charges.ts` (the pool clock) ·
`src/data/ultimates.ts` (the debuts) · probe `balance/probe_gauge.ts`

Two resource shapes, one vocabulary, both open data:

- **THE GAUGE** — a per-SKILL bank (`SkillDef.gauge`). The world's events
  FEED it, the press SPENDS it, a lockout silences it. The Vaal-soul shape:
  an art that scales with how fast you kill, priced in bodies instead of
  seconds. Two gauge arts on one bar each drink the same kill — souls are
  not a shared purse.
- **THE POOL** — a per-ACTOR bank (`ChargeDef`) a skill SPENDS through the
  standing `chargeCost`, that now REGENERATES on the def's own clock
  (`ChargeDef.regen`, baseline per 10s) beneath the investable
  `chargeRegen_<id>` stat. The Titan-Quest Shade shape: another every few
  seconds, faster with investment, capped by `baseCap` + `chargeCap_<id>`.

## The gauge

```ts
gauge: {
  need: 30,                 // points to fire (gaugeNeed stat scales; min 1)
  unit: 'souls',            // the HUD/tooltip word
  lockoutSec: 12,           // post-press silence (gaugeLockout stat scales;
                            // default GAUGE_CFG.defaultLockoutSec)
  feeds: [                  // the charge-tap vocabulary minus the bank:
    { on: 'enemyDeath', amount: 1, radius: 420 },   // deaths near you, credit-free
    { on: 'kill', amount: 2, eliteVictim: true },   // your own elite kills
  ],
  regen?: 0.5,              // points per second (the regenerating shape)
  bankMult?: 2,             // ceiling as × need (default 1 — full is full)
}
```

Feeds ride `World.tapCharges` — the ONE tap dispatcher — through the ONE
filter chain `World.tapFires` (trigger match, toggle gating, the death radius,
the orb kind, the elite victim, the chance roll, rolled last so a filtered
tap never moves the stream). Every `ChargeGainSpec.on` kind is a feed kind:
`hit`, `kill`, `takeHit`, `block`, `enemyDeath`, `allyDeath`, `orbPickup`,
`channelFinish` … The kill site now passes the victim, so `eliteVictim` kill
taps read it (charge taps too — a latent gap closed in passing).

## The laws

- **ONE READINESS.** An unfilled gauge is "not ready" through the SAME
  predicate a charge floor uses — `Actor.unmetGate`, checked first — so the
  bar greys (`World.skillUsable`), the AI waits (`canUse`), and the press
  refuses, all agreeing. The note reads the fill (`12/30 souls`) or the
  silence (`spent`).
- **THE PRESS PAYS.** The bank spends at the press beside mana (a use is a
  use: an interrupted bar still spent its souls) and the lockout arms.
- **THE LOCKOUT TAKES NOTHING.** Feeds and regen alike are refused whole
  while it stands (the anti-chain law); it ages on the OWNER's own seconds
  (`Actor.updateTimers` — a frozen caster's silence stands frozen).
- **THREE ORDINARY STATS.** `gaugeGain` (× every banked point), `gaugeNeed`
  (× the requirement), `gaugeLockout` (× the silence) — base-1 multipliers
  registered by `engine/gauge.ts` beside the charge stats, tag-scopable like
  any modifier: `mod('gaugeNeed', 'increased', -0.3, ['ultimate'])` is "30%
  less Ultimate gauge required" and reaches nothing else. Passives, gear,
  buffs and supports all grant them the ordinary way.
- **TRANSIENT.** The bank lives on `SkillInstance.state` (`gauge`,
  `gaugeLock`), reset on load like the trigger-gem clocks and the self-stack
  piles. Co-op clients draw their own slot meter off their own instance
  state (the host's presses are the truth; a divergent client meter is
  cosmetic — OPEN if it ever matters).
- **THE SAME DOOR.** Monsters wearing a gauge art feed through the same taps
  and refuse through the same predicate (probe-pinned).
- **THE SLOT METER.** The bar draws the bank RISING up the slot as an ether
  fill; full wears a bright rim; locked reads dark red. The greyed
  not-ready face stays underneath — fill = progress, grey = not yet.

## The press modes

Three ways a gauge may fire, all on the one bank:

- **THE FULL PRESS** (default) — fire at `need`, spend `need`, power 1.
- **THE PARTIAL PRESS** (`partial: { minFrac, floorPower }`) — fire from
  `minFrac` of need (at least one whole point), spending the WHOLE bank at
  **power** = `floorPower` at the floor ramping linearly to 1 at need
  (`gaugePowerOf`). Grave Tide from three souls at a quarter strength;
  Rain of Knives from five marks at 30%.
- **THE OVERFLOW** (`overflow: true`, with `bankMult` > 1) — spend the whole
  bank at power = fill/need PAST one: the effect that keeps growing while
  you keep banking. Red Hour wears a triple purse as thirty stacks.
- **THE HASTENING** (`cooldownPer`) — while THIS skill's cooldown runs,
  every banked point SHAVES that many seconds off it INSTEAD of banking;
  once clear, points bank as usual. The two-phase art: the resource hurries
  the clock, then grows the blow.

**Power** is stamped at the press (`SkillInstance.state.gaugePower`) and
read by the execution in three lanes — damage (folded into the press's
`dmgMult` beside charge spends), counts (projectiles, storm strikes,
summons: `max(1, round(count × power))`), and buffs wearing
`BuffEffect.powerStacks` (stacks per unit of power; the standing
`powerScaled` lane scales magnitudes by the same number). A gauge-less
skill reads power 1 everywhere by construction.

## The upgrade trees

Every D4-roster ultimate wears `SkillDef.tree` — the skill-mode fabric's
exact-cover grammar (2 branches × 3 rungs + a neutral; rung 1 is the
identity commitment, the first point seals the rival branch): the D4
Prime/Supreme shape, authored as ordinary modifier rows (`gaugeNeed`,
`gaugeGain`, `gaugeLockout`, `summonCount`, `stormCount`, `effectDuration`,
`cooldownRecovery`, crit…) — no whitelist growth, every stat read sees them
through `instanceInnateMods`. Grave Tide: the Unburied (endure) / the Grave
Court (strike) / Soul Ledger. Red Hour: the Unbroken / the Bloodletter /
Second Wind. The Long Cold: Deep Winter / the Shatter / Cold Snap. Rain of
Knives: the Second Volley / the Poisoned Rain / the Light Hand. Litany of
Dawn: Dawn's Mercy / Dawn's Wrath / First Light.

## The pool clock

```ts
// engine/charges.ts
wisp: { label: 'Wisps', color: '#8fa8d8', baseCap: 5, regen: 2.5,
        regenNeedsSpender: true, hud: 'slot' }
```

`regen` is charges per 10s (2.5 = one every four seconds) folded at the
actor's 1s-cadence accrual beneath `chargeRegen_<id>`. `regenNeedsSpender`
ticks the clock ONLY while a slotted skill spends the charge (innate
`chargeCost` or a socketed spender graft — `Actor.spendsCharge`): a resource
exists because you carry an art that drinks it, so no bar grows ambient
pips. `hud: 'slot'` pins the pips onto the spender's button.

A pool-priced skill is ordinary `chargeCost` data; "usable at five" is the
standing charge economy (`skillUsable` greys, the press refuses). Investment
is the standing `chargeRegen_<id>` / `chargeCap_<id>` stat pair — free from
the registry the moment the def exists.

## The debuts (`data/ultimates.ts`)

| art | price | shape |
|---|---|---|
| **Grave Tide** | 30 souls (deaths within 420 credit-free; your elite kills ×2), 12s silence | the horde: 8 skeleton/zombie minions at the mark for 22s, 12 at most |
| **Reaper's Toll** (no super mark — an ordinary level-6 drop) | 8 souls (your kills), 4s silence | a 170-radius chaos burst — the kill-speed build-around |
| **Hush of the Wake** | the whole wisp pool (5) | 240 absorb / 5s, half damage turned aside / 4s, a fifth of life mended, quickened step |
| **Doom Bell** | 60s | a 400-radius physical shockwave: stun, knockback, `empower` crowd scaling |
| **Last Rites** | 75s + the low-life license (`gate.missing` life 50%) | mend 40%, 35% more damage / 6s, a stunning toll a breath later (`followUp`) — a reflex |
| **Stormcrown** | 80s | 24 sky bolts across 300 units over four seconds, `sky: true` — friend, foe, or you |
| **Red Hour** (Berserker — Wrath of the Berserker) | 90s + THE HASTENING (blows shave 1.5s while it rests) + THE OVERFLOW (12 wrath full, 36 brimming) | 8s of wrath worn as stacks: 4% damage / 2% swings / 1% feet / 1.5% less taken per unit — ten at full, thirty brimming |
| **The Long Cold** (Sorcerer — Deep Freeze) | 80s | a 260-unit freezing burst, 80% of damage turned aside for 3s (a buff — never an `absorb` on a damaging delivery: the per-target loop would shield the victims too), then the shatter (`followUp`) |
| **Rain of Knives** (Rogue — Rain of Arrows) | 20 marks (hits +1, kills +3), THE PARTIAL PRESS from five, 8s silence | 24 knives in a breath, count and bite scaling with the marks spent |
| **Litany of Dawn** (Cleric — Heaven's Fury) | 70s | ten radiant shafts that weaken, then a third of every ally's life mended (`followUp` heal nova) |

THE PRICE FLOOR (`docs/engine/ultimates.md`) grew two shapes for these:
an ultimate carries at least ONE of cooldown ≥ `minCooldown`, gauge need ≥
`minGaugeNeed`, or pool spend ≥ `minPoolCost` (census-pinned).

## Dials

`GAUGE_CFG`: `defaultLockoutSec` 6 · `defaultBankMult` 1 · the two notes.
The wisp clock 2.5/10s, cap 5. Every art number above — first-pass,
unblessed.

## Open follow-ups

- A `'use'`-fed gauge (the meta-banking discipline: real uses only) and a
  `'move'` feed ride the actor-side tap loop, not `tapCharges` — wire them
  when a debut wants them.
- Gauge-scoped SUPPORT gems (a gem that grafts a feed, or converts a
  cooldown art into a gauge art) — the ledger's adjudication session was
  live, so no new gem shipped this wave.
- Save persistence of the bank (a deliberate transient today).
