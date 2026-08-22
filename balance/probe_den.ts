// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GREAT GEYSER den + THE GEYSERMAW (Scald Basin M3 — the
// coda's first item; charter docs/design/scald-basin.md card 4 / §2 the den
// row / §3 / §8 / §8b / §13 M3), end to end on the real registries and the
// real engine. Kit data/greatgeyser.ts; recipe engine/ventcauldron.ts; the
// dweller engine/ventDweller.ts + World.updateVentDwellers; tileset
// great_geyser; the maw data/monsters.ts; docs docs/engine/greatgeyser.md.
// Pins:
//   A  THE SEAT: the lair row resolves ONLY on scald SURFACE ground inside its
//      level envelope — absent == identical on other biomes, in caves, and
//      below the envelope (the fold burns no draw there); the seat's chance
//      is a discovery, never a belt.
//   B  THE MOUTH MINTS (headless generateLayout, the chance-1 roll): ONE
//      geyser_maw door, the spoor ring (steam / sinter / crust) on its apron,
//      exactly ONE authored GREAT vent `ventClear` beside the door with an
//      authored clock (the country's LOUDEST vent — an anchor, the metronome
//      law), the vent never under the spoor; determinism.
//   C  THE RECIPE (headless on the den tileset + the bare plain def): the
//      basin stands, every portal + the heart + the pockets reachable from
//      the entry, the heart vent authored at the center with a boss-tempo
//      clock in band and THE BOSS SEAT on it, the heart clear of every piece,
//      shelter overhangs on the middle ring, POIs = the pockets (never the
//      heart), determinism; absent == identical (the bare def stands a basin).
//   D  THE DEN LIVE (the real sidezone round trip): the maw door mints the
//      Great Geyser — id/name/noDeeper/boss ask/open sky/tileset/recipe — the
//      ledger stamps on entry, the heart vent stands FIRST in the world's
//      field on a PRIVATE band at the plan's heart, the Geysermaw stands ON
//      the boss seat (IN the vent), the den fields its packs, the fauna rows
//      ride the def.
//   E  THE WINDOW LAW (drawn == tested both ways, through the live loop):
//      over more than one full period the maw's worn state EQUALS the pure
//      resolver at every sample — UNDER ⇔ concealed (vent_submerged:
//      timeScale 0) + untargetable + invulnerable + pinned to the mouth; UP ⇔
//      a plain body; SINKING ⇔ vent_sinking worn; the window opens only after
//      the column clears (never inside the live column); a DoT and a real
//      hit are refused under and land up; its clock IS the vent's — a jumped
//      clock re-derives the phase at once (no own timer), and the A/B lever
//      moves nothing on the authored anchor.
//   F  THE NO-TAG LAW: windowOf's ceiling (a slow vent stretches the WINDOW,
//      never the silence; the window always closes; lint names every clamp);
//      the den's authored period band keeps the maw under ≤ the ceiling.
//   G  THE LEDGER + THE ASK: the maw's fall stamps geysermaw_slain on the run
//      AND the account, and completes the boss ask.
//   H  THE NETS: kit exists + hinted + affordable, look parts resolve, tells
//      validate, statuses/visuals/registries stand, the ominous zone-info line
//      murmurs only on charted ground that seated the roll.
// Run: npx tsx balance/probe_den.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng, withSeededRandom } from '../src/core/rng';
import { vec, type Vec2 } from '../src/core/math';
import { generateLayout, hasLayout, hasLandmark, type GeneratedLayout } from '../src/engine/levelgen';
import { GEYSER_CFG, ventReadAt, type GeyserField, type PlacedVent } from '../src/engine/geysers';
import { lairLandmarkRolls, lairOf } from '../src/engine/lairs';
import {
  VENT_DWELLER_CFG, dwellerPhaseAt, dwellerToWindow, lintVentDweller, windowOf, type DwellerPhase,
} from '../src/engine/ventDweller';
import { VENTCAULDRON_CFG, VENTCAULDRON_PLANS } from '../src/engine/ventcauldron';
import { applyDot } from '../src/engine/damage';
import { updateAI } from '../src/engine/ai';
import { STATUS_DEFS } from '../src/engine/status';
import { validateTells } from '../src/engine/tells';
import { killRules } from '../src/engine/killHandlers';
import { GridWalkField } from '../src/world/gridWalk';
import { zoneInfoFor } from '../src/world/zoneInfo';
import { SKILLS } from '../src/data/skills';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { sidezoneOf } from '../src/data/sidezones';
import { GREAT_GEYSER_CFG } from '../src/data/greatgeyser';
import { PART_PAINTERS } from '../src/render/vis/parts';
import type { ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const DT = 1 / 60;
const has = (a: Actor, id: string): boolean => a.statuses.some(s => s.id === id);
const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
const fp = (ds: { kind: string; pos: { x: number; y: number } }[]): string =>
  JSON.stringify(ds.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]));
