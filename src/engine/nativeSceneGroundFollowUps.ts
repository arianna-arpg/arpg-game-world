import {observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';
import type {Actor as NativeRecordActor} from './actor';
import type {SkillInstance as NativeRecordSkill} from './skills';
/** Native ground/follow-up construction; no ticking or combat execution. */
import type {World,MaddenBank,AoeShape} from './world';
import type {Actor} from './actor';
import {chance,rand,vec,type Vec2} from '../core/math';
import type {Modifier,SkillTag} from './stats';
import {grantedTags,hostSockets,instanceCascadePlan,instanceDelivery,instanceFollowUps,instanceMods,instancePulsePlan,instanceSizeOver,resolveSizeOver,skillContextTags,socketSpec,type GroundCascadeSpec,type GroundPulseSpec,type DropZoneSpec,type SkillInstance} from './skills';
import {SKILLS} from '../data/skills';
import {skillBurstVoice} from '../data/skillVisuals';
import {skillStrikeVoice} from '../data/skillStrikeVisuals';
import {skillMovementVoice} from '../data/skillMovementVisuals';
import {skillPresenceVoice} from '../data/skillPresenceVisuals';
import type {NativeSceneCastingPreparationApi} from './nativeSceneCastingPreparation';
type Zone=World['zones'][number];
export interface NativeSceneGroundFollowUpsApi {
maddenBankOf(inst: SkillInstance): MaddenBank | undefined;
mintAftermath(
    caster: Actor, inst: SkillInstance, at: Vec2, radius: number,
    shape: AoeShape, facing: number, useMult: number,
    tags: Set<SkillTag>, extra: Modifier[], arcRad?: number, edgeFrac?: number,
    walkFacing?: number, tier?: number,
  ): void;
dropLingerField(caster: Actor, inst: SkillInstance, at: Vec2, useMult?:number): void;
mintTrailPatch(
    a: Actor, inst: SkillInstance, spec: DropZoneSpec, at: Vec2,
    facing: number, linger?: number,
  ): void;
statTrailSpec(mt: number): DropZoneSpec;
queueFollowUps(caster: Actor, host: SkillInstance, aim: Vec2, chargesSpent: number): void;
}
export interface NativeSceneGroundFollowUpsHost extends Pick<NativeSceneGroundFollowUpsApi,'maddenBankOf'> {
 readonly time:World['time'];
 readonly zones:World['zones'];
 readonly pendingFollowUps:World['pendingFollowUps'];
 readonly maddenBanks:WeakMap<SkillInstance,MaddenBank>;
 readonly mintMetaInstance:NativeSceneCastingPreparationApi['mintMetaInstance'];
}

export function flattenPulseQueue(
  appended: GroundPulseSpec[], cadence: number | undefined,
): { delay: number; dmgMult: number; radiusMult: number }[] {
  const queue: { delay: number; dmgMult: number; radiusMult: number }[] = [];
  for (const g of appended) {
    const gStep = cadence ?? g.intervalStep ?? 1;
    let gDelay = g.delay;
    let gDmg = g.dmgMult ?? 1;
    let gRad = g.radiusMult ?? 1;
    for (let k = 0; k < Math.max(1, g.count ?? 1); k++) {
      queue.push({ delay: Math.max(0.05, gDelay), dmgMult: gDmg, radiusMult: gRad });
      gDelay = Math.max(0.05, (g.interval ?? g.delay) * Math.pow(gStep, k));
      gDmg *= g.dmgStep ?? 1;
      gRad *= g.radiusStep ?? 1;
    }
  }
  return queue;
}

export function sceneMaddenBankOf(nativeHost:NativeSceneGroundFollowUpsHost,inst: SkillInstance): MaddenBank | undefined {
    const spec = socketSpec(inst, 'madden');
    if (!spec) return undefined;
    let bank = nativeHost.maddenBanks.get(inst);
    if (!bank || bank.after !== spec.after) {
      bank = { after: spec.after, dwell: new Map<number, number>(), credited: new Map<number, number>() };
      nativeHost.maddenBanks.set(inst, bank);
    }
    return bank;
  }

export function sceneMintAftermath(nativeHost:NativeSceneGroundFollowUpsHost,caster: Actor,inst: SkillInstance,at: Vec2,radius: number,shape: AoeShape,facing: number,useMult: number,tags: Set<SkillTag>,extra: Modifier[],arcRad?: number,edgeFrac?: number,walkFacing?: number, tier = caster.tier): void {
    const burstDelivery = instanceDelivery(inst);
    const burstVoice = burstDelivery.type === 'nova'
      ? burstDelivery.fx ?? skillBurstVoice(inst.def.id)
      : burstDelivery.type === 'melee' ? burstDelivery.fx ?? skillStrikeVoice(inst.def.id)
      : burstDelivery.type === 'cone' ? skillStrikeVoice(inst.def.id)
      : burstDelivery.type === 'leap' ? skillMovementVoice(inst.def.id, 'impact')
      : burstDelivery.type === 'storm' ? skillPresenceVoice(inst.def.id, 'pulse') ?? burstDelivery.fx : undefined;
    const cadence = socketSpec(inst, 'cadence')?.intervalStep;
    const pPlan = instancePulsePlan(inst);
    const pSpec = pPlan.native;
    const pulseN = Math.max(0, (pSpec ? (pSpec.count ?? 1) : 0)
      + Math.round(caster.sheet.get('pulseCount', tags, extra)));
    const pDelay = pSpec?.delay ?? 1;
    const pInterval = pSpec?.interval ?? pDelay;
    const pStep = cadence ?? pSpec?.intervalStep ?? 1;
    const pQueue = flattenPulseQueue(pPlan.appended, cadence);
    // The armed charge's whole life is the geometric beat walk + a breath.
    let pulseSpan = 0;
    if (pulseN > 0) {
      pulseSpan = pDelay + 0.1;
      let gap = pInterval;
      for (let k = 1; k < pulseN; k++) { pulseSpan += gap; gap = Math.max(0.05, gap * pStep); }
      for (const q of pQueue) pulseSpan += q.delay;
    }
    const pulseFor = (extraDelay: number): Zone['pulse'] => pulseN > 0
      ? {
        delay: pDelay, interval: pInterval, intervalStep: pStep,
        dmgMult: pSpec?.dmgMult ?? 1, dmgStep: pSpec?.dmgStep ?? 1,
        radiusMult: pSpec?.radiusMult ?? 1, radiusStep: pSpec?.radiusStep ?? 1,
        left: pulseN, next: nativeHost.time + extraDelay + pDelay,
        queue: pQueue.length ? [...pQueue] : undefined,
      } : undefined;
    if (pulseN > 0) {
      {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier,
        pos: vec(at.x, at.y), radius, caster:(nativeSource=caster), inst:(nativeInstance=inst), color: inst.def.color,
        delay: 0, exploded: true,
        linger: pulseSpan, linger0: pulseSpan,
        tickInterval: Infinity, tickTimer: Infinity,
        shape, facing, arcRad, edgeFrac,
        fx: burstVoice,
        dmgMult: useMult, depth: 0,
        pulse: pulseFor(0),
      });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
    }
    const plan = instanceCascadePlan(inst, 'forward');
    const nativeCount = (plan.native?.count ?? 0)
      + Math.round(caster.sheet.get('aoeCascade', tags, extra));
    const stepScale = caster.sheet.get('cascadeStep', tags, extra);
    // 'forward' default (unlike ground's 'axis'): an instantaneous
    // strike has an honest facing, and the marching quake is the read.
    // The walk marches the CAST bearing (walkFacing) — an inverted
    // sigil's shape faces home, but the quake still strides away.
    const walkF = walkFacing ?? facing;
    const walkPoints = (
      spec: GroundCascadeSpec | undefined, count: number, from: Vec2,
    ): { x: number; y: number; beatAt: number; k: number }[] => {
      const pts: { x: number; y: number; beatAt: number; k: number }[] = [];
      if (count <= 0) return pts;
      const dir = spec?.dir ?? 'forward';
      const stepLen = (spec?.step ?? radius * 1.4) * stepScale;
      const beatStep = cadence ?? spec?.intervalStep ?? 1;
      let beatAt = 0;
      let beatGap = spec?.interval ?? 0;
      for (let k = 1; k <= count; k++) {
        beatAt += beatGap;
        beatGap = Math.max(0.02, beatGap * beatStep);
        if (dir === 'random') {
          const ra = rand(0, Math.PI * 2);
          const rd = stepLen * rand(0.5, 1.5);
          pts.push({ x: from.x + Math.cos(ra) * rd, y: from.y + Math.sin(ra) * rd, beatAt, k });
        } else {
          const sign = dir === 'backward' ? -1 : dir === 'axis' ? (k % 2 === 1 ? 1 : -1) : 1;
          const reach = dir === 'axis' ? Math.ceil(k / 2) * stepLen : k * stepLen;
          pts.push({
            x: from.x + Math.cos(walkF) * reach * sign,
            y: from.y + Math.sin(walkF) * reach * sign, beatAt, k,
          });
        }
      }
      return pts;
    };
    // THE NATIVE MARCH: strike-echo beats along the walk (shape-true —
    // sigil, sector, edge band all ride).
    const mintMarch = (from: Vec2, baseMult: number, delayBase: number): void => {
      const spec = plan.native;
      const scaleStep = spec?.scaleStep ?? 1;
      const dmgStep = spec?.dmgStep ?? 0.75;
      for (const p of walkPoints(spec, nativeCount, from)) {
        {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier,
          pos: vec(p.x, p.y), radius: radius * Math.pow(scaleStep, p.k),
          caster:(nativeSource=caster), inst:(nativeInstance=inst), color: inst.def.color,
          delay: delayBase + p.beatAt, exploded: false,
          linger: 0, linger0: 0,
          tickInterval: Infinity, tickTimer: 0,
          shape, facing, arcRad, edgeFrac,
          fx: burstVoice,
          dmgMult: baseMult * Math.pow(dmgStep, p.k), depth: 0,
        });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
      }
    };
    mintMarch(at, useMult, 0.12);
    // THE RE-CAST LANE: each different-direction gem's points re-strike
    // the delivery's true surface — armed pulse aboard, native march
    // walking on — never other grafts.
    for (const r of plan.recasts) {
      const rDmgStep = r.dmgStep ?? 0.75;
      const rScaleStep = r.scaleStep ?? 1;
      for (const p of walkPoints(r, r.count, at)) {
        const mult = useMult * Math.pow(rDmgStep, p.k);
        const delayBase = 0.12 + p.beatAt;
        const quakes = pulseN > 0;
        {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier,
          pos: vec(p.x, p.y), radius: radius * Math.pow(rScaleStep, p.k),
          caster:(nativeSource=caster), inst:(nativeInstance=inst), color: inst.def.color,
          delay: delayBase, exploded: false,
          linger: quakes ? pulseSpan : 0, linger0: quakes ? pulseSpan : 0,
          tickInterval: Infinity, tickTimer: quakes ? Infinity : 0,
          shape, facing, arcRad, edgeFrac,
          fx: burstVoice,
          dmgMult: mult, depth: 0,
          pulse: pulseFor(delayBase),
        });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
        mintMarch(vec(p.x, p.y), mult, delayBase);
      }
    }
  }

