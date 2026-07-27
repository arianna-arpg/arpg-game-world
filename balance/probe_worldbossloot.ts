// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SOVEREIGN HOARDS: world-boss spoils as DATA, resolved
// through the ONE generic KillCtx verb (dropLootTable).
//
// Before this lane a sovereign paid `reward.gems` identical gems and nothing
// else — a continent-scale kill with no themed gear anywhere in it, because
// the KillCtx facade had no loot-table verb to reach for. The fix is one
// engine verb plus table ids on the def rows; this rig is the fence around
// both halves.
//
// RIG A — THE CENSUS (data): every sovereign names at least one table, every
//   named id RESOLVES in LOOT_TABLES, no two sovereigns share a table (the
//   whole point: a named sovereign's spoils must read as ITS spoils), and the
//   shipped package validates clean.
// RIG B — THE VALIDATE NET: the package REFUSES a row naming an unknown table
//   and a row naming none at all — because resolveLootTable warns once on a
//   bad id and then silently pays nothing forever, which is exactly the
//   failure mode this whole task existed to kill.
// RIG C — THE AUTHORED CHARACTER (measured, seeded): each face actually pays
//   what its comment claims — Vhorun the widest haul, Cragmaw the richest
//   gems, Dolmourn the richest vestiges (in the WHOLE economy), Ashvein the
//   hottest uniques — and the tier sits where it says: above the repeatable
//   boss/lair faucets, under the one-shot regent capstone.
// RIG D — THE KILL, END TO END (the real engine): a body tagged
//   'worldboss_boss' falls on a live World with the real registered rule and
//   a real WorldBossField behind it; a QA table on the def row proves the
//   THREE-KIND DISPATCH (gem / gear / vestige each land as themselves, counts
//   and vestige id intact) and that the ids on the ROW are what resolved.
// RIG E — THE SPOILS LAW: the identical sovereign kill on spoils-'none'
//   ground mints NOTHING — the verb owns no policy, it routes through the
//   drop primitives, so the seal holds for free.
// Run: npx tsx balance/probe_worldbossloot.ts
// ---------------------------------------------------------------------------

import '../src/packages/defs/worldboss'; // registers the 'worldboss_slain' rule

import { BIOMES } from '../src/world/biomes';
import { CLASSES } from '../src/data/classes';
import { LOOT_TABLES } from '../src/data/loottables';
import { MONSTERS } from '../src/data/monsters';
import { VESTIGE_LIST } from '../src/data/vestiges';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { DROP_CFG, resolveLootTable } from '../src/engine/loot';
import { WORLDBOSS, WORLDBOSS_SURGE } from '../src/packages/defs/worldboss';
import { WorldBossField, type WorldBossDef } from '../src/packages/overlays/worldboss';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { deriveSeed, mulberry32 } from '../src/sim/rng';
import { seedGlobalRandom } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

bootSimEngine();
seedGlobalRandom(0x50be21);

const DEFS = WORLDBOSS_SURGE.defs;
const look = { monster: (id: string) => !!MONSTERS[id], biome: (id: string) => !!BIOMES[id] };

// --- RIG A: THE CENSUS ------------------------------------------------------
{
  const named = DEFS.filter(d => (d.reward.tables?.length ?? 0) > 0);
  check('A1 every sovereign names a hoard', named.length === DEFS.length,
    DEFS.filter(d => !d.reward.tables?.length).map(d => d.id).join(', ') || `${DEFS.length} defs`);

  const unknown = DEFS.flatMap(d => (d.reward.tables ?? [])
    .filter(t => !LOOT_TABLES[t]).map(t => `${d.id}→${t}`));
  check('A2 every named table RESOLVES in LOOT_TABLES', unknown.length === 0, unknown.join(', '));

  // ITS spoils, not A sovereign's: five bodies pointing at boss_gear would
  // satisfy A1/A2 and still be the bug. Table ids must be exclusive.
  const owner = new Map<string, string>();
  const shared: string[] = [];
  for (const d of DEFS) {
    for (const t of d.reward.tables ?? []) {
      const prev = owner.get(t);
      if (prev) shared.push(`${t} (${prev} + ${d.id})`);
      else owner.set(t, d.id);
    }
  }
  check('A3 no two sovereigns share a hoard — the spoils read as ITS spoils',
    shared.length === 0, shared.join(', '));

  // The shared SPINE is nested, never named on a row: the tier retunes in one
  // place and no sovereign is "the generic one".
  check('A4 the spine is nested by all five, named by none',
    !!LOOT_TABLES.primeval_spoil
    && DEFS.every(d => !(d.reward.tables ?? []).includes('primeval_spoil'))
    && DEFS.every(d => (d.reward.tables ?? []).every(t =>
      LOOT_TABLES[t].rolls.some(r => r.entries.some(e =>
        e.kind === 'table' && e.table === 'primeval_spoil')))));

  const problems = WORLDBOSS.validate?.(look as never) ?? [];
  check('A5 the shipped package validates clean', problems.length === 0, problems.join('; '));
}

