import type { Vec2 } from '../../core/math';
import { type CombatRect } from './combatFocus';
import { VIS_CFG } from './visConfig';

interface BodyEntry {
  key: object;
  posX: number;
  posY: number;
  radius: number;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}
interface Meter { key: object; rect: CombatRect; paint: (() => void)[] }
interface Memory { offsetX: number; offsetY: number; clearSince?: number }

const EMPTY_KEY: object = {};
const STEP_DIRS = [[0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]] as const;

const union = (a: CombatRect, b: CombatRect): CombatRect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Presentation only: a body's native meters move together, away from visible
 * bodies and each other. Hidden bodies never reserve space or push visible
 * meters. The caller retains the native visibility/paint rules. */
export class CombatMeterLayout {
  private bodyIndex = new Map<object, number>();
  private bodyList: BodyEntry[] = [];
  private bodyCount = 0;
  private rows = new Map<object, Meter>();
  private concealed = new Set<object>();
  private memory = new WeakMap<object, Memory>();
  private boundsOut: CombatRect[] = [];
  private boundsPool: CombatRect[] = [];
  private occupiedPool: CombatRect[] = [];
  private time = 0;
  private relocate = false;
  readonly footprints: CombatRect[] = [];

  begin(time: number, relocate: boolean = VIS_CFG.combatFocus.meters.enabled): void {
    if (this.relocate !== relocate) this.memory = new WeakMap();
    this.relocate = relocate;
    this.time = time;
    for (let i = 0; i < this.bodyCount; i++) this.bodyList[i].key = EMPTY_KEY;
    this.bodyCount = 0;
    this.bodyIndex.clear();
    this.rows.clear();
    this.concealed.clear();
    this.footprints.length = 0;
  }

  /** Caller supplies the same cover admission as the body's native labels. */
  conceal(key: object): void { this.concealed.add(key); }

  body(key: object, pos: Vec2, radius: number): void {
    const c = VIS_CFG.combatFocus.meters, r = radius * c.bodyScale + c.bodyPad;
    const rx = pos.x - r, ry = pos.y - r, rw = r * 2, rh = r * 2;
    const existing = this.bodyIndex.get(key);
    if (existing !== undefined) {
      const slot = this.bodyList[existing];
      slot.posX = pos.x; slot.posY = pos.y; slot.radius = radius;
      slot.rx = rx; slot.ry = ry; slot.rw = rw; slot.rh = rh;
      return;
    }
    const idx = this.bodyCount++;
    let slot = this.bodyList[idx];
    if (!slot) {
      slot = { key, posX: pos.x, posY: pos.y, radius, rx, ry, rw, rh };
      this.bodyList[idx] = slot;
    } else {
      slot.key = key;
      slot.posX = pos.x; slot.posY = pos.y; slot.radius = radius;
      slot.rx = rx; slot.ry = ry; slot.rw = rw; slot.rh = rh;
    }
    this.bodyIndex.set(key, idx);
  }

  /** Only admitted visible bodies and their painted readouts may temper light. */
  readabilityBounds(): CombatRect[] {
    let n = 0;
    for (let i = 0; i < this.bodyCount; i++) {
      const b = this.bodyList[i];
      if (this.concealed.has(b.key)) continue;
      let slot = this.boundsPool[n];
      if (!slot) { slot = { x: b.rx, y: b.ry, w: b.rw, h: b.rh }; this.boundsPool[n] = slot; }
      else { slot.x = b.rx; slot.y = b.ry; slot.w = b.rw; slot.h = b.rh; }
      this.boundsOut[n++] = slot;
    }
    for (let i = 0; i < this.footprints.length; i++) {
      const r = this.footprints[i];
      let slot = this.boundsPool[n];
      if (!slot) { slot = { x: r.x, y: r.y, w: r.w, h: r.h }; this.boundsPool[n] = slot; }
      else { slot.x = r.x; slot.y = r.y; slot.w = r.w; slot.h = r.h; }
      this.boundsOut[n++] = slot;
    }
    this.boundsOut.length = n;
    return this.boundsOut;
  }

  add(key: object, rect: CombatRect, paint: () => void): void {
    // Native fog is translucent: drawing a concealed meter beneath it still
    // leaks the owner's presence. Concealment also applies with layout disabled.
    if (this.concealed.has(key)) return;
    const hasBody = this.bodyIndex.has(key);
    // Off-screen/unregistered meters keep their original pass and cannot
    // influence the layout of a visible body.
    if (!this.relocate || !hasBody) {
      if (hasBody) this.footprints.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      paint();
      return;
    }
    const row = this.rows.get(key);
    if (row) { row.rect = union(row.rect, rect); row.paint.push(paint); }
    else this.rows.set(key, { key, rect, paint: [paint] });
  }

