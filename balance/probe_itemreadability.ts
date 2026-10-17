// Regression gate for earned opening progression and readable world drops.
import { makeSimWorld } from '../src/sim/arena';
import { CLASSES, PROGRESSION } from '../src/data/classes';
import { classStartNode } from '../src/data/passives';
import { ITEM_BASES } from '../src/data/itembases';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { VESTIGES } from '../src/data/vestiges';
import { makeSkillGem } from '../src/engine/skills';
import { menuFold } from '../src/engine/menu';
import '../src/data/menu';
import { ownedUnlockById } from '../src/meta/unlocks';
import { MERC_CFG } from '../src/meta/mercs';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { Renderer } from '../src/render/renderer';
import { GROUND_ITEM_SYMBOLS } from '../src/render/groundItems';
import { VIS_CFG } from '../src/render/vis/visConfig';
import type { ItemInstance } from '../src/engine/items';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
};

for (const cls of CLASSES) {
  const w = makeSimWorld(cls.id, 0x1c0);
  const attention = () => menuFold({ account: w.account, world: w, seat: w.localSeat,
    pageOpen: () => false, ownedUnlock: ownedUnlockById(w.account) })
    .entries.find(e => e.def.id === 'passives')!.attention.pips;
  check(`${cls.id}: starts with zero spendable points, no passive pip and a free root`,
    w.meta.passivePoints === 0 && attention() === 0 && w.meta.allocated.has(classStartNode(cls.id)));
  w.grantXp(w.meta.xpNeeded - 1);
  check(`${cls.id}: partial XP leaves points and attention quiet`, w.player.level === 1 && w.meta.passivePoints === 0 && attention() === 0);
  w.grantXp(1);
  check(`${cls.id}: first level-up grants exactly one point and its pip`, w.player.level === 2 && w.meta.passivePoints === 1 && attention() === 1);
  w.grantXp(w.meta.xpNeeded + PROGRESSION.xpForLevel(3));
  check(`${cls.id}: multiple levels grant the configured budget`, w.player.level === 4 && w.meta.passivePoints === PROGRESSION.passivePointsAtLevel(4));
}
check('mercenary level-one and level-two budgets match earned player points',
  MERC_CFG.scale.passiveBudget(1) === 0 && MERC_CFG.scale.passiveBudget(2) === 1);

const host = makeSimWorld('warrior', 0x1c0);
let uid = 0;
for (const category of ['helmet', 'legs', 'chest', 'boots', 'ring']) {
  const base = Object.values(ITEM_BASES).find(b => b.category === category)!;
  const item: ItemInstance = { uid: ++uid, baseId: base.id, ilvl: 1, tier: 1, rarity: 'common',
    name: base.name, baseRoll: 0, implicitRolls: [], affixes: [] };
  host.drops.push({ pos: { x: uid * 40, y: 80 }, bob: 0, item: { kind: 'gear', item } });
}
host.drops.push({ pos: { x: 240, y: 80 }, bob: 0, item: { kind: 'skill', inst: makeSkillGem(SKILLS.cleave, 1, 'common') } });
const support = Object.values(SUPPORTS)[0];
host.drops.push({ pos: { x: 280, y: 80 }, bob: 0, item: { kind: 'support', gem: { def: support, level: 1 } } });
const vestige = Object.values(VESTIGES)[0];
host.drops.push({ pos: { x: 320, y: 80 }, bob: 0, item: { kind: 'vestige', id: vestige.id, count: 1 } });

