import {skillMovementVoice} from '../data/skillMovementVisuals';
import {skillSelfVoice} from '../data/skillSelfVisuals';
/** Exact native impulse, release, teleport, saddle and movement-policy closure.
 * Does not own moveActor, recovery, ticking, damage or scheduling. */
import type {World} from './world';
import {rand,vec,type Vec2} from '../core/math';
import {STATUS_DEFS} from './status';
import {Actor} from './actor';
import {shoveAuthority} from './mass';
import {isDormant} from './ai';
import {instanceMods,instanceChannel,skillContextTags,type SkillInstance} from './skills';
import {MONSTERS} from '../data/monsters';
import {CLING_CFG} from './cling';
import {GRAB_CFG} from './grab';
import {MOUNT_CFG,seatCount,type MountSlotSpec} from './mounts';
import type {DisplacementPolicy} from '../world/regions';
export const PUSH_DAMPING = 5.5;
export const PUSH_MAX_SPEED = 1500;
export interface NativeSceneDisplacementApi {
pushActor(target: Actor, dir: number, strength: number, caster?: Actor, inst?: SkillInstance,
    opts?: {
      /** The impulse arrives with its authority ALREADY SPENT (a plow-
       *  through's momentum hand-off, engine/mass.ts) — fold only the
       *  target's weight, never the shover's again. */
      noAuthority?: boolean;
    }): void;
grabRelease(a: Actor): void;
clingRelease(a: Actor, cause?: 'shake' | 'drop'): void;
teleportActor(actor: Actor, dest: Vec2, color?: string, disp?: DisplacementPolicy, story?: number, movementSkillId?: string): void;
mountFreeSeat(m: Actor, slot: MountSlotSpec | undefined): number;
mountSeatRider(r: Actor, m: Actor): boolean;
mountUnlink(r: Actor, riderDied?: boolean): void;
mountUnhorse(r: Actor, m: Actor): void;
mountWidowed(m: Actor): void;
movementLocked(a: Actor): boolean;
castMoveFactor(a: Actor, inst: SkillInstance): number;
channelMobility(a: Actor, inst: SkillInstance): number;
levitating(a: Actor): boolean;
}
export interface NativeSceneDisplacementHost extends NativeSceneDisplacementApi {
 readonly actors:World['actors'];
 readonly flashes:World['flashes'];
 readonly time:number;
 actorById:World['actorById'];
 clampPos:World['clampPos'];
}
export function scenePushActor(host:NativeSceneDisplacementHost,target: Actor, dir: number, strength: number, caster?: Actor, inst?: SkillInstance,
    opts?: {
      /** The impulse arrives with its authority ALREADY SPENT (a plow-
       *  through's momentum hand-off, engine/mass.ts) — fold only the
       *  target's weight, never the shover's again. */
      noAuthority?: boolean;
    }): void {
    // Planted things stay put — and a DORMANT un-roused neutral is planted:
    // stray splash knockback must not scatter a sleeping band (the hit that
    // ROUSES it restores physics the same tick aiAwakened latches). A
    // MASSED construct (the Unmoored graft) is deliberately NOT planted —
    // its weight is its only anchor now.
    if ((target.construct && !target.construct.massed)
      || target.anchored || target.leap || isDormant(target)) return;
    // A HELD body eats the shove INTO the grip (the grab fabric): the
    // impulse jostles the break meter instead of moving the pair — the
    // hold, not the body, absorbs the blow.
    if (target.heldBy !== undefined) {
      const holder = host.actorById(target.heldBy);
      const hold = holder?.gripping;
      if (hold && hold.id === target.id) hold.struggle += strength * GRAB_CFG.break.shoveFeed;
      return;
    }
    // A hard enough shove ON a holder tears its hold loose first (a pair
    // never rides a launch); the stumble itself then lands normally.
    if (target.gripping && strength >= GRAB_CFG.release.shove) {
      host.grabRelease(target);
    }
    // A latched rider is SCRAPED LOOSE by any real shove (the latch's
    // knockback counterplay, engine/cling.ts) — released first so the
    // impulse lands on a free body.
    if (target.clingTo) host.clingRelease(target);
    // AUTHORITY: the PUSHER's mass folds in (engine/mass.ts) — heavy bodies
    // shove harder, exactly 1 at effective weight 1 so every casterless
    // push (wind, traps, tracks) and every fresh-hero knockback keeps its
    // tuned reach. The asymmetry the fabric exists for: the ogre moves you
    // more readily than you move it, UNLESS you build toward poise/mass.
    const auth = caster && !opts?.noAuthority ? shoveAuthority(caster, inst) : 1;
    // WEIGHT: mass divides the shove — a knockback that sends a goblin
    // flying nudges an ogre. effectiveWeight folds in CURRENT unbroken
    // poise (a poised colossus is an anchor; break the bar to move it) on
    // top of the weight stat (Fortitude raises it, curses can shed it).
    const eff = strength * auth / target.effectiveWeight();
    const vx = Math.cos(dir) * eff * PUSH_DAMPING;
    const vy = Math.sin(dir) * eff * PUSH_DAMPING;
    const p = target.push;
    if (p) {
      p.vx += vx; p.vy += vy;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > PUSH_MAX_SPEED) { p.vx *= PUSH_MAX_SPEED / sp; p.vy *= PUSH_MAX_SPEED / sp; }
      // The newest shover owns the collision procs; the crush re-arms.
      if (caster && inst) { p.caster = caster; p.inst = inst; p.collided = false; }
    } else {
      target.push = { vx, vy, caster, inst };
    }
  }

