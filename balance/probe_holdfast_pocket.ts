// HOLDFAST POCKET CONTRACT PROBE — the purchased ground behind a toll must be
// worth the toll and NEVER a death trap. On the real engine, across seeds:
//
//  · THE FORM CONTRACT (data/pocketForms.ts): every pocket bakes a registered
//    form; a 'hoard' mints small, lightly held, and littered (caches + the
//    staked chest, tripled bounty); a 'delve' mints full-size with a
//    dead-end-fit objective (never 'waves'/'escape' — arena modes that spawn
//    at the player's back or ask for a way onward).
//  · THE CUL-DE-SAC CONTRACT: one road, back to the seller — no frontiers,
//    no weave, and world events refuse the ground (eventTargetable).
//  · COMMENSURATE POPULATION: the spawn budget follows the WALKABLE carve,
//    never the bounding rect (a dungeon-face pocket walks ~10% of its rect —
//    the old rect budget crammed a full zone against the one portal).
//  · ARRIVAL GRACE: nothing hostile stands on the portal at load, and the
//    spawnPoint sampler degrades to "far from the player" in cramped ground —
//    never to the entry stack (the death-ball).
//  · DETERMINISM: the same run re-asked mints the same forms.
//  · THE HOSTING LAW (zonePolicy.holdfastHostable): no gate may rise on
//    ground that can't anchor a fresh minted zone — caves/sidezones,
//    event-owned/floating/special/concealed mints, sanctuaries, pockets,
//    breach maws, boundless streams, biome-denied ground — through BOTH the
//    pure predicate and the real engine paths (devForceHoldfast + the
//    overlay's ensureRolled belt), so dev-tools QA can't manufacture states
//    normal play refuses.
//  · THE ROAD HOME: a pocket's one exit never seals behind policy — not the
//    objective seal (waypoint re-entries carry no entry edge to spare), not
//    a roving edge blockade. Bought ground can't trap its buyer.
//
// Exit 1 on any failure — or on a dead rig (a sweep that never saw a hoard,
// a delve, and a walled carve proved nothing).
//   npx tsx balance/probe_holdfast_pocket.ts [30]

import { bootSimEngine, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World, type ZoneExit } from '../src/engine/world';
import { HUB_ZONE, OBJECTIVE_SEALS } from '../src/data/zones';
import type { ZoneDef, ZoneExitDef } from '../src/data/zones';
import { POCKET_FORMS, pocketFormOf } from '../src/data/pocketForms';
import { GridWalkField } from '../src/world/gridWalk';
import { eventTargetable, holdfastHostable } from '../src/world/zonePolicy';
import { BIOMES } from '../src/world/biomes';
import { registerEdgeBlockSource } from '../src/world/edgeBlocks';

bootSimEngine();

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// Mirrored from world.ts, like probe_portal_contract mirrors the carve: the
// probe asserts the OBSERVABLE budget promise, not the internals.
const REF_AREA = 1900 * 1300;
const POCKET_PACK_FLOOR = 0.3;

const SEEDS = Number(process.argv[2] ?? 30);

/** A quiet world with ONLY the holdfast package live. Seeds the GLOBAL
 *  Math.random too (probes-must-seedGlobalRandom): seedless mints draw on the
 *  shared stream, so without this the frontier WALK — which hosts get gates,
 *  which pockets mint — differs per boot and per run. */
function makeWorld(seed: number): World {
  seedGlobalRandom(seed ^ 0x5eed);
  const account = makeAccount();
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = p.id === 'holdfast';
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById('warrior'));
  return world;
}

/** Walk out from the hub forcing a holdfast in each eligible zone; returns
 *  the (host, pocket) pairs the run minted. */
function mintPockets(world: World): { host: ZoneDef; pocket: ZoneDef }[] {
  const w = world as any;
  world.devTravelTo(HUB_ZONE);
  const hosts: string[] = [];
  for (let hop = 0; hop < 3; hop++) {
    const here: ZoneDef = w.zone;
    if (here.objective.kind !== 'safe' && !here.special && !here.pocket && here.caveDepth == null) {
      if (world.devForceHoldfast()) hosts.push(here.id);
    }
    const next = here.exits.find(e => !e.lock && e.to !== '?' && e.to !== 'lastlight' && !hosts.includes(e.to))
      ?? here.exits.find(e => !e.lock && e.to === '?');
    if (!next) break;
    if (next.to === '?') {
      const exI = here.exits.indexOf(next);
      const ex = w.exits.find((x: { defIndex: number }) => x.defIndex === exI);
      if (!ex) break;
      world.player.pos.x = ex.pos.x; world.player.pos.y = ex.pos.y;
      w.travelThrough(ex);
    } else {
      world.devTravelTo(next.to);
    }
  }
  const out: { host: ZoneDef; pocket: ZoneDef }[] = [];
  for (const hid of hosts) {
    const host = world.zoneMap[hid];
    const lockExit = host?.exits.find((e: ZoneExitDef) => e.lock);
    const pocket = lockExit && lockExit.to !== '?' ? world.zoneMap[lockExit.to] : undefined;
    if (host && pocket?.pocket) out.push({ host, pocket });
  }
  return out;
}

