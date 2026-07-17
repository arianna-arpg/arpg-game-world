// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE COMBO GRAMMAR + THE ONE SEQUENCE MATCHER end to end
// on the real engine (docs/engine/combo.md): the generic matcher's laws
// (tail seq / minimal-tail counts / vary / repeat / minLen / gate),
// INVOCATION PARITY (the ported resolveInvocation must agree with the
// frozen pre-port algorithm on fixed cases AND a seeded fuzz sweep — the
// byte-exact regression pin), the null-cost discipline (no grammar, no
// ring, no condition churn), grammar equip → record → fire → consume-span
// → re-form → stack, timing windows + the comboWindow stat, the
// comboVaried/comboRepeated conditions (wake by conditional mod alone,
// decay by countdown), the ENEMY side (a cadence_fencer drums its own
// Drumbeat with zero bespoke code), and the registry weave (stats seated,
// sheet family, supports/vocation/passives/monsters/looks all resolve).
// Run: npx tsx balance/probe_combo.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { COMBO_LIST, COMBO_RULES } from '../src/data/combos';
import { SUPPORTS } from '../src/data/supports';
import { VOCATIONS } from '../src/data/vocations';
import { PASSIVE_NODES } from '../src/data/passives';
import { INVOCATIONS, resolveInvocation, type InvocationRule } from '../src/data/invocations';
import {
  COMBO_CFG, comboProgress, comboStat, matchSeqRule,
} from '../src/engine/sequence';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { sheetFamilyOf } from '../src/data/sheet';
import { makeSkillInstance } from '../src/engine/skills';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xc0b0);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick — w.update alone leaves every brain frozen.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
/** Press a catalog skill on the hero (fresh instance, mana topped) and
 *  assert the press was accepted — a refused press would silently void
 *  everything downstream. Time advances either way, so one refusal can
 *  never cascade into a jammed sequence. */
const cast = (w: ReturnType<typeof makeSimWorld>, id: string, pace = 1.2): void => {
  const p = w.player;
  p.mana = p.maxMana();
  const ok = w.useSkill(p, makeSkillInstance(SKILLS[id], 1), vec(p.pos.x + 60, p.pos.y));
  if (!ok) check(`press accepted: ${id}`, false);
  step(w, pace);
};

// --- 0) The generic matcher's laws (pure, string alphabet) ------------------
{
  const eq = (p: string, s: string): boolean => p === s;
  const key = (s: string): string => s;
  check('matcher: seq tail matches in order, spans its length',
    matchSeqRule(['a', 'b', 'c'], { seq: ['b', 'c'] }, eq) === 2
    && matchSeqRule(['b', 'c', 'a'], { seq: ['b', 'c'] }, eq) === 0
    && matchSeqRule(['c'], { seq: ['b', 'c'] }, eq) === 0);
  check('matcher: counts walks backward to the MINIMAL satisfying tail',
    matchSeqRule(['x', 'a', 'b', 'a'], { counts: [{ p: 'a', n: 2 }] }, eq) === 3
    && matchSeqRule(['a', 'x', 'x'], { counts: [{ p: 'a', n: 2 }] }, eq) === 0);
  check('matcher: vary needs the last n pairwise-distinct',
    matchSeqRule(['a', 'b', 'c'], { vary: { n: 3 } }, eq, key) === 3
    && matchSeqRule(['a', 'b', 'a'], { vary: { n: 3 } }, eq, key) === 0);
  check('matcher: repeat needs the last n identical',
    matchSeqRule(['b', 'a', 'a', 'a'], { repeat: { n: 3 } }, eq, key) === 3
    && matchSeqRule(['b', 'a', 'a'], { repeat: { n: 3 } }, eq, key) === 0);
  check('matcher: minLen fallback spans the whole sequence',
    matchSeqRule(['a', 'b'], { minLen: 1 }, eq) === 2
    && matchSeqRule([], { minLen: 1 }, eq) === 0);
  check('matcher: gate screens vary/repeat spans',
    matchSeqRule(['a', 'a'], { repeat: { n: 2 }, gate: 'a' }, eq, key) === 2
    && matchSeqRule(['b', 'b'], { repeat: { n: 2 }, gate: 'a' }, eq, key) === 0);
}

