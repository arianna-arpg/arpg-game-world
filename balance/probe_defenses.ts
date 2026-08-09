// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DEFENSE-TEXTURE DOCTRINE end to end on the real engine
// (docs/engine/defenses.md). Pins:
//   - the signature pools SHIP EMPTY: poise and insight base 0 like ES and
//     endurance — a crate, a rabbit and a fresh hero all read zero until a
//     base is authored or bought,
//   - attributes SCALE, never seed: fortitude/charisma/willpower carry
//     'increased' mods for their pools (no flat), and the flat-then-scale
//     fold works (0 base × any% = honestly zero),
//   - MATERIAL NATURE: every material worn by the bestiary has a nature
//     row; REMAINS gates the kill-path corpse mint (timber/stone/ghost
//     leave nothing, the organic still fuel necromancy, def.remains
//     overrides either way) and BREATH gates the default kite,
//   - objects are INERT: killing a crate mints no corpse and hitting one
//     can never fire the poise-break fanfare,
//   - CC honesty: a poise-less body NEVER shrugs a stun (the armed-bar
//     gate), while the break-bar state machine still works where authored,
//   - THE BURST WINDOW: a high-poise/high-poiseDR wall takes visibly less
//     while armed and full damage while broken,
//   - INSIGHT SAP: chill 0.4 / frozen 1 / stunned 1 wear through the one
//     momentum read — mitigation drops, the spend stops, the refill stalls,
//   - the DEFAULT KITE: breathing bodies wear BEHAVIOR_CFG.defaultKite when
//     no TempoSpec is authored, authored kite wins, tempo: null survives
//     mergeTuning (the wave frenzy's never-winds pledge),
//   - the ES pole: soak, delayed recharge, interruption — the sustained-
//     damage counterplay loop on an authored ES monster.
// Run: npx tsx balance/probe_defenses.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { applyHit, mitigateTyped } from '../src/engine/damage';
import { DEFENSE_CFG } from '../src/engine/defense';
import { makeSkillInstance } from '../src/engine/skills';
import { plyFloorOf } from '../src/engine/plies';
import { ATTRIBUTES, STAT_DEFS, mod, type SkillTag } from '../src/engine/stats';
import { BEHAVIOR_CFG, mergeTuning } from '../src/engine/brain';
import { updateAI } from '../src/engine/ai';
import { FACTIONS, MONSTERS, MATERIAL_NATURE, defBreathes, defLeavesRemains } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };
// The host frame, verbatim: updateAI lives OUTSIDE world.update (main.ts /
// sim runner.ts drive it per actor) — the tempo stamp needs the real tick.
const stepAI = (w: World, dt: number, n = 1): void => {
  for (let i = 0; i < n; i++) { for (const a of w.actors) updateAI(a, w, dt); w.update(dt); }
};

// ------------------------------------------------------------- data pins --
{
  check('poise ships empty (STAT_DEFS base 0)', STAT_DEFS.poise.base === 0);
  check('insight ships empty (STAT_DEFS base 0)', STAT_DEFS.insight.base === 0);
  check('energy shield still ships empty', STAT_DEFS.energyShield.base === 0);
  const flatOf = (attr: 'fortitude' | 'charisma' | 'willpower', stat: string) =>
    ATTRIBUTES[attr].perPoint.filter(m => m.stat === stat);
  const forP = flatOf('fortitude', 'poise'), chaI = flatOf('charisma', 'insight'), wilE = flatOf('willpower', 'energyShield');
  check('fortitude scales poise (increased, no flat)',
    forP.length === 1 && forP[0].kind === 'increased');
  check('charisma scales insight (increased, no flat)',
    chaI.length === 1 && chaI[0].kind === 'increased');
  check('willpower scales energy shield (increased, no flat)',
    wilE.length === 1 && wilE[0].kind === 'increased');
  // Every material the bestiary actually wears has a declared nature (a
  // NEW material warns at boot until classified; this pins today's set).
  const unnatured = [...new Set(Object.values(MONSTERS).map(d => d.material ?? 'flesh'))]
    .filter(mat => !MATERIAL_NATURE[mat]);
  check('every worn material has a MATERIAL_NATURE row', unnatured.length === 0, unnatured.join(','));
  const objs = ['crate', 'barrel', 'gem_cache'] as const;
  check('breakables author no signature pools', objs.every(id => {
    const b = MONSTERS[id].base;
    return !b.poise && !b.insight && !b.energyShield;
  }));
  const insightCarriers = Object.values(MONSTERS).filter(d => (d.base.insight ?? 0) >= 20).length;
  check('the insight pole is populated (>= 15 carriers)', insightCarriers >= 15, String(insightCarriers));
  const wells = SKILLS.wellspring_stance.delivery as { aura?: { selfMods?: { stat: string; kind: string; value: number }[] } };
  check('wellspring stance carries its own footing (+flat poise selfMod)',
    (wells.aura?.selfMods ?? []).some(m => m.stat === 'poise' && m.kind === 'flat' && m.value > 0));
}

