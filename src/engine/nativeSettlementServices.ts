/** Shared native settlement birth and stock operations. Installed sources remain explicit native dependencies. */
import { pick, randInt, vec, type Vec2 } from '../core/math';
import { type SkillTag } from './stats';
import { Actor } from './actor';
import { makeSkillGem, rollSkillRarity, SKILL_RARITIES, type SkillRarity, type SkillDef, type SkillInstance, type SupportDef } from './skills';
import { mintSupportInstance } from './supportbase';
import { bagGemItems, skillGemPayloadOf, supportGemPayloadOf } from './gemitems';
import { MEMORY_KIND_IDS, MEMORY_TRADED_PROVENANCE, makeMemoryItem, memoryKindOf } from './memories';
import { rollItem } from './itemgen';
import { VENDOR_ITEM_CFG } from '../data/essences';
import { ITEM_RARITY_IDS, type ItemRarity, type RoughMemoryUnit } from './items';
import { GEM_DROP_CFG, type GemFloor } from './loot';
import { VENDORS, VENDOR_CFG } from '../data/vendors';
import { ITEM_BASES } from '../data/itembases';
import { memoryCommissionReady } from '../meta/memoryUnlocks';
import { SKILL_LIST, SKILLS } from '../data/skills';
import { SUPPORT_LIST, SUPPORTS } from '../data/supports';
import { townSiteAt, type TownSiteId } from '../data/townBuild';
import { Rng, withSeededRandom } from '../core/rng';
import { boroughVendorWeights } from '../data/boroughs';
import { featureEnabled, isSkillUnlockedForDrop, isSupportUnlockedForDrop, FEATURE, STARTER_SKILLS } from '../meta/account';
import { MERC_CFG, type MercOffer } from '../meta/mercs';
import { MERC_TEMPLATES } from '../data/mercenaries';
import type { World, VendorEntry } from './world';
export interface NativeSettlementHost {
 resolveCommission: World['resolveCommission'];
 manifest: Pick<World['manifest'],'seed'>;
 restockOrdinal: World['restockOrdinal'];
 overlayHold: World['overlayHold'];
 buildVendorStock: World['buildVendorStock'];
 vendorEntryAllowed: World['vendorEntryAllowed'];
 curateVendorStock: World['curateVendorStock'];
 time: World['time'];
 restockSeconds: World['restockSeconds'];
 account: World['account'];
 vendorHolds: World['vendorHolds'];
 commissionOdds: World['commissionOdds'];
 mintCommissionEntry: World['mintCommissionEntry'];
 charDirty: World['charDirty'];
 vendorMemoryCeiling: World['vendorMemoryCeiling'];
 vendorGemLevel: World['vendorGemLevel'];
 vendorStockPolicy: World['vendorStockPolicy'];
 vendorGemsOpen: World['vendorGemsOpen'];
 vendorSize: World['vendorSize'];
 rollSupportDropGated: World['rollSupportDropGated'];
 rollSkillGem: World['rollSkillGem'];
 waresBonus: World['waresBonus'];
 sim: { readonly boroughField?: {readonly population:number}|null };
 player: World['player'];
 vendorQualityPieces: World['vendorQualityPieces'];
 carriedGemIds: World['carriedGemIds'];
 skillDropPool: World['skillDropPool'];
 gemWeights: World['gemWeights'];
 supportDropPool: World['supportDropPool'];
 zone: World['zone'];
 pickGem: World['pickGem'];
 seats: World['seats'];
 mercSheetFor: World['mercSheetFor'];
 dealTemplateOffers: World['dealTemplateOffers'];
 mercOutpost: World['mercOutpost'];
 townTierIdx: World['townTierIdx'];
 arena: World['arena'];
 mercSheets: World['mercSheets'];
 /** THE SHELF PER BUYER (card 29): the buyer's character inside a hosted purchase, else null. */
 shelfCharKey: World['shelfCharKey'];
}
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function settlementArmVendorStock(host:NativeSettlementHost,key: string): VendorEntry[] {
    host.resolveCommission(key);
    // THE FOREORDAINED SHELF: the whole roll runs on a stream seeded
    // (world seed, counter, beat) — the commission resolver's own doctrine
    // widened to the ordinary wares, borrowed via the off-stream swap
    // (core/rng.ts withSeededRandom) so no other system's die ever moves.
    // Within one beat the counter deals ONE truth: re-entering, reloading,
    // or peeking twice meets the same shelf — scumming a re-roll means
    // WAITING for the beat to turn. (Live params still fold honestly: a
    // level-up or borough swell mid-beat changes what a FRESH arm rolls,
    // but the standing-shelf law means mid-beat re-arms don't happen.)
    // THE SHELF PER BUYER (card 29 ruled): on a hosted world the buyer's own draw from the
    // same beat (world seed × counter × beat × character); no limb anywhere else.
    const buyer = host.shelfCharKey();
    const seed = (host.manifest.seed ^ hashStr(`vendorshelf:${key}:${host.restockOrdinal()}${buyer ? ':' + buyer : ''}`)) >>> 0;
    return withSeededRandom(seed, () => {
      const stock = host.overlayHold(key, host.buildVendorStock({ counter: key }))
        .filter(entry => host.vendorEntryAllowed(key, entry));
      host.curateVendorStock(key, stock);
      return stock;
    });
  }

