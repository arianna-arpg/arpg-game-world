# Body and defense cues

GT-003–006 replace the next shared gameplay-caption families. These cues
report the original mechanics; they add no damage, armor, protection, stun,
cooldown, resource, or recovery rule.

| Mechanic | Visible behavior | Authoring and actual state |
|---|---|---|
| Brief Winded | Knee dip and a slower exhale while slowed | `STATUS_DEFS.winded.bodyCue`; follows status presence, including duration overrides and early removal |
| Poise break | Bronze brace fragments separate; split brackets remain close to the body; the brace reassembles on rearm | `poiseJustBroke`, `poiseBroken`, `poiseJustRearmed`; distinct from a shell or equipped shield |
| Guard block/break/bash | Impact at the incoming direction; shield pieces kick out on depletion; shield motion pushes forward on bash | Existing block result, guard pool and bash execution; raised guard disappears when the actual stance ends |
| Shell impact/break/regrowth | Impact against the protected layer; pieces shed outward; separated cracked plates remain while broken; regrowth brings them inward and reform closes the gaps | Exact `shellGuard` pool, side, breathing arc, broken flag and reform fraction |

## Shell profiles and fallback

`src/data/defenseCues.ts` owns `DEFENSE_CUE_STYLES` and shared visual tuning.
The universal `shell` profile is a segmented translucent outer layer whose
plates visibly shed. It applies when `shellVisual` is absent or unknown.
There are no monster-ID branches or caption-matching rules in the painter.

The `spiral` profile uses curved shell fragments; Garden Snail and Tide
Whelk select it. The `carapace` profile uses fewer broad angular plates;
Shore Crab and Vent Crab select it. Other existing shells use the fallback.
The same profile controls persistent protection, impact, breaking pieces
and reconstruction, so a creature's shell does not change identity mid-event.

Select a profile in ordinary definition data:

```ts
shellGuard: {
  side: 'all', max: 60, regenDelay: 5, regenRate: 12,
  color: '#d8c098', shellVisual: 'spiral',
}
```

`shellVisual` also flows through aura shells, support-granted `shellGraft`
and attached `SummonShellSpec` bodies. Each pool supplies its own profile;
an attached shell does not overwrite the keeper's anatomical/aura shell.
A new profile can tune shape, fragment count, thickness, travel and the
impact/break/reform effect lifetimes. These effect lifetimes only govern
transient debris: persistent gaps follow the mechanic until it really reforms.

`src/engine/defenseCues.ts` creates immutable-at-emission event geometry on
the existing flash stream. `src/render/vis/defenseCueLayer.ts` draws the
registered voice and live state. Directional shells keep their uncovered
side open, including breathing coverage. No new hit radius is introduced.
The ordinary bash reach/arc flash continues to show its gameplay footprint.

`StatusDef.bodyCue` is a reusable persistent presentation surface: optional
lean plus ordinary facing-space `PartSpec` rows. Players, monsters and minions
all read it. Brief Winded disables its old generic sparkle; retreat exhaustion
and the stronger reserve vulnerability retain their separate cue families.

## Co-op and removal

All live shells now send their pool and profile on `ActorW.sg`; previously
only attached summon shells used that field. Broken poise uses optional `pb`.
The captured defense event geometry travels on `FlashW.defenseCue`, including
facing and arc, so remote break effects keep the host's committed direction.
Absent state clears the mirror on the next snapshot. Status body cues read
the existing host-authored status list. No new saved timer or save reset is needed.

Removed emitters: `BROKEN!`, `POISED`, `guard broken!`, active `blocked`,
passive `block!`, `shield bash!`, `SHELL BREAKS!`, absorption `shell`, and
`shell regrows`. The brief Winded reference label remains. Parry captions,
guard-release warnings and other backlog families are separate work.

## Verification and remaining acceptance

- `npm run check`, `npm run build`, and `npm run sim -- run --suite smoke`.
- Separate probe runs: `defensecues`, `defenses`, `effectvoice`, `parry`,
  `bashclock`, `guardbash`, `nestednecromancer`.
- The 66 new probe assertions and 491 existing regression assertions passed.
- `npm run perf -- --filter=meadow --seconds=8 --allow-dirty` passed on this
  shared WIP tree: meadow gap p99 16.7 ms, max 29.2 ms, no >40 ms hitches.
  This measures the local work tree, not every biome or a committed release.
- The new probe covers real typed overflow, uncovered-side bypass, profile
  fallback, one-shot break events, reform thresholds, poise rearm, guard
  cooldown, bash, status expiry/cleanse, ordinary-shell co-op transfer and
  cleanup, removed captions, and painter geometry/canvas-state balance.
- After a build: `npx electron balance/defense-cues-ui.cjs` captures real
  rendered intact/impact/break/exposed/regrowing/reformed states with isolated
  saves and profile. Artifacts stay in ignored `balance/reports/`.

Broader encounter playtesting remains: small bodies, crowded overlapping
defenses, terrain contrast and zoom levels. The audit rows remain implemented
with playtesting pending rather than claiming universal readability from a
staged capture alone.
