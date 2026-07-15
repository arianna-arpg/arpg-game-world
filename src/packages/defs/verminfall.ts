// ---------------------------------------------------------------------------
// THE VERMINFALL — rats, roaches, and the warren in the town's shadow.
//
// The first faction whose target is your HOME GROUND. Infestations claim
// charted zones CLOSE to town (the inverse of the Contagion's far-flung
// seeding) and stand there festering: warren nests to break, vermin packs to
// wade, and — when the last nest splits — the RAT KING, whose fall alone
// clears the ground. While a warren festers past its grace, the town's own
// ambient vermin MULTIPLY (VerminfallField.townPressure → spawnWildlife):
// growth carries risk, and the town says so in rats under the benches.
//
// The family also lives OUTSIDE the event: gutter rats and roaches ride the
// WILDLIFE prey rows (wolves hunt them, hungry packs migrate toward them),
// fester rats EAT CORPSES (MonsterDef.carrion — the necromancer's rival),
// and the verminkin war with the goblin warband over the same soft ground
// (RELATIONS hostile pairs seed real war zones). Discovered in play; the
// Vault unlock gates TUNING, exactly like Contagion/Haunting.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { VerminfallField, type VerminfallSurge } from '../overlays/verminfall';
import type { ContentPackage, FactionSpec } from '../types';

/** THE warren-amber — one hue for the map ring AND the faction colour, so the
 *  gnawing reads as one thing everywhere it appears. */
const VERMIN_COLOR = '#b39a5a';

/** The whole Verminfall mechanic as data — every number is a knob. */
const VERMIN_SURGE: VerminfallSurge = {
  igniteChance: 0.014,   // per 0.5s step — patient, but nearer than you'd like
  maxConcurrent: 1,      // one warren at a time reads cleanest (a knob)
  seedMaxDist: 260,      // claims only the town's near ring — the warren wants what the town keeps
  levelMax: 12,          // the soft ground; a harder tuning can send them deeper
  nests: [2, 4],         // warren nests per claim (the clear condition)
  packCount: [1, 3],     // vermin packs per visit (lerped by standing nests)
  packSize: [3, 5],      // …of 3-5 vermin each (they come in numbers)
  faction: 'vermin',
  kingDefId: 'rat_king',
  kingLevelBonus: 2,
  reward: { xpBase: 220, xpPerLevel: 40, gems: 3 },
  graceSeconds: 150,     // fester this long before the town's own vermin swell
  townPressureBoost: 0.75,
  townPressureCap: 2.5,
  color: VERMIN_COLOR,
};

/** THE VERMINFALL — the warren-folk faction. Baseline-context: their grudges
 *  (goblin, gnoll, flesh) seed real procedural war zones, so the world's soft
 *  ground stages warband-vs-warren brawls with no event needed. */
const VERMIN_FACTION: FactionSpec = {
  id: 'vermin',
  name: 'the Verminfall',
  color: VERMIN_COLOR,
  traits: { roaming: 1.15, aggression: 1.1, warlordHome: 'origin', temper: 'skittish' },
  roster: [
    // The tide: warren rats throng the soft ground and thin with depth…
    { id: 'warren_rat', weight: 4, presence: { to: 22, fadeOut: 12 } },
    { id: 'fester_rat', weight: 2, presence: { from: 3, fadeIn: 3 } },
    // …while the verminkin — the warren's THINKING tier — hold the line.
    { id: 'verminkin_skulker', weight: 3 },
    { id: 'verminkin_broodpriest', weight: 2, presence: { from: 5, fadeIn: 3 } },
  ],
  warlord: 'rat_king',
  relations: [
    // The warband and the warren want the SAME soft ground near the roads.
    { a: 'vermin', b: 'goblin', kind: 'hostile', strength: 1 },
    // Gnolls eat rats. Rats resent this.
    { a: 'vermin', b: 'gnoll', kind: 'hostile', strength: 1 },
    // The Glut eats EVERYTHING — and the swarm is mostly meat.
    { a: 'vermin', b: 'flesh', kind: 'hostile', strength: 1 },
  ],
};

// --- Kill rows (module scope — the open kill()-ladder registry) --------------