// --- RIG B: THE VALIDATE NET ------------------------------------------------
{
  const bogus = (tables: string[] | undefined): WorldBossDef => ({
    ...structuredClone(DEFS[0]), id: 'qa_bogus',
    reward: { xp: 1, gems: 0, ...(tables ? { tables } : {}) },
  });

  DEFS.push(bogus(['qa_table_that_was_never_authored']));
  const badId = WORLDBOSS.validate?.(look as never) ?? [];
  DEFS.pop();
  check('B1 an UNKNOWN table id is refused (silence is the failure mode)',
    badId.some(p => p.includes('qa_bogus') && p.includes('unknown')), badId.join('; '));

  DEFS.push(bogus(undefined));
  const noTable = WORLDBOSS.validate?.(look as never) ?? [];
  DEFS.pop();
  check('B2 a sovereign naming NO table is refused',
    noTable.some(p => p.includes('qa_bogus') && p.includes('names no loot table')), noTable.join('; '));

  const clean = WORLDBOSS.validate?.(look as never) ?? [];
  check('B3 …and the roster is back to clean', clean.length === 0, clean.join('; '));
}

// --- RIG C: THE AUTHORED CHARACTER (measured) -------------------------------
{
  // Same shape the economy audit uses: a seeded stream, so every number below
  // is deterministic and a FAIL is a real drift, never a bad night.
  // The stream is SEEDED, so these are fixed measurements, not samples that
  // might wobble — a FAIL here is real drift. (N barely moves the rig's wall
  // clock: the cost of this probe is engine boot, not resolving.)
  const N = 4000;
  const yieldOf = (tableId: string): { items: number; gems: number; vestiges: number; uniqueFrac: number } => {
    const rng = mulberry32(deriveSeed(0x50be21, tableId.length * 977 + tableId.charCodeAt(0)));
    let items = 0, gems = 0, vestiges = 0, uniques = 0;
    for (let i = 0; i < N; i++) {
      for (const r of resolveLootTable(tableId, { ilvl: 20, rng })) {
        if (r.kind === 'gem') gems++;
        else if (r.kind === 'vestige') vestiges += r.count;
        else { items++; if (r.item.rarity === 'unique') uniques++; }
      }
    }
    return { items: items / N, gems: gems / N, vestiges: vestiges / N, uniqueFrac: items ? uniques / items : 0 };
  };

  const y = {
    spine: yieldOf('primeval_spoil'),
    vhorun: yieldOf('sunderwyrm_hoard'),
    cragmaw: yieldOf('orogeny_hoard'),
    ashvein: yieldOf('furnace_hoard'),
    bell: yieldOf('iron_bell_hoard'),
    velketh: yieldOf('husk_throne_hoard'),
    boss: yieldOf('boss_gear'),
    lair: yieldOf('lair_hoard'),
    regent: yieldOf('regent_hoard'),
    tide: yieldOf('tidebound_hoard'),
  };
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

  // EVERY hoard pays gear — a sovereign that resolves to nothing is the
  // original bug wearing a table id.
  const dry = Object.entries(y).filter(([, v]) => v.items < 1);
  check('C1 every sovereign hoard pays at least one piece of gear per kill',
    dry.length === 0, dry.map(([k, v]) => `${k}=${v.items.toFixed(2)}`).join(', '));

  // WHERE THE TIER SITS: clearly over the repeatable faucets, clearly under
  // the one-shot capstone. Both fences matter — the first is the feature, the
  // second is the guard rail.
  check('C2 the spine out-pays the repeatable faucets on uniques',
    y.spine.uniqueFrac > y.boss.uniqueFrac * 2 && y.spine.uniqueFrac > y.lair.uniqueFrac * 2,
    `spine ${pct(y.spine.uniqueFrac)} vs boss ${pct(y.boss.uniqueFrac)} / lair ${pct(y.lair.uniqueFrac)}`);
  check('C3 …and stays under the one-shot regent capstone',
    y.spine.uniqueFrac < y.regent.uniqueFrac * 0.6,
    `spine ${pct(y.spine.uniqueFrac)} vs regent ${pct(y.regent.uniqueFrac)}`);

  // THE AUTHORED CHARACTER: each comment in loottables.ts makes a claim about
  // which sovereign leads which axis. The data has to agree, or the prose is
  // decoration.
  const faces = [y.vhorun, y.cragmaw, y.ashvein, y.bell, y.velketh];
  check('C4 Vhorun pays the WIDEST haul (the longest arc earns it)',
    faces.every(f => f === y.vhorun || y.vhorun.items > f.items),
    faces.map(f => f.items.toFixed(2)).join(' / '));
  check('C5 Cragmaw pays the richest GEMS (crack the mountain open)',
    faces.every(f => f === y.cragmaw || y.cragmaw.gems > f.gems),
    faces.map(f => f.gems.toFixed(2)).join(' / '));
  check('C6 Ashvein pays the hottest UNIQUES of the five, on the fewest pieces',
    faces.every(f => f === y.ashvein || (y.ashvein.uniqueFrac > f.uniqueFrac && y.ashvein.items < f.items)),
    faces.map(f => `${f.items.toFixed(2)}@${pct(f.uniqueFrac)}`).join(' / '));
  check('C7 Dolmourn pays the richest VESTIGES in the whole economy',
    Object.values(y).every(f => f === y.bell || y.bell.vestiges > f.vestiges),
    `bell ${y.bell.vestiges.toFixed(2)} vs next ${Math.max(...Object.values(y)
      .filter(f => f !== y.bell).map(f => f.vestiges)).toFixed(2)} (tidebound ${y.tide.vestiges.toFixed(2)})`);
  check('C8 Velketh pays jewellery — its side pour is the jewelry cache',
    LOOT_TABLES.husk_throne_hoard.rolls.some(r => r.entries.some(e =>
      e.kind === 'table' && e.table === 'jewelry_cache')));
}

