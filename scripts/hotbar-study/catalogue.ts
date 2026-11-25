// Build-time projection. The offline study ships compact examples, not the simulation.
import { SUPPORT_ROLES, multipleSupportBuffs, supportRoles } from '../../src/engine/supportPresentation';
import { SKILLS } from '../../src/data/skills';
import { SUPPORTS } from '../../src/data/supports';
import { PROCS } from '../../src/data/procs';
import { PASSIVE_NODES } from '../../src/data/passives';
import { CHOICE_GROUPS } from '../../src/data/passiveChoices';
import { procBuffLook, BENEFICIAL_LOOKS, CHARGE_LOOKS, modifierBuffLook } from '../../src/data/buffLooks';
import { ROLE_DESTINATIONS } from '../../src/data/supportVisuals';
import type { auditSupports } from './supportCoverage';
import { CHARGE_DEFS } from '../../src/engine/charges';
import { STATUS_DEFS } from '../../src/engine/status';
import { HARMFUL_BUFF_MARKS } from '../../src/engine/mechanicMarks';
import { addPassiveBuffGrant, newPassiveBuffGrants, wornBuffRow, type BuffRow } from '../../src/engine/buffPresentation';
import type { BuffEffect } from '../../src/engine/skills';
import type { Modifier } from '../../src/engine/stats';

export interface Sample {
  key: string; group: string; source: string; label: string; context: string;
  row: Pick<BuffRow,'kind'|'look'|'gateMark'|'triggered'|'remaining'|'duration'|'count'> | null;
  cooldown?: number;
  supportRoles?:string[];
  supportId?:string;
  supportColor?:string;
  multipleBuffs?:boolean;
}
export function catalogue(audit?:ReturnType<typeof auditSupports>): Sample[] {
  const result = new Map<string,Sample>();
  function add(key:string, group:string, source:string, label:string, context:string, row:BuffRow) {
    const {kind,look,gateMark,triggered,remaining,duration,count} = row;
    result.set(key,{key,group,source,label,context,row:{kind,look,gateMark,triggered,remaining,duration,count}});
  }
  function effectRow(def:BuffEffect) {
    return wornBuffRow(def.id,{def,remaining:def.duration,stacks:Math.min(3,def.maxStacks ?? 1)});
  }
  for (const skill of Object.values(SKILLS)) for (const fx of skill.effects ?? []) {
    if (fx.type !== 'buff' || Object.hasOwn(HARMFUL_BUFF_MARKS,fx.id)) continue;
    add('skill/'+skill.id+'/'+fx.id,'Skills',skill.name,fx.label ?? fx.id.replaceAll('_',' '),
      skill.description, effectRow(fx));
  }
  function triggered(id:string, group:string, source:string, context:string, key:string) {
    const proc=PROCS[id]; if (proc?.effect.type !== 'buff') return;
    const def=proc.effect.buff;
    if (Object.hasOwn(HARMFUL_BUFF_MARKS,def.id)) return;
    add(key,group,source,def.label ?? proc.name,context || 'Trigger · '+proc.trigger,
      effectRow({...def,buffGrant:{proc:proc.name},buffLook:procBuffLook(id,def) ?? def.buffLook}));
    if(proc.icd) result.get(key)!.cooldown=proc.icd;
  }
  for (const proc of Object.values(PROCS))
    triggered(proc.id,'Registered procs',proc.name,proc.description ?? '', 'proc/'+proc.id);
  function grants(id:string, name:string, mods:Modifier[], group:string, context:string, look?:BuffRow['look']) {
    const compiled=newPassiveBuffGrants();
    addPassiveBuffGrant(compiled,id,name,mods,look);
    for (const proc of compiled.procs.keys()) triggered(proc,group,name,context,id+'/proc/'+proc);
    for (const {row,mod} of compiled.gates) {
      if (mod.gauge && mod.gaugeAt === undefined) row.count=1;
      add(row.id,group,name,name,context || row.details?.slice(1).join(' · ') || '',row);
    }
  }
  for (const node of Object.values(PASSIVE_NODES))
    grants('node/'+node.id,node.name,node.mods ?? [],'Passive tree',node.description ?? '',node.buffLook);
  for (const group of Object.values(CHOICE_GROUPS)) for (const opt of group.options)
    grants('choice/'+group.id+'/'+opt.id,opt.name,opt.mods ?? [],'Passive choices',opt.description ?? '',opt.buffLook);
  for (const support of Object.values(SUPPORTS)) {
    const roles=supportRoles(support), destinations=new Set<string>(roles.map(r=>ROLE_DESTINATIONS[r]));
    const coverage=audit?.find(r=>r.id===support.id);
    if (coverage?.variants.some(v=>v.levels.some(l=>l.readings.length))) destinations.add('Hotbar counter');
    const context=[support.description,'Where to look · '+[...destinations].join(' / ')].join('  ');
    const before=result.size;
    grants('support/'+support.id,support.name,[...support.mods,...(support.perLevel ?? []),...(support.rollBase?.axes.flatMap(a=>a.rows.flatMap(r=>r.mods ?? [])) ?? [])],'Supports',context);
    if (support.spawnBuff) add('support/'+support.id+'/spawn','Supports',support.name,support.name,
      'On the summoned minion. '+support.description,effectRow(support.spawnBuff));
    if(result.size===before) {
      const key='support/'+support.id;
      result.set(key,{key,group:'Supports',source:support.name,label:support.name,context,row:null});
    }
    // One support may project several effects. Count definitions once per role in the browser.
    for (const sample of [...result.values()].slice(before)) {
      sample.supportRoles=supportRoles(support).map(role=>SUPPORT_ROLES[role]);
      sample.supportId=support.id;
      sample.supportColor=support.color;
      if (multipleSupportBuffs(support)) sample.multipleBuffs=true;
    }
  }
  for (const [id,def] of Object.entries(CHARGE_DEFS)) {
    const look=def.buffLook ?? CHARGE_LOOKS[id] ?? modifierBuffLook(def.perCharge ?? []);
    add('charge/'+id,'Charge banks',def.label,def.label,'One held charge.',
      {kind:'charge',id,label:def.label,count:1,look:{...look,color:look.color ?? def.color}});
  }
  for (const [id,def] of Object.entries(STATUS_DEFS)) if(def.beneficial) {
    const look=def.buffLook ?? BENEFICIAL_LOOKS[id] ?? modifierBuffLook(def.mods ?? []);
    add('status/'+id,'Beneficial statuses',def.label,def.label,'Beneficial status on the bearer.',
      {kind:'status',id,label:def.label,remaining:Number.isFinite(def.duration) ? def.duration : undefined,
        count:def.stacking ? 1 : undefined,look:{...look,color:look.color ?? def.color}});
  }
  return [...result.values()].sort((a,b)=>a.source.localeCompare(b.source) || a.key.localeCompare(b.key));
}
