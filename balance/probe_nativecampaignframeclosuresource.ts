import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeSceneCampaignFrameClosureArchive as original} from './nativeSceneCampaignFrameClosureArchive';
import {nativeCampaignFrameClosureReference as reference} from './nativeSceneCampaignFrameClosureReference';
const lf=(s:string)=>s.replace(/\r\n/g,'\n'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:99,module:99,removeComments:true}}).outputText;
function successor(source:string){
function attendanceSuccessor(source:string){
 let s=source;const name=/export function (\w+)/.exec(s)?.[1];
 const replace=(a:string,z:string)=>{if(!s.includes(a))throw Error(name+' missing exact attendance seam: '+a);s=s.replace(a,z);};
 const all=(a:string,z:string)=>{if(!s.includes(a))throw Error(name+' missing attendance seams: '+a);s=s.replaceAll(a,z);};

 if(["sceneUpdateDownedCompanions","sceneUpdateDownedSeats","sceneUpdateLightwells","sceneUpdateDroveScene","sceneUpdateStrayingScene","sceneUpdateWispScene","sceneBombardTarget","sceneNearestSeatDist","sceneSpawnPartyEchoes"].includes(name??''))all('nativeHost.seats','nativeHost.frameSeats()');
 if(name==='sceneUpdateTownPortals')replace('const a = seat.actor;', 'const a = seat.actor;\n      if (!nativeHost.isPresentActor(a)) { nativeHost.townPortalDwell.delete(seat.id); continue; }');
 if(name==='sceneUpdateQuickening'){replace("    if (nativeHost.shardWorld?.role !== 'unit')","    if (nativeHost.isCampaignFrameOwner()) {\n    if (nativeHost.shardWorld?.role !== 'unit')");replace("    // The surge's PRESENCE underfoot","    }\n\n    // The surge's PRESENCE underfoot");}
 if(name==='sceneUpdateCampfire')replace('const near = !nativeHost.player.dead','const near = nativeHost.isPresentLocalPlayer() && !nativeHost.player.dead');
 if(name==='sceneUpdateCampfire')replace('if (nativeHost.campfireCd > 0)', 'if (nativeHost.isCampaignFrameOwner() && nativeHost.campfireCd > 0)');
 if(name==='sceneUpdateHarborBoard'||name==='sceneUpdateMusterHorn'){
  replace('const engaged = nativeHost.near','const engaged = nativeHost.isPresentLocalPlayer() && nativeHost.near');
  replace('rearmIfWilled([nativeHost.localSeat])','rearmIfWilled(nativeHost.isPresentLocalPlayer() ? [nativeHost.localSeat] : [])');
 }
 if(name==='sceneUpdateSail'){
  replace('const engaged = !!dock','const engaged = nativeHost.isPresentLocalPlayer() && !!dock');
  replace('rearmIfWilled([nativeHost.localSeat])','rearmIfWilled(nativeHost.isPresentLocalPlayer() ? [nativeHost.localSeat] : [])');
 }
 if(name==='sceneUpdateSailing')replace('const run = nativeHost.voyage;', 'if (!nativeHost.isCampaignFrameOwner()) return;\n    const run = nativeHost.voyage;');
 if(name==='sceneUpdateDescent')replace('const run = nativeHost.descentRun, df = nativeHost.sim.descentField;', 'if (!nativeHost.isCampaignFrameOwner()) return;\n    const run = nativeHost.descentRun, df = nativeHost.sim.descentField;');
 if(name==='sceneUpdateAmalgamation'||name==='sceneUpdateDelver')replace('if (nativeHost.player.dead || nativeHost.player.downed','if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed');
 if(name==='sceneUpdateMercOutpost')replace('const parley = nativeHost.mercParley();',"const parley = nativeHost.isPresentLocalPlayer() ? nativeHost.mercParley() : { near: false, why: null };");
 if(name==='sceneUpdatePlayerCorpses')replace('if (nativeHost.player.dead || nativeHost.player.downed) return;',"if (!nativeHost.isPresentLocalPlayer()) { for (const c of nativeHost.playerCorpses) c.dwell = 0; return; }\n    if (nativeHost.player.dead || nativeHost.player.downed) return;");
 if(name==='sceneUpdateVocationSites')replace('if (dist(site.npc.pos, nativeHost.player.pos)', 'if (!nativeHost.isPresentLocalPlayer() || dist(site.npc.pos, nativeHost.player.pos)');
 if(name==='sceneNearCampfire')replace('&& nativeHost.townPresent() && !!a','&& nativeHost.townPresent() && !!a && nativeHost.isPresentLocalPlayer()');
 if(name==='sceneCanSail')replace('if (nativeHost.gameOver || nativeHost.player.dead','if (!nativeHost.isPresentLocalPlayer() || nativeHost.gameOver || nativeHost.player.dead');
 if(name==='sceneGetMireille')replace('return nativeHost.actors.find(a =>','if (!nativeHost.isPresentActor(p)) return null;\n    return nativeHost.actors.find(a =>');
 if(name==='sceneNearHarborBoard'||name==='sceneNearMusterHorn')replace(name==='sceneNearHarborBoard'?'return !!board':'return !!horn',name==='sceneNearHarborBoard'?'return !!board && nativeHost.isPresentActor(seat.actor)':'return !!horn && nativeHost.isPresentActor(seat.actor)');
 if(name==='sceneUpdateMireille'){
  replace('if (nativeHost.mireilleCd > 0)', 'if (nativeHost.isCampaignFrameOwner()) {\n    if (nativeHost.mireilleCd > 0)');
  replace('// THE COUNTERS AND THE JOURNAL (a hosted world): every standing player lingers','}\n    // THE COUNTERS AND THE JOURNAL (a hosted world): every standing player lingers');
  replace('if (nativeHost.player.dead || nativeHost.player.downed || nativeHost.getMireille() === null','if (!nativeHost.isPresentLocalPlayer() || nativeHost.player.dead || nativeHost.player.downed || nativeHost.getMireille() === null');
 }
 if(name==='sceneUpdateGloaming'){
  replace("if (nativeHost.gloamPrevPhase !== 'idle'", "if (nativeHost.isCampaignFrameOwner()) {\n    if (nativeHost.gloamPrevPhase !== 'idle'");
  replace('nativeHost.gloamPrevPhase = phase;', 'nativeHost.gloamPrevPhase = phase;\n    }');
  all('nativeHost.seats','nativeHost.frameSeats()');
  replace(': nativeHost.player.pos;', ': nativeHost.isPresentLocalPlayer() ? nativeHost.player.pos : null;');
  replace('tries < 14;', 'anchor && tries < 14;');
  replace('if (nativeHost.gloomCur >= 0.9 && !gf.isWitnessed())','if (nativeHost.isPresentLocalPlayer() && nativeHost.gloomCur >= 0.9 && !gf.isWitnessed())');
  replace('if (nativeHost.gloomCur > 0.4)', 'if (nativeHost.isPresentLocalPlayer() && nativeHost.gloomCur > 0.4)');
  replace("nativeHost.text(nativeHost.player.pos, 'the gloaming is outlasted'", "if (nativeHost.isPresentLocalPlayer()) nativeHost.text(nativeHost.player.pos, 'the gloaming is outlasted'");
 }
 if(name==='sceneResolveHoldDefense')replace('ward ? vec(ward.pos.x, ward.pos.y) : vec(nativeHost.player.pos.x, nativeHost.player.pos.y)', 'ward ? vec(ward.pos.x, ward.pos.y) : nativeHost.isPresentLocalPlayer() ? vec(nativeHost.player.pos.x, nativeHost.player.pos.y) : vec((nativeHost.waypointPos ?? nativeHost.zoneEntry).x, (nativeHost.waypointPos ?? nativeHost.zoneEntry).y)');
 if(name==='sceneSpawnBrigandPack'||name==='sceneDeadwakeEntryPoint')replace('if (dist(at, nativeHost.player.pos) < STANDOFF)', 'if (nativeHost.isPresentLocalPlayer() && dist(at, nativeHost.player.pos) < STANDOFF)');
 if(name==='sceneMintWispBody')replace('if (dist(c, nativeHost.player.pos) >= minDist)', 'if (!nativeHost.isPresentLocalPlayer() || dist(c, nativeHost.player.pos) >= minDist)');
 if(name==='sceneStrayingRallySeat')replace('Math.min(dist(c, nativeHost.player.pos), dist(c, fold))','nativeHost.isPresentLocalPlayer() ? Math.min(dist(c, nativeHost.player.pos), dist(c, fold)) : dist(c, fold)');
 if(['sceneUpdateDeadwakeStream','sceneUpdateDroveScene','sceneUpdateHauntStream','sceneUpdateMigrationStream','sceneUpdateQuickening','sceneUpdateStrayingScene','sceneUpdateSwarmStream','sceneUpdateWispScene'].includes(name??''))all('nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y)', 'if (nativeHost.isPresentLocalPlayer()) nativeHost.flashes.push({ pos: vec(nativeHost.player.pos.x, nativeHost.player.pos.y)');

 // Shared lifecycle work belongs to the campaign barrier owner, independently
 // of which local road unit is currently published.
 if(['sceneUpdateHarborholds','sceneWatchBountyHands'].includes(name??''))replace("nativeHost.shardWorld?.role === 'unit'",'!nativeHost.isCampaignFrameOwner()');
 if(['sceneUpdateDeadwakeStream','sceneUpdateHauntStream','sceneUpdateLongNight','sceneUpdateQuickening','sceneUpdateWorldBosses','sceneUpdateGloaming'].includes(name??''))replace("nativeHost.shardWorld?.role !== 'unit'",'nativeHost.isCampaignFrameOwner()');
 return s;
}
let s=source;for(const[a,z]of [
 ['seatLadderOf(nativeHost, seat)','nativeHost.seatLadderOf(seat)'],['seatDoorOf(nativeHost, seat)','nativeHost.seatDoorOf(seat)'],['saveCharacter(nativeHost)','nativeHost.saveCharacter()'],['nativeHost.massRuntime.snapshot(nativeHost)','nativeHost.snapshotMassRuntime(nativeHost.massRuntime)'],['nativeHost.massRuntime!.wake(nativeHost)','nativeHost.wakeMassRuntime(nativeHost.massRuntime!)'],['runtime.attach(nativeHost, save, options)','nativeHost.attachMassRuntime(runtime, save, options)'],["Object.defineProperty(nativeHost, 'shardRoadView', { value: host, writable: true, configurable: true, enumerable: false });",'nativeHost.cacheShardRoadHost(host);']])s=s.replaceAll(a,z);
s=s.replace('const here = (def: ZoneDef, fn: (w: World) => void): boolean => nativeHost.atZone(def.id, w => { fn(w); return true; }) === true;','const here = (def: ZoneDef, fn: (w: World) => boolean): boolean => nativeHost.atZone(def.id, fn) === true;');
for(const line of ["w.notice(`${def.name} stands rebuilt — and besieged anew`, '#e8a050', 14, 'war');","w.notice(`${def.name} is besieged — sound the horn!`, '#e85050', 16, 'war');"])s=s.replace(line,'if (!w.presentationActor) return false;\n          '+line+'\n          return true;');
s=s.replace(`nativeHost.atZone(w.zone.id, x => withSeededRandom(key, () => x.text(
            vec(x.player.pos.x, x.player.pos.y - 110),
            line, o.color ?? OMEN_CFG.color, OMEN_CFG.size)));`,`nativeHost.atZone(w.zone.id, x => {
            const actor = x.presentationActor;
            if (!actor) return;
            withSeededRandom(key, () => x.text(
              vec(actor.pos.x, actor.pos.y - 110),
              line, o.color ?? OMEN_CFG.color, OMEN_CFG.size));
          });`);
s=s.replace(`if (msg) w.text(vec(w.player.pos.x, w.player.pos.y - 84), msg, '#e85050', 16);
      return true;`,`const actor = w.presentationActor;
      if (msg && actor) w.text(vec(actor.pos.x, actor.pos.y - 84), msg, '#e85050', 16);
      return actor !== null;`);return attendanceSuccessor(s);}
