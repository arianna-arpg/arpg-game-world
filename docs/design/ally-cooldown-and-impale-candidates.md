# Ally cooldown assistance and deliberate impale preservation

Design audit against **`d4988f67`**, the published duelist/Packed Workshop
checkpoint. This document proposes mechanics; it does not introduce skills,
supports, runtime fields, unlocks or balance promises. Candidate IDs and the
implementation order remain in [the candidate backlog](skill-support-candidates.md).
Numbers below are initial probe fixtures, subject to playtesting.

## Evidence and limits of the audit

Use the named symbols to relocate evidence when line numbers move. Paths are
relative to the repository; line numbers refer to the checkpoint above.

| Evidence | Current behavior and design consequence |
|---|---|
| `src/data/skills.ts:5473`; `src/engine/skills.ts:3636` (`ReduceCooldownsEffect`); `src/engine/world.ts:36018` | Time Dilation's `reduceCooldowns` subtracts flat seconds plus a remaining fraction from each **caster** clock except its own ID. Its tree uses `instanceEffects`; adding ally targeting to the catalog row alone would still wind the caster. |
| `src/data/procs.ts:699`, `:717`; `src/engine/world.ts:43094` | Executioner's Rhythm and Stalwart Rhythm run owner-side cooldown procs. Stalwart's actual effect lacks `exceptSelf`, despite the support's “other cooldown” wording. Preserve this existing behavior in this candidate pass; do not base an abuse proof on the description. |
| `src/engine/actor.ts:1340`, `:2997`; `src/engine/world.ts:29239`; `src/engine/skills.ts:6519` | Clocks and HUD totals are keyed by **skill ID**, not socket-instance identity. Stamping adjusts scoped recovery; `updateTimers` subtracts `dt * rate`, including its tagged-recovery branch. A raw subtraction of 2 is not necessarily two seconds of remaining wait. |
| `src/engine/skills.ts:3261` (`instanceUseCharges`) | Magazines and empower/drip banks have separate state. The presence of a cooldown-map entry does not make every reload/charge clock interchangeable. |
| `src/engine/world.ts:28754` (`resolveTargeting`), `:33093` | The ally pool excludes self and dead actors but does not itself enforce all downed/construct/story rules. Completion checks a dead resolved target; it does not establish the full proposed assistance contract. |
| `src/net/intent.ts:18`; `src/net/snapshot.ts` (`SeatW`, `seatW`, `actorToW`) | Seat intent already carries world-space aim. Current seat snapshots carry resource/life state, not cooldown maps/totals; status snapshots carry IDs/stacks and optional `bankFrac`, not rupture provenance or preservation counts. Multiplayer feedback needs explicit work, not an assumption that the fields already cross the wire. |
| `src/engine/status.ts:427`; `src/engine/world.ts:41464` | `impaled` has an eight-second base duration. A damaging top-level hit consumes the old bank before `impalePower` lodges physical **packet** damage from the new hit. The bank is not a fraction of final mitigated damage. Evades, blocks and immunity return earlier. |
| `src/engine/actor.ts:2605`, `:2696` | A rupture-bearing status has a fixed fuse: reapplication cannot refresh it. Ruptures can add; `casterId` defaults to the first applier. That ID is attribution, not proof that every contribution belongs to that actor. |
| `src/engine/world.ts:35866`; `src/data/impactStarterTrees.ts:154`, `:162` | Extraction removes any qualifying enemy discharge bank in range, without an applier-ownership restriction, then produces a victim pop and a returning projectile. Rending uses 1.8/0.2 bank shares; Crossing Steel uses 0.7/1.1. These manual-payoff routes are shipped. |
| `src/engine/world.ts:43537`, `:43990`, `:46873` | Expiry and non-silent death invoke the ordinary radius rupture. `ruptureStatus` uses damage-taken/resistance scaling; the hit discharge and Extraction use `mitigateTyped`. A preservation flag must not quietly change these distinct existing damage paths. |
| `src/engine/world.ts:42478` (`transplantStatus`) | Spread/siphon/transfusion/Carrier Strain can reapply rupture payloads. Copying a status is not proof of a fresh direct impale deposit. A new manual bonus must not spread with that payload. |
| `src/data/supports.ts:1114` (`skewering_blows`) | The authored impale support adds `impalePower`; it does not preserve a bank. `Preservation` is a different catalog skill, not this mechanism. No matching discharge-preservation support was found in the audited catalog. |