// --- 1) INVOCATION PARITY: the port must equal the frozen algorithm --------
{
  // The pre-port resolveInvocation, frozen verbatim — the regression pin.
  const frozenResolve = (runes: string[]): InvocationRule | null => {
    if (!runes.length) return null;
    for (const rule of INVOCATIONS) {
      if (rule.seq) {
        if (runes.length < rule.seq.length) continue;
        const tail = runes.slice(-rule.seq.length);
        if (!rule.seq.every((r, i) => tail[i] === r)) continue;
        return rule;
      }
      if (rule.counts) {
        let ok = true;
        for (const [r, n] of Object.entries(rule.counts)) {
          if (runes.filter(x => x === r).length < (n ?? 0)) { ok = false; break; }
        }
        if (!ok) continue;
        return rule;
      }
      if (runes.length >= (rule.minRunes ?? 1)) return rule;
    }
    return null;
  };

  check('invocation: empty weave resolves null', resolveInvocation([]) === null);
  check('invocation: pure triad', resolveInvocation(['ember', 'ember', 'ember'])?.id === 'conflagration');
  check('invocation: ordered pair beats the fallback',
    resolveInvocation(['arc', 'ember'])?.id === 'flashfire'
    && resolveInvocation(['ember', 'arc'])?.id === 'shatter_spark');
  check('invocation: a long weave resolves by its TAIL',
    resolveInvocation(['rime', 'rime', 'arc', 'ember'])?.id === 'flashfire');
  check('invocation: cataclysm needs all three with no pair-tail shadowing it',
    resolveInvocation(['ember', 'arc', 'rime', 'rime'])?.id === 'cataclysm');
  check('invocation: single rune falls through to release',
    resolveInvocation(['rime'])?.id === 'release');

  // Seeded fuzz: every sequence up to length 6 over the rune alphabet —
  // ported and frozen resolvers must agree EVERYWHERE.
  let lcg = 0x2f6e2b1 | 0;
  const rnd = (): number => {
    lcg = (Math.imul(lcg, 1664525) + 1013904223) | 0;
    return (lcg >>> 8) / 0x1000000;
  };
  const alphabet = ['ember', 'arc', 'rime'];
  let agree = true;
  let fuzzed = 0;
  for (let i = 0; i < 800; i++) {
    const len = Math.floor(rnd() * 7);
    const seqn: string[] = [];
    for (let j = 0; j < len; j++) seqn.push(alphabet[Math.floor(rnd() * 3)]);
    const a = resolveInvocation(seqn)?.id ?? null;
    const b = frozenResolve(seqn)?.id ?? null;
    fuzzed++;
    if (a !== b) { agree = false; check('invocation parity', false, `${seqn.join(',')}: ported=${a} frozen=${b}`); break; }
  }
  if (agree) check(`invocation parity: ${fuzzed}-sequence fuzz agrees everywhere`, true);
}

// --- 2) Null-cost discipline -------------------------------------------------
{
  const w = makeSimWorld('sorcerer', 0xabc1);
  cast(w, 'spark'); cast(w, 'spark'); cast(w, 'spark');
  check('null-cost: no grammar → no ring, no watch, no condition bits',
    w.player.castRing === null && !w.player.comboWatch && w.player.comboCondBits === 0);
}

// --- 3) Equip → record → fire → consume → re-form → stack -------------------
{
  const w = makeSimWorld('sorcerer', 0xabc2);
  const p = w.player;
  check('dev grant equips the Drumbeat grammar', w.devComboGrant('drumbeat'));
  cast(w, 'spark'); cast(w, 'spark');
  check('two beats: no fire yet, progress 2/3',
    !p.buffs.has('drumbeat')
    && comboProgress(p.castRing ?? [], COMBO_RULES.drumbeat, w.time).lit === 2);
  cast(w, 'spark');
  const firstFire = p.comboFire?.get('drumbeat');
  check('third beat strikes the drum (buff via THE proc pipeline)',
    p.buffs.get('drumbeat')?.stacks === 1 && !!firstFire);
  check('the ring recorded through the one real-use gate',
    (p.castRing?.length ?? 0) === 3 && p.comboWatch);
  check('comboRepeated condition holds after the trio', p.sheet.hasCondition('comboRepeated'));
  cast(w, 'spark');
  check('a fourth beat cannot re-spend consumed casts',
    p.comboFire?.get('drumbeat')?.seq === firstFire?.seq);
  cast(w, 'spark'); cast(w, 'spark');
  check('a FRESH trio re-forms and stacks the surge',
    p.buffs.get('drumbeat')?.stacks === 2);
}

// --- 4) Timing windows + the comboWindow stat --------------------------------
{
  const w = makeSimWorld('sorcerer', 0xabc3);
  const p = w.player;
  w.devComboGrant('drumbeat');
  cast(w, 'spark'); cast(w, 'spark');
  step(w, 7);                          // the measure goes stale (within 6)
  cast(w, 'spark');
  check('window: a stale span refuses to complete', !p.buffs.has('drumbeat'));
  // Widen the window ×2 (the comboWindow stat — the vocation keystone's
  // lever) and the SAME pacing lands: the last three sparks sit ~8.8s
  // apart end to end, inside a 12s window.
  p.sheet.setSource('probe:window', [mod('comboWindow', 'more', 1.0)]);
  cast(w, 'spark');
  check('comboWindow: the widened measure completes', p.buffs.get('drumbeat')?.stacks === 1);
}

// --- 5) Variety grammars: the Prismatic Round + the lane weave ---------------
{
  const w = makeSimWorld('sorcerer', 0xabc4);
  const p = w.player;
  w.devComboGrant('elemental_round');
  w.devComboGrant('spellblade_weave');
  cast(w, 'claw', 2.0);
  cast(w, 'spark');
  check('lane weave: attack-then-spell surges Blade-and-Vein',
    p.buffs.has('bladevein_surge'));
  cast(w, 'firebolt');
  check('element round: an unelemental cast in the span holds the gate shut',
    !p.buffs.has('prismatic_round'));   // last 3 = claw, spark, firebolt — claw fails the gate
  cast(w, 'frostbolt');
  check('element round: three schools in a row close the round',
    p.buffs.has('prismatic_round'));    // last 3 = spark, firebolt, frostbolt
  check('comboVaried condition holds (last three all different skills)',
    p.sheet.hasCondition('comboVaried'));
}

