// THE SPOKEN QUESTS (shard W12, docs/engine/shard.md "THE SPOKEN QUESTS"): what a hosted hero
// hears, the callings it finds and the ground its quests hold while it is away. The rig pins:
//   Z  THE SOLO DIGEST (first, before any shard host touches a process dial): a seeded solo
//      hero's dialogue at Brandt through every quest and ledger state the authored lines read
//      (fresh, the board, the magic shelf, the hammer sought and ready, the imbue waiting, the
//      hammer returned and remembered, the trophy sought, the speech focus's own admission), a
//      secret vocation site walked (a stranger's silence, the calling heard, the linger's menu
//      request, the menu's cards, the chain taken), a co-op host's second seat standing on the
//      site (never the hero's discovery) and its snapshot rows, and the world save's claim on an
//      event-ground quest, hash to the constant committed BEFORE the spoken quests moved.
import { createHash } from 'node:crypto';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST } from '../src/data/brandt';
import { vocationDiscoveryKey } from '../src/data/vocations';
import { QUESTS, ZONE_QUEST_GIVER_IDS } from '../src/quests/defs';
import { FEATURE, questDoneKey } from '../src/meta/account';
import { NullInput } from '../src/net/intent';
import { serializeSnapshot } from '../src/net/snapshot';
import { Rng } from '../src/core/rng';
import { dist, vec, type Vec2 } from '../src/core/math';
import type { Seat, World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const warrior = CLASSES.find(c => c.id === 'warrior')!;
const SITE_VOC = 'greenwarden'; // the Ranger's hidden calling (data/vocations.ts)

// ============================================================ Z: THE SOLO DIGEST ==
/** THE SOLO DIGEST, committed before the spoken quests moved (W12's first commit): any change
 *  to a solo or co-op host's dialogue, site or quest-ground bytes on this walk changes the hash. */
const SOLO_DIGEST = 'b7efae906e1d23c2154c24570f914a366ce7388e91641a3c4f9fe7807f2844a0';

/** A digest-stable copy: item uids are a process-wide counter, so they never ride. */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v instanceof Set) return [...v].map(canon);
  if (v instanceof Map) return [...v.entries()].map(([k, x]) => [k, canon(x)]);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      if (k === 'uid') continue;
      const x = (v as Record<string, unknown>)[k];
      if (typeof x === 'function') continue;
      out[k] = canon(x);
    }
    return out;
  }
  return v;
}
const textsOf = (w: World, from: number): unknown => w.texts.slice(from).map(t => [t.text, t.color, t.size]);
/** A free spot in the town at least `clear` px from every quest giver (a site's own linger never
 *  meets another giver's work). */
function quietSpot(w: World, clear: number): Vec2 {
  const givers = w.actors.filter(a => !a.dead && a.defId && ZONE_QUEST_GIVER_IDS.has(a.defId));
  for (const fx of [0.8, 0.2, 0.5, 0.7, 0.3]) for (const fy of [0.75, 0.25, 0.5, 0.65, 0.35]) {
    const p = w.findFreeSpot(vec(w.arena.w * fx, w.arena.h * fy), 14);
    if (givers.every(g => dist(g.pos, p) >= clear)) return p;
  }
  throw new Error('no quiet spot in town');
}

