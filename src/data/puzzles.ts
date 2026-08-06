// ---------------------------------------------------------------------------
// PUZZLE PRESETS — the authored riddle repertoire (engine/puzzles.ts).
//
// A preset is pure data: which KIND runs it, its board/ring/palette dials,
// and what resolving it pays. Biomes offer presets per zone via
// TilesetDef.puzzles chance rows (folded onto minted ZoneDefs); a 'puzzle'
// OBJECTIVE draws from the same rows. Adding a riddle to a biome is one row;
// adding a NEW preset is one entry here; adding a new KIND is a
// registerPuzzleKind in engine (or a package) — three seams, all data-shaped.
//
// This module also wires the shared presentation lanes, the beacons.ts idiom:
//   - zone panel rows      → registerZoneInfoSource (live riddles + state)
//   - off-screen chevron   → registerAttentionSource (the objective riddle)
// ---------------------------------------------------------------------------

import { vec } from '../core/math';
import type { Rng } from '../core/rng';
import { registerTenantKind, tenantKindOf } from '../engine/massif';
import { PUZZLE_KINDS, registerPuzzleKind, type PuzzleSpec } from '../engine/puzzles';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { registerZoneInfoSource } from '../world/zoneInfo';

/** The riddle chevron/panel accent (crystal-glass blue). */
export const PUZZLE_ACCENT = '#9fd8ff';

export const PUZZLES: Record<string, PuzzleSpec> = {
  // THE GREAT CHORD — a locked heart holds a rolled element; strike the
  // ring's crystals with matching damage until every voice joins. The
  // parting wash is the heart's own tone, paid generously.
  great_chord: {
    kind: 'chord',
    label: 'the great chord',
    reward: { gems: 2, washFor: 20 },
  },
  // THE SHATTERED CHORD — the heartless inversion: the ring wakes mistuned
  // and asks for SILENCE. Batter every crystal back to physical — the
  // ground state is a note too, and this riddle is its anthem.
  shatter_chord: {
    kind: 'chord',
    heart: false,
    tones: ['physical'],
    label: 'the shattered chord',
    count: [4, 5],
    reward: { gems: 2, washFor: 20 },
  },
  // THE CHARGED LATTICE — lights-out on a 3×3 of crystals: a strike toggles
  // a cell and its orthogonal neighbors. Kindle the whole board.
  charged_lattice: {
    kind: 'lattice',
    grid: [3, 3],
    label: 'the charged lattice',
    reward: { gems: 2, washFor: 20 },
  },
  // THE SINGING REFRAIN — the ring plays; you answer. Wrong notes falter
  // the song back to its opening bar; the crystals are patient.
  singing_refrain: {
    kind: 'refrain',
    label: 'the singing refrain',
    reward: { gems: 2, washFor: 20 },
  },
  // THE GLIMMER REFRAIN — the grove country's version of the same patience:
  // the ring flashes a firefly sign; you answer it back. The lampwrights
  // have been running this call-and-answer since before anyone walked here.
  glimmer_refrain: {
    kind: 'refrain',
    label: 'the glimmer refrain',
    reward: { gems: 2, washFor: 20 },
  },
  // THE RISING TEMPO — every voice keeps its own time from one synced
  // opening bar; strike them slowest first, fastest last. Nothing to
  // memorize: the order is read straight off the pulses, and a broken
  // measure only re-syncs the bar for a fresh look.
  rising_tempo: {
    kind: 'tempo',
    label: 'the rising tempo',
    reward: { gems: 2, washFor: 20 },
  },
  // THE TWIN ACCORD — opposite seats share a color; ring both halves of a
  // pair inside the linger and the accord binds for good. A wide blow can
  // bind a pair whole (spill 'all' is this kind's law) — or just walk it.
  twin_accord: {
    kind: 'accord',
    label: 'the twin accord',
    reward: { gems: 2, washFor: 20 },
  },
  // THE EMBER RING — struck coals stay alight for their gutter window;
  // have every coal burning at once. Patience circles the ring forever,
  // breadth lights half of it in a swing — no falter, no penalty, only
  // the coals' own cooling.
  ember_ring: {
    kind: 'ember',
    label: 'the ember ring',
    reward: { gems: 2, washFor: 20 },
  },
  // THE GRAVE EXHUMATION — the lone crypt's key (kit: data/lonecrypt.ts).
  // STRUCK open, never dwelled: every spade-blow is a landed hit through
  // the knock grammar — the loud contrast with the 'unearth' objective's
  // stand-and-charge mounds. The reward is deliberately lean; the sealed
  // crypt this ring opens is the real pay.
  grave_exhumation: {
    kind: 'exhumation',
    // Her ruling 2026-08-05: the adopted objective NAMES the thing — "this
    // zone had a lone crypt at one point, find it and unseal it" reads as
    // lore, not chore. The status line opens with this label.
    label: 'Break the seal on the lone crypt',
    reward: { gems: 1 },
  },
};

