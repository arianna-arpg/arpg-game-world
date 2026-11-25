// Runs inside the client so the test can identify the exact finished bitmaps it drew.
module.exports=async function captureSocketArtwork() {
  const q=AbilityQA, r=__game.renderer, game=r.canvas, surfaces=[game,r.overlay];
  const recipe=SocketQA.socketExample(), marks=recipe[0].marks;
  const wanted=[...new Set(recipe.map(s=>'skill:'+s.faceId)),...marks.map(m=>'support:'+m.id),'skill:deep_carve','support:bandolier','support:skewering_blows'];
  for(const key of wanted) {
    const [kind,id]=key.split(':'), url=q.abilityArtworkUrl(kind,id);
    if(!url || !await q.loadAbilityArtwork(url)) throw Error('Selected painting unavailable for '+key);
  }
  q.configureSkillArtwork(()=>true);
  const strip=document.createElement('canvas');strip.width=880;strip.height=315;
  const ink=strip.getContext('2d');ink.fillStyle='#111b20';ink.fillRect(0,0,strip.width,strip.height);
  const artCounts=[], engravedCounts=[];
  const scratch=document.createElement('canvas').getContext('2d');
  let reference;
  scratch.drawImage=image=>{reference=image;};
  function render(world,index,engraved) {
    world.account.cosmetics.loadout.hotbarSocketArt=engraved?'engraved':undefined;
    const painted=[], numbers=[], plates=[];
    const restore=surfaces.map(surface=>{
      const ctx=surface.getContext('2d'), original=ctx.drawImage, fillText=ctx.fillText, roundRect=ctx.roundRect;
      function location(x,y) {
        const xf=ctx.getTransform(), pixel=surface.width/innerWidth;
        return {x:(x*xf.a+xf.e)/pixel,y:(y*xf.d+xf.f)/pixel,scale:xf.a};
      }
      ctx.drawImage=function(image,...args) {
        if(image instanceof HTMLCanvasElement && args.length===4)
          painted.push({image,...location(args[0],args[1]),size:args[2]});
        return original.call(this,image,...args);
      };
      ctx.fillText=function(label,x,y,...rest) {
        if(this.fillStyle==='#fff4d9') numbers.push({label,...location(x,y)});
        return fillText.call(this,label,x,y,...rest);
      };
      ctx.roundRect=function(x,y,w,h,radius) {
        if(x===0 && y===0 && h===18 && radius===3) {
          const a=location(x,y), b=location(w,h);plates.push({x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y});
        }
        return roundRect.call(this,x,y,w,h,radius);
      };
      return ()=>{ctx.drawImage=original;ctx.fillText=fillText;ctx.roundRect=roundRect;};
    });
    try {r.render(world);} finally {for(const reset of restore) reset();}
    const slot=r.hudSlotRects.find(s=>s.slot===0), unit=slot.w/54;
    const faces=[q.SKILLS[recipe[index].faceId],...marks];
    const local=painted.filter(({x,y})=>x>=slot.x-.1 && x<slot.x+slot.w && y>=slot.y-.1 && y<slot.y+slot.h);
    const match=faces.filter(face=>local.some(draw=>{
      scratch.setTransform(draw.scale,0,0,draw.scale,0,0);
      if(face===faces[0]) q.drawSkillIcon(scratch,face,0,0,draw.size);
      else if(engraved) q.drawSupportEmblem(scratch,face,0,0,draw.size);
      else q.drawSkillIcon(scratch,q.supportIconFace(face),0,0,draw.size);
      return reference===draw.image;
    }));
    if(match.length!==faces.length) throw Error('Native '+(engraved?'engraved':'painted')+' socket mismatch: '+faces.filter(f=>!match.includes(f)).map(f=>f.id));
    (engraved?engravedCounts:artCounts).push(match.length);
    const above=p=>p.x>=slot.x && p.x<slot.x+slot.w && p.y>slot.y-50*unit && p.y<slot.y;
    const visible=plates.filter(above);
    if(numbers.some(above) || visible.length!==2 || visible[0].x+visible[0].w>visible[1].x ||
      visible.some(p=>p.x+p.w>slot.x+slot.w)) throw Error('Crowded counters escaped their seat or retained digits: '+JSON.stringify(visible));
    return {slot,unit,visible};
  }
  try {
    const states=SocketQA.socketExample((world,index)=>{
      render(world,index,true);
      const {slot,unit,visible}=render(world,index,false);
      const cx=index*220+110;
      for(const surface of surfaces) {
        if(surface!==game && surface.style.display==='none') continue;
        const k=surface.width/innerWidth;
        ink.drawImage(surface,(slot.x-4*unit)*k,(slot.y-47*unit)*k,89*unit*k,109*unit*k,cx-67,4,134,164);
      }
      ink.fillStyle='#f3ead6';ink.font='17px Georgia';ink.textAlign='center';
      ink.fillText(index ? 'After '+index+(index===1?' cast':' casts') : 'Before casting',cx,186);
      const values=recipe[index].marks.filter(m=>m.meter).map(m=>m.meter.count);
      ink.fillStyle='#b9c9c7';ink.font='12px Verdana';
      ink.fillText(recipe[index].face+' · '+recipe[index].rounds+' / '+recipe[index].capacity,cx,205);
      ink.fillText('Rhythm '+values[0]+'   ·   Frenzy '+values[1],cx,224);
      if(index===0) {
        const saved=r.hudMouse, names=recipe[index].marks.filter(m=>m.meter).map(m=>m.name);
        const hits=[];
        const reset=surfaces.map(s=>{
          const ctx=s.getContext('2d'), original=ctx.fillText;
          ctx.fillText=function(label,...args) {
            if(names.includes(label)) hits.push(label);
            return original.call(this,label,...args);
          };
          return ()=>{ctx.fillText=original;};
        });
        try {
          visible.forEach((n,i)=>{
            hits.length=0;r.hudMouse=r.clientToBuffer({x:n.x+n.w/2,y:n.y+n.h/2});r.render(world);
            if(hits.length!==1 || hits[0]!==names[i]) throw Error('Hovering '+names[i]+' showed '+JSON.stringify(hits));
          });
        } finally {r.hudMouse=saved;reset.forEach(f=>f());}
      }
    });
    ink.fillStyle='#35454a';ink.fillRect(16,237,848,1);
    marks.forEach((m,i)=>{
      const x=88+i*176;q.drawSkillIcon(ink,q.supportIconFace(m),x-36,246,33);
      q.drawSupportEmblem(ink,m,x+5,248,29);
      ink.fillStyle='#e5e6dc';ink.font='12px Verdana';ink.fillText(m.name,x,299,168);
    });
    const fit=document.createElement('canvas');fit.width=800;fit.height=226;
    const panel=fit.getContext('2d');panel.fillStyle='#111b20';panel.fillRect(0,0,fit.width,fit.height);
    SocketQA.slotFitExamples((world,stage)=>{
      const actor=world.player, host=actor.skills[0], other=actor.skills[1];
      function cast() {
        if(!world.useSkill(actor,host,{x:actor.pos.x+50,y:actor.pos.y},true)) throw Error('Fit preview cast refused');
        for(let tick=0;tick<180;tick++) {
          world.update(1/60);
          if(!actor.casting && actor.useLock<=0 && !actor.cooldowns.get(host.def.id)) break;
        }
      }
      function capture(index,title,detail) {
        r.render(world);
        const slot=r.hudSlotRects.find(s=>s.slot===0), unit=slot.w/54, center=134+index*266;
        const right=stage==='solo'?slot:r.hudSlotRects.find(s=>s.slot===1);
        const w=right.x+right.w-slot.x+6*unit,h=84*unit,zoom=1.8/unit;
        for(const surface of surfaces) {
          if(surface!==game && surface.style.display==='none') continue;
          const k=surface.width/innerWidth;
          panel.drawImage(surface,(slot.x-3*unit)*k,(slot.y-28*unit)*k,w*k,h*k,center-w*zoom/2,10,w*zoom,h*zoom);
        }
        panel.textAlign='center';panel.fillStyle='#f3ead6';panel.font='17px Georgia';panel.fillText(title,center,187);
        panel.fillStyle='#b9c9c7';panel.font='12px Verdana';panel.fillText(detail,center,207);
      }
      if(stage==='solo') {
        for(let i=0;i<3;i++) cast();
        capture(0,'Building Rhythm alone','3 of 6 beats · full-width staff');
      } else {
        for(let i=0;i<5;i++) cast();
        for(const [i,n] of [14,15].entries()) {
          if(i) cast();
          actor.gainCharge('frenzy',n,3,other);
          const rhythm=world.selfStacksOf(host), drum=actor.skillChargeBank(host);
          if(rhythm.count!==5+i || actor.charges.get('frenzy')!==n || actor.skillChargeCap(host)!==12)
            throw Error('Unexpected native high-capacity balances');
          capture(i+1,i?'Full staff':'One beat to go',rhythm.count+'/6 beats · '+n+'/15 Frenzy · '+drum.count+'/12 rounds');
        }
      }
    });
    return {png:strip.toDataURL(),fitPng:fit.toDataURL(),artCounts,engravedCounts,balances:states.map(s=>s.rounds)};
  } finally {q.configureSkillArtwork(()=>__game.settings().skillArtwork);}
};
