/** Shared native seat and cast control bodies. Concrete campaign/area binding remains required. */
import {dist,rand,vec} from '../core/math';
import {mod,type Attributes} from './stats';
import {STATUS_DEFS} from './status';
import {Actor} from './actor';
import {TOWN_PORTAL_CFG} from '../data/townportals';
import {isDormant} from './ai';
import {grantedTags,instanceMods,skillContextTags,type SkillInstance} from './skills';
import {SKILLS} from '../data/skills';
import {MONSTERS} from '../data/monsters';
import {ATTRIBUTES} from './stats';
import {sidezoneOf} from '../data/sidezones';
import {GRAB_CFG,GRAB_MARKER,GRAB_VERB_LABEL,grabHoldBounds,grabRefusal,LEDGER_SEIZED,type GrabHandoffSpec,type GrabSpec} from './grab';
import {POSSESS_CFG,possessPowerFactor,possessRefusal,type EjectReason,type PossessRide} from './possess';
import {bumpLedger} from '../packages/ledger';
import type {World,Seat} from './world';
export interface NativeSceneCombatControlHost {
 requireShapeshiftBody(caster:Actor):void;
 shardSpotOf(seat:Seat):import('../meta/worldstate').SavedPlayerSpot|undefined;
 seatDoorOf(seat:Seat):string|null;
 admitCombatBirth(body:Actor):void;
 withdrawCarried(seat:Seat,hero:Actor,body:Actor):void;
 restoreCarried(seat:Seat,hero:Actor,body:Actor):void;
 seatBodyChanged(seat:Seat,oldBody:Actor,newBody:Actor):void;
 actors:World["actors"];
 caveReturn:World["caveReturn"];
 caveStack:World["caveStack"];
 clampPos:World["clampPos"];
 clientActionHook:World["clientActionHook"];
 clingRelease:World["clingRelease"];
 createMonster:World["createMonster"];
 currentZoneSeed:World["currentZoneSeed"];
 devIgnoreSkillAttributes:World["devIgnoreSkillAttributes"];
 entryFrom:World["entryFrom"];
 events:World["events"];
 failNote:World["failNote"];
 findFreeSpot:World["findFreeSpot"];
 flashes:World["flashes"];
 hivecallReturn:World["hivecallReturn"];
 hostileTo:World["hostileTo"];
 indexSeats:World["indexSeats"];
 ledger:World["ledger"];
 lineOfSight:World["lineOfSight"];
 localSeat:World["localSeat"];
 markMetaDirty:World["markMetaDirty"];
 player:World["player"];
 reqShortfall:World["reqShortfall"];
 scene:World["scene"];
 seatByActor:World["seatByActor"];
 seatEmbody:World["seatEmbody"];
 seatOf:World["seatOf"];
 seats:World["seats"];
 portalActor(seat:Seat):Actor;
 portalOrigin(seat:Seat):import('../meta/worldstate').SavedPlayerSpot|undefined;
 shardWorld:World["shardWorld"];
 text:World["text"];
 time:World["time"];
 townPortalArrival:World["townPortalArrival"];
 townPortalDestination:World["townPortalDestination"];
 townPortalDwell:World["townPortalDwell"];
 townPortalRefusal:World["townPortalRefusal"];
 townPortals:World["townPortals"];
 traversal:World["traversal"];
 zone:World["zone"];
 zoneMap:World["zoneMap"];
}

export function sceneCastReqRefusal(host:NativeSceneCombatControlHost,caster: Actor, inst: SkillInstance): string | undefined {
    const seat = host.seatOf(caster);
    if (!seat || inst.devGift || !seat.meta.knownSkills.has(inst.def.id)) return undefined;
    if (caster.activeAuras.has(inst.def.id) || caster.strobes.has(inst.def.id)) return undefined;
    return host.reqShortfall(inst.def.id, seat);
  }

