// ---------------------------------------------------------------------------
// THE WRAITHSAIL — the sea's lone wanderer.
//
// ONE ghost ship drifts the open ocean of the node map: sporadic on calm
// seas, and when a weather front overlaps her she aligns to its velocity and
// RIDES it — the Dutchman arrives WITH the storm (the sim bridges the fronts
// in; relationship row below folds storm pressure into her gate too). She is
// never a flood and never a front: the Deadwake is the land's corpse tide,
// the Wraithsail is a single hull tracing the sea with a ghost wake.
//
// She touches the world exactly twice. CROSS HER UNDER SAIL and the boarding
// dwell arms on her hull: a minted deck chain — weather deck, a hold paying
// wreck-loot (the DROWNED REGISTER + the richest vestige side-roll afloat),
// and the great cabin where the TIDEBOUND REGENT waits crowned over the
// tidebound hoard. Or idle at an ISLE/PORT with her near and she may come
// alongside for the layover — the Drowned Court walks ashore, once, as an
// event-scoped party (her ONLY landfall: no port tides, no pours). Fell the
// Regent in his cabin and the Wraithsail goes down with him — for a while.
//
// Reuses the Drowned Court roster + shipdeck tileset wholesale, the realm-
// gate dwell fabric for the boarding, the deadwake-stream materializer mold
// ashore, and the voyage's own coordinates for the interception. Discovered
// in play; the Vault unlock gates TUNING, like every sibling.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { registerTransit } from '../../data/transit';
import { WraithsailField, type WraithsailSurge } from '../overlays/wraithsail';
import type { ContentPackage } from '../types';

export const WRAITHSAIL_SURGE: WraithsailSurge = {
  baseSpeed: 1.2,             // node-units/sec — a patient wanderer
  rideSpeedMul: 1.15,         // the storm carries her a shade faster than itself
  minRideSpeed: 2.2,
  turnChance: 0.05,           // per 0.5s step: sporadic wander on calm seas
  becalmChance: 0.008,        // now and then she simply sits
  becalmSeconds: [10, 26],
  wakeEvery: 6,               // a ghost-wake point every few seconds of way
  wakeKeep: 12,
  boundsPad: 130,             // she roams past the charted coast, not past reason
  interceptRadius: 34,        // you must genuinely CROSS her, not share a sea
  sightRadius: 140,           // 'a ghost sail crosses the horizon…'
  boardCooldownSeconds: [180, 300],
  dockRadius: 60,
  dockChance: 0.012,          // per step while you idle at an eligible port, × pressure
  dockSeconds: [75, 130],
  dockCooldownSeconds: [300, 480],
  respawnSeconds: [600, 900], // a sunk Dutchman stays sunk a while
  // The shore party — the court in marching order (hard floors as ever).
  party: [
    { id: 'drowned_oarsman', weight: 4 },
    { id: 'barnacle_knight', weight: 2, presence: { from: 6 } },
    { id: 'sunken_courtier', weight: 2, presence: { from: 9 } },
    { id: 'tide_vicar', weight: 1, presence: { from: 9 } },
    { id: 'anchor_wight', weight: 1, presence: { from: 12 } },
  ],
  partyCount: [5, 8],
  partyLevelBonus: 1,
  heraldId: 'barnacle_knight',
  tileset: 'shipdeck',
  regentId: 'tidebound_regent',
  cofferBand: [2, 4],
  color: '#7ad8d8',
};

// The boarding dwell rides the realm-gate family with a hull-sized reach —
// nosing into her shadow and holding fast IS the boarding action.
registerTransit({ kind: 'realm_gate:wraithsail', dwell: 0.9, radius: 110, ring: { radius: 52, width: 4, color: WRAITHSAIL_SURGE.color } });

// --- Kill rows (module scope — the open kill()-ladder registry) --------------

