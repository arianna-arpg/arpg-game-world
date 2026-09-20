// ---------------------------------------------------------------------------
// THE RELEASE CHANNEL — the packaged launcher's update brain, kept PURE:
// no Electron, no windows, no config reads. main.cjs hands it values and a
// fetch; scripts/test-launcher-updates.mjs drives every law below under
// `node --test` (npm run test:launcher) against a loopback fixture, so the
// one feature that must never break — a launcher that cannot update can
// never receive its own fix — is proven without a network or a window.
//
// THE CHANNELS (data — UPDATE_CHANNELS; the first row is the default):
//   nightly  follows the release CADENCE: the newest PUBLISHED release,
//            prereleases included — i.e. last night's RC, or a hand-cut
//            stable that outranks it. Probe: the release LIST.
//   stable   hand-cut stables only. Probe: GitHub's /releases/latest, which
//            by API definition never serves a prerelease or a draft.
//
// THE FAILED-NIGHT LAW — why following nightlies is safe. A night that
// failed is never PUBLISHED, so there is nothing here to refuse:
//   red type-check / probes   nightly.yml's `cut` needs `verify` → no tag,
//                             no release at all.
//   a red package leg, a red  release.yml uploads into a DRAFT and only
//   packaged smoke            `finalize` (needs every leg) flips it public.
//                             Anonymous API callers — every launcher —
//                             never see drafts.
// pickUpdate() still re-checks what it is handed (belt and braces): drafts
// dropped, tags that are not exactly vX.Y.Z dropped, and a release lacking
// THIS platform's fully-uploaded artifact is PASSED OVER for the next one
// down instead of being offered — so a half-release can strand no one.
// Withdrawing a bad night is therefore one act: delete the release (or turn
// it back into a draft) and every launcher stops offering it on its next
// check. It never downgrades — an install only ever moves UP.
//
// THE DIGEST LAW: GitHub publishes a sha256 per release asset; the download
// is hashed as it streams and the file is DELETED unless the digest, and
// the byte count, match. Nothing unverified is ever left on disk to run.
//
// THE IN-PLACE SWAP (swapInPlace): how an AppImage replaces ITSELF — staged
// beside the running file on the same filesystem, verified, marked
// executable, then renamed over the SAME path, so a Steam or desktop entry
// pointing at it stays valid. The running image keeps its old inode, which
// is what lets THE QUIET UPDATE (main.cjs) do this under a live game.
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * @typedef {{ id: string, label: string, blurb: string, prereleases: boolean, probe: 'list' | 'latest' }} ChannelRow
 * @typedef {{ algo: string, hex: string }} Digest
 * @typedef {{ name: string, url: string, size: number, digest: Digest | null }} Asset
 * @typedef {{ tag: string, name: string, url: string | null, prerelease: boolean, ver: number[], asset: Asset }} ReleaseRow
 * @typedef {{ tag: string, why: string }} SkippedRow
 * @typedef {{ target: ReleaseRow | null, newer: ReleaseRow[], behind: number, capped: boolean, skipped: SkippedRow[], scanned: number }} UpdatePick
 */

/** THE CHANNELS, as data. Order is the picker's order; row 0 is what a
 *  missing or unknown `updates.channel` folds to.
 *  @type {ReadonlyArray<ChannelRow>} */
const UPDATE_CHANNELS = Object.freeze([
  {
    id: 'nightly', label: 'Nightly', prereleases: true, probe: 'list',
    blurb: 'Every verified night\'s build. A night that fails its checks is never published, so it is never offered.',
  },
  {
    id: 'stable', label: 'Stable', prereleases: false, probe: 'latest',
    blurb: 'Hand-cut stable releases only. Never downgrades: an install newer than the last stable simply waits for the next one.',
  },
]);

/** Dials, folded from cfg.updates by resolveUpdateCfg — never read raw. */
const UPDATE_DEFAULTS = Object.freeze({
  /** How many of the newest releases the LIST probe reads. Nightlies are
   *  listed newest-first, so 1 would do on a good night; the window is what
   *  lets a passed-over release fall through to the one beneath it. */
  scanReleases: 10,
  /** Refuse a download whose sha256 disagrees with the one GitHub published. */
  verifyDigest: true,
  /** The probe's own timeout. */
  probeTimeoutSec: 8,
  /** No bytes for this long = a dead connection, not a slow one. */
  stallSec: 60,
  /** The whole-download ceiling. */
  ceilingMin: 30,
  /** REST root — a value, so a mirror or an Enterprise host is a config line. */
  api: 'https://api.github.com',
  /** THE QUIET UPDATE: a session that boots straight into the game (Steam
   *  Deck Game Mode, --play) never shows the launcher page, so nothing there
   *  would ever check. true = check in the background and swap a verified
   *  build in place for the NEXT launch — no prompt, no restart. */
  quiet: true,
  /** …after this long, so the check never competes with the game's own boot. */
  quietDelaySec: 20,
});

