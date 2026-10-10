import { World } from '../engine/world';
import { CLASSES } from '../data/classes';
import { reconcileManifest } from '../packages/manifest';
import { serializeAccount, type Account } from './account';
import { applyCharacterResumeFields, bindCharacterResumePages,
  characterResumeAuthority, characterResumeCurrent } from './character';
import { characterResumeFields, type CharacterResume } from './characterResume';
import type { ResumeSpawn } from './worldstate';
import { soloResumeRefusal } from '../net/shardDoor';

export interface PreparedCharacterWorld {
  readonly world: World;
  /** Synchronous final authority/account check. Caller adopts immediately. */
  publish(): World;
  discard(): void;
}

/** A failed or superseded Continue cannot replace the live world, mutate the
 * account or leave native helper policies pointing at an abandoned candidate. */
export async function prepareCharacterWorld(account: Account, resume: CharacterResume, options: {
  isCurrent: () => boolean; signal?: AbortSignal; fallbackSeed: number;
  spawn: ResumeSpawn; roster?: { charId: string; modeId: string };
  loadingStage?: (label: string) => Promise<void>;
}): Promise<PreparedCharacterWorld> {
  const baseline = JSON.stringify(serializeAccount(account));
  const current = (): boolean => !options.signal?.aborted && options.isCurrent()
    && characterResumeAuthority(resume) && JSON.stringify(serializeAccount(account)) === baseline;
  if (!current() || !await characterResumeCurrent(resume) || !current()) throw Error('Continue was superseded');
  const fields = characterResumeFields(resume), cls = CLASSES.find(c => c.id === fields.classId);
  if (!cls) throw Error('The saved character class is unavailable');
  // HOME SLOTS (W7): a hero bound to a hosted world never wakes in a solo world built
  // from its world-less mirror; its Continue is a return (main.ts), and this is the backstop.
  const bound = soloResumeRefusal(fields);
  if (bound) throw Error(bound);
  const manifest = reconcileManifest(fields.expedition, account, options.fallbackSeed);
  if (options.loadingStage) await options.loadingStage('Restoring the world');
  if (!current()) throw Error('Continue was superseded');
  const candidate = World.staged(structuredClone(account), Object.freeze(manifest));
  let rollback = (): void => {};
  let published = false, discarded = false;
  const discard = (): void => {
    if (published || discarded) return;
    discarded = true; candidate.massRuntime?.dispose(); rollback();
  };
  try {
    candidate.withGlobalPolicies(() => {
      candidate.createPlayer(cls, { ...options.roster, startingCompanions: false, startingFlasks: false });
      if (!applyCharacterResumeFields(candidate, resume)) throw Error('The saved character could not be restored');
      if (options.roster && !candidate.meta.charId) candidate.meta.charId = options.roster.charId;
      const sourceWorld = resume.kind === 'inline' ? resume.save.world : { ...resume.world, worldmass: resume.mass.definition };
      // Native world sanitizers heal their input; the authority record remains immutable.
      const ws = sourceWorld && structuredClone(sourceWorld);
      if (!ws || !candidate.adoptWorldState(ws)) {
        if (resume.kind === 'browser-native-pages' || ws?.worldmass) throw Error('The saved world could not be restored');
        candidate.scrubStaleObjectives();
        rollback = bindCharacterResumePages(candidate, resume);
        return;
      }
      rollback = bindCharacterResumePages(candidate, resume);
      const mass = resume.kind === 'browser-native-pages' ? resume.mass : resume.save.world?.worldmass;
      if (mass) {
        const definition = 'definition' in mass ? mass.definition : mass;
        candidate.startWorldMass(definition.state.run.seed, mass, { restoreOnly: true });
        if (!candidate.restoreMassSideareas(ws.massSideareas, true)) candidate.resumeSpawn('exact', ws.player);
      } else {
        candidate.reconcileSoulrivers(); candidate.reconcileSeaPorts(); candidate.reconcileWebLaws();
        candidate.resumeSpawn(options.spawn, ws.player);
      }
    });
    if (options.loadingStage) await options.loadingStage('Recalling nearby world pages');
    if (!current()) throw Error('Continue was superseded');
    // An active cave owns the player pose now. Its surface page claims remain
    // bound, but surface hydration waits for the actual mouth return.
    if (candidate.massRuntime) await candidate.massRuntime.prepareResumeNeighborhood(candidate,
      { isCurrent: current, signal: options.signal });
    if (!current() || !await characterResumeCurrent(resume) || !current()) throw Error('Continue was superseded');
    return { world: candidate, discard, publish: () => {
      if (discarded || published || !current()) throw Error('Continue was superseded');
      candidate.withGlobalPolicies(() => candidate.massRuntime?.finishResume(candidate));
      if (!current() || !candidate.publishResumeAccount(account, baseline)) throw Error('The account changed during Continue');
      published = true;
      return candidate;
    } };
  } catch (error) { discard(); throw error; }
}