// Run the actual drop painter with a recording Canvas surface. This catches
// missing shell fields at the consumption point, rather than testing a copy.
function paint(w: World, drops = w.drops): { text: string[]; labels: unknown[][]; shapes: unknown[][] } {
  const text: string[] = [], labels: unknown[][] = [], shapes: unknown[][] = [];
  const ctx = new Proxy({
    fillText: (s: string, x: number, y: number) => { text.push(s); labels.push([s, x, y]); },
    measureText: (s: string) => ({ width: s.length * 7 }),
  }, { get: (o, key) => key in o ? o[key as keyof typeof o]
    : (...args: unknown[]) => shapes.push([String(key), ...args]) });
  // Classic labels are painted beside their native symbols before the veils.
  const renderer = Object.assign(Object.create(Renderer.prototype), {ctx}) as {drawDrops(w:World):void};
  const frame=Object.assign(Object.create(w),{drops}) as World;
  renderer.drawDrops(frame);
  return { text, labels, shapes };
}
const hostPaint = paint(host);
const gear = host.drops.filter(d => d.item.kind === 'gear').map(d => paint(host, [d]));
const paths = gear.map(p => JSON.stringify(p.shapes.filter(s => ['moveTo','lineTo','arc'].includes(String(s[0])))));
check('equipment categories have distinct low-detail silhouettes', new Set(paths).size === gear.length && paths.every(p => p !== '[]'));
check('equipment symbols have no tile frames (only the classic name label)', gear.every(p =>
  !p.shapes.some(s => s[0] === 'strokeRect') && p.shapes.filter(s => s[0] === 'fillRect').length === 1));
const gearDrops=host.drops.filter(d=>d.item.kind==='gear');
check('the native drop painter draws every equipment name exactly once', gearDrops.every(d=>{
  const p=paint(host,[d]);return d.item.kind==='gear'&&p.text.length===1&&p.text[0]===d.item.item.name;
}));
check('classic equipment labels follow the original drop position and bob', gearDrops.every(d=>{
  const shifted={...d,pos:{x:d.pos.x+37,y:d.pos.y-19},bob:Math.PI/2}, p=paint(host,[shifted]);
  const D=VIS_CFG.drops, y=shifted.pos.y+D.bobAmp;
  return p.labels[0][1]===shifted.pos.x && p.labels[0][2]===y-D.labelLift+D.labelPillH-4
    && p.shapes.some(s=>s[0]==='fillRect' && s[2]===y-D.labelLift && s[4]===D.labelPillH);
}));
check('every equipment category has a ground symbol', Object.values(ITEM_BASES).every(b => !!GROUND_ITEM_SYMBOLS[b.category]));
const gems = host.drops.filter(d => d.item.kind === 'skill' || d.item.kind === 'support').map(d => paint(host,[d]));
check('skill/support gems use diamonds without initials or inventory badges', gems.every(p =>
  p.text.length === 0 && p.shapes.some(s => s[0] === 'rotate' && s[1] === Math.PI / 4)));
check('support hollow core distinguishes the two gem shapes',
  gems[0].shapes.filter(s => s[0] === 'fillRect').length === 1 && gems[1].shapes.filter(s => s[0] === 'fillRect').length === 2);
check('gems retain separated outer rings instead of bare currency glyphs', gems.every(p => p.shapes.filter(s => s[0] === 'strokeRect').length === 2));
check('ground markers stay near their original footprint', VIS_CFG.drops.gearHalf <= 9 && VIS_CFG.drops.gearUniqueHalf <= 12
  && VIS_CFG.drops.skillHalf <= 6.5 && VIS_CFG.drops.supportHalf <= 5);
check('vestiges retain their registry sigils', hostPaint.text.includes(vestige.glyph));
const snap = JSON.parse(JSON.stringify(serializeSnapshot(host, 1)));
const client = makeSimWorld('warrior', 0x1c1);
applySnapshot(client, snap);
check('co-op snapshot round-trip draws exactly the same symbols and names', JSON.stringify(paint(client)) === JSON.stringify(hostPaint));
// Older snapshots have no new visual metadata; fallback still paints safely.
for (const drop of snap.drops) { delete drop.baseId; if (drop.kind !== 'gear') delete drop.name; }
applySnapshot(client, snap);
check('missing optional wire metadata still renders a fallback symbol', paint(client).shapes.some(s => s[0] === 'lineTo'));

console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
