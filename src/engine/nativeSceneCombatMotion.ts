/** Exact original42 movement, survival and theater-facing local closure.
 * Actual admission and lifecycle belong to the real combat aggregate. */
import type {World} from "./world";
import { markBodyWalk } from './bodyWalk';
import { ensureMovementTether, refreshMovementTether } from './movementTether';
import { clamp, dist, vec, type Vec2 } from '../core/math';
import { STATUS_DEFS } from './status';
import { Actor } from './actor';
import { BEHAVIOR_CFG } from './brain';
import { rampValue, instanceChannel, type ImpactDressSpec } from './skills';
import { blocksMovement, bodyRadiusOf } from './levelgen';
import { landingTier, laneLedgerOnDescend, linkFlipTier, resolveTierCrossing, tierEnclosed, tierLinkOf } from './tiers';
import { shapeContains } from './shapes';
import { VOYAGE_CFG, VOYAGE_ZONE_ID } from '../world/voyage';
import { shipOf, type ShipDef } from '../data/ships';
import { regionKind, survivalResource, survivalEaseStat, SURVIVAL_EASE_CAP } from '../world/regions';
import { riderSurface, TRACK_CFG, trackDone, trackPose } from './tracks';
import { GEYSER_CFG, ventReadAt } from './geysers';
import { GRAB_CFG, grabHolderMove } from './grab';
import type { DisplacementPolicy, CollisionResult } from '../world/regions';
import { bumpLedger } from '../packages/ledger';
import { SNOW_CFG } from './snowCover';
import { WEATHER_DEFS } from '../world/weather';
export interface NativeSceneCombatMotionHost {
 retireCombatBody(body:Actor):void;
 readonly account:World["account"];
 readonly actorById:World["actorById"];
 readonly actors:World["actors"];
 readonly applyRecovery:World["applyRecovery"];
 readonly castMoveFactor:World["castMoveFactor"];
 readonly channelMobility:World["channelMobility"];
 readonly clampPos:World["clampPos"];
 readonly cScratch:World["cScratch"];
 readonly despawnPartsOf:World["despawnPartsOf"];
 readonly devNoclip:World["devNoclip"];
 readonly doodadsAt:World["doodadsAt"];
 readonly enemiesOf:World["enemiesOf"];
 readonly flashes:World["flashes"];
 readonly geyserMode:World["geyserMode"];
 readonly geysers:World["geysers"];
 readonly guardArts:World["guardArts"];
 readonly hostileTo:World["hostileTo"];
 readonly kill:World["kill"];
 readonly ledger:World["ledger"];
 readonly levitating:World["levitating"];
 readonly markSeatActed:World["markSeatActed"];
 readonly markSeatMoved:World["markSeatMoved"];
 readonly massRuntime:World["massRuntime"];
 readonly mountUnlink:World["mountUnlink"];
 readonly movementLocked:World["movementLocked"];
 readonly ownWalk:World["ownWalk"];
 readonly pitPolicyFor:World["pitPolicyFor"];
 readonly plantImpactDress:World["plantImpactDress"];
 readonly player:World["player"];
 readonly resolveBoundary:World["resolveBoundary"];
 readonly sailing:World["sailing"];
 readonly seatByActor:World["seatByActor"];
 readonly seatOf:World["seatOf"];
 readonly skyFront:World["skyFront"];
 readonly snowCover:World["snowCover"];
 readonly snowCoverAt:World["snowCoverAt"];
 readonly steppedClamp:World["steppedClamp"];
 readonly survivalDrainRate:World["survivalDrainRate"];
 readonly text:World["text"];
 readonly tierCrossings:World["tierCrossings"];
 readonly time:World["time"];
 readonly tracks:World["tracks"];
 readonly underRoofAt:World["underRoofAt"];
 readonly voyage:World["voyage"];
 readonly voyageShip:World["voyageShip"];
 readonly walk:World["walk"];
 readonly windAt:World["windAt"];
 windCache:World["windCache"];
 readonly zone:World["zone"];
 readonly zones:World["zones"];
 readonly zoneWind:World["zoneWind"];
}
export const WIND_CFG = {
  /** Speed penalty factor per unit of headwind dot (dot is -str..+str). */
  headwind: 0.38,
  /** Speed bonus factor per unit of tailwind dot. */
  tailwind: 0.2,
  /** Hard floor/ceiling on the wind's movement scale. */
  minScale: 0.55,
  maxScale: 1.25,
  /** How far upwind the shelter probe reaches (world units). */
  shelterReach: 36,
  /** Extra pad on a sheltering solid's body radius. */
  shelterPad: 8,
  /** Gust pulse: extra strength at the crest of the slow gust wave. */
  gustAmp: 0.55,
  /** PHYSICAL PUSH: world-units/sec a full-strength gale drifts a body of
   *  weight 1 (divided by effectiveWeight — poise and mass are literal
   *  anchors; a behemoth barely notices what skids a goblin). */
  pushPerSec: 24,
};
export const NOCLIP_DISP: DisplacementPolicy = { ignoreConfine: true };
export const LEVITATE_DISP: DisplacementPolicy = { ignoreFall: true };
export interface NativeCombatMotionState {
 cScratch:World["cScratch"];
 windCache:World["windCache"];
 geyserMode:World["geyserMode"];
 ownWalk:World["ownWalk"];
}
export function freshNativeCombatMotionState():NativeCombatMotionState {return {
 cScratch:{ hit: 'none', at: vec(0, 0) },
 windCache:{ at: -1, w: null },
 geyserMode:'bands',
 ownWalk:null
};}
export function sceneDrainSurvival(host:NativeSceneCombatMotionHost, a: Actor, resource: string, drain: number, dt: number): void {
    const def = survivalResource(resource);
    if (!def) return;
    if (!a.survival) a.survival = new Map();
    const v = Math.max(0, (a.survival.get(resource) ?? def.max) - host.survivalDrainRate(a, resource, drain) * dt);
    a.survival.set(resource, v);
    if (v > 0) { if (a.underflowSince) delete a.underflowSince[resource]; return; } // refilled → THAT meter's ramp resets
    if (def.underflowPctLifePerSec > 0 && !a.invulnerable) {
      // RAMPING underflow, clocked PER RESOURCE: from underflowPctLifePerSec up to
      // underflowRampTo over underflowRampSecs of continuous emptiness — the dread of
      // staying down (breath: 5%→25% / sec over 10s; light gnaws the same shape under
      // the Gloaming). A flat row (underflow 0) never enters here, and every knob —
      // rates, ramp, warning text + colour — lives on the SURVIVAL_RESOURCES row.
      const since = (a.underflowSince ??= {});
      if (since[resource] === undefined) since[resource] = host.time;
      let pct = def.underflowPctLifePerSec;
      if (def.underflowRampTo !== undefined && def.underflowRampSecs) {
        const t = clamp((host.time - since[resource]) / def.underflowRampSecs, 0, 1);
        pct = def.underflowPctLifePerSec + (def.underflowRampTo - def.underflowPctLifePerSec) * t;
      }
      a.life -= a.maxLife() * pct * dt;
      // Throttle the warning on a dedicated per-resource timer (NOT movement) so it
      // shows once every ~0.8s whether the suffering actor is still or moving.
      const gasp = (a.lastGaspAt ??= {});
      if (host.time - (gasp[resource] ?? -9) >= 0.8) {
        gasp[resource] = host.time;
        host.text(a.pos, def.underflowText ?? 'failing!', def.underflowTextColor ?? def.color, 12);
      }
      if (a.life <= 0 && !a.dead) host.kill(a, false);
    }
  }

