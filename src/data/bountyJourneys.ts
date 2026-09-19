import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, registerBountyKind, type BountyPosting } from './bountyboard';
import { objectiveSeals, type ZoneDef } from './zones';
import type { World } from '../engine/world';
import { bountyRoutes } from '../world/bountyRoutes';

export const BOUNTY_JOURNEY_CFG = {
  survey: { weight: 1, count: [2, 4] as const, levelBelow: 2 },
  trail: { weight: 1, crossings: [2, 4] as const },
  puzzle: { weight: 0.8 },
};

/** Towns, temporary event rooms and off-map interiors never count as charts. */
export function bountyChartable(z: ZoneDef): boolean {
  return z.objective.kind !== 'safe' && !z.eventOwned && !z.special && !z.pocket
    && !z.floating && !z.holdAnchor && z.caveDepth == null;
}

registerBountyKind({
  id: 'survey', weight: BOUNTY_JOURNEY_CFG.survey.weight,
  roll(host, rng, taken) {
    if (host.pin || taken.has(host.boardZoneId) || host.kindClaimed('survey', host.boardZoneId)) return null;
    const cfg = BOUNTY_JOURNEY_CFG.survey;
    const minLevel = Math.max(1, host.playerLevel - cfg.levelBelow);
    const available = Object.values(host.zoneMap).filter(z => bountyChartable(z) && !host.visited(z.id)
      && z.level >= minLevel && (host.routeFits?.(z.id) ?? true));
    if (available.length < cfg.count[0]) return null;
    return { id: `bounty_${host.slateKey}_${host.seq}`, kind: 'survey', boardId: host.boardId,
      zoneId: host.boardZoneId, beat: host.beat, pay: {}, challengeLevel: minLevel,
      survey: { count: rng.int(cfg.count[0], Math.min(cfg.count[1], available.length)), zones: [], minLevel } };
  },
  target: () => null,
  route: () => 'Route: your choice',
  arrival(_world, p, zone, firstVisit) {
    const s = p.survey;
    if (s && firstVisit && bountyChartable(zone) && zone.level >= s.minLevel
      && s.zones.length < s.count && !s.zones.includes(zone.id)) s.zones.push(zone.id);
  },
  done: (_world, p) => !!p.survey && p.survey.zones.length >= p.survey.count,
  copy(_world, p) {
    const s = p.survey;
    return { title: 'Chart New Ground', ask: s
      ? `Enter ${s.count} new wild zones · Lv ${s.minLevel}+ · ${s.zones.length}/${s.count}` : 'Posting unavailable' };
  },
});

function trailTarget(_world: World, p: BountyPosting): string | null {
  const t = p.trail;
  return t ? t.path[Math.min(t.crossed + 1, t.path.length - 1)] : null;
}

registerBountyKind({
  id: 'trail', weight: BOUNTY_JOURNEY_CFG.trail.weight,
  roll(host, rng, taken) {
    if (host.pin || !host.routes) return null;
    const [min, max] = BOUNTY_JOURNEY_CFG.trail.crossings;
    const paths = [...host.routes.entries()].filter(([id, r]) => !taken.has(id)
      && !host.kindClaimed('trail', id) && (host.routeFits?.(id) ?? true)
      && r.path.length - 1 >= min && r.path.length - 1 <= max
      && r.path.slice(1).every(id => bountyChartable(host.zoneMap[id]) && !objectiveSeals(host.zoneMap[id].objective)));
    if (!paths.length) return null;
    const [zoneId, route] = rng.pick(paths);
    return { id: `bounty_${host.slateKey}_${host.seq}`, kind: 'trail', boardId: host.boardId,
      zoneId, beat: host.beat, pay: {}, challengeLevel: Math.max(1, route.peak),
      trail: { path: [...route.path], crossed: 0, peak: route.peak } };
  },
  target: trailTarget,
  accept(world, p) {
    const path = p.trail?.path;
    if (!path) return 'route unavailable';
    // Check each prescribed edge, not merely an alternate route to the end.
    for (let i = 1; i < path.length; i++) {
      if (!bountyRoutes(world, path[i - 1], { maxLevel: world.player.level + BOUNTY_BOARD_CFG.routes.demanding.above,
        maxSteps: 1, maxDistance: Infinity }).has(path[i])) {
        return 'a required crossing is blocked';
      }
    }
    return null;
  },
  arrival(_world, p, zone, _firstVisit, from) {
    const t = p.trail;
    if (t && from === t.path[t.crossed] && zone.id === t.path[t.crossed + 1]) t.crossed++;
  },
  done: (_world, p) => !!p.trail && p.trail.crossed >= p.trail.path.length - 1,
  annulled: (world, p) => p.trail?.path.every(id => world.zoneMap[id]) ? null : 'route unavailable',
  route(world, p) {
    const t = p.trail;
    if (!t || t.crossed >= t.path.length - 1) return 'Route complete';
    const from = world.zoneMap[t.path[t.crossed]], to = world.zoneMap[t.path[t.crossed + 1]];
    const side = from?.exits.find(e => e.to === to?.id)?.side;
    const direction = side ? ({ n: 'north', s: 'south', e: 'east', w: 'west' } as const)[side] : 'road';
    return from && to ? `Next: ${from.name} → ${direction} → ${to.name}` : 'Route unavailable';
  },
  copy(_world, p) {
    const t = p.trail;
    return { title: 'Follow the Trail', ask: t
      ? `Follow ${t.path.length - 1} crossings in order · ${t.crossed}/${t.path.length - 1} · Route Lv ${t.peak}` : 'Posting unavailable' };
  },
});

// Existing generated puzzle objectives retain their native mechanics and saves.
registerBountyKind({
  id: 'puzzle', weight: BOUNTY_JOURNEY_CFG.puzzle.weight,
  roll(host, rng, taken) {
    const p = BOUNTY_KINDS.charge.roll({ ...host,
      routeFits: id => host.zoneMap[id]?.objective.kind === 'puzzle'
        && !host.kindClaimed('puzzle', id) && (host.routeFits?.(id) ?? true),
    }, rng, taken);
    return p ? { ...p, kind: 'puzzle' } : null;
  },
  done: (world, p) => world.objectiveDoneAt(p.zoneId),
  annulled: (world, p) => world.zoneMap[p.zoneId]?.objective.kind === 'puzzle' ? null : 'puzzle unavailable',
  copy(world, p) {
    const z = world.zoneMap[p.zoneId];
    return { title: `Solve: ${z?.name ?? 'Puzzle'}`, ask: 'Solve the zone’s puzzle.' };
  },
});
