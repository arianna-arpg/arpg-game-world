# Save resets on breaking updates

This prototype treats accounts and saved runs as disposable. Prefer a deliberate
reset over maintaining an old gameplay/generation implementation solely to keep
old saves alive. Normal content additions and compatible bug fixes do not reset
anything. Reset policy is independent of the app's release number or Git hash.

## One update policy

Edit `SAVE_COMPATIBILITY` in `src/meta/saveCompatibility.ts`:

| Change | Action | Result on next boot |
| --- | --- | --- |
| Compatible update | Leave both revisions unchanged | Keep accounts and characters |
| Breaking world, generation, or character change | Increment `run` | Clear Continue and all saved vessels/worlds; keep account progression |
| Breaking account/progression change | Increment `account` | Reset account progression and all dependent characters/worlds |

Update `reason` with a short player-facing explanation when bumping a revision.
Never decrement or recycle revisions. Account bumps automatically invalidate
characters because every character carries both the run and account revision;
there is no need to remember a matching run bump. Settings and authored
Workshop/Atlas content use their own existing stores and remain untouched.

The current policy is account revision **1**, run revision **2**. This discards
pre-update characters/worlds for the geographic generation changes while keeping
account progression. There is only one geography implementation: weighted biome
regions, biome-scaled exploration steps, and atlas cliffs. There are no saved
geography-version branches or per-seed compatibility registrations.

## Where it is enforced

- Account serialization stamps the account revision and the run revision its
  roster belongs to. A run mismatch removes obsolete vessel cards while keeping
  credits, unlocks, and account progression. An account mismatch creates a fresh
  account through the normal default factory.
- Shared-run, roster, and couch character serialization stamp both revisions.
  Character loaders and direct character application reject either mismatch.
- The disk copy is authoritative when present. An incompatible disk character
  is replaced with an empty slot; its browser mirror is removed. A disk
  tombstone cannot fall back to a stale browser save. If the endpoint cannot be
  read, browser storage remains the fallback, with the same revision checks.
  A wipe is never sent to a disk endpoint whose copy was unavailable.
- Account normalization updates its roster revision and cache, and updates an
  incompatible disk account only after reading that disk copy. This makes the
  reset idempotent. Unlisted obsolete roster files may remain until accessed or
  overwritten; their revision checks make them unresumable regardless of cards.
- Save import uses the same character compatibility gate and refuses obsolete
  accounts/characters before writing any imported slots. Old backups cannot
  restore an incompatible world through a separate path.
- Boot shows a short reset notice on the start menu when an incompatible save
  is encountered, without navigating away from an open subscreen.

The policy runs in the game after an updated build starts, so it works for the
source launcher, packaged desktop updates, and browser hosting. There is no
launcher-specific filesystem deletion pass and no wipe on every release.

## Verification

`balance/probe_savecompatibility.ts` uses a memory-backed save endpoint and real
loaders. It covers compatible updates; run-only resets; account resets cascading
to characters; missing/future revision stamps; roster pruning; direct restore;
import refusal; disk-vs-cache authority; tombstones; idempotence; offline fallback;
and preservation of settings and authored content. It never touches real saves.

Run `npm run check`, `npm run probe`, `npm run build`, and `npm run smoke`
after changing reset behavior. Generation changes also require `npm run genqa`.
