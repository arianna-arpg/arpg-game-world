/** Complete native bounty site/arrival oracle. The seven direct-lexical original
 * bodies below are pinned from World at e07fc56bc8b153534be893edf616a1633bc0f880,
 * complete source SHA256 f7487ea302b5e704a87991a37fa6d2a33417a24ca89ce0bee545ec0241c5fa76.
 * Both unchanged native layout fixtures and every original body are embedded;
 * this probe requires no Git object or ignored scratch file at runtime. */
import {massBountyCandidates,massBountyLocal,massBountyDestination,MASS_BOUNTY_KINDS} from '../src/worldmass/bounties';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {classById,makeSimWorld} from '../src/sim/arena';import {World,NAV_CFG} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';import {Rng,withSeededRandom} from '../src/core/rng';
import {GridWalkField} from '../src/world/gridWalk';import {captureNativeActorState,massDormancyPins} from '../src/worldmass/dormancy';
import {NativeAreaSceneGeometry} from '../src/worldmass/nativeAreaSceneGeometry';
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import {NativeAreaSceneEnvironment,freshSceneEnvironmentState} from '../src/worldmass/nativeAreaSceneEnvironment';
import {scenePartyScaleCount,applyScenePartyScale} from '../src/engine/nativeScenePopulation';
import {sceneObjectiveServices} from '../src/worldmass/nativeSceneObjectives';
import {freshSceneObjectiveState} from '../src/worldmass/nativeSceneState';
import {hullOf} from '../src/world/shape';import {clearSeaMemo} from '../src/world/seas';
import {MONSTERS} from '../src/data/monsters';import {BOUNTY_KINDS,BOUNTY_SOURCES,type BountyPosting} from '../src/data/bountyboard';
import {buildManifest} from '../src/packages/manifest';
import {HOLD_CLASSES,mintHoldState} from '../src/data/harborholds';

import {NativeAreaSceneBounty,type NativeSceneBountyInput} from '../src/worldmass/nativeAreaSceneBounty';
import type {NativeSceneBountyHost} from '../src/engine/nativeSceneBounty';
import {vec,type Vec2} from '../src/core/math';


import {type ZoneDef} from '../src/data/zones';
import {HARVEST_CFG} from '../src/engine/harvest';
import {harvestRowsFor} from '../src/data/harvest';
import {BOUNTY_CFG} from '../src/data/bounties';
import {type Doodad} from '../src/engine/levelgen';
import {BOUNTY_BOARD_CFG,postingQuestDef} from '../src/data/bountyboard';

import {QUESTS} from '../src/quests/defs';
import type {QuestDef} from '../src/quests/types';
import {type QuestStanding} from '../src/quests/types';

import {mintNemesisName} from '../src/meta/nemesis';
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function originalSeedCullMarks(this:NativeSceneBountyHost, def: ZoneDef, rng: { int(a: number, b: number): number; next(): number }):void {
    for (const p of this.bountyHands) {
      if (p.kind !== 'cull' || p.zoneId !== def.id || !p.cull) continue;
      const standing = this.actors.filter(a => !a.dead && a.tag === 'bounty_mark').length;
      const need = Math.max(0, p.cull.count - p.cull.claimed - standing);
      if (!need) continue;
      const { table } = this.effectiveSpawn(def, this.baseTable(def));
      const eligible = table.filter(en => {
        const md = MONSTERS[en.id];
        return !!md && !md.passive && !md.noObjective && !md.spawner && !md.npcRole;
      });
      for (let i = 0; i < need; i++) {
        let m: Actor | null;
        if (eligible.length) {
          const type = this.weightedPick(eligible, Math.max(1, p.challengeLevel ?? def.level));
          m = this.createMonster(type, Math.max(1, p.challengeLevel ?? def.level), 'enemy');
          m.pos = this.spawnPoint(24);
          this.actors.push(m);
        } else {
          m = this.countedEnemies().find(a =>
            a.tag !== 'bounty_mark' && (a.rarity ?? 'normal') === 'normal') ?? null;
          if (!m) break;
        }
        this.promoteRarityStacked(m, BOUNTY_CFG.rarity, BOUNTY_CFG.stacks);
        const fac = m.faction ?? (m.defId ? MONSTERS[m.defId]?.faction : undefined) ?? '';
        let name = mintNemesisName(fac, () => rng.next());
        for (let tries = 0; tries < 4 && this.actors.some(a => a !== m && a.tag === 'bounty_mark' && a.name === name); tries++) {
          name = mintNemesisName(fac, () => rng.next());
        }
        m.name = name;
        m.tag = 'bounty_mark';
      }
    }
  }