export function sceneReqShortfall(host:NativeSceneCombatControlHost,skillId: string, seat: Seat = host.localSeat): string | undefined {
    if (host.devIgnoreSkillAttributes && !host.clientActionHook && seat === host.localSeat) return undefined;
    const req = SKILLS[skillId]?.requirements;
    if (!req) return undefined;
    let short = '';
    for (const [attr, need] of Object.entries(req)) {
      if ((seat.meta.attrs[attr as keyof Attributes] ?? 0) < (need ?? 0)) {
        short += `${short ? ', ' : ''}${ATTRIBUTES[attr as keyof Attributes].short} ${need}`;
      }
    }
    return short ? 'needs ' + short : undefined;
  }

export function sceneGrabHandoff(host:NativeSceneCombatControlHost,from: Actor, v: Actor, hs: GrabHandoffSpec): boolean {
    const hold = from.gripping;
    if (!hold || hold.id !== v.id || v.dead) return false;
    const range = hs.range ?? GRAB_CFG.handoff.range;
    let best: Actor | null = null, bestInst: SkillInstance | null = null,
      bestSpec: GrabSpec | null = null, bd = range;
    for (const r of host.actors) {
      if (r === from || r === v || r.dead) continue;
      if (r.tier !== from.tier) continue; // THE SAME-STORY LAW: a catch is contact
      // Kin hands, foe catch: the receiver stands with the thrower and
      // against the victim (faction-honest — minion courts qualify).
      if (host.hostileTo(from, r) || !host.hostileTo(r, v)) continue;
      if (isDormant(r) || r.passive || r.untargetable) continue; // a sleeper catches nothing
      const dd = dist(from.pos, r.pos);
      if (dd >= bd) continue;
      let rInst: SkillInstance | null = null, rSpec: GrabSpec | null = null;
      for (const s of r.skills) {
        const f = s?.def.effects.find(e => e.type === 'grabSeize');
        if (f?.type === 'grabSeize') { rInst = s; rSpec = f.grab; break; }
      }
      if (!rInst || !rSpec) continue;              // receiving IS holding — no art, no catch
      const grip = r.sheet.get('gripPower', skillContextTags(rInst.def), instanceMods(rInst));
      if (grabRefusal(r, v, rSpec, grip, hold)) continue;
      if (!host.lineOfSight(from.pos, r.pos)) continue; // no blind passes through masonry
      bd = dd; best = r; bestInst = rInst; bestSpec = rSpec;
    }
    if (!best || !bestInst || !bestSpec) return false;
    // THE TRANSFER — search then commit; nothing above mutated. The verb
    // may CHANGE hands (drag → swallow): strip the old markers NOW (the
    // no-ghost-pip law), settle the conceal per the new verb, and let the
    // fresh statusAt beat re-stamp marker + rideStatus next sweep frame.
    const nv = bestSpec.verb;
    if (hold.verb === 'swallow' && nv !== 'swallow') {
      v.untargetable = hold.wasUntargetable ?? false; // stepping OUT of the gullet's conceal
    }
    for (let i = v.statuses.length - 1; i >= 0; i--) {
      const id = v.statuses[i].id;
      if (id === 'seized' || id === 'swallowed') {
        v.statuses.splice(i, 1);
        v.sheet.removeSource('status:' + id);
      }
    }
    from.gripping = undefined;
    const bounds = grabHoldBounds(bestSpec);
    best.gripping = {
      id: v.id, verb: nv, spec: bestSpec,
      until: host.time + rand(bounds[0], bounds[1]),
      skillId: bestInst.def.id,
      struggle: hold.struggle,   // THE CARRY LAW — banked escape rides the pass
      severed: 0,                // holder-scoped: wounds must land on the NEW body
      statusAt: host.time, dotAcc: 0,
      bearing: hold.bearing,
      wasUntargetable: hold.wasUntargetable,
    };
    v.heldBy = best.id;
    if (nv === 'swallow') v.untargetable = true;
    v.applyStatus(GRAB_MARKER[nv], 0, 1, 'grab');
    best.aiTargetId = v.id;      // the catch IS the fight (the seize's own law)
    host.text(vec(v.pos.x, v.pos.y - 14),
      'passed — ' + GRAB_VERB_LABEL[nv] + '!', '#d8a06a', 13);
    host.flashes.push({
      pos: vec(best.pos.x, best.pos.y), radius: best.radius + v.radius + 10,
      color: '#d8a06a', life: 0.2, maxLife: 0.2,
    });
    return true;
  }

