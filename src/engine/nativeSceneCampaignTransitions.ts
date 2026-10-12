/** Shared native campaign transition bodies. Concrete campaign/area binding remains required. */
import {rand,vec,type Vec2} from '../core/math';
import {Actor} from './actor';
import {ESSENCE_IDS,type EssenceCost} from '../data/essences';
import {sceneInterceptFall} from './scenes';
import {START_ZONE} from '../data/zones';
import {PIT_CFG,pitIdentityKey} from './pitfall';
import {mintCave} from './worldgen';
import type {DamageSpec} from '../world/regions';
import {bumpLedger,mergeLedger} from '../packages/ledger';
import {applyCredits,LEDGER_ACCOUNT_DEATHS} from '../meta/account';
import {modeById,stageOf} from '../meta/modes';
import {MERC_CFG} from '../meta/mercs';
import {NEMESIS_CFG,formNemesis,nemesisTitle,sagaKey,touchSaga} from '../meta/nemesis';
import {hashStr} from './nativeSceneConfig';
import {emptyEssences} from './nativeProgressionMeta';
import {emptyAbilityEssences} from './nativeProgressionMeta';
import type {World,Seat} from './world';
export interface NativeSceneCampaignTransitionHost {
 retireFallenActor(body:Actor):void;
 account:World["account"];
 accountDirty:World["accountDirty"];
 actors:World["actors"];
 applyEnvDamage:World["applyEnvDamage"];
 applyRecovery:World["applyRecovery"];
 arena:World["arena"];
 bankCouchWipe:World["bankCouchWipe"];
 beginModeFall:World["beginModeFall"];
 beginModeRespawn:World["beginModeRespawn"];
 beginPitDescent:World["beginPitDescent"];
 beginSkyfall:World["beginSkyfall"];
 beginTraversal:World["beginTraversal"];
 caveExitGrace:World["caveExitGrace"];
 caveMap:World["caveMap"];
 caveReturn:World["caveReturn"];
 caveStack:World["caveStack"];
 charDirty:World["charDirty"];
 clampPos:World["clampPos"];
 concludeWipe:World["concludeWipe"];
 couchDirty:World["couchDirty"];
 descentRun:World["descentRun"];
 descentSite:World["descentSite"];
 dismissMercenary:World["dismissMercenary"];
 distinctNameOf:World["distinctNameOf"];
 entryFrom:World["entryFrom"];
 events:World["events"];
 fallReckoning:World["fallReckoning"];
 fellVessel:World["fellVessel"];
 flashes:World["flashes"];
 gameOver:World["gameOver"];
 grantEssence:World["grantEssence"];
 hiredMercs:World["hiredMercs"];
 kill:World["kill"];
 landPartyAt:World["landPartyAt"];
 lastRespawnPayout:World["lastRespawnPayout"];
 ledger:World["ledger"];
 loadZone:World["loadZone"];
 localSeat:World["localSeat"];
 loseBagRelicsOnDeath:World["loseBagRelicsOnDeath"];
 markMetaDirty:World["markMetaDirty"];
 meta:World["meta"];
 modeDef:World["modeDef"];
 modeStageDef:World["modeStageDef"];
 nearestZoneOf:World["nearestZoneOf"];
 nemesisActive:World["nemesisActive"];
 nemesisEligible:World["nemesisEligible"];
 notice:World["notice"];
 onRunEnded:World["onRunEnded"];
 pendingRespawn:World["pendingRespawn"];
 pitPolicyFor:World["pitPolicyFor"];
 player:World["player"];
 recalcSeat:World["recalcSeat"];
 reckonRunEssence:World["reckonRunEssence"];
 recordDeath:World["recordDeath"];
 recordNemesisFall:World["recordNemesisFall"];
 recordSeatDeath:World["recordSeatDeath"];
 restoreAccountRelics:World["restoreAccountRelics"];
 resurfaceFromDescent:World["resurfaceFromDescent"];
 runEndReason:World["runEndReason"];
 sagaDirty:World["sagaDirty"];
 scatterPitArrival:World["scatterPitArrival"];
 scene:World["scene"];
 seatOf:World["seatOf"];
 seats:readonly Seat[];
 showCompanionCue:World["showCompanionCue"];
 sim:World["sim"];
 skyBelow:World["skyBelow"];
 stripCarryOf:World["stripCarryOf"];
 stripCarryOnDeath:World["stripCarryOnDeath"];
 teleportActor:World["teleportActor"];
 text:World["text"];
 traversal:World["traversal"];
 walk:World["walk"];
 zone:World["zone"];
 zoneEntry:World["zoneEntry"];
 zoneMap:World["zoneMap"];
}

