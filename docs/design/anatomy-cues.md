# Weakpoints and breakable anatomy

GT-024 replaces `spot shattered!`, `SUNDERED`, `TORN`, `SCALE TORN` and
`COIL TORN` combat captions with state-driven anatomy and health displays.
Implementation complete; encounter playtesting is still required.

## Three distinct reads

- **Health-window weakpoints:** a pink seam on the affected body and a hatched
  interval between two teeth on its overhead/boss life bar. The interval uses
  the exact `ActiveStatus.window.lo/hi` stamped at application, even at full
  health. While current life is inside it, the seam opens and the teeth brighten.
  Driving life below its floor retires the status and fractures the mark.
  Healing above it closes the seam without moving the interval. Refreshes keep
  the original boundaries. This is a health condition, not a directional hitbox.
  The player's life orb shows the same interval on both sides of its rim, using
  its vertical fill axis; the existing number stays readable.
- **Detachable parts:** each actual part wears edge brackets when whole and
  branching cracks as its own health drains. Separate square meters above the
  root's overhead/boss bar show these independent pools. Real breaks remove
  the component, scatter fragments at its position and leave a small scar at
  its attachment. That component's empty meter splits. Meters keep attachment
  order across breaks; root health still displays only root health.
- **Wounded segments:** cracks grow on the struck segment using its actual
  remaining wound pool. A tear retains a brighter scar and the existing
  reduced body/hit radius. Separate pointed meters track segments in head-to-tail
  order, including long tails. Boss bars show the whole chain; overhead chains
  appear once a wound exists. Parts and segments never masquerade as intervals
  of the root's health pool. Temporary poise breaks retain their bronze sliver.

## Authoring

`src/data/anatomyCues.ts` owns materials, line weights, overhead minimum width,
body mark density, meter spacing and scar budget. `weakness`, `armor` and
`flesh` profiles supply color, highlight, body scale and shared break-flash style.
The flashes themselves use `data/combatCues.ts`, so no creature/skill painter or
new asset is needed. Vhorun explicitly selects armor; the coil matriarch selects
flesh. Defaults also cover future content and runtime grafts.

- `StatusDef.weakSpot.cue?: { profile?, color? } | false`
- `MonsterPartDef.breakCue?: { profile?, color? } | false`
- `WormWoundSpec.cue?: { profile?, color? } | false`

Omission inherits a material; unknown profiles fall back safely. `false` disables
presentation only. `WormWoundSpec.text` remains accepted legacy metadata and is
silent. No random draws, predicted chances or fabricated countdowns are involved.

## State and damage contract

`engine/weakpoints.ts` shares live health-window semantics. Hit mitigation
(including passive-block previews) and DoT read the maximum active bonus at the
moment of damage, preserving MORE multiplication and overlap-max behavior.
This replaces the stale per-update `weakspot` stat source: same-frame hits,
healing and the expiry of a stronger overlapping mark now agree with the visual.
The pure damage read never modifies statuses, stats, resources or randomness.

World updates retire spent windows; lethal crossings also leave a world flash.
Expiry, cleanses and rejected status applications create no false shatter.
Part break damage, modifiers, skill bans, kill credit and segment retaliation
keep their existing funnels. Quiet graft expiry and root death do not record
false part breaks. Regrafting at the same attachment covers the old scar.
Scars are bounded to 32 attachment sites per actor life; all live part/segment
pools remain represented. Rendering does not change contact geometry.

`engine/anatomyCues.ts` derives one readout for bodies and UI. Host snapshots
deep-copy resolved windows, part pools/scars and indexed segment pools for every
actor kind; clients need neither status windows nor live part links. Segment
marks follow the client's interpolated segment positions. Empty snapshots clear
old cues. Concealed/burrowed and covered-storey tails obey the head's visibility
gates, and normal body cues inherit its fade and pose.

## Verification and encounter acceptance

Run `npm run check`, `npm run probe -- anatomycues`, the anatomy, segments,
ironbell, bondstartertrees and bastionstartertrees probes, and the smoke simulation.
After a build, run `electron balance/anatomy-cues-ui.cjs` for hidden screenshots
with disposable saves: full/active/spent windows, a real Iron Bell component
break and disarm, long-tail wounds, life-orb marks, compact/bright views and co-op.

In play, judge whether the marked interval is readable amid damage flashes;
whether the active seam invites attacking at the right health; whether independent
part meters remain distinguishable from poise; and whether missing anatomy and
the boss display make the lost component apparent without a caption. Tune shared
profiles after that pass instead of adding per-skill exceptions.
