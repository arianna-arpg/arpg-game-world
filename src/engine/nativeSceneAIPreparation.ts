import {observeNativeCombatRetirement,finishNativeCombatRetirement,cancelNativeCombatRetirement} from './nativeCombatRecordObservation';
/** Exact native AI preparation and navigation closure; area policy stays in its actual owner. */

import {refugeDeparture} from './refugeDeparture';

import {dist, vec, type Vec2} from '../core/math';

import {Actor} from './actor';

import {BEHAVIOR_CFG} from './brain';

import {convertRuleHolds, instanceConvert, type SkillInstance} from './skills';

import {SKILLS} from '../data/skills';

import {MONSTERS} from '../data/monsters';

import {mimicPowerMods, mimicSelected} from './mimic';

import {pitAt} from './pitfall';

import {linkSpanOf, tierElevOf, tierLinkOf} from './tiers';

import {type PathProfile} from '../world/walk';

import {regionKind, regionPathCost} from '../world/regions';

import {LOS_CFG} from './los';

import type {World} from './world';

import type {NativeSkillRuleHost} from './nativeSkillRuleHost';

export interface NativeSceneAIPreparationHost extends NativeSkillRuleHost {

 actorById:World["actorById"];

 actors:World["actors"];

 bridges:World["bridges"];

 castSealed:World["castSealed"];

 comboCursorOf:World["comboCursorOf"];

 comboQueuedStep:World["comboQueuedStep"];

 comboStepOf:World["comboStepOf"];

 despawnPartsOf:World["despawnPartsOf"];

 drops:World["drops"];

 engageTokens:World["engageTokens"];

 flashes:World["flashes"];

 groundInsured:World["groundInsured"];

 huntBeast:World["huntBeast"];

 levitating:World["levitating"];

 lineOfSight:World["lineOfSight"];

 losMemo:World["losMemo"];

 lures:World["lures"];

 massRuntime:World["massRuntime"];

 mintMetaInstance:World["mintMetaInstance"];

 nativeSettlementGrid:World["nativeSettlementGrid"];

 odyssey:World["odyssey"];

 onBeastEscape:World["onBeastEscape"];

 pathField:World["pathField"];

 pathProfiles:World["pathProfiles"];

 pickRovingDest:World["pickRovingDest"];

 pitHomeKinds:World["pitHomeKinds"];

 ringClaims:World["ringClaims"];

 sim:World["sim"];

 slipAway:World["slipAway"];

 spoilStoryAt:World["spoilStoryAt"];

 text:World["text"];

 tierCrossings:World["tierCrossings"];

 tierLinkSeats:World["tierLinkSeats"];

 tierSeats:World["tierSeats"];

 time:World["time"];

 walk:World["walk"];

 zone:World["zone"];

 zoneMap:World["zoneMap"];

 zonePits:World["zonePits"];

}

export const LOS_PAIR_STRIDE = 1 << 26;

export const NATIVE_AI_PATH_DEFAULT: PathProfile = { key: 'default', costOf: regionPathCost };

export const NATIVE_AI_PATH_UNIFORM: PathProfile = { key: 'uniform', costOf: () => 1 };

export const NATIVE_AI_NO_SEATS: readonly Vec2[] = [];

