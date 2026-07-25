// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE READERS (the mantid school) end to end on the real
// engine (docs/engine/tells.md, the commitment sources): the registry weave
// (five stances + looks + noDrop kit + the molting ground + the stalkwood
// seats — the TEACHING-PAIRS law as data), THE READABLE-BLUFF CENSUS with
// teeth (any feint.chance > 0.35 anywhere in the bestiary MUST wear a
// 'feinting'-source tell; > 0.6 is refused even told; the lash maiden's
// rare untold game stays legal), the pure commitment sources
// ('casting' progress + skill-arg filter + channel + THE FEINT EXCLUSION,
// 'feinting', 'foecast' banded, 'engaged', the buff lane the redoubt
// wears), the SIGNED lean algebra, and the five live lessons on the loop:
//   FEINT vs COMMIT — the duelist's bluffed bar drops payload-less wearing
//     the guard flare while a true cut wears the blade (divergence pinned
//     on real casts), and the headsman's bar ramps monotonically, LANDS,
//     never bluffs, and stands its authored plant window;
//   THE READER — the augur retreats out of a LIVE cast bar (stamp + worn
//     back-lean + actual ground opened) and returns when the bar ends;
//   THE COILED — the penitent holds a 6s staring contest at ZERO casts,
//     then releases on your bar (dash + lunge) and on your step into reach;
//   THE SETTER — the redoubt's plates close across the set bar (count
//     ramp), the buff IS the armor (sheet delta), the turtle stands the
//     body still facing away, and the plates part into a real open window.
// Plus the co-op wire round trip for the new sources (negative lean crosses)
// and the portrait's asymmetric book (blade shown, shield sheathed).
// Run: npx tsx balance/probe_readers.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SKILLS } from '../src/data/skills';
import { TILESETS } from '../src/data/tilesets';
import { landmarkDefs, hasDoodadRule } from '../src/engine/levelgen';
import { PART_PAINTERS } from '../src/render/vis/parts';
import {
  materializeTellDress, resolveTell, tellDressOf, tellPortraitDress,
  validateTells, type TellBody, type TellSpec,
} from '../src/engine/tells';
import { castRemaining } from '../src/engine/brain';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { setSimTap } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import { angleDiff, angleTo, dist, vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5eed);

const DT = 1 / 60;
const SCHOOL = ['mantid_duelist', 'mantid_headsman', 'mantid_augur', 'mantid_penitent', 'pillbug_redoubt'] as const;

const spawn = (w: ReturnType<typeof makeSimWorld>, id: string, lvl = 6,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};