const MOUTH = 'geyser_maw';
const SITE = 'great_geyser_mouth_site';
const DEN = 'great_geyser';
const RECIPE = 'ventcauldron';
const MAW = 'geysermaw';
const SPOOR = ['steam_pocket', 'sinter_cone', 'sinter_shelf', 'sulphur_crust'];

// ------------------------------------------------------------ A) the seat --
{
  const row = lairOf(DEN);
  check('A1 seat: the great_geyser lair row stands on scald SURFACE ground, level-enveloped, a discovery chance',
    !!row && row.landmark === SITE && row.seat.place === 'surface' && row.seat.biomes.length === 1
    && row.seat.biomes[0] === 'scald' && !!row.seat.level?.from && row.seat.chance > 0 && row.seat.chance <= 0.3,
    JSON.stringify(row?.seat));
  const from = row?.seat.level?.from ?? 8;
  const rolls = (q: { place: 'surface' | 'cave'; biome: string; level: number; caveDepth?: number; tileset?: string }) =>
    lairLandmarkRolls({ place: q.place, biome: q.biome, level: q.level, caveDepth: q.caveDepth, tileset: q.tileset ?? 'geyser_fields' })
      .filter(r => r.landmark === SITE);
  const inBand = rolls({ place: 'surface', biome: 'scald', level: from + 4 });
  check('A2 seat: scald surface ground inside the envelope resolves the roll at the authored chance',
    inBand.length === 1 && Math.abs(inBand[0].chance - (row?.seat.chance ?? 0)) < 1e-6, JSON.stringify(inBand));
  check('A3 seat: the rim of the envelope whispers (a fraction of the chance), the floor below refuses outright',
    (() => { const rim = rolls({ place: 'surface', biome: 'scald', level: from - 1 }); const low = rolls({ place: 'surface', biome: 'scald', level: 1 });
      return rim.length === 1 && rim[0].chance < (row?.seat.chance ?? 0) && low.length === 0; })());
  check('A4 seat: ABSENT == IDENTICAL elsewhere — no other biome, and never the cave ladder',
    ['volcanic', 'desert', 'marsh', 'plains', 'highland', 'grove', 'garden', 'deepsea'].every(b =>
      rolls({ place: 'surface', biome: b, level: from + 6 }).length === 0)
    && rolls({ place: 'cave', biome: 'scald', level: from + 6, caveDepth: 1, tileset: 'steam_galleries' }).length === 0);
  check('A5 seat: every scald SURFACE face may host it (no tileset allowlist — the den is the country\'s, found by ear)',
    ['sinter_terraces', 'geyser_fields', 'char_reach', 'sulphur_pools'].every(t =>
      rolls({ place: 'surface', biome: 'scald', level: from + 6, tileset: t }).length === 1));
}

// ------------------------------------------------------- B) the mouth mints --
const ARENA = { w: 2400, h: 1700 };
const surfaceDef = (over: Partial<ZoneDef>): ZoneDef => ({
  id: 'probe_den_surface', name: 'Probe scald', level: 12,
  size: { w: ARENA.w, h: ARENA.h }, biome: 'scald',
  theme: TILESETS.geyser_fields.theme,
  layout: TILESETS.geyser_fields.layout,
  objective: { kind: 'clear' },
  packs: TILESETS.geyser_fields.packs,
  exits: [{ to: 'probe_home', side: 'e' }],
  map: { x: 0, y: 0 }, seed: 0,
  ...over,
});
const gen = (def: ZoneDef, seed: number): GeneratedLayout =>
  generateLayout({ ...def, seed }, { w: def.size.w, h: def.size.h }, new Rng(seed), vec(140, def.size.h / 2), [vec(def.size.w - 140, def.size.h / 2)]);
{
  const def = surfaceDef({ landmarks: [{ landmark: SITE, chance: 1 }] });
  for (const seed of [90210, 4111]) {
    const out = gen(def, seed);
    const maws = out.doodads.filter(d => d.kind === MOUTH);
    check(`B1 [${seed}] the maw door stands (one mouth, the chance-1 roll through the landmark loop)`, maws.length === 1, `${maws.length} doors`);
    const m = maws[0];
    const spoor = m ? out.doodads.filter(d => SPOOR.includes(d.kind as string) && d2(d.pos, m.pos) < 180) : [];
    check(`B2 [${seed}] the spoor ring dresses the apron (steam / sinter / crust — the den reads before the door)`, spoor.length >= 3, `${spoor.length} pieces`);
    const vents = out.authoredVents ?? [];
    check(`B3 [${seed}] exactly ONE authored vent — class great, its own clock (an anchor: the LOUDEST vent), ${GREAT_GEYSER_CFG.mouth.ventClear} beside the door`,
      vents.length === 1 && vents[0].cls === GREAT_GEYSER_CFG.vent.cls && vents[0].period !== undefined && vents[0].phase !== undefined
      && !vents[0].shared && !!m && Math.abs(d2(vents[0].pos, m.pos) - GREAT_GEYSER_CFG.mouth.ventClear) < 1.5,
      `${vents.length} vents${vents[0] ? `, cls ${vents[0].cls}, period ${vents[0].period?.toFixed(1)}, ${m ? d2(vents[0].pos, m.pos).toFixed(0) : '?'} from the door` : ''}`);
    check(`B4 [${seed}] the vent's clock is a great metronome (period in the authored band)`,
      !!vents[0] && (vents[0].period ?? 0) >= GREAT_GEYSER_CFG.vent.period[0] && (vents[0].period ?? 0) <= GREAT_GEYSER_CFG.vent.period[1]);
    const v = vents[0];
    check(`B5 [${seed}] no spoor piece sits on the vent's seat (bootGeysers' clearSeat finds the mouth disc clear of solids)`,
      !v || out.doodads.every(d => d.kind === MOUTH || !SPOOR.includes(d.kind as string) || d2(d.pos, v.pos) >= 64));
    const again = gen(def, seed);
    check(`B6 [${seed}] determinism: same seed, same door, same spoor, same vent`,
      fp(out.doodads) === fp(again.doodads) && JSON.stringify(out.authoredVents) === JSON.stringify(again.authoredVents));
  }
  check('B7 the registries weave: landmark + mouth rule/visual + sidezone + den tileset + recipe',
    hasLandmark(SITE) && !!DOODAD_VISUALS[MOUTH] && !!sidezoneOf(MOUTH) && sidezoneOf(MOUTH)!.ledgerOnEnter === GREAT_GEYSER_CFG.ledgerEntered
    && !!TILESETS[DEN] && TILESETS[DEN].frontier === false && TILESETS[DEN].perfProbe === true
    && TILESETS[DEN].forceLayout === RECIPE && hasLayout(RECIPE));
}

