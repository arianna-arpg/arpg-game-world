# The Boss Bar — who owns the marquee

**The rule:** the top-center health bar belongs to AUTHORED boss fights,
live ones — never to whatever elite happens to carry a fat bounty, and
never to a boss the player hasn't met yet. Everything overhead (mini life
bar, elite ring, crown, cast bar) already tells the ordinary story; the
marquee is reserved for the fights that are ABOUT one name.

## The policy (one read, three consumers)

`World.bossBarInfo(a)` is the single source: the host renderer draws from
it, the co-op snapshot ships it verbatim (`ActorW.bb` → `Actor.netBossBar`
— clients have no brain to derive pips from, and the policy must not
fork), and anything future that wants "is this a marquee fight" asks it.
Never re-derive the policy elsewhere.

Non-null iff ALL of:

1. **Authored**: `MonsterDef.bossBar ?? MonsterDef.boss` — the def says
   this is a boss fight. `bossBar` overrides in either direction: `true`
   gives a spectacle elite the full bar WITHOUT the boss classification
   (loot/bestiary/domination reads untouched); `false` keeps a technical
   boss off the marquee. Raw `xpValue` no longer lights anything — a
   warband warlord's or hell marshal's 120-xp raise is a bounty, not a
   marquee (they keep the champion ring and overhead bars).
2. **Live**: first blood (the `grudgeMark` stamp resolveHit already
   writes) or a hero inside `BOSS_BAR_CFG.senseRange` — then LATCHED on
   the body (`Actor.bossBarLive`) so the bar never flickers at the range
   boundary. A phased boss idling across the zone shows nothing until the
   fight is real.

## The pip row

Pips ride the same read: an HP-ladder brain (`brain.phases`) FILLS
`phases.length + 1` pips one-way as thresholds descend (`aiPhaseIdx`); a
script FSM (`brain.script`) HIGHLIGHTS the current phase (scripts loop —
progress is a position, not a count). `pips: 0` draws the bar bare — a
single-phase authored boss still owns the marquee (the hell lords, the
package capstans); the pips are the PHASE indicator, not the bar's gate.
Co-op clients now render pips too (they ride the wire).

## Tuning

- `BOSS_BAR_CFG.senseRange` (engine/world.ts) — how close a hero wakes the
  bar before first blood.
- Per-def: `boss: true` (the ordinary lane) / `bossBar: true | false` (the
  override lane, data/monsters.ts).
- The WARDED read (untargetable boss → grey bar + suffix) is unchanged.