/** @param {unknown} id @returns {ChannelRow} */
function channelRow(id) {
  return UPDATE_CHANNELS.find(c => c.id === id) ?? UPDATE_CHANNELS[0];
}

/** @param {unknown} v @param {number} fallback @param {number} min @param {number} max */
function clampNum(v, fallback, min, max) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * THE ONE FOLD of the update dials: cfg.updates (+ cfg.repo.api) over the
 * defaults, clamped sane. Every consumer reads this, never the raw config.
 * @param {any} updates @param {any} [repo]
 */
function resolveUpdateCfg(updates, repo) {
  const u = updates ?? {}, d = UPDATE_DEFAULTS;
  const api = typeof repo?.api === 'string' && /^https?:\/\//.test(repo.api) ? repo.api.replace(/\/+$/, '') : d.api;
  return {
    channel: channelRow(u.channel).id,
    scanReleases: Math.round(clampNum(u.scanReleases, d.scanReleases, 1, 100)),
    verifyDigest: u.verifyDigest !== false,
    probeTimeoutMs: clampNum(u.probeTimeoutSec, d.probeTimeoutSec, 1, 120) * 1000,
    stallMs: clampNum(u.stallSec, d.stallSec, 5, 3600) * 1000,
    ceilingMs: clampNum(u.ceilingMin, d.ceilingMin, 1, 24 * 60) * 60_000,
    api,
    quiet: u.quiet !== false && d.quiet,
    quietDelayMs: clampNum(u.quietDelaySec, d.quietDelaySec, 0, 3600) * 1000,
  };
}

// ---------------------------------------------------------------- versions

/** An INSTALLED version: lenient — the first X.Y.Z found ("0.5.39",
 *  "v0.6.0", a local "0.6.0-dev").  @param {unknown} s @returns {number[] | null} */
