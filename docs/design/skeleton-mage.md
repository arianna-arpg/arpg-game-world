# Skeleton Mage: rites and conclaves

Summon Skeleton Mage keeps fifteen nodes, two exclusive trunks, the four-point
budget, and the existing stable node IDs. Grave Studies remains a four-rank
damage/haste passive. The unallocated skill still summons two random mages,
up to four.

## Lich Ascendant

The initial summon has a 2.75-second base cast time and raises exactly one Lich.
Summon-cap investment becomes bounded damage rather than additional Liches:
12% more damage per extra slot, up to 60%. The trunk also grants 120% more
minion damage and 40% more mana cost.

The living skill slot becomes **Command Grand Rite**: a 0.25-second, eight-mana
command. It directs the existing Lich without replacing or healing it. The
Lich prepares a fire eruption with an eight-second base cooldown and also uses
the rite autonomously. The command observes that same recovery clock.

- **Ritual Dominion** leaves a six-second field. Primary hits inside kindle
  flares with a 0.5-second minimum interval.
- **Winter Crown** adds a freezing outer band and a damaging interior blizzard.
  The hollow boundary is a generic ground-delivery property, separate from
  the existing inward-filling ground mechanic.
- **Storm Crown** grants 50% increased rite cooldown recovery. A new rite
  ruptures the previous site with lightning and consumes its old fields.
- **Bound Phylactery** combines reconstruction and Soul Tithe. Combat death
  leaves a targetable anchor with 35% of the Lich's maximum life. It rebuilds
  after eight seconds, with a 30-second rearm retained across reconstruction
  and anchor destruction. Its occupied slot cannot be replaced.
  Nearby combat deaths and intentional sacrifices of other owned minions bank
  up to eight souls, each expiring independently after twelve seconds.
  Commanded rites consume them for 8% more damage each; unspent souls shorten
  reconstruction by 0.5 seconds each. Expiry, dismissal, replacement and
  phylactery deaths supply no souls.
- **Ossuary Court** carries its supported ally aura on the Lich and on its
  rebuilding phylactery.
- **Sovereign's Echo** replaces the old Soul Tithe leaf. The Lich echoes an
  eligible original-owner spell every 1.5 seconds at 65% power. It copies the
  spell's level, tree and compatible supports, using the Lich's combat stats.
  Its delivery/tag/target eligibility is authored data. The default permits
  offensive projectiles, cones/beams, novas, ground spells, storms and enemy
  targeted spells. Summons, movement, auras and corpse-fueled casts are outside
  that default. Echoes keep separate runtime state and cannot echo or relay. Repeated echoes
  share one ability identity per Lich, so the copied spell's live limits remain
  binding; retiring the owner spell retires its captured copies too.

## Grave Conclave

The tree offers saved, authoritative multi-select school buttons. At least one
school remains selected; new summons favor the least represented allowed
school. Changing schools uses the existing equipment-change discipline and
silently retires this instance's current bodies and captured effects.

- **Spell Relay** invites one other nearby mage to reply with its own primary
  at 45% power. Recipients have a two-second cooldown. Shared cast provenance
  prevents multihit, split and repeated shots from multiplying invitations.
- **Concordant Souls** wards a same-school pair for 12% of each mage's maximum
  life for four seconds. Each mage holds one such ward.
- **Discordant Souls** creates a burst combining the actual participants'
  damage types. No element-pair reaction table is required.
- **Forbidden Lessons** teaches the selected school its own signature:
  Ignite (5s), Greater Ice Spear (6s), Chain Lightning (5s), Essence Drain (6s).
  Ordinary primary spells remain available between signatures.
- **Lingering Script** leaves one supported elemental inscription per mage,
  lasting three seconds; a signature use creates at most one.
- **Communal Siphon** converts 15% of actual signature damage into recovery
  for the most injured nearby Conclave member. Each caster is limited to
  8% of its maximum life per second, with at most one second of stored credit.
  Attributed signature ailments participate; field damage and relay copies
  do not.

## Implementation contracts

Authored tree/tuning: `src/data/skeletonMageTree.ts`.
Ordinary payload skills: `src/data/skeletonMageSkills.ts`, plus the existing
school spells in `necromancerSkills.ts`.
Generic contracts and lifecycle: `src/engine/summonArtsSpec.ts` and
`summonArts.ts`. Runtime behavior never checks a tree node name or Mage skill ID.

AI kits contain only autonomous arts. Auxiliary payloads have a separate kit,
a component census and independent support-fit checks. Resonance remains the
boarding requirement for summon supports. Unselected schools are excluded from
the census; mixed bursts resolve tags from their participating schools.
Owner-spell supports and forwarded summon supports never duplicate a gem.
Live support changes refresh auxiliary kits too.

Durable clocks, soul lifetimes, anchors and per-body state live on actors.
Ephemeral cast provenance travels with projectiles and shards. Quiet tree
retirement removes captured effects as well as living bodies; it never pays
death rewards. Authoritative school intents are validated and choices are
sanitized during save reconstruction. Co-op clients receive command readiness.
Mobile mages retain identity and recovery across zone crossings; ritual sites
and stationary phylacteries stay behind. Leaving an anchor cancels reconstruction
without resetting its rearm.

Verification: `npm run check`; `npm run probe -- skeletonmage`;
Archer, nested Necromancer, support, flight/field and visual probes; simulation
smoke; after build, `npx electron balance/skeleton-mage-ui.cjs`.
