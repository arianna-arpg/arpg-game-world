// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GARDEN COUNTRY end to end on the real registries and
// the real engine: the biome + field seeding, the four-face staging law
// (depthAffinity distributions at rim/middle/deep), the doodad contracts
// (crop-law wildgrass, glass-jar policy, canopy stalks), generation of the
// formicary with the NEST ROLE POOL (the rolePools seam: colony rooms in
// the nest, crypt braziers out of it — asserted BOTH directions), the
// mound_gate → galleries → Brood Vault sidezone chain (noDeeper + the
// Matriarch boss arena at rung 2), faction wiring (crownless colony, the
// turf war, rosters resolve), the bestiary's def/look/part integrity
// (glyph kit-parts included), Scentcraft LIVE on a sim world (the scent
// law in World.isPrey + seekPrey, the alarm rout, the honeydew pull, the
// moult cleanse), the gem pool rows (never orphaned), and the weather /
// fog / creep / meld rows the country registers.
// Run: npx tsx balance/probe_garden.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import { generateLayout, doodadRuleOf } from '../src/engine/levelgen';
import { interiorRoleDefs } from '../src/engine/interiorGen';
import { makeSkillInstance } from '../src/engine/skills';
import { STATUS_DEFS } from '../src/engine/status';
import { CREEPS } from '../src/engine/creep';
import { FOG_BANKS } from '../src/engine/fog';
import { resolveLiteKind } from '../src/engine/lite';
import { TILESETS, BIOME_LORE_GAPS, pickTilesetForBiome } from '../src/data/tilesets';
import { BIOMES, BIOME_FIELD } from '../src/world/biomes';
import { FACTION_TRAITS } from '../src/world/traits';
import { WARLORD_OF } from '../src/world/warlord';
import { WEATHER_DEFS } from '../src/world/weather';
import { WEATHER_FX } from '../src/render/vis/weatherFx';
import { MONSTERS, FACTIONS, RESERVED_KIN, WILDLIFE, factionStance, WAR_PAIRS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MELDS } from '../src/data/melds';
import { sidezoneOf } from '../src/data/sidezones';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';
import type { ZoneDef } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x6a4d3);

const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

// --- 1) The biome + the field ------------------------------------------------
{
  const b = BIOMES.garden;
  check('biome: garden registered, colony patron, its own label',
    !!b && b.patronFaction === 'formic' && b.label === 'the Garden');
  check('biome: field row seeds the country with country-grade acreage',
    BIOME_FIELD.some(r => r.biome === 'garden' && (r.weight ?? 1) >= 1.5));
  check('biome: the meld row is registered and speaks in garden kinds',
    !!MELDS.garden_meld && MELDS.garden_meld.rows.some(r => r.kind === 'wildgrass_blade'));
}

// --- 2) The staging law (depthAffinity over the four faces) -------------------
{
  const at = (depth: number): Record<string, number> => {
    const rng = new Rng(0xfaced ^ Math.round(depth * 1000));
    const seen: Record<string, number> = {};
    for (let i = 0; i < 240; i++) {
      const id = pickTilesetForBiome('garden', rng, depth) ?? 'none';
      seen[id] = (seen[id] ?? 0) + 1;
    }
    return seen;
  };
  const rim = at(0.08), mid = at(0.45), deep = at(0.92);
  check('staging: the rim belongs to the petalfields',
    (rim.petalfields ?? 0) > 120 && !rim.mulchreach,
    `rim ${JSON.stringify(rim)}`);
  check('staging: the middle mixes stalkwood + the tended rows',
    (mid.stalkwood ?? 0) > 30 && (mid.tendersrows ?? 0) > 30,
    `mid ${JSON.stringify(mid)}`);
  check('staging: the deep face is the mulch (petalfields faded out entirely)',
    (deep.mulchreach ?? 0) > 40 && !deep.petalfields,
    `deep ${JSON.stringify(deep)}`);
  check('membership: rootways + formicary never field-mint (frontier:false)',
    TILESETS.rootways.frontier === false && TILESETS.formicary.frontier === false);
  check('understratum: rootways is a garden-anchored cave face',
    (TILESETS.rootways.caveFace?.biomes?.garden ?? 0) >= 5);
}