// ------------------------------------------------------------ C) the recipe --
const denDef = (seed: number, w = 1950, h = 1500): ZoneDef => ({
  id: `probe_den_${seed}_${w}x${h}`, name: 'Probe den', level: 12, seed,
  size: { w, h }, theme: TILESETS[DEN].theme, layout: TILESETS[DEN].layout,
  layoutType: RECIPE, layoutParams: TILESETS[DEN].layoutParams,
  exits: [], map: { x: 2, y: 2 }, objective: { kind: 'boss', id: MAW },
} as unknown as ZoneDef);
const portalsOf = (w: number, h: number): { entry: Vec2; exits: Vec2[] } => ({
  entry: vec(120, h / 2), exits: [vec(w - 120, h / 2), vec(w / 2, 120)],
});
{
  for (const seed of [17, 2024]) {
    const def = denDef(seed);
    const { entry, exits } = portalsOf(def.size.w, def.size.h);
    const a = generateLayout(def, { w: def.size.w, h: def.size.h }, new Rng(seed), entry, exits);
    const plan = VENTCAULDRON_PLANS.get(def.id);
    const wf = a.walk as GridWalkField;
    check(`C1 [${seed}] the cauldron stands: a plan, a grid, no refusal`, !!plan && !plan.refused && wf instanceof GridWalkField, plan?.refused);
    if (!plan || !(wf instanceof GridWalkField)) continue;
    const snap = (p: Vec2): Vec2 => wf.isWalkable(p.x, p.y) ? p : wf.snapToWalkable(p);
    check(`C2 [${seed}] every portal stands on the floor and reaches the heart (the door aprons + corridors)`,
      [entry, ...exits].every(p => wf.isWalkable(p.x, p.y) && wf.reachable(snap(p), plan.heart)));
    check(`C3 [${seed}] the heart vent is authored at the center on a BOSS-TEMPO clock in band, and THE BOSS SEAT stands on it`,
      (a.authoredVents?.length ?? 0) === 1 && a.authoredVents![0].cls === 'great'
      && d2(a.authoredVents![0].pos, plan.heart) < 1 && !!a.bossSeat && d2(a.bossSeat, plan.heart) < 1
      && (a.authoredVents![0].period ?? 0) >= (TILESETS[DEN].layoutParams!.cauldronVentPeriod as number[])[0]
      && (a.authoredVents![0].period ?? 0) <= (TILESETS[DEN].layoutParams!.cauldronVentPeriod as number[])[1],
      `period ${a.authoredVents?.[0]?.period?.toFixed(1)}`);
    const heartClear = (TILESETS[DEN].layoutParams!.cauldronHeartClear as number | undefined) ?? VENTCAULDRON_CFG.heartClear;
    check(`C4 [${seed}] the heart is CLEAR of every planted piece (the maw needs the floor; bootGeysers needs a solid-free mouth)`,
      a.doodads.every(d => d2(d.pos, plan.heart) >= heartClear - d.radius - 1), `${a.doodads.filter(d => d2(d.pos, plan.heart) < heartClear - d.radius - 1).length} intruders`);
    const shelters = a.doodads.filter(d => d.kind === 'sinter_overhang');
    const fOf = (p: Vec2): number => d2(p, plan.heart) / plan.rimAt(Math.atan2(p.y - plan.heart.y, p.x - plan.heart.x));
    check(`C5 [${seed}] shelter overhangs stand on the middle ring (dry seats under the heart vent's rain)`,
      shelters.length >= (TILESETS[DEN].layoutParams!.cauldronShelters as number[])[0]
      && shelters.every(s => fOf(s.pos) >= VENTCAULDRON_CFG.shelters.at[0] - 0.05 && fOf(s.pos) <= VENTCAULDRON_CFG.shelters.at[1] + 0.05),
      `${shelters.length} overhangs`);
    check(`C6 [${seed}] the POIs are the terrace pockets — never the heart — and every pocket is reachable`,
      a.pois.length === plan.pockets.length && a.pois.every(p => d2(p, plan.heart) > heartClear && wf.reachable(snap(entry), snap(p))));
    check(`C7 [${seed}] the floor is the basin: walkable inside the rim, rock beyond (the rim law)`,
      wf.isWalkable(plan.heart.x, plan.heart.y)
      && [0.3, 0.6, 0.85].every(f => [0, 1.3, 2.6, 4].every(th => wf.isWalkable(plan.heart.x + Math.cos(th) * plan.rimAt(th) * f, plan.heart.y + Math.sin(th) * plan.rimAt(th) * f)))
      && !wf.isWalkable(40, 40) && !wf.isWalkable(def.size.w - 40, def.size.h - 40));
    check(`C8 [${seed}] the kit stands in the bowl (pools, terraces, steam) and nothing stands in the rock`,
      a.doodads.some(d => d.kind === 'sulphur_pool') && a.doodads.some(d => d.kind === 'sinter_shelf') && a.doodads.some(d => d.kind === 'steam_pocket')
      && a.doodads.every(d => wf.isWalkable(d.pos.x, d.pos.y)));
    const b = generateLayout(def, { w: def.size.w, h: def.size.h }, new Rng(seed), entry, exits);
    check(`C9 [${seed}] determinism: same seed, the same bowl, the same heart clock`,
      fp(a.doodads) === fp(b.doodads) && JSON.stringify(a.authoredVents) === JSON.stringify(b.authoredVents) && JSON.stringify(a.bossSeat) === JSON.stringify(b.bossSeat));
  }
  // The bare recipe on genqa's own case shape: the generator's defaults stand a basin.
  const bare = {
    id: 'probe_den_bare', name: 'QA ventcauldron', level: 8, size: { w: 2400, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [{ kind: 'rocks', count: [4, 7] }, { kind: 'trees', count: [5, 8] }, { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] }],
    layoutType: RECIPE, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 }, seed: 1000020,
  } as unknown as ZoneDef;
  const { entry, exits } = portalsOf(2400, 1800);
  const out = generateLayout(bare, { w: 2400, h: 1800 }, new Rng(1000020), entry, exits);
  const plan = VENTCAULDRON_PLANS.get(bare.id);
  const wf = out.walk as GridWalkField;
  check('C10 the bare recipe (genqa\'s case shape): a basin, a great heart vent, a boss seat, every portal reaching the heart',
    !!plan && !plan.refused && wf instanceof GridWalkField && (out.authoredVents?.length ?? 0) === 1 && !!out.bossSeat
    && [entry, ...exits].every(p => wf.isWalkable(p.x, p.y) && wf.reachable(p, plan.heart)));
}

