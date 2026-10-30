export interface NativeVerminfallSourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeVerminfallSourceArchive:{parent:string;rows:readonly NativeVerminfallSourceRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "d656f418035283ea6959acc022525398174c0d1d",
  "rows": [
    {
      "file": "balance/nativeShardGroundFixture.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "47ee521a0a020690a9febaff3038d9461aa6aa795f102e833046c5fe2e1669f6",
      "afterHash": "f37787312692414471c6973573605da2d9913c27043d29d71001293cc0e7672c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeVerminfallSourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativeshardgroundsource.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "c6e4f5831f14afa234970cbbc030c4d149bf25a98dd15671b0d76889db58d930",
      "afterHash": "0d83382ae606d5fa4596d31f11818e1ac0e844835d60fba833247d3a87c1ea8c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the shard ground source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the shard ground source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeVerminfallSourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
        }
      ]
    },
    {
      "file": "src/packages/overlays/verminfall.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "a4695f1f452cc231fcf9d61b34c62d96c94b6e12554801bc51db9893d2c7a5d8",
      "afterHash": "dd29eb513864015b6252007c89f63836af86a802caa2567c149d39ac37919c11",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  private readonly gate: () => PackageGate;\n  private readonly cfg: VerminfallSurge;\n  private infestations: ActiveInfestation[] = [];\n  private acc = 0;\n  private seq = 0;\n  /** Live reference to the world's node map (= view.byId), refreshed each tick. */\n",
          "after": "  private readonly gate: () => PackageGate;\n  private readonly cfg: VerminfallSurge;\n  private infestations: ActiveInfestation[] = [];\n  #nativeInfo=new WeakMap<object,ActiveInfestation>();\n  #nativeScope:{epoch:object;zoneId:string;kind:'discovery'|'nest'|'king';check:()=>void;committed:()=>void;used:boolean}|undefined;\n  /** Native identity checks inspect actual ordinary storage. Overridden array\n   * methods and row accessors cannot manufacture membership or a second write. */\n  #nativeRows():ActiveInfestation[] {\n    const own=(object:object,key:PropertyKey):unknown=>{const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Verminfall event needs ordinary data');return d.value;};\n    const rows=own(this,'infestations');if(!Array.isArray(rows))throw Error('Native Verminfall needs its event array');\n    const length=own(rows,'length');if(typeof length!=='number')throw Error('Native Verminfall event array changed');\n    for(let i=0;i<length;i++){\n      const row=own(rows,i);if(!row||typeof row!=='object')throw Error('Native Verminfall event row changed');\n      for(const key of ['id','zoneId'] as const)if(typeof own(row,key)!=='string')throw Error('Native Verminfall event identity changed');\n      for(const key of ['nestsTotal','nestsBroken','age'] as const)if(typeof own(row,key)!=='number')throw Error('Native Verminfall event count changed');\n      for(const key of ['seen','dead'] as const)if(typeof own(row,key)!=='boolean')throw Error('Native Verminfall event state changed');\n    }\n    return rows as ActiveInfestation[];\n  }\n  /** Non-granting identity of the current row, including the absent-event query boundary. */\n  nativeInfestationEpoch(zoneId:string):object|undefined {\n    const rows=this.#nativeRows();for(let i=0;i<rows.length;i++){const inf=rows[i];if(inf.zoneId===zoneId&&!inf.dead)return inf;}return undefined;\n  }\n  /** Non-granting identity of the actual projection returned by infestOn. */\n  nativeInfestationIdentity(info:InfestationInfo,zoneId:string):object|undefined {\n    const inf=this.#nativeInfo.get(info),rows=this.#nativeRows();for(let i=0;i<rows.length;i++)if(rows[i]===inf&&inf.zoneId===zoneId&&!inf.dead)return inf;return undefined;\n  }\n  nativeInfestationCurrent(epoch:object,zoneId:string):boolean {\n    const rows=this.#nativeRows();for(let i=0;i<rows.length;i++){const inf=rows[i];if(inf===epoch&&inf.zoneId===zoneId&&!inf.dead)return true;}return false;\n  }\n  withNativeInfestation<T>(epoch:object,zoneId:string,kind:'discovery'|'nest'|'king',check:()=>void,committed:()=>void,run:()=>T):T {\n    if(this.#nativeScope)throw Error('Native Verminfall scope cannot reenter');\n    const prior=this.#nativeScope;this.#nativeScope={epoch,zoneId,kind,check,committed,used:false};\n    try{return run();}finally{this.#nativeScope=prior;}\n  }\n  #nativeInfestation(zoneId:string,kind:'discovery'|'nest'|'king'):ActiveInfestation|undefined {\n    const selected=this.#nativeScope;\n    if(!selected)return this.infestations.find(inf=>inf.zoneId===zoneId&&!inf.dead);\n    selected.check();\n    if(selected.used||selected.zoneId!==zoneId||selected.kind!==kind)return undefined;\n    const ready=()=>{selected.check();if(this.#nativeScope!==selected||selected.used)throw Error('Native Verminfall selected resolver reentered its mutation');};\n    ready();const rows=this.#nativeRows(),find=rows.find;\n    ready();if(this.#nativeRows()!==rows)throw Error('Native Verminfall selected event array changed');\n    // Identity-only predicate cannot execute an accessor installed by the selected\n    // find callback. The final ordinary-field/current proof follows that callback.\n    const inf=Reflect.apply(find,rows,[(row:ActiveInfestation)=>row===selected.epoch]) as ActiveInfestation|undefined;\n    ready();\n    if(this.#nativeRows()!==rows||inf!==selected.epoch)throw Error('Native Verminfall selected resolver returned another event');\n    return inf;\n  }\n  #nativeCommitted():void {\n    const selected=this.#nativeScope;if(selected){selected.used=true;selected.committed();}\n  }\n\n  private acc = 0;\n  private seq = 0;\n  /** Live reference to the world's node map (= view.byId), refreshed each tick. */\n"
        },
        {
          "before": "    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);\n    if (!inf) return null;\n    const remaining = Math.max(0, inf.nestsTotal - inf.nestsBroken);\n    return {\n      nestsRemaining: remaining,\n      nestsTotal: inf.nestsTotal,\n      kingArmed: remaining <= 0,\n      color: this.cfg.color,\n      label: remaining <= 0 ? 'broken' : inf.nestsBroken > 0 ? 'stirred' : 'festering',\n    };\n  }\n\n  /** TOWN PRESSURE — the ambient-vermin chance multiplier the town's own\n",
          "after": "    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);\n    if (!inf) return null;\n    const remaining = Math.max(0, inf.nestsTotal - inf.nestsBroken);\n    const info:InfestationInfo={\n      nestsRemaining: remaining,\n      nestsTotal: inf.nestsTotal,\n      kingArmed: remaining <= 0,\n      color: this.cfg.color,\n      label: remaining <= 0 ? 'broken' : inf.nestsBroken > 0 ? 'stirred' : 'festering',\n    };\n    this.#nativeInfo.set(info,inf);\n    return info;\n  }\n\n  /** TOWN PRESSURE — the ambient-vermin chance multiplier the town's own\n"
        },
        {
          "before": "  /** The player entered a claimed zone — one-shot true per infestation (the\n   *  engine bumps the discovery ledger + floats the entry line). */\n  markDiscovered(zoneId: string): boolean {\n    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);\n    if (!inf || inf.seen) return false;\n    inf.seen = true;\n    return true;\n  }\n\n  /** A warren nest broke in `zoneId`. Returns the standing count + whether\n   *  that was the LAST one (the kill row manifests the King on true). */\n  onNestBroken(zoneId: string): { remaining: number; kingReady: boolean } | null {\n    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);\n    if (!inf) return null;\n    inf.nestsBroken = Math.min(inf.nestsTotal, inf.nestsBroken + 1);\n    const remaining = inf.nestsTotal - inf.nestsBroken;\n    return { remaining, kingReady: remaining <= 0 };\n  }\n",
          "after": "  /** The player entered a claimed zone — one-shot true per infestation (the\n   *  engine bumps the discovery ledger + floats the entry line). */\n  markDiscovered(zoneId: string): boolean {\n    const inf = this.#nativeInfestation(zoneId,'discovery');\n    if (!inf || inf.seen) return false;\n    inf.seen = true;\n    this.#nativeCommitted();\n    return true;\n  }\n\n  /** A warren nest broke in `zoneId`. Returns the standing count + whether\n   *  that was the LAST one (the kill row manifests the King on true). */\n  onNestBroken(zoneId: string): { remaining: number; kingReady: boolean } | null {\n    const inf = this.#nativeInfestation(zoneId,'nest');\n    if (!inf) return null;\n    inf.nestsBroken = Math.min(inf.nestsTotal, inf.nestsBroken + 1);\n    this.#nativeCommitted();\n    const remaining = inf.nestsTotal - inf.nestsBroken;\n    return { remaining, kingReady: remaining <= 0 };\n  }\n"
        },
        {
          "before": "  /** The manifested King fell — the infestation clears. True once (the\n   *  cleansed ledger gates the Vault tiers). */\n  onKingSlain(zoneId: string): boolean {\n    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);\n    if (!inf || inf.nestsBroken < inf.nestsTotal) return false;\n    inf.dead = true;\n    return true;\n  }\n\n",
          "after": "  /** The manifested King fell — the infestation clears. True once (the\n   *  cleansed ledger gates the Vault tiers). */\n  onKingSlain(zoneId: string): boolean {\n    const inf = this.#nativeInfestation(zoneId,'king');\n    if (!inf || inf.nestsBroken < inf.nestsTotal) return false;\n    inf.dead = true;\n    this.#nativeCommitted();\n    return true;\n  }\n\n"
        },
        {
          "before": "    z: 14,\n  }];\n});\n",
          "after": "    z: 14,\n  }];\n});\n\n/** Capture authentic lifetime helpers in the defining module before exposure. */\nexport const nativeVerminfallLifetimeCalls=Object.freeze({\n  epoch:VerminfallField.prototype.nativeInfestationEpoch,\n  identity:VerminfallField.prototype.nativeInfestationIdentity,\n  current:VerminfallField.prototype.nativeInfestationCurrent,\n  scope:VerminfallField.prototype.withNativeInfestation,\n});\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "dce8cafb9305a28a363a78e14498e16e9aed8dca2098719b3a14e6c61a9ce3c8",
      "afterHash": "dc2a6f379c39345a8318facb8b8812124c1eaf15fede80fc49fffc8b03b21694",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {placeNativeVendetta,createNativeVendettaBody} from './nativeVendettaIdentity';\nimport {nativeFractureLifetimeCalls,type FractureField,type NativeFractureLifetime} from '../packages/overlays/fractures';\nimport {nativeConclaveLifetimeCalls,type ConclaveField} from '../packages/overlays/conclave';\n",
          "after": "import {queryNativeVerminfall,placeNativeVerminfall,nativeVerminfallStep,markNativeVerminfallPlacement,createNativeVerminfallBody,insertNativeVerminfallBody} from './nativeVerminfallIdentity';\nimport {placeNativeVendetta,createNativeVendettaBody} from './nativeVendettaIdentity';\nimport {nativeFractureLifetimeCalls,type FractureField,type NativeFractureLifetime} from '../packages/overlays/fractures';\nimport {nativeConclaveLifetimeCalls,type ConclaveField} from '../packages/overlays/conclave';\n"
        },
        {
          "before": "export function birthMaterializeInfestation(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {\n    const vf = nativeHost.sim.verminfallField;\n    if (!vf) return;\n    const info = vf.infestOn(def.id);\n    if (!info) return;\n    if (nativeHost.materializedInfestation.has(def.id)) return;\n    nativeHost.materializedInfestation.add(def.id);\n    // DISCOVERY — walking a claimed zone surfaces the Vault tuning (one-shot per\n    // infestation), exactly like the Contagion \"you've stumbled in\" bump.\n    if (vf.markDiscovered(def.id)) (0,sources.bumpLedger)(nativeHost.ledger, 'infestation_seen');\n    const cfg = vf.surge();\n    const lvl = Math.max(1, def.level);\n    // THE NESTS: exactly the standing count — a broken warren stays broken.\n    for (let i = 0; i < info.nestsRemaining; i++) {\n      const nest = nativeHost.createMonster(sources.FIXTURE_IDS.warren_nest, lvl, 'enemy');\n      nest.faction = cfg.faction;\n      nest.tag = 'warren_nest';\n      nest.pos = nativeHost.clampPos(nativeHost.farPoint(430), nest.radius);\n      nativeHost.actors.push(nest); observeNativeCombatBirth(nativeHost, nest);\n    }\n    // THE TIDE: pack count lerps with how much of the warren still stands.\n    const roster = sources.FACTIONS[cfg.faction];\n",
          "after": "export function birthMaterializeInfestation(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {\n    const vf = nativeHost.sim.verminfallField;\n    if (!vf) return;\n    const info = queryNativeVerminfall(nativeHost,vf,def,()=>{const selected=vf.infestOn,args=[def.id];return()=>Reflect.apply(selected,vf,args);});\n    if (!info) return;\n    return placeNativeVerminfall(nativeHost,vf,def,info,()=>{\n    if (nativeVerminfallStep(nativeHost,()=>{const marker=nativeHost.materializedInfestation,selected=marker.has,args=[def.id];return()=>Reflect.apply(selected,marker,args);})) return;\n    markNativeVerminfallPlacement(nativeHost,()=>{const marker=nativeHost.materializedInfestation,selected=marker.add,args=[def.id];return()=>Reflect.apply(selected,marker,args);});\n    // DISCOVERY — walking a claimed zone surfaces the Vault tuning (one-shot per\n    // infestation), exactly like the Contagion \"you've stumbled in\" bump.\n    if (nativeVerminfallStep(nativeHost,()=>{const selected=vf.markDiscovered,args=[def.id];return()=>Reflect.apply(selected,vf,args);})) (0,sources.bumpLedger)(nativeHost.ledger, 'infestation_seen');\n    const cfg = nativeVerminfallStep(nativeHost,()=>{const selected=vf.surge;return()=>Reflect.apply(selected,vf,[]);});\n    const lvl = Math.max(1, def.level);\n    // THE NESTS: exactly the standing count — a broken warren stays broken.\n    for (let i = 0; i < info.nestsRemaining; i++) {\n      const nest = createNativeVerminfallBody(nativeHost,'nest',()=>{const selected=nativeHost.createMonster,args=[sources.FIXTURE_IDS.warren_nest,lvl,'enemy'] as const;return()=>Reflect.apply(selected,nativeHost,args);});\n      nest.faction = cfg.faction;\n      nest.tag = 'warren_nest';\n      nest.pos = nativeHost.clampPos(nativeHost.farPoint(430), nest.radius);\n      insertNativeVerminfallBody(nativeHost,nest,()=>{const actors=nativeHost.actors,selected=actors.push;return()=>{Reflect.apply(selected,actors,[nest]); observeNativeCombatBirth(nativeHost, nest);};});\n    }\n    // THE TIDE: pack count lerps with how much of the warren still stands.\n    const roster = sources.FACTIONS[cfg.faction];\n"
        },
        {
          "before": "        const type = nativeHost.weightedPick(roster.table, lvl);\n        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);\n        for (let k = 0; k < n; k++) {\n          const m = nativeHost.createMonster(type, lvl, 'enemy');\n          m.faction = cfg.faction;\n          m.tag = 'vermin';\n          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);\n          nativeHost.actors.push(m); observeNativeCombatBirth(nativeHost, m);\n        }\n      }\n    }\n    // THE KING, if he was left walking (all nests broken, the ground unclaimed).\n    if (info.kingArmed && sources.MONSTERS[cfg.kingDefId]) {\n      const king = nativeHost.createMonster(cfg.kingDefId, Math.max(1, lvl + cfg.kingLevelBonus), 'enemy');\n      king.faction = cfg.faction;\n      king.tag = 'rat_king_manifest';\n      king.pos = nativeHost.clampPos(nativeHost.farPoint(520, true), king.radius);\n      nativeHost.actors.push(king); observeNativeCombatBirth(nativeHost, king);\n      nativeHost.text((0,sources.vec)(king.pos.x, king.pos.y - 60),\n        `${king.name} still walks the broken warren!`, cfg.color, 18);\n    } else if (info.nestsRemaining > 0) {\n      nativeHost.notice('The ground here is riddled with warrens…', cfg.color, 15, 'events');\n    }\n  }\nexport function birthMaterializeCandle(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {\n    const lc = nativeHost.sim.longCandleField;\n",
          "after": "        const type = nativeHost.weightedPick(roster.table, lvl);\n        const n = (0,sources.randInt)(cfg.packSize[0], cfg.packSize[1]);\n        for (let k = 0; k < n; k++) {\n          const m = createNativeVerminfallBody(nativeHost,'vermin',()=>{const selected=nativeHost.createMonster,args=[type,lvl,'enemy'] as const;return()=>Reflect.apply(selected,nativeHost,args);});\n          m.faction = cfg.faction;\n          m.tag = 'vermin';\n          m.pos = nativeHost.clampPos((0,sources.vec)(at.x + (0,sources.rand)(-80, 80), at.y + (0,sources.rand)(-80, 80)), m.radius);\n          insertNativeVerminfallBody(nativeHost,m,()=>{const actors=nativeHost.actors,selected=actors.push;return()=>{Reflect.apply(selected,actors,[m]); observeNativeCombatBirth(nativeHost, m);};});\n        }\n      }\n    }\n    // THE KING, if he was left walking (all nests broken, the ground unclaimed).\n    if (info.kingArmed && sources.MONSTERS[cfg.kingDefId]) {\n      const king = createNativeVerminfallBody(nativeHost,'king',()=>{const selected=nativeHost.createMonster,args=[cfg.kingDefId,Math.max(1,lvl+cfg.kingLevelBonus),'enemy'] as const;return()=>Reflect.apply(selected,nativeHost,args);});\n      king.faction = cfg.faction;\n      king.tag = 'rat_king_manifest';\n      king.pos = nativeHost.clampPos(nativeHost.farPoint(520, true), king.radius);\n      insertNativeVerminfallBody(nativeHost,king,()=>{const actors=nativeHost.actors,selected=actors.push;return()=>{Reflect.apply(selected,actors,[king]); observeNativeCombatBirth(nativeHost, king);};});\n      nativeHost.text((0,sources.vec)(king.pos.x, king.pos.y - 60),\n        `${king.name} still walks the broken warren!`, cfg.color, 18);\n    } else if (info.nestsRemaining > 0) {\n      nativeHost.notice('The ground here is riddled with warrens…', cfg.color, 15, 'events');\n    }\n    });\n  }\nexport function birthMaterializeCandle(nativeHost:NativeSceneRuntimeBirthHost,sources:NativeSceneRuntimeBirthSources, def: ZoneDef): void {\n    const lc = nativeHost.sim.longCandleField;\n"
        }
      ]
    },
    {
      "file": "src/packages/defs/verminfall.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "196e06973fb7534f8d4c9bd9c2fb2d8ee02534d2c261bcceee204e00c3dd2ae8",
      "afterHash": "c59f5d2994855d3e46bd6d06981a437113f9018647cae1f2426b99ea3458a64b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// ---------------------------------------------------------------------------\n// THE VERMINFALL — rats, roaches, and the warren under the granary floor.\n//\n",
          "after": "import {nativeVerminfallBodyCurrent,withNativeVerminfallKill,nativeVerminfallKillStep,createNativeVerminfallKing} from '../../engine/nativeVerminfallIdentity';\n// ---------------------------------------------------------------------------\n// THE VERMINFALL — rats, roaches, and the warren under the granary floor.\n//\n"
        },
        {
          "before": "registerKillHandler({\n  id: 'warren_nest_broken',\n  tag: 'warren_nest',\n  run: ctx => {\n    const vf = ctx.sim.verminfallField;\n    const res = vf?.onNestBroken(ctx.zone.id);\n    ctx.bumpLedger('warren_nests_broken');\n    if (!vf || !res) return;\n    if (res.kingReady) {\n      const surge = vf.surge();\n      const king = ctx.spawnHostileAt(surge.kingDefId,\n        Math.max(1, ctx.zone.level + surge.kingLevelBonus), ctx.actor.pos);\n      king.tag = 'rat_king_manifest';\n      ctx.flash(ctx.actor.pos, 130, surge.color, 0.7);\n      ctx.notice('The warren SCREAMS, and the RAT KING rises!', surge.color, 17, 'events');\n",
          "after": "registerKillHandler({\n  id: 'warren_nest_broken',\n  tag: 'warren_nest',\n  when: ctx => nativeVerminfallBodyCurrent(ctx,'nest'),\n  run: ctx => withNativeVerminfallKill(ctx,'nest',()=>{\n    const vf = ctx.sim.verminfallField;\n    const res = nativeVerminfallKillStep(ctx,()=>{if(!vf)return()=>undefined;const selected=vf.onNestBroken,args=[ctx.zone.id];return()=>Reflect.apply(selected,vf,args);});\n    ctx.bumpLedger('warren_nests_broken');\n    if (!vf || !res) return;\n    if (res.kingReady) {\n      const surge = nativeVerminfallKillStep(ctx,()=>{const selected=vf.surge;return()=>Reflect.apply(selected,vf,[]);});\n      const king = createNativeVerminfallKing(ctx,()=>{\n        const selected=ctx.spawnHostileAt,args=[surge.kingDefId,\n          Math.max(1,ctx.zone.level+surge.kingLevelBonus),ctx.actor.pos] as const;\n        return()=>Reflect.apply(selected,ctx,args);\n      });\n      king.tag = 'rat_king_manifest';\n      ctx.flash(ctx.actor.pos, 130, surge.color, 0.7);\n      ctx.notice('The warren SCREAMS, and the RAT KING rises!', surge.color, 17, 'events');\n"
        },
        {
          "before": "      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 36),\n        `The nest splits; ${res.remaining} warren${res.remaining === 1 ? '' : 's'} still seethe${res.remaining === 1 ? 's' : ''}…`, VERMIN_COLOR, 13);\n    }\n  },\n});\n\n// THE KING FALLS: the infestation clears — the reward path, and the town's\n",
          "after": "      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 36),\n        `The nest splits; ${res.remaining} warren${res.remaining === 1 ? '' : 's'} still seethe${res.remaining === 1 ? 's' : ''}…`, VERMIN_COLOR, 13);\n    }\n  }),\n});\n\n// THE KING FALLS: the infestation clears — the reward path, and the town's\n"
        },
        {
          "before": "registerKillHandler({\n  id: 'rat_king_laid_low',\n  tag: 'rat_king_manifest',\n  run: ctx => {\n    const vf = ctx.sim.verminfallField;\n    const cleared = vf?.onKingSlain(ctx.zone.id) ?? false;\n    ctx.bumpLedger('rat_kings_slain');\n    if (cleared) ctx.bumpLedger('infestations_cleared');\n    const surge = vf?.surge();\n    if (surge) {\n      ctx.grantXp(Math.round(surge.reward.xpBase + ctx.zone.level * surge.reward.xpPerLevel));\n      for (let i = 0; i < surge.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);\n    }\n    ctx.notice('The King is dead. The warren empties, and the town breathes easier.', surge?.color ?? VERMIN_COLOR, 17, 'events');\n  },\n});\n\nexport const VERMINFALL: ContentPackage = {\n",
          "after": "registerKillHandler({\n  id: 'rat_king_laid_low',\n  tag: 'rat_king_manifest',\n  when: ctx => nativeVerminfallBodyCurrent(ctx,'king'),\n  run: ctx => withNativeVerminfallKill(ctx,'king',()=>{\n    const vf = ctx.sim.verminfallField;\n    const cleared = nativeVerminfallKillStep(ctx,()=>{if(!vf)return()=>false;const selected=vf.onKingSlain,args=[ctx.zone.id];return()=>Reflect.apply(selected,vf,args);});\n    ctx.bumpLedger('rat_kings_slain');\n    if (cleared) ctx.bumpLedger('infestations_cleared');\n    const surge = nativeVerminfallKillStep(ctx,()=>{if(!vf)return()=>undefined;const selected=vf.surge;return()=>Reflect.apply(selected,vf,[]);});\n    if (surge) {\n      ctx.grantXp(Math.round(surge.reward.xpBase + ctx.zone.level * surge.reward.xpPerLevel));\n      for (let i = 0; i < surge.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);\n    }\n    ctx.notice('The King is dead. The warren empties, and the town breathes easier.', surge?.color ?? VERMIN_COLOR, 17, 'events');\n  }),\n});\n\nexport const VERMINFALL: ContentPackage = {\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "5f0054c2e58c96d86e6d8707ca11ff4a2358f16ed9885e5bf1d79787e7e0e9b0",
      "afterHash": "b30c24042fce625fe900096deb6dc990bbe158ab98775d36c1998a3cd649d2d3",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {NativeAreaSceneVendettaLifetime} from './nativeAreaSceneVendettaLifetime';\nimport {nativeFractureLifetimeCalls} from '../packages/overlays/fractures';\nimport {nativeFractureBirthCalls} from '../engine/nativeSceneRuntimeBirth';\n",
          "after": "import {NativeAreaSceneVerminfallLifetime} from './nativeAreaSceneVerminfallLifetime';\nimport {NativeAreaSceneVendettaLifetime} from './nativeAreaSceneVendettaLifetime';\nimport {nativeFractureLifetimeCalls} from '../packages/overlays/fractures';\nimport {nativeFractureBirthCalls} from '../engine/nativeSceneRuntimeBirth';\n"
        },
        {
          "before": "import * as core4 from '../engine/nativeSceneCombatEvents';\nimport {NativeAreaSceneWarlordArrival} from './nativeAreaSceneWarlordArrival';\nexport interface NativeAreaSceneCombatInput {assembly:NativeAreaSceneAssembly;progression:NativeAreaSceneProgression;quests:NativeAreaSceneQuests;questInteraction:NativeAreaSceneQuestInteraction;watching:NativeAreaSceneObjectiveWatching;authority:NativeAreaActorAuthority<NativeAreaCombatServices>;campaign:NativeAreaOngoingCampaign;characterWriter:World;maddenLedger:NativeAreaMaddenLedger;coordinator:NativeAreaSceneTransitionCoordinator}\nexport interface NativeAreaCombatServices {readonly vendettaLifetime:NativeAreaSceneVendettaLifetime;readonly serverSeats:NativeAreaServerSeats;readonly conclaveLifetime:NativeAreaSceneConclaveLifetime;readonly crusadeLifetime:NativeAreaSceneCrusadeLifetime;readonly warlordArrival:NativeAreaSceneWarlordArrival;readonly encounterArrival:NativeAreaSceneEncounterArrival;readonly surfaceArrival:NativeAreaSceneSurfaceArrival;readonly harborServices:NativeAreaSceneHarborServices;readonly siteBirths:NativeAreaSceneSiteBirths;readonly historyArrival:NativeAreaSceneHistoryArrival;readonly odyssey:NativeAreaSceneOdyssey;readonly ai:NativeAreaSceneAI;readonly inputFrame:NativeAreaSceneInput;readonly combat:NativeAreaSceneCombat;readonly progression:NativeAreaSceneProgression;readonly loot:NativeAreaSceneAssembly['lootController'];readonly objective:NativeAreaSceneAssembly['objectiveController'];readonly geometry:NativeAreaSceneAssembly['input']['geometry'];readonly maddenLedger:NativeAreaMaddenLedger;readonly campaignOwner:NativeAreaSceneCombatCampaign;readonly combatArena:NativeAreaSceneCombatArena;readonly control:NativeAreaSceneCombatControl;readonly campaignTransitions:NativeAreaSceneCampaignTransitions;readonly campaignFrame:NativeAreaSceneCampaignFrame;readonly tethers:NativeAreaSceneTethers;readonly restoration:NativeAreaSceneRestoration;readonly castingPreparation:NativeAreaSceneCastingPreparation;readonly displacement:NativeAreaSceneDisplacement;readonly combatState:NativeAreaSceneCombatState;readonly defensePreparation:NativeAreaSceneDefensePreparation;readonly projectiles:NativeAreaSceneProjectiles;readonly killAftermath:NativeAreaSceneKillAftermath;readonly groundFollowUps:NativeAreaSceneGroundFollowUps;readonly summonPreparation:NativeAreaSceneSummonPreparation;}\ntype TransferredBuff=Parameters<World['treeBuffSources']['get']>[0];\ninterface ActorControllerPacket {source:NativeAreaSceneCombat;bond:unknown;grants:unknown;clocks:unknown;buffs:[TransferredBuff,NonNullable<ReturnType<World['treeBuffSources']['get']>>][];strike:ReturnType<World['strikeReleaseBodies']['get']>}\nconst controllerTransfers=new WeakMap<object,WeakMap<Actor,ActorControllerPacket>>();\n",
          "after": "import * as core4 from '../engine/nativeSceneCombatEvents';\nimport {NativeAreaSceneWarlordArrival} from './nativeAreaSceneWarlordArrival';\nexport interface NativeAreaSceneCombatInput {assembly:NativeAreaSceneAssembly;progression:NativeAreaSceneProgression;quests:NativeAreaSceneQuests;questInteraction:NativeAreaSceneQuestInteraction;watching:NativeAreaSceneObjectiveWatching;authority:NativeAreaActorAuthority<NativeAreaCombatServices>;campaign:NativeAreaOngoingCampaign;characterWriter:World;maddenLedger:NativeAreaMaddenLedger;coordinator:NativeAreaSceneTransitionCoordinator}\nexport interface NativeAreaCombatServices {readonly verminfallLifetime:NativeAreaSceneVerminfallLifetime;readonly vendettaLifetime:NativeAreaSceneVendettaLifetime;readonly serverSeats:NativeAreaServerSeats;readonly conclaveLifetime:NativeAreaSceneConclaveLifetime;readonly crusadeLifetime:NativeAreaSceneCrusadeLifetime;readonly warlordArrival:NativeAreaSceneWarlordArrival;readonly encounterArrival:NativeAreaSceneEncounterArrival;readonly surfaceArrival:NativeAreaSceneSurfaceArrival;readonly harborServices:NativeAreaSceneHarborServices;readonly siteBirths:NativeAreaSceneSiteBirths;readonly historyArrival:NativeAreaSceneHistoryArrival;readonly odyssey:NativeAreaSceneOdyssey;readonly ai:NativeAreaSceneAI;readonly inputFrame:NativeAreaSceneInput;readonly combat:NativeAreaSceneCombat;readonly progression:NativeAreaSceneProgression;readonly loot:NativeAreaSceneAssembly['lootController'];readonly objective:NativeAreaSceneAssembly['objectiveController'];readonly geometry:NativeAreaSceneAssembly['input']['geometry'];readonly maddenLedger:NativeAreaMaddenLedger;readonly campaignOwner:NativeAreaSceneCombatCampaign;readonly combatArena:NativeAreaSceneCombatArena;readonly control:NativeAreaSceneCombatControl;readonly campaignTransitions:NativeAreaSceneCampaignTransitions;readonly campaignFrame:NativeAreaSceneCampaignFrame;readonly tethers:NativeAreaSceneTethers;readonly restoration:NativeAreaSceneRestoration;readonly castingPreparation:NativeAreaSceneCastingPreparation;readonly displacement:NativeAreaSceneDisplacement;readonly combatState:NativeAreaSceneCombatState;readonly defensePreparation:NativeAreaSceneDefensePreparation;readonly projectiles:NativeAreaSceneProjectiles;readonly killAftermath:NativeAreaSceneKillAftermath;readonly groundFollowUps:NativeAreaSceneGroundFollowUps;readonly summonPreparation:NativeAreaSceneSummonPreparation;}\ntype TransferredBuff=Parameters<World['treeBuffSources']['get']>[0];\ninterface ActorControllerPacket {source:NativeAreaSceneCombat;bond:unknown;grants:unknown;clocks:unknown;buffs:[TransferredBuff,NonNullable<ReturnType<World['treeBuffSources']['get']>>][];strike:ReturnType<World['strikeReleaseBodies']['get']>}\nconst controllerTransfers=new WeakMap<object,WeakMap<Actor,ActorControllerPacket>>();\n"
        },
        {
          "before": "export function isNativeAreaSceneCombat(value:unknown):value is NativeAreaSceneCombat{return !!value&&typeof value==='object'&&actualCombats.has(value);}\nexport class NativeAreaSceneCombat {\n readonly serverSeats:NativeAreaServerSeats;\n readonly crusadeLifetime:NativeAreaSceneCrusadeLifetime;\n readonly vendettaLifetime:NativeAreaSceneVendettaLifetime;\n readonly conclaveLifetime:NativeAreaSceneConclaveLifetime;\n",
          "after": "export function isNativeAreaSceneCombat(value:unknown):value is NativeAreaSceneCombat{return !!value&&typeof value==='object'&&actualCombats.has(value);}\nexport class NativeAreaSceneCombat {\n readonly serverSeats:NativeAreaServerSeats;\n readonly verminfallLifetime:NativeAreaSceneVerminfallLifetime;\n readonly crusadeLifetime:NativeAreaSceneCrusadeLifetime;\n readonly vendettaLifetime:NativeAreaSceneVendettaLifetime;\n readonly conclaveLifetime:NativeAreaSceneConclaveLifetime;\n"
        },
        {
          "before": "  this.harborServices=new NativeAreaSceneHarborServices(this,this.#operation.ownerEntry(),host);\n  this.surfaceArrival=new NativeAreaSceneSurfaceArrival(this,this.#operation.ownerEntry());\n  this.crusadeLifetime=new NativeAreaSceneCrusadeLifetime(this,this.#operation.ownerEntry(),this.#operation.ownerHooks());\n  this.conclaveLifetime=new NativeAreaSceneConclaveLifetime(this,this.#operation.ownerEntry(),host);\n  this.vendettaLifetime=new NativeAreaSceneVendettaLifetime(this,this.#operation.ownerEntry());\n  this.warlordArrival=new NativeAreaSceneWarlordArrival(this,this.#operation.ownerEntry(),this.#operation.ownerHooks(),host);\n",
          "after": "  this.harborServices=new NativeAreaSceneHarborServices(this,this.#operation.ownerEntry(),host);\n  this.surfaceArrival=new NativeAreaSceneSurfaceArrival(this,this.#operation.ownerEntry());\n  this.crusadeLifetime=new NativeAreaSceneCrusadeLifetime(this,this.#operation.ownerEntry(),this.#operation.ownerHooks());\n  this.verminfallLifetime=new NativeAreaSceneVerminfallLifetime(this,this.#operation.ownerEntry(),this.#operation.ownerHooks());\n  this.conclaveLifetime=new NativeAreaSceneConclaveLifetime(this,this.#operation.ownerEntry(),host);\n  this.vendettaLifetime=new NativeAreaSceneVendettaLifetime(this,this.#operation.ownerEntry());\n  this.warlordArrival=new NativeAreaSceneWarlordArrival(this,this.#operation.ownerEntry(),this.#operation.ownerHooks(),host);\n"
        },
        {
          "before": "   tameCompanion:{value:(...args:Parameters<World['tameCompanion']>)=>this.#operation.withServerCompanion(this.serverSeats,args[0],args[1],()=>core2.sceneTameCompanion(host,...args))},\n  });\n  this.serverSeats=new NativeAreaServerSeats(this,this.#operation.ownerEntry(),Object.freeze(vesselHost));\n  this.services=Object.freeze({vendettaLifetime:this.vendettaLifetime,serverSeats:this.serverSeats,conclaveLifetime:this.conclaveLifetime,crusadeLifetime:this.crusadeLifetime,warlordArrival:this.warlordArrival,encounterArrival:this.encounterArrival,surfaceArrival:this.surfaceArrival,harborServices:this.harborServices,siteBirths:this.siteBirths,historyArrival:this.historyArrival,odyssey:this.odyssey,ai:this.ai,inputFrame:this.inputFrame,campaignFrame:this.campaignFrame,control:this.control,campaignTransitions:this.campaignTransitions,combatArena:this.combatArena,combat:this,progression,loot:assembly.lootController,objective:assembly.objectiveController,geometry,maddenLedger,campaignOwner:this.campaignOwner,tethers:this.tethers,restoration:this.restoration,castingPreparation:this.castingPreparation,displacement:this.displacement,combatState:this.combatState,defensePreparation:this.defensePreparation,projectiles:this.projectiles,killAftermath:this.killAftermath,groundFollowUps:this.groundFollowUps,summonPreparation:this.summonPreparation});\n  const bindings=this.bindings();\n  for(const key of Object.keys(bindings) as (keyof Bindings)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});\n  const viewDescriptors=Object.getOwnPropertyDescriptors(host);\n",
          "after": "   tameCompanion:{value:(...args:Parameters<World['tameCompanion']>)=>this.#operation.withServerCompanion(this.serverSeats,args[0],args[1],()=>core2.sceneTameCompanion(host,...args))},\n  });\n  this.serverSeats=new NativeAreaServerSeats(this,this.#operation.ownerEntry(),Object.freeze(vesselHost));\n  this.services=Object.freeze({verminfallLifetime:this.verminfallLifetime,vendettaLifetime:this.vendettaLifetime,serverSeats:this.serverSeats,conclaveLifetime:this.conclaveLifetime,crusadeLifetime:this.crusadeLifetime,warlordArrival:this.warlordArrival,encounterArrival:this.encounterArrival,surfaceArrival:this.surfaceArrival,harborServices:this.harborServices,siteBirths:this.siteBirths,historyArrival:this.historyArrival,odyssey:this.odyssey,ai:this.ai,inputFrame:this.inputFrame,campaignFrame:this.campaignFrame,control:this.control,campaignTransitions:this.campaignTransitions,combatArena:this.combatArena,combat:this,progression,loot:assembly.lootController,objective:assembly.objectiveController,geometry,maddenLedger,campaignOwner:this.campaignOwner,tethers:this.tethers,restoration:this.restoration,castingPreparation:this.castingPreparation,displacement:this.displacement,combatState:this.combatState,defensePreparation:this.defensePreparation,projectiles:this.projectiles,killAftermath:this.killAftermath,groundFollowUps:this.groundFollowUps,summonPreparation:this.summonPreparation});\n  const bindings=this.bindings();\n  for(const key of Object.keys(bindings) as (keyof Bindings)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});\n  const viewDescriptors=Object.getOwnPropertyDescriptors(host);\n"
        },
        {
          "before": "get seats(){if(!self.#wireSeats)throw Error('Native wire cohort is outside serialization');return self.#wireSeats;},\nget shardWorld(){return host.shardWorld;},\nnativeWireQueries:Object.freeze({encounterCue:(actor:Actor)=>encounterCueOf(actor,host),roadDwell:(seat:Seat)=>input.coordinator.roadsFor(self).roadDwellRow(seat)})});\n  Object.freeze(host);for(const key of ['vendettaLifetime','serverSeats','conclaveLifetime','crusadeLifetime','warlordArrival','encounterArrival','surfaceArrival','harborServices','siteBirths','historyArrival','odyssey','party','ai','input','runtimeState','services','campaignOwner','combatArena','control','campaignTransitions','campaignFrame','inputFrame',\"tethers\",\"restoration\",\"castingPreparation\",\"displacement\",\"combatState\",\"defensePreparation\",\"projectiles\",\"killAftermath\",\"groundFollowUps\",\"summonPreparation\"])Object.defineProperty(this,key,{writable:false,configurable:false});\n }\n register(binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>):void{if(binding.scene!==this.scene)throw Error('Native combat registration has foreign scene');for(const key of Object.keys(this.services) as (keyof NativeAreaCombatServices)[])if(binding.services[key]!==this.services[key])throw Error('Native combat registration has mismatched actual owner');this.#operation.bind(binding,[this.vendettaLifetime,this.serverSeats,this.conclaveLifetime,this.crusadeLifetime,this.warlordArrival,this.encounterArrival,this.surfaceArrival,this.harborServices,this.siteBirths,this.historyArrival,this.odyssey,this.party,this.ai,this,this.inputFrame,this.input.progression,this.input.assembly.lootController,this.input.assembly.objectiveController,this.campaignOwner,this.combatArena,this.control,this.campaignTransitions,this.campaignFrame,this.tethers,this.restoration,this.castingPreparation,this.displacement,this.combatState,this.defensePreparation,this.projectiles,this.killAftermath,this.groundFollowUps,this.summonPreparation,this.input.assembly.input.ecology]);}\n prepareActivation(cohort:readonly Actor[]):NativeCombatActivation {return this.#operation.prepareActivation(cohort);}\n assertActivation(token:NativeCombatActivation,cohort:readonly Actor[]):void {this.#operation.assertActivation(token,cohort);}\n activate(cohort:readonly Actor[],token:NativeCombatActivation):void {if(!this.#activationReady())throw Error('Native combat activation needs actual born admitted area');const admitted=this.#operation.activate(this.#host,cohort,token);if(admitted.includes(this.input.campaign.localSeat.actor))this.campaignOwner.bindCombatDeeds();}\n",
          "after": "get seats(){if(!self.#wireSeats)throw Error('Native wire cohort is outside serialization');return self.#wireSeats;},\nget shardWorld(){return host.shardWorld;},\nnativeWireQueries:Object.freeze({encounterCue:(actor:Actor)=>encounterCueOf(actor,host),roadDwell:(seat:Seat)=>input.coordinator.roadsFor(self).roadDwellRow(seat)})});\n  Object.freeze(host);for(const key of ['verminfallLifetime','vendettaLifetime','serverSeats','conclaveLifetime','crusadeLifetime','warlordArrival','encounterArrival','surfaceArrival','harborServices','siteBirths','historyArrival','odyssey','party','ai','input','runtimeState','services','campaignOwner','combatArena','control','campaignTransitions','campaignFrame','inputFrame',\"tethers\",\"restoration\",\"castingPreparation\",\"displacement\",\"combatState\",\"defensePreparation\",\"projectiles\",\"killAftermath\",\"groundFollowUps\",\"summonPreparation\"])Object.defineProperty(this,key,{writable:false,configurable:false});\n }\n register(binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>):void{if(binding.scene!==this.scene)throw Error('Native combat registration has foreign scene');for(const key of Object.keys(this.services) as (keyof NativeAreaCombatServices)[])if(binding.services[key]!==this.services[key])throw Error('Native combat registration has mismatched actual owner');this.#operation.bind(binding,[this.verminfallLifetime,this.vendettaLifetime,this.serverSeats,this.conclaveLifetime,this.crusadeLifetime,this.warlordArrival,this.encounterArrival,this.surfaceArrival,this.harborServices,this.siteBirths,this.historyArrival,this.odyssey,this.party,this.ai,this,this.inputFrame,this.input.progression,this.input.assembly.lootController,this.input.assembly.objectiveController,this.campaignOwner,this.combatArena,this.control,this.campaignTransitions,this.campaignFrame,this.tethers,this.restoration,this.castingPreparation,this.displacement,this.combatState,this.defensePreparation,this.projectiles,this.killAftermath,this.groundFollowUps,this.summonPreparation,this.input.assembly.input.ecology]);}\n prepareActivation(cohort:readonly Actor[]):NativeCombatActivation {return this.#operation.prepareActivation(cohort);}\n assertActivation(token:NativeCombatActivation,cohort:readonly Actor[]):void {this.#operation.assertActivation(token,cohort);}\n activate(cohort:readonly Actor[],token:NativeCombatActivation):void {if(!this.#activationReady())throw Error('Native combat activation needs actual born admitted area');const admitted=this.#operation.activate(this.#host,cohort,token);if(admitted.includes(this.input.campaign.localSeat.actor))this.campaignOwner.bindCombatDeeds();}\n"
        },
        {
          "before": "  lockHint:field(()=>this.runtimeState.frame,\"lockHint\"),\n  manifest:field(()=>this.input.campaign,\"manifest\"),\n  massNativeEffectInvokers:field(()=>this.runtimeState.frame,\"massNativeEffectInvokers\"),\n  materializeLiveZoneEvents:method(()=>this.crusadeLifetime,\"materializeLiveZoneEvents\"),\n  meta:field(()=>this.input.campaign,\"meta\"),\n  minionMetaScan:field(()=>this.runtimeState.frame,\"minionMetaScan\"),\n  modeStageDef:method(()=>this.input.assembly.input.history,\"modeStageDef\"),\n",
          "after": "  lockHint:field(()=>this.runtimeState.frame,\"lockHint\"),\n  manifest:field(()=>this.input.campaign,\"manifest\"),\n  massNativeEffectInvokers:field(()=>this.runtimeState.frame,\"massNativeEffectInvokers\"),\n  materializeLiveZoneEvents:method(()=>this.verminfallLifetime,\"materializeLiveZoneEvents\"),\n  meta:field(()=>this.input.campaign,\"meta\"),\n  minionMetaScan:field(()=>this.runtimeState.frame,\"minionMetaScan\"),\n  modeStageDef:method(()=>this.input.assembly.input.history,\"modeStageDef\"),\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeWarlordIdentity.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "d07ae988f7f395c3bdec323f8eda93f4d39b41503bf717acc86c0df1f54aa35c",
      "afterHash": "c9f5827be6f799185f1565fd2b109a265b7ebcdff9cc26611a132723c4e24068",
      "crlfLines": [],
      "hunks": [
        {
          "before": "export type NativeWarlordRegistration={host:object;observer:NativeWarlordObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;break:(ctx:KillCtx)=>boolean};\nlet consume:((token:object)=>NativeWarlordRegistration)|undefined;\nconst retainedKills=new WeakSet<KillCtx>();\nlet consumeKill:((token:object)=>KillCtx)|undefined;\nexport function installNativeWarlordKillRegistration(reader:NonNullable<typeof consumeKill>):void {if(consumeKill)throw Error('Native crown kill registrar already installed');consumeKill=reader;}\nexport function bindNativeWarlordKillContext(token:object):void {if(!consumeKill)throw Error('Native crown kill registrar missing');const ctx=consumeKill(token);if(retainedKills.has(ctx))throw Error('Native crown kill context already bound');retainedKills.add(ctx);}\n",
          "after": "export type NativeWarlordRegistration={host:object;observer:NativeWarlordObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;break:(ctx:KillCtx)=>boolean};\nlet consume:((token:object)=>NativeWarlordRegistration)|undefined;\nconst retainedKills=new WeakSet<KillCtx>();\n/** Read-only recognition of the genuine combat-operation receipt; grants no context. */\nexport function isNativeRetainedKillContext(ctx:KillCtx):boolean {return retainedKills.has(ctx);}\nlet consumeKill:((token:object)=>KillCtx)|undefined;\nexport function installNativeWarlordKillRegistration(reader:NonNullable<typeof consumeKill>):void {if(consumeKill)throw Error('Native crown kill registrar already installed');consumeKill=reader;}\nexport function bindNativeWarlordKillContext(token:object):void {if(!consumeKill)throw Error('Native crown kill registrar missing');const ctx=consumeKill(token);if(retainedKills.has(ctx))throw Error('Native crown kill context already bound');retainedKills.add(ctx);}\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "96b00fb6ea70dfaad447de80fd49d38492875184e939da07f7bf2f5d049e9ebf",
      "afterHash": "448d5859748dc90b48676c03b8d65970d6582b1cd097fd7f58b73aac9e5ceb11",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** A retained area's garrison guard belongs to the actual campaign event.\n * Existing bodies/terrain survive. Repeated frames and native partial births cannot replay. */\nimport type {Actor} from '../engine/actor';\n",
          "after": "import {nativeVerminfallLiveRegistryActive} from './nativeAreaSceneVerminfallLifetime';\n/** A retained area's garrison guard belongs to the actual campaign event.\n * Existing bodies/terrain survive. Repeated frames and native partial births cannot replay. */\nimport type {Actor} from '../engine/actor';\n"
        },
        {
          "before": " #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}\n #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}\n materializeLiveZoneEvents():void {\n  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});\n  this.#busy=true;this.#liveCheck=check;\n",
          "after": " #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}\n #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}\n materializeLiveZoneEvents():void {\n  // Existing direct callers enter the same outer event scope; the delegated call runs this registry body once.\n  if(!nativeVerminfallLiveRegistryActive(this.#combat)){this.#combat.verminfallLifetime.materializeLiveZoneEvents();return;}\n  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;\n  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});\n  this.#busy=true;this.#liveCheck=check;\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "1cd864767ef645aa885928f80a5888b7e71bcef6a2bcfe2a7572d202d5c7a52c",
      "afterHash": "60e497c37d2f7e6ed30bb7ed360317a48bab0d66a1f2a0685511530ffe8f9bd7",
      "crlfLines": [],
      "hunks": [
        {
          "before": "# ---------------------------------------------------------------------------\n# CI — the correctness gate on every push and pull request.\n#\n# Until now nothing type-checked or tested main automatically: release.yml's\n# `npm run build` was the only INDIRECT tsc pass (tag pushes only), `npm run\n# check` ran in no workflow at all, and balance/probe_*.ts — 98 standing\n# regression rigs — were run by hand or not at all. This closes both holes\n# with exactly the two commands a developer runs locally:\n#\n#   npm run check   tsc over the game, the Electron launcher and the balance\n#                   harness (the three tsconfigs — `npm run build`'s single\n#                   `tsc --noEmit` misses the launcher and balance legs)\n#   npm run probe   the green probe roster (balance/proberoster.ts), the\n#                   FAST lane — 84 rigs, well under a minute wall clock\n#\n# plus `npm run test:launcher` — the launcher's update laws under node:test\n# (the release channel; docs/engine/updates.md). Players' launchers follow\n# the nightly cadence, so the code that decides what they are offered is\n# gated on every push, not just on the night it would ship.\n#\n# The SLOW green lane (`npm run probe -- --slow`) rides nightly.yml, which\n# gates its release candidate on it — see that file.\n#\n# A failing green probe is re-run once (runprobes.ts's THE RETRY) — a real\n# regression is deterministic and still reddens this job, while the suite's\n# few-percent flake tail is reported by name instead of crying wolf.\n#\n# Adding a probe needs no edit here: runprobes.ts's census reads the balance/\n# directory and fails if the roster and the disk disagree.\n# ---------------------------------------------------------------------------\nname: ci\n\non:\n  push:\n  pull_request:\n\npermissions:\n  contents: read\n\n# One run per ref. A new push supersedes the one still running on that branch.\nconcurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n  check:\n    # A same-repo PR would duplicate the push run on its own branch; fork PRs\n    # have no push event here, so they still get the gate.\n    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name != github.repository\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          # Retained-native source proofs read pinned ancestor blobs with git show.\n          fetch-depth: 0\n\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n\n      - run: npm ci\n\n      # Types first: a broken tree makes every probe verdict meaningless.\n      - name: Type-check (game + launcher + balance harness)\n        run: npm run check\n\n      # The launcher's update path, proven pure (launcher/updates.cjs): which\n      # release an install is offered, what it must never be offered, and\n      # what it refuses to run. About a second; no Electron, no network.\n      - name: Launcher update laws\n        run: npm run test:launcher\n\n      - name: Checkpoint and error-report regressions\n        run: |\n          npx tsx balance/check_nativecheckpointdiagnostics.ts\n          npx tsx balance/check_runtimediagnostics.ts\n\n      - name: Retained hosted calling and discovery regressions\n        run: |\n          npx tsx balance/check_nativemergevocation.ts\n          npx tsx balance/check_nativemergesites.ts\n\n      - name: Floor canvas lifetime and exact source regressions\n        run: |\n          npx tsx balance/check_masspainterpixels.ts\n          npx tsx balance/check_nativecanvasreleasesource.ts\n          npx tsx balance/check_nativeshardprobedeliverysource.ts\n\n      - name: Retained desktop performance travel regressions\n        run: |\n          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Retained offline quest ground regression\n        run: |\n          npx tsx balance/check_nativeshardground.ts\n          npx tsx balance/check_nativeshardgroundsource.ts\n          npx tsx balance/check_nativefullgaterepairsource.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n",
          "after": "# ---------------------------------------------------------------------------\n# CI — the correctness gate on every push and pull request.\n#\n# Until now nothing type-checked or tested main automatically: release.yml's\n# `npm run build` was the only INDIRECT tsc pass (tag pushes only), `npm run\n# check` ran in no workflow at all, and balance/probe_*.ts — 98 standing\n# regression rigs — were run by hand or not at all. This closes both holes\n# with exactly the two commands a developer runs locally:\n#\n#   npm run check   tsc over the game, the Electron launcher and the balance\n#                   harness (the three tsconfigs — `npm run build`'s single\n#                   `tsc --noEmit` misses the launcher and balance legs)\n#   npm run probe   the green probe roster (balance/proberoster.ts), the\n#                   FAST lane — 84 rigs, well under a minute wall clock\n#\n# plus `npm run test:launcher` — the launcher's update laws under node:test\n# (the release channel; docs/engine/updates.md). Players' launchers follow\n# the nightly cadence, so the code that decides what they are offered is\n# gated on every push, not just on the night it would ship.\n#\n# The SLOW green lane (`npm run probe -- --slow`) rides nightly.yml, which\n# gates its release candidate on it — see that file.\n#\n# A failing green probe is re-run once (runprobes.ts's THE RETRY) — a real\n# regression is deterministic and still reddens this job, while the suite's\n# few-percent flake tail is reported by name instead of crying wolf.\n#\n# Adding a probe needs no edit here: runprobes.ts's census reads the balance/\n# directory and fails if the roster and the disk disagree.\n# ---------------------------------------------------------------------------\nname: ci\n\non:\n  push:\n  pull_request:\n\npermissions:\n  contents: read\n\n# One run per ref. A new push supersedes the one still running on that branch.\nconcurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n  check:\n    # A same-repo PR would duplicate the push run on its own branch; fork PRs\n    # have no push event here, so they still get the gate.\n    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name != github.repository\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          # Retained-native source proofs read pinned ancestor blobs with git show.\n          fetch-depth: 0\n\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n\n      - run: npm ci\n\n      # Types first: a broken tree makes every probe verdict meaningless.\n      - name: Type-check (game + launcher + balance harness)\n        run: npm run check\n\n      # The launcher's update path, proven pure (launcher/updates.cjs): which\n      # release an install is offered, what it must never be offered, and\n      # what it refuses to run. About a second; no Electron, no network.\n      - name: Launcher update laws\n        run: npm run test:launcher\n\n      - name: Checkpoint and error-report regressions\n        run: |\n          npx tsx balance/check_nativecheckpointdiagnostics.ts\n          npx tsx balance/check_runtimediagnostics.ts\n\n      - name: Retained hosted calling and discovery regressions\n        run: |\n          npx tsx balance/check_nativemergevocation.ts\n          npx tsx balance/check_nativemergesites.ts\n\n      - name: Floor canvas lifetime and exact source regressions\n        run: |\n          npx tsx balance/check_masspainterpixels.ts\n          npx tsx balance/check_nativecanvasreleasesource.ts\n          npx tsx balance/check_nativeshardprobedeliverysource.ts\n\n      - name: Retained desktop performance travel regressions\n        run: |\n          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Retained offline quest ground regression\n        run: |\n          npx tsx balance/check_nativeshardground.ts\n          npx tsx balance/check_nativeshardgroundsource.ts\n          npx tsx balance/check_nativefullgaterepairsource.ts\n\n      - name: Retained Verminfall event lifetime regressions\n        run: |\n          npx tsx balance/check_nativeverminfall.ts\n          npx tsx balance/check_nativeverminfallboundaries.ts\n          npx tsx balance/check_nativeverminfallcold.ts\n          npx tsx balance/check_nativeverminfallcold.ts --king\n          npx tsx balance/check_nativeverminfallsource.ts\n          npx tsx balance/check_nativeframeattendancesourceview.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativeframeattendance.ts",
      "predecessor": "d656f418035283ea6959acc022525398174c0d1d",
      "beforeHash": "8320acb8c74a0a42ecbeaf859e8a7eb53528c4e1a5db6d21de355e14660433e9",
      "afterHash": "409e563a675142da4921b604587d649c36c477760ed4ce255a31034510a36b6c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {nativeShardsCaravanFS as fs} from './nativeShardsCompositionFixture';\nimport * as crypto from 'node:crypto';\nimport {nativeSceneFrameAttendanceArchive as archive} from './nativeSceneFrameAttendanceArchive';\nimport {beforeNativeFrameAttendance} from './nativeFrameAttendanceFixture';\nconst sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');\nfunction must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}\nfunction refuses(fn:()=>unknown,label:string):void{let refused=false;try{fn();}catch{refused=true;}must(refused,'Must refuse '+label);}\nlet mutations=0,duplicates=0;\nfor(const row of archive.files){const source=fs.readFileSync(row.file,'utf8');must(sha(beforeNativeFrameAttendance(row.file,source))===row.beforeSha256,'Complete predecessor '+row.file);for(const change of archive.changes.filter(c=>c.file===row.file)){refuses(()=>beforeNativeFrameAttendance(row.file,source.replace(change.after,change.after.replace('{','{/*mutation*/'))),change.name+' mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+'\\n'+change.after),change.name+' duplicate');duplicates++;}}\nfor(const row of archive.hosts){const source=fs.readFileSync(row.file,'utf8');must(beforeNativeFrameAttendance(row.file,source)===row.before,'Host predecessor');refuses(()=>beforeNativeFrameAttendance(row.file,source+'\\n//mutation'),'Host mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+source),'Host duplicate');duplicates++;}\nconst report={status:'pass',predecessorManifest:archive.predecessorManifest,archiveSha256:sha(JSON.stringify(archive)),methods:archive.changes.length,files:archive.files.length,hosts:archive.hosts.length,mutationRefusals:mutations,duplicateRefusals:duplicates,scope:'Exact limited absence/presentation seams. Actual current-player authority predicate and two-area runtime acceptance remain concrete aggregate requirements.'};\nfs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativeframeattendance.json',JSON.stringify(report,null,2)+'\\n');console.log(JSON.stringify(report,null,2));\n",
          "after": "import {nativeFrameAttendanceSourceFS as fs} from './nativeFrameAttendanceSourceView';\nimport * as crypto from 'node:crypto';\nimport {nativeSceneFrameAttendanceArchive as archive} from './nativeSceneFrameAttendanceArchive';\nimport {beforeNativeFrameAttendance} from './nativeFrameAttendanceSourceView';\nconst sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');\nfunction must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}\nfunction refuses(fn:()=>unknown,label:string):void{let refused=false;try{fn();}catch{refused=true;}must(refused,'Must refuse '+label);}\nlet mutations=0,duplicates=0;\nfor(const row of archive.files){const source=fs.readFileSync(row.file,'utf8');must(sha(beforeNativeFrameAttendance(row.file,source))===row.beforeSha256,'Complete predecessor '+row.file);for(const change of archive.changes.filter(c=>c.file===row.file)){refuses(()=>beforeNativeFrameAttendance(row.file,source.replace(change.after,change.after.replace('{','{/*mutation*/'))),change.name+' mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+'\\n'+change.after),change.name+' duplicate');duplicates++;}}\nfor(const row of archive.hosts){const source=fs.readFileSync(row.file,'utf8');must(beforeNativeFrameAttendance(row.file,source)===row.before,'Host predecessor');refuses(()=>beforeNativeFrameAttendance(row.file,source+'\\n//mutation'),'Host mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+source),'Host duplicate');duplicates++;}\nconst report={status:'pass',predecessorManifest:archive.predecessorManifest,archiveSha256:sha(JSON.stringify(archive)),methods:archive.changes.length,files:archive.files.length,hosts:archive.hosts.length,mutationRefusals:mutations,duplicateRefusals:duplicates,scope:'Exact limited absence/presentation seams. Actual current-player authority predicate and two-area runtime acceptance remain concrete aggregate requirements.'};\nfs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativeframeattendance.json',JSON.stringify(report,null,2)+'\\n');console.log(JSON.stringify(report,null,2));\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCanvasReleaseArchive.ts",
      "normalSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompilerPlatformReceiptArchive.ts",
      "normalSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeConvergenceRepairArchive.ts",
      "normalSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDesktopPerfArchive.ts",
      "normalSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFullGateRepairArchive.ts",
      "normalSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLegacySourceRepairArchive.ts",
      "normalSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMergeSourceArchive.ts",
      "normalSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardGroundArchive.ts",
      "normalSha256": "7514fa70975ccbba0f1f1126344dcefa8222e2ad8b662969419af323e1b52cbb"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardProbeDeliveryArchive.ts",
      "normalSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "current": [
    {
      "file": "balance/nativeVerminfallSourceFixture.ts",
      "normalSha256": "5f15f96ebb56bef0d59b672f4a5962362c280599bc05e6edf71d7904d5b85b0b"
    },
    {
      "file": "balance/nativeVerminfallSourceFS.ts",
      "normalSha256": "a143006b55028e311560d309c0ab99a47605c4ff79d6a2922f30f5c2a762933b"
    },
    {
      "file": "balance/check_nativeverminfallsource.ts",
      "normalSha256": "5cdc216875a2582ed9b140b554470851a1c94211181e18835bb55889ab00f056"
    },
    {
      "file": "balance/nativeShardGroundFixture.ts",
      "normalSha256": "f37787312692414471c6973573605da2d9913c27043d29d71001293cc0e7672c"
    },
    {
      "file": "balance/check_nativeshardgroundsource.ts",
      "normalSha256": "0d83382ae606d5fa4596d31f11818e1ac0e844835d60fba833247d3a87c1ea8c"
    },
    {
      "file": "src/packages/overlays/verminfall.ts",
      "normalSha256": "dd29eb513864015b6252007c89f63836af86a802caa2567c149d39ac37919c11"
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "normalSha256": "dc2a6f379c39345a8318facb8b8812124c1eaf15fede80fc49fffc8b03b21694"
    },
    {
      "file": "src/packages/defs/verminfall.ts",
      "normalSha256": "c59f5d2994855d3e46bd6d06981a437113f9018647cae1f2426b99ea3458a64b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "normalSha256": "b30c24042fce625fe900096deb6dc990bbe158ab98775d36c1998a3cd649d2d3"
    },
    {
      "file": "src/engine/nativeWarlordIdentity.ts",
      "normalSha256": "c9f5827be6f799185f1565fd2b109a265b7ebcdff9cc26611a132723c4e24068"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "normalSha256": "448d5859748dc90b48676c03b8d65970d6582b1cd097fd7f58b73aac9e5ceb11"
    },
    {
      "file": "src/engine/nativeVerminfallIdentity.ts",
      "normalSha256": "6e1162994f9f0c96ae8a575f093d6e0ca2d8b5dc1630053fa22a44e6dc945f4e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneVerminfallLifetime.ts",
      "normalSha256": "56435a7b129e8d17da4fe157a40dcbe0f7987c9db524e0e94dcf2fbc92ce2af7"
    },
    {
      "file": "balance/nativeVerminfallFixture.ts",
      "normalSha256": "a548f7cecfd8e150a981e5eb48dc35aa79ace844f63db570cd11eb0b636ad1dd"
    },
    {
      "file": "balance/check_nativeverminfall.ts",
      "normalSha256": "2464488298cc890001135079d6490590c4902a2ff0e5173d07e75f8856a6396b"
    },
    {
      "file": "balance/check_nativeverminfallboundaries.ts",
      "normalSha256": "77f537fc3176525bed076b36e5e67360adba677e290cb0d6510c45d687cc243a"
    },
    {
      "file": "balance/check_nativeverminfallcold.ts",
      "normalSha256": "05210d2dd47266fa70fffbdd2fd14f1af1b451b2452a35a873072d69190b8090"
    },
    {
      "file": ".github/workflows/ci.yml",
      "normalSha256": "60e497c37d2f7e6ed30bb7ed360317a48bab0d66a1f2a0685511530ffe8f9bd7"
    },
    {
      "file": "docs/worldgen/native-verminfall-lifetime.md",
      "normalSha256": "9c2eb12823d570bb93fb67e89bdb94e53b749a826adab1897505e29947f619f8"
    },
    {
      "file": "balance/check_nativeframeattendancesourceview.ts",
      "normalSha256": "bf1c5d403d86fd2a552cf0cee1fc0b7c00312a454a994b87e3ddb1f48a9d2667"
    },
    {
      "file": "balance/nativeFrameAttendanceSourceView.ts",
      "normalSha256": "884899725a3325ecd2f028e8c53d4fe5e640982992deb25bb46946891e52d694"
    },
    {
      "file": "balance/probe_nativeframeattendance.ts",
      "normalSha256": "409e563a675142da4921b604587d649c36c477760ed4ce255a31034510a36b6c"
    }
  ]
};
