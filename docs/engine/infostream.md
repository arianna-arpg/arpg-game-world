# The Info Stream — the player composes their own information

Every piece of running text the game speaks — world news, damage numbers,
experience notes, drop announcements, pickup confirmations — is now a
**curatable channel** rather than a hardwired print. The player decides what
announces, where it stacks, and how long it stands; a new package registers
its channel or kind and the Options panel grows the switch for free.

Everything lives in one fabric file: `src/world/bulletins.ts` (registries,
models, pure list laws, and every dial), drawn by `render/renderer.ts`
(`drawNoticeFeed` / `drawPickupFeed` / the `drawTexts` kind gate), tuned by
the player in Options → Interface → **Information Stream**.

## The three surfaces

- **The notice feed** (screen-anchored world news). Bulletins used to float
  over the hero's head in the combat-text lane — world news fighting damage
  numbers for the same pixels, each line dying on the same 1-second clock.
  Now the engine's bulletin pump lands every line in `World.notices`, and
  the renderer stacks them at the player's chosen anchor (top center /
  top left / top right / bottom — `NOTICE_ANCHORS`, a registry), newest on
  top, each line on its own clock: held at full legibility for
  `NOTICE_CFG.holdFrac` of its life, then fading out by
  `Settings.noticeSec` (default 3s, rails 1–10s).
- **Float kinds** (world-anchored battlefield text, curated per kind).
  `World.text()` takes an optional `kind` + `life`; the renderer skips kinds
  the player has hidden (`Settings.floatKinds` over the `registerFloatKind`
  registry). Unkinded text always draws — story beats and teaching lines
  never need enrollment. Debut kinds: `dmg` (hit/tick numbers), `combat`
  (SHATTER!/AMBUSH!/evade/block/volatile cries), `gains` (orb/essence/charge
  trickle), `xp` (+N xp at the kill), `drop` (fallen loot naming itself —
  stands `FLOAT_CFG.dropNameSec` = 3s instead of the 1s tick), `pickup`
  (the overhead entered-your-bags line — **ships OFF**: the pickup feed
  keeps that ledger without covering the fight).
- **The pickup feed** (the right-flank ledger). Every pickup chokepoint
  (`updateDrops`, `pickupNearestGear`, `grantEssence`, `grantVestige`)
  writes a row — "Warcry (Common) x1" — via `notePickup`: repeats inside
  `PICKUP_FEED_CFG.coalesceSec` coalesce into the standing row (x2, x3…)
  and refresh its clock; rows cap per seat; each client lists only its OWN
  seat's rows. Anchored down the right side where the inventory opens —
  and drawn on the **canvas**, which composites **below every DOM panel by
  construction**: an open inventory always covers the feed, never the
  reverse (the layering law the feature was asked with).

## The laws

- **The world mints, the client curates.** Kinds/channels ship on the co-op
  wire (`TextW.k`, `no`, `pfd` in net/snapshot.ts); every seat filters at
  DRAW by its own Settings. Muting is instant and retroactive; no filter
  state ever enters the sim.
- **Registries are open.** `registerNoticeChannel` / `registerFloatKind` at
  import time; the Options panel enumerates the registries; the sparse
  Settings records mean a brand-new channel arrives live with its authored
  default — no save migration, ever.
- **Unknown ids read ON.** A renamed channel can never silently mute news;
  junk record values are dropped at load (`boolRecord`), durations re-clamp
  into the fabric rails.
- **Feeds are transient.** Notices and pickup rows age on the world clock
  (a held menu freezes the news mid-breath), prune at `maxKeepSec`, and are
  deliberately never persisted into saves.

## Channel roster (debut)

`world` (catch-all — every untagged bulletin), `events` (quickening,
apparitions, hive cycles), `war` (crusade + underworld-war fronts),
`civic` (borough arrivals; writs and wares to come). Producers tag at their
drain or their say-helper — one line each.

## Dials

- Player: `noticeSec`, `noticeAnchor`, `noticeChannels{}`, `floatKinds{}`,
  `pickupFeed`, `pickupFeedSec` (meta/settings.ts — additive, clamped).
- Fabric: `NOTICE_CFG` (keep/maxKeepSec/rails/holdFrac/anchor default),
  `PICKUP_FEED_CFG` (keep/coalesceSec/rails/holdFrac),
  `FLOAT_CFG.dropNameSec`.
- Pixels: `VIS_CFG.infoFeeds` (pads, row heights, fonts, max rows).

## QA

`balance/probe_infostream.ts` (ALL PASS): the registries + default laws,
the pure list laws (cap/prune/coalesce/per-seat isolation), the LIVE lanes
(bulletins land in the feed and never the float lane; drop names stand 3s;
vacuumed gems coalesce x2; essence pays gains + a counted row; a credited
kill floats kind `xp`; a real swing floats kind `dmg`), the snapshot
round-trip, and the settings round-trip (rails, sparse records, junk
tolerance). The Options rows re-render live; the renderer reads Settings at
draw, so every switch shows on the very next frame.
