import { MOTION_LAYERS, VITAL_GLASS, VITAL_MOTION, type HudOrb, type MotionLayer, type OrbMotion } from './vitalMaterials';

type Ink = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

// Lanes are fractions of the submerged width. Different starting depths keep the bubbles sparse.
const bubbles = [
  { lane: -.68, start: .10, size: 2.2 }, { lane: -.43, start: .58, size: 1.3 },
  { lane: .59, start: .34, size: 2.5 }, { lane: .74, start: .84, size: 1.5 },
] as const;

function drawSwirl(c: Ink, phase: number, width: number, depth: number, top: number, core: string, rim: string) {
  c.translate(0, top + depth * .56);
  c.scale(width * .90, depth * .39);
  c.rotate(phase);
  // Two tapered folds turn around an off-centre curl inside the liquid.
  const tint = c.createLinearGradient(-1, .3, .9, -.25);
  tint.addColorStop(0, core + '18'); tint.addColorStop(.41, rim + 'cc');
  tint.addColorStop(.72, rim + '96'); tint.addColorStop(1, core + '15');
  c.fillStyle = tint;
  for (let fold = 0; fold < 2; fold++) {
    c.beginPath(); c.moveTo(-.98, .05);
    c.bezierCurveTo(-.79, -.76, .57, -.94, .77, -.28);
    c.bezierCurveTo(.91, .19, .31, .51, .04, .24);
    c.bezierCurveTo(.39, .42, .72, .05, .58, -.21);
    c.bezierCurveTo(.30, -.71, -.64, -.53, -.98, .05);
    c.fill();
    c.globalAlpha *= .72; c.rotate(2.76); c.scale(.76, .85);
  }
}

function drawBubbles(c: Ink, turn: number, radius: number, width: number, top: number, rim: string) {
  const alpha = c.globalAlpha;
  c.strokeStyle = rim; c.fillStyle = rim;
  for (const bubble of bubbles) {
    const rise = (turn + bubble.start) % 1;
    const x = bubble.lane * width + 1.7 * Math.sin(TAU * rise + bubble.start);
    const wall = Math.sqrt(Math.max(0, radius * radius - x * x));
    const ceiling = Math.max(top, -wall) + bubble.size + 1, foot = wall - bubble.size - 1;
    if (foot <= ceiling) continue;
    const y = foot + (ceiling - foot) * rise;
    const size = bubble.size * (.65 + rise * .35);
    c.globalAlpha = alpha * Math.min(1, rise * 7, (1 - rise) * 7);
    c.lineWidth = .75;
    c.beginPath(); c.arc(x, y, size, 0, TAU); c.stroke();
    c.beginPath(); c.arc(x - .35 * size, y - .38 * size, size * .26, 0, TAU); c.fill();
  }
}

function drawGlint(c: Ink, phase: number, radius: number, rim: string) {
  // A reflected crescent travels along the lower wall. The second, narrower edge catches the light.
  c.rotate(.60 * Math.sin(phase));
  c.scale(radius, radius);
  c.fillStyle = rim;
  c.beginPath(); c.moveTo(-.70, .45);
  c.bezierCurveTo(-.46, .92, .30, 1.00, .71, .40);
  c.bezierCurveTo(.39, .80, -.25, .91, -.70, .45); c.fill();
  c.globalAlpha *= .85;
  c.beginPath(); c.moveTo(-.42, .65);
  c.quadraticCurveTo(.05, .98, .40, .70);
  c.quadraticCurveTo(.08, .90, -.42, .65); c.fill();
}

