/** Ordinary fresh water shares one material whether poured as a brook,
 * river doodads or geographic region cells. Special waters keep their own art. */
export const WATER_SURFACE = {
  deep: '#1d4254', rim: '#9ab8cc', highlight: '#c3e0e5', shadow: '#0a2635',
  spacingX: 78, spacingY: 38, length: 31, amplitude: 2.2,
  speed: .65, drift: 3.2, opacity: .23,
};
export function ordinaryWater(region: string): boolean {
  return region === 'water' || region === 'deep_water';
}