// --- the live-engine ground (RIGs D + E) ------------------------------------
const PROBE_LEVEL = 14;
const QA_VESTIGE = VESTIGE_LIST[0]!.id;
const QA_TABLE = 'qa_sovereign_hoard';

// A QA hoard that guarantees ONE of each result kind — the three-kind dispatch
// has nowhere to hide (a gem routed to dropGearAt would land as the wrong
// thing, or not at all).
LOOT_TABLES[QA_TABLE] = {
  id: QA_TABLE,
  rolls: [
    { count: 1, entries: [{ weight: 1, kind: 'gem' }] },
    { count: 1, entries: [{ weight: 1, kind: 'item', rarity: 'rare' }] },
    { count: 1, entries: [{ weight: 1, kind: 'vestige', id: QA_VESTIGE, count: 2 }] },
  ],
};

const mkGround = (id: string, spoils?: 'none'): ZoneDef => ({
  id, name: id, level: PROBE_LEVEL,
  size: { w: 1400, h: 1000 },
  theme: {
    floor: '#101010', grid: '#181818', border: '#3a3a3a',
    obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888',
  },
  seed: 0x5017, layout: [],
  objective: { kind: 'safe' },
  exits: [],
  map: { x: 9600, y: 9600 },
  ...(spoils ? { spoils } : {}),
});
ZONES['probe_wbloot_open'] = mkGround('probe_wbloot_open');
ZONES['probe_wbloot_sealed'] = mkGround('probe_wbloot_sealed', 'none');

