/** Exact native combat resolution algorithms from Git 42f95716294995cbdd83785f0a0782ddda971f76.
 * Extraction is not an admitted runtime: all capabilities must be bound by the actual area aggregate. */
import type { MassNativeBrittlePopContext } from '../worldmass/nativeBrittles';
import { skillMovementVoice } from '../data/skillMovementVisuals';
import { skillSelfVoice } from '../data/skillSelfVisuals';
import { concealmentActive, isConcealed, PERCEPTION_CFG } from './perception';
import { anatomyFlash, notePartScar } from './anatomyCues';
import { takeWeakPointBreaks } from './weakpoints';
import { noteResourceFlow } from './feedingCues';
import { throngEvolution } from './throngEvolution';
import { cosmeticSkillPaint } from '../meta/cosmetics';
import { DEED_CFG } from '../data/classdeeds';
import { skillAbsorbAmount } from './absorb';
import { instanceEffects } from './skills';
import { angleDiff, angleTo, chance, dist, pick, rand, randInt, vec, type Vec2 } from '../core/math';
import { mod, type ConditionId, type DamageType, type Modifier, type SkillTag } from './stats';
import { baselineStatusDps, bankFracOf, STATUS_DEFS, tuneAilmentChance, statusRuptureRadius, type ActiveStatus } from './status';
import { armedCueProfile, armedCueStyle } from './armedCues';
import { Actor, type Team } from './actor';
import { applyConversion, applyHit, landLifeDamage, mitigateTyped, resistValue, rollSkillDamage, type DamagePacket } from './damage';
import { parryCounter, type ParryDamage } from './parry';
import { SEG_CFG, segR, segsHittable, type SegBody } from './segments';
import { DEFENSE_CFG } from './defense';
import { MASS_CFG } from './mass';
import { isDormant } from './ai';
import { alertScale, normalizeBrain } from './brain';
import { runAIActions } from './aiActions';
import { effectiveSkillLevel, grantedTags, guardBashSpec, hostSockets, instanceBrood, instanceChargeGain, instanceFuse, instanceMods, instanceSizeOver, instanceContagion, instanceTrigger, instanceTriggerArmed, instanceTriggerLimit, makeSkillInstance, resolveSizeOver, rollCount, socketSpec, TRIGGER_CFG, CONTAGION_CFG, type TriggerKind, AOE_SHAPE, AOE_BAND_DEPTH, skillContextTags, type GroundDelivery, type GuardBashSpec, type LitePourEffect, type SkillEffect, type SkillInstance } from './skills';
import { spawnVeinOf, SUPPORTBASE_CFG } from './supportbase';
import { rollSpillPacket, spillBudget } from '../data/essences';
import { resolveLootTable } from './loot';
import { MONSTER_THEMES } from '../data/infrequents';
import { SKILLS } from '../data/skills';
import { MONSTERS, defLeavesRemains } from '../data/monsters';
import { killRuleMatches, killRules, type KillCtx } from './killHandlers';
import { PROC_LIST, PROCS, procPowerStat, scaleProcEffect, PROC_RIDER_LIST, procRiderStat, type ProcCastSpec, type ProcDef } from '../data/procs';
import { victimScopeArmed, victimTags } from './victim';
import { mimicCapture, mimicRefreshWatch } from './mimic';
import { DAMAGE_COLOR } from './stats';
import { type PackTableEntry } from '../data/zones';
import { doodadRuleOf, normalizeDoodadBound, type Doodad, type DoodadKind } from './levelgen';
import { DISSOLVE_CFG, dissolveFor, dissolveRollRange, dissolveSeedOf, type ResolvedDissolve } from './dissolve';
import { emergeGroundFor } from './emerge';
import { deathVoiceOf, dominantTypeOf } from './bodyVoices';
import { sameStory } from './tiers';
import { bestiaryEligible } from '../data/bestiary';
import { CREEP_CFG, CREEPS } from './creep';
import { attunedStatus, toneAccepted, toneOfAmounts, toneTint, TUNE_CFG } from './tuning';
import { puzzleContactHeatsCombat } from './puzzles';
import { THRONG_CFG, throngSpecsOn } from './throng';
import { LITE_CFG } from './lite';
import { buffProcCue, noteProcCue } from './procCues';
import { defenseCueFlash } from './defenseCues';
import { combatCueFlash, guardArcRadians } from './combatCues';
import { guardBashGeometry } from './warningCues';
import { DEFENSE_CUE_CFG } from '../data/defenseCues';
import { feedWatch, WATCH_CFG, watchRungOf, watchValueOf } from './watch';
import type { RecoveryPolicy, DamageSpec } from '../world/regions';
import { bumpLedger } from '../packages/ledger';
import { RARITY_DEFS } from './rarity';
import { magicPackDeath } from './magicPacks';
import { isDeathAligned } from '../world/traits';
import { ORB_DEFS, ORB_CAP, orbAmount, orbOnHitStat, orbOnHurtStat } from '../data/orbs';
import { SIM_TAP } from './tap';
import { nativeWeightedPick } from './nativePopulationRules';
import type { AoeShape, DissolveBreak, Projectile, RemnantElement } from "./world";
import type { NativeSceneCombatHost } from "./nativeSceneCombatHost";

export const CRESCENT_INNER = 0.55;

export const CRESCENT_ARC = 110 * Math.PI / 180;

export function zoneHoleSpares(
  z: { pos: Vec2; radius: number; shape?: AoeShape; facing?: number; edge?: number },
  p: Vec2, pr: number,
): boolean {
  if (!z.edge) return false;
  return inAoe(z.pos, z.radius * z.edge, z.shape ?? 0, z.facing ?? 0, p, -pr);
}

export function inAoe(center: Vec2, radius: number, shape: AoeShape, facing: number, target: Vec2, targetRadius: number, arcRad?: number): boolean {
  if (shape === AOE_SHAPE.band) {
    // THE BAND (the crossing strip): the target read in the facing frame —
    // `radius` is the half-width ACROSS the facing, radius × AOE_BAND_DEPTH
    // the half-thickness ALONG it. The target's own radius grows both
    // (negated by zoneHoleSpares = "fully inside" — the same grace math).
    const dx = target.x - center.x, dy = target.y - center.y;
    const fx = Math.cos(facing), fy = Math.sin(facing);
    const along = dx * fx + dy * fy;
    const across = dy * fx - dx * fy;
    return Math.abs(across) <= radius + targetRadius
      && Math.abs(along) <= radius * AOE_BAND_DEPTH + targetRadius;
  }
  if (shape >= 3) {
    // Crescent: an annular SECTOR aimed along facing — the band between
    // inner and outer radius, clipped to the arc, with angular grace so
    // fat targets clip the horns. Shape 4 (SECTOR) is the same wedge with
    // NO hollow heart — the pie slice that starts at your feet.
    const dd = dist(center, target);
    const inner = shape >= 4 ? 0 : radius * CRESCENT_INNER;
    if (dd - targetRadius > radius || dd + targetRadius < inner) return false;
    const half = (arcRad ?? CRESCENT_ARC) / 2 + Math.atan2(targetRadius, Math.max(dd, 1));
    return Math.abs(angleDiff(facing, angleTo(center, target))) <= half;
  }
  if (shape >= 2) {
    // Equilateral triangle, apex toward facing, circumradius grown by the
    // target's own radius so fat targets clip the edges.
    const R = radius * 1.25 + targetRadius;
    const vx: number[] = [], vy: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a = facing + i * (Math.PI * 2 / 3);
      vx.push(center.x + Math.cos(a) * R);
      vy.push(center.y + Math.sin(a) * R);
    }
    const sign = (ax: number, ay: number, bx: number, by: number): number =>
      (bx - ax) * (target.y - ay) - (by - ay) * (target.x - ax);
    const d1 = sign(vx[0], vy[0], vx[1], vy[1]);
    const d2 = sign(vx[1], vy[1], vx[2], vy[2]);
    const d3 = sign(vx[2], vy[2], vx[0], vy[0]);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }
  if (shape >= 1) {
    const half = radius + targetRadius;
    return Math.abs(target.x - center.x) <= half && Math.abs(target.y - center.y) <= half;
  }
  return dist(center, target) - targetRadius <= radius;
}

export function inAoeBody(
  center: Vec2, radius: number, shape: AoeShape, facing: number, a: Actor,
  arcRad?: number, bodyOk?: (pos: Vec2, r: number) => boolean,
): SegBody | null {
  if (inAoe(center, radius, shape, facing, a.pos, a.radius, arcRad)
    && (!bodyOk || bodyOk(a.pos, a.radius))) {
    return { pos: a.pos, r: a.radius, seg: SEG_CFG.HEAD };
  }
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) {
      const r = segR(a, i);
      if (inAoe(center, radius, shape, facing, segs[i], r, arcRad)
        && (!bodyOk || bodyOk(segs[i], r))) {
        return { pos: segs[i], r, seg: i };
      }
    }
  }
  return null;
}

export const SHRAPNEL_SKILL = 'shrapnel_shard';

export const STATUS_IDS = Object.keys(STATUS_DEFS);

export function statusReqs(req: string | string[] | undefined): string[] | null {
  return req === undefined ? null : Array.isArray(req) ? req : [req];
}

export function isStealthed(a: Actor): boolean {
  return isConcealed(a) || a.sheet.get('invisible') > 0;
}

export const LOW_LIFE_FLASH_SEC = 0.45;

export function speedLingerMul(
  spec: { ref: number; exp?: number; min?: number; max?: number } | undefined,
  speed: number,
): number {
  if (!spec) return 1;
  const raw = Math.pow(Math.max(1, speed) / Math.max(1, spec.ref), spec.exp ?? 1);
  return Math.min(spec.max ?? 4, Math.max(spec.min ?? 0.25, raw));
}

export const MADDEN_CFG = { epsilon: 1e-6 };

export function foldDotSeat(window: string | null | undefined, tick: string | null): string | null {
  return window === undefined || window === tick ? tick : null;
}

export const REMNANT_COLORS: Record<RemnantElement, string> = {
  fire: '#ff7a3a', cold: '#7ac8e8', lightning: '#ffe14a',
};

export const CORPSE_CFG = {
  /** Seconds a fresh corpse stays raisable/detonable. */
  duration: 6,
  /** World cap — the oldest remnant fades first. */
  max: 40,
  /** Producer mints (Exhume's spawnCorpse effect): scatter around the mark,
   *  and the stand-in body's life when no real death backs the corpse. */
  mint: { spread: 42, life: 30, lifePerLevel: 8 },
  /** Multi-corpse feasts (TargetingSpec.plural × the corpseBatch stat). */
  batch: { aoePerExtra: 0.12, durationPerExtra: 0.15, projectilesPerExtra: 1 },
};

let PROC_INDEX: { all: string[]; byTrigger: Record<string, Set<string>>; len: number } | null = null;

export function procIndex(): NonNullable<typeof PROC_INDEX> {
  if (!PROC_INDEX || PROC_INDEX.len !== PROC_LIST.length) {
    const byTrigger: Record<string, Set<string>> = {};
    for (const pr of PROC_LIST) (byTrigger[pr.trigger] ??= new Set()).add(pr.id);
    PROC_INDEX = { all: PROC_LIST.map(pr => pr.id), byTrigger, len: PROC_LIST.length };
  }
  return PROC_INDEX;
}

export function sceneEndCarom(nativeHost: NativeSceneCombatHost, a: Actor, opts?: { quiet?: boolean }): void {
    const run = a.caromRun;
    if (!run) return;
    a.caromRun = null;
    const c = a as Actor & {
      caromSkill?: SkillInstance; caromHits?: Map<number, number>; caromRung?: Set<number>;
    };
    const inst = c.caromSkill;
    c.caromSkill = undefined;
    c.caromHits = undefined;
    c.caromRung = undefined;
    a.endStatus(run.status);
    if (!opts?.quiet && inst && !a.dead) {
      nativeHost.movementMoment(a, inst, 'arrive');
      nativeHost.moveBlast(a, inst, a.pos);
      nativeHost.dropLingerField(a, inst, a.pos);
    }
  }

export function sceneWeightedPick(nativeHost: NativeSceneCombatHost, table: readonly PackTableEntry[], atLevel?: number): string {
    return nativeWeightedPick(table, atLevel);
  }

export function sceneThrongEvolutionHit(nativeHost: NativeSceneCombatHost, body: Actor, victim: Actor, scale: number): void {
    const bite = body.skills.find(s => s?.def.baseDamage);
    if (!bite || victim.dead || victim.passive || victim.untargetable
      || victim.tier !== body.tier || !nativeHost.hostileTo(body, victim)) return;
    let area = nativeHost.throngEvolutionBites.get(bite);
    if (!area) {
      area = makeSkillInstance({ ...bite.def, tags: [...bite.def.tags.filter(t => t !== 'attack'), 'aoe'] });
      nativeHost.throngEvolutionBites.set(bite, area);
    }
    area.level = bite.level;
    nativeHost.resolveHit(body, area, victim, scale, 0);
  }

export function sceneThrongEvolutionBurst(nativeHost: NativeSceneCombatHost, body: Actor, at: Vec2, radius: number, scale: number, except?: Actor): void {
    for (const victim of nativeHost.enemiesOf(body)) {
      if (victim.tier !== body.tier) continue;
      if (victim !== except && dist(victim.pos, at) <= radius + victim.radius)
        nativeHost.throngEvolutionHit(body, victim, scale);
    }
    nativeHost.flashes.push({ pos: { ...at }, radius, color: '#c4d578', life: 0.25, maxLife: 0.25 });
  }

export function sceneAssaultDoomCull(nativeHost: NativeSceneCombatHost, target: Actor): void {
    // DOOM CULL (#25): if the armed counter now covers what life remains,
    // it goes off EARLY — no waiting out a fuse the target won't survive.
    if (!target.dead && target.life > 0) {
      let armed = 0;
      for (const s of target.statuses) {
        if (s.rupture && STATUS_DEFS[s.id]?.cullsAtLethal) armed += s.rupture;
      }
      if (armed > 0 && armed >= target.life) {
        for (let si = target.statuses.length - 1; si >= 0; si--) {
          const s = target.statuses[si];
          if (!s.rupture || !STATUS_DEFS[s.id]?.cullsAtLethal) continue;
          target.statuses.splice(si, 1);
          if (!target.statuses.some(o => o.id === s.id)) {
            target.sheet.removeSource('status:' + s.id);
          }
          nativeHost.ruptureStatus(target, s);
        }
      }
    }
  }

export function sceneThrongOnHit(nativeHost: NativeSceneCombatHost, caster: Actor, target: Actor, wasCrit: boolean, lethal: boolean): void {
    let lord = caster;
    while (lord.owner) lord = lord.owner;
    if (lord.kind !== 'player') return;
    if (target.team === lord.team || target.passive || target.untargetable) return;
    if (lethal) nativeHost.throngLastKill.set(lord.id, vec(target.pos.x, target.pos.y));
    for (const { inst, spec } of throngSpecsOn(lord.skills)) {
      const st = inst.state ??= {};
      const evo = throngEvolution(inst);
      if (evo.hitFill) {
        st.throngEvolutionGauge = (st.throngEvolutionGauge ?? 0) + evo.hitFill;
        if (st.throngEvolutionGauge >= 100) {
          st.throngEvolutionGauge -= 100;
          nativeHost.throngGain(lord, inst, Math.ceil(Math.max(0,
            nativeHost.throngCapOf(lord, inst) - nativeHost.throngRosterCount(lord, inst)) / 2));
        }
      }
      for (const row of nativeHost.throngSources(inst, spec)) {
        if (row.kind === 'onCrit') {
          if (!wasCrit || caster !== lord) continue;
          if (nativeHost.time < (st.throngCritAt ?? 0) || !chance(row.chance)) continue;
          st.throngCritAt = nativeHost.time + (row.icd ?? THRONG_CFG.critIcd);
          const n = nativeHost.throngYieldCount(lord, inst, 1);
          for (let i = 0; i < n; i++) {
            nativeHost.mintThrongFind(lord, inst, nativeHost.throngStandNear(target.pos, target.tier),
              { ttl: THRONG_CFG.motes.ttl, tier: target.tier });
          }
        } else if (row.kind === 'gauge') {
          const fromMinion = caster !== lord;
          const counts = row.per === 'both' || (row.per === 'minionHit' ? fromMinion : !fromMinion);
          if (!counts) continue;
          st.throngGauge = (st.throngGauge ?? 0) + row.fill;
          if (st.throngGauge >= 100) {
            st.throngGauge = 0;
            const n = nativeHost.throngYieldCount(lord, inst,
              Math.round(rand(row.yield[0], row.yield[1])));
            for (let i = 0; i < n; i++) {
              nativeHost.mintThrongFind(lord, inst, nativeHost.throngStandNear(lord.pos, lord.tier),
                { ttl: THRONG_CFG.motes.ttl, tier: lord.tier });
            }
            nativeHost.text(vec(lord.pos.x, lord.pos.y - 18), 'the throng stirs',
              THRONG_CFG.joinColor, 12);
          }
        }
      }
    }
  }

export function sceneThrongOnKill(nativeHost: NativeSceneCombatHost, victim: Actor, killer: Actor | undefined): void {
    if (!killer || victim.noBounty || victim.throngWild) return;
    let lord = killer;
    while (lord.owner) lord = lord.owner;
    if (lord.kind !== 'player') return;
    for (const { inst, spec } of throngSpecsOn(lord.skills)) {
      for (const row of nativeHost.throngSources(inst, spec)) {
        if (row.kind !== 'onKill' || !chance(row.chance)) continue;
        const n = nativeHost.throngYieldCount(lord, inst, 1);
        for (let i = 0; i < n; i++) {
          nativeHost.mintThrongFind(lord, inst, nativeHost.throngStandNear(victim.pos, victim.tier),
            { ttl: THRONG_CFG.motes.ttl, tier: victim.tier });
        }
      }
    }
  }

export function sceneLiteCarve(nativeHost: NativeSceneCombatHost, 
    striker: Actor | null, at: Vec2, reach: number,
    test?: (pos: Vec2, radius: number) => boolean,
    story: number | null = striker ? striker.tier : null,
    minionCombatArea = true,
  ): void {
    const pool = nativeHost.lite;
    if (!pool.liveCount) return;
    const kinds = nativeHost.liteKinds;
    const carveTeam = striker ? (striker.team === 'player' ? 0 : 1) : -1;
    const pad = nativeHost.liteMaxR + 8;
    const rr = (reach + pad) * (reach + pad);
    // PLY REND (the exterminator's stat): extra plies torn per carve — the
    // striker's untagged fold (skill-scoped grants ride the real ply gate;
    // the pool reads the global lane). Invariant per carve.
    const tears = 1 + (striker ? Math.max(0, Math.floor(striker.sheet.get('plyRend'))) : 0);
    let areaAvoidance: Map<number, number> | undefined;
    let torn = 0, fx = 0, cx = 0, cy = 0;
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      if (carveTeam >= 0 && pool.team[i] !== carveTeam) continue;
      if (story !== null && pool.story[i] !== story) continue; // the strike's story (null = the world-authored hitAll law)
      const dx = pool.x[i] - at.x, dy = pool.y[i] - at.y;
      if (dx * dx + dy * dy > rr) continue;
      const k = kinds[pool.kind[i]];
      if (!k) continue;
      nativeHost.liteVec.x = pool.x[i];
      nativeHost.liteVec.y = pool.y[i];
      if (test) { if (!test(nativeHost.liteVec, k.radius)) continue; }
      else if (Math.sqrt(dx * dx + dy * dy) - k.radius > reach) continue;
      // Owned pooled bodies share their anchor's area protection. Ordinary
      // projectile sweeps and non-area melee still carve without this roll.
      if (minionCombatArea && pool.owner[i]) {
        const key = pool.owner[i] * 256 + pool.kind[i];
        let avoid = areaAvoidance?.get(key);
        if (avoid === undefined) {
          const keeper = nativeHost.actorById(pool.owner[i]);
          const anchor = keeper?.skills.find(s => s?.def.throng?.monsterId === k.defId);
          avoid = keeper && anchor ? nativeHost.minionAreaAvoidanceOf(keeper, anchor) : 0;
          (areaAvoidance ??= new Map()).set(key, avoid);
        }
        if (avoid > 0 && chance(avoid)) continue;
      }
      // Any carve is a DISTURBANCE — the regrowth law's quiet clock stamps
      // whether the body tore or died (the collective noticed either way).
      nativeHost.litePocketDisturb(pool.pocket[i]);
      if (pool.plies[i] > tears) {
        pool.plies[i] -= tears;
        if (fx < LITE_CFG.fx.flashes) {
          fx++;
          nativeHost.flashes.push({ pos: vec(pool.x[i], pool.y[i]), radius: k.radius + 3, color: '#ffffff', life: 0.1, maxLife: 0.1 });
        }
        continue;
      }
      torn++;
      cx += pool.x[i]; cy += pool.y[i];
      if (fx < LITE_CFG.fx.flashes) {
        fx++;
        nativeHost.flashes.push({ pos: vec(pool.x[i], pool.y[i]), radius: k.radius + 6, color: k.color, life: 0.22, maxLife: 0.22 });
      }
      nativeHost.liteNoteDeath(k, pool.team[i], striker);
      pool.free(i);
    }
    if (torn >= LITE_CFG.fx.countTextAt) {
      nativeHost.text(vec(cx / torn, cy / torn - 10), `×${torn}`, '#e8d8a0', 13);
    }
  }

export function sceneLitePromoteNearest(nativeHost: NativeSceneCombatHost, at: Vec2, opts: {
    within: number; max: number;
    owner?: number; kindIdx?: number; opposing?: Team;
    /** Rank candidates by distance to THIS point instead of `at` (the grab
     *  swing: search around the caster, promote what the cursor points at). */
    rank?: Vec2;
    /** The story the picker stands on (the sovereignty gate): only rows on
     *  it promote — a tide in the street is nobody's latch from the duct. */
    story?: number;
  }): Actor[] {
    const pool = nativeHost.lite;
    const picks: { i: number; d: number }[] = [];
    const carveTeam = opts.opposing ? (opts.opposing === 'player' ? 0 : 1) : undefined;
    const rank = opts.rank ?? at;
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      if (opts.owner !== undefined && pool.owner[i] !== opts.owner) continue;
      if (opts.kindIdx !== undefined && pool.kind[i] !== opts.kindIdx) continue;
      if (carveTeam !== undefined && pool.team[i] !== carveTeam) continue;
      if (opts.story !== undefined && pool.story[i] !== opts.story) continue; // its own story's rows (the sovereignty gate)
      const dx = pool.x[i] - at.x, dy = pool.y[i] - at.y;
      if (dx * dx + dy * dy > opts.within * opts.within) continue;
      const rx = pool.x[i] - rank.x, ry = pool.y[i] - rank.y;
      picks.push({ i, d: rx * rx + ry * ry });
    }
    picks.sort((a, b) => a.d - b.d);
    const out: Actor[] = [];
    for (const pick of picks) {
      if (out.length >= opts.max) break;
      const body = nativeHost.promoteLite(pick.i);
      if (body) out.push(body);
    }
    return out;
  }

export function sceneLitePourAt(nativeHost: NativeSceneCombatHost, caster: Actor, fx: LitePourEffect, at: Vec2): number {
    const kindIdx = nativeHost.liteKindOf(fx.monsterId);
    if (kindIdx < 0) return 0;
    const k = nativeHost.liteKinds[kindIdx];
    const n = randInt(fx.count[0], fx.count[1]);
    const team: 0 | 1 = caster.team === 'player' ? 1 : 0;
    const owner = fx.owned ? caster.id : 0;
    let pk = -1;
    if (!fx.owned) {
      for (let i = 0; i < nativeHost.litePockets.length; i++) {
        const p = nativeHost.litePockets[i];
        if (p.anchorId === caster.id && p.kindIdx === kindIdx && !p.extinct) { pk = i; break; }
      }
    }
    const scatter = fx.scatter ?? LITE_CFG.pour.scatter;
    let made = 0;
    for (let s = 0; s < n; s++) {
      const ang = rand(0, Math.PI * 2);
      const d = rand(4, scatter);
      const bx = at.x + Math.cos(ang) * d, by = at.y + Math.sin(ang) * d;
      const open = nativeHost.liteOpenAt(bx, by);
      if (nativeHost.lite.spawn(kindIdx, open ? bx : at.x, open ? by : at.y, team, owner,
        k.plies0, pk) >= 0) {
        made++;
        if (pk >= 0) {
          const p = nativeHost.litePockets[pk];
          p.poured = true;
          p.live++;
        }
      }
    }
    return made;
  }

export function sceneGrabThrowRelease(nativeHost: NativeSceneCombatHost, 
    a: Actor, impulse: number, dir: number, inst?: SkillInstance, damageMult?: number,
  ): void {
    const hold = a.gripping;
    if (!hold) return;
    const v = nativeHost.actorById(hold.id);
    nativeHost.grabRelease(a);
    if (!v || v.dead) return;
    // The catch leaves from the holder's rim along the throw — the flight
    // starts clear of the thrower's own body.
    v.pos = nativeHost.clampPos(vec(
      a.pos.x + Math.cos(dir) * (a.radius + v.radius) * 0.9,
      a.pos.y + Math.sin(dir) * (a.radius + v.radius) * 0.9), v.radius);
    v.facing = dir + Math.PI;
    if (damageMult && inst && nativeHost.hostileTo(a, v)) {
      nativeHost.resolveHit(a, inst, v, damageMult, 0);
    }
    if (!v.dead) nativeHost.pushActor(v, dir, impulse, a, inst);
    nativeHost.flashes.push({
      pos: vec(a.pos.x, a.pos.y), radius: a.radius + v.radius + 10,
      color: '#d8a06a', life: 0.2, maxLife: 0.2,
    });
  }

