/** Exact native secret opening operations. Mutable scene/campaign/reward services are explicit; no installed-source or full reward authority is claimed. */
import type {World} from './world';
import type {Actor} from './actor';
import type {Doodad,AnnexSpec} from './levelgen';
import {GridWalkField} from '../world/gridWalk';
import {hullOf} from '../world/shape';
import {vec} from '../core/math';
import {Rng} from '../core/rng';
import {hollowDef} from '../data/hollows';
import {annexKindDef,annexParentIdOf} from '../data/annexes';
import {sidezoneOf} from '../data/sidezones';
export interface NativeSceneOpeningHost {
 openedHollows:World['openedHollows'];
 zoneHollows:World['zoneHollows'];
 walk:World['walk'];
 doodads:World['doodads'];
 flashes:World['flashes'];
 zone:World['zone'];
 actors:World['actors'];
 caveEntrances:World['caveEntrances'];
 arena:World['arena'];
 annexOpen:World['annexOpen'];
 arenaHull:World['arenaHull'];
 annexFound:World['annexFound'];
 zoneAnnexSpecs:World['zoneAnnexSpecs'];
 zoneMap:World['zoneMap'];
 caveMap:World['caveMap'];
 zoneMemory:World['zoneMemory'];
 markDoodadsChanged:World['markDoodadsChanged'];
 createMonster:World['createMonster'];
 clampPos:World['clampPos'];
 weightedPick:World['weightedPick'];
 dropGemAt:World['dropGemAt'];
 shedOrb:World['shedOrb'];
 text:World['text'];
 annexFurnish:World['annexFurnish'];
 annexReveal:World['annexReveal'];
}
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function openNativeHollow(host:NativeSceneOpeningHost, id: string, _opener?: Actor | null, opts?: { silent?: boolean; revive?: boolean; bare?: boolean }):void {
    if (host.openedHollows.has(id)) return;
    const h = host.zoneHollows.find(s => s.id === id);
    if (!h) return;
    host.openedHollows.add(id);
    const walk = host.walk instanceof GridWalkField ? host.walk : null;
    if (walk) {
      const cs = walk.cell;
      // Inset a hair so the carve claims exactly the recorded cells (rect
      // edges sit on cell boundaries; fillRegion is inclusive of both ends).
      walk.fillRegion(h.rect.x + 1, h.rect.y + 1, h.rect.x + h.rect.w - 1, h.rect.y + h.rect.h - 1, 'ground');
      for (const s of h.seams) {
        walk.fillRegion(s.x - cs * 0.45, s.y - cs * 0.45, s.x + cs * 0.45, s.y + cs * 0.45, 'ground');
      }
    }
    for (let i = host.doodads.length - 1; i >= 0; i--) {
      const d = host.doodads[i];
      if (d.hollow === id) { d.gone = true; host.doodads.splice(i, 1); }
    }
    host.markDoodadsChanged();
    if (!opts?.silent) {
      host.flashes.push({
        pos: vec(h.rect.x + h.rect.w / 2, h.rect.y + h.rect.h / 2),
        radius: Math.max(h.rect.w, h.rect.h) * 0.7, color: '#d8c890', life: 0.35, maxLife: 0.35,
      });
    }
    if (opts?.bare) return;
    const def = hollowDef(h.kind);
    if (!def) return;
    const rng = new Rng(h.seed);
    const center = vec(h.rect.x + h.rect.w / 2, h.rect.y + h.rect.h / 2);
    const added: Doodad[] = [];
    def.reveal({
      center, rect: h.rect, rng, level: Math.max(1, host.zone.level), revive: !!opts?.revive,
      addDoodad: (d) => {
        const dd: Doodad = {
          pos: vec(d.pos.x, d.pos.y), radius: d.radius, kind: d.kind,
          ...(d.rot !== undefined ? { rot: d.rot } : {}),
        };
        host.doodads.push(dd);
        added.push(dd);
      },
      spawnEnemy: (mid, pos) => {
        const m = host.createMonster(mid, Math.max(1, host.zone.level), 'enemy');
        m.pos = host.clampPos(vec(pos.x, pos.y), m.radius);
        m.fromZoneGen = true; // zone memory captures the pocket's survivors
        host.actors.push(m);
      },
      packPick: () => host.zone.packs?.table?.length
        ? host.weightedPick(host.zone.packs.table, Math.max(1, host.zone.level)) : null,
      dropGem: (pos) => host.dropGemAt(vec(pos.x, pos.y)),
      shedOrb: (kind, pos) => host.shedOrb(kind, vec(pos.x, pos.y)),
      text: (pos, msg, color) => host.text(vec(pos.x, pos.y), msg, color ?? '#d8c890', 12),
    });
    if (added.length) host.markDoodadsChanged();
    // A revealed SIDEZONE MOUTH (the crevice shaft) joins the dwell registry
    // live, with the same position-hash seed loadZone derives — the reveal's
    // own seeded stream fixes the shaft's position, so the reopened hollow
    // descends into the SAME deeper cave on every visit.
    for (const d of added) {
      if (d.kind === 'cave_entrance' || !sidezoneOf(d.kind)) continue;
      const pos = host.clampPos(vec(d.pos.x, d.pos.y), 28);
      host.caveEntrances.push({
        pos,
        seed: hashStr(`${host.zone.id}:${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`),
        kind: d.kind,
        roof: null,
        mouthTier: d.tier,
      });
    }
  }

