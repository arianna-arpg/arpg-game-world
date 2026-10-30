import { strict as assert } from 'node:assert';
import { DAMAGE_TEXT_CFG, DamageTextBursts, type DamageTextPopup } from '../src/world/damageText';
import { damageTextRows } from '../src/render/vis/damageText';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { Actor } from '../src/engine/actor';

const cfg = DAMAGE_TEXT_CFG, bursts = new DamageTextBursts();
const popup = (amount: number, at: number, target = 1, color = '#ffffff'): DamageTextPopup => ({
  pos: { x: 97, y: 84 }, text: String(Math.round(amount)), color, size: 13,
  life: 1, maxLife: 1, kind: 'dmg', damage: bursts.record(target, amount, at, { x: 100, y: 100 }),
});
const first = popup(1.4, 0), second = popup(1.4, cfg.gapSec, 1, '#ffd24a');
const neighbor = popup(9, cfg.gapSec, 2);
const heal: DamageTextPopup = { ...first, damage: undefined, kind: 'gains', text: '+5' };
const texts = [first, second, neighbor, heal], before = JSON.stringify(texts);
assert.equal(damageTextRows(texts, false), texts, 'separate mode returns original popups unchanged');
const rows = damageTextRows(texts, true);
assert.deepEqual(rows.map(t => t.text), ['3', '9', '+5'], 'sum unrounded values; separate targets and healing');
assert.equal(rows[0].color, cfg.totalColor, 'mixed crit total has neutral styling');
assert.equal(rows[0].pos.x, 100, 'summed number has no per-hit horizontal jitter');
assert.equal(rows[0].life / rows[0].maxLife, 1, 'new hits refresh visibility');
assert.deepEqual(damageTextRows(texts, true), rows, 'rendering is repeatable');
assert.equal(JSON.stringify(texts), before, 'projection does not mutate simulation text');
assert.equal(first.damage!.total, 1.4, 'older receipts are immutable');
assert.equal(second.damage!.burst, first.damage!.burst, 'inclusive continuity boundary');
const third = popup(4, 2 * cfg.gapSec + 0.001);
assert.notEqual(third.damage!.burst, second.damage!.burst, 'pause starts a new burst');
assert.equal(third.damage!.total, 4);
assert.equal(damageTextRows([second, third], true).length, 2, 'bursts finish independently');
const fading = damageTextRows([{ ...third, life: 0.1 }], true)[0];
assert.ok(fading.life / fading.maxLife < 1 && fading.pos.y < 100 - cfg.lift, 'released totals rise and fade');
assert.equal(damageTextRows([{ ...third, life: 0 }], true).length, 0, 'expired totals disappear');
assert.equal(bursts.record(1, NaN, 2, { x: 0, y: 0 }), undefined);
assert.equal(bursts.record(1, 0, 2, { x: 0, y: 0 }), undefined, 'zero damage cannot sustain a burst');
bursts.prune(20);
assert.equal(popup(7, 20).damage!.total, 7, 'idle bookkeeping expires');
bursts.clear();
assert.equal(popup(8, 20.1).damage!.total, 8, 'zone reset clears continuity');
assert.equal(popup(6, 0).damage!.total, 6, 'clock rewind resets continuity');
const settings = makeSettings();
assert.equal(settings.summedDamageText, false);
settings.summedDamageText = true;
const saved = serializeSettings(settings);
assert.equal(deserializeSettings(saved)!.summedDamageText, true, 'preference persists');
delete saved.summedDamageText;
assert.equal(deserializeSettings(saved)!.summedDamageText, false, 'older saves retain separate mode');
saved.summedDamageText = 'yes' as unknown as boolean;
assert.equal(deserializeSettings(saved)!.summedDamageText, false, 'malformed preference falls back');
console.log('PASS per-target continuity, precise totals, immutable projection, lifecycle and settings');