export function sceneGrabRelease(host:NativeSceneDisplacementHost,a: Actor): void {
    const hold = a.gripping;
    a.gripping = undefined;
    if (!hold) return;
    const v = host.actorById(hold.id);
    if (!v) return;
    if (v.heldBy === a.id) v.heldBy = undefined;
    if (hold.verb === 'swallow') v.untargetable = hold.wasUntargetable ?? false;
    for (let i = v.statuses.length - 1; i >= 0; i--) {
      const id = v.statuses[i].id;
      if (id === 'seized' || id === 'swallowed') {
        v.statuses.splice(i, 1);
        v.sheet.removeSource('status:' + id);
      }
    }
    v.grabProofUntil = Math.max(v.grabProofUntil,
      host.time + (hold.spec.releaseGrace ?? GRAB_CFG.break.graceSec));
  }

export function sceneClingRelease(host:NativeSceneDisplacementHost,a: Actor, cause: 'shake' | 'drop' = 'drop'): void {
    const ride = a.clingTo;
    a.clingTo = undefined;
    const bur = cause === 'shake' ? a.cling?.burrow : undefined;
    // THE FLOP (ClingSpec.flop): the pop-out for a perched, visible rider —
    // the shake alone earns it; burrow wins where both are authored.
    const flop = cause === 'shake' && !bur ? a.cling?.flop : undefined;
    a.clingCooldownUntil = host.time
      + (bur ? bur.grace ?? CLING_CFG.burrow.grace
        : flop ? flop.grace ?? CLING_CFG.flop.grace
          : CLING_CFG.reattachGrace);
    // The burrow marker dies with the ride (refresh-driven, but a half-
    // second of ghost body would be a lie — the grab-release law).
    for (let i = a.statuses.length - 1; i >= 0; i--) {
      if (a.statuses[i].id === 'burrowed') {
        a.statuses.splice(i, 1);
        a.sheet.removeSource('status:burrowed');
      }
    }
    if (!ride) return;
    const ang = (bur || flop) ? rand(0, Math.PI * 2) : ride.ang;
    const hop = bur ? bur.toss ?? CLING_CFG.burrow.toss
      : flop ? flop.toss ?? CLING_CFG.flop.toss
        : CLING_CFG.detachHop;
    a.pos = host.clampPos(vec(
      a.pos.x + Math.cos(ang) * hop,
      a.pos.y + Math.sin(ang) * hop), a.radius);
    // The flop's worn beat: the status row's own duration IS the window
    // (data keeps it aligned with the grace — the lamprey's flail).
    if (flop?.status && STATUS_DEFS[flop.status]) a.applyStatus(flop.status, 0, 1, 'the flop');
    if (bur || flop) {
      // The pop-out reads: a body flung clear of the flesh it was inside.
      host.flashes.push({
        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 6,
        color: a.color, life: 0.22, maxLife: 0.22,
      });
    }
  }

