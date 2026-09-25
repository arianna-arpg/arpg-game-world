# Developer progression controls

Open **Dev → Progression** during a live run. **Core access + learned trees**
records the account power milestones and rescue access, and discovers/awakens
the current character's learned skills. It opens their ordinary tree gates;
skill levels, tree-point budgets and spending rules still apply. Use Gems to
create another skill, then **Awaken learned skills**, or find that Memory by name.

The searchable rows grant individual account milestones, rescue services,
container rungs and Memory awakenings. Later container rungs include the earlier
rungs and their rescue prerequisite. The Reliquary Empowerment lesson opens the
normal Vault investment; it grants no ranks. Items remains the Relic generator.
Return to town for the Oracle's residence and town growth to refresh normally.

These are permanent grants, saved immediately even while paused. Repeating a
grant is a no-op. There is deliberately no revoke button: removing an access
flag cannot undo already seated items, spent tree points or dependent services.
The existing account reset remains the way to test the locked starting state.
Campaign victories, live quest objectives, turn-in rewards, currency and character
levels are not fabricated. An unfinished rescue quest can still be played.

`src/dev/progression.ts` derives recipes from `POWER_PROGRESSION`, quest rescue
definitions, `CONTAINER_DEFS`, `RELIQUARY_CFG` and `memoryCatalog()`. The UI owns no
grant logic. A recipe names ledger thresholds, features, Memories and prerequisite
recipe ids. The executor resolves and validates the complete dependency graph
before writing, applies monotone grants, reconciles rescue/container state and
marks the normal account/meta save lanes. `dev_progression:<recipe id>` account
ledger receipts attribute steps actually changed by the tool; natural ownership
is not relabeled as developer-earned. The UI's `· dev` marker reads those receipts.

The tab stays behind the existing developer opt-in. The executor also refuses
remote clients, story scenes, dead/downed runs and modes without account
progression. It never changes global progression configuration or adds a bypass
to normal player access checks. Host access continues through ordinary co-op
meta synchronization.

Verification: `npm run check`, `npm run probe -- devprogression`, the existing
Memory/Oracle/Reliquary probes, then build and run
`npx electron balance/dev-progression-ui.cjs`. The UI harness uses hidden windows
and isolated profiles/saves; it clicks the actual controls on a fresh account,
opens the actual panels and reloads the saved account.
