// ---------------------------------------------------------------------------
// DEV CONFIG — quick local toggles for QA / preliminary tooling. These are NOT
// shipped features; flip a flag to 1 while developing, leave it 0 for normal
// play. Kept in one place so there's a single obvious switchboard.
// ---------------------------------------------------------------------------

export const DEV = {
  /** 1 = show the in-game DEV PANEL (bottom-left "🔧 Dev" button): a TABBED tool —
   *  GEMS (drop any skill/support gem + grant levels/points) and EVENTS (force-spawn
   *  any world event in the current zone + a live global event-frequency crank).
   *  0 = off (no button, zero overhead). */
  gemSpawner: 1,
  /** 1 = PASSIVE-TREE EDITOR: with the tree open (P), click a node to SELECT it,
   *  drag to move it, click ANOTHER node (while one is selected) to add/remove the
   *  link between them, click the selected node to deselect, double-click empty
   *  space to create a node, edit its name/kind/stats in the side panel, and Save
   *  to write the layout back to src/data/passives.ts (backs up to .bak).
   *  Requires the Vite dev server (the /__dev/passives endpoint). 0 = off. */
  passiveTreeEditor: 0,
};

/** FEATURE TOGGLE: the eager pre-minted world WEB. When ON, visiting a zone immediately
 *  resolves its uncharted "?" frontiers into real "pre-recognized" neighbour nodes (real
 *  coord + biome from the heat map; layout still generated lazily on first entry), and a
 *  frontier that lands near an existing node LINKS to it instead of minting an overlapping
 *  twin — an interwoven web with no leap-over and no stray "?" ghosts. OFF = the classic
 *  lazy "?" frontier (mint only on travel). Flip to compare / revert. */
export const EAGER_WORLD_WEB = true;
