// ---------------------------------------------------------------------------
// PASSIVE REALMS — parallel constellations of passive power, each a TAB on
// the tree panel (the world map's dimension-tab pattern applied to builds).
//
// The main nine-point star is the implicit realm ('tree'). Every OTHER realm
// is one registration here plus nodes carrying `realm: '<id>'` — the same
// PassiveNode schema, the same allocation walk, the same recalc folding, the
// same choice-node deals, the same saves and wire. A realm decides only:
//
//   * WHEN it appears  — unlockLedger: a run-ledger counter future content
//                        bumps (a devotion shrine attuned, a god communed);
//                        absent = always open. DEV.showAllRealms reveals all.
//   * HOW it allocates — adjacency 'tree' (path from roots, the star's rule)
//                        or 'free' (every node stands alone — the Pantheon
//                        shape: pick your god, no pathing).
//   * WHAT it spends   — currency 'passive' shares the main pool; any other
//                        string is a realm currency in meta.realmPoints,
//                        earned through world.grantRealmPoints (the seam
//                        quest rewards / shrines / communions will call).
//
// This is deliberately GROUNDWORK: the Devotion and Pantheon realms below
// ship as locked scaffolding (their unlockLedger keys are written by nothing
// yet), proving the machinery end-to-end so future passes only add content.
// ---------------------------------------------------------------------------

import { DEV } from '../config';

export interface PassiveRealmDef {
  id: string;
  /** Tab label — "Devotion", "The Pantheon". */
  label: string;
  /** Tab + node accent color. */
  color?: string;
  /** Tab tooltip — what this realm of power IS. */
  blurb?: string;
  /** 'tree' (default): a node needs an allocated neighbour; `roots` open the
   *  walk. 'free': every node allocates alone (realm open + points suffice). */
  adjacency?: 'tree' | 'free';
  /** Auto-allocated (free) the first time the realm is seen OPEN — the entry
   *  seams of a 'tree'-adjacency realm (the vocation-crest pattern). */
  roots?: string[];
  /** Point pool: 'passive' (default) = the main pool; anything else names a
   *  REALM CURRENCY tracked in meta.realmPoints[currency]. */
  currency?: string;
  /** Run-ledger counter that OPENS the realm at ≥ 1 (absent = always open). */
  unlockLedger?: string;
}

/** The implicit main realm — nodes with no `realm` field belong here. Its
 *  def exists so tabs/validators never special-case the star. */
export const MAIN_REALM = 'tree';

export const PASSIVE_REALMS: Record<string, PassiveRealmDef> = {};

export function registerPassiveRealm(def: PassiveRealmDef): PassiveRealmDef {
  if (PASSIVE_REALMS[def.id]) console.warn(`[realms] duplicate realm '${def.id}' — last wins`);
  PASSIVE_REALMS[def.id] = def;
  return def;
}

registerPassiveRealm({
  id: MAIN_REALM,
  label: 'The Star',
  color: '#c8a84b',
  blurb: 'The nine-pointed star every hero walks — passive points, earned by level.',
});

/** The realm a node belongs to (nodes with no `realm` field ride the star). */
export function realmIdOf(node: { realm?: string }): string {
  return node.realm ?? MAIN_REALM;
}

export function realmOf(node: { realm?: string }): PassiveRealmDef | undefined {
  return PASSIVE_REALMS[realmIdOf(node)];
}

/** Is this realm OPEN for a character with this run ledger? The main realm
 *  always is; DEV.showAllRealms force-opens everything (testing the tabs
 *  before any content writes the unlock counters). */
export function realmOpen(def: PassiveRealmDef | undefined, ledger: Readonly<Record<string, number>>): boolean {
  if (!def) return false;
  if (!def.unlockLedger) return true;
  if (DEV.showAllRealms) return true;
  return (ledger[def.unlockLedger] ?? 0) >= 1;
}

/** Every realm currently open for this ledger, declaration order — the tab
 *  strip reads this (the main realm is always first by registration). */
export function openRealms(ledger: Readonly<Record<string, number>>): PassiveRealmDef[] {
  return Object.values(PASSIVE_REALMS).filter(r => realmOpen(r, ledger));
}

/** Boot-time integrity sweep (validate.ts): realm refs resolve, roots exist
 *  in their own realm, free realms carry no dead edges. Warn-only. */
export function validatePassiveRealms(
  warn: (msg: string) => void,
  nodes: Record<string, { id: string; realm?: string; vocation?: string; links?: string[] } | undefined>,
): void {
  for (const n of Object.values(nodes)) {
    if (!n) continue;
    const rid = realmIdOf(n);
    const realm = PASSIVE_REALMS[rid];
    if (!realm) { warn(`passive ${n.id}: unknown realm '${rid}'`); continue; }
    if (n.realm && n.vocation) warn(`passive ${n.id}: realm + vocation on one node — undefined gating`);
    if (realm.adjacency === 'free' && n.links?.length) {
      warn(`passive ${n.id}: links in FREE-adjacency realm '${rid}' are dead edges`);
    }
  }
  for (const r of Object.values(PASSIVE_REALMS)) {
    for (const rootId of r.roots ?? []) {
      const root = nodes[rootId];
      if (!root) { warn(`realm ${r.id}: root '${rootId}' is not on the tree`); continue; }
      if (realmIdOf(root) !== r.id) warn(`realm ${r.id}: root '${rootId}' belongs to realm '${realmIdOf(root)}'`);
    }
    if (r.currency === '') warn(`realm ${r.id}: empty currency string (use 'passive' or omit)`);
  }
}

// --- the scaffolding realms ----------------------------------------------------
// DEVOTION — a Grim Dawn-shaped constellation: its own currency (devotion
// points, to be earned at future shrines), tree adjacency from a free root.
registerPassiveRealm({
  id: 'devotion',
  label: 'Devotion',
  color: '#7ab8d8',
  blurb: 'Constellations attuned at shrines — devotion points walk their stars, and their powers can be GRAFTED onto your skills.',
  adjacency: 'tree',
  roots: ['dev_hunt_root'],
  currency: 'devotion',
  unlockLedger: 'devotion_attuned',
});

// THE PANTHEON — a PoE-shaped god board: FREE adjacency (you kneel where you
// choose), its own communion currency, choice-node shrines dealing the gods.
registerPassiveRealm({
  id: 'pantheon',
  label: 'The Pantheon',
  color: '#d8b878',
  blurb: 'The gods answer communion — free-standing shrines, no pathing: choose a Major voice and minor blessings.',
  adjacency: 'free',
  currency: 'communion',
  unlockLedger: 'pantheon_communed',
});
