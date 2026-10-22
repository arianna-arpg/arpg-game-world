/** Shared native campaign death bookkeeping over actual character and area owners. */
import {vec} from '../core/math';
import {isRelic,loseCarriedRelics} from './accountReliquary';
import {resurrectFee,stageOf} from '../meta/modes';
import {releaseMercsOf} from '../meta/mercs';
import {saveAccount} from '../meta/persistence';
import {captureLoot,DEATH_SCHEMA,MAX_DEATH_RECORDS,type DeathRecord} from '../meta/death';
import type {World,Seat} from './world';
export interface NativeSceneCampaignDeathHost {
 removeSeatActors(seat:Seat):void;
 selectedRemovedSeat(seat:Seat):void;
 account:World["account"];
 accountDirty:World["accountDirty"];
 actors:World["actors"];
 charDeaths:World["charDeaths"];
 charDirty:World["charDirty"];
 clientActionHook:World["clientActionHook"];
 events:World["events"];
 hiredMercs:World["hiredMercs"];
 inCave:World["inCave"];
 indexSeats:World["indexSeats"];
 localSeat:World["localSeat"];
 loseBagRelicsOnDeath:World["loseBagRelicsOnDeath"];
 manifest:World["manifest"];
 markMetaDirty:World["markMetaDirty"];
 meta:World["meta"];
 modeStageDef:World["modeStageDef"];
 moveBudget:World["moveBudget"];
 player:World["player"];
 removeSeat:World["removeSeat"];
 seatHero:World["seatHero"];
 seatQuests:World["seatQuests"];
 seatShelves:World["seatShelves"];
 seats:World["seats"];
 spentPresses:World["spentPresses"];
 text:World["text"];
 zone:World["zone"];
}

export function sceneRecordDeath(host:NativeSceneCampaignDeathHost): void {
    host.loseBagRelicsOnDeath(host.localSeat);
    if (host.inCave) return;
    const loot = captureLoot(host.meta);
    if (loot.items.length === 0) return;
    const rec: DeathRecord = {
      schema: DEATH_SCHEMA,
      mapX: host.zone.map.x, mapY: host.zone.map.y,
      pos: { x: host.player.pos.x, y: host.player.pos.y },
      tier: host.player.tier,
      zoneId: host.zone.id,
      loot,
      classId: host.meta.classDef.id, charLevel: host.player.level, zoneName: host.zone.name,
      owner: host.localSeat.id,
      timestamp: Date.now(),
    };
    const own = host.modeStageDef().corpseRing === 'own';
    const ring = own ? host.charDeaths : host.account.deaths;
    ring.push(rec);
    while (ring.length > MAX_DEATH_RECORDS) ring.shift();
    if (own) host.charDirty = true; // rides the character save, not the account
  }

export function sceneRecordSeatDeath(host:NativeSceneCampaignDeathHost,seat: Seat): void {
    host.loseBagRelicsOnDeath(seat);
    if (host.inCave) return;
    const loot = captureLoot(seat.meta);
    if (loot.items.length === 0) return;
    const hero = host.seatHero(seat);
    const rec: DeathRecord = {
      schema: DEATH_SCHEMA,
      mapX: host.zone.map.x, mapY: host.zone.map.y,
      pos: { x: hero.pos.x, y: hero.pos.y },
      tier: hero.tier,
      zoneId: host.zone.id,
      loot,
      classId: seat.meta.classDef.id, charLevel: hero.level, zoneName: host.zone.name,
      owner: seat.id,
      timestamp: Date.now(),
    };
    const stage = stageOf(seat.meta.modeId, seat.meta.modeStage);
    const ring = stage.corpseRing === 'own' ? (seat.couchDeaths ??= []) : host.account.deaths;
    ring.push(rec);
    while (ring.length > MAX_DEATH_RECORDS) ring.shift();
  }

export function sceneFellVessel(host:NativeSceneCampaignDeathHost,seat: Seat): void {
    const entry = host.account.roster.find(r => r.charId === seat.meta.charId);
    if (!entry || entry.fallen) return;
    const level = host.seatHero(seat).level;
    entry.fallen = { fee: resurrectFee(level, host.account.level), at: Date.now(), level };
    host.accountDirty = true;
  }

export function sceneDismissMercenary(host:NativeSceneCampaignDeathHost,note?: string, index?: number): void {
    if (!host.hiredMercs.length) return;
    const struck = index !== undefined ? host.hiredMercs.splice(index, 1) : host.hiredMercs.splice(0);
    if (!struck.length) return;
    if (index !== undefined) {
      // One blade: release only ITS roster engagement (the pool heals the
      // rest on the next healMercEngagements sweep if refs ever drift).
      for (const hm of struck) {
        if (hm.mercId) {
          const r = host.account.mercRoster.find(x => x.mercId === hm.mercId);
          if (r && r.engagedBy === host.meta.charId) delete r.engagedBy;
        }
      }
    } else {
      releaseMercsOf(host.account, host.meta.charId);
    }
    host.accountDirty = true;
    for (const hm of struck) host.removeSeat(hm.seat.id);
    host.charDirty = true;
    if (note) host.text(vec(host.player.pos.x, host.player.pos.y - 48), note, '#c8b048', 13);
  }

export function sceneLoseBagRelicsOnDeath(host:NativeSceneCampaignDeathHost,seat: Seat): void {
    if (host.clientActionHook) return;
    if (seat === host.localSeat) {
      const scope = seat.meta.relicScope ?? (seat.meta.charId || 'run:' + host.manifest.seed);
      if (loseCarriedRelics(host.account, seat.meta.items, scope)) {
        host.accountDirty = true;
        saveAccount(host.account);
      }
    }
    seat.meta.items = seat.meta.items.filter(i => !isRelic(i));
    host.markMetaDirty(seat);
  }

export function sceneRemoveSeat(host:NativeSceneCampaignDeathHost,id: string): void {
    const i = host.seats.findIndex(s => s.id === id);
    if (i === -1 || host.seats[i] === host.localSeat) return;
    const seat = host.seats[i];
    host.selectedRemovedSeat(seat);
    host.seats.splice(i, 1);
    host.spentPresses.delete(id); // THE SPENT PRESS leaves with the hand
    host.moveBudget.delete(id); // THE TIME BUDGET leaves with it
    host.seatQuests.delete(id); // THE CHARACTER'S QUESTS: the hero's ledger left with its vessel's mirror
    host.seatShelves.delete(id); // THE SHELF PER BUYER: the buyer's standing shelf leaves with it
    host.removeSeatActors(seat);
    host.indexSeats();
    host.events.emit('party/leave', { actor: seat.actor, seat: id });
  }
