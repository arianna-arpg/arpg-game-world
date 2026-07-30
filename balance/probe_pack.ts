// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PACK LAYER end to end on the real engine
// (docs/engine/pack.md). The social machinery was always there; this pins
// that what is DRAWN of it is exactly what is TESTED:
//
//   A  the registry weave — every pack tell row names a live source, bands
//      its unbounded reads, wears a real painter; every bond that draws a
//      link resolves a style; the WARDEN CENSUS names any bond whose
//      beneficiaries never show they are warded.
//   B  the pure link derivation — bondLinkLive's predicate, the share law
//      (total + per-holder caps), deterministic drop order, view-bin
//      stability, live endpoints, and the `link: false` opt-out.
//   C  THE WARDEN, on the real world: the drawn link set is byte-identical
//      to the live bond set at every step of a court forming and breaking,
//      and killing the holder drops both mods and lines in the same frame.
//   D  THE CRAVEN: nerve is the SAME arithmetic the break decision runs —
//      pinned against a live wound ramp, an odds ramp, the borrowed-courage
//      pin, the routing floor, and the posture that rides them.
//   E  THE MATRIARCH: juveniles are recorded, wardTo runs the young TO the
//      adult (never to the exit), the huddle registers on both halves, and
//      the brood count drives the guard rule.
//   F  THE COURSING PACK: the squad fold is a true mean, shared by
//      reference, and the promotion rule reads the group meter.
//   G  the co-op wire round trip through the REAL serialize/apply path —
//      holder identity survives, absent clears, and the client derives the
//      same link list from its own registry.
//   H  the read-only law + determinism: the sweep mutates no source state
//      and two identical runs agree byte for byte.
//   I  THE AI LEVERS: aiTurnSpeed reads THROUGH the sheet at the world's
//      turn clamp (the def stamp is the innate base, mods bend it, and an
//      innate-0 body — every player seat — still pivots instantly); a
//      commanded march stamps BehaviorSpec.spacing so moveToward fans the
//      ordered band; DriveSpec.whileOwned=false EMPTIES a kept body's wild
//      meter, so the hungry lean quiets by construction.
//
// Run: npx tsx balance/probe_pack.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  CRAVEN_COLLAPSE, HUNGER_LEAN, JUVENILE_YOUNG, MATRIARCH_GUARD, MATRON_BOND,
  MONSTERS, PACK_HUNGER_CREST, WARDED_LIFT, WARDEN_COURT, type MonsterDef,
} from '../src/data/monsters';
import { mod } from '../src/engine/stats';
import { PART_PAINTERS } from '../src/render/vis/parts';
import {
  bondLinkLive, foldPack, nerveFromLife, nerveFromOdds, nerveFromProximity,
  packLinks, PACK_CFG,
  type BondLinkStyle, type LinkStyleOf, type PackLinkBody,
} from '../src/engine/pack';
import {
  materializeTellDress, resolveTell, TELL_SOURCES,
  type TellBody, type TellSpec, type TellWorld,
} from '../src/engine/tells';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9ac1);

const DT = 1 / 60;
/** Each rig gets its own world — the hermetic-world law re-zeros actor ids,
 *  so a section's assertions never ride the previous section's dynamics. */
let worldSeq = 0;
const mkWorld = (): ReturnType<typeof makeSimWorld> =>
  makeSimWorld('warrior', 0x9ac10000 + (++worldSeq));

/** A big, still, harmless body on the player team — the thing a craven is
 *  outnumbered by and a calf runs from. */
MONSTERS.probe_pack_dummy = {
  id: 'probe_pack_dummy', name: 'Probe Post', color: '#8899aa', shape: 'circle',
  radius: 12, base: { life: 9000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: [], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

const tick = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) w.update(DT);
};
/** The HOST frame loop verbatim: brains, then the world tick (the pack
 *  sweep runs inside w.update, after the movers and the bond scan). */
const tickLive = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) if (!a.dead) updateAI(a, w, DT);
    w.update(DT);
  }
};
const spawn = (w: ReturnType<typeof makeSimWorld>, id: string, lvl = 5,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};
const at = (a: Actor, x: number, y: number): Actor => { a.pos.x = x; a.pos.y = y; return a; };

const STYLE_OF: LinkStyleOf = defId => (defId ? MONSTERS[defId]?.bond?.link : undefined);

/** THE GROUND TRUTH the whole chip rests on: recompute, from scratch and
 *  independently of the render path, the set of (holder → warded) pairs the
 *  engine's own bond scan currently holds. Every WARDEN check below compares
 *  the drawn list against THIS, never against itself. */
const liveBondPairs = (w: { actors: readonly Actor[] }): string[] => {
  const out: string[] = [];
  for (const a of w.actors) {
    if (a.dead || !a.bondHeld || !a.bondFrom || a.bondFrom.dead) continue;
    if (MONSTERS[a.defId ?? '']?.bond?.link === false) continue;
    out.push(`${a.bondFrom.id}->${a.id}`);
  }
  return out.sort();
};
const drawnPairs = (w: { actors: readonly Actor[] }, view = { x: 0, y: 0 }): string[] =>
  packLinks(w.actors as readonly PackLinkBody[], STYLE_OF, view)
    .map(l => `${l.from.id}->${l.to.id}`).sort();

