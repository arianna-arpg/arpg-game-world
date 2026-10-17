import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mode=process.argv.find(x=>x.startsWith('--cold='))?.slice(7);
if(!mode){
 for(const name of ['assertion','ordinary','local','capture-select','capture-binding','capture-physical']){const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--cold='+name],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stdout+r.stderr);assert(r.stdout.includes('PASS cold selection '+name));}
 console.log('PASS native cold selection: 6 independently initialized actual areas');
}else{
 const {NativeAreaActorAuthority}=await import('../src/worldmass/nativeAreaActorAuthority');
 const keys={assertion:'assertFinalSelections',ordinary:'selectOrdinaryEntryRows',local:'assertFinalLocalSelections','capture-select':'selectActors','capture-binding':'bindingFor','capture-physical':'assertFinalPhysical'} as const;assert(mode in keys);const key=keys[mode as keyof typeof keys],proto=NativeAreaActorAuthority.prototype,descriptor=Object.getOwnPropertyDescriptor(proto,key)!,original=descriptor.value as Function,marker=Error('actual cold selected assertion');let armed=false,selected=0,applyReads=0,captureThrow=false;
 const replaced=function(this:unknown,...args:unknown[]){if(armed){selected++;if(mode.startsWith('capture-')){if(captureThrow)throw marker;return Reflect.apply(original,this,args);}if(mode==='assertion')throw marker;return mode==='ordinary'?Object.freeze([]):undefined;}return Reflect.apply(original,this,args);};Object.defineProperty(replaced,'apply',{get(){applyReads++;throw Error('own apply forbidden');}});Object.defineProperty(proto,key,{...descriptor,value:replaced});
 try{
  await import('../src/engine/world');const {nativeCampaignFixture,birthActualNativeArea}=await import('./nativeCombatRetainedFixture');const {refuseWorldCombat,writeCombatProof}=await import('./probe_nativecombatcycle');const {NativeAreaCombatOperation}=await import('../src/worldmass/nativeAreaCombatOperation');const {NativeAreaSceneBirthAdmission}=await import('../src/worldmass/nativeAreaSceneBirthAdmission');
  const setup=nativeCampaignFixture(12458),report=refuseWorldCombat([setup.writer],world=>{const all=birthActualNativeArea(setup),a=all.ongoing,scene=a.assembly.input.scene,hero=scene.player,get=hero.sheet.get;let actions=0,stats=0,delegatedCalls:number|undefined,error:unknown;hero.sheet.get=function(...args){stats++;return Reflect.apply(get,this,args);};
   if(mode.startsWith('capture-')){
    Object.defineProperty(proto,key,descriptor);armed=true;try{a.combat.actorTurnRate(hero);}finally{armed=false;}delegatedCalls=selected;assert.equal(delegatedCalls,mode==='capture-select'?2:3);assert.equal(stats,1);selected=0;stats=0;captureThrow=true;armed=true;try{a.combat.actorTurnRate(hero);}catch(e){error=e;}finally{armed=false;}assert.equal(error,marker);assert.equal(selected,1);assert.equal(stats,0);
   }else if(mode==='assertion'){armed=true;try{a.combat.actorTurnRate(hero);}catch(e){error=e;}finally{armed=false;}assert.equal(error,marker);assert.equal(selected,1);assert.equal(stats,0);}
   else{
    const rogue=a.assembly.input.population.createMonster('goblin_skirmisher',1,'enemy');assert.throws(()=>all.authority.require(rogue),{message:'Missing native actor authority'});
    if(mode==='ordinary'){
     let operation:InstanceType<typeof NativeAreaCombatOperation>|undefined;const op=NativeAreaCombatOperation.prototype,enter=op.enter;op.enter=function(this:InstanceType<typeof NativeAreaCombatOperation>,subjects,action){operation=this;return Reflect.apply(enter,this,[subjects,action]);} as typeof enter;try{a.combat.actorTurnRate(hero);}finally{op.enter=enter;}assert(operation);stats=0;armed=true;
     try{operation.enter({permission:'proc',physical:[rogue]},()=>{actions++;return a.combat.actorTurnRate(hero);});}catch(e){error=e;}finally{armed=false;}
     assert.equal(error instanceof Error?error.message:null,'Missing native actor authority');
    }else{
     const birth=new NativeAreaSceneBirthAdmission({authority:all.authority,scene,population:a.assembly.input.population}),rows=all.authority.selectActors([hero]),other=scene.actors.find(body=>body!==hero)!;assert(other);const at=scene.actors.indexOf(hero),otherGet=other.sheet.get;scene.actors.splice(at,1);other.sheet.get=function(...args){stats++;return Reflect.apply(otherGet,this,args);};stats=0;armed=true;
     try{birth.runFinalSelected(rows,()=>{actions++;return a.combat.actorTurnRate(other);});}catch(e){error=e;}finally{armed=false;other.sheet.get=otherGet;assert(!scene.actors.includes(hero));assert.throws(()=>all.authority.require(hero),/Stale native actor authority/);scene.actors.splice(at,0,hero);}
     assert.equal(error instanceof Error?error.message:null,'Stale native final physical actor');
    }
    assert.equal(actions,0);assert.equal(stats,0);assert.equal(selected,0);assert.throws(()=>all.authority.require(rogue),{message:'Missing native actor authority'});
   }
   hero.sheet.get=get;assert.equal(applyReads,0);assert.deepEqual(world,[]);a.combat.actorTurnRate(hero);return{mode,selected,actions,stats,applyReads,delegatedCalls,error:error instanceof Error?error.message:null,recovered:true,worldDrivers:world};
  });writeCombatProof('native-cold-entry-'+mode+'.json',report);console.log('PASS cold selection '+mode+' '+JSON.stringify(report));
 }finally{Object.defineProperty(proto,key,descriptor);}
}