function originalSeedGatherNodes(this:NativeSceneBountyHost, def: ZoneDef, pois: Vec2[]):void {
    for (const p of this.bountyHands) {
      if (p.kind !== 'gather' || p.zoneId !== def.id || !p.gather) continue;
      if (p.gather.claimed >= p.gather.count) continue;
      if (def.objective.kind === 'safe' || def.spoils === 'none') continue;
      const rows = harvestRowsFor(def.biome, def.tileset);
      if (!rows.length) continue; // structurally excluded at the roll; belt and braces
      const live = this.harvestNodes.filter(n => !n.spent).length;
      const need = Math.max(0, p.gather.count - p.gather.claimed - live);
      if (!need) continue;
      const grng = new Rng((this.currentZoneSeed ^ HARVEST_CFG.salt ^ hashStr(p.id)) >>> 0);
      for (let i = 0; i < need; i++) {
        const row = this.harvestRowPick(rows, grng);
        const at = this.interactSpot(pois, grng, 620, HARVEST_CFG.portalClear);
        const pos = this.clampPos(vec(at.x, at.y), HARVEST_CFG.nodeRadius);
        const d: Doodad = {
          pos: vec(pos.x, pos.y), radius: HARVEST_CFG.nodeRadius, kind: row.kind,
        };
        this.doodads.push(d);
        this.harvestNodes.push({ pos: vec(pos.x, pos.y), def: row, doodad: d, spent: false });
      }
      this.markDoodadsChanged();
    }
  }
function originalNoteBountyArrivals(this:NativeSceneBountyHost, def: ZoneDef, firstVisit: boolean, from?: string):void {
    for (const p of this.bountyHands) {
      const row = BOUNTY_KINDS[p.kind];
      if (row?.arrival && !this.clientActionHook) { row.arrival(this, p, def, firstVisit, from); this.charDirty = true; }
      if (p.zoneId !== def.id && !row?.arrival) continue;
      this.noteBountyReady(p);
    }
  }
function originalHandState(this:NativeSceneBountyHost, p: BountyPosting):QuestStanding {
    const row = BOUNTY_KINDS[p.kind];
    if (!row) return 'afield';
    if (p.failed === true || (row.failed?.(this, p) ?? false)) return 'failed';
    return row.done(this, p) ? 'ready' : 'afield';
  }
