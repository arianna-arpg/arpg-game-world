/** Shared native campaign lifecycle bodies over actual area and account owners. */
import {dist,rand,vec,type Vec2} from '../core/math';
import {Actor} from './actor';
import {CONTAINERS,containerBoard,containerMisfits} from './containers';
import {accountRelicBoard,migrateRelicCarry,reconcileRelicStash} from './accountReliquary';
import {ESSENCES,ESSENCE_IDS,LEDGER_ESSENCE_TOUCHED,walletBreakdown,walletMortalValue,type EssenceCost,type EssenceId} from '../data/essences';
import {MONSTERS} from '../data/monsters';
import {DEATH_PRESENTATION} from '../data/deathPresentation';
import {PIT_CFG,pitAt} from './pitfall';
import {regionKind} from '../world/regions';
import {traversalDef,type TraversalCapture} from './traversal';
import {bumpLedger} from '../packages/ledger';
import {RARITY_DEFS} from './rarity';
import {notePickup} from '../world/bulletins';
import {samplePoint} from '../world/shape';
import {featureEnabled,FEATURE} from '../meta/account';
import {modeById,type CharacterModeDef} from '../meta/modes';
import {NEMESIS_CFG,formNemesis,nemesisTitle,promoteNemesis,sagaKey,touchSaga} from '../meta/nemesis';
import type {World,Seat} from './world';
export interface NativeSceneCampaignLifecycleHost {
 bindTraversal(record:NonNullable<World['traversal']>):void;
 finishTraversal(record:NonNullable<World['traversal']>):void;
 account:World["account"];
 accountSeat:World["accountSeat"];
 arena:World["arena"];
 bridges:World["bridges"];
 clientActionHook:World["clientActionHook"];
 deathPresentation:World["deathPresentation"];
 distinctNameOf:World["distinctNameOf"];
 events:World["events"];
 farthestStand:World["farthestStand"];
 gameOver:World["gameOver"];
 landPartyAt:World["landPartyAt"];
 lastPlayerKiller:World["lastPlayerKiller"];
 ledger:World["ledger"];
 localSeat:World["localSeat"];
 manifest:World["manifest"];
 markMetaDirty:World["markMetaDirty"];
 meta:World["meta"];
 modeStageDef:World["modeStageDef"];
 nemesisActive:World["nemesisActive"];
 nemesisEligible:World["nemesisEligible"];
 notice:World["notice"];
 pickupFeed:World["pickupFeed"];
 player:World["player"];
 pointInSolid:World["pointInSolid"];
 runEndReason:World["runEndReason"];
 sagaDirty:World["sagaDirty"];
 seats:readonly Seat[];
 shake:World["shake"];
 text:World["text"];
 time:World["time"];
 traversal:World["traversal"];
 traversalAnchor:World["traversalAnchor"];
 walk:World["walk"];
 zone:World["zone"];
 zoneEntry:World["zoneEntry"];
 zonePits:World["zonePits"];
}

export function sceneBeginTraversal(host:NativeSceneCampaignLifecycleHost,id: string, opts?: { swap?: () => void; done?: () => void; capture?: TraversalCapture }): boolean {
    const def = traversalDef(id);
    if (!def || host.traversal) return false;
    host.traversal = { def, phase: 'windup', t: 0, ...opts };
    host.bindTraversal(host.traversal);
    host.traversalAnchor = vec(host.player.pos.x, host.player.pos.y);
    host.player.invulnerable = true;
    host.player.untargetable = true;
    host.player.casting = null;
    host.player.dash = null;
    host.player.push = null;
    if (def.text) host.text(vec(host.player.pos.x, host.player.pos.y - 44), def.text, def.textColor ?? '#cfe0ff', 15);
    return true;
  }

export function sceneDistinctNameOf(host:NativeSceneCampaignLifecycleHost,a: Actor): string | undefined {
    if (a.nemesis || !a.defId) return undefined;
    const def = MONSTERS[a.defId];
    if (!def || a.name === def.name) return undefined;
    const label = a.rarity ? RARITY_DEFS[a.rarity].label : '';
    if (label && a.name === `${label} ${def.name}`) return undefined;
    return a.name;
  }

