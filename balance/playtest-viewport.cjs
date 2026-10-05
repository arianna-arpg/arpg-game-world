// Geometry is part of the input contract: a screenshot's coordinates must still
// name the same viewport when the next ordinary device event is delivered.
const VIEWPORT=Object.freeze({width:1280,height:850});
function makeViewportGuard(win,event=()=>{}) {
 const read=()=>win.webContents.executeJavaScript("({width:innerWidth,height:innerHeight,scale:devicePixelRatio})");
 const fits=v=>v.width===VIEWPORT.width&&v.height===VIEWPORT.height;
 const constrain=()=>{
  win.setContentSize(VIEWPORT.width,VIEWPORT.height);
  const [w,h]=win.getSize();win.setMinimumSize(w,h);win.setMaximumSize(w,h);win.setResizable(false);
 };
 return {
  async beforeInput(){
   const before=await read();
   if(fits(before))return before;
   constrain();
   for(let i=0;i<8;i++){
    await new Promise(r=>setTimeout(r,25));
    const after=await read();
    if(fits(after)){event({viewportRestored:{before,after}});return after;}
   }
   throw Error('Review viewport could not be restored; no input or frames were delivered.');
  },
  async afterAction(){
   const viewport=await read();
   if(!fits(viewport))event({viewportChangedDuringAction:viewport});
   return {...viewport,expected:fits(viewport)};
  },
  constrain,
 };
}
module.exports={VIEWPORT,makeViewportGuard};
