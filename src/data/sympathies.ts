// ---------------------------------------------------------------------------
// SYMPATHY LINKS — the shipped kinship vocabulary (engine/sympathy.ts).
//
// A link is pure data: WHOSE gain is heard (`from`, default 'self'), WHAT
// kinds of gain echo (`channels`, optionally tag/id-filtered), WHO receives
// (`to`, relation vocabulary), and HOW MUCH (`scale` × the holder's
// sympathy_<id> potency stat). Grant surfaces — all ordinary mod grants of
// the sympathy_<id> stat family: SkillDef.equipMods (bar-slotted), support
// gems (skill-local), passives, affixes, statuses, MonsterDef.sympathy.
//
// Adding a new bond here needs NO engine change: register the link, grant
// its stat somewhere. Docs: docs/engine/sympathy.md
// ---------------------------------------------------------------------------

import { registerSympathyLink } from '../engine/sympathy';

// --- The tamed bond (granted by tame_beast's equipMods while slotted) -------

// THE headline bond: the keeper drinks, the beasts drink. Flask pours
// (restore streams) and flask buffs replay on every bonded companion —
// zone-wide, because the bond itself is the leash.
registerSympathyLink({
  id: 'bond_flask', label: 'bond', color: '#a8c87a',
  channels: ['restore', 'buff'], tags: ['flask'],
  to: ['companions'],
  scale: 1,
});

// Scooped resource orbs pour into the bond too: the orb's restore/charge
// payload replays on the companions at full strength.
registerSympathyLink({
  id: 'bond_orb', label: 'bond', color: '#a8c87a',
  channels: ['orb'],
  to: ['companions'],
  scale: 1,
});

// --- Keeper deepenings (support gems grant these) ----------------------------

// Pack Instinct: charges the keeper banks echo to the pack (counts copy
// verbatim — the beasts' own caps bind what sticks; the classic combat
// charges carry a registry baseCap exactly for skill-less banking).
registerSympathyLink({
  id: 'pack_charges', label: 'pack', color: '#c8a06a',
  channels: ['charge'],
  to: ['companions'],
});

// Reciprocal Bond (the INVERSE lane): the keeper LISTENS to the beasts —
// when a companion is mended, a share flows back to the keeper. Same
// fabric, one def apart: from 'companions', to 'self'.
registerSympathyLink({
  id: 'feral_reciprocity', label: 'reciprocity', color: '#7ec88a',
  from: 'companions',
  channels: ['heal', 'restore'],
  to: ['self'],
  scale: 0.4,
});

// --- The fellowship lane (gear / tree grants) --------------------------------

// The Conduit homage: charges you gain are shared with other seats — co-op
// partners and hired mercenaries alike ('of Fellowship' suffix).
registerSympathyLink({
  id: 'shared_surge', label: 'fellowship', color: '#9ab8e8',
  channels: ['charge'],
  to: ['party'],
  radius: 520,
});

// Heals landing on you ripple outward, diminished, to the nearest few
// allies — NPCs and wandering friendlies included (tree notable).
registerSympathyLink({
  id: 'menders_ripple', label: 'ripple', color: '#8ad0c8',
  channels: ['heal'],
  to: ['allies'],
  radius: 260, scale: 0.35, cap: 3,
});

// --- Monster-side bonds (MonsterDef.sympathy) --------------------------------

// The den matron's draught: her swig waters the whole pack — same team,
// same faction, close by. The fabric reads her exactly as it reads you.
registerSympathyLink({
  id: 'matrons_draught', label: 'matron’s draught', color: '#d8a878',
  channels: ['restore', 'buff'], tags: ['flask'],
  to: ['pack'],
  radius: 300,
});

// The Blood Cardinal's tithe: what the red vicar drinks, the Court around
// it is fed — its leeched and channelled heals replay, diminished, on its
// nearby kin. The counterplay is priority: burst the cardinal first, or
// every sip you allow it waters the flock.
registerSympathyLink({
  id: 'courts_tithe', label: 'the Court’s tithe', color: '#b83a5a',
  channels: ['heal', 'restore'],
  to: ['pack'],
  radius: 320, scale: 0.5, cap: 4,
});

// --- The tradeoff lane (registered vocabulary; future keystone/curse) --------

// The inverse lever the fabric deliberately supports: generosity that leaks
// — your charge gains and orb scoops ALSO feed nearby enemies. Unworn by
// any current grantor; reserved for a keystone whose upside pays for it.
registerSympathyLink({
  id: 'provokers_bounty', label: 'bounty', color: '#c87878',
  channels: ['charge', 'orb'],
  to: ['enemies'],
  radius: 240, scale: 0.5,
});
