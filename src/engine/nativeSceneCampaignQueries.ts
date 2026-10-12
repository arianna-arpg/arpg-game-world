/** Exact campaign queries over explicit actual campaign data. No active scene callback. */
import type {World} from './world';
import type {ZoneDef} from '../data/zones';
import {seaById} from '../world/seas';

export function sceneCampaignOceanBearing(host:{continentFor(c:Parameters<World['continentFor']>[0]):Pick<ReturnType<World['continentFor']>,'kind'>}, map: { x: number; y: number }): number {
    let vx = 0, vy = 0;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const c = { x: map.x + Math.cos(a) * 520, y: map.y + Math.sin(a) * 520 };
      if (host.continentFor(c).kind === 'ocean') { vx += Math.cos(a); vy += Math.sin(a); }
    }
    return (vx || vy) ? Math.atan2(vy, vx) : 0;
  }

export function sceneCampaignSeaNameOf(host:Pick<World,"sim">, z: ZoneDef): string | null {
    if (!z.seaId) return null;
    return seaById(z.seaId, host.sim.biomeField.fieldSeed)?.name ?? null;
  }

export function sceneCampaignOdysseyLeads(host:Pick<World,"localSeat"|"questHand"|"questLedgerOf">, campaign: { leads: string[] }): string[] {
    const hand = host.localSeat.keeper ? host.questHand() : null;
    return hand && !hand.keeper && !hand.merc ? host.questLedgerOf(hand).leads : campaign.leads;
  }

import {stageOf,type ModeStageDef} from '../meta/modes';
export function sceneCampaignModeStageDef(host:Pick<World,"meta">):ModeStageDef { return stageOf(host.meta.modeId, host.meta.modeStage); }
export function sceneCampaignMetaProgressionActive(host:{modeStageDef:()=>ModeStageDef}): boolean { return host.modeStageDef().metaProgression; }
