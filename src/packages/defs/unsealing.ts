// ---------------------------------------------------------------------------
// THE UNSEALING — the locked-tomb event of the Sepulcher Sands.
//
// Somewhere under the deep desert one pocket is THE REGENT'S TOMB: his arena
// waits behind a sealed door bearing FOUR TALISMANS (cold braziers in an
// arc). Four canopic seal-bearers — distinct bodies, distinct jars — keep
// OTHER Sepulcher Sands pockets across the deserts; each one slain flares
// its talisman on the door, wherever the door is. Find the tomb and the map
// marks its host zone with the funerary urn (fog:'always', the count spoken
// out loud); light all four and the door stands open — walk it and the Sand
// Regent wakes at full strength, his hoard behind him.
//
// PRESSURELESS (the Pit's word): the Unsealing is a PLACE-event living in
// off-graph pockets — it holds no seat in the weight budget, marches
// nowhere, and rolls purely off each pocket's mint seed (UnsealingField
// .roleFor). The durable ledger (flared wards / found tomb / Regent's fate)
// is the overlay; the engine materializes the sites (world.ts
// materializeUnsealing) and the kill rows below call the ledger back.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { UnsealingField } from '../overlays/unsealing';
import type { ContentPackage } from '../types';
import type { UnsealingSurge } from '../unsealing';

/** The dynasty's gold (toasts, flashes, the marker stroke). */
const SEPULCHER_GOLD = '#e8c060';

export const UNSEALING_SURGE: UnsealingSurge = {
  // Per-pocket odds: with the sepulcher_site composition seeding several
  // descents per desert country, a run that works the erg meets both sides
  // of the mechanic without farming (tomb ~1 in 4, seal-bearer ~2 in 5).
  tombChance: 0.25,
  canopicChance: 0.42,
  wards: [
    { id: 'jackal', monsterId: 'canopic_jackal', label: 'the Jackal talisman' },
    { id: 'falcon', monsterId: 'canopic_falcon', label: 'the Falcon talisman' },
    { id: 'ape', monsterId: 'canopic_ape', label: 'the Ape talisman' },
    { id: 'vizier', monsterId: 'canopic_vizier', label: 'the Vizier talisman' },
  ],
  door: {
    radius: 27,
    wakeRadius: 150,
    brazierRadius: 9,
    brazierRing: 74,
    guardId: 'sarcophagus_warden',
    guards: [2, 2],
  },
  canopic: {
    guardId: 'sarcophate_legionary',
    guards: [2, 3],
    rarity: 'champion',
  },
  regent: { monsterId: 'sand_regent', rarity: 'crowned' },
  gold: SEPULCHER_GOLD,
};

// --- kill bounties (registered on import — the engine stays dumb) --------------

// A CANOPIC SEAL-BEARER falls: its ward flares on the Regent's door, wherever
// that door is. The ward rides Actor.eventKey (stamped at spawn — the one
// sanctioned kill→instance resolver), so one row serves all four bodies.
registerKillHandler({
  id: 'canopic_seal',
  tag: 'canopic_seal',
  run: ctx => {
    const uf = ctx.sim.unsealingField;
    const ward = ctx.actor.eventKey;
    if (!uf || !ward) return;
    if (!uf.flare(ward)) return;
    ctx.bumpLedger('canopic_flared');
    const cfg = uf.surge();
    const n = uf.flaredCount(), total = cfg.wards.length;
    const label = cfg.wards.find(w => w.id === ward)?.label ?? 'a talisman';
    ctx.flash(vec(ctx.actor.pos.x, ctx.actor.pos.y), 150, cfg.gold, 0.8);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 60),
      n >= total
        ? `${label} flares — the LAST seal! The Regent's door stands open!`
        : `${label} flares on the Regent's door — ${n}/${total}`,
      cfg.gold, 16);
  },
});

// THE SAND REGENT is unmade: the Unsealing resolves (the door thereafter
// stands open on an empty throne; the hoard rode MonsterDef.loot).
registerKillHandler({
  id: 'sand_regent',
  tag: 'sand_regent',
  run: ctx => {
    const uf = ctx.sim.unsealingField;
    if (!uf || uf.regentSlain()) return;
    uf.onRegentSlain();
    ctx.bumpLedger('regent_slain');
    ctx.flash(vec(ctx.actor.pos.x, ctx.actor.pos.y), 220, UNSEALING_SURGE.gold, 1);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 70),
      'The Sand Regent is UNMADE — the dynasty\'s throne stands empty!',
      '#ffd890', 18);
  },
});

export const UNSEALING: ContentPackage = {
  id: 'unsealing',
  label: 'The Unsealing',
  color: SEPULCHER_GOLD,
  blurb: 'Somewhere under the deep desert waits the Regent\'s tomb: a door sealed behind four talismans. Four canopic seal-bearers keep vaults of their own across the Sepulcher Sands — each one slain lights a talisman on that door, wherever it is. Find the tomb and the map remembers it; light all four and walk through. He is at full strength. So is his hoard.',
  cost: 100,
  // DISCOVERY: the first descent surfaces the codex entry (the pit's
  // cellar_entered pattern — sepulcher_entered is the gateway ledger the
  // sepulcher_gate sidezone bumps).
  unlock: {
    id: 'unsealing_unlock',
    label: 'Descend into the Sepulcher Sands',
    test: (ctx) => (ctx.ledger.sepulcher_entered ?? 0) >= 1,
  },
  modifiers: [],          // no sliders — a place-event, not a pressure event
  defaultWeight: 0,
  defaultStartLevel: 0,
  defaultEnabled: true,   // part of the world from run 1 (the tomb simply IS)
  pressureless: true,
  world: { overlay: (ctx) => new UnsealingField(ctx, UNSEALING_SURGE) },
  validate: (look) => [
    ...UNSEALING_SURGE.wards.filter(w => !look.monster(w.monsterId))
      .map(w => `canopic seal-bearer '${w.monsterId}' unknown`),
    ...(look.monster(UNSEALING_SURGE.regent.monsterId) ? [] : [`regent '${UNSEALING_SURGE.regent.monsterId}' unknown`]),
    ...(look.monster(UNSEALING_SURGE.door.guardId) ? [] : [`door guard '${UNSEALING_SURGE.door.guardId}' unknown`]),
    ...(look.monster(UNSEALING_SURGE.canopic.guardId) ? [] : [`canopic guard '${UNSEALING_SURGE.canopic.guardId}' unknown`]),
  ],
};