// --------------------------------------------- objects & the remains gate --
{
  seedGlobalRandom(0xdef1);
  const w = makeSimWorld('warrior', 1001);
  const crate = spawn(w, 'crate', 3, 200, 200);
  const wolf = spawn(w, 'plains_wolf', 3, 900, 200);
  const door = spawn(w, 'door_timber', 3, 200, 900);
  const haunt = spawn(w, 'sheeted_haunt', 3, 900, 900);
  const wight = spawn(w, 'barrow_wight', 3, 1400, 200);
  const wax = spawn(w, 'wax_pool', 3, 1400, 900);

  check('crate has zero poise/insight pools', crate.maxPoise() === 0 && crate.maxInsight() === 0);
  check('wolf has zero poise/insight pools (ambient base gone)', wolf.maxPoise() === 0 && wolf.maxInsight() === 0);
  check('fresh hero pools are empty until invested', w.player.maxPoise() === 0 && w.player.maxInsight() === 0);

  // Hitting a zero-max bar can never fire the break fanfare.
  const broke = crate.damagePoise(999);
  check('crate poise drain is a no-op (no break, no sundered)',
    !broke && !crate.poiseJustBroke && !crate.statuses.some(s => s.id === 'sundered'));

  const mints = (a: Actor): number => { const n = w.corpses.length; w.kill(a); return w.corpses.length - n; };
  check('killed crate leaves NO corpse (wood)', mints(crate) === 0);
  check('killed door leaves NO corpse (wood)', mints(door) === 0);
  check('killed haunt leaves NO corpse (ethereal dissipates)', mints(haunt) === 0);
  check('killed wax pool leaves NO corpse (def.remains override on organic dress)', mints(wax) === 0);
  check('killed wolf leaves a corpse (organic control)', mints(wolf) === 1);
  check('killed wight leaves a corpse (bone leaves bones)', mints(wight) === 1);
  check('defLeavesRemains honors override precedence',
    defLeavesRemains(MONSTERS.wax_pool) === false && defLeavesRemains(MONSTERS.plains_wolf) === true
    && defLeavesRemains(MONSTERS.door_timber) === false);
}