// --- the sweep -------------------------------------------------------------------

const seen = { hoard: 0, delve: 0, gridWalk: 0, pockets: 0, carve: 0 };
let densityWorst = '';
let densityWorstRatio = 0;

for (let s = 0; s < SEEDS; s++) {
  const seed = 424200 + s * 7919;
  const world = makeWorld(seed);
  const w = world as any;
  const pairs = mintPockets(world);
  for (const { host, pocket } of pairs) {
    seen.pockets++;
    const form = pocket.pocketForm !== undefined ? POCKET_FORMS[pocket.pocketForm] : undefined;

    // -- form baked + registered ------------------------------------------------
    if (!form) {
      check(`seed ${seed} ${pocket.id}: pocketForm baked + registered`, false,
        `pocketForm='${pocket.pocketForm}'`);
      continue;
    }
    if (form.id === 'hoard') seen.hoard++;
    if (form.id === 'delve') seen.delve++;

    // -- the cul-de-sac contract --------------------------------------------------
    if (!(pocket.exits.length === 1 && pocket.exits[0].to === host.id)) {
      check(`seed ${seed} ${pocket.id}: one road, back to the seller`, false,
        `exits=[${pocket.exits.map(e => e.to).join(',')}]`);
    }
    if (eventTargetable('demon_invasion', pocket)) {
      check(`seed ${seed} ${pocket.id}: events refuse purchased ground`, false);
    }

    // -- objective policy ---------------------------------------------------------
    const okind = pocket.objective.kind;
    if (form.objective && okind !== form.objective.kind) {
      check(`seed ${seed} ${pocket.id}: authored objective honored`, false,
        `form wants '${form.objective.kind}', minted '${okind}'`);
    }
    if (!form.objective) {
      const pool = new Set(form.objectivePool ?? Object.keys(OBJECTIVE_SEALS));
      pool.add('clear'); // the emptied-pool degrade is always legal
      pool.delete('circuit'); pool.add('beacon'); // the alias mints as beacon
      if (!pool.has(okind)) {
        check(`seed ${seed} ${pocket.id}: rolled objective within the form's pool`, false,
          `'${okind}' outside [${[...pool].join(',')}]`);
      }
    }
    if (okind === 'waves' || okind === 'escape') {
      check(`seed ${seed} ${pocket.id}: no arena/onward mode in a dead end`, false, `'${okind}'`);
    }

    // -- hoard shape ---------------------------------------------------------------
    if (form.size) {
      const okW = pocket.size.w >= form.size.w[0] && pocket.size.w <= form.size.w[1];
      const okH = pocket.size.h >= form.size.h[0] && pocket.size.h <= form.size.h[1];
      if (!okW || !okH) {
        check(`seed ${seed} ${pocket.id}: '${form.id}' footprint within its band`, false,
          `${pocket.size.w}×${pocket.size.h} vs ${JSON.stringify(form.size)}`);
      }
    }

    // -- load it: population + treasure + arrival grace -----------------------------
    world.loadZone(pocket.id, host.id);
    const walk = w.walk;
    if (walk instanceof GridWalkField) seen.gridWalk++;
    const rectArea = pocket.size.w * pocket.size.h;
    const walkArea = walk instanceof GridWalkField
      ? walk.walkableCount() * walk.cell * walk.cell : rectArea;
    if (walkArea < rectArea * 0.55) seen.carve++;

    const foes = (w.countedEnemies() as { pos: { x: number; y: number }; confine?: unknown }[]);
    const entry = w.zoneEntry as { x: number; y: number };

    // Arrival grace: nothing hostile ON the portal at load. (260px ≈ just past
    // a portal ring + an aggro-free breath — the death-ball stacked at ±140.
    // Habitat/landmark-confined bodies can't chase — they don't break grace.)
    if (!pocket.factionWar) {
      const near = foes.filter(f => !f.confine
        && Math.hypot(f.pos.x - entry.x, f.pos.y - entry.y) < 260).length;
      if (near > 0) {
        check(`seed ${seed} ${pocket.id}: arrival grace (no hostile inside 260px)`, false,
          `${near} bodies on the portal`);
      }
    }

    // Commensurate population: the budget's own ceiling, computed from the
    // WALKABLE carve — plus slack for camps/garrisons/objective extras. A
    // rect-budgeted closet (the old defect) lands ~3× past this.
    if (!pocket.factionWar) {
      const density = pocket.packDensity ?? 1;
      const packsMax = pocket.packs ? pocket.packs.count[1] : 0;
      const sizeMax = pocket.packs
        ? Math.max(pocket.packs.size[1], ...(pocket.packs.archetypes ?? []).map(a => a.size[1]))
        : 0;
      const areaFactor = Math.min(2.2, Math.max(POCKET_PACK_FLOOR, Math.sqrt(walkArea / REF_AREA)));
      const ceiling = Math.round(packsMax * 1.25 * areaFactor * density) * sizeMax + 16;
      if (foes.length > ceiling) {
        check(`seed ${seed} ${pocket.id}: population commensurate with walkable ground`, false,
          `${foes.length} foes > ceiling ${ceiling} (walk ${(walkArea / 1e6).toFixed(2)}Mpx², rect ${(rectArea / 1e6).toFixed(2)}Mpx²)`);
      }
      const ratio = ceiling > 16 ? foes.length / ceiling : 0;
      if (ratio > densityWorstRatio) {
        densityWorstRatio = ratio;
        densityWorst = `${pocket.layoutType ?? 'plains'}/${form.id} ${foes.length}/${ceiling}`;
      }
    }

    // Hoard treasure: the litter IS the promise.
    if (form.caches) {
      const caches = (world.actors as { defId?: string; dead?: boolean }[])
        .filter(a => a.defId === 'gem_cache' && !a.dead).length;
      if (caches < form.caches[0]) {
        check(`seed ${seed} ${pocket.id}: hoard litter present (≥${form.caches[0]} caches)`, false,
          `${caches} caches`);
      }
    }
    if (form.chest && !world.chests.some(c => c.kind === form.chest)) {
      check(`seed ${seed} ${pocket.id}: the staked '${form.chest}' chest stands`, false);
    }
    if (form.bounty && !((pocket.bounty ?? 0) >= form.bounty)) {
      check(`seed ${seed} ${pocket.id}: bounty floor stamped`, false, `bounty=${pocket.bounty}`);
    }

    // The pitch reaches the parley: the ONE resolver answers from the host.
    const lockExit = host.exits.find(e => e.lock);
    const pitch = world.holdfastPocketPitch(host.id, lockExit?.lock);
    if (pitch !== form.pitch) {
      check(`seed ${seed} ${pocket.id}: the parley pitches the minted form`, false,
        `'${pitch}' ≠ '${form.pitch}'`);
    }

    // spawnPoint contract in THIS ground: never the entry stack. Compute the
    // farthest achievable stand, then demand every sample clears the lesser
    // of the classic 450 bar and 45% of what the ground allows.
    let maxD = 0;
    for (let y = 90; y < pocket.size.h - 60; y += 60) {
      for (let x = 90; x < pocket.size.w - 60; x += 60) {
        if (walk && !walk.isWalkable(x, y)) continue;
        const d = Math.hypot(x - world.player.pos.x, y - world.player.pos.y);
        if (d > maxD) maxD = d;
      }
    }
    const bar = Math.min(450, maxD * 0.45);
    let spawnWorst = Infinity;
    for (let i = 0; i < 24; i++) {
      const p = w.spawnPoint(24) as { x: number; y: number };
      spawnWorst = Math.min(spawnWorst, Math.hypot(p.x - world.player.pos.x, p.y - world.player.pos.y));
    }
    if (spawnWorst < bar) {
      check(`seed ${seed} ${pocket.id}: spawnPoint honors the grace floor`, false,
        `worst ${spawnWorst.toFixed(0)} < bar ${bar.toFixed(0)} (maxD ${maxD.toFixed(0)})`);
    }
  }
}

