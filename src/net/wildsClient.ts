// ---------------------------------------------------------------------------
// THE WILDS ON THE WIRE — the render shell's half of a hosted Unbroken Wilds
// (docs/design/shard-world.md §3.12). THE LAND IS THE SEED'S, THE LIFE IS THE
// SERVER'S: the shell starts the seamless foundation's mass runtime from the
// shard's seed in RESTORE-ONLY posture (inert — it births no natives, runs no
// sim; World.update never runs on a client), streams terrain pages around
// the shell's own hero with the runtime's PUBLIC pieces (the body of
// WorldMassRuntime.update's streaming block, copied, since the runtime
// exposes no stream-only entry), and takes every body, drop and doodad from
// the wire exactly as a classic client does.
//
// Two laws the zone message would otherwise break: applyZone nulls
// `world.walk` (a MassWalk is not a packed grid) — the shell re-seats the
// runtime's walk after every zone message, so prediction clamps on the real
// ground; and a POCKET (a native cave, a side area) arrives as an ordinary
// zone id: the runtime is PARKED for the pocket (THE RUNTIME SURVIVES
// POCKETS: detached from the World, never disposed) and re-seated when the
// surface returns, so the map's survey, the page cache and the runtime itself
// outlive every cave without a second boot. The town tier the runtime lays
// comes from the account the shell was built with, so the shell is built with
// the SHARD's town features (the welcome carries them), the one divergence
// the seed alone cannot pin.
//
// THE ONE CROSSING (net/crossing.ts) reads `wildsShellRing`: the cover over a
// hosted arrival stands until the pages around the hero are published. THE
// KEPT MAP: the survey's explored cells persist per world and account in
// localStorage (read through MassState.snapshot, re-claimed through
// MassState.claim at the next login: the runtime's public state API).
// ---------------------------------------------------------------------------

import { canonical, massDigest } from '../worldmass/random';
import type { World } from '../engine/world';
import type { WorldMassRuntime } from '../worldmass/runtime';
import type { Vec2 } from '../core/math';
import { MASS_ZONE } from '../worldmass/preset';
import { cellKey, localOffset, neighborCell, type MassCell } from '../worldmass/address';
import { storageKey } from '../buildProfile';
import { applyZone, type ZoneMsg } from './snapshot';

export const WILDS_CLIENT_CFG = {
  /** Survey (map memory) observation cadence in frames — the runtime observes
   *  on its half-second beat; the shell matches it at 60 fps. */
  surveyEveryFrames: 30,
  /** THE ONE CROSSING: the cover over a hosted arrival stands until every page
   *  this many cells around the hero's own page is published (1 = the 3x3 the
   *  screen shows; the outer ring keeps streaming behind the released cover). */
  coverRing: 1,
  /** THE KEPT MAP: a growing survey is written at most this often (frames, about
   *  two minutes at 60 fps, in idle time), and at every pocket, leave and page hide. */
  keepEveryFrames: 7200,
  /** THE KEPT MAP: the most pages one world keeps per account (64 survey cells a page). */
  keepMaxPages: 4096,
};

/** Is this shell showing a hosted wilds surface right now? */
export function wildsShellActive(world: World): boolean {
  return world.massRuntime !== null && world.zone.id === MASS_ZONE;
}

/** THE RUNTIME SURVIVES POCKETS: the inert runtime of a shell standing in a pocket. */
const parked = new WeakMap<World, WorldMassRuntime>();

/** Stand the mass runtime up on a render shell, inert. Idempotent; a runtime parked
 *  for a pocket is re-seated, never rebooted (THE RUNTIME SURVIVES POCKETS). With
 *  `land` (the welcome's THE LAND DIGEST) the shell proves it lays the land the shard
 *  runs: a client built on another preset refuses loudly instead of walking into
 *  walls the server does not have. */
