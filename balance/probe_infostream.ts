// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE INFO STREAM (world/bulletins.ts): the player-curated
// information fabric. Pins:
//   A. the REGISTRIES (notice channels + float kinds — debut rosters, default
//      laws, prefs override, unknown-id tolerance),
//   B. the PURE LIST LAWS (pushNotice cap + channel default, pruneNotices
//      aging, notePickup coalesce/clock-refresh/per-seat cap/seat isolation),
//   C. the LIVE ENGINE (bulletins land in the notice feed and NEVER in the
//      overhead float lane; drop names mint kind 'drop' standing
//      FLOAT_CFG.dropNameSec; pickups tag 'pickup' + write coalescing feed
//      rows; essence pays 'gains' + a row; a credited kill floats kind 'xp';
//      a real melee swing floats kind 'dmg'; the co-op wire round-trips
//      kinds, notices and feed rows losslessly),
//   D. the SETTINGS round-trip (defaults, rail clamps, sparse-record
//      sanitization, unknown-anchor fallback).
// Run: npx tsx balance/probe_infostream.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import {
  floatKinds, floatKindOn, noticeChannels, noticeChannelOn,
  notePickup, prunePickupFeed, pushNotice, pruneNotices,
  registerBulletinSource, NOTICE_CFG, PICKUP_FEED_CFG, FLOAT_CFG,
  type NoticeEntry, type PickupFeedEntry, type WorldBulletin,
} from '../src/world/bulletins';
import { makeSettings, serializeSettings, deserializeSettings, type SettingsSave } from '../src/meta/settings';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { ESSENCES } from '../src/data/essences';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// ------------------------------------------------ A. the registries
{
  const chIds = noticeChannels().map(c => c.id);
  check('A1: the debut notice channels stand (world/events/war/civic)',
    ['world', 'events', 'war', 'civic'].every(id => chIds.includes(id)), chIds.join(', '));
  const fkIds = floatKinds().map(k => k.id);
  check('A2: the debut float kinds stand (dmg/combat/gains/xp/drop/pickup)',
    ['dmg', 'combat', 'gains', 'xp', 'drop', 'pickup'].every(id => fkIds.includes(id)), fkIds.join(', '));
  check('A3: defaults — pickup overhead ships OFF (the feed keeps the ledger), the rest ON',
    !floatKindOn(undefined, 'pickup') && floatKindOn(undefined, 'dmg')
    && floatKindOn(undefined, 'xp') && floatKindOn(undefined, 'drop')
    && noticeChannels().every(c => noticeChannelOn(undefined, c.id)));
  check('A4: prefs OVERRIDE registry defaults both ways',
    !floatKindOn({ dmg: false }, 'dmg') && floatKindOn({ pickup: true }, 'pickup')
    && !noticeChannelOn({ events: false }, 'events'));
  check('A5: unknown ids read ON (tolerance — renamed rows never silently mute)',
    floatKindOn(undefined, 'not_a_kind') && noticeChannelOn(undefined, 'not_a_channel'));
  const chSet = new Set(chIds), fkSet = new Set(fkIds);
  check('A6: registry ids are unique', chSet.size === chIds.length && fkSet.size === fkIds.length);
}

// ------------------------------------------------ B. the pure list laws
{
  const list: NoticeEntry[] = [];
  pushNotice(list, { text: 'plain' }, 10);
  check('B1: an untagged bulletin rides the catch-all channel at the cfg look',
    list[0].channel === 'world' && list[0].color === '#e8a050' && list[0].bornAt === 10);
  for (let i = 0; i < NOTICE_CFG.keep + 6; i++) pushNotice(list, { text: `n${i}`, channel: 'events' }, 11);
  check('B2: the rolling buffer caps at keep (oldest shed first)',
    list.length === NOTICE_CFG.keep && list[list.length - 1].text === `n${NOTICE_CFG.keep + 5}`);
  pruneNotices(list, 11 + NOTICE_CFG.maxKeepSec + 1);
  check('B3: aged notices prune past maxKeepSec', list.length === 0);

  const feed: PickupFeedEntry[] = [];
  notePickup(feed, 's1', 'Warcry (Common)', '#fff', 100);
  notePickup(feed, 's1', 'Warcry (Common)', '#fff', 100 + PICKUP_FEED_CFG.coalesceSec - 0.5);
  check('B4: a repeat pickup inside the window COALESCES (one row, x2, clock refreshed)',
    feed.length === 1 && feed[0].count === 2
    && feed[0].bornAt === 100 + PICKUP_FEED_CFG.coalesceSec - 0.5);
  notePickup(feed, 's1', 'Warcry (Common)', '#fff', feed[0].bornAt + PICKUP_FEED_CFG.coalesceSec + 1);
  check('B5: past the window the same label minted a FRESH row', feed.length === 2 && feed[1].count === 1);
  notePickup(feed, 's2', 'Warcry (Common)', '#fff', 200);
  check('B6: seats never coalesce across each other', feed.length === 3
    && feed.filter(e => e.seatId === 's2').length === 1);
  for (let i = 0; i < PICKUP_FEED_CFG.keep + 4; i++) notePickup(feed, 's1', `thing ${i}`, '#fff', 300 + i * 20);
  const mine = feed.filter(e => e.seatId === 's1');
  const theirs = feed.filter(e => e.seatId === 's2');
  check('B7: the cap is PER SEAT and spares the other seat\'s rows',
    mine.length === PICKUP_FEED_CFG.keep && theirs.length === 1,
    `s1 ${mine.length}, s2 ${theirs.length}`);
  prunePickupFeed(feed, 300 + (PICKUP_FEED_CFG.keep + 4) * 20 + PICKUP_FEED_CFG.maxKeepSec + 1);
  check('B8: aged feed rows prune past maxKeepSec', feed.length === 0);
}

