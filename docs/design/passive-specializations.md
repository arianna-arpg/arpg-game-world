# Passive specializations

The main Star now contains **2,188 nodes**. This additive pass introduces 25
schools: **225 small passives, 64 notables and 11 keystones**. Every payoff
has a useful two-port entrance, a choice of two connected training nodes,
and a capstone reachable only through those feeders. The 75 new entrances
connect 124 existing travel junctions. Neither old nor new capstones acquire
an investment bypass. The optional menus do not count as physical forks.

Content is in `src/data/passiveSpecializations.ts`; positions, links and
player payloads remain explicit editable rows in `src/data/passives.ts`.
`scripts/author-passive-specializations.ts` is a deterministic one-shot
placement tool, not a runtime generator. It uses spatial buckets to check
node/edge clearance, graph distances to choose useful crossings, and the
shared whole-tree topology audit. Subsequent changes use the visual editor.
The editor preserves the specialization registry import and every payload.

## What can be specialized

| Schools | Small investments | Payoffs / tradeoffs |
| --- | --- | --- |
| Fire, cold, lightning | Element damage, ailment magnitude, resistance | Penetration, ailment chance, fire → cold → lightning → fire preparations; element devotion trades one school against another |
| Melee, spell, ranged attacks | Damage, reach, casting economy, accuracy, projectile speed | Close-range sustain, melee/spell preparations, duration spells, distance-sensitive attacks, slower piercing projectiles |
| Instant, timed, channel | Mode-specific damage, cost and duration | Reciprocal instant/timed preparations, stationary recitals, slower stronger timed spells, channel ramp/thorns, narrower stronger channels |
| Swarm, skeleton, skeletal mage, skeleton archer | Family/body damage, life, movement | Family limits, action speed, regeneration and formation trades |
| Golems; stone, bone, fire, ice, blood individually | Family/body damage, life, movement | Shared family limits; granite damage reduction, marrow life, furnace damage, glacial movement and blood regeneration |
| Close, middle, far distance | Bounded damage/accuracy, radius | Bounded ailment/critical payoffs and smaller areas with greater damage inside the selected band |
| Poise/armor, energy shield/ward | Armor, poise, regeneration, shield, ward, mana | Poise-break defense/offense exchange; stationary recovery; full/low shield rewards; ward at a life cost |
| Rhythm | Varied/repeated combo damage, duration | Movement/projectile preparations and combo-dependent damage or sustain |

All of this is native passive investment: **no graft grants** and no extra
mandatory choice menus. Ordinary tagged modifiers, gauge thresholds and
bounded proc definitions compose the powers. Cast-triggered preparations
have a 95% trigger chance, 2-second internal cooldown, 5-second lifetime and
are spent on the matching landed hit. Elemental relays form a directed cycle;
melee/spell and instant/timed preparations allow alternating rhythms.

## Shared context contracts

- `cast:instant`, `cast:timed`, `cast:channel`, `cast:held` are query scopes,
  derived by `castScopeTag`. Cast speed does not turn a timed skill into an
  instant one. Admitted Gathered Casting, Overcharge and Guarded Casting
  supports change their corresponding context. Held charge/guard skills are
  deliberately separate from channels and ordinary timed casts.
- `minion:<family>` and `body:<monster id>` are query scopes. Membership is
  explicit, overlapping data in `src/data/minionFamilies.ts`, registered into
  `engine/skillScopes.ts`; the engine never guesses a family from a name.
  The resolved summon delivery determines context, including tree-selected
  pools. A pool only receives memberships shared by every possible body.
  A mixed skeleton/zombie pool therefore does not receive a skeleton cap.
- When inheritance is baked, the actual creature replaces the summon's body
  and family scopes. One mage in a mixed pool cannot borrow a sibling mage's
  exact-body investment. Existing batch scaling, shared golem limits,
  reservation prices and replacement behavior still apply.
- `registerVictimDistanceBand` installs configurable half-open distance
  intervals into the existing victim-condition registry. This content uses
  **[0,120), [120,300), [300,infinity)** world units, measured center to center
  at impact. Moving a target across a boundary immediately changes the hit
  context; area radius does not move the distance boundaries.
- Proc skill gates and landed-hit buff consumption now read resolved skill
  context, so tree variants and casting-mode preparations use the same tags
  as their damage. Combat reads no passive-node ids.

Existing saves remain valid: all old node ids and links are retained, with
only new ingress edges. Run/account compatibility versions remain 3/1.

## Verification

`balance/probe_passivespecializations.ts` covers all 75 investment paths from
both entrances through both feeders; whole-tree geometry and forks; editor
row/content agreement; registered scopes; family and exact-body inheritance;
real cap replacement and refund; casting-mode support conversions; exact
range boundaries and actual damage; real preparation consumption, cooldown
and refund; threshold reset; slower-cast cost; save and co-op reconstruction.

Run `npm run check`, `npm run probe -- passive`, the full green probe suite,
and `npm run sim -- run --suite smoke`. Build before the isolated hidden
`balance/passive-routes-ui.cjs` client test. It verifies real allocations,
search visibility, capstone investment, and serialization of all **1,372**
expansion nodes from the route, investment, crossroads, weave and
specialization passes. The specialization screenshot is written to
`balance/reports/passive-specialization-cluster.png`.

Verified against the committed game plus this pass in an isolated snapshot:
all game/launcher/simulation type checks; production build; 256/256 standard
green probes (489 specialization checks); 25 smoke episodes with no deaths
or balance-band violations; hidden client allocation and editor checks at
1400×1000 and 1000×720. The seven slow and three excluded probes were not run.
The snapshot kept concurrent, unfinished engine changes out of this result.
