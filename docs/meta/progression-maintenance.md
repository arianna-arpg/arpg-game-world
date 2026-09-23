# Refreshing the progression maps

Use this workflow when asked to update the Hollow Wake progression diagrams after
game changes. Keep the path-by-path presentation and the connected overview as two
separate views. The original conversation snapshot is intentionally preserved.

## Small-context entry point

Read this file, `scripts/progression/current-paths.cjs`, `scripts/progression/overview.cjs`, and the generated
`balance/reports/progression-refresh/review-needed.md`. Inspect only changed gates
and their consumers next. The original broad source audit is in
`docs/meta/progression-map.md`; it is a historical snapshot, not the latest runtime
specification. Do not load its entire generated appendix just to refresh a map.

```powershell
node scripts/progression/refresh.cjs
```

This reads the working tree, loads the content registries in the simulation
environment, and extracts the current Vault catalog, classes, Memories, packages,
Vocations, quests, modes and cosmetics. It does not load or change a player's save.
Costs, catalog membership, all/any prerequisites, package tests, rewards and the
Odyssey thresholds come from game data. Output goes to the ignored report folder.

If game sources changed since the reviewed snapshot, the command exits with code 2
after extracting the fresh catalog. `review-needed.md` lists changed source files.
Rendering stops so an old hand-authored explanation cannot silently masquerade as
the new progression. The watch covers all game TypeScript because runtime consumers
can add gates outside the unlock catalog; unrelated rendering/combat changes can be
reviewed as having no progression impact.

1. Inspect relevant diffs and runtime consumers from the changed-file list. Compare
   against the previous map or version control. A changed-file hash is an alert,
   not a semantic analysis of the change.
2. Update the reviewed category flows in `scripts/progression/current-paths.cjs`,
   remaining narrative steps in `scripts/progression/paths.cjs`, and shared relationships
   in `scripts/progression/overview.cjs`. Keep AND/OR alternatives, account versus
   character scope, debug bypasses, and discovery versus activation distinct.
3. Add or update a catalog selector when a new system appears. Every active Vault
   row must belong to exactly one overview node; missing or duplicate membership
   fails the build. The overview must be connected and every node placed once.
4. After reviewing changes, rebuild and record that source baseline:

```powershell
node scripts/progression/refresh.cjs --accept-reviewed
```

The default command can then rebuild repeatedly without another broad audit.
`--accept-reviewed` is an acknowledgment by the maintainer, not an automated claim
that runtime semantics were verified. Source edits during extraction cause failure.

## Outputs and presentation

- `hollow-wake-paths.html`: the category presentation, currently eleven paths,
  including the dedicated Oracle, account Relics and storage flow.
- `hollow-wake-overview.html`: one connected tree, with exact catalogs expandable
  inside its branches and named cross-system connections.
- `progression-snapshot.json`: raw registry extraction, including executable gate text.
- `progression-data.json` and `overview-data.json`: normalized view data.
- `catalog.md`: freshly extracted reference tables; never overwrites the old audit.

Both templates live beside the builder. There is no embedded catalog to edit by
hand. Pass `--out <directory>` to generate into an authorized durable visualization
directory when presenting a refreshed version. Use a new directory/name when the
user wants the old snapshot preserved. The builder never writes the original
`hollow-wake-progression.html` filename.

Read the installed visualization skill before editing a template or presenting a
new inline view. Use its `render.py` to create `overview-preview.html` in the output
directory, then run:

```powershell
npx electron scripts/progression/verify-ui.cjs balance/reports/progression-refresh
npx electron scripts/progression/verify-paths-ui.cjs balance/reports/progression-refresh
```

The hidden browser checks every system, every catalog branch, graph relationships,
state restoration, and expanded mobile layouts. Inspect the generated desktop,
detail and mobile screenshots too. Render `hollow-wake-paths.html` as
`paths-preview.html` for the category harness. No game regression
suite is needed for diagram-only changes; gameplay edits still follow `AGENTS.md`.

## Scope and known boundaries

The overview groups related mechanics so the whole tree remains readable; opening
a node exposes its catalog subtree. Arrows describe relationships, not a universal
AND gate or a compulsory play order. Default world content, earned permissions,
Vault purchases and character growth have distinct labels. The extracted catalog
uses a fresh account: static rows plus initial next-rank empowerment
and next-page storage examples. Later ranks/pages depend on account ownership;
Fallen-vessel rows depend on the saved roster and are described separately. Relic
power prices, storage capacity, market ladder values, rescue grants and Font policy
now extract from their authored definitions in `export.ts`. The tree
does not enumerate every affix, skill-tree node, item, procedural site or generated
quest instance. Future prestige consumers and the final Odyssey undertaking remain
future design until implemented.

Suggested future request: “Refresh both progression views using
docs/meta/progression-maintenance.md. Review changed gates, preserve their layout,
and show the updated connected overview.”