// The stationary caster-post: a big still body on the player team whose
// LONG bar (headsman_arc, 1.7s) the probe presses by hand — the school's
// reading rigs need a commitment to read.
MONSTERS.probe_reader_post = {
  id: 'probe_reader_post', name: 'Probe Post', color: '#8899aa', shape: 'circle',
  radius: 13, base: { life: 6000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: ['headsman_arc'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

// Hand-built state for the pure rigs (TellBody is structural by design).
const body = (over?: Partial<TellBody>): TellBody => ({
  id: 7, life: 80, maxLife: () => 100, plies: 0, pliesMax: 0,
  drives: new Map<string, number>(), charges: new Map<string, number>(),
  statuses: [], buffs: new Map<string, { stacks: number; def: { maxStacks?: number } }>(),
  aggroed: false, aiMoraleUntil: 0,
  ...over,
});
const W = { time: 5, radiance: () => 0.4 };
const row = (source: string, over?: Partial<TellSpec>): TellSpec =>
  ({ source, channel: { kind: 'glow' }, ...over });
const barBody = (elapsed: number, total: number, id = 'x', over?: Partial<TellBody>): TellBody =>
  body({ casting: { inst: { def: { id } }, mode: 'cast', elapsed, total, held: false }, ...over });

// Press the post's long bar at a point (the commitment the school reads).
const press = (w: ReturnType<typeof makeSimWorld>, post: Actor, at: { x: number; y: number }): void => {
  const inst = post.skills.find(s => s?.def.id === 'headsman_arc');
  if (!inst) throw new Error('post kit missing headsman_arc');
  const ok = w.useSkill(post, inst, vec(at.x, at.y));
  if (!ok) throw new Error('post press refused');
};

// Park the sim hero out of acquisition range: the rigs read the POST, and
// a nearer idle hero would honestly (and uselessly) win the school's lock.
const parkHero = (w: ReturnType<typeof makeSimWorld>): void => {
  for (const a of w.actors) {
    if (w.seatOf(a)) { a.pos = vec(60, 60); return; }
  }
};

// --- 0) The registry weave + THE READABLE-BLUFF CENSUS -----------------------
{
  const missing = SCHOOL.filter(id => !MONSTERS[id] || !LOOKS[id]);
  check('weave: the five stances stand (def + look each)', missing.length === 0, missing.join(','));
  const badParts = SCHOOL.flatMap(id =>
    (LOOKS[id]?.parts ?? []).filter(p => !PART_PAINTERS[p.kind]).map(p => `${id}:${p.kind}`));
  check('weave: every school look part resolves to a painter', badParts.length === 0, badParts.join(','));
  const kit = ['mantis_scythe', 'headsman_arc', 'barb_spit', 'penitent_lunge', 'bulwark_set'];
  check('weave: the school kit exists, noDrop, ai-hinted, and free of mana',
    kit.every(id => SKILLS[id]?.noDrop === true && !!SKILLS[id]?.ai && (SKILLS[id]?.manaCost ?? 1) === 0),
    kit.filter(id => !SKILLS[id]).join(','));
  const faults = validateTells(MONSTERS, PART_PAINTERS);
  check('weave: every shipped tell row validates (school rows included)', faults.length === 0,
    faults.slice(0, 3).join(' | '));
  const lm = landmarkDefs().find(d => d.id === 'molting_ground');
  check('weave: the molting ground stands (fence_ring of molt husks, mixed school table)',
    !!lm && lm.builder === 'fence_ring' && lm.params?.fenceKind === 'molt_husk'
    && hasDoodadRule('molt_husk')
    && (lm?.spawns?.table ?? []).every(e => !!MONSTERS[e.id])
    && SCHOOL.every(id => lm?.spawns?.table?.some(e => e.id === id)));
  const sw = TILESETS.stalkwood;
  const swIds = (sw?.packs?.table ?? []).map(e => e.id);
  check('weave: THE TEACHING-PAIRS LAW — the whole school seats in ONE country (stalkwood packs + the ground)',
    SCHOOL.every(id => swIds.includes(id))
    && (sw?.landmarks ?? []).some(l => l.landmark === 'molting_ground'));
  const pf = (TILESETS.petalfields?.packs?.table ?? []).map(e => e.id);
  check('weave: the overflow keeps the bluff PAIR together (petalfields carries duelist AND headsman)',
    pf.includes('mantid_duelist') === pf.includes('mantid_headsman'));

  // THE READABLE-BLUFF CENSUS, with teeth: repo-wide, def + variants.
  const untold: string[] = [];
  const metronomes: string[] = [];
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    const defTold = !!def.tells?.some(t => t.source === 'feinting');
    const lanes: { chance?: number; told: boolean; tag: string }[] = [
      { chance: def.brain?.behavior?.feint?.chance, told: defTold, tag: id },
      ...(def.brainVariants ?? []).map((v, i) => ({
        chance: v.brain.behavior?.feint?.chance,
        told: defTold || !!v.tells?.some(t => t.source === 'feinting'),
        tag: `${id}[v${i}]`,
      })),
    ];
    for (const l of lanes) {
      if (l.chance === undefined) continue;
      if (l.chance > 0.35 && !l.told) untold.push(l.tag);
      if (l.chance > 0.6) metronomes.push(l.tag);
    }
  }
  check('census: NO untold common bluff stands anywhere (chance > 0.35 requires a feinting tell)',
    untold.length === 0, untold.join(','));
  check('census: no bluff past 0.6 even told (the broken-metronome line)',
    metronomes.length === 0, metronomes.join(','));
  check('census: the two games both stand — the maiden RARE and untold, the duelist COMMON and told',
    (MONSTERS.lash_maiden.brain?.behavior?.feint?.chance ?? 1) <= 0.35
    && !MONSTERS.lash_maiden.tells?.some(t => t.source === 'feinting')
    && (MONSTERS.mantid_duelist.brain?.behavior?.feint?.chance ?? 0) > 0.35
    && MONSTERS.mantid_duelist.tells?.some(t => t.source === 'feinting') === true);
  check('census: the pair contrast is structural — the headsman CANNOT bluff (no feint in the mind)',
    MONSTERS.mantid_headsman.brain?.behavior?.feint === undefined);
}

// --- 1) The pure commitment sources ------------------------------------------
{
  check('casting: bar progress at fine steps (0.3/0.6 → 0.5)',
    resolveTell(row('casting', { steps: 1000 }), barBody(0.3, 0.6), W) === 0.5);
  check('casting: the skill-arg lane filters (casting:y reads 0 on an x bar; casting:x reads it)',
    resolveTell(row('casting:y', { steps: 1000 }), barBody(0.3, 0.6), W) === 0
    && resolveTell(row('casting:x', { steps: 1000 }), barBody(0.3, 0.6), W) === 0.5);
  const held = body({ casting: { inst: { def: { id: 'x' } }, mode: 'channel', elapsed: 2, total: 1, held: true } });
  const dropped = body({ casting: { inst: { def: { id: 'x' } }, mode: 'channel', elapsed: 2, total: 1, held: false } });
  check('casting: a held channel reads 1 (open-ended commitment); released reads 0',
    resolveTell(row('casting'), held, W) === 1 && resolveTell(row('casting'), dropped, W) === 0);
  check('casting: THE FEINT EXCLUSION — a bluffed bar reads 0 (the tell layer cannot lie)',
    resolveTell(row('casting', { steps: 1000 }), barBody(0.3, 0.6, 'x', { aiFeintAt: 9 }), W) === 0);
  check('feinting: 1 exactly while a bluffed bar is in flight (bar + clock, never clock alone)',
    resolveTell(row('feinting'), barBody(0.3, 0.6, 'x', { aiFeintAt: 9 }), W) === 1
    && resolveTell(row('feinting'), barBody(0.3, 0.6), W) === 0
    && resolveTell(row('feinting'), body({ aiFeintAt: 9 }), W) === 0);
  check('foecast: the stamped read under the author band ([0,0.35]: a long bar reads full, a closing one eases)',
    resolveTell(row('foecast', { band: [0, 0.35], steps: 1000 }), body({ aiFoeCastSec: 1.4 }), W) === 1
    && resolveTell(row('foecast', { band: [0, 0.35], steps: 1000 }), body({ aiFoeCastSec: 0.175 }), W) === 0.5);
  check('foecast: castRemaining is THE shared read (bar countdown / held channel 999)',
    castRemaining({ casting: { mode: 'cast', elapsed: 0.4, total: 1.0, held: false } }) === 0.6
    && castRemaining({ casting: { mode: 'channel', elapsed: 5, total: 1, held: true } }) === 999
    && castRemaining({ casting: null }) === 0);
  check('engaged: a live lock reads 1 (the same quarry the reserves test)',
    resolveTell(row('engaged'), body({ aiTargetId: 3 }), W) === 1
    && resolveTell(row('engaged'), body(), W) === 0);
  check('buff: the redoubt lane reads presence off the buff map (non-stacker → 1)',
    resolveTell(row('buff:bulwark_set'), body({ buffs: new Map([['bulwark_set', { stacks: 1, def: {} }]]) }), W) === 1
    && resolveTell(row('buff:bulwark_set'), body(), W) === 0);
  const faults = validateTells({ probe_bad: { tells: [row('foecast')] } }, PART_PAINTERS);
  check('law: a bandless foecast row is NAMED (unbounded seconds require a band)',
    faults.length === 1 && faults[0].includes('foecast'), faults.join('|'));
  // The read-only law over the new lanes.
  const b = barBody(0.3, 0.6, 'x', {
    aiFeintAt: 4, aiFoeCastSec: 0.8, aiTargetId: 3,
    buffs: new Map([['q', { stacks: 2, def: { maxStacks: 4 } }]]),
  });
  const snap = (): string => JSON.stringify({
    c: b.casting, f: b.aiFeintAt, fc: b.aiFoeCastSec, tid: b.aiTargetId,
    bf: [...(b.buffs as Map<string, unknown>)],
  });
  const before = snap();
  for (const src of ['casting', 'casting:x', 'feinting', 'foecast', 'engaged', 'buff:q']) {
    resolveTell(row(src, { band: src === 'foecast' ? [0, 0.35] : undefined }), b, W);
  }
  check('law: the commitment sources are pure reads (state byte-identical after the sweep)',
    snap() === before);
}

// --- 2) The signed lean algebra ------------------------------------------------
{
  const specs: TellSpec[] = [
    { source: 'alert', channel: { kind: 'lean', amp: -1 } },
    { source: 'morale', channel: { kind: 'lean', amp: 0.4 } },
  ];
  const back = materializeTellDress(specs, [1, 0], 1);
  check('lean: a negative amp cants BACKWARD (signed dress, clamped at -1)', back.lean === -1);
  const both = materializeTellDress(specs, [0.5, 1], 2);
  check('lean: the deepest MAGNITUDE wins, sign carried (-0.5 beats +0.4)', both.lean === -0.5);
  const fwd = materializeTellDress(specs, [0, 1], 3);
  check('lean: the forward stalk still reads (+0.4 alone)', Math.abs(fwd.lean - 0.4) < 1e-9);
}

// --- 3) FEINT vs COMMIT — the duelist's divergence on real casts -----------------
{
  seedGlobalRandom(0xb10f);
  const w = makeSimWorld('warrior', 0x5eed1);
  parkHero(w);
  const duelist = spawn(w, 'mantid_duelist', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  duelist.pos = vec(w.arena.w / 2 - 100, w.arena.h / 2);
  const specs = duelist.tellSpecs!;
  let bluffs = 0, reals = 0, bluffDressSeen = false, bladeDressSeen = false;
  let barLife = 0, barObj: object | null = null, wasFeint = false, badBluff = '', badReal = '';
  // A bar's END is the OBJECT going away or being REPLACED — the real
  // follow-up after a bluff can begin the very tick the bluff drops (the
  // feint's aiCooldown has already run out by the hold's end), so a gap
  // between bars is not guaranteed and identity is the honest edge.
  const closeBar = (): void => {
    if (!barObj) return;
    if (wasFeint) {
      bluffs++;
      if (post.life < barLife - 0.01) badBluff = 'a bluff dealt damage';
    } else if (post.life < barLife - 0.01) {
      reals++;
    }
  };
  for (let t = 0; t < 60 && (bluffs < 2 || reals < 2); t += DT) {
    updateAI(duelist, w, DT);
    w.update(DT);
    const cur = duelist.casting;
    if (cur !== barObj) {
      closeBar();                            // the old bar resolved (or dropped)
      barObj = cur;
      if (cur) {                             // a bar just began
        barLife = post.life;
        wasFeint = duelist.aiFeintAt > 0;
        // In-the-moment truth through THE resolver (pure, any tick):
        const vCast = resolveTell(specs[0], duelist, w);
        const vFeint = resolveTell(specs[1], duelist, w);
        if (wasFeint) {
          if (vCast !== 0 || vFeint !== 1) badBluff = `cast=${vCast} feint=${vFeint}`;
        } else if (vFeint !== 0) badReal = `feint=${vFeint}`;
      }
    }
    if (cur) {
      // The worn dress mid-bar (the swept lane — what the player SEES).
      const d = tellDressOf(duelist);
      if (wasFeint && (d?.parts?.[1]?.alpha ?? 0) > 0.5) bluffDressSeen = true;
      if (!wasFeint && (d?.parts?.[0]?.alpha ?? 0) > 0.3) bladeDressSeen = true;
    }
  }
  check('duelist: both games observed on the real loop (≥2 bluffed bars, ≥2 landed cuts)',
    bluffs >= 2 && reals >= 2, `bluffs ${bluffs} / landed ${reals}`);
  check('duelist: a bluff wears the GUARD (feinting 1, casting 0) and lands NOTHING',
    badBluff === '', badBluff);
  check('duelist: a true cut never wears the guard flare', badReal === '', badReal);
  check('duelist: the WORN dress diverges mid-bar (shield flare on bluffs, blade rise on cuts — the swept lane)',
    bluffDressSeen && bladeDressSeen);
}

// --- 4) THE COMMITTED — the headsman's ramp, landing, and plant window ----------
{
  seedGlobalRandom(0xc0331);
  const w = makeSimWorld('warrior', 0x5eed2);
  parkHero(w);
  const hm = spawn(w, 'mantid_headsman', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  hm.pos = vec(w.arena.w / 2 - 150, w.arena.h / 2);
  const specRow = hm.tellSpecs![0];
  const samples: number[] = [];
  let lifeAtBar = 0, landed = false, plantChecked = false, plantHeld = true;
  let feintEver = false, done = false;
  for (let t = 0; t < 30 && !done; t += DT) {
    updateAI(hm, w, DT);
    w.update(DT);
    if (hm.aiFeintAt > 0) feintEver = true;
    if (hm.casting) {
      if (!samples.length) lifeAtBar = post.life;
      samples.push(resolveTell(specRow, hm, w));
    } else if (samples.length && !landed) {
      landed = post.life < lifeAtBar - 1;
      // The authored plant: frozen feet through the recovery.
      if (landed && hm.aiPlantUntil > w.time) {
        const px = hm.pos.x, py = hm.pos.y;
        for (let s = 0; s < 0.6; s += DT) { updateAI(hm, w, DT); w.update(DT); }
        plantHeld = Math.hypot(hm.pos.x - px, hm.pos.y - py) < 4;
        plantChecked = true;
      }
      done = true;
    }
  }
  const monotone = samples.every((v, i) => i === 0 || v >= samples[i - 1]);
  check('headsman: the wind-up DRAWN ON THE BODY ramps monotonically to full across the bar',
    samples.length > 60 && monotone && (samples.at(-1) ?? 0) >= 0.8,
    `${samples.length} samples, last ${samples.at(-1)}`);
  check('headsman: the arc LANDS (the commitment pays — no cancel path exists)', landed);
  check('headsman: the authored punish window — planted feet through the recovery',
    plantChecked && plantHeld);
  check('headsman: it never bluffed (structural — the pair contrast)', !feintEver);
}

// --- 5) THE READER — the augur leaves your window and returns after -------------
{
  seedGlobalRandom(0x4ea6);
  const w = makeSimWorld('warrior', 0x5eed3);
  parkHero(w);
  const augur = spawn(w, 'mantid_augur', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  augur.pos = vec(w.arena.w / 2 - 300, w.arena.h / 2);
  // Let it acquire and settle at its hold.
  for (let t = 0; t < 1.5; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  press(w, post, augur.pos);
  // One tick for the stamp, then read the opening of the window.
  updateAI(augur, w, DT); w.update(DT);
  const stamped = augur.aiFoeCastSec;
  const d0 = dist(augur.pos, post.pos);
  for (let t = 0; t < 0.9; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  const d1 = dist(augur.pos, post.pos);
  const dress = tellDressOf(augur);
  check('augur: the stamp read the bar the moment the lock saw it (aiFoeCastSec > 1s on a fresh 1.7s bar)',
    stamped > 1, `stamped ${stamped.toFixed(2)}`);
  check('augur: it LEFT the window (ground opened while your hands were busy)',
    d1 > d0 + 40, `${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  check('augur: the read is WORN — weight on the back foot + the antennae surge (swept dress)',
    (dress?.lean ?? 0) < -0.5 && (dress?.parts?.[0]?.alpha ?? 0) > 0.5,
    `lean ${dress?.lean}`);
  // The bar ends (1.7s total): the stamp clears and the leaving stops.
  for (let t = 0; t < 1.2; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  const stampAfter = augur.aiFoeCastSec;
  const d2 = dist(augur.pos, post.pos);
  for (let t = 0; t < 1.2; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  const d3 = dist(augur.pos, post.pos);
  check('augur: the window closed and the read cleared (stamp 0, retreat over — it works back toward its hold)',
    stampAfter === 0 && d3 <= d2 + 12, `stamp ${stampAfter}, ${d2.toFixed(0)} → ${d3.toFixed(0)}`);
}

// --- 6) THE COILED — the penitent's staring contest and its two releases --------
{
  seedGlobalRandom(0xc011);
  const w = makeSimWorld('warrior', 0x5eed4);
  parkHero(w);
  const pen = spawn(w, 'mantid_penitent', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  pen.pos = vec(w.arena.w / 2 - 240, w.arena.h / 2);
  let lunges = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === pen && inst.def.id === 'penitent_lunge') lunges++;
    },
  });
  // The staring contest: six full seconds, nobody commits.
  let castEver = false;
  for (let t = 0; t < 6; t += DT) {
    updateAI(pen, w, DT); w.update(DT);
    if (pen.casting) castEver = true;
  }
  const settled = vec(pen.pos.x, pen.pos.y);
  check('penitent: SIX SECONDS of staring contest — zero casts, the whole kit reserved',
    !castEver && lunges === 0 && post.life >= post.maxLife() - 0.01);
  check('penitent: the load is WORN while it waits (engaged → drawn back + the taut shimmer)',
    (tellDressOf(pen)?.lean ?? 0) < -0.5 && (tellDressOf(pen)?.glow?.a ?? 0) > 0.1);
  // Release 1: YOUR bar springs the coil across the gap.
  press(w, post, pen.pos);
  let dashed = false;
  for (let t = 0; t < 2.5 && lunges === 0; t += DT) {
    updateAI(pen, w, DT); w.update(DT);
    if (pen.dash) dashed = true;
  }
  check('penitent: your commitment RELEASED it (the dash crossed the gap, the prayer answered)',
    dashed && lunges >= 1 && post.life < post.maxLife() - 1,
    `dashed ${dashed}, lunges ${lunges}`);
  check('penitent: it stood its ring until then (the contest was standing, not stalking)',
    dist(settled, vec(w.arena.w / 2 - 240 + 60, w.arena.h / 2)) < 260);
  // Release 2: stepping into its lap is also a commitment.
  const pen2 = spawn(w, 'mantid_penitent', 6);
  pen2.pos = vec(post.pos.x - 60, post.pos.y);
  let lunges2 = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === pen2 && inst.def.id === 'penitent_lunge') lunges2++;
    },
  });
  for (let t = 0; t < 1.5 && lunges2 === 0; t += DT) { updateAI(pen2, w, DT); w.update(DT); }
  setSimTap(null);
  check('penitent: proximity is commitment too (a body in its reach is answered)', lunges2 >= 1);
}

// --- 7) THE SETTER — closing plates, the buff that IS the armor, the window -----
{
  seedGlobalRandom(0x5e77);
  const w = makeSimWorld('warrior', 0x5eed5);
  parkHero(w);
  const rd = spawn(w, 'pillbug_redoubt', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  rd.pos = vec(w.arena.w / 2 - 120, w.arena.h / 2);
  const armorOpen = rd.sheet.get('armor');
  const closing: number[] = [];
  let setAt = -1, clock = 0;
  for (let t = 0; t < 5 && setAt < 0; t += DT) {
    clock = t;
    updateAI(rd, w, DT); w.update(DT);
    if (rd.casting?.inst.def.id === 'bulwark_set') {
      closing.push(resolveTell(rd.tellSpecs![0], rd, w));
      const d = tellDressOf(rd);
      if (d?.parts?.[0]) closing.push(-1 - (d.parts[0].params?.n as number ?? -2));
    }
    if (rd.buffs.has('bulwark_set') && setAt < 0) setAt = t;
  }
  const ramp = closing.filter(v => v >= 0);
  const plateNs = closing.filter(v => v < -0.5).map(v => -1 - v);
  check('redoubt: pressed and open, it SET (the reserve fired the bar; the buff landed)', setAt >= 0,
    `set at ${setAt.toFixed(2)}s`);
  check('redoubt: the plates CLOSED across the bar (the casting:bulwark_set ramp climbed)',
    ramp.length > 30 && ramp.every((v, i) => i === 0 || v >= ramp[i - 1] - 1e-9) && (ramp.at(-1) ?? 0) >= 0.8,
    `ramp last ${ramp.at(-1)}`);
  check('redoubt: the worn plate COUNT climbed with it (count dial on the swept dress)',
    plateNs.length > 0 && Math.max(...plateNs) >= 5 && Math.min(...plateNs) <= 2,
    `n ${Math.min(...plateNs)}..${Math.max(...plateNs)}`);
  check('redoubt: the buff IS the armor (sheet delta ≥ the granted flat)',
    rd.sheet.get('armor') >= armorOpen + 55,
    `${armorOpen} → ${rd.sheet.get('armor')}`);
  // The turtle window: still feet, shell to the foe (facing AWAY).
  const px = rd.pos.x, py = rd.pos.y;
  for (let t = 0; t < 2; t += DT) { updateAI(rd, w, DT); w.update(DT); }
  const away = Math.abs(angleDiff(rd.facing, angleTo(post.pos, rd.pos)));
  check('redoubt: SET is near-immobile (the turtle stands its ground)',
    Math.hypot(rd.pos.x - px, rd.pos.y - py) < 8);
  check('redoubt: the shell faces the argument (turtle turns its back on the threat)', away < 0.7,
    `off by ${away.toFixed(2)}`);
  check('redoubt: worn CLOSED while the set holds (the buff row + the hunch)',
    resolveTell(rd.tellSpecs![1], rd, w) === 1 && (tellDressOf(rd)?.scale ?? 1) > 1.05);
  // The plates part: a REAL open window before the next set (cooldown law).
  let openFrom = -1, reclosedAt = -1;
  for (let t = 0; t < 9 && reclosedAt < 0; t += DT) {
    clock += DT;
    updateAI(rd, w, DT); w.update(DT);
    const closed = rd.buffs.has('bulwark_set');
    if (!closed && openFrom < 0) openFrom = clock;
    if (closed && openFrom >= 0) reclosedAt = clock;
  }
  check('redoubt: the plates PART into a real punish window (≥2.5s open before any re-set)',
    openFrom >= 0 && (reclosedAt < 0 || reclosedAt - openFrom >= 2.5),
    `open ${openFrom.toFixed(1)} reclosed ${reclosedAt.toFixed(1)}`);
}

// --- 8) The co-op wire: the new sources' readings cross as ordinary scalars -----
{
  seedGlobalRandom(0x33e1);
  const w = makeSimWorld('warrior', 0x5eed6);
  parkHero(w);
  const augur = spawn(w, 'mantid_augur', 6);
  const post = spawn(w, 'probe_reader_post', 6, 'player');
  post.pos = vec(w.arena.w / 2, w.arena.h / 2);
  augur.pos = vec(w.arena.w / 2 - 300, w.arena.h / 2);
  for (let t = 0; t < 1.2; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  press(w, post, augur.pos);
  for (let t = 0; t < 0.4; t += DT) { updateAI(augur, w, DT); w.update(DT); }
  check('wire(host): the augur is mid-read (worn back-lean on the host)',
    (tellDressOf(augur)?.lean ?? 0) < -0.5);
  const snap = serializeSnapshot(w, 1);
  const w2 = makeSimWorld('warrior', 0x5eed7);
  applySnapshot(w2, snap);
  const cAug = w2.actors[snap.actors.findIndex(x => x.id === augur.id)];
  check('wire: the reading crossed as derived scalars (client tl mirrors the host sweep)',
    JSON.stringify(snap.actors.find(x => x.id === augur.id)?.tl) === JSON.stringify(augur.tells));
  check('wire: the client wears the same back-foot cant from the same numbers (no source state crossed)',
    (tellDressOf(cAug)?.lean ?? 0) === (tellDressOf(augur)?.lean ?? 1)
    && (tellDressOf(cAug)?.lean ?? 0) < -0.5,
    `client ${tellDressOf(cAug)?.lean} host ${tellDressOf(augur)?.lean}`);
}

// --- 9) The portrait's book: asymmetry preserved, the wall shown closed ---------
{
  const dd = tellPortraitDress(MONSTERS.mantid_duelist.tells!);
  check('portrait(duelist): the blade shows raised, the guard stays SHEATHED (portrait 0 on the bluff row)',
    (dd.parts?.[0]?.alpha ?? 0) > 0.5 && (dd.parts?.[1]?.alpha ?? 1) === 0);
  const dh = tellPortraitDress(MONSTERS.mantid_headsman.tells!);
  check('portrait(headsman): the edge shows, the swell does not (posture rows pin portrait 0)',
    (dh.parts?.[0]?.alpha ?? 0) > 0.5 && dh.scale === 1);
  const dr = tellPortraitDress(MONSTERS.pillbug_redoubt.tells!);
  check('portrait(redoubt): the book shows the CLOSED wall (full plates, no mid-close ghost)',
    (dr.parts?.[1]?.alpha ?? 0) === 1 && (dr.parts?.[0]?.params?.n ?? 1) === 0 && dr.scale === 1);
  const da = tellPortraitDress(MONSTERS.mantid_augur.tells!);
  check('portrait(augur): the antennae surge shows, the lean does not (the book stands still)',
    (da.parts?.[0]?.alpha ?? 0) > 0.5 && da.lean === 0);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