export function settlementRestockOrdinal(host:NativeSettlementHost): number {
    return Math.floor(host.time / host.restockSeconds());
  }

export function settlementRestockSeconds(host:NativeSettlementHost): number {
    let sec: number = VENDOR_CFG.restock.baseSec;
    for (const r of VENDOR_CFG.restock.ladder) {
      if (featureEnabled(host.account, r.flag)) sec -= r.cutSec;
    }
    return Math.max(VENDOR_CFG.restock.minSec, sec);
  }

export function settlementSyncHoldIdx(host:NativeSettlementHost,key: string, stock: VendorEntry[]): void {
    const hold = host.vendorHolds[key];
    if (!hold) return;
    for (const row of hold.locks) {
      const at = stock.indexOf(row.entry);
      if (at >= 0) row.idx = at;
    }
  }

export function settlementResolveCommission(host:NativeSettlementHost,key: string): void {
    const hold = host.vendorHolds[key];
    if (!hold) return;
    const c = hold.commission;
    if (!c || hold.locks.some(r => r.commission)
      || !memoryCommissionReady(host.account, c.kind, c.id, VENDOR_CFG.commission.need)) { hold.watchedSec = host.time; return; }
    // THE WALL-TIME ANCHOR: beats to resolve = the lattice indices whose
    // spans END inside (watchedSec, now] under the CURRENT quantum. The
    // watch remembers seconds, never beat indices — a rush rung bought
    // mid-run re-buckets already-watched time under the new cadence
    // honestly: no phantom catchup burst, no re-opened beats, whichever
    // way the quantum moves (time only runs forward).
    const sec = host.restockSeconds();
    const nowBeat = Math.floor(host.time / sec);
    const from = Math.max(Math.floor(hold.watchedSec / sec) + 1, nowBeat - VENDOR_CFG.commission.maxCatchup);
    const p = host.commissionOdds(c);
    const buyer = host.shelfCharKey(); // THE SHELF PER BUYER: the standing order watches the buyer's own beats
    for (let o = from; o <= nowBeat && p > 0; o++) {
      const rng = new Rng((host.manifest.seed ^ hashStr(`vendorhold:${key}:${c.kind}:${c.id}:${o}${buyer ? ':' + buyer : ''}`)) >>> 0);
      if (rng.next() >= p) continue;
      const entry = host.mintCommissionEntry(c, rng, key);
      if (!entry) break; // the registry lost the gem — the sanitizer owns the rest
      const used = new Set(hold.locks.map(r => r.idx));
      let idx = 0;
      while (used.has(idx)) idx++;
      hold.locks.push({ entry, idx, commission: true });
      host.charDirty = true;
      break;
    }
    hold.watchedSec = host.time;
  }

export function settlementOverlayHold(host:NativeSettlementHost,key: string, out: VendorEntry[]): VendorEntry[] {
    const hold = host.vendorHolds[key];
    if (!hold?.locks.length) return out;
    // Unpaid reservations outside a retuned stock policy cannot occupy an
    // invisible reserve slot. Release them before overlay, preserving legal rows.
    const legal = hold.locks.filter(row => host.vendorEntryAllowed(key, row.entry));
    if (legal.length !== hold.locks.length) { hold.locks = legal; host.charDirty = true; }
    const used = new Set<number>();
    for (const row of [...hold.locks].sort((a, b) => a.idx - b.idx)) {
      let at = Math.min(Math.max(0, Math.floor(row.idx)), Math.max(0, out.length - 1));
      while (used.has(at) && at < out.length - 1) at++;
      while (used.has(at) && at > 0) at--;
      used.add(at);
      row.idx = at;
      out[at] = row.entry;
    }
    return out;
  }