console.log('\n=== A. the registry weave ===');
{
  // Every pack tell row shipped in the shared consts must resolve.
  const rows: [string, TellSpec[]][] = [
    ['WARDEN_COURT', WARDEN_COURT], ['WARDED_LIFT', WARDED_LIFT],
    ['CRAVEN_COLLAPSE', CRAVEN_COLLAPSE], ['JUVENILE_YOUNG', JUVENILE_YOUNG],
    ['MATRIARCH_GUARD', MATRIARCH_GUARD], ['PACK_HUNGER_CREST', PACK_HUNGER_CREST],
  ];
  const bad: string[] = [];
  for (const [name, specs] of rows) {
    for (const s of specs) {
      const head = s.source.includes(':') ? s.source.slice(0, s.source.indexOf(':')) : s.source;
      if (!TELL_SOURCES[s.source] && !TELL_SOURCES[head]) bad.push(`${name}: source ${s.source}`);
      if (s.channel.kind === 'part' && !PART_PAINTERS[s.channel.part.kind]) {
        bad.push(`${name}: painter ${s.channel.part.kind}`);
      }
    }
  }
  check('every shared pack tell row resolves (source + painter)', bad.length === 0, bad.join('; '));

  // Every bond in the bestiary either draws with a resolvable style or has
  // deliberately opted out — no half-authored link rows.
  const styleBad: string[] = [];
  const KINDS = new Set(['beam', 'banner', 'root', 'chain']);
  let bonded = 0;
  for (const id in MONSTERS) {
    const b = MONSTERS[id]?.bond;
    if (!b) continue;
    bonded++;
    if (b.link === false) continue;
    const st = b.link as BondLinkStyle | undefined;
    if (st?.style && !KINDS.has(st.style)) styleBad.push(`${id}: style '${st.style}'`);
    if (st?.width !== undefined && !(st.width > 0)) styleBad.push(`${id}: width`);
  }
  check(`every bond's link style is legal (${bonded} bonds)`, styleBad.length === 0, styleBad.join('; '));

  // THE WARDEN CENSUS: a bond whose beneficiary shows nothing at all is a
  // buff the player can never attribute. Either the line draws, or the body
  // wears a warded tell — silence on both is the fault this names.
  const silent: string[] = [];
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    if (!def?.bond) continue;
    const drawsLine = def.bond.link !== false;
    const wearsTell = !!def.tells?.some(t => t.source === 'warded');
    if (!drawsLine && !wearsTell) silent.push(id);
  }
  check('no bond is entirely invisible (line or warded tell)', silent.length === 0, silent.join(', '));
}

console.log('\n=== B. the pure link derivation + THE SHARE LAW ===');
{
  const body = (id: number, x: number, y: number): PackLinkBody =>
    ({ id, dead: false, pos: { x, y }, radius: 12, defId: undefined, bondHeld: false });
  const holder = body(1, 0, 0);
  const w1 = body(2, 40, 0); w1.bondHeld = true; w1.bondFrom = holder;
  const w2 = body(3, 80, 0); w2.bondHeld = true; w2.bondFrom = holder;

  check('bondLinkLive: held + both alive', bondLinkLive(w1));
  const dead = body(4, 10, 0); dead.bondHeld = true; dead.bondFrom = holder; dead.dead = true;
  check('bondLinkLive: a dead beneficiary draws nothing', !bondLinkLive(dead));
  const orphan = body(5, 10, 0); orphan.bondHeld = true;
  check('bondLinkLive: held with no recorded holder draws nothing', !bondLinkLive(orphan));
  const widowed = body(6, 10, 0);
  widowed.bondHeld = true; widowed.bondFrom = { ...holder, dead: true };
  check('bondLinkLive: a DEAD holder draws nothing', !bondLinkLive(widowed));
  const unheld = body(7, 10, 0); unheld.bondFrom = holder;
  check('bondLinkLive: a recorded holder without the bond draws nothing', !bondLinkLive(unheld));
  const selfy = body(8, 10, 0); selfy.bondHeld = true; selfy.bondFrom = selfy;
  check('bondLinkLive: a body cannot ward itself', !bondLinkLive(selfy));

  const all = [holder, w1, w2, dead, orphan, widowed, unheld, selfy];
  check('derivation draws exactly the live pairs', packLinks(all, () => undefined, { x: 0, y: 0 }).length === 2);

  // THE OPT-OUT.
  const optOut: LinkStyleOf = () => false;
  check('link:false suppresses the line', packLinks(all, optOut, { x: 0, y: 0 }).length === 0);

  // Style resolution + defaults.
  const styled = packLinks(all, () => ({ color: '#123456', style: 'root', width: 3 }), { x: 0, y: 0 });
  check('authored style wins', styled[0].color === '#123456' && styled[0].style === 'root' && styled[0].width === 3);
  const dflt = packLinks(all, () => undefined, { x: 0, y: 0 });
  check('absent style falls back to PACK_CFG', dflt[0].color === PACK_CFG.links.color
    && dflt[0].style === PACK_CFG.links.style && dflt[0].width === PACK_CFG.links.width);

  // THE SHARE LAW — per-holder cap.
  const many: PackLinkBody[] = [holder];
  for (let i = 0; i < PACK_CFG.links.perHolder + 6; i++) {
    const b = body(100 + i, i * 10, 20); b.bondHeld = true; b.bondFrom = holder;
    many.push(b);
  }
  const capped = packLinks(many, () => undefined, { x: 0, y: 0 });
  check(`per-holder cap holds (${capped.length} == ${PACK_CFG.links.perHolder})`,
    capped.length === PACK_CFG.links.perHolder);

  // THE SHARE LAW — total cap, across many holders.
  const crowd: PackLinkBody[] = [];
  let hid = 1000;
  for (let h = 0; h < 20; h++) {
    const hh = body(hid++, h * 30, 0);
    crowd.push(hh);
    for (let i = 0; i < 5; i++) {
      const b = body(hid++, h * 30, 20 + i * 6); b.bondHeld = true; b.bondFrom = hh;
      crowd.push(b);
    }
  }
  const totalCapped = packLinks(crowd, () => undefined, { x: 0, y: 0 });
  check(`total cap holds (${totalCapped.length} <= ${PACK_CFG.links.max})`,
    totalCapped.length === PACK_CFG.links.max);

  // DETERMINISM + the buffer contract.
  const buf: ReturnType<typeof packLinks> = [];
  const r1 = packLinks(crowd, () => undefined, { x: 0, y: 0 }, buf).map(l => `${l.from.id}->${l.to.id}`);
  const r2 = packLinks(crowd, () => undefined, { x: 0, y: 0 }, buf).map(l => `${l.from.id}->${l.to.id}`);
  check('derivation is deterministic + writes through the buffer',
    r1.join() === r2.join() && buf.length === totalCapped.length);

  // WEIGHT outranks proximity (a court survives a rabble when short).
  const near = body(9000, 0, 0);
  const nearW = body(9001, 5, 0); nearW.bondHeld = true; nearW.bondFrom = near; nearW.defId = 'cheap';
  const far = body(9002, 4000, 0);
  const farW = body(9003, 4005, 0); farW.bondHeld = true; farW.bondFrom = far; farW.defId = 'precious';
  const byWeight = packLinks([near, nearW, far, farW],
    d => (d === 'precious' ? { weight: 5 } : { weight: 0 }), { x: 0, y: 0 });
  check('authored weight outranks proximity in the drop order',
    byWeight[0].to.id === 9003);

  // VIEW-BIN STABILITY: a pan smaller than the bin cannot reshuffle the set.
  const a1 = packLinks(crowd, () => undefined, { x: 0, y: 0 }).map(l => `${l.from.id}->${l.to.id}`).join();
  const a2 = packLinks(crowd, () => undefined, { x: PACK_CFG.links.viewBin * 0.4, y: 0 })
    .map(l => `${l.from.id}->${l.to.id}`).join();
  check('a sub-bin camera pan does not reshuffle the kept set', a1 === a2);

  // LIVE ENDPOINTS: rows reference the bodies, so moving one moves the line.
  const live = packLinks([holder, w1], () => undefined, { x: 0, y: 0 })[0];
  holder.pos.x = 999;
  check('endpoints are live body references, never cached coords', live.from.pos.x === 999);
  holder.pos.x = 0;
}

