# Impact starting-skill trees

Breaker, Vanguard and Lancer now have complete starting bars: nine skills,
135 nodes, four points earned at levels 5/10/15/20. Each keeps a four-rank
neutral passive, two exclusive trunks, and mixable descendants.

| Class | Skill | First identity | Second identity |
|---|---|---|---|
| Breaker | Sunder Maul | Slower, deeper stance breaking | Broad sweep retaining native poise damage |
| Breaker | Earthquake | Three quicker, lighter tremors | One later, wider, harder aftershock |
| Breaker | The Verdict | Heavy execution and culling | Faster sentences and optional movement blessing |
| Vanguard | Charge | Reliable stuns and poise damage | Bleeding, impaling contacts |
| Vanguard | Shockfront | Parallel walls of force | A wall returning toward the moving caster |
| Vanguard | Marching Bulwark | Stronger release bash, thinner guard | Timed parries, weaker release bash |
| Lancer | Skewer | Larger lodged banks | Wider distribution of lodged steel |
| Lancer | Pinning Spear | Parallel planted shafts | A single bleeding, impaling spear |
| Lancer | Extraction | Larger wound detonation, smaller returning bank | Smaller detonation, larger returning bank |

Unallocated skills keep their original effects, costs, tags and delivery.
Neutral investment does not change delivery or timing. Verdict still requires
a Sundered target and retains its native live broken-poise payoff. Charge
keeps its committed run. Marching Bulwark keeps its mobile tower stance.

## Reusable mechanics

`over.ground.pulse` replaces the full native pulse identity.
`instancePulsePlan` reads the resolved delivery, so real zone timing and
support-appended rhythms agree. Additional pulse count still deepens the
native rhythm; duration modifiers do not retime an armed aftershock.
The shared validation rejects nonfinite clocks, invalid counts and pulse
overrides on skills without a native ground pulse.

`over.recallImpales` replaces the radius, victim share and returning spear
share of native Extraction effects through `instanceEffects`. It retains
native bank consumption and mitigation. The homeward shot still has its own
small base hit in addition to the stated share of stored damage. No new rule
restricts native Extraction to banks lodged by the caster.

Tree-derived Extraction flights record their precise source instance.
Respec removes that instance's flights while preserving another instance's
shots, including shots from the same caster. Existing field and construct
cleanup also retires aftershocks and planted shafts.

Extraction utility blessings explicitly trigger on use, including use with
no lodged steel. They do not imply a refund, a hit, or successful consumption.
Temporary blessings use the existing source-specific respec cleanup.

## Candidates and sequence

The [central skill-and-support backlog](skill-support-candidates.md) contains
the future proposals, their evidence and status. This pass adds the narrower
question of preserving impale banks between hits and refines the distinction
between planted objects and lodged wounds in the device-salvage investigation.

Continue complete starting bars, then mastery swap coverage, then trees for
alternate skills. No new support is needed merely to duplicate the existing
impale, returning-projectile, planted-spear and pulse-support tools.

## Verification

`balance/probe_impactstartertrees.ts` checks all 72 terminal routes through
real casts, budgets, neutral transparency, allocation order, save/network
rebuilds, delayed pulse timing, appended supports, Sundered targeting, bank
shares, returning damage, planted objects and respec ownership. Type checks,
the full fast probe gate, balance smoke and a production build accompany the
batch; a hidden Electron pass checks all nine rendered trees and allocation.
