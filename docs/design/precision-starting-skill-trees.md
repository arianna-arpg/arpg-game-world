# Assassin, Blademaster and Brawler starting trees

The nine trees in `src/data/precisionStarterTrees.ts` complete these three
starting bars. Each uses the shared 15-node anatomy: a four-rank neutral
passive, two exclusive trunks, two mids per trunk and two leaves per mid.
Only opposing trunks exclude one another; sibling investments commute.
Four points arrive at skill levels 5, 10, 15 and 20. Unallocated skills keep
their original behavior; neutral ranks strengthen the original identity.

## Gameplay routes

| Class | Skill | First identity | Second identity |
| --- | --- | --- | --- |
| Assassin | Rend | Sustain and spread deeper bleeding wounds | Send a traveling crescent through a pack |
| Assassin | Eviscerate | Consume a bleed and reopen the wound for the next execution | Splash a successful execution into nearby enemies |
| Assassin | Invisibility | Reposition and regenerate while concealed | Prepare one stronger landed attack that survives leaving concealment |
| Blademaster | Iai Strike | Draw through enemies and leave bleeding wounds | Gain a brief defensive and movement blessing from the draw |
| Blademaster | Zanshin Cut | Prepare a lighter bleed every second completed cut | Prepare a stronger bleed every fourth completed cut |
| Blademaster | Riposte | Counter attacks aimed at nearby owned minions | Trade a shorter stance for a stronger counter |
| Brawler | One-Two | Repeat each jab and Cross Jab, banking extra Fury | Work through poise with slower, impaling punches |
| Brawler | Chain Pull | Fan out several stunning chains | Pull a bleeding, impaled target into punching range |
| Brawler | Haymaker | Spend exactly two Fury and preserve the remaining bank | Sweep a wider arc with the original full-bank spender |

Eviscerate still requires a bleeding target before payment. Reopened Wound
consumes the old bleed before applying the new one on a landed hit. Crimson
Execution uses ordinary splash: secondary hits use half the skill's damage,
without copying the primary target's consumed-bleed bonus. Splash radius now
uses the shared area-radius modifier, including socket investment. Allies and
other stories remain excluded.

## Shared mechanics

- `instanceCastCycle` resolves a complete tree override of a native completed-use
  cycle. Repeated echoes do not advance it. The granted preparation uses normal
  effect duration and next-hit consumption. Allocation changes retire both its
  tracked buff and counter.
- Combo finishers derive `comboTreeMods` from their host on each `comboStepOf`
  lookup. This carries One-Two's skill-local investments into Cross Jab without
  duplicating level or socket modifiers. Finishers retain their own delivery.
  Respec retires cached child instances and their outstanding work. Save and
  network payloads store the host allocation; the inherited modifiers are derived.
- `guardHoldTime` adds seconds to guards with a native maximum duration, with a
  0.05-second floor. `parryCounterBonus` adds a multiple of incoming damage to
  the resolved counter. Both default to zero. Guard success, break and ordinary
  release use the shared cooldown stamp, preserving local recovery and HUD totals.
- Assassin's Intent is a separate, consumed-on-hit attack buff. Offensive action
  still breaks true invisibility normally, but the preparation remains until a
  landed attack or its own expiry. Both buffs are tracked for respec cleanup.
- Haymaker's measured spender uses the existing complete `over.chargeCost`
  contract. Insufficient Fury rejects before mana payment; sockets retain their
  existing spender precedence.

## Verification and follow-up

`balance/probe_precisionstartertrees.ts` checks all 72 terminal routes through
real casts, allocation order, level budgets, neutral transparency, resource
payment, support admission, save/network reconstruction and respec. Focused
combat cases cover the bleeding execution loop, splash reach, concealment and
preparation, both completed-cut cycles, repeated finishers, timed counters and
owned-minion interception, pulls, Fury spending and timed draw movement.

Finish the remaining classes' starting skills before the mastery pass. Then
audit every class mastery for an alternate skill to swap in, followed by trees
for those alternate skills. The shared roadmap is
`docs/design/class-starting-skill-trees.md`.