The confirmed gaps are **spending an action on another actor's running
cooldown** and **delaying one's own next-hit impale discharge deliberately**.
Neither gap justifies another generic impaling attack, a larger ordinary
Extraction multiplier, or a second construct relocation support.

## PS-01: Borrowed Second / Shared Seconds

### Proposed first mechanics

**Borrowed Second:** pay 12 mana and a 0.35-second cast to advance one other
eligible ally's longest eligible running cooldown by up to **2 seconds at
that recipient's current recovery rate**. Base skill cooldown: 8 seconds.
Range: 420 units, measured center to center. Select the eligible ally nearest
the aim within a 70-unit aim search; if none, select the nearest eligible
ally to the caster. Tie-break by actor ID. Once chosen at press, retain that
actor through completion; reselect its best eligible clock at completion.
Do not silently switch to another ally after the cast starts.

**Shared Seconds:** socket only on an effective ally-assistance effect.
Replace the single recipient with up to three eligible allies within 240
units of the selected ally and within the caster's 420-unit reach. Include
the selected ally; order the others by center distance to it, then actor ID.
Keep the **same 2-second total budget**, divided equally among recipients.
Discard unused shares; do not repeatedly redistribute into a nearly-ready
clock. No self share, extra casts, per-recipient mana bills or additive
duplicate-gem effects. Radius investment may improve coverage if explicitly
authored, but never increases budget or the three-recipient cap.

The support changes coverage, so its first version needs no damage side stat
to disguise a no-op. It may legally fit while solo; no eligible ally means a
temporary unusable state, distinct from structural socket incompatibility.
No level-based budget growth initially; tune price/reach only after probes
and party playtests. Initial mastery placement remains undecided.

### Recipient and clock eligibility

- Another living, targetable, non-downed actor on the caster's team, present
  in the active world and on the same story. Permit party seats and their
  mobile minions/companions so the skill has a solo crew use. Exclude every
  construct, passive NPC, dormant actor and self, including the caster's
  possessed/current body. Team membership alone must not admit town NPCs.
  For the first player catalog row require a party seat or a minion owner
  chain rooted at such a seat; resolve that chain with a cycle guard. Keep
  this roster policy data-driven so future monster support is possible.
- A currently bar-seated ordinary skill with a finite positive running
  cooldown and stamped total. Deduplicate by cooldown ID before ranking;
  two copies never offer two balances. Pick greatest `remaining / rate`,
  tie-break by skill ID. Reject ambiguous same-ID copies with differing
  effective pacing until clock identity is resolved by a separate change.
- Exclude ultimates, an active cast/guard/channel's host, unseated clocks,
  `instanceUseCharges` banks of every kind, converted/mimicked/meta/combo
  clocks, and effective skills that themselves advance/reset cooldowns.
  Inspect effective mechanics, not class names or a short ID blacklist.
  Ordinary added-cooldown skills remain eligible if all these gates pass.
- An ally with no recoverable capacity is absent from recipient selection.
  No eligible recipient at press refuses **before payment and cooldown**.
  Death, downing, departure, changed ownership/team/story or empty capacity
  during the cast forfeits that recipient's share; the accepted cast remains
  paid. A lost primary target cancels the entire assistance effect.
  Ally aid follows current friendly targeting's wall-permissive policy;
  same-story and distance checks are still mandatory at both gates.

### Budget and loop bounds

Introduce one shared read of the **actual cooldown decrement rate** and
use it in `Actor.updateTimers` and the assistance planner. Do not derive it
by blindly dividing by global recovery or by re-running the stamp formula.
For recipient `i`, snapshot remaining balance `C_i`, positive rate `r_i`,
original stamped total `T_i`, and assistance already spent in this exact
cooldown generation `A_i`. Invalid/missing/zero-rate rows are ineligible.

For `n` recipients and total budget `B = 2`, the one selected clock receives:

```text
share_i = B / n
capacity_i = max(0, min(C_i - 0.25 * r_i, 0.25 * T_i - A_i))
debit_i = min(share_i * r_i, capacity_i)
C_i := C_i - debit_i
A_i := A_i + debit_i
```

Thus `sum(debit_i / r_i) <= 2` at the resolution snapshot, no clock becomes
ready from aid alone, and aid cannot remove more than 25% of a stamped cycle.
This is an instantaneous advancement at the current rate, not a promise
about wall-clock readiness after future slow/haste/timeflow changes.
Keep `cooldownTotals` as the original HUD denominator. The minimum residual
wait is 0.25 simulation seconds at the snapshot rate.

