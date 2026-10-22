/** Exact original42 callback initializer and handler closure. */
import type {NativeSceneFrameHost} from "./nativeSceneFrameHost";
import { angleTo, chance, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { mod, type DamageType } from './stats';
import { STATUS_DEFS, type ActiveStatus } from './status';
import { Actor } from './actor';
import { mitigateTyped, resistValue } from './damage';
import { makeSkillInstance } from './skills';
import { SKILLS } from '../data/skills';
import { FACTIONS } from '../data/monsters';
import { doodadRuleOf, type Doodad, type DoodadEffect } from './levelgen';
import { sameStory } from './tiers';
import { CREEPS } from './creep';
import { type IncursionArchetype } from '../packages/overlays/incursion';
import { ORB_DEFS, ORB_CAP } from '../data/orbs';
export function eventCount(cfg: { perFire: number; intensityFloor: number; intensityGain: number }, intensity: number): number {
  return Math.max(1, Math.round(cfg.perFire * (cfg.intensityFloor + cfg.intensityGain * intensity)));
}
export function sceneEffectTentacleSwing(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));
    if (!victim) return;                 // only when a target is actually in reach
    if (!chance(eff.chance)) return;     // …and not even then, every time
    const taken = eff.power * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');
    victim.life -= taken;
    victim.hitFlash = 0.15;
    victim.hitFlashType = 'chaos';
    nativeHost.pushActor(victim, angleTo(d.pos, victim.pos), 60);
    nativeHost.text(victim.pos, Math.round(taken).toString(), '#7fce6a', 13);
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.8, color: '#7fce6a', life: 0.3, maxLife: 0.3 });
    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);
  }

export function sceneEffectCrystalBeam(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    if (!chance(eff.chance)) return;
    const len = eff.radius, halfW = eff.width ?? 16;
    // The beam's ELEMENT + tint are effect data ('gale_node' lances storm by
    // default; a future kind says element:'cold' with one field).
    const element = eff.element ?? 'lightning';
    const col = eff.color ?? '#9fd8ff';
    const dir = rand(0, Math.PI * 2);
    const ex = Math.cos(dir), ey = Math.sin(dir);
    // Beam visual (telegraph + strike in one — reuse facing for dir, radius for length).
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: len, color: col, life: 0.32, maxLife: 0.32, beam: true, facing: dir });
    const dmg = eff.power + nativeHost.zone.level * 1.2;
    for (const a of nativeHost.actors) {
      if (!nativeHost.isEffectTarget(a, eff, d)) continue;
      const rx = a.pos.x - d.pos.x, ry = a.pos.y - d.pos.y;
      const t = rx * ex + ry * ey;                 // distance along the ray
      if (t < 0 || t > len) continue;
      if (Math.abs(rx * ey - ry * ex) > halfW + a.radius) continue; // perpendicular band
      const taken = dmg * (1 - (resistValue(a, element) || 0)) * a.sheet.get('damageTaken');
      a.life -= taken;
      a.hitFlash = 0.15;
      a.hitFlashType = element;
      nativeHost.text(vec(a.pos.x, a.pos.y - 14), Math.round(taken).toString(), col, 12);
      if (a.life <= 0 && !a.dead) nativeHost.kill(a);
    }
  }

