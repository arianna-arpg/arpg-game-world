// node balance/debuff-coverage.cjs --interplay
exports.entry = require('./mechanic-visual-inspection.cjs').entry;

exports.inspect = function inspectInterplay() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(120); __game.hold(true);
  Object.defineProperty(performance,'now',{value:()=>4200, configurable:true});
  const q = window.mechanicInspection, r = __game.renderer, previous = r.ctx;
  const canvas = document.createElement('canvas'); canvas.width=810; canvas.height=392;
  const g = canvas.getContext('2d');
  const tile = document.createElement('canvas'); tile.width=270; tile.height=156;
  const c = tile.getContext('2d',{willReadFrequently:true}), failures=[];
  const samples = [
    ['Draw Corruption','siphonTransfer'], ['Transfusion','transfusionTransfer'], ['Spore cloud','fungal_puffball'],
    ['Storm orb gathering','storm_acolyte','warning'], ['Storm orb discharge','storm_acolyte'], ['Clot implosion','clot_shambler']
  ];
  try {
    for (const [i,[label,id,phase]] of samples.entries()) {
      const w=q.world('warrior',5819), p=w.player;
      const transfer=id.endsWith('Transfer'), siphon=id==='siphonTransfer';
      const actor=w.createMonster(transfer?'zombie':id,1,siphon?'player':'enemy');
      actor.pos={x:p.pos.x+74,y:p.pos.y}; actor.tier=p.tier; actor.spawnedAt=-30;
      actor.skills=[]; actor.brain=undefined; w.actors=[p,actor]; w.flashes=[];
      let effect, warning, center, scale;
      if (transfer) {
        const donor=siphon?actor:p;
        donor.applyStatus('poison',2,1,donor.name,{casterId:donor.id});
        const target=siphon?p:actor;
        w.executeSkill(p,q.instance(q.skills[siphon?'draw_corruption':'transfusion']),target.pos,{targetInfo:{actor:target,pos:target.pos}});
        effect=w.flashes.find(f=>f.mechanicLink?.kind===id);
        if (!effect || effect.mechanicLink.from!==donor.id || effect.mechanicLink.to!==target.id) throw Error('Missing directed transfer for '+label);
        scale=1.8; center={x:(actor.pos.x+p.pos.x)/2,y:p.pos.y};
      } else {
        w.kill(actor,false,p);
        const b=w.deathBurstsView()[0]; if(!b) throw Error('No armed death for '+id);
        if(phase==='warning') { w.updateDeathBursts(b.coalesce*.44); warning=b; }
        else {
          w.updateDeathBursts(b.coalesce+.01);
          if(b.mode==='orb') w.updateDeathBursts(b.life+.01);
          effect=w.flashes.find(f=>f.fx===b.impactFx && f.radius===b.radius);
          if(!effect || !q.voice(effect.fx)) throw Error('Missing impact for '+label);
        }
        scale=68/b.radius; center=effect?.pos??b.pos;
      }
      r.ctx=c; c.resetTransform(); c.fillStyle='#252c32'; c.fillRect(0,0,270,156);
      c.save(); c.translate(135,78); c.scale(scale,scale); c.translate(-center.x,-center.y);
      if(transfer) {r.drawActor(p,w); r.drawActor(actor,w);}
      const before=c.getImageData(0,0,270,156).data;
      if(warning) r.drawDeathBursts(w);
      else if(transfer) {
        const from=w.actors.find(a=>a.id===effect.mechanicLink.from), to=w.actors.find(a=>a.id===effect.mechanicLink.to);
        q.link(c,id,from.pos,to.pos,effect.color,.66);
      } else r.drawFlash({...effect,life:effect.maxLife*.65});
      c.restore(); const after=c.getImageData(0,0,270,156).data;
      let pixels=0;
      for(let k=0;k<after.length;k+=4) if (Math.abs(after[k]-before[k])+Math.abs(after[k+1]-before[k+1])+Math.abs(after[k+2]-before[k+2])>45) pixels++;
      if(pixels<35) failures.push(label+' had too few visible pixels');
      const x=i%3*270,y=Math.floor(i/3)*196;
      g.drawImage(tile,x,y); g.fillStyle='#151b1f';g.fillRect(x,y+156,270,40);
      g.fillStyle='#eee7d5'; g.font='16px Verdana'; g.fillText(label,x+12,y+181);
    }
    return {count:samples.length,failures,samples:canvas.toDataURL(),fatal:__game.crash().fatal};
  } finally { r.ctx=previous; }
};