seedGlobalRandom(0xda6a);
const w = makeSimWorld('magician', 0xda6a), p = w.player;
const enemy = w.createMonster('zombie', 1, 'enemy');
enemy.pos = { x: p.pos.x + 100, y: p.pos.y };
w.actors = [p, enemy];
for (const a of [p, enemy]) {
  a.sheet.setSource('damage-text-probe', [
    ...['armor', 'evasion', 'blockChance', 'critChance', 'lifeRegen', 'energyShield', 'fireRes'].map(s => mod(s, 'override', 0)),
    mod('life', 'override', 100000), mod('mana', 'override', 100000), mod('accuracy', 'override', 100000),
  ]);
  a.fillResources(); a.skills = []; a.casting = null;
}
p.invulnerable = true;
w.update(1 / 60);
w.texts = [];
const ray = makeSkillInstance({ ...SKILLS.infernal_ray, requirements: undefined, manaCost: 0 });
const internal = w as unknown as {
  updateCasting(a: Actor, dt: number): void;
  accumulateDotText(a: Actor, amount: number, dt: number): void;
  applyEnvDamage(a: Actor, damage: { amount: number; canKill: boolean }): void;
};
assert.ok(w.useSkill(p, ray, enemy.pos, true), 'real Infernal Ray starts');
let emitted = 0;
const emit = w.text.bind(w);
w.text = (...args) => { if (args[6]) emitted++; emit(...args); };
let firstBurst: number | undefined;
for (let i = 0; i < 24; i++) {
  w.time += 0.15;
  for (const text of w.texts) text.life -= 0.15;
  w.texts = w.texts.filter(t => t.life > 0);
  internal.updateCasting(p, 0.15);
  const live = w.texts.filter(t => t.damage?.target === enemy.id);
  if (!live.length) continue;
  const last = live.at(-1)!;
  firstBurst ??= last.damage!.burst;
  assert.equal(last.damage!.burst, firstBurst, 'sustained channel keeps one burst beyond popup lifetime');
  assert.equal(damageTextRows(live, true).length, 1);
}
assert.ok(emitted >= 8, `real channel emits repeated numeric hits (${emitted})`);
const latest = w.texts.filter(t => t.damage?.target === enemy.id).at(-1)!;
assert.ok(latest.damage!.count > w.texts.length, 'total outlives expired individual hits');
const total = latest.damage!.total;
internal.accumulateDotText(enemy, 5.4, 0.5);
assert.equal(w.texts.at(-1)!.damage!.total, total + 5.4, 'batched DoT joins channel damage');
const fireball = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, effects: [{ type: 'damage' }] });
w.challengeHit(p, fireball, enemy, 1);
assert.equal(w.texts.at(-1)!.damage!.burst, firstBurst, 'another skill joins the same target total');
assert.ok(w.texts.at(-1)!.damage!.total > total + 5.4);
const beforeHazard = w.texts.at(-1)!.damage!.total;
internal.applyEnvDamage(enemy, { amount: 4.4, canKill: false });
assert.equal(w.texts.at(-1)!.text, '-4', 'environmental damage retains its individual format');
assert.equal(w.texts.at(-1)!.damage!.total, beforeHazard + 4.4, 'environmental damage joins the same total');
console.log('PASS actual Infernal Ray channel, DoT and mixed-skill aggregation across expired hits');

const snap = serializeSnapshot(w, 1), shipped = snap.texts.filter(t => t.damage).at(-1)!;
assert.notEqual(shipped.damage, w.texts.at(-1)!.damage);
assert.notEqual(shipped.damage!.at, w.texts.at(-1)!.damage!.at, 'wire copies nested position');
const expected = damageTextRows(w.texts, true);
applySnapshot(w, JSON.parse(JSON.stringify(snap)), null, 1);
assert.deepEqual(damageTextRows(w.texts, true), expected, 'snapshot retains complete totals');
applySnapshot(w, JSON.parse(JSON.stringify(snap)), null, 1);
assert.deepEqual(damageTextRows(w.texts, true), expected, 'duplicate snapshots never count damage twice');
const older = JSON.parse(JSON.stringify(snap));
for (const t of older.texts) delete t.damage;
applySnapshot(w, older, null, 1);
assert.deepEqual(damageTextRows(w.texts, true), w.texts, 'older hosts fall back to individual popups');
console.log('PASS co-op copy, duplicate-snapshot safety and older-host fallback');
