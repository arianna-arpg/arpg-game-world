# Vocation mutations and the Gravebinder

## Direction

Vocations should change decisions: what to collect, when to commit, where to
fight, which resource to spend, or how several skills cooperate. The owner's
references are Path of Exile 1 and, especially, Path of Exile 2 Ascendancies.
These are design references, not a requirement to copy their nodes or balance.

A useful first allocation should begin a play pattern. Follow-up allocations
should specialize its behavior or combine it with another pattern. A numerical
node is useful when it supports an identifiable choice, but should not be a
mandatory toll before the vocation starts working. Do not impose the old fan
layout, one obligatory capstone, or exclusive trunks on every vocation.

This implementation rebuilds **Gravebinder** and opens the shared vocation
schema to existing passive choice groups. The remaining vocation rows below
are reviewed design directions, **not implemented replacements**. Their
existing abilities and point incomes remain intact.

## Implemented Gravebinder

Necromancer is now Gravebinder's home class. `offeredClasses` retains Summoner
access before the account unlock; foreign classes still use the existing
account-unlock rules. Plaguelord remains available as a separate decay-focused
calling. No vocation unlock, ledger, root, or paid node ID was renamed.

| Node | Play pattern | Default tuning |
| --- | --- | --- |
| Last Breath | Keep a temporary army cycling; visible soul pips fill as it passes. | Six deaths/expiries produce one 12-second Wraith; two active. A full bank waits for room and does not accumulate further overflow. |
| Name the Departed | Choose an offensive or supporting Wraith identity. | Reaver gains a lunge beside its scythe; Rime replaces its native attack with cold bolts; Dirge gains Despair and a chaos-exposure aura. The existing choice popup and Font refund rules apply. |
| Patchwork | Travel between visible parts to compose a temporary ally. | Parts appear every 2.5–4.5 seconds, 90–240 units away. Collect five; one 20-second construct can stand. Ribs add life/armor, claws add haste/twin cuts, hearts add regeneration/movement, skulls add casting speed/cold bolts. Repeated parts stack statistics; each distinct art is learned once. |
| Burial Ground | Fight around the place your army falls; leave or defend the resulting site. | Five slain minions within a 125-unit site, near its owner, activate six seconds of zombie births at 1.5-second intervals. At most two sites and eight zombies. Unfinished sites dissolve after 15 seconds. |
| Undead Resonance | Build the army through the supports on its summoning skills. | Undead crews board compatible supports without spending a Resonance socket. Ordinary forwarded costs still apply. Other creature factions retain the normal gate; a real Resonance gem still opens it. |
| Open Invitation | Curate the learned summon pool to influence an additional temporary guest. | Each successful summon birth may invite one body from another learned summon, at most once per second and three active. Guests use that learned instance's tree, supports and owner investment, even off the bar. |
| Undying Covenant | Extend a doomed army's last engagement. | Slain minions fight for three further seconds; their final passing contributes once. |
| Grave-Mender | Sustain the army while holding a site. | Minions regenerate 2% maximum life each second. |

The five engines connect directly to the free crest. Wraith selection follows
Last Breath; Covenant follows Patchwork; Grave-Mender follows Burial Ground.
Every investment still costs one vocation point. No new point income or global
budget was introduced. Existing paid nodes retain their IDs; an old allocated
Wraith-choice node receives the Reaver default through `allocatedDefault`.
This is a deliberate power redesign, not preservation of the old numerical build.

### Lifecycle and interaction rules

- Temporary combat deaths, natural expiry, Blood Toll, consumed amalgam flesh
  and low-life detonation can fuel Last Breath. Cap eviction, dismissal,
  respec and travel cannot. Permanent bodies never become temporary merely
  because Undying Loyalty starts its last-life clock.
- Burial Ground requires an actual slain/consumed body, not natural expiry.
  The death must be near its own owner and on the same floor. An active site
  cannot gather another outbreak beneath itself.
