/** One exact preventative retained-anchor guard; all other native text is unchanged. */
export const nativeRescueAnchorArchive = {
  "file": "src/engine/questRescues.ts",
  "beforeSha256": "5a55dd92ba12cb647bcad7bbb05a2fa6900da69e9816a93627ecb307c1d10d09",
  "afterSha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7",
  "rawBeforeSha256": "5a55dd92ba12cb647bcad7bbb05a2fa6900da69e9816a93627ecb307c1d10d09",
  "rawAfterSha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7",
  "before": "if (!w.actors.find(a => a.defId === bossId)) return;",
  "after": "if (bossId === undefined || !w.actors.find(a => a.defId === bossId)) return;",
  "pin": "d055da8fd43c534bc8cc578629f3b8d4ad3b794d"
} as const;