Two additional gates use authoritative world time, outside the reducible
cooldown map: **one assistance budget issued per caster per 8 seconds** and
**one positive assistance receipt per recipient per 4 seconds**, shared
across all instances/sources of this mechanism. Reserve the issuer gate at
accepted press, the recipient gate when a positive debit commits. A failed
or interrupted paid cast cannot refund the issuer gate. A no-capacity share
does not reserve a recipient. Resolution is host-serial: a later cast sees
the first debit and lock. Locks survive socket changes, respec, down/revive
and zone changes within the same run; do not save actor object references.
On saved-run reconstruction, restore bounded remaining locks against the
new world clock, or conservatively apply full 8/4-second gates. A saved
running clock with unknown assistance history receives no more aid until a
genuine new stamp. Save/reload must not manufacture a fresh budget.

Use a cast-family token with one consumable budget. Paid direct casts may
issue it; echoes, repeats, triggers, minion orders and free `executeSkill`
calls do not mint new budgets. Copies can at most share the originating
token; completion consumes it once. Same-frame duplicate input cannot pay
twice or reserve another family. Existing self-side resets/procs may affect
the ordinary skill cooldown but cannot shorten these assistance gates.
This bounds reciprocal rings without rewriting Time Dilation or relying
on its self-ID exclusion. Per-cycle `A_i` resets only at a genuine fresh
cooldown stamp, not a socket edit, HUD update or an assistance subtraction.

### Engine seams and visible result

Proposed schema: a distinct typed `assistCooldown` SkillEffect with budget,
range, recipient policy and count/radius fields; Shared Seconds mutates its
effective recipient view via a structural mechanism gate. Do not change the
meaning or default budget of existing `reduceCooldowns`. Extract a pure
eligibility/allocation helper, then use it for target preview, pre-payment
gate and final resolution. A resolver callback/filter can extend existing
ally targeting; the generic ally pool alone is insufficient.

The committed implementation would need generic cooldown-generation stamps
and spent-budget tracking. Audit direct `cooldowns.set` writers as well as
`stampSkillCooldown`: legacy ordinary clocks must either obtain generation
metadata at their real stamper or be ineligible. Do not infer new generations
from decreases, and do not treat an unknown generation as zero spent.

Show a brief link to each actual recipient and name the advanced ability.
The aim preview and refusal reason use the same eligibility predicate.
For co-op, publish the authoritative result and recipient cooldown state
needed by the HUD; the current snapshot is insufficient. Clients may render
feedback but never decide a debit, a recipient, or a cast-family budget.

## PS-03: Set the Barbs / Patient Steel

### Proposed first mechanics

**Set the Barbs:** a non-damaging enemy-targeted preparation, 6 mana,
0.2-second cast, 8-second base cooldown, 420-unit center reach. Choose an
enemy carrying a positive directly lodged bank deposited exclusively by
this caster. Arm that **existing bank**, preserving it through the caster's
next **two qualifying hits** on that victim, for at most **3 seconds** and
never beyond the bank's existing expiry. One active prepared bank per
caster; refuse a second preparation while one exists. A bank can be
prepared only once in its lifetime, even after the preparation ends.

A protected hit deals its ordinary damage but neither discharges nor adds
impale principal to that bank. This includes that hit's would-be new
`impalePower` deposit from any skill/support. It consumes one protection and
records one successful protected hit. Two hits exhaust protection; the
preparation window remains for manual Extraction, but the third qualifying
hit discharges normally. Empty-air attacks, evades, blocks, immunity, DoT
ticks and depth > 0 secondary hits do not consume protection. Multiple real
projectile hits can consume both protections in one cast; there is no
per-cast free allowance.

The mark belongs to the depositor actor, not to every actor credited to its
account: its minions and co-op allies retain ordinary next-hit behavior.
Their qualifying hits consume the prepared bank normally and lose the
preparation. They can then lodge their own ordinary bank. This explicitly
preserves party-hit behavior; there is no promise that allies will leave
one player's steel undisturbed.

**Patient Steel:** socket on a native effective `recallImpales` consumer,
initially Extraction. Grant a Shift **Set the Barbs** action, using the
same preparation/gates as the standalone skill, and charge 25% more mana
for the supported Extraction. Manually extracting one's prepared bank
after at least one protected hit, before the preparation deadline, uses
**1.25 times its frozen principal** as the input to Extraction's existing
pop and spear-share formulas. No protected hit means no bonus. Ordinary
Extraction can still spend the prepared bank at its normal strength.