export function sceneClaimRingSlot(nativeHost:NativeSceneAIPreparationHost, actor: Actor, target: Actor, front: number): number {
    let claims = nativeHost.ringClaims.get(target.id);
    if (!claims) { claims = []; nativeHost.ringClaims.set(target.id, claims); }
    const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
    const approach = Math.atan2(actor.pos.y - target.pos.y, actor.pos.x - target.pos.x);
    const sep = BEHAVIOR_CFG.ringSep;
    const mine = claims.find(c => c.actorId === actor.id);
    if (mine) {
      mine.at = nativeHost.time;
      // A LIVE ring: when the claimant's CURRENT bearing sits clear of every
      // other claim, the slot re-seats there — a fight that MOVES drags its
      // ring along. A stale world-absolute slot behind a fleeing target is
      // a tail-chase that never bites; separation still holds, so the
      // discipline survives the pursuit.
      if (!claims.some(c => c !== mine && Math.abs(wrap(c.ang - approach)) < sep)) {
        mine.ang = approach;
      }
      actor.aiRingTarget = target.id;
      actor.aiRingAt = nativeHost.time;
      return mine.ang;
    }
    let ang: number;
    if (claims.length < Math.max(1, front)) {
      // Vanguard: bite from where you came — nudged sideways until clear of
      // earlier claims, so three abreast becomes a short arc, not a stack.
      ang = approach;
      for (let guard = 0; guard <= claims.length; guard++) {
        const near = claims.find(c => Math.abs(wrap(c.ang - ang)) < sep);
        if (!near) break;
        const side = wrap(ang - near.ang) >= 0 ? 1 : -1;
        ang = wrap(near.ang + side * sep);
      }
    } else {
      // The front is manned: wrap to the midpoint of the LARGEST free arc —
      // the flanks first, then squarely behind.
      const sorted = claims.map(c => c.ang).sort((a, b) => a - b);
      let bestGap = -1;
      ang = wrap(sorted[0] + Math.PI);
      for (let i = 0; i < sorted.length; i++) {
        const a0 = sorted[i];
        const a1 = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
        const gap = a1 - a0;
        if (gap > bestGap) { bestGap = gap; ang = wrap(a0 + gap / 2); }
      }
    }
    claims.push({ actorId: actor.id, ang, at: nativeHost.time });
    actor.aiRingTarget = target.id;
    actor.aiRingAt = nativeHost.time;
    return ang;
  }

export function sceneFallHazardAt(nativeHost:NativeSceneAIPreparationHost, a: Actor, x: number, y: number): boolean {
    // Ground first (a byte read / a handful of disc compares) — the actor-
    // side exemptions (stat query for levitation) only run when a fall
    // boundary is actually ahead.
    let kindId: string | undefined;
    const wf = nativeHost.walk;
    if (wf?.regionAt) {
      const k = wf.regionAt(x, y);
      const rk = regionKind(k);
      if (rk && !rk.walkable && !rk.blocks) {
        const bp = rk.boundaryPolicy?.kind;
        if (bp === 'fall' || bp === 'skyfall' || bp === 'descend' || bp === 'eject' || bp === 'instakill') kindId = k;
      }
    }
    if (kindId === undefined) {
      // Fall-able pit doodads (engine/pitfall.ts): pitAt honors spanning
      // decks and the pit-kind insurance exactly as the mover does. Every
      // registered pit region is fall-family by validation, so a covering
      // surface IS the hazard — no per-policy re-resolution here.
      const pits = nativeHost.zonePits();
      if (pits.length) {
        const over = pitAt(pits, nativeHost.bridges, x, y, nativeHost.pitHomeKinds(a, pits));
        if (over) kindId = over.region;
      }
    }
    if (kindId === undefined) return false;
    if (a.flying || a.dash || a.leap || a.caromRun || nativeHost.levitating(a)) return false;
    return !nativeHost.groundInsured(a, kindId);
  }

export function sceneFleeIntoRefuge(nativeHost:NativeSceneAIPreparationHost, actor: Actor, target: Vec2): void {
    const { cue, duration } = refugeDeparture(actor, target);
    nativeHost.despawnPartsOf(actor);
    const i = nativeHost.actors.indexOf(actor);
    if (i >= 0) {
      let nativeRetirement:ReturnType<typeof observeNativeCombatRetirement>;
      const nativeSelect=(selected:Actor[])=>{nativeRetirement=observeNativeCombatRetirement(nativeHost,selected);return selected;};
      try { nativeSelect(nativeHost.actors).splice(i, 1); finishNativeCombatRetirement(nativeHost,nativeRetirement); }
      finally { cancelNativeCombatRetirement(nativeHost,nativeRetirement); }
    }
    nativeHost.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 60,
      color: actor.color, life: duration, maxLife: duration, fx: 'refuge', departure: cue });
  }

