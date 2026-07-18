// ---------------------------------------------------------------------------
// THE GLYPH FORGE — hand-draw kit-parts and doodad kinds (config.ts
// DEV.entityForge gates the whole forge family). One full-screen overlay,
// two modes over one drawing kit:
//
//   PART mode — draw a GlyphDef, save it as a 'custom_' PART kind
//   (meta/workshop upsertWorkshopGlyphPart → PART_PAINTERS): instantly
//   usable in ANY look, the Entity Forge's add-part list included. STENCIL
//   TRACE renders any existing painter faintly under your strokes — load
//   'snout', trace the muzzle, skip the ears, save 'custom_candid_snout';
//   the shipped painter is never touched.
//
//   DOODAD mode — the same drawing becomes a world object: color/material/
//   order/shadow/light dials + the WHOLE DoodadRule vocabulary, with the
//   collision surface AUTO-DERIVED from the drawn geometry
//   (deriveGlyphSurface → rule.bodyScale or rule.surface — the two data
//   lanes hitSurfaceOf resolves, so movement, shots, sight and nav all test
//   what you drew; the derived shape is overlaid and overridable). Place-at-
//   hero / sprinkle spawn instances into the live zone (the self-healing
//   doodad index picks them up by construction).
//
// Tools: poly / path (click points, Enter or double-click commits, Escape
// cancels), disc / ring (click center, click rim), select (click an op,
// drag to move it). Wheel zooms; the unit ring marks 1 body radius; points
// snap to 0.02R (the shipped data precision). Undo = Ctrl+Z.
//
// Self-contained DOM (the mountDevPanel convention). Start-menu entry
// CHAINS UI.onStartMenuRender (the entity forge holds it first).
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { UI } from '../ui/panels';
import type { Doodad, DoodadRule } from '../engine/levelgen';
import { vec } from '../core/math';
import {
  GLYPH_CFG, lookPalette, paintGlyph, PART_PAINTERS,
  type GlyphDef, type GlyphOp, type PaletteRole, type PartSpec,
} from '../render/vis/parts';
import { MATERIALS } from '../render/vis/materials';
import {
  cloneData, deriveGlyphSurface, isWorkshopId,
  removeWorkshopDoodad, removeWorkshopGlyphPart,
  serializeDoodadTS, serializeGlyphPartTS,
  upsertWorkshopDoodad, upsertWorkshopGlyphPart,
  workshop, WORKSHOP_PREFIX,
  type WorkshopDoodadKind, type WorkshopGlyphPart,
} from '../meta/workshop';
import {
  btn, check, css, DEV_UI, hrow, listRow, numInput, option, section,
  selectEl, textInput, wireFilter,
} from './ui';

/** Glyph Forge dials. */
export const GLYPH_FORGE_CFG = {
  z: 100000,
  canvasCss: 460,
  oversample: 2,
  unitFrac: 0.5,   // 1 body radius = this fraction of the half-canvas at zoom 1
  snap: 0.02,      // point snap in R units (the shipped data precision)
  grabPx: 14,      // select-tool op grab radius (CSS px)
  stencilAlpha: 0.28,
  previewRadii: [10, 16, 26],
  undoCap: 60,
} as const;

type ForgeMode = 'part' | 'doodad';
type Tool = 'poly' | 'path' | 'disc' | 'ring' | 'select';

interface GlyphForgeState {
  mode: ForgeMode;
  /** The working row (part or doodad shell — doodad extras unused in part mode). */
  row: WorkshopDoodadKind;
  loadedKind: string | null;
  dirty: boolean;
  tool: Tool;
  draft: [number, number][];   // in-progress clicks (R units)
  draftCenter: [number, number] | null; // disc/ring first click
  selOp: number;
  stencil: string;             // part kind painted under the drawing ('' = none)
  previewColor: string;
  previewMaterial: string;
  zoom: number;
  undo: string[];
}

const ROLE_OPTIONS: (PaletteRole | '')[] = ['', 'base', 'bone', 'metal', 'wood', 'cloth', 'dark', 'glow', 'accent'];

const freshRow = (kind: string): WorkshopDoodadKind => ({
  kind,
  glyph: { ops: [] },
  color: '#8a8276',
  rule: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 40 },
});

