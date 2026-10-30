import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { SPEECH_ATTENTION_CFG } from '../src/data/speechAttention';

const restore=seedGlobalRandom(9918);
try {
 const w=makeSimWorld('warrior',9918), keeper=w.createMonster('townsfolk_innkeep',1,'player');
 keeper.pos={x:w.player.pos.x+70,y:w.player.pos.y};w.actors.push(keeper);
 w.time=10;w.localSeat.lastActedAt=10;
 assert.equal(w.npcSpeechView().length,0);
 assert.equal(w.speechApproachHint()?.a,keeper);
 assert.equal(w.speechApproachHint()?.text,'Stand still to talk');
 const before=JSON.stringify([w.ledger,w.activeQuests,w.meta.items,w.time,w.speechFocusTarget()]);
 for(let i=0;i<20;i++)w.speechApproachHint();
 assert.equal(JSON.stringify([w.ledger,w.activeQuests,w.meta.items,w.time,w.speechFocusTarget()]),before);
 console.log('PASS immediate selected cue before idle grace, without admission or state mutation');

 const home={...keeper.pos}, old=MONSTERS[keeper.defId!].speechAttention;
 try {
  MONSTERS[keeper.defId!].speechAttention={...old,approachHint:'Wait for the keeper'};
  assert.equal(w.speechApproachHint()?.text,'Wait for the keeper');
  MONSTERS[keeper.defId!].speechAttention={...old,approachHint:''};
  assert.equal(w.speechApproachHint(),null);
 } finally {MONSTERS[keeper.defId!].speechAttention=old;}
 keeper.pos.x+=600;assert.equal(w.speechApproachHint(),null);keeper.pos=home;
 keeper.tier=1;assert.equal(w.speechApproachHint(),null);keeper.tier=0;
 keeper.dead=true;assert.equal(w.speechApproachHint(),null);keeper.dead=false;
 w.player.dead=true;assert.equal(w.speechApproachHint(),null);w.player.dead=false;
 w.time+=SPEECH_ATTENTION_CFG.focus.staleSec+.01;assert.equal(w.speechApproachHint(),null);
 w.time=9;assert.equal(w.speechApproachHint(),null);
 console.log('PASS authored override/opt-out, departed/dead/story gates and stale/rewound focus');

 w.time=20;w.localSeat.lastActedAt=20;w.npcSpeechView();
 for(let i=0;i<80;i++){w.time+=1/60;w.npcSpeechView();}
 assert.equal(w.speechFocusTarget()?.ready,true);assert.equal(w.speechApproachHint(),null);
 assert.equal(w.npcSpeechView()[0]?.a,keeper);
 console.log('PASS cue retires when native dialogue becomes ready');

 const town=makeSimWorld('warrior',551);town.startWorldMass(451);
 const inn=town.actors.find(a=>a.defId==='townsfolk_innkeep')!;
 town.player.pos={x:inn.pos.x,y:inn.pos.y+45};town.player.tier=inn.tier;
 town.time=30;town.localSeat.lastActedAt=30;town.npcSpeechView();
 assert.equal(town.speechApproachHint()?.a,inn);
 const pos={...town.player.pos}, roof=town.roofedStructureAt(inn.pos)!;
 assert.ok(roof);
 town.player.pos={x:inn.pos.x,y:roof.rect.y-1};
 assert.equal(town.speechApproachHint(),null,'nearby exterior cannot borrow the indoor cue');
 town.player.pos=pos;
 assert.equal(town.speechApproachHint()?.a,inn);
 console.log('PASS continuous native inn roof reach stays authoritative');
} finally {restore();}
