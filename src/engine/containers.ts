// ---------------------------------------------------------------------------
// THE CONTAINER FABRIC — side inventories as data.
//
// A CONTAINER is a second tetris board beside the one bag: a registered
// ContainerDef names WHAT it accepts (item categories / base tags), whether
// what sits in it is ACTIVE (its compiled mods fold into the seat's sheet
// through one attributable source, 'container:<id>', exactly the way a doll
// slot's gear does), and the SHAPE of its board as a LADDER of account
// features — every rung is a char-grid FRAME of cells it OPENS on the
// container's canvas, and the live board is the UNION of the frames the
// account owns. So "a hollow-centred case that grows as the Vault sells its
// rungs" is four data rows, and a future pouch, a quiver, a spellbook, a
// second bag are one ContainerDef each: the bag's own placement law
// (engine/inventory.ts — canPlaceAt / swapBlockerFits / autoPlace, now
// mask-aware through BoardDims.open) serves every board, so drawn == tested
// wherever a piece lands.
//
// THE LAWS:
//  · EXISTENCE: rung 0's feature IS the container — unowned, the container
//    has no board (null), no tab, no menu page (the menu bar's existence law).
//  · THE MASK: a footprint lands only on OPEN cells (the cell law, one
//    resolver); sealed cells are drawn dim with the rung that opens them
//    (containerRungAt) — the ladder teaches itself on the face.
//  · ACTIVE MEANS SEATED: an accepted item is INERT anywhere else (bag,
//    floor, corpse); only a seat in an active container speaks its lines.
//  · SLOTLESS CARRY: the categories a container accepts register in
//    items.ts CONTAINER_CATEGORIES, so the drop roller carries them without
//    a doll slot (the relic has no body seat and needs none).
//  · DISCOVERY: `foundLedger` stamps the account at the first GENUINE world
//    mint of an accepted item (World.dropGearAt) — the Vault card appears
//    once the player has SEEN one; buying nothing before the world has
//    taught it (the gem index's own doctrine).
//  · THE ONE READ: containerBoard(def) resolves through an installed source
//    (the World's account fold; a co-op client's shipped boards), so the
//    engine, the panel, and the landing preview all test the same cells.
//
// The bag stays the implicit container (its own ladder lives in
// inventory.ts BAG_CFG); this file never redefines it.
// ---------------------------------------------------------------------------

import { canPlaceAt, swapBlockerFits, type BoardDims } from './inventory';
import { itemGridSize, itemLevelReq } from './itemgen';
import { CONTAINER_CATEGORIES, type ItemCategory, type ItemInstance } from './items';
import { ITEM_BASES } from '../data/itembases';
import type { GateRow } from '../meta/gates';
import { DERIVED_GAUGES, registerDerivedGauge } from './gauges';
import type { Modifier } from './stats';
import { seatPowerOf, seatedGaugeId } from './seatlaw';

// ------------------------------------------------------------------- defs ---

/** One rung of a container's growth. Rung 0 IS the container (its feature
 *  is existence); every later rung opens more cells. Frames are char grids
 *  on the container's canvas: '#' opens a cell, anything else leaves it. */
export interface ContainerRung {
  /** The account feature flag whose ownership opens these cells (FEATURE.*). */
  feature: string;
  /** The Vault card's face + story (meta/unlocks.ts derives the row). */
  label: string;
  description: string;
  cost: number;
  /** The cells this rung OPENS, as a char grid ('#' = open). Rows may be
   *  ragged/short — the canvas is the union of every rung's extent. */
  cells: readonly string[];
  /** THE GATEWORK avenues (any-of) the Vault hangs on this rung, and the
   *  optional ledger presence key(s) ANDed beside them. */
  reqAnyOf?: readonly GateRow[];
  reqLedger?: string | string[];
  /** Surface SEALED once the previous rung is owned while these gates
   *  stand unmet (the Vault's tease law). */
  tease?: boolean;
}

export interface ContainerAccepts {
  categories?: readonly ItemCategory[];
  /** Base TAGS (ItemBaseDef.tags) — any match admits the piece. */
  tags?: readonly string[];
}