// ---------------------------------------------------------------------------
// THE EXHUMATION (the lone crypt's kind — kit in data/lonecrypt.ts): dig the
// unquiet graves OPEN with your weapon. Each gravestone takes `digs` landed
// blows (one shared count rolled at boot — the labor is readable, never a
// lottery), an opened grave holds its kindled glow for good, and every grave
// open resolves the ring. THE DISTINCTION, loudly: this is the STRIKE
// exhumation — a blow rings a stone through the knock/spill/hum laws exactly
// like every riddle; the 'unearth' objective's burial mounds are the DWELL
// exhumation (stand your ground while the charge fills). Two verbs, two
// fabrics, on purpose. No falter, no clock: spill 'all' lets a sweeping dig
// feed several stones (the ember ring's breadth law) and patience alone
// finishes the job — the pressure is the crypt's resident, not the ring.
// ---------------------------------------------------------------------------

/** The exhumation's own spec face (the CourtShrineSpec typing precedent —
 *  extra dials live on an extending interface, presets that want them are
 *  authored as typed consts). */
export interface ExhumationSpec extends PuzzleSpec {
  /** Spade-blows each grave takes to stand open (default [2, 3]); one band
   *  roll at boot serves every stone. */
  digs?: [number, number];
}

const EXHUME_TINT = '#d8cfa8';

registerPuzzleKind({
  id: 'exhumation',
  nodeMonster: 'unquiet_grave',
  geometry: 'ring',
  who: 'player',
  spill: 'all', // a wide swing digs several graves at once — breadth is honest labor
  spacing: 118,
  count: [4, 6],
  label: 'the exhumation',
  boot(run, h) {
    const band = (run.spec as ExhumationSpec).digs ?? [2, 3];
    run.state.need = band[0] + Math.floor(h.rng() * (band[1] - band[0] + 1));
    run.state.dug = run.nodes.map(() => 0);
  },
  struck(run, node, h) {
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    const dug = run.state.dug as number[];
    const need = run.state.need as number;
    if (dug[idx] >= need) return; // an opened grave — quiet
    dug[idx]++;
    if (dug[idx] >= need) {
      h.kindle(node, 9999);
      h.flash(node.pos, node.radius + 20, EXHUME_TINT, 0.3);
      h.say(node.pos, 'the grave stands open', EXHUME_TINT, 12);
      if (dug.every(d => d >= need)) h.complete(run);
    } else {
      h.flash(node.pos, node.radius + 14, EXHUME_TINT, 0.2);
      if (dug[idx] === 1) h.say(node.pos, 'the turf breaks…', EXHUME_TINT, 11);
    }
  },
  solved(run, h) {
    const need = (run.state.need as number | undefined) ?? 1;
    run.state.dug = run.nodes.map(() => need);
    for (const n of run.nodes) h.kindle(n, 9999);
  },
  status(run) {
    const dug = run.state.dug as number[];
    const need = run.state.need as number;
    const open = dug.filter(d => d >= need).length;
    return `${run.spec.label ?? this.label}: ${open}/${dug.length} graves opened`;
  },
});

