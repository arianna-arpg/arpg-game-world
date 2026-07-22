// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MERCENARY MARKET LAWS end to end (meta/mercs.ts +
// engine/world.ts + meta/worldstate.ts + meta/unlocks.ts). Pins:
//   - THE WILDS COMMISSION (MERC_CFG.outpost.unlockLevel): below the unlock
//     level a fresh account meets NO wild camp anywhere; the same world at
//     the unlock level seats them per the ordinary roll; the graduation
//     stamp (LEDGER_MERC_OUTPOST_FOUND) lifts the gate at level 1 — same
//     camps, same zones (the roll itself never moves); the first wilds
//     PARLEY stamps graduation + LEDGER_MERC_MARKET_MET (any officer).
//   - THE MUSTER-ROLL LAW (World.mercSheetFor + WorldStateSave.mercSheets):
//     a sheet is dealt at first arm and LOCKED — re-entry identical, roster
//     drift adds nothing, hires strike rows for good, a fully-spent sheet
//     stays empty (never re-mints), and the whole ledger rides
//     serializeWorldState → adoptWorldState faithfully (empty sheets
//     included). Veteran rows: engaged elsewhere = spoken for (panel word
//     == hire refusal, one check); gone from the roster = struck at arm.
//   - THE PORT MUSTER under the same law: the quay captain's sheet survives
//     leave/re-enter AND a clock jump far past the dead reroll window.
//   - THE RECRUITER'S TABLE (FEATURE.MERC_RECRUITER): the officer seats in
//     Lastlight, port policy (template-only, no retirement), sheet inside
//     the MERC_CFG.recruiter band, locked + hire-struck + save-faithful;
//     the Vault card hides until LEDGER_MERC_MARKET_MET is stamped.
//   - the worldstate sanitizer: unknown zones/templates/classes drop, empty
//     sheets survive, garbage never crashes, ghost-zone sheets never write.
// Run: npx tsx balance/probe_mercs.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  LEDGER_MERC_MARKET_MET, LEDGER_MERC_OUTPOST_FOUND, MERC_CFG, MERC_SCHEMA,
  type MercOffer, type MercRosterEntry,
} from '../src/meta/mercs';
import { MERC_TEMPLATES } from '../src/data/mercenaries';
import { FEATURE, makeAccount } from '../src/meta/account';
import { UNLOCK_CATALOG, isUnlockVisible } from '../src/meta/unlocks';
import { sanitizeMercSheets } from '../src/meta/worldstate';
import { CLASSES } from '../src/data/classes';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { HOLD_CLASSES } from '../src/data/harborholds';
import { holdStructureIn } from '../src/world/harborholds';
import { cellKind, continentSeedFrom } from '../src/world/continents';
import { clearSeaMemo, seaOfCell, type Sea } from '../src/world/seas';
import { npcDwellReach } from '../src/data/transit';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const sheetKey = (offers: readonly MercOffer[]): string =>
  JSON.stringify(offers.map(o => [o.kind, o.refId, o.name]));

bootSimEngine();
seedGlobalRandom(0x3e5c);

/** Mint N wild zones through the REAL mint path (devMintTileset: placeZoneAt
 *  → loadZone, layout seed pinned per mint) and record which stood a WILDS
 *  camp at mint. The camp roll is f(world seed, zone id) and gen ids count
 *  deterministically, so for a fixed world seed + mint order the outcome is
 *  exact — the boot graph is 3 zones (town, hub, arena), so minting IS the
 *  honest way to walk wild ground headless. */
const MINTS = 40;
const mintWilds = (w: World): { id: string; armed: boolean }[] => {
  const out: { id: string; armed: boolean }[] = [];
  for (let i = 0; i < MINTS; i++) {
    const id = w.devMintTileset('forest', i, 5, { seed: 0xa000 + i });
    if (!id) continue;
    out.push({ id, armed: !!(w.mercOutpost && !w.mercOutpost.port) });
  }
  return out;
};