export function sceneEffectLavaOrb(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    if (!chance(eff.chance)) return;
    // The hurled skill is the EFFECT'S data (mintHazardCloud's pattern) — a
    // vent can lob anything registered; magma_glob is only the default.
    const skill = SKILLS[eff.skillId ?? 'magma_glob'];
    if (!skill) return;
    if (!nativeHost.hazardCaster) {
      const c = nativeHost.constructCombatSource(() => new Actor('Volcano', 'player', vec(0, 0)));
      c.untargetable = true; c.invulnerable = true;
      nativeHost.hazardCaster = c;
    }
    const caster = nativeHost.hazardCaster;
    caster.level = Math.max(1, nativeHost.zone.level);
    caster.pos = vec(d.pos.x, d.pos.y); // the vent is the source of the eruption
    const inst = makeSkillInstance(skill, 1 + Math.floor(nativeHost.zone.level / 3));
    const count = Math.max(1, eff.count ?? 1);
    const ring = eff.ringRadius ?? eff.radius; // distance from the vent the crown lands at
    const jitter = eff.jitter ?? 0;
    const blast = eff.blast ?? 86;
    const a0 = rand(0, Math.PI * 2); // the volley's orientation rotates each eruption
    for (let i = 0; i < count; i++) {
      const ang = a0 + (i / count) * Math.PI * 2;
      const rr = ring + (jitter ? rand(-jitter, jitter) : 0);
      const at = nativeHost.clampPos(vec(d.pos.x + Math.cos(ang) * rr, d.pos.y + Math.sin(ang) * rr), 12);
      {
let nativeStorage:typeof nativeHost.zones;
let nativeRecord:typeof nativeHost.zones[number];
let nativeRecordSource:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[3];
let nativeRecordInstance:Parameters<NativeSceneFrameHost["issueCombatRecord"]>[4];
(nativeStorage = nativeHost.zones).push(nativeRecord = { tier: caster.tier,
        pos: at, radius: blast, caster: (nativeRecordSource = caster), inst: (nativeRecordInstance = inst), color: eff.color ?? '#ff6a2a',
        delay: 0.9 + i * (eff.stagger ?? 0), exploded: false, linger: 0,
        tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,
        // THE SENTRY LAW (Zone.spareDormant): the vent's own ambience passes
        // dormant un-roused neutrals by — an ember vent chips + rouses
        // nobody's sleeper (the kilnhoard's Urnfather) — while AWAKE bodies
        // keep paying the field's toll (hitAll, the smoker economy).
        dmgMult: 1, depth: 1, hitAll: true, meteor: true, spareDormant: true,
      });
nativeHost.issueCombatRecord("zones", nativeStorage, nativeRecord, nativeRecordSource, nativeRecordInstance);
}
    }
  }

export function sceneEffectHeatWash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    // Spatial-grid candidates (a caldera attaches this effect to THOUSANDS
    // of discs — sweeping every actor per firing was the zone's biggest CPU
    // regression). The grid returns build-order candidates, so the per-actor
    // chance() rolls draw in exactly the order the full sweep drew them.
    // The wash's ELEMENT + tint are effect data ('fire' classic; a rime node
    // says element:'cold' — one field, same band physics).
    const element = eff.element ?? 'fire';
    const col = eff.color ?? '#ff8a3a';
    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.heatWashScratch)) {
      if (a.dead || a.flying || a.construct || a.invulnerable) continue;
      if (!sameStory(a, d)) continue; // the sovereignty gate: the pool's own story
      if (a.habitat?.kind === d.kind || a.immuneGround?.includes(d.kind)) continue;
      const dd = dist(a.pos, d.pos);
      if (dd <= d.radius || dd > d.radius + eff.radius) continue;
      if (!chance(eff.chance)) continue;
      const heat = eff.power * (1 + nativeHost.zone.level * 0.08)
        * (1 - (resistValue(a, element) || 0));
      if (heat <= 0) continue;
      a.life -= heat;
      a.hitFlash = 0.1;
      a.hitFlashType = element;
      nativeHost.flashes.push({
        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 6,
        color: col, life: 0.18, maxLife: 0.18,
      });
      if (a.life <= 0 && !a.dead) nativeHost.kill(a);
    }
  }

export function sceneEffectDescentTrap(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));
    if (!victim || !chance(eff.chance)) return;
    const taken = (eff.power + nativeHost.zone.level * 0.8) * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');
    victim.life -= taken;
    victim.hitFlash = 0.15;
    victim.hitFlashType = 'chaos';
    nativeHost.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#a06ad8', 12);
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.85, color: '#a06ad8', life: 0.3, maxLife: 0.3 });
    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);
  }

export function sceneEffectSporePuff(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    if (!chance(eff.chance)) return;
    nativeHost.mintHazardCloud(vec(d.pos.x, d.pos.y), { radius: eff.radius ?? 90, fx: eff.fx });
  }

export function sceneEffectGrowthLash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));
    if (!victim) return;
    if (!chance(eff.chance)) return;
    const taken = mitigateTyped(victim, { physical: eff.power });
    if (taken <= 0 || victim.invulnerable) return;
    victim.life -= taken;
    victim.hitFlash = 0.15;
    victim.hitFlashType = 'physical';
    nativeHost.text(victim.pos, Math.round(taken).toString(), '#6ac860', 12);
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: '#6ac860', life: 0.22, maxLife: 0.22 });
    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);
  }