// ---------------------------------------------------------------------------
// THE COURT SHRINE — a massif court ring that HOLDS a riddle. 'shrine' is a
// registered TENANT KIND (engine/massif.ts ring tenants): when a court's
// occupancy draw lands on it, the enclosed yard becomes a shrine precinct —
// a votive stone at the center, plinths on the rim, and one of the ring
// riddles above standing as the court's occupant.
//
// THE SEAM (a gen-time tenant seating a load-time puzzle, world.ts untouched):
// the tenant handler runs at GENERATION time (seatTenants, on the per-mass
// fork stream) while the placer stands riddles up at zone LOAD from
// ZoneDef.puzzles rows — so the handler MINTS a ZONE-KEYED preset into the
// PUZZLES record (`court_shrine:<zoneId>`) carrying the court's exact seat
// (center / ring radius / phase / inner kind), and appends its row to
// def.puzzles COPY-ON-WRITE (the minted def aliases the TILESET's own rows
// array — a push would poison every future mint of that tileset). The row is
// the pointer and the minted spec is the ledger entry: the placer's own
// `PUZZLES[preset]` lookup hands the wrapper kind the right seat with zero
// world-side changes, zone-keyed BY CONSTRUCTION (the spec a run binds is the
// spec its own zone's row names — no cross-zone staleness possible). Both
// sides re-derive per generation, so saves, re-entries and HMR self-heal; a
// row orphaned by future data changes meets the placer's standing
// unknown-preset skip and degrades to nothing.
//
// THE LAWS:
//   • SELF-CONTAINED, never offered: the shrine does NOT ride
//     TilesetDef.puzzles — ONE tenant draw decides both the court and its
//     riddle, so a dressed shrine with no riddle (or a shrine row with no
//     court) cannot exist, and any biome whose court tables name 'shrine'
//     gets the whole thing with no second file to keep in sync.
//   • STREAM DISCIPLINE: every shrine draw rides the tenant fork (the mass's
//     own shape seed — the garrison fork law); the layout stream never moves.
//     On the PUZZLE stream the placer draws all row SELECTIONS before any
//     PLACEMENT, so an appended row's selection draw would sit between a
//     zone's authored selections and their placements — coexistence would
//     shift an authored riddle's seat. The shrine refuses coexistence
//     outright (THE COEXISTENCE GATE below); in the zones it does claim, the
//     authored set is EMPTY and every draw it adds trails it — no authored
//     roll can shift, structurally (probe G pins the gate and the claim).
//     Lifting the gate needs a placer-side fork of the want/placement
//     streams — a world.ts change, deliberately not smuggled through here.
//   • THE STAND-DOWN GATES (a shrine court always holds a riddle, or it
//     isn't a shrine court): a `puzzle`-OBJECTIVE zone is never appended to
//     (its unpinned preset pick reads rows.length — appending would shift
//     it), THE COEXISTENCE GATE stands the shrine down wherever the zone
//     authors TilesetDef.puzzles rows of its own (no court biome authors
//     any today — the wilds' riddles and the court's shrine never share a
//     zone), a floor too small for the ring seats nothing, and a SECOND
//     shrine-drawing court in one generation falls back to stock ▷ vacant
//     (the held_stock delegation).
//   • DRAWN == TESTED: the dress and the crystal ring share ONE recorded
//     seat; the wrapper kind re-seats the placer's nodes onto that exact
//     circle at boot, then REBINDS run.kind to the inner riddle — every law
//     after boot (knock/spill/hum, the who gate, status, completion pay,
//     memory SOLVED re-entry) is the inner kind's own, verbatim.
//   • LITE AGREEMENT: under ctx.lite the mint + append still run (a lite and
//     a full generation must agree on who holds the ring — the occupancy
//     doctrine); only the dress stands down (the dressMasses law), and every
//     RECORDED value draws before the first dress draw so the two agree
//     byte-for-byte.
// ---------------------------------------------------------------------------

