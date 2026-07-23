// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DISCOVERY WEB + THE MOOT LAW (meta/unlocks.ts):
// non-starter classes are shrouded rumors until FOUND — played into
// (per-class level milestones), chained onto (own the parent bundle), or
// learned the hard way (world-fact ledgers: seized by a grip, a trap
// sprung underfoot, a crown/warlord/the Unmade put down). The authored
// spec COMPILES onto the same generic gates every unlock rides; the whole
// web must stay REACHABLE from the starting three; class-slot tiers hide
// while the pool can't fill the hand they sell (no dead purchases); the
// buy gate refuses the undiscovered outright. Live half: the engine
// stamps land — per-class milestones (grantSeatXp), the seize lesson
// (grabSeize → LEDGER_SEIZED), the trap lesson (springTrapwork →
// LEDGER_TRAP_SPRUNG) — for the LOCAL HERO only, all three.
// Run: npx tsx balance/probe_unlocks.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  CLASS_BUNDLES, SLOT_TIERS, UNLOCK_CATALOG, VAULT_SHELF_CFG, VAULT_TABS, allUnlockables,
  applyUnlock, availableUnlocks, classBundleId, classUnlockFor, discoveryLedgerKeys,
  isClassDiscovered, isUnlockOwned, isUnlockVisible, undiscoveredClassUnlocks, vaultKindOrder,
  vaultSeatOf, vaultShelfCensus, vaultStripVisible,
} from '../src/meta/unlocks';
import {
  CLASS_LEVEL_MILESTONES, FEATURE, LEDGER_FLASK_LESSON, STARTER_CLASSES,
  classLevelLedgerKey, makeAccount,
} from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { LEDGER_SEIZED } from '../src/engine/grab';
import { LEDGER_TRAP_SPRUNG, type PlacedTrapwork } from '../src/engine/trapworks';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// The world facts the web may hang a hard lesson on, WITH their stamp homes —
// a new fact key in a discover row must register its source here (this list
// is the probe's map of who stamps what; an unknown key = a rumor that can
// never resolve).
const WORLD_FACTS = new Set<string>([
  LEDGER_SEIZED,        // world.ts grabSeize (victim = local hero)
  LEDGER_TRAP_SPRUNG,   // world.ts springTrapwork (presser = local hero)
  'crowned_killed',     // engine/killHandlers.ts (Crowned rare put down)
  'warlords_killed',    // engine/killHandlers.ts (warband warlord put down)
  'unmade_slain',       // quests/defs.ts reward ledger (the Chronophage)
  'broodmothers_slain', // engine/killHandlers.ts (any brood-queen kind put down)
  'fallen_stars_broken', // engine/killHandlers.ts (a starfall lattice shattered)
  'account_deaths',     // the death flow (LEDGER_ACCOUNT_DEATHS — dying is always earnable)
]);
const MILESTONE_RE = /^class_(.+)_level_(\d+)$/;
const classIds = new Set(CLASSES.map(c => c.id));
const bundleByClass = new Map(CLASS_BUNDLES.map(b => [b.classId, b] as const));

