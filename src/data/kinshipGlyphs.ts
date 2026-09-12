import type { GlyphDef, GlyphOp } from '../render/vis/parts';

/** Faction anatomy and clothing in the ordinary Part Forge vocabulary. +X
 * faces forward; individual surfaces select roles rather than a flat tint. */
export const KINSHIP_GLYPHS: Record<string, GlyphDef> = {
  pressureLens: { ops: [
    {kind:'poly',pts:[[-0.64,-0.33],[-0.41,-0.72],[0.21,-0.64],[0.68,-0.31],[0.77,0],[0.68,0.31],[0.21,0.64],[-0.41,0.72],[-0.64,0.33]],smooth:true,role:'base',shade:0.25,outline:true},
    {kind:'disc',x:0.14,rx:0.53,ry:0.45,color:'#1c2c47',outline:true},
    {kind:'disc',x:0.28,rx:0.31,ry:0.32,color:'#bededb'},
    {kind:'disc',x:0.35,rx:0.095,ry:0.24,color:'#1a3047'},
    {kind:'path',pts:[[-0.25,-0.29],[0.03,-0.39],[0.3,-0.29]],color:'#e0f8ef',alpha:0.65,wR:0.045},
    {kind:'poly',pts:[[0.54,-0.35],[1.01,-0.44],[0.84,-0.16]],role:'bone',outline:true,mirror:true},
  ] },
  trollHead: { ops: [
    { kind: 'poly', pts: [[-0.4,-0.36],[-0.45,-0.83],[-0.02,-0.55],[0.17,-0.4]], role: 'base', outline: true, mirror: true },
    { kind: 'disc', x: 0.01, rx: 0.56, ry: 0.53, role: 'base', outline: true },
    { kind: 'path', pts: [[-0.17,-0.35],[-0.04,-0.15]], role: 'dark', wR: 0.12, mirror: true },
    { kind: 'disc', x: 0.02, y: -0.25, rx: 0.055, role: 'glow', mirror: true },
    { kind: 'poly', pts: [[-0.01,-0.15],[0.49,-0.24],[0.7,0],[0.49,0.24],[-0.01,0.15]], smooth: true, role: 'base', shade: 0.12, outline: true },
    { kind: 'disc', x: 0.46, y: -0.1, rx: 0.055, role: 'dark', mirror: true },
    { kind: 'poly', pts: [[0.27,-0.34],[0.75,-0.41],[0.5,-0.2]], role: 'bone', outline: true, mirror: true },
  ] },
  trollArms: { ops: [
    { kind: 'poly', pts: [[-0.4,-0.54],[-0.15,-1.02],[0.57,-1.16],[0.99,-0.97],[1.13,-0.61],[0.67,-0.63],[0.24,-0.74],[-0.14,-0.44]], smooth: true, role: 'base', shade: -0.1, outline: true, mirror: true },
    { kind: 'path', pts: [[0.56,-0.97],[0.68,-0.75]], role: 'dark', alpha: 0.5, wR: 0.05, mirror: true },
    ...[0.72,0.88,1.04].map((x):GlyphOp=>({kind:'path',pts:[[x,-0.86],[x+0.06,-0.65]],role:'bone',alpha:0.55,wR:0.045,mirror:true})),
  ] },
  antTrunk: { ops: [
    { kind: 'disc', x: -0.76, rx: 0.52, ry: 0.44, role: 'base', shade: -0.18, outline: true },
    { kind: 'path', pts: [[-0.84,-0.34],[-0.89,0],[-0.84,0.34]], role: 'dark', wR: 0.035 },
    { kind: 'disc', x: -0.13, rx: 0.14, ry: 0.12, role: 'base', outline: true },
    { kind: 'disc', x: 0.16, rx: 0.25, ry: 0.24, role: 'base', shade: 0.08, outline: true },
    { kind: 'path', pts: [[-0.99,-0.18],[-0.78,-0.28],[-0.56,-0.2]], role: 'accent', alpha: 0.55, wR: 0.045 },
  ] },
  antHead: { ops: [
    { kind: 'poly', pts: [[-0.38,-0.3],[0.08,-0.46],[0.49,-0.29],[0.56,0],[0.49,0.29],[0.08,0.46],[-0.38,0.3]], smooth: true, role:'base', outline:true },
    { kind:'disc',x:0.22,y:-0.3,rx:0.07,role:'dark',mirror:true },
    { kind:'poly',pts:[[0.4,-0.25],[0.82,-0.32],[0.91,-0.03],[0.65,-0.13],[0.41,-0.06]],role:'dark',outline:true,mirror:true },
  ] },
  antStride: { ops: [
    ...[-1,0,1].map((i):GlyphOp=>({kind:'path',pts:[[0.14+i*0.12,-0.15],[0.16+i*0.42,-0.48],[0.04+i*0.78,-0.9]],role:'base',wR:0.055,mirror:true})),
  ] },
  elbowFeelers: { ops: [
    { kind:'path',pts:[[0.21,-0.24],[0.61,-0.72],[1.03,-0.48],[1.23,-0.39]],role:'base',wR:0.055,mirror:true },
    { kind:'disc',x:1.21,y:-0.4,rx:0.09,ry:0.04,role:'accent',mirror:true },
  ] },
  antVeilWings: { ops: [
    { kind:'poly',pts:[[0.21,-0.1],[-0.02,-0.81],[-0.74,-1.33],[-1.18,-1.12],[-0.76,-0.6]],smooth:true,role:'bone',alpha:0.4,outline:true,mirror:true },
    { kind:'poly',pts:[[0,-0.13],[-0.49,-0.44],[-1.22,-0.65],[-1.28,-0.31],[-0.62,-0.17]],smooth:true,role:'bone',alpha:0.32,outline:true,mirror:true },
    { kind:'path',pts:[[0.13,-0.17],[-0.33,-0.78],[-0.87,-1.09]],role:'accent',alpha:0.65,wR:0.028,mirror:true },
  ] },
  caprineFace: { ops: [
    { kind:'poly',pts:[[-0.25,-0.22],[-0.47,-0.7],[-0.02,-0.52],[0.21,-0.25]],role:'base',shade:-0.15,outline:true,mirror:true },
    { kind:'poly',pts:[[-0.38,-0.3],[0.2,-0.37],[0.76,-0.16],[0.82,0],[0.76,0.16],[0.2,0.37],[-0.38,0.3]],smooth:true,role:'base',outline:true },
    { kind:'path',pts:[[0.04,-0.27],[0.24,-0.23]],role:'glow',wR:0.065,mirror:true },
    { kind:'path',pts:[[0.12,-0.29],[0.13,-0.2]],role:'dark',wR:0.028,mirror:true },
    { kind:'disc',x:0.65,y:-0.085,rx:0.055,role:'dark',mirror:true },
    { kind:'poly',pts:[[0.21,-0.21],[0.3,0],[0.21,0.21],[-0.14,0.18],[-0.36,0],[-0.14,-0.18]],role:'dark',alpha:0.45 },
  ] },
  clovenHooves: { ops: [
    { kind:'poly',pts:[[-0.33,-0.52],[0.04,-0.67],[0.33,-0.55],[0.3,-0.3],[-0.15,-0.29]],role:'dark',outline:true,mirror:true },
    { kind:'path',pts:[[-0.04,-0.48],[0.27,-0.48]],role:'bone',alpha:0.5,wR:0.035,mirror:true },
  ] },
  ratFace: { ops: [
    { kind:'disc',x:-0.23,y:-0.43,rx:0.27,ry:0.24,role:'base',outline:true,mirror:true },
    { kind:'disc',x:-0.2,y:-0.43,rx:0.16,ry:0.14,color:'#b98583',mirror:true },
    { kind:'poly',pts:[[-0.37,-0.28],[0.12,-0.34],[0.78,-0.1],[0.81,0],[0.78,0.1],[0.12,0.34],[-0.37,0.28]],smooth:true,role:'base',outline:true },
    { kind:'disc',x:0.14,y:-0.22,rx:0.055,color:'#f08b83',mirror:true },
    { kind:'disc',x:0.77,rx:0.075,ry:0.12,color:'#b87c81' },
    { kind:'poly',pts:[[0.65,-0.075],[0.91,-0.06],[0.91,-0.015],[0.66,-0.015]],role:'bone',mirror:true },
    { kind:'path',pts:[[0.46,-0.15],[0.6,-0.46]],role:'bone',alpha:0.6,wR:0.02,mirror:true },
  ] },
  nakedRatTail: { ops: [
    { kind:'path',pts:[[-0.42,0],[-0.87,0.08],[-1.3,0.44],[-1.69,0.42],[-1.88,0.12]],smooth:true,color:'#a47777',wR:0.105 },
    ...[[-0.91,0.15],[-1.21,0.32],[-1.54,0.43]].map(([x,y]):GlyphOp=>({kind:'path',pts:[[x-0.03,y-0.07],[x+0.03,y+0.07]],color:'#674b52',wR:0.025})),
  ] },
};
