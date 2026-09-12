import type { LookDef } from '../render/vis/parts';

/** The Rootwild is plant anatomy in motion: no clothes, faces or weapons. */
export const ROOTWILD_LOOKS: Record<string, LookDef> = {
  rootwild_thornfan: {
    parts:[{kind:'rootStriders',scale:0.6},{kind:'spearLeaves',x:-0.35,scale:0.65},{kind:'burrHusk',x:-0.25,scale:0.5},{kind:'thornSprays',x:0.15,scale:0.8}],
  },
  rootwild_nectar_bell: {
    parts:[{kind:'rootStriders',scale:0.65},{kind:'spearLeaves',x:-0.45,scale:0.75},{kind:'nectarBells',x:0.12,scale:0.94}],
  },
  rootwild_brambleback: {
    parts:[{kind:'rootStriders',scale:1.05},{kind:'burrHusk',x:-0.3,scale:0.85},{kind:'hookCreepers',x:-0.3,scale:0.5},{kind:'sepalRampart',x:0.1,scale:0.94}],
    shadowScale:1.12,
  },
  rootwild_windseed: {
    parts:[{kind:'samaraWings',scale:0.94},{kind:'spearLeaves',x:0.2,scale:0.2}],
    shadowScale:0.55,
  },
  rootwild_hookvine: {
    parts:[{kind:'rootStriders',x:-0.25,scale:0.65},{kind:'spearLeaves',x:-0.52,scale:0.66},{kind:'hookCreepers',scale:0.94},{kind:'trapLobes',x:0.2,scale:0.48}],
  },
  rootwild_rhizarch: {
    parts:[
      {kind:'rootStriders',scale:1.18},{kind:'hookCreepers',x:-0.2,scale:1.02},
      {kind:'spearLeaves',x:-0.2,scale:1.17},{kind:'barkPlates',scale:0.92},
      {kind:'splitSeedcase',scale:0.92},
      {kind:'nectarBells',x:-0.7,scale:0.6,rot:Math.PI},
      {kind:'thornSprays',x:0.37,y:-0.71,scale:0.52,rot:-0.4},
      {kind:'thornSprays',x:0.37,y:0.71,scale:0.52,rot:0.4},
    ],shadowScale:1.3,
  },
  rootwild_burrling: {
    parts:[
      {kind:'rootStriders',scale:0.72},
      {kind:'spearLeaves',x:-0.35,scale:0.42},
      {kind:'burrHusk',scale:0.86},
    ],
  },
  rootwild_hingejaw: {
    parts:[
      {kind:'rootStriders',x:-0.15,scale:0.8},
      {kind:'spearLeaves',x:-0.47,scale:0.7},
      {kind:'trapLobes',x:0.18,scale:0.9},
    ],
  },
  rootwild_pitcher: {
    parts:[
      {kind:'rootStriders',scale:0.65},
      {kind:'spearLeaves',x:-0.5,scale:0.7},
      {kind:'pitcherCup',scale:1.04},
    ],
    live:[{kind:'sporeVents',x:0.5,scale:0.3,color:'#d4df98',params:{n:2}}],
  },
  rootwild_sundew: {
    parts:[
      {kind:'rootStriders',scale:0.55},
      {kind:'spearLeaves',scale:0.66},
      {kind:'dewCroziers',scale:0.97},
      {kind:'disc',scale:0.27,color:'#934c61'},
      {kind:'polyps',scale:0.3,color:'#e1b38c',params:{n:4}},
    ],
  },
  rootwild_coppice: {
    parts:[
      {kind:'rootStriders',scale:1.08},
      {kind:'spearLeaves',x:-0.2,scale:1.03},
      {kind:'barkPlates',scale:0.87},
      {kind:'splitSeedcase',scale:1.08},
      {kind:'burrHusk',x:-0.55,y:-0.66,scale:0.24},
      {kind:'burrHusk',x:-0.55,y:0.66,scale:0.24},
    ],
    shadowScale:1.2,
  },
};
