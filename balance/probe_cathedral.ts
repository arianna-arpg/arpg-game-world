// ONE-OFF PROBE — THE CATHEDRAL OF THE HIGHEST end to end: the registry
// weave (tileset / recipe / generator / structure / regions / kit / clergy /
// ascension lane / the Aureole gateway flip), the generator's own laws (the
// great doors, the empty throne, nested variation, determinism, size caps),
// the depth staging (the crown minting only in the country's deepest
// hearts), and a live headless mint (the See raised, the lesson door
// carrying its ledger key, the sanctuary furnished, glass + frail fringe
// present across seeds).
// Run: npx tsx balance/probe_cathedral.ts
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { TILESETS, pickTilesetForBiome } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { STRUCTURES, legendCell } from '../src/data/structures';
import { hasStructureGen, runStructureGen } from '../src/engine/structureGen';
import { hasLayout, hasDoodadRule } from '../src/engine/levelgen';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { regionKind } from '../src/world/regions';
import { SIDEZONES } from '../src/data/sidezones';
import { hollowDef } from '../src/data/hollows';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5ee01);

// --- §1 THE REGISTRY WEAVE ---------------------------------------------------
const ts = TILESETS.aether_cathedral;
check('tileset: aether_cathedral registered', !!ts);
check('tileset: crowns the CIVITAS (the true city\'s own biome)', ts?.biome === 'aether_civitas' && ts?.realm === 'aetherial' && ts?.frontier === false);
check('tileset: the city itself is registered beneath it',
  TILESETS.aether_civitas?.biome === 'aether_civitas' && TILESETS.aether_civitas?.forceLayout === 'civitas');
check('tileset: deepest-hearts staging', (ts?.depthAffinity?.from ?? 0) >= 0.8);
check('tileset: forces the cathedral recipe', ts?.forceLayout === 'cathedral' && hasLayout('cathedral'));
check('generator: cathedral registered', hasStructureGen('cathedral'));

const def = STRUCTURES.grand_cathedral;
check('structure: grand_cathedral routes the generator', def?.generator === 'cathedral');
check('structure: rooms confinement + marble + basilica roof',
  def?.confineVision === 'rooms' && def?.floorStyle === 'marble' && def?.roofStyle === 'basilica');
check('structure: the Host garrisons the See', def?.garrison === 'seraphic');
const westDoor = def?.legend?.D?.door;
check('structure: the GREAT WEST DOORS are the gateway lesson',
  westDoor?.mode === 'dwell' && westDoor?.lesson === 'cathedral_door_opened');

const cw = regionKind('cathedral_wall');
check('region: cathedral_wall is a TRUE pale wall',
  !!cw && !cw.walkable && !!cw.blocks && !!cw.blocksShot && !!cw.blocksSight);
const gf = regionKind('glass_floor');
check('region: glass_floor is a WALKABLE WINDOW (no fall policy — the pane holds)',
  !!gf && !!gf.walkable && !gf.blocks && !!gf.visual?.window && !gf.boundaryPolicy);

const KIT = ['processional_way', 'votive_bank', 'cathedral_pew', 'choir_stall', 'high_altar',
  'empty_throne', 'pipe_organ', 'font_of_light', 'reliquary_shrine', 'saint_effigy',
  'gonfalon', 'glory_arch', 'bell_spire', 'basilica_stair'];
check('kit: every cathedral kind carries rule + visual',
  KIT.every(k => hasDoodadRule(k) && !!DOODAD_VISUALS[k]),
  KIT.filter(k => !hasDoodadRule(k) || !DOODAD_VISUALS[k]).join(',') || 'all 14');

const CLERGY = ['chorister_of_the_veil', 'censer_warden', 'reliquary_ark', 'gloria_cantor', 'voice_of_the_throne'];
check('clergy: five offices, seraphic, each with a look',
  CLERGY.every(id => MONSTERS[id]?.faction === 'seraphic' && !!LOOKS[MONSTERS[id]!.look ?? '']),
  CLERGY.filter(id => MONSTERS[id]?.faction !== 'seraphic' || !LOOKS[MONSTERS[id]?.look ?? '']).join(',') || 'all 5');
