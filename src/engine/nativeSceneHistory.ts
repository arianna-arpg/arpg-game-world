/** Exact native birth-time history operations. No kill, reclaim or save dispatcher is implied. */
import type {World} from './world';
import type {ZoneDef} from '../data/zones';
import {stageOf,type ModeStageDef} from '../meta/modes';
import {NEMESIS_CFG,grudgeTier,nemesisTitle,peekSaga,sagaKey,type NemesisRecord} from '../meta/nemesis';
import {NEMESIS_RANKS} from '../data/nemesis';
import {CORPSE_MATCH_RADIUS,type DeathRecord} from '../meta/death';
import {MONSTERS,FACTIONS} from '../data/monsters';
import {vec} from '../core/math';
import {mod} from './stats';
export interface NativeSceneHistoryHost {
 meta:World['meta'];
 modeStageDef:World['modeStageDef'];
 charDeaths:World['charDeaths'];
 account:World['account'];
 hiredMercs:World['hiredMercs'];
 time:World['time'];
 lastSagaFlushAt:World['lastSagaFlushAt'];
 accountDirty:World['accountDirty'];
 localSeat:World['localSeat'];
 nemesisActive:World['nemesisActive'];
 watchedSagas:World['watchedSagas'];
 sim:Pick<World['sim'],'faction'>;
 manifestedThisRun:World['manifestedThisRun'];
 spawnNemesisActor:World['spawnNemesisActor'];
 createMonster:World['createMonster'];
 promoteRarity:World['promoteRarity'];
 findFreeSpot:World['findFreeSpot'];
 arena:World['arena'];
 actors:World['actors'];
 notice:World['notice'];
 text:World['text'];
 events:World['events'];
 sagaDirty:World['sagaDirty'];
 playerCorpses:World['playerCorpses'];
 zoneMap:World['zoneMap'];
 corpseRecords:World['corpseRecords'];
 clampPos:World['clampPos'];
}

export function historyModeStageDef(host:NativeSceneHistoryHost):ModeStageDef { return stageOf(host.meta.modeId, host.meta.modeStage); }

export function historyCorpseRecords(host:NativeSceneHistoryHost):DeathRecord[] {
    return host.modeStageDef().corpseSource === 'own' ? host.charDeaths : host.account.deaths;
  }

export function historyNemesisActive(host:NativeSceneHistoryHost):boolean {
    return host.modeStageDef().nemesisMemory ?? true;
  }

export function historyWatchedSagas(host:NativeSceneHistoryHost):{ name: string; role: 'self' | 'merc' }[] {
    const out: { name: string; role: 'self' | 'merc' }[] = [{ name: host.meta.name, role: 'self' }];
    for (const hm of host.hiredMercs) {
      if (sagaKey(hm.name) !== sagaKey(host.meta.name)
        && !out.some(w => sagaKey(w.name) === sagaKey(hm.name))) {
        out.push({ name: hm.name, role: 'merc' });
      }
    }
    return out;
  }

export function historySagaDirty(host:NativeSceneHistoryHost, important = false):void {
    if (important || host.time - host.lastSagaFlushAt > 30) {
      host.lastSagaFlushAt = host.time;
      host.accountDirty = true;
    }
  }

export function historyManifestNemeses(host:NativeSceneHistoryHost, def: ZoneDef):void {
    if (!host.localSeat || !host.nemesisActive()) return;
    if (def.objective.kind === 'safe') return;
    let placed = 0;
    for (const watch of host.watchedSagas()) {
      if (placed >= NEMESIS_CFG.maxManifestPerZone) break;
      const saga = peekSaga(host.account, watch.name);
      if (!saga) continue;
      const owner = host.sim.faction.owner(def.id).faction;
      for (const rec of saga.nemeses) {
        if (placed >= NEMESIS_CFG.maxManifestPerZone) break;
        if (host.manifestedThisRun.has(rec.id)) continue;
        if (!MONSTERS[rec.defId]) continue; // a patched-out foe stays a story
        let chance: number = NEMESIS_CFG.manifestChance;
        if (owner && owner === rec.faction) chance += NEMESIS_CFG.manifestFactionBonus;
        chance += grudgeTier(saga, rec.faction)?.manifestBonus ?? 0;
        if (Math.random() >= chance) continue;
        host.spawnNemesisActor(rec, watch, def);
        placed++;
      }
    }
  }

