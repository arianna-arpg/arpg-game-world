// ---------------------------------------------------------------------------
// THE HAUNTING — a restless grief that settles on charted ground, BY NIGHT.
//
// While it holds a zone, apparitions stream in around a standing GRIEF-ANCHOR.
// Break the anchor and the WAILING ONE manifests; only its fall lifts the
// haunt (the reward path). THE NIGHT CANON (all data on the surge): griefs
// settle only in the dark (beginPhases) and cannot hold their shape past it
// (holdPhases) — at dawn the haunt DISSIPATES: its spawns visibly WANE for the
// last waneSeconds (a transparent pulse), then fade where they stand, paying
// nothing. But the light erases nothing (carryWound): a banished grief banks
// the anchor's cracks, a broken anchor, the Wailing One's hurts — and the next
// grief to settle, wherever it lands, RESUMES them. Effort is never wasted;
// it is carried to another night. Held ground runs visibly COLD (the wash
// knob → zoneWash seam), and a grief FACED buys a reprieve (the resolve
// cooldown) — commitment clears the nights that follow. Reuses the
// apparition wing (gloomlings,
// wisps, poltergeists, banshees — presence-banded), the undead faction, and
// the kill-handler registry; the overlay owns the settle/wane/dissipate
// lifecycle. Discovered in play; the Vault unlock gates TUNING, exactly like
// Brigands/Migration.
// ---------------------------------------------------------------------------

import { registerKillHandler } from '../../engine/killHandlers';
import { vec } from '../../core/math';
import { HauntField, type HauntSurge } from '../overlays/haunting';
import type { ContentPackage } from '../types';

export const HAUNT_SURGE: HauntSurge = {
  igniteChance: 0.010,        // per 0.5s step, × pressure — a slow, patient grief
  maxConcurrent: 2,
  // The phase-agnostic BACKSTOP lapse. Under night-only holdPhases the DAWN is
  // what actually ends an unbroken haunt (a whole night is ~96s, shorter than
  // this floor), so the ttl only bites if holdPhases is widened or removed.
  ttlSeconds: [240, 420],
  streamInterval: [4.5, 7.5], // one apparition at a time — dread, not a flood
  maxAlive: 7,
  levelBonus: 1,
  // THE NIGHT CANON: settles only in the dark, dissolves in the light — the
  // spirits pulse thin through the last stretch of night, and what the dawn
  // takes rides forward (carryWound) instead of paying out partial rewards.
  beginPhases: ['night'],
  holdPhases: ['night'],
  waneSeconds: 25,
  carryWound: true,
  // DREAD MADE VISIBLE: the held zone's whole air runs cold-pale while the
  // grief holds (zoneWash seam; colour falls back to the surge colour), and
  // the wash thins with the wane — the world warming is the dawn's herald.
  wash: { alpha: 0.16 },
  // THE REPRIEVE: felling the Wailing One buys quiet — no fresh settle for
  // 1.25–2 day-turns (a night is ~96s of the 240s wheel, so at least the NEXT
  // night is grief-free). Only a FACED grief cools: dissipation carries its
  // wound instead, and an ignored lapse never earned a rest.
  resolveCooldownSeconds: [300, 480],
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
  blurb: 'Grief does not bury well. By night it settles on some stretch of charted ground and holds it — the air runs cold, grave-lights drift the field, and the restless stream in around a standing anchor of sorrow. Leave it be and the dawn unbinds it, giving nothing. Or break the anchor — and understand that breaking it does not end the grief. It gives the grief a THROAT. The Wailing One walks until someone faces it — and if the light takes it first, watch the spirits thin and gutter as day nears, then remember this: the light erases nothing. What you cracked stays cracked, what you wounded stays wounded, and the grief returns to some other ground the next nightfall, carrying every blow.',
  cost: 120,
  unlock: {
    id: 'haunting_unlock',
    label: 'Stand haunted ground (griefs settle on charted zones by night)',
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
  validate: (look) => [
    ...HAUNT_SURGE.roster.filter(e => !look.monster(e.id)).map(e => `apparition '${e.id}' unknown`),
    ...(look.monster(HAUNT_SURGE.anchorId) ? [] : [`anchor '${HAUNT_SURGE.anchorId}' unknown`]),
    ...(look.monster(HAUNT_SURGE.bossId) ? [] : [`boss '${HAUNT_SURGE.bossId}' unknown`]),
  ],
};
