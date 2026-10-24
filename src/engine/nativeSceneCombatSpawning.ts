/** Exact native combat spawning algorithms from Git 42f95716294995cbdd83785f0a0782ddda971f76.
 * Extraction is not an admitted runtime: all capabilities must be bound by the actual area aggregate. */
import { summonReservationUnit } from './companionGrants';
import { summonCapacity } from './summonContracts';
import { minionAreaAvoidanceOf } from './minionInheritance';
import { throngEvolution } from './throngEvolution';
import { companionBondOf } from './companionSpec';
import { summonKitIds } from './skills';
import { angleTo, chance, clamp, dist, pick, rand, randInt, vec, type Vec2 } from '../core/math';
import { mod, type Modifier } from './stats';
import { STATUS_DEFS } from './status';
import { Actor } from './actor';
import { HIVECALL, hivecallNode, hivecallState, hivecallRescueFactor, hivecallFormDamage } from './hivecall';
import { DEFENSE_CFG } from './defense';
import { issueCommand } from './ai';
import { type CommandState } from './brain';
import { effectiveSkillLevel, hostSockets, instanceChargeCost, instanceDelivery, instanceInnateMods, instanceMods, instanceTameMod, makeSkillInstance, socketSpec, CONSTRUCT_KIND_AIMS, ECHO_STRIKE_LIFE_MAX, TAME_CFG, type EchoRiderSpec, skillContextTags, type ConstructDelivery, type SkillEffect, type SkillInstance, type SummonDelivery } from './skills';
import { birthCount, CLUTCH_CFG, ORPHAN_FRENZY, type BirthEffect } from './clutch';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { killRuleMatches, killRules } from './killHandlers';
import { CONSTRUCT_LOOKS } from '../data/looks';
import { sameStory } from './tiers';
import { batchScaleOf, THRONG_CFG, throngMarkerOf } from './throng';
import { substituteThrongKind } from './fieldgrants';
import { type LiteKind } from './lite';
import { type EjectReason } from './possess';
import { clearEncounterGroup } from './encounterGroups';
import { isDeathAligned } from '../world/traits';
import type { Corpse } from "./world";
import type { NativeSceneCombatHost } from "./nativeSceneCombatHost";

export function sceneMinionsOf(nativeHost: NativeSceneCombatHost, owner: Actor, monsterId?: string): Actor[] {
    return nativeHost.actors.filter(a =>
      a.owner === owner && !a.dead && (!monsterId || a.defId === monsterId));
  }

export function sceneMinionsOfGroup(nativeHost: NativeSceneCombatHost, owner: Actor, group: string): Actor[] {
    return nativeHost.actors.filter(a =>
      a.owner === owner && !a.dead && !a.summonInst?.companionGrant && a.sourcePoolGroup === group);
  }

export function sceneRemoveCorpse(nativeHost: NativeSceneCombatHost, c: Corpse): void {
    const i = nativeHost.corpses.indexOf(c);
    if (i !== -1) nativeHost.corpses.splice(i, 1);
    // THE DEADWAKE: a CONSUMED corpse (raise-spectre / revive) feeds the tide — a
    // heavier tick when an undead corpse is the one devoured. No-op until armed.
    nativeHost.sim.deadwakeField?.accrue('corpse', isDeathAligned(MONSTERS[c.defId]?.faction));
  }

export function sceneCompanionsOfSkill(nativeHost: NativeSceneCombatHost, keeper: Actor, skillId: string): Actor[] {
    return nativeHost.actors.filter(a => a.companion && !a.dead
      && a.owner === keeper && a.sourceSkillId === '__companion:' + skillId);
  }

export function sceneCompanionBondsOfSkill(nativeHost: NativeSceneCombatHost, keeper: Actor, skillId: string): number {
    const groups = new Set<string>();
    for (const a of nativeHost.companionsOfSkill(keeper, skillId)) {
      groups.add(a.bondGroup ?? String(a.id));
    }
    return groups.size;
  }

export function sceneMinionServes(nativeHost: NativeSceneCombatHost, m: Actor, skillId: string): boolean {
    return m.sourceSkillId === skillId
      || m.sourceSkillId === '__companion:' + skillId
      || m.sourceSkillId === throngMarkerOf(skillId);
  }

export function sceneTryTame(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, target: Actor,
    fx: Extract<SkillEffect, { type: 'tame' }>): void {
    const def = inst.def;
    const mdef = target.defId ? MONSTERS[target.defId] : undefined;
    // Socketed CLAIM grafts (tameMod): every term below reads the authored
    // effect PLUS the summed adjustments — the gem reshapes the bond's terms.
    const tm = instanceTameMod(inst);
    const companionClaim = companionBondOf(inst);
    if (nativeHost.companionBondsOfSkill(caster, def.id) >= nativeHost.companionCapOf(inst)) {
      nativeHost.showCompanionCue(target, 'reject', caster, def.companionCue);
      return;
    }
    if (!mdef || target.owner || target.companion || target.team === caster.team || !sameStory(target, caster)
      || (mdef.boss && companionClaim.bossSure === undefined)
      || (!mdef.boss && target.rarity && target.rarity !== 'normal' && !(fx.allowRares || tm.allowRares || companionClaim.rareSure !== undefined))
      // Belt to targeting's taxonomy gate — future callers may not route
      // through resolveTargeting.
      || !(mdef.tags ?? []).some(tg => fx.tags.includes(tg))) {
      nativeHost.showCompanionCue(target, 'reject', caster, def.companionCue);
      return;
    }
    // THE CLAIM ROLL: weakened to `sureBelow` the bond is CERTAIN; above it
    // the beast's own will contests — the chance climbs linearly from
    // wildChance (full life; the sneak-tame lever) to certainty at the
    // threshold. A shrug costs the whole focused cast and the cooldown —
    // that clock IS the retry economy. wildChance 0/absent restores the
    // old hard weaken-it-first gate.
    const frac = target.life / Math.max(1, target.maxLife());
    const sureBase = mdef.boss ? companionClaim.bossSure
      : target.rarity && target.rarity !== 'normal' ? companionClaim.rareSure ?? fx.sureBelow ?? fx.maxLifeFrac
      : companionClaim.normalSure ?? fx.sureBelow ?? fx.maxLifeFrac;
    const sure = sureBase === undefined ? undefined
      : clamp(sureBase + tm.sureBelowAdd, 0, 1);
    if (sure !== undefined && frac > sure) {
      const wild = mdef.boss ? 0 : clamp((fx.wildChance ?? 0) + tm.wildChanceAdd, 0, 1);
      if (wild <= 0) {
        nativeHost.showCompanionCue(target, 'reject', caster, def.companionCue);
        return;
      }
      const p = wild + (1 - wild)
        * Math.max(0, Math.min(1, (1 - frac) / Math.max(0.001, 1 - sure)));
      if (!chance(p)) {
        nativeHost.showCompanionCue(target, 'reject', caster, def.companionCue);
        return;
      }
    }
    // A successful claim defeats the encounter once, before the enemy's tags
    // and team are cleared. Boss/hunt/cull ledgers cannot be stranded by taming.
    // This intentionally omits death bursts, corpses and ordinary kill drops.
    const companionClaimCtx = nativeHost.killCtx(target, caster, caster.team === 'player');
    for (const r of killRules()) if (killRuleMatches(r, companionClaimCtx)) r.run(companionClaimCtx);
    for (const r of nativeHost.worldKillRules) if (killRuleMatches(r, companionClaimCtx)) r.run(companionClaimCtx);
    nativeHost.tameCompanion(caster, target, def.id);
  }

export function sceneTameCompanion(nativeHost: NativeSceneCombatHost, keeper: Actor, beast: Actor, skillId: string): void {
    beast.team = keeper.team;
    beast.owner = keeper;
    nativeHost.assignCombatBirthOwner(beast,keeper);
    beast.kind = 'companion';
    beast.companion = true;
    beast.sourceSkillId = '__companion:' + skillId;
    // Solo claims are their own bond unit; pack-style claims overwrite
    // with a shared key (companionBondsOfSkill counts DISTINCT groups).
    beast.bondGroup = String(beast.id);
    beast.noBounty = true;
    beast.lifelineId = undefined;      // a bond is not borrowed unlife
    // ONE FOLD for the keeper's investment: a body minted WITH an owner (the
    // starting hound, a restored bond) carries createMonster's untagged
    // 'owner' minion source — the bond's own 'companionBond' source
    // (resolveMinionInheritance via companionBonds.refreshBeast) reads
    // investment through the host/body context, so the mint-time copy
    // would count the keeper's passives twice on a loaded companion and
    // never on a wild claim. The bond's fold is the only fold.
    beast.sheet.removeSource('owner');
    beast.standingOrder = undefined;   // the bond stamps the stance's order
    beast.squadId = undefined; beast.squadLeader = undefined;
    clearEncounterGroup(beast);
    beast.tag = undefined;
    beast.aiCommand = undefined;
    beast.aiTargetId = undefined;
    beast.threat.clear();
    beast.aggroed = false;
    beast.aiFleeing = false;
    beast.life = beast.maxLife();
    nativeHost.companionBonds.adopt(beast);
    // THE KEPT MARK: runtime tack (TAME_CFG.claimParts — a collar by
    // default) stamps the claim visibly onto any body. Un-tame paths kill
    // or stash the body outright, so the mark never needs unstamping.
    if (TAME_CFG.claimParts.length) {
      const worn = beast.extraParts ?? [];
      beast.extraParts = [
        ...worn,
        ...TAME_CFG.claimParts.filter(p => !worn.some(w => w.kind === p.kind)),
      ];
    }
    nativeHost.showCompanionCue(beast, 'bind', keeper);
  }

export function sceneThrongRecruitCap(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance): number {
    const evo = throngEvolution(inst);
    return Math.max(evo.minimum ?? 0, evo.overflowCap ?? nativeHost.throngCapOf(keeper, inst));
  }

