// ---------------------------------------------------------------------------
// THE WATCHDOG — what happens when the engine stops returning.
//
// A worker thread watches a tick counter in shared memory. If an episode's ticks stop
// (`stallSec`), or one episode outruns `capSec`, the worker pauses the stuck thread
// through the inspector to read where it is, appends a row to the stall file and kills
// the process. The shard then restarts the unit. On that attempt the same episode
// throws instead of running, so the unit finishes and the rest of its rows still count.
//
// The cost of a hang drops from the whole shard to about a minute, and the hang
// arrives with its scenario, seed and stack. Both limits sit far above any honest
// episode: the slowest row of a full night averaged 15 seconds an episode.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { setEpisodeWatch, stallSignature, type EpisodeWatch, type StallRecord } from '../../src/sim/watch';

export const WATCHDOG_CFG = {
  /** A tick that has not come back after this long is treated as never coming back. */
  stallSec: 60,
  /** One episode's whole allowance. */
  capSec: 240,
  /** How often a unit may be restarted past a stalled episode before it counts as failed. */
  maxRestarts: 12,
  /** How long to wait for the stuck thread to pause. Native code cannot be interrupted. */
  captureMs: 20_000,
  /** Stack samples behind each stall's name. */
  samples: 6,
};

const BEAT = 0, ON = 1, SERIAL = 2;

// Plain JS, so it needs no TypeScript loader and cannot be slowed by one.
const WORKER_SOURCE = `
const { workerData, parentPort } = require('node:worker_threads');
const { Session } = require('node:inspector');
const fs = require('node:fs');
const cells = new Int32Array(workerData.shared);
let current = null;
parentPort.on('message', m => { current = { ...current, ...m }; });
let lastBeat = -1, lastSerial = -1, beatAt = Date.now(), serialAt = Date.now(), firing = false;
function fire(kind, secs) {
  firing = true;
  const finish = stack => {
    const row = { kind, secs, scenario: current?.scenario ?? '?', seed: current?.seed ?? 0, key: current?.key ?? '?', ...(current?.repro ? { repro: current.repro } : {}), stack };
    fs.appendFileSync(workerData.file, JSON.stringify(row) + '\\n');
    fs.writeSync(2, 'WATCHDOG ' + kind + ' after ' + secs + 's in ' + row.scenario + ' seed ' + row.seed + ': ' + stack.slice(0, 6).join(' < ') + '\\n');
    process.kill(process.pid, 'SIGKILL');
  };
  // One sample can land in whatever helper the loop happens to be calling. The frames
  // common to several samples are the loop itself, so one bug gets one name.
  let common = null;
  const fallback = setTimeout(() => finish(common ?? []), workerData.captureMs);
  try {
    const session = new Session();
    let samples = 0;
    session.connectToMainThread();
    session.on('Debugger.paused', m => {
      const frames = m.params.callFrames.slice(0, 24).map(f => f.functionName || '(anonymous)');
      if (common === null) common = frames;
      else {
        let shared = 0;
        while (shared < common.length && shared < frames.length && common[common.length - 1 - shared] === frames[frames.length - 1 - shared]) shared++;
        common = common.slice(common.length - shared);
      }
      if (++samples >= workerData.samples) {
        clearTimeout(fallback);
        finish(common);
        return;
      }
      session.post('Debugger.resume');
      setTimeout(() => session.post('Debugger.pause'), 150);
    });
    session.post('Debugger.enable');
    session.post('Debugger.pause');
  } catch {
    clearTimeout(fallback);
    finish([]);
  }
}
setInterval(() => {
  if (firing) return;
  const now = Date.now();
  const beat = Atomics.load(cells, ${BEAT}), serial = Atomics.load(cells, ${SERIAL});
  if (beat !== lastBeat) { lastBeat = beat; beatAt = now; }
  if (serial !== lastSerial) { lastSerial = serial; serialAt = now; }
  if (!Atomics.load(cells, ${ON})) { beatAt = now; serialAt = now; return; }
  const idle = (now - beatAt) / 1000, running = (now - serialAt) / 1000;
  if (idle > workerData.stallSec) fire('hung', Math.round(idle));
  else if (running > workerData.capSec) fire('slow', Math.round(running));
}, 1000);
`;

function hashText(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function readStalls(file: string): StallRecord[] {
  if (!fs.existsSync(file)) return [];
  const out: StallRecord[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as StallRecord); } catch { /* a killed writer's tail line */ }
  }
  return out;
}

export interface WatchdogOpts {
  file: string;
  stallSec?: number;
  capSec?: number;
  captureMs?: number;
}

/** Guard this process's episodes. Stalls already in the file are refused on sight. */
export function armWatchdog(o: WatchdogOpts): EpisodeWatch {
  const refused = new Map(readStalls(o.file).map(s => [s.key, s]));
  const shared = new SharedArrayBuffer(16);
  const cells = new Int32Array(shared);
  const worker = new Worker(WORKER_SOURCE, {
    eval: true, execArgv: [], stdout: false, stderr: false,
    workerData: {
      shared, file: o.file,
      stallSec: o.stallSec ?? WATCHDOG_CFG.stallSec,
      capSec: o.capSec ?? WATCHDOG_CFG.capSec,
      captureMs: o.captureMs ?? WATCHDOG_CFG.captureMs,
      samples: WATCHDOG_CFG.samples,
    },
  });
  worker.unref();
  const watch: EpisodeWatch = {
    enter(scenario, seed) {
      const key = `${scenario.id}#${seed}#${hashText(JSON.stringify(scenario) ?? '')}`;
      const earlier = refused.get(key);
      if (earlier) throw new Error(stallSignature(earlier));
      worker.postMessage({ scenario: scenario.id, seed, key });
      Atomics.add(cells, BEAT, 1);
      Atomics.add(cells, SERIAL, 1);
      Atomics.store(cells, ON, 1);
    },
    beat() { Atomics.add(cells, BEAT, 1); },
    leave() { Atomics.store(cells, ON, 0); },
    note(repro) { worker.postMessage({ repro }); },
  };
  setEpisodeWatch(watch);
  return watch;
}
