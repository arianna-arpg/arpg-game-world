// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ANNEX GRAMMAR (the Secrets Charter's Movement II):
// generation + reveal faces over the composite bound. The growing zone's
// full loop: the mint ROLL (worldgen applyAnnexes — dormant chains whole
// from the def seed on a dedicated salted stream), the layout STAMP
// (levelgen stampAnnexFaces — grid regrow, sealed chambers RECORDED not
// carved, honest dead-end approaches, ring-0 faces planted), the REVEAL
// (World.annexReveal — carve, face splice, child-face planting, furnish
// off the piece's own seed, THE FIND LAW), FOUND-IS-FOUND persistence
// beyond the zone-memory TTL, and the seedless co-op wire.
//
// RIG A — the roll, pure: determinism (same def+tileset twice ≡ identical
//   rows), absent budget = zero mutations, chain ids as paths with dir +
//   seed + registered kind on every piece, the depth budget honored, and
//   the deep-dial smoke (an authored depth-5 chance-1 chain mints whole —
//   the infinite regime is a dial, never a rewrite).
// RIG B — the stamp, headless: generateLayout on a rooms grid with rolled
//   annexes — the walk grid spans the generation span, every piece gets a
//   spec, ring-0 faces stand as doodads (children recorded ONLY — the
//   dormant-space law), chambers stay sealed (the leak check), the face
//   fronts standing floor (the approach), double-generate ≡ identical.
// RIG C — the reveal, live: a real World on a rooms QA zone; the NEAR face
//   pops through the real brittle dwell sweep (the trigger path, not a dev
//   call) → admission + carve + rubble REMAINS + child face stands up +
//   the furnish ran once at the find (revive=false, the probe's own
//   recording kind); the child's reveal connects chamber to chamber.
// RIG D — found is found: leave, age past the zone-memory TTL, return —
//   the memory dropped, the run ledger re-opens the chain, the carve
//   re-applies, and every replay furnish is revive=true (THE FIND LAW:
//   loot pays once ever).
// RIG E — the wire: annexSpecs + doodad annex ids ship seedless;
//   applyZone adopts them; a client's bare reveal carves its grid and
//   dresses the child face without furnishing.
// RIG F — the away lane: annexActivate stamps the run ledger with NO
//   standing memory (the closed TTL hole) and the piece opens on arrival.
// RIG G — Movement IV: the forgotten-crypt door-scale lane resolves whole
//   by registry (descending hollow → gate sidezone → rule → painter), and
//   THE SPOILS LAW reaches the annex furnish (sealed ground refuses the
//   find's gem; its orbs still flow).
//
// Run: npx tsx balance/probe_annexgrammar.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import { Rng } from '../src/core/rng';
import { gridSpanOf, type BoundsPiece } from '../src/world/shape';
import { GridWalkField } from '../src/world/gridWalk';
import { ZONES, type ZoneDef } from '../src/data/zones';
import type { TilesetDef } from '../src/data/tilesets';
import { ANNEX_CFG, annexParentIdOf, registerAnnex, type AnnexRevealCtx } from '../src/data/annexes';
import { hollowDef } from '../src/data/hollows';
import { sidezoneOf } from '../src/data/sidezones';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { applyAnnexes } from '../src/engine/worldgen';
import { doodadRuleOf, generateLayout } from '../src/engine/levelgen';
import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { applyZone, serializeZone } from '../src/net/snapshot';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

// The probe's RECORDING kind: full observability of the furnish discipline
// (the registry is open — the workshop law). Structure = one web; the find
// pays one orb; every call lands in the log with its revive flag.
const furnishLog: { piece: string; revive: boolean }[] = [];
registerAnnex({
  id: 'qa_annex_probe',
  face: 'draft_seam',
  size: { w: [300, 300], h: [300, 300] },
  child: { chance: 1 },
  furnish(c: AnnexRevealCtx) {
    furnishLog.push({ piece: `${Math.round(c.rect.x)},${Math.round(c.rect.y)}`, revive: c.revive });
    c.addDoodad({ pos: c.center, radius: 16, kind: 'web' });
    if (!c.revive) c.shedOrb('life', c.center);
  },
});
registerAnnex({
  id: 'qa_deep_chain',
  face: 'cracked_face',
  size: { w: [260, 260], h: [260, 260] },
  child: { chance: 1 },
  furnish() { /* geometry-only */ },
});