export function settlementBuildVendorStock(host:NativeSettlementHost,opts?: { gems?: boolean; gear?: boolean; counter?: string }): VendorEntry[] {
    const out: VendorEntry[] = [];
    const ceiling = host.vendorMemoryCeiling(opts?.counter);
    const sellSupports = featureEnabled(host.account, FEATURE.BRANDT_SELL_SUPPORTS);
    const lvl = host.vendorGemLevel();
    if (opts?.gems !== false) {
      // The standard offering: one stack per pouch kind, unit counts by
      // dial. Seeds draw from the CURRENT stream — under armVendorStock's
      // seeded swap that makes every unit's grant a pure function of
      // (world seed, counter, beat): reload or re-entry meets the same
      // sealed futures (THE FOREORDAINED SHELF, extended to the pouches).
      for (const kind of MEMORY_KIND_IDS) {
        const policy = host.vendorStockPolicy(opts?.counter);
        const n = policy?.memoriesRequire && !featureEnabled(host.account, policy.memoriesRequire) ? 0 : VENDOR_CFG.pouches[kind];
        if (n <= 0) continue;
        const units: RoughMemoryUnit[] = Array.from({ length: n }, () =>
          ({ d: MEMORY_TRADED_PROVENANCE, s: (Math.random() * 4294967296) >>> 0, ...(ceiling ? { ceiling } : {}) }));
        out.push({ kind: 'item', item: makeMemoryItem(kind, units) });
      }
      if (host.vendorGemsOpen()) {
        for (let i = 0; i < host.vendorSize(); i++) {
          if (sellSupports && Math.random() < VENDOR_CFG.supportShare) {
            const sd = host.rollSupportDropGated(undefined, lvl);
            // A chassis gem CUTS AT THE VEIN here — under armVendorStock's
            // seeded swap, so the shelf's cuts are foreordained too.
            if (sd) { out.push({ kind: 'support', gem: mintSupportInstance(sd, 1) }); continue; }
          }
          out.push({ kind: 'skill', inst: host.rollSkillGem(undefined, lvl, undefined, ceiling) });
        }
      }
    }
    if (opts?.gear !== false) {
      // The gear shelf: the base VENDOR_ITEM_CFG.slots plus every owned
      // broader-wares rung's gear. Rolls anchor to the LOCAL hero's level
      // (the shopper).
      const shelf = VENDOR_ITEM_CFG.slots + host.waresBonus().gear;
      // THE PROSPERITY CURVE: a fuller Lastlight attracts finer wares — the
      // authored weights lifted by the refugee population (data/boroughs.ts;
      // population 0, or the Borough package off, = the authored table verbatim).
      const shelfWeights = { ...boroughVendorWeights(host.sim.boroughField?.population ?? 0) };
      const policy = host.vendorStockPolicy(opts?.counter);
      let rarityCeiling: ItemRarity | undefined;
      if (policy) {
        const allowed = new Set<string>(policy.baseRarities);
        for (const upgrade of policy.upgrades ?? []) if (featureEnabled(host.account, upgrade.feature)) {
          for (const rarity of upgrade.rarities) allowed.add(rarity);
        }
        for (const rarity of Object.keys(shelfWeights) as (keyof typeof shelfWeights)[]) {
          if (!allowed.has(rarity)) shelfWeights[rarity] = 0;
        }
        rarityCeiling = [...ITEM_RARITY_IDS].reverse().find(r => allowed.has(r));
      }
      for (let i = 0; i < shelf; i++) {
        const ilvl = Math.max(1, host.player.level + randInt(-VENDOR_ITEM_CFG.ilvlJitter, VENDOR_ITEM_CFG.ilvlJitter));
        const item = rollItem({ ilvl, rarityWeights: shelfWeights, rarityCeiling });
        if (item) out.push({ kind: 'item', item });
      }
    }
    return out;
  }