export function wildsShellAttach(world: World, seed: number, land?: string): void {
  if (world.massRuntime) return;
  const kept = parked.get(world);
  if (kept) { parked.delete(world); world.massRuntime = kept; world.walk = kept.walk; return; }
  world.startWorldMass(seed >>> 0, undefined, { restoreOnly: true });
  const rt = world.massRuntime as World['massRuntime']; // re-read: the early return above narrowed the property for TS
  if (land && rt) {
    const mine = massDigest(rt.config);
    if (mine !== land) {
      rt.dispose(); world.massRuntime = null;
      throw new Error('this build lays another land than the server runs (update the game, or the server)');
    }
  }
}

/** Tear the shell's runtime down (a leave, a new session), a parked one too; THE KEPT
 *  MAP is written first. Idempotent. */
export function wildsShellDetach(world: World): void {
  wildsShellKeep(world);
  const rest = parked.get(world);
  parked.delete(world);
  rest?.dispose();
  keptMaps.delete(world);
  if (livingShell === world) livingShell = null;
  if (!world.massRuntime) return;
  world.massRuntime.dispose();
  world.massRuntime = null;
}

/** The shard's zone message, on a wilds shell: the surface re-seats the runtime's
 *  walk under the server's doodads; a pocket PARKS the runtime (THE RUNTIME SURVIVES
 *  POCKETS) so the classic terrain paints. Returns whether the zone is the surface. */
export function wildsShellZone(world: World, msg: ZoneMsg, seed: number): boolean {
  if (msg.zoneId === MASS_ZONE) {
    wildsShellAttach(world, seed);
    applyZone(world, msg);
    world.walk = world.massRuntime!.walk; // applyZone nulled it: the MassWalk IS the ground
    nearKeys.delete(world);               // re-request the pages around wherever we stand
    // THE SHARD'S OPEN DOORS: a door the shard opened before this message is open in the shell's
    // own settlement grid too. applyZone adopts each door's open flag, so the snapshot's
    // idempotent setDoorState never repaints it (a login met the Waking House door shut in its walk).
    for (const d of world.doodads) {
      const c = d.door?.cells;
      if (c && (d.door!.open || d.door!.broken)) world.nativeGridAt(d.pos)?.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');
    }
    return true;
  }
  const rt = world.massRuntime;
  if (rt) {
    wildsShellKeep(world); // the map so far is written while the hand-off holds the frame
    parked.set(world, rt);
    world.massRuntime = null;
  }
  applyZone(world, msg);
  return false;
}

const nearKeys = new WeakMap<World, string>();
const surveyFrames = new WeakMap<World, number>();

/** Per frame: stream terrain around `pos` (the shell's own hero), keep the
 *  sky on the shard's clock, and let the map remember what the hero saw.
 *  The streaming is WorldMassRuntime.update's own block over its public
 *  members; nothing here births a body or claims state. */
export function wildsShellStream(world: World, pos: Vec2): void {
  const mass = world.massRuntime;
  if (!mass || world.zone.id !== MASS_ZONE) return;
  const at = mass.walk.at(pos.x, pos.y);
  const key = cellKey(at);
  if (key !== nearKeys.get(world)) {
    nearKeys.set(world, key);
    const r = mass.config.pageRadius;
    const cells: { cell: MassCell; distance: number }[] = [];
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) cells.push({ cell: neighborCell(at, x, y), distance: x * x + y * y });
    cells.sort((a, b) => a.distance - b.distance);
    mass.stream.request(cells.map(c => c.cell));
  }
  mass.stream.step(mass.config.samplesPerTick);
  // The sky follows the shard's clock (snapshots carry it), never backwards.
  if (mass.weather && world.time > mass.weather.time) mass.weather.advanceTo(world.time);
  // Map memory on the runtime's own half-second beat (its observe predicate, verbatim).
  const n = (surveyFrames.get(world) ?? 0) + 1;
  surveyFrames.set(world, n);
  if (n % WILDS_CLIENT_CFG.surveyEveryFrames === 0 && !world.player.dead) {
    const span = mass.config.terrain.addressSpan;
    mass.survey.observe(at, target => world.lineOfSight(world.player.pos,
      localOffset(target, { ...mass.origin, x: 0, y: 0 }, span), world.player.tier));
  }
  // THE KEPT MAP: a grown survey is written now and then, in idle time.
  const kept = keptMaps.get(world);
  if (kept && ++kept.frames >= WILDS_CLIENT_CFG.keepEveryFrames) {
    kept.frames = 0;
    if (mass.state.revision !== kept.rev) {
      const g = globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (typeof g.requestIdleCallback === 'function') g.requestIdleCallback(() => { wildsShellKeep(world); }, { timeout: 2000 });
      else wildsShellKeep(world);
    }
  }
}

