import { HUB_ZONE, START_ZONE } from './zones';
import { odysseyMilestoneKey } from './powerProgression';
import { questDoneKey } from '../meta/account';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST } from './brandt';
import { RELIQUARY_CFG } from './reliquary';
import { ORACLE_RESCUED } from './oracle';
export { BRANDT_HAMMER_QUEST } from './brandt';
import type { World } from '../engine/world';

export type DialogueCondition =
  | { ledger: string; scope: 'account' | 'run' | 'either'; atLeast?: number }
  | { fact: string; is?: boolean }
  | { quest: string; state: 'active' | 'ready' }
  | { feature: string }
  | { accountLevel: number };

export interface NpcDialogueDef {
  id: string;
  speaker: { defId?: string; role?: string };
  zone?: string;
  priority: number;
  all?: readonly DialogueCondition[];
  any?: readonly DialogueCondition[];
  none?: readonly DialogueCondition[];
  trigger: { kind: 'dwell'; radius: number; seconds: number }
    | { kind: 'exitApproach'; to: string; radius: number; holdSec: number };
  /** Receipt is stamped on admission, never on a mere condition/preview read. */
  once?: 'run' | 'account';
  lines: readonly { text: string; weight?: number }[];
  color?: string;
}

/** Live facts supplement durable ledgers without putting NPC-specific cases in
 * the director. New systems can register their own facts here. */
export const NPC_DIALOGUE_FACTS: Record<string, (w: World) => boolean> = {
  oracleAttuned: w => !!w.account.ledger[RELIQUARY_CFG.attunement],
  oracleAtHome: w => w.zone.id === START_ZONE,
  oracleRelicWaiting: w => w.activeQuests.some(a => w.questStanding(a) === 'ready'
    && w.questDefOf(a.questId)?.reward.choices?.some(c => c.baseId === 'relic_charm')),
  oracleMemoryWaiting: w => w.activeQuests.some(a => w.questStanding(a) === 'ready' && !!w.questDefOf(a.questId)?.reward.skillChoice),
  oracleCommanderAfield: w => w.activeQuests.some(q => q.questId.startsWith('oracle_commander_') && !q.fieldDone),
  reliquaryLesson: w => w.reliquaryLesson(),
  mireilleLessonComplete: w => w.mireilleLessonLived(),
  brandtImbueWaiting: w => w.questImbues.some(r => [BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST].includes(r.questId)),
};

