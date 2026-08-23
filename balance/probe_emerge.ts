// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE EMERGENCE GRAMMAR (engine/emerge.ts, World.emergeBody,
// the hooks in springAmbush / popBrittle WAKE / the minion births / the pours,
// the canvas-free half of render/vis/emergeLayer.ts). Design authority
// docs/design/show-dont-tell.md §3b (M-EMERGE); engine doc docs/engine/emergence.md.
//   A. THE FOLD — a row naming only a ground (or only a motion) resolves whole;
//      precedence row > ground > motion > base; a host with no row bursts out;
//      a bare seat rises by its ground; unknown → null; the six motions stand.
//   B. THE GROUND DERIVATION — region first (water surfaces anywhere), then
//      the country (desert sand, tundra snow, marsh mire, flesh, aether light),
//      else earth — pure.
//   C. THE SPRING — an armed hidden ambusher springs into an arrival: a record,
//      the hold (untargetable + no thinking for exactly the life), the flash
//      wears the voice (no bare ring), NO caption; the pack chain arrives too;
//      release = targetable again, drawn == tested.
//   D. THE WAKE — a breakable's spawn bursts out of its host (records per
//      body, no 'the dead wake!' line).
//   E. DETERMINISM — pose + grains pure f(seed, t); the seed pure f(seat, id).
//   F. THE HONEST DEGRADE — past EMERGE_CFG.maxLive no record, no hold; the
//      body stands.
//   G. THE VISIBLE SLEEPER stirs (no hold; the body stays targetable).
//   H. THE RETIREMENT CENSUS — no MonsterDef ambush spec speaks; zone clear.
// Run: npx tsx balance/probe_emerge.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import {
  EMERGE_CFG, EMERGE_GROUNDS, emergeFor, emergeGrain, emergeGrainCount, emergeGroundFor, emergeMotionIds,
  emergePose, emergeSeedOf, emergeSlit, resolveEmerge,
} from '../src/engine/emerge';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/dissolveLayer'; // registers the dust / sparkle / wetpop / wisp voices the ground rows name
import { registerDoodadRule, normalizeDoodadBound, type Doodad, type DoodadKind } from '../src/engine/levelgen';
import type { Actor } from '../src/engine/actor';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5e11a7e);
const DT = 1 / 60;

// ------------------------------------------------- A. the fold
{
  const sand = resolveEmerge({ ground: 'sand' });
  check('A1 a row naming only its GROUND resolves whole (sand → rise, grit grains, dust)',
    !!sand && sand.motion === 'rise' && sand.grainShape === 'grit' && sand.voice === 'dust' && sand.life > 0 && sand.hold === true);
  const water = resolveEmerge({ ground: 'water' });
  check('A2 water SURFACES with droplets and the wet voice', !!water && water.motion === 'surface' && water.grainShape === 'drop' && water.voice === 'wetpop');
  const light = resolveEmerge({ ground: 'light' });
  check('A3 light CONDENSES under the haze ring, no voice', !!light && light.motion === 'condense' && light.haze === 1 && light.voice === false);
  const row = resolveEmerge({ motion: 'drop', ground: 'sand', life: 0.2, grains: [1, 1] });
  check('A4 precedence row > ground > motion (drop motion, sand grains, the row life + count)',
    !!row && row.motion === 'drop' && row.grainShape === 'grit' && row.life === 0.2 && row.grains[0] === 1);
  check('A5 a HOST with no row bursts out; a bare seat rises by its ground; no row + no ground = null',
    emergeFor([], 'earth', true)?.motion === 'burstout' && emergeFor([], 'snow', false)?.motion === 'rise'
    && emergeFor([], 'snow', false)?.grainShape === 'flake' && emergeFor([], null, false) === null);
  check('A6 an instance row wins over the def row (stir over a def rise)',
    emergeFor([{ motion: 'stir' }, { motion: 'rise' }], 'earth', false)?.motion === 'stir');
  check('A7 unknown motions / grounds resolve null', resolveEmerge({ motion: 'teleport' }) === null && resolveEmerge({ ground: 'aether_glass' }) === null);
  check('A8 the six built-in motions stand', ['rise', 'burstout', 'condense', 'surface', 'drop', 'stir'].every(m => emergeMotionIds().includes(m)));
  check('A9 every ground row names a registered motion and a registered voice (or none)',
    Object.values(EMERGE_GROUNDS).every(g => emergeMotionIds().includes(g.motion) && (g.voice === false || g.voice === undefined || !!effectVoiceOf(g.voice))));
}

