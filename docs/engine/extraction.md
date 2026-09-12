# EXTRACTION — the seam you defend (the "motherlode")

`packages/defs/extraction.ts` is the def (every number as data);
`packages/encounters.ts` the `ExtractSpec` contract; `data/extraction.ts` the
per-biome faces; `World.updateExtraction` / `spawnExtractionSwarm` /
`settleExtraction` / `payExtraction` the director. A seam wells up in the
wilds; dwell to tap it, a rolled clock runs, the zone's own population pours
in, and the seam pays in essence when it ends — drained dry or torn down.

## THE TEMPERS (her ask, 2026-09-11)

One `ExtractSwarmSpec.tempers` row is ROLLED per seam at placement (weight =
rarity, on the encounter stream — reload re-rolls the same) and colors the
whole stand — who the swarm comes for first:

| temper | weight | focus | heroThreat | yieldMul | meaning |
| --- | --- | --- | --- | --- | --- |
| wary (default) | 60 | 0.4 | 70 | 1 | the swarm comes for the DEFENDER first; the node is the fallback once the defender is gone |
| fixated | 25 | 1 | 0 | 1.2 | the old sapper: fixated on the node until out-shouted on the threat chart |
| ravenous | 15 | 2.2 | 0 | 1.6 | the node outranks the defender; the hardest stand, priced for it |

`focus` scales every point of threat seeded toward the node (`seedThreat` at
spawn, `pulseThreat` each beat, both still × the body's own `aggro.fixation`);
`heroThreat` is stamped toward the nearest local hero at each spawn. The armed
line names the roll ("Deep Seam, a wary swarm — …"); the swarm's behavior is
the rest of the tell.

## THE POT (her ruling 2026-09-11)

A seam is rarer than a harvest node and asks a whole defense of you, so it
must beat a node: `pot = (potBase + level × potPerLevel + potPerSec × seconds
stood) × scale.rewardMul × temper.yieldMul`, then × `frac^partialPower` for a
broken stand (`minFrac` below which nothing pays). At level 10 a shallow seam
drained pays roughly one and a half harvest nodes; a primeval one many
times that, and every second held adds to it. Packets scatter at the node
and climb grades through the `rungs` ladder (sweetened on a full stand);
XP rides `xpBase`/`xpPerLevel` × the same multipliers × the fraction held.

## Extending

A new temper is one row (validated: unique id, weight/focus/yieldMul > 0,
heroThreat ≥ 0). A biome's face is one `EXTRACTION_LOOKS` row. The map-level
spent ledger (`packages/overlays/extraction.ts`) is untouched by either.