// --- 0) The registry weave --------------------------------------------------
{
  const nonStarters = CLASSES.filter(c => !STARTER_CLASSES.includes(c.id));
  check('weave: every non-starter class has exactly one bundle',
    nonStarters.every(c => bundleByClass.has(c.id)) && CLASS_BUNDLES.length === nonStarters.length,
    `${CLASS_BUNDLES.length} bundles / ${nonStarters.length} non-starters`);
  check('weave: no bundle sells a starter or a ghost class',
    CLASS_BUNDLES.every(b => classIds.has(b.classId) && !STARTER_CLASSES.includes(b.classId)));
  check('weave: every bundle is SHROUDED (discover row + non-empty hint)',
    CLASS_BUNDLES.every(b => !!b.discover && b.discover.hint.trim().length > 0));
  check('weave: ownership chains name real bundled classes',
    CLASS_BUNDLES.every(b => {
      const cs = b.discover?.classes;
      if (cs === undefined) return true;
      return (Array.isArray(cs) ? cs : [cs]).every(id => bundleByClass.has(id));
    }));
  check('weave: every discovery ledger key is a real milestone or a mapped world fact',
    discoveryLedgerKeys().every(k => {
      const m = MILESTONE_RE.exec(k);
      if (m) return classIds.has(m[1]) && CLASS_LEVEL_MILESTONES.includes(Number(m[2]));
      return WORLD_FACTS.has(k);
    }), discoveryLedgerKeys().join(', '));
  check('weave: the compile carries the gates onto the catalog entry',
    CLASS_BUNDLES.every(b => {
      const u = classUnlockFor(b.classId);
      if (!u) return false;
      const wantLedger = b.discover?.ledger !== undefined;
      const wantChain = b.discover?.classes !== undefined;
      const chainIds = wantChain
        ? (Array.isArray(b.discover!.classes) ? b.discover!.classes! : [b.discover!.classes!]).map(classBundleId)
        : [];
      const gotChain = u.requiresUnlock === undefined ? []
        : Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
      const wantCounts = b.discover?.ledgerCounts;
      const countsOk = wantCounts === undefined ? u.reqLedgerCounts === undefined
        : JSON.stringify(u.reqLedgerCounts) === JSON.stringify(wantCounts);
      return (wantLedger === (u.reqLedger !== undefined)) && countsOk
        && chainIds.length === gotChain.length && chainIds.every(id => gotChain.includes(id))
        && (u.kind === 'class' && u.payload.hint === b.discover?.hint);
    }));
  check('weave: slot tiers each carry the MOOT LAW at their own count',
    SLOT_TIERS.every(t => {
      const u = UNLOCK_CATALOG.find(x => x.id === t.id);
      return !!u && u.kind === 'slot' && u.reqClasses === t.slots;
    }));
  check('weave: slot tiers chain strictly in sequence',
    SLOT_TIERS.every((t, i) => {
      const u = UNLOCK_CATALOG.find(x => x.id === t.id)!;
      return i === 0 ? u.requiresUnlock === undefined : u.requiresUnlock === SLOT_TIERS[i - 1].id;
    }));
}

// --- 1) Reachability: the whole web closes from the starting three ----------
{
  const reachable = new Set<string>(STARTER_CLASSES);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of CLASS_BUNDLES) {
      if (reachable.has(b.classId)) continue;
      const d = b.discover;
      const chainOk = d?.classes === undefined
        || (Array.isArray(d.classes) ? d.classes : [d.classes]).every(id => reachable.has(id));
      const keys = [
        ...(d?.ledger === undefined ? [] : Array.isArray(d.ledger) ? d.ledger : [d.ledger]),
        ...Object.keys(d?.ledgerCounts ?? {}), // counted keys accrue in play like any fact
      ];
      const ledgerOk = keys.every(k => {
        const m = MILESTONE_RE.exec(k);
        return m ? reachable.has(m[1]) : WORLD_FACTS.has(k); // a fact is earnable in the wild
      });
      if (chainOk && ledgerOk) { reachable.add(b.classId); grew = true; }
    }
  }
  const stranded = CLASSES.filter(c => !reachable.has(c.id)).map(c => c.id);
  check('web: every class is REACHABLE from the starting three',
    stranded.length === 0, stranded.length ? `stranded: ${stranded.join(', ')}` : `${reachable.size}/${CLASSES.length}`);
}

