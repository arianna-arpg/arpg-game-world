// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DEAD BASE FACE, healed and held (chip task_67606e2e).
// A tileset with a `variants` list rolls ONLY among the variants at every
// surface mint (worldgen's face pick has no base slot) — so the base layout,
// the country's PLAIN face, silently never minted, and rows wired only into
// it were dead on the live path (the needles precedent, the butteland pass).
// The heal: PLAIN_FACES (data/tilesets.ts) restates each symptomatic
// country's base layout as its FIRST named variant BY REFERENCE. This rig
// pins the four laws that keep the class closed:
//   A  THE MEMBERSHIP LAW — every member is surface-pooled, its plain face
//      stands first, and the face's layout IS the base layout (reference
//      identity: no copy, no drift), with the cave lane kept out.
//   B  THE REGROW GUARD — no surface-pooled tileset with variants may carry
//      a base-layout kind absent from every variant + common: the class can
//      never silently regrow (a new tileset authored wrong fails here).
//   C  THE ROLL — live mints deal the plain face at its share, and kinds
//      that were dead stand in plain-face zones through the real path.
//   D  THE SEED — the face pick is mint-seed stable with the grown list.
// THE LEVERS (deadface levers chip — the coda forks, built cold):
//   E  THE DIE LAW — pickTilesetVariant with every weight absent IS the
//      legacy uniform pick: same element, same single draw (post-pick
//      stream parity), and explicit weight-1s agree (absent means 1).
//   F  THE EXTREME REGIME — weight 1000 patched onto one special face
//      dominates the live mint stream through the real path, and the
//      restore is exact (the lever ships COLD: zero authored weights).
//   G  THE INVARIANT — deadBaseFaceKinds (genqa's dead-face warn, shared
//      checker) is clean on the live table, agrees with B's independent
//      sweep, flags a synthetic violator, exempts its cave-lane twin, and
//      catches its realm twin.
// Run: npx tsx balance/probe_deadface.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import {
  TILESETS, PLAIN_FACES, pickTilesetVariant,
  type TilesetDef, type TilesetVariant,
} from '../src/data/tilesets';
import { deadBaseFaceKinds } from './deadface_check';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xdf01);

/** Surface-pooled: reachable by placeZoneAt's face pick (frontier pool or a
 *  realm dimension pool) — the lane where the base face never rolls bare. */
const surfacePooled = (t: (typeof TILESETS)[string]): boolean =>
  !!t.biome && (t.frontier !== false || !!t.realm);

// --- A) THE MEMBERSHIP LAW --------------------------------------------------
{
  for (const [id, name] of Object.entries(PLAIN_FACES)) {
    const t = TILESETS[id];
    check(`member: '${id}' stands`, !!t);
    if (!t) continue;
    check(`member: '${id}' is surface-pooled (the affected lane — never the cave lane)`,
      surfacePooled(t));
    check(`member: '${id}' plain face '${name}' stands FIRST`,
      t.variants?.[0]?.name === name, t.variants?.[0]?.name ?? 'no variants');
    // THE NO-DRIFT PIN: the plain face's layout IS the base layout — one
    // authored source; an edit to either is an edit to both, by identity.
    check(`member: '${id}' plain face wears the base layout BY REFERENCE`,
      t.variants?.[0]?.layout === t.layout);
    check(`member: '${id}' plain face carries no dial overrides (the base dials rule)`,
      !t.variants?.[0]?.layoutParams && !t.variants?.[0]?.theme);
  }
  // needles healed TEXTUALLY in the butteland pass (its press face restated
  // as 'the standing tables' with its own rows) — deliberately NOT a member.
  check("needles: healed textually, not a member (the butteland pass's own face)",
    !('needles' in PLAIN_FACES)
    && !!TILESETS.needles?.variants?.some(v => v.name === 'the standing tables'));
}