export function sceneThrongGain(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance, count: number): Actor[] {
    const result: Actor[] = [];
    const room = nativeHost.throngRecruitCap(keeper, inst) - nativeHost.throngRosterCount(keeper, inst);
    for (let i = 0; i < Math.min(count, room); i++) {
      const b = nativeHost.mintThrongBody(keeper, inst, keeper.pos, keeper.level);
      b.throngCarried = true;
      result.push(b);
    }
    if (result.length) nativeHost.charDirty = true;
    return result;
  }

export function sceneThrongKeepMinimum(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance): void {
    if (keeper.dead || keeper.downed || !keeper.skills.includes(inst)) return;
    const minimum = throngEvolution(inst).minimum ?? 0;
    if (minimum) nativeHost.throngGain(keeper, inst, minimum - nativeHost.throngRosterCount(keeper, inst));
  }

export function sceneHivecallRoster(nativeHost: NativeSceneCombatHost, hero: Actor, inst: SkillInstance): Actor[] {
    return nativeHost.minionsOfSkill(hero, inst.def.id).filter(a => !a.summonOffspring);
  }

export function sceneHivecallCap(nativeHost: NativeSceneCombatHost, hero: Actor, inst: SkillInstance): number {
    const d = instanceDelivery(inst);
    if (d.type !== 'summon') return 0;
    const raw = Math.max(1, Math.round(hero.sheet.get('minionMaxCount', skillContextTags(inst), instanceMods(inst), d.maxActive)));
    const contract = hero.summonToggles.get(inst.def.id);
    const unit = summonReservationUnit(hero, inst, d);
    return contract && unit > 0 ? Math.min(raw, Math.round(contract.reserved / unit)) : raw;
  }

export function sceneHivecallPayload(nativeHost: NativeSceneCombatHost, caster: Actor, host: SkillInstance, id: string): void {
    const payload = makeSkillInstance(SKILLS[id], effectiveSkillLevel(host));
    nativeHost.executeSkill(caster, payload, { ...caster.pos });
  }

export function sceneHivecallDeath(nativeHost: NativeSceneCombatHost, body: Actor): void {
    const hero = body.owner;
    const host = body.summonOffspring ? hero?.skills.find(s => s?.def.hivecall && s.def.id === body.sourceSkillId) : body.summonInst;
    if (!hero || hero.dead || !host || !hero.skills.includes(host)) return;
    if (hivecallNode(host, 'teeming_contract')) {
      for (const ally of nativeHost.minionsOfSkill(hero, host.def.id)) {
        ally.life = ally.maxLife();
        ally.hiveDeathPlies++;
        ally.plySpec ??= { count: 0 };
        ally.pliesMax++; ally.plies++;
      }
    }
    if (hivecallNode(host, 'overflowing_cells')) nativeHost.hivecallPayload(body, host, 'hive_death_pool');
    if (body.summonOffspring || !hivecallNode(host, 'royal_guard')) return;
    const st = hivecallState(host);
    const form = nativeHost.seats.find(s => s.home === hero)?.actor.hiveForm;
    if (form) {
      if (hivecallNode(host, 'regal_execution')) form.remaining = Math.min(HIVECALL.duration, form.remaining + HIVECALL.duration * HIVECALL.deathGain / HIVECALL.meterMax);
    } else st.meter = Math.min(HIVECALL.meterMax, st.meter + HIVECALL.deathGain);
  }

export function sceneHivecallTransform(nativeHost: NativeSceneCombatHost, hero: Actor, host: SkillInstance, automatic = false): boolean {
    const seat = nativeHost.seatOf(hero), st = hivecallState(host);
    if (!seat || seat.home || hero.dead || hero.downed || !hero.skills.includes(host)
      || !hivecallNode(host, 'royal_guard') || st.meter <= 0) return false;
    if (automatic ? st.meter <= 20 : nativeHost.time < (st.readyAt ?? 0)) return false;
    let factor = 1;
    if (automatic) {
      const streak = nativeHost.time < (st.rescueUntil ?? 0) ? st.rescueStreak ?? 0 : 0;
      factor = hivecallRescueFactor(streak);
      st.rescueStreak = streak + 1;
      st.rescueUntil = nativeHost.time + HIVECALL.rescueWindow;
    }
    const remaining = HIVECALL.duration * st.meter / HIVECALL.meterMax * factor;
    nativeHost.shapeshiftPress(hero, host, { form: 'hive_sovereign' });
    const form = seat.actor;
    if (form === hero) return false;
    st.meter = 0;
    form.tier = hero.tier;
    form.hiveForm = { hero, host, remaining, automatic, factor };
    nativeHost.syncHivecallFormDamage(form, host);
    form.sheet.setSource('hivecall:form', [mod('life', 'override', Math.max(1, hero.maxLife() * 1.5 * factor))]);
    form.fillResources();
    for (const skill of form.skills) if (skill && skill !== host) skill.level = effectiveSkillLevel(host);
    if (hivecallNode(host, 'royal_ferocity')) {
      form.sheet.setSource('hivecall:ferocity', [mod('damage', 'more', 0.3), mod('attackSpeed', 'more', 0.25), mod('castSpeed', 'more', 0.25)]);
      // Insert before the guest Hivecall slot so it remains the return action.
      form.skills.splice(form.skills.length - 1, 0, makeSkillInstance(SKILLS.hive_royal_cataclysm, effectiveSkillLevel(host)));
      if (form.possession) form.possession.guestSlot = form.skills.length - 1;
    }
    if (hivecallNode(host, 'crushing_mandibles')) {
      for (const skill of form.skills) if (skill && ['hive_venom_mandibles', 'hive_poison_spit'].includes(skill.def.id)) {
        skill.def = { ...skill.def, innateMods: [...(skill.def.innateMods ?? []), mod('damage', 'more', 1), mod('aoeRadius', 'increased', 0.5), mod('projectileCount', 'flat', 2)] };
      }
    }
    if (hivecallNode(host, 'barbed_regents')) nativeHost.hivecallPayload(form, host, 'hive_royal_nova');
    if (hivecallNode(host, 'regal_execution') && hero.summonToggles.has(host.def.id)) {
      const room = Math.max(0, nativeHost.hivecallCap(hero, host) - nativeHost.hivecallRoster(hero, host).length);
      for (let n = 0; n < Math.min(2, room); n++) nativeHost.spawnMinion(hero, host);
    }
    return true;
  }

export function sceneHivecallReturn(nativeHost: NativeSceneCombatHost, body: Actor, reason: EjectReason): void {
    const form = body.hiveForm;
    if (!form) return;
    const { hero, host, automatic, factor } = form, st = hivecallState(host);
    body.hiveForm = undefined;
    st.meter = 0;
    const cd = hivecallNode(host, 'barbed_regents') ? HIVECALL.novaCooldown : HIVECALL.cooldown;
    st.readyAt = nativeHost.time + cd;
    hero.cooldowns.set(host.def.id, cd);
    hero.cooldownTotals.set(host.def.id, cd);
    hero.cooldowns.set('enrage_swarm', cd);
    hero.cooldownTotals.set('enrage_swarm', cd);
    if (automatic && !hero.dead && reason !== 'travel') hero.life = Math.min(hero.maxLife(), hero.life + hero.maxLife() * 0.4 * factor);
    if ((reason === 'press' || reason === 'duration') && hivecallNode(host, 'barbed_regents')) nativeHost.hivecallPayload(hero, host, 'hive_royal_nova');
    hero.hivecallHud = { meter: st.meter, ready: cd };
  }

export function sceneSyncHivecallFormDamage(nativeHost: NativeSceneCombatHost, body: Actor, host: SkillInstance): void {
    const damage = hivecallFormDamage(host);
    if (body.sheet.getSourceMods('hivecall:tending')?.[0]?.value !== damage) {
      body.sheet.setSource('hivecall:tending', [mod('damage', 'increased', damage)]);
    }
  }

export function sceneHivecallMeta(nativeHost: NativeSceneCombatHost, caster: Actor, host: SkillInstance): boolean | undefined {
    if (!host.def.hivecall) return;
    if (caster.dead || caster.downed) return false;
    if (caster.hiveForm) {
      const seat = nativeHost.seatOf(caster);
      if (!seat) return false;
      nativeHost.seatEject(seat, 'press'); return true;
    }
    if (!caster.skills.includes(host)) return false;
    if (hivecallNode(host, 'royal_guard')) return nativeHost.hivecallTransform(caster, host);
    if (!hivecallNode(host, 'sacrificial_chitin')) return;
    const swarm = nativeHost.hivecallRoster(caster, host);
    const meta = nativeHost.mintMetaInstance(caster, host, 'enrage_swarm');
    const cost = meta.def.manaCost * caster.sheet.get('manaCost', skillContextTags(meta), instanceMods(meta));
    if (!swarm.length || caster.cooldowns.has('enrage_swarm') || caster.mana < cost) return false;
    caster.mana -= cost;
    const cd = 8 / Math.max(0.01, caster.sheet.get('cooldownRecovery', skillContextTags(meta), instanceMods(meta)));
    caster.cooldowns.set('enrage_swarm', cd); caster.cooldownTotals.set('enrage_swarm', cd);
    for (const body of swarm) {
      nativeHost.hivecallPayload(body, host, 'hive_detonation');
      nativeHost.kill(body, false, caster);
    }
    for (const body of swarm) nativeHost.spawnMinion(caster, host, { pos: { ...body.pos } });
    hivecallState(host).rebirthAt = undefined;
    return true;
  }

export function sceneThrongBodiesOf(nativeHost: NativeSceneCombatHost, keeper: Actor, skillId: string): Actor[] {
    const marker = throngMarkerOf(skillId);
    return nativeHost.actors.filter(a =>
      !a.dead && a.owner === keeper && a.sourceSkillId === marker);
  }

export function sceneThrongRosterCount(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance): number {
    const spec = inst.def.throng;
    let n = nativeHost.throngBodiesOf(keeper, inst.def.id).reduce((n, b) => n + (b.throngUnits ?? 1), 0);
    if (spec?.tier === 'lite') {
      const kindIdx = nativeHost.liteKindOf(spec.monsterId);
      if (kindIdx >= 0) n += nativeHost.lite.countOwned(keeper.id, kindIdx);
    }
    return n;
  }

