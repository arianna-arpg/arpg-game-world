import type { Actor } from './actor';
import { inAoe, type World } from './world';
import { angleDiff, angleTo, dist, type Vec2 } from '../core/math';
import { mod } from './stats';
import { applyHit, type DamagePacket, type LifeWoundEvent } from './damage';
import { perceiveTarget } from './perception';
import { normalizeBrain } from './brain';
import { instanceDelivery, instanceMods, makeSkillInstance, skillContextTags, summonSchoolSkill,
  type SkillInstance, type SummonDelivery } from './skills';
import { cohortSkillIds, type CohortSpec, type CohortCast } from './cohortSpec';
import { SKILLS } from '../data/skills';
import { STATUS_DEFS } from './status';

interface Order {
  point?: Vec2; until: number; ready: number; gatherUntil?: number; direction?: number;
  slots?: Map<number,Vec2>; target?: number; markKey: string;
}
export function cohortOf(host?: SkillInstance): CohortSpec | undefined {
  if (!host || host.def.delivery.type !== 'summon') return;
  const d=instanceDelivery(host);
  const c=d.type==='summon'?d.cohort:undefined;
  return c?.primary && c.order ? c as CohortSpec : undefined;
}

/** Infantry state belongs to individual bodies and their originating summon instance. */
export class CohortArts {
  private serial=0;
  private bodies=new Set<Actor>();
  private protected=new Set<Actor>();
  private orders=new Map<Actor,Map<SkillInstance,Order>>();
  private healing=new Map<Actor,Map<number,{at:number;used:number}>>();
  constructor(private w:World,
    private forward:(host:SkillInstance,kit:SkillInstance[])=>void,
    private activate:(body:Actor,inst:SkillInstance)=>void,
    private heir:(body:Actor,spec:NonNullable<CohortSpec['legacy']>)=>Actor|null) {}

