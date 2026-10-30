import type {World,Seat} from './world';
import {MERC_SCHEMA,addRetiredMerc,mintMercId,snapshotBuild,type MercRosterEntry} from '../meta/mercs';
export interface NativeSceneRunConclusionHost {
 account:World['account'];
 canRetireHere:World['canRetireHere'];
 dismissMercenary:World['dismissMercenary'];
 gameOver:World['gameOver'];
 hiredMercs:World['hiredMercs'];
 menuExitRequested:World['menuExitRequested'];
 meta:World['meta'];
 modeDef:World['modeDef'];
 onRunEnded:World['onRunEnded'];
 pendingRespawn:World['pendingRespawn'];
 player:World['player'];
 runEndReason:World['runEndReason'];
 scene:World['scene'];
 seatEject:World['seatEject'];
 seats:Iterable<Seat>;
}
export function sceneEndRun(host:NativeSceneRunConclusionHost):void {
    if (host.player.dead || host.gameOver) return;
    // Mid-SCENE there is no run to end (engine/scenes.ts — the run begins
    // at the wake): no forfeit ceremony, no banked death, no corpse — just
    // the plain walk back to the menu. The shell's exit persist stands down
    // too, so the abort leaves nothing behind and the scene stays due.
    if (host.scene) { host.menuExitRequested = true; return; }
    // A roster-saved character (an Immortal vessel) has no run to forfeit —
    // its whole point is persisting. Route to Save & Main Menu instead; DELETING
    // a vessel is a deliberate roster action on the start menu, never this path.
    if (host.modeDef().save === 'roster') { host.menuExitRequested = true; return; }
    host.runEndReason = 'forfeit'; // a voluntary exit leaves NO corpse (extensible)
    // A forfeit ends the WHOLE party run immediately — it must NOT route through
    // the down/revive seam (an ally being up would otherwise turn "End Run" into a
    // revivable downed state, and leave runEndReason stuck on 'forfeit' to mislabel
    // a later genuine wipe). Every seat comes HOME first (the possession
    // seam — you forfeit in your own flesh), then mark and end directly.
    for (const s of host.seats) if (s.home) host.seatEject(s, 'released');
    for (const s of host.seats) { s.actor.downed = false; s.actor.dead = true; }
    host.onRunEnded(host.runEndReason);
  }

export function sceneRetireCharacter(host:NativeSceneRunConclusionHost):boolean {
    if (host.player.dead || host.gameOver || host.pendingRespawn) return false;
    if (!host.canRetireHere()) return false;
    // The retiree's own company is released first (back to the pool).
    if (host.hiredMercs.length) host.dismissMercenary();
    const m = host.meta;
    const entry: MercRosterEntry = {
      schema: MERC_SCHEMA,
      mercId: mintMercId(),
      name: m.name,                   // the given name retires with them
      classId: m.classDef.id,
      retiredLevel: host.player.level,
      retiredAt: Date.now(),
      snapshot: snapshotBuild(
        m.classDef.id, m.baseAttrs, m.allocated, m.choices, m.vocations,
        m.knownSkills.values(), host.player.skills.map(s => s ? s.def.id : null),
        m.equipped, host.player.level),
    };
    addRetiredMerc(host.account, entry);
    // Main.ts's run-end block persists the account durably alongside the tithe.
    host.runEndReason = 'retire';
    for (const s of host.seats) { s.actor.downed = false; s.actor.dead = true; }
    host.onRunEnded('retire');
    return true;
  }
