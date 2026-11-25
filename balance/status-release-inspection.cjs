// node balance/debuff-coverage.cjs --releases
exports.entry = [
  "import {makeSimWorld as releaseWorld} from './sim/arena';",
  "import {makeSkillInstance as releaseSkill} from './engine/skills';",
  "import {SKILLS as releaseSkills} from './data/skills';",
  "import {SUPPORTS as releaseSupports} from './data/supports';",
  "import {STATUS_DEFS as releaseDefs} from './engine/status';",
  "import {mod as releaseMod} from './engine/stats';",
  "import {effectVoiceOf as releaseVoice} from './render/vis/effectVoice';",
  "window.releaseInspection={releaseWorld,releaseSkill,releaseSkills,releaseSupports,releaseMod,releaseVoice,releaseDefs};",
].join('\n');

exports.inspect = function inspectStatusReleases() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(120); __game.hold(true);
  Object.defineProperty(performance, 'now', { value: () => 4200, configurable: true });
  const { releaseWorld, releaseSkill, releaseSkills, releaseSupports, releaseMod, releaseVoice, releaseDefs } = window.releaseInspection;
  const r = __game.renderer, original = r.ctx, failures = [];
  const sheet = document.createElement('canvas'); sheet.width = 960; sheet.height = 372;
  const g = sheet.getContext('2d');
  const tile = document.createElement('canvas'); tile.width = 240; tile.height = 150;
  const c = tile.getContext('2d', { willReadFrequently: true });
  for (const [id, def] of Object.entries(releaseDefs)) {
    if (def.ruptureFx && !releaseVoice(def.ruptureFx)) failures.push(id + ' uses an unregistered release painter');
  }
  const samples = [
    ['Lodged spikes','lodge'], ['Next hit','hit'], ['Spear Recall','recall'], ['Impale death · bystander unharmed','death'],
    ['Powder Charge','powder_charge','fire'], ['Living Bomb','living_bomb','fire'],
    ['Doombrand','doombrand','chaos'], ['Rupturing poison','poison','chaos'],
  ];
  try {
    for (const [i, [label, action, element]] of samples.entries()) {
      const w = releaseWorld('warrior', 914), p = w.player;
      const target = w.createMonster('zombie', 1, 'enemy');
      target.pos = {x:p.pos.x+45, y:p.pos.y}; target.tier = p.tier; target.spawnedAt = -30;
      target.brain = undefined; target.skills = []; target.anchored = true;
      target.sheet.setSource('inspection', [releaseMod('life','flat',1e5), releaseMod('evasion','override',0)]);
      p.sheet.setSource('inspection', [releaseMod('accuracy','override',1e5), releaseMod('critChance','override',0)]);
      target.fillResources(); w.actors = [p,target];
      const cleave = releaseSkill(releaseSkills.cleave,20,4);
      cleave.treeNodes = ['unbound_cleave','heavy_wave','tempered_wave'];
      cleave.sockets = [{def: releaseSupports.skewering_blows, level:1}];
      p.skills = [cleave]; w.meta.knownSkills.set('cleave',cleave);
      const strike = () => w.attackSequences.opening(p,cleave,target.pos,1);
      let kin;
      if (element) {
        target.applyStatus(action,0,1,p.name,{rupture:60,ruptureType:element,ruptureRadius:72,casterId:p.id});
        target.statuses[0].remaining = 0.001; w.update(0.02);
      } else {
        strike();
        if (!target.statuses.some(s => s.id === 'impaled' && s.rupture > 0)) throw Error('setup failed to lodge steel');
        w.flashes = [];
        if (action === 'hit') strike();
        if (action === 'recall') w.executeSkill(p,releaseSkill(releaseSkills.spear_recall),p.pos);
        if (action === 'death') {
          kin = w.createMonster('zombie',1,'enemy'); kin.pos = { x:target.pos.x+36, y:target.pos.y };
          kin.tier = p.tier; kin.spawnedAt = -30; w.actors.push(kin);
          const life = kin.life; w.kill(target,false,p);
          if (kin.life !== life || target.statuses.some(s => s.id === 'impaled')) failures.push('ordinary death harmed kin or retained steel');
        }
      }
      const releases = w.flashes.filter(f => f.statusRelease);
      const quiet = ['death','lodge'].includes(action);
      if (releases.length !== (quiet ? 0 : 1)) failures.push(label+' unexpected release count '+releases.length);
      r.ctx = c;
      c.resetTransform(); c.fillStyle = '#252c32'; c.fillRect(0,0,240,150);
      c.save();
      c.translate(120,75);
      const scale = element ? 0.99 : 2;
      c.scale(scale,scale); c.translate(-target.pos.x,-target.pos.y);
      if (!target.dead) r.drawActor(target,w);
      if (kin) r.drawActor(kin,w);
      const before = c.getImageData(0,0,240,150).data;
      for (const f of releases) {
        if (!releaseVoice(f.fx)) failures.push(label+' drew the fallback ring');
        r.drawFlash({...f, life:f.maxLife * 0.64});
      }
      c.restore();
      const after = c.getImageData(0,0,240,150).data;
      let changed = 0;
      for (let j=0;j<after.length;j+=4) if (Math.abs(after[j]-before[j])+Math.abs(after[j+1]-before[j+1])+Math.abs(after[j+2]-before[j+2]) > 35) changed++;
      if (!quiet && changed < 28) failures.push(label+' produced too little visible material');
      const x=(i%4)*240, y=Math.floor(i/4)*186;
      g.drawImage(tile,x,y); g.fillStyle='#151b1f'; g.fillRect(x,y+150,240,36);
      g.font='15px Verdana'; g.fillStyle='#e8dec9'; g.fillText(label,x+12,y+173,216);
    }
    return {count:samples.length,failures,samples:sheet.toDataURL(),fatal:__game.crash().fatal};
  } finally { r.ctx = original; }
};
