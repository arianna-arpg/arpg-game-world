// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DISSOLUTION GRAMMAR D0 (engine/dissolve.ts, the World
// hooks — dissolveBreak / popBrittle / harvestSettle / the pre-crack ledger —
// and the canvas-free halves of render/vis/dissolveLayer.ts). Design
// authority docs/design/dissolution.md §3f + §6; engine doc
// docs/engine/dissolution.md. Pins:
//   A. THE MATERIAL-DEFAULT FOLD — a row naming only a material (or only a
//      motion) resolves to a WHOLE spec; precedence row > material > motion
//      > base; absent/unknown rows resolve null; every D0 kind resolves.
//   B. THE RETIREMENT CENSUS (the no-text law made executable) — no
//      registered rule carries `dissolve` AND `brittle.text` / `brittle.warn`;
//      the D0 set all wear a row; the unconverted text carriers are NAMED
//      (D1's tail), never failed on.
//   C. DRAWN == TESTED AT THE INSTANT — a touch-pop through the REAL brittle
//      sweep: the body is gone + spliced at tick 0, the debris stands AT the
//      same tick (non-blocking by every member of the trio, tagged, on the
//      evap lane, seeded dwell inside the band), ONE break record with the
//      spec / seed / strike / debris, the accent rides the pop's own flash
//      (fx = the voice), and no retired line is spoken.
//   D. FADE, NEVER POP — the debris RIDES EVAP to completion through the
//      soft-dry router (dressFading admits the tag), and leaves the list.
//   E. DETERMINISM — same seat + kind → identical seed, cells and poses;
//      different seats differ; every motion's pose law is finite and bounded
//      across its whole life for every cell.
//   F. THE HONEST DEGRADE — past DISSOLVE_CFG.maxLive no motion record is
//      stamped, but EVERY break still lands its debris.
//   G. THE HARVEST PATH — the node crumbles INTO its husk (the husk adopted as
//      the debris: tagged, minutes-grade fade), the payout unchanged.
//   H. THE MIRAGE PARITY — a near-pop keeps the haze ring (no voice over it),
//      speaks no text, leaves no dust, stamps a dissolve record.
//   I. THE PRE-CRACK — over the real dwell sweep the ledger opens at the
//      first press (the stand point), the view's fraction rises, the crack
//      lines grow and stay pure; the pop closes the ledger and ADOPTS the
//      remains doodad as the debris (no second pile).
//   J. THE PIECES — the debris kinds carry rules + `litter` visual rows, the
//      litter painter and the three break voices are registered, every D0
//      voice resolves, the settle ramp is 0→1 monotone.
//   K. Zone (re)load clears the records and the ledger.
// Run: npx tsx balance/probe_dissolve.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  blocksMovement, blocksProjectiles, blocksSightOf, doodadRuleKinds, doodadRuleOf, normalizeDoodadBound,
  registerDoodadRule, type Doodad, type DoodadKind,
} from '../src/engine/levelgen';
import {
  DISSOLVE_CFG, DISSOLVE_MATERIALS, dissolveCells, dissolveCrackLines, dissolveFor, dissolveMotionIds,
  dissolveMotionOf, dissolvePose, dissolveSeedOf, dissolveSettleAlpha, dissolveStrikeUnit, resolveDissolve,
  type ResolvedDissolve,
} from '../src/engine/dissolve';
import { dressFading } from '../src/render/vis/dressFade';
import { dissolveDebrisAlpha } from '../src/render/vis/dissolveLayer';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { PAINTERS } from '../src/render/vis/painters';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { HARVEST_HUSK_KIND, HARVEST_NODES } from '../src/data/harvest';
import { harvestPayout } from '../src/engine/harvest';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);

bootSimEngine();
seedGlobalRandom(0xd155017e);

const DT = 1 / 60;
const D0_SET = [
  'burial_urn', 'kiln_urn', 'clay_pots', 'glass_shard', 'crystal_cluster', 'icicle_cluster',
  'secret_wall', 'cracked_face', 'rotten_bridge', 'gas_pod', 'burst_sac', 'puffcap_cluster',
  'mirage_oasis', 'mirage_bastion', 'mirage_caravan',
];
const RETIRED_LINES = [
  'the urn shatters!', 'the urn cracks!', 'crash!', 'the glass sings apart!', 'the lattice shatters!', 'shatter!',
  'the planks creak…', 'the span gives way!', 'the pod ruptures!', 'the sac bursts!', 'puff!',
  'the water was never there…', 'the walls scatter into heat…', 'it was never a caravan—',
];

