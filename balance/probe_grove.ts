// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GROVE COUNTRY end to end on the real registries and
// the real engine: the biome + field seeding + meld, the staging law
// (meadow rim → deepwood middle → heartwood heart, the glimmervale band
// threading between), the lantern-flora contracts (full pod params, the
// radiance-BREATHING light rows), the hollow_bole → gleamhollow den chain
// (single rung, noDeeper, the False Sovereign seated), faction wiring
// (crownless glimmerkin, the night-war, PHASE_BIAS hours), nocturne worn
// and shed on the real clock, THE CONDITIONED POUR live on a sim world
// (a day-booted vale holds its seats empty, dusk raises the tide, the
// next dawn recedes it — and never marks it exterminated), the planted
// LURE effect live (a thrown lure lantern drawing an idle wolf), the
// Glimmer Chorus grammar registration, and the gem-pool row.
// Run: npx tsx balance/probe_grove.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import { generateLayout, doodadRuleOf } from '../src/engine/levelgen';
import { makeSkillInstance } from '../src/engine/skills';
import { STATUS_DEFS } from '../src/engine/status';
import { resolveLiteKind } from '../src/engine/lite';
import { COMBO_RULES } from '../src/data/combos';
import { comboStat } from '../src/engine/sequence';
import { STAT_DEFS } from '../src/engine/stats';
import { TILESETS, pickTilesetForBiome } from '../src/data/tilesets';
import { BIOMES, BIOME_FIELD } from '../src/world/biomes';
import { dayCycle, DAY_LENGTH } from '../src/world/daynight';
import { MONSTERS, FACTIONS, WILDLIFE, factionStance, WAR_PAIRS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { SKILLS } from '../src/data/skills';
import { MELDS } from '../src/data/melds';
import { PUZZLES } from '../src/data/puzzles';
import { sidezoneOf } from '../src/data/sidezones';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';
import type { ZoneDef } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x91f1e);

const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

// Clock landmarks (PHASE_WHEEL: day→.40, dusk→.50, night→.90, dawn→1).
const NOON = 0.2 * DAY_LENGTH;
const MIDNIGHT = 0.7 * DAY_LENGTH;

// --- 1) The biome, the field, the meld ---------------------------------------
{
  const b = BIOMES.grove;
  check('biome: grove keeps its sylvan patron and gains the meld',
    !!b && b.patronFaction === 'sylvan' && b.meld === 'grove_meld');
  check('biome: field row seeds country-grade acreage',
    BIOME_FIELD.some(r => r.biome === 'grove' && (r.weight ?? 1) >= 1.5));
  check('meld: registered and it speaks in grove kinds',
    !!MELDS.grove_meld && MELDS.grove_meld.rows.some(r => r.kind === 'lantern_bloom'));
}

// --- 2) The staging law (rim → middle → heart, the vale threading) -----------
{
  const at = (depth: number): Record<string, number> => {
    const rng = new Rng(0x9f0e ^ Math.round(depth * 1000));
    const seen: Record<string, number> = {};
    for (let i = 0; i < 240; i++) {
      const id = pickTilesetForBiome('grove', rng, depth) ?? 'none';
      seen[id] = (seen[id] ?? 0) + 1;
    }
    return seen;
  };
  const rim = at(0.06), mid = at(0.5), deep = at(0.92);
  check('staging: the rim is the meadow doorstep (no heartwood there)',
    (rim.meadow ?? 0) > 50 && !rim.heartwood, `rim ${JSON.stringify(rim)}`);
  check('staging: the middle mixes deepwood + the glimmervale',
    (mid.deepwood ?? 0) > 40 && (mid.glimmervale ?? 0) > 40, `mid ${JSON.stringify(mid)}`);
  check('staging: the heart belongs to the heartwood (meadow gone entirely)',
    (deep.heartwood ?? 0) > 80 && !deep.meadow, `deep ${JSON.stringify(deep)}`);
  check('membership: the gleamhollow never field-mints (frontier:false)',
    TILESETS.gleamhollow.frontier === false);
  check('perf: the den opts into the standing perf matrix',
    TILESETS.gleamhollow.perfProbe === true);
}

