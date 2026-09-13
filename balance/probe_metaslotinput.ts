import { Input } from '../src/core/input';

// Drive the registered browser listeners: modifiers can change between the
// down/up of the same physical key. Keep layout-specific typed keys intact.
const listeners = new Map<string, ((e: Partial<KeyboardEvent>) => void)[]>();
const target = { addEventListener(type: string, fn: (e: Partial<KeyboardEvent>) => void) {
  listeners.set(type, [...(listeners.get(type) ?? []), fn]);
} };
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: target, configurable: true });
let passed = 0, failed = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); ok ? passed++ : failed++; };
const event = (type: string, key = '', code = '', shiftKey = false) => {
  for (const fn of listeners.get(type) ?? []) fn({ key, code, shiftKey });
};
try {
  const input = new Input(target as unknown as HTMLElement);
  for (const [digit, symbol] of [['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^']]) {
    event('keydown', 'Shift', 'ShiftLeft', true); event('keydown', symbol, 'Digit' + digit, true);
    check('Shift+' + digit + ' retains the typed symbol and emits a numeric meta-slot edge', input.keys.has('shift') && input.keys.has(symbol) && input.keys.has(digit) && input.justPressed(digit));
    input.endFrame(); event('keydown', symbol, 'Digit' + digit, true);
    check('held numeric alias does not repeat its edge', !input.justPressed(digit));
    event('keyup', 'Shift', 'ShiftLeft'); event('keyup', digit, 'Digit' + digit);
    check('modifier-first release leaves neither symbol nor alias stuck', !input.keys.size);
  }
  event('keydown', '&', 'Digit1');
  check('unshifted layout-specific bindings retain their typed key', input.keys.has('&') && !input.keys.has('1'));
  event('keyup', '&', 'Digit1');
  event('keydown', '1', 'Numpad1');
  check('numpad bindings still use their typed number', input.keys.has('1'));
  event('keyup', '1', 'Numpad1');
  event('keydown', 'Shift', 'ShiftLeft', true); event('keydown', 'Shift', 'ShiftRight', true);
  event('keyup', 'Shift', 'ShiftLeft', true);
  check('releasing one Shift preserves the other held Shift', input.keys.has('shift'));
  event('keydown', '!', 'Digit1', true); event('keyup', '!', 'Digit1', true);
  check('digit-first release clears both spellings while Shift stays held', input.keys.has('shift') && !input.keys.has('1') && !input.keys.has('!'));
  event('keydown', '!', 'Digit1', true); event('blur'); input.endFrame();
  check('blur releases physical tracking and all held keys', !input.keys.size);
  event('keydown', '1', 'Digit1');
  check('a fresh press after blur emits a fresh edge', input.justPressed('1'));
} finally {
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
console.log(`Meta-slot input: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