// ------------------------------------------------- B. the ground derivation
{
  check('B1 region first: water surfaces in any country; lava; bog → mire; ice → snow',
    emergeGroundFor('desert', 'water') === 'water' && emergeGroundFor('grove', 'lava') === 'lava'
    && emergeGroundFor('field', 'bog') === 'mire' && emergeGroundFor('jungle', 'ice') === 'snow');
  check('B2 then the country: desert sand · tundra snow · marsh mire · caul flesh · volcanic ash · cavern stone · jungle verdure · aether light · field earth',
    emergeGroundFor('desert', undefined) === 'sand' && emergeGroundFor('tundra', undefined) === 'snow'
    && emergeGroundFor('marsh', undefined) === 'mire' && emergeGroundFor('caul', undefined) === 'flesh'
    && emergeGroundFor('volcanic', undefined) === 'ash' && emergeGroundFor('cavern', undefined) === 'stone'
    && emergeGroundFor('jungle', undefined) === 'verdure' && emergeGroundFor('aether_spires', undefined) === 'light'
    && emergeGroundFor('field', undefined) === 'earth' && emergeGroundFor(undefined, undefined) === 'earth');
}

// ------------------------------------------------- the world
const w = makeSimWorld('warrior', 0x5e11a7e);
type Priv = { createMonster: (id: string, lv: number, team: 'enemy' | 'player') => Actor; popBrittle: (d: Doodad, s?: Actor | null, at?: { x: number; y: number } | null) => void };
const priv = w as unknown as Priv;
const hero = w.player;
const settle = (n = 1): void => { for (let i = 0; i < n; i++) w.update(DT); };
const stand = (id: string, x: number, y: number): Actor => {
  const m = priv.createMonster(id, Math.max(1, w.zone.level), 'enemy');
  m.pos = w.clampPos(vec(x, y), m.radius);
  w.actors.push(m);
  return m;
};

// ------------------------------------------------- C. the spring
{
  const a = stand('skeleton_warrior', hero.pos.x + 140, hero.pos.y);
  // The INSTANCE lane (spawner rows) stamps the spec on the body, then arms it.
  a.ambushSpec = { radius: 60, emerge: { ground: 'sand' } };
  w.armAmbush(a, a.ambushSpec);
  check('C1 an armed hidden ambusher is untargetable and invisible before the spring', a.ambushArmed && a.untargetable === true);
  const textsBefore = w.texts.length, flashesBefore = w.flashes.length;
  w.springAmbush(a);
  const rec = w.emergences.find(r => r.actorId === a.id);
  check('C2 the spring stamps ONE arrival record (the ambush row: sand → rise) with the seat-hash seed', !!rec && w.emergences.filter(r => r.actorId === a.id).length === 1
    && rec.spec.motion === 'rise' && rec.spec.ground === 'sand' && rec.seed === emergeSeedOf(a.pos.x, a.pos.y, a.id), rec ? `${rec.spec.motion}/${rec.spec.ground} life ${rec.life}` : 'no record');
  check('C3 THE HOLD: the body is untargetable + unthinking for the life (drawn == tested), not armed', !a.ambushArmed && a.untargetable === true && a.emergeUntil !== undefined && Math.abs(a.emergeUntil - (w.time + rec!.life)) < 1e-6);
  check('C4 the flash wears the voice (no bare ring) and NO caption spoke', w.flashes.slice(flashesBefore).some(f => (f as { fx?: string }).fx === 'dust') && w.texts.length === textsBefore);
  const life = rec!.life;
  settle(Math.ceil(life / DT) + 2);
  check('C5 RELEASE at the life\'s end: the record leaves, the body is targetable and free to think', !w.emergences.some(r => r.actorId === a.id) && a.untargetable === false && a.emergeUntil === undefined);
  // the pack chain: two kin armed, one sprung → both arrive
  const b = stand('skeleton_warrior', hero.pos.x + 200, hero.pos.y + 60);
  const c = stand('skeleton_warrior', hero.pos.x + 260, hero.pos.y + 60);
  b.ambushSpec = { radius: 60, pack: 200 }; c.ambushSpec = { radius: 60, pack: 200 };
  w.armAmbush(b, b.ambushSpec); w.armAmbush(c, c.ambushSpec);
  w.springAmbush(b);
  check('C6 the pack chain: every chained kin arrives with its own record (the seat\'s ground, no row)', w.emergences.some(r => r.actorId === b.id) && w.emergences.some(r => r.actorId === c.id));
  settle(Math.ceil(0.8 / DT));
}