/** The live actor look feeds body rendering, portraits, saves and co-op. */
export const NPC_APPEARANCES: Record<string, { base: string; variants: { all: readonly DialogueCondition[]; look: string }[] }> = {
  townsfolk_smith: { base: 'npc_smith_unarmed', variants: [
    { all: [{ ledger: questDoneKey(BRANDT_HAMMER_QUEST), scope: 'either' }], look: 'npc_smith' },
  ] },
};
export const NPC_DIALOGUES: NpcDialogueDef[] = [
  {
    id: 'oracle_memory_choice', speaker: { defId: 'townsfolk_oracle' }, priority: 212,
    all: [{ fact: 'oracleAtHome' }, { fact: 'oracleMemoryWaiting' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'A familiar shadow falls, and this life has room for a different answer. Choose a magic Memory in your Quest Journal.\n\nI can call upon the skills you have made your own. A calling glimpsed must first be welcomed in the Vault before its arts can answer by name.' }],
  },
  {
    id: 'oracle_commander_pursuit', speaker: { defId: 'townsfolk_oracle' }, priority: 201,
    all: [{ fact: 'oracleAtHome' }, { fact: 'oracleCommanderAfield' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'My door still stands because you opened another. I have not forgotten.\n\nThe old commander gathers a new warband. Break that command and return. This time, I will help you call a Memory of your choosing — a strength to shape the road ahead.' }],
  },
  {
    id: 'oracle_captive', speaker: { defId: 'townsfolk_oracle' }, priority: 220,
    none: [{ ledger: ORACLE_RESCUED, scope: 'either' }, { fact: 'oracleAtHome' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'They ask which road will break Lastlight. Which names the dead will obey. I have given them silence.\n\nThe commander keeps the binding. End his watch, and mine can end as well.' }],
  },
  {
    id: 'oracle_freed', speaker: { defId: 'townsfolk_oracle' }, priority: 215,
    all: [{ ledger: ORACLE_RESCUED, scope: 'either' }], none: [{ fact: 'oracleAtHome' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'The binding is broken. For the first time in many nights, the road I see is my own. Thank you.\n\nI will make my way to Lastlight. Meet me among the standing stones. There are keepsakes the dead leave willingly; I can teach you how to carry their strength.' }],
  },
  {
    id: 'oracle_reliquary_gift', speaker: { defId: 'townsfolk_oracle' }, priority: 210,
    all: [{ fact: 'oracleAtHome' }, { fact: 'oracleRelicWaiting' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'A quiet place. I had almost forgotten such things existed. Your Reliquary is open now. Choose a charm in your Quest Journal, then seat it in the case.\n\nA relic carried loose is only a memory. Given a place, it can lend you its strength.' }],
  },
  {
    id: 'oracle_reliquary_lesson', speaker: { defId: 'townsfolk_oracle' }, priority: 205,
    all: [{ fact: 'oracleAtHome' }, { fact: 'reliquaryLesson' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Set a charm into the open seat of your Reliquary. A place freely given, a strength freely shared.\n\nYou will find other relics on the road now. Bring the ones whose stories belong beside yours.' }],
  },
  {
    id: 'oracle_attunement', speaker: { defId: 'townsfolk_oracle' }, priority: 202,
    all: [{ fact: 'oracleAtHome' }], none: [{ fact: 'oracleAttuned' }, { fact: 'reliquaryLesson' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'I can keep these Relics for the lives still to come. Bring me your finds, and exchange what rests in your case whenever you return.\n\nAsk me to attune the Reliquary. Then, at each Reckoning, you may give it Mortal Essence. The case remembers every offering, even one too small to finish its next strengthening.' }],
  },
  {
    id: 'oracle_resident', speaker: { defId: 'townsfolk_oracle' }, priority: 200,
    all: [{ fact: 'oracleAtHome' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Lastlight remembers the one who opened my prison. Faces change. Kindness does not become a stranger.\n\nBring your relics, or a piece whose runes trouble you. We will listen to what remains possible.' }],
  },
  {
    id: 'brandt_trophy_imbue', speaker: { defId: 'townsfolk_smith' }, priority: 181,
    all: [{ fact: 'brandtImbueWaiting' }, { ledger: questDoneKey(BRANDT_TROPHY_QUEST), scope: 'run' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'That fang will do nicely. Thank you. The hammer you brought home still knows its work.\n\nChoose a magic piece and one of my offers in your Quest Journal. Its old strengths will stay. If there is a line you have not studied, a later turn at the salvage bench may teach you something. No hurry — the promise lasts this life.' }],
  },
  {
    id: 'brandt_imbue_waiting', speaker: { defId: 'townsfolk_smith' }, priority: 180,
    all: [{ fact: 'brandtImbueWaiting' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'My old hammer. Thank you. You brought back more than a tool. Bring me a magic piece from your pack, and I will add a strength of your choosing without taking away what it already holds. You will find my offers in your Quest Journal.\n\nNo hurry. This work will wait for you through this life, though its strength is the strength we earned at the old forge. Returning my hammer has also opened Rare Wares for investment in the Vault; a salvage bench can follow.' }],
  },
  {
    id: 'brandt_trophy_sought', speaker: { defId: 'townsfolk_smith' }, priority: 160,
    all: [{ quest: BRANDT_TROPHY_QUEST, state: 'active' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'My hammer is home, and here it stays. But Cindermaw has stirred at the Cold Cinder Forge again. Bring me its iron fang. There is a heat in that old beast that an honest anvil can put to better use.\n\nOne trophy, one piece made finer. I will keep the fire for you.' }],
  },
  {
    id: 'mireille_road_welcome', speaker: { defId: 'townsfolk_innkeep' }, zone: START_ZONE,
    priority: 200, all: [{ fact: 'mireilleLessonComplete', is: false }], once: 'run',
    trigger: { kind: 'exitApproach', to: HUB_ZONE, radius: 300, holdSec: 16 },
    lines: [
      { text: 'Off to the Crossroads already, love? Come find me by the fire before you go. Let us see those two little flasks settled where you can reach them.\n\nNo hurry. Stay beside me a moment when you are ready. The road can spare you that much kindness.' },
      { text: 'A moment, dear, before the Crossroads carries you off. Come warm yourself by my fire. We ought to see those flasks settled where you can reach them.\n\nJust linger beside me when you are ready, love. I would rather send you out with a full cup.' },
    ],
  },
  {
    id: 'brandt_hammer_returned', speaker: { defId: 'townsfolk_smith' }, priority: 150,
    all: [{ ledger: questDoneKey(BRANDT_HAMMER_QUEST), scope: 'run' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'There it is. Worn haft, chipped face, and still the right weight in my hand. You brought back more than a hammer.\n\nGive me a little time with the anvil. I have missed the sound of honest work.' }],
  },
  {
    id: 'brandt_hammer_remembered', speaker: { defId: 'townsfolk_smith' }, priority: 140,
    all: [{ ledger: questDoneKey(BRANDT_HAMMER_QUEST), scope: 'account' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Someone once went out into the dark and brought my hammer home. I keep it closer now.\n\nNew faces, old tools. Sit a moment. There is comfort in work that outlasts us.' }],
  },
  {
    id: 'brandt_hammer_sought', speaker: { defId: 'townsfolk_smith' }, priority: 130,
    all: [{ quest: BRANDT_HAMMER_QUEST, state: 'active' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Cindermaw. That is the thief’s name. Follow the trail I marked to the Cold Cinder Forge and bring my hammer home. There is one magic piece I would gladly make finer in thanks.\n\nDo not trade your neck for a lump of iron on my account. I miss the work. That does not mean I want another empty chair by Mireille’s fire.' }],
  },
  {
    id: 'brandt_roads_changed', speaker: { defId: 'townsfolk_smith' }, priority: 120,
    all: [{ ledger: odysseyMilestoneKey(2), scope: 'account' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Two of those great shadows broken, they say. Folk have begun making plans again.\n\nMe? Still a smith with an idle anvil. My hammer is missing, and fine intentions do not draw iron into shape.' }],
  },
  {
    id: 'brandt_magic_stock', speaker: { defId: 'townsfolk_smith' }, priority: 126,
    all: [{ feature: BRANDT_CFG.magicWares.flag }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Those writs have put my name back in circulation. Better pieces are finding their way here now — some with a little magic in them.\n\nStill no sign of my hammer. But I can keep a useful shelf while we wait.' }],
  },
  {
    id: 'brandt_magic_ready', speaker: { defId: 'townsfolk_smith' }, priority: 125,
    all: [{ ledger: BRANDT_CFG.magicWares.ledger, scope: 'account', atLeast: BRANDT_CFG.magicWares.required }],
    none: [{ feature: BRANDT_CFG.magicWares.flag }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Enough writs earned. Word of that work has reached the people who supply my shelves.\n\nWhen next you stand before the Vault, look for Magic Wares under my name. Invest there, and I can bring in something finer for your next life.' }],
  },
  {
    id: 'brandt_writ_hint', speaker: { defId: 'townsfolk_smith' }, priority: 124,
    all: [{ feature: 'bounty_board' }], none: [{ feature: BRANDT_CFG.magicWares.flag }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: `My hammer is still missing, but there are other ways to bring better work through this yard. Look for bounties that pay a Smith’s Writ.\n\nCollect ${BRANDT_CFG.magicWares.required} of those bounties, and the Vault will let you invest in magic wares for my shelves. For now, I can offer the plain basics — and buy what you no longer need.` }],
  },
  {
    id: 'brandt_first_victory', speaker: { defId: 'townsfolk_smith' }, priority: 110,
    all: [{ ledger: odysseyMilestoneKey(1), scope: 'account' }],
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [{ text: 'Word is one of the roads has grown quieter. That is something worth keeping.\n\nI would like to do my part at this anvil, but my hammer is still gone. Until it turns up, there is only so much a smith can offer.' }],
  },
  {
    id: 'brandt_missing_hammer', speaker: { defId: 'townsfolk_smith' }, priority: 100,
    trigger: { kind: 'dwell', radius: 150, seconds: 0.4 },
    lines: [
      { text: 'Mind the anvil. It has had precious little use lately. I have lost my hammer, and a smith without his hammer is mostly a man standing near cold iron.\n\nThere is only so much work I can offer you until it turns up. A foolish thing to lose, after all these years.' },
      { text: 'Brandt. Smith, when I have the tools for it. My hammer has gone missing, so you have caught me with more promises than work to offer.\n\nI still reach for it every morning. Funny how the hand remembers what the rest of you would rather forget.' },
    ],
  },
];
