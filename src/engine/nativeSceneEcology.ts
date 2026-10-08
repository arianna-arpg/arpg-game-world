/** Exact native ecology birth operations. Original World SHA ea6d4df5e016cb430d0d23ec7aa354423f843ae27543973ebd18aaa3aa18fb4e.
 * Installed source imports remain native; no immutable source issuer is claimed. */
import type { World } from './world';
import { rand, vec, type Vec2 } from '../core/math';
import { Actor } from './actor';
import { instanceMods, instanceThrongSources, skillContextTags, type SkillInstance } from './skills';
import { MONSTERS } from '../data/monsters';
import { type ZoneDef } from '../data/zones';
import { type Doodad } from './levelgen';
import { lightwellOf } from './lightwells';
import { Rng } from '../core/rng';
import { fieldSurgeWindow, nextSurgeAfter, type GeyserSurgeRead } from './geysers';
import { THRONG_CFG, throngPocketKey, throngSkillSalt, throngSpecsOn, type ThrongSourceRow, type ThrongSpec } from './throng';
import { substituteThrongKind } from './fieldgrants';
import { LITE_CFG, resolveLiteKind, type LiteCond, type LitePocket, type LiteRegenSpec, type LiteSwarmRow } from './lite';
export interface NativeSceneEcologySources { readonly XP_SCALE:number }
export interface NativeSceneEcologyHost {
  seats:World['seats'];
  throngSources:World['throngSources'];
  currentZoneSeed:World['currentZoneSeed'];
  mintThrongPocket:World['mintThrongPocket'];
  interactSpot:World['interactSpot'];
  zone:World['zone'];
  throngClaimed:World['throngClaimed'];
  mintThrongHusk:World['mintThrongHusk'];
  createMonster:World['createMonster'];
  time:World['time'];
  clampPos:World['clampPos'];
  actors:World['actors'];
  lite:World['lite'];
  liteKinds:World['liteKinds'];
  arena:World['arena'];
  liteKindIdxMap:World['liteKindIdxMap'];
  liteMaxR:World['liteMaxR'];
  liteBeatAt:World['liteBeatAt'];
  liteOrders:World['liteOrders'];
  liteXpAcc:World['liteXpAcc'];
  liteKills:World['liteKills'];
  litePromoteBudget:World['litePromoteBudget'];
  litePockets:World['litePockets'];
  liteBurrows:World['liteBurrows'];
  liteWhenCueDraws:World['liteWhenCueDraws'];
  liteColonySeen:World['liteColonySeen'];
  liteRegenClock:World['liteRegenClock'];
  liteHasTrample:World['liteHasTrample'];
  liteMinTrampleSpeed:World['liteMinTrampleSpeed'];
  liteVentRows:World['liteVentRows'];
  liteCondHeld:World['liteCondHeld'];
  liteKindOf:World['liteKindOf'];
  litePocketEnsure:World['litePocketEnsure'];
  liteOpenAt:World['liteOpenAt'];
  actorById:World['actorById'];
  arenaHull:World['arenaHull'];
  walk:World['walk'];
  litePocketPush:World['litePocketPush'];
  litePlantBurrow:World['litePlantBurrow'];
  geyserSurge:World['geyserSurge'];
  radianceCondHeld:World['radianceCondHeld'];
  geysers:World['geysers'];
  doodads:World['doodads'];
  markDoodadsChanged:World['markDoodadsChanged'];
  wellSeq:World['wellSeq'];
}
export function sceneBootThrong(host:Pick<NativeSceneEcologyHost,'seats'|'throngSources'|'currentZoneSeed'|'mintThrongPocket'>, pois: Vec2[]):void {
    const anchors = new Map<string, { inst: SkillInstance; spec: ThrongSpec; keeper: Actor }>();
    for (const seat of host.seats) {
      for (const { inst, spec } of throngSpecsOn(seat.actor.skills)) {
        if (anchors.has(inst.def.id)) continue; // first seat's anchor wins
        if (host.throngSources(inst, spec).some(r => r.kind === 'pocket')) {
          anchors.set(inst.def.id, { inst, spec, keeper: seat.actor });
        }
      }
    }
    if (!anchors.size) return;
    for (const skillId of [...anchors.keys()].sort()) {
      const { inst, spec, keeper } = anchors.get(skillId)!;
      const tags = skillContextTags(inst);
      const extra = instanceMods(inst);
      const yieldMul = keeper.sheet.get('throngYield', tags, extra);
      const rng = new Rng(((host.currentZoneSeed ^ THRONG_CFG.salt) ^ throngSkillSalt(skillId)) >>> 0);
      let pocket = 0;
      let firstRow: Extract<ThrongSourceRow, { kind: 'pocket' }> | undefined;
      let firstHas = false;
      for (const row of host.throngSources(inst, spec)) {
        if (row.kind !== 'pocket') continue;
        const has = row.chance === undefined || rng.next() < row.chance;
        if (!firstRow) { firstRow = row; firstHas = has; }
        const n = rng.int(row.perZone[0], row.perZone[1]);
        for (let p = 0; p < n; p++, pocket++) {
          host.mintThrongPocket(rng, pois, skillId, row, pocket, has, spec.monsterId, yieldMul, keeper, inst);
        }
      }
      if (firstRow) {
        const bonus = Math.max(0, Math.round(keeper.sheet.get('throngPockets', tags, extra)));
        for (let p = 0; p < bonus; p++, pocket++) {
          host.mintThrongPocket(rng, pois, skillId, firstRow, pocket, firstHas, spec.monsterId, yieldMul, keeper, inst);
        }
      }
    }
  }

