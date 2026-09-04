// ---------------------------------------------------------------------------
// THE EXPEDITION — the bounty board posts a HAND-MADE MAP as the charge, and
// the ground itself is minted at the take.
//
// Every other bounty kind CLAIMS ground that already stands (pickSeat over the
// charted graph); this kind CHARTERS new ground. The roll picks a sane,
// road-connected ANCHOR in the board's reach (the same seat vocabulary every
// kind speaks — range, known/veiled leans, THE KINSHIP's localization, the
// juicing lean) and a map from the expedition roster (authored maps carrying
// a `bounty` block whose level band holds the player), and posts a card whose
// zone does not exist yet. The ACCEPT hook — BountyKindRow.accept, the
// summons' world-act lane, which runs BEFORE the hand seats — calls
// World.mintAuthoredZone beside the anchor with the posting's own seed, so
// the posting's zoneId is authoritative from that instant and every standing
// read (postingQuestDef, markers, the turn-in) resolves the minted def with
// zero changes. Done = the objective completed; the pay is the charge's R1
// essence fold at the ground's level.
//
// Hazard the design dodges: a `special` mint stamps eventOwned and the
// zones-save culls unclaimed event-owned ground — an authored mint never
// wears `special` (its policies are the map's own), so the expedition's
// ground stays a plain charted zone after the turn-in: a place you found.
// ---------------------------------------------------------------------------

import {
  registerBountyKind, bountyChargePay, type BountyRollHost,
} from './bountyboard';
import { pickSeat, type SeatTuning } from '../world/seats';
import { isRoadlessGateHub } from '../world/dimensions';
import { authoredMapOf, expeditionMaps, hashStr, type AuthoredMapDef } from '../engine/authoredMaps';
import { OBJECTIVE_READS, type ZoneDef } from './zones';
import type { Rng } from '../core/rng';

export const EXPEDITION_CFG = {
  /** Slate share beside the other kinds (band overrides may re-weigh). */
  weight: 0.8,
  /** The ANCHOR seat: a charted, road-connected node in the board's reach;
   *  known ground leans in (the way must read), veiled ground less so. */
  seat: { range: { min: 40, max: 420 }, knownMul: 1.2, unknownMul: 1, veiledMul: 0.6, prefer: 'far' } as SeatTuning,
  /** The anchor's level vs the player's — the expedition's ground wears the
   *  anchor's level, so the band keeps the charter honest. */
  band: { below: 6, above: 4 },
} as const;

/** The posting's zone id — a fresh id the mint claims at accept (never a
 *  standing node: the expedition charters, it does not claim). */
export function expeditionZoneId(host: Pick<BountyRollHost, 'slateKey' | 'seq'>): string {
  return `expedition_${host.slateKey}_${host.seq}`;
}

function anchorOk(z: ZoneDef, host: BountyRollHost, taken: Set<string>): boolean {
  return !z.floating && !z.concealed && z.caveDepth == null && !z.pocket && !isRoadlessGateHub(z)
    && !taken.has(z.id)
    && z.level >= host.playerLevel - EXPEDITION_CFG.band.below
    && z.level <= host.playerLevel + EXPEDITION_CFG.band.above;
}

function pickMap(maps: AuthoredMapDef[], rng: Rng): AuthoredMapDef {
  return rng.weighted(maps.map(m => ({ m, weight: m.bounty?.weight ?? 1 }))).m;
}

registerBountyKind({
  id: 'expedition',
  weight: EXPEDITION_CFG.weight,
  // Structural availability: no expedition-bearing map at this level = the
  // kind leaves the draw instead of wasting the seat.
  available: host => expeditionMaps(host.playerLevel).length > 0,
  roll(host, rng, taken) {
    // An expedition CHARTERS new ground; a pinned seat names standing ground
    // — refuse honestly (the pin passes to the next kind).
    if (host.pin) return null;
    const maps = expeditionMaps(host.playerLevel);
    if (!maps.length) return null;
    const cfg = EXPEDITION_CFG;
    const anchor = pickSeat(host.view, {
      event: 'bountyboard',
      ...cfg.seat,
      range: { min: cfg.seat.range!.min, max: Math.round(cfg.seat.range!.max! * host.reach) },
      from: host.boardZoneId,
      weigh: zz => host.lean(zz.id),
      filter: zz => anchorOk(zz, host, taken),
    }, rng);
    if (!anchor) return null;
    const map = pickMap(maps, rng);
    const zoneId = expeditionZoneId(host);
    if (host.kindClaimed('expedition', zoneId)) return null;
    const level = Math.max(1, anchor.level);
    return {
      id: `bounty_${host.slateKey}_${host.seq}`, kind: 'expedition', boardId: host.boardId,
      zoneId, beat: host.beat,
      pay: { essence: bountyChargePay(level) },
      expedition: {
        map: map.id, anchor: anchor.id, level,
        seed: hashStr(`${host.slateKey}:${host.seq}:${map.id}:${anchor.id}`),
      },
    };
  },
  accept(world, p) {
    const x = p.expedition;
    if (!x) return 'the charter no longer reads';
    if (!authoredMapOf(x.map)) return 'the chart names ground nobody remembers';
    const anchor = world.zoneMap[x.anchor];
    if (!anchor) return 'the way is lost from every chart';
    const def = world.mintAuthoredZone(x.map, {
      id: p.zoneId, anchor, level: x.level, seed: x.seed, forceWaypoint: false,
    });
    return def ? null : 'the ground could not be charted';
  },
  done: (world, p) => world.objectiveDoneAt(p.zoneId),
  annulled(world, p) {
    const x = p.expedition;
    if (!x || !authoredMapOf(x.map)) return 'the chart names ground nobody remembers';
    // Taken: the minted ground must stand. Offered: only the anchor must.
    if (p.acceptAt !== undefined) return world.zoneMap[p.zoneId] ? null : 'the ground is gone from every chart';
    return world.zoneMap[x.anchor] ? null : 'the way is lost from every chart';
  },
  copy(world, p) {
    const x = p.expedition;
    const map = x ? authoredMapOf(x.map) : undefined;
    if (!x || !map) return { title: 'The Expedition', ask: 'the chart is blank' };
    const anchor = world.zoneMap[x.anchor];
    const objective = map.objective ?? { kind: 'clear' as const };
    const read = OBJECTIVE_READS[objective.kind]?.read ?? 'meet the ground\'s ask';
    const title = `Expedition: ${map.bounty?.title ?? map.name}`;
    const ask = map.bounty?.ask ?? `Chart ${map.name} — ${read}.`;
    const way = anchor ? ` The way opens beside ${anchor.name} (level ${x.level}).` : '';
    return { title, ask: `${ask}${way}` };
  },
});