// ------------------------------- THE UNRUSTED: the no-corpse legion (data) --
// The reserved construct legion's identity rides the remains fabric end to
// end: every roster body pins remains: false (material 'metal' already votes
// no — the explicit flag holds the doctrine through any future re-dress),
// never breathes (the chase never winds), and shrugs the flesh ailments
// through the tagged ailmentResist rows. Killing one feeds NO corpse economy
// — Corpse Explosion, the wagon, the Deadwake all go hungry on their ground —
// while the organic control keeps minting beside it.
{
  seedGlobalRandom(0xb2a55);
  const w = makeSimWorld('warrior', 1002);
  const roster = FACTIONS.unrusted.table.map(e => e.id);
  // 2026-08-08 reconcile: the roster grew 6 -> 8 at 0acd39b (the muster
  // pass seated gnomon_lancer + astrolabe_warden) without this count pin
  // moving; every per-id law check below passes on all 8, so the growth
  // is authored, not drift.
  check('unrusted roster is authored in full (8 ranks)', roster.length === 8, roster.join(','));
  for (const id of roster) {
    const d = MONSTERS[id];
    check(`${id}: leaves NO remains (the anti-necromancy pin)`, !!d && !defLeavesRemains(d));
    check(`${id}: never breathes (tireless metal)`, !!d && !defBreathes(d));
    check(`${id}: shrugs the bleed family (ailmentResist, physical-tagged)`,
      !!d?.mods?.some(m => m.stat === 'ailmentResist' && (m.tags ?? []).includes('physical')));
    check(`${id}: shrugs venom (ailmentResist, chaos-tagged)`,
      !!d?.mods?.some(m => m.stat === 'ailmentResist' && (m.tags ?? []).includes('chaos')));
  }
  const mints = (a: Actor): number => { const n = w.corpses.length; w.kill(a); return w.corpses.length - n; };
  const custodian = spawn(w, 'awakened_custodian', 4, 300, 300);
  const skeleton = spawn(w, 'skeleton_warrior', 4, 900, 300);
  check('killed custodian mints NO corpse at the kill path', mints(custodian) === 0);
  check('the graves still pay beside it (skeleton control mints)', mints(skeleton) === 1);

  // The fabric is GENERAL, not an Unrusted privilege: the Gilded Compact's
  // own construct starves the corpse economies too — while the company's
  // LIVING payroll still feeds them (rob merchants, fuel necromancy: the
  // moral ledger keeps itself through the same one gate).
  const golem = spawn(w, 'vault_golem', 8, 300, 900);
  const blade = spawn(w, 'hired_blade', 8, 900, 900);
  check('killed vault golem mints NO corpse (stone, cross-faction)', mints(golem) === 0);
  check('killed hired blade mints one (the Compact bleeds — organic)', mints(blade) === 1);
  // 2026-08-08 reconcile: 6 -> 8 at 0acd39b (the muster pass seated
  // ledger_arbiter + toll_bailiff) — same adjudication as the unrusted row.
  check('compact roster is authored in full (8 seats)', FACTIONS.compact.table.length === 8,
    FACTIONS.compact.table.map(e => e.id).join(','));
}

// ------------------------------------------------- CC honesty at zero max --
{
  seedGlobalRandom(0xdef2);
  const w = makeSimWorld('warrior', 1002);
  const wolf = spawn(w, 'plains_wolf', 3, 300, 300);
  let landed = 0;
  for (let i = 0; i < 20; i++) {
    wolf.statuses.length = 0;
    wolf.applyStatus('stun', 0, 1, 'probe');
    if (wolf.statuses.some(s => s.id === 'stun')) landed++;
  }
  check('poise-less body NEVER shrugs a stun (20/20 land)', landed === 20, `${landed}/20`);
}

// ------------------------------------------------------- the burst window --
{
  seedGlobalRandom(0xdef3);
  const w = makeSimWorld('warrior', 1003);
  const wall = spawn(w, 'bone_colossus', 5, 400, 400);
  check('bone colossus wears the authored wall (poise 90, poiseDR 0.45)',
    wall.maxPoise() === 90 && Math.abs(wall.sheet.get('poiseDR') - 0.45) < 1e-9);
  const armed = mitigateTyped(wall, { fire: 100 });
  wall.damagePoise(9999); // obliterate the bar
  check('the bar broke (sundered, inert recovery)', wall.poiseBroken);
  const broken = mitigateTyped(wall, { fire: 100 });
  check('armed wall takes visibly less than the broken one (the burst window)',
    armed < broken * 0.75, `armed ${armed.toFixed(1)} vs broken ${broken.toFixed(1)}`);
  // Broken means the poise rung is GONE and Sundered's own damageTaken
  // amplification (more 0.15) piles on — the window is bigger than the
  // lost DR alone. 100 raw reads >= 100 through a broken wall.
  check('broken wall takes at least the full hit (DR gone + sunder amp)', broken >= 100 - 1e-6,
    broken.toFixed(2));
}