export function sceneThrongSources(host:Pick<NativeSceneEcologyHost,never>, inst: SkillInstance, spec: ThrongSpec):ThrongSourceRow[] {
    const grafts = instanceThrongSources(inst);
    return grafts.length ? [...spec.sources, ...grafts] : spec.sources;
  }

export function sceneMintThrongPocket(host:Pick<NativeSceneEcologyHost,'interactSpot'|'currentZoneSeed'|'zone'|'throngClaimed'|'mintThrongHusk'>, rng: Rng, pois: Vec2[], skillId: string, row: Extract<ThrongSourceRow, { kind: 'pocket' }>, pocket: number, has: boolean, monsterId: string, yieldMul: number, keeper: Actor, inst: SkillInstance):void {
    const heart = host.interactSpot(pois, rng, THRONG_CFG.pocket.reach, THRONG_CFG.pocket.portalClear);
    const fork = new Rng((((host.currentZoneSeed ^ THRONG_CFG.salt) ^ throngSkillSalt(skillId))
      + Math.imul(pocket + 1, 0x9e3779b9)) >>> 0);
    const cluster = Math.max(1, Math.round(fork.int(row.cluster[0], row.cluster[1]) * yieldMul));
    // One decision for the whole pocket, on a SEPARATE stream. Neither
    // transmutation nor its absence can move the pocket hearts or seats.
    const morphRng = new Rng(host.currentZoneSeed ^ throngSkillSalt(`${skillId}:${pocket}:morph`));
    const kind = substituteThrongKind(monsterId, keeper, inst, () => morphRng.next(),
      stat => keeper.sheet.get(stat, skillContextTags(inst), instanceMods(inst)));
    for (let s = 0; s < cluster; s++) {
      const ang = fork.range(0, Math.PI * 2);
      const d = fork.range(6, THRONG_CFG.pocket.scatter);
      const key = throngPocketKey(host.zone.id, skillId, pocket, s);
      if (!has || host.throngClaimed.has(key)) continue;
      host.mintThrongHusk(kind, vec(
        heart.x + Math.cos(ang) * d, heart.y + Math.sin(ang) * d), { pocketKey: key, affinity: monsterId });
    }
  }

export function sceneMintThrongHusk(host:Pick<NativeSceneEcologyHost,'createMonster'|'zone'|'time'|'clampPos'|'actors'>, monsterId: string, pos: Vec2, opts?: { pocketKey?: string; ttl?: number; tier?: number; affinity?: string }):Actor | null {
    if (!MONSTERS[monsterId]) return null;
    const husk = host.createMonster(monsterId, Math.max(1, host.zone.level), 'enemy');
    husk.throngWild = opts?.affinity ?? monsterId;
    // THE SAME-STORY LAW: a husk wears the story it condensed on (its
    // minter's — a kill's victim, the keeper, a mote's body; pockets seed
    // the ground) and seats on that story's own floor.
    husk.tier = opts?.tier ?? 0;
    husk.passive = true;
    husk.untargetable = true;
    husk.invulnerable = true;
    husk.noBounty = true;
    if (opts?.pocketKey) husk.throngPocketKey = opts.pocketKey;
    if (opts?.ttl !== undefined) husk.throngExpiresAt = host.time + opts.ttl;
    husk.pos = host.clampPos(vec(pos.x, pos.y), husk.radius, undefined, { mover: husk });
    host.actors.push(husk);
    return husk;
  }