console.log('\n=== C. THE WARDEN — drawn == tested on the real world ===');
{
  const w = mkWorld();
  const matron = at(spawn(w, 'gnoll_matron', 8), 0, 0);
  const p1 = at(spawn(w, 'gnoll_prowler', 8), 60, 0);
  const p2 = at(spawn(w, 'gnoll_prowler', 8), -60, 0);
  const far = at(spawn(w, 'gnoll_prowler', 8), 5000, 0);
  tick(w, 0.4);

  check('the near court wears the bond', p1.bondHeld && p2.bondHeld);
  check('a body out of reach wears nothing', !far.bondHeld && !far.bondFrom);
  check('the recorded holder IS the matron',
    p1.bondFrom === matron && p2.bondFrom === matron);
  check('DRAWN == TESTED: the link set equals the live bond set',
    drawnPairs(w).join() === liveBondPairs(w).join(),
    `drawn=[${drawnPairs(w).join()}] live=[${liveBondPairs(w).join()}]`);
  check('the drawn court is exactly the two in reach', drawnPairs(w).length === 2);

  // THE MODS ARE REAL: the line is not decoration.
  const guardedTaken = p1.sheet.get('damageTaken');
  const bareTaken = far.sheet.get('damageTaken');
  check('the bond actually applies its mods', guardedTaken < bareTaken,
    `warded=${guardedTaken.toFixed(3)} bare=${bareTaken.toFixed(3)}`);

  // WALK ONE OUT: the line must vanish with the buff, in the same sweep.
  at(p2, 5000, 300);
  tick(w, 0.4);
  check('walking out of reach drops the bond AND its line',
    !p2.bondHeld && !p2.bondFrom && drawnPairs(w).length === 1);
  check('drawn == tested after the walk-out',
    drawnPairs(w).join() === liveBondPairs(w).join());

  // KILL THE HOLDER: the whole court falls dark at once.
  at(p2, -60, 0);
  tick(w, 0.4);
  check('the court re-forms on return', drawnPairs(w).length === 2);
  const beforeTaken = p1.sheet.get('damageTaken');
  w.kill(matron, false);
  tick(w, 0.4);
  check('killing the warden drops every line', drawnPairs(w).length === 0,
    drawnPairs(w).join());
  check('killing the warden drops every buff', p1.sheet.get('damageTaken') > beforeTaken);
  check('drawn == tested after the kill',
    drawnPairs(w).join() === liveBondPairs(w).join());

  // THE WARDEN'S OWN READ: wardCount tracked the court the whole way.
  const w2 = mkWorld();
  const m2 = at(spawn(w2, 'gnoll_matron', 8), 0, 0);
  const court: Actor[] = [];
  for (let i = 0; i < 4; i++) court.push(at(spawn(w2, 'gnoll_prowler', 8), 50 + i * 10, 0));
  tick(w2, 0.5);
  check('the warden counts its own court', m2.wardCount === 4, `wardCount=${m2.wardCount}`);
  check('wardCount == the drawn court', m2.wardCount === drawnPairs(w2).length);
  w2.kill(court[0], false);
  w2.kill(court[1], false);
  tick(w2, 0.5);
  check('the court count follows its losses', m2.wardCount === 2, `wardCount=${m2.wardCount}`);
  // And the warden's own tell reads that count (the glow IS the court).
  const glow = resolveTell(WARDEN_COURT[0], m2 as unknown as TellBody, w2 as unknown as TellWorld);
  const glowExpect = resolveTell(WARDEN_COURT[0],
    { ...(m2 as unknown as TellBody), wardCount: 2 } as TellBody, w2 as unknown as TellWorld);
  check('the warden glow reads the live court', glow === glowExpect && glow > 0,
    `glow=${glow}`);
}

