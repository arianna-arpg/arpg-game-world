import type { StatusBodyCue } from '../engine/status';
import type { PartSpec } from '../render/vis/parts';
import { ICON_SUBJECTS, type IconSubject } from '../render/skillIconArt';

// The same original 24-unit linework can be worn on a body or read on the HUD.
// Anatomy, terrain residue and posture still use the ordinary body-part kit.
const marks = {
  sealedRune: 'M12 2L20 11L12 20L4 11ZM3 10H21M3 14H21',
  snappedBlade: 'M3 22L8 17M4 14L11 21M7 17L10 10L14 12L12 16ZM13 8L18 2L22 1L20 7L16 10Z',
  shutEye: 'M2 9Q12 20 22 9M5 12L3 16M10 14L9 18M15 14L16 18M20 12L22 16',
  shootingStars: 'M8 2L9.5 7L14 8.5L9.5 10L8 15L6.5 10L2 8.5L6.5 7ZM18 12L19 15L22 16L19 17L18 21L17 17L14 16L17 15Z',
  crookedDie: 'M4 6L16 2L22 7L18 20L7 22L2 16ZM4 6L10 10L22 7M10 10L7 22M7 5L9 6M12 14L13 14M16 17L17 17',
  forkedSteps: 'M12 21V13L5 6M5 11V5H11M12 13L19 6M13 5H20V12',
  reversed: 'M21 6H10Q3 6 3 13Q3 19 9 19H19M15 15L20 19L15 23M14 2L9 6L14 10',
  stagger: 'M4 4L9 2L7 8L12 10L9 16L5 14ZM16 12L20 13L19 19L15 21L13 18Z',
  salt: 'M3 13L6 8L10 12L8 17ZM12 8L15 3L19 7L16 12ZM14 18L19 13L22 18L18 22Z',
  wet: 'M6 3Q1 11 3 14Q6 18 9 14Q11 12 6 3ZM16 9Q10 17 13 20Q16 23 19 20Q21 16 16 9Z',
  ripples: 'M2 8Q6 4 11 8Q16 12 22 7M3 13Q7 10 12 14Q16 17 21 13M6 19Q10 17 14 20',
  mud: 'M2 16Q2 11 6 12L8 6Q10 3 12 7L13 12Q16 8 18 10L19 14Q23 13 22 18Q17 22 12 19Q6 22 2 18Z',
  sealedMend: 'M9 3H15V9H21V15H15V21H9V15H3V9H9ZM3 21L21 3',
  openSeam: 'M3 3L8 7L6 10L11 13L8 17L11 21M21 3L15 7L17 11L13 13L16 16L14 21',
  wilt: 'M12 22Q14 10 8 7Q4 7 3 11Q2 4 8 3Q13 2 16 9Q19 7 22 9Q20 15 15 14',
  halfEye: 'M2 14Q11 5 22 13Q12 19 2 14ZM10 11Q9 16 14 14M5 7L7 9M16 8L18 5',
  heat: 'M4 21Q9 16 5 12Q2 8 6 3M12 20Q16 15 13 12Q10 8 14 4M19 21Q23 16 20 13',
  splitThread: 'M3 4Q5 12 11 10L13 13M4 20Q4 13 10 14M15 11L17 8L21 7M15 15L18 18L22 17',
  tiedCharge: 'M3 10L7 7L14 18L10 21ZM8 7L12 5L19 16L15 18ZM6 15L16 9M13 5Q14 1 18 4L21 2',
  sweptHeel: 'M2 18H9M4 21H13M12 3L16 2L18 11L22 14L20 18L11 14L13 10Z',
};
type Subject = IconSubject | keyof typeof marks;
function linework(key: Subject): string {
  if (Object.hasOwn(marks, key)) return marks[key as keyof typeof marks];
  return ICON_SUBJECTS[key as IconSubject].map(layer => layer.path).join(' ');
}

export interface DebuffLook {
  glyph: string;
  description: string;
  body?: StatusBodyCue;
}
const native = (symbol: Subject, description: string): DebuffLook => ({ glyph: linework(symbol), description });
const worn = (symbol: Subject, description: string, body: StatusBodyCue): DebuffLook =>
  ({ ...native(symbol, description), body });
