import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import { SKILLS } from '../src/data/skills';
import { COMBO_RULES } from '../src/data/combos';
import { COMBO_CFG, comboReadout, comboStat, type CastRecord, type ComboRuleDef } from '../src/engine/sequence';
import { comboCueRows, comboCueStyle } from '../src/engine/comboCues';
import { drawComboBody, drawComboHud } from '../src/render/vis/comboCueLayer';
import { COMBO_CUE_STYLES } from '../src/data/comboCues';
import { resolveTell } from '../src/engine/tells';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

let checks = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); checks++; console.log('PASS ' + name); };
const near = (a: number, b: number) => Math.abs(a - b) < 0.011;
function rig() {
  const w = makeSimWorld('sorcerer', 0x34034), p = w.player;
  const e = w.createMonster('cadence_fencer', 1, 'enemy'); w.actors = [p, e];
  for (const a of w.actors) { a.skills = []; a.casting = null; a.pos = { x: 500, y: 500 }; a.tier = p.tier; }
  e.pos.x = 1600;
  p.sheet.setSource('cue-grammar', [mod(comboStat('drumbeat'), 'flat', 1)]);
  const captions: string[] = [], original = w.text.bind(w);
  w.text = (...args: Parameters<typeof w.text>) => { captions.push(args[1]); return original(...args); };
  function cast(a: Actor = p, skill = 'spark', repeat = false) {
    w.time += 0.3;
    assert.ok(w.executeSkill(a, makeSkillInstance(SKILLS[skill]), { x: a.pos.x + 400, y: 500 }, { noRepeat: repeat }));
  }
  return { w, p, e, captions, cast };
}
const rule = COMBO_RULES.drumbeat;
{
  const ring: CastRecord[] = [1, 2, 3].map(seq => ({ sid: 'spark', tags: ['spell', 'lightning'], at: seq, seq }));
  const fire = { at: 3, seq: 3 };
  check('spent casts leave zero new progress while actual completion glows', comboReadout(ring, rule, 3, 1, fire).lit === 0 && comboReadout(ring, rule, 3, 1, fire).glow === 1);
  check('overlap grammars retain the history they can actually reuse', comboReadout(ring, { ...rule, overlap: true }, 3, 1, fire).lit === 3);
  check('stale completion expires without another cast', comboReadout(ring, rule, 4, 1, fire).glow === 0);
  check('future timestamps cannot announce a completion', comboReadout(ring, rule, 2, 1, fire).glow === 0);
  for (const variant of [
    { ...rule, repeat: undefined, seq: [{ anyTags: ['spell'] }, { anyTags: ['spell'] }] },
    { ...rule, repeat: undefined, counts: [{ step: { anyTags: ['spell'] }, n: 2 }] },
    { ...rule, repeat: undefined, vary: { n: 2, by: 'skill' } },
  ] as ComboRuleDef[]) check('consumption also clears ' + (variant.seq ? 'ordered' : variant.counts ? 'multiset' : 'varied') + ' progress', comboReadout(ring, variant, 3, 1, fire).lit === 0);
  check('profile defaults distinguish beat, weave, round and collection',
    comboCueStyle(rule)?.shape === 'beat' && comboCueStyle(COMBO_RULES.spellblade_weave)?.shape === 'weave'
    && comboCueStyle(COMBO_RULES.elemental_round)?.shape === 'round'
    && comboCueStyle({ ...rule, counts: [{ step: {}, n: 2 }] })?.shape === 'gather');
  check('data override selects a shared profile', comboCueStyle({ ...rule, cue: 'weave' }) === COMBO_CUE_STYLES.weave);
  check('unknown data profile keeps the structural fallback', comboCueStyle({ ...rule, cue: 'missing-mod-profile' }) === COMBO_CUE_STYLES.beat);
  check('object prototype names are not registered profiles', comboCueStyle({ ...rule, cue: 'constructor' }) === COMBO_CUE_STYLES.beat);
  check('explicit opt-out omits supplementary gestures', comboCueStyle({ ...rule, cue: false }) === undefined);
}
{
  const { w, p, captions, cast } = rig();
  check('newly equipped grammar has empty pips before the first cast', comboCueRows(p, w.time)[0]?.lit === 0 && !p.comboRules);
  cast(); cast();
  check('two real uses light two pips and no completion', comboCueRows(p, w.time)[0].lit === 2 && comboCueRows(p, w.time)[0].glow === 0);
  cast(); const fire = p.comboFire!.get('drumbeat')!;
  check('third real use pays the original buff and closes the pattern', p.buffs.get('drumbeat')?.stacks === 1 && comboCueRows(p, w.time)[0].glow === 1);
  check('completion does not count the same three casts as a new full pattern', comboCueRows(p, w.time)[0].lit === 0);
  const tell = resolveTell({ source: 'combo:drumbeat', channel: { kind: 'lean', amp: 1 } }, p, { time: w.time, radiance: () => 1 });
  check('body tell and HUD agree about consumed casts', tell === 0);
  cast(); check('first new beat progresses without replaying completion', comboCueRows(p, w.time)[0].lit === 1 && p.comboFire!.get('drumbeat') === fire && near(comboCueRows(p, w.time)[0].glow, 2 / 3));
  cast(); cast(); check('a new full span closes again with original stacking payoff', p.buffs.get('drumbeat')?.stacks === 2 && comboCueRows(p, w.time)[0].glow === 1);
  check('generic proc pipeline no longer emits a combination name', !captions.includes(rule.name + '!'));
  const seq = p.castSeq; cast(p, 'spark', true);
  check('triggered repeats cannot fabricate an extra beat or replay the cue', p.castSeq === seq && p.comboFire!.get('drumbeat')!.seq === seq);
  w.time += COMBO_CFG.hudGlow; check('completion fades while its earned buff remains', comboCueRows(p, w.time)[0].glow === 0 && p.buffs.has('drumbeat'));
  p.sheet.removeSource('cue-grammar'); check('unequipping removes the row immediately, including cached rules', comboCueRows(p, w.time).length === 0);
}
{
  const { w, p, cast } = rig(); cast(); cast(); w.time += 7;
  check('expired partial pattern returns to empty', comboCueRows(p, w.time)[0].lit === 0);
  p.sheet.setSource('cue-window', [mod('comboWindow', 'more', 1)]);
  check('live timing investment widens the same read used by the matcher', comboCueRows(p, w.time)[0].lit === 2);
  cast(); check('widened pattern really fires', comboCueRows(p, w.time)[0].glow === 1 && p.buffs.has('drumbeat'));
  p.downed = true; check('downed body and HUD stop announcing combos', !comboCueRows(p, w.time).length);
  p.downed = false; p.dead = true; check('dead body and HUD stop announcing combos', !comboCueRows(p, w.time).length);
}
{
  const { w, p, e, cast } = rig(); cast(); cast();
  cast(e, 'claw'); cast(e, 'claw'); cast(); cast(e, 'claw');
  check('enemy uses the same grammar and completion resolver', e.comboFire!.has('drumbeat') && comboCueRows(e, w.time)[0].glow === 1);
  // Simultaneous player and enemy completion, then join with no client histories.
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('player HUD mirrors consumed progress without simulating casts', comboCueRows(client.player, client.time)[0].lit === 0 && near(comboCueRows(client.player, client.time)[0].glow, comboCueRows(p, w.time)[0].glow));
  check('enemy completion now travels on the wire too', !!snap.actors.find(a => a.id === e.id)?.cb && near(comboCueRows(mirror, client.time)[0].glow, comboCueRows(e, w.time)[0].glow));
  check('joining mirrors carry no host cast ring', mirror.castRing === null && client.player.castRing === null);
  w.time += 2; applySnapshot(client, serializeSnapshot(w, 2));
  check('expired pulses clear on subsequent snapshots', comboCueRows(mirror, client.time)[0].glow === 0 && comboCueRows(client.player, client.time)[0].glow === 0);
  e.dead = true; p.sheet.removeSource('cue-grammar'); applySnapshot(client, serializeSnapshot(w, 3));
  check('absent wire rows explicitly clear a reused player mirror', client.player.comboHud?.length === 0 && !comboCueRows(client.player, client.time).length);
  check('dead enemy mirror leaves the rendered roster', !client.actors.includes(mirror) || !comboCueRows(mirror, client.time).length);
}
{
  let depth = 0, paths = 0, labels = 0;
  const radii: number[] = [];
  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; },
    beginPath: () => { paths++; }, arc: (_x: number, _y: number, radius: number) => { radii.push(radius); }, fillText: () => { labels++; } },
  { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  for (const glow of [1, 0.7, 0.2, 0]) {
    const rows = ['drumbeat', 'spellblade_weave', 'elemental_round'].map(id => ({ id, lit: 1, len: 3, glow }));
    drawComboBody(ctx, 16, rows); drawComboHud(ctx, 100, 100, rows);
  }
  check('world/HUD painters balance context and never paint captions', depth === 0 && paths > 20 && labels === 0);
  check('HUD pips retain their functional size', radii.every(r => r === 4.5));
  const before = paths; rule.cue = false;
  try {
    drawComboBody(ctx, 16, [{ id: rule.id, lit: 0, len: 3, glow: 1 }]);
    check('opt-out draws no supplementary body geometry', paths === before);
    drawComboHud(ctx, 100, 100, [{ id: rule.id, lit: 1, len: 3, glow: 1 }]);
    check('opt-out retains precisely the three progress pips', paths - before === 3);
  } finally { delete rule.cue; }
}
check('retired canvas name emitter stays absent', !readFileSync(new URL('../src/render/renderer.ts', import.meta.url), 'utf8').includes("ctx.fillText(rule.name + '!'") );
console.log(`PASS ${checks} combo cue checks`);