export function sceneOnPlayerDown(host:NativeSceneCampaignTransitionHost,actor: Actor, killer?: Actor): void {
    // THE SCENE COVENANT (engine/scenes.ts): on scripted ground a player
    // seat's lethal blow FELLS, never kills — the scene claims the fall
    // whole (no downed state, no wipe, no mode respawn).
    if (host.scene && sceneInterceptFall(host, actor)) return;
    // A standing ally converts this to a revivable DOWNED state. A hired
    // MERC counts as that ally only while the revive lever is on — else a
    // merc who can't kneel would strand its downed patron forever.
    const anyAllyUp = host.seats.some(s =>
      s.actor !== actor && !s.actor.dead && !s.actor.downed
      && (!s.merc || MERC_CFG.mercsCanRevive));
    if (!anyAllyUp) { host.concludeWipe(); return; }
    // Downed, not dead: undo kill()'s dead flag, zero life, await revival.
    actor.dead = false;
    actor.downed = true;
    actor.life = 0;
    actor.casting = null;
    const seat = host.seatOf(actor);
    if (seat) seat.reviveDwellBy.clear();
    // A NAMED HIRELING felled: the foe may join the HIRELING'S saga — the
    // mercenary lives in the world's memory too, and carries the grudge home.
    if (seat?.merc && killer && host.nemesisEligible(killer) && !killer.nemesis
      && host.nemesisActive() && Math.random() < NEMESIS_CFG.mercFelledChance) {
      const saga = touchSaga(host.account, seat.merc.name);
      const n = formNemesis(saga, killer.defId!, killer.faction ?? '', 'felled_hireling', Math.random,
        { name: host.distinctNameOf(killer), bornRarity: killer.rarity });
      host.text(vec(killer.pos.x, killer.pos.y - 30), `${nemesisTitle(n)} marks ${seat.merc.name}.`, '#e07840', 13);
      host.events.emit('nemesis/formed', { saga: sagaKey(seat.merc.name), nemesis: n.name, deed: 'felled_hireling' });
      host.sagaDirty(true);
    }
    host.events.emit('player/downed', { actor, killer });
    host.showCompanionCue(actor, 'down');
  }

export function sceneConcludeWipe(host:NativeSceneCampaignTransitionHost): void {
    if (host.localSeat.keeper) return; // keeperSeat: a hosted world never ends — its warden stands again next tick
    for (const seat of host.seats) host.loseBagRelicsOnDeath(seat);
    if (host.descentRun) { host.resurfaceFromDescent('died'); return; }
    // The world remembers the fall BEFORE the mode decides what it costs —
    // an Undying death feeds the saga exactly as a mortal one does.
    host.recordNemesisFall();
    const onDeath = host.modeStageDef().onDeath;
    if (onDeath === 'fall') { host.beginModeFall(); return; }
    if (onDeath !== 'end') { host.beginModeRespawn(); return; }
    host.onRunEnded(host.runEndReason);
  }