// --- 2) The account walk: mystery, discovery, the moot law, the refusal -----
{
  const a = makeAccount();
  a.credits = 100000;
  const visibleClassIds = (): string[] => availableUnlocks(a)
    .filter(u => u.kind === 'class')
    .map(u => (u.kind === 'class' ? u.payload.classId : ''))
    .sort();
  const visibleSlotIds = (): string[] => availableUnlocks(a)
    .filter(u => u.kind === 'slot').map(u => u.id);

  check('fresh: every non-starter is a rumor, none purchasable',
    visibleClassIds().length === 0 && undiscoveredClassUnlocks(a).length === CLASS_BUNDLES.length);
  check('fresh: NO slot tier surfaces over a 3-class pool (the old dead buy)',
    visibleSlotIds().length === 0);
  check('fresh: starters read as discovered', STARTER_CLASSES.every(id => isClassDiscovered(a, id)));

  // The undiscovered refuse the coin outright (visibility IS the buy gate).
  const ascetic = classUnlockFor('ascetic')!;
  const before = a.credits;
  check('refusal: buying an undiscovered class fails and charges nothing',
    !applyUnlock(a, ascetic) && a.credits === before && !a.unlockedClasses.has('ascetic'));

  // Play the Magician to 10 → its INT kin surface, exactly those two.
  a.ledger[classLevelLedgerKey('magician', 10)] = 1;
  check('discovery: Magician L10 reveals exactly its INT kin',
    visibleClassIds().join(',') === 'pyromancer,sorcerer', visibleClassIds().join(','));

  check('discovery: rumors and the visible never overlap',
    undiscoveredClassUnlocks(a).every(u => u.kind === 'class' && !visibleClassIds().includes(u.payload.classId)));

  // Buy one → the pool can fill a 4th slot → tier 4 surfaces (and only it).
  check('buy: the Sorcerer joins the pool', applyUnlock(a, classUnlockFor('sorcerer')!)
    && a.unlockedClasses.has('sorcerer'));
  check('moot law: a 4-deep pool surfaces slot tier 4 alone',
    visibleSlotIds().join(',') === 'slot_tier_4');
  check('buy: slot tier 4', applyUnlock(a, UNLOCK_CATALOG.find(u => u.id === 'slot_tier_4')!));
  check('moot law: tier 5 stays HIDDEN while the pool is 4 (sequence owned, pool short)',
    visibleSlotIds().length === 0);
  check('buy: the Pyromancer deepens the pool to 5', applyUnlock(a, classUnlockFor('pyromancer')!));
  check('moot law: tier 5 surfaces the moment the pool can fill it',
    visibleSlotIds().join(',') === 'slot_tier_5');

  // Deeper study → the WIS/WIL doors; the Necromancer OWNED chains the Summoner.
  a.ledger[classLevelLedgerKey('magician', 15)] = 1;
  check('discovery: Magician L15 opens the Wisdom and Will doors',
    visibleClassIds().includes('necromancer') && visibleClassIds().includes('cleric')
    && !visibleClassIds().includes('summoner'));
  check('buy: the Necromancer', applyUnlock(a, classUnlockFor('necromancer')!));
  check('chain: OWNING the Necromancer reveals the Summoner (the nested ladder)',
    visibleClassIds().includes('summoner') && isClassDiscovered(a, 'summoner'));

  // The hard lesson: a grip caught you once → the Brawler stops being a rumor.
  a.ledger[LEDGER_SEIZED] = 1;
  check('hard lesson: seized_by_grip reveals the Brawler',
    visibleClassIds().includes('brawler') && isClassDiscovered(a, 'brawler'));

  // The COUNTED lever (ledgerCounts debut): the Flagellant is discovered by
  // DYING — and presence alone is not enough, the tally must reach eight.
  a.ledger['account_deaths'] = 7;
  check('counted: seven deaths keep the Flagellant shrouded',
    !visibleClassIds().includes('flagellant') && !isClassDiscovered(a, 'flagellant'));
  a.ledger['account_deaths'] = 8;
  check('counted: the eighth death reveals the Flagellant',
    visibleClassIds().includes('flagellant') && isClassDiscovered(a, 'flagellant'));

  // No visible entry may ever carry an unmet reqClasses (the law, swept wide).
  check('moot law: nothing visible wants a deeper pool than the account holds',
    allUnlockables().filter(u => isUnlockVisible(a, u))
      .every(u => u.reqClasses === undefined || a.unlockedClasses.size >= u.reqClasses));

  // Migration stance: a class OWNED before its discover row existed is
  // discovered by definition — never re-shrouded, never a rumor.
  const b = makeAccount();
  b.unlockedClasses.add('ascetic');
  check('migration: an owned class never re-shrouds',
    isClassDiscovered(b, 'ascetic')
    && undiscoveredClassUnlocks(b).every(u => u.kind === 'class' && u.payload.classId !== 'ascetic'));
}