export function sceneImminentThreatTo(host:NativeSceneCombatMotionHost, actor: Actor, pad: number):
    { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null {
    let best: { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null = null;
    for (const z of host.zones) {
      if (z.exploded || z.delay <= 0) continue;
      if (z.delay > BEHAVIOR_CFG.dodgeHorizon) continue;
      if (z.caster === actor) continue;
      if (!z.hitAll && !host.hostileTo(z.caster, actor)) continue;
      const r = z.radius + pad;
      if (dist(actor.pos, z.pos) > r) continue;
      if (!best || z.delay < best.eta) {
        best = { ref: z, pos: z.pos, radius: r, eta: z.delay,
          casterPos: vec(z.caster.pos.x, z.caster.pos.y) };
      }
    }
    for (const e of host.enemiesOf(actor)) {
      const cs = e.casting;
      if (!cs || cs.mode === 'channel' || cs.mode === 'guard') continue;
      const eta = cs.total - cs.elapsed;
      if (eta <= 0.08 || eta > BEHAVIOR_CFG.dodgeHorizon) continue;
      const del = cs.inst.def.delivery as { type: string; radius?: number; vent?: { columnR: number } };
      // THE VENT-RIDE's broil (LeapDelivery.vent): a vent-leaper's wind-up is
      // a column-to-be under its own feet — the dodge-mind reads the same
      // drawn roil the eyes do (drawn == tested) and steps off it.
      const ventR = del.type === 'leap' && del.vent ? del.vent.columnR : undefined;
      if (del.type !== 'ground' && del.type !== 'nova' && ventR === undefined) continue;
      if (!del.radius && ventR === undefined) continue;
      const at = del.type === 'nova' || ventR !== undefined ? e.pos : cs.aim;
      const r = (ventR ?? del.radius ?? 0) + pad;
      if (dist(actor.pos, at) > r) continue;
      if (!best || eta < best.eta) {
        best = { ref: cs, pos: vec(at.x, at.y), radius: r, eta,
          casterPos: vec(e.pos.x, e.pos.y) };
      }
    }
    // TELEGRAPHED LEAPS (LeapDelivery.telegraph): a diving body's painted
    // landing ring is a threat like any un-exploded disc — dodge-minds read
    // the stoop exactly the way the player's eyes do. Scanned off the raw
    // actor list because a leaper is untargetable (it vanishes from
    // enemiesOf mid-flight) yet its landing is the one thing that matters.
    for (const e of host.actors) {
      const L = e.leap;
      if (!L?.telegraph || e === actor || e.dead) continue;
      if (L.timer > BEHAVIOR_CFG.dodgeHorizon) continue;
      if (!host.hostileTo(e, actor)) continue;
      const r = L.radius + pad;
      if (dist(actor.pos, L.dest) > r) continue;
      if (!best || L.timer < best.eta) {
        best = { ref: L, pos: vec(L.dest.x, L.dest.y), radius: r, eta: L.timer,
          casterPos: vec(e.pos.x, e.pos.y) };
      }
    }
    // TRACK RIDERS (the track fabric): a blade closing on this body is a
    // threat like any un-exploded disc — and because rider motion is a pure
    // function of the clock, the scan samples the ACTUAL future, not an
    // estimate. The player's eyes (the warn arc) and this read are one truth
    // from one resolver.
    for (const tr of host.tracks) {
      if (!tr.armed || trackDone(tr, host.time)) continue;   // retracted / retired lanes threaten nothing
      const b = tr.bound;
      const margin = pad + actor.radius + 40;
      if (actor.pos.x < b.x0 - margin || actor.pos.x > b.x1 + margin ||
          actor.pos.y < b.y0 - margin || actor.pos.y > b.y1 + margin) continue;
      const horizon = Math.min(TRACK_CFG.threatHorizon, BEHAVIOR_CFG.dodgeHorizon);
      for (const r of tr.riders) {
        const p = r.def.payload;
        if (!p.hit && !p.impulse) continue;
        for (let t = TRACK_CFG.threatStep; t <= horizon; t += TRACK_CFG.threatStep) {
          const pose = trackPose(tr, host.time + t, r.phase, r.def);
          if (pose.pending) continue;                        // the bolt still in the wall — real only past bornAt
          if (!shapeContains(riderSurface(r.def, pose), pose.x, pose.y,
            actor.pos.x, actor.pos.y, actor.radius + pad)) continue;
          if (!best || t < best.eta) {
            const reach = r.def.surface.kind === 'circle'
              ? r.def.surface.r : Math.hypot(r.def.surface.hw, r.def.surface.hh);
            best = { ref: r, pos: vec(pose.x, pose.y), radius: reach + pad, eta: t };
          }
          break; // first cover is the read — later samples only age it
        }
      }
    }
    // GEYSER VENTS (the geyser fabric): a broiling vent's coming column is
    // a threat like any un-exploded disc — the dodge-mind reads the SAME
    // pure resolver the drawn broil rises from (drawn == tested; the vent
    // object is the stable ref, so the read rolls once per telegraph). The
    // dodge horizon clips the ~2s broil to its last stretch — the locals
    // step off "one breath before", exactly the charter's tell.
    if (host.geysers) {
      for (const v of host.geysers.vents) {
        const r = GEYSER_CFG.classes[v.cls].columnR + pad;
        if (dist(actor.pos, v.pos) > r) continue;
        const read = ventReadAt(host.geysers, v, host.time, host.geyserMode);
        const eta = read.phase === 'erupt' ? 0.05 : read.toBurst;
        if (eta > BEHAVIOR_CFG.dodgeHorizon) continue;
        if (!best || eta < best.eta) {
          best = { ref: v, pos: vec(v.pos.x, v.pos.y), radius: r, eta };
        }
      }
    }
    return best;
  }

export function scenePlantDressAt(host:NativeSceneCombatMotionHost, pos: Vec2, radius: number, spec: ImpactDressSpec): void {
    host.plantImpactDress({ pos: vec(pos.x, pos.y), radius, impactDress: spec });
  }

export function sceneMoveActor(host:NativeSceneCombatMotionHost, a: Actor, dx: number, dy: number, dt: number): void {
    ensureMovementTether(a);
    if (refreshMovementTether(a, host)?.returning) return;
    if (host.movementLocked(a)) return;
    // A LATCHED rider's position is slaved to its seat (engine/cling.ts):
    // the mover contract simply refuses — no pit checks, no wall slides,
    // no drift for a body that is riding another.
    if (a.clingTo) return;
    // A MOUNTED body that WILLS a step quits its saddle first (the mount
    // fabric): monster riders in the 'hold' kernel never call the mover, so
    // any real move here is deliberate — a possessed rider's stick, a
    // command verb, a forced march. The step itself then proceeds on foot.
    if (a.mountId !== undefined) host.mountUnlink(a);
    // A HELD body's movement is REPLACED by struggle (the grab fabric):
    // intent feeds the break meter through the one mover, then refuses —
    // mashing the stick IS the escape mechanic, for player and monster
    // alike (a held wolf's own brain keeps walking, and so keeps fighting).
    if (a.heldBy !== undefined) {
      const holder = host.actorById(a.heldBy);
      const hold = holder?.gripping;
      if (hold && hold.id === a.id) {
        const want = Math.hypot(dx, dy);
        if (want > 0.001) hold.struggle += GRAB_CFG.break.moveFeed * Math.min(1, want) * dt;
      }
      return;
    }
    // WIDDERSHINS (StatusDef.invertMove — the confusion family's turned
    // hand): VOLITIONAL intent flips at the one mover, so the player's
    // keys, a monster's steering and a minion's orders all betray their
    // bearers alike — the brain commands 'approach', the feet answer
    // 'away'. Knockback (pushActor), grab reeling and track shoves ride
    // other arteries untouched: the world still moves you true; only your
    // own steps turn contrary.
    for (const s of a.statuses) {
      if (STATUS_DEFS[s.id]?.invertMove) { dx = -dx; dy = -dy; break; }
    }
    // Channeling restricts movement per the skill's data, opened back up by
    // the channelMobility stat (immobile 0 / slowed factor / normal 1, + stat).
    let channelFactor = 1;
    if (a.casting?.mode === 'channel') {
      // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec — the
      // gather conversion's synthesized words win over the def's, the
      // same `cs.gather ?? view` resolution the pulse machinery rides. A
      // gathering caster walks SLOWED (its authored 0.5), not free: the
      // conversion trades the bar's rooting for the channel bargain, and
      // channelMobility investment opens it further. (A spent tree node's
      // rampMove rides this same read — the skill-mode audit's view.)
      const ch = a.casting.gather ?? instanceChannel(a.casting.inst);
      const base = ch?.move === 'immobile' ? 0 : ch?.move === 'slowed' ? (ch.moveFactor ?? 0.5) : 1;
      // rampMove: the held channel DRAGS (negative per — Undertow's
      // maelstrom slowly anchors its own bearer) or FREES (positive — the
      // gathering current), on the same curve family as the damage ramps.
      // Floored at rooted; capped ×1.6, and only a rampMove channel may
      // exceed a walking pace at all.
      const rm = ch?.rampMove
        ? rampValue(ch.rampMove, a.casting.channelTime ?? 0) : 0;
      channelFactor = Math.max(0, Math.min(ch?.rampMove ? 1.6 : 1,
        base + host.channelMobility(a, a.casting.inst) + rm));
      if (channelFactor <= 0) return;
    } else if (a.casting?.mode === 'guard') {
      // Shield up: heavy steps, but you keep your feet.
      channelFactor = a.casting.inst.def.guard?.moveFactor ?? 0.4;
    } else if (a.casting) {
      // A mobile cast bar (castMove + castMobility) — rooted bars never
      // reach here (movementLocked already refused).
      channelFactor = host.castMoveFactor(a, a.casting.inst);
      if (channelFactor <= 0) return;
    }
    // Toggled FORMS slow their bearer (moveFactor between 0 and 1 —
    // rooted forms never reach here; movementLocked already refused).
    for (const au of a.activeAuras.values()) {
      const ad = au.inst.def.delivery;
      if (ad.type === 'aura' && ad.moveFactor !== undefined && ad.moveFactor > 0) {
        channelFactor *= ad.moveFactor;
      }
    }
    // A LIVE HOLD is a burden (the grab fabric): carrying walks slow,
    // hauling drags, pinning and swallowing ROOT — the verb's factor
    // composes like a channel's (engine/grab.ts holderMove).
    if (a.gripping) {
      const gf = grabHolderMove(a.gripping);
      if (gf <= 0) return;
      channelFactor *= gf;
    }
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    if (dt > 0 && channelFactor > 0) host.guardArts.ram(a, dx, dy);
    // REGION move-scale: a road speeds you up, a future tar-pit could slow — a direct
    // multiplier (NOT a status) from the terrain underfoot last frame (doodad ground +
    // grid region). Defaults to 1 when the kind has no moveScale. The first user is 'road'.
    // (Co-op: a client's groundKind is host-set, so its move-PREDICTION under-shoots the
    // ~4% road boost until the next host ack re-anchors it — bounded + self-healing.)
    const regionScale = (regionKind(a.groundKind)?.moveScale ?? 1) * (regionKind(a.gridRegion)?.moveScale ?? 1);
    // At sea the hero IS the boat — quicker than boots, and a better HULL is
    // quicker still (VOYAGE_CFG lever × the account's ship).
    const boatScale = host.sailing ? VOYAGE_CFG.boatSpeedMul * host.voyageShip().speedMul : 1;
    // DIRECTIONAL WIND (WEATHER_DEFS[kind].wind): pushing into the gale is
    // work, running with it is a gift — and an anchored solid upwind
    // (windAt's shelter probe) becalms you entirely. Applies to EVERYONE
    // that walks, monsters included; sails feel it too, doubly.
    let windScale = 1;
    const gale = host.windAt(a.pos, a.tier);
    if (gale) {
      const dot = (dx / len) * gale.x + (dy / len) * gale.y;
      windScale = clamp(
        1 + dot * (dot < 0 ? WIND_CFG.headwind : WIND_CFG.tailwind),
        WIND_CFG.minScale, WIND_CFG.maxScale);
    }
    // SNOW DENSITY: standing cover is heavy going for every walker
    // (SNOW_CFG.slowAtFull at a full blanket). Boats don't wade snow.
    const snowScale = host.sailing ? 1 : 1 - host.snowCoverAt(a.pos) * SNOW_CFG.slowAtFull;
    // A held stance's own kit joins the read (Actor.walkSpeed's stanceRead): the
    // marching wall's 'guarding'-scoped speed rows live on the instance. THE HONEST
    // INPUT: a render shell's OWN hero walks the fold its seat row carries (ownWalk;
    // the shell's statuses are display stubs); every host body reads its own sheet.
    const ow = host.ownWalk !== null && a === host.player ? host.ownWalk : null;
    const speed = (ow ? ow.spd : a.walkSpeed()) * channelFactor * regionScale * boatScale * windScale * snowScale;
    const traction = ow ? ow.trc : a.walkTraction();
    a.lastMoveAt = host.time;
    a.idleFor = 0; // a deliberate step breaks the 'stationary' stance
    a.plantFor = 0; // …and the plant clock with it (the commitment resets)
    // The 'move' charge-tap odometer (Galvanic Reserve) — intended stride,
    // consumed by Actor.updateCharges on its own meters.
    a.moveAcc += speed * dt;
    host.markSeatActed(a); // movement interrupts THAT seat's dwell
    host.markSeatMoved(a); // …and, THE SHIMMY LAW, a willed step re-arms a spent one
    // DEV noclip: the local hero phases through walls/rocks/void (bounds still
    // hold). TRUE FLIERS ride the same displacement policy — the wing cares
    // nothing for rocks, walls or the gap beneath. A LEVITATOR (base flag or
    // the 'levitation' stat — cloudform) floats over void bands but walls
    // still confine it: it floats, it doesn't phase.
    const disp = (host.devNoclip && a === host.player) || a.flying ? NOCLIP_DISP
      : host.levitating(a) ? LEVITATE_DISP : undefined;
    // THE STRIDE's odometer (strideReach — THE LEGEND FABRIC): the distance
    // a willed step ACTUALLY covered (post-clamp — a wall walks nothing),
    // banked only while the sheet arms a reach, so an unarmed walker pays
    // one cached read and never accrues.
    const striding = a.sheet.get('strideReach') > 0;
    const sx = a.pos.x, sy = a.pos.y;
    if (traction >= 0.999) {
      // Solid ground: instant control, exactly as ever.
      a.vel.x = (dx / len) * speed;
      a.vel.y = (dy / len) * speed;
      host.steppedClamp(a, vec(
        a.pos.x + (dx / len) * speed * dt,
        a.pos.y + (dy / len) * speed * dt,
      ), a.pos, disp);
    } else {
      // Slippery: input only STEERS the momentum; the ice decides the rest.
      const blend = Math.min(1, dt * (1.5 + traction * 14));
      a.vel.x += ((dx / len) * speed - a.vel.x) * blend;
      a.vel.y += ((dy / len) * speed - a.vel.y) * blend;
      host.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos, disp);
    }
    if (striding) a.strideDist += Math.hypot(a.pos.x - sx, a.pos.y - sy);
    if (!host.sailing) markBodyWalk(a, a.pos.x - sx, a.pos.y - sy, host.time);
  }

export function sceneSlipAway(host:NativeSceneCombatMotionHost, actor: Actor, text: string, color = '#c8a850', fx?: string): void {
    host.despawnPartsOf(actor);
    const i = host.actors.indexOf(actor);
    if (i >= 0) { host.actors.splice(i, 1); host.retireCombatBody(actor); }
    // THE EFFECT VOICE: a refuge row may name its exit's painter (the
    // squirrel's 'scramble' leaf-flick); every unkeyed departure keeps the
    // classic soft flash — the honored generic (absent == identical).
    host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 60, color, life: 0.5, maxLife: 0.5, fx });
    if (text) host.text(vec(actor.pos.x, actor.pos.y - 30), text, color, 14);
  }

