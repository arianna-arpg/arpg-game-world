# Passive refunds at the Sacrificial Font

The Font offers **Refund passives**, which opens the passive tree in refund
mode. The tree also offers **Refund at Font** when the player stands beside
a reachable Font on the same story. Refunds are free and use the Font's
existing calm discipline. `FONT_CFG.passiveRespec.enabled` controls the service.
This is available independently of the later skill-tree awakening milestone.

In refund mode, removable nodes have violet outlines. Clicking a node returns
its original points; clicking a blocked node explains why. **Finish refunding**
restores allocation mode. Closing the tree or refreshing it away from the Font
clears refund mode. Every request rechecks the player's position and state.

`engine/passiveRefund.ts` supplies the same preview and legality decision to
the UI and the host. It walks the remaining allocated graph from the class's
original start, earned Vocation crests, and each constellation's free roots.
Purchased starts never become new anchors. Distinct constellations cannot
borrow one another's roots. Free-adjacency constellations need no path.
Alternate paid routes are valid, but isolated branches or cycles are not.
Vocation gates cannot be refunded while their dependent nodes remain invested.

Freely granted roots never return points. Ordinary nodes return one point;
choice nodes return all their paid picks together. Points return to the original
passive, Vocation, or realm pool. Shared first-choice groups require refunding
their paid shortcut siblings before their claimant, preserving the distinction
between paid pathing and paid choices without inventing credit.

The host deletes removed choices and their graft bindings, recalculates live
stats and company bonuses, retracts forwarded grafts, and refreshes ordinary
summons' owner investment. Refunds mark character and seat state dirty using
the existing save/replication paths; no separate refund wallet or save schema
is introduced. `refundPassive` is a validated seat-scoped meta action.

Verify with `npm run probe -- passiverefund`, `npm run probe -- choices`,
`npm run check`, and, after a build, the hidden isolated-save
`balance/font-passives-ui.cjs` walkthrough.