export function sceneThrongCapOf(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance): number {
    const spec = inst.def.throng;
    if (!spec) return 0;
    return Math.max(1, Math.round(keeper.sheet.get(
      'minionMaxCount', skillContextTags(inst), instanceMods(inst), spec.cap)));
  }

export function sceneMintThrongFind(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance, pos: Vec2,
    opts?: { pocketKey?: string; ttl?: number; tier?: number }, rng: () => number = Math.random): Actor | null {
    const original = inst.def.throng!.monsterId;
    const eggs = throngEvolution(inst).eggs;
    if (eggs) {
      const enemy = [...nativeHost.enemiesOf(keeper)].filter(e => !e.dead && !e.passive && !e.untargetable
        && e.tier === keeper.tier && dist(e.pos, keeper.pos) < 360)
        .sort((a, b) => dist(a.pos, keeper.pos) - dist(b.pos, keeper.pos))[0];
      const egg = nativeHost.mintThrongHusk(original, enemy ? nativeHost.throngStandNear(enemy.pos, keeper.tier) : pos,
        { ...opts, affinity: original });
      if (egg) { egg.throngEgg = eggs; egg.radius = 12; }
      return egg;
    }
    const kind = substituteThrongKind(original, keeper, inst, rng,
      stat => keeper.sheet.get(stat, skillContextTags(inst), instanceMods(inst)));
    return nativeHost.mintThrongHusk(kind, pos, { ...opts, affinity: original });
  }

export function sceneMintThrongBody(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance, pos: Vec2, level: number, bodyKind?: string): Actor {
    const spec = inst.def.throng!;
    const body = nativeHost.createMonster(bodyKind ?? spec.monsterId, Math.max(1, level), keeper.team, keeper);
    body.noBounty = true;
    body.sourceSkillId = throngMarkerOf(inst.def.id);
    body.summonInst = inst;
    body.lifelineId = nativeHost.conjurationLifeline(keeper);
    // THE BATCH RULE: owner investment folds at 1/batch — five gathered
    // bodies wear one classic minion's worth of scaling (engine/throng.ts).
    nativeHost.bakeMinionOwnerStats(body, keeper, inst, batchScaleOf(spec));
    body.fillResources();
    body.tier = keeper.tier; // the keeper's story (the summon law's sibling)
    body.pos = nativeHost.clampPos(vec(pos.x, pos.y), body.radius, undefined, { mover: body });
    { nativeHost.actors.push(body); nativeHost.admitCombatBirth(body); }
    return body;
  }

export function sceneThrongYieldCount(nativeHost: NativeSceneCombatHost, keeper: Actor, inst: SkillInstance, base: number): number {
    return Math.max(1, Math.round(base * keeper.sheet.get(
      'throngYield', skillContextTags(inst), instanceMods(inst))));
  }

export function sceneThrongStandNear(nativeHost: NativeSceneCombatHost, at: Vec2, tier = 0): Vec2 {
    // The stand is judged on ITS story (the same-story law): the story's
    // view for walkability, the story's own solids. tier 0 = the old read.
    const walkAt = tier >= 1 && nativeHost.tierViews
      ? nativeHost.tierViews[Math.min(tier, nativeHost.tierViews.length - 1)] ?? nativeHost.walk
      : nativeHost.walk;
    for (let i = 0; i < 10; i++) {
      const ang = rand(0, Math.PI * 2);
      const d = rand(10, 42);
      const x = at.x + Math.cos(ang) * d, y = at.y + Math.sin(ang) * d;
      if (walkAt && !walkAt.isWalkable(x, y)) continue;
      if (nativeHost.pointInSolid(x, y, 8, tier)) continue;
      return vec(x, y);
    }
    return nativeHost.clampPos(vec(at.x, at.y), 8, undefined, tier >= 1 ? { tier } : undefined);
  }

export function sceneThrongDirect(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance, aim: Vec2, fx: { pin?: number; linger?: number },
  ): void {
    const spec = inst.def.throng;
    if (!spec) return;
    const evo = throngEvolution(inst);
    if (Object.keys(evo).length && spec.tier === 'lite') {
      const kindIdx = nativeHost.liteKindOf(spec.monsterId);
      if (kindIdx >= 0) nativeHost.litePromoteNearest(caster.pos, { within: Infinity, max: nativeHost.lite.used, owner: caster.id, kindIdx });
    }
    const bodies = nativeHost.throngBodiesOf(caster, inst.def.id);
    if (evo.fullDive && bodies.every(b => !b.throngDive) && nativeHost.throngRosterCount(caster, inst) >= nativeHost.throngCapOf(caster, inst)) {
      for (const b of bodies) {
        if (b.clingTo) nativeHost.clingRelease(b);
        b.casting = null;
        b.throngCarried = false;
        b.throngDive = nativeHost.clampPos({ ...aim }, b.radius, undefined, { mover: b });
      }
      return;
    }
    if (evo.whirlwind) return;
    for (const b of bodies) if (!b.throngDive) b.throngCarried = false;
    // A lite-tier anchor's roster may live ENTIRELY in the pool — the sweep
    // is live as long as ANY body (row or promoted) answers.
    const liteKindIdx = spec.tier === 'lite' ? nativeHost.liteKindOf(spec.monsterId) : -1;
    const liteRows = liteKindIdx >= 0 ? nativeHost.lite.countOwned(caster.id, liteKindIdx) : 0;
    if (!bodies.length && !liteRows) {
      nativeHost.failNote(caster, inst.def.id + ':nothrong', 'no throng gathered');
      return;
    }
    const mark = vec(aim.x, aim.y);
    const until = nativeHost.time + (fx.linger ?? spec.direct?.linger ?? THRONG_CFG.direct.linger);
    const radius = spec.direct?.radius ?? THRONG_CFG.direct.radius;
    let quarry: Actor | undefined;
    let qd = fx.pin ?? THRONG_CFG.direct.pin;
    for (const e of nativeHost.enemiesOf(caster)) {
      if (e.passive || e.untargetable || e.sheet.get('invisible') > 0) continue;
      const dq = dist(e.pos, mark);
      if (dq < qd) { qd = dq; quarry = e; }
    }
    // THE LITE ORDER (engine/lite.ts): pool rows march by ONE stamped mark
    // per (keeper, kind) — re-stamped each channel pulse, exactly like the
    // per-body assault orders below. The cling promotion boundary fires in
    // the sweep once the cloud reaches a pinned quarry's rim.
    if (liteKindIdx >= 0) {
      const order: { x: number; y: number; targetId?: number; until: number } =
        { x: mark.x, y: mark.y, until };
      if (quarry) order.targetId = quarry.id;
      nativeHost.liteOrders.set(caster.id * 256 + liteKindIdx, order);
    }
    for (const m of bodies) {
      if (m.throngDive) continue;
      const cmd: CommandState = {
        kind: 'assault', pos: vec(mark.x, mark.y), until, radius, issuerId: caster.id,
      };
      if (quarry) cmd.targetId = quarry.id;
      issueCommand(m, cmd);
    }
  }

export function sceneLiteNoteDeath(nativeHost: NativeSceneCombatHost, k: LiteKind, rowTeam: number, credit: Actor | null | undefined): void {
    if (rowTeam !== 0) return;
    if (credit && credit.team !== 'player') return;
    if (k.xpValue > 0) nativeHost.liteXpAcc += k.xpValue;
    nativeHost.liteKills.set(k.defId, (nativeHost.liteKills.get(k.defId) ?? 0) + 1);
  }

export function scenePromoteLite(nativeHost: NativeSceneCombatHost, i: number): Actor | null {
    const pool = nativeHost.lite;
    if (!pool.alive[i]) return null;
    const k = nativeHost.liteKinds[pool.kind[i]];
    if (!k || !MONSTERS[k.defId]) return null;
    const ownerId = pool.owner[i];
    const pos = vec(pool.x[i], pool.y[i]);
    const spent = Math.max(0, k.plies0 - pool.plies[i]);
    let body: Actor | null = null;
    if (ownerId) {
      const keeper = nativeHost.actorById(ownerId);
      if (keeper && !keeper.dead) {
        const inst = keeper.skills.find(s =>
          s?.def.throng?.tier === 'lite' && s.def.throng.monsterId === k.defId);
        if (inst) body = nativeHost.mintThrongBody(keeper, inst, pos, keeper.level);
      }
      if (!body) return null; // orphaned row: the disband sweep re-wilds it
    } else {
      body = nativeHost.createMonster(k.defId, Math.max(1, nativeHost.zone.level),
        pool.team[i] === 1 ? 'player' : 'enemy');
      body.tier = pool.story[i]; // the row's story rides the promotion
      body.pos = nativeHost.clampPos(pos, body.radius, undefined, { mover: body });
      { nativeHost.actors.push(body); nativeHost.admitCombatBirth(body); }
    }
    if (body.pliesMax > 0) body.plies = Math.max(1, body.pliesMax - spent);
    // A promotion is an INTERFERENCE (something reached into the collective)
    // — the regrowth law's quiet clock stamps.
    nativeHost.litePocketDisturb(pool.pocket[i]);
    pool.free(i);
    return body;
  }

export function scenePromoteCommandThrong(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, affects: string, radius?: number): void {
    if (affects === 'squad') return;
    for (const keeper of [...nativeHost.actors]) {
      if (keeper.dead || (keeper !== caster && !keeper.ownedBy(caster))) continue;
      for (const anchor of keeper.skills) {
        const spec = anchor?.def.throng;
        if (!anchor || spec?.tier !== 'lite' || (inst.hostSkillId && anchor.def.id !== inst.hostSkillId)) continue;
        const kindIdx = nativeHost.liteKindOf(spec.monsterId);
        if (kindIdx < 0) continue;
        nativeHost.litePromoteNearest(caster.pos, {
          within: radius ?? Infinity, max: nativeHost.lite.used, owner: keeper.id, kindIdx,
        });
      }
    }
  }