export function sceneDropLingerField(nativeHost:NativeSceneGroundFollowUpsHost,caster: Actor,inst: SkillInstance,at: Vec2,useMult = 1): void {
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const fieldSecs = caster.sheet.get('lingerField', tags, extra);
    const healField = socketSpec(inst, 'healField');
    if (fieldSecs <= 0 && !healField) return;
    const zoneEmit = socketSpec(inst, 'zoneEmit');
    // THE HONEST LIFT (2026-07-22, the standing-surface law): the granted
    // field carries the time-evolution payloads exactly like a native
    // ground mint — the 'surface' gate admits Tidal Ground beside No Man's
    // Land only because the lifted field genuinely BREATHES (and spins,
    // grows, swings). A gate that admits what cannot ride is a lie.
    const sizeOver = resolveSizeOver(instanceSizeOver(inst));
    const grow = socketSpec(inst, 'zoneGrow');
    const rotate = caster.sheet.get('aoeSpin', tags, extra, 0);
    const pend = hostSockets(inst).find(s => s.def.pendulum)?.def.pendulum;
    const radius = 80 * caster.sheet.get('aoeRadius', tags, extra);
    const linger = Math.max(fieldSecs, healField ? 4 : 0)
      * caster.sheet.get('effectDuration', tags, extra);
    {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={ tier: caster.tier,
      pos: vec(at.x, at.y),
      radius,
      caster:(nativeSource=caster), inst:(nativeInstance=inst), color: healField ? '#8ae0a8' : inst.def.color,
      delay: 0, exploded: true,
      linger,
      tickInterval: 0.5, tickTimer: 0.5,
      shape: caster.sheet.get('aoeShape', tags, extra),
      facing: caster.facing,
      // HEALING GROUND (healField graft): the field mends instead of burns
      // — warcries and slams drop consecrations (the cleric's echo).
      healTick: healField?.amount,
      dmgMult: healField ? 0 : 0.4 * useMult, depth: 1,
      forceDamage: !healField,
      emit: zoneEmit ? { skillId: zoneEmit.skillId, interval: zoneEmit.interval, at: zoneEmit.at } : undefined,
      madden: nativeHost.maddenBankOf(inst),
      sizeOver,
      radius0: sizeOver ? radius : undefined,
      linger0: sizeOver ? linger : undefined,
      grow,
      rotate: rotate !== 0 ? rotate : undefined,
      pendulum: pend
        ? { arc: pend.arcDeg * Math.PI / 180, period: pend.period, base: caster.facing }
        : undefined,
    });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
  }