- Every reward carries its immediate owner, granting pact and summoning
  instance. Pact-born bodies cannot fuel or trigger pacts. This deliberately
  ends the free-summon feedback loop while ordinary skill/support interactions
  remain live. Generated descendants cannot invoke a pact through a rewarded owner.
- Guests do not reserve mana, respawn, evict another summon or join permanent
  summon contracts. They cannot be corpse-dependent, held-formation, worn-shell
  or specialized swarm bodies. The triggering skill is excluded from the pool.
  Empty pools produce no guest. Selection is sorted and uses the game's seeded
  random stream under simulation.
- Parts are private to their owner, separated enough to choose by movement,
  restricted to visible same-floor ground and capped at ten. They expire after
  25 seconds. A completed recipe waits intact if a construct is already alive.
  Ground generation is disabled in safe zones.
- Removing a grant cancels its banks/sites/parts and retires its reward bodies.
  Owner death and zone departure also clean up. Banks, parts, sites and temporary
  reward bodies are encounter state, not a second persistent inventory.
  These grant-owned bodies survive ordinary off-bar skill cleanup and expire
  on their own duration. Undying retains an original expiry as an expiry.
- The ordinary effect-duration and minion-investment rules still apply to
  summoned bodies. No damage, skill or animation is simulated in a renderer.

### Authoring surfaces

`data/gravebinder.ts` owns the tree and choice options. `data/summonPacts.ts`
owns bounded reaction definitions, part recipes, reward skills and faction
support grants. `engine/summonPactSpec.ts` is the typed contract;
`engine/summonPacts.ts` implements death banks, spatial thresholds, collection
and learned-summon selection without checking a vocation or node ID.
The Gravebinder tooltips read their numerical tuning from those definitions.

An ordinary modifier activates each `summonPact_<id>` stat. Gear, another
vocation or monster modifiers can use the same registry. Other content packages
can add typed definitions and grant their corresponding stat. Reward bodies
enter the existing summon mint, support forwarding, owner-stat inheritance and
death pipeline. Vocation identity is never inferred from a monster's name.

`VocationNodeDef.choice` now forwards to `PassiveNode.choice`, allowing any
vocation to use the existing single/multiple-pick, exclusive, saved and
refundable choice vocabulary. `offeredClasses` is likewise reusable.

`render/vis/summonPacts.ts` paints actual soul banks, selected recipe parts,
four distinct ground-part silhouettes, charging graves, active outbreak time
and collapsing dust. The existing flash snapshot carries copied paint-only
receipts to peers, with the same floor culling. There are no new combat captions.

## Structural review of the remaining vocations

The following identifies the next decision to build, not just a new reward
percentage. Keep functioning native mechanisms and specialize them first.