// --- 3) THE VAULT SHELVES: the store's organization as data -----------------
// The UI walks VAULT_TABS and knows nothing else, so the contract lives
// here: every kind the catalog can mint must be seated EXPLICITLY (the
// fallback fold is a safety net for the moment between adding a kind and
// seating it — it must never be a shipped state), one seat per kind (the
// tab counts and the Owned grouping both assume it), and the structural
// shelves (fallback / owned / the rumor wall) each exist exactly once.
{
  const kinds = [...new Set(allUnlockables().map(u => u.kind))];
  check('shelves: every live catalog kind is seated EXPLICITLY (the fallback fold stays theoretical)',
    kinds.every(k => VAULT_TABS.some(t => t.kinds?.includes(k))), kinds.join(', '));
  check('shelves: no kind is seated on two shelves',
    kinds.every(k => VAULT_TABS.filter(t => t.kinds?.includes(k)).length <= 1));
  check('shelves: exactly one fallback shelf, and it is a browse shelf',
    VAULT_TABS.filter(t => t.fallback).length === 1
    && VAULT_TABS.every(t => !t.fallback || (t.kinds?.length ?? 0) > 0));
  check('shelves: exactly one Owned shelf, and it browses nothing (no kinds, no rumors, no fold)',
    VAULT_TABS.filter(t => t.owned).length === 1
    && VAULT_TABS.every(t => !t.owned || (t.kinds === undefined && !t.rumors && !t.fallback)));
  check('shelves: the rumor wall hangs on the class-seated shelf',
    VAULT_TABS.some(t => t.rumors === true && t.kinds?.includes('class') === true));
  check('shelves: shelf ids unique',
    new Set(VAULT_TABS.map(t => t.id)).size === VAULT_TABS.length);
  check('shelves: vaultSeatOf lands every kind on a real shelf',
    kinds.every(k => VAULT_TABS.includes(vaultSeatOf(k))));
  check('shelves: vaultKindOrder covers every live kind exactly once',
    (() => { const o = vaultKindOrder(); return new Set(o).size === o.length && kinds.every(k => o.includes(k)); })());
}