export function sceneLosCached(nativeHost:NativeSceneAIPreparationHost, a: Actor, b: Actor): boolean {
    // THE PAIR STRIDE (the M6 plan's finding, 2026-10-10): the memo packs
    // the ordered pair as a.id * stride + b.id. The old stride of 1e6 made
    // two pairs share one entry once ids passed a million, which a
    // long-lived shard reaches (dormancy re-mints every woken native). The
    // stride is 2^26 now (exact in a double up to a.id < 2^27), and a pair
    // beyond it marches its ray unmemoized instead of ever colliding. The
    // jitter below keeps hashing the OLD composite, so every pair under a
    // million ids wears the same deterministic expiry offset as before.
    if (a.id >= LOS_PAIR_STRIDE || b.id >= LOS_PAIR_STRIDE) return nativeHost.lineOfSight(a.pos, b.pos, a.tier, b.tier);
    const key = a.id * LOS_PAIR_STRIDE + b.id;
    const hit = nativeHost.losMemo.get(key);
    if (hit && hit.until > nativeHost.time) return hit.ok;
    const ok = nativeHost.lineOfSight(a.pos, b.pos, a.tier, b.tier);
    if (nativeHost.losMemo.size > 4096) {
      let drop = nativeHost.losMemo.size - 3072;
      for (const k of nativeHost.losMemo.keys()) {
        nativeHost.losMemo.delete(k);
        if (--drop <= 0) break;
      }
    }
    // DE-SYNCHRONIZED expiry (LOS_CFG.memoJitter): a zone load seeds whole
    // cohorts of pairs in one tick — on a SHARED TTL they all expire, all
    // re-march their rays and all re-stamp the same deadline every cycle
    // forever (the measured crowded-zone stampede). Each pair instead wears
    // a deterministic offset hashed off its OWN key: same freshness on
    // average, expiries spread across the window, and no draw from any rng
    // stream (seeded sim runs stay byte-identical).
    const j = LOS_CFG.memoJitter;
    const legacyKey = a.id * 1_000_000 + b.id; // THE PAIR STRIDE: the jitter's hash input, unchanged
    const ttl = j > 0
      ? LOS_CFG.memoTtl * (1 - j / 2 + j * ((Math.imul(legacyKey, 0x9E3779B1) >>> 16) / 65536))
      : LOS_CFG.memoTtl;
    nativeHost.losMemo.set(key, { ok, until: nativeHost.time + ttl });
    return ok;
  }

export function sceneLureFor(nativeHost:NativeSceneAIPreparationHost, a: Actor): { pos: Vec2; pace: number; standoff: number; tier?: number } | null {
    if (!nativeHost.lures.size || a.passive || a.team !== 'enemy') return null;
    let best: { pos: Vec2; pace: number; standoff: number; tier?: number } | null = null;
    let bd = Infinity;
    for (const [id, l] of nativeHost.lures) {
      if (nativeHost.time > l.until) { nativeHost.lures.delete(id); continue; }
      const d = dist(a.pos, l.pos);
      if (d <= l.radius && d < bd) { bd = d; best = { pos: l.pos, pace: l.pace, standoff: l.standoff, tier: l.tier }; }
    }
    return best;
  }

export function sceneOnFleeArrive(nativeHost:NativeSceneAIPreparationHost, actor: Actor): void {
    if (nativeHost.odyssey.escaped(actor)) return;
    actor.aiFleeing = false;
    if (nativeHost.onBeastEscape(actor)) return; // the Hunt handled it (migrated + despawned)
    nativeHost.slipAway(actor, `${actor.name} slips away!`);
  }

