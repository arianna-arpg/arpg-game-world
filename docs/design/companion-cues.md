# Companion ownership and recovery cues

GT-026–029 implementation is complete; caption-free encounter acceptance
remains open. This batch covers companion relationships, taming, downing and
recovery, minion decay/bloom, curse-field transitions and remnant collection.
Scripted boss introductions remain in GT-013; general action refusals remain
in GT-038. `unraveled` was a decaying minion's death, not a field removal.

## Relationships and taming

`engine/companionCues.ts` derives actual owner and life-sharing buff endpoints.
Thin dotted links and paired open collars identify the keeper spatially;
dominated bodies wear a chained endpoint. Links stop when their relationship
or recipient disappears. Pack bonds retain the existing authoritative warden
links and now fracture on loss. Whistle responses and stance shifts use a
brief paired gesture rather than a line of combat text.

Persistent stance shapes distinguish pursuit chevrons, a guarding arc and a
heel loop. The ordinary stance meta button still shows its existing symbol.
The actual standing order drives the posture; dormant/downed bodies do not
show an active stance. An issued order still overrides standing conduct as
before. Supplemental links have a shared 32-link budget.

A focused tame draws toward the actual resolved target. An open collar
tightens with cast progress and strains when focus breaks. Rejection fractures
that binding; it never plays damage resistance. Success settles the relationship
and retains the existing physical collar. Releasing or unlearning a bond severs
it before the existing quiet removal. Release does not create a new wild NPC.
Mark/Recall keeps a persistent rune for every actor and co-op client; recall
clears it. The rune follows the existing planar recall semantics on the caster's
current story.

## Downing, revival and arrival

Downed seats and companions retain the existing flattened body and real
revival/dwell rings, with a brief collapse at the actual down event. Revival
stirs the body back upright; Undying rises from ash; real persistent replacements
condense on arrival. Amalgam explicitly selects flesh for that same condensation
grammar. Existing emergence poses carry all of these, including co-op.

Every new recovery call forces `hold: false`: no new immunity, untargetability,
AI delay or collision change is introduced. The established companion recovery
status, shared immunity budget, life fractions, Undying's one-use rule and
persistent contract reservations remain unchanged. Motion opt-out affects only
presentation. Ordinary emergence holds elsewhere retain their original rules.

## Fields and remnants

The curse-field's resolved radius drives its creation and contraction. Retirement
emits once through the shared cleanup path; damage ticks and reservation refunds
remain unchanged. Zero-power Bloom has no blast marker; an actual Bloom uses the
same radius as its damage. A decaying body collapses only after actual death;
an Undying interception plays its recovery instead.

Existing ground remnant shapes remain. Collection now uses GT-023's material
gain, stored bank and release gestures on the body and HUD. Elemental banks
persist until a matching cast really consumes them. Registry fragment buffs
show their actual stacks; a capped charge pickup produces no invented gain.

## Authoring, mirroring and validation

- `SkillDef.companionCue`, `MonsterDef.companionCue` and `CompanionStanceDef.cue`
  select `{ profile?, color? } | false`; defaults and geometry live in
  `data/companionCues.ts`. Profiles describe collar, chain and stance shapes.
- `SkillDef.recoveryCues` / `MonsterDef.recoveryCues` override `revive`, `undying`
  and `arrive` with an emergence spec or `false`. `hold` is deliberately excluded.
- `SkillDef.fieldCue` chooses `{ color?, form?, release? } | false`; event
  profiles live in the shared `data/combatCues.ts` registry.
- `RemnantKindDef.cue` selects the shared proc material or opts out. Buff
  `storedCue` remains the explicit override for its lasting bank.

Host snapshots deep-copy resolved relationships, stance shapes, rune positions
and outcome endpoints. Mirrored relationship IDs are remapped to client actors,
so links follow interpolation rather than stale host coordinates. Missing rows
clear old relationships. Recovery poses copy their resolved emergence material,
remaining life and source story, remap to client bodies and clear on absence.
Body visibility, concealed bodies and covered floors
gate the supplementary cues; event flashes retain their story. Zone transitions
clear old field, recovery and relationship afterimages.

Run `npm run check`, `npm run probe -- companioncues`, companionstance,
companionrecovery, revivering, tamebeast, pack, emerge, persistence, proccues,
feedingcues and necromancercourts probes, then the smoke simulation. After the
probe and build, `electron balance/companion-cues-ui.cjs` exercises actual
taming, rejection, stances, down/revival, Undying, field retirement, remnant
body/HUD banks, bright/compact views and co-op in a hidden disposable session.

Encounter acceptance: identify each keeper in a mixed pack; distinguish a
failed claim from damage resistance; find and revive a collapsed companion;
recognize a newly returned body without mistaking its animation for protection;
and read field removal and material banks during crowded combat. Tune shared
profiles and density after playing these situations.

Validation note (2026-09-27): the isolated cue batch reproduced the existing
Hounds autonomous-art test failure on baseline `b91db187`. The combined creature
appearance batch fixes that fixture by using the existing AI priority policy;
all 94 Tame Beast checks now pass. See [the fixture explanation](../render/stalkers.md).
The 63 focused cue checks separately verify real claim/stance, domination,
pack-bond loss, downing and both companion/co-op recovery outcomes.