function soloWalk(): { digest: string; trail: string[] } {
  const trail: string[] = [];
  const restore = seedGlobalRandom(0x5b0c3a);
  try {
    const w = makeSimWorld('ranger', 0x5b0c3a);
    const wx = w as unknown as Record<string, any>;
    w.loadZone('crossroads');
    w.loadZone(START_ZONE);
    const hero = w.localSeat;
    hero.actor.level = 12;
    const parts: Record<string, unknown> = {};
    const brandt = w.actors.find(a => !a.dead && a.defId === 'townsfolk_smith');
    if (!brandt) throw new Error('no Brandt in town');
    const park = (s: Seat, at: Vec2, dx = 40): void => {
      const p = w.clampPos(vec(at.x + dx, at.y), s.actor.radius);
      s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0;
    };
    // THE DIALOGUE: Brandt's authored line through every state its conditions read.
    const heard: unknown[] = [];
    const say = (label: string): void => {
      park(hero, brandt.pos);
      const d = w.npcDialogues.dwell(brandt);
      heard.push([label, d?.def.id ?? null, d?.text ?? null, d?.radius ?? null, d?.seconds ?? null]);
      trail.push(`${label}: ${d?.def.id ?? '-'}`);
    };
    say('fresh');
    w.account.features.add(FEATURE.BOUNTY_BOARD); say('board');
    w.account.features.add(BRANDT_CFG.magicWares.flag); say('magic');
    wx.acceptQuest(QUESTS[BRANDT_HAMMER_QUEST]); say('sought');
    const hammer = w.activeQuests.find(q => q.questId === BRANDT_HAMMER_QUEST);
    const collect = QUESTS[BRANDT_HAMMER_QUEST].collect!;
    if (hammer) {
      hammer.fieldDone = true;
      hero.meta.items.push({ uid: 900001, baseId: collect.baseId, name: collect.name, questId: BRANDT_HAMMER_QUEST,
        rarity: 'common', ilvl: 1, tier: 1, baseRoll: 0, affixes: [], implicitRolls: [] });
    }
    say('ready');
    if (hammer) { park(hero, brandt.pos); wx.onQuestZoneCleared(hammer); }
    say('imbue');
    w.questImbues = [];
    say('returned');
    delete w.ledger[questDoneKey(BRANDT_HAMMER_QUEST)];
    say('remembered');
    wx.acceptQuest(QUESTS[BRANDT_TROPHY_QUEST]); say('trophy');
    parts.heard = heard;
    // THE SPEECH FOCUS: the line the renderer's own read admits at Brandt (idle, then dwelt).
    park(hero, brandt.pos);
    hero.lastActedAt = w.time - 1;
    const admitted: unknown[] = [];
    for (let k = 0; k < 12; k++) {
      w.time += 0.1;
      for (const l of w.npcSpeechView(true)) if (l.a === brandt) admitted.push([k, l.text, l.color, l.seatId]);
    }
    parts.admitted = admitted;
    trail.push(`focus: ${admitted.length} admitted lines at Brandt (first at frame ${(admitted[0] as unknown[] | undefined)?.[0] ?? '-'})`);
    parts.quests0 = canon({ active: w.activeQuests, done: [...w.completedQuests].sort(), keys: w.ledger, acct: w.account.ledger });
    // THE SECRET SITE: the Ranger's heartwood, forced onto a quiet stretch of town.
    hero.actor.level = 28;
    const siteAt = quietSpot(w, 320);
    parts.siteSpawn = wx.spawnVocationSite(SITE_VOC, siteAt, new Rng(0x51e7));
    const site = (wx.vocationSites as { vocId: string; npc: { pos: Vec2 } }[]).find(s => s.vocId === SITE_VOC);
    if (!site) throw new Error('no site');
    const ranger = hero.meta.classDef;
    // A stranger first: the hero wears the Warrior's class for one sweep (the calling is the Ranger's).
    hero.meta.classDef = warrior;
    park(hero, site.npc.pos, 60);
    let t0 = w.texts.length;
    wx.updateVocationSites();
    parts.stranger = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0) });
    hero.meta.classDef = ranger;
    t0 = w.texts.length;
    wx.updateVocationSites();
    parts.found = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0), acct: w.account.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0 });
    trail.push(`site: stranger ${JSON.stringify(parts.stranger)}, found ${JSON.stringify(parts.found)}`.slice(0, 300));
    // The linger at the spirit asks the calling menu (once), its cards, and the chain taken.
    hero.lastActedAt = w.time - 1;
    let asked = -1;
    for (let k = 0; k < 30 && asked < 0; k++) {
      w.time += 0.1;
      wx.updateQuestGiver(0.1);
      if (w.vocationOfferRequested) asked = k;
    }
    w.vocationOfferRequested = false;
    const offers = w.vocationMenuOffers();
    parts.menu = canon({ asked, offers });
    parts.taken = offers[0] ? w.acceptVocationQuest(offers[0].questId) : null;
    parts.quests1 = canon({ active: w.activeQuests.map(q => q.questId), keys: w.ledger });
    trail.push(`menu: asked at ${asked}, ${offers.map(o => o.questId).join(',')}; taken ${parts.taken}`);
    // THE CO-OP HOST: a second seat standing on the site discovers nothing (the hero's walk is the
    // run's), and the host's snapshot carries no journal row.
    const guest = w.addSeat('p1', warrior, new NullInput(), { startingCompanions: false, startingFlasks: false });
    delete w.ledger[vocationDiscoveryKey(SITE_VOC)];
    park(hero, brandt.pos);
    park(guest, site.npc.pos, -60);
    t0 = w.texts.length;
    wx.updateVocationSites();
    parts.guest = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0) });
    const snap = serializeSnapshot(w, 1);
    parts.wire = canon(Object.values(snap.seats).map(r => r.jn ?? null));
    trail.push(`guest: ${JSON.stringify(parts.guest)}, wire rows ${JSON.stringify(parts.wire)}`);
    // THE WORLD SAVE: an event-ground quest (the Unmade's sealed vault) held by the hero is claimed.
    hero.actor.level = 20;
    wx.acceptQuest(QUESTS.unmade_l20);
    const ws = w.serializeWorldState();
    const vault = w.activeQuests.find(q => q.questId === 'unmade_l20')?.zoneId ?? null;
    parts.save = canon({
      overlays: Object.keys(ws.overlays ?? {}).sort(), quests: ws.quests,
      eventGround: ws.zones.filter(z => z.eventOwned).map(z => z.id).sort(), vault,
      vaultKept: !!vault && ws.zones.some(z => z.id === vault),
    });
    trail.push(`save: vault ${vault} kept ${(parts.save as { vaultKept: boolean }).vaultKept}, overlays ${(parts.save as { overlays: string[] }).overlays.join(',')}`);
    const digest = createHash('sha256').update(JSON.stringify(parts)).digest('hex');
    return { digest, trail };
  } finally { restore(); }
}

{
  const { digest, trail } = soloWalk();
  for (const line of trail) console.log(`INFO  Z ${line}`);
  check('Z solo: THE SOLO DIGEST of the seeded solo dialogue-and-site walk (and the co-op host\'s second seat) equals the constant committed before the spoken quests moved',
    digest === SOLO_DIGEST, `digest ${digest}`);
}

console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
process.exit(failed ? 1 : 0);
