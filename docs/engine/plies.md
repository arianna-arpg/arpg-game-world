# THE PLY FABRIC — hit-counted durability

`src/engine/plies.ts` (spec + config + pure math) + the ply gate in
`src/engine/damage.ts` applyHitCore + mint stamps in `world.ts`
(createMonster / bakeMinionOwnerStats). Probe: `npx tsx balance/probe_plies.ts`.

The Pikmin/Overlord damage model as data: a body with PLIES does not bleed
by magnitude — each landed hit TEARS ONE PLY and moves no life, however
hard it struck. A swarm creature eats N blows, full stop. Underneath, the
ordinary authored life pool stands UNTOUCHED and fully live — the model is
deliberately DUAL:

- **DoTs pierce**: burns/poisons tick the real life directly — the
  anti-swarm counterplay lane, and the reason a swarm melts in lava.
- **kill() is sovereign**: Martyrdom, Detonate Minions, the amalgam's
  consumption, lifeline sweeps — deliberate unmaking never consults plies.
  A keeper who wants to detonate their beautiful swarm still can.
- **Exposed phase**: with plies spent, hits wound life normally (and the
  life underneath is usually tiny — the coat WAS the durability).

## The spec (`MonsterDef.plies`)

```ts
plies: {
  count: 4,            // hits eaten before exposure
  perLevel?: 0.5,      // extra plies per level (floored) — deep-game lever
  floor?: 1,           // post-mitigation damage below this THUDS:
                       // tears nothing, wounds nothing (chip-proof both ways)
  spentStatus?: 'id',  // stamped the moment the LAST ply tears — the
                       // 'worn open' tell, and the bracket seam's first rider
}
```

Any kind can wear it. The throng kinds ship it (cinderkin 4 / palewisp 2 /
gnatling 1); a **1-ply enemy body is the horde-tier substrate** — it dies
in exactly one hit with zero life math, which is what the wade-through
lite-agent pass wants.

## Identities (probe-pinned)

- MAGNITUDE-BLIND: a 500-damage slam and a gnat nip each cost one ply.
  That IS the fantasy. A future damage-side pierce ("swarmbane") is a
  support lever, never a magnitude rule here.
- EVASION FIRST, BLOCK FIRST: dodged/blocked hits eat nothing.
- POISE STILL CHIPS: mitigation runs before the gate — poise-break stays
  honest counterplay against a plied wall.
- NO LEECH FOOD: an eaten hit landed 0 — you cannot drink from armor.
  (`HitResult.plyEaten` marks it for feedback; never for math.)

## The owner lever (`minionPlies`)

Flat extra plies on plied minions, folded at `bakeMinionOwnerStats`.
**QUANTA LAW**: rounded, never fractioned, never batch-scaled — +1 ply is
one more real hit eaten on EVERY body (linear in count, never quadratic —
the sympathy charge-echo rule). The live rebake re-derives the ceiling
idempotently: spent plies stay spent; a withdrawn lever lowers the ceiling
and preserves the spent count.

## Read

Plied bodies wear a PIP ROW instead of a life bar (renderer, `PLY_CFG.pip`)
— each dot one hit they can still eat, same dent rule as every bar (untorn
stays clean). Once spent, the ordinary life bar takes over: the body reads
EXPOSED. Pips ride the co-op wire (`pl`/`plm`).

## The bracket seam (documented, minimal v1)

`spentStatus` is the first bracket rider. Richer brackets — every-Nth-tear
effects, tear-fed procs, "damage begins at N tears" — belong as rows on
this spec; the tear site in damage.ts is the one chokepoint they'd hook.
