/** Shared authoring/reading geometry, in tree units. Positions remain editable
 * in passives.ts and the native tree editor; these settings never change links. */
export const PASSIVE_TREE_ROUTE_CFG = {
  nodeClearance: 7, endpointGap: 3, gridStep: 10, searchMargin: 120,
  inactive: '#626577', active: '#d1b66b', backing: '#0b1018',
  width: 1.6, activeWidth: 2.8, bridgeClearance: 3.5,
  parallelClearance: 6, parallelAngleSin: .06, parallelMinLength: 12,
};
