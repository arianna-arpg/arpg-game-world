/** Immutable thirteen native displacement members and their original push constants. */
export const nativeSceneDisplacementArchive={
  "commit": "4949cef50dfc77eb80e47107b758761ab734e1f6",
  "worldHash": "19d353d8c5b0d7934b7b8b0e13989f4b2c21ab7af4dd244088525e1754371d1e",
  "rows": [
    {
      "name": "pushActor",
      "before": "pushActor(target: Actor, dir: number, strength: number, caster?: Actor, inst?: SkillInstance,\n    opts?: {\n      /** The impulse arrives with its authority ALREADY SPENT (a plow-\n       *  through's momentum hand-off, engine/mass.ts) — fold only the\n       *  target's weight, never the shover's again. */\n      noAuthority?: boolean;\n    }): void {\n    // Planted things stay put — and a DORMANT un-roused neutral is planted:\n    // stray splash knockback must not scatter a sleeping band (the hit that\n    // ROUSES it restores physics the same tick aiAwakened latches). A\n    // MASSED construct (the Unmoored graft) is deliberately NOT planted —\n    // its weight is its only anchor now.\n    if ((target.construct && !target.construct.massed)\n      || target.anchored || target.leap || isDormant(target)) return;\n    // A HELD body eats the shove INTO the grip (the grab fabric): the\n    // impulse jostles the break meter instead of moving the pair — the\n    // hold, not the body, absorbs the blow.\n    if (target.heldBy !== undefined) {\n      const holder = this.actorById(target.heldBy);\n      const hold = holder?.gripping;\n      if (hold && hold.id === target.id) hold.struggle += strength * GRAB_CFG.break.shoveFeed;\n      return;\n    }\n    // A hard enough shove ON a holder tears its hold loose first (a pair\n    // never rides a launch); the stumble itself then lands normally.\n    if (target.gripping && strength >= GRAB_CFG.release.shove) {\n      this.grabRelease(target);\n    }\n    // A latched rider is SCRAPED LOOSE by any real shove (the latch's\n    // knockback counterplay, engine/cling.ts) — released first so the\n    // impulse lands on a free body.\n    if (target.clingTo) this.clingRelease(target);\n    // AUTHORITY: the PUSHER's mass folds in (engine/mass.ts) — heavy bodies\n    // shove harder, exactly 1 at effective weight 1 so every casterless\n    // push (wind, traps, tracks) and every fresh-hero knockback keeps its\n    // tuned reach. The asymmetry the fabric exists for: the ogre moves you\n    // more readily than you move it, UNLESS you build toward poise/mass.\n    const auth = caster && !opts?.noAuthority ? shoveAuthority(caster, inst) : 1;\n    // WEIGHT: mass divides the shove — a knockback that sends a goblin\n    // flying nudges an ogre. effectiveWeight folds in CURRENT unbroken\n    // poise (a poised colossus is an anchor; break the bar to move it) on\n    // top of the weight stat (Fortitude raises it, curses can shed it).\n    const eff = strength * auth / target.effectiveWeight();\n    const vx = Math.cos(dir) * eff * PUSH_DAMPING;\n    const vy = Math.sin(dir) * eff * PUSH_DAMPING;\n    const p = target.push;\n    if (p) {\n      p.vx += vx; p.vy += vy;\n      const sp = Math.hypot(p.vx, p.vy);\n      if (sp > PUSH_MAX_SPEED) { p.vx *= PUSH_MAX_SPEED / sp; p.vy *= PUSH_MAX_SPEED / sp; }\n      // The newest shover owns the collision procs; the crush re-arms.\n      if (caster && inst) { p.caster = caster; p.inst = inst; p.collided = false; }\n    } else {\n      target.push = { vx, vy, caster, inst };\n    }\n  }",
      "hash": "6c7e60a95821cd7d937c5ed64ce5fe587e014a1347cb107a42c13fe2bdbc8e60",
      "line": 35817
    },
    {
      "name": "grabRelease",
      "before": "private grabRelease(a: Actor): void {\n    const hold = a.gripping;\n    a.gripping = undefined;\n    if (!hold) return;\n    const v = this.actorById(hold.id);\n    if (!v) return;\n    if (v.heldBy === a.id) v.heldBy = undefined;\n    if (hold.verb === 'swallow') v.untargetable = hold.wasUntargetable ?? false;\n    for (let i = v.statuses.length - 1; i >= 0; i--) {\n      const id = v.statuses[i].id;\n      if (id === 'seized' || id === 'swallowed') {\n        v.statuses.splice(i, 1);\n        v.sheet.removeSource('status:' + id);\n      }\n    }\n    v.grabProofUntil = Math.max(v.grabProofUntil,\n      this.time + (hold.spec.releaseGrace ?? GRAB_CFG.break.graceSec));\n  }",
      "hash": "5d3983c8af9d33ff2fc3630df25020686dffc799a9e5d4d457a1c61577a556ae",
      "line": 28375
    },
    {
      "name": "clingRelease",
      "before": "private clingRelease(a: Actor, cause: 'shake' | 'drop' = 'drop'): void {\n    const ride = a.clingTo;\n    a.clingTo = undefined;\n    const bur = cause === 'shake' ? a.cling?.burrow : undefined;\n    // THE FLOP (ClingSpec.flop): the pop-out for a perched, visible rider —\n    // the shake alone earns it; burrow wins where both are authored.\n    const flop = cause === 'shake' && !bur ? a.cling?.flop : undefined;\n    a.clingCooldownUntil = this.time\n      + (bur ? bur.grace ?? CLING_CFG.burrow.grace\n        : flop ? flop.grace ?? CLING_CFG.flop.grace\n          : CLING_CFG.reattachGrace);\n    // The burrow marker dies with the ride (refresh-driven, but a half-\n    // second of ghost body would be a lie — the grab-release law).\n    for (let i = a.statuses.length - 1; i >= 0; i--) {\n      if (a.statuses[i].id === 'burrowed') {\n        a.statuses.splice(i, 1);\n        a.sheet.removeSource('status:burrowed');\n      }\n    }\n    if (!ride) return;\n    const ang = (bur || flop) ? rand(0, Math.PI * 2) : ride.ang;\n    const hop = bur ? bur.toss ?? CLING_CFG.burrow.toss\n      : flop ? flop.toss ?? CLING_CFG.flop.toss\n        : CLING_CFG.detachHop;\n    a.pos = this.clampPos(vec(\n      a.pos.x + Math.cos(ang) * hop,\n      a.pos.y + Math.sin(ang) * hop), a.radius);\n    // The flop's worn beat: the status row's own duration IS the window\n    // (data keeps it aligned with the grace — the lamprey's flail).\n    if (flop?.status && STATUS_DEFS[flop.status]) a.applyStatus(flop.status, 0, 1, 'the flop');\n    if (bur || flop) {\n      // The pop-out reads: a body flung clear of the flesh it was inside.\n      this.flashes.push({\n        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 6,\n        color: a.color, life: 0.22, maxLife: 0.22,\n      });\n    }\n  }",
      "hash": "8e910082161b3a77383363796fd11d986989f8836e39719b8cf8f196010af52f",
      "line": 28186
    },
    {
      "name": "teleportActor",
      "before": "teleportActor(actor: Actor, dest: Vec2, color = '#b8c8ff', disp?: DisplacementPolicy, story?: number): void {\n    this.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 1.6, color, life: 0.25, maxLife: 0.25 });\n    // A flicker/blink may carry a DisplacementPolicy ({ignoreConfine}) to land past\n    // walls + across the void; default (no disp) = nearest-walkable snap as before.\n    // `story` (the tier fabric's enclosure law): the STORY the arrival seats\n    // on — the body wears it and the snap confines against that story's own\n    // floor (a blink stays upstairs; a recalled minion joins its keeper's\n    // layer). Absent = the legacy base-grid snap, byte for byte.\n    if (story !== undefined) actor.tier = story;\n    actor.pos = this.clampPos(vec(dest.x, dest.y), actor.radius, undefined,\n      story !== undefined ? { ...(disp ? { disp } : {}), mover: actor } : disp ? { disp } : undefined);\n    actor.dash = null;\n    this.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 1.8, color, life: 0.3, maxLife: 0.3 });\n  }",
      "hash": "451fd10d0042ec750c0123f28a0a1c49a93d2b02e221e31d6970d483cefc5999",
      "line": 25254
    },
    {
      "name": "mountFreeSeat",
      "before": "mountFreeSeat(m: Actor, slot: MountSlotSpec | undefined): number {\n    const cap = seatCount(slot);\n    for (let i = 0; i < cap; i++) {\n      let held = false;\n      for (const id of m.riderIds ?? []) {\n        const r = this.actorById(id);\n        if (r && !r.dead && r.mountId === m.id && (r.mountSeat ?? 0) === i) { held = true; break; }\n      }\n      if (!held) return i;\n    }\n    return -1;\n  }",
      "hash": "56c96e3059229b1938e4a73e2c836c89f3ebf1d20db107521006f546d1dd8873",
      "line": 11421
    },
    {
      "name": "mountSeatRider",
      "before": "mountSeatRider(r: Actor, m: Actor): boolean {\n    const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;\n    const seat = this.mountFreeSeat(m, slot);\n    if (seat < 0) return false;\n    r.mountId = m.id;\n    r.mountSeat = seat;\n    (m.riderIds ??= []).push(r.id);\n    const ri = this.actors.indexOf(r);\n    if (ri >= 0) {\n      this.actors.splice(ri, 1);\n      const mi = this.actors.indexOf(m);\n      this.actors.splice(mi < 0 ? this.actors.length : mi + 1, 0, r);\n    }\n    return true;\n  }",
      "hash": "14756a9610475f7fe0fa11e564178bc96a0766d963efbfad9acf510ae8161526",
      "line": 11404
    },
    {
      "name": "mountUnlink",
      "before": "mountUnlink(r: Actor, riderDied = false): void {\n    const m = r.mountId !== undefined ? this.actorById(r.mountId) : undefined;\n    r.mountId = undefined;\n    r.mountSeat = undefined;\n    if (!m) return;\n    const left = (m.riderIds ?? []).filter(id => id !== r.id);\n    m.riderIds = left.length ? left : undefined;\n    if (!left.length && !m.dead) {\n      if (m.team === 'enemy' && !m.owner) m.fromZoneGen = true;\n      if (riderDied) this.mountWidowed(m);\n    }\n  }",
      "hash": "bd409bf9ce67b9cdb267fdaeb2cd7766ee5b3dfd0584630fa5e6ad800ec48e55",
      "line": 11439
    },
    {
      "name": "mountUnhorse",
      "before": "private mountUnhorse(r: Actor, m: Actor): void {\n    this.mountUnlink(r);\n    r.applyStatus(MOUNT_CFG.unhorse.status, 0, 1, 'Unhorsed');\n    this.pushActor(r, rand(0, Math.PI * 2), MOUNT_CFG.unhorse.push);\n    this.flashes.push({\n      pos: vec(m.pos.x, m.pos.y), radius: m.radius * 1.4,\n      color: MOUNT_CFG.unhorse.color, life: 0.3, maxLife: 0.3,\n    });\n  }",
      "hash": "e823cbc02010d60961c166e5cb86a9535e096415a7521cac55ad661224a52c77",
      "line": 11456
    },
    {
      "name": "mountWidowed",
      "before": "private mountWidowed(m: Actor): void {\n    const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;\n    if (slot?.onRiderDeath === 'rout') {\n      m.applyStatus('horrified', 0, 5, 'Widowed');\n    }\n  }",
      "hash": "008b6d542bfa821e37defa28b0aed717238037828e01f66ac9cac65c34751e59",
      "line": 11471
    },
    {
      "name": "movementLocked",
      "before": "movementLocked(a: Actor): boolean {\n    if (a.magicPack && a.sheet.getSourceMods('magicPack:beamChannel')) return true;\n    if (a.magicPack && a.sheet.getSourceMods('magicPack:eventChannel')) return true;\n    // The PASSIVE lock is a volition lock — a DRIVEN body (engine-wheeled\n    // scenery: the serpent's passing glimpse) has no volition to lock; the\n    // engine's own hand moves it. Death, stun, dash and anchors still hold.\n    // The carom motor is a volition lock too — the ball has no legs; the\n    // stick feeds nothing while the ride holds (reflex flasks still fire).\n    // THE STROLLING SCENERY (ai.ts updateHaunt): a passive body wearing a\n    // haunt has volition enough to drift between its seats — the lock lifts\n    // for it alone; every other passive body stands as ever.\n    if (a.dash || a.leap || a.caromRun || a.isStunned() || a.dead || a.anchored\n      || (a.passive && !a.driven && !(a.defId && MONSTERS[a.defId]?.brain?.behavior?.haunt))) return true;\n    // SEALS & FORMS: a toggled form with moveFactor 0 ROOTS its bearer\n    // (Stormbind plants you) — factors above 0 slow in moveActor instead.\n    for (const au of a.activeAuras.values()) {\n      const ad = au.inst.def.delivery;\n      if (ad.type === 'aura' && ad.moveFactor === 0) return true;\n    }\n    if (a.casting) {\n      if (a.casting.mode === 'channel') {\n        // channelMobility (Walking Meditation) can unlock even an IMMOBILE\n        // channel — invest hard enough and you stroll mid-maelstrom.\n        // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec binds here\n        // exactly as it does at the pulse clock — a Gathered Casting\n        // conversion walks by its own synthesized words (move 'slowed'),\n        // never by the def the conversion replaced. One resolution, one law.\n        return (a.casting.gather ?? instanceChannel(a.casting.inst))?.move === 'immobile'\n          && this.channelMobility(a, a.casting.inst) <= 0;\n      }\n      if (a.casting.mode === 'guard') return false;\n      // MOBILE CASTS: castMove data + the castMobility stat can unroot any\n      // cast bar — certain attacks are meant to be walked.\n      return this.castMoveFactor(a, a.casting.inst) <= 0;\n    }\n    return false;\n  }",
      "hash": "df3a9fdbc328452f8dd587eb9b3ea5beecee51ef500bd17699abe3117fcb8171",
      "line": 56847
    },
    {
      "name": "castMoveFactor",
      "before": "private castMoveFactor(a: Actor, inst: SkillInstance): number {\n    return Math.min(1, (inst.def.castMove ?? 0)\n      + a.sheet.get('castMobility', skillContextTags(inst), instanceMods(inst)));\n  }",
      "hash": "c0959ad0ceab46b8b98fc16445e74bbc6ee89fe03055afe0ce4292fa1b8b69fb",
      "line": 56887
    },
    {
      "name": "channelMobility",
      "before": "private channelMobility(a: Actor, inst: SkillInstance): number {\n    return a.sheet.get('channelMobility', skillContextTags(inst), instanceMods(inst));\n  }",
      "hash": "dcd7f06bd8165eaf6faed0302ad6ace6e6a1ae8213203db7c33e4500eee764b7",
      "line": 56894
    },
    {
      "name": "levitating",
      "before": "levitating(a: Actor): boolean {\n    return a.levitates || a.sheet.get('levitation') > 0;\n  }",
      "hash": "a5fc42eefa2785630c2efc360ca7ebfd11eeb64ab48e217adaaa7c82f81a699d",
      "line": 45870
    }
  ],
  "config": [
    "const PUSH_DAMPING = 5.5;",
    "const PUSH_MAX_SPEED = 1500;"
  ]
} as const;
export const nativeSceneDisplacementArchiveHash="110f9ca19b0318659a40e795cbac3e88ad759b7677b71ba11c4240134d55afa5";