export function sceneMintTrailPatch(nativeHost:NativeSceneGroundFollowUpsHost,a: Actor,inst: SkillInstance,spec: DropZoneSpec,at: Vec2,facing: number,linger?: number): void {
    const dso = resolveSizeOver(spec.sizeOver);
    const hold = linger ?? spec.duration;
    {
 let nativeQueue:typeof nativeHost.zones;let nativeRecord:(typeof nativeHost.zones)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'zones',nativeHost.zones)).push(nativeRecord={
      pos: vec(at.x, at.y), radius: spec.radius * (dso?.from ?? 1),
      tier: a.tier, // Trail patches retain their emission story when the caster changes floors.
      caster:(nativeSource=a), inst:(nativeInstance=inst), color: inst.def.color,
      delay: 0, exploded: true,
      linger: hold, linger0: hold,
      tickInterval: spec.tickInterval ?? 0.4, tickTimer: 0.2,
      shape: 0, facing,
      dmgMult: spec.damageScale ?? 0.5, depth: 1,
      sizeOver: dso,
      radius0: dso ? spec.radius : undefined,
    });
 observeNativeCombatRecord(nativeHost,'zones',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
  }

export function sceneStatTrailSpec(nativeHost:NativeSceneGroundFollowUpsHost,mt: number): DropZoneSpec {
    return { radius: 32, duration: 2.2, tickInterval: 0.4, damageScale: mt };
  }

