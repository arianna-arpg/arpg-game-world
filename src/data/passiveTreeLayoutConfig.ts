/** Shared authoring/reading geometry, in tree units. Positions remain editable
 * in passives.ts and the native tree editor; these settings never change links. */
export const PASSIVE_TREE_ROUTE_CFG = {
  nodeClearance: 7, endpointGap: 3, gridStep: 10, searchMargin: 180,
  inactive: '#626577', active: '#d1b66b', backing: '#0b1018',
  width: 1.6, activeWidth: 2.8, bridgeClearance: 3.5,
  parallelClearance: 8, parallelAngleSin: .12, parallelMinLength: 12,
  crossingCost: 300,
  hoverBrightness: 1.22, hoverDurationMs: 180,
};

/** Keep every initial branch choice visible with the central painting. */
export const PASSIVE_TREE_VIEW_CFG = { openingSpan: 1240 };