// ----------------------------------------------------------- D) the den live --
seedGlobalRandom(0x6e3a);
const world = makeSimWorld('warrior', 880811);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;
const homeId: string = w.zone.id;
const stepAI = (n: number): void => {
  for (let i = 0; i < n; i++) {
    for (const a of w.actors as Actor[]) updateAI(a, world, DT);
    w.update(DT);
  }
};
let maw: Actor | undefined;
let heart: Vec2 | null = null;
{
  w.player.pos = vec(400, 400);
  withSeededRandom(0x6e3b, () => { w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 70707, kind: MOUTH }); });
  // THE RIG HERO IS IRON: a level-1 warrior at the door would die to the
  // maw's first column call, and a dead hero HOLDS the world clock — every
  // later read would sample a stopped beat. Invulnerable (still targetable:
  // the kit keeps casting, the dive still sweeps its telegraphs).
  w.player.invulnerable = true;
  check('D1 the maw door mints the Great Geyser (id + the fixed name + one rung down)',
    w.zone.id === `cave_${MOUTH}_${homeId}_70707` && w.zone.name === GREAT_GEYSER_CFG.name && w.zone.caveDepth >= 1,
    `${w.zone.id} · ${w.zone.name}`);
  check('D2 the den is the bottom (noDeeper), asks for the Geysermaw (boss), wears the den tileset + the cauldron recipe, under OPEN sky',
    w.zone.noDeeper === true && w.zone.objective.kind === 'boss' && w.zone.objective.id === MAW
    && w.zone.tileset === DEN && w.zone.layoutType === RECIPE && w.zone.sky === 'open',
    `tileset ${w.zone.tileset} recipe ${w.zone.layoutType} sky ${w.zone.sky}`);
  check('D3 the gateway ledger stamps on entry (run — merged to the account by the standing law)',
    (w.ledger[GREAT_GEYSER_CFG.ledgerEntered] ?? 0) >= 1);
  const plan = VENTCAULDRON_PLANS.get(w.zone.id);
  heart = plan?.heart ?? null;
  const field = w.geysers;
  const authored = field?.vents[0];
  check('D4 the heart vent stands FIRST in the world\'s field, on a PRIVATE band (the metronome law), at the plan\'s heart, among the floor\'s own vents',
    !!plan && !!field && !!authored && authored.cls === 'great' && d2(authored.pos, plan.heart) < 1
    && authored.band >= field.banding.n && field.vents.length > 1,
    `vents ${field?.vents.length ?? 0}, band ${authored?.band}/${field?.banding.n}`);
  maw = (w.actors as Actor[]).find(a => a.defId === MAW);
  check('D5 the Geysermaw stands IN the vent — spawned on THE BOSS SEAT (the recipe\'s heart), rooted, a boss',
    !!maw && !!heart && d2(maw.pos, heart) < 2 && !!MONSTERS[MAW].boss && maw.stationary === true,
    maw && heart ? `${d2(maw.pos, heart).toFixed(1)} from the heart` : 'no maw');
  const kin = (w.actors as Actor[]).filter(a => a.team === 'enemy' && a.defId !== MAW && !a.tag);
  check('D6 the den fields its packs between beats (the floor stays busy — NO-TAG)', kin.length >= 3, `${kin.length} kin`);
  check('D7 the den\'s fauna rows ride the def (the NEST_FAUNA lesson — the shoal, the newts)',
    Array.isArray(w.zone.fauna) && w.zone.fauna.some((r: { id: string }) => r.id === 'kettle_minnow'));
}