export function sceneGrantEssence(host:NativeSceneCampaignLifecycleHost,seat: Seat, gain: EssenceCost): void {
    seat.meta.essences[gain.essence] = (seat.meta.essences[gain.essence] ?? 0) + gain.count;
    // DISCOVERY — the first essence a line ever touches surfaces the Salvage
    // Station in the Vault (unlocks.ts reads the banked key, the same *_seen
    // idiom every package uses). LEDGER_ESSENCE_TOUCHED permits one civic-feed
    // nudge per run while unowned, outside the fighting area.
    if ((host.ledger[LEDGER_ESSENCE_TOUCHED] ?? 0) === 0
      && !featureEnabled(host.account, FEATURE.SALVAGE_STATION)) {
      // Preserve the former residue float's cosmetic jitter draw: presentation
      // must not shift subsequent native simulation/reward randomness.
      rand(-10, 10);
      host.notice('strange residue — the Vault could put this to use…', '#e8c87a', 12, 'civic');
    }
    bumpLedger(host.ledger, LEDGER_ESSENCE_TOUCHED, gain.count);
    const def = ESSENCES[gain.essence];
    host.text(seat.actor.pos, `+${gain.count} ${def.label}`, def.color, 12, 'gains', 1, true);
    // The PICKUP FEED keeps the ledger (coalesced — a spill trail reads as one row).
    notePickup(host.pickupFeed, seat.id, def.label, def.color, host.time, gain.count);
    host.markMetaDirty(seat); // the wallet rides seatMeta — replicate every gain
  }

export function sceneModeDef(host:NativeSceneCampaignLifecycleHost): CharacterModeDef { return modeById(host.meta.modeId); }

export function sceneNemesisEligible(host:NativeSceneCampaignLifecycleHost,a: Actor): boolean {
    if (a.team !== 'enemy' || a.passive || a.untargetable || a.owner || a.doorId) return false;
    if (a.noBounty || a.eventKey?.startsWith('scene:')) return false;
    if (!a.defId || !MONSTERS[a.defId]) return false;
    if (MONSTERS[a.defId].noNemesis) return false;
    return true;
  }

export function sceneOnRunEnded(host:NativeSceneCampaignLifecycleHost,reason: string): void {
    host.runEndReason = reason;
    host.gameOver = true;
    if (reason === 'death' && DEATH_PRESENTATION.enabled) host.deathPresentation = { elapsed: 0 };
  }

export function sceneReckonRunEssence(host:NativeSceneCampaignLifecycleHost): {
    rows: { id: EssenceId; count: number; worth: number; value: number }[];
    carried: number; mult: number; minted: number;
  } {
    const pooled: Partial<Record<EssenceId, number>> = {};
    for (const s of host.seats) {
      if (!host.accountSeat(s) || s.merc) continue;
      for (const id of ESSENCE_IDS) pooled[id] = (pooled[id] ?? 0) + (s.meta.essences[id] ?? 0);
    }
    const rows = walletBreakdown(pooled);
    const carried = walletMortalValue(pooled);
    const mult = host.modeStageDef().deathPayoutMult;
    return { rows, carried, mult, minted: Math.floor(carried * mult) };
  }

export function sceneRecordNemesisFall(host:NativeSceneCampaignLifecycleHost): void {
    const killer = host.lastPlayerKiller;
    host.lastPlayerKiller = null;
    if (!host.localSeat || !host.nemesisActive()) return;
    const saga = touchSaga(host.account, host.meta.name);
    saga.fallen++;
    if (killer && host.nemesisEligible(killer)) {
      const tag = killer.nemesis;
      if (tag && tag.sagaKey === sagaKey(host.meta.name)) {
        const rec = saga.nemeses.find(n => n.id === tag.id);
        if (rec) {
          rec.slays++;
          promoteNemesis(rec, 'slayer', `slew ${host.meta.name} again`);
          killer.name = nemesisTitle(rec); // the promotion is worn on the spot
          host.text(vec(killer.pos.x, killer.pos.y - 34), `${killer.name} RISES.`, tag.tint, 17);
          host.events.emit('nemesis/promoted', { saga: tag.sagaKey, nemesis: rec.name, rank: rec.rank });
        }
      } else if (Math.random() < NEMESIS_CFG.slayerChance) {
        const n = formNemesis(saga, killer.defId!, killer.faction ?? '', 'slayer', Math.random,
          { name: host.distinctNameOf(killer), bornRarity: killer.rarity });
        host.text(vec(killer.pos.x, killer.pos.y - 34),
          `${nemesisTitle(n)} will remember the name ${host.meta.name}.`, '#e07840', 15);
        host.events.emit('nemesis/formed', { saga: sagaKey(host.meta.name), nemesis: n.name, deed: 'slayer' });
      }
    }
    host.sagaDirty(true);
  }

