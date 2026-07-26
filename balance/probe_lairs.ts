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
import '../src/data/compositions';
import '../src/data/lairs';

import { Rng } from '../src/core/rng';
import { vec, type Vec2 } from '../src/core/math';
import {
  doodadRuleOf, generateLayout, hasLandmark, isSidezoneEntranceKind,
  type GeneratedLayout,
} from '../src/engine/levelgen';
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
  check('G10 the spring spawns its naiad IN the pool', !!naiad);
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

console.log(fails ? `\nprobe_lairs: ${fails} FAILURE(S)` : '\nprobe_lairs: ALL PASS');
process.exit(fails ? 1 : 0);
