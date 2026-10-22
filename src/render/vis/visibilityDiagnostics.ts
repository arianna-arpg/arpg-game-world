import type { World } from '../../engine/world';
import { takeMovementRecords } from '../../engine/movementDiagnostics';

/** Opt-in local playtest recorder. Normal play allocates no frame history or
 * readback canvas. The record is presentation data, never a saved character. */
export const visibilityDiagnosticsEnabled = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('lightingDiagnostics') === '1';
type Frame = { at: number; [key: string]: unknown };
const frames: Frame[] = [];
let current: Frame | undefined, previousAt = 0, mounted = false, capturing = false;
let sampler: HTMLCanvasElement | undefined;
let surfaces: { world:HTMLCanvasElement; overlay:HTMLCanvasElement } | undefined;
/** Renderer-owned surfaces avoid mistaking the full-resolution text overlay
 * for the world when adaptive resolution reduces the world buffer. */
export function visibilityCaptureSurfaces(world:HTMLCanvasElement, overlay:HTMLCanvasElement): void {
  if (visibilityDiagnosticsEnabled) surfaces={world,overlay};
}
export function captureVisibilityCanvas(world:HTMLCanvasElement, overlay?:HTMLCanvasElement): HTMLCanvasElement {
  const c=document.createElement('canvas');
  c.width=Math.max(world.width,overlay?.width??0);c.height=Math.max(world.height,overlay?.height??0);
  const ctx=c.getContext('2d')!;ctx.drawImage(world,0,0,c.width,c.height);
  if(overlay && getComputedStyle(overlay).display!=='none')ctx.drawImage(overlay,0,0,c.width,c.height);
  return c;
}
const limit = 300;
export function beginVisibilityFrame(world: World, camera: { x:number; y:number; w:number; h:number }): void {
  if (!visibilityDiagnosticsEnabled) return;
  const now = performance.now();
  current = { at: now, gapMs: previousAt ? now - previousAt : 0, time: world.time,
    zone: world.zone.id, seed:world.zone.seed, eye: { ...world.player.pos }, tier: world.player.tier, camera,
    movement:takeMovementRecords(world), hero:{radius:world.player.radius,velocity:{...world.player.vel},
      push:world.player.push?{vx:world.player.push.vx,vy:world.player.push.vy}:null,
      dash:!!world.player.dash,leap:!!world.player.leap,carom:!!world.player.caromRun},
    actors: world.actors.length, projectiles: world.projectiles.length,
    flashes: world.flashes.length, doodads: world.doodads.length };
  previousAt = now;
  frames.push(current); if (frames.length > limit) frames.shift();
  if (!mounted && document.body) mount();
}
export function visibilityRecord(key: string, value: unknown): void {
  if (visibilityDiagnosticsEnabled && current) current[key] = value;
}
export function visibilityMask(key: string, source: HTMLCanvasElement | null): void {
  if (!visibilityDiagnosticsEnabled || !current || !source) return;
  if (!sampler) { sampler=document.createElement('canvas');sampler.width=32;sampler.height=24; }
  const ctx = sampler.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0,0,32,24);
  ctx.drawImage(source, 0, 0, 32, 24);
  const rgba = ctx.getImageData(0, 0, 32, 24).data, alpha: number[] = [];
  for (let i = 3; i < rgba.length; i += 4) alpha.push(rgba[i]);
  current[key] = alpha;
}
function mount(): void {
  mounted = true;
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'capture-lighting-flicker';
  button.textContent = 'Capture flicker · F8';
  button.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483646;padding:8px 12px;background:#17232c;color:#e8f2f3;border:1px solid #8bafb5;border-radius:6px;font:13px sans-serif';
  document.body.appendChild(button);
  const capture = async () => {
    if (capturing) return;
    capturing = true; button.textContent = 'Capturing…';
    const before = frames.slice(), markedAt = performance.now();
    let screenshot: string | undefined;
    try { if(surfaces)screenshot=captureVisibilityCanvas(surfaces.world,surfaces.overlay).toDataURL('image/png'); } catch { /* the trace remains usable */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const captured=[...before, ...frames.filter(f=>f.at>markedAt)];
    const geometries:unknown[]=[], ids=new Map<unknown,number>();
    const packed=captured.map(({sightGeometry,...frame})=>{
      if(!sightGeometry)return frame;
      let id=ids.get(sightGeometry);if(id===undefined){id=geometries.length;ids.set(sightGeometry,id);geometries.push(sightGeometry);}
      return {...frame,sightGeometryId:id};
    });
    const report = { version: 1, markedAt, recordedAt: new Date().toISOString(),
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      mask: { w:32, h:24 }, frames:packed, geometries, screenshot };
    const json = JSON.stringify(report);
    let saved = false;
    if (['127.0.0.1','localhost'].includes(location.hostname)
      && new URLSearchParams(location.search).has('lightingCaptureSink')) {
      try { saved = (await fetch('/__visibility-diagnostics',{method:'POST',
        headers:{'Content-Type':'application/json'},body:json})).ok; } catch { /* download below */ }
    }
    if (!saved) {
      const a=document.createElement('a'),url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
      a.href=url;a.download='lighting-capture-'+Date.now()+'.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    button.textContent = 'Captured · F8 to capture again'; capturing = false;
  };
  button.addEventListener('pointerdown', e=>e.stopPropagation());
  button.addEventListener('click', e=>{e.stopPropagation();void capture();});
  window.addEventListener('keydown', e=>{
    if(e.code==='F8'){e.preventDefault();e.stopImmediatePropagation();void capture();}
  },true);
}
