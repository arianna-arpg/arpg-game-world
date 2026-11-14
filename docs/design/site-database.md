# Database reading and discovery

The Database keeps short cards for scanning. Hover or keyboard focus unfolds
the actual description in place; touch screens expose a separate Read
description control. Selecting the card still opens the mechanics/raw-data
drawer. Only the active description is measured, and reduced-motion visitors
get an immediate expansion. Unique modifiers and support compatibility rules
are included in the expanded card.

`site/assets/database-rules.js` is shared by the browser, data export and
regression checks. Exported skills carry `learnable` (`!noDrop`) and
`droppable` (also positive `dropWeight`, default 100). These are catalogue
eligibility facts, not a claim about a visitor's current unlocks or level.
Non-dropping creature arts, payloads and secondary actions stay visible and
are labelled **Not directly learnable**, rather than all being called
monster-only. Recommended sorting lists learnable skills alphabetically,
then other entry kinds, then non-learnable skills alphabetically. Plain name
and ID sorting remain available.

Supports export `requiresTags`, `excludeTags` and `requiresMechanisms`.
Selected tags describe a host skill: any required tag qualifies, any excluded
tag vetoes, and unrestricted supports remain eligible. This mirrors the
engine's `supportFitsTags` predicate. Mechanism requirements and rolled gem
bases still govern actual socketability in the game; granted tags and loot
bias tags are not applicability requirements. Skill tag facets continue to
require every selected tag.

Search accepts normal names/effects plus `tag:spell`, `learnable:true/false`
and `droppable:true/false`. These can combine with ordinary text. Standalone
`learnable`, `unlearnable`, and `droppable` searches also work.

Verify with `node --test scripts/test-site-database.mjs`, the normal web-data
export, and `electron scripts/check-site-database.cjs`. Existing interior and
icon checks cover the surrounding pages and artwork/deep-link behavior.
