# The Release Channel — how a build reaches a player

How an installed launcher finds its next build, why it can only ever be offered
a night that passed, and what each piece of the pipeline owes the others.

| Piece | Where |
| --- | --- |
| The update brain (pure: selection, probe, verified download) | `launcher/updates.cjs` |
| The wiring (config fold, IPC, the direct install, the smoke lanes) | `launcher/main.cjs` |
| The picker and the announcement | `launcher/launcher.html`, `launcher/preload.cjs` |
| The cadence: verify, tag, dispatch | `.github/workflows/nightly.yml` |
| The build, the publish gate, the atomic publish | `.github/workflows/release.yml` |
| Dials | `launcher.config.json` → `updates.*`, `repo.*` |
| Law rig / in-runtime proof | `npm run test:launcher` / `npm run smoke:update` |

## 1. Two kinds of install, two update sources

- **A checkout** (`npm run game`, `Launch Game.bat`) updates with git: fetch the
  configured branch, fast-forward, `npm install`, rebuild. It follows the branch
  HEAD, not releases. Nothing on this page changes it.
- **A packaged install** (the NSIS installer, the AppImage) has no repo and no
  toolchain. It follows a **release channel** on GitHub Releases and replaces
  itself in place (THE DIRECT UPDATE: silent NSIS re-run on Windows, AppImage
  swap-and-relaunch on Linux and Steam Deck). Saves live in userData and are
  untouched by either path.

`updates.mode` picks the source (`auto` = by environment; `git`, `release`,
`none` force it).

## 2. The channels

Data, in `UPDATE_CHANNELS`. The first row is the default, and a missing or
unknown `updates.channel` folds to it.

| Channel | Follows | Probe |
| --- | --- | --- |
| `nightly` (default) | The release cadence: the newest **published** release, prereleases included. That is last night's RC, or a hand-cut stable that outranks it. | The release list, newest `scanReleases` entries |
| `stable` | Hand-cut stables only. | `/releases/latest`, which by API definition never serves a prerelease or a draft |

Rules both channels share, all enforced by `pickUpdate`:

- **Highest version wins.** The list is sorted here, never trusted as ordered. A
  hand-cut `v0.6.0` outranks every `v0.5.x` RC; the next night's RC becomes
  `v0.6.1` on its own.
- **It never downgrades.** An install above the channel's head is simply up to
  date. Switching `nightly` to `stable` therefore holds an install where it is
  until a stable outranks it.
- **Only `vX.Y.Z` tags are game builds.** A moving tag, a `-beta` suffix or a
  tooling release is never offered.
- **An install whose own version does not parse is offered nothing.**

The launcher page shows the picker only where updates come from releases. The
choice persists to the machine-local config (`launcher.config.local.json`,
userData when packaged) through the same local-write seam as the Developer box.

## 3. The failed-night law

The rule the whole design rests on: **a launcher can only be offered what was
published, and nothing about a failed night ever is.**

| What went red | Where | What exists afterwards | What a launcher sees |
| --- | --- | --- | --- |
| Type-check, the update laws, or a probe | `nightly.yml` `verify` | Nothing. `cut` needs `verify`: no tag, no release. | The last good night |
| A package leg (build, packaging, upload) | `release.yml` `package` | A tag and a **draft** | The last good night. Anonymous API callers never see drafts. |
| The packaged smoke (section 6) | `release.yml` `package` | A tag and a draft with assets | The last good night |
| `finalize` | `release.yml` | A tag and a draft | The last good night |

`finalize` needs every leg and publishes with **one atomic API call**, made only
after every leg built and smoked its package. There is no moment at which a
launcher can see half a night.

`pickUpdate` re-checks what it is handed anyway. Drafts are dropped. A release
lacking this platform's **fully uploaded** artifact (`state: 'uploaded'`,
non-zero size) is **passed over for the one beneath it**, and the log names it.
When several assets match, the one carrying the release's own version in its
name wins, so a stray hand-attached `.exe` is never the thing the launcher runs.
This is the v0.2.0 incident (an AppImage-only release served to Windows installs)
made structurally harmless.

