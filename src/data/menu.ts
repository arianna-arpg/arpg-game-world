// ---------------------------------------------------------------------------
// THE MENU'S PAGES — every page the HUD's Menu button can name, as data.
//
// One row per page (engine/menu.ts MenuEntryDef): the DOM bar draws the
// rows the fold leaves non-hidden, greys the sealed ones, and opens an open
// row through its VERB (ui/panels.ts menuVerbs — one host row per verb id).
// Adding a page = one entry here (+ one verb row if the verb is new);
// adding a tell = one attention row. Nothing in the bar names a page.
//
// THE THREE STATES, by example:
//   inventory — no gate, no usable read: always open (the keyed panels).
//   bestiary  — gate {feature: TRACKER}: HIDDEN until the Vault's tracker
//               is owned; then SEALED until the seat lingers at his fire
//               (nearTracker — the SAME near-read the dwell fires on, so the
//               menu can never open what the fire would refuse); OPEN there.
//   harbor    — gate {ledger: first_port_found} over the MERGED ledger: the
//               page exists once this account (or this run) has found the
//               sea; sealed away from a port's board.
//
// THE ATTENTION ROWS: passive points → the passive tree's pip; banked
// ability points (skill-mode trees) → the inventory's pip (the SKILLS flap
// spends them); Mireille's flask lesson → the inventory's LESSON glow while
// her flasks wait unseated in the pack and the bag is closed — the button
// glows first, then the Inventory tile, then (ui/panels.ts) the SKILLS flap
// and the rack seats carry the gesture home. SHOW, never TELL.
// ---------------------------------------------------------------------------

import { registerMenuAttention, registerMenuEntry, registerMenuGroup, type MenuReads } from '../engine/menu';
import { bandPointsAt, treePointsSpent } from '../engine/skills';
import { FEATURE } from '../meta/account';
import { LEDGER_MERC_OUTPOST_FOUND } from '../meta/mercs';
import { VENDORS } from './vendors';

registerMenuGroup({ id: 'hero', label: 'Character', order: 0 });
registerMenuGroup({ id: 'town', label: 'Stations', order: 1 });
registerMenuGroup({ id: 'system', label: 'System', order: 2 });

// --- the hero's pages (always exist, always open) ----------------------------

registerMenuEntry({
  id: 'inventory', label: 'Inventory', icon: 'bag', group: 'hero', verb: 'inventory', bind: 'panelInv', order: 0,
  blurb: 'Your pack, your worn gear, the SKILLS rack and the essence satchel.',
});
registerMenuEntry({
  id: 'character', label: 'Character', icon: 'sheet', group: 'hero', verb: 'character', bind: 'panelChar', order: 1,
  blurb: 'Attributes, defenses, offense — the sheet every modifier folds into.',
});
registerMenuEntry({
  id: 'passives', label: 'Passive Tree', icon: 'tree', group: 'hero', verb: 'passives', bind: 'panelTree', order: 2,
  blurb: 'Spend passive points on the constellation.',
});
registerMenuEntry({
  id: 'map', label: 'World Map', icon: 'map', group: 'hero', verb: 'map', bind: 'panelMap', order: 3,
  blurb: 'The charted world — roads, waypoints, the ground still veiled.',
});
registerMenuEntry({
  id: 'journal', label: 'Journal', icon: 'journal', group: 'hero', verb: 'journal', order: 4,
  blurb: 'Active and completed quests, the writs you carry.',
});
registerMenuEntry({
  id: 'townPortal', label: 'Town Portal', icon: 'portal', group: 'hero', verb: 'townPortal', bind: 'townPortal', order: 5,
  usable: r => !r.world.townPortalRefusal(r.seat),
  sealedHint: r => r.world.townPortalRefusal(r.seat) ?? '',
  blurb: 'Open a passage to town. Linger at it to travel, and use its other end to return.',
});

// --- the stations (exist by unlock, open at the station) ---------------------

const at = (where: string): string => `Stand ${where} to open this.`;

