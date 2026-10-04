import { address, cellKey, type MassAddress } from './address';
import { canonical } from './random';
import type { MassState } from './state';

export interface MassSurveySpec { source: string; cell: number; radius: number }
/** Durable map memory, separate from residency and the renderer's current veil.
 * Native sight admits cell centres; the occupied cell is always known.
 * This is deliberately a coarse survey, not pixel-perfect fog or a second LOS. */
export class MassSurvey {
  private readonly kind: string;
  readonly spec?: Readonly<MassSurveySpec>;
  constructor(readonly state: MassState, spec?: MassSurveySpec) {
    const span=state.run.addressSpan;
    if(spec!==undefined && (!spec || typeof spec.source!=='string' || !spec.source || spec.source.length>256
      || !Number.isSafeInteger(spec.cell) || spec.cell<state.cell || spec.cell>240
      || spec.cell%state.cell || span%spec.cell
      || !Number.isFinite(spec.radius) || spec.radius<spec.cell || spec.radius>960
      || (Math.ceil(spec.radius/spec.cell)*2+1)**2>256))
      throw Error('Invalid worldmass survey');
    this.spec=spec===undefined?undefined:Object.freeze({...spec});
    this.kind=canonical(['survey',spec?.source??'']);
  }
  private key(at: MassAddress): string {
    const p=address(at.dimension,at.cx,at.cy,at.x,at.y,this.state.run.addressSpan),cell=this.spec!.cell;
    return canonical([cellKey(p),Math.floor(p.x/cell),Math.floor(p.y/cell)]);
  }
  known(at: MassAddress): boolean {
    return this.spec ? this.state.claimed(this.kind,this.key(at)) : this.state.claimed('explored',cellKey(at));
  }
  /** Called after native scenery residency, so an unloaded grove cannot leak
   * terrain through its future trunks. At most 256 candidate cells per pass. */
  observe(at: MassAddress, visible: (target: MassAddress) => boolean): number {
    if(!this.spec)return 0;
    const {cell,radius}=this.spec,span=this.state.run.addressSpan,reach=Math.ceil(radius/cell);
    const p=address(at.dimension,at.cx,at.cy,at.x,at.y,span);
    let added=Number(this.state.claim(this.kind,this.key(p)));
    const x0=Math.floor(p.x/cell)*cell+cell/2,y0=Math.floor(p.y/cell)*cell+cell/2;
    for(let y=-reach;y<=reach;y++)for(let x=-reach;x<=reach;x++){
      const tx=x0+x*cell,ty=y0+y*cell;
      if(Math.hypot(tx-p.x,ty-p.y)>radius)continue;
      const target=address(p.dimension,p.cx,p.cy,tx,ty,span);
      if(!this.known(target)&&visible(target))added+=Number(this.state.claim(this.kind,this.key(target)));
    }
    return added;
  }
}