export function sceneSurvivalDrainRate(host:NativeSceneCombatMotionHost, a: Actor, resource: string, rate: number): number {
    if (rate <= 0) return rate;
    const ease = a.sheet.get(survivalEaseStat(resource));
    if (ease <= 0) return rate;
    const def = survivalResource(resource);
    return rate * (1 - Math.min(def?.easeCap ?? SURVIVAL_EASE_CAP, ease));
  }

export function sceneDespawnPartsOf(host:NativeSceneCombatMotionHost, actor: Actor): void {
    for (const p of actor.partActors ?? []) {
      if (p.dead) continue;
      const i = host.actors.indexOf(p);
      if (i >= 0) { host.actors.splice(i, 1); host.retireCombatBody(p); }
    }
  }

export function sceneMarkSeatMoved(host:NativeSceneCombatMotionHost, actor: Actor): void {
    const s = host.seatByActor.get(actor);
    if (s) s.lastMovedAt = host.time;
  }

export function sceneSteppedClamp(host:NativeSceneCombatMotionHost, a: Actor, dest: Vec2, from: Vec2, disp?: DisplacementPolicy): void {
    const sc = host.cScratch;
    sc.hit = 'none';
    // THE LANDING RE-SEAT at the mover (engine/tiers.ts landingTier): a
    // just-landed body re-derives its story from the floor it STANDS on
    // BEFORE any clamp consults a tier view — else the first grounded
    // step's snap drags the diver back onto the story it left (measured
    // live: a stooping condor teleport-climbing its own rim, 24px in one
    // frame). The world sweep keeps the stationary lander's copy.
    if (a.touchdown && !a.flying && !a.leap && !a.dash
      && host.zone.tiers && host.walk?.regionAt) {
      a.touchdown = false;
      a.tier = landingTier(host.walk.regionAt(from.x, from.y), a.tier);
    }
    // TIER CROSSING (engine/tiers.ts): standing on a link (ramp, culvert)
    // and stepping toward ground only the other layer owns FLIPS the body's
    // tier BEFORE the clamp judges the move — walking up a ramp is just
    // walking. (Pure read; flat zones return the tier untouched.)
    if (host.zone.tiers && host.walk) a.tier = resolveTierCrossing(host.walk, a.tier, from, dest);
    a.pos = host.clampPos(dest, a.radius, from, { out: sc, disp, mover: a });
    if ((sc.hit as string) === 'void') host.resolveBoundary(a, sc, from);
    // THE LADDER TOGGLE (the crossing law's second half): a link cell whose
    // neighborhood is BOTH-tier ground (a culvert well among street-over-duct
    // cells) never trips the exit rule — so ENTERING a link flips the layer
    // outright, latched to one toggle per visit. Stepping onto an open
    // culvert IS descending; reaching a well from the duct IS surfacing.
    // Ramps self-correct through the exit rule above either way.
    if (host.zone.tiers && host.walk?.regionAt) {
      const linkK = host.walk.regionAt(a.pos.x, a.pos.y);
      const onLink = tierLinkOf(linkK);
      if (onLink && !a.onTierLink) {
        const storyBefore = a.tier;
        a.tier = linkFlipTier(linkK, a.tier);
        a.aiTierGoal = undefined; // crossed — any chase goal is spent
        // THE DESCENT LEDGER (UnderTierSpec.ledgerOnDescend — the cistern's
        // `cistern_entered`): a hero's body going DOWN a lane's crossing for
        // the first time stamps the lane's key on the run ledger (merged to
        // the account on death) — the sidezone fabric's ledgerOnEnter for a
        // story that has no door. Seats only; monsters keep no book.
        if (storyBefore === 0 && a.tier >= 1 && host.seatOf(a)) {
          const key = laneLedgerOnDescend(host.zone.tiers?.lane);
          if (key) bumpLedger(host.ledger, key);
        }
        // THE PURSUIT STAMP (the tier chase): whoever was hunting THIS body
        // watched it take the stair — hand every engaged pursuer in earshot
        // the crossing as a goal; walking onto it flips them through, and
        // the ordinary re-acquire picks the hunt back up on the other side.
        for (const e of host.actors) {
          if (e.dead || e === a || e.aiTargetId !== a.id) continue;
          if (Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y) > 900) continue;
          e.aiTierGoal = { x: a.pos.x, y: a.pos.y, until: host.time + 8 };
        }
        // THE LEDGER (chase memory): late pursuers — the ones who pick up
        // the trail after the stair — read the crossing from here.
        host.tierCrossings.push({ x: a.pos.x, y: a.pos.y, actorId: a.id, team: a.team, at: host.time });
        if (host.tierCrossings.length > 12) host.tierCrossings.shift();
      }
      a.onTierLink = onLink;
    }
  }

