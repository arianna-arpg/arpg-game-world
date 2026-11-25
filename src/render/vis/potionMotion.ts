import { VITAL_GLASS, VITAL_MOTION, type HudOrb, type OrbMotion } from './vitalMaterials';

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

/** The caller clips to the glass. Leave a clear strip below the surface and any reserved capacity. */
export function drawPotionMotion(c: Ink, id: HudOrb, motion: OrbMotion, time: number | undefined,
  radius: number, surface: number): void {
  if (motion === 'still' || time === undefined) return;
  const top = surface + 3, depth = radius - top;
  if (depth <= 2) return;
  const width = top <= 0 ? radius : Math.sqrt(radius * radius - top * top);
  const style = VITAL_MOTION[motion], art = VITAL_GLASS[id];
  const turn = (time / style.period + (id === 'mana' ? .37 : 0)) % 1;
  c.save();
  c.beginPath(); c.rect(-radius, top, radius * 2, depth); c.clip();
  c.globalAlpha *= style.opacity * Math.min(1, depth / 14);
  if (motion === 'swirl') drawSwirl(c, turn * TAU, width, depth, top, art.core, art.rim);
  else if (motion === 'bubbles') drawBubbles(c, turn, radius, width, top, art.rim);
  else drawGlint(c, turn * TAU, radius, art.rim);
  c.restore();
}
