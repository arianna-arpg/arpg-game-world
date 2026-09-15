# Hivecaller, Ranger and Guardian starting trees

This second class batch covers nine opening skills, using the shared 15-node
binary tree: a four-rank neutral passive, two exclusive identities, and
mixable descendants beneath each identity. Four total points arrive at skill
levels 5, 10, 15 and 20. Unallocated skills keep their original forms.

| Class | Skill | First identity | Second identity |
|---|---|---|---|
| Hivecaller | Hivecall | A serial army with rapid hatching, detonation and Royal Guards | A resource-driven Swarm Sovereign transformation, aura and emergency rescue |
| Hivecaller | Raise the Gnatveil | Passive accumulation, reserve floor, decaying overflow, cluster and dive | Native hit gauge, eggs, protected transit and furious whirlwind conducting |
| Hivecaller | Command: Assault | Individual preparations consumed by each minion's next attack hit | Individual approach protection that breaks after a landed hit |
| Ranger | Piercing Arrow | Armor-piercing impales and execution | Multiple piercing arrows, steering and returning volleys |
| Ranger | Fan of Blades | A concentrated piercing fan | A returning fan with more blades and broader coverage |
| Ranger | Quickstep | A fast, fragile sprint | Preparation for a projectile hit with aim and offensive bonuses |
| Guardian | Hammer of Judgment | Multiple close-orbit hammers without outward drift | Straight piercing hammers that return to the casting point |
| Guardian | Aegis Ward | Retaliatory thorns alongside the shield | Sustained recovery alongside the shield |
| Guardian | Rallying Howl | Fragile protection alongside the ordinary rally | Individual attack preparations alongside the ordinary rally |

Hivecall remains a toggle contract, now with three base slots and serial resurrection.
Its army and Sovereign branches are detailed in [Hivecall](hivecall.md). Capacity is not free reservation capacity. Gnatveil retains
its native wandering motes. Its expanded trees now use native mechanics instead
of grafting supports; see [Raise the Gnatveil](gnatveil.md) for all nodes,
independent source clocks, batch exceptions, overflow and clustering.
Protective plies remain discrete investments. The shared combat profile,
recall command, and lossless armor handling are documented in `throng-combat.md`. Baseline
viability is independent of tree investment. Purchased plies use full actor
state, with the processing cost described there.

Command: Assault keeps its six-second order. Duration investment in the new
blessings changes those blessings, not the underlying order clock. Each
minion spends its own preparation independently. Fragile protection mitigates
the hit that breaks it; blocked or evaded blows and damage-over-time ticks
follow the shared buff rules. Quickstep's preparation is spent by a projectile
hit, including a spell projectile; its damage bonus is scoped to attacks.

## Shared additions

`absorbPower` scales the amount of explicit skill absorb effects, using the
caster and granting skill's modifiers through `skillAbsorbAmount`. It defaults
to 1, preserving every plain absorb effect. Ally recipients do not substitute
their own absorb investment. Targeted, self and hit-resolved effects use the
same resolver, as does the skill preview. Duration and strongest-pool refresh
retain their existing rules. Resource-payment shields and overheal rewards
retain their own bounded formulas and are not multiplied a second time.

Ordinary minion commands now promote matching owned lightweight throng rows
through the existing interaction boundary before issuing orders. The
promotion honors the command's radius and source-skill restriction; squad-only
orders do not recruit a keeper's swarm. That lets pooled gnats receive the
same orders and tree-granted blessings as full actors. A live buff prevents
demotion so it cannot vanish merely because the minion became quiet.

Tree data lives in `src/data/frontierStarterTrees.ts`. Regression coverage in
`balance/probe_frontierstartertrees.ts` exercises every terminal route, neutral
ranks, locks and mixed forks, save/network rebuilds, contract births and
reknitting, source grafts, pooled command participation and absorb scaling.
The first batch remains documented in `class-starting-skill-trees.md`.
