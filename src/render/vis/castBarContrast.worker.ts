import type { CastContrastRequest, CastContrastReply } from './castBarContrast';

let canvas: OffscreenCanvas | undefined;
let ctx: OffscreenCanvasRenderingContext2D | null | undefined;
self.onmessage = (event: MessageEvent<CastContrastRequest>) => {
  const sample = event.data;
  try {
    if (!canvas) { canvas = new OffscreenCanvas(sample.width,sample.height); ctx = canvas.getContext('2d',{willReadFrequently:true}); }
    if (!ctx) throw Error('Scene sampling unavailable');
    if (canvas.width !== sample.width) canvas.width = sample.width;
    if (canvas.height !== sample.height) canvas.height = sample.height;
    ctx.fillStyle = '#000000'; ctx.fillRect(0,0,sample.width,sample.height);
    ctx.drawImage(sample.world,0,0,sample.width,sample.height);
    if (sample.crest) ctx.drawImage(sample.crest,0,0,sample.width,sample.height);
    const pixels = ctx.getImageData(0,0,sample.width,sample.height).data;
    self.postMessage({id:sample.id,width:sample.width,height:sample.height,pixels} satisfies CastContrastReply,{transfer:[pixels.buffer]});
  } catch {
    self.postMessage({id:sample.id,width:sample.width,height:sample.height,error:true} satisfies CastContrastReply);
  } finally { sample.world.close(); sample.crest?.close(); }
};