export function sceneResolveBoundary(host:NativeSceneCombatMotionHost, a: Actor, result: CollisionResult, pre: Vec2, forced = false): void {
    let policy = regionKind(result.blockedKind)?.boundaryPolicy;
    if (policy) policy = host.pitPolicyFor(policy,result.at); // the zone's word on pit-family falls
    if (!policy) return;
    // A LEVITATING actor floats over fall pits (void): no fall damage / eject — so it
    // can't be knocked into the void for a cheap kill. (Pathing still avoids void.)
    if (host.levitating(a) && (policy.kind === 'fall' || policy.kind === 'descend')) return;
    // Debounce fall/eject/skyfall/descend so being held against a void edge
    // doesn't melt the actor every frame — one recovery per ~0.6s.
    if (policy.kind === 'fall' || policy.kind === 'eject' || policy.kind === 'skyfall' || policy.kind === 'descend') {
      if (host.time - (a.lastFall ?? -9) < 0.6) return;
      a.lastFall = host.time;
    }
    host.applyRecovery(a, policy, pre, forced);
  }

export function sceneWindAt(host:NativeSceneCombatMotionHost, pos: Vec2, tier = 0): { x: number; y: number; strength: number } | null {
    const w = host.zoneWind(pos);
    if (!w) return null;
    // UNDER A CEILING (the enclosure law): a body on an enclosed under-
    // layer's story feels no gale — the street's wind is not the duct's.
    if (tier >= 1 && host.zone.tiers?.kind === 'under' && tierEnclosed(host.zone.tiers)) return null;
    // INDOORS: a roof owns its sky — no gale under it (courtyards stay open).
    if (host.underRoofAt(pos)) return null;
    const px = pos.x - w.nx * WIND_CFG.shelterReach;
    const py = pos.y - w.ny * WIND_CFG.shelterReach;
    // The upwind probe reads BODY radii (bodyRadiusOf): a canopy tree shelters
    // only in its trunk's narrow lee — wind blows through the leaves, and the
    // shade of a crown is deliberately NOT cover from the gale.
    for (const d of host.doodadsAt(px, py)) {
      if (!blocksMovement(d)) continue;
      const dx = px - d.pos.x, dy = py - d.pos.y;
      const reach = bodyRadiusOf(d) + WIND_CFG.shelterPad;
      if (dx * dx + dy * dy <= reach * reach) return null; // becalmed
    }
    return { x: w.nx * w.strength, y: w.ny * w.strength, strength: w.strength };
  }