// --- 3) Doodad contracts ------------------------------------------------------
{
  const grass = doodadRuleOf('wildgrass_blade');
  check('crop law: wildgrass is walk-through sight cover with a veil group',
    !grass.blocksMove && !grass.blocksShot && grass.blocksSight === true
    && grass.veil?.group === 'wildgrass' && grass.walkOnly === true);
  const stalk = doodadRuleOf('bloom_stalk');
  check('tree contract: the bloom stalk fights at the trunk, veils at the crown',
    !!stalk.blocksMove && (stalk.bodyScale ?? 1) <= 0.35 && !!stalk.veil && stalk.mutable === true);
  const jar = doodadRuleOf('bell_jar');
  check('glass policy: the bell jar stops bodies, passes shots AND sight',
    !!jar.blocksMove && jar.blocksShot === false && jar.blocksSight === false);
  check('gates: mound_gate + brood_stair are registered sidezone mouths',
    !!sidezoneOf('mound_gate') && !!sidezoneOf('brood_stair'));
  const seedPod = doodadRuleOf('seed_pod');
  check('the year\'s crop cracks: seed pods are brittle on a hit',
    !!seedPod.brittle && (seedPod.brittle.on ?? []).includes('hit'));
  for (const kind of ['bloom_stalk', 'sun_disc', 'bellflower', 'wildgrass_blade', 'petal_drift',
    'leaf_mulch', 'seed_pod', 'bud_knot', 'dew_bead', 'watering_can', 'bell_jar', 'tender_idol',
    'rusted_trowel', 'trellis_frame', 'formic_mound', 'formic_vent', 'mound_gate', 'comb_wax',
    'compost_heap', 'brood_stair']) {
    if (!DOODAD_VISUALS[kind]) { check(`visuals: '${kind}' has a DOODAD_VISUALS row`, false); }
  }
  check('visuals: every garden kind carries a look row', true);
}

// --- 4) The formicary generates with the NEST pool (both directions) ---------
{
  const roles = interiorRoleDefs();
  check('roles: the nest pool is registered (queen vault at the deepest)',
    roles.some(r => r.id === 'queen_vault' && r.pool === 'nest' && r.pick === 'deepest' && r.poi === true)
    && roles.some(r => r.id === 'brood_gallery' && r.pool === 'nest')
    && roles.some(r => r.id === 'fungus_garden' && r.pool === 'nest')
    && roles.some(r => r.id === 'granary' && r.pool === 'nest'));
  check('roles: the common pool is untouched (sanctum/reliquary carry no pool)',
    roles.some(r => r.id === 'sanctum' && !r.pool) && roles.some(r => r.id === 'reliquary' && !r.pool));

  const arena = { w: 2200, h: 1600 };
  const entry = vec(120, arena.h / 2);
  const exits = [vec(arena.w - 120, arena.h / 2)];
  const kindsOf = (def: ZoneDef, seed: number): Set<string> => {
    const layout = generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
    return new Set(layout.doodads.map(d => d.kind));
  };
  const ts = TILESETS.formicary;
  const nestDef = {
    id: 'probe_formicary', name: 'Probe Galleries', level: 8, seed: 1,
    size: { w: arena.w, h: arena.h }, theme: ts.theme, layout: ts.layout,
    layoutType: 'dungeon', layoutParams: { ...(ts.layoutParams ?? {}) },
    exits: [], map: { x: 0, y: 0 }, objective: { kind: 'clear' },
  } as unknown as ZoneDef;
  const commonDef = {
    ...nestDef, id: 'probe_common', layoutParams: {}, layout: [],
  } as unknown as ZoneDef;

  let nestHasColony = 0, nestLeak = 0, commonHasCrypt = 0, commonLeak = 0;
  for (const seed of [11, 23, 47]) {
    const nest = kindsOf(nestDef, seed);
    const common = kindsOf(commonDef, seed + 1000);
    if (nest.has('comb_wax') || nest.has('egg_clutch')) nestHasColony++;
    if (nest.has('brazier') || nest.has('burial_urn') || nest.has('bone_pile')) nestLeak++;
    if (common.has('brazier') || common.has('burial_urn')) commonHasCrypt++;
    if (common.has('comb_wax')) commonLeak++;
  }
  check('nest pool: colony furniture in every gallery mint', nestHasColony === 3);
  check('nest pool: crypt braziers NEVER leak into the colony', nestLeak === 0);
  check('common pool: the crypt keeps its braziers (byte-neutral default)', commonHasCrypt === 3);
  check('common pool: colony comb never leaks into common interiors', commonLeak === 0);
  // The way down, under EVERY generator the nest rolls: dungeon (carved)
  // and labyrinth (braided) each lay the brood run.
  for (const lt of ['dungeon', 'labyrinth']) {
    let laid = 0;
    for (const seed of [7, 19]) {
      const layout = generateLayout(
        { ...nestDef, layoutType: lt, seed: seed * 31 } as unknown as ZoneDef,
        arena, new Rng(seed * 31), entry, exits);
      const stairs = layout.doodads.filter(d => d.kind === 'brood_stair').length;
      if (stairs === 1) laid++;
    }
    check(`the way down: '${lt}' galleries lay exactly one brood run`, laid === 2);
  }
}