export function sceneLitePocketDisturb(nativeHost: NativeSceneCombatHost, pk: number): void {
    if (pk < 0) return;
    const p = nativeHost.litePockets[pk];
    if (!p || p.extinct) return;
    p.disturbedUntil = Math.max(p.disturbedUntil, nativeHost.time + p.quietSec);
  }

export function sceneConjurationLifeline(nativeHost: NativeSceneCombatHost, conjurer: Actor): number | undefined {
    if (nativeHost.seatOf(conjurer)) return undefined;
    return nativeHost.seats.some(s => s.actor.team === conjurer.team)
      ? conjurer.id : undefined;
  }

export function sceneBirthAt(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance | null, fx: BirthEffect, at: Vec2,
    opts?: { host?: boolean; capKey?: string }): Actor[] {
    const born: Actor[] = [];
    const n = birthCount(fx, (lo, hi) => randInt(lo, hi));
    if (n <= 0) return born;
    const scatter = fx.scatter ?? CLUTCH_CFG.scatter;
    const playerSide = caster.team === 'player';
    const liveBrood = (): number =>
      nativeHost.actors.filter(a => !a.dead && a.bornOf === caster.id).length;
    for (let i = 0; i < n; i++) {
      const id = fx.pool?.length
        ? nativeHost.weightedPick(fx.pool, caster.level)
        : fx.monsterId;
      if (!id || !MONSTERS[id]) continue;
      const seat = vec(at.x + rand(-scatter, scatter), at.y + rand(-scatter, scatter));
      let m: Actor | null;
      if (playerSide && inst) {
        m = nativeHost.spawnMinion(caster, inst, {
          monsterId: id, pos: seat,
          delivery: {
            type: 'summon', monsterId: id, count: 1,
            maxActive: fx.cap ?? CLUTCH_CFG.minionCap,
            ...(fx.duration !== undefined ? { duration: fx.duration } : {}),
          },
        });
      } else if (playerSide) {
        // INSTANCE-LESS player births (THE PROC DOOR — her Card-4 ruling):
        // no host skill stands behind the trigger, so the Forgebound
        // census shape carries it — capped by a synthetic source key per
        // trigger, minted for the RESOLVED keeper, mortal, lifelined.
        const owner = caster.owner ?? caster;
        const key = opts?.capKey ?? '__birth';
        const cap = fx.cap ?? CLUTCH_CFG.minionCap;
        if (nativeHost.actors.filter(x => x.owner === owner && !x.dead
          && x.sourceSkillId === key).length >= cap) break;
        m = nativeHost.createMonster(id, owner.level, owner.team, owner);
        m.sourceSkillId = key;
        m.noBounty = true;
        m.lifelineId = nativeHost.conjurationLifeline(owner);
        if (fx.duration) m.lifespan = fx.duration * owner.sheet.get('effectDuration');
        m.pos = nativeHost.findFreeSpot(seat, m.radius, m.tier);
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
      } else if (fx.incubate) {
        // THE EGG (BirthEffect.incubate — her Card-3 ruling: thematic,
        // per-monster): the landing lays a VESSEL that holds a clutch-cap
        // seat until term. Break it and nothing is born; at term
        // updateClutch bursts it and the brood hatch as the EGG'S own
        // (bornOf the egg — free recursion, the Card-5 default).
        const cap = fx.cap ?? CLUTCH_CFG.cap;
        if (liveBrood() >= cap) break;
        const vessel = fx.incubate.vessel ?? CLUTCH_CFG.incubate.vessel;
        if (!MONSTERS[vessel]) continue;
        m = nativeHost.createMonster(vessel, caster.level, caster.team);
        m.bornOf = caster.id;
        if (caster.faction) m.faction = caster.faction;
        if (fx.bounty !== 'full') m.noBounty = true;
        if (fx.tag) m.tag = fx.tag;
        if (fx.orphan) m.orphanFate = fx.orphan;
        m.pos = nativeHost.findFreeSpot(seat, m.radius, m.tier);
        const hatchFx: BirthEffect = { ...fx };
        delete hatchFx.incubate;
        m.eggHatch = { at: nativeHost.time + fx.incubate.sec, fx: hatchFx };
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
        caster.clutchLive = liveBrood();
      } else {
        // THE CLUTCH CAP: the live bornOf census — at cap the birth simply
        // does not happen (the blast still landed; the sac lands wet).
        const cap = fx.cap ?? CLUTCH_CFG.cap;
        if (liveBrood() >= cap) break;
        m = nativeHost.createMonster(id, caster.level, caster.team);
        m.bornOf = caster.id;
        if (caster.faction) m.faction = caster.faction;
        if (fx.bounty !== 'full') m.noBounty = true;
        if (fx.tag) m.tag = fx.tag;
        if (fx.orphan) m.orphanFate = fx.orphan;
        m.pos = nativeHost.findFreeSpot(seat, m.radius, m.tier);
        { nativeHost.actors.push(m); nativeHost.admitCombatBirth(m); }
        // The live-litter stamp (the 'clutch' tell source): the drawn
        // crate and the tested cap read the SAME census.
        caster.clutchLive = liveBrood();
      }
      if (!m) continue;
      born.push(m);
      // THE ARRIVAL: births READ — the ground under the landing derives
      // the motion; onHit births burst OUT of the struck body; the spec's
      // own emerge row overrides both (a fire sprite condenses).
      nativeHost.emergeBody(m, {
        ...(fx.emerge ? { spec: fx.emerge } : {}),
        ...(opts?.host ? { host: true } : {}),
      });
    }
    if (born.length) {
      nativeHost.flashes.push({
        pos: vec(at.x, at.y), radius: CLUTCH_CFG.flash.radius,
        color: inst?.def.color ?? caster.color,
        life: CLUTCH_CFG.flash.life, maxLife: CLUTCH_CFG.flash.life,
      });
    }
    return born;
  }

export function sceneClutchOnDeath(nativeHost: NativeSceneCombatHost, victim: Actor): void {
    if (victim.bornOf !== undefined) {
      const mother = nativeHost.actors.find(a => !a.dead && a.id === victim.bornOf);
      if (mother?.clutchLive !== undefined) {
        mother.clutchLive = nativeHost.actors.filter(a =>
          !a.dead && a !== victim && a.bornOf === mother.id).length;
      }
    }
    let brood: Actor[] | null = null;
    for (const a of nativeHost.actors) {
      if (!a.dead && a.bornOf === victim.id && a.orphanFate) (brood ??= []).push(a);
    }
    if (!brood) return;
    for (const child of brood) {
      if (child.dead) continue;
      switch (child.orphanFate) {
        case 'die':
          // An extension of the mother, not a life of its own — it simply
          // stops (quiet: its stream never paid, and never will).
          nativeHost.kill(child, true);
          break;
        case 'wither':
          child.lifespan = CLUTCH_CFG.orphan.witherSec;
          break;
        case 'frenzy':
          // The mourn-rage window: killing her mid-brood has a price.
          child.addBuff(ORPHAN_FRENZY, 1, 0);
          break;
        case 'rout':
          // The panic machinery's flight (StatusDef.panic — the pups
          // scatter through the same rout every courage spec obeys).
          nativeHost.withCombatStatusSource(child, victim, undefined, () => child.applyStatus(CLUTCH_CFG.orphan.rout.status, 0,
            CLUTCH_CFG.orphan.rout.durMul, 'orphaned'));
          break;
      }
    }
  }

export function sceneCorpseSpawn(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, at: Vec2, n: number): void {
    const cs = socketSpec(inst, 'corpseSpawn');
    if (!cs) return;
    const births = cs.perCorpse ? n : (cs.count ?? 1);
    const key = '__hive:' + inst.def.id;
    for (let i = 0; i < births; i++) {
      if (nativeHost.actors.filter(m => m.owner === caster && !m.dead
        && m.sourceSkillId === key).length >= cs.max) return;
      const crawler = nativeHost.createMonster(cs.monsterId, caster.level, caster.team, caster);
      crawler.sourceSkillId = key;
      crawler.lifespan = cs.duration;
      crawler.pos = nativeHost.clampPos(
        vec(at.x + rand(-22, 22), at.y + rand(-22, 22)), crawler.radius);
      { nativeHost.actors.push(crawler); nativeHost.admitCombatBirth(crawler); }
      nativeHost.emergeBody(crawler, { host: true }); // THE EMERGENCE GRAMMAR: the crawler bursts out of the eaten body
    }
  }

export function sceneHatchPod(nativeHost: NativeSceneCombatHost, pod: Actor): void {
    const h = pod.construct?.hatch;
    if (!h || !SKILLS[h.skillId]) return;
    pod.construct!.hatch = undefined;
    const owner = pod.owner;
    if (!owner || owner.dead) return;
    const payload = makeSkillInstance(SKILLS[h.skillId],
      pod.summonInst ? effectiveSkillLevel(pod.summonInst) : pod.level);
    payload.hostSkillId = pod.sourceSkillId;
    nativeHost.executeSkill(owner, payload, vec(pod.pos.x, pod.pos.y),
      { tier: pod.tier, keepFacing: true, noCooldown: true, noRepeat: true });
    nativeHost.text(pod.pos, 'hatched!', pod.color, 12);
  }

export function sceneDismissExclusiveSummons(nativeHost: NativeSceneCombatHost, owner: Actor, inst: SkillInstance, d: SummonDelivery): void {
    if (!d.exclusiveGroup) return;
    for (const [id, t] of [...owner.summonToggles]) {
      const td = instanceDelivery(t.inst);
      if (id !== inst.def.id && td.type === 'summon' && td.exclusiveGroup === d.exclusiveGroup) nativeHost.dismissSummonToggle(owner, id);
    }
    for (const body of nativeHost.minionsOf(owner)) {
      if (!body.summonInst || body.summonInst.companionGrant || body.sourceSkillId === inst.def.id) continue;
      const other = instanceDelivery(body.summonInst);
      if (other.type === 'summon' && other.exclusiveGroup === d.exclusiveGroup) {
        nativeHost.releaseContract(body, false); nativeHost.kill(body, true);
      }
    }
    nativeHost.pendingRespawns = nativeHost.pendingRespawns.filter(p => {
      const other = instanceDelivery(p.inst);
      return p.caster !== owner || p.inst.def.id === inst.def.id || other.type !== 'summon' || other.exclusiveGroup !== d.exclusiveGroup;
    });
    nativeHost.pendingSummons = nativeHost.pendingSummons.filter(p => {
      const other = instanceDelivery(p.inst);
      return p.caster !== owner || p.inst.def.id === inst.def.id || other.type !== 'summon' || other.exclusiveGroup !== d.exclusiveGroup;
    });
  }

