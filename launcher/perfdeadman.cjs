// ---------------------------------------------------------------------------
// THE PERF DEADMAN — the sweep must never hang silently again.
//
// Two full-sweep verdict attempts (2026-08-01) died as TERMINAL WEDGES: one
// World.update call running for minutes, the renderer core pegged, frames
// never completing — so the rAF-starved autosave wrote no breadcrumbs, the
// sweep's table (printed only at END) wrote no rows, and the launcher sat
// awaiting one executeJavaScript promise that could never resolve. 19-minute
// silent freezes, killed by hand, verdicts eaten.
//
// This module is the watchdog HALF of the fix (the sampler's beat is the
// other — src/dev/perf.ts sends `perf:beat` through the perf-only preload):
// perfMode feeds every beat in; when beats stop for silenceMs the machine
// runs a TWO-STAGE verdict:
//
//   STAGE 1 — LIVENESS. executeJavaScript('1+1') with a short deadline,
//   probeCount times. A healthy message loop answers instantly; a wedged
//   main thread never runs the task (the wedge-hunt's proven heartbeat,
//   2026-08-02). ANY answer = the game is alive and only the BEAT WIRING is
//   broken — the deadman logs loudly and DISARMS. It must never kill a
//   healthy 19-minute run over its own plumbing rot.
//
//   STAGE 2 — THE WEDGE FACES (the two-face model, perf-wedge-hunt):
//   attach the in-process CDP (webContents.debugger), send Debugger.enable
//   WITHOUT awaiting (a wedged thread never ACKS — awaiting would hang the
//   watchdog inside its own trap), then Debugger.pause under pauseDeadlineMs.
//     - The pause LANDS (the JS-HOT face — v8 interrupts fire at JS loop
//       back-edges even mid-wedge): collect up to stackCount pause/resume
//       stacks spaced stackGapMs apart and fold them into a compact
//       histogram — the wedge's name.
//     - The pause NEVER lands (the NATIVE face — one uninterruptible native
//       call: Blink layout / Skia raster / regex / giant join-stringify;
//       v8 interrupts only fire at JS back-edges): record exactly that.
//
// The caller (launcher/main.cjs perfMode) then kills the run, writes the
// PARTIAL report from the rows its beats banked, files a structured
// 'wedge'-class skip row, and exits through the standing skip-gate.
//
// DELIBERATELY ELECTRON-FREE: every side effect (clock, timers, the eval
// probe, the CDP verbs, the log) arrives through the injected host, so the
// scratch fragment sim can drive all four verdict branches under plain node
// — the deadman branch cannot be synthesized live (the walker is too good
// to wedge on demand; a real wedge is a seed lottery at ~2/3 per FULL
// sweep and never on targeted rolls).
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

/**
 * @typedef {Object} DeadmanDials
 * @property {number} silenceMs        beat silence that arms the probe (default 45000)
 * @property {number} checkMs          watchdog poll cadence (default 5000)
 * @property {number} probeTimeoutMs   per-liveness-probe deadline (default 2000)
 * @property {number} probeCount       liveness probes before a wedge is believed (default 3)
 * @property {number} pauseDeadlineMs  Debugger.pause overall deadline (default 10000)
 * @property {number} stackCount       pause stacks to collect on the JS-hot face (default 10)
 * @property {number} stackGapMs       resume→re-pause spacing between samples (default 300)
 */

/**
 * @typedef {Object} DeadmanHost
 * @property {() => number} now
 * @property {(line: string) => void} log
 * @property {(timeoutMs: number) => Promise<boolean>} evalAlive   the message-loop liveness probe
 * @property {() => void} cdpAttach                                may throw — an attach failure reads as the native face
 * @property {(method: string) => void} cdpSend                    fire-and-forget; NEVER awaited by design
 * @property {(cb: (method: string, params: any) => void) => void} cdpOn
 * @property {() => void} cdpDetach
 * @property {(fn: () => void, ms: number) => any} setTimeout
 * @property {(h: any) => void} clearTimeout
 * @property {(fn: () => void, ms: number) => any} setInterval
 * @property {(h: any) => void} clearInterval
 */

/**
 * @typedef {Object} WedgeVerdict
 * @property {'js-hot'|'native'} face
 * @property {string} note        compact, report-ready: the stack histogram, or the pause-never-landed line
 * @property {string[][]} stacks  every collected pause stack, innermost first, 'fn:line:col' frames (bundle archaeology fuel)
 * @property {any} lastBeat       the last beat payload seen before silence (names the seat that held the window)
 * @property {number} silentMs    beat silence measured when the probe fired
 */

/** One frame, compactly: minified names survive esbuild and line:col is the
 *  bundle-archaeology key (slice the bundle text around the column — the
 *  token neighborhood names the function; wedge-hunt recipe).
 *  @param {any} f @returns {string} */
function frameLabel(f) {
  const name = String((f && f.functionName) || '(anon)');
  const loc = f && f.location
    ? `:${f.location.lineNumber}:${f.location.columnNumber}` : '';
  return name + loc;
}

/** Fold pause stacks to the report-ready one-liner. Keyed on the innermost
 *  TWO function names (caller context disambiguates minified single letters;
 *  column-level keys would fragment a loop body's samples).
 *  @param {string[][]} stacks @returns {string} */
function histogramNote(stacks) {
  /** @type {Map<string, number>} */
  const h = new Map();
  for (const s of stacks) {
    const key = s.slice(0, 2).map(fr => fr.replace(/:.*$/, '')).join('<');
    h.set(key, (h.get(key) ?? 0) + 1);
  }
  const top = [...h.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, n]) => `${k} x${n}`).join('; ');
  return `js-hot wedge (${stacks.length} pause stacks): ${top}`;
}