// A WARREN NEST BREAKS: the ledger ticks down — and the LAST nest calls up the
// Rat King over the splinters. Whoever broke it, he comes.
registerKillHandler({
  id: 'warren_nest_broken',
  tag: 'warren_nest',
  run: ctx => {
    const vf = ctx.sim.verminfallField;
    const res = vf?.onNestBroken(ctx.zone.id);
    ctx.bumpLedger('warren_nests_broken');
    if (!vf || !res) return;
    if (res.kingReady) {
      const surge = vf.surge();
      const king = ctx.spawnHostileAt(surge.kingDefId,
        Math.max(1, ctx.zone.level + surge.kingLevelBonus), ctx.actor.pos);
      king.tag = 'rat_king_manifest';
      ctx.flash(ctx.actor.pos, 130, surge.color, 0.7);
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
        'The warren SCREAMS — the RAT KING rises!', surge.color, 17);
    } else {
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 36),
        `The nest splits — ${res.remaining} warren${res.remaining === 1 ? '' : 's'} still seethe${res.remaining === 1 ? 's' : ''}…`, VERMIN_COLOR, 13);
    }
  },
});

// THE KING FALLS: the infestation clears — the reward path, and the town's
// vermin thin back to texture.
registerKillHandler({
  id: 'rat_king_laid_low',
  tag: 'rat_king_manifest',
  run: ctx => {
    const vf = ctx.sim.verminfallField;
    const cleared = vf?.onKingSlain(ctx.zone.id) ?? false;
    ctx.bumpLedger('rat_kings_slain');
    if (cleared) ctx.bumpLedger('infestations_cleared');
    const surge = vf?.surge();
    if (surge) {
      ctx.grantXp(Math.round(surge.reward.xpBase + ctx.zone.level * surge.reward.xpPerLevel));
      for (let i = 0; i < surge.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
      'The King is dead. The warren empties — the town breathes easier.', surge?.color ?? VERMIN_COLOR, 17);
  },
});

export const VERMINFALL: ContentPackage = {
  id: 'verminfall',
  label: 'The Verminfall',
  color: VERMIN_COLOR,
  blurb: 'Everything the town builds, something smaller wants. Warrens claim the near ground — never the far wilds, always the soft ring you cross every day — and stand there festering: nests seething with rats, verminkin skulking the hedgerows, and under it all a King. Leave it be and nothing is taken from you, exactly; the rats simply MULTIPLY, in the gutters, under the benches, down in the cellar, until the town feels like it belongs to them. Break every nest and the warren answers — the Rat King rises over the splinters, and only his fall clears the ground. The wolves, at least, approve of all this: more rats than the meadow has ever carried, and every one of them catchable.',
  cost: 110,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once the player has walked into a claimed zone.
  unlock: {
    id: 'verminfall_unlock',
    label: 'Walk a claimed warren-ground (infestations claim the near ring)',
    test: (ctx) => (ctx.ledger.infestation_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'verminfall_ratcatcher', label: 'Ratcatcher', requirement: 'Clear 2 infestations', cost: 150,
      test: (ctx) => (ctx.ledger.infestations_cleared ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'verminfall_wardenofthehem', label: 'Warden of the Hem', requirement: 'Clear 6 infestations', cost: 230,
      test: (ctx) => (ctx.ledger.infestations_cleared ?? 0) >= 6,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'verminfall_start', kind: 'startLevel', label: 'Infestations begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'verminfall_weight', kind: 'weight', label: 'Infestation frequency', min: 20, max: 50, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 2,
  defaultEnabled: true,
  world: { overlay: (ctx) => new VerminfallField(ctx, VERMIN_SURGE) },
  factions: [VERMIN_FACTION],
  validate: (look) => [
    ...(look.faction(VERMIN_SURGE.faction) ? [] : [`vermin faction '${VERMIN_SURGE.faction}' unknown`]),
    ...(look.monster(VERMIN_SURGE.kingDefId) ? [] : [`Rat King '${VERMIN_SURGE.kingDefId}' unknown`]),
    ...(look.monster('warren_nest') ? [] : [`warren nest 'warren_nest' unknown`]),
  ],
};