console.log('\n=== D. THE CRAVEN — posture tracks the real meter ===');
{
  // The pure terms first (the arithmetic the break decision itself runs).
  check('nerveFromLife: full life is full nerve', nerveFromLife(1, 0.5) === 1);
  check('nerveFromLife: exactly at the line is zero', nerveFromLife(0.5, 0.5) === 0);
  check('nerveFromLife: below the line stays zero', nerveFromLife(0.2, 0.5) === 0);
  check('nerveFromLife: halfway is half', Math.abs(nerveFromLife(0.75, 0.5) - 0.5) < 1e-9);
  check('nerveFromOdds: even numbers are full nerve', nerveFromOdds(3, 3, 2) === 1);
  check('nerveFromOdds: at the deficit is zero', nerveFromOdds(5, 3, 2) === 0);
  check('nerveFromOdds: half the deficit is half', Math.abs(nerveFromOdds(4, 3, 2) - 0.5) < 1e-9);
  check('nerveFromProximity: far is calm', nerveFromProximity(10000, 150) === 1);
  check('nerveFromProximity: inside the bubble is zero', nerveFromProximity(100, 150) === 0);

  // LIVE: a bonepicker's nerve must fall with its wounds, on the same
  // threshold its own morale spec breaks at.
  const w = mkWorld();
  const bp = at(spawn(w, 'gnoll_bonepicker', 8), 0, 0);
  const foe = at(spawn(w, 'probe_pack_dummy', 8, 'player'), 4000, 0);
  bp.aggroed = true; bp.aiTargetId = foe.id;
  tickLive(w, 0.3);
  const spec = MONSTERS.gnoll_bonepicker.brain!.morale!;
  const breakAt = spec.breakAtLife!;
  check('a fresh craven reads full nerve', bp.aiNerve === 1, `nerve=${bp.aiNerve}`);

  // Wound it to the exact midpoint between full and the break line.
  const mid = breakAt + (1 - breakAt) * 0.5;
  bp.life = bp.maxLife() * mid;
  tickLive(w, 0.2);
  check('nerve tracks the wound ramp', Math.abs(bp.aiNerve - 0.5) < 0.06,
    `nerve=${bp.aiNerve.toFixed(3)} expected~0.5`);

  // THE POSTURE reads that meter — and reads it through the SAME resolver
  // the renderer uses, so "drawn" here is literally the drawn value.
  const dressAt = (a: Actor): { scale: number; lean: number } => {
    const vals = CRAVEN_COLLAPSE.map(s =>
      resolveTell(s, a as unknown as TellBody, w as unknown as TellWorld));
    const d = materializeTellDress(CRAVEN_COLLAPSE, vals, 0);
    return { scale: d.scale, lean: d.lean };
  };
  const midPose = dressAt(bp);
  check('a fraying craven has visibly sunk', midPose.scale < 1, `scale=${midPose.scale.toFixed(3)}`);
  check('a fraying craven cants BACK, not forward', midPose.lean < 0, `lean=${midPose.lean.toFixed(3)}`);

  // Push it under the break line: nerve bottoms and the posture bottoms.
  bp.life = bp.maxLife() * (breakAt * 0.5);
  tickLive(w, 0.2);
  check('nerve bottoms at/below the break line', bp.aiNerve === 0, `nerve=${bp.aiNerve}`);
  const lowPose = dressAt(bp);
  check('the collapse deepens monotonically with the meter',
    lowPose.scale < midPose.scale && lowPose.lean < midPose.lean,
    `scale ${midPose.scale.toFixed(3)}→${lowPose.scale.toFixed(3)}`);
  check('the collapse never shrinks past the breathe-law clamp', lowPose.scale > 0.7);

  // ROUTING pins the floor.
  check('a routing body reads the routed floor',
    bp.aiMoraleUntil <= w.time || bp.aiNerve === PACK_CFG.nerve.routed);

  // THE BRAVE DEFAULT: a body with no morale spec never reads craven.
  const brave = at(spawn(w, 'gnoll_butcher', 8), 100, 0);
  tickLive(w, 0.2);
  check('a body that authors no morale stays at full nerve', brave.aiNerve === 1);

  // THE ODDS LANE, live: nerve must also answer being outnumbered.
  const w2 = mkWorld();
  const bp2 = at(spawn(w2, 'gnoll_bonepicker', 8), 0, 0);
  for (let i = 0; i < 4; i++) at(spawn(w2, 'probe_pack_dummy', 8, 'player'), 20 + i * 12, 10);
  bp2.aggroed = true;
  tickLive(w2, 0.25);
  check('being outnumbered frays nerve on its own', bp2.aiNerve < 1,
    `nerve=${bp2.aiNerve.toFixed(3)}`);
}

