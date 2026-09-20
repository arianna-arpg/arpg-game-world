import { registerGuardian } from '../engine/guardianSpec';

registerGuardian({
  id: 'graveglass', name: 'Graveglass',
  description: 'A spectral pane breaks to intercept one incoming hostile projectile, then reforms. Additional grants add panes. Does not stop melee, beams or ground damage.',
  recharge: 5, reach: 32, flash: 0.3, color: '#a7d8cc',
  moteRadius: 7, moteOffset: 17, moteSpread: 0.55,
});