export function sceneLayFissure(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance, from: Vec2, ang: number,
    d: GroundDelivery,
    useMult: number, flatBonus: Partial<Record<DamageType, number>> | undefined,
    branches: number, fan = 0,
  ): void {
    const fz = d.fissure!;
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const aoeScale = caster.sheet.get('aoeRadius', tags, extra);
    const durScale = caster.sheet.get('effectDuration', tags, extra);
    const step = fz.step ?? d.radius * 1.1;
    const n = Math.min(28, Math.max(2, Math.ceil(fz.length / step)));
    // THE PATH: n points with tangents, walked at the tear speed. A warp
    // keeps the crack's length and textures but abandons the straight line.
    const warp = socketSpec(inst, 'fissurePath');
    const pts: { x: number; y: number; ang: number }[] = [];
    if (warp?.kind === 'orbit') {
      // Ring around the CASTER: the aim distance sets the radius; the fan
      // index lays concentric rings outward — the crack tears AROUND you.
      const R = Math.max(56, dist(caster.pos, from)) + fan * step * 2.2;
      const cx = caster.pos.x, cy = caster.pos.y;
      for (let i = 0; i < n; i++) {
        const th = ang + (step * (i + 0.5)) / R;
        pts.push({ x: cx + Math.cos(th) * R, y: cy + Math.sin(th) * R, ang: th + Math.PI / 2 });
      }
    } else if (warp?.kind === 'spiral') {
      // Archimedean unwind out of the impact point; fans rotate the arms
      // (the crack galaxy). Radius grows linearly with the swept angle.
      const turns = warp.turns ?? 1.6;
      const rMax = Math.max(40, fz.length / (Math.PI * turns));
      const r0 = Math.max(14, step * 0.6);
      const grow = (rMax - r0) / (Math.PI * 2 * turns);
      let th = ang, r = r0;
      for (let i = 0; i < n; i++) {
        pts.push({ x: from.x + Math.cos(th) * r, y: from.y + Math.sin(th) * r, ang: th + Math.PI / 2 });
        const dth = step / Math.max(16, r);
        th += dth; r = Math.min(rMax, r + grow * dth);
      }
    } else if (warp?.kind === 'serpent') {
      // The drunk tear: each step's heading weaves around the bearing.
      const amp = ((warp.waveDeg ?? 38) * Math.PI) / 180;
      let px = from.x, py = from.y;
      for (let i = 0; i < n; i++) {
        const h = ang + Math.sin(i * 0.85) * amp;
        px += Math.cos(h) * step; py += Math.sin(h) * step;
        pts.push({ x: px, y: py, ang: h });
      }
    } else {
      for (let i = 0; i < n; i++) {
        pts.push({
          x: from.x + Math.cos(ang) * step * (i + 0.5),
          y: from.y + Math.sin(ang) * step * (i + 0.5),
          ang,
        });
      }
    }
    // The crack's TEXTURE grafts (SupportDef): volatile re-lighting,
    // caster-run-over aftershocks and the roulette's dealt steps ride
    // every lingering segment — and they IMPOSE a linger where the skill
    // brings none (a texture needs a surface; the crack stays open long
    // enough to matter).
    const volatile = socketSpec(inst, 'fissureVolatile');
    const aftershock = socketSpec(inst, 'fissureAftershock');
    const roulette = socketSpec(inst, 'fissureRoulette');
    const segLinger = (secs: number): number =>
      (volatile || aftershock || roulette) ? Math.max(secs, 5) : secs;
    // THE IMPOSED-SURFACE LAW, fissure edition (2026-07-22 — the Volcanic
    // Heart audit): a linger the texture gems IMPOSED carries NO ordinary
    // ticks — the texture (re-lights, armed detonations, dealt steps) is
    // the crack's whole life. A skill's OWN linger keeps its burning
    // ticks as authored. Without this, an armed-but-quiet stretch dealt
    // steady contact damage and the re-light read as noise on top.
    const ownFizLinger = (d.lingerDuration ?? 0) > 0;
    // Each placement is a true LINE SEGMENT (a capsule the width of the
    // crack) — the fracture IS the hitbox, laid tangent-wise at its path
    // point. Branches and the closing passes carry their own bearings.
    // SIZE ENVELOPE: the capsule's HALF-WIDTH breathes on the same walk
    // discs do — a contracting crack knits itself shut, a blooming one
    // splits wider as it lives (each segment from its own birth width).
    const fizSizeOver = resolveSizeOver(instanceSizeOver(inst));
    // THE MADNESS BANK: the crack is one ground — every lingering segment
    // (spine, branches, the meleeFissure lash) wears the skill's one bank.
    const maddenBank = nativeHost.maddenBankOf(inst);
    const lay = (px: number, py: number, segAng: number, delay: number, mult: number, linger: number): void => {
      const half = step / 2;
      {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
        pos: nativeHost.clampPos(vec(px, py), 10),
        radius: d.radius * aoeScale * (fizSizeOver?.from ?? 1),
        seg: {
          ax: px - Math.cos(segAng) * half, ay: py - Math.sin(segAng) * half,
          bx: px + Math.cos(segAng) * half, by: py + Math.sin(segAng) * half,
        },
        caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: inst.def.color,
        delay, exploded: false,
        linger,
        tickInterval: ownFizLinger ? (d.tickInterval ?? 0.5) : Infinity,
        tickTimer: ownFizLinger ? 0 : Infinity,
        linger0: linger,
        sizeOver: fizSizeOver,
        radius0: fizSizeOver ? d.radius * aoeScale : undefined,
        shape: 0, facing: segAng,
        dmgMult: mult, depth: 1,
        // The PRIMARY chain carries the emitter (spirits rise from the
        // whole crack); the closing passes and branches stay plain. Its
        // cadence rides along (spec's own intervalStep or a cadence graft).
        emit: linger > 0 ? d.emit : undefined,
        emitStep: linger > 0
          ? (socketSpec(inst, 'cadence')?.intervalStep ?? d.emit?.intervalStep)
          : undefined,
        // LINGERING FUME: a venting crack — each segment keeps its own
        // dwell ledger (breath is local to the stretch you stand on).
        // Grafted fumes (SupportDef.exposure) vent here too. Cracks do
        // NOT carry GroundDelivery.pulse: re-lighting is the fissure-
        // texture gems' vocabulary (volatility, arming, waltz).
        exposure: (() => {
          const after = socketSpec(inst, 'exposure')?.after ?? d.exposure;
          return after && linger > 0
            ? { after, dwell: new Map<number, number>() } : undefined;
        })(),
        madden: linger > 0 ? maddenBank : undefined,
        volatile: linger > 0 && volatile
          ? { ...volatile, next: nativeHost.time + delay + volatile.interval } : undefined,
        aftershock: linger > 0 && aftershock
          ? { ...aftershock, readyAt: nativeHost.time + delay } : undefined,
        roulette: linger > 0 && roulette
          ? { ...roulette, next: nativeHost.time + delay + roulette.interval, armedUntil: 0 } : undefined,
        flatBonus,
      });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
    };
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      const delay = (d.delay ?? 0.1) + (step * i) / fz.speed;
      lay(pt.x, pt.y, pt.ang, delay, useMult, segLinger(d.lingerDuration ?? 0) * durScale);
      // BRANCHES fork off evenly spaced segments, alternating sides —
      // half-length STRAIGHT child cracks (contrast against a warped
      // spine reads as real forks), barren of further forks.
      if (branches > 0 && i > 0 && i % Math.max(1, Math.floor(n / (branches + 1))) === 0) {
        const side = (Math.floor(i / Math.max(1, Math.floor(n / (branches + 1)))) % 2 === 0) ? 1 : -1;
        const bAng = pt.ang + side * (fz.branchDeg ?? 42) * Math.PI / 180;
        const bn = Math.max(2, Math.floor(n / 2));
        for (let k = 0; k < bn; k++) {
          lay(pt.x + Math.cos(bAng) * step * (k + 0.5),
            pt.y + Math.sin(bAng) * step * (k + 0.5),
            bAng,
            delay + (step * k) / fz.speed,
            useMult * 0.75,
            segLinger((d.lingerDuration ?? 0) * 0.7) * durScale);
        }
      }
    }
    // THE CLOSING PASSES: the crack zips shut from the far end home — once
    // by the skill's own close, and AGAIN per Restless Wound (the graft
    // grants a first pass where the skill brings none; each FURTHER pass
    // is rolled at its chance, and the first miss ends the chain).
    const reclose = socketSpec(inst, 'fissureReclose');
    const closeSpec = fz.close
      ?? (reclose ? { delay: reclose.interval, damageScale: reclose.damageScale } : undefined);
    if (closeSpec) {
      let passes = 1;
      if (reclose) {
        for (let k = 0; k < reclose.times && chance(reclose.chance); k++) passes++;
      }
      const openDone = (d.delay ?? 0.1) + (step * n) / fz.speed;
      const zipDur = (step * n) / (fz.speed * 1.4);
      for (let pass = 0; pass < passes; pass++) {
        const start = openDone + closeSpec.delay + pass * (zipDur + (reclose?.interval ?? 0.8));
        const scale = pass === 0 ? closeSpec.damageScale : reclose!.damageScale;
        for (let i = 0; i < n; i++) {
          const pt = pts[i];
          lay(pt.x, pt.y, pt.ang,
            start + (step * (n - 1 - i)) / (fz.speed * 1.4),
            useMult * scale, 0);
        }
      }
    }
  }

export function sceneRingBell(nativeHost: NativeSceneCombatHost, bell: Actor): boolean {
    const st = bell.construct;
    if (!st?.castOnStruck || !st.castInst || bell.dead) return false;
    if (nativeHost.time < (st.bellReadyAt ?? 0)) return false;
    st.bellReadyAt = nativeHost.time
      + (bell.summonInst?.def.delivery.type === 'construct'
        ? (bell.summonInst.def.delivery.interval ?? 0.6) : 0.6);
    bell.useLock = 0;
    bell.mana = bell.maxMana();
    nativeHost.executeSkill(bell, st.castInst,
      vec(bell.pos.x, bell.pos.y), { keepFacing: true, noRepeat: true });
    return true;
  }

export function sceneStrikeSurfaces(nativeHost: NativeSceneCombatHost, 
    striker: Actor | null, at: Vec2, reach: number,
    test?: (pos: Vec2, radius: number) => boolean,
    struck?: Set<number>,
    strikeTier?: number,
    minionCombatArea = true,
  ): void {
    // THE LAYER SOVEREIGNTY GATE (the tier fabric): a strike happens ON a
    // story — the striker's own, or the flight's, passed as `strikeTier` —
    // and only that story's surfaces answer: a swing in the root ducts pops
    // no dewdrop on the street above, and the street's mallet rings no bell
    // below. Ownerless blasts with no explicit story (death bursts baked
    // past their actor, sky strikes) stay tier-agnostic — the world-authored
    // hitAll law. Flat zones: every side reads story 0, nothing changes.
    const story = strikeTier ?? (striker ? striker.tier : null);
    const within = (pos: Vec2, radius: number): boolean =>
      test ? test(pos, radius) : dist(at, pos) - radius <= reach;
    if (!striker?.construct) {
      for (const c of nativeHost.actorsNear(at.x, at.y, reach + 64, nativeHost.surfaceScratch)) {
        if (c.dead || c === striker || !c.construct?.castOnStruck) continue;
        if (striker && c.team !== striker.team) continue; // cross-team rings ride resolveHit
        if (story !== null && c.tier !== story) continue; // its story's bells only
        if (struck?.has(c.id)) continue;
        if (!within(c.pos, c.radius)) continue;
        struck?.add(c.id);
        if (nativeHost.ringBell(c)) {
          nativeHost.flashes.push({
            pos: vec(c.pos.x, c.pos.y), radius: c.radius + 10,
            color: c.color, life: 0.2, maxLife: 0.2,
          });
        }
      }
    }
    for (const o of nativeHost.doodadsNear(at.x, at.y, reach)) {
      if (o.gone || !within(o.pos, o.radius)) continue;
      if (story !== null && (o.tier ?? 0) !== story) continue; // its story's furniture only
      const rule = doodadRuleOf(o.kind);
      // RESONANT kinds toll on ANY strike that plays the surfaces — the ring
      // sounds whether or not the stone also breaks (a pop tolls loudest via
      // popBrittle's own call; the per-stone cooldown folds the two into one).
      if (rule.resonance) nativeHost.resonate(o, rule.resonance);
      const br = rule.brittle;
      if (!br || !br.on.includes('hit')) continue;
      nativeHost.popBrittle(o, striker, at); // `at` = the blow's seat (the dissolution grammar's strike point)
    }
    // THE LITE TIER (engine/lite.ts): the same strike CARVES THE POOL with
    // the delivery's exact geometry — every verb that plays the surfaces
    // (melee arcs, novas, splash, zone pulses, ownerless blasts) mows the
    // crowd automatically, present and future alike.
    nativeHost.liteCarve(striker, at, reach, test, story, minionCombatArea);
  }

export function sceneAttuneCrystal(nativeHost: NativeSceneCombatHost, a: Actor, tone: DamageType, striker?: Actor | null, strikeInst?: SkillInstance | null): void {
    const spec = a.tune;
    if (!spec || a.tone === tone) return;
    const prev = a.tone;
    a.tone = tone;
    if (prev) a.endStatus(attunedStatus(prev));
    nativeHost.withCombatStatusSource(a, striker, strikeInst, () => a.applyStatus(attunedStatus(tone), 0, TUNE_CFG.holdScale, 'attunement'));
    const tint = toneTint(tone);
    const washFor = spec.pulse === false ? 0
      : spec.pulse?.duration ?? TUNE_CFG.pulseDuration;
    if (washFor > 0 && nativeHost.time - a.attunePulsedAt >= TUNE_CFG.pulseIcd) {
      a.attunePulsedAt = nativeHost.time;
      const radius = (spec.pulse === false ? undefined : spec.pulse?.radius)
        ?? TUNE_CFG.pulseRadius;
      const sdef = STATUS_DEFS[attunedStatus(tone)];
      // THE FAVORED PULSE (tuneFavor — the Mineral Tuning support, THE SCALD
      // KIT K2): a striker who invested in the stone takes the crystal's
      // side. The wash it authored SPARES that striker's enemies and runs
      // ×(1 + favor) longer on their allies — the prism snail fights FOR the
      // build that tuned it. Unfavored strikes keep the fabric's own law
      // (the crystal doesn't take sides), byte for byte. Read with the
      // STRIKING INSTANCE's own context, so a socketed gem's skill-local
      // mods are in scope exactly like every other rider on that blow.
      const favor = striker
        ? striker.sheet.get('tuneFavor',
          strikeInst ? skillContextTags(strikeInst.def, grantedTags(strikeInst)) : undefined,
          strikeInst ? instanceMods(strikeInst) : undefined)
        : 0;
      const scale = washFor * (1 + Math.max(0, favor)) / Math.max(0.01, sdef?.duration ?? washFor);
      for (const x of nativeHost.actorsNear(a.pos.x, a.pos.y, a.radius + radius + 64, nativeHost.attuneScratch)) {
        if (x === a || x.dead || x.downed || x.construct || x.passive) continue;
        if (!sameStory(x, a)) continue; // the sovereignty gate
        if (dist(x.pos, a.pos) - x.radius > a.radius + radius) continue;
        if (favor > 0 && striker && nativeHost.hostileTo(striker, x)) continue;
        nativeHost.withCombatStatusSource(x, striker, strikeInst, () => x.applyStatus(attunedStatus(tone), 0, scale, 'attunement'));
        nativeHost.flashes.push({
          pos: vec(x.pos.x, x.pos.y), radius: x.radius + 5,
          color: tint, life: 0.16, maxLife: 0.16,
        });
      }
      nativeHost.flashes.push({
        pos: vec(a.pos.x, a.pos.y), radius: a.radius + radius,
        color: tint, life: 0.45, maxLife: 0.45, fx: 'tune', // M-TOLL: the wash ring in the tone's tint (the reach is the ring)
      });
    }
    nativeHost.flashes.push({
      pos: vec(a.pos.x, a.pos.y), radius: a.radius + 12,
      color: tint, life: 0.25, maxLife: 0.25,
    });
    nativeHost.puzzleTuned(a, tone, striker ?? null);
  }

export function sceneKnockFixtures(nativeHost: NativeSceneCombatHost, caster: Actor, target: Actor, tone: DamageType | null, wounding: boolean,
    inst?: SkillInstance | null): void {
    if (target.dead) return;
    if (tone && target.tune && !target.untargetable && tone !== target.tone
      && !target.tune.locked && toneAccepted(target.tune, tone)) {
      // The striking INSTANCE rides along so skill-local tuning grafts
      // (Mineral Tuning) are in scope at the pulse — the blow's own gems.
      nativeHost.attuneCrystal(target, tone, caster, inst);
    }
    if (target.puzzleNode) nativeHost.puzzleStruck(target, caster, wounding);
  }

export function sceneSpawnAftershocks(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, at: Vec2, radius: number, shape: AoeShape, depth = 0): void {
    if (depth > 0) return; // aftershocks don't scatter further
    const tags = skillContextTags(inst);
    const extra = instanceMods(inst);
    const scatter = Math.round(caster.sheet.get('aoeScatter', tags, extra));
    for (let i = 0; i < scatter; i++) {
      const ang = rand(0, Math.PI * 2);
      const r = rand(radius * 0.4, radius * 1.1);
      {
let nativeStorage: typeof nativeHost.zones;
let nativeRecord: typeof nativeHost.zones[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = {
        pos: nativeHost.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 10),
        radius: radius * 0.5,
        caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: inst.def.color,
        delay: 0.3 + i * 0.12, exploded: false,
        linger: 0, tickInterval: 0.5, tickTimer: 0,
        shape, facing: ang,
        dmgMult: 0.5, depth: 1,
      });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
    }
  }

export function sceneTryShellBlock(nativeHost: NativeSceneCombatHost, victim: Actor, threatPos: Vec2, packet: DamagePacket, attacker?: Actor): boolean {
    if (nativeHost.tryShellPool(victim, threatPos, packet, victim.shellGuard)) return true;
    // Worn summons contribute separate pools in birth order; neither their
    // depletion nor removal can overwrite an anatomical or aura shell.
    for (const body of victim.summonShells ?? []) {
      if (body.dead || !nativeHost.actors.includes(body)) { victim.summonShells?.delete(body); continue; }
      if (!body.summonShell || body.owner !== victim || body.dead || body.downed || victim.dead || victim.downed) continue;
      if (!body.summonInst || !victim.skills.includes(body.summonInst)) continue;
      const before = body.shellGuard?.pool ?? 0;
      const blocked = nativeHost.tryShellPool(victim, threatPos, packet, body.shellGuard);
      if (attacker && (body.shellGuard?.pool ?? 0) < before) nativeHost.applyThorns(body, attacker);
      if (blocked) return true;
    }
    return false;
  }

export function sceneResolveParryDamage(nativeHost: NativeSceneCombatHost, caster: Actor, target: Actor, payload: ParryDamage, scale = 1, threatPos = caster.pos): void {
    // Consume the contact latch even when the retaliation window refuses
    // this wound, so the next unrelated hit cannot inherit its body segment.
    const parrySegment = target.segHitPending;
    target.segHitPending = undefined;
    if (target.dead || target.invulnerable || !nativeHost.parryDamageWindow.ready(target, nativeHost.time)) return;
    const packet = parryCounter(payload, scale);
    if (!Object.values(packet.amounts).some(v => (v ?? 0) > 0)) return;
    if (nativeHost.tryShellBlock(target, threatPos, packet, caster)) {
      nativeHost.parryDamageWindow.spend(target, nativeHost.time);
      return;
    }
    const before = target.life;
    target.segHitPending = parrySegment;
    const result = applyHit(caster, target, packet);
    // A fully soaked wound still spends defense: protect the pools as well.
    if (!result.evaded && !result.immune && (!result.blocked || result.total > 0 || result.plyEaten)) {
      nativeHost.parryDamageWindow.spend(target, nativeHost.time);
    }
    nativeHost.recordIndirectDamage(target, caster, before);
    if (result.clamped) nativeHost.showCombatOutcome(target, 'hit_cap', threatPos);
    if (result.culled) nativeHost.showCombatOutcome(target, 'culled', threatPos);
    if (result.total > 0) nativeHost.text(target.pos, Math.round(result.total).toString(), '#ffd700', 14);
    if (target.life <= 0 && !target.dead) nativeHost.kill(target, false, caster);
  }

export function sceneTryGuardBlock(nativeHost: NativeSceneCombatHost, victim: Actor, attacker: Actor, threatPos: Vec2, rawDamage: number, parryProjectile?: Projectile, parryPacket?: DamagePacket): boolean {
    const guardian = nativeHost.guardianFor(victim);
    if (!guardian) return false;
    const cs = guardian.casting!;
    const spec = cs.inst.def.guard;
    if (!spec || (cs.shield ?? 0) <= 0) return false;
    const arc = guardArcRadians(guardian);
    if (Math.abs(angleDiff(guardian.facing, angleTo(guardian.pos, threatPos))) > arc / 2) return false;

    // Active guards and parries are blocks in the native recency ledger too.
    // Stamp the actual defender, including a guardian intercepting for an ally.
    guardian.noteRecent('block');
    if (guardian === nativeHost.player && nativeHost.deedEnemy(attacker) && rawDamage > 0) {
      nativeHost.recordDeed({ kind: 'block', value: rawDamage });
    }

    // PARRY: a block inside the opening window costs nothing and ripostes.
    // The window comes from the skill's own spec OR from the guardParry
    // stat (the Perfect Timing support grafts it onto any guard skill).
    const gtags = skillContextTags(cs.inst.def);
    const gextra = instanceMods(cs.inst);
    const window = spec.parry?.window
      ?? guardian.sheet.get('guardParry', gtags, gextra);
    const counterMult = (spec.parry?.counterMult
      ?? guardian.sheet.get('guardParryPower', gtags, gextra))
      + guardian.sheet.get('parryCounterBonus', gtags, gextra);
    if (window > 0 && (cs.channelTime ?? 99) <= window) {
      const parryCueFacing = angleTo(guardian.pos, threatPos);
      // Riposte snaps the guardian's face toward the parried blow.
      guardian.facing = angleTo(guardian.pos, attacker.pos);
      if (parryProjectile) {
        nativeHost.reflectParriedProjectile(parryProjectile, guardian, counterMult, parryPacket);
      } else if (!attacker.dead && !attacker.invulnerable
        && nativeHost.parryDamageWindow.ready(attacker, nativeHost.time)) {
        const counter = Math.max(0, rawDamage * counterMult * attacker.sheet.get('damageTaken'));
        if (counter > 0) {
          nativeHost.parryDamageWindow.spend(attacker, nativeHost.time);
          const before = attacker.life;
          landLifeDamage(attacker, counter);
          nativeHost.recordIndirectDamage(attacker, guardian, before);
          attacker.hitFlash = 0.15;
          attacker.hitFlashType = undefined;
          nativeHost.text(attacker.pos, Math.round(counter).toString(), '#ffd700', 14);
          nativeHost.flashes.push({
            pos: vec(attacker.pos.x, attacker.pos.y), radius: attacker.radius + 10,
            color: '#ffd700', life: 0.25, maxLife: 0.25,
          });
          if (attacker.life <= 0 && !attacker.dead) nativeHost.kill(attacker, false, guardian);
        }
      }
      nativeHost.flashes.push(combatCueFlash(vec(guardian.pos.x + Math.cos(parryCueFacing) * (guardian.radius + 10), guardian.pos.y + Math.sin(parryCueFacing) * (guardian.radius + 10)), 'parry', 16, parryCueFacing));
      // A parry IS a block — the finest one; block taps, procs and
      // trigger gems all answer it.
      nativeHost.tapCharges(guardian, 'block');
      nativeHost.rollOwnProcs(guardian, 'block', {});
      nativeHost.rollTriggers(guardian, 'block', { aim: vec(attacker.pos.x, attacker.pos.y) });
      // Riposte-style stances spend themselves on the answer.
      if (spec.endOnParry) {
        guardian.casting = null;
        guardian.useLock = 0.15;
        if (cs.inst.def.cooldown > 0) {
          nativeHost.stampSkillCooldown(guardian, cs.inst, cs.inst.def.cooldown);
        }
      }
      return true;
    }

    const guardArtHit = nativeHost.guardArts.guardHit(guardian, cs.inst, rawDamage);
    cs.shield = Math.max(0, (cs.shield ?? 0) - guardArtHit.damage);
    if (cs.shield > 0 && guardArtHit.restore > 0) cs.shield += ((cs.maxShield ?? cs.shield) - cs.shield) * guardArtHit.restore;
    nativeHost.flashes.push(defenseCueFlash(guardian, 'guard', 'impact', cs.inst.def.color,
      { facing: angleTo(guardian.pos, threatPos), arc }));
    nativeHost.applyThorns(guardian, attacker);
    nativeHost.tapCharges(guardian, 'block');
    // CAST-ON-BLOCK trigger gems answer the raised-shield block too.
    nativeHost.rollTriggers(guardian, 'block', { aim: vec(attacker.pos.x, attacker.pos.y) });
    if ((cs.shield ?? 0) <= 0) {
      nativeHost.guardArts.lower(guardian, cs.inst);
      guardian.casting = null;
      guardian.useLock = 0.3;
      if (cs.inst.def.cooldown > 0) nativeHost.stampSkillCooldown(guardian, cs.inst, cs.inst.def.cooldown);
      nativeHost.flashes.push(defenseCueFlash(guardian, 'guard', 'break', cs.inst.def.color,
        { arc }));
      // Ice Shield's dying burst: a broken shield spends its FULL absorbed
      // capacity as the payload — with the stance's EFFECTIVE bash, innate
      // or socket-grafted (and the inverted contract agrees: a broken wall
      // has lost everything, so the numbers meet at the same place).
      if (spec.bashOnBreak) {
        const bash = guardBashSpec(cs.inst);
        if (bash) nativeHost.guardBash(guardian, cs.inst, bash, cs.maxShield ?? 0);
      }
    }
    return true;
  }

export function sceneGuardBash(nativeHost: NativeSceneCombatHost, a: Actor, inst: SkillInstance, bash: GuardBashSpec, payloadShield: number): void {
    if (a.dead || payloadShield <= 0) return;
    const { radius: reach, arc: arcRad, fullCircle } = guardBashGeometry(a, bash);
    const elem = (['fire', 'cold', 'lightning'] as const)
      .find(e => inst.def.tags.includes(e) || grantedTags(inst).includes(e));
    // The bashPower stat is the investable lever on the payload — Reckless
    // Rampart cranks it in trade against the guard itself.
    const power = a.sheet.get('bashPower',
      skillContextTags(inst, grantedTags(inst)), instanceMods(inst));
    const flat: Partial<Record<DamageType, number>> =
      { [elem ?? 'physical']: payloadShield * bash.mult * power };
    nativeHost.guardArts.bashWave(a, inst, flat);
    // The bash contact is one hit: a shield/dodge refuses its control as
    // well as its damage, and a fuse carries the whole payload together.
    const hitEffects: SkillEffect[] = [];
    if (bash.knockback) hitEffects.push({ type: 'knockback', strength: bash.knockback });
    if (bash.stunChance) hitEffects.push({ type: 'status', status: 'stun', chance: bash.stunChance });
    for (const e of nativeHost.enemiesOf(a)) {
      if (!sameStory(a, e)) continue; // a bash is a touch (the sovereignty gate)
      if (dist(a.pos, e.pos) - e.radius > reach) continue;
      if (!fullCircle
        && Math.abs(angleDiff(a.facing, angleTo(a.pos, e.pos))) > arcRad / 2) continue;
      nativeHost.resolveHit(a, inst, e, 1, 0, flat, true, false, hitEffects);
    }
    nativeHost.flashes.push({
      pos: vec(a.pos.x, a.pos.y), radius: reach, color: inst.def.color,
      life: 0.25, maxLife: 0.25,
      fx: skillSelfVoice(inst.def.id, 'burst'), recoveryCueTier: a.tier,
      ...(fullCircle ? {} : { arc: { facing: a.facing, arcRad } }),
    });
    nativeHost.flashes.push(defenseCueFlash(a, 'guard', 'bash', inst.def.color, { arc: fullCircle ? Math.PI * 2 : arcRad }));
  }

export function sceneAddTempGround(nativeHost: NativeSceneCombatHost, pos: Vec2, kind: string, radius: number, duration: number,
    opts?: { shallow?: boolean; evaporate?: { rate?: number } }): void {
    const doodad: Doodad = {
      pos: vec(pos.x, pos.y), radius, kind,
      ...(opts?.shallow ? { shallow: true } : {}),
    };
    nativeHost.doodads.push(doodad);
    nativeHost.grounds.push(doodad);
    nativeHost.tempGrounds.push({
      doodad, remaining: duration,
      ...(opts?.evaporate
        ? { evaporate: { rate: opts.evaporate.rate ?? CREEP_CFG.front.fadeRate } }
        : {}),
    });
  }

export function sceneMoveBlast(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, at: Vec2, phase: 'depart' | 'arrive' = 'arrive'): void {
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const scale = caster.sheet.get('moveExplode', tags, extra)
      + (phase === 'depart' ? caster.sheet.get('departSplash', tags, extra) : 0);
    if (scale <= 0) return;
    const radius = 85 * caster.sheet.get('aoeRadius', tags, extra);
    for (const e of nativeHost.enemiesOf(caster)) {
      if (!sameStory(caster, e)) continue; // the blast is a touch (the sovereignty gate)
      if (dist(at, e.pos) - e.radius > radius) continue;
      nativeHost.resolveHit(caster, inst, e, scale, 1, undefined, true);
    }
    nativeHost.flashes.push({ pos: vec(at.x, at.y), radius, color: cosmeticSkillPaint(nativeHost, caster, inst.def.id).color ?? inst.def.color, life: 0.3, maxLife: 0.3,
      fx: skillMovementVoice(inst.def.id, 'impact'), facing: caster.facing, recoveryCueTier: caster.tier });
    // THE MALLET: the movement eruption is a blast — dive-bomb your bell.
    nativeHost.frontSplash(caster, inst, at, radius);
    nativeHost.strikeSurfaces(caster, at, radius);
  }

export function sceneApplyThorns(nativeHost: NativeSceneCombatHost, victim: Actor, attacker: Actor, landed = 0): void {
    if (attacker.dead || attacker.invulnerable || attacker === victim) return;
    // A held stance's own kit joins the read (Actor.stanceRead): the spiked
    // wall's 'guarding'-scoped thorns live on the skill instance, never on
    // the sheet — a bare read cannot see them.
    const sc = victim.stanceRead();
    let total = victim.sheet.get('thorns', sc?.tags, sc?.extra)
      + landed * victim.sheet.get('thornsReflect', sc?.tags, sc?.extra);
    if (sc) total += victim.sheet.get('channelThorns', sc.tags, sc.extra);
    if (total <= 0) return;
    const dealt = total * attacker.sheet.get('damageTaken');
    const deedLifeBefore = attacker.life;
    attacker.life -= dealt;
    nativeHost.recordIndirectDamage(attacker, victim, deedLifeBefore);
    attacker.hitFlash = 0.1;
    attacker.hitFlashType = undefined; // raw thorns — the flash reads white
    nativeHost.text(attacker.pos, Math.round(dealt).toString(), '#d88a50', 11);
    // applyThorns credits the defender, including an attached summon.
    if (attacker.life <= 0 && !attacker.dead) nativeHost.kill(attacker, false, victim);
  }

export function sceneExplodeActor(nativeHost: NativeSceneCombatHost, minion: Actor, fraction: number, opts?: { type?: DamageType; color?: string; recoveryCue?: string; visual?: string }): void {
    // The sourceActor carries minion damage, conversion and kill credit.
    const type = opts?.type ?? 'fire';
    const dmg = minion.maxLife() * fraction * minion.sheet.get('damage', new Set<SkillTag>(['aoe', type]));
    const radius = 45 + minion.radius * 2;
    nativeHost.burstDamage(vec(minion.pos.x, minion.pos.y), radius, dmg, type, opts?.color ?? DAMAGE_COLOR[type], minion.team, minion.tier, minion, opts?.recoveryCue, opts?.visual);
  }

export function sceneBurstDamage(nativeHost: NativeSceneCombatHost, pos: Vec2, radius: number, dmg: number, type: DamageType, color: string, sourceTeam: Team, sourceTier = 0, sourceActor?: Actor, recoveryCue?: string, visual?: string): void {
    for (const e of nativeHost.actors) {
      if (!nativeHost.isBurstTarget(e, sourceTeam, sourceTier)) continue;
      if (sourceActor && !nativeHost.hostileTo(sourceActor, e)) continue;
      if (dist(pos, e.pos) - e.radius > radius) continue;
      const out: { clamped?: boolean } = {};
      const packet: DamagePacket = { amounts: { [type]: dmg }, crit: false,
        tags: new Set<SkillTag>(['aoe', type]), sourceName: sourceActor?.summonInst?.def.name ?? sourceActor?.name ?? 'Explosion' };
      if (sourceActor) applyConversion(sourceActor, packet.amounts, packet.tags);
      const deedLifeBefore = e.life;
      const result = sourceActor ? applyHit(sourceActor, e, packet) : undefined;
      nativeHost.recordIndirectDamage(e, sourceActor, deedLifeBefore);
      const taken = result ? result.total : mitigateTyped(e, packet.amounts, { out });
      if (!sourceActor) {
        e.life -= taken;
        e.hitFlash = 0.15;
        e.hitFlashType = type;
      }
      nativeHost.text(e.pos, Math.round(taken).toString(), color, 14);
      // Area wounds show the same cap/execution outcome as direct strikes.
      if (out.clamped || result?.clamped) nativeHost.showCombatOutcome(e, 'hit_cap', pos);
      if (result?.culled) nativeHost.showCombatOutcome(e, 'culled', pos);
      if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, sourceActor);
    }
    nativeHost.flashes.push(recoveryCue ? { ...combatCueFlash(pos, recoveryCue, radius, 0, color), recoveryCueTier: sourceTier }
      : { pos: vec(pos.x, pos.y), radius, color, life: 0.35, maxLife: 0.35,
        ...(visual ? { fx: visual, recoveryCueTier: sourceTier } : {}) });
    // THE MALLET, ownerless: a baked blast rings EVERY side's bells and
    // pops brittle scenery — the exploding corpse beside the bell already
    // damaged it without a toll; now the blast answers too.
    nativeHost.strikeSurfaces(null, pos, radius);
    // The ownerless lane carries its type in hand — a marching skin under
    // the blast drinks it directly (quench/feed, FrontSpec levers).
    if (nativeHost.creep?.quenchable) nativeHost.creep.damageSkin(pos.x, pos.y, radius, { [type]: dmg });
    // THE IGNITION DIAL (FrontSpawnRow.ignition): the same blast KINDLES
    // a lit lane's fuel under it — null-cost everywhere the dial is off.
    if (nativeHost.creep?.ignitable) nativeHost.creep.igniteAt(pos.x, pos.y, radius, { [type]: dmg }, nativeHost.time);
  }

