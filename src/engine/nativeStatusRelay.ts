import type {Actor} from './actor';
import type {STATUS_RELAY_IDS,STATUS_RELAYS,relayStatusStat} from './reception';
import type {sameStory} from './tiers';
import type {dist} from '../core/math';

export interface NativeStatusRelaySources {
 readonly STATUS_RELAY_IDS:typeof STATUS_RELAY_IDS; readonly STATUS_RELAYS:typeof STATUS_RELAYS;
 readonly relayStatusStat:typeof relayStatusStat; readonly sameStory:typeof sameStory; readonly dist:typeof dist;
}
export interface NativeStatusRelayHost {enemiesOf(owner:Actor):Actor[]}
/** Same installed native sources and complete staged Actor methods are required.
 * This preserves immediate applyStatus and its non-transactional side effects. */
export function nativeRelayStatus(host:NativeStatusRelayHost,sources:NativeStatusRelaySources,owner:Actor,args:Parameters<Actor['applyStatus']>):boolean {
    if (owner.dead || owner.downed) return false;
    for (const id of owner.sheet.armedFamily('relayStatus_', sources.STATUS_RELAY_IDS)) {
      const relay = sources.STATUS_RELAYS[id];
      if (relay.status !== args[0] || owner.sheet.get((0, sources.relayStatusStat)(id)) <= 0) continue;
      let nearest: Actor | undefined, reach = relay.radius;
      for (const enemy of host.enemiesOf(owner)) {
        if (!(0, sources.sameStory)(owner, enemy) || enemy.dead || enemy.untargetable || enemy.invulnerable || enemy.passive) continue;
        const d = (0, sources.dist)(owner.pos, enemy.pos);
        if (d < reach) { reach = d; nearest = enemy; }
      }
      if (!nearest) continue; // No recipient: the original application lands normally.
      nearest.applyStatus(args[0], args[1], args[2], owner.name,
        { ...args[4], casterId: owner.id, relayed: true });
      return true;
    }
    return false;
  }