export function sceneBeginModeFall(host:NativeSceneCampaignTransitionHost): void {
    const stage = host.modeStageDef();
    // 1. THE APPRAISAL, pre-strip, with the ground it happened on: the fall
    //    mints at the stage's own rate (0 for the Undying — the covenant
    //    pays the account nothing) but the death screen still shows the
    //    wallet the covenant took. main.ts applies the mint, not us — the
    //    run is ending, so the ordinary epilogue owns the account writes.
    const reck = host.reckonRunEssence();
    host.fallReckoning = { ...reck, zoneName: host.zone.name };
    host.lastRespawnPayout = 0;
    // 2. THE LEDGER: stage-driven, exactly as a survived death banks it
    //    (moot for the sealed Undying — kept stage-honest for any future
    //    falling stage still inside the account loop).
    if (stage.metaProgression) mergeLedger(host.account.ledger, host.ledger);
    host.accountDirty = true;
    // 3. THE CORPSE + THE PRICE: captured before the strip, routed by the
    //    dying stage's ring (self-only for the Undying), then the carry
    //    goes — bag, doll, both essence wallets — while the build walks on.
    host.recordDeath();
    host.stripCarryOnDeath();
    // 4. THE STAMP: the card falls (fee frozen now; first stamp stands).
    host.fellVessel(host.localSeat);
    // 5. THE GUEST COVENANT: couch vessels pay their own way — an undying
    //    guest's card falls beside the host's (bankCouchWipe's fall arm).
    host.bankCouchWipe();
    // 6. THE STANDING SAVE: every seat back on its feet in the sanctuary,
    //    statuses shed, resources full — the save main.ts is about to write
    //    is the vessel resurrection wakes, not a corpse in a monster den.
    for (const s of host.seats) {
      s.actor.dead = false;
      s.actor.downed = false;
      s.actor.casting = null;
      for (const id of new Set(s.actor.statuses.map(st => st.id))) s.actor.endStatus(id);
      s.reviveDwellBy.clear();
    }
    host.loadZone(START_ZONE);
    const p = host.player;
    for (const s of host.seats) {
      if (s.actor !== p) s.actor.pos = host.clampPos(vec(p.pos.x + rand(-60, 60), p.pos.y + rand(30, 70)), s.actor.radius);
      s.actor.fillResources();
    }
    host.charDirty = true;
    host.events.emit('player/modeDeath', { stage: stage.id, earned: 0 });
    // 7. The run is over — 'fall', so main.ts's epilogue keeps the vessel.
    host.onRunEnded('fall');
  }

export function sceneBeginModeRespawn(host:NativeSceneCampaignTransitionHost): void {
    if (host.pendingRespawn) return;
    const stage = host.modeStageDef();
    // 1. THE TITHE: the party's carried essence appraised at the mortal
    //    exchange × the stage's rate (reckonRunEssence — the same fold the
    //    mortal run end mints by), banked BEFORE the strip takes the
    //    wallets. The Immortal opt-in pays reduced on the crossing and
    //    nothing after; the banked essence waits in the account for the
    //    next reckoning's seal.
    const earned = host.reckonRunEssence().minted;
    if (earned > 0) applyCredits(host.account, earned);
    host.lastRespawnPayout = earned;
    // 2. THE LEDGER: a stage still inside the account loop banks its run
    //    counters exactly as the mortal death handler would have (once —
    //    the sealed stage after it never merges again).
    if (stage.metaProgression) mergeLedger(host.account.ledger, host.ledger);
    if (stage.countsAccountDeath) bumpLedger(host.account.ledger, LEDGER_ACCOUNT_DEATHS);
    host.accountDirty = true;
    // 3. THE CONTRACTS: a survived death still concludes the company's hire —
    //    the blades return to the world's pool (never destroyed; an Undying
    //    patron must engage the mortal economy again to afford the next one).
    if (host.hiredMercs.length) host.dismissMercenary();
    // 4. THE CORPSE: captured BEFORE the carry is stripped, routed by the
    //    DYING stage's ring (the immortalizing corpse is already self-only).
    host.recordDeath();
    // 5. THE PRICE: death still takes the carry — bag, doll, gems, materials —
    //    while the build (skills, supports, passives, level) walks away.
    host.stripCarryOnDeath();
    // 6. THE CROSSING: advance the ladder (an Immortal's first death seals it).
    if (stage.onDeath === 'advance') {
      host.meta.modeStage = Math.min(host.meta.modeStage + 1, host.modeDef().stages.length - 1);
    }
    host.charDirty = true;
    // 6.5. THE GUEST COVENANT: every couch vessel at the wipe pays its own
    //      way (corpse + strip + stage) — the account-level writes above are
    //      never repeated (one account, one payment).
    host.bankCouchWipe();
    // 7. The dark takes the screen; update() wakes the character once it's full.
    host.pendingRespawn = { phase: 'out', t: 0 };
    host.events.emit('player/modeDeath', { stage: stage.id, earned });
  }

