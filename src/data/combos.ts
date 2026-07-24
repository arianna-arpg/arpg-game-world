// ---------------------------------------------------------------------------
// COMBO GRAMMAR REGISTRY — cast-cadence patterns as data.
//
// A ComboRuleDef (engine/sequence.ts — THE one sequence matcher) reads the
// caster's own recent-cast ring: patterns over the TAGS of the last few
// real casts — order, variety, repetition, timing. A build OPTS IN by
// granting the rule's `combo_<id>` stat (base 0) from any ordinary
// modifier source — passive node, vocation node, a skill's equipMods, an
// affix — exactly as procs are granted by proc_<id>; a MonsterDef opts a
// monster in with the same one modifier, so enemies drum the very grammars
// players learn (the cadenced kin reuse these rules verbatim — watching
// one fight IS the tutorial).
//
// Payoffs are OWNER-scoped ProcEffects executed through THE proc pipeline
// (World.executeProc): the fire prints "<Name>!" and flashes like any
// proc, buffs/restores/charges ride their canonical gates, and proc
// RIDERS can even be authored onto a grammar (host 'combo:<id>') — no
// second payoff executor exists. Completing a pattern consumes its casts
// (per-rule bookkeeping; the ring never mutates) and paces on its icd;
// timing windows scale live with the owner's comboWindow stat.
//
// The starter conditions comboVaried / comboRepeated (ConditionIds — "30%
// more damage while your last three casts were all different skills") need
// no rule at all: any `when:`-conditional modifier wakes the ring by
// itself. Support gems ride those; grammars below are the payoff tier.
//
// To add a grammar: one entry here. No engine changes.
// ---------------------------------------------------------------------------

import { comboStat, type ComboRuleDef } from '../engine/sequence';
import { mod, STAT_DEFS } from '../engine/stats';