export function historySpawnNemesisActor(host:NativeSceneHistoryHost, rec: NemesisRecord, watch: { name: string; role: 'self' | 'merc' }, def: ZoneDef):void {
    const rank = NEMESIS_RANKS[Math.max(0, Math.min(rec.rank, NEMESIS_RANKS.length - 1))];
    const a = host.createMonster(rec.defId, Math.max(1, def.level), 'enemy');
    // A foe that was an ELITE in life returns at that tier (ring, affixes,
    // stats) — the nemesis rank then stacks its own menace on top.
    if (rec.bornRarity && rec.bornRarity !== 'normal') host.promoteRarity(a, rec.bornRarity);
    a.name = nemesisTitle(rec);
    a.nemesis = { sagaKey: sagaKey(watch.name), id: rec.id, tint: rank.tint };
    a.radius = Math.round(a.radius * rank.sizeMult);
    a.sheet.setSource('nemesis', [mod('life', 'more', rank.lifeMore), mod('damage', 'more', rank.damageMore)]);
    a.life = a.maxLife();
    a.aggroed = true;
    a.pos = host.findFreeSpot(vec(
      host.arena.w * (0.25 + Math.random() * 0.5),
      host.arena.h * (0.25 + Math.random() * 0.5)), a.radius);
    host.actors.push(a);
    host.manifestedThisRun.add(rec.id);
    rec.encounters++;
    rec.lastSeenAt = Date.now();
    const hunts = watch.role === 'merc'
      ? `hunts your hireling, ${watch.name}` : `remembers the name ${watch.name}`;
    host.notice(`${a.name} ${hunts}.`, rank.tint, 15, 'events');
    host.text(vec(a.pos.x, a.pos.y - a.radius - 14), '…found you.', rank.tint, 12);
    host.events.emit('nemesis/manifested', { saga: sagaKey(watch.name), nemesis: rec.name });
    host.sagaDirty();
  }

export function historyApplyGrudgeEffects(host:NativeSceneHistoryHost, def: ZoneDef):void {
    if (!host.localSeat || !host.nemesisActive()) return;
    const saga = peekSaga(host.account, host.meta.name);
    if (!saga) return;
    const announced = new Set<string>();
    for (const a of host.actors) {
      if (a.dead || a.team !== 'enemy' || !a.faction || a.owner) continue;
      const tier = grudgeTier(saga, a.faction);
      if (!tier) continue;
      a.sheet.setSource('grudge', [mod('damage', 'more', tier.damageMore)]);
      if (!announced.has(a.faction)) {
        announced.add(a.faction);
        const fac = (FACTIONS[a.faction]?.name ?? a.faction).replace(/^the /, '');
        host.notice(tier.entryLine.replace('{faction}', fac).replace('{name}', host.meta.name), '#c88888', 13, 'events');
      }
    }
  }

export function historySpawnPlayerCorpses(host:NativeSceneHistoryHost, def: ZoneDef):void {
    host.playerCorpses = [];
    if (!host.zoneMap[def.id]) return; // a cave (off-graph): no stable node
    const ring = host.corpseRecords();
    for (let i = 0; i < ring.length; i++) {
      const d = ring[i];
      if (d.loot.items.length === 0 || d.owner !== 'p0') continue; // reclaimed / other seat
      const exact = d.zoneId === def.id;
      const generated = /^(gen_|quest_|cave_)/.test(d.zoneId);
      if (generated) {
        if (!exact && Math.hypot(def.map.x - d.mapX, def.map.y - d.mapY) > CORPSE_MATCH_RADIUS) continue;
      } else if (!exact) {
        continue;
      }
      host.playerCorpses.push({
        pos: host.clampPos(vec(d.pos.x, d.pos.y), 16),
        recordIndex: i, owner: d.owner,
        who: { classId: d.classId, level: d.charLevel },
        dwell: 0, reclaimed: false,
      });
    }
  }
