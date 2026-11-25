// Recreate the HUD-free fight plate from a built client: electron capture.cjs <dist>.
const {app, BrowserWindow} = require('electron');
const {writeFileSync} = require('node:fs');
const path = require('node:path');
const {startGameServer} = require('../../launcher/server.cjs');
const {makeTempDir} = require('../temp-dir.cjs');
const scratch = makeTempDir('hollow-hotbar-plate-');
app.setPath('userData',path.join(scratch,'profile'));
app.disableHardwareAcceleration();

const shot = {
  id:'hotbar-study', seed:1062, zone:{tileset:'crypt',seed:31,level:12}, clear:'all', at:'open', day:.23,
  hero:{id:'study',classId:'warrior',level:15,skills:[{id:'ground_slam'},{id:'shock_nova'},{id:'cleave'}]},
  foes:[
    {def:'skeleton_warrior',count:11,at:{ring:150,jitter:25},provoke:true},
    {def:'ember_wisp',count:8,at:{ring:210,jitter:30},provoke:true},
    {def:'skeleton_archer',count:7,at:{ring:290,jitter:40},provoke:true},
  ],
  guard:true, agent:{enabled:true}, camera:{follow:'hero',zoom:2.4,offset:{x:0,y:30}},
  cues:[{at:0,orders:[{do:'cast',skill:'shock_nova'},{do:'cast',skill:'ground_slam'}]}],
  duration:2, fps:30, hud:false, clean:false, cinematic:false,
};
async function capture(){
  await app.whenReady();
  const game = await startGameServer({root:path.resolve(process.argv[2] || 'dist'),savesDir:path.join(scratch,'saves')});
  const win = new BrowserWindow({show:false,width:1180,height:440,webPreferences:{offscreen:true,backgroundThrottling:false}});
  try {
    await win.loadURL(game.url);
    const data = await win.webContents.executeJavaScript(`(async()=>{
      for(let i=0; i<400 && !window.__game; i++) await new Promise(r=>setTimeout(r,50));
      await __game.hydrated(); __game.settings().renderScale=1;
      const d=__game.director();d.setViewport(1180,440);const staging=d.stage(${JSON.stringify(shot)});
      if(staging.warnings.length)throw Error(staging.warnings.join(', '));
      for(let i=0;i<24;i++)d.frame();
      const frame=d.canvas.toDataURL('image/webp',.83);d.end();return frame;
    })()`);
    if (!data.startsWith('data:image/webp;base64,')) throw Error('Missing combat frame');
    writeFileSync(path.join(__dirname,'combat.webp'),Buffer.from(data.split(',')[1],'base64'));
  } finally {win.destroy();game.server.close();}
}
capture().then(()=>app.exit(0),err=>{console.error(err);app.exit(1);});
