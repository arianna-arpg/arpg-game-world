# The Field Discipline — loadout surgery is a camp habit

Skill **unlearning** and support **socket/unsocket** stay free — but in the
field they demand a cool head. The point is anti-abuse texture, not
friction: no hot-swapping gems mid-boss, no unlearning your way out of a
commitment — while the workshop stays a workshop.

## The law (engine/skills.ts `SWAP_DISCIPLINE_CFG`)

Outside sanctuary, all three surgeries require:

- **Blades cold** — no player-side blow dealt or taken inside `calmSec`
  (`World.lastCombatAt`, the merc-parley clock; "the blood is still hot").
- **No foes pressing** — no live hostile inside `foeRadius` ("foes press too
  near"). The scan mirrors the merc parley's: non-passive, non-untargetable
  — **training dummies never count by construction**, not by name.

Unlearn alone adds the **quiet-clock clause**: refused while the skill's
cooldown ticks ("its clock still turns", `unlearnOffCooldown`) or while it
is the active cast ("mid-cast", `unlearnNotCasting`).

## The workshop law

Sanctuary ground — zone `objective.kind === 'safe'` (Lastlight, the sim
arena, any future haven) — **waives everything** (`sanctuaryWaives`). Fall
back to town and swap on a whim; test at the rack with no side effects.
This is one structural truth, not a zone list: ports (objective 'none')
stay disciplined; the balance harness's arena is safe by declaration, so
sim scenarios are untouched by construction.

## One law, one voice

`World.swapRefusal(seat, kind, skillId?) → string | null` is the single
predicate. The engine gates (`unlearnSkill` / `socketSupport` /
`unsocketSupport`) refuse with `failNote` floating those words; the panels
disable the same buttons with the same words (`Unlearn (the blood is still
hot)`, the "Socket into (…):" strip, the unsocket ✕ tooltips). Co-op and
couch obey by construction — every mutation routes through the seat-scoped
`applyAction` into the gated engine calls.

## Deliberately NOT gated

Bar re-binding (choosing a seat is play, not surgery), gem leveling (only
ever forward), passive-graft rebinding (tree powers), learning (adding is
never an escape), and gear swaps (the wardrobe's own liberty — worn slot
grafts arriving/leaving mid-fight is the item fantasy working).

Probe: `balance/probe_fielddiscipline.ts` (workshop waiver incl. hot blood
at the rack, all three refusals in their words, refusals leave state
untouched, the unlearn-only clock clauses, the passive-dummy exclusion, and
both config dials proven live).
