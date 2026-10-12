/** Live capabilities used by installed skill conversion and cast laws. */
import type {World} from './world';
export type NativeSkillRuleHost = Pick<World,
 "companionBondsOfSkill" | "companionCapOf" | "seatOf">;