export interface ContainerDef {
  id: string;
  label: string;
  /** The face glyph (tab, tray, tooltip). */
  glyph: string;
  /** ui/icons.ts row for the menu page. */
  icon: string;
  blurb: string;
  accepts: ContainerAccepts;
  /** Seated pieces fold their compiled mods into the seat's sheet. */
  active: boolean;
  /** Seating honors the piece's level requirement (default true). */
  levelGate?: boolean;
  /** THE DISCOVERY LEDGER: account key stamped when a genuine world mint of
   *  an accepted piece lands (World.dropGearAt) — the Vault card's gate. */
  foundLedger?: string;
  ladder: readonly ContainerRung[];
}

/** A resolved board: the canvas and one OPEN flag per cell, row-major. */
export interface ContainerBoard {
  w: number;
  h: number;
  open: readonly boolean[];
  /** Open-cell count — the face's "n/m" read. */
  cells: number;
}

/** The wire/save shape of a board (co-op ships the host's fold). */
export interface ContainerBoardW { w: number; h: number; mask: string }

export const CONTAINER_CFG = {
  /** A cell no rung ever opens still paints, but as void (the canvas is a
   *  rectangle; the shape is the ladder's). */
  drawVoid: false,
};

// --------------------------------------------------------------- registry --

export const CONTAINERS: Record<string, ContainerDef> = {};
const ORDER: string[] = [];

/** Register (or replace, by id — the registerStamp override idiom) a
 *  container. Its accepted categories join CONTAINER_CATEGORIES so the
 *  drop roller carries them without a doll slot. Validates the ladder:
 *  a container needs a first rung that opens at least one cell. */
export function registerContainer(def: ContainerDef): ContainerDef {
  if (!def.ladder.length) throw new Error(`container '${def.id}': an empty ladder has no board`);
  if (frameCells(def.ladder[0].cells).length === 0) {
    throw new Error(`container '${def.id}': rung 0 ('${def.ladder[0].label}') opens no cell`);
  }
  const seen = new Set<string>();
  for (const r of def.ladder) {
    if (seen.has(r.feature)) throw new Error(`container '${def.id}': feature '${r.feature}' rung repeated`);
    seen.add(r.feature);
  }
  if (!CONTAINERS[def.id]) ORDER.push(def.id);
  CONTAINERS[def.id] = def;
  for (const c of def.accepts.categories ?? []) CONTAINER_CATEGORIES.add(c);
  // THE CASE GAUGE (seatlaw.ts): 'seated:<id>' — the pieces seated on the
  // live board, published like every derived gauge (sampled only for a
  // body whose sheet reads it; GaugeWorld.carryOf is the World's read).
  const gaugeId = seatedGaugeId(def.id);
  if (!DERIVED_GAUGES[gaugeId]) {
    registerDerivedGauge(gaugeId, {
      label: `per piece seated in your ${def.label}`,
      sample: (a, w) => {
        const held = w.carryOf?.(a)?.containers[def.id];
        if (!held?.length) return 0;
        const board = containerBoard(CONTAINERS[def.id] ?? def);
        return board ? Math.min(board.cells, held.length - containerMisfits(board, held).length) : 0;
      },
    });
  }
  return def;
}

/** Every registered container, in registration order. */
export function containerList(): ContainerDef[] {
  return ORDER.map(id => CONTAINERS[id]);
}

// ------------------------------------------------------------------ frames --

function frameCells(cells: readonly string[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  cells.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') out.push({ x, y });
  });
  return out;
}

/** The canvas: the union extent of every rung's frame. */
export function containerCanvas(def: ContainerDef): { w: number; h: number } {
  let w = 0, h = 0;
  for (const r of def.ladder) {
    h = Math.max(h, r.cells.length);
    for (const row of r.cells) w = Math.max(w, row.length);
  }
  return { w, h };
}

function unionBoard(def: ContainerDef, rungs: readonly ContainerRung[]): ContainerBoard {
  const { w, h } = containerCanvas(def);
  const open = new Array<boolean>(w * h).fill(false);
  let cells = 0;
  for (const r of rungs) {
    for (const c of frameCells(r.cells)) {
      const i = c.y * w + c.x;
      if (!open[i]) { open[i] = true; cells++; }
    }
  }
  return { w, h, open, cells };
}

/** The board an account's features earn: null while rung 0 is unowned
 *  (the container does not exist for this account), else the union of
 *  every owned rung's frame. Pure. */
export function containerBoardFor(def: ContainerDef, features: ReadonlySet<string> | undefined): ContainerBoard | null {
  if (!features?.has(def.ladder[0].feature)) return null;
  return unionBoard(def, def.ladder.filter(r => features.has(r.feature)));
}

