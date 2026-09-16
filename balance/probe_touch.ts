// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PLATFORM FABRIC + THE TOUCH FABRIC (core/platform.ts,
// core/touch.ts, data/touch.ts, ui/compact.ts, ui/touchpad.ts, main.ts —
// docs/engine/platform-touch.md). Pins the pure laws headless plus a text
// census of the DOM half.
//   A. THE PLATFORM REGISTRY — unique ids, the desktop catch-all last, every
//      fixture (desktop, phone, an Android handheld, a Deck, a tablet, a
//      touchscreen laptop) resolves to its row; a pin wins, an unknown pin
//      reads auto; a registered preset seats before the catch-all.
//   B. THE FOLD — preset defaults, the width rule, and the player's three
//      overrides (touch controls, compact, the pin); view equality.
//   C. THE STICK LAW — the pad's deadzone/curve, the rim clamp, FOLLOW, the
//      floating base kept on screen, the button target floor.
//   D. THE ROUTER — the bar wins; one owner per finger; one stick, one aim;
//      edges land once; the aim finger holds the primary; the 'stick' aim
//      style fires past a deflection; verb tiles press/release/latch; the
//      mirrored hand; gated rows; cancel/clear/unlatch; the active window.
//   E. SETTINGS — defaults, the round trip, the clamps, a pre-dial save.
//   F. THE CENSUS — index.html's hygiene, the manifest + its icons on disk,
//      main.ts's wire, the stack rung, the server's MIME row, the renderer's
//      reads, the roster row, the layouts' actions, the compact rules.
// Run: npx tsx balance/probe_touch.ts
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import '../src/data/touch';
import {
  TOUCH_CFG, TOUCH_LAYOUTS, TouchRouter, buttonRect, followBase, mirrorZone, registerTouchLayout,
  resolveTouchWidgets, stickRead, touchLayoutOf, zoneRect, type SlotRect, type TouchWidgetDef,
} from '../src/core/touch';
import {
  PLATFORM_CFG, PLATFORM_PRESETS, desktopCaps, platformPresetOf, platformViewOf, platformViewSame,
  registerPlatformPreset, resolvePlatform,
} from '../src/core/platform';
import {
  ACTION_IDS, DEFAULT_TOUCH_OPTIONS, deserializeSettings, makeSettings, normalizeTouchOptions, serializeSettings,
  type Settings,
} from '../src/meta/settings';
import { COMPACT_RULES } from '../src/ui/compact';
import { Z_LADDER } from '../src/ui/zorder';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const src = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