export function sceneGrabSeize(host:NativeSceneCombatControlHost,caster: Actor, inst: SkillInstance, victim: Actor, spec: GrabSpec): boolean {
    if (caster.dead || victim.dead) return false;
    if (isDormant(victim)) return false;                    // planted stays planted
    if (!host.hostileTo(caster, victim)) return false;
    if (host.time < victim.grabProofUntil) {
      if (caster === host.player) host.failNote(caster, inst.def.id + ':slip', 'it slips the grip');
      return false;
    }
    const grip = caster.sheet.get('gripPower', skillContextTags(inst), instanceMods(inst));
    const why = grabRefusal(caster, victim, spec, grip);
    if (why) {
      if (caster === host.player) host.failNote(caster, inst.def.id + ':grab', why);
      return false;
    }
    // A latched rider is peeled INTO the fist (the latch's own release
    // first, so the two fabrics never share a body's movement).
    if (victim.clingTo) host.clingRelease(victim);
    // The seize interrupts whatever the catch was winding up.
    victim.casting = null;
    const bounds = grabHoldBounds(spec);
    caster.gripping = {
      id: victim.id, verb: spec.verb, spec,
      until: host.time + rand(bounds[0], bounds[1]),
      skillId: inst.def.id,
      struggle: 0, severed: 0, statusAt: host.time, dotAcc: 0,
      bearing: rand(-0.35, 0.35),
      wasUntargetable: victim.untargetable,
    };
    victim.heldBy = caster.id;
    if (spec.verb === 'swallow') victim.untargetable = true;
    victim.applyStatus(GRAB_MARKER[spec.verb], 0, 1, 'grab');
    caster.aiTargetId = victim.id; // the catch IS the fight
    host.text(vec(victim.pos.x, victim.pos.y - 14),
      GRAB_VERB_LABEL[spec.verb] + '!', '#d8a06a', 13);
    host.flashes.push({
      pos: vec(victim.pos.x, victim.pos.y), radius: victim.radius + 12,
      color: '#d8a06a', life: 0.25, maxLife: 0.25,
    });
    // THE HARD LESSON (discovery web): a grip catching the LOCAL hero teaches
    // the account that holds exist — unlocks.ts gates read the tally (the
    // Brawler's rumor resolves). Local seat only, like every ledger stamp:
    // the account learns what its own body was taught. Merges on death.
    if (victim === host.player) bumpLedger(host.ledger, LEDGER_SEIZED);
    return true;
  }

export function scenePossessSeize(host:NativeSceneCombatControlHost,caster: Actor, inst: SkillInstance, target: Actor, spec: import('./possess').PossessSpec | undefined): void {
    const seat = host.seatOf(caster);
    if (!seat || seat.home) return;         // brains have no seat; away seats press the convert face
    if (target.team !== 'enemy' || target.dead) return;
    const why = possessRefusal(target, spec);
    if (why) { host.failNote(caster, inst.def.id + ':possess', why); return; }
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const durMul = caster.sheet.get('possessDuration', tags, extra);
    const powBonus = caster.sheet.get('possessPower', tags, extra);
    const guard = caster.sheet.get('huskGuard', tags, extra);
    const duration = (spec?.duration ?? POSSESS_CFG.duration) * durMul;
    const ride: PossessRide = {
      seatId: seat.id, kind: 'possess',
      prevTeam: target.team, prevKind: target.kind,
      guiseFaction: (spec?.guise ?? true) ? target.faction : undefined,
      guiseBroken: false,
      until: host.time + Math.max(1, duration),
      huskLifeAt: caster.life,
      huskLostFrac: spec?.huskLostFrac ?? POSSESS_CFG.endOn.huskLostFrac,
      huskMode: spec?.husk ?? 'stands',
      guestSlot: -1, gemId: inst.def.id,
    };
    host.seatEmbody(seat, target, ride, possessPowerFactor(spec, 'possess', powBonus), guard, inst);
    host.flashes.push({
      pos: vec(target.pos.x, target.pos.y), radius: target.radius + 14,
      color: '#b8a8e8', life: 0.35, maxLife: 0.35,
    });
  }

