// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SCALD BASIN M2b: THE CHAR'S TEETH + THE DOWNSTREAM
// BLEND + FAUNA WAVE 2, end to end on the real registries and the real
// engine (charter docs/design/scald-basin.md §4 / §5 / §8 / §8b / §13 M2;
// kit data/scald.ts; docs docs/engine/scald.md + geysers.md + creep.md). Pins:
//   A  THE IGNITION DIAL (card 8): authored ONLY on the Char's lane rows
//      (FrontSpawnRow.ignition) — every other wildfire lane in the game
//      carries none; the shipped wildfire row's numbers untouched; LIVE:
//      with no lit lane the hero's fire volley into fuel ignites NOTHING
//      (the global default-off, structural — `ignitable` false); a lit lane
//      births a section of the SAME row under sustained fire, capped at its
//      max; no fuel under the blast → no fire.
//   B  THE ESCAPE SEAM (heels): fieldHeels fields only heels lanes, as a
//      picket centred on the point marching the bearing, lane ledger kept;
//      LIVE: a Char zone re-entered under an 'escape' objective stands its
//      chase at the party's heels, marching the way in.
//   C  CINDERWIND: born over hot ∧ low ∧ the dry flank; sparse strike row
//      through the shared machinery; ember-litter dress; a particle look;
//      the Char's cinderwind lane gated on the weather and LEANING UP
//      (shorter delay/waves, easier ignition); LIVE: without the weather the
//      gated lane fields nothing while the standing lane is still due.
//   D  THE REGROWTH CYCLE: ash → flush → meadow on the age clock (runtime
//      stamps off laidAt, authored ground off the zone's charBorn), the
//      fire-followers standing up as kindling through the evap fabric; a
//      zone without the theme opt-in keeps its ash (absent == identical);
//      LIVE: a walked Char zone is visibly further along when you return
//      (ZoneMemory.charBorn survives the leaving).
//   E  THE BURN RAIN (card 2): great vents ONLY (a lesser class asking is
//      refused; a geyser-class burst lands no teeth); the fan is a pure
//      hash; LIVE: the landings arrive ~rainDelay after the column, wound
//      the unroofed (the hero too — faction-blind), SPARE a body under a
//      sinter overhang (DoodadRule.shelter → spareRoofed) and a dormant
//      sleeper, feed the scorch bar, and pock the ground.
//   F  THE RUNOFF (card 2): born at the burst on the vent's SPILL SIDE (pure
//      per seat — the same side every beat), a finite run that travels and
//      disperses, stamps an evaporating scald sheen, scalds + warms what it
//      crosses.
//   G  THE WARM HATCH: a brood clutch laid through the real skill pipeline
//      hatches EARLY the moment its scorch bar reaches the row's threshold
//      (the rain/runoff/column seam — one seam), an unfed clutch waits.
//   H  THE LAMPREY: latches + gnaws fire; shaken off it FLOPS (the longer
//      re-latch wait, the tossed seat, the flop status worn for the window).
//   I  THE PRISM SNAIL re-tunes to the blow's tone and pulses it back.
//   J  THE NO-TAG LAW on the shelf debuts: the opportunist's locked ceiling
//      (it converges against a healthy hero by the clock), the wallow's
//      DOOR (it settles when you step out of reach, rises when you return),
//      the shoal's tide-locked frenzy (placid → frenzy on the scald → placid).
//   K  THE NETS: looks/tells/skills/status/visual rows for every new kind.
// Run: npx tsx balance/probe_char.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { CREEPS, CREEP_CFG, type FrontSpawnRow } from '../src/engine/creep';
import {
  GEYSER_CFG, cometFanOf, rainFanOf, resolveDownstream, spillBearing, ventDownstream, ventReadAt, ventSpill,
  type GeyserField, type PlacedVent,
} from '../src/engine/geysers';
import { CLING_CFG } from '../src/engine/cling';
import { updateAI } from '../src/engine/ai';
import { STATUS_DEFS } from '../src/engine/status';
import { makeSkillInstance } from '../src/engine/skills';
import { doodadRuleOf, hasDoodadRule, type Doodad } from '../src/engine/levelgen';
import { validateTells } from '../src/engine/tells';
import { regionKind } from '../src/world/regions';
import { WEATHER_DEFS } from '../src/world/weather';
import { SKILLS } from '../src/data/skills';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS, WILDLIFE } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { REGROWTH_CFG, SCALD_CFG } from '../src/data/scald';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { STATUS_FX_REGISTRY } from '../src/render/screenFx';
import { WEATHER_FX } from '../src/render/vis/weatherFx';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const DT = 1 / 60;
const step = (w: World, n: number): void => { for (let i = 0; i < n; i++) w.update(DT); };
/** THE HOST FRAME LOOP verbatim (the AI is caller-driven: updateAI per actor,
 *  then the world) — the rigs whose bodies must THINK step through this. */