export function sceneEffectThicketHeal(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const kin = nativeHost.nearestInReach(d.pos, eff.radius,
      x => nativeHost.isEffectTarget(x, eff, d) && x.life < x.maxLife());
    if (!kin) return;
    if (!chance(eff.chance)) return;
    // Rule-row effects are authored once for every level — fold the zone in
    // (the heat_wash idiom) so the mend keeps pace with the pools it fills.
    const amount = eff.power * (1 + nativeHost.zone.level * 0.08);
    const healed = Math.min(amount, kin.maxLife() - kin.life);
    if (healed <= 0) return;
    kin.life = Math.min(kin.life + amount, kin.maxLife());
    const col = eff.color ?? '#8ae0a8';
    nativeHost.text(kin.pos, '+' + Math.round(healed), col, 12);
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: col, life: 0.22, maxLife: 0.22 });
  }

export function sceneEffectStatusWash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const sid = eff.statusId;
    if (!sid) return;
    const sdef = STATUS_DEFS[sid];
    const want = eff.power > 0 ? eff.power : (sdef?.duration ?? 3);
    const col = eff.color ?? sdef?.color ?? '#dceafc';
    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.statusWashScratch)) {
      if (a.dead || a.construct || a.invulnerable) continue;
      if (!sameStory(a, d)) continue; // the sovereignty gate
      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;
      if (!chance(eff.chance)) continue;
      nativeHost.withCombatStatusSource(a, undefined, undefined, () => a.applyStatus(sid, 0, want / Math.max(0.01, sdef?.duration ?? want), d.kind));
      nativeHost.flashes.push({
        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 5,
        color: col, life: 0.16, maxLife: 0.16,
      });
    }
  }

export function sceneEffectMawReel(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));
    if (!victim || !chance(eff.chance)) return;
    const gap = dist(victim.pos, d.pos);
    const lip = d.radius + victim.radius + 6;
    if (gap > lip) {
      // The reel: a tongue-flick of impulse toward the pit, stronger the
      // closer the catch (the maw commits to a nearly-landed meal).
      const grip = 150 + 130 * Math.max(0, 1 - gap / eff.radius);
      nativeHost.pushActor(victim, angleTo(victim.pos, d.pos), grip);
      nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: Math.min(gap, eff.radius), color: '#b46a8a', life: 0.22, maxLife: 0.22, beam: true, facing: angleTo(d.pos, victim.pos) });
      return;
    }
    // The bite: physical, through resistance, at the lip only.
    const taken = (eff.power + nativeHost.zone.level * 0.9) * (1 - resistValue(victim, 'physical')) * victim.sheet.get('damageTaken');
    victim.life -= taken;
    victim.hitFlash = 0.15;
    victim.hitFlashType = 'physical';
    nativeHost.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#b46a8a', 13);
    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.3, color: '#b46a8a', life: 0.3, maxLife: 0.3 });
    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);
  }

export function sceneEffectOrbSpring(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {
    if (nativeHost.orbs.length >= ORB_CAP) return;
    let anyNear = false;
    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.orbSpringScratch)) {
      if (a.dead || a.construct) continue;
      if (!sameStory(a, d)) continue; // the sovereignty gate
      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;
      anyNear = true; break;
    }
    if (!anyNear || !chance(eff.chance)) return;
    const kind = eff.orbKind
      ?? ((nativeHost.orbSpringBreath = !nativeHost.orbSpringBreath) ? 'life' : 'mana');
    if (!ORB_DEFS[kind]) return;
    for (let i = 0; i < Math.max(1, Math.round(eff.power)); i++) {
      nativeHost.shedOrb(kind, vec(d.pos.x, d.pos.y), { scatter: Math.max(16, d.radius * 0.6), tier: d.tier });
    }
    nativeHost.flashes.push({
      pos: vec(d.pos.x, d.pos.y), radius: d.radius + 6,
      color: eff.color ?? ORB_DEFS[kind].color ?? '#bfe8f4', life: 0.3, maxLife: 0.3,
    });
  }