export function sceneShapeshiftPress(host:NativeSceneCombatControlHost,caster: Actor, inst: SkillInstance, shift: import('./possess').ShiftSpec): void {
    const seat = host.seatOf(caster);
    if (!seat || seat.home) return;
    host.requireShapeshiftBody(caster);
    const def = MONSTERS[shift.form];
    if (!def) return;
    const form = host.createMonster(shift.form, caster.level, 'player');
    form.noBounty = true;   // a projection pays no bounty however it ends
    form.pos = host.clampPos(vec(caster.pos.x, caster.pos.y), form.radius);
    host.actors.push(form);
    host.admitCombatBirth(form);
    const tags = skillContextTags(inst, grantedTags(inst));
    const extra = instanceMods(inst);
    const powBonus = caster.sheet.get('possessPower', tags, extra);
    const durMul = caster.sheet.get('possessDuration', tags, extra);
    const ride: PossessRide = {
      seatId: seat.id, kind: 'shift',
      prevTeam: 'player', prevKind: form.kind,
      until: shift.duration ? host.time + shift.duration * durMul : undefined,
      huskLifeAt: caster.life,
      huskLostFrac: 0,
      huskMode: 'carried',
      guestSlot: -1, gemId: inst.def.id,
      mintedForm: true,
    };
    host.seatEmbody(seat, form, ride, possessPowerFactor(shift, 'shift', powBonus), 0, inst);
    host.text(vec(form.pos.x, form.pos.y - form.radius - 12), def.name + '!', '#b8d8a8', 14);
    host.flashes.push({
      pos: vec(form.pos.x, form.pos.y), radius: form.radius + 14,
      color: '#b8d8a8', life: 0.35, maxLife: 0.35,
    });
  }

export function sceneOpenTownPortal(host:NativeSceneCombatControlHost,seat: Seat): void {
    if (host.townPortalRefusal(seat)) return;
    // THE ROADS PER PLAYER (shard M1 W2): a hosted world's origin is the seat's
    // own spot (its zone, its ladder, its door), never the unit's warden's.
    const origin = host.portalOrigin(seat);
    if (!origin) return;
    delete origin.vitals; // travelling never rolls back healing, costs or damage
    const at = host.portalActor(seat).pos;
    if (origin.cave) { origin.cave.x = at.x; origin.cave.y = at.y; }
    else { origin.x = at.x; origin.y = at.y; }
    const sourcePos = host.findFreeSpot(vec(at.x + TOWN_PORTAL_CFG.spawnOffset, at.y), 18, host.portalActor(seat).tier ?? 0);
    host.townPortals = host.townPortals.filter(p => p.owner !== seat.id);
    host.townPortals.push({ owner: seat.id, origin, originTier: host.portalActor(seat).tier ?? 0, sourcePos,
      sourceEntryFrom: (host.shardWorld ? host.seatDoorOf(seat) : host.entryFrom) ?? undefined, sourceSeed: host.currentZoneSeed, destination: host.townPortalDestination ?? TOWN_PORTAL_CFG.destination, returning: false });
    host.townPortalDwell.delete(seat.id);
    host.townPortalArrival.delete(seat.id);
    host.text(sourcePos, 'Town Portal', TOWN_PORTAL_CFG.color, 14);
  }