export function sceneResolveHit(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance, target: Actor,
    dmgMult = 1, depth = 0,
    flatBonus?: Partial<Record<DamageType, number>>,
    forceDamage = false,
    fromFuse = false,
    hitEffects?: SkillEffect[],
    hitOrigin?: Vec2, hitTier?: number,
  ): void {
    // Recheck at impact: an in-flight projectile, field, or delayed fuse may
    // have been committed before either side crossed the sanctuary boundary.
    if (nativeHost.sanctuaryBlocksCombat(caster,target,hitOrigin)) { target.segHitPending = undefined; return; }
    depth = Math.max(depth, inst.procChainDepth ?? 0);
    const def = inst.def;
    // THE FUSE (FuseSpec — innate or a socketed Time Fuse): the wound
    // BANKS instead of biting. The whole resolution — damage, statuses,
    // on-hit procs — arrives late (delay × the fuseDelay stat) at the
    // caster's LIVE stats, × fusePower. The landing still tells: the
    // room can read the promise burning down.
    if (!fromFuse) {
      const fuse = instanceFuse(inst);
      if (fuse) {
        const fTags = skillContextTags(inst, grantedTags(inst));
        {
let nativeStorage: typeof nativeHost.pendingFuses;
let nativeRecord: typeof nativeHost.pendingFuses[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.pendingFuses).push(nativeRecord = {
          kind: 'hit',
          due: nativeHost.time + fuse.delay
            * caster.sheet.get('fuseDelay', fTags, instanceMods(inst)),
          caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), targetId: target.id,
          mult: dmgMult, depth, flat: flatBonus, force: forceDamage, hitEffects,
          hitOrigin: { ...(hitOrigin ?? caster.pos) }, hitTier: hitTier ?? caster.tier,
        });
nativeHost.issueCombatRecord("pendingFuses", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
        nativeHost.text(vec(target.pos.x, target.pos.y - target.radius - 8),
          fuse.tell ?? '…', def.color, 11);
        nativeHost.flashes.push({
          pos: vec(target.pos.x, target.pos.y), radius: target.radius + 8,
          color: def.color, life: 0.25, maxLife: 0.25,
        });
        // SEGMENT FABRIC: the blow BANKED — drop the contact latch so the
        // late landing feeds the shared pool with no stale attribution.
        target.segHitPending = undefined;
        return;
      }
    }
    // The CALM clock: any blow involving the player's side is "recent combat"
    // for calm-gated dwells (the mercenary outpost's parley).
    if (caster.team === 'player' || target.team === 'player') {
      // Passive registered riddle props preserve the existing combat clock.
      // Actual foes still heat it; solving a riddle never clears prior danger.
      if (!target.puzzleNode || puzzleContactHeatsCombat(
        nativeHost.puzzles.find(run=>run.id===target.puzzleNode!.id), target))
        nativeHost.lastCombatAt = nativeHost.time;
      // THE GRUDGE STAMP (survivor trigger eligibility): the world notices a
      // foe that traded blows with a hero — in either direction.
      if (caster.team === 'enemy' && nativeHost.seatOf(target)) caster.grudgeMark = true;
      else if (target.team === 'enemy' && nativeHost.seatOf(caster)) target.grudgeMark = true;
    }
    // THE BETRAYAL (the possession seam): the first harm a ridden body
    // authors tears its guise for good — the pack knows its own blood.
    // Any struck body counts (blood smells the same at a distance); the
    // dial is the guise itself (PossessSpec.guise).
    if (caster.possession?.guiseFaction && !caster.possession.guiseBroken && target !== caster) {
      caster.possession.guiseBroken = true;
      nativeHost.text(vec(caster.pos.x, caster.pos.y - caster.radius - 10),
        'the guise breaks!', '#b8a8e8', 12, 'combat');
    }
    inst = nativeHost.attackSequences.forTarget(caster, inst, target, depth);
    const extra = instanceMods(inst);
    // THE DIN (the watch fabric): a resolved blow RINGS — noiseOnHit is a
    // radius, and every hostile watcher inside hears the bang at the
    // victim's feet (capped at the search rung). Read tag-scoped so the
    // Ringing Report graft rings only the skill it rides.
    {
      const din = caster.sheet.get('noiseOnHit', skillContextTags(def), extra);
      if (din > 0) nativeHost.noiseAt(target.pos, din, caster);
    }
    // Status shatter (Absolute Zero): consume the listed statuses for a
    // MORE multiplier — chilled and frozen things break beautifully.
    if (def.shatterStatus) {
      let shattered = false;
      let consumedStacks = 0;
      for (let i = target.statuses.length - 1; i >= 0; i--) {
        const s = target.statuses[i];
        if (!def.shatterStatus.statuses.includes(s.id)) continue;
        consumedStacks += s.stacks;
        target.statuses.splice(i, 1);
        target.sheet.removeSource('status:' + s.id);
        shattered = true;
      }
      if (shattered) {
        // perStack (Execution × Vulnerable): the payoff SCALES with the
        // stacks consumed — five wounds opened, one blow through them all.
        dmgMult *= def.shatterStatus.perStack
          ? 1 + (def.shatterStatus.mult - 1) * consumedStacks
          : def.shatterStatus.mult;
        nativeHost.text(vec(target.pos.x, target.pos.y - 14), 'SHATTER!', '#bfe8ff', 14, 'combat');
        nativeHost.flashes.push({
          pos: vec(target.pos.x, target.pos.y), radius: target.radius + 14,
          color: '#bfe8ff', life: 0.25, maxLife: 0.25,
        });
      }
    }
    // AMBUSH: an UNSEEN strike — the attacker is stealthed and the victim
    // not yet alerted — lands harder (the ambushBonus stat: 30% MORE for
    // anyone, investable for the committed; backstabMult stacks on top for
    // the positional art). Alert is raised AFTER the hit, so the first
    // blow from the dark is the rewarded one.
    if ((concealmentActive(caster, nativeHost.time) || caster.sheet.get('invisible') > 0)
      && target.aiTargetId !== caster.id && target.team !== caster.team && nativeHost.time >= target.alertUntil) {
      const amb = caster.sheet.get('ambushBonus', skillContextTags(def), extra);
      if (amb > 0) {
        dmgMult *= 1 + amb;
        nativeHost.text(vec(target.pos.x, target.pos.y - 18), 'AMBUSH!', '#b8d0ff', 13, 'combat');
      }
    }

    // Freeze the positional result before damage; only a landed wound earns
    // its presentation cue after the native guard/evade/immune gates below.
    let rearHit = false;
    // Positional damage: striking from behind the target's facing.
    if (def.backstabMult && def.backstabMult > 1) {
      const behind = Math.abs(angleDiff(target.facing, angleTo(target.pos, caster.pos))) > 2.0;
      if (behind) {
        dmgMult *= def.backstabMult;
        rearHit = true;
      }
    }
    // PROXIMITY (the point-blank graft): up to the stat's bonus at touch,
    // tapering linearly to nothing at DEFENSE_CFG.proximity.radius.
    {
      const prox = caster.sheet.get('proximityDamage', skillContextTags(def), extra);
      if (prox > 0) {
        const near = 1 - Math.min(1, dist(caster.pos, target.pos) / DEFENSE_CFG.proximity.radius);
        if (near > 0) dmgMult *= 1 + prox * near;
      }
    }
    // BREAKABLE OBJECTS: the OWNER's own hits demolish flagged constructs
    // at a privileged rate — and hits carrying an affinity tag swing the
    // wrecking ball harder still (frost spells vs the frost wall).
    if (target.construct?.breakable && target.owner === caster) {
      const b = target.construct.breakable;
      const aff = b.affinityTags?.some(t => def.tags.includes(t))
        ? (b.affinityMult ?? 2) : 1;
      dmgMult *= b.ownerMult * aff;
    }
    // THE VICTIM SCOPE (engine/victim.ts): the struck body's live state
    // rides the roll's context as 'vs:' tags — folded only when something
    // the striker brings names one (null-cost for every uninvested body).
    const vs = victimScopeArmed(caster.sheet, extra)
      ? victimTags(target, caster, { time: nativeHost.time }) : undefined;
    const packet: DamagePacket = rollSkillDamage(caster, inst, flatBonus, vs);
    if (dmgMult !== 1) {
      for (const t of Object.keys(packet.amounts) as (keyof typeof packet.amounts)[]) {
        packet.amounts[t]! *= dmgMult;
      }
    }
    // THE KNOCK LAW's tone snapshot: what STRUCK is the packet as rolled —
    // conversions have spoken, the septic forgo below has not (the bargain
    // rebates MAGNITUDE, never color) — so a full-forgo carrier still
    // paints a tuned body the hue it truly carried.
    const struckTone = target.tune ? toneOfAmounts(packet.amounts) : null;
    // THE SEPTIC BARGAIN (hitToAffliction): a fraction of the hit's BITE
    // is FORGONE — carved off the packet before it lands — and returns
    // through the damaging afflictions this hit produces, amplified by
    // afflictionYield (the status derivation below reads the carry). At
    // full conversion the hit is a pure carrier: the wound is the weapon.
    let afflictionCarry = 0;
    {
      const f = Math.min(1, Math.max(0,
        caster.sheet.get('hitToAffliction', skillContextTags(inst, grantedTags(inst)), extra)));
      if (f > 0) {
        let forgone = 0;
        for (const t of Object.keys(packet.amounts) as (keyof typeof packet.amounts)[]) {
          const cut = packet.amounts[t]! * f;
          packet.amounts[t]! -= cut;
          forgone += cut;
        }
        afflictionCarry = forgone
          * caster.sheet.get('afflictionYield', skillContextTags(inst, grantedTags(inst)), extra);
      }
    }
    // Guard stance: a raised shield in the threat's direction eats the
    // whole hit — damage, statuses, knockback, everything.
    const raw = Object.values(packet.amounts).reduce((s, v) => s + (v ?? 0), 0);
    if (raw > 0 && nativeHost.tryGuardBlock(target, caster, caster.pos, raw)) return;
    // SHELL GUARD (worn anatomy / the rear-guard toggle): the directional
    // absorb eats what its arc covers; a breaking blow leaks its overflow.
    if (raw > 0 && nativeHost.tryShellBlock(target, caster.pos, packet, caster)) return;

    const hasDamage = forceDamage || def.effects.some(e => e.type === 'damage');
    let dealt = 0;
    let wasCrit = false;

    if (hasDamage) {
      if (target === nativeHost.player) nativeHost.bindCombatDeeds();
      const deedLifeBefore = target.life;
      const deedHidden = caster === nativeHost.player && (caster.sheet.get('invisible') > 0 || concealmentActive(caster, nativeHost.time) || caster.sheet.get('detectability') < 1);
      const deedPanicked = caster === nativeHost.player && target.isPanicked();
      nativeHost.assaults.packet(caster, packet, depth);
      const result = applyHit(caster, target, packet);
      if (caster === nativeHost.player && target === caster) {
        nativeHost.recordSelfDamage(caster, Math.max(0, deedLifeBefore - Math.max(0, target.life)));
      }
      wasCrit = result.crit;
      if (nativeHost.metaProgressionActive()) {
        if (target === nativeHost.player && nativeHost.deedEnemy(caster)) {
          if (result.evaded) nativeHost.recordDeed({ kind: 'evade' });
          if (result.blocked && (result.blockedAmount ?? 0) > 0) nativeHost.recordDeed({ kind: 'block', value: result.blockedAmount });
          const lost = nativeHost.combatDeeds.hurt(deedLifeBefore, target.life, target.maxLife(), DEED_CFG.crisisEnter);
          if (lost > 0) nativeHost.recordDeed({ kind: 'hurt', value: lost });
        }
        if (deedLifeBefore > 0 && nativeHost.deedEnemy(target) && nativeHost.deedOwned(caster)) {
          // Every break feeds lifetime totals; only surviving targets can
          // advance a same-enemy streak. The rule owns that distinction.
          if (result.poiseBroke) nativeHost.recordDeed({ kind: 'poise', subject: target,
            flags: target.life > 0 ? ['surviving'] : [] });
          if (caster === nativeHost.player && result.total > 0 && !result.blocked && !result.immune && !result.evaded) {
            const elements = ['fire', 'cold', 'lightning'].filter(t => (result.receivedAmounts ?? packet.amounts)[t as DamageType]! > 0);
            nativeHost.recordDeed({ kind: 'hit', tags: [...packet.tags], distance: dist(caster.pos, target.pos), keys: elements,
              flags: [...elements, ...(wasCrit ? ['crit'] : []), ...(target.life <= 0 ? ['lethal'] : []),
                ...(deedHidden ? ['hidden'] : []), ...(deedPanicked ? ['panicked'] : [])] });
          }
        }
      }
      if (result.evaded) {
        nativeHost.flashes.push(combatCueFlash(target.pos, 'evade', target.radius, angleTo(target.pos, caster.pos)));
        // The evader's rewards: the deterministic lifeOnEvade floor plus
        // their own 'evade' procs (global sheet — golden rule 3).
        const mend = target.sheet.get('lifeOnEvade');
        if (mend > 0) target.healBy(mend);
        // THE RECENCY LEDGER + the consumable spend ('evade'), then the
        // evader's own procs and the striker's 'miss' procs (the
        // after-they-dodge opener — the refused body is its target).
        target.noteRecent('evade');
        target.spendBuffs('evade');
        nativeHost.rollOwnProcs(target, 'evade', { depth });
        nativeHost.rollOwnProcs(caster, 'miss', { tags: packet.tags, extra, inst, target, depth });
        return; // an evaded attack applies nothing
      }
      if (result.blocked) {
        nativeHost.flashes.push(defenseCueFlash(target, 'guard', 'impact', '#8ab8d8',
          { facing: angleTo(target.pos, caster.pos), arc: 0.85 }));
        nativeHost.applyThorns(target, caster);
        if (depth === 0) nativeHost.tapCharges(target, 'block');
        const mend = target.sheet.get('lifeOnBlock');
        if (mend > 0) target.healBy(mend);
        target.noteRecent('block');
        target.spendBuffs('block');
        nativeHost.rollOwnProcs(target, 'block', { depth });
        // The striker's 'foiled' procs: the blow was turned (the blocker
        // is the target).
        nativeHost.rollOwnProcs(caster, 'foiled', { tags: packet.tags, extra, inst, target, depth });
        // CAST-ON-BLOCK trigger gems: the made block is the event, aimed
        // back at whoever swung (passive block; guard blocks fire from
        // tryGuardBlock).
        nativeHost.rollTriggers(target, 'block', { aim: vec(caster.pos.x, caster.pos.y) });
        // A seeping block leaks its excess through (result.total) — the guard
        // law's chip can finish a wounded blocker.
        if (target.life <= 0 && !target.dead) nativeHost.kill(target, false, caster);
        return; // a passively blocked hit applies nothing either
      }
      if (result.immune) {
        nativeHost.flashes.push(combatCueFlash(target.pos, 'immune', target.radius + 8, angleTo(target.pos, caster.pos)));
        // THE KNOCK LAW: the blow CONNECTED — invulnerability zeroed the
        // wound, not the contact — so enrolled fixtures still ring and
        // tunable bodies still take the color (the bell needn't bleed).
        // Evades and blocks stayed refusals above: those never landed.
        nativeHost.knockFixtures(caster, target, struckTone, false, inst);
        return;
      }
      // THE MIMIC CAPTURE (engine/mimic.ts): a LANDED enemy art teaches a
      // watching seat — policy, the bestiary study gate, dedupe and the
      // bank cap all settle inside the fabric. Non-mimic builds pay one
      // throttled cached boolean here (the comboWatch idiom).
      if (target.kind === 'player' && caster.team === 'enemy') {
        mimicRefreshWatch(target, nativeHost.time);
        if (target.mimicWatch && mimicCapture(nativeHost, target, caster, def)) {
          nativeHost.notice(`ART CAPTURED: ${def.name}`, '#c8a0e8', 14, 'world'); // off the head, onto the feed
        }
      }
      dealt = result.total;
      if (rearHit && dealt > 0 && def.backstabCue !== false) {
        nativeHost.flashes.push(combatCueFlash(target.pos, def.backstabCue ?? 'rear_hit', target.radius,
          angleTo(target.pos, caster.pos)));
      }
      if (result.receivedAmounts) nativeHost.rollOwnProcs(target, 'struck', {
        depth, target: caster, crit: wasCrit, receivedAmounts: result.receivedAmounts,
      });
      if (dealt > 0) {
        // THE RECENCY LEDGER (engine/recency.ts): the blow landed — both
        // sides stamp it (DoT ticks never reach here: a burn is not a blow).
        caster.noteRecent('hit');
        target.noteRecent('hurt');
        if (wasCrit) { caster.noteRecent('crit'); target.noteRecent('critHurt'); }
        // 'hurt' procs — the victim's OWN sheet answers (sheet-only, golden
        // rule 3); the striker is the proc's target, so a status, an arc
        // or a shove lands on the hand that struck.
        nativeHost.rollOwnProcs(target, 'hurt', { depth, target: caster, crit: wasCrit, receivedAmounts: result.receivedAmounts });
      }
      // DAMAGE POOLS: the hit's rolled amounts feed any pool skills on the
      // attacker's bar (Venomous Aura sips chaos hits; Detonation, fire).
      if (dealt > 0) {
        for (const [ty, amt] of Object.entries(packet.amounts)) {
          nativeHost.bankPools(caster, { type: ty as DamageType }, amt ?? 0);
        }
      }
      // SIPHON (Lifedrain, Soul Volley): a fraction of the landed hit flows
      // home as HEALING — × healPower, gated by the caster's own healTaken.
      if (dealt > 0 && def.siphon && !caster.dead) {
        const gained = caster.healBy(dealt * def.siphon
          * caster.sheet.get('healPower', skillContextTags(def), extra));
        noteResourceFlow(caster, target, 'life', gained, def.feedingCue);
      }
      // VAMPIRIC SHARE (the transferred leech): a slice of the landed hit
      // heals ALLIES around the striker — the WoW-VE shape, worn as a stat
      // (a buff's mods grant it), tag-filterable like everything.
      if (dealt > 0 && depth === 0 && !caster.dead) {
        const vamp = caster.sheet.get('vampiricShare', skillContextTags(def), extra);
        if (vamp > 0) {
          const heal = dealt * vamp
            * caster.sheet.get('healPower', skillContextTags(def), extra);
          for (const ally of nativeHost.actors) {
            if (!sameStory(ally, caster)) continue; // the vampiric share reaches its own story (the sovereignty gate)
            if (ally.dead || ally.team !== caster.team || ally === caster) continue;
            if (dist(caster.pos, ally.pos) > DEFENSE_CFG.sustain.vampiricRadius) continue;
            const got = ally.healBy(heal);
            noteResourceFlow(ally, target, 'life', got, def.feedingCue);
            if (got > 0.5) nativeHost.seatText(caster, ally.pos, '+' + Math.round(got), '#8ae0a8', 10); // THE WIRE'S EYES: the healer's seat
          }
        }
        // LIFE BOND (the Chloromancer shape): the caster's damage feeds the
        // bonded ally — bondShare × the skill's bondFeed × healPower. The
        // bond lapses with its buff (or its bearer).
        if (caster.bond) {
          const bonded = nativeHost.actors.find(a => a.id === caster.bond!.targetId);
          if (!bonded || bonded.dead || !bonded.buffs.has(caster.bond.buffId)) {
            caster.bond = undefined;
          } else {
            const share = caster.sheet.get('bondShare', skillContextTags(def), extra);
            if (share > 0) {
              const got = bonded.healBy(dealt * share * (def.bondFeed ?? 1)
                * caster.sheet.get('healPower', skillContextTags(def), extra));
              if (got > 0.5) nativeHost.seatText(caster, bonded.pos, '+' + Math.round(got), '#7ee0b8', 11); // THE WIRE'S EYES: the healer's seat
            }
          }
        }
      }
      // TREES OF LIFE drink the violence: same-side trees in range bank the
      // landed damage toward their healing burst (and visibly swell).
      if (dealt > 0 && depth === 0) {
        for (const t of nativeHost.actors) {
          if (!sameStory(t, target)) continue; // a relic gathers from its own story (the sovereignty gate)
          const hb = t.construct?.healBurst;
          if (!hb || t.dead || t.team !== caster.team) continue;
          if (dist(t.pos, target.pos) > t.construct!.range) continue;
          t.construct!.stored = Math.min(hb.cap, (t.construct!.stored ?? 0) + dealt);
          t.radius = (t.construct!.baseRadius ?? t.radius)
            * (1 + 0.6 * (t.construct!.stored / hb.cap));
        }
      }
      // COMBAT-RECENCY: stamp both sides so the neutral-rouse cooldown knows a fight is
      // live (a warden TRADING blows stays engaged). Sits after the blocked/immune
      // early-returns, so a fully-absorbed swing doesn't count — only a landed hit is "live".
      caster.lastCombatAt = nativeHost.time;
      target.lastCombatAt = nativeHost.time;
      // Victim-side strike ledger: a blow from someone OTHER than the held
      // lock pulls the brain's roster rescan forward to next tick (the
      // flank gets noticed now, not at the cadence clock) — ai.ts
      // acquireTarget.
      target.aiHitAt = nativeHost.time;
      target.aiHitById = caster.id;
      // Pain gives every mind a place to investigate, even without a watch
      // ladder. It never assigns the attacker as a live combat target.
      const evidence = hitOrigin ?? (depth > 0 ? target.pos : caster.pos);
      if (nativeHost.hostileTo(target, caster)) {
        target.alertUntil = Math.max(target.alertUntil,
          nativeHost.time + PERCEPTION_CFG.woundSearchSec * alertScale(target));
        target.alertFrom = vec(evidence.x, evidence.y);
        target.alertTier = hitTier ?? caster.tier;
      }
      // Caster-side twin: the last HOSTILE body this blow's author struck —
      // a defensive companion answers "whatever the keeper wounds" off it
      // (engine/companionStances.ts). Friendly-fire seams never stamp it.
      if (target.team !== caster.team) {
        caster.lastFoeAt = nativeHost.time;
        caster.lastFoeId = target.id;
      }
      // THE STING and THE TASTE (BrainDef.drives): a landed hit jumps both
      // sides' wants — chip damage stokes a troll's wrath long before its
      // life bar would (free early-outs for the driveless majority).
      nativeHost.bumpDrives(target, 'onHurt');
      nativeHost.bumpDrives(caster, 'onDealt');
      // THE SHAKEDOWN (MonsterDef.looter): a solid blow shakes one snatched
      // shiny out of the sack — the D4 goblin-chase beat, per landed hit.
      if (target.lootSack?.length && nativeHost.time - target.lastSpillAt > 0.4) {
        target.lastSpillAt = nativeHost.time;
        const item = target.lootSack.pop()!;
        nativeHost.drops.push({
          pos: vec(target.pos.x + rand(-20, 20), target.pos.y + rand(-20, 20)),
          item, bob: rand(0, Math.PI * 2),
          tier: target.tier, // THE SPOILS STORY: shaken loose where the sack stands
        });
        }
      // THE WOUNDED PURSE (MonsterDef.essenceSpill): landed damage banks
      // toward shed essence packets — the currency trail of the chase.
      if (dealt > 0 && target.defId) {
        const spill = MONSTERS[target.defId]?.essenceSpill;
        if (spill) nativeHost.bankEssenceSpill(target, spill, dealt);
      }
      // The RECENT-WOUND clock (GateSpec.recentDamage): a landed hit
      // licenses the victim's counter-blows.
      if (dealt > 0) {
        target.recentHurt = 0;
        // THE PRIMED POUR answers the first wound (pourPrime).
        nativeHost.releasePrimedPours(target);
      }
      // THE THREAT CHART: a landed hit books aggro against the attacker —
      // weighted by the victim's brain (TargetSpec.threat.damage; the per-body
      // tuning graft outranks the base, matching resolveMachines' merge order),
      // scaled by the ATTACKER's threatGen stat (the attention lever: goads
      // shout, quiet hands whisper), melted by the AI tick's decay, and READ
      // only by prefer:'highestThreat' brains.
      if (target.brain && dealt > 0) {
        const tw = target.aiTuning?.target?.threat?.damage
          ?? normalizeBrain(target.brain).base.target?.threat?.damage ?? 1;
        if (tw > 0) {
          // threatGen folds with the SKILL's context (tags + socketed gems),
          // so Clamor makes one skill loud and Quiet Hand makes one quiet.
          const gen = caster.sheet.get('threatGen', skillContextTags(def), instanceMods(inst));
          if (gen > 0) target.addThreat(caster.id, dealt * tw * gen);
        }
      }
      // FRAGILE buffs (Tempo): a LANDED hit wipes every clearOnHit buff on
      // the victim — absorbed/ES-soaked hits still count (this sits after
      // the blocked/immune early-returns), DoT ticks never do.
      for (const [bid, b] of target.buffs) {
        if ((b.def as { clearOnHit?: boolean }).clearOnHit) target.removeBuff(bid);
      }
      // PASSIVE CHARGE TAPS (chargeGain): landed blows feed the attacker's
      // 'hit' taps and the victim's 'takeHit' taps. Depth-0 only — proc'd
      // and splashed sub-hits never double-tap (the proc discipline). The
      // victim rides along for elite-gated taps (Soul Harvest's boss lane).
      if (depth === 0) {
        nativeHost.tapCharges(caster, 'hit', undefined, undefined, target);
        nativeHost.tapCharges(target, 'takeHit', undefined, undefined, caster);
        // BRUISED-LOOSE orbs (orbOnHurt_<id>): a landed blow TAKEN can shake
        // a registry orb out of the victim's own gear — the defensive shed
        // valve (no skill context; the wound is the roll).
        if (nativeHost.orbs.length < ORB_CAP && !target.construct) {
          for (const id of Object.keys(ORB_DEFS)) {
            const c = target.sheet.get(orbOnHurtStat(id)) * target.sheet.get('orbShedRate');
            if (c > 0 && chance(Math.min(0.5, c))) {
              nativeHost.shedOrb(id, target.pos, { scatter: 24, tier: target.tier });
            }
          }
        }
        // Blood-spooling (channelHitSpool): landed hits during an unbroken
        // channel bank toward bonus projectiles on the coming pulses.
        if (caster.casting?.mode === 'channel') {
          caster.casting.hitSpool = (caster.casting.hitSpool ?? 0) + 1;
        }
      }
      // NEUTRAL-ROUSE: a landed hit may wake a dormant cohort — resolved from
      // the tag-keyed rouseRules registry (Conclave cultists, Migration herds,
      // Holdfast wardens...), never a per-species branch here.
      nativeHost.rouseOnWound(target);
      // A wounded ambusher springs at once (the visible face's honesty: a
      // waiting body that eats an arrow is waiting no longer) — and its
      // pack springs with it.
      if (target.ambushArmed) nativeHost.springAmbush(target);
      // STEALTH TACTICS: struck from the shadows — the victim and its nearby
      // kin go on ALERT (eyes everywhere, range up, stalking toward where
      // the blow came from). The attacker keeps stealth only while charges
      // remain; the strike itself made noise regardless.
      if (isStealthed(caster) && target.team !== caster.team) {
        // Each victim's brain scales how long the alarm GRIPS it
        // (perception.alertMul — a dull shambler forgets the wound the
        // moment you vanish; a sentry seethes for the full six).
        target.alertUntil = Math.max(target.alertUntil, nativeHost.time + 6 * alertScale(target));
        target.alertFrom = vec(evidence.x, evidence.y); target.alertTier = hitTier ?? caster.tier;
        for (const a of nativeHost.actors) {
          if (a.dead || a.team !== target.team || a === target) continue;
          if (dist(a.pos, target.pos) > 320) continue;
          a.alertUntil = Math.max(a.alertUntil, nativeHost.time + 4 * alertScale(a));
          if (!a.alertFrom) { a.alertFrom = vec(evidence.x, evidence.y); a.alertTier = hitTier ?? caster.tier; }
        }
      }
      // THE WATCH FABRIC (engine/watch.ts): pain is a FULL stimulus — a
      // wounded watcher's ladder jumps to the search rung toward the blow's
      // author and the struck alarm arms it, so its now-alerted all-around
      // senses find the attacker on the next scan and the gate's wound
      // bypass locks at once. A watcher can be sniped from beyond its
      // senses; it can never be left standing dumb under fire.
      if (target.watch && target.team !== caster.team && !target.aggroed
        && target !== caster) {
        target.alertUntil = Math.max(target.alertUntil, nativeHost.time + 5 * alertScale(target));
        target.alertFrom = vec(evidence.x, evidence.y); target.alertTier = hitTier ?? caster.tier;
        feedWatch(target, target.watch, nativeHost.time, 1, WATCH_CFG.rungs.search);
        if (target.watchAt) { target.watchAt.x = evidence.x; target.watchAt.y = evidence.y; }
        else target.watchAt = vec(evidence.x, evidence.y);
        target.watchRung = Math.max(target.watchRung,
          watchRungOf(watchValueOf(target, target.watch, nativeHost.time)));
      }
      // A hit landed on the player while at low life — kick the renderer's
      // hit-while-low surge (one smooth bloom over the low-life vignette).
      // The PLAYER's own line: a shifted lowLifeLine moves this gate too.
      if (nativeHost.isLocalPresentationActor(target) && target.life > 0
        && target.life < target.maxLife() * target.lowLifeLine()) {
        nativeHost.lowLifeHitFlash = LOW_LIFE_FLASH_SEC;
      } else {
        // THE ACTING SEAT: every other player's surge rides its own HUD row
        // (SeatW.lh) to its own screen; its own line moves its own gate.
        const lowSeat = nativeHost.seatOf(target);
        if (lowSeat && !lowSeat.keeper && !lowSeat.merc && !lowSeat.couch && target.life > 0
          && target.life < target.maxLife() * target.lowLifeLine()) nativeHost.seatHudOf(lowSeat).lhAt = nativeHost.time;
      }
      nativeHost.text(target.pos, Math.round(dealt).toString(),
        result.crit ? '#ffd24a' : '#ffffff', result.crit ? 18 : 13, 'dmg');
      nativeHost.creditFloat(caster); // THE WIRE'S EYES: the number's owner is the striker's credited seat
      // CULLED: the executing threshold fired inside applyHit.
      if (result.culled) {
        nativeHost.showCombatOutcome(target, 'culled', evidence);
      }
      // CAPPED: the victim's hitCap flattened the life cut (cast honesty —
      // a clamped blow must never read as full work; the counter is DoT).
      if (result.clamped) {
        nativeHost.showCombatOutcome(target, 'hit_cap', evidence);
      }
      // The poise bar SHATTERED under this blow — the breaker's payoff
      // loop (poiseBreakDealt, with the breaking skill's context). The
      // victim's own reactions (poiseBroken / poiseBracket, the fanfare)
      // ride the defense-event sweep below, so caster-less breaks share
      // the exact same path.
      if (result.poiseBroke) {
        nativeHost.rollOwnProcs(caster, 'poiseBreakDealt', { tags: packet.tags, extra, inst, target, depth });
      }
      // The hit emptied the shield — the victim's esBreak reactions fire.
      if (target.esBroke) {
        target.esBroke = false;
        nativeHost.rollOwnProcs(target, 'esBreak', { depth });
      }
      // Victim-side defense events this blow raised (break, rungs crossed)
      // fire NOW with the hit's chain depth — the once-per-frame sweep
      // would fire them a frame late and depthless.
      nativeHost.sweepDefenseEvents(target, depth);
      // THE TRIGGER GEMS (SupportDef.trigger): the landed hit raises its
      // events. A CRIT rolls the attacker's crit-triggers at the victim —
      // chain depth rides the SOURCE instance's trigDepth stamp, so a
      // triggered cast's crits fire one layer deeper and die at the cap.
      // The damage BANKS toward the victim's damage-taken triggers.
      if (wasCrit) {
        nativeHost.rollTriggers(caster, 'crit', {
          depth: inst.state?.trigDepth ?? 0,
          aim: vec(target.pos.x, target.pos.y), sourceInst: inst,
        });
      }
      // A HIGH ROLL (the dice landing at the top of their range) raises
      // the jackpot event — each armed gem judges the packet against its
      // OWN rollTop window inside rollTriggers, so one hit can clear a
      // tight gem and miss a tighter one.
      if (packet.rollT !== undefined) {
        nativeHost.rollTriggers(caster, 'highRoll', {
          depth: inst.state?.trigDepth ?? 0,
          aim: vec(target.pos.x, target.pos.y), sourceInst: inst,
          rollT: packet.rollT,
        });
      }
      if (dealt > 0) nativeHost.bankDamageTakenTriggers(target, dealt, caster);
      // VOLATILE (MonsterDef.volatile): the struck body ANSWERS — its
      // payload free-casts from the body, aimed back along the blow,
      // throttled by its ICD. A killing blow is answered by nothing (the
      // corpse is quiet — death answers belong to the onDeath rattle),
      // and hidden ambushers stay quiet too.
      if (dealt > 0 && target.volatile && target.life > 0 && !target.dead
        && !target.untargetable && nativeHost.time >= target.volatileReadyAt
        && chance(target.volatile.chance)) {
        const vdef = SKILLS[target.volatile.skillId];
        if (vdef) {
          target.volatileReadyAt = nativeHost.time + (target.volatile.icd ?? 1.5);
          target.volatileInst ??= makeSkillInstance(vdef, Math.max(1, Math.round(target.level)));
          if (target.volatile.cue !== false) nativeHost.showCombatOutcome(target, 'volatile_release', caster.pos, vdef.color);
          nativeHost.executeSkill(target, target.volatileInst, vec(caster.pos.x, caster.pos.y), {
            dmgMult: target.volatile.dmgMult ?? 1,
            noCooldown: true, noRepeat: true, keepFacing: true,
          });
        }
      }
      // BODY ELEMENT RESPONSES (MonsterDef.onHitByType — the reaction matrix
      // worn as anatomy): a landed hit CARRYING a type may coat the struck
      // body — a status on itself (wax runs; wax hardens; shadow lights up)
      // and/or a payload free-cast at its own feet (the drip, the re-light).
      // ROLLED amounts decide, so mitigation can't scrub what struck it; one
      // shared icd paces all rows; the corpse answers nothing.
      if (dealt > 0 && target.onHitByType && target.life > 0 && !target.dead
        && !target.untargetable && nativeHost.time >= target.onHitTypeReadyAt) {
        for (const [dtype, row] of Object.entries(target.onHitByType)) {
          if (!row || !((packet.amounts as Record<string, number>)[dtype] > 0)) continue;
          if (row.chance !== undefined && !chance(row.chance)) continue;
          target.onHitTypeReadyAt = nativeHost.time + (target.onHitTypeIcd ?? 0.8);
          if (row.status) nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus(row.status!, 0, 1, 'element response'));
          if (row.skillId && SKILLS[row.skillId]) {
            target.onHitTypeInsts ??= new Map();
            let oi = target.onHitTypeInsts.get(row.skillId);
            if (!oi) {
              oi = makeSkillInstance(SKILLS[row.skillId], Math.max(1, Math.round(target.level)));
              target.onHitTypeInsts.set(row.skillId, oi);
            }
            nativeHost.executeSkill(target, oi, vec(target.pos.x, target.pos.y), {
              dmgMult: row.dmgMult ?? 1,
              noCooldown: true, noRepeat: true, keepFacing: true,
            });
          }
          break; // one row per landed hit — the icd's clean unit
        }
      }
      // THE ATTUNEMENT + PUZZLE FABRICS ride ONE route (knockFixtures):
      // the blow's dominant ROLLED type becomes a tuned body's TONE
      // (conversions already spoke; struckTone read the packet PRE-forgo,
      // so what tunes is what truly struck), and a landed hit on an
      // enrolled node QUEUES its knock — the refrain's answers, the
      // lattice's toggles — under THE KNOCK LAW: any landed damaging blow
      // speaks, however mitigated (`dealt` rides along for runs dialed to
      // 'wounding'). Locked bodies (the chord's heart) hold their note;
      // unaccepted tones wash past; physical is a tone like any other, so
      // battering an attuned crystal back to its ground state —
      // "shattering the attunement" — is a deliberate act.
      nativeHost.knockFixtures(caster, target, struckTone, dealt > 0, inst);
      // CONTAGION (SkillDef/SupportDef.contagion): the struck victim may
      // become the next CAST SITE — after a telegraphed beat the skill (or
      // a named payload) RELEASES from the victim, attributed to the
      // original caster, at chance × decay^generation under a hard
      // generation lid, a per-actor throttle, and the lineage's seen-set.
      // A killing blow still infects: plagues ride corpses. The
      // exponential decay is the safety AND the fantasy.
      {
        const cg = instanceContagion(inst);
        if (cg && dealt > 0 && !caster.dead) {
          const chain = inst.state?.contagion;
          const gen = chain?.gen ?? 0;
          const lid = Math.min(CONTAGION_CFG.maxGenerations,
            cg.maxGenerations ?? CONTAGION_CFG.maxGenerations);
          const sid = cg.skillId ?? inst.def.id;
          if (gen < lid && SKILLS[sid]
            && nativeHost.time >= target.contagionReadyAt
            && !chain?.seen.has(target.id)
            && chance(cg.chance * Math.pow(cg.decay ?? CONTAGION_CFG.decay, gen))) {
            target.contagionReadyAt = nativeHost.time + CONTAGION_CFG.actorIcd;
            const seen = chain?.seen ?? new Set<number>();
            seen.add(target.id);
            const delay = cg.delay ?? CONTAGION_CFG.delay;
            {
let nativeStorage: typeof nativeHost.pendingContagions;
let nativeRecord: typeof nativeHost.pendingContagions[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.pendingContagions).push(nativeRecord = {
              when: nativeHost.time + delay, caster: (nativeRecordSource = caster), skillId: sid,
              level: effectiveSkillLevel(inst), host: target,
              at: vec(target.pos.x, target.pos.y), gen: gen + 1, seen,
              damageScale: cg.damageScale ?? 1,
            });
nativeHost.issueCombatRecord("pendingContagions", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
            // The honest telegraph: an edge ring for the whole delay.
            nativeHost.flashes.push({
              pos: vec(target.pos.x, target.pos.y), radius: target.radius + 14,
              color: SKILLS[sid].color, life: delay, maxLife: delay, edgeFrac: 0.9,
            });
          }
        }
      }
      // CARRIER STRAIN (SupportDef.spreadOnHit): the hit itself is a
      // VECTOR — a chance to hand ONE random affliction from the victim
      // to its nearest untouched neighbor. Top-level hits only.
      if (dealt > 0 && depth === 0 && target.statuses.length) {
        const strain = socketSpec(inst, 'spreadOnHit');
        if (strain && chance(strain.chance)) {
          const s = pick(target.statuses);
          let best: Actor | null = null;
          let bd = strain.radius;
          for (const e of nativeHost.enemiesOf(caster)) {
            if (!sameStory(e, target)) continue; // the spread reaches the victim's story (the sovereignty gate)
            if (e === target || e.statuses.some(x => x.id === s.id)) continue;
            const dd = dist(target.pos, e.pos);
            if (dd <= bd) { bd = dd; best = e; }
          }
          if (best) {
            nativeHost.transplantStatus(best, s, 'Carrier Strain', strain);
          }
        }
      }
      // CURSE ON HIT (hexToggles — Hexbrand): every top-level hit ALSO
      // strikes the victim with each DRAWN curse at a scale of its roll —
      // the whole curse (statuses, procs, ruptures), delivered by the
      // blow. depth+1: a hex-strike can never re-apply the hexes.
      if (dealt > 0 && depth === 0 && caster.hexToggles.size && !target.dead) {
        for (const hex of caster.hexToggles.values()) {
          if (hex.inst === inst) continue;
          const coh = socketSpec(hex.inst, 'curseOnHit');
          if (!coh) continue;
          nativeHost.resolveHit(caster, hex.inst, target, coh.damageScale ?? 0.3, depth + 1, undefined, true);
        }
      }
      // IMPALE DISCHARGE (StatusDef.dischargeOnHit): the lodged spear is
      // DRIVEN THROUGH by this fresh top-level hit — the whole bank lands
      // as its own separate mitigated blow, then the spear is spent. The
      // pop is not a hit (no banking, no procs): structurally loop-free.
      if (dealt > 0 && depth === 0 && !target.dead) {
        for (let si = target.statuses.length - 1; si >= 0; si--) {
          const s = target.statuses[si];
          if (s.holdDischarge || !STATUS_DEFS[s.id]?.dischargeOnHit || !s.rupture || s.rupture <= 0) continue;
          if (STATUS_DEFS[s.id]?.dischargeMatchingType && (packet.amounts[s.ruptureType ?? 'physical'] ?? 0) <= 0) continue;
          target.statuses.splice(si, 1);
          target.sheet.removeSource('status:' + s.id);
          const burst: Partial<Record<DamageType, number>> = {
            [s.ruptureType ?? 'physical']: s.rupture,
          };
          const taken = mitigateTyped(target, burst);
          if (taken > 0) {
            landLifeDamage(target, taken);
            target.hitFlash = 0.12;
            target.hitFlashType = s.ruptureType ?? 'physical';
            nativeHost.text(vec(target.pos.x, target.pos.y - 26),
              'IMPALED ' + Math.round(taken), STATUS_DEFS[s.id]?.color ?? '#c8ccd8', 13, 'combat'); // a number — kinded, no twin
            if (target.life <= 0 && !target.dead) nativeHost.kill(target, false, caster);
          }
        }
      }
      nativeHost.assaults.plant(caster, target, packet, depth, dealt);
      // IMPALE DRIVE-IN (the impalePower stat): a fraction of THIS hit's
      // rolled PHYSICAL damage lodges in the victim as the spear's bank —
      // banked AFTER any discharge above, so one blow pops the old spear
      // and plants the next (the inverse Echoing Might).
      if (dealt > 0 && depth === 0 && !target.dead) {
        const ip = caster.sheet.get('impalePower', packet.tags, extra);
        const phys = packet.amounts.physical ?? 0;
        if (ip > 0 && phys > 0) {
          nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus('impaled', 0, 1, def.name, { casterId: caster.id }));
          const lodged = target.statuses.find(x => x.id === 'impaled' && !x.sourceKey);
          if (lodged) {
            lodged.rupture = (lodged.rupture ?? 0) + phys * ip;
            lodged.ruptureType = 'physical';
          }
        }
      }
      // ECHOING MIGHT (the inverse-ignite buff): the landed blow feeds the
      // NEXT — added physical equal to a fraction of what this one dealt,
      // re-priced on every refresh (dynamic-value buffs).
      if (dealt > 0 && depth === 0) {
        const echo = caster.sheet.get('echoMight', packet.tags, extra);
        if (echo > 0) {
          caster.addBuff({
            type: 'buff', id: 'echoing_might', duration: 4,
            mods: [mod('addedPhysical', 'flat', dealt * echo)],
          });
        }
      }
      // DOMINATING BLOW (support graft): the slain may RISE for you —
      // the kill converts the body into a thrall on a clock.
      if (target.life <= 0 && !target.dead && depth === 0) {
        const dom = socketSpec(inst, 'dominate');
        if (dom && target.defId && !target.isMinion() && MONSTERS[target.defId]
          && !MONSTERS[target.defId].boss && chance(dom.chance)) {
          const key = '__dominate:' + inst.def.id;
          if (nativeHost.actors.filter(m => m.owner === caster && !m.dead
            && m.sourceSkillId === key).length < dom.max) {
            const thrall = nativeHost.createMonster(target.defId, target.level, caster.team, caster);
            thrall.sourceSkillId = key;
            thrall.lifespan = dom.duration;
            thrall.pos = nativeHost.clampPos(vec(target.pos.x, target.pos.y), thrall.radius);
            { nativeHost.actors.push(thrall); nativeHost.admitCombatBirth(thrall); }
            nativeHost.showCompanionCue(thrall, 'bind', caster, def.companionCue);
            nativeHost.showRecoveryCue(thrall, 'arrive', inst);
          }
        }
      }
      // ALLY SEVER (the grab fabric): wounding a HOLDER worries its grip —
      // severFrac of its max life torn off in hits and the hold rips open
      // in the sweep. Co-op's rescue verb: hit the thing, free the friend.
      if (target.gripping && dealt > 0 && caster.id !== target.gripping.id) {
        target.gripping.severed += dealt / target.maxLife();
      }
      // Striking the thorned costs blood (thorns / reflect / Nettles).
      nativeHost.applyThorns(target, caster, dealt);
      // IRON WARD: the warded bank what still lands — the bill comes due
      // when the ward ends (the accumulate-then-detonate defense).
      if (target.ironWard && nativeHost.time < target.ironWard.until) {
        target.ironWard.stored = Math.min(target.ironWard.cap,
          target.ironWard.stored + dealt);
      }
      // SOUL LINK (minionShare): a share of the wound flows onto the
      // minions instead, split evenly — the wall of bones takes the blow.
      if (dealt > 0 && depth === 0) {
        const share = target.sheet.get('minionShare');
        if (share > 0) {
          const pack = nativeHost.actors.filter(m =>
            m.owner === target && !m.dead && !m.construct && !m.untargetable);
          if (pack.length) {
            const moved = dealt * share;
            target.life = Math.min(target.lifeCeiling(), target.life + moved);
            const per = moved / pack.length;
            for (const m of pack) {
              m.life -= per;
              m.hitFlash = 0.1;
              m.hitFlashType = undefined; // shared wound, no blow — white
              if (m.life <= 0 && !m.dead) nativeHost.kill(m);
            }
          }
        }
      }
      // RETALIATION (Pain Hounds): a landed hit on the shard-bearer breaks
      // one shard into teeth beside the attacker (capped per skill).
      if (depth === 0) {
        for (const inst2 of target.skills) {
          const rt = inst2?.def.retaliate;
          if (!rt || (target.charges.get(rt.charge) ?? 0) < 1) continue;
          if (nativeHost.minionsOfSkill(target, inst2!.def.id).length >= rt.max) continue;
          target.spendCharge(rt.charge, 1);
          const hound = nativeHost.createMonster(rt.monsterId, target.level, target.team, target);
          hound.sourceSkillId = inst2!.def.id;
          hound.lifespan = rt.duration;
          hound.pos = nativeHost.clampPos(vec(
            caster.pos.x + rand(-26, 26), caster.pos.y + rand(-26, 26)), hound.radius);
          { nativeHost.actors.push(hound); nativeHost.admitCombatBirth(hound); }
          nativeHost.flashes.push({
            pos: vec(hound.pos.x, hound.pos.y), radius: 22,
            color: inst2!.def.color, life: 0.25, maxLife: 0.25,
          });
          break; // one shard per blow
        }
      }
    }

    // Worn knockback + signed displacement, scaled by stats, on a landed hit.
    // `target` is always an enemy of `caster` (every resolveHit caller iterates
    // enemiesOf), and pushActor no-ops on construct/anchored/leap — no friendly fire.
    // THE DELIVERY-AUTHORITY LEVER (2026-07-22): the knockback stat folds on
    // EVERY delivery now — melee-tagged packets at full weight, everything
    // else at MASS_CFG.deliveryKnock's graded authority (a flight's sting is
    // a fraction of a maul's heave — the switch-like gem, balance later).
    // The knockBuffet stat keeps its identity everywhere the stat folds:
    // Turbulence batters victims a RANDOM way, never ejects them.
    if (dealt > 0) {
      {
        const kb = caster.sheet.get('knockback', packet.tags, extra);
        if (kb > 0) {
          const auth = packet.tags.has('melee') ? 1
            : MASS_CFG.deliveryKnock[inst.def.delivery.type] ?? MASS_CFG.deliveryKnockDefault;
          if (auth > 0) {
            const ang = caster.sheet.get('knockBuffet', packet.tags, extra) > 0
              ? rand(0, Math.PI * 2) : angleTo(caster.pos, target.pos);
            nativeHost.pushActor(target, ang, kb * auth, caster, inst);
          }
        }
      }
      const force = caster.sheet.get('displaceForce', packet.tags, extra);
      if (force !== 0) {
        const dir = force > 0 ? angleTo(caster.pos, target.pos) : angleTo(target.pos, caster.pos);
        nativeHost.pushActor(target, dir, Math.abs(force), caster, inst);
      }
    }

    // Static Shock: strip a fraction of the target's CURRENT life — typed,
    // resisted (through the capped resistValue like everything else),
    // scaled by damage taken, and it can never kill.
    if (def.currentLifeDamage && !target.invulnerable && target.life > 1) {
      const elem = (['lightning', 'fire', 'cold', 'chaos'] as const)
        .find(e => def.tags.includes(e)) ?? 'lightning';
      let amt = target.life * def.currentLifeDamage * target.sheet.get('damageTaken');
      amt *= 1 - resistValue(target, elem);
      amt = Math.min(amt, target.life - 1);
      if (amt > 0) {
        target.life -= amt;
        target.hitFlash = 0.15;
        target.hitFlashType = elem;
        nativeHost.text(vec(target.pos.x, target.pos.y - 12), Math.round(amt).toString(), '#ffe14a', 13);
      }
    }

    const tags = skillContextTags(def);
    const durScale = caster.sheet.get('effectDuration', tags, extra);
    const bonusChance = caster.sheet.get('statusChance', tags, extra);
    // LINKED HEXES (Malediction): the bar IS the link — every OTHER curse-
    // tagged skill equipped lays its primary curse alongside this hit, and
    // this skill's own ailments swell per hex so linked (below).
    let hexLink = 0;
    if (def.linkedHexes && dealt > 0) {
      for (const other of caster.skills) {
        if (!other || other.def.id === def.id || !other.def.tags.includes('curse')) continue;
        const sfx = other.def.effects.find(f => f.type === 'status');
        if (!sfx || sfx.type !== 'status') continue;
        const sdd = STATUS_DEFS[sfx.status];
        nativeHost.withCombatStatusSource(target, caster, other, () => target.applyStatus(sfx.status,
          sdd?.dotType ? baselineStatusDps(sfx.status, nativeHost.zone.level) : 0,
          durScale, other.def.name));
        hexLink++;
      }
      if (hexLink > 0) {
        nativeHost.text(vec(target.pos.x, target.pos.y - 16), `${hexLink} hexes!`, def.color, 12);
      }
    }
    const hexDmg = 1 + (def.linkedHexes?.dmgPerHex ?? 0) * hexLink;
    const hexDur = 1 + (def.linkedHexes?.durPerHex ?? 0) * hexLink;
    // Ailment potency is queried with the status's DAMAGE-TYPE tag folded into
    // the context, so tag-filtered magnitude investment works: "30% more fire
    // ailment magnitude" is mod('statusMagnitude','more',0.3,['fire']) — from
    // a support, a passive, or an affix alike.
    const potencyFor = (sid: string): number => {
      const dt = STATUS_DEFS[sid]?.dotType;
      return caster.sheet.get('statusMagnitude', dt ? skillContextTags(def, [dt]) : tags, extra);
    };
    // Investable STACK CAP: the applier's ailmentStacks (same dotType-tagged
    // query as potency, so "+2 chaos ailment stacks" is one tag filter away).
    const stacksBonusFor = (sid: string): number => {
      const sdef = STATUS_DEFS[sid];
      if (!sdef?.stacking) return 0;
      const dt = sdef.dotType;
      return Math.round(caster.sheet.get('ailmentStacks', dt ? skillContextTags(def, [dt]) : tags, extra));
    };
    // NEXT-HIT RIDERS (BuffEffect.nextHit): the bearer's loaded blows spend
    // one stack per LANDED hit, firing the rider's lanes — a baseline-
    // scaled status (never the hit's roll — golden rule), extra typed
    // damage mitigated like any source, and/or a proc payload one link
    // deep. Works identically for a blessed MINION swinging its own blows.
    if (dealt > 0 && depth === 0 && caster.buffs.size) {
      for (const [bid, b] of [...caster.buffs]) {
        const rider = b.def.nextHit;
        if (!rider) continue;
        if (rider.tags && !rider.tags.every(t => packet.tags.has(t))) continue;
        if (rider.status) {
          const sdef = STATUS_DEFS[rider.status];
          const dps = sdef?.dotType
            ? baselineStatusDps(rider.status, nativeHost.zone.level)
              * (rider.statusScale ?? 1.5) * potencyFor(rider.status)
            : 0;
          nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus(rider.status!, dps, durScale, caster.name, {
            casterId: caster.id, stacksBonus: stacksBonusFor(rider.status!),
            power: sdef?.dotType ? undefined : potencyFor(rider.status!),
          }));
        }
        if (rider.addedDamage && !target.invulnerable) {
          const landed = mitigateTyped(target, { ...rider.addedDamage },
            { attacker: caster, tags: packet.tags, extra });
          if (landed > 0) {
            target.life -= landed;
            nativeHost.text(vec(target.pos.x, target.pos.y - 10),
              Math.round(landed).toString(), '#e8d44a', 12);
          }
        }
        if (rider.procId && PROCS[rider.procId]) {
          nativeHost.executeProc(PROCS[rider.procId], caster, inst, target, 1);
        }
        caster.consumeBuffStacks(bid, 1);
        // The procCue material follows the actually consumed rider to its victim.
        noteProcCue(target, buffProcCue(b.def), 'release', 'rider:' + bid);
      }
    }
    // Delivery-specific hitEffects share every refusal, scaling and
    // attribution rule with authored effects, including delayed fuses.
    nativeHost.challenges.beforeEffects(caster, inst, target, dealt, depth);
    const effects = instanceEffects(inst);
    for (const fx of hitEffects?.length ? [...effects, ...hitEffects] : effects) {
      if (fx.type === 'heal') {
        // Ally-resolving deliveries (blessing novas, curseAllies edges)
        // carry their mend here; hostile targets are never healed. The
        // mend honors the use's POWER (brim releases, scaled secondaries).
        if (target.team === caster.team && !(fx.excludeCaster && target === caster)) {
          nativeHost.applyHealChained(caster, inst, target, fx, dmgMult);
        }
      } else if (fx.type === 'cleanse') {
        if (target.team === caster.team) nativeHost.cleanseActor(target, fx.count ?? 2);
      } else if (fx.type === 'buff' && target.team === caster.team && target !== caster) {
        // ALLY-TARGETED buffs (blessings): a targeted/ally-resolving
        // delivery lands the buff on the RESOLVED ally — next-hit riders
        // arm a minion's blow, and a bond-marked buff TIES the caster to
        // this one ally (one bond per caster; newest wins).
        nativeHost.grantTreeBuff(caster, target, inst, fx, durScale);
        if (fx.bond) caster.bond = { targetId: target.id, buffId: fx.id };
      } else if (fx.type === 'rupture') {
        // THE RUPTURE (THE RUPTURE LAW — StatusDef.bank): spend a fraction
        // of the target's BANKED status as a burst of its own element, NOW.
        nativeHost.ruptureBank(caster, target, fx.status, fx.fraction, fx.mul ?? 1, tags, extra);
      } else if (fx.type === 'status') {
        // AILMENT RESISTANCE (victim-side, element-tagged): Purity of Fire
        // shrugs ignites; Purity of Elements shrugs the lot.
        const el = STATUS_DEFS[fx.status]?.element;
        const shrug = target.sheet.get('ailmentResist',
          el ? new Set<SkillTag>([el]) : undefined);
        if (shrug > 0 && chance(shrug)) {
          nativeHost.flashes.push(combatCueFlash(target.pos, 'resist', target.radius + 8, angleTo(target.pos, caster.pos), STATUS_DEFS[fx.status]?.color));
          continue;
        }
        // GLOBAL BASELINE TUNING: incidental (sub-identity-threshold) authored
        // chances are scaled per AILMENT_TUNING — plain physical hits no longer
        // bleed, embers barely catch; investment (statusChance, the apply_
        // family) and identity skills carry ailments now. See engine/status.ts.
        if (chance(Math.min(1, tuneAilmentChance(fx.status, fx.chance) + bonusChance))) {
          // Hit-derived dps, FLOORED by the status's caster-less baseline (a
          // feeble hit still ignites like an ignite), × the potency crank —
          // × the linked-hex swell (Malediction: each hex fattens the debuff).
          // The septic bargain's return: the forgone bite rides the
          // affliction as if the blow had landed (carry) harder.
          const derived = (fx.magnitude ?? 0) * (dealt + afflictionCarry);
          const floor = fx.magnitude ? baselineStatusDps(fx.status, nativeHost.zone.level) : 0;
          const dps = Math.max(derived, floor) * potencyFor(fx.status) * hexDmg
            / Math.max(0.5, durScale);
          const sdef = STATUS_DEFS[fx.status];
          // durationOverride: a FIXED clock (Flash Freeze's unscalable
          // freeze) — expressed as a scale on the def's base duration so
          // applyStatus needs no new path. Linked hexes stretch it.
          const fxScale = (fx.durationOverride !== undefined
            ? fx.durationOverride / (STATUS_DEFS[fx.status]?.duration || 1)
            : durScale) * hexDur;
          const afflictionSpan = (sdef?.duration ?? 0) * fxScale;
          // Rupture supports bake the eventual detonation at application.
          let rupture: number | undefined;
          let ruptureType: DamageType | undefined;
          let dpsOut = dps;
          // DOOM-family statuses (cullsAtLethal) route their derived power
          // into the ARMED PAYLOAD — and the doomDot stat lets a share of
          // that keg TICK as chaos while the fuse runs (Lingering Doom).
          if (sdef?.cullsAtLethal && dps > 0) {
            rupture = dps * afflictionSpan;
            ruptureType = 'chaos';
            dpsOut = rupture * caster.sheet.get('doomDot', tags, extra);
          } else if (sdef?.dotType && dps > 0) {
            // Powderkeg: a FRACTION of the ignite converts from ticking
            // burn into a detonation at expiry (1 = no ticks, all blast;
            // 0.5 = half burns, half banks — a dial, not a flag).
            const bombFrac = caster.sheet.get('igniteToBomb', tags, extra);
            if (fx.status === 'burn' && bombFrac > 0) {
              rupture = dps * afflictionSpan * bombFrac;
              ruptureType = 'fire';
              dpsOut = dps * (1 - bombFrac);
            } else {
              const r = caster.sheet.get('dotRupture', tags, extra);
              if (r > 0) {
                rupture = dps * afflictionSpan * r;
                ruptureType = sdef.dotType;
              }
            }
          } else if (sdef && !sdef.dotType) {
            const r = caster.sheet.get('curseRupture', tags, extra);
            if (r > 0) {
              const rolled = Object.values(packet.amounts).reduce((s, v) => s + (v ?? 0), 0);
              if (rolled > 0) {
                rupture = rolled * r;
                // The rupture takes the skill's element (Living Bomb = fire).
                ruptureType = (['fire', 'cold', 'lightning'] as const)
                  .find(e => def.tags.includes(e)) ?? 'chaos';
              }
            }
          }
          // THE MALIGNANT LANE (dotCrit): a damaging ailment may CRIT at
          // application — rolled ONCE (dotCrit × critChance), the burn
          // ticking at the full critical multiplier for its whole life;
          // the armed keg scales with it, deriving from the same dps.
          if (dpsOut > 0) {
            const dc = caster.sheet.get('dotCrit', tags, extra);
            if (dc > 0 && chance(dc * caster.sheet.get('critChance', tags, extra))) {
              const cm = caster.sheet.get('critMulti', tags, extra);
              dpsOut *= cm;
              if (rupture !== undefined) rupture *= cm;
              nativeHost.flashes.push(combatCueFlash(target.pos, 'affliction', target.radius + 7, angleTo(target.pos, caster.pos), sdef?.color));
            }
          }
          nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus(fx.status, dpsOut, fxScale, caster.name, {
            // Propagation is a CHANCE rolled once at application (1 = the
            // old always-spreads flag).
            propagates: chance(caster.sheet.get('dotPropagates', tags, extra)) || undefined,
            rupture, ruptureType,
            ruptureRadius: rupture !== undefined ? 90 * caster.sheet.get('aoeRadius', tags, extra) : undefined,
            stacksBonus: stacksBonusFor(fx.status),
            casterId: nativeHost.selectCombatStatusSource(fx.status === 'taunted' && caster.summonShell && caster.owner ? caster.owner : caster).id,
            brood: instanceBrood(inst),
            leech: caster.sheet.get('dotLeech_' + fx.status, tags, extra) || undefined,
            popBonus: caster.sheet.get('popPower_' + fx.status, tags, extra) || undefined,
            // NON-damaging ailments carry the potency crank as POWER (the
            // mods fold scales — a stronger shock takes more, a deeper
            // chill slows harder); DoTs carry theirs in dps already.
            power: STATUS_DEFS[fx.status]?.dotType ? undefined : potencyFor(fx.status),
          }));
          // Applying a status is a trigger (Bloodletter's Rhythm).
          nativeHost.rollStatusProcs(caster, inst, target, fx.status, tags, extra, depth);
          // DAMAGE POOLS: a DoT application banks its expected payload
          // (dps × duration) — ignite 1:1, raw fire at a trickle: data.
          if (dpsOut > 0) {
            nativeHost.bankPools(caster, { status: fx.status },
              dpsOut * (STATUS_DEFS[fx.status]?.duration ?? 0) * fxScale);
          }
          // Hedonism: curses also grant their victims reckless haste.
          if (def.tags.includes('curse')
            && caster.sheet.get('hedonism', tags, extra) > 0) {
            nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus('hedonism', 0, durScale, caster.name));
          }
        }
      } else if (fx.type === 'knockback') {
        // BUFFET (data mode or the knockBuffet stat — Turbulence): the shove
        // goes a RANDOM way. With impulse physics that means battered around
        // inside the storm, not ejected from it.
        const buffet = fx.mode === 'buffet' || caster.sheet.get('knockBuffet', tags, extra) > 0;
        const ang = buffet ? rand(0, Math.PI * 2) : angleTo(caster.pos, target.pos);
        nativeHost.pushActor(target, ang, fx.strength, caster, inst);
      } else if (fx.type === 'grabSeize') {
        // THE SEIZE (the grab fabric, engine/grab.ts): the landed hit
        // tries to close the hold — mass law, policy and grace all gate
        // inside; a refusal notes only on the local hero.
        nativeHost.grabSeize(caster, inst, target, fx.grab);
      } else if (fx.type === 'possess') {
        // THE ENTRY BLOW (the possession seam, engine/possess.ts): the
        // landed hit tries to move the caster's SEAT into the struck body
        // — weakened gate, rarity policy and MonsterDef.possessable all
        // settle inside; refusals note only on the local hero.
        nativeHost.possessSeize(caster, inst, target, fx.spec);
      } else if (fx.type === 'pull') {
        // GET OVER HERE: one impulse sized to the gap yanks the target to
        // the caster's feet, riding the push physics — walls interrupt the
        // trip and collisions en route roll the caster's collision procs.
        // isDormant joins the planted set: a gravity well must not reel in a
        // sleeping sentry any more than a shove may scatter one.
        if (!target.construct && !target.anchored && !target.leap && !isDormant(target)) {
          const gap = Math.max(0,
            dist(caster.pos, target.pos) - caster.radius - target.radius - 12);
          if (gap > 0) nativeHost.pushActor(target, angleTo(target.pos, caster.pos), gap, caster, inst);
          if (fx.stun) nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus('stun', 0, fx.stun! * durScale, def.name));
        }
      } else if (fx.type === 'absorb') {
        nativeHost.grantAbsorb(target, skillAbsorbAmount(caster, inst, fx.amount), fx.duration * durScale);
      } else if (fx.type === 'restore') {
        nativeHost.applyRestore(target, fx, { tags: def.tags });
      } else if (fx.type === 'ward') {
        // Per-HIT ward (Soul Glut: every soul devoured is shell); ally-
        // resolving deliveries ward the touched instead.
        if (fx.onHit && dealt > 0 && !caster.dead) {
          caster.gainWard(fx.amount);
        } else if (!fx.onHit && target.team === caster.team) {
          target.gainWard(fx.amount);
        }
      } else if (fx.type === 'siphonOrb') {
        // SIPHON ORB (Siphon Strike / Rip Blood): the landed top-level hit
        // knocks a resource orb loose that HOMES back to the caster —
        // sustain with travel time. Sub-hits (splash, procs) never bleed.
        if (dealt > 0 && depth === 0 && !caster.construct) {
          nativeHost.shedOrb(fx.resource, target.pos, {
            scatter: 8, amount: fx.amount, life: 8,
            homeTo: caster.owner ?? caster, clamp: false, flowFromTier: target.tier ?? 0,
          });
        }
      } else if (fx.type === 'birth') {
        // THE CLUTCH FABRIC's hit-gated lane: an onHit birth bursts out of
        // the struck body — landed top-level blows only (the siphonOrb
        // convention: splash, procs and sub-hits never mint). Rows without
        // onHit resolve at their delivery's landing site instead.
        if (fx.onHit && dealt > 0 && depth === 0 && !caster.dead) {
          nativeHost.birthAt(caster, inst, fx, vec(target.pos.x, target.pos.y), { host: true });
        }
      } else if (fx.type === 'spreadStatus') {
        // EPIDEMIC (status puppeteering): everything riding the struck
        // victim LEAPS to the flesh around it. Effect order matters and is
        // the author's lever: listed after this skill's own status, the
        // fresh affliction spreads with the rest.
        if (!target.dead || target.statuses.length) {
          const radius = fx.radius * caster.sheet.get('aoeRadius', tags, extra);
          const carried = target.statuses.filter(s =>
            !fx.statuses || fx.statuses.includes(s.id));
          if (carried.length) {
            let spread = 0;
            const cap = fx.maxTargets ?? 8;
            for (const e of nativeHost.enemiesOf(caster)) {
              if (!sameStory(e, target)) continue; // (the sovereignty gate)
              if (e === target || spread >= cap) continue;
              if (dist(target.pos, e.pos) - e.radius > radius) continue;
              for (const s of carried) nativeHost.transplantStatus(e, s, def.name, fx);
              spread++;
            }
            if (spread > 0) {
              nativeHost.flashes.push({
                pos: vec(target.pos.x, target.pos.y), radius,
                color: def.color, life: 0.3, maxLife: 0.3,
              });
            }
          }
        }
      } else if (fx.type === 'transfuseStatus') {
        // TRANSFUSION (status puppeteering): the vessel EMPTIES — every
        // affliction the caster carries pours onto the target (and gushes
        // over the splash radius), then leaves the caster clean.
        const donors = caster.statuses.filter(s =>
          !fx.statuses || fx.statuses.includes(s.id));
        if (donors.length) {
          const victims: Actor[] = [target];
          if (fx.splash) {
            const splash = fx.splash * caster.sheet.get('aoeRadius', tags, extra);
            for (const e of nativeHost.enemiesOf(caster)) {
              if (!sameStory(e, target)) continue; // the splash lands on the victim's story (the sovereignty gate)
              if (e !== target && dist(target.pos, e.pos) - e.radius <= splash) victims.push(e);
            }
          }
          for (const v of victims) {
            for (const s of donors) nativeHost.transplantStatus(v, s, def.name, fx);
          }
          for (const s of donors) {
            const i = caster.statuses.indexOf(s);
            if (i >= 0) {
              caster.statuses.splice(i, 1);
              caster.sheet.removeSource('status:' + s.id);
            }
          }
          nativeHost.flashes.push({
            pos: vec(target.pos.x, target.pos.y), radius: (fx.splash ?? 60),
            color: def.color, life: 0.3, maxLife: 0.3,
          });
        } else {
          nativeHost.failNote(caster, def.id + ':clean', 'nothing to pour');
        }
      }
    }

    // STAT-GRANTED AILMENTS — the generated apply_<status> stat family: any
    // modifier source (support gem, passive node, future affix) can grant
    // "chance to <ailment> on hit". ELEMENT-AGNOSTIC by design: the DoT
    // derives from the HIT's damage via the status's canonical hitMagnitude,
    // floored by its caster-less baseline, × the potency crank — so Chance
    // to Ignite on a physical Cleave burns off the physical hit.
    // THE ARMED LIST (StatSheet.armedFamily) picks the sweep: the ids this
    // caster's layers or this instance's gems even NAME, in STATUS_IDS order —
    // so the `chance()` rolls below (reached only where the chance is
    // positive, then as now) walk the RNG stream in the identical order. The
    // registry outgrew the loop: ~130 ids × a full uncacheable resolution
    // (`extra` defeats the memo) ran on every landed hit to find the two an
    // ailment build actually carries.
    // THE WET RIDER (applyWet_<status> — THE SCALD KIT K2's Boiling Point):
    // the conditional half of the family above, folded into the SAME sweep
    // so the RNG stream keeps its order (the armed lists merge in
    // STATUS_IDS order; an un-armed sheet costs one empty-list read, and a
    // DRY target never rolls at all — the chance is simply absent). Wet is
    // the standing read (Actor.isWet: wading / swimming / soaked / rain-wet
    // — the scald fold's own truth), so a river, a rainstorm and a shore all
    // arm it exactly as the basin's pools do.
    const wetHere = dealt > 0 && target.isWet();
    if (dealt > 0) {
      const wetArmed = wetHere
        ? caster.sheet.armedFamily('applyWet_', STATUS_IDS, extra) : [];
      const applyArmed = caster.sheet.armedFamily('apply_', STATUS_IDS, extra);
      const armedIds = wetArmed.length
        ? STATUS_IDS.filter(id => applyArmed.includes(id) || wetArmed.includes(id))
        : applyArmed;
      for (const sid of armedIds) {
        const ch = caster.sheet.get('apply_' + sid, tags, extra)
          + (wetHere ? caster.sheet.get('applyWet_' + sid, tags, extra) : 0);
        if (ch <= 0 || !chance(Math.min(1, ch + bonusChance))) continue;
        const sdef = STATUS_DEFS[sid];
        const dps = sdef.dotType
          ? Math.max((sdef.hitMagnitude ?? 0) * dealt, baselineStatusDps(sid, nativeHost.zone.level))
            * potencyFor(sid) / Math.max(0.5, durScale)
          : 0;
        // Stat-granted DOOMS (Creeping Doom): the derived power ARMS the
        // keg instead of ticking — pumped by repetition, culling at lethal.
        let armed: number | undefined;
        let armedType: DamageType | undefined;
        let dpsOut2 = dps;
        if (sdef.cullsAtLethal) {
          armed = Math.max((sdef.hitMagnitude ?? 0.4) * dealt,
            baselineStatusDps(sid, nativeHost.zone.level)) * potencyFor(sid);
          armedType = 'chaos';
          dpsOut2 = armed * caster.sheet.get('doomDot', tags, extra);
        } else if (sdef.dotType && dps > 0) {
          // Rupture parity with the skill path (the doom mirror above set
          // the precedent): a stat-granted bleed with Malpractice banks the
          // same detonation a skill-applied one does — the socketed gem's
          // mods are in scope here (same tags/extra), only the arming was
          // missing. Powderkeg's ignite split rides along.
          const bombFrac = caster.sheet.get('igniteToBomb', tags, extra);
          if (sid === 'burn' && bombFrac > 0) {
            armed = dps * sdef.duration * durScale * bombFrac;
            armedType = 'fire';
            dpsOut2 = dps * (1 - bombFrac);
          } else {
            const r = caster.sheet.get('dotRupture', tags, extra);
            if (r > 0) {
              armed = dps * sdef.duration * durScale * r;
              armedType = sdef.dotType;
            }
          }
        } else if (!sdef.dotType) {
          // Curse ruptures (Living Bomb) arm off the ROLLED hit, skill-path
          // rules — the element comes from the skill's own tags.
          const r = caster.sheet.get('curseRupture', tags, extra);
          if (r > 0) {
            const rolled = Object.values(packet.amounts).reduce((s, v) => s + (v ?? 0), 0);
            if (rolled > 0) {
              armed = rolled * r;
              armedType = (['fire', 'cold', 'lightning'] as const)
                .find(e => def.tags.includes(e)) ?? 'chaos';
            }
          }
        }
        nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus(sid, dpsOut2, durScale, caster.name, {
          propagates: chance(caster.sheet.get('dotPropagates', tags, extra)) || undefined,
          stacksBonus: stacksBonusFor(sid),
          casterId: caster.id,
          brood: instanceBrood(inst),
          leech: caster.sheet.get('dotLeech_' + sid, tags, extra) || undefined,
          rupture: armed, ruptureType: armedType,
          ruptureRadius: armed !== undefined ? 90 * caster.sheet.get('aoeRadius', tags, extra) : undefined,
          popBonus: caster.sheet.get('popPower_' + sid, tags, extra) || undefined,
        }));
        // Stat-granted applications trigger statusApply procs too.
        nativeHost.rollStatusProcs(caster, inst, target, sid, tags, extra, depth);
        if (dps > 0) {
          nativeHost.bankPools(caster, { status: sid },
            dps * (STATUS_DEFS[sid]?.duration ?? 0) * durScale);
        }
      }
    }

    // Splash: the hit detonates into a small area around its target.
    if (dealt > 0 && depth === 0) {
      const splash = caster.sheet.get('splashRadius', tags, extra)
        * caster.sheet.get('aoeRadius', tags, extra);
      if (splash > 0) {
        for (const e of nativeHost.enemiesOf(caster)) {
          if (!sameStory(e, target)) continue; // (the sovereignty gate)
          if (e === target || dist(target.pos, e.pos) - e.radius > splash) continue;
          nativeHost.resolveHit(caster, inst, e, dmgMult * 0.5, depth + 1);
        }
        nativeHost.flashes.push({ pos: vec(target.pos.x, target.pos.y), radius: splash, color: def.color, life: 0.15, maxLife: 0.15 });
        // THE MALLET: the splash detonation strikes the surfaces around
        // the struck body too — on the STRUCK body's story (a rim-duel hit
        // detonates where the victim stands, not where the archer does).
        nativeHost.strikeSurfaces(caster, target.pos, splash, undefined, undefined, target.tier);
      }
    }

    // Resource orbs (ORB_DEFS): damaging hits can knock loose any registry
    // kind — the orbOnHit_<id> family, rolled with the striking skill's
    // context so tag-filtered grants work ("melee hits shed wakeflames").
    if (dealt > 0 && depth === 0 && nativeHost.orbs.length < ORB_CAP) {
      const rate = caster.sheet.get('orbShedRate', tags, extra);
      for (const id of Object.keys(ORB_DEFS)) {
        const c = caster.sheet.get(orbOnHitStat(id), tags, extra) * rate;
        if (c > 0 && chance(Math.min(0.5, c))) {
          nativeHost.shedOrb(id, target.pos, { scatter: 18, tier: target.tier });
        }
      }
    }

    // Elemental remnants: hits may shed a pickup that empowers the next
    // cast of its element.
    if (dealt > 0 && depth === 0 && nativeHost.remnants.length < 14) {
      const rc = caster.sheet.get('remnantChance', tags, extra);
      if (rc > 0 && chance(Math.min(0.4, rc))) {
        const elements = (['fire', 'cold', 'lightning'] as const)
          .filter(el => def.tags.includes(el)
            || (packet.amounts[el] ?? 0) > 0);
        if (elements.length) {
          {
let nativeStorage: typeof nativeHost.remnants;
let nativeRecord: typeof nativeHost.remnants[number];
(nativeStorage = nativeHost.remnants).push(nativeRecord = {
            pos: nativeHost.clampPos(vec(target.pos.x + rand(-16, 16), target.pos.y + rand(-16, 16)), 8),
            element: pick(elements),
            bob: rand(0, Math.PI * 2), life: 14,
          });
nativeHost.issueCombatRecord("remnants", nativeStorage, nativeRecord, undefined, undefined);
}
        }
      }
    }

    // THE BELL (castOnStruck): a struck bell ANSWERS — it casts its skill
    // at itself on a throttle; the taunt begs enemies to keep ringing it
    // (and the melee case lets the OWNER ring it deliberately).
    if (dealt > 0 && target.construct?.castOnStruck && !target.dead) {
      nativeHost.ringBell(target);
    }

    // Procs: chance-based triggered effects. Top-level damaging hits only.
    // 'hit' procs fire on any damaging hit; 'kill' procs when the hit slays
    // — and, against ELITE prey (rare+, bosses), on-kill procs ALSO roll on
    // plain hits at chance × killProcOnHit, so Corpsefire and kin still
    // matter across a long single-target fight.
    const lethal = target.life <= 0 && !target.dead;
    // On-kill sustain (the classic trio): life/mana/ES per kill, queried
    // with the slaying skill's context so tag filters apply.
    if (lethal && dealt > 0 && !caster.dead) {
      const lk = caster.sheet.get('lifeOnKill', tags, extra);
      if (lk > 0) caster.healBy(lk);
      const mk = caster.sheet.get('manaOnKill', tags, extra);
      if (mk > 0) caster.mana = Math.min(caster.availableMaxMana(), caster.mana + mk);
      const ek = caster.sheet.get('esOnKill', tags, extra);
      if (ek > 0) caster.es = Math.min(caster.maxEs(), caster.es + ek);
    }
    // THE THRONG'S COMBAT SOURCES (engine/throng.ts): onCrit rolls + the
    // hit-fed gauge, and the lastKill mote anchor. Top-level landed hits
    // only — echoes and riders never double-feed the gauge.
    if (dealt > 0 && depth === 0) nativeHost.throngOnHit(caster, target, wasCrit, lethal);
    if (dealt > 0 && depth === 0 && caster.summonInst?.def.throng) {
      const splash = throngEvolution(caster.summonInst).splashScale;
      if (splash && tags.has('attack')) nativeHost.throngEvolutionBurst(caster, target.pos, 36, splash, target);
    }
    // THE SUPPORT BASE's spawn chassis (engine/supportbase.ts): rolled
    // veins on the host's sockets — every landed top-level blow FEEDS the
    // cut (steady / chance / gauge), and the clutch door bears the brood
    // (capped, mortal, keeper-credited — the Forgebound census shape).
    // Blob-less copies (worn grafts, the census probe) wear the canonical
    // cut by the one resolveVein law.
    if (dealt > 0 && depth === 0 && !caster.dead) {
      for (const s of hostSockets(inst)) {
        const base = s.def.rollBase;
        if (!base) continue;
        const spec = spawnVeinOf(base, s.rolled);
        if (!spec) continue;
        let due = false;
        if (spec.every) due = true;
        else if (spec.pct !== undefined) due = chance(spec.pct);
        else if (spec.hits !== undefined) {
          s.gauge = (s.gauge ?? 0) + 1;
          if (s.gauge >= spec.hits) { s.gauge = 0; due = true; }
        }
        if (!due) continue;
        nativeHost.birthAt(caster, null, {
          type: 'birth', monsterId: spec.monsterId,
          count: [spec.count, spec.count], cap: spec.cap,
          duration: SUPPORTBASE_CFG.spawn.duration,
        }, vec(target.pos.x, target.pos.y),
        { host: true, capKey: `__vein:${inst.def.id}:${s.def.id}` });
      }
    }
    const elite = target.rarity === 'rare' || target.rarity === 'champion'
      || target.rarity === 'crowned'
      || !!(target.defId && MONSTERS[target.defId]?.boss);
    if (dealt > 0 && depth < nativeHost.procDepthAllowed(caster)) {
      const eliteFactor = elite
        ? caster.sheet.get('killProcOnHit', tags, extra) : 0;
      for (const proc of PROC_LIST) {
        // Only the hit-family triggers roll here (collision procs roll at
        // arrested knockbacks; statusApply procs at status application).
        if (proc.trigger !== 'hit' && proc.trigger !== 'kill') continue;
        if (proc.crit && !wasCrit) continue;
        if (proc.noCrit && wasCrit) continue;
        // THE BLOW'S TYPE GATE (ProcDef.hitType): what actually struck.
        if (proc.hitType && dominantTypeOf(packet.amounts) !== proc.hitType) continue;
        if (proc.vs && !nativeHost.victimGate(proc.vs, target, caster)) continue;
        if (proc.rollTop !== undefined
          && !nativeHost.rollTopMet(caster, proc.rollTop, packet.rollT, tags, extra)) continue;
        if (!nativeHost.procGates(caster, proc, inst)) continue;
        let procChance = nativeHost.procChance(caster, proc, depth, tags, extra);
        if (proc.trigger === 'kill' && !lethal) {
          if (eliteFactor <= 0) continue;
          procChance *= eliteFactor;
        }
        if (procChance <= 0 || !chance(procChance)) continue;
        if (!nativeHost.procReady(caster, proc)) continue;
        nativeHost.executeProc(proc, caster, inst, target, depth);
      }
    }
    // MINION CARRY (golden rule 6): the minion's landed hit rolls its
    // OWNER's minionCarry procs, read through the SUMMONING skill's context
    // — Summon Phantasm socketed in Summon Skeleton makes the skeleton's
    // blows conjure phantasms FOR THE PLAYER, up to the player's caps and
    // clocks (ICD / PPM / oncePerCast all live on the owner).
    if (dealt > 0 && caster.owner && !caster.owner.dead) {
      const owner = caster.owner;
      const carryInst = caster.summonInst
        ?? owner.skills.find(s => s?.def.id === caster.sourceSkillId) ?? null;
      if (carryInst && depth < nativeHost.procDepthAllowed(owner)) {
        const cTags = skillContextTags(carryInst.def);
        const cExtra = instanceMods(carryInst);
        const ownerElite = elite
          ? owner.sheet.get('killProcOnHit', cTags, cExtra) : 0;
        // THE COURT NORMALIZER (2026-07-21): HIT-frequency carry rolls —
        // plain 'hit' triggers and kill-procs riding the elite hit lane —
        // divide by the skill's LIVING COURT, so hits multiplying with
        // minion count never multiply proc throughput (the
        // bakeMinionOwnerStats 1/batch doctrine, proc form). TRUE kills
        // stay whole (a body dies once, court-size-blind), and a proc
        // bringing its own clock (ppm/icd) keeps its authored pacing.
        const court = Math.max(1, nativeHost.minionsOfSkill(owner, carryInst.def.id).length);
        for (const proc of PROC_LIST) {
          if (!proc.minionCarry) continue;
          if (proc.trigger !== 'hit' && proc.trigger !== 'kill') continue;
          if (proc.crit && !wasCrit) continue;
          if (proc.noCrit && wasCrit) continue;
          if (proc.hitType && dominantTypeOf(packet.amounts) !== proc.hitType) continue;
          if (proc.vs && !nativeHost.victimGate(proc.vs, target, owner)) continue;
          if (proc.rollTop !== undefined
            && !nativeHost.rollTopMet(owner, proc.rollTop, packet.rollT, cTags, cExtra)) continue;
          if (!nativeHost.procGates(owner, proc, carryInst)) continue;
          let cc = nativeHost.procChance(owner, proc, depth, cTags, cExtra);
          if (proc.trigger === 'kill' && !lethal) {
            if (ownerElite <= 0) continue;
            cc *= ownerElite;
          }
          if (!proc.ppm && proc.icd === undefined
            && !(proc.trigger === 'kill' && lethal)) {
            cc /= court;
          }
          if (cc <= 0 || !chance(cc)) continue;
          if (!nativeHost.procReady(owner, proc)) continue;
          nativeHost.executeProc(proc, owner, carryInst, target, depth);
        }
        // THE COURT'S KILL TAPS: a minion's TRUE kill fires the on-kill
        // charge taps riding the SUMMONING instance — Victor's Tempo
        // socketed in the contract feeds the keeper's tempo off the
        // court's kills. Kills are exclusive events (one death,
        // court-size-blind), so no normalization; the owner's own caps
        // and decay govern the bank as ever.
        if (lethal) {
          for (const spec of instanceChargeGain(carryInst)) {
            if (spec.on !== 'kill') continue;
            if (spec.chance !== undefined && !chance(spec.chance)) continue;
            owner.gainCharge(spec.charge, spec.amount, spec.max, carryInst);
          }
          // THE COURT'S SHED CARRY (2026-07-21 R5): the court's true kills
          // roll the KEEPER's kill-sheds through the summoning instance —
          // orbs and remnants alike. Kills are exclusive events (one death,
          // court-size-blind), so no normalization; caps and shed rates on
          // the owner's sheet govern as ever.
          nativeHost.rollKillOrbs(owner, carryInst, target);
          nativeHost.rollKillRemnants(owner, carryInst, target.pos);
        }
      }
    }

    nativeHost.assaults.afterHit(caster, target, dealt, depth, hasDamage);

    nativeHost.assaultDoomCull(target);

    // THE CONSUMABLE BUFFS (BuffEffect.consumeOn) spend AFTER the whole
    // resolution — damage, ailments and procs have all read the buff that
    // empowered this blow — and the kill stamps the ledger.
    nativeHost.challenges.afterHit(caster, inst, target, dealt, depth, dmgMult);
    nativeHost.attackSequences.landed(caster, inst, target, dealt, packet.amounts.physical ?? 0, depth);
    if (dealt > 0) {
      if (depth === 0) nativeHost.companionBonds.onHit(caster, inst, target);
      const spentContext = [...skillContextTags(inst)];
      caster.spendBuffs('hit', spentContext, def.id);
      if (wasCrit) caster.spendBuffs('crit', spentContext, def.id);
      if (lethal) { caster.noteRecent('kill'); caster.spendBuffs('kill', spentContext, def.id); }
      // THE STRIDE's spend (THE LEGEND FABRIC): a real blow that landed
      // while 'strided' held marks the walk spent — the reset lands at the
      // caster's next timer tick, so every contact of this frame's swing
      // read the same stride. Chained consequences (procs, echoes at
      // depth) never spend it: the stride pays the hand, not the echo.
      if (depth === 0 && caster.strideDist > 0 && !caster.strideSpent && caster.conditionHolds('strided')) {
        caster.strideSpent = true;
        nativeHost.text(vec(caster.pos.x, caster.pos.y - caster.radius - 10), 'STRIDE!', '#9ad0ff', 12, 'combat');
      }
      target.spendBuffs('hurt');
    }
    if (target.life <= 0 && !target.dead) {
      // Kill-fed taps + fragment sheds ride the killing HIT: support-granted
      // remnantDrop stats live in the skill's extra mods and are only
      // visible from a skill-context query — this is that site. The victim
      // rides along so elite-gated kill taps (and gauge feeds) can read it.
      nativeHost.tapCharges(caster, 'kill', undefined, undefined, target);
      nativeHost.rollKillRemnants(caster, inst, target.pos);
      nativeHost.rollKillOrbs(caster, inst, target);
      // CAST-ON-KILL trigger gems ride the killing hit (chain depth from
      // the slaying instance's stamp, aimed at where the victim fell).
      nativeHost.rollTriggers(caster, 'kill', {
        depth: inst.state?.trigDepth ?? 0,
        aim: vec(target.pos.x, target.pos.y), sourceInst: inst,
      });
      nativeHost.kill(target, false, caster);
    }
    // meleeHit belongs to the wielded attack, never proc/trigger descendants.
    if (dealt > 0 && depth === 0 && !inst.state?.trigDepth
      && !instanceTrigger(inst) && packet.tags.has('attack') && packet.tags.has('melee')) {
      nativeHost.rollTriggers(caster, 'meleeHit', {
        aim: vec(target.pos.x, target.pos.y), sourceInst: inst,
      });
    }
  }