export function scenePathProfileFor(nativeHost:NativeSceneAIPreparationHost, a: Actor): PathProfile {
    const mode = a.aiHazardMode;
    if (mode === 'heedless' || mode === 'lemming') return NATIVE_AI_PATH_UNIFORM;
    const hab = a.habitat?.kind;
    if (!a.pathCosts && !a.immuneGround && hab === undefined) return NATIVE_AI_PATH_DEFAULT;
    // Deviation-bearing bodies memo their profile (the sources are spawn-
    // static; anything that ever grafts pathCosts/immuneGround mid-life must
    // clear pathProfileMemo — see the Actor field doc).
    const memo = a.pathProfileMemo;
    if (memo && memo.mode === mode) return memo.p;
    // Deviations from the default view: insured kinds neutralize, overrides win.
    const dev: Record<string, number> = {};
    if (hab !== undefined) dev[hab] = 1;
    if (a.immuneGround) for (const k of a.immuneGround) dev[k] = 1;
    if (a.pathCosts) for (const k in a.pathCosts) dev[k] = a.pathCosts[k];
    const key = Object.keys(dev).sort().map(k => k + ':' + dev[k]).join('|');
    let p = nativeHost.pathProfiles.get(key);
    if (!p) {
      p = { key, costOf: (kind: string) => dev[kind] ?? regionPathCost(kind) };
      nativeHost.pathProfiles.set(key, p);
    }
    a.pathProfileMemo = { mode, p };
    return p;
  }

export function scenePressUsable(nativeHost:NativeSceneAIPreparationHost, caster: Actor, inst: SkillInstance): boolean {
    if (nativeHost.castSealed(caster, inst)) return false; // THE CAST SEAL — the brain never presses a sealed cast
    // A mimic slot presses as its selection — empty bank, dead button.
    if (inst.def.mimic) {
      const sel = mimicSelected(caster, nativeHost.time);
      if (!sel || !SKILLS[sel.sid]) return false;
      const minted = nativeHost.mintMetaInstance(caster, inst, sel.sid);
      minted.sockets = inst.sockets;
      minted.extraMods = mimicPowerMods(inst.def.mimic);
      return caster.canUse(minted);
    }
    // A queued chain step is judged as the step it would cast (the face
    // the bar shows) — an unaffordable finisher greys the slot honestly.
    const step = nativeHost.comboQueuedStep(caster, inst);
    if (step) return caster.canUse(step);
    const conv = instanceConvert(inst);
    if (conv && SKILLS[conv.skillId]
      && convertRuleHolds(conv.when, caster, inst, nativeHost)) {
      const minted = nativeHost.mintMetaInstance(caster, inst, conv.skillId);
      minted.sockets = inst.sockets; // same sharing rule as the press itself
      return caster.canUse(minted);
    }
    return caster.canUse(inst);
  }

export function sceneRecentTierCrossing(nativeHost:NativeSceneAIPreparationHost, a: Actor): { x: number; y: number } | null {
    if (!nativeHost.zone.tiers || !nativeHost.tierCrossings.length) return null;
    const ref = a.aiLastSeen ?? a.pos;
    let best: { x: number; y: number } | null = null;
    let bestD = 600;
    for (const c of nativeHost.tierCrossings) {
      if (nativeHost.time - c.at > 10 || c.team === a.team) continue;
      const d = Math.hypot(c.x - ref.x, c.y - ref.y);
      if (d < bestD) { bestD = d; best = { x: c.x, y: c.y }; }
    }
    return best;
  }

export function sceneRequestEngage(nativeHost:NativeSceneAIPreparationHost, actor: Actor, targetId: number, max: number): boolean {
    const key = `${actor.squadId}:${targetId}`;
    let held = nativeHost.engageTokens.get(key);
    if (!held) { held = []; nativeHost.engageTokens.set(key, held); }
    if (!held.includes(actor.id)) {
      if (held.length >= Math.max(1, max)) return false;
      held.push(actor.id);
    }
    actor.aiTokenKey = key;
    actor.aiTokenAt = nativeHost.time;
    return true;
  }

export function sceneSanctuaryRetreat(nativeHost:NativeSceneAIPreparationHost, a: Actor): Vec2 | undefined {
    return nativeHost.massRuntime?.settlement?.sanctuary.retreat(a,
      a.aiTargetId === undefined ? undefined : nativeHost.actorById(a.aiTargetId) ?? undefined,
      guard => nativeHost.lineOfSight(a.pos, guard.pos, a.tier, guard.tier));
  }

