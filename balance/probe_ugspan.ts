// ---------------------------------------------------------------------------
// THE SPANNING UNDERGROWTH QA — the rooted web's zone-graph half, pinned.
//
// The charter's own ask (planned-passes #19, ratified 2026-08-02): coverage is
// DIAL-DRIVEN policy rows, patchy ships, and the two extreme regimes must be
// EXPRESSIBLE BY DIALS ALONE — "both act as amazing unit tests of the exact
// flexible mechanism". This rig forces those dials and pins:
//
//   A. ABSENT == IDENTICAL — a world grown with NO policy rows is
//      byte-identical to one grown with rows that never match (the span pass
//      draws nothing, creates nothing, not even a private stream).
//   B. EVERYWHERE-THIN — chance 1 + reach [1,1] + fresh 0: the pure LINK
//      fabric — every organic mint knots itself to ONE standing neighbor
//      (no new nodes, no density added, growth unchoked); rows symmetric,
//      spans exactly 2 members, the whole country wears a thin web.
//   C. ONE-GREAT-WEB — chance 1 + reach [3,3] + wide radius: spans chain
//      through shared standing members into one dominant under-component.
//   D. THE SET-PIECE — rootheld partners: zero surface exits, static-exits
//      kind, UNREACHABLE by surface BFS, REACHABLE the moment underways
//      edges join the walk (the exit-less node is a connected citizen).
//   E. THE LAWS — road budget untouched (underways spend nothing), heals
//      (reconcileWebLaws) never cut an under-road, the save round-trip
//      keeps rows and prunes rows to culled zones (the searoutes heal).
//   F. THE VEIL + THE CROSSING — a far mouth stays veiled through the seat's
//      own load (the ring-1 unveil does NOT cross an under-road); the walk
//      below (dwell mouth → pocket → far exit) surfaces IN the far node,
//      unveils it, lands at its own mouth, stamps the ledger; the pocket is
//      the SAME zone from every door (id + def fingerprint), and the way
//      back returns the same pocket.
//
// Run: npx tsx balance/probe_ugspan.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { ZoneDef } from '../src/data/zones';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { zoneKindOf, ZONE_KINDS } from '../src/data/zoneKinds';
import { roadBudgetOf, countRoads } from '../src/engine/worldgen';
import { BIOMES } from '../src/world/biomes';
import { UNDER_SPANS, registerUnderSpan, type UnderSpanPolicy } from '../src/data/underspans';
import { sanitizeWorldZones } from '../src/meta/worldstate';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- helpers -----------------------------------------------------------------

/** The SHIPPED rows, captured before any section wipes the registry — the
 *  second-country census (section G) reads these. */
const SHIPPED: Record<string, UnderSpanPolicy> =
  Object.fromEntries(Object.entries(UNDER_SPANS).map(([k, v]) => [k, { ...v }]));

const wipePolicies = (): void => { for (const k of Object.keys(UNDER_SPANS)) delete UNDER_SPANS[k]; };

/** Register one forced policy row for every real surface-capable biome (the
 *  mechanism is biome-generic; the regimes are proven wherever the seed's
 *  climate happens to grow). 'field'/'ocean' skip — expanses and water never
 *  seat spans by the pass's own predicate anyway. Forced rows wear the
 *  garden's kit (mouth/heldKind ride the policy row since batch 24 — these
 *  sections pin the DIAL regimes, not the kit; section G pins the kit). */
const forceAllBiomes = (dials: { chance: number; reach: [number, number]; radius: number; fresh: number; exitless: number }): void => {
  wipePolicies();
  for (const biome of Object.keys(BIOMES)) {
    if (biome === 'field' || biome === 'ocean') continue;
    registerUnderSpan({ biome, mouth: 'rootway_mouth', heldKind: 'rootheld', ...dials });
  }
};