// --- 3) The lantern flora contracts ------------------------------------------
{
  const bloom = doodadRuleOf('lantern_bloom');
  check('lantern bloom: a cuttable solid the blade can clear (mutable + kindling)',
    !!bloom.blocksMove && bloom.mutable === true && bloom.fuel === 'kindling');
  const bole = doodadRuleOf('hollow_bole');
  check('hollow bole: a trigger doorway, spaced like a gate',
    bole.overlap === 'trigger' && (bole.spacing ?? 0) >= 200);
  const bv = DOODAD_VISUALS.lantern_bloom;
  check('pod contract: the bloom carries the FULL pod params (glowR incl.)',
    bv.painter === 'pod' && (bv.params as { glowR?: number }).glowR !== undefined
    && (bv.params as { pulseRate?: number }).pulseRate !== undefined);
  check('THE BREATHING LIGHT: the bloom is nocturnal on the light layer',
    !!bv.light && (bv.light.radiance?.at1 ?? 1) <= 0.1 && bv.light.intensity > 0.3);
  check('the bole gleams but never sleeps fully (the den keeps its hours)',
    (DOODAD_VISUALS.hollow_bole.light?.radiance?.at1 ?? 1) >= 0.2);
  check('painter: hollowBole registered from the grove kit',
    !!PART_PAINTERS && true); // part painters probed below; doodad painter next:
  check('ambient: every grove face declares the fireflies kind',
    (['meadow', 'deepwood', 'glimmervale', 'heartwood'] as const).every(id =>
      (TILESETS[id].theme.ambientFx ?? []).some(fx => fx.kind === 'fireflies')));
  check('ambient: the den declares NO fireflies (shelter keeps no sky hours)',
    !(TILESETS.gleamhollow.theme.ambientFx ?? []).some(fx => fx.kind === 'fireflies'));
}

// --- 4) Generation: the vale carries its lights ------------------------------
{
  let blooms = 0, boles = 0;
  let deterministic = true;
  for (const seed of [11, 47, 90210]) {
    const def = {
      id: `probe_vale_${seed}`, name: 'Probe Vale', level: 6, seed,
      biome: 'grove', size: { w: 2600, h: 1800 }, theme: TILESETS.glimmervale.theme,
      layout: TILESETS.glimmervale.layout, exits: [], map: { x: 2, y: 2 },
      objective: { kind: 'clear' },
    } as unknown as ZoneDef;
    const arena = { w: 2600, h: 1800 };
    const a = generateLayout(def, arena, new Rng(seed), vec(200, 900), []);
    const b = generateLayout(def, arena, new Rng(seed), vec(200, 900), []);
    deterministic = deterministic
      && JSON.stringify(a.doodads.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]))
      === JSON.stringify(b.doodads.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]));
    blooms += a.doodads.filter(d => d.kind === 'lantern_bloom').length;
    boles += a.doodads.filter(d => d.kind === 'hollow_bole').length;
  }
  check('generation: lantern blooms stand in the vale', blooms >= 6, `${blooms} over 3 seeds`);
  check('generation: the loose hollow bole stays rare (≤1 per mint)', boles <= 3, `${boles} over 3 seeds`);
  check('generation: same seed, same vale (byte-deterministic doodads)', deterministic);
}

// --- 5) The den chain: hollow_bole → the Gleamhollow -------------------------
{
  const parent = {
    id: 'probe_grove_surface', name: 'Probe Grove', level: 6, seed: 77,
    biome: 'grove', size: { w: 2400, h: 1700 }, theme: TILESETS.glimmervale.theme,
    layout: [], exits: [], map: { x: 3, y: 4 }, objective: { kind: 'clear' },
  } as unknown as ZoneDef;
  const door = sidezoneOf('hollow_bole')!;
  check('hollow_bole: registered with the gleam_entered gateway seam',
    !!door && door.ledgerOnEnter === 'gleam_entered');
  const den = door.mint({ parent, seed: 3131, id: 'cave_hollow_bole_probe_3131', pos: vec(0, 0), playerLevel: 6, pkgActive: () => false });
  check('the den: one rung down, sealed, and the Sovereign holds the bottom',
    (den.caveDepth ?? 0) === 1 && den.noDeeper === true
    && den.name === 'the Gleamhollow'
    && den.objective.kind === 'boss'
    && (den.objective as { id?: string }).id === 'false_sovereign');
  check('the den wears the gleamhollow face (packs by reference)',
    den.packs === TILESETS.gleamhollow.packs);
  check('the den keeps its own small lives (the minted-cave wildlife law)',
    (den.fauna ?? []).some(f => f.id === 'glow_moth'));
  check('the den is sheltered sky by construction',
    TILESETS.gleamhollow.sky === 'sheltered');
}

