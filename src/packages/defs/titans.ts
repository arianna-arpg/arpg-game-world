import { TITAN_TUNING, TITAN_DOODAD_RULES } from '../../data/titans';
import { LOOT_TABLES } from '../../data/loottables';
import { registerDoodadRule } from '../../engine/levelgen';
import { registerKillHandler } from '../../engine/killHandlers';
import { registerMarkerSource } from '../../world/mapMarkers';
import { TitanField } from '../overlays/titans';
import type { ContentPackage } from '../types';

export const TITANS: ContentPackage = {
  id: 'titans', label: 'Titans', color: '#b7ae83', cost: 180,
  blurb: 'Living catastrophes travel the unseen world. Discover their wakes: riven earth, rivers of fire, ice walls and wandering storms. Follow the scars, bring down their maker, and reclaim the roads.',
  unlock: { id: 'titans_unlock', label: 'Discover a Titan or its wake', test: ctx => (ctx.ledger.titans_seen ?? 0) > 0 },
  modifiers: [
    { id: 'titans_start', kind: 'startLevel', label: 'Titans stir at level', min: 8, max: 30, step: 1, defaultValue: 10 },
    { id: 'titans_weight', kind: 'weight', label: 'Titan frequency', min: 0, max: 80, step: 5, defaultValue: 25 },
  ],
  defaultEnabled: true, defaultWeight: 25, defaultStartLevel: 10,
  world: { overlay: ctx => new TitanField(ctx, TITAN_TUNING) },
  validate: look => TITAN_TUNING.defs.flatMap(d => [
    ...(!look.monster(d.monster) ? [`Titan ${d.id}: unknown monster ${d.monster}`] : []),
    ...d.reward.tables.filter(t => !LOOT_TABLES[t]).map(t => `Titan ${d.id}: unknown hoard ${t}`),
    ...[d.body.kind, ...d.wake.map(w => w.kind)].filter(k => !TITAN_DOODAD_RULES[k]).map(k => `Titan ${d.id}: unknown terrain ${k}`),
  ]),
};
for (const [kind, rule] of Object.entries(TITAN_DOODAD_RULES)) registerDoodadRule(kind, rule);

registerKillHandler({
  id: 'titans_slain',
  tag: 'titan_head',
  run: ctx => {
    if (!ctx.actor.eventKey) return;
    const d = ctx.sim.overlayFor<TitanField>('titans')?.slay(ctx.actor.eventKey);
    if (!d) return; // one identity, one payout, including repeated kill dispatch
    if (ctx.credit) {
      ctx.bumpLedger('titans_slain'); ctx.bumpLedger(`titans_slain_${d.id}`);
      ctx.grantXp(d.reward.xp);
      for (let n = 0; n < d.reward.gems; n++) ctx.dropGemAt(ctx.actor.pos);
      for (const table of d.reward.tables) ctx.dropLootTable(table, ctx.actor.pos);
    }
    ctx.notice(`${d.name} falls. Its wake releases the land.`, d.color, 17, 'titans');
  },
});
registerMarkerSource(world => {
  const f = world.sim.overlayFor<TitanField>('titans');
  if (!f) return [];
  return f.journeys.flatMap(j => j.seen.map(zoneId => {
    const d = f.def(j), here = j.path.indexOf(zoneId) === Math.floor(j.head);
    return { id: `${j.id}:${zoneId}`, zoneId, glyph: here ? d.glyph : '≋',
      fill: '#181916', stroke: d.color, text: d.color, r: 8,
      title: here ? d.name : `${d.name}: wake`,
      detail: d.description, fog: 'charted' as const, z: 21 };
  }));
});