// The probe's own QA kinds: a fast-fading ceramic (the completion rig) — the
// registry is open (the workshop law); the census sees them like any row.
registerDoodadRule('qa_dissolve_urn', {
  overlap: 'inert', spacing: 0,
  brittle: { on: ['touch'], color: '#b8a890' },
  dissolve: { material: 'ceramic', fade: { after: [0.4, 0.4], rate: 60 } },
});

type Priv = {
  harvestNodes: { pos: { x: number; y: number }; def: (typeof HARVEST_NODES)[number]; doodad: Doodad; spent: boolean }[];
  harvestSessions: unknown[];
  harvestSettle: (s: unknown, why: 'complete' | 'expiry') => void;
};

// ------------------------------------------------- A. the fold
{
  const c = resolveDissolve({ material: 'ceramic' });
  check('A1 a row naming only its MATERIAL resolves whole (ceramic → shatter/shards/debris_clay/dust)',
    !!c && c.motion === 'shatter' && c.cut === 'shards' && c.debris === 'debris_clay' && c.voice === 'dust'
    && c.pieces[0] === 7 && c.pieces[1] === 11 && c.life === dissolveMotionOf('shatter')!.life
    && c.fade !== false && c.fade.after[0] === DISSOLVE_CFG.base.fade.after[0] && c.scope === DISSOLVE_CFG.base.scope,
    c ? JSON.stringify(c) : 'null');
  const m = resolveDissolve({ motion: 'shatter' });
  check('A2 a row naming only its MOTION resolves whole off the motion def (shatter → shards, the motion\'s debris)',
    !!m && m.cut === 'shards' && m.debris === dissolveMotionOf('shatter')!.debris && m.material === null);
  const r = resolveDissolve({ material: 'glass', motion: 'crumble', pieces: [2, 2], voice: false });
  check('A3 precedence row > material > motion (crumble motion, the glass cut, the row\'s pieces + voice)',
    !!r && r.motion === 'crumble' && r.cut === 'shards' && r.pieces[0] === 2 && r.voice === false
    && r.debris === 'debris_glass' && r.fling === DISSOLVE_MATERIALS.glass.fling);
  check('A4 absent / unknown rows resolve null (the engine plays no motion; the classic pop stands)',
    resolveDissolve(undefined) === null && resolveDissolve({ motion: 'unravel' }) === null
    && resolveDissolve({ material: 'cloth' }) === null);
  const light = resolveDissolve({ material: 'light' });
  check('A5 light dissolves: cut none, no debris, no voice, haze on', !!light && light.motion === 'dissolve'
    && light.cut === 'none' && light.debris === false && light.voice === false && light.haze === 1);
  const unresolved = D0_SET.filter(k => !dissolveFor(k as DoodadKind));
  check('A6 every D0 kind resolves a whole spec through dissolveFor', unresolved.length === 0, unresolved.join(', '));
  check('A7 the five built-in motions stand registered', ['crumble', 'giveway', 'shatter', 'burst', 'dissolve']
    .every(id => dissolveMotionIds().includes(id)));
  const expect: Record<string, string> = {
    burial_urn: 'shatter', kiln_urn: 'shatter', clay_pots: 'shatter', glass_shard: 'shatter', crystal_cluster: 'shatter',
    icicle_cluster: 'shatter', secret_wall: 'giveway', cracked_face: 'giveway', rotten_bridge: 'giveway',
    gas_pod: 'burst', burst_sac: 'burst', puffcap_cluster: 'burst',
    mirage_oasis: 'dissolve', mirage_bastion: 'dissolve', mirage_caravan: 'dissolve',
  };
  const wrong = Object.entries(expect).filter(([k, m]) => dissolveFor(k as DoodadKind)?.motion !== m);
  check('A8 the D0 set wears the charter\'s motions (urns/pots/glass/crystal/ice shatter · faces + span give way · pods burst · mirages dissolve)',
    wrong.length === 0, wrong.map(([k]) => k).join(', '));
  check('A9 the give-way faces + the span ask for the pre-crack',
    ['secret_wall', 'cracked_face', 'rotten_bridge'].every(k => dissolveFor(k as DoodadKind)?.preCrack === true));
  const nodeSpec = dissolveFor(HARVEST_NODES[0].kind as DoodadKind);
  check('A10 the harvest nodes CRUMBLE with no second pile (debris false — the husk is adopted) and a minutes-grade fade',
    !!nodeSpec && nodeSpec.motion === 'crumble' && nodeSpec.debris === false
    && nodeSpec.fade !== false && nodeSpec.fade.after[0] >= 120);
}