function ink(symbol: Subject, color: string, x = 0, y = 0, scale = .85): PartSpec {
  return { kind: 'statusInk', color, x, y, scale, params: { path: linework(symbol) } };
}
function seal(symbol: Subject, description: string, color: string, lean = 0): DebuffLook {
  return worn(symbol, description, { crownSlot: true, upright: true, lean, parts: [ink(symbol, color)] });
}
function surface(symbol: Subject, description: string, ...parts: PartSpec[]): DebuffLook {
  return worn(symbol, description, { upright: true, parts });
}
function skin(symbol: Subject, description: string, color: string, alpha: number, ...parts: PartSpec[]): DebuffLook {
  return worn(symbol, description, { coating: { color, alpha }, parts });
}
function charge(symbol: Subject, description: string, color: string, part: PartSpec): DebuffLook {
  return worn(symbol, description, { upright: true, parts: [part], durationPart:
    { kind: 'wickTaper', color, x: (part.x ?? 0) + .10, y: (part.y ?? 0) - .20,
      rot: -.98, scale: .72, params: { h: .94 } } });
}
const stonePlates: PartSpec = {kind:'armorPlates',color:'#a69c89',scale:.65,params:{n:2}};
const fullStone: StatusBodyCue = { group:'stone-plates',layer:2,coating:{color:'#a7a398',alpha:.65},
  parts:[{...stonePlates,scale:1.07,params:{n:4}},ink('openSeam','#4c4946',.12,0,.83)] };

/** Native status ids are bound here. Explicit per-status and per-application
 * body art still wins. A native row identifies an existing mechanic-owned read. */