const stepAI = (w: World, n: number): void => {
  for (let i = 0; i < n; i++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
const has = (a: Actor, id: string): boolean => a.statuses.some(s => s.id === id);
const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
const KIN = ['brood_matron', 'scald_spawn', 'vent_lamprey', 'prism_snail', 'scald_wallower', 'kettle_minnow', 'cinder_jackal'];
const NEW_KINDS = ['scald_sheen', 'regrowth_flush', 'regrowth_meadow', 'fireweed', 'ember_litter', 'sinter_overhang'];

/** A stationary body (anchored: the AI never walks it; every hazard still
 *  lands) — the rain/runoff rigs need bodies that stay on their marks. */
const dummy = (w: World, id: string, at: { x: number; y: number }, prep?: (m: Actor) => void): Actor => {
  const m = w.createMonster(id, 3, 'enemy');
  m.pos = vec(at.x, at.y);
  m.anchored = true;
  prep?.(m);
  w.actors.push(m);
  return m;
};
/** A hand-built field (the M0 probe's idiom) — the fabric reads whatever stands. */
const mkField = (vent: PlacedVent, period: number): GeyserField =>
  ({ banding: { theta: 0, stripeW: 560, wobbleSeed: 1, n: 1 }, bands: [{ period, phase: 0 }], vents: [vent] });
/** The hero's volley into a point — through the REAL cast pipeline
 *  (useSkill → the delivery → its blast site → frontSplash, the ignition
 *  tap's door — ground/area verbs splash the skin; a single-target bolt
 *  never does, by the quench seam's own law). */
const volley = (w: World, at: { x: number; y: number }, n: number, skillId = 'firebolt'): void => {
  const inst = makeSkillInstance(SKILLS[skillId], 6);
  for (let i = 0; i < n; i++) {
    w.player.mana = 500;
    w.useSkill(w.player, inst, vec(at.x, at.y));
    step(w, 30);
  }
  step(w, 90);
};
/** A GROUND fire verb for the ignition rigs (a blast site on the fuel —
 *  the burn rain's own droplet, cast by a hand for the probe's sake). */
const FIRE_GROUND = 'scald_rain_drop';

// ------------------------------------------------------ A) the ignition dial --
{
  const fronts = (TILESETS.char_reach.theme.creep?.fronts ?? []) as readonly FrontSpawnRow[];
  check('A1 data: the Char carries lit wildfire lanes (FrontSpawnRow.ignition), a heels lane, and the cinderwind lane',
    fronts.some(f => f.id === 'wildfire' && !!f.ignition) && fronts.some(f => f.heels)
    && fronts.some(f => f.when?.weather?.includes('cinderwind')));
  let foreign = 0, foreignHeels = 0;
  for (const t of Object.values(TILESETS)) {
    if (t.id === 'char_reach') continue;
    for (const f of t.theme.creep?.fronts ?? []) { if (f.ignition) foreign++; if (f.heels) foreignHeels++; }
    for (const v of t.variants ?? []) for (const f of v.theme?.creep?.fronts ?? []) { if (f.ignition) foreign++; if (f.heels) foreignHeels++; }
  }
  check('A2 data: NO other tileset lane carries the dial — the global default stays OFF (card 8: Char-only authoring)',
    foreign === 0 && foreignHeels === 0, `foreign ignition ${foreign}, heels ${foreignHeels}`);
  const wf = CREEPS.wildfire.front!;
  check('A3 data: the shipped wildfire row is UNTOUCHED (quench 420 / feed 900 / ashfield 0.4 — not re-tuned)',
    wf.quench?.power === 420 && wf.feed?.power === 900 && wf.affinity?.ground?.ashfield === 0.4 && !('ignition' in wf));
  const fuels = wf.consume?.map(c => c.fuel) ?? [];
  check('A4 data: the dial lights the row\'s OWN fuels (kindling + timber — what the fire eats is what it starts on)',
    fuels.includes('kindling') && fuels.includes('timber')
    && doodadRuleOf('grass').fuel === 'kindling' && doodadRuleOf('dead_tree').fuel === 'timber');
  // LIVE: the default-off seam. No lit lane → the hero's sustained fire
  // into a fueled patch births nothing, through the real cast pipeline.
  seedGlobalRandom(0xc4a1);
  const w = makeSimWorld('warrior', 0xc4a1);
  const field = w.creepEnsure()!;
  const FUEL = vec(1200, 900);
  w.doodads.push({ pos: vec(FUEL.x, FUEL.y), radius: 34, kind: 'grass' } as Doodad);
  w.markDoodadsChanged();
  w.player.pos = vec(FUEL.x - 200, FUEL.y);
  volley(w, FUEL, 8, FIRE_GROUND);
  check('A5 live: with NO lit lane the field is not ignitable and a fire volley into kindling births NOTHING',
    field.ignitable === false && field.sources.length === 0, `sources ${field.sources.length}`);
  // The dial opens the seam: a lit lane (its own wave held off — delay 999).
  field.installLanes([{ id: 'wildfire', delay: [999, 999], ignition: { power: 40, max: 2, cooldown: 0.3 } }]);
  check('A6 live: installing a lit lane arms the tap (ignitable) without fielding a wave', field.ignitable && field.sources.length === 0);
  volley(w, FUEL, 10, FIRE_GROUND);
  const lit = field.sources.filter(s => s.def.id === 'wildfire' && s.front?.ignited);
  check('A7 live: sustained fire into the fuel BIRTHS a wildfire section of the same row (ignited, marching)',
    lit.length >= 1 && lit.every(s => s.def === CREEPS.wildfire && !!s.front), `ignited ${lit.length}`);
  volley(w, FUEL, 14, FIRE_GROUND);
  const lit2 = field.sources.filter(s => s.def.id === 'wildfire' && s.front?.ignited && s.state !== 'recede');
  check('A8 live: the concurrent cap holds — never more than max ignited sections alive', lit2.length <= 2, `alive ${lit2.length}`);
  // No fuel under the blast → no fire (a bare patch of floor, far from the grass).
  const w2 = makeSimWorld('warrior', 0xc4a2);
  const f2 = w2.creepEnsure()!;
  f2.installLanes([{ id: 'wildfire', delay: [999, 999], ignition: { power: 40, max: 2, cooldown: 0.3 } }]);
  w2.player.pos = vec(700, 700);
  volley(w2, vec(900, 700), 10, FIRE_GROUND);
  check('A9 live: fire into BARE ground (no fuel near the blast) ignites nothing', f2.sources.length === 0);
}

// --------------------------------------------------------- B) the escape seam --
{
  seedGlobalRandom(0xe5c1);
  const w = makeSimWorld('warrior', 0xe5c1);
  const field = w.creepEnsure()!;
  field.installLanes([
    { id: 'wildfire', heels: true, line: [2, 2], delay: [999, 999] },
    { id: 'wildfire', delay: [999, 999] },
  ]);
  const n = field.fieldHeels(600, 600, 0);
  const srcs = field.sources;
  check('B1 field: fieldHeels fields the heels lane ONLY — a picket of its line, the other lane untouched',
    n === 2 && srcs.length === 2 && srcs.every(s => s.front?.rowIdx === 0), `fielded ${n}, sources ${srcs.length}`);
  check('B2 field: the picket is centred on the point and marches the bearing',
    srcs.every(s => Math.abs(s.pos.x - 600) < 2 && (s.front?.dx ?? 0) > 0.95) && srcs.some(s => s.pos.y < 600) && srcs.some(s => s.pos.y > 600));
  const again = field.fieldHeels(600, 600, 0);
  check('B3 field: a spent heels lane fields no second heel wave (the ledger holds)', again === 0 && field.sources.length === 2);
  // LIVE: a Char zone re-entered under 'escape' stands its chase at the heels.
  const w3 = makeSimWorld('warrior', 0xe5c3);
  let a = '', b = '';
  withSeededRandom(0xe5c4, () => {
    a = w3.devMintTileset('char_reach', 0.5, 8, { seed: 9101 }) ?? '';
    b = w3.devMintTileset('char_reach', 1.5, 8, { seed: 9102 }) ?? '';
  });
  const defA = w3.zoneMap[a];
  check('B4 live: two Char zones minted through the real path', !!a && !!b && !!defA && w3.zone.id === b);
  if (defA) {
    defA.objective = { kind: 'escape', interval: [3, 5] };
    withSeededRandom(0xe5c5, () => w3.loadZone(a, b));
    const p = w3.player;
    const cx = w3.arena.w / 2, cy = w3.arena.h / 2;
    const toHeart = Math.atan2(cy - p.pos.y, cx - p.pos.x);
    const chase = (w3.creep?.sources ?? []).filter(s => s.def.id === 'wildfire' && s.front?.rowIdx === 0);
    const behind = chase.filter(s => {
      const dd = d2(s.pos, p.pos);
      const dot = Math.cos(toHeart) * (s.front!.dx) + Math.sin(toHeart) * (s.front!.dy);
      return dd > 60 && dd < 520 && dot > 0.7;
    });
    check('B5 live: re-entered under ESCAPE, the Char stands its wildfire at the party\'s heels, marching the way in',
      w3.zone.id === a && w3.zone.objective.kind === 'escape' && chase.length >= 2 && behind.length === chase.length,
      `sections ${chase.length}, behind+inbound ${behind.length}`);
  }
}

// ------------------------------------------------------------ C) cinderwind --
{
  const cw = WEATHER_DEFS.cinderwind;
  check('C1 weather: cinderwind registered — born over HOT ∧ LOW ∧ the basin\'s DRY FLANK (a moisture band, not the wet heart)',
    !!cw && (cw.birthGeo?.temperature?.min ?? 0) >= 0.5 && (cw.birthGeo?.elevation?.max ?? 1) <= 0.55
    && cw.birthGeo?.moisture?.max !== undefined && cw.birthGeo.moisture.max <= 0.6
    && cw.birthGeo.moisture.min !== undefined && cw.birthGeo.moisture.max < (WEATHER_DEFS.scald_mist.lingerGeo?.moisture?.min ?? 0) + 0.1
    && !!cw.skyWeight && (cw.wind ?? 0) >= 0.6);
  check('C2 weather: a SPARSE strike row through the shared machinery (cinder_fall — a ground blast, roofs shelter)',
    !!cw?.strike && cw.strike.ratePerSec <= 0.2 && !!SKILLS[cw.strike.skillId] && SKILLS[cw.strike.skillId].delivery.type === 'ground'
    && !cw.strike.throughRoofs);
  check('C3 weather: dress rows of ember litter that evap (a ruled kind with a visuals row; NOT fuel — embers already burned)',
    !!cw?.dress?.rows.some(r => r.doodad === 'ember_litter') && hasDoodadRule('ember_litter') && !!DOODAD_VISUALS.ember_litter
    && doodadRuleOf('ember_litter').fuel === undefined);
  check('C4 weather: a particle look (ember streaks on the wind)', !!WEATHER_FX.cinderwind && WEATHER_FX.cinderwind.form === 'streak');
  const fronts = (TILESETS.char_reach.theme.creep?.fronts ?? []) as readonly FrontSpawnRow[];
  const standing = fronts.find(f => !f.when);
  const windy = fronts.find(f => f.when?.weather?.includes('cinderwind'));
  check('C5 lean: under cinderwind the Char\'s fronts come sooner, wider and light easier (the gated lane vs the standing lane)',
    !!standing && !!windy && (windy.delay?.[1] ?? 99) < (standing.delay?.[0] ?? 0)
    && (windy.waves?.[1] ?? 99) < (standing.waves?.[0] ?? 0)
    && (windy.line as number[])[1] >= (standing.line as number[])[1]
    && (windy.ignition?.power ?? 0) < (standing.ignition?.power ?? 0) && (windy.ignition?.max ?? 0) >= (standing.ignition?.max ?? 0));
  // LIVE: no cinderwind over a fresh Char zone → the gated lane WAITS at the
  // door (lane index 1) while the standing lane is not yet due either.
  seedGlobalRandom(0xc1d3);
  const w = makeSimWorld('warrior', 0xc1d3);
  withSeededRandom(0xc1d4, () => w.devMintTileset('char_reach', 0.5, 8, { seed: 4711 }));
  check('C6 live: the Char mints with both lanes installed (the field stands, ignitable)',
    !!w.creep && w.creep.laneCount() === 2 && w.creep.ignitable, `lanes ${w.creep?.laneCount()}`);
  check('C7 live: no cinderwind over the zone right now', !w.radianceCondHeld({ weather: ['cinderwind'] }));
  step(w, 16 * 60);
  const gated = (w.creep?.sources ?? []).filter(s => s.front?.rowIdx === 1);
  check('C8 live: sixteen seconds in, the cinderwind lane has fielded NOTHING (its door is the weather)', gated.length === 0, `gated sections ${gated.length}`);
}

// ------------------------------------------------------- D) the regrowth cycle --
{
  for (const k of ['regrowth_flush', 'regrowth_meadow', 'scald_sheen']) {
    check(`D1 row: '${k}' is a walkable region kind with a rule + a visuals row`,
      !!regionKind(k)?.walkable && hasDoodadRule(k) && !!DOODAD_VISUALS[k]);
  }
  check('D2 row: fireweed is kindling FUEL with a visuals row (the cycle\'s fuel half); ashfield has an authored stamp now',
    doodadRuleOf('fireweed').fuel === 'kindling' && !!DOODAD_VISUALS.fireweed
    && TILESETS.char_reach.layout.some(r => r.kind === 'ashfield') && TILESETS.char_reach.theme.regrowth === true);
  check('D3 cfg: the stages are ordered and minutes-grade', REGROWTH_CFG.flushAfter > 30 && REGROWTH_CFG.meadowAfter > REGROWTH_CFG.flushAfter);
  // absent == identical: the sim arena (no theme opt-in) keeps its ash.
  seedGlobalRandom(0x5e9);
  const w0 = makeSimWorld('warrior', 0x5e9);
  const ash0: Doodad = { pos: vec(800, 800), radius: 50, kind: 'ashfield', laidAt: w0.time - 1000 } as Doodad;
  w0.doodads.push(ash0); w0.markDoodadsChanged();
  step(w0, 6 * 60);
  check('D4 live: a zone WITHOUT ZoneTheme.regrowth keeps its ash (absent == identical)', ash0.kind === 'ashfield');
  // The Char: runtime ash ages off laidAt; authored ash off the zone clock.
  const w = makeSimWorld('warrior', 0x5ea);
  withSeededRandom(0x5eb, () => w.devMintTileset('char_reach', 0.5, 8, { seed: 2718 }));
  const ash1: Doodad = { pos: vec(900, 900), radius: 50, kind: 'ashfield', laidAt: w.time - 200 } as Doodad;
  const ash2: Doodad = { pos: vec(1300, 900), radius: 50, kind: 'ashfield', laidAt: w.time - 1000 } as Doodad;
  const authored = w.doodads.find(d => d.kind === 'ashfield' && d.laidAt === undefined);
  w.doodads.push(ash1, ash2); w.markDoodadsChanged();
  const floraBefore = w.doodads.filter(d => d.kind === 'fireweed').length;
  step(w, 6 * 60);
  check('D5 live: runtime ash older than flushAfter relaxes to THE GREEN FLUSH (the kind swapped in place)', ash1.kind === 'regrowth_flush', ash1.kind);
  check('D6 live: ash older than meadowAfter walks flush → MEADOW, fire-followers standing up around it on the evap fabric',
    ash2.kind === 'regrowth_meadow'
    && w.doodads.some(d => d.kind === 'fireweed' && d.evap && d2(d.pos, ash2.pos) <= ash2.radius),
    `kind ${ash2.kind}, fireweed ${w.doodads.filter(d => d.kind === 'fireweed').length - floraBefore} new`);
  check('D7 live: AUTHORED ash (no laidAt) ages off the zone\'s own clock — still ash seconds after the mint',
    !!authored && authored.kind === 'ashfield');
  // THE MEMORY: leave, let the world turn, return — the authored ash is older.
  const zid = w.zone.id;
  withSeededRandom(0x5ec, () => w.devMintTileset('geyser_fields', 1.5, 8, { seed: 2719 }));
  const elsewhere = w.zone.id;
  w.time += REGROWTH_CFG.flushAfter + 40; // the world keeps counting while you are away
  withSeededRandom(0x5ed, () => w.loadZone(zid, elsewhere));
  const back = w.doodads.filter(d => d.kind === 'ashfield' && d.laidAt === undefined);
  step(w, 4 * 60);
  const relaxed = back.filter(d => d.kind !== 'ashfield').length;
  check('D8 live: a walked Char zone is visibly FURTHER ALONG when you return (charBorn survives the leaving)',
    w.zone.id === zid && back.length > 0 && relaxed > 0, `${relaxed}/${back.length} authored pieces relaxed`);
}

// ------------------------------------------------------------ E) the burn rain --
{
  check('E1 law: rain is the GREAT vents\' privilege — a lesser class asking is refused; spectacle is documentary (show)',
    resolveDownstream('great').rain && !resolveDownstream('geyser').rain && !resolveDownstream('hiss', { rain: true }).rain
    && resolveDownstream('geyser', { rain: true }).rain === false && GEYSER_CFG.downstream.great.show === true
    && resolveDownstream('geyser', { runoff: true }).runoff === true);
  const v0: PlacedVent = { pos: vec(900, 700), cls: 'great', band: 0, period: 8, phase: 0, gate: new Map() };
  check('E2 law: a hand-built vent resolves to its CLASS defaults (absent == identical: the great rains + runs off)',
    ventDownstream(v0).rain && ventDownstream(v0).runoff && Math.abs(ventSpill(v0) - spillBearing(v0.pos)) < 1e-9);
  const fanA = rainFanOf(v0, 0, 3, null), fanB = rainFanOf(v0, 0, 3, null), fanC = rainFanOf(v0, 0, 4, null);
  check('E3 fan: a pure per-cycle hash — same inputs, same drops; another cycle, another fan; count in the band; in the annulus',
    JSON.stringify(fanA) === JSON.stringify(fanB) && JSON.stringify(fanA) !== JSON.stringify(fanC)
    && fanA.length >= GEYSER_CFG.rain.count[0] && fanA.length <= GEYSER_CFG.rain.count[1]
    && fanA.every(c => { const dd = d2(c, v0.pos); return dd >= GEYSER_CFG.rain.range[0] - 1 && dd <= GEYSER_CFG.rain.range[1] + 1; }));
  const windy = rainFanOf(v0, 0, 3, { x: 1, y: 0, strength: 1 });
  const downwindShare = windy.filter(c => Math.cos(Math.atan2(c.y - v0.pos.y, c.x - v0.pos.x)) > 0.3).length / windy.length;
  check('E4 fan: a standing wind BIASES the drops downwind (windAt is the read — weather and rain agree)',
    downwindShare >= 0.5, `downwind share ${downwindShare.toFixed(2)}`);
  // LIVE: the great vent's burst lands teeth ~rainDelay later.
  seedGlobalRandom(0xb04e);
  const w = makeSimWorld('warrior', 0xb04e);
  const vent: PlacedVent = { pos: vec(900, 700), cls: 'great', band: 0, period: 8, phase: 0, gate: new Map() };
  w.geysers = mkField(vent, 8);
  w.geyserMode = 'bands';
  const r0 = ventReadAt(w.geysers, vent, w.time, 'bands');
  const fan = rainFanOf(vent, 0, r0.k + 1, w.windAt(vent.pos));
  check('E5 live: the coming cycle deals at least four drops', fan.length >= 4, `${fan.length}`);
  const hit = dummy(w, 'zombie', fan[0]);
  const roofed = dummy(w, 'zombie', fan[1]);
  const shelter: Doodad = { pos: vec(fan[1].x, fan[1].y), radius: 48, kind: 'sinter_overhang', rot: 0 } as Doodad;
  w.doodads.push(shelter); w.markDoodadsChanged();
  const sleeper = dummy(w, 'zombie', fan[2], m => { m.tag = 'wayfarer'; }); // DORMANT_TAGS citizen
  w.player.pos = vec(fan[3].x, fan[3].y);
  w.player.invulnerable = false;
  check('E6 shelter: the body under the sinter overhang reads as ROOFED (DoodadRule.shelter → underRoofAt), the others open sky',
    w.underRoofAt(roofed.pos) && !w.underRoofAt(hit.pos) && !w.underRoofAt(sleeper.pos));
  const life0 = { hit: hit.life, roofed: roofed.life, sleeper: sleeper.life, p: w.player.life };
  const pocks0 = w.doodads.filter(d => d.kind === 'scald_pock').length;
  let burstAt = -1, landAt = -1;
  for (let i = 0; i < 60 * 11 && landAt < 0; i++) {
    step(w, 1);
    const r = ventReadAt(w.geysers!, vent, w.time, 'bands');
    if (burstAt < 0 && r.k === r0.k + 1) burstAt = w.time;
    if (burstAt >= 0 && hit.life < life0.hit - 1e-6) landAt = w.time;
  }
  step(w, 30);
  check('E7 live: the rain LANDS ~rainDelay after the column (the throw arrives)',
    burstAt >= 0 && landAt >= 0 && Math.abs((landAt - burstAt) - GEYSER_CFG.rainDelay) < 0.15,
    `burst ${burstAt.toFixed(2)} land ${landAt.toFixed(2)}`);
  check('E8 live: the open-sky body is scalded + WARMED (the scorch bar\'s rain source) — faction-blind: the hero too',
    hit.life < life0.hit && has(hit, 'scalded') && w.scorchOf(hit) > 0 && w.player.life < life0.p,
    `hit Δ${(life0.hit - hit.life).toFixed(1)} bar ${w.scorchOf(hit).toFixed(2)}, hero Δ${(life0.p - w.player.life).toFixed(1)}`);
  check('E9 live: the ROOFED body and the DORMANT sleeper are SPARED (the sky posture: spareRoofed + spareDormant)',
    roofed.life >= life0.roofed - 1e-6 && w.scorchOf(roofed) === 0 && sleeper.life >= life0.sleeper - 1e-6);
  check('E10 live: the landings pock the ground (scald_pock — drying dress)', w.doodads.filter(d => d.kind === 'scald_pock').length > pocks0);
  // A GEYSER-class vent lands no teeth — spectacle only (pocks, no wound).
  const w2 = makeSimWorld('warrior', 0xb04f);
  const v2: PlacedVent = { pos: vec(900, 700), cls: 'geyser', band: 0, period: 6, phase: 0, gate: new Map() };
  w2.geysers = mkField(v2, 6);
  const r2 = ventReadAt(w2.geysers, v2, w2.time, 'bands');
  const cfan = cometFanOf(v2, 0, r2.k + 1);
  const z2 = dummy(w2, 'zombie', cfan[0]);
  w2.player.pos = vec(200, 200);
  const l2 = z2.life;
  step(w2, 60 * 8);
  check('E11 live: a geyser-class burst lands NO teeth on its comet fan (spectacle only — pocks, no wound)', z2.life >= l2 - 1e-6 && !has(z2, 'scalded'));
}

// --------------------------------------------------------------- F) the runoff --
{
  const def = CREEPS.scald_runoff;
  check('F1 row: scald_runoff is a finite, flowing, fading run that scalds + quenches cold (travel / flow / convert.fade / grants)',
    !!def?.front?.travel && !!def.front.flow && !!def.front.convert?.fade && def.front.convert.ground === 'scald_sheen'
    && !!def.grants?.some(g => g.status === 'scalded') && def.front.quench?.types.includes('cold') === true
    && def.front.travel.range[0] >= 300 && def.front.travel.range[1] <= 500);
  check('F2 row: the scalded sting is its OWN fire row with NO screen-fx (the terrain-stings rule)',
    STATUS_DEFS.scalded?.element === 'fire' && !STATUS_FX_REGISTRY.scalded);
  seedGlobalRandom(0x2f01);
  const w = makeSimWorld('warrior', 0x2f01);
  const vent: PlacedVent = { pos: vec(1000, 900), cls: 'great', band: 0, period: 7, phase: 0, gate: new Map() };
  w.geysers = mkField(vent, 7);
  const spill = ventSpill(vent);
  const wader = dummy(w, 'zombie', {
    x: vent.pos.x + Math.cos(spill) * (GEYSER_CFG.mouthR.great * GEYSER_CFG.runoff.offset + 70),
    y: vent.pos.y + Math.sin(spill) * (GEYSER_CFG.mouthR.great * GEYSER_CFG.runoff.offset + 70),
  });
  w.player.pos = vec(200, 200);
  const k0 = ventReadAt(w.geysers, vent, w.time, 'bands').k;
  let src: ReturnType<NonNullable<World['creep']>['sources']['at']> = undefined;
  for (let i = 0; i < 60 * 9 && !src; i++) {
    step(w, 1);
    src = w.creep?.sources.find(s => s.def.id === 'scald_runoff');
  }
  const bornAng = src ? Math.atan2(src.pos.y - vent.pos.y, src.pos.x - vent.pos.x) : NaN;
  const angErr = Math.abs(Math.atan2(Math.sin(bornAng - spill), Math.cos(bornAng - spill)));
  check('F3 live: the burst POURS a scald_runoff section on the vent\'s SPILL SIDE (pure per seat) — born, marching the spill bearing',
    !!src && angErr < 0.25 && !!src.front && Math.abs(src.front.bearing - spill) < 1e-6,
    `born ${src ? 'yes' : 'no'}, Δang ${angErr.toFixed(2)}`);
  const wl0 = wader.life;
  let scaldedAt = -1;
  for (let i = 0; i < 60 * 8; i++) {
    step(w, 1);
    if (scaldedAt < 0 && has(wader, 'scalded')) scaldedAt = w.time;
  }
  check('F4 live: the wash SCALDS and WARMS what it crosses (the sting + the scorch bar\'s runoff source)',
    scaldedAt >= 0 && wader.life < wl0 && w.scorchOf(wader) > 0, `scalded ${scaldedAt >= 0}, Δ${(wl0 - wader.life).toFixed(1)}, bar ${w.scorchOf(wader).toFixed(2)}`);
  const sheen = w.doodads.filter(d => d.kind === 'scald_sheen');
  check('F5 live: the run leaves an EVAPORATING scald sheen behind it (convert.fade — the ground forgets)',
    sheen.length > 0 && sheen.every(d => !!d.evap), `sheen ${sheen.length}`);
  step(w, 60 * 14);
  const later = w.creep?.sources.find(s => s.def.id === 'scald_runoff');
  check('F6 live: a FINITE run — it disperses (receding or gone) within its range',
    !later || later.state === 'recede' || (later.front?.traveled ?? 0) >= (later.front?.rangeMax ?? Infinity) * 0.9,
    later ? `state ${later.state}, traveled ${later.front?.traveled.toFixed(0)} / ${later.front?.rangeMax.toFixed(0)}` : 'gone');
  const k1 = ventReadAt(w.geysers, vent, w.time, 'bands').k;
  check('F7 live: STRICT periodicity — the spill side never re-rolls (the same bearing the beat after)',
    k1 > k0 && Math.abs(ventSpill(vent) - spill) < 1e-12);
}

// ------------------------------------------------------------ G) the warm hatch --
{
  const lay = SKILLS.lay_brood_clutch;
  const d = lay?.delivery as { type: string; hatch?: { skillId: string; onScorch?: number } };
  check('G1 data: the matron lays a pod clutch whose hatch rides the warm seam (hatch.onScorch) into scald spawn',
    MONSTERS.brood_matron?.skills.includes('lay_brood_clutch') && d?.type === 'construct' && (d.hatch?.onScorch ?? 0) > 0
    && SKILLS[d.hatch!.skillId]?.delivery.type === 'summon' && !!MONSTERS.scald_spawn);
  seedGlobalRandom(0xb00d);
  const w = makeSimWorld('warrior', 0xb00d);
  const matron = w.createMonster('brood_matron', 6, 'enemy');
  matron.pos = vec(1200, 900);
  matron.anchored = true;
  w.actors.push(matron);
  w.player.pos = vec(200, 200);
  matron.mana = 90;
  w.useSkill(matron, makeSkillInstance(lay, 3), vec(matron.pos.x + 40, matron.pos.y));
  step(w, 90);
  const pods = w.actors.filter(a => a.construct?.kind === 'pod' && a.construct.hatch?.onScorch !== undefined && !a.dead);
  check('G2 live: the clutch is laid through the REAL cast pipeline (a pod construct wearing the warm hatch)', pods.length >= 1, `pods ${pods.length}`);
  if (pods.length) {
    const pod = pods[0];
    step(w, 60 * 2);
    const spawn0 = w.actors.filter(a => a.defId === 'scald_spawn' && !a.dead).length;
    check('G3 live: an UNFED clutch waits on its clock (no early hatch)', !pod.dead && spawn0 === 0);
    w.scorchFeed(pod, (pod.construct!.hatch!.onScorch ?? 1) + 0.5);
    step(w, 30);
    const spawn1 = w.actors.filter(a => a.defId === 'scald_spawn' && !a.dead).length;
    check('G4 live: warmth past the threshold HATCHES it early — the brood is loose, the shell retired',
      spawn1 >= 2 && (pod.dead || !w.actors.includes(pod)), `spawn ${spawn1}, pod ${pod.dead ? 'dead' : 'alive'}`);
  }
}

// ----------------------------------------------------------------- H) the lamprey --
{
  const lp = MONSTERS.vent_lamprey;
  check('H1 data: the lamprey latches + gnaws FIRE and wears a flop (the longer wait, a worn status registered for it)',
    !!lp?.cling?.gnaw && lp.cling.gnaw.type === 'fire' && !!lp.cling.flop && !!STATUS_DEFS[lp.cling.flop.status ?? '']
    && (lp.cling.flop.grace ?? CLING_CFG.flop.grace) > CLING_CFG.reattachGrace && !lp.cling.burrow);
  check('H2 data: the flop status IS its window (duration == the re-latch grace)',
    Math.abs(STATUS_DEFS.lamprey_flop.duration - (lp.cling!.flop!.grace ?? CLING_CFG.flop.grace)) < 1e-6);
  seedGlobalRandom(0x1a3);
  const w = makeSimWorld('warrior', 0x1a3);
  w.zone.objective = { kind: 'clear' }; // wake the quiet floor — the sanctuary never locks the hero (the probe_contagion2 idiom)
  const p = w.player;
  p.pos = vec(1000, 900);
  const eel = w.createMonster('vent_lamprey', 5, 'enemy');
  eel.pos = vec(p.pos.x + 26, p.pos.y);
  w.actors.push(eel);
  let latched = -1;
  for (let i = 0; i < 60 * 4 && latched < 0; i++) { stepAI(w, 1); if (eel.clingTo) latched = w.time; }
  check('H3 live: it LATCHES onto the hero', latched >= 0 && eel.clingTo?.id === p.id);
  const life0 = p.life;
  let released = -1;
  for (let i = 0; i < 60 * 6 && released < 0; i++) { stepAI(w, 1); if (!eel.clingTo) released = w.time; }
  check('H4 live: the ride chews the hero (the fire gnaw) and ends on the shake clock', latched >= 0 && p.life < life0 && released > latched);
  check('H5 live: shaken off it FLOPS — tossed clear, the long re-latch wait, the flop status worn',
    released >= 0 && !eel.dead && eel.clingCooldownUntil - w.time > CLING_CFG.reattachGrace + 0.5 && has(eel, 'lamprey_flop')
    && d2(eel.pos, p.pos) > p.radius + eel.radius + 8,
    `wait ${(eel.clingCooldownUntil - w.time).toFixed(2)}s, dist ${d2(eel.pos, p.pos).toFixed(0)}`);
}

// --------------------------------------------------------------- I) the prism snail --
{
  check('I1 data: the prism snail is the attunement fabric\'s first wild wearer (tune: an open re-tuner, a pulse)',
    !!MONSTERS.prism_snail?.tune && !MONSTERS.prism_snail.tune.locked && MONSTERS.prism_snail.tune.pulse !== false);
  seedGlobalRandom(0x5a11);
  const w = makeSimWorld('warrior', 0x5a11);
  const snail = w.createMonster('prism_snail', 5, 'enemy');
  snail.pos = vec(1000, 800);
  snail.anchored = true;
  w.actors.push(snail);
  w.player.pos = vec(1000 - 130, 800);
  w.player.invulnerable = true;
  volley(w, snail.pos, 10, 'firebolt');
  check('I2 live: struck with FIRE, the crust re-tunes to fire (the tone worn as its status)', has(snail, 'attuned_fire'));
  volley(w, snail.pos, 10, 'frostbolt');
  check('I3 live: struck with COLD, it re-tunes again — and PULSES the tone back onto the hero beside it',
    has(snail, 'attuned_cold') && !has(snail, 'attuned_fire') && has(w.player, 'attuned_cold'));
}

// ------------------------------------------------------------- J) THE NO-TAG LAW --
{
  const jk = MONSTERS.cinder_jackal;
  const ceiling = jk?.brain?.rules?.find(r => r.when.sinceEngaged !== undefined);
  check('J1 data: the opportunist prowls at a VISIBLE ring and carries a LOCKED CEILING (sinceEngaged → direct, no hold)',
    jk?.brain?.move?.style === 'prowl' && (jk.brain.move.ring ?? 0) >= 250 && !!ceiling && ceiling.use?.move?.style === 'direct'
    && ceiling.hold === undefined && (ceiling.when.sinceEngaged ?? 99) <= 12
    && !!jk.brain.rules?.some(r => r.when.targetHasStatus === 'scalded'));
  const wl = MONSTERS.scald_wallower;
  check('J2 data: the wallow is pool-bound (habitat), posted, reaches, and SETTLES out of reach (the rule + the buff + the tell)',
    wl?.habitat?.kind === 'sulphur_pool' && wl.post === true && wl.skills.includes('wallow_reach')
    && !!wl.brain?.rules?.some(r => r.when.distOver !== undefined && r.actions?.some(a => a.do === 'buff' && (a as { buff: { id: string } }).buff.id === 'wallow_settle'))
    && !!wl.tells?.some(t => t.source === 'buff:wallow_settle'));
  const mn = MONSTERS.kettle_minnow;
  check('J3 data: the shoal is placid critter texture with a DECAYING frenzy drive jumped by the downstream\'s scald',
    mn?.tag === 'critter' && (mn.brain?.drives?.frenzy?.rise ?? 0) < 0
    && !!mn.brain?.rules?.some(r => r.when.hasStatus === 'scalded' && r.actions?.some(a => a.do === 'drive'))
    && !!mn.brain?.rules?.some(r => r.when.drive?.id === 'frenzy' && r.use?.move?.style === 'direct'));
  // LIVE — the opportunist's ceiling: it stands off, then converges on the clock.
  seedGlobalRandom(0x0a7);
  const w = makeSimWorld('warrior', 0x0a7);
  w.zone.objective = { kind: 'clear' }; // wake the quiet floor (the sanctuary never locks the hero)
  const p = w.player;
  p.pos = vec(1100, 900);
  p.invulnerable = true; // a perfectly healthy target — no mistake ever
  const jackal = w.createMonster('cinder_jackal', 5, 'enemy');
  jackal.pos = vec(p.pos.x + 260, p.pos.y);
  jackal.facing = Math.PI; // eyes on its quarry from the first frame (the ceiling counts from the lock)
  w.actors.push(jackal);
  stepAI(w, 60 * 4);
  const standoff = d2(jackal.pos, p.pos);
  check('J4 live: four seconds in, the opportunist STANDS OFF (the prowl ring is the tell)', standoff > 170, `dist ${standoff.toFixed(0)}`);
  stepAI(w, 60 * 12);
  const closed = d2(jackal.pos, p.pos);
  check('J5 live: past its ceiling it CONVERGES regardless — commit, never hover (THE NO-TAG LAW)', closed < 150, `dist ${closed.toFixed(0)}`);
  // LIVE — the wallow's door.
  const w2 = makeSimWorld('warrior', 0x0a8);
  w2.zone.objective = { kind: 'clear' };
  const p2 = w2.player;
  const POOL = vec(1100, 900);
  w2.addTempGround(POOL, 'sulphur_pool', 44, 600);
  const tank = w2.createMonster('scald_wallower', 6, 'enemy');
  tank.pos = vec(POOL.x, POOL.y);
  tank.confine = { x: POOL.x, y: POOL.y, r: 44 + 54 };
  w2.actors.push(tank);
  p2.pos = vec(POOL.x + 420, POOL.y);
  p2.invulnerable = true;
  stepAI(w2, 60 * 4);
  check('J6 live: out of its reach, the wallow SETTLES (the buff worn — the door shut)', tank.buffs.has('wallow_settle'));
  p2.pos = vec(POOL.x + 110, POOL.y);
  stepAI(w2, 60 * 5);
  check('J7 live: step back in and it RISES (the settle runs out; the fight reopens)', !tank.buffs.has('wallow_settle'));
  check('J8 live: it never left its pool (the confine IS the door)', d2(tank.pos, POOL) <= 44 + 54 + 1);
  // LIVE — the tide-locked frenzy.
  const w3 = makeSimWorld('warrior', 0x0a9);
  w3.zone.objective = { kind: 'clear' };
  const fish = w3.createMonster('kettle_minnow', 4, 'enemy');
  fish.pos = vec(900, 900);
  w3.actors.push(fish);
  w3.player.pos = vec(400, 400);
  stepAI(w3, 30);
  check('J9 live: placid — the frenzy meter sits empty', (fish.drives.get('frenzy') ?? 0) < 0.05);
  fish.applyStatus('scalded', 0, 1, 'the runoff');
  stepAI(w3, 45);
  const peak = fish.drives.get('frenzy') ?? 0;
  check('J10 live: the downstream\'s scald THROWS the shoal into its frenzy window', peak >= 0.25, `frenzy ${peak.toFixed(2)}`);
  stepAI(w3, 60 * 16);
  check('J11 live: the window CLOSES — the drive bleeds back down and the shoal is placid again', (fish.drives.get('frenzy') ?? 0) < 0.25,
    `frenzy ${(fish.drives.get('frenzy') ?? 0).toFixed(2)}`);
}

// ---------------------------------------------------------------------- K) nets --
{
  const defs: Record<string, typeof MONSTERS[string]> = {};
  for (const id of KIN) defs[id] = MONSTERS[id];
  const faults = validateTells(defs, PART_PAINTERS);
  check('K1 nets: every wave-2 tell validates', faults.length === 0, faults.join('; '));
  check('K2 nets: every wave-2 kin has a look whose parts all resolve (+ the brood clutch)',
    [...KIN, 'brood_clutch'].every(id => {
      const look = id === 'brood_clutch' ? LOOKS.brood_clutch : LOOKS[MONSTERS[id]?.look ?? ''];
      return !!look && look.parts.every(p => !!PART_PAINTERS[p.kind]);
    }));
  check('K3 nets: every kit skill exists + carries an ai hint + is affordable from the def\'s own pool',
    KIN.every(id => MONSTERS[id].skills.every(s => !!SKILLS[s] && !!SKILLS[s].ai
      && (SKILLS[s].manaCost ?? 0) <= (MONSTERS[id].base.mana ?? 0))));
  for (const k of NEW_KINDS) {
    check(`K4 dress: '${k}' wears a rule + a visuals row`, hasDoodadRule(k) && !!DOODAD_VISUALS[k]);
  }
  check('K5 shelter: the sinter overhang is a roof-grade shelter whose body is smaller than its lip (drawn == tested at the lip)',
    doodadRuleOf('sinter_overhang').shelter === true && (doodadRuleOf('sinter_overhang').bodyScale ?? 1) < 1
    && TILESETS.geyser_fields.layout.some(r => r.kind === 'sinter_overhang') && TILESETS.sulphur_pools.layout.some(r => r.kind === 'sinter_overhang'));
  check('K6 tables: the wave-2 kin are seated in the basin (fields / pools / terraces / the Char / the wildlife rows)',
    TILESETS.geyser_fields.packs!.table.some(r => r.id === 'brood_matron') && TILESETS.sulphur_pools.packs!.table.some(r => r.id === 'prism_snail')
    && TILESETS.char_reach.packs!.table.some(r => r.id === 'cinder_jackal') && TILESETS.sinter_terraces.packs!.table.some(r => r.id === 'prism_snail')
    && (WILDLIFE.scald ?? []).some(r => r.id === 'kettle_minnow'));
  check('K7 cfg: the scald heat sweep reads the runoff as a source; the rain feeds the bar (both dials present)',
    SCALD_CFG.runoff.perSec > 0 && GEYSER_CFG.rain.scorchUnits > 0);
  check('K8 cfg: the ignition grammar\'s shared dials are sane (decay in (0,1), cap ≥ 1, a heel distance)',
    CREEP_CFG.front.ignition.decay > 0 && CREEP_CFG.front.ignition.decay < 1 && CREEP_CFG.front.ignition.max >= 1 && CREEP_CFG.front.heelsBack > 0);
}

console.log(failed ? `\nprobe_char: ${failed} FAILURE(S)` : '\nprobe_char: ALL PASS');
process.exit(failed ? 1 : 0);