// --- 3b) THE MYSTERY LAW + THE GROWING STORE (census + shelving dials) ------
// A shelf with nothing to show does not exist; the tab furniture itself is
// EARNED (VAULT_SHELF_CFG: claimed unlocks AND visible span). The census is
// the one truth the UI reads, so it is pinned here account-first: fresh
// accounts get the flat young store, claims raise the shelving, and the
// rumor wall alone is enough to hold its shelf in the world.
{
  const fresh = makeAccount();
  const census = vaultShelfCensus(fresh);
  check('mystery: a fresh account hides the Owned shelf (nothing claimed, no trophy case)',
    !census.find(c => c.tab.owned)!.visible);
  check('mystery: every visible shelf is visible FOR something',
    census.filter(c => c.visible).every(c =>
      c.tab.owned ? c.owned.length > 0 : c.stock.length > 0 || c.rumors.length > 0));
  check('mystery: every hidden shelf truly has nothing to show',
    census.filter(c => !c.visible).every(c =>
      c.tab.owned ? c.owned.length === 0 : c.stock.length === 0 && c.rumors.length === 0));
  check('mystery: the rumor wall alone holds its shelf visible (whispers are content)',
    (() => { const cl = census.find(c => c.tab.rumors)!; return cl.rumors.length > 0 && cl.visible; })());
  check('census: the stock partition is total (every available entry on exactly one shelf)',
    census.reduce((n, c) => n + c.stock.length, 0) === availableUnlocks(fresh).length);
  check('census: the Owned shelf carries ALL owned; browse shelves carry the seated share',
    census.find(c => c.tab.owned)!.owned.length
      === census.filter(c => !c.tab.owned).reduce((n, c) => n + c.owned.length, 0));

  check('store: a fresh account gets the flat young store (no shelving yet, default dials)',
    !vaultStripVisible(fresh));
  // THE DIALS LIVE: zeroed thresholds raise the shelving for anyone — each
  // road proven alone (the other dialed out of reach).
  const saved = { ...VAULT_SHELF_CFG };
  VAULT_SHELF_CFG.stripMinShelves = 0; VAULT_SHELF_CFG.stripMinOwned = 0;
  VAULT_SHELF_CFG.stripMinStock = Number.MAX_SAFE_INTEGER;
  check('store: dials live — the CLAIMED road alone raises the shelving',
    vaultStripVisible(fresh));
  VAULT_SHELF_CFG.stripMinOwned = Number.MAX_SAFE_INTEGER; VAULT_SHELF_CFG.stripMinStock = 0;
  check('store: dials live — the SEEN road alone raises the shelving',
    vaultStripVisible(fresh));
  Object.assign(VAULT_SHELF_CFG, saved);
  check('store: dials restored, the young store returns', !vaultStripVisible(fresh));
  // …and the honest walk raises it by PLAYING: claim what the young store
  // sells, and when the wall runs dry (a truly fresh account has only a
  // couple of purchases before the world must teach it more — the mystery
  // doctrine working), stamp the next real deed a new player would cross
  // (the flask lesson, then the level-5 milestone) and keep claiming.
  // (The seen road is dialed out for this walk so the claimed road is
  // proven ALONE — a deed stamp that floods the wall would otherwise
  // raise the strip before the third claim as catalogs grow.)
  const savedStock = VAULT_SHELF_CFG.stripMinStock;
  VAULT_SHELF_CFG.stripMinStock = Number.MAX_SAFE_INTEGER;
  const a = makeAccount();
  a.credits = 100000;
  const deeds = [LEDGER_FLASK_LESSON, 'reached_level_5'];
  let bought = 0;
  while (!vaultStripVisible(a) && bought < 50) {
    const u = availableUnlocks(a)[0];
    if (u && applyUnlock(a, u)) { bought++; continue; }
    const deed = deeds.shift();
    if (deed === undefined) break;
    a.ledger[deed] = 1;
  }
  check('store: playing + claiming raises the shelving (the store grows with the account)',
    vaultStripVisible(a), `after ${bought} claims (dials: ${VAULT_SHELF_CFG.stripMinOwned} owned, span ${VAULT_SHELF_CFG.stripMinShelves})`);
  check('store: the raise waited for the owned dial, never before',
    bought >= VAULT_SHELF_CFG.stripMinOwned);
  check('store: the Owned shelf stands once anything is claimed',
    vaultShelfCensus(a).find(c => c.tab.owned)!.visible);
  VAULT_SHELF_CFG.stripMinStock = savedStock;

  // THE SEEN ROAD, walked honestly: an account that PLAYS before buying —
  // deeds stamped, never a purchase — floods the wall with earned stock
  // until the stock dial trips, and the shelving rises with NOTHING owned
  // (the user's own report: quest package, dummy, campfire and oracle all
  // offered at level 5 on an unspent account is a wall that needs shelves).
  const b = makeAccount();
  const seenDeeds = ['reached_level_5', LEDGER_FLASK_LESSON];
  const stockOf = (): number => vaultShelfCensus(b).reduce((n, c) => n + c.stock.length, 0);
  let stamped = 0;
  while (stockOf() < VAULT_SHELF_CFG.stripMinStock && stamped < seenDeeds.length) {
    b.ledger[seenDeeds[stamped++]] = 1;
  }
  check('store: THE SEEN ROAD — played deeds alone flood the wall past the stock dial',
    stockOf() >= VAULT_SHELF_CFG.stripMinStock, `stock ${stockOf()} after ${stamped} deed(s)`);
  check('store: the seen road raises the shelving with NOTHING owned',
    vaultStripVisible(b) && vaultShelfCensus(b).find(c => c.tab.owned)!.owned.length === 0);
}

