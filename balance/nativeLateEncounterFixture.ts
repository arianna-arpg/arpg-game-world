import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat} from './probe_nativecombatcycle';
export const LATE_ENCOUNTER_INDEX={mirror:0,extraction:4,borough:14,court:2} as const;
export type LateEncounterKind=keyof typeof LATE_ENCOUNTER_INDEX;
export function withLateEncounter<T>(kind:LateEncounterKind,run:(c:ReturnType<typeof setup>&{calls:string[]})=>T,initial=false):T{return withSeededRandom(45927,()=>{const s=nativeCampaignFixture(45927),away=s.definition,defs=[];for(let i=1;i<=48;i++)defs.push(mintAdditionalNativeArea(s,{x:455+180*i,y:160}));s.definition=defs[LATE_ENCOUNTER_INDEX[kind]]!;s.writer.player.level=initial?30:1;s.writer.player.invulnerable=true;s.writer.sim.gatesFor(s.writer.player.level);return refuseWorldCombat([s.writer],calls=>run({...setup(s,away,initial),calls}));});}
function setup(s:ReturnType<typeof nativeCampaignFixture>,away:ReturnType<typeof mintAdditionalNativeArea>,initial:boolean){const n=birthActualNativeArea(s),field=n.coordinator.published,writer=s.writer,definition=s.definition,rows=field.assembly.input.encounters.input.state.encounters;
 const enter=()=>n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(definition.id));
 const exit=()=>n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(away.id));
 const tick=(seconds=1/60)=>n.coordinator.published.combat.campaignFrame.tick(seconds);
 if(!initial){exit();writer.player.level=30;writer.sim.gatesFor(30);}return{n,writer,definition,away,field,rows,enter,exit,tick};}