export function sceneStripCarryOnDeath(host:NativeSceneCampaignTransitionHost): void { host.stripCarryOf(host.localSeat); }

export function sceneStripCarryOf(host:NativeSceneCampaignTransitionHost,seat: Seat): void {
    host.loseBagRelicsOnDeath(seat);
    const m = seat.meta;
    m.items = []; // gem wrappers ride the bag — one wipe covers them (M1)
    m.equipped = {};
    m.containers = {};
    host.restoreAccountRelics(seat); // Account equipment survives every death policy.
    m.essences = emptyEssences();
    m.abilityEssences = emptyAbilityEssences();
    m.vestiges = {};
    host.recalcSeat(seat); // the doll's gear sources vanish from the sheet
    host.markMetaDirty(seat);
  }

export function sceneBankCouchWipe(host:NativeSceneCampaignTransitionHost): void {
    for (const s of host.seats) {
      if (!s.couch?.charId) continue;
      const stage = stageOf(s.meta.modeId, s.meta.modeStage);
      host.recordSeatDeath(s);
      host.stripCarryOf(s);
      if (stage.onDeath === 'advance') {
        s.meta.modeStage = Math.min(s.meta.modeStage + 1, modeById(s.meta.modeId).stages.length - 1);
      } else if (stage.onDeath === 'fall') {
        host.fellVessel(s);
      }
      host.couchDirty = true; // main.ts persists the vessel promptly
    }
  }

export function sceneResurfaceFromDescent(host:NativeSceneCampaignTransitionHost,reason: 'climb' | 'consumed' | 'died'): void {
    const run = host.descentRun, df = host.sim.descentField;
    if (!run || !df) return;
    // THE DEEP LEDGER banks out: whole packets by tint, × keptOnDeath unless
    // the climb was CHOSEN (a voluntary exit always keeps everything).
    const keep = reason === 'climb' ? 1 : df.surge().payoutKeptOnDeath;
    const banked: EssenceCost[] = [];
    for (const id of ESSENCE_IDS) {
      const n = Math.round((run.haul[id] ?? 0) * keep);
      if (n > 0) banked.push({ essence: id, count: n });
    }
    for (const s of host.seats) {
      s.actor.dead = false; s.actor.downed = false; s.actor.casting = null;
      if (s.actor.life <= 0) s.actor.life = Math.max(1, s.actor.maxLife() * 0.5);
    }
    host.gameOver = false;
    // Hygiene: hand the abyss's def its entry level back — the ground is
    // spent and never re-entered, but THE PRESSURE LADDER should not
    // outlive the dive it climbed for.
    if (run.baseLevel > 0) host.zone.level = run.baseLevel;
    const ret = run.prevReturn, parentCaveId = run.parentCaveId;
    host.descentRun = null;
    host.player.survival?.delete('light'); // out of the dark
    host.loadZone(parentCaveId, ret?.entryFrom ?? undefined);
    // Restore the Delver-cave's caveReturn (the way back up to the surface).
    host.caveReturn = ret ? { zoneId: ret.zoneId, pos: vec(ret.pos.x, ret.pos.y), entryFrom: ret.entryFrom } : null;
    if (host.descentSite) {
      // THE PARTY-LANDING LAW: the whole party surfaces onto the platform —
      // seats and the carried court, not the hero alone.
      host.landPartyAt(vec(host.descentSite.platform.x, host.descentSite.platform.y + 34));
    }
    host.caveExitGrace = true;
    const msg = reason === 'climb' ? 'You climb back into the light.'
      : reason === 'consumed' ? 'The dark consumes you — you scramble out.'
      : 'You are dragged from the deep.';
    host.notice(`${msg}  The Delver's counter opens.`, '#7fe0d8', 16, 'civic');
    // The haul lands in the ONE economy — every player seat paid in full
    // (the XP-share law's generosity); floats + wallet sync ride
    // grantEssence itself, so the payout explains itself on screen.
    for (const s of host.seats) for (const c of banked) host.grantEssence(s, c);
  }

