import type { CosmeticLoadout } from '../engine/cosmetics';
import type { SpiritDirection } from './spiritRun';
import type { LoadingSurface } from './loadingSurface';

export interface LoadingStatus { label: string; detail?: string; completed?: number; total?: number }
export interface LoadingOptions extends LoadingStatus {
  kind: 'entry' | 'travel'; direction?: SpiritDirection; loadout?: CosmeticLoadout;
  cancel?: () => void;
}
export interface LoadingLease {
  readonly current: boolean;
  update(status: LoadingStatus): void;
  /** Wait for a foreground frame and its input messages before continuing work. */
  paint(): Promise<void>;
  fail(message: string, retry?: () => void): void;
  finish(): void;
}
export type LoadingSnapshot = LoadingSurface['snapshot'];
export const LOADING_CHANNEL = 'hollow-wake-crossing-v1';
export type LoadingCommand = { channel: typeof LOADING_CHANNEL; token: number } & (
  | { type: 'begin'; options: Omit<LoadingOptions, 'cancel'>; cancel: boolean }
  | { type: 'status'; status: LoadingStatus }
  | { type: 'fail'; message: string; retry: boolean }
  | { type: 'paint'; request: number }
  | { type: 'sample' }
  | { type: 'close' }
);
export type LoadingReply = { channel: typeof LOADING_CHANNEL; token: number } & (
  | { type: 'ready' }
  | { type: 'snapshot'; value: LoadingSnapshot }
  | { type: 'keys'; keys: string[] }
  | { type: 'closed'; keys: string[] }
  | { type: 'painted'; request: number }
  | { type: 'action'; action: 'cancel' | 'retry' }
  | { type: 'error'; message: string }
);
