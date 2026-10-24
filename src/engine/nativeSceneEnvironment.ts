/** Exact ignored native environment birth draft. No World value import or source-authority claim. */
import { dist, rand, vec, type Vec2 } from "../core/math";
import { type DamageType } from "./stats";
import { STATUS_DEFS } from "./status";
import type { Actor } from "./actor";
import { MONSTERS } from "../data/monsters";
import { ELEMENTAL_TYPES } from "./stats";
import { type ZoneDef } from "../data/zones";
import { HARVEST_CFG } from "./harvest";
import { HARVEST_HUSK_KIND, harvestRowsFor, type HarvestNodeDef } from "../data/harvest";
import { normalizeDoodadBound, type Doodad, type DoodadKind } from "./levelgen";
import { sameStory } from "./tiers";
import { Rng } from "../core/rng";
import { zoneFeatureHarvest } from "../world/atlas";
import { CREEP_CFG } from "./creep";
import { anchorVent, GEYSER_CFG, lintGeyserSpec, rollGeyserField, seatVent, type GeyserSpec } from "./geysers";
import { attunedStatus, TUNE_CFG } from "./tuning";
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleHost, type PuzzleRun } from "./puzzles";
import { PUZZLES } from "../data/puzzles";
import type { World } from './world';
type ZoneMemory=NonNullable<Parameters<World['bootHarvest']>[2]>;
export interface NativeSceneEnvironmentHost {
  currentZoneSeed:World['currentZoneSeed'];
  interactSpot:World['interactSpot'];
  createMonster:World['createMonster'];
  clampPos:World['clampPos'];
  actors:World['actors'];
  puzzles:World['puzzles'];
  puzzleKnocks:World['puzzleKnocks'];
  puzzleHostCache:World['puzzleHostCache'];
  puzzleHost:World['puzzleHost'];
  setPuzzleTone:World['setPuzzleTone'];
  objectiveDone:World['objectiveDone'];
  harvestSessions:World['harvestSessions'];
  timeflow:Pick<World['timeflow'],'release'>;
  harvestDwell:World['harvestDwell'];
  harvestOffer:World['harvestOffer'];
  harvestNodes:World['harvestNodes'];
  harvestRowPick:World['harvestRowPick'];
  doodads:World['doodads'];
  geysers:World['geysers'];
  geyserSweepAcc:World['geyserSweepAcc'];
  geyserPocks:World['geyserPocks'];
  walk:World['walk'];
  pointInSolid:World['pointInSolid'];
  markDoodadsChanged:World['markDoodadsChanged'];
  zone:World['zone'];
  creep:World['creep'];
  player:World['player'];
  arena:World['arena'];
  time:World['time'];
  flashes:World['flashes'];
  completePuzzle:World['completePuzzle'];
}
export interface NativeSceneEnvironmentSources { readonly SCENERY_CFG: { readonly salt:number; readonly portalClear:number } }

export function sceneBootScenery(owner:NativeSceneEnvironmentHost, sources:NativeSceneEnvironmentSources, def: ZoneDef, pois: Vec2[]): void {
    const rows = def.scenery ?? [];
    if (!rows.length) return;
    const rng = new Rng((owner.currentZoneSeed ^ sources.SCENERY_CFG.salt) >>> 0);
    for (const row of rows) {
      if (!MONSTERS[row.monster]) {
        console.warn(`[world] zone '${def.id}' scenery names unknown monster '${row.monster}' — skipped`);
        continue;
      }
      const n = rng.int(row.count[0], row.count[1]);
      for (let i = 0; i < n; i++) {
        const at = owner.interactSpot(pois, rng, 560, sources.SCENERY_CFG.portalClear);
        const m = owner.createMonster(row.monster, Math.max(1, def.level), 'enemy');
        m.pos = owner.clampPos(
          vec(at.x + rng.range(-24, 24), at.y + rng.range(-24, 24)), m.radius);
        owner.actors.push(m);
      }
    }
  }

