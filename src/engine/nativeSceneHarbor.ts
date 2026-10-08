/** Exact harbor/quay birth closure; siege update/rewards are not supplied. */
import type {World} from './world';
import type {ZoneDef} from '../data/zones';
import type {Actor} from './actor';
import {vec,dist,rand,type Vec2} from '../core/math';
import {Rng} from '../core/rng';
import {doodadRuleOf,type Doodad,type PlacedStructure} from './levelgen';
import {isDoodadGround} from '../world/regions';
import {landMovementTether} from './movementTether';
import {HARBORHOLD_CFG,holdClassOf,holdActiveServices,type HarborholdState} from '../data/harborholds';
import {holdGateApron,holdGateDoor,holdSeatPos,holdStructureIn,rollHoldDressPieces} from '../world/harborholds';
export interface NativeSceneHarborHost {
 zoneMap:World['zoneMap'];
 holdStateFor:World['holdStateFor'];
 refreshHoldServices:World['refreshHoldServices'];
 text:World['text'];
 player:World['player'];
 structures:World['structures'];
 holdMissingWarned:World['holdMissingWarned'];
 setDoorState:World['setDoorState'];
 resealDoor:World['resealDoor'];
 doodads:World['doodads'];
 findFreeSpot:World['findFreeSpot'];
 markDoodadsChanged:World['markDoodadsChanged'];
 exits:World['exits'];
 entryFrom:World['entryFrom'];
 landPartyAt:World['landPartyAt'];
 clampPos:World['clampPos'];
 refreshHoldDress:World['refreshHoldDress'];
 notice:World['notice'];
 nativeGridAt:World['nativeGridAt'];
 zone:World['zone'];
 evaporating:World['evaporating'];
 holdDressSpotOk:World['holdDressSpotOk'];
 grounds:World['grounds'];
 actors:World['actors'];
 weightedPick:World['weightedPick'];
 createMonster:World['createMonster'];
 arena:World['arena'];
 armPortMercs:World['armPortMercs'];
 mercOutpost:World['mercOutpost'];
 restockOrdinal:World['restockOrdinal'];
 vendorArmedBeat:World['vendorArmedBeat'];
 chandlerStock:World['chandlerStock'];
 armVendorStock:World['armVendorStock'];
 syncHoldIdx:World['syncHoldIdx'];
 zoneHasVendorCounter:World['zoneHasVendorCounter'];
 vendorRestockAt:World['vendorRestockAt'];
 restockSeconds:World['restockSeconds'];
 mercSheetFor:World['mercSheetFor'];
 manifest:World['manifest'];
 dealTemplateOffers:World['dealTemplateOffers'];
 tierViews:World['tierViews'];
 seats:World['seats'];
 partyLand:typeof import('./world').PARTY_LAND_CFG;
}

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const GROUND_KINDS = {
  includes: (kind: string): boolean => isDoodadGround(kind),
};

export function harborHoldStateFor(host:NativeSceneHarborHost,def: ZoneDef): HarborholdState | null {
    if (def.harborhold) return def.harborhold;
    if (def.holdAnchor) return host.zoneMap[def.holdAnchor]?.harborhold ?? null;
    return null;
  }

export function harborBootQuay(host:NativeSceneHarborHost,def: ZoneDef): void {
    const hold = host.holdStateFor(def);
    if (!hold) return;
    host.refreshHoldServices(def);
    if (hold.state === 'besieged') {
      host.text(vec(host.player.pos.x, host.player.pos.y - 106),
        `${def.name} waits under a besieged hold — break the siege at the gate to open its counters`, '#e8a050', 14);
    } else if (hold.state === 'fallen') {
      host.text(vec(host.player.pos.x, host.player.pos.y - 106),
        `the hold above ${def.name} lies burned — its counters stand shut`, '#e8a050', 14);
    }
  }