const native=execFileSync('git',['show',original.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
assert.equal(hash(native),original.worldSha256,'immutable original native World');
const tree=ts.createSourceFile('world.ts',native,ts.ScriptTarget.Latest,true),world=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
for(const row of original.methods){const member=world.members.find(n=>n.name?.getText(tree)===row.name);assert(member);assert.equal(member.getText(tree),row.source,row.name+' original source');assert.equal(hash(row.source),row.sourceSha256);const file=reference.files.find(f=>f.file==='src/engine/nativeScene'+row.group+'.ts')!,accepted=file.functions.find(f=>f.name===row.fn)!;assert.equal(emit(accepted.source),emit(successor(row.output)),row.name+' native body + explicit seams');}
for(const row of original.helpers){const declaration=tree.statements.find(n=>('name' in n&&(n.name as ts.DeclarationName | undefined)?.getText(tree)===row.name)||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(tree)===row.name));assert(declaration,row.name);assert.equal(declaration.getText(tree),row.source,row.name+' original helper');}
function check(file:string,source:string):void {source=lf(source);const row=reference.files.find(f=>f.file===file)!;assert.equal(hash(source),row.sha256,'exact native helper module '+file);const parsed=ts.createSourceFile(file,source,99,true),functions=parsed.statements.filter(ts.isFunctionDeclaration);for(const fn of row.functions){const found=functions.filter(n=>n.name?.text===fn.name);assert.equal(found.length,1,fn.name+' singular definition');assert.equal(found[0].getText(parsed),fn.source);}}
let mutations=0,duplicates=0;for(const file of reference.files){const source=projectContinuity('production',file.file,lf(fs.readFileSync(new URL('../'+file.file,import.meta.url),'utf8')));check(file.file,source);check(file.file,source.replaceAll('\n','\r\n'));for(const fn of file.functions){const changed=fn.source.replace(/\bnativeHost\b/,'unauthorizedNativeOwner');assert.notEqual(changed,fn.source);assert.equal(source.split(fn.source).length,2);assert.throws(()=>check(file.file,source.replace(fn.source,changed)),/exact native helper module/);mutations++;assert.throws(()=>check(file.file,source+'\n'+fn.source),/exact native helper module/);duplicates++;}}
const report={methods:original.methods.length,helpers:original.helpers.length,mutations,duplicates,files:reference.files.map(({file,sha256})=>({file,sha256})),runtimeAcceptance:false};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativecampaignframeclosuresource.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
