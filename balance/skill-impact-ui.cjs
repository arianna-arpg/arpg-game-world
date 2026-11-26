// Run with node. The parent owns the throwaway build and profile until Electron exits.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFile, execFileSync } = require('node:child_process');
const { promisify } = require('node:util');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const repo = path.resolve(__dirname, '..');
if (!process.versions.electron) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-skill-impact-'));
  try {
    execFileSync(require('electron'), [__filename, scratch], { cwd: repo, stdio: 'inherit', timeout: 540000, windowsHide: true });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 225 });
  }
} else {
  const { app, BrowserWindow } = require('electron');
  const { startGameServer } = require('../launcher/server.cjs');
  const scratch = process.argv[2] || makeTempDir('hollow-skill-impact-'), root = path.join(scratch, 'dist');
  const prepared = buildClient(scratch);
  void prepared.catch(() => {});
  app.setPath('userData', path.join(scratch, 'profile')); app.disableHardwareAcceleration();
  app.whenReady().then(async () => {
    let win, server;
    try {
      await prepared;
      server = await startGameServer({ root, savesDir: path.join(scratch, 'saves') });
      win = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { offscreen: true, backgroundThrottling: false } });
      await win.loadURL(server.url);
      await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
      const entry = JSON.parse(fs.readFileSync(path.join(scratch, 'qa-entry.json'), 'utf8'));
      await win.webContents.executeJavaScript('import(' + JSON.stringify(new URL(entry, server.url).href) + ').then(()=>true)');
      const result = await win.webContents.executeJavaScript('(' + visualCourse.toString() + ')()');
      console.log('PASS ' + result.count + ' source-specific area impacts paint in the game renderer; geometry, recoloring and native channel frames passed.');
      if (process.env.SKILL_IMPACT_PREVIEW) fs.writeFileSync(process.env.SKILL_IMPACT_PREVIEW, Buffer.from(result.preview.split(',')[1], 'base64'));
    } finally { win?.destroy(); server?.server.close(); }
  }).then(() => app.exit(0), err => { console.error(err); app.exit(1); });
}