/** The container FULLY grown — every rung's cells open. The face draws this
 *  shape and dims the cells the live board has not opened yet. */
export function containerFullBoard(def: ContainerDef): ContainerBoard {
  return unionBoard(def, def.ladder);
}

/** The rung that opens a cell — the sealed cell's own tell ("opens with
 *  Wider Shelves"). null for a cell no rung ever opens. */
export function containerRungAt(def: ContainerDef, x: number, y: number): ContainerRung | null {
  for (const r of def.ladder) {
    if (r.cells[y]?.[x] === '#') return r;
  }
  return null;
}

/** Is a cell open on a board (out of bounds = closed)? */
export function boardOpenAt(board: ContainerBoard, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= board.w || y >= board.h) return false;
  return board.open[y * board.w + x];
}

/** The placement law's view of a board — every inventory.ts helper takes it. */
export function boardDims(board: ContainerBoard): BoardDims {
  return { w: board.w, h: board.h, open: (x, y) => boardOpenAt(board, x, y) };
}

export function packContainerBoard(board: ContainerBoard): ContainerBoardW {
  return { w: board.w, h: board.h, mask: board.open.map(o => (o ? '#' : '.')).join('') };
}

export function unpackContainerBoard(w: ContainerBoardW): ContainerBoard {
  const open: boolean[] = [];
  let cells = 0;
  for (let i = 0; i < w.w * w.h; i++) {
    const o = w.mask[i] === '#';
    open.push(o);
    if (o) cells++;
  }
  return { w: w.w, h: w.h, open, cells };
}

// ---------------------------------------------------------------- the read --

let boardSource: ((def: ContainerDef) => ContainerBoard | null) | null = null;

/** Install the live board read (the World's account fold; a client's shipped
 *  boards); null restores the bare "no account" read (headless rigs). */
export function setContainerBoardSource(fn: ((def: ContainerDef) => ContainerBoard | null) | null): void {
  boardSource = fn;
}

/** THE ONE READ of a container's live board — null when it does not exist
 *  for the account in play. */
export function containerBoard(def: ContainerDef): ContainerBoard | null {
  return boardSource ? boardSource(def) : null;
}

// --------------------------------------------------------------- accepting --

/** Does the container take this piece? Category or base-tag match. */
export function containerAccepts(def: ContainerDef, item: ItemInstance): boolean {
  const base = ITEM_BASES[item.baseId];
  if (!base) return false;
  if (def.accepts.categories?.includes(base.category)) return true;
  if (def.accepts.tags?.some(t => base.tags.includes(t))) return true;
  return false;
}

/** The first registered container that accepts a piece (the slot verb's
 *  and the tooltip's read), regardless of ownership. */
export function containerFor(item: ItemInstance): ContainerDef | null {
  for (const c of containerList()) if (containerAccepts(c, item)) return c;
  return null;
}

/** The categories any registered container accepts (the drop roller's
 *  slotless-carry read is items.ts CONTAINER_CATEGORIES; this is the
 *  def-side census). */
export function containerCategories(): Set<ItemCategory> {
  const out = new Set<ItemCategory>();
  for (const c of containerList()) for (const cat of c.accepts.categories ?? []) out.add(cat);
  return out;
}

// ------------------------------------------------------------- the carry ---

/** The carry a seat holds — the shape findCarried reads (PlayerMeta is a
 *  superset; a snapshot/save row can pass itself). */
export interface CarrySlice {
  items: readonly ItemInstance[];
  equipped: Partial<Record<string, ItemInstance>>;
  containers: Record<string, readonly ItemInstance[]>;
}

export type CarriedWhere =
  | { kind: 'bag' }
  | { kind: 'worn'; slot: string }
  | { kind: 'container'; container: string };

/** ONE lookup for "where is this uid carried" — bag, doll, or a container.
 *  Every gesture, tooltip and intent that addresses a piece by uid reads
 *  this, so a container item is never a mistaken miss. */
