// ---------------------------------------------------------------------------
// BASELINE MERCENARIES — the outpost's stock-in-trade, as data.
//
// Each template is an archetype the market can always field (the D2 shape:
// the archer, the desert warrior, the caster-for-coin). A hire synthesizes a
// fresh build from the template at the patron's normalized power — class bar
// as its gems, class start on the tree, no gear — so baselines are the honest
// yardstick the power normalizer holds VETERANS (player-retired heroes,
// meta/mercs.ts) to. Adding an archetype is one entry here; omitting `bar`
// uses the class's live bar, so a re-barred class re-arms its blades free.
//
// Templates may draw on classes the ACCOUNT hasn't unlocked — a hired blade
// is an NPC with a kit, not a class grant; meeting one is a taste of what the
// Vault sells, never a leak of it.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';

export interface MercTemplateDef {
  id: string;
  /** Name pool — each offer rolls one (until the Naming system writes here). */
  names: string[];
  classId: string;
  /** The hire-card pitch. */
  blurb: string;
  /** Skill loadout; defaults to the class's live bar. */
  bar?: (string | null)[];
}

export const MERC_TEMPLATES: MercTemplateDef[] = [
  {
    id: 'sellsword', classId: 'warrior',
    names: ['Kessa Ironhand', 'Bruel the Wall', 'Dagny Halfshield', 'Old Vorren'],
    blurb: 'A steady sword and a steadier shield. Stands where you point, bleeds so you don\'t.',
  },
  {
    id: 'hedge_wizard', classId: 'magician',
    names: ['Perrin Ashglass', 'Maude of the Nine Candles', 'Sorel the Damp', 'Icta'],
    blurb: 'Half a scholar, all a menace. Throws what the academy expelled them for.',
  },
  {
    id: 'knife_for_coin', classId: 'rogue',
    names: ['Whisper Ede', 'Corvic', 'The Lark', 'Sable Marn'],
    blurb: 'You will forget they\'re with you until something behind you falls over.',
  },
  {
    id: 'lay_mender', classId: 'cleric',
    names: ['Sister Alwen', 'Brother Casp', 'Yeva the Kind', 'Prior Ottel'],
    blurb: 'Left the order, kept the hands. Keeps you standing through what you had no business surviving.',
  },
  {
    id: 'pit_wolf', classId: 'berserker',
    names: ['Ragga', 'Twice-Burned Hulm', 'Kessit the Red', 'Broke-Tooth'],
    blurb: 'Fought for crowds, fights for coin now. Do not stand in the arc.',
  },
];

export const MERC_TEMPLATE_BY_ID: Record<string, MercTemplateDef> =
  Object.fromEntries(MERC_TEMPLATES.map(t => [t.id, t]));

// The outpost's camp dressing (world.placeMercOutpost pushes these at runtime).
// The rows make the implicit default EXPLICIT — same walkable-ground behavior
// they always had, but the kinds now stand in the rules registry like every
// other placed kind (the registered-everywhere parity the validators sweep).
registerDoodadRule('merc_bedroll', { overlap: 'ground' });
registerDoodadRule('merc_banner', { overlap: 'ground' });
