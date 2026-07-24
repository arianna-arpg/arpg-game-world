# THE DROVE — the pen gives way, and the fold runs loose

The farmland's honest accident, and the Straying's sibling: two worked-country
events, two different verbs. The bell **calls** (the Straying: a creeping
conversion tug against a dormant court); the pen **spills** (the Drove: a
plain gathering — panicked stock, a broken rail, a reeve who wants every head
back ALIVE). Nearly non-combat by design: the fight, if any, is the land's own
(the predators that already hunt critters keep hunting these — that emergent
pressure IS the clock), and the pay is gear in the drover's own words.

## The shape

- **Overlay** (`packages/overlays/drove.ts`, `DroveField`, durable): owns the
  settle/gather/absent lifecycle, the head ledger (loose/penned/lost) and THE
  PEN'S REMEMBERED SEAT (`noteStaged(id, heads, penX, penY)` — staged once;
  re-entry finds the wreck exactly where it fell). Seat fabric + latent-on-
  unknown + a widening rumor omen, the Straying's exact laws. `droveOn()` is
  what the engine reads; `notePenned()`/`noteLost()` are what it reports.
- **Def** (`packages/defs/drove.ts`, `DROVE_SURGE`): every number a knob —
  seat envelope, `biomes` (THE BELT LAW: a list, never a hardcode), head
  band + `headTable` (pasture kinds, kept `'critter'`), `scatter`,
  `penRadius`/`penRingR`, the drive dials (below), the absent die
  (`reeveWinChance`), the scattered hold (`scatterHoldSec`,
  `scatterFactionMul` — beasts range a lost fold), and the reward block.
  `validate()` walks the whole purse chain — tables minted, register
  families registered — the net against a silently empty payout.
- **Scene** (`world.ts` `updateDroveScene`): stages the CONCRETE half in a
  spilled zone and reports back. The Straying's scene idioms throughout
  (materialize beat, phase edges, throttled sweep, zone-local body refs).

## The drive wheel (herding as positioning)

A loose head mills at a spooked post until PRESSED — any player inside
`driveRadius` (freehold folk inside `assistDriveRadius`: the crofters flank
what you flush) pushes a blended flee vector, and the head runs AWAY at
`drivePace`. Herding is therefore positioning: circle wide, come in from the
pen-far side, walk the knot home. Deliberately pathing-blind — `moveActor`'s
wall-slide is how the rail ring FUNNELS a driven head along the fence to the
gap. Quiet for `calmSec`, a driven head re-plants its milling post. Heads keep
their own critter brains and tags (the wolf/morale contract — predators hunt
them, objectives exempt them, the flock moves a pressed knot as one body);
the scene's roster is the only ledger.

A head standing the pen ground (`penRadius`) out of anyone's hands is
**PENNED** — paid by the head (`xpPerHead`) and posted inside the rail. The
grab fabric composes free: a carried ewe counts the moment she is set down
inside. A head that dies out there — a wolf, a fox, a careless swing — is
**LOST**. The last head accounted flips the phase: one penned head is enough
to GATHER (the reeve pays what came home); every head lost SCATTERS the fold
(ledger, the beast hold, no purse).

## The collapsed pen (event dress)

`Doodad.eventDress` — the OPEN sibling of `weatherDress` for world-event
scenes (any event names itself; same law: runtime-only, presence derived from
the tag, never persisted, never in layouts). The Drove plants a rail ring
torn open at a hash-derived gap (`droveHash` off the pen seat — re-entry
rebuilds the SAME wreck, no rng), fallen rails at the mouth, the drover's
litter; the reeve (`drove_reeve` — freehold folk law: no xp, no nemesis)
posts at the gap. On GATHERED the mended pen stands a while then dries away
(`evap`); on SCATTERED it dries fast; a collapse that resolved while nobody
stood the ground is caught by the once-per-visit orphan sweep. The transience
doctrine end to end: the event borrows the farm, never owns it.

Generation meets the event halfway: farmland rolls the **`stock_fold`**
landmark (the `fence_ring` builder — post-and-rail carpentry, the gnasher
pen's civilian cousin — with trough, bales and livestock spawns), so working
pens stand in the world before the Drove ever asks for one.

## The pay (THE PASTORAL REGISTER)

The Royal/Drowned Register grammar in the farm's voice — three affix
families at thin natural weight (world-rollable, never cache-locked):
**Oxdrawn** (shoveAuthority + impactDamage — the mass fabric worn as gear),
**Fleece-Bound** (local armor + cold res), **of the Fold** (life + mana
regen). `pastoral_register_pick` forces one per piece via
`LootEntry.withFamily`, deliberately MAGIC-LED (`rarityWeights` 70/30 — the
reeve pays a day's honest herding, not a king's ransom); `drove_purse` is
the gathering's payout (1–2 register pieces + a thin side taste), paid as
OWED drops at the pen beside `gatherXpBase` and a LOW `gemChance` from the
drover's chest. **The flawless rate**: every head penned alive (`lost === 0`)
rolls the register once more — "round them up alive" honored to the letter.

## Ledgers & Vault

`drove_seen` (unlock: witness one) · `drove_heads_penned` (per head — the
Grazier tier counts the act) · `droves_gathered` (Reeve's Right Hand) ·
`droves_scattered`. Tuning rides the package card (weight/start level), the
Straying's exact surface.

Probe: `balance/probe_drove.ts` (belt/latent/bookkeeping/absent-die laws,
worldstate byte-identity incl. the pen seat, def integrity incl. the purse
chain, and the LIVE engine end to end: dress + reeve + drive + pen + purse +
scatter + the remembered-pen round trip). Dev: Events tab → "Drove (pen
breaks here)".
