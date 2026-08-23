// ---------------------------------------------------------------------------
// ONE-OFF PROBE — M-HIT/DEATH (docs/design/show-dont-tell.md §3e/§3f): THE
// BODY'S VOICES — a death speaks its material, an impact speaks the blow's
// type, the body flash wears the blow's tint. Pins:
//   A. THE DEATH VOICE resolver: every MATERIAL_NATURE id resolves to a
//      REGISTERED voice (no silent ring); flesh spatters, crystal sparkles,
//      slime wet-pops, bone flecks, ember flares, ether wisps; an unknown
//      material falls to the dust (THE FALLBACK LAW).
//   B. THE HIT VOICE + TINT resolvers: fire flares, cold rimes, lightning
//      sparks, chaos spatters, a plain shaft flecks a body and dusts a wall;
//      every tint is a hex; dominantTypeOf/skillBaseTypeOf pick the heaviest
//      lane (undefined on nothing).
//   C. THE KILL: a killed body pushes a death flash wearing its material's
//      voice (crystal -> sparkle, chitin -> flecks).
//   D. THE STAMP: applyHit stamps Actor.hitFlashType with the packet's
//      dominant type beside the flash clock (the renderer reads both).
//   E. THE SEATS (source-lint): world.ts death flashes call deathVoiceOf, the
//      projectile impacts call hitVoiceOf, damage.ts stamps via
//      dominantTypeOf, the renderer tints via hitTintOf.
// Run: npx tsx balance/probe_bodyvoices.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { BODY_VOICE_CFG, deathVoiceOf, hitVoiceOf, hitTintOf, dominantTypeOf, skillBaseTypeOf } from '../src/engine/bodyVoices';
import { applyHit } from '../src/engine/damage';
import { DAMAGE_TYPES, type DamageType } from '../src/engine/stats';
import { MATERIAL_NATURE } from '../src/data/monsters';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
// THE VOICES live in the render modules that register them — imported for their side effects (the headless boot never draws).
import '../src/render/vis/dissolveLayer';
import '../src/render/vis/statusVoiceLayer';
import '../src/render/vis/worldVoices';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
bootSimEngine();
seedGlobalRandom(0xb0d1);
const w = makeSimWorld('warrior', 0xb0d1);
const hero = w.player;
const HEX = /^#[0-9a-f]{6}$/i;

// ------------------------------------------------- A. the death voice
{
  const mats = Object.keys(MATERIAL_NATURE);
  const unreg = mats.filter(m => !effectVoiceOf(deathVoiceOf(m)));
  check('A1 every MATERIAL_NATURE id resolves to a REGISTERED voice', mats.length > 8 && unreg.length === 0, unreg.join(',') || `${mats.length} materials`);
  const unmapped = mats.filter(m => !(m in BODY_VOICE_CFG.death));
  check('A2 every material is NAMED in the table (no silent fallback on a known body)', unmapped.length === 0, unmapped.join(',') || 'all named');
  check('A3 flesh spatters / crystal sparkles / slime wet-pops / bone flecks / ember flares / ethereal wisps',
    deathVoiceOf('flesh') === 'spatter' && deathVoiceOf('crystal') === 'sparkle' && deathVoiceOf('slime') === 'wetpop'
    && deathVoiceOf('bone') === 'flecks' && deathVoiceOf('ember') === 'flare' && deathVoiceOf('ethereal') === 'wisp');
  check('A4 THE FALLBACK LAW: an unknown material + no material fall to the dust',
    deathVoiceOf('unobtainium') === BODY_VOICE_CFG.deathFallback && deathVoiceOf(undefined) === BODY_VOICE_CFG.deathFallback && !!effectVoiceOf(BODY_VOICE_CFG.deathFallback));
}