export function sceneMinionAreaAvoidanceOf(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance): number {
    return minionAreaAvoidanceOf(caster, inst);
  }

export function sceneSpawnMinion(nativeHost: NativeSceneCombatHost, 
    caster: Actor, inst: SkillInstance,
    overrides?: { tier?: number; monsterId?: string; pos?: Vec2; delivery?: SummonDelivery; dmgMult?: number; noReplace?: boolean; offspring?: { maxActive: number; size: number; life: number; damage: number } },
  ): Actor | null {
    // SOVEREIGNTY: seat — the summon's story is stamped and clamped (the derived census, probe_tiers RIG T).
    // A support's summon graft (Vessel of Shadow) supplies the delivery when
    // the host skill's own isn't a summon. Summon-tree fields, including
    // replenishment lifespan and cap, use the same resolved view as casts.
    const d = overrides?.delivery ?? instanceDelivery(inst);
    if (d.type !== 'summon') return null;
    const tags = skillContextTags(inst);
    const extra = instanceMods(inst);

    const maxActive = summonCapacity(caster, inst, d);
    // Shared pool groups (golems) cap across every skill in the group.
    const existing = inst.companionGrant ? [] : d.poolGroup
      ? nativeHost.minionsOfGroup(caster, d.poolGroup)
      : nativeHost.minionsOfSkill(caster, inst.def.id);
    if (overrides?.offspring) {
      if (nativeHost.minionsOfSkill(caster, inst.def.id).filter(a => a.summonOffspring).length >= overrides.offspring.maxActive) return null;
      existing.length = 0; // heirs never evict their parent contract or one another
    } else {
      for (let i = existing.length - 1; i >= 0; i--) if (existing[i].summonOffspring) existing.splice(i, 1);
    }
    if (overrides?.noReplace && existing.length >= maxActive) return null;
    while (existing.length >= maxActive) {
      const oldest = existing.shift();
      if (oldest) {
        nativeHost.releaseContract(oldest, false); // evictions end the contract
        nativeHost.kill(oldest, true);
      }
    }

    // Persistent contracts lock out max mana while they live. TOGGLED
    // contracts skip this: the SKILL owns the money (summonToggles), so
    // the minion carries 0 and its death frees nothing.
    let reserve = 0;
    if (d.persistent && !d.persistent.toggle) {
      reserve = summonReservationUnit(caster, inst, d);
      if (caster.reservedMana + reserve > caster.maxMana()) {
        nativeHost.text(caster.pos, 'cannot sustain', '#d05050', 12);
        return null;
      }
    }

    const typeId = overrides?.monsterId ?? nativeHost.rollSummonType(d);
    const minion = nativeHost.createMonster(typeId, caster.level, caster.team, caster);
    // Skill-conjured bodies pay no bounty on death — an enemy summoner's
    // spawn stream can't be farmed for xp/drops (kill the caster instead),
    // and a re-raised corpse can't pay twice. No-op for player minions.
    minion.noBounty = true;
    // BORROWED UNLIFE: a body minted by a player-side conjurer that isn't
    // itself a seat (a spectre'd grave shaman answering with its own call)
    // is LIFELINED to that conjurer — it unmakes when its raiser goes, so
    // second-hand armies can't outlive the mind that holds them. Wild and
    // enemy chains never stamp it: their risen owe nothing to the caller.
    minion.lifelineId = nativeHost.conjurationLifeline(caster);
    // Shades and doppelgangers wear their summoner's silhouette (a data
    // flag, not an id check — any monster can be a mimic).
    if (MONSTERS[typeId]?.mimicOwnerForm) {
      minion.shape = caster.shape;
      minion.color = caster.color;
      minion.radius = caster.radius;
      minion.facing = caster.facing;
      minion.look = caster.look;
      minion.material = caster.material;
    }
    minion.sourceSkillId = inst.def.id;
    minion.sourcePoolGroup = d.poolGroup;
    minion.summonInst = inst;
    minion.summonOffspring = !!overrides?.offspring;
    minion.summonDeathActions = d.crewOnDeath;
    if (overrides?.offspring) {
      minion.radius *= overrides.offspring.size;
      minion.sheet.setSource('summon:offspring', [mod('life', 'more', overrides.offspring.life - 1), mod('damage', 'more', overrides.offspring.damage - 1)]);
    }
    minion.summonEscort = d.escort;
    minion.summonShell = d.shell;
    if (d.shell) {
      (caster.summonShells ??= new Set()).add(minion);
      minion.skills = []; // a worn shell strikes through its declared kit
      minion.untargetable = true;
      minion.invulnerable = true; // blows reach its shell pool via the keeper
    }
    const crewIds = summonKitIds(d, typeId, minion.skills.flatMap(s => s ? [s.def.id] : []));
    minion.skills = minion.skills.filter(s => !s || crewIds.includes(s.def.id));
    for (const sid of crewIds) {
      if (SKILLS[sid] && !minion.skills.some(s => s?.def.id === sid)) {
        minion.skills.push(makeSkillInstance(SKILLS[sid], 1 + Math.floor(minion.level / 4), 0));
      }
    }
    if (d.crewMods?.length) minion.sheet.setSource('summon:crew', d.crewMods);
    if (d.crewInherit?.length) minion.sheet.setSource('summon:inherit', d.crewInherit.map(g =>
      mod(g.stat, g.kind, caster.sheet.get(g.fromStat, tags, extra) * g.ratio + (g.offset ?? 0), g.tags)));
    // SUPPORT FORWARDING: the summon's own gems board what the minion
    // CASTS — forwarded before ownerMods so both lanes (crew sockets,
    // sheet source) are live for the minion's whole life. Corpse-raised
    // bodies (Raise Spectre) resolve fit HERE, against the actual kit.
    nativeHost.forwardSummonSockets(inst, minion.skills);
    // The owner-investment fold — ONE seam shared with throng claims
    // (which pass the batch scale); a summon wears it whole.
    nativeHost.bakeMinionOwnerStats(minion, caster, inst);
    if (d.shell) {
      const s = d.shell;
      const max = Math.max(1, minion.maxLife() * s.lifeFraction * caster.sheet.get('guardStrength', tags, extra) * Math.pow(caster.sheet.get('minionSize', tags, extra), s.sizeScaling ?? 0));
      minion.shellGuard = { side: 'front', arcDeg: s.arcDeg, max, pool: max, shellVisual: s.shellVisual,
        regenDelay: s.regenDelay, regenRate: max * s.regenFraction,
        reformFraction: s.reformFraction, lastHitAt: -999, broken: false, color: inst.def.color };
    }
    // RAMPED SUMMONS: a channel's held ramp (Spirit Pyre's quadratic climb)
    // or a charge-up's gather mints HOTTER bodies — clamped so channel
    // double-dips can't launder into a standing army.
    if (overrides?.dmgMult !== undefined && overrides.dmgMult !== 1) {
      minion.sheet.setSource('ramp',
        [mod('damage', 'more', Math.min(3, Math.max(0.2, overrides.dmgMult)) - 1)]);
    }
    // EXPONENTIAL UNLIFE: dps0 divides out the owner's minionLife multiplier
    // so life investment genuinely extends survival — logarithmically,
    // because growth compounds. Nothing reaches permanence.
    if (d.decay) {
      const lifeMult = Math.max(0.1, caster.sheet.get('minionLife', tags, extra));
      minion.decay = {
        t: -(d.decay.delay ?? 0),
        dps0: (minion.maxLife() / lifeMult) * d.decay.frac
          * caster.sheet.get('minionDecayRate', tags, extra),
        growth: d.decay.growth,
      };
    }
    // Innately explosive minions (bombers) keep their own payload if larger.
    minion.explodeOnDeath = Math.max(minion.explodeOnDeath,
      caster.sheet.get('minionExplodeDeath', tags, extra));
    minion.explodeOnLowLife = caster.sheet.get('minionExplodeLowLife', tags, extra);
    minion.undyingTime = caster.sheet.get('minionUndying', tags, extra);
    // THE BLOOM (minionBloom — THE LEGEND FABRIC, Gravebloom): the owner's
    // timer stamps the body at its emergence; the 'blooming' marker wears
    // the countdown so the ripening reads on the body before it bursts.
    {
      const bloom = caster.sheet.get('minionBloom', tags, extra);
      if (bloom > 0) {
        minion.bloomIn = bloom;
        nativeHost.withCombatStatusSource(minion, caster, inst, () => minion.applyStatus('blooming', 0, bloom / (STATUS_DEFS.blooming?.duration || 1), 'bloom'));
      }
    }
    if (d.duration) {
      minion.lifespan = d.duration * caster.sheet.get('effectDuration', tags, extra);
    }
    if (reserve > 0) {
      minion.manaReserved = reserve;
      caster.reservedMana += reserve;
      caster.mana = Math.min(caster.mana, caster.availableMaxMana());
    }
    minion.fillResources();
    // THE SUMMON'S STORY (layer sovereignty — the flight law's sibling): a
    // conjured body belongs to its caster's layer, and the placement clamp
    // below confines it against that story's own floor — an army raised in
    // the root ducts fights the ducts, not the street over them. Stamped
    // BEFORE the clamp so the mover gate reads the right layer; flat zones
    // (tier 0) walk the identical path.
    minion.tier = overrides?.tier ?? caster.tier;
    const ang = rand(0, Math.PI * 2);
    minion.pos = overrides?.pos
      ? nativeHost.clampPos(vec(overrides.pos.x, overrides.pos.y), minion.radius, undefined, { mover: minion })
      : nativeHost.clampPos(vec(
        caster.pos.x + Math.cos(ang) * 50, caster.pos.y + Math.sin(ang) * 50), minion.radius, undefined, { mover: minion });
    if (minion.summonShell) { minion.pos = { ...caster.pos }; minion.facing = caster.facing; }
    { nativeHost.actors.push(minion); nativeHost.admitCombatBirth(minion); }
    if (d.strikeRelease) {
      let bodies = nativeHost.strikeReleaseBodies.get(caster);
      if (!bodies) nativeHost.strikeReleaseBodies.set(caster, bodies = new Set());
      bodies.add(minion);
    }
    for (const sid of d.crewAuras ?? []) {
      const auraInst = minion.skills.find(s => s?.def.id === sid);
      if (auraInst?.def.delivery.type === 'aura') nativeHost.activateAura(minion, auraInst, auraInst.def.delivery,
        minion.sheet.get('aoeRadius', skillContextTags(auraInst), instanceMods(auraInst)));
    }
    // Tethers: summons may trail a band to their master or web into their
    // pack, exactly like constructs (one vocabulary, both spawn kinds).
    nativeHost.attachObjectTethers(minion, inst, caster);
    // VIOLENT ARRIVAL (summonImpact): the minion EMERGES as a weapon —
    // a fraction of its max life detonates around the arrival point (the
    // inverse Martyrdom: the entrance is the first attack).
    {
      const impact = caster.sheet.get('summonImpact',
        skillContextTags(inst), instanceMods(inst));
      if (impact > 0) {
        nativeHost.burstDamage(vec(minion.pos.x, minion.pos.y), 70,
          minion.maxLife() * impact, 'physical', inst.def.color, caster.team, caster.tier);
      }
    }
    // LIFE-CYCLE RITES (owner stats, queried with the SUMMON skill's
    // context so a support blesses only its own flock): death heals, the
    // expiry-counts-as-death lever, and the arrival MEND — summonImpact's
    // twin, the entrance as balm instead of blast.
    {
      const tags2 = skillContextTags(inst);
      const extra2 = instanceMods(inst);
      minion.deathHealPct = caster.sheet.get('minionDeathHeal', tags2, extra2);
      minion.deathHealFlat = caster.sheet.get('minionDeathHealFlat', tags2, extra2);
      minion.expiryTriggersDeath = caster.sheet.get('minionExpiryIsDeath', tags2, extra2) > 0;
      const mend = caster.sheet.get('summonMend', tags2, extra2);
      if (mend > 0) {
        for (const ally of nativeHost.actors) {
          if (ally.dead || ally.team !== caster.team) continue;
          if (dist(minion.pos, ally.pos) > 90) continue;
          const got = ally.healBy(mend);
          if (got > 0.5) nativeHost.seatText(caster, ally.pos, '+' + Math.round(got), '#8ae0a8', 10); // THE WIRE'S EYES: the healer's seat
        }
        nativeHost.flashes.push({
          pos: vec(minion.pos.x, minion.pos.y), radius: 90,
          color: '#8ae0a8', life: 0.25, maxLife: 0.25,
        });
      }
    }
    // DEVOURER (innate or the Ravenous Pact graft): the apex economy —
    // this minion eats its lessers on a beat (see updateMinionMeta).
    {
      const devourSpec = d.devour ?? hostSockets(inst).find(s => s.def.devour)?.def.devour;
      if (devourSpec) {
        minion.devour = { spec: devourSpec, next: nativeHost.time + devourSpec.interval };
      }
    }
    // FRESH RANKS (SupportDef.spawnBuff): the newly summoned are born
    // wearing the graft's buff — "the recently raised fight harder".
    {
      const sb = socketSpec(inst, 'spawnBuff');
      if (sb) minion.addBuff(sb);
    }
    // RANDOM WEAK AURA (SupportDef.minionAuraPool): each minion is born
    // humming ONE aura rolled from the pool, shared with allies around it.
    {
      const pool = socketSpec(inst, 'minionAuraPool');
      if (pool && pool.length) {
        const spec2 = pick(pool);
        minion.activeAuras.set(inst.def.id + ':gift', {
          inst, spec: spec2,
          allyMods: spec2.allyMods,
          radius: spec2.radius,
          shape: 0,
          remaining: Infinity,
          reserved: 0, pulseTimer: 0,
          affected: new Set(),
          since: nativeHost.time,
        });
      }
    }
    // PYRE LEGION (SupportDef.minionAura): the ranks wear a baked aura —
    // the pylon spec, carried by flesh.
    for (const s of hostSockets(inst)) {
      if (!s.def.minionAura) continue;
      minion.activeAuras.set(inst.def.id + ':legion', {
        inst, spec: s.def.minionAura,
        radius: s.def.minionAura.radius
          * caster.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst)),
        shape: 0,
        remaining: Infinity, reserved: 0, pulseTimer: 0,
        affected: new Set(),
      });
      break;
    }
    // THE DEADWAKE: raising a minion stirs the corpse tide (a heavier tick when the
    // thing raised is itself undead — a skeleton, a spectre). No-op until armed.
    nativeHost.sim.deadwakeField?.accrue('summon', isDeathAligned(minion.faction));
    if (!nativeHost.presenceArrival(minion, caster, inst))
      nativeHost.flashes.push({ pos: vec(minion.pos.x, minion.pos.y), radius: 20 + minion.radius, color: inst.def.color, life: 0.35, maxLife: 0.35 });
    return minion;
  }

