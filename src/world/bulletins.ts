// ---------------------------------------------------------------------------
// WORLD BULLETINS + THE INFO STREAM — the player's information surfaces as
// open, curatable DATA (mirrors mapMarkers / zoneInfo: register at import
// time, the engine stays dumb).
//
// Three fabrics live here, one file because they are ONE idea — the player
// composes their own stream of information, nothing is hardwired:
//
//  - WORLD BULLETINS (the producers): a bulletin is a one-line, player-facing
//    notice about the LIVING WORLD — a zone falling to a faction, a surge
//    igniting, a writ posted. An overlay queues lines on itself and registers
//    a source; the engine's single collect pumps every source each tick.
//    Each line names a NOTICE CHANNEL (registerNoticeChannel — an open
//    registry with per-channel defaults) so the player can mute exactly the
//    news they don't want. DRAIN SEMANTICS: a source returns what's NEW since
//    its last call and clears its own queue; a source that throws is skipped.
//
//  - THE NOTICE FEED (the presentation): bulletins no longer float over the
//    hero's head fighting the combat text — they land in a SCREEN-ANCHORED
//    stack (World.notices → renderer drawNoticeFeed): newest on top, each
//    line on its own clock, held legible then fading out over the player's
//    own duration (Settings.noticeSec), at the player's own anchor
//    (Settings.noticeAnchor, a registry row). The world keeps a small
//    rolling buffer; the CLIENT decides what shows (channel toggles apply at
//    draw, so muting is instant and retroactive).
//
//  - FLOAT KINDS + THE PICKUP FEED: every world-anchored floater may carry a
//    KIND (registerFloatKind — damage numbers, combat cries, xp, drop names,
//    resource gains…), gated per-kind at DRAW by Settings.floatKinds — the
//    "which numbers do I want on my battlefield" curation. The PICKUP FEED
//    is the quiet ledger of what actually entered your bags ("Warcry
//    (Common) x1"), a screen-anchored right-flank stack fed at the pickup
//    chokepoints, coalescing repeats, fading on its own player-set clock.
//    It draws on the CANVAS, which composites BELOW every DOM panel by
//    construction — an open inventory always wins the pixels.
//
// LAWS: registries are open (a new package registers its channel/kind and
// the Options panel grows the toggle for free); the WORLD mints everything
// and the CLIENT filters at draw (co-op clients curate their own stream off
// the host's one truth — the tell-wire idiom, worn by text); pure list laws
// (push/prune/coalesce) live here so the engine, the wire, and the probes
// share one implementation.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';

export interface WorldBulletin {
  text: string;
  /** Accent colour (default: BULLETIN_CFG.color). */
  color?: string;
  /** Font size (default: BULLETIN_CFG.size). */
  size?: number;
  /** The NOTICE CHANNEL this line belongs to (a registerNoticeChannel id) —
   *  the player's mute switch. Absent = 'world', the catch-all. */
  channel?: string;
}

/** The shared bulletin look — one place, no per-call literals. */
export const BULLETIN_CFG = {
  /** The war-report amber every un-tinted bulletin wears. */
  color: '#e8a050',
  size: 15,
} as const;

/** A drained producer of fresh bulletins — see DRAIN SEMANTICS above. */
export type BulletinSource = (world: World) => WorldBulletin[];

const SOURCES: BulletinSource[] = [];

/** Register a bulletin source (called once at boot per feature, import-time). */
export function registerBulletinSource(s: BulletinSource): void { SOURCES.push(s); }

/** Drain every source. Called once per tick by World.update; each returned
 *  line lands in the notice feed. */
export function collectBulletins(world: World): WorldBulletin[] {
  const out: WorldBulletin[] = [];
  for (const s of SOURCES) {
    try { out.push(...s(world)); } catch { /* a bad source never silences the rest */ }
  }
  return out;
}

// --- NOTICE CHANNELS (what KIND of news a bulletin is) ------------------------

export interface NoticeChannelDef {
  id: string;
  /** The Options row's name. */
  label: string;
  /** The Options row's tooltip — say what rides this channel. */
  blurb: string;
  /** Shows unless the player mutes it (Settings.noticeChannels override). */
  defaultOn: boolean;
}

const NOTICE_CHANNELS: Record<string, NoticeChannelDef> = {};

/** Register a notice channel (import-time, once per id — a package that
 *  mints its own kind of news registers a row and the Options panel grows
 *  the toggle for free). Re-registration overwrites (HMR-safe). */