// --------------------------------------------------------- E) THE WINDOW LAW --
{
  const spec = MONSTERS[MAW].ventDweller!;
  const field: GeyserField | null = w.geysers;
  const v: PlacedVent | undefined = field?.vents[0];
  if (!maw || !v || !heart || !field) {
    check('E0 the window law needs the maw, its vent and the heart', false);
  } else {
    const openSec = GEYSER_CFG.classes[v.cls].eruptSec;
    const read0 = ventReadAt(field, v, w.time, w.geyserMode);
    const win = windowOf(read0.period, spec, openSec);
    // THE SEEN COLUMN witness, tracked exactly as the sweep tracks it: the
    // last sample whose read said 'erupt' (a base read's burst is trusted at
    // first sight — the sweep's own first-witness law).
    let seenAt = read0.surge ? -Infinity : w.time - read0.sinceBurst;
    const pureNow = (): { read: ReturnType<typeof ventReadAt>; phase: DwellerPhase } => {
      const read = ventReadAt(field, v, w.time, w.geyserMode);
      if (read.phase === 'erupt') seenAt = w.time;
      return { read, phase: dwellerPhaseAt(read, spec, openSec, { columnSeenAt: seenAt, now: w.time }) };
    };
    // Sample a full period and a half through the live loop (AI + world):
    // every sample compares the worn state to the pure resolver. The sweep
    // runs every sweepEvery, so the samples inside one sweep grain after a
    // pure flip are GRACE (the worn state lags by at most that grain).
    const GRACE = Math.ceil(VENT_DWELLER_CFG.sweepEvery / DT) + 1;
    let samples = 0, agree = 0, sawUnder = false, sawUp = false, sawSink = false, breaches = 0, pinnedUnder = true, columnUp = false;
    let lastPhase: DwellerPhase | null = null, sinceFlip = 0; // primed at 0: the first sweep has not run yet
    const stretches: { len: number; upSec: number }[] = [];
    let curLen = 0, curUp = 0, curWhole = false; // a stretch counts only if its OPENING was seen (the sample may start mid-window)
    const total = Math.ceil((read0.period * 1.5) / DT);
    for (let i = 0; i < total; i++) {
      stepAI(1);
      const { read, phase } = pureNow();
      const under = phase === 'under';
      const concealed = has(maw, VENT_DWELLER_CFG.submergedStatus);
      const sinking = has(maw, VENT_DWELLER_CFG.sinkingStatus);
      if (lastPhase !== null && lastPhase !== phase) sinceFlip = 0; else sinceFlip++;
      if (sinceFlip >= GRACE) {
        samples++;
        const ok = under
          ? (concealed && maw.untargetable && maw.invulnerable && !sinking)
          : (!concealed && !maw.untargetable && !maw.invulnerable && (sinking === (phase === 'sinking')));
        if (ok) agree++;
        if (under && d2(maw.pos, v.pos) > 0.5) pinnedUnder = false;
        if (!under && read.phase === 'erupt') columnUp = true;
      }
      if (!under) {
        if (curLen === 0) curWhole = lastPhase === 'under';
        curLen += DT; curUp = windowOf(read.period, spec, openSec).upSec;
      } else if (curLen > 0) {
        if (curWhole) stretches.push({ len: curLen, upSec: curUp });
        curLen = 0;
      }
      if (under) sawUnder = true; else if (phase === 'up') sawUp = true; else sawSink = true;
      if (lastPhase === 'under' && phase !== 'under') breaches++;
      lastPhase = phase;
    }
    check('E1 drawn == tested: at every sample the worn state EQUALS the pure resolver (under ⇔ concealed + untargetable + invulnerable; up ⇔ a body; sinking ⇔ the ghost tell)',
      samples > 0 && agree === samples, `${agree}/${samples}`);
    check('E2 the cycle was seen whole: under, up and sinking all stood, and at least one BREACH flipped it up', sawUnder && sawUp && sawSink && breaches >= 1, `breaches ${breaches}`);
    check('E3 submerged, the maw is PINNED to the mouth (a shove while under moves nothing)', pinnedUnder);
    check('E4 the window opens only after the column clears — the maw never rides its own live column', !columnUp);
    check(`E5 every whole window seen lasts its spec (≈ windowOf(period).upSec — ${win.upSec.toFixed(1)}s on the den's base clock)`,
      stretches.length >= 1 && stretches.every(s => Math.abs(s.len - s.upSec) < 0.35),
      stretches.map(s => `${s.len.toFixed(2)}/${s.upSec.toFixed(2)}`).join(' '));
    // THE TWO-WAY HIT TEST: walk the clock to the middle of the under stretch,
    // then to the middle of the window, and try to hurt it each time.
    const toPhase = (want: DwellerPhase, mid = 0.5): boolean => {
      for (let i = 0; i < Math.ceil(read0.period * 2 / DT); i++) {
        const { read, phase: ph } = pureNow();
        if (ph === want) {
          const w2 = windowOf(read.period, spec, openSec);
          const t = read.sinceBurst - w2.openSec;
          const inMid = want === 'under'
            ? (t < 0 ? (-t > 1.5) : (t - w2.upSec > 1.5 && read.toBurst > 2.5))
            : (t > w2.upSec * mid * 0.5);
          if (inMid) { stepAI(GRACE); return true; }
        }
        stepAI(1);
      }
      return false;
    };
    const reachedUnder = toPhase('under');
    const lifeU = maw.life;
    const dotU = applyDot(maw, 25, 'fire');
    check('E6 UNDER: a DoT is refused (invulnerable — 0 applied), life untouched, the body unseen (concealed) and untargetable',
      reachedUnder && dotU === 0 && Math.abs(maw.life - lifeU) < 1e-6 && maw.untargetable && has(maw, VENT_DWELLER_CFG.submergedStatus),
      `reached ${reachedUnder}, dot ${dotU}, untargetable ${maw.untargetable}, submerged ${has(maw, VENT_DWELLER_CFG.submergedStatus)}`);
    // its clock is the VENT's: jump the world clock and the phase re-derives
    // within a sweep (no own timer — a resume re-reads the ordinal). The
    // jump lands mid-stretch (never within a grain of a flip) so the pure
    // answer and the worn answer are unambiguous.
    let jump = read0.period * 0.37;
    for (let k = 0; k < 40; k++) {
      const r = ventReadAt(field, v, w.time + jump, w.geyserMode);
      const t = r.sinceBurst - openSec;
      const wj = windowOf(r.period, spec, openSec);
      const edgeNear = Math.min(Math.abs(t), Math.abs(t - wj.upSec), Math.abs(t - (wj.upSec - wj.sinkSec)), r.toBurst + openSec) < 0.6;
      if (!edgeNear) break;
      jump += 0.5;
    }
    const jumpRead = ventReadAt(field, v, w.time + jump, w.geyserMode);
    w.time += jump;
    stepAI(GRACE + 1);
    const seenJump = jumpRead.phase === 'erupt' ? w.time : seenAt;
    const jumpPhase = dwellerPhaseAt(jumpRead, spec, openSec, { columnSeenAt: seenJump, now: w.time });
    const wornAfter: DwellerPhase = has(maw, VENT_DWELLER_CFG.submergedStatus) ? 'under' : has(maw, VENT_DWELLER_CFG.sinkingStatus) ? 'sinking' : 'up';
    check('E7 its clock IS the vent\'s: a jumped clock re-derives the phase within a sweep (no own timer)', wornAfter === jumpPhase,
      `${wornAfter} vs ${jumpPhase} (jump ${jump.toFixed(1)}s, sinceBurst ${jumpRead.sinceBurst.toFixed(1)}, surge ${jumpRead.surge})`);
    // the A/B lever moves nothing on an authored anchor (both clocks agree)
    const readB = ventReadAt(field, v, w.time, 'bands'), readS = ventReadAt(field, v, w.time, 'solo');
    check('E8 the A/B lever moves nothing on the authored heart vent (bands == solo on an anchor — the metronome law)',
      Math.abs(readB.sinceBurst - readS.sinceBurst) < 1e-6 && readB.period === readS.period);
    toPhase('up');
    const lifeA = maw.life;
    const dotA = applyDot(maw, 25, 'fire');
    check('E9 UP: the same DoT LANDS (a body), life falls, targetable and drawn',
      dotA > 0 && maw.life < lifeA && !maw.untargetable && !maw.invulnerable && !has(maw, VENT_DWELLER_CFG.submergedStatus),
      `dot ${dotA.toFixed(1)}, life ${lifeA.toFixed(0)} → ${maw.life.toFixed(0)}`);
    maw.life = maw.maxLife();
    check('E10 the maw\'s kit fires only while up: under, its clock is stopped (timeScale 0 — no thinking, no casting)',
      (STATUS_DEFS[VENT_DWELLER_CFG.submergedStatus].timeScale ?? 1) === 0 && !!STATUS_DEFS[VENT_DWELLER_CFG.submergedStatus].conceals
      && (STATUS_DEFS[VENT_DWELLER_CFG.sinkingStatus].ghostAlpha ?? 1) < 1);
    const tw = dwellerToWindow(read0, spec, openSec);
    check('E11 the readout: seconds-to-window reads 0 inside the window and ≤ a period outside it', tw >= 0 && tw <= read0.period + openSec + 1e-6, `${tw.toFixed(1)}s`);
  }
}