/** The wrapper kind's id, and the zone-keyed preset prefix (the minted key is
 *  `court_shrine:<zoneId>` — the prefix is how gates tell authored rows from
 *  the shrine's own appended one). */
export const COURT_SHRINE_KIND = 'court_shrine';
export const COURT_SHRINE_PRESET_PREFIX = `${COURT_SHRINE_KIND}:`;

/** The minted zone-keyed spec: an ordinary PuzzleSpec (the placer + inner
 *  kind read it verbatim) carrying the recorded court seat. */
export interface CourtShrineSpec extends PuzzleSpec {
  /** The ledger half: the court's seat, the fitted ring, the rolled phase,
   *  and WHICH ring riddle stands here (a PUZZLE_KINDS id). */
  shrine: { x: number; y: number; ringR: number; a0: number; kind: string };
  /** The generation pass that minted this entry (ctx object identity — the
   *  second-court discriminator within one pass; never serialized). */
  mintCtx?: object;
}

const SHRINE_CFG = {
  /** Preferred crystal-ring radius; shrunk to fit small courts. */
  ringR: 96,
  /** Below this fitted radius the yard is too tight — the court falls back. */
  ringRMin: 56,
  /** Court-floor margin the ring keeps off the wall (crystal + swing room). */
  rim: 26,
  /** The cache handler's floor read (engine/massif.ts): court floor ≈
   *  r × ringInner × 0.9; this default mirrors its `?? 0.6`. */
  ringInnerDefault: 0.6,
  /** Center votive stone (wayshrine: blocks movement, never shots — ranged
   *  play across the ring stays honest). */
  altarR: 13,
  /** The stone stands OFF the court's interior point: the interior is a
   *  REQUIRED walkable point (the reachability net's own poi) and levelgen's
   *  navigability pass CLEARS any solid sealing one — a stone ON the seat
   *  would simply vanish. It also keeps clear of the crystals (rings tighter
   *  than altarOff + clearance skip the stone; the plinths still mark the
   *  yard). */
  altarOff: 44,
  altarClear: 14,
  /** Rim plinths just outside the crystal ring. */
  plinths: 2,
  plinthOut: 34,
} as const;

/** The shrine's repertoire — heartless RING kinds only (the wrapper re-seats
 *  a ring; grid boards and hearted chords stay the wilds' own riddles).
 *  `pairs` kinds draw a pair count and double it, so the accord can never
 *  mint an orphan voice (the quantize law honored at MINT time). A probe or
 *  authored table row may pin the pool via TenantRow.params.kinds. */
const SHRINE_INNERS: {
  kind: string; weight: number; node: string; label: string;
  count?: [number, number]; pairs?: [number, number];
}[] = [
  { kind: 'refrain', weight: 3, node: 'chime_crystal', count: [4, 5], label: 'the courtyard refrain' },
  { kind: 'tempo', weight: 2, node: 'tempo_crystal', count: [4, 5], label: 'the courtyard tempo' },
  { kind: 'accord', weight: 2, node: 'accord_crystal', pairs: [2, 3], label: 'the courtyard accord' },
  { kind: 'ember', weight: 3, node: 'ember_crystal', count: [5, 6], label: 'the courtyard embers' },
];

function pickShrineInner(rng: Rng, pool: typeof SHRINE_INNERS): typeof SHRINE_INNERS[number] {
  const total = pool.reduce((a, r) => a + r.weight, 0);
  let roll = rng.next() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return pool[pool.length - 1];
}

