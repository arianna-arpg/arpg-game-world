// ---------------------------------------------------------------------------
// ELECTRON CANVAS2D + GPU COMPOSITOR COMBAT STRESS HARNESS (`npm run perf:combat`)
//
// Builds a fresh production bundle into `dist/`, opens a real GPU-accelerated
// Electron window (or offscreen with `--offscreen=1`) while respecting the
// machine-wide `hollow-wake-perf.lock` compositor mutex, and runs the shared
// 4-scenario combat stress suite (`window.__game.combatStress`), capturing:
//   - Full 8-slab Render breakdown (`cullLightsVeil` .. `wordsHud`)
//   - Full 8-slab Sim breakdown (`input` .. `separation`)
//   - Chromium CDP `Performance.getMetrics` (`JSHeapUsedSize`, `LayoutCount`, `TaskDuration`)
//   -Chunk bakes (`snowBakes`, `groundBakes`) & StatSheet/raycast forensic counters
//
// Usage:
//   npm run perf:combat -- --label=baseline
//   npm run perf:combat -- --label=after --compare=baseline
// ---------------------------------------------------------------------------

const { app, BrowserWindow, powerSaveBlocker } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { startGameServer } = require('../launcher/server.cjs');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const REPORTS_DIR = path.join(__dirname, 'reports');
fs.mkdirSync(REPORTS_DIR, { recursive: true });

const flag = (name, fallback) => {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

const label = flag('label', 'current').replace(/[^a-z0-9_-]/gi, '');
const compareLabel = flag('compare', '').replace(/[^a-z0-9_-]/gi, '');
const filter = flag('filter', '');
const warmupTicks = Math.max(0, Number(flag('warmup', '120')));
const measureTicks = Math.max(30, Number(flag('ticks', '300')));
const offscreen = flag('offscreen', '0') === '1';
const skipBuild = flag('no-build', '0') === '1';
const ablate = flag('ablate', '').split(',').map(s => s.trim()).filter(Boolean);

app.setPath('userData', path.join(REPORTS_DIR, `combat-perf-profile-${process.pid}`));
app.commandLine.appendSwitch('js-flags', '--expose-gc');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-background-timer-throttling');

const lockPath = path.join(os.tmpdir(), 'hollow-wake-perf.lock');
let lockHeld = false;

function acquirePerfLock() {
  if (offscreen) return true;
  const LOCK_FRESH_MS = 180_000;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), lane: 'perf:combat' }));
      fs.closeSync(fd);
      lockHeld = true;
      return true;
    } catch (e) {
      if (e?.code !== 'EEXIST') return true;
      let prev = {};
      try { prev = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { /* ignore */ }
      let alive = false;
      if (typeof prev.pid === 'number') {
        try { process.kill(prev.pid, 0); alive = true; } catch (ke) { alive = ke?.code === 'EPERM'; }
      }
      let beatAgo = Infinity;
      try { beatAgo = Date.now() - fs.statSync(lockPath).mtimeMs; } catch { /* ignore */ }
      if (alive && beatAgo < LOCK_FRESH_MS) {
        console.error(`PERF:COMBAT REFUSED: compositor lock held by pid ${prev.pid} (${Math.round(beatAgo / 1000)}s ago).`);
        return false;
      }
      try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
    }
  }
  return true;
}

function releasePerfLock() {
  if (!lockHeld) return;
  lockHeld = false;
  try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
}

process.on('exit', releasePerfLock);

function pctDelta(before, after) {
  if (before === 0) return after === 0 ? '0.0%' : 'n/a';
  const d = ((after - before) / before) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
}

