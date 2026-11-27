// Run after node scripts/orb-mixer/build.mjs. The optional capture is a local report.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { makeTempDir } = require('../../scripts/temp-dir.cjs');

app.setPath('userData', makeTempDir('hollow-orb-mixer-'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
let step = 'opening the window';
const deadline = setTimeout(() => { console.error('Timed out ' + step); app.exit(1); }, 45000);
async function run() {
  await app.whenReady();
  const reports = path.resolve(__dirname, '../../balance/reports');
  const win = new BrowserWindow({ width: 980, height: 840, useContentSize: true, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    const page = win.webContents, js = source => { step = source.slice(0, 90); return page.executeJavaScript(source); };
    await win.loadURL('about:blank');
    step = 'setting reduced motion';
    page.debugger.attach();
    await page.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await win.loadFile(path.join(reports, 'orb-motion.html'));
    const setup = `window.byId = id => document.getElementById(id);
      window.images = id => [...document.querySelectorAll('.'+id+' canvas')].map(c => c.toDataURL());
      window.adjust = (id,n) => {const el=byId(id); el.value=n; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change'))};
      window.tick = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      void 0`;
    await js(setup);
    assert.equal(await js("byId('play').textContent"), 'Play motion');
    assert.equal(await js("document.querySelectorAll('.layer').length"), 12);
    const enabled = await js(`Object.fromEntries([...document.querySelectorAll('.layer input:checked')]
      .map(box => [box.id, byId(box.id + '-strength').valueAsNumber]))`);
    assert.deepEqual(enabled, {
      'life-bloom': 60, 'life-swirl': 60, 'life-bubbles': 85,
      'mana-bloom': 100, 'mana-motes': 100, 'mana-glint': 80,
    });
    assert.ok(await js("images('life')[0]===images('life')[1] && images('mana')[0]===images('mana')[1] && byId('pin').disabled"));
    await js("window.originalMana = images('mana'); byId('life-bubbles').click()");
    assert.ok(await js("images('life')[0]!==images('life')[1] && !byId('pin').disabled"));
    assert.deepEqual(await js("images('mana')"), await js('originalMana'));
    await js("byId('life-bubbles').click(); byId('life-facets').click(); byId('pin').click(); window.pinned = images('life')[1]");
    assert.ok(await js("byId('pin').disabled && images('life')[0]===pinned"));
    await js("adjust('life-bubbles-strength',25); byId('mana-facets').click()");
    assert.ok(await js("images('life')[1]===pinned && images('life')[0]!==pinned && images('mana')[0]!==images('mana')[1]"));
    // Loading the same local file exercises persistence without a game save or a network service.
    await win.loadFile(path.join(reports, 'orb-motion.html')); await js(setup);
    assert.ok(await js("byId('life-bubbles-strength').value==='25' && byId('mana-facets').checked && !byId('restore').disabled"));
    await js("byId('restore').click(); byId('life-bubbles').click(); byId('life-bubbles').click()");
    assert.ok(await js("byId('life-bubbles-strength').value==='85' && !byId('mana-facets').checked && images('life')[0]===images('life')[1]"));
    await js("document.querySelectorAll('.life .layer input:checked').forEach(el=>el.click()); adjust('fill',0)");
    assert.ok(await js("document.querySelector('.life figcaption').textContent==='Still liquid' && images('life')[0]===images('life')[1]"));
    await js("adjust('fill',65); byId('compact').click(); byId('detail').click(); byId('restore').click()");
    assert.ok(await js("images('life')[0]===images('life')[1] && images('mana')[0]===images('mana')[1]"));
    await js("localStorage.removeItem('hollow-wake.orb-mixer.v1')"); await win.loadFile(path.join(reports, 'orb-motion.html')); await js(setup);
    await js("window.still = images('life')[0]; byId('play').click()");
    await js("new Promise(r=>setTimeout(r,350))");
    assert.ok(await js("images('life')[0]!==still && byId('play').textContent==='Pause motion'"));
    await js("byId('play').click(); window.held = images('life')[0]; tick()");
    assert.ok(await js("images('life')[0]===held"));
    if (process.argv.includes('--capture')) {
      await js("byId('play').click(); tick()");
      const h = await js("Math.ceil(document.querySelector('main').getBoundingClientRect().height)");
      const shot = await page.capturePage({ x: 0, y: 0, width: 980, height: h });
      fs.writeFileSync(path.join(reports, 'orb-mixer.png'), shot.toPNG());
    }
    win.setContentSize(360,800); await js('tick()');
    assert.ok(await js("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.strength input')].every(el=>el.getBoundingClientRect().width>=40)"));
    console.log('PASS mixer defaults, independent layers, strengths, pin/restore, reload, fill, zoom, compact view, reduced motion, playback and phone layout.');
  } finally { clearTimeout(deadline); win.destroy(); }
}
run().then(() => app.exit(0), error => { console.error(error); app.exit(1); });
