/** Exact native caravan-notice delta and observed main notice lineage. No runtime source replacement. */
export const nativeCaravanNewsArchive={
  "base": "35198bf706893676dad23f4521420bfb92aeb7cb",
  "main": {
    "commit": "dc56030f3594533fec8712d55977d17f5bd03d1b",
    "worldSha256": "01a1b624a05b56ec60555c9acfb3f7d45dd0cf50f709c73769cef53190e9aced",
    "calls": 110
  },
  "originalReader": "// ---------------------------------------------------------------------------\n// ONE-OFF PROBE — M-NEWS, THE NEWS MOVE (docs/design/show-dont-tell.md §3h):\n// world news speaks on THE NOTICE FEED (world/bulletins.ts — screen-anchored,\n// channel-muted), never as a floater over the hero's head. Pins:\n//   A. World.notice lands a channelled entry on world.notices (the feed's own\n//      push/prune laws; the default channel is 'world').\n//   B. The kill-rule ctx carries `notice` (the event epilogues' seam).\n//   C. THE MOVE CENSUS (source-lint): the world-news carriers no longer float\n//      at the player's head — the moved lines are notice() calls with a\n//      channel; the theater arrivals and the package epilogues likewise.\n// Run: npx tsx balance/probe_newsmove.ts\n// ---------------------------------------------------------------------------\n\nimport { readFileSync } from 'node:fs';\nimport { bootSimEngine, makeSimWorld } from '../src/sim/arena';\nimport { seedGlobalRandom } from '../src/sim/rng';\nimport { NOTICE_CFG } from '../src/world/bulletins';\n\nlet failed = 0;\nconst check = (name: string, ok: boolean, detail = ''): void => {\n  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);\n  if (!ok) failed++;\n};\nbootSimEngine();\nseedGlobalRandom(0x9e3d5);\nconst w = makeSimWorld('warrior', 0x9e3d5);\n\n// ------------------------------------------------- A. the feed\n{\n  const before = w.notices.length;\n  w.notice('qa: the tide turns', '#ffffff', 14, 'events');\n  w.notice('qa: a writ is posted');\n  const a = w.notices[w.notices.length - 2], b = w.notices[w.notices.length - 1];\n  check('A1 World.notice lands channelled entries on the feed (events; default world), stamped at the world clock',\n    w.notices.length === before + 2 && a?.text === 'qa: the tide turns' && a.channel === 'events' && a.color === '#ffffff' && a.size === 14\n    && b?.text === 'qa: a writ is posted' && b.channel === 'world' && Math.abs(b.bornAt - w.time) < 1e-9);\n  for (let i = 0; i < NOTICE_CFG.keep + 4; i++) w.notice('qa: flood ' + i);\n  check('A2 the feed keeps its own cap (NOTICE_CFG.keep — the oldest lines shift out)', w.notices.length === NOTICE_CFG.keep);\n}\n\n// ------------------------------------------------- B. the kill-rule seam (type-level + the world build)\n{\n  const src = readFileSync('src/engine/world.ts', 'utf8');\n  check('B1 the world builds the kill ctx with `notice` beside `text`', /notice: \\(msg, color, size, channel\\) => this\\.notice\\(msg, color, size, channel\\)/.test(src));\n  const kh = readFileSync('src/engine/killHandlers.ts', 'utf8');\n  check('B2 KillCtx declares notice(msg, color?, size?, channel?)', /notice\\(msg: string, color\\?: string, size\\?: number, channel\\?: string\\): void;/.test(kh));\n}\n\n// ------------------------------------------------- C. the move census (source-lint)\n{\n  const src = readFileSync('src/engine/world.ts', 'utf8');\n  const moved = (src.match(/this\\.notice\\(/g) ?? []).length;\n  check('C1 the world-news carriers speak through notice() (≥ 80 calls moved off the head)', moved >= 80, `${moved}`);\n  const headNews = ['The Necropolis crumbles behind you', 'hunters spring the ambush!', 'An undead tide pours into', 'word comes: ${def.name} is under siege',\n    'The brigands drift on', 'Quest complete: ${q.offerLabel}!', 'The chart is inked'];\n  const stillFloat = headNews.filter(s => { const i = src.indexOf(s); if (i < 0) return false; const head = src.lastIndexOf('this.', i); return src.slice(head, i).startsWith('this.text('); });\n  check('C2 none of the sampled world-news lines float at the head any more', stillFloat.length === 0, stillFloat.join(' | '));\n  const theater = ['src/data/theater.ts', 'src/data/pilgrimage.ts', 'src/data/warfront.ts'].map(f => readFileSync(f, 'utf8')).join('\\n');\n  check('C3 the theater arrivals ride the feed (no w.text at the head; w.notice with a channel)', !/w\\.text\\(vec\\(w\\.player\\.pos/.test(theater) && (theater.match(/w\\.notice\\(/g) ?? []).length >= 8);\n  const pk = ['deepwinter', 'longNight', 'wraithsail', 'verminfall', 'unsealing', 'crusade'].map(n => readFileSync(`src/packages/defs/${n}.ts`, 'utf8')).join('\\n');\n  check('C4 the event epilogues ride the feed (ctx.notice with a channel)', (pk.match(/ctx\\.notice\\(/g) ?? []).length >= 8 && /ctx\\.notice\\([^;]*'war'\\)/.test(pk) && /ctx\\.notice\\([^;]*'events'\\)/.test(pk));\n}\n\nconsole.log(failed ? `\\n${failed} FAILED` : '\\nALL PASS');\nprocess.exit(failed ? 1 : 0);\n",
  "originalWatcher": "import {beforeNativeBirthLifetime} from './nativeBirthLifetimeFixture';\nimport {beforeNativeSceneProgression} from './nativeSceneProgressionFixture';\nimport {beforeNativeSceneQuest} from './nativeSceneQuestFixture';\n/** Objective watcher parity: native geometry/factories/holds/rewards execute;\n * movement and quest-attribution boundaries are explicit recording test ports. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {execFileSync} from 'node:child_process';\nimport ts from 'typescript';\nimport * as core from '../src/engine/nativeSceneObjectiveWatching';\nimport {World} from '../src/engine/world';\nimport {nextItemUid} from '../src/engine/itemgen';\nimport {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';\nimport {PROGRESSION} from '../src/data/classes';\nimport {registerPackageAsk,registerVentureAsk} from '../src/data/objectives';\nimport {resetActorIdCounter} from '../src/engine/actor';\nimport {makeSimWorld} from '../src/sim/arena';\nimport {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';\nimport {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState} from '../src/worldmass/nativeAreaSceneObjectiveWatching';\nimport {spawnSceneWave} from '../src/engine/nativeScenePopulation';\nimport {sceneObjectiveServices} from '../src/worldmass/nativeSceneObjectives';\nimport {captureNativeActorState} from '../src/worldmass/dormancy';\nimport {nativeSceneObjectiveWatchingArchive as archive,nativeSceneObjectiveWatchingArchiveHash} from './nativeSceneObjectiveWatchingArchive';\nimport {beforeNativeSceneObjectiveWatching} from './nativeSceneObjectiveWatchingFixture';\nimport {dist,rand,randInt,vec} from \"../src/core/math\";\nimport {Actor} from \"../src/engine/actor\";\nimport {FACTIONS,MONSTERS} from \"../src/data/monsters\";\nimport {BEACON_CFG} from \"../src/data/beacons\";\nimport {LEYLINE_CFG} from \"../src/data/leyline\";\nimport {RIFT_CFG} from \"../src/data/rifts\";\nimport {PYRE_CFG} from \"../src/data/pyres\";\nimport {DIG_CFG} from \"../src/data/digsites\";\nimport {biasTable,composeBias} from \"../src/world/overlay\";\nimport {driveNativeBeacon,nativeBeaconConfig} from \"../src/engine/beaconObjectives\";\nimport {driveNativeRiftPours,finishNativeDig,driveHoldObjectives,resolveHoldContest} from \"../src/engine/holdObjectives\";\nimport {driveNativeProcession,nativeProcessionConfig,nativeProcessionSteering} from \"../src/engine/processionObjectives\";\nimport {OFFERING_CFG,packageAskRow,ventureAskRow} from \"../src/data/objectives\";\nimport {sameStory} from \"../src/engine/tiers\";\nimport {sidezoneOf} from \"../src/data/sidezones\";\nimport {DWELL_CFG,transitDwell} from \"../src/data/transit\";\nimport {WAVE_CFG} from \"../src/data/waves\";\nimport {Rng} from \"../src/core/rng\";\nimport {factionAllowed} from \"../src/world/zonePolicy\";\nimport {castRay} from \"../src/engine/los\";\nimport {dayCycle} from \"../src/world/daynight\";\n\nconst hash=(v:string)=>createHash('sha256').update(v).digest('hex');\nconst read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');\nconst parse=(s:string)=>ts.createSourceFile('proof.ts',s,99,true);\nconst emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:99,module:99,removeComments:true}}).outputText;\nassert.equal(hash(JSON.stringify(archive)),nativeSceneObjectiveWatchingArchiveHash);\nconst restored=beforeNativeSceneObjectiveWatching(beforeNativeSceneQuest(beforeNativeSceneProgression(read('src/engine/world.ts')))),sf=parse(restored),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;\nassert.equal(hash(JSON.stringify(cl.members.map(m=>m.getText(sf).replaceAll('\\r\\n','\\n')))),archive.worldHash,'complete pre-watcher World');\nconst cs=parse(beforeNativeBirthLifetime('src/engine/nativeSceneObjectiveWatching.ts',read('src/engine/nativeSceneObjectiveWatching.ts')));\nfor(const row of archive.rows){const original=parse('class A{'+row.before+'}'),method=(original.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;\n const current=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===row.fn) as ts.FunctionDeclaration;\n const body=method.body!.getText(original).replace(row.prefix||'__no_prefix__','').replace(/\\bthis\\b/g,'host');\n assert.equal(emit('function body()'+body),emit('function body()'+current.body!.getText(cs)),'complete watcher operation '+row.name);\n}\nif(process.argv.includes('--provenance')){const old=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:12e6}),os=parse(old),oc=os.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;assert.equal(hash(JSON.stringify(oc.members.map(m=>m.getText(os).replaceAll('\\r\\n','\\n')))),archive.worldHash);for(const row of archive.rows)assert.equal(oc.members.find(m=>m.name?.getText(os)===row.name)?.getText(os).replaceAll('\\r\\n','\\n'),row.before);}\nconst bindings={dist,rand,randInt,vec,Actor,FACTIONS,MONSTERS,BEACON_CFG,LEYLINE_CFG,RIFT_CFG,PYRE_CFG,DIG_CFG,biasTable,composeBias,driveNativeBeacon,nativeBeaconConfig,driveNativeRiftPours,finishNativeDig,driveHoldObjectives,resolveHoldContest,driveNativeProcession,nativeProcessionConfig,nativeProcessionSteering,OFFERING_CFG,packageAskRow,ventureAskRow,sameStory,sidezoneOf,DWELL_CFG,transitDwell,WAVE_CFG,Rng,factionAllowed,castRay,dayCycle};\nconst originals=new Function(...Object.keys(bindings),emit('class Archive{'+archive.rows.map(r=>r.before).join('\\n')+'}\\nreturn Archive.prototype;'))(...Object.values(bindings));\nmakeSimWorld('warrior',17146);\nconst rows=archive.rows;\ntype Lane='original'|'world'|'core'|'owner';\nconst receipts:any[]=[];let itemUidBase=0;\nfunction graph(v:any,memo=new Map<object,number>()):any {\n if(v instanceof Actor)return {actor:v.id};if(v===null||typeof v!=='object')return typeof v==='function'?'function':v;\n if(memo.has(v))return {ref:memo.get(v)};const id=memo.size;memo.set(v,id);\n if(v instanceof Map)return {id,map:[...v].map(([k,x])=>[graph(k,memo),graph(x,memo)])};\n if(v instanceof Set)return {id,set:[...v].map(x=>graph(x,memo))};\n return {id,values:Object.fromEntries(Object.keys(v).map(k=>[k,k==='uid'&&typeof v[k]==='number'?v[k]-itemUidBase:graph(v[k],memo)]))};\n}\nfunction fixture(lane:Lane){\n resetActorIdCounter(930000);itemUidBase=nextItemUid();window.localStorage.clear();const w=makeSimWorld('warrior',17147);w.massRuntime=null;w.time=50;w.kills=0;w.player.level=20;w.meta.xp=0;w.meta.xpNeeded=PROGRESSION.xpForLevel(20);\n const definition={...w.zone,id:'watcher-area',level:1,objective:{kind:'clear'},packs:undefined} as any;\n w.zoneMap[definition.id]=definition;const raw=freshAssemblyInput(w,definition);const campaign=raw.campaign as any;campaign.kills=0;\n const a=new NativeAreaSceneAssembly(raw),i=a.input,scene=i.scene,geometry=i.geometry,objectives=i.objectives;\n scene.player.pos={x:500,y:500};const tape:any[]=[];\n const os=sceneObjectiveServices(i.population,objectives,{get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},notice:geometry.notice.bind(geometry),text:geometry.text.bind(geometry),pathField:geometry.pathField.bind(geometry),farPoint:geometry.farPoint.bind(geometry),pointInSolid:geometry.pointInSolid.bind(geometry),farthestStand:geometry.farthestStand.bind(geometry)});\n const state=freshSceneObjectiveWatchingState(0);const authority=new NativeAreaActorAuthority<object>(campaign),binding=authority.register(scene,{});authority.claim(binding,scene.actors);\n const quests={nearestHand(places:any){tape.push(['nearestHand',graph(places)]);return w.localSeat;}};\n const movement={moveActor(actor:Actor,dx:number,dy:number,dt:number){tape.push(['move',actor.id,dx,dy,dt]);}};\n const owner=new NativeAreaSceneObjectiveWatching({authority,scene,geometry,population:i.population,objectives,state,birthState:i.state,environment:i.environment,physical:i.physical,completion:a.objectiveController,loot:a.lootController,graph:a.graph,coast:i.coast,theater:i.theater,adoption:i.adoption,objectiveServices:os,campaign,quests,movement});\n let driver:any=owner;\n if(lane!=='owner'){\n  const h:any={};const extracted=new Set(rows.map(r=>r.name));for(const key of Reflect.ownKeys(owner.host)){if(key==='admitBirth'||key==='createMonster'||key==='spawnWave'||typeof key==='string'&&extracted.has(key as any))continue;Object.defineProperty(h,key,Object.getOwnPropertyDescriptor(owner.host,key)!);}\n  h.createMonster=i.population.createMonster.bind(i.population);h.spawnWave=()=>spawnSceneWave(os);\n  h.nativeSceneObjectiveWatchingHost=lane==='world'?(World.prototype as any).nativeSceneObjectiveWatchingHost:()=>h;\n  for(const row of rows)h[row.name]=lane==='original'?originals[row.name]:lane==='world'?(World.prototype as any)[row.name]:function(...args:any[]){return (core as any)[row.fn](h,...args);};driver=h;\n }\n const enemy=(id='goblin_skirmisher')=>{const actor=i.population.createMonster(id,1,'enemy');actor.pos={x:530,y:500};scene.actors.push(actor);authority.claim(binding,[actor]);return actor;};\n const fixture=(key:'spires'|'rifts'|'pyres'|'digs',charge=0)=>{const d:any={kind:'rock',pos:{x:500,y:500},radius:16,tier:0};geometry.doodads.push(d);geometry.markDoodadsChanged();const f:any={pos:d.pos,doodad:d,charge,recoup:0,pourAt:1e6};objectives[key].push(f);return f;};\n function snapshot(){return {zone:graph(scene.zone),actors:scene.actors.map(x=>({id:x.id,state:captureNativeActorState(x)})),objectives:graph(objectives),state:graph(state),engaged:i.state.packageAskEngaged,flashes:graph(geometry.flashes),drops:graph(i.physical.input.state.drops),text:graph(a.objectiveController.input.state.texts),completed:[...campaign.completedObjectives],ledger:graph(campaign.ledger),xp:w.localSeat.meta.xp,tape};}\n return {driver,owner,a,i,authority,binding,scene,geometry,objectives,state,campaign,tape,enemy,fixture,snapshot};\n}\ntype Fixture=ReturnType<typeof fixture>;\nfunction pair(label:string,course:(f:Fixture)=>unknown,seed=8447){\n const run=(lane:Lane)=>{const prior=Math.random,rng=new Rng(seed),draws:number[]=[];Math.random=()=>{const n=rng.next();draws.push(n);return n;};try{const f=fixture(lane);const result=course(f);if(lane==='owner')f.authority.assertAdmitted(f.scene);return {result,snapshot:f.snapshot(),draws,next:Math.random(),itemUidWitness:nextItemUid()-itemUidBase};}finally{Math.random=prior;}};\n const expected=run('original');for(const lane of ['world','core','owner'] as const)assert.deepEqual(run(lane),expected,label+' '+lane);receipts.push({label,receipt:hash(JSON.stringify(expected)),draws:expected.draws.length});\n}\n\nfor(const kind of ['safe','none'])pair('no-errand:'+kind,f=>{f.scene.zone.objective={kind} as any;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,false);});\nfor(const mode of ['empty','living','cull-paid','cull-short','already-done'])pair('clear:'+mode,f=>{f.scene.zone.objective={kind:'clear'};if(mode!=='empty')f.enemy();if(mode.startsWith('cull'))f.objectives.cull={need:3,kills:mode==='cull-paid'?3:2};if(mode==='already-done')f.objectives.objectiveDone=true;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,['empty','cull-paid','already-done'].includes(mode));});\nfor(const alive of [true,false])pair('boss:'+alive,f=>{f.scene.zone.objective={kind:'boss',id:'goblin_brute'};const e=f.enemy('goblin_brute');e.dead=!alive;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,!alive);});\nfor(const kind of ['bounty','leyline','spawners'])for(const alive of [true,false])pair(kind+':'+alive,f=>{f.scene.zone.objective={kind} as any;const e=f.enemy(kind==='spawners'?Object.values(MONSTERS).find(m=>m.spawner)!.id:'goblin_skirmisher');e.tag=kind==='bounty'?'bounty_mark':kind==='leyline'?'ley_siphon':undefined;if(kind==='spawners')(e as any).spawner={timer:0,spec:{}};e.dead=!alive;f.geometry.waypointPos={x:530,y:500};f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,!alive);});\nfor(const mode of ['empty','standing','done'])pair('puzzle:'+mode,f=>{f.scene.zone.objective={kind:'puzzle'} as any;if(mode!=='empty')f.i.environment.input.state.puzzles.push({isObjective:true,done:mode==='done',spec:{label:'Ancient lock'},kind:{label:'Lock'}} as any);f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode!=='standing');});\nfor(const mode of ['hunt-standing','hunt-done','missing-den'])pair('lair:'+mode,f=>{f.scene.zone.objective={kind:'lair',title:'Hidden lair',...(mode==='missing-den'?{mouthKind:'unknown-den'}:{kin:['goblin_brute']})} as any;if(mode==='hunt-standing')f.enemy('goblin_brute');f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode!=='hunt-standing');});\nlet pkg:any,venture:any;\nregisterPackageAsk({pkg:'watcher-parity-package',title:'Guest',standing:()=>null,view:(h,z)=>{assert.ok(h.sim);assert.ok(Array.isArray(h.exits));assert.equal(z.id,'watcher-area');return pkg;}});\nregisterVentureAsk({id:'watcher-parity-venture',title:()=> 'Venture',standing:()=>null,view:(h,z)=>{assert.ok(h.sim);assert.ok(Array.isArray(h.exits));assert.equal(z.id,'watcher-area');return venture;}});\nfor(const mode of ['untouched','engaged','dead','vanished'])pair('package:'+mode,f=>{f.scene.zone.objective={kind:'package',pkg:mode==='vanished'?'missing':'watcher-parity-package',key:'run',title:'Guest'};pkg={standing:true,engaged:mode!=='untouched',pos:{x:500,y:500},label:'guest'};f.driver.updateObjective(1);if(mode==='vanished'){assert.equal(f.scene.zone.objective.kind,'clear');return;}assert.equal(f.objectives.objectiveDone,false);pkg.standing=false;if(mode==='dead')f.scene.player.dead=true;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='engaged');if(mode!=='engaged')assert.equal(f.scene.zone.objective.kind,'clear');});\nfor(const mode of ['standing','won','lost','vanished'])pair('venture:'+mode,f=>{f.scene.zone.objective={kind:'venture',venture:mode==='vanished'?'missing':'watcher-parity-venture',key:'run',title:'Gate'};venture={verdict:mode,pos:{x:500,y:500},label:'gate',wonText:'Gate opened',lostText:'Gate lost'};f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='won');if(mode==='lost'||mode==='vanished')assert.equal(f.scene.zone.objective.kind,'clear');if(mode==='won'||mode==='lost')assert.ok(f.objectives.objectiveLatch);});\nfor(const kind of ['rifts','pyres','unearth'])for(const mode of ['empty','held','contested','dead','different-story'])pair(kind+':'+mode,f=>{f.scene.zone.objective={kind,sealSec:2,kindleSec:2,digSec:2,contest:mode==='contested'?undefined:false} as any;const key=kind==='rifts'?'rifts':kind==='pyres'?'pyres':'digs';if(mode!=='empty'){const r=f.fixture(key);if(mode==='different-story')r.doodad.tier=1;if(mode==='dead')f.scene.player.dead=true;if(mode==='contested')f.enemy();}f.driver.updateObjective(3);assert.equal(f.objectives.objectiveDone,mode==='held');});\nfor(const mode of ['hungry','sated','missing'])pair('offering:'+mode,f=>{f.scene.zone.objective={kind:'offering'} as any;f.objectives.offering=mode==='missing'?null:{altarIdx:0,need:3,offered:mode==='sated'?3:2};f.i.physical.input.state.altars.push({pos:{x:500,y:500},def:{radius:100}} as any);f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='sated');});\nfor(const mode of ['empty','charging','contested','complete'])pair('beacon:'+mode,f=>{f.scene.zone.objective={kind:'beacon',chargeSec:2,reinforce:false,revealRadius:0,revealCount:0,contest:mode==='contested'?undefined:false};if(mode!=='empty')f.fixture('spires');if(mode==='contested')f.enemy();f.driver.updateObjective(mode==='complete'?3:0.5);assert.equal(f.objectives.objectiveDone,mode==='complete');});\nfor(const mode of ['cooldown','packless','spawn'])pair('escape:'+mode,f=>{f.scene.zone.objective={kind:'escape',interval:[3,3]};f.state.escapeTimer=mode==='cooldown'?4:0;if(mode==='spawn')f.scene.zone.packs={table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]} as any;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,false);if(mode==='spawn')assert.ok(f.scene.actors.length>1);});\nfor(const mode of ['win','rest','spawn','living'])pair('waves:'+mode,f=>{f.scene.zone.objective={kind:'waves',waves:1};f.objectives.wave=1;f.objectives.waveActive=mode==='win'||mode==='living';if(mode==='living')f.enemy();if(mode==='spawn'){f.scene.zone.packs={table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]} as any;f.objectives.waveTimer=0;}f.driver.updateObjective(0.1);assert.equal(f.objectives.objectiveDone,mode==='win');});\nfor(const mode of ['missing','dead','rally','rolling','robbed','arrival','ambush'])pair('procession:'+mode,f=>{f.scene.zone.objective={kind:'procession'} as any;const cart=f.i.population.createMonster(nativeProcessionConfig({kind:'procession'}).cartId,1,'player');cart.pos={x:500,y:500};f.scene.actors.push(cart);f.authority.claim(f.binding,[cart]);f.objectives.procession={cartId:mode==='missing'?999:cart.id,rolling:['rolling','robbed','arrival','ambush'].includes(mode),started:false,startPos:{...cart.pos},dest:{x:mode==='arrival'?500:900,y:500},destIdx:0,dwellStart:48,puffAt:mode==='ambush'?0:1e6,heading:0};if(mode==='dead')cart.dead=true;if(mode==='robbed')f.enemy();f.driver.updateObjective(0.1);assert.equal(f.objectives.objectiveDone,mode==='arrival');assert.equal(f.objectives.objectiveLost,mode==='dead'||mode==='missing');});\n// A cached source player must never attend A from B's same local coordinates.\n{\n const f=fixture('owner');f.scene.zone.objective={kind:'pyres',kindleSec:2,contest:false};const stone=f.fixture('pyres');\n const hero=f.scene.player,other={zone:{...f.scene.zone,id:'neighbor'},actors:[hero],player:hero};const binding=f.authority.register(other,{});\n f.scene.actors=f.scene.actors.filter(a=>a!==hero);f.authority.transfer(hero,f.binding,binding);const before=JSON.stringify(f.snapshot());\n assert.throws(()=>f.driver.updateObjective(3),/present area player/);assert.equal(stone.charge,0);assert.equal(JSON.stringify(f.snapshot()),before);\n f.scene.actors.push(hero);other.actors=[];f.authority.transfer(hero,binding,f.binding);f.driver.updateObjective(3);assert.equal(stone.charge,2);assert.equal(f.objectives.objectiveDone,true);\n const counterfeitPhysical={...f.i.physical,input:{...f.i.physical.input,state:{...f.i.physical.input.state,drops:[]}}};\n assert.throws(()=>new NativeAreaSceneObjectiveWatching({...f.owner.input,physical:counterfeitPhysical as any}),/physical and environment stores/);\n const borrowed=new Actor('borrowed','player',{x:500,y:500});f.scene.actors.push(borrowed);const prior=JSON.stringify(f.snapshot());assert.throws(()=>f.driver.updateObjective(1),/unowned or borrowed/);assert.equal(JSON.stringify(f.snapshot()),prior);\n}\n// The legacy geographic dispatcher remains outside the retained native watcher.\nfor(const method of [originals.updateObjective,(World.prototype as any).updateObjective]){\n const calls:any[]=[],h:any={heldFixture:{},massRuntime:{geography:{update(w:any,dt:number){assert.equal(this,h.massRuntime.geography);calls.push([w===h,dt]);}}}};\n method.call(h,0.125);assert.equal(h.heldFixture,null);assert.deepEqual(calls,[[true,0.125]]);\n}\nconsole.log('PASS native objective watcher: '+receipts.length+' original/World/core/retained courses; receipt '+hash(JSON.stringify(receipts)));\n",
  "runtime": [
    {
      "file": "src/engine/world.ts",
      "beforeHash": "478aac8f8027bf44acd6575b03177cc0c68bbfc04fac1366763f17ad5276b092",
      "afterHash": "653eefaa6b22c334e7f670e05aa1b5c8184d1c51fe3c3341b5d2b3b52c1f7f70",
      "edits": [
        {
          "before": "      get nearestHand(){const fn=world.nearestHand;return(...args:Parameters<NativeSceneObjectiveWatchingHost['nearestHand']>)=>fn.apply(world,args);},\n      get objectiveCountable(){const fn=world.objectiveCountable;return(...args:Parameters<NativeSceneObjectiveWatchingHost['objectiveCountable']>)=>fn.apply(world,args);},",
          "after": "      get nearestHand(){const fn=world.nearestHand;return(...args:Parameters<NativeSceneObjectiveWatchingHost['nearestHand']>)=>fn.apply(world,args);},\n      get notice(){const fn=world.notice;return(...args:Parameters<NativeSceneObjectiveWatchingHost['notice']>)=>Reflect.apply(fn,world,args);},\n      get objectiveCountable(){const fn=world.objectiveCountable;return(...args:Parameters<NativeSceneObjectiveWatchingHost['objectiveCountable']>)=>fn.apply(world,args);},"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "beforeHash": "ba59f13393efacd339567b75694c62d58aa368c4f8ecb4c46230bd65b2c05620",
      "afterHash": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0",
      "edits": [
        {
          "before": " isPresentLocalPlayer?():boolean;\n actorById:World['actorById'];",
          "after": " isPresentLocalPlayer?():boolean;\n notice:World['notice'];\n actorById:World['actorById'];"
        },
        {
          "before": "        const state:NativeProcessionState={...pr,enteredAt:host.zoneEnteredAt,done:host.objectiveDone,lost:host.objectiveLost};\n        driveNativeProcession(dt,state,nativeProcessionConfig(o),{",
          "after": "        const state:NativeProcessionState={...pr,enteredAt:host.zoneEnteredAt,done:host.objectiveDone,lost:host.objectiveLost};\n        let justLost=false;\n        driveNativeProcession(dt,state,nativeProcessionConfig(o),{"
        },
        {
          "before": "          spawnAmbush:(a,h,n,c)=>host.spawnProcessionAmbush(a,h,n,c),\n          wreck:cart=>host.dropGemAt(cart.pos),lose:()=>{host.objectiveLost=true;},\n          win:()=>host.completeObjective('The caravan arrives — the road held!'),",
          "after": "          spawnAmbush:(a,h,n,c)=>host.spawnProcessionAmbush(a,h,n,c),\n          wreck:cart=>host.dropGemAt(cart.pos),lose:()=>{host.objectiveLost=true;justLost=true;},\n          win:()=>host.completeObjective('The caravan arrives — the road held!'),"
        },
        {
          "before": "        Object.assign(pr,progress);host.objectiveDone=done;host.objectiveLost=lost;\n        return;",
          "after": "        Object.assign(pr,progress);host.objectiveDone=done;host.objectiveLost=lost;\n        // The original loss speaks after wreck effects and the cleared cart id.\n        if(justLost)host.notice('The caravan is lost — its bounty with it.', '#d05050', 16, 'events');\n        return;"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "beforeHash": "f74fa3cbf9c0faaf2e081b2f79e3415a63bc426b2698ea7177d84a1483e9fcdb",
      "afterHash": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627",
      "edits": [
        {
          "before": "  methods(()=>input.objectiveServices,['countedEnemies','objectiveCountable']);\n  methods(()=>input.completion,['completeObjective']);methods(()=>input.loot,['dropGemAt','ownSpoils']);",
          "after": "  methods(()=>input.objectiveServices,['countedEnemies','objectiveCountable']);\n  Object.defineProperty(host,'notice',{enumerable:true,get(){const p=input.objectiveServices,fn=p.notice;return(...args:Parameters<Host['notice']>)=>Reflect.apply(fn,p,args);}});\n  methods(()=>input.completion,['completeObjective']);methods(()=>input.loot,['dropGemAt','ownSpoils']);"
        }
      ]
    }
  ],
  "lineage": [
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 5501,
        "owner": "sweepClassClaims",
        "ownerHash": "9580e274e7f6927983caaa1620270439ce04dc927f542e46c79b9d2314cd78f0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('New cosmetics unlocked in your Wardrobe.', '#c4b2f2', 16, 'world')",
        "signature": "'New cosmetics unlocked in your Wardrobe.','#c4b2f2',16,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 6143,
        "owner": "sweepClassClaims",
        "ownerHash": "9580e274e7f6927983caaa1620270439ce04dc927f542e46c79b9d2314cd78f0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('New cosmetics unlocked in your Wardrobe.', '#c4b2f2', 16, 'world')",
        "signature": "'New cosmetics unlocked in your Wardrobe.','#c4b2f2',16,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 5509,
        "owner": "sweepClassClaims",
        "ownerHash": "9580e274e7f6927983caaa1620270439ce04dc927f542e46c79b9d2314cd78f0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ${name} ${isVaultAvailable(this.account) ? 'is ready in the Vault' : 'has been discovered'}. Its arts can now be found, and a new vessel awaits your next waking.`, '#8fa8d8', 18, 'world')",
        "signature": "`The ${name} ${isVaultAvailable(__news_host__.account) ? 'is ready in the Vault' : 'has been discovered'}. Its arts can now be found, and a new vessel awaits your next waking.`,'#8fa8d8',18,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 6151,
        "owner": "sweepClassClaims",
        "ownerHash": "9580e274e7f6927983caaa1620270439ce04dc927f542e46c79b9d2314cd78f0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ${name} ${isVaultAvailable(this.account) ? 'is ready in the Vault' : 'has been discovered'}. Its arts can now be found, and a new vessel awaits your next waking.`, '#8fa8d8', 18, 'world')",
        "signature": "`The ${name} ${isVaultAvailable(__news_host__.account) ? 'is ready in the Vault' : 'has been discovered'}. Its arts can now be found, and a new vessel awaits your next waking.`,'#8fa8d8',18,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 5922,
        "owner": "loadZone",
        "ownerHash": "95e0b1eec2b03218553cfa7d3cd2cc74885589ca5f931f585ef18005240d6fa5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The Necropolis crumbles behind you — the tides disperse, the cycle begins anew.', '#e8dcb0', 17, 'events')",
        "signature": "'The Necropolis crumbles behind you — the tides disperse, the cycle begins anew.','#e8dcb0',17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 6577,
        "owner": "loadZone",
        "ownerHash": "4a7849f57b2731c7f71cdade696deca61a8d5416315972b5e549200098ec5aa7",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The Necropolis crumbles behind you — the tides disperse, the cycle begins anew.', '#e8dcb0', 17, 'events')",
        "signature": "'The Necropolis crumbles behind you — the tides disperse, the cycle begins anew.','#e8dcb0',17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 6268,
        "owner": "loadZone",
        "ownerHash": "95e0b1eec2b03218553cfa7d3cd2cc74885589ca5f931f585ef18005240d6fa5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`you have found ${seaName ?? 'the sea'} — the dock casts off, the board knows the water`, '#7fd0ff', 16, 'world')",
        "signature": "`you have found ${seaName ?? 'the sea'} — the dock casts off, the board knows the water`,'#7fd0ff',16,'world'"
      },
      "current": {
        "file": "src/engine/nativeAreaLayout.ts",
        "line": 181,
        "owner": "adoptNativeAreaLayout",
        "ownerHash": "eea75c084e2dab8f0813a83fe428d0816d38b9e84aecfe45a7054b964942a192",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`you have found ${seaName ?? 'the sea'} — the dock casts off, the board knows the water`, '#7fd0ff', 16, 'world')",
        "signature": "`you have found ${seaName ?? 'the sea'} — the dock casts off, the board knows the water`,'#7fd0ff',16,'world'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 6280,
        "owner": "loadZone",
        "ownerHash": "95e0b1eec2b03218553cfa7d3cd2cc74885589ca5f931f585ef18005240d6fa5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the River of Souls — board the Pale Ferry; the dead pour this way through every country of the deep', '#9fd8ec', 16, 'world')",
        "signature": "'the River of Souls — board the Pale Ferry; the dead pour this way through every country of the deep','#9fd8ec',16,'world'"
      },
      "current": {
        "file": "src/engine/nativeAreaLayout.ts",
        "line": 193,
        "owner": "adoptNativeAreaLayout",
        "ownerHash": "eea75c084e2dab8f0813a83fe428d0816d38b9e84aecfe45a7054b964942a192",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice('the River of Souls — board the Pale Ferry; the dead pour this way through every country of the deep', '#9fd8ec', 16, 'world')",
        "signature": "'the River of Souls — board the Pale Ferry; the dead pour this way through every country of the deep','#9fd8ec',16,'world'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 7975,
        "owner": "springVendettaAmbush",
        "ownerHash": "e7c206ebac928e2515e2d19975523e34a4d3412cc2d27b9de411334f93e147e2",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${spec.tierLabel} — hunters spring the ambush!`, spec.color, 16, 'events')",
        "signature": "`${spec.tierLabel} — hunters spring the ambush!`,spec.color,16,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 169,
        "owner": "birthSpringVendettaAmbush",
        "ownerHash": "d92ae658052fbc2a634340ade62e7e8e685b5fff5eb805549bd0230317b4930f",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`${spec.tierLabel} — hunters spring the ambush!`, spec.color, 16, 'events')",
        "signature": "`${spec.tierLabel} — hunters spring the ambush!`,spec.color,16,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 10110,
        "owner": "enterDimension",
        "ownerHash": "6c1432e7c584328c738bfcfc8d33a7099515fbaf00319ae2fe99d59d0cd83e69",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the world tears open…', dim.color, 15, 'events')",
        "signature": "'the world tears open…',dim.color,15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 8261,
        "owner": "enterDimension",
        "ownerHash": "568aecfca0e59fa364e982f8ce81472bddde719f50a9f667ec4cbe1a6e1cbee1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the world tears open…', gate.color, 15, 'events')",
        "signature": "'the world tears open…',gate.color,15,'events'"
      },
      "relation": "same notice after existing dim-to-gate preparation split",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 10869,
        "owner": "updateOmens",
        "ownerHash": "c7fdb72b5aa04fc7c013ae59dc0d425f47b3f411fea314767254d9d491cb583a",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${line} — it is marked on your map.`, o.color ?? OMEN_CFG.color, OMEN_CFG.size + 1, 'world')",
        "signature": "`${line} — it is marked on your map.`,o.color ?? OMEN_CFG.color,OMEN_CFG.size + 1,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 8752,
        "owner": "updateOmens",
        "ownerHash": "43965a09f5644831b2600830a2c7bc8750c9f4f2a23234d52f6901e2848312de",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${line} — it is marked on your map.`, o.color ?? OMEN_CFG.color, OMEN_CFG.size + 1, 'world')",
        "signature": "`${line} — it is marked on your map.`,o.color ?? OMEN_CFG.color,OMEN_CFG.size + 1,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 12353,
        "owner": "spawnWildlife",
        "ownerHash": "d449789b77b19100ba64eaef2661c95780c224f0574258bfb6ec4b4a25e85441",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(w.announce, '#e8c84a', 13, 'war')",
        "signature": "w.announce,'#e8c84a',13,'war'"
      },
      "current": {
        "file": "src/engine/nativeAmbient.ts",
        "line": 376,
        "owner": "spawnNativeWildlife",
        "ownerHash": "04690569e57fdec1c98e1dd95b1201dadba3330865cdd2e12a13895393efa624",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(w.announce, '#e8c84a', 13, 'war')",
        "signature": "w.announce,'#e8c84a',13,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 14146,
        "owner": "onBeastFleeBegin",
        "ownerHash": "4b44e15f494be095ea97f109ec54e0d2ea0277f2c0500333c0deddd2a147a935",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Beast Fleeing', '#d8a83a', 15, 'events')",
        "signature": "'Beast Fleeing','#d8a83a',15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 12136,
        "owner": "onBeastFleeBegin",
        "ownerHash": "4b44e15f494be095ea97f109ec54e0d2ea0277f2c0500333c0deddd2a147a935",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Beast Fleeing', '#d8a83a', 15, 'events')",
        "signature": "'Beast Fleeing','#d8a83a',15,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 14212,
        "owner": "updateHunt",
        "ownerHash": "82b55a9140cb5dd93330aa0361e8b779fdb2834a4a58973a82ca311d2520007d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Cornered · ${this.zoneMap[where]?.name ?? where}`, '#d8a83a', 16, 'events')",
        "signature": "`Cornered · ${__news_host__.zoneMap[where]?.name ?? where}`,'#d8a83a',16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 12202,
        "owner": "updateHunt",
        "ownerHash": "82b55a9140cb5dd93330aa0361e8b779fdb2834a4a58973a82ca311d2520007d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Cornered · ${this.zoneMap[where]?.name ?? where}`, '#d8a83a', 16, 'events')",
        "signature": "`Cornered · ${__news_host__.zoneMap[where]?.name ?? where}`,'#d8a83a',16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 14215,
        "owner": "updateHunt",
        "ownerHash": "82b55a9140cb5dd93330aa0361e8b779fdb2834a4a58973a82ca311d2520007d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Beast Tracks · ${this.zoneMap[dest]?.name ?? dest}`, '#d8a83a', 16, 'events')",
        "signature": "`Beast Tracks · ${__news_host__.zoneMap[dest]?.name ?? dest}`,'#d8a83a',16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 12205,
        "owner": "updateHunt",
        "ownerHash": "82b55a9140cb5dd93330aa0361e8b779fdb2834a4a58973a82ca311d2520007d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Beast Tracks · ${this.zoneMap[dest]?.name ?? dest}`, '#d8a83a', 16, 'events')",
        "signature": "`Beast Tracks · ${__news_host__.zoneMap[dest]?.name ?? dest}`,'#d8a83a',16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 14282,
        "owner": "placeFractureContent",
        "ownerHash": "25b2ce7f0e8e72386f11f23689e1fccaeff76aa8e712bfba1d4a4aab0b0c93d2",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Fracture · ${this.bearingOf(this.player.pos, at)}`, info.color, 15, 'events')",
        "signature": "`Fracture · ${__news_host__.bearingOf(__news_host__.player.pos, at)}`,info.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 319,
        "owner": "birthPlaceFractureContent",
        "ownerHash": "4f699157c3a6fda7bc492ea1ba7bc90969315ab7c517a12e01a860f10578fdc9",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`Fracture · ${nativeHost.bearingOf(nativeHost.player.pos, at)}`, info.color, 15, 'events')",
        "signature": "`Fracture · ${__news_host__.bearingOf(__news_host__.player.pos, at)}`,info.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 14551,
        "owner": "failFracture",
        "ownerHash": "61445274e3c41f8a22d98d640110d9d5e44a5c44fdd219348ffa3264f05947f6",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Fracture Sealed', '#9a7ad0', 15, 'events')",
        "signature": "'Fracture Sealed','#9a7ad0',15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 12490,
        "owner": "failFracture",
        "ownerHash": "61445274e3c41f8a22d98d640110d9d5e44a5c44fdd219348ffa3264f05947f6",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Fracture Sealed', '#9a7ad0', 15, 'events')",
        "signature": "'Fracture Sealed','#9a7ad0',15,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 15311,
        "owner": "materializeUnsealing",
        "ownerHash": "5b8f9d35430a7574653a89f6b1a36d9efdea22687b20201a93469452f207a2af",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('You have found the REGENT\\'S TOMB — the map remembers it', cfg.gold, 17, 'world')",
        "signature": "'You have found the REGENT\\'S TOMB — the map remembers it',cfg.gold,17,'world'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 530,
        "owner": "birthMaterializeUnsealing",
        "ownerHash": "990a570b75ec0fe0d676e17e983285b2dbbf3f1bb71c7e1a7c1c4456fded9bcc",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice('You have found the REGENT\\'S TOMB — the map remembers it', cfg.gold, 17, 'world')",
        "signature": "'You have found the REGENT\\'S TOMB — the map remembers it',cfg.gold,17,'world'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 15373,
        "owner": "materializeUnsealing",
        "ownerHash": "5b8f9d35430a7574653a89f6b1a36d9efdea22687b20201a93469452f207a2af",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${m.name} · ${ward.label}`, cfg.gold, 15, 'events')",
        "signature": "`${m.name} · ${ward.label}`,cfg.gold,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 592,
        "owner": "birthMaterializeUnsealing",
        "ownerHash": "990a570b75ec0fe0d676e17e983285b2dbbf3f1bb71c7e1a7c1c4456fded9bcc",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`${m.name} · ${ward.label}`, cfg.gold, 15, 'events')",
        "signature": "`${m.name} · ${ward.label}`,cfg.gold,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 15594,
        "owner": "acceptAmalgamHunt",
        "ownerHash": "f4fb81d1dee871d70339c32fbebdaee57e3d709b6c397e0d399a5d9fbc643d02",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Slay the undead at ${zn}, then return. (M)`, '#9ad0b0', 16, 'civic')",
        "signature": "`Slay the undead at ${zn}, then return. (M)`,'#9ad0b0',16,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 13112,
        "owner": "acceptAmalgamHunt",
        "ownerHash": "f4fb81d1dee871d70339c32fbebdaee57e3d709b6c397e0d399a5d9fbc643d02",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Slay the undead at ${zn}, then return. (M)`, '#9ad0b0', 16, 'civic')",
        "signature": "`Slay the undead at ${zn}, then return. (M)`,'#9ad0b0',16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 15919,
        "owner": "enterDescentZone",
        "ownerHash": "d5e4564a2334611012cdab2fef9e714281c7501a1e899931800d3bcc3434b148",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('You descend into the dark…', '#7fe0d8', 16, 'world')",
        "signature": "'You descend into the dark…','#7fe0d8',16,'world'"
      },
      "current": {
        "file": "src/engine/nativeSceneDescent.ts",
        "line": 177,
        "owner": "descentEnterDescentZone",
        "ownerHash": "a15379cd87edbdfdd286c241b417eac448c84a94450241ffca03ab8e31c4caeb",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice('You descend into the dark…', '#7fe0d8', 16, 'world')",
        "signature": "'You descend into the dark…','#7fe0d8',16,'world'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 15960,
        "owner": "resurfaceFromDescent",
        "ownerHash": "e391464ec3990658439be8c928b249b84ae5aa3f5b4eb5e04f9ca59e07832ccb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${msg}  The Delver's counter opens.`, '#7fe0d8', 16, 'civic')",
        "signature": "`${msg}  The Delver's counter opens.`,'#7fe0d8',16,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 13333,
        "owner": "resurfaceFromDescent",
        "ownerHash": "e391464ec3990658439be8c928b249b84ae5aa3f5b4eb5e04f9ca59e07832ccb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${msg}  The Delver's counter opens.`, '#7fe0d8', 16, 'civic')",
        "signature": "`${msg}  The Delver's counter opens.`,'#7fe0d8',16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 17628,
        "owner": "updateTownPortals",
        "ownerHash": "35ad8eafa4fca10c8ff46ccf942f5b78599c986c559140db882e948abe06eee8",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The old return passage has faded.', TOWN_PORTAL_CFG.color, 14, 'world')",
        "signature": "'The old return passage has faded.',TOWN_PORTAL_CFG.color,14,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 14868,
        "owner": "updateTownPortals",
        "ownerHash": "74198cd078712ea449042a1731076ca9e08a2c223684912555afd486003e4a92",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The old return passage has faded.', TOWN_PORTAL_CFG.color, 14, 'world')",
        "signature": "'The old return passage has faded.',TOWN_PORTAL_CFG.color,14,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 17660,
        "owner": "refreshZones",
        "ownerHash": "7fda7a5b8e6e7830fbbf7e9291b68cecb2a395d51e8c33a44d45c4b71cf4639e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('You bank the campfire — the wilds stir anew.', '#ffb84a', 16, 'world')",
        "signature": "'You bank the campfire — the wilds stir anew.','#ffb84a',16,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 14928,
        "owner": "refreshZones",
        "ownerHash": "7fda7a5b8e6e7830fbbf7e9291b68cecb2a395d51e8c33a44d45c4b71cf4639e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('You bank the campfire — the wilds stir anew.', '#ffb84a', 16, 'world')",
        "signature": "'You bank the campfire — the wilds stir anew.','#ffb84a',16,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 18446,
        "owner": "spawnContest",
        "ownerHash": "21ea7766de72152a3449570b37a79abee8723085eb06dd66086097508d6c1d75",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${FACTIONS[order[0]]?.name ?? order[0]} contests ${FACTIONS[order[1]]?.name ?? order[1]}!`, '#e85050', 15, 'war')",
        "signature": "`${FACTIONS[order[0]]?.name ?? order[0]} contests ${FACTIONS[order[1]]?.name ?? order[1]}!`,'#e85050',15,'war'"
      },
      "current": {
        "file": "src/engine/nativeScenePopulation.ts",
        "line": 158,
        "owner": "spawnSceneContest",
        "ownerHash": "915e3baf6aabbbec635eb07420e12227d01b612021024ed9e71b126d13548821",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`${FACTIONS[order[0]]?.name ?? order[0]} contests ${FACTIONS[order[1]]?.name ?? order[1]}!`, '#e85050', 15, 'war')",
        "signature": "`${FACTIONS[order[0]]?.name ?? order[0]} contests ${FACTIONS[order[1]]?.name ?? order[1]}!`,'#e85050',15,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 18448,
        "owner": "spawnContest",
        "ownerHash": "21ea7766de72152a3449570b37a79abee8723085eb06dd66086097508d6c1d75",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${FACTIONS[order[0]]?.name ?? order[0]} invades!`, '#e8a050', 15, 'war')",
        "signature": "`${FACTIONS[order[0]]?.name ?? order[0]} invades!`,'#e8a050',15,'war'"
      },
      "current": {
        "file": "src/engine/nativeScenePopulation.ts",
        "line": 160,
        "owner": "spawnSceneContest",
        "ownerHash": "915e3baf6aabbbec635eb07420e12227d01b612021024ed9e71b126d13548821",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`${FACTIONS[order[0]]?.name ?? order[0]} invades!`, '#e8a050', 15, 'war')",
        "signature": "`${FACTIONS[order[0]]?.name ?? order[0]} invades!`,'#e8a050',15,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 18771,
        "owner": "spawnEpicenter",
        "ownerHash": "cfcc83d048150f24b665e2feaaabc0e6525dbe90cebb6e736df8124260074d79",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${info.type.label} ERUPTS — ${champName} descends in a storm of fire!`, info.color, 19, 'events')",
        "signature": "`${info.type.label} ERUPTS — ${champName} descends in a storm of fire!`,info.color,19,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 834,
        "owner": "birthSpawnEpicenter",
        "ownerHash": "8739c78529931d1fdf4e7d11193a1b16f78006dd5540e102e6a9ddead43250ec",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`${info.type.label} ERUPTS — ${champName} descends in a storm of fire!`, info.color, 19, 'events')",
        "signature": "`${info.type.label} ERUPTS — ${champName} descends in a storm of fire!`,info.color,19,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19002,
        "owner": "spawnArenaBoss",
        "ownerHash": "b3b5ff5e85cee5e97fe4db78ab9016045e7051dc3b8ce1cde88b41fdce296c93",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(spec.announce.replace('{name}', MONSTERS[bossId]?.name ?? boss.name), spec.announceColor ?? '#e86a4a', 18, 'events')",
        "signature": "spec.announce.replace('{name}', MONSTERS[bossId]?.name ?? boss.name),spec.announceColor ?? '#e86a4a',18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16218,
        "owner": "spawnArenaBoss",
        "ownerHash": "b3b5ff5e85cee5e97fe4db78ab9016045e7051dc3b8ce1cde88b41fdce296c93",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(spec.announce.replace('{name}', MONSTERS[bossId]?.name ?? boss.name), spec.announceColor ?? '#e86a4a', 18, 'events')",
        "signature": "spec.announce.replace('{name}', MONSTERS[bossId]?.name ?? boss.name),spec.announceColor ?? '#e86a4a',18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19070,
        "owner": "breakArenaSeal",
        "ownerHash": "5dd8f25e431f16b81ed87b4d31529d34d82a495ba2b1086103deea3b71d9d8ba",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(ward.spec.announceAll ?? 'The last seal breaks — the warded one manifests!', '#ffd700', 18, 'events')",
        "signature": "ward.spec.announceAll ?? 'The last seal breaks — the warded one manifests!','#ffd700',18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16286,
        "owner": "breakArenaSeal",
        "ownerHash": "5dd8f25e431f16b81ed87b4d31529d34d82a495ba2b1086103deea3b71d9d8ba",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(ward.spec.announceAll ?? 'The last seal breaks — the warded one manifests!', '#ffd700', 18, 'events')",
        "signature": "ward.spec.announceAll ?? 'The last seal breaks — the warded one manifests!','#ffd700',18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19185,
        "owner": "materializeCrusade",
        "ownerHash": "0a10200fb5f8e0dace85b8e228fe485387a6156ee13ba6b23f717f7d62643492",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${fname} — ${info.label} crusade ground!`, info.color, 16, 'war')",
        "signature": "`${fname} — ${info.label} crusade ground!`,info.color,16,'war'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 929,
        "owner": "birthMaterializeCrusade",
        "ownerHash": "2ba7a4a0022eac059c80d4cea764339a516850fcd8a94e86cd4d41afea6d4468",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`${fname} — ${info.label} crusade ground!`, info.color, 16, 'war')",
        "signature": "`${fname} — ${info.label} crusade ground!`,info.color,16,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19318,
        "owner": "materializeContagion",
        "ownerHash": "8e6bcc0c389e42567c71e981fc51123d1806668fc536d55b6039a2c47b544356",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(strain?.arrive ?? 'The air here is thick with rot…', cfg.color, 15, 'events')",
        "signature": "strain?.arrive ?? 'The air here is thick with rot…',cfg.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 977,
        "owner": "birthMaterializeContagion",
        "ownerHash": "f7b12f97d597da24f3e83deae8a4bc741ca9d3acd030abf3ba68dc6d17747101",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(strain?.arrive ?? 'The air here is thick with rot…', cfg.color, 15, 'events')",
        "signature": "strain?.arrive ?? 'The air here is thick with rot…',cfg.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19621,
        "owner": "materializeDeepwinter",
        "ownerHash": "f318487ca5105071f190d844df1bbe7601d1b16ca92af91dedd85d6d3a552afc",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.thawing ? 'The frost here is in retreat — the court covers its withdrawal…'\n    : 'The winter holds this land — the air itself bites…', cfg.color, 15, 'events')",
        "signature": "info.thawing ? 'The frost here is in retreat — the court covers its withdrawal…'\n    : 'The winter holds this land — the air itself bites…',cfg.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1137,
        "owner": "birthMaterializeDeepwinter",
        "ownerHash": "476700f62221511fc2e945b85388ad45edc04bff124ddef3eb78eb33b20933f4",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(info.thawing ? 'The frost here is in retreat — the court covers its withdrawal…'\n    : 'The winter holds this land — the air itself bites…', cfg.color, 15, 'events')",
        "signature": "info.thawing ? 'The frost here is in retreat — the court covers its withdrawal…'\n    : 'The winter holds this land — the air itself bites…',cfg.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19689,
        "owner": "materializeInfestation",
        "ownerHash": "acdc27ad906d34de10941cccb718651e2e86891b047d57b0c028ba90ee2c9410",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The ground here is riddled with warrens…', cfg.color, 15, 'events')",
        "signature": "'The ground here is riddled with warrens…',cfg.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1190,
        "owner": "birthMaterializeInfestation",
        "ownerHash": "966da766594a2bd672f4288edab2121350d38eb9191148e1e8505da43922f4d8",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice('The ground here is riddled with warrens…', cfg.color, 15, 'events')",
        "signature": "'The ground here is riddled with warrens…',cfg.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19748,
        "owner": "materializeCandle",
        "ownerHash": "afd16aa27c0dd304d9a1d62c19d2a69adcf163f4531cd54e646e1926396dd2d4",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(line, info.vigil ? cfg.waxColor : cfg.umbralColor, 15, 'events')",
        "signature": "line,info.vigil ? cfg.waxColor : cfg.umbralColor,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1237,
        "owner": "birthMaterializeCandle",
        "ownerHash": "192a72843684526d28ef13f5df793a49152a4adac7b6382c337fcd2a605a14f2",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(line, info.vigil ? cfg.waxColor : cfg.umbralColor, 15, 'events')",
        "signature": "line,info.vigil ? cfg.waxColor : cfg.umbralColor,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19795,
        "owner": "materializeStarfall",
        "ownerHash": "b1bb663d2bd134fcc6db6261da5bb967a6ed70d773e1e6aa4bbd070674d6e56e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The sky is coming down in crystal — and something grew where it landed…', cfg.color, 15, 'events')",
        "signature": "'The sky is coming down in crystal — and something grew where it landed…',cfg.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1272,
        "owner": "birthMaterializeStarfall",
        "ownerHash": "eaa9dda5192466ad4ce9276f271ba96e9f0152eb15da8c7cc690643bfc921e99",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice('The sky is coming down in crystal — and something grew where it landed…', cfg.color, 15, 'events')",
        "signature": "'The sky is coming down in crystal — and something grew where it landed…',cfg.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19874,
        "owner": "materializeMycelia",
        "ownerHash": "7836ee2023bf06b1a8ad836fc18b9a6c6bbd6480cc5b9b7f0fde7d4f43bc5801",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Spores choke the air — the Bloom has taken this ground…', cfg.color, 15, 'events')",
        "signature": "'Spores choke the air — the Bloom has taken this ground…',cfg.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1325,
        "owner": "birthMaterializeMycelia",
        "ownerHash": "32723be611398ec64aa1075626e221f7eeebd06f56cb43e5eb53e7a7c8a43b22",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice('Spores choke the air — the Bloom has taken this ground…', cfg.color, 15, 'events')",
        "signature": "'Spores choke the air — the Bloom has taken this ground…',cfg.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 19933,
        "owner": "reconcileDeepwinter",
        "ownerHash": "e9d99b3007ca3b9fde777bdce24543f33344db558fa9305b59c05a789280e44d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(line, df.surge().color, 16, 'events')",
        "signature": "line,df.surge().color,16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16668,
        "owner": "reconcileDeepwinter",
        "ownerHash": "e9d99b3007ca3b9fde777bdce24543f33344db558fa9305b59c05a789280e44d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(line, df.surge().color, 16, 'events')",
        "signature": "line,df.surge().color,16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20005,
        "owner": "updateDeadwakeStream",
        "ownerHash": "558e60c2f00455f7c268aca77863304f26823f3dcd2f0d5f6d0f0d6bfc026855",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(df.surge().ebbText, df.surge().color ?? '#7a5aa6', 18, 'events')",
        "signature": "df.surge().ebbText,df.surge().color ?? '#7a5aa6',18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16744,
        "owner": "updateDeadwakeStream",
        "ownerHash": "93830f3ea90d2eba9f6043e7c7b147e6d227f96887d0c72bccf0d5561eaa0749",
        "method": "noticeOccupied",
        "receiver": "this",
        "call": "this.noticeOccupied(to, df.surge().ebbText, df.surge().color ?? '#7a5aa6', 18, 'events')",
        "signature": "df.surge().ebbText,df.surge().color ?? '#7a5aa6',18,'events'"
      },
      "relation": "same notice arguments with explicit occupied audience",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20020,
        "owner": "updateDeadwakeStream",
        "ownerHash": "558e60c2f00455f7c268aca77863304f26823f3dcd2f0d5f6d0f0d6bfc026855",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`An undead tide pours into ${this.zone.name} — the Deadwake breaks!`, info.color, 18, 'events')",
        "signature": "`An undead tide pours into ${__news_host__.zone.name} — the Deadwake breaks!`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16758,
        "owner": "updateDeadwakeStream",
        "ownerHash": "93830f3ea90d2eba9f6043e7c7b147e6d227f96887d0c72bccf0d5561eaa0749",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`An undead tide pours into ${this.zone.name} — the Deadwake breaks!`, info.color, 18, 'events')",
        "signature": "`An undead tide pours into ${__news_host__.zone.name} — the Deadwake breaks!`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20081,
        "owner": "updateHauntStream",
        "ownerHash": "bed708c6fd9d6e11767780c2c82790da9903163a10c722942ffd2ee619dca2a5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`An unfinished grief holds ${this.zone.name} — the WAILING ONE walks${info.bossLifeFrac < 1 ? ', still wounded' : ''}.`, info.color, 18, 'events')",
        "signature": "`An unfinished grief holds ${__news_host__.zone.name} — the WAILING ONE walks${info.bossLifeFrac < 1 ? ', still wounded' : ''}.`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16821,
        "owner": "updateHauntStream",
        "ownerHash": "1d20ce8684658563661aa463edbd0398fc567afe9987dfc73a89953d07b06b89",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`An unfinished grief holds ${this.zone.name} — the WAILING ONE walks${info.bossLifeFrac < 1 ? ', still wounded' : ''}.`, info.color, 18, 'events')",
        "signature": "`An unfinished grief holds ${__news_host__.zone.name} — the WAILING ONE walks${info.bossLifeFrac < 1 ? ', still wounded' : ''}.`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20092,
        "owner": "updateHauntStream",
        "ownerHash": "bed708c6fd9d6e11767780c2c82790da9903163a10c722942ffd2ee619dca2a5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`A grief holds ${this.zone.name} — find its anchor${info.anchorLifeFrac < 1 ? ' (already cracked)' : ''}.`, info.color, 18, 'events')",
        "signature": "`A grief holds ${__news_host__.zone.name} — find its anchor${info.anchorLifeFrac < 1 ? ' (already cracked)' : ''}.`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16832,
        "owner": "updateHauntStream",
        "ownerHash": "1d20ce8684658563661aa463edbd0398fc567afe9987dfc73a89953d07b06b89",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`A grief holds ${this.zone.name} — find its anchor${info.anchorLifeFrac < 1 ? ' (already cracked)' : ''}.`, info.color, 18, 'events')",
        "signature": "`A grief holds ${__news_host__.zone.name} — find its anchor${info.anchorLifeFrac < 1 ? ' (already cracked)' : ''}.`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20123,
        "owner": "dissipateHauntSpawns",
        "ownerHash": "b030c15d1b8e3d9e74c64892c327bb73d9b5407a962d8a5bb6f307c34a8416c0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The light comes — the grief and its shades fade from this ground…', color, 17, 'events')",
        "signature": "'The light comes — the grief and its shades fade from this ground…',color,17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16863,
        "owner": "dissipateHauntSpawns",
        "ownerHash": "b030c15d1b8e3d9e74c64892c327bb73d9b5407a962d8a5bb6f307c34a8416c0",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The light comes — the grief and its shades fade from this ground…', color, 17, 'events')",
        "signature": "'The light comes — the grief and its shades fade from this ground…',color,17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20164,
        "owner": "updateStrayingScene",
        "ownerHash": "82edb745cd35898da7ce3759cceb93589ded314e94afc50dcb90e44b081c159c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.phase === 'overrun'\n    ? `${this.zone.name} has gone feral — the fold is broken here.`\n    : `The fold has gone astray in ${this.zone.name} — a bell calls it away. Walk the strays home.`, info.color, 18, 'events')",
        "signature": "info.phase === 'overrun'\n    ? `${__news_host__.zone.name} has gone feral — the fold is broken here.`\n    : `The fold has gone astray in ${__news_host__.zone.name} — a bell calls it away. Walk the strays home.`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16904,
        "owner": "updateStrayingScene",
        "ownerHash": "4eec60dde1b4179bf7d593597cd2ae3daa988ad2be551447536780fdb23e3bbc",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.phase === 'overrun'\n    ? `${this.zone.name} has gone feral — the fold is broken here.`\n    : `The fold has gone astray in ${this.zone.name} — a bell calls it away. Walk the strays home.`, info.color, 18, 'events')",
        "signature": "info.phase === 'overrun'\n    ? `${__news_host__.zone.name} has gone feral — the fold is broken here.`\n    : `The fold has gone astray in ${__news_host__.zone.name} — a bell calls it away. Walk the strays home.`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20238,
        "owner": "updateStrayingScene",
        "ownerHash": "82edb745cd35898da7ce3759cceb93589ded314e94afc50dcb90e44b081c159c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('THE BELL TURNS — the changed march on the steading!', info.color, 18, 'events')",
        "signature": "'THE BELL TURNS — the changed march on the steading!',info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16978,
        "owner": "updateStrayingScene",
        "ownerHash": "4eec60dde1b4179bf7d593597cd2ae3daa988ad2be551447536780fdb23e3bbc",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('THE BELL TURNS — the changed march on the steading!', info.color, 18, 'events')",
        "signature": "'THE BELL TURNS — the changed march on the steading!',info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20248,
        "owner": "updateStrayingScene",
        "ownerHash": "82edb745cd35898da7ce3759cceb93589ded314e94afc50dcb90e44b081c159c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The bell recedes — the changed go with it. The fields run feral.', info.color, 18, 'events')",
        "signature": "'The bell recedes — the changed go with it. The fields run feral.',info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 16988,
        "owner": "updateStrayingScene",
        "ownerHash": "4eec60dde1b4179bf7d593597cd2ae3daa988ad2be551447536780fdb23e3bbc",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The bell recedes — the changed go with it. The fields run feral.', info.color, 18, 'events')",
        "signature": "'The bell recedes — the changed go with it. The fields run feral.',info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20401,
        "owner": "strayingRelief",
        "ownerHash": "c577e526d4e5900a40e8d664f077eaf06642910dcde9f3669b5fb89bfad3b9b4",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(line, color, 18, 'events')",
        "signature": "line,color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17141,
        "owner": "strayingRelief",
        "ownerHash": "586a4d449815025c89dde85e08fde98f9c73664dcab61c826041907f0cb27bba",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(line, color, 18, 'events')",
        "signature": "line,color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20479,
        "owner": "updateDroveScene",
        "ownerHash": "12f1315da070973326418300a129e978015fb1485c192e661e62c3072f8d613b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.phase === 'scattered'\n    ? `The fold of ${this.zone.name} is gone — scavengers range the shires.`\n    : `A pen gave way in ${this.zone.name} — drive the fold back to it ALIVE.`, info.color, 18, 'events')",
        "signature": "info.phase === 'scattered'\n    ? `The fold of ${__news_host__.zone.name} is gone — scavengers range the shires.`\n    : `A pen gave way in ${__news_host__.zone.name} — drive the fold back to it ALIVE.`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17219,
        "owner": "updateDroveScene",
        "ownerHash": "8a8fd7556c1a6755e717c70860ea5f0bf464062a269f9b7b59138f7d9d9483a5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.phase === 'scattered'\n    ? `The fold of ${this.zone.name} is gone — scavengers range the shires.`\n    : `A pen gave way in ${this.zone.name} — drive the fold back to it ALIVE.`, info.color, 18, 'events')",
        "signature": "info.phase === 'scattered'\n    ? `The fold of ${__news_host__.zone.name} is gone — scavengers range the shires.`\n    : `A pen gave way in ${__news_host__.zone.name} — drive the fold back to it ALIVE.`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20553,
        "owner": "updateDroveScene",
        "ownerHash": "12f1315da070973326418300a129e978015fb1485c192e661e62c3072f8d613b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The last head is lost. The fold is gone — scavengers range the shires.', info.color, 18, 'events')",
        "signature": "'The last head is lost. The fold is gone — scavengers range the shires.',info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17293,
        "owner": "updateDroveScene",
        "ownerHash": "8a8fd7556c1a6755e717c70860ea5f0bf464062a269f9b7b59138f7d9d9483a5",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The last head is lost. The fold is gone — scavengers range the shires.', info.color, 18, 'events')",
        "signature": "'The last head is lost. The fold is gone — scavengers range the shires.',info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20666,
        "owner": "droveGathered",
        "ownerHash": "cbf874fa90984f0a13a437b520d0c169e0a4795d5a63a808bd4f86370a5306fe",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The fold is gathered — the reeve settles up.', color, 18, 'events')",
        "signature": "'The fold is gathered — the reeve settles up.',color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17406,
        "owner": "droveGathered",
        "ownerHash": "277cb6ccce58ab8d3522ba3f8d11ee41f1f202a8c52e72c063de0c417f9eb10b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The fold is gathered — the reeve settles up.', color, 18, 'events')",
        "signature": "'The fold is gathered — the reeve settles up.',color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20808,
        "owner": "updateQuickening",
        "ownerHash": "fad162a41dbf8dc24a1bd9360164b2d24ab53640301cd3888c278bd07fcc887b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ground here runs QUICK — level ${info.level} while the window holds. Reap it.`, cfg.color, 18, 'events')",
        "signature": "`The ground here runs QUICK — level ${info.level} while the window holds. Reap it.`,cfg.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17550,
        "owner": "updateQuickening",
        "ownerHash": "2114479ae6f5103d7fcc7a4f71e5b3ea49b6dcb9d0db53862df8cef3742472db",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ground here runs QUICK — level ${info.level} while the window holds. Reap it.`, cfg.color, 18, 'events')",
        "signature": "`The ground here runs QUICK — level ${info.level} while the window holds. Reap it.`,cfg.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20835,
        "owner": "updateQuickening",
        "ownerHash": "fad162a41dbf8dc24a1bd9360164b2d24ab53640301cd3888c278bd07fcc887b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(cfg.echo.announce.replace('{zone}', this.zone.name), cfg.color, 16, 'events')",
        "signature": "cfg.echo.announce.replace('{zone}', __news_host__.zone.name),cfg.color,16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17577,
        "owner": "updateQuickening",
        "ownerHash": "2114479ae6f5103d7fcc7a4f71e5b3ea49b6dcb9d0db53862df8cef3742472db",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(cfg.echo.announce.replace('{zone}', this.zone.name), cfg.color, 16, 'events')",
        "signature": "cfg.echo.announce.replace('{zone}', __news_host__.zone.name),cfg.color,16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 20874,
        "owner": "updateWispScene",
        "ownerHash": "c5f6fb4d7046904f7f90f8a2683d944648458771366d82f029e3bc9b20f5da0b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.ridden > 0 && info.standing === 0 && info.kindled === 0\n    ? `Something ridden waits in ${this.zone.name} — a light found a body here.`\n    : `Lights wait in the reeds of ${this.zone.name}. Touch one, and see.`, col, 18, 'events')",
        "signature": "info.ridden > 0 && info.standing === 0 && info.kindled === 0\n    ? `Something ridden waits in ${__news_host__.zone.name} — a light found a body here.`\n    : `Lights wait in the reeds of ${__news_host__.zone.name}. Touch one, and see.`,col,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17616,
        "owner": "updateWispScene",
        "ownerHash": "b91edd35b476c3f9db948da6489e6abdfb106eee678ace651dc25f74b029eab8",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.ridden > 0 && info.standing === 0 && info.kindled === 0\n    ? `Something ridden waits in ${this.zone.name} — a light found a body here.`\n    : `Lights wait in the reeds of ${this.zone.name}. Touch one, and see.`, col, 18, 'events')",
        "signature": "info.ridden > 0 && info.standing === 0 && info.kindled === 0\n    ? `Something ridden waits in ${__news_host__.zone.name} — a light found a body here.`\n    : `Lights wait in the reeds of ${__news_host__.zone.name}. Touch one, and see.`,col,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21233,
        "owner": "updateLongNight",
        "ownerHash": "d9a11c2682f5f2e8ee5ac7bebb061e59f763dc701ebecf176266767cf2472e72",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Three nights fed — ${name} belongs to the Court now. Burn its coach by day.`, lnf.surge().color, 17, 'events')",
        "signature": "`Three nights fed — ${name} belongs to the Court now. Burn its coach by day.`,lnf.surge().color,17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18053,
        "owner": "longNightWorldChores",
        "ownerHash": "5f121a89c9c84a65c55ff5935e191b81bd40635f0189a35f37bf65b33037897c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Three nights fed — ${name} belongs to the Court now. Burn its coach by day.`, lnf.surge().color, 17, 'events')",
        "signature": "`Three nights fed — ${name} belongs to the Court now. Burn its coach by day.`,lnf.surge().color,17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21235,
        "owner": "updateLongNight",
        "ownerHash": "d9a11c2682f5f2e8ee5ac7bebb061e59f763dc701ebecf176266767cf2472e72",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The COUNTESS takes court at ${name} — the Long Night deepens.`, lnf.surge().color, 18, 'events')",
        "signature": "`The COUNTESS takes court at ${name} — the Long Night deepens.`,lnf.surge().color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18055,
        "owner": "longNightWorldChores",
        "ownerHash": "5f121a89c9c84a65c55ff5935e191b81bd40635f0189a35f37bf65b33037897c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The COUNTESS takes court at ${name} — the Long Night deepens.`, lnf.surge().color, 18, 'events')",
        "signature": "`The COUNTESS takes court at ${name} — the Long Night deepens.`,lnf.surge().color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21268,
        "owner": "updateLongNight",
        "ownerHash": "d9a11c2682f5f2e8ee5ac7bebb061e59f763dc701ebecf176266767cf2472e72",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.converted\n    ? `The Court holds ${this.zone.name} — its coach stands gloom-warded. Burn it by day.`\n    : `A gloom coach is parked in ${this.zone.name} — the Court is feeding here (night ${Math.min(info.fedNights + 1, info.nightsToConvert)} of ${info.nightsToConvert}).`, info.color, 17, 'events')",
        "signature": "info.converted\n    ? `The Court holds ${__news_host__.zone.name} — its coach stands gloom-warded. Burn it by day.`\n    : `A gloom coach is parked in ${__news_host__.zone.name} — the Court is feeding here (night ${Math.min(info.fedNights + 1, info.nightsToConvert)} of ${info.nightsToConvert}).`,info.color,17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 17988,
        "owner": "updateLongNight",
        "ownerHash": "cdaae46e1482bcfb1208522970f94b89253405a52517e56551217928568dce1d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.converted\n    ? `The Court holds ${this.zone.name} — its coach stands gloom-warded. Burn it by day.`\n    : `A gloom coach is parked in ${this.zone.name} — the Court is feeding here (night ${Math.min(info.fedNights + 1, info.nightsToConvert)} of ${info.nightsToConvert}).`, info.color, 17, 'events')",
        "signature": "info.converted\n    ? `The Court holds ${__news_host__.zone.name} — its coach stands gloom-warded. Burn it by day.`\n    : `A gloom coach is parked in ${__news_host__.zone.name} — the Court is feeding here (night ${Math.min(info.fedNights + 1, info.nightsToConvert)} of ${info.nightsToConvert}).`,info.color,17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21282,
        "owner": "updateLongNight",
        "ownerHash": "d9a11c2682f5f2e8ee5ac7bebb061e59f763dc701ebecf176266767cf2472e72",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The COUNTESS holds court here${info.countessLifeFrac < 1 ? ', still wounded' : ''} — break it and the Long Night breaks.`, info.color, 18, 'events')",
        "signature": "`The COUNTESS holds court here${info.countessLifeFrac < 1 ? ', still wounded' : ''} — break it and the Long Night breaks.`,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18002,
        "owner": "updateLongNight",
        "ownerHash": "cdaae46e1482bcfb1208522970f94b89253405a52517e56551217928568dce1d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The COUNTESS holds court here${info.countessLifeFrac < 1 ? ', still wounded' : ''} — break it and the Long Night breaks.`, info.color, 18, 'events')",
        "signature": "`The COUNTESS holds court here${info.countessLifeFrac < 1 ? ', still wounded' : ''} — break it and the Long Night breaks.`,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21449,
        "owner": "updateMigrationStream",
        "ownerHash": "d091eac90af5322ebf4965ce9be3292a4a55deb4772003854ac01469c7910c73",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`A great herd crosses ${this.zone.name} — give them room…`, info.color, 17, 'events')",
        "signature": "`A great herd crosses ${__news_host__.zone.name} — give them room…`,info.color,17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18201,
        "owner": "updateMigrationStream",
        "ownerHash": "d091eac90af5322ebf4965ce9be3292a4a55deb4772003854ac01469c7910c73",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`A great herd crosses ${this.zone.name} — give them room…`, info.color, 17, 'events')",
        "signature": "`A great herd crosses ${__news_host__.zone.name} — give them room…`,info.color,17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21616,
        "owner": "materializeBrood",
        "ownerHash": "2cf08880a5c4a7854ac1e093aeed04cccb9a750b0cd61a3c2c49b37159b82aef",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The sand hums — ${info.standing} hive throat${info.standing === 1 ? '' : 's'} stand here (${info.tally}/${info.threshold} and the swarm wings)`, info.color, 15, 'events')",
        "signature": "`The sand hums — ${info.standing} hive throat${info.standing === 1 ? '' : 's'} stand here (${info.tally}/${info.threshold} and the swarm wings)`,info.color,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1348,
        "owner": "birthMaterializeBrood",
        "ownerHash": "bd85d617ebde92c8fed6fb2fb898e651ba060084c68e15f76c90988129f2810b",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice(`The sand hums — ${info.standing} hive throat${info.standing === 1 ? '' : 's'} stand here (${info.tally}/${info.threshold} and the swarm wings)`, info.color, 15, 'events')",
        "signature": "`The sand hums — ${info.standing} hive throat${info.standing === 1 ? '' : 's'} stand here (${info.tally}/${info.threshold} and the swarm wings)`,info.color,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21637,
        "owner": "materializeSwarmWake",
        "ownerHash": "146bf0b2d2c8385fb421aa4db0ed3c03961e75eccbe8a28b6a4114aa5e6cad56",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('Amber glistens in the swarm\\'s wake…', '#f0c060', 14, 'events')",
        "signature": "'Amber glistens in the swarm\\'s wake…','#f0c060',14,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneRuntimeBirth.ts",
        "line": 1366,
        "owner": "birthMaterializeSwarmWake",
        "ownerHash": "d7a5480cb0b97f55bdc86f34e10681912bcf4baae88f2406999b3f72609b6a53",
        "method": "notice",
        "receiver": "nativeHost",
        "call": "nativeHost.notice('Amber glistens in the swarm\\'s wake…', '#f0c060', 14, 'events')",
        "signature": "'Amber glistens in the swarm\\'s wake…','#f0c060',14,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21655,
        "owner": "updateSwarmStream",
        "ownerHash": "79dd31bbedae12614b058910146436edc7dee3781d20532a83593d6cbd761d67",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The sky crawls — the Swarming pours over ${this.zone.name}!`, info.color, 17, 'events')",
        "signature": "`The sky crawls — the Swarming pours over ${__news_host__.zone.name}!`,info.color,17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18369,
        "owner": "updateSwarmStream",
        "ownerHash": "79dd31bbedae12614b058910146436edc7dee3781d20532a83593d6cbd761d67",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The sky crawls — the Swarming pours over ${this.zone.name}!`, info.color, 17, 'events')",
        "signature": "`The sky crawls — the Swarming pours over ${__news_host__.zone.name}!`,info.color,17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21781,
        "owner": "updateBrigands",
        "ownerHash": "9799d4abedc10fac8339cb024aeae74ddd7d96d610e0f48e2041b45eab8942ae",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The brigands drift on, seeking easier marks…', '#d8a24a', 14, 'events')",
        "signature": "'The brigands drift on, seeking easier marks…','#d8a24a',14,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18495,
        "owner": "updateBrigands",
        "ownerHash": "9799d4abedc10fac8339cb024aeae74ddd7d96d610e0f48e2041b45eab8942ae",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The brigands drift on, seeking easier marks…', '#d8a24a', 14, 'events')",
        "signature": "'The brigands drift on, seeking easier marks…','#d8a24a',14,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 21937,
        "owner": "updateWorldBossWalls",
        "ownerHash": "57eda0cb4eaec6e8fd6e3991fa165ec37427b103323e9c0115507db65c5fee56",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the coils crumble — the pass is open!', '#c8a03c', 15, 'events')",
        "signature": "'the coils crumble — the pass is open!','#c8a03c',15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18653,
        "owner": "updateWorldBossWalls",
        "ownerHash": "57eda0cb4eaec6e8fd6e3991fa165ec37427b103323e9c0115507db65c5fee56",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the coils crumble — the pass is open!', '#c8a03c', 15, 'events')",
        "signature": "'the coils crumble — the pass is open!','#c8a03c',15,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 22078,
        "owner": "updateNecropolis",
        "ownerHash": "7df9371511e0e7736be18d2db3ee1365366aab8a57ac253eeb8d27a4eacceb9c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The Necropolis drifts beyond reach…', '#b0a888', 15, 'events')",
        "signature": "'The Necropolis drifts beyond reach…','#b0a888',15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 18755,
        "owner": "updateNecropolis",
        "ownerHash": "7df9371511e0e7736be18d2db3ee1365366aab8a57ac253eeb8d27a4eacceb9c",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The Necropolis drifts beyond reach…', '#b0a888', 15, 'events')",
        "signature": "'The Necropolis drifts beyond reach…','#b0a888',15,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24457,
        "owner": "noteBountyReady",
        "ownerHash": "4d97c848645ee9dd131fa15be7b406db26539ed389c394640763e15df1c37252",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(standing === 'ready'\n    ? (this.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')\n    : 'The ask has failed — return to the bounty board to hand the posting back.', BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "standing === 'ready'\n    ? (__news_host__.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')\n    : 'The ask has failed — return to the bounty board to hand the posting back.',BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneBounty.ts",
        "line": 141,
        "owner": "sceneNoteBountyReady",
        "ownerHash": "908d81198e0f5bb40c7923d7d6e264b9ecc39161620f903bca5317dc150b1147",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(standing === 'ready'\n    ? (host.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')\n    : 'The ask has failed — return to the bounty board to hand the posting back.', BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "standing === 'ready'\n    ? (__news_host__.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')\n    : 'The ask has failed — return to the bounty board to hand the posting back.',BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24556,
        "owner": "forgeBegin",
        "ownerHash": "88c84753994ad2e3228681289ceab6229a12c008d82fb2e87ce9651dacd9b791",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ruined line still smarts — the writ rests ${Math.ceil(rest)}s more.`, BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "`The ruined line still smarts — the writ rests ${Math.ceil(rest)}s more.`,BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 20974,
        "owner": "forgeBegin",
        "ownerHash": "344b04d54e55ba08328932288d76d5f3995eabac7aa5e93d5a9212e8b878e027",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The ruined line still smarts — the writ rests ${Math.ceil(rest)}s more.`, BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "`The ruined line still smarts — the writ rests ${Math.ceil(rest)}s more.`,BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24562,
        "owner": "forgeBegin",
        "ownerHash": "88c84753994ad2e3228681289ceab6229a12c008d82fb2e87ce9651dacd9b791",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The hand is not steady yet — let the blood cool.', BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "'The hand is not steady yet — let the blood cool.',BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 20982,
        "owner": "forgeBegin",
        "ownerHash": "344b04d54e55ba08328932288d76d5f3995eabac7aa5e93d5a9212e8b878e027",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The hand is not steady yet — let the blood cool.', BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "'The hand is not steady yet — let the blood cool.',BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24588,
        "owner": "forgeCancel",
        "ownerHash": "e4e5a5c0462042f526980cdb4ae06b27b3a8dc7a3cdc9811a81ffbd9409cf47d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The hand steps away — the writ endures.', BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "'The hand steps away — the writ endures.',BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21008,
        "owner": "forgeCancel",
        "ownerHash": "e4e5a5c0462042f526980cdb4ae06b27b3a8dc7a3cdc9811a81ffbd9409cf47d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The hand steps away — the writ endures.', BOUNTY_BOARD_CFG.accent, 13, 'civic')",
        "signature": "'The hand steps away — the writ endures.',BOUNTY_BOARD_CFG.accent,13,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24619,
        "owner": "traceSettle",
        "ownerHash": "b45600080b26d162a7cde631bff6c9895933dd798699c62762b2c7a3216a26dd",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The hand slipped once too often — the piece is ruined; the writ endures (rests ${TRACE_CFG.failCooldownSec}s).`, BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "`The hand slipped once too often — the piece is ruined; the writ endures (rests ${TRACE_CFG.failCooldownSec}s).`,BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21039,
        "owner": "traceSettle",
        "ownerHash": "b45600080b26d162a7cde631bff6c9895933dd798699c62762b2c7a3216a26dd",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The hand slipped once too often — the piece is ruined; the writ endures (rests ${TRACE_CFG.failCooldownSec}s).`, BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "`The hand slipped once too often — the piece is ruined; the writ endures (rests ${TRACE_CFG.failCooldownSec}s).`,BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 24639,
        "owner": "traceSettle",
        "ownerHash": "b45600080b26d162a7cde631bff6c9895933dd798699c62762b2c7a3216a26dd",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`FORGED — ${face} (${Math.round(v.accuracy * 100)}%).`, BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "`FORGED — ${face} (${Math.round(v.accuracy * 100)}%).`,BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21059,
        "owner": "traceSettle",
        "ownerHash": "b45600080b26d162a7cde631bff6c9895933dd798699c62762b2c7a3216a26dd",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`FORGED — ${face} (${Math.round(v.accuracy * 100)}%).`, BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "`FORGED — ${face} (${Math.round(v.accuracy * 100)}%).`,BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25030,
        "owner": "reconcileBounties",
        "ownerHash": "feb2079219250161e2959b609a9db590c23feec0fd75e13c7c96d6769f678678",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The bounty is annulled — ${reason}. The hand is free.`, BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "`The bounty is annulled — ${reason}. The hand is free.`,BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21469,
        "owner": "reconcileBounties",
        "ownerHash": "feb2079219250161e2959b609a9db590c23feec0fd75e13c7c96d6769f678678",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The bounty is annulled — ${reason}. The hand is free.`, BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "`The bounty is annulled — ${reason}. The hand is free.`,BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25049,
        "owner": "acceptBounty",
        "ownerHash": "e1503132e22f9926696325063bbdac174ae4146980f4fd0cb3be5b765123321e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('One bounty in hand at a time — see the taken work through first.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'One bounty in hand at a time — see the taken work through first.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21492,
        "owner": "acceptBounty",
        "ownerHash": "a63e5fe45c483e19477f5b0a05b8655f96cdf14a2b64599c8057d8b4025d7da1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('One bounty in hand at a time — see the taken work through first.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'One bounty in hand at a time — see the taken work through first.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25055,
        "owner": "acceptBounty",
        "ownerHash": "e1503132e22f9926696325063bbdac174ae4146980f4fd0cb3be5b765123321e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The posting is struck — ${reason}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "`The posting is struck — ${reason}.`,BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21498,
        "owner": "acceptBounty",
        "ownerHash": "a63e5fe45c483e19477f5b0a05b8655f96cdf14a2b64599c8057d8b4025d7da1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The posting is struck — ${reason}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "`The posting is struck — ${reason}.`,BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25064,
        "owner": "acceptBounty",
        "ownerHash": "e1503132e22f9926696325063bbdac174ae4146980f4fd0cb3be5b765123321e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The approach is blocked or beyond this board’s travel budget. The posting remains on the slate.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The approach is blocked or beyond this board’s travel budget. The posting remains on the slate.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21507,
        "owner": "acceptBounty",
        "ownerHash": "a63e5fe45c483e19477f5b0a05b8655f96cdf14a2b64599c8057d8b4025d7da1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The approach is blocked or beyond this board’s travel budget. The posting remains on the slate.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The approach is blocked or beyond this board’s travel budget. The posting remains on the slate.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25070,
        "owner": "acceptBounty",
        "ownerHash": "e1503132e22f9926696325063bbdac174ae4146980f4fd0cb3be5b765123321e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The posting is struck — ${actRefusal}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "`The posting is struck — ${actRefusal}.`,BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21513,
        "owner": "acceptBounty",
        "ownerHash": "a63e5fe45c483e19477f5b0a05b8655f96cdf14a2b64599c8057d8b4025d7da1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`The posting is struck — ${actRefusal}.`, BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "`The posting is struck — ${actRefusal}.`,BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25093,
        "owner": "acceptBounty",
        "ownerHash": "e1503132e22f9926696325063bbdac174ae4146980f4fd0cb3be5b765123321e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Bounty taken: ${c.title}. Pay on return: ${describeBountyPay(p.pay)}.`, BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "`Bounty taken: ${c.title}. Pay on return: ${describeBountyPay(p.pay)}.`,BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21537,
        "owner": "acceptBounty",
        "ownerHash": "a63e5fe45c483e19477f5b0a05b8655f96cdf14a2b64599c8057d8b4025d7da1",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Bounty taken: ${c.title}. Pay on return: ${describeBountyPay(p.pay)}.`, BOUNTY_BOARD_CFG.accent, 16, 'civic')",
        "signature": "`Bounty taken: ${c.title}. Pay on return: ${describeBountyPay(p.pay)}.`,BOUNTY_BOARD_CFG.accent,16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25138,
        "owner": "setBountyLock",
        "ownerHash": "e71a8ce021741719eaff07e5353f486032a9b1d27513c0d38b762df97240e2e3",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(this.bountyLockCapacity() === 0\n    ? 'The board holds no reserve pins — the Vault sells the service.'\n    : 'Every reserve pin is spoken for — release one first.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "__news_host__.bountyLockCapacity() === 0\n    ? 'The board holds no reserve pins — the Vault sells the service.'\n    : 'Every reserve pin is spoken for — release one first.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21583,
        "owner": "setBountyLock",
        "ownerHash": "71a3aa9c80dae56ac4b393d37752eb5eb666032e64016896ea0df25a0ed33806",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(this.bountyLockCapacity() === 0\n    ? 'The board holds no reserve pins — the Vault sells the service.'\n    : 'Every reserve pin is spoken for — release one first.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "__news_host__.bountyLockCapacity() === 0\n    ? 'The board holds no reserve pins — the Vault sells the service.'\n    : 'Every reserve pin is spoken for — release one first.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25157,
        "owner": "abandonBounty",
        "ownerHash": "763d55f0056c531264c9e4e52482e35c893a699e3ac398d61dda00795f01ba8f",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The posting is forfeit — the board keeps its silence.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The posting is forfeit — the board keeps its silence.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21602,
        "owner": "abandonBounty",
        "ownerHash": "2f0d45763f8a468a3b418c6ed5d41f8fc80d20ea26b14a437d0f6deaae6b8837",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The posting is forfeit — the board keeps its silence.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The posting is forfeit — the board keeps its silence.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25183,
        "owner": "turnInBounty",
        "ownerHash": "dac4e52c13e41ae4e76483c725fcc578ec00f8d27bbaf33b4382403c018b2d6a",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The board takes the failed posting back — no pay, no debt.', BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "'The board takes the failed posting back — no pay, no debt.',BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21628,
        "owner": "turnInBounty",
        "ownerHash": "28a857a7d1469e6dda2a97f679331066cc25c8689c4d9eb4cc93d454c5e3145b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The board takes the failed posting back — no pay, no debt.', BOUNTY_BOARD_CFG.accent, 15, 'civic')",
        "signature": "'The board takes the failed posting back — no pay, no debt.',BOUNTY_BOARD_CFG.accent,15,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25192,
        "owner": "turnInBounty",
        "ownerHash": "dac4e52c13e41ae4e76483c725fcc578ec00f8d27bbaf33b4382403c018b2d6a",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The work stands unfinished — the ask is printed on the card.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The work stands unfinished — the ask is printed on the card.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21637,
        "owner": "turnInBounty",
        "ownerHash": "28a857a7d1469e6dda2a97f679331066cc25c8689c4d9eb4cc93d454c5e3145b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The work stands unfinished — the ask is printed on the card.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The work stands unfinished — the ask is printed on the card.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 25262,
        "owner": "payBountyComponent",
        "ownerHash": "2ee0cbfcd195043c4e7cda20dd414d9472a70f85d38717cbfee79d29445720ba",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The promised piece is gone from the world — the board pays in essence.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The promised piece is gone from the world — the board pays in essence.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 21710,
        "owner": "payBountyComponent",
        "ownerHash": "2ee0cbfcd195043c4e7cda20dd414d9472a70f85d38717cbfee79d29445720ba",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The promised piece is gone from the world — the board pays in essence.', BOUNTY_BOARD_CFG.accent, 14, 'civic')",
        "signature": "'The promised piece is gone from the world — the board pays in essence.',BOUNTY_BOARD_CFG.accent,14,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26035,
        "owner": "buyHarborChart",
        "ownerHash": "b3e036a931635baa83cff42149e6bea5cf87783c12c2a8dfd90892acd78a7df6",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The chart is inked — far country is marked on your map.', '#7fd0ff', 15, 'civic')",
        "signature": "'The chart is inked — far country is marked on your map.','#7fd0ff',15,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22468,
        "owner": "buyHarborChart",
        "ownerHash": "b3e036a931635baa83cff42149e6bea5cf87783c12c2a8dfd90892acd78a7df6",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The chart is inked — far country is marked on your map.', '#7fd0ff', 15, 'civic')",
        "signature": "'The chart is inked — far country is marked on your map.','#7fd0ff',15,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26167,
        "owner": "bootHarborhold",
        "ownerHash": "72006d4f45d3eb2f237ce89c315a656dc4df03d57cd372a93b81b5e9d38e55a8",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} stands besieged — sound the horn at the gate to break it`, '#e8a050', 15, 'war')",
        "signature": "`${def.name} stands besieged — sound the horn at the gate to break it`,'#e8a050',15,'war'"
      },
      "current": {
        "file": "src/engine/nativeSceneHarbor.ts",
        "line": 159,
        "owner": "harborBootHarborhold",
        "ownerHash": "f7a00b115af349ff6a507f93932c4057a89d0d96ecd47c1502483baf44c803e0",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`${def.name} stands besieged — sound the horn at the gate to break it`, '#e8a050', 15, 'war')",
        "signature": "`${def.name} stands besieged — sound the horn at the gate to break it`,'#e8a050',15,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26410,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`the board rests — fresh writs in ${left} minute${left === 1 ? '' : 's'}`, '#c8b048', 13, 'civic')",
        "signature": "`the board rests — fresh writs in ${left} minute${left === 1 ? '' : 's'}`,'#c8b048',13,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22592,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`the board rests — fresh writs in ${left} minute${left === 1 ? '' : 's'}`, '#c8b048', 13, 'civic')",
        "signature": "`the board rests — fresh writs in ${left} minute${left === 1 ? '' : 's'}`,'#c8b048',13,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26416,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the coast is quiet — no quarry worth a writ', '#c8b048', 13, 'civic')",
        "signature": "'the coast is quiet — no quarry worth a writ','#c8b048',13,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22598,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the coast is quiet — no quarry worth a writ', '#c8b048', 13, 'civic')",
        "signature": "'the coast is quiet — no quarry worth a writ','#c8b048',13,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26440,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${posted} writ${posted === 1 ? '' : 's'} posted — the coast wants clearing`, '#e8a84a', 15, 'civic')",
        "signature": "`${posted} writ${posted === 1 ? '' : 's'} posted — the coast wants clearing`,'#e8a84a',15,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22622,
        "owner": "postHoldWrits",
        "ownerHash": "af726640f8c769fc165aa6d18d11ebbdc31f4dee8cf50eb710423dc85cc1019d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${posted} writ${posted === 1 ? '' : 's'} posted — the coast wants clearing`, '#e8a84a', 15, 'civic')",
        "signature": "`${posted} writ${posted === 1 ? '' : 's'} posted — the coast wants clearing`,'#e8a84a',15,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26735,
        "owner": "buyHoldRestore",
        "ownerHash": "c98c70e45c80efdb8104deccdacceb7af5975876509ec2b2b97b370d032fc3df",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} is raised from its ashes — break the siege to open its gates`, '#7fd0ff', 15, 'war')",
        "signature": "`${def.name} is raised from its ashes — break the siege to open its gates`,'#7fd0ff',15,'war'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22921,
        "owner": "buyHoldRestore",
        "ownerHash": "c98c70e45c80efdb8104deccdacceb7af5975876509ec2b2b97b370d032fc3df",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} is raised from its ashes — break the siege to open its gates`, '#7fd0ff', 15, 'war')",
        "signature": "`${def.name} is raised from its ashes — break the siege to open its gates`,'#7fd0ff',15,'war'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26756,
        "owner": "updateHarborholds",
        "ownerHash": "42a8fb61969ad0ebe6a79714aa4ed052e2953938a9cb493343c276dd000a6f95",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} stands rebuilt — and besieged anew`, '#e8a050', 14, 'war')",
        "signature": "`${def.name} stands rebuilt — and besieged anew`,'#e8a050',14,'war'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22947,
        "owner": "updateHarborholds",
        "ownerHash": "464a297e6259fb3fb01b53a31d87662fe285a36ebf3c0b73a8532b0647652383",
        "method": "notice",
        "receiver": "w",
        "call": "w.notice(`${def.name} stands rebuilt — and besieged anew`, '#e8a050', 14, 'war')",
        "signature": "`${def.name} stands rebuilt — and besieged anew`,'#e8a050',14,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26771,
        "owner": "updateHarborholds",
        "ownerHash": "42a8fb61969ad0ebe6a79714aa4ed052e2953938a9cb493343c276dd000a6f95",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} is besieged — sound the horn!`, '#e85050', 16, 'war')",
        "signature": "`${def.name} is besieged — sound the horn!`,'#e85050',16,'war'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22962,
        "owner": "updateHarborholds",
        "ownerHash": "464a297e6259fb3fb01b53a31d87662fe285a36ebf3c0b73a8532b0647652383",
        "method": "notice",
        "receiver": "w",
        "call": "w.notice(`${def.name} is besieged — sound the horn!`, '#e85050', 16, 'war')",
        "signature": "`${def.name} is besieged — sound the horn!`,'#e85050',16,'war'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26773,
        "owner": "updateHarborholds",
        "ownerHash": "42a8fb61969ad0ebe6a79714aa4ed052e2953938a9cb493343c276dd000a6f95",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`word comes: ${def.name} is under siege`, '#e8a050', 14, 'war')",
        "signature": "`word comes: ${def.name} is under siege`,'#e8a050',14,'war'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22965,
        "owner": "updateHarborholds",
        "ownerHash": "464a297e6259fb3fb01b53a31d87662fe285a36ebf3c0b73a8532b0647652383",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`word comes: ${def.name} is under siege`, '#e8a050', 14, 'war')",
        "signature": "`word comes: ${def.name} is under siege`,'#e8a050',14,'war'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26782,
        "owner": "updateHarborholds",
        "ownerHash": "42a8fb61969ad0ebe6a79714aa4ed052e2953938a9cb493343c276dd000a6f95",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} has fallen to the tide`, '#e85050', 14, 'war')",
        "signature": "`${def.name} has fallen to the tide`,'#e85050',14,'war'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 22975,
        "owner": "updateHarborholds",
        "ownerHash": "464a297e6259fb3fb01b53a31d87662fe285a36ebf3c0b73a8532b0647652383",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${def.name} has fallen to the tide`, '#e85050', 14, 'war')",
        "signature": "`${def.name} has fallen to the tide`,'#e85050',14,'war'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 26970,
        "owner": "enterSailing",
        "ownerHash": "d9bced5e4ecb086d2ac29c28c7dddb03ffe9da0ee2cbfa4a54c14522dc26414b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`you cast off aboard the ${this.voyage.ship.name} — sail for any shore, linger to land`, '#7fd0ff', 15, 'world')",
        "signature": "`you cast off aboard the ${__news_host__.voyage.ship.name} — sail for any shore, linger to land`,'#7fd0ff',15,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23159,
        "owner": "enterSailing",
        "ownerHash": "d9bced5e4ecb086d2ac29c28c7dddb03ffe9da0ee2cbfa4a54c14522dc26414b",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`you cast off aboard the ${this.voyage.ship.name} — sail for any shore, linger to land`, '#7fd0ff', 15, 'world')",
        "signature": "`you cast off aboard the ${__news_host__.voyage.ship.name} — sail for any shore, linger to land`,'#7fd0ff',15,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27187,
        "owner": "updateWraithsailAtSea",
        "ownerHash": "7fa24d39fbfe3e0834a99dc9d229d886551726ded57cc4974575d8c981db9c79",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('a ghost sail crosses the horizon — the WRAITHSAIL is abroad', '#7ad8d8', 16, 'events')",
        "signature": "'a ghost sail crosses the horizon — the WRAITHSAIL is abroad','#7ad8d8',16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23262,
        "owner": "updateWraithsailAtSea",
        "ownerHash": "7fa24d39fbfe3e0834a99dc9d229d886551726ded57cc4974575d8c981db9c79",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('a ghost sail crosses the horizon — the WRAITHSAIL is abroad', '#7ad8d8', 16, 'events')",
        "signature": "'a ghost sail crosses the horizon — the WRAITHSAIL is abroad','#7ad8d8',16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27237,
        "owner": "beginWraithsailBoarding",
        "ownerHash": "0f922fe2f537405034556ac58321d70b46660b266f27e026afc759d14b576127",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('you come alongside and board the WRAITHSAIL — her crew keeps the old courtesies', '#7ad8d8', 17, 'events')",
        "signature": "'you come alongside and board the WRAITHSAIL — her crew keeps the old courtesies','#7ad8d8',17,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23312,
        "owner": "beginWraithsailBoarding",
        "ownerHash": "0f922fe2f537405034556ac58321d70b46660b266f27e026afc759d14b576127",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('you come alongside and board the WRAITHSAIL — her crew keeps the old courtesies', '#7ad8d8', 17, 'events')",
        "signature": "'you come alongside and board the WRAITHSAIL — her crew keeps the old courtesies','#7ad8d8',17,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27266,
        "owner": "updateWraithsailDock",
        "ownerHash": "7fec856d7a75419e45bdebcccd75c0c243494896876840717de0bc64d2da69eb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`the WRAITHSAIL lies alongside ${this.zone.name} — the Drowned Court walks ashore!`, '#bfe8ec', 18, 'events')",
        "signature": "`the WRAITHSAIL lies alongside ${__news_host__.zone.name} — the Drowned Court walks ashore!`,'#bfe8ec',18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23341,
        "owner": "updateWraithsailDock",
        "ownerHash": "7fec856d7a75419e45bdebcccd75c0c243494896876840717de0bc64d2da69eb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`the WRAITHSAIL lies alongside ${this.zone.name} — the Drowned Court walks ashore!`, '#bfe8ec', 18, 'events')",
        "signature": "`the WRAITHSAIL lies alongside ${__news_host__.zone.name} — the Drowned Court walks ashore!`,'#bfe8ec',18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27271,
        "owner": "updateWraithsailDock",
        "ownerHash": "7fec856d7a75419e45bdebcccd75c0c243494896876840717de0bc64d2da69eb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the court is driven back to the water — the Wraithsail slips her mooring', '#bfe8ec', 16, 'events')",
        "signature": "'the court is driven back to the water — the Wraithsail slips her mooring','#bfe8ec',16,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23346,
        "owner": "updateWraithsailDock",
        "ownerHash": "7fec856d7a75419e45bdebcccd75c0c243494896876840717de0bc64d2da69eb",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('the court is driven back to the water — the Wraithsail slips her mooring', '#bfe8ec', 16, 'events')",
        "signature": "'the court is driven back to the water — the Wraithsail slips her mooring','#bfe8ec',16,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27348,
        "owner": "landAshore",
        "ownerHash": "74e53e594c6f6b97e6d0e2f5ef6d5c84b03bdccb3c221fd9ec1e04b7f672c34d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`you make landfall — ${dest.name}`, '#7fd0ff', 15, 'world')",
        "signature": "`you make landfall — ${dest.name}`,'#7fd0ff',15,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23423,
        "owner": "landAshore",
        "ownerHash": "74e53e594c6f6b97e6d0e2f5ef6d5c84b03bdccb3c221fd9ec1e04b7f672c34d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`you make landfall — ${dest.name}`, '#7fd0ff', 15, 'world')",
        "signature": "`you make landfall — ${dest.name}`,'#7fd0ff',15,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 27350,
        "owner": "landAshore",
        "ownerHash": "74e53e594c6f6b97e6d0e2f5ef6d5c84b03bdccb3c221fd9ec1e04b7f672c34d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(isleDef.blurb, '#9ad0e8', 13, 'world')",
        "signature": "isleDef.blurb,'#9ad0e8',13,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 23425,
        "owner": "landAshore",
        "ownerHash": "74e53e594c6f6b97e6d0e2f5ef6d5c84b03bdccb3c221fd9ec1e04b7f672c34d",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(isleDef.blurb, '#9ad0e8', 13, 'world')",
        "signature": "isleDef.blurb,'#9ad0e8',13,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 28192,
        "owner": "scanNemesisSurvivors",
        "ownerHash": "15ef81f1d5c0e836c207e258933279506160fc7b5129debb192869feeeda1a92",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Something you left alive will remember the name ${this.meta.name}.`, '#c8a84b', 13, 'events')",
        "signature": "`Something you left alive will remember the name ${__news_host__.meta.name}.`,'#c8a84b',13,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneCampaignTransitions.ts",
        "line": 523,
        "owner": "sceneScanNemesisSurvivors",
        "ownerHash": "5f171f029953af1b17cf053c72df9f73707f9cd1f309e1145a0460ca4dbf9391",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`Something you left alive will remember the name ${host.meta.name}.`, '#c8a84b', 13, 'events')",
        "signature": "`Something you left alive will remember the name ${__news_host__.meta.name}.`,'#c8a84b',13,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 28248,
        "owner": "spawnNemesisActor",
        "ownerHash": "44759b01566b2256286fa71c928b22fd87afbf719813be03c2567bcf0e600e26",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${a.name} ${hunts}.`, rank.tint, 15, 'events')",
        "signature": "`${a.name} ${hunts}.`,rank.tint,15,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneHistory.ts",
        "line": 115,
        "owner": "historySpawnNemesisActor",
        "ownerHash": "30c026d4bfb7e29bb71f59d98c34f2d8e86589cd6866a7d6aa0ea42745b1571c",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`${a.name} ${hunts}.`, rank.tint, 15, 'events')",
        "signature": "`${a.name} ${hunts}.`,rank.tint,15,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 28270,
        "owner": "applyGrudgeEffects",
        "ownerHash": "44a01d2c89779effb66ddcf7673286a0b273a3d3deef89d2547b971dc7e0cd5a",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(tier.entryLine.replace('{faction}', fac).replace('{name}', this.meta.name), '#c88888', 13, 'events')",
        "signature": "tier.entryLine.replace('{faction}', fac).replace('{name}', __news_host__.meta.name),'#c88888',13,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneHistory.ts",
        "line": 134,
        "owner": "historyApplyGrudgeEffects",
        "ownerHash": "b7552196b59b38a8b1f6b86590ed167f7c68dbaeb9e5a0890a302c0b639896af",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(tier.entryLine.replace('{faction}', fac).replace('{name}', host.meta.name), '#c88888', 13, 'events')",
        "signature": "tier.entryLine.replace('{faction}', fac).replace('{name}', __news_host__.meta.name),'#c88888',13,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 28856,
        "owner": "acceptOdysseyCompatibleQuest",
        "ownerHash": "5bbe1532063dbebeee7275095c735b225a4d6ac2082057aec59e24e6b7933b48",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Quest: ${q.offerLabel} — head ${dirName}.`, '#c8a8e8', 16, 'civic')",
        "signature": "`Quest: ${q.offerLabel} — head ${dirName}.`,'#c8a8e8',16,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneQuests.ts",
        "line": 607,
        "owner": "sceneAcceptOdysseyCompatibleQuest",
        "ownerHash": "da897d96815c9841716c65ff4ddb341c8ac45acf065c833bee9c80885eb789bb",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`Quest: ${q.offerLabel} — head ${dirName}.`, '#c8a8e8', 16, 'civic')",
        "signature": "`Quest: ${q.offerLabel} — head ${dirName}.`,'#c8a8e8',16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 28899,
        "owner": "onQuestZoneFieldCleared",
        "ownerHash": "6cd0e2817cfc88d0794116e45b5c475cad467cbe09ecd0d4aad22fcfbcad5679",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(q.turnIn.prompt ?? 'Objective complete — return to the quartermaster to claim your reward.', '#ffd700', 16, 'civic')",
        "signature": "q.turnIn.prompt ?? 'Objective complete — return to the quartermaster to claim your reward.','#ffd700',16,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneQuests.ts",
        "line": 172,
        "owner": "sceneCompleteQuestField",
        "ownerHash": "5c75f5435d83063f5a69f1ecb319ed0300198098ad484d2e220e6b70c77fe825",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(q.turnIn.prompt ?? 'Objective complete — return to the quartermaster to claim your reward.', '#ffd700', 16, 'civic')",
        "signature": "q.turnIn.prompt ?? 'Objective complete — return to the quartermaster to claim your reward.','#ffd700',16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 29011,
        "owner": "onQuestZoneCleared",
        "ownerHash": "c959f7ef0d31e3495e974a21387cf23343698ef01395a1035d83747f9edf1a42",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Bounty complete: ${q.offerLabel} — ${describeBountyPay(posting.pay)}.`, BOUNTY_BOARD_CFG.accent, 18, 'civic')",
        "signature": "`Bounty complete: ${q.offerLabel} — ${describeBountyPay(posting.pay)}.`,BOUNTY_BOARD_CFG.accent,18,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneQuests.ts",
        "line": 317,
        "owner": "sceneOnQuestZoneCleared",
        "ownerHash": "6e6d780008129e47eddaeef4cc8e3a118d24e326004fd5951a83a1fe90077107",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`Bounty complete: ${q.offerLabel} — ${describeBountyPay(posting.pay)}.`, BOUNTY_BOARD_CFG.accent, 18, 'civic')",
        "signature": "`Bounty complete: ${q.offerLabel} — ${describeBountyPay(posting.pay)}.`,BOUNTY_BOARD_CFG.accent,18,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 29026,
        "owner": "onQuestZoneCleared",
        "ownerHash": "c959f7ef0d31e3495e974a21387cf23343698ef01395a1035d83747f9edf1a42",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`Quest complete: ${q.offerLabel}!`, '#ffd700', 18, 'civic')",
        "signature": "`Quest complete: ${q.offerLabel}!`,'#ffd700',18,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneQuests.ts",
        "line": 332,
        "owner": "sceneOnQuestZoneCleared",
        "ownerHash": "6e6d780008129e47eddaeef4cc8e3a118d24e326004fd5951a83a1fe90077107",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`Quest complete: ${q.offerLabel}!`, '#ffd700', 18, 'civic')",
        "signature": "`Quest complete: ${q.offerLabel}!`,'#ffd700',18,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 29123,
        "owner": "claimQuestImbue",
        "ownerHash": "ee5290dc5e7eda563b7e0467404d39db4bb06d232fa581caa895b84dc109af80",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`, ITEM_RARITIES.rare.color, 16, 'civic')",
        "signature": "`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`,ITEM_RARITIES.rare.color,16,'civic'"
      },
      "current": {
        "file": "src/engine/nativeSceneQuestInteraction.ts",
        "line": 383,
        "owner": "sceneClaimQuestImbue",
        "ownerHash": "db010d4848999f7c0bf662cac932cfc2379470d6c53ae41c900713808ed880f0",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice(`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`, ITEM_RARITIES.rare.color, 16, 'civic')",
        "signature": "`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`,ITEM_RARITIES.rare.color,16,'civic'"
      },
      "relation": "exact arguments",
      "contributes": true
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 38471,
        "owner": "executeSkill",
        "ownerHash": "30f74a62bfdb4719e879a76ab1d46f0ab1312a837b5624eb2abf517afc3c23aa",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`ART WITNESSED: ${def.name}`, '#c8a0e8', 14, 'world')",
        "signature": "`ART WITNESSED: ${def.name}`,'#c8a0e8',14,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 32903,
        "owner": "executeSkill",
        "ownerHash": "85385fab463ec6768d2a471581ca5cadcd24422d61be9d5bc6b55668cd04102e",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`ART WITNESSED: ${def.name}`, '#c8a0e8', 14, 'world')",
        "signature": "`ART WITNESSED: ${def.name}`,'#c8a0e8',14,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 43486,
        "owner": "resolveHit",
        "ownerHash": "6122426de672eac3ef9bc41fce415faf6388cfa3bc2403b24846d6e6a1e36cef",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`ART CAPTURED: ${def.name}`, '#c8a0e8', 14, 'world')",
        "signature": "`ART CAPTURED: ${def.name}`,'#c8a0e8',14,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 36818,
        "owner": "resolveHit",
        "ownerHash": "c70858391b77768b885f9d5cc0df1be956f23e0806e6242a94df8ff1f90e37f4",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(`ART CAPTURED: ${def.name}`, '#c8a0e8', 14, 'world')",
        "signature": "`ART CAPTURED: ${def.name}`,'#c8a0e8',14,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 46005,
        "owner": "killCtx",
        "ownerHash": "f4fb2bd67e656b6cb77c53b07c54fa68214963807dfa7ccc86261920b69195d8",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(msg, color, size, channel)",
        "signature": "msg,color,size,channel"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 39201,
        "owner": "killCtx",
        "ownerHash": "2c8cde42d4446cf4fbee66a5ca153fe78c73a88fd5516963a0c039412131c922",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(msg, color, size, channel)",
        "signature": "msg,color,size,channel"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 47573,
        "owner": "containerPlace",
        "ownerHash": "e131e8504917bc64ff3b7fd17a2cffffce32fb8228d100cb8a674d7986ef9df4",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The charm wakes. Its power is yours while seated. Expand your case in the Vault.', '#d8c28a', 18, 'civic')",
        "signature": "'The charm wakes. Its power is yours while seated. Expand your case in the Vault.','#d8c28a',18,'civic'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 40656,
        "owner": "containerPlace",
        "ownerHash": "e131e8504917bc64ff3b7fd17a2cffffce32fb8228d100cb8a674d7986ef9df4",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The charm wakes. Its power is yours while seated. Expand your case in the Vault.', '#d8c28a', 18, 'civic')",
        "signature": "'The charm wakes. Its power is yours while seated. Expand your case in the Vault.','#d8c28a',18,'civic'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 49279,
        "owner": "update",
        "ownerHash": "bf7c90b765db4f7294d4f8caab5f143cd552383d9146946f41a37c31b1c0dc65",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events')",
        "signature": "'A demon-blighted rift tears open in the distance!','#e8503c',15,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 42221,
        "owner": "update",
        "ownerHash": "dda48cfc7894128c3998e714e6d65f81f6f144778cf1de0d4b85c4ceefcecf67",
        "method": "noticeOccupied",
        "receiver": "this",
        "call": "this.noticeOccupied(hearers, 'A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events')",
        "signature": "'A demon-blighted rift tears open in the distance!','#e8503c',15,'events'"
      },
      "relation": "same notice arguments with explicit occupied audience",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 49303,
        "owner": "update",
        "ownerHash": "bf7c90b765db4f7294d4f8caab5f143cd552383d9146946f41a37c31b1c0dc65",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.announce, info.color, 18, 'events')",
        "signature": "info.announce,info.color,18,'events'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 42249,
        "owner": "update",
        "ownerHash": "dda48cfc7894128c3998e714e6d65f81f6f144778cf1de0d4b85c4ceefcecf67",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(info.announce, info.color, 18, 'events')",
        "signature": "info.announce,info.color,18,'events'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 49426,
        "owner": "update",
        "ownerHash": "bf7c90b765db4f7294d4f8caab5f143cd552383d9146946f41a37c31b1c0dc65",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n    : 'A path opens toward your quest!', '#c8a8e8', 15, 'world')",
        "signature": "z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n    : 'A path opens toward your quest!','#c8a8e8',15,'world'"
      },
      "current": {
        "file": "src/engine/world.ts",
        "line": 42374,
        "owner": "update",
        "ownerHash": "dda48cfc7894128c3998e714e6d65f81f6f144778cf1de0d4b85c4ceefcecf67",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n    : 'A path opens toward your quest!', '#c8a8e8', 15, 'world')",
        "signature": "z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n    : 'A path opens toward your quest!','#c8a8e8',15,'world'"
      },
      "relation": "exact arguments",
      "contributes": false
    },
    {
      "original": {
        "file": "src/engine/world.ts",
        "line": 62389,
        "owner": "updateObjective",
        "ownerHash": "08cc84a45750310ceeecb2ccca7aff7c2037bf56c4fbd1d793bea299c4ecd311",
        "method": "notice",
        "receiver": "this",
        "call": "this.notice('The caravan is lost — its bounty with it.', '#d05050', 16, 'events')",
        "signature": "'The caravan is lost — its bounty with it.','#d05050',16,'events'"
      },
      "current": {
        "file": "src/engine/nativeSceneObjectiveWatching.ts",
        "line": 449,
        "owner": "sceneUpdateObjective",
        "ownerHash": "0e27795c5a190d5415f11d16ff53a23dd2fc7080d6eefadedd5cb53358fba9e6",
        "method": "notice",
        "receiver": "host",
        "call": "host.notice('The caravan is lost — its bounty with it.', '#d05050', 16, 'events')",
        "signature": "'The caravan is lost — its bounty with it.','#d05050',16,'events'"
      },
      "relation": "exact arguments",
      "contributes": true
    }
  ],
  "watcherPolicy": {
    "commit": "e0600ae89d2970a385b91a702553ec05b3038dcb",
    "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
    "before": "assert.throws(()=>f.driver.updateObjective(3),/present area player/);",
    "after": "assert.doesNotThrow(()=>f.driver.updateObjective(3));",
    "reason": "Accepted remote/empty-area policy removed blanket local attendance throw; local-only fixture progression remains inert until the real local body returns.",
    "sourceSha256": "f74fa3cbf9c0faaf2e081b2f79e3415a63bc426b2698ea7177d84a1483e9fcdb",
    "initialization": {
      "before": "f.authority.transfer(hero,f.binding,binding);const before=JSON.stringify(f.snapshot());",
      "after": "f.authority.transfer(hero,f.binding,binding);f.driver.updateObjective(0);assert.equal(stone.charge,0);assert.deepEqual(stone.holdRead,{contested:false,draining:false,recouping:false});const before=JSON.stringify(f.snapshot());",
      "reason": "An actual zero-time empty-area watch creates the ordinary inert holdRead presentation record before the unchanged-state duration check."
    }
  }
} as const;
export const nativeCaravanNewsArchiveHash="0d40c7480e9ec976f5783fc520204d7ce0b44e95d10a36f118e4217ebdee3f32";
