// THE SKILL SHOWCASE WALKTHROUGH (hidden harness; not a probe-gate rig).
// Boots a built game in Electron (a temp saves folder, a throwaway
// partition: nothing touches saves/), starts a run, puts skill gems in the
// bag and walks the live showcase through its temporary seat, the bag gem's
// tooltip:
//   the tooltip carries the showcase element and it mounts;
//   the engine boots lazily in ONE hidden frame and frames arrive and move;
//   the first boot's main-thread hitch is measured (reported, not gated);
//   the cursor leaving stops the loop; a second gem restages, never reboots;
//   the engine's realm cannot write a save (the shield) or read the player's.
// Frames land in balance/reports/skill-showcase/ (gitignored).
//
// usage: npm run build && npx electron balance/skill-showcase-ui.cjs [--root dist] [--keep]
// Contract: docs/engine/skill-showcases.md
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');

const REPO = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
const ROOT = path.resolve(REPO, arg('root', 'dist'));
const OUT = path.resolve(arg('out', path.join(__dirname, 'reports', 'skill-showcase')));
fs.mkdirSync(OUT, { recursive: true });
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(ROOT, 'showcase.html'))) { console.error(`no showcase.html in ${ROOT} (npm run build first)`); app.exit(2); return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-showcase-qa-'));
  app.setPath('userData', path.join(tmp, 'user'));
  const server = await startGameServer({ root: ROOT, savesDir: path.join(tmp, 'saves') });
  const saveHits = [];
  server.server.on('request', (req) => { if ((req.url || '').startsWith('/__save')) saveHits.push(`${req.method} ${req.url}`); });
  const win = new BrowserWindow({
    show: true, x: -4200, y: 40, width: 1280, height: 800, useContentSize: true, skipTaskbar: true, focusable: false,
    webPreferences: { partition: 'skill-showcase-qa-' + process.pid, backgroundThrottling: false },
  });
  const logs = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') logs.push(String(e.message).slice(0, 200)); });
  const js = (code) => win.webContents.executeJavaScript(code);
  const waitFor = async (code, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { let ok = false; try { ok = !!(await js('!!(' + code + ')')); } catch { ok = false; } if (ok) return true; await sleep(100); }
    return false;
  };
  const shot = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  const hover = async (sel) => {
    const r = await js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
    if (!r) return false;
    for (const dx of [-3, 0]) { win.webContents.sendInputEvent({ type: 'mouseMove', x: r.x + dx, y: r.y }); await sleep(60); }
    return true;
  };
  const stats = () => js('window.__skillShowcases ? window.__skillShowcases.stats() : null');

  await win.loadURL(server.url);
  await waitFor('window.__game && window.__game.hydrated', 20000);
  await js('window.__game.hydrated()');
  // A frame-gap recorder: the worst main-thread stall while the engine boots.
  await js(`(() => { window.__gap = { last: performance.now(), worst: 0 }; const f = (t) => { const g = window.__gap; g.worst = Math.max(g.worst, t - g.last); g.last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); })()`);
  const run = await js(`(() => {
    const G = window.__game;
    G.account().ledger.prologue_lived = 1;
    G.devStartRun('sorcerer');
    const w = G.world();
    const mint = (id, level) => {
      const slot = G.devGrantSkill(id, level, 7);
      const src = w.player.skills[slot];
      const item = w.grantSkillGemItem(w.localSeat, { def: src.def, level, sockets: [null, null, null], rarity: 'rare' });
      w.player.skills[slot] = null;
      return item ? item.uid : null;
    };
    const a = mint('frost_nova', 7), b = mint('glass_lance', 9);
    G.ui.toggleInventory();
    return { a, b, installed: !!window.__skillShowcases };
  })()`);
  check('the host installs at boot', run.installed);
  check('two skill gems land in the bag', run.a && run.b, JSON.stringify(run));
  await sleep(400);

  // ── 1. hover the first gem: the tooltip seats the showcase ───────────────────
  const selA = `[data-tip="item"][data-item-uid="${run.a}"]`, selB = `[data-tip="item"][data-item-uid="${run.b}"]`;
  check('the first gem is on screen', await hover(selA));
  check('its tooltip carries a showcase element', await waitFor(`!!document.querySelector('#tooltip .skill-showcase[data-skill-showcase="frost_nova"]')`, 4000));
  await js('window.__gap.worst = 0; window.__gap.last = performance.now(); true');
  const t0 = Date.now();
  check('the engine boots in one hidden frame', await waitFor(`window.__skillShowcases.stats().engine && document.querySelectorAll('iframe[data-skill-showcase-engine]').length === 1`, 20000));
  const bootMs = Date.now() - t0;
  check('frames arrive in the tooltip', await waitFor(`window.__skillShowcases.stats().blits > 10`, 8000), `${bootMs} ms to boot`);
  const hitch = await js('Math.round(window.__gap.worst)');
  const engineBoot = await js(`Math.round(document.querySelector('iframe[data-skill-showcase-engine]').contentWindow.__hwShowcase.bootMs)`);
  console.log(`INFO  engine boot ${engineBoot} ms; worst main-thread frame gap while it booted: ${hitch} ms`);
  const sample = `(() => { const c = document.querySelector('#tooltip .skill-showcase canvas'); if (!c || !c.width) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0, sum = 0; for (let i = 0; i < d.length; i += 16) { const v = d[i] + d[i + 1] + d[i + 2]; sum += v; if (v > 90) lit++; } return { w: c.width, h: c.height, lit, sum }; })()`;
  const s1 = await js(sample);
  await sleep(700);
  const s2 = await js(sample);
  check('the stage is drawn (lit pixels)', s1 && s1.lit > 20, JSON.stringify(s1));
  check('the stage moves (frames differ)', s1 && s2 && s1.sum !== s2.sum, `${s1 && s1.sum} → ${s2 && s2.sum}`);
  const st = await stats();
  check('the engine plays the hovered gem', st && st.playing && st.playing.startsWith('frost_nova|7'), JSON.stringify(st));
  await shot('01-tooltip-showcase');

  // ── 2. the cursor leaves: the loop stops ───────────────────────────────────
  win.webContents.sendInputEvent({ type: 'mouseMove', x: 1240, y: 760 });
  await sleep(80);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: 1250, y: 770 });
  check('leaving hides the showcase and stops the loop', await waitFor(`(() => { const s = window.__skillShowcases.stats(); return s.visible === 0 && !s.running; })()`, 4000));

  // ── 3. a second gem restages in the same engine ────────────────────────────
  check('the second gem is on screen', await hover(selB));
  check('its showcase plays the second skill', await waitFor(`(window.__skillShowcases.stats().playing || '').startsWith('glass_lance|9')`, 6000));
  check('still one engine (restage, never reboot)', (await js(`document.querySelectorAll('iframe[data-skill-showcase-engine]').length`)) === 1);
  await sleep(1200);
  await shot('02-second-gem');

  // ── 4. the shield: the engine's realm writes nowhere, reads nothing ───────
  const before = saveHits.length;
  const shield = await js(`(async () => {
    const fw = document.querySelector('iframe[data-skill-showcase-engine]').contentWindow;
    const r = await fw.fetch('/__save/0', { method: 'POST', body: '{}' });
    const beacon = fw.navigator.sendBeacon('/__save/0', '{}');
    return { status: r.status, beacon, account: fw.localStorage.getItem('arpg_account_v1'), mine: window.localStorage.getItem('arpg_account_v1') !== null };
  })()`);
  await sleep(300);
  check('the engine realm cannot write a save', shield.status === 404 && saveHits.length === before, JSON.stringify({ ...shield, hits: saveHits.length - before }));
  check("the engine realm never reads the player's account", shield.account === null && shield.mine, '');

  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const failed = results.filter((r) => !r.ok);
  console.log(`\nSKILL SHOWCASE ${failed.length ? 'FAILED' : 'OK'}: ${results.length - failed.length}/${results.length}  frames: ${OUT}`);
  if (!process.argv.includes('--keep')) { server.server.close(); app.exit(failed.length ? 1 : 0); }
});