function parseVer(s) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(s ?? ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** A RELEASE TAG: strict — exactly vX.Y.Z, the only shape release.yml and
 *  nightly.yml ever cut. Anything else (a moving tag, a "-beta" suffix, a
 *  tooling release) is not a game build and is never offered.
 *  @param {unknown} s @returns {number[] | null} */
function parseTag(s) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(s ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** @param {number[]} a @param {number[]} b @returns {number} <0 | 0 | >0 */
function cmpVer(a, b) {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** @param {number[]} a @param {number[]} b — true when a > b */
function newerVersion(a, b) { return cmpVer(a, b) > 0; }

// ------------------------------------------------------------------ assets

/** The installable artifact's file suffix per platform — the NSIS installer
 *  on Windows, the AppImage (the Steam Deck artifact) on Linux.
 *  @type {Readonly<Record<string, string>>} */
const PLATFORM_ARTIFACT = Object.freeze({ win32: '.exe', linux: '.appimage' });

/** "sha256:<hex>" (the shape GitHub publishes) → parts; null when absent or
 *  not an algorithm we verify.  @param {unknown} s @returns {Digest | null} */
function parseDigest(s) {
  const m = /^(sha256|sha512):([0-9a-f]+)$/i.exec(String(s ?? '').trim());
  return m ? { algo: m[1].toLowerCase(), hex: m[2].toLowerCase() } : null;
}

/**
 * This platform's installable artifact in a release's asset list, or null.
 * An asset counts only when it is COMPLETE: GitHub marks an upload that
 * began and never finished `state: 'open'`, and a zero-byte asset is the
 * same story — either one means the release is not installable here yet.
 * When several match, the one carrying the release's own version in its
 * name wins (electron-builder's artifactName), so a stray hand-attached
 * .exe can never be the thing the launcher runs.
 * @param {any} assets @param {string} platform @param {string} [version] "0.5.39"
 * @returns {Asset | null}
 */
function pickReleaseAsset(assets, platform, version) {
  const want = PLATFORM_ARTIFACT[platform];
  if (!want) return null;
  /** @type {Asset[]} */
  const hits = [];
  for (const a of Array.isArray(assets) ? assets : []) {
    if (!a || typeof a.name !== 'string' || typeof a.browser_download_url !== 'string') continue;
    if (!a.name.toLowerCase().endsWith(want)) continue;
    if (typeof a.state === 'string' && a.state !== 'uploaded') continue;
    const size = Number(a.size) || 0;
    if ('size' in a && size <= 0) continue;
    hits.push({ name: a.name, url: a.browser_download_url, size, digest: parseDigest(a.digest) });
  }
  if (!hits.length) return null;
  return (version && hits.find(h => h.name.includes(version))) || hits[0];
}

/** Why a release was passed over — the log names it.
 *  @param {any} assets @param {string} platform */
function whyNoAsset(assets, platform) {
  const want = PLATFORM_ARTIFACT[platform];
  if (!want) return `no direct-update artifact exists for platform '${platform}'`;
  const list = Array.isArray(assets) ? assets : [];
  const partial = list.some(a => a && typeof a.name === 'string' && a.name.toLowerCase().endsWith(want));
  const what = platform === 'win32' ? 'Windows installer' : platform === 'linux' ? 'AppImage' : 'artifact';
  return partial ? `its ${what} never finished uploading` : `no ${what} is attached`;
}

// ------------------------------------------------------------- the selection

/**
 * THE SELECTION — from a list of GitHub release objects, the update this
 * install should take on this channel. Pure; order-independent (it sorts by
 * version itself, so it never trusts the API's ordering).
 *   target   the newest installable release on the channel (null = none)
 *   newer    every installable release above `current`, newest first
 *   behind   newer.length — 0 means up to date. An unparseable `current`
 *            is never offered anything (we cannot know which way is up).
 *   capped   the probe's window came back FULL and every release in it was
 *            newer — the install is further behind than the window shows
 *   skipped  newer releases passed over, with the reason (the log names them)
 * @param {any} releases
 * @param {{ channel?: string, platform: string, current: unknown, window?: number }} opts
 * @returns {UpdatePick}
 */
function pickUpdate(releases, opts) {
  const row = channelRow(opts.channel);
  const cur = parseVer(opts.current);
  /** @type {ReleaseRow[]} */ const rows = [];
  /** @type {SkippedRow[]} */ const skipped = [];
  let scanned = 0;
  for (const rel of Array.isArray(releases) ? releases : []) {
    if (!rel || typeof rel !== 'object') continue;
    const ver = parseTag(rel.tag_name);
    if (!ver) continue;                                   // not a vX.Y.Z game build
    if (rel.draft) continue;                              // unpublished: still building, or a failed night
    if (rel.prerelease && !row.prereleases) continue;     // off-channel
    scanned++;
    const tag = String(rel.tag_name).trim();
    const asset = pickReleaseAsset(rel.assets, opts.platform, ver.join('.'));
    if (!asset) {
      if (cur && cmpVer(ver, cur) > 0) skipped.push({ tag, why: whyNoAsset(rel.assets, opts.platform) });
      continue;
    }
    rows.push({
      tag, ver, asset,
      name: typeof rel.name === 'string' && rel.name ? rel.name : tag,
      url: typeof rel.html_url === 'string' ? rel.html_url : null,
      prerelease: !!rel.prerelease,
    });
  }
  rows.sort((a, b) => cmpVer(b.ver, a.ver));
  const newer = cur ? rows.filter(r => cmpVer(r.ver, cur) > 0) : [];
  const raw = Array.isArray(releases) ? releases.length : 0;
  const windowFull = !!opts.window && raw >= opts.window;
  return {
    target: rows[0] ?? null,
    newer,
    behind: newer.length,
    capped: windowFull && scanned > 0 && newer.length + skipped.length >= scanned,
    skipped,
    scanned,
  };
}

// ------------------------------------------------------------------ the probe

/** @param {string} gh "owner/name" @param {string} channel @param {{ api: string, scanReleases: number }} ucfg */
function probeUrl(gh, channel, ucfg) {
  const base = `${ucfg.api}/repos/${gh}/releases`;
  return channelRow(channel).probe === 'latest' ? `${base}/latest` : `${base}?per_page=${ucfg.scanReleases}`;
}

/** A refused probe, carrying words a player can read. */
class ProbeError extends Error {
  /** @param {string} message @param {number} [status] */
  constructor(message, status) { super(message); this.name = 'ProbeError'; this.status = status ?? 0; }
}

/**
 * Ask GitHub for this channel's releases. Always resolves to an ARRAY (the
 * `latest` probe's single object is wrapped; its 404 = "no stable release
 * exists yet" = []), so pickUpdate serves both channels unchanged.
 * @param {{ gh: string, channel: string, ucfg: ReturnType<typeof resolveUpdateCfg>, fetchImpl?: typeof fetch, userAgent?: string }} o
 * @returns {Promise<any[]>}
 */
async function fetchReleases(o) {
  const doFetch = o.fetchImpl ?? fetch;
  const res = await doFetch(probeUrl(o.gh, o.channel, o.ucfg), {
    headers: { accept: 'application/vnd.github+json', 'user-agent': o.userAgent ?? 'hollow-wake-launcher' },
    signal: AbortSignal.timeout(o.ucfg.probeTimeoutMs),
  });
  if (res.status === 404 && channelRow(o.channel).probe === 'latest') return [];
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const mins = Number.isFinite(reset) && reset > Date.now() ? Math.ceil((reset - Date.now()) / 60_000) : 0;
    throw new ProbeError(`GitHub's anonymous request allowance is spent for this network${mins ? ` — it refills in about ${mins} min` : ''}.`, res.status);
  }
  if (!res.ok) throw new ProbeError(`GitHub API answered HTTP ${res.status}.`, res.status);
  const body = /** @type {any} */ (await res.json());
  return Array.isArray(body) ? body : (body && typeof body === 'object' ? [body] : []);
}

// --------------------------------------------------------------- the download

/**
 * Stream a release asset to `dest`, hashing as it goes. Resolves only when
 * the byte count AND (when GitHub published one and verifyDigest holds) the
 * digest both match; on ANY failure the partial file is deleted before the
 * error leaves — nothing unverified is left on disk to be run. A stall timer
 * (no bytes for stallMs) sits under the whole-download ceiling, so a dead
 * connection is a prompt, named failure rather than a half-hour hang.
 * @param {{
 *   url: string, dest: string, sizeHint?: number, digest?: Digest | null,
 *   verifyDigest?: boolean, stallMs?: number, ceilingMs?: number,
 *   onProgress?: (p: { pct: number, got: number, total: number }) => void,
 *   fetchImpl?: typeof fetch, userAgent?: string,
 * }} o
 * @returns {Promise<{ bytes: number, verified: boolean, digest: string | null }>}
 */
async function downloadAsset(o) {
  const doFetch = o.fetchImpl ?? fetch;
  const stallMs = o.stallMs ?? UPDATE_DEFAULTS.stallSec * 1000;
  const ceilingMs = o.ceilingMs ?? UPDATE_DEFAULTS.ceilingMin * 60_000;
  const want = o.verifyDigest === false ? null : (o.digest ?? null);
  const ac = new AbortController();
  const ceiling = setTimeout(() => ac.abort(new Error(`download exceeded its ${Math.round(ceilingMs / 60_000)} min ceiling`)), ceilingMs);
  /** @type {ReturnType<typeof setTimeout> | null} */ let stall = null;
  const beat = () => {
    if (stall) clearTimeout(stall);
    stall = setTimeout(() => ac.abort(new Error(`download stalled — no data for ${Math.round(stallMs / 1000)} s`)), stallMs);
  };
  /** @type {fs.WriteStream | null} */ let file = null;
  try {
    beat();
    const res = await doFetch(o.url, {
      headers: { accept: 'application/octet-stream', 'user-agent': o.userAgent ?? 'hollow-wake-launcher' },
      signal: ac.signal,
    });
    if (!res.ok || !res.body) throw new Error(`download answered HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || o.sizeHint || 0;
    fs.mkdirSync(path.dirname(o.dest), { recursive: true });
    file = fs.createWriteStream(o.dest);
    /** @type {Error | null} */ let writeErr = null;
    file.on('error', (e) => { writeErr = e; ac.abort(e); });
    const hash = crypto.createHash(want ? want.algo : 'sha256');
    const reader = res.body.getReader();
    let got = 0, lastPct = -1;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      beat();
      got += value.byteLength;
      hash.update(value);
      const out = file;
      if (!out.write(value)) await new Promise(r => out.once('drain', r));
      if (writeErr) throw writeErr;
      if (total > 0 && o.onProgress) {
        const pct = Math.min(100, Math.floor((got / total) * 100));
        if (pct !== lastPct) { lastPct = pct; o.onProgress({ pct, got, total }); }
      }
    }
    const closing = file;
    await new Promise((resolve, reject) => closing.end((/** @type {any} */ e) => (e ? reject(e) : resolve(null))));
    file = null;
    if (writeErr) throw writeErr;
    if (total > 0 && got < total) throw new Error(`download truncated at ${got} of ${total} bytes`);
    // Exactness belongs to the digest. Only when GitHub published none does
    // the release's own listed size stand in for it.
    if (!want && o.sizeHint && got !== o.sizeHint) throw new Error(`download is ${got} bytes, the release lists ${o.sizeHint}`);
    const hex = hash.digest('hex');
    if (want && hex !== want.hex) {
      throw new Error(`download failed verification — ${want.algo} ${hex.slice(0, 12)}… does not match the published ${want.hex.slice(0, 12)}…`);
    }
    return { bytes: got, verified: !!want, digest: want ? `${want.algo}:${hex}` : null };
  } catch (e) {
    const open = file;
    if (open) await new Promise(r => open.close(() => r(null)));
    try { fs.rmSync(o.dest, { force: true }); } catch { /* best-effort: never mask the real error */ }
    // An abort surfaces as the reason we gave it (stall / ceiling / disk).
    throw (ac.signal.aborted && ac.signal.reason instanceof Error) ? ac.signal.reason : e;
  } finally {
    clearTimeout(ceiling);
    if (stall) clearTimeout(stall);
  }
}

// ------------------------------------------------------------ the in-place swap

/** Our own staging name: a dotfile beside the target, so it is hidden, on the
 *  same filesystem (rename is atomic there), and unmistakably ours to sweep. */
const STAGED_SUFFIX = '.downloading';
/** @param {string} dir @param {string} assetName */
const stagedPath = (dir, assetName) => path.join(dir, `.${assetName}${STAGED_SUFFIX}`);

/**
 * Remove staging leftovers — a session killed mid-download (Steam's Exit
 * sends SIGKILL soon after SIGTERM) cannot tidy up after itself, and each
 * night's artifact has a new name, so they would pile up ~130 MB at a time.
 * Only our own `.<name>.downloading` dotfiles are ever touched.
 * @param {string} dir @returns {string[]} the names removed
 */
function sweepStaged(dir) {
  /** @type {string[]} */ const gone = [];
  let names;
  try { names = fs.readdirSync(dir); } catch { return gone; }
  for (const n of names) {
    if (!n.startsWith('.') || !n.endsWith(STAGED_SUFFIX)) continue;
    try { fs.rmSync(path.join(dir, n), { force: true }); gone.push(n); } catch { /* best-effort */ }
  }
  return gone;
}

/**
 * THE IN-PLACE SWAP. `download(dest)` must resolve ONLY for a verified file
 * (downloadAsset's contract) — so `self` is only ever replaced by a verified
 * successor, and on any failure it is left exactly as it was with nothing
 * staged beside it. Safe under a running AppImage: the mounted image holds
 * its old inode, the path simply starts naming the new one.
 * @param {{ self: string, assetName: string, download: (dest: string) => Promise<unknown> }} o
 * @returns {Promise<{ swept: string[] }>}
 */
async function swapInPlace(o) {
  const dir = path.dirname(o.self);
  fs.accessSync(dir, fs.constants.W_OK); // throws when the folder is read-only
  const swept = sweepStaged(dir);
  const staged = stagedPath(dir, o.assetName);
  try {
    await o.download(staged);
    fs.chmodSync(staged, 0o755);
    fs.renameSync(staged, o.self);
  } catch (e) {
    try { fs.rmSync(staged, { force: true }); } catch { /* best-effort tidy */ }
    throw e;
  }
  return { swept };
}

module.exports = {
  UPDATE_CHANNELS, UPDATE_DEFAULTS, PLATFORM_ARTIFACT, ProbeError,
  channelRow, resolveUpdateCfg,
  parseVer, parseTag, cmpVer, newerVersion,
  parseDigest, pickReleaseAsset, pickUpdate,
  probeUrl, fetchReleases, downloadAsset,
  STAGED_SUFFIX, stagedPath, sweepStaged, swapInPlace,
};