console.log('\n=== E. THE MATRIARCH AND HER YOUNG ===');
{
  const w = mkWorld();
  // Force the juvenile roll by spawning many and reading the flag.
  const herd: Actor[] = [];
  for (let i = 0; i < 24; i++) herd.push(at(spawn(w, 'sounder_boar', 8), (i % 6) * 40, Math.floor(i / 6) * 40));
  const young = herd.filter(a => a.juvenile);
  const adults = herd.filter(a => !a.juvenile);
  check('the juvenile roll is RECORDED on the body', young.length > 0 && adults.length > 0,
    `young=${young.length} adults=${adults.length}`);

  // THE YOUNG DO NOT LEAVE. The old juvenileBrain was type:'flee' — run for
  // the exit and quit the zone. Pin the new one: a body-seeking rout.
  const jbrain = MONSTERS.sounder_boar.juvenileBrain!;
  check('the young no longer flee the ZONE', jbrain.type !== 'flee', `type=${jbrain.type}`);
  check('the young flee to their own kind', jbrain.morale?.wardTo?.kin === 'sounder_boar');

  // LIVE HUDDLE: a frightened calf placed far from the herd must close on
  // an adult, and BOTH halves of the read must register.
  const w2 = mkWorld();
  const sow = at(spawn(w2, 'sounder_boar', 8), 0, 0);
  sow.juvenile = false;
  sow.brain = MONSTERS.sounder_boar.brain;
  const calf = at(spawn(w2, 'sounder_boar', 8), 520, 0);
  calf.juvenile = true;
  calf.brain = MONSTERS.sounder_boar.juvenileBrain;
  // Scare it: a live intruder inside the skittish bubble keeps it routing.
  const scare = at(spawn(w2, 'probe_pack_dummy', 8, 'player'), 620, 0);
  const startD = Math.hypot(calf.pos.x - sow.pos.x, calf.pos.y - sow.pos.y);
  tickLive(w2, 3.2);
  const endD = Math.hypot(calf.pos.x - sow.pos.x, calf.pos.y - sow.pos.y);
  check('a frightened calf runs TO the adult, not away',
    endD < startD - 100, `${startD.toFixed(0)} → ${endD.toFixed(0)}`);
  check('the calf reads its guardian as near', calf.wardNear > 0,
    `wardNear=${calf.wardNear.toFixed(2)}`);
  check('the adult knows it is standing over young', sow.broodNear >= 1,
    `broodNear=${sow.broodNear}`);
  check('the scare body kept its distance (rig sanity)', scare.pos.x > 400);

  // THE TWO HALVES AGREE: guarded on the calf, brood on the sow.
  const guardedV = resolveTell({ source: 'guarded', channel: { kind: 'glow' } },
    calf as unknown as TellBody, w2 as unknown as TellWorld);
  const broodV = resolveTell({ source: 'brood', band: [0, 3], channel: { kind: 'glow' } },
    sow as unknown as TellBody, w2 as unknown as TellWorld);
  check('both halves of the huddle read nonzero', guardedV > 0 && broodV > 0,
    `guarded=${guardedV} brood=${broodV}`);
  // THE AGREEMENT LAW (a real bug this probe caught): wardNear and
  // broodNear key on ONE threshold. A guardian may never read "no young"
  // while a young beside her reads "guarded" — when they used different
  // rings the calf sat at wardNear 0.75 and the sow saw broodNear 0.
  const disagree = w2.actors.filter(x =>
    x.wardNear >= 1 && !w2.actors.some(g => g.broodNear > 0 && g !== x));
  check('the huddle agrees on both halves (one threshold)', disagree.length === 0,
    `gathered-but-uncounted=${disagree.length}`);

  // THE GUARD RULE fires off the same brood count.
  check('the guard rule reads the brood count', MONSTERS.sounder_boar.brain?.rules
    ?.some(r => (r.when as { ext?: Record<string, unknown> }).ext?.wardsNear !== undefined) === true);

  // A LONE adult reads no brood (the count is not a constant).
  const w3 = mkWorld();
  const lone = at(spawn(w3, 'sounder_boar', 8), 0, 0);
  lone.juvenile = false;
  tickLive(w3, 0.5);
  check('a lone adult reads no brood', lone.broodNear === 0);
}

console.log('\n=== F. THE COURSING PACK — the shared meter ===');
{
  // The fold is a true mean, in place, shared by reference.
  const mk = (h: number): { drives: Map<string, number> } =>
    ({ drives: new Map([['hunger', h]]) });
  const agg = foldPack([mk(0.2), mk(0.4), mk(0.9)]);
  check('foldPack means the members', Math.abs(agg.drives.get('hunger')! - 0.5) < 1e-9,
    `mean=${agg.drives.get('hunger')}`);
  check('foldPack counts the kin', agg.kin === 3);
  const same = foldPack([mk(1), mk(0)], agg);
  check('foldPack folds IN PLACE (the no-churn law)', same === agg && agg.kin === 2);
  check('the re-fold replaced the mean', Math.abs(agg.drives.get('hunger')! - 0.5) < 1e-9);
  const emptied = foldPack([], agg);
  check('an emptied squad clears its drives', emptied.kin === 0 && emptied.drives.size === 0);

  // LIVE: a wolf pack shares one aggregate object, and it reflects the
  // members' real hunger meters (the same map the AI rules read).
  const w = mkWorld();
  const pack: Actor[] = [];
  for (let i = 0; i < 4; i++) pack.push(at(spawn(w, 'plains_wolf', 8), i * 30, 0));
  for (const a of pack) a.squadId = 77;
  for (const a of pack) a.drives.set('hunger', 0.8);
  tickLive(w, 0.35);
  check('the squad shares ONE aggregate by reference',
    pack.every(a => a.packAgg === pack[0].packAgg) && pack[0].packAgg !== undefined);
  check('the aggregate counts the pack', pack[0].packAgg!.kin === 4,
    `kin=${pack[0].packAgg!.kin}`);
  const mean = pack[0].packAgg!.drives.get('hunger') ?? -1;
  check('the pack meter is the members\' real mean', Math.abs(mean - 0.8) < 0.06,
    `mean=${mean.toFixed(3)}`);

  // ONE sated member drags the GROUP meter — the promotion is collective.
  pack[0].drives.set('hunger', 0);
  pack[1].drives.set('hunger', 0);
  tickLive(w, 0.35);
  const mean2 = pack[0].packAgg!.drives.get('hunger') ?? -1;
  check('feeding part of the pack lowers the whole pack\'s meter', mean2 < mean - 0.2,
    `${mean.toFixed(2)} → ${mean2.toFixed(2)}`);

  // THE CREST reads the GROUP meter, not the individual's. Empty ONE wolf
  // while its packmates stay starving: its own belly says nothing and its
  // crest still flies, which is the entire point of the shared read.
  pack[0].drives.set('hunger', 0);
  for (let i = 1; i < pack.length; i++) pack[i].drives.set('hunger', 0.9);
  tickLive(w, 0.3);
  const own = pack[0].drives.get('hunger') ?? 0;
  const packMean = pack[0].packAgg!.drives.get('hunger') ?? 0;
  const crest = resolveTell(PACK_HUNGER_CREST[0],
    pack[0] as unknown as TellBody, w as unknown as TellWorld);
  const ownCrest = resolveTell(PACK_HUNGER_CREST[0],
    { ...(pack[0] as unknown as TellBody), packAgg: { kin: 1, drives: pack[0].drives } } as TellBody,
    w as unknown as TellWorld);
  check('a SATED wolf still wears the PACK\'s hunger', own < 0.05 && crest > 0,
    `own=${own.toFixed(3)} packMean=${packMean.toFixed(3)} crest=${crest}`);
  check('the crest reads the GROUP, not the belly', crest > ownCrest && ownCrest === 0,
    `pack=${crest} alone=${ownCrest}`);

  // The promotion rules exist and read the group meter.
  const rules = MONSTERS.plains_wolf.brain?.rules ?? [];
  const packRules = rules.filter(r =>
    (r.when as { ext?: Record<string, unknown> }).ext?.packDrive !== undefined);
  check('both promotion tiers are authored off the group meter', packRules.length === 2);

  // COURSING reads the resolved prey stamp the hostility gate itself uses.
  const wolf = pack[0];
  wolf.aiPrey = undefined;
  check('no predation open = no coursing tell',
    resolveTell({ source: 'coursing', channel: { kind: 'glow' } },
      wolf as unknown as TellBody, w as unknown as TellWorld) === 0);
  wolf.aiPrey = ['critter'];
  check('predation open = the coursing tell reads',
    resolveTell({ source: 'coursing', channel: { kind: 'glow' } },
      wolf as unknown as TellBody, w as unknown as TellWorld) === 1);
}