export function sceneBootPuzzles(owner:NativeSceneEnvironmentHost, def: ZoneDef, pois: Vec2[], memory?: ZoneMemory | null): void {
    owner.puzzles = [];
    owner.puzzleKnocks = []; // stale knocks never cross a zone boundary
    owner.puzzleHostCache = null; // closures rebind to the fresh zone
    const o = def.objective;
    const rows = def.puzzles ?? [];
    if (o.kind !== 'puzzle' && !rows.length) return;
    const rng = new Rng((owner.currentZoneSeed ^ PUZZLE_CFG.salt) >>> 0);
    const wants: { preset: string; isObjective: boolean }[] = [];
    if (o.kind === 'puzzle') {
      wants.push({
        preset: o.puzzle
          ?? (rows.length ? rows[rng.int(0, rows.length - 1)].id : PUZZLE_CFG.defaultPreset),
        isObjective: true,
      });
    }
    for (const row of rows) {
      if (wants.length >= PUZZLE_CFG.maxPerZone) break;
      if (wants.some(w => w.preset === row.id)) continue;
      if (rng.next() >= row.chance) continue;
      wants.push({ preset: row.id, isObjective: false });
    }
    const host = owner.puzzleHost();
    for (const want of wants) {
      const spec = PUZZLES[want.preset];
      const kind = spec ? PUZZLE_KINDS[spec.kind] : undefined;
      if (!spec || !kind) {
        console.warn(`[world] zone '${def.id}' names unknown puzzle preset '${want.preset}' — skipped`);
        continue;
      }
      const runId = `${want.preset}#${owner.puzzles.length}`;
      // Geometry: a centered grid, or an even ring around a (possible) heart.
      const seats: Vec2[] = [];
      let footprint: number;
      if (kind.geometry === 'grid') {
        const [gw, gh] = spec.grid ?? [3, 3];
        const pitch = spec.spacing ?? kind.spacing;
        footprint = ((Math.max(gw, gh) - 1) / 2) * pitch + 90;
        for (let r = 0; r < gh; r++) {
          for (let c = 0; c < gw; c++) {
            seats.push(vec((c - (gw - 1) / 2) * pitch, (r - (gh - 1) / 2) * pitch));
          }
        }
      } else {
        const band = spec.count ?? kind.count ?? [4, 5];
        let n = rng.int(band[0], band[1]);
        // THE GRAIN (PuzzleKindDef.quantize): kinds built of pairs/triads
        // round the roll DOWN to their multiple (floor one grain) — the
        // accord can never mint an orphan voice.
        const grain = kind.quantize ?? 1;
        if (grain > 1) n = Math.max(grain, Math.floor(n / grain) * grain);
        const ringR = spec.spacing ?? kind.spacing;
        footprint = ringR + 90;
        const a0 = rng.range(0, Math.PI * 2);
        for (let i = 0; i < n; i++) {
          const ang = a0 + (i / n) * Math.PI * 2;
          seats.push(vec(Math.cos(ang) * ringR, Math.sin(ang) * ringR));
        }
      }
      const at = owner.interactSpot(pois, rng, 680, PUZZLE_CFG.portalClear + footprint,
        /* rimMargin */ footprint);
      const nodes: Actor[] = [];
      const nodeDef = spec.node ?? kind.nodeMonster;
      for (let i = 0; i < seats.length; i++) {
        const m = owner.createMonster(nodeDef, Math.max(1, def.level), 'enemy');
        m.pos = owner.clampPos(vec(at.x + seats[i].x, at.y + seats[i].y), m.radius);
        m.puzzleNode = { id: runId, idx: i };
        owner.actors.push(m);
        nodes.push(m);
      }
      let heart: Actor | undefined;
      const heartDef = spec.heart === false ? undefined : spec.heart ?? kind.heartMonster;
      if (heartDef) {
        heart = owner.createMonster(heartDef, Math.max(1, def.level), 'enemy');
        heart.pos = owner.clampPos(vec(at.x, at.y), heart.radius);
        owner.actors.push(heart);
        // The heart's tone IS the riddle — rolled on the placement stream
        // (deterministic per zone seed), constrained by the spec's palette.
        const pool = spec.tones ?? [...ELEMENTAL_TYPES];
        owner.setPuzzleTone(heart, pool[rng.int(0, pool.length - 1)] ?? 'fire');
      }
      const run: PuzzleRun = {
        id: runId, spec, kind, at: vec(at.x, at.y), nodes,
        ...(heart ? { heart } : {}),
        state: {}, hums: new Map(), done: false, isObjective: want.isObjective,
      };
      owner.puzzles.push(run);
      kind.boot(run, host);
      // Remembered solves re-enter SOLVED; a completed puzzle OBJECTIVE
      // (completedObjectives — outlives zone memory) counts the same.
      if (memory?.puzzlesDone?.includes(runId) || (want.isObjective && owner.objectiveDone)) {
        run.done = true;
        kind.solved?.(run, host);
      }
    }
  }