// --- RIG A: the roll, pure ---------------------------------------------------

{
  const ts = {
    annexes: { count: [2, 2] as [number, number], table: { qa_annex_probe: 1 }, depth: 2 },
  } as unknown as TilesetDef;
  const mkDef = (): ZoneDef => ({
    id: 'qa_roll', name: 'Roll (QA)', level: 1,
    size: { w: 2400, h: 1800 }, shape: 'rect',
    theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
    seed: 0xbeef01, layout: [], objective: { kind: 'none' }, exits: [], map: { x: 9998, y: 9998 },
  });
  const d1 = mkDef(), d2 = mkDef();
  applyAnnexes(d1, ts);
  applyAnnexes(d2, ts);
  check('A1 the roll is pure f(def seed): two mints ≡ identical rows',
    JSON.stringify(d1.annexes) === JSON.stringify(d2.annexes) && (d1.annexes?.length ?? 0) > 0);
  const bare = mkDef();
  applyAnnexes(bare, {} as TilesetDef);
  check('A2 absent budget mutates nothing (byte-identity by construction)',
    bare.annexes === undefined && JSON.stringify(bare) === JSON.stringify(mkDef()));
  const rows = d1.annexes ?? [];
  check('A3 every piece carries kind + seed + dir, ids are chain paths',
    rows.every(pc => !!pc.kind && typeof pc.seed === 'number' && (pc.dir === 'e' || pc.dir === 's'))
    && rows.every(pc => /^ax\d+(\.\d+)?$/.test(pc.id)));
  check('A4 the depth budget holds (authored 2: no grandchild ids)',
    rows.every(pc => (pc.id.match(/\./g) ?? []).length <= 1)
    && rows.some(pc => pc.id.includes('.')), // chance-1 chain kind: children DID mint
    JSON.stringify(rows.map(pc => pc.id)));
  check('A5 children lap their parents (the seam never pinches)',
    rows.filter(pc => pc.id.includes('.')).every(pc => {
      const parent = rows.find(q => q.id === annexParentIdOf(pc.id))!;
      return pc.dir === 'e'
        ? Math.abs(pc.x - (parent.x + parent.w - ANNEX_CFG.lap)) < 0.5
        : Math.abs(pc.y - (parent.y + parent.h - ANNEX_CFG.lap)) < 0.5;
    }));
  // The deep dial: depth 5 on a chance-1 chain mints the whole ladder — the
  // infinite regime is a materialization question, never a derivation one.
  const deep = mkDef();
  applyAnnexes(deep, { annexes: { count: [1, 1], table: { qa_deep_chain: 1 }, depth: 5 } } as unknown as TilesetDef);
  const deepIds = (deep.annexes ?? []).map(pc => pc.id).sort();
  check('A6 the deep dial mints the whole ladder (depth 5, chance 1)',
    deepIds.length === 5 && deepIds[0] === 'ax0' && deepIds[4] === 'ax0.4',
    JSON.stringify(deepIds));
}

// --- RIG B: the stamp, headless ----------------------------------------------

