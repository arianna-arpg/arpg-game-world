/** Frozen native originals; preparation has no World integration yet. */
export const nativeSceneSummonPreparationArchive={
  "originalCommit": "8c7ab5fae732b49e29e6aa756ad9b98670be16e0",
  "originalWorldHash": "35f5af8d0d14cd74b08564b9abb12a344d5deb418cd76d345296e5cc922aafd4",
  "workingWorldHash": "16b5f721fabef72ea9e655464fe7c80bdaf190f4bd7b85e307c391105c4465f2",
  "rows": [
    {
      "name": "rollSummonType",
      "before": "private rollSummonType(d: SummonDelivery): string {\n    if (d.pool && d.pool.length) {\n      let total = 0;\n      for (const p of d.pool) total += p.weight;\n      let roll = rand(0, total);\n      for (const p of d.pool) {\n        roll -= p.weight;\n        if (roll <= 0) return p.id;\n      }\n      return d.pool[d.pool.length - 1].id;\n    }\n    return d.monsterId!;\n  }",
      "hash": "cbb883feaf15c024fa446af93fe6b25330f6d49226a49355bcfa2455540e35b9"
    },
    {
      "name": "forwardSummonSockets",
      "before": "private forwardSummonSockets(summonInst: SkillInstance | undefined, skills: (SkillInstance | null)[],\n    opts?: {\n      /** THE FORWARD PRICE (construct lanes): stamp this scale on every\n       *  forwarded copy — its numeric mods fold ×scale (instanceMods).\n       *  Minion-crew forwards pass none: Resonance's socket is their price. */\n      scale?: number;\n    }): void {\n    if (!summonInst) return;\n    // THE RESONANCE GATE (CREW_CFG.boarding 'gated'): summon-delivery\n    // crews demand a resonance key riding the host before anything boards\n    // — the whole system priced at one socket. Non-summon hosts (Forgebound\n    // proc-conscripts, Hiveborn broods on a melee skill) board FREE: the\n    // proc/graft that minted them was the price of admission, and their\n    // hosts could never socket the summon-gated key anyway.\n    const summonHost = summonInst.def.delivery.type === 'summon' || !!instanceSummon(summonInst);\n    if (summonHost && !crewBoardingOpen(summonInst)) return;\n    // FIXPOINT passes: a forwarded gem's grantsTags can open the door for\n    // another (Faultfinder's 'fissure' admits Tectonic Echoes) regardless\n    // of how the player arranged the summon's sockets — arrangement\n    // independence, matching the gate and the lane router.\n    // GRAFTS forward exactly like socketed gems — a devotion bound onto a\n    // summon skill reaches the crew (the fantasy: your Hunt rides your\n    // skeletons). Same fixpoint, same fit gates, same forwarded stamping.\n    const carried = summonInst.grafts?.length\n      ? [...summonInst.sockets, ...summonInst.grafts] : summonInst.sockets;\n    let grew = true;\n    while (grew) {\n      grew = false;\n      for (const socket of carried) {\n        if (!socket || !supportRidesMinions(socket.def)) continue;\n        for (const sk of skills) {\n          if (!sk || sk.sockets.some(x => x?.def.id === socket.def.id)) continue;\n          if (!supportFitsInst(socket.def, sk, socket.rolled)) continue;\n          sk.sockets.push({\n            def: socket.def, level: socket.level, forwarded: true,\n            // THE CUT rides the crew (the support base): a forwarded copy\n            // of a chassis gem keeps its vein roll — the keeper's cut is\n            // the whole gem's identity, aboard or at home.\n            ...(socket.rolled ? { rolled: { ...socket.rolled } } : {}),\n            ...(opts?.scale !== undefined && opts.scale !== 1 ? { forwardScale: opts.scale } : {}),\n          });\n          grew = true;\n        }\n      }\n    }\n  }",
      "hash": "1fda1d32fe4c5f8d9ebb5889e61c288fcb0ba2ecfa0e0dd890c754e4e2915c90"
    }
  ],
  "progressionChanges": [
    {
      "before": "export function sceneRelevelActor(nativeHost:NativeSceneProgressionHost,",
      "after": "export type NativeSceneRelevelHost=Pick<NativeSceneProgressionHost,'stampMonsterLevel'>;\nexport type NativeSceneMinionOwnerStatsHost=Pick<NativeSceneProgressionHost,'account'|'localSeat'|'seatOf'|'relevelActor'>;\nexport function sceneRelevelActor(nativeHost:NativeSceneRelevelHost,"
    },
    {
      "before": "export function sceneBakeMinionOwnerStats(nativeHost:NativeSceneProgressionHost,",
      "after": "export function sceneBakeMinionOwnerStats(nativeHost:NativeSceneMinionOwnerStatsHost,"
    }
  ],
  "progressionBeforeHash": "46cf74b48c68df2fcb277e7300ec795a5752e832099d02752bac3c064ad26f0d",
  "preimageCommit": "82f91c99997700b67ee73bb6aa00bab1f9293163"
} as const;
export const nativeSceneSummonPreparationArchiveHash="c82428f3766d9c7ada4482708e4e0056bc523e7311361df23286341350b83cfe";