const fakeVet = (id: string, name: string): MercRosterEntry => {
  const warrior = CLASSES.find(c => c.id === 'warrior')!;
  return {
    schema: MERC_SCHEMA, mercId: id, name, classId: 'warrior',
    retiredLevel: 12, retiredAt: 0,
    snapshot: {
      classId: 'warrior', level: 12,
      baseAttrs: { ...warrior.attributes },
      allocated: [], vocations: [], knownSkills: [], bar: [], equipped: {},
    },
  };
};

// ------------------------------------------------ A. THE WILDS COMMISSION
// (Every cross-compared world re-seeds the GLOBAL stream first — probe files
// share ONE stream, so without this each successive world starts at a
// different offset and the eager world-web's mints diverge. Session trap.)
const SEED_A = 0x77a1;
seedGlobalRandom(0x3e5c);
const w30: World = makeSimWorld('warrior', SEED_A);
w30.player.level = MERC_CFG.outpost.unlockLevel;
const minted30 = mintWilds(w30);
const armedAt30 = minted30.filter(m => m.armed).map(m => m.id);
check('A: at the unlock level the ordinary roll seats wild camps', armedAt30.length > 0,
  `${armedAt30.length}/${minted30.length} minted zones`);

{
  // The SAME world-seed below the commission: no camp anywhere, no sheet
  // minted — and the GROUND itself is unchanged (same zone ids in the same
  // order: the gate touches the camp, never the mint).
  seedGlobalRandom(0x3e5c);
  const wLow = makeSimWorld('warrior', SEED_A);
  const mintedLow = mintWilds(wLow);
  check('A: below the commission the wild roll stands down everywhere',
    mintedLow.every(m => !m.armed), `${mintedLow.length} zones minted`);
  check('A: a refused camp mints NO sheet (nothing locks early)',
    Object.keys(wLow.mercSheets).length === 0);
  check('A: the ground itself is untouched by the gate (same mints, same ids)',
    JSON.stringify(mintedLow.map(m => m.id)) === JSON.stringify(minted30.map(m => m.id)));

  // The graduation stamp lifts the gate at level 1 — and the roll itself
  // never moved: the same zones arm that armed at the unlock level.
  seedGlobalRandom(0x3e5c);
  const wGrad = makeSimWorld('warrior', SEED_A);
  wGrad.account.ledger[LEDGER_MERC_OUTPOST_FOUND] = 1;
  const armedGrad = mintWilds(wGrad).filter(m => m.armed).map(m => m.id);
  check('A: the graduation stamp lifts the gate at level 1 (same camps, same zones)',
    JSON.stringify(armedGrad) === JSON.stringify(armedAt30),
    `${armedGrad.length} camp(s)`);

  // THE PARLEY STAMPS: drive the calm dwell for real at the first camp.
  const zid = armedAt30[0] ?? '';
  if (!zid) throw new Error('probe_mercs: SEED_A rolled no camp — pin a new seed');
  w30.completedObjectives.add(zid);
  w30.loadZone(zid);
  const post = w30.mercOutpost!;
  check('A: the camp re-arms its LOCKED sheet on re-entry', !!post && !post.port);
  // Park the hero on honestly-reachable ground beside the captain — the camp
  // sits among forest trunks and the dwell demands a CLEAR reach, so stand
  // where a walking player would (and re-park each step: separation physics
  // may drift a body it finds overlapping).
  const wx = w30 as unknown as {
    dwellReachable(a: unknown, b: unknown, r?: unknown): boolean;
    findFreeSpot(at: { x: number; y: number }, r: number): { x: number; y: number };
  };
  const park = (): boolean => {
    for (const rr of [42, 60, 80, 100]) {
      for (let k = 0; k < 12; k++) {
        const ang = (Math.PI * 2 * k) / 12;
        const spot = wx.findFreeSpot(
          { x: post.captain.pos.x + Math.cos(ang) * rr, y: post.captain.pos.y + Math.sin(ang) * rr },
          w30.player.radius);
        w30.player.pos.x = spot.x;
        w30.player.pos.y = spot.y;
        if (wx.dwellReachable(w30.player.pos, post.captain.pos, npcDwellReach('captain'))) return true;
      }
    }
    return false;
  };
  check('A: a reachable stand exists beside the captain', park());
  w30.lastCombatAt = -999;
  w30.objectiveDone = true;
  for (let i = 0; i < 8 && !w30.mercOutpostRequested; i++) {
    for (const a of w30.actors) {
      if (a.team === 'enemy' && !a.passive && !a.dead) { a.life = 0; a.dead = true; }
    }
    w30.objectiveDone = true;
    park();
    w30.update(0.5);
  }
  check('A: the calm parley fires the menu request', w30.mercOutpostRequested === true);
  check('A: the first parley stamps the introductions ledger (market met + graduation)',
    (w30.account.ledger[LEDGER_MERC_MARKET_MET] ?? 0) >= 1
    && (w30.account.ledger[LEDGER_MERC_OUTPOST_FOUND] ?? 0) >= 1);

  // ------------------------------------------------ B. THE MUSTER-ROLL LAW
  const sheet0 = sheetKey(w30.mercOutpost!.offers);
  const other = START_ZONE;
  w30.loadZone(other);
  w30.loadZone(zid);
  check('B: leave + re-enter deals the IDENTICAL sheet',
    sheetKey(w30.mercOutpost!.offers) === sheet0);

  // Roster drift after the lock adds nothing.
  w30.account.mercRoster.push(fakeVet('m_late_a', 'Late Aldis'), fakeVet('m_late_b', 'Late Brienne'));
  w30.loadZone(other);
  w30.loadZone(zid);
  check('B: roster drift after the lock changes nothing (no late veterans join)',
    sheetKey(w30.mercOutpost!.offers) === sheet0);

  // Hires strike rows FOR GOOD — spend the whole sheet (hire → dismiss →
  // hire…), then prove sold-out stays sold-out across re-entry and save.
  w30.account.credits = 999999;
  const dealt = w30.mercOutpost!.offers.length;
  let hires = 0;
  for (let guard = 0; guard < 24 && w30.mercOutpost!.offers.length; guard++) {
    if (w30.hireMercenary(0)) { hires++; w30.dismissMercenary(undefined, 0); }
    else break;
  }
  check('B: every offer hires through the one pipeline (single-serve strikes)',
    hires === dealt && w30.mercOutpost!.offers.length === 0, `${hires}/${dealt}`);
  w30.loadZone(other);
  w30.loadZone(zid);
  check('B: a fully-spent sheet stays EMPTY on re-entry (never re-mints)',
    w30.mercOutpost !== null && w30.mercOutpost.offers.length === 0
    && w30.mercSheets[zid]?.length === 0);

  const ws = w30.serializeWorldState();
  check('B: the save carries the spent sheet (empty is load-bearing state)',
    !!ws.mercSheets && Array.isArray(ws.mercSheets[zid]) && ws.mercSheets[zid].length === 0);
  seedGlobalRandom(0x3e5c);
  const wBack = makeSimWorld('warrior', SEED_A);
  check('B: adoptWorldState stands the ledger back up verbatim',
    wBack.adoptWorldState(ws) === true
    && JSON.stringify(wBack.mercSheets) === JSON.stringify(w30.mercSheets));
  // The restored ACCOUNT is graduated in the real resume (accounts persist
  // apart from worlds); a fresh sim account must stamp it — otherwise the
  // commission rightly refuses to seat the captain at level 1 while the
  // sheet itself still rides the ledger (the two are separate truths).
  wBack.account.ledger[LEDGER_MERC_OUTPOST_FOUND] = 1;
  wBack.loadZone(zid);
  check('B: the restored spent sheet arms EMPTY (sold out survives the save)',
    wBack.mercOutpost !== null && wBack.mercOutpost.offers.length === 0);
}

