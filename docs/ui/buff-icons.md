# Buff icons

Direct skill buffs above the hotbar use compact versions of the granting
skill's artwork and follow the shared skill-artwork preference. Stackable
effects display a count starting at one. Hover a tile for its name, scope,
modifiers and remaining time.

A time bar at the foot of a timed icon follows the applied lifetime, including duration scaling and refreshes. Independently expiring stacks use the longest remaining stack. For older snapshots without a known total, the final five seconds show the countdown. The exact remaining time is available on hover. Wardrobe can also show seconds beside the buff.

## Attribution and extension

`engine/buffSource.ts` provides `buffWithSource(effect, instance)`. It copies
the granting skill's id, name, icon, color and tags into `BuffEffect.sourceSkill`
without mutating the authored effect. Secondary payloads resolve through their
existing parent-instance links. No buff-name lookup table or hotbar search is
needed, and runtime-authored skill faces work without a registry entry.

The ordinary effect-grant path uses this helper for self, allied, minion,
targeted and delayed buffs. Proc buffs, cast-cycle rewards, empowerment, guard,
attack-sequence, challenge, companion and assault grants use it too. Sympathy
replays carry the copied identity in the existing buff-gain event. Shared-clock
refreshes adopt the latest grant's identity along with its native definition;
independent stacks retain the native representative definition.

For a new skill-driven direct `addBuff` call, wrap the definition with
`buffWithSource`. Triggered buffs show their effect identity and retain the
triggering skill and applicable passive grants in their hover text. Shrines
and pickups inherit artwork from their modifiers. The host supplies active
buff, passive and charge rows to co-op clients. Beneficial statuses use the
existing status snapshot. See [Buff visuals](../design/buff-visuals.md).

## Presentation controls

`VIS_CFG.buffIcons` owns size, spacing, fallback warning time and ink. The icon uses the same artwork preference as the hotbar. A round seal carries stack counts. A diamond identifies a trigger or condition, a circle identifies stacks, a square identifies a timed effect and a hexagon identifies other active effects. The artwork and tooltip identify the particular effect.

Icons preserve insertion order and wrap upward within each seat's hotbar
width. Combo, invocation, progress, proc and possession indicators move above
the occupied rows. Hover targeting uses the same rectangles as drawing, and
the hover card paints above those auxiliary indicators.

Consumable skill buffs such as Flame Imbuement dock a numbered charge dial
above the granting slot. Unslot the skill and its active bank moves into the
strip. Both locations retain the count, expiry and spend rule. Secondary
action buttons keep their own click area below the magazine.

## Hotbar design workshop

Run `node scripts/hotbar-study/build.mjs` and open `balance/reports/hotbar-workshop.html`.
The standalone preview compares two saved mixes on the same combat snapshot.
Signet keeps its round emblems. Heraldic Signet gives triggers and conditions diamonds, stacks circles and timed effects squares. The remaining
active effects use a hexagon. Each shape, counter, expiry treatment, frame
profile and Wardrobe finish can be changed independently.

`buffBehavior` reads the HUD row. A resolved proc takes priority over its
stack count, followed by counted banks, conditional grants, then timed effects.
Counts and timers remain available on a triggered tile. The Still Hand
demonstrates the stationary condition and its separately timed proc.
The source browser reads skill buffs, procs, tree grants, positive statuses,
charge banks and supports at build time. Supports with a projected lasting
effect get a sample. The other supports show their authored description.

The Wardrobe and workshop use the same hotbar finishes in
`data/cosmeticStyles.ts`. In the game, equipping a finish colors the slots,
buff borders and ammunition rails. The workshop stores shape and readout
experiments in its own local preferences. Verify the preview with
`electron scripts/hotbar-study/inspect.cjs` after building it.

## Supported skills

The original slot finish takes its colors from the default inventory palette. Each optional finish supplies a frame profile. Wardrobe’s Hotbar tab can override the frame, choose a custom edge color, restore the finish’s color, or show buff seconds. Save & equip persists those preferences on the account.