function originalNoteBountyReady(this:NativeSceneBountyHost, p: BountyPosting):void {
    const aq = this.activeQuests.find(e => e.questId === p.id);
    if (!aq) return;
    const standing = this.handState(p);
    if (standing === 'afield') {
      if (aq.fieldDone) { aq.fieldDone = false; this.charDirty = true; }
      return;
    }
    if (aq.fieldDone) return;
    aq.fieldDone = true;
    this.notice(standing === 'ready'
      ? (this.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')
      : 'The ask has failed — return to the bounty board to hand the posting back.',
    BOUNTY_BOARD_CFG.accent, 16, 'civic');
    this.charDirty = true;
  }
function originalObjectiveDoneAt(this:NativeSceneBountyHost, zoneId: string):boolean {
    return this.completedObjectives.has(zoneId);
  }
function originalQuestDefOf(this:NativeSceneBountyHost, id: string):QuestDef | undefined {
    const q = QUESTS[id];
    if (q) return q;
    const p = this.bountyHands.find(h => h.id === id);
    return p ? postingQuestDef(p, this) : undefined;
  }
const originals={seedCullMarks:originalSeedCullMarks,seedGatherNodes:originalSeedGatherNodes,noteBountyArrivals:originalNoteBountyArrivals,handState:originalHandState,noteBountyReady:originalNoteBountyReady,objectiveDoneAt:originalObjectiveDoneAt,questDefOf:originalQuestDefOf};
const fixtures = JSON.parse(gunzipSync(Buffer.from('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', 'base64')).toString('utf8'));
// Source critic's non-null campaign-provider regression uses an actual generated
// country destination and native discovery. It proves provider use and visit
// readiness; it does not claim positive cache/puzzle/objective completion.
let countryMass:any,countryTarget:any;
withSeededRandom(77331,()=>{const w=makeSimWorld('warrior',42);w.startWorldMass(42);countryMass=w.massRuntime;assert.ok(countryMass);const place=massBountyCandidates(w)[0];assert.ok(place,'real generated country candidate');countryTarget={run:countryMass.generator.run.runId,id:place.id,content:place.content,center:{...place.center}};w.landPartyAt(massBountyLocal(countryMass,place));countryMass.update(w,true);assert.ok(countryMass.sites.discovered.some((s:any)=>s.id===place.id),'actual native discovery');});
function run(f:any,lane:'old'|'world'|'local',mode:string){
    const local=lane==='local';
    clearSeaMemo();
    return withSeededRandom(991, () => {
        let world: any = makeSimWorld('warrior', 991);
        if(mode==='packages'){
          const manifest=buildManifest(world.account,991);for(const p of manifest.packages)p.enabled=['hunt','fractures','worldboss'].includes(p.id);
          world=new World(world.account,Object.freeze(manifest));world.createPlayer(classById('warrior'),{startingCompanions:false});world.loadZone('sim_arena');
        }
        if (lane==='old')
            Object.assign(world, originals);
        world.sim.bindGeographyPolicies();
        const g = structuredClone(f.generated), zone = g.zone, entry = g.entry;
        for (const k of ['exitBoundaries', 'exitRoads', 'exitMelds'])
            if (zone[k])
                zone[k] = zone[k].map((v: any) => v ?? undefined);
        world.zoneMap[zone.id] = zone;
        world.zone = zone;
        world.arena = g.arena;
        world.arenaHull = hullOf(g.arena);
        world.zoneEntry = entry;
        world.player.pos = { ...entry };
        world.player.level = zone.level;
        world.time = 79;
        const layout = g.layout;
        layout.walk = g.grid ? GridWalkField.unpack(g.grid) : undefined;
        const scene = { zone, actors: [world.player] as Actor[], player: world.player };
        let localPopulation: NativeAreaScenePopulation | undefined;
        const geom = new NativeAreaSceneGeometry(scene, g.arena, { ledger: world.ledger, seasSeen: world.seasSeen,
            oceanBearing: (...a: any[]) => world.oceanBearing(...a), seaNameOf: (...a: any[]) => world.seaNameOf(...a),
            notice: (...a: any[]) => world.notice(...a), text: (...a: any[]) => world.text(...a),
            get time() { return world.time; }, get seats() { return world.seats; }, seatOf: (a: Actor) => world.seatOf(a),
            drainSurvival: (...a: any[]) => world.drainSurvival(...a), radianceCondHeld: (...a: any[]) => world.radianceCondHeld(...a),
            createMonster: (...a: Parameters<NativeAreaScenePopulation['createMonster']>) => { if (!localPopulation)
                throw Error('population owner not installed'); return localPopulation.createMonster(...a); } }, { navigationPad: NAV_CFG.pad, eventSpacing: 240, minPortalSeparation: 250 });
        geom.currentZoneSeed = zone.seed;
        geom.exits = g.exits.map((pos:any,i:number)=>({def:zone.exits[i],pos}));
        geom.zoneEntry = entry;
        geom.adopt(layout, entry);
        // Both lanes start at this SAME concrete mutable geometry stage. The baseline
        // remains an actual World; local production code never receives it.
        world.walk = geom.walk;
        world.tierViews = geom.tierViews;
        world.doodads = geom.doodads;
        world.grounds = geom.grounds;
        world.bridges = geom.bridges;
        world.structures = geom.structures;
        world.fog = geom.fog;
        world.doodadsRev++;
        world.convexNav = null;
        world.tierNavs.clear();
        world.currentZoneSeed = geom.currentZoneSeed;
        world.exits = geom.exits;
        world.eventAnchors = [];
        for(const key of ['caveEntrances','demonPortals','crusadePortals','necropolisPortals','fractureRifts','dimGates','breachPos','descentSite','waypointPos','farPointDraws'])world[key]=(geom as any)[key];
        const sources = { ambient: world.nativeAmbientHost(), groups: world.nativeEncounterGroupHost(), factory: world.nativeMonsterFactorySources(),
            promotion: world.nativeMonsterPromotionSources(), hostility: (World as any).nativeHostilitySources(), relay: (World as any).nativeStatusRelaySources() };
        const populationCampaign = { zoneMap: world.zoneMap, get time() { return world.time; }, visited: world.visited, surveyed: world.surveyed, sim: world.sim, continentFor: (...a: any[]) => world.continentFor(...a) };
        const seats = world.seats;
        const context = { get time() { return world.time; }, get npcDialogues() { return world.npcDialogues; },
            applyPartyScale: (a: Actor) => applyScenePartyScale({ partyScaleCount: () => scenePartyScaleCount({ player: scene.player, seats }) }, a), opaqueAt: (x: number, y: number) => geom.opaqueAt(x, y),
            sanctuaryBlocksCombat: () => scene.zone.objective.kind === 'safe', resolveHit() { throw Error('unbound staged resolveHit'); } };
        const state = { squadSequence: 900, bombardMintRev: 100, zoneGenTagging: true, magicPackEffects: [], magicPackResolving: false, magicPackRefreshPending: false };
        const owner = local ? new NativeAreaScenePopulation({ scene, geometry: geom, campaign: populationCampaign, sources,
            populationSources: (World as any).nativePopulationSources(), context, state }) : null;
        localPopulation = owner ?? undefined;
        if (owner) {
            assert.equal(Object.isFrozen(owner.ambient), true);
            assert.equal(Object.getOwnPropertyDescriptor(owner, 'input')?.writable, false);
            context.applyPartyScale = () => { throw Error('replaced callback authority'); };
        }
        world.actors = [world.player];
        world.squadSeq = 900;
        world.bombardMintRev = 100;
        world.zoneGenTagging = true;
        world.magicPackEffects = [];
        world.magicPackResolving = false;
        world.magicPackRefreshPending = false;
        world.wave = 0;
        world.waveActive = false;
        const notices:any[]=[];
        const nativeFactory=local?owner!.createMonster.bind(owner):world.createMonster.bind(world),factoryArgs:any[]=[];
        let factoryN=0;const loggedFactory=(...a:Parameters<NativeAreaScenePopulation['createMonster']>)=>{
          factoryArgs.push([...a]);const actor=nativeFactory(...a);if(mode==='factory-fail'&&++factoryN===2)throw Error('allocated bounty factory failure');return actor;
        };if(local)owner!.createMonster=loggedFactory;else world.createMonster=loggedFactory;
        const objectiveContext:any={get zoneEntry(){return geom.zoneEntry;},get sim(){return world.sim;},get walk(){return geom.walk;},get structures(){return geom.structures;},
          get arena(){return geom.arena;},get time(){return world.time;},notice:(...a:any[])=>notices.push(a),text:(...a:any[])=>world.text(...a)};
        for(const key of ['pathField','farPoint','pointInSolid','farthestStand'])Object.defineProperty(objectiveContext,key,{get(){const fn=(geom as any)[key];return (...a:any[])=>fn.apply(geom,a);}});
        const objective=freshSceneObjectiveState(zone.id,new Set<string>());
        const objectives=owner?sceneObjectiveServices(owner,objective,objectiveContext):world;
        const environment=new NativeAreaSceneEnvironment({scene,geometry:geom,population:owner??world,state:freshSceneEnvironmentState(),
          sources:(World as any).nativeSceneEnvironmentSources,services:{get time(){return world.time;},get objectiveDone(){return objective.objectiveDone;},
            timeflow:world.timeflow,completePuzzle(){throw Error('puzzle controller outside bounty course');}}});
        const pois=structuredClone(layout.pois??[]);
        environment.bootHarvest(zone,pois); // actual preceding native stage, shared full geometry
        world.harvestNodes=environment.input.state.harvestNodes;
        if(mode==='packages'){
          const view=world.devOverlayView();assert.equal(world.sim.huntField.devIgnite(view,zone.id),true);assert.equal(world.sim.fractureField.devIgnite(view,zone.id),true);
          assert.equal(world.sim.worldBossFieldsAll().some((f:any)=>f.devManifest(view,zone.id)),true);
          zone.harborhold=mintHoldState(Object.values(HOLD_CLASSES)[0]);zone.veiled=false;
        }
        const postings:BountyPosting[]=[];
        const post=(kind:string,id=kind,extra:any={}):BountyPosting=>({id:'probe_'+id,kind,boardId:'lastlight',zoneId:zone.id,beat:0,pay:{},...extra});
        if(mode!=='natural'){
          postings.push(post('cull','cull',{challengeLevel:zone.level+3,cull:{count:5,claimed:1}}),post('gather','gather',{gather:{count:5,claimed:1}}),
            post('errand'),post('charge'),post('survey','survey',{zoneId:'elsewhere',survey:{count:1,zones:[],minLevel:1}}),
            post('trail','trail',{zoneId:'elsewhere',trail:{path:['from',zone.id],crossed:0,peak:zone.level}}),post('puzzle'),post('expedition'),
            post('answer','answer',{answer:{source:'worldboss',key:'wb:absent',name:'native decree',ask:'existing source',ledger:'review_bounty_done',base:0}}),
            post('summons','summons',{acceptAt:1,answer:{source:'fractures',key:'fracture:absent',name:'native fracture',ask:'existing source',ledger:'review_bounty_done',base:0}}));
        }
        if((mode==='registry'||mode==='packages')){
          for(const source of Object.keys(BOUNTY_SOURCES))for(const kind of ['answer','summons'])postings.push(post(kind,kind+'_'+source,{acceptAt:1,answer:{source,key:'missing:'+source,name:source,ask:'native census',base:0,ledger:'review_bounty_done'}}));
          for(const kind of Object.keys(BOUNTY_KINDS).filter(k=>k.startsWith('country_')))postings.push(post(kind));
          postings.push(post('uninstalled'),post('cull','failed',{failed:true,cull:{count:0,claimed:0}}));
        }
        if(mode==='country'){world.massRuntime=countryMass;for(const kind of MASS_BOUNTY_KINDS)postings.push(post(kind,kind,{massBounty:structuredClone(countryTarget)}));}
        const campaign:any={bountyHands:postings,activeQuests:postings.map(p=>({questId:p.id,fieldDone:false})),charDirty:false,clientActionHook:undefined,
          massRuntime:world.massRuntime,zoneMap:world.zoneMap,visited:new Set([zone.id]),ledger:{...world.ledger,review_bounty_done:1},sim:world.sim,completedObjectives:new Set([zone.id]),
          notice(...a:any[]){notices.push(a);if(mode==='notice-fail')throw Error('bounty notice failure');}};
        if(mode==='safe')zone.objective={kind:'safe'};
        if(mode==='spoils-none')zone.spoils='none';
        if(mode==='client')campaign.clientActionHook=()=>{throw Error('client arrival hook must not execute');};
        if(mode==='notice-fail'){postings[0].cull!.claimed=5;postings[1].gather!.claimed=5;}
        if(mode==='fallback'){zone.cohort='authored';zone.packs={...(zone.packs??{}),table:[{id:Object.keys(MONSTERS).find(id=>MONSTERS[id].passive)!,weight:1}]};}
        if(!local)for(const [key,value]of Object.entries(campaign))world[key]=value;
        const bounty=owner?new NativeAreaSceneBounty({scene,geometry:geom,population:owner,environment,campaign,objectives}):null,target:any=bounty??world;
        if(local&&mode==='registry')assert.equal(bindingControls(bounty!),30);
        const actions:any[]=[],draws:any[]=[],sourceReads:any[]=[];const originalNext=Rng.prototype.next,streamIds=new WeakMap<Rng,number>();let stream=0;
        const clean=(v:any):any=>{if(v instanceof Actor)return {actor:v.id};if(v instanceof Rng)return {rng:v.snapshot()};if(v instanceof Map)return [...v].map(([k,v])=>[k,clean(v)]);if(v instanceof Set)return [...v];if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,v])=>typeof v!=='function').map(([k,v])=>[k,clean(v)]));return v;};
        resetActorIdCounter(910000);
        if(mode==='fallback')for(let i=0;i<2;i++){const m=nativeFactory('zombie',zone.level,'enemy');m.pos={x:entry.x+100+i*45,y:entry.y};(local?scene.actors:world.actors).push(m);}
        if(local){scene.actors=[...scene.actors];assert.equal(bounty!.host.actors,scene.actors);
          for(const key of ['zone','actors','player','walk','doodads','lineOfSight','clipShot','hostileTo','enemiesOf','farPoint','findFreeSpot','placeInHabitat','spawnEncounterGroup','refreshMagicPacks','createMonster','pointInSolid','pathField','baseTable','effectiveSpawn','spawnPoint','countedEnemies','questDefOf','handState','noteBountyReady','bountyHands','activeQuests','harvestNodes','clientActionHook','charDirty','completedObjectives','visited','ledger','massRuntime'])
            Object.defineProperty(world,key,{configurable:true,get(){throw Error('foreign standing '+key);}});
        }
        const restoreSources: (()=>void)[]=[];
        for(const [registry,fields]of [[BOUNTY_KINDS,['arrival','failed','done','copy']],[BOUNTY_SOURCES,['census','resolved','failed']]] as const)
          for(const [id,row]of Object.entries(registry))for(const key of fields){const descriptor=Object.getOwnPropertyDescriptor(row,key);if(!descriptor)continue;
            Object.defineProperty(row,key,{configurable:true,enumerable:descriptor.enumerable,get(){sourceReads.push(['select',registry===BOUNTY_KINDS?'kind':'source',id,key]);const fn=descriptor.value;return function(this:unknown,...a:any[]){sourceReads.push(['call',id,key,this===row,clean(a.slice(1))]);return fn.apply(this,a);};}});
            restoreSources.push(()=>Object.defineProperty(row,key,descriptor));
          }
        const oldMethods:any={};for(const name of Object.keys(originals)){const fn=target[name];oldMethods[name]=fn;target[name]=function(...a:any[]){actions.push([name,clean(a)]);return fn.apply(this,a);};}
        const census:any[]=[];
        const initialNodes=environment.input.state.harvestNodes.length,initialActors=(local?scene.actors:world.actors).length;
        const rev=local?geom.doodadsRev:world.doodadsRev;
        let error:string|undefined;
        Rng.prototype.next=function(){if(!streamIds.has(this))streamIds.set(this,stream++);const before=this.snapshot(),n=originalNext.call(this);draws.push([streamIds.get(this),before,n,this.snapshot()]);return n;};
        try{withSeededRandom(8891,()=>{
          target.seedCullMarks(zone,new Rng(998));target.seedGatherNodes(zone,pois);target.noteBountyArrivals(zone,true,'from');
          if((mode==='registry'||mode==='packages')){
            const sourceContext=local?bounty!.host:world;
            for(const [id,row]of Object.entries(BOUNTY_SOURCES)){const rows=row.census(sourceContext);if(mode==='packages')assert.ok(rows.length>0,'actual live package census '+id);census.push([id,clean(rows)]);}
            for(const p of postings)census.push([p.id,target.handState(p),clean(target.questDefOf(p.id))]);
            campaign.activeQuests.find((q:any)=>q.questId===postings[0].id)!.fieldDone=true;
            target.noteBountyReady(postings[0]);
          }
          if(mode==='country'){
            const destination=massBountyDestination(countryMass,countryTarget);assert.ok(destination);
            for(const p of postings.filter(p=>p.kind.startsWith('country_'))){const standing=target.handState(p),q=target.questDefOf(p.id);assert.ok(q.offerLabel.includes(destination.name),'real destination copy '+p.kind);if(p.kind==='country_visit')assert.equal(standing,'ready','actual discovered place reaches readiness');census.push([p.kind,standing,clean(q)]);}
            const p=postings.find(p=>p.kind==='country_visit')!,provider=local?campaign:world;provider.massRuntime=null;assert.equal(target.handState(p),'afield','null provider is observed live');provider.massRuntime=countryMass;assert.equal(target.handState(p),'ready','restored real provider observed live');
          }
          if(mode==='positive'){target.seedCullMarks(zone,new Rng(998));target.seedGatherNodes(zone,pois);target.noteBountyArrivals(zone,true,'from');}
        });}catch(e){error=(e as Error).message;}finally{Rng.prototype.next=originalNext;restoreSources.reverse().forEach(f=>f());for(const [k,v]of Object.entries(oldMethods))target[k]=v;}
        const actors:Actor[]=local?scene.actors:world.actors,nodes=local?environment.input.state.harvestNodes:world.harvestNodes;
        for(const n of nodes)assert.equal(geom.doodads.includes(n.doodad),true,'each native harvest node retains its actual doodad alias');
        const result={census,id:zone.id,mode,error,initialNodes,initialActors,draws,actions,sourceReads,notices,postings:clean(postings),quests:clean(local?campaign.activeQuests:world.activeQuests),dirty:local?campaign.charDirty:world.charDirty,
          actors:actors.map(a=>({id:a.id,state:captureNativeActorState(a)})),nodes:clean(nodes),doodads:clean(geom.doodads),factoryArgs:clean(factoryArgs),revDelta:(local?geom.doodadsRev:world.doodadsRev)-rev,
          nextActorId:new Actor('allocator','enemy',{x:0,y:0}).id};
        if(mode==='factory-fail'){assert.equal(error,'allocated bounty factory failure');assert.equal(actors.length,2);}
        else if(mode==='notice-fail'){assert.equal(error,'bounty notice failure');assert.equal(result.quests[0].fieldDone,true);assert.equal(result.dirty,false);}
        else{assert.equal(error,undefined);if(mode==='positive'){assert.equal(actors.filter(a=>a.tag==='bounty_mark').length,4);assert.equal(nodes.filter((n:any)=>!n.spent).length,4);}}
        if(mode==='safe'||mode==='spoils-none')assert.equal(nodes.length,initialNodes);
        if(mode==='client')assert.deepEqual(postings.find(p=>p.survey)!.survey!.zones,[]);
        return result;
    });
}
const logs:unknown[]=[];
const courses=fixtures.flatMap((f:any)=>['natural','positive','fallback','safe','spoils-none','client','factory-fail','notice-fail','registry','packages'].map(mode=>({f,mode})));
courses.push({f:fixtures[0],mode:'country'});
for(const {f,mode}of courses){
 const old=run(f,'old',mode),local=run(f,'local',mode),world=run(f,'world',mode);assert.deepEqual(local,old,`${f.row.id}/${mode}/local`);assert.deepEqual(world,old,`${f.row.id}/${mode}/World`);
 logs.push({id:f.row.id,mode,actors:local.actors.length,nodes:local.nodes.length,draws:local.draws.length,calls:local.actions.length,sourceReads:local.sourceReads.length,error:local.error});console.log('PASS',logs.at(-1));
}
console.log('PASS native bounty site/arrival',logs.length,'original/local/World courses');

