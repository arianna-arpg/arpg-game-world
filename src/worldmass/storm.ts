import { skyOf, type ZoneDef } from '../data/zones';
import { WEATHER_DEFS, type WeatherFront, type WeatherStrike } from '../world/weather';
import { address, floorDiv, latticeAt, moveAddress, type MassAddress } from './address';
import { canonical, massRandom } from './random';
export interface MassStormHost {
  contextAt(at: MassAddress): Readonly<ZoneDef> | undefined;
  weatherAt(at: MassAddress, context: Readonly<ZoneDef>): WeatherFront | null;
  /** Native owner gates loaded ground, roof, settlement, walkability and hazards. */
  fire(strike: WeatherStrike, at: MassAddress): boolean;
}
interface StormRow { owner: string; center: MassAddress; remaining: number; attempt: number; updatedAt: number }
export interface MassStormSave { schema: 1; seed: number; addressSpan: number; zoneSpan: number; clock: number; rows: StormRow[] }
const copy=<T>(v:T):T=>JSON.parse(canonical(v)) as T;
/** One native strike cadence per resident geographic zone. A body's query never
 * creates another timer; dormant zones freeze and emit no physical hazards. */
export class MassStorm {
  private clock=0;
  private rows=new Map<string,StormRow>();
  constructor(readonly seed:number,readonly addressSpan:number,readonly zoneSpan:number,saved?:MassStormSave){
    if(!Number.isSafeInteger(seed)||![addressSpan,zoneSpan].every(n=>Number.isSafeInteger(n)&&n>0)||zoneSpan>1e6)
      throw Error('Invalid geographic storm policy');
    if(saved){
      if(saved.schema!==1||saved.seed!==seed||saved.addressSpan!==addressSpan||saved.zoneSpan!==zoneSpan
        ||!Number.isFinite(saved.clock)||saved.clock<0||!Array.isArray(saved.rows))throw Error('Incompatible geographic storm checkpoint');
      for(const row of saved.rows){const owner=this.owner(row.center);
        if(row.owner!==owner.id||canonical(row.center)!==canonical(owner.center)||this.rows.has(row.owner)
          ||!Number.isFinite(row.remaining)||row.remaining<0||!Number.isSafeInteger(row.attempt)||row.attempt<0
          ||!Number.isFinite(row.updatedAt)||row.updatedAt<0||row.updatedAt>saved.clock)throw Error('Invalid geographic storm owner');
        this.rows.set(row.owner,copy(row));}
      this.clock=saved.clock;
    }
  }
  private owner(at:MassAddress):{id:string;center:MassAddress}{
    const grid=latticeAt(at,this.addressSpan,this.zoneSpan),p=BigInt(this.zoneSpan),s=BigInt(this.addressSpan);
    const x=grid.gx*p+p/2n,y=grid.gy*p+p/2n,cx=floorDiv(x,s),cy=floorDiv(y,s);
    return {id:JSON.stringify([at.dimension,grid.gx.toString(),grid.gy.toString()]),
      center:address(at.dimension,cx.toString(),cy.toString(),Number(x-cx*s),Number(y-cy*s),this.addressSpan)};
  }
  private stormAt(at:MassAddress,host:MassStormHost):{front:WeatherFront;strike:WeatherStrike}|null{
    const context=host.contextAt(at);if(!context||context.objective.kind==='safe'||skyOf(context)==='sheltered')return null;
    const front=host.weatherAt(at,context),strike=front?WEATHER_DEFS[front.kind]?.strike:undefined;
    return front&&strike?{front,strike}:null;
  }
  update(dt:number,clock:number,residents:readonly MassAddress[],host:MassStormHost):void{
    if(!Number.isFinite(dt)||dt<0||!Number.isFinite(clock)||clock<this.clock)throw Error('Invalid geographic storm clock');
    const zones=new Map<string,{center:MassAddress;anchors:Map<string,MassAddress>}>();
    for(const at of residents){const owner=this.owner(at);let zone=zones.get(owner.id);
      if(!zone){zone={center:owner.center,anchors:new Map([[canonical(owner.center),owner.center]])};zones.set(owner.id,zone);}
      zone.anchors.set(canonical(at),at);}
    if(zones.size>128)throw Error('Geographic storm residency exceeds bounded native update budget');
    this.clock=clock;
    for(const [id,zone]of [...zones].sort(([a],[b])=>a.localeCompare(b))){
      const previous=this.rows.get(id);if(previous?.updatedAt===clock)continue;
      let source:ReturnType<MassStorm['stormAt']>=null;
      for(const [,at]of [...zone.anchors].sort(([a],[b])=>a.localeCompare(b))){const sky=this.stormAt(at,host);
        if(sky&&(!source||sky.front.intensity>source.front.intensity))source=sky;}
      const row:StormRow=previous??{owner:id,center:zone.center,remaining:0,attempt:0,updatedAt:clock};
      row.updatedAt=clock;
      if(!source){row.remaining=0;if(previous)this.rows.set(id,row);continue;}
      this.rows.set(id,row);
      const rate=source.strike.ratePerSec*source.front.intensity;if(rate<=.02)continue;
      row.remaining-=dt;if(row.remaining>0)continue;
      row.remaining=1/rate;
      if(row.attempt>=Number.MAX_SAFE_INTEGER)throw Error('Geographic storm attempt counter exhausted');
      const rng=massRandom(this.seed,[id,'native-storm-seat',row.attempt++]);
      const half=Math.floor(this.zoneSpan/2),at=moveAddress(zone.center,{x:rng.range(-half,this.zoneSpan-half),y:rng.range(-half,this.zoneSpan-half)},this.addressSpan);
      // Re-sample the seat, just like World's geographic fireLightning gate.
      // A neighboring front never licenses this zone's clear or roofed ground.
      const local=this.stormAt(at,host);if(!local||local.front.intensity<=.02)continue;
      host.fire(local.strike,at);
    }
  }
  snapshot():MassStormSave{return {schema:1,seed:this.seed,addressSpan:this.addressSpan,zoneSpan:this.zoneSpan,clock:this.clock,
    rows:[...this.rows.values()].sort((a,b)=>a.owner.localeCompare(b.owner)).map(copy)};}
}
