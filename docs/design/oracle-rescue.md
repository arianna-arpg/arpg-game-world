# The Oracle’s return

The tutorial faction holds the Oracle at its revenge commander’s camp. This is
the first Odyssey **miniboss**, around level 14, not the first of the four main
Odyssey leaders. The existing old-road lead and exploration both reach the camp.

Clearing that actual quest objective releases the captive and immediately records
the account deed `oracle_rescued`, granting the Oracle Stone and one Reliquary
seat. Relics can now appear in the world. Crafting expertise and the old burial
shrine cannot bypass this rescue. Main leader one still unlocks Vocations; main
leader two still unlocks awakening, skill trees and commissions.

The Oracle settles at Lastlight’s standing stones. Return there to choose one of
three introductory charms through the existing journal reward interface. A full
pack or delayed choice preserves the reward without relocking the services.
The shared Reliquary lesson completes when a charm is actually seated. The old
burial-site quest remains optional, now offered by the rescued Oracle.

Rescue is account-wide: later lives retain his residence and do not repeat his
captivity. Existing accounts with the older `revenge_taken` receipt, or a saved
completed commander quest, migrate from that evidence. Owned legacy services are
preserved, but owning a stone alone never fabricates a rescue or resident.

`src/data/oracle.ts` configures the receipt, legacy receipt, NPC, captive/free
looks, placement offset, granted features and notice. `QuestDef.rescue` and
`engine/questRescues.ts` provide the reusable rescue machinery. An NPC’s
`npcRequiresLedger` controls settlement, while the ordinary dialogue director
selects captive, released, charm, lesson and resident lines. The captive uses the
existing robe art; the freed Oracle carries the scholar’s staff.

Host authority owns the rescue. Ordinary kills, unrelated progress and client
requests cannot grant it; non-progressing modes cannot alter the account.
The field NPC cannot claim a town reward. Resume and zone travel preserve one
body, and account feature reconciliation is idempotent.

Verification: `npm run probe -- oraclerescue`, the Reliquary, Odyssey, unlock and
dialogue probes, then the built-game `balance/oracle-rescue-ui.cjs` harness.
The harness uses hidden windows and isolated saves and captures the captive,
charm choice and resident service dialogue.
