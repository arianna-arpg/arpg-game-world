# Prepared payload cues

GT-021 · Implemented 2026-09-26; encounter acceptance pending.

Banked flask drinks appear as corked vessels beside the body and in their skill
slot. The first real wound opens them with an inward release gesture. Ammunition
appears as loaded/hollow chambers, and a successful manual reload closes a brief
loading gesture. Caroms leaves connected diamonds at its real anchors with a
shrinking preparation-window arc. Hanging Volley has incomplete arrow sockets;
the completed set fills them, points along the committed patrol route, and shows
the actual trigger radius at each live arrow. The HUD uses matching shapes.

The following floating captions are retired for these paths: `primed`, `loaded`,
payload `armed`, `arrow N/M`, `anchor N/M`, and the redundant restoration-stream
captions produced by primed releases. Ordinary restoration-stream captions are
tracked with feeding/drinking in GT-025. The separate borough-villager `armed!`
belongs to the siege/encounter audit, not to ammunition or placed payloads.

## Configurable contract

`SkillDef.payloadCues` maps `prime`, `ammo`, and `carom` to profile keys. Shared
profiles in `data/payloadCues.ts` select vessel/chamber/diamond/arrow geometry,
size, width, opacity, and loading/release combat-cue keys. Defaults follow the
mechanic; hanging arrows select the arrow profile. Unknown keys safely fall
back, including prototype-property names; `false` disables supplementary cues.
Functional ammunition pips remain available when a supplementary cue is off.

`PAYLOAD_CUE_CFG` owns clutter limits, spacing, marker size and boundary styling.
Bodies show at most three rows of six pieces; the HUD shows at most eight per
bank. Under those limits each piece is one payload. Larger modded ammunition
banks use proportional fill, including a partially filled piece, instead of
claiming that eight or more rounds always means a full bank. Profile colors
come from the attributed skill.

Manual/magazine ammunition gets body chambers by default, including ammunition
granted by a socketed support. Trickle, optional empowerment and stillness banks
keep their existing readouts by default; authors can opt them into a profile.
The active reload transition only occurs when a bank actually gains rounds.
Stillness-bank pours remain quiet. Banked drinks are already paid payloads;
their row shows stored drinks, not empty capacity or unspent flask charges.

## Truthful state and lifecycle

- `payloadCueRows` reads existing state without creating banks or advancing
  clocks. Dead bodies return no rows. Co-op `ActorW.payloadCues` mirrors the
  same host-derived bank count/cap/timer, material, readiness and world points
  for players, enemies and companions. Missing rows clear pooled client actors;
  point arrays are cloned rather than aliased to the incoming snapshot.
- `caromCapacity` shares the actual scoped bounce-modifier fold with the
  placement gate. A regular route disappears at the same expired window that
  the next press would discard. The completing press launches the original
  patrol projectiles and empties its preparation state.
- Hanging-set readiness comes from the committed pending ambush, not from
  simply reaching a decorative count. Trigger circles use its stored radius;
  live arrow positions supply their centers. Target body overlap at the
  boundary counts exactly as before. These circles indicate arming proximity,
  not a damage area. Actual projectiles remain the attack.
- An already-armed set retains its committed count and geometry if investment
  changes or the skill is unequipped/reconfigured. It is still mechanically
  live. Broken arrows, expiry, actual release or owner death remove the read.
  No gameplay timer, cost, damage, proc or attribution rule changes.
- Placement visuals draw independently of the owner's body, so moving offscreen
  or concealing the owner cannot erase deployed hazards. Point-level tier and
  building-story gates precede the ordinary sight-veil pass; hidden points do
  not create cross-floor route links. Body cues inherit normal body visibility.
- Primed drinks release on the original hit/DoT wound seams, retaining all paid
  charges, healing, buffs and follow-ups. An unslotted drink dissolves silently.
  One release gesture covers each drink; its component streams do not add
  redundant captions. Ordinary unprimed restoration remains tracked in GT-025.

## Verification and remaining acceptance

Run `npm run check`, `npm run probe -- payloadcues`, the `pours` and `flasktrees`
probes, the smoke simulation suite and a production build. The dedicated probe
checks 50 cases across real payment/refusal, multi-drink release, reload/no-op,
socket-granted ammunition, capacity investment, anchor windows, triggered/manual
ambushes, boundary overlap, broken/expired sets, unequipped or reconfigured live
sets, co-op joins/clears, opt-out/fallback and painter state/visibility.

After the dedicated probe exports its local catalog and a build completes, run:

```sh
node_modules/.bin/electron balance/payload-cues-ui.cjs
```

This hidden renderer harness uses disposable saves/profile and captures paid
preparation, arming, reload, wound release and expiry at 1500×1000 and 1000×720
on dark/bright terrain. It checks exact trigger-circle radii, changing world/HUD
state, cleanup and absence of covered captions. Captures and logs are ignored
under `balance/reports/payload-*`.

Crowded-combat comprehension and clutter comfort still need encounter playtests,
especially with several overlapping arrow sets. GT-023 consumed proc/rider
payloads are the next family in the [migration backlog](gameplay-text-audit.md).
