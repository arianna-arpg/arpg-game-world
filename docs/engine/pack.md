# THE PACK LAYER — enemies whose SOCIAL state is visible

`src/engine/pack.ts` · probe `balance/probe_pack.ts` · rides
[THE TELL FABRIC](./tells.md)

## The thesis

A group of enemies read as N independent bodies. In truth the roster has
carried social machinery for a long time:

| machinery | what it does | how visible it was |
|---|---|---|
| `MonsterDef.bond` | proximity mods from a living holder | nothing |
| `MoraleSpec` | breaks, panics, rallies, borrowed courage | one `!!` at the break |
| `SquadSpec` | muster, tokens, surround, idle demeanor | inferrable at best |
| `juvenileBelow` / `juvenileBrain` | the young behave differently | nothing |
| `DriveSpec.share` | a pack that eats together sates together | nothing |
| `PerceptionSpec.alertShout` | the sentry's callout | nothing |

A mob with an invisible structure is a mob. The same mob with its structure
drawn is a puzzle with a correct kill order. **This chip is the READ, not a
new buff system** — every mechanic below already existed; the pack layer
binds each one to something the eye can find.

## The four bodies

### 1. THE WARDEN — the buff is DRAWN

`MonsterDef.bond` has always made a pack harder to kill from somewhere off
to the side, and nothing ever said *where*. Now a line runs from the holder
to every body it is actually empowering.

```ts
bond: {
  kin: 'gnoll_matron',
  mods: [mod('damageTaken', 'more', -0.18), mod('damage', 'increased', 0.15)],
  radius: 430,
  link: { color: '#e0a94e', style: 'banner', weight: 2 },
}
```