export function sceneBootLite(host:Pick<NativeSceneEcologyHost,'lite'|'liteKinds'|'arena'|'liteKindIdxMap'|'liteMaxR'|'liteBeatAt'|'liteOrders'|'liteXpAcc'|'liteKills'|'litePromoteBudget'|'litePockets'|'liteBurrows'|'liteWhenCueDraws'|'liteColonySeen'|'liteRegenClock'|'liteHasTrample'|'liteMinTrampleSpeed'|'liteVentRows'|'currentZoneSeed'|'liteCondHeld'|'interactSpot'|'liteKindOf'|'litePocketEnsure'|'liteOpenAt'|'seats'|'actorById'>, def: ZoneDef, pois: Vec2[]):void {
    const pool = host.lite;
    const carried: { owner: number; defId: string; plies: number }[] = [];
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i] || !pool.owner[i]) continue;
      const k = host.liteKinds[pool.kind[i]];
      if (k) carried.push({ owner: pool.owner[i], defId: k.defId, plies: pool.plies[i] });
    }
    pool.reset(host.arena.w, host.arena.h);
    host.liteKinds = [];
    host.liteKindIdxMap.clear();
    host.liteMaxR = 0;
    host.liteBeatAt.clear();
    host.liteOrders.clear();
    host.liteXpAcc = 0;
    host.liteKills.clear();
    host.litePromoteBudget = 0;
    host.litePockets = [];
    host.liteBurrows = [];
    host.liteWhenCueDraws = [];
    host.liteColonySeen.clear();
    host.liteRegenClock = 0;
    host.liteHasTrample = false;
    host.liteMinTrampleSpeed = Infinity;
    const spec = def.theme.lite;
    host.liteVentRows = [];
    if (spec?.swarms.length) {
      const rng = new Rng((host.currentZoneSeed ^ LITE_CFG.salt) >>> 0);
      for (const row of spec.swarms) {
        // THE VENT SEAT (LiteSwarmRow.seat 'vents'): a row that seats AT the
        // zone's geyser vents is deferred past bootGeysers (the vents do not
        // stand yet) onto its own salted lane — bootLiteVentSeats — and
        // spends NOTHING here, so the POI stream keeps its exact shape.
        if (row.seat === 'vents') { host.liteVentRows.push(row); continue; }
        const has = rng.next() < (row.chance ?? 1);
        const pockets = rng.int(row.pockets[0], row.pockets[1]);
        // THE CONDITIONED POUR (LiteSwarmRow.when): an out-of-hour row still
        // rolls its whole shape and SEATS its pockets (the salted stream's
        // draws are sacred — held or not, every roll happens), but pours no
        // bodies yet; the regrowth sweep raises the tide when the hour
        // comes. Its retired caption draws wait at the same native boundary.
        const held = host.liteCondHeld(row.when);
        let poured = false;
        for (let p = 0; p < pockets; p++) {
          const heart = host.interactSpot(pois, rng, LITE_CFG.pour.reach, LITE_CFG.pour.portalClear);
          const n = rng.int(row.size[0], row.size[1]);
          // THE REGROWTH LAW: a regen-bearing row's pocket remembers this
          // heart + rolled size as its cap (resolved once, no extra draws —
          // the salted stream's fixed shape holds).
          let pk = -1;
          for (let s = 0; s < n; s++) {
            const ang = rng.range(0, Math.PI * 2);
            const d = rng.range(4, LITE_CFG.pour.scatter);
            if (!has) continue;
            const kindIdx = host.liteKindOf(row.monsterId);
            if (kindIdx < 0) continue;
            if (pk === -1) pk = host.litePocketEnsure(row, kindIdx, heart, n);
            if (!held) continue; // the seats stand; the bodies wait for the hour
            const bx = heart.x + Math.cos(ang) * d, by = heart.y + Math.sin(ang) * d;
            const open = host.liteOpenAt(bx, by);
            if (pool.spawn(kindIdx, open ? bx : heart.x, open ? by : heart.y, 0, 0,
              host.liteKinds[kindIdx].plies0, pk >= 0 ? pk : -1) >= 0) {
              poured = true;
              if (pk >= 0) {
                host.litePockets[pk].poured = true;
                host.litePockets[pk].live++;
              }
            }
          }
        }
        if (poured && row.announce) {
          for (let seat = 0; seat < host.seats.length; seat++) rand(-10, 10);
        } else if (has && !held && row.when && row.announce) {
          host.liteWhenCueDraws.push(row.when);
        }
      }
    }
    for (let c = 0; c < carried.length; c++) {
      const row = carried[c];
      const keeper = host.actorById(row.owner);
      if (!keeper || keeper.dead) continue;
      if (!keeper.skills.some(s =>
        s?.def.throng?.tier === 'lite' && s.def.throng.monsterId === row.defId)) continue;
      const kindIdx = host.liteKindOf(row.defId);
      if (kindIdx < 0) continue;
      const ang = (c / Math.max(1, carried.length)) * Math.PI * 2;
      const bx = keeper.pos.x + Math.cos(ang) * 46, by = keeper.pos.y + Math.sin(ang) * 46;
      const open = host.liteOpenAt(bx, by);
      pool.spawn(kindIdx, open ? bx : keeper.pos.x, open ? by : keeper.pos.y,
        1, keeper.id, row.plies);
    }
  }