export function revealNativeAnnex(host:NativeSceneOpeningHost, pieceId: string, opts?: { silent?: boolean; revive?: boolean; bare?: boolean }):boolean {
    const pc = host.arena.pieces?.find(q => q.id === pieceId);
    if (!pc) return false;
    if (host.annexOpen.has(pieceId)) return true;
    pc.active = true;
    host.annexOpen.add(pieceId);
    host.arenaHull = hullOf(host.arena);
    // FOUND IS FOUND (her ruling): the find outlives zone memory — the boot
    // replay reads this back beyond the TTL. The mundane zone re-dresses on
    // its own clock; the broken wall stays broken.
    host.annexFound.add(`${host.zone.id}:${pieceId}`);
    const spec = host.zoneAnnexSpecs.find(s => s.piece === pieceId);
    // THE CARVE (grid zones): repaint the recorded chamber + mouth run.
    if (spec?.carve && host.walk instanceof GridWalkField) {
      for (const r of spec.carve) {
        host.walk.fillRegion(r.x + 1, r.y + 1, r.x + r.w - 1, r.y + r.h - 1, 'ground');
      }
    }
    // The face dies (a struck ring-0 face was already spliced by its pop;
    // replays and remote reveals splice here), and the CHILD faces stand up
    // inside the freshly opened ground.
    let dressed = false;
    for (let i = host.doodads.length - 1; i >= 0; i--) {
      const d = host.doodads[i];
      if (d.annex === pieceId) { d.gone = true; host.doodads.splice(i, 1); dressed = true; }
    }
    const faceR = (host.walk instanceof GridWalkField ? host.walk.cell : 30) * 0.62;
    for (const cs of host.zoneAnnexSpecs) {
      if (annexParentIdOf(cs.piece) !== pieceId) continue;
      if (host.annexOpen.has(cs.piece)) continue;
      if (host.doodads.some(d => d.annex === cs.piece)) continue;
      const face = annexKindDef(cs.kind)?.face;
      if (!face) continue;
      host.doodads.push({ pos: vec(cs.face.x, cs.face.y), radius: faceR, kind: face, annex: cs.piece });
      dressed = true;
    }
    if (dressed) host.markDoodadsChanged();
    if (!opts?.silent) {
      // THE QUIET RECLASS: no text box — one soft pulse at the broken FACE
      // (the wall the player watched), never the unseen annex heart; the
      // faceless dev/QA lane keeps the centroid pulse.
      const at = spec ? spec.face : vec(pc.x + pc.w / 2, pc.y + pc.h / 2);
      host.flashes.push({
        pos: vec(at.x, at.y),
        radius: spec ? 52 : Math.max(pc.w, pc.h) * 0.4, color: '#d8c890', life: 0.4, maxLife: 0.4,
      });
    }
    // FURNISH (host business — the client passes bare and takes the host's
    // doodad/actor streams): the kind dresses its ground from the piece's
    // own seed; loot pays once ever (the revive discipline).
    if (!opts?.bare && spec) host.annexFurnish(spec, pc, !!opts?.revive);
    return true;
  }

export function furnishNativeAnnex(host:NativeSceneOpeningHost, spec: AnnexSpec, pc: { seed?: number }, revive: boolean):void {
    const kd = annexKindDef(spec.kind);
    if (!kd) return;
    const rng = new Rng((pc.seed ?? hashStr(`${host.zone.id}:${spec.piece}`)) >>> 0);
    const center = vec(spec.rect.x + spec.rect.w / 2, spec.rect.y + spec.rect.h / 2);
    const added: Doodad[] = [];
    kd.furnish({
      center, rect: spec.rect, rng, level: Math.max(1, host.zone.level), revive,
      addDoodad: (d) => {
        const dd: Doodad = {
          pos: vec(d.pos.x, d.pos.y), radius: d.radius, kind: d.kind,
          ...(d.rot !== undefined ? { rot: d.rot } : {}),
        };
        host.doodads.push(dd);
        added.push(dd);
      },
      spawnEnemy: (mid, pos) => {
        const m = host.createMonster(mid, Math.max(1, host.zone.level), 'enemy');
        m.pos = host.clampPos(vec(pos.x, pos.y), m.radius);
        m.fromZoneGen = true; // zone memory captures the annex's survivors
        host.actors.push(m);
      },
      packPick: () => host.zone.packs?.table?.length
        ? host.weightedPick(host.zone.packs.table, Math.max(1, host.zone.level)) : null,
      dropGem: (pos) => host.dropGemAt(vec(pos.x, pos.y)),
      shedOrb: (kind, pos) => host.shedOrb(kind, vec(pos.x, pos.y)),
    });
    if (added.length) host.markDoodadsChanged();
  }

export function activateNativeAnnex(host:NativeSceneOpeningHost, zoneId: string, pieceId: string):boolean {
    if (zoneId === host.zone.id) return host.annexReveal(pieceId);
    const def = host.zoneMap[zoneId] ?? host.caveMap[zoneId];
    if (!def?.annexes?.some(r => r.id === pieceId)) return false;
    host.annexFound.add(`${zoneId}:${pieceId}`);
    const m = host.zoneMemory.get(zoneId);
    if (m) {
      if (!m.annexOpen) m.annexOpen = [];
      if (!m.annexOpen.includes(pieceId)) m.annexOpen.push(pieceId);
    }
    return true;
  }