function grow(seed: number, rounds: number): World {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  w.loadZone(HUB_ZONE);
  const chart = w as unknown as { chartNeighborsOf(z: ZoneDef): void };
  for (let r = 0; r < rounds; r++) {
    const batch = Object.values(w.zoneMap).filter(z =>
      (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
      && z.objective.kind !== 'safe' && !z.floating && !zoneKindOf(z)?.staticExits
      && z.exits.some(e => e.to === '?'));
    for (const z of batch) chart.chartNeighborsOf(z);
  }
  return w;
}

const surfaceZones = (w: World): ZoneDef[] =>
  Object.values(w.zoneMap).filter(z => (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null);

/** BFS from town over exits — optionally ALSO over underways rows. */
function bfsFromTown(w: World, withUnder: boolean): Set<string> {
  const byId = w.zoneMap;
  const seen = new Set<string>([START_ZONE]);
  const queue = [START_ZONE];
  while (queue.length) {
    const z = byId[queue.pop()!];
    if (!z) continue;
    const step = (to: string): void => {
      if (!seen.has(to) && byId[to]) { seen.add(to); queue.push(to); }
    };
    for (const e of z.exits) { if (e.to !== '?' && !e.crossDim) step(e.to); }
    if (withUnder) for (const u of z.underways ?? []) step(u.to);
  }
  return seen;
}

const fingerprint = (w: World): string =>
  surfaceZones(w)
    .map(z => `${z.id}|${z.name}|${Math.round(z.map.x * 100)},${Math.round(z.map.y * 100)}|${z.biome}|${z.exits.length}|${z.underways?.length ?? 0}`)
    .sort()
    .join(';');

console.log('\n=== THE SPANNING UNDERGROWTH QA ===');

// ------------------------------------------------ A. ABSENT == IDENTICAL
{
  wipePolicies();
  const wA = grow(0x0a11ce, 4);
  wipePolicies();
  registerUnderSpan({ biome: 'qa_never_biome', chance: 1, reach: [3, 3], radius: 400, fresh: 1, exitless: 1, mouth: 'rootway_mouth', heldKind: 'rootheld' });
  const wB = grow(0x0a11ce, 4);
  check('A: unmatched policy rows grow a byte-identical world', fingerprint(wA) === fingerprint(wB),
    `${surfaceZones(wA).length} vs ${surfaceZones(wB).length} zones`);
  check('A: no underways anywhere without a matching row',
    surfaceZones(wA).every(z => !z.underways) && surfaceZones(wB).every(z => !z.underways));
}

// ------------------------------------------------ B. EVERYWHERE-THIN (forced extreme)
{
  forceAllBiomes({ chance: 1, reach: [1, 1], radius: 160, fresh: 0, exitless: 0 });
  const w = grow(0x7d1100, 8);
  const zones = surfaceZones(w);
  const eligible = zones.filter(z => z.id.startsWith('gen_') && !z.kind && !z.field && !z.pocket
    && !z.floating && !z.concealed && !z.special && z.objective.kind !== 'safe' && UNDER_SPANS[z.biome ?? '']);
  const spanned = eligible.filter(z => z.underways?.length);
  check('B: the thin web blankets the country (≥55% of eligible mints span; misses = first-in-patch)',
    eligible.length >= 25 && spanned.length / Math.max(1, eligible.length) >= 0.55,
    `${spanned.length}/${eligible.length} eligible organic mints spanned`);
  check('B: the link fabric adds NO nodes (fresh 0 mints nothing)',
    zones.every(z => !z.id.startsWith('ugspan_')), `${zones.length} zones`);
  check('B: the world still GROWS under the thin web (no promise starvation)',
    zones.length >= 100, `${zones.length} zones`);
  // Every span is exactly 2 members at reach [1,1].
  const bySpan = new Map<string, Set<string>>();
  for (const z of zones) {
    for (const u of z.underways ?? []) {
      if (!bySpan.has(u.span)) bySpan.set(u.span, new Set());
      bySpan.get(u.span)!.add(z.id);
      bySpan.get(u.span)!.add(u.to);
    }
  }
  check('B: reach [1,1] spans hold exactly 2 members', [...bySpan.values()].every(s => s.size === 2),
    `${bySpan.size} spans`);
  // Symmetry: every row mirrored on its far end.
  let oneWay = 0;
  for (const z of zones) {
    for (const u of z.underways ?? []) {
      const far = w.zoneMap[u.to];
      if (!far?.underways?.some(v => v.span === u.span && v.to === z.id)) oneWay++;
    }
  }
  check('B: under-roads are two-way (no one-way rows)', oneWay === 0, `${oneWay}`);
  check('B: every member carries its forced mouth roll',
    zones.filter(z => z.underways?.length).every(z => (z.landmarks ?? []).some(l => l.landmark === 'rootway_mouth')));
}

// ------------------------------------------------ C+D+E. ONE-GREAT-WEB + the set-piece + the laws
{
  forceAllBiomes({ chance: 1, reach: [3, 3], radius: 420, fresh: 0.3, exitless: 0.5 });
  const w = grow(0x9ebb01, 7);
  const zones = surfaceZones(w);
  const spanned = zones.filter(z => z.underways?.length);
  // The under-graph: nodes = spanned zones, edges = underways rows. Spans
  // adopt SAME-BIOME partners only (a country's roots stay under its own
  // country), so "one great web" is a PER-COUNTRY claim: within the biome
  // holding the most spanned nodes, one component must dominate.
  const comp = new Map<string, number>();
  let nComp = 0;
  for (const z of spanned) {
    if (comp.has(z.id)) continue;
    const cid = nComp++;
    const queue = [z.id];
    comp.set(z.id, cid);
    while (queue.length) {
      const cur = w.zoneMap[queue.pop()!];
      for (const u of cur?.underways ?? []) {
        if (!comp.has(u.to) && w.zoneMap[u.to]) { comp.set(u.to, cid); queue.push(u.to); }
      }
    }
  }
  const byBiome = new Map<string, ZoneDef[]>();
  for (const z of spanned) {
    const b = z.biome ?? '?';
    if (!byBiome.has(b)) byBiome.set(b, []);
    byBiome.get(b)!.push(z);
  }
  const [bigBiome, bigGroup] = [...byBiome.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? ['?', []];
  const groupSizes = new Map<number, number>();
  for (const z of bigGroup) {
    const cid = comp.get(z.id)!;
    groupSizes.set(cid, (groupSizes.get(cid) ?? 0) + 1);
  }
  const biggest = Math.max(0, ...groupSizes.values());
  check('C: wide dials chain spans into ONE dominant under-web per country',
    bigGroup.length >= 15 && biggest / Math.max(1, bigGroup.length) >= 0.5,
    `'${bigBiome}': largest component ${biggest}/${bigGroup.length} spanned nodes (${groupSizes.size} components; ${spanned.length} spanned world-wide)`);

  // Fresh partners (this world's fresh dial mints them): born VEILED + mouth
  // seated; the soft ones (no kind) may be found by the later weave — only
  // rootheld's forever-seal (below) forbids surface roads outright.
  const partners = zones.filter(z => z.id.startsWith('ugspan_'));
  const roadless = partners.filter(z => z.exits.length === 0);
  check('C: fresh partners are born VEILED with their mouths seated',
    partners.length >= 10
    && partners.every(z => z.veiled === true
      && (z.landmarks ?? []).some(l => l.landmark === 'rootway_mouth')),
    `${partners.length} fresh partners, ${roadless.length} roadless (the weave found the rest)`);

  // D. THE SET-PIECE: rootheld nodes — sealed on the surface, citizens below.
  const rootheld = zones.filter(z => z.kind === 'rootheld');
  check('D: rootheld partners minted (the exitless dial fires)', rootheld.length >= 3, `${rootheld.length}`);
  check('D: rootheld = ZERO surface exits + the registered static-exits kind',
    rootheld.every(z => z.exits.length === 0 && zoneKindOf(z)?.staticExits === true)
    && !!ZONE_KINDS['rootheld']);
  const withUnder = bfsFromTown(w, true);
  const withoutUnder = bfsFromTown(w, false);
  const reachableHeld = rootheld.filter(z => withUnder.has(z.id));
  check('D: rootheld nodes UNREACHABLE by surface BFS (the set piece holds)',
    rootheld.every(z => !withoutUnder.has(z.id)));
  check('D: rootheld nodes REACHABLE once under-roads join the walk (connected citizens)',
    reachableHeld.length === rootheld.length, `${reachableHeld.length}/${rootheld.length}`);

  // E. THE LAWS.
  check('E: no spanned zone exceeds its road budget (underways spend nothing)',
    spanned.every(z => countRoads(z) <= roadBudgetOf(z)));
  const rowsBefore = spanned.reduce((a, z) => a + (z.underways?.length ?? 0), 0);
  w.reconcileWebLaws();
  const rowsAfter = surfaceZones(w).reduce((a, z) => a + (z.underways?.length ?? 0), 0);
  check('E: reconcileWebLaws never cuts an under-road', rowsBefore === rowsAfter, `${rowsBefore} → ${rowsAfter}`);
  check('E: rootheld still sealed after the heal',
    surfaceZones(w).filter(z => z.kind === 'rootheld').every(z => z.exits.length === 0));
  // The save round-trip: rows survive; rows to culled zones prune.
  const raw = JSON.parse(JSON.stringify(surfaceZones(w))) as ZoneDef[];
  const healed = sanitizeWorldZones(raw, new Set());
  check('E: the save round-trip keeps under-roads', !!healed
    && Object.values(healed!).reduce((a, z) => a + (z.underways?.length ?? 0), 0) === rowsAfter);
  const victim = spanned.find(z => z.id.startsWith('ugspan_'));
  if (victim && healed) {
    const raw2 = (JSON.parse(JSON.stringify(surfaceZones(w))) as ZoneDef[]).filter(z => z.id !== victim.id);
    const healed2 = sanitizeWorldZones(raw2, new Set());
    const dangling = healed2 ? Object.values(healed2).some(z => z.underways?.some(u => u.to === victim.id)) : true;
    check('E: a culled member\'s under-roads PRUNE both ways (the searoutes heal)', !dangling);
  }
  // A ONE-WAY row (a stale or corrupt save's half-stamped span) heals away —
  // symmetry is a load-bearing invariant, never a hope.
  {
    const raw3 = JSON.parse(JSON.stringify(surfaceZones(w))) as ZoneDef[];
    const [a, b] = raw3.filter(z => z.id.startsWith('gen_') && !z.underways?.length);
    if (a && b) {
      a.underways = [{ to: b.id, span: 'ugspan_qa_oneway' }]; // no mirror on b
      const healed3 = sanitizeWorldZones(raw3, new Set());
      check('E: a ONE-WAY row heals away at restore (the symmetry law)',
        !!healed3 && !Object.values(healed3).some(z => z.underways?.some(u => u.span === 'ugspan_qa_oneway')));
    }
  }

  // ---------------------------------------------- F. THE VEIL + THE CROSSING
  // Find a span whose seat is surface-reachable and whose far partner is a
  // fresh veiled mint — then walk the whole crossing for real.
  const scene = (() => {
    for (const seat of spanned) {
      if (!seat.id.startsWith('gen_') || seat.veiled) continue;
      if (!withoutUnder.has(seat.id)) continue;
      for (const u of seat.underways ?? []) {
        const far = w.zoneMap[u.to];
        if (far?.id.startsWith('ugspan_') && far.veiled) return { seat, far, span: u.span };
      }
    }
    return null;
  })();
  check('F: a walkable crossing scene exists (seat found, far partner veiled)', !!scene,
    scene ? `${scene.seat.id} → ${scene.far.id} via ${scene.span}` : 'NONE');
  if (scene) {
    const { seat, far, span } = scene;
    const pocketId = `cave_${span}`;
    w.loadZone(seat.id);
    check('F: the seat\'s load does NOT unveil the far mouth (ring-1 never crosses an under-road)',
      far.veiled === true);
    const priv = w as unknown as {
      caveEntrances: { pos: { x: number; y: number }; seed: number; kind: string; underSpan?: string }[];
      caveMap: Record<string, ZoneDef>;
    };
    const mouth = priv.caveEntrances.find(en => en.underSpan === span);
    check('F: the seat seats a harvest-paired rootway mouth', !!mouth,
      `${priv.caveEntrances.filter(en => en.kind === 'rootway_gate').length} rootway mouth(s)`);
    if (mouth) {
      // Walk the crossing: dwell the mouth → the shared pocket.
      w.player.invulnerable = true;
      w.player.untargetable = true;
      w.player.pos.x = mouth.pos.x; w.player.pos.y = mouth.pos.y;
      for (let i = 0; i < 40 && w.zone.id !== pocketId; i++) w.update(0.1);
      check('F: dwelling the mouth enters the SHARED span pocket', w.zone.id === pocketId, w.zone.id);
      if (w.zone.id === pocketId) {
        const pocket = w.zone;
        const members = Object.values(w.zoneMap).filter(z => z.underways?.some(u => u.span === span)).map(z => z.id).sort();
        check('F: the pocket carries one exit per member (the multi-mouth def)',
          pocket.underSpan === span && pocket.exits.length === members.length
          && members.every(m => pocket.exits.some(e => e.to === m)),
          `${pocket.exits.length} exits / ${members.length} members`);
        const defFp = JSON.stringify({ ex: pocket.exits, lv: pocket.level, seed: pocket.seed, ts: pocket.tileset, nm: pocket.name });
        // Cross to the FAR member: stand on its portal until travel fires.
        const farExit = (w as unknown as { exits: { to: string; pos: { x: number; y: number } }[] }).exits
          .find(x => x.to === far.id);
        check('F: the far member\'s portal stands in the pocket', !!farExit);
        if (farExit) {
          w.player.pos.x = farExit.pos.x; w.player.pos.y = farExit.pos.y;
          for (let i = 0; i < 60 && w.zone.id !== far.id; i++) w.update(0.1);
          check('F: walking out the far door SURFACES in the far node', w.zone.id === far.id, w.zone.id);
          check('F: the crossing UNVEILS the far node (found by walking, the loud discovery)', far.veiled !== true);
          check('F: the ladder unwound — the surface load is a true surface stand', w.inCave === false);
          const farMouth = priv.caveEntrances.find(en => en.underSpan === span);
          const near = farMouth ? Math.hypot(w.player.pos.x - farMouth.pos.x, w.player.pos.y - farMouth.pos.y) : Infinity;
          check('F: the arrival lands AT the far node\'s own mouth', !!farMouth && near <= 130, `${Math.round(near)}px`);
          const ledger = (w as unknown as { ledger: Record<string, number> }).ledger;
          check('F: the crossing stamps its ledger (rootspan_crossed)', (ledger['rootspan_crossed'] ?? 0) >= 1);
          // The pocket is the SAME zone from every door: re-mint from THIS side.
          // (Step OFF the mouth first — the exit grace deliberately refuses a
          // re-dwell until the player clears it once.)
          delete priv.caveMap[pocketId];
          if (farMouth) {
            w.player.pos.x = farMouth.pos.x + 300; w.player.pos.y = farMouth.pos.y;
            for (let i = 0; i < 5; i++) w.update(0.1);
            w.player.pos.x = farMouth.pos.x; w.player.pos.y = farMouth.pos.y;
            for (let i = 0; i < 40 && w.zone.id !== pocketId; i++) w.update(0.1);
            check('F: the far door re-enters the SAME pocket id', w.zone.id === pocketId, w.zone.id);
            const defFp2 = w.zone.id === pocketId
              ? JSON.stringify({ ex: w.zone.exits, lv: w.zone.level, seed: w.zone.seed, ts: w.zone.tileset, nm: w.zone.name })
              : '';
            check('F: the pocket def is BYTE-IDENTICAL from either door (the seat-canonical mint)', defFp2 === defFp);
          }
        }
      }
    }
  }
}

// ------------------------------------------------ G. THE SECOND COUNTRY (batch 24)
// The rooted web's proof of generality: the DOWNS row (data/catacombs.ts)
// rides the same registry with its OWN kit — the lych way's mouth landmark,
// the barrowheld sealed kind, the catacombs pocket face — and the engine
// carries no country's shape (the mouth stamp and the sealed kind both read
// the policy row). G1 pins the shipped census + the JUNGLE TEST as
// inequalities (the second country must read differently BY DIALS); G2/G3
// grow a downs-only forced world and walk into the pocket.
{
  // G1: the shipped registry census — two countries, each its own kit.
  const g = SHIPPED['garden'], d = SHIPPED['downs'];
  check('G: shipped rows — garden + downs registered, each with its OWN kit',
    g?.mouth === 'rootway_mouth' && g?.heldKind === 'rootheld'
    && d?.mouth === 'lychway_mouth' && d?.heldKind === 'barrowheld'
    && !!ZONE_KINDS['barrowheld'] && ZONE_KINDS['barrowheld'].staticExits === true);
  check('G: the jungle test holds BY DIALS (rarer, longer, older, more sealed than the garden)',
    !!g && !!d && d.chance < g.chance && d.reach[0] >= 2 && d.reach[1] >= g.reach[1]
    && d.radius > g.radius && d.fresh < g.fresh && d.exitless > g.exitless);
  check('G: the omen voices are the countries\' own (never one shared murmur)',
    !!g?.omen && !!d?.omen && g.omen.lines[0] !== d.omen.lines[0] && g.omen.color !== d.omen.color);

  // G2: a downs-only forced world — every span wears the LYCH kit.
  wipePolicies();
  registerUnderSpan({
    biome: 'downs', chance: 1, reach: [2, 2], radius: 420, fresh: 0.5, exitless: 1,
    mouth: 'lychway_mouth', heldKind: 'barrowheld',
  });
  const w = grow(0xd0512, 7);
  const zones = surfaceZones(w);
  const spanned = zones.filter(z => z.biome === 'downs' && z.underways?.length);
  check('G: downs spans seed under the forced regime', spanned.length >= 5, `${spanned.length} spanned`);
  check('G: every downs member wears the LYCHWAY mouth (never the garden\'s)',
    spanned.length > 0 && spanned.every(z =>
      (z.landmarks ?? []).some(l => l.landmark === 'lychway_mouth')
      && !(z.landmarks ?? []).some(l => l.landmark === 'rootway_mouth')));
  const held = zones.filter(z => z.kind === 'barrowheld');
  check('G: sealed partners wear BARROWHELD (zero exits, static kind; rootheld never leaks)',
    held.length >= 2
    && held.every(z => z.exits.length === 0 && zoneKindOf(z)?.staticExits === true)
    && zones.every(z => z.kind !== 'rootheld'), `${held.length} barrowheld`);

  // G3: the walk below — a lych mouth opens the SHARED catacombs pocket.
  const seat = spanned.find(z => z.id.startsWith('gen_') && !z.veiled) ?? spanned[0];
  check('G: a seat stands to walk from', !!seat, seat?.id ?? 'NONE');
  if (seat) {
    const span = seat.underways![0].span;
    const pocketId = `cave_${span}`;
    w.loadZone(seat.id);
    const priv = w as unknown as {
      caveEntrances: { pos: { x: number; y: number }; seed: number; kind: string; underSpan?: string }[];
    };
    const mouth = priv.caveEntrances.find(en => en.underSpan === span);
    check('G: the seat seats a harvest-paired lychway mouth (kind = lychway_gate)',
      !!mouth && mouth.kind === 'lychway_gate',
      mouth ? mouth.kind : `${priv.caveEntrances.length} entrance(s), none span-paired`);
    if (mouth) {
      w.player.invulnerable = true;
      w.player.untargetable = true;
      w.player.pos.x = mouth.pos.x; w.player.pos.y = mouth.pos.y;
      for (let i = 0; i < 40 && w.zone.id !== pocketId; i++) w.update(0.1);
      check('G: dwelling the lych mouth enters the shared pocket', w.zone.id === pocketId, w.zone.id);
      if (w.zone.id === pocketId) {
        const members = Object.values(w.zoneMap).filter(z => z.underways?.some(u => u.span === span)).map(z => z.id).sort();
        check('G: the pocket is the CATACOMBS (the row\'s own face, objective none forced)',
          w.zone.tileset === 'catacombs' && w.zone.objective.kind === 'none'
          && w.zone.underSpan === span && w.zone.exits.length === members.length,
          `tileset=${w.zone.tileset} exits=${w.zone.exits.length}/${members.length}`);
        const ledger = (w as unknown as { ledger: Record<string, number> }).ledger;
        check('G: the lych door stamps its OWN gateway ledger (lychway_entered)',
          (ledger['lychway_entered'] ?? 0) >= 1);
      }
    }
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