function bindingControls(owner:NativeAreaSceneBounty){
 let n=0;const input=owner.input;
 assert.equal(Object.isFrozen(owner.host),true);assert.equal(Object.isFrozen(input),true);
 assert.equal(Object.keys(owner).includes('host'),false);assert.equal(Object.keys(owner).includes('input'),false);
 for(const key of Object.keys(input)){
  let read=0;const candidate={...input};Object.defineProperty(candidate,key,{get(){read++;throw Error('getter executed');}});
  assert.throws(()=>new NativeAreaSceneBounty(candidate),/own object binding/);assert.equal(read,0);n++;
  const inherited=Object.assign(Object.create({[key]:(input as any)[key]}),input);delete inherited[key];
  assert.throws(()=>new NativeAreaSceneBounty(inherited),/own object binding/);n++;
 }
 for(const key of ['scene','geometry']){assert.throws(()=>new NativeAreaSceneBounty({...input,[key]:{}} as NativeSceneBountyInput),/identical/);n++;}
 const methods:[object,string][]=[...[ 'effectiveSpawn','baseTable','createMonster','promoteRarityStacked'].map(k=>[input.population,k] as [object,string]),
 [input.population.input.sources.ambient,'weightedPick'],[input.objectives,'spawnPoint'],[input.objectives,'countedEnemies'],[input.environment,'harvestRowPick'],
 ...['interactSpot','clampPos','markDoodadsChanged'].map(k=>[input.geometry,k] as [object,string]),[input.campaign,'notice'],
 ...['handState','noteBountyReady','objectiveDoneAt','questDefOf'].map(k=>[owner,k] as [object,string])];
 for(const [provider,key]of methods){const d=Object.getOwnPropertyDescriptor(provider,key);let called=0;
  try{Object.defineProperty(provider,key,{configurable:true,value:function(this:unknown,...args:unknown[]){assert.equal(this,provider);assert.deepEqual(args,['selected',3]);called++;return 71;}});
   const selected=(owner.host as any)[key];Object.defineProperty(provider,key,{configurable:true,value(){throw Error('replacement selected');}});
   assert.equal(selected('selected',3),71);assert.equal(called,1);n++;
  }finally{if(d)Object.defineProperty(provider,key,d);else delete (provider as any)[key];}
 }
 return n;
}

