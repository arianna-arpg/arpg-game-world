import type { Actor } from './actor';
import type { IconSubject } from '../render/skillIconArt';

/** Mechanical marks which are stored on the victim outside the ordinary status registry. */
export const MECHANIC_MARKS = {
  riven: {label:'Riven Fractures', subject:'brokenShield', color:'#e4b484', detail:'Armor and resistances fractured'},
  disintegration: {label:'Plasma Disintegration', subject:'void', color:'#e28af5', detail:'Building toward Plasma Overflow'},
  shred: {label:'Plasma Overflow', subject:'brokenShield', color:'#f9abed', detail:'Defenses shredded'},
  dilation: {label:'Phase Dilation', subject:'hourglass', color:'#bc91fa', detail:'Slowed and exposed to Night Bite'},
  debt: {label:'Temporal Debt', subject:'clock', color:'#92dbd0', detail:'Deferred hit pending'},
  seed: {label:'Rupture Seed', subject:'membrane', color:'#cc88f1', detail:'Damage can rupture the seed'},
  hangover: {label:'Feral Hangover', subject:'wound', color:'#bb8980', detail:'Attack and cast speed reduced'},
  attrition: {label:'Abyssal Adaptation', subject:'fangs', color:'#ac9fdd', detail:'Deepest current attacker mark'},
  corrosion: {label:'Corrosive Dissolution', subject:'venom', color:'#bbdc79', detail:'Poison is melting defenses'},
} satisfies Record<string,{label:string;subject:IconSubject;color:string;detail:string}>;
export type MechanicMarkId = keyof typeof MECHANIC_MARKS;
export interface MechanicMark {id:MechanicMarkId; stacks:number; remaining?:number}
const empty: readonly MechanicMark[] = [];
export const HARMFUL_BUFF_MARKS: Readonly<Record<string, MechanicMarkId>> = {phase_dilation:'dilation', feral_hangover:'hangover'};
export function mechanicMarks(a: Actor, now:number): readonly MechanicMark[] {
  if (a.dead || a.downed) return empty;
  if (a.mirroredMechanicMarks) return a.mirroredMechanicMarks;
  let rows: MechanicMark[] | undefined;
  function add(id:MechanicMarkId, stacks:number, remaining?:number) {
    if (stacks > 0 && (remaining === undefined || remaining > 0)) (rows ??= []).push({id,stacks,remaining});
  }
  if (a.echoDebt) add('debt',1,a.echoDebt.until-now);
  if (a.ruptureSeed) add('seed',1,a.ruptureSeed.until-now);
  if (a.rivenStacks) add('riven',a.rivenStacks,a.rivenDecay);
  if (a.disintStacks) add('disintegration',a.disintStacks,a.disintDecay);
  if (a.plasmaShredLeft > 0) add('shred',1,a.plasmaShredLeft);
  if (a.phaseDilatedLeft > 0) add('dilation',1,a.phaseDilatedLeft);
  if (a.buffs.size) {
    const hangover = a.buffs.get('feral_hangover');
    if (hangover) add('hangover',hangover.stacks,hangover.remaining);
  }
  if (a.attritionByCaster?.size) {
    let best: {stacks:number; decay:number} | undefined;
    for (const mark of a.attritionByCaster.values()) if (!best || mark.stacks > best.stacks || (mark.stacks === best.stacks && mark.decay > best.decay)) best=mark;
    if (best) add('attrition',best.stacks,best.decay);
  }
  if (a.poisonMeltPerStack > 0) {
    const poison = a.statuses.filter(s => s.id === 'poison' && s.remaining > 0);
    if (poison.length) add('corrosion',poison.reduce((sum,s)=>sum+s.stacks,0), Math.max(...poison.map(s=>s.remaining)));
  }
  return rows ?? empty;
}
