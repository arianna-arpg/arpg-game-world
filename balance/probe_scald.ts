// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SCALD BASIN, M1 THE COUNTRY, end to end on the real
// registries and the real engine (charter docs/design/scald-basin.md §2/§6/
// §8/§10/§11/§13; kit data/scald.ts; docs docs/engine/scald.md). Pins:
//   A  THE BIOME ROW: 'scald' stands (geyserkin patron, the label, spacing,
//      the warm∧damp∧LOW claim — the basin), the BIOME_FIELD acreage, the
//      meld registered on inert kinds only (the census law), the Ascent
//      list join, the geyserkin tongue in BOTH name mills.
//   B  THE STAGING LAW: five faces — sinter terraces rim → geyser fields →
//      the Char flank → sulphur pools heart (pickTilesetForBiome over
//      biomeDepth), the steam galleries in the cave pool under a scald
//      anchor; every face biome-tagged, heat 1, heat-hazed, geysers row
//      linting clean, a lore row each; geyser_fields PROMOTED.
//   C  EVERY FACE MINTS: deterministic through the real layout path (same
//      seed → the same doodads), the kit kinds standing in them; the four
//      surface faces also mint LIVE through devMintTileset (biome + vents).
//   D  THE SULPHUR POOL ROW LAW: the mire band (30), fire through res, its
//      OWN sting id with no screen-fx row (the brine_burn lesson), the
//      scorch feed, NO douse (the brine-sink law — and no basin water
//      douses); live: wading it stings + wounds + climbs the bar, standing
//      NEAR it climbs the bar without a wound.
//   E  THE SCALD HEAT SWEEP reads the geyser resolver: a body on a broiling
//      mouth warms (entity seam), the hero too (faction-blind), a flier is
//      spared; scald mist feeds nothing by construction (no mist source).
//   F  THE BASKER: cool = torpor worn off an empty bar; fed past warmAt =
//      fury worn, torpor shed, fire res stripped (the warm window IS the
//      fire-vulnerable window), faster; cold's quench (chill) bleeds the bar
//      and the torpor returns; the tells read the bar's own band.
//   G  THE NO-TAG LAW + the kit nets: the shaman's kite budget is FINITE,
//      the basker lurks with a commit range, the strider is posted with a
//      shown fan, the kettleback's jet is a drive-gated rule; tells/looks
//      validate; wildlife ≥ 3 objective-exempt rows; the weather kinds.
// Run: npx tsx balance/probe_scald.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng, withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout } from '../src/engine/levelgen';
import { GEYSER_CFG, lintGeyserSpec, ventReadAt, type GeyserField, type PlacedVent } from '../src/engine/geysers';
import { STATUS_DEFS } from '../src/engine/status';
import { validateTells } from '../src/engine/tells';
import { BIOMES, BIOME_FIELD } from '../src/world/biomes';
import { regionKind, SURVIVAL_RESOURCES } from '../src/world/regions';
import { WEATHER_DEFS } from '../src/world/weather';
import { MELDS } from '../src/data/melds';
import { TILESETS, BIOME_LORE, pickTilesetForBiome, pickCaveFace } from '../src/data/tilesets';
import { MONSTERS, WILDLIFE } from '../src/data/monsters';
import { MONSTER_NAMES, rollMonsterName } from '../src/data/monsterNames';
import { NEMESIS_NAMES } from '../src/data/nemesis';
import { LOOKS } from '../src/data/looks';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { SCALD_CFG } from '../src/data/scald';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { STATUS_FX_REGISTRY } from '../src/render/screenFx';
import { WEATHER_FX } from '../src/render/vis/weatherFx';
import type { ZoneDef } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const DT = 1 / 60;
const step = (w: World, n: number): void => { for (let i = 0; i < n; i++) w.update(DT); };
const has = (a: Actor, id: string): boolean => a.statuses.some(s => s.id === id);
const SURFACE = ['sinter_terraces', 'geyser_fields', 'char_reach', 'sulphur_pools'] as const;
const FACES = [...SURFACE, 'steam_galleries'] as const;
const KIT_KINDS = ['sulphur_pool', 'prism_pool', 'mudpot', 'sinter_shelf', 'sulphur_crust', 'sinter_cone', 'steam_pocket', 'prism_sheen'];
const KIN = ['vent_shaman', 'stilt_strider', 'kettleback', 'mudpot_skipper', 'scald_basker', 'pool_newt', 'spring_moth', 'scald_gull'];