// --- 5) The sidezone chain: gate → galleries → the Brood Vault ---------------
{
  const parent = {
    id: 'probe_surface', name: 'Probe Plot', level: 7, seed: 99,
    biome: 'garden', size: { w: 2400, h: 1700 }, theme: TILESETS.mulchreach.theme,
    layout: [], exits: [], map: { x: 3, y: 4 }, objective: { kind: 'clear' },
  } as unknown as ZoneDef;
  const gate = sidezoneOf('mound_gate')!;
  check('mound_gate: registered with the nest_entered gateway seam',
    !!gate && gate.ledgerOnEnter === 'nest_entered');
  const galleries = gate.mint({ parent, seed: 4242, id: 'cave_mound_gate_probe_4242', pos: vec(0, 0), playerLevel: 7, pkgActive: () => false });
  check('galleries: the gate mints the formicary one rung down',
    (galleries.caveDepth ?? 0) === 1 && !galleries.noDeeper
    // The identity read: a minted pocket carries its tileset's packs by
    // REFERENCE (mintCave stamps ts.packs verbatim) — the discriminator.
    && galleries.packs === TILESETS.formicary.packs);
  const stair = sidezoneOf('brood_stair')!;
  const vault = stair.mint({ parent: galleries, seed: 777, id: 'cave_brood_stair_probe_777', pos: vec(0, 0), playerLevel: 7, pkgActive: () => false });
  check('the Brood Vault: rung two seals the ladder and seats the Matriarch',
    (vault.caveDepth ?? 0) === 2 && vault.noDeeper === true
    && vault.name === 'the Brood Vault'
    && vault.objective.kind === 'boss'
    && (vault.objective as { id?: string }).id === 'formic_matriarch');
  const middle = stair.mint({ parent, seed: 555, id: 'cave_brood_stair_probe_555', pos: vec(0, 0), playerLevel: 7, pkgActive: () => false });
  check('the chain law: a first-rung stair is galleries, never the Vault',
    middle.objective.kind !== 'boss' && !middle.noDeeper);
}

// --- 6) Factions: the crownless colony and the turf war ----------------------
{
  check('traits: formic + bloomkin rooted on garden ground',
    FACTION_TRAITS.formic?.homeBiome === 'garden' && FACTION_TRAITS.bloomkin?.homeBiome === 'garden');
  check('crownless: neither banner holds a WARLORD_OF seat (no invasion gate)',
    !WARLORD_OF.formic && !WARLORD_OF.bloomkin);
  check('the turf war: formic|bloomkin hostile, and it seeds war zones',
    factionStance('formic', 'bloomkin') === 'hostile'
    && WAR_PAIRS.some(([a, b]) => (a === 'formic' && b === 'bloomkin') || (a === 'bloomkin' && b === 'formic')));
  check('the colony farms fungus: formic|fungal are kin',
    factionStance('formic', 'fungal') === 'ally');
  check('not reserved: both banners field in baseline generation',
    !RESERVED_KIN.formic && !RESERVED_KIN.bloomkin
    && (FACTION_TRAITS.formic?.contexts ?? ['baseline']).includes('baseline'));
  const rosterIds = [...FACTIONS.formic.table, ...FACTIONS.bloomkin.table].map(e => e.id);
  check('rosters: every fielded id resolves to a def',
    rosterIds.every(id => !!MONSTERS[id]), rosterIds.filter(id => !MONSTERS[id]).join(','));
  check('wildlife: the garden has ambient rows and they all resolve',
    (WILDLIFE.garden ?? []).length >= 4 && (WILDLIFE.garden ?? []).every(r => !!MONSTERS[r.id]));
}

