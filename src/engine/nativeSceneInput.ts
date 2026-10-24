import {observeNativeCombatRecord} from './nativeCombatRecordObservation';
/** Original native input rules. The retained campaign supplies actual per-seat owners. */
import {vec,type Vec2} from '../core/math';
import {replenishingDelivery} from './replenishment';
import {Actor} from './actor';
import {HONEST_INPUT_CFG,SPENT_PRESS_CFG,type PlayerInput} from '../net/intent';
import {instanceMeta,instanceMetas,instanceTrigger,makeSkillInstance,socketSpec,META_CHAIN_INTERVAL,type SkillInstance} from './skills';
import {rollItem} from './itemgen';
import {SKILLS} from '../data/skills';
import {sceneNoteCast} from './scenes';
import {BOUNTY_BOARD_CFG} from '../data/bountyboard';
import {TRACE_CFG,traceFeed as traceFeedStep,traceVerdict,type TracePath,type TraceState} from './trace';
import {Rng} from '../core/rng';
import {bumpLedger} from '../packages/ledger';
import {hashStr} from './nativeSceneConfig';
import type {World,Seat} from './world';
export interface NativeSceneInputHost {
 actingSeat:World["actingSeat"];
 castPress:World["castPress"];
 charDirty:World["charDirty"];
 doorPressIntents:World["doorPressIntents"];
 dropGearAt:World["dropGearAt"];
 harvestFeed:World["harvestFeed"];
 harvestSessions:World["harvestSessions"];
 harvestSettle:World["harvestSettle"];
 hivecallMeta:World["hivecallMeta"];
 improvisedFor:World["improvisedFor"];
 improvisedHinted:World["improvisedHinted"];
 improvisedInst:World["improvisedInst"];
 inputClock:World["inputClock"];
 lastInputSeq:World["lastInputSeq"];
 ledger:World["ledger"];
 localSeat:World["localSeat"];
 manifest:World["manifest"];
 mintMetaInstance:World["mintMetaInstance"];
 moveActor:World["moveActor"];
 moveBudget:World["moveBudget"];
 noHeld:World["noHeld"];
 notice:World["notice"];
 pendingMetas:World["pendingMetas"];
 player:World["player"];
 scene:World["scene"];
 seatNote:World["seatNote"];
 seatOf:World["seatOf"];
 seats:World["seats"];
 skillInputOrder:World["skillInputOrder"];
 spendPress:World["spendPress"];
 spendPresses:World["spendPresses"];
 spentPresses:World["spentPresses"];
 time:World["time"];
 timeflow:World["timeflow"];
 traceFeed:World["traceFeed"];
 traceRests:World["traceRests"];
 traceRuns:World["traceRuns"];
 traceSettle:World["traceSettle"];
 unspentHeld:World["unspentHeld"];
 useMetaSkill:World["useMetaSkill"];
 useSkill:World["useSkill"];
 walkFrames:World["walkFrames"];
}

