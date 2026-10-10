import type { CharacterSave } from './character';
import type { WorldStateSave } from './worldstate';
import type { MassAdventureSave } from '../worldmass/runtime';
import type { MassCell } from '../worldmass/address';
import type { MassDormancyPolicy } from '../worldmass/dormancy';
import type { CharacterPageEntry } from './characterPages';

/** Resume data is not a portable save: omitted historic bodies remain owned by
 * immutable pages. Only the complete loaders may return CharacterSave. */
export type CharacterFields = Omit<CharacterSave, 'world'>;
export type WorldResumeFields = Omit<WorldStateSave, 'worldmass'>;
export interface MassResidentResume {
  definition: Omit<MassAdventureSave, 'enemies' | 'dormancy'>;
  residentEnemies: MassAdventureSave['enemies'];
  residentDormancy: NonNullable<MassAdventureSave['dormancy']>;
}
export interface NativeResumePages {
  version: 1;
  run: string;
  configHash: string;
  frame: MassCell;
  addressSpan: number;
  policy: MassDormancyPolicy;
  pages: readonly CharacterPageEntry[];
  order: readonly string[];
}
declare const resumeAuthorityBrand: unique symbol;
export interface ResumeAuthority { readonly [resumeAuthorityBrand]: true }
export type CharacterResume =
  | { kind: 'inline'; save: CharacterSave; authority: ResumeAuthority }
  | { kind: 'browser-native-pages'; character: CharacterFields; world: WorldResumeFields;
      mass: MassResidentResume; pages: NativeResumePages; authority: ResumeAuthority };
export type CharacterResumeRead =
  | { status: 'ready'; resume: CharacterResume }
  | { status: 'empty' | 'deleted' | 'incompatible' | 'stale' }
  | { status: 'refused'; reason: string };
/** The menu's Continue label (HOME SLOTS, W7: `shard` makes it a "Return to <world>"). */
export type CharacterContinueSummary = Pick<CharacterFields, 'classId' | 'name' | 'level' | 'charId' | 'modeId' | 'shard'>;
export const characterResumeFields = (resume: CharacterResume): CharacterFields =>
  resume.kind === 'inline' ? resume.save : resume.character;
