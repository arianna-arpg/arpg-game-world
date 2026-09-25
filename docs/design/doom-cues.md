# Doom: bank, fuse and rupture

GT-022's Doom slice is implemented; encounter acceptance remains. The other
GT-022 events are now covered by [combat threat cues](combat-threat-cues.md).

A hooked iris surrounds any living actor carrying an armed `cullsAtLethal`
status. It tightens as the combined cull bank approaches **current life**;
healing loosens it. A separate arc fills with elapsed lifetime. Reapplying
Doom adds payload but retains the original fuse, so the two signals can move
independently. Neither predicts post-mitigation damage or guarantees death.

Broken ground arcs mark the actual rupture radius, including area modifiers.
The ground transform is captured before body animations, keeping the reach
anchored to the same origin and scale as the hit test. A receiver's body can
overlap that boundary and be hit. Existing team, story and immunity gates
still decide who takes damage.

Early threshold detonation, natural expiry and death use the same inward
pinch followed by an outward tear. Damage resolves immediately; this short
animation is its afterimage, not an extra windup. The original caster keeps
damage/kill credit. The old `DOOM!` emitter is removed, and Doom no longer
gets the unrelated generic blessing wink on application.

## Authoring and shared behavior

- `data/armedCues.ts` owns teeth, scale, line weight, opacity, rotation,
  footprint and release-profile selection. `data/combatCues.ts` owns the
  `doom_rupture` lifetime, shape, pieces, travel and width.
- `StatusDef.armedCue` selects a profile; any `cullsAtLethal` status inherits
  `doom` without a status-name branch. Unknown names fall back safely;
  `false` opts out of the inherited body cue and retains the legacy rupture
  flash. Explicit status landing voices retain priority.
- `engine/armedCues.ts` derives bank/current-life, original fuse progress and
  radius. Matching profile/color/radius groups share geometry, using the
  most advanced fuse. Even a visually opted-out cull bank contributes to the
  real shared lethal threshold. Impale remains its own metal-spike family.
- `statusRuptureRadius` is shared by the cue and rupture hit test. The
  presentation cannot alter the bank, fuse, defenses, damage or attribution.
- `render/vis/armedCueLayer.ts` draws on players, monsters and companions
  through the common actor path, respecting existing visibility gates. The
  cue clears on consumption, cleanse, expiry, death and downing. Existing
  player screen-edge curse hooks remain independent and obey comfort settings.
- Snapshots carry only derived presentation values for all affected actors.
  Remote rendering never needs raw bank damage or caster authority. Rupture
  uses the existing replicated combat-flash path; joins see ongoing state,
  and subsequent snapshots clear it when removed.

## Verification

`npm run probe -- doomcues` covers actual Word of Doom casts/reapplication,
scaled radius/fuse, the shared threshold, healing, safe profile fallback,
opt-out, original caster credit, actual area boundaries, expiry/death versus
cleanse/downing, co-op player/enemy state and rupture, and canvas geometry.
The retired caption is checked both here and in `probe_statusvoice.ts`.

After `npm run build`, run `npx electron balance/doom-cues-ui.cjs`. The hidden
real-renderer harness uses disposable saves and captures low/high bank,
late fuse, mixed Impale/burn/Doom, dark/bright terrain, compact viewport,
cleanse and real threshold detonation. It checks the ground transform,
changed pixels, restored clean pixels and both rupture phases. Reports and
captures live under ignored `balance/reports/doom-*`.

Also run `npm run check`, the `combatcues`, `afflictioncues`, `statusvoice`
and `cleanwake` probes, and the simulation smoke suite. Dense encounter
recognition and long-session comfort still need player acceptance before
this slice is marked Done.