/** THE ONE CROSSING's read: the pages within `coverRing` of the hero's own page, and
 *  whether every one is published. Anything but a hosted surface reads ready. */
export function wildsShellRing(world: World, pos: Vec2 = world.player.pos): { ready: boolean; pending: number; total: number } {
  const mass = world.massRuntime;
  if (!mass || world.zone.id !== MASS_ZONE) return { ready: true, pending: 0, total: 0 };
  const at = mass.walk.at(pos.x, pos.y), r = WILDS_CLIENT_CFG.coverRing;
  let pending = 0;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (!mass.stream.page(neighborCell(at, x, y))) pending++;
  return { ready: pending === 0, pending, total: (2 * r + 1) ** 2 };
}

// ---------------------------------------------------------------- THE KEPT MAP --
// The survey's claims are MassState claims of one kind (MassSurvey's, named by its
// spec's source); their ids are canonical [page cellKey, cell x, cell y] rows. A
// page's cells pack into one hex mask (64 cells a page is 16 characters), so a long
// exploration stays small; an id of any other shape rides `odd` verbatim. Reading
// is MassState.snapshot (the public state), re-claiming MassState.claim; nothing
// here edits the runtime. A record names its land (THE LAND DIGEST): another
// preset's map is never laid over this one.

interface KeptMap { key: string; land?: string; rev: number; frames: number }
interface KeptMapRecord { v: 1; land?: string; kind: string; side: number; pages: Record<string, string>; odd?: string[] }

const keptMaps = new WeakMap<World, KeptMap>();
/** The one shell a page holds (its page-hide write). */
let livingShell: World | null = null;

