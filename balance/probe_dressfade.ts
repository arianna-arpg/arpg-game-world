// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SOFT DRY (render/vis/dressFade.ts) over the real
// engine's evaporation fabric. Pins:
//   - THE COMMITTED SPEC: hellshot_volley's (and hellbore_lob's) storm
//     delivery carries the shell_crater impact dress with an evapAfter dwell
//     — the trebuchet half of Arianna's fade-not-pop ruling rides
//     plantImpactDress by data (any other caller of the same seam — the
//     geyser comets' scald_pock — inherits the ease from this one path),
//   - THE ONE PATH: World.plantImpactDress hands the pock STRAIGHT to
//     Doodad.evap (blastDress tagged, dwell + BOMBARD rate, radius clamped),
//     and the real updateEvaporation sweep contracts it stepwise to the
//     minRadius retirement,
//   - THE ROUTER (dressFading): only COSMETIC dress qualifies — the planted
//     pock and the unruled levin_scar pass; a solid (gabion, blocksMove
//     ember_fissure), a ground region kind (water — wading truth), an
//     untagged kind (generation-strewn craters), and a standing (no-evap)
//     pock all refuse,
//   - THE EASE LAWS (softDryFace over the REAL sweep): the standing pock is
//     untouched (alpha 1, scale 1 through the dwell — the loved look), alpha
//     is monotone non-increasing, the drawn radius (scale × radius) never
//     jumps a step (continuous where the engine quantizes), and the last
//     DRAWN face before the splice sits at ~0 alpha — the retirement lands
//     invisible,
//   - THE CAP STAMP: the per-zone cap's dry-NOW move (evap.t = 0) never
//     pops — the glide bounds every per-frame alpha drop and still reaches
//     ~0 by splice time, even at the fast weather-dress rate.
// Run: npx tsx balance/probe_dressfade.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { World } from '../src/engine/world';
import type { Doodad } from '../src/engine/levelgen';
import { SKILLS } from '../src/data/skills';
import { BOMBARD_CFG } from '../src/engine/bombard';
import { dressFading, softDryFace } from '../src/render/vis/dressFade';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xd2e55);

type ImpactDress = { kind: string; evapAfter?: [number, number]; chance?: number };
type Planter = { plantImpactDress: (z: { pos: { x: number; y: number }; radius: number; impactDress?: ImpactDress }) => void };

const DT = 1 / 60;

// ------------------------------------------------- A. the committed spec
{
  const del = SKILLS.hellshot_volley?.delivery as { type?: string; impactDress?: ImpactDress } | undefined;
  check('A: hellshot_volley lobs through a storm delivery wearing shell_crater impact dress',
    del?.type === 'storm' && del?.impactDress?.kind === 'shell_crater',
    `type ${del?.type}, kind ${del?.impactDress?.kind}`);
  check('A: the pock carries an evapAfter dwell (the drying half of the ruling)',
    Array.isArray(del?.impactDress?.evapAfter) && del!.impactDress!.evapAfter![0] > 0);
  const lob = SKILLS.hellbore_lob?.delivery as { impactDress?: ImpactDress } | undefined;
  check('A: hellbore_lob rides the same shell_crater dress',
    lob?.impactDress?.kind === 'shell_crater');
}

// ------------------------------------------------- B. the one path
const w = makeSimWorld('warrior', 0xd2e55);
const at = { x: w.player!.pos.x, y: w.player!.pos.y };
const plant = (dwell: number): Doodad | undefined => {
  const before = new Set(w.doodads);
  (w as unknown as Planter).plantImpactDress({
    pos: vec(at.x, at.y), radius: 60,
    impactDress: { kind: 'shell_crater', evapAfter: [dwell, dwell] },
  });
  return w.doodads.find(dd => dd.kind === 'shell_crater' && !before.has(dd));
};
const pock = plant(3);
{
  check('B: plantImpactDress plants a blastDress-tagged shell_crater',
    !!pock && pock.blastDress === true, pock ? `r ${pock.radius}` : 'no pock planted');
  check('B: the pock is handed STRAIGHT to Doodad.evap (dwell + BOMBARD rate)',
    !!pock?.evap && Math.abs(pock.evap.t - 3) < 1e-9 && pock.evap.rate === BOMBARD_CFG.dressEvapRate,
    pock?.evap ? `t ${pock.evap.t}, rate ${pock.evap.rate}` : 'no evap');
  check('B: the radius wears the dress clamp',
    !!pock && pock.radius === Math.min(60 * BOMBARD_CFG.dressRadiusFrac, BOMBARD_CFG.dressRadiusMax),
    `r ${pock?.radius}`);
}