export function registerNoticeChannel(def: NoticeChannelDef): void {
  NOTICE_CHANNELS[def.id] = def;
}

/** Registered channels, registration order (the Options panel's roster). */
export function noticeChannels(): NoticeChannelDef[] { return Object.values(NOTICE_CHANNELS); }

/** Is a channel on under these player prefs? Missing pref → the channel's own
 *  default; unknown channel → true (tolerance: news never silently vanishes
 *  because a row was renamed). */
export function noticeChannelOn(prefs: Record<string, boolean> | undefined, id: string): boolean {
  return prefs?.[id] ?? NOTICE_CHANNELS[id]?.defaultOn ?? true;
}

// The debut roster. 'world' is the catch-all every untagged bulletin rides —
// packages tag their lines (channel: 'events') to join a finer switch.
registerNoticeChannel({
  id: 'world', label: 'World News',
  blurb: 'The catch-all — anything a corner of the world announces that claims no finer channel.',
  defaultOn: true,
});
registerNoticeChannel({
  id: 'events', label: 'World Events',
  blurb: 'Ignitions and endings — quickenings, apparitions, hive cycles, the sky-scale happenings.',
  defaultOn: true,
});
registerNoticeChannel({
  id: 'war', label: 'War Reports',
  blurb: 'Front lines and conquests — crusade news, faction ground changing hands.',
  defaultOn: true,
});
registerNoticeChannel({
  id: 'civic', label: 'Civic Notices',
  blurb: 'The towns talking — writs posted, boroughs stirring, wares and works.',
  defaultOn: true,
});

// --- THE NOTICE FEED (screen-anchored world news) ------------------------------

/** One line standing in the feed. bornAt is WORLD-clock seconds — the feed
 *  ages with the game (a paused menu freezes the news mid-breath). */
export interface NoticeEntry {
  text: string;
  color: string;
  size: number;
  channel: string;
  bornAt: number;
}

export type NoticeAnchorId = 'top' | 'topLeft' | 'topRight' | 'bottom';

/** WHERE the feed stacks — a registry so a future seat (couch flank, a
 *  second monitor someday) is a row, not a rewrite. */
export const NOTICE_ANCHORS: { id: NoticeAnchorId; label: string; blurb: string }[] = [
  { id: 'top', label: 'Top Center', blurb: 'Under the zone name — the classic marquee.' },
  { id: 'topLeft', label: 'Top Left', blurb: 'Off the action, reads like a log.' },
  { id: 'topRight', label: 'Top Right', blurb: 'Off the action, opposite flank.' },
  { id: 'bottom', label: 'Bottom Center', blurb: 'Above the skill bar, newest rising.' },
];

export const NOTICE_CFG = {
  /** World-side rolling buffer (what the wire ships); the player's duration
   *  decides what SHOWS — this only bounds memory. */
  keep: 14,
  /** Prune anything older than any player duration could still show. */
  maxKeepSec: 30,
  /** The player dial's rails + default (Settings.noticeSec). */
  defaultSec: 3, secMin: 1, secMax: 10,
  /** Fraction of the life held at FULL alpha before the fade begins —
   *  legible first, gone by the clock. */
  holdFrac: 0.35,
  anchorDefault: 'top' as NoticeAnchorId,
} as const;

/** Land a bulletin in the feed (the engine's pump calls this per line). */
export function pushNotice(list: NoticeEntry[], b: WorldBulletin, now: number): void {
  list.push({
    text: b.text,
    color: b.color ?? BULLETIN_CFG.color,
    size: b.size ?? BULLETIN_CFG.size,
    channel: b.channel ?? 'world',
    bornAt: now,
  });
  while (list.length > NOTICE_CFG.keep) list.shift();
}

/** Age the feed (the engine's per-frame sweep — cheap on ≤keep entries). */
export function pruneNotices(list: NoticeEntry[], now: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    if (now - list[i].bornAt > NOTICE_CFG.maxKeepSec) list.splice(i, 1);
  }
}

// --- FLOAT KINDS (world-anchored text as curatable channels) -------------------

export interface FloatKindDef {
  id: string;
  label: string;
  blurb: string;
  /** Draws unless the player hides it (Settings.floatKinds override). */
  defaultOn: boolean;
}

const FLOAT_KINDS: Record<string, FloatKindDef> = {};

/** Register a float kind (import-time — any feature minting world text may
 *  name its own kind and the Options panel grows the switch for free). */
export function registerFloatKind(def: FloatKindDef): void { FLOAT_KINDS[def.id] = def; }

