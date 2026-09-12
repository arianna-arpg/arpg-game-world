# Player death presentation

A solo run-ending death rises for 0.95 seconds, cracks for 0.65 seconds,
then breaks into fragments of the character's own rendered silhouette.
The epilogue starts fading in 0.2 seconds after the break and reaches full
opacity over 1.15 seconds. The complete sequence lasts 2.95 seconds.

A local light pulse gathers in the final 0.07 seconds before fragmentation,
peaks at the break, and disperses over 0.28 seconds. `flashLeadSec`,
`flashSec`, `flashAlpha`, `flashRadiusScale`, and `flashColor` control it;
zero duration or intensity disables it. Its approved radius is 5.5 times the
body radius, at 0.9 intensity. The pulse follows the raised body
and uses the shared glow painter, with no gameplay light or damage effect.
The same pulse also washes the whole game view, above its veil and canvas
HUD, at `screenFlashAlpha` strength (0.42 by default). Zero keeps the local
body burst alone. Both flashes share their timing and color, so their peaks
and decay stay synchronized.

`src/data/deathPresentation.ts` owns the timings, lift, fragment count,
velocity, gravity, spin, crack color/width, and initial scene dimming.
`enabled: false` restores an immediate epilogue. Zero-length phases are
supported. `deathPresentationPose` is the single pure timeline used by the
engine, body renderer, and shell. Future visual variants can consume this
same timeline without touching kill logic or persistence.

The actual death remains immediate: the actor is dead and untargetable,
its killer attribution is unchanged, and main.ts books the corpse, ledger,
rewards, and durable save/wipe once. The presentation is transient world
state, never saved or replicated. It starts at the run-end seam so the dead
hero is drawn on the first death frame. Its raw clock ignores gameplay
holds; ambient rendering and existing hit flashes/text continue, while
combat, enemy AI, and reward-producing simulation stop. The actor's position
never lifts: canvas transforms carry the motion, preserving the corpse spot.

The renderer captures the ordinary body/look and adornment bakes once and
clips that image into deterministic fragments. It uses no gameplay RNG and
allocates no particle actors. Fragment count is bounded to 3–64. Portrait
storage follows the transient sequence through a WeakMap; two scratch
canvases are reused for the masked crack lines.

The epilogue's DOM fade uses opacity only and disables its action through
the reveal. It opens once; the rendered world reaches full dark before the
loop stops. New runs clear the pending epilogue and use a fresh World.

Existing alternative death contracts retain their own behavior: revivable
co-op downs, scripted prologue falls, Descent resurface, survived mode
respawns, and fallen-vessel sanctuary transitions. Network run-end routing
and deliberate forfeits retain their immediate epilogues.

Verification: `npm run check`, `npm run probe -- playerdeath`, the existing
corpse/couch/scenes/resurrection probes, `npm run sim -- run --suite smoke`,
and the Electron boot smoke. Visual QA uses an isolated account and blocks
the disk-save endpoint; inspect rise, cracks, shatter, and gradual epilogue
reveal through the real renderer.
