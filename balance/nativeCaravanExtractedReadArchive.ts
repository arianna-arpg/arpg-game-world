/** Exact accepted record-observation and shared-registry additions; original source comparisons remain unchanged. */
export const nativeCaravanExtractedReadArchive = {
  "commit": "e0600ae89d2970a385b91a702553ec05b3038dcb",
  "predecessor": "484f926385acb033c36d084d14125b17a23f3be6",
  "rows": [
    {
      "file": "src/engine/nativeSceneKillAftermath.ts",
      "current": "60605459504f4e84a6282147b6d4ed239736c734f1241fee17d119e7889800e3",
      "prior": "27d79363cfcb3903124c874cbecbe400317ea47d585a4d1a57f7dc2177610f26",
      "hunks": [
        {
          "before": "/** Exact native kill pickup rolls and deferred death-burst construction.\n * Attribution, death execution, pickup/burst ticking and retirement remain separate. */\nimport type {World} from \"./world\";\n",
          "after": "import {observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';\nimport type {Actor as NativeRecordActor} from './actor';\nimport type {SkillInstance as NativeRecordSkill} from './skills';\n/** Exact native kill pickup rolls and deferred death-burst construction.\n * Attribution, death execution, pickup/burst ticking and retirement remain separate. */\nimport type {World} from \"./world\";\n"
        },
        {
          "before": "      if (c <= 0 || !chance(Math.min(0.75, c))) continue;\n      const ang = rand(0, Math.PI * 2);\n      const r = rand(10, 40);\n      host.remnants.push({\n        pos: host.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 8),\n        kind: kind.id, bob: rand(0, Math.PI * 2), life: 12,\n      });\n      if (host.remnants.length >= 14) break;\n    }\n  }\n",
          "after": "      if (c <= 0 || !chance(Math.min(0.75, c))) continue;\n      const ang = rand(0, Math.PI * 2);\n      const r = rand(10, 40);\n      {\n let nativeQueue:typeof host.remnants;let nativeRecord:(typeof host.remnants)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;\n (nativeQueue=observeNativeCombatStorage(host,'remnants',host.remnants)).push(nativeRecord={\n        pos: host.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 8),\n        kind: kind.id, bob: rand(0, Math.PI * 2), life: 12,\n      });\n observeNativeCombatRecord(host,'remnants',nativeQueue,nativeRecord,nativeSource,nativeInstance);\n}\n      if (host.remnants.length >= 14) break;\n    }\n  }\n"
        },
        {
          "before": "    // any retune; at base speed the orb is always escapable, and its sloppy turn keeps\n    // it dodgeable even under slows.\n    const escapeCap = STAT_DEFS.moveSpeed.base * 0.75;\n    host.deathBursts.push({\n      phase: 'gather', mode: cfg.mode,\n      pos: vec(a.pos.x, a.pos.y), team: a.team, tier: a.tier,\n      dmg: a.maxLife() * cfg.damageFrac,\n",
          "after": "    // any retune; at base speed the orb is always escapable, and its sloppy turn keeps\n    // it dodgeable even under slows.\n    const escapeCap = STAT_DEFS.moveSpeed.base * 0.75;\n    {\n let nativeQueue:typeof host.deathBursts;let nativeRecord:(typeof host.deathBursts)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;\n (nativeQueue=observeNativeCombatStorage(host,'deathBursts',host.deathBursts)).push(nativeRecord={\n      phase: 'gather', mode: cfg.mode,\n      pos: vec(a.pos.x, a.pos.y), team: a.team, tier: a.tier,\n      dmg: a.maxLife() * cfg.damageFrac,\n"
        },
        {
          "before": "      contact: cfg.detonateOnContact ?? false, stuck: false,\n      contactFuse: cfg.contactFuse ?? 0.3, contactRadius: cfg.contactRadius ?? 12,\n    });\n  }\n",
          "after": "      contact: cfg.detonateOnContact ?? false, stuck: false,\n      contactFuse: cfg.contactFuse ?? 0.3, contactRadius: cfg.contactRadius ?? 12,\n    });\n observeNativeCombatRecord(host,'deathBursts',nativeQueue,nativeRecord,nativeSource,nativeInstance);\n}\n  }\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneProjectiles.ts",
      "current": "010d4baa38c46803df7ae0d169da2d5bf4c652e4d759547788482b536db64a31",
      "prior": "fd4d2934687c2fa7c76c13bcb543e6f5398c3161e7467c862619dd01849b9575",
      "hunks": [
        {
          "before": "/** Exact native projectile launch and occlusion fold; ticking stays with its actual combat owner. */\nimport type {World} from './world';\nimport {cosmeticSkillPaint} from '../meta/cosmetics';\n",
          "after": "import {observeNativeCombatStorage,observeNativeCombatRecord} from './nativeCombatRecordObservation';\nimport type {Actor as NativeRecordActor} from './actor';\nimport type {SkillInstance as NativeRecordSkill} from './skills';\n/** Exact native projectile launch and occlusion fold; ticking stays with its actual combat owner. */\nimport type {World} from './world';\nimport {cosmeticSkillPaint} from '../meta/cosmetics';\n"
        },
        {
          "before": "    const nativeReturn = d.returns === 'origin' ? 1 : d.returns === 'caster' ? 2 : 0;\n    const grantedReturn = Math.round(caster.sheet.get('projReturn', tags, extra));\n\n    host.projectiles.push({\n      pos: vec(origin.x, origin.y),\n      orbPaint: d.orbPaint,\n      // THE TIER LAW: a flight belongs to its caster's layer (chain children\n",
          "after": "    const nativeReturn = d.returns === 'origin' ? 1 : d.returns === 'caster' ? 2 : 0;\n    const grantedReturn = Math.round(caster.sheet.get('projReturn', tags, extra));\n\n    {\n let nativeQueue:typeof host.projectiles;let nativeRecord:(typeof host.projectiles)[number];let nativeSource:NativeRecordActor|null=null;let nativeInstance:NativeRecordSkill|undefined=undefined;\n (nativeQueue=observeNativeCombatStorage(host,'projectiles',host.projectiles)).push(nativeRecord={\n      pos: vec(origin.x, origin.y),\n      orbPaint: d.orbPaint,\n      // THE TIER LAW: a flight belongs to its caster's layer (chain children\n"
        },
        {
          "before": "      pierce: (d.pierce ?? 0) + Math.round(caster.sheet.get('pierceCount', tags, extra)),\n      chains: Math.round(caster.sheet.get('chainCount', tags, extra)),\n      hits: new Map(),\n      caster, inst, color: cosmeticPaint.color ?? def.color,\n      cosmeticMotif: cosmeticPaint.motif,\n      cosmeticProjectile: cosmeticPaint.projectile,\n      shape: d.shape ?? 'circle',\n",
          "after": "      pierce: (d.pierce ?? 0) + Math.round(caster.sheet.get('pierceCount', tags, extra)),\n      chains: Math.round(caster.sheet.get('chainCount', tags, extra)),\n      hits: new Map(),\n      caster:(nativeSource=caster), inst:(nativeInstance=inst), color: cosmeticPaint.color ?? def.color,\n      cosmeticMotif: cosmeticPaint.motif,\n      cosmeticProjectile: cosmeticPaint.projectile,\n      shape: d.shape ?? 'circle',\n"
        },
        {
          "before": "      arcRate: t?.arcTo,\n      patrol: opts?.patrol?.length ? { points: opts.patrol.map(p2 => vec(p2.x, p2.y)), idx: 0 } : undefined,\n    });\n  }\n\nexport function sceneSkillOcclusion(host:NativeSceneProjectileHost,caster: Actor, inst: SkillInstance): 'blocked' | 'free' | 'travel' {\n",
          "after": "      arcRate: t?.arcTo,\n      patrol: opts?.patrol?.length ? { points: opts.patrol.map(p2 => vec(p2.x, p2.y)), idx: 0 } : undefined,\n    });\n observeNativeCombatRecord(host,'projectiles',nativeQueue,nativeRecord,nativeSource,nativeInstance);\n}\n  }\n\nexport function sceneSkillOcclusion(host:NativeSceneProjectileHost,caster: Actor, inst: SkillInstance): 'blocked' | 'free' | 'travel' {\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeScenePuzzles.ts",
      "current": "1231d2939bf1955d19149ab69b09a748de5e8a99ab20dd8833b43c18822f09e6",
      "prior": "01c227e8e04ba3eca23ea9e48ae9a5f6f3dd3eb9801cb606faca63cd59f6b724",
      "hunks": [
        {
          "before": "/** Original native puzzle clocks, hit queue and completion; bound to an explicit owner. */\nimport {dist,rand,vec} from '../core/math';\nimport {Actor} from './actor';\n",
          "after": "import {observeNativeHiddenSource} from './nativeCombatRecordObservation';\n/** Original native puzzle clocks, hit queue and completion; bound to an explicit owner. */\nimport {dist,rand,vec} from '../core/math';\nimport {Actor} from './actor';\n"
        },
        {
          "before": "    }\n    if (rw?.cast && SKILLS[rw.cast]) {\n      if (!owner.hazardCaster) {\n        const c = new Actor('Resonance', 'player', vec(0, 0));\n        c.untargetable = true; c.invulnerable = true;\n        owner.hazardCaster = c;\n      }\n",
          "after": "    }\n    if (rw?.cast && SKILLS[rw.cast]) {\n      if (!owner.hazardCaster) {\n        const c = observeNativeHiddenSource(owner,()=>new Actor('Resonance', 'player', vec(0, 0)));\n        c.untargetable = true; c.invulnerable = true;\n        owner.hazardCaster = c;\n      }\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneRewardStorage.ts",
      "current": "428430cf9f3071ff0901183f9813ac77b30ca268b66f7522a5515174388dcb61",
      "prior": "df9d9e906b31e1fdf44961ceab938c072bcad2316d8cd9462be6e5ac97066e08",
      "hunks": [
        {
          "before": "/** Exclusive raw queues for the native area's rewards and physical contents.\n * Replacement keeps the caller's array and its native methods unchanged. */\nexport type NativeRewardStorageSlot='orbs'|'chests'|'shrines'|'altars'|'drops'|'remnants'|'deathBursts';\nconst ownedStates=new WeakSet<object>(),ownedQueues=new WeakMap<object,object>();\nfunction queue(value:unknown):unknown[]{\n if(!Array.isArray(value))throw Error('Native reward storage requires an actual array');\n return value;\n",
          "after": "import {nativeAreaStoreClaims} from './nativeAreaStorageClaims';\n/** Exclusive raw queues for the native area's rewards and physical contents.\n * Replacement keeps the caller's array and its native methods unchanged. */\nexport type NativeRewardStorageSlot='orbs'|'chests'|'shrines'|'altars'|'drops'|'remnants'|'deathBursts';\nconst ownedStates=new WeakSet<object>(),ownedQueues=nativeAreaStoreClaims;\nfunction queue(value:unknown):unknown[]{\n if(!Array.isArray(value))throw Error('Native reward storage requires an actual array');\n return value;\n"
        }
      ]
    }
  ]
} as const;
