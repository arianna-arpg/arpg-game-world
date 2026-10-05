import type { LookDef, WalkLook } from '../render/vis/parts';

/** Shared player anatomy. Class clothing and equipment dress the same moving
 * body; new classes inherit both limbs and gait without copying a walk block. */
export const PLAYER_BODY_WALK: WalkLook = {
  cycle: 6, swing: .6, sway: .035, lift: .06,
  parts: [
    {kind:'boot',x:-.5,y:-.55,hip:{x:-.12,y:-.42,width:.21},role:'wood',phase:1},
    {kind:'boot',x:-.5,y:.55,hip:{x:-.12,y:.42,width:.21},role:'wood',phase:-1},
  ],
};
/** Content can replace the gait as a whole, without duplicating the default. */
export function playerBodyLook(dress: LookDef): LookDef {
  return {...dress, walk:dress.walk ?? PLAYER_BODY_WALK};
}
