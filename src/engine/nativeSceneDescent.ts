/** Exact native cave Delver placement, locked stock and abyss entry. No dive update/interaction or source issuer is implied. */
import type {World,VendorEntry} from './world';
import type {ZoneDef} from '../data/zones';
import {Rng,withSeededRandom} from '../core/rng';
import {randInt,vec} from '../core/math';
import {delverMulAt} from '../world/strata';
import {FIXTURE_IDS} from '../data/monsters';
import {bumpLedger} from '../packages/ledger';
import {featureEnabled,FEATURE} from '../meta/account';
import {VENDOR_CFG} from '../data/vendors';
import {VENDOR_ITEM_CFG} from '../data/essences';
import {mintSupportInstance} from './supportbase';
import {DESCENT_AFFIX_FAMILIES} from '../data/itemaffixes';
import {rollItem} from './itemgen';
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export interface NativeSceneDescentHost {
 sim:Pick<World['sim'],'descentField'>;
 inCave:World['inCave'];
 player:World['player'];
 clampPos:World['clampPos'];
 farPoint:World['farPoint'];
 createMonster:World['createMonster'];
 actors:World['actors'];
 clearTransitSpot:World['clearTransitSpot'];
 doodads:World['doodads'];
 descentSite:World['descentSite'];
 descentStock:World['descentStock'];
 descentStocks:World['descentStocks'];
 mintDelverStock:World['mintDelverStock'];
 ledger:World['ledger'];
 text:World['text'];
 manifest:World['manifest'];
 account:World['account'];
 vendorGemLevel:World['vendorGemLevel'];
 vendorGemsOpen:World['vendorGemsOpen'];
 rollSupportDropGated:World['rollSupportDropGated'];
 rollSkillGem:World['rollSkillGem'];
 descentRun:World['descentRun'];
 zone:World['zone'];
 descentSpawnTimer:World['descentSpawnTimer'];
 notice:World['notice'];
}

export function descentPlaceDescentDelver(host:NativeSceneDescentHost,def: ZoneDef): void {
    const df = host.sim.descentField;
    if (!df || !host.inCave || def.id.startsWith('cave_descent_')) return;
    // Delvers haunt COMBAT caves. A safe pocket (the town cellar) and a waves
    // arena (The Pit) are sealed rooms — no shaft-keeper mints a mineshaft
    // through their floors (the same objective gate every ambient system uses).
    if (def.objective.kind === 'safe' || def.objective.kind === 'waves') return;
    // OWNED / SPECIAL ground: an event's realm arena (the crusade throne, a
    // demon rift, the necropolis) is a stage, not a cave system — no shaft
    // through the colosseum sand (the eventOwned contract, underground).
    if (def.eventOwned || def.special) return;
    // NO WAY ON (ZoneDef.noDeeper — pit-dropped hollows): a pocket that
    // promised no further doors refuses the shaft-keeper's too.
    if (def.noDeeper) return;
    // Delvers dig DOWN toward the world's own underworld: ground that HANGS
    // (ZoneDef.below — a sky shelf over the land) and ground outside the
    // surface dimension entirely never hosts a shaft. Both are one-field
    // classifiers, so any future floating or realm pocket exempts itself by
    // being what it is (no delver allowlist to maintain).
    if (def.below || (def.dimension ?? 'surface') !== 'surface') return;
    if (!df.delverAllowed(host.player.level)) return;
    const roll = new Rng(((def.seed ?? 0) ^ 0xde17e2) >>> 0); // stable per mouth
    // The draw stays seeded per mouth; the THRESHOLD folds in the package's
    // live ignition lever (pressure × frequency.rate) AND the stratum's
    // delver weighting (world/strata.ts — the shaft-keepers haunt the Depths
    // more than the near-dark), so the Vault weight, the rate crank, and the
    // world's vertical ladder all reach the abyss like any ignition roll.
    if (!roll.chance(df.delverChanceNow() * delverMulAt(def.caveDepth ?? 0))) return;
    const center = host.clampPos(host.farPoint(360, true), 30);
    const delver = host.createMonster(FIXTURE_IDS.descent_delver, Math.max(1, def.level), 'enemy');
    delver.tag = 'descent_delver';
    delver.pos = host.clampPos(vec(center.x, center.y), delver.radius);
    host.actors.push(delver);
    const ang = roll.range(0, Math.PI * 2);
    const platform = host.clearTransitSpot(
      host.clampPos(vec(center.x + Math.cos(ang) * 92, center.y + Math.sin(ang) * 92), 24));
    host.doodads.push({ pos: vec(platform.x, platform.y), radius: 30, kind: 'descent_platform' });
    host.descentSite = { delverId: delver.id, platform: vec(platform.x, platform.y) };
    // THE LOCKED SHELF: minted ONCE per shaft per run (seeded per cave) and
    // re-PROJECTED on every re-entry — purchases stay spliced, the roll never
    // repeats, so there is no refresh to scum. The counter itself stays
    // sealed until the dive resolves (THE PROVING LAW — delverShopOpen).
    host.descentStock = host.descentStocks.get(def.id) ?? host.mintDelverStock(def);
    bumpLedger(host.ledger, 'delvers_seen'); // DISCOVERY — surfaces the Vault unlock
    host.text(vec(center.x, center.y - 30), 'A Delver lingers by a gaping shaft…', '#7fe0d8', 15);
  }

