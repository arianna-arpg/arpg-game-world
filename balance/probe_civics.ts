// THE CIVICS PROBE — the capital pole pinned structurally (world/civics.ts +
// the capital field bands in world/biomes.ts + the climate anchor/basin
// seam), so the "existence guaranteed, address diced" contract holds by
// assertion, not by lucky seeds.
//
// The promises this rig pins:
//   A. THE POLE LAW — derivation is pure (same seed → same pole), the pole
//      stands on LAND, on the HOME landmass, and off-home.
//   B. THE SEAT LAW — the pole's own winning cell is metropolis in EVERY
//      world (the one structural cell; the affinity-proof forced seat).
//   C. THE BASIN LAW — wildness dips tame at the pole and stays wild far
//      from both hearts; with NO anchor installed the civic axis reads FAR,
//      the basin vanishes, and no capital band can fire (menu/boot safety).
//   D. THE FREE-START LAW — the home ring is dice again: metropolis never
//      walls the start, city-free openings exist, and the home tilt keeps
//      variety (non-settled biomes still claim the door).
//
//   npx tsx balance/probe_civics.ts [-- --verbose]

import { biomeAt, OCEAN_BIOME } from '../src/world/biomes';
import { climateAt, setClimateAnchor, setClimateOrigin } from '../src/world/climate';
import { continentAt, continentSeedFrom } from '../src/world/continents';
import { CIVIC_CFG, continentWalkJoined, deriveCapitalPole, installCapitalPole } from '../src/world/civics';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

// The probe anchors home at the field origin (the live sim anchors on the
// town's canonical coord — a fixed ~165-unit offset that moves no law).
setClimateOrigin({ x: 0, y: 0 });
const SEEDS = Array.from({ length: 16 }, (_, i) => (0x51ce ^ (i * 0x9e3779b9)) >>> 0);

// --- RIG A: the pole law ---------------------------------------------------------
{
  let determinism = true, onLand = true, homeMass = true, offHome = true;
  for (const seed of SEEDS) {
    const a = deriveCapitalPole(seed), b = deriveCapitalPole(seed);
    if (a.x !== b.x || a.y !== b.y) determinism = false;
    const contSeed = continentSeedFrom(seed);
    const info = continentAt(a, contSeed);
    if (info.kind !== 'land') onLand = false;
    if (!continentWalkJoined({ x: 0, y: 0 }, a, contSeed)) homeMass = false;
    if (Math.hypot(a.x, a.y) < CIVIC_CFG.poleDist[0] * 0.5) offHome = false;
    note(`seed ${seed >>> 0}: pole ${a.x},${a.y} (d=${Math.round(Math.hypot(a.x, a.y))}, ${info.kind})`);
  }
  check('A1 the pole is PURE (same seed, same pole)', determinism);
  check('A2 the pole stands on LAND', onLand);
  check('A3 the pole stands WALK-JOINED to home (a walkable approach)', homeMass);
  check('A4 the pole stands OFF-home', offHome);
}

// --- RIG B: the seat law ---------------------------------------------------------
{
  let seated = 0;
  for (const seed of SEEDS) {
    const pole = installCapitalPole(seed);
    if (biomeAt(pole, seed) === 'metropolis') seated++;
    else note(`seed ${seed >>> 0}: pole cell rolled ${biomeAt(pole, seed)}`);
  }
  check('B1 EVERY world seats its capital (pole cell = metropolis)',
    seated === SEEDS.length, `${seated}/${SEEDS.length}`);
}

// --- RIG C: the basin law --------------------------------------------------------
{
  let tameAtPole = true, wildFarOut = true;
  for (const seed of SEEDS) {
    const pole = installCapitalPole(seed);
    const atPole = climateAt(pole, seed).wildness;
    if (atPole > 0.4) { tameAtPole = false; note(`seed ${seed >>> 0}: pole wildness ${atPole.toFixed(2)}`); }
    // Far from BOTH hearts: march past the pole away from home.
    const d = Math.hypot(pole.x, pole.y) || 1;
    const far = { x: pole.x + (pole.x / d) * 2200, y: pole.y + (pole.y / d) * 2200 };
    const out = climateAt(far, seed).wildness;
    if (out < 0.55) { wildFarOut = false; note(`seed ${seed >>> 0}: far wildness ${out.toFixed(2)}`); }
  }
  check('C1 the capital TAMES its ground (wildness dips at the pole)', tameAtPole);
  check('C2 the wilds stay wild past both hearts', wildFarOut);
  // Anchor-less inertness: no pole → civic reads FAR, basin vanishes, and
  // the forced seat cannot fire anywhere (grave — the unconditioned filler —
  // guarantees a live competitor at any far cell, so metropolis is
  // unpickable there without its band).
  setClimateAnchor('capital', null);
  const seed0 = SEEDS[0];
  const pole0 = deriveCapitalPole(seed0);
  check('C3 no anchor → civic reads FAR everywhere', climateAt(pole0, seed0).civic === 1);
  check('C4 no anchor → no capital (the bands are inert by construction)',
    biomeAt(pole0, seed0) !== 'metropolis', biomeAt(pole0, seed0));
}

// --- RIG D: the free-start law ---------------------------------------------------
{
  let worstMetro = 0, meanMetro = 0, meanSettled = 0, cityFree = 0;
  const doorstep = new Set<string>();
  for (const seed of SEEDS) {
    installCapitalPole(seed);
    let metro = 0, settled = 0, n = 0;
    for (let r = 60; r <= 300; r += 40) {
      for (let a = 0; a < Math.PI * 2; a += 0.22) {
        const b = biomeAt({ x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) }, seed);
        if (b === OCEAN_BIOME) continue;
        n++;
        if (b === 'metropolis') metro++;
        if (b === 'metropolis' || b === 'farmland') settled++;
        if (!['metropolis', 'farmland', 'downs', 'field'].includes(b)) doorstep.add(b);
      }
    }
    const mShare = n ? metro / n : 0, sShare = n ? settled / n : 0;
    worstMetro = Math.max(worstMetro, mShare);
    meanMetro += mShare / SEEDS.length;
    meanSettled += sShare / SEEDS.length;
    if (metro === 0) cityFree++;
    note(`seed ${seed >>> 0}: home metro ${(100 * mShare).toFixed(0)}% · metro+farm ${(100 * sShare).toFixed(0)}%`);
  }
  check('D1 the city never WALLS the start', worstMetro <= 0.5, `worst ${(100 * worstMetro).toFixed(0)}%`);
  check('D2 the mean start is mostly NOT city', meanMetro <= 0.15, `mean ${(100 * meanMetro).toFixed(1)}%`);
  check('D3 the mean start is not wall-to-wall settled', meanSettled <= 0.65, `mean ${(100 * meanSettled).toFixed(1)}%`);
  check('D4 city-free openings EXIST', cityFree >= 3, `${cityFree}/${SEEDS.length}`);
  check('D5 the door keeps its variety (the tilt never purges the wilds)',
    doorstep.size >= 5, [...doorstep].slice(0, 8).join(','));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