  private isClear(rowKey: object, rowRect: CombatRect, body: BodyEntry,
    ox: number, oy: number, occCount: number,
    gap: number, linkGap: number): boolean {
    const rx = rowRect.x + ox, ry = rowRect.y + oy, rw = rowRect.w, rh = rowRect.h;
    const bx = rx - gap, by = ry - gap, bw = rw + gap * 2, bh = rh + gap * 2;
    const bx2 = bx + bw, by2 = by + bh;
    for (let i = 0; i < occCount; i++) {
      const o = this.occupiedPool[i];
      if (bx < o.x + o.w && o.x < bx2 && by < o.y + o.h && o.y < by2) return false;
    }
    const n = this.bodyCount;
    for (let i = 0; i < n; i++) {
      const b = this.bodyList[i];
      if (b.key === rowKey) {
        const sx = b.posX - b.radius, sy = b.posY - b.radius, sw = b.radius * 2;
        if (bx < sx + sw && sx < bx2 && by < sy + sw && sy < by2) return false;
      } else {
        if (bx < b.rx + b.rw && b.rx < bx2 && by < b.ry + b.rh && b.ry < by2) return false;
      }
    }
    if (ox === 0 && oy === 0) return true;
    const endX = rx + rw * 0.5, endY = ry + rh + linkGap;
    const ldx = endX - body.posX, ldy = endY - body.posY;
    const length = Math.hypot(ldx, ldy);
    const minLen = body.radius + linkGap;
    if (length <= minLen) return true;
    const f = minLen / length;
    const startX = body.posX + ldx * f, startY = body.posY + ldy * f;
    const dx = endX - startX, dy = endY - startY, len2 = dx * dx + dy * dy;
    // A leader must not run through a different body: that would falsely
    // attribute this actor's health/cast to the intervening creature.
    for (let i = 0; i < n; i++) {
      const b = this.bodyList[i];
      if (b.key === rowKey) continue;
      let t = ((b.posX - startX) * dx + (b.posY - startY) * dy) / len2;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const px = startX + dx * t - b.posX, py = startY + dy * t - b.posY;
      const rad = b.radius + linkGap;
      if (px * px + py * py < rad * rad) return false;
    }
    return true;
  }

  paint(ctx: CanvasRenderingContext2D): void {
    const c = VIS_CFG.combatFocus.meters;
    const gap = c.gap, linkGap = c.linkGap;
    let occCount = 0;
    for (const row of this.rows.values()) {
      const body = this.bodyList[this.bodyIndex.get(row.key)!];
      const prior = this.memory.get(row.key);
      let ox = prior ? prior.offsetX : 0;
      let oy = prior ? prior.offsetY : 0;
      let clearSince = prior?.clearSince;
      if (!this.relocate) {
        ox = 0; oy = 0; clearSince = undefined;
      } else {
        // Keep a live cluster steady while bodies move. Return it home only
        // after its own anchor has stayed clear for a short simulation interval.
        if (this.isClear(row.key, row.rect, body, 0, 0, occCount, gap, linkGap)) {
          clearSince ??= this.time;
          if (!prior || this.time - clearSince >= c.settleSec) { ox = 0; oy = 0; }
        } else {
          clearSince = undefined;
        }
        if ((ox !== 0 || oy !== 0 || clearSince === undefined)
          && !this.isClear(row.key, row.rect, body, ox, oy, occCount, gap, linkGap)) {
          let found = false;
          for (let ring = 1; ring <= c.rings && !found; ring++) {
            const d = ring * c.step;
            for (let s = 0; s < STEP_DIRS.length; s++) {
              const dir = STEP_DIRS[s];
              const cx = dir[0] * d, cy = dir[1] * d;
              if (this.isClear(row.key, row.rect, body, cx, cy, occCount, gap, linkGap)) {
                ox = cx; oy = cy; found = true; break;
              }
            }
          }
          // Saturated crowds retain every native readout. Never discard a
          // meter, shrink its value or move it arbitrarily far from its body.
          if (!found) { ox = 0; oy = 0; }
        }
      }
      if (prior) { prior.offsetX = ox; prior.offsetY = oy; prior.clearSince = clearSince; }
      else this.memory.set(row.key, { offsetX: ox, offsetY: oy, clearSince });
      const rx = row.rect.x + ox, ry = row.rect.y + oy, rw = row.rect.w, rh = row.rect.h;
      this.footprints.push({ x: rx, y: ry, w: rw, h: rh });
      let occ = this.occupiedPool[occCount];
      if (!occ) { occ = { x: rx - gap, y: ry - gap, w: rw + gap * 2, h: rh + gap * 2 }; this.occupiedPool[occCount] = occ; }
      else { occ.x = rx - gap; occ.y = ry - gap; occ.w = rw + gap * 2; occ.h = rh + gap * 2; }
      occCount++;

      const moved = ox !== 0 || oy !== 0;
      if (this.relocate && moved) {
        ctx.save();
        const endX = rx + rw * 0.5, endY = ry + rh + linkGap;
        const ldx = endX - body.posX, ldy = endY - body.posY;
        const length = Math.hypot(ldx, ldy), minLen = body.radius + linkGap;
        if (length > minLen) {
          const f = minLen / length;
          ctx.beginPath();
          ctx.moveTo(body.posX + ldx * f, body.posY + ldy * f);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = c.linkEdge; ctx.lineWidth = c.linkWidth + 2; ctx.stroke();
          ctx.strokeStyle = c.linkColor; ctx.lineWidth = c.linkWidth; ctx.stroke();
        }
        ctx.translate(ox, oy);
        for (let i = 0; i < row.paint.length; i++) row.paint[i]();
        ctx.restore();
      } else {
        ctx.save();
        if (moved) ctx.translate(ox, oy);
        for (let i = 0; i < row.paint.length; i++) row.paint[i]();
        ctx.restore();
      }
    }
  }
}
