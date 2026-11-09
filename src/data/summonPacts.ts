import { mod, STAT_DEFS } from '../engine/stats';
import type { SkillDef } from '../engine/skills';
import type { AssemblyPact, DeathBankPact, EchoPact, GraveyardPact, SummonPactDef } from '../engine/summonPactSpec';

/** Content owns every clock, threshold, capacity and payload. Other grantors
 * (gear, monsters, another vocation) can activate these same ordinary stats. */
export const LAST_BREATH: DeathBankPact = {
    id: 'last_breath', name: 'Last Breath', stat: 'summonPact_last_breath', kind: 'deathBank', color: '#b59ae6',
    threshold: 6, temporaryOnly: true, expiry: true,
    reward: { skill: 'pact_wraith', duration: 12, maxActive: 2, forms: [
      { stat: 'summonPactForm_reaver', monster: 'court_reaper_wraith', crewSkills: ['court_wraith_lunge'] },
      { stat: 'summonPactForm_rime', monster: 'court_hex_wraith', crewSkills: ['skeletal_cold_bolt'], replaceSkills: true },
      { stat: 'summonPactForm_dirge', monster: 'court_hex_wraith', crewSkills: ['court_wraith_hex'], crewAuras: ['court_soul_veil'] },
    ] },
};
export const BURIAL_GROUND: GraveyardPact = {
    id: 'burial_ground', name: 'Burial Ground', stat: 'summonPact_burial_ground', kind: 'graveyard', color: '#9eae78',
    threshold: 5, radius: 125, ownerRadius: 500, gatherDuration: 15, activeDuration: 6, interval: 1.5, maxSites: 2, expiry: false,
    reward: { skill: 'pact_graveyard', duration: 8, maxActive: 8 },
};
export const PATCHWORK: AssemblyPact = {
    id: 'patchwork', name: 'Patchwork', stat: 'summonPact_patchwork', kind: 'assembly', color: '#ce9b91',
    required: 5, interval: [2.5, 4.5], scatter: [90, 240], pickupRadius: 22, partDuration: 25, maxParts: 10,
    reward: { skill: 'pact_construct', duration: 20, maxActive: 1 },
    parts: [
      { id: 'bone', name: 'Rib Cage', shape: 'bone', color: '#dfd0a9', mods: [mod('life', 'increased', 0.25), mod('armor', 'flat', 12)] },
      { id: 'claw', name: 'Severed Claw', shape: 'claw', color: '#c58d79', mods: [mod('attackSpeed', 'increased', 0.12)], skills: ['court_twin_cut'] },
      { id: 'heart', name: 'Still Heart', shape: 'heart', color: '#bb526e', mods: [mod('lifeRegenPct', 'flat', 0.02), mod('moveSpeed', 'increased', 0.15)] },
      { id: 'skull', name: 'Witch Skull', shape: 'skull', color: '#a9cde0', mods: [mod('castSpeed', 'increased', 0.15)], skills: ['skeletal_cold_bolt'] },
    ],
};
export const OPEN_INVITATION: EchoPact = {
    id: 'open_invitation', name: 'Open Invitation', stat: 'summonPact_open_invitation', kind: 'echo', color: '#c4abe8', cooldown: 1,
    reward: { skill: 'pact_echo', duration: 8, maxActive: 3 },
};
export const SUMMON_PACTS: SummonPactDef[] = [LAST_BREATH, BURIAL_GROUND, PATCHWORK, OPEN_INVITATION];

export const SUMMON_PACT_SUPPORT_GRANTS = [
  { stat: 'summonPact_undead_resonance', factions: ['undead'] },
];

for (const pact of SUMMON_PACTS) {
  STAT_DEFS[pact.stat] = { label: pact.name, base: 0, min: 0 };
  for (const form of pact.reward.forms ?? []) STAT_DEFS[form.stat] = { label: 'Wraith Form', base: 0, min: 0 };
}
for (const grant of SUMMON_PACT_SUPPORT_GRANTS) STAT_DEFS[grant.stat] = { label: 'Undead Resonance', base: 0, min: 0 };

const rewardSkill = (id: string, name: string, monsterId: string, color: string): SkillDef => ({
  id, name, noDrop: true, description: 'A temporary ally raised by a summon pact.',
  tags: ['spell', 'summon', 'minion', 'duration'], color, manaCost: 0, cooldown: 0, useTime: 0,
  delivery: { type: 'summon', monsterId, count: 1, maxActive: 1, duration: 8 }, effects: [],
});
export const SUMMON_PACT_SKILLS: Record<string, SkillDef> = {
  pact_wraith: rewardSkill('pact_wraith', 'Last Breath Wraith', 'court_reaper_wraith', '#b59ae6'),
  pact_graveyard: rewardSkill('pact_graveyard', 'Burial Ground Zombie', 'zombie', '#9eae78'),
  pact_construct: rewardSkill('pact_construct', 'Patchwork Construct', 'court_abomination', '#ce9b91'),
  pact_echo: rewardSkill('pact_echo', 'Open Invitation', 'zombie', '#c4abe8'),
};

/** Content validation accepts lookups to keep the registry free of import cycles. */
export function summonPactErrors(skills: Record<string, SkillDef>, monster: (id: string) => boolean): string[] {
  const errors: string[] = [], seen = new Set<string>();
  const positive = (v: number) => Number.isFinite(v) && v > 0;
  for (const p of SUMMON_PACTS) {
    const fail = (text: string) => errors.push(`summonPact ${p.id}: ${text}`);
    if (seen.has(p.id)) fail('duplicate id'); seen.add(p.id);
    if (p.stat !== `summonPact_${p.id}`) fail('grant stat must match its registered id');
    if (skills[p.reward.skill]?.delivery.type !== 'summon') fail('reward must name a summon skill');
    if (!positive(p.reward.duration) || !positive(p.reward.maxActive) || !Number.isInteger(p.reward.maxActive)) fail('reward duration and integer capacity must be positive');
    if ((p.kind === 'deathBank' || p.kind === 'graveyard') && (!Number.isInteger(p.threshold) || p.threshold < 2)) fail('death threshold must be an integer of at least two');
    for (const form of p.reward.forms ?? []) {
      if (!monster(form.monster)) fail(`unknown form ${form.monster}`);
      if (form.replaceSkills && !form.crewSkills?.length) fail('replacement form needs a skill');
      for (const id of [...(form.crewSkills ?? []), ...(form.crewAuras ?? [])]) if (!skills[id]) fail(`unknown form skill ${id}`);
      for (const id of form.crewAuras ?? []) if (skills[id]?.delivery.type !== 'aura') fail(`form aura ${id} is not an aura`);
    }
    if (p.kind === 'graveyard' && ![p.radius, p.ownerRadius, p.gatherDuration, p.activeDuration, p.interval, p.maxSites].every(positive)) fail('graveyard bounds and clocks must be positive');
    if (p.kind === 'echo' && !positive(p.cooldown)) fail('echo cooldown must be positive');
    if (p.kind === 'assembly') {
      if (!p.parts.length || ![p.required, ...p.interval, ...p.scatter, p.pickupRadius, p.partDuration, p.maxParts].every(positive)
        || p.interval[0] > p.interval[1] || p.scatter[0] > p.scatter[1]) fail('assembly requires parts, ordered ranges and positive bounds');
      for (const part of p.parts) for (const id of part.skills ?? []) if (!skills[id]) fail(`part ${part.id} names unknown art ${id}`);
    }
  }
  return errors;
}
