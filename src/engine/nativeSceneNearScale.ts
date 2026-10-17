/** Main's near-player law, shared by legacy Worlds and retained area owners. */
import type {Actor} from './actor';
import {coopScale} from '../data/coop';
import {mod} from './stats';
import {applyScenePartyScale} from './nativeScenePopulation';
import type {NativeSceneServiceHost} from './nativeScenePopulation';
export interface NativeSceneNearScaleHost {readonly actors:Actor[];readonly nearScaleDue:Actor[];nativeScenePopulationHost():Pick<NativeSceneServiceHost,'partyScaleCount'>;drainNearScaleDue?():Actor[];assertNearScaleActor?(actor:Actor):void}
export function sceneSettleNearScale(nativeHost:NativeSceneNearScaleHost,every=false):void {
    const due = every ? nativeHost.actors : (nativeHost.drainNearScaleDue ? nativeHost.drainNearScaleDue() : nativeHost.nearScaleDue.splice(0));
    if (every) nativeHost.nearScaleDue.length = 0;
    for (const a of due) {
      if (a.dead || a.team !== 'enemy' || a.owner) continue;
      nativeHost.assertNearScaleActor?.(a);
      const frac = a.maxLife() > 0 ? a.life / a.maxLife() : 1;
      nativeHost.assertNearScaleActor?.(a);
      applyAdmittedNearScale(nativeHost, nativeHost.nativeScenePopulationHost(), a);
      nativeHost.assertNearScaleActor?.(a);
      const life = Math.min(a.maxLife(), Math.max(1, Math.round(a.maxLife() * frac)));
      nativeHost.assertNearScaleActor?.(a);
      a.life = life;
    }
  }

/** Retained admission uses the actual native sheet and selected callable. */
function applyAdmittedNearScale(nativeHost:NativeSceneNearScaleHost,host:Pick<NativeSceneServiceHost,'partyScaleCount'>,a:Actor):void {
    const assertActor = nativeHost.assertNearScaleActor;
    if (!assertActor) { applyScenePartyScale(host, a); return; }
    const checkSheet = (sheet:Actor['sheet']):void => {
      Reflect.apply(assertActor, nativeHost, [a]);
      const current = a.sheet;
      Reflect.apply(assertActor, nativeHost, [a]);
      if (current !== sheet) throw Error('Native near-scale actor sheet changed during selection');
    };
    const s = coopScale(host.partyScaleCount(a.pos)); // keeperSeat: scaled by the seats near the enemy itself
    Reflect.apply(assertActor, nativeHost, [a]);
    if (s.life > 0 || s.damage > 0) {
      const sheet = a.sheet, setSource = sheet.setSource;
      const args:Parameters<typeof sheet.setSource> = ['partyScale', [mod('life', 'more', s.life), mod('damage', 'more', s.damage)]];
      checkSheet(sheet);
      Reflect.apply(setSource, sheet, args);
      checkSheet(sheet);
    } else {
      const sheet = a.sheet, removeSource = sheet.removeSource;
      checkSheet(sheet);
      Reflect.apply(removeSource, sheet, ['partyScale']);
      checkSheet(sheet);
    }
  }