export function sceneSpawnEchoRiders(nativeHost: NativeSceneCombatHost, 
    owner: Actor, sourceInst: SkillInstance, spec: EchoRiderSpec,
    key: string, aim: Vec2, castInst?: SkillInstance,
  ): void {
    // SOVEREIGNTY: seat — riders seat on the caster's story (the derived census, probe_tiers RIG T).
    if (owner.construct) return; // ghosts never mint ghosts
    // ECHOABLE: ghosts swing flesh-and-blood skills only — no spawners, no
    // travel, no banked economies, no side-effect-laden target eaters, no
    // charge consumers (a ghost holds no charges to spend).
    if (castInst && spec.mode !== 'mimic') {
      const cd = castInst.def;
      if (['construct', 'aura', 'detonate', 'detonateProjectile', 'summon',
        'mark', 'dash', 'blink', 'leap', 'self'].includes(cd.delivery.type)
        || cd.pool || cd.targeting
        || (() => { const cc = instanceChargeCost(castInst); return cc && !cc.optional; })()) return;
    }
    const tags = skillContextTags(sourceInst.def);
    const extra = instanceMods(sourceInst);
    // Each echo gem's flat +1 feeds ITS OWN family (and an echo SKILL's own
    // riders — the two-archer rule). Without discounting the OTHER gems'
    // flats here, n echo gems in one link would cross-pollinate into n²
    // ghosts (each family counting every gem's +1).
    let othersFlat = 0;
    if (!key.endsWith(':self')) {
      const gemId = key.slice(key.indexOf(':') + 1);
      for (const s of hostSockets(sourceInst)) {
        if (!s.def.echo || s.def.id === gemId) continue;
        for (const m of s.def.mods) {
          if (m.stat === 'mirageCount' && m.kind === 'flat') othersFlat += m.value;
        }
      }
    }
    const cap = Math.round(owner.sheet.get('mirageCount', tags, extra, spec.count ?? 0)) - othersFlat;
    if (cap < 1) return;
    const power = (spec.damageFactor ?? 0.5) * owner.sheet.get('mirageDamage', tags, extra);
    const life = spec.duration * owner.sheet.get('effectDuration', tags, extra);
    const family = nativeHost.actors.filter(a =>
      a.owner === owner && !a.dead && a.construct?.echoKey === key);

    if (spec.mode === 'strike') {
      // LAUNCHED, not stationed: each use sends `cap` ghosts at the cap
      // nearest DISTINCT enemies around the owner. Nothing near = no ghost
      // (the whiff is standing too far away, not a fizzling animation).
      const prey = nativeHost.enemiesOf(owner)
        .filter(e => !e.passive && dist(owner.pos, e.pos) <= (spec.range ?? 200))
        .sort((a, b) => dist(owner.pos, a.pos) - dist(owner.pos, b.pos))
        .slice(0, cap);
      if (!prey.length) return;
      // In-flight pileups evict oldest beyond cap × 3.
      for (let i = family.length + prey.length - cap * 3; i > 0; i--) {
        const oldest = family.shift();
        if (oldest) nativeHost.kill(oldest, true);
      }
      for (const mark of prey) {
        const g = nativeHost.buildEchoRider(owner, sourceInst, spec, key, power, castInst);
        if (!g) continue;
        g.construct!.echoPrey = mark.id;
        g.construct!.echoCasts = spec.casts ?? 1;
        // The glide budget IS the reach: speed × life, duration-investable
        // but CAPPED — reliability against kiters, never artillery.
        g.lifespan = Math.min(ECHO_STRIKE_LIFE_MAX, life);
        const ang = angleTo(owner.pos, mark.pos);
        g.pos = vec(owner.pos.x + Math.cos(ang) * (owner.radius + 14),
          owner.pos.y + Math.sin(ang) * (owner.radius + 14));
        g.facing = ang;
      }
      return;
    }

    // hover / mimic: a standing family — evict past a SHRUNKEN cap
    // (unsocketed gem, lost threshold), refresh the living, top up to cap.
    while (family.length > cap) {
      const oldest = family.shift();
      if (oldest) nativeHost.kill(oldest, true);
    }
    for (const r of family) {
      r.lifespan = Math.max(r.lifespan, life);
      if (r.construct) {
        r.construct.echoPower = power;
        // Re-stamp the fresh castInst (over-cap levels, re-socketed gems
        // reach STANDING riders — a no-op for grafts, whose castInst is the
        // live host instance) and the current beat (Keener Mirage etc.).
        if (castInst) r.construct.castInst = castInst;
        r.construct.castInterval = (spec.interval ?? 0.9)
          / owner.sheet.get('constructCastRate', tags, extra);
      }
      r.sheet.setSource('mirage', nativeHost.mirageSource(spec, power));
    }
    for (let i = family.length; i < cap; i++) {
      const r = nativeHost.buildEchoRider(owner, sourceInst, spec, key, power, castInst);
      if (!r) continue;
      r.construct!.echoSlot = i;
      if (spec.mode === 'mimic') {
        // THE SUBSTITUTION: the shadow holds your ground; you smoke-step back.
        r.pos = vec(owner.pos.x, owner.pos.y);
        r.facing = owner.facing;
        if (spec.substitute) {
          const back = owner.facing + Math.PI;
          nativeHost.flashes.push({
            pos: vec(owner.pos.x, owner.pos.y), radius: 26,
            color: '#4a4066', life: 0.3, maxLife: 0.3,
          });
          owner.pos = nativeHost.clampPos(vec(
            owner.pos.x + Math.cos(back) * spec.substitute,
            owner.pos.y + Math.sin(back) * spec.substitute), owner.radius);
        }
      } else {
        const slot = nativeHost.hoverSlotPos(owner, i, spec);
        r.pos = vec(slot.x, slot.y);
      }
    }
  }

