// Scheduled delivery follows the active preview registry. Other branches remain
// available for an explicit manual build, without reviving archived work nightly.
export function planLauncherBranches({ branches, profiles, main, requested, event, assets, assetName, key }) {
  const active = new Set(profiles.map(row => row.ref));
  if (requested && !branches.some(row => row.name === requested)) {
    throw new Error('The requested branch no longer exists.');
  }
  return branches
    .filter(row => row.name !== main)
    .filter(row => requested ? row.name === requested : active.has(row.name))
    .filter(row => event !== 'workflow_run' || active.has(row.name))
    .filter(row => !assets.some(asset => asset.name === assetName(row.name, row.commit.sha)
      && asset.state === 'uploaded' && asset.digest))
    .map(row => ({ branch: row.name, commit: row.commit.sha, id: key(row.name) }));
}
