/** The number gives the exact balance; the circumference gives the proportion at a glance. */
export function drawCountSeal(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,count:number,color:string,cap?:number) {
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#0a1016';ctx.fill();
  ctx.lineWidth=1.4;ctx.strokeStyle=cap === undefined ? color : '#586064';ctx.stroke();
  if (cap !== undefined && count>0) {
    ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,count/Math.max(1,cap)));
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  }
  ctx.font='bold '+Math.round(r*1.55)+'px Verdana';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.fillText(String(count),x,y+.5,2*r-1);ctx.restore();
}