export function sceneApplyInputs(nativeHost:NativeSceneInputHost,inputs: Map<string, PlayerInput>, dt: number): void {
    nativeHost.doorPressIntents = null;
    nativeHost.inputClock += dt; // THE TIME BUDGET's clock: raw seconds, never bent by timeflow
    for (const seat of nativeHost.seats) {
      const a = seat.actor;
      nativeHost.actingSeat = seat; // THE ACTING SEAT: what this seat's hands cause is this seat's
      const inp = inputs.get(seat.id);
      // ACK the input seq even when the seat can't act (dead/downed) — so the
      // client's prediction history stays trimmed and never replays stale inputs.
      if (inp?.seq !== undefined) nativeHost.lastInputSeq.set(seat.id, inp.seq);
      if (a.dead || a.downed) continue;
      // THE SPENT PRESS (net/intent.ts SPENT_PRESS_CFG, docs/engine/
      // input.md): this seat's held[] with every slot an interaction gate
      // SPENT still masked — lifted here, BEFORE any gate, the frame its
      // button is seen UP or goes down afresh, so a release under a freeze
      // still counts. A seat with nothing spent reads its own array.
      const held = inp ? nativeHost.unspentHeld(seat, inp) : nativeHost.noHeld;
      // THE HARVEST RITE (engine/harvest.ts, THE INPUT LAW): a seat
      // mid-sequence speaks to the rite alone — its slot presses land as
      // SYMBOLS through harvestFeed and its whole gameplay intent
      // (movement, casts, aim) is swallowed here, BEFORE the timeflow
      // bend, so the couch/co-op branch (world unfrozen) is exactly as
      // deaf as the solo freeze. A bound skill can never fire off a
      // sequence key. THE TRACE (engine/trace.ts, the same input law): a
      // forging seat's aim is the pen and its intent belongs to the line —
      // swallowed for the identical reason. And what a gate swallows it
      // SPENDS (spendPresses): the closing symbol's hold, a held miss, the
      // drawing bind — none of them reach the cast lane below when the
      // gate lifts. A new gate joins this one `||` and inherits the law.
      if (nativeHost.harvestFeed(seat, inp) || nativeHost.traceFeed(seat, inp)) {
        nativeHost.spendPresses(seat, inp);
        continue;
      }
      // THE TIMEFLOW BEND (engine/timeflow.ts): a held seat's intent is
      // inert — a stasis'd (or menu-paused) hero neither moves nor casts;
      // the DOM menus above stay live, and the seq ack above already kept
      // client prediction honest. Fractional time bends the walk below.
      const tf = nativeHost.timeflow.scaleFor(a);
      if (tf <= 0) continue;
      if (!inp) continue;
      // Capture only unconsumed, non-combat walking. Each update consumes this
      // once, including paused/dead frames; a stale input cannot open a door.
      if ((inp.dx || inp.dy) && !inp.held.some(Boolean) && !inp.edge.some(Boolean) && !inp.metaEdge?.some(Boolean))
        (nativeHost.doorPressIntents ??= new Map()).set(seat.id, vec(inp.dx, inp.dy));
      // THE HONEST INPUT (net/intent.ts HONEST_INPUT_CFG): a wire client's frames
      // walk at the dt each was polled for, every frame of the tick's batch, under
      // THE TIME BUDGET; an input with no dt walks the tick's dt exactly as ever.
      if (inp.moves || inp.dt !== undefined) nativeHost.walkFrames(seat, a, inp, tf, dt);
      else nativeHost.moveActor(a, inp.dx, inp.dy, tf === 1 ? dt : dt * tf);
      const aim = inp.aim;
      // LIVE aim for guided projectiles (guidePower) — refreshed every frame,
      // so a missile already in flight keeps chasing the moving cursor.
      a.aimPos = vec(aim.x, aim.y);
      // Keep a running cast fed (held state, aim tracking, mid-cast presses).
      if (a.casting) {
        // Identity first; a MINTED payload (convert/meta — hostSkillId
        // stamped, never a bar entry) is fed by ITS HOST'S button: holding
        // the empty scattergun holds its rack channel, releasing cuts the
        // reload short. Without this, off-bar holds die on the next frame.
        let ci = a.skills.findIndex(s => s === a.casting!.inst);
        if (ci < 0 && a.casting.inst.hostSkillId !== undefined) {
          ci = a.skills.findIndex(s => s?.def.id === a.casting!.inst.hostSkillId);
        }
        a.casting.held = ci >= 0 ? !!held[ci] : false;
        if (ci >= 0 && inp.edge[ci]) nativeHost.castPress(a);
        if (a.casting.mode === 'channel' || a.casting.mode === 'charge'
          || a.casting.mode === 'guard' || a.casting.mode === 'overcharge'
          // Concentration IS cursor-tracking: the live aim decides whether
          // focus holds — stale aim would make the mechanic unplayable.
          || a.casting.mode === 'concentration') {
          a.casting.aim = aim;
        }
      }
      // A fresh skill or walk owns the next opportunity before older repeats.
      // Running casts above retain their held state and native commitment;
      // walking cannot cancel them or release a held guard/channel.
      // Toggled auras still respond to the press edge; other skills to the hold.
      for (const i of nativeHost.skillInputOrder.slots(seat,a.skills.length,held,inp.edge,inp.metaEdge,!!(inp.dx||inp.dy))) {
        const inst = a.skills[i];
        if (!inst) {
          // THE UNARMED FLOOR: an EMPTY slot still answers — the improvised
          // strike (data/skills.ts), through the same honest cast pipeline
          // as any gem: it locks its useTime, obeys the aim, and does the
          // same nothing everyone else's mid-cast press does. A GAME RULE,
          // not a client nicety — remote seats get the same floor. The
          // opt-out is LOCAL: Settings.improvisedStrike zeroes empty-slot
          // intent at the client (main.ts), so a declined floor never even
          // arrives here.
          if (held[i] && nativeHost.useSkill(a, nativeHost.improvisedFor(a), aim, true)) {
            if (a === nativeHost.player) sceneNoteCast(nativeHost);
            if (!nativeHost.improvisedHinted.has(a)) {
              // Found, not taught: the first swing names itself once.
              nativeHost.improvisedHinted.add(a);
              nativeHost.seatNote(nativeHost.seatOf(a), vec(a.pos.x, a.pos.y - 46),
                'Bare hands answer an empty slot (Options can quiet them)', '#b8b0a0', 13);
            }
          }
          continue;
        }
        const toggle = !!replenishingDelivery(inst)?.replenish?.toggle
          || (inst.def.delivery.type === 'aura' && inst.def.delivery.mode === 'toggle')
          || (inst.def.delivery.type === 'ground' && !!inst.def.delivery.strobe)
          || instanceTrigger(inst) !== undefined
          || socketSpec(inst, 'curseOnHit') !== undefined;
        // META-ACTIONS (shift+slot): the mini-button riding the slot — and
        // the meta OWNS the slot on its frame: the physical button is still
        // down during a modifier press (held[] is deliberately preserved for
        // running guards), so without this else-if the HOST would start its
        // own cast in the same beat and the payload would find the caster
        // "busy" — metas only worked while the host was on cooldown.
        if (inp.metaEdge?.[i] && instanceMeta(inst)) {
          nativeHost.useMetaSkill(a, inst, aim);
          // THE META PRESS BELONGS TO THE META (THE SPENT PRESS on the meta
          // lane — docs/engine/input.md): the physical button stays DOWN on
          // the frames after the modifier press, and the cast lane fires
          // most skills on the HOLD — so a stance shift's own key drank the
          // converted Whistle one frame later. The press is spent for the
          // hold (a release or a fresh edge lifts it — unspentHeld's law),
          // whatever the payload did with it — UNLESS this slot is feeding a
          // RUNNING held cast (a guard, a channel): there the modifier alone
          // fired the held skill's meta and the hand must stay on the key.
          const feeding = !!a.casting
            && (a.casting.inst === inst || a.casting.inst.hostSkillId === inst.def.id);
          if (!feeding) nativeHost.spendPress(seat, i);
        } else if (toggle ? inp.edge[i] : held[i]) {
          // The drill's count (engine/scenes.ts): the local hero's own
          // seat-pressed casts, at the one artery they all flow through.
          if (nativeHost.useSkill(a, inst, aim, true) && a === nativeHost.player) sceneNoteCast(nativeHost);
        }
      }
      // Face the cursor/target while able, so swings read right.
      if (a.canAct()) a.facing = Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
    }
    nativeHost.actingSeat = null;
  }