// --- A. THE PLATFORM REGISTRY ----------------------------------------------
console.log('A. THE PLATFORM REGISTRY');
{
  const ids = PLATFORM_PRESETS.map(p => p.id);
  check('A1: preset ids unique + every row named', new Set(ids).size === ids.length
    && PLATFORM_PRESETS.every(p => p.name.length > 0 && p.blurb.length > 0));
  check('A2: the desktop catch-all stands last', ids[ids.length - 1] === 'desktop');
  const phone = desktopCaps({ touch: true, coarse: true, hover: false, width: 731, height: 411, dpr: 2.6, mobileUa: true });
  const odin = desktopCaps({ touch: true, coarse: true, hover: false, pad: true, width: 731, height: 411, mobileUa: true });
  const deck = desktopCaps({ touch: true, hover: false, pad: true, width: 1280, height: 800, electron: true });
  const tablet = desktopCaps({ touch: true, coarse: true, hover: false, width: 1024, height: 768 });
  const touchLaptop = desktopCaps({ touch: true, hover: true });
  check('A3: a desktop resolves desktop', resolvePlatform(desktopCaps()).id === 'desktop');
  check('A4: a phone (touch, no hover, short side under the phone rule) resolves phone',
    resolvePlatform(phone).id === 'phone');
  check('A5: an Android handheld (pad + touch) resolves handheld', resolvePlatform(odin).id === 'handheld');
  check('A6: a Deck in the shell (pad + touch, wide) resolves handheld', resolvePlatform(deck).id === 'handheld');
  check('A7: a tablet (touch, no hover, wide) resolves tablet', resolvePlatform(tablet).id === 'tablet');
  check('A8: a touchscreen laptop (hover) stays desktop', resolvePlatform(touchLaptop).id === 'desktop');
  check('A9: a pin wins the read', resolvePlatform(desktopCaps(), 'phone').id === 'phone');
  check('A10: an unknown pin reads auto', resolvePlatform(phone, 'mars').id === 'phone' && platformPresetOf('mars') === null);
  registerPlatformPreset({
    id: 'tv', name: 'Television', blurb: 'a test row', when: c => c.width > 3000,
    defaults: { touchControls: false, compact: false, uiScaleFloor: 1.5 },
  });
  check('A11: a registered preset seats before the catch-all and resolves',
    PLATFORM_PRESETS[PLATFORM_PRESETS.length - 1].id === 'desktop'
    && resolvePlatform(desktopCaps({ width: 4000 })).id === 'tv'
    && resolvePlatform(desktopCaps({ width: 1280 })).id === 'desktop');
  let dup = false;
  try { registerPlatformPreset({ id: 'tv', name: 'x', blurb: 'x', when: () => true, defaults: { touchControls: false, compact: false, uiScaleFloor: 1 } }); }
  catch { dup = true; }
  check('A12: a duplicate preset id refuses', dup);
}

// --- B. THE FOLD -----------------------------------------------------------
console.log('B. THE FOLD');
{
  const s = makeSettings();
  const phone = desktopCaps({ touch: true, coarse: true, hover: false, width: 731, height: 411 });
  const pv = platformViewOf(phone, s);
  check('B1: a phone folds touch controls ON + compact ON', pv.preset.id === 'phone' && pv.touchControls && pv.compact);
  const dv = platformViewOf(desktopCaps(), s);
  check('B2: a desktop folds touch OFF + compact OFF', dv.preset.id === 'desktop' && !dv.touchControls && !dv.compact);
  check('B3: a narrow desktop window folds compact ON (the width rule)',
    platformViewOf(desktopCaps({ width: PLATFORM_CFG.compactMaxWidthPx - 1 }), s).compact
    && !platformViewOf(desktopCaps({ width: PLATFORM_CFG.compactMaxWidthPx }), s).compact);
  const tv = platformViewOf(desktopCaps({ width: 4000 }), s);
  check('B4: a preset\'s UI-scale floor rides the view', tv.uiScaleFloor === 1.5 && dv.uiScaleFloor === 1);
  const off = makeSettings(); off.touch.controls = 'off'; off.compactUi = 'off';
  const on = makeSettings(); on.touch.controls = 'on'; on.compactUi = 'on';
  check('B5: the player\'s OFF beats a phone\'s defaults', !platformViewOf(phone, off).touchControls && !platformViewOf(phone, off).compact);
  check('B6: the player\'s ON beats a desktop\'s defaults', platformViewOf(desktopCaps(), on).touchControls && platformViewOf(desktopCaps(), on).compact);
  const pin = makeSettings(); pin.platform = 'phone';
  check('B7: the pin beats the read in the fold', platformViewOf(desktopCaps(), pin).preset.id === 'phone');
  check('B8: view equality — same, differing compact, differing insets',
    platformViewSame(dv, platformViewOf(desktopCaps(), s))
    && !platformViewSame(dv, platformViewOf(desktopCaps({ width: 900 }), s))
    && !platformViewSame(dv, platformViewOf(desktopCaps({ safe: { top: 20, right: 0, bottom: 0, left: 0 } }), s))
    && !platformViewSame(null, dv));
}

