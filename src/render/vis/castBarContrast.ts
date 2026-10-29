import type { CombatRect } from './combatFocus';
import { luminance } from './color';
import { VIS_CFG } from './visConfig';

export interface CastBarOutline { color: string; alpha: number }

/** Contrast of the skill's ink against the scene, not a change to its color. */
export function castBarOutline(ink: string, samples: readonly number[]): CastBarOutline | null {
  const c = VIS_CFG.castReadout.contrast;
  if (!c.enabled) return null;
  if (!samples.length) return { color: c.light, alpha: c.fallbackAlpha };
  const tone = luminance(ink), low = Math.min(...samples), high = Math.max(...samples);
  const ratio = Math.min(...samples.map(v => (Math.max(v,tone)+.05)/(Math.min(v,tone)+.05)));
  const close = Math.max(0, 1-(ratio-1)/(c.ratio-1));
  const busy = Math.max(0, (high-low-c.busyRange)/(1-c.busyRange));
  const alpha = Math.min(1,Math.max(close,busy))*c.maxAlpha;
  if (alpha < .05) return null;
  const mean = samples.reduce((a,b)=>a+b,0)/samples.length;
  return { color: mean > .5 ? c.dark : c.light, alpha };
}

/** One tiny composed-scene readback per interval, shared by every active cast.
 * Never read the native framebuffer once per actor or once per painted pixel. */
export class CastBarContrast {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D | null;
  private pixels?: Uint8ClampedArray;
  private nextAt = 0;
  private width = 0;
  private height = 0;

  capture(world: HTMLCanvasElement, crest: HTMLCanvasElement | undefined, now: number): void {
    const c = VIS_CFG.castReadout.contrast;
    if (!c.enabled) return;
    const width = c.sampleWidth, height = Math.max(1,Math.min(c.maxSampleHeight,Math.round(width*world.height/world.width)));
    if (now < this.nextAt && width === this.width && height === this.height) return;
    this.nextAt = now+c.intervalMs;
    this.width = width; this.height = height;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d',{willReadFrequently:true});
    }
    if (!this.ctx) { this.pixels = undefined; return; }
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.ctx.fillStyle = '#000000'; this.ctx.fillRect(0,0,width,height);
    this.ctx.drawImage(world,0,0,width,height);
    if (crest) this.ctx.drawImage(crest,0,0,width,height);
    try { this.pixels = this.ctx.getImageData(0,0,width,height).data; }
    catch { this.pixels = undefined; } // Unavailable readback uses a quiet contrast fallback.
  }

  /** Normalized screen rectangle, identical for main and native crest pixels. */
  outline(rect: CombatRect, ink: string): CastBarOutline | null {
    if (!this.pixels) return castBarOutline(ink,[]);
    const samples: number[] = [];
    for (const [dx,dy] of [[0,0],[1,0],[.5,.5],[0,1],[1,1]]) {
      const x = Math.floor((rect.x+rect.w*dx)*this.width), y = Math.floor((rect.y+rect.h*dy)*this.height);
      if (x<0 || y<0 || x>=this.width || y>=this.height) continue;
      const i = (y*this.width+x)*4;
      samples.push((.299*this.pixels[i]+.587*this.pixels[i+1]+.114*this.pixels[i+2])/255);
    }
    return castBarOutline(ink,samples);
  }
}
