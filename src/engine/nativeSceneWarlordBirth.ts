/** The original capital encounter, shared by first birth and a genuine retained return. */
import type {NativeAreaBirthHost} from './nativeAreaBirth';
import type {ZoneDef} from '../data/zones';
import type {Actor} from './actor';
import {FACTIONS, MONSTERS} from '../data/monsters';
import {vec} from '../core/math';
import {observeNativeCombatBirth} from './nativeCombatRecordObservation';
import {observeNativeWarlordPlacement,observeNativeWarlordCreation,observeNativeWarlordPush,pushNativeWarlordBody} from './nativeWarlordIdentity';
export type NativeWarlordHost=Pick<NativeAreaBirthHost,'sim'|'createMonster'|'clampPos'|'farPoint'|'actors'|'text'>;
export function birthNativeWarlord(host:NativeWarlordHost,def:ZoneDef,o:ZoneDef['objective'],p:Actor):void {
    const lord = host.sim.warlord.lordAt(def.id);
    if (lord && o.kind !== 'boss' && host.sim.faction.owner(def.id).faction === lord.faction) {
      observeNativeWarlordPlacement(host, lord, () => {
      const bossId = host.sim.warlord.bossId(lord.faction);
      if (bossId && MONSTERS[bossId]) {
        const wl = observeNativeWarlordCreation(host, () => host.createMonster(bossId, def.level + 2, 'enemy'));

        wl.faction = lord.faction;
        wl.xpValue = Math.max(wl.xpValue, 120); // a warlord's bounty (the top
        // bar itself is the authored-boss contract — World.bossBarInfo)
        wl.tag = 'warlord';
        wl.pos = host.clampPos(host.farPoint(700), wl.radius);
        pushNativeWarlordBody(host, host.actors, wl);
        observeNativeCombatBirth(host, wl);
        observeNativeWarlordPush(host, wl);
        const wname = (FACTIONS[lord.faction]?.name ?? lord.faction).replace(/^the /, '');
        host.text(vec(p.pos.x, p.pos.y - 116), `${wname} warlord rules ${def.name}!`, '#e85050', 16);
      }
      });
    }
}
