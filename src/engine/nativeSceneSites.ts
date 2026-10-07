/** Complete native field service-site births. No update, hiring or quest transaction. */
import type {World} from './world';
import {vec,type Vec2} from '../core/math';
import {FIXTURE_IDS,MONSTERS} from '../data/monsters';
import {VOCATIONS,type VocationSiteFilter} from '../data/vocations';
import {type ZoneDef} from '../data/zones';
import {Rng} from '../core/rng';
import {patronFaction} from '../world/biomes';
import {LEDGER_MERC_OUTPOST_FOUND,MERC_CFG,availableRetired,retiredShare,type MercOffer} from '../meta/mercs';
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export interface NativeSceneSiteHost {
 sim:World['sim'];
 vocationSites:World['vocationSites'];
 zoneMatchesSiteFilter:World['zoneMatchesSiteFilter'];
 manifest:World['manifest'];
 spawnVocationSite:World['spawnVocationSite'];
 arena:World['arena'];
 createMonster:World['createMonster'];
 zone:World['zone'];
 findFreeSpot:World['findFreeSpot'];
 actors:World['actors'];
 doodads:World['doodads'];
 mercOutpost:World['mercOutpost'];
 player:World['player'];
 account:World['account'];
 mercSheetFor:World['mercSheetFor'];
 buildMercOffers:World['buildMercOffers'];
 dealTemplateOffers:World['dealTemplateOffers'];
}
export function siteZoneMatchesSiteFilter(host:NativeSceneSiteHost,def: ZoneDef, filter: VocationSiteFilter): boolean {
    if (def.objective.kind === 'safe') return false; // never in sanctuaries
    if (filter.minLevel !== undefined && def.level < filter.minLevel) return false;
    if (filter.biomes && !(def.biome && filter.biomes.includes(def.biome))) return false;
    if (filter.patronFactions) {
      const pf = def.biome ? patronFaction(def.biome) : null;
      if (!pf || !filter.patronFactions.includes(pf)) return false;
    }
    if (filter.controllingFactions) {
      const own = host.sim.faction.owner(def.id);
      if (!own.faction || !own.owned || !filter.controllingFactions.includes(own.faction)) return false;
    }
    if (filter.layouts && !(def.layoutType && filter.layouts.includes(def.layoutType))) return false;
    if (filter.harborhold !== undefined) {
      // THE HARBORHOLD AXIS (data/harborholds.ts): port-town ground only —
      // true = any hold, else exactly the named state (the Mooring Stone
      // stands on WON quays; a burned or besieged town keeps no counsel).
      const h = def.harborhold;
      if (!h) return false;
      if (filter.harborhold !== true && h.state !== filter.harborhold) return false;
    }
    return true;
  }
export function sitePlaceVocationSites(host:NativeSceneSiteHost,def: ZoneDef): void {
    for (const v of Object.values(VOCATIONS)) {
      if (!v.secret) continue;
      // Idempotent per site: a mid-session re-roll (a harborhold opening —
      // resolveHoldDefense) never doubles a shrine that already stands.
      if (host.vocationSites.some(s => s.vocId === v.id && !s.npc.dead)) continue;
      if (!host.zoneMatchesSiteFilter(def, v.secret.site.filter)) continue;
      const rng = new Rng((host.manifest.seed ^ hashStr(`vocsite_${v.id}_${def.id}`)) >>> 0);
      if (rng.range(0, 1) >= v.secret.site.chance) continue;
      host.spawnVocationSite(v.id, vec(
        host.arena.w * rng.range(0.3, 0.7),
        host.arena.h * rng.range(0.3, 0.7)), rng);
    }
  }
export function siteSpawnVocationSite(host:NativeSceneSiteHost,vocId: string, at: Vec2, rng: Rng): boolean {
    const v = VOCATIONS[vocId];
    if (!v?.secret) return false;
    const npcDef = MONSTERS[v.secret.site.npc];
    if (!npcDef) return false;
    const npc = host.createMonster(v.secret.site.npc, Math.max(1, host.zone.level), 'enemy');
    npc.pos = host.findFreeSpot(at, npc.radius);
    host.actors.push(npc);
    host.vocationSites.push({ vocId, npc });
    for (const dress of v.secret.site.doodads ?? []) {
      for (let i = 0; i < dress.count; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(dress.radius * 0.5, dress.radius);
        const p = host.findFreeSpot(
          vec(npc.pos.x + Math.cos(a) * r, npc.pos.y + Math.sin(a) * r), dress.size[1]);
        host.doodads.push({
          pos: p, radius: rng.range(dress.size[0], dress.size[1]),
          kind: dress.kind, rot: rng.range(0, Math.PI * 2),
        });
      }
    }
    return true;
  }