// --------------------------------- B2. veterans on a locked sheet (live rig)
{
  // A graduated, roster-carrying line at level 1: the first armed camp's
  // mint draws from the pool (the fill-scaled veteran share), so the sheet
  // deals a retired row — the SAME seed as A, so the camps are known ground.
  let wV: World | null = null, vetZone = '', vetIdx = -1;
  {
    seedGlobalRandom(0x3e5c);
    const w = makeSimWorld('warrior', SEED_A);
    w.account.ledger[LEDGER_MERC_OUTPOST_FOUND] = 1; // graduated line, level-1 hero
    w.account.mercRoster.push(fakeVet('m_vet_a', 'Aldis the Grey'), fakeVet('m_vet_b', 'Brienne Oath-Kept'));
    w.meta.charId = 'probe_patron';
    for (let i = 0; i < MINTS && vetIdx < 0; i++) {
      const id = w.devMintTileset('forest', i, 5, { seed: 0xa000 + i });
      const p = w.mercOutpost;
      if (id && p && !p.port) {
        const k = p.offers.findIndex(o => o.kind === 'retired');
        if (k >= 0) { wV = w; vetZone = id; vetIdx = k; }
      }
    }
  }
  check('B2: a camp deals a veteran row (roster-fed mint)', !!wV,
    wV ? `${vetZone} offer ${vetIdx}` : 'none in seed budget');
  if (wV) {
    const offer = wV.mercOutpost!.offers[vetIdx];
    const r = wV.account.mercRoster.find(x => x.mercId === offer.refId)!;
    const before = wV.mercOutpost!.offers.length;

    // Engaged elsewhere: the row STAYS (the lock) but refuses (the gate) —
    // the panel shows the same words the hire path speaks.
    r.engagedBy = 'someone_elses_run';
    check('B2: an engaged veteran reads spoken-for (one check, both faces)',
      wV.mercOfferBlocked(offer) !== null);
    check('B2: the hire path refuses the spoken-for row and strikes nothing',
      wV.hireMercenary(vetIdx) === false && wV.mercOutpost!.offers.length === before);

    // Released: the same locked row hires, engages to THIS patron, strikes.
    delete r.engagedBy;
    wV.account.credits = 999999;
    check('B2: the released veteran hires off the same locked row',
      wV.hireMercenary(vetIdx) === true && r.engagedBy === 'probe_patron'
      && wV.mercOutpost!.offers.length === before - 1);
    wV.dismissMercenary();
    check('B2: dismissal frees the veteran back to the pool', r.engagedBy === undefined);

    // THE SUPPLY RECONCILE: a sheet row whose retiree left the roster for
    // good is struck at the next arm; a row whose retiree still stands
    // rides through untouched.
    const sheet = wV.mercSheets[vetZone];
    sheet.push({
      kind: 'retired', refId: 'm_vet_b', name: 'Brienne Oath-Kept', classId: 'warrior',
      blurb: 'A veteran of the wake — a life someone lived, sword-arm for hire.', retiredLevel: 12,
    });
    const withB = sheet.length;
    const othr = START_ZONE;
    wV.loadZone(othr);
    wV.loadZone(vetZone);
    check('B2: a rostered veteran row survives the arm reconcile',
      wV.mercSheets[vetZone].length === withB);
    wV.account.mercRoster = wV.account.mercRoster.filter(x => x.mercId !== 'm_vet_b');
    wV.loadZone(othr);
    wV.loadZone(vetZone);
    check('B2: a roster-replaced veteran is struck at arm (gone from the wake)',
      wV.mercSheets[vetZone].length === withB - 1
      && !wV.mercSheets[vetZone].some(o => o.refId === 'm_vet_b'));
  }
}