check('clergy: the cantor reuses the Aureole kata (the queued Host-kin item)',
  (MONSTERS.gloria_cantor?.skills ?? []).includes('gloria') && (MONSTERS.gloria_cantor?.skills ?? []).includes('colonnade'));
check('clergy: the table seats them', (ts?.packs?.table ?? []).some(r => r.id === 'voice_of_the_throne'));

check('ascension: basilica_stair sidezone + ledger', SIDEZONES.basilica_stair?.ledgerOnEnter === 'basilica_climbed');
check('ascension: gallery_hollow cracks the stair out of the marble', !!hollowDef('gallery_hollow'));
check('ascension: the city authors the hollows budget',
  Object.keys(TILESETS.aether_seraphal?.hollows?.table ?? {}).includes('gallery_hollow'));
check('ascension: basilica_floor tileset registered (sheltered interior)',
  TILESETS.basilica_floor?.sky === 'sheltered' && TILESETS.basilica_floor?.frontier === false);

const aurSkill = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_aureole');
const aurSup = UNLOCK_CATALOG.find(u => u.id === 'sup_aureole');
check('gateway: both Aureole vault rows adopted the door ledger',
  (aurSkill as { reqLedger?: string } | undefined)?.reqLedger === 'cathedral_door_opened'
  && (aurSup as { reqLedger?: string } | undefined)?.reqLedger === 'cathedral_door_opened');

// --- §2 THE GENERATOR'S OWN LAWS --------------------------------------------
const planFor = (seed: number): string[] => runStructureGen('cathedral', new Rng(seed), {}) ?? [];
const p1 = planFor(11), p1b = planFor(11), p2 = planFor(23);
check('generator: deterministic per seed', p1.join('\n') === p1b.join('\n'));
check('generator: two seeds, two Sees', p1.join('\n') !== p2.join('\n'));
{
  let doors3 = false, throne = false, altar = false, font = false, organ = false;
  let sizeOk = true;
  let anyGlass = false, anyTowers = false, anyGarth = false, anyStalls = false;
  for (let s = 0; s < 12; s++) {
    const plan = planFor(100 + s * 7);
    const w = Math.max(...plan.map(r => r.length)), h = plan.length;
    if (w > 49 || h > 46) sizeOk = false;
    const last = plan[plan.length - 1] ?? '';
    if (/DDD/.test(last)) doors3 = true;
    const all = plan.join('');
    if (all.includes('Q')) throne = true;
    if (all.includes('A')) altar = true;
    if (all.includes('U')) font = true;
    if (all.includes('O')) organ = true;
    if (all.includes('g')) anyGlass = true;
    if (all.includes('P')) anyTowers = true;
    if (all.includes('_')) anyGarth = true;
    if (all.includes('q')) anyStalls = true;
  }
  check('generator: the GREAT WEST DOORS are a 3-cell breach on the front row', doors3);
  check('generator: sanctuary furnished (throne + altar + font + organ)', throne && altar && font && organ);
  check('generator: rolled features all appear across 12 seeds (glass / belfries / garth / stalls)',
    anyGlass && anyTowers && anyGarth && anyStalls,
    `glass:${anyGlass} towers:${anyTowers} garth:${anyGarth} stalls:${anyStalls}`);
  check('generator: plans stay inside the size caps', sizeOk);
}
{
  // Every char a plan emits resolves through the def's merged legend — an
  // unregistered char would silently paint NOTHING where furniture was owed.
  const chars = new Set<string>();
  for (let s = 0; s < 6; s++) for (const row of planFor(300 + s * 13)) for (const c of row) if (c !== ' ') chars.add(c);
  const orphans = [...chars].filter(c => !legendCell(c, STRUCTURES.grand_cathedral?.legend));
  check('generator: every emitted char resolves in the legend', orphans.length === 0, orphans.join(',') || `${chars.size} chars`);
}