// ------------------------------------------------------ A) the biome row --
{
  const b = BIOMES.scald;
  check('A1 biome: scald stands — geyserkin patron, its label, a walked-into spacing',
    !!b && b.patronFaction === 'geyserkin' && b.label === 'The Scald Basin' && (b.spacing ?? 0) >= 80);
  const clim = (b?.climate ?? {}) as Record<string, unknown>;
  const elev = clim.elevation as { to?: number } | undefined;
  check('A2 biome: the claim is warm ∧ damp ∧ LOW ground (the basin — the volcanic inverse)',
    clim.temperature === 'warm' && clim.moisture === 'damp' && !!elev && (elev.to ?? 1) <= 0.55,
    JSON.stringify(clim));
  const row = BIOME_FIELD.find(r => r.biome === 'scald');
  check('A3 field: seeded as a discovery, not a belt (between butteland 1.2 and garden 1.7)',
    !!row && (row.weight ?? 1) >= 1.3 && (row.weight ?? 1) <= 1.7, `weight ${row?.weight}`);
  const meld = MELDS.scald_meld;
  check('A4 meld: scald_meld registered on the biome and speaks in steam',
    b?.meld === 'scald_meld' && !!meld && meld.rows.some(r => r.kind === 'steam_pocket'));
  check('A5 meld: exports NO active hazard onto a neighbor\'s border (the census law)',
    !!meld && meld.rows.every(r => !regionKind(r.kind)?.standDamage && !regionKind(r.kind)?.enterStatus));
  const ascent = readFileSync('src/packages/defs/ascent.ts', 'utf8');
  check('A6 ascent: \'scald\' joined geyserBiomes (where the deep water boils)',
    /geyserBiomes:\s*\[[^\]]*'scald'/.test(ascent));
  const mn = MONSTER_NAMES.byFaction.geyserkin;
  const nn = NEMESIS_NAMES.byFaction.geyserkin;
  check('A7 tongue: the geyserkin speak their own kettle in BOTH mills',
    !!mn?.prefixes?.length && !!mn?.epithets?.length && !!nn?.first?.length && !!nn?.epithets?.length);
  check('A8 tongue: the roller names a geyserkin from the kettle pools',
    rollMonsterName(() => 0.31, 'geyserkin').length > 3, rollMonsterName(() => 0.31, 'geyserkin'));
  check('A9 faction: the jotun/coven law — diplomacy-silent (defs + tongues, no war roster)',
    KIN.filter(id => MONSTERS[id]?.faction === 'geyserkin').length >= 2
    && !Object.prototype.hasOwnProperty.call(BIOMES, 'geyserkin'));
}

