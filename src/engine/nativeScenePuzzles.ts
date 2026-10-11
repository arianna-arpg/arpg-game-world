/** Original native puzzle clocks, hit queue and completion; bound to an explicit owner. */
import {dist,rand,vec} from '../core/math';
import {Actor} from './actor';
import type {DamageType} from './stats';
import {STATUS_DEFS} from './status';
import {SKILLS} from '../data/skills';
import {makeSkillInstance} from './skills';
import {resolveLootTable} from './loot';
import {attunedStatus,toneTint,TUNE_CFG} from './tuning';
import {sameStory} from './tiers';
import {pickKnockNode,puzzleHumOf,puzzleKnockOf,puzzleRewardOf,puzzleSpillOf,type PuzzleRun} from './puzzles';
import type {World} from './world';
export interface NativeScenePuzzleHost {
 puzzles:World['puzzles'];
 puzzleKnocks:World['puzzleKnocks'];
 time:World['time'];
 actors:World['actors'];
 zone:World['zone'];
 flashes:World['flashes'];
 hazardCaster:World['hazardCaster'];
 drainPuzzleKnocks:World['drainPuzzleKnocks'];
 puzzleHost:World['puzzleHost'];
 spoilsSealed:World['spoilsSealed'];
 clampPos:World['clampPos'];
 dropGemAt:World['dropGemAt'];
 mintLootResult:World['mintLootResult'];
 executeSkill:World['executeSkill'];
}

export function sceneUpdatePuzzles(owner:NativeScenePuzzleHost, dt: number): void {
    owner.drainPuzzleKnocks();
    if (!owner.puzzles.length) return;
    for (const run of owner.puzzles) {
      if (!run.done) run.kind.tick?.(run, owner.puzzleHost(run), dt);
    }
  }

export function scenePuzzleStruck(owner:NativeScenePuzzleHost, node: Actor, striker: Actor | null, wounding: boolean): void {
    if (!node.puzzleNode) return;
    owner.puzzleKnocks.push({ node, striker, t: owner.time, wounding });
  }

export function sceneDrainPuzzleKnocks(owner:NativeScenePuzzleHost): void {
    const knocks = owner.puzzleKnocks;
    if (!knocks.length) return;
    owner.puzzleKnocks = [];
    if (!owner.puzzles.length) return;
    const groups = new Map<string, { run: PuzzleRun; striker: Actor | null; nodes: Actor[] }>();
    for (const k of knocks) {
      const pn = k.node.puzzleNode;
      if (!pn || k.node.dead) continue;
      const run = owner.puzzles.find(r => r.id === pn.id);
      if (!run || run.done || !run.kind.struck) continue;
      if (puzzleKnockOf(run) === 'wounding' && !k.wounding) continue;
      const who = run.spec.who ?? run.kind.who;
      if (who === 'player' && k.striker?.team !== 'player') continue;
      const key = `${run.id}|${k.striker?.id ?? -1}|${k.t}`;
      let g = groups.get(key);
      if (!g) groups.set(key, g = { run, striker: k.striker, nodes: [] });
      if (!g.nodes.includes(k.node)) g.nodes.push(k.node);
    }
    for (const g of groups.values()) {
      if (g.run.done) continue;
      const rung = puzzleSpillOf(g.run) === 'all'
        ? g.nodes : [pickKnockNode(g.nodes, g.striker)];
      // THE HUM at BLOW grain: a still-humming bell is spill, judged by
      // nothing; if ANY bell of this blow rings fresh, the blow claims the
      // ledger WHOLE — cleared once, then every rung bell hums together —
      // so a fan-out's echo (a re-fan of the same bells one frame later)
      // is swallowed as ONE knock, exactly like a single bell's double-tap.
      // The structural discriminator stands: a fresh bell from a LATER
      // blow clears the standing hums, so a legitimate return to a bell
      // always rings something else in between (or outlasts the hum).
      const fresh = rung.filter(n => (g.run.hums.get(n.id) ?? 0) <= owner.time);
      if (!fresh.length) continue;
      g.run.hums.clear();
      for (const n of fresh) g.run.hums.set(n.id, owner.time + puzzleHumOf(g.run));
      for (const node of fresh) {
        g.run.kind.struck!(g.run, node, owner.puzzleHost(g.run), g.striker);
        if (g.run.done) break;
      }
    }
  }