export function findCarried(m: CarrySlice, uid: number): { item: ItemInstance; where: CarriedWhere } | undefined {
  const bagged = m.items.find(i => i.uid === uid);
  if (bagged) return { item: bagged, where: { kind: 'bag' } };
  for (const slot of Object.keys(m.equipped)) {
    const it = m.equipped[slot];
    if (it?.uid === uid) return { item: it, where: { kind: 'worn', slot } };
  }
  for (const cid of Object.keys(m.containers)) {
    const it = m.containers[cid].find(i => i.uid === uid);
    if (it) return { item: it, where: { kind: 'container', container: cid } };
  }
  return undefined;
}

/** The drag fabric's origin word for a carried piece: 'bag', a doll slot id,
 *  or 'c:<containerId>' (containerOriginPrefix). */
export const CONTAINER_ORIGIN_PREFIX = 'c:';

export function containerOriginOf(m: CarrySlice, uid: number): string {
  const found = findCarried(m, uid);
  if (!found) return 'bag';
  switch (found.where.kind) {
    case 'bag': return 'bag';
    case 'worn': return found.where.slot;
    case 'container': return CONTAINER_ORIGIN_PREFIX + found.where.container;
  }
}

/** The container id an origin word names, or null. */
export function originContainerId(from: string): string | null {
  return from.startsWith(CONTAINER_ORIGIN_PREFIX) ? from.slice(CONTAINER_ORIGIN_PREFIX.length) : null;
}

// ---------------------------------------------------------------- landing --

export type ContainerVerdict = 'place' | 'swap' | 'blocked';

/** THE LANDING LAW for a container cell — the ONE verdict the engine's
 *  containerPlace/containerMove act on and the panel's preview paints. */
export interface ContainerLanding {
  verdict: ContainerVerdict;
  x: number; y: number; w: number; h: number;
  /** The one piece a swap trades with (it takes the mover's vacated cell —
   *  inside the container for a re-place, in the BAG for a bag→container
   *  landing). */
  with?: ItemInstance;
  /** The refusal, when blocked and a reason is known. */
  why?: string;
}

/** Why a piece may not be SEATED at all (accept / existence / level), or
 *  null when it may. Shared by the intent and the preview so they refuse
 *  with one voice. */
export function containerSeatRefusal(
  def: ContainerDef, board: ContainerBoard | null, item: ItemInstance, level: number,
): string | null {
  if (!board) return `the ${def.label} is not yours yet`;
  if (!containerAccepts(def, item)) return `the ${def.label} does not take that`;
  if (def.levelGate !== false) {
    const req = itemLevelReq(item);
    if (level < req) return `requires level ${req}`;
  }
  return null;
}

/** Resolve a piece landing with its origin at (x, y) on a container board.
 *  `held` is the container's current contents; `from` is where the piece
 *  lifted ('bag', this container, or elsewhere); `bag` + `bagBoardDims`
 *  let a bag→container landing SWAP with one blocker that fits the bag
 *  cell the mover vacates (the tetris shuffle across boards). */
export function containerLanding(
  def: ContainerDef, board: ContainerBoard | null, held: readonly ItemInstance[],
  item: ItemInstance, from: 'bag' | 'self' | 'other', x: number, y: number,
  level: number, bag?: readonly ItemInstance[], bagBoardDims?: BoardDims,
): ContainerLanding {
  const s = itemGridSize(item);
  const base: ContainerLanding = { verdict: 'blocked', x, y, w: s.w, h: s.h };
  const refusal = containerSeatRefusal(def, board, item, level);
  if (refusal || !board) return { ...base, why: refusal ?? undefined };
  if (from === 'other') return { ...base, why: 'move it to the bag first' };
  const dims = boardDims(board);
  if (canPlaceAt(held, item, x, y, dims)) return { ...base, verdict: 'place' };
  if (from === 'self') {
    const other = swapBlockerFits(held, item, x, y, dims);
    return other ? { ...base, verdict: 'swap', with: other } : base;
  }
  // bag → container: one blocker that fits the mover's vacated BAG cell.
  if (!bag || !bagBoardDims || item.x === undefined || item.y === undefined) return base;
  if (x < 0 || y < 0 || x + s.w > board.w || y + s.h > board.h) return base;
  for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) {
    if (!boardOpenAt(board, x + dx, y + dy)) return base;
  }
  const blockers = held.filter(h => h.x !== undefined && h.y !== undefined
    && h.x < x + s.w && x < h.x + itemGridSize(h).w && h.y < y + s.h && y < h.y + itemGridSize(h).h);
  if (blockers.length !== 1) return base;
  const other = blockers[0];
  const rest = bag.filter(i => i.uid !== item.uid);
  if (!containerAccepts(def, other)) return base; // (a foreign occupant can never be there; belt to suspenders)
  return canPlaceAt(rest, other, item.x, item.y, bagBoardDims) ? { ...base, verdict: 'swap', with: other } : base;
}

