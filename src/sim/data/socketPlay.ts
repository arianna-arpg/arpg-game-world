// ---------------------------------------------------------------------------
// HOW A GEM HAS TO BE PLAYED. Most support gems read on a plain rig: press the skill at
// a dummy and count. These do not. A hard spender never fires without a bank, a guarded
// cast needs a guard up, a bent flight misses a lone post, and a conversion read against
// the matrix's resistant dummies reports the resistance. Each row names one way of
// playing and reshapes the rig for it. Both sides of a read wear the same rig, so only
// the socket differs. A new gem with a new demand is one more row.
// ---------------------------------------------------------------------------

import type { SkillDef, SupportDef } from '../../engine/skills';
import type { BuildSpec, ScenarioDef } from '../types';

/** Stats that send a flight somewhere other than the aim. */
const BENT_FLIGHT = new Set(['spiralPower', 'orbitPower', 'spinPower', 'weavePower', 'erraticPower']);

export const SOCKET_PLAY_CFG = {
  /** A stated rig number, not a claim about how fast a build banks. */
  feedPerSec: 1,
  /** The guard the rig raises. Any stance works: it only has to open the gate. */
  guardSkill: 'shield_up',
  /** Dummies in the ring around a hero whose gem bends the swing or the flight. */
  crowd: { count: 8, distance: 70 },
  /** Hosts sampled per gem, and the band they are read at. */
  hostsPerGem: 10,
  level: 20,
};

export interface SocketPlayRow {
  id: string;
  /** What the hand does differently, in the report's words. */
  label: string;
  needs: (s: SupportDef) => boolean;
  /** Hosts this reading means something on, beyond the real socket gate. */
  host?: (def: SkillDef) => boolean;
  rig: (scn: ScenarioDef, s: SupportDef) => ScenarioDef;
}

export const SOCKET_PLAY: SocketPlayRow[] = [
  {
    id: 'bank',
    label: 'with a charge a second fed into its bank',
    // A gem that brings its own clock (Slow Brew) fills its own bank.
    needs: s => !!s.chargeCost && !s.chargeGain?.length,
    // A host with its own charge price measures the override, not the gem's economy.
    host: def => !def.chargeCost,
    rig: (scn, s) => {
      const c = s.chargeCost!;
      const need = typeof c.minimum === 'number' ? c.minimum : 1;
      const feed = { charge: c.charge, perSec: SOCKET_PLAY_CFG.feedPerSec, cap: need };
      const p = scn.pilot;
      return p && (p.kind === 'brawler' || p.kind === 'turret' || p.kind === 'caster')
        ? { ...scn, pilot: { ...p, feed } }
        : scn;
    },
  },
  {
    id: 'guard',
    label: 'with a guard raised',
    needs: s => !!s.guardCast || !!s.gate?.guard,
    host: def => def.castMode !== 'guard',
    rig: scn => (typeof scn.build === 'string' ? scn : {
      ...scn,
      build: { ...scn.build, skills: [...(scn.build as BuildSpec).skills, { id: SOCKET_PLAY_CFG.guardSkill, level: 1 }] },
    }),
  },
  {
    id: 'crowd',
    label: 'in the middle of a crowd',
    needs: s => !!s.aim || s.mods.some(m => BENT_FLIGHT.has(m.stat)),
    rig: scn => ({
      ...scn,
      pilot: { kind: 'turret' },
      waves: [{
        monsters: [{ id: 'target_dummy', level: 1, count: SOCKET_PLAY_CFG.crowd.count }],
        distance: SOCKET_PLAY_CFG.crowd.distance,
      }],
    }),
  },
  {
    id: 'plain_dummy',
    label: 'against a plain dummy instead of a resistant one',
    needs: s => s.mods.some(m => m.stat.startsWith('convert_')),
    rig: scn => scn,
  },
];

/** The way this gem has to be played, if it has one. */
export const socketPlayOf = (s: SupportDef | undefined): SocketPlayRow | undefined =>
  s ? SOCKET_PLAY.find(r => r.needs(s)) : undefined;