// --- 6) Conditional-mod wake alone (no grammar), and decay -------------------
{
  const w = makeSimWorld('sorcerer', 0xabc5);
  const p = w.player;
  p.sheet.setSource('probe:cond', [mod('damage', 'more', 0.5, undefined, 'comboVaried')]);
  cast(w, 'firebolt'); cast(w, 'frostbolt'); cast(w, 'spark');
  check('a lone when:comboVaried modifier wakes the ring',
    p.castRing !== null && p.comboWatch);
  check('...and the condition holds', p.sheet.hasCondition('comboVaried'));
  cast(w, 'spark');
  check('repetition breaks the variety read', !p.sheet.hasCondition('comboVaried'));
  cast(w, 'firebolt'); cast(w, 'frostbolt'); cast(w, 'spark');
  check('re-varied', p.sheet.hasCondition('comboVaried'));
  step(w, COMBO_CFG.conditionWindow + 1);
  check('the countdown decays the condition with no new casts',
    !p.sheet.hasCondition('comboVaried'));
  // Un-referenced again → the next recorded beat releases the ring.
  p.sheet.removeSource('probe:cond');
  p.comboWatchAt = 0;
  cast(w, 'spark');
  check('un-referenced → the ring is released (combat-transient, never a leak)',
    p.castRing === null && !p.comboWatch);
}

// --- 7) The enemy side: a fencer drums its own grammar -----------------------
{
  const w = makeSimWorld('sorcerer', 0xabc6);
  const p = w.player;
  p.invulnerable = true;
  const fencer = w.createMonster('cadence_fencer', 5, 'enemy');
  fencer.pos = vec(p.pos.x + 70, p.pos.y);
  w.actors.push(fencer);
  let drummed = false;
  for (let t = 0; t < 30 && !drummed; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (fencer.dead) break;
    if (fencer.buffs.has('drumbeat')) drummed = true;
  }
  check('the cadence fencer drums Drumbeat with zero bespoke code',
    drummed, drummed ? '' : `ring=${fencer.castRing?.length ?? 'null'} watch=${fencer.comboWatch}`);
  check('the fencer woke through its own def mods', fencer.comboWatch && fencer.castRing !== null);
}

// --- 8) The registry weave ---------------------------------------------------
{
  const ownerScoped = new Set(['buff', 'restore', 'heal', 'gainCharge', 'burst', 'fortify', 'cooldown', 'delayedBurst']);
  for (const rule of COMBO_LIST) {
    const kinds = [rule.seq, rule.counts, rule.vary, rule.repeat].filter(Boolean).length;
    check(`weave: ${rule.id} — stat seated, family resolved, one pattern, owner-scoped payoff`,
      !!STAT_DEFS[comboStat(rule.id)]
      && sheetFamilyOf(comboStat(rule.id)) !== null
      && kinds === 1
      && ownerScoped.has(rule.effect.type));
  }
  check('weave: comboWindow is a registered, seated stat',
    !!STAT_DEFS.comboWindow && STAT_DEFS.comboWindow.base === 1);
  const gemsOk = (['polyphony', 'ostinato'] as const).every(id =>
    SUPPORTS[id]?.mods.some(m => m.when === 'comboVaried' || m.when === 'comboRepeated'));
  check('weave: the cadence gems ride the conditions', gemsOk);
  const sb = VOCATIONS.spellblade;
  check('weave: the Spellblade vocation grants the weave and bends the window',
    !!sb && sb.classId === 'magician'
    && sb.tree.some(n => n.mods?.some(m => m.stat === comboStat('spellblade_weave')))
    && sb.tree.some(n => n.mods?.some(m => m.stat === 'comboWindow')));
  check('weave: the tree notables grant the other grammars',
    !!PASSIVE_NODES.battle_cadence?.mods?.some(m => m.stat === comboStat('drumbeat'))
    && !!PASSIVE_NODES.prismatic_cycle?.mods?.some(m => m.stat === comboStat('elemental_round')));
  for (const id of ['cadence_fencer', 'cadence_cantor', 'cadence_maestro'] as const) {
    const def = MONSTERS[id];
    const grammar = def?.mods?.some(m => m.stat.startsWith('combo_'));
    const look = def?.look ? LOOKS[def.look] : null;
    const pips = look?.live?.some(s => s.kind === 'beatPips');
    const kit = def?.skills.every(s => !!SKILLS[s]);
    check(`weave: ${id} — grammar mod, look, beat pips, kit resolve`,
      !!def && !!grammar && !!look && !!pips && !!kit);
  }
  check('weave: the beatPips painter is registered', !!PART_PAINTERS.beatPips);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