export function sceneBootHarvest(owner:NativeSceneEnvironmentHost, def: ZoneDef, pois: Vec2[], memory?: ZoneMemory | null): void {
    // A rite never crosses a boundary: the node was committed at arm and
    // the leaving capture kept it spent — the entry itself dies unpaid.
    if (owner.harvestSessions.some(s => s.held)) owner.timeflow.release('harvest');
    owner.harvestSessions = [];
    owner.harvestDwell.clear();
    owner.harvestOffer.clear();
    owner.harvestNodes = [];
    if (def.objective.kind === 'safe' || def.spoils === 'none') return;
    const rows = harvestRowsFor(def.biome, def.tileset);
    if (!rows.length) return;
    const rng = new Rng((owner.currentZoneSeed ^ HARVEST_CFG.salt) >>> 0);
    // Fixed stream shape (the fog-bank law): the stand roll and the count
    // draw before any placement, hit or miss alike.
    const rolled = rng.next() < HARVEST_CFG.chance;
    const base = rng.int(HARVEST_CFG.count[0], HARVEST_CFG.count[1]);
    // THE HARVEST BOUNTY (world/atlas.ts): ground on a lode ALWAYS stands
    // nodes and stands more of them — the bonus draw lands AFTER the zone's
    // own two draws, so every feature-less zone's stream is byte-identical.
    const bounty = zoneFeatureHarvest(def.geo);
    const stands = rolled || !!bounty?.always;
    const n = base + (bounty ? rng.int(bounty.bonus[0], bounty.bonus[1]) : 0);
    if (!stands) return;
    const spent = memory?.harvestSpent;
    for (let i = 0; i < n; i++) {
      const row = owner.harvestRowPick(rows, rng);
      const at = owner.interactSpot(pois, rng, 620, HARVEST_CFG.portalClear);
      const pos = owner.clampPos(vec(at.x, at.y), HARVEST_CFG.nodeRadius);
      const isSpent = (spent?.[i] ?? 0) > 0;
      const d: Doodad = {
        pos: vec(pos.x, pos.y), radius: HARVEST_CFG.nodeRadius,
        kind: isSpent ? HARVEST_HUSK_KIND : row.kind,
        // THE DEBRIS FACE (the dissolution grammar D1): a re-placed spent
        // node wears its family's husk look, as the live crumble stamped it.
        ...(isSpent && row.husk ? { litterLook: row.husk } : {}),
      };
      owner.doodads.push(d);
      owner.harvestNodes.push({ pos: vec(pos.x, pos.y), def: row, doodad: d, spent: isSpent });
    }
  }