export function scenePassInputTime(nativeHost:NativeSceneInputHost,sec: number): void {
    if (sec > 0 && Number.isFinite(sec)) nativeHost.inputClock += sec;
  }

export function sceneUnspentHeld(nativeHost:NativeSceneInputHost,seat: Seat, inp: PlayerInput): readonly boolean[] {
    const spent = nativeHost.spentPresses.get(seat.id);
    if (!spent) return inp.held;
    const held = inp.held.slice();
    for (const i of spent) {
      if (!inp.held[i] || inp.edge[i] || inp.metaEdge?.[i]) spent.delete(i);
      else held[i] = false;
    }
    if (spent.size === 0) nativeHost.spentPresses.delete(seat.id);
    return held;
  }

export function sceneSpendPresses(nativeHost:NativeSceneInputHost,seat: Seat, inp: PlayerInput | null | undefined): void {
    const mode = SPENT_PRESS_CFG.spend;
    if (!inp || mode === 'off') return;
    let spent = nativeHost.spentPresses.get(seat.id);
    for (let i = 0; i < inp.held.length; i++) {
      const took = mode === 'hold' ? inp.held[i] : (inp.edge[i] || !!inp.metaEdge?.[i]);
      if (!took) continue;
      if (!spent) nativeHost.spentPresses.set(seat.id, spent = new Set());
      spent.add(i);
    }
  }