export function sceneSeatEmbody(host:NativeSceneCombatControlHost,
    seat: Seat, body: Actor, ride: PossessRide,
    powerFactor: number, huskGuard: number, gemInst: SkillInstance,
  ): void {
    const hero = seat.actor;
    // The trance interrupts whatever the hands were doing (and the borrowed
    // body forgets its own quarrel — it is nobody's brain now).
    hero.casting = null;
    body.casting = null;
    body.aiTargetId = undefined;
    hero.vacated = { seatId: seat.id };
    seat.home = hero;
    body.possession = ride;
    body.team = 'player';
    body.kind = 'player'; // the ROLE axis: seat-driven now (co-op ships the seat id off this)
    seat.actor = body;
    host.seatBodyChanged(seat,hero,body);
    host.indexSeats();
    // The power haircut rides the BODY as a source, so its own instances
    // scale (the mimic powerFactor law, worn body-side).
    if (powerFactor !== 1) {
      body.sheet.setSource('possessed', [mod('damage', 'more', powerFactor - 1)]);
    }
    // THE GUEST SLOT: the pressing gem rides along on the borrowed bar —
    // its ConvertSpec ('seatAway') presents the ending verb, so the button
    // that began the ride ends it. Removed whole at eject.
    ride.guestSlot = body.skills.length;
    ride.gemId = gemInst.def.id;
    body.skills.push(gemInst);
    // THE HUSK STANCE: 'stands' leaves the flesh entranced where the seat
    // left it (the possession risk valve — targetable, huskGuard-warded);
    // 'carried' withdraws it from the world whole (the shapeshift law —
    // the flesh IS elsewhere; it shadows the body for honest eject spots).
    if (ride.huskMode === 'stands') {
      hero.applyStatus('entranced', 0, 1, 'Possession');
      if (huskGuard > 0) {
        hero.sheet.setSource('vacated', [mod('damageTaken', 'more', -huskGuard)]);
      }
    } else {
      const i = host.actors.indexOf(hero);
      if (i >= 0) { host.actors.splice(i, 1); host.withdrawCarried(seat,hero,body); }
    }
    host.markMetaDirty(seat);
    host.events.emit('possess/embody', { seat: seat.id, body, hero, kind: ride.kind });
  }

export function sceneIndexSeats(host:Pick<NativeSceneCombatControlHost,'seatByActor'|'seats'>): void {
    host.seatByActor.clear();
    for (const s of host.seats) host.seatByActor.set(s.actor, s);
  }

export function sceneTownPortalRefusal(host:NativeSceneCombatControlHost,seat: Seat = host.localSeat): string | null {
    const a = seat.actor;
    if (a.dead || a.downed || seat.merc) return 'Cannot open a portal now.';
    if (host.traversal || host.scene?.hudVeil || a.heldBy !== undefined) return 'Finish the current action first.';
    if (host.zone.objective.kind === 'safe') return 'Use your return portal to leave town.';
    if (host.zone.boundless || host.zone.townPortals === false) return 'Town portals are sealed here.';
    const target = host.zoneMap[host.townPortalDestination ?? TOWN_PORTAL_CFG.destination];
    if (!target || target.objective.kind !== 'safe') return 'No safe portal destination is configured.';
    if (!host.clientActionHook && !host.zoneMap[host.zone.id]) {
      const ladder = host.caveReturn ? [...host.caveStack, host.caveReturn] : [];
      if (!ladder.length || ladder.some(r => !r.kind || !sidezoneOf(r.kind) || !Number.isFinite(r.seed))) {
        return 'This passage has no stable return route.';
      }
    }
    return null;
  }

