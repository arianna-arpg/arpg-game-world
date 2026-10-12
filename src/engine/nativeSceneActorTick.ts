/** Exact original42 complete local-frame ActorTick closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {NativeSceneFrameHost} from "./nativeSceneFrameHost";
import { PUSH_DAMPING } from './nativeSceneDisplacement';
import { movementProfile, MOVEMENT_VISUAL_STYLE } from '../data/skillMovementVisuals';
import { extendMovementTrail } from './skillMovementVisual';
import { cosmeticSkillPaint } from '../meta/cosmetics';
import { chance, dist, rand, vec, type Vec2 } from '../core/math';
import { type DamageType, type Modifier } from './stats';
import { Actor, type GainEvent } from './actor';
import { applyDot, mitigateTyped } from './damage';
import { MASS_CFG, impactFrac, impactScale } from './mass';
import { isDormant } from './ai';
import { grantedTags, instanceChargeGain, instanceMods, makeSkillInstance, skillContextTags, type SkillInstance } from './skills';
import { SKILLS } from '../data/skills';
import { PROC_LIST, PROCS } from '../data/procs';
import { DERIVED_GAUGES, GAUGE_CFG } from './gauges';
import { DAMAGE_COLOR } from './stats';
import { sameStory, tierFloorAt } from './tiers';
import { gatherSympathyRecipients, SYMPATHY_CFG, SYMPATHY_LINKS, sympathyRelationOf, sympathyStat } from './sympathy';
import { CHARGE_DEFS } from './charges';
import { TRAIL_GRANTS, POCKET_GRANTS, pocketGrantStat, trailGrantStat, placeGrantedPockets, POCKET_GRANT_IDS, TRAIL_GRANT_IDS, type GrantedPocket } from './fieldgrants';
import { ORB_DEFS } from '../data/orbs';
import {procIndex} from "./nativeSceneCombatResolution";
export function sceneSyncPocketGrants(nativeHost:NativeSceneFrameHost, a: Actor): void {
    const armed = a.sheet.armedFamily('pocketGrant_', POCKET_GRANT_IDS);
    if (!armed.length && !a.pocketGrantSignature) return;
    const mods: Modifier[] = [];
    const states: string[] = [];
    let pockets: GrantedPocket[] | undefined;
    for (const id of armed) {
      const def = POCKET_GRANTS[id];
      if (a.sheet.get(pocketGrantStat(def.id)) <= 0) continue;
      pockets ??= nativeHost.grantedPocketsFor(a);
      const natural = a.tier === 0 && nativeHost.walk?.regionAt?.(a.pos.x, a.pos.y) === def.regionId;
      const inside = !a.leap && !a.flying && (natural || nativeHost.insideGrantedPocket(a, def.id, pockets));
      states.push(`${def.id}:${inside ? 1 : 0}`);
      mods.push(...(inside ? def.inside : def.outside));
    }
    const signature = states.join('|');
    if ((a.pocketGrantSignature ?? '') === signature) return;
    a.pocketGrantSignature = signature || undefined;
    if (mods.length) a.sheet.setSource('pocket-grants', mods);
    else a.sheet.removeSource('pocket-grants');
  }

export function sceneUpdateGrantedTrails(nativeHost:NativeSceneFrameHost, a: Actor): void {
    let memory = nativeHost.grantedTrailMemory.get(a.id);
    if (!memory && !a.sheet.armedFamily('trailGrant_', TRAIL_GRANT_IDS).length) return;
    for (const def of Object.values(TRAIL_GRANTS)) {
      const power = a.sheet.get(trailGrantStat(def.id));
      const skill = SKILLS[def.skillId];
      if (power <= 0 || !skill || a.untargetable) { memory?.delete(def.id); continue; }
      if (!memory) nativeHost.grantedTrailMemory.set(a.id, memory = new Map());
      let trail = memory.get(def.id);
      if (!trail || trail.tier !== a.tier) {
        trail = { x: a.pos.x, y: a.pos.y, tier: a.tier, odo: 0, inst: makeSkillInstance(skill, Math.max(1, a.level)) };
        memory.set(def.id, trail);
        continue;
      }
      trail.inst.level = Math.max(1, a.level);
      trail.odo += Math.hypot(a.pos.x - trail.x, a.pos.y - trail.y);
      trail.x = a.pos.x; trail.y = a.pos.y;
      if (trail.odo < def.everyDist) continue;
      trail.odo = 0;
      if (nativeHost.zones.filter(z => {
const nativeRecordScope=nativeHost.beginCombatRecord("zones", z);
try {return z.caster === a && z.inst.def.id === def.skillId;
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}).length >= def.maxPatches) continue;
      nativeHost.mintTrailPatch(a, trail.inst, { ...def.patch,
        radius: def.patch.radius * a.sheet.get('aoeRadius', skillContextTags(skill)),
        damageScale: (def.patch.damageScale ?? 1) * power }, a.pos, a.facing);
    }
    if (memory && !memory.size) nativeHost.grantedTrailMemory.delete(a.id);
  }

export function sceneMetaProgressionActive(nativeHost:NativeSceneFrameHost): boolean { return nativeHost.modeStageDef().metaProgression; }

export function sceneApplyDeedDot(nativeHost:NativeSceneFrameHost, target: Actor, amount: number, type: DamageType | 'untyped'): void {
    const before = target.life;
    applyDot(target, amount, type === 'untyped' ? undefined : type);
    const share = Math.min(1, (nativeHost.deedDotAmounts?.[type] ?? 0) / amount);
    const value = Math.max(0, before - Math.max(0, target.life)) * share;
    if (value > 0) nativeHost.recordDeed({ kind: 'indirect', value });
  }

export function sceneSweepTalentEvents(nativeHost:NativeSceneFrameHost, a: Actor): void {
    if (a.dead) {
      if (a.condRose.length) a.condRose.length = 0;
      a.healedSince = 0;
      a.gasped = false;
      return;
    }
    if (a.condRose.length) {
      const rose = a.condRose;
      a.condRose = [];
      for (const c of rose) nativeHost.rollOwnProcs(a, 'condition', { condition: c });
    }
    if (a.healedSince > 0) {
      a.healedSince = 0;
      nativeHost.rollOwnProcs(a, 'heal');
    }
    if (a.gasped) {
      a.gasped = false;
      nativeHost.showCombatOutcome(a, 'last_gasp');
      nativeHost.rollOwnProcs(a, 'lastGasp');
    }
    // PULSE BEATS — only the pulse procs this sheet arms (the armed-list
    // derivation is cached per source generation; an uninvested body pays
    // one cached lookup).
    const pulses = procIndex().byTrigger['pulse'];
    if (pulses?.size) {
      for (const id of a.sheet.armedFamily('proc_', procIndex().all)) {
        if (!pulses.has(id)) continue;
        const proc = PROCS[id];
        const every = proc.every ?? 0;
        if (every <= 0) continue;
        const due = a.procReadyAt.get(proc.id) ?? 0;
        if (nativeHost.time < due) continue;
        a.procReadyAt.set(proc.id, nativeHost.time + every);
        if (!nativeHost.procGates(a, proc, null)) continue;
        const c = nativeHost.procChance(a, proc, 0);
        if (c <= 0 || !chance(c)) continue;
        nativeHost.executeProc(proc, a, null, null, 0);
      }
    }
    // DERIVED GAUGES — cadenced, referenced-only.
    if (a.gaugeSampleIn <= 0) {
      a.gaugeSampleIn = GAUGE_CFG.cadence;
      let map = a.derivedGauges;
      for (const id in DERIVED_GAUGES) {
        if (!a.gaugeReferenced(id)) {
          if (map?.has(id)) map.delete(id);
          continue;
        }
        const v = Math.max(0, Math.round(DERIVED_GAUGES[id].sample(a, nativeHost)));
        (map ??= (a.derivedGauges = new Map())).set(id, v);
      }
    }
  }

export function sceneRollGainProcs(nativeHost:NativeSceneFrameHost, owner: Actor, ev: GainEvent): void {
    if (owner.dead || ev.depth >= nativeHost.procDepthAllowed(owner)) return;
    // restore/heal gains feed the sympathy fabric only — no proc trigger
    // listens to them (yet; a 'healGain' trigger would slot in here).
    if (ev.kind !== 'charge' && ev.kind !== 'buff' && ev.kind !== 'orb') return;
    const want = ev.kind === 'charge' ? 'chargeGain'
      : ev.kind === 'buff' ? 'buffGain' : 'orbPickup';
    for (const proc of PROC_LIST) {
      if (proc.trigger !== want) continue;
      const filter = ev.kind === 'charge' ? proc.charge
        : ev.kind === 'buff' ? proc.buff : proc.orb;
      if (filter !== undefined) {
        const list = Array.isArray(filter) ? filter : [filter];
        if (!list.includes(ev.id)) continue;
      }
      if (!nativeHost.procGates(owner, proc, null)) continue;
      const c = nativeHost.procChance(owner, proc, ev.depth);
      if (c <= 0 || !chance(c)) continue;
      if (!nativeHost.procReady(owner, proc)) continue;
      nativeHost.executeProc(proc, owner, null, null, ev.depth);
    }
  }

export function sceneEchoSympathy(nativeHost:NativeSceneFrameHost, gainer: Actor, ev: GainEvent): void {
    if (gainer.dead) return;
    const holders: Actor[] = [gainer];
    if (gainer.owner && !gainer.owner.dead) holders.push(gainer.owner);
    for (const s of nativeHost.frameSeats()) {
      if (s.actor !== gainer && !s.actor.dead && !holders.includes(s.actor)) {
        holders.push(s.actor);
      }
    }
    for (const holder of holders) {
      const rel = sympathyRelationOf(holder, gainer, nativeHost);
      if (!rel) continue;
      for (const id in SYMPATHY_LINKS) {
        const link = SYMPATHY_LINKS[id]!;
        if ((link.from ?? 'self') !== rel) continue;
        if (!link.channels.includes(ev.kind)) continue;
        if (link.tags && !(ev.tags && link.tags.every(t => ev.tags!.includes(t)))) continue;
        if (link.chargeIds && !(ev.kind === 'charge' && link.chargeIds.includes(ev.id))) continue;
        if (link.buffIds && !(ev.kind === 'buff' && link.buffIds.includes(ev.id))) continue;
        if (link.orbKinds && !(ev.kind === 'orb' && link.orbKinds.includes(ev.id))) continue;
        if (ev.depth > SYMPATHY_CFG.maxSourceDepth
          + Math.floor(holder.sheet.get('sympathyDepth'))) continue;
        const potency = nativeHost.sympathyPotency(holder, link.id);
        if (potency <= 0) continue;
        const scale = (link.scale ?? SYMPATHY_CFG.scale) * potency;
        if (scale <= 0) continue;
        for (const r of gatherSympathyRecipients(nativeHost, holder, link, gainer)) {
          const landed = nativeHost.applySympathyEcho(r, ev, scale);
          // Charge pips and buff bars already show their echoes — float
          // text only where the gain itself is otherwise invisible.
          if (landed && SYMPATHY_CFG.text && ev.kind !== 'charge' && ev.kind !== 'buff') {
            nativeHost.text(r.pos, link.label, link.color ?? '#9ab8e8', 10);
          }
        }
      }
    }
  }

export function sceneStepBurrow(nativeHost:NativeSceneFrameHost, a: Actor, dt: number): void {
    const b = a.burrow!;
    b.dustAcc += dt;
    if (b.dustAcc >= 0.1 && b.phase !== 'emerge') {
      b.dustAcc = 0;
      nativeHost.flashes.push({ pos: vec(a.pos.x + rand(-6, 6), a.pos.y + rand(-6, 6)), radius: 12 + rand(0, 6), color: b.color, life: 0.3, maxLife: 0.3 });
    }
    if (b.phase === 'submerge') {
      b.t -= dt;
      if (b.t <= 0) b.phase = 'travel';
      return;
    }
    if (b.phase === 'travel') {
      const dx = b.to.x - a.pos.x, dy = b.to.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      const step = b.speed * dt;
      if (d <= step) {
        a.pos.x = b.to.x; a.pos.y = b.to.y;
        b.phase = 'emerge'; b.t = 0.55;
      } else {
        a.pos.x += (dx / d) * step;
        a.pos.y += (dy / d) * step;
      }
      return;
    }
    // EMERGE: the ring swells over the window, then the eruption lands.
    b.t -= dt;
    nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: Math.max(4, b.emergeRadius * (1 - Math.max(0, b.t) / 0.55)), color: b.color, life: 0.08, maxLife: 0.08 });
    if (b.t > 0) return;
    a.burrow = undefined;
    a.untargetable = false;
    nativeHost.burstDamage(vec(a.pos.x, a.pos.y), b.emergeRadius, a.maxLife() * b.damageFrac, 'physical', b.color, a.team, a.tier);
    nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: b.emergeRadius + 14, color: b.color, life: 0.4, maxLife: 0.4 });
    nativeHost.text(vec(a.pos.x, a.pos.y - 24), 'ERUPTION!', '#e8c86a', 14);
  }

export function sceneUpdateActorLedgers(nativeHost:NativeSceneFrameHost, a: Actor, dt: number): void {
    if (!a.activeAuras.size) return;
    for (const [skillId, aura] of a.activeAuras) {
      const dv = aura.inst.def.delivery;
      const led = dv.type === 'aura' ? dv.ledger : undefined;
      if (!led || !aura.ledger) continue;
      // Escalating upkeep: mana/s = base + perPoint × balance.
      if (led.upkeep && aura.ledger.balance > 0) {
        const bill = ((led.upkeep.base ?? 0)
          + led.upkeep.perPoint * aura.ledger.balance) * dt;
        if (a.mana < bill) {
          nativeHost.text(a.pos, 'the ledger closes', '#d05050', 12);
          nativeHost.deactivateAura(a, skillId); // the settle fires inside
          continue;
        }
        a.mana -= bill;
      }
      // Running dry cashes the account — vent WITHOUT dropping the toggle.
      if (led.ventBelowMana !== undefined && led.lapse === 'ventMana'
        && aura.ledger.balance >= 1
        && a.mana < led.ventBelowMana * a.availableMaxMana()) {
        nativeHost.settleLedger(a, led, aura.ledger);
      }
    }
  }

export function sceneNoteMovementTravel(nativeHost:NativeSceneFrameHost, a: Actor, inst: SkillInstance, from: Vec2, progress: number): void {
    const p = movementProfile(inst.def.id);
    if (!p || p.family === 'blink' || a.dead || a.downed || dist(from, a.pos) < .01) return;
    let flash = nativeHost.movementFlashes.get(a);
    if (!flash || !nativeHost.flashes.includes(flash) || flash.movement?.skillId !== inst.def.id || flash.recoveryCueTier !== a.tier) {
      if (nativeHost.flashes.filter(f => f.movement).length >= MOVEMENT_VISUAL_STYLE.maxTraces) return;
      flash = { pos: { ...a.pos }, radius: a.radius, facing: a.facing,
        color: cosmeticSkillPaint(nativeHost, a, inst.def.id).color ?? inst.def.color,
        life: MOVEMENT_VISUAL_STYLE.fadeSeconds, maxLife: MOVEMENT_VISUAL_STYLE.fadeSeconds,
        recoveryCueTier: a.tier, movement: { skillId: inst.def.id, clock: nativeHost.time, progress, points: [] } };
      nativeHost.movementFlashes.set(a, flash); nativeHost.flashes.push(flash);
    }
    flash.pos = { ...a.pos }; flash.life = flash.maxLife;
    extendMovementTrail(flash.movement!, from, a.pos, nativeHost.time, Math.max(0, Math.min(1, progress)));
  }

export function sceneSweepBodySlam(nativeHost:NativeSceneFrameHost, a: Actor, p: NonNullable<Actor['push']>, speed: number): void {
    const near = nativeHost.actorsNear(a.pos.x, a.pos.y, a.radius + 96, nativeHost.slamScratch);
    const dir = Math.atan2(p.vy, p.vx);
    const moverW = a.effectiveWeight();
    const casterLive = p.caster && !p.caster.dead ? p.caster : undefined;
    for (const b of near) {
      if (b === a || b === p.caster || b.dead || b.downed) continue;
      if (b.untargetable || b.invulnerable) continue;
      if (isDormant(b)) continue;
      if (!!a.flying !== !!b.flying) continue;
      if (!sameStory(a, b)) continue; // the sovereignty gate: no slam across a story
      if (a.sheet.get('phasing') > 0 || b.sheet.get('phasing') > 0) continue;
      if (dist(a.pos, b.pos) > a.radius + b.radius) continue;
      const arrested = b.effectiveWeight() >= moverW * MASS_CFG.slam.arrestRatio;
      // The ICD gates the WOUND and the momentum hand-off (a lingering
      // overlap must not re-shove every frame into a slingshot) — but
      // NEVER the arrest itself: a wall of meat that was leaned on a
      // heartbeat ago is still a wall, not a hole.
      if (nativeHost.time >= b.slamIcdUntil) {
        b.slamIcdUntil = nativeHost.time + MASS_CFG.impact.icdSec;
        // The struck body's share of the mover's momentum — hostile-authored
        // (or the impact.casterless dial for authorless movers), mitigated,
        // credited where an author exists (a chain kill pays the original
        // shover; an environmental plow names none and kill()'s standing
        // credit law decides the pay — the pitfall degrade).
        const frac = impactFrac(speed, moverW)
          * (casterLive ? impactScale(casterLive, p.inst) : 1)
          * MASS_CFG.slam.struckFrac;
        if (frac > 0 && (casterLive ? nativeHost.hostileTo(casterLive, b) : MASS_CFG.impact.casterless)) {
          const out: { clamped?: boolean } = {};
          const taken = mitigateTyped(b, { physical: frac * b.maxLife() }, { out });
          b.life -= taken;
          const poiseFrac = MASS_CFG.impact.poiseFrac;
          if (poiseFrac > 0) b.damagePoise(frac * poiseFrac * b.maxPoise(), casterLive);
          b.hitFlash = 0.15;
          b.hitFlashType = 'physical';
          nativeHost.text(b.pos, Math.round(taken).toString(), DAMAGE_COLOR.physical, 13);
          if (out.clamped) nativeHost.showCombatOutcome(b, 'hit_cap', a.pos);
          if (b.life <= 0 && !b.dead) nativeHost.kill(b, false, casterLive);
        }
        // The blocker feels a lean, the plowed inherit momentum (authority
        // already spent either way — never re-folded).
        if (!b.dead) {
          nativeHost.pushActor(b, dir,
            speed * (arrested ? MASS_CFG.slam.arrestNudge : MASS_CFG.slam.transfer) / PUSH_DAMPING,
            p.caster, p.inst, { noAuthority: true });
        }
        // Plowing costs the mover speed only when it actually plowed.
        if (!arrested) {
          p.vx *= MASS_CFG.slam.plowDamping; p.vy *= MASS_CFG.slam.plowDamping;
          speed *= MASS_CFG.slam.plowDamping;
        }
      }
      if (arrested) {
        // ARREST: the blocker is a wall. The mover takes the wall wound
        // (its OWN icd governs it), the crush procs roll, the flight ends.
        if (!p.collided && casterLive && p.inst) {
          p.collided = true;
          nativeHost.rollCollisionProcs(casterLive, p.inst, a);
        }
        nativeHost.resolveImpactHit(a, speed, p);
        p.vx = 0; p.vy = 0;
        return;
      }
      if (speed < MASS_CFG.slam.minSpeed) return;
    }
  }

export function sceneRollCollisionProcs(nativeHost:NativeSceneFrameHost, caster: Actor, inst: SkillInstance, target: Actor): void {
    if (target.dead) return;
    // Skill-local mods (the Crushing Impact gem is this stat's ONLY grantor)
    // are visible solely through the extra param — same query as hit procs.
    const tags = skillContextTags(inst);
    const extra = instanceMods(inst);
    for (const proc of PROC_LIST) {
      if (proc.trigger !== 'collision') continue;
      if (!nativeHost.procGates(caster, proc, inst)) continue;
      const c = nativeHost.procChance(caster, proc, 0, tags, extra);
      if (c <= 0 || !chance(c)) continue;
      if (!nativeHost.procReady(caster, proc)) continue;
      nativeHost.executeProc(proc, caster, inst, target, 0);
    }
  }

export function sceneResolveImpactHit(nativeHost:NativeSceneFrameHost, a: Actor, speed: number, p: NonNullable<Actor['push']>): void {
    if (a.dead || a.invulnerable || a.untargetable) return;
    const caster = p.caster && !p.caster.dead ? p.caster : undefined;
    if (caster ? !nativeHost.hostileTo(caster, a) : !MASS_CFG.impact.casterless) return;
    if (nativeHost.time < a.slamIcdUntil) return;
    const frac = impactFrac(speed, a.effectiveWeight()) * (caster ? impactScale(caster, p.inst) : 1);
    if (frac <= 0) return;
    a.slamIcdUntil = nativeHost.time + MASS_CFG.impact.icdSec;
    const out: { clamped?: boolean } = {};
    const taken = mitigateTyped(a, { physical: frac * a.maxLife() }, { out });
    a.life -= taken;
    const poiseFrac = MASS_CFG.impact.poiseFrac;
    if (poiseFrac > 0) a.damagePoise(frac * poiseFrac * a.maxPoise(), caster);
    a.hitFlash = 0.15;
    a.hitFlashType = 'physical';
    nativeHost.flashes.push({
      pos: vec(a.pos.x, a.pos.y), radius: a.radius + 12,
      color: '#c8b8a0', life: 0.22, maxLife: 0.22,
    });
    nativeHost.text(a.pos, Math.round(taken).toString(), DAMAGE_COLOR.physical, 14);
    if (out.clamped) nativeHost.showCombatOutcome(a, 'hit_cap', caster?.pos);
    if (a.life <= 0 && !a.dead) nativeHost.kill(a, false, caster);
  }

export function sceneGrantedPocketsFor(nativeHost:NativeSceneFrameHost, a: Actor): GrantedPocket[] {
    if (nativeHost.syncedGrantedPockets) return nativeHost.syncedGrantedPockets[a.id] ?? [];
    const zoneKey = `${nativeHost.zone.id}:${nativeHost.currentZoneSeed}`;
    if (nativeHost.grantedPocketZone !== zoneKey) {
      nativeHost.grantedPocketZone = zoneKey;
      nativeHost.grantedPocketCache.clear();
    }
    const out: GrantedPocket[] = [];
    for (const def of Object.values(POCKET_GRANTS)) {
      if (a.dead || a.downed || a.sheet.get(pocketGrantStat(def.id)) <= 0) continue;
      const key = `${def.id}:${a.tier}`;
      let pockets = nativeHost.grantedPocketCache.get(key);
      if (!pockets) {
        const walk = a.tier >= 1 && nativeHost.tierViews ? nativeHost.tierViews[a.tier] ?? nativeHost.walk : nativeHost.walk;
        pockets = placeGrantedPockets(def, nativeHost.currentZoneSeed, a.tier, nativeHost.arena.w, nativeHost.arena.h, (x, y) => {
          if (x < 0 || y < 0 || x > nativeHost.arena.w || y > nativeHost.arena.h) return false;
          if (walk && !walk.isWalkable(x, y)) return false;
          if (nativeHost.walk?.regionAt && !tierFloorAt(nativeHost.walk.regionAt(x, y), a.tier)) return false;
          return !nativeHost.pointInSolid(x, y, 4, a.tier);
        });
        nativeHost.grantedPocketCache.set(key, pockets);
      }
      out.push(...pockets);
    }
    return out;
  }

export function sceneInsideGrantedPocket(nativeHost:NativeSceneFrameHost, a: Actor, id: string, pockets = nativeHost.grantedPocketsFor(a)): boolean {
    return pockets.some(p => p.grantId === id && p.tier === a.tier
      && Math.hypot(p.x - a.pos.x, p.y - a.pos.y) <= p.r);
  }

export function sceneSympathyPotency(nativeHost:NativeSceneFrameHost, holder: Actor, linkId: string): number {
    const stat = sympathyStat(linkId);
    let p = holder.sheet.get(stat);
    for (const inst of holder.skills) {
      if (!inst || (inst.sockets.length === 0 && !inst.def.innateMods && !inst.treeNodes?.length && !inst.grafts?.length)) continue;
      p = Math.max(p, holder.sheet.get(stat,
        skillContextTags(inst, grantedTags(inst)), instanceMods(inst)));
    }
    return p;
  }

export function sceneApplySympathyEcho(nativeHost:NativeSceneFrameHost, r: Actor, ev: GainEvent, scale: number): boolean {
    switch (ev.kind) {
      case 'restore': {
        const total = (ev.n ?? 0) * scale;
        if (total <= 0) return false;
        // THE SHAPE OF THE GAIN: `dur` is the pour window, and an INSTANT
        // restore has none — its absence routes the echo back through the
        // instant gate the original used, so a sudden gain echoes suddenly
        // instead of as a phantom one-second drip. That gate is also the
        // only one that knows POISE (restore streams carry life/mana/es
        // alone), so the poise channel has a real echo path and needs no
        // gate upstream. noEvent: an echo never re-events. resetEsDelay is
        // deliberately not carried — the echo replays the RESOURCE; kicking
        // the recharge is the original cast's own lever.
        if (ev.dur === undefined) {
          return nativeHost.applyRestore(r, {
            resource: ev.id as 'life' | 'mana' | 'es' | 'poise', amount: total,
          }, { noEvent: true }) > 0;
        }
        // A POUR echoes as a pour: the recipient's own stream, same window.
        r.restoreStreams.push({
          resource: ev.id as 'life' | 'mana' | 'es',
          perSec: total / Math.max(0.2, ev.dur), remaining: total,
        });
        return true;
      }
      case 'heal':
        return r.healBy((ev.n ?? 0) * scale) > 0;
      case 'charge': {
        let cap = CHARGE_DEFS[ev.id]?.baseCap ?? 0;
        for (const inst of r.skills) {
          if (!inst) continue;
          for (const cg of instanceChargeGain(inst)) {
            if (cg.charge === ev.id) cap = Math.max(cap, cg.max);
          }
        }
        const before = r.charges.get(ev.id) ?? 0;
        r.gainCharge(ev.id, ev.n ?? 1, cap, undefined, ev.depth + 1);
        return (r.charges.get(ev.id) ?? 0) > before;
      }
      case 'buff': {
        if (!ev.buff) return false;
        r.addBuff(ev.buff, scale, ev.depth + 1);
        return true;
      }
      case 'orb': {
        const def = ORB_DEFS[ev.id];
        if (!def) return false;
        let landed = false;
        if (def.restore && (ev.n ?? 0) > 0) {
          // noEvent: an echo never re-events (the 'orb' chain dies here).
          landed = nativeHost.applyRestore(r, {
            resource: def.restore, amount: (ev.n ?? 0) * scale,
            resetEsDelay: def.restore === 'es',
          }, { noEvent: true }) > 0;
        }
        if (def.charge) {
          const before = r.charges.get(def.charge.charge) ?? 0;
          r.gainCharge(def.charge.charge, def.charge.amount, def.charge.max,
            undefined, ev.depth + 1);
          landed = landed || (r.charges.get(def.charge.charge) ?? 0) > before;
        }
        return landed;
      }
    }
  }