// --- THE HOSTING LAW: no gate on ground that can't anchor a fresh mint -------------
{
  const world = makeWorld(910001);
  const w = world as any;
  world.devTravelTo(HUB_ZONE);
  const hub = world.zoneMap[HUB_ZONE];

  // Rig-alive: the ELIGIBLE baseline must pass, or every refusal below is vacuous.
  check('hosting: an ordinary uncharted zone is hostable', holdfastHostable(hub));

  // The pure predicate, per refused class (clones — the law is structural).
  const base = { ...hub };
  const refused: [string, Partial<ZoneDef>][] = [
    ['cave/sidezone (caveDepth)', { caveDepth: 1 }],
    ['event-owned mint', { eventOwned: true }],
    ['floating mint', { floating: true }],
    ['special arena', { special: true }],
    ['purchased pocket', { pocket: true }],
    ['sanctuary', { objective: { kind: 'safe' } }],
    ['breach maw', { breach: true }],
    ['boundless stream', { boundless: true }],
    ['concealed mint', { concealed: true }],
  ];
  let refusedOk = 0;
  for (const [label, flags] of refused) {
    if (holdfastHostable({ ...base, ...flags } as ZoneDef)) {
      check(`hosting: refuses ${label}`, false);
    } else refusedOk++;
  }
  check(`hosting: every refused class refuses (${refusedOk}/${refused.length})`,
    refusedOk === refused.length);

  // Biome DATA deny: 'holdfast' is a first-class event id for zone policy.
  // (The hub is an authored zone with no biome — use a minted neighbor, and
  // FAIL loudly if none exists: a skipped check proves nothing.)
  const biomed = Object.values(world.zoneMap)
    .find(z => z.biome && BIOMES[z.biome] && holdfastHostable(z));
  if (biomed) {
    const b = BIOMES[biomed.biome!];
    const saved = b.denyEvents;
    b.denyEvents = [...(saved ?? []), 'holdfast'];
    check('hosting: a biome denies holdfasts as pure data', !holdfastHostable(biomed),
      `biome=${biomed.biome}`);
    if (saved === undefined) delete b.denyEvents; else b.denyEvents = saved;
    check('hosting: deny row restored, zone hostable again', holdfastHostable(biomed));
  } else {
    check('hosting: a biomed zone exists to test the data deny (rig)', false);
  }

  // THE REAL ENGINE PATHS. devForce inside a live POCKET refuses:
  world.devForceHoldfast();
  const lockExit = world.zoneMap[HUB_ZONE].exits.find((e: ZoneExitDef) => e.lock);
  if (lockExit && lockExit.to !== '?') {
    const pocket = world.zoneMap[lockExit.to];
    w.sim.holdfastField.unlock(HUB_ZONE);
    world.devTravelTo(pocket.id);
    const before = pocket.exits.length;
    check('hosting: devForce refuses inside a purchased pocket',
      world.devForceHoldfast() === false && pocket.exits.length === before);
  } else {
    check('hosting: hub gate forced (rig)', false, 'devForceHoldfast made no exit in the hub');
  }

  // ...and inside a real CAVE. GUARANTEED, not seed-lucky: hunt seeds until a
  // hub gate sells a DELVE (its form row floors a cave mouth), then descend it.
  let caveTested = false;
  for (let s = 0; s < 8 && !caveTested; s++) {
    const cw = makeWorld(930001 + s * 101);
    const cwAny = cw as any;
    cw.devTravelTo(HUB_ZONE);
    cw.devForceHoldfast();
    const le = cw.zoneMap[HUB_ZONE].exits.find((e: ZoneExitDef) => e.lock);
    if (!le || le.to === '?') continue;
    const p = cw.zoneMap[le.to];
    if (!p || p.pocketForm !== 'delve') continue;
    cw.loadZone(p.id, HUB_ZONE);
    const mouth = (cwAny.caveEntrances as { pos: unknown; seed: number; kind: string }[])[0];
    if (!mouth) { check('hosting: delve cave mouth present (rig)', false, `none in ${p.id}`); break; }
    cwAny.enterSidezone(mouth);
    const caveDef = cwAny.zone as ZoneDef;
    const caveExits = caveDef.exits.length;
    const chf = cwAny.sim.holdfastField;
    check('hosting: cave def wears caveDepth (the off-graph class)', caveDef.caveDepth != null);
    check('hosting: devForce refuses inside a cave', cw.devForceHoldfast() === false);
    check('hosting: overlay belt refuses a cave def outright',
      chf.ensureRolled(caveDef, 999) === null && caveDef.exits.length === caveExits);
    const snap = chf.snapshot() as { infos: [string, unknown][] };
    check('hosting: the durable ledger never learns the cave id',
      !snap.infos.some(([id]) => id === caveDef.id));
    caveTested = true;
  }
  check('hosting: the cave class was actually exercised (rig)', caveTested);

  // Integration: a real zone flipped event-owned refuses the force too.
  world.devTravelTo(HUB_ZONE);
  const neighbor = hub.exits.map(e => world.zoneMap[e.to]).find(z => z && !z.pocket && !z.special
    && z.objective.kind !== 'safe' && !world.zoneMap[z.id].exits.some((e: ZoneExitDef) => e.lock));
  if (neighbor) {
    world.devTravelTo(neighbor.id);
    neighbor.eventOwned = true;
    check('hosting: devForce refuses a live event-owned zone', world.devForceHoldfast() === false);
    delete neighbor.eventOwned;
  }
}