export function sceneBootGeysers(owner:NativeSceneEnvironmentHost, def: ZoneDef, pois: Vec2[], authored?: GeyserSpec[]): void {
    owner.geysers = null;
    owner.geyserSweepAcc = 0;
    owner.geyserPocks = [];
    const spec = def.theme.geysers;
    if (!spec && !authored?.length) return;
    if (spec) for (const g of lintGeyserSpec(spec, def.id)) console.warn(`[geysers] ${g}`);
    const rng = new Rng((owner.currentZoneSeed ^ GEYSER_CFG.salt) >>> 0);
    // The zone seed is THE SURGE HOUR's key (surgeWindowNear): the long
    // clock's per-zone phase — pure, so every seat and resume agree.
    const field = rollGeyserField(rng, spec ?? {}, (owner.currentZoneSeed ^ GEYSER_CFG.surge.salt) >>> 0);
    const P = GEYSER_CFG.place;
    const seated: Vec2[] = [];
    const clearSeat = (x: number, y: number, mouthR: number): boolean => {
      if (owner.walk && !owner.walk.isWalkable(x, y)) return false;
      if (owner.pointInSolid(x, y, mouthR)) return false;
      for (const s of seated) {
        if (Math.hypot(s.x - x, s.y - y) < P.minSep) return false;
      }
      return true;
    };
    // AUTHORED ROWS first (GeneratedLayout.authoredVents — the geyser
    // fabric's authoring seam; the lake's offshore metronome is the debut):
    // a row with its own clock, or any unshared row, is an ANCHOR (its own
    // private band — the metronome law); a `shared` row without a clock
    // seats on the current-band partition like a count-rolled vent. The
    // seat is the recipe's promise — it must still be clear (walkable, not
    // in a solid, spaced) or the row is dropped loudly.
    for (const row of authored ?? []) {
      if (!clearSeat(row.pos.x, row.pos.y, GEYSER_CFG.mouthR[row.cls])) {
        console.warn(`[geysers] '${def.id}': authored ${row.cls} vent at ${Math.round(row.pos.x)},${Math.round(row.pos.y)} has no clear seat — dropped`);
        continue;
      }
      if (row.shared && row.period === undefined && row.phase === undefined) {
        seatVent(field, rng, vec(row.pos.x, row.pos.y), row.cls);
      } else {
        anchorVent(field, rng, vec(row.pos.x, row.pos.y), row.cls,
          row.period !== undefined || row.phase !== undefined ? { period: row.period, phase: row.phase } : undefined);
      }
      seated.push(vec(row.pos.x, row.pos.y));
    }
    // THE METRONOMES next: each great vent is its OWN band anchor at a
    // landmark-grade seat (the charter's "one or two per zone" law).
    const nGreat = spec?.great ? rng.int(spec.great[0], spec.great[1]) : 0;
    for (let i = 0; i < nGreat; i++) {
      const at = owner.interactSpot(pois, rng, 700, P.greatClear);
      if (!clearSeat(at.x, at.y, GEYSER_CFG.mouthR.great)) continue;
      anchorVent(field, rng, vec(at.x, at.y), 'great');
      seated.push(at);
    }
    // The shared-band population: cluster hearts off the leftover-POI
    // stream, vents scattered around each heart on the same stream — a
    // heart's spray reads as one spring line once its band surges.
    for (const cls of ['geyser', 'hiss'] as const) {
      const band = spec?.[cls];
      if (!band) continue;
      const want = rng.int(band[0], band[1]);
      let heart: Vec2 | null = null;
      let onHeart = 0;
      for (let i = 0; i < want; i++) {
        if (!heart || onHeart >= 4) {
          heart = owner.interactSpot(pois, rng, P.heartReach, P.portalClear);
          onHeart = 0;
        }
        let placed = false;
        for (let t = 0; t < P.tries && !placed; t++) {
          const ang = rng.range(0, Math.PI * 2);
          const d = rng.range(P.scatter[0], P.scatter[1]);
          const x = heart.x + Math.cos(ang) * d, y = heart.y + Math.sin(ang) * d;
          if (!clearSeat(x, y, GEYSER_CFG.mouthR[cls])) continue;
          seatVent(field, rng, vec(x, y), cls);
          seated.push(vec(x, y));
          placed = true;
        }
        onHeart++;
      }
    }
    if (!field.vents.length) return;
    // The drawn mouths: one non-blocking fixture doodad per vent (kind
    // 'beat_vent' — NOT the static marsh 'geyser', the namespace law).
    // Transient like the field: re-derived per load, never in layouts.
    for (const v of field.vents) {
      const d: Doodad = {
        pos: vec(v.pos.x, v.pos.y), radius: GEYSER_CFG.mouthR[v.cls],
        kind: 'beat_vent' as DoodadKind, rot: rng.range(0, Math.PI * 2),
      };
      normalizeDoodadBound(d);
      owner.doodads.push(d);
      owner.markDoodadsChanged(d);
    }
    owner.geysers = field;
  }

