// Actual Chromium pixels before/after a floor-canvas lifetime change.
// Usage: electron balance/mass-painter-pixels-ui.cjs <base-ref> [report-tag]
// A tiny real terrain course exercises the painter; this is not a gameplay or Firefox memory claim.
const { app, BrowserWindow } = require('electron');
const { build } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const repo = process.cwd(), base = process.argv[2], tag = process.argv[3] || 'mass-painter-pixels';
if (!base || !/^[A-Za-z0-9][\w./-]*$/.test(base)) throw Error('Provide the exact baseline Git ref');
if (!/^[\w-]+$/.test(tag)) throw Error('Report tag must be a simple filename');
const reports = path.join(repo, 'balance/reports'), output = path.join(reports, tag);
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'electron-' + process.pid));
app.disableHardwareAcceleration();
// Keep the process alive between the two independently created browser windows.
app.on('window-all-closed', () => {});
const paintFile = path.join(repo, 'src/worldmass/paint.ts');
const before = cp.execFileSync('git', ['show', base + ':src/worldmass/paint.ts'], { cwd: repo, encoding: 'utf8' });
const after = fs.readFileSync(paintFile, 'utf8');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(sha(before.replace(/\r\n?/g,'\n')), '27f48d99deecaccff1f934614e60efe2f85f671bb829c902bfb6761cf37ff591',
  'pixel oracle requires the exact accepted predecessor painter');