// ----------------------------------------------------------- F) NO-TAG LAW --
{
  const spec = MONSTERS[MAW].ventDweller!;
  const C = VENT_DWELLER_CFG;
  const den = windowOf(38, spec, GEYSER_CFG.classes.great.eruptSec);
  check('F1 the den\'s beat: a 38s vent keeps the window at the authored upSec and the maw under ≤ the ceiling',
    Math.abs(den.upSec - spec.upSec) < 1e-6 && den.underSec <= C.maxUnderSec && den.underSec >= C.minUnderSec, JSON.stringify(den));
  const slow = windowOf(110, spec, GEYSER_CFG.classes.great.eruptSec);
  check('F2 a SLOW vent (110s) stretches the WINDOW, never the silence: under == the ceiling, and lint names the stretch',
    Math.abs(slow.underSec - C.maxUnderSec) < 1e-6 && slow.upSec > spec.upSec
    && lintVentDweller(spec, 110, 'probe').some(g => /NO-TAG ceiling/.test(g)));
  const fast = windowOf(8, spec, 0.6);
  check('F3 a FAST vent (8s): the window CLOSES (up < period, a real under stretch) and lint names the clip',
    fast.upSec < 8 && fast.underSec >= C.minUnderSec * 0.5 && lintVentDweller(spec, 8, 'probe').some(g => /CLOSES/.test(g)));
  const band = TILESETS[DEN].layoutParams!.cauldronVentPeriod as number[];
  check('F4 the den tileset\'s authored period band keeps the maw under ≤ the ceiling at its slowest (no stretch needed — the beat is readable as authored)',
    lintVentDweller(spec, band[1], 'den', GEYSER_CFG.classes.great.eruptSec).length === 0 && band[1] - spec.upSec <= C.maxUnderSec, `band ${band}`);
  check('F5 the sinking tell never eats more than its share of the window',
    den.sinkSec <= den.upSec * C.sinkShareMax + 1e-6 && den.sinkSec > 0);
}

