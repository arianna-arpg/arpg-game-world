/** Two exact older source-read predecessors; original helpers and archives are unchanged. */
export const nativeShardsLegacySourceArchive = {
  "rows": [
    {
      "lane": "carried",
      "file": "src/engine/nativeSceneCombatControl.ts",
      "priorHash": "20ff3d18e9d5e5d055ecdce4fd08a9fba0c1f7fab5105f70781706ede99bb428",
      "helper": "beforeNativeClientStart(file,source)",
      "archive": "balance/nativeClientStartArchive.ts",
      "commit": "473c867e",
      "currentHash": "3efc2fcaa848070f5f2e7f545e9381dc9c691c954c0a44b1326e7301f424286a",
      "archiveHash": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "lane": "lifetime",
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "priorHash": "9089f8b439b65d4fc9996f9d55b58d4f9fb85f97989c9c426dcb122f85aeea06",
      "helper": "beforeNativeCampaignRaw('journey58',file,source)",
      "archive": "balance/nativeCampaignCompositionArchive.ts",
      "commit": "a5a0266946e17a9de0a326be3596992245b6bc70",
      "currentHash": "677a995baadd1292760ef4be3b777bdde64c1dd51735fc3c81227da8044802ac",
      "archiveHash": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    }
  ]
} as const;