// ------------------------------------------------ C. the port muster's lock
{
  const firstSeaWhere = (fs: number, pred: (s: Sea) => boolean): Sea | null => {
    const contSeed = continentSeedFrom(fs);
    for (let r = 0; r <= 12; r++) {
      for (let gy = -r; gy <= r; gy++) {
        for (let gx = -r; gx <= r; gx++) {
          if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
          if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
          const s = seaOfCell(gx, gy, contSeed);
          if (pred(s)) return s;
        }
      }
    }
    return null;
  };
  let w: World | null = null;
  let sea: Sea | null = null;
  for (const s of [0x40b711, 0x40b712, 0x40b713, 0x40b714, 0x40b715, 0x40b716, 0x40b717, 0x40b718]) {
    const cand = makeSimWorld('warrior', s);
    clearSeaMemo();
    const found = firstSeaWhere(cand.sim.biomeField.fieldSeed, x => x.cls.haven && x.ports.length >= 1);
    if (found) { w = cand; sea = found; break; }
  }
  check('C: a haven sea stands for the port rig', !!sea, sea ? sea.cls.id : 'none in budget');
  if (w && sea) {
    const info = w.devEnsureSea(sea.ports[0].shore)!;
    const havenId = info.ports.find(p => p.tier === 'haven')?.id;
    const pz = havenId ? w.zoneMap[havenId] : undefined;
    const az = pz?.holdAnchor ? w.zoneMap[pz.holdAnchor] : undefined;
    if (!pz || !az?.harborhold || !HOLD_CLASSES[az.harborhold.cls].services.some(s => s.id === 'mercs')) {
      check('C: haven anchor wears a captained class', false, az?.harborhold?.cls ?? 'no anchor');
    } else {
      const cls = HOLD_CLASSES[az.harborhold.cls];
      w.loadZone(az.id);
      if (!holdStructureIn(w.structures, cls.structure)) {
        check('C: the haven anchor seats its town', false, 'no structure — arena too tight');
      } else {
        az.harborhold.prosperity = cls.prosperityCap;
        w.devSetHoldState(az.id, 'open');
        w.loadZone(pz.id);
        const sheet1 = sheetKey(w.mercOutpost?.offers ?? []);
        check('C: the captain arms a template-only sheet in the class band',
          !!w.mercOutpost?.port
          && w.mercOutpost.offers.length >= cls.mercOffers[0]
          && w.mercOutpost.offers.length <= cls.mercOffers[1]
          && w.mercOutpost.offers.every(o => o.kind === 'template'));
        // The dead reroll window: jump the clock far past the old cadence,
        // cross the causeway and come back — the muster must not move.
        w.time += 1800;
        w.loadZone(az.id);
        w.loadZone(pz.id);
        check('C: the port sheet outlives the clock (the reroll window is dead)',
          sheetKey(w.mercOutpost?.offers ?? []) === sheet1);
        const cost = w.mercOutpost ? w.mercHireCost(w.mercOutpost.offers[0]) : 0;
        w.account.credits = cost;
        const hired = w.hireMercenary(0);
        w.loadZone(az.id);
        w.loadZone(pz.id);
        check('C: a port hire strikes the row for good (struck across re-entry)',
          hired === true
          && sheetKey(w.mercOutpost?.offers ?? []) !== sheet1
          && (w.mercSheets[pz.id]?.length ?? -1) === w.mercOutpost!.offers.length);
        check('C: still no retirement at a port counter', w.canRetireHere() === false);
      }
    }
  }
}