// --------------------------------------------------- G) the ledger + the ask --
{
  if (!maw) {
    check('G0 the ledger rig needs the maw', false);
  } else {
    const runBefore = w.ledger[GREAT_GEYSER_CFG.ledgerSlain] ?? 0;
    const accBefore = w.account.ledger[GREAT_GEYSER_CFG.ledgerSlain] ?? 0;
    w.kill(maw, false, w.player);
    stepAI(12);
    check('G1 the maw falls → geysermaw_slain stamps the RUN ledger and the ACCOUNT ledger (knowledge that outlives the run)',
      (w.ledger[GREAT_GEYSER_CFG.ledgerSlain] ?? 0) === runBefore + 1 && (w.account.ledger[GREAT_GEYSER_CFG.ledgerSlain] ?? 0) === accBefore + 1,
      `run ${w.ledger[GREAT_GEYSER_CFG.ledgerSlain]}, account ${w.account.ledger[GREAT_GEYSER_CFG.ledgerSlain]}`);
    check('G2 the boss ask completes (objectiveDone — the den\'s exits unseal)', w.objectiveDone === true);
    check('G3 the kill rule is registered by id (geysermaw_fall)', killRules().some(r => r.id === 'geysermaw_fall'));
  }
  w.loadZone(homeId);
  w.caveReturn = null;
  w.caveStack = [];
}