export function sceneEldritchCorruptMonsters(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {
    const cfg = a.eventConfig.corruption;
    if (cfg.perFire <= 0) return; // perFire 0 = this event is off
    const foes = nativeHost.actors.filter(x => !x.dead && x.team === 'enemy' && !x.passive && x.tag !== 'ritual_cultist');
    const fresh = foes.filter(x => !x.corrupted);
    if (!fresh.length) return;
    const budget = Math.floor(foes.length * cfg.maxFraction) - (foes.length - fresh.length);
    if (budget <= 0) return;
    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));
    // Pick WITHOUT replacement (partial Fisher–Yates) so a fire corrupts n DISTINCT foes.
    for (let k = 0; k < n; k++) {
      const j = randInt(k, fresh.length - 1);
      const f = fresh[j]; fresh[j] = fresh[k]; fresh[k] = f;
      nativeHost.corruptActor(f, a);
    }
  }

export function sceneEldritchTentacleField(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {
    const cfg = a.eventConfig.tentacleField;
    if (cfg.perFire <= 0) return; // perFire 0 = this event is off
    const n = eventCount(cfg, intensity);
    const blight = CREEPS['blightgrowth'];
    for (let k = 0; k < n; k++) {
      const at = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom), cfg.radius);
      nativeHost.addTempGround(at, 'tentacle_field', cfg.radius, cfg.duration);
      if (blight) nativeHost.creepEnsure()?.addSource(blight, at.x, at.y, { bornFrac: 0 });
      nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: cfg.radius, color: '#2a5a32', life: 0.5, maxLife: 0.5 });
    }
  }

export function sceneEldritchMutateDoodads(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {
    const cfg = a.eventConfig.doodadMutation;
    if (cfg.perFire <= 0) return;
    const all = nativeHost.doodads.filter(d => doodadRuleOf(d.kind).mutable);
    const fresh = all.filter(d => d.adorn !== 'tentacles');
    if (!fresh.length) return;
    const budget = Math.floor(all.length * cfg.maxFraction) - (all.length - fresh.length);
    if (budget <= 0) return;
    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));
    for (let k = 0; k < n; k++) {
      const j = randInt(k, fresh.length - 1);
      const d = fresh[j]; fresh[j] = fresh[k]; fresh[k] = d;
      d.adorn = 'tentacles';
      if (chance(cfg.swingChance)) {
        const sw = cfg.swing;
        d.effect = {
          id: 'tentacle_swing', faction: a.factions[0],
          interval: sw.interval, cd: rand(0, sw.interval), radius: sw.radius,
          chance: sw.chance, power: sw.power + nativeHost.zone.level * sw.powerPerLevel,
        };
      }
      nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.6, color: '#7fce6a', life: 0.4, maxLife: 0.4 });
    }
  }

export function sceneEldritchSpawn(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {
    const cfg = a.eventConfig.spawn;
    if (cfg.perFire <= 0) return;
    const fac = a.factions[0];
    const roster = FACTIONS[fac];
    if (!roster?.table?.length) return;
    const live = nativeHost.actors.filter(x => !x.dead && x.tag === 'eldritch_spawn' && x.faction === fac).length;
    const room = cfg.maxAlive - live;
    if (room <= 0) return;
    const n = Math.min(room, eventCount(cfg, intensity));
    for (let k = 0; k < n; k++) {
      const lvl = Math.max(1, nativeHost.zone.level);
      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');
      m.faction = fac;
      m.tag = 'eldritch_spawn';
      m.pos = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom), m.radius);
      { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
      nativeHost.flashes.push({ pos: vec(m.pos.x, m.pos.y), radius: 52, color: '#7fce6a', life: 0.5, maxLife: 0.5 });
    }
  }

export function sceneNearestInReach(nativeHost:NativeSceneFrameHost, pos: Vec2, radius: number, accept: (a: Actor) => boolean): Actor | null {
    // SOVEREIGNTY: seat — a helper — its callers gate through isEffectTarget (the derived census, probe_tiers RIG T).
    let best: Actor | null = null, bd = Infinity;
    for (const x of nativeHost.actors) {
      if (!accept(x)) continue;
      const dd = dist(x.pos, pos) - x.radius;
      if (dd > radius) continue;
      if (dd < bd) { bd = dd; best = x; }
    }
    return best;
  }

