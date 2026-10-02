# The Agent

`src/agent/` is a mind behind a seat. `HeroAgent` implements the same
`PlayerInputSource` contract (`net/intent.ts`) a keyboard, a pad or a remote
peer implements, so the engine cannot tell it from a person. Every move and
press it makes goes through `World.applyInputs`; every cast takes the
player's path through `World.useSkill`, and every refusal it meets (cooldown,
cost, cast requirements, the field discipline, a sealed zone) is the
player's refusal.

It exists for two consumers today and is shaped for a third:

- **The director** (`docs/engine/director.md`) drives a staged hero through
  it for trailer and showcase footage.
- **Tests and tuning**: `explain()` reports how each bar slot was read and
  how the last autonomous pick scored it.
- **Future companions, mercenaries and enemy tactics**: perception and the
  decision layer never touch `PlayerInput`, so a body that is not a seat can
  reuse them behind its own hand.

## The three layers

| Layer | File | Reads | Writes |
| --- | --- | --- | --- |
| Percept | `perception.ts` | public world reads only: hostile bodies by `World.hostileTo`, the focus, clusters, `World.imminentThreatTo`, own vitals | `Percept` |
| Decision | `agent.ts` | the percept, the kit (`kit.ts`), the directive queue | an abstract `Intent` (`move`, `press`, `aim`) |
| Hand | `agent.ts` | the intent and each slot's cast mode | `PlayerInput` (`held`, `edge`, `aim`, movement) |

### The kit

`readKit(actor)` reads every bar slot through the live instance's own
resolvers (`instanceDelivery`, `instanceCastMode`, `instanceTargeting`), never
a hand list. Each slot becomes a `KitSlot`: a role (`strike`, `shot`, `area`,
`nova`, `summon`, `aura`, `buff`, `heal`, `move`, `construct`, `ultimate`), how
it is played (`tap`, `hold`, `charge`, `toggle`, `timing`), where it aims
(`foe`, `cluster`, `self`, `corpse`, `ally`, `travel`), its reach and area,
and flags for passives (triggers), reflex presses and thirst gates. A
damaging dash, leap, blink or carom reads as a `strike` aimed at a foe; an
empty one is movement.

### The decision

1. **Directives first.** A queue of scripted orders runs front to back:
   `move`, `cast`, `wait`, `fight` and `follow`. Aims are a point, a body by
   id, an offset from the agent, or a live read (`nearest`, `focus`,
   `cluster`, `self`, `facing`). A `cast` order waits until the slot is
   usable (`World.skillUsable` and `World.castReqRefusal`) before pressing,
   counts only presses the engine accepted, and gives up after a timeout.
2. **The temperament** takes over when the queue is empty: a utility pick
   scores every usable slot by role (`AgentProfile.weights`), extra targets
   in its area, upkeep (buffs and auras that have lapsed) and the profile's
   preferences. Unusable slots record why (`trigger`, `slot off`, `busy:…`).
3. **The dodge read** overrides movement when a telegraph will land on the
   agent (`imminentThreatTo` padded by `AGENT_CFG.threatPad`); profiles with
   `dodgeWithSkills` may spend a movement skill instead.

Stances (`close`, `band`, `hold`) decide where the agent stands relative to
its focus; whisker steering (`AGENT_CFG.whisker`) slides around obstacles.

### The hand

Each cast mode gets its real gesture: a tap is one edge, a hold keeps the
button down, a charge holds to full (`AGENT_CFG.chargeMax`, `perfectAt`), a
toggle presses once, and a timing skill presses again inside its window.
`holdPrimary` keeps a basic attack held between picks the way players do.

## Tuning

All numbers live in `src/data/agent.ts`: `AGENT_CFG` (pads, reaches, whisker
geometry, charge timing, flask threshold) and `AGENT_PROFILES` (`brawler`,
`skirmisher`, `caster`, `summoner`, `cinematic`). `AgentOptions` takes a
profile id, `'auto'` (read from the bar), or a full profile; `tune` overrides
single fields per agent (for example `{ dodge: false }`); `slots` limits what
the temperament may press; `rooted` keeps it still unless a directive moves
it.

## Extending

- A new role or play mode is a `KitSlot` reading plus a `score` branch; the
  hand learns the gesture once.
- A new consumer that is not a seat reuses `perceive` and the decision layer
  and supplies its own hand.
- Keep every read public. If the agent needs to know something a player
  could not see, the right fix is a readable cue in the game.