// --- B) THE REGROW GUARD ----------------------------------------------------
// bViolators feeds section G's cross-witness: this sweep stays INDEPENDENT of
// the shared checker on purpose (two implementations of one law — a bug in
// either is named by the other).
const bViolators: string[] = [];
{
  // Adjudicated exceptions live HERE by name, with their ruling — never as a
  // silent skip.
  const ADJUDICATED: Record<string, string[]> = {};
  for (const [id, t] of Object.entries(TILESETS)) {
    if (!t.variants?.length || !surfacePooled(t)) continue;
    const common = new Set((t.common ?? []).map(r => r.kind));
    const vKinds = new Set(t.variants.flatMap(v => v.layout.map(r => r.kind)));
    const allowed = new Set(ADJUDICATED[id] ?? []);
    const dead = [...new Set((t.layout ?? [])
      .map(r => r.kind)
      .filter(k => !common.has(k) && !vKinds.has(k) && !allowed.has(k)))];
    if (dead.length) {
      bViolators.push(id);
      console.log(`  VIOLATOR ${id}: base-only kinds ${dead.join(', ')}`);
    }
  }
  check('regrow guard: ZERO surface tilesets carry dead base-only kinds', bViolators.length === 0,
    `${bViolators.length} violator(s)`);
}

// --- C) THE ROLL — live mints through the real path -------------------------
// Three witnesses across the lanes: a frontier crown face (stonecrown — the
// storm register was the loss), a one-variant country (marsh — the hazard
// flower venom_bloom was dead), and a REALM face (aether_spires — the
// devotional kit was dead; the realm pool rides placeZoneAt too). Seeds are
// the verification sweep's own (world 424242, ladder 51000+977i) — pinned
// passing draws, deterministic by construction.
{
  const world = makeSimWorld('warrior', 424242);
  const CASES: { id: string; revived: string[] }[] = [
    { id: 'stonecrown', revived: ['charged_crystal', 'stormglass_shard'] },
    { id: 'marsh', revived: ['venom_bloom', 'briarwood'] },
    { id: 'aether_spires', revived: ['prayer_bell', 'flowers'] },
  ];
  for (const c of CASES) {
    const plainName = PLAIN_FACES[c.id];
    let plain = 0, faces = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 16 && plain < 5; i++) {
      const zid = world.devMintTileset(c.id, 0, 9, { seed: 51000 + i * 977 });
      if (!zid || !world.devTravelTo(zid)) continue;
      faces++;
      if (world.zoneMap[world.zone.id]?.variantName !== plainName) continue;
      plain++;
      for (const d of world.doodads) if (c.revived.includes(d.kind)) seen.add(d.kind);
    }
    check(`roll: '${c.id}' deals its plain face live ('${plainName}')`,
      plain >= 1, `${plain}/${faces} mints`);
    for (const k of c.revived) {
      check(`roll: '${c.id}' plain zones stand the revived '${k}'`, seen.has(k));
    }
  }
}

// --- D) THE SEED — face pick stability over the grown list ------------------
{
  const world = makeSimWorld('warrior', 424242);
  const names: (string | undefined)[] = [];
  for (let r = 0; r < 2; r++) {
    const zid = world.devMintTileset('crypt', 0, 9, { seed: 60607 });
    if (zid && world.devTravelTo(zid)) names.push(world.zoneMap[world.zone.id]?.variantName);
  }
  check('seed: the same mint seed deals the same face twice', names.length === 2 && names[0] === names[1],
    names.join(' / '));
}

// --- E) THE DIE LAW — the weight lever's cold face --------------------------
// pickTilesetVariant with EVERY weight absent must BE the legacy uniform
// pick: the same element off the same single draw. Proven at the die's own
// grain — same-seeded Rng pairs deal the same element AND stand in the same
// post-pick state (the next float matches: exactly one draw burned on both
// sides, so no downstream stream can shift under the cold lever). Explicit
// weight-1s deal the same faces on the same draws (absent MEANS 1 — the
// weighted walk agrees with the uniform floor on real dice).
{
  const mkVars = (n: number): TilesetVariant[] =>
    Array.from({ length: n }, (_, i) => ({ name: `v${i}`, layout: [] }));
  let sameEl = true, sameState = true, sameOnes = true;
  for (let len = 1; len <= 6; len++) {
    const vars = mkVars(len);
    const ones: TilesetVariant[] = mkVars(len).map(v => ({ ...v, weight: 1 }));
    for (let s = 0; s < 256; s++) {
      const seed = 0xace1 + s * 7919 + len * 0x10001;
      const a = new Rng(seed), b = new Rng(seed), c = new Rng(seed);
      const pa = a.pick(vars), pb = pickTilesetVariant(b, vars);
      if (pa !== pb) sameEl = false;
      if (a.next() !== b.next()) sameState = false;
      if (pickTilesetVariant(c, ones).name !== pb.name) sameOnes = false;
    }
  }
  check('die law: all-weights-absent pick === Rng.pick (same element, 6 lengths × 256 seeds)', sameEl);
  check('die law: exactly ONE draw burns — post-pick streams stand identical', sameState);
  check('die law: explicit weight-1s deal the same faces (absent means 1)', sameOnes);
}

