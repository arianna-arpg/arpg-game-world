import { clamp } from '../../core/math';
import { registerVisCache } from './caches';
import { VITAL_DIAL as D, VITAL_GLASS, VITAL_MATERIALS, type GuardDial, type HudOrb, type VitalMaterial } from './vitalMaterials';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const R = 46, GLASS = R * D.glassRatio, TILE = 112, RES = 2, CELL = TILE * RES;
const faces: Partial<Record<HudOrb, HTMLCanvasElement>> = {};
const glyphs: Partial<Record<VitalMaterial, Path2D>> = {};
type Ink = CanvasRenderingContext2D;

registerVisCache({
  id: 'vitalHud',
  count: () => Object.keys(faces).length,
  bytes: () => Object.keys(faces).length * 3 * CELL * CELL * 4,
  onRunSwap: () => { delete faces.life; delete faces.mana; },
});

function circle(c: Ink, x: number, y: number, r: number) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
}
function emblem(c: Ink, key: VitalMaterial, x: number, y: number, scale: number, color: string) {
  const path = glyphs[key] ??= new Path2D(VITAL_MATERIALS[key].glyph);
  c.save(); c.translate(x, y); c.scale(scale, scale);
  c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.6;
  c.stroke(path); c.restore();
}
function metal(c: Ink, middle: string) {
  const m = c.createLinearGradient(-24, -44, 20, 48);
  m.addColorStop(0, '#fcdfac'); m.addColorStop(.18, middle); m.addColorStop(.38, '#454749');
  m.addColorStop(.55, '#252f34'); m.addColorStop(.76, middle); m.addColorStop(1, '#463a35');
  return m;
}

