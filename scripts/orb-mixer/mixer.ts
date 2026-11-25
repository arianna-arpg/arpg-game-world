import { drawGuardDial, drawVitalOrb, guardLayout } from '../../src/render/vis/vitalHud';
import { MOTION_LAYERS, VITAL_DIAL, VITAL_MOTION, type HudOrb, type MotionLayer } from '../../src/render/vis/vitalMaterials';

type Mix = Partial<Record<MotionLayer, number>>;
type Pair = Record<HudOrb, Mix>;
const orbs: HudOrb[] = ['life', 'mana'];
const storageKey = 'hollow-wake.orb-mixer.v1';
const example: Pair = { life: { swirl: .80, bubbles: .55 }, mana: { glint: .8 } };
const baseline: Pair = { life: { swirl: .80 }, mana: { glint: .8 } };
const captions = { life: 'Life', mana: 'Mana' };
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fill = element<HTMLInputElement>('fill'), compact = element<HTMLInputElement>('compact');
const detail = element<HTMLInputElement>('detail'), play = element<HTMLButtonElement>('play');
const pin = element<HTMLButtonElement>('pin'), restore = element<HTMLButtonElement>('restore');
const status = element('status');

function readSaved(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') ?? {}; }
  catch { return {}; }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readPair(value: unknown, fallback: Pair): Pair {
  const pair: Pair = { life: {}, mana: {} };
  for (const id of orbs) {
    const source = record(value) ? value[id] : null;
    if (!record(source)) { pair[id] = { ...fallback[id] }; continue; }
    for (const layer of MOTION_LAYERS) {
      const n = source[layer];
      if (typeof n === 'number' && Number.isFinite(n) && n > 0)
        pair[id][layer] = Math.max(.05, Math.min(1, Math.round(n * 20) / 20));
    }
  }
  return pair;
}
const saved = readSaved();
let current = readPair(saved.current, example), reference = readPair(saved.reference, baseline);
const levels = readPair(saved.levels, example);
if (typeof saved.fill === 'number' && Number.isFinite(saved.fill)) fill.valueAsNumber = saved.fill;
compact.checked = saved.compact === true; detail.checked = saved.detail === true;
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ current, reference, levels,
      fill: fill.valueAsNumber, compact: compact.checked, detail: detail.checked }));
  } catch { /* The mixer also works when browser storage is unavailable. */ }
}
function summary(mix: Mix) {
  return MOTION_LAYERS.filter(layer => mix[layer]).map(layer =>
    VITAL_MOTION[layer].label + ' ' + Math.round(mix[layer]! * 100) + '%').join(' · ') || 'Still liquid';
}
function card(id: HudOrb) {
  const title = captions[id], panel = document.createElement('section');
  panel.className = 'card ' + id; panel.setAttribute('aria-labelledby', 'heading-' + id);
  panel.innerHTML = `<div class="card-title"><h2 id="heading-${id}">${title}</h2><output></output></div>
    <div class="stage"></div><div class="layers"></div>`;
  element('channels').append(panel);
  const stage = panel.querySelector('.stage')!;
  const views = (['Current mix', 'Reference'] as const).map(label => {
    const figure = document.createElement('figure');
    figure.innerHTML = `<h3>${label}</h3><canvas width="130" height="134" role="img" aria-label="${title}, ${label}"></canvas><figcaption></figcaption>`;
    stage.append(figure);
    const canvas = figure.querySelector('canvas')!;
    return { canvas, ink: canvas.getContext('2d')!, caption: figure.querySelector('figcaption')! };
  });
  const controls = MOTION_LAYERS.map(layer => {
    const label = VITAL_MOTION[layer].label, key = id + '-' + layer;
    const row = document.createElement('div'); row.className = 'layer';
    row.innerHTML = `<label><input type="checkbox" id="${key}" aria-label="${title} ${label}">${label}</label>
      <div class="strength"><input id="${key}-strength" type="range" min="5" max="100" step="5" aria-label="${title} ${label} strength"><output for="${key}-strength"></output></div>`;
    panel.querySelector('.layers')!.append(row);
    const on = element<HTMLInputElement>(key), amount = element<HTMLInputElement>(key + '-strength');
    const update = () => {
      const strength = amount.valueAsNumber / 100;
      levels[id][layer] = strength;
      if (on.checked) current[id][layer] = strength;
      else delete current[id][layer];
      status.textContent = '';
      refresh();
    };
    on.addEventListener('change', () => { update(); persist(); });
    amount.addEventListener('input', update); amount.addEventListener('change', persist);
    return { layer, on, amount, row, output: row.querySelector('output')! };
  });
  return { id, views, controls, count: panel.querySelector('output')! };
}
const cards = orbs.map(card);
const fractions = { es: .82, insight: .68, poise: .55 };
const guards = guardLayout(fractions);
let time = 0, frame = 0, previousFrame: number | undefined;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !reduced.matches;

