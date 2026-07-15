// ---------------------------------------------------------------------------
// CRAFTING MINIGAMES — skill-driven quality, not a magic-find stat.
//
// Each discipline is a short overlay game that ends in ONE number: score
// (0..1). The engine (crafting.ts) turns that score into outcome quality by
// LIFTING the roll toward the unlocked ceiling — so "better items" is
// something the player's hands do, not a stat they wear. The overlay runs on
// its own clock (works even when the game tab throttles rAF), swallows
// pointer events so a strike never fires a skill underneath, and always
// resolves exactly once.
//
// Disciplines shipped:
//  · SMITHING (the salvage bench): a heat bar fills slowly; a slider sweeps;
//    striking in the sweet spot surges the fill, mistimed strikes cool it.
//    Final fill = score. The timing-window feel of the strike skills.
//  · COMMUNION (the Oracle stone): runes light up one after another; move
//    the cursor onto each before it fades. Precision + swiftness = score.
//    You are conjuring — the mouse is the wand.
// All knobs in CRAFT_CFG (engine/crafting.ts). New disciplines = one more
// function here + a station to host it.
// ---------------------------------------------------------------------------

import { CRAFT_CFG } from '../engine/crafting';
import { UI_SCALE_CFG } from './uiScale';

export interface MinigameResult { score: number; }

/** Shared overlay scaffold: backdrop + centered dark box; swallows pointer
 *  events; returns a close() that tears everything down exactly once. */
function overlay(title: string, hint: string): { box: HTMLElement; close: () => void } {
  const root = document.createElement('div');
  root.className = UI_SCALE_CFG.markerClass; // dynamically-built root — opts into the UI-scale dial
  root.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(6,4,10,0.72);display:flex;align-items:center;justify-content:center';
  for (const ev of ['mousedown', 'mouseup', 'click', 'contextmenu', 'wheel']) {
    root.addEventListener(ev, e => e.stopPropagation());
  }
  const box = document.createElement('div');
  box.style.cssText = 'position:relative;width:460px;background:var(--panel-bg,#171221);border:1px solid #4a3a5a;border-radius:8px;padding:16px;box-shadow:0 6px 30px rgba(0,0,0,0.8)';
  box.innerHTML = `
    <div style="color:var(--gold,#c8a84b);font-size:14px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px">${title}</div>
    <div style="color:#8a8678;font-size:10px;margin-bottom:10px">${hint}</div>`;
  root.appendChild(box);
  document.body.appendChild(root);
  let closed = false;
  return {
    box,
    close: () => {
      if (closed) return;
      closed = true;
      root.remove();
    },
  };
}

/** SMITHING: fill the heat bar before the work cools. Strike (click) as the
 *  slider crosses the sweet spot to surge it; a mistimed strike costs heat. */
export function runSmithMinigame(onDone: (r: MinigameResult) => void): void {
  const cfg = CRAFT_CFG.smith;
  const { box, close } = overlay('Smithing', 'STRIKE (click) as the slider crosses the bright band. Fill the bar before the metal cools.');
  box.insertAdjacentHTML('beforeend', `
    <div style="height:18px;background:#100c18;border:1px solid #3a3244;border-radius:4px;overflow:hidden;margin-bottom:10px">
      <div id="smith-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#7a4a2a,#e8842a,#ffd34d)"></div>
    </div>
    <div style="position:relative;height:26px;background:#100c18;border:1px solid #3a3244;border-radius:4px">
      <div id="smith-sweet" style="position:absolute;top:0;bottom:0;background:rgba(255,211,77,0.28);border-left:1px solid #ffd34d;border-right:1px solid #ffd34d"></div>
      <div id="smith-slider" style="position:absolute;top:-3px;bottom:-3px;width:4px;background:#e8e0d0;border-radius:2px"></div>
    </div>
    <div id="smith-time" style="color:#8a8678;font-size:10px;margin-top:8px;text-align:right"></div>`);
  const fillEl = box.querySelector<HTMLElement>('#smith-fill')!;
  const sweetEl = box.querySelector<HTMLElement>('#smith-sweet')!;
  const sliderEl = box.querySelector<HTMLElement>('#smith-slider')!;
  const timeEl = box.querySelector<HTMLElement>('#smith-time')!;
  sweetEl.style.left = `${(0.5 - cfg.sweetWidth / 2) * 100}%`;
  sweetEl.style.width = `${cfg.sweetWidth * 100}%`;

  let fill = 0;
  let t = 0;
  let last = performance.now();
  const sliderPos = (): number => 0.5 + 0.5 * Math.sin((t / cfg.sweepPeriod) * Math.PI * 2);

  const strike = (): void => {
    const off = Math.abs(sliderPos() - 0.5);
    if (off <= cfg.sweetWidth / 2) {
      fill = Math.min(1, fill + cfg.clickBoost);
      box.animate([{ boxShadow: '0 0 26px #ffd34d' }, { boxShadow: 'none' }], { duration: 240 });
    } else {
      fill = Math.max(0, fill - cfg.missPenalty);
      box.animate([{ boxShadow: '0 0 18px #d05050' }, { boxShadow: 'none' }], { duration: 240 });
    }
  };
  box.addEventListener('mousedown', strike);

  const timer = window.setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    fill = Math.min(1, fill + cfg.passiveRate * dt);
    sliderEl.style.left = `calc(${sliderPos() * 100}% - 2px)`;
    fillEl.style.width = `${fill * 100}%`;
    timeEl.textContent = `${Math.max(0, cfg.duration - t).toFixed(1)}s`;
    if (t >= cfg.duration) {
      window.clearInterval(timer);
      close();
      onDone({ score: fill });
    }
  }, 16);
}