{
  const def: ZoneDef = {
    id: 'qa_stamp', name: 'Stamp (QA)', level: 1,
    size: { w: 2100, h: 1500 }, shape: 'rect', layoutType: 'rooms',
    theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
    seed: 0xfeed02, layout: [], objective: { kind: 'none' }, exits: [], map: { x: 9996, y: 9998 },
  };
  applyAnnexes(def, { annexes: { count: [1, 1], table: { qa_annex_probe: 1 }, depth: 2 } } as unknown as TilesetDef);
  const rows = def.annexes ?? [];
  check('B1 the roll seated a chain to stamp', rows.length === 2, JSON.stringify(rows.map(p => p.id)));
  const gen = (): ReturnType<typeof generateLayout> =>
    generateLayout(def, { w: def.size.w, h: def.size.h }, new Rng(def.seed ?? 1), vec(120, 750), [vec(2000, 750)]);
  const layout = gen();
  const wf = layout.walk as GridWalkField;
  const span = gridSpanOf({ w: def.size.w, h: def.size.h, pieces: rows });
  check('B2 the walk grid regrew to the generation span (dormant cells exist, born wall)',
    wf instanceof GridWalkField && wf.cols * wf.cell >= span.w && wf.rows * wf.cell >= span.h);
  const specs = layout.annexes ?? [];
  check('B3 every piece got its spec (ring-0 + child)',
    specs.length === 2 && rows.every(pc => specs.some(s => s.piece === pc.id)));
  const ring0 = specs.find(s => !s.piece.includes('.'))!;
  const child = specs.find(s => s.piece.includes('.'))!;
  const faces = layout.doodads.filter(d => d.annex);
  check('B4 the ring-0 face stands as a doodad; the child is recorded ONLY',
    faces.length === 1 && faces[0].annex === ring0.piece && faces[0].kind === 'draft_seam');
  const chC = vec(ring0.rect.x + ring0.rect.w / 2, ring0.rect.y + ring0.rect.h / 2);
  check('B5 the chamber is SEALED at generation (recorded, never carved — the leak check)',
    !wf.isWalkable(chC.x, chC.y)
    && !!ring0.carve?.length && !!child.carve?.length);
  // The face fronts standing floor: some walkable cell within a short walk
  // of the face on the host side (the approach guarantee).
  const f = faces[0].pos;
  let fronted = false;
  for (let i = 1; i <= 3 && !fronted; i++) {
    const cs = wf.cell;
    const pc0 = rows.find(r => r.id === ring0.piece)!;
    const p = pc0.dir === 'e' ? vec(f.x - cs * i, f.y) : vec(f.x, f.y - cs * i);
    if (wf.isWalkable(p.x, p.y)) fronted = true;
  }
  check('B6 the face fronts standing floor (the honest dead-end approach)', fronted);
  check('B7 double-generate ≡ identical (the stamp draws only from the layout stream)',
    JSON.stringify({ a: layout.annexes, d: layout.doodads }) === JSON.stringify((() => {
      const l2 = gen();
      return { a: l2.annexes, d: l2.doodads };
    })()));
}

// --- RIG C: the reveal, live -------------------------------------------------

seedGlobalRandom(0x5ec7e76);
bootSimEngine();

const QA_GRID = 'qa_annex_burrows';
const gridDef = (): ZoneDef => {
  const def: ZoneDef = {
    id: QA_GRID, name: 'Annex Burrows (QA)', level: 1,
    size: { w: 2100, h: 1500 }, shape: 'rect', layoutType: 'rooms',
    theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
    seed: 0xcafe03, layout: [], objective: { kind: 'none' }, exits: [], map: { x: 9994, y: 9998 },
  };
  applyAnnexes(def, { annexes: { count: [1, 1], table: { qa_annex_probe: 1 }, depth: 2 } } as unknown as TilesetDef);
  return def;
};
ZONES[QA_GRID] = gridDef();

const world = makeSimWorld('warrior', 0xa22e);
world.loadZone(QA_GRID);

