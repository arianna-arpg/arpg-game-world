import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, poolReadOf, poolVentRead } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { reserveVentTells } from '../src/data/reserveCues';
import { poolCueRows, poolVentStyle, reserveStageCue } from '../src/engine/reserveCues';
import { resolveTell, tellSpecsOf, tellDressOf, tellPortraitDress } from '../src/engine/tells';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawPoolVents, drawPoolVentHud } from '../src/render/vis/reserveCueLayer';
import { SIM_TAP } from '../src/engine/tap';
import { readFileSync } from 'node:fs';

seedGlobalRandom(0x20020);
let checks = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); console.log('PASS ' + name); checks++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function rig() {
  const w = makeSimWorld('warrior', 0x20020), p = w.player;
  const e = w.createMonster('sapbleeder', 1, 'enemy'); w.actors = [p, e];
  p.pos = { x: 500, y: 500 }; e.pos = { x: 700, y: 500 };
  e.aggroed = true; // engaged leakers cannot quietly regenerate before venting
  for (const a of w.actors) {
    a.skills = []; a.casting = null; a.tier = p.tier;
    a.sheet.setSource('reserve-rig', [mod('life', 'override', 1000), mod('mana', 'override', 10000),
      mod('damageTaken', 'override', 1), mod('damage', 'override', 1), mod('aoeRadius', 'override', 1),
      ...['armor', 'chaosRes', 'evasion', 'energyShield', 'lifeRegen', 'poise', 'poiseCcAvoid'].map(s => mod(s, 'override', 0))]);
    a.fillResources();
  }
  const inner = w as unknown as { updateReserves(): void; updateTells(): void; updateVents(dt: number): void };
  const sweep = (dt = 0.2) => { w.time += dt; inner.updateReserves(); inner.updateTells(); };
  const captions: string[] = [], original = w.text.bind(w);
  w.text = (...args) => { captions.push(args[1]); return original(...args); };
  const inst = makeSkillInstance({ ...SKILLS.venomous_aura, requirements: undefined, cooldown: 0, manaCost: 0 });
  p.skills = [inst];
  const toggle = () => w.useSkill(p, inst, { ...p.pos });
  return { w, p, e, inner, sweep, captions, inst, toggle };
}
{
  const { w, e, sweep, captions } = rig();
  const state = e.reserves!.get('sap')!;
  const vent = e.tellSpecs!.find(t => t.source === 'reserveVent:sap')!;
  check('sap anatomy inherits a liquid vent without a special actor branch', !!vent && vent.channel.kind === 'part' && vent.channel.part.params?.liquid === true);
  check('full quiet reservoir has no invented vent', resolveTell(vent, e, w) === 0);
  state.cur = 1.2; sweep();
  check('actual low band applies the original status and a single collapse', e.statuses.some(s => s.id === 'sap_starved') && w.flashes.filter(f => f.combatCue?.style === 'reserve_spent').length === 1);
  sweep(); check('remaining in the same band does not repeat its entry cue', w.flashes.filter(f => f.combatCue?.style === 'reserve_spent').length === 1);
  state.cur = state.max; sweep(); state.cur = 1; sweep();
  check('recovering then re-entering the band emits a fresh transition', w.flashes.filter(f => f.combatCue?.style === 'reserve_spent').length === 2);
  e.reserveSpecs = e.reserveSpecs!.map(s => ({ ...s, vent: { ...s.vent!, forSec: 0.7 } }));
  state.cur = 0; sweep(); const end = state.ventUntil;
  check('empty opens the configured real vent and vulnerability', near(end - w.time, 0.7) && e.statuses.some(s => s.id === 'wilted') && resolveTell(vent, e, w) === 1);
  check('liquid outlet is materialized through the ordinary tell pipeline', !!tellDressOf(e)?.parts?.some(p => p.params?.liquid === true && p.alpha === 1));
  e.endStatus('wilted'); sweep(0.2);
  check('early cleanse removes vulnerability without pretending the fuel refilled', !e.statuses.some(s => s.id === 'wilted') && state.cur === 0 && resolveTell(vent, e, w) === 1);
  sweep(0.6); check('real close refills the authored share and removes the vent', state.ventUntil === 0 && near(state.cur, state.max * 0.35) && resolveTell(vent, e, w) === 0);
  check('legacy reserve captions stay silent', !captions.some(t => /running dry|bled out|guttering/.test(t)));
  check('portrait never pretends to be venting', !tellPortraitDress([vent]).parts?.some(p => (p.alpha ?? 1) > 0));
  check('Fumelung retains its existing status-driven gasps without duplicates', !tellSpecsOf(MONSTERS.fumelung)!.some(t => t.source.startsWith('reserveVent:')));
}
{
  const spec = { id: 'mod_fuel', pool: 4, vent: { forSec: 1, cue: 'unknown' } };
  check('unknown vent profile inherits a visible source-bound fallback', reserveVentTells([spec])[0].source === 'reserveVent:mod_fuel');
  check('vent opt-out suppresses only supplementary tells', reserveVentTells([{ ...spec, vent: { ...spec.vent, cue: false } }]).length === 0);
  check('stage unknown profile uses a safe depletion transition', reserveStageCue({ status: 'guttered', cue: 'constructor' }) === 'reserve_spent');
  check('stage opt-out works', reserveStageCue({ status: 'guttered', cue: false }) === undefined);
  check('pool unknown profile defaults safely and false opts out', poolVentStyle('constructor') === poolVentStyle('mist') && !poolVentStyle(false));
}
{
  const { w, p, e, inner, inst, toggle, captions } = rig();
  check('empty pool refuses activation and paints no flow', !toggle() && !poolCueRows(p)[0].venting);
  p.pools.set('venom', 100); check('real activation opens the vent', toggle() && p.venting.has('venom'));
  // Instance-local modifiers exercise the exact same scoped fold on both sides.
  inst.def = { ...inst.def, innateMods: [mod('aoeRadius', 'more', 0.5), mod('damage', 'more', 1)] };
  p.sheet.removeSource('reserve-rig');
  const geo = poolVentRead(p, inst)!;
  check('world cue uses the exact scoped damage radius and rate', near(poolCueRows(p)[0].radius, geo.radius) && near(poolCueRows(p)[0].rate, geo.rate) && geo.radius > 170);
  e.pos = { x: p.pos.x + geo.radius + e.radius - 0.1, y: p.pos.y };
  const outside = w.createMonster('zombie', 1, 'enemy'); outside.tier = p.tier; outside.pos = { x: p.pos.x + geo.radius + outside.radius + 0.1, y: p.pos.y }; w.actors.push(outside);
  const farLife = outside.life, life = e.life; p.ventTick = 0; inner.updateVents(0.01);
  const spent = Math.min(100, geo.rate * 0.4);
  check('actual tick spends the same rate and reaches body-overlap at the drawn boundary', near(p.pools.get('venom')!, 100 - spent) && near(life - e.life, spent) && outside.life === farLife);
  check('stream stays visible between damage ticks', poolCueRows(p)[0].venting && !w.flashes.length);
  p.pools.set('venom', 5); check('active vent remains visible below the activation minimum', poolCueRows(p)[0].venting && poolReadOf(p, inst)!.banked < poolReadOf(p, inst)!.min);
  p.downed = true; check('downed owner retains the hazard while the existing mechanic ticks', poolCueRows(p)[0].venting);
  p.ventTick = 0; inner.updateVents(0.01); check('last partial tick empties the bank and immediately clears visual flow', p.pools.get('venom') === 0 && !poolCueRows(p)[0].venting);
  p.downed = false; p.pools.set('venom', 100); p.venting.clear(); toggle(); toggle();
  check('manual sealing stops flow and preserves remaining fuel', !poolCueRows(p)[0].venting && p.pools.get('venom') === 100);
  toggle(); p.skills = []; check('unequipping removes the footprint immediately', !poolCueRows(p).length); inner.updateVents(1);
  check('engine also retires the orphaned vent', !p.venting.size);
  check('venting name caption removed', !captions.includes('venting!'));
}
{
  const { p, e, inner, inst, toggle } = rig(); p.pools.set('venom', 100); toggle();
  e.life = 1; e.pos = { x: p.pos.x + 30, y: p.pos.y };
  let credit = false; const tap = SIM_TAP.current;
  SIM_TAP.current = { onDeath: (a, killer) => { if (a === e) credit = killer === p; } };
  try { inner.updateVents(1); } finally { SIM_TAP.current = tap; }
  check('vent kill still credits its original caster', e.dead && credit);
  p.skills.push(inst); check('duplicate slots share one bank in the derived rows', poolCueRows(p).length === 2 && poolCueRows(p).every(r => r.id === 'venom'));
  p.dead = true; check('dead owner has no active world or HUD flow', !poolCueRows(p).length);
}
{
  const { w, p, e, sweep, inst, toggle } = rig(); p.pools.set('venom', 210); toggle(); e.reserves!.get('sap')!.cur = 0; sweep();
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('co-op receives the worn reserve vent without raw reserve state', !mirror.reserves && !!tellDressOf(mirror)?.parts?.some(p => p.params?.liquid === true && p.alpha === 1));
  check('co-op world footprint is host-derived', JSON.stringify(poolCueRows(client.player)) === JSON.stringify(poolCueRows(p)));
  check('co-op skill strip has the host bank, cap and minimum', poolReadOf(client.player, inst)!.banked === 210 && poolReadOf(client.player, inst)!.cap === poolReadOf(p, inst)!.cap && poolReadOf(client.player, inst)!.min === 20);
  p.pools.set('venom', 0); applySnapshot(client, serializeSnapshot(w, 2));
  check('empty-bank snapshot clears continuous flow and drains the HUD', !poolCueRows(client.player)[0].venting && poolReadOf(client.player, inst)!.banked === 0);
  p.skills = []; sweep(4); applySnapshot(client, serializeSnapshot(w, 3));
  check('unequipped snapshot clears pooled HUD state', client.player.poolCues?.length === 0 && poolReadOf(client.player, inst) === null);
  check('refilled enemy mirror stops wearing its vent', !tellDressOf(mirror)?.parts?.some(p => p.params?.liquid === true && p.alpha === 1));
}
{
  const { p } = rig(); p.pools.set('venom', 100); p.venting.add('venom'); const row = poolCueRows(p)[0];
  let depth = 0, paths = 0; const radii: number[] = [];
  const ctx = new Proxy({ save: () => { depth++; }, restore: () => { depth--; }, beginPath: () => { paths++; }, arc: (_x: number, _y: number, r: number) => radii.push(r) },
    { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  drawPoolVents(ctx, [row, row], 1); drawPoolVentHud(ctx, 0, 0, 40, row, 1);
  check('shared-pool slots draw one true footprint and restore canvas state', radii.length === 1 && radii[0] === row.radius && depth === 0 && paths > 10);
  const before = paths; drawPoolVents(ctx, [{ ...row, profile: false }], 1); drawPoolVentHud(ctx, 0, 0, 40, { ...row, venting: false }, 1);
  check('opted-out and inactive supplementary painters stay quiet', paths === before);
}
check('retired reserve emitters remain absent', !/this\.text\([^\n]*(?:want\.note|v\.note|'venting!')/.test(readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8')));
console.log(`PASS ${checks} reserve cue checks`);