// --------------------------------------------------- B) the staging law --
{
  for (const id of FACES) {
    const t = TILESETS[id];
    check(`B0 face: ${id} stands`, !!t);
    if (!t) continue;
    check(`B1 face: ${id} — heat 1, heat-hazed, a lore row`,
      t.theme.heat === 1 && !!t.theme.ambientFx?.some(f => f.kind === 'heatHaze') && !!BIOME_LORE[id]);
    check(`B2 face: ${id} — the geysers row lints clean`,
      !!t.theme.geysers && lintGeyserSpec(t.theme.geysers, id).length === 0);
  }
  for (const id of SURFACE) {
    const t = TILESETS[id];
    check(`B3 face: ${id} is a scald frontier face with staging`,
      !!t && t.biome === 'scald' && t.frontier !== false && !!t.depthAffinity);
  }
  const g = TILESETS.steam_galleries;
  check('B4 cave face: the steam galleries claim the underground under a scald anchor, sheltered',
    !!g && g.frontier === false && g.sky === 'sheltered' && ((g.caveFace?.biomes?.scald as number) ?? 0) >= 4);
  const at = (depth: number): Record<string, number> => {
    const rng = new Rng(0x5ca1d ^ Math.round(depth * 1000));
    const seen: Record<string, number> = {};
    for (let i = 0; i < 240; i++) {
      const id = pickTilesetForBiome('scald', rng, depth) ?? 'none';
      seen[id] = (seen[id] ?? 0) + 1;
    }
    return seen;
  };
  const rim = at(0.06), mid = at(0.5), deep = at(0.94);
  check('B5 staging: the rim belongs to the sinter terraces (no heart, no Char at the gate)',
    (rim.sinter_terraces ?? 0) > 150 && !rim.sulphur_pools && !rim.char_reach, `rim ${JSON.stringify(rim)}`);
  check('B6 staging: the middle is the geyser fields with the Char threading the band',
    (mid.geyser_fields ?? 0) > 60 && (mid.char_reach ?? 0) > 40 && !mid.sinter_terraces, `mid ${JSON.stringify(mid)}`);
  check('B7 staging: the deep face is the sulphur heart (terraces and fields faded out entirely)',
    (deep.sulphur_pools ?? 0) > 150 && !deep.sinter_terraces && !deep.geyser_fields, `deep ${JSON.stringify(deep)}`);
  const cave = (anchor: string): number => {
    const rng = new Rng(0xca7e);
    let n = 0;
    for (let i = 0; i < 200; i++) if (pickCaveFace(2, anchor, rng) === 'steam_galleries') n++;
    return n;
  };
  const underScald = cave('scald'), underDesert = cave('desert');
  check('B8 staging: the galleries are the neighbourhood under scald country, a rarity elsewhere',
    underScald > 90 && underDesert < underScald / 3, `scald ${underScald}/200, desert ${underDesert}/200`);
  check('B9 promotion: geyser_fields wears the country (biome + the broad-middle staging)',
    TILESETS.geyser_fields.biome === 'scald' && (TILESETS.geyser_fields.depthAffinity?.to ?? 0) > 0.6);
}

// ------------------------------------------------- C) every face mints --
{
  const fp = (ds: { kind: string; pos: { x: number; y: number } }[]): string =>
    JSON.stringify(ds.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]));
  for (const id of FACES) {
    const t = TILESETS[id];
    if (!t) continue;
    let deterministic = true, nonEmpty = true, kitSeen = false;
    for (const seed of [11, 47, 90210]) {
      const def = {
        id: `probe_scald_${id}_${seed}`, name: 'Probe', level: 8, seed,
        biome: 'scald', size: { w: 2400, h: 1700 }, theme: t.theme,
        layout: t.layout, exits: [], map: { x: 2, y: 2 },
        objective: { kind: 'clear' },
      } as unknown as ZoneDef;
      const arena = { w: 2400, h: 1700 };
      const a = generateLayout(def, arena, new Rng(seed), vec(200, 850), []);
      const b = generateLayout(def, arena, new Rng(seed), vec(200, 850), []);
      deterministic = deterministic && fp(a.doodads) === fp(b.doodads);
      nonEmpty = nonEmpty && a.doodads.length > 0;
      kitSeen = kitSeen || a.doodads.some(d => KIT_KINDS.includes(d.kind as string));
    }
    check(`C1 mint: ${id} lays the same ground from the same seed, and stands the kit`,
      deterministic && nonEmpty && kitSeen);
  }
  // THE LIVE MINT (the real path): biome-tagged ground, vents dealt.
  let i = 0;
  for (const id of SURFACE) {
    const w = makeSimWorld('warrior', 101 + i);
    let ok = false, detail = '';
    withSeededRandom(0xbeef10 + i, () => {
      const zid = w.devMintTileset(id, 0.5, 8, { seed: 4242 + i });
      ok = !!zid && w.zone.biome === 'scald' && (w.zone.tileset === id) && w.doodads.length > 0
        && !!w.geysers && w.geysers.vents.length > 0;
      detail = `${zid ?? 'no zone'} biome=${w.zone.biome} tileset=${w.zone.tileset} vents=${w.geysers?.vents.length ?? 0}`;
    });
    check(`C2 live: ${id} mints through the real path — scald ground, the beat dealt`, ok, detail);
    i++;
  }
}

