# Cleave: a readied strike or a traveling wound

`src/data/cleaveTree.ts` owns the fifteen-node tree. The original manual
Cleave remains unchanged without a trunk allocation. Four points still arrive
at skill levels 5, 10, 15 and 20; the neutral damage investment remains available.

## Readied Cleave

Spend the trunk, then press Cleave to arm it. It starts disarmed. A damaging,
landed melee attack from another skill releases Cleave toward that victim from
the wielder's position. Cleave stays armed until pressed again. It has its own
2.25-second base cooldown, deals 40% more damage and costs 50% more mana.
The arm/disarm press is free; each actual release pays Cleave's live cost.

The carrier determines opportunities, positioning and timing. Cleave keeps its
own level, damage roll, tags, accuracy, critical chance, supports, ailments,
area, resource cost and cooldown recovery. Carrier damage is not copied.
Carrier attack speed helps use a recovered Cleave promptly; Cleave's own attack
speed does not shorten its instant release or replace cooldown recovery.

The two forks can mix:

- **Deep Notches:** lodge 30% of physical hit damage as impale. Other attacks
  discharge it. **Barbed Edge** adds bleed attempts and ailment magnitude;
  **Splitting Armor** adds armor penetration.
- **Ready Rhythm:** 50% increased cooldown recovery. **Close Quarters** restores
  life per enemy Cleave hits; **Finishing Cut** supplies an execution threshold.

Misses, blocks, immunity, non-melee hits and damage-over-time ticks do not
release it. Proc and triggered descendants cannot produce the melee event.
Cooldowns and unaffordable releases leave it armed. Cycling the toggle does not
reset its clock. A multi-target Cleave pays once and stamps its clock before
its hits resolve. The carrier's hit and kill resolve before the added arc,
preserving kill credit and consumption of its next-hit buffs.

## Unbound Cleave

The other trunk keeps the ordinary traveling crescent support graft. One fork
invests in travel, breadth and knockback; the other now makes the wave bleed,
with spreading wounds on death or a heavier, slower wave as leaf choices.
It remains a manually cast skill, and sockets still compose through the shared
support system.

## Shared engine contract

`TriggerSpec` is now usable by a `SkillDef` or an exclusive tree trunk's
`trigger`. Resolution precedence is socket/graft, tree, then native definition.
The shared trigger engine, never a Cleave ID check, owns the release:

- `on: 'meleeHit'` is raised after a direct damaging attack carrying `melee`.
- `guaranteed` bypasses the random trigger roll, not payment or eligibility.
- `maxUseTime` configures the instant-release limit. Ordinary triggers retain
  their existing limit and permit behavior. Cleave explicitly pins 0.7 seconds.
- `startsOff` gives deliberate activation. `instanceTriggerArmed` is the single
  read for the press, firing gate and hotbar active face.
- The normal `addedCooldown` modifier provides the clock; skill-local recovery
  and Alacrity work through the same resolver and support qualification.
- The existing round-robin trigger arbitration, status/attribute restrictions
  and chain-depth limits remain in force. Multiple eligible triggers take turns.

The hotbar's existing active outline, ordinary cooldown sweep and actual Cleave
arc convey the behavior. No combat instruction captions are added. Tooltips
show the release condition and imposed cooldown instead of a manual attack time.

The armed flag is transient on disk: loading requires rearming. Co-op seat
metadata carries explicit on/off state, and toggle presses dirty that metadata.
Respec removes the trigger and its armed/depth state; existing cooldowns are
not refunded. The removed `lodged_steel` root and orphaned descendants drop
through normal tree validation; no legacy branch or save migration is retained.

## Verification

`npm run probe -- cleave` checks real hit releases, payment, clock recovery,
exclusions, guaranteed firing, support admission, tree effects, respec, saves
and co-op. `startertrees` exercises every terminal route, including the carrier
strike for Readied Cleave. After building, `npx electron balance/cleave-ui.cjs`
checks a hidden disposable game window at two sizes. Type checks, balance smoke
and the fast probe gate accompany changes to this shared trigger path.

These are starting balance values, not a claim that all carrier skills or
support combinations are equally strong. Further playtesting should compare
fast single-target carriers, slower wide attacks and impale discharge builds.

Verification snapshot (2026-09-20): 36 Cleave checks, all 13 starter-tree probes,
the five-scenario balance smoke suite, type checks, production build and the
two-size hidden UI pass succeeded. The shared checkout's fast sweep passed
275/280 probes; failures were `garden`, `objectives`, `stealth`, `storey` and
`tiers`. The objectives R10 debt-cap failure also reproduces in an isolated
archive of committed HEAD without the Cleave edits. The other four failures
overlap concurrently edited stealth/navigation work; the full checkout is not
claimed green. No changes were made to those assertions for this task.
