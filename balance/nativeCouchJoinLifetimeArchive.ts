/** Exact six-hunk successor of the preserved browser entry. No native mint/graft body rewrite. */
export const nativeCouchJoinLifetimeArchive = {
  "file": "src/main.ts",
  "beforeHash": "fa0bf571a711aabffeb1378e32de735a8fdb9f6f52658a068336d7e98daef4aa",
  "afterHash": "0ae5a1640342fbc822ff13093bca542d88b5a7b7a821284c966f57d5a335381b",
  "rawBeforeHash": "fa0bf571a711aabffeb1378e32de735a8fdb9f6f52658a068336d7e98daef4aa",
  "rawAfterHash": "0ae5a1640342fbc822ff13093bca542d88b5a7b7a821284c966f57d5a335381b",
  "hunks": [
    {
      "before": "let couchClaimPad: number | null = null;",
      "after": "let couchClaimPad: number | null = null;\nlet couchClaimId: string | null = null;\n/** A saved pick belongs to this ceremony, controller claim and run. */\nlet couchJoinGeneration = 0;"
    },
    {
      "before": "  couchClaimPad = null;\n  // Freeze the hero",
      "after": "  couchJoinGeneration++;\n  couchClaimPad = null;\n  couchClaimId = null;\n  // Freeze the hero"
    },
    {
      "before": "function closeCouchJoin(): void {\n  ui.couchJoinOpen = false;\n  couchClaimPad = null;",
      "after": "function closeCouchJoin(): void {\n  couchJoinGeneration++;\n  ui.couchJoinOpen = false;\n  couchClaimPad = null;\n  couchClaimId = null;"
    },
    {
      "before": "  const entry = account.roster.find(r => r.charId === charId);\n  if (!entry) { closeCouchJoin(); return; }\n  void (async (): Promise<void> => {\n    const save = await loadRosterSave(entry.slot);\n    const built = save && rebuildSavedMeta(save);\n    const cls = save && CLASSES.find(c => c.id === save.classId);\n    if (!save || !built || !cls) { closeCouchJoin(); return; }\n    const seat = mintCouchSeat(padIdx, cls, { slot: entry.slot, save });",
      "after": "  const entry = account.roster.find(r => r.charId === charId);\n  if (!entry) { closeCouchJoin(); return; }\n  const request = ++couchJoinGeneration;\n  const joiningWorld = world, joiningNet = net;\n  const slot = entry.slot, modeId = entry.modeId, classId = entry.classId;\n  const hostCharId = joiningWorld.meta.charId, claimId = couchClaimId;\n  const ceremonyCurrent = (): boolean => request === couchJoinGeneration\n    && running && world === joiningWorld && net === joiningNet\n    && joiningNet instanceof LocalTransport && ui.couchJoinOpen\n    && couchClaimPad === padIdx && claimId !== null && couchClaimId === claimId\n    && padIdAt(padIdx) === claimId && !couchPadSet.has(padIdx);\n  const vesselCurrent = (): boolean => account.roster.includes(entry)\n    && entry.charId === charId && entry.slot === slot && entry.modeId === modeId\n    && entry.classId === classId && !entry.fallen\n    && joiningWorld.meta.charId === hostCharId && charId !== hostCharId\n    && joiningWorld.meta.modeId === modeId && modeById(modeId).save === 'roster'\n    && rosterCapacity(account, modeById(modeId)) >= COUCH_CFG.join.immortalSlotsNeeded\n    && joiningWorld.couchSeats().length < COUCH_CFG.join.maxLocal - 1;\n  if (!ceremonyCurrent() || !vesselCurrent()) { closeCouchJoin(); return; }\n  void (async (): Promise<void> => {\n    const save = await loadRosterSave(slot);\n    // A retired/replaced ceremony may not mint a seat OR close its successor.\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const built = save && rebuildSavedMeta(save);\n    const cls = save && CLASSES.find(c => c.id === save.classId);\n    if (!save || !built || !cls || save.classId !== classId || built.meta.modeId !== modeId\n      || (save.charId && save.charId !== charId)) { closeCouchJoin(); return; }\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const seat = mintCouchSeat(padIdx, cls, { slot, save });"
    },
    {
      "before": "function couchReset(): void {\n  for (const g",
      "after": "function couchReset(): void {\n  couchJoinGeneration++;\n  for (const g"
    },
    {
      "before": "  if (ui.couchJoinOpen) {\n    if (couchClaimPad === null) {\n      const hit = couchClaim.scan(COUCH_CFG.join.claimButton, couchPadSet);\n      if (hit !== null) couchClaimPad = hit;\n    }\n    couchOverlay.update(couchJoinView());\n  }",
      "after": "  if (ui.couchJoinOpen) {\n    if (couchClaimPad !== null && (padIdAt(couchClaimPad) !== couchClaimId\n      || couchPadSet.has(couchClaimPad))) {\n      // Losing the selected device ends its pending pick, even if the same\n      // controller later returns at that slot. Its next press must claim anew.\n      couchJoinGeneration++;\n      couchClaimPad = null;\n      couchClaimId = null;\n      couchClaim.arm(couchPadSet);\n    }\n    if (couchClaimPad === null) {\n      const hit = couchClaim.scan(COUCH_CFG.join.claimButton, couchPadSet);\n      if (hit !== null) { couchClaimPad = hit; couchClaimId = padIdAt(hit); }\n    }\n    couchOverlay.update(couchJoinView());\n  }"
    }
  ]
} as const;

/** Exact reader-only adaptation; original historical assertions reconstruct unchanged. */
export const nativeCouchJoinProofAdapter = {
  "file": "balance/probe_nativebrowserentrycompositionsource.ts",
  "beforeHash": "ac2813b373e6cd1fff0660695ecd264fd05f3b71fc141057e4c1e820929453e4",
  "afterHash": "e8fa1bd70e68533388e420acb412d7805ef94b063822da0525b58411c278c2de",
  "hunks": [
    {
      "before": "import assert from 'node:assert/strict';",
      "after": "import {beforeNativeCouchJoinLifetime} from './nativeCouchJoinLifetimeFixture';\nimport assert from 'node:assert/strict';"
    },
    {
      "before": "source=readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n');",
      "after": "source=(row.file==='src/main.ts'?beforeNativeCouchJoinLifetime:(s:string)=>s)(readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n'));"
    }
  ]
} as const;
