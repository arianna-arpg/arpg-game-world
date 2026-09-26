// Built-game casts and visual captures, isolated from the player's saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname, '..'), reports = path.join(__dirname, 'reports');
fs.mkdirSync(reports, { recursive: true });
const gems = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
  "import { SKILLS } from './src/data/skills.ts'; import { makeSkillGem } from './src/engine/skills.ts'; console.log(JSON.stringify(['summon_stone_golem','summon_rubblekin'].map(id=>makeSkillGem(SKILLS[id],20,'rare'))));"],
  { cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' }));
app.disableHardwareAcceleration();
app.setPath('userData', path.join(reports, `landslide-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.join(root, 'dist'), savesDir: path.join(reports, `landslide-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const js = source => win.webContents.executeJavaScript(source);
  const shot = async name => {
    // The canvas has rendered synchronously, but Electron composites it later.
    await wait(150);
    fs.writeFileSync(path.join(reports, name), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url); await wait(1000);
    await js(`__game.account().ledger.prologue_lived=1; __game.account().ledger.odyssey_stage_2=1; __game.ui.hideAll(); __game.devStartRun('brawler'); __game.step(60);
      window.w=__game.world(); w.devIgnoreSkillAttributes=true;
      w.zoneMap.qa_landslide={id:'qa_landslide',name:'Living Quarry',level:1,size:{w:1600,h:1200},seed:71107,
        theme:{floor:'#383932',grid:'#404037',border:'#5d5b4c',obstacle:'#444',obstacleEdge:'#555',accent:'#aa9b7e'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_landslide'); w.player.pos={x:800,y:600}; w.actors=[w.player];
      for(const gem of ${JSON.stringify(gems)}) {
        const item=w.grantSkillGemItem(w.localSeat,gem);
        if(!item || !w.learnSkill(item.uid,w.localSeat,gem.def.id==='summon_stone_golem'?3:4)) throw Error('learn '+gem.def.id);
        __game.account().memorySecondary.add('skill:'+gem.def.id);
      }
      w.player.sheet.setSource('landslide:qa',[{stat:'mana',kind:'flat',value:1000}]); w.player.fillResources();
      window.stone=w.player.skills[3]; window.rubble=w.player.skills[4];
      w.useSkill(w.player,stone,w.player.pos); __game.step(90); w.player.useLock=0; w.player.fillResources();
      w.useSkill(w.player,rubble,w.player.pos); __game.step(90); void 0`);
    assert.deepEqual(await js(`({major:w.minionsOfGroup(w.player,'golem').length, rubble:w.minionsOfSkill(w.player,'summon_rubblekin').length,reserve:w.player.reservedMana})`),
      { major: 1, rubble: 4, reserve: 67 });
    await js(`window.children=w.minionsOfSkill(w.player,'summon_rubblekin');
      children.forEach((a,i)=>{a.pos={x:w.player.pos.x+30+i*28,y:w.player.pos.y+35};a.anchored=true;a.passive=true;});
      const father=w.minionsOfGroup(w.player,'golem')[0]; father.pos={x:w.player.pos.x+130,y:w.player.pos.y-40};father.anchored=true;father.passive=true;
      w.texts=[]; __game.step(2); void 0`);
    await shot('landslide-flock.png');
    await js(`children.forEach((a,i)=>a.pos={x:w.player.pos.x-100,y:w.player.pos.y-50+i*32}); children[0].pos={x:w.player.pos.x+38,y:w.player.pos.y};
      w.player.facing=0; w.player.casting=null;
      w.executeSkill(w.player,w.player.skills[0],{x:w.player.pos.x+500,y:w.player.pos.y},{keepFacing:true}); __game.step(8); void 0`);
    assert(await js('!!children[0].summonReform && w.projectiles.some(p=>p.caster===children[0])'));
    await shot('landslide-launch.png');
    await js('__game.step(270); void 0');
    assert(await js('children.every(a=>!a.dead&&!a.summonReform) && w.player.reservedMana===67'));
    await js(`for(const node of ['bursting_seams','singing_shale','long_echo']) w.pickTreeNode('summon_rubblekin',node);
      __game.step(280); window.children=w.minionsOfSkill(w.player,'summon_rubblekin');
      children.forEach((a,i)=>{a.anchored=true;a.passive=true;a.pos={x:w.player.pos.x-100,y:w.player.pos.y-50+i*32};}); children[0].pos={x:w.player.pos.x+38,y:w.player.pos.y};
      w.texts=[];
      w.player.facing=0; w.executeSkill(w.player,w.player.skills[0],{x:w.player.pos.x+500,y:w.player.pos.y},{keepFacing:true}); __game.step(10); void 0`);
    assert(await js("w.projectiles.some(p=>p.inst.def.id==='rubble_conduit')"), JSON.stringify(await js(`({tree:rubble.treeNodes,level:rubble.level,p:w.player.pos,children:children.map(a=>({pos:a.pos,reform:a.summonReform,skills:a.skills.filter(Boolean).map(s=>s.def.id)})),shots:w.projectiles.map(p=>p.inst.def.id)})`)));
    assert.deepEqual(await js('rubble.treeNodes'), ['bursting_seams','singing_shale','long_echo']);
    await shot('landslide-conduit.png');
    assert.equal(await js('!!__game.crash().fatal'), false);
    assert.deepEqual(errors, []);
    console.log('LANDSLIDE UI OK: learned gems, reserved major + flock, real melee release, reconstruction and conduit rendering');
  } catch (error) { console.error(error, errors); await shot('landslide-failure.png'); process.exitCode = 1; }
  finally { win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { console.error(error); app.exit(1); });