{
  const specs = world.zoneAnnexSpecs;
  const ring0 = specs.find(s => !s.piece.includes('.'));
  const child = specs.find(s => s.piece.includes('.'));
  check('C1 the zone booted with its chain: specs installed, ring-0 face standing, child face not',
    specs.length === 2 && !!ring0 && !!child
    && world.doodads.some(d => d.annex === ring0!.piece)
    && !world.doodads.some(d => d.annex === child!.piece));
  const wf = world.walk as GridWalkField;
  const chC = vec(ring0!.rect.x + ring0!.rect.w / 2, ring0!.rect.y + ring0!.rect.h / 2);
  check('C2 sealed at boot: bounds refuse and the grid refuses', !wf.isWalkable(chC.x, chC.y)
    && (() => { const c = world.clampPos(vec(chC.x, chC.y), 14); return !(c.x === chC.x && c.y === chC.y); })());

  // THE TRIGGER PATH: park the hero at the face and let the REAL brittle
  // dwell sweep pop it (draft_seam: near, dwell 0.55s) — no dev calls.
  const face = world.doodads.find(d => d.annex === ring0!.piece)!;
  const pc0 = (world.arena.pieces ?? []).find(p => p.id === ring0!.piece)!;
  const stand = pc0.dir === 'e' ? vec(face.pos.x - 34, face.pos.y) : vec(face.pos.x, face.pos.y - 34);
  world.player.pos = world.clampPos(vec(stand.x, stand.y), world.player.radius);
  furnishLog.length = 0;
  for (let i = 0; i < 30 && !world.annexOpen.has(ring0!.piece); i++) world.update(0.1);
  check('C3 the NEAR face gives to a standing body through the real dwell sweep',
    world.annexOpen.has(ring0!.piece));
  check('C4 the carve opened the chamber + mouth (walk grows where bounds admit)',
    wf.isWalkable(chC.x, chC.y)
    && (() => { const c = world.clampPos(vec(chC.x, chC.y), 14); return c.x === chC.x && c.y === chC.y; })());
  check('C5 the face died into its REMAINS (the quiet reclass: rubble, no text box)',
    !world.doodads.some(d => d.annex === ring0!.piece)
    && world.doodads.some(d => d.kind === 'face_rubble'));
  check('C6 the child face stood up inside the opened ground',
    world.doodads.some(d => d.annex === child!.piece && d.kind === 'draft_seam'));
  check('C7 the find furnished ONCE, revive=false, and stamped the run ledger',
    furnishLog.length === 1 && furnishLog[0].revive === false
    && world.annexFound.has(`${QA_GRID}:${ring0!.piece}`)
    && world.doodads.some(d => d.kind === 'web'));

  // The child opens (dev lane — its trigger is the same fabric) and the two
  // chambers CONNECT through the recorded mouth.
  world.annexReveal(child!.piece);
  const chC2 = vec(child!.rect.x + child!.rect.w / 2, child!.rect.y + child!.rect.h / 2);
  const mouth = child!.carve![1];
  check('C8 the child carve connects chamber to chamber through its mouth',
    wf.isWalkable(chC2.x, chC2.y)
    && wf.isWalkable(mouth.x + mouth.w / 2, mouth.y + mouth.h / 2));
}

// --- RIG D: found is found ---------------------------------------------------

{
  furnishLog.length = 0;
  world.loadZone(SIM_ARENA_ID);
  world.time += 700; // past ZONE_MEMORY_TTL (600): the memory lapses
  world.loadZone(QA_GRID);
  const specs = world.zoneAnnexSpecs;
  const ring0 = specs.find(s => !s.piece.includes('.'))!;
  const child = specs.find(s => s.piece.includes('.'))!;
  const wf = world.walk as GridWalkField;
  const chC = vec(ring0.rect.x + ring0.rect.w / 2, ring0.rect.y + ring0.rect.h / 2);
  check('D1 beyond the TTL the run ledger re-opens the whole found chain',
    world.annexOpen.has(ring0.piece) && world.annexOpen.has(child.piece));
  check('D2 the carve re-applied on the fresh boot (the wall stays broken)',
    wf.isWalkable(chC.x, chC.y));
  check('D3 every replay furnish is revive=true (THE FIND LAW: loot pays once ever)',
    furnishLog.length >= 1 && furnishLog.every(e => e.revive === true));
  check('D4 no face doodads stand on found ground; the child face never replanted',
    !world.doodads.some(d => d.annex === ring0.piece) && !world.doodads.some(d => d.annex === child.piece));
}

// --- RIG E: the wire ---------------------------------------------------------

{
  // A fresh host with the chain SEALED (fresh run: no found ledger).
  seedGlobalRandom(0x5ec7e76);
  const host = makeSimWorld('warrior', 0xa22e);
  host.loadZone(QA_GRID);
  const msg = serializeZone(host);
  const ring0 = host.zoneAnnexSpecs.find(s => !s.piece.includes('.'))!;
  check('E1 the zone message ships the specs + the face doodad carries its annex id',
    (msg.annexSpecs?.length ?? 0) === 2
    && msg.doodads.some(d => d.annex === ring0.piece)
    && msg.arena.pieces?.every(pc => (pc as BoundsPiece).seed === undefined) === true);
  seedGlobalRandom(0x5ec7e76);
  const client = makeSimWorld('warrior', 0xa22e);
  applyZone(client, msg);
  check('E2 applyZone adopts the specs client-side', client.zoneAnnexSpecs.length === 2);
  const cwf = client.walk as GridWalkField;
  const chC = vec(ring0.rect.x + ring0.rect.w / 2, ring0.rect.y + ring0.rect.h / 2);
  client.annexReveal(ring0.piece, { silent: true, bare: true });
  const child = client.zoneAnnexSpecs.find(s => s.piece.includes('.'))!;
  check('E3 a bare reveal carves the client grid + dresses the child face, furnishes nothing',
    cwf.isWalkable(chC.x, chC.y)
    && !client.doodads.some(d => d.annex === ring0.piece)
    && client.doodads.some(d => d.annex === child.piece)
    && client.doodads.filter(d => d.kind === 'web').length === 0);
}

