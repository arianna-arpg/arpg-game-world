import { isTypingTarget } from '../core/input';
import type { Settings } from '../meta/settings';

let always = false;
let holdKey = '';
let itemKey = '';
const heldCodes = new Set<string>();
let padHeld = false;
let keyboard = false;
let installed = false;
let enabled = false;
const listeners = new Set<() => void>();

function syncInspection(): void {
  const next = always || heldCodes.size > 0 || padHeld || keyboard;
  if (next === enabled) return;
  enabled = next;
  document.documentElement.toggleAttribute('data-inspecting',next);
  for (const update of listeners) update();
}

export function configureInspection(settings: Pick<Settings,'inspectionAlways' | 'keybinds'>): void {
  always = settings.inspectionAlways;
  if (holdKey !== settings.keybinds.inspectTooltips) heldCodes.clear();
  holdKey = settings.keybinds.inspectTooltips;
  itemKey = settings.keybinds.focusItemTooltip;
  if (!installed) {
    installed = true;
    const release = () => { heldCodes.clear(); padHeld = false; keyboard = false; syncInspection(); };
    window.addEventListener('keydown',event => {
      if (event.repeat && enabled) return;
      if (event.defaultPrevented || isTypingTarget(event.target) || event.isComposing || event.getModifierState('AltGraph')) return;
      if (!holdKey || event.key.toLowerCase() !== holdKey || (event.ctrlKey && holdKey !== 'control') || (event.metaKey && holdKey !== 'meta')) return;
      heldCodes.add(event.code || holdKey);
      if (document.querySelector('.panel:not(.hidden,.folio-shelved):hover,.inspection-tooltip:popover-open,#tooltip:not(.hidden)')) event.preventDefault();
      syncInspection();
    });
    window.addEventListener('keyup',event => {
      if (heldCodes.delete(event.code || event.key.toLowerCase())) syncInspection();
    },true);
    window.addEventListener('blur',release);
    document.addEventListener('visibilitychange',() => { if (document.hidden) release(); });
    document.addEventListener('focusin',event => {
      if (keyboard && event.target instanceof Element && !event.target.closest('#tooltip,.inspection-tooltip,[data-tip="item"]')) keyboardInspection(false);
    });
  }
  syncInspection();
}
export const inspectionEnabled = (): boolean => enabled;
export const inspectionGestureHeld = (): boolean => heldCodes.size > 0 || padHeld;
export function matchesItemInspectionKey(event: KeyboardEvent): boolean {
  return !!itemKey && event.key.toLowerCase() === itemKey && !event.defaultPrevented && !event.repeat
    && !event.isComposing && !event.getModifierState('AltGraph') && !isTypingTarget(event.target)
    && (!event.ctrlKey || itemKey === 'control') && (!event.metaKey || itemKey === 'meta');
}
export function setInspectionPadHeld(held: boolean): void {
  if (held !== padHeld) { padHeld = held; syncInspection(); }
}
export function keyboardInspection(on: boolean): void { keyboard = on; syncInspection(); }
export function onInspectionChange(update: () => void): void { listeners.add(update); }