export function sceneSeatEject(host:NativeSceneCombatControlHost,seat: Seat, reason: EjectReason): void {
    const hero = seat.home;
    if (!hero) return;
    const body = seat.actor;
    const hiveForm = body.hiveForm;
    const ride = body.possession;
    seat.home = undefined;
    seat.actor = hero;
    host.seatBodyChanged(seat,body,hero);
    hero.vacated = undefined;
    host.indexSeats();
    // The homecoming: a carried husk rejoins the world where the body
    // stood; a standing husk simply wakes where it waited.
    if (ride?.huskMode === 'carried') {
      hero.pos = host.clampPos(vec(body.pos.x, body.pos.y), hero.radius);
      if (!host.actors.includes(hero)) { host.actors.push(hero); host.restoreCarried(seat,hero,body); }
    }
    for (let i = hero.statuses.length - 1; i >= 0; i--) {
      if (hero.statuses[i].id !== 'entranced') continue;
      hero.statuses.splice(i, 1);
      hero.sheet.removeSource('status:entranced');
    }
    hero.sheet.removeSource('vacated');
    // Restore the body whole — team, role, kit, haircut. What it suffered
    // while ridden it keeps (you leave the flesh as you wore it).
    if (ride) {
      body.possession = undefined;
      body.team = ride.prevTeam;
      body.kind = ride.prevKind;
      body.sheet.removeSource('possessed');
      if (ride.guestSlot >= 0 && body.skills[ride.guestSlot]?.def.id === ride.gemId) {
        body.skills.splice(ride.guestSlot, 1);
      }
      if (ride.mintedForm) {
        // A form is a projection of its seat, not a creature the world
        // keeps: it disperses at eject. A form dying under you (bodyDied)
        // is already mid-kill() — let that death finish honestly.
        if (!body.dead && reason !== 'bodyDied') {
          body.dead = true;
          host.flashes.push({
            pos: vec(body.pos.x, body.pos.y), radius: body.radius + 10,
            color: body.color, life: 0.35, maxLife: 0.35,
          });
        }
      } else if (!body.dead && (reason === 'press' || reason === 'duration' || reason === 'travel')) {
        // The vacated flesh staggers — your escape window, and the room's
        // counterplay window when a monster is dropped mid-pack.
        const stunBase = STATUS_DEFS['stun']?.duration ?? 1;
        if (POSSESS_CFG.eject.bodyStun > 0) {
          body.applyStatus('stun', 0, POSSESS_CFG.eject.bodyStun / stunBase, 'Relinquished');
        }
      }
      // The re-possess pace: stamped on the pressing gem, at the HERO's
      // hands (the skill's own cooldown field wins if longer).
      if (POSSESS_CFG.eject.cooldown > 0 && ride.gemId) {
        const cd = Math.max(hero.cooldowns.get(ride.gemId) ?? 0, POSSESS_CFG.eject.cooldown);
        hero.cooldowns.set(ride.gemId, cd);
        hero.cooldownTotals.set(ride.gemId, Math.max(hero.cooldownTotals.get(ride.gemId) ?? 0, cd));
      }
    }
    // The backlash: an embodiment DYING under you staggers the returning
    // flesh (the possession's own risk stays priced even when the husk
    // stood safe).
    if (reason === 'bodyDied' && POSSESS_CFG.eject.selfStun > 0 && !hero.dead) {
      const stunBase = STATUS_DEFS['stun']?.duration ?? 1;
      hero.applyStatus('stun', 0, POSSESS_CFG.eject.selfStun / stunBase, 'Backlash');
    }
    if (!hero.dead && reason !== 'travel') {
      host.text(vec(hero.pos.x, hero.pos.y - hero.radius - 12),
        reason === 'huskPain' ? 'the pain calls you home'
          : reason === 'huskSeized' ? 'torn back to your flesh'
            : reason === 'bodyDied' ? 'the body fails you'
              : 'you return to yourself', '#b8a8e8', 12);
    }
    host.markMetaDirty(seat);
    if (hiveForm) host.hivecallReturn(body, reason);
    host.events.emit('possess/eject', { seat: seat.id, body, hero, reason });
  }
