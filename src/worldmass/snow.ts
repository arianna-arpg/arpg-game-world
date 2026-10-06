import type { ZoneDef } from '../data/zones';
import type { WeatherFront } from '../world/weather';
import { SNOW_CFG } from '../engine/snowCover';
import { address, floorDiv, latticeAt, type MassAddress } from './address';
import { canonical, freezeData } from './random';

export interface MassSnowPolicy {
  accumulateSec: number; meltSecAtHeat1: number; frozenBaseline: number; meltAbove: number; frozenAt: number;
}
export const MASS_SNOW_DEFAULT: Readonly<MassSnowPolicy> = freezeData({
  accumulateSec: SNOW_CFG.accumulateSec, meltSecAtHeat1: SNOW_CFG.meltSecAtHeat1,
  frozenBaseline: SNOW_CFG.frozenBaseline, meltAbove: .02, frozenAt: .05,
});
interface SnowRow { owner: string; center: MassAddress; cover: number; updatedAt: number }
export interface MassSnowSave {
  schema: 1; addressSpan: number; chunkSpan: number; policy: MassSnowPolicy; clock: number; rows: SnowRow[];
}
const copy = <T>(v: T): T => JSON.parse(canonical(v)) as T;
/** Exact native snow accumulation on retained chunks. Only resident ground
 * advances: dormant ground freezes just like dormant native bodies. The sky
 * continues globally; this is deliberately not offline global snowfall. */
export class MassSnow {
  readonly policy: Readonly<MassSnowPolicy>;
  private rows = new Map<string, SnowRow>();
  private clock = 0;
  constructor(readonly addressSpan: number, readonly chunkSpan: number, policy: MassSnowPolicy,
    private contextAt: (at: MassAddress) => Readonly<ZoneDef> | undefined,
    private weatherAt: (at: MassAddress, context: Readonly<ZoneDef>) => WeatherFront | null,
    saved?: MassSnowSave) {
    if (![addressSpan, chunkSpan].every(n => Number.isSafeInteger(n) && n > 0) || chunkSpan > 1e6
      || ![policy.accumulateSec,policy.meltSecAtHeat1].every(n=>Number.isFinite(n)&&n>0)
      || ![policy.frozenBaseline,policy.meltAbove,policy.frozenAt].every(n=>Number.isFinite(n)&&n>=0&&n<=1))
      throw Error('Invalid geographic snow policy');
    this.policy = freezeData(copy(policy));
    if (saved) {
      if (saved.schema!==1 || saved.addressSpan!==addressSpan || saved.chunkSpan!==chunkSpan || canonical(saved.policy)!==canonical(policy)
        || !Number.isFinite(saved.clock) || saved.clock<0 || !Array.isArray(saved.rows)) throw Error('Incompatible geographic snow checkpoint');
      for (const row of saved.rows) {
        const owner=this.owner(row.center);
        if (row.owner!==owner.id || canonical(row.center)!==canonical(owner.center) || this.rows.has(row.owner)
          || !Number.isFinite(row.cover) || row.cover<0 || row.cover>1 || !Number.isFinite(row.updatedAt)
          || row.updatedAt<0 || row.updatedAt>saved.clock) throw Error('Invalid geographic snow owner');
        this.rows.set(row.owner,copy(row));
      }
      this.clock=saved.clock;
    }
  }
  get count(): number { return this.rows.size; }
  private owner(at: MassAddress): {id:string;center:MassAddress} {
    const grid=latticeAt(at,this.addressSpan,this.chunkSpan),p=BigInt(this.chunkSpan),s=BigInt(this.addressSpan);
    const x=grid.gx*p+p/2n,y=grid.gy*p+p/2n,cx=floorDiv(x,s),cy=floorDiv(y,s);
    return {id:canonical([at.dimension,grid.gx.toString(),grid.gy.toString()]),
      center:address(at.dimension,cx.toString(),cy.toString(),Number(x-cx*s),Number(y-cy*s),this.addressSpan)};
  }
  private baseline(context: Readonly<ZoneDef>|undefined): number {
    return (context?.theme.heat??.5)<=this.policy.frozenAt?this.policy.frozenBaseline:0;
  }
  at(at: MassAddress): number {
    const owner=this.owner(at);return this.rows.get(owner.id)?.cover??this.baseline(this.contextAt(owner.center));
  }
  update(dt: number, clock: number, residents: readonly MassAddress[]): void {
    if (!Number.isFinite(dt)||dt<0||!Number.isFinite(clock)||clock<this.clock) throw Error('Invalid geographic snow clock');
    const owners=new Map(residents.map(at=>{const owner=this.owner(at);return [owner.id,owner] as const;}));
    if (owners.size>128) throw Error('Geographic snow residency exceeds bounded native update budget');
    this.clock=clock;
    for (const owner of owners.values()) {
      const prior=this.rows.get(owner.id);if(prior?.updatedAt===clock)continue;
      const context=this.contextAt(owner.center);if(!context)continue;
      const heat=context.theme.heat??.5,front=this.weatherAt(owner.center,context);
      let cover=prior?.cover??this.baseline(context);
      if(front?.kind==='snow')cover+=dt*front.intensity/this.policy.accumulateSec;
      if(heat>this.policy.meltAbove)cover-=dt*heat/this.policy.meltSecAtHeat1;
      cover=Math.max(this.baseline(context),Math.min(1,cover));
      this.rows.set(owner.id,{owner:owner.id,center:owner.center,cover,updatedAt:clock});
    }
  }
  snapshot(): MassSnowSave {
    return {schema:1,addressSpan:this.addressSpan,chunkSpan:this.chunkSpan,policy:copy(this.policy),clock:this.clock,
      rows:[...this.rows.values()].sort((a,b)=>a.owner.localeCompare(b.owner)).map(copy)};
  }
}