// --- 3c) THE INTRODUCTION LAW + catalog parity nets --------------------------
// Mireille's whole chain waits behind her own flask lesson (the account
// stamp the tutorial's completing drink writes): a menu-spelunker who has
// never met the innkeeper finds NO mention of her, and the chain drips
// open by ownership from the lesson onward. Beside it, the generic nets
// that keep every chain honest: requiresUnlock ids must resolve (a typo
// is a forever-invisible row), requiresFeature flags must be GRANTED by
// some row (else the chain is unreachable), and no flag sells twice.
{
  const a = makeAccount();
  // The Mireille family: her own rows by flag, plus everything chained onto
  // her flags (the Tracker) — found structurally, never by name-list.
  const mireilleFlags: string[] = [FEATURE.MIREILLE_HEAL_LIFE, FEATURE.MIREILLE_HEAL_MANA, FEATURE.MIREILLE_XP_BUFF];
  const family = allUnlockables().filter(u =>
    (u.kind === 'feature' && (mireilleFlags.includes(u.payload.flag)
      || (u.requiresFeature !== undefined && mireilleFlags.includes(u.requiresFeature)))));
  check('introduction: the Mireille family is four rows (life, mana, XP, the Tracker)',
    family.length === 4, family.map(u => u.id).join(','));
  check('introduction: before the flask lesson, NO mention of her anywhere',
    family.every(u => !isUnlockVisible(a, u)));
  check('introduction: the census carries no family stock before the lesson',
    vaultShelfCensus(a).every(c => c.stock.every(u => !family.some(f => f.id === u.id))));
  // The user's exact fantasy, pinned: with Mireille waiting on her lesson,
  // a truly fresh account has NO Town shelf at all — the first town feature
  // the world introduces is the first the store ever mentions.
  check('introduction: a fresh account has no Town shelf to read (the mystery law compounds)',
    !vaultShelfCensus(a).find(c => c.tab.id === 'town')!.visible);
  a.ledger[LEDGER_FLASK_LESSON] = 1;
  a.credits = 1000;
  // Visible AND unowned — the shopping read (isUnlockVisible keeps owned
  // entries visible by design; the drip is about what's NEWLY buyable).
  const vis = (): string[] => family.filter(u => isUnlockVisible(a, u) && !isUnlockOwned(a, u)).map(u => u.id);
  check('introduction: the lesson surfaces Field Care ALONE (the chain still folded)',
    vis().join(',') === 'feat_mireille_life');
  applyUnlock(a, family.find(u => u.id === 'feat_mireille_life')!);
  check('introduction: owning Field Care surfaces the Brew alone',
    vis().join(',') === 'feat_mireille_mana');
  applyUnlock(a, family.find(u => u.id === 'feat_mireille_mana')!);
  check('introduction: owning the Brew surfaces the Rest AND the Tracker (both chain off it)',
    vis().sort().join(',') === 'feat_mireille_xp,feat_tracker');

  // The nets, over the WHOLE live catalog:
  const all = allUnlockables();
  const ids = new Set(all.map(u => u.id));
  const badReq = all.filter(u => (Array.isArray(u.requiresUnlock) ? u.requiresUnlock : u.requiresUnlock ? [u.requiresUnlock] : [])
    .some(id => !ids.has(id)));
  check('parity: every requiresUnlock id resolves (a typo is a forever-invisible row)',
    badReq.length === 0, badReq.map(u => u.id).join(','));
  const grantedFlags = new Set(all.filter(u => u.kind === 'feature').map(u => (u as { payload: { flag: string } }).payload.flag));
  const orphanChains = all.filter(u => u.kind === 'feature' && u.requiresFeature !== undefined
    && !grantedFlags.has(u.requiresFeature));
  check('parity: every requiresFeature flag is granted by some row (no unreachable chains)',
    orphanChains.length === 0, orphanChains.map(u => u.id).join(','));
  const flagSellers = new Map<string, number>();
  for (const u of all) if (u.kind === 'feature') {
    const f = (u as { payload: { flag: string } }).payload.flag;
    flagSellers.set(f, (flagSellers.get(f) ?? 0) + 1);
  }
  const doubleSold = [...flagSellers.entries()].filter(([, n]) => n > 1);
  check('parity: no feature flag is sold by two rows',
    doubleSold.length === 0, doubleSold.map(([f]) => f).join(','));
}