// ------------------------------------------------- B. the retirement census
{
  const kinds = doodadRuleKinds();
  const offenders: string[] = [];
  const unconverted: string[] = [];
  for (const k of kinds) {
    const r = doodadRuleOf(k as DoodadKind);
    const spoken = !!(r.brittle?.text || r.brittle?.warn);
    if (r.dissolve && spoken) offenders.push(k);
    if (!r.dissolve && spoken) unconverted.push(k);
  }
  check('B1 THE RETIREMENT CENSUS: no rule carries a dissolve row AND a brittle text/warn line',
    offenders.length === 0, offenders.join(', '));
  const bare = D0_SET.filter(k => !doodadRuleOf(k as DoodadKind).dissolve);
  check('B2 every D0 kind carries a dissolve row', bare.length === 0, bare.join(', '));
  info(`B  ${unconverted.length} text-carrying breakable(s) not yet converted (D1's tail): ${unconverted.sort().join(', ')}`);
}

// ------------------------------------------------- the world
const w = makeSimWorld('warrior', 0xd155017e);
const priv = w as unknown as Priv;
const hero = w.player;
const place = (kind: string, x: number, y: number, radius: number, extra: Partial<Doodad> = {}): Doodad => {
  const d: Doodad = { pos: vec(x, y), radius, kind: kind as DoodadKind, rot: 0, ...extra };
  normalizeDoodadBound(d);
  w.doodads.push(d);
  w.markDoodadsChanged();
  return d;
};
const settle = (n = 1): void => { for (let i = 0; i < n; i++) w.update(DT); };

// ------------------------------------------------- C. drawn == tested at the instant
{
  const textsBefore = w.texts.length;
  const flashesBefore = w.flashes.length;
  const urn = place('burial_urn', hero.pos.x, hero.pos.y, 18);
  const seedWant = dissolveSeedOf(urn.pos.x, urn.pos.y, 'burial_urn');
  settle(1);
  check('C1 the touch pop spliced the urn at tick 0 (gone + out of the list)', urn.gone === true && !w.doodads.includes(urn));
  const rec = w.dissolves.find(r => r.kind === 'burial_urn');
  check('C2 ONE break record stands: the spec, the seat seed, the boot as the strike point, life = the spec\'s',
    !!rec && w.dissolves.filter(r => r.kind === 'burial_urn').length === 1
    && rec.seed === seedWant && rec.spec.motion === 'shatter'
    && Math.abs(rec.strike.x - hero.pos.x) < 1e-6 && Math.abs(rec.strike.y - hero.pos.y) < 1e-6
    && Math.abs(rec.maxLife - rec.spec.life) < 1e-9 && rec.life <= rec.maxLife);
  const debris = rec?.debris ?? null;
  check('C3 the DEBRIS stands at the same tick: the spec\'s kind, at the seat, tagged, in the list',
    !!debris && debris.kind === 'debris_clay' && w.doodads.includes(debris) && debris.dissolveDebris === true
    && Math.abs(debris.pos.x - urn.pos.x) < 1e-6 && Math.abs(debris.pos.y - urn.pos.y) < 1e-6,
    debris ? `${debris.kind} r${debris.radius}` : 'no debris');
  check('C4 the debris is NON-BLOCKING by every member of the trio (drawn == tested: nothing waits)',
    !!debris && !blocksMovement(debris) && !blocksProjectiles(debris) && !blocksSightOf(debris));
  const fade = rec?.spec.fade;
  check('C5 the debris rides the evap lane with a seeded dwell inside the spec\'s band (no global rng draw)',
    !!debris && !!debris.evap && fade !== false && !!fade
    && debris.evap.t >= fade.after[0] - 1e-9 && debris.evap.t <= fade.after[1] + 1e-9
    && debris.evap.rate === (fade.rate ?? DISSOLVE_CFG.base.fade.rate) && debris.laidAt !== undefined,
    debris?.evap ? `t ${debris.evap.t.toFixed(2)} rate ${debris.evap.rate}` : 'no evap');
  const popFlash = w.flashes.slice(flashesBefore).find(f => Math.abs(f.pos.x - urn.pos.x) < 1e-6 && Math.abs(f.pos.y - urn.pos.y) < 1e-6 && !f.haze);
  check('C6 the accent rides the pop\'s OWN flash (fx = the voice; one accent channel)',
    !!popFlash && (popFlash as { fx?: string }).fx === rec?.spec.voice, popFlash ? `fx ${(popFlash as { fx?: string }).fx}` : 'no pop flash');
  const spokeRetired = w.texts.slice(textsBefore).some(t => RETIRED_LINES.includes(t.text));
  check('C7 NO TEXT: no retired line spoke at the break', !spokeRetired);
  check('C8 the settle ramp starts at 0 for the fresh break (the debris draws fading IN)',
    !!debris && dissolveDebrisAlpha(debris, w) < 0.05);
  // Age the motion out: the record leaves, the debris stands on.
  const life = rec?.maxLife ?? 1;
  for (let t = 0; t < life + 0.1; t += DT) w.update(DT);
  check('C9 the record is pruned when its life runs out; the debris stands (drawn == tested — the pile was always real)',
    !w.dissolves.some(r => r.kind === 'burial_urn') && !!debris && w.doodads.includes(debris)
    && dissolveDebrisAlpha(debris, w) === 1);
}

