import type {Actor} from './actor';
/** Observation of the exact body after native insertion; no admission rights. */
export type NativeTownBodyKind='door'|'furniture'|'plan'|'folk'|'tracker'|'recruiter'|'ward'|'training';
export type NativeTownBodyRecorder=(kind:NativeTownBodyKind,row:object|string,body:Actor)=>void;