The socket rail includes fitted gems and equipment or tree grafts. The skill tooltip names their sources and current readings. `supportRoles` classifies support definitions from their mechanics and modifier rows. `supportMarks` reads the host’s resolved banks, trigger state and counters. Skill-local stacks, repeat seals, charge spends and rolled hit counters have meters anchored above the host. Each meter retains its exact values on hover. A support that supplies the skill's charge bank owns its face counter. Below the configured minimum face width, the bank joins the counters above the slot. A single meter takes the full slot width. Multiple meters fit into shorter rows, pairing only when both fit inside the same slot. Secondary actions and buff magazines keep their own rows. The painter drops the numeral when it would crowd the art. Building Rhythm’s closing double bar lights only at full stacks. Larger ammo drums and Frenzy banks use groups of one, two or five units, scaled by powers of ten for larger capacities. Partially filled symbols show progress within a group. An innate bank uses the skill's own dial. Global buffs and target ailments use their recipient’s existing HUD or effect.

The workshop builds its Cleave example through ordinary socketing, a rolled glove graft and three actual casts. Select a cast state to inspect the drum, Ravening’s Frenzy bank and Building Rhythm’s notes. The example starts with three Frenzy and awards two fresh charges after the second cast. Under **Explore effects & supports**, choose **Supports** to filter the whole registry by mechanic. Counts in that filter count each support once per mechanic.

## Verification

- `npm run check`
- `npx tsx balance/buff-icons-check.ts`: real casts, attribution, allied grants,
  gain-event replay, shared refreshes, custom artwork, unchanged hover payload,
  real expiry, independent-stack clocks and wrapped layout.
- `npm run probe -- proccues`, `sympathy`, `shieldup`, and
  `devotedstartertrees` cover existing grant and cleanup behavior.
- `npx vite build --outDir balance/reports/buff-icons-dist`, then
  `npx electron balance/buff-icons-ui.cjs`: hidden disposable client, real
  hotbar art, pixel assertions for the time bar, actual hover, native refresh/expiry, scaling and narrow layout.
  Captures and report go to `balance/reports/buff-icons/`.

The socket strip defaults to each support’s selected painting. Wardrobe → Hotbars → Support sockets saves an account-wide choice between painted portraits and engraved symbols. The skill hover pairs the same engraving with the selected painting. A landed support proc briefly lights its socket. A lasting buff carries its contributing support IDs to the recipient and through co-op snapshots. A buff tile uses its grantor’s painting in either socket style. When one support grants several buffs, a small secondary mark distinguishes the individual effects. The hover lists all contributing supports. Enemy statuses retain their own on-target visual language.

The support gallery opens directly with `hotbar-workshop.html#supports`. Search by name or mechanic, select a role, or page through the selected paintings. The role table in `src/data/supportVisuals.ts` covers structural support mechanics and registered proc payload types. A support can add presentation roles in its definition. Run `node --import tsx balance/probe_supportpresentation.ts` to check every registered support, selected painting and modifier, plus real proc attribution and co-op. The native Cleave and reload capture is generated by `balance/ability-artwork-ui.cjs`, which checks the action painting and painted and engraved sockets and linked counter hitboxes actually drawn across the two HUD surfaces.

`src/render/supportIconCatalog.ts` pairs a subject and gesture for each support, with an optional payload. The same recipe also supplies its unpainted fallback. A support with a live bank can choose a `presentation.counter` in its definition. The renderer reads ownership, count and capacity from gameplay. Damage and status trigger banks use the actual firing threshold. Overcharge reads the current cast, Hidden Reserves reads the anchor’s husk gauge, and the two channel windings show their individual contribution and combined projectile limit on hover. The support presentation probe checks counted mechanics against the full catalogue and exercises linked banks on a co-op mirror. The workshop’s `#support-counters` section uses the game painters and previews balances against real level-one capacities. The width and sharing controls apply to the entire counter gallery. The adjacent five-support comparison also exercises a 12-round chamber and a 15-charge Frenzy bank.

A socket can expose multiple independent readings. Teeming Vein’s counted cuts show hit progress and the live brood separately. Command fuel follows the skill that spends it. Companion population uses the same family keys, keepers and capacities as gameplay. A crew-only link keeps its socket portrait and identifies the companion as its destination on hover.

Run `node --import tsx balance/probe_supportcoverage.ts --report` to regenerate `balance/reports/support-coverage.json`. It lists every registered support and authored roll, its placements, fitted example, level-dependent capacities, and host and crew admission counts. The workshop reads the same audit when building its gallery.