export function sceneSpendPress(nativeHost:NativeSceneInputHost,seat: Seat, slot: number): void {
    if (SPENT_PRESS_CFG.spend === 'off') return;
    let spent = nativeHost.spentPresses.get(seat.id);
    if (!spent) nativeHost.spentPresses.set(seat.id, spent = new Set());
    spent.add(slot);
  }

export function sceneWalkFrames(nativeHost:NativeSceneInputHost,seat: Seat, a: Actor, inp: PlayerInput, tf: number, dt: number): void {
    const cfg = HONEST_INPUT_CFG;
    let b = nativeHost.moveBudget.get(seat.id);
    if (!b) nativeHost.moveBudget.set(seat.id, b = { credit: cfg.graceSec, at: nativeHost.inputClock - dt, refused: 0 });
    b.credit = Math.min(cfg.bankSec, b.credit + (nativeHost.inputClock - b.at));
    b.at = nativeHost.inputClock;
    const moves = inp.moves;
    const n = moves ? Math.min(moves.length, cfg.maxBatch) : 1;
    for (let i = 0; i < n; i++) {
      const m = moves ? moves[i] : null;
      const mx = m ? m[0] : inp.dx, my = m ? m[1] : inp.dy, claim = m ? m[2] : inp.dt;
      let step = typeof claim === 'number' && claim > 0 ? Math.min(claim, cfg.maxMoveDt) : 0;
      if (step > 0 && (mx || my)) {
        if (step > b.credit) {
          b.refused += step - b.credit;
          step = b.credit;
          if (step <= 0) continue; // refused whole: past the budget nothing walks
        }
        b.credit -= step;
      }
      nativeHost.moveActor(a, mx, my, tf === 1 ? step : step * tf);
    }
  }

export function sceneImprovisedFor(nativeHost:NativeSceneInputHost,a: Actor): SkillInstance {
    let inst = nativeHost.improvisedInst.get(a);
    if (!inst) {
      inst = makeSkillInstance(SKILLS['improvised_strike'], 1);
      nativeHost.improvisedInst.set(a, inst);
    }
    return inst;
  }

export function sceneHarvestFeed(nativeHost:NativeSceneInputHost,seat: Seat, inp: PlayerInput | null | undefined): boolean {
    const s = nativeHost.harvestSessions.find(x => x.seatId === seat.id);
    if (!s) return false;
    if (inp) {
      for (let i = 0; i < inp.edge.length; i++) {
        if (!inp.edge[i]) continue;
        if (i === s.seq[s.done]) {
          s.done++;
          if (s.done >= s.seq.length) { nativeHost.harvestSettle(s, 'complete'); break; }
        } else {
          s.misses++;
          s.missT = 0.3;
        }
      }
    }
    return true;
  }

export function sceneTraceFeed(nativeHost:NativeSceneInputHost,seat: Seat, inp: PlayerInput | null | undefined): boolean {
    const r = nativeHost.traceRuns.find(x => x.seatId === seat.id);
    if (!r) return false;
    if (inp) {
      traceFeedStep(r.path, r.state, inp.aim.x, inp.aim.y, !!inp.held[0], r.slipCap);
      if (r.state.done || r.state.failed) nativeHost.traceSettle(r);
    }
    return true;
  }