export function sceneMirageSource(nativeHost: NativeSceneCombatHost, spec: EchoRiderSpec, power: number): Modifier[] {
    return spec.mode === 'mimic'
      ? [mod('statusMagnitude', 'more', power - 1)]
      : [mod('damage', 'more', power - 1), mod('statusMagnitude', 'more', power - 1)];
  }

export function sceneHoverSlotPos(nativeHost: NativeSceneCombatHost, owner: Actor, slot: number, spec: EchoRiderSpec): Vec2 {
    const side = slot % 2 === 0 ? 1 : -1;
    const ang = owner.facing + Math.PI + side * (0.6 + Math.floor(slot / 2) * 0.45);
    const r = (spec.hoverRadius ?? 46) + Math.floor(slot / 2) * 18;
    return vec(owner.pos.x + Math.cos(ang) * r, owner.pos.y + Math.sin(ang) * r);
  }

export function sceneBuildEchoRider(nativeHost: NativeSceneCombatHost, 
    owner: Actor, sourceInst: SkillInstance, spec: EchoRiderSpec,
    key: string, power: number, castInst?: SkillInstance,
  ): Actor | null {
    const mimic = spec.mode === 'mimic';
    const d: ConstructDelivery = {
      type: 'construct', kind: 'echo',
      range: spec.range ?? 440,
      duration: spec.duration,
      maxActive: 99, // echo caps ride mirageCount (spawnEchoRiders), not this
      life: mimic ? 30 + owner.maxLife() * 0.25 : 40,
      invulnerable: !mimic, // hover/strike are untouchable; clones can die
      placeRange: 0,
      interval: spec.interval,
    };
    const c = nativeHost.spawnConstruct(owner, sourceInst, d, owner.pos, castInst);
    if (!c) return null;
    // The ghost wears its owner's WHOLE silhouette — part-grammar portrait,
    // adorn and surface included (shape+color alone undressed a class look).
    c.shape = owner.shape;
    c.color = owner.color;
    c.radius = owner.radius;
    c.look = owner.look;
    c.adorn = owner.adorn;
    c.material = owner.material;
    const st = c.construct!;
    st.echo = spec;
    st.echoKey = key;
    st.echoPower = power;
    st.timer = 0.15; // first look shortly after raising
    // Echoes are YOU, not your pets: minion scaling is swapped for the echo
    // penalty (clones keep minionLife on their BODY — it is a killable body).
    c.sheet.setSource('owner', mimic
      ? [mod('life', 'more', owner.sheet.get('minionLife',
          skillContextTags(sourceInst.def), instanceMods(sourceInst)) - 1)]
      : []);
    c.sheet.setSource('mirage', nativeHost.mirageSource(spec, power));
    if (!mimic) c.explodeOnDeath = 0; // a mirage has no flesh to detonate
    c.life = c.maxLife();
    return c;
  }