A red night costs players one day. The alarm rings (section 7), and the next
night either **re-runs the unpublished tag** (no new commits) or cuts the next
number (new commits).

### Withdrawing a bad night

A night can pass every gate and still be wrong. Withdrawing it is one act:
**delete the release, or turn it back into a draft.** Every launcher stops
offering it on its next check and falls to the next-highest published build.
Installs that already took it stay there until a higher version ships, because
an install only ever moves up. There is no rollback. A player who needs an older
build installs it by hand from the Releases page.

## 4. The digest law

GitHub publishes a `sha256` per release asset. `downloadAsset` hashes the stream
as it arrives and resolves only when the byte count **and** the digest match. On
any failure (mismatch, truncation, a stall, the ceiling, a disk error) the
partial file is **deleted before the error leaves**. Nothing unverified is ever
left on disk to be run, and the running AppImage is only ever replaced by a
verified one.

- A **stall timer** (`stallSec`, no bytes received) sits under the whole-download
  ceiling (`ceilingMin`), so a dead connection is a prompt, named failure.
- A release with no digest, or `verifyDigest: false`, falls back to the byte
  count, and the log says so. The result's `verified` flag never claims more
  than happened.
- Any direct-update failure falls back to opening the release's own page.

### The in-place swap

How an AppImage replaces itself (`swapInPlace`): staged beside the running file
as a dotfile on the same filesystem, verified, marked executable, then renamed
over the **same path**, so a Steam or desktop entry pointing at it stays valid.
The running image keeps its old inode, so this is safe under a live process. On
any failure the running file is left exactly as it was with nothing staged
beside it. Each swap first sweeps `.<name>.downloading` leftovers: a session
killed mid-download cannot tidy up after itself, and every night's artifact has
a new name.

## 5. The quiet update

A Steam Deck in Game Mode (any gamescope session, and `--play`) boots **straight
into the game**, console-style. No launcher page means nothing ever ran the
check, so such an install sat on its install-day build forever. Showing the
launcher there would be worse than the problem: a utility page no gamepad can
drive. The update comes to the player instead.

`quietUpdate` runs only when direct play **succeeded** (a failed one falls back
to the launcher, whose page checks for itself). After `updates.quietDelaySec`,
so the game's own boot goes first, it runs the ordinary channel check. If a newer
build is published it streams it beside the running AppImage, verifies it and
swaps it in place. The running game is never touched. **The next launch is
simply the new version.** No prompt, no restart, no window.

Every failure (offline, rate-limited, a read-only folder, a bad digest, a full
disk) is one `launcher.log` line and nothing else. Play is never affected, and
the next launch tries again. Only an AppImage can be replaced under a running
process, so this is Linux-only. A Windows install always shows the launcher,
whose button is the same update with a restart. The Update button refuses while
a quiet download is in flight, so the two never race for one staged file.
`updates.quiet: false` turns it off.

## 6. The publish gate

`release.yml` boots **the packaged app it just built** through three headless
self-checks before the job may pass. Each prints one `SMOKE <lane> …` verdict
line and exits 0 or 1, with one retry per lane.

| Lane | Proves |
| --- | --- |
| `launcher` | The launcher page boots; its bridge, Developer box and channel picker are live |
| `update` | Hermetic, against a loopback fixture built **relative to the running version**: this build finds its successor, passes an incomplete release over by name, never sees a draft, holds on the stable channel, verifies a good artifact onto disk, **deletes** a corrupt and a truncated one, swaps a verified build over a stand-in AppImage (and leaves it untouched on a refused one), and writes no settings. Nothing is installed. |
| `game` | The built game serves over loopback, boots and reaches its start menu |

