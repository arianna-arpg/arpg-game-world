/** Exact source composition for the five loading regressions; old archives stay immutable. */
export interface NativeConvergenceRepairRow {file:string;predecessor:string;rawBeforeHash:string;rawAfterHash:string;beforeHash:string;afterHash:string;crlfLines:number[];hunks:{before:string;after:string}[]}
export const nativeConvergenceRepairArchive: {parent:string;rows:NativeConvergenceRepairRow[];readers:{file:string;assertions:number;assertionHash:string;nonImportHash:string}[];archives:{file:string;sha256:string;normalSha256:string}[];runtime:{file:string;sha256:string;normalSha256:string}[]} = {
  "parent": "650214202a1c03be72d1662ebb550444c52f541b",
  "rows": [
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "predecessor": "650214202a1c03be72d1662ebb550444c52f541b",
      "rawBeforeHash": "c645dc33f6f43d397d4616ce481d205aa58c8e602e236830daac259c4c3cc8c9",
      "rawAfterHash": "eeb12d62adc61253e8e7aa6995d3d6cb4b6b5b0334a18b53142d713c46b844ba",
      "beforeHash": "c645dc33f6f43d397d4616ce481d205aa58c8e602e236830daac259c4c3cc8c9",
      "afterHash": "eeb12d62adc61253e8e7aa6995d3d6cb4b6b5b0334a18b53142d713c46b844ba",
      "crlfLines": [],
      "hunks": [
        {
          "before": " if(resume.kind!=='inline')throw Error('This save has no recorded retained geography envelope; migration is required and the save was not changed');\n const bound=soloResumeRefusal(resume.save);if(bound)throw Error(bound);\n const wait=async(label:string)=>{if(!current())throw Error('Continue was superseded');if(options.loadingStage)await options.loadingStage(label);if(!current())throw Error('Continue was superseded');};\n await wait('Reading the recorded world');\n const record=readNativeRetainedSave(resume.save);\n if(options.loadingStage)await options.loadingStage('Restoring the recorded world');if(!current())throw Error('Continue was superseded');\n const writer=World.staged(structuredClone(account),Object.freeze(record.manifest));let runtime:NativeClientRuntime|undefined,published=false,discarded=false;\n const discard=()=>{if(published||discarded)return;discarded=true;if(runtime)Reflect.apply(retire,runtime,[]);};\n",
          "after": " if(resume.kind!=='inline')throw Error('This save has no recorded retained geography envelope; migration is required and the save was not changed');\n const bound=soloResumeRefusal(resume.save);if(bound)throw Error(bound);\n const wait=async(label:string)=>{if(!current())throw Error('Continue was superseded');if(options.loadingStage)await options.loadingStage(label);if(!current())throw Error('Continue was superseded');};\n const record=readNativeRetainedSave(resume.save);\n await wait('Reading the recorded world');\n if(options.loadingStage)await options.loadingStage('Restoring the recorded world');if(!current())throw Error('Continue was superseded');\n const writer=World.staged(structuredClone(account),Object.freeze(record.manifest));let runtime:NativeClientRuntime|undefined,published=false,discarded=false;\n const discard=()=>{if(published||discarded)return;discarded=true;if(runtime)Reflect.apply(retire,runtime,[]);};\n"
        },
        {
          "before": "  runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:record.geography.spec,...record.catalog?{catalog:record.catalog.spec}:{},resume:restore,resumePolicy:options.spawn});\n  if(options.loadingStage){await wait('Restoring your starting ground');await Reflect.apply(installLoading,runtime,[wait,options.signal]);}\n  else writer.withGlobalPolicies(()=>Reflect.apply(install,runtime!,[options.signal]));\n  if(options.loadingStage)await options.loadingStage('Restoring your journey');\n  if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n  const ready=runtime;\n  return {writer,runtime:ready,discard,publish:()=>{if(discarded||published||!current())throw Error('Continue was superseded');if(!writer.publishResumeAccount(account,baseline))throw Error('The account changed during Continue');published=true;return Object.freeze({writer,runtime:ready});}};\n",
          "after": "  runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:record.geography.spec,...record.catalog?{catalog:record.catalog.spec}:{},resume:restore,resumePolicy:options.spawn});\n  if(options.loadingStage){await wait('Restoring your starting ground');await Reflect.apply(installLoading,runtime,[wait,options.signal]);}\n  else writer.withGlobalPolicies(()=>Reflect.apply(install,runtime!,[options.signal]));\n  if(options.loadingStage)await wait('Restoring retained area ownership');\n  if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n  const ready=runtime;\n  return {writer,runtime:ready,discard,publish:()=>{if(discarded||published||!current())throw Error('Continue was superseded');if(!writer.publishResumeAccount(account,baseline))throw Error('The account changed during Continue');published=true;return Object.freeze({writer,runtime:ready});}};\n"
        }
      ]
    },
    {
      "file": "balance/nativeLoadingResponsivenessFixture.ts",
      "predecessor": "650214202a1c03be72d1662ebb550444c52f541b",
      "rawBeforeHash": "8b8931c38fd803b46b6cab19c3a373bfdf28671b95b788c031922faaeb152222",
      "rawAfterHash": "a7e606a79f3a43acd64a33401c48e5ec3fd4ffcf5efdb90387f5476d591a8f59",
      "beforeHash": "b7b586007c2d8e555f93a8f632f7f600ed7f4dd2e59af6632a83bc5703911e3b",
      "afterHash": "a7e606a79f3a43acd64a33401c48e5ec3fd4ffcf5efdb90387f5476d591a8f59",
      "crlfLines": [
        40
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeConvergenceRepairFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativeloadingresponsivenesssource.ts",
      "predecessor": "650214202a1c03be72d1662ebb550444c52f541b",
      "rawBeforeHash": "efeb8169b6ed027ac8818dd820895c262fe6641d82eb611925d1cee7bc77f845",
      "rawAfterHash": "f189f0736d7f72e76c4c42f7a87747aae63ebce7788bcae476c6a9b666ca1c9f",
      "beforeHash": "efeb8169b6ed027ac8818dd820895c262fe6641d82eb611925d1cee7bc77f845",
      "afterHash": "f189f0736d7f72e76c4c42f7a87747aae63ebce7788bcae476c6a9b666ca1c9f",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeConvergenceRepairFS';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\n"
        }
      ]
    },
    {
      "file": "src/ui/loadingScreen.ts",
      "predecessor": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
      "rawBeforeHash": "bb957deb0d3225393ab71d7496f1b254a9b9849d425c4d525d6b7cc08ad060c2",
      "rawAfterHash": "b9f19352733922833b760dede2fb817efd542e421c49eefb2db45b940576a4c4",
      "beforeHash": "bb957deb0d3225393ab71d7496f1b254a9b9849d425c4d525d6b7cc08ad060c2",
      "afterHash": "b9f19352733922833b760dede2fb817efd542e421c49eefb2db45b940576a4c4",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { loadingPresentation } from '../loading/presentation';\nimport loadingScript from 'virtual:mu-loading-script';\nimport { spiritDirection } from '../loading/spiritRun';\nimport { Z_LADDER } from './zorder';\n",
          "after": "import { loadingPresentation } from '../loading/presentation';\nimport { recordRuntimeError } from '../core/runtimeDiagnostics';\nimport { mountRuntimeErrorReport } from './runtimeErrorReport';\nimport loadingScript from 'virtual:mu-loading-script';\nimport { spiritDirection } from '../loading/spiritRun';\nimport { Z_LADDER } from './zorder';\n"
        },
        {
          "before": " * all minigame input and painting. Do not add allow-same-origin: it would put\n * the crossing back on the game's blocked renderer thread in desktop Chromium. */\nexport class LoadingScreen {\n  private frame: HTMLIFrameElement;\n  private ready = false;\n  private startupError?: string;\n",
          "after": " * all minigame input and painting. Do not add allow-same-origin: it would put\n * the crossing back on the game's blocked renderer thread in desktop Chromium. */\nexport class LoadingScreen {\n  private errorReport?: HTMLElement;\n  private frame: HTMLIFrameElement;\n  private ready = false;\n  private startupError?: string;\n"
        },
        {
          "before": "    return { ...message, channel: LOADING_CHANNEL, token: this.token } as LoadingCommand;\n  }\n  begin(options: LoadingOptions): LoadingLease {\n    if (!this.visible) {\n      this.focus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;\n      this.inert = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== this.frame)\n",
          "after": "    return { ...message, channel: LOADING_CHANNEL, token: this.token } as LoadingCommand;\n  }\n  begin(options: LoadingOptions): LoadingLease {\n    this.errorReport?.remove(); this.errorReport = undefined;\n    if (!this.visible) {\n      this.focus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;\n      this.inert = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== this.frame)\n"
        },
        {
          "before": "    const current = (): boolean => this.visible && !this.closing && token === this.token;\n    return { get current() { return current(); },\n      update: status => { if (current()) {\n        const key = JSON.stringify(status); if (key === this.statusKey) return;\n        this.statusKey = key; this.retry = undefined; this.failure = undefined;\n        if (this.beginCommand?.type === 'begin') Object.assign(this.beginCommand.options, { label: status.label, detail: status.detail, completed: status.completed, total: status.total });\n",
          "after": "    const current = (): boolean => this.visible && !this.closing && token === this.token;\n    return { get current() { return current(); },\n      update: status => { if (current()) {\n        this.errorReport?.remove(); this.errorReport = undefined;\n        const key = JSON.stringify(status); if (key === this.statusKey) return;\n        this.statusKey = key; this.retry = undefined; this.failure = undefined;\n        if (this.beginCommand?.type === 'begin') Object.assign(this.beginCommand.options, { label: status.label, detail: status.detail, completed: status.completed, total: status.total });\n"
        },
        {
          "before": "      },\n      fail: (message, retry) => { if (current()) { this.retry = retry;\n        const key = 'fail:' + message + ':' + !!retry; if (key === this.statusKey) return; this.statusKey = key;\n        this.failure = { message, retry: !!retry };\n        if (this.ready) this.send(this.command({ type: 'fail', ...this.failure })); } },\n      finish: () => { if (current()) this.close(); },\n",
          "after": "      },\n      fail: (message, retry) => { if (current()) { this.retry = retry;\n        const key = 'fail:' + message + ':' + !!retry; if (key === this.statusKey) return; this.statusKey = key;\n        recordRuntimeError('crossing refused', message);\n        this.errorReport ??= mountRuntimeErrorReport();\n        this.failure = { message, retry: !!retry };\n        if (this.ready) this.send(this.command({ type: 'fail', ...this.failure })); } },\n      finish: () => { if (current()) this.close(); },\n"
        },
        {
          "before": "    else this.hide();\n  }\n  private hide(): void {\n    clearTimeout(this.closeTimer);\n    for (const key of this.heldKeys) this.releasedKeys.add(key);\n    this.heldKeys.clear(); this.padHeld = true; this.clearWorldInput();\n",
          "after": "    else this.hide();\n  }\n  private hide(): void {\n    this.errorReport?.remove(); this.errorReport = undefined;\n    clearTimeout(this.closeTimer);\n    for (const key of this.heldKeys) this.releasedKeys.add(key);\n    this.heldKeys.clear(); this.padHeld = true; this.clearWorldInput();\n"
        },
        {
          "before": "    }\n  };\n  private keyDown = (event: KeyboardEvent): void => {\n    if (this.visible || this.releasedKeys.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }\n  };\n  private keyUp = (event: KeyboardEvent): void => {\n    const quarantined = this.releasedKeys.delete(event.code);\n    if (this.visible || quarantined) event.stopImmediatePropagation();\n  };\n",
          "after": "    }\n  };\n  private keyDown = (event: KeyboardEvent): void => {\n    if (event.target instanceof Node && this.errorReport?.contains(event.target)) return;\n    if (this.visible || this.releasedKeys.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }\n  };\n  private keyUp = (event: KeyboardEvent): void => {\n    if (event.target instanceof Node && this.errorReport?.contains(event.target)) return;\n    const quarantined = this.releasedKeys.delete(event.code);\n    if (this.visible || quarantined) event.stopImmediatePropagation();\n  };\n"
        }
      ]
    },
    {
      "file": "src/worldmass/runtime.ts",
      "predecessor": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
      "rawBeforeHash": "b164ee64918b7108785c50805e4e38b1b4333a3fe0dacf7b36f52085bb0e0d6e",
      "rawAfterHash": "315063108b9516b5e7e50f5af36ad4125e5f3c37a2b1c014597f0a14c8b7a117",
      "beforeHash": "b164ee64918b7108785c50805e4e38b1b4333a3fe0dacf7b36f52085bb0e0d6e",
      "afterHash": "315063108b9516b5e7e50f5af36ad4125e5f3c37a2b1c014597f0a14c8b7a117",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { MassNativeCountry } from './nativeCountry';\nimport { MassNativeHost, nativeWorldCapabilities } from './nativeHost';\nimport type { MassOccurrenceDisturbance } from './occurrences';\nimport { MassNativeResidency, type NativeResidencySave } from './nativeResidency';\nimport { validateMassBounties } from './bounties';\nimport { validateStructurePlans } from '../engine/structurePlans';\n",
          "after": "import { MassNativeCountry } from './nativeCountry';\nimport { MassNativeHost, nativeWorldCapabilities } from './nativeHost';\nimport type { MassOccurrenceDisturbance } from './occurrences';\nimport { recordRuntimeError } from '../core/runtimeDiagnostics';\nimport { MassNativeResidency, type NativeResidencySave } from './nativeResidency';\nimport { validateMassBounties } from './bounties';\nimport { validateStructurePlans } from '../engine/structurePlans';\n"
        },
        {
          "before": "      })();\n      this.pagingReads.set(page.ref.key,task);\n      void task.catch(error=>{if(this.pagingCurrent(world)&&characterNativeSessionToken(world)===session){\n        this.pagingRetry.set(page.ref.key,Date.now()+5000);this.pagingErrors.set(page.ref.key,String(error instanceof Error?error.message:error));\n      }}).finally(()=>{if(this.pagingReads.get(page.ref.key)===task)this.pagingReads.delete(page.ref.key);});\n    }\n",
          "after": "      })();\n      this.pagingReads.set(page.ref.key,task);\n      void task.catch(error=>{if(this.pagingCurrent(world)&&characterNativeSessionToken(world)===session){\n        recordRuntimeError('native page restore',error,{run:this.generator.run.runId,seed:this.generator.run.seed,\n          page:page.ref.key,config:this.configHash,zone:world.zone.id,x:player.pos.x,y:player.pos.y,bodies:page.ids.length});\n        this.pagingRetry.set(page.ref.key,Date.now()+5000);this.pagingErrors.set(page.ref.key,String(error instanceof Error?error.message:error));\n      }}).finally(()=>{if(this.pagingReads.get(page.ref.key)===task)this.pagingReads.delete(page.ref.key);});\n    }\n"
        },
        {
          "before": "    let lease;\n    try{lease=stageNativeCohort(this.generator.run.runId,'native/'+crypto.randomUUID(),this.origin,this.config.terrain.addressSpan,\n      world,this.natives,selected,this.dormancy,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:this.births.of(a)}}));}\n    catch(error){this.pagingRefusal=String(error);return;} // Unsupported dependencies retain their exact live owners.\n    this.pagingRefusal=\"\";\n    const held=lease,valid=()=>this.pagingCurrent(world)&&held.revalidate()\n      &&selected.every(id=>{const a=this.natives.get(id);return !!a&&!near(a,this.dormancy!.policy.sleepRadius);});\n",
          "after": "    let lease;\n    try{lease=stageNativeCohort(this.generator.run.runId,'native/'+crypto.randomUUID(),this.origin,this.config.terrain.addressSpan,\n      world,this.natives,selected,this.dormancy,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:this.births.of(a)}}));}\n    catch(error){\n      const refusal=String(error);\n      if(this.pagingRefusal!==refusal)recordRuntimeError('native page staging',error,{run:this.generator.run.runId,\n        seed:this.generator.run.seed,zone:world.zone.id,x:world.player.pos.x,y:world.player.pos.y,bodies:selected.length});\n      this.pagingRefusal=refusal;return;\n    } // Unsupported dependencies retain their exact live owners.\n    this.pagingRefusal=\"\";\n    const held=lease,valid=()=>this.pagingCurrent(world)&&held.revalidate()\n      &&selected.every(id=>{const a=this.natives.get(id);return !!a&&!near(a,this.dormancy!.policy.sleepRadius);});\n"
        },
        {
          "before": "      world.actorGridRev++;\n    });\n    this.pagingWrite=task;\n    void task.catch(error=>console.error('[worldmass] page commit failed; natives retained:',error)).finally(()=>{this.pagingWrite=null;});\n  }\n  private orderNativeBodies(world:World):void {\n    const order=characterNativePageOrder(world);if(!order.length)return;\n",
          "after": "      world.actorGridRev++;\n    });\n    this.pagingWrite=task;\n    void task.catch(error=>recordRuntimeError('native page commit',error,{run:this.generator.run.runId,\n      seed:this.generator.run.seed,zone:world.zone.id,bodies:selected.length})).finally(()=>{this.pagingWrite=null;});\n  }\n  private orderNativeBodies(world:World):void {\n    const order=characterNativePageOrder(world);if(!order.length)return;\n"
        }
      ]
    },
    {
      "file": "src/ui/errorOverlay.ts",
      "predecessor": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
      "rawBeforeHash": "2f634080718f7cb1fbe2942967d267c949dd9dae0d16cdaa4748576b50ddfbf0",
      "rawAfterHash": "34f884d0d754ba17953b0baad4a2f6b8be89d499cdaa990241bc2389365453fe",
      "beforeHash": "2f634080718f7cb1fbe2942967d267c949dd9dae0d16cdaa4748576b50ddfbf0",
      "afterHash": "34f884d0d754ba17953b0baad4a2f6b8be89d499cdaa990241bc2389365453fe",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// ---------------------------------------------------------------------------\n\nimport { GAME_TITLE } from '../config';\nimport { Z_LADDER } from './zorder'; // dependency-free constants — safe for a crashed frame\n\n/** One captured error — the shape both traps push into window.__bootErrors. */\n",
          "after": "// ---------------------------------------------------------------------------\n\nimport { GAME_TITLE } from '../config';\nimport { recordRuntimeError, runtimeErrorReport } from '../core/runtimeDiagnostics';\nimport { Z_LADDER } from './zorder'; // dependency-free constants — safe for a crashed frame\n\n/** One captured error — the shape both traps push into window.__bootErrors. */\n"
        },
        {
          "before": "    lines.push(`[${new Date(e.t).toISOString()}] ${e.kind}: ${e.msg}`);\n    if (e.stack) lines.push(e.stack);\n  }\n  return lines.join('\\n');\n}\n\n/** Copy via the async clipboard, falling back to a select+execCommand\n",
          "after": "    lines.push(`[${new Date(e.t).toISOString()}] ${e.kind}: ${e.msg}`);\n    if (e.stack) lines.push(e.stack);\n  }\n  return lines.join('\\n') + '\\n\\n--- persistent runtime diagnostics ---\\n' + runtimeErrorReport();\n}\n\n/** Copy via the async clipboard, falling back to a select+execCommand\n"
        },
        {
          "before": " *  ring keeps collecting behind it either way). `ring` is held by reference so\n *  Copy Details always reports the current state. */\nexport function showErrorOverlay(fatal: CrashEntry, ring: readonly CrashEntry[]): void {\n  if (shown) return;\n  shown = true;\n\n",
          "after": " *  ring keeps collecting behind it either way). `ring` is held by reference so\n *  Copy Details always reports the current state. */\nexport function showErrorOverlay(fatal: CrashEntry, ring: readonly CrashEntry[]): void {\n  recordRuntimeError('fatal ' + fatal.kind, { message: fatal.msg, stack: fatal.stack });\n  if (shown) return;\n  shown = true;\n\n"
        }
      ]
    },
    {
      "file": "src/worldmass/dormancy.ts",
      "predecessor": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
      "rawBeforeHash": "41435e7f1892b5bbb6ca53b851e9c221039deba255fbd741c08ce2cb0e36dcaf",
      "rawAfterHash": "0bac0dc849933fc9ba4b8e4266a1317b4de7e51260dce258406270e1a26b79bd",
      "beforeHash": "41435e7f1892b5bbb6ca53b851e9c221039deba255fbd741c08ce2cb0e36dcaf",
      "afterHash": "0bac0dc849933fc9ba4b8e4266a1317b4de7e51260dce258406270e1a26b79bd",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  monster: string; team: string; actors: ReadonlySet<number>; squads: ReadonlySet<number>;\n  level?: number; life?: number; position?: { x: number; y: number };\n}): void {\n  const fail = (): never => { throw Error('Invalid native actor checkpoint'); };\n  if (saved?.version !== 1 || !Array.isArray(saved.nodes) || !saved.nodes.length || saved.nodes.length > 16384) fail();\n  const value = (v: Value, key = ''): void => {\n    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;\n    if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); return; }\n    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 1) fail();\n    if ('ref' in v) { if (!Number.isSafeInteger(v.ref) || v.ref < 0 || v.ref >= saved.nodes.length) fail(); return; }\n    if ('actor' in v) { if (!Number.isSafeInteger(v.actor) || !expected.actors.has(v.actor)) fail(); return; }\n    // Unresolved historical numeric IDs intentionally become negative sentinels.\n    if ('entity' in v) { if (!Number.isSafeInteger(v.entity) || v.entity < 0 || dependencyKeys.has(key) && !expected.actors.has(v.entity)) fail(); return; }\n    if ('squad' in v) { if (!Number.isSafeInteger(v.squad) || !expected.squads.has(v.squad)) fail(); return; }\n    if ('special' in v && ['undefined', 'nan', 'positive', 'negative'].includes(v.special)) return;\n    fail();\n  };\n  for (const node of saved.nodes) {\n    if (!node || !['object', 'array', 'map', 'set', 'float64', 'sheet'].includes(node.kind) || !Array.isArray(node.entries)) fail();\n    const properties = new Set<string>();\n    for (let i = 0; i < node.entries.length; i++) {\n      const pair = node.entries[i];\n      if (!Array.isArray(pair) || pair.length !== 2) fail();\n      const [key, v] = pair; value(v, typeof key === 'string' ? key : '');\n      if (node.kind === 'map') value(key);\n      else if (node.kind === 'set') { if (key !== null) fail(); }\n",
          "after": "  monster: string; team: string; actors: ReadonlySet<number>; squads: ReadonlySet<number>;\n  level?: number; life?: number; position?: { x: number; y: number };\n}): void {\n  let checkpointPath = 'header';\n  const fail = (reason = 'invalid structure or value'): never => {\n    throw Error(`Invalid native actor checkpoint: ${expected.monster} at ${checkpointPath}: ${reason}`);\n  };\n  if (saved?.version !== 1 || !Array.isArray(saved.nodes) || !saved.nodes.length || saved.nodes.length > 16384) fail();\n  const value = (v: Value, key = ''): void => {\n    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;\n    if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); return; }\n    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 1) fail();\n    if ('ref' in v) { if (!Number.isSafeInteger(v.ref) || v.ref < 0 || v.ref >= saved.nodes.length) fail(); return; }\n    if ('actor' in v) { if (!Number.isSafeInteger(v.actor) || !expected.actors.has(v.actor)) fail(`unresolved actor ${v.actor}`); return; }\n    // Unresolved historical numeric IDs intentionally become negative sentinels.\n    if ('entity' in v) { if (!Number.isSafeInteger(v.entity) || v.entity < 0 || dependencyKeys.has(key) && !expected.actors.has(v.entity)) fail(`unresolved entity ${v.entity}`); return; }\n    if ('squad' in v) { if (!Number.isSafeInteger(v.squad) || !expected.squads.has(v.squad)) fail(`unresolved squad ${v.squad}`); return; }\n    if ('special' in v && ['undefined', 'nan', 'positive', 'negative'].includes(v.special)) return;\n    fail();\n  };\n  for (const [nodeIndex, node] of saved.nodes.entries()) {\n    checkpointPath = `nodes[${nodeIndex}]`;\n    if (!node || !['object', 'array', 'map', 'set', 'float64', 'sheet'].includes(node.kind) || !Array.isArray(node.entries)) fail();\n    const properties = new Set<string>();\n    for (let i = 0; i < node.entries.length; i++) {\n      const pair = node.entries[i];\n      checkpointPath = `nodes[${nodeIndex}].entries[${i}]`;\n      if (!Array.isArray(pair) || pair.length !== 2) fail();\n      if (typeof pair[0] === 'string') checkpointPath += ` (${pair[0]})`;\n      const [key, v] = pair; value(v, typeof key === 'string' ? key : '');\n      if (node.kind === 'map') value(key);\n      else if (node.kind === 'set') { if (key !== null) fail(); }\n"
        },
        {
          "before": "      }\n    }\n  }\n  value(saved.root);\n  if (!saved.root || typeof saved.root !== 'object' || !('ref' in saved.root)) fail();\n  const root = saved.nodes[(saved.root as { ref: number }).ref];\n  if (root.kind !== 'object') fail();\n  const fields = new Map(root.entries.map(([k, v]) => [String(k), v]));\n  if (fields.size !== root.entries.length || fields.get('defId') !== expected.monster || fields.get('team') !== expected.team\n    || typeof fields.get('life') !== 'number' || !Number.isFinite(fields.get('life')) || (fields.get('life') as number) <= 0\n    || expected.level !== undefined && fields.get('level') !== expected.level\n    || expected.life !== undefined && fields.get('life') !== expected.life) fail();\n  const sheet = fields.get('sheet');\n  if (!sheet || typeof sheet !== 'object' || !('ref' in sheet) || saved.nodes[sheet.ref]?.kind !== 'sheet') fail();\n  if (expected.position) {\n    const pos = fields.get('pos');\n    if (!pos || typeof pos !== 'object' || !('ref' in pos) || saved.nodes[pos.ref]?.kind !== 'object') fail();\n    const point = new Map(saved.nodes[(pos as { ref: number }).ref].entries);\n    if (!Number.isFinite(expected.position.x) || !Number.isFinite(expected.position.y)\n      || point.get('x') !== expected.position.x || point.get('y') !== expected.position.y) fail();\n  }\n  for (const key of fields.keys()) if (rootExcluded.has(key) || nativePrototypeProperty(Actor.prototype, key)) fail();\n}\n\nexport function unpackNativeCheckpoint(saved: MassDormancySave, state: PackedActorState): NativeActorState {\n",
          "after": "      }\n    }\n  }\n  checkpointPath = 'root';\n  value(saved.root);\n  if (!saved.root || typeof saved.root !== 'object' || !('ref' in saved.root)) fail();\n  const root = saved.nodes[(saved.root as { ref: number }).ref];\n  if (root.kind !== 'object') fail();\n  const fields = new Map(root.entries.map(([k, v]) => [String(k), v]));\n  checkpointPath = 'root identity/life/level';\n  if (fields.size !== root.entries.length || fields.get('defId') !== expected.monster || fields.get('team') !== expected.team\n    || typeof fields.get('life') !== 'number' || !Number.isFinite(fields.get('life')) || (fields.get('life') as number) <= 0\n    || expected.level !== undefined && fields.get('level') !== expected.level\n    || expected.life !== undefined && fields.get('life') !== expected.life) fail();\n  const sheet = fields.get('sheet');\n  checkpointPath = 'root.sheet';\n  if (!sheet || typeof sheet !== 'object' || !('ref' in sheet) || saved.nodes[sheet.ref]?.kind !== 'sheet') fail();\n  if (expected.position) {\n    checkpointPath = 'root.pos';\n    const pos = fields.get('pos');\n    if (!pos || typeof pos !== 'object' || !('ref' in pos) || saved.nodes[pos.ref]?.kind !== 'object') fail();\n    const point = new Map(saved.nodes[(pos as { ref: number }).ref].entries);\n    if (!Number.isFinite(expected.position.x) || !Number.isFinite(expected.position.y)\n      || point.get('x') !== expected.position.x || point.get('y') !== expected.position.y) fail();\n  }\n  for (const key of fields.keys()) if (rootExcluded.has(key) || nativePrototypeProperty(Actor.prototype, key)) {\n    checkpointPath = `root.${key}`; fail('cannot replace native identity or behavior');\n  }\n}\n\nexport function unpackNativeCheckpoint(saved: MassDormancySave, state: PackedActorState): NativeActorState {\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativePaging.ts",
      "predecessor": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
      "rawBeforeHash": "f542fd9c0a168c38ddcdee1941f0bfb9d379fef2c1e3eb9ceb99bb80373b4110",
      "rawAfterHash": "8f967c47923ad84fcb071f8068acfb7fe16f7e8d2a9a9e03bd5d011449f7661a",
      "beforeHash": "f542fd9c0a168c38ddcdee1941f0bfb9d379fef2c1e3eb9ceb99bb80373b4110",
      "afterHash": "8f967c47923ad84fcb071f8068acfb7fe16f7e8d2a9a9e03bd5d011449f7661a",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  const bodies=[...members].map(([id,a])=>{const d=describe(id,a);\n    if(d.id!==id||d.monster!==a.defId||d.level!==a.level)throw Error('Native paging descriptor disagrees with actor');return copy(d);});\n  const data:NativeCohortPage={schema:1,run,page,frame:copy(frame),addressSpan,policy:copy(dormancy.policy),bodies,checkpoint};\n  const signature=fingerprint(),body=canonical(data);\n  return {body,ids:[...ids],revalidate:()=>eligible()&&signature===fingerprint()};\n}\n",
          "after": "  const bodies=[...members].map(([id,a])=>{const d=describe(id,a);\n    if(d.id!==id||d.monster!==a.defId||d.level!==a.level)throw Error('Native paging descriptor disagrees with actor');return copy(d);});\n  const data:NativeCohortPage={schema:1,run,page,frame:copy(frame),addressSpan,policy:copy(dormancy.policy),bodies,checkpoint};\n  // The reader's exact gate must pass BEFORE any durable page or root can be\n  // published and the only live bodies released. Quiet is not codec validity:\n  // a settled enemy can still retain a reference to a departed target.\n  validateNativeDormancyCheckpoint(checkpoint,bodies,true);\n  const signature=fingerprint(),body=canonical(data);\n  return {body,ids:[...ids],revalidate:()=>eligible()&&signature===fingerprint()};\n}\n"
        }
      ]
    }
  ],
  "readers": [
    {
      "file": "balance/nativeLoadingResponsivenessFixture.ts",
      "assertions": 4,
      "assertionHash": "d63c4e9044d95d1fae4a2df516c73cfc09b05eed932d73a2fa81752acd47db3b",
      "nonImportHash": "f7bc7b2e0597945530eb57e6c238c149b324d01ce04b37d55d0b949933dbb280"
    },
    {
      "file": "balance/check_nativeloadingresponsivenesssource.ts",
      "assertions": 44,
      "assertionHash": "73ac0ad6cccd9da4d87294910a2bc388902c1c55a27d59b7718a36ae26acee6d",
      "nonImportHash": "e12caf1c69156bcf1b10101c15cf794b21516e47b6aebfe222ade7d807423096"
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "sha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "sha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "sha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "sha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "sha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "sha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "sha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "sha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "sha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "sha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "sha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "sha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "sha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "sha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "sha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "sha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "sha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "sha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "sha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "sha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "sha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "sha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "runtime": [
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "sha256": "eeb12d62adc61253e8e7aa6995d3d6cb4b6b5b0334a18b53142d713c46b844ba",
      "normalSha256": "eeb12d62adc61253e8e7aa6995d3d6cb4b6b5b0334a18b53142d713c46b844ba"
    },
    {
      "file": "balance/nativeConvergenceRepairFixture.ts",
      "sha256": "dd3d12a60987beffb715bf3c4d7a4ce9e42a7b6d86b40e8b51c25adaffe84dc2",
      "normalSha256": "ce3907f6c1b261a6939e93775a247027a130a2569498d81a36f6c848fe4645a1"
    },
    {
      "file": "balance/nativeConvergenceRepairFS.ts",
      "sha256": "128713ae22edd7ef066c737ec9b0919bad21c9c1043e18706cb077d8e5df231f",
      "normalSha256": "11da696f3763db1edc0062a27b92a0c07a43356a5c43406b12ad415b38e4d1e1"
    }
  ]
};
