import type { Actor } from '../engine/actor';
import type { ZoneDef, PackTableEntry } from '../data/zones';
import type { OverlayView } from '../world/overlay';
import { nativeSimView, nativeBaseTable, nativeEffectiveSpawn, nativeWildlifeTableFor, nativeCaveAirFor,
  nativeVerminPressure, type NativePopulationHost, type NativePopulationSources, type NativePopulationSim,
  type NativeResolvedSpawn } from '../engine/nativePopulationResolution';

/** Campaign and installed source services are explicit trusted dependencies.
 * They may retain native live controller state; they must not substitute a
 * standing World's current zone, player or actor census for this area's data. */
export interface NativeAreaPopulationCampaign {
  readonly zoneMap: Readonly<Record<string, ZoneDef>>;
  readonly time: number;
  readonly visited: OverlayView['visited'];
  readonly surveyed: OverlayView['surveyed'];
  readonly sim: NativePopulationSim;
  continentFor: NativePopulationHost['continentFor'];
}
export interface NativeAreaPopulationInput {
  /** Exact verified mint/load zone. In particular, native cave packs retain
   * their source-face reference identity. A detached JSON copy is insufficient. */
  zone: ZoneDef;
  actors: Actor[];
  player: Pick<Actor, 'level'> | undefined;
  campaign: NativeAreaPopulationCampaign;
  sources: NativePopulationSources;
}
function bindingData<T>(input:NativeAreaPopulationInput,key:keyof NativeAreaPopulationInput):T {
  const d=Object.getOwnPropertyDescriptor(input,key);
  if(!d || !Object.hasOwn(d,'value'))throw Error('Native population binding requires own area data: '+key);
  return d.value as T;
}
/** Preparation-only binding. No World import, ambient births, global source
 * installation, campaign updates, source issuer or runtime publication. The
 * original stages remain separate; each method observes the current staged
 * census and the explicit trusted campaign at the moment it is called. */
export class NativeAreaPopulation {
  readonly zone: ZoneDef;
  readonly actors: Actor[];
  readonly player: Pick<Actor, 'level'> | undefined;
  private readonly host: NativePopulationHost;
  private readonly sources: NativePopulationSources;
  constructor(input:NativeAreaPopulationInput) {
    this.zone=bindingData(input,'zone');this.actors=bindingData(input,'actors');this.player=bindingData(input,'player');
    const campaign=bindingData<NativeAreaPopulationCampaign>(input,'campaign');
    this.sources=bindingData(input,'sources');
    if(!this.zone || typeof this.zone.id!=='string' || !this.zone.id || !Array.isArray(this.actors) || !campaign || !this.sources)
      throw Error('Incomplete native area population binding');
    const area=this;
    this.host={
      get zone(){return area.zone;},get actors(){return area.actors;},get player(){return area.player;},
      get zoneMap(){return campaign.zoneMap;},get time(){return campaign.time;},get sim(){return campaign.sim;},
      get visited(){return campaign.visited;},get surveyed(){return campaign.surveyed;},
      continentFor:c=>campaign.continentFor(c),simView:()=>area.view(),
    };
    Object.freeze(this); // Binding identity is fixed; staged arrays and trusted services stay live.
  }
  view():OverlayView {return nativeSimView(this.host);}
  baseTable():PackTableEntry[] {return nativeBaseTable(this.host,this.sources,this.zone);}
  /** The pack stage resolves base before overlays, exactly like native load. */
  packs():NativeResolvedSpawn {return nativeEffectiveSpawn(this.host,this.sources,this.zone,this.baseTable());}
  /** Explicit-base counterpart for native callers that already own that stage. */
  effectiveSpawn(base:PackTableEntry[]):NativeResolvedSpawn {return nativeEffectiveSpawn(this.host,this.sources,this.zone,base);}
  /** Pass this through an arrow callback when binding NativeAmbientHost.
   * A foreign or reconstructed zone must not silently replace the source zone. */
  wildlifeTableFor(def:ZoneDef=this.zone) {
    if(def!==this.zone)throw Error('Foreign zone in native area wildlife stage');
    return nativeWildlifeTableFor(this.sources,def,d=>nativeCaveAirFor(this.sources,d));
  }
  /** Read only when spawnNativeWildlife reaches its original pressure gate. */
  verminPressure():number {return nativeVerminPressure(this.host);}
}