function paint() {
  const radius = compact.checked ? VITAL_DIAL.compactRadius : VITAL_DIAL.radius;
  const dpr = Math.min(3, devicePixelRatio || 1), w = Math.round(130 * dpr), h = Math.round(134 * dpr);
  for (const { id, views } of cards) {
    const max = id === 'life' ? 2400 : 800, amount = Math.round(max * fill.valueAsNumber / 100);
    views.forEach(({ canvas, ink }, index) => {
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ink.setTransform(w / 130, 0, 0, h / 134, 0, 0);
      ink.clearRect(0, 0, 130, 134);
      ink.translate(65, detail.checked ? 57 : 74);
      if (detail.checked) ink.scale(2, 2);
      drawVitalOrb(ink, id, 0, 0, radius, amount, max, 0, time,
        id === 'life' ? 78 : 0, undefined, index === 0 ? current[id] : reference[id]);
      if (id === 'life') for (const sector of guards)
        drawGuardDial(ink, sector, 0, 0, radius, fractions[sector.id as keyof typeof fractions]);
    });
  }
}
function refresh() {
  element<HTMLOutputElement>('percent').value = fill.value + '%';
  let changed = false;
  for (const { id, views, count, controls } of cards) {
    const active = current[id], n = Object.keys(active).length;
    count.value = n === 1 ? '1 layer' : n + ' layers';
    views[0].caption.textContent = summary(active); views[1].caption.textContent = summary(reference[id]);
    for (const { layer, on, amount, row, output } of controls) {
      on.checked = active[layer] !== undefined;
      amount.disabled = !on.checked;
      amount.valueAsNumber = Math.round((active[layer] ?? levels[id][layer] ?? 1) * 100);
      amount.setAttribute('aria-valuetext', amount.value + '%');
      output.value = on.checked ? amount.value + '%' : '—';
      row.classList.toggle('active', on.checked);
      if (active[layer] !== reference[id][layer]) changed = true;
    }
  }
  pin.disabled = restore.disabled = !changed;
  paint();
}
function copyPair(source: Pair): Pair { return { life: { ...source.life }, mana: { ...source.mana } }; }
pin.addEventListener('click', () => {
  reference = copyPair(current); status.textContent = 'Both current mixes are pinned as the reference.'; refresh(); persist();
});
restore.addEventListener('click', () => {
  current = copyPair(reference);
  for (const id of orbs) Object.assign(levels[id], current[id]);
  status.textContent = 'Both reference mixes restored.'; refresh(); persist();
});
fill.addEventListener('input', refresh); fill.addEventListener('change', persist);
for (const box of [compact, detail]) box.addEventListener('change', () => { refresh(); persist(); });

function tick(now: number) {
  if (previousFrame !== undefined) time += Math.min(.1, (now - previousFrame) / 1000);
  previousFrame = now; paint(); frame = requestAnimationFrame(tick);
}
function playback() {
  cancelAnimationFrame(frame); previousFrame = undefined;
  play.textContent = playing ? 'Pause motion' : 'Play motion';
  if (playing && !document.hidden) frame = requestAnimationFrame(tick);
}
play.addEventListener('click', () => { playing = !playing; playback(); });
reduced.addEventListener('change', () => { playing = !reduced.matches; playback(); });
document.addEventListener('visibilitychange', playback);
window.addEventListener('resize', paint);
refresh(); playback();
