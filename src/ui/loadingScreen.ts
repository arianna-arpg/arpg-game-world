import { loadingPresentation } from '../loading/presentation';
import { recordRuntimeError } from '../core/runtimeDiagnostics';
import { mountRuntimeErrorReport } from './runtimeErrorReport';
import loadingScript from 'virtual:mu-loading-script';
import { spiritDirection } from '../loading/spiritRun';
import { Z_LADDER } from './zorder';
import { LOADING_CHANNEL, type LoadingCommand, type LoadingReply, type LoadingOptions,
  type LoadingLease, type LoadingSnapshot } from '../loading/protocol';
export type { LoadingOptions, LoadingStatus, LoadingLease } from '../loading/protocol';

/** The game owns readiness and world authority; the sandboxed foreground owns
 * all minigame input and painting. Do not add allow-same-origin: it would put
 * the crossing back on the game's blocked renderer thread in desktop Chromium. */
export class LoadingScreen {
  private errorReport?: HTMLElement;
  private frame: HTMLIFrameElement;
  private ready = false;
  private startupError?: string;
  private token = 0;
  private visible = false;
  private closing = false;
  private statusKey = '';
  private cancel?: () => void;
  private retry?: () => void;
  private failure?: { message: string; retry: boolean };
  private beginCommand?: LoadingCommand;
  private latest?: LoadingSnapshot;
  private inert: { el: HTMLElement; was: boolean }[] = [];
  private focus?: HTMLElement;
  private heldKeys = new Set<string>();
  private releasedKeys = new Set<string>();
  private padHeld = false;
  private request = 0;
  private presented: Promise<void> = Promise.resolve();
  private closeTimer?: ReturnType<typeof setTimeout>;
  private paints = new Map<number, { token: number; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor(private clearWorldInput: () => void) {
    const frame = this.frame = document.createElement('iframe');
    frame.id = 'mu-loading-frame'; frame.title = 'The Crossing — Loading';
    frame.sandbox.add('allow-scripts'); frame.allow = 'gamepad *'; frame.referrerPolicy = 'no-referrer';
    frame.style.cssText = `position:fixed;inset:0;width:100%;height:100%;border:0;z-index:${Z_LADDER.loading};background:#080e16;display:none`;
    const src = new URL(loadingScript, location.href).href;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${new URL(src).origin}; style-src 'unsafe-inline'"><style>html,body{margin:0;background:#080e16;color:#d9e9e3}.runescript{font-family:'Segoe UI Symbol','Noto Sans Runic',Junicode,serif}</style></head><body><script src="${src.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></script></body></html>`;
    window.addEventListener('message', this.receive);
    window.addEventListener('keydown', this.keyDown, true);
    window.addEventListener('keyup', this.keyUp, true);
    window.addEventListener('blur', () => this.releasedKeys.clear());
    // Warm the lightweight document at boot, before the player chooses a vessel.
    document.body.append(frame);
    setInterval(() => { if (this.visible && this.ready && !this.closing) this.send(this.command({ type: 'sample' })); }, 100);
  }
  get active(): boolean { return this.visible; }
  get padQuarantined(): boolean {
    if (!this.padHeld) return false;
    this.padHeld = Array.from(navigator.getGamepads?.() ?? []).some(p => p?.connected
      && (p.axes.some(a => Math.abs(a) > 0.2) || p.buttons.some(b => b.pressed)));
    return this.padHeld;
  }
  get snapshot(): LoadingSnapshot {
    return { ...(this.latest ?? { direction: this.beginCommand?.type === 'begin' ? this.beginCommand.options.direction : undefined, time: 0, lane: 0, passed: 0, streak: 0, hits: 0,
      speed: 1, dash: 0, currentsTaken: 0, collected: 0, boostGates: 0, pickups: [], currents: [], gates: [],
      label: this.beginCommand?.type === 'begin' ? this.beginCommand.options.label : '', failed: false }), active: this.active };
  }
  private send(command: LoadingCommand): void { this.frame.contentWindow?.postMessage(command, '*'); }
  private command(message: Record<string, unknown>): LoadingCommand {
    return { ...message, channel: LOADING_CHANNEL, token: this.token } as LoadingCommand;
  }
  begin(options: LoadingOptions): LoadingLease {
    this.errorReport?.remove(); this.errorReport = undefined;
    if (!this.visible) {
      this.focus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.inert = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== this.frame)
        .map(el => ({ el, was: el.inert }));
      for (const row of this.inert) row.el.inert = true;
    }
    this.settlePaints(); clearTimeout(this.closeTimer);
    const token = ++this.token;
    this.visible = true; this.closing = false; this.statusKey = ''; this.retry = undefined; this.failure = undefined;
    this.cancel = options.cancel; this.latest = undefined; this.heldKeys.clear(); this.clearWorldInput();
    this.frame.style.display = 'block'; this.frame.focus({ preventScroll: true });
    // Publish the embedding frame's visibility before blocking the game. A child
    // paint alone can acknowledge its old hidden state and remain throttled.
    this.presented = loadingPresentation();
    const { cancel, ...wire } = options;
    this.beginCommand = this.command({ type: 'begin', options: { ...wire, direction: wire.direction ?? spiritDirection(wire.kind) }, cancel: !!cancel });
    if (this.ready) this.send(this.beginCommand);
    const current = (): boolean => this.visible && !this.closing && token === this.token;
    return { get current() { return current(); },
      update: status => { if (current()) {
        this.errorReport?.remove(); this.errorReport = undefined;
        const key = JSON.stringify(status); if (key === this.statusKey) return;
        this.statusKey = key; this.retry = undefined; this.failure = undefined;
        if (this.beginCommand?.type === 'begin') Object.assign(this.beginCommand.options, { label: status.label, detail: status.detail, completed: status.completed, total: status.total });
        if (this.ready) this.send(this.command({ type: 'status', status }));
      } },
      paint: async () => {
        await this.presented;
        if (!current()) return;
        if (this.startupError) return Promise.reject(new Error(this.startupError));
        const request = ++this.request;
        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { this.paints.delete(request); reject(new Error('The crossing did not become ready')); }, 15000);
          this.paints.set(request, { token, resolve, reject, timer });
          if (this.ready) this.send(this.command({ type: 'paint', request }));
        });
      },
      fail: (message, retry) => { if (current()) { this.retry = retry;
        const key = 'fail:' + message + ':' + !!retry; if (key === this.statusKey) return; this.statusKey = key;
        recordRuntimeError('crossing refused', message);
        this.errorReport ??= mountRuntimeErrorReport();
        this.failure = { message, retry: !!retry };
        if (this.ready) this.send(this.command({ type: 'fail', ...this.failure })); } },
      finish: () => { if (current()) this.close(); },
    };
  }
  close(): void {
    if (!this.visible || this.closing) return;
    this.closing = true; this.settlePaints();
    // Keep world input held until the child returns the exact held-key set.
    // This is an acknowledgement, not a minimum duration or a gameplay gate.
    if (this.ready && !this.startupError) {
      this.send(this.command({ type: 'close' }));
      const token = this.token;
      this.closeTimer = setTimeout(() => { if (this.closing && this.token === token) this.hide(); }, 1500);
    }
    else this.hide();
  }
  private hide(): void {
    this.errorReport?.remove(); this.errorReport = undefined;
    clearTimeout(this.closeTimer);
    for (const key of this.heldKeys) this.releasedKeys.add(key);
    this.heldKeys.clear(); this.padHeld = true; this.clearWorldInput();
    this.visible = false; this.closing = false; this.cancel = this.retry = undefined; this.beginCommand = undefined;
    this.frame.style.display = 'none';
    for (const row of this.inert) row.el.inert = row.was;
    this.inert = []; if (this.focus?.isConnected) this.focus.focus({ preventScroll: true });
  }
  private settlePaints(error?: string): void {
    for (const pending of this.paints.values()) { clearTimeout(pending.timer); if (error) pending.reject(new Error(error)); else pending.resolve(); }
    this.paints.clear();
  }
  private receive = (event: MessageEvent<LoadingReply>): void => {
    const message = event.data;
    if (event.source !== this.frame.contentWindow || event.origin !== 'null' || !message || message.channel !== LOADING_CHANNEL) return;
    if (message.type === 'ready') {
      this.ready = true;
      if (this.beginCommand && this.visible && !this.closing) {
        this.send(this.beginCommand);
        if (this.failure) this.send(this.command({ type: 'fail', ...this.failure }));
        for (const [request, pending] of this.paints) if (pending.token === this.token) this.send(this.command({ type: 'paint', request }));
      }
      return;
    }
    if (message.type === 'error') { this.startupError = message.message; this.settlePaints(message.message); if (this.visible) this.hide(); return; }
    if (!this.visible || message.token !== this.token) return;
    switch (message.type) {
      case 'snapshot': this.latest = message.value; break;
      case 'keys': this.heldKeys = new Set(message.keys); break;
      case 'closed': this.heldKeys = new Set(message.keys); if (this.closing) this.hide(); break;
      case 'painted': {
        const pending = this.paints.get(message.request);
        if (pending?.token === this.token) { clearTimeout(pending.timer); this.paints.delete(message.request); pending.resolve(); }
        break;
      }
      case 'action': if (!this.closing) { if (message.action === 'cancel') this.cancel?.(); else { this.statusKey = ''; this.retry?.(); } } break;
    }
  };
  private keyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof Node && this.errorReport?.contains(event.target)) return;
    if (this.visible || this.releasedKeys.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  private keyUp = (event: KeyboardEvent): void => {
    if (event.target instanceof Node && this.errorReport?.contains(event.target)) return;
    const quarantined = this.releasedKeys.delete(event.code);
    if (this.visible || quarantined) event.stopImmediatePropagation();
  };
}
