import type { GlyphDef, GlyphOp } from '../render/vis/parts';

/** Botanic bodies, all facing +X. Leaf veins, jaw cilia and wet throats
 * remain legible on the small baked body; the same parts work in the Forge. */
export const ROOTWILD_GLYPHS: Record<string, GlyphDef> = {
  thornSprays: { ops: [
    ...[-1,0,1].flatMap((i):GlyphOp[]=>[
      {kind:'poly',pts:[[-0.38,i*0.16],[0.25,i*0.5-0.18],[1.12-Math.abs(i)*0.12,i*0.85],[0.2,i*0.5+0.18]],role:'base',outline:true},
      {kind:'path',pts:[[-0.2,i*0.1],[0.98-Math.abs(i)*0.12,i*0.74]],role:'bone',wR:0.035},
      {kind:'poly',pts:[[0.58,i*0.5-0.09],[1.39-Math.abs(i)*0.12,i*0.89],[0.58,i*0.5+0.09]],role:'bone',outline:true},
    ]),
  ] },
  nectarBells: { ops: [
    ...[-1,0,1].flatMap((i):GlyphOp[]=>[
      {kind:'path',pts:[[-0.62,0],[-0.28,i*0.54],[0.22,i*0.56]],role:'base',wR:0.13},
      {kind:'poly',pts:[[-0.05,i*0.55-0.14],[0.37,i*0.55-0.31],[0.69,i*0.55-0.19],[0.69,i*0.55+0.19],[0.37,i*0.55+0.31],[-0.05,i*0.55+0.14]],smooth:true,color:'#e0c780',outline:true},
      {kind:'disc',x:0.52,y:i*0.55,rx:0.15,ry:0.21,color:'#856233'},
      {kind:'disc',x:0.56,y:i*0.55,rx:0.06,ry:0.095,color:'#f2dda0'},
    ]),
  ] },
  sepalRampart: { ops: [
    ...[-1,0,1].flatMap((i):GlyphOp[]=>[
      {kind:'poly',pts:[[-0.6,i*0.48],[-0.14,i*0.65-0.3],[0.74,i*0.55-0.15],[0.99,i*0.52],[0.74,i*0.55+0.15],[-0.14,i*0.65+0.3]],smooth:true,role:'base',shade:i*0.12,outline:true},
      {kind:'path',pts:[[-0.37,i*0.48],[0.72,i*0.54]],role:'wood',wR:0.075},
      {kind:'poly',pts:[[0.29,i*0.57-0.08],[0.89,i*0.64-0.26],[0.43,i*0.57+0.07]],role:'bone'},
    ]),
  ] },
  samaraWings: { ops: [
    {kind:'poly',pts:[[-0.11,0],[-0.58,-0.52],[-0.77,-1.62],[-0.39,-1.75],[0.23,-1.06],[0.26,-0.43]],smooth:true,role:'base',shade:0.18,alpha:0.85,outline:true,mirror:true},
    {kind:'path',pts:[[0.04,-0.1],[-0.32,-0.73],[-0.52,-1.53]],role:'bone',alpha:0.6,wR:0.035,mirror:true},
    {kind:'path',pts:[[-0.32,-0.73],[0.01,-0.86]],role:'wood',alpha:0.7,wR:0.025,mirror:true},
    {kind:'disc',x:0.16,rx:0.47,ry:0.26,role:'wood',outline:true},
    {kind:'path',pts:[[-0.1,0],[0.51,0]],role:'bone',wR:0.04},
  ] },
  hookCreepers: { ops: [
    {kind:'path',pts:[[-0.55,0],[-0.88,-0.57],[-0.4,-1.08],[0.33,-1.1],[0.87,-0.72],[1.15,-0.43],[1.36,-0.76],[1.07,-0.91]],smooth:true,role:'base',wR:0.14,mirror:true},
    ...[-0.5,-0.1,0.3].map((x):GlyphOp=>({kind:'poly',pts:[[x,-1.03],[x+0.25,-1.37],[x+0.21,-0.98]],role:'bone',mirror:true})),
  ] },
  rootStriders: { ops: [
    ...[-1,0,1].flatMap((i):GlyphOp[] => [
      { kind:'path',pts:[[-0.2+i*0.25,-0.2],[-0.4+i*0.5,-0.65],[-0.1+i*0.8,-1.04],[0.15+i*0.8,-1.13]],role:'wood',wR:0.11,mirror:true },
      { kind:'path',pts:[[-0.1+i*0.8,-1.04],[-0.16+i*0.8,-1.28]],role:'wood',wR:0.045,mirror:true },
    ]),
  ] },
  spearLeaves: { ops: [
    ...[-1,0,1].flatMap((i):GlyphOp[] => [
      { kind:'poly',pts:[[-0.25,0],[-0.72+i*0.58,-0.48],[-0.73+i*0.84,-1.12],[-0.1+i*0.53,-0.61],[0.2,0]],smooth:true,role:'base',shade:i*0.1,outline:true,mirror:true },
      { kind:'path',pts:[[-0.2,-0.1],[-0.73+i*0.84,-1.02]],role:'accent',alpha:0.65,wR:0.025,mirror:true },
    ]),
  ] },
  burrHusk: { ops: [
    ...Array.from({length:12},(_,i):GlyphOp=>{
      const a=i*Math.PI/6,c=Math.cos(a),s=Math.sin(a);
      return {kind:'poly',pts:[[c*0.65-s*0.13,s*0.65+c*0.13],[c*1.02,s*1.02],[c*0.65+s*0.13,s*0.65-c*0.13]],role:'wood',outline:true};
    }),
    {kind:'disc',rx:0.73,ry:0.62,role:'base',outline:true},
    {kind:'path',pts:[[-0.57,-0.29],[-0.23,-0.16],[0.17,-0.25],[0.58,-0.1]],role:'dark',wR:0.04,mirror:true},
    {kind:'disc',x:0.38,rx:0.26,ry:0.15,role:'dark'},
    {kind:'poly',pts:[[0.37,-0.08],[0.63,0],[0.37,0.08]],role:'bone'},
  ] },
  trapLobes: { ops: [
    {kind:'poly',pts:[[-0.57,0],[-0.61,-0.45],[-0.18,-0.89],[0.52,-0.91],[0.93,-0.52],[0.75,-0.08]],smooth:true,role:'base',outline:true,mirror:true},
    {kind:'poly',pts:[[-0.39,-0.1],[-0.26,-0.56],[0.39,-0.64],[0.74,-0.36],[0.63,-0.12]],smooth:true,color:'#a95d62',outline:true,mirror:true},
    {kind:'path',pts:[[-0.4,0],[0.71,0]],role:'dark',wR:0.1},
    ...[-0.24,0.02,0.28,0.54].map((x):GlyphOp=>({kind:'poly',pts:[[x,-0.31],[x+0.17,0.025],[x+0.18,-0.32]],role:'bone',outline:true,mirror:true})),
    {kind:'path',pts:[[-0.41,-0.22],[0.17,-0.72],[0.58,-0.51]],role:'accent',alpha:0.6,wR:0.03,mirror:true},
  ] },
  pitcherCup: { ops: [
    {kind:'poly',pts:[[-0.95,-0.22],[-0.72,-0.61],[-0.02,-0.6],[0.74,-0.41],[0.82,0],[0.74,0.41],[-0.02,0.6],[-0.72,0.61],[-0.95,0.22]],smooth:true,role:'base',outline:true},
    {kind:'path',pts:[[-0.81,-0.12],[-0.39,-0.4],[0.39,-0.28]],role:'accent',alpha:0.7,wR:0.045,mirror:true},
    {kind:'disc',x:0.48,rx:0.35,ry:0.49,color:'#bd6876',outline:true},
    {kind:'disc',x:0.5,rx:0.23,ry:0.34,role:'dark'},
    {kind:'disc',x:0.55,rx:0.1,ry:0.22,color:'#b9cb6a',alpha:0.75},
    {kind:'poly',pts:[[0.12,-0.39],[-0.1,-0.81],[0.41,-1.02],[0.78,-0.81],[0.37,-0.51]],smooth:true,role:'base',shade:0.2,outline:true},
    ...[-0.24,0,0.24].map((y):GlyphOp=>({kind:'path',pts:[[0.3,y],[0.43,y+0.025]],color:'#e6b89a',wR:0.035})),
  ] },
  dewCroziers: { ops: [
    ...Array.from({length:9},(_,i):GlyphOp[]=>{
      const a=i*Math.PI*2/9,c=Math.cos(a),s=Math.sin(a);
      return [
        {kind:'path',pts:[[c*0.18,s*0.18],[c*0.84-s*0.22,s*0.84+c*0.22],[c*1.13,s*1.13]],smooth:true,role:'base',wR:0.065},
        {kind:'disc',x:c*1.13,y:s*1.13,rx:0.105,color:'#e1a3ad',outline:true},
        {kind:'disc',x:c*1.13-0.025,y:s*1.13-0.03,rx:0.032,color:'#fff0c9'},
      ];
    }).flat(),
  ] },
  splitSeedcase: { ops: [
    {kind:'poly',pts:[[-0.98,0],[-0.8,-0.6],[-0.2,-0.78],[0.7,-0.46],[0.94,-0.11],[-0.03,-0.23]],smooth:true,role:'wood',outline:true,mirror:true},
    {kind:'poly',pts:[[-0.84,0],[-0.2,-0.28],[0.71,0],[-0.2,0.28]],smooth:true,role:'dark'},
    ...[-0.53,-0.18,0.2,0.52].map((x,i):GlyphOp=>({kind:'disc',x,y:0,rx:0.14-i*0.012,ry:0.17,role:'bone',outline:true})),
    {kind:'path',pts:[[-0.81,-0.23],[-0.32,-0.57],[0.47,-0.37]],role:'base',wR:0.085,mirror:true},
  ] },
};