console.log('\n=== G. the co-op wire round trip (REAL serialize/apply) ===');
{
  const host = mkWorld();
  const matron = at(spawn(host, 'gnoll_matron', 8), 0, 0);
  const c1 = at(spawn(host, 'gnoll_prowler', 8), 55, 0);
  const c2 = at(spawn(host, 'gnoll_prowler', 8), -55, 0);
  at(spawn(host, 'gnoll_prowler', 8), 6000, 0); // the lone body — found again below by its position
  tick(host, 0.4);
  const hostDrawn = drawnPairs(host);
  check('host court formed (rig sanity)', hostDrawn.length === 2);

  const client = mkWorld();
  applySnapshot(client, serializeSnapshot(host, 1));

  // Identity survives: the client's warded bodies point at the client's own
  // matron shell, and the un-warded one points at nothing.
  const cActors = client.actors;
  const cMatron = cActors.find(a => a.defId === 'gnoll_matron')!;
  const warded = cActors.filter(a => a.bondHeld);
  check('the client wears the same number of bonds', warded.length === 2,
    `warded=${warded.length}`);
  check('the client re-pointed every holder at its OWN shell',
    warded.every(a => a.bondFrom === cMatron));
  const cLone = cActors.find(a => Math.abs(a.pos.x - 6000) < 2)!;
  check('the out-of-reach body carries no bond client-side',
    !cLone.bondHeld && !cLone.bondFrom);

  // THE STRUCTURES MATCH: the client derives the same link COUNT from its
  // own registry (ids are pooled per side, so shape is the comparison).
  const clientDrawn = packLinks(cActors as unknown as PackLinkBody[], STYLE_OF, { x: 0, y: 0 });
  check('client derives the same link count as the host',
    clientDrawn.length === hostDrawn.length, `client=${clientDrawn.length} host=${hostDrawn.length}`);
  const authored = MATRON_BOND.link as BondLinkStyle;
  check('client link styles resolve off its OWN registry',
    clientDrawn.length > 0
    && clientDrawn.every(l => l.color === authored.color && l.style === authored.style),
    `got ${clientDrawn[0]?.color}/${clientDrawn[0]?.style} want ${authored.color}/${authored.style}`);

  // ABSENT CLEARS: kill the matron, re-ship — the pooled shells must not
  // wear a stale court.
  host.kill(matron, false);
  tick(host, 0.4);
  applySnapshot(client, serializeSnapshot(host, 2));
  const stale = client.actors.filter(a => a.bondHeld || a.bondFrom);
  check('an absent holder CLEARS the client pair (no stale court)', stale.length === 0,
    `stale=${stale.length}`);
  check('the client draws no lines once the warden is gone',
    packLinks(client.actors as unknown as PackLinkBody[], STYLE_OF, { x: 0, y: 0 }).length === 0);
  check('host agrees (rig sanity)', drawnPairs(host).length === 0 && c1.bondHeld === false && c2.bondHeld === false);
}