export function sceneRollStatusProcs(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance, target: Actor, statusId: string,
    tags: Set<SkillTag>, extra: Modifier[], depth: number,
  ): void {
    // THE AILMENT-POWER BANKS ("Cast on <status>" trigger gems): every
    // application the owner lays feeds matching gems — banked BEFORE the
    // proc depth gate (power is power, however the wound was made); the
    // trigger chain cap rides the applying instance's own stamp instead.
    nativeHost.bankStatusTriggers(caster, statusId,
      vec(target.pos.x, target.pos.y), inst.state?.trigDepth ?? 0, inst);
    if (depth >= nativeHost.procDepthAllowed(caster)) return;
    for (const proc of PROC_LIST) {
      if (proc.trigger !== 'statusApply') continue;
      if (proc.status !== undefined) {
        const list = Array.isArray(proc.status) ? proc.status : [proc.status];
        if (!list.includes(statusId)) continue;
      }
      if (!nativeHost.procGates(caster, proc, inst)) continue;
      const c = nativeHost.procChance(caster, proc, depth, tags, extra);
      if (c <= 0 || !chance(c)) continue;
      if (!nativeHost.procReady(caster, proc)) continue;
      nativeHost.executeProc(proc, caster, inst, target, depth);
    }
  }

export function sceneRollOwnProcs(nativeHost: NativeSceneCombatHost, 
    owner: Actor, trigger: ProcDef['trigger'],
    opts?: {
      tags?: Set<SkillTag>; extra?: Modifier[]; inst?: SkillInstance; target?: Actor; depth?: number; bracket?: number;
      /** 'hurt': the incoming blow was critical (the crit / noCrit gates). */
      crit?: boolean;
      receivedAmounts?: Partial<Record<DamageType, number>>;
      /** 'condition': the ConditionId that just flipped on. */
      condition?: ConditionId;
      /** 'cast': where the cast was pointed — a 'cast' payload's landing. */
      aim?: Vec2;
    },
  ): void {
    if (owner.dead) return;
    // THE ARMED GUARD: nothing on this sheet (or the event's instance)
    // grants any proc of this trigger — leave without walking the registry.
    const idx = procIndex();
    const want = idx.byTrigger[trigger];
    if (!want?.size) return;
    let any = false;
    for (const id of owner.sheet.armedFamily('proc_', idx.all, opts?.extra)) {
      if (want.has(id)) { any = true; break; }
    }
    if (!any) return;
    const depth = opts?.depth ?? 0;
    if (depth >= nativeHost.procDepthAllowed(owner)) return;
    for (const proc of PROC_LIST) {
      if (proc.trigger !== trigger) continue;
      if (proc.bracket !== undefined && (opts?.bracket === undefined
        || !(Array.isArray(proc.bracket) ? proc.bracket : [proc.bracket]).includes(opts.bracket))) continue;
      // THE TALENT FABRIC's gates: the condition edge must be the named
      // one; crit / noCrit read the event's blow; `vs` reads the event's
      // other body (the striker on 'hurt', the refuser on 'miss'/'foiled',
      // the fallen on 'minionDeath').
      if (proc.condition !== undefined && proc.condition !== opts?.condition) continue;
      if (proc.receivedTypes && !proc.receivedTypes.some(t => (opts?.receivedAmounts?.[t] ?? 0) > 0)) continue;
      if (proc.crit && !opts?.crit) continue;
      if (proc.noCrit && opts?.crit) continue;
      if (proc.vs && (!opts?.target || !nativeHost.victimGate(proc.vs, opts.target, owner))) continue;
      if (!nativeHost.procGates(owner, proc, opts?.inst ?? null)) continue;
      const c = nativeHost.procChance(owner, proc, depth, opts?.tags, opts?.extra);
      if (c <= 0 || !chance(c)) continue;
      if (!nativeHost.procReady(owner, proc)) continue;
      nativeHost.executeProc(proc, owner, opts?.inst ?? null, opts?.target ?? null, depth, opts?.aim);
    }
  }

