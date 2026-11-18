import { mod } from '../engine/stats';
import type { ThrongEvolutionSpec } from '../engine/throngEvolution';
import { tree, n, type Node } from './skillTreeBuilder';
const evolve = (node: Node, throngEvolution: ThrongEvolutionSpec): Node => ({ ...node, throngEvolution });

export const GNATVEIL_TREE = tree([
  evolve(n('patient_condensation', 'Patient Condensation', 'Passively generates 1 Gnat every 4 seconds while equipped, up to your maximum Gnats.'), { accumulateSec: 4 }),
  [evolve(n('room_in_the_air', 'Room in the Air', '+10 maximum Gnats. Patient Condensation generates 1 Gnat every 2.5 seconds.', [mod('minionMaxCount', 'flat', 10)]), { accumulateSec: 2.5 }),
    evolve(n('billowing_veil', 'Unbroken Veil', '+8 maximum Gnats. Immediately replenishes your swarm to 8 Gnats whenever it falls below 8 while equipped.', [mod('minionMaxCount', 'flat', 8)]), { minimum: 8 }),
    evolve(n('heavy_motes', 'Borrowed Wings', 'Allows you to exceed your normal maximum up to 200 Gnats. Excess Gnats lose 8% of their base life per second, accelerating by 8% each second.'), { overflowCap: 200 })],
  [evolve(n('layered_wings', 'Scouring Wings', 'Minion life modifiers apply to Gnats at 50% effectiveness instead of 12.5%. While channeling, Gnats deal 50% of their bite damage to enemies they pass through (up to once every 0.35s per enemy).'), { lifeScale: 0.5, contactScale: 0.5 }),
    evolve(n('double_membrane', 'Terminal Descent', 'Channeling while at or above your normal maximum Gnats sends the swarm diving at your cursor, exploding on impact for 600% bite damage.'), { fullDive: true }),
    evolve(n('quiet_flutter', 'Swarm Incarnate', 'Merges your Gnats into a single giant Gnat whose life, damage, and size scale with the number of Gnats combined, gaining +1 protective ply at 4, 9, 16, and 25+ Gnats.'), { cluster: true })],
], [
  evolve(n('battle_hatching', 'Battle Brood', 'Your hits and minion hits grant 3 hatch progress while equipped. At 100 progress, spawns half of your missing Gnats (rounded up).'), { hitFill: 3 }),
  [evolve(n('rich_hatch', 'Volatile Clutch', 'Spawned Gnat pickups become eggs near enemies that hold 4 Gnats each. Collecting an egg releases the Gnats and bursts for 400% bite damage per Gnat.'), { eggs: 4 }),
    evolve(n('burst_hatch', 'Untouchable Flight', 'Gnats are untargetable and immune to damage while unattached to an enemy.'), { transitImmune: true }),
    evolve(n('ravenous_motes', 'Ravenous Motes', 'Gnats deal 60% more damage with bites, contact hits, and egg bursts.'), { damageMore: 0.6 })],
  [evolve(n('walking_conductor', 'Frenzied Conductor', '+15% movement speed while channeling. While channeled, Gnats gain 100% more movement speed, 75% more attack speed, and 25% more damage.', [mod('channelMobility', 'flat', 0.15)]), { conductFury: true }),
    evolve(n('tireless_conductor', 'Cyclone of Wings', 'While channeling, Gnats whirl around you instead of following your cursor, dealing full bite damage to enemies they pass through (up to once every 0.35s per Gnat).'), { conductFury: true, whirlwind: true }),
    evolve(n('frenzied_wings', 'Splintering Bites', 'Gnat attacks deal 35% splash damage to nearby enemies. Gnats gain +1 protective ply.', [mod('minionPlies', 'flat', 1)]), { splashScale: 0.35 })],
], n('veil_tending', 'Veil Tending', '20% increased minion life and damage, and 50% increased Gnats gained from pickups.', [mod('minionLife', 'increased', 0.2), mod('minionDamage', 'increased', 0.2), mod('throngYield', 'increased', 0.5)]));
