# Item readability and the earned opening

New characters have no spendable passive points. Their class root is still
granted, and the first level-up grants the first point through the normal XP
path. Existing saves keep their earned and allocated state; no compatibility
reset is needed. `PROGRESSION.startingPassivePoints`, `passivePointsPerLevel`
and `passivePointsAtLevel` in `src/data/classes.ts` define the policy for player
creation, mercenary normalization and the simulation's reference builds.
The passive menu pip and HUD hint continue to read the actual unspent balance.

Inventory supports carry a top-left star. The upper-right lock and bottom
level controls retain their own space. `src/render/itemIcons.ts` holds the
shared category glyphs and support badge colors/symbol. Inventory tiles and
world drops use that vocabulary; memories and vestiges use their existing
registries, and gems retain their definition-colored face and name initials.
World-drop tile sizes, text sizes, outlines, glow and bobbing are tunable in
`VIS_CFG.drops`. Gear keeps its rarity-colored name label. Co-op snapshots
carry the gear base id and gem name needed to render the same appearance.

All bag sort modes retain their primary ordering. Ties group by content id,
rarity and level, then the complete saved content. Content identity excludes
uid, grid position and the keeper's lock; it retains rolls, sockets, tree
choices and other gameplay state. Object key order is normalized, and uid
provides the final deterministic tie-break. Keys are computed once per sort.

Duplicate runs prefer an adjacent rectangular block, widest first, so five
common Cleaves can sit on one row instead of filling unrelated equipment
holes. When no block fits, ordinary placement remains available. Locked items
stay pinned; packing retries and exact rollback remain in force. A crowded
or locked bag can therefore constrain adjacency, but sorting never discards
an item or violates its footprint. Registered sort modes inherit this behavior.

Verification: `npm run check`, `npm run sim -- run --suite smoke`,
`npm run probe`. Focused rigs: `probe_bagsort.ts` covers duplicate state,
directions, equipment holes, pins and packing safety; `probe_itemreadability.ts`
covers every class's opening XP/attention and the real drop painter before and
after a co-op snapshot round-trip.