/** The well, liquid and glass share a supersampled atlas. Its fill is cropped to the live surface. */
function bakeFace(id: HudOrb) {
  const art = VITAL_GLASS[id], atlas = document.createElement('canvas');
  atlas.width = CELL * 3; atlas.height = CELL;
  const c = atlas.getContext('2d')!;
  function cell(i: number) { c.setTransform(RES, 0, 0, RES, CELL * (i + .5), CELL / 2); }
  cell(0);
  // Socket, bevel and shadowed empty glass.
  circle(c, 0, 1.4, R + 1); c.fillStyle = '#0b1016'; c.fill();
  circle(c, 0, 0, R); c.fillStyle = metal(c, art.metal); c.fill();
  circle(c, 0, 0, R - 1.3); c.fillStyle = '#20282b'; c.fill();
  circle(c, 0, 0, R - 2.8); c.fillStyle = metal(c, art.metal); c.fill();
  const well = c.createLinearGradient(0, -GLASS, 0, GLASS);
  well.addColorStop(0, '#080d14'); well.addColorStop(.65, art.well); well.addColorStop(1, '#10131b');
  circle(c, 0, 0, GLASS); c.fillStyle = well; c.fill();

  cell(1); c.save(); circle(c, 0, 0, GLASS); c.clip();
  const liquid = c.createRadialGradient(-13, -15, 1, 4, 7, 51);
  liquid.addColorStop(0, art.core); liquid.addColorStop(.40, art.body);
  liquid.addColorStop(.84, art.shade); liquid.addColorStop(1, art.deep);
  c.fillStyle = liquid; c.fillRect(-R, -R, 2 * R, 2 * R);
  if (art.texture === 'flow') {
    // Folded veins of garnet. Translucent ribbons retain the density of blood.
    for (let i = 0; i < 6; i++) {
      const y = -40 + i * 16;
      c.beginPath(); c.moveTo(-48, y + 17); c.bezierCurveTo(-20, y - 15, -8, y + 28, 18, y + 8);
      c.quadraticCurveTo(33, y - 5, 50, y - 13); c.quadraticCurveTo(37, y + 3, 19, y + 16);
      c.bezierCurveTo(-4, y + 31, -19, y + 1, -48, y + 23); c.closePath();
      c.fillStyle = i % 2 ? '#ff9c8336' : '#420c2b42'; c.fill();
    }
  } else {
    // A cut sapphire surface. Edges change direction where two facets meet.
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const x = -60 + col * 24 + (row % 2) * 12, y = -50 + row * 22;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 24, y - 5); c.lineTo(x + 12, y + 19); c.closePath();
      c.fillStyle = (row + col) % 3 === 0 ? '#a0e2ff38' : '#17285725'; c.fill();
    }
  }
  // A little transmitted light gathers at the foot of a filled lens.
  const caustic = c.createRadialGradient(7, 36, 0, 7, 36, 23);
  caustic.addColorStop(0, art.core); caustic.addColorStop(1, art.deep + '00');
  c.globalAlpha = .42; c.fillStyle = caustic; c.fillRect(-R, 8, 2 * R, R);
  c.restore();

  cell(2);
  // Unbroken glass above the moving surface. Keep the optical highlight off the number.
  c.save(); circle(c, 0, 0, GLASS); c.clip();
  const lens = c.createLinearGradient(-18, -40, -8, -16);
  lens.addColorStop(0, '#ffeeda54'); lens.addColorStop(1, '#e8fbff00');
  c.fillStyle = lens; c.beginPath(); c.ellipse(-10, -28, 33, 10, -.32, 0, TAU); c.fill();
  c.strokeStyle = '#fff0dc9a'; c.lineWidth = 1.25; c.beginPath(); c.arc(0, 0, GLASS - 2, 213 * DEG, 250 * DEG); c.stroke();
  c.strokeStyle = '#b3d5d746'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, GLASS - 2, 26 * DEG, 66 * DEG); c.stroke();
  c.restore();
  // Inset graduations give quarter, half and three-quarter levels a reference on either side.
  for (const level of [-GLASS / 2, 0, GLASS / 2]) {
    const side = Math.sqrt(GLASS * GLASS - level * level) - 1;
    const length = level === 0 ? 5 : 3;
    c.strokeStyle = '#ebdfc86e'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-side, level); c.lineTo(-side + length, level);
    c.moveTo(side, level); c.lineTo(side - length, level); c.stroke();
  }
  // Small chased marks belong to the bezel. The lower mount frames a recessed maker's gem.
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    for (let i = 0; i < 4; i++) {
      const a = (24 + i * 9) * DEG;
      c.strokeStyle = i % 2 ? '#ad937681' : '#e3be909e'; c.lineWidth = 1;
      c.beginPath(); c.moveTo((R - 2) * Math.cos(a), (R - 2) * Math.sin(a)); c.lineTo(R * Math.cos(a), R * Math.sin(a)); c.stroke();
    }
    c.beginPath(); c.moveTo(2, 45); c.quadraticCurveTo(14, 45, 28, 35);
    c.lineTo(20, 44); c.lineTo(8, 48); c.lineTo(2, 51); c.closePath();
    c.fillStyle = metal(c, art.metal); c.fill(); c.strokeStyle = '#151a20'; c.lineWidth = 1; c.stroke();
    c.restore();
  }
  c.beginPath(); c.moveTo(0, 40); c.lineTo(5, 45); c.lineTo(0, 52); c.lineTo(-5, 45); c.closePath();
  c.fillStyle = art.edge; c.fill(); c.strokeStyle = art.metal; c.lineWidth = 1.3; c.stroke();
  c.strokeStyle = art.rim; c.beginPath(); c.moveTo(-2.4, 45); c.lineTo(0, 42); c.lineTo(1.5, 44); c.stroke();
  faces[id] = atlas;
  return atlas;
}
function chord(fraction: number) {
  const offset = 1 - 2 * fraction;
  return GLASS * Math.sqrt(Math.max(0, 1 - offset * offset));
}
export function drawVitalOrb(c: Ink, id: HudOrb, x: number, y: number, r: number,
  current: number, max: number, reserved: number, time: number, ward = 0, seal?: number): void {
  const atlas = faces[id] ?? bakeFace(id);
  const art = VITAL_GLASS[id];
  const f = max > 0 ? clamp(current / max, 0, 1) : 0, level = GLASS * (1 - 2 * f);
  c.save(); c.translate(x, y); c.scale(r / R, r / R);
  c.drawImage(atlas, 0, 0, CELL, CELL, -TILE / 2, -TILE / 2, TILE, TILE);
  if (f > 0) {
    const cut = TILE / 2 + level, height = TILE - cut;
    c.drawImage(atlas, CELL, cut * RES, CELL, height * RES, -TILE / 2, level, TILE, height);
  }
  c.save(); circle(c, 0, 0, GLASS); c.clip();
  if (f > 0 && f < 1) {
    const span = chord(f), wave = Math.sin(time * 1.7 + (id === 'mana' ? 2 : 0)) * Math.min(1, span / 12);
    c.strokeStyle = art.rim; c.lineWidth = 1.25; c.beginPath(); c.moveTo(-span, level);
    c.bezierCurveTo(-span * .35, level + wave, span * .35, level - wave, span, level); c.stroke();
  }
  if (max > 0 && reserved > 0) {
    const edge = -GLASS + GLASS * 2 * clamp(reserved / max, 0, 1);
    c.save(); c.beginPath(); c.rect(-GLASS, -GLASS, 2 * GLASS, edge + GLASS); c.clip();
    c.fillStyle = '#63606a9c'; c.fillRect(-GLASS, -GLASS, 2 * GLASS, 2 * GLASS);
    c.beginPath();
    for (let t = -3 * GLASS; t < 2 * GLASS; t += 7) { c.moveTo(t, -GLASS); c.lineTo(t + 2 * GLASS, GLASS); }
    c.strokeStyle = '#d3c8b161'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#d3c4a9'; c.fillRect(-GLASS, edge - 1, 2 * GLASS, 1); c.restore();
  }
  if (ward > 0) {
    const depth = clamp(ward / Math.max(1, max), .06, 1), edge = GLASS * (1 - 2 * depth);
    c.fillStyle = '#79baff46'; c.fillRect(-GLASS, edge, 2 * GLASS, 2 * GLASS);
    c.strokeStyle = '#b6d9ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-chord(depth), edge); c.lineTo(chord(depth), edge); c.stroke();
  }
  if (seal !== undefined && max > 0) {
    const edge = GLASS * (1 - 2 * clamp(seal / max, 0, 1));
    c.setLineDash([4, 3]); c.strokeStyle = '#ffdb79'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-GLASS, edge); c.lineTo(GLASS, edge); c.stroke(); c.setLineDash([]);
  }
  c.restore();
  c.drawImage(atlas, 2 * CELL, 0, CELL, CELL, -TILE / 2, -TILE / 2, TILE, TILE);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  if (ward > 0) {
    c.font = 'bold 11px Verdana';
    c.fillStyle = '#a8ccff';
    c.fillText(String(Math.ceil(ward)), 0, -12);
  } else emblem(c, id, 0, -20, .84, art.rim);
  if (seal !== undefined && max > 0) {
    c.font = '9px Verdana';
    c.fillStyle = '#ffd700';
    // The moving seal line can pass either number. Give its caption a separate baseline.
    c.fillText('\u26bf sealed', 0, 28);
  }
  c.restore();
  // Keep the original HUD type size even when the vessel shrinks to fit a narrow seat.
  c.save();
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = 'bold 14px Verdana'; c.fillStyle = '#fff';
  c.fillText(String(Math.max(0, Math.ceil(current))), x, y + 5, r * 1.6);
  c.font = '10px Verdana'; c.fillStyle = '#8a8678';
  c.fillText(VITAL_MATERIALS[id].label, x, y - r - D.clearance);
  c.restore();
}