// A REAL field, ignited on a synthetic ring (the overlay-pure idiom from
// probe_rampage RIG F) — so the kill rule's `f.onBossSlain(key)` resolves a
// genuine instance, not a hand-rolled stub.
const mkNode = (id: string, x: number, y: number, exits: string[]): ZoneDef => ({
  id, name: id, map: { x, y }, level: PROBE_LEVEL, biome: 'field',
  objective: { kind: 'hunt' }, exits: exits.map(to => ({ to })),
} as unknown as ZoneDef);
const RING = 6;
const nodes: ZoneDef[] = [];
for (let i = 0; i < RING; i++) {
  nodes.push(mkNode(`wbl${i}`, Math.cos(i / RING * Math.PI * 2) * 300, Math.sin(i / RING * Math.PI * 2) * 300,
    [1, RING - 1].map(k => `wbl${(i + k) % RING}`)));
}
const byId: Record<string, ZoneDef> = {};
for (const z of nodes) byId[z.id] = z;
const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
const view = {
  nodes, byId, allNodes: nodes, terrain: () => 'land', currentZoneId: 'wbl0',
  time: 0, census: {}, charLevel: 30, gates: new Map(),
  visited: new Set(nodes.map(z => z.id)), surveyed: new Set(),
} as unknown as OverlayView;

/** A field whose Cragmaw pays the QA hoard instead of its own — the def row IS
 *  the lane under test, so swapping the row must swap what falls. */
const mkField = (tables: string[]): WorldBossField => {
  const surge = structuredClone(WORLDBOSS_SURGE);
  const cm = surge.defs.find(d => d.id === 'cragmaw')!;
  cm.reward = { xp: 0, gems: 0, tables };
  return new WorldBossField({ seed: 7, gate: () => gate, biomeSeed: 7 }, surge);
};

const w = makeSimWorld(CLASSES[0].id, 0x9c11) as World;
const W = w as unknown as {
  drops: { item: { kind: string; id?: string; count?: number; item?: { rarity: string } } }[];
  createMonster(defId: string, level: number, team: string): Actor;
  actors: Actor[];
  sim: { worldBossFieldsAll(): WorldBossField[] };
};

// Silence the ORDINARY kill path entirely: a plain trash body, every chance
// gate shut. Whatever lands after that came from the hoard, and only from it.
const saved = { item: DROP_CFG.killItemChance, gem: DROP_CFG.killGemChance, vest: DROP_CFG.vestigeChance };
DROP_CFG.killItemChance = 0;
DROP_CFG.killGemChance = 0;
DROP_CFG.vestigeChance = 0;
// Pinned by NAME, not by predicate scan: the body under the tag must be inert
// (no boss table, no per-def hoard, no orb shed, no purse, no parts), and a
// scan that silently re-picks when the registry shifts would turn a content
// edit into a mystery failure here. probe_spoils leans on the same body.
const FODDER = 'pit_mauler';
{
  const f = MONSTERS[FODDER];
  check('D0 the fodder body is inert (nothing but the hoard can land)',
    !!f && !f.boss && !f.loot && !f.drops && !f.essenceSpill && !f.orbDrops && !f.parts && !f.tag);
}

/** Fell a sovereign on the loaded zone through the REAL registered rule. */
const slaySovereign = (field: WorldBossField): number => {
  const before = W.drops.length;
  W.sim.worldBossFieldsAll = () => [field];
  const inst = field.peekApparitions()[0]!;
  const m = W.createMonster(FODDER, PROBE_LEVEL, 'enemy');
  m.tag = 'worldboss_boss';
  m.eventKey = inst.id;
  m.rarity = 'normal';
  m.pos.x = w.player.pos.x + 60;
  m.pos.y = w.player.pos.y;
  W.actors.push(m);
  w.kill(m, false, w.player); // killer on team 'player' ⇒ credited
  return W.drops.length - before;
};