export function sceneSeekLoot(nativeHost:NativeSceneAIPreparationHost, actor: Actor, range: number): { x: number; y: number; tier: number } | null {
    const spec = actor.defId ? MONSTERS[actor.defId]?.looter : undefined;
    const kinds = spec?.kinds ?? ['skill', 'support'];
    let best: { x: number; y: number; tier: number } | null = null;
    let bd = range;
    for (const d of nativeHost.drops) {
      if (d.droppedBy || d.grace) continue;
      if (!kinds.includes(d.item.kind)) continue;
      const dd = dist(actor.pos, d.pos);
      // The goal carries the shiny's story (the investigation-crosses law).
      if (dd < bd) { bd = dd; best = { x: d.pos.x, y: d.pos.y, tier: d.tier ?? nativeHost.spoilStoryAt(d.pos) }; }
    }
    return best;
  }

export function sceneTierLinkToward(nativeHost:NativeSceneAIPreparationHost, a: Actor, goal: { x: number; y: number }, goalTier?: number): Vec2 | null {
    if (!nativeHost.zone.tiers) return null;
    const pf = nativeHost.pathField(a.tier);
    if (!pf?.pathStep || !pf.regionAt || !pf.reachable) return null;
    // A GOAL CARRIES ITS STORY (the investigation-crosses law): a goal
    // known to stand on ANOTHER story elects a crossing even when this
    // story's floor also owns the cell (a deck over the valley, a hall over
    // the common room) — the flat read's "own-floor goal" is a lie there.
    const away = goalTier !== undefined && goalTier !== a.tier;
    if (!away && pf.isWalkable(goal.x, goal.y)) return null; // own-floor goals field directly
    if (!away && tierElevOf(pf.regionAt(goal.x, goal.y)) === null) return null;
    let best: Vec2 | null = null, bestD = Infinity;
    for (const s of nativeHost.tierLinkSeats()) {
      if (!pf.isWalkable(s.x, s.y) || !pf.reachable(a.pos, s)) continue;
      // A known goal story prefers a crossing whose span touches it (the
      // N-story ladder: a bench-to-summit stair is no road to the valley);
      // with none in reach, distance decides as it always did.
      let spanOk = true;
      if (goalTier !== undefined) {
        const rk = regionKind(pf.regionAt(s.x, s.y) ?? '');
        if (rk?.tierLink) { const [lo, hi] = linkSpanOf(rk); spanOk = goalTier === lo || goalTier === hi; }
      }
      const d = Math.hypot(s.x - a.pos.x, s.y - a.pos.y) + Math.hypot(goal.x - s.x, goal.y - s.y) + (spanOk ? 0 : 1e6);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

export function sceneOnBeastEscape(nativeHost:NativeSceneAIPreparationHost, actor: Actor): boolean {
    if (actor.tag !== 'hunt_beast') return false;
    const hf = nativeHost.sim.huntField;
    if (!hf) return false;
    // Flee to the nearest VALID adjacent zone (never the safe town / a cave) —
    // generating a frontier if it bolted into the unknown. If there's nowhere safe
    // to bolt (only a sanctuary / dead end), it's CORNERED: it turns to fight here
    // rather than rampaging through Lastlight. Return true either way so the generic
    // flee-arrival (a plain despawn) never deletes the beast.
    const dest = nativeHost.pickRovingDest(actor.pos);
    if (!dest) {
      // It makes its stand HERE — but SHED the flee-phase mods first (the big move-speed
      // + damage-reduction buffs that let it run): a beast that migrates respawns with a
      // clean sheet, so a cornered one must drop them too, or it fights as a near-
      // unkillable sponge at 70-75% damage reduction.
      actor.sheet.setSource('aiPhase', []);
      actor.aiFleeGoal = undefined;
      // A cornered stand is still a STAND: record the wound + the spent phase
      // into the remembrance (migrate-in-place) exactly as a migration would,
      // or leave-and-return re-spawns at the stale phase and the same flee
      // threshold fires again — an extra migration beyond the authored count.
      hf.setLife(actor.life / Math.max(1, actor.maxLife()));
      hf.migrate(nativeHost.zone.id, actor.aiPhaseIdx);
      nativeHost.text(vec(actor.pos.x, actor.pos.y - 30),
        `${actor.name} is cornered — it turns to fight!`, '#d8a83a', 15);
      return true;
    }
    hf.setLife(actor.life / Math.max(1, actor.maxLife())); // last sync before it leaves
    hf.migrate(dest, actor.aiPhaseIdx);
    nativeHost.despawnPartsOf(actor); // a composite's parts flee WITH it (never orphaned mid-cast)
    const i = nativeHost.actors.indexOf(actor);
    if (i >= 0) {
      let nativeRetirement:ReturnType<typeof observeNativeCombatRetirement>;
      const nativeSelect=(selected:Actor[])=>{nativeRetirement=observeNativeCombatRetirement(nativeHost,selected);return selected;};
      try { nativeSelect(nativeHost.actors).splice(i, 1); finishNativeCombatRetirement(nativeHost,nativeRetirement); }
      finally { cancelNativeCombatRetirement(nativeHost,nativeRetirement); }
    }
    nativeHost.huntBeast = null;
    nativeHost.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 90, color: '#d8a83a', life: 0.6, maxLife: 0.6 });
    nativeHost.text(vec(actor.pos.x, actor.pos.y - 30),
      `${actor.name} flees to ${nativeHost.zoneMap[dest]?.name ?? dest}!`, '#d8a83a', 15);
    return true;
  }

