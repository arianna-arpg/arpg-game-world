// ---------------------------------------------------------------------------
// THE MAP FORGE — a full-screen MAP EDITOR (config.ts DEV.mapForge, or the
// `?dev` opt-in): hand-author a zone as an AuthoredMapDef (engine/
// authoredMaps.ts) and walk it, in the Entity Forge's lineage.
//
// THREE PANES: the ROSTER (atlas maps + every shipped map — shipped rows open
// read-only with a Clone-to-Atlas banner: the tweaker flow), the CANVAS (the
// map drawn cell-exact in its dress tileset's theme: regions by their
// registered look, doodads through the REAL painter library, spawn seats,
// markers, fixtures, the portal seats the engine will use — pan/zoom, ten
// tools, keyboard shortcuts) and the INSPECTOR (the zone sheet, the legend,
// the selection's own fields, the live lint).
//
// THE GENERATED PREVIEW (the 'gen' layer): after every edit the forge runs
// the REAL generateLayout over the map's synthetic def (authoredZoneDef) with
// the map's own portal seats, and draws the walk grid the engine produced —
// portal stems, structure carves, dress scatter, reachability — so drawn ==
// generated before a single mint. Nothing here re-implements a placement
// rule; the preview IS the generator.
//
// The store is THE ATLAS (meta/atlas.ts): Save grafts the map into the live
// registry under the 'custom_' namespace and persists; MINT & WALK saves,
// then mints the map beside the hero through World.devMintAuthored; RE-MINT
// reloads the zone underfoot from its def (the one-shot memory forget) so an
// edit shows in the world in one click; CAPTURE reads the hero's feet as a
// seat; Validate re-runs the REAL validateContent(); Export TS emits the
// promotion literal + a ready QuestZoneSpec (serializeMapTS); JSON import/
// export moves maps between machines.
//
// Self-contained DOM (the mountDevPanel convention): appended to
// document.body, touches nothing in the game UI, trivially removable.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { UI } from '../ui/panels';
import { Z_LADDER } from '../ui/zorder';
import { vec, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import { generateLayout, blocksMovement, doodadRuleKinds, type Doodad, type GeneratedLayout } from '../engine/levelgen';
import { PORTAL_RADIUS } from '../engine/worldgen';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { TILESETS } from '../data/tilesets';
import { MONSTERS, FACTIONS } from '../data/monsters';
import { STRUCTURES } from '../data/structures';
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import { PAINTERS, type DoodadVisualDef, type PaintEnv } from '../render/vis/painters';
import { RARITY_DEFS } from '../engine/rarity';
import { CAMERA_MODES } from '../render/camera';
import { OBJECTIVE_READS, type ObjectiveSpec, type ZoneTheme } from '../data/zones';
import { validateContent } from '../data/validate';
import {
  AUTHORED_MAPS, AUTHORED_CFG, MAP_CELL, DEFAULT_LEGEND, authoredMapIds, authoredZoneDef,
  mapCellRegion, mapCharAt, mapLegend, mapPixelSize, portalSeat, regionPalette, fixtureFootprint,
  validateAuthoredMap,
  type AuthoredMapDef, type MapDoodad, type MapExit, type MapFixture, type MapMarker,
  type MapMarkerKind, type MapSpawn,
} from '../engine/authoredMaps';
import {
  ATLAS_PREFIX, atlas, atlasMap, cloneMap, isAtlasId, removeAtlasMap, serializeMapTS, upsertAtlasMap,
} from '../meta/atlas';
import {
  btn, check, css, DEV_UI, hrow, listRow, numInput, option, section, selectEl, textInput, wireFilter,
} from './ui';

/** Forge dials — one knob block, no magic literals in the body. */
export const MAP_FORGE_CFG = {
  z: Z_LADDER.forge,       // the UI stack law's forge rung (+1 = inner modals)
  undoCap: 80,
  minZoom: 0.12,
  maxZoom: 5,
  /** Debounce before the REAL generator re-runs after an edit (ms). */
  previewDebounceMs: 140,
  /** Screen-px grab reach for select/drag hit tests. */
  grabPx: 12,
  /** Drawn radii of the point-like payloads (map px). */
  spawnR: 16,
  markerR: 13,
  exitGrabR: 26,
  /** The frozen painter clock while not animating. */
  poseT: 0.35,
  /** A new map's default size (cells) + dress. */
  newCols: 40, newRows: 28, newTileset: 'meadow',
} as const;

type Tool = 'select' | 'paint' | 'rect' | 'line' | 'fill' | 'doodad' | 'spawn' | 'marker' | 'fixture' | 'exit' | 'pan';
const TOOLS: { id: Tool; key: string; label: string; hint: string }[] = [
  { id: 'select', key: '1', label: '⬚ Select', hint: 'click = select · drag = move · wheel = resize doodad · [ ] rotate · Del remove · arrows nudge (shift = a cell)' },
  { id: 'paint', key: '2', label: '✎ Paint', hint: 'drag = paint the brush region · right-drag = ground · size below' },
  { id: 'rect', key: '3', label: '▭ Rect', hint: 'drag a rectangle of the brush region · right-drag = ground' },
  { id: 'line', key: '4', label: '╱ Line', hint: 'drag a line of the brush region (brush-size wide) · right-drag = ground' },
  { id: 'fill', key: '5', label: '◍ Fill', hint: 'click = flood-fill the connected same-char patch with the brush region' },
  { id: 'doodad', key: '6', label: '✿ Doodad', hint: 'click = place the picked kind at the picked radius · shift = snap to cell centres' },
  { id: 'spawn', key: '7', label: '☠ Spawn', hint: 'click = place a spawn seat of the picked monster' },
  { id: 'marker', key: '8', label: '⌖ Marker', hint: 'click = place the picked marker (entry / boss / poi / camp / garrison / breakable / npc)' },
  { id: 'fixture', key: '9', label: '⌂ Fixture', hint: 'click = raise the picked plan structure (snaps to the lattice)' },
  { id: 'exit', key: '0', label: '⇥ Exit', hint: 'click near a side = a frontier door there · select + drag along the side to move it' },
  { id: 'pan', key: ' ', label: '✋ Pan', hint: 'drag = pan (or hold space / middle-drag in any tool) · wheel = zoom' },
];

type SelKind = 'doodad' | 'spawn' | 'marker' | 'fixture' | 'exit';
interface Sel { kind: SelKind; index: number }

interface Drag {
  kind: 'pan' | 'paint' | 'rect' | 'line' | 'move';
  button: number;
  start: Vec2;        // map px
  last: Vec2;         // map px
  startScreen: Vec2;
  camStart: Vec2;
  sel?: Sel;
  selStart?: Vec2;
  cells?: Set<number>;
}

interface ForgeState {
  working: AuthoredMapDef | null;
  source: 'atlas' | 'shipped' | 'new';
  loadedId: string | null;
  dirty: boolean;
  tool: Tool;
  brushRegion: string;
  brushSize: number;
  doodadKind: string;
  doodadR: number;
  spawnId: string;
  markerKind: MapMarkerKind;
  structureId: string;
  sel: Sel | null;
  cam: { x: number; y: number; zoom: number };
  layers: { grid: boolean; doodads: boolean; spawns: boolean; markers: boolean; fixtures: boolean; portals: boolean; gen: boolean; labels: boolean };
  realLooks: boolean;
  anim: boolean;
  undo: string[];
  redo: string[];
  hover: Vec2 | null;
  drag: Drag | null;
  preview: GeneratedLayout | null;
  previewError: string | null;
  previewTimer: number;
  lint: string[];
  mintLevel: number;
}

const SCRATCH_ID = '__forge_preview';
const MARKER_GLYPH: Record<MapMarkerKind, string> = {
  entry: '⌂', boss: '☠', poi: '✦', camp: '⛺', garrison: '⚑', breakable: '▣', npc: '☺',
};
const MARKER_COLOR: Record<MapMarkerKind, string> = {
  entry: '#7ec850', boss: '#e04848', poi: '#e8d44a', camp: '#e8a050', garrison: '#c060e0', breakable: '#a08860', npc: '#60c0e8',
};
const FALLBACK_THEME: ZoneTheme = {
  floor: '#2a2a2e', grid: '#333', border: '#666', obstacle: '#444', obstacleEdge: '#777', accent: '#aaa',
};

/** A stable color for a region kind: its registered look, the theme's own
 *  word for it (ZoneTheme keys share names with the base regions), the
 *  floor/wall pair, else a hashed hue — never a hand-rolled id table. */
function regionColor(id: string, theme: ZoneTheme): string {
  const r = regionKind(id);
  if (r?.visual?.fill) return r.visual.fill;
  const themed = (theme as unknown as Record<string, unknown>)[id];
  if (typeof themed === 'string') return themed;
  if (id === 'ground') return theme.floor;
  if (id === 'wall') return theme.wall ?? theme.obstacle;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 40%, ${r?.walkable ? 38 : 22}%)`;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function mountMapForge(ui: UI, getWorld: () => World): { open: (id?: string) => void } {
  const st: ForgeState = {
    working: null, source: 'new', loadedId: null, dirty: false,
    tool: 'paint', brushRegion: 'wall', brushSize: 1,
    doodadKind: 'rock', doodadR: 16, spawnId: 'zombie', markerKind: 'poi', structureId: 'house_small',
    sel: null, cam: { x: 600, y: 420, zoom: 0.8 },
    layers: { grid: true, doodads: true, spawns: true, markers: true, fixtures: true, portals: true, gen: true, labels: true },
    realLooks: true, anim: false, undo: [], redo: [], hover: null, drag: null,
    preview: null, previewError: null, previewTimer: 0, lint: [], mintLevel: 0,
  };

  const runActive = (): World | null => {
    const w = getWorld();
    return w && w.seats && w.seats.length > 0 && !w.gameOver && !w.player.dead ? w : null;
  };
  const readonly = (): boolean => st.source === 'shipped';
  const theme = (): ZoneTheme => (st.working && TILESETS[st.working.tileset]?.theme) ?? FALLBACK_THEME;
  const cellPx = (): number => st.working?.cell ?? MAP_CELL;

  // --- shell -----------------------------------------------------------------------
  const root = document.createElement('div');
  css(root, {
    position: 'fixed', inset: '0', zIndex: String(MAP_FORGE_CFG.z), display: 'none',
    flexDirection: 'column', background: 'rgba(10,9,14,0.97)', color: DEV_UI.text,
    font: DEV_UI.font, padding: '10px', gap: '8px',
  });

  const header = document.createElement('div');
  css(header, { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' });
  const title = document.createElement('div');
  title.textContent = '🗺 MAP FORGE';
  css(title, { color: DEV_UI.accent, fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' });
  const headId = document.createElement('div');
  css(headId, { color: DEV_UI.heading, flex: '1', minWidth: '160px' });
  const newCols = numInput(MAP_FORGE_CFG.newCols, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells, '52px');
  const newRows = numInput(MAP_FORGE_CFG.newRows, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells, '52px');
  const newTs = selectEl();
  header.append(title, headId,
    newCols, newRows, newTs,
    btn('＋ New', () => newMap()),
    btn('⧉ Clone', () => cloneCurrent()),
    btn('🗑 Delete', () => deleteCurrent()),
    btn('✕ Close', () => close()));

  const main = document.createElement('div');
  css(main, { display: 'flex', gap: '10px', flex: '1', minHeight: '0' });

  // --- roster ------------------------------------------------------------------------
  const rosterPane = document.createElement('div');
  css(rosterPane, { width: '220px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: '0' });
  const rosterFilter = textInput('filter…');
  const rosterList = document.createElement('div');
  css(rosterList, { overflowY: 'auto', flex: '1', display: 'flex', flexDirection: 'column' });
  wireFilter(rosterFilter, rosterList);
  rosterPane.append(rosterFilter, rosterList);

  // --- canvas pane -------------------------------------------------------------------
  const canvasPane = document.createElement('div');
  css(canvasPane, { flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '0' });
  const toolbar = hrow('4px');
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  for (const t of TOOLS) {
    const b = btn(t.label, () => setTool(t.id));
    b.title = `${t.hint} (key ${t.key === ' ' ? 'space' : t.key})`;
    toolBtns.set(t.id, b);
    toolbar.append(b);
  }
  const toolOpts = hrow('6px');
  const canvasWrap = document.createElement('div');
  css(canvasWrap, { flex: '1', minHeight: '0', position: 'relative', border: `1px solid ${DEV_UI.border}`, borderRadius: '6px', overflow: 'hidden', background: '#0b0a10' });
  const canvas = document.createElement('canvas');
  css(canvas, { position: 'absolute', inset: '0', width: '100%', height: '100%', cursor: 'var(--cursor-crosshair, crosshair)', touchAction: 'none' });
  canvasWrap.append(canvas);
  const hud = document.createElement('div');
  css(hud, { position: 'absolute', left: '6px', bottom: '4px', color: DEV_UI.textDim, fontSize: '10px', pointerEvents: 'none', textShadow: '0 0 3px #000' });
  canvasWrap.append(hud);
  const layerRow = hrow('6px');
  const hint = document.createElement('div');
  css(hint, { color: DEV_UI.textDim, fontSize: '10px' });
  canvasPane.append(toolbar, toolOpts, canvasWrap, layerRow, hint);

  // --- inspector -----------------------------------------------------------------------
  const inspector = document.createElement('div');
  css(inspector, { width: '340px', flexShrink: '0', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '2px' });

  // --- footer ---------------------------------------------------------------------------
  const footer = document.createElement('div');
  css(footer, { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' });
  const status = document.createElement('div');
  css(status, { color: DEV_UI.good, flex: '1', minWidth: '200px', whiteSpace: 'pre-wrap', maxHeight: '72px', overflowY: 'auto', fontSize: '11px' });
  const flash = (msg: string): void => { status.textContent = msg; };
  const mintLevelIn = numInput(0, 0, 99, '52px');
  mintLevelIn.title = 'mint level (0 = the hero\'s)';
  mintLevelIn.addEventListener('change', () => { st.mintLevel = Number(mintLevelIn.value) || 0; });
  footer.append(
    btn('💾 Save to Atlas', () => { if (doSave()) flash(`saved → atlas (${st.working?.id})`); }),
    btn('✔ Save + Validate', () => doValidate()),
    btn('📋 Export TS', () => openExport('ts')),
    btn('{} JSON', () => openExport('json')),
    btn('⇩ Import JSON', () => openImport()),
    mintLevelIn,
    btn('▶ Mint & Walk', () => doMint()),
    btn('↻ Re-mint here', () => doRemint()),
    btn('⌖ Capture hero', () => doCapture()),
    btn('↶', () => undo()), btn('↷', () => redo()),
    status);

  main.append(rosterPane, canvasPane, inspector);
  root.append(header, main, footer);
  document.body.append(root);

  // Shared datalists (big id pickers render as text inputs + datalist).
  const mkDatalist = (id: string, opts: () => string[]): string => {
    const dl = document.createElement('datalist');
    dl.id = id;
    root.append(dl);
    const refill = (): void => { dl.innerHTML = ''; for (const o of opts()) dl.append(option(o, o)); };
    datalistRefills.push(refill);
    return id;
  };
  const datalistRefills: (() => void)[] = [];
  const DL_MONSTERS = mkDatalist('mapforge-dl-monsters', () => Object.keys(MONSTERS).filter(k => !k.startsWith('__')).sort());
  const DL_DOODADS = mkDatalist('mapforge-dl-doodads', () => [...new Set([...doodadRuleKinds(), ...Object.keys(DOODAD_VISUALS)])].sort());
  const DL_STRUCTURES = mkDatalist('mapforge-dl-structures', () => Object.keys(STRUCTURES).sort());
  const DL_FACTIONS = mkDatalist('mapforge-dl-factions', () => Object.keys(FACTIONS).sort());

  // --- helpers ----------------------------------------------------------------------------
  const labeled = (label: string, el: HTMLElement, help?: string): HTMLElement => {
    const row = document.createElement('div');
    css(row, { display: 'flex', gap: '6px', alignItems: 'center', padding: '1px 0' });
    const l = document.createElement('span');
    l.textContent = label;
    css(l, { color: DEV_UI.textDim, width: '96px', flexShrink: '0', fontSize: '11px' });
    if (help) l.title = help;
    css(el, { flex: '1', minWidth: '0' });
    row.append(l, el);
    return row;
  };
  const pickerInput = (value: string, listId: string, onChange: (v: string) => void): HTMLInputElement => {
    const i = textInput('');
    i.value = value;
    i.setAttribute('list', listId);
    i.addEventListener('change', () => onChange(i.value.trim()));
    return i;
  };

  const snapshot = (): string => JSON.stringify(st.working);
  const pushUndo = (): void => {
    if (!st.working) return;
    st.undo.push(snapshot());
    if (st.undo.length > MAP_FORGE_CFG.undoCap) st.undo.shift();
    st.redo.length = 0;
  };
  const undo = (): void => {
    const s = st.undo.pop();
    if (!s || !st.working) return;
    st.redo.push(snapshot());
    st.working = JSON.parse(s) as AuthoredMapDef;
    st.sel = null;
    afterEdit(true);
    flash('undo');
  };
  const redo = (): void => {
    const s = st.redo.pop();
    if (!s || !st.working) return;
    st.undo.push(snapshot());
    st.working = JSON.parse(s) as AuthoredMapDef;
    st.sel = null;
    afterEdit(true);
    flash('redo');
  };

  /** Every grid row exactly `cols` chars — the one shape every tool assumes. */
  const normalizeGrid = (m: AuthoredMapDef): void => {
    const rows: string[] = [];
    for (let y = 0; y < m.rows; y++) {
      const r = m.grid[y] ?? '';
      rows.push(r.length >= m.cols ? r.slice(0, m.cols) : r + ' '.repeat(m.cols - r.length));
    }
    m.grid = rows;
  };

  const syncHead = (): void => {
    const m = st.working;
    headId.textContent = m
      ? `${m.id} · ${m.name} · ${m.cols}×${m.rows} cells (${mapPixelSize(m).w}×${mapPixelSize(m).h}px) · ${st.source}${st.dirty ? ' · UNSAVED' : ''}`
      : 'no map — pick one from the roster, ＋ New, or ⇩ Import JSON';
  };

  const refreshLint = (): void => {
    st.lint = st.working ? validateAuthoredMap(st.working) : [];
    lintHost.innerHTML = '';
    if (!st.working) return;
    if (!st.lint.length) {
      const ok = document.createElement('div');
      ok.textContent = '✔ mints as drawn (no lint lines)';
      css(ok, { color: DEV_UI.good, fontSize: '11px' });
      lintHost.append(ok);
    } else {
      for (const line of st.lint) {
        const d = document.createElement('div');
        d.textContent = `⚠ ${line}`;
        css(d, { color: '#e8a050', fontSize: '11px' });
        lintHost.append(d);
      }
    }
    if (st.previewError) {
      const d = document.createElement('div');
      d.textContent = `✗ generator threw: ${st.previewError}`;
      css(d, { color: '#e04848', fontSize: '11px' });
      lintHost.append(d);
    }
  };

  /** After any mutation: dirty, re-lint, re-run the generator (debounced),
   *  redraw; `structural` also rebuilds the inspector (a new selection, a
   *  reloaded map). */
  const afterEdit = (structural = false): void => {
    st.dirty = true;
    if (st.working) normalizeGrid(st.working);
    syncHead();
    refreshLint();
    schedulePreview();
    if (structural) rebuildInspector();
    requestRender();
  };

  // --- THE GENERATED PREVIEW (the real generator over the synthetic def) -----------------
  const schedulePreview = (): void => {
    if (st.previewTimer) window.clearTimeout(st.previewTimer);
    st.previewTimer = window.setTimeout(runPreview, MAP_FORGE_CFG.previewDebounceMs);
  };
  const previewPortals = (m: AuthoredMapDef): { entry: Vec2; exits: Vec2[] } => {
    const size = mapPixelSize(m);
    const entryMarker = (m.markers ?? []).filter(x => x.kind === 'entry').pop();
    const entry = entryMarker ? vec(entryMarker.x, entryMarker.y) : vec(size.w / 2, size.h / 2);
    const exits = (m.exits ?? []).map(x => portalSeat(x.side, x.at, size));
    return { entry, exits };
  };
  const runPreview = (): void => {
    st.previewTimer = 0;
    st.preview = null;
    st.previewError = null;
    const m = st.working;
    if (!m) { requestRender(); return; }
    const scratch: AuthoredMapDef = { ...cloneMap(m), id: SCRATCH_ID };
    AUTHORED_MAPS[SCRATCH_ID] = scratch;
    try {
      const def = authoredZoneDef(scratch, { id: SCRATCH_ID, level: 8, seed: 7 });
      const size = mapPixelSize(m);
      const { entry, exits } = previewPortals(m);
      st.preview = generateLayout(def, { w: size.w, h: size.h }, new Rng(7), entry, exits);
    } catch (e) {
      st.previewError = String((e as Error)?.message ?? e);
    } finally {
      delete AUTHORED_MAPS[SCRATCH_ID];
    }
    refreshLint();
    requestRender();
  };

  // --- camera + coordinates ----------------------------------------------------------------
  let cw = 800, ch = 600, dpr = 1;
  const resize = (): void => {
    const r = canvasWrap.getBoundingClientRect();
    cw = Math.max(64, Math.floor(r.width));
    ch = Math.max(64, Math.floor(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    requestRender();
  };
  new ResizeObserver(resize).observe(canvasWrap);
  const toMap = (sx: number, sy: number): Vec2 => vec((sx - cw / 2) / st.cam.zoom + st.cam.x, (sy - ch / 2) / st.cam.zoom + st.cam.y);
  const fitView = (): void => {
    if (!st.working) return;
    const s = mapPixelSize(st.working);
    st.cam.x = s.w / 2; st.cam.y = s.h / 2;
    st.cam.zoom = clamp(Math.min((cw - 40) / s.w, (ch - 40) / s.h), MAP_FORGE_CFG.minZoom, MAP_FORGE_CFG.maxZoom);
    requestRender();
  };
  const cellOf = (p: Vec2): { cx: number; cy: number } => {
    const c = cellPx();
    return { cx: Math.floor(p.x / c), cy: Math.floor(p.y / c) };
  };

  // --- grid editing -----------------------------------------------------------------------------
  /** The legend char that paints `region` — an existing one, or a fresh
   *  allocation from the pool (recorded on the map's legend). */
  const charFor = (m: AuthoredMapDef, region: string): string => {
    const pad = m.pad ?? AUTHORED_CFG.padRegion;
    if (region === pad && !Object.values(mapLegend(m)).some(s => (s.region ?? 'ground') === region)) return ' ';
    for (const [ch, spec] of Object.entries(m.legend ?? {})) if ((spec.region ?? 'ground') === region && !spec.doodad) return ch;
    for (const [ch, spec] of Object.entries(DEFAULT_LEGEND)) if ((spec.region ?? 'ground') === region && !(m.legend?.[ch])) return ch;
    const used = new Set([...Object.keys(m.legend ?? {}), ...Object.keys(DEFAULT_LEGEND), ' ', '.']);
    for (const ch of AUTHORED_CFG.charPool) {
      if (used.has(ch)) continue;
      (m.legend ??= {})[ch] = { region, label: region };
      return ch;
    }
    return '#';
  };
  const setCell = (m: AuthoredMapDef, cx: number, cy: number, ch: string): boolean => {
    if (cx < 0 || cy < 0 || cx >= m.cols || cy >= m.rows) return false;
    const row = m.grid[cy];
    if (row[cx] === ch) return false;
    m.grid[cy] = row.slice(0, cx) + ch + row.slice(cx + 1);
    return true;
  };
  const brushCells = (cx: number, cy: number): { cx: number; cy: number }[] => {
    const n = Math.max(1, st.brushSize);
    const off = Math.floor((n - 1) / 2);
    const out: { cx: number; cy: number }[] = [];
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) out.push({ cx: cx - off + dx, cy: cy - off + dy });
    return out;
  };
  const paintAt = (p: Vec2, region: string): boolean => {
    const m = st.working;
    if (!m || readonly()) return false;
    const ch = charFor(m, region);
    const { cx, cy } = cellOf(p);
    let any = false;
    for (const c of brushCells(cx, cy)) any = setCell(m, c.cx, c.cy, ch) || any;
    return any;
  };
  const paintLine = (a: Vec2, b: Vec2, region: string): boolean => {
    const m = st.working;
    if (!m) return false;
    const ch = charFor(m, region);
    const A = cellOf(a), B = cellOf(b);
    let any = false;
    const dx = Math.abs(B.cx - A.cx), dy = Math.abs(B.cy - A.cy);
    const sx = A.cx < B.cx ? 1 : -1, sy = A.cy < B.cy ? 1 : -1;
    let err = dx - dy, x = A.cx, y = A.cy;
    for (let guard = 0; guard < 4096; guard++) {
      for (const c of brushCells(x, y)) any = setCell(m, c.cx, c.cy, ch) || any;
      if (x === B.cx && y === B.cy) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return any;
  };
  const paintRect = (a: Vec2, b: Vec2, region: string): boolean => {
    const m = st.working;
    if (!m) return false;
    const ch = charFor(m, region);
    const A = cellOf(a), B = cellOf(b);
    let any = false;
    for (let y = Math.min(A.cy, B.cy); y <= Math.max(A.cy, B.cy); y++) {
      for (let x = Math.min(A.cx, B.cx); x <= Math.max(A.cx, B.cx); x++) any = setCell(m, x, y, ch) || any;
    }
    return any;
  };
  const floodAt = (p: Vec2, region: string): boolean => {
    const m = st.working;
    if (!m || readonly()) return false;
    const { cx, cy } = cellOf(p);
    if (cx < 0 || cy < 0 || cx >= m.cols || cy >= m.rows) return false;
    const from = mapCharAt(m, cx, cy);
    const ch = charFor(m, region);
    if (from === ch) return false;
    const stack = [[cx, cy]];
    const seen = new Set<number>();
    let n = 0;
    while (stack.length && n < 200000) {
      const [x, y] = stack.pop()!;
      const k = y * m.cols + x;
      if (seen.has(k) || x < 0 || y < 0 || x >= m.cols || y >= m.rows) continue;
      seen.add(k);
      if (mapCharAt(m, x, y) !== from) continue;
      setCell(m, x, y, ch); n++;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return n > 0;
  };
  /** Resize the grid (pad with the pad char / crop), optionally keeping the
   *  authored content centred (payload coordinates shift with it). */
  const resizeGrid = (cols: number, rows: number, centre: boolean): void => {
    const m = st.working;
    if (!m) return;
    cols = clamp(Math.round(cols), AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells);
    rows = clamp(Math.round(rows), AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells);
    if (cols === m.cols && rows === m.rows) return;
    pushUndo();
    const dx = centre ? Math.floor((cols - m.cols) / 2) : 0;
    const dy = centre ? Math.floor((rows - m.rows) / 2) : 0;
    const grid: string[] = [];
    for (let y = 0; y < rows; y++) {
      let row = '';
      for (let x = 0; x < cols; x++) row += mapCharAt(m, x - dx, y - dy);
      grid.push(row);
    }
    m.grid = grid; m.cols = cols; m.rows = rows;
    const c = cellPx();
    const shift = <T extends { x: number; y: number }>(rows: T[] | undefined): void => {
      for (const r of rows ?? []) { r.x += dx * c; r.y += dy * c; }
    };
    shift(m.doodads); shift(m.spawns); shift(m.markers); shift(m.fixtures);
    afterEdit(true);
  };

  // --- hit tests ----------------------------------------------------------------------------------
  const hitTest = (p: Vec2): Sel | null => {
    const m = st.working;
    if (!m) return null;
    const reach = MAP_FORGE_CFG.grabPx / st.cam.zoom;
    const size = mapPixelSize(m);
    const d2 = (x: number, y: number): number => (p.x - x) ** 2 + (p.y - y) ** 2;
    let best: Sel | null = null, bestD = Infinity;
    const consider = (kind: SelKind, index: number, dist: number): void => { if (dist < bestD) { bestD = dist; best = { kind, index }; } };
    if (st.layers.spawns) (m.spawns ?? []).forEach((s, i) => { const d = Math.sqrt(d2(s.x, s.y)); if (d <= MAP_FORGE_CFG.spawnR + reach) consider('spawn', i, d); });
    if (st.layers.markers) (m.markers ?? []).forEach((k, i) => { const d = Math.sqrt(d2(k.x, k.y)); if (d <= MAP_FORGE_CFG.markerR + reach) consider('marker', i, d); });
    if (st.layers.portals) (m.exits ?? []).forEach((x, i) => { const s = portalSeat(x.side, x.at, size); const d = Math.sqrt(d2(s.x, s.y)); if (d <= MAP_FORGE_CFG.exitGrabR + reach) consider('exit', i, d); });
    if (st.layers.doodads) (m.doodads ?? []).forEach((d, i) => { const dist = Math.sqrt(d2(d.x, d.y)); if (dist <= d.r + reach) consider('doodad', i, dist + 0.5); });
    if (st.layers.fixtures) (m.fixtures ?? []).forEach((f, i) => {
      const fp = fixtureFootprint(f.structure);
      if (!fp) return;
      if (Math.abs(p.x - f.x) <= fp.w / 2 && Math.abs(p.y - f.y) <= fp.h / 2) consider('fixture', i, Math.sqrt(d2(f.x, f.y)) + 1000);
    });
    return best;
  };
  const selItem = (): MapDoodad | MapSpawn | MapMarker | MapFixture | MapExit | null => {
    const m = st.working, s = st.sel;
    if (!m || !s) return null;
    switch (s.kind) {
      case 'doodad': return m.doodads?.[s.index] ?? null;
      case 'spawn': return m.spawns?.[s.index] ?? null;
      case 'marker': return m.markers?.[s.index] ?? null;
      case 'fixture': return m.fixtures?.[s.index] ?? null;
      case 'exit': return m.exits?.[s.index] ?? null;
    }
  };
  const deleteSel = (): void => {
    const m = st.working, s = st.sel;
    if (!m || !s || readonly()) return;
    pushUndo();
    const list = s.kind === 'doodad' ? m.doodads : s.kind === 'spawn' ? m.spawns : s.kind === 'marker' ? m.markers : s.kind === 'fixture' ? m.fixtures : m.exits;
    list?.splice(s.index, 1);
    st.sel = null;
    afterEdit(true);
  };
  const nudgeSel = (dx: number, dy: number): void => {
    const it = selItem();
    if (!it || !st.working || readonly() || st.sel?.kind === 'exit') return;
    pushUndo();
    (it as { x: number; y: number }).x += dx;
    (it as { x: number; y: number }).y += dy;
    afterEdit(true);
  };
  /** Which side + fraction a map point is nearest to (the exit tool). */
  const sideAt = (p: Vec2): MapExit => {
    const s = mapPixelSize(st.working!);
    const cands: { side: MapExit['side']; d: number; at: number }[] = [
      { side: 'n', d: p.y, at: p.x / s.w }, { side: 's', d: s.h - p.y, at: p.x / s.w },
      { side: 'w', d: p.x, at: p.y / s.h }, { side: 'e', d: s.w - p.x, at: p.y / s.h },
    ];
    cands.sort((a, b) => a.d - b.d);
    return { side: cands[0].side, at: Math.round(clamp(cands[0].at, 0.05, 0.95) * 100) / 100 };
  };

  // --- placement verbs ------------------------------------------------------------------------------
  const place = (p: Vec2, shift: boolean): void => {
    const m = st.working;
    if (!m || readonly()) return;
    const c = cellPx();
    const snap = (v: Vec2): Vec2 => shift ? vec((Math.floor(v.x / c) + 0.5) * c, (Math.floor(v.y / c) + 0.5) * c) : vec(Math.round(v.x), Math.round(v.y));
    const q = snap(p);
    switch (st.tool) {
      case 'doodad': {
        pushUndo();
        (m.doodads ??= []).push({ kind: st.doodadKind, x: q.x, y: q.y, r: st.doodadR });
        st.sel = { kind: 'doodad', index: m.doodads.length - 1 };
        break;
      }
      case 'spawn': {
        pushUndo();
        (m.spawns ??= []).push({ id: st.spawnId, x: q.x, y: q.y });
        st.sel = { kind: 'spawn', index: m.spawns.length - 1 };
        break;
      }
      case 'marker': {
        pushUndo();
        const k: MapMarker = { kind: st.markerKind, x: q.x, y: q.y };
        if (k.kind === 'garrison') { k.faction = Object.keys(FACTIONS)[0] ?? ''; k.size = [2, 3]; }
        if (k.kind === 'breakable') k.id = 'barrel';
        if (k.kind === 'npc') k.id = Object.keys(MONSTERS).find(id => MONSTERS[id].npcRole) ?? '';
        (m.markers ??= []).push(k);
        st.sel = { kind: 'marker', index: m.markers.length - 1 };
        break;
      }
      case 'fixture': {
        pushUndo();
        const fx = Math.round(p.x / MAP_CELL) * MAP_CELL, fy = Math.round(p.y / MAP_CELL) * MAP_CELL;
        (m.fixtures ??= []).push({ structure: st.structureId, x: fx, y: fy });
        st.sel = { kind: 'fixture', index: m.fixtures.length - 1 };
        break;
      }
      case 'exit': {
        pushUndo();
        (m.exits ??= []).push(sideAt(p));
        st.sel = { kind: 'exit', index: m.exits.length - 1 };
        break;
      }
      default: return;
    }
    afterEdit(true);
  };

  // --- pointer + keys -------------------------------------------------------------------------------
  let spaceDown = false;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    const m = st.working;
    if (!m) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const p = toMap(sx, sy);
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointers (headless QA) */ }
    const pan = e.button === 1 || spaceDown || st.tool === 'pan';
    if (pan) {
      st.drag = { kind: 'pan', button: e.button, start: p, last: p, startScreen: vec(sx, sy), camStart: vec(st.cam.x, st.cam.y) };
      return;
    }
    const region = e.button === 2 ? 'ground' : st.brushRegion;
    switch (st.tool) {
      case 'select': {
        const hit = hitTest(p);
        st.sel = hit;
        if (hit && !readonly()) {
          pushUndo();
          const it = selItem() as { x?: number; y?: number } | null;
          st.drag = { kind: 'move', button: e.button, start: p, last: p, startScreen: vec(sx, sy), camStart: vec(st.cam.x, st.cam.y), sel: hit, selStart: vec(it?.x ?? 0, it?.y ?? 0) };
        }
        rebuildInspector();
        requestRender();
        return;
      }
      case 'paint': {
        if (readonly()) return;
        pushUndo();
        st.drag = { kind: 'paint', button: e.button, start: p, last: p, startScreen: vec(sx, sy), camStart: vec(st.cam.x, st.cam.y) };
        if (paintAt(p, region)) afterEdit();
        return;
      }
      case 'rect':
      case 'line': {
        if (readonly()) return;
        st.drag = { kind: st.tool, button: e.button, start: p, last: p, startScreen: vec(sx, sy), camStart: vec(st.cam.x, st.cam.y) };
        requestRender();
        return;
      }
      case 'fill': {
        if (readonly()) return;
        pushUndo();
        if (floodAt(p, region)) afterEdit(); else st.undo.pop();
        return;
      }
      default:
        if (e.button === 0) place(p, e.shiftKey);
        else if (e.button === 2) { st.sel = hitTest(p); rebuildInspector(); requestRender(); }
    }
  });
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const p = toMap(sx, sy);
    st.hover = p;
    const d = st.drag;
    if (d) {
      if (d.kind === 'pan') {
        st.cam.x = d.camStart.x - (sx - d.startScreen.x) / st.cam.zoom;
        st.cam.y = d.camStart.y - (sy - d.startScreen.y) / st.cam.zoom;
      } else if (d.kind === 'paint') {
        const region = d.button === 2 ? 'ground' : st.brushRegion;
        if (paintLine(d.last, p, region)) afterEdit();
      } else if (d.kind === 'move' && d.sel && d.selStart && st.working) {
        const it = selItem();
        if (it) {
          if (d.sel.kind === 'exit') {
            const x = it as MapExit;
            const size = mapPixelSize(st.working);
            x.at = Math.round(clamp((x.side === 'n' || x.side === 's') ? p.x / size.w : p.y / size.h, 0.05, 0.95) * 100) / 100;
          } else if (d.sel.kind === 'fixture') {
            const f = it as MapFixture;
            f.x = Math.round((d.selStart.x + (p.x - d.start.x)) / MAP_CELL) * MAP_CELL;
            f.y = Math.round((d.selStart.y + (p.y - d.start.y)) / MAP_CELL) * MAP_CELL;
          } else {
            const o = it as { x: number; y: number };
            o.x = Math.round(d.selStart.x + (p.x - d.start.x));
            o.y = Math.round(d.selStart.y + (p.y - d.start.y));
          }
          st.dirty = true; syncHead();
        }
      }
      d.last = p;
    }
    updateHud();
    requestRender();
  });
  const endDrag = (): void => {
    const d = st.drag;
    if (!d) return;
    st.drag = null;
    if ((d.kind === 'rect' || d.kind === 'line') && st.working) {
      const region = d.button === 2 ? 'ground' : st.brushRegion;
      pushUndo();
      const changed = d.kind === 'rect' ? paintRect(d.start, d.last, region) : paintLine(d.start, d.last, region);
      if (changed) afterEdit(); else st.undo.pop();
    } else if (d.kind === 'move') {
      afterEdit(true);
    }
    requestRender();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { st.hover = null; updateHud(); requestRender(); });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const m = st.working;
    if (!m) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const sel = selItem();
    if (st.tool === 'select' && sel && st.sel?.kind === 'doodad' && !readonly()) {
      const d = sel as MapDoodad;
      pushUndo();
      d.r = Math.max(3, Math.round(d.r * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      afterEdit(true);
      return;
    }
    const before = toMap(sx, sy);
    st.cam.zoom = clamp(st.cam.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MAP_FORGE_CFG.minZoom, MAP_FORGE_CFG.maxZoom);
    const after = toMap(sx, sy);
    st.cam.x += before.x - after.x;
    st.cam.y += before.y - after.y;
    requestRender();
  }, { passive: false });

  const isTyping = (): boolean => {
    const a = document.activeElement as HTMLElement | null;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
  };
  window.addEventListener('keydown', e => {
    if (root.style.display === 'none' || isTyping()) return;
    if (e.key === ' ') { spaceDown = true; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (doSave()) flash(`saved → atlas (${st.working?.id})`); return; }
    const tool = TOOLS.find(t => t.key === e.key);
    if (tool && tool.key !== ' ') { setTool(tool.id); return; }
    switch (e.key) {
      case 'Escape': if (st.sel) { st.sel = null; rebuildInspector(); requestRender(); } else close(); break;
      case 'Delete': case 'Backspace': deleteSel(); break;
      case '[': rotateSel(-Math.PI / 12); break;
      case ']': rotateSel(Math.PI / 12); break;
      case 'ArrowLeft': nudgeSel(e.shiftKey ? -cellPx() : -1, 0); e.preventDefault(); break;
      case 'ArrowRight': nudgeSel(e.shiftKey ? cellPx() : 1, 0); e.preventDefault(); break;
      case 'ArrowUp': nudgeSel(0, e.shiftKey ? -cellPx() : -1); e.preventDefault(); break;
      case 'ArrowDown': nudgeSel(0, e.shiftKey ? cellPx() : 1); e.preventDefault(); break;
      case 'g': case 'G': st.layers.grid = !st.layers.grid; rebuildLayerRow(); requestRender(); break;
      case 'w': case 'W': st.layers.gen = !st.layers.gen; rebuildLayerRow(); requestRender(); break;
      case 'f': case 'F': fitView(); break;
      case '+': case '=': st.brushSize = Math.min(9, st.brushSize + 1); rebuildToolOpts(); break;
      case '-': st.brushSize = Math.max(1, st.brushSize - 1); rebuildToolOpts(); break;
    }
  });
  window.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });
  const rotateSel = (d: number): void => {
    const it = selItem();
    if (!it || st.sel?.kind !== 'doodad' || readonly()) return;
    pushUndo();
    const dd = it as MapDoodad;
    dd.rot = ((dd.rot ?? 0) + d + Math.PI * 2) % (Math.PI * 2);
    afterEdit(true);
  };

  const updateHud = (): void => {
    const m = st.working;
    if (!m || !st.hover) { hud.textContent = ''; return; }
    const { cx, cy } = cellOf(st.hover);
    const ch = mapCharAt(m, cx, cy);
    const region = mapCellRegion(m, ch);
    const gen = st.preview?.walk instanceof GridWalkField ? st.preview.walk.regionAt(st.hover.x, st.hover.y) : null;
    hud.textContent = `${Math.round(st.hover.x)},${Math.round(st.hover.y)} px · cell ${cx},${cy} '${ch}' ${region}${gen && gen !== region ? ` → gen: ${gen}` : ''} · zoom ${st.cam.zoom.toFixed(2)}`;
  };

  // --- drawing -------------------------------------------------------------------------------------
  let renderQueued = false;
  let rafOn = false;
  const requestRender = (): void => { renderQueued = true; };
  const frame = (): void => {
    if (!rafOn) return;
    if (renderQueued || st.anim) { renderQueued = false; draw(); }
    requestAnimationFrame(frame);
  };
  const ctx2d = canvas.getContext('2d')!;
  const badPainters = new Set<string>();

  const drawDoodads = (list: readonly Doodad[], th: ZoneTheme, t: number): void => {
    if (!list.length) return;
    if (!st.realLooks) {
      for (const d of list) {
        ctx2d.beginPath(); ctx2d.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2);
        ctx2d.fillStyle = blocksMovement(d) ? th.obstacle : 'rgba(255,255,255,0.10)';
        ctx2d.fill();
        ctx2d.strokeStyle = th.obstacleEdge; ctx2d.lineWidth = 1 / st.cam.zoom; ctx2d.stroke();
      }
      return;
    }
    const groups = new Map<string, Doodad[]>();
    for (const d of list) { const g = groups.get(d.kind); if (g) g.push(d); else groups.set(d.kind, [d]); }
    const ordered = [...groups.entries()].map(([kind, group]) => ({ kind, group, def: DOODAD_VISUALS[kind] as DoodadVisualDef | undefined }))
      .sort((a, b) => (a.def?.order ?? 50) - (b.def?.order ?? 50));
    const env: PaintEnv = { ctx: ctx2d, theme: th, time: t, world: getWorld() };
    for (const g of ordered) {
      const painterId = g.def?.painter ?? 'fallback';
      const painter = badPainters.has(g.kind) ? PAINTERS.fallback : (PAINTERS[painterId] ?? PAINTERS.fallback);
      ctx2d.save();
      try {
        painter(env, g.group, g.def ?? { painter: 'fallback', order: 50 });
      } catch {
        badPainters.add(g.kind);
        ctx2d.restore(); ctx2d.save();
        PAINTERS.fallback(env, g.group, { painter: 'fallback', order: 50 });
      }
      ctx2d.restore();
    }
  };

  const draw = (): void => {
    const m = st.working;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, cw, ch);
    if (!m) {
      ctx2d.fillStyle = DEV_UI.textDim; ctx2d.font = '13px Verdana'; ctx2d.textAlign = 'center';
      ctx2d.fillText('no map loaded', cw / 2, ch / 2);
      return;
    }
    const th = theme();
    const c = cellPx();
    const size = mapPixelSize(m);
    const z = st.cam.zoom;
    ctx2d.save();
    ctx2d.translate(cw / 2 - st.cam.x * z, ch / 2 - st.cam.y * z);
    ctx2d.scale(z, z);
    // pad beyond the authored rect
    const padColor = regionColor(m.pad ?? AUTHORED_CFG.padRegion, th);
    ctx2d.fillStyle = padColor;
    ctx2d.fillRect(-4 * c, -4 * c, size.w + 8 * c, size.h + 8 * c);
    // cells — the generated grid when the gen layer is on, else the authored chars
    const genGrid = st.layers.gen && st.preview?.walk instanceof GridWalkField ? st.preview.walk : null;
    const colorMemo = new Map<string, string>();
    const colorOf = (id: string): string => { let v = colorMemo.get(id); if (!v) { v = regionColor(id, th); colorMemo.set(id, v); } return v; };
    if (genGrid) {
      const gc = genGrid.cell;
      for (let gy = 0; gy < genGrid.rows; gy++) for (let gx = 0; gx < genGrid.cols; gx++) {
        const id = genGrid.regionAt((gx + 0.5) * gc, (gy + 0.5) * gc);
        ctx2d.fillStyle = colorOf(id);
        ctx2d.fillRect(gx * gc, gy * gc, gc, gc);
      }
    } else {
      for (let cy = 0; cy < m.rows; cy++) for (let cx = 0; cx < m.cols; cx++) {
        ctx2d.fillStyle = colorOf(mapCellRegion(m, mapCharAt(m, cx, cy)));
        ctx2d.fillRect(cx * c, cy * c, c, c);
      }
    }
    // authored-vs-generated difference tint (cells the generator changed: stems, carves)
    if (genGrid) {
      ctx2d.fillStyle = 'rgba(126,200,80,0.18)';
      for (let cy = 0; cy < m.rows; cy++) for (let cx = 0; cx < m.cols; cx++) {
        const authored = mapCellRegion(m, mapCharAt(m, cx, cy));
        const gen = genGrid.regionAt((cx + 0.5) * c, (cy + 0.5) * c);
        if (authored !== gen) ctx2d.fillRect(cx * c, cy * c, c, c);
      }
    }
    // grid lines
    if (st.layers.grid && z * c >= 6) {
      ctx2d.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx2d.lineWidth = 1 / z;
      ctx2d.beginPath();
      for (let x = 0; x <= m.cols; x++) { ctx2d.moveTo(x * c, 0); ctx2d.lineTo(x * c, size.h); }
      for (let y = 0; y <= m.rows; y++) { ctx2d.moveTo(0, y * c); ctx2d.lineTo(size.w, y * c); }
      ctx2d.stroke();
    }
    // map rim
    ctx2d.strokeStyle = th.border; ctx2d.lineWidth = 2 / z;
    ctx2d.strokeRect(0, 0, size.w, size.h);
    // doodads — the generated set (fixtures' props, dress) or the authored set
    if (st.layers.doodads) {
      const t = st.anim ? performance.now() / 1000 : MAP_FORGE_CFG.poseT;
      if (st.layers.gen && st.preview) drawDoodads(st.preview.doodads, th, t);
      else {
        const list: Doodad[] = (m.doodads ?? []).map(d => ({ pos: vec(d.x, d.y), radius: d.r, kind: d.kind, ...(d.rot !== undefined ? { rot: d.rot } : {}), ...(d.dir !== undefined ? { dir: d.dir } : {}) }));
        const legend = mapLegend(m);
        for (let cy = 0; cy < m.rows; cy++) for (let cx = 0; cx < m.cols; cx++) {
          const spec = legend[mapCharAt(m, cx, cy)];
          if (spec?.doodad) list.push({ pos: vec((cx + 0.5) * c, (cy + 0.5) * c), radius: spec.doodad.radius ?? c * AUTHORED_CFG.cellDoodadR, kind: spec.doodad.kind });
        }
        drawDoodads(list, th, t);
      }
    }
    // fixtures — footprints (+ the plan's wall chars) on the authored view
    if (st.layers.fixtures) {
      for (const f of m.fixtures ?? []) {
        const fp = fixtureFootprint(f.structure);
        const s = STRUCTURES[f.structure];
        ctx2d.strokeStyle = '#c0a060'; ctx2d.lineWidth = 1.5 / z; ctx2d.setLineDash([6 / z, 4 / z]);
        if (fp) ctx2d.strokeRect(f.x - fp.w / 2, f.y - fp.h / 2, fp.w, fp.h);
        ctx2d.setLineDash([]);
        if (s?.plan && !st.layers.gen) {
          const cs = Math.max(1, Math.round((s.cellSize ?? 30) / 30)) * 30;
          const pw = Math.max(...s.plan.map(r => r.length)) * cs, ph = s.plan.length * cs;
          ctx2d.fillStyle = 'rgba(192,160,96,0.35)';
          s.plan.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx2d.fillRect(f.x - pw / 2 + rx * cs, f.y - ph / 2 + ry * cs, cs, cs); });
        }
        if (st.layers.labels) label(f.structure, f.x, f.y - (fp?.h ?? 40) / 2 - 6 / z, '#c0a060');
      }
    }
    // portal seats — the map's exits + the four candidate back-edge seats
    if (st.layers.portals) {
      const seatRing = (p: Vec2, color: string, solid: boolean, clear: number): void => {
        ctx2d.strokeStyle = color; ctx2d.lineWidth = 2 / z;
        ctx2d.setLineDash(solid ? [] : [5 / z, 5 / z]);
        ctx2d.beginPath(); ctx2d.arc(p.x, p.y, PORTAL_RADIUS, 0, Math.PI * 2); ctx2d.stroke();
        ctx2d.setLineDash([3 / z, 6 / z]); ctx2d.globalAlpha = 0.5;
        ctx2d.beginPath(); ctx2d.arc(p.x, p.y, clear, 0, Math.PI * 2); ctx2d.stroke();
        ctx2d.globalAlpha = 1; ctx2d.setLineDash([]);
      };
      const clear = m.portalClear ?? AUTHORED_CFG.portalClear;
      for (const side of ['n', 's', 'e', 'w'] as const) seatRing(portalSeat(side, 0.5, size), 'rgba(160,160,200,0.35)', false, clear);
      (m.exits ?? []).forEach((x, i) => {
        const p = portalSeat(x.side, x.at, size);
        const selected = st.sel?.kind === 'exit' && st.sel.index === i;
        seatRing(p, selected ? DEV_UI.accent : '#8fa8d8', true, clear);
        if (st.layers.labels) label(x.label ?? `exit ${x.side}@${x.at}`, p.x, p.y - PORTAL_RADIUS - 6 / z, '#8fa8d8');
      });
      const { entry } = previewPortals(m);
      ctx2d.strokeStyle = MARKER_COLOR.entry; ctx2d.lineWidth = 1.5 / z; ctx2d.setLineDash([4 / z, 4 / z]);
      ctx2d.beginPath(); ctx2d.arc(entry.x, entry.y, clear, 0, Math.PI * 2); ctx2d.stroke(); ctx2d.setLineDash([]);
    }
    // spawn seats
    if (st.layers.spawns) {
      (m.spawns ?? []).forEach((s, i) => {
        const def = MONSTERS[s.id];
        const color = def?.color ?? '#e04848';
        const selected = st.sel?.kind === 'spawn' && st.sel.index === i;
        const r = MAP_FORGE_CFG.spawnR;
        if ((s.count ?? 1) > 1) {
          ctx2d.strokeStyle = color; ctx2d.globalAlpha = 0.35; ctx2d.lineWidth = 1 / z; ctx2d.setLineDash([3 / z, 3 / z]);
          ctx2d.beginPath(); ctx2d.arc(s.x, s.y, s.spread ?? AUTHORED_CFG.spawnSpread, 0, Math.PI * 2); ctx2d.stroke();
          ctx2d.setLineDash([]); ctx2d.globalAlpha = 1;
        }
        ctx2d.fillStyle = color; ctx2d.globalAlpha = def ? 0.85 : 0.4;
        ctx2d.beginPath(); ctx2d.arc(s.x, s.y, r, 0, Math.PI * 2); ctx2d.fill(); ctx2d.globalAlpha = 1;
        ctx2d.strokeStyle = selected ? DEV_UI.accent : s.rarity && s.rarity !== 'normal' ? '#e8d44a' : '#000';
        ctx2d.lineWidth = (selected || (s.rarity && s.rarity !== 'normal') ? 3 : 1.5) / z;
        ctx2d.beginPath(); ctx2d.arc(s.x, s.y, r, 0, Math.PI * 2); ctx2d.stroke();
        if (s.ambush) { ctx2d.strokeStyle = '#e8a050'; ctx2d.setLineDash([2 / z, 2 / z]); ctx2d.beginPath(); ctx2d.arc(s.x, s.y, s.ambush.radius, 0, Math.PI * 2); ctx2d.stroke(); ctx2d.setLineDash([]); }
        if (s.post) {
          const ang = s.facing ?? 0;
          ctx2d.strokeStyle = '#fff'; ctx2d.lineWidth = 2 / z;
          ctx2d.beginPath(); ctx2d.moveTo(s.x, s.y); ctx2d.lineTo(s.x + Math.cos(ang) * r * 1.6, s.y + Math.sin(ang) * r * 1.6); ctx2d.stroke();
        }
        glyph((s.count ?? 1) > 1 ? String(s.count) : '☠', s.x, s.y, '#fff', r * 1.2);
        if (st.layers.labels) label(s.label ?? def?.name ?? s.id, s.x, s.y - r - 5 / z, color);
      });
    }
    // markers
    if (st.layers.markers) {
      (m.markers ?? []).forEach((k, i) => {
        const selected = st.sel?.kind === 'marker' && st.sel.index === i;
        const r = MAP_FORGE_CFG.markerR;
        ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
        ctx2d.beginPath(); ctx2d.arc(k.x, k.y, r, 0, Math.PI * 2); ctx2d.fill();
        ctx2d.strokeStyle = selected ? DEV_UI.accent : MARKER_COLOR[k.kind] ?? '#fff'; ctx2d.lineWidth = (selected ? 3 : 1.5) / z;
        ctx2d.beginPath(); ctx2d.arc(k.x, k.y, r, 0, Math.PI * 2); ctx2d.stroke();
        glyph(MARKER_GLYPH[k.kind] ?? '?', k.x, k.y, MARKER_COLOR[k.kind] ?? '#fff', r * 1.5);
        if (st.layers.labels) label(k.label ?? (k.id ? `${k.kind} · ${k.id}` : k.faction ? `${k.kind} · ${k.faction}` : k.kind), k.x, k.y - r - 5 / z, MARKER_COLOR[k.kind] ?? '#fff');
      });
    }
    // preview's generated seats (spawns raw from the generator — count-scattered) as faint dots
    if (st.layers.gen && st.preview?.landmarkSpawns) {
      ctx2d.fillStyle = 'rgba(255,255,255,0.35)';
      for (const ls of st.preview.landmarkSpawns) { ctx2d.beginPath(); ctx2d.arc(ls.pos.x, ls.pos.y, 4 / z + 3, 0, Math.PI * 2); ctx2d.fill(); }
    }
    // selection outline for doodads / fixtures
    const sel = selItem();
    if (sel && st.sel?.kind === 'doodad') {
      const d = sel as MapDoodad;
      ctx2d.strokeStyle = DEV_UI.accent; ctx2d.lineWidth = 2 / z; ctx2d.setLineDash([4 / z, 3 / z]);
      ctx2d.beginPath(); ctx2d.arc(d.x, d.y, d.r + 3 / z, 0, Math.PI * 2); ctx2d.stroke(); ctx2d.setLineDash([]);
      if (d.rot !== undefined) { ctx2d.beginPath(); ctx2d.moveTo(d.x, d.y); ctx2d.lineTo(d.x + Math.cos(d.rot) * d.r, d.y + Math.sin(d.rot) * d.r); ctx2d.stroke(); }
    }
    // tool ghost
    if (st.hover && !readonly()) {
      const p = st.hover;
      ctx2d.globalAlpha = 0.6;
      if (st.tool === 'paint' || st.tool === 'fill' || (st.drag?.kind === 'line')) {
        const { cx, cy } = cellOf(p);
        ctx2d.fillStyle = regionColor(st.brushRegion, th); ctx2d.globalAlpha = 0.5;
        for (const b of (st.tool === 'fill' ? [{ cx, cy }] : brushCells(cx, cy))) ctx2d.fillRect(b.cx * c, b.cy * c, c, c);
        ctx2d.globalAlpha = 1; ctx2d.strokeStyle = '#fff'; ctx2d.lineWidth = 1 / z;
        for (const b of (st.tool === 'fill' ? [{ cx, cy }] : brushCells(cx, cy))) ctx2d.strokeRect(b.cx * c, b.cy * c, c, c);
      } else if (st.tool === 'doodad') {
        ctx2d.strokeStyle = '#fff'; ctx2d.lineWidth = 1 / z; ctx2d.setLineDash([3 / z, 3 / z]);
        ctx2d.beginPath(); ctx2d.arc(p.x, p.y, st.doodadR, 0, Math.PI * 2); ctx2d.stroke(); ctx2d.setLineDash([]);
      } else if (st.tool === 'fixture') {
        const fp = fixtureFootprint(st.structureId);
        if (fp) { const fx = Math.round(p.x / MAP_CELL) * MAP_CELL, fy = Math.round(p.y / MAP_CELL) * MAP_CELL; ctx2d.strokeStyle = '#c0a060'; ctx2d.lineWidth = 1 / z; ctx2d.strokeRect(fx - fp.w / 2, fy - fp.h / 2, fp.w, fp.h); }
      } else if (st.tool === 'exit') {
        const x = sideAt(p); const s = portalSeat(x.side, x.at, size);
        ctx2d.strokeStyle = '#8fa8d8'; ctx2d.lineWidth = 1.5 / z; ctx2d.beginPath(); ctx2d.arc(s.x, s.y, PORTAL_RADIUS, 0, Math.PI * 2); ctx2d.stroke();
      } else if (st.tool === 'spawn' || st.tool === 'marker') {
        ctx2d.strokeStyle = '#fff'; ctx2d.lineWidth = 1 / z; ctx2d.beginPath(); ctx2d.arc(p.x, p.y, MAP_FORGE_CFG.spawnR, 0, Math.PI * 2); ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
    }
    // rect/line drag ghost
    if (st.drag && (st.drag.kind === 'rect' || st.drag.kind === 'line')) {
      const A = cellOf(st.drag.start), B = cellOf(st.drag.last);
      ctx2d.fillStyle = regionColor(st.drag.button === 2 ? 'ground' : st.brushRegion, th); ctx2d.globalAlpha = 0.45;
      if (st.drag.kind === 'rect') ctx2d.fillRect(Math.min(A.cx, B.cx) * c, Math.min(A.cy, B.cy) * c, (Math.abs(A.cx - B.cx) + 1) * c, (Math.abs(A.cy - B.cy) + 1) * c);
      else { ctx2d.strokeStyle = ctx2d.fillStyle; ctx2d.lineWidth = Math.max(1, st.brushSize) * c; ctx2d.beginPath(); ctx2d.moveTo((A.cx + 0.5) * c, (A.cy + 0.5) * c); ctx2d.lineTo((B.cx + 0.5) * c, (B.cy + 0.5) * c); ctx2d.stroke(); }
      ctx2d.globalAlpha = 1;
    }
    ctx2d.restore();
    // read-only banner
    if (readonly()) {
      ctx2d.fillStyle = 'rgba(232,212,74,0.85)'; ctx2d.font = '11px Verdana'; ctx2d.textAlign = 'right';
      ctx2d.fillText('SHIPPED — read-only · ⧉ Clone to edit', cw - 8, 16);
    }
  };
  const glyph = (t: string, x: number, y: number, color: string, px: number): void => {
    ctx2d.save();
    ctx2d.fillStyle = color; ctx2d.font = `${px}px Verdana`; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
    ctx2d.fillText(t, x, y + px * 0.05);
    ctx2d.restore();
  };
  const label = (t: string, x: number, y: number, color: string): void => {
    if (st.cam.zoom < 0.45) return;
    ctx2d.save();
    const px = 11 / st.cam.zoom;
    ctx2d.font = `${px}px Verdana`; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'bottom';
    ctx2d.lineWidth = 3 / st.cam.zoom; ctx2d.strokeStyle = 'rgba(0,0,0,0.8)'; ctx2d.strokeText(t, x, y);
    ctx2d.fillStyle = color; ctx2d.fillText(t, x, y);
    ctx2d.restore();
  };

  // --- tool options + layers ------------------------------------------------------------------------
  const setTool = (t: Tool): void => {
    st.tool = t;
    for (const [id, b] of toolBtns) css(b, { background: id === t ? DEV_UI.bgActive : DEV_UI.bgRaised, outline: id === t ? `1px solid ${DEV_UI.accent}` : 'none' });
    hint.textContent = TOOLS.find(x => x.id === t)?.hint ?? '';
    rebuildToolOpts();
    requestRender();
  };
  const rebuildToolOpts = (): void => {
    toolOpts.innerHTML = '';
    const t = st.tool;
    if (t === 'paint' || t === 'rect' || t === 'line' || t === 'fill') {
      const sel = selectEl();
      for (const r of regionPalette()) sel.append(option(r.id, `${r.walkable ? '·' : r.blocks ? '▮' : '▽'} ${r.id}`));
      sel.value = st.brushRegion;
      sel.addEventListener('change', () => { st.brushRegion = sel.value; requestRender(); });
      const swatch = document.createElement('span');
      css(swatch, { display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: regionColor(st.brushRegion, theme()), border: '1px solid rgba(255,255,255,0.3)' });
      sel.addEventListener('change', () => css(swatch, { background: regionColor(st.brushRegion, theme()) }));
      toolOpts.append(swatch, labeledInline('region', sel));
      if (t !== 'fill') {
        const size = numInput(st.brushSize, 1, 9, '44px');
        size.addEventListener('change', () => { st.brushSize = clamp(Number(size.value) || 1, 1, 9); requestRender(); });
        toolOpts.append(labeledInline('brush', size));
      }
      const padSel = selectEl();
      for (const r of regionPalette()) padSel.append(option(r.id, r.id));
      padSel.value = st.working?.pad ?? AUTHORED_CFG.padRegion;
      padSel.addEventListener('change', () => { if (!st.working || readonly()) return; pushUndo(); st.working.pad = padSel.value; afterEdit(); });
      toolOpts.append(labeledInline('pad (outside + " ")', padSel));
    } else if (t === 'doodad') {
      const kind = pickerInput(st.doodadKind, DL_DOODADS, v => { if (v) st.doodadKind = v; });
      css(kind, { width: '160px', flex: '0 0 auto' });
      const r = numInput(st.doodadR, 3, 400, '56px');
      r.addEventListener('change', () => { st.doodadR = clamp(Number(r.value) || 16, 3, 400); requestRender(); });
      toolOpts.append(labeledInline('kind', kind), labeledInline('radius', r));
    } else if (t === 'spawn') {
      const id = pickerInput(st.spawnId, DL_MONSTERS, v => { if (v) st.spawnId = v; });
      css(id, { width: '200px', flex: '0 0 auto' });
      toolOpts.append(labeledInline('monster', id));
    } else if (t === 'marker') {
      const sel = selectEl();
      for (const k of Object.keys(MARKER_GLYPH) as MapMarkerKind[]) sel.append(option(k, `${MARKER_GLYPH[k]} ${k}`));
      sel.value = st.markerKind;
      sel.addEventListener('change', () => { st.markerKind = sel.value as MapMarkerKind; });
      toolOpts.append(labeledInline('marker', sel));
    } else if (t === 'fixture') {
      const id = pickerInput(st.structureId, DL_STRUCTURES, v => { if (v) st.structureId = v; requestRender(); });
      css(id, { width: '200px', flex: '0 0 auto' });
      toolOpts.append(labeledInline('structure', id));
    } else if (t === 'select') {
      toolOpts.append(btn('🗑 delete selection', () => deleteSel()), btn('⟲ rotate −', () => rotateSel(-Math.PI / 12)), btn('⟳ rotate +', () => rotateSel(Math.PI / 12)));
    }
  };
  const labeledInline = (l: string, el: HTMLElement): HTMLElement => {
    const w = document.createElement('label');
    css(w, { display: 'inline-flex', gap: '4px', alignItems: 'center', font: DEV_UI.fontSmall, color: DEV_UI.textDim });
    const s = document.createElement('span'); s.textContent = l;
    w.append(s, el);
    return w;
  };
  const rebuildLayerRow = (): void => {
    layerRow.innerHTML = '';
    for (const k of Object.keys(st.layers) as (keyof ForgeState['layers'])[]) {
      const c = check(k === 'gen' ? 'gen (real generator)' : k, st.layers[k]);
      c.box.addEventListener('change', () => { st.layers[k] = c.box.checked; requestRender(); });
      layerRow.append(c.el);
    }
    const rl = check('real looks', st.realLooks);
    rl.box.addEventListener('change', () => { st.realLooks = rl.box.checked; requestRender(); });
    const an = check('animate', st.anim);
    an.box.addEventListener('change', () => { st.anim = an.box.checked; requestRender(); });
    layerRow.append(rl.el, an.el, btn('⤢ fit (f)', () => fitView()));
  };

  // --- roster ------------------------------------------------------------------------------------------
  const rebuildRoster = (): void => {
    rosterList.innerHTML = '';
    newTs.innerHTML = '';
    for (const id of Object.keys(TILESETS).sort()) newTs.append(option(id, id));
    newTs.value = TILESETS[MAP_FORGE_CFG.newTileset] ? MAP_FORGE_CFG.newTileset : Object.keys(TILESETS)[0];
    datalistRefills.forEach(f => f());
    rosterList.append(section(`ATLAS (${atlas.maps.length})`));
    for (const m of atlas.maps) {
      const row = listRow(m.name, DEV_UI.accent, `${m.cols}×${m.rows} · ${m.tileset}`, () => selectMap(m.id));
      if (m.id === st.loadedId) row.style.outline = `1px solid ${DEV_UI.accent}`;
      rosterList.append(row);
    }
    rosterList.append(section('SHIPPED'));
    for (const id of authoredMapIds()) {
      if (isAtlasId(id) || id.startsWith('__forge')) continue;
      const m = AUTHORED_MAPS[id];
      const row = listRow(m.name, DEV_UI.heading, `${m.cols}×${m.rows} · ${m.tileset}`, () => selectMap(id));
      if (id === st.loadedId) row.style.outline = `1px solid ${DEV_UI.accent}`;
      rosterList.append(row);
    }
    rosterFilter.dispatchEvent(new Event('input'));
  };
  const confirmDiscard = (): boolean => !st.dirty || window.confirm('Discard unsaved changes to the working map?');
  const selectMap = (id: string): void => {
    if (!confirmDiscard()) return;
    const src = atlasMap(id) ?? AUTHORED_MAPS[id];
    if (!src) { flash(`no map '${id}'`); return; }
    st.working = cloneMap(src);
    normalizeGrid(st.working);
    st.source = atlasMap(id) ? 'atlas' : 'shipped';
    st.loadedId = id;
    st.dirty = false; st.sel = null; st.undo.length = 0; st.redo.length = 0;
    syncHead(); rebuildRoster(); rebuildInspector(); refreshLint(); rebuildToolOpts();
    fitView();
    runPreview();
  };
  const blankGrid = (cols: number, rows: number): string[] => {
    const out: string[] = [];
    for (let y = 0; y < rows; y++) out.push(y === 0 || y === rows - 1 ? '#'.repeat(cols) : '#' + '.'.repeat(cols - 2) + '#');
    return out;
  };
  const freshId = (base: string): string => {
    let id = ATLAS_PREFIX + base;
    for (let n = 2; AUTHORED_MAPS[id]; n++) id = `${ATLAS_PREFIX}${base}_${n}`;
    return id;
  };
  const newMap = (): void => {
    if (!confirmDiscard()) return;
    const cols = clamp(Number(newCols.value) || MAP_FORGE_CFG.newCols, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells);
    const rows = clamp(Number(newRows.value) || MAP_FORGE_CFG.newRows, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells);
    const tileset = newTs.value || MAP_FORGE_CFG.newTileset;
    const s = { w: cols * MAP_CELL, h: rows * MAP_CELL };
    st.working = {
      id: freshId('new_map'), name: 'the New Ground', tileset, cols, rows, grid: blankGrid(cols, rows),
      markers: [{ kind: 'entry', x: Math.round(s.w / 2), y: Math.round(s.h - 90) }],
      exits: [], objective: { kind: 'clear' },
    };
    st.source = 'new'; st.loadedId = null; st.dirty = true; st.sel = null; st.undo.length = 0; st.redo.length = 0;
    syncHead(); rebuildRoster(); rebuildInspector(); refreshLint(); rebuildToolOpts();
    fitView(); runPreview();
    flash('new map — paint it, name it, save it');
  };
  const cloneCurrent = (): void => {
    if (!st.working) return;
    const base = st.working.id.replace(/^custom_/, '');
    st.working = { ...cloneMap(st.working), id: freshId(base), name: `${st.working.name} (copy)` };
    st.source = 'new'; st.loadedId = null; st.dirty = true; st.sel = null;
    syncHead(); rebuildRoster(); rebuildInspector(); refreshLint();
    flash(`cloned → ${st.working.id} (unsaved)`);
  };
  const deleteCurrent = (): void => {
    if (!st.working) return;
    if (st.source === 'shipped') { flash('shipped maps are source rows — delete them in src/data/authoredMaps.ts'); return; }
    if (!window.confirm(`Delete '${st.working.id}' from the atlas?`)) return;
    const id = st.loadedId ?? st.working.id;
    removeAtlasMap(id);
    st.working = null; st.loadedId = null; st.source = 'new'; st.dirty = false; st.sel = null; st.preview = null;
    syncHead(); rebuildRoster(); rebuildInspector(); refreshLint(); requestRender();
    flash(`deleted ${id}`);
  };

  // --- verbs --------------------------------------------------------------------------------------------
  const doSave = (): boolean => {
    const m = st.working;
    if (!m) { flash('nothing to save'); return false; }
    if (st.source === 'shipped') { flash('shipped map — ⧉ Clone to the atlas first'); return false; }
    if (!isAtlasId(m.id)) m.id = ATLAS_PREFIX + m.id.replace(/^custom_/, '');
    normalizeGrid(m);
    const err = upsertAtlasMap(cloneMap(m));
    if (err) { flash(`✗ ${err}`); return false; }
    if (st.loadedId && st.loadedId !== m.id && atlasMap(st.loadedId)) removeAtlasMap(st.loadedId);
    st.loadedId = m.id; st.source = 'atlas'; st.dirty = false;
    syncHead(); rebuildRoster();
    return true;
  };
  const doValidate = (): void => {
    if (!doSave() || !st.working) return;
    const id = st.working.id;
    const captured: string[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]): void => { captured.push(a.map(String).join(' ')); };
    try { validateContent(); } finally { console.warn = orig; }
    const mine = captured.filter(s => s.includes(id));
    flash(mine.length ? `⚠ ${mine.length} validator line(s) for ${id}:\n${mine.join('\n')}` : `✔ ${id} passes the content validator clean`);
  };
  const doMint = (): void => {
    const m = st.working;
    if (!m) return;
    if (st.source !== 'shipped' && !doSave()) return;
    const w = runActive();
    if (!w) { flash('no live run — start a game, then mint (the forge stays available in the pause/dev flow)'); return; }
    const zid = w.devMintAuthored(m.id, st.mintLevel ? { level: st.mintLevel } : undefined);
    flash(zid ? `minted ${m.id} → zone ${zid}; the party walked in (close the forge to play; ↻ Re-mint after edits)` : `✗ mint refused (${m.id} not registered?)`);
  };
  const doRemint = (): void => {
    const m = st.working;
    if (!m) return;
    const w = runActive();
    if (!w) { flash('no live run'); return; }
    const here = w.devAuthoredMapHere();
    if (!here) { flash('the zone underfoot is not an authored map — ▶ Mint & Walk first'); return; }
    if (here !== m.id) { flash(`the zone underfoot is '${here}', not '${m.id}'`); return; }
    if (st.source !== 'shipped' && st.dirty && !doSave()) return;
    flash(w.devRemintZone() ? `re-minted ${here} from its def (memory dropped)` : '✗ re-mint refused');
  };
  const doCapture = (): void => {
    const m = st.working;
    if (!m || readonly()) return;
    const w = runActive();
    if (!w) { flash('no live run'); return; }
    if (w.devAuthoredMapHere() !== m.id) { flash(`stand inside '${m.id}' to capture the hero's feet`); return; }
    const size = mapPixelSize(m);
    const x = Math.round(clamp(w.player.pos.x, 0, size.w)), y = Math.round(clamp(w.player.pos.y, 0, size.h));
    pushUndo();
    if (st.tool === 'spawn') { (m.spawns ??= []).push({ id: st.spawnId, x, y }); st.sel = { kind: 'spawn', index: m.spawns.length - 1 }; }
    else if (st.tool === 'doodad') { (m.doodads ??= []).push({ kind: st.doodadKind, x, y, r: st.doodadR }); st.sel = { kind: 'doodad', index: m.doodads.length - 1 }; }
    else { (m.markers ??= []).push({ kind: st.tool === 'marker' ? st.markerKind : 'poi', x, y }); st.sel = { kind: 'marker', index: m.markers.length - 1 }; }
    afterEdit(true);
    flash(`captured the hero's feet at ${x},${y} as a ${st.sel?.kind}`);
  };

  // --- export / import ------------------------------------------------------------------------------------
  const modalBox = (title: string): { modal: HTMLElement; box: HTMLElement } => {
    const modal = document.createElement('div');
    css(modal, { position: 'fixed', inset: '0', zIndex: String(MAP_FORGE_CFG.z + 1), display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' });
    const box = document.createElement('div');
    css(box, { width: '760px', maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: '6px', background: DEV_UI.bg, border: `1px solid ${DEV_UI.border}`, borderRadius: '6px', padding: '10px' });
    box.append(section(title));
    modal.append(box);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    root.append(modal);
    return { modal, box };
  };
  const bigTextarea = (value: string, ro: boolean): HTMLTextAreaElement => {
    const ta = document.createElement('textarea');
    ta.readOnly = ro; ta.value = value;
    css(ta, { flex: '1', minHeight: '360px', background: DEV_UI.bgInput, color: DEV_UI.text, border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '8px', font: '11px Consolas, monospace', whiteSpace: 'pre', resize: 'none' });
    return ta;
  };
  const openExport = (kind: 'ts' | 'json'): void => {
    if (!st.working) return;
    const { modal, box } = modalBox(kind === 'ts' ? 'EXPORT — promotion literal (paste into src/data/authoredMaps.ts)' : 'EXPORT — JSON (⇩ Import JSON reads it back)');
    const ta = bigTextarea(kind === 'ts' ? serializeMapTS(st.working) : JSON.stringify(st.working, null, 2), true);
    const row = hrow();
    row.append(btn('Copy to clipboard', () => { ta.select(); void navigator.clipboard?.writeText(ta.value).catch(() => { /* selection remains */ }); }), btn('Close', () => modal.remove()));
    box.append(ta, row);
  };
  const openImport = (): void => {
    const { modal, box } = modalBox('IMPORT — paste an AuthoredMapDef as JSON');
    const ta = bigTextarea('', false);
    const row = hrow();
    row.append(btn('Load as working map', () => {
      try {
        const m = JSON.parse(ta.value) as AuthoredMapDef;
        if (!m || typeof m !== 'object' || !Array.isArray(m.grid)) { flash('✗ not a map (needs a grid)'); return; }
        if (!confirmDiscard()) return;
        m.id = isAtlasId(m.id ?? '') ? m.id : freshId((m.id ?? 'imported').replace(/^custom_/, ''));
        m.cols = m.cols || Math.max(...m.grid.map(r => r.length));
        m.rows = m.rows || m.grid.length;
        st.working = m; normalizeGrid(m);
        st.source = 'new'; st.loadedId = null; st.dirty = true; st.sel = null;
        syncHead(); rebuildRoster(); rebuildInspector(); refreshLint(); fitView(); runPreview();
        modal.remove();
        flash(`imported ${m.id} (unsaved)`);
      } catch (e) { flash(`✗ JSON parse: ${String(e)}`); }
    }), btn('Close', () => modal.remove()));
    box.append(ta, row);
  };

  // --- inspector --------------------------------------------------------------------------------------------
  const lintHost = document.createElement('div');
  css(lintHost, { display: 'flex', flexDirection: 'column', gap: '1px' });

  const field = (label: string, el: HTMLInputElement | HTMLSelectElement, help?: string): HTMLElement => {
    el.disabled = readonly();
    return labeled(label, el, help);
  };
  const mut = (fn: () => void, structural = false): void => {
    if (!st.working || readonly()) return;
    pushUndo();
    fn();
    afterEdit(structural);
  };
  const numField = (label: string, get: () => number | undefined, set: (v: number | undefined) => void, min: number, max: number, help?: string, structural = false): HTMLElement => {
    const i = numInput(get() ?? 0, min, max, '80px');
    if (get() === undefined) i.value = '';
    i.placeholder = '—';
    i.addEventListener('change', () => mut(() => set(i.value === '' ? undefined : clamp(Number(i.value), min, max)), structural));
    return field(label, i, help);
  };
  const textField = (label: string, get: () => string | undefined, set: (v: string) => void, help?: string, list?: string): HTMLElement => {
    const i = textInput('—');
    i.value = get() ?? '';
    if (list) i.setAttribute('list', list);
    i.addEventListener('change', () => mut(() => set(i.value.trim()), true));
    return field(label, i, help);
  };
  const selectField = <T extends string>(label: string, opts: { v: T; l: string }[], get: () => T, set: (v: T) => void, help?: string, structural = false): HTMLElement => {
    const s = selectEl();
    for (const o of opts) s.append(option(o.v, o.l));
    s.value = get();
    s.addEventListener('change', () => mut(() => set(s.value as T), structural));
    return field(label, s, help);
  };
  const boolField = (label: string, get: () => boolean, set: (v: boolean) => void, help?: string): HTMLElement => {
    const c = check('', get());
    c.box.disabled = readonly();
    c.box.addEventListener('change', () => mut(() => set(c.box.checked)));
    return labeled(label, c.el, help);
  };

  const rebuildInspector = (): void => {
    inspector.innerHTML = '';
    const m = st.working;
    if (!m) {
      const empty = document.createElement('div');
      empty.textContent = 'Pick a map from the roster, ＋ New, or ⇩ Import JSON.';
      css(empty, { color: DEV_UI.textDim, padding: '20px' });
      inspector.append(empty);
      return;
    }
    const ro = readonly();
    if (ro) {
      const banner = document.createElement('div');
      css(banner, { background: DEV_UI.bgRaised, border: `1px solid ${DEV_UI.border}`, borderRadius: '5px', padding: '6px 8px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' });
      const t = document.createElement('span');
      t.textContent = 'SHIPPED — read-only. Clone to the Atlas to edit a copy.';
      css(t, { color: DEV_UI.accent, flex: '1' });
      banner.append(t, btn('⧉ Clone to Atlas', () => cloneCurrent()));
      inspector.append(banner);
    }
    // --- the selection first (the thing under the cursor is what you came to edit) ---
    const sel = selItem();
    if (sel && st.sel) {
      inspector.append(section(`SELECTION — ${st.sel.kind} #${st.sel.index}`));
      if (st.sel.kind === 'doodad') {
        const d = sel as MapDoodad;
        inspector.append(
          textField('kind', () => d.kind, v => { d.kind = v; }, 'registered doodad kind', DL_DOODADS),
          numField('x', () => d.x, v => { d.x = v ?? 0; }, -9999, 99999),
          numField('y', () => d.y, v => { d.y = v ?? 0; }, -9999, 99999),
          numField('radius', () => d.r, v => { d.r = v ?? 16; }, 3, 400),
          numField('rot (rad)', () => d.rot, v => { d.rot = v; }, -7, 7),
          numField('dir (rad)', () => d.dir, v => { d.dir = v; }, -7, 7, 'bridges: span orientation'),
          numField('tier', () => d.tier, v => { d.tier = v; }, 0, 9, 'the story (tier fabric) this piece stands on'),
          boolField('shallow', () => !!d.shallow, v => { d.shallow = v || undefined; }, 'water: a ford (wading, never swimming)'),
          boolField('keep', () => !!d.keep, v => { d.keep = v || undefined; }, 'the portal-clear splice spares it'));
      } else if (st.sel.kind === 'spawn') {
        const s = sel as MapSpawn;
        inspector.append(
          textField('monster', () => s.id, v => { s.id = v; }, 'MONSTERS id', DL_MONSTERS),
          numField('x', () => s.x, v => { s.x = v ?? 0; }, -9999, 99999),
          numField('y', () => s.y, v => { s.y = v ?? 0; }, -9999, 99999),
          numField('count', () => s.count, v => { s.count = v; }, 1, 60, 'bodies at this seat (scattered within spread)'),
          numField('spread', () => s.spread, v => { s.spread = v; }, 0, 600),
          selectField('rarity', ['normal', ...Object.keys(RARITY_DEFS).filter(r => r !== 'normal')].map(r => ({ v: r, l: r })), () => (s.rarity ?? 'normal'), v => { s.rarity = v === 'normal' ? undefined : v; }),
          selectField('post', [{ v: 'none', l: 'none (roams)' }, { v: 'hold', l: 'hold (stands its watch)' }, { v: 'orbit', l: 'orbit (mills about, walks home)' }],
            () => (!s.post ? 'none' : s.post === true || (s.post as { hold?: boolean }).hold !== false ? 'hold' : 'orbit'),
            v => { s.post = v === 'none' ? undefined : v === 'hold' ? true : { hold: false }; }, 'a DUTY POST at the seat (brain.ts PostSpec)'),
          numField('facing (rad)', () => s.facing, v => { s.facing = v; }, -7, 7, 'posted facing'),
          numField('ambush radius', () => s.ambush?.radius, v => { s.ambush = v ? { ...(s.ambush ?? {}), radius: v } : undefined; }, 0, 900, 'wait-and-spring within this reach (0 = no ambush)'),
          boolField('ambush visible', () => !!s.ambush?.visible, v => { if (s.ambush) s.ambush.visible = v || undefined; }, 'wait in the open (wounds spring)'),
          numField('ambush pack', () => s.ambush?.pack, v => { if (s.ambush) s.ambush.pack = v; }, 0, 900, 'chain-spring every armed body within this radius'),
          numField('tier', () => s.tier, v => { s.tier = v; }, 0, 9),
          textField('label', () => s.label, v => { s.label = v || undefined; }));
      } else if (st.sel.kind === 'marker') {
        const k = sel as MapMarker;
        inspector.append(
          selectField('kind', (Object.keys(MARKER_GLYPH) as MapMarkerKind[]).map(x => ({ v: x, l: `${MARKER_GLYPH[x]} ${x}` })), () => k.kind, v => { k.kind = v; }, undefined, true),
          numField('x', () => k.x, v => { k.x = v ?? 0; }, -9999, 99999),
          numField('y', () => k.y, v => { k.y = v ?? 0; }, -9999, 99999));
        if (k.kind === 'breakable' || k.kind === 'npc') inspector.append(textField('monster id', () => k.id, v => { k.id = v; }, k.kind === 'npc' ? 'a friendly scenery NPC def' : 'a destructible clutter def', DL_MONSTERS));
        if (k.kind === 'garrison') {
          inspector.append(textField('faction', () => k.faction, v => { k.faction = v; }, 'FACTIONS id — its table posts here', DL_FACTIONS),
            numField('size min', () => k.size?.[0], v => { k.size = [v ?? 2, k.size?.[1] ?? 3]; }, 1, 30),
            numField('size max', () => k.size?.[1], v => { k.size = [k.size?.[0] ?? 2, v ?? 3]; }, 1, 30));
        }
        inspector.append(textField('label', () => k.label, v => { k.label = v || undefined; }));
      } else if (st.sel.kind === 'fixture') {
        const f = sel as MapFixture;
        inspector.append(
          textField('structure', () => f.structure, v => { f.structure = v; }, 'STRUCTURES id (plan or generator)', DL_STRUCTURES),
          numField('x', () => f.x, v => { f.x = v ?? 0; }, -9999, 99999),
          numField('y', () => f.y, v => { f.y = v ?? 0; }, -9999, 99999));
      } else if (st.sel.kind === 'exit') {
        const x = sel as MapExit;
        inspector.append(
          selectField('side', (['n', 's', 'e', 'w'] as const).map(s => ({ v: s, l: s })), () => x.side, v => { x.side = v; }),
          numField('at (0..1)', () => x.at, v => { x.at = clamp(v ?? 0.5, 0, 1); }, 0, 1),
          textField('label', () => x.label, v => { x.label = v || undefined; }));
      }
      inspector.append(btn('🗑 Delete selection', () => deleteSel()));
    }
    // --- the zone sheet ---
    inspector.append(section('MAP'));
    {
      const row = hrow();
      const chip = document.createElement('span');
      chip.textContent = ATLAS_PREFIX;
      css(chip, { color: DEV_UI.accent, fontSize: '11px' });
      const suffix = textInput('id_suffix');
      suffix.value = isAtlasId(m.id) ? m.id.slice(ATLAS_PREFIX.length) : m.id;
      suffix.disabled = ro;
      suffix.addEventListener('change', () => {
        const clean = suffix.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (!clean) { suffix.value = m.id.slice(ATLAS_PREFIX.length); return; }
        pushUndo();
        m.id = ATLAS_PREFIX + clean;
        suffix.value = clean;
        afterEdit(); syncHead();
      });
      row.append(chip, suffix);
      inspector.append(labeled('Id', row, ro ? 'Shipped id' : 'Saved as custom_<suffix>; rename on save retires the old id'));
    }
    inspector.append(
      textField('name', () => m.name, v => { m.name = v; }, 'the zone\'s fixed name'),
      selectField('dress tileset', Object.keys(TILESETS).sort().map(t => ({ v: t, l: t })), () => m.tileset, v => { m.tileset = v; }, 'theme colors, materials, the meld voice; packs/scatter under the policies below'));
    {
      const cols = numInput(m.cols, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells, '60px');
      const rows = numInput(m.rows, AUTHORED_CFG.minCells, AUTHORED_CFG.maxCells, '60px');
      const centre = check('keep centred', false);
      const apply = btn('resize', () => resizeGrid(Number(cols.value), Number(rows.value), centre.box.checked));
      const r = hrow(); r.append(cols, document.createTextNode('×'), rows, centre.el, apply);
      cols.disabled = rows.disabled = apply.disabled = ro;
      inspector.append(labeled('size (cells)', r, `${mapPixelSize(m).w}×${mapPixelSize(m).h} px at ${cellPx()} px/cell`));
    }
    const objKinds = Object.keys(OBJECTIVE_READS) as ObjectiveSpec['kind'][];
    const obj = m.objective ?? { kind: 'clear' as const };
    inspector.append(selectField('objective', objKinds.map(k => ({ v: k, l: `${OBJECTIVE_READS[k].glyph} ${k} — ${OBJECTIVE_READS[k].read}` })), () => obj.kind, v => {
      m.objective = v === 'boss' ? { kind: 'boss', id: (m.spawns ?? [])[0]?.id ?? 'zombie' }
        : v === 'spawners' ? { kind: 'spawners', spawnerId: 'bone_altar', count: [3, 5] }
        : v === 'waves' ? { kind: 'waves', waves: 5 }
        : v === 'escape' ? { kind: 'escape', interval: [8, 14] }
        : v === 'none' ? { kind: 'none' }
        : v === 'clear' ? { kind: 'clear' }
        : { kind: v } as unknown as ObjectiveSpec;
    }, 'what this ground asks', true));
    if (obj.kind === 'boss') inspector.append(textField('boss id', () => obj.id, v => { (m.objective as { id: string }).id = v; }, 'spawned at the boss marker (or the first poi)', DL_MONSTERS),
      numField('level bonus', () => obj.levelBonus, v => { (m.objective as { levelBonus?: number }).levelBonus = v; }, 0, 20));
    if (obj.kind === 'clear') inspector.append(boolField('clear all', () => !!obj.all, v => { (m.objective as { all?: boolean }).all = v || undefined; }, 'the empty floor IS the objective (no share)'));
    if (obj.kind === 'spawners') inspector.append(textField('spawner id', () => obj.spawnerId, v => { (m.objective as { spawnerId: string }).spawnerId = v; }, undefined, DL_MONSTERS));
    if (obj.kind === 'waves') inspector.append(numField('waves', () => obj.waves, v => { (m.objective as { waves: number }).waves = v ?? 5; }, 0, 99, '0 = endless'));
    inspector.append(
      numField('pinned level', () => m.level, v => { m.level = v; }, 1, 99, 'absent = the mint\'s word (quest level, band, the hero\'s level at a dev mint)'),
      selectField('sky', [{ v: '', l: 'the tileset\'s' }, { v: 'open', l: 'open' }, { v: 'sheltered', l: 'sheltered (no weather)' }], () => (m.sky ?? ''), v => { m.sky = v ? v as 'open' | 'sheltered' : undefined; }),
      selectField('camera', [{ v: '', l: 'the tileset\'s' }, ...CAMERA_MODES.map(c => ({ v: c.id, l: `${c.id} — ${c.name}` }))], () => (m.camera ?? ''), v => { m.camera = v ? v as typeof m.camera : undefined; }),
      selectField('ambient packs', [{ v: 'none', l: 'none — the seats ARE the cohort' }, { v: 'tileset', l: 'the dress tileset\'s packs roam' }], () => (typeof m.packs === 'object' ? 'tileset' : (m.packs ?? 'none')), v => { m.packs = v === 'none' ? undefined : 'tileset'; }, 'an explicit PackSpec is JSON-only'),
      selectField('dress', [{ v: 'none', l: 'none — the map is the terrain' }, { v: 'tileset', l: 'the tileset\'s scatter + rolls over the ground' }], () => (m.dress ?? 'none'), v => { m.dress = v === 'none' ? undefined : 'tileset'; }),
      numField('portal clear', () => m.portalClear, v => { m.portalClear = v; }, 20, 300, `stem radius carved at every portal (default ${AUTHORED_CFG.portalClear})`),
      boolField('weave roads', () => !!m.weave, v => { m.weave = v || undefined; }, 'let the world web add opportunistic roads onto the rim'),
      selectField('spoils', [{ v: '', l: 'full' }, { v: 'none', l: 'none — XP only, no mints' }], () => (m.spoils ?? ''), v => { m.spoils = v ? 'none' : undefined; }),
      boolField('faction war', () => m.noFactionWar === false, v => { m.noFactionWar = v ? false : undefined; }, 'allow a rolled faction war on this ground (default no)'),
      textField('notes', () => m.notes, v => { m.notes = v || undefined; }));
    // --- bounty expedition ---
    inspector.append(section('BOUNTY EXPEDITION'));
    inspector.append(boolField('postable', () => !!m.bounty, v => { m.bounty = v ? { level: [Math.max(1, (m.level ?? 6) - 3), (m.level ?? 6) + 6] } : undefined; }, 'the board posts this map as an expedition (minted at the take)'));
    if (m.bounty) {
      const b = m.bounty;
      inspector.append(
        numField('level from', () => b.level[0], v => { b.level = [v ?? 1, b.level[1]]; }, 1, 99),
        numField('level to', () => b.level[1], v => { b.level = [b.level[0], v ?? 99]; }, 1, 99),
        numField('weight', () => b.weight, v => { b.weight = v; }, 0.05, 20),
        textField('title', () => b.title, v => { b.title = v || undefined; }),
        textField('ask', () => b.ask, v => { b.ask = v || undefined; }, 'the card\'s ask line'));
    }
    // --- legend ---
    inspector.append(section('LEGEND'));
    {
      const legend = mapLegend(m);
      const used = new Map<string, number>();
      for (const row of m.grid) for (const ch of row) used.set(ch, (used.get(ch) ?? 0) + 1);
      for (const [ch, spec] of Object.entries(legend)) {
        const r = hrow();
        const chip = document.createElement('code');
        chip.textContent = ch === ' ' ? '␠' : ch;
        css(chip, { color: DEV_UI.accent, width: '16px', textAlign: 'center' });
        const sw = document.createElement('span');
        css(sw, { display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: regionColor(spec.region ?? 'ground', theme()), border: '1px solid rgba(255,255,255,0.3)' });
        const txt = document.createElement('span');
        txt.textContent = `${spec.region ?? 'ground'}${spec.doodad ? ` + ${spec.doodad.kind}` : ''} · ${used.get(ch) ?? 0} cells${DEFAULT_LEGEND[ch] && !m.legend?.[ch] ? ' · default' : ''}`;
        css(txt, { flex: '1', fontSize: '11px', color: DEV_UI.text });
        r.append(chip, sw, txt);
        if (m.legend?.[ch] && !ro) {
          r.append(btn('✎ brush', () => { st.brushRegion = spec.region ?? 'ground'; setTool('paint'); }),
            btn('✕', () => mut(() => { delete m.legend![ch]; if (!Object.keys(m.legend!).length) delete m.legend; }, true)));
        }
        inspector.append(r);
      }
      const padTxt = document.createElement('div');
      padTxt.textContent = `␠ / outside → pad '${m.pad ?? AUTHORED_CFG.padRegion}'`;
      css(padTxt, { fontSize: '11px', color: DEV_UI.textDim });
      inspector.append(padTxt);
    }
    // --- census + lint ---
    inspector.append(section('CENSUS'));
    {
      const c = document.createElement('div');
      css(c, { fontSize: '11px', color: DEV_UI.textDim, whiteSpace: 'pre-wrap' });
      const walk = m.grid.reduce((n, row) => n + [...row].filter(ch => regionKind(mapCellRegion(m, ch))?.walkable).length, 0);
      const seats = (m.spawns ?? []).reduce((n, s) => n + (s.count ?? 1), 0);
      c.textContent = `${walk} walkable cells of ${m.cols * m.rows} · ${(m.doodads ?? []).length} doodads · ${(m.spawns ?? []).length} seats (${seats} bodies) · ${(m.markers ?? []).length} markers · ${(m.fixtures ?? []).length} fixtures · ${(m.exits ?? []).length} exits`
        + (st.preview ? `\ngenerated: ${st.preview.doodads.length} doodads · ${st.preview.landmarkSpawns?.length ?? 0} spawn rows · ${st.preview.structures?.length ?? 0} structures · ${st.preview.pois.length} pois` : '');
      inspector.append(c);
    }
    inspector.append(section('LINT'), lintHost);
    refreshLint();
  };

  // --- open/close -------------------------------------------------------------------------------------------
  const open = (id?: string): void => {
    // Show FIRST, then measure: fitView reads the canvas box, and a hidden
    // root measures 0×0 (the min-zoom postage stamp).
    root.style.display = 'flex';
    resize();
    rebuildRoster();
    rebuildLayerRow();
    setTool(st.tool);
    if (id && (atlasMap(id) ?? AUTHORED_MAPS[id])) selectMap(id);
    else if (!st.working) rebuildInspector();
    else fitView();
    syncHead();
    if (!rafOn) { rafOn = true; requestAnimationFrame(frame); }
    requestRender();
  };
  const close = (): void => {
    if (!confirmDiscard()) return;
    root.style.display = 'none';
    rafOn = false;
    delete AUTHORED_MAPS[SCRATCH_ID];
  };

  // Start-menu entry: the menu rebuilds its innerHTML per render, so the button
  // re-injects through the render hook — CHAINED behind the forges' (mounted
  // after them in main.ts).
  const prevHook = ui.onStartMenuRender;
  ui.onStartMenuRender = (): void => {
    prevHook?.();
    const wrap = document.querySelector('#start-menu .esc-btns');
    if (!wrap || document.getElementById('sm-map-forge')) return;
    const b = document.createElement('button');
    b.id = 'sm-map-forge';
    b.textContent = '🗺 Map Forge (Dev)';
    b.addEventListener('click', () => open());
    wrap.append(b);
  };

  // Headless QA surface (the __entityForge idiom).
  (window as unknown as Record<string, unknown>).__mapForge = {
    open, close, state: (): ForgeState => st, save: doSave, select: selectMap, newMap, redraw: draw,
    setTool, paintAt: (x: number, y: number, region: string): boolean => { const ok = paintAt(vec(x, y), region); if (ok) afterEdit(); return ok; },
    place: (x: number, y: number): void => place(vec(x, y), false),
    preview: (): GeneratedLayout | null => { runPreview(); return st.preview; },
    exportTS: (): string => st.working ? serializeMapTS(st.working) : '',
    lint: (): string[] => st.lint,
    mint: doMint, remint: doRemint, capture: doCapture, fit: fitView,
    /** Headless QA: a hidden pane measures 0×0 — size the canvas by hand. */
    size: (w: number, h: number): void => {
      cw = Math.max(64, Math.floor(w)); ch = Math.max(64, Math.floor(h)); dpr = 1;
      canvas.width = cw; canvas.height = ch;
      fitView();
    },
  };

  return { open };
}