// ---------------------------------------------- D) the sulphur pool law --
{
  const rk = regionKind('sulphur_pool');
  check('D1 row: sulphur_pool at THE MIRE BAND (30 — speaks over mud and water, defers to the melt)',
    !!rk && rk.severity === 30 && rk.walkable && rk.standStatus === 'wading');
  check('D2 row: a fire DoT through RESISTANCE only (the lava doctrine, below the lethal class)',
    rk?.standDamage?.type === 'fire' && (rk?.standDamage?.dps ?? 0) > 0 && (rk?.standDamage?.dps ?? 99) < 14);
  check('D3 row: its OWN sting id (never the combat vignette — the brine_burn lesson)',
    rk?.enterStatus?.id === 'sulphur_sting' && !!STATUS_DEFS.sulphur_sting
    && STATUS_DEFS.sulphur_sting.element === 'fire' && !STATUS_FX_REGISTRY.sulphur_sting);
  check('D4 row: NO douse — hot caustic soup is not refuge (the brine-sink law)',
    !!rk && rk.douses === undefined);
  check('D5 row: the prism pool douses nothing either — no basin water is refuge (charter §7)',
    regionKind('prism_pool')?.douses === undefined && regionKind('prism_pool')?.standStatus === 'wading');
  check('D6 row: wading the pool FEEDS the scorch bar (the fill route, seats)',
    rk?.survival?.resource === 'scorch' && (rk?.survival?.drain ?? 0) > 0
    && SURVIVAL_RESOURCES.scorch?.polarity === 'fill');
  for (const k of KIT_KINDS) {
    const v = DOODAD_VISUALS[k];
    check(`D7 dress: '${k}' wears a visuals row on an honest painter`,
      !!v && ['liquid', 'mound', 'vent'].includes(v.painter));
  }
  // LIVE: wade it — sting + wound + the bar climbs; stand NEAR it — the bar
  // climbs, the body is whole.
  seedGlobalRandom(0x5ca1);
  const w = makeSimWorld('warrior', 0x5ca1);
  const p = w.player;
  const POOL = vec(1400, 1000);
  w.addTempGround(POOL, 'sulphur_pool', 90, 600);
  p.pos = vec(POOL.x, POOL.y);
  const life0 = p.life;
  step(w, 60);
  check('D8 live: the wader wears the pool (wading + the sting) and is WOUNDED',
    has(p, 'wading') && has(p, 'sulphur_sting') && p.life < life0 - 0.5, `life ${life0.toFixed(0)} → ${p.life.toFixed(0)}`);
  check('D9 live: the wader\'s scorch bar climbed (the fill route)', w.scorchOf(p) > 0.2, `bar ${w.scorchOf(p).toFixed(2)}`);
  // Step out to the rim: no wound, but the rim's warmth still climbs the bar.
  const w2 = makeSimWorld('warrior', 0x5ca2);
  const p2 = w2.player;
  w2.addTempGround(POOL, 'sulphur_pool', 90, 600);
  p2.pos = vec(POOL.x + 90 + SCALD_CFG.pool.reach - 6, POOL.y);
  const l2 = p2.life;
  step(w2, 120);
  check('D10 live: standing NEAR the pool warms the bar (her "being near") without a wound',
    w2.scorchOf(p2) > 0.2 && !has(p2, 'sulphur_sting') && p2.life >= l2 - 1e-6,
    `bar ${w2.scorchOf(p2).toFixed(2)}, Δlife ${(p2.life - l2).toFixed(2)}`);
}

