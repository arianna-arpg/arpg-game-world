// ---------------------------------------------------------------------------
// DEV CONFIG — quick local toggles for QA / preliminary tooling. These are NOT
// shipped features; flip a flag to 1 while developing, leave it 0 for normal
// play. Kept in one place so there's a single obvious switchboard.
// ---------------------------------------------------------------------------

/** THE GAME'S NAME — every display surface prints through this one constant
 *  (menus, the browser tab, the launcher window). Save keys and file paths
 *  deliberately do NOT: renames must never orphan a player's saves. */
export const GAME_TITLE = 'Hollow Wake';

export const DEV = {
  /** 1 = show the in-game DEV PANEL (bottom-left "🔧 Dev" button): a TAB-REGISTRY
   *  tool (dev/panel.ts — each tab is one module in dev/tabs/) —
   *  GEMS (drop any skill/support gem + grant levels/points/vocations),
   *  ITEMS (forge any base/unique at any ilvl with chosen affixes+tiers, roll
   *  quality, sockets; live tooltip preview; drop at feet),
   *  EVENTS (force-spawn any world event here + a live event-frequency crank),
   *  LOCATION (jump to any dimension or the nearest (un)explored biome —
   *  minting one from the live heat map when none exists — plus zone hop,
   *  ghost/noclip, kill-all).
   *  0 = off (no button, zero overhead). */
  panel: 1,
  /** 1 = THE ENTITY FORGE (dev/entityForge.ts): a full-screen entity
   *  creator/tweaker reachable from the START MENU ("Entity Forge" button) and
   *  from the dev panel's Forge tab in-game. Compose looks from the part
   *  grammar (drag to offset, wheel to scale, [ ] to rotate, live animated
   *  preview), tune every MonsterDef field through the schema-driven
   *  inspector, and save to THE WORKSHOP (meta/workshop.ts — hybrid-persisted
   *  JSON; entities graft into the live registries under the 'custom_'
   *  namespace and ride every fabric shipped content rides). Export TS emits
   *  the def+look as source literals for hand-promotion into src/data.
   *  0 = off (no button, no tab, zero overhead). */
  entityForge: 1,
  /** 1 = PASSIVE-TREE EDITOR: with the tree open (P), click a node to SELECT it,
   *  drag to move it, click ANOTHER node (while one is selected) to add/remove the
   *  link between them, click the selected node to deselect, double-click empty
   *  space to create a node, edit its name/kind/stats in the side panel, and Save
   *  to write the layout back to src/data/passives.ts (backs up to .bak).
   *  Requires the Vite dev server (the /__dev/passives endpoint). 0 = off. */
  passiveTreeEditor: 0,
  /** 1 = reveal every PASSIVE REALM tab (data/passiveRealms.ts) regardless of
   *  its unlockLedger — the scaffolding realms (Devotion, the Pantheon) become
   *  visitable before any content writes their discovery counters. 0 = only
   *  realms the character has actually unlocked. */
  showAllRealms: 0,
};

/** FEATURE TOGGLE: the eager pre-minted world WEB. When ON, visiting a zone immediately
 *  resolves its uncharted "?" frontiers into real "pre-recognized" neighbour nodes (real
 *  coord + biome from the heat map; layout still generated lazily on first entry), and a
 *  frontier that lands near an existing node LINKS to it instead of minting an overlapping
 *  twin — an interwoven web with no leap-over and no stray "?" ghosts. OFF = the classic
 *  lazy "?" frontier (mint only on travel). Flip to compare / revert. */
export const EAGER_WORLD_WEB = true;