// THE WRAPPER KIND — the load half. The placer builds the run as usual (its
// stream draws stand, appended safely LAST); boot re-seats run.at + the nodes
// onto the recorded circle, then rebinds run.kind to the inner riddle and
// boots IT. After that line the wrapper is gone: knock routing, ticks,
// status, completion and memory re-entry are all the inner kind's own (the
// placer's memory-solved call lands on this def's `solved`, which delegates).
// A stale or foreign spec (no shrine block, unknown inner) leaves the ring
// where the placer put it, silent scenery — degrade, never wedge.
registerPuzzleKind({
  id: COURT_SHRINE_KIND,
  nodeMonster: 'chime_crystal', // fallback face — minted specs pin their own node
  geometry: 'ring',
  who: 'player',
  spacing: SHRINE_CFG.ringR, // footprint fallback — minted specs pin the fitted ring
  label: 'the court shrine',
  boot(run, h) {
    const s = run.spec as CourtShrineSpec;
    const inner = s.shrine ? PUZZLE_KINDS[s.shrine.kind] : undefined;
    if (!s.shrine || !inner || inner.id === COURT_SHRINE_KIND) return;
    run.at = vec(s.shrine.x, s.shrine.y);
    const n = run.nodes.length;
    for (let i = 0; i < n; i++) {
      const ang = s.shrine.a0 + (i / n) * Math.PI * 2;
      run.nodes[i].pos = vec(
        s.shrine.x + Math.cos(ang) * s.shrine.ringR,
        s.shrine.y + Math.sin(ang) * s.shrine.ringR);
    }
    run.kind = inner; // every law past this line is the inner riddle's own
    inner.boot(run, h);
  },
  solved(run, h) {
    if (run.kind.id !== COURT_SHRINE_KIND) run.kind.solved?.(run, h);
  },
  status(run) {
    return run.kind.id !== COURT_SHRINE_KIND
      ? run.kind.status(run)
      : `${run.spec.label ?? this.label}: silent`;
  },
});