// ------------------------------------------------ C. LIVE — the real engine
{
  const w: World = makeSimWorld('juggernaut', 0x1f0c4);
  const zid = w.devMintTileset('grassland', 0, 1, { seed: 20260726 });
  check('C1: a grassland mint stands (unsealed spoils ground)', !!zid, zid ?? 'null');
  if (zid) w.devTravelTo(zid);
  w.player.invulnerable = true;
  const step = (secs: number, dt = 0.1): void => { for (let t = 0; t < secs; t += dt) w.update(dt); };

  // The pump: a registered source's line lands in the FEED, never the floats.
  const pending: WorldBulletin[] = [];
  registerBulletinSource(() => pending.splice(0));
  pending.push({ text: 'qa probe line', channel: 'events', color: '#abcdef' });
  const floatsBefore = w.texts.length;
  step(0.2);
  const landed = w.notices.find(n => n.text === 'qa probe line');
  check('C2: a bulletin lands in the notice feed wearing its channel + clock',
    !!landed && landed.channel === 'events' && landed.color === '#abcdef'
    && Math.abs((landed.bornAt ?? 0) - w.time) < 1);
  check('C3: bulletins NEVER enter the overhead float lane (the declutter law)',
    !w.texts.some(t => t.text === 'qa probe line'), `floats ${floatsBefore} → ${w.texts.length}`);

  // Drop names: dropGemAt announces where it falls, standing dropNameSec.
  w.dropGemAt(w.player.pos);
  const dropFloat = w.texts.find(t => t.kind === 'drop');
  check('C4: a minted drop names itself (kind \'drop\')', !!dropFloat, dropFloat?.text ?? 'none');
  check('C5: the drop name STANDS FLOAT_CFG.dropNameSec (3s, not the 1s tick)',
    !!dropFloat && dropFloat.maxLife === FLOAT_CFG.dropNameSec, `maxLife ${dropFloat?.maxLife}`);

  // The pickup feed: two identical support gems vacuum → ONE coalesced row.
  const supId = Object.keys(SUPPORTS)[0];
  const sup = SUPPORTS[supId];
  const seatId = w.localSeat.id;
  const dropSup = (): void => {
    w.drops.push({ pos: { x: w.player.pos.x, y: w.player.pos.y }, item: { kind: 'support', gem: { def: sup, level: 1 } }, bob: 0 });
  };
  dropSup(); step(0.6);
  const row1 = w.pickupFeed.find(e => e.seatId === seatId && e.label === `${sup.name} (Support)`);
  check('C6: a vacuumed gem writes its feed row ("Name (Support)")', !!row1 && row1.count === 1,
    row1 ? `${row1.label} x${row1.count}` : 'no row');
  check('C7: the overhead pickup line wears kind \'pickup\' (hidden by default, feed keeps the ledger)',
    w.texts.some(t => t.kind === 'pickup'));
  dropSup(); step(0.6);
  const rows = w.pickupFeed.filter(e => e.seatId === seatId && e.label === `${sup.name} (Support)`);
  check('C8: the second identical pickup COALESCES live (one row, x2)',
    rows.length === 1 && rows[0].count === 2, `${rows.length} rows, x${rows[0]?.count}`);

  // Essence: the wallet gain pays a 'gains' float + a feed row with the count.
  const eid = Object.keys(ESSENCES)[0] as keyof typeof ESSENCES;
  w.grantEssence(w.localSeat, { essence: eid, count: 3 });
  const eRow = w.pickupFeed.find(e => e.seatId === seatId && e.label === ESSENCES[eid].label);
  check('C9: an essence grant writes gains float + a counted feed row',
    w.texts.some(t => t.kind === 'gains') && !!eRow && eRow.count === 3,
    eRow ? `${eRow.label} x${eRow.count}` : 'no row');

  // The kill pays: '+N xp' wears kind 'xp' at the corpse.
  const defId = ['skeleton', 'goblin', 'zombie'].find(id => MONSTERS[id])
    ?? Object.keys(MONSTERS).find(id => !MONSTERS[id].parts && (MONSTERS[id].xp ?? 0) > 0)!;
  const wx = w as unknown as { createMonster(type: string, level: number, team: 'enemy'): Actor };
  const m = wx.createMonster(defId, 1, 'enemy');
  w.actors.push(m);
  m.pos.x = w.player.pos.x + 40; m.pos.y = w.player.pos.y;
  w.kill(m, false, w.player);
  check('C10: a credited kill floats its experience as kind \'xp\'',
    w.texts.some(t => t.kind === 'xp' && t.text.endsWith('xp')), defId);

  // A REAL swing lands a kind-'dmg' number (rng-tolerant: swing until it bites).
  const m2 = wx.createMonster(defId, 1, 'enemy');
  w.actors.push(m2);
  m2.life = 10_000; m2.pos.x = w.player.pos.x + 26; m2.pos.y = w.player.pos.y;
  let sawDmg = false;
  for (let tries = 0; tries < 30 && !sawDmg; tries++) {
    const inst = w.player.skills.find(s => !!s);
    if (!inst) break;
    w.useSkill(w.player, inst, { x: m2.pos.x, y: m2.pos.y });
    step(0.7);
    sawDmg = w.texts.some(t => t.kind === 'dmg');
  }
  check('C11: a landed hit floats its number as kind \'dmg\' (the real resolveHit lane)', sawDmg);

  // THE WIRE: kinds, notices and feed rows round-trip the snapshot losslessly.
  pending.push({ text: 'wire line', channel: 'war' });
  w.dropGemAt(w.player.pos); // keep a fresh 'drop' float alive across the trip
  step(0.15);
  const preNotices = w.notices.length;
  const preRow = w.pickupFeed.find(e => e.seatId === seatId && e.label === `${sup.name} (Support)`);
  const snap = serializeSnapshot(w, 0);
  check('C12: the snapshot ships kinds + both feeds',
    (snap.texts ?? []).some(t => t.k === 'drop')
    && (snap.no ?? []).some(n => n.text === 'wire line' && n.ch === 'war')
    && (snap.pfd ?? []).some(p => p.s === seatId && p.l === `${sup.name} (Support)` && p.n === 2));
  applySnapshot(w, snap, null, 1);
  const postRow = w.pickupFeed.find(e => e.seatId === seatId && e.label === `${sup.name} (Support)`);
  check('C13: applySnapshot rebuilds notices, feed rows and float kinds exactly',
    w.notices.length === preNotices
    && !!postRow && !!preRow && postRow.count === preRow.count && postRow.bornAt === preRow.bornAt
    && w.texts.some(t => t.kind === 'drop'));
}