// ------------------------------------ E) the heat sweep off the resolver --
{
  seedGlobalRandom(0x5ca3);
  const w = makeSimWorld('warrior', 0x5ca3);
  const vent: PlacedVent = { pos: vec(700, 500), cls: 'geyser', band: 0, period: 6, phase: 0, gate: new Map() };
  const field: GeyserField = { banding: { theta: 0, stripeW: 560, wobbleSeed: 1, n: 1 }, bands: [{ period: 6, phase: 0.5 }], vents: [vent] };
  w.geysers = field;
  w.geyserMode = 'bands';
  const mk = (id: string, at: { x: number; y: number }, prep?: (m: Actor) => void): Actor => {
    const m = w.createMonster(id, 3, 'enemy');
    m.pos = vec(at.x, at.y);
    prep?.(m);
    w.actors.push(m);
    return m;
  };
  const wolf = mk('plains_wolf', { x: 700, y: 500 });
  const flier = mk('plains_wolf', { x: 700, y: 500 }, m => { m.flyingBase = true; m.flying = true; });
  w.player.pos = vec(700, 500);
  // Walk to the END of the broil (just shy of the burst): the mouth has
  // been hot for the whole telegraph — no shove yet to move the bodies.
  const toB = ventReadAt(field, vent, w.time, 'bands').toBurst;
  step(w, Math.max(1, Math.floor((toB - 0.08) * 60)));
  const read = ventReadAt(field, vent, w.time, 'bands');
  check('E1 sweep: a body standing the broiling mouth WARMS (the entity seam reads the resolver)',
    read.phase === 'broil' && w.scorchOf(wolf) > 0.5, `phase ${read.phase}, bar ${w.scorchOf(wolf).toFixed(2)}`);
  check('E2 sweep: the hero on the same mouth warms too (faction-blind)', w.scorchOf(w.player) > 0.5,
    `bar ${w.scorchOf(w.player).toFixed(2)}`);
  check('E3 sweep: the airborne body is spared (fliers stand no ground)', w.scorchOf(flier) === 0);
  check('E4 sweep: mist feeds nothing — the sources are the column, the mouth, the pool (by construction)',
    Object.keys(SCALD_CFG).every(k => k !== 'mist') && SCALD_CFG.column.great >= SCALD_CFG.column.geyser
    && SCALD_CFG.column.geyser >= SCALD_CFG.column.hiss);
  check('E5 sweep: the trimmed fire window stands (her fourth-walk note, ~12% off the column-live seconds)',
    GEYSER_CFG.classes.hiss.eruptSec < 0.7 && GEYSER_CFG.classes.geyser.eruptSec < 0.9 && GEYSER_CFG.classes.great.eruptSec < 1.3);
}

// ------------------------------------------------------- F) THE BASKER --
{
  seedGlobalRandom(0x5ca4);
  const w = makeSimWorld('warrior', 0x5ca4);
  const def = MONSTERS.scald_basker;
  check('F1 basker: wears a bask spec with hysteresis, its two states registered, cold\'s quench named',
    !!def?.bask && def.bask.warmAt > def.bask.coolAt && !!STATUS_DEFS[def.bask.warmStatus]
    && !!STATUS_DEFS[def.bask.coolStatus] && def.bask.quench?.status === 'chill'
    && def.onHitByType?.cold?.status === 'chill');
  const m = w.createMonster('scald_basker', 5, 'enemy');
  m.pos = vec(1500, 1000);
  w.actors.push(m);
  step(w, 12);
  check('F2 basker: COOL on an empty bar — torpid (placid and armored), never furious',
    has(m, 'basking_torpor') && !has(m, 'basking_fury'));
  const fireRes0 = m.sheet.get('fireRes');
  const speedCool = m.sheet.get('moveSpeed');
  w.scorchFeed(m, def.bask!.warmAt + 0.5);
  step(w, 12);
  check('F3 basker: fed past the warm band — FURY worn, torpor shed (plates open)',
    has(m, 'basking_fury') && !has(m, 'basking_torpor'), `bar ${w.scorchOf(m).toFixed(2)}`);
  check('F4 basker: the warm window IS the fire-vulnerable window (the bar strips its fire res)',
    m.sheet.get('fireRes') < fireRes0 - 1e-6, `${fireRes0.toFixed(2)} → ${m.sheet.get('fireRes').toFixed(2)}`);
  check('F5 basker: fierce — faster warm than cool', m.sheet.get('moveSpeed') > speedCool * 1.3,
    `${speedCool.toFixed(0)} → ${m.sheet.get('moveSpeed').toFixed(0)}`);
  // Cold's answer: chilled, the bar BLEEDS and the torpor returns.
  const barWarm = w.scorchOf(m);
  m.applyStatus('chill', 0, 6, 'probe frost');
  step(w, 75);
  check('F6 basker: cold QUENCHES it early — the bar bled faster than the decay alone',
    w.scorchOf(m) < barWarm - 1.5, `bar ${barWarm.toFixed(2)} → ${w.scorchOf(m).toFixed(2)}`);
  check('F7 basker: cooled below the settle line, the torpor is back',
    has(m, 'basking_torpor') && !has(m, 'basking_fury'));
  check('F8 basker: the tells read the bar\'s OWN band (status:sunscorched — drawn == tested)',
    !!def?.tells?.length && def.tells.every(t => t.source === 'status:sunscorched'));
}