// THE TENANT KIND — the gen half (see the seam + laws above). Draw order is
// load-bearing: inner pick, count, phase — the RECORDED values — all draw
// before any dress draw, so a lite mint and a full mint record identically.
registerTenantKind('shrine', (ctx, def, grid, cm, rng, kd, row) => {
  const seat = cm.interior;
  if (!seat) return;
  const fallback = (): void => {
    const rows = row.rows ?? kd.inner;
    tenantKindOf(rows?.length ? 'stock' : 'vacant')?.(ctx, def, grid, cm, rng, kd, row);
  };
  const key = `${COURT_SHRINE_PRESET_PREFIX}${def.id}`;
  const claimed = (def.puzzles ?? []).some(r => r.id === key);
  if (claimed) {
    // Deterministic order makes the SAME court the first drawer every pass:
    // a matching mintCtx means a later court this pass — it falls back; a
    // stale/absent spec means a fresh pass (reload, restart) — re-claim and
    // re-mint the identical values.
    const prior = PUZZLES[key] as CourtShrineSpec | undefined;
    if (prior?.mintCtx === ctx) { fallback(); return; }
  } else {
    // THE COEXISTENCE GATE (see the header): any authored rows at all — the
    // placer's selection-then-placement stream shape means our row's draw
    // would shift an authored riddle's seat, so the shrine yields the zone.
    const authored = (def.puzzles ?? []).filter(r => !r.id.startsWith(COURT_SHRINE_PRESET_PREFIX));
    if (def.objective?.kind === 'puzzle' || authored.length > 0) {
      fallback(); return;
    }
  }
  // The RECORDED draws (fork stream — the layout never moves).
  const wanted = Array.isArray((row.params as { kinds?: unknown } | undefined)?.kinds)
    ? (row.params as { kinds: string[] }).kinds : undefined;
  const pool = wanted ? SHRINE_INNERS.filter(r => wanted.includes(r.kind)) : SHRINE_INNERS;
  const inner = pickShrineInner(rng, pool.length ? pool : SHRINE_INNERS);
  const n = inner.pairs
    ? 2 * rng.int(inner.pairs[0], inner.pairs[1])
    : rng.int(inner.count![0], inner.count![1]);
  const a0 = rng.range(0, Math.PI * 2);
  // The FIT (pure — no draws): the ring must stand on the court's own floor.
  const floorR = cm.r * (kd.ringInner ?? SHRINE_CFG.ringInnerDefault) * 0.9;
  const fits = (rr: number): boolean => {
    if (!grid.isWalkable(seat.x, seat.y)) return false;
    for (let i = 0; i < n; i++) {
      const ang = a0 + (i / n) * Math.PI * 2;
      if (!grid.isWalkable(seat.x + Math.cos(ang) * rr, seat.y + Math.sin(ang) * rr)) return false;
    }
    return true;
  };
  let ringR = Math.min(SHRINE_CFG.ringR, floorR - SHRINE_CFG.rim);
  if (ringR < SHRINE_CFG.ringRMin) { fallback(); return; }
  if (!fits(ringR)) {
    ringR *= 0.72;
    if (ringR < SHRINE_CFG.ringRMin || !fits(ringR)) { fallback(); return; }
  }
  const minted: CourtShrineSpec = {
    kind: COURT_SHRINE_KIND, node: inner.node, count: [n, n], spacing: ringR,
    label: inner.label, reward: { gems: 2, washFor: 20 },
    shrine: { x: seat.x, y: seat.y, ringR, a0, kind: inner.kind },
    mintCtx: ctx,
  };
  PUZZLES[key] = minted;
  if (!claimed) def.puzzles = [...(def.puzzles ?? []), { id: key, chance: 1 }];
  if (ctx.lite) return;
  // THE DRESS (fork draws, after every recorded value): the votive stone
  // inside the ring — off the required interior point, see altarOff — and
  // plinths just off the crystal ring; standing kinds only.
  if (ringR >= SHRINE_CFG.altarOff + SHRINE_CFG.altarR + SHRINE_CFG.altarClear) {
    const aAlt = rng.range(0, Math.PI * 2);
    const ax = seat.x + Math.cos(aAlt) * SHRINE_CFG.altarOff;
    const ay = seat.y + Math.sin(aAlt) * SHRINE_CFG.altarOff;
    if (grid.isWalkable(ax, ay)) {
      ctx.doodads.push({
        pos: vec(ax, ay), radius: SHRINE_CFG.altarR,
        kind: 'wayshrine', rot: rng.range(0, Math.PI * 2),
      });
    }
  }
  for (let i = 0; i < SHRINE_CFG.plinths; i++) {
    const a = a0 + ((i + 0.5) / SHRINE_CFG.plinths) * Math.PI * 2;
    const gx = seat.x + Math.cos(a) * (ringR + SHRINE_CFG.plinthOut);
    const gy = seat.y + Math.sin(a) * (ringR + SHRINE_CFG.plinthOut);
    if (!grid.isWalkable(gx, gy)) continue;
    ctx.doodads.push({
      pos: vec(gx, gy), radius: rng.range(12, 15),
      kind: 'ruin_plinth', rot: rng.range(0, Math.PI * 2),
    });
  }
});

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// Zone panel: every live riddle in the CURRENT zone reads out its state —
// resolved ones stand as proof (and stop advertising a gift).
registerZoneInfoSource((world: World, zoneId: string) => {
  if (world.zone?.id !== zoneId) return [];
  return world.puzzleViews().map(p => ({
    kind: 'event' as const, icon: '◈', color: PUZZLE_ACCENT,
    label: p.done ? `${cap(p.label)} — resolved` : cap(p.label),
    detail: p.done ? 'its gift is spent' : p.line,
  }));
});

// Off-screen chevron: only the OBJECTIVE riddle points (side riddles stay
// discoveries — the panel lists them, the world doesn't nag).
registerAttentionSource((world: World): AttentionPoint[] => {
  return world.puzzleViews()
    .filter(p => p.isObjective && !p.done)
    .map(p => ({
      id: `puzzle_${p.id}`, pos: p.pos, color: PUZZLE_ACCENT, glyph: '◈',
      label: p.label, z: 2,
    }));
});
