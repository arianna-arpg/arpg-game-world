# Native follow-up parity with main

This pass carries three newer main commits through
`a2fa42917262e9229140b6364b6d5e461b32f50e`: incidental minion prey selection,
Charge's grounded wake, and life/mana orb generation cadence with depleted
resource assistance. The prior content pin was
`dc56030f3594533fec8712d55977d17f5bd03d1b`.

The shared AI keeps harmless ambient prey as a close-range fallback near its
owner. Actual threats outrank incidental prey, a fleeing critter loses its
cached target before the next rescan, and an explicitly pinned assault still
obeys the player. The retained area continues to provide the real local AI
host and physical actor census.

Charge uses the exact main grounded wake profile and painter. It leaves low
skid lines and dust ticks without changing collision, movement distance or
leap height. The movement regression includes a short seven-pixel travel beat.

The native hit owner calls the same main `orbHitChance` helper with its actual
caster and campaign time. Life and mana attempts have separate per-actor
clocks; failed rolls consume their interval. A skill swap, stat rebuild or
physical move to another retained area does not issue another attempt. Proc
hits leave the next eligible top-level opportunity intact. Actual destination
orb stores receive the reward, while the source store remains untouched.

Verification includes the unchanged main minion, orb and movement courses,
actual retained minion AI and cross-area orb courses under World-driver
refusal, all four type checks and simulation smoke. Historical source
projection and the Charge browser visual course are separate acceptance gates;
source census enrollment alone does not mean every course executed.

The combined main/host successor preserves the accepted dedicated Shards
runtime and applies only the two shared World additions from this content
pass. Every other new main runtime file is copied exactly. Its finite source
gate recovers both complete parents, preserves earlier archive bytes and
keeps original reader bodies intact. Gameplay runs against the actual combined
runtime; source recovery is limited to explicit historical read boundaries.
Server performance, private quest instance namespaces, generated entrances
and bounded/open terrain remain separate work.