export function harborBootHarborhold(host:NativeSceneHarborHost,def: ZoneDef): void {
    const hold = def.harborhold;
    if (!hold) return;
    const cls = holdClassOf(hold);
    const ps = holdStructureIn(host.structures, cls.structure);
    if (!ps) {
      // The zone couldn't seat its town (a tight arena) — degrade to the
      // pre-fabric bare quay on this ground; dock and cast-off still work.
      if (!host.holdMissingWarned.has(def.id)) {
        host.holdMissingWarned.add(def.id);
        console.warn(`[harborhold] ${def.id} seated no '${cls.structure}' — bare-quay degrade`);
      }
      return;
    }
    const gate = holdGateDoor(ps);
    if (gate) {
      if (hold.state === 'open') host.setDoorState(gate.door.id, 'open', { silent: true });
      else host.resealDoor(gate.door.id);
      // THE MUSTER HORN — the hold's one interaction post, on the gate apron.
      const at = holdGateApron(gate, 64);
      host.doodads.push({ pos: host.findFreeSpot(vec(at.x, at.y), 14), radius: 14, kind: 'muster_horn' });
      host.markDoodadsChanged();
    }
    // THE GATEWORK IS THE GATE (the harbor pair): the causeway portal to
    // the paired PORT repositions INSIDE the walls, onto the plan's own
    // court seat (HARBORHOLD_CFG.quay.gateSeat) — the holdfast doesn't
    // guard a road to a door somewhere else, it CONTAINS the door: break
    // the siege, walk through the fort, board the quay (the city-gate
    // read). Live-exit move only — the def keeps its side/at, so the map
    // road and genqa's rim-portal invariants are untouched; a bare-quay
    // degrade never reaches here (no `ps`) and keeps the rim portal, the
    // 'harborhold' lock still gating it.
    if (def.holdPort) {
      const qSeat = holdSeatPos(ps, HARBORHOLD_CFG.quay.gateSeat);
      const gateIdx = def.exits.findIndex(e => e.to === def.holdPort);
      const live = gateIdx >= 0 ? host.exits.find(e => e.defIndex === gateIdx) : undefined;
      if (qSeat && live) {
        live.pos = vec(qSeat.x, qSeat.y);
        // ARRIVALS FROM THE QUAY land where the walk says they should: at
        // the court portal while the hold stands OPEN; SKIRTED to the gate
        // apron outside the walls while it doesn't (the strand path around
        // the fort) — a sea arrival is never sealed inside a hostile ring,
        // and the muster horn stands right there.
        if (host.entryFrom === def.holdPort) {
          const at = hold.state === 'open' || !gate
            ? vec(qSeat.x, qSeat.y + 40)
            : holdGateApron(gate, 150);
          // THE PARTY-LANDING LAW: the whole party files onto the quay.
          host.landPartyAt(vec(at.x, at.y), { spread: 40, band: [20, 60] });
          if (hold.state !== 'open') {
            host.text(vec(at.x, at.y - 44),
              'the garrison bars the causeway behind you — sound the horn to break the siege', '#e8a050', 13);
          }
        }
      }
    }
    // THE QUAY BELT: the dock's fixed oceanward formula and the town's
    // findSpot seat are independent rolls — on the rare layout where the
    // dock lands INSIDE the walls, walk it out past the gate apron (an
    // arrival must never wake behind a sealed gate).
    const dock = host.doodads.find(d => d.kind === 'dock');
    if (dock && dock.pos.x > ps.rect.x && dock.pos.x < ps.rect.x + ps.rect.w
      && dock.pos.y > ps.rect.y && dock.pos.y < ps.rect.y + ps.rect.h) {
      const out = gate ? holdGateApron(gate, 140)
        : { x: ps.rect.x + ps.rect.w / 2, y: ps.rect.y + ps.rect.h + 120 };
      dock.pos = host.clampPos(vec(out.x, out.y), dock.radius);
      host.markDoodadsChanged();
    }
    host.refreshHoldDress(def);
    host.refreshHoldServices(def);
    // The discovery beat: the first meeting with a besieged harbor says so.
    if (hold.state === 'besieged' && !hold.defenses && !hold.falls) {
      host.notice(`${def.name} stands besieged — sound the horn at the gate to break it`, '#e8a050', 15, 'war');
    }
  }

export function harborResealDoor(host:NativeSceneHarborHost,id: string): void {
    const d = host.doodads.find(x => x.door?.id === id);
    if (!d?.door || d.door.broken || !d.door.open) return;
    d.door.open = false;
    const nativeSettlementGrid = host.nativeGridAt(d.pos);
    if (nativeSettlementGrid && d.door.cells) {
      const c = d.door.cells;
      nativeSettlementGrid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'rampart');
    }
    host.markDoodadsChanged();
  }