// ------------------------------------------------ D. the settings round-trip
{
  const s = makeSettings();
  check('D1: defaults — 3s notices at top, feed ON at 3s, sparse records empty',
    s.noticeSec === NOTICE_CFG.defaultSec && s.noticeAnchor === NOTICE_CFG.anchorDefault
    && s.pickupFeed && s.pickupFeedSec === PICKUP_FEED_CFG.defaultSec
    && Object.keys(s.noticeChannels).length === 0 && Object.keys(s.floatKinds).length === 0);
  s.noticeSec = 99; s.pickupFeedSec = 0.01;
  s.noticeChannels.events = false; s.floatKinds.dmg = false; s.pickupFeed = false;
  const back = deserializeSettings(serializeSettings(s));
  check('D2: durations re-clamp into the fabric rails on load',
    !!back && back.noticeSec === NOTICE_CFG.secMax && back.pickupFeedSec === PICKUP_FEED_CFG.secMin);
  check('D3: sparse mutes + the feed switch survive the round-trip',
    !!back && back.noticeChannels.events === false && back.floatKinds.dmg === false
    && back.pickupFeed === false);
  const junk: SettingsSave = {
    ...serializeSettings(makeSettings()),
    noticeAnchor: 'nowhere' as SettingsSave['noticeAnchor'],
    floatKinds: { dmg: 'yes' } as unknown as Record<string, boolean>,
  };
  const healed = deserializeSettings(junk);
  check('D4: an unknown anchor falls back and junk record values drop (booleans only)',
    !!healed && healed.noticeAnchor === NOTICE_CFG.anchorDefault
    && Object.keys(healed.floatKinds).length === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