// --- 7) Bestiary integrity (defs, looks, glyph kit-parts) --------------------
{
  const newIds = ['formic_forager', 'formic_tender', 'formic_alate', 'formic_matriarch', 'formic_burrow',
    'petal_dancer', 'sepal_warden', 'pollen_sylph', 'foxglove_chorister',
    'wool_aphid', 'garden_snail', 'banded_slug', 'skep_bee'];
  check('defs: every garden id registered', newIds.every(id => !!MONSTERS[id]),
    newIds.filter(id => !MONSTERS[id]).join(','));
  check('looks: every garden def has a LOOKS entry whose parts all resolve',
    newIds.every(id => {
      const look = LOOKS[MONSTERS[id].look ?? id];
      return !!look && look.parts.every(p => !!PART_PAINTERS[p.kind])
        && (look.live ?? []).every(p => !!PART_PAINTERS[p.kind]);
    }));
  check('glyph kit-parts: the garden set registered as first-class painters',
    ['petalRuff', 'bloomCap', 'eyestalks', 'cornicles'].every(k => !!PART_PAINTERS[k]));
  check('the herd: wool_aphid is a 1-ply lite crowd body',
    !!MONSTERS.wool_aphid.lite && MONSTERS.wool_aphid.plies?.count === 1
    && !!resolveLiteKind(MONSTERS.wool_aphid, 1, 0.8));
  check('the snail lays the road: creepSource names a registered kind',
    MONSTERS.garden_snail.creepSource?.kind === 'snailslick' && !!CREEPS.snailslick
    && (CREEPS.snailslick.grants ?? []).some(g => g.status === 'slippery'));
  check('the skep answers: bee volatile names a real skill',
    !!MONSTERS.skep_bee.volatile && !!SKILLS[MONSTERS.skep_bee.volatile.skillId]);
  check('the Matriarch: a true boss whose phases summon real kin',
    MONSTERS.formic_matriarch.boss === true
    && (MONSTERS.formic_matriarch.brain?.phases ?? []).every(ph =>
      (ph.onEnter ?? []).every(a => a.do !== 'summon' || !!MONSTERS[(a as { monster?: string }).monster ?? ''])));
  check('the burrow: an anchored spawner with a real spew',
    MONSTERS.formic_burrow.spawner === true && !!SKILLS.spew_formics);
  check('spawnerIds: every garden tileset names a registered spawner def',
    ['petalfields', 'stalkwood', 'tendersrows', 'mulchreach', 'rootways', 'formicary']
      .every(id => !!MONSTERS[TILESETS[id].spawnerId]));
}

// --- 8) SCENTCRAFT LIVE: the scent law, the rout, the pull, the moult --------
{
  const w = makeSimWorld('warrior', 0x9a2d1);
  const p = w.player;
  const W = w as unknown as {
    createMonster(id: string, level: number, team: string): Actor;
    actors: Actor[];
    executeSkill(a: Actor, inst: unknown, aim: { x: number; y: number }): void;
    hostileTo(a: Actor, b: Actor): boolean;
    seekPrey(a: Actor, range: number): Actor | null;
  };
  const spawn = (id: string, x: number, y: number): Actor => {
    const m = W.createMonster(id, 5, 'enemy');
    m.pos.x = x; m.pos.y = y;
    W.actors.push(m);
    return m;
  };
  p.pos.x = 300; p.pos.y = 600;

  // The scent law: a hunter (orb_weaver preys on critters), a non-hunter
  // (formic_soldier has no prey list), and a victim who is neither's kin.
  const hunter = spawn('orb_weaver', 700, 300);
  const bystander = spawn('formic_soldier', 700, 900);
  const victim = spawn('goblin_brute', 900, 600);
  check('scent law: unmarked, the hunter has no quarrel with the goblin',
    !W.hostileTo(hunter, victim));
  victim.applyStatus('prey_marked', 0, 1, 'probe');
  check('scent law: marked, anything that hunts reads the goblin as FOOD',
    W.hostileTo(hunter, victim));
  check('scent law: a body with no prey list smells nothing',
    !W.hostileTo(bystander, victim));
  check('scent law: the nose works past sight (seekPrey finds the mark)',
    W.seekPrey(hunter, 2000) === victim);
  const hunter2 = spawn('orb_weaver', 760, 340);
  hunter2.applyStatus('prey_marked', 0, 1, 'probe');
  check('scent law: kin guards hold — a marked weaver is not weaver food',
    !W.hostileTo(hunter, hunter2));

  // The rout: alarm_reek bolts a pack (panic through the morale machinery).
  // The cast has a real wind-up — step it through before reading the field.
  const g1 = spawn('goblin_skirmisher', 380, 620);
  const g2 = spawn('goblin_skirmisher', 340, 560);
  W.executeSkill(p, makeSkillInstance(SKILLS.alarm_reek, 1), vec(p.pos.x, p.pos.y));
  step(w, 1.0);
  check('alarm reek: the pack wears the bolt and the panic flag reads',
    g1.statuses.some(s => s.id === 'bolted') && g2.statuses.some(s => s.id === 'bolted')
    && g1.isPanicked() && !!STATUS_DEFS.bolted?.panic,
    `g1 [${g1.statuses.map(s => s.id).join(',')}]`);

  // The pull + the mire: one body IN the pool (appetite), one at the rim
  // (drawn in). The pool's ticks mire; its suction closes the rim. Cast
  // INSIDE castRange (380) — a lure poured past arm's reach never lands.
  const feeder = spawn('zombie', 610, 600);
  const drawn = spawn('zombie', 830, 600);
  const before = Math.hypot(drawn.pos.x - 600, drawn.pos.y - 600);
  W.executeSkill(p, makeSkillInstance(SKILLS.honeydew_lure, 1), vec(600, 600));
  let miredSeen = false;
  for (let i = 0; i < 120; i++) {
    step(w, 1 / 60);
    if (feeder.statuses.some(s => s.id === 'mired')) miredSeen = true;
  }
  const after = Math.hypot(drawn.pos.x - 600, drawn.pos.y - 600);
  check('honeydew: the pool PULLS (the rim body is nearer the sweetness)',
    after < before - 20, `${Math.round(before)} -> ${Math.round(after)}`);
  check('honeydew: appetite mires — the slow landed while it fed', miredSeen);

  // The moult: afflictions come off with the skin.
  p.applyStatus('poison', 4, 1, 'probe');
  p.applyStatus('chill', 0, 1, 'probe');
  check('moult setup: the player is poisoned and chilled',
    p.statuses.some(s => s.id === 'poison') && p.statuses.some(s => s.id === 'chill'));
  W.executeSkill(p, makeSkillInstance(SKILLS.moult, 1), vec(p.pos.x, p.pos.y));
  step(w, 0.2);
  check('moult: the sheddable afflictions came off with the skin',
    !p.statuses.some(s => s.id === 'poison') && !p.statuses.some(s => s.id === 'chill'));
  const buffs = (p as unknown as { buffs: Map<string, unknown> }).buffs;
  check('moult: the fresh-hatched breath is on (worn as a BUFF, not an ailment)',
    buffs.has('fresh_moult'),
    `player buffs [${[...buffs.keys()].join(',')}]`);
}