The bonus belongs to the precise Patient Steel host instance that armed it;
another copy cannot borrow its investment. Removing that support or
unseating/respeccing its host cancels the preparation and bonus. Standalone
Set the Barbs supplies timing control only; it does not arm another
instance's support bonus. Both access routes share the caster's one-mark
limit, and neither re-arms a previously prepared bank.

### Ownership, growth and consumption

For the first implementation, bank principal **does not grow while
protected**. Freeze `B0 = rupture` when prepared. A larger capped-accumulation
variant remains deferred: even the existing fixed fuse would allow many
deposits, and increasing the peak to raise a cap is a different playstyle.
Using `StatusDef.bank` is not a shortcut: it governs additive DoT `dps`,
refreshes its duration, and is not the impale rupture ledger.

Introduce bank identity and provenance at the direct impale deposit seam:
depositor actor, bank generation, principal and whether that generation is
still exclusively direct. Record preparation generation, source instance,
original deadline, protection count and `preparedOnce` beside that identity.
Do not infer exclusive ownership from `ActiveStatus.casterId`. Preexisting,
manually forged, transplanted, mixed-source or provenance-unknown banks are
ordinary impales and cannot be prepared. A newly direct bank can be eligible
even if the source skill itself is not Skewer.

Any other principal mutation while prepared invalidates preparation before
merging; it must not silently inherit the old bonus. Transplanting/spreading
a prepared status may retain the **ordinary** bank under existing rules, but
never its preparation, exclusive-direct provenance or bonus entitlement.
Moving rather than copying a bank also loses the preparation. Audit all
rupture writers and status transfers, including direct applications and
death propagation; do not implement a marker copied by object spread.

At next-hit discharge, Extraction, expiry, death, cleanse or replacement,
consume/invalidate bank identity **before** applying any damage or spawning
any flight. Exactly one path wins. Expiry and death still rupture the
ordinary principal under their current rules; never the manual multiplier.
Preparation timeout just removes protection/bonus; it neither pops nor
refreshes the impale. The `preparedOnce` fact survives timeout until that
bank is consumed. A lethal protected hit uses the ordinary death rupture,
not a second protected payout. Quiet cleanup cancels preparation without
creating an expiry event. Caster death/downing/departure, allegiance change
or source removal cancels its preparation; it does not erase another
actor's unrelated impales. Do not serialize instance references into saves.

Extraction keeps its shipped ability to consume **other players' ordinary
banks**. A foreign extractor receives ordinary shares, never the prepared
bonus. Changing that existing shared-spend contract is a separate deferred
multiplayer decision. A same-owner supported Extraction grants its bonus
only on a direct manual cast-family with the live matching preparation;
triggered/free/echo executions can at most consume an ordinary bank. The
preparation is gone before returning shots are spawned, so those shots
cannot extract it again or grow its principal.

### Payoff examples and shared seams

For frozen principal 100, normal Extraction has 120 victim-pop input and
50 added physical on the return shot. Patient Steel after a protected hit
has 150 and 62.5. Rending becomes 225/25; Crossing Steel becomes 87.5/137.5.
Each is the existing branch's shares applied once to `100 * 1.25`.
These are pre-mitigation payload inputs, not guaranteed life loss or a
global damage ceiling: returning shots still use normal scaling and pierce
multiple targets. There is no separate added multiplier at the shot's hit
site, nor another ordinary discharge of the consumed 100 principal.

Use one typed preparation effect, one `recallImpales` mechanism predicate,
and a shared bank-lifecycle helper used by direct deposit, hit discharge,
Extraction and status removal/transfer. A `Set the Barbs` meta instance needs
exact host identity, following `relocationHosts`, not only `hostSkillId`.
Generalize the existing `recallTreeSpears`/`clearTreeFields` source tracking
for supported derived shots; current native Extraction caches a shared
`__impale_spear` instance and cannot identify two different investing hosts.
Do not overload `dischargeOnHit` into a new global party-wide personality.

Display the prepared victim, two diminishing barbs and its remaining window.
Describe the trade plainly: “Your next two hits leave this impale intact but
add no steel. Allies can still drive it through.” Publish only derived
owner/count/window/bonus-ready reads for co-op display; the host owns bank
provenance and consumption. The existing status wire does not supply them.

## Executable implementation verification plan