// ------------------------------------------------- D. the wake (the brittle host)
registerDoodadRule('qa_emerge_urn', { overlap: 'inert', spacing: 0,
  brittle: { on: ['touch'], color: '#b8a890', spawn: { monster: 'skeleton_warrior', count: [2, 2], chance: 1 } },
  dissolve: { material: 'ceramic' } });
{
  const at = vec(hero.pos.x, hero.pos.y);
  const urn: Doodad = { pos: vec(at.x, at.y), radius: 16, kind: 'qa_emerge_urn' as DoodadKind, rot: 0 };
  normalizeDoodadBound(urn); w.doodads.push(urn); w.markDoodadsChanged();
  const before = new Set(w.actors.map(x => x.id)); const textsBefore = w.texts.length;
  settle(1);
  const born = w.actors.filter(x => !before.has(x.id) && !x.dead);
  check('D1 the wake\'s bodies BURST OUT of the host: a record per body, motion burstout, held', born.length === 2 && born.every(x => { const r = w.emergences.find(q => q.actorId === x.id); return !!r && r.spec.motion === 'burstout' && x.untargetable === true; }), `born ${born.length}`);
  check('D2 no caption spoke at the wake (the spawn text retired)', w.texts.length === textsBefore);
  settle(Math.ceil(0.6 / DT));
  check('D3 the wake\'s bodies are released targetable', born.every(x => x.untargetable === false && x.emergeUntil === undefined));
}

// ------------------------------------------------- E. determinism
{
  const spec = resolveEmerge({ ground: 'sand' })!;
  const seed = emergeSeedOf(100, 200, 7);
  const p1 = emergePose(spec, seed, 0.2, 14), p2 = emergePose(spec, seed, 0.2, 14);
  check('E1 the pose is pure f(seed, t)', JSON.stringify(p1) === JSON.stringify(p2) && emergeSeedOf(100, 200, 7) === seed && emergeSeedOf(100, 200, 8) !== seed);
  const n = emergeGrainCount(spec, seed);
  const g1 = emergeGrain(spec, seed, 0, n, 0.4, 14), g2 = emergeGrain(spec, seed, 0, n, 0.4, 14);
  check('E2 the grains are pure f(seed, i, t) and counted inside the band', JSON.stringify(g1) === JSON.stringify(g2) && n >= spec.grains[0] && n <= spec.grains[1]);
  let sane = true;
  for (const id of emergeMotionIds()) {
    const s = emergeFor([{ motion: id }], 'earth', id === 'burstout')!;
    for (let t = 0; t <= s.life + 1e-9; t += s.life / 24) {
      const p = emergePose(s, seed, t, 14);
      if (![p.dx, p.dy, p.sx, p.sy, p.alpha, p.shear, p.shadow].every(Number.isFinite) || p.alpha < 0 || p.alpha > 1.001 || p.sx <= 0 || p.sy <= 0) sane = false;
    }
    const end = emergePose(s, seed, s.life, 14);
    if (Math.abs(end.dx) > 1e-6 || Math.abs(end.dy) > 1e-6 || Math.abs(end.sx - 1) > 1e-6 || Math.abs(end.sy - 1) > 1e-6 || end.alpha < 0.999) sane = false;
  }
  check('E3 every motion\'s pose is finite, bounded, and STANDS at the end of its life (dx/dy 0, scale 1, alpha 1)', sane);
  check('E4 the slit gapes then closes for rise/surface and never for the rest', emergeSlit(spec, spec.life * EMERGE_CFG.slit.peak) > 0.95 && emergeSlit(spec, spec.life) < 1e-6 && emergeSlit(resolveEmerge({ motion: 'drop' })!, 0.1) === 0);
}