// --- THE ROAD HOME: a pocket's one exit never seals behind policy ------------------
const probeBlock = { armed: false, zoneId: '' };
registerEdgeBlockSource((_wld, from, to) =>
  probeBlock.armed && (from === probeBlock.zoneId || to === probeBlock.zoneId)
    ? { reason: 'probe blockade', source: 'probe' } : null);
{
  const world = makeWorld(920001);
  const w = world as any;
  const pairs = mintPockets(world);
  const pair = pairs[0];
  if (!pair) {
    check('road-home: pocket minted (rig)', false);
  } else {
    const { host, pocket } = pair;
    // CONTROL — the seal machinery must fire where the law permits it: a
    // sealing objective on the HOST, entered with no entry edge (the
    // waypoint shape), seals its exits.
    const savedObj = host.objective;
    host.objective = { kind: 'clear', seal: true } as ZoneDef['objective'];
    world.loadZone(host.id);
    const anyExit = (w.exits as ZoneExit[]).find(x => x.to !== '?');
    check('road-home: control — a sealing objective seals a NORMAL zone entered waypoint-style',
      !!anyExit && world.isExitLocked(anyExit!) === true,
      anyExit ? `to=${anyExit.to}` : 'no exit');
    host.objective = savedObj;

    // THE INVARIANT — the same trap shape on the POCKET stays open.
    const savedP = pocket.objective;
    pocket.objective = { kind: 'clear', seal: true } as ZoneDef['objective'];
    world.loadZone(pocket.id); // NO from: the waypoint re-entry shape
    const back = (w.exits as ZoneExit[]).find(x => x.to === host.id);
    check('road-home: a sealing objective can NEVER seal the pocket road',
      !!back && world.isExitLocked(back!) === false);
    pocket.objective = savedP;

    // A roving edge blockade across the only road is refused from inside too.
    probeBlock.armed = true; probeBlock.zoneId = pocket.id;
    check('road-home: an edge blockade cannot seal the pocket road from inside',
      !!back && world.isExitLocked(back!) === false);
    // Control: the SAME source does hold the road from the non-pocket side.
    world.loadZone(host.id, pocket.id);
    const toPocket = (w.exits as ZoneExit[]).find(x => x.to === pocket.id);
    check('road-home: control — the same blockade holds the road from the host side',
      !!toPocket && world.isExitLocked(toPocket!) === true);
    probeBlock.armed = false;
  }
}