export function sceneBeginSkyfall(host:NativeSceneCampaignTransitionHost): void {
    if (host.traversal) return;
    const shelf = host.zone;
    // Whichever vertical fabric this zone runs owns the fall's meaning; a
    // conjured cloud expiring over authored sky rides the same answer.
    const fall = shelf.theme.collapse?.fall ?? shelf.theme.flux?.fall;
    const hurt = (): void => {
      if (fall?.damageFrac) host.applyEnvDamage(host.player, { amount: 0, pctMaxLife: fall.damageFrac, type: 'physical', canKill: false });
    };
    if (fall?.kind === 'eject') {
      const s = host.walk?.snapToWalkable(host.player.pos) ?? host.zoneEntry;
      host.teleportActor(host.player, vec(s.x, s.y), '#cfe0ff');
      hurt();
      host.text(vec(host.player.pos.x, host.player.pos.y - 32), 'you scramble back onto standing ground!', '#cfe0ff', 14);
      return;
    }
    // THE PIT-WORD OVERRIDE (the brittle-span precedent — pitPolicyFor's own
    // law: the boundary arrest and a fabric's give-way must hear the same
    // word): when NO vertical fabric authored a fall spec and the zone's
    // word for pit-family falls resolves 'descend' (theme.pitfall — the
    // overpass gorge under a dusk-closed sunbridge — or the cave default),
    // ground voiding underfoot drops the lingerer ONE STRATUM through the
    // same door walking off the rim reads, never the neighbor-zone sky
    // resolution. Aetherial shelves keep their sky door by construction:
    // they carry no theme.pitfall and sit at caveDepth 0, so the word stays
    // 'fall' and this branch never fires there.
    if (!fall && host.pitPolicyFor({ kind: 'fall', to: 'edge' },host.player.pos).kind === 'descend') {
      // The rim the descent banks (caveReturn — the climb-out surfaces the
      // party there) must be STANDABLE: a lingerer's own feet are mid-void
      // by definition, so the nearest lip stands in for where they fell.
      const lip = host.walk?.snapToWalkable(host.player.pos) ?? host.zoneEntry;
      if ((host.zone.pitChain ?? 0) >= PIT_CFG.dropCave.maxChain) {
        // THE LADDER RUNS OUT (routePitFall's floor): no new rung — and with
        // no lip holding the body, the classic edge-bite becomes the
        // scramble plus the same toll.
        host.teleportActor(host.player, vec(lip.x, lip.y), '#9a8ab8');
        host.text(vec(host.player.pos.x, host.player.pos.y - 34), 'the crack narrows — nothing below but stone', '#9a8ab8', 12);
        host.applyEnvDamage(host.player, PIT_CFG.fallDamage);
        return;
      }
      host.player.pos = vec(lip.x, lip.y);
      host.beginPitDescent({});
      return;
    }
    // Resolve where the world catches you: the anchored zone below (launch
    // shelves), else the ground this zone HANGS OVER (the Nether tie,
    // resolved at loadZone), else home. (below may name a pocket — resolve
    // against both maps the way loadZone will.)
    const below = shelf.below;
    const anchored = !!below && !!(host.zoneMap[below.zoneId] ?? host.caveMap[below.zoneId]);
    // A zone can never be BELOW ITSELF (a dev-minted surface flux zone would
    // otherwise resolve its own coordinate and fall into itself).
    const destId = anchored ? below!.zoneId
      : host.skyBelow?.zoneId ?? host.nearestZoneOf('surface', shelf.map, shelf.id) ?? START_ZONE;
    const from = vec(host.player.pos.x, host.player.pos.y);
    // The PROPORTIONAL drop: where you stood on the shelf is where you land
    // on the ground below (the stretch the understory's windows show) — fall
    // through a hole and come down on the very terrain you saw through it.
    const fx = Math.min(1, Math.max(0, from.x / Math.max(1, shelf.size.w)));
    const fy = Math.min(1, Math.max(0, from.y / Math.max(1, shelf.size.h)));
    host.beginTraversal('sky_fall', {
      swap: () => {
        const ret = host.caveReturn;
        host.caveReturn = host.caveStack.pop() ?? null;
        host.loadZone(destId, (ret && ret.zoneId === destId ? ret.entryFrom : null) ?? undefined);
        // Anchored: map the fall point through the shelf's center↔anchor.
        // Unanchored: the proportional spot on the resolved ground.
        const land = anchored
          ? host.clampPos(vec(below!.ax + (from.x - shelf.size.w / 2), below!.ay + (from.y - shelf.size.h / 2)), host.player.radius)
          : host.clampPos(vec(fx * host.arena.w, fy * host.arena.h), host.player.radius);
        // THE PARTY-LANDING LAW: the whole party rides the fall down together.
        host.landPartyAt(land);
        host.caveExitGrace = true; // in case the fall lands you back at a mouth
        hurt();
        if (!anchored) {
          host.text(vec(land.x, land.y - 40), `the sky lets you go — ${host.zone.name} rises to meet you`, '#9fc0e8', 14);
        }
      },
    });
  }