export function sceneTraceSettle(nativeHost:NativeSceneInputHost,r: { seatId: string; path: TracePath; state: TraceState; held: boolean; writUid: number; baseId: string; complexity: number; ilvl: number; slipCap: number }): void {
    const i = nativeHost.traceRuns.indexOf(r);
    if (i < 0) return;
    nativeHost.traceRuns.splice(i, 1);
    if (r.held) nativeHost.timeflow.release('trace');
    const seat = nativeHost.seats.find(s => s.id === r.seatId) ?? nativeHost.localSeat;
    const v = traceVerdict(r.path, r.state);
    if (r.state.failed) {
      nativeHost.traceRests.set(r.writUid, nativeHost.time + TRACE_CFG.failCooldownSec);
      nativeHost.notice(`The hand slipped once too often — the piece is ruined; the writ endures (rests ${TRACE_CFG.failCooldownSec}s).`, BOUNTY_BOARD_CFG.accent, 15, 'civic');
      nativeHost.charDirty = true;
      return;
    }
    const it = seat.meta.items.find(x => x.uid === r.writUid);
    if (!it?.writ) return; // the writ left the bag mid-trace — nothing to honor
    seat.meta.items = seat.meta.items.filter(x => x.uid !== r.writUid);
    const F = BOUNTY_BOARD_CFG.lanes.craft.forge;
    const rng = new Rng((nativeHost.manifest.seed ^ hashStr(`forge:${r.writUid}`)) >>> 0);
    const rare = Math.round(v.accuracy * 100);
    const item = rollItem({
      ilvl: Math.max(1, r.ilvl + Math.round(v.accuracy * F.ilvlBonusMax)),
      baseId: r.baseId, rng: () => rng.next(),
      rarityWeights: { common: 0, magic: Math.max(F.magicFloor, 100 - rare), rare },
    });
    if (item) nativeHost.dropGearAt(vec(seat.actor.pos.x, seat.actor.pos.y + 24), item, undefined, true);
    bumpLedger(nativeHost.ledger, 'writs_forged');
    const face = v.accuracy >= 0.92 ? 'a masterwork hand'
      : v.accuracy >= 0.75 ? 'a fine hand'
        : v.accuracy >= 0.5 ? 'a steady-enough hand' : 'a shaking hand';
    nativeHost.notice(`FORGED — ${face} (${Math.round(v.accuracy * 100)}%).`, BOUNTY_BOARD_CFG.accent, 16, 'civic');
    nativeHost.charDirty = true;
  }

export function sceneUseMetaSkill(nativeHost:NativeSceneInputHost,caster: Actor, host: SkillInstance, aim: Vec2): boolean {
    // THE META CHAIN: one shift-press fires EVERY meta riding the slot —
    // the innate order first, then each socketed grant in SLOT ORDER, one
    // per META_CHAIN_INTERVAL beat (the player curates the sequence by
    // arranging gems: Skeletal Strike before Self-Destruct = lunge, THEN
    // the bang). The first beat fires now; the rest queue.
    const metas = instanceMetas(host).filter(m => SKILLS[m.skillId]);
    if (!metas.length) return false;
    const native = metas[0].skillId === 'enrage_swarm' ? nativeHost.hivecallMeta(caster, host) : undefined;
    const ok = native ?? nativeHost.useSkill(caster, nativeHost.mintMetaInstance(caster, host, metas[0].skillId), aim);
    for (let i = 1; i < metas.length; i++) {
      let nativeStorage: NativeSceneInputHost['pendingMetas'];
      let nativeRecord: NativeSceneInputHost['pendingMetas'][number];
      (nativeStorage = nativeHost.pendingMetas).push(nativeRecord = {
        caster, host, skillId: metas[i].skillId,
        aim: vec(aim.x, aim.y), timer: META_CHAIN_INTERVAL * i,
      });
      observeNativeCombatRecord(nativeHost,'pendingMetas',nativeStorage,nativeRecord,caster,host);
    }
    return ok;
  }