These are future tests, **not passing tests delivered by this document**.
Create `balance/probe_allycooldown.ts` and `balance/probe_impalepreservation.ts`
when implementing; enroll both in `balance/proberoster.ts` before running the
probe gate. Use `makeSimWorld`, `seedGlobalRandom`, real `World.useSkill`
followed by `World.update(1 / 60)`, fixed-damage targets and a failing exit
code, following `probe_impactstartertrees.ts` / `probe_deviceworkshop.ts`.
Private/helper calls alone are insufficient for positive integration cases.
Freeze or subtract natural timer ticks when asserting assistance deltas.

| Rig | Setup and required assertion |
|---|---|
| A1: selection/payment | Put self, enemy, passive NPC, construct, downed ally, off-story ally and valid allied mobile minion around the aim. Only the eligible ally with capacity is chosen. Repeat with no valid ally: zero mana/cooldown/gate change. Verify aim tie/fallback ordering. |
| A2: conserved seconds | Three allies with `C=T=20`, rates 0.5/1/2: shared clock debits are 1/3, 2/3, 4/3 respectively. Sum normalized advancement is 2, not 6. Single-target debit is `2*r`. Two copies of one recipient skill remain one clock. |
| A3: caps/unused shares | One clock with 0.30 normalized seconds left receives only 0.05; excess is lost. Repeat after the recipient lock expires within the same long cycle until the total debit reaches `0.25*T`, then no more aid. Fresh genuine stamping starts a new cycle; a socket/HUD mutation does not. |
| A4: excluded economies | Test native and grafted magazines/drip banks, ultimate, active guard, unseated clock, conversion/meta/combo and Time Dilation. Neither charge counts nor reload timers nor these excluded map entries change. An ordinary added-cooldown attack can qualify. |
| A5: loops/races | Two and three casters reciprocate aid; self resets, block/kill cooldown procs and multiple copies cannot issue a second budget inside 8 seconds. Competing helpers cannot bypass the recipient's 4-second lock. Echo/repeat/trigger/free executions and duplicate input add no new budget. Positive aggregate debit obeys A2/A3 after every event. |
| A6: lifecycle/network | Target changes floor/team/owner, downs, departs or finishes its clock mid-cast: no stale debit or substitute recipient; accepted cost stays spent. Respec, zone travel and save/reload cannot reset aid entitlement. Host receives remote intent, applies once, snapshots actual advanced skill/timer to both clients; stale/repeated snapshots cannot reapply aid. |
| I1: baseline | Without either candidate, fixed hit lodges, next top-level hit spends then re-lodges, and native/Rending/Crossing Extraction pop + actual return-shot interception match baseline. Pin death/expiry AoE and first-applier credit separately. |
| I2: prepare/freeze | Lodge 100 through a real fixed physical hit, prepare it, land two physical hits that would each lodge 100. Bank stays 100; protection reads 2→1→0; original expiry is unchanged. Third qualifying hit spends normally. Empty attacks, blocked/evaded/immune hits, DoT and depth > 0 do not spend protection. |
| I3: ownership | Foreign/minion hits discharge normally. Foreign Extraction spends ordinary shares. Two equal-ID supported Extraction instances cannot share a preparation bonus. A transplanted or mixed bank with the caster's `casterId` still refuses preparation. |
| I4: manual bonus | Extract before any protected hit: ordinary inputs. After one/two protected hits within the deadline: native 150/62.5 for principal 100; Rending 225/25; Crossing 87.5/137.5. Observe actual victim damage and a returning projectile hitting an intervening enemy. Only one matching manual consumer receives the bonus; an echo sees no bank. |
| I5: deadlines/removal | Race extraction, next hit, expiry and lethal damage in both deterministic orders; exactly one bank consumption. Expiry/death do not use the bonus. Three-second timeout keeps the original bank/fuse and refuses re-preparation. Cleanse, transfer, respec, host removal and caster departure leave no orphan marker or bonus flight. |
| I6: graft/wire | Structural support census accepts effective native `recallImpales`, refuses unrelated skills and derived spear payloads. Save/rebuild keeps sockets but no stale preparations; two seats' status/bonus reads agree with host and never grant authority to the client. Respec removes only the matching source's derived shots. |

Run the following once those probes and catalog entries exist. The support
IDs below are proposed, so matrix commands are intentionally future gates:

```powershell
npm run check
npm run probe -- --filter allycooldown --jobs 1
npm run probe -- --filter impalepreservation --jobs 1
npm run probe -- --filter impactstartertrees --jobs 1
npm run probe -- --filter deviceworkshop --jobs 1
npm run sim -- run --suite smoke
npm run sim -- matrix check --support shared_seconds
npm run sim -- matrix check --support patient_steel
```

Ensure the matrix fixture actually supplies an allied running clock for
Shared Seconds and a prepared bank/manual recall for Patient Steel. An
unexercised solo DPS fixture is not evidence of a no-op or of working aid.
Add a same-seed contextual A/B fingerprint of timers/consumed principal and
advance the matrix's mechanism/read-site census; do not hide either support
behind a broad `inertOk` waiver. Check all advertised payload units, and
observe actual returning damage rather than only projectile fields.

Manual acceptance: keyboard/controller targeting chooses the previewed
ally/victim; no-valid-target feedback is clear; both co-op clients see the
advanced ability and prepared bank; high projectile-count attacks visibly
use both barbs; party interference matches the description. Neither proposal
is ready to ship before these gameplay and display checks pass.

## PS-02: concrete additions to the deferred salvage requirements

`World.paySkillCost` at `src/engine/world.ts:40083` already computes actual
mana/life debits for `costWard`, then returns nothing. `Actor.payCost` at
`src/engine/actor.ts:3620` can spend mana, energy shield, or book Overdrive
debt. Reuse that real payment seam for receipts; neither nominal `paidCost`
nor later debt repayment is refundable mana. Mana recovered by the separate
Reposition action is never deployment principal.

The quiet cleanup precedent at `src/engine/world.ts:54481`
(`clearTreeConstructs`) matches an **entire host-instance roster** and its
captured payloads. Single-device salvage needs a body-scoped variant: it
must not cancel siblings' projectiles, zones or repeats from the same host.
Expose a device identity through every pending descendant before widening
salvage beyond simple single native aimed-device casts.

Spend a receipt share even when the mana pool is already full; the unused
refund is discarded, not reclaimable on a later attempt. Preserve an
immutable original lifetime; clamp remaining-life ratio to `[0,1]` so life
extension and relocation cannot increase entitlement. For the proposed
40% refund, actual 6 mana + 4 ES paid and 50% remaining life permits at most
`0.4 * 6 * 0.5 = 1.2` mana, further bounded by share/receipt balances. A pure
debt-funded or unpaid deployment permits zero.

Future salvage probes must add these three concrete cases: partial ES/debt
payment with independent later debt repayment; full-pool one-shot receipt
consumption; and two siblings with live payloads where salvaging one leaves
the other's health, clocks and payloads intact. Packed Workshop and
Overwound Mechanism remain shipped and need no catalog change for this audit.

## Rejected and deferred alternatives

- **Rejected:** multiply a two-second budget by party size, ready every ally
  clock, include self, or rely only on the aid skill's reducible cooldown.
- **Deferred:** charge/reload aid, ultimate aid, complicated converted clock
  identity and arbitrary NPC/enemy-helper rosters. Implement and verify their own semantics
  before admitting them to the first mechanism.
- **Rejected:** a global preservation flag that suppresses allied hits;
  copying preparation with status spread; refreshing the fixed fuse; or
  paying a boosted bank both manually and on death/expiry.
- **Deferred:** additive impale growth, separate per-player contribution
  banks, prohibiting foreign ordinary Extraction, and repeat preparation of
  the same bank. These need separate multiplayer/economy decisions.
- **Rejected as duplicates:** another ordinary impaling attack, another
  basic Extraction multiplier, another free device relocation, or fixed
  pickup rewards described as a refund of deployment costs.
- **Still deferred:** Field Recovery until receipts and single-body quiet
  retirement are proved. The rejected smaller substitutes remain visible
  in the [backlog's ownership audit](skill-support-candidates.md#overlap-and-ownership-audit).

## Audit verification at this checkpoint

Documentation-only verification: `npm run check` passed. The existing impact
starter-tree probe passed **541 checks / 72 terminal routes**, including
real impale banks, Extraction shares, returning hits and exact-source respec
cleanup. These baseline results establish the shipped behavior only; none
of the proposed mechanics or future probe assertions has been implemented.
The existing Packed Workshop probe also passed **52 checks**, including
exact-instance relocation, resource cost, lifetime, save/network rebuild and
quiet respec behavior. Both probes emitted existing non-failing content
census warnings; this documentation pass does not adjudicate those warnings.
