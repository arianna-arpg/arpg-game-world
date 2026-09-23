# Lastlight: greetings across lives

`src/data/npcDialogues.ts` authors conversations. `src/engine/npcDialogues.ts`
selects them; the existing speech attention and portrait reader present them.

Before the account has lived Mireille's lesson, approaching the exit **to the
Crossroads** earns one warm call-out per run once the road is within 300 units,
on screen and in unobstructed line of sight. Being outside that range, behind
terrain or off screen arms the approach; revealing the exit can trigger it
without first leaving the radius. Buildings and closed doors use the shared
sight-ray rules. Headless play uses the world's normal fallback view frame.
The exit destination is resolved from the generated town, never a compass side
or fixed coordinate. The invitation admits while moving, lasts up to 16 seconds,
and can be dismissed. It changes no travel gate, input lock, service or quest.
Leaving town, death, or completing the lesson withdraws it. A hidden reader
does not consume its receipt. Approaching Mireille herself retains her existing
dwell gift and lesson flow.

Brandt's ordinary dwell dialogue initially mentions his missing hammer and
limited work. Weighted alternatives remain stable during a visit. Odyssey
milestones change his lines; future `brandt_hammer` quest rows take priority:
current-run completion, account completion, then active quest. The quest itself,
its hammer, rewards, and service changes remain future work. Completing a quest
uses the existing `questDoneKey` contract; active and ready conditions read the
real `World.activeQuests` entries.

## Authoring

- Stable rule IDs identify durable `dialogue_seen:<id>` receipts. `once` can be
  run- or account-scoped; omission permits future visits. Admission stamps the
  receipt, not condition evaluation. Account receipts honor meta progression.
- Speaker selectors accept a definition ID, a role, or both. Optional zone,
  priority, `all`, `any`, and `none` clauses control selection.
- Conditions read scoped ledgers, account features/level, active/ready quests,
  or registered live facts. Unknown facts fail closed. `either` accepts either
  ledger meeting the threshold; it does not add the two ledgers together.
- Triggers currently support ordinary attention/dwell and exit approach.
  Dwell retains the shared distance, floor, reach and idle checks. Exit call-outs
  deliberately support a distant speaker through the existing portrait reader.
- Positive line weights use a separate seeded stream, independent of loot and
  combat. Selection is cached per visit. Higher-priority state changes feed the
  reader's existing pending-page mechanism without replacing a page mid-read.
- The vendor window and its selling inventory permit dialogue alongside them. Other blocking panels retain
  their normal suspension behavior. Closing dialogue leaves the shop available.

## Flask provision

Mireille's once-only lesson fill now pays wherever the final flask is learned;
her spoken send-off still requires being nearby. The account graduation remains
immediate and persistent, including the existing deliberate lesson-exit paths.

`World.createPlayer` and fresh `addSeat` calls provision graduated accounts.
Already-known kit flasks and carried flask gems are reused, seated in open slots,
and filled. Class skills are preserved. A refused grant or bind leaves the deal
retryable instead of stamping success. Successful provision is idempotent.
`fillFlaskChargeBanks` derives exact caps from the actual skill instances and
initializes banks without charge-gain procs.

`Account.skillSlotMemory` retains the last equipped slot per opted-in skill ID
across deaths and account saves. `meta/skillSlotMemory.ts` owns the tag policy
(`SKILL_SLOT_MEMORY_CFG.tags`, initially `flask`), validation and placement plan;
new flask definitions enroll through their tags. Learn, bind, swap and unlearn
record the account owner's actual hero bar, including the departing slot when
a skill is removed. Unequipping never deletes its remembered position.

Fresh provision reserves all usable remembered slots before assigning any
first-empty fallbacks. Existing class/mastery skills and already-seated flasks
keep their places. An occupied, invalid or unavailable preference falls back;
duplicate preferences resolve in gift order. Automatic fallback does not
overwrite a remembered preference, and moving an unrelated skill does not
rewrite it either. No slot count or Ultimate position is hard-coded. A full
bar keeps the unlearned gifts recoverable through the existing retry path.

Old accounts default to empty memory; restoring an existing character seeds
missing entries from its bar without overwriting newer preferences. Automatic
grants likewise seed only missing entries. Slot changes use `accountDirty` for
prompt persistence. Guests inherit the hosting account's provision preferences;
their edits cannot replace the account owner's memory. This is an account
preference, not a separate per-class or per-guest layout.

Resume shells, restored couch guests and client display shells use
`startingFlasks: false`. Continue restores saved charges, including empty banks;
loading or reloading town is not a fresh-life refill. Fresh couch/hosted seats
use the shared account's graduation. Mercenary creation explicitly opts out.

## Verification

- `npm run check`, `npm run build`, `npm run smoke`
- `npm run probe -- townwelcome` (all class starts, kit/bag reuse, fresh guests,
  saved banks, remembered slots across lives/removal/resume, mastery collisions,
  malformed memory, full-bar recovery, distant lesson completion, state
  precedence and call-out lifecycle)
- `npm run probe -- mireille_lesson`, `npm run probe -- flasktrees`,
  `npm run probe -- speech`, `npm run sim -- run --suite smoke`
- After building, `electron balance/town-welcome-ui.cjs` and
  `electron balance/dialogue-ui.cjs` use hidden windows and isolated saves.
  Screenshots and logs go to gitignored `balance/reports/`.
- `electron balance/flask-slots-ui.cjs` verifies the real account writer,
  removal of both flasks, disk reload and remembered/full fresh-life provision
  in a hidden window with isolated saves.

Brandt’s starter stock, expanded upgrade ladders, crafting-writ qualification and
quest-controlled hammer appearance now follow [Brandt progression](brandt-progression.md).
