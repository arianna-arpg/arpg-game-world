import { mod } from '../engine/stats';
import type { ThrongEvolutionSpec } from '../engine/throngEvolution';
import { tree, n, type Node } from './skillTreeBuilder';
const evolve = (node: Node, throngEvolution: ThrongEvolutionSpec): Node => ({ ...node, throngEvolution });

export const GNATVEIL_TREE = tree([
  evolve(n('patient_condensation', 'Patient Condensation', 'While equipped, accumulate one Gnat attached to you every 4 seconds. This has its own clock and stacks with Patient Brood. Pauses at the recruitment limit.'), { accumulateSec: 4 }),
  [evolve(n('room_in_the_air', 'Room in the Air', '+10 maximum Gnats. Patient Condensation accumulates a Gnat every 2.5 seconds.', [mod('minionMaxCount', 'flat', 10)]), { accumulateSec: 2.5 }),
    evolve(n('billowing_veil', 'Unbroken Veil', '+8 maximum Gnats. While equipped, immediately replenish to at least 8 Gnats attached to you whenever the roster falls below 8.', [mod('minionMaxCount', 'flat', 8)]), { minimum: 8 }),
    evolve(n('heavy_motes', 'Borrowed Wings', 'Recruit beyond your normal maximum, up to 200 Gnats. Excess Gnats lose 8% of their uninvested life per second, accelerating by 8% each second. Life and regeneration investment can delay their decay.'), { overflowCap: 200 })],
  [evolve(n('layered_wings', 'Scouring Wings', 'Minion life investment applies at half strength instead of one eighth. While conducting, Gnats deal 50% of a bite to enemies they pass through or latch onto, at most once per enemy every 0.35 seconds.'), { lifeScale: 0.5, contactScale: 0.5 }),
    evolve(n('double_membrane', 'Terminal Descent', 'Conducting with at least your normal maximum Gnats sends the current veil diving at the cursor. Each Gnat explodes on arrival for 600% bite damage in a small area and dies. A clustered Gnat carries the whole volley.'), { fullDive: true }),
    evolve(n('quiet_flutter', 'Swarm Incarnate', 'Gnats combine into one growing Gnat. Life and damage scale with the number gathered; size grows more slowly. Gain one extra ply at 4, 9, 16, 25… Gnats. Damage and spent plies are preserved when merging.'), { cluster: true })],
], [
  evolve(n('battle_hatching', 'Battle Brood', 'While equipped, your hits and minion hits fill a separate 100-point hatch bar by 3. At full, gain half the missing Gnats up to your normal maximum, rounded up, attached to you. Stacks with Hidden Reserves.'), { hitFill: 3 }),
  [evolve(n('rich_hatch', 'Volatile Clutch', 'Gnat finds become eggs holding 4 Gnats, scaled by throng size. Eggs appear near nearby enemies when possible. Collecting an egg releases its Gnats and bursts for 400% bite damage per Gnat collected.'), { eggs: 4 }),
    evolve(n('burst_hatch', 'Untouchable Flight', 'Gnats are immune to damage and draw no enemy attention while unattached to an enemy. They begin biting once latched. Conducted whirlwind contact remains active in flight.'), { transitImmune: true }),
    evolve(n('ravenous_motes', 'Ravenous Motes', 'Gnatveil Gnats deal 60% MORE damage, including their bites, contact and egg bursts. This multiplier is not divided across the throng.'), { damageMore: 0.6 })],
  [evolve(n('walking_conductor', 'Frenzied Conductor', 'Move at ordinary walking pace while conducting. Conducted Gnats gain 100% more movement speed, 75% more attack speed and 25% more damage.', [mod('channelMobility', 'flat', 0.15)]), { conductFury: true }),
    evolve(n('tireless_conductor', 'Cyclone of Wings', 'Keep Frenzied Conductor’s fury. While conducting, Gnats whirl around you instead of following the cursor, dealing a bite to every enemy crossed, at most once per Gnat per enemy every 0.35 seconds.'), { conductFury: true, whirlwind: true }),
    evolve(n('frenzied_wings', 'Splintering Bites', 'Gnat attacks splash nearby enemies for 35% of a bite. Each Gnat gains one protective ply.', [mod('minionPlies', 'flat', 1)]), { splashScale: 0.35 })],
], n('veil_tending', 'Veil Tending', '20% increased minion life and damage. 50% increased bodies per throng find.', [mod('minionLife', 'increased', 0.2), mod('minionDamage', 'increased', 0.2), mod('throngYield', 'increased', 0.5)]));
