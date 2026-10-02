# THE INPUT LAWS — one artery, one key source, and what an interaction owns

`net/intent.ts` is the currency: a `PlayerInput` per seat per frame (`held[]`
/ `edge[]` / `metaEdge[]` per bar slot, `aim` in world space, the move axis),
read from the OS by `main.ts readLocalInput` (keyboard + pad), by a couch
guest's `PadSeatInput` (`net/couch.ts`), a scripted ally or a remote peer, and
applied by ONE artery, `World.applyInputs`, for every player-kind body.
`core/input.ts` is the ONE keyboard/mouse source behind the local read.

## THE INPUT LAW (the gates)

An interaction that takes the hero's hands — the harvest rite
(`docs/engine/harvest.md`), the steady hand's trace
(`docs/design/steady-hand.md`) — is a GATE at the artery: while it stands, the
seat's whole intent (movement, casts, aim) is swallowed and its presses are
read by the interaction alone (symbols, the pen). A bound skill can never
fire off a sequence key mid-rite. A new gate joins the artery's one `||` and
inherits everything below.

## THE SPENT PRESS (`SPENT_PRESS_CFG`, net/intent.ts)

The frame AFTER a gate lifts was the hole: the closing symbol's key (or the
drawing bind) is still physically down, and the cast lane fires most skills,
flasks included, on the HOLD — so the press that finished the rite drank the
flask bound to it. The law: **a press an interaction took belongs to it for
the whole physical hold.**

- At the swallow, every slot the gate took is SPENT (`World.spendPresses`).
- The cast lane reads `World.unspentHeld`: the seat's `held[]` with spent
  slots masked. A spent slot lifts only when its button is observed UP, or
  goes down AFRESH (an `edge` / `metaEdge` proves a release the sim may never
  have seen, so a freeze can never strand a press).
- Structural: every gate spends through the one seam, so a future
  interaction cannot forget to; a seat with nothing spent reads its own
  array untouched (the no-interaction invariant — solo play with no gate is
  byte-identical).
- Keyed by SEAT id (the hand, never the body — possession does not launder a
  press); transient (never saved, never wired — the host runs the artery);
  cleared with the seat.

The dial, `spend`:

| value | what a swallowed frame spends |
| --- | --- |
| `'hold'` (default) | every slot down in the frame — the whole hand the gate took, a hold that predates the interaction included |
| `'edge'` | only the presses that went down in that frame; a predating hold resumes when the gate lifts |
| `'off'` | nothing — the pre-2026-09-12 lane, kept so the probe can reproduce the leak |

## THE TYPING GUARD (`TYPING_GUARD_CFG`, core/input.ts)