console.log('\n=== H. the read-only law + determinism ===');
{
  // Sources are pure READS: resolving every pack source must leave the
  // body's social state byte-identical.
  const w = mkWorld();
  const a = at(spawn(w, 'gnoll_prowler', 8), 0, 0);
  const m = at(spawn(w, 'gnoll_matron', 8), 40, 0);
  tick(w, 0.3);
  const snapOf = (x: Actor): string => JSON.stringify({
    nerve: x.aiNerve, held: x.bondHeld, from: x.bondFrom?.id ?? null,
    ward: x.wardCount, near: x.wardNear, brood: x.broodNear, juv: x.juvenile,
    kin: x.packAgg?.kin ?? null, drives: [...x.drives.entries()].sort(),
  });
  const before = snapOf(a) + '|' + snapOf(m);
  const SOURCES = ['nerve', 'warded', 'warding', 'guarded', 'brood', 'juvenile',
    'kin', 'packDrive:hunger', 'coursing'];
  for (const s of SOURCES) {
    resolveTell({ source: s, band: [0, 5], channel: { kind: 'glow' } },
      a as unknown as TellBody, w as unknown as TellWorld);
    resolveTell({ source: s, band: [0, 5], channel: { kind: 'glow' } },
      m as unknown as TellBody, w as unknown as TellWorld);
  }
  check('every pack source is a pure READ (state byte-identical)',
    before === snapOf(a) + '|' + snapOf(m));

  // Unknown source stays zero (the fail-closed law).
  check('an unknown pack source resolves 0',
    resolveTell({ source: 'pack_not_a_source', channel: { kind: 'glow' } },
      a as unknown as TellBody, w as unknown as TellWorld) === 0);

  // SAME SEED, SAME STORY.
  const run = (): string => {
    seedGlobalRandom(0x515e);
    const ww = mkWorld();
    at(spawn(ww, 'gnoll_matron', 8), 0, 0);
    for (let i = 0; i < 5; i++) at(spawn(ww, 'gnoll_prowler', 8), 40 + i * 25, 0);
    for (let i = 0; i < 8; i++) at(spawn(ww, 'sounder_boar', 8), -200 - i * 30, 60);
    tickLive(ww, 1.0);
    return ww.actors.map(x =>
      `${x.defId}:${x.juvenile ? 1 : 0}:${x.bondHeld ? 1 : 0}:${x.wardCount}:${x.broodNear}:${x.aiNerve.toFixed(3)}`
    ).join('|') + '#' + drawnPairs(ww).join();
  };
  check('same seed, byte-identical social state', run() === run());
}