export function sceneZoneWind(host:NativeSceneCombatMotionHost, pos: Vec2 = host.player.pos): { nx: number; ny: number; strength: number } | null {
    if (!host.massRuntime?.weather && host.windCache.at === host.time) return host.windCache.w;
    let w: { nx: number; ny: number; strength: number } | null = null;
    const f = host.skyFront(pos);
    const windDef = f ? WEATHER_DEFS[f.kind].wind : undefined;
    if (f && windDef) {
      const len = Math.hypot(f.vel.x, f.vel.y);
      if (len > 0.01) {
        // The GUST WAVE: two slow sines beat against each other — strength
        // swells in rolling pulses rather than holding a flat shove.
        const gust = 1 + WIND_CFG.gustAmp
          * Math.max(0, Math.sin(host.time * 0.7) * Math.sin(host.time * 0.23));
        w = {
          nx: f.vel.x / len, ny: f.vel.y / len,
          strength: Math.min(1.6, windDef * f.intensity * gust),
        };
      }
    }
    host.windCache = { at: host.time, w };
    return w;
  }

export function sceneSnowCoverAt(host:NativeSceneCombatMotionHost, pos: Vec2): number {
    return host.massRuntime?.snow?.at(host.massRuntime.walk.at(pos.x,pos.y)) ?? host.snowCover;
  }

export function sceneVoyageShip(host:NativeSceneCombatMotionHost): ShipDef { return host.voyage?.ship ?? shipOf(host.account); }

export function sceneSailing(host:NativeSceneCombatMotionHost): boolean { return host.zone.id === VOYAGE_ZONE_ID; }

