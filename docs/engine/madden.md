# The madness bank

Contract for Maddening Miasma (`SupportDef.madden`), its `surface:standing`
gate, and the held lane the support matrix measures it on. Ruled 2026-09-30.

## The bank

Madness is one dwell ledger per skill instance (`World.maddenBankOf`, a
`MaddenBank` held in a `WeakMap` keyed by the instance). Every standing
placement that any cast of the skill lays wears that same bank:

- ground discs, the converging clap twin and re-cast clones;
- wall segments (`GroundDelivery.line`: Flame Wall, Glacial Rampart);
- fissure segments (`layFissure`, including the melee-fissure lash);
- native-march ripples (an innate cascade or the `aoeCascade` stat);
- curse fields (Miasma's worn haze, Miasmic Ground's planted patch);
- the lifted linger field (`dropLingerField`).

Seconds bank **per frame** in `updateZones`, beside the exposure ledger: an
enemy on the field's story standing inside an exploded, living placement gains
`dt`. A body is credited once a frame however many placements overlap it (a
crack or a wall is one ground). The pool is the caster's enemies on the field's
story, never `zoneVictims`, whose curse-allies coin would draw randomness every
frame.

- **Accumulated.** Leaving keeps the seconds, and so does re-casting. An
  exclusive ground that relocates on re-cast (Netherfissure, Grasping Chasm,
  Miasmic Ground's patch) keeps them too.
- **Spent.** When a body's bank reaches `after` (6 seconds, less
  `MADDEN_CFG.epsilon`) and it is not already maddened, `maddened` lands and
  the bank resets for that body. Seconds keep banking through the four-second
  bout, so a body held in the ground is mad about four seconds in every six.
- **Forgetful.** As placements retire, `expireZone` drops dead or unloaded
  bodies from the bank.
- **Transient.** Never saved or wired; a reload starts every bank empty. The
  bank is re-minted when the graft's `after` changes.

The epsilon exists because 360 frames of 1/60 sum to 5.999999999999984: a body
that stood a 6.0-second ground's whole life must still count six seconds.

### Why per frame

The old ledger added the zone's whole `tickInterval` at each tick. Grounds that
tick every 9 or 10 seconds (Rune of Power, Soporific Veil, Thunderstorm,
Thurible, War Chant) maddened a body present at the first tick within a second,
and never maddened one that arrived a frame later. Every ticking ground prepaid
one interval (a 5.92-second Spore Bloom maddened), and tickless sweep surfaces
banked nothing.

## The gate: `surface:standing`

`standingSurface(inst)` in `engine/skills.ts` admits a host only when its
placements stand. It reads the resolved instance (tree overrides, grafts,
sockets), never a skill list:

- the ground delivery's own `lingerDuration`;
- pulse beats on a disc or wall (an innate pulse, a pulse gem, a `pulseCount`
  mod), which impose a linger;
- a fissure texture gem on a crack, which imposes its linger;
- a curse-field gem (Miasma, Miasmic Ground);
- a surface-granting lift (a `lingerField` mod, a `healField` gem).

Flash grounds refuse: curse rings, conjures, strikes with no linger. Bare
`surface`, the gate of the sibling surface gems, is unchanged.

The matrix census gates the same resolved instance: a `skill@branch` host
derives its tree-node grafts as `recalcSeat` does (`pinHostTree` in
`sim/compat.ts`), so Despair's Profane Ground and Worn Grief branches, whose
grafts stand curse fields, fit there as the game admits them.

Known limits:

- Character-sheet lifts (a passive's `lingerField` or `pulseCount`) are
  invisible to a socket gate, exactly as for bare `surface`.

## The held lane

The live probe's pack chases a kiting pilot across placements, so a dwell
payload almost never banks there. Dwell payloads (`DWELL_SUPPORT_FIELDS` in
`sim/compat.ts`) probe on the dummy lane instead:

- solo pilots stand still (`turret`), so the dummy stays in every placement
  aimed at it and in any ring that follows the caster;
- escorted hosts keep their pair pilot;
- live host rules that only guard the host's own value or fuel (heal, buff,
  guard, corpse) carry `yieldsToHeld`; agent hosts (summons, minions, grabs)
  still route live;
- the `dwell` probe policy doubles the dummy window to 20 seconds so banks that
  fill across casts fit;
- the fingerprint's `status_ids` already records the madness, so no new channel
  is needed.

Before the bank landed, the lane agreed with pinned-body measurements on all 83
hosts both could measure, and it exposed nine false-inert ledger rows that the
chase had hidden.

## Extending

- A new mint that stands ground for a host must wear `this.maddenBankOf(inst)`,
  and the `madden` row in `data/graftReadSites.ts` must name it.
- A new dwell payload joins `DWELL_SUPPORT_FIELDS`.

## Verification

- `npx tsx balance/probe_madden.ts`: the gate, the frame clock, every standing
  mint, banks across casts, spending and forgetting, the held lane.
- `npm run sim -- matrix check --support maddening_miasma`.
