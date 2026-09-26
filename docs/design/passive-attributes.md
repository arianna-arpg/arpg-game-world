# Selectable passive attributes

The first attribute iteration lets a player fund another class's skill
requirements while traveling toward the passive mechanics their build wants.
Every pure, single-attribute training node now offers all ten registered
attributes, including Vitality. Each node independently grants one selection:
122 nodes grant +2 and 14 grant +5, for the existing one-point cost.

Node ids, connections, positions, sizes and investment amounts are preserved.
The four pure +5 small nodes in Versatility's cluster participate as well.
Free class starts, Harmony, Versatility, the Intelligence/Willpower mixed
passive and The Pulse's Vitality/life package retain their authored grants.
Existing larger calling/temper menus retain their separate designs.

## Shared authoring surface

`src/data/passiveAttributes.ts` registers ordinary choice groups from
`ATTRIBUTE_IDS` and `ATTRIBUTES`; it owns the two amounts and option payloads.
Explicit rows in `passives.ts` reference a group via `choice`, while retaining
their small/attribute presentation. No allocation or combat branch recognizes
an attribute node id. Selected attributes fold through the normal stat engine
and its learning and cast-time requirement checks.

The popup shows each grant and its derived stat benefits, supports search and
scrolling, and spends nothing when dismissed. A dashed ring marks a selection
regardless of node size. The node tooltip records the chosen attribute.
The Font's existing refund service returns the node's point and removes its
selection, subject to connected-path checks. A new allocation may pick a
different attribute. There is no free in-place reassignment in this pass.

`PassiveChoiceGroup.pathing` marks a repeatable training deal for route audits.
`choicePathing` accepts only independent, node-local, single-pick deals, so
exclusive or exhausted mastery pools cannot accidentally stand in for a
walkable route. The all-tree allocation probe now supplies training selections
while continuing to test both inclusion and exclusion of optional menus.

## Existing builds

`PassiveChoiceRef.allocatedDefault` names the old attribute as content on each
converted node. `sanitizeChoices(raw, nodes, allocated)` materializes this as
one ordinary choice when an owned node has no valid saved selection. An
explicit valid pick wins, unowned picks drop, and independent single-pick
validation prevents defaults claiming exclusive groups or extra picks.

Disk characters, co-op seats, veteran mercenary snapshots and simulation
builds share this normalization. It never spends another point or changes a
fresh allocation's requirement to choose. Subsequent saves store the normal
choice record; no alternate stat calculation or old gameplay implementation
is retained. Account and run compatibility versions stay unchanged.

The visual editor preserves the group and initial selection through export
and exposes both for editing. Changing a group clears its old default.

## Developer skill testing

For isolated skill testing, **Dev → Gems → Ignore skill attributes** toggles
`World.devIgnoreSkillAttributes`. It defaults off, applies only to the local
hero in single-player or on the host, and resets with a new run or reload.
The shared `reqShortfall` read covers learning, casting, triggers and UI
availability. Other seats and joined clients retain normal rules. Attributes,
skill definitions, resource costs, cooldowns and other gates remain intact;
turning the toggle off immediately restores the learned-skill requirement gate.
Verify `probe_castreq.ts` and, after a build, the hidden isolated
`balance/dev-skill-attributes-ui.cjs` walkthrough.

## Next experiment

Core attributes with companion grants are intentionally deferred. Choice
options already support several flat attributes, percentage grants, modifiers,
conduits and grafts. The next pass can define companion payloads and new groups
as content, with an explicit decision about how changed rewards affect owned
nodes. This pass establishes the individual-selection comparison baseline.

## Verification

- `npm run check` and `npm run build`.
- `npm run probe -- passive`, plus `choices` and `castreq`.
- `probe_passiveattributes.ts` exhausts 136 nodes × ten attributes, invalid
  choices, exact costs, old-save normalization, repeated reload, co-op,
  a connected Warrior route that learns/casts Firebolt, and Font refund and
  reselection with live requirement checks.
- `npm run sim -- run --suite smoke` exercises the reference builds.
- After building, `npx electron balance/passive-attributes-ui.cjs` checks real
  clicks, cancellation, search, gains, refunds and reselection at 1400×1000
  and 1000×720; screenshots use isolated saves. All 136 edited rows and their
  links round-trip through the actual visual editor.

This establishes mechanical correctness and the first playtest baseline;
the relative value of attribute stacking versus specialized passives remains
a tuning question for the subsequent play passes.
