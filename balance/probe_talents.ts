// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TALENT FABRIC on the real engine (docs/engine/talents.md):
// WoW-talent / Ascension-enchant mechanism shapes as plain data. Pins:
//   A. registry hygiene — CONDITION_IDS ⇔ the recency rows, the last-gasp
//      stats seated + blurbed, every debut proc/gem/affix/node resolves, THE
//      OPPORTUNIST'S ROW is placed, linked and clean, and the boot validator
//      raises no word about any of it;
//   B. THE VICTIM SCOPE — a 'vs:' tag scopes the ROLL (same seed, ×2
//      exactly against a low-life victim, ×1 against a full one), the fold
//      is null-cost until named, a status id is a victim tag for free, and
//      the end-to-end cleave kills only the wounded body;
//   C. THE RECENCY LEDGER — recentlyKilled rises on the kill and expires on
//      its window; notHurtRecently holds at birth and falls to a landed hit;
//      the condition EDGE queues an event ('condition' proc → a ward);
//   D. THE TRIGGERS — 'hurt' (Reprisal worn, then spent by melee hits),
//      'cast' (Adrenaline off a movement art), 'pulse' (Slow Burn banks
//      fury), 'minionDeath' (Necrotic Feast), 'heal' (Mending Ward), 'miss'
//      (Overpower, then spent), the 'vs' gate (Deep Freeze on a chilled
//      body), requireBuff/noCrit through the hit loop, and the targeted
//      cooldown effect;
//   E. DERIVED GAUGES + THE GAUGE GATE — life:missing publishes in tenths
//      and scales a mod, foes:near counts the crowd, an unreferenced gauge
//      is never sampled, gaugeAt is a threshold not a scale;
//   F. THE LAST GASP — one lethal tick leaves the bearer standing at the
//      stat's fraction and arms the clock; the next lethal inside it lands.
//   G. consumeOnUse still reads as consumeOn 'use' (byte-honest legacy).
// Run: npx tsx balance/probe_talents.ts
// ---------------------------------------------------------------------------

const bootWarns: string[] = [];
const origWarn = console.warn;
console.warn = (...a: unknown[]) => { bootWarns.push(a.map(String).join(' ')); origWarn(...a); };

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { applyDot, rollSkillDamage } from '../src/engine/damage';
import { makeSkillInstance, supportFitsInst } from '../src/engine/skills';
import {
  CONDITION_IDS, STAT_DEFS, gaugeGateMod, gaugeMod, mod, type SkillTag,
} from '../src/engine/stats';
import { RECENT_CFG, RECENT_CONDITIONS, RECENT_KINDS } from '../src/engine/recency';
import { VICTIM_CONDITIONS, victimScopeArmed, victimTags } from '../src/engine/victim';
import { DERIVED_GAUGES, GAUGE_CFG } from '../src/engine/gauges';
import { PROCS, PROC_LIST, procStat } from '../src/data/procs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { PASSIVE_ADJACENCY, PASSIVE_NODES } from '../src/data/passives';
import { statBlurbOf } from '../src/data/sheet';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

bootSimEngine();
console.warn = origWarn;