function mapStore(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
/** The survey's claim kind (MassSurvey's own: canonical(['survey', source])); none without a survey. */
function surveyKind(rt: WorldMassRuntime): string | null {
  return rt.survey.spec ? canonical(['survey', rt.survey.spec.source]) : null;
}
/** Survey cells per page side (the address span over the survey cell). */
function surveySide(rt: WorldMassRuntime): number {
  const spec = rt.survey.spec, side = spec ? rt.config.terrain.addressSpan / spec.cell : 0;
  return Number.isInteger(side) && side >= 1 && side <= 64 ? side : 0;
}
/** The storage key of one world's map for one account. */
export function wildsMapKey(accountId: string, seed: number): string {
  return `${storageKey('hw_wilds_map')}:${accountId}:${(seed >>> 0).toString(16)}`;
}

function packSurvey(ids: readonly string[], side: number): { pages: Record<string, string>; odd: string[] } {
  const masks = new Map<string, Uint8Array>(), odd: string[] = [];
  const nibbles = Math.ceil(side * side / 4);
  for (const id of ids) {
    let row: unknown;
    try { row = JSON.parse(id); } catch { row = null; }
    const ok = Array.isArray(row) && row.length === 3 && typeof row[0] === 'string'
      && Number.isInteger(row[1]) && Number.isInteger(row[2])
      && row[1] >= 0 && row[1] < side && row[2] >= 0 && row[2] < side && canonical(row) === id;
    if (!ok) { if (odd.length < 512) odd.push(id); continue; }
    const [page, x, y] = row as [string, number, number];
    let m = masks.get(page);
    if (!m) {
      if (masks.size >= WILDS_CLIENT_CFG.keepMaxPages) continue;
      m = new Uint8Array(nibbles); masks.set(page, m);
    }
    const b = y * side + x;
    m[b >> 2] |= 1 << (b & 3);
  }
  const pages: Record<string, string> = {};
  for (const [page, m] of masks) pages[page] = Array.from(m, n => n.toString(16)).join('');
  return { pages, odd };
}

function unpackSurvey(rec: KeptMapRecord): string[] {
  const ids: string[] = [], side = rec.side, nibbles = Math.ceil(side * side / 4);
  for (const [page, mask] of Object.entries(rec.pages).slice(0, WILDS_CLIENT_CFG.keepMaxPages)) {
    if (typeof mask !== 'string' || mask.length !== nibbles || !/^[0-9a-f]+$/.test(mask)) continue;
    for (let i = 0; i < nibbles; i++) {
      const n = parseInt(mask[i], 16);
      for (let bit = 0; bit < 4; bit++) {
        const b = i * 4 + bit;
        if (n & (1 << bit) && b < side * side) ids.push(canonical([page, b % side, Math.floor(b / side)]));
      }
    }
  }
  for (const id of rec.odd ?? []) if (typeof id === 'string' && id && id.length <= 512) ids.push(id);
  return ids;
}

/** THE KEPT MAP at login: bind this shell's map to `accountId` and its world, and
 *  re-claim every cell a past session of this account explored there. Returns the
 *  cells re-claimed (0 for a first visit, another land, or no storage). */
export function wildsShellRemember(world: World, accountId: string | undefined, seed: number, land?: string): number {
  const rt = world.massRuntime, kind = rt && surveyKind(rt), side = rt ? surveySide(rt) : 0;
  if (!rt || !kind || !side || !accountId) return 0;
  const kept: KeptMap = { key: wildsMapKey(accountId, seed), land, rev: -1, frames: 0 };
  keptMaps.set(world, kept);
  livingShell = world;
  let rec: KeptMapRecord | null = null;
  try {
    const raw = mapStore()?.getItem(kept.key);
    const v = raw ? JSON.parse(raw) as Partial<KeptMapRecord> : null;
    if (v && v.v === 1 && v.kind === kind && v.side === side && v.pages && typeof v.pages === 'object'
      && !(land && v.land && v.land !== land)) rec = v as KeptMapRecord;
  } catch { rec = null; }
  let claimed = 0;
  if (rec) for (const id of unpackSurvey(rec)) if (rt.state.claim(kind, id)) claimed++;
  kept.rev = rt.state.revision;
  return claimed;
}

/** THE KEPT MAP, written now (a pocket, a leave, a page hide, the idle beat). */
export function wildsShellKeep(world: World): boolean {
  const kept = keptMaps.get(world), rt = world.massRuntime ?? parked.get(world) ?? null;
  const kind = rt && surveyKind(rt), side = rt ? surveySide(rt) : 0, store = mapStore();
  if (!kept || !rt || !kind || !side || !store) return false;
  kept.rev = rt.state.revision;
  const ids = rt.state.snapshot().claims.filter(c => c[0] === kind).map(c => c[1]);
  const { pages, odd } = packSurvey(ids, side);
  const rec: KeptMapRecord = { v: 1, ...(kept.land ? { land: kept.land } : {}), kind, side, pages, ...(odd.length ? { odd } : {}) };
  try { store.setItem(kept.key, JSON.stringify(rec)); return true; } catch { return false; } // a full store keeps the last map
}

// The page's last word: a closing tab writes the map it walked.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => { if (livingShell) wildsShellKeep(livingShell); });
}