// ------------------------------------------------- D. fade, never pop (the evap completion)
{
  const qa = place('qa_dissolve_urn', hero.pos.x, hero.pos.y, 14);
  settle(1);
  const rec = w.dissolves.find(r => r.kind === 'qa_dissolve_urn');
  const debris = rec?.debris ?? null;
  check('D1 the QA ceramic popped into its debris with the row\'s own short fade', qa.gone === true && !!debris
    && !!debris.evap && Math.abs(debris.evap.t - 0.4) < 1e-9 && debris.evap.rate === 60);
  let sawRouted = false;
  let gone = false;
  let ticks = 0;
  for (let i = 0; i < 600 && !gone; i++) {
    w.update(DT);
    ticks++;
    if (debris && dressFading(debris)) sawRouted = true;
    gone = !!debris && !w.doodads.includes(debris);
  }
  check('D2 the soft-dry router ADMITS the debris (the dissolveDebris tag + an inert kind)', sawRouted);
  // The sweep's retiring commit deletes `evap` as it splices (the one
  // terminal delete in the engine) — the witness that the REAL lane did it.
  check('D3 the debris contracts through the REAL evap sweep and leaves the list (fade, never pop)',
    gone && !!debris && debris.evap === undefined && ticks > 0.4 / DT - 2, `left after ${ticks} ticks`);
}

