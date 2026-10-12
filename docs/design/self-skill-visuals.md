# Self, mark and detonation identities

The isolated `codex/skill-visual-identity` branch covers the complete native
census: 106 self skills, Mark/Recall, Detonate Mines and Cold Snap. Explicit
profiles in `src/data/skillSelfVisuals.ts` pair fourteen silhouettes with
material, count and directional motion. Colors do not select geometry.

| Family / example | Shape and motion |
| --- | --- |
| Stone Skin / guards | Split plates draw together; held armor locks without a looping pulse |
| Stealth / Cloak / Invisibility | Different folded veils, blade/wisp/rune marks, and snap/twist/rise motion |
| War Cry / commands | A directional horn opens into an individually counted fan |
| Flasks | A vial tips; blood, runes, sparks, stone and petals distinguish the drinks |
| Surgewind | A five-part wind fan coils inward during the actual brim fill and opens on release |
| Time Dilation / Red Hour | Counted clockwork teeth, with chime or blood material |
| Mark/Recall | Three-toothed doorway: inscribe, stable waiting rune, closing departure, reversed arrival |
| Cold Snap | Six ice marks around a cleaving crystal; burst spokes at the consumed projectile or self fallback |
| Detonation | A six-point flame crown breaks open when the pyre bank is spent |
| Detonate Mines | Fuse silhouette tightens on each real stagger timer; the mine's own payload retains its blast identity |
| Self-Destruct / Last Rite | Ripping bone claws versus an opening funerary book at each consumed minion |
| Iron Ward | Plated activation, quiet stored-power read, and a blade-edged burst only at real expiry |

Dark under-strokes preserve contrast on bright terrain. The 109 preparations
and 109 release configurations produce distinct shared-color pixel signatures.
That is an accidental-duplication guard, not a substitute for player recognition
testing between close relatives. The study provides shared tint and hidden names.

## Timing and ownership

`castingCueOf` adds optional skill identity to the existing host-resolved cue.
Ordinary casts read elapsed/total; charged and finite/brim channels keep the
existing completion resolver. Guards read the actual bash arm clock and shield
line. Non-bashing guards show a steady stance, not an invented attack. Endless
channels have no fake completion gauge; their actual delivery pulses speak.
Instant uses remain instant. Stun/death/downing/opt-out suppress preparation;
existing interruption, fizzle and ready events are preserved.

Most self release signatures occur in the resolved self-delivery branch,
after the primed-flask deferral. They identify the performed cast; healing
receipts, buff duration and target success remain their existing dedicated
surfaces. Slots that proxy another skill (Mimicry) naturally use the performed
skill's identity. Existing corpse/resource offerings retain their receipt
painters, including silent-consumption opt-outs, without duplicate self bursts.

Pool releases and Invocation have their own successful-execution hooks.
Minion/construct detonations paint at actual consumed bodies; empty destructive
orders emit no new successful-release cue. A stored mine preparation follows
its mine position and timer, cancels on death, and ends when the scheduled
payload executes. Recall uses the clamped teleport endpoint and clears the
persistent rune. No cast timing, damage, movement or resource rules change.

Iron Ward and damage-pool bank silhouettes are quiet body-local reads, distinct
from front-facing casting. Fill is actual stored/cap, not an expiry countdown or
a promise the cast can be afforded. Zero/spent/dead banks disappear. At most
two distinct pool banks plus Iron Ward paint. Iron Ward records cosmetic tint
when armed, so its delayed burst retains that tint.

Damaging flashes clip to their tested figure, including faced arcs and shaped
Cold Snap footprints. Supplemental fields inherit source material while native
field profiles keep priority. Decorative self flashes do not occupy combat
light slots. The existing tier, covered-floor and sight gates remain in place.

## Co-op and compatibility

The existing optional `FlashW.fx` carries activation, preparation and blast keys.
`CastW.castingCue` carries optional source identity without giving peers an
executable skill. `ActorW.selfBankCues` copies scalar resolved bank rows; missing
rows clear them. Peers never receive Iron Ward damage authority. Persistent
marks reuse the existing companion-cue packet and visibility/cleanup path.
Unknown effect keys keep the generic fallback and older casting cues keep their
universal corners. No generated assets are committed.

## Verification and review

- `npm run check`, `npm run build`, `npm run sim -- run --suite smoke`.
- Run single-name probes separately: `selfvisuals`, `castingcues`,
  `targetvisuals`, `movementvisuals`, `payloadcues`, `companioncues`,
  `defensecues`, `guard`, `effectvoice`.
- After the self probe and build:
  `node_modules/.bin/electron balance/self-visuals-ui.cjs`.

The self probe compares all 109 executions to a same-seed unpainted control,
preserving source IDs, actor outcomes, statuses, buffs, resources and RNG. It
also exercises real charge/interruption/co-op flows, instant Mark, empty and
staggered detonations, actual Cold Snap consumption, bank lifetime/copying and
wardrobe tints. Fixtures call the real delivery executor for census coverage;
native press/held behavior is tested separately for representative modes.

The hidden Electron harness uses production painters for 224 pixel checks,
eight native live casts, co-op render playback and interactive controls. It
generates `balance/reports/skill-visuals/self-study.html`, plus screenshots and
JSON reports. Studies enlarge the art and normalize time; instant casts skip
preparation, guards show their held stance, and indefinite channels show their
pulse signature without a completion animation.

Carry this isolated commit to seamless only after destination integration
checks. It does not merge divergent gameplay content into main.