export function sceneSweepDefenseEvents(nativeHost: NativeSceneCombatHost, a: Actor, depth = 0): void {
    if (a.poiseJustBroke) {
      a.poiseJustBroke = false;
      nativeHost.flashes.push(defenseCueFlash(a, 'poise', 'break', DEFENSE_CUE_CFG.poiseColor));
      nativeHost.rollOwnProcs(a, 'poiseBroken', { depth });
    }
    if (a.poiseBracketHits.length) {
      const rungs = a.poiseBracketHits;
      a.poiseBracketHits = [];
      for (const frac of rungs) nativeHost.rollOwnProcs(a, 'poiseBracket', { depth, bracket: frac });
    }
    if (a.poiseJustRearmed) {
      a.poiseJustRearmed = false;
      nativeHost.flashes.push(defenseCueFlash(a, 'poise', 'reform', DEFENSE_CUE_CFG.poiseColor));
      nativeHost.rollOwnProcs(a, 'poiseRearmed', { depth });
    }
    if (a.esRechargeJustStarted) {
      a.esRechargeJustStarted = false;
      nativeHost.rollOwnProcs(a, 'esRechargeStart', { depth });
    }
    if (a.esJustFilled) {
      a.esJustFilled = false;
      nativeHost.rollOwnProcs(a, 'esFilled', { depth });
    }
  }