export function harborRefreshHoldDress(host:NativeSceneHarborHost,def: ZoneDef): void {
    if (host.zone.id !== def.id) return;
    const hold = def.harborhold;
    if (!hold) return;
    for (const d of host.doodads) {
      if (d.holdDress && !d.evap) { d.evap = { t: 0.2, rate: 40 }; host.evaporating.push(d); }
    }
    const rows = hold.state === 'fallen' ? HARBORHOLD_CFG.ruinDress
      : hold.state === 'besieged' ? HARBORHOLD_CFG.siegeDress : null;
    if (!rows) { host.markDoodadsChanged(); return; }
    const cls = holdClassOf(hold);
    const ps = holdStructureIn(host.structures, cls.structure);
    if (!ps) return;
    const gate = holdGateDoor(ps);
    const rng = new Rng(((def.seed ?? 0) ^ HARBORHOLD_CFG.dressSalt
      ^ (hold.state === 'fallen' ? 0x5 : 0x9)) >>> 0);
    const horn = host.doodads.find(x => x.kind === 'muster_horn');
    const pieces = rollHoldDressPieces(rng, rows, ps,
      gate ? { pos: gate.pos, normal: gate.normal } : null,
      (x, y, r) => host.holdDressSpotOk(x, y, r, ps, horn));
    for (const p of pieces) {
      const nd: Doodad = { pos: vec(p.x, p.y), radius: p.r, kind: p.kind, holdDress: true };
      const rEff = doodadRuleOf(nd.kind).effect;
      if (rEff) nd.effect = { ...rEff, cd: rand(0, rEff.interval) };
      host.doodads.push(nd);
    }
    host.grounds = host.doodads.filter(d => GROUND_KINDS.includes(d.kind));
    host.markDoodadsChanged();
    // THE CAMP WATCH (the sentry fabric): dormant besiegers planted at the
    // camp while besieged — texture that wakes (a wound rouses the camp;
    // the muster drafts it into wave 1). Retired quietly on any other state.
    const standing = host.actors.filter(a => a.tag === 'hold_camp' && !a.dead);
    if (hold.state !== 'besieged') {
      for (const a of standing) a.dead = true;
    } else if (gate && standing.length < cls.siege.campWatch) {
      const crng = new Rng(((def.seed ?? 0) ^ HARBORHOLD_CFG.dressSalt ^ 0xca38) >>> 0);
      const lvl = Math.max(1, def.level + cls.siege.levelBonus);
      const at0 = holdGateApron(gate, 120);
      for (let i = standing.length; i < cls.siege.campWatch; i++) {
        const type = host.weightedPick(cls.siege.table, lvl);
        const m = host.createMonster(type, lvl, 'enemy');
        const s = (i - (cls.siege.campWatch - 1) / 2) * 52;
        const at = vec(
          at0.x - gate.normal.y * s + crng.range(-14, 14),
          at0.y + gate.normal.x * s + crng.range(-14, 14));
        m.pos = host.clampPos(at, m.radius);
        m.tag = 'hold_camp';
        m.eventKey = `harborhold:${def.id}`;
        m.postSpec = { hold: true };
        m.aiPost = vec(m.pos.x, m.pos.y);
        m.aiPostFacing = Math.atan2(gate.pos.y - m.pos.y, gate.pos.x - m.pos.x); // it watches the gate it besieges
        m.facing = m.aiPostFacing;
        host.actors.push(m);
      }
    }
  }

export function harborHoldDressSpotOk(host:NativeSceneHarborHost,x: number, y: number, r: number, ps: PlacedStructure, horn?: Doodad): boolean {
    if (x < r || y < r || x > host.arena.w - r || y > host.arena.h - r) return false;
    for (const roof of ps.roofs) {
      if (x > roof.x - r && x < roof.x + roof.w + r && y > roof.y - r && y < roof.y + roof.h + r) return false;
    }
    for (const e of host.exits) if (dist(vec(x, y), e.pos) < 140 + r) return false;
    const dock = host.doodads.find(d => d.kind === 'dock');
    if (dock && dist(vec(x, y), dock.pos) < 90 + r) return false;
    if (horn && dist(vec(x, y), horn.pos) < 46 + r) return false;
    return true;
  }

