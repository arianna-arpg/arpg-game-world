# The Reflex Fabric — presses that pierce commitment

**The rule this fabric exists for:** a flask must never be locked out.
Mid-cast, mid-dash, mid-swing-recovery — the drink answers. And a use is a
use: if the press would be MOOT (a brimming pool), it refuses outright and
eats nothing.

Everything is data. There is no flask-only machinery anywhere in the lane.

## The three levers

### 1. Reflex (use-during-commitment)

A **reflex** is an instant press that goes *through* the user's own
commitment and resolves alongside it — the cast keeps casting, the feet
keep dashing.

- `SkillDef.reflex: true` — innate (the flasks, `swig`).
- The **`reflex` stat** (> 0 for the skill's context) — the from-outside
  grant: support mods (`muscle_memory`), passives, statuses; tag-scope it
  ("flask skills are Reflexes" is one modifier).
- `REFLEX_CFG` (engine/skills.ts) — the policy: which commitment states
  stay open (`during`, keyed by CastMode + `dash`/`useLock`/`stun`), and
  the pacing between pierced presses (`lock`). Chosen commitments default
  OPEN (a future cast mode admits the wrist unless closed); suffered ones
  (stun) default CLOSED.

Qualification is `Actor.isReflex`: plain instant casts only (`useTime` ≈ 0,
no channel/concentration/hold mode of its own) — two bodies of intent don't
fit one spine.

**What a pierced press never does** (world.ts `useSkill`, the `pierced`
marker): turn the body (`facing`), restamp guided aim (`aimPos`), convert
into anything that needs a bar (totem plant, overcharge, strike-timing
promotion), or stamp `useLock` recovery — a reflex paces on its own
`reflexLock` (REFLEX_CFG.lock) so a held key drinks at a cadence and the
running action is never lengthened. Cooldowns, costs, gates and
`forbidsTags` CC all still apply: a reflex is *responsive*, not *free*.

### 2. Thirst (the moot-drink refusal)

`GateSpec.missing` — the gate is met only when the pool is missing at least
`amount` (default 1) or `pct` of its maximum, whichever is larger. On the
ordinary gates fabric, so the HUD greys, the press refuses (with the gate's
own `note` — "brimming"), the AI agrees, and **the cost is never paid**.

- `life_flask` / `mana_flask`: `missing: { kind: 'life' | 'mana' }`.
- `catalyst_flask`: **no gate on purpose** — its high is never moot; the
  gulp is the drinker's judgment. The gate is per-def data, not a
  flask-family hardcode.
- `swig` (the monsters' pocket brew): `pct: 0.2` — one spec fits every
  body size.
- The **`thirstless` stat** (> 0) waives thirst gates per-skill — the
  drink-for-the-rider lane (`libation` grants it; any passive/status can).

### 3. Quaffing (the pour's public face)

Every flask wears the mute `quaffing` buff for its pour. "While a flask
effect is running" is therefore one hook away for ANY content, engine
untouched:

- gate on it: `gate: { buff: 'quaffing' }` (a skill usable only mid-drink);
- proc on it: trigger `'buffGain'` filtered to `quaffing` (on-drink procs);
- mod on it: passives keyed to the buff's presence.

## The socket wing (data/supports.ts)

`muscle_memory` (reflex for any non-flask instant), `libation`
(thirstless + richer pours), `acrid_draught` (drinks fling `acrid_splash`
at enemies — followUp cargo), `shared_draught` (drinks speak `benediction`
— the existing group heal as payload), `chaser` (drinks kick a tempo
surge). All ride existing seams: skill-scoped mods and `followUp`.

## The terrain wing

`spring_pool` wells resource orbs up on a beat (the `orb_spring`
DoodadEffect — `orbKind` names any ORB_DEFS row; omitted it breathes
life/mana alternately; only wells while a drinker stands near). Orbs feed
pours, fount sips, and orbPickup procs through the one orb seam. The
apothecary kit (`alembic` — brittle glass, spills orbs when smashed —
`herb_rack`, `cauldron`) composes as the `herbalists_croft` formation.

## Invariants

- A reflex press mid-cast must not clobber `Actor.casting`, jerk facing, or
  extend any running clock.
- A thirst-gated press at a brimming pool must consume NOTHING (no sip, no
  cooldown, no mana) — refusal happens before payment, in `useSkill`'s gate
  check and mirrored in `canUse`.
- Monsters and minions ride the identical lanes (`swig` on the bruiser and
  butcher) — one pipeline, no player-only carve-outs.
