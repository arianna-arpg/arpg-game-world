// ---------------------------------------------------------------------------
// DESKTOP SHELL — Electron main process. The game stops being a browser tab:
//
//   LAUNCHER window  → shows the installed version, checks the GitHub repo
//                      (git fetch vs the configured remote/branch), offers
//                      one-click update (pull --ff-only → npm install →
//                      build), then launches the game.
//   GAME window      → a dedicated Chromium window (no menus, no extensions,
//                      no browser gestures to fight the game's input) served
//                      from dist/ over loopback HTTP by launcher/server.cjs,
//                      which also carries the /__save endpoints — saves land
//                      in the same saves/ folder as dev-server play.
//
// Everything tunable lives in launcher.config.json (committed defaults),
// deep-merged with launcher.config.local.json (gitignored, machine-local) —
// window mode, ports, repo remote/branch, update policy. No hardcoding.
//
// Flags:
//   --play                 skip the launcher, straight into the game
//   --smoke-test[=game|launcher]  headless self-check: boot, assert, exit.
//
// Build staleness is stamped: dist/.build-head records the HEAD hash + a
// digest of `git status --porcelain` at build time; Play rebuilds only when
// the stamp drifts, so day-to-day launches are instant.
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { startGameServer } = require('./server.cjs');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SAVES = path.join(ROOT, 'saves');
const STAMP = path.join(DIST, '.build-head');

// ------------------------------------------------------------------- config

/** @param {any} base @param {any} over @returns {any} */
function merge(base, over) {
  const out = { ...(base ?? {}) };
  for (const k of Object.keys(over ?? {})) {
    const b = base ? base[k] : undefined, o = over[k];
    out[k] = (b && o && typeof b === 'object' && typeof o === 'object'
      && !Array.isArray(b) && !Array.isArray(o)) ? merge(b, o) : o;
  }
  return out;
}

/** @param {string} file @returns {any} */
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

// Hard fallbacks so a missing/broken config file can never brick the launcher.
const CONFIG_DEFAULTS = {
  game: { title: 'ARPG Test Game' },
  repo: { remote: 'origin', branch: 'main' },
  updates: { checkOnLaunch: true },
  window: { width: 1600, height: 900, maximized: true, fullscreen: false, devtools: true, zoom: 1 },
  server: { host: '127.0.0.1', port: 0 },
  launcher: { width: 700, height: 680, returnToLauncher: true },
};
const cfg = merge(
  merge(CONFIG_DEFAULTS, readJson(path.join(ROOT, 'launcher.config.json'))),
  readJson(path.join(ROOT, 'launcher.config.local.json')),
);

// -------------------------------------------------------------------- flags

const argv = process.argv.slice(1);
/** @param {string} flag */
const flagValue = (flag) => {
  const hit = argv.find(a => a === flag || a.startsWith(flag + '='));
  if (!hit) return null;
  return hit.includes('=') ? hit.split('=')[1] : '';
};
const SMOKE = flagValue('--smoke-test') !== null ? (flagValue('--smoke-test') || 'game') : null;
const PLAY_DIRECT = flagValue('--play') !== null;

// -------------------------------------------------------- child process runs

/** @type {BrowserWindow | null} */ let launcherWin = null;
/** @type {BrowserWindow | null} */ let gameWin = null;
/** @type {import('node:http').Server | null} */ let gameServer = null;
/** @type {string | null} */ let gameUrl = null;
/** What long operation is in flight (guards double-clicks); null = idle. */
/** @type {string | null} */ let busy = null;

/** @param {string} line */
function log(line) {
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.send('launcher:log', line);
  if (SMOKE) console.log(`[launcher] ${line}`);
}

/**
 * Run a child process, streaming its output lines to the launcher log.
 * npm needs a shell on Windows (npm.cmd can't be spawned directly since the
 * CVE-2024-27980 hardening), and Node deprecates shell+args-array — so the
 * npm path joins the command itself. INVARIANT: every arg is a fixed literal
 * or a git remote/branch name (no spaces possible) — nothing user-typed ever
 * reaches a shell.
 * @param {string} cmd @param {string[]} args @param {{ quiet?: boolean }} [opts]
 * @returns {Promise<{ code: number | null, out: string, err: string }>}
 */