// --- 4) LIVE: the engine stamps land (local hero only) ----------------------
bootSimEngine();
seedGlobalRandom(0x1c0de);
{
  // Per-class milestones ride grantSeatXp exactly as far as the level goes.
  const w = makeSimWorld('warrior', 0x51a7);
  while (w.player.level < 15) w.grantXp(400);
  const has = (k: string): boolean => (w.ledger[k] ?? 0) >= 1;
  check('live: warrior L15 stamps class milestones 5/10/15',
    has(classLevelLedgerKey('warrior', 5)) && has(classLevelLedgerKey('warrior', 10))
    && has(classLevelLedgerKey('warrior', 15)));
  check('live: unreached milestones stay unstamped',
    !has(classLevelLedgerKey('warrior', 20)) && !has(classLevelLedgerKey('warrior', 25)));
  check('live: the milestones are CLASS-true (no phantom magician keys)',
    !has(classLevelLedgerKey('magician', 5)));
  check('live: the global reached_level_10 sweep still runs beside it',
    has('reached_level_10'));
}
{
  // The seize lesson: the real grabSeize path, victim = the local hero.
  const w = makeSimWorld('summoner', 0x9a04);
  const p = w.player;
  const m = w.createMonster('yoke_mauler', Math.max(3, p.level), 'enemy');
  m.pos = vec(p.pos.x + 60, p.pos.y);
  w.actors.push(m);
  check('live: the mauler pins the hero (real path)', w.devGrabSeizeMe('pin'));
  check('live: the seize lesson is stamped', (w.ledger[LEDGER_SEIZED] ?? 0) === 1);
  // A SECOND catch: break the live hold first (a re-seize through a standing
  // pair is refused by the grace, correctly), then let it catch again.
  w.devGrabClearAll();
  p.grabProofUntil = 0;
  check('live: a second catch tallies (raw count by design)',
    w.devGrabSeizeMe('pin') && (w.ledger[LEDGER_SEIZED] ?? 0) === 2);
}
{
  // The trap lesson: springTrapwork with the hero's own feet — and ONLY the
  // hero's. A baited monster teaches the account nothing.
  const w = makeSimWorld('rogue', 0x7a11);
  const p = w.player;
  const mk = (id: string): PlacedTrapwork => ({
    spec: { id, trigger: { kind: 'plate', at: vec(p.pos.x, p.pos.y), r: 20 }, effects: [] },
    id, state: 'armed', rearmAt: Infinity, sprungAt: 0, springs: 0,
  });
  const tw1 = mk('probe_tw1'), tw2 = mk('probe_tw2'), tw3 = mk('probe_tw3');
  w.trapworks.push(tw1, tw2, tw3);
  w.springTrapwork(tw1, p);
  check('live: the hero springing a plate stamps the trap lesson',
    (w.ledger[LEDGER_TRAP_SPRUNG] ?? 0) === 1 && tw1.state === 'sprung');
  const m = w.createMonster('yoke_mauler', 3, 'enemy');
  w.actors.push(m);
  w.springTrapwork(tw2, m);
  w.springTrapwork(tw3, undefined);
  check('live: a baited monster (or nobody) teaches nothing',
    (w.ledger[LEDGER_TRAP_SPRUNG] ?? 0) === 1 && tw2.state === 'sprung' && tw3.state === 'sprung');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