registerMenuEntry({
  id: 'vendor', label: 'Vendor', icon: 'coins', group: 'town', verb: 'vendor', order: 0,
  // The dwell's own gate (World.updateVendors): at a counter WITH stock —
  // an empty counter never opens a bare screen, from the menu either.
  usable: r => VENDORS.some(v => v.near(r.world, r.seat) && v.stock(r.world).length > 0),
  sealedHint: r => r.world.nearAnyVendor(r.seat) ? 'The counter stands empty until the restock.'
    : at('at a counter — Brandt\'s forge in Lastlight, or a port\'s chandler'),
  blurb: 'Buy, sell and reserve wares at the counter.',
});
registerMenuEntry({
  id: 'salvage', label: 'Salvage Bench', icon: 'anvil', group: 'town', verb: 'salvage', order: 1,
  gate: { any: [{ feature: FEATURE.SALVAGE_STATION }] },
  usable: r => r.world.nearSalvage(r.seat),
  sealedHint: at('at the breaker\'s bench in Lastlight'),
  blurb: 'Break gear into essence; socket and craft.',
});
registerMenuEntry({
  id: 'font', label: 'Sacrificial Font', icon: 'font', group: 'town', verb: 'font', order: 2,
  usable: r => r.world.nearFont(r.seat),
  sealedHint: at('at the Sacrificial Font'),
  blurb: 'Merge gems, convert essence, unmake choices.',
});
registerMenuEntry({
  id: 'oracle', label: 'Oracle Stone', icon: 'eye', group: 'town', verb: 'oracle', order: 3,
  gate: { any: [{ feature: FEATURE.ORACLE_STONE }] },
  usable: r => r.world.nearOracle(r.seat),
  sealedHint: at('among the standing stones in Lastlight'),
  blurb: 'Commune with the stone — re-roll an affix.',
});
registerMenuEntry({
  id: 'bestiary', label: 'Bestiary', icon: 'book', group: 'town', verb: 'bestiary', order: 4,
  gate: { any: [{ feature: FEATURE.TRACKER }] },
  usable: r => r.world.nearTracker(r.seat),
  sealedHint: at('by the Tracker\'s fire in Lastlight'),
  blurb: 'Every kind you have met — mastery, spectre forms.',
});
registerMenuEntry({
  id: 'bounties', label: 'Bounty Board', icon: 'board', group: 'town', verb: 'bounties', order: 5,
  gate: { any: [{ feature: FEATURE.BOUNTY_BOARD }] },
  usable: r => r.world.nearBountyBoard(r.seat),
  sealedHint: at('at a posting board'),
  blurb: 'Postings, the writs in hand, the turn-in.',
});
registerMenuEntry({
  id: 'caravan', label: 'Caravan', icon: 'wagon', group: 'town', verb: 'caravan', order: 6,
  gate: { any: [{ feature: FEATURE.CARAVAN }] },
  usable: r => r.world.nearCaravan(r.seat),
  sealedHint: at('with the Caravanner in Lastlight'),
  blurb: 'Band travel — ride out to the bands the Vault has opened.',
});
registerMenuEntry({
  id: 'harbor', label: 'Harbor', icon: 'anchor', group: 'town', verb: 'harbor', order: 7,
  gate: { any: [{ ledger: 'first_port_found', label: 'find a port' }] },
  usable: r => r.world.nearHarborBoard(r.seat),
  sealedHint: at('at a port\'s harbor board'),
  blurb: 'Passage down the lanes, hearsay, charts.',
});
registerMenuEntry({
  id: 'hold', label: 'Harborhold', icon: 'tower', group: 'town', verb: 'hold', order: 8,
  gate: { any: [{ ledger: 'first_port_found', label: 'find a port' }] },
  usable: r => r.world.nearMusterHorn(r.seat),
  sealedHint: at('at a harborhold\'s muster horn'),
  blurb: 'The town\'s standing, the muster, the restoration.',
});
registerMenuEntry({
  id: 'mercs', label: 'Mercenaries', icon: 'swords', group: 'town', verb: 'mercs', order: 9,
  gate: { any: [{ feature: FEATURE.MERC_RECRUITER }, { ledger: LEDGER_MERC_OUTPOST_FOUND, label: 'find a wilds outpost' }] },
  // THE PARLEY GATE (World.mercParley): the dwell's own words seal the page.
  usable: r => r.world.mercParley(r.seat).why === null,
  sealedHint: r => r.world.mercParley(r.seat).near
    ? r.world.mercParley(r.seat).why ?? ''
    : at('with a captain — the recruiter in Lastlight, or a wilds outpost'),
  blurb: 'Hire and retire hirelings.',
});

// --- system ------------------------------------------------------------------

registerMenuEntry({
  id: 'pause', label: 'Pause Menu', icon: 'gear', group: 'system', verb: 'pause', keyLabel: 'ESC', order: 0,
  blurb: 'Options, co-op, save and exit.',
});

// --- attention ---------------------------------------------------------------

/** Unspent passive points — the tree's pip. */
registerMenuAttention({
  id: 'passive_points', entry: 'passives', kind: 'pip',
  read: r => r.seat.meta.passivePoints,
});

/** Banked ability points across every known skill-mode tree — the SKILLS
 *  flap inside the inventory spends them, so the bag wears the pip. */
export function bankedTreePoints(r: MenuReads): number {
  let n = 0;
  for (const inst of r.seat.meta.knownSkills.values()) {
    if (!inst.def.tree) continue;
    n += Math.max(0, bandPointsAt(inst.level) - treePointsSpent(inst));
  }
  return n;
}
registerMenuAttention({ id: 'tree_points', entry: 'inventory', kind: 'pip', read: bankedTreePoints });

/** Mireille's flask lesson: her gift waits unseated in the pack. The engine
 *  read is latched and lived-aware (World.mireilleGiftLesson), so the glow
 *  can never outlive the lesson; the fold quiets it once the bag is open. */
registerMenuAttention({
  id: 'mireille_lesson', entry: 'inventory', kind: 'lesson',
  read: r => r.seat === r.world.localSeat && r.world.mireilleGiftLesson() === 'learn',
});