const RUNE_GLYPHS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᛉ', 'ᛟ', 'ᛝ'];

/** COMMUNION: runes kindle one by one — carry the cursor onto each before it
 *  gutters out. Hits score; haste scores more. */
export function runRuneMinigame(onDone: (r: MinigameResult) => void): void {
  const cfg = CRAFT_CFG.runes;
  const { box, close } = overlay('Communion', 'Carry your cursor onto each rune as it kindles — swiftly, before it gutters.');
  box.insertAdjacentHTML('beforeend', `
    <div id="rune-field" style="position:relative;height:280px;background:#0d0a14;border:1px solid #3a3244;border-radius:6px;overflow:hidden"></div>`);
  const field = box.querySelector<HTMLElement>('#rune-field')!;

  let idx = 0;
  let credit = 0;
  let deadline = 0;
  let runeEl: HTMLElement | null = null;
  let runePos = { x: 0, y: 0 };
  let timer = 0;

  const finish = (): void => {
    window.clearInterval(timer);
    close();
    onDone({ score: credit / cfg.count });
  };

  const nextRune = (): void => {
    runeEl?.remove();
    if (idx >= cfg.count) { finish(); return; }
    const pad = 36;
    const w = field.clientWidth;
    const h = field.clientHeight;
    runePos = { x: pad + Math.random() * (w - pad * 2), y: pad + Math.random() * (h - pad * 2) };
    runeEl = document.createElement('div');
    runeEl.textContent = RUNE_GLYPHS[idx % RUNE_GLYPHS.length];
    runeEl.style.cssText = `position:absolute;left:${runePos.x}px;top:${runePos.y}px;transform:translate(-50%,-50%);
      font-size:30px;color:#b06bd4;text-shadow:0 0 14px #b06bd4;transition:opacity ${cfg.perRuneTime}s linear;opacity:1`;
    field.appendChild(runeEl);
    requestAnimationFrame(() => { if (runeEl) runeEl.style.opacity = '0.15'; }); // the gutter-out
    deadline = performance.now() + cfg.perRuneTime * 1000;
    idx++;
  };

  field.addEventListener('mousemove', (e) => {
    if (!runeEl) return;
    const r = field.getBoundingClientRect();
    // rect ÷ layout = the field's effective on-screen scale (the UI-scale
    // dial, or any future ancestor zoom) — folding it out keeps the cursor,
    // the rune coords, and cfg.hitRadius all in the layout px the runes were
    // placed in. Self-calibrating: no fabric import to drift from.
    const fs = r.width / Math.max(1, field.clientWidth);
    const dx = (e.clientX - r.left) / fs - runePos.x;
    const dy = (e.clientY - r.top) / fs - runePos.y;
    if (dx * dx + dy * dy <= cfg.hitRadius * cfg.hitRadius) {
      const remaining = Math.max(0, deadline - performance.now()) / (cfg.perRuneTime * 1000);
      credit += (1 - cfg.speedWeight) + cfg.speedWeight * remaining;
      const flash = runeEl;
      flash.style.transition = 'none';
      flash.style.color = '#ffd34d';
      flash.style.textShadow = '0 0 20px #ffd34d';
      window.setTimeout(() => flash.remove(), 90);
      runeEl = null;
      window.setTimeout(nextRune, 140);
    }
  });

  timer = window.setInterval(() => {
    if (runeEl && performance.now() > deadline) nextRune(); // guttered — no credit
  }, 40);
  nextRune();
}