function run(cmd, args, opts) {
  return new Promise((resolve) => {
    const useShell = process.platform === 'win32' && cmd === 'npm';
    const child = useShell
      ? spawn([cmd, ...args].join(' '), { cwd: ROOT, shell: true, windowsHide: true })
      : spawn(cmd, args, { cwd: ROOT, windowsHide: true });
    let out = '', err = '';
    const feed = (/** @type {Buffer} */ chunk, /** @type {boolean} */ isErr) => {
      const s = chunk.toString();
      if (isErr) err += s; else out += s;
      if (!opts?.quiet) {
        for (const line of s.split(/\r?\n/)) if (line.trim()) log(line.trimEnd());
      }
    };
    child.stdout?.on('data', c => feed(c, false));
    child.stderr?.on('data', c => feed(c, true));
    child.on('error', (e) => { err += String(e); resolve({ code: -1, out, err }); });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

/** @param {string[]} args @param {{ quiet?: boolean }} [opts] */
const git = (args, opts) => run('git', args, opts ?? { quiet: true });
/** @param {string[]} args */
const npm = (args) => run('npm', args);

// ------------------------------------------------------------ repo & builds

async function repoStatus() {
  const pkg = readJson(path.join(ROOT, 'package.json')) ?? {};
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).out.trim();
  const headRaw = (await git(['log', '-1', '--format=%h%x09%s%x09%ci'])).out.trim();
  const [hash = '', subject = '', date = ''] = headRaw.split('\t');
  const dirty = (await git(['status', '--porcelain'])).out.trim().length > 0;
  const remote = (await git(['remote', 'get-url', cfg.repo.remote])).out.trim();
  return {
    title: cfg.game.title,
    version: pkg.version ?? '0.0.0',
    branch, hash, subject, date, dirty,
    remoteUrl: remote || null,
    distBuilt: fs.existsSync(path.join(DIST, 'index.html')),
    checkOnLaunch: !!cfg.updates.checkOnLaunch,
    repo: { remote: cfg.repo.remote, branch: cfg.repo.branch },
  };
}

async function checkUpdates() {
  log(`Checking ${cfg.repo.remote}/${cfg.repo.branch} for updates…`);
  const fetch = await git(['fetch', cfg.repo.remote, cfg.repo.branch], { quiet: false });
  if (fetch.code !== 0) {
    log('Update check failed (offline, or the remote is unreachable).');
    return { ok: false, error: (fetch.err || fetch.out || 'git fetch failed').trim() };
  }
  const range = `HEAD..${cfg.repo.remote}/${cfg.repo.branch}`;
  const behind = parseInt((await git(['rev-list', '--count', range])).out.trim(), 10) || 0;
  const ahead = parseInt((await git(['rev-list', '--count', `${cfg.repo.remote}/${cfg.repo.branch}..HEAD`])).out.trim(), 10) || 0;
  const logOut = (await git(['log', '--format=%h%x09%s', range])).out.trim();
  const changes = logOut ? logOut.split('\n').map(l => {
    const [hash = '', subject = ''] = l.split('\t');
    return { hash, subject };
  }) : [];
  log(behind === 0 ? 'Up to date.' : `${behind} update${behind === 1 ? '' : 's'} available.`);
  return { ok: true, behind, ahead, changes };
}

/** The build stamp: HEAD + a digest of what's uncommitted. Any pull or local
 *  edit changes it, so Play knows exactly when dist/ went stale. */
async function buildStamp() {
  const head = (await git(['rev-parse', 'HEAD'])).out.trim();
  if (!head) return null; // not a git repo — fall back to dist-exists checks
  const porcelain = (await git(['status', '--porcelain'])).out;
  return `${head}|${crypto.createHash('sha1').update(porcelain).digest('hex')}`;
}

/** @param {boolean} [force] @returns {Promise<{ ok: boolean, error?: string }>} */
async function ensureBuilt(force) {
  const stamp = await buildStamp();
  const have = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf-8') : null;
  const fresh = fs.existsSync(path.join(DIST, 'index.html')) && stamp !== null && have === stamp;
  if (fresh && !force) return { ok: true };
  log('Building the game (tsc + vite)…');
  const res = await npm(['run', 'build']);
  if (res.code !== 0) {
    log('BUILD FAILED — see output above.');
    return { ok: false, error: 'Build failed — the game was not started.' };
  }
  const after = await buildStamp();
  if (after) fs.writeFileSync(STAMP, after);
  log('Build complete.');
  return { ok: true };
}

async function update() {
  const pull = await run('git', ['pull', '--ff-only', cfg.repo.remote, cfg.repo.branch]);
  if (pull.code !== 0) {
    log('PULL FAILED — you may have local changes; commit or stash them first.');
    return { ok: false, error: (pull.err || pull.out || 'git pull failed').trim() };
  }
  log('Installing dependencies…');
  const inst = await npm(['install', '--no-audit', '--no-fund']);
  if (inst.code !== 0) return { ok: false, error: 'npm install failed — see log.' };
  return ensureBuilt(true);
}

// ------------------------------------------------------------------ windows

async function ensureServer() {
  if (gameServer && gameUrl) return gameUrl;
  const started = await startGameServer({
    root: DIST, savesDir: SAVES,
    host: cfg.server.host, port: cfg.server.port,
  });
  gameServer = started.server;
  gameUrl = started.url;
  log(`Game server on ${started.url}`);
  return started.url;
}

/** @param {{ show?: boolean }} [opts] */
function createGameWindow(opts) {
  const w = new BrowserWindow({
    width: cfg.window.width,
    height: cfg.window.height,
    show: opts?.show !== false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0e',
    title: cfg.game.title,
    fullscreen: !!cfg.window.fullscreen,
    webPreferences: { devTools: !!cfg.window.devtools },
  });
  if (cfg.window.maximized && !cfg.window.fullscreen && opts?.show !== false) w.maximize();
  w.webContents.on('did-finish-load', () => {
    if (cfg.window.zoom && cfg.window.zoom !== 1) w.webContents.setZoomFactor(cfg.window.zoom);
  });
  // No application menu exists (real-game feel), so provide the essentials:
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12' && cfg.window.devtools) { w.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.key === 'F5' && cfg.window.devtools) { w.webContents.reload(); e.preventDefault(); }
  });
  w.on('closed', () => {
    gameWin = null;
    if (!SMOKE && cfg.launcher.returnToLauncher && launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.show();
      launcherWin.webContents.send('launcher:state', { t: 'game-closed' });
    } else if (!SMOKE) {
      app.quit();
    }
  });
  return w;
}

