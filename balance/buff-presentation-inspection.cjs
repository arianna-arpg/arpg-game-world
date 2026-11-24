// Shared by the buff icon gate and node balance/debuff-coverage.cjs --buffs.
// The standalone harness builds in
// memory and removes the disposable Electron profile, including on failure.
exports.entry = [
  "import {SKILLS as skills} from './data/skills';",
  "import {makeSkillInstance as instance} from './engine/skills';",
  "import {STATUS_DEFS as statuses} from './engine/status';",
  "import {PASSIVE_NODES as nodes} from './data/passives';",
  "window.buffInspection = {skills,instance,statuses,nodes};",
].join('\n');

exports.inspect = function inspectBuffs() {
  window.requestAnimationFrame=()=>0;
  __game.account().ledger.prologue_lived=1;
  __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(180); __game.hold(true);
  Object.defineProperty(performance,'now',{value:()=>4200,configurable:true});
  const w=__game.world(), p=w.player, r=__game.renderer, q=window.buffInspection;
  const game=document.getElementById('game'), meta=w.localSeat.meta, failures=[];
  const skill=id=>q.instance({...q.skills[id],requirements:undefined,manaCost:0,useTime:0});
  const flame=skill('flame_imbuement');
  p.skills=[skill('cleave'),flame,skill('war_cry')]; w.actors=[p]; w.update=()=>{};
  p.buffs.clear(); p.charges.clear(); p.statuses=[]; meta.allocated.clear(); meta.choices={}; w.recalcPlayer();
  const cast=inst=>{
    p.cooldowns.clear(); p.useLock=0; p.casting=null;
    if(!w.useSkill(p,inst,p.pos,true)) throw Error('Failed to cast '+inst.def.id);
  };
  const sheet=document.createElement('canvas'); sheet.width=680; sheet.height=540;
  const g=sheet.getContext('2d'), body=document.createElement('canvas'); body.width=94; body.height=94;
  const c=body.getContext('2d',{willReadFrequently:true}); let samples=0;
  function actor() {
    c.fillStyle='#222830'; c.fillRect(0,0,94,94); c.save(); c.translate(47,42);
    c.scale(1.8,1.8); c.translate(-p.pos.x,-p.pos.y);
    const old=r.ctx; try { r.ctx=c; r.drawActor(p,w); } finally { r.ctx=old; c.restore(); }
    return c.getImageData(0,0,94,94).data;
  }
  const moved=(a,b)=>a.some((v,i)=>Math.abs(v-b[i])>12);
  function sample(label, danger=false) {
    game.dispatchEvent(new MouseEvent('mousemove',{clientX:1,clientY:1,bubbles:true})); __game.step(1);
    const x=samples%2*340,y=Math.floor(samples/2)*180; samples++;
    g.fillStyle='#191e26'; g.fillRect(x,y,340,180);
    const actual=actor(); g.drawImage(body,x+6,y+46);
    // Compare at the identical pose and time. Buff decoration must contribute
    // zero pixels to the player. Removing an active debuff must change the crop.
    const statuses=p.statuses, fields=['buffPresentation','procCues','payloadCues','selfBankCues'];
    const saved=fields.map(key=>p[key]);
    try {
      for (const key of fields) p[key]=[];
      p.statuses=statuses.filter(s=>!q.statuses[s.id]?.beneficial);
      if(moved(actual,actor())) failures.push(label+' painted a player buff');
      if(danger){p.statuses=[]; if(!moved(actual,actor())) failures.push('missing Impale body');}
    } finally {fields.forEach((key,i)=>p[key]=saved[i]); p.statuses=statuses;}
    const slot=r.hudSlotRects[0], scale=slot.w/54, device=game.width/game.getBoundingClientRect().width;
    g.drawImage(game,(slot.x-4*scale)*device,(slot.y-59*scale)*device,182*scale*device,132*scale*device,
      x+106,y+1,222,161);
    g.fillStyle='#f0e5d0'; g.textAlign='left'; g.font='13px Verdana'; g.fillText(label,x+9,y+173,324);
  }
  function hover(index, dy, expected) {
    const slot=r.hudSlotRects[index], k=slot.w/54, texts=[];
    game.dispatchEvent(new MouseEvent('mousemove',{clientX:slot.x+11*k,clientY:slot.y+dy*k,bubbles:true}));
    const orig=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(t,...args){texts.push(String(t));return orig.call(this,t,...args);};
    try { __game.step(1); } finally { CanvasRenderingContext2D.prototype.fillText=orig; }
    for(const text of expected) if(!texts.some(line=>line.includes(text))) failures.push('missing hotbar hover: '+text);
  }
  cast(flame); sample('Flame Imbuement · six attacks ready'); hover(1,-12,['×6','Spends one on use']);
  for(let i=0;i<5;i++) p.spendBuffs('use',['attack']);
  sample('One imbued attack remaining'); hover(1,-12,['×1']);
  p.skills[1]=null; sample('Skill unslotted · one round in the buff strip'); hover(0,-41,['×1','Spends one on use']);
  p.skills[1]=flame; p.spendBuffs('use',['attack']); sample('Last round spent');
  const node=Object.values(q.nodes).find(n=>n.name==='Verse Shelter' && n.mods?.some(m=>m.gauge==='charge:verse'));
  meta.allocated.add(node.id); w.recalcPlayer(); p.gainCharge('verse',3,6); p.updateTimers(.01);
  p.applyStatus('stone_communion',0,1,'Inspection'); sample('Verse Shelter ×3 · Stone Communion'); hover(0,-41,['Verse Shelter','×3','Passive tree']);
  cast(flame); p.applyStatus('impaled',0,1,'Inspection');
  sample('Impaled · six imbued attacks ready',true);
  return {samples:sheet.toDataURL(),count:samples,failures,fatal:__game.crash().fatal};
};