export function sceneTeleportActor(host:NativeSceneDisplacementHost,actor: Actor, dest: Vec2, color = '#b8c8ff', disp?: DisplacementPolicy, story?: number, movementSkillId?: string): void {
    const depart = movementSkillId && (skillMovementVoice(movementSkillId, 'depart') ?? skillSelfVoice(movementSkillId, 'depart'));
    const arrive = movementSkillId && (skillMovementVoice(movementSkillId, 'arrive') ?? skillSelfVoice(movementSkillId, 'recall'));
    host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 1.6, color, life: 0.25, maxLife: 0.25,
      fx: depart || undefined, facing: actor.facing, recoveryCueTier: depart ? actor.tier : undefined });
    // A flicker/blink may carry a DisplacementPolicy ({ignoreConfine}) to land past
    // walls + across the void; default (no disp) = nearest-walkable snap as before.
    // `story` (the tier fabric's enclosure law): the STORY the arrival seats
    // on — the body wears it and the snap confines against that story's own
    // floor (a blink stays upstairs; a recalled minion joins its keeper's
    // layer). Absent = the legacy base-grid snap, byte for byte.
    if (story !== undefined) actor.tier = story;
    actor.pos = host.clampPos(vec(dest.x, dest.y), actor.radius, undefined,
      story !== undefined ? { ...(disp ? { disp } : {}), mover: actor } : disp ? { disp } : undefined);
    actor.dash = null;
    host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * (arrive ? 2.4 : 1.8), color, life: 0.3, maxLife: 0.3,
      fx: arrive || undefined, facing: actor.facing, recoveryCueTier: arrive ? actor.tier : undefined });
  }

export function sceneMountFreeSeat(host:NativeSceneDisplacementHost,m: Actor, slot: MountSlotSpec | undefined): number {
    const cap = seatCount(slot);
    for (let i = 0; i < cap; i++) {
      let held = false;
      for (const id of m.riderIds ?? []) {
        const r = host.actorById(id);
        if (r && !r.dead && r.mountId === m.id && (r.mountSeat ?? 0) === i) { held = true; break; }
      }
      if (!held) return i;
    }
    return -1;
  }

export function sceneMountSeatRider(host:NativeSceneDisplacementHost,r: Actor, m: Actor): boolean {
    const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;
    const seat = host.mountFreeSeat(m, slot);
    if (seat < 0) return false;
    r.mountId = m.id;
    r.mountSeat = seat;
    (m.riderIds ??= []).push(r.id);
    const ri = host.actors.indexOf(r);
    if (ri >= 0) {
      host.actors.splice(ri, 1);
      const mi = host.actors.indexOf(m);
      host.actors.splice(mi < 0 ? host.actors.length : mi + 1, 0, r);
    }
    return true;
  }

export function sceneMountUnlink(host:NativeSceneDisplacementHost,r: Actor, riderDied = false): void {
    const m = r.mountId !== undefined ? host.actorById(r.mountId) : undefined;
    r.mountId = undefined;
    r.mountSeat = undefined;
    if (!m) return;
    const left = (m.riderIds ?? []).filter(id => id !== r.id);
    m.riderIds = left.length ? left : undefined;
    if (!left.length && !m.dead) {
      if (m.team === 'enemy' && !m.owner) m.fromZoneGen = true;
      if (riderDied) host.mountWidowed(m);
    }
  }