/** THE SKIP/WEDGE VERDICT — the one routing table for skip-class gating,
 *  shared by perfMode's live gate and the scratch fragment sim so the two
 *  can never drift. 'unmintable' / 'load-fallback' stay report-only (the
 *  mint machinery said no before a walker stood); 'hold' gates unless the
 *  committed overrides[<id>].allowSkip waiver names it (the 2026-08-01
 *  ratified policy); 'wedge' ALWAYS gates — a wedge is a bug the deadman
 *  caught, never a deliberately unholdable row, so no waiver exists for it
 *  by construction.
 *  @param {{ id: string, class: string }} s
 *  @param {any} overrides  budgets.overrides (the committed per-tileset registry)
 *  @returns {'gates'|'waived'|'report-only'} */
function skipVerdict(s, overrides) {
  if (s.class === 'wedge') return 'gates';
  if (s.class !== 'hold') return 'report-only';
  return (((overrides ?? {})[s.id] ?? {}).allowSkip) ? 'waived' : 'gates';
}

/**
 * Build the watchdog. `beat(payload)` feeds it; `promise` resolves ONLY
 * with a confirmed WedgeVerdict (the healthy path disarms it and the
 * promise simply never settles — the process exit reaps it); `disarm()`
 * stands it down at sweep completion.
 * @param {DeadmanDials} dials
 * @param {DeadmanHost} host
 * @returns {{ beat: (payload: any) => void, promise: Promise<WedgeVerdict>, disarm: () => void }}
 */
function createDeadman(dials, host) {
  let lastBeatAt = host.now();
  /** @type {any} */
  let lastBeat = null;
  let disarmed = false;
  let firing = false;
  /** @type {(v: WedgeVerdict) => void} */
  let resolveVerdict = () => {};
  /** @type {Promise<WedgeVerdict>} */
  const promise = new Promise(r => { resolveVerdict = r; });
  const timer = host.setInterval(() => { void check(); }, dials.checkMs);

  function disarm() {
    if (disarmed) return;
    disarmed = true;
    host.clearInterval(timer);
  }

  /** @param {any} payload */
  function beat(payload) {
    lastBeatAt = host.now();
    if (payload !== undefined && payload !== null) lastBeat = payload;
  }

  async function check() {
    if (disarmed || firing) return;
    const silent = host.now() - lastBeatAt;
    if (silent < dials.silenceMs) return;
    firing = true;
    const ctx = lastBeat
      ? `last beat at='${String(lastBeat.at ?? '?')}' tileset='${String(lastBeat.tileset ?? '?')}'`
      : 'no beat ever arrived';
    host.log(`no beat for ${Math.round(silent / 1000)}s (${ctx}) — probing the renderer's message loop…`);
    // STAGE 1 — liveness. A beat may have arrived while a probe was in
    // flight (a stall that recovered): re-check silence between probes and
    // stand down if the beats resumed.
    for (let i = 0; i < dials.probeCount; i++) {
      if (await host.evalAlive(dials.probeTimeoutMs)) {
        host.log('renderer ANSWERED the liveness probe — the game is alive and only the beat wiring is silent. ' +
          'Deadman DISARMED (it never kills a healthy run); fix the perf:beat plumbing.');
        disarm();
        return;
      }
      if (host.now() - lastBeatAt < dials.silenceMs) {
        host.log('beats resumed mid-probe (a recovered stall) — standing down this alarm.');
        firing = false;
        return;
      }
    }
    host.log(`wedge CONFIRMED (${dials.probeCount} liveness probes dead) — attaching the in-process CDP for stacks…`);
    const verdict = await forensics(host.now() - lastBeatAt);
    disarm();
    resolveVerdict(verdict);
  }

  /** STAGE 2 — the two faces. @param {number} silentMs @returns {Promise<WedgeVerdict>} */
  function forensics(silentMs) {
    /** @type {string[][]} */
    const stacks = [];
    return new Promise(res => {
      let done = false;
      /** @param {'js-hot'|'native'} face @param {string} note */
      const finish = (face, note) => {
        if (done) return;
        done = true;
        try { host.cdpDetach(); } catch { /* wedged renderers detach rudely */ }
        res({ face, note, stacks, lastBeat, silentMs });
      };
      try { host.cdpAttach(); }
      catch (e) {
        finish('native', `debugger attach failed (${String(e)}) — treating as the native face`);
        return;
      }
      host.cdpOn((method, params) => {
        if (done || method !== 'Debugger.paused') return;
        const frames = (params && Array.isArray(params.callFrames) ? params.callFrames : [])
          .slice(0, 12).map(frameLabel);
        stacks.push(frames);
        if (stacks.length >= dials.stackCount) {
          finish('js-hot', histogramNote(stacks));
          return;
        }
        // Spaced samples: resume, breathe, pause again — back-to-back pauses
        // would sample one back-edge's neighborhood ten times.
        host.cdpSend('Debugger.resume');
        host.setTimeout(() => { if (!done) host.cdpSend('Debugger.pause'); }, dials.stackGapMs);
      });
      // Fire-and-forget BY LAW: a wedged thread never ACKS enable/pause, so
      // an await here would hang the watchdog inside its own trap. The pause
      // interrupt itself still lands at v8's loop back-edges (JS-hot face).
      host.cdpSend('Debugger.enable');
      host.cdpSend('Debugger.pause');
      host.setTimeout(() => {
        if (stacks.length) finish('js-hot', histogramNote(stacks));
        else finish('native', 'native wedge, pause never landed (one uninterruptible native call — Blink layout / raster / regex class; v8 interrupts only fire at JS back-edges)');
      }, dials.pauseDeadlineMs);
    });
  }

  return { beat, promise, disarm };
}

module.exports = { createDeadman, skipVerdict, histogramNote };