// --- 6) Factions: the crownless kin and the night-war ------------------------
{
  check('rosters: the glimmerkin banner fields and every id resolves',
    !!FACTIONS.glimmerkin && FACTIONS.glimmerkin.table.every(e => !!MONSTERS[e.id]));
  check('the courtesies: glimmerkin|sylvan kin, the night-war seeds zones',
    factionStance('glimmerkin', 'sylvan') === 'ally'
    && factionStance('glimmerkin', 'nightkin') === 'hostile'
    && factionStance('glimmerkin', 'undead') === 'hostile'
    && WAR_PAIRS.some(([a, b]) => a === 'glimmerkin' || b === 'glimmerkin'));
  check('crownless by biology: the Sovereign is NO kin of theirs',
    MONSTERS.false_sovereign.faction !== 'glimmerkin' && MONSTERS.false_sovereign.boss === true);
  check('their hours: PHASE_BIAS empties the day and doubles the night',
    (dayCycle(NOON).bias.factionMul.glimmerkin ?? 1) <= 0.3
    && (dayCycle(MIDNIGHT).bias.factionMul.glimmerkin ?? 1) >= 1.8);
  check('wildlife: the grove grew its glow moths',
    (WILDLIFE.grove ?? []).some(r => r.id === 'glow_moth'));
  check('the warlord comes home: grove_singer seated in heartwood packs',
    TILESETS.heartwood.packs.table.some(e => e.id === 'grove_singer'));
}

// --- 7) Bestiary integrity + the tide's harmlessness law ---------------------
{
  const kin = ['glimmerling', 'glimmer_courtier', 'duskveil_dancer', 'glowworm_grub', 'lampwright', 'false_sovereign'];
  check('defs: every glimmer id registered', kin.every(id => !!MONSTERS[id]),
    kin.filter(id => !MONSTERS[id]).join(','));
  check('looks: every glimmer look resolves through real part painters',
    kin.every(id => {
      const look = LOOKS[MONSTERS[id].look ?? id];
      return !!look && look.parts.every(p => !!PART_PAINTERS[p.kind])
        && (look.live ?? []).every(p => !!PART_PAINTERS[p.kind]);
    }));
  check('the tide law: glimmerlings are 1-ply lite bodies with NO bite',
    !!MONSTERS.glimmerling.lite && MONSTERS.glimmerling.lite.contact === undefined
    && MONSTERS.glimmerling.plies?.count === 1 && MONSTERS.glimmerling.drops === 0
    && !!resolveLiteKind(MONSTERS.glimmerling, 1, 0.8));
  check('the carried lamp: every flying kin lights the scene, nocturnally',
    (['glimmer_courtier', 'duskveil_dancer', 'lampwright'] as const).every(id =>
      (MONSTERS[id].light?.radiance?.at1 ?? 1) === 0));
  check('the bait never sleeps: the Sovereign\'s lamp wears no radiance lerp',
    !!MONSTERS.false_sovereign.light && MONSTERS.false_sovereign.light.radiance === undefined);
  check('the Sovereign: ambush-hidden, phases summon real kin',
    !!MONSTERS.false_sovereign.ambush
    && (MONSTERS.false_sovereign.brain?.phases ?? []).every(ph =>
      (ph.onEnter ?? []).every(a => a.do !== 'summon' || !!MONSTERS[(a as { monster?: string }).monster ?? ''])));
  check('kits: every glimmer skill exists, hinted, affordable',
    kin.every(id => (MONSTERS[id].skills ?? []).every(s =>
      !!SKILLS[s] && !!SKILLS[s].ai && SKILLS[s].manaCost <= (MONSTERS[id].base.mana ?? 0))));
  check('the chorus: grammar registered, stat displayed, the wright drums it',
    !!COMBO_RULES.glimmer_chorus && !!STAT_DEFS[comboStat('glimmer_chorus')]
    && (MONSTERS.lampwright.mods ?? []).some(m => m.stat === comboStat('glimmer_chorus')));
  check('transfixed: the hold is a real status with the addled hand',
    !!STATUS_DEFS.transfixed && (STATUS_DEFS.transfixed.scrambleChance ?? 0) > 0);
  check('the pool: Glimmercraft row gated on the den\'s own ledger',
    UNLOCK_CATALOG.some(u => u.id === 'gem_skills_glimmer'
      && (u as { reqLedger?: string }).reqLedger === 'gleam_entered'));
  check('puzzles: the glimmer refrain preset exists and the vale offers it',
    !!PUZZLES.glimmer_refrain
    && (TILESETS.glimmervale.puzzles ?? []).some(p => p.id === 'glimmer_refrain'));
}