// --- RIG D: THE KILL, END TO END --------------------------------------------
{
  w.loadZone('probe_wbloot_open');
  const fq = mkField([QA_TABLE]);
  check('D1 the QA sovereign manifests', fq.devManifest(view, 'wbl0', 'cragmaw'));
  const laid = slaySovereign(fq);
  const fresh = W.drops.slice(-Math.max(0, laid));

  check('D2 the fall lays the table on the ground', laid > 0, `${laid} drop(s)`);
  const gems = fresh.filter(d => d.item.kind === 'skill' || d.item.kind === 'support');
  const gear = fresh.filter(d => d.item.kind === 'gear');
  const vests = fresh.filter(d => d.item.kind === 'vestige');
  check('D3 THE THREE-KIND DISPATCH: a gem landed AS a gem', gems.length === 1, `${gems.length}`);
  check('D4 …gear landed AS gear, at the rarity the table forced',
    gear.length === 1 && gear[0].item.item?.rarity === 'rare', `${gear.length} / ${gear[0]?.item.item?.rarity}`);
  check('D5 …and the vestige landed AS itself, id and COUNT intact',
    vests.length === 1 && vests[0].item.id === QA_VESTIGE && vests[0].item.count === 2,
    `${vests.length} × ${vests[0]?.item.id}:${vests[0]?.item.count}`);

  // THE ROW IS THE LANE: point the same sovereign at its shipped hoard and
  // what falls changes — proof the id on the def row is what resolved, not
  // some ambient path that would have fired regardless.
  const fs = mkField(['orogeny_hoard']);
  check('D6 a second sovereign manifests', fs.devManifest(view, 'wbl0', 'cragmaw'));
  const n2 = slaySovereign(fs);
  const fresh2 = W.drops.slice(-Math.max(0, n2));
  check('D7 THE ROW IS THE LANE: the shipped hoard pays gear, and never the QA vestige',
    n2 > 0 && fresh2.some(d => d.item.kind === 'gear')
    && !fresh2.some(d => d.item.kind === 'vestige' && d.item.count === 2 && d.item.id === QA_VESTIGE),
    `${n2} drop(s)`);

  // A sovereign nobody killed pays nothing (the rule needs a live instance).
  const orphan = W.drops.length;
  const fo = mkField([QA_TABLE]);
  fo.devManifest(view, 'wbl0', 'cragmaw');
  W.sim.worldBossFieldsAll = () => [fo];
  const stray = W.createMonster(FODDER, PROBE_LEVEL, 'enemy');
  stray.tag = 'worldboss_boss';
  stray.eventKey = 'wb_no_such_instance';
  W.actors.push(stray);
  w.kill(stray, false, w.player);
  check('D8 an unbound eventKey pays nothing (no hoard without a sovereign)',
    W.drops.length === orphan, `${W.drops.length - orphan} drop(s)`);
}

// --- RIG E: THE SPOILS LAW --------------------------------------------------
{
  w.loadZone('probe_wbloot_sealed');
  const n0 = W.drops.length;
  const fq = mkField([QA_TABLE]);
  check('E1 the sovereign manifests on sealed ground too', fq.devManifest(view, 'wbl0', 'cragmaw'));
  const laid = slaySovereign(fq);
  check('E2 THE SPOILS LAW: a sovereign felled on sealed ground mints NOTHING',
    laid === 0 && W.drops.length === n0, `${laid} drop(s)`);

  // THE CONTROL: identical kill, identical table, unsealed ground — the seal
  // is what refused, not a broken rig.
  w.loadZone('probe_wbloot_open');
  const fc = mkField([QA_TABLE]);
  fc.devManifest(view, 'wbl0', 'cragmaw');
  check('E3 THE CONTROL: the same kill on open ground still pays in full',
    slaySovereign(fc) === 3);
}

DROP_CFG.killItemChance = saved.item;
DROP_CFG.killGemChance = saved.gem;
DROP_CFG.vestigeChance = saved.vest;

console.log(fails ? `\nprobe_worldbossloot: ${fails} FAILURE(S)` : '\nprobe_worldbossloot: ALL PASS');
process.exit(fails ? 1 : 0);