/** Original statement boundaries; caller selects the physical owner for each seat. */
export function sceneInputBegin(nativeHost:NativeSceneInputHost,dt:number):void {
nativeHost.doorPressIntents = null;
nativeHost.inputClock += dt;
}
export function sceneInputSeat(nativeHost:NativeSceneInputHost,selected:Seat,inputs:Map<string,PlayerInput>,dt:number):void {
for(const seat of [selected]) {
      const a = seat.actor;
      nativeHost.actingSeat = seat; // THE ACTING SEAT: what this seat's hands cause is this seat's
      const inp = inputs.get(seat.id);
      // ACK the input seq even when the seat can't act (dead/downed) — so the
      // client's prediction history stays trimmed and never replays stale inputs.
      if (inp?.seq !== undefined) nativeHost.lastInputSeq.set(seat.id, inp.seq);
      if (a.dead || a.downed) continue;
      // THE SPENT PRESS (net/intent.ts SPENT_PRESS_CFG, docs/engine/
      // input.md): this seat's held[] with every slot an interaction gate
      // SPENT still masked — lifted here, BEFORE any gate, the frame its
      // button is seen UP or goes down afresh, so a release under a freeze
      // still counts. A seat with nothing spent reads its own array.
      const held = inp ? nativeHost.unspentHeld(seat, inp) : nativeHost.noHeld;
      // THE HARVEST RITE (engine/harvest.ts, THE INPUT LAW): a seat
      // mid-sequence speaks to the rite alone — its slot presses land as
      // SYMBOLS through harvestFeed and its whole gameplay intent
      // (movement, casts, aim) is swallowed here, BEFORE the timeflow
      // bend, so the couch/co-op branch (world unfrozen) is exactly as
      // deaf as the solo freeze. A bound skill can never fire off a
      // sequence key. THE TRACE (engine/trace.ts, the same input law): a
      // forging seat's aim is the pen and its intent belongs to the line —
      // swallowed for the identical reason. And what a gate swallows it
      // SPENDS (spendPresses): the closing symbol's hold, a held miss, the
      // drawing bind — none of them reach the cast lane below when the
      // gate lifts. A new gate joins this one `||` and inherits the law.
      if (nativeHost.harvestFeed(seat, inp) || nativeHost.traceFeed(seat, inp)) {
        nativeHost.spendPresses(seat, inp);
        continue;
      }
      // THE TIMEFLOW BEND (engine/timeflow.ts): a held seat's intent is
      // inert — a stasis'd (or menu-paused) hero neither moves nor casts;
      // the DOM menus above stay live, and the seq ack above already kept
      // client prediction honest. Fractional time bends the walk below.
      const tf = nativeHost.timeflow.scaleFor(a);
      if (tf <= 0) continue;
      if (!inp) continue;
      // Capture only unconsumed, non-combat walking. Each update consumes this
      // once, including paused/dead frames; a stale input cannot open a door.
      if ((inp.dx || inp.dy) && !inp.held.some(Boolean) && !inp.edge.some(Boolean) && !inp.metaEdge?.some(Boolean))
        (nativeHost.doorPressIntents ??= new Map()).set(seat.id, vec(inp.dx, inp.dy));
      // THE HONEST INPUT (net/intent.ts HONEST_INPUT_CFG): a wire client's frames
      // walk at the dt each was polled for, every frame of the tick's batch, under
      // THE TIME BUDGET; an input with no dt walks the tick's dt exactly as ever.
      if (inp.moves || inp.dt !== undefined) nativeHost.walkFrames(seat, a, inp, tf, dt);
      else nativeHost.moveActor(a, inp.dx, inp.dy, tf === 1 ? dt : dt * tf);
      const aim = inp.aim;
      // LIVE aim for guided projectiles (guidePower) — refreshed every frame,
      // so a missile already in flight keeps chasing the moving cursor.
      a.aimPos = vec(aim.x, aim.y);
      // Keep a running cast fed (held state, aim tracking, mid-cast presses).
      if (a.casting) {
        // Identity first; a MINTED payload (convert/meta — hostSkillId
        // stamped, never a bar entry) is fed by ITS HOST'S button: holding
        // the empty scattergun holds its rack channel, releasing cuts the
        // reload short. Without this, off-bar holds die on the next frame.
        let ci = a.skills.findIndex(s => s === a.casting!.inst);
        if (ci < 0 && a.casting.inst.hostSkillId !== undefined) {
          ci = a.skills.findIndex(s => s?.def.id === a.casting!.inst.hostSkillId);
        }
        a.casting.held = ci >= 0 ? !!held[ci] : false;
        if (ci >= 0 && inp.edge[ci]) nativeHost.castPress(a);
        if (a.casting.mode === 'channel' || a.casting.mode === 'charge'
          || a.casting.mode === 'guard' || a.casting.mode === 'overcharge'
          // Concentration IS cursor-tracking: the live aim decides whether
          // focus holds — stale aim would make the mechanic unplayable.
          || a.casting.mode === 'concentration') {
          a.casting.aim = aim;
        }
      }
      // A fresh skill or walk owns the next opportunity before older repeats.
      // Running casts above retain their held state and native commitment;
      // walking cannot cancel them or release a held guard/channel.
      // Toggled auras still respond to the press edge; other skills to the hold.
      for (const i of nativeHost.skillInputOrder.slots(seat,a.skills.length,held,inp.edge,inp.metaEdge,!!(inp.dx||inp.dy))) {
        const inst = a.skills[i];
        if (!inst) {
          // THE UNARMED FLOOR: an EMPTY slot still answers — the improvised
          // strike (data/skills.ts), through the same honest cast pipeline
          // as any gem: it locks its useTime, obeys the aim, and does the
          // same nothing everyone else's mid-cast press does. A GAME RULE,
          // not a client nicety — remote seats get the same floor. The
          // opt-out is LOCAL: Settings.improvisedStrike zeroes empty-slot
          // intent at the client (main.ts), so a declined floor never even
          // arrives here.
          if (held[i] && nativeHost.useSkill(a, nativeHost.improvisedFor(a), aim, true)) {
            if (a === nativeHost.localSeat.actor) sceneNoteCast(nativeHost);
            if (!nativeHost.improvisedHinted.has(a)) {
              // Found, not taught: the first swing names itself once.
              nativeHost.improvisedHinted.add(a);
              nativeHost.seatNote(nativeHost.seatOf(a), vec(a.pos.x, a.pos.y - 46),
                'Bare hands answer an empty slot (Options can quiet them)', '#b8b0a0', 13);
            }
          }
          continue;
        }
        const toggle = !!replenishingDelivery(inst)?.replenish?.toggle
          || (inst.def.delivery.type === 'aura' && inst.def.delivery.mode === 'toggle')
          || (inst.def.delivery.type === 'ground' && !!inst.def.delivery.strobe)
          || instanceTrigger(inst) !== undefined
          || socketSpec(inst, 'curseOnHit') !== undefined;
        // META-ACTIONS (shift+slot): the mini-button riding the slot — and
        // the meta OWNS the slot on its frame: the physical button is still
        // down during a modifier press (held[] is deliberately preserved for
        // running guards), so without this else-if the HOST would start its
        // own cast in the same beat and the payload would find the caster
        // "busy" — metas only worked while the host was on cooldown.
        if (inp.metaEdge?.[i] && instanceMeta(inst)) {
          nativeHost.useMetaSkill(a, inst, aim);
          // THE META PRESS BELONGS TO THE META (THE SPENT PRESS on the meta
          // lane — docs/engine/input.md): the physical button stays DOWN on
          // the frames after the modifier press, and the cast lane fires
          // most skills on the HOLD — so a stance shift's own key drank the
          // converted Whistle one frame later. The press is spent for the
          // hold (a release or a fresh edge lifts it — unspentHeld's law),
          // whatever the payload did with it — UNLESS this slot is feeding a
          // RUNNING held cast (a guard, a channel): there the modifier alone
          // fired the held skill's meta and the hand must stay on the key.
          const feeding = !!a.casting
            && (a.casting.inst === inst || a.casting.inst.hostSkillId === inst.def.id);
          if (!feeding) nativeHost.spendPress(seat, i);
        } else if (toggle ? inp.edge[i] : held[i]) {
          // The drill's count (engine/scenes.ts): the local hero's own
          // seat-pressed casts, at the one artery they all flow through.
          if (nativeHost.useSkill(a, inst, aim, true) && a === nativeHost.localSeat.actor) sceneNoteCast(nativeHost);
        }
      }
      // Face the cursor/target while able, so swings read right.
      if (a.canAct()) a.facing = Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
    }
}
export function sceneInputEnd(nativeHost:NativeSceneInputHost):void {
nativeHost.actingSeat = null;
}
