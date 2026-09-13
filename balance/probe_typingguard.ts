// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TYPING GUARD (core/input.ts; docs/engine/input.md).
// A key pressed INTO a text-entry element belongs to that element: it never
// enters the hero's held keys and never emits a press edge — typing "1" into
// the vendor's drop-index search must not drink the flask bound to 1, "w"
// must not walk. Pins:
//   A. THE PREDICATE: text inputs, textareas and contenteditable hosts take
//      the pen; checkbox/range/color controls, read-only fields, plain
//      elements and a target-less synthetic event do not.
//   B. THE GUARD: a keydown into a field leaves no key, no edge and no
//      shifted numeric alias behind; Esc passes (the cascade still closes
//      the panel around the field); a control, the canvas and a target-less
//      press are the hero's hands.
//   C. KEYUPS ALWAYS RELEASE: a key held before the field took focus comes
//      up on a keyup that lands in the field; a swallowed press whose
//      release lands outside leaves nothing stuck.
//   D. THE DIAL: the pass list is live.
// Same window shim as probe_metaslotinput.
// Run: npx tsx balance/probe_typingguard.ts
// ---------------------------------------------------------------------------

import { Input, TYPING_GUARD_CFG, isTypingTarget } from '../src/core/input';

const listeners = new Map<string, ((e: Partial<KeyboardEvent>) => void)[]>();
const target = { addEventListener(type: string, fn: (e: Partial<KeyboardEvent>) => void) {
  listeners.set(type, [...(listeners.get(type) ?? []), fn]);
} };
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: target, configurable: true });

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const TEXT = { tagName: 'INPUT', type: 'text' };
const SEARCH = { tagName: 'INPUT', type: 'search' };
const AREA = { tagName: 'TEXTAREA' };
const CHECKBOX = { tagName: 'INPUT', type: 'checkbox' };
const CANVAS = { tagName: 'CANVAS' };
/** Fire the registered browser listeners the way the DOM would: key / code /
 *  shift as the OS reports them, `at` the element that had focus. */
const event = (type: string, key: string, code = '', at?: object, shiftKey = false): void => {
  for (const fn of listeners.get(type) ?? []) fn({ key, code, shiftKey, target: at as unknown as EventTarget });
};

try {
  // ============================================================ A. the predicate
  check('A1: a text input takes the pen (type case-blind)',
    isTypingTarget(TEXT) && isTypingTarget(SEARCH) && isTypingTarget({ tagName: 'input', type: 'Password' }));
  check('A2: an input with no type is a text input', isTypingTarget({ tagName: 'INPUT' }));
  check('A3: a textarea and a contenteditable host take the pen',
    isTypingTarget(AREA) && isTypingTarget({ tagName: 'DIV', isContentEditable: true }));
  check('A4: checkbox / range / color inputs are controls, not pens',
    !isTypingTarget(CHECKBOX) && !isTypingTarget({ tagName: 'INPUT', type: 'range' })
    && !isTypingTarget({ tagName: 'INPUT', type: 'color' }));
  check('A5: a read-only field shows text, never takes it',
    !isTypingTarget({ tagName: 'TEXTAREA', readOnly: true }) && !isTypingTarget({ ...TEXT, readOnly: true }));
  check('A6: a plain element, the canvas, a missing target: not typing',
    !isTypingTarget(CANVAS) && !isTypingTarget({ tagName: 'BUTTON' })
    && !isTypingTarget(undefined) && !isTypingTarget(null) && !isTypingTarget('x'));

  const input = new Input(target as unknown as HTMLElement);

  // ================================================================ B. the guard
  event('keydown', '1', 'Digit1', SEARCH);
  check('B1: "1" typed into a search box is neither held nor an edge (the flask stays corked)',
    !input.keys.has('1') && !input.justPressed('1'));
  event('keydown', 'w', 'KeyW', AREA);
  check('B2: "w" typed into a textarea never walks', !input.keys.has('w') && !input.justPressed('w'));
  event('keydown', 'Shift', 'ShiftLeft', TEXT, true); event('keydown', '!', 'Digit1', TEXT, true);
  check('B3: a shifted digit in a field leaves no symbol, no numeric alias, no modifier',
    input.keys.size === 0 && !input.justPressed('1') && !input.justPressed('!'));
  event('keyup', 'Shift', 'ShiftLeft', TEXT); event('keyup', '!', 'Digit1', TEXT);
  event('keydown', 'Escape', 'Escape', TEXT);
  check('B4: Esc passes the guard (the cascade still closes the panel)',
    input.keys.has('escape') && input.justPressed('escape'));
  event('keyup', 'Escape', 'Escape', TEXT);
  event('keydown', '1', 'Digit1', CHECKBOX);
  check('B5: a press on a checkbox is not typing — the game hears it',
    input.keys.has('1') && input.justPressed('1'));
  event('keyup', '1', 'Digit1', CHECKBOX);
  event('keydown', '1', 'Digit1', CANVAS);
  check('B6: the canvas is the hero\'s hands', input.keys.has('1') && input.justPressed('1'));
  event('keyup', '1', 'Digit1', CANVAS);
  event('keydown', '2', 'Digit2');
  check('B7: a target-less event (a synthetic press) is not typing',
    input.keys.has('2') && input.justPressed('2'));
  event('keyup', '2', 'Digit2');
  check('B8: nothing lingers after the releases', input.keys.size === 0);

  // ===================================================== C. keyups always release
  event('keydown', 'w', 'KeyW', CANVAS);
  check('C1: a key held before the field took focus is down', input.keys.has('w'));
  event('keyup', 'w', 'KeyW', TEXT);
  check('C2: …and its keyup landing IN the field still releases it (no stuck walk)', !input.keys.has('w'));
  event('keydown', 'w', 'KeyW', TEXT); event('keyup', 'w', 'KeyW', CANVAS);
  check('C3: a swallowed press whose release lands outside the field leaves nothing behind',
    input.keys.size === 0);

  // ================================================================= D. the dial
  TYPING_GUARD_CFG.pass.add('tab');
  event('keydown', 'Tab', 'Tab', TEXT);
  check('D1: a key added to the pass list reaches the game from inside a field', input.keys.has('tab'));
  event('keyup', 'Tab', 'Tab', TEXT);
  TYPING_GUARD_CFG.pass.delete('tab');
  event('keydown', 'Tab', 'Tab', TEXT);
  check('D2: …and removed, the field keeps it', !input.keys.has('tab'));
  event('keyup', 'Tab', 'Tab', TEXT);
  input.endFrame();
} finally {
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
