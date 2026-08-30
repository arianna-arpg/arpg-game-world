// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SUPPORT BASE end to end on the real engine
// (engine/supportbase.ts; docs/engine/supportbase.md). Pins:
//   - THE VEIN: rollVein draws one weighted row per axis, pure in its rand
//     (rand→0 = first rows, rand→1- = last rows) — the mint site's die is
//     the only die; mintSupportInstance stamps a chassis copy and leaves
//     ordinary gems untouched,
//   - THE CANONICAL CUT: rows[0] per axis — the census face, the tolerant
//     fallback (an unknown saved row id falls back per-axis), and the
//     blob-less fold (worn grafts behave as the canonical cut),
//   - THE RESIDENCE: the cut survives pack/unpack through the gem wrapper
//     and the socket row (fixed at the vein — her Card-B ruling),
//   - THE GATE READS THE CUT (Card D): a hit-fed cut refuses a hitless
//     host and sockets fine on a striking one; blob-less fit gates on the
//     canonical cut,
//   - THE FOLD: a steady cut births its clutch on every landed top-level
//     blow (capped); a gauge cut banks hits and bears exactly at its
//     threshold, then re-arms — the brood are ordinary capped, mortal,
//     keeper-credited minions through the clutch door ('__vein' census).
// Run: npx tsx balance/probe_supportbase.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeSkillInstance, supportFitsInst, type SkillInstance, type SupportInstance } from '../src/engine/skills';
import {
  canonicalVein, mintSupportInstance, resolveVein, rollVein, veinLines, veinMechanisms,
} from '../src/engine/supportbase';
import { packSupportGemPayload, makeSupportGemItem, supportOfGemItem } from '../src/engine/gemitems';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';

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
const seatInst = (w: World, inst: SkillInstance): void => {
  const slot = w.player.skills.findIndex(s => !s);
  if (slot >= 0) w.player.skills[slot] = inst; else w.player.skills.push(inst);
  w.seats[0].meta.knownSkills.set(inst.def.id, inst);
};
const hit = (w: World, inst: SkillInstance, dummy: Actor, n = 1): void => {
  for (let i = 0; i < n; i++) {
    (w as unknown as { resolveHit(c: Actor, i: SkillInstance, t: Actor): void })
      .resolveHit(w.player, inst, dummy);
  }
};
const VEIN = SUPPORTS.teeming_vein;
const BASE = VEIN.rollBase!;

// ------------------------------------------------------------- the vein
{
  check('census: the Teeming Vein is a chassis (rollBase present, spawn kind, 3 axes)',
    !!BASE && BASE.kind === 'spawn' && BASE.axes.length === 3);
  check('census: every brood row names a registered kind',
    BASE.axes.find(a => a.id === 'brood')!.rows.every(r => !!MONSTERS[r.monsterId!]));
  const lo = rollVein(BASE, () => 0);
  const hi = rollVein(BASE, () => 0.999999);
  check('vein: the roll is pure in its rand — rand→0 draws first rows, rand→1 draws last',
    lo.trigger === 'steady' && lo.brood === 'broodlings' && lo.clutch === 'single'
    && hi.trigger === 'chance' && hi.brood === 'grubs' && hi.clutch === 'brood4',
    `lo ${JSON.stringify(lo)} hi ${JSON.stringify(hi)}`);
  check('vein: mintSupportInstance stamps a chassis copy and leaves ordinary gems bare',
    !!mintSupportInstance(VEIN, 1, () => 0.5).rolled
    && mintSupportInstance(SUPPORTS.broodbearer, 1, () => 0.5).rolled === undefined);
  check('canonical: rows[0] per axis — the committed census face',
    JSON.stringify(canonicalVein(BASE)) === JSON.stringify({ trigger: 'steady', brood: 'broodlings', clutch: 'single' }));
  const healed = resolveVein(BASE, { trigger: 'gone_row', brood: 'cinders', clutch: 'pair' });
  check('tolerant: an unknown saved row id falls back PER AXIS to canonical (a data patch never bricks the gem)',
    healed.trigger.id === 'steady' && healed.brood.id === 'cinders' && healed.clutch.id === 'pair');
  check('the cut READS: one line per axis, in axis order',
    veinLines(BASE, { trigger: 'chance', brood: 'gnats', clutch: 'pair' }).length === 3);
}

