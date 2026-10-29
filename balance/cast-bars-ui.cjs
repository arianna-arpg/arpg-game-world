// Build first. Real casts and renderer; synthetic opaque late effects prove layer
// ordering with pixels, while native admission still controls which bars exist.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname,'..'), dir = path.join(__dirname,'reports');
fs.mkdirSync(dir,{recursive:true});
const logfile = path.join(dir,'cast-bars-ui.log'); fs.writeFileSync(logfile,'START\n');
const log = value => fs.appendFileSync(logfile,JSON.stringify(value)+'\n');
const supports = JSON.parse(execFileSync('node',['--import','tsx','--input-type=module','-e',
  "import { SUPPORTS } from './src/data/supports.ts';process.stdout.write(JSON.stringify(Object.fromEntries(['perfect_draw','wandering_mark','overcharge'].map(id=>[id,SUPPORTS[id]]))));"],
  {cwd:root,encoding:'utf8',windowsHide:true}));
app.setPath('userData',path.join(dir,'cast-bars-profile-'+process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.join(root,'dist'),savesDir:path.join(dir,'cast-bars-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=async code=>{
    const r=await win.webContents.executeJavaScript(`(async()=>{try{return {value:await eval(${JSON.stringify(code)})};}catch(e){return {error:e.stack};}})()`);
    if(r.error)throw Error(r.error);return r.value;
  };
  const capture=async name=>{await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(dir,'cast-bars-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  try {
    await win.loadURL(server.url);await run('__game.hold(true);__game.hydrated()');
    await run(`(()=>{
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;
      __game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);
      const w=__game.world(),r=__game.renderer,p=w.player;
      w.zoneMap.qa_castbars={id:'qa_castbars',name:'Cast Bar Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_castbars');p.pos={x:800,y:660};__game.step(240);
      w.actors=[p];w.doodads=[];w.markDoodadsChanged();w.walk=null;w.shake=0;
      __game.devGrantSkill('fireball',1,2);
      const base=p.skills[2],supports=${JSON.stringify(supports)};
      const q=window.castQA={w,r,p,actors:[p],hidden:new Set(),obscure:false,cover:false,painted:[],events:[],
        start(a,held=false){a.casting=null;a.useLock=0;a.cooldowns.clear();a.fillResources();
          const ids=held?['perfect_draw','wandering_mark','overcharge']:['perfect_draw','wandering_mark'];
          const inst={...base,sockets:ids.map(id=>({def:supports[id],level:1})),def:{...base.def,requirements:undefined,manaCost:0,cooldown:0,useTime:1,color:a===p?'#43d9f1':'#ef7356'}};
          if(!w.useSkill(a,inst,{x:a.pos.x+100,y:a.pos.y},true))throw Error('cannot cast '+a.id);
          a.casting.elapsed=a.casting.total*.8;a.casting.indicatorAt=.8;if(held)a.casting.stage=2;
        },
        render(){this.painted=[];this.events=[];const before=JSON.stringify(this.actors.map(a=>a.casting));r.castBarContrast.nextAt=0;r.render(w);
          if(before!==JSON.stringify(this.actors.map(a=>a.casting)))throw Error('render mutated casts');
          const surface=r.pixelScale<1?r.octx:r.ctx;
          return {painted:this.painted.map(v=>({...v,pixel:Array.from(surface.getImageData(Math.floor(v.marker.x),Math.floor(v.marker.y),1,1).data)})),
            events:this.events,fatal:__game.crash().fatal,crest:r.overlay.style.display,scale:r.pixelScale};}
      };
      for(const [dx,dy] of [[0,0],[90,-35],[-90,-10]]){const a=w.createMonster('crypt_lich',1,'enemy');a.pos={x:p.pos.x+dx,y:p.pos.y+dy};a.tier=p.tier;a.spawnedAt=-1;w.actors.push(a);q.actors.push(a);}
      q.actors.forEach(a=>q.start(a));
      const add=r.castBars.add.bind(r.castBars);
      r.castBars.add=(bar,offset)=>add({...bar,paint:ctx=>{
        const a=bar.actor,m=ctx.getTransform(),x=a.pos.x-22+44*.8,y=a.pos.y-a.radius-18+2;
        const point=(x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
        q.painted.push({id:a.id,self:a===p,marker:point(x,y),rect:{...point(bar.rect.x,bar.rect.y),w:bar.rect.w*m.a,h:bar.rect.h*m.d},zoom:m.a,native:{x:(x-r.cam.x)*r.zoom/(r.pixelScale<1?r.pixelScale:1),y:(y-r.cam.y)*r.zoom/(r.pixelScale<1?r.pixelScale:1)}});
        q.events.push('cast:'+a.id);bar.paint(ctx);
      }},offset);
      const reveal=r.labelRevealAt.bind(r);r.labelRevealAt=(world,pos)=>q.hidden.has(pos)?0:reveal(world,pos);
      for(const method of ['drawProjectiles','drawCanopies','drawRoofs','drawAtmosphere','drawTexts','drawEyecatch','drawModeFade']){
        const native=r[method].bind(r);r[method]=(...args)=>{native(...args);q.events.push(method);
          if((q.obscure&&method==='drawEyecatch')||(q.cover&&method==='drawModeFade')){
            const ctx=r.ctx;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
            ctx.fillStyle=method==='drawModeFade'?'#080808':'#d500d5';ctx.fillRect(0,0,r.canvas.width,r.canvas.height);ctx.restore();
          }
        };
      }
    })()`);
    for(const scale of [1,.75,.5,1]) for(const held of [false,true]) {
      await run(`castQA.r.setRenderScale(${scale});castQA.actors.forEach(a=>castQA.start(a,${held}));castQA.obscure=false;void 0;`);
      const plain=await run('castQA.render()');log({phase:'plain',held,...plain});
      assert.equal(plain.fatal,null);assert.equal(plain.painted.length,4);assert.ok(plain.painted.at(-1).self);
      for(const row of plain.painted)assert.ok(Math.abs(row.marker.x-row.native.x)<.01&&Math.abs(row.marker.y-row.native.y)<.01,'bar remains at native actor anchor');
      for(const row of plain.painted)assert.deepEqual(row.pixel,[255,255,255,255],'uncovered live marker');
      if(scale===1)await capture(held?'overcharge':'normal');
      await run('castQA.obscure=true;void 0;');const covered=await run('castQA.render()');
      for(const row of covered.painted)assert.deepEqual(row.pixel,[255,255,255,255],'marker survives opaque late effect');
      assert.ok(covered.events.indexOf('drawEyecatch')<covered.events.findIndex(e=>e.startsWith('cast:')));
      assert.ok(covered.events.indexOf('drawModeFade')>covered.events.findLastIndex(e=>e.startsWith('cast:')));
      assert.equal(covered.crest==='none',scale===1);assert.equal(covered.painted.at(-1).zoom,plain.painted.at(-1).zoom);
      await run('castQA.cover=true;void 0;');const faded=await run('castQA.render()');
      for(const row of faded.painted)assert.deepEqual(row.pixel,[8,8,8,255],'intentional fade covers cast bars');
      await run('castQA.cover=false;castQA.obscure=false;void 0;');
    }
    // Contrast changes independently of placement and without a new box or leader.
    const contrast=await run(`(()=>{
      const q=castQA,r=q.r;q.obscure=false;r.setRenderScale(1);q.actors.forEach(a=>q.start(a));
      const native=r.drawEyecatch.bind(r),decision=r.castBarContrast.outline.bind(r.castBarContrast),seen=[];
      r.castBarContrast.outline=(rect,ink)=>{const out=decision(rect,ink);seen.push(out);return out;};
      const sample=color=>{r.drawEyecatch=(...args)=>{native(...args);const c=r.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=color;c.fillRect(0,0,r.canvas.width,r.canvas.height);c.restore();};seen.length=0;const frame=q.render();return {decisions:[...seen],frame};};
      const clear=sample('#030303'),matching=sample('#43d9f1');
      if(clear.decisions.at(-1)!==null||!matching.decisions.at(-1))throw Error('adaptive outline decision');
      if(JSON.stringify(clear.frame.painted.map(v=>v.marker))!==JSON.stringify(matching.frame.painted.map(v=>v.marker)))throw Error('contrast moved bars');
      r.drawEyecatch=native;r.castBarContrast.outline=decision;q.render();return {clear:clear.decisions.at(-1),matching:matching.decisions.at(-1)};
    })()`);log({contrast});
    const gates=await run(`(()=>{
      const q=castQA,{w,r,p}=q;r.setRenderScale(.5);q.hidden.add(q.actors[1].pos);q.hidden.add(p.pos);
      let rows=q.render().painted;if(rows.length!==3||!rows.some(v=>v.self)||rows.some(v=>v.id===q.actors[1].id))throw Error('cover admission');
      q.actors[2].burrow={};rows=q.render().painted;if(rows.length!==2)throw Error('burrow admission');q.actors[2].burrow=undefined;
      p.burrow={};rows=q.render().painted;if(!rows.some(v=>v.self))throw Error('local concealed-body feedback');p.burrow=undefined;
      q.hidden.clear();__game.settings().crowdedMeters=true;rows=q.render().painted;if(rows.length!==4||!rows.at(-1).self||rows.some(v=>Math.abs(v.marker.x-v.native.x)>.01||Math.abs(v.marker.y-v.native.y)>.01))throw Error('cast moved with grouped meters');
      __game.settings().crowdedMeters=false;w.actors.reverse();rows=q.render().painted;if(!rows.at(-1).self)throw Error('actor array order');
      r.directorClean=true;if(q.render().painted.length)throw Error('clean take');r.directorClean=false;
      r.worldOnly=true;if(q.render().painted.length)throw Error('world-only take');r.worldOnly=false;
      const guest=w.addSeat('qa-cast-guest',w.localSeat.meta.classDef,w.localSeat.input);guest.couch={pad:1,side:'right'};
      guest.actor.pos={x:p.pos.x+40,y:p.pos.y};q.actors.push(guest.actor);q.start(guest.actor);q.hidden.add(guest.actor.pos);
      rows=q.render().painted;if(!rows.some(v=>v.id===guest.actor.id)||!rows.at(-1).self)throw Error('couch guest readout');
      q.actors.forEach(a=>a.casting=null);if(q.render().painted.length)throw Error('stale bar after completion');
      return {hiddenEnemy:true,localCover:true,localConcealedBody:true,burrow:true,groupedMeters:true,actorOrder:true,clean:true,worldOnly:true,couch:true,retirement:true};
    })()`);log({result:'PASS',gates});
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
