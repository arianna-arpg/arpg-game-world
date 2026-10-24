/** Exact native defense packet preparation, combat cues and drive/rune taps.
 * Damage resolution, death execution and ticking remain separate. */
import type {World} from "./world";
import {angleDiff,angleTo,clamp,dist,type Vec2} from '../core/math';
import {REACTIVE_CUE_CFG} from '../data/combatReadability';
import {Actor,shellArcFactor,type CastingState,type Team} from './actor';
import {type DamagePacket} from './damage';
import {COMMAND_CFG} from './ai';
import {normalizeBrain} from './brain';
import {grantedTags,guardBashSpec,instanceMods,BASH_CFG,skillContextTags,type SkillDef} from './skills';
import {type DeathBurstDef} from '../data/monsters';
import {runeForCast} from './invocation';
import {defenseCueFlash} from './defenseCues';
import {combatCueFlash} from './combatCues';
export interface NativeSceneDefensePreparationApi {
tryShellPool(victim: Actor, threatPos: Vec2, packet: DamagePacket, sg: Actor['shellGuard']): boolean;
showCombatOutcome(a: Actor, style: 'hit_cap' | 'culled' | 'last_gasp' | 'volatile_release', source?: Vec2, color?: string): void;
refreshGuardBash(a: Actor, cs: CastingState): void;
isBurstTarget(e: Actor, sourceTeam: Team, sourceTier?: number): boolean;
resolveDeathBurst(a: Actor): DeathBurstDef | null;
bankRune(caster: Actor, def: SkillDef): void;
bumpDrives(actor: Actor | null, kind: 'onKill' | 'onHurt' | 'onDealt' | 'onAllyDeath'): void;
}
export interface NativeSceneDefensePreparationHost {readonly actors:World["actors"];readonly flashes:World["flashes"];readonly time:World["time"]}
export function sceneTryShellPool(host:NativeSceneDefensePreparationHost,victim: Actor, threatPos: Vec2, packet: DamagePacket, sg: Actor['shellGuard']): boolean {
    if (!sg || sg.broken || sg.pool <= 0) return false;
    if (sg.side !== 'all') {
      const center = victim.facing + (sg.side === 'rear' ? Math.PI : 0);
      // BREATHING shells (shellGuard.breathe): the covered arc swells and
      // wanes on its period — the trough is the opening you time. The
      // renderer's glyph draws the SAME live factor: read it, then strike.
      const arc = (sg.arcDeg * Math.PI / 180) * shellArcFactor(sg, host.time);
      if (Math.abs(angleDiff(center, angleTo(victim.pos, threatPos))) > arc / 2) return false;
    }
    const raw = Object.values(packet.amounts).reduce((s, v) => s + (v ?? 0), 0);
    if (raw <= 0) return false;
    sg.lastHitAt = host.time;
    const absorb = Math.min(sg.pool, raw);
    sg.pool -= absorb;
    if (sg.pool <= 0) {
      sg.broken = true;
      host.flashes.push(defenseCueFlash(victim, 'shell', 'break', sg.color, { style: sg.shellVisual,
        facing: victim.facing + (sg.side === 'rear' ? Math.PI : 0),
        arc: sg.side === 'all' ? Math.PI * 2 : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, host.time) }));
    }
    if (!sg.broken) host.flashes.push(defenseCueFlash(victim, 'shell', 'impact', sg.color,
      { style: sg.shellVisual, facing: angleTo(victim.pos, threatPos), arc: 0.85 }));
    if (absorb >= raw) {
      return true; // fully eaten — statuses and knockback with it
    }
    // The breaking blow: only the overflow lands.
    const k = (raw - absorb) / raw;
    for (const t of Object.keys(packet.amounts) as (keyof typeof packet.amounts)[]) {
      packet.amounts[t]! *= k;
    }
    return false;
  }

export function sceneShowCombatOutcome(host:NativeSceneDefensePreparationHost,a: Actor, style: 'hit_cap' | 'culled' | 'last_gasp' | 'volatile_release', source?: Vec2, color?: string): void {
    const facing = source ? Math.atan2(a.pos.y - source.y, a.pos.x - source.x) : 0;
    host.flashes.push(combatCueFlash(a.pos, style, a.radius + REACTIVE_CUE_CFG.eventPad, facing, color));
  }

