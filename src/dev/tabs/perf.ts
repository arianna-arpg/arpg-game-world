// ---------------------------------------------------------------------------
// DEV TAB: PULSE — live frame telemetry, read from the ALWAYS-ON main-loop
// rings (__game.perfFrames: rAF gap / sim ms / render ms — the exact rings
// the perf harness reduces to its gate percentiles), beside the world's own
// cheap counters. READER-ONLY: the tab adds zero per-frame cost beyond the
// rings that already run; everything here is a 2 Hz DOM refresh.
//
// THE FPS CHIP: a small fixed overlay (top-right) for play-testing with the
// panel closed — fps, gap p95, sim/render split, colored by the 55/30 fps
// knees. Toggle lives in this tab and persists per-browser (localStorage —
// a dev convenience, deliberately NOT a shipped Settings row; the whole
// panel is QA tooling, see dev/panel.ts).
// ---------------------------------------------------------------------------

import { webDisturbance } from '../../engine/worldgen';
import type { DevTabDef } from '../panel';
import { DEV_UI, css, btn, section } from '../ui';

interface Rings { gap: number[]; sim: number[]; ren: number[] }
const rings = (): Rings | null => {
  const g = (window as unknown as { __game?: { perfFrames?: () => Rings } }).__game;
  return g?.perfFrames ? g.perfFrames() : null;
};

const pct = (sorted: number[], p: number): number =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;

/** Reduce the newest `n` ring samples (rings unroll oldest→newest). */
function windowStats(r: Rings, n: number): {
  fps: number; gapP50: number; gapP95: number; gapP99: number;
  simP50: number; simP99: number; renP50: number; renP99: number;
  h40: number; h70: number;
} {
  const gap = r.gap.slice(-n), sim = r.sim.slice(-n), ren = r.ren.slice(-n);
  const gs = [...gap].sort((a, b) => a - b);
  const ss = [...sim].sort((a, b) => a - b);
  const rs = [...ren].sort((a, b) => a - b);
  const avgGap = gap.length ? gap.reduce((a, b) => a + b, 0) / gap.length : 0;
  return {
    fps: avgGap > 0 ? 1000 / avgGap : 0,
    gapP50: pct(gs, 0.5), gapP95: pct(gs, 0.95), gapP99: pct(gs, 0.99),
    simP50: pct(ss, 0.5), simP99: pct(ss, 0.99),
    renP50: pct(rs, 0.5), renP99: pct(rs, 0.99),
    h40: gap.filter(v => v > 40).length, h70: gap.filter(v => v > 70).length,
  };
}

