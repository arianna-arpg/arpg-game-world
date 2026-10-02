# Isolated gameplay review client

Use `balance/playtest-client.cjs` for ordinary-input reviews of a **fixed local
build**. This is a test client for this repository. It does not control external
games, open the human's browser, or use a human profile.

```powershell
node_modules/.bin/electron.cmd balance/playtest-client.cjs --build balance/reports/<fixed-build> --session <unique-review-id>
```

The process prints a localhost JSON endpoint. Session metadata, an append-only
action log, paired images and its disposable browser profile live under
`balance/reports/playtests/<session>/`. These files remain gitignored.
The whole build is fingerprinted at launch. Reuse the same command to resume:
the profile and game origin are retained, and a different build refuses to open
the session. Keep that build directory unchanged while reviewing it. A second
concurrent instance refuses if the saved game port is occupied.

POST one JSON action at a time to the printed endpoint:

```json
{"readUI":true,"capture":true,"health":true}
```

`readUI` returns visible native buttons/inputs and their screen rectangles.
It does not read actor attributes, enemies, loot tables or saves. Read the
screenshots for the rest of the visible game. `health` reports the native fatal
error field solely to distinguish a transport problem from a game crash.

```json
{"input":[{"type":"keyDown","keyCode":"W"}],"frames":20,"capture":true}
```

```json
{"input":[{"type":"keyUp","keyCode":"W"}],"frames":1,"capture":true}
```

Keys and pointer buttons stay held until their corresponding up event. Use
ordinary Electron device events: keyDown/keyUp/char with keyCode; mouseMove;
mouseDown/mouseUp with button left/middle/right and clickCount 1; mouseWheel
with finite deltaX/deltaY. Pointer positions are integer screen coordinates
inside the 1280 by 850 client. The game's own input reader maps aim. There is no
world-coordinate aiming callback, arbitrary code endpoint, teleport or stat
grant. The harness delivers events, lets the renderer process them, then takes
the requested fixed 16.7 ms steps. Each action permits 1–600 frames; prefer short
combat observations and longer steps only when the visible situation warrants it.

```json
{"input":[{"type":"mouseMove","x":700,"y":400},{"type":"mouseDown","x":700,"y":400,"button":"left","clickCount":1}],"frames":12,"capture":true}
```

Every capture produces both `.canvas.png` and `.page.png`. **Inspect both.**
The canvas is the current native world frame but omits HTML menus, reward
attention, tooltips and panels. The full page includes that UI, but an offscreen
Chromium compositor can lag the canvas. Neither is edited or replaced.
Reports must not call an omitted HTML control absent from the game.

Start through native Begin and the vessel selection. Earn skills, items and
levels through play. Check persistence with the visible Save & Exit and Continue
buttons. Save & Exit may close the bridge before it can reply; a normal closed
event and process exit are not a game crash. The `close` action is only transport
cleanup and does **not** promise a saved run.

Frame-stepped evidence supports visible choices, states and outcomes. It cannot
establish live frame rate, audio quality, input latency or the feel of continuous
real-time play. A report should name its build fingerprint, chosen route/class,
any requested coverage, mistakes and recoveries, earned choices, consecutive
combat frames, persistence result and candid willingness to continue. Public
reviews of other games can inform a rubric; they are not a played comparison.

Validation: native Begin, ordinary W movement into a Rogue vessel, pointer Wake,
visible menu controls, Escape, Save & Exit and same-origin Continue were exercised
in an isolated profile. Captures include the actual HTML HUD. Invalid code,
frame and pointer requests and a changed-build resume were refused. No game
balance or save formats are changed by this client.
