/** Exact native bounty site creation and arrival/readiness operations.
 * Installed source callbacks use the complete explicit campaign read context. */
import type { World } from './world';
import { vec, type Vec2 } from '../core/math';
import { Actor } from './actor';
import { MONSTERS } from '../data/monsters';
import { type ZoneDef } from '../data/zones';
import { HARVEST_CFG } from './harvest';
import { harvestRowsFor } from '../data/harvest';
import { BOUNTY_CFG } from '../data/bounties';
import { type Doodad } from './levelgen';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, postingQuestDef } from '../data/bountyboard';
import { type BountyPosting } from '../data/bountyboard';
import { QUESTS } from '../quests/defs';
import type { QuestDef } from '../quests/types';
import { type QuestStanding } from '../quests/types';
import { Rng } from '../core/rng';
import { mintNemesisName } from '../meta/nemesis';
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** Complete installed entry/readiness/copy context, including package census.
 * Roll/accept/annul/route APIs retain their full native World contracts. */
export interface NativeBountyReadContext extends Pick<World,'zoneMap'|'visited'|'ledger'|'sim'|'massRuntime'|'objectiveDoneAt'> {}
export interface NativeSceneBountyHost extends NativeBountyReadContext {
 bountyHands:World['bountyHands'];
 actors:World['actors'];
 effectiveSpawn:World['effectiveSpawn'];
 baseTable:World['baseTable'];
 weightedPick:World['weightedPick'];
 createMonster:World['createMonster'];
 spawnPoint:World['spawnPoint'];
 countedEnemies:World['countedEnemies'];
 promoteRarityStacked:World['promoteRarityStacked'];
 harvestNodes:World['harvestNodes'];
 currentZoneSeed:World['currentZoneSeed'];
 harvestRowPick:World['harvestRowPick'];
 interactSpot:World['interactSpot'];
 clampPos:World['clampPos'];
 doodads:World['doodads'];
 markDoodadsChanged:World['markDoodadsChanged'];
 clientActionHook:World['clientActionHook'];
 charDirty:World['charDirty'];
 noteBountyReady:World['noteBountyReady'];
 activeQuests:World['activeQuests'];
 handState:World['handState'];
 notice:World['notice'];
 questDefOf:World['questDefOf'];
 completedObjectives:World['completedObjectives'];
}
export function sceneSeedCullMarks(host:NativeSceneBountyHost, def: ZoneDef, rng: { int(a: number, b: number): number; next(): number }):void {
    for (const p of host.bountyHands) {
      if (p.kind !== 'cull' || p.zoneId !== def.id || !p.cull) continue;
      const standing = host.actors.filter(a => !a.dead && a.tag === 'bounty_mark').length;
      const need = Math.max(0, p.cull.count - p.cull.claimed - standing);
      if (!need) continue;
      const { table } = host.effectiveSpawn(def, host.baseTable(def));
      const eligible = table.filter(en => {
        const md = MONSTERS[en.id];
        return !!md && !md.passive && !md.noObjective && !md.spawner && !md.npcRole;
      });
      for (let i = 0; i < need; i++) {
        let m: Actor | null;
        if (eligible.length) {
          const type = host.weightedPick(eligible, Math.max(1, p.challengeLevel ?? def.level));
          m = host.createMonster(type, Math.max(1, p.challengeLevel ?? def.level), 'enemy');
          m.pos = host.spawnPoint(24);
          host.actors.push(m);
        } else {
          m = host.countedEnemies().find(a =>
            a.tag !== 'bounty_mark' && (a.rarity ?? 'normal') === 'normal') ?? null;
          if (!m) break;
        }
        host.promoteRarityStacked(m, BOUNTY_CFG.rarity, BOUNTY_CFG.stacks);
        const fac = m.faction ?? (m.defId ? MONSTERS[m.defId]?.faction : undefined) ?? '';
        let name = mintNemesisName(fac, () => rng.next());
        for (let tries = 0; tries < 4 && host.actors.some(a => a !== m && a.tag === 'bounty_mark' && a.name === name); tries++) {
          name = mintNemesisName(fac, () => rng.next());
        }
        m.name = name;
        m.tag = 'bounty_mark';
      }
    }
  }