// --- §3 THE DEPTH STAGING ----------------------------------------------------
{
  const tally = (biome: string, depth: number): Record<string, number> => {
    const t: Record<string, number> = {};
    for (let s = 0; s < 300; s++) {
      const id = pickTilesetForBiome(biome, new Rng(0xbead + s * 31), depth, 'aetherial');
      if (id) t[id] = (t[id] ?? 0) + 1;
    }
    return t;
  };
  // The bastion BELT keeps its own three faces — the See left it for the city.
  const beltDeep = tally('aether_bastion', 0.95);
  check('staging: the belt keeps no See (the biome split holds)',
    (beltDeep.aether_cathedral ?? 0) === 0 && (beltDeep.aether_seraphal ?? 0) > 0);
  // The CIVITAS: the city holds its own ground, the See its deepest hearts.
  const cityShallow = tally('aether_civitas', 0.4), cityDeep = tally('aether_civitas', 0.95);
  check('staging: the city holds its wards (no See in the shallows)',
    (cityShallow.aether_civitas ?? 0) > 250 && (cityShallow.aether_cathedral ?? 0) === 0,
    `shallow draws: ${JSON.stringify(cityShallow)}`);
  check('staging: the See claims the city\'s deepest hearts', (cityDeep.aether_cathedral ?? 0) > 30,
    `deep draws: cathedral ${cityDeep.aether_cathedral ?? 0} / civitas ${cityDeep.aether_civitas ?? 0}`);
}

// --- §4 THE LIVE MINT --------------------------------------------------------
{
  const w = makeSimWorld('warrior', 31007);
  let sawGlass = false, sawFrail = false;
  let minted = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = w.devMintTileset('aether_cathedral', attempt, 15, { seed: 0x5ee + attempt * 101 });
    if (!id) continue;
    w.devTravelTo(id);
    minted++;
    const doods = (w as unknown as { doodads: { kind: string; door?: { lesson?: string } }[] }).doodads;
    const door = doods.find(d => d.kind === 'door' && d.door?.lesson === 'cathedral_door_opened');
    const throne = doods.find(d => d.kind === 'empty_throne');
    const organ = doods.find(d => d.kind === 'pipe_organ');
    const way = doods.filter(d => d.kind === 'processional_way').length;
    const bells = doods.filter(d => d.kind === 'bell_spire').length;
    if (attempt === 0) {
      check('live: the lesson door stands (ledger key on the doodad)', !!door);
      check('live: the empty throne + the organ are placed', !!throne && !!organ);
      check('live: the processional is paved and belled', way > 10 && bells >= 1, `way ${way}, bells ${bells}`);
    }
    // Region census over the walk grid: the See's own kinds present.
    const walk = (w as unknown as { walk: { kindAt(x: number, y: number): string | undefined } }).walk;
    const arena = (w as unknown as { arena: { w: number; h: number } }).arena;
    let cWall = 0, cGlass = 0, cFrail = 0;
    for (let y = 15; y < arena.h; y += 30) for (let x = 15; x < arena.w; x += 30) {
      const k = walk.kindAt(x, y);
      if (k === 'cathedral_wall') cWall++;
      else if (k === 'glass_floor') cGlass++;
      else if (k === 'cloud_frail') cFrail++;
    }
    if (attempt === 0) check('live: the walls rose', cWall > 40, `${cWall} wall cells`);
    if (cGlass > 0) sawGlass = true;
    if (cFrail > 0) sawFrail = true;
  }
  check('live: three mints made', minted === 3);
  check('live: the crystal floor appears across the seeds', sawGlass);
  check('live: the frail fringe appears across the seeds (the transient law)', sawFrail);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
