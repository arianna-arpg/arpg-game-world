// Regression gate for earned opening progression and readable world drops.
import { makeSimWorld } from '../src/sim/arena';
import { CLASSES, PROGRESSION } from '../src/data/classes';
import { classStartNode } from '../src/data/passives';
import { ITEM_BASES } from '../src/data/itembases';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { VESTIGES } from '../src/data/vestiges';
import { makeSkillGem } from '../src/engine/skills';
import { gemInitials } from '../src/engine/gemitems';
import { menuFold } from '../src/engine/menu';
import '../src/data/menu';
import { ownedUnlockById } from '../src/meta/unlocks';
import { MERC_CFG } from '../src/meta/mercs';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { Renderer } from '../src/render/renderer';
import { CATEGORY_GLYPHS, itemGlyphForBase, SUPPORT_BADGE } from '../src/render/itemIcons';
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
function paint(w: World): string[] {
  const text: string[] = [];
  const ctx = new Proxy({
    fillText: (s: string) => text.push(s),
    measureText: (s: string) => ({ width: s.length * 7 }),
  }, { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} });
  const renderer = Object.create(Renderer.prototype) as { ctx: unknown; drawDrops(w: World): void };
  renderer.ctx = ctx;
  renderer.drawDrops(w);
  return text;
}
const hostText = paint(host);
check('gear uses the inventory category glyphs', ['helmet', 'legs', 'chest', 'boots', 'ring'].every(k => hostText.includes(CATEGORY_GLYPHS[k])));
check('skill and support initials plus a single support star are drawn',
  hostText.includes(gemInitials(SKILLS.cleave.name)) && hostText.includes(gemInitials(support.name))
  && hostText.filter(t => t === SUPPORT_BADGE.glyph).length === 1);
check('vestiges retain their inventory sigils', hostText.includes(vestige.glyph));
check('unregistered base identity falls back safely', itemGlyphForBase('missing-base') === '?');
const snap = JSON.parse(JSON.stringify(serializeSnapshot(host, 1)));
const client = makeSimWorld('warrior', 0x1c1);
applySnapshot(client, snap);
check('co-op snapshot round-trip draws exactly the same icons, names and badges', JSON.stringify(paint(client)) === JSON.stringify(hostText));
// Older snapshots have no new visual metadata; fallback still paints safely.
for (const drop of snap.drops) { delete drop.baseId; if (drop.kind !== 'gear') delete drop.name; }
applySnapshot(client, snap);
check('missing optional wire metadata still renders', paint(client).includes('?'));

console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
