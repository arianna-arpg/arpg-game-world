/** Exact native combat events algorithms from Git 42f95716294995cbdd83785f0a0782ddda971f76.
 * Extraction is not an admitted runtime: all capabilities must be bound by the actual area aggregate. */
import { PROJ_CHILD_DEPTH_MAX, PROJ_AURA_TICK } from './nativeSceneProjectiles';
import { lightningProfile, LIGHTNING_STYLE } from '../data/lightningVisuals';
import { extendLightningTrace } from './lightningVisual';
import { summonCapacity } from './summonContracts';
import { instanceEffects } from './skills';
import { angleDiff, angleTo, chance, clamp, dist, pick, rand, vec, type Vec2 } from '../core/math';
import { erraticTurn, spinOffset, weaveOffset } from './flight';
import { FOURTH_WALL_CFG, type ViewRect, fallbackRect, frameReflect } from './fourthwall';
import { type DamageType } from './stats';
import { baselineStatusDps, STATUS_DEFS } from './status';
import { Actor, type Team } from './actor';
import { mitigateTyped, rollSkillDamage } from './damage';
import { parryCounter } from './parry';
import { SEG_CFG, bodyWhere, noteBodyHit, segR, segsHittable, type SegBody } from './segments';
import { isDormant } from './ai';
import { effectiveSkillLevel, grantedTags, instanceDelivery, instanceMods, instanceBirth, instanceSequel, makeSkillInstance, resolveSizeOver, socketSpec, SEQUEL_CFG, AOE_SHAPE, skillContextTags, type ProjectileDelivery, type ImpactDressSpec } from './skills';
import { BOMBARD_CFG } from './bombard';
import { evalCurve } from './curves';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { CATCH_SPOT_LOOK } from '../data/looks';
import { blocksProjectiles, doodadRuleOf, hitSurfaceOf, normalizeDoodadBound, type Doodad, type DoodadKind } from './levelgen';
import { dominantTypeOf, hitVoiceOf, skillBaseTypeOf } from './bodyVoices';
import { pushOutOfShape, shapeContains } from './shapes';
import { projFormNose, projFormTouches } from './projForms';
import { regionGrid } from '../world/walk';
import { combatCueFlash } from './combatCues';
import { castGridRay, LOS_CFG } from './los';
import type { CarriedEffectContext } from './carriedEffects';
import { SATELLITE_CFG } from './satelliteSpec';
import { SIM_TAP } from './tap';
import { monsterSkillLevelOf } from './nativePopulationRules';
import type { Projectile, RemnantElement } from "./world";
import type { NativeSceneCombatHost, Zone } from "./nativeSceneCombatHost";
import { MADDEN_CFG, REMNANT_COLORS, SHRAPNEL_SKILL, foldDotSeat, inAoe, speedLingerMul, zoneHoleSpares } from "./nativeSceneCombatResolution";

export function sceneViewRectFor(nativeHost: NativeSceneCombatHost, body: Actor): ViewRect {
    if (body.frameLockRect) return body.frameLockRect;
    let root = body;
    for (let hops = 0; root.owner && hops < 4; hops++) {
      root = root.owner;
      if (root.frameLockRect) return root.frameLockRect;
    }
    if (root.team === nativeHost.player.team && nativeHost.viewFrame
      && nativeHost.time - nativeHost.viewFrameAt <= FOURTH_WALL_CFG.publishGraceSec) {
      return nativeHost.viewFrame;
    }
    return fallbackRect(root.pos.x, root.pos.y);
  }

export function sceneCarriedEffectContext(nativeHost: NativeSceneCombatHost): CarriedEffectContext {
    return {
      active: a => !a.untargetable && !a.passive && !a.burrow && !a.summonShell && !isDormant(a)
        && !a.statuses.some(s => STATUS_DEFS[s.id]?.conceals),
      elapsed: (a, elapsed) => elapsed * nativeHost.timeflow.actorScale(a),
      enemies: (a, reach, at = a.pos) => {
        if (nativeHost.lite.liveCount) nativeHost.litePromoteNearest(at, {
          within: reach + SATELLITE_CFG.sweepSpacing, max: SATELLITE_CFG.promotePerFrame,
          opposing: a.team, story: a.tier,
        });
        return nativeHost.enemiesOf(a);
      },
      hostile: (a, b) => nativeHost.hostileTo(a, b) && !isDormant(b),
      clear: (a, b, tier) => nativeHost.lineOfSight(a, b, tier, tier),
      instance: (a, id, slot) => nativeHost.guardArts.satellitePayload(a, id, slot)
        ?? (SKILLS[id] ? makeSkillInstance(SKILLS[id], monsterSkillLevelOf(a.level)) : undefined),
      hit: (a, inst, b) => nativeHost.resolveHit(a, inst, b, 1, 1),
      launch: (a, inst, from, dir) => nativeHost.spawnProjectile(a, inst, from, dir, { depth: 1 }),
      radius: (a, inst) => {
        const delivery = instanceDelivery(inst);
        return delivery.type === 'ground'
          ? delivery.radius * a.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst))
          : delivery.type === 'projectile'
            ? delivery.radius * a.sheet.get('projectileSize', skillContextTags(inst), instanceMods(inst)) : 0;
      },
    };
  }

export function scenePlantImpactDress(nativeHost: NativeSceneCombatHost, z: { pos: Vec2; radius: number; impactDress?: ImpactDressSpec }): void {
    const spec = z.impactDress!;
    if (!chance(spec.chance ?? 1)) return;
    const x = z.pos.x, y = z.pos.y;
    if (nativeHost.walk && !nativeHost.walk.isWalkable(x, y)) return; // no pocks on water/void
    if (nativeHost.pointInSolid(x, y, 6)) return;
    const r = clamp(z.radius * BOMBARD_CFG.dressRadiusFrac,
      BOMBARD_CFG.dressRadiusMin, BOMBARD_CFG.dressRadiusMax);
    const dwell = spec.evapAfter ?? BOMBARD_CFG.dressDwell;
    const d: Doodad = {
      pos: vec(x, y), radius: r, kind: spec.kind as DoodadKind,
      rot: rand(0, Math.PI * 2), blastDress: true,
      evap: { t: rand(dwell[0], dwell[1]), rate: BOMBARD_CFG.dressEvapRate },
    };
    normalizeDoodadBound(d);
    // THE POCK FIFO: re-derive the standing subset only when the doodad
    // list moved under us since the last shell (identity = zone swaps +
    // wholesale filters, length = any foreign push/splice) — derived
    // BEFORE our own push so the walk and the append agree on the set.
    const k = nativeHost.blastPocksKey;
    if (k.doodads !== nativeHost.doodads || k.len !== nativeHost.doodads.length) {
      nativeHost.blastPocks = nativeHost.doodads.filter(dd => dd.blastDress && !dd.gone);
    }
    nativeHost.doodads.push(d);
    nativeHost.evaporating.push(d);
    nativeHost.blastPocks.push(d);
    k.doodads = nativeHost.doodads;
    k.len = nativeHost.doodads.length;
    let count = 0;
    let oldest: Doodad | undefined;
    const pocks = nativeHost.blastPocks;
    let live = 0;
    for (let i = 0; i < pocks.length; i++) {
      const dd = pocks[i];
      if (!dd.blastDress || dd.gone) continue; // dried away — falls out of the FIFO
      pocks[live++] = dd;
      count++;
      // The oldest pock NOT already forced dry — each plant past the cap
      // advances the drying frontier by one, never re-forcing the same one.
      if (!oldest && dd.evap && dd.evap.t > 0) oldest = dd;
    }
    pocks.length = live;
    if (count > BOMBARD_CFG.dressCap && oldest?.evap) oldest.evap.t = 0;
  }

export function sceneLiteProjectileSweep(nativeHost: NativeSceneCombatHost, p: Projectile, x0: number, y0: number): boolean {
    const pool = nativeHost.lite;
    const kinds = nativeHost.liteKinds;
    const carveTeam = p.caster.team === 'player' ? 0 : 1;
    let stopped = false;
    const rend = p.caster ? Math.max(0, Math.floor(p.caster.sheet.get('plyRend'))) : 0;
    pool.forEachAlong(x0, y0, p.pos.x, p.pos.y, nativeHost.liteMaxR + p.radius + 2, i => {
      if (pool.team[i] !== carveTeam) return;
      if (pool.story[i] !== (p.tier ?? 0)) return; // the flight's story (the sovereignty gate)
      const k = kinds[pool.kind[i]];
      if (!k) return;
      const bx = pool.x[i], by = pool.y[i];
      nativeHost.litePocketDisturb(pool.pocket[i]);
      if (pool.plies[i] > 1 + rend) {
        pool.plies[i] -= 1 + rend;
        nativeHost.flashes.push({ pos: vec(bx, by), radius: k.radius + 3, color: '#ffffff', life: 0.1, maxLife: 0.1 });
      } else {
        nativeHost.flashes.push({ pos: vec(bx, by), radius: k.radius + 5, color: k.color, life: 0.18, maxLife: 0.18 });
        nativeHost.liteNoteDeath(k, pool.team[i], p.caster);
        pool.free(i);
      }
      if (p.rehit) return;                       // sails on, chewing freely
      if (p.pierce > 0) { p.pierce--; return; }  // spends a pierce per body
      p.pos.x = bx; p.pos.y = by;                // the flight ends HERE
      stopped = true;
      return true;
    });
    return stopped;
  }

export function sceneZoneHas(nativeHost: NativeSceneCombatHost, z: { seg?: { ax: number; ay: number; bx: number; by: number }; pos: Vec2; radius: number; shape: number; facing: number; arcRad?: number }, pos: Vec2, radius: number): boolean {
    if (z.seg) {
      const dx = z.seg.bx - z.seg.ax, dy = z.seg.by - z.seg.ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 <= 0.0001 ? 0
        : clamp(((pos.x - z.seg.ax) * dx + (pos.y - z.seg.ay) * dy) / len2, 0, 1);
      const cx = z.seg.ax + dx * t, cy = z.seg.ay + dy * t;
      return Math.hypot(pos.x - cx, pos.y - cy) <= z.radius + radius;
    }
    return inAoe(z.pos, z.radius, z.shape, z.facing, pos, radius, z.arcRad);
  }

export function sceneStrikeZoneSurfaces(nativeHost: NativeSceneCombatHost, z: Zone, useStruck = true, at?: Vec2, radius?: number): void {
    if (z.exposure || z.healTick) return;
    const cAt = at ?? z.pos;
    const r = radius ?? z.radius;
    // A lingering field parked ON a marching skin quenches or stokes it on
    // the zone's own strike cadence — the sustained-pressure verb.
    nativeHost.frontSplash(z.caster, z.inst, cAt, r);
    nativeHost.strikeSurfaces(z.caster, cAt, r, (p, pr) =>
      (at !== undefined || radius !== undefined
        ? inAoe(cAt, r, z.shape, z.facing, p, pr, z.arcRad)
        : nativeHost.zoneHas(z, p, pr))
      && !zoneHoleSpares(z, p, pr)
      && nativeHost.zoneSees(z, p),
      useStruck ? z.struck : undefined);
  }

export function sceneDetonateFissureSegment(nativeHost: NativeSceneCombatHost, z: Zone, damageScale: number, radiusScale: number): boolean {
    if (z.caster.dead || !nativeHost.zoneHas(z, z.caster.pos, z.caster.radius)) return false;
    const radius = z.radius * radiusScale;
    const at = z.seg
      ? vec((z.seg.ax + z.seg.bx) / 2, (z.seg.ay + z.seg.by) / 2)
      : vec(z.pos.x, z.pos.y);
    nativeHost.flashes.push(combatCueFlash(at, 'aftershock', radius, z.facing ?? 0, z.color));
    for (const v of nativeHost.zoneVictims(z)) {
      const nb = bodyWhere(v, (bp, br) => dist(at, bp) - br <= radius);
      if (!nb) continue;
      if (!nativeHost.zoneSees(z, v)) continue;
      noteBodyHit(v, nb.seg);
      nativeHost.resolveHit(z.caster, z.inst, v, z.dmgMult * damageScale, z.depth, z.flatBonus, true, false, undefined, z.pos, z.tier);
    }
    // THE MALLET: the segment's detonation is a fresh blast at the piece
    // (no sweep ledger, the same wall gates its victims saw).
    nativeHost.strikeZoneSurfaces(z, false, at, radius);
    nativeHost.spawnAftershocks(z.caster, z.inst, at, radius, z.shape, 0);
    return true;
  }

export function sceneNearestSeatPos(nativeHost: NativeSceneCombatHost, p: Vec2): Vec2 | null {
    // SOVEREIGNTY: census — a distance read (the derived census, probe_tiers RIG T).
    let best: Vec2 | null = null, bd = Infinity;
    for (const s of nativeHost.seats) {
      if (s.actor.dead || s.actor.downed) continue;
      const d = dist(p, s.actor.pos);
      if (d < bd) { bd = d; best = vec(s.actor.pos.x, s.actor.pos.y); }
    }
    return best;
  }

export function sceneBurstContact(nativeHost: NativeSceneCombatHost, pos: Vec2, sourceTeam: Team, sourceTier: number, body: number): boolean {
    for (const e of nativeHost.actors) {
      if (!nativeHost.isBurstTarget(e, sourceTeam, sourceTier)) continue;
      if (dist(pos, e.pos) <= body + e.radius) return true;
    }
    return false;
  }