// ------------------------------------------------ D. THE RECRUITER'S TABLE
{
  // The Vault card: hidden until the market has been met once, anywhere.
  const row = UNLOCK_CATALOG.find(u => u.id === 'feat_merc_recruiter');
  check('D: the Vault carries the recruiter row', !!row);
  if (row) {
    const acc = makeAccount();
    check('D: the card hides until the market is met (discovery-web law)',
      isUnlockVisible(acc, row) === false);
    acc.ledger[LEDGER_MERC_MARKET_MET] = 1;
    check('D: met once, the card surfaces', isUnlockVisible(acc, row) === true);
  }

  const SEED_D = 0x99c1;
  seedGlobalRandom(0x3e5c);
  const w = makeSimWorld('warrior', SEED_D);
  w.account.features.add(FEATURE.MERC_RECRUITER);
  w.loadZone(START_ZONE);
  const post = w.mercOutpost;
  const [lo, hi] = MERC_CFG.recruiter.offers;
  check('D: the officer seats in Lastlight and arms a PORT-policy counter',
    !!post?.port && post.captain.name === 'the Recruiting Officer'
    && w.actors.includes(post.captain));
  check('D: the single-serve sheet deals inside the recruiter band, template-only',
    !!post && post.offers.length >= lo && post.offers.length <= hi
    && post.offers.every(o => o.kind === 'template'
      && MERC_TEMPLATES.some(t => t.id === o.refId)));
  check('D: no retirement at the table', w.canRetireHere() === false);
  check('D: the table speaks with its own voice', post?.title === "The Recruiter's Table");

  if (post) {
    const sheet1 = sheetKey(post.offers);
    // Re-enter town (the "town refresh" face): the table must not move.
    const away = Object.values(w.zoneMap).find(z => z.id !== START_ZONE && !z.boundless)!;
    w.loadZone(away.id);
    w.loadZone(START_ZONE);
    check('D: the table survives leaving + re-entering town unchanged',
      sheetKey(w.mercOutpost?.offers ?? []) === sheet1);

    // A hire strikes a row for good — and the SAVE carries the spent state.
    w.account.credits = 999999;
    const before = w.mercOutpost!.offers.length;
    const hired = w.hireMercenary(0);
    check('D: hiring at the table rides the one pipeline and strikes the row',
      hired === true && w.mercOutpost!.offers.length === before - 1);
    const ws = w.serializeWorldState();
    seedGlobalRandom(0x3e5c);
    const w2 = makeSimWorld('warrior', SEED_D);
    w2.account.features.add(FEATURE.MERC_RECRUITER);
    check('D: the struck table rides the save', w2.adoptWorldState(ws) === true
      && sheetKey(w2.mercSheets[START_ZONE] ?? []) === sheetKey(w.mercSheets[START_ZONE]));
    w2.loadZone(START_ZONE);
    check('D: the restored table arms exactly as saved (no refresh on reload)',
      sheetKey(w2.mercOutpost?.offers ?? []) === sheetKey(w.mercSheets[START_ZONE]));

    // A NEW world deals its own table (the only refresh there is).
    seedGlobalRandom(0x3e5c);
    const w3 = makeSimWorld('warrior', 0x99c7);
    w3.account.features.add(FEATURE.MERC_RECRUITER);
    w3.loadZone(START_ZONE);
    check('D: a reborn world deals a fresh single-serve table',
      !!w3.mercOutpost && w3.mercOutpost.offers.length >= lo && w3.mercOutpost.offers.length <= hi,
      sheetKey(w3.mercOutpost?.offers ?? []) === sheet1 ? 'same faces this pair of seeds' : 'fresh faces');
  }
}

