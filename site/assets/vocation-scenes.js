/* A deliberately small, authored preview of the game's Vocation registry.
   Stable IDs match src/data/vocations.ts; account keys match vocationUnlockKey. */
export const VOCATION_SCENES = Object.freeze([
  { id:'warbringer', name:'Warbringer', style:'Break / Bank / Release', title:'Break their guard. Choose your answer.', description:'Turn fallen foes and broken defenses into Breach, then release a Sundering wave, brace behind a bulwark, or drive straight through the line.', alt:'An armored commander drives through broken shields with a copper-lit shockwave' },
  { id:'gravebinder', name:'Gravebinder', style:'Souls / Assembly / Dominion', title:'Nothing ends unused.', description:'Bind departing souls into Wraiths, assemble chosen remains into a temporary ally, and turn the ground where your army falls into a source of new dead.', alt:'A Gravebinder walks beside an assembled skeletal guardian as pale souls gather in burial mist' },
  { id:'wildstalker', name:'Wildstalker', style:'Motion / Projectiles / Bleeding', title:'Keep moving. Leave wounds behind.', description:'Loose extra projectiles, deepen bleeding wounds, and press the hunt with swift movement and punishing follow-up shots.', alt:'A mobile woodland hunter follows a paired arrow flight through rain and moonlight' },
  { id:'spellblade', name:'Spellblade', style:'Steel / Sorcery / Rhythm', title:'Let steel answer sorcery.', description:'Alternate attacks and spells to build speed, then sustain a varied sequence for stronger offense and a more resilient guard.', alt:'A Spellblade completes a sword stroke as violet-white spellwork traces the same arc' },
  { id:'hierophant', name:'Hierophant', style:'Guard / Recovery / Reprisal', title:'Hold fast. Let faith answer.', description:'Turn blocks into retaliatory bursts, strengthen healing, and share in the rites that sustain your followers.', alt:'A Hierophant shelters weary allies behind a shield as a pale-gold ring travels across cathedral steps' },
  { id:'greenwarden', name:'Greenwarden', secret:true, style:'Grow / Harvest / Relocate', title:'Carry a forest into the fight.', description:'Grow a living grove, harvest it for rooting bursts or recovery, or move the saplings forward to shelter the next engagement.', alt:'A woodland keeper advances with living saplings lifting their roots from a ruined causeway' }
].map(scene => Object.freeze({
  ...scene,
  // Eligibility follows VocationDef.classId/offeredClasses, never name matching.
  classIds:Object.freeze({warbringer:['warrior'],gravebinder:['necromancer','summoner'],wildstalker:['ranger'],spellblade:['magician'],hierophant:['cleric'],greenwarden:['ranger']}[scene.id]),
  src:'assets/art/vocations/'+scene.id+'.webp'+(scene.id==='gravebinder'?'':'?v=2'),
  artworkByClass:scene.id==='gravebinder'?Object.freeze({summoner:Object.freeze({src:'assets/art/vocations/gravebinder-summoner.webp',alt:'The Summoner, now a Gravebinder, walks beside an assembled skeletal guardian as pale souls gather in burial mist'})}):undefined,
  unlockKey:'vocation_unlocked_'+scene.id
})));

// A future account adapter can supply verified unlocked IDs. This presentation
// filter is not authorization: a server must own any genuinely restricted data.
export function visibleVocations(entries, { classId=null, unlockedVocationIds=null, revealSecrets=false }={}) {
  const unlocked=unlockedVocationIds===null?null:new Set(unlockedVocationIds);
  return entries.filter(entry => entry.classIds.includes(classId) && (unlocked ? unlocked.has(entry.id) : !entry.secret || revealSecrets))
    .map(entry => ({...entry,...entry.artworkByClass?.[classId]}));
}
