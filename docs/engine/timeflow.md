# The Timeflow Fabric — time as an open, composable dial

`src/engine/timeflow.ts` · owned by `World.timeflow` · consumed by
`World.update`, `updateAI`, `World.applyInputs`, `updateProjectiles`, the
repeat/follow-up/leap clocks, `ui/panels.ts` surfaces, and
`Renderer.drawTimeflow`.

The pause menu, an Ultimatum-style "decide at leisure" reward screen, a
chronomancer's Time Stop, an enemy's stasis bolt, a slow-motion cinematic —
these are all the SAME primitive: something bending how fast a body (or the
whole sim) experiences the frame. The fabric keeps them one registry of data
instead of five bespoke switches.

## The model

A **TimeHold** is `{ id, scale, kind?, duration?, actors?, hud? }`:

- **scale** — 0 stops time, `(0,1)` is slow-motion, 1 is inert, `>1`
  accelerates (world scope).
- **actors** (an `ActorTimeFilter`: `exceptIds` / `exceptOwnedBy` /
  `exceptTeam` / `onlyTeam`) — omit it and the hold is **world-scoped**: the
  fold multiplies into `World.update`'s dt at the top, so *everything*
  freezes with zero drift (nothing below `beginFrame` runs at scale 0). Set
  it and only matching bodies bend, each on its own clock.
- **duration** — RAW seconds (see clock rules); omit for held-until-`release`
  (what DOM surfaces use).
- **hud** — `{ tint, label }`, drawn by `Renderer.drawTimeflow`. Pure data.

Folding: world scale = product of world-scoped hold scales.
`actorScale(a)` = product of matching actor-scoped holds × every
`StatusDef.timeScale` the body carries. `scaleFor(a)` = both. Multiplicative,
so a dragged body inside a half-speed world runs at a quarter rate, and any
zero wins outright.

## The clock rules

Holds age on **raw frame seconds** (`Timeflow.age`), not world time — a
freeze must be able to expire out of the very clock it stopped. One
exception: while a `kind: 'menu'` hard hold (scale 0) is up, **nothing**
ages — the pause menu stops the universe, magic included.

Chrono **statuses** follow the same law: a status with `timeScale` burns its
`remaining` on unbent seconds — `Actor.updateTimers(dt, chronoDt)` while the
body still flows, `Actor.tickChronoStatuses(rawDt)` when it is fully held
(the world skips a held body's entire update; that method is the one thing
that still ticks). So stasis always lets go on schedule, and temporal drag
lasts its authored seconds rather than stretching itself.

## What a fully held body means

The per-actor loop in `World.update` skips the body wholesale: timers, DoTs,
regen, ES recharge, casting progress, dash, decay, lifespan. `updateAI`
returns before the brain runs. `applyInputs` drops the seat's intent (a
stasis'd hero neither moves nor casts — the DOM menus above stay live).
Projectiles fly on their **caster's** clock, so a held archer's arrows hang
mid-air and land when time resumes; the exempt caster's own volley flies
free. Scheduled repeat trains, sequence steps, follow-up payloads and
mid-air leaps hold with their owner (the leap hangs the body airborne).

Still live, by design (v1 contract, world-clocked): ground/aura/fog/zone
ticks, separation shoves, world-driven movers (migrants, looters, mounts),
and `world.time`-anchored AI flavor clocks (`zapAt`, `alertUntil`, …) on the
held body — they fire immediately after release. A held body remains
**targetable and damageable**: stasis is a statue you may study or shatter.
Make a protective stasis purely in data (`mods: [damageTaken …]` on the
status def).

## The doors in

1. **Menus / reward screens** — `TIME_CFG.surfaces` maps a surface id to a
   hold; `ui/panels.ts` calls `world.timeflow.holdSurface('menu:escape')` on
   open and `release(id)` on close (`hideAll()` sweeps every `menu`-kind
   hold as a belt). Adding a new pausing surface is one config entry + one
   open/close pair. Policy: `Timeflow.allowHold` is injected by `main.ts`
   (`adoptWorld`) as "this machine owns the one real sim and no live co-op
   peer shares it" — a shared world is never one player's to stop, and a
   peer joining mid-pause sweeps the hold (`onRemoteJoin`).
2. **Skills** — `SkillDef.chrono: ChronoSpec` (`{ scale, duration, exempt:
   'caster'|'pack'|'team'|'none', world?, hud? }`), resolved by
   `executeSkill → castChrono` into a hold id `chrono:<caster>:<skill>`
   (re-casts refresh). Duration rides `effectDuration`. Monsters use it
   through the same pipeline — an enemy time-stopper is one `ai:` field.
3. **Statuses** — `StatusDef.timeScale` (`stasis` 0, `temporal_drag` 0.5).
   Reachable from every status door: skill `effects`, the auto-generated
   `apply_stasis` stat family (procs, affixes, passives), fog-bank grants,
   ground effects, monster kits. `hardCC: true` on stasis keeps break-bar /
   CC interactions honest.
4. **Anything else** — `world.timeflow.hold({...})` from a script, an event
   overlay, a boss phase, the console. `World.castChrono` is the reusable
   bridge when a caster and a ChronoSpec are in hand.

## Content shipped on the fabric

- `time_stop` (player-droppable spell gem): 2.6 s world stop, `exempt:
  'pack'` — your minions walk with you; what you loose hangs and lands on
  resume.
- `stasis_lock` (spell gem, and the Abyssal Seer's new trick): a bolt that
  applies `stasis` (80%) and `temporal_drag` (always).
- Escape menu hard-pauses solo play; the vocation offer freezes the world
  while you weigh it (delete its `TIME_CFG.surfaces` entry to undo).

## QA notes

- Inert cost: no holds + no statuses ⇒ `beginFrame` returns 1, `actorScale`
  is two cheap checks — baselines stay byte-identical (verify with
  `npm run sim -- baseline check --suite smoke`).
- Determinism: the fabric reads only fed dt; no wall clock, no RNG.
- Console probe: `__game.world().timeflow.hold({ id: 'qa', scale: 0, actors:
  { exceptTeam: 'player' } })` freezes every enemy; `release('qa')` resumes.
  Menu probe: open Escape, sample `__game.world().time` twice — it must not
  advance; close, it must.
- Saves: holds are transient by design (a mid-freeze save resumes unfrozen;
  statuses follow the existing status-persistence rules).
