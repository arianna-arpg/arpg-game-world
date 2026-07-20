# THE COUCH FABRIC — local shared-screen co-op

`src/data/couch.ts` (COUCH_CFG + CouchSeatTag) · `src/net/couch.ts` (PadSeatInput,
PadClaimScanner) · `src/ui/couchJoin.ts` (the join overlay) · seams in
`engine/world.ts`, `render/camera.ts`, `render/renderer.ts`, `ui/panels.ts`,
`core/gamepad.ts`, `meta/character.ts`, `main.ts` · probe
`balance/probe_couch.ts`.

A second player on the same machine — Diablo-couch style: one screen, two
controllers, two characters. The design is a COMPOSITION, not a mode: a couch
guest is an ordinary engine `Seat` whose intent comes from a second physical
pad and whose UI docks to its own screen flank. Every hard multiplayer problem
(intent application, XP share, loot rights, downed/revive, enemy scaling, zone
travel) was already solved by the host-authoritative seat fabric and is reused
verbatim — the couch adds a device, a frame, and a flank.

## THE SOLO INVARIANT (the first law)

With no couch seats, every branch short-circuits: no state, no draw, no clamp,
no menu row, no claim listener. `Seat.couch` is absent on every non-guest seat
and its absence IS the check (`World.couchActive()`); the renderer's
`couchStretch` pins to exactly 1 (`zoom` reads the byte-identical classic
1.3), `world.couchConfine` stays null, the HUD draws the one centered classic
cluster, and the pause menu carries no couch row until ≥ `join.minPads`
controllers are CONNECTED. Verified three ways: the probe's solo block, the
sim baseline gate (no gated metric moved), and the live rig.

## The seats

- `Seat.couch?: CouchSeatTag` — `{ pad, side, charId?, rosterSlot? }`. The tag
  is the whole identity: which physical pad drives it, which flank its UI
  claims, and (immortal lane) which roster vessel it persists as.
- Accessors: `couchSeats()`, `couchActive()`, `couchHeroes()` (the controlled
  bodies the frame must hold — the possession pointer, like solo),
  `localHumanSeats()` (local hero first — station dwells scan in this order so
  solo is order-identical), `accountSeat(seat)` (local OR couch: both
  characters belong to the one account on the couch), `seatModeDef/seatStageDef`.
- Guest seat ids are `c1`, `c2`… (`main.ts couchSeatSerial`) — never colliding
  with net peers (`p…`) or mercs (`m…`).

## Input — one pad per player

- `core/gamepad.ts`: `readPadSource(index?, exclude?)` binds a `PadState` to
  ONE pad slot (`PadState.padIndex`) or runs the classic most-recent scan
  SKIPPING claimed slots (`PadState.padExclude` — the hero's merged read can
  never be steered by a guest's pad). `PadState.sourceIndex` records the slot
  the last poll read (the claim scan treats a recently-active hero pad as
  taken). `connectedPadIndices()` + `padButtonDown()` serve the join census;
  `window.__fakePads[]` is the indexed test rig beside the legacy `__fakePad`.
- `net/couch.ts PadSeatInput` mirrors `readLocalInput`'s pad half exactly —
  analog move fold, deflection-scaled world-space aim, the soft assist with
  sticky write-back, the dt≤0 twin guard, held/edge/meta slot grammar, the
  unarmed-floor opt-out — so a guest's hands feel byte-for-byte like the
  hero's pad. Device polling stays in main.ts's tick (same wall clock).
- The guest's reticle draws in its class tint (`Renderer.couchAims`), fed per
  frame from `PadSeatInput.aimView()` — drawn IS what their casts receive.

## THE COUCH FRAME + THE EDGE LAW (render/camera.ts)

- `couchFit(eyes, screenW, screenH, baseZoom, spec)` — pure: focus = the
  heroes' bbox center; `stretch` (≤1) fits bbox + 2×`fitMarginWu` on screen,
  floored at `maxStretch`. One hero degenerates to the solo frame exactly.
- The renderer smooths `couchStretch` toward the fit (`zoomLerp`), feeds the
  focus through the UNCHANGED `placeCamera` mode registry, then publishes
  `world.couchConfine = couchConfineRect(cam, vw, vh, spec)` — the drawn frame
  inset by `confineMarginWu`. Drawn == confined by construction.
- `World.applyCouchConfine()` runs dead last among movers (after the
  grab/cling/possession slave steps): local heroes clamp into the published
  rect whatever moved them; a body honestly HELD (`Actor.heldBy`) is exempt
  (its seat wins the frame); enemies are never touched. `loadZone` nulls the
  rect (a frame never crosses a zone seam); a DEGENERATE viewport (<64px —
  minimized window) publishes no rect and holds the stretch (the rig caught
  the 1×1 point-prison this guards against).
- Feel: heroes close = solo zoom; walking apart breathes the frame out to the
  cap (live rig: 1 → 0.72 exactly); at the cap both pin at the frame's edge
  and further stick pour moves NO ONE — you keep running, the world stops
  giving.

## UI — flanks, lenses, and the latch

- HUD (canvas): `drawHud` dispatches per seat — solo keeps the one centered
  cluster byte-identically; couch anchors each seat's whole cluster (orbs,
  arcs, bar, pips, buffs, grammar rows, possession chip, XP) to its flank
  (`COUCH_CFG.join.sides`, hud.sideInset), guest bars read PAD glyphs, guest
  identity docks to its top corner. World-level lines (zone banner, wave
  banner, boss bar) draw once.