// ------------------------------------------------------------- H) the nets --
{
  const def = MONSTERS[MAW];
  check('H1 kit: every maw skill exists, carries an ai hint, and is affordable from its own mana',
    def.skills.every(id => !!SKILLS[id] && !!SKILLS[id].ai && (SKILLS[id].manaCost ?? 0) <= (def.base.mana ?? 0)),
    def.skills.map(id => `${id}:${SKILLS[id]?.manaCost ?? '?'}`).join(' '));
  check('H2 kit: the column is the shaman\'s vent-call at boss scale (an atEnemies storm with an honest telegraph), the spray a scatter of droplets',
    SKILLS.geysermaw_column?.delivery.type === 'storm' && (SKILLS.geysermaw_column.delivery as { atEnemies?: true }).atEnemies === true
    && ((SKILLS.geysermaw_column.delivery as { telegraph?: number }).telegraph ?? 0) >= 1
    && SKILLS.geysermaw_spray?.delivery.type === 'storm' && (SKILLS.geysermaw_spray.delivery as { count: [number, number] }).count[0] >= 4);
  check('H3 the maw is a den boss (boss, lair_hoard, rooted, geyserkin — diplomacy-silent), never a world boss',
    def.boss === true && def.loot === 'lair_hoard' && def.base.moveSpeed === 0 && def.faction === 'geyserkin' && !def.bossBar);
  check('H4 look: every part of the geysermaw look resolves to a painter',
    !!LOOKS[def.look!] && LOOKS[def.look!].parts.every(p => !!PART_PAINTERS[p.kind]) && (LOOKS[def.look!].live ?? []).every(p => !!PART_PAINTERS[p.kind]));
  const faults = validateTells({ [MAW]: def }, PART_PAINTERS);
  check('H5 tells: the sinking tell validates and reads the worn state (status:vent_sinking — drawn == tested)',
    faults.length === 0 && !!def.tells?.length && def.tells.every(t => t.source === `status:${VENT_DWELLER_CFG.sinkingStatus}`), faults.join('; '));
  check('H6 statuses: vent_submerged (timeScale 0, conceals, beneficial) + vent_sinking (ghosted, beneficial) stand',
    STATUS_DEFS.vent_submerged?.timeScale === 0 && STATUS_DEFS.vent_submerged.conceals === true && STATUS_DEFS.vent_submerged.beneficial === true
    && (STATUS_DEFS.vent_sinking?.ghostAlpha ?? 1) < 1 && STATUS_DEFS.vent_sinking.beneficial === true);
  check('H7 visuals: the maw door wears the caveMouth painter; the den tileset keeps heat + haze + its own beat row',
    DOODAD_VISUALS[MOUTH]?.painter === 'caveMouth' && TILESETS[DEN].theme.heat === 1
    && !!TILESETS[DEN].theme.ambientFx?.some(f => f.kind === 'heatHaze') && !!TILESETS[DEN].theme.geysers);
  // THE OMINOUS LINE: only charted ground whose mint SEATED the roll murmurs.
  const w2 = makeSimWorld('warrior', 5151);
  const z = w2.zone;
  const fake = { ...z, id: 'probe_scald_seat', landmarks: [{ landmark: SITE, chance: 0.14 }] } as ZoneDef;
  const plain = { ...z, id: 'probe_scald_plain', landmarks: [] } as ZoneDef;
  w2.zoneMap[fake.id] = fake; w2.zoneMap[plain.id] = plain;
  w2.visited.add(fake.id); w2.visited.add(plain.id);
  const seated = zoneInfoFor(w2, fake.id).some(r => /louder beat/.test(r.label));
  const uncharted = zoneInfoFor(w2, plain.id).some(r => /louder beat/.test(r.label));
  const veiled = { ...fake, id: 'probe_scald_veiled' } as ZoneDef;
  w2.zoneMap[veiled.id] = veiled;
  const hidden = zoneInfoFor(w2, veiled.id).some(r => /louder beat/.test(r.label));
  check('H8 the ominous line murmurs on charted ground that seated the roll — and nowhere else (no map mark, no node)',
    seated && !uncharted && !hidden);
  check('H9 the dweller fabric\'s dials are physical (cadence, reach, ceiling > min, statuses named)',
    VENT_DWELLER_CFG.sweepEvery > 0 && VENT_DWELLER_CFG.homeReach > 0 && VENT_DWELLER_CFG.maxUnderSec > VENT_DWELLER_CFG.minUnderSec
    && VENT_DWELLER_CFG.minUpSec > 0 && !!STATUS_DEFS[VENT_DWELLER_CFG.submergedStatus] && !!STATUS_DEFS[VENT_DWELLER_CFG.sinkingStatus]);
}

console.log(failed ? `\nprobe_den: ${failed} FAILURE(S)` : '\nprobe_den: ALL PASS');
process.exit(failed ? 1 : 0);
