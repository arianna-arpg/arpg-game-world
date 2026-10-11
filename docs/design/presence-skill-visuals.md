# Storm, summon and construct identities

The isolated `codex/skill-visual-identity` branch covers all 33 native storms,
61 summons and 45 constructs. `src/data/skillPresenceVisuals.ts` authors each
source's silhouette, material marks, count and motion independently of tint.
`src/render/vis/skillPresenceVoice.ts` draws 24 silhouette families through the
existing effect-voice registry. The creature/construct anatomy remains intact.

| Examples | Shape and motion |
| --- | --- |
| Arrowfall / Rain of Knives | Fletched shafts descend; five blade marks versus a three-part split volley |
| Meteor Storm / Brimstone Volley | Faceted falling mass, flame trail versus split stone fragments |
| Stormcall / Sparklattice | Branched thunderstroke with arc marks versus four coiling rune anchors |
| Vent Call / The Boil | Rising vent lips versus six coiling steam mouths, clipped to eligible ground |
| Skeletons / Raise Dead | Assembling ribs with bone, blade, rune or blood marks |
| Major golems | Shouldered stone mass, with separately counted stone, bone, flame, ice and blood detail |
| Bats / Falcon / Crows | Wing fans with split blood, falling blades or coiling bone marks |
| Wraiths / spirits | Folded wisp silhouette with distinct material, count and movement |
| Eggs / disgorged creatures | Cracked shell versus opposing toothed jaws |
| Totems / pylons | Split pedestal and suspended cap; flame rise, spark coil, or rune split |
| Ballista / Mirage Archer | Tensioned bow frame, blade versus rising soul marks |
| Relics / Tolling Bell | Bell body and swinging clapper, with shield, healing, ray or chime signatures |
| Walls / cages | Crenellated assembly, with bone, stone, flesh, ice or rune material |

## Event ownership

Storm placements show a source silhouette within each actual strike footprint.
Gathering follows `delay / delay0`; release-armed storms hold a stable signature
until the engine releases them and supplies their real per-strike countdown.
There is no invented global storm timer. Native impacts and supported pulse
afterlives retain the source key. The final portion of an impact sheds into
remnants, so an instantaneous strike does not layer a second expiration flash
onto its hit. Cancelled warnings and retired pulse fields dissolve once.

Arrival replaces the old generic spawn flash only after `spawnMinion` or
`spawnConstruct` successfully adds the body. Failed reservations produce none;
cap eviction quietly retires the actual old body. Corpse summons, waves and pod
offspring naturally use the shared birth seam when their bodies really appear.
Refreshed echo riders do not fake a second birth.

A compact activation accent answers a completed payload, a real construct
damage pulse, an aura pulse, or a used pad/gate. Multiple payloads within 0.12s
share one accent. Its radius is body-local, never the attack range. Native
projectile, beam, melee, healing and aura geometry still owns the payload.
Passive furniture has no decorative attack cycle. A small static foot signature
keeps bodies with shared anatomy attributable between events.

Retirement cues occur after the kill path accepts an actual death. Natural
expiry and silent withdrawal unbind; combat death breaks the signature into
fragments. Immortality, downing and Undying Loyalty intercept before that cue.
Natural expiry retains its own ending even when existing on-death gameplay
riders fire. Pods still hatch and demolition effects still resolve normally.

No damage, cost, reservation, targeting, cadence, birth count, expiry rule or
random-number consumption changes. Decorative body cues yield combat-light
slots; damaging storm pulses retain their lights.

## Footprints and co-op

Hazard signatures clip to their actual figure and safe center. Ground-bound
storm warnings retain the existing per-cell roil; additional signatures and
impact flashes clip to the same eligible cells on the correct story. Dry shore
receives no impact ink. Host and peer draw the same terrain-qualified flash.
Existing visibility/fog gates continue to own body and effect visibility.

Optional `ActorW.presenceBadge` carries copied source ID and resolved cosmetic
color. The client never rebuilds a minion skill kit. Missing fields clear old
badges. Existing `FlashW.fx` carries moment identity and optional `onGround`
copies terrain kinds; field DTOs now include actual release-armed state.
Unknown sources and voices retain the generic fallback. No new save format.

## Verification

- `npm run check`, `npm run build`, `npm run sim -- run --suite smoke`.
- `npm run probe -- presencevisuals`: full census, tint-independent bounded
  geometry, same-seed unpainted controls for all 139 executions and impacts,
  lifecycle/undying/reservation/cap/hatch/pulse cases and copied co-op state.
- Affected regressions: skillflights, selfvisuals, effectvoice, cosmetics,
  payloadcues, companioncues, companioninheritance, summonfill, clutch, cistern,
  scaldkit and supportfabric. Run each probe filter separately.
- Hidden `balance/presence-visuals-ui.cjs` after the probe and build: production
  renderer checks all four moments in one shared color, figure/safe-center
  clipping, wet/dry and floor separation, eight native lifecycles and co-op.
  Disposable profiles/saves, screenshots and the standalone interactive study
  go in ignored `balance/reports/skill-visuals/`.

The study supports shared color, hidden names, bright ground, slow motion,
separate endings and scrubbing. It enlarges source signatures and normalizes
time; it does not claim that passive objects periodically attack. Distinct
pixel signatures guard against accidental duplication. Recognition among close
relatives in crowded play remains a player-review task.

Keep this visual-only commit separate from content parity work. Transfer the
visual series onto seamless with its current integration checks; do not merge
the content-divergent branches solely to carry the art.
