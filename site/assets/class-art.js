/* Original class key art. Paths are relative to the landing page, including on Pages. */
export const CLASS_ART = Object.freeze({
  apothecary: {"src":"assets/art/classes/apothecary.webp","alt":"An Apothecary releases venom and luminous spores from field alchemy","position":"65% 0%"},
  ascetic: {"src":"assets/art/classes/ascetic.webp","alt":"An Ascetic parts the rain with a measured open-palm strike","position":"65% 0%"},
  assassin: {"src":"assets/art/classes/assassin.webp?v=3","alt":"An Assassin emerges from shadow with twin daggers","position":"87% 0%"},
  beguiler: {"src":"assets/art/classes/beguiler.webp","alt":"A Beguiler slips between two spectral doubles","position":"65% 0%"},
  berserker: {"src":"assets/art/berserker.webp","alt":"Berserker charging into battle with two axes"},
  blademaster: {"src":"assets/art/classes/blademaster.webp","alt":"A Blademaster completes a precise draw-cut in the rain","position":"65% 0%"},
  brawler: {"src":"assets/art/classes/brawler.webp","alt":"A Brawler winds an iron chain around a bare-knuckle strike","position":"65% 0%"},
  breaker: {"src":"assets/art/classes/breaker.webp","alt":"A Breaker brings a great maul down through fractured stone","position":"65% 0%"},
  chronomancer: {"src":"assets/art/classes/chronomancer.webp","alt":"A Chronomancer holds rain and flying fragments motionless","position":"65% 0%"},
  cleric: {"src":"assets/art/classes/cleric.webp","alt":"A Cleric spreads golden healing light through a ruined chapel","position":"72% 0%"},
  cryomancer: {"src":"assets/art/classes/cryomancer.webp?v=2","alt":"A Cryomancer sends piercing frost across a freezing stone terrace","position":"87% 0%"},
  falconer: {"src":"assets/art/classes/falconer.webp","alt":"A Falconer releases a hunting falcon into the storm","position":"74% 0%"},
  firebrand: {"src":"assets/art/classes/firebrand.webp?v=2","alt":"A Firebrand rallies a distant crowd with voice and war horn","position":"65% 0%"},
  flagellant: {"src":"assets/art/classes/flagellant.webp","alt":"A Flagellant channels a crimson covenant through battered armor","position":"65% 0%"},
  guardian: {"src":"assets/art/classes/guardian.webp","alt":"A Guardian holds a tower shield beneath a pale protective ward","position":"65% 0%"},
  hivecaller: {"src":"assets/art/classes/hivecaller.webp","alt":"A Hivecaller directs a ribbon of biting motes from a living hive","position":"65% 0%"},
  juggernaut: {"src":"assets/art/classes/juggernaut.webp","alt":"A Juggernaut drives an armored fist into cracking stone","position":"65% 0%"},
  lancer: {"src":"assets/art/classes/lancer.webp?v=3","alt":"A Lancer recalls a harvest of spears through the battlefield","position":"65% 0%"},
  magician: {"src":"assets/art/classes/magician.webp","alt":"A Magician shapes fire, frost and lightning inside a ruined observatory","position":"65% 0%"},
  matador: {"src":"assets/art/classes/matador.webp","alt":"A Matador turns a charging beast with a crimson cape","position":"65% 0%"},
  necromancer: {"src":"assets/art/classes/necromancer.webp?v=3","alt":"A raven-haired Necromancer commands skeletal retainers on rain-wet mausoleum steps","position":"65% 0%"},
  pyromancer: {"src":"assets/art/classes/pyromancer.webp?v=2","alt":"A copper-haired Pyromancer gathers flame between her hands in a rain-wet courtyard","position":"87% 0%"},
  ranger: {"src":"assets/art/classes/ranger.webp","alt":"A hooded Ranger draws a longbow on a rain-soaked woodland bridge","position":"65% 0%"},
  resonator: {"src":"assets/art/classes/resonator.webp","alt":"A Resonator sends silver-blue pressure rings from a forked staff","position":"65% 0%"},
  rogue: {"src":"assets/art/classes/rogue.webp","alt":"A hooded Rogue steps silently from shadow with a curved dagger","position":"65% 0%"},
  runeweaver: {"src":"assets/art/classes/runeweaver.webp","alt":"A Runeweaver assembles a luminous lattice of spell sigils","position":"65% 0%"},
  sentinel: {"src":"assets/art/classes/sentinel.webp","alt":"A spiked Sentinel braces for a punishing counterstrike","position":"65% 0%"},
  sharper: {"src":"assets/art/classes/sharper.webp","alt":"A Sharper throws a fan of razor-edged cards through the mist","position":"65% 0%"},
  skald: {"src":"assets/art/classes/skald.webp","alt":"A Skald sends a war-song rippling through the rain","position":"65% 0%"},
  sorcerer: {"src":"assets/art/classes/sorcerer.webp","alt":"A storm Sorcerer gathers lightning above her open palm on a ruined fortress terrace","position":"65% 0%"},
  spellblade: {"src":"assets/art/classes/spellblade.webp?v=3","alt":"A Spellblade holds a lightning-charged sword upright while conjuring flame","position":"87% 0%"},
  summoner: {"src":"assets/art/classes/summoner.webp","alt":"A Summoner binds a single twilight familiar on ruined steps","position":"87% 0%"},
  swashbuckler: {"src":"assets/art/classes/swashbuckler.webp?v=2","alt":"A Swashbuckler lunges with saber and buckler across a wet harbor","position":"87% 0%"},
  tamer: {"src":"assets/art/classes/tamer.webp","alt":"A Tamer stands beside a bonded grey wolf in a misty forest","position":"87% 0%"},
  trapper: {"src":"assets/art/classes/trapper.webp","alt":"A Trapper arms a compact ballista beside concealed snares","position":"65% 0%"},
  vanguard: {"src":"assets/art/classes/vanguard.webp","alt":"A Vanguard charges behind a moving wall of force","position":"65% 0%"},
  wallwright: {"src":"assets/art/classes/wallwright.webp","alt":"A Wallwright raises a stone rampart beneath a demolition hammer","position":"65% 0%"},
  warlord: {"src":"assets/art/classes/warlord.webp","alt":"A Warlord plants a battle standard and names the next target","position":"65% 0%"},
  warrior: {"src":"assets/art/classes/warrior.webp","alt":"An armored Warrior raises a shield and cleaves through the rain","position":"65% 0%"}
});

const fallback = Object.freeze({
  src: 'assets/art/hand.webp',
  alt: 'A spectral hand cradles a curling flame of pale light',
  position: '50% 50%'
});

// An unpainted future class keeps the spectral flame until its art is authored.
export function getClassArtwork(id) {
  return Object.hasOwn(CLASS_ART, id) ? CLASS_ART[id] : fallback;
}
