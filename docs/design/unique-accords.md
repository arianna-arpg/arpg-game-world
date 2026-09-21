# Unique iteration: investment, companions and combat economies

This pass keeps uniques as build rules composed from shared modifier and proc
definitions. A unique can supply a missing skill without occupying the bar;
equipping a learned copy instead adds the granted levels to that investment.
Independent companions have their own residence, outside manual summon limits.

Content lives in `src/data/uniques/accords.ts`, registered by the ordinary unique
catalog. Trigger rates, cooldowns, skill IDs, levels, buff duration, tags, resource
amounts and tradeoffs are data. No engine branch names one of these items.

## Existing grant audit

| Unique | Resulting behavior |
| --- | --- |
| The Emberbrand | Firebolt triggers without a bar slot. An equipped learned Firebolt receives bonus levels and supplies its own supports/tree. The burning trigger now names its one-second cooldown; its chance range stays bounded at depth. |
| The Cindervigil | Firebolt and Pyroclast Bolt both follow the additive-level rule. The spell-trigger tooltip now states the actual 95% chance and 0.8-second cooldown instead of promising a guaranteed cast. |
| Rimewake | Movement can release the granted Frost Nova without seating it. An equipped learned nova receives levels and retains its investment. |
| The Mourning Bell | Summon Skeleton remains an optional, customizable active grant. Its ward trigger accepts deaths from any owned minions, so using the granted summon is not required. |
| The Unquarried Idol | An independent Stone Golem accompanies the wearer. A separately equipped Summon Stone Golem remains usable, also with zero mana reservation. Its normal use cost still applies. |

Switching between two items granting the same skill now restores the new host's
own sockets and tree. It does not copy the departing item's stones. The bound
slot follows the replacement instance; active effects belonging to the retired
instance end through normal cleanup.

Living granted companions now refresh ordinary owner investment and owner level
on build recalculation, even when their granted skill level did not change. This
preserves their body and fraction of life, and reapplies size from the native
radius so repeated recalculation cannot grow them indefinitely.

## The Cinder Conductor

**Opal amulet; minimum item level 16; drop weight 45.**

- An independent Fire Golem from level 1–2 Summon Fire Golem follows the wearer;
  skill levels deepen with tier. It takes no skill slot or mana reservation and
  reforms using the summon skill's existing respawn rules.
- Hits dominated by Fire damage from the wearer or any owned minion have a
  65–85% chance to restore 3% of the wearer's maximum Mana. They share one
  two-second cooldown.
- 20–40% increased restoration from this proc, and 12–20% increased minion damage.
- Tradeoff: 15–25% less mana regeneration.

The follower helps start the economy; fire attacks, other minions and converted
damage can sustain it. The hit gate reads actual dominant damage, rather than
requiring a specific skill. The wearer and an entire army share one restoration
clock, avoiding a reward that grows without limit with body count. Proc power
and maximum Mana offer further investment. A manually summoned Fire or Ice Golem
can coexist; its ordinary shared golem limit and reservation still apply.

## The Bell of the Breach

**Poise belt; minimum item level 12; drop weight 55.**

- Grants level 1–2 War Cry, or adds those levels to an equipped learned copy;
  the grant deepens with tier.
- Hits that break an enemy's Poise have a 70–90% chance to trigger the wearer's
  War Cry, once per eight seconds. No skill slot is required for the trigger.
- 15–25% increased Poise damage and 8–14 additional Poise.
- Tradeoff: 5–8% less movement speed.

This turns a break into a window of pressure using the real War Cry definition.
Any eligible hit can break Poise; the item does not prescribe a weapon or attack.
Binding an invested War Cry strengthens the same trigger through its levels,
supports and tree. Simultaneous breaks cannot produce a chorus of duplicate
casts, and an ordinary hit that does not break Poise cannot activate it.

## The Unspent Reply

**Armour/energy-shield gloves; minimum item level 14; drop weight 50.**

- A Block has a 75–90% chance to prepare the next Spell for five seconds, once
  per three seconds. That spell costs no Mana and has 40% increased Area of Effect.
- One preparation can be held; later successful blocks refresh it rather than
  banking additional casts. Attacks do not spend it; a completed manual spell
  does. Triggered echoes do not consume it.
- 4–6 percentage points of Block chance and 12–20 additional Energy Shield.
- Tradeoff: 15–20% increased spell cost through the ordinary `manaCost` stat.

Blocking creates a casting opportunity even with an empty mana pool. Players
choose the spell and whether its area payoff is worth delaying another cast.
The shared `manaUseCost` multiplier waives only Mana actually spent on use,
after cost conversion. Life costs and standing reservation remain payable;
the item never creates a free permanent aura or summon contract. An earned
preparation follows normal timed-buff rules and can finish its short lifetime
after unequipping the gloves; unequipping prevents new preparations.

## Scaling and attribution

Ranges above are authored starting ranges. Positive magnitudes use ordinary
item-tier scaling unless explicitly pinned. Proc chances and adverse multipliers
are pinned, so depth cannot inflate a probability beyond the engine's 95% cap or
turn a fixed tradeoff into an unbounded penalty. Companion/grant levels use the
existing capped, floored level fold. Rolled item lines, companion skill sources,
proc identities and buff labels retain their normal attribution.

These are initial tuning values, not a claim of completed endgame balance.

## Verification

`balance/probe_uniqueaccords.ts` covers every current skill-granting unique with
a full bar and an invested learned copy, repeated derivation and removal. It
also exercises item-owned sockets across host swaps, real hits and casts for
the three new payoffs, shared cooldowns, owner isolation, independent/manual
golem coexistence, live companion investment, reservation and life-cost
boundaries, save reconstruction, expiry and removal.

The existing legends, emergent-uniques and relic-uniques probes cover the earlier
grant and Idol contracts. See `docs/engine/legends.md` for the shared rules.