/** Pieces on a board that no longer fit it — a footprint over a closed or
 *  out-of-bounds cell, or two pieces overlapping (a retuned frame, a client
 *  whose registry lost the container). The World evicts them to the bag or
 *  the floor at adoption; nothing is ever silently lost. */
export function containerMisfits(board: ContainerBoard | null, held: readonly ItemInstance[]): ItemInstance[] {
  if (!board) return [...held];
  const out: ItemInstance[] = [];
  const placed: ItemInstance[] = [];
  for (const it of held) {
    if (it.x === undefined || it.y === undefined) { out.push(it); continue; }
    const s = itemGridSize(it);
    let ok = true;
    for (let dy = 0; dy < s.h && ok; dy++) for (let dx = 0; dx < s.w; dx++) {
      if (!boardOpenAt(board, it.x + dx, it.y + dy)) { ok = false; break; }
    }
    if (ok) {
      for (const p of placed) {
        const ps = itemGridSize(p);
        if (it.x < p.x! + ps.w && p.x! < it.x + s.w && it.y < p.y! + ps.h && p.y! < it.y + s.h) { ok = false; break; }
      }
    }
    if (ok) placed.push(it); else out.push(it);
  }
  return out;
}
// ------------------------------------------------------------ THE SEAT LAW --
// engine/seatlaw.ts owns the vocabulary (the seatPower_ amplifier stats and
// the single-hop law); this is the BOARD's half — who touches whom.

const SEAT_DIRS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** A seated piece's neighbourhood: the distinct pieces TOUCHING its
 *  footprint (orthogonal adjacency over OPEN cells) and the open seats
 *  against it that stand EMPTY. A sealed or out-of-bounds cell is not a
 *  seat — neither empty nor occupied. Pure. */
export interface SeatNeighbourhood { pieces: ItemInstance[]; empty: number }

export function seatNeighbourhood(board: ContainerBoard, seated: readonly ItemInstance[]): Map<ItemInstance, SeatNeighbourhood> {
  const occ = new Array<ItemInstance | null>(board.w * board.h).fill(null);
  const cellsOf = (it: ItemInstance): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    if (it.x === undefined || it.y === undefined) return out;
    const s = itemGridSize(it);
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) out.push({ x: it.x + dx, y: it.y + dy });
    return out;
  };
  for (const it of seated) for (const c of cellsOf(it)) if (boardOpenAt(board, c.x, c.y)) occ[c.y * board.w + c.x] = it;
  const out = new Map<ItemInstance, SeatNeighbourhood>();
  for (const it of seated) {
    const touching = new Set<ItemInstance>();
    let empty = 0;
    for (const c of cellsOf(it)) {
      for (const [dx, dy] of SEAT_DIRS) {
        const x = c.x + dx, y = c.y + dy;
        if (!boardOpenAt(board, x, y)) continue;
        const o = occ[y * board.w + x];
        if (o === it) continue;
        if (o) touching.add(o); else empty++;
      }
    }
    out.set(it, { pieces: [...touching], empty });
  }
  return out;
}

/** THE SEAT LAW's factor per seated piece (seatlaw.ts): 1 + the outward
 *  power worn by every piece touching it + its own solitude × the empty
 *  seats against it + its own communion × the pieces against it, floored at
 *  0. `modsOf` is a piece's compiled lines; amplifier lines are read RAW
 *  (never scaled — single hop by construction). */
export function seatAmplification(
  board: ContainerBoard, seated: readonly ItemInstance[], modsOf: (it: ItemInstance) => readonly Modifier[],
): Map<ItemInstance, number> {
  const hood = seatNeighbourhood(board, seated);
  const out = new Map<ItemInstance, number>();
  for (const it of seated) {
    const n = hood.get(it)!;
    const own = modsOf(it);
    let f = 1;
    for (const o of n.pieces) f += seatPowerOf(modsOf(o), 'outward');
    f += seatPowerOf(own, 'solitude') * n.empty;
    f += seatPowerOf(own, 'communion') * n.pieces.length;
    out.set(it, Math.max(0, f));
  }
  return out;
}
