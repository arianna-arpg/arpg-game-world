// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE LAIR FABRIC end to end on the real engine
// (docs/engine/lairs.md): the registry weave (every lair's landmark, mouth
// rule, sidezone, den tileset, natives, hoard and look resolve), THE SEAT
// FOLD's pure law (biome × cave-depth strata × level × chance — "yetis only
// in the first and second caves under the mountains" held by assertion),
// placement through the standing landmark machinery (the mouth stands, the
// spoor dresses the apron, mustReach joins the net, the noDeeper strip
// eats stray doors), den-mint purity (same mouth, same den — byte-equal),
// and the LIVE laws: the Frostmaw round trip (boss ask, larder fauna, the
// Rimefather falls → the objective banks), the yeti's snatch-and-hurl
// through the grab fabric, the cairn giant's visible sleeping ambush, and
// the vault's riddle (puzzle ask, dormant latched-once sphinx warden).
// Run: npx tsx balance/probe_lairs.ts
// ---------------------------------------------------------------------------

import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/massifs';
import '../src/data/compositions';
import '../src/data/lairs';

import { Rng } from '../src/core/rng';
import { vec, type Vec2 } from '../src/core/math';
import {
  doodadRuleOf, generateLayout, hasLandmark, isSidezoneEntranceKind, landmarkDefs,
  type GenCtx, type GeneratedLayout,
} from '../src/engine/levelgen';
import { carveMassifs, massKindOf, tenantKindIds, type MassPoolRow, type TenantRow } from '../src/engine/massif';
import { GridWalkField } from '../src/world/gridWalk';
import { LAIR_CFG, lairLandmarkRolls, lairOf, lairRows } from '../src/engine/lairs';
import { reserveFrac } from '../src/engine/reserves';
import { BIOMES } from '../src/world/biomes';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { LOOT_TABLES } from '../src/data/loottables';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { sidezoneOf } from '../src/data/sidezones';
import { isDormant, updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { skyOf, type ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const LAIR_IDS = [
  'frostmaw', 'giants_cairn', 'hag_hovel', 'riddle_vault',
  // Wave two — lairs of many laws.
  'bull_maze', 'wyrm_barrow', 'spinney', 'wellspring',
];
const MOUTHS = [
  'frostmaw_maw', 'hovel_door', 'sphinx_gate',
  'maze_gate', 'wyrm_barrow_mouth', 'spinney_bole',
  // Wave six — the ring-tenant lane's default den door (same kit contract).
  'scorpion_well',
];
const NATIVES = [
  'yeti', 'yeti_alpha', 'hill_giant', 'mire_hag', 'vault_sphinx',
  'maze_bull', 'emberwyrm', 'spinney_matron', 'spinney_broodling', 'river_naiad',
];

// --- RIG A: the registry weave --------------------------------------------------
{
  for (const id of LAIR_IDS) {
    const row = lairOf(id);
    check(`A1 lair '${id}' registered with a real landmark`,
      !!row && hasLandmark(row.landmark));
    const badB = row ? row.seat.biomes.filter(b => !BIOMES[b]) : ['<unregistered>'];
    check(`A2 '${id}' seat biomes resolve`, badB.length === 0, badB.join(','));
    check(`A3 '${id}' chance sane`, !!row && row.seat.chance > 0 && row.seat.chance <= 1);
  }
  check('A4 the fold sees every row', lairRows().length >= LAIR_IDS.length);
  for (const m of MOUTHS) {
    check(`A5 mouth '${m}' — sidezone + trigger rule + visual + entrance kind`,
      !!sidezoneOf(m) && doodadRuleOf(m).overlap === 'trigger'
      && !!DOODAD_VISUALS[m] && isSidezoneEntranceKind(m));
  }
  for (const id of NATIVES) {
    const d = MONSTERS[id];
    check(`A6 native '${id}' authored`, !!d);
    const badS = d ? d.skills.filter(s => !SKILLS[s]) : ['<none>'];
    check(`A7 '${id}' kit resolves`, badS.length === 0, badS.join(','));
    const look = d?.look ? LOOKS[d.look] : undefined;
    const badP = look ? [...look.parts, ...(look.live ?? [])].filter(p => !PART_PAINTERS[p.kind]).map(p => p.kind) : ['<no look>'];
    check(`A8 '${id}' look parts paint`, !!look && badP.length === 0, badP.join(','));
  }
  check('A9 the hoard table stands', !!LOOT_TABLES.lair_hoard);
  for (const id of ['yeti_alpha', 'hill_giant', 'mire_hag', 'vault_sphinx']) {
    check(`A10 '${id}' pays the lair hoard`, MONSTERS[id]?.loot === 'lair_hoard');
  }
  check('A11 alphas wear the boss law (rimefather + hag seal arenas)',
    MONSTERS.yeti_alpha?.boss === true && MONSTERS.mire_hag?.boss === true);
  check('A12 the giant is a marquee elite, never a boss classification',
    MONSTERS.hill_giant?.bossBar === true && !MONSTERS.hill_giant?.boss);
  check('A13 the warden tag is dormant + latched-once',
    isDormant({ tag: 'vault_warden' } as Actor)
    && !isDormant({ tag: 'vault_warden', aiAwakened: true } as Actor));
  for (const t of ['frostmaw_hollow', 'hag_hollow', 'riddle_vault']) {
    const ts = TILESETS[t];
    check(`A14 den tileset '${t}' — sealed off the frontier, perf-probed, sheltered`,
      !!ts && ts.frontier === false && ts.perfProbe === true && ts.sky === 'sheltered');
    const badPk = ts ? ts.packs.table.filter(r => !MONSTERS[r.id]).map(r => r.id) : ['<none>'];
    check(`A15 '${t}' pack table resolves`, badPk.length === 0, badPk.join(','));
  }
  check('A16 the vault carries a riddle repertoire (puzzle rows)',
    (TILESETS.riddle_vault?.puzzles?.length ?? 0) >= 2);
}

// --- RIG B: the seat fold's pure law --------------------------------------------
{
  const at = (place: 'cave' | 'surface', biome: string, caveDepth: number | undefined,
    level: number, extra?: { noDeeper?: boolean; port?: boolean }) =>
    lairLandmarkRolls({ place, biome, caveDepth, level, tileset: 'cavern', ...extra });
  const has = (rolls: { landmark: string }[], lm: string) => rolls.some(r => r.landmark === lm);
  const chanceOf = (rolls: { landmark: string; chance: number }[], lm: string) =>
    rolls.find(r => r.landmark === lm)?.chance ?? 0;

  const d1 = at('cave', 'highland', 1, 20);
  const d2 = at('cave', 'highland', 2, 20);
  const d3 = at('cave', 'highland', 3, 20);
  const d4 = at('cave', 'highland', 4, 20);
  check('B1 the frostmaw claims highland caves at depth 1–2 (full weight)',
    has(d1, 'frostmaw_lair_mouth') && has(d2, 'frostmaw_lair_mouth')
    && Math.abs(chanceOf(d1, 'frostmaw_lair_mouth') - chanceOf(d2, 'frostmaw_lair_mouth')) < 1e-9);
  check('B2 depth 3 thins on the fadeOut, depth 4 refuses outright',
    chanceOf(d3, 'frostmaw_lair_mouth') > 0
    && chanceOf(d3, 'frostmaw_lair_mouth') < chanceOf(d1, 'frostmaw_lair_mouth')
    && !has(d4, 'frostmaw_lair_mouth'));
  check('B3 the highland SURFACE holds no maw (place: cave)',
    !has(at('surface', 'highland', undefined, 20), 'frostmaw_lair_mouth'));
  check('B4 a green world refuses the deep hunger (level gate)',
    !has(at('cave', 'highland', 1, 1), 'frostmaw_lair_mouth'));
  check('B5 the giant claims the high surface, never the ladder',
    has(at('surface', 'highland', undefined, 20), 'giants_cairn')
    && has(at('surface', 'downs', undefined, 20), 'giants_cairn')
    && !has(at('cave', 'highland', 1, 20), 'giants_cairn'));
  check('B6 the hag keeps to the true marsh',
    has(at('surface', 'marsh', undefined, 20), 'hag_hovel')
    && !has(at('surface', 'grave', undefined, 20), 'hag_hovel')
    && !has(at('surface', 'downs', undefined, 20), 'hag_hovel'));
  check('B7 the vault stands on the erg AND inside its first caves (place: both)',
    has(at('surface', 'desert', undefined, 20), 'riddle_vault_gate')
    && has(at('cave', 'desert', 1, 20), 'riddle_vault_gate')
    && !has(at('cave', 'desert', 4, 20), 'riddle_vault_gate'));
  check('B8 wrong country, no claim (jungle offers nothing)',
    at('cave', 'jungle', 1, 20).length === 0 && at('surface', 'jungle', undefined, 20).length === 0);
  check('B9 sealed pockets grow no lairs; harbors keep no monsters\' doors',
    at('cave', 'highland', 1, 20, { noDeeper: true }).length === 0
    && at('surface', 'desert', undefined, 20, { port: true }).length === 0);
  check('B10 the fold is pure (two reads, one truth)',
    JSON.stringify(d1) === JSON.stringify(at('cave', 'highland', 1, 20)));
  // Level 2 sits at the fadeIn's hard zero; level 3 is a third of the way up
  // the ramp (thinner than full); level 2.02 scales to ~0.0023 — under the
  // minChance floor, so the row is DROPPED, never baked as a ghost draw.
  check('B11 the fadeIn thins and scaled ghosts drop below the floor (minChance law)',
    LAIR_CFG.minChance > 0
    && !has(at('cave', 'highland', 1, 2), 'frostmaw_lair_mouth')
    && chanceOf(at('cave', 'highland', 1, 3), 'frostmaw_lair_mouth') > 0
    && chanceOf(at('cave', 'highland', 1, 3), 'frostmaw_lair_mouth')
      < chanceOf(d1, 'frostmaw_lair_mouth')
    && !has(at('cave', 'highland', 1, 2.02), 'frostmaw_lair_mouth'));
}

// --- RIG C: placement through the standing machinery ----------------------------
const ARENA = { w: 1700, h: 1300 };
const gen = (def: ZoneDef, seed: number): GeneratedLayout => {
  const entry = vec(140, ARENA.h / 2);
  const exits: Vec2[] = [vec(ARENA.w - 140, ARENA.h / 2)];
  return generateLayout({ ...def, seed }, ARENA, new Rng(seed), entry, exits);
};
const caveDef = (over: Partial<ZoneDef>): ZoneDef => ({
  id: 'probe_lair_cave', name: 'Probe Cave', level: 12,
  size: { w: ARENA.w, h: ARENA.h },
  theme: { ...TILESETS.cavern.theme },
  layout: [
    { kind: 'rocks', count: [2, 4], radius: [16, 28] },
  ],
  objective: { kind: 'none' },
  packs: TILESETS.cavern.packs,
  exits: [{ to: 'probe_home', side: 's' }],
  map: { x: 0, y: 0 },
  seed: 0,
  caveDepth: 1, anchor: 'highland',
  ...over,
});
{
  const withMaw = caveDef({ landmarks: [{ landmark: 'frostmaw_lair_mouth', chance: 1 }] });
  const out = gen(withMaw, 90210);
  const maws = out.doodads.filter(d => d.kind === 'frostmaw_maw');
  check('C1 the maw stands (one mouth, chance-1 roll through the landmark loop)',
    maws.length === 1, `${maws.length} maws`);
  const spoor = out.doodads.filter(d => (d.kind === 'bone_pile' || d.kind === 'bone' || d.kind === 'rock')
    && maws[0] && Math.hypot(d.pos.x - maws[0].pos.x, d.pos.y - maws[0].pos.y) < 160);
  check('C2 the spoor ring dresses the apron (the den reads before the door)',
    spoor.length >= 3, `${spoor.length} pieces`);
  const again = gen(withMaw, 90210);
  const print = (o: GeneratedLayout) => o.doodads.map(d =>
    `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).join('|');
  check('C3 same seed, same den door (placement determinism)', print(out) === print(again));

  const sealed = gen(caveDef({
    landmarks: [{ landmark: 'frostmaw_lair_mouth', chance: 1 }], noDeeper: true,
  }), 90210);
  check('C4 a sealed pocket strips the stray door (the noDeeper chokepoint)',
    sealed.doodads.every(d => d.kind !== 'frostmaw_maw'));

  const cairn = gen(caveDef({
    landmarks: [{ landmark: 'giants_cairn', chance: 1 }], caveDepth: undefined, anchor: undefined,
  }), 41100);
  check('C5 the cairn furnishes its own floor (cookfire in the ring — pit inner rows)',
    cairn.doodads.some(d => d.kind === 'campfire'));
  const giantSpawn = (cairn.landmarkSpawns ?? []).filter(s => s.id === 'hill_giant');
  check('C6 the giant sleeps in the ring, ambush-armed and VISIBLE',
    giantSpawn.length === 1 && giantSpawn[0].ambush?.visible === true
    && (giantSpawn[0].ambush?.pack ?? 0) > 0);
}

// --- RIG D: the live dens (sim world) -------------------------------------------
bootSimEngine();
seedGlobalRandom(0x1a17);
const world = makeSimWorld('warrior', 771001);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;
const homeId: string = w.zone.id;
const leaveToHome = (): void => {
  w.loadZone(homeId);
  w.caveReturn = null;
  w.caveStack = [];
};
const step = (secs: number): void => {
  const dt = 1 / 30;
  for (let t = 0; t < secs; t += dt) {
    for (const a of w.actors) updateAI(a, world, dt);
    w.update(dt);
  }
};

// D-I: the Frostmaw round trip.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 91101, kind: 'frostmaw_maw' });
  check('D1 the maw mints the Frostmaw (id + name + one rung down)',
    w.zone.id === `cave_frostmaw_maw_${homeId}_91101`
    && String(w.zone.name).includes('Frostmaw') && w.zone.caveDepth >= 1,
    `${w.zone.id} · ${w.zone.name}`);
  check('D2 the den is the bottom (noDeeper) and asks for the Rimefather (boss)',
    w.zone.noDeeper === true && w.zone.objective.kind === 'boss'
    && w.zone.objective.id === 'yeti_alpha');
  const alpha = (w.actors as Actor[]).find(a => a.defId === 'yeti_alpha');
  check('D3 the Rimefather holds the bottom of the cold', !!alpha);
  const pack = (w.actors as Actor[]).filter(a => a.defId === 'yeti');
  check('D4 the den fields its pack', pack.length >= 1, `${pack.length} yetis`);
  const hares = (w.actors as Actor[]).filter(a => a.defId === 'snow_hare');
  check('D5 the larder is stocked (snow hares, the mint-authored pantry)',
    hares.length >= 1, `${hares.length} hares`);
  if (alpha) {
    w.kill(alpha, false, w.player);
    step(0.2);
    check('D6 the Rimefather falls → the ask completes (objectiveDone)',
      w.objectiveDone === true);
  }
  leaveToHome();
}

// D-II: the yeti's snatch-and-hurl (the grab fabric worn as identity).
{
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  // The rig hangs on ONE swing landing — floor the hero's evasion so the
  // roll can never whiff it (the single-roll time-bomb law).
  p.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
  const yeti = w.createMonster('yeti', 8, 'enemy') as Actor;
  w.actors.push(yeti);
  yeti.pos = vec(p.pos.x + 50, p.pos.y);
  const snatch = yeti.skills.find((s: any) => s?.def.id === 'yeti_snatch');
  const hurl = yeti.skills.find((s: any) => s?.def.id === 'yeti_hurl');
  check('D7 the kit carries the pair', !!snatch && !!hurl);
  check('D8 empty-handed hurl refuses (the holding gate)',
    !w.useSkill(yeti, hurl, vec(p.pos.x, p.pos.y)));
  const seized = w.useSkill(yeti, snatch, vec(p.pos.x, p.pos.y));
  step(0.7);
  check('D9 the snatch closes the hand (heldBy pairs, the seat slaves)',
    seized && p.heldBy === yeti.id, `heldBy ${String(p.heldBy)}`);
  const before = { x: p.pos.x, y: p.pos.y };
  const threw = w.useSkill(yeti, hurl, vec(p.pos.x + 400, p.pos.y));
  step(0.6);
  const flew = Math.hypot(p.pos.x - before.x, p.pos.y - before.y);
  check('D10 the hurl spends the catch (released, at speed)',
    threw && p.heldBy === undefined && flew > 60, `flew ${flew.toFixed(0)}px`);
  p.sheet.setSource('probe', []);
  yeti.dead = true;
  step(0.1);
}

// D-III: the vault of the asking.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 32032, kind: 'sphinx_gate' });
  check('D11 the gate mints the Vault (puzzle ask, no body count)',
    w.zone.id === `cave_sphinx_gate_${homeId}_32032`
    && w.zone.objective.kind === 'puzzle' && w.zone.noDeeper === true,
    `${w.zone.id} · objective ${w.zone.objective.kind}`);
  check('D12 the riddle stood up (a live puzzle run in the zone)',
    Array.isArray(w.puzzles) && w.puzzles.length >= 1, `${w.puzzles?.length ?? 0} puzzles`);
  const sphinx = (w.actors as Actor[]).find(a => a.defId === 'vault_sphinx');
  check('D13 the warden is home (authored tenancy, chance 1)', !!sphinx);
  if (sphinx) {
    check('D14 she is STATUARY until struck (dormant warden law)',
      isDormant(sphinx) && sphinx.tag === 'vault_warden');
    w.rouseOnWound(sphinx);
    check('D15 violence is a choice with a price (roused, latched-once)',
      sphinx.aiAwakened === true && isDormant(sphinx) === false);
  }
  leaveToHome();
}

// D-IV: the hag's hollow answers its door.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 55055, kind: 'hovel_door' });
  check('D16 the hovel door minted the Hollow (boss ask: the hag)',
    w.zone.objective.kind === 'boss' && w.zone.objective.id === 'mire_hag'
    && String(w.zone.name).includes('Hollow'));
  const hag = (w.actors as Actor[]).find(a => a.defId === 'mire_hag');
  check('D17 the crone is home', !!hag);
  leaveToHome();
}

// --- RIG E: den-mint purity (same mouth, same den — forever) --------------------
{
  const sz = sidezoneOf('frostmaw_maw')!;
  const ctx = {
    parent: w.zoneMap[homeId] as ZoneDef, seed: 424242, id: 'probe_det_den',
    pos: { x: 100, y: 100 }, playerLevel: 10, pkgActive: () => false,
  };
  const a = sz.mint(ctx);
  const b = sz.mint(ctx);
  check('E1 the mint is pure (byte-equal defs)', JSON.stringify(a) === JSON.stringify(b));
  check('E2 the den carries its own pantry rows (authored fauna)',
    Array.isArray(a.fauna) && a.fauna.some(f => f.id === 'snow_hare'));
}

// --- RIG F: wave two — the laws each lair wears (pure) ---------------------------
{
  // The courses seat axis: the wellspring stands ONLY on the traced rivers,
  // in any of its listed countries — and nowhere off them.
  const at = (biome: string, course?: string) =>
    lairLandmarkRolls({ place: 'surface', biome, level: 20, tileset: 'meadow', course });
  const hasSpring = (rolls: { landmark: string }[]) => rolls.some(r => r.landmark === 'naiad_spring');
  check('F1 the wellspring keeps to the rivers (courses axis)',
    !hasSpring(at('forest')) && hasSpring(at('forest', 'rivers'))
    && hasSpring(at('karst', 'rivers')) && !hasSpring(at('jungle', 'rivers')));
  check('F2 course rows never leak onto courseless lairs (ordinary ground law)',
    at('forest', 'rivers').some(r => r.landmark === 'spinney_bole_site'));
  // The bull is a TRACKER: scent watch + a drawn read (validateWatch's law).
  const bull = MONSTERS.maze_bull;
  check('F3 the bull hunts by SCENT and tells it',
    !!bull.watch?.scent && (bull.watch.scent.range ?? 0) > 0
    && (bull.tells ?? []).some(t => t.source === 'watch'));
  // The wyrm: both fire verbs PRICED from one pool, the gutter staged, the
  // sleep posture worn, the body a true worm.
  const wyrm = MONSTERS.emberwyrm;
  const res = wyrm.reserves?.[0];
  check('F4 the ember prices BOTH fire verbs and stages the gutter',
    !!res && res.costs?.ember_breath === 1 && res.costs?.immolation_rush === 1
    && (res.stages ?? []).some(s => s.status === 'guttered')
    && wyrm.watch?.sleep !== undefined && !!wyrm.worm);
  check('F5 the wyrm READS its fuel (reserve-sourced tells — the honesty law)',
    (wyrm.tells ?? []).some(t => t.source === 'reserve:ember'));
  // The matron: a pooled colony + a styled bond over her court; the
  // broodling is a true lite body (one ply, pooled bite).
  const matron = MONSTERS.spinney_matron;
  check('F6 the matron anchors a colony and ropes her court',
    matron.colony?.monsterId === 'spinney_broodling'
    && matron.bond?.kin === 'orb_weaver' && !!matron.bond?.link);
  const brood = MONSTERS.spinney_broodling;
  check('F7 the broodling is swarm-substrate (lite + 1 ply)',
    !!brood.lite && brood.plies?.count === 1);
  // The naiad: rooted on WATER with a drawn wilt (the ground axis + the
  // thrive/wilt read — the tell layer never implies an unpaid penalty).
  const naiad = MONSTERS.river_naiad;
  check('F8 the naiad claims the water and wilts off it, drawn both ways',
    (naiad.rooted?.ground ?? []).includes('water') && !!naiad.rooted?.off
    && (naiad.tells ?? []).filter(t => t.source === 'rooted').length >= 2);
}

// --- RIG G: wave two live (sim world) --------------------------------------------
// G-I: the Maze — labyrinth-only country, the bull's ask, the scent line.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 61061, kind: 'maze_gate' });
  check('G1 the gate mints the Maze (labyrinth-only, the bull\'s ask)',
    w.zone.layoutType === 'labyrinth' && w.zone.objective.kind === 'boss'
    && w.zone.objective.id === 'maze_bull' && w.zone.noDeeper === true,
    `${w.zone.layoutType}`);
  const bull = (w.actors as Actor[]).find(a => a.defId === 'maze_bull');
  check('G2 the bull holds the maze', !!bull);
  // The scent law's substrate: a standing scent-watcher makes the player
  // PRINT a trail as they move (probe_watchers owns the full hunt; this
  // pins the lair's half — his presence turns the floor into a record).
  const p = w.player;
  for (let i = 0; i < 20; i++) { p.pos = vec(p.pos.x + 14, p.pos.y); step(0.1); }
  check('G3 the floor remembers you (trail printed under a scent-watcher)',
    Array.isArray(p.trail) && p.trail.length >= 1, `${p.trail?.length ?? 0} prints`);
  leaveToHome();
}
// G-II: the Barrow — the hoard floor, the sleeper, and the ember's arithmetic.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 72072, kind: 'wyrm_barrow_mouth' });
  const wyrm = (w.actors as Actor[]).find(a => a.defId === 'emberwyrm');
  const caches = (w.actors as Actor[]).filter(a => a.defId === 'gem_cache');
  check('G4 the barrow holds the sleeper and the hoard it sleeps on',
    !!wyrm && caches.length >= 3, `${caches.length} caches`);
  if (wyrm) {
    const st = wyrm.reserves?.get('ember');
    check('G5 the ember banks full at the coil', !!st && reserveFrac(st) === 1);
    // Spend the pool dry through the REAL cast gate: five breaths pay five
    // ember; the sixth REFUSES (costs refuse, they never debt) while the
    // claw — unpriced — still answers. BRAINS FROZEN for the arithmetic
    // (w.update alone): the probe's presses must be the only spender, and
    // an un-aggroed wyrm burns no ambient drain — pure cost math.
    const tickOnly = (secs: number): void => {
      const dt = 1 / 30;
      for (let t = 0; t < secs; t += dt) w.update(dt);
    };
    const breath = wyrm.skills.find((s: any) => s?.def.id === 'ember_breath');
    const clawI = wyrm.skills.find((s: any) => s?.def.id === 'claw');
    wyrm.pos = vec(w.player.pos.x + 80, w.player.pos.y);
    let paid = 0;
    for (let i = 0; i < 7; i++) {
      wyrm.cooldowns.clear(); wyrm.mana = wyrm.maxMana();
      if (w.useSkill(wyrm, breath, vec(w.player.pos.x, w.player.pos.y))) paid++;
      // Let the 0.9s cast AND its recovery tail finish (a busy-body press
      // refuses for the wrong reason) while staying inside the 4s regen
      // delay per spend — 2.0s clears both windows.
      tickOnly(2.0);
    }
    const stAfter = wyrm.reserves?.get('ember');
    // paid === 5 IS the refusal proof (presses 6-7 bounced off canUse).
    // The residue read loosens past 0.05 deliberately: the calm regen's
    // delay expires DURING the refused presses and the furnace begins to
    // re-kindle — which is the recovery law working, not a leak.
    check('G6 five breaths drain the pool; the dry furnace REFUSES the sixth',
      paid === 5 && !!stAfter && reserveFrac(stAfter) < 0.25, `paid ${paid}`);
    wyrm.cooldowns.clear(); wyrm.mana = wyrm.maxMana();
    check('G7 claw is what remains of it (unpriced verbs never gate)',
      w.useSkill(wyrm, clawI, vec(w.player.pos.x, w.player.pos.y)));
  }
  leaveToHome();
}
// G-III: the Spinney — the roped court.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 83083, kind: 'spinney_bole' });
  const matron = (w.actors as Actor[]).find(a => a.defId === 'spinney_matron');
  const weavers = (w.actors as Actor[]).filter(a => a.defId === 'orb_weaver');
  check('G8 the matron holds the loom with a court to rope', !!matron && weavers.length >= 1,
    `${weavers.length} weavers`);
  if (matron && weavers[0]) {
    // The bond is worn BENEFICIARY-side: the MATRON reads held while a
    // weaver stands in reach, and the drawn rope runs to that weaver —
    // cut the court out from under her is the kill order.
    weavers[0].pos = vec(matron.pos.x + 60, matron.pos.y);
    step(1.2);
    check('G9 the silk rope is REAL (the matron hangs on her court)',
      matron.bondHeld === true && (matron.bondFrom as Actor | undefined)?.id === weavers[0].id);
    // Cut the court: the rope falls and so does her favor (edge-triggered).
    for (const v of weavers) v.dead = true;
    step(1.2);
    check('G10a the cut is REAL (bond broken when the court dies)',
      matron.bondHeld === false);
  }
  leaveToHome();
}
// G-IV: the Wellspring — rooted in her water, wilted off it, home again.
{
  const springDef = caveDef({
    id: 'probe_spring_zone',
    landmarks: [{ landmark: 'naiad_spring', chance: 1 }],
    caveDepth: undefined, anchor: undefined,
    exits: [{ to: homeId, side: 's' }],
  });
  w.caveMap[springDef.id] = springDef;
  w.loadZone(springDef.id);
  step(0.5);
  const naiad = (w.actors as Actor[]).find(a => a.defId === 'river_naiad');
  // THE LIQUID SEAT asserted, not just assumed: this check's LABEL always said
  // "IN the pool" while the assertion only demanded she EXIST, so a seat on the
  // dry shore read green here and G11 below carried the whole claim — passing on
  // whichever half of a 30-in/30-out coin flip the layout landed on. Her stand
  // is the precondition; test it where it is named.
  const inPool = (a: Actor): boolean =>
    (w.doodads as { kind: string; pos: Vec2; radius: number }[]).some(d =>
      d.kind === 'water' && Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= d.radius);
  check('G10 the spring spawns its naiad IN the pool (the liquid seat, not the shore)',
    !!naiad && inPool(naiad),
    naiad ? `ground=${naiad.groundKind ?? 'dry stone'}` : 'no naiad');
  if (naiad) {
    step(0.8);
    check('G11 in her water she is ROOTED (the claim held from frame one)',
      naiad.rootedHeld === true);
    // Haul her onto dry stone: past the grace the claim DROPS...
    naiad.pos = vec(120, 120);
    step(1.2);
    check('G12 torn from the water the wilt is REAL (grace-timed drop)',
      naiad.rootedHeld === false);
    // ...and the spring takes her back the frame she touches it.
    const pool = (w.doodads as { kind: string; pos: { x: number; y: number } }[])
      .find(d => d.kind === 'water');
    if (pool) {
      naiad.pos = vec(pool.pos.x, pool.pos.y);
      step(0.3);
      check('G13 stepping home re-roots without a grace (the one-way debounce)',
        naiad.rootedHeld === true);
    }
  }
  leaveToHome();
}

// --- RIG H: wave three — THE LADDER (interior + climate axes, the roost) ---------
{
  const at = (level: number, biomeDepth?: number, elevation?: number) =>
    lairLandmarkRolls({
      place: 'surface', biome: 'highland', level, tileset: 'snowcrown',
      biomeDepth, ...(elevation !== undefined ? { climate: { elevation } } : {}),
    });
  const has = (rolls: { landmark: string }[], lm: string) => rolls.some(r => r.landmark === lm);
  check('H1 the roost claims ONLY the deep high heart (interior + climate bands)',
    has(at(20, 0.7, 0.8), 'roost_crag_site')
    && !has(at(20, 0.2, 0.8), 'roost_crag_site')     // country's edge refuses
    && !has(at(20, 0.7, 0.3), 'roost_crag_site')     // low ground refuses
    && !has(at(20, undefined, 0.8), 'roost_crag_site')  // unreadable depth refuses
    && !has(at(20, 0.7), 'roost_crag_site'));        // unreadable climate refuses
  check('H2 a green world never meets the dragon (the level rung is hard)',
    !has(at(6, 0.7, 0.8), 'roost_crag_site') && !has(at(11, 0.7, 0.8), 'roost_crag_site'));
  // THE LADDER READS: the same country offers DIFFERENT natives by rung —
  // border level 6 = the cairn alone; deep high 20 = cairn AND roost.
  const low = at(6, 0.2, 0.4), deep = at(20, 0.7, 0.8);
  check('H3 the ladder is real (rungs differ within one biome)',
    has(low, 'giants_cairn') && !has(low, 'roost_crag_site')
    && has(deep, 'giants_cairn') && has(deep, 'roost_crag_site'));
  // Axis-less rows never mind the new axes (ordinary ground law): the cairn
  // seats with or without geo readings.
  check('H4 axis-less lairs ignore the new axes (no retroactive gating)',
    has(lairLandmarkRolls({ place: 'surface', biome: 'highland', level: 20, tileset: 'snowcrown' }), 'giants_cairn'));
  // Registry: the dragon's wings are a REAL part whose break silences
  // exactly the wing verbs (both in the root's own kit).
  const drake = MONSTERS.roost_dragon;
  const wings = drake.parts?.[0];
  check('H5 the wings are a true part and the grounding is authored',
    wings?.monster === 'drake_wingspan' && !!MONSTERS.drake_wingspan
    && (wings.breakDisables ?? []).every(s => drake.skills.includes(s))
    && (wings.breakDisables ?? []).includes('crushing_leap'));
}
// H-live: the roost round trip — open sky, the hoard, the grounding law.
{
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 94094, kind: 'roost_crag' });
  step(0.5); // parts lazy-attach on the root's first update tick
  const skyRead = skyOf(w.zone);
  check('H6 the roost stands under OPEN SKY (explicit def sky beats caveDepth)',
    skyRead === 'open', String(skyRead));
  const drake = (w.actors as Actor[]).find(a => a.defId === 'roost_dragon');
  const wings = (w.actors as Actor[]).find(a => a.defId === 'drake_wingspan');
  const hoard = (w.actors as Actor[]).filter(a => a.defId === 'gem_cache').length;
  check('H7 Old Scald holds the shelf, wings attached, hoard underfoot',
    !!drake && !!wings && hoard >= 5, `hoard ${hoard}, wings ${String(!!wings)}`);
  if (drake && wings) {
    const tickOnly = (secs: number): void => {
      const dt = 1 / 30;
      for (let t = 0; t < secs; t += dt) w.update(dt);
    };
    const leap = drake.skills.find((s: any) => s?.def.id === 'crushing_leap');
    drake.cooldowns.clear(); drake.mana = drake.maxMana();
    check('H8 with wings, the sky is his (leap fires)',
      w.useSkill(drake, leap, vec(drake.pos.x + 200, drake.pos.y)));
    tickOnly(2.0);
    // BREAK THE WINGS: the part dies, both wing verbs fall silent, the
    // breath — no part's hostage — still answers.
    w.kill(wings, false, w.player);
    tickOnly(0.5);
    // The break-disable REMOVES the silenced instances from the bar — a
    // vanished verb IS the refusal (re-find, and absent = grounded).
    drake.cooldowns.clear(); drake.mana = drake.maxMana();
    const leapNow = drake.skills.find((s: any) => s?.def.id === 'crushing_leap');
    const leapAfter = leapNow ? w.useSkill(drake, leapNow, vec(drake.pos.x + 200, drake.pos.y)) : false;
    const gustNow = drake.skills.find((s: any) => s?.def.id === 'gust_burst');
    drake.cooldowns.clear(); drake.mana = drake.maxMana();
    const gustAfter = gustNow ? w.useSkill(drake, gustNow, vec(drake.pos.x, drake.pos.y)) : false;
    check('H9 GROUNDED: both wing verbs die with the wings', !leapAfter && !gustAfter);
    const breath = drake.skills.find((s: any) => s?.def.id === 'ember_breath');
    drake.cooldowns.clear(); drake.mana = drake.maxMana();
    tickOnly(1.5);
    check('H10 the furnace still answers (breath is no part\'s hostage)',
      w.useSkill(drake, breath, vec(drake.pos.x + 100, drake.pos.y)));
  }
  leaveToHome();
}

// --- RIG I: wave four — the trench (the segment fabric at full reach) ------------
{
  const lev = MONSTERS.trench_leviathan;
  check('I1 the Fathomking is a TRUE worm (hittable, wounded, dressed by class)',
    lev.worm?.hittable === true && !!lev.worm?.wounds
    && !!LOOKS[lev.worm?.looks?.body ?? ''] && !!LOOKS[lev.worm?.looks?.tail ?? '']
    && !!LOOKS[lev.worm?.looks?.every?.look ?? '']);
  check('I2 the trench claims only the deep sea\'s HEART (interior axis)',
    lairLandmarkRolls({ place: 'surface', biome: 'deepsea', level: 20, tileset: 'deepsea', biomeDepth: 0.8 })
      .some(r => r.landmark === 'trench_maw_site')
    && !lairLandmarkRolls({ place: 'surface', biome: 'deepsea', level: 20, tileset: 'deepsea', biomeDepth: 0.3 })
      .some(r => r.landmark === 'trench_maw_site'));
  w.player.pos = vec(400, 400);
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 51051, kind: 'trench_maw' });
  step(0.5);
  const levA = (w.actors as Actor[]).find(a => a.defId === 'trench_leviathan');
  check('I3 the coil owns the bottom (leviathan home, boss ask)',
    !!levA && w.zone.objective.kind === 'boss' && w.zone.objective.id === 'trench_leviathan');
  // The coils unspool as the body MOVES (the anatomy rig's idiom) — but a
  // winding trench pins straight marches against walls, so wander the head
  // through clampPos and read the RUNNING max the payout reaches.
  let segMax = 0;
  if (levA) {
    step(2);
    for (let i = 0; i < 240; i++) {
      const dx = (i % 60 < 30 ? 9 : -9), dy = ((i % 120) < 60 ? 5 : -5);
      levA.pos = w.clampPos(vec(levA.pos.x + dx, levA.pos.y + dy), levA.radius);
      w.update(1 / 60);
      segMax = Math.max(segMax, (levA as any).worm?.segments?.length ?? 0);
    }
  }
  check('I4 the coils unspool REAL behind the skull', segMax >= 10, `${segMax} segments at peak`);
  leaveToHome();
}

// --- RIG J: wave four — the barrow (the conditioned door + the jar) --------------
{
  // The night-door law through the REAL dwell loop: plant a barrow_door
  // under the player's feet and stand there. At NOON the dwell never
  // carries (and the refusal floats); after DUSK the same stones open.
  const { dayCycle } = await import('../src/world/daynight');
  const phaseAt = (t: number) => dayCycle(t).phase as string;
  // Scan FORWARD from the live clock only: rewinding w.time would strand
  // every cadence sweep (packNextAt etc.) in the future and stall the rig.
  const t0 = Math.ceil(w.time) + 1;
  let noon = -1, night = -1;
  for (let t = t0; t < t0 + 4000 && (noon < 0 || night < 0); t += 5) {
    const p = phaseAt(t);
    if (noon < 0 && p === 'day') noon = t;
    if (night < 0 && p === 'night') night = t;
  }
  // Test the closed door FIRST whatever the wheel offers next (noon may
  // fall after night in wheel order — the door only cares which is which).
  check('J1 the wheel offers both hours to test against', noon >= 0 && night >= 0);
  const sz = sidezoneOf('barrow_door');
  check('J2 the door carries its schedule (when + refusal authored)',
    !!sz?.when && (sz.when.cond.phases ?? []).includes('night') && !!sz.when.refusal);
  w.player.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), w.player.radius);
  w.caveEntrances.push({
    pos: vec(w.player.pos.x, w.player.pos.y),
    seed: 60060, kind: 'barrow_door',
  });
  const homeNow = w.zone.id;
  w.time = noon;
  step(2.0);
  check('J3 at noon the barrow does not answer (the dwell never carries)',
    w.zone.id === homeNow);
  check('J4 the refusal READS (the schedule floats, throttled)',
    w.doorRefusalAt > 0);
  w.time = night;
  // Step in SMALL beats and bail the instant the swap lands — then pull the
  // hero straight off the arrival portal (lingering there ping-pongs the
  // zones and double-mints the halls: the rig's bug, not the door's).
  for (let i = 0; i < 40 && w.zone.id === homeNow; i++) step(0.1);
  if (w.zone.id !== homeNow) {
    w.player.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), w.player.radius);
    step(0.2);
  }
  check('J5 after dark the same stones open (the cond holds, the dwell carries)',
    w.zone.id !== homeNow && String(w.zone.name).includes('Barrow'), w.zone.name);
  // Inside: the king under his hours, held by the jar — the beam is the map.
  const lich = (w.actors as Actor[]).find(a => a.defId === 'barrow_lich');
  const jar = (w.actors as Actor[]).find(a => a.defId === 'kings_phylactery');
  check('J6 the king and his jar both stand', !!lich && !!jar);
  if (lich && jar) {
    step(1.2);
    check('J7 the jar HOLDS him from across the halls (whole-den bond, drawn beam)',
      lich.bondHeld === true && (lich.bondFrom as Actor | undefined)?.id === jar.id);
    check('J8 his hours are HIS (nocturne held at night, honestly unfurled)',
      lich.nocturneHeld === true
      && (MONSTERS.barrow_lich.tells ?? []).some(t => t.source === 'nocturne'));
    // Break EVERY jar standing (the rig owns one; a double-minted hall must
    // not fake a pass or a fail) — the law under test is bond-falls-with-kin.
    for (const j of (w.actors as Actor[]).filter(a => a.defId === 'kings_phylactery' && !a.dead)) {
      w.kill(j, false, w.player);
    }
    step(1.2);
    check('J9 break the jar, break the king (the bond falls with it)',
      lich.bondHeld === false);
  }
  leaveToHome();
}

// --- RIG K: wave five — the drowned wallow (the anatomy gamut, finally seated) ---
// The Marsh Leviathan was the composite framework's own exemplar and had no
// door for years: five hitboxes fully authored, zero ways to meet them. Its
// seat is the fabric's CHEAPEST lane proven end to end — an in-zone landmark
// (no den tileset, no sidezone, no engine work), the wellspring's LIQUID SEAT
// for a dweller that belongs in the water, and a level band argued against the
// shipped ladder rather than inherited from whatever fen it lands in.
{
  const row = lairOf('marsh_leviathan');
  const lm = landmarkDefs().find(d => d.id === 'leviathan_wallow');
  check('K1 the wallow is registered and pours its own pool',
    !!row && hasLandmark(row.landmark) && lm?.builder === 'lake' && lm?.liquid === 'water'
    && lm?.mustReach === true);
  check('K2 the beast IS the landmark, seated IN the water (the naiad\'s word)',
    lm?.spawns?.where === 'liquid'
    && (lm?.spawns?.table ?? []).length === 1
    && lm?.spawns?.table[0].id === 'marsh_leviathan'
    && lm?.spawns?.count[0] === 1 && lm?.spawns?.count[1] === 1);
  check('K3 the exemplar pays the lean repeatable faucet, not the capstone table',
    MONSTERS.marsh_leviathan?.loot === 'lair_hoard' && MONSTERS.marsh_leviathan?.boss === true);
  check('K4 all five hitboxes still resolve (root + head + two claws + tail)',
    (MONSTERS.marsh_leviathan?.parts ?? []).length === 4
    && (MONSTERS.marsh_leviathan?.parts ?? []).every(p => !!MONSTERS[p.monster]));

  const fen = (level: number) =>
    lairLandmarkRolls({ place: 'surface', biome: 'marsh', level, tileset: 'marsh' });
  const has = (rolls: { landmark: string }[], id: string) => rolls.some(r => r.landmark === id);
  check('K5 the fen\'s crown claims the marsh SURFACE at real levels',
    has(fen(20), 'leviathan_wallow'));
  check('K6 the band is DELIBERATE: a green fen never grows one',
    !has(fen(5), 'leviathan_wallow') && !has(fen(10), 'leviathan_wallow'));
  check('K7 the wallow is surface ground only (no wallow in a cave)',
    !lairLandmarkRolls({ place: 'cave', biome: 'marsh', caveDepth: 1, level: 20, tileset: 'marsh' })
      .some(r => r.landmark === 'leviathan_wallow')
    && !has(lairLandmarkRolls({ place: 'surface', biome: 'downs', level: 20, tileset: 'downs' }), 'leviathan_wallow'));
  // THE FEN READS AS A LADDER, exactly like the highland one: the hovel alone
  // at the low end, hovel AND wallow once the country can feed the apex.
  check('K8 one biome, two rungs (the hag below, the leviathan above)',
    has(fen(5), 'hag_hovel') && !has(fen(5), 'leviathan_wallow')
    && has(fen(20), 'hag_hovel') && has(fen(20), 'leviathan_wallow'));

  // Placement through the standing machinery (RIG C's law): chance-1 roll,
  // one beast, and its seat cell inside the DRAWN water — paintLiquid lays
  // its discs from the very mask `where: 'liquid'` samples, so drawn == tested
  // or this fails.
  const wallow = gen(caveDef({
    landmarks: [{ landmark: 'leviathan_wallow', chance: 1 }],
    caveDepth: undefined, anchor: undefined,
  }), 77321);
  const seats = (wallow.landmarkSpawns ?? []).filter(s => s.id === 'marsh_leviathan');
  check('K9 exactly one leviathan stands per wallow', seats.length === 1, `${seats.length} seated`);
  const water = wallow.doodads.filter(d => d.kind === 'water');
  check('K10 the pool is poured and the reeds ring its shore',
    water.length > 0 && wallow.doodads.some(d => d.kind === 'reeds'),
    `${water.length} water pieces`);
  check('K11 THE LIQUID SEAT holds (the seat cell lies inside the drawn water)',
    seats.length === 1
    && water.some(d => Math.hypot(d.pos.x - seats[0].pos.x, d.pos.y - seats[0].pos.y) <= d.radius));
  // Nothing springs here, deliberately: a composite's parts attach as ordinary
  // actors AFTER the spawn, so arming only the root would leave its limbs
  // awake beside a sleeping body.
  check('K12 the wallow arms no ambush (the composite exemption)', !lm?.spawns?.ambush);

  // Live: the seat delivers a WORKING composite — four parts anchored ahead
  // of, beside and behind the hulk in its own facing frame.
  const beast = w.createMonster('marsh_leviathan', 12, 'enemy') as Actor;
  beast.pos = vec(w.arena.w / 2, w.arena.h / 2);
  beast.facing = 0;
  (beast as any).aiCooldown = 99999;
  w.actors.push(beast);
  step(0.3);
  const parts = (beast.partActors ?? []) as Actor[];
  check('K13 the hulk stands with all four limbs attached', parts.length === 4);
  check('K14 the limbs ride the FACING frame (head ahead, tail behind, claws flanking)',
    parts.length === 4
    && parts.some(p => p.defId === 'leviathan_head' && p.pos.x > beast.pos.x + beast.radius * 0.5)
    && parts.some(p => p.defId === 'leviathan_tail' && p.pos.x < beast.pos.x - beast.radius * 0.5)
    && parts.filter(p => p.defId === 'leviathan_claw').length === 2
    && Math.sign(parts.filter(p => p.defId === 'leviathan_claw')[0].pos.y - beast.pos.y)
      !== Math.sign(parts.filter(p => p.defId === 'leviathan_claw')[1].pos.y - beast.pos.y));
  beast.dead = true;
  for (const p of parts) p.dead = true;
}

// --- RIG L: wave six — THE LAIR MOUTH TENANT (the ring that is somebody's door) --
// The massif fabric's ring-tenant lane meets the lair fabric: a court's
// occupancy table names 'lair_mouth' (data/lairs.ts registers the kind) and
// the winning ring grows spoor + a REGISTERED-SIDEZONE mouth on its own
// floor. Pinned: the door stands INSIDE its ring and joins the walk net,
// same seed → same door, a noDeeper zone strips it (the tenant lane inherits
// the chokepoint), THE FORK LAW as parity (a dress-less lair-mouth table
// leaves the layout byte-identical beyond the door itself), THE REPLACEMENT
// LAW (the table silences ruincourt's independent garrison/inner lanes), and
// the LIVE round trip: loadZone ADOPTS the tenant-planted mouth into the
// dwell registry with a position-hash seed stable across reloads, the dwell
// mints the den country (authored name/fauna/noDeeper through mintCave's
// face-rolled lane), and the gateway ledger stamps.
{
  const W2 = 2200, H2 = 1600;
  const lEntry = vec(140, H2 / 2);
  const lExits = [vec(W2 - 140, H2 / 2)];
  const lGen = (def: ZoneDef, seed: number): GeneratedLayout =>
    generateLayout({ ...def, seed }, { w: W2, h: H2 }, new Rng(seed), lEntry, lExits);
  const bareCtx = (seed: number): GenCtx => ({
    rng: new Rng(seed), arena: { w: W2, h: H2 }, entry: lEntry, exits: lExits, seed,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [],
  });
  const L_PARAMS = { massifCoverage: [0.3, 0.34] as [number, number], massifSizeR: [300, 380] as [number, number] };
  const courtDef = (id: string, tenants: TenantRow[], over?: Partial<ZoneDef>): ZoneDef => caveDef({
    id, size: { w: W2, h: H2 }, layout: [], layoutType: 'massif',
    caveDepth: undefined, anchor: undefined, biome: 'desert',
    layoutParams: {
      ...L_PARAMS,
      massifMasses: [{
        kind: 'ruincourt', weight: 1,
        over: { shapes: [{ shape: 'court', weight: 1 }], tenants },
      }],
    },
    ...(over ?? {}),
  });
  const lairTable: TenantRow[] = [{ kind: 'lair_mouth', weight: 1 }];
  const pr = (ds: GeneratedLayout['doodads']): string =>
    ds.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).join('|');

  check('L1 the ring-tenant lane is registered (lair_mouth in the occupancy registry)',
    tenantKindIds().includes('lair_mouth'));

  // The seat sweep: doors stand, inside their rings, on the walk net, with
  // the spoor confessing them — and the carve they stand on matches the
  // bare-ctx carve (the K3 cross-read: same seed, same masses).
  let mouths = 0, courts = 0, inRing = 0, reach = 0, spoored = 0;
  let firstSeed = -1;
  for (let s = 0; s < 6; s++) {
    const seed = 553001 + s * 7919;
    const def = courtDef('probe_lair_mouth_gen', lairTable);
    const out = lGen(def, seed);
    const masses = carveMassifs(bareCtx(seed), { ...def, seed });
    const rings = masses.filter(m => m.interior);
    courts += rings.length;
    const wells = out.doodads.filter(d => d.kind === 'scorpion_well');
    mouths += wells.length;
    for (const d of wells) {
      const home = rings.find(m =>
        Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= m.r * 0.6 * 0.9 + 0.5);
      if (home) inRing++;
      if (out.walk instanceof GridWalkField && out.walk.reachable(lEntry, vec(d.pos.x, d.pos.y))) reach++;
      const spoor = out.doodads.filter(o =>
        (o.kind === 'bone_pile' || o.kind === 'bone' || o.kind === 'scree')
        && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 110);
      if (spoor.length >= 2) spoored++;
    }
    if (wells.length && firstSeed < 0) firstSeed = seed;
  }
  check('L2 the table grows doors and every door stands INSIDE its ring',
    mouths >= 6 && courts >= 8 && inRing === mouths, `${mouths} doors / ${courts} courts`);
  check('L3 every door is on the walk net (mustReach joins the invariant)',
    mouths > 0 && reach === mouths, `${reach}/${mouths} reachable`);
  check('L4 the spoor confesses the door (the den reads before the dwell)',
    mouths > 0 && spoored === mouths, `${spoored}/${mouths} spoored`);
  {
    const a = lGen(courtDef('probe_lair_mouth_gen', lairTable), firstSeed);
    const b = lGen(courtDef('probe_lair_mouth_gen', lairTable), firstSeed);
    check('L5 same seed, same door (the tenant fork is deterministic)',
      pr(a.doodads) === pr(b.doodads));
    const sealed = lGen(courtDef('probe_lair_mouth_gen', lairTable, { noDeeper: true }), firstSeed);
    check('L6 a sealed zone strips the tenant door (the noDeeper chokepoint reaches the lane)',
      sealed.doodads.every(d => d.kind !== 'scorpion_well'));
  }
  // THE FORK LAW as parity: a DRESS-LESS lair-mouth table vs a vacant table —
  // strip the door itself and the layouts are byte-identical (the handler
  // costs the layout stream nothing); THE REPLACEMENT LAW rides the same
  // runs (ruincourt's independent garrison 0.35 + urn inner rows both stand
  // silent under either table).
  {
    const seed = firstSeed ^ 0x5ca1e;
    const bare: TenantRow[] = [{ kind: 'lair_mouth', weight: 1, params: { dress: [] } }];
    const vac: TenantRow[] = [{ kind: 'vacant', weight: 1 }];
    const a = lGen(courtDef('probe_lair_mouth_par', bare), seed);
    const b = lGen(courtDef('probe_lair_mouth_par', vac), seed);
    const ka = a.walk instanceof GridWalkField ? a.walk.pack().kbits : 'a';
    const kb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : 'b';
    check('L7 absent == identical (strip the door: doodads, grid and POIs all match the vacant run)',
      pr(a.doodads.filter(d => d.kind !== 'scorpion_well')) === pr(b.doodads)
      && ka === kb && JSON.stringify(a.pois) === JSON.stringify(b.pois));
    check('L8 THE REPLACEMENT LAW holds through the lane (no garrison, no inner urns, either table)',
      a.garrisons.length === 0 && b.garrisons.length === 0
      && a.doodads.every(d => d.kind !== 'burial_urn' && d.kind !== 'clay_pots'));
  }

  // THE OPEN DOOR: the mouth kind is the ROW's choice — any registered
  // sidezone hangs under the ring (a graveland table's mausoleum, a city
  // block's sewer grate) — and a row naming an UNREGISTERED kind seats
  // nothing at all (a door that cannot open must not stand), leaving the
  // layout exactly the vacant run.
  {
    const seed = firstSeed ^ 0xbad;
    const alt: TenantRow[] = [{ kind: 'lair_mouth', weight: 1, params: { mouth: 'ruin_gate', dress: [] } }];
    const out = lGen(courtDef('probe_lair_mouth_alt', alt), seed);
    check('L15 the door is a row param (a standing sidezone kind hangs under the ring)',
      out.doodads.some(d => d.kind === 'ruin_gate')
      && out.doodads.every(d => d.kind !== 'scorpion_well'));
    const bogus: TenantRow[] = [{ kind: 'lair_mouth', weight: 1, params: { mouth: 'no_such_door' } }];
    const bo = lGen(courtDef('probe_lair_mouth_alt', bogus), seed);
    const vo = lGen(courtDef('probe_lair_mouth_alt', [{ kind: 'vacant', weight: 1 }]), seed);
    check('L16 a door that cannot open seats NOTHING (unregistered mouth = the vacant layout)',
      pr(bo.doodads) === pr(vo.doodads));
  }
  // THE DEN KEY: `params.den` names a registered LAIR and the ring inherits
  // that den's WHOLE identity from the standing registry — the barrow's
  // actual door AND the barrow's own spoor (obsidian, cinder) — so per-biome
  // tables seat per-biome residents with one field. A key that resolves to
  // no den door (unknown id, or an in-zone lair like the cairn) DEGRADES to
  // the vacant tenant; the seat geometry is a param, not a ring assumption.
  {
    const seed = firstSeed ^ 0xde11;
    const denRows: TenantRow[] = [{ kind: 'lair_mouth', weight: 1, params: { den: 'wyrm_barrow' } }];
    const out = lGen(courtDef('probe_lair_mouth_den', denRows), seed);
    const barrowMouths = out.doodads.filter(d => d.kind === 'wyrm_barrow_mouth');
    const denSpoored = barrowMouths.filter(d => out.doodads.some(o =>
      (o.kind === 'obsidian' || o.kind === 'cinder')
      && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 110)).length;
    check('L17 the den key seats the den\'s WHOLE identity (the barrow\'s door, the barrow\'s spoor)',
      barrowMouths.length >= 1 && denSpoored === barrowMouths.length
      && out.doodads.every(d => d.kind !== 'scorpion_well'),
      `${barrowMouths.length} barrow doors, ${denSpoored} den-spoored`);
    const vo2 = lGen(courtDef('probe_lair_mouth_den', [{ kind: 'vacant', weight: 1 }]), seed);
    const unk = lGen(courtDef('probe_lair_mouth_den',
      [{ kind: 'lair_mouth', weight: 1, params: { den: 'no_such_den' } }]), seed);
    const cairn = lGen(courtDef('probe_lair_mouth_den',
      [{ kind: 'lair_mouth', weight: 1, params: { den: 'giants_cairn' } }]), seed);
    check('L18 a key with no den door degrades to VACANT (unknown id AND the doorless cairn)',
      pr(unk.doodads) === pr(vo2.doodads) && pr(cairn.doodads) === pr(vo2.doodads));
    const tight = lGen(courtDef('probe_lair_mouth_den',
      [{ kind: 'lair_mouth', weight: 1, params: { floorFrac: 0.02 } }]), seed);
    check('L19 seat geometry is a PARAM (a floor authored too tight honestly seats no door)',
      tight.doodads.every(d => d.kind !== 'scorpion_well'));
  }

  // LIVE: the adopted door, the persistent seed, the minted den, the ledger.
  let mouth: { pos: Vec2; seed: number; kind: string } | undefined;
  let liveId = '';
  for (let s = 0; s < 4 && !mouth; s++) {
    const zid = `probe_undercourt_${s}`;
    const zdef = courtDef(zid, lairTable, { exits: [{ to: homeId, side: 's' }] });
    zdef.seed = 660001 + s * 104729;
    w.caveMap[zid] = zdef;
    w.loadZone(zid);
    mouth = (w.caveEntrances as { pos: Vec2; seed: number; kind: string }[])
      .find(c => c.kind === 'scorpion_well');
    if (mouth) liveId = zid;
  }
  check('L9 loadZone ADOPTS the tenant-planted door into the dwell registry', !!mouth, liveId);
  if (mouth) {
    const seen = { seed: mouth.seed, x: mouth.pos.x, y: mouth.pos.y };
    leaveToHome();
    w.loadZone(liveId);
    const again = (w.caveEntrances as { pos: Vec2; seed: number; kind: string }[])
      .find(c => c.kind === 'scorpion_well');
    check('L10 same ring, same door, same den seed (position-hash persistence across reloads)',
      !!again && again.seed === seen.seed && again.pos.x === seen.x && again.pos.y === seen.y);
    if (again) {
      w.enterSidezone(again);
      check('L11 the well mints the den (id + name + one sealed rung + the classic ask)',
        w.zone.id === `cave_scorpion_well_${liveId}_${again.seed}`
        && String(w.zone.name).includes('Scorpion Well')
        && w.zone.caveDepth >= 1 && w.zone.noDeeper === true
        && w.zone.objective.kind === 'clear',
        `${w.zone.id} · ${w.zone.name}`);
      const brood = (w.actors as Actor[]).filter(a => a.defId === 'sand_scorpion');
      check('L12 the brood is home (authored fauna, chance 1)', brood.length >= 2,
        `${brood.length} scorpions`);
      check('L13 the gateway ledger stamps (scorpion_well_entered)',
        ((w.ledger?.scorpion_well_entered as number | undefined) ?? 0) >= 1);
    }
    leaveToHome();
  }
  // Mint purity (the E1 idiom) on the den's own sidezone.
  {
    const sz = sidezoneOf('scorpion_well')!;
    const mctx = {
      parent: (w.caveMap[liveId] ?? w.zoneMap[homeId]) as ZoneDef, seed: 424243,
      id: 'probe_well_det', pos: { x: 100, y: 100 }, playerLevel: 10, pkgActive: () => false,
    };
    const a = sz.mint(mctx);
    check('L14 the mint is pure and sealed (byte-equal defs, noDeeper, the brood authored)',
      JSON.stringify(a) === JSON.stringify(sz.mint(mctx))
      && a.noDeeper === true
      && Array.isArray(a.fauna) && a.fauna.some(f => f.id === 'sand_scorpion'));
  }
}

// --- RIG M: THE BIOME DENS (batch 17) — the shipped per-face den mappings -----
// The den key leaves the bench for the SHIPPED tables (data/tilesets.ts):
// tableland's 'court of sands' standard ring may keep the desert's own asking
// (den: 'riddle_vault' — the sphinx's gate where a pot-hoard stood) and
// courtland's base-face well ring may be the crone's (den: 'hag_hovel').
// Pinned here: the rows resolve WHOLE through the standing registries (lair
// row → den_mouth landmark → registered sidezone); THE OVER-ROW LAW
// (over.tenants REPLACES the kind's table wholesale — engine/massif.ts's
// shallow row merge, probe_massif rig M — so the courtland row must carry
// well_court's OWN table verbatim: the drift guard compares it row-by-row
// against data/massifs.ts and SCREAMS when the kind table moves, because the
// face copy must be re-derived by hand); THE SURGICAL APPEND (the den row
// stands LAST and is paid from the TAIL row, so with-vs-without diverges only
// in the flipped tail band: carve, grid, POIs and garrisons byte-equal, every
// doodad delta confined to den kit — or the displaced cache knot — at a
// doored ring); the ratio laws rig J pins on the kind table, held by the
// copy; and the doors standing LIVE on the real faces — inside their rings,
// den-spoored, on the walk net.
{
  const W2 = 2200, H2 = 1600;
  const mEntry = vec(140, H2 / 2);
  const mExits = [vec(W2 - 140, H2 / 2)];
  const mGen = (def: ZoneDef, seed: number): GeneratedLayout =>
    generateLayout({ ...def, seed }, { w: W2, h: H2 }, new Rng(seed), mEntry, mExits);
  const mCtx = (seed: number): GenCtx => ({
    rng: new Rng(seed), arena: { w: W2, h: H2 }, entry: mEntry, exits: mExits, seed,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [],
  });
  const faceDef = (id: string, biome: ZoneDef['biome'], params: Record<string, unknown>): ZoneDef =>
    caveDef({
      id, size: { w: W2, h: H2 }, layout: [], layoutType: 'massif',
      caveDepth: undefined, anchor: undefined, biome,
      layoutParams: params,
    });
  // Sorted position-keyed multiset (order-free: tenant seating and dressing
  // interleave differently per body, the SET is the truth).
  const keys = (ds: GeneratedLayout['doodads']): string[] =>
    ds.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).sort();
  const minus = (a: string[], b: string[]): string[] => {
    const have = new Map<string, number>();
    for (const k of b) have.set(k, (have.get(k) ?? 0) + 1);
    return a.filter(k => {
      const n = have.get(k) ?? 0;
      if (n > 0) { have.set(k, n - 1); return false; }
      return true;
    });
  };
  const kindOfKey = (k: string): string => k.slice(0, k.indexOf(':'));
  const posOfKey = (k: string): Vec2 => {
    const [x, y] = k.slice(k.indexOf(':') + 1).split(',').map(Number);
    return vec(x, y);
  };

  // M1/M2 — the tableland row: the census + the ratio laws.
  const tlVar = TILESETS.tableland?.variants?.find(v => v.name === 'the court of sands');
  const tlPool = ((tlVar?.layoutParams ?? {}) as Record<string, unknown>)
    .massifMasses as MassPoolRow[] | undefined;
  const tlRow = tlPool?.find(r => r.kind === 'sand_court'
    && !!r.over?.tenants?.some(t => t.kind === 'lair_mouth'));
  const tlTab = tlRow?.over?.tenants ?? [];
  const tlDen = tlTab[tlTab.length - 1];
  check('M1 tableland keeps the desert\'s own asking (den riddle_vault LAST, a find\'s weight, table at 100, vacancy kept)',
    !!tlRow && !!tlDen && tlDen.kind === 'lair_mouth'
    && (tlDen.params as { den?: string } | undefined)?.den === 'riddle_vault'
    && tlDen.weight >= 2 && tlDen.weight <= 4
    && tlTab.reduce((a, r) => a + r.weight, 0) === 100
    && tlTab.some(r => r.kind === 'vacant' && r.weight > 0));
  {
    const manned = tlTab.filter(r => r.kind === 'garrison' || r.kind === 'held_stock')
      .reduce((a, r) => a + r.weight, 0);
    const stock = tlTab.find(r => r.kind === 'stock')?.weight ?? 0;
    check('M2 the ratios hold through the weave (manned a minority, stock the dominant single row)',
      tlTab.length > 0 && manned / 100 <= 0.45
      && tlTab.every(r => r.kind === 'stock' || r.weight <= stock));
  }

  // M3 — both shipped den keys resolve WHOLE through the standing registries.
  for (const [den, mouth] of [['riddle_vault', 'sphinx_gate'], ['hag_hovel', 'hovel_door']] as const) {
    const lair = lairOf(den);
    const lm = lair ? landmarkDefs().find(d => d.id === lair.landmark) : undefined;
    const mk = (lm?.params as { mouthKind?: string } | undefined)?.mouthKind;
    check(`M3 den '${den}' resolves whole (lair → den_mouth landmark → registered sidezone '${mouth}')`,
      !!lair && lm?.builder === 'den_mouth' && mk === mouth && !!sidezoneOf(mouth));
  }

  // M4/M5/M6 — the courtland row: the census, THE FACE-COPY DRIFT GUARD, and
  // rig J's ratio laws held by the copy.
  const clPool = ((TILESETS.courtland?.layoutParams ?? {}) as Record<string, unknown>)
    .massifMasses as MassPoolRow[] | undefined;
  const clRow = clPool?.find(r => r.kind === 'well_court' && !!r.over?.tenants);
  const clTab = clRow?.over?.tenants ?? [];
  const clDen = clTab[clTab.length - 1];
  check('M4 the courtland well ring is the crone\'s at the tail (den hag_hovel LAST, a find\'s weight)',
    !!clRow && !!clDen && clDen.kind === 'lair_mouth'
    && (clDen.params as { den?: string } | undefined)?.den === 'hag_hovel'
    && clDen.weight >= 2 && clDen.weight <= 4);
  {
    const kindTab = massKindOf('well_court').tenants ?? [];
    let copyTrue = clTab.length === kindTab.length + 1 && !!clDen;
    for (let i = 0; i < kindTab.length && copyTrue; i++) {
      const a = clTab[i], b = kindTab[i];
      copyTrue = b.kind === 'vacant'
        ? a.kind === 'vacant' && a.weight === b.weight - (clDen?.weight ?? 0)
        : JSON.stringify(a) === JSON.stringify(b);
    }
    check('M5 THE FACE COPY holds (well_court\'s own table verbatim, vacant paying the den — a moved kind table screams here)',
      copyTrue
      && clTab.reduce((a, r) => a + r.weight, 0) === kindTab.reduce((a, r) => a + r.weight, 0));
    const manned = clTab.filter(r => r.kind === 'garrison' || r.kind === 'held_stock')
      .reduce((a, r) => a + r.weight, 0);
    const vac = clTab.filter(r => r.kind === 'vacant').reduce((a, r) => a + r.weight, 0);
    const tot = clTab.reduce((a, r) => a + r.weight, 0);
    check('M6 the copy honors rig J\'s laws (manned ≤ 0.3, vacancy a present whisper, stock dominant)',
      tot > 0 && manned / tot <= 0.3 && vac > 0 && vac / tot <= 0.25
      && clTab.every(r => r.kind === 'stock'
        || r.weight <= (clTab.find(x => x.kind === 'stock')?.weight ?? 0)));
  }

  // M7/M8 — TABLELAND LIVE + PARITY on the real variant face: A = the shipped
  // pool, B = the pre-change pool (the historical table, cache 12, no den).
  // Bands [0,88) draw the same tenant; [88,97) is cache in both; only
  // [97,100) flips cache → den. So: grid/POIs/garrisons byte-equal, extras
  // are vault kit at a door, misses are the displaced cache knot at a ring
  // whose cache truly left — the door then either STANDS there or honestly
  // REFUSED a too-tight floor (the cache knot's own standoff law: small
  // rings in the variant's [170,300] band may seat nothing, and the ring
  // reads vacant — never a half-den).
  const vaultKit = new Set(['sphinx_gate', 'broken_column', 'ruin_plinth', 'rubble']);
  const cacheKit = new Set(['burial_urn', 'clay_pots', 'bone_pile']);
  if (!tlRow || !tlVar || !tlPool) {
    check('M7 tableland live doors (sweep ran)', false, 'shipped row missing — see M1');
  } else {
    const tlGreat = tlPool.find(r => r !== tlRow);
    const tlBefore: MassPoolRow = { kind: 'sand_court', weight: 3, over: { tenants: [
      { kind: 'stock', weight: 30 },
      { kind: 'garrison', weight: 28 },
      { kind: 'vacant', weight: 18 },
      { kind: 'held_stock', weight: 12 },
      { kind: 'cache', weight: 12 },
    ] } };
    const paramsA = { ...TILESETS.tableland.layoutParams, ...tlVar.layoutParams } as Record<string, unknown>;
    const paramsB = { ...paramsA, massifMasses: tlGreat ? [tlBefore, tlGreat] : [tlBefore] };
    let doors = 0, inRing = 0, spoored = 0, reach = 0, wells = 0;
    let stateOk = 0, extrasBad = 0, missBad = 0, n = 0;
    for (let s = 0; s < 16; s++) {
      const seed = 917003 + s * 104729;
      const dA = faceDef('probe_biome_den_tl', 'desert', paramsA);
      const dB = faceDef('probe_biome_den_tl', 'desert', paramsB);
      const a = mGen(dA, seed);
      const b = mGen(dB, seed);
      n++;
      const rings = carveMassifs(mCtx(seed), { ...dA, seed }).filter(m => m.interior);
      const gates = a.doodads.filter(d => d.kind === 'sphinx_gate');
      doors += gates.length;
      wells += a.doodads.filter(d => d.kind === 'scorpion_well').length;
      for (const d of gates) {
        const home = rings.find(m =>
          Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= m.r * 0.6 * 0.9 + 0.5);
        if (home) inRing++;
        if (a.walk instanceof GridWalkField && a.walk.reachable(mEntry, vec(d.pos.x, d.pos.y))) reach++;
        if (a.doodads.filter(o =>
          (o.kind === 'broken_column' || o.kind === 'ruin_plinth' || o.kind === 'rubble')
          && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 110).length >= 2) spoored++;
      }
      const ka = a.walk instanceof GridWalkField ? a.walk.pack().kbits : 'a';
      const kb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : 'b';
      if (ka === kb && JSON.stringify(a.pois) === JSON.stringify(b.pois)
        && JSON.stringify(a.garrisons) === JSON.stringify(b.garrisons)) stateOk++;
      const kA = keys(a.doodads), kB = keys(b.doodads);
      const extras = minus(kA, kB).map(k => ({ kind: kindOfKey(k), pos: posOfKey(k) }));
      for (const e of extras) {
        if (!vaultKit.has(e.kind)
          || !gates.some(g => Math.hypot(g.pos.x - e.pos.x, g.pos.y - e.pos.y) < 130)) extrasBad++;
      }
      for (const k of minus(kB, kA)) {
        const p = posOfKey(k);
        const home = rings.find(m =>
          Math.hypot(p.x - m.interior!.x, p.y - m.interior!.y) <= m.r * 0.6 * 0.9 + 0.5);
        // The displaced knot's home ring flipped to the den: it holds the
        // GATE — or, on a refused floor, NOTHING new at all (ambient scatter
        // that stands in both runs cancels out of the diff and never counts).
        const fr = home ? home.r * 0.6 * 0.9 + 0.5 : 0;
        const gateIn = !!home && gates.some(g =>
          Math.hypot(g.pos.x - home.interior!.x, g.pos.y - home.interior!.y) <= fr);
        const extraIn = !!home && extras.some(e =>
          Math.hypot(e.pos.x - home.interior!.x, e.pos.y - home.interior!.y) <= fr);
        if (!cacheKit.has(kindOfKey(k)) || !home || (!gateIn && extraIn)) missBad++;
      }
    }
    check('M7 the vault stands in the court of sands (doors in rings, den-spoored, on the walk net, never the default well)',
      doors >= 1 && inRing === doors && spoored === doors && reach === doors && wells === 0,
      `${doors} gates over ${n} zones`);
    check('M8 THE SURGICAL PARITY (tableland): grid/POIs/garrisons byte-equal; the diff is the flipped tail band alone',
      stateOk === n && extrasBad === 0 && missBad === 0,
      `${stateOk}/${n} state-equal`);
  }

  // M9/M10 — COURTLAND LIVE + PARITY on the shipped row (isolated for
  // density: the row IS the authored unit; the base-face pool mix around it
  // is standing carve law). B = the bare pre-change row — the kind's own
  // table. Only [98,100) flips vacant → hag, so the diff is PURELY ADDITIVE:
  // nothing missing, every extra hovel kit at a door.
  const hovelKit = new Set(['hovel_door', 'feeding_stake', 'pot_cluster', 'web']);
  if (!clRow) {
    check('M9 courtland live doors (sweep ran)', false, 'shipped row missing — see M4');
  } else {
    const paramsA = {
      massifCoverage: [0.3, 0.34] as [number, number],
      massifSizeR: [200, 260] as [number, number],
      massifMasses: [clRow],
    };
    const paramsB = { ...paramsA, massifMasses: [{ kind: 'well_court', weight: 1.6 }] };
    let doors = 0, inRing = 0, spoored = 0, reach = 0;
    let stateOk = 0, extrasBad = 0, missCount = 0, n = 0;
    for (let s = 0; s < 16; s++) {
      const seed = 881003 + s * 104729;
      const dA = faceDef('probe_biome_den_cl', 'courtland', paramsA);
      const dB = faceDef('probe_biome_den_cl', 'courtland', paramsB);
      const a = mGen(dA, seed);
      const b = mGen(dB, seed);
      n++;
      const rings = carveMassifs(mCtx(seed), { ...dA, seed }).filter(m => m.interior);
      const hovels = a.doodads.filter(d => d.kind === 'hovel_door');
      doors += hovels.length;
      for (const d of hovels) {
        const home = rings.find(m =>
          Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= m.r * 0.68 * 0.9 + 0.5);
        if (home) inRing++;
        if (a.walk instanceof GridWalkField && a.walk.reachable(mEntry, vec(d.pos.x, d.pos.y))) reach++;
        if (a.doodads.filter(o =>
          (o.kind === 'feeding_stake' || o.kind === 'pot_cluster' || o.kind === 'web')
          && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 110).length >= 2) spoored++;
      }
      const ka = a.walk instanceof GridWalkField ? a.walk.pack().kbits : 'a';
      const kb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : 'b';
      if (ka === kb && JSON.stringify(a.pois) === JSON.stringify(b.pois)
        && JSON.stringify(a.garrisons) === JSON.stringify(b.garrisons)) stateOk++;
      const kA = keys(a.doodads), kB = keys(b.doodads);
      missCount += minus(kB, kA).length;
      for (const k of minus(kA, kB)) {
        const p = posOfKey(k);
        if (!hovelKit.has(kindOfKey(k))
          || !hovels.some(g => Math.hypot(g.pos.x - p.x, g.pos.y - p.y) < 130)) extrasBad++;
      }
    }
    check('M9 the crone answers on the rim (hovel doors in well rings, den-spoored, on the walk net)',
      doors >= 1 && inRing === doors && spoored === doors && reach === doors,
      `${doors} hovels over ${n} zones`);
    check('M10 THE SURGICAL PARITY (courtland): byte-equal state, the diff purely ADDITIVE hovel kit at doors',
      stateOk === n && extrasBad === 0 && missCount === 0,
      `${stateOk}/${n} state-equal, ${missCount} missing`);
  }
}

console.log(fails ? `\nprobe_lairs: ${fails} FAILURE(S)` : '\nprobe_lairs: ALL PASS');
process.exit(fails ? 1 : 0);