export function sceneExecuteProc(nativeHost: NativeSceneCombatHost, proc: ProcDef, caster: Actor, inst: SkillInstance | null, target: Actor | null, depth = 0, aim?: Vec2): void {
    // THE PROC POWER (procPower_<id>, base 1 — the magnitude dial beside
    // the chance): folded once here onto the effect's numbers, read with
    // the event's own context so a skill-scoped grant scopes like the chance.
    const pw = caster.sheet.get(procPowerStat(proc.id),
      inst ? skillContextTags(inst) : undefined, inst ? instanceMods(inst) : undefined);
    const fx = scaleProcEffect(proc.effect, pw);
    const procCue = proc.procCue === false || proc.announceName === false ? false : {
      profile: 'mend', color: proc.color, ...proc.procCue,
    };
    switch (fx.type) {
      case 'gainCharge': {
        const procCueBefore = caster.charges.get(fx.charge) ?? 0;
        caster.gainCharge(fx.charge, fx.amount, fx.max, inst ?? undefined, depth + 1);
        if ((caster.charges.get(fx.charge) ?? 0) > procCueBefore) noteProcCue(caster, procCue, 'gain', proc.id);
        break;
      }
      case 'buff': {
        const storedCue = fx.buff.storedCue ?? (procCue === false ? false
          : { ...(buffProcCue(fx.buff) || {}), color: proc.color, ...proc.procCue });
        caster.addBuff({ ...fx.buff, storedCue }, caster.sheet.get('effectDuration',
          inst ? skillContextTags(inst) : undefined,
          inst ? instanceMods(inst) : undefined), depth + 1);
        if (caster.buffs.has(fx.buff.id)) noteProcCue(caster, storedCue, 'gain', proc.id);
        break;
      } // Keep storedCue local to this grant; the shared proc definition is immutable.
      // Applies a status to the STRUCK target — DoT power from the status's
      // caster-less baseline × magnitude (golden rule 4), pop/potency
      // investment honored exactly like a stat-granted application.
      case 'status': {
        if (!target || target.dead) break;
        const sdef = STATUS_DEFS[fx.status];
        if (!sdef) break;
        const tags = inst ? skillContextTags(inst) : undefined;
        const extra = inst ? instanceMods(inst) : undefined;
        const dps = sdef.dotType
          ? baselineStatusDps(fx.status, nativeHost.zone.level) * (fx.magnitude ?? 1)
            * caster.sheet.get('statusMagnitude',
              sdef.dotType && inst ? skillContextTags(inst, [sdef.dotType]) : tags, extra)
          : 0;
        nativeHost.withCombatStatusSource(target, caster, inst, () => target.applyStatus(fx.status, dps,
          caster.sheet.get('effectDuration', tags, extra), proc.name, {
            casterId: caster.id,
            leech: caster.sheet.get('dotLeech_' + fx.status, tags, extra) || undefined,
            popBonus: caster.sheet.get('popPower_' + fx.status, tags, extra) || undefined,
            power: sdef.dotType ? undefined
              : caster.sheet.get('statusMagnitude', tags, extra),
          }));
        break;
      }
      // The proc's OWNER mends — through healBy, so healTaken gates it
      // like every heal (golden rule 5).
      case 'heal':
        if (caster.healBy((fx.flat ?? 0) + (fx.pctMax ?? 0) * caster.maxLife()) > 0) noteProcCue(caster, procCue, 'gain', proc.id);
        break;
      case 'restore': {
        const procCueBefore = fx.resource === 'mana' ? caster.mana : fx.resource === 'poise' ? caster.poise : caster.es;
        const amount = (fx.flat ?? 0) + (fx.pctMax ?? 0)
          * (fx.resource === 'mana' ? caster.maxMana()
            : fx.resource === 'poise' ? caster.maxPoise() : caster.maxEs());
        if (fx.resource === 'mana') {
          caster.mana = Math.min(caster.availableMaxMana(), caster.mana + amount);
        } else if (fx.resource === 'poise') {
          // Through gainPoise: feeds a broken bar's climb, and may CREST
          // past max into the owner's poiseOvercharge headroom.
          caster.gainPoise(amount);
        } else {
          caster.gainEs(amount);
          // The autonomous-recharge seam: the payload may also start the
          // recharge flowing NOW instead of waiting out the delay.
          if (fx.resetEsDelay) caster.esDelay = 0;
        }
        const procCueAfter = fx.resource === 'mana' ? caster.mana : fx.resource === 'poise' ? caster.poise : caster.es;
        if (procCueAfter > procCueBefore) noteProcCue(caster, procCue, 'gain', proc.id);
        break;
      }
      // A typed burst around the OWNER — baseline-scaled (flat + perLevel),
      // never a skill roll (golden rule 4), mitigated per victim like any
      // typed source.
      case 'burst': {
        const dmg = fx.base + fx.perLevel * Math.max(0, caster.level - 1);
        nativeHost.flashes.push({ pos: vec(caster.pos.x, caster.pos.y), radius: fx.radius, color: proc.color, life: 0.3, maxLife: 0.3 });
        // THE MALLET: the proc's blast is a strike surface (rings bells,
        // pops pots — triggered violence counts).
        nativeHost.strikeSurfaces(caster, caster.pos, fx.radius);
        for (const enemy of nativeHost.enemiesOf(caster)) {
          if (!sameStory(caster, enemy)) continue; // the proc's burst is a touch (the sovereignty gate)
          if (enemy.dead || enemy.untargetable) continue;
          if (dist(caster.pos, enemy.pos) - enemy.radius > fx.radius) continue;
          const landed = mitigateTyped(enemy, { [fx.damage]: dmg });
          if (landed <= 0 || enemy.invulnerable) continue;
          enemy.life -= landed;
          enemy.hitFlash = 0.15;
          enemy.hitFlashType = fx.damage;
          nativeHost.text(enemy.pos, Math.round(landed).toString(), proc.color, 12);
          // The burst emptied a shield: the victim's esBreak reactions
          // fire one link deeper (this damage IS proc output). Poise
          // breaks/rungs it caused ride the same sweep at the same depth.
          if (enemy.esBroke) {
            enemy.esBroke = false;
            nativeHost.rollOwnProcs(enemy, 'esBreak', { depth: depth + 1 });
          }
          nativeHost.sweepDefenseEvents(enemy, depth + 1);
          if (enemy.life <= 0 && !enemy.dead) nativeHost.kill(enemy);
        }
        break;
      }
      // A telegraphed bloom: schedule it (the flash IS the telegraph — an
      // honest circle for the full delay), resolved by updatePendingBursts.
      case 'delayedBurst': {
        const spot = fx.at === 'self' || !target ? caster.pos : target.pos;
        {
let nativeStorage: typeof nativeHost.pendingBursts;
let nativeRecord: typeof nativeHost.pendingBursts[number];
let nativeRecordSource: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[3];
(nativeStorage = nativeHost.pendingBursts).push(nativeRecord = {
          at: vec(spot.x, spot.y), when: nativeHost.time + fx.delay,
          owner: (nativeRecordSource = caster), fx, color: proc.color, depth: depth + 1, tier: caster.tier,
        });
nativeHost.issueCombatRecord("pendingBursts", nativeStorage, nativeRecord, nativeRecordSource, undefined);
}
        nativeHost.flashes.push({
          pos: vec(spot.x, spot.y), radius: fx.radius,
          color: proc.color, life: fx.delay, maxLife: fx.delay, edgeFrac: 0.94,
        });
        break;
      }
      case 'fortify': {
        const banked = caster.gainEndurance(
          (fx.flat ?? 0) + (fx.pctMaxLife ?? 0) * caster.maxLife());
        if (banked > 0) {
          nativeHost.flashes.push({ pos: vec(caster.pos.x, caster.pos.y), radius: caster.radius + 8, color: proc.color, life: 0.2, maxLife: 0.2 });
        }
        break;
      }
      case 'cooldown': {
        let procCueChanged = false;
        // Every clock by default; `skills` / `tags` narrow it to the named
        // arts (a bar instance answers the id — an unslotted clock has no
        // tags and matches only an unfiltered effect); `exceptSelf` spares
        // the skill whose use raised the trigger.
        for (const [id, t] of [...caster.cooldowns]) {
          if (fx.exceptSelf && inst && id === inst.def.id) continue;
          if (fx.skills && !fx.skills.includes(id)) continue;
          if (fx.tags) {
            const bar = caster.skills.find(sk => sk?.def.id === id);
            if (!bar || !fx.tags.every(tg => bar.def.tags.includes(tg))) continue;
          }
          const left = fx.reset ? 0 : t - (fx.seconds ?? 0) - t * (fx.fraction ?? 0);
          if (left < t) procCueChanged = true;
          if (left <= 0) caster.cooldowns.delete(id);
          else caster.cooldowns.set(id, left);
        }
        if (procCueChanged) noteProcCue(caster, procCue, 'gain', proc.id);
        break;
      }
      // THE GRAMMAR'S ERASER: strip named buffs from the owner.
      case 'removeBuff': {
        const l = Array.isArray(fx.buff) ? fx.buff : [fx.buff];
        for (const id of l) caster.removeBuff(id);
        break;
      }
      // WARD on the owner — through gainWard (wardGain scales, wardDecay bounds).
      case 'ward': {
        const amount = (fx.flat ?? 0) + (fx.pctMaxLife ?? 0) * caster.maxLife();
        const procCueBefore = caster.ward;
        if (amount > 0) caster.gainWard(amount);
        if (caster.ward > procCueBefore) noteProcCue(caster, procCue, 'gain', proc.id);
        break;
      }
      // CLEANSE the owner: named statuses, every hard CC, every damaging ailment.
      case 'cleanse': {
        const procCueBefore = caster.statuses.length;
        const ids = new Set<string>(fx.statuses ?? []);
        for (const st of caster.statuses) {
          const sd = STATUS_DEFS[st.id];
          if (!sd) continue;
          if ((fx.hardCC && sd.hardCC) || (fx.afflictions && sd.dotType)) ids.add(st.id);
        }
        for (const id of ids) caster.endStatus(id);
        if (caster.statuses.length < procCueBefore) noteProcCue(caster, procCue, 'release', proc.id);
        break;
      }
      // KINDLE: plant a registered lightwell where the trigger landed (the
      // Gutterglow gem's kill-shed motes — the fight itself keeps the LIGHT
      // meter fed in the Gloaming's dark). Open by construction: any proc,
      // combo payoff or fortune that names a lightwell kind lights ground
      // through this one case; the row's own pool/decay bounds the litter
      // (the transience doctrine — the mote gutters, the world forgets it).
      case 'kindle': {
        const at = target ? target.pos : caster.pos;
        nativeHost.spawnLightwell(fx.kind, vec(at.x, at.y));
        break;
      }
      // A VENTED BANK (THE SCALD KIT K2 — Vaporize): the trigger plants a
      // registered fog bank where it landed (the struck body, else the
      // owner) — the kindle case's sibling aimed at the fog fabric, so any
      // proc/rider/fortune that names a bank lays area denial by SIGHT.
      // The bank's own row bounds the litter (it is mortal and short).
      case 'vent': {
        const at = target ? target.pos : caster.pos;
        nativeHost.plantVent({ bank: fx.bank, radius: fx.radius, duration: fx.duration },
          vec(at.x, at.y), 1, caster.sheet.get('effectDuration'), caster.tier);
        break;
      }
      // THE CAST PAYLOAD (the signature lane, data/procs.ts): play a
      // catalog skill from the proc's site — the rider grammar's payload
      // as a first-class effect, one depth deeper like every consequence.
      case 'cast':
        nativeHost.castProcPayload(caster, inst, target, depth + 1, fx.cast, aim);
        break;
      case 'extraHit':
        if (!inst || !target) break;
        nativeHost.flashes.push({ pos: vec(target.pos.x, target.pos.y), radius: target.radius + 8, color: proc.color, life: 0.2, maxLife: 0.2 });
        nativeHost.resolveHit(caster, inst, target, fx.damageScale, depth + 1);
        break;
      case 'explosion': {
        if (!inst || !target) break;
        nativeHost.flashes.push({ pos: vec(target.pos.x, target.pos.y), radius: fx.radius, color: proc.color, life: 0.3, maxLife: 0.3 });
        // THE MALLET: the proc's explosion strikes the surfaces too.
        nativeHost.strikeSurfaces(caster, target.pos, fx.radius);
        for (const enemy of nativeHost.enemiesOf(caster)) {
          if (!sameStory(target, enemy)) continue; // the proc's splash lands on the victim's story (the sovereignty gate)
          if (dist(target.pos, enemy.pos) - enemy.radius <= fx.radius) {
            nativeHost.resolveHit(caster, inst, enemy, fx.damageScale, depth + 1);
          }
        }
        break;
      }
      case 'arc': {
        if (!inst || !target) break;
        // The jolt LEAPS outward: struck target → nearest fresh enemy →
        // onward, up to `hops` links, each landing a re-rolled hit at the
        // scale one depth deeper. Struck bodies never repeat, so the arc
        // always travels away from where it started.
        const struck = new Set<Actor>([target]);
        let from = target;
        for (let hop = 0; hop < fx.hops; hop++) {
          let best: Actor | null = null;
          let bd = fx.range;
          for (const enemy of nativeHost.enemiesOf(caster)) {
            if (!sameStory(caster, enemy)) continue; // (the sovereignty gate)
            if (enemy.dead || enemy.untargetable || struck.has(enemy)) continue;
            const dd = dist(from.pos, enemy.pos);
            if (dd <= bd) { bd = dd; best = enemy; }
          }
          if (!best) break;
          // The leap itself: a bead of flashes strung along the segment
          // (no dedicated arc renderer yet — the visual fabric can dress
          // this seam later without touching the mechanic).
          for (let s = 1; s <= 3; s++) {
            const f = s / 3;
            nativeHost.flashes.push({
              pos: vec(from.pos.x + (best.pos.x - from.pos.x) * f,
                from.pos.y + (best.pos.y - from.pos.y) * f),
              radius: 14, color: proc.color, life: 0.18, maxLife: 0.18,
            });
          }
          struck.add(best);
          nativeHost.resolveHit(caster, inst, best, fx.damageScale, depth + 1);
          from = best;
        }
        break;
      }
      case 'displace': {
        if (!target) break;
        nativeHost.flashes.push({ pos: vec(target.pos.x, target.pos.y), radius: 60, color: proc.color, life: 0.25, maxLife: 0.25 });
        const dir = fx.force > 0 ? angleTo(caster.pos, target.pos) : angleTo(target.pos, caster.pos);
        nativeHost.pushActor(target, dir, Math.abs(fx.force));
        break;
      }
      case 'collisionDamage':
        if (!inst || !target) break;
        nativeHost.flashes.push({ pos: vec(target.pos.x, target.pos.y), radius: target.radius + 10, color: proc.color, life: 0.2, maxLife: 0.2 });
        nativeHost.resolveHit(caster, inst, target, fx.damageScale, depth + 1);
        break;
      case 'summon': {
        if (!target) break;
        // FORGEBOUND: the hit conscripts — a minion rises beside the
        // victim (per-proc cap via sourceSkillId '__proc:<id>').
        const key = '__proc:' + proc.id;
        const owner = caster.owner ?? caster;
        if (nativeHost.actors.filter(m => m.owner === owner && !m.dead
          && m.sourceSkillId === key).length >= fx.max) break;
        const forged = nativeHost.createMonster(fx.monsterId, owner.level, owner.team, owner);
        forged.sourceSkillId = key;
        // BORROWED UNLIFE: the conscript binds to its RESOLVED keeper (the
        // same `caster.owner ?? caster` the court-credit laws ride), so a
        // nested conjurer's proc-conscripts unmake when it falls — the
        // lifeline cascade's one loose link closed. Seat and enemy/wild
        // keepers stamp undefined by conjurationLifeline's own law, so
        // first-hand play is untouched.
        forged.lifelineId = nativeHost.conjurationLifeline(owner);
        // THE HYBRID SEAM: when the conscripting hit came from a real skill
        // instance, the conscripts are that instance's CREW — its gems
        // forward aboard (the lane router keeps each gem to the lanes it
        // fits: Alternating Strikes alternates the swing AND the forged
        // wraith's strikes), and socket changes resync them like any other
        // minions. Forgebound turns a melee skill into a true melee+summon
        // hybrid with zero new rules.
        if (inst) {
          forged.summonInst = inst;
          nativeHost.forwardSummonSockets(inst, forged.skills);
        }
        forged.lifespan = fx.duration * owner.sheet.get('effectDuration',
          inst ? skillContextTags(inst) : undefined,
          inst ? instanceMods(inst) : undefined);
        forged.pos = nativeHost.clampPos(vec(
          target.pos.x + rand(-30, 30), target.pos.y + rand(-30, 30)), forged.radius);
        { nativeHost.actors.push(forged); nativeHost.admitCombatBirth(forged); }
        break;
      }
      case 'birth': {
        // THE CLUTCH's proc door (engine/clutch.ts — her Card-4 ruling):
        // the trigger is the landing. The keeper resolves as Forgebound's
        // conscript does (the court-credit law), the census key is the
        // proc's own, and the full birth row plays — combo payoffs,
        // blocks, kills, whatever grants the proc.
        const owner = caster.owner ?? caster;
        const site = fx.at === 'self' || !target ? owner : target;
        nativeHost.birthAt(owner, null, fx.birth, vec(site.pos.x, site.pos.y),
          { host: !!target && site === target, capKey: '__proc:' + proc.id });
        break;
      }
    }
    // PROC RIDERS: stat-granted consequences bolted onto THIS proc from
    // outside (passives, gems, affixes — see ProcRiderDef). Each rider
    // rolls its own chance (procRider_<id>, luck-scaled like every proc
    // rate) and casts its payload from the proc's site, one depth deeper
    // than the host — the golden rules keep governing.
    nativeHost.fireProcRiders(proc, caster, inst, target, depth);
  }

export function sceneCastProcPayload(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance | null, target: Actor | null,
    depth: number, cast: ProcCastSpec, aim?: Vec2,
  ): boolean {
    const skill = SKILLS[cast.skillId];
    if (!skill) return false;
    // THE SITE: a struck body anchors the payload; with no body, an AIMED
    // event (a 'cast' trigger's own aim) lands the payload where the
    // caster pointed; else the caster's feet. 'self' always means the feet.
    const anchored = cast.at !== 'self' && target ? target : null;
    const origin = anchored ? vec(anchored.pos.x, anchored.pos.y)
      : cast.at !== 'self' && aim ? vec(aim.x, aim.y) : vec(caster.pos.x, caster.pos.y);
    const n = randInt(cast.count[0], cast.count[1]);
    if (n <= 0) return false;
    // THE OWN-COPY LAW (ProcCastSpec.own): the caster's HELD instance —
    // learned, granted or kit — plays with its level, sockets, grafts and
    // picks; otherwise a plain synthetic at the event's level.
    const held = cast.own ? nativeHost.heldSkillInst(caster, cast.skillId) : null;
    const level = held ? effectiveSkillLevel(held)
      : inst ? effectiveSkillLevel(inst)
        : Math.max(1, Math.round(caster.level / 2));
    const payload = (): SkillInstance => held ?? { ...makeSkillInstance(skill, level), procChainDepth: depth };
    const mult = cast.mult ?? 1;
    if (skill.delivery.type === 'projectile') {
      const bearing = target && target !== caster ? angleTo(caster.pos, target.pos)
        : aim ? angleTo(caster.pos, aim) : caster.facing;
      // Sprays leave the STRUCK body (hit-locked against it, flying
      // outward); an aimed or self payload leaves the caster's own hand
      // along the bearing, so a triggered bolt flies where the spell went.
      const from = anchored ? origin : vec(caster.pos.x, caster.pos.y);
      const phase = rand(0, Math.PI * 2);
      const fan = typeof cast.spread === 'number' ? cast.spread : anchored ? undefined : 0;
      for (let i = 0; i < n; i++) {
        const dir = fan === undefined
          ? phase + (i / n) * Math.PI * 2
          : bearing + (n === 1 ? 0 : (i / (n - 1) - 0.5) * fan * Math.PI / 180);
        nativeHost.spawnProjectile(caster, payload(), from, dir, { depth, mult });
        if (anchored) {
          nativeHost.projectiles[nativeHost.projectiles.length - 1].hits.set(anchored.id, Infinity);
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        // targetInfo anchors CENTERED deliveries (novas, instants) at
        // the proc's site — without it they would bloom on the caster.
        nativeHost.executeSkill(caster, payload(), origin, {
          targetInfo: { pos: vec(origin.x, origin.y) },
          dmgMult: mult, noCooldown: true, noRepeat: true,
          noFollowUp: true, keepFacing: true,
        });
      }
    }
    return true;
  }

export function sceneFireProcRiders(nativeHost: NativeSceneCombatHost, 
    proc: ProcDef, caster: Actor, inst: SkillInstance | null,
    target: Actor | null, depth: number,
  ): void {
    if (!PROC_RIDER_LIST.length || caster.dead) return;
    const tags = inst ? skillContextTags(inst) : undefined;
    const extra = inst ? instanceMods(inst) : undefined;
    for (const rider of PROC_RIDER_LIST) {
      const hosts = Array.isArray(rider.proc) ? rider.proc : [rider.proc];
      if (!hosts.includes(proc.id)) continue;
      let c = caster.sheet.get(procRiderStat(rider.id), tags, extra);
      if (c <= 0) continue;
      // Luck multiplies rider rates exactly as it does proc rates.
      c *= 1 + caster.sheet.get('luck', tags, extra);
      if (!chance(Math.min(0.95, c))) continue;
      // procCue: the actual cast's sparks/bolts/body carry the rider's identity.
      nativeHost.castProcPayload(caster, inst, target, depth + 1, rider.cast);
    }
  }

export function sceneRuptureBank(nativeHost: NativeSceneCombatHost, caster: Actor, victim: Actor, statusId: string, fraction: number, mul: number,
    tags?: Set<SkillTag>, extra?: Modifier[]): number {
    const s = victim.statuses.find(x => x.id === statusId);
    const sdef = STATUS_DEFS[statusId];
    if (!s || !sdef || victim.dead || victim.invulnerable) return 0;
    const f = Math.max(0, Math.min(1, fraction));
    const banked = s.dps * s.stacks * Math.max(0, s.remaining);
    if (f <= 0 || banked <= 0) return 0;
    const el: DamageType = sdef.dotType ?? sdef.element ?? 'fire';
    const burst = banked * f * Math.max(0, mul);
    // Spend first (the verb is the spend; the burst is what it pays out).
    s.dps *= 1 - f;
    if (f >= 1 || s.dps < 0.05) victim.endStatus(statusId);
    else s.bankFrac = bankFracOf(s, sdef);
    const taken = mitigateTyped(victim, { [el]: burst }, { attacker: caster, tags, extra });
    nativeHost.flashes.push({
      pos: vec(victim.pos.x, victim.pos.y), radius: victim.radius + 18,
      color: sdef.color, life: 0.3, maxLife: 0.3,
    });
    if (taken <= 0) return 0;
    victim.life -= taken;
    victim.hitFlash = 0.15;
    victim.hitFlashType = el;
    nativeHost.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), sdef.color, 13);
    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim, false, caster);
    return taken;
  }

export function sceneRuptureStatus(nativeHost: NativeSceneCombatHost, victim: Actor, s: ActiveStatus): void {
    const type: DamageType = s.ruptureType ?? 'chaos';
    const radius = statusRuptureRadius(s), armedCue = armedCueProfile(STATUS_DEFS[s.id]);
    nativeHost.flashes.push(armedCue
      ? combatCueFlash(victim.pos, armedCueStyle(armedCue).release, radius, 0, STATUS_DEFS[s.id].color)
      : { pos: vec(victim.pos.x, victim.pos.y), radius, color: '#b06bd4', life: 0.3, maxLife: 0.3 });
    for (const e of nativeHost.actors) {
      if (e.dead || e.team !== victim.team || e.untargetable || !sameStory(e, victim)) continue; // (the sovereignty gate)
      if (dist(victim.pos, e.pos) - e.radius > radius) continue;
      let amount = s.rupture! * e.sheet.get('damageTaken');
      amount *= 1 - resistValue(e, type);
      if (e.invulnerable || amount <= 0) continue;
      const deedLifeBefore = e.life;
      e.life -= amount;
      nativeHost.recordIndirectDamage(e, s.casterId === undefined ? undefined : nativeHost.actorById(s.casterId), deedLifeBefore);
      e.hitFlash = 0.15;
      e.hitFlashType = type;
      nativeHost.text(e.pos, Math.round(amount).toString(), '#b06bd4', 12);
      if (e.life <= 0 && !e.dead) nativeHost.kill(e, false, s.casterId === undefined ? undefined : nativeHost.actorById(s.casterId));
    }
  }