// ------------------------------------------------- E. determinism
{
  const spec = dissolveFor('burial_urn')!;
  const s1 = dissolveSeedOf(1234.5, 678.25, 'burial_urn'), s2 = dissolveSeedOf(1234.5, 678.25, 'burial_urn');
  check('E1 the seed is pure f(seat, kind)', s1 === s2 && s1 !== dissolveSeedOf(1234.5, 678.5, 'burial_urn')
    && s1 !== dissolveSeedOf(1234.5, 678.25, 'kiln_urn'));
  const strike = dissolveStrikeUnit(1234.5, 678.25, 18, 1234.5 + 30, 678.25);
  check('E2 the strike point clamps inside the body (a blow past the rim still radiates from within)',
    Math.abs(Math.hypot(strike.x, strike.y) - DISSOLVE_CFG.strikeInset) < 1e-9);
  const c1 = dissolveCells(spec, s1, strike), c2 = dissolveCells(spec, s1, strike);
  check('E3 the cut is pure f(spec, seed, strike) — identical cells twice', JSON.stringify(c1) === JSON.stringify(c2)
    && c1.length >= spec.pieces[0] && c1.length <= spec.pieces[1]);
  const p1 = dissolvePose(spec, c1, 2, s1, 0.3, 18, strike), p2 = dissolvePose(spec, c2, 2, s1, 0.3, 18, strike);
  check('E4 the pose is pure f(seed, i, t) — identical poses twice', JSON.stringify(p1) === JSON.stringify(p2));
  const other = dissolveCells(spec, s1 ^ 0x9e3779b9, strike);
  check('E5 a different seed cuts differently', JSON.stringify(other) !== JSON.stringify(c1));
  // Every motion's law: finite + bounded across its whole life for every cell.
  let bad = '';
  for (const id of dissolveMotionIds()) {
    const sp = resolveDissolve({ motion: id })!;
    const cells = dissolveCells(sp, s1, strike);
    for (let i = 0; i < cells.length && !bad; i++) {
      for (let t = 0; t <= sp.life * 1.25; t += sp.life / 24) {
        const p = dissolvePose(sp, cells, i, s1, t, 20, strike);
        const vals = [p.dx, p.dy, p.rot, p.sx, p.sy, p.alpha, p.shear];
        if (!vals.every(Number.isFinite)) { bad = `${id}: non-finite at t=${t.toFixed(2)}`; break; }
        if (Math.abs(p.dx) > 20 * 12 || Math.abs(p.dy) > 20 * 12) { bad = `${id}: runaway offset at t=${t.toFixed(2)}`; break; }
        if (p.alpha < -1e-9 || p.alpha > 1 + 1e-9) { bad = `${id}: alpha out of [0,1] at t=${t.toFixed(2)}`; break; }
        if (p.sx <= 0 || p.sy <= 0) { bad = `${id}: non-positive scale at t=${t.toFixed(2)}`; break; }
      }
    }
    // Every motion ends faded-ish: the pieces are the debris by the end.
    const last = dissolvePose(sp, cells, 0, s1, sp.life, 20, strike);
    if (!bad && last.alpha > 0.35) bad = `${id}: still ${last.alpha.toFixed(2)} alpha at the end of life`;
  }
  check('E6 every motion\'s kinematics are finite, bounded, alpha-sane, and land faded by the end of life', bad === '', bad);
  check('E7 the cut kinds each yield ≥1 cell with pivots inside the body',
    ['shards', 'strata', 'facets', 'lobes', 'none'].every(cut => {
      const cells = dissolveCells({ ...spec, cut }, s1, strike);
      return cells.length >= 1 && cells.every(c => Math.hypot(c.cx, c.cy) <= 1.0 + 1e-9 && c.pts.length >= 3);
    }));
}

// ------------------------------------------------- F. the honest degrade
{
  w.dissolves.length = 0;
  const n = DISSOLVE_CFG.maxLive + 6;
  const urns: Doodad[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    urns.push(place('qa_dissolve_urn', hero.pos.x + Math.cos(a) * 4, hero.pos.y + Math.sin(a) * 4, 14));
  }
  const debrisBefore = w.doodads.filter(d => d.dissolveDebris && !d.gone).length;
  settle(1);
  const popped = urns.filter(u => u.gone).length;
  const debrisAfter = w.doodads.filter(d => d.dissolveDebris && !d.gone).length;
  check('F1 every urn popped at the tick', popped === n, `${popped}/${n}`);
  check('F2 THE CAP: live motion records stop at DISSOLVE_CFG.maxLive', w.dissolves.length === DISSOLVE_CFG.maxLive,
    `${w.dissolves.length} vs cap ${DISSOLVE_CFG.maxLive}`);
  check('F3 THE HONEST DEGRADE: every break still landed its debris (the pile never waits for a free slot)',
    debrisAfter - debrisBefore === n, `${debrisAfter - debrisBefore} new piles for ${n} breaks`);
  // Let it all settle out before the next rigs.
  for (let i = 0; i < 120; i++) w.update(DT);
}