export function sceneRestoreAccountRelics(host:Pick<NativeSceneCampaignLifecycleHost,'localSeat'|'clientActionHook'|'account'|'manifest'>,seat: Seat): void {
    if (seat !== host.localSeat || host.clientActionHook) return;
    migrateRelicCarry(host.account, seat.meta, seat.meta.relicScope ?? (seat.meta.charId || 'run:' + host.manifest.seed), false);
    const held = accountRelicBoard(host.account);
    const misfits = new Set(containerMisfits(containerBoard(CONTAINERS.reliquary), held));
    seat.meta.containers.reliquary = held.filter(i => !misfits.has(i));
    // A retuned board sends property to reserve, never to the floor.
    host.account.reliquary.seated = seat.meta.containers.reliquary.map(i => i.relicKey!);
    for (const item of misfits) { delete item.x; delete item.y; }
    reconcileRelicStash(host.account);
  }

export function sceneScatterPitArrival(host:NativeSceneCampaignLifecycleHost): void {
    if (host.zone.boundless) return; // streamed arenas own their arrivals
    const drop = PIT_CFG.dropCave;
    const p = host.player;
    const mouth = host.zoneEntry;
    const minD = Math.min(drop.scatterMinDist,
      Math.hypot(host.arena.w, host.arena.h) * drop.scatterMinFrac);
    const pits = host.zonePits();
    const ok = (x: number, y: number): boolean => {
      if (host.walk && !host.walk.isWalkable(x, y)) return false;
      if (host.pointInSolid(x, y, p.radius * 0.5)) return false;
      if (pitAt(pits, host.bridges, x, y, null)) return false;
      const rk = host.walk?.regionAt ? regionKind(host.walk.regionAt(x, y)) : undefined;
      if (rk?.standDamage || rk?.survival) return false;
      return !(host.walk?.reachable && !host.walk.reachable(mouth, vec(x, y)));
    };
    let land: Vec2 | null = null;
    for (let t = 0; t < drop.scatterTries && !land; t++) {
      const sp = samplePoint(host.arena, 60, rand);
      if (dist(vec(sp.x, sp.y), mouth) < minD) continue;
      if (ok(sp.x, sp.y)) land = vec(sp.x, sp.y);
    }
    if (!land) land = host.farthestStand(p.radius, true);
    if (!land || pitAt(pits, host.bridges, land.x, land.y, null)
      || dist(land, mouth) < 40) return; // cramped hollow: the classic arrival stands
    // Seats AND the carried court ride the tumble together (THE PARTY-LANDING
    // LAW) — scattered, but never separated from each other.
    host.landPartyAt(land);
  }

export function sceneUpdateTraversal(host:NativeSceneCampaignLifecycleHost,dt: number): void {
    const s = host.traversal;
    if (!s) return;
    const p = host.player;
    s.t += dt;
    // The crossing owns the body: pinned to its anchor, skills locked out,
    // shoves shrugged off. The world keeps simulating around it.
    p.useLock = Math.max(p.useLock, 0.2);
    p.push = null;
    if (host.traversalAnchor) { p.pos.x = host.traversalAnchor.x; p.pos.y = host.traversalAnchor.y; }
    if (s.phase === 'windup') {
      if (s.def.shake) host.shake = Math.max(host.shake, s.def.shake * Math.min(1, s.t / Math.max(0.01, s.def.windup)));
      if (s.t >= s.def.windup) { s.phase = 'rise'; s.t = 0; }
      return;
    }
    if (s.phase === 'rise') {
      if (s.t < s.def.rise) return;
      // The veil is shut: swap worlds behind it, then re-anchor on wherever
      // the swap set the player down.
      s.phase = 'land';
      s.t = 0;
      if (!s.swapped) {
        s.swapped = true;
        s.swap?.();
        host.traversalAnchor = vec(p.pos.x, p.pos.y);
      }
      return;
    }
    // land: the veil clears over the new ground.
    if (s.t < s.def.land) return;
    host.finishTraversal(s);
    host.traversal = null;
    host.traversalAnchor = null;
    p.invulnerable = false;
    p.untargetable = false;
    if (s.def.status) p.applyStatus(s.def.status.id, 0, s.def.status.duration ?? 1, 'the crossing');
    s.done?.();
  }
