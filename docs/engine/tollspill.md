# M-TOLL + M-SPILL — tolls drawn to the reach, spills that tumble

`src/render/vis/worldVoices.ts` (the toll / thrum / tune voices registered into
THE EFFECT VOICE + the pure corpse-tumble pose) · `World.resonate` / `attune
Crystal` / `popBrittle`'s spill / `openChest` / the mimic · `ResonanceSpec.voice`
· `Corpse.laidAt/from` · `Chest.openedAt` · probe `balance/probe_tollspill.ts`
· design authority `docs/design/show-dont-tell.md` §3c/§3d (the ladder's
fourth rung).

## THE TOLL (resonance + attunement)

A struck resonant stone (the crystal spire, the petrified elder, the watcher,
the witch bell, the skep) used to flash a small ring and float a line ("the
spire sings…"). Its LURE REACH — how far the zone heard it — was gameplay the
player never saw. Now `World.resonate` pushes ONE flash whose **radius is the
lure reach** (`spec.radius ?? RESONANCE_CFG.radius`) wearing the `toll` voice
(thin concentric rings expanding to exactly that reach over
`RESONANCE_CFG.tollLife`, a shimmer at the seat) — or the row's own
`ResonanceSpec.voice` (`thrum` for the skep: short pulsing rings and a jitter
of dots). **Drawn == tested: the ring shows how far it was heard.** The
caption retired (`ResonanceSpec.text` is gone; no rule carries one — probe A3).

The attunement wash (`attuneCrystal`): the flash already spanned the wash
reach; it now wears the `tune` voice (the tone's tint, motes drifting in) and
the line ("attuned to fire!") retired — the body's own `attuned_<tone>`
status speaks on the body through THE STATUS VOICE.

## THE SPILL

- **Corpses tumble.** A breakable's spill (the plague cart, the shallow grave,
  the carrion midden) mints its bodies stamped `laidAt` (the break clock) and
  `from` (the host seat); `drawCorpses` poses a fresh spilled corpse along
  `corpseTumblePose(age, from, pos, size)` — an arc up and over from the host
  to its own seat with a settling spin (pure f(age); `VIS_CFG.corpseTumble`).
  The tested corpse sits at its seat from the instant (the corpse economy
  untouched). The three spill captions and `corpses.text` retired.
- **The chest lid swings** (`Chest.openedAt`, `VIS_CFG.chestLid`): the open
  flash wears `sparkle`; "the chest opens!" and "${rarity} spoils!" retired —
  the gear glyph's rarity color is the read. The mimic **bursts out of the
  chest** through THE EMERGENCE GRAMMAR (host lane); 'MIMIC!' retired.
- 'drops loot!', 'the purse bursts!', 'the hoard spills!' retired — the drops
  ARE the drawing (the `drop` float kind still names them — precision).

## Dials (ALL unblessed — her walk)

`RESONANCE_CFG.tollLife` 0.9 · `VIS_CFG.worldVoices` (toll rings 3 spacing 0.22
width 1.3 alpha 0.55 squash 0.72 wink 0.7 · thrum pulses 3 rate 3 reach 0.28
alpha 0.6 dots 7 · tune alpha 0.7 motes 8) · `VIS_CFG.corpseTumble` (0.45s arc
1.6× size spins 0.75) · `VIS_CFG.chestLid` (0.35s lift 7).
