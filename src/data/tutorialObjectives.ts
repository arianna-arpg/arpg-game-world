import type { SceneCardSpec, SceneObjectiveSpec, SceneRoadSpec } from './scenes';

/** Faction fiction composes the same two measurements. New factions choose a
 *  row; the director never branches on their identities. */
export interface TutorialJourney {
  objective: SceneObjectiveSpec;
  road?: SceneRoadSpec;
  skyCycle: number;
  assaultSky?: { cycle: number; transitionSec: number };
  intro: SceneCardSpec;
  wake: string;
  earlyWake: string;
}

const eastRoad: SceneRoadSpec = { direction: 'east', radius: 76, spacing: 64 };
const journey = (
  label: string, prompt: string, kind: 'road' | 'elapsed', line: string,
  wake: string, earlyWake: string,
): TutorialJourney => ({
  objective: { label, prompt, progress: { kind, amount: kind === 'road' ? 6000 : 96 }, interruptAt: 0.82 },
  road: eastRoad,
  skyCycle: 0.44,
  intro: {
    title: 'HOLLOW WAKE',
    lines: [
      'The old roads run longer than they used to. The towns grow few, and the lights grow far between.',
      'You have walked for days on the promise of one: LASTLIGHT, where the candles are said never to gutter.',
      line,
    ],
    button: 'Walk on',
  },
  wake, earlyWake,
});

export const TUTORIAL_JOURNEYS = {
  goblin: journey('Continue to Lastlight', 'Follow the road east. Lastlight lies ahead.', 'road',
    'East, the old milestones promised. One more mile — but something green is moving in the grass.',
    'The horn. The green tide. Lastlight still somewhere beyond you — then nothing at all.',
    'The road. The grass alive with them. Lastlight never reached — then nothing at all.'),
  undead: {
    ...journey('Survive the night', 'Keep breathing until dawn.', 'elapsed',
      'Dusk has found you among the barrows. Keep your breath until morning. The ditch-dead have begun to stir.',
      'The lament. The graves answering. Dawn still hours away — then nothing at all.',
      'Cold hands. The last breath leaving you. No dawn — then nothing at all.'),
    assaultSky: { cycle: 0.70, transitionSec: 5 },
  },
  beastkin: journey('Escape the hunting grounds', 'Take the eastern road beyond the horns.', 'road',
    'Horn calls pass between the hills. Beyond the eastern hunting stones, they say, the tribes must turn back.',
    'The stampede. The hunting stones still ahead — then nothing at all.',
    'Hooves on the road. The hunting grounds closing around you — then nothing at all.'),
  demon: journey('Outlast the cinder rain', 'Hold on. Every storm must spend itself.', 'elapsed',
    'The wind carries hot ash. Wait out the burning, you tell yourself. Even the pit must run out of breath.',
    'The Pyrefather. A sky of fire that never spent itself — then nothing at all.',
    'Ash in your lungs. The burning still falling — then nothing at all.'),
  carven: journey('Leave the harvest fields', 'Follow the eastern road past the field-rows.', 'road',
    'The field lanterns are grinning. Stay on the eastern road. You owe the harvest nothing.',
    'The gleaning. Your name among a harvest still uncounted — then nothing at all.',
    'The field-rows walking. No end to the harvest — then nothing at all.'),
  chitin: journey('Weather the Seethe', 'Stay alive until the swarm passes.', 'elapsed',
    'A clicking travels under the earth. Let the swarm pass, you tell yourself. There must be an end to it.',
    'The Swarmfather. Wings blotting out a sky that never cleared — then nothing at all.',
    'The clicking inside every breath. The swarm still coming — then nothing at all.'),
  gnoll: journey('Get beyond the laughing packs', 'Keep east along the road. Put their hunting grounds behind you.', 'road',
    'Laughter follows every footstep. Beyond the eastern ridge, perhaps, the packs will lose your scent.',
    'The Packfather. Laughter beyond the ridge you never crossed — then nothing at all.',
    'Teeth in the dusk. The ridge still out of reach — then nothing at all.'),
} satisfies Record<string, TutorialJourney>;
