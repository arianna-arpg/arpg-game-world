/** Exact native projectile launch and occlusion fold; ticking stays with its actual combat owner. */
import type {World} from './world';
import {cosmeticSkillPaint} from '../meta/cosmetics';
import {chance,dist,vec,type Vec2} from '../core/math';
import {type DamageType} from './stats';
import {Actor} from './actor';
import {applyConversion} from './damage';
import {effectiveSkillLevel,grantedTags,instanceMods,instanceTrail,instanceFissureTrail,makeSkillInstance,skillContextTags,type ProjectileDelivery,type SkillInstance} from './skills';
import {SKILLS} from '../data/skills';
import {LOS_CFG} from './los';
export const PROJ_CHILD_DEPTH_MAX = 2;
export const PROJ_AURA_TICK = 0.3;
type InheritedFlight=NonNullable<NonNullable<Parameters<World['spawnProjectile']>[4]>['inherit']>;
export interface NativeSceneProjectileHost {
 projectiles:World['projectiles'];
 account:World['account'];
 seats:World['seats'];
 localSeat:World['localSeat'];
 enemiesOf:World['enemiesOf'];
 skillOcclusion:World['skillOcclusion'];
}
export function sceneSpawnProjectile(host:NativeSceneProjectileHost,caster: Actor, inst: SkillInstance, origin: Vec2, dir: number,
    opts?: {
    // SOVEREIGNTY: targeting — the aim assist picks through hostility (the derived census, probe_tiers RIG T).
      inherit?: InheritedFlight; depth?: number; mult?: number;
      flat?: Partial<Record<DamageType, number>>;
      /** ARC-TO override: converge on this point (defaults to the aim). */
      dest?: Vec2;
      /** CAROMS: waypoints the flight cycles between for its whole life. */
      patrol?: Vec2[];
    }): void {
    const def = inst.def;
    const cosmeticPaint = cosmeticSkillPaint(host, caster, def.id);
    // (Skill-mode audit: projectile-family fields — pierce/forks/fire —
    // are off the M1 whitelist; the piercing_arrow/fireball waves adopt
    // host read behind the view when they land.)
    if (def.delivery.type !== 'projectile') return;
    const d: ProjectileDelivery = def.delivery;
    const tags = skillContextTags(def);
    const extra = instanceMods(inst);
    const depth = opts?.depth ?? 0;
    const inh = opts?.inherit;

    const speed = d.speed * caster.sheet.get('projectileSpeed', tags, extra);
    const size = caster.sheet.get('projectileSize', tags, extra);
    // DURATION-DRIVEN flight: the clock is the leash and RANGE FALLS OUT
    // of speed × time — accel gathers distance, decel forfeits it.
    const maxAge = d.duration !== undefined
      ? d.duration * caster.sheet.get('effectDuration', tags, extra)
      : undefined;
    // Trajectory axes: the delivery's innate values are each stat query's
    // BASE, so flat mods create an axis and increased/more scale or dampen it.
    // An inherited flight (a Lineage'd parent's pre-scaled axes) ADDS on top,
    // so a shard's own innate pattern and its heritage compose.
    const t = d.trajectory;
    // PROJECTILE-BORNE FIELD (Soulflay): scaled by the caster's damage stat
    // and CONVERTED at launch — the tether discipline; the flight just wears it.
    let auraAmounts: Partial<Record<DamageType, number>> | undefined;
    if (d.aura) {
      const aType: DamageType = d.aura.damageType ?? 'chaos';
      const aTags = skillContextTags(def, [aType]);
      auraAmounts = { [aType]: d.aura.dps * caster.sheet.get('damage', aTags, extra) };
      applyConversion(caster, auraAmounts, aTags, extra);
    }
    const homing = caster.sheet.get('homingPower', tags, extra, t?.homing ?? 0) + (inh?.homing ?? 0);
    const guide = caster.sheet.get('guidePower', tags, extra, t?.guide ?? 0);
    const erratic = caster.sheet.get('erraticPower', tags, extra, t?.erratic ?? 0) + (inh?.erratic ?? 0);
    const spiral = caster.sheet.get('spiralPower', tags, extra, t?.spiral ?? 0) + (inh?.spiral ?? 0);
    const orbit = caster.sheet.get('orbitPower', tags, extra, t?.orbit ?? 0) + (inh?.orbit ?? 0);
    const spin = caster.sheet.get('spinPower', tags, extra, t?.spin ?? 0) + (inh?.spin ?? 0);
    const weave = caster.sheet.get('weavePower', tags, extra, t?.weave ?? 0) + (inh?.weave ?? 0);
    const accel = caster.sheet.get('projAccel', tags, extra, t?.accel ?? 0);
    // PULSATION (projPulse): the flight BREATHES — its hit radius swells
    // and shrinks around the base on a fixed rhythm (a living missile;
    // expansion-and-contraction as a projectile modifier).
    const pulse = caster.sheet.get('projPulse', tags, extra);
    // Kindred returns (see the literal below): native mode vs the gems'
    // granted mode read separately — never one folded read, so a granted
    // override can no longer re-aim a native catch.
    const nativeReturn = d.returns === 'origin' ? 1 : d.returns === 'caster' ? 2 : 0;
    const grantedReturn = Math.round(caster.sheet.get('projReturn', tags, extra));

    host.projectiles.push({
      pos: vec(origin.x, origin.y),
      orbPaint: d.orbPaint,
      // THE TIER LAW: a flight belongs to its caster's layer (chain children
      // spread-copy it; hostility keeps victims same-tier).
      tier: caster.tier,
      dir, guideDir: dir,
      guided: spiral > 0 || orbit > 0 || spin > 0 || weave > 0,
      speed,
      radius: d.radius * size,
      pulse: pulse > 0 ? pulse : undefined,
      radius0: pulse > 0 ? d.radius * size : undefined,
      traveled: 0, range: maxAge !== undefined ? 1e9 : d.range, age: 0,
      maxAge,
      pierce: (d.pierce ?? 0) + Math.round(caster.sheet.get('pierceCount', tags, extra)),
      chains: Math.round(caster.sheet.get('chainCount', tags, extra)),
      hits: new Map(),
      caster, inst, color: cosmeticPaint.color ?? def.color,
      cosmeticMotif: cosmeticPaint.motif,
      cosmeticProjectile: cosmeticPaint.projectile,
      shape: d.shape ?? 'circle',
      mult: opts?.mult ?? 1,
      flat: opts?.flat,
      rehit: d.rehit,
      conductive: caster.sheet.get('conduction', tags, extra) > 0,
      forks: (d.forks ?? 0) + Math.round(caster.sheet.get('forkCount', tags, extra)),
      // KINDRED RETURNS (2026-07-22): the native lane owns the homeward
      // TARGET — a socketed return gem on a native returner never re-aims
      // the catch (the override-wins accident host replaces); it buys a
      // SECOND full pass instead (the catch becomes a re-throw). On
      // returnless hosts the gem grants the mode its own value names
      // (Returning → origin, Boomerang → caster).
      returnMode: nativeReturn > 0 ? nativeReturn : Math.min(2, Math.max(0, grantedReturn)),
      returnPasses: nativeReturn > 0 && grantedReturn > 0 ? 2 : 1,
      returnPhase: false,
      origin: vec(origin.x, origin.y),
      anchor: vec(origin.x, origin.y),
      angle: dir,
      orbRadius: orbit > 0 ? (t?.orbitRadius ?? inh?.orbitR0 ?? 50) : 0,
      accel: accel !== 0 ? accel : undefined,
      homing, guide, erratic, spiral, orbit, spin, weave,
      amp: t?.amplitude ?? inh?.amp ?? (weave > 0 ? 45 : 35),
      orbitR0: t?.orbitRadius ?? inh?.orbitR0 ?? 50,
      hitDetonate: caster.sheet.get('projHitDetonate', tags, extra) > 0,
      shrapnel: Math.round(caster.sheet.get('projShrapnel', tags, extra)),
      trailSpec: instanceTrail(inst),
      trailNext: instanceTrail(inst)?.every ?? Infinity,
      // FISSURE TRAIL (innate or Sundering Flight's graft): the tear-head
      // state — first segment rips at the muzzle (fisNext 0).
      fisSpec: instanceFissureTrail(inst),
      fisNext: 0,
      // The borne field rides at aoe-scaled reach, chunk-ticked in flight.
      auraAmounts,
      auraRadius: d.aura ? d.aura.radius * caster.sheet.get('aoeRadius', tags, extra) : undefined,
      auraTick: d.aura ? PROJ_AURA_TICK : undefined,
      inheritFrac: Math.min(1, caster.sheet.get('projInherit', tags, extra)),
      reShatter: caster.sheet.get('projReShatter', tags, extra) > 0,
      depth,
      // Emitters stop one generation short of the cap — a shard that happens
      // to BE an emitter skill still emits, but its emissions are barren.
      emit: d.emit && depth < PROJ_CHILD_DEPTH_MAX ? {
        inst: makeSkillInstance(SKILLS[d.emit.skillId], effectiveSkillLevel(inst)),
        interval: d.emit.interval, timer: d.emit.interval,
        angle: dir, pattern: d.emit.pattern ?? 'rotating',
      } : undefined,
      // Batch-3 levers: zig-zag clocks, ricochet stock, recurve odds, the
      // selective-pierce prey, arc-to destinations, carom patrols.
      zig: t?.zigzag ? { timer: t.zigzag.interval, sign: chance(0.5) ? 1 : -1 } : undefined,
      // Bounce and recurve are STAT AXES like the flight patterns: innate
      // spec values seed the queries, so gems create them from nothing.
      // Patrol shuttles (caroms) claim projBounce whole at the anchor cap
      // — a shuttling flight never wall-bounces on top of its own weave.
      bounces: opts?.patrol?.length ? undefined
        : Math.round(caster.sheet.get('projBounce', tags, extra, t?.bounce ?? 0)) || undefined,
      // FRAME REBOUNDS (the fourth wall) ride the same kindred shape —
      // innate frameBounce seeds the projFrameBounce query, so Mirrored
      // Bounds creates the lane from nothing. Patrol shuttles keep their
      // authored geometry: no frame banking on a fixed weave.
      frameBounces: opts?.patrol?.length ? undefined
        : Math.round(caster.sheet.get('projFrameBounce', tags, extra, t?.frameBounce ?? 0)) || undefined,
      // PHASING (occlusion 'free' / the phasing stat, support-graftable):
      // terrain never stops host flight.
      phase: host.skillOcclusion(caster, inst) === 'free' || undefined,
      caromLock: t?.caromOnHit,
      recurveChance: (() => {
        const rc = caster.sheet.get('projRecurve', tags, extra, t?.recurve?.chance ?? 0);
        return rc > 0 ? rc : undefined;
      })(),
      preyId: t?.selectivePierce
        ? (() => {
          let best: Actor | null = null, bd = 700;
          for (const e of host.enemiesOf(caster)) {
            const dd = dist(origin, e.pos);
            if (dd < bd) { bd = dd; best = e; }
          }
          return best?.id;
        })()
        : undefined,
      destAt: t?.arcTo && (opts?.dest || caster.aimPos)
        ? vec((opts?.dest ?? caster.aimPos!).x, (opts?.dest ?? caster.aimPos!).y)
        : undefined,
      arcRate: t?.arcTo,
      patrol: opts?.patrol?.length ? { points: opts.patrol.map(p2 => vec(p2.x, p2.y)), idx: 0 } : undefined,
    });
  }

export function sceneSkillOcclusion(host:NativeSceneProjectileHost,caster: Actor, inst: SkillInstance): 'blocked' | 'free' | 'travel' {
    const d = inst.def.delivery as { type: string; occlusion?: 'blocked' | 'free' };
    const base = d.occlusion ?? LOS_CFG.delivery[d.type] ?? 'free';
    if (base === 'free') return 'free';
    return caster.sheet.get('phasing', skillContextTags(inst, grantedTags(inst)),
      instanceMods(inst)) > 0 ? 'free' : base;
  }
