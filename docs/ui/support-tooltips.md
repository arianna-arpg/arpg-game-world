# Support compatibility tooltips

Support item and vendor gem cards list the panel owner's equipped skills in
bar order. A checkmark means the shared socket compatibility gate accepts this
support; a muted dash means it does not. Matching skills with occupied or absent
sockets retain their checkmark and show `Sockets full` or `No sockets` separately.
The list appears in compact and full detail, including sell and salvage views.

`src/ui/supportCompatibility.ts` owns this presentation and its configurable
status glyphs/colors. It calls `supportFitsInstOrCrew` with the actual support's
rolled payload, the live skill instance, and `World.summonCrewSkills`. Skill-tree
changes, enabling supports, worn grafts and summon crews therefore use exactly
the same compatibility rules as socketing and drag highlighting. A checkmark
describes compatibility, not permission to change equipment during combat or a
promise that a summon crew's forwarding gate is open.

The hero bar comes from `World.seatHero(panelOwner)`, matching the Skills rack
during possession and couch co-op. Empty slots and unseated grants are omitted;
seated item-granted skills are included. Each hover reads current state without
mutating gameplay. Definition-only commission cards stay definition-only because
the future copy has not been rolled yet.

Verify with `npm run check`, `npm run build`, then
`npx electron balance/support-tooltips-ui.cjs`. The hidden, isolated UI harness
checks actual inventory/vendor hover cards, current loadouts, rolled copies,
capacity, grants, crew compatibility and panel ownership without personal saves.