const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };
const spawn = (w: World, id: string, lv: number, x: number, y: number, team: 'enemy' | 'player' = 'enemy', owner?: Actor): Actor => {
  const m = w.createMonster(id, lv, team, owner);
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
/** A world with the hero centred, a bare cleave in slot 0, and no evasion
 *  anywhere on the rig (single-hit rigs must land — the probe_grab idiom). */
const rig = (seed: number): { w: World; p: Actor; cleave: ReturnType<typeof makeSkillInstance> } => {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const cleave = makeSkillInstance(SKILLS.cleave, 1, 3);
  p.skills[0] = cleave;
  p.sheet.setSource('probeBase', [mod('evasion', 'flat', -1e6), mod('critChance', 'flat', -1)]);
  step(w, 0.05);
  return { w, p, cleave };
};
const dummy = (w: World, p: Actor, dx = 40, dy = 0, life = 1000): Actor => {
  const z = spawn(w, 'zombie', 3, p.pos.x + dx, p.pos.y + dy);
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  z.sheet.setBase('life', life);
  z.life = life;
  z.brain = undefined; // no AI: the rig swings, the dummy stands
  return z;
};
/** Press the hero's slot-0 cleave at `at` and step until the bar completes. */
const swing = (w: World, p: Actor, at: { x: number; y: number }, secs = 1.2): boolean => {
  p.mana = p.maxMana();
  const ok = w.useSkill(p, p.skills[0]!, vec(at.x, at.y));
  step(w, 0.05, Math.ceil(secs / 0.05));
  return ok;
};

// === A. registry hygiene =====================================================
{
  check('A1 every recency condition sits in CONDITION_IDS, no duplicates, under the 31-bit lid',
    RECENT_CONDITIONS.every(rc => CONDITION_IDS.includes(rc.id))
    && new Set(CONDITION_IDS).size === CONDITION_IDS.length && CONDITION_IDS.length <= 31,
    `${CONDITION_IDS.length} ids`);
  check('A2 every recency row names a ledger kind', RECENT_CONDITIONS.every(rc => RECENT_KINDS.includes(rc.kind)));
  check('A3 the last-gasp stats are registered with blurbs',
    ['lastGasp', 'lastGaspLife', 'lastGaspCooldown'].every(id => !!STAT_DEFS[id] && !!statBlurbOf(id)));
  const debutProcs = ['hot_streak', 'heating_up', 'heat_lost', 'overpower', 'shield_lesson', 'reprisal',
    'deep_freeze', 'desperate_ward', 'adrenaline', 'desperate_reserves', 'slow_burn', 'necrotic_feast',
    'mending_ward', 'phoenix', 'unbound'];
  check('A4 every debut proc is registered with its chance stat',
    debutProcs.every(id => !!PROCS[id] && !!STAT_DEFS[procStat(id)]), debutProcs.filter(id => !PROCS[id]).join(','));
  check('A5 hot_streak is declared BEFORE heating_up (registry order is the grammar\'s law)',
    PROC_LIST.findIndex(p => p.id === 'hot_streak') < PROC_LIST.findIndex(p => p.id === 'heating_up'));
  const debutGems = ['executioners_edge', 'shatterglass', 'opportunists_blade', 'assassins_angle', 'frostbite_grip',
    'hunters_momentum', 'steady_nerve', 'deaths_door', 'crowd_favor', 'at_the_brink', 'fevered_hands',
    'answered_dodge', 'desperate_measures'];
  check('A6 every debut gem is registered', debutGems.every(id => !!SUPPORTS[id]), debutGems.filter(id => !SUPPORTS[id]).join(','));
  const cl = makeSkillInstance(SKILLS.cleave, 1, 3);
  check('A7 the victim-scope gem fits a striking host and the spell-only grammar gem refuses cleave',
    supportFitsInst(SUPPORTS.executioners_edge, cl) && !supportFitsInst(SUPPORTS.fevered_hands, cl));
  check('A8 at_the_brink wears the gauge GATE (gaugeAt), not the scale',
    SUPPORTS.at_the_brink.mods.every(m => m.gauge === 'charge:fury' && m.gaugeAt === 5));
  const debutAffixes = ['vs_lowlife', 'vs_hardcc', 'vs_behind', 'recent_kill_speed', 'calm_regen', 'missing_life_damage',
    'crowd_damage', 'last_gasp', 'proc_reprisal', 'proc_desperate_ward', 'proc_adrenaline', 'proc_slow_burn',
    'proc_mending_ward', 'proc_necrotic_feast'];
  check('A9 every debut affix family is registered', debutAffixes.every(id => !!ITEM_AFFIXES[id]), debutAffixes.filter(id => !ITEM_AFFIXES[id]).join(','));
  check('A10 the execution line is victim-scoped and the momentum line is recency-conditioned',
    ITEM_AFFIXES.vs_lowlife.lines[0].tags?.includes('vs:lowLife') === true
    && ITEM_AFFIXES.recent_kill_speed.lines[0].when === 'recentlyKilled'
    && ITEM_AFFIXES.missing_life_damage.lines[0].gauge === 'life:missing');
  // THE OPPORTUNIST'S ROW: placed, linked, reachable from the tree, clean.
  const row = Object.values(PASSIVE_NODES).filter(n => n.id.startsWith('cl_opp_'));
  check('A11 THE OPPORTUNIST\'S ROW stands (14 nodes, 2 keystones, 5 notables)',
    row.length === 14 && row.filter(n => n.kind === 'keystone').length === 2 && row.filter(n => n.kind === 'notable').length === 5,
    `${row.length}`);
  check('A12 the row gates off Prowess (node_68) in the shared adjacency',
    (PASSIVE_ADJACENCY['node_68'] ?? []).includes('cl_opp_gate') && (PASSIVE_ADJACENCY['cl_opp_gate'] ?? []).includes('node_68'));
  {
    const seen = new Set<string>(['cl_opp_gate']);
    const q = ['cl_opp_gate'];
    while (q.length) {
      const cur = q.pop()!;
      for (const nb of PASSIVE_ADJACENCY[cur] ?? []) if (nb.startsWith('cl_opp_') && !seen.has(nb)) { seen.add(nb); q.push(nb); }
    }
    check('A13 every row node is reachable from the gate', row.every(n => seen.has(n.id)), row.filter(n => !seen.has(n.id)).map(n => n.id).join(','));
  }
  check('A14 the boot validator raised no word about the row, the victim tags, the gauges or the debut procs',
    !bootWarns.some(w => /cl_opp_|vs:|victim|gauge|proc '(hot_streak|heating_up|heat_lost|overpower|shield_lesson|reprisal|deep_freeze|desperate_ward|adrenaline|desperate_reserves|slow_burn|necrotic_feast|mending_ward|phoenix|unbound)'|overlap.*cl_opp|orphan.*cl_opp/.test(w)),
    bootWarns.filter(w => /cl_opp_|vs:|victim|gauge|proc '/.test(w)).slice(0, 3).join(' | '));
  check('A15 every registered victim condition carries a label and a test',
    Object.values(VICTIM_CONDITIONS).every(d => typeof d.test === 'function' && d.label.length > 0)
    && Object.keys(VICTIM_CONDITIONS).length >= 20, `${Object.keys(VICTIM_CONDITIONS).length}`);
  check('A16 every derived gauge carries a label and a sampler', Object.values(DERIVED_GAUGES).every(d => typeof d.sample === 'function' && d.label.length > 0)
    && ['life:missing', 'foes:near', 'minions'].every(id => !!DERIVED_GAUGES[id]));
}

// === B. THE VICTIM SCOPE =====================================================
{
  const { w, p, cleave } = rig(0xb001);
  const low = dummy(w, p, 40, -30);
  const full = dummy(w, p, 40, 30);
  low.life = low.maxLife() * 0.2;
  step(w, 0.05);
  check('B1 the fold is NULL-COST until named (no vs: mod on the sheet or the instance)', !victimScopeArmed(p.sheet));
  p.sheet.setSource('probeVs', [mod('damage', 'more', 1.0, ['vs:lowLife'])]);
  check('B2 a vs: mod on the sheet arms the fold', victimScopeArmed(p.sheet));
  const lowTags = victimTags(low, p, { time: w.time }) ?? [];
  const fullTags = victimTags(full, p, { time: w.time }) ?? [];
  check('B3 victimTags reads the victim\'s own low-life line', lowTags.includes('vs:lowLife') && !fullTags.includes('vs:lowLife'));
  full.applyStatus('chill', 0, 1, 'probe');
  check('B4 a carried status is a victim tag for free (vs:chill)', (victimTags(full, p, { time: w.time }) ?? []).includes('vs:chill'));
  // THE ROLL: same seed, the vs: context doubles the packet exactly.
  seedGlobalRandom(11);
  const bare = rollSkillDamage(p, cleave).amounts.physical ?? 0;
  seedGlobalRandom(11);
  const scoped = rollSkillDamage(p, cleave, undefined, ['vs:lowLife'] as SkillTag[]).amounts.physical ?? 0;
  seedGlobalRandom(11);
  const other = rollSkillDamage(p, cleave, undefined, ['vs:fullLife'] as SkillTag[]).amounts.physical ?? 0;
  check('B5 the vs: context scopes the ROLL (×2 exactly under the same seed; a non-matching vs: tag ×1)',
    bare > 0 && near(scoped, bare * 2, 1e-6) && near(other, bare, 1e-6), `${bare.toFixed(2)} → ${scoped.toFixed(2)} / ${other.toFixed(2)}`);
  check('B6 the packet carries the victim scope in its tags', rollSkillDamage(p, cleave, undefined, ['vs:lowLife'] as SkillTag[]).tags.has('vs:lowLife'));
  // END TO END: one swing across both bodies — only the wounded one dies.
  p.sheet.setSource('probeVs', [mod('damage', 'more', 60, ['vs:lowLife'])]);
  const fullBefore = full.life;
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('B7 the cleave executes the low-life body and merely scratches the full one (the fold happens at the hit)',
    (low.dead || low.life <= 0) && !full.dead && full.life > fullBefore * 0.5,
    `low ${low.life.toFixed(0)} dead=${low.dead}, full ${fullBefore.toFixed(0)}→${full.life.toFixed(0)}`);
}

// === C. THE RECENCY LEDGER ===================================================
{
  const { w, p } = rig(0xc001);
  step(w, 0.05);
  check('C1 notHurtRecently holds at birth; recentlyKilled/recentlyHurt do not',
    p.sheet.hasCondition('notHurtRecently') && !p.sheet.hasCondition('recentlyKilled') && !p.sheet.hasCondition('recentlyHurt'));
  const z = dummy(w, p, 40, 0, 5);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('C2 the kill stamps the ledger and the condition rises', (z.dead || z.life <= 0) && p.recently('kill') && p.sheet.hasCondition('recentlyKilled'));
  check('C3 a landed hit stamps recentlyHit too', p.sheet.hasCondition('recentlyHit'));
  step(w, 0.1, Math.ceil((RECENT_CFG.windowSec + 0.5) / 0.1));
  check('C4 the window expires by itself (no proc, no buff)', !p.sheet.hasCondition('recentlyKilled') && !p.sheet.hasCondition('recentlyHit'));
  // A landed hit TAKEN: the zombie's claw on a hero with no evasion.
  const z2 = spawn(w, 'zombie', 3, p.pos.x + 30, p.pos.y);
  z2.brain = undefined;
  z2.sheet.setSource('probe', [mod('accuracy', 'flat', 1e6)]);
  const claw = z2.skills.find(s => s !== null)!;
  const lifeBefore = p.life;
  let landed = false;
  for (let i = 0; i < 80 && !landed; i++) {
    w.useSkill(z2, claw, vec(p.pos.x, p.pos.y));
    step(w, 0.05);
    landed = p.life < lifeBefore;
  }
  step(w, 0.05); // the mask folds at the top of the NEXT frame (the stamp landed mid-frame)
  check('C5 a landed hit taken flips recentlyHurt on and notHurtRecently off',
    landed && p.sheet.hasCondition('recentlyHurt') && !p.sheet.hasCondition('notHurtRecently'), `landed=${landed}`);
  // THE EDGE IS AN EVENT: a 'condition' proc answers the low-life flip.
  p.sheet.setSource('probeProc', [mod(procStat('desperate_ward'), 'flat', 1)]);
  p.ward = 0;
  p.life = p.maxLife() * 0.1;
  step(w, 0.05, 2);
  check('C6 dropping to low life queues the edge and Desperate Ward answers it with a ward', p.ward > 0, `ward ${p.ward.toFixed(1)}`);
  const wardAfter = p.ward;
  p.life = p.maxLife() * 0.1;
  step(w, 0.05, 2);
  check('C7 a held condition raises no second edge (the edge, not the state)', near(p.ward, wardAfter, 1e-6) || p.ward < wardAfter);
}

// === D. THE TRIGGERS =========================================================
{
  // 'hurt' → Reprisal worn, then SPENT by melee hits (consumeOn 'hit').
  const { w, p } = rig(0xd001);
  p.sheet.setSource('probeProc', [mod(procStat('reprisal'), 'flat', 1)]);
  const z = spawn(w, 'zombie', 3, p.pos.x + 30, p.pos.y);
  z.brain = undefined;
  z.sheet.setSource('probe', [mod('accuracy', 'flat', 1e6), mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  z.sheet.setBase('life', 1e6); z.life = 1e6;
  const claw = z.skills.find(s => s !== null)!;
  let worn = false;
  for (let i = 0; i < 80 && !worn; i++) {
    w.useSkill(z, claw, vec(p.pos.x, p.pos.y));
    step(w, 0.05);
    worn = p.buffs.has('reprisal');
  }
  check('D1 being struck (\'hurt\') wears Reprisal', worn);
  const stacksBefore = p.buffs.get('reprisal')?.stacks ?? 0;
  swing(w, p, { x: p.pos.x + 30, y: p.pos.y });
  const stacksAfter = p.buffs.get('reprisal')?.stacks ?? 0;
  check('D2 a landed melee hit SPENDS one Reprisal stack (consumeOn hit, tag-gated)', stacksBefore >= 1 && stacksAfter === stacksBefore - 1, `${stacksBefore}→${stacksAfter}`);
}
{
  // 'cast' → Adrenaline off a movement art (tag lock + context roll).
  const { w, p } = rig(0xd002);
  p.sheet.setSource('probeProc', [mod(procStat('adrenaline'), 'flat', 1)]);
  swing(w, p, { x: p.pos.x + 30, y: p.pos.y });
  check('D3 a non-movement cast does not raise Adrenaline (the def-level tag lock)', !p.buffs.has('adrenaline'));
  const dash = makeSkillInstance(SKILLS.dash, 1, 3);
  p.skills[1] = dash;
  p.mana = p.maxMana();
  const ok = w.useSkill(p, dash, vec(p.pos.x + 200, p.pos.y));
  step(w, 0.05, 6);
  check('D4 a completed movement cast raises Adrenaline and stamps recentlyMoved', ok && p.buffs.has('adrenaline') && p.recently('move'), `cast=${ok}`);
}
{
  // 'pulse' → Slow Burn banks fury on its beat, only while armed.
  const { w, p } = rig(0xd003);
  step(w, 0.1, 60);
  check('D5 an unarmed pulse never beats', (p.charges.get('fury') ?? 0) === 0);
  p.sheet.setSource('probeProc', [mod(procStat('slow_burn'), 'flat', 1)]);
  step(w, 0.1, 110);
  check('D6 Slow Burn banks fury on its five-second beat', (p.charges.get('fury') ?? 0) >= 1, `fury ${p.charges.get('fury') ?? 0}`);
}
{
  // 'minionDeath' → Necrotic Feast; 'heal' → Mending Ward.
  const { w, p } = rig(0xd004);
  p.sheet.setSource('probeProc', [mod(procStat('necrotic_feast'), 'flat', 1), mod(procStat('mending_ward'), 'flat', 1)]);
  const pet = spawn(w, 'zombie', 3, p.pos.x + 60, p.pos.y, 'player', p);
  w.kill(pet);
  step(w, 0.05);
  check('D7 a fallen summon feeds its keeper (minionDeath → Necrotic Feast)', p.buffs.has('necrotic_feast'));
  p.ward = 0;
  p.life = p.maxLife() * 0.5;
  p.healBy(10);
  step(w, 0.05);
  check('D8 a landed heal raises the heal event (Mending Ward) and stamps recentlyHealed', p.ward > 0 && p.recently('heal'), `ward ${p.ward.toFixed(1)}`);
  // PASSIVE REGEN IS SILENT: a body ticking regeneration is not 'recently
  // healed', and the heal trigger is never a free metronome.
  step(w, 0.1, Math.ceil((RECENT_CFG.windowSec + 5) / 0.1));
  p.ward = 0;
  p.life = p.maxLife() * 0.5;
  step(w, 0.1, 50);
  check('D8b passive regeneration never stamps recentlyHealed nor raises the heal event', !p.recently('heal') && p.ward === 0 && p.life > p.maxLife() * 0.5, `life ${p.life.toFixed(1)}`);
}
{
  // 'miss' → Overpower worn, then spent by the next melee hit.
  const { w, p } = rig(0xd005);
  p.sheet.setSource('probeProc', [mod(procStat('overpower'), 'flat', 1)]);
  const ghost = dummy(w, p, 40, 0);
  ghost.sheet.setSource('probe', [mod('evasion', 'flat', 1e9)]);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D9 an evaded blow (\'miss\') wears Overpower', p.buffs.has('overpower'));
  ghost.sheet.setSource('probe', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D10 the next landed melee hit spends Overpower', !p.buffs.has('overpower'));
}
{
  // The 'vs' gate on a hit proc: Deep Freeze needs a chilled body.
  const { w, p } = rig(0xd006);
  p.sheet.setSource('probeProc', [mod(procStat('deep_freeze'), 'flat', 1)]);
  const z = dummy(w, p, 40, 0, 1e6);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D11 Deep Freeze refuses an unchilled victim (the vs gate)', !z.statuses.some(s => s.id === 'frozen'));
  z.applyStatus('chill', 0, 1, 'probe');
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D12 Deep Freeze fires against the chilled victim', z.statuses.some(s => s.id === 'frozen'));
}
{
  // requireBuff / noCrit through the hit loop, and the targeted cooldown
  // effect — probe-local proc rows pushed onto the live registry.
  const { w, p } = rig(0xd007);
  PROC_LIST.push({
    id: 'probe_gate', name: 'Probe Gate', color: '#fff', trigger: 'hit', requireBuff: 'probe_key', noCrit: true,
    effect: { type: 'buff', buff: { type: 'buff', id: 'probe_fired', duration: 3, mods: [] } },
  });
  STAT_DEFS[procStat('probe_gate')] = { label: 'probe', base: 0, min: 0 };
  PROC_LIST.push({
    id: 'probe_cd', name: 'Probe CD', color: '#fff', trigger: 'cast',
    effect: { type: 'cooldown', reset: true, skills: ['cleave'] },
  });
  STAT_DEFS[procStat('probe_cd')] = { label: 'probe', base: 0, min: 0 };
  p.sheet.setSource('probeProc', [mod(procStat('probe_gate'), 'flat', 1), mod(procStat('probe_cd'), 'flat', 1)]);
  const z = dummy(w, p, 40, 0, 1e6);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D13 requireBuff refuses while the key buff is absent', !p.buffs.has('probe_fired'));
  p.addBuff({ type: 'buff', id: 'probe_key', duration: 30, mods: [] });
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D14 requireBuff opens once the key buff is worn (a non-crit hit)', p.buffs.has('probe_fired'));
  p.removeBuff('probe_fired');
  p.sheet.setSource('probeBase', [mod('evasion', 'flat', -1e6), mod('critChance', 'flat', 1)]);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('D15 noCrit refuses a critical hit', !p.buffs.has('probe_fired') && z.life < 1e6);
  p.cooldowns.set('cleave', 10); p.cooldowns.set('other_skill', 10);
  const dash = makeSkillInstance(SKILLS.dash, 1, 3);
  p.skills[1] = dash; p.mana = p.maxMana();
  w.useSkill(p, dash, vec(p.pos.x + 200, p.pos.y));
  step(w, 0.05, 4);
  check('D16 the targeted cooldown effect resets ONLY the named skill', !p.cooldowns.has('cleave') && (p.cooldowns.get('other_skill') ?? 0) > 8,
    `cleave ${p.cooldowns.get('cleave')}, other ${p.cooldowns.get('other_skill')?.toFixed(1)}`);
}

// === E. DERIVED GAUGES + THE GAUGE GATE =======================================
{
  const { w, p } = rig(0xe001);
  step(w, 0.1, 8);
  check('E1 an unreferenced gauge is never sampled (null-cost)', !p.derivedGauges || !p.derivedGauges.has('life:missing'));
  p.sheet.setSource('probeG', [gaugeMod('damage', 'increased', 0.1, 'life:missing')]);
  const fullDmg = p.sheet.get('damage');
  p.life = p.maxLife() * 0.45; // a hair under half: regen over the sample cadence must not cross the pip line
  step(w, 0.05, Math.ceil(GAUGE_CFG.cadence / 0.05) + 2);
  check('E2 life:missing publishes in tenths and scales the mod (half life → 5 pips → +50%)',
    p.sheet.gauge('life:missing') === 5 && near(p.sheet.get('damage'), fullDmg * 1.5 / 1, 1e-6) || near(p.sheet.get('damage') / fullDmg, (1 + 0.5) / 1, 1e-6),
    `pips ${p.sheet.gauge('life:missing')}, dmg ${fullDmg.toFixed(3)}→${p.sheet.get('damage').toFixed(3)}`);
  p.life = p.maxLife();
  step(w, 0.05, Math.ceil(GAUGE_CFG.cadence / 0.05) + 2);
  check('E3 healed to full, the gauge falls to zero and the mod goes inert', p.sheet.gauge('life:missing') === 0 && near(p.sheet.get('damage'), fullDmg, 1e-6));
  p.sheet.setSource('probeG', [gaugeMod('armor', 'increased', 0.1, 'foes:near')]);
  for (let i = 0; i < 3; i++) dummy(w, p, 60 + i * 20, 0, 1e6);
  step(w, 0.05, Math.ceil(GAUGE_CFG.cadence / 0.05) + 2);
  check('E4 foes:near counts the living hostiles within reach', p.sheet.gauge('foes:near') === 3, `${p.sheet.gauge('foes:near')}`);
  // THE GAUGE GATE: a threshold, not a scale.
  p.sheet.setSource('probeG', [gaugeGateMod('critMulti', 'flat', 0.4, 'charge:fury', 5)]);
  const cm0 = p.sheet.get('critMulti');
  p.gainCharge('fury', 4, 10);
  step(w, 0.05);
  const cm4 = p.sheet.get('critMulti');
  p.gainCharge('fury', 1, 10);
  step(w, 0.05);
  const cm5 = p.sheet.get('critMulti');
  check('E5 gaugeAt: nothing below the line, the full value at it (never ×charges)', near(cm4, cm0) && near(cm5, cm0 + 0.4), `${cm0}→${cm4}→${cm5}`);
}

// === F. THE LAST GASP ========================================================
{
  const { w, p } = rig(0xf001);
  p.sheet.setSource('probeGasp', [mod('lastGasp', 'flat', 1), mod(procStat('phoenix'), 'flat', 1)]);
  const max = p.maxLife();
  p.life = 5;
  const removed = applyDot(p, 999);
  check('F1 a lethal tick leaves the bearer standing at lastGaspLife of maximum and arms the clock',
    p.life > 0 && near(p.life, max * p.sheet.get('lastGaspLife'), 1e-6) && p.lastGaspCd > 0 && p.gasped,
    `life ${p.life.toFixed(1)}/${max.toFixed(1)}, cd ${p.lastGaspCd}, removed ${removed.toFixed(1)}`);
  const flashes = w.flashes.length;
  step(w, 0.05);
  check('F2 the world turns the gasp into its fanfare and the lastGasp trigger (Phoenix bursts)', !p.gasped && w.flashes.length > flashes);
  applyDot(p, 999);
  check('F3 a second lethal inside the cooldown lands (no chain of reprieves)', p.life <= 0);
}
{
  const { w, p } = rig(0xf002);
  step(w, 0.05);
  p.life = 5;
  applyDot(p, 999);
  check('F4 with no lastGasp investment the wound lands as ever (base 0 — an unlock, never ambience)', p.life <= 0);
  void w;
}

// === G. legacy consumeOnUse ==================================================
{
  const { w, p } = rig(0xa001);
  p.addBuff({ type: 'buff', id: 'probe_ammo', duration: 30, maxStacks: 2, stacksOnApply: 2, mods: [], consumeOnUse: { tags: ['melee'] } });
  dummy(w, p, 40, 0, 1e6);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('G1 consumeOnUse still spends one round per real melee use (routed through spendBuffs)', p.buffs.get('probe_ammo')?.stacks === 1);
  const dash = makeSkillInstance(SKILLS.dash, 1, 3);
  p.skills[1] = dash; p.mana = p.maxMana();
  w.useSkill(p, dash, vec(p.pos.x + 200, p.pos.y));
  step(w, 0.05, 14); // let the dash finish (a body mid-dash refuses the next press)
  check('G2 a non-matching use spends nothing', p.buffs.get('probe_ammo')?.stacks === 1);
  swing(w, p, { x: p.pos.x + 40, y: p.pos.y });
  check('G3 the last round ends the buff', !p.buffs.has('probe_ammo'));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