const fixture = String.raw`
import { MassPainter } from './src/worldmass/paint';
import { Renderer } from './src/render/renderer';
import { trimVisCaches, visCacheStats } from './src/render/vis/caches';
import { MassGenerator, makeMassRun } from './src/worldmass/generator';
import { MassState } from './src/worldmass/state';
import { MassStream } from './src/worldmass/stream';
import { MassWalk } from './src/worldmass/walk';
import { address, neighborCell } from './src/worldmass/address';
import { canonical } from './src/worldmass/random';
import type { MassSpec } from './src/worldmass/contracts';
import type { WorldMassRuntime } from './src/worldmass/runtime';
export function runCourse(expectRelease: boolean) {
  const originalCreate = document.createElement.bind(document), allocated: HTMLCanvasElement[] = [];
  const originalDraw=CanvasRenderingContext2D.prototype.drawImage;
  const releases=new Map<HTMLCanvasElement,number>();
  const nativeWidth=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width')!;
  const nativeHeight=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'height')!;
  let peakLive=0;
  const observe=()=>{
    const n=allocated.filter(c=>c.width>0&&c.height>0).length;peakLive=Math.max(peakLive,n);
    if(expectRelease&&n>8)throw Error('One-page course exceeds 4 pages + 2 pending + settlement + scratch');
  };
  CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,source:CanvasImageSource,...args:number[]){
    if(source instanceof HTMLCanvasElement&&(!source.width||!source.height))throw Error('Attempt to draw released canvas');
    return Reflect.apply(originalDraw,this,[source,...args]);
  } as CanvasRenderingContext2D['drawImage'];
  // Hold references deliberately: dimensions prove explicit release independently of GC.
  document.createElement = ((name: string, options?: ElementCreationOptions) => {
    const element = originalCreate(name, options);
    if (name === 'canvas') {
      const canvas=element as HTMLCanvasElement;allocated.push(canvas);releases.set(canvas,0);
      Object.defineProperties(canvas,{
        width:{configurable:true,get:()=>nativeWidth.get!.call(canvas),set:(v:number)=>{nativeWidth.set!.call(canvas,v);observe();}},
        height:{configurable:true,get:()=>nativeHeight.get!.call(canvas),set:(v:number)=>{
          nativeHeight.set!.call(canvas,v);
          if(v===0&&canvas.width===0){const n=releases.get(canvas)!+1;releases.set(canvas,n);if(expectRelease&&n!==1)throw Error('Canvas released more than once');}
          observe();
        }},
      });
      observe();
    }
    return element;
  }) as typeof document.createElement;
  const target = originalCreate('canvas') as HTMLCanvasElement;
  target.width = target.height = 240;
  const ctx = target.getContext('2d')!;
  const spec: MassSpec = {id:'qa:floor-pixel-lifetime',version:1,addressSpan:240,terrainCell:30,
    fields:[{id:'elevation',base:.5,layers:[]}],
    surfaces:[{id:'land',priority:0,when:[],region:'ground',color:'#557744',biome:'field'}],places:[]};
  const origin=address('surface','-9007199254740994','9007199254740993',0,0,240);
  const generator=new MassGenerator(makeMassRun(42,'floor-pixel-lifetime',spec),spec);
  const state=new MassState(generator.run,30),stream=new MassStream(generator,state,{maxPages:4,maxSamples:4096});
  const mass={state,stream,generator,origin,walk:new MassWalk(stream,origin),config:{terrain:spec}} as unknown as WorldMassRuntime;
  const request=(cx:number,cy:number)=>{
    stream.request([neighborCell(origin,cx,cy),neighborCell(origin,cx+1,cy),
      neighborCell(origin,cx,cy+1),neighborCell(origin,cx+1,cy+1)]);stream.step(4096);
  };
  const materials=[['water','#365d68'],['wall','#777568'],['hedgewall','#465b36'],['drystone','#777260'],['mud','#554433']];
  for(let i=0;i<materials.length;i++) state.paint({address:{...origin,x:30*i,y:90},
    region:materials[i][0],color:materials[i][1],cause:'qa/pixel-materials'});
  request(0,0);
  const painter = new MassPainter({enabled:true,stepsPerDraw:1,halo:1,maxPending:2});
  const pictures:{name:string;png:string}[]=[];
  const capture=(name:string)=>pictures.push({name,png:target.toDataURL()});
  const draw=(cx=0,cy=0)=>{
    ctx.setTransform(1,0,0,1,-cx*240,-cy*240);ctx.clearRect(cx*240,cy*240,240,240);
    painter.draw(ctx,mass,cx*240,cy*240,239,239);
  };
  try {
    const pristine=canonical(state.snapshot());
    draw();const firstVisibleFloor=allocated.find(c=>c.width===240&&c.height===240);
    if(!firstVisibleFloor)throw Error('No complete visible floor allocated');
    capture('cold-materials');
    for(let i=0;i<180;i++)draw();
    capture('prepared-identical');
    draw(1,0);capture('prepared-crossing');
    for(const [cx,cy] of [[2,0],[3,1],[-4,-2],[0,0]]) {
      request(cx,cy);draw(cx,cy);capture('roam-'+cx+'-'+cy);
    }
    if(canonical(state.snapshot())!==pristine)throw Error('Painting changed persistent terrain');
    request(0,0);draw();draw(); // An actual preparation job is now suspended.
    state.paint({address:{...origin,x:210,y:60},region:'drystone',color:'#887755',cause:'qa/pixel-edit'});
    draw();capture('edited-pending');
    const edited=state.snapshot();
    state.restore(edited);const restored=canonical(state.snapshot());
    if(restored!==canonical({...edited,revision:edited.revision+1}))throw Error('Native restore did not preserve terrain and advance its revision');
    stream.step(4096);draw();capture('restored');
    painter.drawWater(ctx,mass,0,0,239,239,3.25);capture('water-motion');
    // A new runtime wrapper invalidates all renderer-owned floor resources.
    painter.draw(ctx,{...mass} as WorldMassRuntime,0,0,239,239);capture('runtime-replacement');
    const town={...mass,settlement:{zone:{size:{w:240,h:240}},spec:{blend:24}}} as unknown as WorldMassRuntime;
    painter.drawSettlement(ctx,town,0,0,239,239,g=>{g.fillStyle='#997755';g.fillRect(0,0,240,240);});
    capture('settlement');
    if(canonical(state.snapshot())!==restored)throw Error('Restored painting changed terrain');
    const releasedVisibleFloorBeforeDispose=firstVisibleFloor.width===0&&firstVisibleFloor.height===0;
    if(expectRelease&&!releasedVisibleFloorBeforeDispose)throw Error('Course must release a previously visible floor before final disposal');
    const pixelsBeforeDispose=allocated.reduce((n,c)=>n+c.width*c.height,0);
    const release=(painter as MassPainter & {dispose?:()=>void}).dispose;
    release?.call(painter);release?.call(painter);
    const pixelsAfterDispose=allocated.reduce((n,c)=>n+c.width*c.height,0);
    if(expectRelease&&[...releases.values()].some(n=>n!==1))throw Error('An allocated buffer was not released exactly once');
    let cacheSteward=false;
    if(expectRelease){
      // Exercise the actual Renderer registration, not a second test-only registration.
      document.createElement=originalCreate;
      const renderer=new Renderer(target),owned=Reflect.get(renderer,'massPainter') as MassPainter;
      owned.draw(ctx,mass,0,0,239,239);
      const row=visCacheStats().find(r=>r.id==='massPainter');
      if(!row||row.n<=0||!row.mb)throw Error('Renderer does not report its owned floor pixels');
      trimVisCaches('zone');
      if(owned.pixelStats().count||owned.pixelStats().bytes)throw Error('Zone trim retained floor pixels');
      owned.draw(ctx,mass,0,0,239,239);trimVisCaches('run');
      if(owned.pixelStats().count||owned.pixelStats().bytes)throw Error('Run trim retained floor pixels');
      cacheSteward=true;
    }
    return {pictures,canvases:allocated.length,pixelsBeforeDispose,pixelsAfterDispose,peakLive,releasedVisibleFloorBeforeDispose,
      releasedExactlyOnce:expectRelease,cacheSteward,hasDispose:typeof release==='function',state:canonical(state.snapshot())};
  } finally {
    document.createElement=originalCreate;CanvasRenderingContext2D.prototype.drawImage=originalDraw;
    target.width=target.height=0;
  }
}
`;
async function bundle(source) {
  let injected = 0;
  const key = file => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
  const result = await build({ stdin: { contents: fixture, loader: 'ts', resolveDir: repo },
    absWorkingDir: repo, bundle: true, platform: 'browser', format: 'iife', globalName: 'FloorPixels',
    write: false, logLevel: 'silent',
    plugins: [{name:'exact-painter-source',setup(builder) {
      builder.onLoad({filter:/[\\/]src[\\/]worldmass[\\/]paint\.ts$/}, args => {
        if (key(args.path) !== key(paintFile)) return undefined;
        injected++;
        return {contents:source,loader:'ts',resolveDir:path.dirname(paintFile)};
      });
    }}] });
  assert.equal(injected,1,'each arm must compile exactly its selected painter source');
  return result.outputFiles[0].text;
}
app.whenReady().then(async () => {
  let win;
  const timer=setTimeout(()=>app.exit(1),180000);
  try {
    const run=async (source,expectRelease)=>{
      win=new BrowserWindow({show:false,width:400,height:400,webPreferences:{offscreen:true,backgroundThrottling:false}});
      await win.loadURL('data:text/html,<html><body>Floor pixel verification</body></html>');
      const js=await bundle(source);
      const value=await win.webContents.executeJavaScript('(()=>{try{\n'+js+'\nreturn FloorPixels.runCourse('+expectRelease+');}catch(error){return {failure:String(error.stack||error)}}})()');
      if(value.failure)throw Error(value.failure);
      win.destroy();win=undefined;return value;
    };
    const prior=await run(before,false),current=await run(after,true);
    assert.equal(prior.pictures.length,12,'all predecessor visual courses ran');
    assert.equal(current.pictures.length,12,'all current visual courses ran');
    assert.equal(current.hasDispose,true,'current painter exposes explicit disposal');
    assert.equal(current.cacheSteward,true,'actual Renderer owns its registered cache');
    assert.equal(current.pixelsAfterDispose,0,'every owned pixel buffer is released');
    assert.deepEqual(current.pictures,prior.pictures,'all rendered pixels equal the exact predecessor');
    assert.equal(current.state,prior.state,'same persistent terrain');
    assert(current.pixelsBeforeDispose < prior.pixelsBeforeDispose,'discarded buffers are explicitly released before disposal');
    for(const picture of current.pictures)
      fs.writeFileSync(path.join(output,picture.name+'.png'),Buffer.from(picture.png.split(',')[1],'base64'));
    const strip=value=>({...value,pictures:value.pictures.map(p=>({name:p.name,sha256:sha(p.png)})),state:sha(value.state)});
    fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify({base,beforeSha256:sha(before),afterSha256:sha(after),
      browser:process.versions,prior:strip(prior),current:strip(current)},null,2)+'\n');
    console.log('PASS actual Chromium floor pixels identical across cold/prepared/crossing/roaming/edit/restore/water/runtime/settlement courses; explicit disposal leaves zero owned pixels');
  } catch(error) {console.error(error.stack||String(error));process.exitCode=1;}
  finally {clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();app.exit(process.exitCode||0);}
});