// ----------------------------------------------------------- insight sap --
{
  seedGlobalRandom(0xdef4);
  const w = makeSimWorld('warrior', 1004);
  const a = spawn(w, 'veilstalker', 5, 300, 300);   // authored insight 40
  const b = spawn(w, 'veilstalker', 5, 900, 300);
  const c = spawn(w, 'veilstalker', 5, 1500, 300);
  for (const m of [a, b, c]) m.idleFor = 0;         // all mid-stride
  b.applyStatus('chill', 0, 1, 'probe');
  c.applyStatus('frozen', 0, 1, 'probe');
  check('moving momentum reads full', Math.abs(a.insightMomentum() - 1) < 1e-9);
  check('chill saps momentum to 0.6', Math.abs(b.insightMomentum() - 0.6) < 1e-9, b.insightMomentum().toFixed(3));
  check('frozen kills momentum outright', c.insightMomentum() === 0);
  const tA = mitigateTyped(a, { fire: 100 });
  const tB = mitigateTyped(b, { fire: 100 });
  const tC = mitigateTyped(c, { fire: 100 });
  check('mitigation degrades with the sap (full < chilled < frozen)',
    tA < tB && tB < tC, `${tA.toFixed(1)} / ${tB.toFixed(1)} / ${tC.toFixed(1)}`);
  check('the frozen pool spent NOTHING (no slip, no spend)',
    c.insight === c.maxInsight() && a.insight < a.maxInsight());
  // Refill rides the same momentum: a frozen, emptied pool stays empty.
  a.insight = 0; c.insight = 0; a.idleFor = 0; c.idleFor = 0;
  step(w, 1 / 60, 30);
  check('refill stalls while frozen, flows while moving', a.insight > 0 && c.insight === 0,
    `moving ${a.insight.toFixed(2)} frozen ${c.insight.toFixed(2)}`);
  // Stun rings the same bell (worn as data on the status, not code).
  const d = spawn(w, 'veilstalker', 5, 300, 900);
  d.idleFor = 0;
  d.applyStatus('stun', 0, 1, 'probe');
  check('stun saps momentum to zero', d.insightMomentum() === 0);
}

// ------------------------------------------------------ the default kite --
{
  seedGlobalRandom(0xdef5);
  const w = makeSimWorld('warrior', 1005);
  const wolf = spawn(w, 'plains_wolf', 3, w.player.pos.x + 150, w.player.pos.y);
  const wight = spawn(w, 'barrow_wight', 3, w.player.pos.x - 150, w.player.pos.y);
  const shaman = spawn(w, 'grave_shaman', 3, w.player.pos.x, w.player.pos.y + 150);
  check('breath derives from material nature (fur yes, bone no)',
    wolf.breathes === true && wight.breathes === false
    && defBreathes(MONSTERS.plains_wolf) && !defBreathes(MONSTERS.barrow_wight));
  for (const m of [wolf, wight, shaman]) m.aiAwakened = true; // past any dormancy gate
  stepAI(w, 1 / 60, 20); // the real host frame stamps tempo specs
  check('breathing body wears the default kite budget',
    wolf.aiKiteSpec?.kite === BEHAVIOR_CFG.defaultKite.kite, String(wolf.aiKiteSpec?.kite));
  check('breathless body wears none', wight.aiKiteSpec === undefined);
  check('authored kite wins over the default (caster preset 2.8)',
    shaman.aiKiteSpec?.kite === 2.8, String(shaman.aiKiteSpec?.kite));
  const cleared = mergeTuning({ tempo: { kite: 4 } }, { tempo: null });
  check('mergeTuning preserves tempo:null (the never-winds pledge)', cleared.tempo === null);
}

// ------------------------------------------------------------ the ES pole --
{
  seedGlobalRandom(0xdef6);
  const w = makeSimWorld('warrior', 1006);
  const geode = spawn(w, 'geode_shellback', 5, 400, 400);
  const es0 = geode.es;
  check('authored ES pole spawns charged', es0 === geode.maxEs() && es0 > 0, String(es0));
  const life0 = geode.life;
  mitigateTyped(geode, { fire: 60 });
  check('the shield soaks the hit (pool down, no life mitigated away)', geode.es < es0 && geode.life === life0,
    `es ${es0} -> ${geode.es.toFixed(1)}`);
  step(w, 0.25, 12); // ~3s quiet: past the 2.5s delay, the stream is MID-FLOW
  check('recharge flows after the quiet delay', geode.esRecharging && geode.es > 90 && geode.es < geode.maxEs(),
    `es ${geode.es.toFixed(1)}`);
  mitigateTyped(geode, { fire: 10 });
  // interruptEsRecharge stamps the delay; updateTimers flips the flag on
  // the next tick — step one frame, then read the stream stopped.
  const delayRestamped = geode.esDelay > 0;
  step(w, 1 / 60, 1);
  check('a wound interrupts the flowing stream', delayRestamped && !geode.esRecharging,
    `delay ${geode.esDelay.toFixed(2)}`);
}