// ------------------------------------------------- C. the router
{
  const mk = (kind: string, tag: Partial<Doodad>, evap = true): Doodad => ({
    pos: vec(0, 0), radius: 20, kind: kind as Doodad['kind'], ...tag,
    ...(evap ? { evap: { t: 5, rate: 7 } } : {}),
  }) as Doodad;
  check('C: the planted pock routes to the soft-dry pass', !!pock && dressFading(pock));
  check('C: the unruled levin_scar (blastDress) routes too',
    dressFading(mk('levin_scar', { blastDress: true })));
  check('C: a SOLID dress piece refuses (gabion blocks movement)',
    !dressFading(mk('gabion', { weatherDress: 'probe' })));
  check('C: ember_fissure refuses (blocksMove — the demonstorm kit keeps its stepped face)',
    !dressFading(mk('ember_fissure', { weatherDress: 'demonstorm' })));
  check('C: a GROUND region kind refuses (water — radius is wading/path truth)',
    !dressFading(mk('water', { weatherDress: 'probe' })));
  check('C: an untagged kind refuses (generation-strewn craters are not dress)',
    !dressFading(mk('shell_crater', {})));
  check('C: a standing (no-evap) pock stays on the normal lane',
    !dressFading(mk('shell_crater', { blastDress: true }, false)));
}

// ------------------------------------------------- D. the ease laws (real sweep)
{
  const d = pock!;
  let frames = 0, standingOk = true, monotone = true, maxEffJump = 0, maxDrop = 0;
  let prevA = Infinity, prevEff = Infinity;
  let last = { alpha: 1, scale: 1 };
  while (frames < 60 * 30) {
    const face = softDryFace(d, DT); // once per frame — the renderer's own cadence
    const eff = face.scale * d.radius;
    if (prevA !== Infinity) {
      if (face.alpha > prevA + 1e-9) monotone = false;
      maxDrop = Math.max(maxDrop, prevA - face.alpha);
      maxEffJump = Math.max(maxEffJump, Math.abs(prevEff - eff));
    }
    // Through the first 2s of the 3s dwell the pock must read UNTOUCHED.
    if (frames * DT < 2 && (face.alpha !== 1 || face.scale !== 1)) standingOk = false;
    prevA = face.alpha; prevEff = eff; last = face;
    frames++;
    w.update(DT);
    if (!w.doodads.includes(d)) break;
  }
  check('D: the pock retired through the real sweep', !w.doodads.includes(pock!), `${frames} frames`);
  check('D: the standing pock is untouched through the dwell (alpha 1, scale 1)', standingOk);
  check('D: alpha is monotone non-increasing', monotone);
  check('D: the drawn radius never jumps a step (continuous where the engine quantizes)',
    maxEffJump < 1.0, `max frame jump ${maxEffJump.toFixed(3)} (a raw step is ≥ ${World.EVAP.stepMin})`);
  check('D: the last DRAWN face lands ~invisible (the splice cannot pop)',
    last.alpha < 0.06, `final alpha ${last.alpha.toFixed(3)}`);
  check('D: faces at/below skipBelow are skipped by the renderer pass',
    VIS_CFG.dressFade.skipBelow > 0 && VIS_CFG.dressFade.skipBelow < 0.1);
}

// ------------------------------------------------- E. the cap stamp (dry NOW)
{
  const d2 = plant(30);
  check('E: second pock planted for the cap rig', !!d2 && !!d2.evap);
  if (d2?.evap) {
    softDryFace(d2, DT); // seed the glide at the standing face first
    d2.evap.t = 0;       // THE CAP'S OWN MOVE (World.plantImpactDress past dressCap)
    d2.evap.rate = 22;   // the fast weather-dress pace — the harshest honest clock
    let maxDrop = 0, prevA = 1, neg = false;
    let last = 1;
    for (let f = 0; f < 60 * 10; f++) {
      const face = softDryFace(d2, DT);
      maxDrop = Math.max(maxDrop, prevA - face.alpha);
      if (face.alpha < 0) neg = true;
      prevA = face.alpha; last = face.alpha;
      w.update(DT);
      if (!w.doodads.includes(d2)) break;
    }
    check('E: the evicted pock never pops (per-frame alpha drop stays bounded)',
      maxDrop <= 0.14 && !neg, `max frame drop ${maxDrop.toFixed(3)}`);
    check('E: even the fast clock lands ~invisible by splice time',
      last < 0.06, `final alpha ${last.toFixed(3)}`);
    check('E: the evicted pock retired', !w.doodads.includes(d2));
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