assert.deepEqual(run(fixtures[0],'local','positive'),run(fixtures[0],'local','positive'));run(fixtures[1],'local','registry');assert.deepEqual(run(fixtures[0],'local','positive'),run(fixtures[0],'old','positive'));

// Actual World adapter: retain method selection and receiver, follow current
// campaign/census roots, and keep the cached view outside reflective pinning.
let bountyCachedSelections=0;
withSeededRandom(61999,()=>{
 const world:any=makeSimWorld('warrior',61999),actor=world.createMonster('zombie',10,'enemy');
 world.actors=[world.player,actor];const owned=new Map([['bounty-cache-witness',actor]]);
 assert.equal(massDormancyPins(world,owned).has(actor),false);
 const host=world.nativeSceneBountyHost();assert.equal(host,world.nativeSceneBountyHost());
 assert.equal(Object.getOwnPropertyDescriptor(world,'nativeSceneBountyView')?.enumerable,false);
 assert.equal(Object.keys(world).includes('nativeSceneBountyView'),false);
 const changed=[actor,world.player];world.actors=changed;assert.equal(host.actors,changed);
 const hands:BountyPosting[]=[];world.bountyHands=hands;assert.equal(host.bountyHands,hands);
 const nodes:World['harvestNodes']=[];world.harvestNodes=nodes;assert.equal(host.harvestNodes,nodes);
 assert.equal(massDormancyPins(world,owned).has(actor),false);
 world.player.aiTargetId=actor.id;assert.equal(massDormancyPins(world,owned).has(actor),true);world.player.aiTargetId=-1;
 for(const name of ['objectiveDoneAt','effectiveSpawn','baseTable','weightedPick','createMonster','spawnPoint','countedEnemies','promoteRarityStacked','harvestRowPick','interactSpot','clampPos','markDoodadsChanged','noteBountyReady','handState','notice','questDefOf']){
  const prior=Object.getOwnPropertyDescriptor(world,name),calls:any[]=[],argument={name};
  try{
   Object.defineProperty(world,name,{configurable:true,writable:true,value:function(this:unknown,...args:unknown[]){calls.push(['old',this===world,args]);return 'old';}});
   const selected=host[name];
   Object.defineProperty(world,name,{configurable:true,writable:true,value:function(this:unknown,...args:unknown[]){calls.push(['new',this===world,args]);return 'new';}});
   assert.equal(selected(argument),'old');assert.equal(host[name](argument),'new');
   assert.equal(calls[0][2][0],argument);assert.deepEqual(calls,[['old',true,[argument]],['new',true,[argument]]]);bountyCachedSelections++;
  }finally{if(prior)Object.defineProperty(world,name,prior);else delete world[name];}
 }
});
assert.equal(bountyCachedSelections,16);
console.log('PASS actual World bounty cache',bountyCachedSelections,'method selections and true controller pin control');