export function descentMintDelverStock(host:NativeSceneDescentHost,def: ZoneDef): VendorEntry[] {
    const st = host.sim.descentField?.surge().stock;
    const out: VendorEntry[] = [];
    if (!st) return out;
    const seed = (host.manifest.seed ^ hashStr(`delvershelf:${def.id}`)) >>> 0;
    withSeededRandom(seed, () => {
      const rollRung = (): number => {
        let total = 0;
        for (const r of st.depthRungs) total += Math.max(0, r.weight);
        if (total <= 0) return 0;
        let roll = Math.random() * total;
        for (const r of st.depthRungs) {
          roll -= Math.max(0, r.weight);
          if (roll <= 0) return r.depth;
        }
        return st.depthRungs[st.depthRungs.length - 1].depth;
      };
      // Gems mirror Brandt's shelf gates — normalize means the SAME rules
      // (true gems stock once THE MEMORY COUNTER opens them, supports once
      // that's unlocked; skill-items M3), the depth locks merely layer on
      // top. Minted-once law: a rung bought mid-run reaches the NEXT shaft.
      const sellSupports = featureEnabled(host.account, FEATURE.BRANDT_SELL_SUPPORTS);
      const lvl = host.vendorGemLevel();
      const gemCount = host.vendorGemsOpen() ? st.gems : 0;
      for (let i = 0; i < gemCount; i++) {
        const depth = rollRung();
        let e: VendorEntry;
        const sd = sellSupports && Math.random() < VENDOR_CFG.supportShare
          ? host.rollSupportDropGated(undefined, lvl) : undefined;
        if (sd) e = { kind: 'support', gem: mintSupportInstance(sd, 1) };
        else e = { kind: 'skill', inst: host.rollSkillGem(undefined, lvl) };
        if (depth > 0) e.depthReq = depth;
        out.push(e);
      }
      for (let i = 0; i < st.gear; i++) {
        const depth = rollRung();
        const ilvl = Math.max(1, host.player.level + randInt(-VENDOR_ITEM_CFG.ilvlJitter, VENDOR_ITEM_CFG.ilvlJitter));
        const withFamily = Math.random() < st.affixChanceBase + st.affixChancePerDepth * depth
          ? DESCENT_AFFIX_FAMILIES[Math.floor(Math.random() * DESCENT_AFFIX_FAMILIES.length)]
          : undefined;
        const item = rollItem({ ilvl, rarityWeights: VENDOR_ITEM_CFG.rarityWeights, withFamily });
        if (!item) continue;
        const e: VendorEntry = { kind: 'item', item };
        if (depth > 0) e.depthReq = depth;
        out.push(e);
      }
    });
    host.descentStocks.set(def.id, out);
    return out;
  }

export function descentEnterDescentZone(host:NativeSceneDescentHost): void {
    const run = host.descentRun, df = host.sim.descentField;
    if (!run || !df) return;
    run.origin = vec(host.player.pos.x, host.player.pos.y);
    run.depth = 0; run.haul = {}; run.haulBank = 0;
    run.baseLevel = host.zone.level; // THE PRESSURE LADDER's anchor
    host.doodads.push({ pos: vec(run.origin.x, run.origin.y), radius: 30, kind: 'descent_platform' });
    if (!host.player.survival) host.player.survival = new Map();
    host.player.survival.set('light', df.surge().lightMax);
    host.descentSpawnTimer = 0;
    host.notice('You descend into the dark…', '#7fe0d8', 16, 'world');
  }