// --- RIG F: the away lane ----------------------------------------------------

{
  seedGlobalRandom(0x5ec7e76);
  const w3 = makeSimWorld('warrior', 0xa22e);
  // Standing in the sim arena with NO memory of the grid zone: the stamp
  // must land in the run ledger anyway (the closed TTL hole).
  const rows = (w3.zoneMap[QA_GRID]?.annexes ?? []);
  const ring0 = rows.find(p => !p.id.includes('.'))!;
  check('F1 annexActivate stamps the run ledger with no standing memory',
    w3.annexActivate(QA_GRID, ring0.id) === true
    && w3.annexFound.has(`${QA_GRID}:${ring0.id}`));
  w3.loadZone(QA_GRID);
  check('F2 arrival opens the away-stamped piece (found is found)',
    w3.annexOpen.has(ring0.id));
  check('F3 an unknown piece id still refuses honestly',
    w3.annexActivate(QA_GRID, 'ax_no_such') === false);
}

// --- RIG G: Movement IV — the door-scale lane + the spoils law ---------------

{
  // The forgotten crypt: a registered DESCENDING hollow whose gate is a real
  // sidezone with a rule and a painter — the whole door resolves by registry.
  const fc = hollowDef('forgotten_crypt_hollow');
  check('G1 the forgotten crypt is a registered descending hollow kind',
    !!fc && fc.descends === true);
  check('G2 its gate resolves whole: sidezone + doodad rule + painter entry',
    !!sidezoneOf('forgotten_crypt_gate')
    && doodadRuleOf('forgotten_crypt_gate').overlap === 'trigger'
    && !!DOODAD_VISUALS['forgotten_crypt_gate']);

  // THE SPOILS LAW reaches the annex furnish: on sealed ground the find's
  // gem refuses to mint while its orbs still flow (XP + orbs are never
  // spoils). The recording kind pays one gem + one orb at the live find.
  registerAnnex({
    id: 'qa_spoils_probe',
    face: 'draft_seam',
    size: { w: [300, 300], h: [300, 300] },
    furnish(c: AnnexRevealCtx) {
      if (!c.revive) { c.dropGem(c.center); c.shedOrb('life', c.center); }
    },
  });
  const QA_SPOILS = 'qa_annex_spoils';
  const sdef: ZoneDef = {
    id: QA_SPOILS, name: 'Annex Spoils (QA)', level: 1,
    size: { w: 2100, h: 1500 }, shape: 'rect', layoutType: 'rooms', spoils: 'none',
    theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
    // The PROVEN seat seed (QA_GRID's): same size + layoutType + seed ⇒ the
    // identical rooms grid and the identical ring-0 seat — the spoils rig
    // re-tests the law, never the stamp's luck.
    seed: 0xcafe03, layout: [], objective: { kind: 'none' }, exits: [], map: { x: 9990, y: 9998 },
  };
  applyAnnexes(sdef, { annexes: { count: [1, 1], table: { qa_spoils_probe: 1 }, depth: 1 } } as unknown as TilesetDef);
  ZONES[QA_SPOILS] = sdef;
  seedGlobalRandom(0x5ec7e76);
  const w4 = makeSimWorld('warrior', 0xa22e);
  w4.loadZone(QA_SPOILS);
  const ring0 = w4.zoneAnnexSpecs.find(s => !s.piece.includes('.'))!;
  const gemsBefore = w4.drops.filter(d => d.item.kind === 'skill').length;
  const orbsBefore = w4.orbs.length;
  w4.annexReveal(ring0.piece);
  check('G3 sealed ground refuses the annex gem (the spoils law reaches the furnish)',
    w4.drops.filter(d => d.item.kind === 'skill').length === gemsBefore);
  check('G4 the find\'s orbs still flow (orbs are never spoils)',
    w4.orbs.length > orbsBefore);
}

console.log(fails === 0 ? '\nprobe_annexgrammar: ALL GREEN' : `\nprobe_annexgrammar: ${fails} FAILURE(S)`);