export function harborRefreshHoldServices(host:NativeSceneHarborHost,def: ZoneDef): void {
    if (host.zone.id !== def.id) return;
    // THE PAIR SPLIT: an anchor with a paired port keeps NO counters — the
    // walls hold the war; the services live at the quay (the port zone's
    // own boot re-seats them off this anchor's state). Legacy single-zone
    // towns (no pair fields) keep every counter inside the walls as ever.
    if (def.harborhold && def.holdPort) return;
    const hold = host.holdStateFor(def);
    if (!hold) return;
    const cls = holdClassOf(hold);
    const ps = holdStructureIn(host.structures,
      def.holdAnchor ? HARBORHOLD_CFG.quay.structure : cls.structure);
    if (!ps) return;
    const open = hold.state === 'open';
    const wants = new Set((open ? holdActiveServices(cls, hold.prosperity) : []).map(s => s.id));
    for (const s of cls.services) {
      if (!s.npc) continue;
      const seat = holdSeatPos(ps, s.seat);
      if (!seat) continue;
      const tag = `hold_svc:${s.id}`;
      const standing = host.actors.find(a => !a.dead && a.tag === tag);
      if (wants.has(s.id) && !standing) {
        const n = host.createMonster(s.npc, 1, 'player');
        n.pos = host.clampPos(vec(seat.x, seat.y), n.radius);
        n.tag = tag;
        host.actors.push(n);
        if (s.id === 'mercs') host.armPortMercs(n);
      } else if (!wants.has(s.id) && standing) {
        standing.dead = true; // the per-frame sweep retires the body quietly
        if (s.id === 'mercs' && host.mercOutpost?.port) host.mercOutpost = null;
      }
    }
    // SERVICE DOODADS, generically: every row carrying a doodad plants at
    // its plaza anchor while active and lifts when the rung (or the town)
    // closes — the harbor board (its outside-the-dock default plant is
    // suppressed for hold zones in loadZone), the bounty board, and any
    // future row with a `doodad` field, one loop for all of them.
    for (const s of cls.services) {
      if (!s.doodad) continue;
      const standing = host.doodads.find(d => d.kind === s.doodad);
      if (wants.has(s.id) && !standing) {
        const seat = holdSeatPos(ps, s.seat);
        if (seat) {
          host.doodads.push({ pos: host.clampPos(vec(seat.x, seat.y), 16), radius: 16, kind: s.doodad });
          host.markDoodadsChanged();
        }
      } else if (standing && !wants.has(s.id)) {
        host.doodads.splice(host.doodads.indexOf(standing), 1);
        host.markDoodadsChanged();
      }
    }
    // THE CHANDLER'S COUNTER: its OWN stock on the shared beat lattice
    // (VendorDef row 'chandler' + the buyChandler intent — a real second
    // counter, not Brandt's shadow). The standing-shelf law verbatim:
    // same beat keeps the projection, a turned beat re-arms; standing
    // down no longer sheds the array (the beat owns its truth).
    if (wants.has('chandler')) {
      const beat = host.restockOrdinal();
      if (host.vendorArmedBeat['chandler'] !== beat) {
        host.chandlerStock = host.armVendorStock('chandler');
        host.vendorArmedBeat['chandler'] = beat;
      } else {
        host.syncHoldIdx('chandler', host.chandlerStock);
      }
      host.zoneHasVendorCounter = true;
      host.vendorRestockAt = (beat + 1) * host.restockSeconds();
    }
  }

export function harborArmPortMercs(host:NativeSceneHarborHost,captain: Actor): void {
    const hold = host.holdStateFor(host.zone);
    if (!hold) return;
    const cls = holdClassOf(hold);
    if (cls.mercOffers[1] <= 0) return;
    const offers = host.mercSheetFor(host.zone.id, () => {
      const rng = new Rng((host.manifest.seed ^ hashStr(`portmercs:${host.zone.id}`)) >>> 0);
      return host.dealTemplateOffers(rng, rng.int(cls.mercOffers[0], cls.mercOffers[1]));
    });
    host.mercOutpost = { captain, offers, port: true };
  }

export function harborLandPartyAt(host:NativeSceneHarborHost,at: Vec2, opts?: {
    spread?: number; band?: readonly [number, number]; clamp?: boolean;
    /** THE LANDING'S STORY (the arrivalStory law, engine/tiers.ts): a party
     *  landing seats every body on the GROUND story unless the caller names
     *  one — only the cave climb-out and the far span crossing land ON a
     *  story-seated mouth, and they pass its recorded story here. */
    tier?: number;
  }): void {
    const spread = opts?.spread ?? host.partyLand.spread;
    const band = opts?.band ?? host.partyLand.band;
    const clamp = opts?.clamp ?? true;
    const put = (a: Actor, to: Vec2): void => {
      // THE STORY-AWARE LANDING (the aloft coda's recorded shape): an aloft
      // landing must clamp through ITS OWN story's walk view — the tier-0
      // clampPos would drag a summit seat to the nearest ground cell (195px
      // onto the ramp foot, measured). Ground landings keep the classic
      // clamp byte-identical; on-floor targets move in neither form.
      const story = opts?.tier ?? 0;
      const view = story >= 1 ? host.tierViews?.[story] : null;
      a.pos = view
        ? (view.isWalkable(to.x, to.y) ? vec(to.x, to.y) : view.snapToWalkable(to))
        : (clamp ? host.clampPos(to, a.radius) : to);
      // THE TRAIL breaks on any party landing (zone arrival, teleport,
      // corpse-run): scent follows walked ground only — you didn't walk
      // here, so nothing leads here (engine/watch.ts).
      a.trail = undefined;
      a.trailIdx = 0;
      // The story re-seat (arrivalStory): stale layer indices never survive
      // a landing — the ground under the party is the story the caller says.
      a.tier = opts?.tier ?? 0;
      landMovementTether(a);
      a.onTierLink = false;
      a.aiTierGoal = undefined;
    };
    const p = host.player;
    put(p, vec(at.x, at.y));
    const seatActors = new Set<Actor>(host.seats.map(s => s.actor));
    for (const a of host.actors) {
      if (a === p) continue;
      const rides = seatActors.has(a)
        || (!!a.owner && seatActors.has(a.owner) && !a.dead && !a.construct);
      if (!rides) continue;
      put(a, vec(at.x + rand(-spread, spread), at.y + rand(band[0], band[1])));
    }
  }
