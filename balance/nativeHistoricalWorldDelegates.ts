/** Exact immutable Git2b09d015 delegated/cache members. */
export const originalHistoricalDelegates = [
  {
    "name": "chartFrontier",
    "text": "private chartFrontier(source: ZoneDef, exitDef: ZoneExitDef): ZoneDef { return nativeGraph.nativeGraphChartFrontier(this.nativeSceneGraphHost(),source,exitDef); }"
  },
  {
    "name": "underSpanPass",
    "text": "private underSpanPass(seat: ZoneDef): void { return nativeGraph.nativeGraphUnderSpanPass(this.nativeSceneGraphHost(),seat); }"
  },
  {
    "name": "mintSpanPartner",
    "text": "private mintSpanPartner(\n    seat: ZoneDef, spanId: string, slot: number, rng: Rng,\n    pol: { radius: number; heldKind: string }, sealed: boolean,\n  ): ZoneDef | null { return nativeGraph.nativeGraphMintSpanPartner(this.nativeSceneGraphHost(),seat,spanId,slot,rng,pol,sealed); }"
  },
  {
    "name": "dimensionBiomeDepthFor",
    "text": "private dimensionBiomeDepthFor(dimId: string): (c: { x: number; y: number }) => number { return nativeGraph.nativeGraphDimensionBiomeDepthFor(this.nativeSceneGraphHost(),dimId); }"
  },
  {
    "name": "courseMintFor",
    "text": "private courseMintFor(dimId: string | undefined): ((c: { x: number; y: number }) => CourseMintHints | null) | undefined { return nativeGraph.nativeGraphCourseMintFor(this.nativeSceneGraphHost(),dimId); }"
  },
  {
    "name": "mintHoldfastPocket",
    "text": "private mintHoldfastPocket(source: ZoneDef, exitDef: ZoneExitDef): ZoneDef { return nativeGraph.nativeGraphMintHoldfastPocket(this.nativeSceneGraphHost(),source,exitDef); }"
  },
  {
    "name": "rollPocketForm",
    "text": "private rollPocketForm(\n    source: ZoneDef, exitDef: ZoneExitDef, pocket: PocketSpec | undefined,\n  ): { form: string; bounty?: number; features?: { kind: string; min: number; max?: number }[] } { return nativeGraph.nativeGraphRollPocketForm(this.nativeSceneGraphHost(),source,exitDef,pocket); }"
  },
  {
    "name": "applyPocketSpec",
    "text": "private applyPocketSpec(\n    gen: ZoneDef, form: PocketFormDef,\n    roll: { bounty?: number; features?: { kind: string; min: number; max?: number }[]; cacheRarity?: ItemRarity },\n    pocket: PocketSpec | undefined,\n  ): void { return nativeGraph.nativeGraphApplyPocketSpec(this.nativeSceneGraphHost(),gen,form,roll,pocket); }"
  },
  {
    "name": "mintGroundTaken",
    "text": "private mintGroundTaken(target: MapCoord, source: ZoneDef): boolean { return nativeGraph.nativeGraphMintGroundTaken(this.nativeSceneGraphHost(),target,source); }"
  },
  {
    "name": "fieldFrontierTarget",
    "text": "private fieldFrontierTarget(f: { originX: number; originY: number; nodeW: number; nodeH: number }, side: ZoneExitDef['side'], at: number): { x: number; y: number } { return nativeGraph.nativeGraphFieldFrontierTarget(this.nativeSceneGraphHost(),f,side,at); }"
  },
  {
    "name": "nearestLinkable",
    "text": "private nearestLinkable(target: { x: number; y: number }, source: ZoneDef, side: ZoneExitDef['side']): ZoneDef | null { return nativeGraph.nativeGraphNearestLinkable(this.nativeSceneGraphHost(),target,source,side); }"
  },
  {
    "name": "roadlessGateHub",
    "text": "private roadlessGateHub(z: ZoneDef): boolean { return nativeGraph.nativeGraphRoadlessGateHub(this.nativeSceneGraphHost(),z); }"
  },
  {
    "name": "eagerChartNeighbors",
    "text": "private eagerChartNeighbors(zone: ZoneDef): void { return nativeGraph.nativeGraphEagerChartNeighbors(this.nativeSceneGraphHost(),zone); }"
  },
  {
    "name": "chartNeighborsOf",
    "text": "private chartNeighborsOf(zone: ZoneDef): void { return nativeGraph.nativeGraphChartNeighborsOf(this.nativeSceneGraphHost(),zone); }"
  },
  {
    "name": "chartWithin",
    "text": "private chartWithin(origin: MapCoord, radius: number, dim: string): void { return nativeGraph.nativeGraphChartWithin(this.nativeSceneGraphHost(),origin,radius,dim); }"
  },
  {
    "name": "fieldifyZone",
    "text": "private fieldifyZone(def: ZoneDef, ext: FieldExtent | null): void { return nativeGraph.nativeGraphFieldifyZone(this.nativeSceneGraphHost(),def,ext); }"
  },
  {
    "name": "severFootprintCrossers",
    "text": "private severFootprintCrossers(fieldZone: ZoneDef): void { return nativeGraph.nativeGraphSeverFootprintCrossers(this.nativeSceneGraphHost(),fieldZone); }"
  },
  {
    "name": "mintSoulriverZone",
    "text": "private mintSoulriverZone(source: ZoneDef, inst: CourseInstance): ZoneDef { return nativeGraph.nativeGraphMintSoulriverZone(this.nativeSceneGraphHost(),source,inst); }"
  },
  {
    "name": "soulriverPorts",
    "text": "private soulriverPorts(river: ZoneDef): void { return nativeGraph.nativeGraphSoulriverPorts(this.nativeSceneGraphHost(),river); }"
  },
  {
    "name": "nearestRiverPort",
    "text": "private nearestRiverPort(instKey: string, at: MapCoord): ZoneDef | null { return nativeGraph.nativeGraphNearestRiverPort(this.nativeSceneGraphHost(),instKey,at); }"
  },
  {
    "name": "rollHoldfast",
    "text": "private rollHoldfast(def: ZoneDef): void { return nativeGraph.nativeGraphRollHoldfast(this.nativeSceneGraphHost(),def); }"
  },
  {
    "name": "pullToLand",
    "text": "pullToLand(coord: { x: number; y: number }): { x: number; y: number } { return nativeGraph.nativeGraphPullToLand(this.nativeSceneGraphHost(),coord); }"
  },
  {
    "name": "skyFront",
    "text": "skyFront(pos: Vec2 = this.player.pos): WeatherFront | null { return nativeSkyFront(this.nativeSceneSkyHost(),pos); }"
  },
  {
    "name": "radiance",
    "text": "radiance(): number { return nativeRadiance(this.nativeSceneSkyHost()); }"
  },
  {
    "name": "radianceCondHeld",
    "text": "radianceCondHeld(cond: RadianceCond | undefined): boolean { return nativeRadianceCondHeld(this.nativeSceneSkyHost(),cond); }"
  },
  {
    "name": "nativeSceneGraphView",
    "text": "declare private nativeSceneGraphView?:NativeSceneGraphHost;"
  },
  {
    "name": "nativeSceneGraphHost",
    "text": "private nativeSceneGraphHost():NativeSceneGraphHost {\n    if(this.nativeSceneGraphView)return this.nativeSceneGraphView;\n    const world=this;\n    const host:NativeSceneGraphHost=Object.freeze({\n      get sim(){return world.sim;},\n      get mintVeil(){return world.mintVeil;},set mintVeil(v:World['mintVeil']){world.mintVeil=v;},\n      get zoneMap(){return world.zoneMap;},\n      get biomeFor(){return world.biomeFor;},\n      get continentFor(){return world.continentFor;},\n      get visited(){return world.visited;},\n      get biomeDepthFor(){return world.biomeDepthFor;},\n      get nextGenId(){return world.nextGenId;},set nextGenId(v:World['nextGenId']){world.nextGenId=v;},\n      get levelFor(){return world.levelFor;},\n      get climateFor(){return world.climateFor;},\n      get manifest(){return world.manifest;},\n      get chartNeighborsOf(){const fn=world.chartNeighborsOf;return(...args:Parameters<World['chartNeighborsOf']>)=>fn.apply(world,args);},\n      get chartFrontier(){const fn=world.chartFrontier;return(...args:Parameters<World['chartFrontier']>)=>fn.apply(world,args);},\n      get mintHoldfastPocket(){const fn=world.mintHoldfastPocket;return(...args:Parameters<World['mintHoldfastPocket']>)=>fn.apply(world,args);},\n      get fieldFrontierTarget(){const fn=world.fieldFrontierTarget;return(...args:Parameters<World['fieldFrontierTarget']>)=>fn.apply(world,args);},\n      get ensureSeaPorts(){const fn=world.ensureSeaPorts;return(...args:Parameters<World['ensureSeaPorts']>)=>fn.apply(world,args);},\n      get roadIsWet(){const fn=world.roadIsWet;return(...args:Parameters<World['roadIsWet']>)=>fn.apply(world,args);},\n      get linkBackTo(){const fn=world.linkBackTo;return(...args:Parameters<World['linkBackTo']>)=>fn.apply(world,args);},\n      get mintSoulriverZone(){const fn=world.mintSoulriverZone;return(...args:Parameters<World['mintSoulriverZone']>)=>fn.apply(world,args);},\n      get nearestRiverPort(){const fn=world.nearestRiverPort;return(...args:Parameters<World['nearestRiverPort']>)=>fn.apply(world,args);},\n      get nearestLinkable(){const fn=world.nearestLinkable;return(...args:Parameters<World['nearestLinkable']>)=>fn.apply(world,args);},\n      get roadlessGateHub(){const fn=world.roadlessGateHub;return(...args:Parameters<World['roadlessGateHub']>)=>fn.apply(world,args);},\n      get mintGroundTaken(){const fn=world.mintGroundTaken;return(...args:Parameters<World['mintGroundTaken']>)=>fn.apply(world,args);},\n      get dimensionBiomeFor(){const fn=world.dimensionBiomeFor;return(...args:Parameters<World['dimensionBiomeFor']>)=>fn.apply(world,args);},\n      get dimensionBiomeDepthFor(){const fn=world.dimensionBiomeDepthFor;return(...args:Parameters<World['dimensionBiomeDepthFor']>)=>fn.apply(world,args);},\n      get courseMintFor(){const fn=world.courseMintFor;return(...args:Parameters<World['courseMintFor']>)=>fn.apply(world,args);},\n      get fieldifyZone(){const fn=world.fieldifyZone;return(...args:Parameters<World['fieldifyZone']>)=>fn.apply(world,args);},\n      get simView(){const fn=world.simView;return(...args:Parameters<World['simView']>)=>fn.apply(world,args);},\n      get underSpanPass(){const fn=world.underSpanPass;return(...args:Parameters<World['underSpanPass']>)=>fn.apply(world,args);},\n      get rollPocketForm(){const fn=world.rollPocketForm;return(...args:Parameters<World['rollPocketForm']>)=>fn.apply(world,args);},\n      get pullToLand(){const fn=world.pullToLand;return(...args:Parameters<World['pullToLand']>)=>fn.apply(world,args);},\n      get applyPocketSpec(){const fn=world.applyPocketSpec;return(...args:Parameters<World['applyPocketSpec']>)=>fn.apply(world,args);},\n      get soulriverPorts(){const fn=world.soulriverPorts;return(...args:Parameters<World['soulriverPorts']>)=>fn.apply(world,args);},\n      get severFootprintCrossers(){const fn=world.severFootprintCrossers;return(...args:Parameters<World['severFootprintCrossers']>)=>fn.apply(world,args);},\n      get mintSpanPartner(){const fn=world.mintSpanPartner;return(...args:Parameters<World['mintSpanPartner']>)=>fn.apply(world,args);},\n      get liveCourses(){const fn=world.liveCourses;return(...args:Parameters<World['liveCourses']>)=>fn.apply(world,args);},\n    });\n    Object.defineProperty(this,'nativeSceneGraphView',{value:host,enumerable:false,writable:true,configurable:true});\n    return host;\n  }"
  },
  {
    "name": "nativeSceneSkyView",
    "text": "declare private nativeSceneSkyView?:NativeSceneSkyHost;"
  },
  {
    "name": "nativeSceneSkyHost",
    "text": "private nativeSceneSkyHost():NativeSceneSkyHost {\n    if(this.nativeSceneSkyView)return this.nativeSceneSkyView;\n    const world=this;\n    const host:NativeSceneSkyHost=Object.freeze({\n      get player(){return world.player;},get zone(){return world.zone;},get massRuntime(){return world.massRuntime;},\n      get sim(){return world.sim;},get time(){return world.time;},\n      get localZoneAt(){const fn=world.localZoneAt;return(...args:Parameters<World['localZoneAt']>)=>fn.apply(world,args);},\n      get geyserSurge(){const fn=world.geyserSurge;return(...args:Parameters<World['geyserSurge']>)=>fn.apply(world,args);},\n      get skyFront(){const fn=world.skyFront;return(...args:Parameters<World['skyFront']>)=>fn.apply(world,args);},\n    });\n    Object.defineProperty(this,'nativeSceneSkyView',{value:host,enumerable:false,writable:true,configurable:true});\n    return host;\n  }"
  }
] as const;