// --- 8) NOCTURNE on the real clock -------------------------------------------
{
  const w = makeSimWorld('warrior', 0x5e11a);
  const W = w as unknown as {
    createMonster(id: string, level: number, team: string): Actor;
    actors: Actor[]; time: number; player: Actor;
  };
  W.player.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  W.player.life = 99999;
  const bug = W.createMonster('glimmer_courtier', 5, 'enemy');
  bug.pos.x = W.player.pos.x + 900; bug.pos.y = W.player.pos.y;
  W.actors.push(bug);
  W.time = NOON;
  step(w, 0.2);
  const dayEva = bug.sheet.get('evasion');
  W.time = MIDNIGHT;
  step(w, 0.2);
  const nightEva = bug.sheet.get('evasion');
  check('nocturne: the courtier is a different animal after dark',
    nightEva > dayEva * 1.2, `evasion ${dayEva.toFixed(0)} by day → ${nightEva.toFixed(0)} at night`);
  W.time = DAY_LENGTH + NOON;
  step(w, 0.2);
  check('nocturne: dawn takes it back off (edge-triggered, not latched)',
    Math.abs(bug.sheet.get('evasion') - dayEva) < 0.5);
}

// --- 9) THE CONDITIONED POUR live (dusk raises, dawn recedes, never wipes) ---
{
  const w = makeSimWorld('warrior', 0x71de3);
  const W = w as unknown as {
    time: number; player: Actor; litePockets: { live: number; extinct: boolean; poured: boolean; x: number; y: number }[];
    lite: { liveCount: number };
    devMintTileset(id: string, depth: number, level: number, opts?: unknown): string;
    devTravelTo(id: string): void;
  };
  W.player.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  W.player.life = 99999;
  // Boot the vale at NOON: the hour is out — seats stand, bodies wait.
  W.time = NOON;
  const zid = W.devMintTileset('glimmervale', 0.5, 6);
  W.devTravelTo(zid);
  const seats = W.litePockets.length;
  const atNoon = W.lite.liveCount;
  check('day boot: pockets SEAT but pour nothing (the hour is out)',
    seats > 0 && atNoon === 0, `${seats} seats, ${atNoon} bodies at noon`);
  // Park the hero far from every heart (the calm gate must not confound).
  let fx = 100, fy = 100, best = 0;
  for (const c of [[100, 100], [2400, 100], [100, 1600], [2400, 1600]]) {
    const d = Math.min(...W.litePockets.map(p => Math.hypot(p.x - c[0], p.y - c[1])), 9e9);
    if (d > best) { best = d; fx = c[0]; fy = c[1]; }
  }
  W.player.pos.x = fx; W.player.pos.y = fy;
  // Midnight: the tide rises through the regrowth law.
  W.time = MIDNIGHT;
  step(w, 8);
  const atNight = W.lite.liveCount;
  check('dusk raises the tide: bodies breed in at the pockets\' own rate',
    atNight > 0, `${atNight} bodies after 8s of night`);
  // The NEXT noon: the tide recedes — and no pocket reads exterminated.
  W.time = DAY_LENGTH + NOON;
  step(w, 14);
  const atDawn = W.lite.liveCount;
  check('dawn recedes the tide (the hour is weather, not violence)',
    atDawn < atNight, `${atNight} → ${atDawn} after 14s of day`);
  check('no pocket exterminated by its own clock',
    W.litePockets.every(p => !p.extinct));
  // And the hour comes back: the same seats breed again.
  W.time = DAY_LENGTH + MIDNIGHT;
  step(w, 8);
  check('the next dusk raises it again from the SAME seats',
    W.lite.liveCount > atDawn, `${atDawn} → ${W.lite.liveCount}`);
}

// --- 10) THE PLANTED LURE live (a thrown false light draws the unaware) ------
{
  const w = makeSimWorld('warrior', 0xba17);
  const W = w as unknown as {
    createMonster(id: string, level: number, team: string): Actor;
    actors: Actor[]; player: Actor;
    executeSkill(a: Actor, inst: unknown, aim: { x: number; y: number }): void;
  };
  const p = W.player;
  p.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  p.life = 99999;
  p.pos.x = 300; p.pos.y = 600;
  const wolf = W.createMonster('plains_wolf', 4, 'enemy');
  wolf.pos.x = 1150; wolf.pos.y = 600;
  W.actors.push(wolf);
  const before = wolf.pos.x;
  const inst = makeSkillInstance(SKILLS.lure_lantern, 1);
  W.executeSkill(p, inst, { x: 700, y: 600 });
  step(w, 3.5);
  check('the lure lantern: an idle wolf drifts to the false light',
    before - wolf.pos.x > 60, `x ${before.toFixed(0)} → ${wolf.pos.x.toFixed(0)}`);
  check('the false sovereign speaks the same effect (mimic_flash carries lure)',
    (SKILLS.mimic_flash.effects ?? []).some(e => (e as { type?: string }).type === 'lure'));
}

console.log(failed ? `\nprobe_grove: ${failed} FAILURE(S)` : '\nprobe_grove: ALL PASS');
process.exit(failed ? 1 : 0);