// ------------------------------- passive block: THE GUARD LAW (block value) --
{
  seedGlobalRandom(0xb10c);
  const w = makeSimWorld('warrior', 1007);
  const me = w.player!;
  const m = spawn(w, 'sylvan_warden', 8, 400, 400);
  const BC = DEFENSE_CFG.block;
  const guardOf = (a: Actor) => (BC.guardBase + BC.guardPerLevel * a.level
    + a.sheet.get('blockValue')) * a.sheet.get('guardStrength');
  // The pure wound of a physical raw vs this target is the armor fold alone
  // (damageTaken 1, slayer lane base 0, no insight/ES/endurance authored);
  // the pools half then shaves poiseDR × full-bar wear off whatever seeps.
  // Every expectation reads the LIVE sheet, so a rolled warden boon folds
  // into the prediction instead of breaking it.
  const woundOf = (a: Actor, raw: number) => {
    const armor = a.sheet.get('armor');
    return raw * (1 - armor / (armor + DEFENSE_CFG.armor.k * raw));
  };
  const seepOf = (a: Actor, raw: number) =>
    Math.max(0, woundOf(a, raw) - guardOf(a)) * (1 - a.sheet.get('poiseDR'));
  // A TRUE restore between attempts: statuses un-fold through their own
  // per-id sheet sources (a bare array wipe leaves the fold stale) and
  // fillResources re-arms the poise state machine (poiseBroken is sticky
  // until the regen ladder re-arms it — which these rigs never step).
  const restore = (a: Actor) => {
    for (const s of a.statuses) a.sheet.setSource('status:' + s.id, []);
    a.statuses.length = 0;
    a.fillResources();
  };
  const swing = (raw: number) => applyHit(me, m, {
    amounts: { physical: raw }, crit: false,
    tags: new Set<SkillTag>(['attack', 'melee']),
    sourceName: 'probe_block', extra: [],
  });
  // Swing until the passive block fires (warden chance 0.15 — seeded and
  // bounded); the target is restored whole before every attempt so each
  // blocked swing meets a full bar at wear 1.
  const blockedSwing = (raw: number) => {
    for (let i = 0; i < 400; i++) {
      restore(m);
      const r = swing(raw);
      if (r.blocked) return r;
    }
    return undefined;
  };

  check('the level floor is the guard (base + perLevel × 8, no investment)',
    Math.abs(guardOf(m) - (BC.guardBase + BC.guardPerLevel * m.level)) < 1e-9,
    guardOf(m).toFixed(1));

  { // COLD: a wound the guard covers blocks to NOTHING — the old full stop.
    const raw = 20;
    check('small wound sits under the guard', woundOf(m, raw) < guardOf(m),
      `${woundOf(m, raw).toFixed(1)} vs ${guardOf(m).toFixed(1)}`);
    const r = blockedSwing(raw);
    check('cold block: zero total, life and poise untouched',
      !!r && r.total === 0 && m.life === m.maxLife() && m.poise === m.maxPoise(),
      r ? `total ${r.total}` : 'no block in 400');
  }

  { // THE BOUNDARY: wound == guard is still cold; a step past it seeps.
    // Solve k·raw²/(a + k·raw) = g for raw, then probe both sides.
    const g = guardOf(m), k = DEFENSE_CFG.armor.k, a = m.sheet.get('armor');
    const rawEq = (g * k + Math.sqrt(g * g * k * k + 4 * k * g * a)) / (2 * k);
    const under = blockedSwing(rawEq - 0.5);
    check('hit at the guard line blocks cold', !!under && under.total === 0,
      under ? `total ${under.total.toFixed(4)}` : 'no block in 400');
    const over = blockedSwing(rawEq + 6);
    check('one step past the line seeps the excess (and only the excess)',
      !!over && over.total > 0
      && Math.abs(over.total - seepOf(m, rawEq + 6)) < 0.05,
      over ? `total ${over.total.toFixed(2)} vs ${seepOf(m, rawEq + 6).toFixed(2)}` : 'no block in 400');
  }

  { // THE SEEP: a haymaker's excess rides the pools half — poise pays on
    // what got through (and only then), the life cut equals the result.
    const r = blockedSwing(160);
    check('heavy blocked hit seeps (wound − guard) × the pools half',
      !!r && Math.abs(r.total - seepOf(m, 160)) < 0.05,
      r ? `total ${r.total.toFixed(2)} vs ${seepOf(m, 160).toFixed(2)}` : 'no block in 400');
    check('the seep is the life cut, and poise chipped on it',
      !!r && Math.abs(m.maxLife() - r.total - m.life) < 1e-6 && m.poise < m.maxPoise());
  }

  { // INVESTMENT: blockValue widens the guard flat; guardStrength scales it.
    const r0 = blockedSwing(160);
    m.sheet.setSource('probeBlock', [mod('blockValue', 'flat', 30)]);
    const r1 = blockedSwing(160);
    check('+30 block value eats 30 more of the wound',
      !!r0 && !!r1 && Math.abs((r0.total - r1.total) - 30 * (1 - m.sheet.get('poiseDR'))) < 0.05,
      r0 && r1 ? `${r0.total.toFixed(2)} -> ${r1.total.toFixed(2)}` : 'no block in 400');
    m.sheet.setSource('probeBlock', [
      mod('blockValue', 'flat', 30), mod('guardStrength', 'increased', 0.5)]);
    const r2 = blockedSwing(160);
    check('guard strength scales the whole guard (one vocabulary)',
      !!r2 && Math.abs(r2.total - seepOf(m, 160)) < 0.05,
      r2 ? `total ${r2.total.toFixed(2)} vs ${seepOf(m, 160).toFixed(2)}` : 'no block in 400');
    m.sheet.setSource('probeBlock', []);
  }

  { // THE PLY LAW through the shield: a plied blocker's seep tears a ply —
    // no life moves (the block branch feeds the same gate the landed path uses).
    const grub = spawn(w, 'cinderkin', 5, 700, 400);
    grub.sheet.setSource('probeBlock', [mod('blockChance', 'flat', 0.6)]);
    check('the grub spawns count-durable (4 plies)', grub.plies === 4, String(grub.plies));
    check('the heavy seep clears the ply floor',
      200 - guardOf(grub) >= plyFloorOf(grub),
      `seep ${(200 - guardOf(grub)).toFixed(1)} floor ${plyFloorOf(grub).toFixed(1)}`);
    let r; let tries = 0;
    for (; tries < 400 && !r?.blocked; tries++) {
      grub.plies = 4; grub.life = grub.maxLife();
      r = applyHit(me, grub, {
        amounts: { physical: 200 }, crit: false,
        tags: new Set<SkillTag>(['attack', 'melee']),
        sourceName: 'probe_block', extra: [],
      });
    }
    check('blocked seep on a plied body: one ply tears, no life moves',
      !!r?.blocked && r.plyEaten === true && r.total === 0
      && grub.plies === 3 && grub.life === grub.maxLife(),
      r?.blocked ? `plies ${grub.plies}` : 'no block in 400');
  }

  { // THE ACTIVE LANE, byte-untouched: a raised Shield Up still intercepts
    // WHOLE hits in world.ts (tryGuardBlock), before applyHit ever runs —
    // pool = shieldLife × guardStrength exactly as before, no seep grammar.
    // Seat the attacker FIRST so the guard's cast-facing covers it.
    restore(m);
    m.pos = vec(me.pos.x + 40, me.pos.y);
    const inst = makeSkillInstance(SKILLS.shield_up, 1);
    const ok = w.useSkill(me, inst, vec(m.pos.x, m.pos.y));
    check('shield up raises (guard cast accepted)', ok);
    const pool0 = me.casting?.shield ?? 0;
    check('the stance pool is shieldLife × guardStrength, untouched by the guard law',
      Math.abs(pool0 - 60 * me.sheet.get('guardStrength')) < 1e-6, String(pool0));
    const cleave = makeSkillInstance(SKILLS.cleave, 1);
    const life0 = me.life;
    w.useSkill(m, cleave, vec(me.pos.x, me.pos.y));
    step(w, 1 / 20, 20); // let the warden's swing resolve into the raised wall
    const pool1 = me.casting?.shield ?? 0;
    check('the raised guard eats the whole blow — no life, pool pays',
      me.life === life0 && pool1 < pool0,
      `life ${life0.toFixed(1)} -> ${me.life.toFixed(1)}, pool ${pool0.toFixed(1)} -> ${pool1.toFixed(1)}`);
  }
}

console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