export function sceneKillCtx(nativeHost: NativeSceneCombatHost, actor: Actor, killer: Actor | null, credit: boolean): KillCtx {
    return nativeHost.createCombatKillContext({
      actor, killer, credit, zone: nativeHost.massRuntime?.config.progression ? { ...nativeHost.zone, level: actor.level } : nativeHost.zone,
      sim: nativeHost.sim, time: nativeHost.time,
      grantXp: nativeHost.combatEventCallback("grantXp", n => nativeHost.grantXp(n)),
      // THE MEMORY LAW: a row's gem drop wears the SLAIN BODY's provenance.
      dropGemAt: nativeHost.combatEventCallback("dropGemAt", at => nativeHost.dropGemAt(at, undefined, false, nativeHost.provenanceOf(actor))),
      // THE SPOILS VERB (see KillCtx.dropLootTable): the kill path's own
      // three-kind dispatch, reachable by any bounty row. It mints NOTHING
      // itself — every result goes out through the same primitives rollDrops
      // uses, so THE SPOILS LAW, the pickup grace and the drop floats all
      // arrive for free and there is exactly ONE place to get them wrong.
      // The slain body's MONSTER INFREQUENT theme rides along, exactly as it
      // does on the ordinary kill path: one kill, one theme.
      dropLootTable: nativeHost.combatEventCallback("dropLootTable", (tableId, at) => {
        const kdef = actor.defId ? MONSTERS[actor.defId] : undefined;
        const miTheme = kdef?.infrequentTheme ?? (actor.defId ? MONSTER_THEMES[actor.defId] : undefined);
        // THE MEMORY LAW: the table's gems (and its authored pouches) wear the
        // SLAIN BODY's provenance — a row's payout leans toward what fell.
        for (const res of resolveLootTable(tableId, { ilvl: nativeHost.lootLevelAt(actor.pos), miTheme, sourceId: actor.defId })) {
          nativeHost.mintLootResult(at, res, false, nativeHost.provenanceOf(actor));
        }
      }),
      text: nativeHost.combatEventCallback("text", (at, msg, color, size) => nativeHost.text(at, msg, color, size)),
      notice: nativeHost.combatEventCallback("notice", (msg, color, size, channel) => nativeHost.notice(msg, color, size, channel)), // world news → THE NOTICE FEED
      bumpLedger: nativeHost.combatEventCallback("bumpLedger", (key, by) => bumpLedger(nativeHost.ledger, key, by)),
      bumpAccountLedger: nativeHost.combatEventCallback("bumpAccountLedger", (key, by = 1, flush = false) => {
        const cur = nativeHost.account.ledger[key] ?? 0;
        if (!nativeHost.metaProgressionActive()) return cur;
        nativeHost.account.ledger[key] = cur + by;
        if (flush) nativeHost.accountDirty = true;
        return cur + by;
      }),
      flash: nativeHost.combatEventCallback("flash", (at, radius, color, life = 0.3) =>
        nativeHost.flashes.push({ pos: vec(at.x, at.y), radius, color, life, maxLife: life })),
      spawnHostileAt: nativeHost.combatEventCallback("spawnHostileAt", (defId, level, at) => {
        const m = nativeHost.createMonster(defId, level, 'enemy');
        m.pos = nativeHost.clampPos(vec(at.x, at.y), m.radius);
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
        return m;
      }),
      // The creep payoff pair: cleanse reads the standing field (nothing to
      // purge where none lives — never build one to empty it); growCreepAt
      // ENSURES the field (growing skin anywhere is the verb's whole point).
      cleanseCreepAt: nativeHost.combatEventCallback("cleanseCreepAt", (at, r, kind) => nativeHost.creep?.cleanseAt(at.x, at.y, r, kind) ?? 0),
      growCreepAt: nativeHost.combatEventCallback("growCreepAt", (at, kindId, r, opts) => {
        const def = CREEPS[kindId];
        return def ? (nativeHost.creepEnsure()?.growCreepAt(def, at.x, at.y, r, opts) ?? 0) : 0;
      }),
      simView: nativeHost.combatEventCallback("simView", () => nativeHost.simView()),
    });
  }

export function sceneKill(nativeHost: NativeSceneCombatHost, actor: Actor, silent = false, killer?: Actor, departure?: 'expire'): void {
    if (actor.dead) return;
    // A DOWNED co-op seat is already out of the fight — stray AoE/DoT must not
    // re-enter the death path (which would fire onPlayerDown twice).
    if (actor.downed) return;
    if (!silent) for (const cue of takeWeakPointBreaks(actor))
      nativeHost.flashes.push(anatomyFlash(actor.pos, actor.radius, actor.facing, cue));
    if (actor === nativeHost.player) nativeHost.combatDeeds.reset();
    // THE ANSWERING WALL BREAKS (guardBash beyond the stance, 2026-07-22):
    // a construct minted by a bash-carrying working answers when it DIES —
    // and a broken wall answers HARDEST: violent deaths pay the whole
    // stone (maxLife), quiet ends pay what still stood. Full circle: a
    // shattering pillar has no facing to honor.
    if (actor.construct && actor.summonInst) {
      const cBash = guardBashSpec(actor.summonInst);
      if (cBash) {
        nativeHost.guardBash(actor, actor.summonInst, { ...cBash, arcDeg: 360 },
          killer ? actor.maxLife() : Math.max(0, actor.life));
      }
    }
    // IMMORTAL fixtures (MonsterDef.immortal — the Training Dummy): show the
    // hit, then snap back to full instead of dying — no credit, no loot, no
    // death FX. A flag, not a def-id gate: any practice target opts in.
    if (actor.defId && MONSTERS[actor.defId]?.immortal) { actor.life = actor.maxLife(); return; }
    // A BREAKABLE door's guard-body: dying SPLINTERS its door. setDoorState
    // retires the actor itself (splice) + repaints the doorway — nothing else
    // in the death ladder (loot/XP/bursts) applies to a doorway.
    if (actor.doorId) { nativeHost.setDoorState(actor.doorId, 'broken'); return; }
    // THE POSSESSION SEAM's death law (engine/possess.ts): a dying BORROWED
    // body ejects its rider FIRST — the monster then dies as a monster
    // (killer credit intact; a body you merely wore never wipes the party).
    // A dying HUSK pulls its seat home FIRST — you die in your own flesh,
    // so the seat branch below runs the ordinary downed/permadeath seam
    // byte-honest.
    if (actor.possession) {
      const s = nativeHost.seats.find(x => x.id === actor.possession!.seatId);
      if (s && s.actor === actor) nativeHost.seatEject(s, 'bodyDied');
    } else if (actor.vacated) {
      const s = nativeHost.seats.find(x => x.id === actor.vacated!.seatId);
      if (s && s.actor !== actor) nativeHost.seatEject(s, 'huskDying');
    }
    // A TAMED COMPANION falls DOWNED, never dead (the Hunter's bond): the
    // body waits for a lingering ally or its keeper's whistle. Nothing in
    // the death ladder applies — no bounty, no rules, no corpse (it is not
    // a corpse). A deliberate release clears the flag first and dies plain.
    if (actor.companion && !silent) {
      actor.downed = true;
      actor.life = 0;
      actor.casting = null;
      actor.aiCommand = undefined;
      actor.companionReviveDwell = 0;
      nativeHost.companionBonds.down(actor);
      nativeHost.showCompanionCue(actor, 'down', actor.owner);
      return;
    }
    // A COMPOSITE MONSTER'S PART: its death is a BREAK on the root (damage
    // chunk, torn-guard mods, disarmed skills) — never the loot/XP ladder.
    if (actor.partLink) { nativeHost.onPartBroken(actor, killer); return; }
    // A dying ROOT takes its remaining parts with it — quietly (no bursts,
    // no break effects; the beast is already down).
    if (actor.partActors?.length) {
      for (const part of actor.partActors) {
        if (part.dead) continue;
        part.dead = true;
        part.partLink = undefined;
        nativeHost.flashes.push({
        fx: deathVoiceOf(part.material ?? actor.material), // THE DEATH VOICE — the part dies as its own material
        pos: vec(part.pos.x, part.pos.y), radius: part.radius * 1.3,
          color: part.color, life: 0.3, maxLife: 0.3,
        });
      }
      actor.partActors.length = 0;
    }
    // A garrisoned monster frees its tower slot as it falls (occupancy also
    // self-heals on evaluation — this is just the tidy fast path).
    if (actor.garrison) nativeHost.releaseGarrison(actor);
    // A SEGMENTED body dies along its WHOLE length — one flash per coil,
    // tail-ward, so a colossus reads as collapsing rather than vanishing.
    // Presentation only: the kill (credit, loot, xp) is the one death above.
    if (actor.worm?.hittable && !silent) {
      for (let i = 0; i < actor.worm.segments.length; i++) {
        const s = actor.worm.segments[i];
        nativeHost.flashes.push({
        fx: deathVoiceOf(actor.material), // THE DEATH VOICE along every coil
        pos: vec(s.x, s.y), radius: segR(actor, i) + 6,
          color: actor.color, life: 0.25 + i * 0.045, maxLife: 0.25 + i * 0.045,
        });
      }
    }
    // BREAKABLE-OBJECT DEATH BURSTS: an unstable construct detonates
    // HOWEVER it ends — broken by its owner, shattered by the rite,
    // evicted by a recast, or simply expired. One rule, fired once.
    // damageScale re-rolls the host skill (statuses ride the ordinary
    // pipeline); fraction bursts typed damage off max life. Sibling
    // breakables are never victims — no free chain demolitions.
    {
      const cb = actor.construct?.deathBurst;
      if (cb && !actor.construct!.burstFired) {
        actor.construct!.burstFired = true;
        const owner = actor.owner ?? actor;
        const src = actor.summonInst;
        const radius = cb.radius * (src && !owner.dead
          ? owner.sheet.get('aoeRadius',
            skillContextTags(src.def, grantedTags(src)), instanceMods(src))
          : 1);
        nativeHost.flashes.push({
          pos: vec(actor.pos.x, actor.pos.y), radius,
          color: actor.color, life: 0.3, maxLife: 0.3,
        });
        if (cb.damageScale && src && !owner.dead) {
          for (const e of nativeHost.enemiesOf(owner)) {
            if (e === actor || (e.construct?.breakable && e.owner === owner)) continue;
            if (!sameStory(actor, e)) continue; // the corpse bursts on its own story (the sovereignty gate)
            if (dist(actor.pos, e.pos) - e.radius > radius) continue;
            nativeHost.resolveHit(owner, src, e, cb.damageScale, 1, undefined, true);
          }
        } else if (cb.fraction) {
          nativeHost.burstDamage(vec(actor.pos.x, actor.pos.y), radius,
            actor.maxLife() * cb.fraction, cb.damageType ?? 'physical',
            actor.color, actor.team);
        }
      }
    }
    const propagatingAfflictions = silent ? [] : actor.statuses.filter(s => s.propagates && s.dps > 0);
    // ARMED RUPTURES fire on DEATH as well as expiry (Doombrand's "whichever
    // comes first"; a Living Bomb pops with its host) — the keg never rots
    // in the corpse. Statuses are cleared as they blow so loops can't form.
    if (!silent) {
      for (let si = actor.statuses.length - 1; si >= 0; si--) {
        const s = actor.statuses[si];
        if (!s.rupture || s.rupture <= 0) continue;
        actor.statuses.splice(si, 1);
        // Sheet honesty even in death (the DOOM site's exact trio): a body
        // that survives its own kill() path — a revived seat, a re-fielded
        // persistent — must not keep the blown keg's modifier source.
        if (!actor.statuses.some(o => o.id === s.id)) actor.sheet.removeSource('status:' + s.id);
        if (!STATUS_DEFS[s.id]?.dischargeMatchingType) nativeHost.ruptureStatus(actor, s);
      }
    }
    // TREE OF LIFE: however the reservoir ends — expiry, the axe, a silent
    // cap eviction — it BURSTS: the banked violence pours out as healing
    // over the grove (× the planter's healPower via applyHeal).
    {
      const hb = actor.construct?.healBurst;
      if (hb && actor.summonInst) {
        actor.construct!.healBurst = undefined; // one burst only
        const amount = Math.min(hb.cap, actor.construct!.stored ?? 0) * hb.ratio;
        if (amount > 0) {
          const owner = actor.owner ?? actor;
          nativeHost.flashes.push({
            pos: vec(actor.pos.x, actor.pos.y), radius: hb.radius,
            color: '#7ec88a', life: 0.4, maxLife: 0.4,
          });
          for (const a of nativeHost.actors) {
            if (a.dead || a.team !== actor.team || a.construct || a.untargetable) continue;
            if (dist(actor.pos, a.pos) - a.radius > hb.radius) continue;
            nativeHost.applyHeal(owner, actor.summonInst, a, { amount });
          }
        }
      }
    }
    // Kill CREDIT: xp, kill count and loot only flow when the player's
    // side did the deed. Two warring factions thinning each other out pay
    // the watcher nothing — pick off the survivors instead.
    const settlementGuard = !!killer && !!MONSTERS[killer.defId ?? '']?.settlementGuard && !killer.owner;
    const credit = !killer || killer.team === 'player' && !settlementGuard;
    // THE SPEECH GRAMMAR's '{monster}' (engine/speechGrammar.ts): a credited
    // kill of a page-worthy kind is what the town's folk gossip about.
    if (credit && actor.team === 'enemy' && actor.defId && !actor.noBounty && bestiaryEligible(MONSTERS[actor.defId])) nativeHost.noteSlain(actor.defId);

    // THE CLUTCH's death seam (engine/clutch.ts): a fallen child restamps
    // its mother's live-litter tell; a fallen MOTHER's brood meets its
    // authored orphan fate. The seam sits HERE on purpose — past every
    // early return above (parts, doors, companions are never clutch
    // citizens), before the bounty ladder.
    nativeHost.clutchOnDeath(actor);

    // 'minionDeath' procs: the KEEPER's sheet answers a fallen summon — the
    // body is the target, so a birth or a burst seats where it fell.
    if (!silent && actor.isMinion() && actor.owner && !actor.owner.dead) {
      nativeHost.rollOwnProcs(actor.owner, 'minionDeath', { target: actor });
    }
    // DEATH RITES (minionDeathHeal): the flock closes over the wound — the
    // deceased's kin heal a share of its life (+ flat). Duration lapses
    // reach here only when the raging-spirits lever counts them as deaths.
    if (!silent && actor.isMinion() && actor.owner
      && (actor.deathHealPct > 0 || actor.deathHealFlat > 0)) {
      const amount = actor.maxLife() * actor.deathHealPct + actor.deathHealFlat;
      for (const m of nativeHost.actors) {
        if (m.dead || m === actor || m.owner !== actor.owner || m.construct) continue;
        const got = m.healBy(amount);
        if (got > 0.5) nativeHost.seatText(actor.owner, m.pos, '+' + Math.round(got), '#8ae0a8', 10); // THE WIRE'S EYES: the healer's seat
      }
      nativeHost.flashes.push({
        pos: vec(actor.pos.x, actor.pos.y), radius: 70,
        color: '#8ae0a8', life: 0.3, maxLife: 0.3,
      });
    }
    // Undying Loyalty: a slain minion's death effects fire (Martyrdom!),
    // then it claws back to unlife for a few seconds. Once.
    if (!silent && actor.isMinion() && actor.undyingTime > 0 && !actor.undyingSpent) {
      actor.undyingSpent = true;
      if (actor.explodeOnDeath > 0) {
        nativeHost.explodeActor(actor, actor.explodeOnDeath);
        actor.explodeOnDeath = 0; // the corpse only bursts once
      }
      actor.life = Math.max(1, actor.maxLife() * 0.25);
      actor.lifespan = actor.undyingTime;
      nativeHost.showRecoveryCue(actor, 'undying');
      return;
    }

    actor.dead = true;
    nativeHost.presenceMoment(actor, departure ?? (silent ? 'expire' : 'break'));
    nativeHost.guardArts.clear(actor);
    if (actor.owner) nativeHost.strikeReleaseBodies.get(actor.owner)?.delete(actor);
    nativeHost.satellites.retire(actor);
    nativeHost.auroras.retire(actor);
    nativeHost.guardians.retire(actor);
    nativeHost.creepers.retire(actor);
    if (!silent) magicPackDeath(actor, nativeHost.actors);
    if (actor.magicPack) nativeHost.refreshMagicPacks();
    if (!silent && actor.summonInst?.def.hivecall) nativeHost.hivecallDeath(actor);
    if (!silent && actor.owner && actor.summonInst?.def.throng) nativeHost.throngKeepMinimum(actor.owner, actor.summonInst);
    if (!silent && nativeHost.deedEnemy(actor) && killer && killer !== nativeHost.player && nativeHost.deedOwned(killer)) {
      nativeHost.recordDeed({ kind: 'kill', flags: ['companion'] });
    }
    if (actor.summonShell) actor.owner?.summonShells?.delete(actor);
    SIM_TAP.current?.onDeath?.(actor, killer);
    // A dying bearer's auras vanish (and release their reservations).
    for (const id of [...actor.activeAuras.keys()]) nativeHost.deactivateAura(actor, id);
    // SQUAD & MORALE REACTIONS: a fallen LEADER scatters or enrages its band;
    // any death panics morale-brittle allies who watched it happen.
    nativeHost.onSquadDeath(actor);
    // DEATH RATTLE (BrainDef.onDeath): the corpse authors its last beats —
    // vengeance summons, reward bursts, the arena's restoration.
    if (actor.brain || actor.summonDeathActions) {
      const rattle = [...(actor.brain ? normalizeBrain(actor.brain).onDeath ?? [] : []), ...(!silent ? actor.summonDeathActions ?? [] : [])];
      if (rattle.length) runAIActions(nativeHost, actor, rattle, null, { allowDead: true });
    }
    // ANY player seat (the local hero OR a co-op ally) routes through the
    // downed/run-end seam — not just the local one — so allies can be downed
    // and revived too. Single-player has one seat, so this is the old behavior.
    if (nativeHost.seatOf(actor)) {
      // The slayer-formation seed: whoever landed this blow is what the world
      // will remember if the wipe concludes (consumed by recordNemesisFall).
      nativeHost.lastPlayerKiller = killer ?? null;
      nativeHost.onPlayerDown(actor, killer);
      return;
    }
    // Death-spawn auras (e.g. Unholy Aura): enemies dying inside an aura
    // radius can rise as the bearer's minions.
    if (!silent) {
      for (const bearer of nativeHost.actors) {
        if (bearer.dead || bearer.team === actor.team) continue;
        for (const aura of bearer.activeAuras.values()) {
          const spawn = aura.spec.deathSpawn;
          if (!spawn || !chance(spawn.chance)) continue;
          if (!inAoe(bearer.pos, aura.radius, aura.shape, bearer.facing, actor.pos, actor.radius)) continue;
          const skillId = aura.inst.def.id;
          const existing = nativeHost.minionsOfSkill(bearer.owner ?? bearer, skillId);
          if (existing.length >= spawn.maxActive) continue;
          const owner = bearer.owner ?? bearer; // pylons credit their deployer
          const minion = nativeHost.createMonster(spawn.monsterId, owner.level, owner.team, owner);
          minion.sourceSkillId = skillId;
          // BORROWED UNLIFE: the risen binds to the mint's resolved keeper
          // (the deployer the credit already names), so a nested bearer's
          // dead rise and fall with the mind that holds it — the proc
          // minter's law, aura form. Seat and enemy/wild keepers stamp
          // undefined by conjurationLifeline's own gate.
          minion.lifelineId = nativeHost.conjurationLifeline(owner);
          if (spawn.duration) minion.lifespan = spawn.duration;
          minion.pos = nativeHost.clampPos(vec(actor.pos.x, actor.pos.y), minion.radius);
          { nativeHost.actors.push(minion); nativeHost.admitCombatBirth(minion); }
          nativeHost.emergeBody(minion, {}); // THE EMERGENCE GRAMMAR: the raised dead climb out of the ground they fell on
        }
      }
    }
    // DEATH BURST: an ENEMY's explosive death now COALESCES into a telegraphed spore/orb
    // (the player gets an escape window) instead of an instant pop. Player minions /
    // constructs keep the legacy INSTANT martyrdom (a telegraph would only help foes dodge).
    if (!silent && actor.team === 'enemy' && !actor.isMinion() && !actor.construct) {
      const cfg = nativeHost.resolveDeathBurst(actor);
      if (cfg) nativeHost.spawnDeathBurst(actor, cfg);
    } else if (!silent) {
      // Player minions / constructs keep INSTANT martyrdom (a telegraph would only help
      // foes dodge). Resolve from either source so a raised/revived deathBurst-only corpse
      // (e.g. a spectred volatile_zealot / fungal_puffball) still detonates, themed.
      const cfg = nativeHost.resolveDeathBurst(actor);
      if (cfg) nativeHost.explodeActor(actor, cfg.damageFrac, { type: cfg.damageType, color: cfg.color });
    }
    // A broken POD: the powder rule decides — Nitrocask hatches its blast,
    // Broodpod fizzles (silent cap-evictions never set anything off).
    if (!silent && actor.construct?.hatch?.onBreak === 'hatch') {
      nativeHost.hatchPod(actor);
    }
    // Slain persistent minions free their reservation and queue a respawn.
    if (!silent && actor.isMinion()) {
      nativeHost.releaseContract(actor, true);
    }
    // A dying OWNER's toggled contracts die with them: bodies dismissed,
    // queue purged, reservation freed (monster summoners included).
    if (actor.summonToggles.size) {
      for (const id of [...actor.summonToggles.keys()]) {
        nativeHost.dismissSummonToggle(actor, id);
      }
    }
    // THE DEADWAKE: every passing — a foe OR a risen ally — feeds the hidden Corpse
    // Accumulation counter (a heavier tick when the dead themselves fall), and
    // SLAYING an undead foe has a very low chance to BEGIN the counter (arm it). A
    // silent cap-eviction is no death the world mourns, so this rides !silent (and
    // matches when a corpse is actually left). No-ops until the package is in this
    // run AND armed (the overlay guards both).
    if (!silent) {
      const df = nativeHost.sim.deadwakeField;
      if (df) {
        const undead = isDeathAligned(actor.faction);
        df.accrue('death', undead);
        // The seed is SLAYING an undead FOE (not a raised ally's expiry) — so the
        // arm roll needs an enemy the player's side felled.
        if (undead && credit && actor.team === 'enemy') df.noteUndeadSlain();
      }
    }
    // PASSIVE CHARGE TAPS fed by DEATHS: 'enemyDeath' harvests souls for any
    // hostile-side watcher in range (no kill credit needed — the reliquary
    // doesn't care who swung), 'allyDeath' tolls for the dying minion's owner.
    if (!silent) {
      for (const a of nativeHost.actors) {
        if (a.dead || a.construct || a.team === actor.team) continue;
        nativeHost.tapCharges(a, 'enemyDeath', actor.pos);
      }
      if (actor.isMinion() && actor.owner && !actor.owner.dead) {
        nativeHost.tapCharges(actor.owner, 'allyDeath');
      }
    }
    // Contagion: propagating DoTs jump to the victim's nearby allies,
    // chaining across every further death.
    if (!silent) {
      for (const s of propagatingAfflictions) {
        let spread = 0;
        for (const e of nativeHost.actors) {
          if (e.dead || e === actor || e.team !== actor.team || e.untargetable) continue;
          if (dist(actor.pos, e.pos) > 170 || spread >= 6) continue;
          // Propagated afflictions retain their original applier and payload;
          // the new carrier must not steal kill credit, healing or brood ownership.
          const span = s.total ?? STATUS_DEFS[s.id]?.duration ?? 1;
          nativeHost.withCombatInheritedStatus(e, s, () => e.applyStatus(s.id, s.dps, span / (STATUS_DEFS[s.id]?.duration || 1), s.sourceName,
            { propagates: true, rupture: s.rupture, ruptureType: s.ruptureType,
              casterId: s.casterId, leech: s.leech, brood: s.brood, power: s.power }));
          spread++;
        }
        if (spread > 0) {
          nativeHost.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 170, color: '#78c878', life: 0.25, maxLife: 0.25 });
        }
      }
    }
    if (!silent && actor.team === 'enemy') {
      // THE CHARACTER'S QUESTS: on a hosted world a kill's lead is the killer's own.
      const leadHand = nativeHost.localSeat.keeper ? nativeHost.seatOfRoot(killer) : undefined;
      if (leadHand && !leadHand.keeper && !leadHand.merc) nativeHost.withQuestHand(leadHand, () => nativeHost.odyssey.killed(actor, credit));
      else nativeHost.odyssey.killed(actor, credit);
      // THE SPOILS STORY: everything minted below wears this body's story —
      // the helpers clamp on it and stamp it (spoilStory, restored at the
      // block's end), and the marks catch any literal push (stampSpoils):
      // the loot, the purse, the sack, the orbs, the kill rows' bounties.
      const spoilD0 = nativeHost.drops.length, spoilO0 = nativeHost.orbs.length;
      const prevSpoil = nativeHost.spoilStory;
      nativeHost.spoilStory = actor.tier;
      const prevActing = nativeHost.actingSeat; // THE ACTING SEAT: the news a credited kill mints reaches the killer's party
      if (credit) nativeHost.actingSeat = nativeHost.seatOfRoot(killer) ?? prevActing;
      nativeHost.withMassReward(actor.level, () => {
        if (credit) {
          nativeHost.kills++;
          nativeHost.noteSeatKill(killer); // THE ACTING SEAT: the killing seat keeps its own count (the reckoning's kills)
          // THE WORLD'S MEMORY: grudges accrue to the name; a manifested
          // nemesis meets its fate (cheat death or the grudge ends).
          nativeHost.noteNemesisKill(actor);
          // Kill-fed encounters: a foe slain inside an open breach extends it.
          if (nativeHost.encounters.length) nativeHost.feedEncounters(actor);
          // THE THRONG's onKill sources: credited kills may raise a husk at
          // the corpse (engine/throng.ts — conjured victims never feed it).
          nativeHost.throngOnKill(actor, killer);
          // CONJURED bodies (Actor.noBounty) pay nothing — no xp, no loot, no
          // elite spill, no orbs. The summoner is the prize; endlessly farming
          // its spawn is a closed door.
          if (!actor.noBounty) {
            nativeHost.grantXp(actor.xpValue, actor.pos, nativeHost.seatOfRoot(killer)); // THE NEAR LAW + THE KILLER'S DUE (keeperSeat lane)
            if (actor.xpValue > 0) nativeHost.text(actor.pos, `+${actor.xpValue} xp`, '#b8a0e0', 11, 'xp');
            nativeHost.rollDrops(actor);
            // Elites spill extra gems on top of the base roll (bias rides along).
            if (actor.rarity) {
              const bias = actor.defId ? MONSTERS[actor.defId]?.gemBias : undefined;
              // THE MEMORY LAW: the spill lands as Memories of THIS body — its
              // rolled tier rides the unit (the tier lean at the recall).
              for (let i = 0; i < RARITY_DEFS[actor.rarity].drops; i++) nativeHost.dropGemAt(actor.pos, bias, false, nativeHost.provenanceOf(actor));
            }
            // Breakables can spill something drinkable.
            const mdef = actor.defId ? MONSTERS[actor.defId] : undefined;
            if (mdef?.orbDrops && chance(mdef.orbDrops)) {
              nativeHost.shedOrb(chance(0.5) ? 'life' : 'mana', actor.pos);
            }
          }
        }
        // PER-KIND KILL BOUNTIES — the open registry (engine/killHandlers.ts).
        // Core rows (the warlord pair, the Crowned, the Eldritch cleanse)
        // self-seed there and package rows register from their def files;
        // worldKillRules holds the rows that close over this World's run-state
        // (realm contexts, the dive, the hunt, the built-boss site). Every
        // matching row runs; rows are independent by contract. Ledger keys
        // inside rows are cross-file contracts consumed by unlock predicates.
        const kctx = nativeHost.killCtx(actor, killer ?? null, credit);
        for (const r of killRules()) if (killRuleMatches(r, kctx)) r.run(kctx);
        for (const r of nativeHost.worldKillRules) if (killRuleMatches(r, kctx)) r.run(kctx);
        // THE MEAL (BrainDef.drives): a landed kill jumps the killer's wants —
        // the hunt sates the hunger that drove it.
        nativeHost.bumpDrives(killer ?? null, 'onKill');
        // THE PURSE PAYS IN FULL (essenceSpill.deathBurst): whatever the chase
        // didn't shake loose lands in one pile — trail + pile always sum the
        // fixed budget, regardless of who landed the kill or how.
        // (Sealed ground skips the whole burst — the packets would refuse at
        // dropEssenceAt anyway, and "the purse bursts!" must never announce
        // wealth that cannot land. THE SPOILS LAW stays honest at the float.)
        const spillDef = actor.defId ? MONSTERS[actor.defId]?.essenceSpill : undefined;
        if (spillDef && spillDef.deathBurst !== false && !nativeHost.spoilsSealed()) {
          const owed = spillBudget(spillDef) - actor.essenceSpilled;
          for (let k = 0; k < owed; k++) nativeHost.dropEssenceAt(actor.pos, rollSpillPacket(actor.level, spillDef));
          if (owed > 0) {
            actor.essenceSpilled += owed;
            }
        }
        // A dead looter's sack SPILLS in full — nothing it snatched is ever
        // lost; the chase always pays out (grief-proof by construction).
        if (actor.lootSack?.length) {
          for (const item of actor.lootSack) {
            nativeHost.drops.push({
              pos: vec(actor.pos.x + rand(-26, 26), actor.pos.y + rand(-26, 26)),
              item, bob: rand(0, Math.PI * 2),
            });
          }
          actor.lootSack = undefined;
        }
        // The ephemeral remnant of their passing — briefly usable (corpses
        // drop regardless of who did the killing; necromancy isn't picky —
        // but only the ORGANIC leave one: timber splinters, stone rubbles,
        // ghost-stuff dissipates. MATERIAL_NATURE decides; a def's own
        // `remains:` overrides either way (data/monsters.ts).
        const remDef = actor.defId ? MONSTERS[actor.defId] : undefined;
        if (actor.defId && (!remDef || defLeavesRemains(remDef))) {
          {
let nativeStorage: typeof nativeHost.corpses;
let nativeRecord: typeof nativeHost.corpses[number];
(nativeStorage = nativeHost.corpses).push(nativeRecord = {
            pos: vec(actor.pos.x, actor.pos.y),
            defId: actor.defId, level: actor.level,
            maxLife: actor.maxLife(), remaining: CORPSE_CFG.duration,
            tier: actor.tier, // THE SPOILS STORY: the body lies where it died
          });
nativeHost.issueCombatRecord("corpses", nativeStorage, nativeRecord, undefined, undefined);
}
          if (nativeHost.corpses.length > CORPSE_CFG.max) nativeHost.corpses.shift();
        }
        nativeHost.stampSpoils(spoilD0, spoilO0, actor.tier);
        // THE OWNER STAMP (card 27): the same marks, the credited seat (THE KILLER'S DUE's read).
        if (credit) nativeHost.ownSpoils(spoilD0, nativeHost.seatOfRoot(killer), actor.pos);
      });
      nativeHost.spoilStory = prevSpoil;
      nativeHost.actingSeat = prevActing;
    }
    // THE DEATH VOICE (engine/bodyVoices.ts): a body dies as what it is made
    // of — flesh spatters, bone flecks, crystal sparkles, the ethereal wisps
    // — never the one pale ring.
    nativeHost.flashes.push({
      pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 1.6,
      color: actor.color, life: 0.4, maxLife: 0.4, fx: deathVoiceOf(actor.material),
    });
  }