export function sceneBootEscapeChase(owner:NativeSceneEnvironmentHost): void {
    if (owner.zone.objective.kind !== 'escape' || !owner.creep) return;
    const p = owner.player;
    const bearing = Math.atan2(owner.arena.h / 2 - p.pos.y, owner.arena.w / 2 - p.pos.x);
    const back = CREEP_CFG.front.heelsBack;
    owner.creep.fieldHeels(p.pos.x - Math.cos(bearing) * back, p.pos.y - Math.sin(bearing) * back, bearing);
  }

export function sceneHarvestRowPick(owner:NativeSceneEnvironmentHost, rows: HarvestNodeDef[], rng: Rng): HarvestNodeDef {
    let total = 0;
    for (const r of rows) total += r.weight ?? 1;
    let roll = rng.next() * total;
    for (const r of rows) { roll -= r.weight ?? 1; if (roll <= 0) return r; }
    return rows[rows.length - 1];
  }

export function scenePuzzleHost(owner:NativeSceneEnvironmentHost, run?: PuzzleRun): PuzzleHost {
    // SOVEREIGNTY: census — a puzzle host read (the derived census, probe_tiers RIG T).
    owner.puzzleHostCache ??= {
      now: () => owner.time,
      rng: () => rand(0, 1),
      flash: (pos, radius, color, life = 0.25) =>
        owner.flashes.push({ pos: vec(pos.x, pos.y), radius, color, life, maxLife: life }),
      // Native tones, kindled crystals and mistake/completion flashes show local progress.
      say: () => {},
      setTone: (node, tone) => owner.setPuzzleTone(node, tone),
      kindle: (node, seconds) => node.applyStatus(PUZZLE_CFG.kindleStatus, 0,
        seconds / Math.max(0.01, STATUS_DEFS[PUZZLE_CFG.kindleStatus]?.duration ?? 1), 'the refrain'),
      quench: node => node.endStatus(PUZZLE_CFG.kindleStatus),
      heroNear: (pos, within) => owner.actors.some(x => !x.dead && x.team === 'player'
        && x.kind !== 'minion' && x.kind !== 'mercenary' && dist(x.pos, pos) <= within),
      complete: run => owner.completePuzzle(run),
    };
    if (run?.owner) return { ...owner.puzzleHostCache,
      heroNear: (pos, within) => owner.actors.some(x => !x.dead && x.team === 'player'
        && x.kind !== 'minion' && x.kind !== 'mercenary' && sameStory(x, run.nodes[0]) && dist(x.pos, pos) <= within),
    };
    return owner.puzzleHostCache;
  }

export function sceneSetPuzzleTone(owner:NativeSceneEnvironmentHost, a: Actor, tone: DamageType): void {
    if (a.tone === tone) return;
    if (a.tone) a.endStatus(attunedStatus(a.tone));
    a.tone = tone;
    a.applyStatus(attunedStatus(tone), 0, TUNE_CFG.holdScale, 'attunement');
  }