export function sceneIsEffectTarget(nativeHost:NativeSceneFrameHost, x: Actor, eff: DoodadEffect, d: Doodad): boolean {
    if (x.dead || x.downed || x.passive || x.construct) return false;
    if (!sameStory(x, d)) return false; // the sovereignty gate: a fixture reaches its own story
    if (eff.target === 'owner') {
      const owner = nativeHost.actors.find(a => a.id === eff.ownerId && !a.dead);
      if (!owner) return false;
      return owner.team === 'player'
        ? x.team === 'enemy'
        : x.team === 'player' && x.kind !== 'minion' && x.kind !== 'mercenary';
    }
    if (eff.target === 'ally') return !!eff.faction && x.faction === eff.faction;
    // Opponents: the hero(es) — but NOT the player's own minions/mercs (match the
    // hitAll convention) — and enemies not of the effect's OWN faction. A faction-
    // LESS hazard (crystal beam, lava) has eff.faction undefined → it hits ALL enemies.
    if (x.team === 'player') return x.kind !== 'minion' && x.kind !== 'mercenary';
    return x.team === 'enemy' && (eff.faction === undefined || x.faction !== eff.faction);
  }

export function sceneCorruptActor(nativeHost:NativeSceneFrameHost, f: Actor, a: IncursionArchetype): void {
    const cfg = a.eventConfig.corruption;
    f.corrupted = true;
    f.adorn = 'tentacles';
    f.sheet.setSource('eldritch_corruption', [mod('damage', 'more', cfg.dmgMore), mod('life', 'more', cfg.lifeMore)]);
    if (cfg.grantSkill && SKILLS[cfg.grantSkill]) {
      f.skills.push(makeSkillInstance(SKILLS[cfg.grantSkill], 1 + Math.floor((f.level - 1) / 4)));
    }
    nativeHost.flashes.push({ pos: vec(f.pos.x, f.pos.y), radius: f.radius * 2.2, color: '#7fce6a', life: 0.4, maxLife: 0.4 });
  }

export function createNativeFrameCollectDeedDot(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost["collectDeedDot"] {
 return (status: ActiveStatus, amount: number, type: DamageType | 'untyped'): void => {
    const source = status.casterId === undefined ? undefined : nativeHost.actorById(status.casterId);
    if (!source || !nativeHost.deedOwned(source)) return;
    nativeHost.deedDotAmounts ??= {};
    nativeHost.deedDotAmounts[type] = (nativeHost.deedDotAmounts[type] ?? 0) + amount;
  };
}

export function createNativeFrameDoodadEffects(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost["doodadEffects"] {
 return {
    tentacle_swing: (d, eff) => nativeHost.effectTentacleSwing(d, eff),
    crystal_beam: (d, eff) => nativeHost.effectCrystalBeam(d, eff),
    lava_orb: (d, eff) => nativeHost.effectLavaOrb(d, eff),
    heat_wash: (d, eff) => nativeHost.effectHeatWash(d, eff),
    descent_trap: (d, eff) => nativeHost.effectDescentTrap(d, eff),
    spore_puff: (d, eff) => nativeHost.effectSporePuff(d, eff),
    growth_lash: (d, eff) => nativeHost.effectGrowthLash(d, eff),
    thicket_heal: (d, eff) => nativeHost.effectThicketHeal(d, eff),
    status_wash: (d, eff) => nativeHost.effectStatusWash(d, eff),
    maw_reel: (d, eff) => nativeHost.effectMawReel(d, eff),
    orb_spring: (d, eff) => nativeHost.effectOrbSpring(d, eff),
  };
}

export function createNativeFrameIncursionEvents(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost["incursionEvents"] {
 return {
    monster_corruption: (i, a) => nativeHost.eldritchCorruptMonsters(i, a),
    tentacle_field: (i, a) => nativeHost.eldritchTentacleField(i, a),
    doodad_mutation: (i, a) => nativeHost.eldritchMutateDoodads(i, a),
    eldritch_spawn: (i, a) => nativeHost.eldritchSpawn(i, a),
  };
}