export function sceneSeedGatherNodes(host:NativeSceneBountyHost, def: ZoneDef, pois: Vec2[]):void {
    for (const p of host.bountyHands) {
      if (p.kind !== 'gather' || p.zoneId !== def.id || !p.gather) continue;
      if (p.gather.claimed >= p.gather.count) continue;
      if (def.objective.kind === 'safe' || def.spoils === 'none') continue;
      const rows = harvestRowsFor(def.biome, def.tileset);
      if (!rows.length) continue; // structurally excluded at the roll; belt and braces
      const live = host.harvestNodes.filter(n => !n.spent).length;
      const need = Math.max(0, p.gather.count - p.gather.claimed - live);
      if (!need) continue;
      const grng = new Rng((host.currentZoneSeed ^ HARVEST_CFG.salt ^ hashStr(p.id)) >>> 0);
      for (let i = 0; i < need; i++) {
        const row = host.harvestRowPick(rows, grng);
        const at = host.interactSpot(pois, grng, 620, HARVEST_CFG.portalClear);
        const pos = host.clampPos(vec(at.x, at.y), HARVEST_CFG.nodeRadius);
        const d: Doodad = {
          pos: vec(pos.x, pos.y), radius: HARVEST_CFG.nodeRadius, kind: row.kind,
        };
        host.doodads.push(d);
        host.harvestNodes.push({ pos: vec(pos.x, pos.y), def: row, doodad: d, spent: false });
      }
      host.markDoodadsChanged();
    }
  }

export function sceneNoteBountyArrivals(host:NativeSceneBountyHost, def: ZoneDef, firstVisit: boolean, from?: string):void {
    for (const p of host.bountyHands) {
      const row = BOUNTY_KINDS[p.kind];
      if (row?.arrival && !host.clientActionHook) { row.arrival(host, p, def, firstVisit, from); host.charDirty = true; }
      if (p.zoneId !== def.id && !row?.arrival) continue;
      host.noteBountyReady(p);
    }
  }

export function sceneHandState(host:NativeSceneBountyHost, p: BountyPosting):QuestStanding {
    const row = BOUNTY_KINDS[p.kind];
    if (!row) return 'afield';
    if (p.failed === true || (row.failed?.(host, p) ?? false)) return 'failed';
    return row.done(host, p) ? 'ready' : 'afield';
  }

export function sceneNoteBountyReady(host:NativeSceneBountyHost, p: BountyPosting):void {
    const aq = host.activeQuests.find(e => e.questId === p.id);
    if (!aq) return;
    const standing = host.handState(p);
    if (standing === 'afield') {
      if (aq.fieldDone) { aq.fieldDone = false; host.charDirty = true; }
      return;
    }
    if (aq.fieldDone) return;
    aq.fieldDone = true;
    host.notice(standing === 'ready'
      ? (host.questDefOf(p.id)?.turnIn?.prompt ?? 'The ask is met — return to the bounty board to claim the pay.')
      : 'The ask has failed — return to the bounty board to hand the posting back.',
    BOUNTY_BOARD_CFG.accent, 16, 'civic');
    host.charDirty = true;
  }

export function sceneObjectiveDoneAt(host:NativeSceneBountyHost, zoneId: string):boolean {
    return host.completedObjectives.has(zoneId);
  }

export function sceneQuestDefOf(host:NativeSceneBountyHost, id: string):QuestDef | undefined {
    const q = QUESTS[id];
    if (q) return q;
    const p = host.bountyHands.find(h => h.id === id);
    return p ? postingQuestDef(p, host) : undefined;
  }
