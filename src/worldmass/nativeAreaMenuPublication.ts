/** Menu requests and content use the actual published retained area's slots.
 * Clearing a request consumes that owner's flag; neighboring requests survive. */
import type {World} from '../engine/world';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import type {NativeAreaPublicationBinding} from './nativeAreaScenePublication';
export const NATIVE_AREA_MENU_REQUEST_FIELDS=Object.freeze(["boroughArmFolkId","boroughArmRequested","bountyDwellBoardId","bountyDwellRequested","bountyDwellSeatId","caravanDwellRequested","caravanDwellSeatId","caravanReturnRequested","fontDwellRequested","fontDwellSeatId","harborDwellRequested","holdDwellRequested","mercOutpostRequested","oracleDwellRequested","oracleDwellSeatId","questRewardRequested","salvageDwellRequested","salvageDwellSeatId","trackerDwellRequested","trackerDwellSeatId","vendorDwellRequested","vendorDwellSeatId","vocationOfferRequested"] as const);
export function extendNativeAreaMenuPublication(bindings:Map<string,NativeAreaPublicationBinding>,area:()=>NativeAreaSceneOngoing):void {
 const field=<K extends keyof World>(key:K,provider:()=>Pick<World,K>)=>{if(bindings.has(key))throw Error('Duplicate native menu field: '+key);bindings.set(key,{get:()=>provider()[key],set:value=>{if(!Reflect.set(provider(),key,value))throw new TypeError('Native menu field is not writable: '+key);}});};
 field('boroughArmFolkId',()=>area().assembly.input.registry.input.state);
 field('boroughArmRequested',()=>area().assembly.input.registry.input.state);
 field('bountyDwellBoardId',()=>area().combat.runtimeState.frame);
 field('bountyDwellRequested',()=>area().combat.runtimeState.frame);
 field('bountyDwellSeatId',()=>area().combat.runtimeState.frame);
 field('caravanDwellRequested',()=>area().combat.runtimeState.frame);
 field('caravanDwellSeatId',()=>area().combat.runtimeState.frame);
 field('caravanReturnRequested',()=>area().combat.runtimeState.frame);
 field('fontDwellRequested',()=>area().combat.runtimeState.frame);
 field('fontDwellSeatId',()=>area().combat.runtimeState.frame);
 field('harborDwellRequested',()=>area().combat.runtimeState.frame);
 field('holdDwellRequested',()=>area().assembly.input.registry.input.state);
 field('mercOutpostRequested',()=>area().combat.runtimeState.frame);
 field('oracleDwellRequested',()=>area().combat.runtimeState.frame);
 field('oracleDwellSeatId',()=>area().combat.runtimeState.frame);
 field('questRewardRequested',()=>area().quests.input.state);
 field('salvageDwellRequested',()=>area().combat.runtimeState.frame);
 field('salvageDwellSeatId',()=>area().combat.runtimeState.frame);
 field('trackerDwellRequested',()=>area().combat.runtimeState.frame);
 field('trackerDwellSeatId',()=>area().combat.runtimeState.frame);
 field('vendorDwellRequested',()=>area().combat.runtimeState.frame);
 field('vendorDwellSeatId',()=>area().combat.runtimeState.frame);
 field('vocationOfferRequested',()=>area().questInteraction.input.state);
 field('descentStock',()=>area().assembly.transition);
 field('mercOutpost',()=>area().assembly.input.settlement.input.state);
 field('spans',()=>area().assembly.input.state);
}