function arc(c: Ink, r: number, start: number, end: number, width: number, color: string) {
  if (end <= start) return;
  c.beginPath(); c.arc(0, 0, r, start, end); c.lineWidth = width; c.strokeStyle = color; c.stroke();
}

export interface GuardSector {
  id: GuardDial;
  from: number;
  to: number;
  capX: number;
  capY: number;
}

const guardOrder = Object.keys(D.sectors) as GuardDial[];
const layouts = new Map<number, readonly GuardSector[]>();

/** Undefined means hidden. An empty but visible pool still owns a measurable track. */
export function guardLayout(fractions: Readonly<Partial<Record<GuardDial, number | undefined>>>): readonly GuardSector[] {
  let mask = 0;
  for (let i = 0; i < guardOrder.length; i++) {
    if (fractions[guardOrder[i]] !== undefined) mask |= 1 << i;
  }
  const cached = layouts.get(mask);
  if (cached) return cached;
  const visible = guardOrder.filter(id => fractions[id] !== undefined);
  const totalWeight = visible.reduce((sum, id) => sum + D.sectors[id].weight, 0);
  const span = D.crown.to - D.crown.from - Math.max(0, visible.length - 1) * D.crown.gap;
  let next = D.crown.from;
  const layout = visible.map(id => {
    const from = next * DEG;
    next += span * D.sectors[id].weight / totalWeight;
    const to = next * DEG;
    next += D.crown.gap;
    const cap = from - D.crown.capLead;
    return { id, from, to, capX: Math.cos(cap), capY: Math.sin(cap) };
  });
  layouts.set(mask, layout);
  return layout;
}