// ------------------------------------------------- F. the honest degrade
{
  w.emergences.length = 0;
  const bodies: Actor[] = [];
  for (let i = 0; i < EMERGE_CFG.maxLive + 3; i++) bodies.push(stand('skeleton_warrior', hero.pos.x + 120 + i * 9, hero.pos.y - 160));
  let recs = 0;
  for (const b of bodies) if (w.emergeBody(b, {})) recs++;
  const past = bodies.slice(EMERGE_CFG.maxLive);
  check('F1 THE CAP: records stop at EMERGE_CFG.maxLive', recs === EMERGE_CFG.maxLive && w.emergences.length === EMERGE_CFG.maxLive, `${recs} vs cap ${EMERGE_CFG.maxLive}`);
  check('F2 THE HONEST DEGRADE: a body past the cap simply STANDS (no hold, targetable, thinking)', past.every(b => b.untargetable === false && b.emergeUntil === undefined));
  settle(Math.ceil(0.8 / DT));
  check('F3 every held body is released by the end of the longest life', bodies.every(b => b.untargetable === false && b.emergeUntil === undefined) && w.emergences.length === 0);
}

// ------------------------------------------------- G. the visible sleeper
{
  const s = stand('skeleton_warrior', hero.pos.x - 150, hero.pos.y);
  s.ambushSpec = { radius: 60, visible: true };
  w.armAmbush(s, s.ambushSpec);
  check('G1 a VISIBLE ambusher waits targetable (no invisibility)', s.ambushArmed && s.untargetable === false);
  w.springAmbush(s);
  const rec = w.emergences.find(r => r.actorId === s.id);
  check('G2 the sleeper STIRS when sprung — no hold, still targetable, a record of motion stir', !!rec && rec.spec.motion === 'stir' && rec.held === false && s.untargetable === false && s.emergeUntil === undefined);
}

// ------------------------------------------------- H. the retirement census + the zone clear
{
  const speaking = Object.entries(MONSTERS).filter(([, d]) => (d.ambush as { announce?: string } | undefined)?.announce !== undefined).map(([id]) => id);
  check('H1 THE RETIREMENT CENSUS: no MonsterDef ambush spec speaks a caption (the emergence is the sentence)', speaking.length === 0, speaking.join(', '));
  const withRows = Object.values(MONSTERS).filter(d => d.ambush?.emerge || d.emerge).length;
  check('H2 the authored overrides stand (the casket bursts out, the patch stirs, the light condenses…)', withRows >= 20
    && MONSTERS.casket_maw?.ambush?.emerge?.motion === 'burstout' && MONSTERS.patch_lurker?.ambush?.emerge?.motion === 'stir'
    && MONSTERS.false_sovereign?.ambush?.emerge?.ground === 'light', `${withRows} rows`);
  const a = stand('skeleton_warrior', hero.pos.x + 100, hero.pos.y + 100);
  w.emergeBody(a, {});
  const had = w.emergences.length > 0;
  w.loadZone(SIM_ARENA_ID);
  check('H3 a zone (re)load clears the arrivals (zone-local after-images)', had && w.emergences.length === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
