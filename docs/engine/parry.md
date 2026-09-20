# Parry retaliation and projectile reflection

Parrying remains a free defensive block during the guard's opening window.
Each recipient can take one parry wound per **0.25 seconds**, across all
parriers and across melee counters and reflected projectile impacts. Additional
parries still stop the attack, preserve shield, show the weapon clash, raise
block triggers, and honor `endOnParry`. They do not extend the recipient's window.

## Configuration

- `DEFENSE_CFG.parry.damageCooldown` seeds the `parryDamageCooldown` stat.
  Ordinary modifiers can change it per recipient (player, enemy, or minion).
  Zero restores unlimited received counters. This is separate from the guard's
  `parry.window` / `guardParry` timing and `counterMult` / `guardParryPower` damage.
- `DEFENSE_CFG.parry.maxReflections` bounds projectile rallies (default 8).
  Exceeding it dissolves the projectile without damage or an explosion.
- `ParryDamageWindow` stores transient world-clock deadlines keyed by actor.
  No save migration or client timer is needed; the host resolves combat.

## Projectile contract

A successful projectile parry turns the existing visible flight toward its
previous caster and transfers its ownership to the guardian. It never deals an
instant counter to the distant caster. The returning body can miss, hit terrain,
be intercepted by a dome, or be parried again. Its color, shape and speed remain
those of the incoming projectile; steering, orbit, destination and return tethers
are released so they cannot pull it back onto the former cast's path.

The original typed damage roll (including launch multiplier and flat damage) is
captured once, multiplied by the current parrier's counter power, and applied
through the shared hit pipeline on contact. A re-parry replaces that multiplier;
it does not compound it. Defenses and damage taps operate normally, and kills
belong to the current parrier. The same recipient window also covers explosive
splash, piercing hits and repeated contacts; shield/ward absorption spends the
window as well. Ordinary attacks remain unaffected.

Reflection returns the projectile's **damage and explosion**, not a fresh cast
of its original spell. Original status applications, spawned children, trails,
zaps, ground zones, summons and cast-trigger effects do not run on the return.
This keeps every returned wound under the same damage window instead of letting
secondary payloads recreate the multi-parry burst. Piercing and re-hit budgets
remain on the returned body; chains/forks are not re-issued. The existing
renderer and co-op projectile snapshots show its real position and direction.

Melee counters retain their raw retaliation formula, now using the shared
life-damage gate (including last-gasp protection) and indirect-damage attribution.

## Verification

`npm run probe -- parry` checks crowd bursts, rapid hits, cooldown boundaries and
overrides, symmetric recipients, actual flight at 30/60/120 Hz, dodgeability,
re-parry power, resistance, shield soak, explosions, kill credit, ordinary guards,
domes and the rally limit. The existing starter-tree, precision-tree, impact-tree,
defense and guard-clock probes cover invested guard behavior.