export function sceneRouteSkyFalls(host:NativeSceneCampaignTransitionHost,fell: readonly { pos: Vec2 }[]): void {
    if (!fell.length) return;
    const seatActors = new Set<Actor>(host.seats.map(s => s.actor));
    for (const f of fell) {
      const a = f as Actor; // the fields hand back the same objects they were given
      if (a === host.player) {
        host.beginSkyfall();
        continue;
      }
      if (seatActors.has(a) || a.team === 'player') {
        // Allies scramble: snapped to the nearest standing ground, shaken.
        const s = host.walk?.snapToWalkable(a.pos) ?? host.zoneEntry;
        host.teleportActor(a, vec(s.x, s.y), '#cfe0ff');
        continue;
      }
      // The sky keeps what falls: gone outright — no corpse, no loot, no
      // credit (it fell; nobody killed it).
      host.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius + 16, color: '#dfe8fa', life: 0.4, maxLife: 0.4 });
      host.text(vec(a.pos.x, a.pos.y - 22), 'falls!', '#c8d4ea', 12);
      a.dead = true;
      const idx = host.actors.indexOf(a);
      if (idx >= 0) { host.actors.splice(idx, 1); host.retireFallenActor(a); }
    }
  }

export function sceneBeginPitDescent(host:NativeSceneCampaignTransitionHost,policy: { damage?: DamageSpec }): void {
    if (host.traversal || host.pendingRespawn) return;
    const parent = host.zone;
    const at = host.player.pos;
    const drop = PIT_CFG.dropCave;
    const seed = hashStr(pitIdentityKey(parent.id, at.x, at.y));
    const id = `cave_${parent.id}_pit_${seed}`;
    // THE PUNISHMENT MINT (PIT_CFG.dropCave): the hollow asks nothing
    // (objective 'none' — no clear bounty, no chest), opens nothing
    // (noDeeper — no mouths, no breach, no shaft reveals), and counts the
    // chain of falls above it (pitChain — the maxChain meter in
    // routePitFall). All policy, zero bespoke ids.
    if (!host.caveMap[id]) {
      host.caveMap[id] = mintCave(parent, seed, id, undefined, {
        objective: { ...drop.objective },
        noDeeper: drop.noDeeper,
        pitChain: (parent.pitChain ?? 0) + 1,
      });
    }
    const rim = vec(at.x, at.y);
    const entryWas = host.entryFrom;
    const dmg = policy.damage ?? PIT_CFG.fallDamage;
    host.beginTraversal('chasm_fall', {
      swap: () => {
        // Descending DEEPER (the sidezone ladder discipline): bank the way
        // home; the hollow's exit climbs back out at this very rim.
        if (host.caveReturn) host.caveStack.push(host.caveReturn);
        host.caveReturn = { zoneId: parent.id, pos: rim, entryFrom: entryWas, kind: 'pitfall' };
        host.loadZone(id, parent.id);
        // THE SCATTER (drop.arrival): the dark does not deliver you to the
        // door — the fall lands somewhere out in the hollow, and the climb-
        // out mouth must be WALKED to. 'portal' keeps the classic arrival.
        if (drop.arrival === 'scatter') host.scatterPitArrival();
        host.caveExitGrace = true;
        bumpLedger(host.ledger, PIT_CFG.ledger);
      },
      done: () => {
        // The toll lands WITH the body (the traversal keeps it invulnerable
        // until the land phase clears — a mid-veil bite would silently
        // no-op, and a fall that never hurts reads as a free elevator).
        host.applyEnvDamage(host.player, dmg);
        host.text(vec(host.player.pos.x, host.player.pos.y - 40),
          `the dark catches you — ${host.zone.name}`, '#b8a888', 14);
      },
    });
  }

