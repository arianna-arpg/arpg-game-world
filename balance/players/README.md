# balance/players — the ACTUAL-BUILD library

Drop a `CharacterSave` JSON here (the body of `saves/save_1.json` — what the
game writes to a character slot) and the balance CLI auto-registers it as a
build id `player_<filename>`: visible in `manifest`, runnable everywhere a
build id is taken.

```
cp saves/save_1.json balance/players/my_warrior_l14.json

npm run sim -- run --suite starters --as player_my_warrior_l14
npm run sim -- sweep matchups --build player_my_warrior_l14 --panel textures_l8
```

Why a folder of saves instead of transcribed BuildSpecs: a save injects
through the game's OWN resume path (`applySavedCharacter` → `adoptSavedMeta`)
— exact rolled gear, exact gem levels and sockets, companions, the lot. No
transcription, no fidelity drift. When a data change removes content a save
references, the sim rebuilds tolerantly (like the live loader) and the report
carries a warning per dropped thing — a warned row is not a balance datum.

These files are COMMITTED on purpose: they are measurement fixtures, the
"real builds" axis of the harness. Curate them like reference builds — a
few honest snapshots per level band beats fifty near-duplicates. Ad-hoc,
uncommitted probes should use `--as save:1` (reads the live slot directly)
instead of landing files here.

Note the distinction:

| ref                 | reads                        | when                         |
|---------------------|------------------------------|------------------------------|
| `save:<slot|path>`  | the live save, at run time   | "how does MY character do?"  |
| `player_<file>`     | this folder, committed       | standing fixtures, CI, sweeps|
