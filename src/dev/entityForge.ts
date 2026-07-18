// ---------------------------------------------------------------------------
// THE ENTITY FORGE — a full-screen entity creator/tweaker (config.ts
// DEV.entityForge), the monster/entity editor in the passive-tree-editor
// lineage. Reachable from the START MENU ("Entity Forge" button, injected via
// UI.onStartMenuRender) and from the dev panel's Forge tab in-game.
//
// THREE PANES: the ROSTER (workshop entities + every authored def — authored
// rows open read-only with a Clone-to-Workshop banner: the tweaker flow),
// the PREVIEW (compose mode = the working look painted DIRECTLY through
// paintLook/paintLiveParts — drag a part to move it, wheel to scale, [ ] to
// rotate, m to mirror; portrait mode = drawPortraitInto, the exact bestiary
// compositor incl. worm bodies and composite parts), and the INSPECTOR
// (bespoke panes for the look composer / base stats / kit & grants / brain,
// plus the FORGE_FIELDS schema rows and the ADVANCED_KEYS JSON panes — every
// MonsterDef field reachable, the whole-def JSON as the final escape hatch).
//
// The store is THE WORKSHOP (meta/workshop.ts): Save grafts the entity into
// the live registries under the 'custom_' namespace and persists; Spawn saves
// first, then rides the ordinary World.devGrabSpawn + promoteMonster seams;
// Validate saves, re-runs the REAL validateContent() and shows the lines that
// name this entity — the same net shipped content answers to. Export TS emits
// promotion literals (serializeEntityTS).
//
// Preview honesty: composed looks change ROW CONTENTS, not their registry id,
// and body bakes key on the id — so the forge registers the working look
// under a VERSIONED scratch id (__forge_v<n>, bumped per edit) for portrait
// mode, paints compose mode directly (no bake at all), and the workshop's
// upsert flushes bakes on save. Drawn is never stale.
//
// Self-contained DOM (the mountDevPanel convention): appended to
// document.body, touches nothing in the game UI, trivially removable.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { UI } from '../ui/panels';
import { MONSTERS, type MonsterDef } from '../data/monsters';
import { LOOKS } from '../data/looks';
import {
  PART_PAINTERS, lookPalette, paintLook, paintLiveParts,
  type LookDef, type PartSpec,
} from '../render/vis/parts';
import { bodySprite, shapeIsOriented, type BodyLook } from '../render/vis/body';
import { drawPortraitInto, portraitSubjectOf, type PortraitDefLike } from '../render/vis/portrait';
import { RARITY_DEFS, type MonsterRarity } from '../engine/rarity';
import { ARCHETYPES } from '../engine/brain';
import { STAT_DEFS } from '../engine/stats';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { validateContent } from '../data/validate';
import {
  cloneData, isWorkshopId, removeWorkshopEntity, serializeEntityTS,
  upsertWorkshopEntity, workshop, workshopEntity, WORKSHOP_PREFIX,
  type WorkshopEntity,
} from '../meta/workshop';
import {
  ADVANCED_KEYS, FORGE_FIELDS, FORGE_SECTIONS, getPath, setPath,
  type ForgeField,
} from './forgeSchema';
import {
  btn, check, css, DEV_UI, hrow, listRow, numInput, option, section,
  selectEl, textInput, wireFilter,
} from './ui';

/** Forge dials — one knob block, no magic literals in the body. */
export const FORGE_CFG = {
  z: 100000,            // above the dev panel (99999)
  canvasCss: 460,       // preview square (CSS px)
  oversample: 2,        // backing-store multiplier
  fit: 0.8,             // body radius as a fraction of the half-canvas at zoom 1
  grabPx: 20,           // part-marker grab radius (CSS px)
  nudge: 0.02,          // arrow-key nudge (body radii)
  rotStep: Math.PI / 36,// [ ] rotate step (5°)
  scaleStep: 0.05,      // wheel scale step
  poseT: 0.35,          // frozen clock for live parts while not animating
  undoCap: 60,
} as const;

interface SelRef { list: 'parts' | 'live'; i: number }

interface ForgeState {
  working: WorkshopEntity | null;
  /** 'workshop' edits live; 'authored' is read-only until cloned; 'new' is an
   *  unsaved workshop draft. */
  source: 'workshop' | 'authored' | 'new';
  loadedId: string | null;   // id at load time (rename detection)
  dirty: boolean;
  sel: SelRef | null;
  mode: 'compose' | 'portrait';
  viewFacing: number;
  viewZoom: number;
  anim: boolean;
  animT: number;
  rarity: MonsterRarity;
  ver: number;               // scratch-look version (portrait cache busting)
  undo: string[];
}

const scratchId = (n: number): string => `__forge_v${n}`;