// --- F) THE EXTREME REGIME — an authored weight moves the pick, measured ----
// weight 1000 patched onto ONE special face (deliberately not the plain
// face — the lever must point anywhere) dominates the live mint stream
// through the real devMintTileset → placeZoneAt path. The patch is scoped
// try/finally; a control re-mint after restore re-deals its unpatched face,
// so the lever ships COLD (zero authored weights) with the patch provably
// lifted. Pinned seeds — the measured shares are deterministic draws.
{
  const world = makeSimWorld('warrior', 424242);
  const ts = TILESETS.stonecrown;
  const target = ts.variants?.[1];
  check("extreme: 'stonecrown' fields a special face to weight", !!target,
    `${ts.variants?.length ?? 0} variants`);
  if (target) {
    const mintFace = (seed: number): string | undefined => {
      const zid = world.devMintTileset('stonecrown', 0, 9, { seed });
      return zid ? world.zoneMap[zid]?.variantName : undefined;
    };
    const SEEDS = Array.from({ length: 24 }, (_, i) => 81000 + i * 977);
    const before = SEEDS.map(mintFace);
    let hits = 0;
    let after: (string | undefined)[] = [];
    try {
      target.weight = 1000;
      after = SEEDS.map(mintFace);
      hits = after.filter(n => n === target.name).length;
    } finally {
      delete target.weight;
    }
    check(`extreme: weight 1000 on '${target.name}' dominates the measured stream`,
      hits >= 22, `${hits}/24 mints`);
    check('extreme: the lever MOVED the stream (patched picks differ from unpatched)',
      after.some((n, i) => n !== before[i]));
    check('extreme: restore is exact — the control seed re-deals its unpatched face',
      mintFace(SEEDS[0]) === before[0], `'${before[0]}'`);
  }
}

// --- G) THE GENQA INVARIANT'S OWN TEST --------------------------------------
// deadBaseFaceKinds (balance/deadface_check.ts) is genqa's dead-face warn —
// one law, two witnesses. Calibration: the live table is clean AND the
// shared checker names exactly the set B's independent sweep names (empty
// today; the pin stays honest if either grows). Negative: a synthetic
// violator is flagged by kind, its cave-lane twin is exempt by construction
// (mintCave keeps the base face live), and its REALM twin is caught (the
// realm pool rides placeZoneAt's face pick too).
{
  const liveViolators = Object.values(TILESETS)
    .filter(t => deadBaseFaceKinds(t).length).map(t => t.id);
  check('invariant: zero violators on the live table (genqa warns nothing today)',
    liveViolators.length === 0, liveViolators.join(', ') || 'clean');
  check("invariant: the shared checker and B's independent sweep name the SAME set",
    liveViolators.slice().sort().join(',') === bViolators.slice().sort().join(','),
    `checker [${liveViolators.join(', ')}] vs sweep [${bViolators.join(', ')}]`);

  const donor = TILESETS.forest;
  const fixture = (over: Partial<TilesetDef>): TilesetDef => ({
    ...donor,
    id: 'qa_deadface_fixture',
    layout: [{ kind: 'rock', count: [1, 2] }, { kind: 'qa_dead_kind', count: [1, 1] }],
    common: [],
    variants: [{ name: 'qa face', layout: [{ kind: 'rock', count: [1, 2] }] }],
    ...over,
  });
  check('invariant: a synthetic surface violator is flagged with its kind',
    deadBaseFaceKinds(fixture({})).join(',') === 'qa_dead_kind');
  check('invariant: the cave-lane twin (frontier: false, no realm) is exempt',
    deadBaseFaceKinds(fixture({ frontier: false })).length === 0);
  check('invariant: the REALM twin is caught (the realm pool is surface-pooled)',
    deadBaseFaceKinds(fixture({ frontier: false, realm: 'qa_realm' })).join(',') === 'qa_dead_kind');
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
