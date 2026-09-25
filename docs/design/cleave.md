# Cleave: read the rhythm, recover the steel

`src/data/cleaveTree.ts` owns every tuning value in the fifteen-node tree.
The original manual Cleave remains available without either exclusive trunk.
Four points arrive at levels 5, 10, 15 and 20. Sibling investments can mix;
Practiced Edge grants 15% **more** damage per rank.

## Readied Cleave

Each target keeps its own landed-hit cycle. The first through fourth hits
receive 10%, 20%, 30% and 40% increased damage; the fourth receives its bonus
before resetting that target to zero. These bonuses join the ordinary additive
damage fold. Misses, blocks, immunity and damage-over-time cannot advance it.

- **Deep Notches:** the maximum hit grants four seconds of Berserk: 15% more
  attack damage, 10% increased attack speed and 3% life leech.
- **Barbed Edge:** moves the original armed melee release to this leaf. Toggle
  it on; a landed melee attack from another skill releases Cleave at that
  victim, pays Cleave's normal mana cost and starts four seconds of recovery.
  Cleave deals 20% less damage and stays armed until toggled off.
- **Splitting Armor:** replaces the personal ramp with vulnerability.
  Each completed nonmaximum hit leaves 10% increased damage taken per stored
  stack, affecting all damage sources for eight seconds. The maximum hit
  benefits from the existing vulnerability, then clears it.
- **Ready Rhythm:** odd hits apply Bleed at 30% of hit damage per second; even
  hits lodge 30% of physical damage as Impale. Normal Impales discharge through
  the shared status engine.
- **Close Quarters:** the aimed target's upcoming stack grants 20% more melee
  reach and arc width per stack. The fourth swing reaches 180% of the normal
  reach and width, then resets. One captured footprint serves the whole swing;
  each victim still has its own damage cycle.
- **Finishing Cut:** extends the cycle to five. Ready Rhythm's Impales remain
  lodged instead of discharging on intervening hits. The fifth hit applies its
  odd-hit Bleed, then consumes this owner's Ready Rhythm wounds for 150% of
  their remaining bank as a physical burst. Other players' wounds, ordinary
  support ailments and other skills' wounds are untouched. Normal status
  expiration still applies.

Barbed Edge uses the existing trigger arbitration, payment, recovery modifiers,
next-hit buff order and chain-depth limits. Toggling is free, never resets its
clock and starts disarmed after loading. Co-op metadata carries the armed flag.

## Unbound Cleave

The other trunk throws an axe with 120% more projectile damage. Its first
landed hit lodges it in the enemy. Cleave remains unavailable until the owner
approaches within 55 units plus both bodies' radii, on the same tier with clear
line of sight. Retrieval inflicts Bleed at 30% of the original damage per
second. A dead or missing victim returns it; a missed throw gets one second of
recovery after its flight expires. An ordinary cooldown reset cannot duplicate
an outstanding weapon.

- **Long Edge:** applies the retrieval Bleed immediately and grants one Gyre,
  capped at five. The axe bounces toward a glyph 100 units from the caster,
  taking two seconds to land. Entering its 26-unit circle before that deadline
  catches it and launches an eight-axe nova at half damage. A late arrival
  retrieves a fallen axe without the nova. Both markers are non-solid through
  the shared phasing stat, so ordinary movement can enter the pickup circle.
  Every outstanding axe must return.
- **Wide Front:** each airborne catch adds Caught Rhythm, capped at three.
  Each stack repeats the next throw once, spaced by 0.16 seconds adjusted by
  attack speed. Catching any axe in the cast preserves the buff, even if other
  axes miss or fall. Letting the entire cast fall without a catch clears it;
  fallen axes retain their glyph and recovery requirement.
- **Driving Front:** outbound and bouncing axes shed a small axe in a random
  direction every 0.25 seconds, at 18% damage.
- **Heavy Wave:** primary axe impacts burst within 75 units, dealing 35% of the
  strike's damage and applying Bleed at 15% per second. This is the second fork
  directly below Unbound Cleave, so it combines with Long Edge in three points.
- **Serrated Wave:** a leaf below Heavy Wave. Immediately performs a broad melee
  strip sweep when the paid cast begins. The axe launches when windup completes.
- **Spreading Wounds:** the other Heavy Wave leaf. Independently performs the
  opposite sweep after 0.25 seconds, adjusted by attack speed. Taking both leaves
  gives the immediate outward sweep followed by the delayed return sweep.