export function sitePlaceMercOutpost(host:NativeSceneSiteHost,def: ZoneDef): void {
    const cfg = MERC_CFG.outpost;
    // ONE OFFICER PER ZONE, by construction: an already-armed counter (the
    // quay boot's captain, the town recruiter's table) holds the ground —
    // the wild roll never stacks a second market into the same zone.
    if (host.mercOutpost) return;
    // Harborhold ground provides its own captain (the hold's merc service —
    // template-only, seated at the quay): the wild-outpost roll stands down
    // on a legacy town AND on both halves of a harbor pair. Veterans and
    // retirement stay a true-wilds exclusive.
    if (def.harborhold || def.holdAnchor) return;
    if (!host.zoneMatchesSiteFilter(def, cfg.filter)) return;
    // THE WILDS COMMISSION: the free companies pitch no camp for an
    // unproven line. Until the CURRENT hero stands at the unlock level —
    // or forever after the account's first wilds parley stamped the
    // graduation (LEDGER_MERC_OUTPOST_FOUND) — the wild roll stands down.
    // Ports and the Lastlight recruiter stay the early market on purpose,
    // and the roll itself is untouched: a graduated account meets camps at
    // whatever the current chance/filter schema says.
    if (host.player.level < cfg.unlockLevel
      && !(host.account.ledger[LEDGER_MERC_OUTPOST_FOUND] ?? 0)) return;
    if (!MONSTERS[FIXTURE_IDS.merc_captain]) return;
    const rng = new Rng((host.manifest.seed ^ hashStr(`mercpost_${def.id}`)) >>> 0);
    if (rng.range(0, 1) >= cfg.chance) return;
    const captain = host.createMonster(FIXTURE_IDS.merc_captain, Math.max(1, def.level), 'enemy');
    captain.pos = host.findFreeSpot(vec(
      host.arena.w * rng.range(0.25, 0.75),
      host.arena.h * rng.range(0.25, 0.75)), captain.radius);
    host.actors.push(captain);
    // Camp dressing: a banner and a ring of bedrolls (generic-disc fallback
    // renders unknown kinds — dedicated art can come later without data changes).
    host.doodads.push({ pos: host.findFreeSpot(vec(captain.pos.x + 34, captain.pos.y - 26), 10), radius: 9, kind: 'merc_banner', rot: 0 });
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(46, 84);
      host.doodads.push({
        pos: host.findFreeSpot(vec(captain.pos.x + Math.cos(a) * r, captain.pos.y + Math.sin(a) * r), 14),
        radius: rng.range(11, 15), kind: 'merc_bedroll', rot: rng.range(0, Math.PI * 2),
      });
    }
    host.mercOutpost = {
      captain,
      offers: host.mercSheetFor(def.id, () => host.buildMercOffers(rng)),
    };
  }
export function siteBuildMercOffers(host:NativeSceneSiteHost,rng: Rng): MercOffer[] {
    const { min, max } = MERC_CFG.offers;
    const count = min + Math.floor(rng.range(0, max - min + 1));
    const shuffle = <T,>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.range(0, i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    const offers: MercOffer[] = [];
    const veterans = shuffle([...availableRetired(host.account)]);
    const wantRetired = Math.min(veterans.length, Math.round(count * retiredShare(host.account)));
    for (let i = 0; i < wantRetired; i++) {
      const v = veterans[i];
      offers.push({
        kind: 'retired', refId: v.mercId, name: v.name, classId: v.classId,
        blurb: 'A veteran of the wake — a life someone lived, sword-arm for hire.',
        retiredLevel: v.retiredLevel,
      });
    }
    host.dealTemplateOffers(rng, count, offers);
    return shuffle(offers);
  }