export function sceneRoutePitFall(host:NativeSceneCampaignTransitionHost,a: Actor, policy: { damage?: DamageSpec }, pre: Vec2, forced: boolean): void {
    if (a.flying || a.dash || a.leap || a.caromRun) return;
    if (a === host.player) {
      // THE LADDER RUNS OUT (PIT_CFG.dropCave.maxChain): a hollow already
      // hanging maxChain consecutive falls deep resolves the next fall as
      // the CLASSIC edge-bite — same toll, no new rung, the anti-farm floor.
      // Player-only by design: hostiles shoved past a lip are swallowed
      // regardless (the knockback payoff never dulls with depth).
      if ((host.zone.pitChain ?? 0) >= PIT_CFG.dropCave.maxChain) {
        host.text(vec(a.pos.x, a.pos.y - 34), 'the crack narrows — nothing below but stone', '#9a8ab8', 12);
        // Deliberately NOT pitPolicyFor: the zone's word ('descend') is what
        // routed the fall HERE — re-reading it would answer descend forever.
        // The ladder's floor is a LITERAL edge-bite.
        host.applyRecovery(a, { kind: 'fall', to: 'edge', damage: policy.damage ?? PIT_CFG.fallDamage }, pre, forced);
        return;
      }
      host.beginPitDescent(policy);
      return;
    }
    if (a.team === 'player' || host.seats.some(s => s.actor === a)) {
      // Allies scramble: back to standing ground, shaken — a seat must never
      // be lost down a hole its player didn't choose.
      const s = host.walk?.snapToWalkable(a.pos) ?? pre;
      host.teleportActor(a, vec(s.x, s.y), '#cfe0ff');
      return;
    }
    if (!forced) return; // held at the lip — steering never walks a body off
    // Swallowed: the shove in flight carries its caster, and the dark pays
    // the shover like any killer — knockback into the pit IS the kill.
    const shover = a.push?.caster && !a.push.caster.dead ? a.push.caster : undefined;
    host.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius + 14, color: '#141019', life: 0.4, maxLife: 0.4 });
    host.kill(a, false, shover);
  }