/** Registered kinds, registration order (the Options panel's roster). */
export function floatKinds(): FloatKindDef[] { return Object.values(FLOAT_KINDS); }

/** Is a float kind visible under these prefs? Missing pref → the kind's own
 *  default; UNKINDED text (no kind at mint) is always shown — story beats,
 *  teaching lines and one-off announcements never need enrollment. */
export function floatKindOn(prefs: Record<string, boolean> | undefined, id: string): boolean {
  return prefs?.[id] ?? FLOAT_KINDS[id]?.defaultOn ?? true;
}

/** Float-fabric dials that are MINT-side (not per-player). */
export const FLOAT_CFG = {
  /** How long a drop-name announcement stands where the item fell (the
   *  ground names its gift, then hushes — the pickup feed keeps the ledger). */
  dropNameSec: 3,
} as const;

// The debut kinds — every row is a mint site that already tags its text.
registerFloatKind({
  id: 'dmg', label: 'Damage Numbers',
  blurb: 'Hit and tick numbers on struck bodies — crits land large and gold.',
  defaultOn: true,
});
registerFloatKind({
  id: 'combat', label: 'Combat Cries',
  blurb: 'The fight narrating itself — SHATTER!, AMBUSH!, evade, block, volatile.',
  defaultOn: true,
});
registerFloatKind({
  id: 'gains', label: 'Resource Gains',
  blurb: 'Orb scoops, essence and charge pickups — the +N trickle.',
  defaultOn: true,
});
registerFloatKind({
  id: 'xp', label: 'Experience Gains',
  blurb: 'The +N xp note over each paying kill (level-ups always announce).',
  defaultOn: true,
});
registerFloatKind({
  id: 'drop', label: 'Drop Names',
  blurb: 'Fallen loot names itself where it lands, standing a few readable seconds.',
  defaultOn: true,
});
registerFloatKind({
  id: 'pickup', label: 'Pickup Text (overhead)',
  blurb: 'The overhead line when something enters your bags. OFF by default — the pickup feed on the right keeps the ledger without covering the fight.',
  defaultOn: false,
});

// --- THE PICKUP FEED (what actually entered your bags) -------------------------

export interface PickupFeedEntry {
  /** The seat that pocketed it (each client draws its OWN seat's rows). */
  seatId: string;
  /** "Warcry (Common)" — rarity folded into the label at the mint site. */
  label: string;
  color: string;
  /** Coalesced count — grabbing the same thing again bumps this instead of
   *  stacking a duplicate row (the x2, x3 … reads as one line). */
  count: number;
  bornAt: number;
}

export const PICKUP_FEED_CFG = {
  /** Standing rows per seat (older rows retire first). */
  keep: 10,
  /** A repeat pickup inside this window coalesces into the standing row
   *  (and refreshes its clock) instead of minting a twin. */
  coalesceSec: 6,
  /** Prune floor — see NOTICE_CFG.maxKeepSec. */
  maxKeepSec: 30,
  /** The player dial's rails + default (Settings.pickupFeedSec). */
  defaultSec: 3, secMin: 1, secMax: 10,
  /** Held legible, then the fade (the notice feed's law, worn here). */
  holdFrac: 0.45,
} as const;

/** Note a pickup into the feed — THE one write law (coalesce, then cap). */
export function notePickup(
  feed: PickupFeedEntry[], seatId: string, label: string, color: string,
  now: number, count = 1,
): void {
  for (const e of feed) {
    if (e.seatId === seatId && e.label === label && now - e.bornAt <= PICKUP_FEED_CFG.coalesceSec) {
      e.count += count;
      e.bornAt = now; // the refreshed clock keeps a hoovering run one live row
      e.color = color;
      return;
    }
  }
  feed.push({ seatId, label, color, count, bornAt: now });
  // Cap PER SEAT so a couch guest's haul never evicts the host's rows.
  let mine = 0;
  for (const e of feed) if (e.seatId === seatId) mine++;
  if (mine > PICKUP_FEED_CFG.keep) {
    const idx = feed.findIndex(e => e.seatId === seatId);
    if (idx >= 0) feed.splice(idx, 1);
  }
}

/** Age the feed (the engine's per-frame sweep). */
export function prunePickupFeed(feed: PickupFeedEntry[], now: number): void {
  for (let i = feed.length - 1; i >= 0; i--) {
    if (now - feed[i].bornAt > PICKUP_FEED_CFG.maxKeepSec) feed.splice(i, 1);
  }
}
