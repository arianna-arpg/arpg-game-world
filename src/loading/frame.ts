import { LoadingSurface } from './loadingSurface';
import { LOADING_CHANNEL, type LoadingCommand, type LoadingReply, type LoadingLease } from './protocol';

// No World, saves, account, network, or parent DOM. The opaque-origin frame owns
// its own event loop, input, animation, canvas and wardrobe sprite cache.
let token = 0, lease: LoadingLease | undefined;
type Unstamped<T> = T extends unknown ? Omit<T, 'channel' | 'token'> : never;
const reply = (message: Unstamped<LoadingReply>): void =>
  parent.postMessage({ ...message, token, channel: LOADING_CHANNEL }, '*');
const surface = new LoadingSurface(() => {}, keys => reply({ type: 'keys', keys }));
const snapshot = (): void => reply({ type: 'snapshot', value: surface.snapshot });
const action = (kind: 'cancel' | 'retry'): void => {
  // Give immediate feedback even when the game's task has not returned yet.
  // The game owns cancellation/publication; this frame never fabricates either.
  lease?.update({ label: kind === 'cancel' ? 'Leaving the crossing' : 'Trying the crossing again' });
  reply({ type: 'action', action: kind });
};
window.addEventListener('message', async (event: MessageEvent<LoadingCommand>) => {
  const message = event.data;
  if (event.source !== parent || !message || message.channel !== LOADING_CHANNEL || !Number.isSafeInteger(message.token)) return;
  if (message.type === 'begin') {
    if (message.token <= token) return;
    token = message.token;
    lease = surface.begin({ ...message.options, ...(message.cancel ? { cancel: () => action('cancel') } : {}) });
    snapshot(); return;
  }
  if (message.token !== token || !lease) return;
  switch (message.type) {
    case 'sample': snapshot(); return;
    case 'status': lease.update(message.status); break;
    case 'fail': lease.fail(message.message, message.retry ? () => action('retry') : undefined); break;
    case 'close': {
      const keys = surface.heldKeys;
      lease.finish(); lease = undefined; reply({ type: 'closed', keys }); return;
    }
    case 'paint': {
      await lease.paint();
      if (message.token !== token || !lease) return;
      snapshot(); reply({ type: 'painted', request: message.request }); return;
    }
  }
  snapshot();
});
// Diagnostics are pulled by the game when it can receive them. A busy game
// cannot accumulate a queue of snapshots; input and drawing never wait for it.
window.addEventListener('error', event => reply({ type: 'error', message: event.message }));
window.addEventListener('unhandledrejection', event => reply({ type: 'error', message: String(event.reason) }));
// Read-only state for the isolated real-client harness, never world authority.
Object.defineProperty(window, '__muCrossing', { value: { loading: surface, get snapshot() { return surface.snapshot; } } });
reply({ type: 'ready' });
