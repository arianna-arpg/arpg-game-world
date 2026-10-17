/** Exact presentation-only successor; all immutable kernel/context predecessors remain unchanged. */
export const nativeCombatPresentationArchive=[
  {
    "file": "src/engine/nativeSceneCombatHost.ts",
    "beforeHash": "d92394319092c6e8397d6863b652a058e39de78bbfdc283bee47c15891e7bbc6",
    "afterHash": "3591322328583fa1c8d7060420145df361bb6f29448c7959b2a7657eeca4f2e9",
    "edits": [
      {
        "before": " lowLifeHitFlash: World[\"lowLifeHitFlash\"];",
        "after": " lowLifeHitFlash: World[\"lowLifeHitFlash\"];\n isLocalPresentationActor(actor:Actor):boolean;"
      }
    ]
  },
  {
    "file": "src/engine/nativeSceneCombatContext.ts",
    "beforeHash": "c7a202648a303c4b184250cc6d7fcc91595dfee44c41b48dbc1cb4bf3c274212",
    "afterHash": "5eff53eb6ec1ffc31b5bb244649853ffc6fcc25d50429dab6672fa9257c6c441",
    "edits": [
      {
        "before": " eyecatch:World[\"eyecatch\"];",
        "after": " eyecatch:World[\"eyecatch\"];\n isPresentationArea():boolean;"
      },
      {
        "before": "    const spec = def.ultimate;\n    if (!spec) return;",
        "after": "    const spec = def.ultimate;\n    if (!spec) return;\n    if (!nativeHost.isPresentationArea()) return;"
      }
    ]
  },
  {
    "file": "src/engine/nativeSceneCombatResolution.ts",
    "beforeHash": "5a0416df09890d48661a673de9ab3ee080cc09c6fdaf7d210bf921897477edbe",
    "afterHash": "c267484c3b1521bdda0a4d135aee081c0b8baccbe1c03bed992a1d865f4ffa96",
    "edits": [
      {
        "before": "if (target === nativeHost.player && nativeHost.player.life > 0\n        && nativeHost.player.life < nativeHost.player.maxLife() * nativeHost.player.lowLifeLine()) {",
        "after": "if (nativeHost.isLocalPresentationActor(target) && target.life > 0\n        && target.life < target.maxLife() * target.lowLifeLine()) {"
      }
    ]
  }
] as const;
