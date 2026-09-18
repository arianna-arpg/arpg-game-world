// ---------------------------------------------------------------------------
// DEV CONFIG — quick local toggles for QA / preliminary tooling. These are NOT
// shipped features. Kept in one place so there's a single obvious switchboard,
// with TWO DOORS onto it:
//   • THE AUTHORED NUMBERS (`AUTHORED` below): flip a flag to 1 while
//     developing, leave it 0 for normal play — compiled in, so a dist/ build
//     bakes whatever they say.
//   • THE RUNTIME OPT-IN: `?dev` on the game's own address raises the panel
//     (and the Map Forge — the standing law in main.ts), and `?dev=<list>`
//     names more: `forges` (the Entity / Glyph / Map forges) and `editor`
//     (the passive-tree editor). The desktop launcher's Developer toggles
//     (launcher/main.cjs `devMode` → `gameAddress`) compose exactly this
//     address, so no source edit and no rebuild stands between a toggle and
//     the tool. Browser-only by construction: the headless sim and probes
//     see no `location` and read the authored numbers verbatim.
// ---------------------------------------------------------------------------

/** THE GAME'S NAME — every display surface prints through this one constant
 *  (menus, the browser tab, the launcher window). Save keys and file paths
 *  deliberately do NOT: renames must never orphan a player's saves. */
export const GAME_TITLE = 'Hollow Wake';

/** THE AUTHORED NUMBERS — the compiled-in defaults (0 = off). Leave them 0
 *  on main; the launcher's Developer toggles are the everyday door. */
const AUTHORED = {
  panel: 0,
  entityForge: 0,
  mapForge: 0,
  passiveTreeEditor: 0,
  showAllRealms: 0,
};

/** THE RUNTIME OPT-IN: the words after `?dev=` on the page's own address
 *  (bare `?dev` = the panel alone). Empty off the browser. */
export const DEV_OPT_INS: ReadonlySet<string> = ((): ReadonlySet<string> => {
  try {
    const q = new URLSearchParams(location.search);
    if (!q.has('dev')) return new Set();
    const words = (q.get('dev') ?? '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    return new Set(['panel', ...words]);
  } catch { return new Set(); }
})();
const optIn = (word: string): 0 | 1 => (DEV_OPT_INS.has(word) ? 1 : 0);

export const DEV = {
  /** 1 = show the in-game DEV PANEL (bottom-left "🔧 Dev" button): a TAB-REGISTRY
   *  tool (dev/panel.ts — each tab is one module in dev/tabs/) —
   *  GEMS (drop any skill/support gem + grant levels/points/vocations),
   *  ITEMS (forge any base/unique at any ilvl with chosen affixes+tiers, roll
   *  quality, sockets; live tooltip preview; drop at feet),
   *  EVENTS (force-spawn any world event here + a live event-frequency crank),
   *  LOCATION (jump to any dimension or the nearest (un)explored biome —
   *  minting one from the live heat map when none exists — plus zone hop,
   *  ghost/noclip, kill-all),
   *  PULSE (live frame telemetry off the always-on main-loop rings — fps,
   *  gap/sim/render percentiles, hitch counts, world/chart rates — plus the
   *  toggleable top-right FPS CHIP overlay).
   *  0 = off (no button, zero overhead). Runtime opt-ins without a source
   *  edit: `?dev` on the URL, localStorage 'dev_panel'='1', or
   *  `__game.devPanel()` to mount it live in a RUNNING session. */
  panel: AUTHORED.panel || optIn('panel'),
  /** 1 = THE ENTITY FORGE (dev/entityForge.ts): a full-screen entity
   *  creator/tweaker reachable from the START MENU ("Entity Forge" button) and
   *  from the dev panel's Forge tab in-game. Compose looks from the part
   *  grammar (drag to offset, wheel to scale, [ ] to rotate, live animated
   *  preview), tune every MonsterDef field through the schema-driven
   *  inspector, and save to THE WORKSHOP (meta/workshop.ts — hybrid-persisted
   *  JSON; entities graft into the live registries under the 'custom_'
   *  namespace and ride every fabric shipped content rides). Export TS emits
   *  the def+look as source literals for hand-promotion into src/data.
   *  0 = off (no button, no tab, zero overhead). `?dev=forges` (the
   *  launcher's Forges toggle) raises it without a source edit. */
  entityForge: AUTHORED.entityForge || optIn('forges'),
  /** 1 = THE MAP FORGE (dev/mapForge.ts): a full-screen MAP EDITOR reachable
   *  from the START MENU ("Map Forge" button) and the dev panel's Maps tab.
   *  Paint a zone as a grid of registered region kinds, place doodads /
   *  spawn seats / markers / plan structures / exits, set the zone sheet
   *  (dress tileset, objective, level, policies, a bounty expedition block),
   *  see the REAL generator's walk mask + reachability live, save to THE
   *  ATLAS (meta/atlas.ts — 'custom_' maps grafted into the live registry,
   *  hybrid-persisted), mint & walk it beside the hero, re-mint after every
   *  edit, and export TS promotion literals (+ a ready QuestZoneSpec) for
   *  src/data/authoredMaps.ts. Also mounts under the `?dev` opt-in (and
   *  `?dev=forges` with the rest of the forge family).
   *  0 = off (no button, no tab, zero overhead). */
  mapForge: AUTHORED.mapForge || optIn('forges'),
  /** 1 = PASSIVE-TREE EDITOR: with the tree open (P), click a node to SELECT it,
   *  drag to move it, click ANOTHER node (while one is selected) to add/remove the
   *  link between them, click the selected node to deselect, double-click empty
   *  space to create a node, edit its name/kind/stats in the side panel, and Save
   *  to write the layout back to src/data/passives.ts (backs up to .bak).
   *  Writing SOURCE needs the Vite dev server's /__dev/passives endpoint —
   *  `npm run dev`, or the launcher's Developer mode with Live source on;
   *  anywhere else the save falls back to THE RESCUE DUMP (see
   *  dev/passiveEditor.ts). `?dev=editor` (the launcher's Passive tree
   *  editor toggle) raises it without a source edit. 0 = off. */
  passiveTreeEditor: AUTHORED.passiveTreeEditor || optIn('editor'),
  /** 1 = reveal every PASSIVE REALM tab (data/passiveRealms.ts) regardless of
   *  its unlockLedger — the scaffolding realms (Devotion, the Pantheon) become
   *  visitable before any content writes their discovery counters. 0 = only
   *  realms the character has actually unlocked. */
  showAllRealms: AUTHORED.showAllRealms,
};

/** FEATURE TOGGLE: the eager pre-minted world WEB. When ON, visiting a zone immediately
 *  resolves its uncharted "?" frontiers into real "pre-recognized" neighbour nodes (real
 *  coord + biome from the heat map; layout still generated lazily on first entry), and a
 *  frontier that lands near an existing node LINKS to it instead of minting an overlapping
 *  twin — an interwoven web with no leap-over and no stray "?" ghosts. OFF = the classic
 *  lazy "?" frontier (mint only on travel). Flip to compare / revert. */
export const EAGER_WORLD_WEB = true;