function formatMarkdown(out, baseline) {
  const renNames = [
    'cullLightsVeil', 'groundDoodads', 'fieldsCorpsesDrops', 'actors',
    'projectiles', 'veilsCanopy', 'lightsAtmos', 'wordsHud',
  ];
  const lines = [];
  lines.push(`# Combat & Swarm Canvas2D/GPU Forensics — \`${out.label}\``);
  lines.push('');
  lines.push(`- Generated: ${out.generatedAt}`);
  lines.push(`- Window: ${out.width}x${out.height} (${out.offscreen ? 'offscreen' : 'visible GPU compositor'}), warmup ${out.warmupTicks} ticks, measured ${out.measureTicks} frames`);
  lines.push('');
  lines.push('## Frame & Render Headline Summary');
  lines.push('');
  lines.push('| Scenario | Wall fps | Sim mean / p99 (ms) | Ren mean / p95 / p99 / max (ms) | Actors / Proj / Lite | Stat Hit% | JS Heap Δ MB |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const s of out.scenarios) {
    const fps = (s.measureTicks / Math.max(0.001, s.wallMs / 1000)).toFixed(1);
    const st = s.slabs.simTotal;
    const rt = s.slabs.renTotal;
    const e = s.slabs.entities;
    const heapDeltaMB = s.cdp ? ((s.cdp.heapAfterBytes - s.cdp.heapBeforeBytes) / (1024 * 1024)).toFixed(2) : 'n/a';
    lines.push(
      `| \`${s.id}\` | ${fps} | ${st.mean.toFixed(2)} / ${st.p99.toFixed(2)} | ${rt.mean.toFixed(2)} / ${rt.p95.toFixed(2)} / ${rt.p99.toFixed(2)} / ${rt.max.toFixed(2)} | ${e.actorsMean} / ${e.projectilesMean} / ${e.liteMean} | ${s.slabs.counters.statHitRatePct.toFixed(1)}% | ${heapDeltaMB} |`,
    );
  }
  lines.push('');
  lines.push('## Render Slab Breakdown (mean ms / frame)');
  lines.push('');
  lines.push(`| Scenario | ${renNames.map(n => `\`${n}\``).join(' | ')} |`);
  lines.push(`|---|${renNames.map(() => '---:').join('|')}|`);
  for (const s of out.scenarios) {
    const cols = renNames.map(k => s.slabs.renSlabs[k].mean.toFixed(3)).join(' | ');
    lines.push(`| \`${s.id}\` | ${cols} |`);
  }

  if (baseline) {
    lines.push('');
    lines.push(`## Comparison vs \`${baseline.label}\``);
    lines.push('');
    lines.push('| Scenario | Ren mean (before → after) | Ren p99 (before → after) | `actors` slab (before → after) | Sim mean (before → after) | Wall ms (before → after) |');
    lines.push('|---|---:|---:|---:|---:|---:|');
    for (const s of out.scenarios) {
      const b = baseline.scenarios.find(x => x.id === s.id);
      if (!b) continue;
      lines.push(
        `| \`${s.id}\` | ${b.slabs.renTotal.mean.toFixed(3)} → ${s.slabs.renTotal.mean.toFixed(3)} (${pctDelta(b.slabs.renTotal.mean, s.slabs.renTotal.mean)}) | ${b.slabs.renTotal.p99.toFixed(3)} → ${s.slabs.renTotal.p99.toFixed(3)} (${pctDelta(b.slabs.renTotal.p99, s.slabs.renTotal.p99)}) | ${b.slabs.renSlabs.actors.mean.toFixed(3)} → ${s.slabs.renSlabs.actors.mean.toFixed(3)} (${pctDelta(b.slabs.renSlabs.actors.mean, s.slabs.renSlabs.actors.mean)}) | ${b.slabs.simTotal.mean.toFixed(3)} → ${s.slabs.simTotal.mean.toFixed(3)} (${pctDelta(b.slabs.simTotal.mean, s.slabs.simTotal.mean)}) | ${b.wallMs.toFixed(0)} → ${s.wallMs.toFixed(0)} (${pctDelta(b.wallMs, s.wallMs)}) |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

if (!acquirePerfLock()) {
  process.exit(3);
}

if (!skipBuild || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.log('[perf:combat] Building fresh production bundle into dist/ ...');
  const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
  execFileSync(process.execPath, [viteBin, 'build', '--logLevel', 'warn'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
}

app.whenReady().then(async () => {

  const blockerId = powerSaveBlocker.start('prevent-display-sleep');
  const beatTimer = lockHeld ? setInterval(() => {
    try { const now = new Date(); fs.utimesSync(lockPath, now, now); } catch { /* ignore */ }
  }, 1000) : null;

  const savesDir = path.join(REPORTS_DIR, `combat-perf-saves-${process.pid}`);
  const server = await startGameServer({ root: DIST_DIR, savesDir });
  const width = 1400;
  const height = 900;
  const win = new BrowserWindow({
    show: !offscreen,
    width,
    height,
    useContentSize: true,
    webPreferences: {
      offscreen,
      backgroundThrottling: false,
    },
  });

  const consoleErrors = [];
  win.webContents.on('console-message', e => {
    if (e.level === 'error') consoleErrors.push(e.message);
  });

  try {
    await win.loadURL(server.url);
    const bootDeadline = Date.now() + 15000;
    while (Date.now() < bootDeadline) {
      const ready = await win.webContents.executeJavaScript('typeof window.__game');
      if (ready === 'object') break;
      await new Promise(r => setTimeout(r, 100));
    }
    const readyFinal = await win.webContents.executeJavaScript('typeof window.__game');
    if (readyFinal !== 'object') throw new Error(`window.__game did not mount (got ${readyFinal})`);

    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Performance.enable');

    const getMetricsMap = async () => {
      const { metrics } = await win.webContents.debugger.sendCommand('Performance.getMetrics');
      return Object.fromEntries(metrics.map(m => [m.name, m.value]));
    };

    // Run each scenario individually from the host side so we can sample exact CDP metrics around it.
    const scenarioIds = await win.webContents.executeJavaScript(`(async () => {
      await window.__game.hydrated();
      return ['necromancer_court_siege', 'projectile_masonry_storm', 'affliction_proc_maelstrom', 'lite_throng_stampede'];
    })()`, true);

    const tokens = filter.split(',').map(s => s.trim()).filter(Boolean);
    const wanted = tokens.length ? scenarioIds.filter(id => tokens.some(t => id.includes(t))) : scenarioIds;
    const scenarios = [];

    for (const id of wanted) {
      console.log(`[perf:combat] Running scenario: ${id} ...`);
      await win.webContents.executeJavaScript('window.gc && window.gc(); void 0;');
      const mBefore = await getMetricsMap();
      const rep = await win.webContents.executeJavaScript(
        `window.__game.combatStress(${JSON.stringify({ filter: id, warmupTicks, measureTicks, ablate })})`,
        true,
      );
      const mAfter = await getMetricsMap();
      const row = rep.scenarios[0];
      if (row) {
        row.cdp = {
          heapBeforeBytes: mBefore.JSHeapUsedSize ?? 0,
          heapAfterBytes: mAfter.JSHeapUsedSize ?? 0,
          taskDurationSec: +((mAfter.TaskDuration ?? 0) - (mBefore.TaskDuration ?? 0)).toFixed(3),
          layoutCountDelta: (mAfter.LayoutCount ?? 0) - (mBefore.LayoutCount ?? 0),
          recalcStyleDelta: (mAfter.RecalcStyleCount ?? 0) - (mBefore.RecalcStyleCount ?? 0),
        };
        scenarios.push(row);
      }
    }

    const out = {
      generatedAt: new Date().toISOString(),
      label,
      width,
      height,
      offscreen,
      ablate,
      warmupTicks,
      measureTicks,
      consoleErrors,
      scenarios,
    };

    let baseline;
    if (compareLabel) {
      const basePath = path.join(REPORTS_DIR, `combat-ui-${compareLabel}.json`);
      if (fs.existsSync(basePath)) {
        baseline = JSON.parse(fs.readFileSync(basePath, 'utf8'));
      }
    }

    const jsonPath = path.join(REPORTS_DIR, `combat-ui-${label}.json`);
    const mdPath = path.join(REPORTS_DIR, `combat-ui-${label}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
    const md = formatMarkdown(out, baseline);
    fs.writeFileSync(mdPath, md);

    console.log(md);
    console.log(`Saved: ${jsonPath}`);
    console.log(`Saved: ${mdPath}`);
    if (consoleErrors.length) {
      console.warn('[warn] Console errors during run:', consoleErrors);
    }
  } finally {
    if (beatTimer) clearInterval(beatTimer);
    if (powerSaveBlocker.isStarted(blockerId)) powerSaveBlocker.stop(blockerId);
    releasePerfLock();
    win.destroy();
    server.server.close();
    try { fs.rmSync(savesDir, { recursive: true, force: true }); } catch { /* ignore */ }
    app.quit();
  }
}).catch(err => {
  releasePerfLock();
  console.error(err?.stack ?? String(err));
  app.exit(1);
});
