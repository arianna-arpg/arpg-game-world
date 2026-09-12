import type { LookDef } from '../render/vis/parts';

/** Faction identity through anatomy and clothing. Gameplay tells and equipment
 * remain on their existing entities; these surfaces are decorative. */
export const KINSHIP_LOOKS: Record<string, LookDef> = {
  depthkin_seer: {
    parts:[
      {kind:'roots',x:-0.2,scale:0.85,color:'#92b9c3',params:{n:5}},
      {kind:'fins',x:-0.25,scale:0.86,color:'#8aa9c4'},
      {kind:'blob',x:-0.17,scale:0.64,params:{irr:0.13,seed:313}},
      {kind:'gillFrill',x:-0.1,scale:0.65,color:'#bededb',params:{n:10}},
      {kind:'pressureLens',x:0.32,scale:0.85},
    ],
    shadowScale:0.9,
  },
  pit_champion: {
    parts: [
      {"kind":"torso","scale":1.05},
      {"kind":"mane","scale":0.7},
      {"kind":"chains"},
      {"kind":"hood","x":0.32,"scale":0.85},
    ],
  },
  warband_skald: {
    parts: [
      {"kind":"torso"},
      {"kind":"cape","role":"accent"},
      {"kind":"runes","color":"#d8a8e0","params":{"n":3}},
      {"kind":"hood","x":0.32,"scale":0.85},
    ],
  },
  bandit_bruiser: {
    parts: [
      {"kind":"torso"},
      {"kind":"mace"},
      {"kind":"pauldrons","role":"wood"},
      {"kind":"hood","x":0.32,"scale":0.85},
    ],
  },
  bulwark_thane: {
    parts: [
      {"kind":"torso"},
      {"kind":"mace"},
      {"kind":"pauldrons","role":"wood"},
      {"kind":"hood","x":0.32,"scale":0.85},
    ],
  },
  troll: {
    parts: [
      {"kind":"trollArms","scale":1.03},
      {"kind":"blob","scale":0.85,"params":{"irr":0.14,"seed":77}},
      {"kind":"mossPatch","x":-0.3,"scale":0.8},
      {"kind":"spikes","x":-0.4,"scale":0.58,"params":{"n":4}},
      {"kind":"mace","scale":1.1},
      {"kind":"trollHead","x":0.37,"scale":0.75},
    ],
  },
  troll_bridgewarden: {
    parts: [
      {"kind":"trollArms","scale":1.03},
      {"kind":"blob","scale":0.85,"params":{"irr":0.14,"seed":77}},
      {"kind":"mossPatch","x":-0.3,"scale":0.8},
      {"kind":"barkPlates","x":-0.22,"scale":0.7},
      {"kind":"hammer","scale":1.1},
      {"kind":"trollHead","x":0.37,"scale":0.75},
    ],
  },
  troll_cairncaller: {
    parts: [
      {"kind":"trollArms","scale":1.03},
      {"kind":"blob","scale":0.85,"params":{"irr":0.14,"seed":77}},
      {"kind":"mossPatch","x":-0.3,"scale":0.8},
      {"kind":"barkPlates","x":-0.22,"scale":0.5},
      {"kind":"warhorn","x":-0.15,"scale":1.1},
      {"kind":"crystalGrowths","x":-0.45,"color":"#93917d","scale":0.7},
      {"kind":"trollHead","x":0.37,"scale":0.75},
    ],
  },
  gnoll_trapper: {
    parts: [
      {"kind":"furRuff","color":"#82613f","scale":0.92},
      {"kind":"disc","scale":0.7},
      {"kind":"tail","color":"#907042","params":{"len":0.75,"tuft":true}},
      {"kind":"pack","x":-0.4,"scale":0.65},
      {"kind":"bow"},
      {"kind":"bandolier"},
      {"kind":"snout","x":0.18,"scale":0.8},
      {"kind":"tuftEars","x":0.2,"scale":0.75},
      {"kind":"spots","x":-0.22,"scale":0.65,"params":{"n":5,"size":0.06}},
    ],
  },
  formic_worker: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_soldier: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.85},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_forager: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
      {"kind":"egg","x":1.28,"scale":0.38,"role":"wood"},
    ],
  },
  formic_tender: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.94},
    ],
  },
  formic_alate: {
    parts: [
      {"kind":"antVeilWings","x":0.03,"scale":1.1},
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_matriarch: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":1.18},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_major: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"antHead","x":0.69,"scale":0.99},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_gluewright: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"bloatSacs","x":-0.73,"scale":0.37,"params":{"n":2}},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  formic_porter: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":0.93},
      {"kind":"egg","x":-0.58,"scale":0.38},
      {"kind":"egg","x":-0.85,"y":0.2,"scale":0.28},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  replete_foldmother: {
    parts: [
      {"kind":"antStride","scale":0.93},
      {"kind":"antTrunk","scale":1.18},
      {"kind":"gem","x":-0.8,"scale":0.34,"color":"#e8b860"},
      {"kind":"antHead","x":0.69,"scale":0.63},
      {"kind":"elbowFeelers","x":0.57,"scale":0.72},
    ],
  },
  beastkin_gorer: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"torso","scale":0.95},
      {"kind":"ramHorns","scale":1.05},
      {"kind":"warpaint","params":{"n":3}},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastkin_impaler: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"disc","scale":0.8},
      {"kind":"ramHorns","scale":0.8},
      {"kind":"quiver","x":-0.3,"scale":0.7},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
      {"kind":"bow","scale":0.88},
    ],
  },
  beastkin_ritualist: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"robe","scale":0.9},
      {"kind":"ramHorns","scale":0.9},
      {"kind":"censer","y":0.5,"scale":0.85},
      {"kind":"runes","scale":0.9,"params":{"n":3}},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastkin_flayer: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"disc","scale":0.85},
      {"kind":"ramHorns","scale":0.75},
      {"kind":"daggers","params":{"len":0.6}},
      {"kind":"bandolier"},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastlord_khan: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"torso","scale":1.05},
      {"kind":"mane","scale":1},
      {"kind":"ramHorns","scale":1.25},
      {"kind":"warhorn","x":-0.2,"scale":0.9},
      {"kind":"axe","params":{"len":0.9}},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastkin_horncaller: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"robe","scale":0.9},
      {"kind":"ramHorns","scale":1},
      {"kind":"warhorn","scale":1.25},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  howdah_archer: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"torso","scale":0.85,"role":"cloth"},
      {"kind":"bow","scale":0.95},
      {"kind":"quiver","scale":0.85},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
      {"kind":"ramHorns","x":0.1,"scale":0.65},
    ],
    shadowScale: 0.5,
  },
  beastkin_earthshaker: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"torso","scale":0.95},
      {"kind":"warpaint","alpha":0.75},
      {"kind":"horns","scale":1.05},
      {"kind":"hammer","y":0.5,"scale":0.95},
      {"kind":"runes","scale":0.7,"alpha":0.7,"params":{"n":3}},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastkin_chaser: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"disc","scale":0.85},
      {"kind":"furRuff","scale":0.9,"alpha":0.85},
      {"kind":"horns","scale":0.9},
      {"kind":"quiver","x":-0.3,"scale":0.85},
      {"kind":"trident","y":0.35,"scale":0.8,"params":{"len":0.95}},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  beastkin_warbringer: {
    parts: [
      {"kind":"clovenHooves","x":-0.65,"scale":0.8},
      {"kind":"furRuff","x":-0.1,"scale":0.72},
      {"kind":"torso","scale":1.05},
      {"kind":"furRuff","scale":1,"alpha":0.9},
      {"kind":"horns","scale":1.25},
      {"kind":"warpaint","alpha":0.8},
      {"kind":"hammer","y":0.55,"scale":1.05},
      {"kind":"warhorn","x":-0.35,"y":-0.4,"scale":0.7},
      {"kind":"caprineFace","x":0.39,"scale":0.7},
    ],
  },
  vermin_piper: {
    parts: [
      {"kind":"nakedRatTail","x":-0.2,"scale":0.85},
      {"kind":"robe","role":"dark"},
      {"kind":"warhorn","scale":0.85},
      {"kind":"ratFace","x":0.38,"scale":0.8},
    ],
  },
  verminkin: {
    parts: [
      {"kind":"nakedRatTail","x":-0.2,"scale":0.85},
      {"kind":"armorPlates","x":-0.12,"scale":0.55},
      {"kind":"pack","x":-0.25,"y":0.3,"scale":0.5},
      {"kind":"torso","scale":0.8},
      {"kind":"daggers","params":{"len":0.45}},
      {"kind":"ratFace","x":0.38,"scale":0.8},
    ],
  },
  broodpriest: {
    parts: [
      {"kind":"nakedRatTail","x":-0.2,"scale":0.85},
      {"kind":"bloatSacs","x":-0.33,"scale":0.48,"params":{"n":2}},
      {"kind":"robe","scale":0.9,"role":"dark"},
      {"kind":"staff","y":-0.08,"params":{"skullTip":true}},
      {"kind":"ratFace","x":0.38,"scale":0.8},
    ],
  },
  rat_king: {
    parts: [
      {"kind":"nakedRatTail","x":-0.2,"scale":0.85},
      {"kind":"chains","scale":0.68},
      {"kind":"armorPlates","scale":0.65},
      {"kind":"furRuff","scale":1.05},
      {"kind":"torso","scale":0.9},
      {"kind":"crown","x":0.28,"scale":0.7,"role":"glow"},
      {"kind":"ratFace","x":0.38,"scale":0.8},
    ],
  },
  vermin_rat: {
    parts: [
      {"kind":"nakedRatTail","scale":0.85},
      {"kind":"disc","x":-0.21,"scale":0.69},
      {"kind":"ratFace","x":0.35,"scale":0.78},
    ],
  },
  vermin_fester_rat: {
    parts: [
      {"kind":"nakedRatTail","scale":0.85},
      {"kind":"disc","x":-0.21,"scale":0.72},
      {"kind":"bloatSacs","x":-0.35,"scale":0.42,"params":{"n":2}},
      {"kind":"ratFace","x":0.35,"scale":0.78},
    ],
  },
};