/** Hit the medallion or the rail, including its unfilled length. Coordinates are relative to the orb. */
export function guardAt(sectors: readonly GuardSector[], dx: number, dy: number, orbRadius: number): GuardDial | undefined {
  const r = orbRadius + D.guardRadius;
  if (!sectors.length || Math.abs(Math.hypot(dx, dy) - r) > D.crown.hitHalfWidth) return;
  const start = D.crown.from * DEG;
  const angle = start + (Math.atan2(dy, dx) - start + TAU) % TAU;
  for (const sector of sectors) {
    const cx = dx - r * sector.capX, cy = dy - r * sector.capY;
    if (cx * cx + cy * cy <= (D.capRadius + .8) ** 2 ||
        (angle >= sector.from && angle <= sector.to)) return sector.id;
  }
}

/** Dark track is capacity, lit length is current value. */
export function drawGuardDial(c: Ink, sector: GuardSector, x: number, y: number, radius: number, fraction: number,
  state: 'ready' | 'broken' | 'recharging' = 'ready', emphasis = 1): void {
  const broken = state === 'broken', recharging = state === 'recharging';
  const { id, from, to } = sector;
  const spec = D.sectors[id], r = radius + D.guardRadius;
  const end = from + (to - from) * clamp(fraction, 0, 1);
  const color = VITAL_MATERIALS[id].ink;
  c.save(); c.translate(x, y); c.lineCap = 'butt';
  arc(c, r, from, to, 7, '#10151b'); arc(c, r, from, to, 4.5, '#41464b');
  const alpha = c.globalAlpha;
  c.globalAlpha *= broken ? .6 : .68 + .32 * clamp(emphasis, 0, 1);
  const step = (to - from) / spec.divisions;
  for (let i = 0; i < spec.divisions; i++) {
    const start = from + i * step, stop = start + step;
    const gap = i + 1 === spec.divisions ? 0 : .029;
    arc(c, r, start, Math.min(stop - gap, end), spec.width, color);
  }
  if (spec.tip && end > from) {
    const px = r * Math.cos(end), py = r * Math.sin(end);
    c.beginPath(); c.arc(px, py, 1.8, 0, TAU); c.fillStyle = color; c.fill();
  }
  if (recharging || fraction > 1) {
    arc(c, r + 3.3, from, recharging ? to : from + (to - from) * clamp(fraction - 1, 0, 1), 1.5, color);
  }
  c.globalAlpha = alpha;
  const gx = r * sector.capX, gy = r * sector.capY;
  circle(c, gx, gy, D.capRadius + .8); c.fillStyle = '#121c23'; c.fill();
  emblem(c, id, gx, gy, .65, broken ? '#ad977e' : color);
  if (broken) {
    // A split in the rail stays visible even when a broken guard has no lit plates.
    const angle = (from + to) / 2;
    c.save(); c.rotate(angle); c.beginPath();
    c.moveTo(r - 3, -3); c.lineTo(r + .6, -.6); c.lineTo(r - .6, .6); c.lineTo(r + 3, 3);
    c.strokeStyle = '#241b17'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#e8b071'; c.lineWidth = 1; c.stroke(); c.restore();
    c.strokeStyle = '#ffe0af'; c.lineWidth = 1.35; c.beginPath();
    c.moveTo(gx + 1, gy - 5); c.lineTo(gx - 1, gy - 1); c.lineTo(gx + 1, gy); c.lineTo(gx - 2, gy + 5); c.stroke();
  }
  c.restore();
}