async function play() {
  const built = await ensureBuilt();
  if (!built.ok) return built;
  const url = await ensureServer();
  if (gameWin && !gameWin.isDestroyed()) { gameWin.focus(); return { ok: true }; }
  gameWin = createGameWindow();
  await gameWin.loadURL(url);
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide();
  return { ok: true };
}

/** @param {{ show?: boolean }} [opts] */
function createLauncherWindow(opts) {
  const w = new BrowserWindow({
    width: cfg.launcher.width,
    height: cfg.launcher.height,
    show: opts?.show !== false,
    resizable: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0e',
    title: `${cfg.game.title} — Launcher`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  w.loadFile(path.join(__dirname, 'launcher.html'));
  w.on('closed', () => {
    launcherWin = null;
    // Closing the launcher only quits when no game is running.
    if (!gameWin || gameWin.isDestroyed()) app.quit();
  });
  return w;
}

// ---------------------------------------------------------------------- ipc

/** Serialize the mutating operations so double-clicks can't overlap them.
 * @param {string} name @param {() => Promise<any>} fn */
async function exclusive(name, fn) {
  if (busy) return { ok: false, error: `Busy: ${busy} is still running.` };
  busy = name;
  try { return await fn(); }
  catch (e) { log(`${name} failed: ${String(e)}`); return { ok: false, error: String(e) }; }
  finally { busy = null; }
}

function wireIpc() {
  ipcMain.handle('launcher:status', () => repoStatus());
  ipcMain.handle('launcher:check', () => exclusive('check', () => checkUpdates()));
  ipcMain.handle('launcher:update', () => exclusive('update', () => update()));
  ipcMain.handle('launcher:play', () => exclusive('play', () => play()));
  ipcMain.handle('launcher:rebuild', () => exclusive('rebuild', () => ensureBuilt(true)));
  ipcMain.handle('launcher:quit', () => { app.quit(); });
}

// -------------------------------------------------------------- smoke tests

/** Boot the real thing headlessly, assert it works, print, exit — this is
 *  what `npm run smoke` / CI use to prove the desktop path end-to-end. */
async function smoke() {
  /** @type {string[]} */
  const errors = [];
  /** @param {Electron.WebContents} wc @param {string} tag */
  const watch = (wc, tag) => {
    // Electron ≥43 event-object form: {level: 'error'|'warning'|…, message}.
    // (Declaring the old positional params trips Electron's deprecation shim.)
    wc.on('console-message', (/** @type {any} */ e) => {
      if (e && e.level === 'error') errors.push(`${tag} console: ${e.message}`);
    });
    wc.on('render-process-gone', (_e, details) => errors.push(`${tag} renderer gone: ${details.reason}`));
    wc.on('did-fail-load', (_e, code, desc) => errors.push(`${tag} load failed: ${code} ${desc}`));
  };
  /** @param {number} ms */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  /** A green run is only trustworthy if the error watcher demonstrably sees
   *  page errors — inject one, require it to be captured, then discard it.
   *  @param {Electron.WebContents} wc */
  const watcherSelfTest = async (wc) => {
    await wc.executeJavaScript(`console.error('SMOKE-SELFTEST')`);
    await wait(250);
    const i = errors.findIndex(x => x.includes('SMOKE-SELFTEST'));
    if (i === -1) errors.push('console-error watcher is BLIND — smoke results are untrustworthy');
    else errors.splice(i, 1);
  };

  try {
    if (SMOKE === 'launcher') {
      launcherWin = createLauncherWindow({ show: false });
      watch(launcherWin.webContents, 'launcher');
      await new Promise(r => launcherWin?.webContents.once('did-finish-load', () => r(null)));
      await wait(1200); // let the page run its status() round-trip
      const api = await launcherWin.webContents.executeJavaScript('typeof window.launcher');
      const version = await launcherWin.webContents.executeJavaScript(
        `(document.getElementById('build-line')?.textContent ?? '').length > 0`);
      if (api !== 'object') errors.push(`preload bridge missing (typeof window.launcher = ${api})`);
      if (!version) errors.push('status round-trip never populated the build line');
      await watcherSelfTest(launcherWin.webContents);
    } else {
      if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.log('SMOKE game: dist/ missing — building first…');
        const built = await ensureBuilt();
        if (!built.ok) throw new Error('build failed');
      }
      const url = await ensureServer();
      gameWin = createGameWindow({ show: false });
      watch(gameWin.webContents, 'game');
      await gameWin.loadURL(url);
      await wait(2500); // async boot: account load, world init, start menu
      const game = await gameWin.webContents.executeJavaScript('typeof window.__game');
      const menu = await gameWin.webContents.executeJavaScript(
        `!!document.querySelector('#start-menu:not(.hidden)')`);
      const saveProbe = await gameWin.webContents.executeJavaScript(
        `fetch('/__save/0').then(r => r.status).catch(() => 'ERR')`);
      if (game !== 'object') errors.push(`window.__game is ${game} — game did not boot`);
      if (!menu) errors.push('start menu never appeared');
      if (saveProbe !== 200 && saveProbe !== 404) errors.push(`/__save endpoint broken (status ${saveProbe})`);
      await watcherSelfTest(gameWin.webContents);
      console.log(`SMOKE game: __game=${game} startMenu=${menu} saveEndpoint=${saveProbe}`);
    }
  } catch (e) {
    errors.push(String(e));
  }

  if (errors.length) {
    console.log(`SMOKE ${SMOKE} FAILED:`);
    for (const e of errors) console.log('  - ' + e);
  } else {
    console.log(`SMOKE ${SMOKE} OK`);
  }
  gameServer?.close();
  app.exit(errors.length ? 1 : 0);
}

// --------------------------------------------------------------------- boot

Menu.setApplicationMenu(null);

if (!SMOKE) {
  const locked = app.requestSingleInstanceLock();
  if (!locked) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      const win = (gameWin && !gameWin.isDestroyed()) ? gameWin : launcherWin;
      if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
    });
  }
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { gameServer?.close(); });
// Never follow navigations out of the game/launcher; external links go to the OS browser.
app.on('web-contents-created', (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.whenReady().then(async () => {
  if (SMOKE) { wireIpc(); await smoke(); return; }
  wireIpc();
  if (PLAY_DIRECT) {
    const res = await exclusive('play', () => play());
    if (!res.ok) { // fall back to the launcher so the error is visible
      launcherWin = createLauncherWindow();
    }
    return;
  }
  launcherWin = createLauncherWindow();
});