// ------------------------------------------------- G. the harvest path
{
  const def = HARVEST_NODES.find(r => r.id === 'geode') ?? HARVEST_NODES[0];
  const at = vec(hero.pos.x + 90, hero.pos.y);
  const nodeD = place(def.kind, at.x, at.y, 18);
  const node = { pos: vec(at.x, at.y), def, doodad: nodeD, spent: false };
  priv.harvestNodes.push(node);
  const ix = priv.harvestNodes.length - 1;
  const session = { seatId: w.seats[0].id, ix, seq: [0, 1, 2], done: 3, misses: 0, left: 1, window: 4, held: false, missT: 0 };
  priv.harvestSessions.push(session);
  const dropsBefore = w.drops.length;
  const want = harvestPayout(w.zone.level, 3, 0, 3).length;
  w.dissolves.length = 0;
  priv.harvestSettle(session, 'complete');
  check('G1 the node swapped to its husk face at the settle (the harvest law untouched)', nodeD.kind === HARVEST_HUSK_KIND);
  const rec = w.dissolves.find(r => r.kind === def.kind);
  check('G2 the node CRUMBLES as itself (a record of the PRE-swap kind) into the husk — adopted as the debris, no second pile',
    !!rec && rec.spec.motion === 'crumble' && rec.debris === nodeD && !w.doodads.some(d => d.dissolveDebris && d !== nodeD && Math.hypot(d.pos.x - at.x, d.pos.y - at.y) < 1));
  check('G3 the husk is tagged debris and fades minutes-grade on the row\'s own dial',
    nodeD.dissolveDebris === true && !!nodeD.evap && nodeD.evap.t >= 150 - 1e-9 && nodeD.evap.t <= 240 + 1e-9 && nodeD.evap.rate === 6,
    nodeD.evap ? `t ${nodeD.evap.t.toFixed(1)} rate ${nodeD.evap.rate}` : 'no evap');
  check('G4 the payout is untouched (the same packet count lands)', w.drops.length - dropsBefore === want,
    `${w.drops.length - dropsBefore} vs ${want}`);
  check('G5 the husk still reads as the node\'s husk for the harvest fabric (kind pinned by probe_harvest too)',
    priv.harvestNodes[ix].doodad.kind === HARVEST_HUSK_KIND);
}

// ------------------------------------------------- H. the mirage parity
{
  w.dissolves.length = 0;
  const textsBefore = w.texts.length;
  const flashesBefore = w.flashes.length;
  const doodadsBefore = w.doodads.length;
  const mir = place('mirage_oasis', hero.pos.x + 60, hero.pos.y, 64);
  settle(1);
  const rec = w.dissolves.find(r => r.kind === 'mirage_oasis');
  const hazeFlash = w.flashes.slice(flashesBefore).find(f => f.haze);
  check('H1 the near-pop still breathes the HAZE ring (the mirage kit\'s death breath kept)', mir.gone === true && !!hazeFlash
    && (hazeFlash as { fx?: string }).fx === undefined);
  check('H2 a dissolve record stands: motion dissolve, cut none, NO debris (light leaves no dust)',
    !!rec && rec.spec.motion === 'dissolve' && rec.spec.cut === 'none' && rec.debris === null
    && w.doodads.length === doodadsBefore); // the mirage left, nothing was pushed
  check('H3 no text spoke (the three lines are retired)', !w.texts.slice(textsBefore).some(t => RETIRED_LINES.includes(t.text)));
  for (let i = 0; i < 70; i++) w.update(DT);
}

// ------------------------------------------------- I. the pre-crack (real dwell sweep)
{
  w.dissolves.length = 0;
  // Park the hero and stand a secret wall inside its 'near' reach (36 + r).
  const at = vec(hero.pos.x, hero.pos.y + 30);
  const wall = place('secret_wall', at.x, at.y, 26);
  const doodadsBefore = w.doodads.length;
  settle(2);
  let view = w.dissolveCrackView();
  check('I1 the first press opens the ledger: one crack row at the pressed face, growing from the stand point',
    view.length === 1 && view[0].d === wall && view[0].frac > 0 && view[0].frac < 1
    && Math.abs(view[0].from.x - hero.pos.x) < 1e-6 && Math.abs(view[0].from.y - hero.pos.y) < 1e-6,
    `rows ${view.length} frac ${view[0]?.frac.toFixed(3)}`);
  const seed0 = view[0]?.seed ?? 0;
  const fromU = dissolveStrikeUnit(wall.pos.x, wall.pos.y, wall.radius, hero.pos.x, hero.pos.y);
  const early = dissolveCrackLines(seed0, 0.2, fromU);
  const late = dissolveCrackLines(seed0, 0.9, fromU);
  const lenOf = (ls: { x: number; y: number }[][]): number => ls.reduce((s, l) => {
    let t = 0; for (let i = 1; i < l.length; i++) t += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y); return s + t;
  }, 0);
  check('I2 the crack GROWS with the dwell (pure f(seed, frac): longer arms later, identical twice)',
    lenOf(late) > lenOf(early) && JSON.stringify(early) === JSON.stringify(dissolveCrackLines(seed0, 0.2, fromU))
    && late.every(l => l.every(p => Math.hypot(p.x, p.y) <= 1.03)));
  const fracA = view[0].frac;
  settle(6);
  view = w.dissolveCrackView();
  check('I3 the view\'s fraction rises across the press (the creak made visible)', view.length === 1 && view[0].frac > fracA);
  for (let i = 0; i < 120 && !wall.gone; i++) w.update(DT);
  const rec = w.dissolves.find(r => r.kind === 'secret_wall');
  const rubble = w.doodads.find(d => d.kind === 'face_rubble' && Math.hypot(d.pos.x - at.x, d.pos.y - at.y) < 1);
  check('I4 the dwell ran out: the face GAVE WAY through the real sweep, the ledger closed',
    wall.gone === true && w.dissolveCrackView().length === 0);
  check('I5 the REMAINS doodad is adopted as the debris (tagged, on the evap lane) — no second pile',
    !!rec && rec.spec.motion === 'giveway' && !!rubble && rec.debris === rubble && rubble.dissolveDebris === true && !!rubble.evap
    && w.doodads.filter(d => d.dissolveDebris && Math.hypot(d.pos.x - at.x, d.pos.y - at.y) < 1).length === 1
    && w.doodads.length === doodadsBefore, // the face left, the remains arrived: net zero
    rec ? `debris ${rec.debris?.kind}` : 'no record');
  check('I6 the strike point of a dwell-pop is the pressed seat (the crack\'s own origin)',
    !!rec && Math.abs(rec.strike.x - hero.pos.x) < 1e-6 && Math.abs(rec.strike.y - hero.pos.y) < 1e-6);
}