const CHIP_KEY = 'dev_pulse_chip';
let chip: HTMLElement | null = null;
function setChip(on: boolean): void {
  try { localStorage.setItem(CHIP_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  if (!on) { chip?.remove(); chip = null; return; }
  if (chip) return;
  chip = document.createElement('div');
  css(chip, {
    position: 'fixed', right: '8px', top: '8px', zIndex: '99998',
    background: 'rgba(16,12,24,0.78)', border: `1px solid ${DEV_UI.border}`,
    borderRadius: '5px', padding: '3px 8px', font: '12px/1.5 Consolas, monospace',
    color: DEV_UI.good, pointerEvents: 'none', whiteSpace: 'pre',
  });
  chip.textContent = '…';
  document.body.append(chip);
}

export const perfTab: DevTabDef = {
  id: 'perf',
  label: 'Pulse',
  build: ({ getWorld }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto', font: '12px/1.6 Consolas, monospace' });

    const readout = document.createElement('div');
    css(readout, { whiteSpace: 'pre' });
    const spikeLog = document.createElement('div');
    css(spikeLog, { whiteSpace: 'pre', color: '#e8b46a' });

    const row = document.createElement('div');
    row.append(btn('Toggle FPS chip', () => setChip(!chip)));

    pane.append(section('Frame (10s window)'), readout,
      section('Recent hitches (gap > 35ms)'), spikeLog,
      section('Overlay'), row);

    // Per-second world-rate baselines.
    let prev = { rev: -1, seq: -1, heap: 0, at: 0 };
    const spikes: { gap: number; sim: number; ren: number }[] = [];
    let seenLen = 0;

    const update = (): void => {
      const r = rings();
      if (!r || !r.gap.length) { readout.textContent = 'no frames yet — start a run'; return; }
      // Harvest fresh spikes (ring copies are chronological; track growth).
      const fresh = Math.min(r.gap.length, Math.max(0, r.gap.length - seenLen));
      for (let i = r.gap.length - fresh; i < r.gap.length; i++) {
        if (r.gap[i] > 35) {
          spikes.push({ gap: r.gap[i], sim: r.sim[i], ren: r.ren[i] });
          if (spikes.length > 8) spikes.shift();
        }
      }
      seenLen = r.gap.length;

      const s10 = windowStats(r, 600);
      const s1 = windowStats(r, 60);
      const w = getWorld();
      const now = performance.now();
      const dtSec = prev.at ? (now - prev.at) / 1000 : 1;
      const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
      const revRate = prev.rev >= 0 ? (w.doodadRev - prev.rev) / dtSec : 0;
      const seqRate = prev.seq >= 0 ? (webDisturbance() - prev.seq) / dtSec : 0;
      const heapRate = prev.heap > 0 ? (heap - prev.heap) / 1048576 / dtSec : 0;
      prev = { rev: w.doodadRev, seq: webDisturbance(), heap, at: now };

      const lights = (window as unknown as { __game?: { renderer?: { lightLayer?: { lights?: unknown[] } } } })
        .__game?.renderer?.lightLayer?.lights?.length ?? 0;
      let veiled = 0;
      const zoneN = Object.values(w.zoneMap).length;
      for (const z of Object.values(w.zoneMap)) if (z.veiled) veiled++;

      readout.textContent =
        `fps      ${s1.fps.toFixed(0).padStart(4)}   (1s)\n`
        + `gap ms   p50 ${s10.gapP50.toFixed(1).padStart(5)}  p95 ${s10.gapP95.toFixed(1).padStart(5)}  p99 ${s10.gapP99.toFixed(1).padStart(5)}\n`
        + `sim ms   p50 ${s10.simP50.toFixed(1).padStart(5)}  p99 ${s10.simP99.toFixed(1).padStart(5)}\n`
        + `render   p50 ${s10.renP50.toFixed(1).padStart(5)}  p99 ${s10.renP99.toFixed(1).padStart(5)}\n`
        + `hitches  >40ms ${String(s10.h40).padStart(3)}   >70ms ${String(s10.h70).padStart(3)}   (10s)\n`
        + `world    actors ${w.actors.length}  doodads ${w.doodads.length}  lights ${lights}\n`
        + `chart    zones ${zoneN}  veiled ${veiled}\n`
        + `rates/s  doodadRev ${revRate.toFixed(1)}  webSeq ${seqRate.toFixed(1)}  heap ${heapRate >= 0 ? '+' : ''}${heapRate.toFixed(1)}MB`;

      spikeLog.textContent = spikes.length
        ? spikes.map(s => `gap ${s.gap.toFixed(0).padStart(4)}  sim ${s.sim.toFixed(0).padStart(4)}  ren ${s.ren.toFixed(0).padStart(4)}`).join('\n')
        : '(none this session)';

      if (chip) {
        const fps = s1.fps;
        chip.style.color = fps >= 55 ? DEV_UI.good : fps >= 30 ? '#e8b46a' : '#e86a6a';
        chip.textContent = `${fps.toFixed(0)} fps  p95 ${s10.gapP95.toFixed(0)}ms  sim ${s10.simP50.toFixed(1)}  ren ${s10.renP50.toFixed(1)}`;
      }
    };

    // One 2 Hz clock serves the pane AND the chip; it only touches the DOM
    // when either is actually visible.
    setInterval(() => {
      if (chip || (pane.isConnected && pane.offsetParent !== null)) {
        try { update(); } catch { /* a mid-boot world tick — next beat */ }
      }
    }, 500);
    try { if (localStorage.getItem(CHIP_KEY) === '1') setChip(true); } catch { /* ignore */ }

    return { el: pane, onShow: update };
  },
};