export const COMBO_RULES: Record<string, ComboRuleDef> = {

  // BLADE-AND-VEIN — the Spellblade's weave: steel then sigil, sigil then
  // steel. Alternating the attack and spell lanes (either order — variety
  // over the lane key) surges the OTHER hand: attack and cast speed that
  // stacks while the weave holds. The flagship vocation grammar (the
  // Spellblade vocation grants it; see data/vocations.ts).
  spellblade_weave: {
    id: 'spellblade_weave', name: 'Blade-and-Vein', color: '#b8a8e8',
    blurb: 'Weave the lanes: an attack and a spell back-to-back (either order) surge your attack and cast speed — keep alternating to stack the surge.',
    vary: { n: 2, by: 'lane' },
    gate: { anyTags: ['attack', 'spell'] },
    within: 4,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'bladevein_surge', duration: 3, maxStacks: 3,
        mods: [mod('attackSpeed', 'increased', 0.1), mod('castSpeed', 'increased', 0.1)],
      },
    },
  },

  // THE PRISMATIC ROUND — three different elements in a row. The round
  // closed, every school burns brighter for a beat: the elementalist's
  // reason to cycle instead of spamming the one best button.
  elemental_round: {
    id: 'elemental_round', name: 'Prismatic Round', color: '#9ad8f8',
    blurb: 'Cast three DIFFERENT elements in a row to close the round: elemental damage surges while the prism holds.',
    vary: { n: 3, by: 'element' },
    gate: { anyTags: ['fire', 'cold', 'lightning', 'chaos'] },
    within: 8,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'prismatic_round', duration: 5,
        mods: [
          mod('damage', 'increased', 0.2, ['fire']),
          mod('damage', 'increased', 0.2, ['cold']),
          mod('damage', 'increased', 0.2, ['lightning']),
          mod('damage', 'increased', 0.2, ['chaos']),
        ],
      },
    },
  },

  // TAKEDOWN — the grab fabric's measure (engine/grab.ts): a 'grab' cast
  // then a 'throw' cast back-to-back — Seize into Heave, the clinch into
  // the toss. The Smash-grammar promise kept: the throw-grapple is a
  // SEQUENCE the combo matcher reads off the same tags the supports scope
  // by. Granted by the Seizing Style notable; the yoke-mauler drums it
  // monster-side (the payoff text over a duel names the earnable rule).
  grapplers_rhythm: {
    id: 'grapplers_rhythm', name: 'Takedown', color: '#d8a06a',
    blurb: 'Seize, then THROW — a grab followed by a throw closes the measure: your blows land harder and your grip grows surer while the rhythm holds.',
    seq: [{ anyTags: ['grab'] }, { anyTags: ['throw'] }],
    within: 6,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'takedown_surge', duration: 4, maxStacks: 2,
        mods: [mod('damage', 'increased', 0.15, ['melee']), mod('gripPower', 'flat', 0.2)],
      },
    },
  },

  // THE RESPONSORY — the Cathedral's liturgy (versicle, then antiphon —
  // call and RESPONSE): two DIFFERENT song-casts back-to-back close the
  // measure, and the church answers — a radiant burst at the singer that
  // scours the court AND mends the congregation in one circle (the
  // delayedBurst proc shape doing exactly what it was documented for).
  // Granted by Antiphon's own equipMods (a skill that teaches its measure);
  // any future song-tagged cast joins the liturgy with no edits here.
  liturgy: {
    id: 'liturgy', name: 'The Responsory', color: '#ffe9b8',
    blurb: 'Call and response: sing two DIFFERENT songs back-to-back and the Responsory answers — a radiant burst that harms the court and heals the congregation in one circle.',
    vary: { n: 2, by: 'skill' },
    gate: { anyTags: ['song'] },
    within: 5,
    effect: {
      type: 'delayedBurst', delay: 0.4, radius: 140, at: 'self',
      damage: { type: 'fire', base: 11, perLevel: 1.6 },
      healAllies: { base: 9, perLevel: 1.2 },
    },
  },

  // TWIN MEASURES — the duellist's inverse of Drumbeat: two DIFFERENT attack
  // skills back-to-back close the measure. Variety over the skill key, gated
  // to the attack lane, so a one-button build never accidentally wears it.
  // Granted by the Red Cadence wing's Twin Measures notable.
  twin_measures: {
    id: 'twin_measures', name: 'Twin Measures', color: '#e8906a',
    blurb: 'Strike with two DIFFERENT attack skills back-to-back to close the measure: damage and poise damage surge while the weave holds.',
    vary: { n: 2, by: 'skill' },
    gate: { anyTags: ['attack'] },
    within: 4,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'twin_measures', duration: 3, maxStacks: 3,
        mods: [mod('damage', 'increased', 0.08, ['attack']), mod('poiseDamage', 'increased', 0.1)],
      },
    },
  },

  // DRUMBEAT — the same blow, three times running, lands heavier: damage
  // and poise damage that stack as the drum keeps time. The repetition
  // grammar (fresh trios re-form by design — the consume rule makes every
  // third beat the payoff, not every beat after the second).
  drumbeat: {
    id: 'drumbeat', name: 'Drumbeat', color: '#d8a05a',
    blurb: 'Land the SAME skill three times running to strike the drum: damage and poise damage surge, stacking with every completed measure.',
    repeat: { n: 3 },
    gate: { anyTags: ['attack', 'spell'] },
    within: 6, icd: 0.5,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'drumbeat', duration: 4, maxStacks: 3,
        mods: [mod('damage', 'increased', 0.1), mod('poiseDamage', 'increased', 0.15)],
      },
    },
  },

  // THE GLIMMER CHORUS — the firefly's measure (the grove country): the
  // same sign flashed three times running, and the wood answers in kind.
  // The lampwrights drum it monster-side (mods-granted — the cadenced-kin
  // law: watching one fight IS the tutorial), and any build that earns the
  // stat joins the chorus — storm-callers keeping firefly time.
  glimmer_chorus: {
    id: 'glimmer_chorus', name: 'Glimmer Chorus', color: '#d8f078',
    blurb: 'Cast the SAME spell three times running to close the sign: the chorus answers — lightning damage and cast speed surge while the light holds.',
    repeat: { n: 3 },
    gate: { anyTags: ['spell'] },
    within: 6, icd: 0.5,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'lantern_chorus', duration: 5, maxStacks: 2,
        mods: [mod('damage', 'increased', 0.35, ['lightning']), mod('castSpeed', 'increased', 0.12)],
      },
    },
  },

};

export const COMBO_LIST: ComboRuleDef[] = Object.values(COMBO_RULES);

// Register every grammar's equip stat with a DISPLAY identity (the
// proc_<id> idiom): any surface printing a Modifier renders "Grammar:
// Drumbeat" instead of a raw id, and the rule's own blurb serves the
// tooltip. New grammars join automatically.
for (const def of COMBO_LIST) {
  STAT_DEFS[comboStat(def.id)] = {
    label: `Grammar: ${def.name}`, base: 0, min: 0, desc: def.blurb,
  };
}