function drawBloom(c: Ink, phase: number, width: number, depth: number, top: number, core: string, deep: string) {
  // A dark plume and a lit plume diffuse into the liquid at different depths.
  c.translate(0, top + depth * .59);
  c.scale(width, depth * .55);
  for (let i = 0; i < 2; i++) {
    const angle = phase + i * Math.PI;
    const x = .46 * Math.cos(angle), y = .26 * Math.sin(angle);
    const spread = .55 + .09 * Math.sin(angle);
    const color = i === 0 ? deep : core;
    const ink = c.createRadialGradient(x, y, 0, x, y, spread);
    ink.addColorStop(0, color); ink.addColorStop(.48, color + '93'); ink.addColorStop(1, color + '00');
    c.fillStyle = ink; c.fillRect(x - spread, y - spread, 2 * spread, 2 * spread);
  }
}

function drawMotes(c: Ink, phase: number, width: number, depth: number, top: number, rim: string) {
  const alpha = c.globalAlpha;
  c.fillStyle = rim;
  for (let i = 0; i < 9; i++) {
    const angle = phase + i * 2.4;
    const x = width * (.70 * Math.cos(i * 2.4) + .12 * Math.sin(angle));
    const y = top + depth * (.18 + .62 * ((i * .38) % 1) + .09 * Math.cos(angle));
    c.globalAlpha = alpha * (.55 + .35 * Math.sin(angle));
    c.beginPath(); c.arc(x, y, .65 + .28 * (i % 2), 0, TAU); c.fill();
  }
}

function drawFacets(c: Ink, phase: number, width: number, depth: number, top: number, rim: string) {
  const alpha = c.globalAlpha;
  c.fillStyle = rim;
  for (let i = 0; i < 4; i++) {
    const angle = phase + 2.3 * i, tilt = Math.cos(angle);
    const x = width * ((i - 1.5) * .42 + .06 * Math.sin(angle));
    const y = top + depth * (.25 + .17 * i + .06 * tilt);
    const half = .45 + 2.3 * Math.abs(tilt);
    c.globalAlpha = alpha * (.3 + .7 * Math.abs(tilt));
    c.beginPath(); c.moveTo(x + 1.8, y - 4);
    c.lineTo(x + half, y + .7); c.lineTo(x - 1.8, y + 4); c.lineTo(x - half, y - .7);
    c.closePath(); c.fill();
  }
}

function drawLayer(c: Ink, id: HudOrb, layer: MotionLayer, strength: number, time: number,
  radius: number, width: number, depth: number, top: number): void {
  const style = VITAL_MOTION[layer], art = VITAL_GLASS[id];
  const turn = (time / style.period + (id === 'mana' ? .37 : 0)) % 1, phase = turn * TAU;
  c.save();
  c.globalAlpha *= style.opacity * Math.min(1, strength);
  switch (layer) {
    case 'bloom': drawBloom(c, phase, width, depth, top, art.core, art.deep); break;
    case 'swirl': drawSwirl(c, phase, width, depth, top, art.core, art.rim); break;
    case 'motes': drawMotes(c, phase, width, depth, top, art.rim); break;
    case 'facets': drawFacets(c, phase, width, depth, top, art.rim); break;
    case 'bubbles': drawBubbles(c, turn, radius, width, top, art.rim); break;
    case 'glint': drawGlint(c, phase, radius, art.rim); break;
  }
  c.restore();
}

/** The caller clips to the glass. Leave a clear strip below the surface and any reserved capacity. */
export function drawPotionMotion(c: Ink, id: HudOrb, motion: OrbMotion, time: number | undefined,
  radius: number, surface: number): void {
  if (motion === 'still' || time === undefined) return;
  const top = surface + 3, depth = radius - top;
  if (depth <= 2) return;
  const width = top <= 0 ? radius : Math.sqrt(radius * radius - top * top);
  c.save();
  c.beginPath(); c.rect(-radius, top, radius * 2, depth); c.clip();
  c.globalAlpha *= Math.min(1, depth / 14);
  if (typeof motion === 'string') {
    drawLayer(c, id, motion, 1, time, radius, width, depth, top);
  } else {
    for (const layer of MOTION_LAYERS) {
      const strength = motion[layer] ?? 0;
      if (strength > 0) drawLayer(c, id, layer, strength, time, radius, width, depth, top);
    }
  }
  c.restore();
}