export function settlementVendorEntryAllowed(host:NativeSettlementHost,key: string, entry: VendorEntry): boolean {
    const policy = host.vendorStockPolicy(key);
    if (!policy) return true;
    const ceiling = host.vendorMemoryCeiling(key)!;
    const ranks = Object.keys(SKILL_RARITIES);
    if (entry.kind === 'skill') return host.vendorGemsOpen() && ranks.indexOf(entry.inst.rarity ?? 'common') <= ranks.indexOf(ceiling);
    if (entry.kind === 'support') return host.vendorGemsOpen() && featureEnabled(host.account, FEATURE.BRANDT_SELL_SUPPORTS);
    if (memoryKindOf(entry.item)) return (!policy.memoriesRequire || featureEnabled(host.account, policy.memoriesRequire))
      && !!entry.item.mem?.every(u => u.ceiling && ranks.indexOf(u.ceiling) <= ranks.indexOf(ceiling));
    return policy.baseRarities.includes(entry.item.rarity)
      || !!policy.upgrades?.some(u => featureEnabled(host.account, u.feature) && u.rarities.includes(entry.item.rarity));
  }

export function settlementCurateVendorStock(host:NativeSettlementHost,key: string, stock: VendorEntry[]): void {
    const count = host.vendorQualityPieces(key);
    if (!count) return;
    const held = new Set(host.vendorHolds[key]?.locks.map(r => r.entry) ?? []);
    const pool = stock.filter((e): e is VendorEntry & { kind: 'item' } => e.kind === 'item'
      && !held.has(e) && !e.item.mem && !e.item.gem && e.item.rarity !== 'unique');
    let selected = 0;
    while (pool.length && selected < count) {
      const e = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const rarity = selected < VENDOR_CFG.quality.magicPieces || e.item.rarity === 'common' ? 'magic' : e.item.rarity;
      if (!host.vendorEntryAllowed(key, { kind: 'item', item: { ...e.item, rarity } })) continue;
      const baseId = rarity === 'magic' && ITEM_BASES[e.item.baseId]?.minRarity === 'rare' ? undefined : e.item.baseId;
      const item = rollItem({ baseId, ilvl: e.item.ilvl, rarity,
        rarityCeiling: rarity, affixQuality: VENDOR_CFG.quality });
      if (item?.affixes.length) { e.item = item; selected++; }
    }
  }

export function settlementCommissionOdds(host:NativeSettlementHost,c: { kind: 'skill' | 'support'; id: string }): number {
    const lvl = host.vendorGemLevel();
    const sellSupports = featureEnabled(host.account, FEATURE.BRANDT_SELL_SUPPORTS);
    const carried = host.carriedGemIds();
    let share: number;
    let frac = 0;
    if (c.kind === 'skill') {
      share = sellSupports ? 1 - VENDOR_CFG.supportShare : 1;
      const pool = host.skillDropPool(lvl);
      const i = pool.findIndex(s => s.id === c.id);
      if (i >= 0) {
        const w = host.gemWeights(pool, s => s.tags, s => s.dropWeight ?? 100, undefined,
          s => carried.skills.has(s.id));
        const total = w.reduce((s, x) => s + x, 0);
        frac = total > 0 ? w[i] / total : 0;
      }
    } else {
      share = sellSupports ? VENDOR_CFG.supportShare : 0;
      const pool = host.supportDropPool(lvl);
      const i = pool.findIndex(d => d.id === c.id);
      if (i >= 0) {
        const w = host.gemWeights(pool, d => d.dropTags ?? d.requiresTags ?? [], d => d.weight, undefined,
          d => carried.supports.has(d.id));
        const total = w.reduce((s, x) => s + x, 0);
        frac = total > 0 ? w[i] / total : 0;
      }
    }
    const pSlot = share * frac;
    if (pSlot <= 0) return 0;
    const pBeat = 1 - Math.pow(1 - pSlot, host.vendorSize());
    return Math.min(1, pBeat * VENDOR_CFG.commission.oddsMult);
  }

export function settlementMintCommissionEntry(host:NativeSettlementHost,c: { kind: 'skill' | 'support'; id: string }, rng: Rng, key = 'brandt'): VendorEntry | null {
    if (c.kind === 'skill') {
      const def = SKILLS[c.id];
      if (!def) return null;
      return { kind: 'skill', inst: makeSkillGem(def, 1, rollSkillRarity(rng.next(), host.vendorMemoryCeiling(key))) };
    }
    const def = SUPPORTS[c.id];
    if (!def) return null;
    // The standing order's find cuts on the beat's own die (foreordained).
    return { kind: 'support', gem: mintSupportInstance(def, 1, () => rng.next()) };
  }

