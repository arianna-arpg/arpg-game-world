# Legendary skill empowerment

The Sacrificial Font now gives duplicate legendary Skill Memories a continuing
use. Carry two unlocked, non-granted copies of the same legendary skill to the
Font and choose **Empower**. The ordinary common/magic/rare recipes are unchanged.
An equipped skill must first be returned to the bag, following the existing Font
inventory contract.

The initial policy grants one **passive-only skill-tree point per empowerment
rank**. Legendary rank zero is implicit: `Cleave`, then `Cleave I`, `Cleave II`,
etc. Normal skill level and four support sockets remain separate progression axes.

## Merge contract

- Highest empowerment rank selects the keeper; ties prefer the highest skill
  level, then existing bag order. Its tree, sockets, attunement and replenishment
  preference survive. The result takes the highest input skill level.
- Default result rank is `keeper rank + donor ranks + 1`. Thus `0 + 0 → I`,
  `I + 0 → II`, and `II + III → VI`. A fresh duplicate always remains useful;
  previously invested donor ranks are conserved without copying its tree choices.
- Donor supports return with their levels, rolls and locks. Bag overflow drops at
  the player's feet through the existing grant path. Locked and granted copies
  never enter the pool. The equipped bar is never automatically consumed.
- `engine/skillMerge.ts` builds the same deterministic plan for preview and host
  action. Registry checks, recipe checks, capacity policy and result construction
  precede consumption. Failed merges consume nothing. The host rechecks station
  reach and current inventory when handling the existing `fontMerge` intent.

## Reward and authoring contract

`data/skillEmpowerment.ts` is the tuning entry point: enable merges, copies per
merge, ranks per merge, donor-rank conservation, optional rank cap, and the typed
reward policy. There is no gameplay rank cap by default. Reward implementations
can be extended at `empowermentPoints` without rewriting merge or persistence.
Changing the reward amount re-derives budgets from saved ranks; rank investment
is never clamped merely because the merge cap was lowered or merging disabled.
Only the chosen passive-point reward is implemented in this pass.

`SkillTreeNode.empowermentPassive` explicitly identifies eligible passive slots.
The shared binary-tree and flask-tree builders mark their passives; the legacy
sugar tree's `neutral` is eligible unless explicitly opted out. Position, skill
name, tags and modifier type never infer eligibility. New trees should declare
their eligible passive slots deliberately.

All ranks stay in the existing `treeNodes` array, so every native modifier,
summon, aura and healing consumer sees the same authored node payload. Budget
attribution is derived: empowerment pays eligible passive ranks first; ordinary
Ability points pay the remainder. This may free an ordinary point previously
spent on a passive. Non-passive allocations can never exceed the ordinary
level-earned budget. Each eligible passive's capacity is its authored base cap
plus the empowerment point budget; that bonus budget is shared across all eligible
passives, not duplicated per node. Branch ranks, prerequisites, exclusions,
level gates, discovery gates and field discipline still apply.

The Font's existing full-tree reset clears allocations and preserves empowerment,
returning both budgets. Bonus allocations are not auto-spent. Skills whose trees
or eligible passive slots have not been authored can accumulate ranks and bank
their points; those points grant no combat effect until allocated. The interface
identifies the banked reward. This pass does not invent generic passive payloads
for unfinished skills or introduce a universal effect multiplier.

## Persistence and presentation

Optional `empowermentRank` travels with skill instances, bag payloads, character
saves, recovered loot, retired builds, and co-op skill rows. Missing rank means
zero; only positive safe integers on legendary copies confer rewards. Loaders use
the same rank/budget validation as live allocation, rejecting invalid branch
spends and excess passive ranks. Existing saves need no compatibility bump.

One name formatter supplies owned-copy names, bag names, tooltips, tree titles,
trade labels and pickup messages. Roman numerals use parentheses for thousands
beyond 3,999, so large ranks do not produce unbounded strings. The tree shows its
ordinary and passive-only budgets separately; ordinary level-band ticks exclude
allocations funded by empowerment. Existing waiting-point cues read total free
points. No new combat banners or tutorial captions are introduced.

Verification: `npm run check`, `npm run probe -- skill`,
`npm run probe -- abilityecon`, `npm run sim -- run --suite smoke`, then
`npm run build` and the hidden `balance/skill-empowerment-ui.cjs` walkthrough.