Both sweep leaves have melee tags and normal Cleave damage; the throw's
projectile multiplier does not amplify them. Either leaf admits melee supports
through its own component. Multistrike repeats each selected sweep, with its
damage and tempo modifiers confined to those sweeps; it does not repeat or
penalize the axe. The delayed sweep and repeat beats use the component's attack
speed. Component-only support costs are charged once with the paid parent cast,
even when both leaves are selected. Bare projectile-only Unbound Cleave cannot
socket Multistrike, and removing both leaves closes that admission again.

Nova and rain payloads use the normal
projectile damage, speed, trajectory and support machinery. The nova honors
projectile count. Standard impact shards fire before the primary axe lodges.
Lodging/bouncing terminates a primary axe's flight at its first landed body,
as with a catch-spot projectile; secondary axes can use ordinary continuing
flight behavior. They never lodge, bounce, advance a cycle, or recursively
produce these tree payloads.

## Shared engine contract

`AttackSequenceSpec` can be authored on a skill definition or tree node.
`attackSequenceOf` combines selected patches in a stable order. `castSweeps`
concatenates independent, data-authored beats (delivery, damage and delay), so
one sweep never depends on another leaf and allocation order cannot erase it.
`AttackSequences` owns per-actor, per-skill-instance, per-target state and
captured per-cast recovery groups. There are no Cleave or node-ID branches in
the runtime. Delivery resolution, support mechanism admission and previews
read the same authored spec.

`attackSequencePayload` constructs the shared component view used for socket
admission, timing previews and live payloads. Component tags stay local rather
than widening the parent delivery's tags. Independent melee payloads opt into
the existing repeat scheduler without repaying resources or replaying parent
cast events; their scheduled repeats cannot recursively start repeat trains.
Projectile nova/rain payloads do not receive that opt-in.

Primary casts and secondary payloads retain explicit transient provenance.
Owned statuses use a separate `sourceKey`; `holdDischarge` lets a finisher
retain its own Impales. Burst payouts enter shared mitigation, damage
attribution and kill credit without recursively generating attack procs.
Scheduled throws preserve the original damage multiplier. Time Fuse contact
retains its weapon until the delayed hit resolves.

Hard recovery locks are independent of numeric cooldowns; the existing hotbar
sweep displays the lock. Airborne glyphs, actual fallen axe constructs and
directional sweep voices convey the combat state without instruction captions.
Visual dials live in `render/vis/attackSequenceVoice.ts`.

Respec, changed investment, unseating, owner death and zone transitions retire
owned jobs, recoveries, wounds and payloads. Missing recovery objects release
the lock. Stacks and weapons in flight are transient, never serialized.
Existing tree node IDs remain intact. Heavy Wave and Serrated Wave exchange
positions; the normal saved-tree validation applies the new prerequisites.

## Verification

- `npx tsx balance/probe_cleave.ts`: 114 assertions for both trunks, payment,
  target cycles, owned wound consumption, geometry, recovery lifecycle,
  missed/mixed catches, repetitions, delayed hits and projectile inheritance,
  plus independent/composed sweeps and Long Edge with Heavy Wave. Regression
  cases drive real movement into airborne/fallen markers, socket real gems
  through the inventory API, and check component repeat/damage/tempo/cost
  routing, rollback on respec and repeat cleanup.
- `npm run check`: game, launcher and simulation type checks.
- `npm run sim -- run --suite smoke`: five scenarios across five seeds.
- `npm run probe`: shared engine and content regression suite.
- `npm run build`, then `npx electron balance/cleave-ui.cjs`: hidden disposable
  window; tree labels at two sizes, airborne/fallen axes, real movement catches
  and pickups, and opposed sweeps.

These are initial tuning values. Playtesting should particularly compare the
five-hit wound payout, wide maximum swings and repeated catch novas.

Verification snapshot (2026-09-24): all 297 standard probes passed (the eight
slow and three excluded probes were outside that run). Type checks, the
five-scenario/five-seed smoke suite, production build and the hidden visual
checks passed. The final targeted Cleave run also covers missing landing-marker
placement. Visual captures were inspected for tree labels, airborne/fallen axe
readability and the two opposing sweeps.

Branch-swap verification (2026-09-25): 95 Cleave checks, starter-tree and
preview probes, type checks, smoke suite, production build and hidden visual
checks pass. The two sweep leaves work independently and compose in either
allocation order; Long Edge and Heavy Wave combine in three points.

Recovery/support QA (2026-09-25): all 114 Cleave assertions and all 299 standard
probes pass (eight slow and three excluded probes were outside that run).
The smoke suite and hidden Electron checks pass, including ordinary movement
into both airborne and fallen pickup circles. A clean verification copy of
the Cleave changes also passes all three type checks and the production build.
The new movement regressions reproduced the solid-marker bug before the fix;
component admission regressions likewise reproduced Multistrike's refusal.
