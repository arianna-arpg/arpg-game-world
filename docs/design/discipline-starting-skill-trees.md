# Ascetic, Flagellant and Firebrand starting trees

`src/data/disciplineStarterTrees.ts` completes nine opening skills with the
shared 15-node anatomy: two exclusive identities, two independent forks per
identity, two mixable leaves per fork, and a four-rank neutral investment.
The four points arrive at skill levels 5, 10, 15 and 20. Existing class bars,
mastery rewards and selected-opening/rekindling rules are preserved.

## Identities

| Skill | First identity | Second identity | Neutral, per rank |
|---|---|---|---|
| Mantra Strike | Flowing Palm: 240-degree sweep, 20% less damage; reach, recovery, stun and tempo. | Anchored Palm: 25% physical impale, 15% slower attacks; poise damage, penetration, leech and precision. | 15% increased damage. |
| Wellspring Stance | Iron Stillness: 12% less damage taken and 10% slower movement while active; poise, armor and recovery. | Rising Spring: pump mana 25% faster and deliver 50% more poise per mana; capacity, pressure and mobility. | 10% increased conduit efficiency. |
| Long Exhale | Short Breath: reach full charge 40% sooner, with 20% less damage and shorter Winded; recovery and control. | Deep Breath: 30% more damage, 25% longer charge and status duration; reach, stun and penetration. | 15% increased damage. |
| Ashen Vow | Barbed Vow: active thorns and wound reflection; defensive or offensive retaliation. | Fervent Vow: 15% more damage, 10% more damage taken; attack tempo and conditional low-life protection. | 3 thorns while active. |
| Transgression | Lasting Absolution: stronger, longer standalone wards and stronger held-guard overfill; 20% slower recovery. | Defiant Absolution: prepare the next landed attack for 30% more damage; keep native protection. | 15% increased protection power. |
| Blood Mortgage | Secured Mortgage: active armor and life regeneration; debt recovery and safety. | Aggressive Mortgage: active attack speed with 10% more damage taken; credit capacity and collection. | 15% increased blood-debt metabolism. |
| Incite | Certain Riot: +55% status chance at 20% less radius; reliable Maddened and 90% Befuddlement attempts before resistance. | Vanishing Orator: movement and evasion after the native control attempt; coverage and escape. | 10% increased status/blessing duration. |
| Trumpet Peal | Deafening Peal: guaranteed native Bewilder attempts before resistance, 20% less damage. | Rallying Peal: the native damaging cone also grants nearby allies attack/cast speed; protection or mobility. | 15% increased damage. |
| Harrowing Wail | Relentless Wail: more reliable Harrowing and 50% faster cooldown recovery for 20% less damage. | Dread Sentence: 30% more damage per live Harrowing/Horrified status, with 20% less radius. | 15% increased damage. |

## Starting-kit correction: Transgression

The original Flagellant bar contains no held guard, while Transgression
previously required one. It now spends half of current mana in either mode:

- During a held guard, each mana adds 1.4 shield points and can overfill the
  held shield. The original instant, usable-during-guard behavior remains.
- Otherwise, it buys a three-second absorb ward. Its base amount is the
  smaller of the same 1.4-per-mana exchange and 30% maximum life. Absorb power
  then scales that amount; duration investment scales its timer.
- Protection power scales both modes. A standalone ward keeps the stronger
  existing absorb pool and longer clock, rather than stacking pools. Zero
  mana creates no protection. Cooldown refusal neither pays nor refreshes.

The optional `GuardSurgeEffect.unguarded` declares the fallback; effects
without it still require an actual held guard to do anything. There is no
global relaxation of other skills' guard requirements. `engine/guardSurge.ts`
shares its payment/protection calculation with the live skill preview.
The preview identifies the current mode and shows its actual mana payment
and protection, including the standalone duration.

The ward is paid protection, like other earned absorb pools: it lasts until
consumed or expired, including through a respec. Tree-granted temporary
blessings are source-owned and retire on respec. A held guard still retires
through its existing owner and stance cleanup. The basic empty-slot attack
can consume Defiant Absolution; the class need not find a fourth skill to
use that branch's preparation.

## Native mechanics retained

Mantra's practice stack actually grows on **completed real uses**, including
misses, rather than landed hits. It remains six stacks with native peel
decay. These trees do not replace that stack system or multiply it twice.

Long Exhale's native charge timer uses `effectDuration`, not cast speed.
Its duration branches therefore change both charge time and applied status
duration. The native 0.7–2.4 damage and up-to-1.5 area release scales, cone,
knockback and Winded effect remain. A tree reset cancels a held charge.

Wellspring's native mana-to-poise pump stops at full poise and retains its
35% mana floor. The new modifiers change the existing conduit rate and
exchange efficiency. Self poise grants exist only while the stance is on.

Ashen Vow retains its life upkeep and existing low-life modifiers. Low life
uses the actor's adjustable threshold, 35% by default; the old description's
claim of a fixed half-life boundary was corrected. New descriptions use
the same threshold. Retaliation nodes do not raise the native upkeep.

Blood Mortgage retains its life-price borrowing, reservation, debt cap,
repayment wait and debt lock. It does not turn mana prices into life prices
or turn Ashen Vow upkeep into a borrowed skill cost. The new branch stances
also grant active benefits before blood-priced skills join the build.
Metabolism and attack speed change actual repayment through the existing
regeneration calculation. Reset settles debt through the native teardown.

Incite retains two independent status attempts; no new allegiance or AI rule
is introduced. Harrowing still builds into **Horrified** at its native stack
limit. Dread Sentence evaluates statuses already on each victim for the
damage portion of the cast, then the native status application follows.
Its two payoffs multiply to 1.69 when both statuses are present.

## Additive self aura investment

`TreeAuraPatch` now accepts `selfMods` as well as allied/enemy modifiers.
The self source belongs to the active aura bearer and does not spread to
adjacent allies. Every purchased rank appends its additive aura modifiers;
the scalar override fields retain their existing idempotent behavior.
The original aura spec and node arrays are never mutated.

Deactivation removes the keyed self source even if the **base** aura had no
self modifiers. This covers Blood Mortgage's newly added self grants and
prevents them surviving toggle-off or respec. Existing owner-specific
recipient/source cleanup remains. Tree hover text distinguishes active
self modifiers from modifiers granted to allies and enemies.

Rallying Peal uses the existing cast-completion allied blessing seam:
living same-team recipients on the same story, including minions but not
constructs. Recipients keep the timed blessing after leaving its initial
radius. Respec retires only that caster/instance's captured blessings.

## Verification

`balance/probe_disciplinestartertrees.ts` exercises all 72 terminal routes
through actual casts, budgets and lockouts, mixed forks and leaf order,
neutral behavior, save/network reconstruction and source cleanup. Focused
fixtures also cover the fresh Flagellant ward, real guard overfill, preview,
zero mana and refusal, actual poise pumping, blood-debt repayment and locks,
practice decay, held charge timing, native control, per-victim fear damage,
life recovery, allied rallying and empty-slot attack preparation.

The broader verification includes type checks, existing tree and economy
probes, combat smoke, production build, and hidden in-game allocation checks.
These are initial branch values, not a claim of equal endgame balance.
