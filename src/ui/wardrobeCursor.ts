import { CURSOR_COLORS, CURSOR_MOTION_CFG, CURSOR_STYLES, cursorCss, drawAimReticle, normalizeCursorOptions } from '../core/cursor';
import type { Settings } from '../meta/settings';
import { AIM_TICK_STYLES } from '../render/vis/aimtick';
import { hollowWakeMenuHeader } from './brand';
import { esc } from './dom';
import { renderInterfacePage } from './interfacePage';
import { MAP_CHART_MODES } from './mapConfig';

type HudAppearance = Pick<Settings,'cursor' | 'aimTick' | 'skillArtwork' | 'mapChart'>;
export interface WardrobeHudOptions {
  get(): HudAppearance;
  save(appearance: HudAppearance): void;
}

/** The sample uses the same cursor art, reticle and facing markers as the game. */
export function renderWardrobeCursor(root: HTMLElement, options: WardrobeHudOptions, back: () => void): void {
  const saved = options.get();
  const cursor = normalizeCursorOptions(saved.cursor);
  const tick = {...saved.aimTick};
  renderInterfacePage(root, { id:'pointer-hud', className:'wardrobe', label:'Pointer & HUD', body:`
    ${hollowWakeMenuHeader()}
    <header><div><div class="wd-eyebrow">Wardrobe</div><h1>Pointer &amp; HUD</h1></div></header>
    <div class="wd-layout"><aside>
      <figure class="wd-aim-preview"><canvas width="280" height="128" aria-label="Pointer, controller reticle and facing marker preview"></canvas>
        <figcaption>Pointer · Aim reticle · Facing marker</figcaption></figure>
    </aside><div class="wd-hud-controls">
      <fieldset><legend>Pointer &amp; reticle</legend>
        <label>Pointer style <select data-pointer-style>${Object.values(CURSOR_STYLES).map(v => `<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label>
        <label>Tint <input data-pointer-color type="color" value="${esc(cursor.color)}"></label>
        <div class="wd-tints" role="group" aria-label="Tint presets">${CURSOR_COLORS.map(v => `<button type="button" data-cursor-color="${esc(v.css)}" style="--swatch:${esc(v.css)}" aria-label="${esc(v.label)}" title="${esc(v.label)}"></button>`).join('')}</div>
        <label>Idle motion <input type="checkbox" data-pointer-motion></label>
        <label>Idle delay <span><input type="range" data-pointer-delay min="${CURSOR_MOTION_CFG.minDelaySec}" max="${CURSOR_MOTION_CFG.maxDelaySec}" step=".5"> <output data-delay-value></output></span></label>
      </fieldset>
      <fieldset><legend>Facing marker</legend>
        <label>Shape <select data-aim-style>${Object.values(AIM_TICK_STYLES).map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label>
        <label>Opacity <span><input type="range" data-aim-alpha min="0" max="100" step="5"> <output data-alpha-value></output></span></label>
      </fieldset>
      <fieldset><legend>Artwork</legend>
        <label>Skill icons <select data-hud-skills><option value="art">Illustrations</option><option value="letters">Initials</option></select></label>
        <label>World map <select data-hud-map>${MAP_CHART_MODES.map(v=>`<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('')}</select></label>
      </fieldset>
      <p class="wd-note" role="status" data-hud-note></p>
    </div></div>`, footer:'<button type="button" class="wd-primary" data-hud-save>Save appearance</button><button type="button" data-hud-back>Back to Wardrobe</button>' });
  const input = (selector: string) => root.querySelector<HTMLInputElement>(selector)!;
  const select = (selector: string) => root.querySelector<HTMLSelectElement>(selector)!;
  const style = select('[data-pointer-style]'), color = input('[data-pointer-color]');
  const motion = input('[data-pointer-motion]'), delay = input('[data-pointer-delay]');
  const shape = select('[data-aim-style]'), alpha = input('[data-aim-alpha]');
  const skills = select('[data-hud-skills]'), map = select('[data-hud-map]');
  const note = root.querySelector<HTMLElement>('[data-hud-note]')!;
  style.value = cursor.style; motion.checked = !!cursor.idleMotion; delay.value = String(cursor.idleDelaySec);
  shape.value = tick.style; alpha.value = String(tick.alpha * 100);
  skills.value = saved.skillArtwork ? 'art' : 'letters'; map.value = saved.mapChart;
  const canvas = root.querySelector('canvas')!;
  const swatches = root.querySelectorAll<HTMLButtonElement>('[data-cursor-color]');
  const delayOut = root.querySelector<HTMLOutputElement>('[data-delay-value]')!;
  const alphaOut = root.querySelector<HTMLOutputElement>('[data-alpha-value]')!;
  let textColor = '';
  const resolveTextColor = (): string => {
    if (!textColor) textColor = getComputedStyle(canvas).color || '#d8d4c8';
    return textColor;
  };
  const preview = () => {
    const def = CURSOR_STYLES[style.value], marker = AIM_TICK_STYLES[shape.value];
    motion.disabled = !def.idle; delay.disabled = motion.disabled || !motion.checked;
    delayOut.value = delay.value + ' s';
    alphaOut.value = alpha.value + '%';
    swatches.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cursorColor === color.value)));
    canvas.style.cursor = cursorCss(def.id,color.value) || 'default';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ink = resolveTextColor();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.translate(46-def.size/2,64-def.size/2);
    if (def.id === 'system') {
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '13px sans-serif';
      ctx.fillText('System',def.size/2,def.size/2);
    } else def.paint(ctx,def.size,color.value);
    ctx.restore();
    drawAimReticle(ctx,140,64,color.value,0);
    ctx.save(); ctx.translate(234,64); ctx.fillStyle = ink;
    ctx.globalAlpha = .38; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = Number(alpha.value)/100;
    if (marker.playerOverlay) marker.playerOverlay(ctx,-Math.PI/4,14,false);
    else marker.draw(ctx,-Math.PI/4,14);
    ctx.restore();
  };
  const changed = () => { preview(); note.textContent = 'Preview only. Save to apply.'; };
  root.querySelector('.wd-hud-controls')!.addEventListener('input',changed);
  swatches.forEach(b => b.addEventListener('click',() => { color.value = b.dataset.cursorColor!; changed(); }));
  root.querySelector('[data-hud-save]')!.addEventListener('click',() => {
    const chart = MAP_CHART_MODES.find(v=>v.id === map.value)!;
    options.save({cursor:normalizeCursorOptions({style:style.value,color:color.value,idleMotion:motion.checked,idleDelaySec:Number(delay.value)}),
      aimTick:{style:shape.value,alpha:Number(alpha.value)/100},skillArtwork:skills.value === 'art',mapChart:chart.id});
    note.textContent = 'Appearance saved.';
  });
  root.querySelector('[data-hud-back]')!.addEventListener('click',back);
  preview();
}