export function sceneRefreshGuardBash(host:NativeSceneDefensePreparationHost,a: Actor, cs: CastingState): void {
    const bash = guardBashSpec(cs.inst);
    if (!bash) { cs.bashAt = undefined; cs.bashLow = undefined; cs.bashArmAt = undefined; return; }
    const tags = skillContextTags(cs.inst.def, grantedTags(cs.inst));
    const extra = instanceMods(cs.inst);
    const floor = clamp(
      (bash.threshold ?? BASH_CFG.releaseFloor) * a.sheet.get('bashFloor', tags, extra),
      0, 1);
    const inverted = a.sheet.get('bashInvert', tags, extra) > 0;
    cs.bashAt = inverted ? 1 - floor : floor;
    cs.bashLow = inverted || undefined;
    // THE ARM CLOCK: held seconds before the release may convert — the
    // spec's armTime (default BASH_CFG.armTime) × the bashArmTime stat,
    // live like the line (a buff landing mid-stance moves the clock the
    // same frame). guardBashReady reads it beside the line for the
    // release, the HUD's arm meter and the AI's hold alike.
    cs.bashArmAt = Math.max(0,
      (bash.armTime ?? BASH_CFG.armTime) * a.sheet.get('bashArmTime', tags, extra));
  }

export function sceneIsBurstTarget(host:NativeSceneDefensePreparationHost,e: Actor, sourceTeam: Team, sourceTier = 0): boolean {
    // `sourceTier`: the blast's own story (the sovereignty gate) — a burst
    // on the deck scorches no valley body beneath it.
    return !e.dead && !e.downed && e.team !== sourceTeam && e.tier === sourceTier && !e.untargetable && !e.invulnerable;
  }

export function sceneResolveDeathBurst(host:NativeSceneDefensePreparationHost,a: Actor): DeathBurstDef | null {
    if (a.deathBurst) return a.deathBurst;
    if (a.explodeOnDeath > 0) return { mode: 'implode', damageFrac: a.explodeOnDeath, coalesce: 0.8 };
    return null;
  }

export function sceneBankRune(host:NativeSceneDefensePreparationHost,caster: Actor, def: SkillDef): void {
    if (caster.construct) return; // runeForCast never lets an autonomous device fuel its own invocation
    const invoker = caster.skills.find(s => s?.def.invokes);
    if (!invoker) return;
    const rune = runeForCast(def, invoker, caster.runes);
    if (!rune) return;
    const cap = Math.max(1, Math.round(caster.sheet.get('runeCap',
      skillContextTags(invoker.def), instanceMods(invoker))));
    while (caster.runes.length >= cap) caster.runes.shift(); // runeForCast still appends exactly once
    caster.runes.push(rune);
  }

export function sceneBumpDrives(host:NativeSceneDefensePreparationHost,actor: Actor | null, kind: 'onKill' | 'onHurt' | 'onDealt' | 'onAllyDeath'): void {
    // SOVEREIGNTY: sound — drives echo by earshot (the derived census, probe_tiers RIG T).
    if (!actor || actor.dead || !actor.brain) return;
    const drives = normalizeBrain(actor.brain).drives;
    if (!drives) return;
    for (const id in drives) {
      const spec = drives[id];
      // A KEPT body's stood-down appetite (DriveSpec.whileOwned false) takes
      // no event jumps either: the AI tick DELETES the meter (delete-never-
      // freeze, ai.ts), and a jump landing between ticks would flash a
      // sub-tick value through every read until that tick swept it. The
      // jump refuses to feed the dead meter; the tick stays the deleter.
      if (spec.whileOwned === false && actor.isMinion()) continue;
      const jump = spec[kind];
      if (!jump) continue;
      const v = (actor.drives.get(id) ?? 0) + jump;
      actor.drives.set(id, Math.max(0, Math.min(1, v)));
      const share = spec.share;
      if (share && actor.squadId !== undefined) {
        for (const kin of host.actors) {
          if (kin === actor || kin.dead || kin.squadId !== actor.squadId) continue;
          if (dist(kin.pos, actor.pos) > COMMAND_CFG.earshot) continue;
          // The echoed row honors the same leash on the receiving body.
          if (spec.whileOwned === false && kin.isMinion()) continue;
          const kv = (kin.drives.get(id) ?? 0) + jump * share;
          kin.drives.set(id, Math.max(0, Math.min(1, kv)));
        }
      }
    }
  }
