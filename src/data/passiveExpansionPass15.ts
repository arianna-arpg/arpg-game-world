// ---------------------------------------------------------------------------
// PASSIVE EXPANSION PASS 15 — THE "RECENTLY" AXIS
//
// Two opposing build-defining wheels revolving around the modifiable "Recently"
// window (base 4.0s, clamped 1..12s):
//   - Eternal Moment (Charisma): stretches "Recently" longer to hold after-hit,
//     after-kill, after-heal, and recently-summoned windows open across pauses.
//   - Fleet Amnesia (Finesse): compresses "Recently" shorter so "if you have
//     not been hit recently" snaps back online in moments after a graze or slip.
// ---------------------------------------------------------------------------

import { mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS15_CLUSTERS: ExpansionCluster[] = [
  {
    id: 'exp_p15_cha_long_memory', wedge: 'cha', theme: 'time', shape: 'keystoneTail', pass: 15,
    nodes: [
      n('entry', 'small', 'Echoing Cadence', '+0.4s "Recently" window; 6% increased skill effect duration.', m('recentlyWindow', 'flat', 0.4), m('effectDuration', 'increased', 0.06)),
      n('a', 'small', 'Held Moment', '+0.5s "Recently" window; 8% increased damage if you have hit recently.', m('recentlyWindow', 'flat', 0.5), m('damage', 'increased', 0.08, undefined, 'recentlyHit')),
      n('b', 'small', 'Lingering Stride', '+0.5s "Recently" window; 4% increased movement speed if you have used a movement skill recently.', m('recentlyWindow', 'flat', 0.5), m('moveSpeed', 'increased', 0.04, undefined, 'recentlyMoved')),
      n('', 'notable', 'Long Afterglow', '+1.0s "Recently" window; 12% increased skill effect duration; 12% increased damage if you have hit recently; 8% increased attack and cast speed if you have killed recently.', m('recentlyWindow', 'flat', 1.0), m('effectDuration', 'increased', 0.12), m('damage', 'increased', 0.12, undefined, 'recentlyHit'), m('attackSpeed', 'increased', 0.08, undefined, 'recentlyKilled'), m('castSpeed', 'increased', 0.08, undefined, 'recentlyKilled')),
      n('tail', 'keystone', 'Eternal Moment', '+2.5s "Recently" window; 20% increased skill effect duration; 15% less cooldown recovery rate.', m('recentlyWindow', 'flat', 2.5), m('effectDuration', 'increased', 0.20), m('cooldownRecovery', 'more', -0.15)),
    ],
  },
  {
    id: 'exp_p15_fin_short_memory', wedge: 'fin', theme: 'guile', shape: 'keystoneTail', pass: 15,
    nodes: [
      n('entry', 'small', 'Fleet Reset', '-0.4s "Recently" window; 6% increased evasion if you have not been hit recently.', m('recentlyWindow', 'flat', -0.4), m('evasion', 'increased', 0.06, undefined, 'notHurtRecently')),
      n('a', 'small', 'Shrugged Blow', '-0.4s "Recently" window; 10% increased energy shield recharge rate if you have not been hit recently.', m('recentlyWindow', 'flat', -0.4), m('esRechargeRate', 'increased', 0.10, undefined, 'notHurtRecently')),
      n('b', 'small', 'Fresh Footing', '-0.4s "Recently" window; 4% increased movement speed if you have not been hit recently.', m('recentlyWindow', 'flat', -0.4), m('moveSpeed', 'increased', 0.04, undefined, 'notHurtRecently')),
      n('', 'notable', 'Brief Recovery', '-0.6s "Recently" window; 18% increased energy shield recharge rate and 8% increased movement speed if you have not been hit recently; 10% increased evasion.', m('recentlyWindow', 'flat', -0.6), m('esRechargeRate', 'increased', 0.18, undefined, 'notHurtRecently'), m('moveSpeed', 'increased', 0.08, undefined, 'notHurtRecently'), m('evasion', 'increased', 0.10)),
      n('tail', 'keystone', 'Fleet Amnesia', '-1.8s "Recently" window; 25% more energy shield recharge rate and +2% maximum life regenerated per second if you have not been hit recently.', m('recentlyWindow', 'flat', -1.8), m('esRechargeRate', 'more', 0.25, undefined, 'notHurtRecently'), m('lifeRegenPct', 'flat', 0.02, undefined, 'notHurtRecently')),
    ],
  },
];