| Vocation | Present foundation | Proposed next mutation |
| --- | --- | --- |
| Warbringer | Sunder, kill-rally, momentum bonuses | Bank broken guards into a directed warcry; choose charge-through or hold-the-line release. |
| Wildstalker | Extra shafts and bleed investment | Establish marked hunting lanes; retrieve embedded shafts to redirect a finishing volley. |
| Archmage | Mana investment and capacitor proc | Choose how overpayment becomes stored spell geometry, a delayed repeat or a protective reserve. |
| Spellblade | A real attack/spell alternation grammar | Specialize the completed phrase into a movement finisher, ward or borrowed elemental strike. |
| Hierophant | Shared offerings and deferred healing | Place or carry a congregation; trade its radius for personal participation in its rites. |
| Greenwarden | Footstep saplings, communion, fighting plants | Choose moving growth versus rooted groves; harvest mature plants into a deliberate release. |
| Plaguelord | Poison and curse scaling | Cultivate a spreading infection, then consume infected hosts to change its route or payload. |
| Shadowdancer | Phase proc and vulnerable exploitation | Leave an actionable shadow at departure; choose swap, delayed strike or decoy on return. |
| Bloodreaver | Low-life and leech investment | Spend measured recovery as a temporary stance; choose controlled expenditure or escalating overdraw. |
| Stormweaver | Capacitor and lightning procs | Place conductors through successive casts; route stored charge through their geometry. |
| Bastion | Fortify, guard and last-stand procs | Store blocked force for a directed shield release or plant it as cover for allies. |
| Corsair | Critical hits and moving attacks | Earn a riposte token from an actual evade; spend it on a thrust, sidestep or disarm. |
| Ashborn | Fire spread on death | Carry embers between fights and deliberately seed or consume a burning front. |
| Exsanguinator | Real Hemorrhage reloading/pop behavior | Choose whether to cash out one wound, spread its remaining burden, or leave it running for defense. |
| Stonewrought | Cairn trail and stone communion | Rearrange existing cairns into a defensive enclosure or consume them in a traveling collapse. |
| Packwarden | Companion capacity and recovery | Create pack formations with distinct commanded follow-ups and an owner-relative rally point. |
| Groundbreaker | Poise and Sunder bonuses | Author fault lines through landed heavy hits; a chosen follow-up connects or detonates them. |
| Spearhead | Shove authority and impact scaling | Convert real wall contacts into a breach; choose a piercing corridor or an ally opening. |
| Swordsaint | Combo windows and vulnerability | Select a finishing stroke based on the preceding attack sequence, with a deliberate reset option. |
| Pitfighter | Existing seize/throw grammar | Choose how a successful throw uses the target: collision projectile, pin or moving shield. |
| Thornwall | Roots and retaliation numbers | Grow directional brambles from actual blocked contact; uproot them to advance the defensive line. |
| Impaler | Roots and projectile investment | Recover lodged weapons; choose whether recall tears wounds, pulls enemies or rebuilds ammunition. |
| Enginewright | Mine/trap damage and rearm bonuses | Wire a chosen sequence between deployed devices, with selectable propagation behavior. |
| Bannerlord | Warcry debuffs and presence | Plant and relocate a standard; orders change what nearby allies do, with a cost to abandoning it. |
| Warchanter | Existing cadence grammar | Queue and resolve phrases with selectable endings; make holding a note compete with moving the phrase. |
| Veilweaver | Disorientation and evasion bonuses | Shape a moving veil that changes enemy pursuit; fold it into a false exit or ambush point. |
| Chronarch | Stasis and cooldown bonuses | Delay a bounded payload and choose its release timing; distinguish stored work from free repeated casts. |
| Stillmind | Reflex and standing investment | Earn a prepared response through actual stillness; choose movement, counterattack or recovery when spending it. |
| Swarmlord | Plies and on-hit status carrying | Command temporary swarm shapes; merge bodies for an assault or divide them to screen an area. |
| Harborwarden | Extra hired companion and encounter-scaling rules | Keep its real company identity; add a rally order with selectable formation roles instead of another generic damage capstone. |

Prioritize **Warbringer, Archmage and Enginewright** for the next mechanical
passes: their named identities currently promise more than their nodes change.
Spellblade, Greenwarden, Exsanguinator and Harborwarden already demonstrate
useful native mechanisms worth preserving. Avoid reworking every vocation
simultaneously before the first loops have been played and tuned.

## Verification and limits

- `npm run check`
- `npx tsx balance/gravebinder-check.ts`
- `npm run probe -- necromancer --jobs 2 --retries 0`
- `npx tsx balance/probe_supportfabric.ts`
- `npx tsx balance/probe_choices.ts`
- `npx tsx balance/probe_passiverefund.ts`
- `npm run sim -- run --suite smoke`
- `npx vite build --outDir balance/reports/gravebinder-dist`, then
  `npx electron balance/gravebinder-ui.cjs`

The hidden client checks real choice input and world-rendered cues. Its
temporary save/profile folder is removed through `scripts/temp-dir.cjs`.
Delete the isolated build after inspection; small screenshots may be retained
under `balance/reports/gravebinder` for review.

This establishes functional behavior, lifecycle bounds and a playable first
pass. It does not establish endgame balance or prove that the other vocations
have been modernized. Shared gameplay is implemented in the root main checkout;
it reaches the canonical seamless build through the existing publication and
main-to-seamless integration process, not by copying files into that checkout.
