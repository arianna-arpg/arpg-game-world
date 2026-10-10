// ---------------------------------------------------------------------------
// PROBE: THE FORESIGHT ON THE WIRE (W11; docs/engine/shard.md "THE FORESIGHT ON
// THE WIRE", charter §7e A7): an enemy wind-up's drawn geometry is one pure
// resolve on the host (engine/foresight.ts), a row on the wire (`CastW.fg`,
// net/foresightWire.ts), and a painter (render/vis/foresightLayer.ts) that never
// resolves a client's stub, whose def carries no delivery: the resolve threw
// there and killed every hosted and co-op client's loop on an enemy's wind-up.
//
//   npx tsx balance/probe_shardforesight.ts
//
// Pins:
//   A  THE PARITY (a seeded solo world, the casts real where useSkill stands one):
//      for every kind the painter draws (a ground ring, a melee swing, a breath
//      cone, a hostile nova, a banded swing and a sigil's band, an edge-only cone
//      and nova, a channel, a swing aimed at the body) and every kind it draws
//      nothing for (a guard stance, a guard-mode swing, an allied nova, a summon, a
//      leap, a flight), foresightOf equals the old painter's math field for field,
//      and the new painter's canvas calls equal the old painter's call for call,
//      every argument to the last bit, at two points of the wind-up: solo and the
//      co-op host draw today's pixels
//   B  THE HOSTED ROW: an enemy's ground cast and melee swing on a real shard ship
//      `fg` on every snapshot of the wind-up (the host's own resolve, rounded), a
//      client inflates it inside the diet's grid, its shell's stub carries it with
//      the host's aim and reach, and the painter's read returns it and paints the
//      host's figure; THE IDENTITY ONCE never strikes it; no row rides after the
//      cast or for a cast that draws nothing
//   C  THE STUB: the old crash's own shape (a def with a color and no delivery)
//      still throws in instanceDelivery, yet the painter's read answers null and
//      paints nothing; a vent leap's stub, an id-less ground stub and an adopted
//      stub with no row read none too; a malformed row reads none
//   D  THE BROADCAST LANE: the co-op host's serializeSnapshot carries the row
//      through the WebRTC lane's JSON round trip, and a co-op client's stub draws
//      the host's figure (no grid on that lane: the row exactly)
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport } from '../src/net/ws';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { World } from '../src/engine/world';
import type { Actor, CastingState } from '../src/engine/actor';
import {
  AOE_SHAPE, bandSwingGeo, instanceCastMode, instanceDelivery, instanceMods, makeSkillInstance, skillContextTags,
  type SkillDef, type SkillInstance,
} from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { clamp, dist, vec, type Vec2 } from '../src/core/math';
import { foresightOf, foresightView, type ForesightGeo } from '../src/engine/foresight';
import { drawForesight, foresightProgress } from '../src/render/vis/foresightLayer';
import { traceAoePath } from '../src/render/vis/aoeTrace';
import { foresightOfRow, FORESIGHT_W_KIND, type ForesightW } from '../src/net/foresightWire';
import { applySnapshot, applyZone, serializeSnapshot, serializeZone, type ActorW, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { DIET_IDENTITY, WIRE_DIET_CFG, dietGrid, dietKept, dietRow } from '../src/net/wireDiet';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
const TAU = Math.PI * 2;
const GRID = 1 / WIRE_DIET_CFG.posSteps, TURN = TAU / WIRE_DIET_CFG.turnSteps;

// ------------------------------------------------------------- the recorders --

/** A canvas that writes every call and every property set as text (each number to the
 *  last bit: JSON prints the shortest round-trip form). */
function recorder(): { ctx: CanvasRenderingContext2D; log: string[] } {
  const log: string[] = [];
  const state = new Map<string, unknown>([['globalAlpha', 1]]);
  const ctx = new Proxy({}, {
    get(_t, k) {
      if (typeof k !== 'string') return undefined;
      if (state.has(k)) return state.get(k);
      return (...args: unknown[]): void => { log.push(`${k}(${JSON.stringify(args)})`); };
    },
    set(_t, k, v) { log.push(`${String(k)}=${JSON.stringify(v)}`); state.set(String(k), v); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

/** THE OLD PAINTER, verbatim (renderer.ts drawActor's foresight before W11, the settings
 *  gate aside): the parity's other side. */
function oldPaint(ctx: CanvasRenderingContext2D, a: Actor, x: number, y: number, baseAlpha: number): void {
  if (a.team === 'enemy' && a.casting) {
    const fc = a.casting;
    const del = instanceDelivery(fc.inst);
    const prog = fc.mode === 'channel'
      ? (fc.total > 0 ? clamp(1 - Math.max(0, fc.pulseTimer ?? 0) / fc.total, 0, 1) : 1)
      : (fc.total > 0 ? clamp(fc.elapsed / fc.total, 0, 1) : 1);
    if (del.type === 'ground') {
      const aim = fc.lockedAim ?? fc.aim;
      const rr = del.radius;
      ctx.save();
      ctx.translate(aim.x, aim.y);
      ctx.strokeStyle = fc.inst.def.color;
      ctx.globalAlpha = 0.18 + 0.3 * prog;
      ctx.lineWidth = 1.5 + prog * 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.05 + 0.09 * prog;
      ctx.fillStyle = fc.inst.def.color;
      ctx.beginPath();
      ctx.arc(0, 0, rr * (0.35 + 0.65 * prog), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 + 0.4 * prog;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = baseAlpha;
    } else if ((del.type === 'melee' || del.type === 'cone'
      || (del.type === 'nova' && del.affects !== 'allies')) && fc.mode !== 'guard') {
      const tags = skillContextTags(fc.inst.def);
      const extra = instanceMods(fc.inst);
      const aim = fc.lockedAim ?? fc.aim;
      const aoeScale = a.sheet.get('aoeRadius', tags, extra);
      const ang = del.type === 'nova' ? 0
        : fc.mode === 'channel' || dist(a.pos, aim) < 2
          ? a.facing
          : Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
      const reach = del.type === 'melee'
        ? (a.radius + del.range) * a.sheet.get('meleeReach', tags, extra)
        : del.type === 'cone'
          ? del.range * aoeScale * a.sheet.get('meleeReach', tags, extra)
          : del.radius * aoeScale;
      const arcRad = del.type === 'nova' ? Math.PI * 2
        : Math.min(Math.PI * 2, (del.arcDeg * Math.PI / 180)
          * (del.type === 'melee' ? Math.sqrt(aoeScale) : 1)
          * a.sheet.get('swingArc', tags, extra));
      const inner = del.type !== 'melee' && del.edgeOnly ? reach * del.edgeOnly : 0;
      const full = arcRad >= Math.PI * 2 - 0.01;
      const wedge = (r0: number, r1: number): void => {
        ctx.beginPath();
        if (full) {
          ctx.arc(x, y, r1, 0, Math.PI * 2);
          if (r0 > 0) ctx.arc(x, y, r0, Math.PI * 2, 0, true);
        } else if (r0 > 0) {
          ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
          ctx.arc(x, y, r0, ang + arcRad / 2, ang - arcRad / 2, true);
          ctx.closePath();
        } else {
          ctx.moveTo(x, y);
          ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
          ctx.closePath();
        }
      };
      ctx.save();
      ctx.strokeStyle = fc.inst.def.color;
      ctx.globalAlpha = 0.18 + 0.3 * prog;
      ctx.lineWidth = 1.5 + prog * 1.5;
      ctx.setLineDash([6, 6]);
      const swingShape = del.type === 'melee'
        ? a.sheet.get('aoeShape', tags, extra, AOE_SHAPE[del.shape ?? 'circle']) : 0;
      const bandGeo = swingShape === AOE_SHAPE.band ? bandSwingGeo(reach, arcRad) : null;
      const bandC = bandGeo
        ? { x: x + Math.cos(ang) * bandGeo.standoff, y: y + Math.sin(ang) * bandGeo.standoff }
        : null;
      const figure = (r1: number): void => {
        if (bandGeo && bandC) {
          ctx.beginPath();
          traceAoePath(ctx, bandC.x, bandC.y, bandGeo.halfWidth * (r1 / reach), AOE_SHAPE.band, ang);
        } else {
          wedge(inner, r1);
        }
      };
      figure(reach);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.05 + 0.09 * prog;
      ctx.fillStyle = fc.inst.def.color;
      figure(Math.max(inner + 2, reach * (0.35 + 0.65 * prog)));
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = baseAlpha;
    }
  }
}

/** THE NEW PAINTER: renderer.ts drawActor's foresight block (the settings gate aside). */
function newPaint(ctx: CanvasRenderingContext2D, a: Actor, x: number, y: number, baseAlpha: number): void {
  if (a.team === 'enemy' && a.casting) {
    const fc = a.casting;
    const geo = foresightView(a, fc);
    if (geo) drawForesight(ctx, geo, x, y, a.facing, foresightProgress(fc), baseAlpha);
  }
}

/** The fields the old painter drew from, by its own math (ground: aim, radius, color;
 *  wedge: reach, inner rim, arc, bearing, the band's strip, color). */
function oldFields(a: Actor, fc: CastingState): Record<string, number | string> | null {
  const del = instanceDelivery(fc.inst);
  if (del.type === 'ground') {
    const aim = fc.lockedAim ?? fc.aim;
    return { kind: 'ground', ax: aim.x, ay: aim.y, reach: del.radius, color: fc.inst.def.color };
  }
  if (!((del.type === 'melee' || del.type === 'cone' || (del.type === 'nova' && del.affects !== 'allies')) && fc.mode !== 'guard')) return null;
  const tags = skillContextTags(fc.inst.def), extra = instanceMods(fc.inst), aim = fc.lockedAim ?? fc.aim;
  const aoeScale = a.sheet.get('aoeRadius', tags, extra);
  const ang = del.type === 'nova' ? 0 : fc.mode === 'channel' || dist(a.pos, aim) < 2 ? a.facing : Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
  const reach = del.type === 'melee' ? (a.radius + del.range) * a.sheet.get('meleeReach', tags, extra)
    : del.type === 'cone' ? del.range * aoeScale * a.sheet.get('meleeReach', tags, extra) : del.radius * aoeScale;
  const arcRad = del.type === 'nova' ? Math.PI * 2
    : Math.min(Math.PI * 2, (del.arcDeg * Math.PI / 180) * (del.type === 'melee' ? Math.sqrt(aoeScale) : 1) * a.sheet.get('swingArc', tags, extra));
  const inner = del.type !== 'melee' && del.edgeOnly ? reach * del.edgeOnly : 0;
  const swingShape = del.type === 'melee' ? a.sheet.get('aoeShape', tags, extra, AOE_SHAPE[del.shape ?? 'circle']) : 0;
  const band = swingShape === AOE_SHAPE.band ? bandSwingGeo(reach, arcRad) : null;
  return { kind: 'wedge', reach, inner, arcRad, ang, standoff: band?.standoff ?? -1, halfWidth: band?.halfWidth ?? -1, color: fc.inst.def.color };
}
/** The same fields read off the new resolve. */
function newFields(g: ForesightGeo | null): Record<string, number | string> | null {
  if (!g) return null;
  return g.kind === 'ground'
    ? { kind: 'ground', ax: g.aim.x, ay: g.aim.y, reach: g.reach, color: g.color }
    : { kind: 'wedge', reach: g.reach, inner: g.inner, arcRad: g.arcRad, ang: g.ang, standoff: g.band?.standoff ?? -1, halfWidth: g.band?.halfWidth ?? -1, color: g.color };
}
/** Exact equality, field for field (=== on every number: the last bit). */
function sameFields(x: Record<string, number | string> | null, y: Record<string, number | string> | null): boolean {
  if (x === null || y === null) return x === y;
  const ks = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of ks) if (x[k] !== y[k]) return false;
  return true;
}

// ================================================================== A: THE PARITY ==
bootSimEngine();
seedGlobalRandom(0xf0e5);
const sw = makeSimWorld('warrior', 0xf0e5);
const hero = sw.player;
const DT = 0.05;

const skill = (pick: (d: SkillDef) => boolean): SkillDef | undefined => {
  const all = Object.values(SKILLS).filter(pick);
  return all.find(d => !d.requirements) ?? all[0];
};
const castable = (d: SkillDef): boolean => (d.castMode ?? 'cast') === 'cast' && (d.useTime ?? 0) >= 0.3;
const del = (d: SkillDef): { type: string; edgeOnly?: number; shape?: string; affects?: string } => d.delivery as { type: string; edgeOnly?: number; shape?: string; affects?: string };
interface Case { name: string; def: SkillDef | undefined; draws: boolean; mode?: CastingState['mode']; aimAtBody?: boolean; sigil?: boolean; facing?: number }
const CASES: Case[] = [
  { name: 'a ground ring', def: skill(d => del(d).type === 'ground' && castable(d)), draws: true },
  { name: 'a melee swing', def: skill(d => del(d).type === 'melee' && !del(d).shape && castable(d)), draws: true },
  { name: 'a breath cone', def: skill(d => del(d).type === 'cone' && !del(d).edgeOnly && castable(d)), draws: true },
  { name: 'a hostile nova', def: skill(d => del(d).type === 'nova' && del(d).affects !== 'allies' && !del(d).edgeOnly && castable(d)), draws: true },
  { name: 'a banded swing', def: skill(d => del(d).type === 'melee' && del(d).shape === 'band'), draws: true },
  { name: 'a sigil\'s band on a plain swing', def: skill(d => del(d).type === 'melee' && !del(d).shape && castable(d)), draws: true, sigil: true },
  { name: 'an edge-only cone', def: skill(d => del(d).type === 'cone' && !!del(d).edgeOnly), draws: true },
  { name: 'an edge-only nova', def: skill(d => del(d).type === 'nova' && !!del(d).edgeOnly && del(d).affects !== 'allies'), draws: true },
  { name: 'a channel cone', def: skill(d => d.castMode === 'channel' && del(d).type === 'cone'), draws: true, facing: 2.2 },
  { name: 'a channel nova', def: skill(d => d.castMode === 'channel' && del(d).type === 'nova'), draws: true },
  { name: 'a swing aimed at the body', def: skill(d => del(d).type === 'melee' && !del(d).shape && castable(d)), draws: true, aimAtBody: true, facing: -1.1 },
  { name: 'a guard stance', def: skill(d => d.castMode === 'guard'), draws: false },
  { name: 'a melee swing in guard mode', def: skill(d => del(d).type === 'melee' && !del(d).shape && castable(d)), draws: false, mode: 'guard' },
  { name: 'an allied nova', def: skill(d => del(d).type === 'nova' && del(d).affects === 'allies'), draws: false },
  { name: 'a summon', def: skill(d => del(d).type === 'summon' && castable(d)), draws: false },
  { name: 'a leap', def: skill(d => del(d).type === 'leap' && castable(d)), draws: false },
  { name: 'a flight', def: skill(d => del(d).type === 'projectile' && castable(d)), draws: false },
];

/** A foe at `at`, still, brainless, fed, wearing area, reach and arc investment (so every
 *  stat read the painter folds is live). */
function readyFoe(w: World, at: Vec2): Actor {
  const m = w.createMonster('zombie', 6, 'enemy');
  m.pos = vec(at.x, at.y);
  if (!w.actors.includes(m)) w.actors.push(m);
  m.brain = undefined;
  m.sheet.setBase('moveSpeed', 0);
  m.sheet.setBase('mana', 1e5);
  m.sheet.setSource('probe_foresight', [mod('aoeRadius', 'increased', 0.3), mod('meleeReach', 'increased', 0.2), mod('swingArc', 'increased', 0.15)]);
  m.fillResources();
  return m;
}
/** Stand a cast on the foe: the real useSkill where it stands one, else the state by hand. */
function standCast(w: World, a: Actor, inst: SkillInstance, aim: Vec2, mode?: CastingState['mode']): { cs: CastingState; real: boolean } {
  a.casting = null;
  a.useLock = 0;
  a.cooldowns.clear();
  a.fillResources();
  if (!mode && w.useSkill(a, inst, aim) && a.casting && (a.casting as CastingState).inst === inst) return { cs: a.casting, real: true };
  const m = mode ?? instanceCastMode(inst);
  const cs = { inst, mode: m, aim: { x: aim.x, y: aim.y }, elapsed: 0.2, total: 1, held: true, baseMult: 1,
    ...(m === 'channel' ? { pulseTimer: 0.35, channelTime: 0.4 } : {}) } as CastingState;
  a.casting = cs;
  return { cs, real: false };
}

{
  const at = vec(hero.pos.x + 240, hero.pos.y + 30);
  let real = 0, drawn = 0, fieldsOk = 0, callsOk = 0, nullsOk = 0, compared = 0;
  const misses: string[] = [], byHand: string[] = [];
  for (const c of CASES) {
    if (!c.def) { misses.push(`${c.name}: no catalog skill`); continue; }
    const foe = readyFoe(sw, at);
    if (c.sigil) foe.sheet.setSource('probe_sigil', [mod('aoeShape', 'override', AOE_SHAPE.band)]);
    const inst = makeSkillInstance(c.def, 3, 0);
    const aim = c.aimAtBody ? { x: foe.pos.x, y: foe.pos.y } : { x: hero.pos.x, y: hero.pos.y };
    const { cs, real: isReal } = standCast(sw, foe, inst, aim, c.mode);
    if (isReal) real++; else byHand.push(c.name);
    if (c.facing !== undefined) foe.facing = c.facing;
    // Two points of the wind-up: as stood, and further on (a real bar runs on the World's
    // clock; a hand-stood one is moved by hand).
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) {
        if (isReal && foe.casting === cs) { sw.update(DT); sw.update(DT); }
        else { cs.elapsed = 0.75; if (cs.pulseTimer !== undefined) cs.pulseTimer = 0.1; }
        if (c.facing !== undefined) foe.facing = c.facing + 0.4; // a channel's wedge rides the live facing
      }
      if (foe.casting !== cs) break; // the bar finished: one point is all it had
      compared++;
      const of = oldFields(foe, cs), nf = newFields(foresightOf(foe, cs));
      if (sameFields(of, nf)) fieldsOk++; else misses.push(`${c.name} (${c.def.id}) fields: old ${JSON.stringify(of)} new ${JSON.stringify(nf)}`);
      if ((nf !== null) === c.draws) nullsOk++; else misses.push(`${c.name} (${c.def.id}): drew ${nf !== null}, expected ${c.draws}`);
      const o = recorder(), n = recorder();
      const x = foe.pos.x, y = foe.pos.y;
      oldPaint(o.ctx, foe, x, y, 0.9);
      newPaint(n.ctx, foe, x, y, 0.9);
      if (o.log.length) drawn++;
      if (o.log.join('\n') === n.log.join('\n')) callsOk++;
      else misses.push(`${c.name} (${c.def.id}) calls: old ${o.log.length} ${o.log.slice(0, 3).join(' ')} / new ${n.log.length} ${n.log.slice(0, 3).join(' ')}`);
    }
    foe.casting = null;
    sw.actors.splice(sw.actors.indexOf(foe), 1);
  }
  const named = CASES.map(c => `${c.name}=${c.def?.id ?? 'none'}`).join(', ');
  info(`A cases: ${named}`);
  check('A setup: the catalog holds every delivery kind the painter reads (and the kinds it draws nothing for)',
    CASES.every(c => !!c.def), misses.filter(m => m.includes('no catalog')).join('; '));
  check('A parity: foresightOf equals the old painter\'s math field for field (every number to the last bit)',
    compared >= CASES.length && fieldsOk === compared, `${fieldsOk}/${compared}; ${misses.filter(m => m.includes('fields')).slice(0, 2).join(' | ')}`);
  check('A parity: the kinds that draw resolve a figure, and a guard, an allied nova, a summon, a leap and a flight resolve none',
    nullsOk === compared, misses.filter(m => m.includes('expected')).slice(0, 3).join(' | '));
  check('A pixels: the new painter\'s canvas calls equal the old painter\'s, call for call and argument for argument',
    callsOk === compared && drawn >= 18, `${callsOk}/${compared} identical (${drawn} drew, ${real} of ${CASES.length} casts stood by useSkill, by hand: ${byHand.join(', ') || 'none'}); ${misses.filter(m => m.includes('calls')).slice(0, 2).join(' | ')}`);
}

// ============================================================== C: THE STUB ==
{
  const stubActor = readyFoe(sw, vec(hero.pos.x - 200, hero.pos.y));
  const stubOf = (def: Record<string, unknown>): CastingState => ({ inst: { def }, mode: 'cast', total: 1, elapsed: 0.5,
    aim: { x: stubActor.pos.x, y: stubActor.pos.y }, held: false, baseMult: 1 }) as unknown as CastingState;
  // The old adoption's own stub: a color, an absent guard, no delivery (snapshot.ts before W11).
  const crash = stubOf({ color: '#c04030', guard: undefined, delivery: undefined });
  let threw = false;
  try { instanceDelivery(crash.inst); } catch { threw = true; }
  stubActor.casting = crash;
  const paint = (): { geo: ForesightGeo | null; calls: number; threw: boolean } => {
    const r = recorder();
    try { newPaint(r.ctx, stubActor, stubActor.pos.x, stubActor.pos.y, 1); return { geo: foresightView(stubActor, stubActor.casting!), calls: r.log.length, threw: false }; }
    catch { return { geo: null, calls: r.log.length, threw: true }; }
  };
  const p0 = paint();
  check('C crash: the old stub (a color, no delivery) still throws in instanceDelivery, the read the old painter made',
    threw);
  check('C stub: the painter\'s read answers null on it and paints nothing, throwing nothing', !p0.threw && p0.geo === null && p0.calls === 0,
    `geo ${JSON.stringify(p0.geo)}, calls ${p0.calls}`);
  stubActor.casting = stubOf({ color: '#ff8040', delivery: { type: 'leap', vent: { columnR: 40 } } });
  const p1 = paint();
  stubActor.casting = stubOf({ color: '#ff8040', delivery: { type: 'ground', radius: 90 } }); // a future stub: a ground delivery, no catalog id
  const p2 = paint();
  stubActor.casting = { ...stubOf({ color: '#ff8040' }), foresight: null } as CastingState;
  const p3 = paint();
  check('C stub: a vent leap\'s stub, an id-less ground stub and a stub carrying a null row read none and paint nothing',
    [p1, p2, p3].every(p => !p.threw && p.geo === null && p.calls === 0), JSON.stringify([p1, p2, p3].map(p => p.calls)));
  check('C row: a malformed row reads none (never a throw)',
    foresightOfRow(undefined, '#fff') === null && foresightOfRow([1, 2] as unknown as ForesightW, '#fff') === null
      && foresightOfRow('x' as unknown as ForesightW, '#fff') === null);
  stubActor.casting = null;
  sw.actors.splice(sw.actors.indexOf(stubActor), 1);
}

// ===================================================== D: THE BROADCAST LANE ==
{
  // The co-op host's own serialize (main.ts: net.sendState(serializeSnapshot(world, tick))) through the
  // WebRTC lane's JSON round trip (webrtc.ts fanOut), adopted by a co-op client's shell.
  const zone = JSON.parse(JSON.stringify(serializeZone(sw))) as ZoneMsg;
  const shell = (): World => {
    const acct = makeAccount();
    const cw = new World(acct, Object.freeze(buildManifest(acct, sw.manifest.seed)));
    cw.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
    cw.clientSeatId = 'p9';
    applyZone(cw, zone);
    return cw;
  };
  const at = vec(hero.pos.x + 260, hero.pos.y - 40);
  const rows: { name: string; ok: boolean; detail: string }[] = [];
  for (const c of [CASES[0], CASES[1], CASES[4]]) {
    const foe = readyFoe(sw, at);
    const { cs } = standCast(sw, foe, makeSkillInstance(c.def!, 3, 0), { x: hero.pos.x, y: hero.pos.y });
    const host = foresightOf(foe, cs)!;
    const snap = JSON.parse(JSON.stringify({ t: 'snap', snap: serializeSnapshot(sw, 7) })).snap as StateSnapshot;
    const row = snap.actors.find(r => r.id === foe.id);
    const cw = shell();
    applySnapshot(cw, snap);
    const body = cw.actors.find(x => x.team === 'enemy' && !!x.casting && Math.abs(x.pos.x - foe.pos.x) < 0.01 && Math.abs(x.pos.y - foe.pos.y) < 0.01);
    const geo = body?.casting ? foresightView(body, body.casting) : null;
    const want = row?.cast?.fg ? foresightOfRow(row.cast.fg, row.cast.c) : null;
    const near = !!geo && Math.abs(geo.aim.x - host.aim.x) <= 0.005 && Math.abs(geo.aim.y - host.aim.y) <= 0.005 && Math.abs(geo.reach - host.reach) <= 0.005
      && (host.kind === 'ground' || (Math.abs(geo.ang - host.ang) <= 0.0005 && Math.abs(geo.arcRad - host.arcRad) <= 0.0005
        && (!host.band || (!!geo.band && Math.abs(geo.band.halfWidth - host.band.halfWidth) <= 0.005))));
    rows.push({ name: c.name, ok: !!row?.cast?.fg && JSON.stringify(geo) === JSON.stringify(want) && body?.casting?.foresight === geo && near,
      detail: `${c.def!.id}: fg ${JSON.stringify(row?.cast?.fg ?? null)}` });
    foe.casting = null;
    sw.actors.splice(sw.actors.indexOf(foe), 1);
  }
  check('D broadcast: the co-op host\'s snapshot carries the row through the JSON round trip, and the client\'s stub reads it exactly (ground, melee, band) with the host\'s aim and reach',
    rows.every(r => r.ok), rows.map(r => `${r.ok ? 'ok' : 'OFF'} ${r.name} ${r.detail}`).join(' | '));
  // A channel's wedge rides the caster's live facing on the client too (the client's own drawn facing).
  {
    const foe = readyFoe(sw, at);
    const chDef = CASES.find(c => c.name === 'a channel cone')!.def!;
    const { cs } = standCast(sw, foe, makeSkillInstance(chDef, 3, 0), { x: hero.pos.x, y: hero.pos.y });
    foe.facing = 0.7;
    const snap = JSON.parse(JSON.stringify(serializeSnapshot(sw, 9))) as StateSnapshot;
    const row = snap.actors.find(r => r.id === foe.id);
    const cw = shell();
    applySnapshot(cw, snap);
    const body = cw.actors.find(x => x.team === 'enemy' && !!x.casting && Math.abs(x.pos.x - foe.pos.x) < 0.01);
    const geo = body?.casting ? foresightView(body, body.casting) : null;
    const arcAt = (facing: number): string | undefined => {
      if (!body || !geo) return undefined;
      const r = recorder();
      drawForesight(r.ctx, geo, body.pos.x, body.pos.y, facing, 0.5, 1);
      return r.log.find(l => l.startsWith('arc'));
    };
    const along = (facing: number): boolean => { const a = arcAt(facing); if (!a) return false; const args = JSON.parse(a.slice(4, -1)) as number[]; return Math.abs((args[3] + args[4]) / 2 - facing) < 1e-9; };
    check('D track: a channel\'s row says it rides the live facing, and the client\'s wedge follows the body\'s drawn facing',
      cs.mode === 'channel' && row?.cast?.fg?.[0] === FORESIGHT_W_KIND.track && geo?.track === true && along(0.7) && along(-2.1),
      `${chDef.id}: fg ${JSON.stringify(row?.cast?.fg ?? null)}`);
    // THE SOLO INVARIANT: serializing never marks the host's own cast; its painter still resolves.
    check('D solo: the host\'s own cast carries no foresight field after a serialize (its painter resolves as it always did)',
      !('foresight' in cs) && sameFields(newFields(foresightView(foe, cs)), oldFields(foe, cs)));
    foe.casting = null;
    sw.actors.splice(sw.actors.indexOf(foe), 1);
  }
  // The client's stub of a cast that draws nothing carries a null row (never a resolve).
  const foe = readyFoe(sw, at);
  standCast(sw, foe, makeSkillInstance(CASES.find(c => c.name === 'a summon')!.def!, 3, 0), { x: hero.pos.x, y: hero.pos.y });
  const snap = JSON.parse(JSON.stringify(serializeSnapshot(sw, 8))) as StateSnapshot;
  const row = snap.actors.find(r => r.id === foe.id);
  const cw = shell();
  applySnapshot(cw, snap);
  const body = cw.actors.find(x => x.team === 'enemy' && !!x.casting);
  check('D broadcast: a cast that draws nothing ships no row and its client stub carries a null one',
    !!row?.cast && row.cast.fg === undefined && body?.casting?.foresight === null, `row ${JSON.stringify(row?.cast ?? null)}`);
  foe.casting = null;
  sw.actors.splice(sw.actors.indexOf(foe), 1);
}

// ============================================================ B: THE HOSTED ROW ==
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const SDT = 1 / SHARD_CFG.tickHz;
const host = new ShardHost({ seed: 0xf05e5, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
async function tick(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(SDT); await yieldIO(); } }
interface Client { c: WsTransport; id: string; got: StateSnapshot[]; zones: ZoneMsg[] }
async function join(name: string): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', got: [], zones: [] };
  c.onState(s => { cl.got.push(s); });
  c.onZone(z => { cl.zones.push(z); });
  cl.id = (await c.connect(url, { name, classId: 'warrior' })).self;
  for (let i = 0; i < 120 && !host.units.seatOf(cl.id); i++) await tick(1);
  return cl;
}
// The host's canonical snapshots and its own resolve of the watched caster at each one.
let watched: Actor | null = null;
const sent = new Map<string, { s: StateSnapshot; geo: ForesightGeo | null; casting: boolean }>();
{
  const send = host.net.sendStateTo.bind(host.net);
  host.net.sendStateTo = (s: StateSnapshot, ids: Iterable<string>): void => {
    const a = watched;
    sent.set(s.zoneId + '@' + s.tick, { s, geo: a?.casting ? foresightOf(a, a.casting) : null, casting: !!a?.casting });
    send(s, ids);
  };
}
const canonical = (s: StateSnapshot): { s: StateSnapshot; geo: ForesightGeo | null; casting: boolean } | undefined => sent.get(s.zoneId + '@' + s.tick);
const A = await join('Aster');
await tick(8);
const W = host.units.worldOf(A.id)!;
const seatA = host.units.seatOf(A.id)!;
const shellA = (): World => {
  const acct = makeAccount();
  const cw = new World(acct, Object.freeze(buildManifest(acct, W.manifest.seed)));
  cw.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  cw.clientSeatId = A.id;
  applyZone(cw, A.zones.at(-1)!);
  return cw;
};
const rowOf = (s: StateSnapshot, id: number): ActorW | undefined => s.actors.find(r => r.id === id);

/** One enemy wind-up on the shard, watched through to its end: the host's canonical rows,
 *  the host's own resolve at each, and what client A received. */
async function hostedCast(def: SkillDef, aimAt: (foe: Actor) => Vec2): Promise<{ foe: Actor; frames: StateSnapshot[]; ok: boolean; kept: boolean }> {
  const foe = readyFoe(W, vec(seatA.actor.pos.x + 260, seatA.actor.pos.y + 20));
  await tick(4); // the body rides a few frames before it winds up (its identity held: THE IDENTITY ONCE)
  watched = foe;
  const n0 = A.got.length;
  const { real } = standCast(W, foe, makeSkillInstance(def, 3, 0), aimAt(foe));
  const span = Math.ceil(((def.useTime ?? 0.5) + 0.6) * SHARD_CFG.tickHz);
  await tick(Math.ceil(span / 3));
  // THE IDENTITY ONCE: mid wind-up the socket holds the caster's identity, so its rows ride kept.
  const conn = (host.net as unknown as { bySeat: Map<string, { diet?: { ids: Map<number, string> | null } }> }).bySeat.get(A.id);
  const kept = !!foe.casting && !!conn?.diet?.ids?.has(foe.id);
  await tick(span - Math.ceil(span / 3));
  watched = null;
  return { foe, frames: A.got.slice(n0), ok: real, kept };
}

const groundDef = CASES[0].def!, meleeDef = CASES[1].def!;
let keptCasts = 0;
for (const [label, def, aimAt] of [
  ['ground', groundDef, (_f: Actor) => ({ x: seatA.actor.pos.x + 90, y: seatA.actor.pos.y - 70 })],
  ['melee', meleeDef, (_f: Actor) => ({ x: seatA.actor.pos.x, y: seatA.actor.pos.y })],
] as [string, SkillDef, (f: Actor) => Vec2][]) {
  const { foe, frames, ok, kept } = await hostedCast(def, aimAt);
  keptCasts += kept ? 1 : 0;
  const during = frames.filter(s => rowOf(s, foe.id)?.cast);
  const after = frames.filter(s => rowOf(s, foe.id) && !rowOf(s, foe.id)!.cast);
  // The host's rows: the row is its own resolve, rounded (lengths 2dp, angles 3dp, a full ring a whole turn).
  let hostOk = 0, gridOk = 0, worstPos = 0, worstAng = 0;
  for (const s of during) {
    const h = canonical(s), hr = h ? rowOf(h.s, foe.id) : undefined;
    if (h?.geo && hr?.cast?.fg) {
      const g = h.geo, fg = hr.cast.fg;
      const r2 = (n: number): number => Math.round(n * 100) / 100, r3 = (n: number): number => Math.round(n * 1000) / 1000;
      const kindOk = fg[0] === (g.kind === 'ground' ? FORESIGHT_W_KIND.ground : g.track ? FORESIGHT_W_KIND.track : FORESIGHT_W_KIND.wedge);
      const base = kindOk && fg[1] === r2(g.aim.x) && fg[2] === r2(g.aim.y) && fg[3] === r2(g.reach);
      const wedge = g.kind === 'ground' ? fg.length === 4
        : fg[4] === r2(g.inner) && fg[5] === r3(g.arcRad >= Math.PI * 2 - 0.01 ? TAU : g.arcRad) && fg[6] === r3(g.ang);
      if (base && wedge) hostOk++;
      // The client's inflated row: the canonical one inside the diet's grid.
      const cr = rowOf(s, foe.id)!.cast!.fg!;
      let ok2 = cr.length === fg.length && cr[0] === fg[0];
      for (let i = 1; i < fg.length; i++) {
        const d = Math.abs(cr[i]! - fg[i]!);
        if (i === 5 || i === 6) { worstAng = Math.max(worstAng, d); if (d > TURN / 2 + 1e-9) ok2 = false; }
        else { worstPos = Math.max(worstPos, d); if (d > GRID / 2 + 1e-9) ok2 = false; }
      }
      if (ok2) gridOk++;
    }
  }
  check(`B ${label}: the enemy's wind-up ships fg on every snapshot of it, the host's own resolve rounded`,
    ok && during.length >= 3 && hostOk === during.length, `${def.id}: ${hostOk}/${during.length} rows (useSkill stood it: ${ok})`);
  check(`B ${label}: the client inflates the row inside the diet's grid (0.25 px, 1/512 turn)`,
    during.length >= 3 && gridOk === during.length, `${gridOk}/${during.length}; worst ${worstPos.toFixed(4)} px, ${worstAng.toFixed(5)} rad`);
  // The shell's stub carries it, with the host's aim and reach; the painter's read returns it.
  const mid = during[Math.floor(during.length / 2)];
  const h = mid ? canonical(mid) : undefined;
  const cw = shellA();
  if (mid) applySnapshot(cw, mid);
  const body = cw.actors.find(x => x.team === 'enemy' && !!x.casting);
  const geo = body?.casting ? foresightView(body, body.casting) : null;
  const g = h?.geo;
  const tol = GRID / 2 + 0.005 + 1e-9;
  const aimOk = !!geo && !!g && geo.kind === g.kind && Math.abs(geo.aim.x - g.aim.x) <= tol && Math.abs(geo.aim.y - g.aim.y) <= tol && Math.abs(geo.reach - g.reach) <= tol;
  check(`B ${label}: the client's stub carries the host's geometry (its aim and reach), and the painter's read returns that row`,
    aimOk && body?.casting?.foresight === geo && geo!.color === g!.color,
    `host ${JSON.stringify(g ? { aim: g.aim, reach: g.reach, kind: g.kind } : null)}, client ${JSON.stringify(geo ? { aim: geo.aim, reach: geo.reach, kind: geo.kind } : null)}`);
  // It paints the host's figure: the ring at the landing spot, the wedge down the aim.
  if (body && g && geo) {
    const r = recorder();
    drawForesight(r.ctx, geo, body.pos.x, body.pos.y, body.facing, 0.5, 1);
    const hr = recorder();
    drawForesight(hr.ctx, g, foe.pos.x, foe.pos.y, foe.facing, 0.5, 1);
    // Call for call: the same calls in the same order, every style set exactly the host's, every
    // place and length within the px grid (plus the row's own rounding) and every arc's angles
    // within the turn grid.
    const parse = (l: string): { name: string; args: unknown[] } => {
      const eq = l.indexOf('='), par = l.indexOf('(');
      return eq > 0 && (par < 0 || eq < par) ? { name: l.slice(0, eq) + '=', args: [JSON.parse(l.slice(eq + 1))] } : { name: l.slice(0, par), args: JSON.parse(l.slice(par + 1, -1)) as unknown[] };
    };
    const posTol = GRID / 2 + 0.005 + 1e-9, angTol = TURN + 0.001;
    let worstPos = 0, worstAng = 0, same = r.log.length === hr.log.length && r.log.length > 0;
    for (let i = 0; same && i < r.log.length; i++) {
      const p = parse(r.log[i]), q = parse(hr.log[i]);
      if (p.name !== q.name || p.args.length !== q.args.length) { same = false; break; }
      p.args.forEach((v, k) => {
        const u = q.args[k];
        if (typeof v !== 'number' || typeof u !== 'number' || p.name.endsWith('=')) { if (JSON.stringify(v) !== JSON.stringify(u)) same = false; return; }
        const d = Math.abs(v - u);
        if (p.name === 'arc' && k >= 3) worstAng = Math.max(worstAng, d); else worstPos = Math.max(worstPos, d);
      });
    }
    const lead = label === 'ground' ? r.log.find(l => l.startsWith('translate')) : r.log.find(l => l.startsWith('arc'));
    check(`B ${label}: the client paints the host's figure (the same calls; places within the px grid, arc angles within the turn grid)`,
      same && worstPos <= posTol && worstAng <= angTol, `${r.log.length} calls, worst ${worstPos.toFixed(4)} px, ${worstAng.toFixed(5)} rad; ${lead}`);
  } else check(`B ${label}: the client paints the host's figure`, false, 'no stub');
  check(`B ${label}: no row rides once the cast ends`, after.length >= 1 && after.every(s => rowOf(s, foe.id)?.cast?.fg === undefined),
    `${after.length} frames after`);
  W.actors.splice(W.actors.indexOf(foe), 1);
  await tick(2);
}
{
  // THE IDENTITY ONCE never strikes the row: a cast is per-frame state.
  const s = [...sent.values()].map(v => v.s).find(x => x.actors.some(r => r.cast?.fg));
  const r = s?.actors.find(x => x.cast?.fg);
  const kept = r ? dietKept(dietRow(r, dietGrid())) as { cast?: { fg?: unknown } } : null;
  check('B identity: DIET_IDENTITY names neither the cast nor the hit tint, a kept row still carries the cast\'s fg, and both wind-ups rode kept rows mid-cast (every one with its fg)',
    !(DIET_IDENTITY as readonly string[]).includes('cast') && !(DIET_IDENTITY as readonly string[]).includes('ht') && !!kept?.cast?.fg && keptCasts === 2,
    `${JSON.stringify(kept?.cast?.fg ?? null)}; kept mid-cast ${keptCasts}/2`);
  // A cast that draws nothing ships no row on the shard either.
  const summon = CASES.find(c => c.name === 'a summon')!.def!;
  const { foe, frames } = await hostedCast(summon, f => ({ x: f.pos.x + 40, y: f.pos.y }));
  const casts = frames.filter(x => rowOf(x, foe.id)?.cast);
  check('B none: a cast that draws nothing (a summon) ships its cast row without fg', casts.length >= 1 && casts.every(x => rowOf(x, foe.id)!.cast!.fg === undefined),
    `${summon.id}: ${casts.length} cast rows`);
  W.actors.splice(W.actors.indexOf(foe), 1);
}

A.c.leave();
await tick(60);
await host.stop();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