  private members(owner:Actor,host:SkillInstance):Actor[] {
    return [...this.bodies].filter(b=>!b.dead && b.owner===owner && b.summonInst===host);
  }
  private order(owner:Actor,host:SkillInstance):Order {
    let rows=this.orders.get(owner);if(!rows){rows=new Map();this.orders.set(owner,rows);}
    let o=rows.get(host);if(!o){o={until:0,ready:0,markKey:'cohort:'+owner.id+':'+(++this.serial)};rows.set(host,o);}return o;
  }
  private visible(a:Actor,b:Actor):boolean {
    return a.tier===b.tier && perceiveTarget(a,b,this.w,normalizeBrain(a.brain ?? {}).base);
  }
  private skill(a:Actor,id:string):SkillInstance|undefined {
    return a.skills.find(s=>s?.def.id===id)??a.cohortState?.kit.find(s=>s.def.id===id);
  }
  private ready(a:Actor,s?:SkillInstance):s is SkillInstance {
    return !!s && !a.dead && !a.downed && !a.isStunned() && !a.tagsForbidden(s) && (a.cooldowns.get(s.def.id)??0)<=0;
  }
  init(a:Actor,host:SkillInstance):void {
    const c=cohortOf(host);if(!c||!a.owner)return;
    const d=instanceDelivery(host) as SummonDelivery;
    const kit=cohortSkillIds(d).filter(id=>!a.skills.some(s=>s?.def.id===id)).flatMap(id=>SKILLS[id]
      ?[makeSkillInstance(summonSchoolSkill(d,a.defId!,SKILLS[id]),host.level+(host.bonusLevels??0))]:[]);
    this.forward(host,kit);
    a.cohortState={kit,primaryUses:0,reprisalReady:0,interceptCredit:a.maxLife()*(c.intercept?.budget??0),
      reliefBank:0,reliefAt:0,contactAt:0,pairReady:0,flankTime:0,flankReady:0,retreatUntil:0};
    this.bodies.add(a);
    if(c.reprisal)a.sheet.setSource('cohort:inherit',[mod('thorns','flat',a.owner.sheet.get('thorns')*c.reprisal.inheritThorns)]);
    for(const s of kit)if(s.def.delivery.type==='aura')this.activate(a,s);
    if(a.summonOffspring&&c.legacy)a.spectralVeil={color:c.legacy.color,alpha:c.legacy.alpha};
    this.armProtection();
  }
  resync(host:SkillInstance):void {
    for(const a of this.bodies)if(!a.dead&&a.summonInst===host&&a.cohortState) {
      for(const s of a.cohortState.kit)s.sockets=s.sockets.filter(x=>!x?.forwarded);
      this.forward(host,a.cohortState.kit);
      for(const skill of a.cohortState.kit)if(skill.def.delivery.type==='aura')this.activate(a,skill);
    }
  }
  /** Resolve before windup/payment, so the replacement has its own actual supports and cast time. */
  view(a:Actor,inst:SkillInstance):SkillInstance {
    const c=cohortOf(a.summonInst),s=a.cohortState;
    if(!c||!s||inst.cohortCast||inst.def.id!==c.primary)return inst;
    const rend=c.cadence && (s.primaryUses+1)%c.cadence.every===0 ? this.skill(a,c.cadence.skill):undefined;
    return rend??inst;
  }
  prepare(a:Actor,inst:SkillInstance,real:boolean):SkillInstance {
    const c=cohortOf(a.summonInst);
    if(!c||!a.cohortState||!real||inst.cohortCast)return inst;
    if(inst.def.id!==c.primary&&inst.def.id!==c.cadence?.skill)return {...inst,cohortCast:{role:'utility',origin:inst.def.id}};
    a.cohortState.primaryUses++;
    return {...inst,cohortCast:{role:inst.def.id===c.primary?'primary':'rending',origin:c.primary}};
  }
  private payload(a:Actor,id:string,aim:Vec2,role:CohortCast['role'],extra?:Partial<SkillInstance>):SkillInstance|undefined {
    const base=this.skill(a,id);if(!this.ready(a,base))return;
    const inst={...base,...extra,cohortCast:{role,origin:id}};
    this.w.executeSkill(a,inst,aim,{noRepeat:true,componentUse:true,noCooldown:true,noFollowUp:true});
    return inst;
  }
  command(owner:Actor,host:SkillInstance,aim:Vec2):void {
    const c=cohortOf(host);if(!c)return;
    const o=this.order(owner,host),members=this.members(owner,host),now=this.w.time;
    const reach=Math.min(c.order.range,dist(owner.pos,aim)),dir=angleTo(owner.pos,aim);
    o.point={x:owner.pos.x+Math.cos(dir)*reach,y:owner.pos.y+Math.sin(dir)*reach};
    o.until=now+c.order.duration;
    const target=[...this.w.enemiesOf(owner)].filter(b=>this.visible(owner,b)&&dist(b.pos,aim)<=b.radius+30)
      .sort((a,b)=>dist(a.pos,aim)-dist(b.pos,aim)||a.id-b.id)[0];
    o.target=target?.id;
    if(target&&c.mark) {
      const base=SKILLS[c.mark.skill];
      if(base) {
        const inst=makeSkillInstance(base,host.level+(host.bonusLevels??0));inst.cohortCast={role:'utility',origin:base.id,statusKey:o.markKey};this.forward(host,[inst]);
        const info=this.w.resolveTargeting(owner,inst,target.pos);
        if(info) {
          const old=owner.cohortMarks.get(host);
          if(old)this.removeMark(old.target,owner,host);owner.cohortMarks.delete(host);
          inst.extraMods=[...(inst.extraMods??[]),mod('effectDuration','more',c.mark.duration/(STATUS_DEFS[c.mark.status]?.duration??c.mark.duration)-1)];
          this.w.executeSkill(owner,inst,target.pos,{targetInfo:info,noRepeat:true,componentUse:true,noCooldown:true,noFollowUp:true});
          const status=target.statuses.find(st=>st.id===c.mark!.status&&st.sourceKey===inst.cohortCast!.statusKey);
          if(status)owner.cohortMarks.set(host,{target,status,remaining:status.remaining,power:c.mark.more*(status.power??1),inst});
        }
      }
    }
    if(c.banner && now>=o.ready && members.length) {
      o.direction=dir;o.gatherUntil=now+c.banner.gatherTime;o.slots=new Map();
      const center={x:owner.pos.x+Math.cos(dir)*c.banner.standoff,y:owner.pos.y+Math.sin(dir)*c.banner.standoff};
      members.sort((a,b)=>a.id-b.id).forEach((a,i)=>{
        const offset=(i-(members.length-1)/2)*c.banner!.spacing;
        o.slots!.set(a.id,{x:center.x-Math.sin(dir)*offset,y:center.y+Math.cos(dir)*offset});
      });
    }
  }
  completed(a:Actor,inst:SkillInstance,aim:Vec2):void {
    if(!a.owner && inst.hostSkillId) {
      const host=a.skills.find(s=>s?.def.id===inst.hostSkillId);
      if(host && cohortOf(host)?.order.skill===inst.def.id){this.command(a,host,aim);return;}
    }
    const c=cohortOf(a.summonInst);
    if(!c||!a.cohortState)return;
    if(c.banner&&inst.def.id===c.challenge)this.payload(a,c.banner.skill,a.pos,'utility');
    if(inst.cohortCast?.role==='charge')a.cohortState.charging=true;
  }
  power(a:Actor,inst:SkillInstance,target:Actor):number {
    if(inst.cohortCast?.role!=='rending'||!a.owner||!a.summonInst)return 1;
    const spent=inst.cohortCast.warrant;
    if(spent)return spent.target===target.id?1+spent.power:1;
    const m=a.owner.cohortMarks.get(a.summonInst);
    return m?.target===target&&target.statuses.includes(m.status) ? 1+m.power : 1;
  }
  landed(a:Actor,inst:SkillInstance,target:Actor,damage:number):void {
    if(damage<=0||!a.owner||!a.summonInst||!a.cohortState)return;
    const c=cohortOf(a.summonInst);if(!c)return;
    if(inst.cohortCast?.role==='rending'&&!inst.cohortCast.warrant) {
      const m=a.owner.cohortMarks.get(a.summonInst);
      if(m?.target===target&&target.statuses.includes(m.status)) {
        inst.cohortCast.warrant={target:target.id,power:m.power};
        this.removeMark(target,a.owner,a.summonInst);a.owner.cohortMarks.delete(a.summonInst);
      }
    }
    if(c.pairs && c.approach?.lunge===inst.def.id && !inst.cohortCast?.paired && !target.dead) {
      const use=inst.cohortCast??(inst.cohortCast={role:'utility',origin:inst.def.id});use.paired=true;
      const partner=this.w.actorById(a.cohortState.partner??-1),s=partner?.cohortState;
      if(partner&&s&&!partner.dead&&a.cohortState.pairReady<=this.w.time&&s.pairReady<=this.w.time
        &&this.visible(partner,target)&&dist(partner.pos,a.pos)<=c.pairs.range) {
        a.cohortState.pairReady=s.pairReady=this.w.time+c.pairs.cooldown;
        s.pending={at:this.w.time+c.pairs.delay,target:target.id,until:this.w.time+c.pairs.timeout};
      }
    }
  }
  block(a:Actor,attacker:Actor):void {
    const c=cohortOf(a.summonInst),s=a.cohortState;
    if(c?.reprisal&&s&&this.w.time>=s.reprisalReady&&!a.dead) {
      const skill=this.skill(a,c.reprisal.skill);const recovery=skill?a.sheet.get('cooldownRecovery',skillContextTags(skill),instanceMods(skill)):1;
      s.reprisalReady=this.w.time+c.reprisal.cooldown/Math.max(.01,recovery);s.reprisalTarget=attacker.id;
    }
  }
  private armProtection():void {
    const teams=new Set([...this.bodies].filter(b=>!b.dead&&cohortOf(b.summonInst)?.intercept).map(b=>b.team));
    const living=new Set(teams.size?this.w.actors.filter(a=>!a.dead&&teams.has(a.team)):[]);
    for(const a of this.protected)if(!living.has(a)){a.lifeDamageInterceptors?.delete('cohort');this.protected.delete(a);}
    for(const a of living)if(!this.protected.has(a)) {
      a.lifeDamageInterceptors??=new Map();a.lifeDamageInterceptors.set('cohort',(amount,event)=>this.intercept(a,amount,event));this.protected.add(a);
    }
  }
  private intercept(victim:Actor,amount:number,event?:LifeWoundEvent):number {
    if(!event||event.packet.redirected||amount<=0||victim.dead)return amount;
    const candidates=[...this.bodies].filter(a=>{
      const c=cohortOf(a.summonInst);
      return a!==victim&&!a.dead&&!a.downed&&!a.isStunned()&&a.team===victim.team&&a.tier===victim.tier
        &&c?.intercept&&a.cohortState!.interceptCredit>0&&dist(a.pos,victim.pos)<=c.intercept.range
        &&this.w.lineOfSight(a.pos,victim.pos,a.tier,victim.tier);
    }).sort((a,b)=>{
      const direction=cohortOf(a.summonInst)!.intercept!.select==='lowestLifeFraction'?1:-1;
      return direction*(a.life/a.maxLife()-b.life/b.maxLife())||a.id-b.id;
    });
    const body=candidates[0];if(!body)return amount;
    const c=cohortOf(body.summonInst)!,s=body.cohortState!,spec=c.intercept!;
    const share=Math.min(amount*spec.fraction,s.interceptCredit);if(share<=0)return amount;
    s.interceptCredit-=share;
    const raw=Object.values(event.packet.amounts).reduce((n,v)=>n+(v??0),0);
    const packet:DamagePacket={...event.packet,redirected:true,amounts:Object.fromEntries(Object.entries(event.packet.amounts).map(([t,n])=>[t,(n??0)/Math.max(0.001,raw)*share]))};
    const result=applyHit(event.attacker,body,packet);
    if(result.blocked)this.block(body,event.attacker);
    if(c.relief)s.reliefBank=Math.min(body.maxLife()*c.relief.bank,s.reliefBank+share*c.relief.ratio);
    this.w.flashes.push({pos:{...body.pos},radius:body.radius+9,color:'#a7c4d3',life:0.18,maxLife:0.18});
    if(body.life<=0&&!body.dead)this.w.kill(body,false,event.attacker);
    return amount-share;
  }
  heal(a:Actor,inst:SkillInstance,target:Actor,requested:number):number {
    const budget=inst.cohortHeal;
    if(!budget||!a.owner)return requested;
    let rows=this.healing.get(a.owner);if(!rows){rows=new Map();this.healing.set(a.owner,rows);}
    let row=rows.get(target.id);
    if(!row||this.w.time-row.at>=1){row={at:this.w.time,used:0};rows.set(target.id,row);}
    const taken=target.sheet.get('healTaken'),ceiling=Math.min(target.lifeCeiling(),target.lifeSealAt??Infinity);
    if(taken<=0||ceiling<=target.life)return 0;
    const scale=requested/Math.max(.00001,budget.base);
    const allowed=Math.max(0,Math.min(requested,budget.remaining*scale,(ceiling-target.life)/taken,(target.maxLife()*budget.cap-row.used)/taken));
    row.used+=allowed*taken;budget.remaining-=allowed/Math.max(.00001,scale);return allowed;
  }
  /** Called after normal perception/taunt/order resolution, never with hidden target knowledge. */
  act(a:Actor,target:Actor|null,dt:number,move:(at:Vec2)=>void):boolean {
    const s=a.cohortState,c=cohortOf(a.summonInst),owner=a.owner,host=a.summonInst;
    if(!s||!c||!owner||!host)return false;
    if(a.casting||a.dash||a.isStunned()||a.downed)return true;
    const o=this.order(owner,host);
    const compelled = target && a.statuses.some(st => st.id==='taunted' && st.casterId===target!.id);
    if(!compelled&&s.pending && s.pending.at<=this.w.time && s.pending.until>this.w.time)return true;
    if(!compelled && o.gatherUntil!==undefined&&o.slots?.has(a.id)){move(o.slots.get(a.id)!);return true;}
    if(!compelled&&o.target!==undefined&&o.until>this.w.time) {
      const marked=this.w.actorById(o.target);if(marked&&this.visible(a,marked))target=marked;
    }
    if(!compelled&&c.order.mode==='rally'&&o.point&&o.until>this.w.time&&dist(owner.pos,o.point)<=c.order.range*1.5
      &&(!target||dist(target.pos,o.point)>c.order.guardRadius)){move(o.point);return true;}
    if(!target && o.point && o.until>this.w.time) { move(o.point); return true; }
    if(!target)return false;
    if(!compelled && o.until<=this.w.time && dist(owner.pos,target.pos)>c.order.range)return false;
    if(!this.visible(a,target))return false;
    const d=dist(a.pos,target.pos),toward=angleTo(a.pos,target.pos),rear=Math.abs(angleDiff(target.facing,angleTo(target.pos,a.pos)));
    a.facing+=Math.max(-a.turnSpeed*dt,Math.min(a.turnSpeed*dt,angleDiff(a.facing,toward)));
    const assassin=c.assassin;
    if(assassin) {
      if(s.flankTime>=assassin.patience){s.flankTime=0;s.flankReady=this.w.time+assassin.repositionEvery;}
      const cloak=this.skill(a,assassin.cloak);
      if(a.life/a.maxLife()<assassin.retreatAt&&this.ready(a,cloak)&&a.canUse(cloak)) {
        if(this.w.useSkill(a,cloak,a.pos))s.retreatUntil=this.w.time+assassin.retreatTime;
      }
      if(s.retreatUntil>this.w.time&&a.life/a.maxLife()<assassin.recoveryAt){
        const away=angleTo(target.pos,a.pos),escape={x:a.pos.x+Math.cos(away)*assassin.retreatDistance,y:a.pos.y+Math.sin(away)*assassin.retreatDistance};
        move(dist(owner.pos,target.pos)>d+assassin.retreatDistance?owner.pos:escape);return true;
      }
      const backstab=this.skill(a,assassin.backstab);
      if(rear>=assassin.rearAngle&&d<=assassin.reach&&this.ready(a,backstab)&&a.canUse(backstab)) {
        if(this.w.useSkill(a,backstab,target.pos)){s.flankTime=0;s.flankReady=this.w.time+assassin.repositionEvery;return true;}
      }
      if(rear<assassin.rearAngle&&d<assassin.flankRange&&this.w.time>=s.flankReady&&s.flankTime<assassin.patience) {
        const flank={x:target.pos.x-Math.cos(target.facing)*assassin.flank,y:target.pos.y-Math.sin(target.facing)*assassin.flank};
        if(this.w.lineOfSight(flank,target.pos,a.tier,target.tier)) {
          if(this.ready(a,cloak)&&a.canUse(cloak))this.w.useSkill(a,cloak,a.pos);
          s.flankTime+=dt;move(flank);return true;
        }
      }
    }
    const approach=c.approach;
    if(approach&&d>approach.minRange) {
      const lunge=this.skill(a,approach.lunge);
      if(d<=approach.range&&this.ready(a,lunge)&&a.canUse(lunge)&&this.w.useSkill(a,lunge,target.pos))return true;
      const ranged=this.skill(a,approach.ranged);
      if(d<=approach.range&&this.ready(a,ranged)&&a.canUse(ranged))this.w.useSkill(a,ranged,target.pos);
    }
    // School signatures are ordinary independently supported AI arts.
    for(const sk of a.skills)if(sk&&sk.def.id!==c.primary&&this.ready(a,sk)&&a.canUse(sk)) {
      const hint=sk.def.ai;const range=(hint?.range??0)*(hint?.rangeStat?a.sheet.get(hint.rangeStat,skillContextTags(sk),instanceMods(sk)):1);
      if(d<=range&&this.w.useSkill(a,sk,target.pos))return true;
    }
    const primary=this.skill(a,c.primary),pd=primary?instanceDelivery(this.view(a,primary)):undefined;
    const reach=primary&&pd?.type==='melee'?(a.radius+pd.range)*a.sheet.get('meleeReach',skillContextTags(primary),instanceMods(primary)):a.radius;
    if(d<=reach+target.radius*0.5) {
      if(primary&&a.canUse(this.view(a,primary))&&this.w.useSkill(a,primary,target.pos)){s.flankTime=0;return true;}
      return true;
    }
    move(target.pos);return true;
  }
  update(dt:number):void {
    for(const a of [...this.bodies]) {
      if(a.dead||!a.owner||a.owner.dead||!a.summonInst||!cohortOf(a.summonInst)) {this.bodies.delete(a);continue;}
      const c=cohortOf(a.summonInst)!,s=a.cohortState!;
      if(c.intercept)s.interceptCredit=Math.min(a.maxLife()*c.intercept.budget,s.interceptCredit+dt*a.maxLife()*c.intercept.budget/c.intercept.recovery);
      const siblings=this.members(a.owner,a.summonInst).sort((x,y)=>x.id-y.id);
      if(c.pairs){const i=siblings.indexOf(a);s.partner=siblings[i%2?i-1:i+1]?.id;}
      if(c.links) {
        const n=Math.min(c.links.neighbors,siblings.filter(b=>b!==a&&b.tier===a.tier&&dist(b.pos,a.pos)<=c.links!.radius&&this.w.lineOfSight(a.pos,b.pos,a.tier,b.tier)).length);
        a.sheet.setSource('cohort:links',[mod('blockChance','flat',n*c.links.block),mod('poise','increased',n*c.links.poise)]);
        const skill=this.skill(a,c.links.contact);
        if(this.ready(a,skill)&&this.w.time>=s.contactAt) {
          const d=instanceDelivery(skill),tags=skillContextTags(skill),mods=instanceMods(skill);
          if(d.type==='nova') {
            const radius=d.radius*a.sheet.get('aoeRadius',tags,mods),shape=a.sheet.get('aoeShape',tags,mods);
            if(this.w.lite.liveCount)this.w.litePromoteNearest(a.pos,{within:radius*2,max:c.links.promote,opposing:a.team,story:a.tier});
            if(this.w.enemiesOf(a).some(e=>!e.dead&&!e.untargetable&&e.tier===a.tier&&inAoe(a.pos,radius,shape,a.facing,e.pos,e.radius)
              &&this.w.lineOfSight(a.pos,e.pos,a.tier,e.tier))) {
              s.contactAt=this.w.time+c.links.interval;this.payload(a,c.links.contact,a.pos,'contact');
            }
          }
        }
      }
      if(s.reprisalTarget!==undefined&&!a.casting&&!a.dash&&c.reprisal) {
        const target=this.w.actorById(s.reprisalTarget),base=this.skill(a,c.reprisal.skill);
        if(target&&this.visible(a,target)&&dist(a.pos,target.pos)<=c.reprisal.range&&this.ready(a,base)) {
          a.facing=angleTo(a.pos,target.pos);
          this.payload(a,c.reprisal.skill,target.pos,'reprisal',{extraMods:[...(base.extraMods??[]),mod('addedPhysical','flat',a.sheet.get('thorns')*c.reprisal.thorns)]});
          s.reprisalTarget=undefined;
        }else if(!target||target.dead)s.reprisalTarget=undefined;
      }
      if(s.pending&&c.pairs) {
        const target=this.w.actorById(s.pending.target),skill=this.skill(a,c.pairs.skill);
        const taunter=a.statuses.find(st=>st.id==='taunted'&&st.casterId!==target?.id)?.casterId;
        if(this.w.time>=s.pending.until||!target||!this.visible(a,target)||taunter!==undefined)s.pending=undefined;
        else if(s.pending.at<=this.w.time&&!a.casting&&!a.dash&&this.ready(a,skill)&&a.canUse(skill)) {
          if(this.w.useSkill(a,{...skill,cohortCast:{role:'pincer',origin:skill.def.id,paired:true}},target.pos))s.pending=undefined;
        }
      }
      if(s.charging&&!a.dash&&c.banner){s.charging=false;this.payload(a,c.banner.skill,a.pos,'utility');}
      if(c.relief&&s.reliefBank>0&&this.w.time>=s.reliefAt) {
        s.reliefAt=this.w.time+c.relief.interval;
        const base=this.skill(a,c.relief.pulse);
        if(this.ready(a,base)) {
          const bank=s.reliefBank;s.reliefBank=0;
          this.payload(a,c.relief.pulse,a.pos,'utility',{def:{...base.def,effects:[{type:'heal',amount:bank}]},cohortHeal:{remaining:bank,base:bank,cap:c.relief.recipientCap}});
        }
      }
    }
    if(this.bodies.size||this.protected.size)this.armProtection();
    for(const [owner,rows] of this.orders)for(const [host,o] of rows) {
      if(owner.dead||!owner.skills.includes(host)){this.clear(owner,host);continue;}
      const c=cohortOf(host),members=this.members(owner,host);if(!c)continue;
      if(o.gatherUntil!==undefined) {
        const ready=members.filter(a=>o.slots?.has(a.id));
        const gathered=ready.length>0&&ready.every(a=>{const sk=this.skill(a,c.banner!.charge);return !a.casting&&!a.dash&&this.ready(a,sk)&&a.canUse(sk)&&dist(a.pos,o.slots!.get(a.id)!)<=c.banner!.gatherRadius;});
        if(gathered||this.w.time>=o.gatherUntil) {
          if(gathered&&o.direction!==undefined&&c.banner) {
            o.ready=this.w.time+Math.max(...ready.map(a=>{const sk=this.skill(a,c.banner!.charge);return c.banner!.cooldown/Math.max(.01,sk?a.sheet.get('cooldownRecovery',skillContextTags(sk),instanceMods(sk)):1);}));
            for(const a of ready) {
              const sk=this.skill(a,c.banner.charge);
              if(!this.ready(a,sk)||!a.canUse(sk))continue;
              const aim={x:a.pos.x+Math.cos(o.direction)*c.order.range,y:a.pos.y+Math.sin(o.direction)*c.order.range};
              a.facing=o.direction;
              this.w.useSkill(a,{...sk,cohortCast:{role:'charge',origin:sk.def.id}},aim);
            }
          }
          o.gatherUntil=undefined;o.slots=undefined;
        }
      }
      const m=owner.cohortMarks.get(host);
      if(m)m.remaining=m.status.remaining;
      if(m&&(m.target.dead||!m.target.statuses.includes(m.status))){this.removeMark(m.target,owner,host);owner.cohortMarks.delete(host);}
    }
    for(const [owner,rows] of this.healing){for(const [id,row]of rows)if(this.w.time-row.at>1)rows.delete(id);if(owner.dead||!rows.size)this.healing.delete(owner);}
  }
  death(a:Actor,silent:boolean,expired:boolean):void {
    const c=cohortOf(a.summonInst);
    if(silent||expired||a.summonOffspring||!a.owner||a.owner.dead||!c?.legacy)return;
    const heir=this.heir(a,c.legacy);
    if(heir)heir.spectralVeil={color:c.legacy.color,alpha:c.legacy.alpha};
  }
  private removeMark(target:Actor,owner:Actor,host:SkillInstance):void {
    const mark=owner.cohortMarks.get(host);if(mark)target.statuses=target.statuses.filter(s=>s!==mark.status);
  }
  leaveZone():void {
    for(const [owner,rows] of this.orders)for(const [host,o]of rows){o.point=undefined;o.target=undefined;o.slots=undefined;o.gatherUntil=undefined;const m=owner.cohortMarks.get(host);if(m)this.removeMark(m.target,owner,host);owner.cohortMarks.delete(host);}
    for(const a of this.bodies)if(a.cohortState){a.cohortState.pending=undefined;a.cohortState.contactAt=0;}
  }
  clear(owner:Actor,host:SkillInstance):void {
    this.orders.get(owner)?.delete(host);
    const m=owner.cohortMarks.get(host);if(m)this.removeMark(m.target,owner,host);owner.cohortMarks.delete(host);
    for(const a of [...this.bodies])if(a.owner===owner&&a.summonInst===host){
      this.bodies.delete(a);a.cohortState=undefined;if(!a.dead)this.w.kill(a,true);
    }
    this.armProtection();
  }
}