// ----------------------------------------- G) THE NO-TAG LAW + the nets --
{
  const sh = MONSTERS.vent_shaman;
  const kite = sh?.brain?.tempo?.kite;
  check('G1 no-tag: the vent-shaman\'s kite budget is FINITE (commit or quit by a clock)',
    typeof kite === 'number' && isFinite(kite) && kite > 0 && kite < 10, `kite ${kite}`);
  check('G2 no-tag: the shaman reads the broil (dodge) — the geyser-shepherd steps off in time',
    !!sh?.brain?.behavior?.dodge && (sh.brain.behavior.dodge.chance ?? 1) >= 0.9);
  const bk = MONSTERS.scald_basker;
  check('G3 no-tag: the cool basker LURKS with a commit range (never an endless stand-off)',
    bk?.brain?.move?.style === 'lurk' && (bk.brain.move.commitRange ?? 0) > 0);
  const st = MONSTERS.stilt_strider;
  check('G4 sentry: the stilt-strider is posted on a shown sweeping watch',
    st?.post === true && !!st.watch?.sweep && st.watch.fan === 'show'
    && !!st.tells?.some(t => t.source === 'watch'));
  const kb = MONSTERS.kettleback;
  const jetRule = kb?.brain?.rules?.find(r => r.actions?.some(a => a.do === 'cast' && (a as { skill?: string }).skill === 'scald_jet'));
  check('G5 gauge: the kettleback\'s jet is a drive-gated rule off the steam it visibly banks',
    !!jetRule && !!jetRule.when?.drive && jetRule.when.drive.id === 'steam'
    && !!kb?.tells?.some(t => t.source === 'drive:steam'));
  check('G6 gauge: the kettleback look leaves the back bare — the sac is a TELL (the mire_leech law)',
    !!LOOKS.kettleback && !LOOKS.kettleback.parts.some(p => p.kind === 'fillSac'));
  const defs: Record<string, typeof MONSTERS[string]> = {};
  for (const id of KIN) defs[id] = MONSTERS[id];
  const faults = validateTells(defs, PART_PAINTERS);
  check('G7 nets: every scald tell validates (sources live, painters exist)', faults.length === 0, faults.join('; '));
  check('G8 nets: every scald kin has a look whose parts all resolve',
    KIN.every(id => !!MONSTERS[id]?.look && !!LOOKS[MONSTERS[id].look!]
      && LOOKS[MONSTERS[id].look!].parts.every(p => !!PART_PAINTERS[p.kind])));
  const rows = WILDLIFE.scald ?? [];
  check('G9 wildlife: the basin breathes — ≥3 rows, every body objective-exempt texture',
    rows.length >= 3 && rows.every(r => !!MONSTERS[r.id] && (MONSTERS[r.id].tag === 'critter' || MONSTERS[r.id].tag === 'predator')));
  check('G10 wildlife: the gulls wheel unarmed — pure ambience, zero chase',
    MONSTERS.scald_gull?.skills.length === 0 && MONSTERS.scald_gull?.tag === 'critter' && MONSTERS.scald_gull?.flier === true);
  check('G11 kin: the skipper dies underfoot in files (squish + the worm file + a pack band)',
    !!MONSTERS.mudpot_skipper?.squish && !!MONSTERS.mudpot_skipper?.worm && !!MONSTERS.mudpot_skipper?.packSize);
  const mist = WEATHER_DEFS.scald_mist, rain = WEATHER_DEFS.mineral_rain;
  check('G12 weather: scald_mist — fog-family, barely dimming, born over the warm∧damp∧LOW basin',
    !!mist && (mist.radiance?.mul ?? 1) <= 0.8 && (mist.radiance?.mul ?? 0) >= 0.7
    && !!mist.birthGeo?.temperature && !!mist.birthGeo?.moisture && !!mist.birthGeo?.elevation && !mist.dress);
  check('G13 weather: mineral_rain dresses the ground in prism sheen (the petalfall model)',
    !!rain?.dress?.rows.some(r => r.doodad === 'prism_sheen') && !!DOODAD_VISUALS.prism_sheen);
  check('G14 weather: both kinds wear a particle look', !!WEATHER_FX.scald_mist && !!WEATHER_FX.mineral_rain);
}

console.log(failed ? `\nprobe_scald: ${failed} FAILURE(S)` : '\nprobe_scald: ALL PASS');
process.exit(failed ? 1 : 0);