export function sceneUpdateDeathBursts(nativeHost: NativeSceneCombatHost, dt: number): void {
    for (let i = nativeHost.deathBursts.length - 1; i >= 0; i--) {
      const b = nativeHost.deathBursts[i];
const nativeRecordScope = nativeHost.beginCombatRecord("deathBursts", b);
try {
      b.t += dt;
      if (b.phase === 'gather') {
        if (b.t < b.coalesce) continue;
        // The coalesce completes — a bright implosion pop.
        nativeHost.flashes.push({ pos: vec(b.pos.x, b.pos.y), radius: b.radius * 0.4, color: b.color, life: 0.35, maxLife: 0.35 });
        if (b.mode === 'implode') { nativeHost.burstDamage(b.pos, b.radius, b.dmg, b.type, b.color, b.team, b.tier); nativeHost.deathBursts.splice(i, 1); }
        else { b.phase = 'orb'; b.t = 0; const t0 = nativeHost.nearestSeatPos(b.pos); b.dir = t0 ? angleTo(b.pos, t0) : 0; }
        continue;
      }
      // ORB: loosely home the nearest live player, then arm + detonate. The effectDuration-
      // scaled `life` always caps how long it COULD drift — a CONTACT orb just cuts that short
      // the instant it touches a target/wall (it freezes and fuses for CONTACT_FUSE).
      b.life -= dt;
      if (!b.stuck) {
        const tgt = nativeHost.nearestSeatPos(b.pos);
        if (tgt) {
          const diff = angleDiff(b.dir, angleTo(b.pos, tgt));
          b.dir += Math.sign(diff) * Math.min(Math.abs(diff), b.turn * dt); // sloppy turn → dodgeable
        }
        const want = vec(b.pos.x + Math.cos(b.dir) * b.speed * dt, b.pos.y + Math.sin(b.dir) * b.speed * dt);
        if (b.contact) {
          // Swept-confine from the current pos so a wall STOPS the orb at its edge (no tunnel).
          const next = nativeHost.clampPos(want, 8, b.pos);
          // Arrested by a wall/doodad/bound (next ≠ want) OR touching a target = contact.
          if (dist(next, want) > 0.5 || nativeHost.burstContact(next, b.team, b.tier ?? 0, b.contactRadius)) {
            b.stuck = true; b.life = Math.min(b.life, b.contactFuse); // freeze + brief flare, then blast
          }
          b.pos = next;
        } else {
          b.pos = nativeHost.clampPos(want, 8);
        }
        b.trail.unshift(vec(b.pos.x, b.pos.y));
        if (b.trail.length > 3) b.trail.pop();
      }
      b.arming = b.stuck || b.life <= b.armAt; // a stuck contact orb blinks at once; else the final ~25%
      if (b.life <= 0) { nativeHost.burstDamage(b.pos, b.radius, b.dmg, b.type, b.color, b.team, b.tier); nativeHost.deathBursts.splice(i, 1); }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUnderRoofAt(nativeHost: NativeSceneCombatHost, pos: Vec2): boolean {
    if (nativeHost.roofedStructureAt(pos) !== null) return true;
    // ROOF-GRADE SHELTER (DoodadRule.shelter): a standing overhang's FULL
    // disc is a roof — drawn == tested at the lip (the burn rain's roofed
    // counterplay, the gale's lee, the heat-shade). A felled or gone piece
    // shelters nothing.
    for (const d of nativeHost.doodadsAt(pos.x, pos.y)) {
      if (d.gone || d.felled || !doodadRuleOf(d.kind).shelter) continue;
      const dx = pos.x - d.pos.x, dy = pos.y - d.pos.y;
      if (dx * dx + dy * dy <= d.radius * d.radius) return true;
    }
    return false;
  }

export function sceneUpdateFollowUps(nativeHost: NativeSceneCombatHost, dt: number): void {
    for (let i = nativeHost.pendingFollowUps.length - 1; i >= 0; i--) {
      const p = nativeHost.pendingFollowUps[i];
const nativeRecordScope = nativeHost.beginCombatRecord("pendingFollowUps", p);
try {
      p.timer -= dt * nativeHost.timeflow.actorScale(p.caster); // held casters' payloads wait
      if (p.timer > 0) continue;
      nativeHost.pendingFollowUps.splice(i, 1);
      if (p.caster.dead) continue;
      if (p.inst.followUpHost && !p.caster.skills.includes(p.inst.followUpHost)) continue;
      const followUpFacing = p.caster.facing;
      nativeHost.executeSkill(p.caster, p.inst, p.aim,
        { noCooldown: true, noRepeat: true, noFollowUp: true, dmgMult: p.dmgMult });
      if (p.inst.followUpHost) p.caster.facing = followUpFacing;
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdatePendingSummons(nativeHost: NativeSceneCombatHost, dt: number): void {
    for (let i = nativeHost.pendingSummons.length - 1; i >= 0; i--) {
      const ps = nativeHost.pendingSummons[i];
const nativeRecordScope = nativeHost.beginCombatRecord("pendingSummons", ps);
try {
      if (ps.caster.dead) { nativeHost.pendingSummons.splice(i, 1); continue; }
      ps.timer -= dt;
      if (ps.timer <= 0) {
        ps.timer = ps.interval;
        // #43: waves that RE-BILL fizzle the remainder when the pocket
        // runs dry — the bombardment costs per volley, not per press.
        if (ps.costPer) {
          if (!ps.caster.canAfford(ps.costPer)) {
            nativeHost.failNote(ps.caster, ps.inst.def.id + ':dry', 'the rift sputters out');
            nativeHost.pendingSummons.splice(i, 1);
            continue;
          }
          nativeHost.paySkillCost(ps.caster, ps.inst, ps.costPer);
        }
        // Waves re-aim at the caster's LIVE cursor (the Barrage salvo rule),
        // LEASHED to the placement range; sequential trickles keep the
        // classic caster-ring emergence.
        let base = ps.trackAim ? (ps.caster.aimPos ?? ps.at) : ps.at;
        if (base && ps.range !== undefined) {
          const dd = dist(ps.caster.pos, base);
          if (dd > ps.range) {
            const ang = angleTo(ps.caster.pos, base);
            base = vec(ps.caster.pos.x + Math.cos(ang) * ps.range,
              ps.caster.pos.y + Math.sin(ang) * ps.range);
          }
        }
        const n = Math.min(ps.batch ?? 1, ps.remaining);
        for (let k = 0; k < n; k++) {
          const sc = ps.scatter ?? 60;
          const pos = base ? nativeHost.clampPos(vec(
            base.x + rand(-sc, sc), base.y + rand(-sc, sc)), 10) : undefined;
          const d = instanceDelivery(ps.inst);
          const contract = ps.caster.summonToggles.get(ps.inst.def.id);
          if (d.type === 'summon' && d.persistent?.toggle && (!contract
            || nativeHost.minionsOfSkill(ps.caster, ps.inst.def.id).filter(a => !a.summonOffspring).length >= (contract.slots ?? summonCapacity(ps.caster, ps.inst, d)))) break;
          nativeHost.spawnMinion(ps.caster, ps.inst, { pos, dmgMult: ps.mult, noReplace: !!(d.type === 'summon' && d.persistent?.toggle) });
        }
        ps.remaining -= n;
        if (ps.remaining <= 0) nativeHost.pendingSummons.splice(i, 1);
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneAccumulateDotText(nativeHost: NativeSceneCombatHost, a: Actor, dot: number, dt: number, by?: Actor | 'afflictions'): void {
    let acc = nativeHost.dotAccum.get(a.id);
    if (!acc) { acc = { amount: 0, timer: 0 }; nativeHost.dotAccum.set(a.id, acc); }
    acc.amount += dot; acc.timer += dt;
    if (nativeHost.partyRows !== null) { // keeperSeat: owners ride a hosted world's wire alone
      if (by === 'afflictions') acc.afflicted = true;
      else acc.seat = foldDotSeat(acc.seat, by ? nativeHost.seatOfRoot(by)?.id ?? null : null);
    }
    if (acc.timer >= 0.5 && acc.amount >= 1) {
      nativeHost.text(a.pos, Math.round(acc.amount).toString(), '#d88a50', 11, 'dmg');
      if (acc.afflicted) acc.seat = foldDotSeat(acc.seat, nativeHost.afflictionSeat(a));
      if (acc.seat) nativeHost.creditFloat(null, acc.seat);
      acc.amount = 0; acc.timer = 0; acc.seat = undefined; acc.afflicted = undefined;
    }
  }

export function sceneAfflictionSeat(nativeHost: NativeSceneCombatHost, a: Actor): string | null {
    let seat: string | null | undefined;
    for (const s of a.statuses) {
      if (!(s.dps > 0)) continue;
      const by = s.casterId !== undefined ? nativeHost.actorById(s.casterId) : undefined;
      seat = foldDotSeat(seat, nativeHost.seatOfRoot(by)?.id ?? null);
      if (seat === null) return null;
    }
    return seat ?? null;
  }

export function sceneReturnTarget(nativeHost: NativeSceneCombatHost, p: Projectile): Vec2 {
    return p.returnMode === 2 && !p.caster.dead ? p.caster.pos : p.origin;
  }

export function sceneEnterReturn(nativeHost: NativeSceneCombatHost, p: Projectile): boolean {
    if (p.returnMode <= 0 || p.returnPhase) return false;
    p.returnPhase = true;
    p.hits.clear();      // it can strike everyone again on the way back
    p.traveled = 0;
    p.range0 ??= p.range; // keep the out-leg's road for a re-thrown pass
    p.range = 4000;      // safety net; it dies on arrival
    return true;
  }

export function sceneForkProjectile(nativeHost: NativeSceneCombatHost, p: Projectile): void {
    for (const off of [-0.45, 0.45]) {
      const dir = p.dir + off;
      {
let nativeStorage: typeof nativeHost.projectiles;
let nativeRecord: typeof nativeHost.projectiles[number];
let nativePreparation: ReturnType<NativeSceneCombatHost["prepareCombatRecord"]>;
(nativeStorage = nativeHost.projectiles).push((nativeRecord = {
        ...p,
        pos: vec(p.pos.x, p.pos.y),
        dir, guideDir: dir, angle: dir,
        hits: new Map(p.hits),
        // Cascade of Knives: fork children split with their shatter unspent.
        shattered: p.reShatter ? false : p.shattered,
        forks: p.forks - 1,
        traveled: 0,
        range: Math.max(200, p.range * 0.6),
        age: 0,
        anchor: vec(p.pos.x, p.pos.y),   // spirals/helixes re-center on impact
        origin: vec(p.origin.x, p.origin.y),
        orbRadius: 0,
        emit: undefined,                  // emitters don't multiply
        returnPhase: false,
      }, nativePreparation = nativeHost.prepareCombatRecord("projectiles", nativeRecord, "caster", "inst"), nativeRecord));
nativeHost.issuePreparedCombatRecord("projectiles", nativeStorage, nativeRecord, nativePreparation);
}
    }
  }

export function sceneGuidePointOf(nativeHost: NativeSceneCombatHost, p: Projectile): Vec2 | null {
    return p.caster.aimPos ?? p.caster.owner?.aimPos ?? null;
  }

export function sceneNearestProjTarget(nativeHost: NativeSceneCombatHost, p: Projectile): Actor | null {
    // SOVEREIGNTY: targeting — homing picks through hostility (rim duels are authored) (the derived census, probe_tiers RIG T).
    if (p.preyId !== undefined) {
      const prey = nativeHost.actorById(p.preyId);
      return prey && !prey.dead ? prey : null;
    }
    let target: Actor | null = null, bestD = 500;
    for (const e of nativeHost.enemiesOf(p.caster)) {
      // THE SEEKWORTHY GATE: a seeker chases things that FIGHT. Passive
      // scenery armor (pots, racks, bells) and the caster's OWN breakable
      // conjurations (in his pool so his blows can demolish them) never
      // draw the flight off a live foe — assistAim's furniture law, worn
      // by the steering pick. Real bodies stay fair prey: a monster's
      // seeker still hunts totems, summons and heroes.
      if (e.passive || (e.construct?.breakable !== undefined && e.owner === p.caster)) continue;
      const until = p.hits.get(e.id);
      if (until !== undefined && p.age < until) continue;
      const dd = dist(p.pos, e.pos);
      if (dd < bestD) { bestD = dd; target = e; }
    }
    return target;
  }

export function sceneKinkProjectile(nativeHost: NativeSceneCombatHost, p: Projectile, zz: { angleDeg: number; shed?: number }): void {
    if (!p.zig) return;
    const abandoned = p.guideDir;
    p.guideDir += (zz.angleDeg * Math.PI / 180) * p.zig.sign;
    p.dir = p.guideDir;
    p.zig.sign *= -1;
    const shed = zz.shed ?? 0;
    if (shed > 0 && p.depth < PROJ_CHILD_DEPTH_MAX && SKILLS[SHRAPNEL_SKILL]) {
      for (let i = 0; i < shed; i++) {
        nativeHost.spawnProjectile(p.caster,
          makeSkillInstance(SKILLS[SHRAPNEL_SKILL], effectiveSkillLevel(p.inst)),
          vec(p.pos.x, p.pos.y), abandoned + rand(-0.12, 0.12),
          { depth: p.depth + 1, mult: p.mult * 0.6 });
      }
    }
  }

export function sceneAdvanceProjectile(nativeHost: NativeSceneCombatHost, p: Projectile, dt: number): Vec2 {
    // ACCELERATION (Momentum): the flight gathers or bleeds speed over its
    // life — floored at a crawl so a decelerating shot never parks forever.
    if (p.accel) p.speed = Math.max(40, p.speed * (1 + p.accel * dt));
    // TORPOR (dome 'slow'): the stall is worn for ONE frame — the dome
    // re-stamps it every frame the flight stays inside its bubble.
    const step = p.speed * (p.stall ?? 1) * dt;
    p.stall = undefined;
    p.age += dt;
    p.traveled += step;
    // PULSATION: the hit radius breathes ± its amplitude on a fixed
    // rhythm — the renderer draws the same live radius it hits with.
    if (p.pulse && p.radius0) {
      p.radius = p.radius0 * (1 + p.pulse * Math.sin(p.age * Math.PI * 2 / 0.7));
    }
    // CATCH-SPOT flight (Whirlaxe): once armed, the axe flies STRAIGHT to
    // its marked circle — no more axes, no more prey.
    if (p.landAt) {
      p.dir = p.guideDir = angleTo(p.pos, p.landAt);
      return vec(p.pos.x + Math.cos(p.dir) * step, p.pos.y + Math.sin(p.dir) * step);
    }
    // Homeward flight overrides the axes: straight back, re-hitting.
    if (p.returnPhase) {
      p.dir = p.guideDir = angleTo(p.pos, nativeHost.returnTarget(p));
      return vec(p.pos.x + Math.cos(p.dir) * step, p.pos.y + Math.sin(p.dir) * step);
    }

    let gx: number, gy: number;
    const polar = p.orbit > 0 || p.spiral > 0;
    if (polar) {
      if (p.orbit > 0) {
        const orbitAnchor = p.orbitAnchorId !== undefined ? nativeHost.actorById(p.orbitAnchorId) : p.caster;
        if (orbitAnchor && !orbitAnchor.dead) {
          p.anchor.x = orbitAnchor.pos.x; p.anchor.y = orbitAnchor.pos.y;
        }
      } else {
        // An untethered spiral STALKS: homing drifts its anchor toward prey,
        // guide drags it after the caster's live aim point.
        let want: Vec2 | null = null;
        if (p.guide > 0) want = nativeHost.guidePointOf(p);
        if (!want && p.homing > 0) want = nativeHost.nearestProjTarget(p)?.pos ?? null;
        if (want) {
          const rate = Math.max(p.homing, p.guide);
          const drift = Math.min(rate * 24, p.speed * 0.5) * dt;
          const ang = angleTo(p.anchor, want);
          p.anchor.x += Math.cos(ang) * drift;
          p.anchor.y += Math.sin(ang) * drift;
        }
      }
      let angVel = p.orbit > 0 ? p.orbit * (p.speed / Math.max(30, p.orbRadius)) : p.spiral;
      if (p.erratic > 0) angVel += rand(-p.erratic, p.erratic) * 2.5;
      p.angle += angVel * dt;
      if (p.spiral > 0) {
        p.orbRadius += p.spiral * p.speed * 0.1 * dt;
      } else if (p.orbRadius < p.orbitR0) {
        // Reeling out to the tether (forks re-anchor at radius 0).
        p.orbRadius = Math.min(p.orbitR0, p.orbRadius + p.speed * 0.6 * dt);
      }
      if (p.erratic > 0) p.orbRadius = Math.max(0, p.orbRadius + rand(-p.erratic, p.erratic) * 10 * dt);
      gx = p.anchor.x + Math.cos(p.angle) * p.orbRadius;
      gy = p.anchor.y + Math.sin(p.angle) * p.orbRadius;
    } else {
      // CAROMS patrol: a shuttle between anchors — hard steering at the
      // current waypoint; arrival advances the cycle (rehit re-arms hits).
      if (p.patrol) {
        const wp = p.patrol.points[p.patrol.idx];
        if (dist(p.pos, wp) < 20) {
          p.patrol.idx = (p.patrol.idx + 1) % p.patrol.points.length;
        }
        p.guideDir = angleTo(p.pos, p.patrol.points[p.patrol.idx]);
      }
      // ARC-TO (Rimeclaw): converge on the destination with a tightening
      // hook — the fan opens, then every shot bends home to the mark.
      if (p.destAt && p.arcRate) {
        const want = angleTo(p.pos, p.destAt);
        const diff = angleDiff(p.guideDir, want);
        const rate = p.arcRate * (1 + p.age * 2.2);
        p.guideDir += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
      }
      // ZIG-ZAG: the kink clock (survived hits also kink — see impacts).
      if (p.zig) {
        const zz = (p.inst.def.delivery as ProjectileDelivery).trajectory?.zigzag;
        p.zig.timer -= dt;
        if (p.zig.timer <= 0 && zz) {
          p.zig.timer += zz.interval;
          nativeHost.kinkProjectile(p, zz);
        }
      }
      // GUIDE: the missile bends toward the caster's live aim point — a
      // marionette on the cursor's string. Steers the same heading homing
      // does, so both can pull (the stronger turn tends to win the frame).
      if (p.guide > 0) {
        const pt = nativeHost.guidePointOf(p);
        if (pt && dist(p.pos, pt) > 14) {
          const want = angleTo(p.pos, pt);
          const diff = angleDiff(p.guideDir, want);
          p.guideDir += Math.sign(diff) * Math.min(Math.abs(diff), p.guide * dt);
        }
      }
      if (p.homing > 0) {
        const target = nativeHost.nearestProjTarget(p);
        if (target) {
          const want = angleTo(p.pos, target.pos);
          const diff = angleDiff(p.guideDir, want);
          p.guideDir += Math.sign(diff) * Math.min(Math.abs(diff), p.homing * dt);
        }
      }
      if (p.erratic > 0) p.guideDir += erraticTurn(p.erratic, dt);
      p.anchor.x += Math.cos(p.guideDir) * step;
      p.anchor.y += Math.sin(p.guideDir) * step;
      gx = p.anchor.x; gy = p.anchor.y;
      if (!p.guided) p.dir = p.guideDir;
    }

    // Local offsets ride the guide — THE flight math (engine/flight.ts), the
    // same formulas the flock steering fabric wears on bodies. Spin's circle
    // scales with its strength (a weak gyre is a tight shimmer, full strength
    // the old wide wheel); weave loops the lissajous figure-eight across the
    // guide's heading (the tangent while polar — an orbiting weave loops
    // figure-eights around the caster's ring).
    if (p.spin > 0) {
      spinOffset(p.spin, p.amp, p.age, nativeHost.flightScratch);
      gx += nativeHost.flightScratch.x; gy += nativeHost.flightScratch.y;
    }
    if (p.weave > 0) {
      const head = polar ? p.angle + Math.PI / 2 : p.guideDir;
      weaveOffset(p.weave, p.amp, p.age, head, nativeHost.flightScratch);
      gx += nativeHost.flightScratch.x; gy += nativeHost.flightScratch.y;
    }
    return vec(gx, gy);
  }

export function sceneProjTouches(nativeHost: NativeSceneCombatHost, p: Projectile, cx: number, cy: number, cr: number): boolean {
    if ((p.inst.def.delivery as ProjectileDelivery).hitForm === 'circle') {
      const dx = cx - p.pos.x, dy = cy - p.pos.y;
      return dx * dx + dy * dy <= (p.radius + cr) * (p.radius + cr);
    }
    return projFormTouches(p.shape, p.pos.x, p.pos.y, p.dir, p.radius, p.age, cx, cy, cr);
  }

export function sceneProjTouchesBody(nativeHost: NativeSceneCombatHost, p: Projectile, a: Actor): SegBody | null {
    if (nativeHost.projTouches(p, a.pos.x, a.pos.y, a.radius)) {
      return { pos: a.pos, r: a.radius, seg: SEG_CFG.HEAD };
    }
    if (segsHittable(a)) {
      const segs = a.worm!.segments;
      for (let i = 0; i < segs.length; i++) {
        const r = segR(a, i);
        if (nativeHost.projTouches(p, segs[i].x, segs[i].y, r)) return { pos: segs[i], r, seg: i };
      }
    }
    return null;
  }

export function sceneProjNose(nativeHost: NativeSceneCombatHost, p: Projectile): number {
    if ((p.inst.def.delivery as ProjectileDelivery).hitForm === 'circle') return p.radius;
    return p.radius * projFormNose(p.shape);
  }

export function sceneShedFlightShrapnel(nativeHost: NativeSceneCombatHost, p: Projectile): boolean {
    if (p.caster.dead || p.depth >= PROJ_CHILD_DEPTH_MAX || !SKILLS[SHRAPNEL_SKILL]) return false;
    const shed = Math.round(p.caster.sheet.get('returnShrapnel',
      skillContextTags(p.inst.def), instanceMods(p.inst)));
    if (shed <= 0) return false;
    for (let s = 0; s < shed; s++) {
      nativeHost.spawnProjectile(p.caster,
        makeSkillInstance(SKILLS[SHRAPNEL_SKILL], effectiveSkillLevel(p.inst)),
        vec(p.pos.x, p.pos.y), (s / shed) * Math.PI * 2,
        { depth: p.depth + 1, mult: p.mult * 0.7 });
    }
    return true;
  }

export function sceneInterceptProjectileDomes(nativeHost: NativeSceneCombatHost, p: Projectile): boolean {
    for (const d of nativeHost.actors) {
      const c = d.construct;
      if (!c || c.kind !== 'dome' || d.dead) continue;
      if (d.team === p.caster.team) continue;
      if (d.tier !== (p.tier ?? 0)) continue; // the dome stands on its own story (the sovereignty gate)
      if (dist(p.pos, d.pos) > (c.domeRadius ?? 100)) continue;
      // TORPOR (mode 'slow'): the bubble STALLS the shot instead of
      // eating it — re-stamped per frame, no flash spam, keep scanning.
      if (c.domeMode === 'slow') {
        p.stall = Math.min(p.stall ?? 1, c.domeSlow ?? 0.35);
        continue;
      }
      nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: 14, color: d.color, life: 0.2, maxLife: 0.2 });
      if (c.domeMode === 'deflect') {
        p.dir += Math.PI;
        p.guideDir = p.dir;
        // Polar flights keep their angle (position stays continuous) —
        // the caster swap re-tethers an orbiter to the dome's owner.
        { let nativeRecordSource: Actor; p.caster = nativeRecordSource = d.owner ?? d; nativeHost.reassignCombatRecordSource("projectiles", p, nativeRecordSource, d); }
        p.hits.clear();
        p.traveled = 0;
      } else {
        p.dissolved = true; // eaten whole — no dying explosion
        return true;
      }
      break;
    }

    return false;
  }

export function sceneNoteLightningTravel(nativeHost: NativeSceneCombatHost, p: Projectile, from: Vec2): void {
    if (!lightningProfile(p.inst.def.id) || p.dissolved) return;
    const to = p.phase ? p.pos : nativeHost.clipShot(from, p.pos, p.tier);
    if (dist(from, to) < .01) return;
    let flash = nativeHost.lightningFlashes.get(p);
    if (!flash || !nativeHost.flashes.includes(flash)) {
      if (nativeHost.flashes.filter(f => f.lightning).length >= LIGHTNING_STYLE.maxTraces) return;
      flash = { pos: { ...to }, radius: p.radius, color: p.color, life: LIGHTNING_STYLE.fadeSeconds, maxLife: LIGHTNING_STYLE.fadeSeconds,
        recoveryCueTier: p.tier ?? 0, lightning: { skillId: p.inst.def.id, width: p.radius, clock: p.age, points: [] } };
      nativeHost.lightningFlashes.set(p, flash); nativeHost.flashes.push(flash);
    }
    flash.pos = { ...to }; flash.color = p.color; flash.life = flash.maxLife;
    flash.lightning!.width = p.radius;
    extendLightningTrace(flash.lightning!, from, to, p.age);
  }

export function sceneUpdateProjectiles(nativeHost: NativeSceneCombatHost, dt: number): void {
    const guardianContext = nativeHost.guardians.active ? nativeHost.carriedEffectContext() : undefined;
    const flowDt = dt; // the world-scaled frame; each flight bends it below
    for (let i = nativeHost.projectiles.length - 1; i >= 0; i--) {
      const p = nativeHost.projectiles[i];
const nativeRecordScope = nativeHost.beginCombatRecord("projectiles", p);
try {
      // THE TIMEFLOW BEND (engine/timeflow.ts): a projectile flies on its
      // CASTER's clock — a held caster's volley hangs mid-air and lands
      // when time resumes (the frozen quiver is half the time-stop
      // fantasy). The shadowed `dt` bends age, travel, zaps and steering.
      const ptf = nativeHost.timeflow.actorScale(p.caster);
      if (ptf <= 0) continue;
      const dt = ptf === 1 ? flowDt : flowDt * ptf;
      nativeHost.attackSequences.flight(p);
      const prev = vec(p.pos.x, p.pos.y);
      p.pos = nativeHost.advanceProjectile(p, dt);
      // Keep `dir` pointing along actual motion for rendering & chains.
      if (p.guided && dist(prev, p.pos) > 0.5) p.dir = angleTo(prev, p.pos);

      // THE FOURTH WALL's FRAME REBOUND (projFrameBounce / frameBounce):
      // a free flight banks off the edge of its caster's governing view
      // frame, range and hit ledger re-armed (the re-throw idiom) — the
      // shot stays a live threat while its rebounds last. Tethered and
      // destined flights are exempt: an orbit, a spiral, a return leg, an
      // arc-to hook, a patrol shuttle and a catch-spot landing all own
      // their geometry.
      if (p.frameBounces && p.frameBounces > 0
        && !(p.orbit > 0) && !(p.spiral > 0) && !p.returnPhase
        && !p.destAt && !p.patrol && !p.landAt) {
        const fw = frameReflect(p.pos.x, p.pos.y, p.guideDir, p.radius,
          nativeHost.viewRectFor(p.caster), FOURTH_WALL_CFG.proj.edgePad);
        if (fw) {
          p.frameBounces--;
          p.pos.x = fw.x;
          p.pos.y = fw.y;
          p.guideDir = p.dir = fw.dir;
          p.anchor.x = fw.x;
          p.anchor.y = fw.y;
          p.traveled = 0;
          p.hits.clear();
          nativeHost.flashes.push({
            pos: vec(fw.x, fw.y), radius: p.radius + FOURTH_WALL_CFG.proj.flashPad,
            color: p.color, life: 0.18, maxLife: 0.18,
          });
        }
      }

      // CATCH-SPOT ARRIVAL (Whirlaxe): the axe PLANTS as a catchable
      // embed at its marked circle — the run-over collect machinery pays
      // the charge to whoever walks it (i.e., you, if you make the catch).
      if (p.landAt && dist(p.pos, p.landAt) < 16) {
        const cspec = (p.inst.def.delivery as ProjectileDelivery).catchSpot;
        if (cspec && !p.caster.dead) {
          nativeHost.spawnConstruct(p.caster, p.inst, {
            type: 'construct', kind: 'embed',
            // Not a lodged spear: the marked circle with the steel lying
            // in it (catchSpot.look overrides per skill).
            look: cspec.look ?? CATCH_SPOT_LOOK,
            range: 0, duration: cspec.duration ?? 5, maxActive: 4,
            invulnerable: true, placeRange: 9999,
            embed: {
              runOver: 'collect',
              collect: { charge: cspec.charge, amount: cspec.amount, max: cspec.max },
            },
          }, p.pos, undefined, vec(p.landAt.x, p.landAt.y));
        }
        p.dissolved = true;
        nativeHost.projectiles.splice(i, 1);
        continue;
      }

      const tethered = p.orbit > 0 || p.spiral > 0 || p.returnPhase;
      // BOUNDLESS zones (the Descent) have no arena edge — a projectile lives until
      // its RANGE is spent (or terrain blocks it below); the perimeter cull would
      // otherwise kill every shot the instant the player roamed past the starter box.
      let dead = p.traveled >= p.range
        || (p.maxAge !== undefined && p.age >= p.maxAge)
        || (!tethered && !nativeHost.arena.boundless
            && (p.pos.x < 0 || p.pos.x > nativeHost.arena.w || p.pos.y < 0 || p.pos.y > nativeHost.arena.h));
      // Did a fatal end land ON A BODY (pierce spent, guarded stop) rather
      // than spend itself (range, walls, arrivals)? The SequelSpec
      // 'hit'|'expire' lever reads this at the death payout below.
      let diedOnBody = false;
      // The return-arrival splinter already fired this frame (guards the
      // unspent-end bloom below against double payment).
      let shrapnelBloomed = false;
      // Spent projectiles that return get a second life instead of dying.
      if (dead && nativeHost.enterReturn(p)) dead = false;
      // Homeward arrival — CATCHABLE returns (Gyreblade) bank their charge
      // in the catcher's hand before fading.
      if (!dead && p.returnPhase && dist(p.pos, nativeHost.returnTarget(p)) < 26) {
        if ((p.returnPasses ?? 1) > 1) {
          // THE RE-THROW (kindred returns): a socketed return on a native
          // returner deepens the flight to a SECOND full pass — the blade
          // turns at the hand and flies its whole road again, onward along
          // its current heading; the TRUE catch (charge, shrapnel) pays at
          // the final homecoming only. The ordinary enterReturn machinery
          // brings this fresh out-leg home again by itself.
          p.returnPasses = (p.returnPasses ?? 1) - 1;
          p.returnPhase = false;
          p.traveled = 0;
          p.range = p.range0 ?? p.range;
          p.origin = vec(p.pos.x, p.pos.y);
          p.hits.clear();
          nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: p.radius + 6, color: p.color, life: 0.18, maxLife: 0.18 });
        } else {
          const ct = (p.inst.def.delivery as ProjectileDelivery).catch;
          if (ct && !p.caster.dead) {
            p.caster.gainCharge(ct.charge, ct.amount, ct.max, p.inst);
            nativeHost.flashes.push({
              pos: vec(p.caster.pos.x, p.caster.pos.y), radius: p.caster.radius + 8,
              color: p.color, life: 0.2, maxLife: 0.2,
            });
          }
          // SHREDDING RETURN (returnShrapnel stat): the homecoming splinters
          // — shards ring OUTWARD from the catch point.
          if (nativeHost.shedFlightShrapnel(p)) shrapnelBloomed = true;
          dead = true;
        }
      }
      // ARC-TO arrival: the hook lands on the mark and DETONATES there.
      if (!dead && p.destAt && p.arcRate && dist(p.pos, p.destAt) < 16) dead = true;
      // Terrain blocks flight: rocks and cliffs stop projectiles cold
      // (chasms don't — you can shoot across a gap you can't walk) — or
      // BOUNCE it (Galewisp): reflect off the obstacle's normal and fly on.
      // PHASING flights (occlusion 'free' / Wraith Passage) skip terrain
      // entirely — through rock and masonry like mist.
      if (!dead && !p.phase) {
        for (const o of nativeHost.doodadsAt(p.pos.x, p.pos.y)) {
          // THE TIER FABRIC: a flight only meets ITS layer's furniture — a
          // duct bolt neither shatters nor stops on the street's pots above.
          if ((o.tier ?? 0) !== (p.tier ?? 0)) continue;
          // BRITTLE 'hit': the arrow finds it — pots shatter, hidden faces
          // give. Flight continues unless the kind also blocks shots (a
          // secret wall stops the arrow THAT opened it).
          const br = doodadRuleOf(o.kind).brittle;
          if (br && !o.gone && br.on.includes('hit')
            && nativeHost.projTouches(p, o.pos.x, o.pos.y, o.radius)) {
            nativeHost.popBrittle(o, p.caster ?? null, p.pos); // the arrow's seat = the strike point
          }
          if (!blocksProjectiles(o)) continue;
          if (o.gone) continue; // popped this very step — nothing left to hit
          // Arrows fly UNDER the leaves and stop on the bole — or on the true
          // slab face (hit-surface fabric): a shot slips through a doorway
          // beside a closed door's slab line instead of dying on the old
          // breach-spanning circle.
          if (shapeContains(hitSurfaceOf(o, 'shot'), o.pos.x, o.pos.y, p.pos.x, p.pos.y, nativeHost.projNose(p) + 1e-9)) {
          nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: p.radius + 6, color: p.color, life: 0.18, maxLife: 0.18, fx: hitVoiceOf(p.conductElem ?? skillBaseTypeOf(p.inst.def.baseDamage), 'wall') }); // THE ARROW'S END on a surface: its type's voice, a shaft dusts
            if (p.bounces && p.bounces > 0) {
              p.bounces--;
              const surf = hitSurfaceOf(o, 'shot');
              if (surf.kind === 'circle') {
                // Reflect the heading across the circle's outward normal —
                // the classic path, byte-for-byte (crown-radius step-clear).
                const nx = Math.cos(angleTo(o.pos, p.pos)), ny = Math.sin(angleTo(o.pos, p.pos));
                const dx = Math.cos(p.guideDir), dy = Math.sin(p.guideDir);
                const dot2 = 2 * (dx * nx + dy * ny);
                p.guideDir = p.dir = Math.atan2(dy - dot2 * ny, dx - dot2 * nx);
                // Step clear of the surface so one wall isn't hit twice.
                p.pos.x = o.pos.x + nx * (o.radius + p.radius + 2);
                p.pos.y = o.pos.y + ny * (o.radius + p.radius + 2);
              } else {
                // Oblong surface: reflect across the face normal and step
                // clear along it — a shot banks off a door slab like a wall.
                const push = pushOutOfShape(surf, o.pos.x, o.pos.y, p.pos.x, p.pos.y, p.radius + 2);
                if (push) {
                  const dx = Math.cos(p.guideDir), dy = Math.sin(p.guideDir);
                  const dot2 = 2 * (dx * push.nx + dy * push.ny);
                  p.guideDir = p.dir = Math.atan2(dy - dot2 * push.ny, dx - dot2 * push.nx);
                  p.pos.x = push.x; p.pos.y = push.y;
                }
              }
              p.anchor.x = p.pos.x; p.anchor.y = p.pos.y;
            } else {
              dead = true;
              SIM_TAP.current?.onOccluded?.('proj');
            }
            break;
          }
        }
      }
      // Grid masonry uses the same exact traversal as lineOfFire: fast
      // flights and thin corner crossings cannot fall between samples.
      // Region flags, deck heights and hanging partitions share one law.
      const flightGrid = regionGrid(nativeHost.walk); // worldmass projectiles share the same wall/bounce law
      if (!dead && !p.phase && flightGrid) {
        const sdx = p.pos.x - prev.x, sdy = p.pos.y - prev.y;
        const elev = nativeHost.shotElev(prev, p.tier ?? 0);
        const hitT = castGridRay(flightGrid, prev, p.pos, 'shot', elev);
        if (hitT !== null) {
          const sx = prev.x + sdx * hitT, sy = prev.y + sdy * hitT;
          nativeHost.flashes.push({ pos: vec(sx, sy), radius: p.radius + 6, color: p.color, life: 0.18, maxLife: 0.18, fx: hitVoiceOf(p.conductElem ?? skillBaseTypeOf(p.inst.def.baseDamage), 'wall') });
          if (p.bounces && p.bounces > 0) {
            p.bounces--;
            // Back off by at most half a cell, then test the two axes with
            // the same height-aware ray. A hanging partition can bank a shot
            // upstairs while leaving ground-floor flight untouched.
            const step = flightGrid.cellSize / 2;
            const safeT = Math.max(0, hitT - 1 / Math.max(1, Math.ceil(Math.hypot(sdx, sdy) / step)));
            const safe = vec(prev.x + sdx * safeT, prev.y + sdy * safeT);
            const blockedX = castGridRay(flightGrid, safe,
              vec(safe.x + Math.sign(sdx) * step, safe.y), 'shot', elev) !== null;
            const blockedY = castGridRay(flightGrid, safe,
              vec(safe.x, safe.y + Math.sign(sdy) * step), 'shot', elev) !== null;
            const dx = Math.cos(p.guideDir), dy = Math.sin(p.guideDir);
            p.guideDir = p.dir = Math.atan2(blockedY || !blockedX ? -dy : dy,
              blockedX || !blockedY ? -dx : dx);
            p.pos.x = safe.x; p.pos.y = safe.y;
            p.anchor.x = safe.x; p.anchor.y = safe.y;
          } else {
            // End effects belong at the struck face, not beyond the wall.
            p.pos.x = sx; p.pos.y = sy;
            dead = true;
            SIM_TAP.current?.onOccluded?.('proj');
          }
        }
      }
      // Selective pierce: a dead prey RETARGETS the hunt (Heartchaser).
      if (!dead && p.preyId !== undefined) {
        const prey = nativeHost.actorById(p.preyId);
        if (!prey || prey.dead) {
          let best: Actor | null = null, bd = 700;
          for (const e of nativeHost.enemiesOf(p.caster)) {
            const dd = dist(p.pos, e.pos);
            if (dd < bd) { bd = dd; best = e; }
          }
          p.preyId = best?.id ?? -1; // -1 = no prey left; it flies out clean
        }
      }

      if (!dead && nativeHost.satellites.visuals.length) {
        const reflected = nativeHost.satellites.reflectProjectiles(p.caster, p.tier ?? 0, prev, p.pos, p.radius, nativeHost.carriedEffectContext());
        if (reflected) {
          p.pos = reflected.at;
          nativeHost.reflectParriedProjectile(p, reflected.owner, reflected.power);
          nativeHost.flashes.push({ pos: { ...p.pos }, radius: reflected.radius, color: reflected.color, life: 0.18, maxLife: 0.18 });
          if (p.dissolved) nativeHost.projectiles.splice(i, 1);
          continue;
        }
      }
      // A charged guardian catches an incoming path before its body hit or
      // auxiliary payload. Dissolution uses the existing no-explosion ending.
      if (!dead && guardianContext) {
        const caught = nativeHost.guardians.intercept(p.caster, p.tier ?? 0, prev, p.pos, p.radius, guardianContext);
        if (caught) { p.pos = caught; p.dissolved = true; dead = true; }
      }

      // A parry returns the captured wound. Geometry, terrain and rendering
      // remain the normal flight; original cast riders cannot create fresh
      // ungoverned damage under the defender's ownership.
      if (p.parryDamage) {
        let parryTurned = false;
        if (!dead) dead = nativeHost.interceptProjectileDomes(p);
        if (!dead) {
          for (const enemy of nativeHost.enemiesOf(p.caster)) {
            if (p.age < (p.hits.get(enemy.id) ?? -Infinity)) continue;
            const touch = nativeHost.projTouchesBody(p, enemy);
            if (!touch) continue;
            const raw = Object.values(parryCounter(p.parryDamage).amounts).reduce((s, v) => s + (v ?? 0), 0);
            const reflections = p.parryDamage.reflections;
            if (nativeHost.tryGuardBlock(enemy, p.caster, p.pos, raw, p)) {
              dead = p.parryDamage.reflections === reflections || !!p.dissolved;
              parryTurned = !dead;
              if (dead) p.dissolved = true;
              break;
            }
            p.hits.set(enemy.id, p.rehit ? p.age + p.rehit : Infinity);
            p.lastHitId = enemy.id;
            noteBodyHit(enemy, touch.seg);
            nativeHost.resolveParryDamage(p.caster, enemy, p.parryDamage, 1, p.pos);
            if (!p.rehit && --p.pierce < 0) dead = true;
            if (!dead && p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
            break;
          }
        }
        if (!dead && !parryTurned && nativeHost.lite.liveCount && nativeHost.liteProjectileSweep(p, prev.x, prev.y)) dead = true;
        if (dead) {
          nativeHost.explodeProjectile(p, p.lastHitId);
          nativeHost.projectiles.splice(i, 1);
        }
        continue;
      }

      // PATH DESTRUCTION (ProjTrailSpec): every `every` units the projectile
      // drops a blast and/or a lingering ground zone where it flies — drag a
      // guided missile around and it writes an arc of ruin.
      if (!dead && p.trailSpec && p.traveled >= p.trailNext && !p.returnPhase) {
        p.trailNext += p.trailSpec.every;
        const ts = p.trailSpec;
        const tTags = skillContextTags(p.inst.def);
        const tExtra = instanceMods(p.inst);
        const aoeMul = p.caster.sheet.get('aoeRadius', tTags, tExtra);
        if (ts.blast) {
          const radius = ts.blast.radius * aoeMul;
          for (const e of nativeHost.enemiesOf(p.caster)) {
            if (e.id === p.lastHitId) continue;
            if (dist(p.pos, e.pos) - e.radius > radius) continue;
            nativeHost.resolveHit(p.caster, p.inst, e, (ts.blast.damageScale ?? 0.35) * p.mult, 1, p.flat, false, false, undefined, p.origin, p.tier);
          }
          nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius, color: p.color, life: 0.22, maxLife: 0.22 });
          // THE MALLET: each path-blast is a fresh strike surface — on the
          // FLIGHT's story (the projectile law), not the caster's current one.
          nativeHost.frontSplash(p.caster, p.inst, p.pos, radius);
          nativeHost.strikeSurfaces(p.caster, p.pos, radius, undefined, undefined, p.tier ?? 0);
        }
        if (ts.zone) {
          // The drop-zone composables (DropZoneSpec): a size envelope
          // breathes each drop from its own birth radius, and the linger
          // can ride the flight's LIVE pace at this very drop — a
          // decelerating lob's early drops and late drops age apart.
          const tso = resolveSizeOver(ts.zone.sizeOver);
          const tLinger = ts.zone.duration
            * speedLingerMul(ts.zone.durationBySpeed, p.speed)
            * p.caster.sheet.get('effectDuration', tTags, tExtra);
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: vec(p.pos.x, p.pos.y),
            radius: ts.zone.radius * aoeMul * (tso?.from ?? 1),
            caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.inst), color: p.color,
            delay: 0, exploded: true,
            linger: tLinger, linger0: tLinger,
            tickInterval: ts.zone.tickInterval ?? 0.5, tickTimer: ts.zone.tickInterval ?? 0.5,
            shape: 0, facing: p.dir,
            dmgMult: (ts.zone.damageScale ?? 0.3) * p.mult, depth: 1,
            forceDamage: true,
            sizeOver: tso,
            radius0: tso ? ts.zone.radius * aoeMul : undefined,
            flatBonus: p.flat,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
      }

      // FISSURE TRAIL (Earthrender): the flight is the TEAR-HEAD of a
      // crack — a fissure-segment zone rips open at each travel mark, so
      // the chain follows the ACTUAL path (zigzag cracks, bouncing cracks:
      // the trajectory levers bend the wound). The chain is recorded for
      // the closing pass.
      if (!dead && p.fisSpec && p.traveled >= (p.fisNext ?? 0) && !p.returnPhase) {
        const fs = p.fisSpec;
        p.fisNext = (p.fisNext ?? 0) + fs.radius * 1.1;
        (p.fisChain ??= []).push(vec(p.pos.x, p.pos.y));
        const fTags = skillContextTags(p.inst.def, grantedTags(p.inst));
        const fExtra = instanceMods(p.inst);
        // The crack's TEXTURE grafts ride the travelling tear exactly as
        // they ride a laid fissure (parity with layFissure): volatility,
        // arming and the roulette all work on Earthrender's wound — and
        // impose a linger where the trail's own is too brief for a game.
        const volatile = socketSpec(p.inst, 'fissureVolatile');
        const aftershock = socketSpec(p.inst, 'fissureAftershock');
        const roulette = socketSpec(p.inst, 'fissureRoulette');
        const baseLinger = (volatile || aftershock || roulette)
          ? Math.max(fs.linger, 5) : fs.linger;
        const linger = baseLinger * p.caster.sheet.get('effectDuration', fTags, fExtra);
        {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
          pos: vec(p.pos.x, p.pos.y),
          radius: fs.radius * p.caster.sheet.get('aoeRadius', fTags, fExtra),
          caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.inst), color: p.color,
          delay: 0.05, exploded: false,
          linger,
          tickInterval: fs.tickInterval ?? 0.4, tickTimer: 0,
          shape: 0, facing: p.dir,
          dmgMult: (fs.damageScale ?? 0.7) * p.mult, depth: 1,
          volatile: volatile
            ? { ...volatile, next: nativeHost.time + 0.05 + volatile.interval } : undefined,
          aftershock: aftershock
            ? { ...aftershock, readyAt: nativeHost.time + 0.05 } : undefined,
          roulette: roulette
            ? { ...roulette, next: nativeHost.time + 0.05 + roulette.interval, armedUntil: 0 } : undefined,
          flatBonus: p.flat,
        });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
      }

      // PROJECTILE-BORNE FIELD (Soulflay): the flight WEARS a DoT field —
      // chunked ticks (the tether cadence) on everything near the shot as
      // it passes. No status, no hit-lock: proximity to the wake is the sin.
      if (!dead && p.auraAmounts && p.auraRadius) {
        p.auraTick = (p.auraTick ?? PROJ_AURA_TICK) - dt;
        if (p.auraTick <= 0) {
          p.auraTick += PROJ_AURA_TICK;
          for (const e of nativeHost.enemiesOf(p.caster)) {
            if (dist(p.pos, e.pos) - e.radius > p.auraRadius) continue;
            const tick: Partial<Record<DamageType, number>> = {};
            for (const [k, v] of Object.entries(p.auraAmounts)) {
              tick[k as DamageType] = (v ?? 0) * PROJ_AURA_TICK;
            }
            const taken = mitigateTyped(e, tick);
            if (taken > 0) {
              e.life -= taken;
              e.hitFlash = 0.1;
              e.hitFlashType = dominantTypeOf(tick);
              nativeHost.accumulateDotText(e, taken, PROJ_AURA_TICK, p.caster); // THE WIRE'S EYES: the flight's caster
              if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, p.caster);
            }
          }
        }
      }

      // Emitters: shed sub-projectiles as they travel.
      if (!dead && p.emit) {
        p.emit.timer -= dt;
        if (p.emit.timer <= 0) {
          p.emit.timer = p.emit.interval;
          const ang = p.emit.pattern === 'random' ? rand(0, Math.PI * 2)
            : p.emit.pattern === 'forward' ? p.dir
            : (p.emit.angle += 2.39996); // golden-angle rotation
          const espec = (p.inst.def.delivery as ProjectileDelivery).emit;
          nativeHost.spawnProjectile(p.caster, p.emit.inst, p.pos, ang,
            { inherit: nativeHost.inheritedFlight(p, espec?.inherit), depth: p.depth + 1, mult: p.mult });
        }
      }

      if (!dead) dead = nativeHost.interceptProjectileDomes(p);

      // THE MALLET IN FLIGHT: your own shot rings your own bell as it
      // passes — the flight-side sibling of the brittle 'hit' pop in the
      // terrain sweep above. Rehit windows ride the same p.hits ledger the
      // bodies use; the flight continues (your construct never eats the
      // shot), and automaton-fired shots (turrets) ring nothing.
      if (!dead && !p.caster.construct) {
        for (const c of nativeHost.actors) {
          if (c.dead || !c.construct?.castOnStruck || c.team !== p.caster.team) continue;
          if (c.tier !== (p.tier ?? 0)) continue; // its story's bells only (layer sovereignty)
          const until = p.hits.get(c.id);
          if (until !== undefined && p.age < until) continue;
          if (!nativeHost.projTouches(p, c.pos.x, c.pos.y, c.radius)) continue;
          p.hits.set(c.id, p.rehit ? p.age + p.rehit : Infinity);
          if (nativeHost.ringBell(c)) {
            nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: 14, color: p.color, life: 0.15, maxLife: 0.15 });
          }
        }
      }
      if (!dead) {
        for (const enemy of nativeHost.enemiesOf(p.caster)) {
          const until = p.hits.get(enemy.id);
          if (until !== undefined && p.age < until) continue;
          // SELECTIVE PIERCE (Heartchaser): everything but the prey is
          // mist — the arrow passes harmlessly through the crowd.
          if (p.preyId !== undefined && enemy.id !== p.preyId) continue;
          const bodyTouch = nativeHost.projTouchesBody(p, enemy);
          if (bodyTouch) {
            // A raised shield in the projectile's path stops it cold —
            // no pierce, no chain, no statuses. Just a dent in the shield.
            const parryPacket = rollSkillDamage(p.caster, p.inst, p.flat);
            const guardRaw = Object.values(parryPacket.amounts)
              .reduce((s, v) => s + (v ?? 0), 0) * p.mult;
            if (guardRaw > 0 && nativeHost.tryGuardBlock(enemy, p.caster, p.pos, guardRaw, p, parryPacket)) {
              dead = !p.parryDamage || !!p.dissolved;
              diedOnBody = true; // a guarded stop still struck someone
              break;
            }
            p.hits.set(enemy.id, p.rehit ? p.age + p.rehit : Infinity);
            p.lastHitId = enemy.id;
            // Conduction payload: the inherited element rides the hit in.
            let condFlat: Partial<Record<DamageType, number>> | undefined;
            if (p.conductElem) {
              const amt = 5 + p.inst.level * 2;
              condFlat = { [p.conductElem]: amt };
              if (chance(0.35)) {
                const STATUS_OF = { fire: 'burn', cold: 'chill', lightning: 'shock', chaos: 'poison' } as const;
                nativeHost.withCombatStatusSource(enemy, undefined, undefined, () => enemy.applyStatus(STATUS_OF[p.conductElem!],
                  p.conductElem! === 'fire' || p.conductElem! === 'chaos' ? amt * 0.4 : 0,
                  1, 'conduction'));
              }
            }
            // Launch-baked flat (paid-cost bonus) + conduction payload ride
            // the impact together.
            let hitFlat = condFlat;
            if (p.flat) {
              hitFlat = { ...p.flat };
              if (condFlat) {
                for (const [k, v] of Object.entries(condFlat)) {
                  hitFlat[k as DamageType] = (hitFlat[k as DamageType] ?? 0) + (v ?? 0);
                }
              }
            }
            noteBodyHit(enemy, bodyTouch.seg);
            nativeHost.attackSequences.beforeContact(p);
            nativeHost.resolveHit(p.caster, p.inst, enemy, p.mult, 0, hitFlat, false, false, undefined, p.origin, p.tier);
            // THE HIT VOICE (engine/bodyVoices.ts): the impact speaks the blow's type — fire flares, cold crackles, lightning sparks, chaos spatters, a shaft flecks the body.
            nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: 14, color: p.color, life: 0.18, maxLife: 0.18, fx: hitVoiceOf(enemy.hitFlashType ?? p.conductElem ?? skillBaseTypeOf(p.inst.def.baseDamage), 'body') });
            // SHATTER: the first impact flings a fan of shard projectiles
            // onward, raking the cone behind the victim. A skill's INNATE
            // shatter (Ice Spear) and the projShrapnel stat (the Shrapnel
            // support) STACK: the stat adds shards to the fan, and skills
            // with no shatter of their own fling the generic shard.
            const shat = (p.inst.def.delivery as ProjectileDelivery).shatter;
            const innate = shat && SKILLS[shat.skillId] ? shat : undefined;
            const shardCount = (innate?.count ?? 0) + p.shrapnel;
            const shardSkill = SKILLS[innate?.skillId ?? SHRAPNEL_SKILL];
            if (shardCount > 0 && !p.shattered && shardSkill && p.depth < PROJ_CHILD_DEPTH_MAX) {
              p.shattered = true;
              const spread = (innate?.spreadDeg ?? 70) * Math.PI / 180;
              const inherit = nativeHost.inheritedFlight(p, innate?.inherit);
              for (let s = 0; s < shardCount; s++) {
                const off = shardCount === 1 ? 0 : (s / (shardCount - 1) - 0.5) * spread;
                nativeHost.spawnProjectile(p.caster,
                  makeSkillInstance(shardSkill, effectiveSkillLevel(p.inst)),
                  vec(p.pos.x, p.pos.y), p.dir + off,
                  { inherit, depth: p.depth + 1, mult: p.mult });
                // Shards rake the cone BEHIND the victim — never the victim
                // itself (they spawn inside its body).
                nativeHost.projectiles[nativeHost.projectiles.length - 1].hits.set(enemy.id, Infinity);
              }
            }
            // A recoverable weapon lands after ordinary impact payloads fire.
            if (nativeHost.attackSequences.contact(p, enemy)) { dead = true; diedOnBody = true; break; }
            // RECURVE (Heartchaser): a chance to whip around and strike the
            // SAME heart again — the odds decay per miracle; the victim's
            // hit-lock clears after a breath so the re-strike is legal.
            if (p.recurveChance && p.recurveChance > 0 && chance(p.recurveChance)) {
              const rc = (p.inst.def.delivery as ProjectileDelivery).trajectory?.recurve;
              p.recurveChance *= rc?.decay ?? 0.8;
              p.hits.set(enemy.id, p.age + 0.3);
              p.dir = p.guideDir = p.dir + Math.PI + rand(-0.5, 0.5);
              p.traveled = 0;
              if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
              break;
            }
            // CAROM ON HIT (the no-pierce Galewisp): the body DEFLECTS the
            // flight — battered off at a wide angle, victim locked briefly.
            if (p.caromLock !== undefined) {
              p.hits.set(enemy.id, p.age + Math.max(0.2, p.caromLock));
              p.dir = p.guideDir = angleTo(enemy.pos, p.pos) + rand(-0.9, 0.9);
              p.traveled = 0;
              if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
              break;
            }
            // A zig-zag that kinks ON hits turns here too (Skittering Bolt).
            {
              const zz = (p.inst.def.delivery as ProjectileDelivery).trajectory?.zigzag;
              if (p.zig && zz?.onHit) nativeHost.kinkProjectile(p, zz);
            }
            // CATCH SPOT (Whirlaxe): the FIRST flesh struck redirects the
            // axe to a marked circle near the caster — catch it there.
            {
              const cspec = (p.inst.def.delivery as ProjectileDelivery).catchSpot;
              if (cspec && !p.landAt && !p.caster.dead) {
                const ang = rand(0, Math.PI * 2);
                const r = rand(70, cspec.nearRadius ?? 115);
                p.landAt = nativeHost.clampPos(vec(
                  p.caster.pos.x + Math.cos(ang) * r,
                  p.caster.pos.y + Math.sin(ang) * r), 12);
                p.traveled = 0;
                p.range = 1e9;          // the trip to the circle is free
                p.maxAge = undefined;
                nativeHost.flashes.push({
                  pos: vec(p.landAt.x, p.landAt.y), radius: 26, color: p.color,
                  life: 0.9, maxLife: 0.9, edgeFrac: 0.8,
                });
                if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
                break;
              }
            }
            // FULMINATE (projHitDetonate): an explosive payload detonates on
            // every hit the projectile SURVIVES — each rehit, pierce, and
            // chain — not just where the flight ends (which still bursts).
            if (p.rehit) {
              if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
              // THE DRIFTER JAILBREAK (2026-07-22, the user's override
              // call): a CHAIN socketed into a re-hitting flight CONVERTS
              // its road — the orb leaves this victim and hunts the next
              // in its own slow body (ball lightning that chains, at its
              // own comically deliberate pace; an orbiter BREAKS ITS
              // TETHER to do it). Socketing the chain is the choice; the
              // rehit ledger still locks the victim it leaves, so every
              // hop is a real departure. Same reach and firing-line law
              // as the terminal chain ladder below — one hop grammar.
              if (p.chains > 0) {
                let next: Actor | null = null;
                let bestD = 280;
                for (const cand of nativeHost.enemiesOf(p.caster)) {
                  if (cand === enemy || cand.dead) continue;
                  const until = p.hits.get(cand.id);
                  if (until !== undefined && p.age < until) continue;
                  const dd = dist(p.pos, cand.pos);
                  if (dd >= bestD) continue;
                  if (!p.phase && !nativeHost.lineOfFire(p.pos, cand.pos, p.tier)) continue;
                  bestD = dd; next = cand;
                }
                if (next) {
                  p.chains--;
                  if (p.orbit > 0 || p.spiral > 0) {
                    // The tether snaps: the blade stops circling anyone
                    // and flies as its own hunter from where it stands.
                    p.orbit = 0; p.spiral = 0;
                    p.orbRadius = 0; p.orbitR0 = 0;
                    p.anchor = vec(p.pos.x, p.pos.y);
                    p.guided = p.spin > 0 || p.weave > 0;
                  }
                  p.dir = p.guideDir = angleTo(p.pos, next.pos);
                  p.traveled = 0;
                  // Cascade of Knives: the shatter RE-ARMS for the next leg.
                  if (p.reShatter) p.shattered = false;
                }
              } else if (p.forks > 0) {
                // THE SPLIT (the fork jailbreak): the orb DIVIDES on the
                // body — two children drift onward as THEMSELVES (rehit,
                // pace and all; forkProjectile hands down forks−1 and the
                // victim locks), the parent spent in the division. Chain
                // hops first when both are socketed — the terminal
                // ladder's own precedence, worn by the drifter.
                nativeHost.forkProjectile(p);
                dead = true;
                diedOnBody = true;
              }
              break; // re-hitting projectiles sail on through
            }
            if (p.pierce > 0) {
              p.pierce--; // pierce takes precedence over chaining
              if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
            } else if (p.chains > 0) {
              // Chain: veer toward the nearest enemy not yet struck — one
              // the hop has a firing line to (no chaining through masonry;
              // phasing flights hop through anything).
              let next: Actor | null = null;
              let bestD = 280;
              for (const cand of nativeHost.enemiesOf(p.caster)) {
                if (p.hits.has(cand.id)) continue;
                const dd = dist(p.pos, cand.pos);
                if (dd >= bestD) continue;
                if (!p.phase && !nativeHost.lineOfFire(p.pos, cand.pos, p.tier)) continue;
                bestD = dd; next = cand;
              }
              if (next) {
                p.chains--;
                p.dir = p.guideDir = angleTo(p.pos, next.pos);
                p.traveled = 0; // fresh leg of travel
                // Cascade of Knives: the shatter RE-ARMS for the next leg.
                if (p.reShatter) p.shattered = false;
                if (p.hitDetonate) nativeHost.explodeProjectile(p, enemy.id);
              } else if (p.forks > 0 && !p.returnPhase) {
                nativeHost.forkProjectile(p);
                dead = true; // the parent is consumed by the split
              } else if (nativeHost.enterReturn(p)) {
                // flies home, striking everything again en route
              } else {
                dead = true;
              }
            } else if (p.forks > 0 && !p.returnPhase) {
              nativeHost.forkProjectile(p);
              dead = true;
            } else if (nativeHost.enterReturn(p)) {
              // homeward
            } else {
              dead = true;
            }
            if (dead) diedOnBody = true; // the flight ENDED on this body
            break;
          }
        }
      }
      // The newly reflected flight starts its return on the next update;
      // never hit something on the stale, incoming movement segment.
      nativeHost.noteLightningTravel(p, prev);
      if (p.parryDamage) {
        if (dead) nativeHost.projectiles.splice(i, 1);
        continue;
      }
      // THE LITE TIER (engine/lite.ts): the flight mows the pool along this
      // step — cross-team only, honoring the pierce budget (a non-piercing
      // arrow spends on the first gnat; rehit orbs chew through freely).
      // Runs AFTER real-body impacts: a full actor that stopped the flight
      // spares the cloud behind it.
      if (!dead && nativeHost.lite.liveCount && nativeHost.liteProjectileSweep(p, prev.x, prev.y)) {
        dead = true;
        diedOnBody = true;
      }
      // Ball Lightning: periodic zaps to everything near the flight path.
      const zap = (p.inst.def.delivery as ProjectileDelivery).zap;
      if (!dead && zap) {
        p.zapTimer = (p.zapTimer ?? zap.interval) - dt;
        if (p.zapTimer <= 0) {
          p.zapTimer = zap.interval;
          let zapped = false;
          for (const e of nativeHost.enemiesOf(p.caster)) {
            if (dist(p.pos, e.pos) - e.radius > zap.radius) continue;
            nativeHost.resolveHit(p.caster, p.inst, e, (zap.damageScale ?? 0.5) * p.mult, 1, undefined, false, false, undefined, p.origin, p.tier);
            zapped = true;
          }
          if (zapped) {
            nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: zap.radius, color: p.color, life: 0.15, maxLife: 0.15 });
          }
        }
      }

      // SUFFUSION: a projectile crossing one of YOUR ground effects
      // CARRIES it onward — the field re-blooms where the flight ends
      // (the inverse of the field-dropping trail supports).
      if (!dead && !p.suffuse) {
        const suf = p.caster.sheet.get('suffusion',
          skillContextTags(p.inst.def), instanceMods(p.inst));
        if (suf > 0) {
          for (const z of nativeHost.zones) {
const nativeRecordScope = nativeHost.beginCombatRecord("zones", z);
try {
            if (!z.exploded || z.linger <= 0 || z.caster.team !== p.caster.team || (z.tier ?? z.caster.tier) !== (p.tier ?? 0)) continue;
            if (z.inst.def.id === p.inst.def.id) continue; // no self-loops
            if (dist(p.pos, z.pos) > z.radius + p.radius) continue;
            p.suffuse = {
              inst: z.inst, radius: Math.max(30, z.radius * 0.75),
              linger: Math.min(2.5, Math.max(0.8, z.linger)),
              dmgMult: z.dmgMult * 0.6,
            };
            nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: p.radius + 8, color: z.color, life: 0.2, maxLife: 0.2 });
            break;
          
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        }
      }
      // Conduction: a conductive projectile crossing an elemental field or
      // hazardous ground INHERITS the element for the rest of its flight.
      if (!dead && p.conductive && !p.conductElem) {
        for (const z of nativeHost.zones) {
const nativeRecordScope = nativeHost.beginCombatRecord("zones", z);
try {
          if (!z.exploded || z.caster.team !== p.caster.team || (z.tier ?? z.caster.tier) !== (p.tier ?? 0)) continue;
          if (dist(p.pos, z.pos) > z.radius + p.radius) continue;
          const elem = (['fire', 'cold', 'lightning'] as const)
            .find(e => z.inst.def.tags.includes(e));
          if (elem) { p.conductElem = elem; break; }
        
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
        if (!p.conductElem) {
          const ground = nativeHost.groundAt(p.pos);
          if (ground?.kind === 'bog' || ground?.kind === 'swamp') p.conductElem = 'chaos';
          else if (ground?.kind === 'ice') p.conductElem = 'cold';
        }
        if (p.conductElem) {
          nativeHost.flashes.push({ pos: vec(p.pos.x, p.pos.y), radius: p.radius + 6, color: REMNANT_COLORS[p.conductElem as RemnantElement] ?? '#9ec83a', life: 0.2, maxLife: 0.2 });
        }
      }
      if (dead) {
        nativeHost.explodeProjectile(p, p.lastHitId);
        // SHREDDING RETURN, THE UNSPENT END (2026-07-22): a flight that
        // ends WITHOUT dying on a body — range spent, aged out, stopped by
        // masonry, out of bounds — splinters where its road ends, exactly
        // like the homecoming catch. A body-death SPENDS the flight (the
        // blow was the payoff); returns already bloomed at the catch;
        // dissolved flights (dome-eaten) leave nothing, as everywhere.
        if (!diedOnBody && !shrapnelBloomed && !p.dissolved) {
          nativeHost.shedFlightShrapnel(p);
        }
        // SUFFUSION delivery: the carried field re-blooms at the terminus.
        if (p.suffuse && !p.dissolved) {
          {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
            pos: vec(p.pos.x, p.pos.y), radius: p.suffuse.radius,
            caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.suffuse.inst), color: p.suffuse.inst.def.color,
            delay: 0, exploded: true,
            linger: p.suffuse.linger,
            tickInterval: 0.4, tickTimer: 0,
            shape: 0, facing: p.dir,
            dmgMult: p.suffuse.dmgMult, depth: 1,
          });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        }
        // END ZONE (Blightspear): the cloud blooms where the flight DIES —
        // impact or spent range alike; the zone ticks the skill's roll.
        {
          const ez = (p.inst.def.delivery as ProjectileDelivery).endZone;
          if (ez && !p.dissolved && !p.caster.dead) {
            const zTags = skillContextTags(p.inst.def, grantedTags(p.inst));
            const zExtra = instanceMods(p.inst);
            // Drop-zone composables (DropZoneSpec): the bloom can breathe
            // (sizeOver) and its linger can ride the DYING speed — a spent,
            // stalled lob seeds a different pool than a hard impact.
            const ezo = resolveSizeOver(ez.sizeOver);
            const ezRadius = ez.radius * p.caster.sheet.get('aoeRadius', zTags, zExtra);
            const ezLinger = ez.duration
              * speedLingerMul(ez.durationBySpeed, p.speed)
              * p.caster.sheet.get('effectDuration', zTags, zExtra);
            {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
              pos: vec(p.pos.x, p.pos.y),
              radius: ezRadius * (ezo?.from ?? 1),
              caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.inst), color: p.color,
              delay: 0, exploded: true,
              linger: ezLinger, linger0: ezLinger,
              tickInterval: ez.tickInterval ?? 0.5, tickTimer: 0,
              shape: 0, facing: p.dir,
              dmgMult: (ez.damageScale ?? 0.5) * p.mult, depth: 1,
              // Creeping Frost: the bloom HUNTS (see GroundDelivery.seek).
              seek: ez.seek ? { speed: ez.seek.speed, range: ez.seek.range ?? 420 } : undefined,
              sizeOver: ezo,
              radius0: ezo ? ezRadius : undefined,
              flatBonus: p.flat,
            });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
          }
        }
        // SEQUEL (SequelSpec): the completion is itself a CAST — the
        // payload skill fires from the death point, aimed onward along
        // the flight, at the host's effective level. The 'on' lever picks
        // which ending counts; seqDepth lids authored cycles; dissolved
        // flights (dome-eaten) leave nothing, as everywhere.
        {
          const sq = instanceSequel(p.inst);
          const seqDepth = p.inst.state?.seqDepth ?? 0;
          if (sq && !p.dissolved && !p.caster.dead && SKILLS[sq.skillId]
            && seqDepth < SEQUEL_CFG.maxDepth
            && (sq.on ?? 'any') !== (diedOnBody ? 'expire' : 'hit')
            && chance(sq.chance ?? 1)) {
            const sdef = SKILLS[sq.skillId];
            const minted = makeSkillInstance(sdef, effectiveSkillLevel(p.inst));
            (minted.state ??= {}).seqDepth = seqDepth + 1;
            // procCue: the terminal payload appears at its real landing site.
            nativeHost.executeSkill(p.caster, minted, vec(
              p.pos.x + Math.cos(p.dir) * 60, p.pos.y + Math.sin(p.dir) * 60), {
              targetInfo: { pos: vec(p.pos.x, p.pos.y) },
              dmgMult: (sq.damageScale ?? 1) * p.mult,
              noCooldown: true, noRepeat: true, noFollowUp: true, keepFacing: true,
            });
          }
        }
        // FISSURE TRAIL closing passes: the crack SNAPS SHUT — a pass
        // zipping from the death point back HOME over the recorded chain,
        // faster than it opened (the layFissure close-pass cadence). A
        // socketed Restless Wound grants the pass where the skill brings
        // none and rolls FURTHER re-closings, first miss ending the chain.
        const freclose = socketSpec(p.inst, 'fissureReclose');
        const fclose = p.fisSpec?.close
          ?? (freclose ? { delay: freclose.interval, damageScale: freclose.damageScale } : undefined);
        if (fclose && p.fisSpec && p.fisChain?.length && !p.caster.dead) {
          const fs = p.fisSpec;
          const fTags = skillContextTags(p.inst.def, grantedTags(p.inst));
          const fExtra = instanceMods(p.inst);
          const closeRadius = fs.radius * p.caster.sheet.get('aoeRadius', fTags, fExtra);
          const beat = (fs.radius * 1.1) / (Math.max(60, p.speed) * 1.4);
          const n = p.fisChain.length;
          let passes = 1;
          if (freclose) {
            for (let k = 0; k < freclose.times && chance(freclose.chance); k++) passes++;
          }
          for (let pass = 0; pass < passes; pass++) {
            const start = fclose.delay + pass * (beat * n + (freclose?.interval ?? 0.8));
            const scale = pass === 0 ? fclose.damageScale : freclose!.damageScale;
            for (let k = 0; k < n; k++) {
              const pt = p.fisChain[n - 1 - k]; // far end first: zip home
              {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
                pos: vec(pt.x, pt.y), radius: closeRadius,
                caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.inst), color: p.color,
                delay: start + beat * k, exploded: false,
                linger: 0, tickInterval: 0.5, tickTimer: 0,
                shape: 0, facing: p.dir,
                dmgMult: scale * p.mult, depth: 1,
                flatBonus: p.flat,
              });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
            }
          }
        }
        // A POURED SWARM on a flight (the 'litePour' effect — engine/
        // lite.ts): the pod bursts where the flight ENDED — every honest
        // end (range spent, wall, the body that stopped it), never at the
        // hand. Cast-time deliveries pour in executeSkill's chain instead.
        if (!p.caster.dead) {
          for (const fx of instanceEffects(p.inst)) {
            if (fx.type === 'litePour') nativeHost.litePourAt(p.caster, fx, p.pos);
            // A PLANTED LURE on a flight: the false light stands where the
            // flight ENDED (the litePour hook's twin — bait you can throw).
            if (fx.type === 'lure') {
              nativeHost.setLure(`skill#${p.caster.id}#${p.inst.def.id}`, p.pos, fx.radius,
                fx.pace ?? 0.5, fx.standoff ?? 90, fx.sec, p.tier ?? 0);
            }
            // A LINGERING GROUND on a flight: the pool blooms where the
            // flight ENDED (the litePour hook's kin — the lobbed rite
            // pools on the ground it struck, never at the hand). Scales
            // re-fold from the sheet exactly as executeSkill's cast-time
            // spawnZone branch folds them — the two sites must agree.
            if (fx.type === 'spawnZone') {
              const zTags = skillContextTags(p.inst.def, grantedTags(p.inst));
              const zExtra = instanceMods(p.inst);
              {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
                pos: vec(p.pos.x, p.pos.y),
                radius: fx.radius * p.caster.sheet.get('aoeRadius', zTags, zExtra),
                caster: (nativeRecordSource = p.caster), inst: (nativeRecordInstance = p.inst), color: p.color,
                delay: 0, exploded: true,
                linger: fx.duration * p.caster.sheet.get('effectDuration', zTags, zExtra),
                tickInterval: fx.tickInterval ?? 0.5, tickTimer: 0,
                shape: p.caster.sheet.get('aoeShape', zTags, zExtra),
                facing: p.dir,
                dmgMult: (fx.damageScale ?? 0.5) * p.mult, depth: 1,
              });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
            }
          }
          // A BIRTH on a flight (THE CLUTCH FABRIC): bodies stand where the
          // flight ENDED — every honest end, the litePour law. onHit rows
          // wait for resolveHit's per-victim gate (the sprite bursts from
          // the wound, never from a spent arrow in the dirt); a dissolved
          // flight (eaten by a dome) births nothing, the sequel's own law.
          {
            const fb = instanceBirth(p.inst);
            if (fb && !fb.onHit && !p.dissolved) nativeHost.birthAt(p.caster, p.inst, fb, p.pos);
          }
          // THE DIN (the watch fabric): a noisy flight RINGS where it ends —
          // wall, floor, range's edge or the body that stopped it — so a
          // thrown bolt is a LURE any watcher in earshot walks to (noiseAt
          // caps at the search rung; the stat is the radius).
          const din = p.caster.sheet.get('noiseOnHit',
            skillContextTags(p.inst.def), instanceMods(p.inst));
          if (din > 0) nativeHost.noiseAt(vec(p.pos.x, p.pos.y), din, p.caster);
        }
        // PLANT ON LAND (#17): the spent projectile stands where it fell —
        // a small anchor object the rest of the kit interacts with
        // (Tripwire Web fences between planted spears, gems willing).
        const pd = p.inst.def.delivery;
        if (pd.type === 'projectile' && pd.plantOnLand && !p.caster.dead) {
          // With an EmbedSpec the plant is a live EMBEDMENT (run-over
          // triggers, emissions, sibling beams); bare plants stay barriers.
          nativeHost.spawnConstruct(p.caster, p.inst, {
            type: 'construct', kind: pd.plantOnLand.embed ? 'embed' : 'barrier',
            range: 0, duration: pd.plantOnLand.duration,
            maxActive: pd.plantOnLand.embed ? 8 : 6,
            life: pd.plantOnLand.life ?? 25,
            placeRange: 9999,
            embed: pd.plantOnLand.embed,
          }, vec(p.pos.x, p.pos.y), undefined, vec(p.pos.x, p.pos.y));
        }
        nativeHost.projectiles.splice(i, 1);
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateZones(nativeHost: NativeSceneCombatHost, dt: number): void {
    // SPARKFIELD RELEASE: armed sparks wait for their channel to END —
    // release OR interrupt, either way the field discharges. Detonation
    // runs in PLACEMENT order (or shuffled — the Chaotic Discharge flip),
    // one spark per interval: the chain the player wound up, played back.
    {
      let releasing: Map<string, typeof nativeHost.zones> | null = null;
      for (const z of nativeHost.zones) {
const nativeRecordScope = nativeHost.beginCombatRecord("zones", z);
try {
        z.tier ??= z.caster.tier; // THE FIELD'S STORY, settled once
        if (!z.armed) continue;
        const holding = !z.caster.dead && z.caster.casting?.mode === 'channel'
          && z.caster.casting.inst.def.id === z.inst.def.id;
        if (holding) continue;
        releasing ??= new Map();
        const key = z.caster.id + ':' + z.inst.def.id;
        if (!releasing.has(key)) releasing.set(key, []);
        releasing.get(key)!.push(z);
      
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
      if (releasing) {
        for (const zs of releasing.values()) {
let nativeReleaseRecord: typeof nativeHost.zones[number];
let nativeReleaseScope: ReturnType<NativeSceneCombatHost["beginCombatRecord"]> | undefined;
try {
          const d0 = (nativeReleaseRecord = zs[0], nativeReleaseScope = nativeHost.beginCombatRecord("zones", nativeReleaseRecord), nativeReleaseRecord).inst.def.delivery;
          const spec = d0.type === 'storm' ? d0.awaitRelease : undefined;
          const order = socketSpec(zs[0].inst, 'releaseOrder') ?? spec?.order ?? 'placed';
          const interval = spec?.interval ?? 0.08;
          zs.sort((a2, b2) => (a2.armSeq ?? 0) - (b2.armSeq ?? 0));
          if (order === 'random') {
            for (let k = zs.length - 1; k > 0; k--) {
              const j = Math.floor(Math.random() * (k + 1));
              [zs[k], zs[j]] = [zs[j], zs[k]];
            }
          }
          zs.forEach((z2, k) => {
const nativeRecordScope = nativeHost.beginCombatRecord("zones", z2);
try {
            z2.armed = undefined;
            z2.delay = 0.05 + k * interval;
            z2.delay0 = z2.delay;
          
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
});
        
} finally { if (nativeReleaseScope) nativeHost.endCombatRecord(nativeReleaseScope); }
}
      }
    }
    for (let i = nativeHost.zones.length - 1; i >= 0; i--) {
      const z = nativeHost.zones[i];
const nativeRecordScope = nativeHost.beginCombatRecord("zones", z);
try {
      if (z.attackPattern && (z.caster.dead || z.caster.aiSkillBans?.has(z.inst.def.id))) {
        nativeHost.expireZone(z); nativeHost.zones.splice(i, 1); continue;
      }
      if (!z.exploded) {
        z.delay -= dt;
        if (z.delay <= 0) {
          z.exploded = true;
          // The pulse clock starts at the ACTUAL impact — placements whose
          // telegraph was collapsed (Thundermark's ripple) stay honest.
          if (z.pulse) z.pulse.next = nativeHost.time + z.pulse.delay;
          for (const victim of nativeHost.zoneVictims(z)) {
            if (!inAoe(z.pos, z.radius, z.shape, z.facing, victim.pos, victim.radius, z.arcRad)) continue;
            // THE GROUNDED STRIKE (StormDelivery.onGround — the crone's
            // boil): only a body whose own grid cell wears a named ground
            // is bitten — the same read the region-sense stamps (the cell
            // under the centre, the wading truth); the shore inside the
            // ring stays dry. Drawn == tested: the telegraph roils exactly
            // these cells (render/vis/boilLayer.ts groundedCellsIn).
            if (z.onGround) {
              const gk = nativeHost.walk?.regionAt?.(victim.pos.x, victim.pos.y);
              if (!gk || !z.onGround.includes(gk)) continue;
            }
            // EDGE BAND (the inheritance law): a sequel wearing the
            // strike's edgeOnly spares the eye exactly as the strike did.
            if (z.edgeFrac && dist(z.pos, victim.pos) + victim.radius < z.radius * z.edgeFrac) continue;
            // The sky's wrath passes over the unroused (Zone.spareDormant).
            if (z.spareDormant && isDormant(victim)) continue;
            // — and over the ROOFED (Zone.spareRoofed): the same shelter the
            // wind honors (underRoofAt). The thatch takes the bolt.
            if (z.spareRoofed && nativeHost.underRoofAt(victim.pos)) continue;
            // Fill-in zones: the hollow center is (briefly) safe — and the
            // hole wears the zone's own shape (zoneHoleSpares).
            if (zoneHoleSpares(z, victim.pos, victim.radius)) continue;
            // Walls shield (occlusion): a victim walled off from the
            // placement is spared its blast.
            if (!nativeHost.zoneSees(z, victim)) continue;
            // Sweep surfaces: one hit per crossing, never per tick.
            if (z.struck) {
              if (z.struck.has(victim.id)) continue;
              z.struck.add(victim.id);
            }
            nativeHost.resolveHit(z.caster, z.inst, victim, z.dmgMult, z.depth, z.flatBonus, z.forceDamage, false, undefined, z.pos, z.tier);
          }
          // THE MALLET: the placement's impact strikes the surfaces with
          // its victims' own gates (sweeps share the crossing ledger).
          nativeHost.strikeZoneSurfaces(z);
          nativeHost.flashes.push({
            pos: vec(z.pos.x, z.pos.y), radius: z.radius, color: z.color,
            life: 0.35, maxLife: 0.35, shape: z.shape, facing: z.facing, arcRad: z.arcRad,
            edgeFrac: z.edgeFrac,
            // Native storms use their source silhouette. Unkeyed weather
            // keeps its legacy sky bolt; keyed mortars never borrow it.
            bolt: !z.fx && z.hitAll && !z.meteor, meteor: z.meteor,
            fx: z.fx, onGround: z.onGround?.slice(), recoveryCueTier: z.tier ?? z.caster.tier,
          });
          z.onImpact?.(); // a meteor crater spits a demon / leaves a corpse
          // THE CLUTCH FABRIC: a birth-bearing strike's landing is a womb —
          // bodies stand in the blast ring (a dead mother's shells land
          // barren, the litePour law's living-caster gate).
          if (z.birth && !z.caster.dead) nativeHost.birthAt(z.caster, z.inst, z.birth, z.pos);
          if (z.impactDress) nativeHost.plantImpactDress(z); // the blast pocks the ground (drying)
          // THUNDERMARK: one marker firing PULLS THE WHOLE SET — every
          // living kin marker's telegraph collapses to a quick ripple.
          if (z.marker) {
            let k = 1;
            for (const other of nativeHost.zones) {
const nativeRecordScope = nativeHost.beginCombatRecord("zones", other);
try {
              if (other === z || other.exploded || !other.marker) continue;
              if (other.caster !== z.caster || other.inst.def.id !== z.inst.def.id) continue;
              other.delay = Math.min(other.delay, 0.06 * k++);
            
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
          }
          nativeHost.spawnAftershocks(z.caster, z.inst, z.pos, z.radius, z.shape, z.depth);
          // The impact leaves real terrain behind (Icy Comet's ice sheet).
          if (z.leaveTerrain) {
            nativeHost.addTempGround(z.pos, z.leaveTerrain.kind,
              z.leaveTerrain.radius, z.leaveTerrain.duration
              * z.caster.sheet.get('effectDuration', skillContextTags(z.inst.def), instanceMods(z.inst)));
          }
          if (z.linger <= 0) { nativeHost.expireZone(z); nativeHost.zones.splice(i, 1); continue; }
        }
      } else {
        // Creeping zones advance along their facing.
        if (z.drift && !z.seek) {
          z.pos = nativeHost.clampPos(vec(
            z.pos.x + Math.cos(z.facing) * z.drift * dt,
            z.pos.y + Math.sin(z.facing) * z.drift * dt), 10);
        }
        // SEEKING GROUNDS (Creeping Frost): the lingering field SLINKS
        // toward the nearest living enemy — a patch of winter with
        // intent. Nothing in reach, nothing moves; breakable furniture
        // is never prey. Where seek exists, drift's straight line yields.
        if (z.seek) {
          let prey: Actor | null = null;
          let bd = z.seek.range;
          for (const e of nativeHost.enemiesOf(z.caster)) {
            if (e.construct?.breakable) continue;
            const dd = dist(z.pos, e.pos);
            if (dd < bd) { bd = dd; prey = e; }
          }
          if (prey && bd > 6) {
            const ang = angleTo(z.pos, prey.pos);
            z.pos = nativeHost.clampPos(vec(
              z.pos.x + Math.cos(ang) * z.seek.speed * dt,
              z.pos.y + Math.sin(ang) * z.seek.speed * dt), 10);
          }
        }
        // WORN fields ride their caster (Blizzard Coil's mantle) — the
        // field dies with them, mid-linger.
        if (z.follow) {
          if (z.caster.dead) { nativeHost.expireZone(z); nativeHost.zones.splice(i, 1); continue; }
          z.pos.x = z.caster.pos.x; z.pos.y = z.caster.pos.y;
        }
        // ANCHORED fields ride an arbitrary actor and die with IT (Risen
        // Offering: shatter the turret and the incense disperses).
        if (z.anchor) {
          if (z.anchor.dead) { nativeHost.expireZone(z); nativeHost.zones.splice(i, 1); continue; }
          z.pos.x = z.anchor.pos.x; z.pos.y = z.anchor.pos.y;
        }
        // Per-CROSSING surfaces (rearmOnExit): victims who left the surface
        // re-arm — the wall hurts every walk-through, not once per life.
        if (z.struck && z.rearm && z.struck.size) {
          for (const id of [...z.struck]) {
            const v = nativeHost.actorById(id);
            if (!v || v.dead || !nativeHost.zoneHas(z, v.pos, v.radius)) {
              z.struck.delete(id);
            }
          }
        }
        // SIZE ENVELOPE (Zone.sizeOver): the radius WALKS radius0×from →
        // radius0×to across the whole linger on its named curve — the
        // duration-normalized breath. `to: 0` contracts into obscurity
        // exactly as the linger dies; from < to blooms from a seed. THE
        // radius authority while present: grow/retract stand down (one
        // authority per disc); pulses, endBursts, pulls and rendering read
        // the live radius, so they breathe with it. A frozen clock
        // (toggled fields) holds the breath where it stands.
        if (z.sizeOver && z.radius0 !== undefined && (z.linger0 ?? 0) > 0) {
          const t = ((z.linger0 ?? 1) - Math.max(0, z.linger)) / (z.linger0 ?? 1);
          const s = evalCurve(z.sizeOver.curve, t);
          z.radius = Math.max(0, z.radius0
            * (z.sizeOver.from + (z.sizeOver.to - z.sizeOver.from) * s));
        } else {
          // The Squall's breath: growth until the mark, then the ring pulls
          // back in — retraction SUPERSEDES growth (one direction at a time).
          // `fizzle` instead ENDS the zone at the apex: the endBurst fires at
          // full spread and the ring is gone (the expansion-only Squall).
          const retracting = z.retract !== undefined
            && (z.linger0 ?? 0) - z.linger >= z.retract.at;
          if (retracting && z.retract!.fizzle) {
            z.linger = Math.min(z.linger, 0);
          } else {
            // Growing zones swell as they live — the upchurn gathers ground.
            if (z.grow && !retracting) z.radius += z.grow * dt;
            if (retracting) z.radius = Math.max(10, z.radius - (z.retract!.speed ?? 100) * dt);
          }
        }
        // VOLATILE fissure segments re-light on their own clock — the
        // volcanic crag: unpredictable, re-armed, still honest (the flash
        // leads the wound by a beat via the telegraph below).
        if (z.volatile && z.exploded && z.linger > 0 && nativeHost.time >= z.volatile.next) {
          z.volatile.next = nativeHost.time + z.volatile.interval;
          if (chance(z.volatile.chance)) {
            nativeHost.flashes.push({
              pos: vec(z.pos.x, z.pos.y), radius: z.radius + 10,
              color: z.color, life: 0.3, maxLife: 0.3,
            });
            for (const v of nativeHost.zoneVictims(z)) {
              const nb = bodyWhere(v, (bp, br) => nativeHost.zoneHas(z, bp, br));
              if (!nb) continue;
              if (!nativeHost.zoneSees(z, v)) continue;
              noteBodyHit(v, nb.seg);
              nativeHost.resolveHit(z.caster, z.inst, v,
                z.dmgMult * z.volatile.damageScale, z.depth, z.flatBonus, true, false, undefined, z.pos, z.tier);
            }
            // THE MALLET: each re-light is a fresh blast (no sweep ledger).
            nativeHost.strikeZoneSurfaces(z, false);
          }
        }
        // AFTERSHOCK segments (the whack-a-mole): the CASTER running over
        // an armed stretch of crack detonates it around that piece.
        if (z.aftershock && z.exploded && z.linger > 0
          && nativeHost.time >= z.aftershock.readyAt
          && nativeHost.detonateFissureSegment(z, z.aftershock.damageScale, z.aftershock.radiusScale ?? 2.4)) {
          z.aftershock.readyAt = nativeHost.time + z.aftershock.rearm;
        }
        // ROULETTE segments (Seismic Waltz): the floor deals a fresh armed
        // step on its own clock; crossing while the window holds detonates
        // — then that stretch goes quiet until it's dealt again.
        if (z.roulette && z.exploded && z.linger > 0) {
          if (nativeHost.time >= z.roulette.next) {
            z.roulette.next = nativeHost.time + z.roulette.interval;
            if (nativeHost.time >= z.roulette.armedUntil && chance(z.roulette.chance)) {
              z.roulette.armedUntil = nativeHost.time + z.roulette.window;
            }
          }
          if (nativeHost.time < z.roulette.armedUntil
            && nativeHost.detonateFissureSegment(z, z.roulette.damageScale, z.roulette.radiusScale ?? 2.2)) {
            z.roulette.armedUntil = 0;
          }
        }
        // ARMED PULSE (GroundDelivery.pulse / SupportDef.pulse): the
        // dormant placement DETONATES AGAIN on its clock — the quake after
        // the blow. Each pulse re-runs the placement's full hit (damage,
        // statuses, knockback ride resolveHit as at impact) and the
        // ordinary explosion arteries: Aftershocks' aoeScatter scatters
        // every pulse, procs see the zone's normal depth. Discs quake at
        // radius × radiusMult (the warning ring's TRUE reach); segments
        // stay capsules (a crack's width is its width). A sweep's
        // once-per-life ledger is NOT consulted — the pulse is a fresh
        // blast, not a crossing — and a fill-in cage's hollow stays safe
        // mid-pulse exactly as at impact.
        if (z.pulse && z.pulse.left > 0 && z.linger > 0 && nativeHost.time >= z.pulse.next) {
          z.pulse.left--;
          z.pulse.next = nativeHost.time + z.pulse.interval;
          // The bouncing ball walks: this beat fires at the LIVE values,
          // then interval/damage/reach step for the next (quickening and
          // softening as the ground settles — or the reverse; the floor
          // keeps a deep taper from dividing into the frame).
          z.pulse.interval = Math.max(0.05, z.pulse.interval * z.pulse.intervalStep);
          const pr = z.seg ? z.radius : z.radius * z.pulse.radiusMult;
          for (const v of nativeHost.zoneVictims(z)) {
            const nb = bodyWhere(v, (bp, br) =>
              (z.seg
                ? nativeHost.zoneHas(z, bp, br)
                : inAoe(z.pos, pr, z.shape, z.facing, bp, br, z.arcRad))
              // EDGE BAND (the inheritance law): the quake keeps the eye.
              && !(z.edgeFrac && dist(z.pos, bp) + br < pr * z.edgeFrac)
              && !zoneHoleSpares(z, bp, br));
            if (!nb) continue;
            // The sky's wrath passes over the unroused (Zone.spareDormant) —
            // each quake beat keeps the impact's own law.
            if (z.spareDormant && isDormant(v)) continue;
            if (!nativeHost.zoneSees(z, v)) continue;
            noteBodyHit(v, nb.seg);
            nativeHost.resolveHit(z.caster, z.inst, v,
              z.dmgMult * z.pulse.dmgMult, z.depth, z.flatBonus, z.forceDamage, false, undefined, z.pos, z.tier);
          }
          // THE MALLET: each quake beat is a fresh blast (no sweep ledger)
          // at the pulse's true reach — discs quake at pr, segments stay
          // their own capsule, matching the victims' containment exactly.
          nativeHost.strikeZoneSurfaces(z, false,
            z.seg ? undefined : z.pos, z.seg ? undefined : pr);
          nativeHost.flashes.push({
            pos: vec(z.pos.x, z.pos.y), radius: pr, color: z.color,
            life: 0.35, maxLife: 0.35, shape: z.shape, facing: z.facing, arcRad: z.arcRad,
            edgeFrac: z.edgeFrac,
            fx: ['nova', 'melee', 'cone', 'leap', 'storm'].includes(instanceDelivery(z.inst).type) ? z.fx : undefined,
            onGround: z.onGround?.slice(), recoveryCueTier: z.tier ?? z.caster.tier,
          });
          nativeHost.spawnAftershocks(z.caster, z.inst, z.pos, pr, z.shape, z.depth);
          z.pulse.dmgMult *= z.pulse.dmgStep;
          z.pulse.radiusMult *= z.pulse.radiusStep;
          // THE QUEUE HAND-OFF (kindred rule): the native rhythm spent,
          // appended gems' beats load in their own authored character —
          // absolute payloads, gap-from-this-beat clocks.
          if (z.pulse.left === 0 && z.pulse.queue?.length) {
            const q = z.pulse.queue.shift()!;
            z.pulse.left = 1;
            z.pulse.next = nativeHost.time + q.delay;
            z.pulse.dmgMult = q.dmgMult;
            z.pulse.radiusMult = q.radiusMult;
          }
        }
        // Revolving zones sweep their facing around (Cinderwhirl's flame
        // hand) — faced shapes only feel it; discs spin invisibly.
        if (z.rotate) z.facing += z.rotate * dt;
        // PENDULUM (the Metronome): the facing swings side-to-side across
        // the cast bearing — the wedge scythes east-west, not forward.
        if (z.pendulum) {
          const lived = (z.linger0 ?? 0) - z.linger;
          z.facing = z.pendulum.base
            + Math.sin((lived / z.pendulum.period) * Math.PI * 2) * (z.pendulum.arc / 2);
        }
        // ONE SWEEP (Reaver's Sweep): a single crossing over the whole
        // linger — the blade passes once and is done.
        if (z.sweep && (z.linger0 ?? 0) > 0) {
          const prog = clamp(1 - z.linger / z.linger0!, 0, 1);
          z.facing = z.sweep.base - z.sweep.arc / 2 + z.sweep.arc * prog;
        }
        // Vortex zones drag victims toward their center — the suction may
        // reach past the damage disc (pullRadius: the event horizon).
        if (z.pull) {
          const reach = z.pullRadius ?? z.radius * 1.35;
          for (const v of nativeHost.enemiesOf(z.caster)) {
            if (v.construct || v.leap || v.anchored) continue;
            const dd = dist(z.pos, v.pos);
            if (dd - v.radius > reach || dd < 6) continue;
            const stepIn = Math.min(z.pull * dt, dd - 4);
            const ang = angleTo(v.pos, z.pos);
            // Origin-aware confine (a MOVE): suction drags a victim along a
            // grid wall's face — never snapToWalkable's cell-center hop.
            v.pos = nativeHost.clampPos(vec(
              v.pos.x + Math.cos(ang) * stepIn,
              v.pos.y + Math.sin(ang) * stepIn), v.radius, v.pos);
          }
        }
        // Pillar of Flame: the cage closes — the safe center shrinks away.
        // CRESCENT fills stop at the crescent's own inner rim (0.55R): the
        // deadzone in front of the caster is real, and the visual must
        // never promise damage the annulus won't deliver (Wildfire Sweep).
        if (z.edge !== undefined && z.fillRate) {
          const floor = z.shape === AOE_SHAPE.crescent ? 0.55 : 0;
          z.edge = Math.max(floor, z.edge - z.fillRate * dt);
        }
        // EMITTER zones cast their payload on the beat: at random ground
        // inside ('point' — fissure bursts) or at random enemies standing
        // in the zone ('enemy' — storm bolts; the beat skips when empty).
        if (z.emit && SKILLS[z.emit.skillId]) {
          // The emitter's LIVE beat: seeded from the spec, evolved by any
          // cadence (emitStep) per salvo — an eruption that settles, a
          // storm that quickens. Never mutate the def's shared spec.
          z.emitInterval ??= z.emit.interval;
          z.emitTimer = (z.emitTimer ?? z.emitInterval) - dt;
          if (z.emitTimer <= 0) {
            z.emitTimer += z.emitInterval;
            if (z.emitStep && z.emitStep !== 1) {
              z.emitInterval = Math.max(0.05, z.emitInterval * z.emitStep);
            }
            z.emitInst ??= makeSkillInstance(SKILLS[z.emit.skillId], z.inst.level);
            const n = z.emit.count ?? 1;
            for (let k = 0; k < n; k++) {
              let at: Vec2 | null = null;
              if ((z.emit.at ?? 'point') === 'enemy') {
                // `reach` inflates the victim's radius for the containment
                // test — a margin around the zone's edge (and along a
                // fissure's whole capsule) where the lashes still find you.
                const pool = nativeHost.zoneVictims(z).filter(v =>
                  nativeHost.zoneHas(z, v.pos, v.radius + (z.emit!.reach ?? 0)));
                if (pool.length) { const v = pick(pool); at = vec(v.pos.x, v.pos.y); }
              } else {
                const ang = rand(0, Math.PI * 2);
                const r = Math.sqrt(Math.random()) * z.radius;
                at = vec(z.pos.x + Math.cos(ang) * r, z.pos.y + Math.sin(ang) * r);
              }
              if (!at) break;
              // BEARING: projectile payloads with a cursor origin rise AT
              // the point and fly this way — 'random' scatters each spirit,
              // 'out' fires outward through the point. The facing is
              // borrowed for the one call (keepFacing leaves it alone
              // inside), then handed straight back.
              const keepDir = z.caster.facing;
              if (z.emit.bearing === 'random') {
                z.caster.facing = rand(0, Math.PI * 2);
              } else if (z.emit.bearing === 'out') {
                z.caster.facing = dist(z.pos, at) < 1
                  ? rand(0, Math.PI * 2) : angleTo(z.pos, at);
              }
              nativeHost.executeSkill(z.caster, z.emitInst, at, {
                dmgMult: z.dmgMult, noCooldown: true, noRepeat: true, keepFacing: true,
              });
              z.caster.facing = keepDir;
            }
          }
        }
        // DOMAIN zones dress and strip occupants as they cross the rim.
        if (z.domain && z.domainKey) nativeHost.updateZoneDomain(z);
        // LINGERING FUME (GroundDelivery.exposure): breath before bite —
        // each occupant's CONTINUOUS dwell accrues per frame (the madden
        // ledger, frame-accurate: the grace is shorter than a tick), and
        // stepping out clears the lungs — re-entry restarts the clock.
        // FUME DOMAINS breathe on EVERYONE the domain could dress: allies
        // soak the incense on the same clock enemies drink the stupor
        // (the pool mirrors updateZoneDomain's own filter).
        if (z.exposure && z.linger > 0) {
          const pool = z.exposureDomain && z.domain
            ? nativeHost.actors.filter(a => !a.dead && !a.untargetable && !a.construct)
            : nativeHost.zoneVictims(z);
          for (const v of pool) {
            if (nativeHost.zoneHas(z, v.pos, v.radius)) {
              z.exposure.dwell.set(v.id, (z.exposure.dwell.get(v.id) ?? 0) + dt);
            } else {
              z.exposure.dwell.delete(v.id);
            }
          }
        }
        // THE MADNESS BANK (SupportDef.madden): dwell long enough in the
        // skill's ground and the fog takes you — the maddened lash at
        // whatever is nearest, either side. Seconds bank PER FRAME (never a
        // tick's worth at once: a 9s tick no longer maddens on first touch,
        // a tickless sweep surface no longer banks nothing), credited once a
        // frame per body however many of the skill's placements overlap it.
        // Leaving keeps the bank (accumulated, unlike breath); the madness
        // spends it. Enemies on the field's story only — zoneVictims'
        // curse-allies coin would draw rng every frame.
        if (z.madden && z.linger > 0) {
          const bank = z.madden;
          const story = z.tier ?? z.caster.tier;
          for (const v of nativeHost.enemiesOf(z.caster)) {
            if (v.tier !== story || bank.credited.get(v.id) === nativeHost.time) continue;
            if (!nativeHost.zoneHas(z, v.pos, v.radius)) continue;
            bank.credited.set(v.id, nativeHost.time);
            const dwelt = (bank.dwell.get(v.id) ?? 0) + dt;
            if (dwelt + MADDEN_CFG.epsilon >= bank.after && !v.statuses.some(s => s.id === 'maddened')) {
              nativeHost.withCombatStatusSource(v, undefined, undefined, () => v.applyStatus('maddened', baselineStatusDps('maddened', nativeHost.zone.level),
                1, z.inst.def.name, { casterId: nativeHost.selectCombatStatusSource(z.caster).id }));
              bank.dwell.set(v.id, 0);
            } else {
              bank.dwell.set(v.id, dwelt);
            }
          }
        }
        // TOGGLED fields (Miasma) freeze their clock — they end by choice
        // (re-press), by their caster's death, or with the zone itself.
        if (!z.toggled) z.linger -= dt;
        z.tickTimer -= dt;
        if (z.tickTimer <= 0) {
          z.tickTimer = z.tickInterval;
          // HEALING GROUND (healField graft): the tick mends the
          // congregation instead of striking the trespassers.
          if (z.healTick) {
            const hp = z.caster.sheet.get('healPower',
              skillContextTags(z.inst.def), instanceMods(z.inst));
            for (const ally of nativeHost.actors) {
              if (ally.dead || ally.team !== z.caster.team || ally.tier !== (z.tier ?? z.caster.tier)) continue; // (the field's story)
              if (!nativeHost.zoneHas(z, ally.pos, ally.radius)) continue;
              const got = ally.healBy(z.healTick * hp);
              if (got > 0.5) nativeHost.seatText(z.caster, ally.pos, '+' + Math.round(got), '#8ae0a8', 10); // THE WIRE'S EYES: the healer's seat
            }
          } else {
          if (z.struck && instanceDelivery(z.inst).type === 'melee') {
            nativeHost.releaseStruckSummons(z.caster, z.inst, body => nativeHost.zoneHas(z, body.pos, body.radius), z.struck, z.facing);
          }
          for (const victim of nativeHost.zoneVictims(z)) {
            // SEGMENT FABRIC: the ground catches whichever hittable body
            // stands on it — a coil parked in the fire burns as honestly
            // as a head (containment + edge hollow judged per body; plain
            // monsters keep the exact classic test).
            const nb = bodyWhere(victim, (bp, br) =>
              nativeHost.zoneHas(z, bp, br)
              && !(z.edge && dist(z.pos, bp) + br < z.radius * z.edge));
            if (!nb) continue;
            // The sky's wrath passes over the unroused (Zone.spareDormant) —
            // on the tick as at impact: a lingering eruption keeps the law.
            if (z.spareDormant && isDormant(victim)) continue;
            // Fume zones: the unexposed breathe free. Gated BEFORE the
            // sweep ledger so an unbitten crossing never burns its
            // once-per-life entry on a hit that didn't land.
            if (z.exposure && (z.exposure.dwell.get(victim.id) ?? 0) < z.exposure.after) continue;
            // Walls shield (occlusion): walled off from the field = spared.
            if (!nativeHost.zoneSees(z, victim)) continue;
            // Sweep surfaces: one hit per crossing, never per tick.
            if (z.struck) {
              if (z.struck.has(victim.id)) continue;
              z.struck.add(victim.id);
            }
            noteBodyHit(victim, nb.seg);
            nativeHost.resolveHit(z.caster, z.inst, victim, z.dmgMult, z.depth, z.flatBonus, z.forceDamage, false, undefined, z.pos, z.tier);
          }
          // THE MALLET: the tick strikes the surfaces with its victims'
          // own gates — a drifting crescent rings the bell once per
          // crossing (the shared sweep ledger); a lingering field re-rings
          // on the bell's own throttle, exactly as enemy fields do through
          // resolveHit.
          nativeHost.strikeZoneSurfaces(z);
          }
          // CONSECRATIONS: the field's mend side washes allies inside, per
          // tick and quietly (Healing Rain, Consecration — heal-and-harm
          // fields damage the trespassers and mend the congregation).
          // Sweep surfaces (struck ledger) mend ONCE PER CROSSING instead:
          // a drifting crescent with a mend side is a blade-pass, not a
          // per-frame fountain (its tickInterval is 0).
          nativeHost.healAlliesInArea(z.caster, z.inst, a =>
            nativeHost.zoneHas(z, a.pos, a.radius),
            z.dmgMult, true, z.struck);
        }
        if (z.linger <= 0) {
          // The dying breath (Squall Rune): one final burst as it goes.
          if (z.endBurst) {
            const radius = z.radius * (z.endBurst.radiusScale ?? 1);
            for (const victim of nativeHost.zoneVictims(z)) {
              const nb = bodyWhere(victim, (bp, br) => dist(z.pos, bp) - br <= radius);
              if (!nb) continue;
              noteBodyHit(victim, nb.seg);
              nativeHost.resolveHit(z.caster, z.inst, victim,
                z.dmgMult * z.endBurst.damageScale, z.depth, z.flatBonus, true, false, undefined, z.pos, z.tier);
            }
            // THE MALLET: the dying breath is a plain-disc blast, exactly
            // as its victims see it.
            nativeHost.frontSplash(z.caster, z.inst, z.pos, radius);
            nativeHost.strikeSurfaces(z.caster, z.pos, radius);
            nativeHost.flashes.push({
              pos: vec(z.pos.x, z.pos.y), radius, color: z.color,
              life: 0.35, maxLife: 0.35,
            });
          }
          nativeHost.expireZone(z);
          nativeHost.zones.splice(i, 1);
        }
      }
    
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}
  }

export function sceneUpdateZoneDomain(nativeHost: NativeSceneCombatHost, z: Zone): void {
    const set = (z.domainAffected ??= new Set());
    const inside = new Set<Actor>();
    for (const a of nativeHost.actors) {
      if (a.dead || a.downed || a.untargetable || a.construct) continue;
      if (a.tier !== (z.tier ?? z.caster.tier)) continue; // the field's story (the sovereignty gate)
      // Allies wear allyMods; the CASTER'S minions layer minionMods on top
      // (Oblation of Flesh blesses the horde, not the bystanders).
      let mods = a.team === z.caster.team ? z.domain!.allyMods : z.domain!.enemyMods;
      if (a.team === z.caster.team && a.owner === z.caster && z.domain!.minionMods) {
        mods = [...(mods ?? []), ...z.domain!.minionMods];
      }
      if (!mods?.length) continue;
      if (!inAoe(z.pos, z.radius, z.shape, z.facing, a.pos, a.radius, z.arcRad)) continue;
      // FUME DOMAIN (GroundDelivery.exposureDomain): the dominion soaks in
      // with the breath — occupants wear the mods only past the exposure
      // dwell. Stripping stays instant at the rim: the accrual loop clears
      // the lungs on exit and this set-difference does the rest.
      if (z.exposure && z.exposureDomain
        && (z.exposure.dwell.get(a.id) ?? 0) < z.exposure.after) continue;
      inside.add(a);
      if (!set.has(a)) {
        set.add(a);
        a.sheet.setSource(z.domainKey!, mods);
      }
    }
    for (const a of [...set]) {
      if (!inside.has(a)) {
        set.delete(a);
        a.sheet.removeSource(z.domainKey!);
      }
    }
  }

export function sceneZoneVictims(nativeHost: NativeSceneCombatHost, z: Zone): Actor[] {
    // Indiscriminate hazards (storm lightning) catch the player and every real
    // monster alike, but spare your minions, constructs, and breakable scenery.
    if (z.hitAll) {
      const all: Actor[] = [];
      for (const a of nativeHost.actors) {
        if (a.dead || a.untargetable) continue;
        // Every player SEAT (the local hero AND co-op allies) — not their minions —
        // plus every real monster. (Was `a === this.player`, which spared allies.)
        if (a.kind === 'player' && !a.downed) all.push(a);
        // The active boss is immune to its OWN scripted hazards (shockwave/meteor rings
        // are 'hitAll' so they reach the player, but shouldn't chip the boss itself).
        else if (a.team === 'enemy' && !(a.defId && MONSTERS[a.defId]?.passive)
          && !(nativeHost.bossRun && a.defId === nativeHost.bossRun.bossId)) all.push(a);
      }
      return all;
    }
    // THE FIELD'S STORY (the sovereignty gate): the ground reaches only
    // bodies on the story it lies on — a field upstairs scorches nobody in
    // the common room beneath the boards.
    const story = z.tier ?? z.caster.tier;
    const out = nativeHost.enemiesOf(z.caster).filter(v => v.tier === story);
    if (z.curseAllies) {
      for (const a of nativeHost.actors) {
        if (a.dead || a.team !== z.caster.team || a.untargetable || a.tier !== story) continue;
        if (chance(0.5)) out.push(a);
      }
    }
    return out;
  }

export function sceneZoneSees(nativeHost: NativeSceneCombatHost, z: Zone, v: Actor | Vec2): boolean {
    // Victims and strike SURFACES (bells, brittle scenery) share one wall
    // test — pass an actor or a bare position.
    const p = 'pos' in v ? v.pos : v;
    z.phase ??= !(LOS_CFG.zoneTickTypes[z.inst.def.delivery.type]
      && nativeHost.skillOcclusion(z.caster, z.inst) === 'blocked');
    if (z.phase) return true;
    let ox = z.pos.x, oy = z.pos.y;
    if (z.seg) {
      // Closest point on the capsule spine to the victim — the crack burns
      // along its whole length, so the ray leaves from the nearest reach.
      const sx = z.seg.bx - z.seg.ax, sy = z.seg.by - z.seg.ay;
      const ll = sx * sx + sy * sy;
      const t = ll > 0
        ? clamp(((p.x - z.seg.ax) * sx + (p.y - z.seg.ay) * sy) / ll, 0, 1) : 0;
      ox = z.seg.ax + sx * t; oy = z.seg.ay + sy * t;
    }
    return nativeHost.lineOfFire(vec(ox, oy), p);
  }