export function settlementVendorMemoryCeiling(host:NativeSettlementHost,key?: string): SkillRarity | undefined {
    const policy = host.vendorStockPolicy(key);
    if (!policy) return undefined;
    const allowed = new Set<string>(policy.baseRarities);
    for (const upgrade of policy.upgrades ?? []) if (featureEnabled(host.account, upgrade.feature)) {
      for (const rarity of upgrade.rarities) allowed.add(rarity);
    }
    const top = [...ITEM_RARITY_IDS].reverse().find(r => allowed.has(r)) ?? 'common';
    return top === 'unique' ? 'legendary' : top;
  }

export function settlementVendorGemLevel(host:NativeSettlementHost): number {
    return VENDOR_CFG.gemBracket === 'shopper'
      ? Math.max(host.zone.level, host.player.level)
      : host.zone.level;
  }

export function settlementVendorStockPolicy(host:NativeSettlementHost,key?: string) { return VENDORS.find(v => v.id === key)?.stockPolicy; }

export function settlementVendorGemsOpen(host:NativeSettlementHost): boolean {
    return featureEnabled(host.account, FEATURE.VENDOR_GEMS);
  }

export function settlementVendorSize(host:NativeSettlementHost): number {
    return VENDOR_CFG.wares.baseGems + host.waresBonus().gems;
  }

export function settlementRollSupportDropGated(host:NativeSettlementHost,bias?: SkillTag[], atLevel = host.zone.level, floor?: GemFloor): SupportDef | null {
    const pool = host.supportDropPool(atLevel, floor);
    const owned = host.carriedGemIds().supports;
    return host.pickGem(pool, d => d.dropTags ?? d.requiresTags ?? [],
      d => d.weight * (floor?.supports.has(d.id) ? GEM_DROP_CFG.floorMult : 1), bias,
      d => owned.has(d.id));
  }

export function settlementRollSkillGem(host:NativeSettlementHost,bias?: SkillTag[], atLevel = host.zone.level, floor?: GemFloor, ceiling?: SkillRarity): SkillInstance {
    const pool = host.skillDropPool(atLevel, floor);
    const owned = host.carriedGemIds().skills;
    const skillDef = host.pickGem(pool, s => s.tags,
      // THE GEM FLOOR's lean: the country's own gems roll at ×floorMult here.
      s => (s.dropWeight ?? 100) * (floor?.skills.has(s.id) ? GEM_DROP_CFG.floorMult : 1), bias,
      s => owned.has(s.id)) ?? pick(pool);
    const rarity = rollSkillRarity(Math.random(), ceiling);
    return makeSkillGem(skillDef, 1, rarity);
  }

export function settlementWaresBonus(host:NativeSettlementHost): { gems: number; gear: number } {
    let gems = 0, gear = 0;
    for (const r of VENDOR_CFG.wares.ladder) {
      if (featureEnabled(host.account, r.flag)) { gems += r.gems; gear += r.gear; }
    }
    return { gems, gear };
  }

export function settlementVendorQualityPieces(host:NativeSettlementHost,key: string): number {
    if (!VENDORS.find(v => v.id === key)?.quality) return 0;
    return VENDOR_CFG.quality.ladder.reduce((n, r) => n + (featureEnabled(host.account, r.flag) ? r.pieces : 0), 0);
  }

export function settlementCarriedGemIds(host:NativeSettlementHost): { skills: Set<string>; supports: Set<string> } {
    const skills = new Set<string>(), supports = new Set<string>();
    const take = (inst: SkillInstance | null): void => {
      if (!inst) return;
      skills.add(inst.def.id);
      for (const s of inst.sockets) if (s) supports.add(s.def.id);
    };
    for (const seat of host.seats) {
      for (const inst of seat.actor.skills) take(inst);
      // THE RESIDENCE: loose gems ride the bag as wrapper items now.
      for (const item of bagGemItems(seat.meta.items)) {
        const sp = skillGemPayloadOf(item);
        if (sp) {
          skills.add(sp.skillId);
          for (const row of sp.sockets) if (row) supports.add(row.supportId);
        }
        const gp = supportGemPayloadOf(item);
        if (gp) supports.add(gp.supportId);
      }
    }
    return { skills, supports };
  }

