// ---------------------------------------------------------------------------
// BOUNTY WRITS — the 'bounty' zone objective, every number as data.
//
// The zone posts writs on `count` of its OWN bodies: each is minted a name
// from the nemesis vocabulary (data/nemesis.ts — faction pools and all),
// promoted to a rarity, tagged a MARK, and left to roam with the population.
// Claim every writ and the objective completes. Any death counts — a faction
// brawl or a hazard that fells a mark did your work for you (the same
// honesty as 'clear').
//
// The hunt is PURE POPULATION STATE — no counters, no clocks: remaining =
// living marks. Zone Memory therefore resumes a half-claimed writ with the
// SAME named quarry at the same wounds, entirely for free (names, rarity,
// tags and HP all ride ZoneEnemyMemo).
//
// Per-writ kill beat rides the shared kill-handler fabric (below); the
// off-screen chevron only points once the LAST few marks remain — a hunt is
// a hunt, not a checklist, but the final stragglers must never be pixel-
// hunting.
// ---------------------------------------------------------------------------

import { registerKillHandler } from '../engine/killHandlers';
import type { MonsterRarity } from '../engine/rarity';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';

export const BOUNTY_CFG = {
  /** How many writs the zone posts (rolled per visit off the layout rng —
   *  the same band every re-entry of a remembered seed). */
  count: [3, 5] as [number, number],
  /** The marks' promotion (ObjectiveSpec.rarity/stacks override). */
  rarity: 'rare' as MonsterRarity,
  stacks: 1,
  /** Per-writ claim beat: a taste of xp per mark (base + zone level × per).
   *  The zone's completion bounty still pays the real reward. */
  perMarkXp: { base: 12, perLevel: 4 },
  /** The chevron holds its tongue until this few marks remain — the hunt
   *  stays a hunt; only the last stragglers get pointed at. */
  chevronWhenRemaining: 2,
  /** Writ palette (texts, flashes, chevrons). */
  accent: '#e8a84a',
} as const;

// The per-writ claim beat: a small bounty the moment ANY death claims a mark
// (the player's blade, a rival faction, a hazard — the writ cares only that
// the quarry fell). Stateless, tag-keyed — the kill-handler fabric's bread.
registerKillHandler({
  id: 'bounty_writ_claim',
  tag: 'bounty_mark',
  run: ctx => {
    const xp = Math.round(BOUNTY_CFG.perMarkXp.base + Math.max(1, ctx.zone.level) * BOUNTY_CFG.perMarkXp.perLevel);
    if (xp > 0) ctx.grantXp(xp);
    ctx.bumpLedger('bounty_writs_claimed');
    ctx.text(ctx.actor.pos, `the writ on ${ctx.actor.name} is claimed`, BOUNTY_CFG.accent, 14);
    ctx.flash(ctx.actor.pos, 60, BOUNTY_CFG.accent, 0.5);
  },
});

// The last stragglers: once the hunt is nearly done, the remaining marks get
// edge chevrons (name as label — you know exactly who still owes the writ).
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.bountyView();
  if (!v || v.remaining === 0 || v.remaining > BOUNTY_CFG.chevronWhenRemaining) return [];
  return v.marks.map((m, i) => ({
    id: `bounty_mark_${i}`, pos: m.pos, color: BOUNTY_CFG.accent, glyph: '☠',
    label: m.name, z: 1,
  }));
});