// ------------------------------------------------- J. the pieces
{
  const debrisKinds = ['debris_clay', 'debris_glass', 'debris_rubble', 'debris_splinters', 'debris_pulp', 'debris_rime'];
  const missing = debrisKinds.filter(k => !doodadRuleOf(k as DoodadKind) || doodadRuleOf(k as DoodadKind).overlap !== 'inert'
    || !DOODAD_VISUALS[k] || DOODAD_VISUALS[k].painter !== 'litter');
  check('J1 every debris kind carries an INERT rule and a `litter` visual row', missing.length === 0, missing.join(', '));
  check('J2 the litter painter and the three break voices are registered (dust / sparkle / wetpop)',
    typeof PAINTERS.litter === 'function' && !!effectVoiceOf('dust') && !!effectVoiceOf('sparkle') && !!effectVoiceOf('wetpop'));
  const voicesBad: string[] = [];
  const debrisBad: string[] = [];
  for (const k of doodadRuleKinds()) {
    const s: ResolvedDissolve | null = dissolveFor(k as DoodadKind);
    if (!s) continue;
    if (s.voice && !effectVoiceOf(s.voice)) voicesBad.push(`${k}:${s.voice}`);
    if (s.debris && (!doodadRuleOf(s.debris as DoodadKind) || !DOODAD_VISUALS[s.debris])) debrisBad.push(`${k}:${s.debris}`);
  }
  check('J3 every rowed kind\'s voice resolves to a registered painter (the effect-voice fallback law never has to catch one)',
    voicesBad.length === 0, voicesBad.join(', '));
  check('J4 every rowed kind\'s debris kind carries a rule + a visual row', debrisBad.length === 0, debrisBad.join(', '));
  const life = 0.8;
  let mono = true, prev = -1;
  for (let t = 0; t <= life; t += life / 40) { const a = dissolveSettleAlpha(t, life); if (a < prev - 1e-9) mono = false; prev = a; }
  check('J5 the settle ramp runs 0 → 1, monotone', dissolveSettleAlpha(0, life) === 0 && dissolveSettleAlpha(life, life) === 1 && mono);
  // Every painted D0 kind has a visual row (the bitmap's source) — the cut
  // needs a painter to cut.
  const unpainted = D0_SET.filter(k => !DOODAD_VISUALS[k]);
  check('J6 every D0 kind has a visual row (the fragment engine\'s bitmap source)', unpainted.length === 0, unpainted.join(', '));
}

// ------------------------------------------------- K. zone reload clears
{
  place('qa_dissolve_urn', hero.pos.x, hero.pos.y, 14);
  settle(1);
  const had = w.dissolves.length > 0;
  w.loadZone(SIM_ARENA_ID);
  check('K1 a zone (re)load clears the break records and the pre-crack ledger (zone-local after-images)',
    had && w.dissolves.length === 0 && w.dissolveCrackView().length === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
