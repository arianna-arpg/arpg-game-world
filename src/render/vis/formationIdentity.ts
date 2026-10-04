import type { Actor } from '../../engine/actor';
import { ENCOUNTER_GROUPS } from '../../data/encounterGroups';
import { readEncounterGroup } from '../../engine/encounterGroups';
import { garrisonCaption } from './garrisonName';
export interface FormationIdentity { name: string; leader: boolean }
/** Live native enrollment, never inferred from a name, species or proximity. */
export function formationIdentityOf(a: Actor): FormationIdentity | null {
  const s=readEncounterGroup(a.encounterGroup);
  if(!s || a.dead || a.passive || a.owner || a.team!=='enemy' || a.squadId!==s.id)return null;
  const g=ENCOUNTER_GROUPS[s.recipe],member=g.members.find(m=>m.slot===s.slot)!;
  if(a.faction!==g.faction || !(member.monster===a.defId || member.choices?.some(c=>c.id===a.defId))
    || !!a.squadLeader!==!!member.leader)return null;
  return {name:g.name,leader:!!member.leader};
}
/** Preserve a discovered objective owner; otherwise name the native formation. */
export function formationCaption(identity: FormationIdentity, garrison: string | null,
  measure: (s:string)=>number, room:number): string {
  if(garrison)return garrisonCaption(garrison,measure,room,identity.leader?'Leader · Garrison':'Garrison');
  return garrisonCaption(identity.name,measure,room,identity.leader?'Leader':'Formation');
}
