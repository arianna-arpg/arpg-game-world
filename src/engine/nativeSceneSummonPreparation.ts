/** Exact native summon selection and crew forwarding; no scene state or effects. */
import {rand} from '../core/math';
import {crewBoardingOpen,instanceSummon,supportRidesMinions,supportFitsInst,type SkillInstance,type SummonDelivery} from './skills';
export function sceneRollSummonType(d: SummonDelivery): string {
    if (d.pool && d.pool.length) {
      let total = 0;
      for (const p of d.pool) total += p.weight;
      let roll = rand(0, total);
      for (const p of d.pool) {
        roll -= p.weight;
        if (roll <= 0) return p.id;
      }
      return d.pool[d.pool.length - 1].id;
    }
    return d.monsterId!;
  }

export function sceneForwardSummonSockets(summonInst: SkillInstance | undefined, skills: (SkillInstance | null)[],
    opts?: {
      /** THE FORWARD PRICE (construct lanes): stamp this scale on every
       *  forwarded copy — its numeric mods fold ×scale (instanceMods).
       *  Minion-crew forwards pass none: Resonance's socket is their price. */
      scale?: number;
    }): void {
    if (!summonInst) return;
    // THE RESONANCE GATE (CREW_CFG.boarding 'gated'): summon-delivery
    // crews demand a resonance key riding the host before anything boards
    // — the whole system priced at one socket. Non-summon hosts (Forgebound
    // proc-conscripts, Hiveborn broods on a melee skill) board FREE: the
    // proc/graft that minted them was the price of admission, and their
    // hosts could never socket the summon-gated key anyway.
    const summonHost = summonInst.def.delivery.type === 'summon' || !!instanceSummon(summonInst);
    if (summonHost && !crewBoardingOpen(summonInst)) return;
    // FIXPOINT passes: a forwarded gem's grantsTags can open the door for
    // another (Faultfinder's 'fissure' admits Tectonic Echoes) regardless
    // of how the player arranged the summon's sockets — arrangement
    // independence, matching the gate and the lane router.
    // GRAFTS forward exactly like socketed gems — a devotion bound onto a
    // summon skill reaches the crew (the fantasy: your Hunt rides your
    // skeletons). Same fixpoint, same fit gates, same forwarded stamping.
    const carried = summonInst.grafts?.length
      ? [...summonInst.sockets, ...summonInst.grafts] : summonInst.sockets;
    let grew = true;
    while (grew) {
      grew = false;
      for (const socket of carried) {
        if (!socket || !supportRidesMinions(socket.def)) continue;
        for (const sk of skills) {
          if (!sk || sk.sockets.some(x => x?.def.id === socket.def.id)) continue;
          if (!supportFitsInst(socket.def, sk, socket.rolled)) continue;
          sk.sockets.push({
            def: socket.def, level: socket.level, forwarded: true,
            // THE CUT rides the crew (the support base): a forwarded copy
            // of a chassis gem keeps its vein roll — the keeper's cut is
            // the whole gem's identity, aboard or at home.
            ...(socket.rolled ? { rolled: { ...socket.rolled } } : {}),
            ...(opts?.scale !== undefined && opts.scale !== 1 ? { forwardScale: opts.scale } : {}),
          });
          grew = true;
        }
      }
    }
  }