export function scenePuzzleTuned(owner:NativeScenePuzzleHost, node: Actor, tone: DamageType, striker: Actor | null): void {
    void striker;
    const pn = node.puzzleNode;
    if (!pn) return;
    const run = owner.puzzles.find(r => r.id === pn.id);
    if (!run || run.done || !run.kind.tuned) return;
    run.kind.tuned(run, node, owner.puzzleHost(run), tone);
  }

export function sceneCompletePuzzle(owner:NativeScenePuzzleHost, run: PuzzleRun): void {
    // SOVEREIGNTY: census — the puzzle's own reward pass (the derived census, probe_tiers RIG T).
    if (run.done) return;
    run.done = true;
    const goal = (run.state.goal as DamageType | undefined) ?? 'lightning';
    const tint = toneTint(goal);
    for (const n of run.nodes) {
      owner.flashes.push({
        pos: vec(n.pos.x, n.pos.y), radius: n.radius + 26,
        color: tint, life: 0.5, maxLife: 0.5,
      });
    }
    const rewardZone = run.rewardZone;
    const sealed = rewardZone ? rewardZone.spoils === 'none' : owner.spoilsSealed();
    const rw = puzzleRewardOf(run);
    if (rw?.gems) {
      for (let i = 0; i < rw.gems; i++) {
        owner.dropGemAt(vec(run.at.x + rand(-30, 30), run.at.y + rand(-30, 30)), undefined, false, run.rewardSource, undefined, undefined, rewardZone);
      }
    }
    // THE DIVERSIFIED POUR (2026-08-07): a reward TABLE resolves through the
    // standing loot fabric (engine/loot.ts — nestable tables, the drove-purse
    // routing) and lands through the ordinary drop primitives. UNOWED on
    // purpose: a riddle pays of the ground underfoot, not of a writ — sealed
    // (spoils 'none') ground refuses the mint exactly like the gem lane
    // above (the cheap skip is rollDrops' own idiom: no resolution, no rng).
    if (rw?.table && !sealed) {
      for (const res of resolveLootTable(rw.table, { ilvl: run.rewardLevel ?? owner.zone.level })) {
        const at = owner.clampPos(vec(run.at.x + rand(-30, 30), run.at.y + rand(-30, 30)), 10);
        owner.mintLootResult(at, res, false, run.rewardSource, rewardZone);
      }
    }
    if (rw?.washFor) {
      const sid = attunedStatus(goal);
      const sdef = STATUS_DEFS[sid];
      const scale = rw.washFor / Math.max(0.01, sdef?.duration ?? rw.washFor);
      for (const x of owner.actors) {
        if (x.dead || x.team !== 'player' || x.construct || x.passive) continue;
        if (run.owner && !sameStory(x, run.nodes[0])) continue;
        if (dist(x.pos, run.at) > TUNE_CFG.pulseRadius * 2) continue;
        x.applyStatus(sid, 0, scale, 'attunement');
      }
    }
    if (rw?.cast && SKILLS[rw.cast]) {
      if (!owner.hazardCaster) {
        const c = new Actor('Resonance', 'player', vec(0, 0));
        c.untargetable = true; c.invulnerable = true;
        owner.hazardCaster = c;
      }
      const caster = owner.hazardCaster;
      caster.level = Math.max(1, run.rewardLevel ?? owner.zone.level);
      caster.pos = vec(run.at.x, run.at.y);
      const inst = makeSkillInstance(SKILLS[rw.cast], 1 + Math.floor(caster.level / 3));
      owner.executeSkill(caster, inst, vec(run.at.x, run.at.y), { noCooldown: true, noRepeat: true });
    }
  }

/** The original spoils read over this area's own definition. */
export function scenePuzzleSpoilsSealed(owner:Pick<NativeScenePuzzleHost,'zone'>):boolean {
    return owner.zone.spoils === 'none';
  }
