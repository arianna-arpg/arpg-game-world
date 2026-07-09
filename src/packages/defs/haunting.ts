// ---------------------------------------------------------------------------
// THE HAUNTING — a restless grief that settles on charted ground.
//
// While it holds a zone, apparitions stream in around a standing GRIEF-ANCHOR.
// Two ways out: wait (the grief drifts on unrewarded), or BREAK THE ANCHOR —
// which manifests the WAILING ONE, and only its fall lifts the haunt (the
// reward path). Reuses the apparition wing (gloomlings, wisps, poltergeists,
// banshees — presence-banded), the undead faction, and the kill-handler
// registry; the overlay owns the settle/lapse lifecycle. Discovered in play;
// the Vault unlock gates TUNING, exactly like Brigands/Migration.
// ---------------------------------------------------------------------------

import { registerKillHandler } from '../../engine/killHandlers';
import { vec } from '../../core/math';
import { HauntField, type HauntSurge } from '../overlays/haunting';
import type { ContentPackage } from '../types';

export const HAUNT_SURGE: HauntSurge = {
  igniteChance: 0.010,        // per 0.5s step, × pressure — a slow, patient grief
  maxConcurrent: 2,
  ttlSeconds: [240, 420],     // an ignored haunt drifts on after 4-7 minutes
  streamInterval: [4.5, 7.5], // one apparition at a time — dread, not a flood
  maxAlive: 7,
  levelBonus: 1,
  // The apparition wing, banded: young ground grieves in gloomlings and
  // grave-lights; old ground sends its wights and wailers.
  roster: [
    { id: 'gloomling', weight: 3, presence: { to: 18, fadeOut: 8 } },
    { id: 'will_o_wisp', weight: 1 },
    { id: 'poltergeist', weight: 2, presence: { from: 7, fadeIn: 4 } },
    { id: 'barrow_wight', weight: 1, presence: { from: 10, fadeIn: 5 } },
    { id: 'banshee', weight: 1, presence: { from: 13, fadeIn: 6 } },
  ],
  anchorId: 'grief_anchor',
  bossId: 'wailing_one',
  bossLevelBonus: 2,
  color: '#b8c8e8',
};

// --- Kill rows (module scope — the open kill()-ladder registry) --------------

// THE ANCHOR BREAKS: the haunt LOCKS and the grief takes a body — the
// Wailing One manifests over the shattered anchor. Whoever broke it, it comes.
registerKillHandler({
  id: 'haunt_anchor_break',
  tag: 'haunt_anchor',
  run: ctx => {
    const hf = ctx.sim.hauntField;
    const info = hf?.hauntOn(ctx.zone.id);
    if (!hf || !info) return;
    hf.onAnchorBroken(info.id);
    const boss = ctx.spawnHostileAt(info.bossId,
      Math.max(1, ctx.zone.level + info.bossLevelBonus), ctx.actor.pos);
    boss.tag = 'wailing_one';
    ctx.flash(ctx.actor.pos, 120, info.color, 0.6);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
      'The anchor shatters — the WAILING ONE manifests!', '#d8e0f0', 17);
    ctx.bumpLedger('haunt_anchors_broken');
  },
});

// THE GRIEF IS FACED: the Wailing One's fall lifts the haunt — the reward path.
registerKillHandler({
  id: 'haunt_grief_faced',
  tag: 'wailing_one',
  run: ctx => {
    const hf = ctx.sim.hauntField;
    const info = hf?.hauntOn(ctx.zone.id);
    if (hf && info) hf.resolveHaunt(info.id);
    ctx.grantXp(160 + ctx.zone.level * 30);
    ctx.dropGemAt(ctx.actor.pos);
    ctx.dropGemAt(ctx.actor.pos);
    ctx.bumpLedger('haunts_lifted');
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
      'The wailing stills. The grief releases this ground.', '#d8e0f0', 17);
  },
});

export const HAUNTING: ContentPackage = {
  id: 'haunting',
  label: 'The Haunting',
  blurb: 'Grief does not bury well. Now and then it settles on some stretch of charted ground and holds it — the air runs cold, grave-lights drift the field, and the restless stream in around a standing anchor of sorrow. Leave it be and it drifts on in its own time, giving nothing. Or break the anchor — and understand that breaking it does not end the grief. It gives the grief a THROAT. The Wailing One walks until someone faces it; its fall is the only lifting that pays.',
  cost: 120,
  unlock: {
    id: 'haunting_unlock',
    label: 'Stand haunted ground (griefs settle on charted zones from low levels)',
    test: (ctx) => (ctx.ledger.haunt_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'haunting_mourner', label: 'Mourner', requirement: 'Lift 2 hauntings', cost: 160,
      test: (ctx) => (ctx.ledger.haunts_lifted ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'haunting_griefwarden', label: 'Grief-Warden', requirement: 'Lift 6 hauntings', cost: 240,
      test: (ctx) => (ctx.ledger.haunts_lifted ?? 0) >= 6,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'haunting_start', kind: 'startLevel', label: 'Hauntings begin at level', min: 3, max: 3, step: 1, defaultValue: 3 },
    { id: 'haunting_weight', kind: 'weight', label: 'Haunting frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 3,
  defaultEnabled: true,
  world: { overlay: (ctx) => new HauntField(ctx, HAUNT_SURGE) },
};