`link` is authored on the **beneficiary** (the bond seam's own direction).
Absent = the `PACK_CFG.links` defaults, so *every* bond in the bestiary is
legible out of the box; `link: false` is a deliberately invisible bond.
Styles: `beam` (a taut line of light), `banner` (a travelling swell showing
which way the favor flows), `root` (a sagging ground-cord — vegetal,
chthonic), `chain` (dashed segments — bound service).

**DRAWN == TESTED, by construction.** The link list is not a second
proximity scan that might disagree with the first. The bond sweep in
`World.update` records *which* holder it found (`Actor.bondFrom`) at the
same instant it decides `Actor.bondHeld`; `packLinks()` is that record.
The mods and the line are one answer. Taking the *nearest* holder rather
than the first in array order costs nothing (squared compare, no `sqrt` —
strictly cheaper per candidate than the old `dist()` call) and buys the
honest read.

**The share law** (`PACK_CFG.links`) is modelled on the light budget's
(`VIS_CFG.lights.share`): a total cap, a per-holder cap so one warden
cannot flood the layer, and a deterministic drop order — authored `weight`,
then proximity to a **view-bin-quantized** centre, then ids. The kept set
changes only at bin crossings, never per frame as the camera pans. Because
the budget can drop a line, the beneficiary also wears `WARDED_LIFT`: a
culled link still leaves its body reading as buffed, so the cap can never
quietly lie.

### 2. THE CRAVEN — nerve, not a binary break

`MoraleSpec` decided a binary break. `Actor.aiNerve` is that decision's
continuous shadow: **1 steady, 0 breaking**, stamped by `updateMorale`
from the *same terms the break itself evaluates* (the `aiFoeCastSec`
precedent). Posture cannot drift from courage.

- `nerveFromLife(frac, breakAtLife)` — 1 at full, 0 at and below the line
- `nerveFromOdds(foes, friends, deficit)` — 1 even, 0 at the full deficit
- `nerveFromProximity(nearest, radius)` — the skittish lane; a hare frays
  before it bolts
- `boldNearLeader` pins nerve to 1 — borrowed courage reads as courage,
  which is the information "kill the captain" is built on
- routing pins `PACK_CFG.nerve.routed`

Bodies that author no morale read **1** — the brave default.

Worn through `CRAVEN_COLLAPSE`: the body **sinks** (the `scale` channel,
now SIGNED — a sac engorging and a coward folding are one channel read two
ways), cants **back** off its facing, and greys toward ash. The magnitude
is clamped by `TELL_CFG.maxBodyScale`, so a cowering body is never a
smaller target — the breathe law holds.

### 3. THE MATRIARCH AND HER YOUNG

`juvenileBelow` / `juvenileBrain` existed and were barely used — and the
authored `juvenileBrain: { type: 'flee' }` means *run for the exit and
leave the zone*, so a sounder's young deleted themselves the moment you
arrived and a den never read as a den.

Two fixes, both data:

- **`Actor.juvenile` is recorded**, not just acted on. Before it, a
  juvenile was a one-way brain swap nothing could ask about afterwards —
  so the matriarch could not know whom she was guarding.
- **`MoraleSpec.wardTo`** — a rout that runs **to** its guardian: the
  refuge machinery with a *body* for a bolt-hole. It composes with every
  flight behavior already authored (jukes, panic statuses, the skittish
  bubble) and falls through to the ordinary rout when no guardian stands.

The adult needs no bespoke guard-AI: the young drag the threat into charge
range and the juggernaut does what a juggernaut does. **Geometry, not a
script.** One rule sharpens it — `ext: { wardsNear: 1 }` commits her charge
sooner and further, read off the same brood count her tell draws.

**The agreement law.** `wardNear` (the young's half) and `broodNear` (the
guardian's half) key on **one** threshold, `PACK_CFG.ward.huddleRadius`. An
earlier version used the tight *arrival* ring for the brood count and the
wide easing band for the ward — the probe caught a calf reading
`wardNear 1` beside a sow reading `broodNear 0`. A guardian may never read
"no young" while a young beside her reads "guarded".

### 4. THE COURSING PACK

`DriveSpec.share` already made a pack that eats together sate together, and
nothing showed it. `Actor.packAgg` is the squad's fold — living kin, and
the **mean** of every drive across them — computed once per squad and
shared **by reference** with its members.

Three reads answer three different questions a player actually asks:

| tell | question |
|---|---|
| `HUNGER_LEAN` | is *this* wolf hungry? |
| `PACK_HUNGER_CREST` | is the **pack** hungry? (spines multiply with the shared meter) |
| `COURSING_NOSE` | are they busy eating something that is not me? |

The promotion is a **group** decision, authored off the group meter:

```ts
{ when: { ext: { packDrive: { id: 'hunger', below: 0.35 } } },
  use: { target: { detectMul: 0.4 } } },              // fed: walks past you
{ when: { ext: { packDrive: { id: 'hunger', above: 0.85 } } },
  use: { target: { detectMul: 1.5, kindBias: { player: 1.6 } } } },  // starving: you are prey
```

"Avoid them while they are fed" becomes a tactic whose state you can see,
rather than a fact you learn by dying.

## The condition vocabulary

`registerAICondition` had existed as an open seam with **nothing registered
through it**. The social layer is its first tenant; every predicate reads a
stamp the pack sweep or `updateMorale` already wrote, so a rule that fires
on it and the tell that draws it read one number.

| `ext` key | arg | reads |
|---|---|---|
| `nerveBelow` | `number` | `Actor.aiNerve` |
| `wardsNear` | `number` | `Actor.broodNear` |
| `packDrive` | `{ id, above?, below? }` | `Actor.packAgg.drives` |

## The tell sources

| source | reading | bounded? |
|---|---|---|
| `nerve` | 1 steady → 0 breaking | yes |
| `warded` | wearing a bond's mods | yes |
| `warding` | bodies this one empowers | **band it** |
| `guarded` | guardian proximity, 1 at her flank | yes |
| `brood` | warded young huddled at this body | **band it** |
| `juvenile` | rolled young at spawn | yes |
| `kin` | living squadmates in earshot | **band it** |
| `packDrive:<id>` | the squad's mean of a drive | yes |
| `coursing` | predation is open (`Actor.aiPrey`) | yes |

`kin` is the clearest illustration of the band's power: `[1, 8]` reads a
swelling horde, `[8, 1]` reads *"I am the last one"* — the same source,
told two ways.

## The player's side

The slayer lane (`engine/damage.ts` `mitigateTyped`) gains its first two
**social** axes — plain stats, so passives, affixes and uniques may grant
them too:

- **`bondbreaker`** — MORE damage vs a body wearing a bond. The drawn link
  says *"kill the holder and they all soften"*; this says *"or don't — cut
  straight through the favored instead"*. Two live strategies against one
  visible structure is the whole reason to draw the structure.
- **`quailbane`** — MORE damage below `SLAYER_CFG.quailAt` nerve. It pays
  for pressure you **applied** — flank it, drop its leader, thin its line —
  and the collapsing posture is the tell that says the bonus is live.
  Spentbane's social twin.

Gems: Bondbreaker, Quailbane.

## The laws

- **DRAWN == TESTED** — the link record *is* the bond scan's answer; the
  nerve is the break decision's own arithmetic; the crest is the same map
  the promotion rule reads.
- **CHEAP + CAPPED** — one cadenced sweep (`PACK_CFG.sweepSec`), aggregates
  folded once per squad and shared by reference, links capped by a share
  law with a stable drop order, and a null-cost fall-through on a roster
  with no bonds, no squads and no wards.
- **CO-OP SAFE** — the host ships the holder's id (`ActorW.bl`) and the
  client re-points it through the same actor pool the snapshot keys on;
  both halves then run the identical derivation over their own interpolated
  positions, so lines track moving bodies smoothly instead of snapping at
  20 Hz. Absent `bl` **clears** the pair — a pooled shell never wears a
  stale court.
- **LIVE ENDPOINTS** — rows reference bodies, never cached coords. A link
  can never detach from what it binds.
- **READ-ONLY** — every source is a pure read; the probe pins the social
  state byte-identical after resolving all of them.

## Dials

`PACK_CFG` (`src/engine/pack.ts`): `links` (max / perHolder / viewBin /
default style / halo / pulse / inset / sag / dash), `nerve` (routed floor,
skittishReach), `ward` (seek, huddleMul, huddleRadius), `sweepSec`,
`kinRadius`. `SLAYER_CFG.quailAt` prices the faltering axis.

## Probe

`npx tsx balance/probe_pack.ts` — 91 checks across eight rigs: the registry
weave (incl. the **warden census**: no bond may be entirely invisible), the
pure derivation + share law, THE WARDEN drawn-vs-live on the real world
through a court forming, breaking and dying, THE CRAVEN's nerve against
live wound and odds ramps, THE MATRIARCH's huddle on both halves, THE
COURSING PACK's shared fold, the co-op round trip through the real
serialize/apply path, and the read-only + determinism laws.
