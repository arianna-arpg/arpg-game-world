# Stationary arena bosses

Three optional regional encounters make the chamber part of the creature's
attack grammar. They use the existing boss objective, sidezone/lair placement,
skill damage, composite parts, scripted phases, and ordinary lair rewards.
They do not depend on the World Boss package's ignition rolls.

## The fights

| Encounter | Where doors appear | What the player reads |
|---|---|---|
| Ossuary Organ | Desert and karst surface/caves; begins above zone level 10, full chance at 13 | Bass and treble alternate across opposite halves of the court. Each hittable pipe silences its own patterns, deals 8% root life on breaking, and adds 10% increased damage taken. Below 40% life the surviving pipes sound together; the middle approach remains open. |
| Cinder Crucible | Volcanic surface/caves; begins above 16, full chance at 19 | Five files of blasts resolve in order, then reverse. Cross behind the impacts or stand between ranks. After both sweeps, a three-second opening grants 25% increased damage taken. Below 40%, the sweep cycle shortens while keeping the same warning duration and recovery opening. |
| Mire Heart | Marsh surface/caves; begins above 13, full chance at 16 | The outer banks seep, then the central channel. Each field warns for 1.5 seconds and lasts three seconds, with dry approaches elsewhere. The drained phase grants 30% increased damage taken. Below 40%, the cycle accelerates but never overlaps the two lingering patterns. |

All roots remain stationary and face south. Their aimed ground skills punish
standing still without moving the warning after placement. All parts are
ordinary targetable actors. There are no mandatory add wards, unconditional
invulnerability phases, or additional reward currencies in this batch.

The lair presence envelope reaches full weight three levels after the row's
`level`; it is absent at or below that value. Surface and cave depths 1–2
qualify; depth 3 has half weight, depth 4+ none. Base chances are 18%, 22%, and
20% respectively per qualifying zone. `noDeeper` prevents recursive doors.

## Reusable authoring surfaces

- `src/data/arenaBosses.ts`: monster bodies, seven ordinary skill definitions,
  assembled looks, named point patterns, and phase timing. Damage types also
  supply skill tags so elemental modifiers retain their normal scope.
- `src/data/arenaBossHabitats.ts`: regional eligibility, entrance dressing,
  sidezone mint, objective and retry policy. The standard `special` zone flag
  excludes ambient enemies, faction contests, and unrelated event overlays.
- `src/data/arenaBossTilesets.ts`: chamber sizes/palettes and entrance visuals.
- `src/engine/arenaCourt.ts`: registered `arena_court` layout. `courtMargin`
  and normalized `courtSeat` are layout parameters. It authors the existing
  boss-seat output, reserves the combat floor, and connects every portal.
- `MonsterDef.spawnFacing` with `turnSpeed: 0`: machinery can hold a fixed
  orientation while ordinary ground skills aim at targets. Other creatures
  retain their existing spawn and turning behavior.

### Attack patterns

`AIAction.do: 'attackPattern'` is a typed sibling of `ring` and `nova`.
The action names an ordinary skill, origin (`anchor`, `self`, or `target`),
bearing (radians, `actor`, or `target`), and `AttackPattern`:

```ts
{
  points: [{ x: 180, y: -90 }, { x: 180, y: 90, after: 0.4 }],
  radius: 48,
  delay: 1.4,
  linger: 0,
  tickInterval: 1,
}
```

Offsets are local: +x forward, +y across. Origin and bearing are sampled once
when all warnings are placed. `after` delays individual impacts; there is no
hidden tracking. The pure `attackPatternPoints` resolver is shared with tests.
Marks outside the arena or on unwalkable cells are omitted, never snapped into
a safe gap. The authored examples fit completely on their chamber floor.

The normal zone damage loop resolves hits and status/effect payloads, with the
caster and leveled skill instance retained. Existing team/hostility rules,
damage scaling, kill credit, rendering, and network zone replication apply.
As with existing ring/nova choreography, phase clocks schedule these attacks
directly; they do not consume ordinary skill cooldowns or mana. The separately
aimed kit spells use the ordinary cast pipeline.

Source-maintained pattern fields expire when their caster dies or the skill
enters that caster's part-break ban set. This covers warnings and lingering
fields, and affects neither other casters nor existing ring/nova fields.
No fixed-point limit, boss-id switch, or parallel damage engine is introduced.

### Attempt lifecycle

`Objective` boss rows may opt into `arenaBossRetry: 'restart'`. An unfinished
boss then stays outside partial population memory, so leaving/reloading starts
a complete fresh attempt. This deliberately avoids restoring a wounded root
with regrown, already-paid breakable parts. It does not change other bosses'
memory rules. Completed fights use normal cleared-zone memory and refresh
policy; reward payment stays in the existing kill/objective paths.

New optional fields and new content require no save-compatibility reset.

## Verification and remaining tuning

`npm run probe -- arenabosses` checks deterministic mints, regional level
gates, walkable seats and every pattern point, real player clearance, visible
proximity wake, immobility/heading, both pipes and bans, live phase cycles,
damage timing/dodging, source cancellation, completion, return, cleared
re-entry, and a fresh attempt after abandonment. The probe is enrolled in the
normal fast regression gate.

`npm run genqa -- --seeds 3`, `npm run sim -- run --suite smoke`, and
`npm run check` cover generation, existing combat, and all type-check targets.
After building, `npx electron balance/arena-bosses-ui.cjs` captures the three
fights in a hidden client with isolated saves/profile, under `balance/reports`.

These are first-pass encounter numbers. Human playtests should measure time to
kill and warning readability across melee, ranged, damage-over-time, and minion
builds before treating the difficulty as final. Future world bosses can reuse
the pattern grammar and fixed anatomy without inheriting these venues or
reward values.