// --- determinism: the same run re-asked mints the same forms -----------------------
for (let s = 0; s < 3; s++) {
  const seed = 424200 + s * 7919;
  const a = mintPockets(makeWorld(seed)).map(p => `${p.host.id}:${p.pocket.pocketForm}`).join('|');
  const b = mintPockets(makeWorld(seed)).map(p => `${p.host.id}:${p.pocket.pocketForm}`).join('|');
  check(`determinism: seed ${seed} re-mints the same forms`, a === b && a.length > 0, `${a} vs ${b}`);
}

// --- the rig must have exercised the classes it claims to guard --------------------
check('rig: pockets minted', seen.pockets >= SEEDS, `${seen.pockets} across ${SEEDS} seeds`);
check('rig: both forms observed', seen.hoard > 0 && seen.delve > 0,
  `hoard ${seen.hoard}, delve ${seen.delve}`);
check('rig: walled/carve ground observed', seen.gridWalk > 0 && seen.carve > 0,
  `gridWalk ${seen.gridWalk}, carve ${seen.carve} (the death-ball class)`);
check('registry: default form registered', !!pocketFormOf(undefined));

console.log(`\nprobe holdfast-pocket: ${seen.pockets} pockets / ${SEEDS} seeds — `
  + `hoard ${seen.hoard}, delve ${seen.delve}, carve ${seen.carve}; worst density ${densityWorst || 'n/a'}`);
if (failed) { console.log(`${failed} FAILURE(S)`); process.exit(1); }
console.log('PROBE HOLDFAST-POCKET OK');