The same double-fire at the key source: `Input` listens on the WINDOW, so a
letter typed into a text field (the vendor's drop-index search, the passive
tree's node search, the naming card) also landed in the hero's `keys` — "1"
drank the flask, "w" walked. The law: **a key pressed into a text-entry
element belongs to that element.**

- `isTypingTarget` (duck-typed on tagName / type / contenteditable, so a
  headless probe speaks it with plain objects) drops the keyDOWN before it
  reaches `keys` / `pressed` / the shifted numeric alias.
- Keyups ALWAYS release: a key held before the field took focus must still
  come up, and a swallowed press whose release lands outside the field
  leaves nothing stuck.
- `pass` (Esc by default) names the keys a field never types; they reach the
  game so the escape cascade still closes the panel around the field.
- `textInputTypes` names the `<input type=…>` kinds that take text; every
  other input (checkbox, range, color, button) is a control, not a pen, and a
  read-only field shows text without taking it.

## Standing kin

- THE SWAP-ON-CONFLICT keybind law (`ui/panels.ts`): one key drives ONE
  action, so an interact press can never double as a slot press by binding.
- THE PRESSABLE BAR (`main.ts`): a mouse press on a HUD slot lands as that
  slot's held/edge — the same shape a key delivers — so every law above
  holds for it verbatim.
- THE PRESSABLE META (`main.ts hudMetaSlotAt`, `renderer.hudMetaRects`): a
  plain click on a slot's META mini-button lands as that slot's `metaEdge`
  — the modifier lane's exact shape, no modifier held, the primary withheld
  for the button's hold. The mini-button wears a LIVE face
  (`engine/skills.ts registerMetaFace`) so it never lies about what the
  click does; the companion stance shift is its debut.
- THE META PRESS BELONGS TO THE META (`World.applyInputs` → `spendPress`):
  a `metaEdge` press SPENDS its slot for the button's whole hold, through
  the same ledger a gate writes — the key is still physically down on the
  frames after a modifier press, and the cast lane fires most skills on the
  hold, so without the spend a stance shift's own key drank the converted
  Whistle one frame later. Spent whatever the payload did with the press;
  lifted by the release or the next fresh edge. EXEMPT: a slot feeding a
  RUNNING held cast (a guard, a channel) — there the modifier alone fired
  the held skill's meta and the hand must stay on the key.
- THE COMPANION STANCE action (`Settings.keybinds.companionStance`, `x` by
  default, pad unbound): a rebindable verb that cycles every bonded beast's
  conduct on the bar through the host-authoritative `companionStance` intent
  (`docs/design/tame-beast.md`).
- THE PAD POINTER (`ui/padpointer.ts`): while the menu pointer owns the pad,
  its buttons are UI gestures and never gameplay intent.

Probes: `balance/probe_harvest.ts` rig K, `balance/probe_trace.ts` rig D,
`balance/probe_typingguard.ts`.

## Held-skill priority

`engine/skillInputOrder.ts` orders the ordinary host skill attempts after the
interaction and timeflow gates. `SKILL_INPUT_CFG.priority = 'recent-held'`
gives a newly pressed, still-held slot the next available native opportunity
before an older repeat. For example, holding Cleave and then holding Shield Up
finishes the current swing and raises the guard, instead of letting Cleave's
lower slot restart forever. The priority belongs to the seat and disappears on
release. It is transient and is neither saved nor sent over the wire.

This changes attempt order only: casts retain their commitment, each running
mode keeps its own button's held state, and every attempt still goes through
useSkill/useMetaSkill. A refused or cooling-down skill lets another held action
try. A tap released while the body remains committed is not queued. Toggles
still require edges; meta presses retain their own lane. Edges in one input
frame tie by slot index because PlayerInput has no within-frame timestamps.
Legacy holds without edges retain slot order until a fresh choice arrives.

`priority = 'slot'` restores the previous ordering for comparison. Verify
`probe_skillinputorder.ts`, native harvest/trace/meta/typing probes and
`balance/held-priority-ui.cjs`. The client uses real mouse button events in an
isolated profile; `HOLLOW_WAKE_QA_LEGACY=1` with the prior fixed build reproduces
the held-shield starvation. This is independent of movement lock during casts.

### Walking before an older repeat

With `SKILL_INPUT_CFG.movement = 'recent-walk'`, beginning a walk takes the
next opportunity ahead of skills already held. The running cast still finishes
under its own movement lock; after it finishes, an older attack cannot keep
restarting and rooting the hero. Ending the walk restores a still-held skill.
A fresh skill press while walking wins again. This also applies to mobile
repeat casts: their current mobility is unchanged, but a newly requested walk
supersedes their older repeat until the player presses the skill again.

A walk is its zero-to-nonzero intent transition. Steering an existing walk does
not continually steal priority from an attack. Same-frame walk/skill presses
favor the explicit skill. While walking, a newly observed held slot without an
edge bit is also admitted, preserving older scripted/remote intent producers;
an already observed hold is an older repeat. Outside walking the prior
edge/slot ordering remains intact.

The running cast's held state is fed before arbitration, so a later walk never
releases a guard or channel. Native channel/gather mobility, charge/release,
cooldown, cost and reflex rules still run through their existing gates.
The history belongs to each seat, is transient, and changes no wire/save format.
`movement = 'ignore'` restores skill-only precedence; `priority = 'slot'`
restores the original attempt order altogether.

Verify the input probe, interaction/meta/typing gates, native skillmodes/couch,
and `balance/movement-priority-ui.cjs`. Its real mouse and keyboard comparison
against the prior build (`HOLLOW_WAKE_QA_LEGACY=1`) reproduces repeated Firebolts
during a requested walk. The new build starts moving at the same frame after
the original cast and then continues walking, until movement ends or a fresh
attack is pressed. The controlled flat arena tests input semantics, not whether
ordinary combat is enjoyable.