// ------------------------------------------------ E. the sanitizer's floor
{
  const wZ = makeSimWorld('warrior', 0xaad1);
  const town = wZ.zoneMap[START_ZONE];
  const zones: Record<string, ZoneDef> = { [START_ZONE]: town };
  const goodTemplate: MercOffer = {
    kind: 'template', refId: MERC_TEMPLATES[0].id, name: 'Kessa', classId: MERC_TEMPLATES[0].classId,
    blurb: 'x',
  };
  const goodRetired: MercOffer = {
    kind: 'retired', refId: 'm_any', name: 'V', classId: 'warrior', blurb: 'y', retiredLevel: 9,
  };
  const out = sanitizeMercSheets({
    [START_ZONE]: [
      goodTemplate,
      { ...goodTemplate, refId: 'no_such_template' },
      goodRetired,
      { ...goodRetired, classId: 'no_such_class' },
      { kind: 'weird', refId: 'x', name: 'x', classId: 'warrior', blurb: 'x' },
      null, 'garbage', 42,
    ],
    ghost_zone: [goodTemplate],
    not_an_array: 'nope',
  }, zones);
  check('E: rows scrub structurally + against the registries',
    out[START_ZONE]?.length === 2
    && out[START_ZONE][0].refId === goodTemplate.refId
    && out[START_ZONE][1].kind === 'retired' && out[START_ZONE][1].retiredLevel === 9);
  check('E: ghost zones and non-arrays drop whole',
    out.ghost_zone === undefined && out.not_an_array === undefined);
  check('E: an empty sheet survives (sold out is state, not absence)',
    Array.isArray(sanitizeMercSheets({ [START_ZONE]: [] }, zones)[START_ZONE]));
  check('E: garbage never crashes', Object.keys(sanitizeMercSheets(null, zones)).length === 0
    && Object.keys(sanitizeMercSheets('x', zones)).length === 0);

  // Ghost-zone sheets never WRITE either (the serialize-side kept filter).
  wZ.mercSheets['zone_that_never_was'] = [goodTemplate];
  const ws = wZ.serializeWorldState();
  check('E: the save-side kept filter drops sheets whose ground is gone',
    !!ws.mercSheets && ws.mercSheets['zone_that_never_was'] === undefined);
}

console.log(failed ? `\nprobe_mercs: ${failed} FAILURE(S)` : '\nprobe_mercs: ALL PASS');
process.exit(failed ? 2 : 0);
