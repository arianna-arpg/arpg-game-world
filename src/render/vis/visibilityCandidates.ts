/** Conservative angular broad phase for one eye. Bins only select candidates;
 * the existing exact shape, reach, elevation and owner tests decide visibility.
 * A silhouette enters every bin it touches, including the wrap at ±π. */
export class VisibilityCandidates<T> {
  private readonly bins: T[][] = Array.from({length:128},()=>[]);
  clear(): void { for (const bin of this.bins) bin.length=0; }
  add(dx:number, dy:number, radius:number, value:T): void {
    const d=Math.hypot(dx,dy), n=this.bins.length, step=Math.PI*2/n;
    if (d<=radius) { for(const bin of this.bins)bin.push(value);return; }
    const angle=Math.atan2(dy,dx)+Math.PI, half=Math.asin(Math.min(1,radius/d));
    const first=Math.floor((angle-half-1e-10)/step), last=Math.floor((angle+half+1e-10)/step);
    for(let i=first;i<=last;i++)this.bins[((i%n)+n)%n].push(value);
  }
  at(dx:number,dy:number): readonly T[] {
    const i=Math.floor((Math.atan2(dy,dx)+Math.PI)/(Math.PI*2)*this.bins.length);
    return this.bins[i%this.bins.length];
  }
}