export function sceneMountUnhorse(host:NativeSceneDisplacementHost,r: Actor, m: Actor): void {
    host.mountUnlink(r);
    r.applyStatus(MOUNT_CFG.unhorse.status, 0, 1, 'Unhorsed');
    host.pushActor(r, rand(0, Math.PI * 2), MOUNT_CFG.unhorse.push);
    host.flashes.push({
      pos: vec(m.pos.x, m.pos.y), radius: m.radius * 1.4,
      color: MOUNT_CFG.unhorse.color, life: 0.3, maxLife: 0.3,
    });
  }

export function sceneMountWidowed(host:NativeSceneDisplacementHost,m: Actor): void {
    const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;
    if (slot?.onRiderDeath === 'rout') {
      m.applyStatus('horrified', 0, 5, 'Widowed');
    }
  }

export function sceneMovementLocked(host:NativeSceneDisplacementHost,a: Actor): boolean {
    if (a.magicPack && a.sheet.getSourceMods('magicPack:beamChannel')) return true;
    if (a.magicPack && a.sheet.getSourceMods('magicPack:eventChannel')) return true;
    // The PASSIVE lock is a volition lock — a DRIVEN body (engine-wheeled
    // scenery: the serpent's passing glimpse) has no volition to lock; the
    // engine's own hand moves it. Death, stun, dash and anchors still hold.
    // The carom motor is a volition lock too — the ball has no legs; the
    // stick feeds nothing while the ride holds (reflex flasks still fire).
    // THE STROLLING SCENERY (ai.ts updateHaunt): a passive body wearing a
    // haunt has volition enough to drift between its seats — the lock lifts
    // for it alone; every other passive body stands as ever.
    if (a.dash || a.leap || a.caromRun || a.isStunned() || a.dead || a.anchored
      || (a.passive && !a.driven && !(a.defId && MONSTERS[a.defId]?.brain?.behavior?.haunt))) return true;
    // SEALS & FORMS: a toggled form with moveFactor 0 ROOTS its bearer
    // (Stormbind plants you) — factors above 0 slow in moveActor instead.
    for (const au of a.activeAuras.values()) {
      const ad = au.inst.def.delivery;
      if (ad.type === 'aura' && ad.moveFactor === 0) return true;
    }
    if (a.casting) {
      if (a.casting.mode === 'channel') {
        // channelMobility (Walking Meditation) can unlock even an IMMOBILE
        // channel — invest hard enough and you stroll mid-maelstrom.
        // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec binds here
        // exactly as it does at the pulse clock — a Gathered Casting
        // conversion walks by its own synthesized words (move 'slowed'),
        // never by the def the conversion replaced. One resolution, one law.
        return (a.casting.gather ?? instanceChannel(a.casting.inst))?.move === 'immobile'
          && host.channelMobility(a, a.casting.inst) <= 0;
      }
      if (a.casting.mode === 'guard') return false;
      // MOBILE CASTS: castMove data + the castMobility stat can unroot any
      // cast bar — certain attacks are meant to be walked.
      return host.castMoveFactor(a, a.casting.inst) <= 0;
    }
    return false;
  }

export function sceneCastMoveFactor(host:NativeSceneDisplacementHost,a: Actor, inst: SkillInstance): number {
    return Math.min(1, (inst.def.castMove ?? 0)
      + a.sheet.get('castMobility', skillContextTags(inst), instanceMods(inst)));
  }

export function sceneChannelMobility(host:NativeSceneDisplacementHost,a: Actor, inst: SkillInstance): number {
    return a.sheet.get('channelMobility', skillContextTags(inst), instanceMods(inst));
  }

export function sceneLevitating(host:NativeSceneDisplacementHost,a: Actor): boolean {
    return a.levitates || a.sheet.get('levitation') > 0;
  }