export const DEBUFF_LOOKS: Partial<Record<string, DebuffLook>> = {
  // Control and exposure. Roots hold the feet, whereas a torn net only drags.
  silence: seal('sealedRune','Sealed casting rune','#e8ddff'),
  disarm: surface('snappedBlade','Broken blade beside the striking hand',ink('snappedBlade','#ffe1a0',.78,-.28,1.02)),
  rooted: surface('roots','Forked roots pinning both feet',{kind:'roots',color:'#af985e',rot:-Math.PI/2,y:.16,scale:.94}),
  stun: worn('shootingStars','Stars circling the head',{upright:true,parts:[{...ink('shootingStars','#fff0ac',0,-.86),params:{path:linework('shootingStars'),orbit:.55}}]}),
  unhorsed: worn('horse','Tumbled saddle and bent posture',{lean:.46,parts:[{kind:'saddlebags',scale:.7,rot:1.1,y:.43}]}),
  blind: surface('shutEye','Dark band and sealed eyelid across the face',ink('shutEye','#cfc7de',0,-.19,1.25)),
  stasis: seal('hourglass','Suspended hourglass','#c0f5ff'),
  temporal_drag: surface('clock','Trailing clock hands',ink('clock','#9fc9e0',-.72,.27,.93)),
  petrifying: worn('rock','Stone plates spreading over the skin',{group:'stone-plates',layer:1,coating:{color:'#a59c8b',alpha:.2},parts:[stonePlates],
    stackStage:{at:3,cue:{coating:{color:'#a59c8b',alpha:.39},parts:[{...stonePlates,scale:.85,params:{n:3}}]}}}),
  petrified: worn('golem','Solid stone plates and a deep fracture',fullStone),
  exposed: native('target','Anatomical seam and weak-point life band'),
  swallowed: native('maw','Victim concealed inside the captor'),
  seized: surface('fist','Paired grip cuffs at the flanks',{kind:'chains',color:'#e5b581',scale:1.16}),
  entranced: seal('orb','Still pearl above a bowed head','#dbccfa',.29),
  transfixed: surface('lantern','A glimmer held before the eyes',ink('star','#def889',.62,-.58,.76)),
  harrowing: native('nerve','Stack-driven quiver strokes above the crown'),
  horrified: native('banshee','Panic tracks scatter outward from the bearer'),
  bolted: native('paw','Panic tracks scatter outward from the bearer'),

  // Payload identity persists for the whole status. Wick length follows its
  // known status clock; a legacy snapshot with no clock wears just the charge.
  living_bomb: charge('bomb','Glowing coal with a shortening wick','#ffc984',
    {kind:'statusInk',color:'#ffc273',x:-.63,y:-.23,scale:1,
      params:{path:'M3 12L7 5L17 4L22 12L18 20L7 21ZM7 5L12 12L8 17M12 12L20 10',fill:'#a33822'}}),
  doombrand: charge('rune','Branded rune with a shortening violet wick','#db9bf0',ink('rune','#ed94ef',.04,-.53,.92)),
  powder_charge: charge('tiedCharge','Bound powder sticks with a shortening wick','#f5c276',ink('tiedCharge','#e4aa68',.55,.25,1.05)),
  fulgur_brand: surface('web','Forked conductive web across the back',ink('web','#ffe483',0,0,1.44),{kind:'currentArcs',color:'#ffcd70',scale:.75}),
  death_warrant: seal('ledger','Sealed warrant above the shoulder','#ffa1ad'),
  rattled_bones: surface('splinter','Short ivory splinters lodged in the hide',{kind:'lodgedSpikes',color:'#d5c49e',params:{n:4,length:.59,width:.11,root:.57}}),
  sundered: surface('brokenShield','Split bronze guard plates',ink('brokenShield','#f4bc78',.35,.23,1.05)),
  vulnerable: surface('openSeam','An open pink seam across the torso',ink('openSeam','#efabc1',0,0,1.3)),
  weaken: worn('blade','Drooping blade at the flank',{lean:.24,parts:[ink('blade','#cf9de7',.38,.8,.9)]}),
  brittle: skin('fault','Fine cracks across pale wax','#b9e2ec',.16,ink('fault','#f1f6ef',0,0,1.42)),
  melting: surface('candle','Hanging wax drips',ink('wet','#edc886',.37,.53,.89),ink('wet','#ffdb9a',-.43,.32,.62)),
  waxlight: surface('candle','Upright candlelight at the shoulder',ink('candle','#ffe9a1',.65,-.68,.88)),
  sear: surface('sealedMend','Cauterized cross on the wound',ink('sealedMend','#ffae82',-.28,.28,1.07)),

  // Head and hand curses. Posture, position and the linework distinguish
  // blocked, misdirected and interrupted actions even on a grey background.
  jinxed: seal('crookedDie','A tilted die above the head','#d9bdf5'),
  maddened: seal('masks','Paired opposing faces','#f498b2'),
  reeling: seal('stagger','Staggered footprints and a dipping pose','#d1c3ea',.22),
  voided: surface('void','A split void in the shield-side flank',ink('void','#c0a1ee',-.72,-.12,1)),
  taunted: seal('horn','Challenge horn','#f5aa70'),
  prey_marked: surface('paw','Scent print stamped on the hide',ink('paw','#efc175',0,.1,1.17)),
  despair: seal('eclipse','Eclipsed ward above the bearer','#c7a3ee'),
  agony: surface('brokenArmor','Riven armor over the ribs',ink('brokenArmor','#eca6a0',0,.2,1.24)),
  indecision: seal('forkedSteps','A path forking both ways','#b0cde7'),
  befuddlement: seal('brokenNote','Interrupted casting note','#edb1d9'),
  bewilder: surface('target','Displaced sight over the aiming shoulder',ink('target','#ddc1fa',.94,-.44,.93)),
  disoriented: worn('spiral','Turning spiral eyes',{parts:[{kind:'spiralEyes',color:'#a8e9dc',params:{size:.24}}]}),
  widdershins: seal('reversed','Backward-turning arrow','#8eebcf'),
  addled: surface('cards','Misdealt cards at the casting hand',ink('cards','#f9d088',.69,.22,1.02)),
  harried: surface('fly','Clinging swarm around the shoulders',{kind:'carrionFlies',color:'#b0bc6c',params:{n:3}}),
  beheld: seal('halfEye','Half-open watching eye','#e9c779'),
  seen: seal('eye','Wide open watching eye','#ffe293'),
  sunscorched: surface('sun','Small sun above the heated shoulder',ink('sun','#ffcd74',-.54,-.65,.84)),
  heatstroke: worn('heat','Heat ribbons rising off a slumped body',{upright:true,lean:.34,parts:[ink('heat','#faa266',0,-.5,1.25)]}),
  faintness: seal('feather','Drifting feather and a slight stoop','#e6cfda',.12),
  swoon: seal('sweptHeel','Collapsing step and a deep stoop','#ecdeea',.58),
  queasy: surface('guts','Knotted gut at the belly',ink('guts','#cbd480',0,.28,1.04)),
  retching: worn('bile','A heaving pose and a puff of bile',{lean:.59,parts:[{kind:'breathPuff',x:.68,color:'#c3d478',params:{period:1.1,duty:.85}},ink('bile','#d4db82',.83,.1,.65)]}),
  winded_gasp: worn('lungs','Bent posture with a long breath plume',{lean:.51,parts:[{kind:'breathPuff',x:.52,color:'#d4e9db',params:{period:1.25,duty:.85}}]}),
  guttered: surface('ash','Spent wick with a fading ember',{kind:'wickTaper',color:'#a58c72',rot:-1.5,x:.4,params:{fill:.16}}),
  sap_starved: seal('wilt','Wilting leaf over a bowed stalk','#d8b879',.22),
  wilted: worn('leaf','Shrivelled leaves hanging from a collapsed body',{lean:.52,parts:[ink('wilt','#ccb38d',-.35,.2,1.25),ink('wilt','#a99967',.45,.1,.73)]}),
  blooming: surface('flower','Opening bud on the shoulder',{kind:'capDome',color:'#b3d78d',scale:.44,x:.55,y:-.62},ink('flower','#d7eaa8',.55,-.62,.75)),

  // Terrain and lingering material. Surface cues follow the bearer after it
  // leaves the field; a wet or salt-coated body need not be burning or frozen.
  fogveiled: surface('cloud','Pale wisps of fog across the shoulders',{kind:'soulGauze',color:'#b6c9d0',scale:.93,alpha:.59}),
  mistfed: surface('wisp','Inward wisps at the breast',{kind:'wisps',color:'#a4d6af',scale:.66,params:{n:3}}),
  canopied: surface('leaf','Overlapping leaves shade the brow',ink('leaf','#9bbf83',-.43,-.38,.84),ink('leaf','#78aa79',.32,-.49,.73)),
  smothered: surface('cloud','Low cloud across the eyes',ink('cloud','#b9c3ce',0,-.32,1.32)),
  gloomveiled: skin('shroud','A dark gauze veil','#51465c',.24,{kind:'soulGauze',color:'#a9a0bc',alpha:.69}),
  starfire: surface('comet','A white-hot streak shedding embers',ink('comet','#ffe2a3',-.1,-.2,1.03),{kind:'emberSparks',color:'#ffe8ac',params:{n:3}}),
  stonelashed: surface('rubble','Chips of stone lodged in the hide',ink('rubble','#ccbda1',-.18,.24,1.23)),
  sporemired: surface('mushroom','Spore bulbs and dust around the feet',{kind:'bloatSacs',color:'#b6a9ce',y:.51,scale:.76},{kind:'puffMotes',color:'#d4bddf',y:.48,params:{n:3}}),
  unravelling: surface('splitThread','Loose threads breaking out of the torso',ink('splitThread','#b3eb85',0,0,1.52)),
  unmade: skin('ghost','A pale body with fragments pulling away','#c4f5d2',.24,{kind:'floatingShards',color:'#b7f8cc',params:{n:3}}),
  torment: worn('hook','Sagging hooks and chains at the feet',{parts:[{kind:'chains',color:'#b697d1',rot:1.4},ink('hook','#c39ade',-.6,.55,.73)]}),
  contagion: surface('plague','Raised pustules with drifting spores',{kind:'bloatSacs',color:'#b6c881',params:{n:5}},{kind:'puffMotes',color:'#c1d880',params:{n:3}}),
  mired: surface('mud','Clotted mud around the feet',ink('mud','#ae8f64',-.36,.6,.94),ink('mud','#bb9968',.46,.55,.66)),
  bogged: surface('vine','Trailing weeds and mud on the heels',ink('vine','#a6b477',-.45,.55,.96),ink('mud','#99a06a',.39,.56,.81)),
  sodden: surface('wet','Heavy wet clumps dripping from the feet',ink('mud','#8a996e',0,.55,1.19),ink('wet','#a2d1cb',.46,.72,.65)),
  soaked: skin('wet','Wet sheen and beads of water','#8fc8d5',.16,ink('wet','#dcf6ff',.35,.25,.97)),
  wading: surface('ripples','Shallow ripples at the ankles',ink('ripples','#8ac8e7',0,.74,1.29)),
  swimming: surface('wave','Foam cresting across the body',ink('ripples','#c1e9ef',0,.15,1.55),ink('wave','#80c8dd',-.65,.49,.66)),
  crestborne: surface('wave','Crest curling beneath the heels',ink('wave','#f4b4ad',-.35,.62,1.07)),
  seabed: surface('shell','Shell and silt clinging low',ink('shell','#95c3ca',.37,.57,.91),{kind:'puffMotes',color:'#c1bba0',y:.68,scale:.7,params:{n:2}}),
  slippery: surface('sweptHeel','Skidding heel with two slide marks',ink('sweptHeel','#b9e9ff',-.44,.58,1.02)),
  brine_burn: surface('salt','Angular salt grains crusted onto the hide',ink('salt','#dcf2db',-.32,.32,1.16)),
  sulphur_sting: surface('steam','Sulphurous fumes off a yellow crust',ink('salt','#d7ca63',.42,.3,.8),{kind:'puffMotes',color:'#ede186',scale:1.12,params:{n:4}}),
  bog_rot: skin('mushroom','Mottled bog rot and a fungal cap','#868a58',.17,{kind:'caps',color:'#a6ac79',scale:.68}),
  scalded: surface('kettle','Blister in addition to bank-scaled steam',{kind:'bloatSacs',color:'#eba985',x:.47,y:.3,scale:.68,params:{n:2}}),
  lamprey_flop: worn('leech','Curled flopping mark at the tail',{lean:.4,parts:[ink('leech','#dbb3bc',-.66,.16,.98)]}),
  ensnared: surface('web','Netting snagged across the feet',{kind:'net',x:.35,y:.20,scale:1.55}),
  caulmired: surface('membrane','Clinging folds of membrane',ink('membrane','#b59aac',-.21,.58,1.08)),
  blightmired: surface('thorns','Thorny blight snagging the ankles',ink('thorns','#b0c884',.1,.59,1.22)),
  soulchill: skin('wisp','Pale soul-wisps flowing along the limbs','#aaccda',.19,{kind:'wisps',color:'#c7f2fc',scale:.81,params:{n:2}}),
  soul_frost: surface('icicle','Suspended blue slivers',{kind:'floatingShards',color:'#a3dcf4',params:{n:3,orbit:.77}}),

  // Established native reads and shared materials from the first pass.
  burn: native('flame','Flames on the body'), soul_burn: native('wisp','Flames on the body'),
  scorch: native('ember','Flames on the body'), flamewreathed: native('pyre','Flames on the body'),
  shock: native('lightning','Contact prong and forked sparks'), soul_shock: native('lightning','Contact prong and forked sparks'),
  poison: native('venom','Rising green bubbles'), soul_venom: native('venom','Rising green bubbles'),
  bleed: native('blood','Cut and falling drop'), hemorrhage: native('wound','Cut and falling drop'),
  decay: native('nerve','Branching violet veins'), wither_agony: native('nerve','Branching violet veins'),
  chill: native('snowflake','Pale-blue coat and rime'), frozen: native('ice','Faceted ice shell'),
  doom: native('skull','Purple skull plus armed iris, fuse and radius'),
  ignite_attractor: native('runes','Orbiting Pyreheart runes'),
  winded: native('lungs','Bent posture and breath'),
  infected_miasma: surface('cloud','Pale spore vents leaking green fumes',ink('cloud','#bad771',-.52,.24,.83)),
  infected_adrenal: surface('bladder','Frothing adrenal sacs at the flank',{kind:'bloatSacs',color:'#f2966a',x:.6,scale:.69}),
  infected_mutant: surface('tentacle','Twisted tendril growing from the shoulder',ink('tentacle','#db9fef',.55,-.51,1.05)),
  ...Object.fromEntries(['impaled','impaled_physical','impaled_fire','impaled_cold','impaled_lightning','impaled_chaos']
    .map(id => [id,native('spear','Lodged metal spikes')])),
};

// Group multiple sources of the same material without merging unrelated
// ailments. All defaults are assigned once, not in the render loop.
for (const [id, look] of Object.entries(DEBUFF_LOOKS)) {
  if (look?.body) look.body.group ??= id;
}
