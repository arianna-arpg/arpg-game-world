/** Exact native occurrence ownership and the generation-time trace reset. */
import type { World } from './world';
import { rand, randInt, vec } from '../core/math';
import { FACTIONS, MONSTERS } from '../data/monsters';
import { OCC_CFG, type OccHost, type OccKinSpec, type OccKinRow } from './occurrences';

export interface NativeSceneOccurrenceHost {
 occHostObj:OccHost|undefined;
 readonly time:World['time']; readonly zone:World['zone']; readonly player:World['player'];
 readonly occDisturbs:World['occDisturbs']; readonly doodads:World['doodads']; readonly actors:World['actors'];
 shake:World['shake']; readonly flashes:World['flashes'];
 readonly markDoodadsChanged:World['markDoodadsChanged'];
 readonly massOccurrenceSpawnTable:World['massOccurrenceSpawnTable'];
 readonly weightedPick:World['weightedPick']; readonly createMonster:World['createMonster']; readonly clampPos:World['clampPos'];
}
export interface NativeSceneTraceResetHost {
 traceRuns:World['traceRuns']; readonly timeflow:Pick<World['timeflow'],'release'>;
}

export function sceneOccurrenceHost(host:NativeSceneOccurrenceHost):OccHost {
    // SOVEREIGNTY: seat — a host object — no touch (the derived census, probe_tiers RIG T).
    return host.occHostObj ??= {
      timeOf: () => host.time,
      zoneLevel: () => host.zone.level,
      heroDist: (x, y) => host.player.dead
        ? Infinity : Math.hypot(host.player.pos.x - x, host.player.pos.y - y),
      disturbedNear: (x, y, r) =>
        host.occDisturbs.some(p => Math.hypot(p.x - x, p.y - y) <= r),
      dice: (a, b) => rand(a, b),
      diceInt: (a, b) => randInt(a, b),
      plant: (row) => {
        host.doodads.push({
          pos: vec(row.x, row.y), radius: row.r, kind: row.kind,
          ...(row.rot !== undefined ? { rot: row.rot } : {}),
          ...(row.fall ? { fall: true } : {}),
        });
        host.markDoodadsChanged();
      },
      pour: (spec: OccKinSpec, x, y, band, n) => {
        const table = host.massOccurrenceSpawnTable(spec);
        if (!table.length) return 0;
        const tag = spec.tag ?? OCC_CFG.bornTag;
        let spawned = 0;
        for (let i = 0; i < n; i++) {
          const type = host.weightedPick(table, host.zone.level);
          const m = host.createMonster(type,
            Math.max(1, host.zone.level + (spec.levelBonus ?? 0)), 'enemy');
          const ang = rand(0, Math.PI * 2);
          const rr = rand(band[0], band[1]);
          m.pos = host.clampPos(vec(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr), m.radius);
          m.tag = tag;
          host.actors.push(m);
          spawned++;
        }
        return spawned;
      },
      tagCount: (tag) => host.actors.filter(a => !a.dead && a.tag === tag).length,
      // Show, don't tell: cracks, tremor, eruption and living bodies carry local events.
      announce: () => {},
      rumble: (mag) => { host.shake = Math.max(host.shake, mag); },
      flash: (x, y, radius, color) =>
        host.flashes.push({ pos: vec(x, y), radius, color, life: 0.5, maxLife: 0.5 }),
    };
  }

export function sceneOccurrenceSpawnTable(spec:OccKinSpec):OccKinRow[] {
    let table=(spec.kin??[]).filter(en=>MONSTERS[en.id]);
    if(!table.length&&spec.faction)table=(FACTIONS[spec.faction]?.table??[]).filter(en=>{
      const d=MONSTERS[en.id];return !!d&&!d.boss&&!d.passive&&!d.spawner;
    });
    return table.map(row=>({...row}));
  }

export function sceneAbortTraces(host:NativeSceneTraceResetHost):void {
    for (const r of host.traceRuns) if (r.held) host.timeflow.release('trace');
    host.traceRuns = [];
  }
