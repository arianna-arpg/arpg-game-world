# Berserker, Sorcerer and Cleric starting trees

`src/data/devotedStarterTrees.ts` completes the three starting skills of each
class, as listed in `src/data/classes.ts`. It uses the shared binary builder:
15 nodes per skill, one four-rank neutral passive, two exclusive trunks, two
middle nodes per trunk and two leaves per middle. Only rival trunks exclude;
all descendants within a trunk mix. Four points arrive at levels 5/10/15/20.

| Skill | First identity | Second identity |
|---|---|---|
| Heavy Strike | Buried Maul: slow, heavy impales and execution | Fault Wave: traveling force, repeated fronts and crowd control |
| Whirlwind | Rooted Vortex: pull enemies inward and ramp damage as movement drains away | Blood Dance: mobile bleeding, spreading wounds and sustain |
| Dash | Headlong Entry: prepare one melee hit | Breakaway: temporary speed and protection broken by a landed hit |
| Infernal Ray | Siege Furnace: narrow, immobile beam with a stronger quadratic ramp | Roaming Furnace: wider mobile flame with a modest linear ramp, optional automatic revolution |
| Storm Call | Storm Residence: persistent shocking ground | Thunder Sequence: successive delayed strikes for one payment |
| Ice Shield | Glacial Reservoir: mana rebuilds a dented shell | Mirror Ice: timed parries and invested release bashes |
| Sanctified Strike | Communion Strike: melee healing chains that exclude the caster | Pilgrim Arc: traveling damage and one mend per crossed ally |
| Mend | Passing Grace: reach a wounded group through chains | Banked Mercy: store overhealing as temporary absorb |
| Consecration | Sanctuary Floor: sustain and bank surplus healing | Purgatory Floor: spreading burns with reduced healing |

Unallocated skills retain their original costs, damage, requirements, effects,
delivery and cast modes. Passive-only ranks retain the exact authored effects,
tags, delivery and channel objects. Numeric strengthening is skill-scoped.
This is a playstyle expansion, not a claim of equal encounter performance.

## Shared mechanisms and composition

All numbers live in data. Damage/ailment modifiers, conditional hits, impales,
displacement, sweeping grafts, repeat trains, channels, temporary buffs,
parries, bashes and healing/overheal use their existing shared engines.
Scalar arc and channel-ramp replacements belong only to exclusive trunks;
descendants add independent modifiers. Automatic revolution is an optional
leaf with no competing facing replacement elsewhere in its trunk.

`SkillTreeNode.conduits` adds resource pumps through `instanceConduits`, beside
native and socket-granted pumps. Each allocated rank contributes its authored
rows; derived values are rebuilt from picks, never stored in saves or on the
wire. The existing validator checks pump specs and whether their host can
engage them. Glacial Reservoir drains 4% of unreserved maximum mana per second, returns
2 guard per mana, and stops at 25% of unreserved maximum mana or full guard. Conduit efficiency
modifies the exchange rate. It only runs while this skill is held and seated
on the bar. Socket pumps can compose with it. This avoids requiring a poise
pool on the starting Sorcerer. Tree reset cancels the stance and removes the
pump; no permanent player-sheet source is introduced.

Mend and Consecration's absorb is earned from actual overhealing, through the
existing strongest-shield pool (six seconds, capped at half recipient maximum
life). It does not scale with `absorbPower`. Mana-payment shields remain a
separate earned-payment path with their ordinary cap and duration. Earned
absorb is not clawed back on respec; future casts lose the removed investment.
Healing chains choose wounded eligible allies, so a full-health ally is not
chosen merely to receive an overheal shield. Sanctified Strike can mend each
ally in its arc and chain from each such mend; a recipient may receive more
than one independently originated chain. Traveling arcs mend each directly
crossed ally once. No tree removes Sanctified Strike's caster exclusion.

Two small shared defects surfaced in the real-engine checks and are fixed:

- Healing chains now carry `excludeCaster` on every hop and skip downed
  recipients. Direct healing and mixed healing areas also reject downed
  recipients. Healing is not a revival action.
- `clearTreeFields` cancels queued repeats for the exact caster and instance,
  alongside its existing cancellation of fuses, fields and held stances.

Dash blessings use the existing source-tracked temporary-buff path. Headlong
Entry consumes on a **melee hit** (including a melee-tagged spell); its bonuses
use that same tag, so an unrelated projectile or spell cannot waste it.
Breakaway protects the hit that breaks it; damage-over-time does not spend it.
Traveling identities use the shared melee-sweep modifier and gain the sweep
tag, admitting sweep supports and refusing redundant sweeping conversions.
Heavy Strike's traveling identity also gains area and duration; Storm Residence gains duration;
Dash gains buff and duration. Actual resolved behavior drives support fitting.

## Verification

`balance/probe_devotedstartertrees.ts` is enrolled in the fast gate. It runs all
72 terminal routes through real casting and damage/heal/guard behavior, checks
the level milestones, neutral transparency, locks and fork composition, and
round-trips every route through character saves and network seat rebuilding.
Focused checks exercise healing exclusions, traveling single-touch mends,
chain falloff and source ownership, overheal accounting, persistent fields,
repeat attribution and respec, channel movement/ramps/payment, conduit exchange
and floors, parries/bash release, and consumed/fragile Dash blessings.

The batch also runs type checks, the full fast probe gate, balance smoke,
production build and hidden desktop allocation checks for all nine trees.
UI checks use throwaway userData and saves under ignored `balance/reports`.
