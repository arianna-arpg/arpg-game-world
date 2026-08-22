# THE SCALD KIT — K1: the monster side, the folds, the geyser-step spike

**Built 2026-08-21** against the kit charter `docs/design/scald-kit.md` (v2,
WALKED — cards 1–8 ratified, card 3 amended by THE RUPTURE LAW; parent
`docs/design/scald-basin.md` §8/§8b/§9). The compounding law's third layer:
the basin's THEMES (scald / steam / pressure / geyser-step / prism)
graduate out of the terrain into KIT — monsters first (THE MIRROR LAW),
the player's pieces after (K2), one spike pulled forward at her word
(GEYSER-STEP — "actually sounds incredible and I really want to see how
that ends up playing out in-game"). Registry leaf + the probe's census:
`src/data/scaldkit.ts`. Probe: `balance/probe_scaldkit.ts` (roster:
green/fast). Every number is a DIAL (unblessed — she blesses via
playthroughs).

Three laws bind everything here: **THE NO-LOCK LAW** (a player piece
works ANYWHERE — the country is where it SHINES, never the only place it
works; acquisition may be country-shaped, effect never is), **THE MIRROR
LAW** (every player piece has a scald monster wearer — the player sees the
verb before owning it), and **THE NO-TAG LAW** (every demeanor commits or
quits by a clock — a vent-rider relocates, never hovers).

## THE SCALD BANK (`StatusDef.bank` — `scalded`; THE RUPTURE LAW)

`scalded` is now a RESOURCE. `engine/status.ts StatusDef.bank = { capMul,
duration?, wetMul? }`:

- **AUTHORED applications bank** (`Actor.applyStatus` with a `casterId` —
  a skill hit, a proc rider, a kit verb): the application's dps ADDS to the
  standing instance's dps (`existing.dps += dps`), capped at `capMul` × the
  strongest single application that ever fed it (`ActiveStatus.bankPeak`);
  the clock stands to the longer of what remains and the bank's own
  `duration` (× the applier's effectDuration). `scalded`: capMul 4,
  duration 5, wetMul 1.5.
- **CASTER-LESS applications never bank** — ground rows, creep grants, the
  fog, the weather, the runoff, the burn rain — they keep the row's own
  `stackPolicy` (strongest-wins) and its 1.2s clock, byte for byte
  (absent == identical for every standing terrain sting; probe A6/B3). A
  terrain-born instance starts banking from the first authored blow's peak.
- **THE WET FOLD**: an authored application onto a WET body banks
  ×`wetMul`. Wet = `Actor.isWet()` — any stand state in
  `WET_STAND_STATUSES` (`wading`, `swimming`, the new `soaked` splash
  marker) OR `Actor.rainWet`: THE RAIN-WET STAMP (`World.updateWetSky`,
  cadenced `WET_SKY.sweepSec`) marks every body under OPEN SKY beneath a
  front whose `WeatherDef.wets` holds (rain, storm, the basin's mineral
  rain) at ≥ `WET_SKY.minIntensity`; roofs (structures + `DoodadRule.shelter`
  overhangs via `underRoofAt`) read dry, sheltered zones read dry through
  `skyFront`'s own law. Dry baseline exact (probe B2/B8/F10).
- **THE BANK READ**: `ActiveStatus.bankFrac` (0..1 = dps / (peak × capMul),
  `bankFracOf`) is restamped wherever the bank moves; the renderer scales
  `StatusDef.bodyFx` by it when `bodyFx.byBank` is set (`scalded`: a blister
  glow + rising steam wisps — nothing at no bank, one wisp at a faint bank,
  three near the cap); the wire ships it as `StatusW.bk` (the tells-wire
  idiom — a derived scalar, never the source numbers).
- **THE RUPTURE** (`RuptureEffect { status, fraction, mul? }` — an on-hit
  SkillEffect → `World.ruptureBank`): consume `fraction` of the target's
  banked instance and deal it NOW as a burst of the status's own element —
  the remaining banked DoT (dps × stacks × seconds left) × fraction × mul,
  mitigated like any typed blow against the rupturer, CREDITED to the
  rupturer (a killing burst pays its XP). Never over-consumes: the fraction
  clamps to [0,1], the instance's dps shrinks by the share spent (a whole
  fraction expunges it), no bank → nothing. Generic: any banked status may
  be spent. Monsters wear it first (the scald lancer's Pressure Throw); the
  player's Boil Over is K2's.

## THE VENT (`VentEffect` — a planted fog bank) + THE VAPOR RIDE

`VentEffect { bank, radius, duration }` plants a REGISTERED `FogBankDef`
at the resolution point (ground deliveries at the target, everything else
where the skill resolved — the lightwell-planting effect's sibling):
`World.plantVent` → `fogEnsure()` → `FogField.plantBank(def, at, reach ×
√area, life × effectDuration)` — a fixed seat, lobes rolled on the field's
own salted stream, MORTAL (`FogBank.mortal`: it dissipates at life's end
and is spliced out, never re-gathered). The bank's own row does the rest.

The `steam` kind (data/scaldkit.ts): white, dense, short-lived, grants
`fogveiled`, and **`occludesSight`** — THE VAPOR RIDE: `engine/los.ts
OccEnv.opaqueAt?(x, y)` is sampled along every `'sight'` ray at the doodad
cadence, START INCLUDED (the veil rule — inside the white you are blind
both ways); the first swallowed sample stops the eye as `RayHit.kind
'medium'`. World supplies `opaqueAt` ← `FogField.occludesAt` (the same
`bankCovers` predicate the grants read — drawn == tested == unseen), kept
to one integer read when no occluding bank stands (`FogField.occluders`).
Shots never ask (steam is not a wall): the `'shot'` channel is
byte-identical. Every consumer of `lineOfSight` / `sightClipD` — AI
perception, the watch fans, hostile targeting's refusal lanes — loses a
body the white has swallowed (probe D4–D6). NOTE: the Cistern Crone's
`steam_veil` is a CONJURED cloud of the cloud-craft fabric (status-only
concealment) — a different seam; the kit's `steam_vent` plants this bank.

## THE PRESSURE GAUGE read (`rounds:<skillId>`)

Card 6: the magazine / empower grammar IS the bank — no new resource. The
tells fabric gains the `rounds` source (`engine/tells.ts` — `TellBody.
roundsOf?` ← `Actor.roundsOf(skillId)`: the kit instance's live use-charge
bank as count/max, the SAME bank `useSkill` spends). Worn in K1 by the
scald lancer's PRESSURE-PACK (a full pack = the finisher is loaded) and the
spout-hopper's STEAM-JET LEGS (live jets = hops in the pot). The kettle
bladder's gauge is the accumulator family's (`drive:pressure`).

## THE VENT-RIDE (`LeapDelivery.vent`) + GEYSER-STEP

`LeapDelivery.vent = { columnR, scale? }` — the leap RIDES A COLUMN:

- the cast's wind-up (`useTime`) is a drawn BROIL under the caster's own
  feet (`render/vis/ventRideLayer.ts drawVentRideBroil` — the geyser
  fabric's one roil word, `geyserLayer.ts drawRoil`; the ramp = the cast
  bar) and the dodge-minds read it (`World.imminentThreatTo`'s leap+vent
  branch returns the caster's own feet at `columnR`) — drawn == tested;
- at take-off the departure point ERUPTS: the skill's own hit on every
  enemy inside `columnR` (× `scale`, default 0.6 — the column is the smaller
  half), through the ordinary pipeline (OWNER-SAFE: a player's vent is not
  terrain — allies untouched), the bells rung, the flash drawn at the
  tested disc;
- the flight carries `LeapState.vent` — the renderer lifts the body along
  the arc (`VIS_CFG.ventRide.lift`) and draws the departure jet
  (`drawVentRideJets`, the first `jetFrac` of the flight); co-op ships
  `CastW.vent` / `LeapW.vent` so clients draw both;
- the landing is the leap's own slam.

Monsters first (THE MIRROR LAW): the vent-shaman's `vent_ride` escape (cast
AWAY from the target — it RELOCATES, never hovers) and the spout-hopper's
`spout_hop` (a magazine of two). The player's **`geyser_step`** (THE SPIKE):
a spell/fire/aoe/movement leap — 0.35s wind-up, range 340, airTime 0.5,
radius 84, vent columnR 40 × 0.6, fire [9,15] + a banked scald (×1.5 on a
wet target); movement-tagged (a saddle refuses it — the mounts law);
single-mode (trees are the skill-modes waves'); dev-obtainable NOW through
the standing dev lane (the Gems tab lists every `SKILLS` entry; the account
unlock gate keeps it out of loot until K2 wires acquisition). QA launch
row: `arpg-dev-qa70` (port 5159).

## Existing kin gain kit (charter §5)

- **vent_shaman** + `steam_vent` (a steam bank at its feet when pressed and
  hurt) + `vent_ride` (the escape when crowded; the geyser-step's monster
  half).
- **kettleback** + `kettle_burst` at the brim (a ground nova of boiling
  water: fire, a banked scald, the splash SOAKS — the follow-up scald banks
  ×wet: the self-enabling combo); `scald_jet` becomes the half-full poke.
- **stilt_strider** + `scalding_lunge` (a reaching thrust with boiling
  water on the spear — the wading prey pays the wet fold).

## FAUNA WAVE 3 (`data/monsters.ts` / `looks.ts`; THE NEW-PIECES PREFERENCE)

| kin | family · fabric | the verb | new piece(s) |
|---|---|---|---|
| **scald_lancer** (geyserkin) | SCALD · the bank + the rupture | `sinter_lance` banks; `pressure_throw` (a magazine round) RUPTURES 60% of the bank — the tribe's finisher, cast when the mark is banked | `sinterLance`, `pressurePack` (the gauge reads `rounds:`) |
| **vaporling** (beast) | STEAM · the watch fabric's SLEEP posture (hunts by footfall) + `x_seek_fog` | lives inside steam; plants its own (`steam_vent` via the new generic `lacksStatus` AI condition on `fogveiled`); `vapor_lash` banks out of the white | `vaporBody` (live), `steamTrail` (live) |
| **kettle_bladder** (beast) | PRESSURE · the accumulator family | `drive:pressure` fills the bladder; at the brim `bladder_vent` (a wide soaking scald nova) then the slump; killed early → a modest death-burst (the safe pop) | `pressureBladder` (the `fill` gauge IS the body) |
| **spout_hopper** (geyserkin) | GEYSER-STEP · the vent-ride + a magazine | `spout_hop` in (far) / out (hurt), two rounds that rebuild; `hopper_jab` on foot; dry = commits (NO-TAG) | `spoutOrgan`, `steamJetLegs` (puff by `rounds:`) |
| **terrace_warden** (beast) | PRISM · the attunement fabric (`tune`) | re-tunes to the last blow's tone and pulses it; `mineral_slam` | `sinterPlates` (the tells re-draw them in the worn tone — one row per `attuned_*`) |

Seated across the scald faces' packs with presence envelopes (terraces:
hoppers + wardens; fields: lancers, hoppers, bladders, vaporlings; the
Char: lancers; the heart: bladders, vaporlings, wardens, lancers; the
galleries: vaporlings, bladders) — scald tilesets ONLY (probe G7). The
kettle tongue grew three epithets in both mills.

---

# K2 — THE PLAYER PIECES + ACQUISITION

**Built 2026-08-21** against charter v3 (§3 the five families, §3.1 THE
RUPTURE LAW, §4 acquisition — ratified, §7 the roster cut, §8 K2). Probe:
`balance/probe_scaldkit.ts` sections I–Q (171 pins with K1's). Single-mode
by the charter's §6 — the mode trees are the skill-modes waves'. QA launch
row: `arpg-dev-qa71` (port 5158).

## The pieces (data/skills.ts + data/supports.ts)

| family | skills | gem |
|---|---|---|
| **SCALD** | **Scalding Lash** (melee cone; banks) · **Kettle Burst** (ground nova; banks + SOAKS, so the next scald banks ×wetMul — the self-enabling combo) · **Boil Over** (targeted; RUPTURES 60% of the mark's bank, splash 70) | **Boiling Point** (`applyWet_scalded` — your hits scald WET targets only) |
| **PRESSURE** | **Head of Steam** (channel; pours rounds into every PATIENT bank) · **Blowhole** (`ventAll` storm — the whole bank spends, every round one more column; a dry press still spits) | **Pressure Seal** (`useChargeGraft` + `still` — a patient bank on a bankless host) |
| **GEYSER-STEP** | **Geyser-Step** (K1's spike; acquisition wired here) · **Vent Hop** (dash; `trailVent` steam banks along the run) | **Afterspray** (`departSplash` — the DEPARTURE point erupts) |
| **STEAM** | **Vent Veil** (ground, noImpact; plants the `steam` bank at the aim — id and name deliberately distinct from the Cistern Crone's conjured `steam_veil`) | **Vaporize** (`proc_vaporize` — a landed blow flashes a bank where it struck) |
| **PRISM** | — (supports/vestiges only, charter §3.5) | **Mineral Tuning** (`tuneFavor` — THE FAVORED PULSE) + the mineral vestiges *Sinter · Travertine · Sulphur · Vitriol* and the words **Scalding Grip** / **Terrace Stair** |

## The engine seams K2 added (each generic, none scald-shaped)

- **THE WET RIDER** — `applyWet_<status>`, a generated family beside
  `apply_<status>` (engine/status.ts), rolled in the SAME resolveHit sweep
  against `Actor.isWet()`. The armed lists merge in STATUS_IDS order, so a
  dry target and an un-armed sheet walk the RNG stream exactly as before.
  "Chill wet targets" is as authorable as scalding them.
- **THE PATIENT BANK** — `useCharges.still = { bleed }` (+ the same field on
  `useChargeGraft`): the bank's clock advances only while
  `Actor.skillBankStill()` holds (past `BANK_STILL_GRACE`, no dash, no
  flight) and MOTION bleeds rounds off it at `bleed`/s, carried on the
  bank's own timer. A manual magazine has no clock and neither builds nor
  bleeds. `restoreSkillCharges` gained `scope: 'still'` (Head of Steam feeds
  the patient banks and nothing else).
- **THE VENT PRESS** — `useCharges.ventAll`: the press spends the WHOLE bank
  and the cast grows by the rounds spent — storm strikes and projectile
  shots fold into their own counts, every other delivery resolves that many
  extra times (the stepsFromBank law, spending all). A dry press casts plain
  and is never refused or converted (the empower law's dry clause).
- **THE STEAM TRAIL** — `DashDelivery.trailVent`: a registered fog bank
  planted every `spacing` units of travel (the Fire Walker trail grammar
  aimed at the fog fabric; reach and life fold at the cast).
- **THE DEPARTURE SPLASH** — `departSplash`, read at `World.moveBlast(phase:
  'depart')` — moveExplode's one-ended cousin (the two scales SUM at a
  departure). Row on data/graftReadSites.ts.
- **THE FAVORED PULSE** — `tuneFavor`, read at `World.attuneCrystal` with
  the STRIKING INSTANCE's own context (skill-local gem mods in scope): the
  wash spares the striker's enemies and runs ×(1+favor) on their side.
- **THE PROC VENT** — `ProcEffect { type: 'vent' }`, the kindle case's
  sibling: any trigger may plant a registered bank where it landed.
- **`bankless`** — a SUPPORT_MECHANISMS predicate: the host carries no
  native bank and no munition conversion, so a granted bank would actually
  stand. The "one economy per slot" law spoken at socket time instead of a
  silent no-op; self-lifting when the munition gem beside it leaves.

## ACQUISITION (charter §4, ratified — found in the country, owned everywhere)

- **THE GEM FLOOR** (`engine/loot.ts` GEM_FLOORS / `registerGemFloor` /
  `gemFloorFor`): a country may floor gems into the KILL-PATH drop pool of
  its own ground. On the six scald tilesets the kit drops before the account
  has unlocked anything, at `GEM_DROP_CFG.floorMult` weight; everywhere else
  the account-wide pool is the law (the vendor shelf and the standing
  order's odds never read a floor — only `World.dropGemAt` does). The
  cistern needs no row: it is an under-STORY of the sulphur_pools face and
  rides that floor.
- **THE LEDGER OPENS THE POOL**: `gem_skills_scald` (+ `sup_scald` behind
  it) — a gatework ANY-OF over `SCALD_KIT_UNLOCK_LEDGERS`
  (`great_geyser_entered` / `geysermaw_slain` / `cistern_entered`), teased so
  the roads print. Buying it carries the whole kit — geyser_step included —
  into the account-wide drop + vendor pools.
- **THE VENDOR RUNG** follows for free (the shelf reads the same pool; the
  probe pins the standing order's odds turning non-zero).
- **K1's dev-only gate on `geyser_step` is now THIS unlock** — the dev Gems
  tab still lists it, as it lists every skill; that lane was never the gate.

## THE DISPLAY-NAME COLLISION (K1's owed, paid)

The PLAYER's ground nova keeps `kettle_burst` / "Kettle Burst". The
kettleback's verb became `kettleback_burst` / "**Shell Burst**"; the surge
chip's combo payoff `tempo_vent_burst` became "**Tattoo Burst**". The probe
now runs a standing census over the whole book and the whole shelf: a NEW
collision fails, and the five legacy pairs are named with their whys in the
rig (a debt with a name, never a silenced test).

## The matrix pass (13 slices, all clean)

Two gems earned honest BLINDNESS rows in `src/sim/compat.ts` (the probes
cannot raise their conditions): the **wet rider** (no probe stands a target
in water, rain or a splash) and **tuneFavor** (no probe pack fields a
TUNABLE body). The rest reconciled into `balance/baselines/support_matrix.json`
as open rows — every one an instance of a standing per-gem class, never a
new mechanism defect:

- `pressure_seal` +106 — the **deep_reserves class**: 75 of 78 inert hosts
  are cooldown hosts, where a pilot that paces by the cooldown never spends
  a magazine's freedom (the sibling gem carries 135 such rows already).
- `afterspray` +8 — exactly the residue its graftReadSites row names:
  movement-TAGGED bodies that never travel (cloak, stealth, gate_shift…).
- `vaporize` +32 — hosts whose damage never arrives as a layer-0 hit
  (curses, walls, trail/zone-borne movement skills — the proc depth law).
- the seven skill filters +59 — standing gem backlogs meeting new hosts of
  the same shape (ringing_report/noise vs a dummy, kill-scoped procs vs an
  immortal target, sigil shapes on cones, mana_floor cost twins).

None was adjudicated `intended` — that is a human sign-off, and the notes
above are the record to sign.

## Open (her walks + the coordinator)

- **Every number is a DIAL, unblessed.** The ones most likely to want her
  eye: Scalding Lash's rank (sweep skills l5: 104 dps vs a field median of
  19 — a 0-cooldown cone), Blowhole's bank shape (max 4 / recharge 4 /
  bleed 0.5), the rupture fraction 0.6, Boiling Point's 60% wet chance,
  Afterspray's 55%, the vestige lines.
- **Boil Over reads LOW in the sweep (3.26)** — honestly so: the dummy rig
  never banks a scald first, and the two-verb family's whole point is that
  it spends what you banked. A banked-target scenario would measure it.
- **An observation for the coordinator, not this pass's to change**: a blow
  fully absorbed by a `shellGuard` re-tunes nothing (the probe strips the
  shell to measure the attunement lane). The knock law admits an INVULNERABLE
  blow — "the blow connected" — so the shell arguably deserves the same
  reading. One line in resolveHit, someone else's fabric.
- Her look review of the wave-3 kin (K1's, still owed).
- The skill-mode trees for all eight pieces (K3 — the skill-modes waves').