// --- C. THE STICK LAW ------------------------------------------------------
console.log('C. THE STICK LAW');
{
  const r = TOUCH_CFG.stick.radiusPx, dz = TOUCH_CFG.stick.deadzone, cv = TOUCH_CFG.stick.curve;
  const rest = stickRead(100, 100, 100, 100, r, dz, cv);
  check('C1: a finger on the base reads zero', rest.mag === 0 && rest.x === 0 && rest.y === 0 && rest.raw === 0);
  const inside = stickRead(100, 100, 100 + r * dz * 0.9, 100, r, dz, cv);
  check('C2: inside the deadzone reads zero (raw kept)', inside.mag === 0 && inside.raw > 0);
  const full = stickRead(100, 100, 100 + r, 100, r, dz, cv);
  check('C3: the rim reads full deflection along the finger', near(full.mag, 1) && near(full.x, 1) && near(full.y, 0));
  const past = stickRead(100, 100, 100 + r * 3, 100 - r * 3, r, dz, cv);
  check('C4: past the rim clamps to the rim, the knob on it',
    near(past.mag, 1) && near(Math.hypot(past.kx - 100, past.ky - 100), r) && past.x > 0 && past.y < 0);
  const half = stickRead(100, 100, 100 + r * 0.6, 100, r, dz, cv);
  check('C5: the curve is monotone and under-linear mid-tilt', half.mag > 0 && half.mag < 0.6 && half.mag < full.mag);
  const fb = followBase(100, 100, 300, 100, r, TOUCH_CFG.stick.followSlackPx);
  check('C6: FOLLOW drags the base so the finger sits on the rim', near(fb.ox, 300 - r) && near(fb.oy, 100));
  const nofb = followBase(100, 100, 100 + r + TOUCH_CFG.stick.followSlackPx, 100, r, TOUCH_CFG.stick.followSlackPx);
  check('C7: inside rim + slack the base holds', nofb.ox === 100 && nofb.oy === 100);
  const tiny: TouchWidgetDef = { id: 't', kind: 'button', zone: { x: 0.9, y: 0, w: 0.1, h: 0.1 }, action: 'escape', sizePx: 48 };
  const br = buttonRect(tiny, 1000, 500, 0.6);
  check('C8: a button target floors at the platform minimum under a small scale',
    br.w === TOUCH_CFG.button.minTargetPx && br.h === TOUCH_CFG.button.minTargetPx && near(br.x + br.w / 2, 950) && near(br.y + br.h / 2, 25));
  const mz = mirrorZone({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
  check('C9: a mirrored zone flips across the vertical axis', near(mz.x, 0.6) && mz.y === 0.2 && mz.w === 0.3 && mz.h === 0.4);
  const zr = zoneRect({ x: 0.5, y: 0.12, w: 0.5, h: 0.88 }, 1000, 500);
  check('C10: a zone rect scales by the viewport', zr.x === 500 && near(zr.y, 60) && zr.w === 500 && near(zr.h, 440));
}

// --- D. THE ROUTER ---------------------------------------------------------
console.log('D. THE ROUTER');
const VW = 1000, VH = 500;
/** The real bar at this width: 8 slots of 54 with 6 gaps, centered, y 430. */
const SLOTS: SlotRect[] = Array.from({ length: 8 }, (_, i) => ({ slot: i, x: 263 + i * 60, y: 430, w: 54, h: 54 }));
function rig(over: { hand?: 'left' | 'right'; aimStyle?: 'cursor' | 'stick'; settings?: Settings; fixed?: boolean; scale?: number } = {}) {
  const s = over.settings ?? makeSettings();
  const layout = touchLayoutOf(s.touch.layout)!;
  const widgets = resolveTouchWidgets(layout, over.hand ?? 'right', s);
  const router = new TouchRouter({
    widgets: () => widgets,
    viewport: () => ({ w: VW, h: VH }),
    slotRects: () => SLOTS,
    stick: () => ({ radiusPx: TOUCH_CFG.stick.radiusPx, deadzone: TOUCH_CFG.stick.deadzone, curve: TOUCH_CFG.stick.curve,
      follow: TOUCH_CFG.stick.follow, followSlackPx: TOUCH_CFG.stick.followSlackPx, fixed: !!over.fixed }),
    aim: () => ({ style: over.aimStyle ?? 'cursor', stickRadiusPx: TOUCH_CFG.aim.stickRadiusPx, holdFires: TOUCH_CFG.aim.holdFires, fireMag: TOUCH_CFG.aim.fireMag }),
    scale: () => over.scale ?? 1,
  });
  return { router, widgets, s };
}
{
  const { router } = rig();
  const R = TOUCH_CFG.stick.radiusPx;
  const o = router.down(1, 200, 300, 1);
  check('D1: a finger in the left field spawns a floating stick under it', o.kind === 'stick' && o.ox === 200 && o.oy === 300);
  let f = router.frame();
  check('D2: the fold: engaged, a drawn stick, zero move at the base', f.engaged && !!f.stick && f.move.mag === 0 && f.stick!.ox === 200);
  router.move(1, 200 + R, 300, 1.1);
  f = router.frame();
  check('D3: the rim is full tilt to the right', near(f.move.x, 1) && near(f.move.y, 0) && near(f.move.mag, 1));
  router.move(1, 200 + 5, 300, 1.2);
  f = router.frame();
  check('D4: inside the deadzone the stick reads zero', f.move.mag === 0 && f.stick!.mag === 0);
  router.move(1, 400, 300, 1.3);
  f = router.frame();
  check('D5: FOLLOW walks the base behind a long swipe', !!f.stick && near(f.stick!.ox, 400 - R) && near(f.move.mag, 1));
  // A second finger on the right: the aim field.
  const a = router.down(2, 700, 300, 1.4);
  f = router.frame();
  check('D6: a finger on the right field is the aim — the primary edges and holds',
    a.kind === 'aim' && !!f.aim && f.aim!.x === 700 && f.aimSpoke && f.primaryHeld && f.primaryEdge);
  f = router.frame();
  check('D7: the edge lands once; the hold stays; the aim spoke only when it moved', !f.primaryEdge && f.primaryHeld && !f.aimSpoke);
  router.move(2, 720, 310, 1.5);
  f = router.frame();
  check('D8: an aim move speaks and carries the point', f.aimSpoke && f.aim!.x === 720 && f.aim!.y === 310 && f.aim!.vx === 0);
  // A third finger on slot 5 (inside the right field — the bar wins).
  const s5 = SLOTS[5];
  const o5 = router.down(3, s5.x + 27, s5.y + 27, 1.6);
  f = router.frame();
  check('D9: THE BAR WINS — a finger on a published slot rect is that slot, not the field',
    o5.kind === 'slot' && (o5 as { slot: number }).slot === 5 && f.slotsEdge[5] && f.slotsHeld[5] && f.aim!.x === 720);
  f = router.frame();
  check('D10: the slot edge lands once; the hold stays', !f.slotsEdge[5] && f.slotsHeld[5]);
  router.move(3, s5.x - 200, s5.y - 200, 1.7);
  f = router.frame();
  check('D11: ONE OWNER PER FINGER — a slot hold that slides off keeps the slot', f.slotsHeld[5] && f.move.mag > 0);
  router.up(3, 1.8);
  f = router.frame();
  check('D12: the lift releases the slot', !f.slotsHeld[5] && !f.slotsEdge[5]);
  // A fourth finger in the left field while the stick is live owns nothing.
  const o4 = router.down(4, 100, 400, 1.9);
  f = router.frame();
  check('D13: ONE STICK — a second left-field finger owns nothing and moves nothing',
    o4.kind === 'none' && near(f.stick!.ox, 400 - R) && router.pointers().length === 3);
  router.up(4, 2.0);
  router.up(2, 2.1);
  f = router.frame();
  check('D14: the aim finger\'s lift drops the primary and the aim', !f.primaryHeld && f.aim === null);
  router.cancel(1, 2.2);
  f = router.frame();
  check('D15: a cancel lifts the stick', f.stick === null && f.move.mag === 0 && !f.engaged);
  check('D16: the active window — recent, then not', router.activeRecently(2.2 + TOUCH_CFG.activeWindow) && !router.activeRecently(2.2 + TOUCH_CFG.activeWindow + 0.01));
}
{
  const { router, widgets } = rig();
  const pause = widgets.find(w => w.id === 'pause')!;
  const pr = buttonRect(pause, VW, VH, 1);
  const o = router.down(1, pr.x + pr.w / 2, pr.y + pr.h / 2, 1);
  let f = router.frame();
  check('D17: a verb tile presses on the down (edge, held)', o.kind === 'button' && f.buttonEdges.includes('pause') && f.buttonsDown.includes('pause'));
  router.up(1, 1.1);
  f = router.frame();
  check('D18: its lift is a release', f.buttonReleases.includes('pause') && !f.buttonsDown.includes('pause'));
  const meta = widgets.find(w => w.id === 'meta')!;
  const mr = buttonRect(meta, VW, VH, 1);
  router.down(2, mr.x + 1, mr.y + 1, 1.2);
  f = router.frame();
  check('D19: a LATCH tile latches on the tap (edge, latched, not held)', f.buttonEdges.includes('meta') && f.latched.includes('meta') && !f.buttonsDown.includes('meta'));
  router.up(2, 1.3);
  f = router.frame();
  check('D20: the latch survives the lift', f.latched.includes('meta') && !f.buttonReleases.includes('meta'));
  router.down(3, mr.x + 1, mr.y + 1, 1.4); router.up(3, 1.5);
  f = router.frame();
  check('D21: the second tap opens the latch (a release)', f.buttonReleases.includes('meta') && !f.latched.includes('meta'));
  router.down(4, mr.x + 1, mr.y + 1, 1.6); router.up(4, 1.7); router.frame();
  const ids = router.unlatchAll();
  f = router.frame();
  check('D22: unlatchAll hands every latch back as a release', ids.length === 1 && ids[0] === 'meta' && f.buttonReleases.includes('meta') && f.latched.length === 0);
  // The top strip (the first 12% of the height) belongs to no field and, off
  // the pause tile, to no button.
  const ns = router.down(5, 500, 20, 1.8);
  check('D23: a finger nowhere owns nothing but still speaks', ns.kind === 'none' && !router.engaged() && router.lastActive === 1.8);
  router.down(6, 200, 300, 1.9);
  router.clear(2.0);
  f = router.frame();
  check('D24: clear lifts every finger', router.pointers().length === 0 && !f.engaged);
}
{
  const { router } = rig({ hand: 'left' });
  check('D25: the mirrored hand swaps the fields (left = aim, right = stick)',
    router.down(1, 200, 300, 1).kind === 'aim' && router.down(2, 800, 300, 1).kind === 'stick');
}
{
  const { router } = rig({ aimStyle: 'stick' });
  const AR = TOUCH_CFG.aim.stickRadiusPx;
  const o = router.down(1, 700, 300, 1);
  let f = router.frame();
  check('D26: the twin-stick aim spawns a right stick, no fire at rest', o.kind === 'aim' && !!f.aim && !f.primaryHeld && !f.primaryEdge);
  router.move(1, 700 + AR, 300, 1.1);
  f = router.frame();
  check('D27: past the fire deflection the primary edges and holds; the vector carries', f.primaryEdge && f.primaryHeld && near(f.aim!.vx, 1) && near(f.aim!.mag, 1));
  f = router.frame();
  check('D28: the twin-stick edge lands once', !f.primaryEdge && f.primaryHeld);
  router.move(1, 702, 300, 1.2);
  f = router.frame();
  check('D29: back to rest the fire stops', !f.primaryHeld);
  router.move(1, 700 + AR, 300, 1.3);
  f = router.frame();
  check('D30: a fresh deflection re-edges', f.primaryEdge && f.primaryHeld);
}
{
  const { router } = rig({ fixed: true });
  const o = router.down(1, 120, 400, 1);
  const z = zoneRect({ x: 0, y: 0.12, w: 0.5, h: 0.88 }, VW, VH);
  check('D31: a FIXED stick keeps its base at the field\'s seat', o.kind === 'stick' && near(o.ox, z.x + z.w / 2) && near(o.oy, z.y + z.h / 2));
  const { router: r2 } = rig();
  const o2 = r2.down(1, 10, 300, 1);
  check('D32: a floating base near the edge is nudged so its rim stays on screen', o2.kind === 'stick' && near(o2.ox, TOUCH_CFG.stick.radiusPx));
}
{
  const s = makeSettings();
  const w1 = resolveTouchWidgets(touchLayoutOf(s.touch.layout)!, 'right', s);
  s.gearPickup = 'key';
  const w2 = resolveTouchWidgets(touchLayoutOf(s.touch.layout)!, 'right', s);
  check('D33: a gated row exists only while its gate holds (the PICK tile under the key pickup style)',
    !w1.some(w => w.id === 'pickup') && w2.some(w => w.id === 'pickup'));
  let dupLayout = false;
  try { registerTouchLayout({ id: 'thumbs', name: 'x', blurb: 'x', widgets: [] }); } catch { dupLayout = true; }
  let badButton = false;
  try { registerTouchLayout({ id: 'probe_bad', name: 'x', blurb: 'x', widgets: [{ id: 'b', kind: 'button', zone: { x: 0, y: 0, w: 1, h: 1 } }] }); } catch { badButton = true; }
  check('D34: the registry refuses a duplicate layout and an action-less button', dupLayout && badButton);
  check('D35: an unknown layout id degrades to the default', touchLayoutOf('nope')?.id === TOUCH_CFG.layout.defaultId);
}

// --- E. SETTINGS -----------------------------------------------------------
console.log('E. SETTINGS');
{
  const s = makeSettings();
  check('E1: fresh settings carry the touch defaults, auto platform, auto compact',
    JSON.stringify(s.touch) === JSON.stringify(DEFAULT_TOUCH_OPTIONS) && s.platform === PLATFORM_CFG.autoId && s.compactUi === 'auto');
  s.touch.hand = 'left'; s.touch.aimStyle = 'stick'; s.touch.aimAssist = 0.3; s.touch.scale = 1.4; s.touch.controls = 'on';
  s.touch.stick = 'fixed'; s.touch.opacity = 0.9; s.touch.fullscreen = false; s.touch.haptics = false;
  s.platform = 'phone'; s.compactUi = 'off';
  const back = deserializeSettings(serializeSettings(s))!;
  check('E2: the round trip keeps every touch + platform dial',
    JSON.stringify(back.touch) === JSON.stringify(s.touch) && back.platform === 'phone' && back.compactUi === 'off');
  const t = normalizeTouchOptions({ aimAssist: 5, opacity: 0, scale: 10, layout: 'nope', hand: 'up' as 'left', stick: 'x' as 'fixed', aimStyle: 'y' as 'stick', controls: 'z' as 'on' });
  check('E3: the clamps + fallbacks hold', t.aimAssist === 1 && t.opacity === TOUCH_CFG.widget.opacityMin && t.scale === TOUCH_CFG.widget.scaleMax
    && t.layout === TOUCH_CFG.layout.defaultId && t.hand === 'right' && t.stick === 'floating' && t.aimStyle === 'cursor' && t.controls === 'auto');
  const raw = serializeSettings(makeSettings()) as unknown as Record<string, unknown>;
  delete raw.touch; delete raw.platform; delete raw.compactUi;
  const pre = deserializeSettings(raw as unknown as ReturnType<typeof serializeSettings>)!;
  check('E4: a pre-dial save reads the defaults', JSON.stringify(pre.touch) === JSON.stringify(DEFAULT_TOUCH_OPTIONS) && pre.platform === PLATFORM_CFG.autoId && pre.compactUi === 'auto');
  const junk = deserializeSettings({ ...serializeSettings(makeSettings()), platform: 'mars', compactUi: 'maybe' })!;
  check('E5: an unknown pin / compact word falls back', junk.platform === PLATFORM_CFG.autoId && junk.compactUi === 'auto');
}

// --- F. THE CENSUS ---------------------------------------------------------
console.log('F. THE CENSUS');
{
  const html = src('index.html');
  check('F1: index.html — touch-action: none on the canvas, dvh, viewport-fit, the manifest link',
    /#game \{[^}]*touch-action: none/.test(html) && /#game \{[^}]*100dvh/.test(html)
    && html.includes('viewport-fit=cover') && html.includes('rel="manifest"') && html.includes('overscroll-behavior: none'));
  const manifest = JSON.parse(src('public/manifest.webmanifest')) as { display: string; orientation: string; icons: { src: string; sizes: string }[] };
  const pngSize = (p: string): string => {
    const b = readFileSync(resolve(process.cwd(), p));
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  };
  check('F2: the manifest asks fullscreen landscape and its icons stand on disk at their declared sizes',
    manifest.display === 'fullscreen' && manifest.orientation === 'landscape' && manifest.icons.length >= 2
    && manifest.icons.every(i => existsSync(resolve(process.cwd(), 'public', i.src)) && pngSize('public/' + i.src) === i.sizes));
  const main = src('src/main.ts');
  check('F3: main.ts — the fold per frame, the stick + press + aim folds, the hand\'s gate, the watch, the layouts import',
    main.includes('touchNow = touch.update(nowSec)') && main.includes('dx += touchNow.move.x')
    && main.includes("aimSource === 'touch'") && main.includes('touchNow.slotsHeld[i]')
    && main.includes('!touch.ownsHand(nowSec)') && main.includes('platformWatch.start()')
    && main.includes("import './data/touch'") && main.includes('installCompactStyles()'));
  check('F4: the stack rung sits over the crest and under every panel', Z_LADDER.touch > Z_LADDER.crest && Z_LADDER.touch < Z_LADDER.panel);
  check('F5: the loopback server names the manifest\'s MIME type', src('launcher/server.cjs').includes("'.webmanifest'"));
  const ren = src('src/render/renderer.ts');
  check('F6: the renderer reads the touch hand for its labels and the UI-scale floor', ren.includes('getTouchActive?.()') && ren.includes('uiScaleFloorNow()'));
  check('F7: the roster carries this probe', src('balance/proberoster.ts').includes("probe: 'probe_touch.ts'"));
  const actions = new Set<string>([...ACTION_IDS, 'escape']);
  check('F8: every registered layout\'s buttons name a known action; every zone lies in the unit square',
    TOUCH_LAYOUTS.every(l => l.widgets.every(w => (w.kind !== 'button' || actions.has(w.action!))
      && w.zone.x >= 0 && w.zone.y >= 0 && w.zone.x + w.zone.w <= 1 + 1e-9 && w.zone.y + w.zone.h <= 1 + 1e-9)));
  check('F9: every compact rule keys off the stamped classes', COMPACT_RULES.every(r => /ui-compact|ui-touch/.test(r.sel) && r.why.length > 0));
  check('F10: package.json carries the PWA icon script; the docs stand',
    src('package.json').includes('"icon:pwa"') && existsSync(resolve(process.cwd(), 'docs/engine/platform-touch.md'))
    && src('CLAUDE.md').includes('platform-touch.md'));
  const tp = src('src/ui/touchpad.ts');
  check('F11: the touch pad routes only touch pointers and cancels their compat mouse twins',
    tp.includes("e.pointerType !== 'touch'") && tp.includes('e.preventDefault(); // no compat mouse twin'));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}  probe_touch: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