console.log('\n=== I. THE AI LEVERS — sheet-read pivot, ordered spacing, owned appetites ===');
{
  // THE PIVOT CAP (BEHAVIOR_STATS.turnSpeed → 'aiTurnSpeed'): the world's
  // turn clamp reads THROUGH the sheet with Actor.turnSpeed (the def stamp)
  // as the innate base. Four shells, four corners of the lane: an innate
  // lumberer, the same body cursed slower, an innate-0 body left free, and
  // an innate-0 body OPENED by a granted rate.
  const shell: Omit<MonsterDef, 'id'> = {
    name: 'Probe Pivot', color: '#8899aa', shape: 'circle', radius: 12,
    base: { life: 200, moveSpeed: 0, accuracy: 100, mana: 0 },
    skills: [], xp: 1, faction: 'beast', brain: { type: 'basic' },
  };
  MONSTERS.probe_pivot_lug = { ...shell, id: 'probe_pivot_lug', turnSpeed: 2 };
  MONSTERS.probe_pivot_bent = {
    ...shell, id: 'probe_pivot_bent', turnSpeed: 2,
    mods: [mod('aiTurnSpeed', 'increased', -0.5)],
  };
  MONSTERS.probe_pivot_free = { ...shell, id: 'probe_pivot_free', turnSpeed: 0 };
  MONSTERS.probe_pivot_granted = {
    ...shell, id: 'probe_pivot_granted', turnSpeed: 0,
    mods: [mod('aiTurnSpeed', 'flat', 1.5)],
  };

  const w = mkWorld();
  // Brains are CALLER-driven (w.update runs none), so a still, castless body
  // moves its facing only through the clamp under test.
  const swingOf = (a: Actor): number => {
    a.facing = 0; a.facingPrev = 0;
    w.update(DT);       // latch facingPrev at 0
    a.facing = 3;       // ask for a 3-rad snap no cap allows in one frame
    w.update(DT);
    return Math.abs(a.facing);
  };
  // The arena is SIM_CFG.arena (1600×1200) with the hero centered — every
  // rig body stands INSIDE it (out-of-zone spawns clamp home on first move).
  const lug = at(spawn(w, 'probe_pivot_lug', 8), 150, 1050);
  const bent = at(spawn(w, 'probe_pivot_bent', 8), 350, 1050);
  const free = at(spawn(w, 'probe_pivot_free', 8), 1250, 1050);
  const opened = at(spawn(w, 'probe_pivot_granted', 8), 1450, 1050);
  check('the def stamp is the innate base (authored 0 survives the default)',
    lug.turnSpeed === 2 && free.turnSpeed === 0,
    `lug=${lug.turnSpeed} free=${free.turnSpeed}`);
  const sLug = swingOf(lug), sBent = swingOf(bent), sFree = swingOf(free), sOpen = swingOf(opened);
  check('an innate rate clamps the swing to rate × dt', Math.abs(sLug - 2 * DT) < 1e-9,
    `swing=${sLug} want ${2 * DT}`);
  check('a modifier BENDS the pivot through the sheet (50% slower mind)',
    Math.abs(sBent - 1 * DT) < 1e-9, `swing=${sBent} want ${1 * DT}`);
  check('an innate-0 body pivots INSTANTLY (the player law, on a monster shell)',
    sFree === 3, `swing=${sFree}`);
  check('a granted rate OPENS the clamp on an innate-0 body (the curse lane)',
    Math.abs(sOpen - 1.5 * DT) < 1e-9, `swing=${sOpen} want ${1.5 * DT}`);
  // And THE PLAYER ITSELF — no def stamp, nothing folded: the clamp must
  // resolve 0 and leave the facing untouched (instant, as ever).
  const sHero = swingOf(w.player);
  check('the player still faces instantly (nothing folded, gate stays open)',
    sHero === 3, `swing=${sHero}`);

  // ORDERED ELBOW ROOM: a standing order stamps BehaviorSpec.spacing before
  // the kind's handler walks — the commanded band pays for its crescent on
  // the way TO the mark, not only after a target locks. Idle bodies still
  // pay nothing, and a spacingless def stamps no phantom room.
  const w2 = mkWorld();
  const SPACING = MONSTERS.gnoll_prowler.brain!.behavior!.spacing!;
  const sq: Actor[] = [];
  for (let i = 0; i < 3; i++) sq.push(at(spawn(w2, 'gnoll_prowler', 8), 200 + i * 26, 200));
  for (const a of sq) a.aiCommand = { kind: 'assault', pos: { x: 200, y: 1000 }, until: w2.time + 60 };
  const y0 = sq.map(a => a.pos.y);
  for (let f = 0; f < 12; f++) { for (const a of sq) updateAI(a, w2, DT); w2.update(DT); }
  check('an ordered march wears its elbow room (assault)',
    sq.every(a => a.aiSpacing === SPACING),
    `aiSpacing=[${sq.map(a => String(a.aiSpacing)).join(',')}] want ${SPACING}`);
  check('the march moved on the mark (rig sanity)', sq.every((a, i) => a.pos.y > y0[i] + 1),
    `dy=[${sq.map((a, i) => (a.pos.y - y0[i]).toFixed(1)).join(',')}]`);
  const holder = at(spawn(w2, 'gnoll_prowler', 8), 1400, 200);
  holder.aiCommand = { kind: 'hold', pos: { x: 1400, y: 900 }, until: w2.time + 60 };
  updateAI(holder, w2, DT);
  check('a hold order marches with elbow room too', holder.aiSpacing === SPACING,
    String(holder.aiSpacing));
  const idler = at(spawn(w2, 'gnoll_prowler', 8), 1500, 1100);
  updateAI(idler, w2, DT);
  check('idle movement still pays nothing (the clear stands)', idler.aiSpacing === undefined,
    String(idler.aiSpacing));
  const dummyCmd = at(spawn(w2, 'probe_pack_dummy', 8), 1400, 400);
  dummyCmd.aiCommand = { kind: 'assault', pos: { x: 1400, y: 700 }, until: w2.time + 60 };
  updateAI(dummyCmd, w2, DT);
  check('a spacingless def stamps nothing on the march', dummyCmd.aiSpacing === undefined,
    String(dummyCmd.aiSpacing));

  // OWNED APPETITES (DriveSpec.whileOwned): a KEPT wolf hunts on orders,
  // not appetite — the wild hunger meter EMPTIES at the leash (never merely
  // freezes), so the hungry lean quiets through the same map it always
  // read; a spec without the flag keeps today's law, and a released body
  // re-seeds fresh.
  const w3 = mkWorld();
  const hero3 = w3.player;
  const wild = at(spawn(w3, 'plains_wolf', 6), 200, 950);
  const kept = at(spawn(w3, 'plains_wolf', 6, 'player'), 1400, 950);
  kept.owner = hero3;
  wild.drives.set('hunger', 0.6);
  kept.drives.set('hunger', 0.6);
  for (let t = 0; t < 2; t += DT) { updateAI(wild, w3, DT); updateAI(kept, w3, DT); }
  check('a wild wolf\'s hunger keeps drifting', (wild.drives.get('hunger') ?? 0) > 0.61,
    `hunger=${(wild.drives.get('hunger') ?? 0).toFixed(3)}`);
  check('a KEPT wolf\'s meter stands down EMPTY, not frozen',
    kept.drives.get('hunger') === undefined, String(kept.drives.get('hunger')));
  wild.drives.set('hunger', 0.9);
  const leanWild = resolveTell(HUNGER_LEAN[0], wild as unknown as TellBody, w3 as unknown as TellWorld);
  const leanKept = resolveTell(HUNGER_LEAN[0], kept as unknown as TellBody, w3 as unknown as TellWorld);
  check('the hungry lean draws on the wild wolf', leanWild > 0, `lean=${leanWild}`);
  check('the lean QUIETS on the kept wolf (drawn == tested, one map)', leanKept === 0,
    `lean=${leanKept}`);
  MONSTERS.probe_want_dummy = {
    ...shell, id: 'probe_want_dummy',
    brain: { type: 'basic', drives: { urge: { rise: 0.5, start: [0.4, 0.4] } } },
  };
  const dflt = at(spawn(w3, 'probe_want_dummy', 6, 'player'), 1400, 300);
  dflt.owner = hero3;
  for (let t = 0; t < 1; t += DT) updateAI(dflt, w3, DT);
  check('an unflagged drive still runs while owned (default = the old law)',
    (dflt.drives.get('urge') ?? 0) > 0.8, `urge=${(dflt.drives.get('urge') ?? 0).toFixed(3)}`);
  kept.owner = undefined;
  updateAI(kept, w3, DT);
  check('a released body re-seeds its appetite', kept.drives.get('hunger') !== undefined,
    String(kept.drives.get('hunger')));

  // THE OWNED JUMP (2026-07-30): event jumps honor the leash too. The AI
  // tick DELETES a kept body's whileOwned:false meter, but bumpDrives
  // (onKill/onHurt/onDealt/onAllyDeath) lands BETWEEN ticks — an unguarded
  // jump would flash a sub-tick value through every read until the next
  // tick swept it (invisible on the wolf, whose only jump is negative;
  // wrong for any positive jump). The jump refuses to feed the dead meter;
  // a wild body's jump lands exactly as before.
  MONSTERS.probe_owned_jump = {
    ...shell, id: 'probe_owned_jump',
    brain: { type: 'basic', drives: { urge: { rise: 0.01, start: [0, 0], onHurt: 0.5, whileOwned: false } } },
  };
  const jumped = at(spawn(w3, 'probe_owned_jump', 6, 'player'), 1400, 150);
  jumped.owner = hero3;
  w3.bumpDrives(jumped, 'onHurt');
  check('an owned whileOwned:false meter stays EMPTY through a positive event jump',
    jumped.drives.get('urge') === undefined, String(jumped.drives.get('urge')));
  const wildJump = at(spawn(w3, 'probe_owned_jump', 6), 200, 150);
  w3.bumpDrives(wildJump, 'onHurt');
  check('the same jump still lands on a WILD body (control unchanged)',
    Math.abs((wildJump.drives.get('urge') ?? 0) - 0.5) < 1e-9,
    String(wildJump.drives.get('urge')));
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