export function sceneOnPartBroken(nativeHost: NativeSceneCombatHost, part: Actor, killer?: Actor): void {
    part.dead = true;
    const link = part.partLink;
    part.partLink = undefined;
    if (!link || link.root.dead) return;
    const root = link.root;
    const pd = link.def;
    notePartScar(part, root, pd);
    root.partActors = root.partActors?.filter(p => p !== part);
    const scar = root.partScars.find(s => s.id === part.id);
    if (scar) nativeHost.flashes.push(anatomyFlash(part.pos, part.radius, root.facing, scar));
    nativeHost.shake = Math.max(nativeHost.shake, 5);
    if (pd.breakDamage) {
      root.life -= root.maxLife() * pd.breakDamage;
      if (root.life <= 0 && !root.dead) {
        nativeHost.kill(root, false, killer);
        return;
      }
    }
    if (pd.breakMods?.length) {
      root.sheet.setSource(`partBreak_${part.id}`, pd.breakMods);
    }
    if (pd.breakDisables?.length) {
      root.skills = root.skills.filter(s => !s || !pd.breakDisables!.includes(s.def.id));
      // Choreography mints its OWN instances (aiActionInsts), so the kit
      // filter alone can't silence a scripted beat — the break also writes
      // the ban set every scripted verb checks at mint. One break, silent
      // on every lane (the Iron Bell's cracked bell, Cragmaw's spent fist).
      root.aiSkillBans ??= new Set();
      for (const id of pd.breakDisables) root.aiSkillBans.add(id);
    }
  }

export function sceneTriggerAmbush(nativeHost: NativeSceneCombatHost, idx: number, mult: number,
    flat?: Partial<Record<DamageType, number>>): void {
    const am = nativeHost.pendingAmbushes[idx];
const nativeRecordScope = nativeHost.beginCombatRecord("pendingAmbushes", am);
try {
    nativeHost.pendingAmbushes.splice(idx, 1);
    const pts: Vec2[] = [];
    for (const id of am.arrowIds) {
      const arrow = nativeHost.actorById(id);
      if (arrow && !arrow.dead) {
        pts.push(vec(arrow.pos.x, arrow.pos.y));
        nativeHost.kill(arrow, true);
      }
    }
    if (pts.length < 2 || am.caster.dead) return;
    const tags = skillContextTags(am.inst.def, grantedTags(am.inst));
    const extra = instanceMods(am.inst);
    const count = Math.max(1, rollCount(
      am.inst.def.delivery.type === 'projectile' ? am.inst.def.delivery.count : 1,
      Math.round(am.caster.sheet.get('projectileCount', tags, extra))));
    for (let k = 0; k < count; k++) {
      nativeHost.spawnProjectile(am.caster, am.inst, vec(pts[0].x, pts[0].y),
        angleTo(pts[0], pts[1]), { mult, flat, patrol: pts });
    }
    nativeHost.flashes.push({
      pos: vec(pts[0].x, pts[0].y), radius: 26,
      color: am.inst.def.color, life: 0.3, maxLife: 0.3,
    });
  
} finally { nativeHost.endCombatRecord(nativeRecordScope); }
}

export function sceneRollTriggers(nativeHost: NativeSceneCombatHost, owner: Actor, kind: TriggerKind, ctx: {
    depth?: number; aim?: Vec2; sourceInst?: SkillInstance;
    /** highRoll events: where the raising hit's dice landed (0..1). */
    rollT?: number;
  } = {}): void {
    const skills = owner.skills;
    if (!skills?.length || owner.dead) return;
    const depth = ctx.depth ?? 0;
    if (depth >= TRIGGER_CFG.maxChainDepth) return;
    const start = ((owner.triggerRR.get(kind) ?? -1) + 1) % skills.length;
    for (let k = 0; k < skills.length; k++) {
      const idx = (start + k) % skills.length;
      const inst = skills[idx];
      if (!inst || inst === ctx.sourceInst) continue;
      const spec = instanceTrigger(inst);
      if (!spec || spec.on !== kind) continue;
      const st = (inst.state ??= {});
      if (!instanceTriggerArmed(inst)) continue;
      if (nativeHost.time < (st.trigReadyAt ?? 0)) continue;
      const tags = skillContextTags(inst, grantedTags(inst));
      const extra = instanceMods(inst);
      // damageTaken: this gem's bank must be full (filled at the hit site;
      // an unfired full bank keeps its place in the rotation for the next
      // event — sequential, one-at-a-time down the slots).
      if (kind === 'damageTaken') {
        const frac = Math.max(0.05, owner.sheet.get('triggerThreshold', tags, extra,
          spec.lifeFrac ?? TRIGGER_CFG.lifeFrac));
        if ((st.trigAccum ?? 0) < frac * owner.maxLife()) continue;
      }
      // statusApply: the POWER bank must be full (filled per matching
      // application by bankStatusTriggers — the filter matched at bank
      // time, so only the threshold is judged here).
      if (kind === 'statusApply') {
        const need = Math.max(1, owner.sheet.get('triggerPower', tags, extra, spec.power ?? 1));
        if ((st.trigAccum ?? 0) < need) continue;
      }
      // highRoll: the raising hit's dice must clear THIS gem's window
      // (spec rollTop, else the config default; highRollWindow widens).
      if (kind === 'highRoll'
        && !nativeHost.rollTopMet(owner, spec.rollTop ?? TRIGGER_CFG.rollTop, ctx.rollT, tags, extra)) continue;
      if (!nativeHost.triggerEligible(owner, inst)) continue;
      // SELECTED: the cursor advances here whatever the dice say.
      owner.triggerRR.set(kind, idx);
      const p = owner.sheet.get('triggerChance', tags, extra, spec.chance ?? 1);
      if (!spec.guaranteed && !chance(Math.min(TRIGGER_CFG.chanceCap, p))) return;
      st.trigReadyAt = nativeHost.time + (spec.icd ?? TRIGGER_CFG.icd[kind]);
      if (kind === 'damageTaken' || kind === 'statusApply') st.trigAccum = 0;
      st.trigDepth = depth + 1;
      const cost = owner.skillCost(inst);
      nativeHost.paySkillCost(owner, inst, { mana: cost.mana * TRIGGER_CFG.costMult, life: cost.life * TRIGGER_CFG.costMult });
      const aim = ctx.aim ?? owner.aimPos ?? vec(
        owner.pos.x + Math.cos(owner.facing) * 140,
        owner.pos.y + Math.sin(owner.facing) * 140);
      if (inst.def.useTime > instanceTriggerLimit(inst)) {
        // PERMIT path: the heavy spell answers as a REAL bar in
        // succession — rooted like any bar; castMove investments walk it.
        {
let nativeStorage: typeof owner;
let nativeRecord: NonNullable<typeof owner.casting>;
let nativeRecordInstance: Parameters<NativeSceneCombatHost["issueCombatRecord"]>[4];
(nativeStorage = owner).casting = nativeRecord = {
          inst: (nativeRecordInstance = inst), mode: 'cast', aim: vec(aim.x, aim.y),
          elapsed: 0, total: Math.max(0.2, owner.skillUseTime(inst)),
          held: false, baseMult: 1,
          paidCost: { mana: cost.mana * TRIGGER_CFG.costMult, life: cost.life * TRIGGER_CFG.costMult },
        };
nativeHost.issueCombatRecord("casting", nativeStorage, nativeRecord, nativeStorage, nativeRecordInstance);
}
      } else {
        nativeHost.executeSkill(owner, inst, vec(aim.x, aim.y), {
          paidCost: { mana: cost.mana * TRIGGER_CFG.costMult, life: cost.life * TRIGGER_CFG.costMult },
        });
      }
      return;
    }
  }

export function sceneBankStatusTriggers(nativeHost: NativeSceneCombatHost, owner: Actor, statusId: string, at?: Vec2, depth = 0, sourceInst?: SkillInstance): void {
    if (!owner.skills?.length || owner.dead) return;
    let any = false;
    for (const inst of owner.skills) {
      if (!inst) continue;
      const spec = instanceTrigger(inst);
      if (!spec || spec.on !== 'statusApply') continue;
      if (spec.status !== undefined) {
        const list = Array.isArray(spec.status) ? spec.status : [spec.status];
        if (!list.includes(statusId)) continue;
      }
      const st = (inst.state ??= {});
      if (!instanceTriggerArmed(inst)) continue;
      st.trigAccum = (st.trigAccum ?? 0) + 1;
      any = true;
    }
    if (any) nativeHost.rollTriggers(owner, 'statusApply', { aim: at, depth, sourceInst });
  }

export function sceneBankDamageTakenTriggers(nativeHost: NativeSceneCombatHost, owner: Actor, amount: number, from?: Actor): void {
    if (amount <= 0 || !owner.skills?.length) return;
    let any = false;
    for (const inst of owner.skills) {
      if (!inst) continue;
      const spec = instanceTrigger(inst);
      if (!spec || spec.on !== 'damageTaken') continue;
      const st = (inst.state ??= {});
      if (!instanceTriggerArmed(inst)) continue;
      st.trigAccum = (st.trigAccum ?? 0) + amount;
      any = true;
    }
    if (any) {
      nativeHost.rollTriggers(owner, 'damageTaken', {
        aim: from && !from.dead ? vec(from.pos.x, from.pos.y) : undefined,
      });
    }
  }

export function sceneExplodeProjectile(nativeHost: NativeSceneCombatHost, p: Projectile, exceptId?: number): void {
    const d = p.inst.def.delivery;
    if (d.type !== 'projectile' || !d.explode || p.dissolved) return;
    const tags = skillContextTags(p.inst.def);
    const extra = instanceMods(p.inst);
    const radius = d.explode.radius * p.caster.sheet.get('aoeRadius', tags, extra);
    const scale = d.explode.damageScale ?? 0.6;
    // THE SIGIL ON THE BURST (minter round 2): the impact wears the sigil
    // — square/triangle bursts oriented along the flight's bearing, the
    // same inheritance the swings and slams learned. Beat gems stay OFF
    // flights DELIBERATELY: cast speed and Unleash already pace that
    // cadence; the beats belong to ground and slams.
    const bSigil = Math.round(p.caster.sheet.get('aoeShape', tags, extra));
    const bShape = bSigil === 1 || bSigil === 2 ? bSigil : 0;
    for (const e of nativeHost.enemiesOf(p.caster)) {
      if (e.id === exceptId) continue; // the direct hit already landed
      if (e.tier !== (p.tier ?? 0)) continue; // the splash lands on the flight's story (the sovereignty gate)
      if (bShape
        ? !inAoe(p.pos, radius, bShape, p.dir, e.pos, e.radius)
        : dist(p.pos, e.pos) - e.radius > radius) continue;
      if (p.parryDamage) nativeHost.resolveParryDamage(p.caster, e, p.parryDamage, scale, p.pos);
      else nativeHost.resolveHit(p.caster, p.inst, e, scale * p.mult, 1, undefined, false, false, undefined, p.origin, p.tier);
    }
    nativeHost.flashes.push({
      pos: vec(p.pos.x, p.pos.y), radius, color: p.inst.def.color,
      life: 0.3, maxLife: 0.3,
      shape: bShape, facing: p.dir,
    });
  }

export function sceneRollSurfaceProcs(nativeHost: NativeSceneCombatHost, striker: Actor): void {
    for (const proc of PROC_LIST) {
      if (proc.trigger !== 'surface') continue;
      if (!nativeHost.procGates(striker, proc, null)) continue;
      const c = nativeHost.procChance(striker, proc, 0);
      if (c <= 0 || !chance(c)) continue;
      if (!nativeHost.procReady(striker, proc)) continue;
      nativeHost.executeProc(proc, striker, null, null, 0);
    }
  }

export function scenePopBrittle(nativeHost: NativeSceneCombatHost, d: Doodad, striker?: Actor | null, strikeAt?: Vec2 | null): void {
    if (d.gone) return;
    const invoke = nativeHost.massNativeBrittles.get(d);
    if (invoke) { invoke(context => nativeHost.popBrittleNative(d, striker, strikeAt, context)); return; }
    nativeHost.popBrittleNative(d, striker, strikeAt);
  }

export function scenePopBrittleNative(nativeHost: NativeSceneCombatHost, d: Doodad, striker?: Actor | null, strikeAt?: Vec2 | null,
    context?: MassNativeBrittlePopContext): void {
    if (d.gone) return;
    // A breaking resonant stone TOLLS as it goes (near/touch/dwell pops reach
    // here without passing strikeSurfaces; the cooldown dedupes hit-pops).
    const res = doodadRuleOf(d.kind).resonance;
    if (res) nativeHost.resonate(d, res);
    d.gone = true;
    nativeHost.dissolveCracks.delete(d); // a popped body's pre-crack ledger entry leaves with it
    const i = nativeHost.doodads.indexOf(d);
    if (i >= 0) nativeHost.doodads.splice(i, 1);
    // Bump the rev EXPLICITLY: a pop followed by a same-frame push can net the
    // SAME list length, and the spatial/veil indices key on (identity, length,
    // rev) — length alone would leave them stale for that window.
    nativeHost.markDoodadsChanged();
    // THE OCCURRENCE FABRIC's disturb stimulus: a breaking body is a noise
    // in the ground — armed 'disturb' triggers hear it next sweep
    // (occurrences.ts; the ring drains there). Gated so quiet zones pay nothing.
    if (nativeHost.occs.length || nativeHost.massRuntime?.hasOccurrences)
      nativeHost.occDisturbs.push({x:d.pos.x,y:d.pos.y,tier:d.tier??0});
    // SURFACE PROCS: the pop is a trigger of its own (procs.ts 'surface').
    // No skill instance exists at a pop, so the roll reads the striker's
    // SHEET alone (passives, affixes, sheet-granted proc stats) — a
    // skill-local gem grant can't reach here by design; the affix lane can.
    if (striker && !striker.dead) nativeHost.rollSurfaceProcs(striker);
    // A HOLLOW SEAM routes through the hollows fabric: the carve and the
    // reveal belong to the hollow record, not the brittle spec (openHollow
    // is idempotent — a passage's twin seam popping later is a no-op).
    if (d.hollow) nativeHost.openHollow(d.hollow, striker ?? null);
    // AN ANNEX FACE routes through the growing zone the same way: carve,
    // admission, furnish and persistence all belong to the annex record
    // (annexReveal is idempotent). Silent — the pop's own flash at the
    // WALL is the tell; the reveal pulse would fire in still-unseen space.
    if (d.annex) nativeHost.annexReveal(d.annex, { silent: true });
    const br = doodadRuleOf(d.kind).brittle;
    if (!br) return;
    const color = br.color ?? '#c8b89a';
    // POP DRESS (brittle.pop): reshape the break flash — the mirage kit
    // trades the pale blast for the heat-haze ring. Absent = the stock read.
    const fx = br.pop;
    // THE DISSOLUTION GRAMMAR's row (a dev override may force a motion): its
    // VOICE rides THIS flash — ONE accent channel; the haze ring keeps the
    // mirage kit's breath (a dissolve speaks no voice over it).
    const dissolveRow = nativeHost.dissolveOverride ?? dissolveFor(d.kind);
    nativeHost.flashes.push({
      pos: vec(d.pos.x, d.pos.y), radius: fx?.radius ?? d.radius * 2.2, color,
      life: fx?.life ?? 0.3, maxLife: fx?.life ?? 0.3,
      ...(fx?.haze ? { haze: fx.haze } : {}),
      ...(dissolveRow && dissolveRow.voice && !fx?.haze ? { fx: dissolveRow.voice } : {}),
    });
    if (br.text) nativeHost.text(vec(d.pos.x, d.pos.y - 14), br.text, color, 12);
    if (br.orbChance && chance(br.orbChance)) {
      const kind = chance(0.5) ? 'life' : 'mana';
      nativeHost.shedOrb(kind, d.pos, { tier: d.tier,
        ...(context ? { amount: orbAmount(ORB_DEFS[kind], context.sourceZone.level) } : {}) });
    }
    if (br.gemChance && chance(br.gemChance)) {
      const d0 = nativeHost.drops.length;
      nativeHost.dropGemAt(vec(d.pos.x, d.pos.y), undefined, false, undefined, undefined, undefined, context?.sourceZone);
      if (nativeHost.dropRuleOf) nativeHost.ownSpoils(d0, nativeHost.seatOfRoot(striker)); // THE OWNER STAMP (card 27): the breaker's
    }
    // THE REMAINS (the quiet reclass): the wreck leaves its own pile — the
    // crumble SHOWS and the dust STAYS. Pushed after the splice; the rev
    // bump below covers the same-frame length-net window.
    let remainsDoodad: Doodad | null = null; // the dissolution grammar adopts it as the debris
    if (br.remains) {
      remainsDoodad = {
        pos: vec(d.pos.x, d.pos.y), radius: Math.max(10, d.radius * 0.85),
        kind: br.remains, rot: rand(0, Math.PI * 2),
      };
      nativeHost.doodads.push(remainsDoodad);
      nativeHost.markDoodadsChanged();
    }
    const nativeSettlementGrid = nativeHost.nativeGridAt(d.pos);
    if (br.carve && nativeSettlementGrid) {
      // A wall face beside it? Carve INTO it — that's where the passage goes.
      const cs = nativeSettlementGrid.cell;
      let cx = d.pos.x, cy = d.pos.y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (!nativeSettlementGrid.isWalkable(d.pos.x + dx * cs, d.pos.y + dy * cs)) {
          cx = d.pos.x + dx * br.carve * 0.7;
          cy = d.pos.y + dy * br.carve * 0.7;
          break;
        }
      }
      nativeSettlementGrid.fillDisc(d.pos.x, d.pos.y, Math.max(24, d.radius + 8), 'ground');
      nativeSettlementGrid.fillDisc(cx, cy, br.carve, 'ground');
    }
    // A popped SPAN stops negating its chasm (the bridges index is the physics).
    const bi = nativeHost.bridges.indexOf(d);
    if (bi >= 0) nativeHost.bridges.splice(bi, 1);
    // COLLAPSE: whoever the span was holding takes the fall — unless something
    // else still holds them (another plank, real ground): clampPos with no
    // origin resolves to true footing, and an unmoved body was never falling.
    if (br.collapse) {
      const dmg = br.collapse.damage ?? {};
      for (const a of nativeHost.actors) {
        if (a.dead || a.passive || (d.tier ?? 0) !== a.tier) continue; // the wreck's own story (the sovereignty gate)
        if (dist(a.pos, d.pos) > d.radius + a.radius * 0.6) continue;
        const edge = nativeHost.clampPos(vec(a.pos.x, a.pos.y), a.radius);
        if (dist(edge, a.pos) < 0.5) continue;
        a.pos = edge;
        // The give-way is a PIT-FAMILY fall: the span's authored toll routes
        // through the same pitfall override walking off this rim reads
        // (pitPolicyFor — theme.pitfall → cave default → the span's own
        // edge-bite), so a bridge popping over a descend gorge drops its
        // riders one stratum instead of biting at a lip the zone re-defined.
        nativeHost.applyRecovery(a, nativeHost.pitPolicyFor({
          kind: 'fall', to: br.collapse.to ?? 'edge',
          damage: {
            amount: dmg.amount ?? 0, pctMaxLife: dmg.pctMaxLife ?? 0.12,
            type: (dmg.type ?? 'physical') as DamageSpec['type'], canKill: dmg.canKill ?? true,
          },
        },d.pos), edge);
      }
    }
    // FUME: the wreck exhales a lingering hazard cloud (gas pods, spore sacs).
    if (br.fume) nativeHost.mintHazardCloud(vec(d.pos.x, d.pos.y), br.fume);
    // WAKE: something was living in there (urn ambushes, hive husks). The
    // pool (array) form draws ONE face by weight per break — an ambush has
    // a single nature — then that row's own chance gates the clutch as
    // ever. Single-row specs skip the draw: their rng stream is
    // byte-identical to the old read.
    const spawnRows = !br.spawn ? [] : Array.isArray(br.spawn) ? br.spawn : [br.spawn];
    let sp = spawnRows[0];
    if (spawnRows.length > 1) {
      let roll = rand(0, spawnRows.reduce((s, r) => s + (r.w ?? 1), 0));
      for (const r of spawnRows) { roll -= r.w ?? 1; if (roll <= 0) { sp = r; break; } }
    }
    if (sp && chance(sp.chance ?? 1)) {
      const [lo, hi] = sp.count ?? [1, 1];
      const n = lo + Math.floor(rand(0, hi - lo + 1));
      for (let i = 0; i < n; i++) {
        const level = Math.max(1, context?.sourceZone.level ?? nativeHost.zone.level);
        const factory = () => nativeHost.createMonster(sp.monster, level, 'enemy');
        const m = context ? context.createWake(sp.monster, level, factory) : factory();
        m.pos = nativeHost.clampPos(vec(d.pos.x + rand(-22, 22), d.pos.y + rand(-22, 22)), m.radius);
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
        context?.publishedBody(m);
        nativeHost.emergeBody(m, { host: true, ...(context ? { ground: emergeGroundFor(context.sourceZone.biome,
          nativeHost.groundAt(m.pos, m.tier)?.kind ?? nativeHost.walk?.regionAt?.(m.pos.x, m.pos.y)) } : {}) });
        // THE EMERGENCE GRAMMAR: the wake BURSTS OUT of the breaking host
      }
    }
    // THE SHALLOW GRAVE: the wreck spills BODIES, not the living — raisable
    // fuel for the corpse economy (the charnel kit's necromancer bait; a
    // ghoul's larder). Minted like Exhume's stand-ins, level-scaled.
    if (br.corpses && chance(br.corpses.chance ?? 1)) {
      const lvl = Math.max(1, nativeHost.zone.level);
      const [lo, hi] = br.corpses.count;
      const n = lo + Math.floor(rand(0, hi - lo + 1));
      for (let i = 0; i < n; i++) {
        if (nativeHost.corpses.length >= CORPSE_CFG.max) nativeHost.corpses.shift();
        {
let nativeStorage: typeof nativeHost.corpses;
let nativeRecord: typeof nativeHost.corpses[number];
(nativeStorage = nativeHost.corpses).push(nativeRecord = {
          pos: nativeHost.clampPos(vec(d.pos.x + rand(-18, 18), d.pos.y + rand(-18, 18)), 8),
          defId: br.corpses.monster, level: lvl,
          maxLife: CORPSE_CFG.mint.life + lvl * CORPSE_CFG.mint.lifePerLevel,
          remaining: CORPSE_CFG.duration,
          laidAt: nativeHost.time, from: vec(d.pos.x, d.pos.y), // M-SPILL: the body TUMBLES out of the host (no caption)
          tier: d.tier, // THE SPOILS STORY: the wreck's own story
        });
nativeHost.issueCombatRecord("corpses", nativeStorage, nativeRecord, undefined, undefined);
}
      }
    }
    // THE DISSOLUTION GRAMMAR — after every tested consequence above has
    // fired exactly as before (drawn == tested at the instant; the motion is
    // after-image): hand the body to the fragment engine. A row's REMAINS
    // is the debris lane's input (adopted, never a second pile).
    if (dissolveRow) {
      const before = nativeHost.doodads.length;
      const record = nativeHost.dissolveBreak(d, dissolveRow, strikeAt ?? null, remainsDoodad);
      // A capped motion may still publish its native evaporating debris.
      context?.dissolved(record?.debris ?? (nativeHost.doodads.length > before ? nativeHost.doodads[before] : null), record);
    }
  }

export function sceneDissolveBreak(nativeHost: NativeSceneCombatHost, body: { kind: DoodadKind; pos: Vec2; radius: number; rot?: number; dir?: number; tier?: number },
    spec: ResolvedDissolve, strikeAt: Vec2 | null, adopt?: Doodad | null): DissolveBreak | null {
    const seed = dissolveSeedOf(body.pos.x, body.pos.y, body.kind);
    // THE DEBRIS — present from the instant (drawn == tested: non-blocking
    // by rule, nothing waits). An adopted piece is tagged and handed to evap
    // per the spec; else the spec's kind is pushed.
    let debris: Doodad | null = adopt ?? null;
    if (!debris && spec.debris) {
      debris = {
        pos: vec(body.pos.x, body.pos.y),
        radius: Math.max(8, body.radius * spec.debrisRadius),
        kind: spec.debris as DoodadKind,
        rot: dissolveRollRange(seed, [0, Math.PI * 2], 71),
      };
      if (body.tier !== undefined) debris.tier = body.tier;
      normalizeDoodadBound(debris);
      nativeHost.doodads.push(debris);
    }
    if (debris) {
      debris.dissolveDebris = true;
      debris.laidAt = nativeHost.time;
      // THE DEBRIS FACE (D1): the row's look rides the piece — one litter
      // kind reads as what broke (the per-family husks, a charred keg).
      if (spec.debrisLook) debris.litterLook = spec.debrisLook;
      if (spec.fade && !debris.evap) {
        debris.evap = {
          t: dissolveRollRange(seed, spec.fade.after, 72),
          rate: spec.fade.rate ?? DISSOLVE_CFG.base.fade.rate,
        };
        nativeHost.evaporating.push(debris);
      }
      nativeHost.markDoodadsChanged(debris);
    }
    // THE CAP — past it no motion record (the debris above and the voice on
    // the pop's own flash still land).
    if (nativeHost.dissolves.length >= DISSOLVE_CFG.maxLive) return null;
    const rec: DissolveBreak = {
      kind: body.kind, pos: vec(body.pos.x, body.pos.y), radius: body.radius,
      rot: body.rot, dir: body.dir, tier: body.tier,
      seed, spec, strike: strikeAt ? vec(strikeAt.x, strikeAt.y) : vec(body.pos.x, body.pos.y),
      at: nativeHost.time, life: spec.life, maxLife: spec.life, debris,
    };
    nativeHost.dissolves.push(rec);
    return rec;
  }

export function sceneApplyRecovery(nativeHost: NativeSceneCombatHost, a: Actor, policy: RecoveryPolicy, pre: Vec2, forced = false): void {
    switch (policy.kind) {
      case 'block': return;
      case 'descend': {
        // THE PIT IS A DOOR (the pitfall fabric): the fall goes somewhere.
        nativeHost.routePitFall(a, policy, pre, forced);
        return;
      }
      case 'eject': {
        // Shove back the way it came (off the hazard) + optional damage.
        nativeHost.pushActor(a, angleTo(a.pos, pre), 140);
        if (policy.damage) nativeHost.applyEnvDamage(a, policy.damage);
        return;
      }
      case 'fall': {
        // 'edge': the actor is ALREADY confined to the chasm edge — just hurt them
        // (the "respawn on the edge + damage on respawn" mechanic). 'lastNode':
        // teleport back to safe ground first.
        if (policy.to === 'lastNode') nativeHost.teleportActor(a, vec(pre.x, pre.y), '#3a3a4e');
        nativeHost.text(a.pos, 'fell!', '#9a6a4a', 13);
        nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: 36, color: '#1a1014', life: 0.3, maxLife: 0.3 });
        if (policy.damage) nativeHost.applyEnvDamage(a, policy.damage);
        return;
      }
      case 'instakill': nativeHost.kill(a, false); return;
      case 'skyfall': {
        // THE EDGE IS A DOOR: stepping off standing cloud IS the fall — the
        // ONE consequence path the vertical fabrics share (player → the
        // proportional drop to the world below; ally seats snap; the sky
        // keeps the rest). The airborne and the floating never trigger it —
        // a dash sails the gap it entered (its landing answers to the
        // fields' teeter, not the boundary), wings ride the wind free.
        if (a.flying || nativeHost.levitating(a) || a.dash || a.leap || a.caromRun) return;
        if (a === nativeHost.player && (nativeHost.traversal || nativeHost.pendingRespawn)) return;
        nativeHost.routeSkyFalls([a]);
        return;
      }
      case 'teleport': {
        const to = policy.to === 'waypoint' && nativeHost.waypointPos ? nativeHost.waypointPos : pre;
        nativeHost.teleportActor(a, vec(to.x, to.y), '#6ac0f8');
        return;
      }
    }
  }

export function sceneApplyEnvDamage(nativeHost: NativeSceneCombatHost, a: Actor, d: DamageSpec): void {
    if (a.invulnerable) return;
    const amt = d.amount + (d.pctMaxLife ?? 0) * a.maxLife();
    if (amt <= 0) return;
    a.life -= amt;
    nativeHost.text(vec(a.pos.x, a.pos.y - 16), '-' + Math.round(amt), '#d86060', 13);
    if (a.life <= 0 && !a.dead) {
      if (d.canKill) nativeHost.kill(a, false); else a.life = 1;
    }
  }