export function sceneLiteKindOf(host:Pick<NativeSceneEcologyHost,'liteKindIdxMap'|'zone'|'liteKinds'|'liteMaxR'|'liteHasTrample'|'liteMinTrampleSpeed'>, sources:NativeSceneEcologySources, defId: string):number {
    let idx = host.liteKindIdxMap.get(defId);
    if (idx !== undefined) return idx;
    const def = MONSTERS[defId];
    const kind = def ? resolveLiteKind(def, Math.max(1, host.zone.level), sources.XP_SCALE) : null;
    idx = kind ? host.liteKinds.length : -1;
    if (kind) {
      host.liteKinds.push(kind);
      host.liteMaxR = Math.max(host.liteMaxR, kind.radius);
      if (kind.trampleMinSpeed < Infinity) {
        host.liteHasTrample = true;
        host.liteMinTrampleSpeed = Math.min(host.liteMinTrampleSpeed, kind.trampleMinSpeed);
      }
    }
    host.liteKindIdxMap.set(defId, idx);
    return idx;
  }

export function sceneLiteOpenAt(host:Pick<NativeSceneEcologyHost,'arenaHull'|'walk'>, x: number, y: number):boolean {
    return x >= 0 && y >= 0 && x <= host.arenaHull.w && y <= host.arenaHull.h
      && (!host.walk || host.walk.isWalkable(x, y));
  }

export function sceneLitePocketEnsure(host:Pick<NativeSceneEcologyHost,'liteKinds'|'litePockets'|'litePocketPush'|'litePlantBurrow'>, row: LiteSwarmRow, kindIdx: number, heart: Vec2, cap: number):number {
    const kindRegen = host.liteKinds[kindIdx].regen;
    // A CONDITIONED row (row.when) breathes by the regrowth law even when
    // it never asked for regen — without a rate the tide could never rise
    // after an out-of-hour boot. Explicit specs still win.
    const regen = row.regen === true ? (kindRegen ?? {})
      : (row.regen ?? kindRegen ?? (row.when ? {} : undefined));
    if (!regen) return -2;
    const pk = host.litePockets.length;
    const vents = row.seat === 'vents';
    const p = host.litePocketPush(regen, kindIdx, heart.x, heart.y, cap, 0,
      vents ? LITE_CFG.ventSeat.scatter : undefined);
    if (row.when) p.when = row.when;
    // A VENT-seated pocket wears no burrow: the vent mouth IS its mark (the
    // steam you see rising is the heart you would exterminate).
    if (!vents) host.litePlantBurrow(pk, heart.x, heart.y, row.burrowKind);
    return pk;
  }

export function sceneLiteCondHeld(host:Pick<NativeSceneEcologyHost,'geyserSurge'|'radianceCondHeld'>, cond: LiteCond | undefined):boolean {
    if (!cond) return true;
    if (cond.surge !== undefined && (host.geyserSurge()?.held ?? false) !== cond.surge) return false;
    return host.radianceCondHeld(cond);
  }