- Panels (DOM): THE COUCH LENS — per-player panels remember their OPENER
  (`UI.panelSeatIds`); the refresh renders that seat's data and the panel
  docks to its flank (`couch-left`/`couch-right`, injected styles,
  `panels.sideWidthFrac`). Different panels open simultaneously per player;
  the SAME panel contended = the latest opener takes ownership (visible,
  predictable; a twin-instance lane is queued). The world map stays ONE
  shared chart (it always was).
- Mutations: THE ACTION LATCH — capture-phase listeners stamp
  `world.uiActionSeatId` for the duration of any dispatch inside a
  guest-owned panel (drag gestures keep their owner through the drop), and
  `requestMeta` routes to that seat via the existing seat-scoped
  `applyAction`. Zero per-call-site edits; null between dispatches so the
  frame loop can never misroute.
- Escape: seat-scoped cascades (`escCascadeFor(seatId)`) — each player's
  cancel walks THEIR panels; the shared pause menu is last. The guest's Ⓑ
  and START ride its own pointer/pad (`PadPointer.onCancel`).
- Stations: the personal-economy four (vendor, salvage bench, oracle stone,
  tracker's fire) scan ALL local human seats and attribute the dwell
  (`vendorDwellSeatId` …) — the panel opens for the seat that lingered, on
  its flank (witnessed live: the guest idled at the bench and got the bench).
  Town/meta stations (caravan, sail, hold, merc, borough, vocation) stay
  host-scoped.
- The positional veils (sight/room) are single-eye fabrics: under couch they
  SUSPEND per `COUCH_CFG.render` (each veil's own fade opens gracefully;
  engine LoS untouched); every local hero carries the lantern.

## Join, leave, persistence — THE LANE LAW

- The pause menu grows "Local Co-op — Player Joins" ONLY when main.ts wired
  the flow, ≥ `minPads` controllers are connected, and a guest seat is free
  (LocalTransport host only — never on a net client). The overlay
  (`ui/couchJoin.ts`, lobby idiom) runs "press Ⓐ on the JOINING controller"
  (raw-scan `PadClaimScanner`, hero's live pad excluded), then the pick.
- MORTAL run → a fresh disposable hero (the net join's Tier-0 idiom; nothing
  persists). IMMORTAL run → another VESSEL from this account's roster —
  requires `immortalSlotsNeeded` (2) immortal slots unlocked
  (`feat_immortal_slot_2`) and a second sworn vessel; the join loads its
  slot, `rebuildSavedMeta` + `World.adoptSeatMeta` graft it onto the seat,
  `Seat.couchDeaths` seeds from its save.
- Persistence: `serializeCouchGuest` (build + carry + mode + own ring, NO
  world half — the ground belongs to the host's save; the dormant menagerie
  passes through verbatim) → `saveCouchGuest` into the vessel's own roster
  slot + index card. Rides every choke: autosave, `world.couchDirty`, menu
  exit, run end, the durable quit flush.
- THE GUEST COVENANT: a party wipe costs a guest vessel exactly what dying at
  home would — its own corpse (into `couchDeaths`, spawning when that vessel
  is next played), the whole carry strip, the stage advance — banked in
  `bankCouchWipe()` beside the host's own banking. Account-level writes
  (tithe, ledger merge, death tally) are NOT repeated: one account, one
  payment. The couch is never a cheaper way to die.
- Leave: the pause row, run end, or menu exit — vessel saved first, seat
  removed, pad freed, the frame narrows home on its own smoothing.

## Dials

Everything is `COUCH_CFG`: join (minPads, maxLocal, claimButton,
immortalSlotsNeeded, sides), camera (fitMarginWu, maxStretch, zoomLerp,
confineMarginWu), hud.sideInset, panels.sideWidthFrac, render veil policy.
A machine that wants keyboard-hero + one-pad-guest couch play turns
`minPads` to 1 — one dial, no code.

## Queued

Twin-instance core panels (both players in the SAME panel at once — the
clone lane the lens was shaped for); a per-seat guest binds override
(`Settings.padBinds` is shared today); guest possession HUD chips beyond the
cluster chip; the veil union pass ('union' beside 'off'/'p1'); net + couch
in one session (a couch guest beside remote peers — the seat fabric allows
it, the broadcast gate deliberately doesn't yet); in-run corpse spawning for
guest rings.