export function settlementSkillDropPool(host:NativeSettlementHost,atLevel: number, floor?: GemFloor): SkillDef[] {
    let pool = SKILL_LIST.filter(s => !s.noDrop
      && (isSkillUnlockedForDrop(host.account, s.id) || !!floor?.skills.has(s.id))
      && (s.minDropLevel ?? 0) <= atLevel);
    if (pool.length === 0) pool = SKILL_LIST.filter(s => !s.noDrop && STARTER_SKILLS.includes(s.id));
    return pool;
  }

export function settlementGemWeights<T>(host:NativeSettlementHost,
    pool: T[], tagsOf: (x: T) => readonly SkillTag[], weightOf: (x: T) => number,
    bias?: SkillTag[], carried?: (x: T) => boolean): number[] {
    return pool.map(x => {
      let w = weightOf(x);
      for (const t of tagsOf(x)) w *= GEM_DROP_CFG.tagWeights[t] ?? 1;
      if (bias && tagsOf(x).some(t => bias.includes(t))) w *= GEM_DROP_CFG.biasMult;
      if (carried?.(x)) w *= GEM_DROP_CFG.carriedMult;
      return Math.max(0, w);
    });
  }

export function settlementSupportDropPool(host:NativeSettlementHost,atLevel: number, floor?: GemFloor): SupportDef[] {
    return SUPPORT_LIST.filter(d =>
      (isSupportUnlockedForDrop(host.account, d.id) || !!floor?.supports.has(d.id))
      && (d.minDropLevel ?? 0) <= atLevel);
  }

export function settlementPickGem<T>(host:NativeSettlementHost,
    pool: T[], tagsOf: (x: T) => readonly SkillTag[], weightOf: (x: T) => number,
    bias?: SkillTag[], carried?: (x: T) => boolean): T | null {
    if (pool.length === 0) return null;
    const weights = host.gemWeights(pool, tagsOf, weightOf, bias, carried);
    const total = weights.reduce((s, w) => s + w, 0);
    if (total <= 0) return pool[0];
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

export function settlementArmLastlightRecruiter(host:NativeSettlementHost,officer: Actor, zoneId: string): void {
    const offers = host.mercSheetFor(zoneId, () => {
      const rng = new Rng((host.manifest.seed ^ hashStr(`recruiter:${zoneId}`)) >>> 0);
      const [lo, hi] = MERC_CFG.recruiter.offers;
      return host.dealTemplateOffers(rng, rng.int(lo, hi));
    });
    host.mercOutpost = {
      captain: officer, offers, port: true,
      title: "The Recruiter's Table",
      pitch: '"The Vault pays my table\'s rent, so I\'ll be plain: these blades, this world, no others. Choose."',
    };
  }

export function settlementTownSeat(host:NativeSettlementHost,id: TownSiteId, dx = 0, dy = 0): Vec2 {
    const p = townSiteAt(host.townTierIdx, id);
    if (!p) {
      console.warn(`[town] site '${id}' has no seat at tier ${host.townTierIdx}`);
      return vec(host.arena.w / 2 + dx, host.arena.h / 2 + dy);
    }
    return vec(p.x + dx, p.y + dy);
  }

export function settlementMercSheetFor(host:NativeSettlementHost,zoneId: string, mint: () => MercOffer[]): MercOffer[] {
    let sheet = host.mercSheets[zoneId];
    if (!sheet) {
      sheet = host.mercSheets[zoneId] = mint();
      host.charDirty = true; // world-save state from the moment it's dealt
    }
    for (let i = sheet.length - 1; i >= 0; i--) {
      const o = sheet[i];
      if (o.kind === 'retired' && !host.account.mercRoster.some(r => r.mercId === o.refId)) {
        sheet.splice(i, 1);
        host.charDirty = true;
      }
    }
    return sheet;
  }

export function settlementDealTemplateOffers(host:NativeSettlementHost,rng: Rng, count: number, into: MercOffer[] = []): MercOffer[] {
    const templates = [...MERC_TEMPLATES];
    for (let i = templates.length - 1; i > 0; i--) {
      const j = Math.floor(rng.range(0, i + 1));
      [templates[i], templates[j]] = [templates[j], templates[i]];
    }
    for (let i = 0; into.length < count && i < templates.length; i++) {
      const t = templates[i];
      into.push({
        kind: 'template', refId: t.id,
        name: t.names[Math.floor(rng.range(0, t.names.length))] ?? t.id,
        classId: t.classId, blurb: t.blurb,
      });
    }
    return into;
  }