// ------------------------------------------------- B. the hit voice + tint
{
  check('B1 fire flares / cold rimes / lightning sparks / chaos spatters (body and wall alike)',
    hitVoiceOf('fire', 'body') === 'flare' && hitVoiceOf('cold', 'wall') === 'rime' && hitVoiceOf('lightning', 'body') === 'spark' && hitVoiceOf('chaos', 'wall') === 'spatter');
  check('B2 a plain shaft FLECKS a body and DUSTS a wall; no type falls to the wall fallback',
    hitVoiceOf('physical', 'body') === 'flecks' && hitVoiceOf('physical', 'wall') === 'dust' && hitVoiceOf(undefined, 'wall') === BODY_VOICE_CFG.hitFallback && hitVoiceOf(undefined, 'body') === BODY_VOICE_CFG.hitFallback);
  const unregHit = DAMAGE_TYPES.flatMap(t => ['body', 'wall'] as const).filter((s, i) => !effectVoiceOf(hitVoiceOf(DAMAGE_TYPES[Math.floor(i / 2)], s)));
  check('B3 every hit voice is a REGISTERED voice', unregHit.length === 0);
  const badTint = DAMAGE_TYPES.filter(t => !HEX.test(hitTintOf(t)));
  check('B4 every tint is a hex color; no type reads white (the plain flash)', badTint.length === 0 && HEX.test(hitTintOf(undefined)) && hitTintOf('physical').toLowerCase() === '#ffffff', badTint.join(','));
  check('B5 dominantTypeOf picks the heaviest lane / undefined on nothing',
    dominantTypeOf({ fire: 3, cold: 9, physical: 2 }) === 'cold' && dominantTypeOf({}) === undefined && dominantTypeOf(undefined) === undefined);
  check('B6 skillBaseTypeOf picks the heaviest range mid / undefined on nothing',
    skillBaseTypeOf({ physical: [1, 3], lightning: [0, 10] } as Partial<Record<DamageType, [number, number]>>) === 'lightning' && skillBaseTypeOf({}) === undefined && skillBaseTypeOf(undefined) === undefined);
}

// ------------------------------------------------- C. the kill speaks its material
{
  const fxOf = (f: unknown): string | undefined => (f as { fx?: string }).fx;
  const crystal = w.createMonster('tomb_phylactery', 8, 'enemy');
  crystal.pos = vec(hero.pos.x + 220, hero.pos.y); w.actors.push(crystal);
  const chitin = w.createMonster('broodling', 8, 'enemy');
  chitin.pos = vec(hero.pos.x - 220, hero.pos.y); w.actors.push(chitin);
  check('C0 the fixtures wear the expected materials', crystal.material === 'crystal' && chitin.material === 'chitin', `${crystal.material}/${chitin.material}`);
  let n = w.flashes.length;
  w.kill(crystal, false, hero);
  const cf = w.flashes.slice(n).map(fxOf);
  check('C1 a dying crystal body SPARKLES (death flash fx = deathVoiceOf(material))', cf.includes('sparkle'), cf.join(',') || 'no flash');
  n = w.flashes.length;
  w.kill(chitin, false, hero);
  const kf = w.flashes.slice(n).map(fxOf);
  check('C2 a dying chitin body FLECKS', kf.includes('flecks'), kf.join(',') || 'no flash');
  check('C3 no death flash falls to the bare ring (every fx names a registered voice)', [...cf, ...kf].every(fx => !!fx && !!effectVoiceOf(fx)));
}

// ------------------------------------------------- D. the stamp
{
  const m = w.createMonster('broodling', 8, 'enemy');
  m.pos = vec(hero.pos.x, hero.pos.y + 200); w.actors.push(m);
  applyHit(hero, m, { amounts: { cold: 4, physical: 1 }, crit: false, tags: new Set(), sourceName: 'probe' });
  check('D1 applyHit stamps Actor.hitFlashType with the dominant type beside the flash clock', m.hitFlashType === 'cold' && m.hitFlash > 0, `${m.hitFlashType} flash ${m.hitFlash}`);
  applyHit(hero, m, { amounts: { fire: 9, cold: 1 }, crit: false, tags: new Set(), sourceName: 'probe' });
  check('D2 the next blow re-stamps (the tint follows the LAST blow)', m.hitFlashType === 'fire');
}

// ------------------------------------------------- E. the seats (source-lint)
{
  const world = readFileSync('src/engine/world.ts', 'utf8');
  const dmg = readFileSync('src/engine/damage.ts', 'utf8');
  const rend = readFileSync('src/render/renderer.ts', 'utf8');
  const count = (s: string, t: string): number => s.split(t).length - 1;
  check('E1 world.ts death flashes speak deathVoiceOf (actor + part + worm segment = 3 seats)', count(world, 'fx: deathVoiceOf(') >= 3, `${count(world, 'fx: deathVoiceOf(')}`);
  check('E2 world.ts projectile impacts speak hitVoiceOf (body + 2 wall stops)', count(world, 'fx: hitVoiceOf(') >= 3 && world.includes("enemy.hitFlashType ?? p.conductElem ?? skillBaseTypeOf(p.inst.def.baseDamage), 'body'"), `${count(world, 'fx: hitVoiceOf(')}`);
  check('E3 damage.ts stamps hitFlashType = dominantTypeOf(packet.amounts) at the landing sites', count(dmg, 'hitFlashType = dominantTypeOf(packet.amounts)') >= 2, `${count(dmg, 'hitFlashType = dominantTypeOf(packet.amounts)')}`);
  check('E4 the renderer tints the body flash through hitTintOf(a.hitFlashType)', rend.includes('hitTintOf(a.hitFlashType)'));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
