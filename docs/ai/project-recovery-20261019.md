# Seamless playability recovery — 2026-10-19

## What went wrong

The project goal is a continuous geographic world carrying the original ARPG's gameplay, offline and hosted. The earlier recovery restored the canonical branch but launched its retained campaign. That was the wrong player-facing result: retained owners still travelled through campaign zones.

Commit `4ad56308` had replaced the browser's worldmass selection with unconditional `NativeClientStart` entry. `HOLLOW_WAKE_WORLDMASS=1` therefore did not make normal Begin enter continuous terrain. The old worldmass visual course called `devStartRun` and then explicitly invoked `startWorldMass`; it bypassed the broken player entry. Continue likewise used only the retained save reader. Separately, the desktop launcher's configured default branch could redirect a checkout launch back to main.

The first six-file launcher recovery fixed branch selection but failed to fix the gameplay selection. Its zone-based screenshots were not evidence of seamless delivery. This correction replaces that playtest route, not merely its label.

## What had actually been built

The original combat/character/gear engine remains substantial and playable. The continuous branch contains deterministic terrain and climate sampling, page streaming, physical roads and places, embedded Lastlight, native content adapters, bounties, interiors, sparse world changes and saved continuity. The host has a continuous-world mode and real network entry, party and persistence machinery.

A separate large body of work migrated original content/controller ownership into retained areas. That is useful foundation work, but its browser default still used the old campaign geography. Full integration of those retained owners into the continuous surface is unfinished. Source-provenance checks and controller parity do not establish that integration or MMO capacity.

## Probe census

Measured from tracked files before this correction, at `886e4fc6`, against the common `origin/main` baseline:

| Changed area | Added lines | Share of added lines |
| --- | ---: | ---: |
| `balance/` | 566,736 | 77.6% |
| `src/` and `server/` | 134,233 | 18.4% |
| `docs/` | 25,363 | 3.5% |
| Other | 3,677 | 0.5% |

This is code volume, not an estimate of time or effort. The tracked balance tree contained 1,794 files and about 106 MB; 200 archive/fixture-source-named files accounted for about 81 MB. The largest single archive was about 12 MB. Exact predecessor snapshots and chained source expectations had become a major maintenance burden while the actual entrypoint regressed.

## Correction

- Normal builds select continuous exploration. Begin opens the class picker and creates the continuous runtime before the first save. The authored prologue/Mu route remains in the explicit retained inspection mode; the local continuous entry currently goes directly to class selection.
- Continue selects the owner from the saved envelope. Continuous saves use the existing staged world reader; retained saves keep their recorded-geography reader. Neither is silently converted.
- Play World selects the canonical branch, displays the seamless identity and uses a fresh isolated save/profile folder. Host World starts `ShardHost` with `worldmass: true` and its own save directory.
- Eight existing behavioral courses become the default probe gate, with no automatic retry. Individual named probes remain available. Historical broad/source audits become opt-in; their archives are preserved rather than expanded or erased.
- Normal CI and nightly verification exercise maintained behaviors and the actual client playthrough. The old source-audit checklist is moved to a manual workflow.
- The 4,863-line instruction/handoff accumulation is moved to `docs/ai/reference-before-playable-recovery.md`; a short current working guide replaces it. Historical source-preservation mandates no longer override delivery of current gameplay.

## Verification

The actual client course clicks Begin and a class, opens the physical waking-house door by movement, walks the road into negative local coordinates, attacks a generated opponent, saves, reloads and clicks Continue. It does not debug-start, install a substitute generator, teleport the hero or manually kill its opponents. Reports are under `balance/reports/seamless-playthrough/`.

The initial complete walk covered about 1,564 world units across three terrain pages with zero calls to `loadZone` and the same hero instance. Disk Continue restored the world seed, character identity and exact saved countryside position. Eight default behavior courses passed in about 91 seconds on this machine. Continuous host startup/HTTP delivery passed with zero faults. Shared combat simulation and launcher unit checks also passed. Final four-project type checking passed. The final real-client run killed a Gnoll Prowler through ordinary attack input, kept the hero alive, and passed disk Continue with no renderer errors. The production build passed with its existing large-bundle warning.

The software-rendered route measured roughly 30 ms median and 164 ms p95 per driven frame in that run. This is not a hardware-rendered desktop FPS benchmark, but it is enough to keep smooth-frame acceptance open. No large-player capacity result is claimed.

## Scope and remaining work

Keep this continuous route playable while integrating missing quests/events into physical places. Measure the costly loading/streaming frames before choosing performance work. Complete retained-area geography and worker transfer only against this visible surface; do not replace it with graph travel during migration.

The original root checkout's unfinished changes remain intact. Work is on the existing canonical branch in `.claude/ownership.playable-foundation`; no unrelated project was used. Nothing was pushed, published or promoted to main by this recovery.
