import { strict as assert } from 'node:assert';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS } from '../src/engine/status';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance } from '../src/engine/skills';
import { mitigateTyped, applyDot } from '../src/engine/damage';
import { weakPointBonus, weakPointWindows, takeWeakPointBreaks } from '../src/engine/weakpoints';
import { anatomyCueState, anatomyOverheadRise, notePartScar, cloneAnatomyCues } from '../src/engine/anatomyCues';
import { feedWound, segR } from '../src/engine/segments';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawAnatomyBody, drawAnatomyMeters, drawSegmentWound, drawWeakPointBar, drawWeakPointOrb } from '../src/render/vis/anatomyCueLayer';

seedGlobalRandom(24024);
let checks = 0;
function check(label: string, ok: boolean) { assert.ok(ok, label); checks++; console.log('PASS ' + label); }
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
function rig(kind = 'zombie') {
  const w = makeSimWorld('warrior', 24024), p = w.player, e = w.createMonster(kind, 1, 'enemy');
  p.pos = { x: 700, y: 700 }; e.pos = { x: 850, y: 700 }; e.anchored = true; e.aiCooldown = 9999;
  e.sheet.setSource('anatomy-rig', [mod('life', 'override', 1000), mod('armor', 'override', 0),
    mod('poise', 'override', 0), mod('insight', 'override', 0), mod('blockChance', 'override', 0), mod('evasion', 'override', 0)]);
  p.sheet.setSource('anatomy-rig', [mod('mana', 'override', 10000), mod('critChance', 'override', 0)]);
  e.fillResources(); p.fillResources(); e.es = 0; e.poise = 0; e.insight = 0;
  w.actors = [p, e]; w.flashes = []; w.texts = []; w.projectiles = [];
  return { w, p, e };
}
{
  const { w, p, e } = rig();
  const skill = makeSkillInstance({ ...SKILLS.expose_weakness, requirements: undefined, useTime: 0 }); p.skills = [skill];
  check('real Expose Weakness accepts its target', w.useSkill(p, skill, e.pos));
  const s = e.statuses.find(s => s.id === 'exposed')!, window = s.window!;
  check('real skill stamps its authored health interval', !!s && near(window.hi - window.lo, 0.18));
  check('mark waits above its window', !weakPointWindows(e)[0].active && weakPointBonus(e) === 0);
  const clean = mitigateTyped(e, { physical: 10 });
  const before = JSON.stringify(e.statuses);
  weakPointWindows(e); anatomyCueState(e); weakPointBonus(e);
  check('cue and bonus reads never mutate statuses', before === JSON.stringify(e.statuses));
  e.life = e.maxLife() * (window.hi - 0.01);
  check('same-frame hit immediately receives the active bonus', near(mitigateTyped(e, { physical: 10 }), clean * 1.4));
  check('body/bar state agrees with actual damage', weakPointWindows(e)[0].active && weakPointBonus(e) === 0.4);
  const dotBefore = e.life; applyDot(e, 10);
  check('DoT inherits the same active window', near(dotBefore - e.life, 14));
  e.life = e.maxLife();
  check('healing above the window immediately suspends the bonus', near(mitigateTyped(e, { physical: 10 }), clean) && !weakPointWindows(e)[0].active);
  e.applyStatus('exposed', 1, 1, 'refresh');
  check('refresh leaves the original window in place', e.statuses.find(s => s.id === 'exposed')?.window?.hi === window.hi);
  e.life = e.maxLife() * (window.lo - 0.01);
  check('crossing below immediately clears visible bonus', !weakPointWindows(e).length && weakPointBonus(e) === 0);
  w.update(0.001);
  check('spent window is removed and fractures once', !e.statuses.some(s => s.id === 'exposed') && w.flashes.filter(f => f.combatCue?.style === 'anatomy_weak_break').length === 1);
  const count = w.flashes.length; w.update(0.001);
  check('retirement never repeats the fracture', w.flashes.length === count);
}
{
  const { w, e } = rig();
  e.applyStatus('exposed', 1, 1, 'test'); e.cleanseDebuffs();
  check('cleansing clears the band without a false shatter', !weakPointWindows(e).length && !takeWeakPointBreaks(e).length);
  e.applyStatus('exposed', 1, 1, 'test'); e.updateTimers(20);
  check('expiry clears band and damage together', !weakPointWindows(e).length && weakPointBonus(e) === 0 && !takeWeakPointBreaks(e).length);
  e.sheet.setSource('immune', [mod('debuffImmunity', 'override', 1)]); e.applyStatus('exposed', 1, 1, 'test');
  check('rejected status invents no weakpoint', !weakPointWindows(e).length);
  e.sheet.removeSource('immune'); e.applyStatus('exposed', 1, 1, 'test'); e.life = 0; w.kill(e, false, w.player);
  check('lethal crossing leaves a world-space fracture', e.dead && w.flashes.some(f => f.combatCue?.style === 'anatomy_weak_break'));
  check('dead actors have no persistent weakpoints', !anatomyCueState(e).weakpoints.length);
}
{
  const { e } = rig();
  STATUS_DEFS.qa_weakpoint = { ...STATUS_DEFS.exposed, weakSpot: { size: 0.3, gap: 0, bonus: 0.8, cue: { profile: 'flesh', color: '#123456' } } };
  try {
    e.applyStatus('exposed', 1, 1, 'one'); e.applyStatus('qa_weakpoint', 1, 1, 'two'); e.life = 900;
    check('overlapping bonuses use the strongest live window', near(weakPointBonus(e), 0.8));
    const rows = weakPointWindows(e);
    check('custom status supplies its own reusable material', rows.some(r => r.profile === 'flesh' && r.color === '#123456'));
    e.statuses.find(s => s.id === 'qa_weakpoint')!.remaining = 0;
    check('ending strongest window immediately reveals lesser bonus', near(weakPointBonus(e), 0.4));
    STATUS_DEFS.qa_weakpoint.weakSpot!.cue = false;
    e.statuses.find(s => s.id === 'qa_weakpoint')!.remaining = 2;
    check('presentation opt-out never disables mechanics', weakPointWindows(e).length === 1 && near(weakPointBonus(e), 0.8));
  } finally { delete STATUS_DEFS.qa_weakpoint; }
}
{
  const { w, p, e } = rig('pavise_crab'); w.update(0.001);
  const parts = e.partActors!, part = parts[0], def = part.partLink!.def;
  const initialIds = anatomyCueState(e).parts.map(p => p.id);
  check('full-life composite exposes both independent part pools', parts.length === 2 && anatomyCueState(e).parts.every(p => p.frac === 1));
  const rootLife = e.life; part.life *= 0.4;
  check('part cracks read its own health and leave root bar alone', near(anatomyCueState(part).part!.frac, 0.4) && e.life === rootLife);
  part.life = 0; w.kill(part, false, p);
  const rows = anatomyCueState(e).parts;
  check('real break removes part and retains an anchored scar', e.partActors!.length === 1 && e.partScars.length === 1 && e.partScars[0].dx === def.dx);
  check('part meter ordering stays stable across the break', JSON.stringify(initialIds) === JSON.stringify(rows.map(p => p.id)));
  check('component meters clear attachments in the root facing frame', anatomyOverheadRise(anatomyCueState(e), e.radius, -Math.PI / 2) > e.radius);
  check('breakDamage still uses the authored root fraction', near(e.life, rootLife - e.maxLife() * def.breakDamage!));
  check('break modifiers remain attributed to the broken part', e.sheet.hasSource('partBreak_' + part.id));
  check('break leaves a component fracture at its actual position', w.flashes.some(f => f.combatCue?.style === 'anatomy_part_break' && f.pos.x === part.pos.x && f.pos.y === part.pos.y));
  w.graftPart(e, def, { key: 'replacement' });
  check('regrafting at the attachment covers its old scar', e.partScars.length === 0 && anatomyCueState(e).parts.every(p => !p.broken));
  const flashCount = w.flashes.filter(f => f.combatCue?.style === 'anatomy_part_break').length;
  w.witherGrafts(e, 'replacement');
  check('quiet withering creates no false scar or break', e.partScars.length === 0 && w.flashes.filter(f => f.combatCue?.style === 'anatomy_part_break').length === flashCount);
  e.life = 0; w.kill(e, false, p);
  check('root death removes attached parts without breaking them', !e.partActors?.length && e.partScars.length === 0);
}
{
  const { w, p, e } = rig();
  e.skills = [makeSkillInstance(SKILLS.cleave)];
  const def = { monster: 'pavise_board', dx: 1, dy: 0, breakDisables: ['cleave'], breakCue: false as const };
  const part = w.graftPart(e, def)!; part.life = 0; w.kill(part, false, p);
  check('opted-out part still disarms every skill lane', e.skills.length === 0 && !!e.aiSkillBans?.has('cleave') && !e.partScars.length);
  for (let i = 0; i < 50; i++) notePartScar(part, e, { ...def, dy: i, breakCue: { profile: 'flesh' } });
  check('repeated runtime graft breaks have bounded scar memory', e.partScars.length === 32);
}
{
  const { w, e } = rig('primeval_wyrm_head'); e.ambushArmed = false; e.untargetable = false; w.update(0.001);
  const index = e.worm!.length - 1, r = segR(e, index), pool = e.worm!.wounds!.frac * e.maxLife();
  const rootLife = e.life;
  feedWound(e, index, pool * 0.6);
  check('partial wound selects the struck tail index', near(anatomyCueState(e).segments[index].frac, 0.4) && anatomyCueState(e).segments[0].frac === 1);
  check('cue read changes no hit radius or root pool', segR(e, index) === r && e.life === rootLife);
  check('remaining wound pool tears at its actual breakpoint', feedWound(e, index, pool * 0.4 + 0.001));
  e.segTears = [index]; w.update(0.001);
  check('torn segment retains a scar and its existing smaller hitbox', anatomyCueState(e).segments[index].broken && segR(e, index) < r);
  check('segment modifiers still reach the root', e.sheet.hasSource('segWounds'));
  check('tear flash keeps the authored material', w.flashes.some(f => f.combatCue?.style === 'anatomy_part_break'));
  const client = rig().w, snap = serializeSnapshot(w, 1);
  applySnapshot(client, snap); const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('all segment indices including long tails reach co-op', anatomyCueState(mirror).segments.length === e.worm!.length && anatomyCueState(mirror).segments[index].broken);
  check('co-op preserves independent parts without live part links', anatomyCueState(mirror).parts.length === anatomyCueState(e).parts.length && !mirror.partLink);
}
{
  const { w, p, e } = rig(); p.applyStatus('exposed', 1, 1, 'enemy'); e.applyStatus('exposed', 1, 1, 'hero'); e.life = 900;
  const snap = serializeSnapshot(w, 1), client = rig().w; applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('player and enemy windows both reach co-op', anatomyCueState(client.player).weakpoints.length === 1 && anatomyCueState(mirror).weakpoints[0].active);
  snap.actors.find(a => a.id === e.id)!.anatomyCues!.weakpoints[0].hi = 0.1;
  check('snapshots own their nested window records', near(anatomyCueState(mirror).weakpoints[0].hi, 0.96) && near(weakPointWindows(e)[0].hi, 0.96));
  p.cleanseDebuffs(); e.cleanseDebuffs(); applySnapshot(client, serializeSnapshot(w, 2));
  check('absent rows clear stale co-op bands', !anatomyCueState(client.player).weakpoints.length && !anatomyCueState(mirror).weakpoints.length);
  const cloned = cloneAnatomyCues(anatomyCueState(e)); cloned.parts.push({ id: 1, dx: 0, dy: 0, size: 1, frac: 0, broken: true, profile: 'armor', color: '#fff' });
  check('render reads remain detached from mutable mirror records', !anatomyCueState(e).parts.length);
}
{
  let depth = 0, labels = 0, paths = 0; const rects: number[][] = [], lines: number[][] = [];
  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; }, beginPath: () => { paths++; },
    rect: (...args: number[]) => rects.push(args), moveTo: (...args: number[]) => lines.push(args), fillText: () => { labels++; } },
  { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  const { e } = rig(); e.applyStatus('exposed', 1, 1, 'hero');
  const state = anatomyCueState(e), row = state.weakpoints[0];
  drawWeakPointBar(ctx, state.weakpoints, 10, 20, 100, 14, 1);
  check('boss window uses the exact stamped health coordinates', rects.some(r => near(r[0], 10 + row.lo * 100) && near(r[2], (row.hi - row.lo) * 100)));
  rects.length = 0; e.life = 850;
  drawWeakPointBar(ctx, weakPointWindows(e), 10, 20, 48, 4, 0.85);
  check('overhead active hatch stops at actual remaining life', rects.some(r => near(r[2], (0.85 - row.lo) * 48)));
  drawWeakPointOrb(ctx, weakPointWindows(e), 100, 100, 30);
  drawAnatomyBody(ctx, anatomyCueState(e), 20, 0.8);
  state.segments = Array.from({ length: 30 }, (_, index) => ({ index, frac: index === 29 ? 0 : 1, broken: index === 29, profile: 'flesh', color: '#e88' }));
  const pathBefore = paths; drawAnatomyMeters(ctx, state, 260, 10, 520, true);
  check('boss meters retain every long-worm segment', paths - pathBefore >= 30);
  drawSegmentWound(ctx, state.segments[29], 20, 30, 12, 0.5);
  check('all surfaces draw without captions or unbalanced saves', depth === 0 && labels === 0 && lines.length > 10);
}
const source = readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8');
check('retired weakpoint/part/tear captions are absent from emitters', !source.includes("'spot shattered!'") && !source.includes("'SUNDERED'") && !source.includes("spec.text ?? 'TORN'"));
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/anatomy-catalog.json', JSON.stringify({ skill: SKILLS.expose_weakness,
  part: MONSTERS.pavise_crab.parts![0] }));
console.log(`PASS ${checks} anatomy cue checks`);