export function sceneBootLiteVentSeats(host:Pick<NativeSceneEcologyHost,'liteVentRows'|'geysers'|'lite'|'currentZoneSeed'|'liteCondHeld'|'liteKindOf'|'litePocketEnsure'|'liteOpenAt'|'liteKinds'|'litePockets'|'seats'|'liteWhenCueDraws'>):void {
    const rows = host.liteVentRows;
    host.liteVentRows = [];
    const f = host.geysers;
    if (!rows.length || !f || !f.vents.length) return;
    const pool = host.lite;
    const rng = new Rng((host.currentZoneSeed ^ LITE_CFG.salt ^ LITE_CFG.ventSeat.salt) >>> 0);
    for (const row of rows) {
      const has = rng.next() < (row.chance ?? 1);
      const want = Math.min(f.vents.length, rng.int(row.pockets[0], row.pockets[1]));
      // Distinct vents, a seeded partial shuffle (every draw happens, minted or not).
      const order = f.vents.map((_, i) => i);
      for (let i = 0; i < want; i++) {
        const j = i + rng.int(0, order.length - 1 - i);
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      const held = host.liteCondHeld(row.when);
      let poured = false;
      for (let i = 0; i < want; i++) {
        const v = f.vents[order[i]];
        const heart = vec(v.pos.x, v.pos.y);
        const n = rng.int(row.size[0], row.size[1]);
        let pk = -1;
        for (let s = 0; s < n; s++) {
          const ang = rng.range(0, Math.PI * 2);
          const d = rng.range(4, LITE_CFG.ventSeat.scatter);
          if (!has) continue;
          const kindIdx = host.liteKindOf(row.monsterId);
          if (kindIdx < 0) continue;
          if (pk === -1) pk = host.litePocketEnsure(row, kindIdx, heart, n);
          if (!held) continue;
          const bx = heart.x + Math.cos(ang) * d, by = heart.y + Math.sin(ang) * d;
          const open = host.liteOpenAt(bx, by);
          if (pool.spawn(kindIdx, open ? bx : heart.x, open ? by : heart.y, 0, 0,
            host.liteKinds[kindIdx].plies0, pk >= 0 ? pk : -1) >= 0) {
            poured = true;
            if (pk >= 0) {
              host.litePockets[pk].poured = true;
              host.litePockets[pk].live++;
            }
          }
        }
      }
      if (poured && row.announce) {
        for (let seat = 0; seat < host.seats.length; seat++) rand(-10, 10);
      } else if (has && !held && row.when && row.announce) {
        host.liteWhenCueDraws.push(row.when);
      }
    }
  }

export function sceneLitePlantBurrow(host:Pick<NativeSceneEcologyHost,'doodads'|'markDoodadsChanged'|'liteBurrows'>, pk: number, x: number, y: number, kind?: string):void {
    const bk = kind ?? LITE_CFG.regen.burrowKind;
    if (!bk) return;
    const d: Doodad = { pos: vec(x, y), radius: 13, kind: bk as Doodad['kind'] };
    host.doodads.push(d);
    host.markDoodadsChanged();
    host.liteBurrows[pk] = d;
  }

export function sceneLitePocketPush(host:Pick<NativeSceneEcologyHost,'litePockets'>, spec: LiteRegenSpec, kindIdx: number, x: number, y: number, cap: number, anchorId: number, scatter: number | undefined):LitePocket {
    const p: LitePocket = {
      x, y, kindIdx,
      cap: Math.max(1, Math.min(255, Math.round(cap))),
      rate: spec.rate ?? LITE_CFG.regen.rate,
      quietSec: spec.quietSec ?? LITE_CFG.regen.quietSec,
      calmRadius: spec.calmRadius ?? LITE_CFG.regen.calmRadius,
      scatter: scatter ?? LITE_CFG.pour.scatter,
      anchorId,
      disturbedUntil: 0, acc: 0, live: 0, births: 0,
      poured: false, extinct: false,
    };
    host.litePockets.push(p);
    return p;
  }

export function sceneAttachZoneWells(host:Pick<NativeSceneEcologyHost,'doodads'|'wellSeq'|'markDoodadsChanged'>):void {
    let changed = false;
    for (const d of host.doodads) {
      if (d.well) continue;
      const def = lightwellOf(d.kind);
      if (!def) continue;
      if (def.pool !== undefined) { d.well = { power: def.pool, max: def.pool, id: ++host.wellSeq }; changed = true; }
      else if (def.burst) { d.well = { power: 1, max: 1, id: ++host.wellSeq }; changed = true; }
    }
    if (changed) host.markDoodadsChanged();
  }

export function sceneGeyserSurge(host:Pick<NativeSceneEcologyHost,'geysers'|'time'>):GeyserSurgeRead | null {
    const f = host.geysers;
    if (!f) return null;
    const win = fieldSurgeWindow(f, host.time);
    const key = f.surgeKey;
    if (win) return { held: host.time < win.t1, t0: win.t0, t1: win.t1, forced: !!f.surgeForce, next: null };
    if (key === undefined) return null;
    return { held: false, t0: 0, t1: 0, forced: false, next: nextSurgeAfter(key, host.time).t0 };
  }

export function sceneActorById(host:Pick<NativeSceneEcologyHost,'actors'>, id: number):Actor | undefined {
    return host.actors.find(a => a.id === id);
  }