export function sceneComboQueuedStep(nativeHost:NativeSceneAIPreparationHost, caster: Actor, inst: SkillInstance): SkillInstance | null {
    const chain = inst.def.comboChain;
    if (!chain?.skills.length) return null;
    const st = nativeHost.comboCursorOf(caster, inst);
    if (st.comboAt === undefined) return null;
    if (nativeHost.time - st.comboAt > chain.window) return null;
    return nativeHost.comboStepOf(caster, inst, st.comboIdx ?? 0);
  }

export function sceneTierLinkSeats(nativeHost:NativeSceneAIPreparationHost): readonly Vec2[] {
    const base = nativeHost.nativeSettlementGrid();
    if (!nativeHost.zone.tiers || !base) return NATIVE_AI_NO_SEATS;
    if (nativeHost.tierSeats && nativeHost.tierSeats.walk === base && nativeHost.tierSeats.v === base.version) {
      return nativeHost.tierSeats.arr;
    }
    const cs = base.cell, cols = base.cols, rows = base.rows;
    const linkOf = new Map<string, boolean>(); // kind → crossing verdict
    const isLink = (gx: number, gy: number): boolean => {
      const k = base.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
      let l = linkOf.get(k);
      if (l === undefined) { l = tierLinkOf(k); linkOf.set(k, l); }
      return l;
    };
    const seen = new Uint8Array(cols * rows);
    const arr: Vec2[] = [];
    const q: number[] = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (seen[gy * cols + gx] || !isLink(gx, gy)) continue;
        q.length = 0;
        q.push(gy * cols + gx);
        seen[gy * cols + gx] = 1;
        let sx = 0, sy = 0;
        for (let h = 0; h < q.length; h++) {
          const c = q[h], cx = c % cols, cy = (c / cols) | 0;
          sx += cx; sy += cy;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const n = ny * cols + nx;
            if (seen[n] || !isLink(nx, ny)) continue;
            seen[n] = 1; q.push(n);
          }
        }
        const mx = sx / q.length, my = sy / q.length;
        let best = q[0], bd = Infinity;
        for (const c of q) {
          const d = (c % cols - mx) ** 2 + (((c / cols) | 0) - my) ** 2;
          if (d < bd) { bd = d; best = c; }
        }
        arr.push(vec((best % cols) * cs + cs / 2, ((best / cols) | 0) * cs + cs / 2));
      }
    }
    nativeHost.tierSeats = { arr, walk: base, v: base.version };
    return arr;
  }