export function mountGlyphForge(ui: UI, getWorld: () => World): { open: (mode?: ForgeMode, kind?: string) => void } {
  const st: GlyphForgeState = {
    mode: 'part',
    row: freshRow(`${WORKSHOP_PREFIX}part`),
    loadedKind: null,
    dirty: false,
    tool: 'poly',
    draft: [],
    draftCenter: null,
    selOp: -1,
    stencil: '',
    previewColor: '#8a7a5a',
    previewMaterial: '',
    zoom: 1,
    undo: [],
  };

  const runActive = (): World | null => {
    const w = getWorld();
    return w && w.seats && w.seats.length > 0 && !w.gameOver && !w.player.dead ? w : null;
  };

  // --- shell -----------------------------------------------------------------
  const root = document.createElement('div');
  css(root, {
    position: 'fixed', inset: '0', zIndex: String(GLYPH_FORGE_CFG.z), display: 'none',
    flexDirection: 'column', background: 'rgba(10,9,14,0.97)', color: DEV_UI.text,
    font: DEV_UI.font, padding: '10px', gap: '8px',
  });

  const header = document.createElement('div');
  css(header, { display: 'flex', gap: '8px', alignItems: 'center' });
  const title = document.createElement('div');
  title.textContent = '🖌 GLYPH FORGE';
  css(title, { color: DEV_UI.accent, fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' });
  const modeSel = selectEl();
  modeSel.append(option('part', 'mode: PART (kit-part)'), option('doodad', 'mode: DOODAD (world object)'));
  modeSel.addEventListener('change', () => setMode(modeSel.value as ForgeMode));
  const headId = document.createElement('div');
  css(headId, { color: DEV_UI.heading, flex: '1' });
  header.append(title, modeSel, headId,
    btn('＋ New', () => newRow()),
    btn('⧉ Clone', () => cloneRow()),
    btn('🗑 Delete', () => deleteRow()),
    btn('✕ Close', () => close()));

  const main = document.createElement('div');
  css(main, { display: 'flex', gap: '10px', flex: '1', minHeight: '0' });

  // Roster.
  const rosterPane = document.createElement('div');
  css(rosterPane, { width: '210px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: '0' });
  const rosterFilter = textInput('filter…');
  const rosterList = document.createElement('div');
  css(rosterList, { overflowY: 'auto', flex: '1', display: 'flex', flexDirection: 'column' });
  wireFilter(rosterFilter, rosterList);
  rosterPane.append(rosterFilter, rosterList);

  // Canvas column.
  const canvasPane = document.createElement('div');
  css(canvasPane, { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', flexShrink: '0' });
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_FORGE_CFG.canvasCss * GLYPH_FORGE_CFG.oversample;
  canvas.height = GLYPH_FORGE_CFG.canvasCss * GLYPH_FORGE_CFG.oversample;
  css(canvas, {
    width: `${GLYPH_FORGE_CFG.canvasCss}px`, height: `${GLYPH_FORGE_CFG.canvasCss}px`,
    background: '#131019', border: `1px solid ${DEV_UI.border}`, borderRadius: '6px',
    cursor: 'crosshair', touchAction: 'none',
  });
  const toolRow = hrow();
  const toolSel = selectEl();
  for (const t of ['poly', 'path', 'disc', 'ring', 'select'] as Tool[]) toolSel.append(option(t, `tool: ${t}`));
  toolSel.addEventListener('change', () => { st.tool = toolSel.value as Tool; resetDraft(); });
  const commitBtn = btn('✔ commit stroke', () => commitDraft());
  const stencilSel = selectEl();
  stencilSel.addEventListener('change', () => { st.stencil = stencilSel.value; });
  toolRow.append(toolSel, commitBtn, stencilSel);
  const previewStrip = document.createElement('canvas');
  previewStrip.width = 340 * GLYPH_FORGE_CFG.oversample;
  previewStrip.height = 84 * GLYPH_FORGE_CFG.oversample;
  css(previewStrip, {
    width: '340px', height: '84px', background: '#17141f',
    border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '5px',
  });
  const hint = document.createElement('div');
  css(hint, { color: DEV_UI.textDim, fontSize: '10px', maxWidth: `${GLYPH_FORGE_CFG.canvasCss}px`, textAlign: 'center' });
  hint.textContent = 'click = place point · Enter/double-click = commit · Esc = cancel stroke · select tool: click op, drag moves it · wheel = zoom · Ctrl+Z undo · unit ring = 1 body radius';
  canvasPane.append(canvas, toolRow, previewStrip, hint);

  // Inspector.
  const inspector = document.createElement('div');
  css(inspector, { flex: '1', minWidth: '300px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '2px' });

  // Footer.
  const footer = document.createElement('div');
  css(footer, { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' });
  const status = document.createElement('div');
  css(status, { color: DEV_UI.good, flex: '1', minWidth: '180px', whiteSpace: 'pre-wrap', maxHeight: '60px', overflowY: 'auto', fontSize: '11px' });
  const flash = (msg: string): void => { status.textContent = msg; };
  const placeBtn = btn('⚑ Place at hero', () => placeDoodads(1));
  const sprinkleBtn = btn('✨ Sprinkle 5', () => placeDoodads(5));
  const radiusIn = numInput(16, 4, 120, '52px');
  radiusIn.title = 'placed instance radius (px)';
  footer.append(
    btn('💾 Save to Workshop', () => { if (doSave()) flash(`saved → workshop (${st.row.kind})`); }),
    btn('📋 Export TS', () => openExport()),
    placeBtn, sprinkleBtn, radiusIn, status);

  main.append(rosterPane, canvasPane, inspector);
  root.append(header, main, footer);
  document.body.append(root);

  // --- state helpers ---------------------------------------------------------
  const glyph = (): GlyphDef => st.row.glyph;
  const pal = (): ReturnType<typeof lookPalette> =>
    lookPalette(st.mode === 'doodad' && !st.row.color.startsWith('theme:') ? st.row.color : st.previewColor,
      st.mode === 'doodad' ? st.row.material : (st.previewMaterial || undefined));

  const pushUndo = (): void => {
    st.undo.push(JSON.stringify(st.row));
    if (st.undo.length > GLYPH_FORGE_CFG.undoCap) st.undo.shift();
  };
  const popUndo = (): void => {
    const s = st.undo.pop();
    if (!s) return;
    st.row = JSON.parse(s) as WorkshopDoodadKind;
    st.dirty = true;
    st.selOp = -1;
    rebuildInspector();
    flash('undo');
  };
  const afterEdit = (): void => { st.dirty = true; syncHead(); };

  const syncHead = (): void => {
    headId.textContent = `${st.row.kind}  ·  ${st.mode}  ·  ${glyph().ops.length} ops${st.dirty ? '  ·  unsaved' : ''}`;
  };

  const confirmDiscard = (): boolean =>
    !st.dirty || window.confirm('Discard unsaved changes to this drawing?');

  const resetDraft = (): void => { st.draft = []; st.draftCenter = null; };

  const setMode = (m: ForgeMode): void => {
    if (m === st.mode) return;
    if (!confirmDiscard()) { modeSel.value = st.mode; return; }
    st.mode = m;
    modeSel.value = m;
    newRow(true);
    rebuildRoster();
  };

  // --- roster ----------------------------------------------------------------
  const rebuildRoster = (): void => {
    rosterList.innerHTML = '';
    // Stencil options refresh alongside (every painter incl. drawn ones).
    stencilSel.innerHTML = '';
    stencilSel.append(option('', 'stencil: none'));
    for (const k of Object.keys(PART_PAINTERS).sort()) stencilSel.append(option(k, `stencil: ${k}`));
    stencilSel.value = st.stencil;
    const placeable = st.mode === 'doodad';
    placeBtn.style.display = placeable ? '' : 'none';
    sprinkleBtn.style.display = placeable ? '' : 'none';
    radiusIn.style.display = placeable ? '' : 'none';
    if (st.mode === 'part') {
      rosterList.append(section(`DRAWN PARTS (${workshop.glyphParts.length})`));
      for (const p of workshop.glyphParts) {
        rosterList.append(listRow(p.kind, DEV_UI.accent, `${p.glyph.ops.length} ops`, () => selectRow(p.kind)));
      }
    } else {
      rosterList.append(section(`DRAWN DOODADS (${workshop.doodads.length})`));
      for (const d of workshop.doodads) {
        rosterList.append(listRow(d.kind, DEV_UI.accent, d.rule.overlap, () => selectRow(d.kind)));
      }
    }
    rosterFilter.dispatchEvent(new Event('input'));
  };

  const selectRow = (kind: string): void => {
    if (!confirmDiscard()) return;
    if (st.mode === 'part') {
      const p = workshop.glyphParts.find(x => x.kind === kind);
      if (!p) return;
      st.row = { ...freshRow(kind), glyph: cloneData(p.glyph) };
    } else {
      const d = workshop.doodads.find(x => x.kind === kind);
      if (!d) return;
      st.row = cloneData(d);
    }
    st.loadedKind = kind;
    st.dirty = false;
    st.selOp = -1;
    st.undo.length = 0;
    resetDraft();
    rebuildInspector();
    syncHead();
    flash(`loaded ${kind}`);
  };

  const nextFreeKind = (base: string): string => {
    const taken = (k: string): boolean =>
      !!PART_PAINTERS[k] || workshop.glyphParts.some(x => x.kind === k)
      || workshop.doodads.some(x => x.kind === k);
    let k = base;
    for (let n = 2; taken(k); n++) k = `${base}_${n}`;
    return k;
  };

  const newRow = (silent = false): void => {
    if (!silent && !confirmDiscard()) return;
    st.row = freshRow(nextFreeKind(`${WORKSHOP_PREFIX}${st.mode === 'part' ? 'part' : 'doodad'}`));
    st.loadedKind = null;
    st.dirty = false;
    st.selOp = -1;
    st.undo.length = 0;
    resetDraft();
    rebuildInspector();
    syncHead();
    if (!silent) flash(`new ${st.mode} draft ${st.row.kind}`);
  };

  const cloneRow = (): void => {
    const src = cloneData(st.row);
    src.kind = nextFreeKind(src.kind);
    st.row = src;
    st.loadedKind = null;
    st.dirty = true;
    st.undo.length = 0;
    rebuildInspector();
    syncHead();
    flash(`cloned → ${st.row.kind} — Save to keep it`);
  };

  const deleteRow = (): void => {
    const kind = st.loadedKind ?? st.row.kind;
    const inStore = st.mode === 'part'
      ? workshop.glyphParts.some(x => x.kind === kind)
      : workshop.doodads.some(x => x.kind === kind);
    if (!inStore) { newRow(true); flash('draft discarded'); return; }
    if (!window.confirm(`Delete ${kind} from the workshop? Looks/zones naming it degrade to the silent-skip / fallback-disc lanes.`)) return;
    if (st.mode === 'part') removeWorkshopGlyphPart(kind); else removeWorkshopDoodad(kind);
    newRow(true);
    rebuildRoster();
    flash(`deleted ${kind}`);
  };

  const doSave = (): boolean => {
    const kind = st.row.kind;
    if (!isWorkshopId(kind)) { flash(`✗ kind must start with '${WORKSHOP_PREFIX}'`); return false; }
    if (glyph().ops.length === 0) { flash('✗ nothing drawn yet'); return false; }
    let err: string | null;
    if (st.mode === 'part') {
      const row: WorkshopGlyphPart = { kind, glyph: cloneData(glyph()) };
      err = upsertWorkshopGlyphPart(row);
    } else {
      err = upsertWorkshopDoodad(cloneData(st.row));
    }
    if (err) { flash(`✗ ${err}`); return false; }
    // A rename retires the old row after the new one landed.
    if (st.loadedKind && st.loadedKind !== kind) {
      if (st.mode === 'part') removeWorkshopGlyphPart(st.loadedKind);
      else removeWorkshopDoodad(st.loadedKind);
    }
    st.loadedKind = kind;
    st.dirty = false;
    rebuildRoster();
    syncHead();
    return true;
  };

  const openExport = (): void => {
    const text = st.mode === 'part'
      ? serializeGlyphPartTS({ kind: st.row.kind, glyph: glyph() })
      : serializeDoodadTS(st.row);
    const modal = document.createElement('div');
    css(modal, {
      position: 'fixed', inset: '0', zIndex: String(GLYPH_FORGE_CFG.z + 1), display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
    });
    const box = document.createElement('div');
    css(box, {
      width: '720px', maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      gap: '6px', background: DEV_UI.bg, border: `1px solid ${DEV_UI.border}`, borderRadius: '6px', padding: '10px',
    });
    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = text;
    css(ta, {
      flex: '1', minHeight: '300px', background: DEV_UI.bgInput, color: DEV_UI.text,
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '8px',
      font: '11px Consolas, monospace', whiteSpace: 'pre', resize: 'none',
    });
    const row = hrow();
    row.append(
      btn('Copy to clipboard', () => {
        ta.select();
        void navigator.clipboard?.writeText(ta.value).catch(() => { /* selection remains */ });
      }),
      btn('Close', () => modal.remove()));
    box.append(section('EXPORT — promotion literals'), ta, row);
    modal.append(box);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    root.append(modal);
  };

  const placeDoodads = (n: number): void => {
    if (st.mode !== 'doodad') return;
    if (!doSave()) return;
    const w = runActive();
    if (!w) { flash('no live run — start a game to place instances'); return; }
    const r = Math.max(4, Number(radiusIn.value) || 16);
    for (let i = 0; i < n; i++) {
      // Dev placement jitter — presentation only, no seed discipline needed.
      const ang = Math.random() * Math.PI * 2;
      const dist = n === 1 ? 70 : 70 + Math.random() * 160;
      const d: Doodad = {
        pos: vec(w.player.pos.x + Math.cos(ang) * dist, w.player.pos.y + Math.sin(ang) * dist),
        radius: r,
        kind: st.row.kind,
        rot: Math.random() * Math.PI * 2,
      };
      w.doodads.push(d);
    }
    // The doodad index + nav self-heal on the length change; the marker just
    // makes the intent explicit for in-place mutations elsewhere.
    (w as unknown as { markDoodadsChanged?: () => void }).markDoodadsChanged?.();
    flash(`placed ${n}× ${st.row.kind} beside the hero (r ${r})`);
  };

  // --- canvas drawing --------------------------------------------------------
  const OS = GLYPH_FORGE_CFG.oversample;
  const ctx2d = canvas.getContext('2d')!;
  const half = canvas.width / 2;
  const unitPx = (): number => half * GLYPH_FORGE_CFG.unitFrac * st.zoom;

  const toR = (ex: number, ey: number): [number, number] => {
    const s = unitPx();
    const x = (ex * OS - half) / s;
    const y = (ey * OS - half) / s;
    const q = GLYPH_FORGE_CFG.snap;
    return [Math.round(x / q) * q, Math.round(y / q) * q];
  };

  const opCenter = (op: GlyphOp): [number, number] => {
    if (op.kind === 'disc' || op.kind === 'ring') return [op.x ?? 0, op.y ?? 0];
    const pts = op.pts ?? [];
    if (!pts.length) return [0, 0];
    let sx = 0, sy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; }
    return [sx / pts.length, sy / pts.length];
  };

  const draw = (): void => {
    const c = ctx2d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    const s = unitPx();
    c.save();
    c.translate(half, half);
    // Grid (0.25R) + axes + the unit ring.
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    const span = Math.ceil(half / (s * 0.25));
    for (let i = -span; i <= span; i++) {
      c.beginPath(); c.moveTo(i * s * 0.25, -half); c.lineTo(i * s * 0.25, half); c.stroke();
      c.beginPath(); c.moveTo(-half, i * s * 0.25); c.lineTo(half, i * s * 0.25); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); c.moveTo(-half, 0); c.lineTo(half, 0); c.stroke();
    c.beginPath(); c.moveTo(0, -half); c.lineTo(0, half); c.stroke();
    c.strokeStyle = 'rgba(232,212,74,0.28)';
    c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(232,212,74,0.5)';
    c.font = `${11 * OS}px Verdana`;
    c.fillText('+X = facing', s * 1.02, -6 * OS);

    const p = pal();
    // Stencil under the drawing (part mode) — any painter, faint.
    if (st.mode === 'part' && st.stencil && PART_PAINTERS[st.stencil]) {
      c.save();
      c.globalAlpha = GLYPH_FORGE_CFG.stencilAlpha;
      PART_PAINTERS[st.stencil](c, s, { kind: st.stencil } as PartSpec, p, 0.35);
      c.restore();
    }
    // The drawing itself, through the REAL interpreter.
    paintGlyph(c, s, { kind: 'glyph' }, p, glyph(), performance.now() / 1000);
    // Doodad mode: the DERIVED COLLISION overlay (drawn == tested, visibly).
    if (st.mode === 'doodad') {
      const rule = st.row.rule;
      c.strokeStyle = 'rgba(120,200,255,0.6)';
      c.setLineDash([6 * OS, 4 * OS]);
      c.lineWidth = 2;
      if (rule.surface) {
        c.strokeRect(-rule.surface.hw * s, -rule.surface.hh * s, rule.surface.hw * 2 * s, rule.surface.hh * 2 * s);
      } else {
        c.beginPath(); c.arc(0, 0, s * (rule.bodyScale ?? 1), 0, Math.PI * 2); c.stroke();
      }
      c.setLineDash([]);
    }
    // Selected-op handles + centers.
    glyph().ops.forEach((op, i) => {
      const sel = i === st.selOp;
      const [cx, cy] = opCenter(op);
      c.strokeStyle = sel ? DEV_UI.accent : 'rgba(216,212,224,0.35)';
      c.lineWidth = sel ? 2 : 1;
      c.beginPath(); c.arc(cx * s, cy * s, (sel ? 8 : 4) * OS, 0, Math.PI * 2); c.stroke();
      if (sel && (op.kind === 'poly' || op.kind === 'path')) {
        c.fillStyle = DEV_UI.accent;
        for (const [x, y] of op.pts ?? []) {
          c.beginPath(); c.arc(x * s, y * s, 2.5 * OS, 0, Math.PI * 2); c.fill();
        }
      }
    });
    // In-progress draft.
    if (st.draft.length || st.draftCenter) {
      c.strokeStyle = '#7ec850';
      c.fillStyle = '#7ec850';
      c.lineWidth = 1.5;
      if (st.draftCenter) {
        c.beginPath(); c.arc(st.draftCenter[0] * s, st.draftCenter[1] * s, 3 * OS, 0, Math.PI * 2); c.fill();
      }
      if (st.draft.length) {
        c.beginPath();
        c.moveTo(st.draft[0][0] * s, st.draft[0][1] * s);
        for (const [x, y] of st.draft.slice(1)) c.lineTo(x * s, y * s);
        c.stroke();
        for (const [x, y] of st.draft) {
          c.beginPath(); c.arc(x * s, y * s, 2.5 * OS, 0, Math.PI * 2); c.fill();
        }
      }
    }
    c.restore();
  };

  const drawPreviewStrip = (): void => {
    const c = previewStrip.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, previewStrip.width, previewStrip.height);
    const p = pal();
    let x = 60 * OS;
    for (const r of GLYPH_FORGE_CFG.previewRadii) {
      c.save();
      c.translate(x, previewStrip.height / 2);
      c.strokeStyle = 'rgba(255,255,255,0.08)';
      c.beginPath(); c.arc(0, 0, r * OS, 0, Math.PI * 2); c.stroke();
      paintGlyph(c, r * OS, { kind: 'glyph' }, p, glyph(), performance.now() / 1000);
      c.restore();
      x += 110 * OS;
    }
  };

  let rafOn = false;
  const frame = (): void => {
    if (!rafOn) return;
    draw();
    drawPreviewStrip();
    requestAnimationFrame(frame);
  };

  // --- canvas interaction ----------------------------------------------------
  const commitDraft = (): void => {
    if (st.tool === 'poly' || st.tool === 'path') {
      if (st.draft.length < 2) { resetDraft(); return; }
      pushUndo();
      glyph().ops.push({
        kind: st.tool, pts: st.draft.slice(0, GLYPH_CFG.maxPts),
        ...(st.tool === 'poly' ? {} : {}),
      });
      st.selOp = glyph().ops.length - 1;
      resetDraft();
      afterEdit();
      rebuildInspector();
    }
  };

  let dragOp: { i: number; lastX: number; lastY: number } | null = null;

  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* uncapturable (QA) */ }
    const [x, y] = toR(e.offsetX, e.offsetY);
    if (st.tool === 'select') {
      const s = unitPx();
      const grab = GLYPH_FORGE_CFG.grabPx * OS / s;
      let best = -1, bestD = grab;
      glyph().ops.forEach((op, i) => {
        const [cx, cy] = opCenter(op);
        const d = Math.hypot(cx - x, cy - y);
        if (d <= bestD) { bestD = d; best = i; }
      });
      st.selOp = best;
      if (best >= 0) { pushUndo(); dragOp = { i: best, lastX: x, lastY: y }; }
      rebuildInspector();
      return;
    }
    if (st.tool === 'disc' || st.tool === 'ring') {
      if (!st.draftCenter) { st.draftCenter = [x, y]; return; }
      const [cx, cy] = st.draftCenter;
      const r = Math.max(GLYPH_FORGE_CFG.snap, Math.hypot(x - cx, y - cy));
      pushUndo();
      glyph().ops.push({ kind: st.tool, x: cx, y: cy, rx: Math.round(r * 100) / 100 });
      st.selOp = glyph().ops.length - 1;
      resetDraft();
      afterEdit();
      rebuildInspector();
      return;
    }
    st.draft.push([x, y]);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragOp) return;
    const [x, y] = toR(e.offsetX, e.offsetY);
    const dx = x - dragOp.lastX, dy = y - dragOp.lastY;
    if (!dx && !dy) return;
    dragOp.lastX = x; dragOp.lastY = y;
    const op = glyph().ops[dragOp.i];
    if (!op) return;
    const rnd = (v: number): number => Math.round(v * 100) / 100;
    if (op.kind === 'disc' || op.kind === 'ring') {
      op.x = rnd((op.x ?? 0) + dx);
      op.y = rnd((op.y ?? 0) + dy);
    } else if (op.pts) {
      op.pts = op.pts.map(([px, py]) => [rnd(px + dx), rnd(py + dy)] as [number, number]);
    }
    afterEdit();
  });
  canvas.addEventListener('pointerup', () => { dragOp = null; });
  canvas.addEventListener('dblclick', () => commitDraft());
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    st.zoom = Math.min(4, Math.max(0.3, st.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1)));
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (root.style.display === 'none') return;
    const tgt = e.target as HTMLElement | null;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT')) return;
    if (e.key === 'Enter') { commitDraft(); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      if (st.draft.length || st.draftCenter) resetDraft();
      else if (st.selOp >= 0) { st.selOp = -1; rebuildInspector(); }
      else close();
      return;
    }
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); popUndo(); return; }
    if (e.key === 'Delete' && st.selOp >= 0) {
      pushUndo();
      glyph().ops.splice(st.selOp, 1);
      st.selOp = -1;
      afterEdit();
      rebuildInspector();
      e.preventDefault();
    }
  });

  // --- inspector -------------------------------------------------------------
  const labeled = (label: string, el: HTMLElement, help?: string): HTMLElement => {
    const row = document.createElement('div');
    css(row, { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 0' });
    const lab = document.createElement('span');
    lab.textContent = label;
    css(lab, { width: '120px', flexShrink: '0', color: DEV_UI.text, fontSize: '11px' });
    if (help) { lab.title = help; css(lab, { cursor: 'help', borderBottom: `1px dotted ${DEV_UI.borderDim}` }); }
    row.append(lab, el);
    return row;
  };

  const numField = (v: number | undefined, min: number, max: number, step: number,
    apply: (n: number | undefined) => void, width = '58px'): HTMLInputElement => {
    const i = numInput(0, min, max, width);
    i.step = String(step);
    i.value = v === undefined ? '' : String(v);
    i.placeholder = '—';
    i.addEventListener('change', () => {
      if (i.value.trim() === '') { pushUndo(); apply(undefined); afterEdit(); return; }
      const n = Number(i.value);
      if (!Number.isFinite(n)) return;
      pushUndo();
      apply(Math.min(max, Math.max(min, n)));
      afterEdit();
    });
    return i;
  };

  const rebuildInspector = (): void => {
    inspector.innerHTML = '';
    // Kind row.
    inspector.append(section('IDENTITY'));
    const idRow = hrow();
    const chip = document.createElement('span');
    chip.textContent = WORKSHOP_PREFIX;
    css(chip, { color: DEV_UI.accent, fontSize: '11px' });
    const suffix = textInput('kind_suffix');
    suffix.value = st.row.kind.startsWith(WORKSHOP_PREFIX) ? st.row.kind.slice(WORKSHOP_PREFIX.length) : st.row.kind;
    suffix.addEventListener('change', () => {
      const clean = suffix.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!clean) { suffix.value = st.row.kind.slice(WORKSHOP_PREFIX.length); return; }
      pushUndo();
      st.row.kind = WORKSHOP_PREFIX + clean;
      suffix.value = clean;
      afterEdit();
    });
    idRow.append(chip, suffix);
    inspector.append(labeled('Kind', idRow, 'Saved under custom_<suffix>; rename on save retires the old row'));

    // Preview palette (part mode: preview-only; doodad mode: the real dials).
    if (st.mode === 'part') {
      const prevRow = hrow();
      const col = document.createElement('input');
      col.type = 'color';
      col.value = st.previewColor;
      col.addEventListener('change', () => { st.previewColor = col.value; });
      const mat = selectEl();
      mat.append(option('', 'material: flesh'));
      for (const m of Object.keys(MATERIALS)) mat.append(option(m, `material: ${m}`));
      mat.value = st.previewMaterial;
      mat.addEventListener('change', () => { st.previewMaterial = mat.value; });
      prevRow.append(col, mat);
      inspector.append(labeled('Preview palette', prevRow, 'Preview only — a part is recolored by whatever entity wears it (role ramps)'));
    } else {
      inspector.append(section('DOODAD LOOK'));
      const colorIn = textInput("#hex or 'theme:key|#fallback'");
      colorIn.value = st.row.color;
      colorIn.addEventListener('change', () => { pushUndo(); st.row.color = colorIn.value.trim() || '#8a8276'; afterEdit(); });
      inspector.append(labeled('Color', colorIn, 'The palette seed; theme: specs re-dress per biome'));
      const mat = selectEl();
      mat.append(option('', 'material: flesh'));
      for (const m of Object.keys(MATERIALS)) mat.append(option(m, `material: ${m}`));
      mat.value = st.row.material ?? '';
      mat.addEventListener('change', () => { pushUndo(); st.row.material = mat.value || undefined; afterEdit(); });
      inspector.append(labeled('Material', mat));
      const lookRow = hrow();
      lookRow.append(
        labeled('order', numField(st.row.order, 0, 80, 1, n => { st.row.order = n; })),
        labeled('shadow', numField(st.row.shadow, 0, 1, 0.05, n => { st.row.shadow = n; })),
        labeled('longShadow', numField(st.row.longShadow, 0, 3, 0.05, n => { st.row.longShadow = n; })));
      inspector.append(lookRow);
      const lightRow = hrow();
      const lr = numField(st.row.light?.radius, -20, 400, 0.5, n => {
        if (n === undefined) { delete st.row.light; rebuildInspector(); return; }
        st.row.light = { radius: n, color: st.row.light?.color ?? '#ffb45e', intensity: st.row.light?.intensity ?? 0.5, flicker: st.row.light?.flicker };
        rebuildInspector();
      });
      lightRow.append(labeled('light radius', lr, 'blank = no glow; negative = × instance radius'));
      if (st.row.light) {
        const lc = textInput('#hex');
        lc.value = st.row.light.color;
        css(lc, { flex: '0 1 84px' });
        lc.addEventListener('change', () => { pushUndo(); st.row.light!.color = lc.value.trim() || '#ffb45e'; afterEdit(); });
        lightRow.append(lc,
          labeled('intensity', numField(st.row.light.intensity, 0, 2, 0.05, n => { st.row.light!.intensity = n ?? 0.5; })),
          labeled('flicker', numField(st.row.light.flicker, 0, 20, 0.5, n => { st.row.light!.flicker = n; })));
      }
      inspector.append(lightRow);

      inspector.append(section('RULE (collision & placement)'));
      const rule = st.row.rule;
      const ovRow = hrow();
      const ov = selectEl();
      for (const o of ['solid', 'ground', 'inert', 'trigger']) ov.append(option(o, `overlap: ${o}`));
      ov.value = rule.overlap;
      ov.addEventListener('change', () => { pushUndo(); rule.overlap = ov.value as DoodadRule['overlap']; afterEdit(); });
      ovRow.append(ov);
      const flag = (label: string, key: 'blocksMove' | 'blocksShot' | 'blocksSight'): void => {
        const c2 = check(label, !!rule[key]);
        c2.box.addEventListener('change', () => {
          pushUndo();
          if (c2.box.checked) rule[key] = true; else delete rule[key];
          afterEdit();
        });
        ovRow.append(c2.el);
      };
      flag('blocks move', 'blocksMove');
      flag('blocks shot', 'blocksShot');
      flag('blocks sight', 'blocksSight');
      inspector.append(ovRow);
      const spacingRow = hrow();
      spacingRow.append(
        labeled('spacing', numField(rule.spacing, 0, 400, 5, n => { rule.spacing = n; }, '64px')),
        labeled('bodyScale', numField(rule.bodyScale, 0.1, 2, 0.05, n => { rule.bodyScale = n; })));
      inspector.append(spacingRow);

      inspector.append(section('COLLISION SURFACE (drawn == tested)'));
      const derived = deriveGlyphSurface(glyph());
      const derRow = hrow();
      const derLabel = document.createElement('span');
      derLabel.textContent = derived.surface
        ? `derived: rect hw ${derived.surface.hw.toFixed(2)} × hh ${derived.surface.hh.toFixed(2)} (spins with rot)`
        : `derived: disc × ${derived.bodyScale?.toFixed(2)}`;
      css(derLabel, { color: DEV_UI.textDim, fontSize: '11px', flex: '1' });
      derRow.append(derLabel, btn('↳ apply derived', () => {
        pushUndo();
        if (derived.surface) { rule.surface = derived.surface; delete rule.bodyScale; }
        else { rule.bodyScale = derived.bodyScale; delete rule.surface; }
        afterEdit();
        rebuildInspector();
      }));
      inspector.append(derRow);
      const surfRow = hrow();
      surfRow.append(
        labeled('rect hw', numField(rule.surface?.hw, 0.05, 4, 0.05, n => {
          if (n === undefined) { delete rule.surface; rebuildInspector(); return; }
          rule.surface = { hw: n, hh: rule.surface?.hh ?? n, orient: rule.surface?.orient ?? 'rot' };
        })),
        labeled('rect hh', numField(rule.surface?.hh, 0.05, 4, 0.05, n => {
          if (rule.surface && n !== undefined) rule.surface.hh = n;
        })));
      inspector.append(surfRow);
      inspector.append(labeled('rule (full JSON)', ruleJsonArea(), 'The WHOLE DoodadRule vocabulary — brittle, contact payloads, clearway, habitat, fall, warms…'));
    }

    // Ops list + selected-op editor (both modes).
    inspector.append(section(`OPS (${glyph().ops.length}) — painted in order`));
    glyph().ops.forEach((op, i) => {
      const selected = i === st.selOp;
      const row = document.createElement('div');
      css(row, {
        display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 4px', borderRadius: '3px',
        background: selected ? DEV_UI.bgActive : 'transparent', cursor: 'pointer',
      });
      const label = document.createElement('span');
      const desc = op.kind === 'disc' || op.kind === 'ring'
        ? `${op.kind} @${(op.x ?? 0).toFixed(2)},${(op.y ?? 0).toFixed(2)} r${(op.rx ?? 0.1).toFixed(2)}`
        : `${op.kind} ×${op.pts?.length ?? 0}${op.smooth ? ' ~' : ''}`;
      label.textContent = `${i}: ${desc}${op.mirror ? ' ⇋' : ''}${op.role ? ` ${op.role}` : ''}`;
      css(label, { flex: '1', fontSize: '11px' });
      row.append(label);
      const move = (d: number): void => {
        const j = i + d;
        if (j < 0 || j >= glyph().ops.length) return;
        pushUndo();
        [glyph().ops[i], glyph().ops[j]] = [glyph().ops[j], glyph().ops[i]];
        if (st.selOp === i) st.selOp = j;
        afterEdit();
        rebuildInspector();
      };
      row.append(
        btn('↑', () => move(-1)), btn('↓', () => move(1)),
        btn('⧉', () => { pushUndo(); glyph().ops.splice(i + 1, 0, cloneData(op)); afterEdit(); rebuildInspector(); }),
        btn('✕', () => { pushUndo(); glyph().ops.splice(i, 1); if (st.selOp === i) st.selOp = -1; afterEdit(); rebuildInspector(); }));
      row.addEventListener('click', e => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        st.selOp = selected ? -1 : i;
        rebuildInspector();
      });
      inspector.append(row);
      if (selected) inspector.append(opEditor(op));
    });
  };

  const ruleJsonArea = (): HTMLElement => {
    const ta = document.createElement('textarea');
    css(ta, {
      flex: '1', minHeight: '44px', background: DEV_UI.bgInput, color: DEV_UI.text,
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '4px 6px',
      font: '11px Consolas, monospace', resize: 'vertical',
    });
    ta.value = JSON.stringify(st.row.rule);
    ta.addEventListener('change', () => {
      try {
        const v = JSON.parse(ta.value) as DoodadRule;
        if (typeof v.overlap !== 'string') throw new Error('rule needs overlap');
        pushUndo();
        st.row.rule = v;
        afterEdit();
        rebuildInspector();
      } catch {
        ta.style.borderColor = '#c85050';
      }
    });
    return ta;
  };

  const opEditor = (op: GlyphOp): HTMLElement => {
    const wrap = document.createElement('div');
    css(wrap, { display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px 6px', borderLeft: `2px solid ${DEV_UI.border}` });
    const r1 = hrow();
    const role = selectEl();
    for (const r of ROLE_OPTIONS) role.append(option(r, r === '' ? 'role: base (default)' : `role: ${r}`));
    role.value = op.role ?? '';
    role.addEventListener('change', () => { pushUndo(); if (role.value) op.role = role.value as PaletteRole; else delete op.role; afterEdit(); rebuildInspector(); });
    const colorIn = textInput('color override');
    colorIn.value = op.color ?? '';
    css(colorIn, { flex: '0 1 100px' });
    colorIn.addEventListener('change', () => { pushUndo(); const v = colorIn.value.trim(); if (v) op.color = v; else delete op.color; afterEdit(); });
    r1.append(role, colorIn,
      labeled('shade', numField(op.shade, -1, 1, 0.05, n => { if (n === undefined || n === 0) delete op.shade; else op.shade = n; }, '52px')),
      labeled('alpha', numField(op.alpha, 0, 1, 0.05, n => { if (n === undefined || n >= 1) delete op.alpha; else op.alpha = n; }, '52px')));
    wrap.append(r1);
    const r2 = hrow();
    const flags: [string, 'fill' | 'stroke' | 'outline' | 'mirror' | 'smooth' | 'closed'][] = [
      ['fill', 'fill'], ['stroke', 'stroke'], ['outline', 'outline'], ['mirror ⇋', 'mirror'], ['smooth ~', 'smooth'], ['closed', 'closed'],
    ];
    for (const [label, key] of flags) {
      const cur = op[key];
      const c2 = check(label, cur === undefined ? defaultFlag(op, key) : !!cur);
      c2.box.addEventListener('change', () => {
        pushUndo();
        const dflt = defaultFlag(op, key);
        if (c2.box.checked === dflt) delete op[key]; else op[key] = c2.box.checked;
        afterEdit();
        rebuildInspector();
      });
      r2.append(c2.el);
    }
    wrap.append(r2);
    const r3 = hrow();
    r3.append(
      labeled('stroke w px', numField(op.w, 0.5, 20, 0.5, n => { if (n === undefined) delete op.w; else op.w = n; }, '52px')),
      labeled('or w ×R', numField(op.wR, 0.01, 0.5, 0.01, n => { if (n === undefined) delete op.wR; else op.wR = n; }, '52px')));
    wrap.append(r3);
    const r4 = hrow();
    r4.append(
      labeled('sway ax', numField(op.sway?.ax, 0, 1, 0.02, n => setSway('ax', n), '52px')),
      labeled('ay', numField(op.sway?.ay, 0, 1, 0.02, n => setSway('ay', n), '52px')),
      labeled('freq', numField(op.sway?.freq, 0.1, 12, 0.1, n => setSway('freq', n), '52px')),
      labeled('phase', numField(op.sway?.phase, 0, 6.28, 0.1, n => setSway('phase', n), '52px')));
    const setSway = (k: 'ax' | 'ay' | 'freq' | 'phase', n: number | undefined): void => {
      if (n === undefined) {
        if (op.sway) { delete op.sway[k]; if (!op.sway.ax && !op.sway.ay) delete op.sway; }
        return;
      }
      (op.sway ??= {})[k] = n;
    };
    wrap.append(r4);
    return wrap;
  };

  const defaultFlag = (op: GlyphOp, key: 'fill' | 'stroke' | 'outline' | 'mirror' | 'smooth' | 'closed'): boolean => {
    const strokeDefault = op.kind === 'path' || op.kind === 'ring';
    if (key === 'fill') return !strokeDefault;
    if (key === 'stroke') return strokeDefault;
    if (key === 'closed') return op.kind === 'poly';
    return false;
  };

  // --- open/close + entry points ---------------------------------------------
  const open = (mode?: ForgeMode, kind?: string): void => {
    if (mode && mode !== st.mode) { st.mode = mode; modeSel.value = mode; newRow(true); }
    rebuildRoster();
    if (kind) selectRow(kind);
    else rebuildInspector();
    syncHead();
    root.style.display = 'flex';
    if (!rafOn) { rafOn = true; requestAnimationFrame(frame); }
  };
  const close = (): void => {
    if (!confirmDiscard()) return;
    root.style.display = 'none';
    rafOn = false;
  };

  // Start-menu entry — CHAIN the hook (the Entity Forge holds it first).
  const prevHook = ui.onStartMenuRender;
  ui.onStartMenuRender = (): void => {
    prevHook?.();
    const wrap = document.querySelector('#start-menu .esc-btns');
    if (!wrap || document.getElementById('sm-glyph-forge')) return;
    const b = document.createElement('button');
    b.id = 'sm-glyph-forge';
    b.textContent = '🖌 Part & Doodad Forge (Dev)';
    b.addEventListener('click', () => open());
    wrap.append(b);
  };

  (window as unknown as Record<string, unknown>).__glyphForge = {
    open, close, state: (): GlyphForgeState => st, save: doSave,
    select: selectRow, redraw: (): void => { draw(); drawPreviewStrip(); },
  };

  return { open };
}
