# Hivecall: the swarm and the Sovereign

Hivecall starts with a maximum of **3 Swarmlings** and births **one** on activation.
The paid contract fills one missing slot every **4 base seconds**. A full wipe
therefore returns at 4, 8 and 12 seconds. Respawn-time investment affects this
clock. Maximum count still costs 7 base reserved mana per slot. Skeleton Warriors
also start at a maximum of 3.

## Army branch

| Node | Native behavior |
| --- | --- |
| Teeming Contract | +2 maximum, +1 ply. A death fully heals surviving Swarmlings and grants each an extra ply. No life or damage penalty. |
| Crowded Cells | +5 maximum; after the normal wait, missing bodies hatch every 0.2 base seconds. 20% less life and size. |
| Venomous Remains | Death leaves a 52-radius poison pool for 4 base seconds, ticking every 0.5 seconds for 4–6 base chaos damage and applying poison. |
| Sacrificial Chitin | Enrage costs 8 base mana on an 8-second base cooldown; detonates all base bodies for 20–30 base chaos damage in radius 85 and immediately replaces them at full life. |
| Royal Guard | Half maximum count, rounded normally; Royal Guards have 200% more life, 100% more damage, 50% more size and 35% more action speed. |
| Needle Mandibles | Guards gain 20% melee impale and Poison Spit. |
| Brood Wardens | A guard's first hatch is 10 seconds after birth, then every 10 seconds. Two ordinary offspring per hatch live for 8 base seconds; duration investment applies. They inherit ordinary minion investment, excluding the guard conversion and its kit. They never reserve mana, evict parents, or fuel Sovereignty. |
| Hive Tending | Per rank: 15% increased minion life and damage, +1 maximum Swarmling, and 15% increased damage while transformed by Hivecall. Four ranks. The form bonus applies only to the Sovereign and updates with allocated ranks. |

All Swarmlings retain full actor durability and an armor damage floor of 25%
before other mitigation. Death-granted plies survive owner-stat rebakes. Silent
dismissals/cap eviction do not pay death rewards. Offspring capacity is twice
the paid parent capacity, so duration investment cannot create unlimited broods.

## Sovereign branch

The saved node ID `royal_guard` is retained, with the visible name **Swarm Sovereign**.
Each base Swarmling death grants 20 Sovereignty, capped at 100. Enrage spends the
bar to transform for `18 × meter / 100` seconds. A new form has a separate health
pool equal to 150% of the hero's maximum life. The carried hero and paid swarm
contract remain intact. Form death ejects the hero and clears the bar; it does
not count as a player death. Enrage or the form's Hivecall slot returns manually.

The form has Venom Mandibles and Poison Spit. Royal Ferocity adds 30% more damage,
25% more attack/cast speed and **Royal Cataclysm**, a 10-second-cooldown poison
storm. Crushing Mandibles doubles the base abilities' damage, increases their
area by 50%, and adds two Poison Spit projectiles. It does not double Cataclysm.

Royal Carapace creates a 180-radius aura while transformed. Wounded allies and
the Sovereign gain 3 seconds of Enrage (30% more damage, 40% increased attack/cast
speed). Nearby base Swarmlings absorb up to 60% of life damage, split evenly;
each can absorb at most its remaining health. This is shared life damage after
the victim's mitigation, not another attack against protective plies. The aura
never crosses stories. Crown of Ruin emits a 30–45 base chaos nova on entry and
on voluntary/timed exit, and reduces the manual transformation cooldown from
4 to 2 seconds. Forced ejection and travel do not emit the exit nova.

Deathless Succession intercepts lethal hits and damage over time with **strictly more
than 20** Sovereignty. It leaves the hero at 1 life and transforms immediately,
ignoring the manual cooldown. Return restores 40% of maximum life. Repeated
rescues in a refreshing 20-second window multiply duration, form health and
recovery by `0.5^prior rescues` (minimum factor 1/256). The streak clears after
20 quiet seconds. Costs, scripted sacrifices and direct kills are not wounds
and do not trigger this rescue.

Perpetual Reign hatches up to two missing paid bodies on entry. Base deaths
while transformed add 3.6 seconds to the form, capped at 18 seconds remaining.
Without this node, deaths during the form do not generate Sovereignty.

## Presentation and lifecycle

The skill shows a resurrection countdown, or a Sovereignty bar and form timer.
The HUD state is carried in co-op snapshots. Node IDs remain save compatible;
combat resource, form and cooldown state are transient. Unequipping/respeccing
the transformation host safely ejects its form. All tree mechanics are native;
neither trunk consumes a socket or grafts a support.

Data: `src/data/hivecall.ts`. Economy helpers: `src/engine/hivecall.ts`.
Runtime integration: World contract, death, possession, and life-wound seams.
Verification: `npm run probe -- hivecall`, frontier trees, possession, tier
sovereignty, minion contracts, Gnatveil regression, sim smoke and hidden UI checks.

## Living Sovereignty

Swarm Sovereign also gains 2 Sovereignty per second while at least one base
Swarmling lives. Additional bodies do not accelerate this passive gain, and
temporary offspring do not count. Perpetual Reign permits this gain while
transformed, offsetting 0.36 seconds of form decay per second.