export function sceneSpawnConstruct(nativeHost: NativeSceneCombatHost, 
    caster: Actor, sourceInst: SkillInstance, d: ConstructDelivery,
    aim: Vec2, castInst?: SkillInstance, at?: Vec2, scale = 1, tier = caster.tier,
  ): Actor | null {
    // SOVEREIGNTY: seat — seated on the caster's story (the derived census, probe_tiers RIG T).
    const tags = skillContextTags(sourceInst); // Include tree-granted tags, such as Goad's device identity.
    const extra = instanceMods(sourceInst);

    // Echo riders cap through the mirageCount economy (spawnEchoRiders) —
    // "Additional Maximum Minions" must never mint free archers. And #53:
    // constructs cap through their OWN stat (constructMaxCount) — generic
    // "+1 maximum minions" never mints free totems either.
    if (d.kind !== 'echo') {
      const maxActive = Math.max(1, Math.round(
        caster.sheet.get('constructMaxCount', tags, extra, d.maxActive)));
      const existing = nativeHost.minionsOfSkill(caster, sourceInst.def.id);
      while (existing.length >= maxActive) {
        const oldest = existing.shift();
        if (oldest) nativeHost.kill(oldest, true);
      }
    }

    const c = nativeHost.constructCombatActor(() => new Actor(sourceInst.def.name, caster.team, vec(0, 0)));
    c.owner = caster;
    c.sourceSkillId = sourceInst.def.id;
    c.summonInst = sourceInst;
    c.shape = 'square';
    c.color = sourceInst.def.color;
    // The visual-fabric portrait: the delivery's own look, else the kind's
    // default (CONSTRUCT_LOOKS) — totems are carved posts, barriers are
    // stake rows, embeds are lodged spears. The skill color drives the
    // palette; the legacy square survives only for kinds neither names.
    c.look = d.look ?? CONSTRUCT_LOOKS[d.kind];
    c.radius = d.kind === 'trap' || d.kind === 'mine' ? 8 : 13;
    c.level = caster.level;
    c.construct = {
      kind: d.kind,
      castInst,
      range: d.range,
      timer: d.kind === 'trap' ? 0.5 : (d.interval ?? 0),
    };
    // AIM IDENTITY: live-aiming kinds wear the renderer's aim tick; frozen
    // furniture (bone walls, embeds) doesn't — kind registry default, and
    // any skill may declare the exception on its delivery.
    c.aims = d.aims ?? CONSTRUCT_KIND_AIMS[d.kind];
    // DECOY: the delivery's own claim (Lodestone), or granted by a socketed
    // gem through the caster's constructTaunt stat (Beckoning — any totem
    // build becomes a decoy build).
    if (d.taunt || caster.sheet.get('constructTaunt', tags, extra) > 0) c.taunt = true;
    // TREE OF LIFE: the reservoir starts as a sapling and swells as its
    // side's violence feeds it (resolveHit banks into `stored`).
    if (d.healBurst) {
      c.construct.healBurst = d.healBurst;
      c.construct.stored = 0;
      c.construct.baseRadius = c.radius;
    }
    // EMBEDMENTS: stamp the behaviors; the effective run-over re-arm is
    // the embedIcd STAT seeded by the spec (a support converts consumed
    // spears into re-arming ones — the internal-cooldown lever).
    if (d.embed) {
      const icd = caster.sheet.get('embedIcd', tags, extra, d.embed.icd ?? 0);
      c.construct.embed = icd > 0 ? { ...d.embed, icd } : { ...d.embed, icd: undefined };
      c.untargetable = true;
      c.radius = 8;
    }
    // CONSTRUCT FX: the delivery's innate presence plus any grafted gems'
    // (Pulsing Ramparts / Violent Genesis) — pulses merge, bursts merge.
    {
      let fx = d.fx;
      for (const s of hostSockets(sourceInst)) {
        if (!s.def.constructFx) continue;
        fx = {
          pulse: s.def.constructFx.pulse ?? fx?.pulse,
          burst: s.def.constructFx.burst ?? fx?.burst,
        };
      }
      if (fx) c.construct.fx = fx;
    }
    if (d.invulnerable) { c.invulnerable = true; c.untargetable = true; }
    if (d.kind === 'trap' || d.kind === 'mine') c.untargetable = true;

    c.sheet.setBase('life', d.life ?? 40);
    c.sheet.setBase('mana', 999);
    c.sheet.setBase('manaRegen', 100);
    // Inherit the deployer's build-defining sources (attributes, class,
    // passives) so "increased fire damage" etc. scales construct casts,
    // plus standard minion scaling and the construct skill's own gems.
    const inherited: Modifier[] = [];
    for (const src of ['attributes', 'class', 'passives']) {
      const mods = caster.sheet.getSourceMods(src);
      if (mods) inherited.push(...mods);
    }
    c.sheet.setSource('inherited', inherited);
    // When the construct casts the DEPLOYING instance itself (Spirit Totem,
    // echo grafts), its casts already query instanceMods(castInst) — feeding
    // the same mods through the sheet would DOUBLE-APPLY every gem, perLevel
    // growth, and threshold. Catalog sub-skills (mirage_shot) keep the graft
    // — INNATE-ONLY (2026-07-22): socketed gems reach the payload solely as
    // forwarded sockets (fit-gated, forward-priced); the old full-instanceMods
    // source leaked a SECOND unpriced copy of every rideable gem's numbers.
    c.sheet.setSource('parentSkill',
      castInst === sourceInst ? [] : instanceInnateMods(sourceInst));
    c.sheet.setSource('owner', [
      mod('damage', 'more', caster.sheet.get('minionDamage', tags, extra) - 1),
      mod('life', 'more', caster.sheet.get('minionLife', tags, extra) - 1),
    ]);
    // Aimed constructs run through ordinary cast/attack/cooldown clocks.
    // Adopt the same constructCastRate lever as interval-driven devices.
    if (d.kind === 'totem' || d.kind === 'sentry') {
      const rate = caster.sheet.get('constructCastRate', tags, extra);
      c.sheet.setSource('constructCastRate', [mod('attackSpeed', 'more', rate - 1),
        mod('castSpeed', 'more', rate - 1), mod('cooldownRecovery', 'more', rate - 1)]);
    }
    // Charge-released constructs (Volcano): a long hold means a longer,
    // angrier construct — duration scales up, the cast interval scales DOWN.
    c.lifespan = d.duration * scale * caster.sheet.get('effectDuration', tags, extra);
    // The construct casts on its OWN clock — constructCastRate is the
    // investable "totem cast speed" lever (base 1).
    c.construct.castInterval = (d.interval ?? 0.8) / Math.max(0.25, scale)
      / caster.sheet.get('constructCastRate', tags, extra);
    // Martyrdom / Unstable Flesh fit construct skills too: segments and
    // totems supported this way detonate when destroyed — or when they
    // expire (see the lifespan sweep).
    c.explodeOnDeath = caster.sheet.get('minionExplodeDeath', tags, extra);
    c.fillResources();

    // BREAKABLE OBJECTS + DEATH BURSTS: the delivery's own specs, or the
    // Structural Flaw graft where the delivery brings none — any totem
    // skill becomes the conjured-ordnance game, one socket deep.
    {
      const flaw = socketSpec(sourceInst, 'breakableGraft');
      const breakable = d.breakable ?? (flaw ? { ownerMult: flaw.ownerMult } : undefined);
      const burst = d.deathBurst ?? flaw?.deathBurst;
      if (breakable) c.construct.breakable = breakable;
      if (burst) c.construct.deathBurst = burst;
    }
    // THE MASS GRAFT (Unmoored): the working stands FREE — a real weight on
    // the sheet (explicit, or derived from the body like any monster) and
    // the massed flag pushActor's construct anchor yields to. The mass
    // fabric owns everything after: shove authority, the bowling lane,
    // arrested-momentum wounds, crowd shoulders.
    {
      const massed = socketSpec(sourceInst, 'massGraft');
      if (massed) {
        c.sheet.setBase('weight', massed.weight
          ?? Math.pow(c.radius / DEFENSE_CFG.weight.refRadius, DEFENSE_CFG.weight.radiusPow));
        c.construct.massed = true;
      }
    }

    // Placement: at the cursor (clamped to placeRange), facing the aim —
    // or at an explicit override (barrier wall segments). THE CONSTRUCT'S
    // STORY (layer sovereignty): the working stands on its caster's layer —
    // the flight law's sibling — so its rings, its bell, and the mallet's
    // answer all stay one story's conversation. Flat zones read 0 as ever.
    c.tier = tier;
    const placeRange = d.placeRange ?? 100;
    const dd = dist(caster.pos, aim);
    const ang = angleTo(caster.pos, aim);
    const reach = Math.min(dd, placeRange);
    c.pos = nativeHost.clampPos(at ? vec(at.x, at.y) : vec(
      caster.pos.x + Math.cos(ang) * reach,
      caster.pos.y + Math.sin(ang) * reach), c.radius, undefined, { mover: c });
    c.facing = ang;
    // CLEARWAY: the rising object SHOVES overlapping actors out of its
    // footprint — a wall arriving under a goblin relocates the goblin.
    if (d.clearway) {
      for (const e of nativeHost.actors) {
        if (e === c || e.dead || e.construct || e.anchored || e.leap || !sameStory(c, e)) continue;
        const gap = c.radius + e.radius + 6 - dist(c.pos, e.pos);
        if (gap <= 0) continue;
        nativeHost.pushActor(e, dist(c.pos, e.pos) < 1
          ? rand(0, Math.PI * 2) : angleTo(c.pos, e.pos), gap + 12, caster, sourceInst);
      }
    }

    // Domes intercept projectiles in a radius scaled by area modifiers.
    // Mirror Coating (domeDeflects stat) flips dissolve into deflect.
    if (d.kind === 'dome') {
      c.construct.domeRadius = (d.domeRadius ?? 100) * caster.sheet.get('aoeRadius', tags, extra);
      c.construct.domeMode = caster.sheet.get('domeDeflects', tags, extra) > 0
        ? 'deflect' : (d.domeMode ?? 'dissolve');
      c.construct.domeSlow = d.domeSlow;
    }
    // INCUBATION (kind 'pod'): the payload hatched at maturity — or, under
    // the powder rule, when the pod is broken (see hatchPod).
    if (d.hatch) c.construct.hatch = d.hatch;
    // Follower relics glide; bells ring when struck; taunt bells beg for it.
    if (d.follows) c.construct.follows = true;
    if (d.castOnStruck) c.construct.castOnStruck = true;
    if (d.taunt) c.taunt = true;

    // Gates arrive looking for a partner: pair with an unpaired gate from
    // the same skill, or stand alone awaiting the second cast.
    if (d.kind === 'gate') {
      const other = nativeHost.actors.find(a =>
        a !== c && !a.dead && a.owner === caster
        && a.construct?.kind === 'gate' && a.sourceSkillId === sourceInst.def.id
        && a.gateLink === undefined);
      if (other) {
        other.gateLink = c.id;
        c.gateLink = other.id;
      }
    }

    // Pylons radiate an aura of their own (same spec as aura skills).
    if (d.aura) {
      c.activeAuras.set(sourceInst.def.id, {
        inst: sourceInst, spec: d.aura,
        radius: d.aura.radius * caster.sheet.get('aoeRadius', tags, extra),
        shape: caster.sheet.get('aoeShape', tags, extra),
        remaining: Infinity, reserved: 0, pulseTimer: 0,
        affected: new Set(),
      });
    }

    { nativeHost.actors.push(c); nativeHost.admitCombatBirth(c); }
    // Tethers: the deployed object may trail a band back to its caster, or
    // web itself into its siblings (Tripwire, Transient Inferno).
    nativeHost.attachObjectTethers(c, sourceInst, caster);
    // VIOLENT GENESIS (ConstructFxSpec.burst): the arrival is an event —
    // the segment erupts as it plants (the inverse-Martyrdom beat).
    const burst = c.construct.fx?.burst;
    if (burst) {
      const radius = burst.radius * caster.sheet.get('aoeRadius', tags, extra);
      for (const e of nativeHost.enemiesOf(c)) {
        if (dist(c.pos, e.pos) - e.radius > radius) continue;
        nativeHost.resolveHit(c, sourceInst, e, burst.damageScale ?? 0.5, 1);
      }
      nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius, color: c.color, life: 0.25, maxLife: 0.25 });
    }
    if (!nativeHost.presenceArrival(c, caster, sourceInst))
      nativeHost.flashes.push({ pos: vec(c.pos.x, c.pos.y), radius: 22, color: c.color, life: 0.3, maxLife: 0.3 });
    return c;
  }

export function sceneGuardianFor(nativeHost: NativeSceneCombatHost, victim: Actor): Actor | null {
    if (victim.isGuarding()) return victim;
    const owner = victim.owner;
    if (owner && !owner.dead && sameStory(owner, victim) && owner.isGuarding() && dist(owner.pos, victim.pos) <= 240) {
      const inst = owner.casting!.inst;
      if (owner.sheet.get('guardAegis', skillContextTags(inst), instanceMods(inst)) > 0) {
        return owner;
      }
    }
    return null;
  }

export function sceneSpringAmbush(nativeHost: NativeSceneCombatHost, a: Actor, quiet = false): void {
    if (!a.ambushArmed || a.dead) return;
    a.ambushArmed = false;
    a.untargetable = false;
    a.sheet.setSource('ambush', []);
    const spec = a.ambushSpec ?? (a.defId ? MONSTERS[a.defId]?.ambush : undefined);
    // THE EMERGENCE GRAMMAR: the reveal IS the drawing — the body rises
    // through its ground / condenses / stirs (the ambush row's override, the
    // def's row, the seat's ground); the old ring + caption retired. A
    // visible ambusher (already standing) stirs rather than climbs.
    nativeHost.emergeBody(a, { spec: spec?.emerge ?? (spec?.visible ? { motion: 'stir' } : undefined) });
    if (spec?.pack) {
      for (const k of nativeHost.actors) {
        if (k === a || k.dead || !k.ambushArmed || k.team !== a.team || !sameStory(k, a)) continue; // (the sovereignty gate)
        if (dist(a.pos, k.pos) <= spec.pack) nativeHost.springAmbush(k, true);
      }
    }
  }

export function sceneReleaseStruckSummons(nativeHost: NativeSceneCombatHost, caster: Actor, inst: SkillInstance, touches: (body: Actor) => boolean, struck?: Set<number>, direction = caster.facing): void {
    const receptive = nativeHost.strikeReleaseBodies.get(caster);
    if (!receptive?.size) return; // ordinary melee pays no world-wide census
    const tags = skillContextTags(inst);
    for (const body of [...receptive]) {
      if (body.dead || !nativeHost.actors.includes(body)) { receptive.delete(body); continue; }
      if (body.owner !== caster || body.team !== caster.team || body.dead || body.downed || body.summonReform
        || body.untargetable || body.summonOffspring || body.summonInst?.companionGrant || !sameStory(caster, body)
        || !body.summonInst || struck?.has(body.id) || !touches(body)) continue;
      const d = instanceDelivery(body.summonInst);
      const release = d.type === 'summon' ? d.strikeRelease : undefined;
      if (!release || !release.tags.every(tag => tags.has(tag))) continue;
      const payload = body.skills.find(skill => skill?.def.id === release.skill);
      if (!payload || payload.def.delivery.type !== 'projectile') continue;
      struck?.add(body.id);
      const duration = Math.max(0.1, release.reformTime * caster.sheet.get('minionRespawnTime',
        skillContextTags(body.summonInst), instanceMods(body.summonInst)));
      body.summonReform = { remaining: duration, duration, invulnerable: body.invulnerable, untargetable: body.untargetable };
      body.invulnerable = true; body.untargetable = true; body.casting = null;
      body.sheet.setSource('summon:reform', [mod('moveSpeed', 'more', -1)]);
      body.facing = direction;
      nativeHost.executeSkill(body, payload, vec(body.pos.x + Math.cos(direction) * 800, body.pos.y + Math.sin(direction) * 800),
        { keepFacing: true, noCooldown: true, noRepeat: true, componentUse: true });
    }
  }