export function mountEntityForge(ui: UI, getWorld: () => World): { open: (id?: string) => void } {
  const st: ForgeState = {
    working: null, source: 'new', loadedId: null, dirty: false, sel: null,
    mode: 'compose', viewFacing: Math.PI / 2, viewZoom: 1, anim: true, animT: 0,
    rarity: 'normal', ver: 0, undo: [],
  };

  const runActive = (): World | null => {
    const w = getWorld();
    return w && w.seats && w.seats.length > 0 && !w.gameOver && !w.player.dead ? w : null;
  };

  // --- shell ----------------------------------------------------------------
  const root = document.createElement('div');
  css(root, {
    position: 'fixed', inset: '0', zIndex: String(FORGE_CFG.z), display: 'none',
    flexDirection: 'column', background: 'rgba(10,9,14,0.97)', color: DEV_UI.text,
    font: DEV_UI.font, padding: '10px', gap: '8px',
  });

  const header = document.createElement('div');
  css(header, { display: 'flex', gap: '8px', alignItems: 'center' });
  const title = document.createElement('div');
  title.textContent = '🛠 ENTITY FORGE';
  css(title, { color: DEV_UI.accent, fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' });
  const headId = document.createElement('div');
  css(headId, { color: DEV_UI.heading, flex: '1' });
  header.append(title, headId,
    btn('＋ New', () => newEntity()),
    btn('⧉ Clone', () => cloneCurrent()),
    btn('🗑 Delete', () => deleteCurrent()),
    btn('✕ Close', () => close()));

  const main = document.createElement('div');
  css(main, { display: 'flex', gap: '10px', flex: '1', minHeight: '0' });

  // --- roster ---------------------------------------------------------------
  const rosterPane = document.createElement('div');
  css(rosterPane, { width: '240px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: '0' });
  const rosterFilter = textInput('filter…');
  const rosterList = document.createElement('div');
  css(rosterList, { overflowY: 'auto', flex: '1', display: 'flex', flexDirection: 'column' });
  wireFilter(rosterFilter, rosterList);
  rosterPane.append(rosterFilter, rosterList);

  // --- preview --------------------------------------------------------------
  const previewPane = document.createElement('div');
  css(previewPane, { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', flexShrink: '0' });
  const canvas = document.createElement('canvas');
  canvas.width = FORGE_CFG.canvasCss * FORGE_CFG.oversample;
  canvas.height = FORGE_CFG.canvasCss * FORGE_CFG.oversample;
  css(canvas, {
    width: `${FORGE_CFG.canvasCss}px`, height: `${FORGE_CFG.canvasCss}px`,
    background: '#131019', border: `1px solid ${DEV_UI.border}`, borderRadius: '6px',
    cursor: 'crosshair', touchAction: 'none',
  });
  const previewCtl = hrow();
  const modeSel = selectEl();
  modeSel.append(option('compose', 'Compose view'), option('portrait', 'Portrait view'));
  modeSel.addEventListener('change', () => { st.mode = modeSel.value as ForgeState['mode']; });
  const raritySel = selectEl();
  for (const r of Object.keys(RARITY_DEFS)) raritySel.append(option(r, r));
  raritySel.addEventListener('change', () => { st.rarity = raritySel.value as MonsterRarity; });
  const animBox = check('animate', st.anim);
  animBox.box.addEventListener('change', () => { st.anim = animBox.box.checked; });
  const facingIn = numInput(90, 0, 360, '56px');
  facingIn.title = 'facing (deg) — or drag empty canvas';
  facingIn.addEventListener('change', () => { st.viewFacing = (Number(facingIn.value) || 0) * Math.PI / 180; });
  previewCtl.append(modeSel, raritySel, animBox.el, facingIn);
  const hint = document.createElement('div');
  css(hint, { color: DEV_UI.textDim, fontSize: '10px', maxWidth: `${FORGE_CFG.canvasCss}px`, textAlign: 'center' });
  hint.textContent = 'drag part = move · wheel = scale (none selected: zoom) · [ ] rotate · m mirror · arrows nudge · Del remove · Ctrl+Z undo · drag empty = orbit facing';
  previewPane.append(canvas, previewCtl, hint);

  // --- inspector ------------------------------------------------------------
  const inspector = document.createElement('div');
  css(inspector, { flex: '1', minWidth: '320px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '2px' });

  // --- footer ---------------------------------------------------------------
  const footer = document.createElement('div');
  css(footer, { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' });
  const status = document.createElement('div');
  css(status, { color: DEV_UI.good, flex: '1', minWidth: '200px', whiteSpace: 'pre-wrap', maxHeight: '72px', overflowY: 'auto', fontSize: '11px' });
  const flash = (msg: string): void => { status.textContent = msg; };
  footer.append(
    btn('💾 Save to Workshop', () => { if (doSave()) flash(`saved → workshop (${st.working?.def.id})`); }),
    btn('✔ Save + Validate', () => doValidate()),
    btn('📋 Export TS', () => openExport()),
    btn('⚔ Spawn to Test', () => doSpawn()),
    status);

  main.append(rosterPane, previewPane, inspector);
  root.append(header, main, footer);
  document.body.append(root);

  // Shared datalists (big id pickers render as text inputs + datalist).
  const mkDatalist = (id: string, opts: () => string[]): string => {
    const dl = document.createElement('datalist');
    dl.id = id;
    root.append(dl);
    refreshers.push(() => {
      dl.innerHTML = '';
      for (const o of opts()) dl.append(option(o, o));
    });
    return id;
  };
  const refreshers: (() => void)[] = [];
  const DL_SKILLS = mkDatalist('forge-dl-skills', () => Object.keys(SKILLS).sort());
  const DL_SUPPORTS = mkDatalist('forge-dl-supports', () => Object.keys(SUPPORTS).sort());
  const DL_STATS = mkDatalist('forge-dl-stats', () => Object.keys(STAT_DEFS).sort());
  const DL_LOOKS = mkDatalist('forge-dl-looks', () => Object.keys(LOOKS).filter(k => !k.startsWith('__forge')).sort());

  // --- state helpers ---------------------------------------------------------
  const readonly = (): boolean => st.source === 'authored';

  /** The look the PREVIEW draws: the working composed look, else the def's
   *  authored look entry (viewing shipped content), else none (legacy body). */
  const displayLook = (): LookDef | undefined => {
    if (!st.working) return undefined;
    if (st.working.look) return st.working.look;
    const id = st.working.def.look;
    return id ? LOOKS[id] : undefined;
  };

  const pushUndo = (): void => {
    if (!st.working) return;
    st.undo.push(JSON.stringify(st.working));
    if (st.undo.length > FORGE_CFG.undoCap) st.undo.shift();
  };
  const popUndo = (): void => {
    const s = st.undo.pop();
    if (!s || !st.working) return;
    st.working = JSON.parse(s) as WorkshopEntity;
    st.dirty = true;
    bumpPreview();
    rebuildInspector();
    flash('undo');
  };

  /** Re-register the working look under a fresh scratch id so portrait-mode
   *  body bakes can never serve a stale composition. */
  const bumpPreview = (): void => {
    delete LOOKS[scratchId(st.ver)];
    if (st.working?.look) {
      st.ver++;
      LOOKS[scratchId(st.ver)] = st.working.look;
    }
  };

  const afterEdit = (): void => {
    st.dirty = true;
    bumpPreview();
    syncHead();
  };

  const syncHead = (): void => {
    if (!st.working) { headId.textContent = '—'; return; }
    const tag = st.source === 'authored' ? 'AUTHORED (read-only — Clone to edit)'
      : st.dirty ? 'workshop · unsaved' : 'workshop';
    headId.textContent = `${st.working.def.name}  ·  ${st.working.def.id}  ·  ${tag}`;
  };

  const confirmDiscard = (): boolean =>
    !st.dirty || st.source === 'authored' || window.confirm('Discard unsaved changes to this entity?');

  // --- roster ----------------------------------------------------------------
  const rebuildRoster = (): void => {
    for (const r of refreshers) r();
    rosterList.innerHTML = '';
    rosterList.append(section(`WORKSHOP (${workshop.entities.length})`));
    for (const e of workshop.entities) {
      rosterList.append(listRow(e.def.name, DEV_UI.accent, e.def.id, () => selectEntity(e.def.id)));
    }
    rosterList.append(section('AUTHORED'));
    for (const id of Object.keys(MONSTERS).sort()) {
      if (isWorkshopId(id) || id.startsWith('__forge')) continue;
      const d = MONSTERS[id];
      rosterList.append(listRow(d.name, d.color, id, () => selectEntity(id)));
    }
    rosterFilter.dispatchEvent(new Event('input')); // re-apply the live filter
  };

  const selectEntity = (id: string): void => {
    if (!confirmDiscard()) return;
    const we = workshopEntity(id);
    if (we) {
      st.working = cloneData(we);
      st.source = 'workshop';
    } else if (MONSTERS[id]) {
      st.working = { def: cloneData(MONSTERS[id]) };
      st.source = 'authored';
    } else return;
    st.loadedId = id;
    st.dirty = false;
    st.sel = null;
    st.undo.length = 0;
    bumpPreview();
    rebuildInspector();
    syncHead();
    flash(`loaded ${id}${st.source === 'authored' ? ' (read-only — Clone to edit)' : ''}`);
  };

  const nextFreeId = (base: string): string => {
    let id = base;
    for (let n = 2; MONSTERS[id] || workshopEntity(id); n++) id = `${base}_${n}`;
    return id;
  };

  const newEntity = (): void => {
    if (!confirmDiscard()) return;
    const id = nextFreeId(`${WORKSHOP_PREFIX}entity`);
    st.working = {
      def: {
        id, name: 'New Entity', color: '#8a7a5a', shape: 'circle', radius: 14,
        base: { life: 40, moveSpeed: 110, accuracy: 70, mana: 0 },
        skills: ['claw'], xp: 8,
      } as MonsterDef,
      look: { parts: [{ kind: 'torso' }, { kind: 'eyes' }] },
    };
    st.source = 'new';
    st.loadedId = null;
    st.dirty = true;
    st.sel = null;
    st.undo.length = 0;
    bumpPreview();
    rebuildInspector();
    syncHead();
    flash(`new draft ${id} — Save to keep it`);
  };

  const cloneCurrent = (): void => {
    if (!st.working) return;
    const src = st.working;
    const baseSuffix = src.def.id.replace(new RegExp(`^${WORKSHOP_PREFIX}`), '');
    const id = nextFreeId(`${WORKSHOP_PREFIX}${baseSuffix}`);
    const def = cloneData(src.def);
    def.id = id;
    // Cloning an authored def pulls its registry look INTO the workshop copy
    // so the composer starts from the real rows (the tweaker flow).
    const look = src.look ? cloneData(src.look)
      : (src.def.look && LOOKS[src.def.look] ? cloneData(LOOKS[src.def.look]) : undefined);
    if (look) def.look = id;
    st.working = look ? { def, look } : { def };
    st.source = 'new';
    st.loadedId = null;
    st.dirty = true;
    st.sel = null;
    st.undo.length = 0;
    bumpPreview();
    rebuildInspector();
    syncHead();
    flash(`cloned → ${id} — Save to keep it`);
  };

  const deleteCurrent = (): void => {
    if (!st.working) return;
    if (st.source === 'authored') { flash('authored defs are not deletable here'); return; }
    const id = st.loadedId ?? st.working.def.id;
    if (!workshopEntity(id)) { st.working = null; st.sel = null; rebuildInspector(); syncHead(); flash('draft discarded'); return; }
    if (!window.confirm(`Delete ${id} from the workshop? Saves referencing it will simply skip its spawns.`)) return;
    removeWorkshopEntity(id);
    st.working = null;
    st.loadedId = null;
    st.dirty = false;
    st.sel = null;
    rebuildRoster();
    rebuildInspector();
    syncHead();
    flash(`deleted ${id}`);
  };

  // --- save / validate / spawn / export --------------------------------------
  const doSave = (): boolean => {
    if (!st.working) return false;
    if (st.source === 'authored') { flash('authored defs are read-only — Clone to Workshop first'); return false; }
    const w = cloneData(st.working);
    const err = upsertWorkshopEntity(w);
    if (err) { flash(`✗ ${err}`); return false; }
    // A rename leaves the old id behind — retire it after the new one landed.
    if (st.loadedId && st.loadedId !== w.def.id && workshopEntity(st.loadedId)) {
      removeWorkshopEntity(st.loadedId);
    }
    st.loadedId = w.def.id;
    st.source = 'workshop';
    st.dirty = false;
    rebuildRoster();
    syncHead();
    return true;
  };

  const doValidate = (): void => {
    if (!doSave() || !st.working) return;
    const id = st.working.def.id;
    const captured: string[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]): void => { captured.push(a.map(String).join(' ')); };
    try { validateContent(); } finally { console.warn = orig; }
    const mine = captured.filter(s => s.includes(id));
    flash(mine.length
      ? `⚠ ${mine.length} validator line(s) for ${id}:\n${mine.join('\n')}`
      : `✔ ${id} passes the content validator clean`);
  };

  const doSpawn = (): void => {
    if (!doSave() || !st.working) return;
    const w = runActive();
    if (!w) { flash('no live run — start a game, then spawn (the forge stays available in the pause/dev flow)'); return; }
    const id = st.working.def.id;
    if (!w.devGrabSpawn(id)) { flash(`✗ spawn refused (${id} not registered?)`); return; }
    const a = w.actors[w.actors.length - 1];
    if (st.rarity !== 'normal' && a && a.defId === id) w.promoteMonster(a, st.rarity);
    flash(`spawned ${id}${st.rarity !== 'normal' ? ` (${st.rarity})` : ''} beside the hero`);
  };

  const openExport = (): void => {
    if (!st.working) return;
    const modal = document.createElement('div');
    css(modal, {
      position: 'fixed', inset: '0', zIndex: String(FORGE_CFG.z + 1), display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
    });
    const box = document.createElement('div');
    css(box, {
      width: '720px', maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      gap: '6px', background: DEV_UI.bg, border: `1px solid ${DEV_UI.border}`, borderRadius: '6px', padding: '10px',
    });
    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = serializeEntityTS(st.working);
    css(ta, {
      flex: '1', minHeight: '340px', background: DEV_UI.bgInput, color: DEV_UI.text,
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '8px',
      font: '11px Consolas, monospace', whiteSpace: 'pre', resize: 'none',
    });
    const row = hrow();
    row.append(
      btn('Copy to clipboard', () => {
        ta.select();
        void navigator.clipboard?.writeText(ta.value).catch(() => { /* selection remains for manual copy */ });
      }),
      btn('Close', () => modal.remove()));
    box.append(section('EXPORT — promotion literals (paste into src/data)'), ta, row);
    modal.append(box);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    root.append(modal);
  };

  // --- preview drawing --------------------------------------------------------
  const OS = FORGE_CFG.oversample;
  const ctx2d = canvas.getContext('2d')!;

  const previewScale = (): number => {
    const def = st.working?.def;
    if (!def) return 1;
    const r = Math.max(4, def.radius) * (RARITY_DEFS[st.rarity]?.sizeMul ?? 1);
    return (canvas.width / 2) * FORGE_CFG.fit * st.viewZoom / r;
  };

  const drawCompose = (): void => {
    const def = st.working!.def;
    const look = displayLook();
    const r = Math.max(4, def.radius) * (RARITY_DEFS[st.rarity]?.sizeMul ?? 1);
    const s = previewScale();
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx2d.save();
    ctx2d.translate(cx, cy);
    ctx2d.scale(s, s);
    // Contact shadow (unrotated — top-down light).
    ctx2d.save();
    ctx2d.globalAlpha = 0.3;
    ctx2d.fillStyle = '#000';
    ctx2d.beginPath();
    ctx2d.ellipse(0, r * 0.18, r * 1.05 * (look?.shadowScale ?? 1), r * 0.42, 0, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
    const rot = look || shapeIsOriented(def.shape) ? st.viewFacing : 0;
    ctx2d.rotate(rot);
    const t = st.anim ? st.animT : FORGE_CFG.poseT;
    if (look) {
      const pal = lookPalette(def.color, def.material);
      paintLook(ctx2d, r, look, pal);
      paintLiveParts(ctx2d, r, look, pal, t);
      // Part-origin markers (screen-constant size inside the scaled frame).
      const mk = (spec: PartSpec, selected: boolean): void => {
        const px = (spec.x ?? 0) * r, py = (spec.y ?? 0) * r;
        ctx2d.save();
        ctx2d.lineWidth = (selected ? 2 : 1) * OS / s;
        ctx2d.strokeStyle = selected ? DEV_UI.accent : 'rgba(216,212,224,0.5)';
        ctx2d.beginPath();
        ctx2d.arc(px, py, (selected ? 9 : 5) * OS / s, 0, Math.PI * 2);
        ctx2d.stroke();
        ctx2d.restore();
      };
      look.parts.forEach((p, i) => mk(p, st.sel?.list === 'parts' && st.sel.i === i));
      (look.live ?? []).forEach((p, i) => mk(p, st.sel?.list === 'live' && st.sel.i === i));
    } else {
      const bl: BodyLook = { shape: def.shape, radius: r, color: def.color, material: def.material };
      const spr = bodySprite(bl);
      ctx2d.drawImage(spr, -spr.width / 2, -spr.height / 2);
    }
    ctx2d.restore();
  };

  const drawPortrait = (): void => {
    const def = st.working!.def;
    const defLike: PortraitDefLike = {
      shape: def.shape, radius: def.radius, color: def.color, material: def.material,
      adorn: def.adorn, demonHorns: undefined, portrait: def.portrait,
      look: st.working!.look ? scratchId(st.ver) : def.look,
      worm: def.worm, parts: def.parts,
    };
    const subject = portraitSubjectOf(defLike, { resolvePart: id => MONSTERS[id] });
    drawPortraitInto(canvas, subject, st.anim ? st.animT : FORGE_CFG.poseT);
  };

  let lastTs = 0;
  let rafOn = false;
  const frame = (ts: number): void => {
    if (!rafOn) return;
    const dt = Math.min(0.1, (ts - lastTs) / 1000) || 0;
    lastTs = ts;
    if (st.anim) st.animT += dt;
    draw();
    requestAnimationFrame(frame);
  };
  const draw = (): void => {
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    if (!st.working) return;
    if (st.mode === 'compose') drawCompose();
    else drawPortrait();
  };

  // --- canvas interaction -----------------------------------------------------
  /** Screen (CSS px, canvas-relative) → body space (radii). */
  const toBody = (ex: number, ey: number): { x: number; y: number } => {
    const def = st.working!.def;
    const r = Math.max(4, def.radius) * (RARITY_DEFS[st.rarity]?.sizeMul ?? 1);
    const s = previewScale();
    const dx = ex * OS - canvas.width / 2;
    const dy = ey * OS - canvas.height / 2;
    const cos = Math.cos(-st.viewFacing), sin = Math.sin(-st.viewFacing);
    return { x: (dx * cos - dy * sin) / s / r, y: (dx * sin + dy * cos) / s / r };
  };

  const hitPart = (ex: number, ey: number): SelRef | null => {
    const look = displayLook();
    if (!look || !st.working) return null;
    const p = toBody(ex, ey);
    const def = st.working.def;
    const r = Math.max(4, def.radius) * (RARITY_DEFS[st.rarity]?.sizeMul ?? 1);
    const s = previewScale();
    const grab = FORGE_CFG.grabPx * OS / s / r; // grab radius in body-radii
    let best: SelRef | null = null;
    let bestD = grab;
    const scan = (list: 'parts' | 'live', rows: PartSpec[]): void => {
      rows.forEach((spec, i) => {
        const d = Math.hypot((spec.x ?? 0) - p.x, (spec.y ?? 0) - p.y);
        if (d <= bestD) { bestD = d; best = { list, i }; }
      });
    };
    scan('parts', look.parts);
    scan('live', look.live ?? []);
    return best;
  };

  const selSpec = (): PartSpec | null => {
    if (!st.sel || !st.working?.look) return null;
    const rows = st.sel.list === 'parts' ? st.working.look.parts : st.working.look.live;
    return rows?.[st.sel.i] ?? null;
  };

  let drag: { mode: 'part' | 'orbit'; lastX: number; lastY: number; moved: boolean } | null = null;

  canvas.addEventListener('pointerdown', e => {
    if (!st.working) return;
    // Capture keeps the drag alive off-canvas; synthetic pointers (headless
    // QA) have no capturable id — the drag itself must not die with it.
    try { canvas.setPointerCapture(e.pointerId); } catch { /* uncapturable */ }
    if (st.mode !== 'compose') { drag = { mode: 'orbit', lastX: e.offsetX, lastY: e.offsetY, moved: false }; return; }
    const hit = hitPart(e.offsetX, e.offsetY);
    st.sel = hit;
    if (hit && !readonly() && st.working.look) {
      pushUndo();
      drag = { mode: 'part', lastX: e.offsetX, lastY: e.offsetY, moved: false };
    } else {
      drag = { mode: 'orbit', lastX: e.offsetX, lastY: e.offsetY, moved: false };
    }
    rebuildLookPane();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || !st.working) return;
    const dx = e.offsetX - drag.lastX, dy = e.offsetY - drag.lastY;
    drag.lastX = e.offsetX; drag.lastY = e.offsetY;
    if (dx === 0 && dy === 0) return;
    drag.moved = true;
    if (drag.mode === 'part') {
      const spec = selSpec();
      if (!spec) return;
      const def = st.working.def;
      const r = Math.max(4, def.radius) * (RARITY_DEFS[st.rarity]?.sizeMul ?? 1);
      const s = previewScale();
      const cos = Math.cos(-st.viewFacing), sin = Math.sin(-st.viewFacing);
      const bx = (dx * OS * cos - dy * OS * sin) / s / r;
      const by = (dx * OS * sin + dy * OS * cos) / s / r;
      spec.x = Math.round(((spec.x ?? 0) + bx) * 100) / 100;
      spec.y = Math.round(((spec.y ?? 0) + by) * 100) / 100;
      afterEdit();
      syncSelInputs();
    } else {
      st.viewFacing += dx * 0.01;
      facingIn.value = String(Math.round(((st.viewFacing * 180 / Math.PI) % 360 + 360) % 360));
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.mode === 'part' && !drag.moved) st.undo.pop(); // click-select: no edit happened
    drag = null;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const spec = selSpec();
    const dir = e.deltaY > 0 ? -1 : 1;
    if (spec && !readonly() && st.mode === 'compose') {
      pushUndo();
      if (e.ctrlKey) spec.rot = Math.round((((spec.rot ?? 0) + dir * FORGE_CFG.rotStep)) * 1000) / 1000;
      else spec.scale = Math.max(0.05, Math.round(((spec.scale ?? 1) + dir * FORGE_CFG.scaleStep) * 100) / 100);
      afterEdit();
      syncSelInputs();
    } else {
      st.viewZoom = Math.min(6, Math.max(0.2, st.viewZoom * (dir > 0 ? 1.1 : 1 / 1.1)));
    }
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (root.style.display === 'none') return;
    const tgt = e.target as HTMLElement | null;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT')) return;
    if (e.key === 'Escape') { if (st.sel) { st.sel = null; rebuildLookPane(); } else close(); return; }
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); popUndo(); return; }
    const spec = selSpec();
    if (!spec || readonly()) return;
    const step = FORGE_CFG.nudge * (e.shiftKey ? 5 : 1);
    const apply = (fn: () => void): void => { pushUndo(); fn(); afterEdit(); syncSelInputs(); e.preventDefault(); };
    if (e.key === 'ArrowLeft') apply(() => { spec.x = Math.round(((spec.x ?? 0) - step) * 100) / 100; });
    else if (e.key === 'ArrowRight') apply(() => { spec.x = Math.round(((spec.x ?? 0) + step) * 100) / 100; });
    else if (e.key === 'ArrowUp') apply(() => { spec.y = Math.round(((spec.y ?? 0) - step) * 100) / 100; });
    else if (e.key === 'ArrowDown') apply(() => { spec.y = Math.round(((spec.y ?? 0) + step) * 100) / 100; });
    else if (e.key === '[') apply(() => { spec.rot = (spec.rot ?? 0) - FORGE_CFG.rotStep; });
    else if (e.key === ']') apply(() => { spec.rot = (spec.rot ?? 0) + FORGE_CFG.rotStep; });
    else if (e.key === 'm') apply(() => { spec.mirror = spec.mirror ? undefined : true; });
    else if (e.key === 'Delete') {
      pushUndo();
      removeSelRow();
      e.preventDefault();
    }
  });

  const removeSelRow = (): void => {
    if (!st.sel || !st.working?.look) return;
    const look = st.working.look;
    if (st.sel.list === 'parts') look.parts.splice(st.sel.i, 1);
    else look.live?.splice(st.sel.i, 1);
    if (look.live && look.live.length === 0) delete look.live;
    st.sel = null;
    afterEdit();
    rebuildLookPane();
  };

  // --- inspector: shared field renderers --------------------------------------
  const labeled = (label: string, el: HTMLElement, help?: string): HTMLElement => {
    const row = document.createElement('div');
    css(row, { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 0' });
    const lab = document.createElement('span');
    lab.textContent = label;
    css(lab, { width: '148px', flexShrink: '0', color: DEV_UI.text, fontSize: '11px' });
    if (help) { lab.title = help; css(lab, { cursor: 'help', borderBottom: `1px dotted ${DEV_UI.borderDim}` }); }
    row.append(lab, el);
    return row;
  };

  const commitNum = (f: ForgeField, raw: string): void => {
    const def = st.working!.def as unknown as Record<string, unknown>;
    if (raw.trim() === '') {
      if (!f.required) { pushUndo(); setPath(def, f.path, undefined); afterEdit(); }
      return;
    }
    let v = Number(raw);
    if (!Number.isFinite(v)) return;
    if (f.kind === 'int') v = Math.round(v);
    if (f.min !== undefined) v = Math.max(f.min, v);
    if (f.max !== undefined) v = Math.min(f.max, v);
    pushUndo();
    setPath(def, f.path, v);
    afterEdit();
  };

  const renderField = (f: ForgeField): HTMLElement => {
    const def = st.working!.def as unknown as Record<string, unknown>;
    const cur = getPath(def, f.path);
    const ro = readonly();
    let el: HTMLElement;
    switch (f.kind) {
      case 'num': case 'int': {
        const i = numInput(0, f.min ?? -1e9, f.max ?? 1e9, '70px');
        if (f.step !== undefined) i.step = String(f.step);
        i.value = cur === undefined ? '' : String(cur);
        i.placeholder = '—';
        i.disabled = ro;
        i.addEventListener('change', () => commitNum(f, i.value));
        el = i;
        break;
      }
      case 'text': {
        const i = textInput('—');
        i.value = typeof cur === 'string' ? cur : '';
        i.disabled = ro;
        i.addEventListener('change', () => {
          pushUndo();
          setPath(def, f.path, i.value.trim() === '' && !f.required ? undefined : i.value.trim());
          afterEdit();
        });
        el = i;
        break;
      }
      case 'color': {
        const wrap = hrow();
        const c = document.createElement('input');
        c.type = 'color';
        c.value = typeof cur === 'string' && /^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#888888';
        c.disabled = ro;
        const t = textInput('#rrggbb');
        css(t, { flex: '0 1 90px' });
        t.value = typeof cur === 'string' ? cur : '';
        t.disabled = ro;
        const commit = (v: string): void => { pushUndo(); setPath(def, f.path, v); afterEdit(); };
        c.addEventListener('change', () => { t.value = c.value; commit(c.value); });
        t.addEventListener('change', () => { if (/^#[0-9a-fA-F]{3,8}$/.test(t.value)) { c.value = t.value.length === 7 ? t.value : c.value; commit(t.value); } });
        wrap.append(c, t);
        el = wrap;
        break;
      }
      case 'bool3': {
        const s = selectEl();
        s.append(option('', '—'), option('yes', 'yes'), option('no', 'no'));
        s.value = cur === undefined ? '' : cur ? 'yes' : 'no';
        s.disabled = ro;
        s.addEventListener('change', () => {
          pushUndo();
          setPath(def, f.path, s.value === '' ? undefined : s.value === 'yes');
          afterEdit();
        });
        el = s;
        break;
      }
      case 'select': {
        const s = selectEl();
        s.append(option('', '—'));
        for (const o of (f.options?.() ?? [])) s.append(option(o, o));
        s.value = typeof cur === 'string' && Array.from(s.options).some(x => x.value === cur) ? cur : '';
        if (cur !== undefined && s.value === '') {
          // A value outside the option list (e.g. a custom presence envelope
          // object) still shows honestly instead of silently reading as unset.
          s.append(option(String(cur), `${String(cur)} (custom)`));
          s.value = String(cur);
        }
        s.disabled = ro;
        s.addEventListener('change', () => {
          pushUndo();
          setPath(def, f.path, s.value === '' ? undefined : s.value);
          afterEdit();
        });
        el = s;
        break;
      }
      case 'idlist': {
        const i = textInput('a, b, c');
        i.value = Array.isArray(cur) ? (cur as string[]).join(', ') : '';
        i.disabled = ro;
        if (f.options) i.title = `known: ${f.options().join(', ')}`;
        i.addEventListener('change', () => {
          pushUndo();
          const arr = i.value.split(',').map(s => s.trim()).filter(Boolean);
          setPath(def, f.path, arr.length ? arr : undefined);
          afterEdit();
        });
        el = i;
        break;
      }
      case 'range2': {
        const wrap = hrow();
        const a = numInput(0, f.min ?? 0, f.max ?? 1e9, '58px');
        const b = numInput(0, f.min ?? 0, f.max ?? 1e9, '58px');
        const t = Array.isArray(cur) ? cur as [number, number] : undefined;
        a.value = t ? String(t[0]) : ''; b.value = t ? String(t[1]) : '';
        a.placeholder = 'min'; b.placeholder = 'max';
        a.disabled = ro; b.disabled = ro;
        const commit = (): void => {
          pushUndo();
          if (a.value.trim() === '' && b.value.trim() === '') setPath(def, f.path, undefined);
          else {
            const lo = Number(a.value) || 0;
            const hi = Math.max(lo, Number(b.value) || lo);
            setPath(def, f.path, [lo, hi]);
          }
          afterEdit();
        };
        a.addEventListener('change', commit);
        b.addEventListener('change', commit);
        wrap.append(a, b);
        el = wrap;
        break;
      }
      case 'json': {
        el = jsonArea(() => getPath(st.working!.def as unknown as Record<string, unknown>, f.path),
          v => setPath(st.working!.def as unknown as Record<string, unknown>, f.path, v), ro);
        break;
      }
    }
    return labeled(f.label, el, f.help);
  };

  /** A JSON textarea bound to a getter/setter — red border while unparseable,
   *  commits on change, empty = unset. */
  const jsonArea = (get: () => unknown, set: (v: unknown) => void, ro: boolean, rows = 2): HTMLElement => {
    const ta = document.createElement('textarea');
    css(ta, {
      flex: '1', minHeight: `${rows * 16 + 10}px`, background: DEV_UI.bgInput, color: DEV_UI.text,
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '4px 6px',
      font: '11px Consolas, monospace', resize: 'vertical',
    });
    const cur = get();
    ta.value = cur === undefined ? '' : JSON.stringify(cur);
    ta.disabled = ro;
    ta.addEventListener('change', () => {
      if (ta.value.trim() === '') {
        pushUndo(); set(undefined); afterEdit();
        ta.style.borderColor = DEV_UI.borderDim;
        return;
      }
      try {
        const v = JSON.parse(ta.value) as unknown;
        pushUndo(); set(v); afterEdit();
        ta.style.borderColor = DEV_UI.borderDim;
      } catch {
        ta.style.borderColor = '#c85050';
      }
    });
    return ta;
  };

  // --- inspector: bespoke panes ----------------------------------------------
  let lookPaneHost: HTMLElement | null = null;
  let selInputs: { x: HTMLInputElement; y: HTMLInputElement; rot: HTMLInputElement; scale: HTMLInputElement; alpha: HTMLInputElement } | null = null;

  const syncSelInputs = (): void => {
    const spec = selSpec();
    if (!spec || !selInputs) return;
    selInputs.x.value = String(spec.x ?? 0);
    selInputs.y.value = String(spec.y ?? 0);
    selInputs.rot.value = String(Math.round((spec.rot ?? 0) * 180 / Math.PI));
    selInputs.scale.value = String(spec.scale ?? 1);
    selInputs.alpha.value = String(spec.alpha ?? 1);
  };

  const rebuildLookPane = (): void => {
    if (!lookPaneHost || !st.working) return;
    const host = lookPaneHost;
    host.innerHTML = '';
    selInputs = null;
    const ro = readonly();
    const we = st.working;
    const composed = !!we.look;
    const shown = displayLook();

    // Source line: composed vs authored-look vs legacy body.
    const srcRow = hrow();
    if (!composed) {
      const lookIn = textInput('authored look id (blank = legacy body)');
      lookIn.setAttribute('list', DL_LOOKS);
      lookIn.value = we.def.look ?? '';
      lookIn.disabled = ro;
      lookIn.addEventListener('change', () => {
        pushUndo();
        we.def.look = lookIn.value.trim() || undefined;
        afterEdit();
        rebuildLookPane();
      });
      srcRow.append(labeled('Authored look', lookIn, 'Wear a shipped LOOKS entry as-is'));
      if (!ro) {
        srcRow.append(btn(shown ? '✎ Compose custom (copy rows)' : '✎ Compose custom look', () => {
          pushUndo();
          we.look = shown ? cloneData(shown) : { parts: [{ kind: 'torso' }] };
          we.def.look = we.def.id;
          afterEdit();
          rebuildLookPane();
        }));
      }
    } else {
      const note = document.createElement('span');
      note.textContent = 'composed look (worn under this entity\'s id)';
      css(note, { color: DEV_UI.heading, fontSize: '11px' });
      srcRow.append(note);
      if (!ro) {
        srcRow.append(btn('✕ remove composed look', () => {
          pushUndo();
          delete we.look;
          we.def.look = undefined;
          st.sel = null;
          afterEdit();
          rebuildLookPane();
        }));
      }
    }
    host.append(srcRow);
    if (!shown) return;

    // Row lists (parts + live), selection-aware.
    const editable = composed && !ro;
    const rowsBlock = (listName: 'parts' | 'live', rows: PartSpec[]): void => {
      const head = document.createElement('div');
      head.textContent = listName === 'parts' ? 'PARTS (baked, under → over)' : 'LIVE (animated overlay)';
      css(head, { color: DEV_UI.textDim, fontSize: '10px', marginTop: '4px' });
      host.append(head);
      rows.forEach((spec, i) => {
        const selected = st.sel?.list === listName && st.sel.i === i;
        const row = document.createElement('div');
        css(row, {
          display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 4px', borderRadius: '3px',
          background: selected ? DEV_UI.bgActive : 'transparent', cursor: 'pointer',
        });
        const label = document.createElement('span');
        label.textContent = `${i}: ${spec.kind}`;
        css(label, { flex: '1', color: PART_PAINTERS[spec.kind] ? DEV_UI.text : '#c85050', fontSize: '11px' });
        if (!PART_PAINTERS[spec.kind]) label.title = 'unknown part kind — skipped by the painter';
        row.append(label);
        const sub = document.createElement('span');
        sub.textContent = `${spec.x !== undefined || spec.y !== undefined ? `@${spec.x ?? 0},${spec.y ?? 0} ` : ''}${spec.scale !== undefined ? `×${spec.scale} ` : ''}${spec.mirror ? '⇋ ' : ''}`;
        css(sub, { color: DEV_UI.textDim, fontSize: '10px' });
        row.append(sub);
        if (editable) {
          const move = (d: number): void => {
            const j = i + d;
            if (j < 0 || j >= rows.length) return;
            pushUndo();
            [rows[i], rows[j]] = [rows[j], rows[i]];
            if (st.sel?.list === listName && st.sel.i === i) st.sel.i = j;
            afterEdit();
            rebuildLookPane();
          };
          row.append(
            btn('↑', () => move(-1)), btn('↓', () => move(1)),
            btn('⧉', () => { pushUndo(); rows.splice(i + 1, 0, cloneData(spec)); afterEdit(); rebuildLookPane(); }),
            btn('✕', () => { pushUndo(); rows.splice(i, 1); if (st.sel?.list === listName) st.sel = null; afterEdit(); rebuildLookPane(); }));
        }
        row.addEventListener('click', e => {
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          st.sel = selected ? null : { list: listName, i };
          rebuildLookPane();
        });
        host.append(row);

        // Selected row: the transform strip + role/color/params.
        if (selected) {
          const strip = hrow();
          const mk = (v: number, min: number, max: number, apply: (n: number) => void): HTMLInputElement => {
            const inp = numInput(v, min, max, '52px');
            inp.step = 'any';
            inp.disabled = !editable;
            inp.addEventListener('change', () => {
              const n = Number(inp.value);
              if (!Number.isFinite(n)) return;
              pushUndo(); apply(n); afterEdit();
            });
            return inp;
          };
          const x = mk(spec.x ?? 0, -6, 6, n => { spec.x = n; });
          const y = mk(spec.y ?? 0, -6, 6, n => { spec.y = n; });
          const rot = mk(Math.round((spec.rot ?? 0) * 180 / Math.PI), -360, 360, n => { spec.rot = n * Math.PI / 180; });
          const scale = mk(spec.scale ?? 1, 0.05, 8, n => { spec.scale = n; });
          const alpha = mk(spec.alpha ?? 1, 0, 1, n => { if (n >= 1) delete spec.alpha; else spec.alpha = Math.max(0, n); });
          selInputs = { x, y, rot, scale, alpha };
          const mirror = check('mirror', !!spec.mirror);
          mirror.box.disabled = !editable;
          mirror.box.addEventListener('change', () => { pushUndo(); if (mirror.box.checked) spec.mirror = true; else delete spec.mirror; afterEdit(); });
          strip.append(labeled('x / y (radii)', (() => { const w = hrow(); w.append(x, y); return w; })()),
            labeled('rot° / scale / alpha', (() => { const w = hrow(); w.append(rot, scale, alpha); return w; })()),
            mirror.el);
          host.append(strip);
          const strip2 = hrow();
          const role = selectEl();
          role.append(option('', 'role: painter default'));
          for (const r of ['base', 'bone', 'metal', 'wood', 'cloth', 'dark', 'glow', 'accent']) role.append(option(r, `role: ${r}`));
          role.value = spec.role ?? '';
          role.disabled = !editable;
          role.addEventListener('change', () => { pushUndo(); if (role.value) spec.role = role.value as PartSpec['role']; else delete spec.role; afterEdit(); });
          const colorIn = textInput('color override (#hex, blank = role)');
          colorIn.value = spec.color ?? '';
          colorIn.disabled = !editable;
          colorIn.addEventListener('change', () => { pushUndo(); const v = colorIn.value.trim(); if (v) spec.color = v; else delete spec.color; afterEdit(); });
          strip2.append(role, colorIn);
          host.append(strip2);
          host.append(labeled('params', jsonArea(
            () => spec.params,
            v => { if (v === undefined) delete spec.params; else spec.params = v as Record<string, unknown>; },
            !editable), 'Painter-specific knobs (see the painter in render/vis/parts.ts)'));
        }
      });
    };
    rowsBlock('parts', shown.parts);
    rowsBlock('live', shown.live ?? []);

    if (editable && we.look) {
      const addRow = hrow();
      const kindSel = selectEl();
      for (const k of Object.keys(PART_PAINTERS).sort()) kindSel.append(option(k, k));
      addRow.append(kindSel,
        btn('+ part', () => {
          pushUndo();
          we.look!.parts.push({ kind: kindSel.value });
          st.sel = { list: 'parts', i: we.look!.parts.length - 1 };
          afterEdit();
          rebuildLookPane();
        }),
        btn('+ live', () => {
          pushUndo();
          (we.look!.live ??= []).push({ kind: kindSel.value });
          st.sel = { list: 'live', i: we.look!.live!.length - 1 };
          afterEdit();
          rebuildLookPane();
        }));
      host.append(addRow);
      const lookMeta = hrow();
      const shadow = numInput(we.look.shadowScale ?? 1, 0, 6, '56px');
      shadow.step = '0.05';
      shadow.addEventListener('change', () => {
        pushUndo();
        const n = Number(shadow.value);
        if (n === 1 || !Number.isFinite(n)) delete we.look!.shadowScale; else we.look!.shadowScale = n;
        afterEdit();
      });
      const banding = selectEl();
      banding.append(option('', 'banding: —'), option('hoops', 'banding: hoops'), option('cross', 'banding: cross'));
      banding.value = we.look.banding ?? '';
      banding.addEventListener('change', () => {
        pushUndo();
        if (banding.value) we.look!.banding = banding.value as LookDef['banding']; else delete we.look!.banding;
        afterEdit();
      });
      lookMeta.append(labeled('shadowScale', shadow), banding);
      host.append(lookMeta);
    }
  };

  // Base-stat map editor (def.base — required record).
  const rebuildStatsPane = (host: HTMLElement): void => {
    host.innerHTML = '';
    if (!st.working) return;
    const def = st.working.def;
    const ro = readonly();
    for (const [k, v] of Object.entries(def.base)) {
      const row = hrow();
      const key = textInput('stat');
      key.setAttribute('list', DL_STATS);
      key.value = k;
      key.disabled = ro;
      css(key, { flex: '0 1 150px' });
      const val = numInput(v, -1e9, 1e9, '80px');
      val.step = 'any';
      val.disabled = ro;
      key.addEventListener('change', () => {
        const nk = key.value.trim();
        if (!nk || nk === k) { key.value = k; return; }
        pushUndo();
        delete def.base[k];
        def.base[nk] = v;
        afterEdit();
        rebuildStatsPane(host);
      });
      val.addEventListener('change', () => {
        const n = Number(val.value);
        if (!Number.isFinite(n)) return;
        pushUndo();
        def.base[k] = n;
        afterEdit();
      });
      row.append(key, val);
      if (!ro) row.append(btn('✕', () => { pushUndo(); delete def.base[k]; afterEdit(); rebuildStatsPane(host); }));
      if (STAT_DEFS[k] === undefined) {
        const warn = document.createElement('span');
        warn.textContent = '⚠ unknown stat';
        css(warn, { color: '#c85050', fontSize: '10px' });
        row.append(warn);
      }
      host.append(row);
    }
    if (!ro) {
      host.append(btn('+ stat', () => {
        pushUndo();
        let k = 'life';
        for (let n = 2; def.base[k] !== undefined; n++) k = `stat_${n}`;
        def.base[k] = 0;
        afterEdit();
        rebuildStatsPane(host);
      }));
    }
  };

  // Kit editor: skills[] with SkillDef.ai affordability hints, + grants[].
  const rebuildKitPane = (host: HTMLElement): void => {
    host.innerHTML = '';
    if (!st.working) return;
    const def = st.working.def;
    const ro = readonly();
    const skillsHead = document.createElement('div');
    skillsHead.textContent = 'SKILLS (the shared catalog — cast policy reads each skill\'s ai hint)';
    css(skillsHead, { color: DEV_UI.textDim, fontSize: '10px' });
    host.append(skillsHead);
    def.skills.forEach((id, i) => {
      const row = hrow();
      const inp = textInput('skill id');
      inp.setAttribute('list', DL_SKILLS);
      inp.value = id;
      inp.disabled = ro;
      css(inp, { flex: '0 1 190px' });
      inp.addEventListener('change', () => {
        pushUndo();
        def.skills[i] = inp.value.trim();
        afterEdit();
        rebuildKitPane(host);
      });
      const sk = SKILLS[id];
      const hintSpan = document.createElement('span');
      hintSpan.textContent = !sk ? '⚠ unknown skill'
        : sk.ai ? `ai: w${sk.ai.weight} r${sk.ai.range}${sk.ai.keepDistance ? ` kd${sk.ai.keepDistance}` : ''}`
          : '⚠ no ai hint — never cast';
      css(hintSpan, { color: !sk || !sk.ai ? '#c85050' : DEV_UI.textDim, fontSize: '10px', flex: '1' });
      row.append(inp, hintSpan);
      if (!ro) {
        row.append(
          btn('↑', () => { if (i === 0) return; pushUndo(); [def.skills[i - 1], def.skills[i]] = [def.skills[i], def.skills[i - 1]]; afterEdit(); rebuildKitPane(host); }),
          btn('✕', () => { pushUndo(); def.skills.splice(i, 1); afterEdit(); rebuildKitPane(host); }));
      }
      host.append(row);
    });
    if (!ro) host.append(btn('+ skill', () => { pushUndo(); def.skills.push(''); afterEdit(); rebuildKitPane(host); }));

    const grantsHead = document.createElement('div');
    grantsHead.textContent = 'GRANTS (level-gated acquisition: at atLevel, gain a skill OR socket a support)';
    css(grantsHead, { color: DEV_UI.textDim, fontSize: '10px', marginTop: '6px' });
    host.append(grantsHead);
    const grants = def.grants ?? [];
    grants.forEach((g, i) => {
      const row = hrow();
      const at = numInput(g.atLevel, 1, 200, '52px');
      at.disabled = ro;
      at.addEventListener('change', () => { pushUndo(); g.atLevel = Math.max(1, Math.round(Number(at.value) || 1)); afterEdit(); });
      const kindSel = selectEl();
      kindSel.append(option('skill', 'skill'), option('support', 'support'));
      kindSel.value = g.support ? 'support' : 'skill';
      kindSel.disabled = ro;
      const idIn = textInput('id');
      idIn.setAttribute('list', g.support ? DL_SUPPORTS : DL_SKILLS);
      idIn.value = g.support ?? g.skill ?? '';
      idIn.disabled = ro;
      css(idIn, { flex: '0 1 160px' });
      const commit = (): void => {
        pushUndo();
        const v = idIn.value.trim();
        if (kindSel.value === 'support') { delete g.skill; g.support = v; }
        else { delete g.support; delete g.on; g.skill = v; }
        afterEdit();
        rebuildKitPane(host);
      };
      kindSel.addEventListener('change', commit);
      idIn.addEventListener('change', commit);
      row.append(labeled('at L', at), kindSel, idIn);
      if (g.support) {
        const onSel = selectEl();
        onSel.append(option('', 'on: first skill'));
        for (const s of def.skills) onSel.append(option(s, `on: ${s}`));
        onSel.value = g.on ?? '';
        onSel.disabled = ro;
        onSel.addEventListener('change', () => { pushUndo(); if (onSel.value) g.on = onSel.value; else delete g.on; afterEdit(); });
        row.append(onSel);
      }
      const chance = numInput(g.chance ?? 1, 0, 1, '52px');
      chance.step = '0.05';
      chance.disabled = ro;
      chance.title = 'per-spawn roll chance';
      chance.addEventListener('change', () => {
        pushUndo();
        const n = Number(chance.value);
        if (!Number.isFinite(n) || n >= 1) delete g.chance; else g.chance = Math.max(0, n);
        afterEdit();
      });
      row.append(chance);
      if (!ro) row.append(btn('✕', () => { pushUndo(); grants.splice(i, 1); if (!grants.length) delete def.grants; afterEdit(); rebuildKitPane(host); }));
      host.append(row);
    });
    if (!ro) {
      host.append(btn('+ grant', () => {
        pushUndo();
        (def.grants ??= []).push({ atLevel: 5, skill: '' });
        afterEdit();
        rebuildKitPane(host);
      }));
    }
  };

  // Brain editor: archetype quick-set + the whole BrainDef as JSON.
  const rebuildBrainPane = (host: HTMLElement): void => {
    host.innerHTML = '';
    if (!st.working) return;
    const def = st.working.def;
    const ro = readonly();
    const row = hrow();
    const typeSel = selectEl();
    typeSel.append(option('', 'type: — (engine default)'));
    for (const t of Object.keys(ARCHETYPES)) typeSel.append(option(t, `type: ${t}`));
    typeSel.value = def.brain?.type ?? '';
    typeSel.disabled = ro;
    typeSel.addEventListener('change', () => {
      pushUndo();
      if (!typeSel.value) {
        if (def.brain) delete def.brain.type;
        if (def.brain && Object.keys(def.brain).length === 0) delete def.brain;
      } else {
        (def.brain ??= {}).type = typeSel.value as NonNullable<MonsterDef['brain']>['type'];
      }
      afterEdit();
      rebuildBrainPane(host);
    });
    row.append(typeSel);
    host.append(row);
    host.append(labeled('brain (full JSON)', jsonArea(
      () => def.brain,
      v => { if (v === undefined) delete def.brain; else def.brain = v as MonsterDef['brain']; },
      ro, 4),
      'The whole BrainDef: type + move/target/perception/skillUse/morale/squad/tempo/behavior axes, phases/script/rules machines, onDeath… (engine/brain.ts)'));
  };

  // Advanced: per-key JSON panes + the whole-def escape hatch.
  const rebuildAdvancedPane = (host: HTMLElement): void => {
    host.innerHTML = '';
    if (!st.working) return;
    const ro = readonly();
    for (const { key, help } of ADVANCED_KEYS) {
      host.append(labeled(key, jsonArea(
        () => getPath(st.working!.def as unknown as Record<string, unknown>, key),
        v => setPath(st.working!.def as unknown as Record<string, unknown>, key, v), ro), help));
    }
    const whole = document.createElement('div');
    css(whole, { marginTop: '6px' });
    whole.append(section('WHOLE DEF (JSON — the escape hatch; Apply replaces everything)'));
    const ta = document.createElement('textarea');
    css(ta, {
      width: '100%', minHeight: '140px', background: DEV_UI.bgInput, color: DEV_UI.text,
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '6px',
      font: '11px Consolas, monospace', resize: 'vertical', boxSizing: 'border-box',
    });
    ta.value = JSON.stringify(st.working.def, null, 2);
    ta.disabled = ro;
    const applyRow = hrow();
    if (!ro) {
      applyRow.append(btn('Apply whole-def JSON', () => {
        try {
          const v = JSON.parse(ta.value) as MonsterDef;
          for (const req of ['id', 'name', 'color', 'shape', 'radius', 'base', 'skills', 'xp'] as const) {
            if (v[req] === undefined) { flash(`✗ def JSON missing required '${req}'`); return; }
          }
          pushUndo();
          st.working!.def = v;
          afterEdit();
          rebuildInspector();
          flash('whole-def JSON applied');
        } catch (e) {
          flash(`✗ JSON parse: ${String(e)}`);
        }
      }));
    }
    whole.append(ta, applyRow);
    host.append(whole);
  };

  // --- inspector assembly -----------------------------------------------------
  const rebuildInspector = (): void => {
    inspector.innerHTML = '';
    if (!st.working) {
      const empty = document.createElement('div');
      empty.textContent = 'Select an entity from the roster, or ＋ New / ⧉ Clone.';
      css(empty, { color: DEV_UI.textDim, padding: '20px' });
      inspector.append(empty);
      return;
    }
    const ro = readonly();
    if (ro) {
      const banner = document.createElement('div');
      css(banner, {
        background: DEV_UI.bgRaised, border: `1px solid ${DEV_UI.border}`, borderRadius: '5px',
        padding: '6px 8px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center',
      });
      const t = document.createElement('span');
      t.textContent = 'AUTHORED — read-only. Clone to Workshop to tweak a copy.';
      css(t, { color: DEV_UI.accent, flex: '1' });
      banner.append(t, btn('⧉ Clone to Workshop', () => cloneCurrent()));
      inspector.append(banner);
    }

    for (const sec of FORGE_SECTIONS) {
      inspector.append(section(sec.label.toUpperCase()));
      if (sec.id === 'identity') {
        // The id row (bespoke): fixed prefix chip + suffix input.
        const row = hrow();
        const chip = document.createElement('span');
        chip.textContent = WORKSHOP_PREFIX;
        css(chip, { color: DEV_UI.accent, fontSize: '11px' });
        const suffix = textInput('id_suffix');
        suffix.value = isWorkshopId(st.working.def.id)
          ? st.working.def.id.slice(WORKSHOP_PREFIX.length) : st.working.def.id;
        suffix.disabled = ro;
        suffix.addEventListener('change', () => {
          const clean = suffix.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (!clean) { suffix.value = st.working!.def.id.slice(WORKSHOP_PREFIX.length); return; }
          pushUndo();
          st.working!.def.id = WORKSHOP_PREFIX + clean;
          if (st.working!.look) st.working!.def.look = st.working!.def.id;
          suffix.value = clean;
          afterEdit();
          syncHead();
        });
        row.append(chip, suffix);
        inspector.append(labeled('Id', row, ro ? 'Authored id' : 'Saved as custom_<suffix>; rename on save retires the old id'));
      }
      if (sec.id === 'body') {
        lookPaneHost = document.createElement('div');
        css(lookPaneHost, { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' });
        inspector.append(lookPaneHost);
        rebuildLookPane();
      }
      if (sec.id === 'stats') {
        const statsHost = document.createElement('div');
        css(statsHost, { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' });
        inspector.append(labeled('base (level-1 stats)', statsHost, 'Omitted keys use STAT_DEFS defaults; life/moveSpeed/accuracy are the usual floor'));
        rebuildStatsPane(statsHost);
      }
      if (sec.id === 'kit') {
        const kitHost = document.createElement('div');
        css(kitHost, { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' });
        inspector.append(kitHost);
        rebuildKitPane(kitHost);
      }
      if (sec.id === 'brain') {
        const brainHost = document.createElement('div');
        css(brainHost, { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' });
        inspector.append(brainHost);
        rebuildBrainPane(brainHost);
      }
      if (sec.id === 'advanced') {
        const advHost = document.createElement('div');
        css(advHost, { display: 'flex', flexDirection: 'column', gap: '2px' });
        inspector.append(advHost);
        rebuildAdvancedPane(advHost);
        continue; // advanced has no schema rows of its own
      }
      for (const f of FORGE_FIELDS.filter(x => x.section === sec.id)) {
        inspector.append(renderField(f));
      }
    }
  };

  // --- open/close -------------------------------------------------------------
  const open = (id?: string): void => {
    rebuildRoster();
    if (id) selectEntity(id);
    else if (!st.working) rebuildInspector();
    root.style.display = 'flex';
    syncHead();
    if (!rafOn) { rafOn = true; lastTs = performance.now(); requestAnimationFrame(frame); }
  };
  const close = (): void => {
    if (!confirmDiscard()) return;
    root.style.display = 'none';
    rafOn = false;
    delete LOOKS[scratchId(st.ver)]; // leave the registry clean
  };

  // Start-menu entry: the menu rebuilds its innerHTML per render, so the
  // button re-injects through the render hook (the onTreeRender idiom).
  ui.onStartMenuRender = (): void => {
    const wrap = document.querySelector('#start-menu .esc-btns');
    if (!wrap || document.getElementById('sm-forge')) return;
    const b = document.createElement('button');
    b.id = 'sm-forge';
    b.textContent = '🛠 Entity Forge (Dev)';
    b.addEventListener('click', () => open());
    wrap.append(b);
  };

  // Headless QA surface (the __passiveEditor idiom).
  (window as unknown as Record<string, unknown>).__entityForge = {
    open, close, state: (): ForgeState => st, save: doSave, redraw: draw,
    select: selectEntity, exportTS: (): string => st.working ? serializeEntityTS(st.working) : '',
  };

  return { open };
}
