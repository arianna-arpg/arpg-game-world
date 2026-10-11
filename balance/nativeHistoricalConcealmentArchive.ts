/** Exact immutable registry restoration e261f969. */
export const historicalConcealmentArchive={
  "commit": "e261f9694ab44c3d1c61e335858b6227ed44a15f",
  "before": {
    "predicate": "export function isDoodadGround(id: string): boolean {\n  const r = REGION_KINDS[id];\n  return !!(r?.walkable && !r.visualOnly\n    && (r.standStatus || r.enterStatus || r.survival || r.moveScale !== undefined));\n}",
    "brush": "registerRegion({ id: 'brush', walkable: true, blocks: false, label: 'the brush' });",
    "reeds": "registerRegion({ id: 'reeds', walkable: true, blocks: false, label: 'the reeds' });",
    "berry_bush": "registerRegion({ id: 'berry_bush', walkable: true, blocks: false, label: 'the bushes' });"
  },
  "after": {
    "predicate": "export function isDoodadGround(id: string): boolean {\n  const r = REGION_KINDS[id];\n  return !!(r?.walkable && !r.visualOnly\n    && (r.standStatus || r.enterStatus || r.survival || r.moveScale !== undefined));\n}",
    "brush": "registerRegion({ id: 'brush', walkable: true, blocks: false, label: 'the brush', standStatus: 'concealed' });",
    "reeds": "registerRegion({ id: 'reeds', walkable: true, blocks: false, label: 'the reeds', standStatus: 'concealed' });",
    "berry_bush": "registerRegion({ id: 'berry_bush', walkable: true, blocks: false, label: 'the bushes', standStatus: 'concealed' });"
  }
} as const;