// --- 9) The gem pools (never orphaned), weather, fog ------------------------
{
  const pooled = new Set<string>();
  for (const u of UNLOCK_CATALOG) {
    const pay = u.payload as { skillIds?: string[]; supportIds?: string[] };
    for (const id of pay.skillIds ?? []) pooled.add(id);
    for (const id of pay.supportIds ?? []) pooled.add(id);
  }
  check('pools: every droppable Scentcraft gem rides a pool row (no orphans)',
    ['prey_musk', 'alarm_reek', 'honeydew_lure', 'moult',
      'heavy_musk', 'candied_scent', 'startling_reek'].every(id => pooled.has(id)));
  check('pools: the rows gate on the nest_entered gateway seam',
    UNLOCK_CATALOG.some(u => u.id === 'gem_skills_scentcraft' && (u as { reqLedger?: string }).reqLedger === 'nest_entered')
    && UNLOCK_CATALOG.some(u => u.id === 'sup_scentcraft' && (u as { reqLedger?: string }).reqLedger === 'nest_entered'));
  check('supports: the Scentcraft gems exist with real socket gates',
    !!SUPPORTS.heavy_musk?.requiresTags?.includes('curse')
    && !!SUPPORTS.candied_scent && !!SUPPORTS.startling_reek);
  check('weather: petalfall is sky-born over the garden climate and dresses in petals',
    !!WEATHER_DEFS.petalfall && !WEATHER_DEFS.petalfall.eventOnly
    && !!WEATHER_DEFS.petalfall.birthGeo
    && (WEATHER_DEFS.petalfall.dress?.rows ?? []).some(r => r.doodad === 'petal_drift')
    && !!WEATHER_FX.petalfall);
  check('fog: pollen_haze hangs over the blooms themselves',
    !!FOG_BANKS.pollen_haze && (FOG_BANKS.pollen_haze.haunt?.kinds ?? []).includes('bloom_stalk'));
  check('lore: every garden tileset carries its card (no gaps)',
    !BIOME_LORE_GAPS().missingLore.some(id =>
      ['petalfields', 'stalkwood', 'tendersrows', 'mulchreach', 'rootways', 'formicary'].includes(id)));
}

console.log(failed ? `\nprobe_garden: ${failed} FAILURE(S)` : '\nprobe_garden: ALL PASS');
process.exit(failed ? 1 : 0);