export function sceneQueueFollowUps(nativeHost:NativeSceneGroundFollowUpsHost,caster: Actor,host: SkillInstance,aim: Vec2,chargesSpent: number): void {
    for (const fu of instanceFollowUps(host)) {
      if (!SKILLS[fu.skillId] || (fu.chance !== undefined && !chance(fu.chance))) continue;
      let payload = nativeHost.mintMetaInstance(caster, host, fu.skillId);
      if (host.sequenceHost) {
        // Component follow-throughs stay attributable to the paid skill for
        // respec/death cleanup, without becoming another authored component.
        payload = { ...payload, sequenceHost: host.sequenceHost, sequenceRole: 'payload',
          followUpHost: host.sequenceHost, procChainDepth: Math.max(1, (host.procChainDepth ?? 0) + 1) };
      }
      if (host.def.tags.includes('flask')) {
        // Snapshot this drink's investment, once. No sockets/clock/trigger cargo
        // boards the child. Generated hits cannot shed orbs or retap hit fuel.
        payload = { ...payload, extraMods: instanceMods(host), followUpHost: host, procChainDepth: 1 };
      }
      {
 let nativeQueue:typeof nativeHost.pendingFollowUps;let nativeRecord:(typeof nativeHost.pendingFollowUps)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;
 (nativeQueue=observeNativeCombatStorage(nativeHost,'pendingFollowUps',nativeHost.pendingFollowUps)).push(nativeRecord={ caster:(nativeSource=caster), inst:(nativeInstance=payload), aim: vec(aim.x, aim.y),
        timer: fu.delay ?? 0.35, dmgMult: fu.perCharge ? Math.max(1, chargesSpent) : 1 });
 observeNativeCombatRecord(nativeHost,'pendingFollowUps',nativeQueue,nativeRecord,nativeSource,nativeInstance);
}
    }
  }
