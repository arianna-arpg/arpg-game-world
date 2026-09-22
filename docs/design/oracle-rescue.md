# The Oracle’s return

The tutorial faction holds the Oracle at its revenge commander’s camp. This is
the first Odyssey **miniboss**, around level 14, not the first of the four main
Odyssey leaders. The existing old-road lead and exploration both reach the camp.

Clearing that actual quest objective releases the captive and immediately records
the account deed `oracle_rescued`, granting the Oracle Stone and one Reliquary
seat. Relics can now appear in the world. Crafting expertise and the old burial
shrine cannot bypass this rescue. Main leader one still unlocks Vocations; main
leader two still unlocks awakening, skill trees and commissions.

The Oracle settles in a furnished cottage north of Lastlight’s standing stones.
His rescue grows home to at least village size on the next return in the same
life. Physical signs identify his house, Mireille’s inn, Brandt’s blacksmithery
and the Quartermaster. Return to the stones to choose one of
three introductory charms through the existing journal reward interface. A full
pack or delayed choice preserves the reward without relocking the services.
The shared Reliquary lesson completes when a charm is actually seated. The old
burial-site quest remains optional, now offered by the rescued Oracle.

Rescue is account-wide: later lives retain his residence and do not repeat his
captivity. Existing accounts with the older `revenge_taken` receipt, or a saved
completed commander quest, migrate from that evidence. Owned legacy services are
preserved, but owning a stone alone never fabricates a rescue or resident.

Later lives enroll one `oracle_commander_<faction>` hunt. Its commander uses the
same faction and readiness as the original rescue. Return to the Oracle for any
explicitly unlocked, droppable skill as a level-1 magic Memory. Search filters the
ordinary reward cards. Full packs defer payment; claims recheck ownership,
completion and proximity. Exactly one choice pays per life, including after a
save/reload. The first rescue life cannot also enroll this reward.

`isSkillUnlockedForSelection` keeps soft class discovery separate from selection:
pending-only class skills may drop but are absent here until Vault activation.
Shared skills remain eligible through an activated class. Independently purchased
skills retain `explicitSkillUnlocks` provenance across saves; uncertain legacy
pending-only ownership is treated conservatively. Starter skills remain available.
This uses `QuestReward.skillChoice` and `engine/questRewardChoices.ts`, allowing
other authored quests to use the same choice mechanism without NPC-specific code.

`src/data/oracle.ts` configures the receipt, legacy receipt, NPC, captive/free
looks, placement offset, granted features and notice. `QuestDef.rescue` and
`engine/questRescues.ts` provide the reusable rescue machinery. An NPC’s
`npcRequiresLedger` controls settlement, while the ordinary dialogue director
selects captive, released, charm, lesson and resident lines. The captive uses the
reusable `captiveCage` part over the robe, including its iron bars and lock;
the freed look sheds the cage and carries the scholar’s staff.

Host authority owns the rescue. Ordinary kills, unrelated progress and client
requests cannot grant it; non-progressing modes cannot alter the account.
The field NPC cannot claim a town reward. Resume and zone travel preserve one
body, and account feature reconciliation is idempotent.

Verification: `npm run probe -- oracle`, the Reliquary, town-growth, Odyssey, unlock and
dialogue probes, then the built-game `balance/oracle-rescue-ui.cjs` harness.
The harness uses hidden windows and isolated saves and captures the captive,
charm choice and resident service dialogue.