// -------------------------------------------------------- the residence
{
  const gem: SupportInstance = { def: VEIN, level: 1, rolled: { trigger: 'gauge_quick', brood: 'cinders', clutch: 'pair' } };
  const item = makeSupportGemItem(gem);
  const back = supportOfGemItem(item);
  check('residence: the cut survives the wrapper round trip (fixed at the vein)',
    JSON.stringify(back?.rolled) === JSON.stringify(gem.rolled)
    && JSON.stringify(packSupportGemPayload(gem).rolled) === JSON.stringify(gem.rolled));
}

// ------------------------------------------------- the gate reads the cut
{
  const striking = makeSkillInstance(SKILLS.firebolt, 1);
  const hitless = makeSkillInstance(SKILLS.summon_skeleton, 1);
  const cut = { trigger: 'gauge_quick', brood: 'gnats', clutch: 'single' };
  check('gate (Card D): a hit-fed cut refuses a hitless host and sockets a striking one',
    supportFitsInst(VEIN, striking, cut) === true
    && supportFitsInst(VEIN, hitless, cut) === false);
  check('gate: blob-less fit gates on the CANONICAL cut (worn grafts, the census)',
    supportFitsInst(VEIN, striking) === true
    && supportFitsInst(VEIN, hitless) === false
    && veinMechanisms(BASE).includes('strikes'));
}

// ------------------------------------------------------- the steady fold
{
  seedGlobalRandom(1101);
  const w = makeSimWorld('warrior', 1101);
  w.player.pos = vec(600, 500);
  const dummy = spawn(w, 'zombie', 1, 700, 500);
  dummy.sheet.setBase('life', 50000);
  dummy.life = dummy.maxLife();
  const inst = makeSkillInstance(SKILLS.firebolt, 1);
  inst.granted = true;
  inst.sockets[0] = { def: VEIN, level: 1, rolled: { trigger: 'steady', brood: 'broodlings', clutch: 'pair' } };
  seatInst(w, inst);
  hit(w, inst, dummy, 1);
  const brood = (): Actor[] =>
    w.actors.filter(a => !a.dead && a.owner === w.player
      && a.sourceSkillId === '__vein:firebolt:teeming_vein');
  check('fold: a steady cut bears its clutch on ONE landed blow (a pair, keeper-credited, mortal)',
    brood().length === 2 && brood().every(b => b.lifespan > 0 && b.defId === 'broodling'),
    `brood ${brood().length}`);
  hit(w, inst, dummy, 6);
  check('fold: the clutch cap holds under a hammer (pair rolls cap 4)',
    brood().length === 4, `brood ${brood().length}`);
}

// -------------------------------------------------------- the gauge fold
{
  seedGlobalRandom(1201);
  const w = makeSimWorld('warrior', 1201);
  w.player.pos = vec(600, 500);
  const dummy = spawn(w, 'zombie', 1, 700, 500);
  dummy.sheet.setBase('life', 50000);
  dummy.life = dummy.maxLife();
  const inst = makeSkillInstance(SKILLS.firebolt, 1);
  inst.granted = true;
  const socket: SupportInstance = { def: VEIN, level: 1, rolled: { trigger: 'gauge_quick', brood: 'cinders', clutch: 'single' } };
  inst.sockets[0] = socket;
  seatInst(w, inst);
  const brood = (): Actor[] =>
    w.actors.filter(a => !a.dead && a.owner === w.player && a.sourceSkillId === `__vein:firebolt:teeming_vein`);
  hit(w, inst, dummy, 8);
  check('gauge: eight blows bank, nothing bears (the cut says nine)',
    brood().length === 0 && socket.gauge === 8, `gauge ${socket.gauge}`);
  hit(w, inst, dummy, 1);
  check('gauge: the ninth blow bears ONE cinder sprite and re-arms the gauge',
    brood().length === 1 && brood()[0].defId === 'cinder_sprite' && socket.gauge === 0,
    `brood ${brood().length}, gauge ${socket.gauge}`);
  // Blob-less = the canonical cut (steady/broodlings/single): the worn-
  // graft face folds LIVE without a roll anywhere.
  const bare = makeSkillInstance(SKILLS.firebolt, 1);
  bare.granted = true;
  bare.sockets[0] = { def: VEIN, level: 1 };
  seatInst(w, bare);
  hit(w, bare, dummy, 1);
  const canonBrood = w.actors.filter(a => !a.dead && a.owner === w.player
    && a.sourceSkillId === `__vein:firebolt:teeming_vein` && a.defId === 'broodling');
  check('canonical fold: a blob-less copy bears as rows[0] (steady, one broodling)',
    canonBrood.length >= 1, `broodlings ${canonBrood.length}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
