/** Exact explicit Control source successor, original archive unchanged. */
export const nativeCarriedControlArchive = {
  "file": "src/engine/nativeSceneCombatControl.ts",
  "beforeHash": "0038d9036811a4803c0e522273f220bf560d59d7015b13d03f6ad517115b35a6",
  "afterHash": "20ff3d18e9d5e5d055ecdce4fd08a9fba0c1f7fab5105f70781706ede99bb428",
  "patches": [
    [
      "export interface NativeSceneCombatControlHost {",
      "export interface NativeSceneCombatControlHost {\n requireShapeshiftBody(caster:Actor):void;"
    ],
    [
      "    if (!seat || seat.home) return;\n    const def = MONSTERS[shift.form];",
      "    if (!seat || seat.home) return;\n    host.requireShapeshiftBody(caster);\n    const def = MONSTERS[shift.form];"
    ]
  ]
} as const;
export const nativeCarriedControlArchiveHash = "9ac0af73cd67d158dd664b7eecfd8d940f17f0a4b0708e480059d94b7d7275a4";