async function buildClient(scratch) {
  const entry = path.join(scratch, 'impact-qa.mjs');
  const moduleAt = file => JSON.stringify(path.join(repo, 'src', file).replaceAll('\\', '/'));
  fs.writeFileSync(entry, 'import {SKILLS} from ' + moduleAt('data/skills') + ';\n' +
    'import {skillFieldImpactVoice} from ' + moduleAt('data/skillAreaVisuals') + ';\n' +
    'window.impactQA={SKILLS,skillFieldImpactVoice};');
  await promisify(execFile)(process.env.npm_node_execpath || 'node',
    [path.join(repo, 'scripts/build-ability-artwork-qa.mjs'), repo, scratch, entry],
    { cwd: repo, timeout: 420000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
}

function visualCourse() {
  const check = (ok, msg) => { if (!ok) throw Error(msg); };
  __game.account().ledger.prologue_lived = 1; __game.devStartRun('magician'); __game.ui.hideAll(); __game.hold(true);
  const { SKILLS, skillFieldImpactVoice } = window.impactQA;
  const renderer = __game.renderer, tmp = document.createElement('canvas');
  tmp.width = tmp.height = 128;
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  const original = renderer.ctx;
  function sample(id, life, strength = .6, extra = {}) {
    ctx.clearRect(0, 0, 128, 128);
    renderer.drawFlash({ pos: { x: 64, y: 64 }, radius: 54, color: '#78badd',
      life: .35 * life, maxLife: .35, facing: .4, shape: 0, fx: skillFieldImpactVoice(id),
      fieldImpact: { strength }, ...extra });
    return ctx.getImageData(0, 0, 128, 128).data;
  }
  try {
    renderer.ctx = ctx;
    const fallback = sample('', .78);
    const nativeFields = new Map();
    for (const id of Object.keys(SKILLS)) {
      const a = sample(id, .78), b = sample(id, .31);
      let pixels = 0, changed = 0, aboveFallback = 0, signature = 2166136261;
      for (let i = 3; i < a.length; i += 4) {
        if (a[i] > 4) pixels++;
        if (a[i] !== b[i]) changed++;
        if (Math.abs(a[i] - fallback[i]) > 4) aboveFallback++;
        signature = Math.imul(signature ^ (a[i] << 8 | b[i]), 16777619) >>> 0;
      }
      check(pixels > 8 && changed > 8 && aboveFallback > 8, id + ' missing, static or indistinguishable from the generic flash');
      if (['ground','aura'].includes(SKILLS[id].delivery.type)) {
        check(!nativeFields.has(signature), id + ' duplicates native field art from ' + nativeFields.get(signature));
        nativeFields.set(signature, id);
      }
    }
    const frost = sample('frost_storm', .72), full = sample('frost_storm', .72, 1);
    const recolor = sample('frost_storm', .72, .6, { color: '#b878de' });
    let rampDifference = 0;
    for (let i = 3; i < frost.length; i += 4) {
      check(frost[i] === recolor[i], 'Recolor changed Frost Storm geometry');
      if (frost[i] !== full[i]) rampDifference++;
    }
    check(rampDifference > 80, 'Full channel ramp needs a visible change');
    const safe = sample('frost_storm', .72, 1, { shape: 1, edgeFrac: .52 });
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++)
      if (Math.hypot(x - 64, y - 64) < 25 || x < 9 || x > 119 || y < 9 || y > 119)
        check(safe[(y * 128 + x) * 4 + 3] === 0, 'Snow crossed a safe boundary');
  } finally { renderer.ctx = original; }

  const w = __game.world();
  w.zoneMap.qa_impact = { id: 'qa_impact', name: 'Frost Study', level: 1,
    size: { w: 1800, h: 1400 }, seed: 78211, theme: { floor: '#39423f', grid: '#3e4643', border: '#52605b',
      obstacle: '#394340', obstacleEdge: '#586960', accent: '#a9c7bd' },
    layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
  w.loadZone('qa_impact'); const p = w.player; p.pos = { x: 900, y: 700 };
  w.actors = [p]; w.doodads = []; w.markDoodadsChanged(); w.flashes = []; w.zones = [];
  p.invulnerable = true; p.casting = null; p.useLock = 0;
  p.sheet.setSource('impact-qa', [{ stat: 'mana', kind: 'override', value: 100000 }]); p.fillResources();
  const home = { ...p.pos };
  const at = w.clampPos({ x: home.x + 87, y: home.y + 8 }, p.radius);
  const foe = w.createMonster('zombie', 1, 'enemy'); foe.pos = { ...at }; foe.brain = undefined;
  foe.passive = true; foe.anchored = true;
  foe.sheet.setSource('impact-qa', [{ stat: 'life', kind: 'override', value: 100000 }]); foe.fillResources(); w.actors.push(foe);
  __game.devGrantSkill('frost_storm', 1, 2);
  const inst = p.skills[2]; inst.def = { ...inst.def, requirements: undefined };
  p.aimPos = { ...at };
  check(w.useSkill(p, inst, at, true) && p.casting, 'Frost Storm did not begin');
  const sheet = document.createElement('canvas'); sheet.width = 900; sheet.height = 326;
  const out = sheet.getContext('2d'), canvas = document.getElementById('game');
  out.fillStyle = '#141b22'; out.fillRect(0, 0, sheet.width, sheet.height);
  const labels = ['First pulse', 'Building strength', 'Full strength'];
  let stage = 0;
  for (let i = 0; i < 400 && stage < labels.length; i++) {
    p.casting.held = true; w.time += 1 / 60; w.updateCasting(p, 1 / 60); w.updateZones(1 / 60);
    const hit = w.flashes.find(f => f.fx === skillFieldImpactVoice('frost_storm'));
    if (hit && hit.fieldImpact.strength >= [0, .45, .999][stage]) {
      check(!w.zones.some(z => z.inst.def.id === inst.def.id), 'Preview accidentally captured a persistent field');
      // The native release lasts .35s. Sample that flash 80 ms after impact.
      hit.life -= .08;
      w.texts = []; renderer.render(w);
      const center = renderer.toScreen(hit.pos);
      const sw = Math.min(296, Math.floor(canvas.width / 2)), sh = 264;
      out.drawImage(canvas, center.x - sw / 2, center.y - sh / 2, sw, sh, 2 + stage * 300, 2, 296, 264);
      out.fillStyle = '#eaf4fa'; out.font = '600 17px system-ui'; out.fillText(labels[stage], 15 + stage * 300, 293);
      out.fillStyle = '#a3b4c2'; out.font = '13px system-ui';
      out.fillText(Math.round(hit.fieldImpact.strength * 100) + '% of damage ramp', 15 + stage * 300, 314);
      stage++;
    }
    w.flashes.length = 0;
  }
  check(stage === 3, 'Held channel did not reach every visible stage');
  return { count: Object.keys(SKILLS).length, preview: sheet.toDataURL() };
}