Why the gate exists: once players auto-follow nightlies, a build that compiles
and passes every probe but does not boot **as a package** would reach all of
them, and a launcher that does not boot cannot be sent its fix. The `update`
lane guards the one feature that must never break. The smokes pin their lane
(the launcher page reads the committed defaults, in memory) so a machine's
toggles can never change what a self-check measures.

Dispatch `release.yml` by hand **on a branch** to prove a change to the gate. It
builds and smokes both platforms and publishes nothing.

## 7. The alarm

One open `nightly-red` issue, reds accumulating as comments.

- `nightly.yml` rings it for `verify` and `cut`.
- `release.yml` rings it for its own legs on RC runs, because `cut` only
  **dispatches** the release and cannot know whether it shipped.
- It closes where a night has actually shipped: `release.yml`'s `finalize`, or
  the quiet-night step in `nightly.yml` (verify green, newest tag published).

## 8. Moving installs that predate the channel

A launcher from before this design (`v0.5.39` and older) only ever asks
`/releases/latest`. **It cannot see a nightly, and no launcher change can reach
it.** The one lever is what `/releases/latest` serves: one release that carries
the channel-aware launcher has to become "latest", once. Either

- cut a hand-made stable (the usual recipe: bump, notes, tag), or
- promote one published nightly: untick *Set as a pre-release* and tick *Set as
  the latest release* on its page.

Every old install then updates to it through its old probe, and follows the
nightly channel by itself from that launch on. Anyone installing from the public
"latest release" link lands on the same build, so the same act keeps a
stranger's first download from being a dead end. After that hop a stale
"latest" costs a new player one extra click, never a stuck install.

**`v0.6.0` is that release**: the first build whose launcher follows a channel.
Every install from it onward stays current with no hand-cut release at all.

## 9. Dials

`launcher.config.json` (committed defaults), overridden by
`launcher.config.local.json`. All fold through `resolveUpdateCfg`, the one read.

| Key | Default | Meaning |
| --- | --- | --- |
| `updates.channel` | `nightly` | Section 2 |
| `updates.scanReleases` | `10` | How many of the newest releases the list probe reads. The window is what lets a passed-over release fall through to the one beneath it. |
| `updates.verifyDigest` | `true` | Section 4 |
| `updates.quiet` / `quietDelaySec` | `true` / `20` | Section 5 |
| `updates.probeTimeoutSec` / `stallSec` / `ceilingMin` | `8` / `60` / `30` | Probe timeout, stall timer, whole-download ceiling |
| `updates.checkOnLaunch` / `directInstall` / `mode` | `true` / `true` / `auto` | Unchanged |
| `repo.github` | `arianna-arpg/arpg-game-world` | `owner/name` |
| `repo.api` | `https://api.github.com` | REST root; a mirror or an Enterprise host is a config line |

The probe is anonymous (GitHub allows 60 requests an hour per network). One
check costs one request. A spent allowance is reported in words, with the refill
time, and playing is never blocked.

## 10. Extending

- **A channel** is one `UPDATE_CHANNELS` row (`prereleases`, `probe`). The
  picker, the smoke and the law rig read the registry.
- **A platform** is one `PLATFORM_ARTIFACT` row (the artifact suffix) plus its
  install step in `directReleaseUpdate`.
- Keep `updates.cjs` free of Electron. It is what lets every law be proven
  without a window or a network.

## 11. Verify

```
npm run test:launcher     the laws, pure (about a second)
npm run smoke:update      the same laws inside Electron, against the real page
npm run smoke:launcher    the launcher page
npm run check             strict checkJs over launcher/*.cjs
```

## 12. Known gaps

- **Checkouts follow the branch HEAD**, which can be red. A friend's clone could
  follow green tags instead (`git merge --ff-only <newest published tag>`).
- **Old RCs are never pruned.** Each night adds about 235 MB of release assets.
- **The NSIS relaunch is not covered in CI.** The smoke boots the unpacked
  payload; the silent install and its `--force-run` relaunch are proven by hand.
