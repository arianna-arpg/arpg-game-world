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
// Run: npx tsx balance/probe_deadface.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { TILESETS, PLAIN_FACES } from '../src/data/tilesets';

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
{
  // Adjudicated exceptions live HERE by name, with their ruling — never as a
  // silent skip.
  const ADJUDICATED: Record<string, string[]> = {
    // downs DEFERRED from PLAIN_FACES (2026-08-03): a concurrent tiers rig
    // (probe_tiers N3, the crypt_duct return) is mid-debug against the downs
    // face roll — growing its face list re-rolls that rig's pinned mints.
    // These two stay KNOWN-dead until 'the open downs' seats; delete this
    // row when it does (the membership rig will then hold it honest).
    downs: ['log', 'cluster'],
  };
  let violators = 0;
  for (const [id, t] of Object.entries(TILESETS)) {
    if (!t.variants?.length || !surfacePooled(t)) continue;
    const common = new Set((t.common ?? []).map(r => r.kind));
    const vKinds = new Set(t.variants.flatMap(v => v.layout.map(r => r.kind)));
    const allowed = new Set(ADJUDICATED[id] ?? []);
    const dead = [...new Set((t.layout ?? [])
      .map(r => r.kind)
      .filter(k => !common.has(k) && !vKinds.has(k) && !allowed.has(k)))];
    if (dead.length) {
      violators++;
      console.log(`  VIOLATOR ${id}: base-only kinds ${dead.join(', ')}`);
    }
  }
  check('regrow guard: ZERO surface tilesets carry dead base-only kinds', violators === 0,
    `${violators} violator(s)`);
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

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