// THE REGENT FALLS: the Wraithsail goes down with her master. The hoard rides
// MonsterDef.loot (tidebound_hoard); this row sinks the ship, banks the
// ledger the Tidebreaker tier reads, and says so out loud.
registerKillHandler({
  id: 'wraithsail_regent',
  when: ctx => ctx.actor.defId === 'tidebound_regent',
  run: ctx => {
    const wf = ctx.sim.wraithsailField;
    const sank = wf?.onRegentSlain() ?? false;
    ctx.bumpLedger('tidebound_regent_slain');
    if (ctx.credit) {
      ctx.grantXp(380 + ctx.zone.level * 55);
      for (let i = 0; i < 3; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.flash(ctx.actor.pos, 180, WRAITHSAIL_SURGE.color, 0.9);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      sank
        ? 'The Tidebound Regent falls — and the Wraithsail goes down with him!'
        : 'The Tidebound Regent falls — the tide finally lets him go.',
      '#bfe8ec', 19);
  },
});

export const WRAITHSAIL: ContentPackage = {
  id: 'wraithsail',
  label: 'The Wraithsail',
  color: '#7ad8d8',
  blurb: 'One ship, and she is dead. The Wraithsail wanders the open sea — becalmed for days, then RUNNING when a storm takes her, because she rides the weather the way gulls ride a wake: the worst skies on the map arrive with a ghost sail in them. Cross her under sail and she will have you aboard: fight the Drowned Court across her weather deck, break into a hold paying drowned finery and old vestiges, and put the TIDEBOUND REGENT to rest in his great cabin — if you can time the tide he wears as armor. Or linger at an island harbor with her glass on you, and she may simply come alongside: the Court walks ashore, once, and takes the air until someone objects. Sink her master and the sea is quiet — for a while.',
  cost: 140,
  unlock: {
    id: 'wraithsail_unlock',
    label: 'Sight the Wraithsail (sail near her, or be ashore when she docks)',
    test: (ctx) => (ctx.ledger.wraithsail_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'wraithsail_boarder', label: 'Boarder', requirement: 'Board the Wraithsail', cost: 160,
      test: (ctx) => (ctx.ledger.wraithsail_boarded ?? 0) >= 1,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'wraithsail_tidebreaker', label: 'Tidebreaker', requirement: 'Fell the Tidebound Regent in his great cabin', cost: 260,
      test: (ctx) => (ctx.ledger.tidebound_regent_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'wraithsail_start', kind: 'startLevel', label: 'The Wraithsail rises at level', min: 6, max: 6, step: 1, defaultValue: 6 },
    { id: 'wraithsail_weight', kind: 'weight', label: 'Wraithsail frequency', min: 10, max: 45, step: 5, defaultValue: 25 },
  ],
  defaultWeight: 25,
  defaultStartLevel: 6,
  defaultEnabled: true,
  world: { overlay: (ctx) => new WraithsailField(ctx, WRAITHSAIL_SURGE) },
  // The storm and the ship are one story: fronts CARRY her (the sim bridge),
  // and storm pressure raises her whole calendar (the gate fold).
  relationships: [
    { a: 'storm_fronts', b: 'wraithsail', kind: 'amplifies', strength: 1.25 },
  ],
  validate: (look) => [
    ...WRAITHSAIL_SURGE.party.filter(e => !look.monster(e.id)).map(e => `shore party '${e.id}' unknown`),
    ...(look.monster(WRAITHSAIL_SURGE.heraldId) ? [] : [`herald '${WRAITHSAIL_SURGE.heraldId}' unknown`]),
    ...(look.monster(WRAITHSAIL_SURGE.regentId) ? [] : [`regent '${WRAITHSAIL_SURGE.regentId}' unknown`]),
    ...(look.monster('drowned_coffer') ? [] : ['hold coffer \'drowned_coffer\' unknown']),
    ...(look.tileset(WRAITHSAIL_SURGE.tileset) ? [] : [`deck tileset '${WRAITHSAIL_SURGE.tileset}' unknown`]),
  ],
};
