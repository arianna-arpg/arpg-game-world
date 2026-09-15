# Raise the Gnatveil

Tree data: `src/data/gnatveilTree.ts`. Native mechanics use typed
`SkillTreeNode.throngEvolution` fields, resolved in `engine/throngEvolution.ts`;
the world's throng mint, roster, conduct, hit and death paths execute them.
Node IDs remain compatible with existing runs, including `battle_hatching`
(now displayed as **Battle Brood**). No save-version bump is needed.

## Baseline and damage

Motes appear every **4–7 seconds**, formerly 6–10. Gnat Nip deals **4–5 physical**,
formerly 1–2; pooled contact has a matching base of 4. Owned throng bodies
retain at least **25%** of physical damage through armor (`armorDamageFloor`),
including owned pooled contact and physical gnaw. Other defenses still work:
evasion, block, plies, damage reduction and immunity remain meaningful. A
four-point bite against extreme armor now reaches the default one-point ply
threshold. Ordinary non-throng attackers retain their original mitigation.

## Patient Condensation

| Node | Behavior |
|---|---|
| Patient Condensation | One actual Gnat every 4 seconds, carried beside its owner; its native clock is separate from Patient Brood's husk clock. |
| Room in the Air | +10 normal maximum; native accumulation every 2.5 seconds. |
| Unbroken Veil | +8 normal maximum; while equipped, refill a roster below 8. Actual deaths refill immediately; other removals reconcile on the next simulation update. Removing the skill stops the floor. |
| Borrowed Wings | Recruit up to 200. Units exceeding the normal maximum decay at 8% of life before owner life investment per second, accelerating by ×1.08 per second. Ordinary regeneration can counteract it; the default 0.6 life regeneration briefly offsets early decay. |
| Scouring Wings | Owner life investment scales at 1/2 instead of 1/8. Conducted crossings and latches deal 50% bite damage with a 0.35-second per-body/per-victim cooldown. |
| Terminal Descent | A conduct pulse with a full normal roster launches its current bodies at the cursor. Arrival explodes for 6× bite damage in radius 48 and consumes the body. New accumulation is a new volley. |
| Swarm Incarnate | Combine into one actor, retaining a constituent count. Life and damage scale linearly, radius by square root up to ×8; bonus plies are `floor(sqrt(count)) − 1`. Each successive ply therefore requires quadratically more Gnats. |

Clustering weights remaining life by constituent count and retains spent
plies. Owner rebakes never repair those plies. Respec splits the cargo into
individual bodies without restoring health or creating extra remaining plies.
Overflow drain on a cluster counts only its excess constituents. Save, roster
badges, restore, and disband count constituents rather than the single actor.
The cluster explodes once for the combined damage of its cargo.

## Battle Brood

| Node | Behavior |
|---|---|
| Battle Brood | Player and owned-minion landed hits add 3 to a visible 100-point bar. At full, attach `ceil((normal cap − roster) / 2)` Gnats, floored at zero. Hidden Reserves keeps its own independent gauge. |
| Volatile Clutch | Each find becomes an egg containing 4 Gnats. Throng-yield investment grows the find batch. Eggs prefer enemies within 360 units of the keeper, falling back to the source position. Collection consumes the egg, adds only available roster room, and bursts for 4× bite damage per recruited Gnat in radius 64. |
| Untouchable Flight | Gnats in transit or carried by the owner are ignored by hostile targeting and immune to hits/DoTs. They cannot bite until latched; enemy riders are vulnerable. Whirlwind contact still operates in flight. |
| Ravenous Motes | A true ×1.6 multiplier on the bodies' damage, unscaled by the throng batch divisor. Also reaches contact, eggs, and any descendant using the body sheet. |
| Frenzied Conductor | Full walking pace; conducted Gnats gain ×2 movement speed, ×1.75 action speed and ×1.25 damage. These bonuses end when conducting ends. |
| Cyclone of Wings | Keeps fury and replaces cursor commands with caster-centered orbits, radius 66–94 and speed 5 radians/second. Each Gnat deals a bite on crossing, with a 0.35-second per-victim cooldown. |
| Splintering Bites | +1 ply and 35% bite splash within radius 36 on ordinary attack hits. Splash cannot recursively splash. |

**Veil Tending:** +20% minion life and damage, and +50% throng find yield per rank,
up to four ranks. Normal investment uses the existing batch rules; the
explicit life-scaling and damage-multiplier mutations above are exceptions.

## Runtime and verification

Native-mechanic Gnats retain full actors instead of discarding their life,
decay, motion or constituent count in the lightweight pool. Tree removal
clears the native clock, hatch gauge, fury and special motion; removing the
anchor releases its bodies through the ordinary disband rule. Find eggs and
cluster counts ride the co-op snapshot; the hatch gauge rides the owner's
snapshot and is drawn on the skill slot. No state is shared between owners.

Checks: `npm run check`, `npm run probe -- gnatveil`,
`npm run probe -- frontierstartertrees`, `npm run probe -- throng`,
`npm run probe -- plies`, and `npm run sim -- run --suite smoke`.
The Gnatveil regression runs real-world updates and damage, covering clocks,
support coexistence, floor, cap, decay/regen, cluster wear and saves, respec,
eggs, immunity/latching, dive, orbit/fury, splash and high-armor damage.
`balance/gnatveil-ui.cjs` checks the built game in a hidden, isolated Electron
profile: tree bounds and labels at 1400×1000 and 1000×720, egg batch labels,
the hatch meter, and the clustered body. Screenshots go to `balance/reports/`.
